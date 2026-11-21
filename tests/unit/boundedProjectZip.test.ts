import { Buffer } from "node:buffer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AsyncZipDeflate, Zip, ZipDeflate, strToU8, unzipSync } from "fflate";
import { boundedProjectZip, forgetDeflatedProjectEntries } from "@/lib/boundedProjectZip";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  forgetDeflatedProjectEntries();
});

/** Files small enough to be deflated on the calling thread, as the parts of an imported assembly are. */
function smallEntries(count: number, bytesEach = 60_000) {
  return Object.fromEntries(Array.from({ length: count }, (_, index) => {
    const bytes = new Uint8Array(bytesEach + index);
    let state = index + 1;
    for (let offset = 0; offset < bytes.length; offset++) {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      bytes[offset] = state >>> 26;
    }
    return [`assets/derived-mesh/${index}.bin`, bytes];
  }));
}

function largeEntries(count: number) {
  return Object.fromEntries(Array.from({ length: count }, (_, index) => {
    const bytes = new Uint8Array(160_000 + index);
    for (let offset = 0; offset < bytes.length; offset++) bytes[offset] = (offset * 17 + index) % 251;
    return [`meshes/${index}.bin`, bytes];
  }));
}

function expectSameFiles(actual: Record<string, Uint8Array>, expected: Record<string, Uint8Array>) {
  expect(Object.keys(actual).sort()).toEqual(Object.keys(expected).sort());
  for (const [name, bytes] of Object.entries(expected)) {
    expect(Buffer.compare(actual[name], bytes), name).toBe(0);
  }
}

describe("bounded project ZIP", () => {
  it.each([0, 1, 6, 9] as const)("preserves all entries at compression level %s", async (level) => {
    const files = { "project.json": strToU8('{"name":"synthetic"}'), "empty.bin": new Uint8Array(), ...largeEntries(5) };
    const original = Object.fromEntries(Object.entries(files).map(([name, bytes]) => [name, bytes.slice()]));
    expectSameFiles(unzipSync(await boundedProjectZip(files, level)), original);
    expectSameFiles(files, original);
  });

  it("stores the entries it is told to as they are, and compresses the rest", async () => {
    const photo = new Uint8Array(200_000);
    for (let offset = 0; offset < photo.length; offset++) photo[offset] = (offset * 7919) % 256;
    const files = { "assets/attachment/a.jpg": photo, "project.json": strToU8("x".repeat(200_000)) };
    const zipped = await boundedProjectZip(files, 6, new Set(["assets/attachment/a.jpg"]));
    expectSameFiles(unzipSync(zipped), { "assets/attachment/a.jpg": photo.slice(), "project.json": strToU8("x".repeat(200_000)) });
    // The compression method of each entry, from the archive's central directory: 0 stored, 8 deflate.
    const view = new DataView(zipped.buffer, zipped.byteOffset, zipped.byteLength);
    const methods: Record<string, number> = {};
    for (let offset = 0; offset + 46 <= zipped.length; offset++) {
      if (view.getUint32(offset, true) !== 0x02014b50) continue;
      const nameLength = view.getUint16(offset + 28, true);
      methods[Buffer.from(zipped.subarray(offset + 46, offset + 46 + nameLength)).toString()] = view.getUint16(offset + 10, true);
    }
    expect(methods).toEqual({ "assets/attachment/a.jpg": 0, "project.json": 8 });
  });

  // #1794: a design around an imported assembly deflated its hundreds of small files again at every save.
  it("deflates a file that names its own content once and gives the same archive again", async () => {
    const files = { "project.json": strToU8('{"name":"first"}'), ...smallEntries(6), ...largeEntries(2) };
    const unchanging = new Set(Object.keys(files).filter((name) => name !== "project.json"));
    const plain = await boundedProjectZip(files, 1);
    const first = await boundedProjectZip(files, 1, undefined, unchanging);
    const onThread = vi.spyOn(ZipDeflate.prototype, "push");
    const offThread = vi.spyOn(AsyncZipDeflate.prototype, "push");
    const again = await boundedProjectZip(files, 1, undefined, unchanging);
    // Only project.json, which is new at every save, went through deflate.
    expect(onThread.mock.calls.length + offThread.mock.calls.length).toBe(1);
    expect(Buffer.compare(first, plain)).toBe(0);
    expect(Buffer.compare(again, plain)).toBe(0);
    expectSameFiles(unzipSync(again), files);
  });

  it("keeps the deflated files per compression level and does not trust a path whose file has another size", async () => {
    const files = smallEntries(3);
    const unchanging = new Set(Object.keys(files));
    await boundedProjectZip(files, 1, undefined, unchanging);
    const better = await boundedProjectZip(files, 9, undefined, unchanging);
    expect(Buffer.compare(better, await boundedProjectZip(files, 9))).toBe(0);
    const [name] = Object.keys(files);
    const changed = { ...files, [name]: files[name].slice(0, 1000) };
    expectSameFiles(unzipSync(await boundedProjectZip(changed, 1, undefined, unchanging)), changed);
  });

  it("hands the thread back between small files instead of deflating the whole archive in one stretch", async () => {
    const files = smallEntries(120);
    const breaks = vi.spyOn(globalThis, "setImmediate");
    const zipped = await boundedProjectZip(files, 1);
    expect(breaks.mock.calls.length).toBeGreaterThan(0);
    expectSameFiles(unzipSync(zipped), files);
  });

  it("finishes in one go in a hidden window, which may be frozen before its next turn", async () => {
    vi.stubGlobal("document", { visibilityState: "hidden" });
    const files = smallEntries(120);
    const breaks = vi.spyOn(globalThis, "setImmediate");
    const zipped = await boundedProjectZip(files, 1);
    expect(breaks).not.toHaveBeenCalled();
    expectSameFiles(unzipSync(zipped), files);
  });

  it("writes a valid empty archive", async () => {
    expect(unzipSync(await boundedProjectZip({}))).toEqual({});
  });

  it("bounds simultaneous large-entry compression jobs", async () => {
    let active = 0;
    let maximum = 0;
    let started = 0;
    const push = AsyncZipDeflate.prototype.push;
    vi.spyOn(AsyncZipDeflate.prototype, "push").mockImplementation(function (this: AsyncZipDeflate, bytes, final) {
      started++;
      maximum = Math.max(maximum, ++active);
      const forward = this.ondata;
      this.ondata = (error, data, done) => {
        if (error || done) active--;
        forward(error, data, done);
      };
      push.call(this, bytes, final);
    });
    const files = largeEntries(12);
    const expected = largeEntries(12);
    expectSameFiles(unzipSync(await boundedProjectZip(files, 1)), expected);
    expect(started).toBe(12);
    expect(maximum).toBe(2);
    expect(active).toBe(0);
  });

  it("rejects worker errors and terminates the archive", async () => {
    const failure = new Error("synthetic worker failure");
    const terminate = vi.spyOn(Zip.prototype, "terminate");
    vi.spyOn(AsyncZipDeflate.prototype, "push").mockImplementationOnce(function (this: AsyncZipDeflate) {
      queueMicrotask(() => this.ondata(failure, new Uint8Array(), false));
    });
    await expect(boundedProjectZip(largeEntries(5), 1)).rejects.toBe(failure);
    expect(terminate).toHaveBeenCalled();
  });

  it("rejects synchronous compression failures", async () => {
    const failure = new Error("synthetic push failure");
    const terminate = vi.spyOn(Zip.prototype, "terminate");
    vi.spyOn(AsyncZipDeflate.prototype, "push").mockImplementationOnce(() => { throw failure; });
    await expect(boundedProjectZip(largeEntries(3))).rejects.toBe(failure);
    expect(terminate).toHaveBeenCalled();
  });

  it("rejects archive finalization failures", async () => {
    const failure = new Error("synthetic finalization failure");
    vi.spyOn(Zip.prototype, "end").mockImplementationOnce(() => { throw failure; });
    await expect(boundedProjectZip({ "small.bin": new Uint8Array(5) })).rejects.toBe(failure);
  });

  it("rejects entry registration failures and terminates the new worker", async () => {
    const failure = new Error("synthetic add failure");
    let workerTerminated = false;
    vi.spyOn(Zip.prototype, "add").mockImplementationOnce((stream) => {
      if (stream instanceof AsyncZipDeflate) {
        const terminate = stream.terminate;
        stream.terminate = () => { workerTerminated = true; terminate(); };
      }
      throw failure;
    });
    await expect(boundedProjectZip(largeEntries(3))).rejects.toBe(failure);
    expect(workerTerminated).toBe(true);
  });
});
