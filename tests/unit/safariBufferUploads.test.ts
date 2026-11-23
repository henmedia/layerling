import { describe, expect, it } from "vitest";
import { BUFFER_UPLOAD_CHUNK, needsChunkedBufferUploads, uploadBytes, wrapBufferUploads } from "@/lib/safariBufferUploads";

// Issue #1896: Safari on an Intel Mac with its own graphics card uploads only the first MiB of a WebGL buffer.

const SAFARI_MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5.2 Safari/605.1.15";
const CHROME_MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36";
const EDGE_MAC = `${CHROME_MAC} Edg/142.0.0.0`;
const FIREFOX_MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:145.0) Gecko/20100101 Firefox/145.0";
const SAFARI_IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 26_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1";
const EDGE_WINDOWS = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0";

/** A stand-in WebGL context: one buffer per target, its bytes as the calls leave them, and the calls themselves. */
function fakeContext() {
  const calls: { name: string; size: number }[] = [];
  const buffers = new Map<number, Uint8Array>();
  const prototype = {
    bufferData(this: unknown, target: number, data: unknown, _usage: number, srcOffset?: number, length?: number) {
      if (typeof data === "number") {
        calls.push({ name: "bufferData", size: data });
        buffers.set(target, new Uint8Array(data));
        return;
      }
      const bytes = uploadBytes(data, srcOffset, length) ?? new Uint8Array(0);
      calls.push({ name: "bufferData", size: bytes.byteLength });
      buffers.set(target, bytes.slice());
    },
    bufferSubData(this: unknown, target: number, dstByteOffset: number, data: unknown, srcOffset?: number, length?: number) {
      const bytes = uploadBytes(data, srcOffset, length) ?? new Uint8Array(0);
      calls.push({ name: "bufferSubData", size: bytes.byteLength });
      buffers.get(target)!.set(bytes, dstByteOffset);
    },
  };
  return { prototype, calls, buffers };
}

const ARRAY_BUFFER = 34962;
const STATIC_DRAW = 35044;

describe("Safari buffer uploads in pieces (#1896)", () => {
  it("only wraps desktop Safari on a Mac", () => {
    expect(needsChunkedBufferUploads(SAFARI_MAC)).toBe(true);
    expect(needsChunkedBufferUploads(CHROME_MAC)).toBe(false);
    expect(needsChunkedBufferUploads(EDGE_MAC)).toBe(false);
    expect(needsChunkedBufferUploads(FIREFOX_MAC)).toBe(false);
    expect(needsChunkedBufferUploads(SAFARI_IPHONE)).toBe(false);
    expect(needsChunkedBufferUploads(EDGE_WINDOWS)).toBe(false);
  });

  it("uploads a large mesh in pieces below the limit, byte for byte", () => {
    const { prototype, calls, buffers } = fakeContext();
    wrapBufferUploads(prototype);
    // The wrapped design of the report: 311,040 corners, 3.7 MB of positions.
    const positions = new Float32Array(311_040 * 3).map((_, index) => index * 0.25);
    prototype.bufferData(ARRAY_BUFFER, positions, STATIC_DRAW);
    expect(calls[0]).toEqual({ name: "bufferData", size: positions.byteLength });
    expect(calls.slice(1).every((call) => call.name === "bufferSubData" && call.size <= BUFFER_UPLOAD_CHUNK)).toBe(true);
    expect(calls.length).toBe(1 + Math.ceil(positions.byteLength / BUFFER_UPLOAD_CHUNK));
    expect(new Float32Array(buffers.get(ARRAY_BUFFER)!.buffer)).toEqual(positions);
  });

  it("leaves small uploads, sizes alone and null as they are", () => {
    const { prototype, calls } = fakeContext();
    wrapBufferUploads(prototype);
    prototype.bufferData(ARRAY_BUFFER, new Float32Array(1000), STATIC_DRAW);
    prototype.bufferData(ARRAY_BUFFER, 4096, STATIC_DRAW);
    expect(calls).toEqual([{ name: "bufferData", size: 4000 }, { name: "bufferData", size: 4096 }]);
  });

  it("splits a large update into pieces at the right offsets, with WebGL 2's element offset and length", () => {
    const { prototype, calls, buffers } = fakeContext();
    wrapBufferUploads(prototype);
    prototype.bufferData(ARRAY_BUFFER, 3_000_000, STATIC_DRAW);
    const indices = new Uint32Array(700_000).map((_, index) => index);
    // From element 100 on, 600,000 elements, written from byte 8 of the buffer.
    prototype.bufferSubData(ARRAY_BUFFER, 8, indices, 100, 600_000);
    expect(calls.slice(1).every((call) => call.name === "bufferSubData" && call.size <= BUFFER_UPLOAD_CHUNK)).toBe(true);
    const stored = buffers.get(ARRAY_BUFFER)!;
    const written = new Uint32Array(stored.buffer, 8, 600_000);
    expect(written[0]).toBe(100);
    expect(written[599_999]).toBe(600_099);
    expect(Array.from(written.subarray(131_070, 131_075))).toEqual([131_170, 131_171, 131_172, 131_173, 131_174]);
  });

  it("wraps a prototype only once", () => {
    const { prototype } = fakeContext();
    wrapBufferUploads(prototype);
    const wrapped = prototype.bufferData;
    wrapBufferUploads(prototype);
    expect(prototype.bufferData).toBe(wrapped);
  });
});
