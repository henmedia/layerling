import { CAD_MODIFIER_RUNTIME_BASE } from "@/lib/cadModifierRuntime";
import { assertCadKernelRunnable } from "@/lib/wasmSupport";

// Shared lazy loader for brepjs + the occt-wasm (OpenCascade) kernel. Both the
// STEP exporter and importer call this so the 22 MB kernel loads at most once
// per session, on first use, and stays out of the initial bundle.
//
// occt-wasm is staged into public/occt by scripts/copy-occt-wasm.mjs and loaded
// at runtime, deliberately outside the Next bundler — the Emscripten glue self
// loads ./occt-wasm.js relative to its own URL and does not survive bundling.
// OCCT_INDEX_URL is typed as string (not a literal) so TypeScript treats the
// dynamic import as runtime-resolved rather than a module to resolve.
const OCCT_INDEX_URL: string = `${CAD_MODIFIER_RUNTIME_BASE}/index.js`;
const OCCT_WASM_URL = `${CAD_MODIFIER_RUNTIME_BASE}/occt-wasm.wasm`;

export type Brep = typeof import("brepjs");
export type BrepSolid = ReturnType<Brep["box"]>;
type OcctWasmModule = typeof import("occt-wasm");

let brepReady: Promise<Brep> | null = null;
let rawKernel: import("occt-wasm").OcctKernel | null = null;

/** The kernel instance behind brepjs once loadBrepWithOcct has finished, for callers that build solids with the kernel's own calls. */
export function occtKernel() {
  return rawKernel;
}

/**
 * Forgets a kernel whose WebAssembly memory broke (out of bounds, unreachable): every later call on it would read
 * garbage, so the next loadBrepWithOcct starts a fresh one.
 */
export function dropOcctKernel() {
  brepReady = null;
  rawKernel = null;
}

export async function loadBrepWithOcct(): Promise<Brep> {
  // An engine without WebAssembly SIMD cannot compile the kernel; say so up front (#350).
  assertCadKernelRunnable();
  // Cache the in-flight/resolved load, but drop a rejected attempt so a transient
  // failure (e.g. a blip fetching the 22 MB wasm) can be retried on the next call
  // instead of poisoning STEP for the rest of the session.
  brepReady ??= (async () => {
    const brep = await import("brepjs");
    const occt = (await import(/* webpackIgnore: true */ OCCT_INDEX_URL)) as unknown as OcctWasmModule;
    const kernel = await occt.OcctKernel.init({ wasm: OCCT_WASM_URL });
    rawKernel = kernel;
    brep.registerKernel("occt-wasm", brep.OcctWasmAdapter.fromKernel(kernel));
    return brep;
  })().catch((error) => {
    brepReady = null;
    rawKernel = null;
    throw error;
  });
  return brepReady;
}
