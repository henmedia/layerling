// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  dropBackupTarget,
  dropEmptyFile,
  ensureLylFileWritable,
  forgetLylFile,
  forgetExportFile,
  linkedLylFile,
  linkedExportFile,
  lylFileAccessSupported,
  pickBackupTarget,
  pickLylFileToOpen,
  pickLylFileToSave,
  pickExportFileToSave,
  rememberLylFile,
  rememberExportFile,
  writeBackupTarget,
  writeLylFile,
  type LylFileHandle,
} from "@/lib/lylFileAccess";

type PickerWindow = { showSaveFilePicker?: unknown; showOpenFilePicker?: unknown };
const pickers = () => window as unknown as PickerWindow;

/** A file handle that keeps what was written, and can be told to fail. */
function fakeHandle(options: { name?: string; failWrite?: boolean; permission?: PermissionState; asks?: PermissionState; loses?: boolean } = {}) {
  const log = { written: null as Uint8Array | null, closed: false, aborted: false, asked: 0 };
  const handle: LylFileHandle = {
    name: options.name ?? "design.lyl",
    getFile: async () => new File(log.written && !options.loses ? [log.written as BlobPart] : [], options.name ?? "design.lyl"),
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

  it("notices a file that stays empty although the browser reported no error (#1987)", async () => {
    const { handle, log } = fakeHandle({ loses: true });
    await expect(writeLylFile(handle, new Uint8Array([1, 2, 3]))).rejects.toThrow("the file has 0");
    expect(log.closed).toBe(true);
    const kept = fakeHandle();
    await expect(writeLylFile(kept.handle, new Uint8Array([1, 2, 3]))).resolves.toBeUndefined();
  });

  it("takes a file it cannot read back as written", async () => {
    const { handle } = fakeHandle();
    handle.getFile = async () => { throw new DOMException("gone", "NotFoundError"); };
    await expect(writeLylFile(handle, new Uint8Array([1]))).resolves.toBeUndefined();
  });

  it("gives up on a file that never answers, and does not write it later (#1987)", async () => {
    vi.useFakeTimers();
    try {
      const { handle } = fakeHandle();
      let letGo: () => void = () => undefined;
      const abort = vi.fn(async () => undefined);
      const close = vi.fn(async () => undefined);
      handle.createWritable = async () => ({ write: () => new Promise<void>((resolve) => { letGo = resolve; }), close, abort });
      const result = expect(writeLylFile(handle, new Uint8Array([1]))).rejects.toThrow("did not answer in time");
      await vi.advanceTimersByTimeAsync(19_000);
      expect(abort).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(2000);
      await result;
      letGo();
      await vi.advanceTimersByTimeAsync(0);
      expect(close).not.toHaveBeenCalled();
      expect(abort).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("removes a picked file that stayed empty, and only that (#1987)", async () => {
    const remove = vi.fn(async () => undefined);
    const empty = fakeHandle({ loses: true });
    await dropEmptyFile({ ...empty.handle, remove });
    expect(remove).toHaveBeenCalledTimes(1);
    const full = fakeHandle();
    await writeLylFile(full.handle, new Uint8Array([1]));
    await dropEmptyFile({ ...full.handle, remove });
    expect(remove).toHaveBeenCalledTimes(1);
    await expect(dropEmptyFile(empty.handle)).resolves.toBeUndefined();
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
    rememberExportFile("a", "stl", stl);
    expect(linkedLylFile("a")).toBe(design);
    expect(linkedExportFile("a", "stl")).toBe(stl);
    expect(linkedExportFile("b", "stl")).toBeNull();
    forgetExportFile("a", "stl");
    expect(linkedExportFile("a", "stl")).toBeNull();
    expect(linkedLylFile("a")).toBe(design);
    forgetLylFile("a");
  });

  it("keeps a design's 3MF apart from its STL", () => {
    const stl = fakeHandle({ name: "bracket.stl" }).handle;
    const threeMf = fakeHandle({ name: "bracket.3mf" }).handle;
    rememberExportFile("a", "stl", stl);
    rememberExportFile("a", "3mf", threeMf);
    expect(linkedExportFile("a", "stl")).toBe(stl);
    expect(linkedExportFile("a", "3mf")).toBe(threeMf);
    forgetExportFile("a", "3mf");
    expect(linkedExportFile("a", "3mf")).toBeNull();
    expect(linkedExportFile("a", "stl")).toBe(stl);
    forgetExportFile("a", "stl");
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
    expect(await pickExportFileToSave("bracket.stl", "stl")).toBe(handle);
    const options = (save.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(options.suggestedName).toBe("bracket.stl");
    expect(options.id).toBe("layerling-exports");
    expect(JSON.stringify(options.types)).toContain(".stl");

    save.mockImplementationOnce(async () => {
      throw new DOMException("closed", "AbortError");
    });
    expect(await pickExportFileToSave("bracket.stl", "stl")).toBeNull();
  });

  it("asks where a 3MF goes, in the same folder as the STL", async () => {
    const { handle } = fakeHandle({ name: "bracket.3mf" });
    const save = vi.fn(async () => handle);
    pickers().showSaveFilePicker = save;
    expect(await pickExportFileToSave("bracket.3mf", "3mf")).toBe(handle);
    const options = (save.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(options.id).toBe("layerling-exports");
    expect(JSON.stringify(options.types)).toContain(".3mf");
    expect(JSON.stringify(options.types)).not.toContain(".stl");
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

  it("leaves the dialog out for \"Download instead\", where it hands back no file for any folder", async () => {
    const save = vi.fn(async () => {
      throw new DOMException("closed", "AbortError");
    });
    pickers().showSaveFilePicker = save;
    expect(await pickBackupTarget("layerling-backup.zip")).toBeNull();
    expect(await pickBackupTarget("layerling-backup.zip", true)).toEqual({ fileName: "layerling-backup.zip" });
    expect(save).toHaveBeenCalledTimes(1);
    const download = vi.fn();
    const zip = new Blob(["zip"]);
    await writeBackupTarget({ fileName: "layerling-backup.zip" }, zip, download);
    expect(download).toHaveBeenCalledWith("layerling-backup.zip", zip);
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
