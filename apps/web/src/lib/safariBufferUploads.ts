/**
 * Safari on an Intel Mac with its own graphics card (Issue #1896, WebKit bug 322040): an upload to a
 * WebGL buffer larger than 1 MiB only reaches the graphics card up to its first MiB, without an error.
 * Everything behind it is garbage, so a large mesh (a design wrapped round a cylinder, 311,040
 * corners, 3.7 MB of positions) is drawn as spikes across the whole view while small parts look right.
 * Chrome and Firefox on the same Mac are fine, as is Safari on Apple silicon.
 *
 * In Safari on a Mac, bufferData and bufferSubData are wrapped once for every WebGL context: a large
 * upload creates the buffer at its full size and fills it in pieces of BUFFER_UPLOAD_CHUNK bytes,
 * each well below the limit. Safari reports "Intel Mac OS X" on Apple silicon too, so an Intel Mac
 * cannot be told apart; the pieces cost next to nothing there. Other browsers are left alone.
 */

/** The largest piece one call uploads: half the 1 MiB Safari copies whole. */
export const BUFFER_UPLOAD_CHUNK = 512 * 1024;

type BufferDataFn = (target: number, data: unknown, usage: number, srcOffset?: number, length?: number) => void;
type BufferSubDataFn = (target: number, dstByteOffset: number, data: unknown, srcOffset?: number, length?: number) => void;
type BufferContextPrototype = { bufferData: BufferDataFn; bufferSubData: BufferSubDataFn };

const WRAPPED = Symbol.for("layerling.safariBufferUploads");

/** Whether this browser is Safari on a Mac (desktop Safari, or an iPad asking for the desktop site), not Chrome, Edge, Firefox or Opera there. */
export function needsChunkedBufferUploads(userAgent: string) {
  return /Macintosh/.test(userAgent) && /Version\/[\d.]+.*Safari\//.test(userAgent) && !/Chrome|Chromium|CriOS|FxiOS|Firefox|Edg|OPR/.test(userAgent);
}

/**
 * The bytes a bufferData or bufferSubData call would upload, as bytes over the same memory, or null
 * when the call passes no data (a size alone, or null). srcOffset and length count elements, as in
 * WebGL 2; a length of 0 or none means to the end.
 */
export function uploadBytes(data: unknown, srcOffset?: number, length?: number): Uint8Array | null {
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (!ArrayBuffer.isView(data)) return null;
  const elementSize = (data as unknown as { BYTES_PER_ELEMENT?: number }).BYTES_PER_ELEMENT ?? 1;
  const elements = data.byteLength / elementSize;
  const start = Math.max(0, srcOffset ?? 0);
  const count = length ? length : elements - start;
  return new Uint8Array(data.buffer, data.byteOffset + start * elementSize, Math.max(0, count) * elementSize);
}

/** Wraps bufferData and bufferSubData of one WebGL context prototype so large uploads go in pieces; once only. */
export function wrapBufferUploads(prototype: BufferContextPrototype, chunk = BUFFER_UPLOAD_CHUNK) {
  const marked = prototype as BufferContextPrototype & { [WRAPPED]?: true };
  if (marked[WRAPPED]) return;
  const bufferData = prototype.bufferData;
  const bufferSubData = prototype.bufferSubData;
  const uploadInPieces = (context: unknown, target: number, dstByteOffset: number, bytes: Uint8Array) => {
    for (let offset = 0; offset < bytes.byteLength; offset += chunk) {
      bufferSubData.call(context, target, dstByteOffset + offset, bytes.subarray(offset, Math.min(bytes.byteLength, offset + chunk)));
    }
  };
  prototype.bufferData = function (this: unknown, target: number, data: unknown, usage: number, srcOffset?: number, length?: number) {
    const bytes = uploadBytes(data, srcOffset, length);
    if (!bytes || bytes.byteLength <= chunk) {
      return (bufferData as (...args: unknown[]) => void).apply(this, Array.prototype.slice.call(arguments));
    }
    bufferData.call(this, target, bytes.byteLength, usage);
    uploadInPieces(this, target, 0, bytes);
  };
  prototype.bufferSubData = function (this: unknown, target: number, dstByteOffset: number, data: unknown, srcOffset?: number, length?: number) {
    const bytes = uploadBytes(data, srcOffset, length);
    if (!bytes || bytes.byteLength <= chunk) {
      return (bufferSubData as (...args: unknown[]) => void).apply(this, Array.prototype.slice.call(arguments));
    }
    uploadInPieces(this, target, dstByteOffset, bytes);
  };
  marked[WRAPPED] = true;
}

/** Call before a WebGL renderer is made: in Safari on a Mac, large buffer uploads then go in pieces (#1896). */
export function installSafariBufferUploads() {
  if (typeof window === "undefined" || typeof navigator === "undefined") return;
  if (!needsChunkedBufferUploads(navigator.userAgent)) return;
  for (const context of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) {
    if (context?.prototype) wrapBufferUploads(context.prototype as unknown as BufferContextPrototype);
  }
}
