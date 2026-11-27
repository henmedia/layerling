/**
 * WebAssembly out of memory or trapped ("memory access out of bounds", "unreachable", an abort): after such an
 * error the CAD kernel's memory is not to be trusted, so it must reach the worker (which starts a fresh kernel)
 * instead of being read as "not valid", "no face" or "try the other way". No imports, so every kernel module can
 * use it without a cycle.
 */
/**
 * occt-wasm rethrows everything as an OcctError ("fuse: unreachable"), so the name of the original RuntimeError is
 * gone by the time a kernel call fails and only the text is left to go by. These are the texts of the traps the
 * browsers raise: "memory access out of bounds" and "unreachable" (Chrome, Safari), "index out of bounds" and
 * "unreachable executed" (Firefox), a bad function table entry, a C++ allocation that failed, a stack that ran out.
 * A C++ exception that only reached us unnamed ("WebAssembly.Exception") is not one of them: the kernel is intact.
 */
const WASM_FAULT_TEXT =
  /memory access out of bounds|out of bounds memory access|index out of bounds|table index is out of bounds|\bunreachable\b|null function or function signature mismatch|\bbad_alloc\b|out of memory|cannot enlarge memory|maximum call stack size exceeded|too much recursion|\babort(?:ed)?\b/i;

export function isWasmMemoryFaultMessage(message: string, errorName = "") {
  return (
    WASM_FAULT_TEXT.test(message) ||
    /^(?:WebAssembly\.)?RuntimeError$/i.test(errorName)
  );
}

/** The same for a caught value of any kind, as a `catch (error)` gets it. */
export function isKernelMemoryFault(error: unknown) {
  return isWasmMemoryFaultMessage(error instanceof Error ? error.message : String(error ?? ""), error instanceof Error ? error.name : "");
}
