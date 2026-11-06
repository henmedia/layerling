import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchServerDesignFile, joinServerFolder, listServerDesigns, parentServerFolder } from "@/lib/serverDesigns";

afterEach(() => vi.unstubAllGlobals());

describe("designs on the server (Discussion #1378)", () => {
  it("lists one folder, folders and designs by name", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      enabled: true,
      path: "Parts",
      folders: [{ name: "Screws" }, { name: "Brackets" }],
      projects: [{ fileName: "b.lyl", name: "Beta", updatedAt: 2 }, { fileName: "a.lyl", name: "Alpha", updatedAt: 1, size: 5 }],
    })));
    vi.stubGlobal("fetch", fetchMock);
    const listing = await listServerDesigns("Parts");
    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toContain("path=Parts");
    expect(listing).toEqual({
      path: "Parts",
      folders: ["Brackets", "Screws"],
      designs: [{ fileName: "a.lyl", name: "Alpha", updatedAt: 1 }, { fileName: "b.lyl", name: "Beta", updatedAt: 2 }],
    });
  });

  it("gives null when the installation keeps nothing on a server, or the server does not answer", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ enabled: false }))));
    expect(await listServerDesigns("")).toBeNull();
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("down"); }));
    expect(await listServerDesigns("")).toBeNull();
  });

  it("fetches a design as a file under its own name, and null when it is gone", async () => {
    const fetchMock = vi.fn(async () => new Response(new Uint8Array([1, 2, 3])));
    vi.stubGlobal("fetch", fetchMock);
    const file = await fetchServerDesignFile("Parts/Screws", "M3 nut.lyl");
    expect(file?.name).toBe("M3 nut.lyl");
    expect(file?.size).toBe(3);
    const url = String((fetchMock.mock.calls[0] as unknown[])[0]);
    expect(url).toContain("fileName=M3+nut.lyl");
    expect(url).toContain("path=Parts%2FScrews");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 404 })));
    expect(await fetchServerDesignFile("", "x.lyl")).toBeNull();
  });

  it("walks the folders up and down", () => {
    expect(joinServerFolder("", "Parts")).toBe("Parts");
    expect(joinServerFolder("Parts", "Screws")).toBe("Parts/Screws");
    expect(parentServerFolder("Parts/Screws")).toBe("Parts");
    expect(parentServerFolder("Parts")).toBe("");
  });
});
