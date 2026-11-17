/**
 * The CAD workers load the kernel (a 21 MB wasm file) the first time they need it. The time limits
 * on their answers are for the work, not for that download: on a slow line the download alone took
 * longer than the limit, the worker was restarted, the download began again, and every tool timed
 * out for good (#1612). So a worker says when its kernel is loaded, and the page starts the clock
 * for its requests only then - or after CAD_KERNEL_LOAD_LIMIT_MS, should the worker never say.
 */

/** How long the page waits for a worker's kernel before its time limits count anyway. */
export const CAD_KERNEL_LOAD_LIMIT_MS = 180_000;

/** Sent by a worker each time it has loaded the kernel, or failed to. */
export interface KernelStatusMessage {
  type: "kernel";
  status: "ready" | "failed";
}

/** Sent by the page to have a worker load its kernel before the first tool needs it. */
export interface WarmKernelMessage {
  type: "warmKernel";
}

export function kernelStatusMessage(status: KernelStatusMessage["status"]): KernelStatusMessage {
  return { type: "kernel", status };
}

export function isKernelStatusMessage(value: unknown): value is KernelStatusMessage {
  if (typeof value !== "object" || value === null) return false;
  const { type, status } = value as { type?: unknown; status?: unknown };
  return type === "kernel" && (status === "ready" || status === "failed");
}

export function warmKernelMessage(): WarmKernelMessage {
  return { type: "warmKernel" };
}

export function isWarmKernelMessage(value: unknown): value is WarmKernelMessage {
  return typeof value === "object" && value !== null && (value as { type?: unknown }).type === "warmKernel";
}

/** In a worker: the kernel's loading, telling the page when it is done either way. Returns the same promise. */
export function announceKernel<T>(loading: Promise<T>, post: (message: KernelStatusMessage) => void): Promise<T> {
  loading.then(() => post(kernelStatusMessage("ready")), () => post(kernelStatusMessage("failed")));
  return loading;
}

export interface KernelGate {
  readonly isOpen: boolean;
  /** The worker answered about its kernel: the clocks waiting for it start now. */
  open(): void;
  /** Like setTimeout, but the time runs only once the gate is open. Returns the cancel. */
  timeout(callback: () => void, ms: number): () => void;
  /** The worker is gone: nothing waiting on it runs. */
  dispose(): void;
}

/** One gate per worker, opened by its kernel message or by the load limit, whichever comes first. */
export function createKernelGate(loadLimitMs = CAD_KERNEL_LOAD_LIMIT_MS): KernelGate {
  let isOpen = false;
  let disposed = false;
  const waiting = new Set<() => void>();
  const limit = setTimeout(() => gate.open(), loadLimitMs);
  const gate: KernelGate = {
    get isOpen() {
      return isOpen;
    },
    open() {
      if (isOpen || disposed) return;
      isOpen = true;
      clearTimeout(limit);
      const starts = [...waiting];
      waiting.clear();
      starts.forEach((start) => start());
    },
    timeout(callback, ms) {
      let timer: ReturnType<typeof setTimeout> | null = null;
      let cancelled = false;
      const start = () => {
        if (!cancelled) timer = setTimeout(callback, ms);
      };
      if (isOpen) start();
      else if (!disposed) waiting.add(start);
      return () => {
        cancelled = true;
        waiting.delete(start);
        if (timer !== null) clearTimeout(timer);
      };
    },
    dispose() {
      disposed = true;
      clearTimeout(limit);
      waiting.clear();
    },
  };
  return gate;
}
