/**
 * WebAssembly out of memory or trapped ("memory access out of bounds", "unreachable", an abort): after such an
 * error the CAD kernel's memory is not to be trusted, so it must reach the worker (which starts a fresh kernel)
 * instead of being read as "not valid", "no face" or "try the other way". No imports, so every kernel module can
 * use it without a cycle.
 */
export function isWasmMemoryFaultMessage(message: string, errorName = "") {
  return (
    /memory access out of bounds|out of bounds memory access|\babort(?:ed)?\b/i.test(message) ||
    /^(?:WebAssembly\.)?RuntimeError$/i.test(errorName)
  );
}

/** The same for a caught value of any kind, as a `catch (error)` gets it. */
export function isKernelMemoryFault(error: unknown) {
  return isWasmMemoryFaultMessage(error instanceof Error ? error.message : String(error ?? ""), error instanceof Error ? error.name : "");
}
