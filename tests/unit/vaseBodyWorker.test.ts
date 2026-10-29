import { afterEach, describe, expect, it, vi } from "vitest";
import { buildVaseBody, type VaseBodyWorkerRequest } from "@/lib/vaseBody";
import { normalizeVaseSettings } from "@/lib/vaseSettings";

/** A worker that answers as vaseBody.worker.ts does, a moment later; it counts what it was asked. */
class FakeWorker {
  static requests: VaseBodyWorkerRequest[] = [];
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: (() => void) | null = null;
  postMessage(request: VaseBodyWorkerRequest) {
    FakeWorker.requests.push(request);
    setTimeout(() => this.onmessage?.({ data: { requestId: request.requestId, body: buildVaseBody(request.settings) } }), 0);
  }
  terminate() {}
}

const frame = { id: "vase-1", width: 70, depth: 70, height: 110 };

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
  FakeWorker.requests = [];
});

describe("vaseShapePatchOffThread", () => {
  it("hands the patch on at once where no worker runs, the same as vaseShapePatch", async () => {
    const { vaseShapePatch, vaseShapePatchOffThread } = await import("@/lib/vaseShape");
    const vase = normalizeVaseSettings({ section: "vieleck" });
    const applied = vi.fn();
    vaseShapePatchOffThread(frame, vase, applied);
    expect(applied).toHaveBeenCalledTimes(1);
    expect(applied.mock.calls[0][0]).toEqual(vaseShapePatch(frame, vase));
  });

  it("builds on the worker and hands on only the newest change of a shape", async () => {
    vi.stubGlobal("Worker", FakeWorker);
    vi.stubGlobal("window", globalThis);
    const { vaseShapePatch, vaseShapePatchOffThread } = await import("@/lib/vaseShape");
    const applied = vi.fn();
    const first = normalizeVaseSettings({ body: "hohl", cutout: "voronoi", quality: "entwurf" });
    const last = normalizeVaseSettings({ body: "hohl", cutout: "voronoi", quality: "entwurf", section: "vieleck" });
    vaseShapePatchOffThread(frame, first, applied);
    vaseShapePatchOffThread(frame, last, applied);
    expect(applied).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(applied).toHaveBeenCalledTimes(1));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(applied).toHaveBeenCalledTimes(1);
    expect(FakeWorker.requests).toHaveLength(2);
    expect(applied.mock.calls[0][0]).toEqual(vaseShapePatch(frame, last));
  });

  it("does not ask the worker again for a body it built", async () => {
    vi.stubGlobal("Worker", FakeWorker);
    vi.stubGlobal("window", globalThis);
    const { vaseShapePatchOffThread } = await import("@/lib/vaseShape");
    const vase = normalizeVaseSettings({ section: "welle", quality: "entwurf" });
    const applied = vi.fn();
    vaseShapePatchOffThread(frame, vase, applied);
    await vi.waitFor(() => expect(applied).toHaveBeenCalledTimes(1));
    vaseShapePatchOffThread(frame, vase, applied);
    expect(applied).toHaveBeenCalledTimes(2);
    expect(FakeWorker.requests).toHaveLength(1);
  });
});
