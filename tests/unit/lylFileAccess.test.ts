// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  dropBackupTarget,
  ensureLylFileWritable,
  forgetLylFile,
  forgetStlFile,
  linkedLylFile,
  linkedStlFile,
  lylFileAccessSupported,
  pickBackupTarget,
  pickLylFileToOpen,
  pickLylFileToSave,
  pickStlFileToSave,
  rememberLylFile,
  rememberStlFile,
  writeBackupTarget,
  writeLylFile,
  type LylFileHandle,
} from "@/lib/lylFileAccess";

type PickerWindow = { showSaveFilePicker?: unknown; showOpenFilePicker?: unknown };
const pickers = () => window as unknown as PickerWindow;

/** A file handle that keeps what was written, and can be told to fail. */
function fakeHandle(options: { name?: string; failWrite?: boolean; permission?: PermissionState; asks?: PermissionState } = {}) {
  const log = { written: null as Uint8Array | null, closed: false, aborted: false, asked: 0 };
  const handle: LylFileHandle = {
    name: options.name ?? "design.lyl",
    getFile: async () => new File(["x"], options.name ?? "design.lyl"),
    createWritable: async () => ({
      write: async (data) => {
        if (options.failWrite) throw new DOMException("locked", "NoModificationAllowedError");
        log.written = data as Uint8Array;
      },
      close: async () => void (log.closed = true),
      abort: async () => void (log.aborted = true),
    }),
    queryPermission: async () => options.permission ?? "granted",
    requestPermission: async () => {
      log.asked += 1;
      return options.asks ?? "granted";
    },
  };
  return { handle, log };
}

afterEach(() => {
  delete pickers().showSaveFilePicker;
  delete pickers().showOpenFilePicker;
});

describe("saving into a file of the user's choosing (#251)", () => {
  it("is only on where the browser has both file dialogs", () => {
    expect(lylFileAccessSupported()).toBe(false);
    pickers().showSaveFilePicker = vi.fn();
    expect(lylFileAccessSupported()).toBe(false);
    pickers().showOpenFilePicker = vi.fn();
    expect(lylFileAccessSupported()).toBe(true);
  });

  it("remembers one file per design and lets it go", () => {
    const { handle } = fakeHandle();
    expect(linkedLylFile("a")).toBeNull();
    rememberLylFile("a", handle);
    expect(linkedLylFile("a")).toBe(handle);
    expect(linkedLylFile("b")).toBeNull();
    forgetLylFile("a");
    expect(linkedLylFile("a")).toBeNull();
  });

  it("keeps a design's STL apart from its design file", () => {
    const design = fakeHandle({ name: "bracket.lyl" }).handle;
    const stl = fakeHandle({ name: "bracket.stl" }).handle;
    rememberLylFile("a", design);
    rememberStlFile("a", stl);
    expect(linkedLylFile("a")).toBe(design);
    expect(linkedStlFile("a")).toBe(stl);
    expect(linkedStlFile("b")).toBeNull();
    forgetStlFile("a");
    expect(linkedStlFile("a")).toBeNull();
    expect(linkedLylFile("a")).toBe(design);
    forgetLylFile("a");
  });

  it("asks for a place with the suggested name and the same folder memory as the open dialog", async () => {
    const { handle } = fakeHandle();
    const save = vi.fn(async () => handle);
    pickers().showSaveFilePicker = save;
    expect(await pickLylFileToSave("bracket.lyl")).toBe(handle);
    const options = (save.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(options.suggestedName).toBe("bracket.lyl");
    expect(options.id).toBe("layerling-designs");
  });

  it("asks where an STL goes, in a folder of its own apart from the designs", async () => {
    const { handle } = fakeHandle({ name: "bracket.stl" });
    const save = vi.fn(async () => handle);
    pickers().showSaveFilePicker = save;
    expect(await pickStlFileToSave("bracket.stl")).toBe(handle);
    const options = (save.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(options.suggestedName).toBe("bracket.stl");
    expect(options.id).toBe("layerling-exports");
    expect(JSON.stringify(options.types)).toContain(".stl");

    save.mockImplementationOnce(async () => {
      throw new DOMException("closed", "AbortError");
    });
    expect(await pickStlFileToSave("bracket.stl")).toBeNull();
  });

  it("treats a closed dialog as no choice, not as an error", async () => {
    pickers().showSaveFilePicker = vi.fn(async () => {
      throw new DOMException("closed", "AbortError");
    });
    pickers().showOpenFilePicker = vi.fn(async () => {
      throw new DOMException("closed", "AbortError");
    });
    expect(await pickLylFileToSave("a.lyl")).toBeNull();
    expect(await pickLylFileToOpen()).toBeNull();
  });

  it("lets other failures through, so the caller can fall back to a download", async () => {
    pickers().showSaveFilePicker = vi.fn(async () => {
      throw new DOMException("blocked", "SecurityError");
    });
    await expect(pickLylFileToSave("a.lyl")).rejects.toThrow("blocked");
  });

  it("opens a file together with its place", async () => {
    const { handle } = fakeHandle({ name: "part.lyl" });
    pickers().showOpenFilePicker = vi.fn(async () => [handle]);
    const picked = await pickLylFileToOpen();
    expect(picked?.handle).toBe(handle);
    expect(picked?.file.name).toBe("part.lyl");
  });

  it("writes the bytes and closes the file", async () => {
    const { handle, log } = fakeHandle();
    await writeLylFile(handle, new Uint8Array([1, 2, 3]));
    expect(Array.from(log.written ?? [])).toEqual([1, 2, 3]);
    expect(log.closed).toBe(true);
  });

  it("drops a failed write instead of leaving half a file", async () => {
    const { handle, log } = fakeHandle({ failWrite: true });
    await expect(writeLylFile(handle, new Uint8Array([1]))).rejects.toThrow();
    expect(log.aborted).toBe(true);
    expect(log.closed).toBe(false);
  });

  it("asks for write rights only when the file does not have them yet", async () => {
    const granted = fakeHandle();
    expect(await ensureLylFileWritable(granted.handle)).toBe(true);
    expect(granted.log.asked).toBe(0);

    const fromOpenDialog = fakeHandle({ permission: "prompt", asks: "granted" });
    expect(await ensureLylFileWritable(fromOpenDialog.handle)).toBe(true);
    expect(fromOpenDialog.log.asked).toBe(1);

    const refused = fakeHandle({ permission: "prompt", asks: "denied" });
    expect(await ensureLylFileWritable(refused.handle)).toBe(false);
  });
});

describe("backups into a folder of one's own (Facebook group, 07.11.2026)", () => {
  it("stays a download where the browser has no save dialog", async () => {
    expect(await pickBackupTarget("layerling-backup.zip")).toEqual({ fileName: "layerling-backup.zip" });
    const download = vi.fn();
    const zip = new Blob(["zip"]);
    await writeBackupTarget({ fileName: "layerling-backup.zip" }, zip, download);
    expect(download).toHaveBeenCalledWith("layerling-backup.zip", zip);
  });

  it("asks where it goes, in a folder memory of its own, and writes the ZIP into the picked file", async () => {
    const { handle, log } = fakeHandle({ name: "my-backup.zip" });
    const save = vi.fn(async () => handle);
    pickers().showSaveFilePicker = save;
    const target = await pickBackupTarget("layerling-backup.zip");
    expect(target).toEqual({ fileName: "my-backup.zip", handle });
    const options = (save.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(options.suggestedName).toBe("layerling-backup.zip");
    expect(options.id).toBe("layerling-backups");
    expect(JSON.stringify(options.types)).toContain(".zip");

    const download = vi.fn();
    const zip = new Blob(["zip"]);
    await writeBackupTarget(target!, zip, download);
    expect(log.written).toBe(zip);
    expect(log.closed).toBe(true);
    expect(download).not.toHaveBeenCalled();
  });

  it("makes no backup when the dialog is closed, and falls back to the download when it will not open", async () => {
    pickers().showSaveFilePicker = vi.fn(async () => {
      throw new DOMException("closed", "AbortError");
    });
    expect(await pickBackupTarget("layerling-backup.zip")).toBeNull();
    // No click left to it after a long wait, or a policy: the download as before.
    pickers().showSaveFilePicker = vi.fn(async () => {
      throw new DOMException("Must be handling a user gesture", "SecurityError");
    });
    expect(await pickBackupTarget("layerling-backup.zip")).toEqual({ fileName: "layerling-backup.zip" });
  });

  it("removes a picked file again when there was nothing to put in it", async () => {
    const { handle } = fakeHandle({ name: "empty.zip" });
    const remove = vi.fn(async () => undefined);
    await dropBackupTarget({ fileName: "empty.zip", handle: { ...handle, remove } });
    expect(remove).toHaveBeenCalledTimes(1);
    // A browser without remove(), and a download, leave nothing to do.
    await dropBackupTarget({ fileName: "empty.zip", handle });
    await dropBackupTarget({ fileName: "empty.zip" });
  });
});
