import { AsyncZipDeflate, Zip, ZipDeflate, ZipPassThrough, type DeflateOptions } from "fflate";

/** A file as it went into an archive: its deflated bytes and what the ZIP directory says about it. */
type DeflatedEntry = { data: Uint8Array; size: number; crc: number; flag: number | undefined };

// A design built around an imported assembly is hundreds of small files - a mesh, an exact body and
// the edges of every part - and each autosave deflated every one of them again, on the page's own
// thread, in one stretch: over four seconds for an 18 MB package, after almost every change (#1794).
// The files of a design are named after their content, so one that is in the package again is the
// same bytes: its deflated form is kept and goes in as it is. The least recently used ones go once
// the kept bytes pass the budget.
const DEFLATED_ENTRIES_BYTES = 96 * 1024 * 1024;
const deflatedEntries = new Map<string, DeflatedEntry>();
let deflatedEntriesBytes = 0;

function keptDeflatedEntry(key: string, size: number) {
  const kept = deflatedEntries.get(key);
  if (!kept || kept.size !== size) return undefined;
  deflatedEntries.delete(key);
  deflatedEntries.set(key, kept);
  return kept;
}

function keepDeflatedEntry(key: string, entry: DeflatedEntry) {
  const previous = deflatedEntries.get(key);
  if (previous) {
    deflatedEntriesBytes -= previous.data.byteLength;
    deflatedEntries.delete(key);
  }
  if (entry.data.byteLength > DEFLATED_ENTRIES_BYTES) return;
  deflatedEntries.set(key, entry);
  deflatedEntriesBytes += entry.data.byteLength;
  while (deflatedEntriesBytes > DEFLATED_ENTRIES_BYTES) {
    const oldest = deflatedEntries.keys().next();
    if (oldest.done) break;
    deflatedEntriesBytes -= deflatedEntries.get(oldest.value)?.data.byteLength ?? 0;
    deflatedEntries.delete(oldest.value);
  }
}

/** Forgets every kept deflated file; for tests that compare a save with one made from nothing. */
export function forgetDeflatedProjectEntries() {
  deflatedEntries.clear();
  deflatedEntriesBytes = 0;
}

/** How long small files are deflated on the page's thread before it is handed back for a click or a frame. */
export const PROJECT_ZIP_SLICE_MS = 8;

const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

// A hidden window may be frozen or closed at any moment, and its timers run late: there the archive is finished in one go.
const windowIsHidden = () => typeof document !== "undefined" && document.visibilityState === "hidden";

function joinedBytes(parts: Uint8Array[]) {
  if (parts.length === 1) return parts[0];
  const joined = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    joined.set(part, offset);
    offset += part.length;
  }
  return joined;
}

// fflate.zip starts one worker per large entry. Bound jobs during project saves,
// including the automatic save performed before an imported project opens.
/**
 * Zips `files` at `level`. The paths in `stored` go in as they are, without deflate: files that are
 * compressed already (an attached photo or PDF) would barely shrink, and trying would cost each save.
 * The paths in `unchanging` name their own content (the same path is always the same bytes): they are
 * deflated once and their deflated bytes kept for the next archive that holds them. The archive is
 * byte for byte the one it would be without that.
 *
 * Small files are deflated on the calling thread, but never for longer than `PROJECT_ZIP_SLICE_MS`
 * at a stretch while the window is on screen: then the thread is handed back, so a design of many
 * small files does not hold the editor for the whole archive.
 */
export function boundedProjectZip(
  files: Record<string, Uint8Array>,
  level: DeflateOptions["level"] = 6,
  stored?: ReadonlySet<string>,
  unchanging?: ReadonlySet<string>,
) {
  return new Promise<Uint8Array>((resolve, reject) => {
    const entries = Object.entries(files);
    const chunks: Uint8Array[] = [];
    let length = 0;
    let next = 0;
    let active = 0;
    let completed = 0;
    let settled = false;
    let ending = false;
    // Deflating on this thread, in milliseconds since it was last handed back.
    let held = 0;
    let resting = false;
    let breather: MessageChannel | undefined;
    const workers = new Set<AsyncZipDeflate>();
    const settle = () => {
      settled = true;
      breather?.port1.close();
      breather?.port2.close();
      breather = undefined;
    };
    const fail = (error: unknown) => {
      if (settled) return;
      settle();
      for (const worker of workers) worker.terminate();
      archive.terminate();
      reject(error);
    };
    const archive = new Zip((error, data, final) => {
      if (settled) return;
      if (error) {
        fail(error);
        return;
      }
      try {
        chunks.push(data);
        length += data.byteLength;
        if (final) {
          const bytes = new Uint8Array(length);
          let offset = 0;
          for (const chunk of chunks) {
            bytes.set(chunk, offset);
            offset += chunk.length;
          }
          settle();
          resolve(bytes);
        }
      } catch (error) {
        fail(error);
      }
    });
    /** Hands the thread back and goes on in a task of its own, so a click or a frame gets in between. */
    function rest() {
      resting = true;
      const resume = () => {
        if (settled) return;
        resting = false;
        held = 0;
        pump();
      };
      // Outside a browser (the tests, a tool) a message would be answered before any timer got its turn.
      if (typeof setImmediate === "function") {
        setImmediate(resume);
        return;
      }
      // A timer that starts the next one waits four milliseconds each time; a message does not.
      if (typeof MessageChannel === "undefined") {
        globalThis.setTimeout(resume, 0);
        return;
      }
      breather ??= new MessageChannel();
      breather.port1.onmessage = resume;
      breather.port2.postMessage(null);
    }
    function pump() {
      if (settled || ending || resting) return;
      try {
        if (completed === entries.length) {
          ending = true;
          archive.end();
          return;
        }
        while (active < 2 && next < entries.length && !settled) {
          const [name, bytes] = entries[next];
          const deflates = level !== 0 && !stored?.has(name);
          const key = deflates && unchanging?.has(name) ? `${level}:${name}` : undefined;
          const kept = key === undefined ? undefined : keptDeflatedEntry(key, bytes.length);
          const onThread = deflates && !kept && bytes.length < 160_000;
          if (onThread && held >= PROJECT_ZIP_SLICE_MS && !windowIsHidden()) {
            rest();
            return;
          }
          next++;
          let stream: ZipPassThrough | ZipDeflate | AsyncZipDeflate;
          if (kept) {
            // Goes in as the deflated file it is: the entry says deflate, the bytes pass through.
            stream = new ZipPassThrough(name);
            stream.compression = 8;
            (stream as { flag?: number }).flag = kept.flag;
          } else {
            stream = !deflates ? new ZipPassThrough(name)
              : onThread ? new ZipDeflate(name, { level })
                : new AsyncZipDeflate(name, { level });
          }
          if (stream instanceof AsyncZipDeflate) workers.add(stream);
          // DOS dates use local getters; UTC midnight can become 1979 west of UTC.
          stream.mtime = new Date(1980, 0, 1);
          archive.add(stream);
          if (settled) return;
          const forward = stream.ondata;
          const deflated: Uint8Array[] | undefined = key !== undefined && !kept ? [] : undefined;
          active++;
          stream.ondata = (error, data, final) => {
            if (settled) return;
            try {
              forward(error, data, final);
            } catch (failure) {
              fail(failure);
              return;
            }
            if (error) {
              fail(error);
              return;
            }
            if (deflated && data.length > 0) deflated.push(data);
            if (final) {
              if (stream instanceof AsyncZipDeflate) workers.delete(stream);
              if (deflated && key !== undefined) {
                keepDeflatedEntry(key, { data: joinedBytes(deflated), size: stream.size, crc: stream.crc, flag: (stream as { flag?: number }).flag });
              }
              active--;
              completed++;
              queueMicrotask(pump);
            }
          };
          if (kept) {
            stream.size = kept.size;
            stream.crc = kept.crc;
            stream.ondata(null, kept.data as Uint8Array<ArrayBuffer>, true);
          } else if (onThread) {
            const started = now();
            stream.push(bytes, true);
            held += now() - started;
          } else {
            // AsyncZipDeflate transfers its input buffer to the worker. Keep the
            // caller's assets intact, as the previous zip() API did by default.
            stream.push(stream instanceof AsyncZipDeflate ? bytes.slice() : bytes, true);
          }
        }
      } catch (error) {
        fail(error);
      }
    }
    pump();
  });
}
