import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { announceKernel, createKernelGate, isKernelStatusMessage, isWarmKernelMessage, kernelStatusMessage, warmKernelMessage } from "@/lib/cadKernelGate";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("the time limit of a CAD request counts from the loaded kernel, not its download (#1612)", () => {
  it("does not run out while the kernel is still loading", () => {
    const gate = createKernelGate(180_000);
    const timedOut = vi.fn();
    gate.timeout(timedOut, 20_000);
    // A slow line: the 21 MB file takes a minute. Before, the request gave up after 20 s and the restart began the download again.
    vi.advanceTimersByTime(60_000);
    expect(timedOut).not.toHaveBeenCalled();
    gate.open();
    vi.advanceTimersByTime(19_999);
    expect(timedOut).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(timedOut).toHaveBeenCalledTimes(1);
  });

  it("counts at once when the kernel is already loaded", () => {
    const gate = createKernelGate(180_000);
    gate.open();
    const timedOut = vi.fn();
    gate.timeout(timedOut, 20_000);
    vi.advanceTimersByTime(20_000);
    expect(timedOut).toHaveBeenCalledTimes(1);
  });

  it("counts anyway once the load limit is over, should the worker never say", () => {
    const gate = createKernelGate(180_000);
    const timedOut = vi.fn();
    gate.timeout(timedOut, 20_000);
    vi.advanceTimersByTime(180_000);
    expect(gate.isOpen).toBe(true);
    vi.advanceTimersByTime(20_000);
    expect(timedOut).toHaveBeenCalledTimes(1);
  });

  it("an answered request cancels its time, before and after the kernel is loaded", () => {
    const gate = createKernelGate(180_000);
    const early = vi.fn();
    const late = vi.fn();
    gate.timeout(early, 20_000)();
    gate.open();
    gate.timeout(late, 20_000)();
    vi.advanceTimersByTime(200_000);
    expect(early).not.toHaveBeenCalled();
    expect(late).not.toHaveBeenCalled();
  });

  it("a worker that is gone runs nothing that waited for it", () => {
    const gate = createKernelGate(180_000);
    const timedOut = vi.fn();
    gate.timeout(timedOut, 20_000);
    gate.dispose();
    gate.open();
    vi.advanceTimersByTime(400_000);
    expect(timedOut).not.toHaveBeenCalled();
  });
});

describe("the messages between page and worker", () => {
  it("tells the kernel's status apart from the worker's answers", () => {
    expect(isKernelStatusMessage(kernelStatusMessage("ready"))).toBe(true);
    expect(isKernelStatusMessage(kernelStatusMessage("failed"))).toBe(true);
    expect(isKernelStatusMessage({ type: "ready", requestId: 3 })).toBe(false);
    expect(isKernelStatusMessage({ type: "build", build: "1" })).toBe(false);
    expect(isKernelStatusMessage({ type: "kernel", status: "loading" })).toBe(false);
    expect(isKernelStatusMessage(null)).toBe(false);
    expect(isWarmKernelMessage(warmKernelMessage())).toBe(true);
    expect(isWarmKernelMessage({ type: "prepare", requestId: 1 })).toBe(false);
  });

  it("says ready or failed once the loading settles, and passes the loading on unchanged", async () => {
    vi.useRealTimers();
    const posted: unknown[] = [];
    const kernel = { name: "kernel" };
    await expect(announceKernel(Promise.resolve(kernel), (message) => posted.push(message))).resolves.toBe(kernel);
    const failing = announceKernel(Promise.reject(new Error("network")), (message) => posted.push(message));
    await expect(failing).rejects.toThrow("network");
    await Promise.resolve();
    expect(posted).toEqual([{ type: "kernel", status: "ready" }, { type: "kernel", status: "failed" }]);
  });
});
