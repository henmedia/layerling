import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkplaneShape } from "@/types/layerling";

/**
 * The page's side of the geometry worker (lib/geometryWorker.ts): whatever goes wrong with the
 * worker, the work is done on the page instead, and the editor neither crashes nor waits forever.
 * A stand-in Worker plays each case; the page's own functions are stand-ins too.
 */
const page = vi.hoisted(() => ({ calls: 0, faceReads: 0, stepExports: 0, printChecks: 0 }));
vi.mock("@/lib/stepExport", () => ({
  exportShapesToStep: async () => {
    page.stepExports += 1;
    return { blob: new Blob(["step"]), exportedCount: 1, skipped: [] };
  },
}));
vi.mock("@/lib/printCheck", () => ({
  checkPrint: async (_source: unknown, options: { nozzle?: number }) => {
    page.printChecks += 1;
    return { nozzleMm: options.nozzle ?? 0.4, checkedOn: "page" };
  },
}));
vi.mock("@/lib/editorBooleans", () => ({
  buildGroupedShapeFromSelection: async () => {
    page.calls += 1;
    return { group: { id: "made-on-the-page" }, consumed: false, failureNotice: "" };
  },
  splitShapeIfCrossed: async () => ({ parts: null, error: "page" }),
  splitShapesByPlane: async () => ({ status: "done", replacements: new Map(), splitCount: 0 }),
  faceReadJoins: (shape: { groupedShapes?: unknown[] }) => Boolean(shape.groupedShapes),
  faceReadPositions: async () => {
    page.faceReads += 1;
    return new Float64Array([0, 0, 0]);
  },
}));

class FakeWorker {
  static instances: FakeWorker[] = [];
  static failOnCreate = false;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: ((event: { preventDefault: () => void }) => void) | null = null;
  onmessageerror: (() => void) | null = null;
  posted: Array<{ requestId: number; task: string }> = [];
  terminated = false;
  constructor() {
    if (FakeWorker.failOnCreate) throw new Error("no workers here");
    FakeWorker.instances.push(this);
  }
  postMessage(message: { requestId: number; task: string }) {
    this.posted.push(message);
  }
  terminate() {
    this.terminated = true;
  }
  hello(build = "") {
    this.onmessage?.({ data: { type: "build", build } });
  }
  answer(requestId: number, payload: unknown) {
    this.onmessage?.({ data: { requestId, ok: true, payload, buffers: [] } });
  }
  crash() {
    this.onerror?.({ preventDefault: () => undefined });
  }
}

const pair = { id: "pair", kind: "box", groupedShapes: [{ id: "a", kind: "box" }, { id: "b", kind: "box" }] } as unknown as WorkplaneShape;

const solidAndHole = [
  { id: "box", kind: "box" },
  { id: "hole", kind: "cylinder", hole: true },
] as unknown as WorkplaneShape[];

const flush = () => new Promise((resolve) => setImmediate(resolve));
const dispatched: string[] = [];

async function load(build = "") {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_BUILD_ID", build);
  return import("@/lib/geometryWorker");
}

beforeEach(() => {
  page.calls = 0;
  page.faceReads = 0;
  page.stepExports = 0;
  page.printChecks = 0;
  FakeWorker.instances = [];
  FakeWorker.failOnCreate = false;
  dispatched.length = 0;
  vi.stubGlobal("Worker", FakeWorker);
  vi.stubGlobal("window", {
    location: { href: "http://localhost/editor/" },
    dispatchEvent: (event: { type: string }) => dispatched.push(event.type),
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("geometry worker on the page's side", () => {
  it("hands the work to the worker and returns its answer", async () => {
    const { buildGroupedShapeOffThread } = await load();
    const result = buildGroupedShapeOffThread(solidAndHole, 1000);
    const worker = FakeWorker.instances[0];
    worker.hello();
    await flush();
    expect(worker.posted[0].task).toBe("group");
    worker.answer(worker.posted[0].requestId, { group: { id: "made-in-the-worker" } });
    expect((await result).group?.id).toBe("made-in-the-worker");
    expect(page.calls).toBe(0);
  });

  it("keeps a plain grouping and text on the page", async () => {
    const { buildGroupedShapeOffThread } = await load();
    await buildGroupedShapeOffThread([{ id: "a", kind: "box" }, { id: "b", kind: "box" }] as unknown as WorkplaneShape[], 1000);
    await buildGroupedShapeOffThread([...solidAndHole, { id: "t", kind: "text" } as unknown as WorkplaneShape], 1000);
    expect(FakeWorker.instances).toHaveLength(0);
    expect(page.calls).toBe(2);
  });

  it("writes a STEP file with text in it on the page, where the fonts are (#1337)", async () => {
    const { exportShapesToStepOffThread } = await load();
    const tag = { id: "tag", kind: "box", groupedShapes: [{ id: "plate", kind: "box" }, { id: "words", kind: "text" }] } as unknown as WorkplaneShape;
    const result = await exportShapesToStepOffThread([tag]);
    expect(FakeWorker.instances).toHaveLength(0);
    expect(page.stepExports).toBe(1);
    expect(result.exportedCount).toBe(1);
  });

  it("checks a print in the worker with the nozzle asked for, and one with text in it on the page", async () => {
    const { checkPrintOffThread } = await load();
    const result = checkPrintOffThread([{ id: "box", kind: "box" }] as unknown as WorkplaneShape[], { nozzle: 0.6, overhangAngle: 50 });
    const worker = FakeWorker.instances[0];
    worker.hello();
    await flush();
    const posted = worker.posted[0] as unknown as { requestId: number; task: string; payload: { options: unknown } };
    expect(posted.task).toBe("printCheck");
    expect(posted.payload.options).toEqual({ nozzle: 0.6, overhangAngle: 50 });
    worker.answer(posted.requestId, { nozzleMm: 0.6, checkedOn: "worker" });
    expect(await result).toEqual({ nozzleMm: 0.6, checkedOn: "worker" });
    expect(page.printChecks).toBe(0);
    // The fonts of a text live on the page.
    const tag = { id: "tag", kind: "box", groupedShapes: [{ id: "plate", kind: "box" }, { id: "words", kind: "text" }] } as unknown as WorkplaneShape;
    expect(await checkPrintOffThread([tag], {})).toEqual({ nozzleMm: 0.4, checkedOn: "page" });
    expect(page.printChecks).toBe(1);
    expect(worker.posted).toHaveLength(1);
  });

  it("calls off a print check that a new one replaced: it never answers", async () => {
    const { checkPrintOffThread } = await load();
    const controller = new AbortController();
    let settled = false;
    void checkPrintOffThread([{ id: "box", kind: "box" }] as unknown as WorkplaneShape[], {}, controller.signal).then(() => { settled = true; });
    const worker = FakeWorker.instances[0];
    worker.hello();
    await flush();
    controller.abort();
    worker.answer(worker.posted[0].requestId, { nozzleMm: 0.4 });
    await flush();
    expect(settled).toBe(false);
    expect(page.printChecks).toBe(0);
  });

  it("keeps a Gridfinity bin with letters on its shelves on the page, where the fonts are (#1308)", async () => {
    const { buildGroupedShapeOffThread } = await load();
    const bin = (fields: Record<string, unknown>) => ({ id: "g", kind: "gridfinity", gridfinityType: "bin", width: 83.5, depth: 41.5, height: 25.4, ...fields }) as unknown as WorkplaneShape;
    await buildGroupedShapeOffThread([...solidAndHole, bin({ gridfinityLabelBack: true, gridfinityLabelBackText: "M3" })], 1000);
    await buildGroupedShapeOffThread([...solidAndHole, bin({ gridfinityCompartmentsX: 2, gridfinityCompartmentLabels: [{ column: 0, row: 0, side: "back", text: "M3" }] })], 1000);
    expect(FakeWorker.instances).toHaveLength(0);
    expect(page.calls).toBe(2);
    // Its STEP file is written on the page too, as one with a text in it (#1337).
    const { exportShapesToStepOffThread } = await load();
    await exportShapesToStepOffThread([bin({ gridfinityLabelBack: true, gridfinityLabelBackText: "M3" })]);
    expect(FakeWorker.instances).toHaveLength(0);
    expect(page.stepExports).toBe(1);
    // A text no shelf carries, its shelf switched off, or one that draws nothing goes to the worker as before.
    void buildGroupedShapeOffThread([...solidAndHole, bin({ gridfinityLabelBackText: "M3" })], 1000);
    expect(FakeWorker.instances).toHaveLength(1);
    void buildGroupedShapeOffThread([...solidAndHole, bin({ gridfinityLabelBack: true, gridfinityLabelBackText: " \u200b " })], 1000);
    expect(FakeWorker.instances).toHaveLength(1);
    expect(page.calls).toBe(2);
  });

  it("works on the page when no worker can be made", async () => {
    FakeWorker.failOnCreate = true;
    const { buildGroupedShapeOffThread } = await load();
    expect((await buildGroupedShapeOffThread(solidAndHole, 1000)).group?.id).toBe("made-on-the-page");
  });

  it("works on the page when the worker file does not load, and does not try again", async () => {
    const { buildGroupedShapeOffThread } = await load();
    const first = buildGroupedShapeOffThread(solidAndHole, 1000);
    FakeWorker.instances[0].crash();
    expect((await first).group?.id).toBe("made-on-the-page");
    expect(FakeWorker.instances[0].terminated).toBe(true);
    await buildGroupedShapeOffThread(solidAndHole, 1000);
    expect(FakeWorker.instances).toHaveLength(1);
    expect(page.calls).toBe(2);
  });

  it("works on the page when the worker never says hello", async () => {
    vi.useFakeTimers();
    const { buildGroupedShapeOffThread } = await load();
    const result = buildGroupedShapeOffThread(solidAndHole, 1000);
    await vi.advanceTimersByTimeAsync(15_000);
    expect((await result).group?.id).toBe("made-on-the-page");
  });

  it("does not use a worker from another build and offers the reload", async () => {
    const { buildGroupedShapeOffThread } = await load("page-build");
    const result = buildGroupedShapeOffThread(solidAndHole, 1000);
    FakeWorker.instances[0].hello("older-build");
    expect((await result).group?.id).toBe("made-on-the-page");
    expect(FakeWorker.instances[0].posted).toHaveLength(0);
    expect(dispatched).toEqual(["layerling:build-mismatch"]);
  });

  it("finishes on the page what a crashed worker had started", async () => {
    const { buildGroupedShapeOffThread } = await load();
    const result = buildGroupedShapeOffThread(solidAndHole, 1000);
    FakeWorker.instances[0].hello();
    await flush();
    FakeWorker.instances[0].crash();
    expect((await result).group?.id).toBe("made-on-the-page");
  });

  it("stops a stuck worker and says so", async () => {
    vi.useFakeTimers();
    const { buildGroupedShapeOffThread, GEOMETRY_WORKER_TIMEOUT_MS } = await load();
    const result = buildGroupedShapeOffThread(solidAndHole, 1000);
    FakeWorker.instances[0].hello();
    await vi.advanceTimersByTimeAsync(GEOMETRY_WORKER_TIMEOUT_MS);
    const answer = await result;
    expect(answer.group).toBeNull();
    expect(answer.failureNotice).toMatch(/too long/);
    expect(FakeWorker.instances[0].terminated).toBe(true);
    expect(page.calls).toBe(0);
  });

  it("calls off a request: no answer, and the worker stops working on it", async () => {
    const { buildGroupedShapeOffThread, subscribeGeometryBusy } = await load();
    const busy: boolean[] = [];
    subscribeGeometryBusy((value) => busy.push(value));
    const controller = new AbortController();
    let settled = false;
    void buildGroupedShapeOffThread(solidAndHole, 1000, controller.signal).then(() => { settled = true; });
    const worker = FakeWorker.instances[0];
    worker.hello();
    await flush();
    controller.abort();
    worker.answer(worker.posted[0].requestId, { group: { id: "late" } });
    await flush();
    expect(settled).toBe(false);
    expect(worker.terminated).toBe(true);
    expect(busy).toEqual([true, false]);
  });

  it("warms up without saying it is calculating", async () => {
    const { warmGeometryWorker, subscribeGeometryBusy } = await load();
    const busy: boolean[] = [];
    subscribeGeometryBusy((value) => busy.push(value));
    warmGeometryWorker();
    const worker = FakeWorker.instances[0];
    worker.hello();
    await flush();
    expect(worker.posted[0].task).toBe("warm");
    expect(busy).toEqual([false]);
  });

  it("joins a group's parts for the face readers in the worker, saying it is calculating", async () => {
    const { faceReadPositionsOffThread, subscribeGeometryBusy } = await load();
    const busy: boolean[] = [];
    subscribeGeometryBusy((value) => busy.push(value));
    const result = faceReadPositionsOffThread(pair);
    const worker = FakeWorker.instances[0];
    worker.hello();
    await flush();
    expect(worker.posted[0].task).toBe("face");
    worker.answer(worker.posted[0].requestId, new Float64Array([1, 2, 3]));
    expect(await result).toEqual(new Float64Array([1, 2, 3]));
    expect(busy).toEqual([true, false]);
    expect(page.faceReads).toBe(0);
  });

  it("reads a body whose parts are not joined on the page, without the worker", async () => {
    const { faceReadPositionsOffThread } = await load();
    expect(await faceReadPositionsOffThread({ id: "box", kind: "box" } as unknown as WorkplaneShape)).toEqual(new Float64Array([0, 0, 0]));
    expect(FakeWorker.instances).toHaveLength(0);
    expect(page.faceReads).toBe(1);
  });

  it("calls off a face read: no answer, and nothing left calculating", async () => {
    const { faceReadPositionsOffThread, subscribeGeometryBusy } = await load();
    const busy: boolean[] = [];
    subscribeGeometryBusy((value) => busy.push(value));
    const controller = new AbortController();
    let settled = false;
    void faceReadPositionsOffThread(pair, controller.signal).then(() => { settled = true; });
    const worker = FakeWorker.instances[0];
    worker.hello();
    await flush();
    controller.abort();
    worker.answer(worker.posted[0].requestId, new Float64Array([1, 2, 3]));
    await flush();
    expect(settled).toBe(false);
    expect(busy).toEqual([true, false]);
    expect(page.faceReads).toBe(0);
  });

  it("joins a group with text in it on the page, and any group when the worker cannot start", async () => {
    const { faceReadPositionsOffThread } = await load();
    const tag = { id: "tag", kind: "box", groupedShapes: [{ id: "plate", kind: "box" }, { id: "words", kind: "text" }] } as unknown as WorkplaneShape;
    expect(await faceReadPositionsOffThread(tag)).toEqual(new Float64Array([0, 0, 0]));
    expect(FakeWorker.instances).toHaveLength(0);
    FakeWorker.failOnCreate = true;
    const again = await load();
    expect(await again.faceReadPositionsOffThread(pair)).toEqual(new Float64Array([0, 0, 0]));
    expect(page.faceReads).toBe(2);
  });

  it("reads a group ahead without \"Calculating\" when asked to be quiet", async () => {
    const { faceReadPositionsOffThread, subscribeGeometryBusy } = await load();
    const busy: boolean[] = [];
    subscribeGeometryBusy((value) => busy.push(value));
    const ahead = faceReadPositionsOffThread(pair, undefined, true);
    const worker = FakeWorker.instances[0];
    worker.hello();
    await flush();
    expect(worker.posted.map((message) => message.task)).toContain("face");
    worker.answer(worker.posted.at(-1)!.requestId, new Float64Array([1, 2, 3]));
    expect(await ahead).toEqual(new Float64Array([1, 2, 3]));
    expect(busy).not.toContain(true);
  });

  it("does not read ahead on the page when the worker cannot start, but leaves the read to the click", async () => {
    FakeWorker.failOnCreate = true;
    const { faceReadPositionsOffThread } = await load();
    await expect(faceReadPositionsOffThread(pair, undefined, true)).rejects.toThrow();
    expect(page.faceReads).toBe(0);
    await faceReadPositionsOffThread(pair);
    expect(page.faceReads).toBe(1);
  });

  it("warms the worker again when calling off a face read stopped it, but not as the editor closes", async () => {
    const { callOffFaceRead, faceReadPositionsOffThread } = await load();
    const first = new AbortController();
    void faceReadPositionsOffThread(pair, first.signal, true);
    FakeWorker.instances[0].hello();
    await flush();
    callOffFaceRead(first);
    expect(FakeWorker.instances[0].terminated).toBe(true);
    await flush();
    expect(FakeWorker.instances).toHaveLength(2);
    const second = FakeWorker.instances[1];
    second.hello();
    await flush();
    expect(second.posted.map((message) => message.task)).toEqual(["warm"]);
    second.answer(second.posted[0].requestId, null);
    const closing = new AbortController();
    void faceReadPositionsOffThread(pair, closing.signal, true);
    await flush();
    callOffFaceRead(closing, true);
    await flush();
    expect(second.terminated).toBe(true);
    expect(FakeWorker.instances).toHaveLength(2);
  });

  it("does not warm the worker again when the read had answered", async () => {
    const { callOffFaceRead, faceReadPositionsOffThread } = await load();
    const controller = new AbortController();
    const read = faceReadPositionsOffThread(pair, controller.signal, true);
    const worker = FakeWorker.instances[0];
    worker.hello();
    await flush();
    worker.answer(worker.posted.at(-1)!.requestId, new Float64Array([1, 2, 3]));
    await read;
    callOffFaceRead(controller);
    await flush();
    expect(worker.terminated).toBe(false);
    expect(worker.posted.map((message) => message.task)).toEqual(["face"]);
  });

  describe("the read the Face tool and the hole pattern keep", () => {
    const faceTasks = (worker: FakeWorker) => worker.posted.filter((message) => message.task === "face");
    const settled = (promise: Promise<unknown>) => {
      const state = { done: false };
      void promise.then(() => { state.done = true; }, () => { state.done = true; });
      return state;
    };

    it("is read ahead once, quietly, and taken by the clicks after it", async () => {
      const { createFaceReadKeeper, subscribeGeometryBusy } = await load();
      const heard: string[] = [];
      const keeper = createFaceReadKeeper((fingerprint) => heard.push(fingerprint));
      const busy: boolean[] = [];
      subscribeGeometryBusy((value) => busy.push(value));
      keeper.readAhead(pair, "f");
      keeper.readAhead(pair, "f");
      const worker = FakeWorker.instances[0];
      worker.hello();
      await flush();
      expect(busy).not.toContain(true);
      const click = keeper.forClick(pair, "f", new AbortController().signal, () => true);
      expect(busy.at(-1)).toBe(true);
      const answered = new Float64Array([1, 2, 3]);
      worker.answer(faceTasks(worker)[0].requestId, answered);
      expect(await click).toBe(answered);
      expect(heard).toEqual(["f"]);
      expect(await keeper.forClick(pair, "f", new AbortController().signal, () => true)).toBe(answered);
      expect(faceTasks(worker)).toHaveLength(1);
    });

    it("keeps a click's own read when none was read ahead, for the pointer and the next click", async () => {
      const { createFaceReadKeeper } = await load();
      const heard: string[] = [];
      const keeper = createFaceReadKeeper((fingerprint) => heard.push(fingerprint));
      const click = keeper.forClick(pair, "f", new AbortController().signal, () => true);
      const worker = FakeWorker.instances[0];
      worker.hello();
      await flush();
      const answered = new Float64Array([1, 2, 3]);
      worker.answer(faceTasks(worker)[0].requestId, answered);
      expect(await click).toBe(answered);
      expect(heard).toEqual(["f"]);
      keeper.readAhead(pair, "f");
      expect(await keeper.forClick(pair, "f", new AbortController().signal, () => true)).toBe(answered);
      expect(faceTasks(worker)).toHaveLength(1);
    });

    it("shows \"Calculating\" while a click waits for a read ahead that fails, then reads for the click", async () => {
      const { createFaceReadKeeper, subscribeGeometryBusy } = await load();
      const keeper = createFaceReadKeeper(() => undefined);
      const busy: boolean[] = [];
      subscribeGeometryBusy((value) => busy.push(value));
      keeper.readAhead(pair, "f");
      FakeWorker.instances[0].hello();
      await flush();
      const click = keeper.forClick(pair, "f", new AbortController().signal, () => true);
      expect(busy.at(-1)).toBe(true);
      FakeWorker.instances[0].crash();
      await flush();
      const worker = FakeWorker.instances.at(-1)!;
      worker.hello();
      await flush();
      const answered = new Float64Array([1, 2, 3]);
      worker.answer(faceTasks(worker).at(-1)!.requestId, answered);
      expect(await click).toBe(answered);
      expect(busy.at(-1)).toBe(false);
    });

    it("keeps the read made after a drop, though the dropped one settles after it", async () => {
      const { createFaceReadKeeper } = await load();
      const keeper = createFaceReadKeeper(() => undefined);
      keeper.readAhead(pair, "f");
      FakeWorker.instances[0].hello();
      await flush();
      keeper.drop();
      keeper.readAhead(pair, "f");
      await flush();
      const worker = FakeWorker.instances.at(-1)!;
      worker.hello();
      await flush();
      const click = keeper.forClick(pair, "f", new AbortController().signal, () => true);
      const answered = new Float64Array([1, 2, 3]);
      worker.answer(faceTasks(worker).at(-1)!.requestId, answered);
      expect(await click).toBe(answered);
      expect(FakeWorker.instances.flatMap(faceTasks)).toHaveLength(2);
    });

    it("calls off a read it no longer keeps when it reads another body", async () => {
      const { createFaceReadKeeper } = await load();
      const keeper = createFaceReadKeeper(() => undefined);
      keeper.readAhead(pair, "f");
      FakeWorker.instances[0].hello();
      await flush();
      keeper.readAhead(pair, "g");
      await flush();
      expect(FakeWorker.instances[0].terminated).toBe(true);
    });

    it("lets a click called off stop waiting while the read goes on for the next click", async () => {
      const { createFaceReadKeeper, subscribeGeometryBusy } = await load();
      const keeper = createFaceReadKeeper(() => undefined);
      const busy: boolean[] = [];
      subscribeGeometryBusy((value) => busy.push(value));
      keeper.readAhead(pair, "f");
      const first = new AbortController();
      const firstClick = settled(keeper.forClick(pair, "f", first.signal, () => true));
      const worker = FakeWorker.instances[0];
      worker.hello();
      await flush();
      first.abort();
      await flush();
      expect(busy.at(-1)).toBe(false);
      const second = keeper.forClick(pair, "f", new AbortController().signal, () => true);
      await flush();
      expect(worker.terminated).toBe(false);
      const answered = new Float64Array([1, 2, 3]);
      worker.answer(faceTasks(worker)[0].requestId, answered);
      expect(await second).toBe(answered);
      await flush();
      expect(firstClick.done).toBe(false);
      expect(faceTasks(worker)).toHaveLength(1);
    });

    it("lets a click already called off stop waiting at once, the read ahead going on", async () => {
      const { createFaceReadKeeper, subscribeGeometryBusy } = await load();
      const keeper = createFaceReadKeeper(() => undefined);
      const busy: boolean[] = [];
      subscribeGeometryBusy((value) => busy.push(value));
      keeper.readAhead(pair, "f");
      FakeWorker.instances[0].hello();
      await flush();
      const calledOff = new AbortController();
      calledOff.abort();
      const click = settled(keeper.forClick(pair, "f", calledOff.signal, () => true));
      await flush();
      expect(busy.at(-1)).toBe(false);
      expect(click.done).toBe(false);
      expect(FakeWorker.instances[0].terminated).toBe(false);
    });

    it("lets a click called off during its own read stop waiting, the read kept for the next click", async () => {
      const { createFaceReadKeeper } = await load();
      const keeper = createFaceReadKeeper(() => undefined);
      const first = new AbortController();
      const firstClick = settled(keeper.forClick(pair, "f", first.signal, () => true));
      const worker = FakeWorker.instances[0];
      worker.hello();
      await flush();
      first.abort();
      await flush();
      const second = keeper.forClick(pair, "f", new AbortController().signal, () => true);
      const answered = new Float64Array([1, 2, 3]);
      worker.answer(faceTasks(worker)[0].requestId, answered);
      expect(await second).toBe(answered);
      expect(firstClick.done).toBe(false);
      expect(faceTasks(worker)).toHaveLength(1);
    });

    it("gives no answer to a click whose kept read was dropped for a changed body, and reads nothing more for it", async () => {
      const { createFaceReadKeeper, subscribeGeometryBusy } = await load();
      const keeper = createFaceReadKeeper(() => undefined);
      const busy: boolean[] = [];
      subscribeGeometryBusy((value) => busy.push(value));
      keeper.readAhead(pair, "f");
      FakeWorker.instances[0].hello();
      await flush();
      const click = settled(keeper.forClick(pair, "f", new AbortController().signal, () => false));
      keeper.drop();
      await flush();
      FakeWorker.instances.at(-1)!.hello();
      await flush();
      expect(click.done).toBe(false);
      expect(busy.at(-1)).toBe(false);
      expect(FakeWorker.instances.flatMap(faceTasks)).toHaveLength(1);
    });

    it("reads again for a click whose kept read was dropped while the body stayed as it is", async () => {
      const { createFaceReadKeeper } = await load();
      const keeper = createFaceReadKeeper(() => undefined);
      keeper.readAhead(pair, "f");
      FakeWorker.instances[0].hello();
      await flush();
      const click = keeper.forClick(pair, "f", new AbortController().signal, () => true);
      keeper.drop();
      await flush();
      const worker = FakeWorker.instances.at(-1)!;
      worker.hello();
      await flush();
      const answered = new Float64Array([1, 2, 3]);
      worker.answer(faceTasks(worker).at(-1)!.requestId, answered);
      expect(await click).toBe(answered);
    });

    it("tries the read ahead again once a kept read failed or was dropped", async () => {
      const { createFaceReadKeeper } = await load();
      const keeper = createFaceReadKeeper(() => undefined);
      keeper.readAhead(pair, "f");
      FakeWorker.instances[0].hello();
      await flush();
      FakeWorker.instances[0].crash();
      await flush();
      keeper.readAhead(pair, "f");
      FakeWorker.instances.at(-1)!.hello();
      await flush();
      expect(FakeWorker.instances.flatMap(faceTasks)).toHaveLength(2);
      keeper.drop();
      keeper.readAhead(pair, "f");
      FakeWorker.instances.at(-1)!.hello();
      await flush();
      expect(FakeWorker.instances.flatMap(faceTasks)).toHaveLength(3);
    });

    it("warms the worker again when dropping a read still running stopped it, but not as the editor closes", async () => {
      const { createFaceReadKeeper } = await load();
      const keeper = createFaceReadKeeper(() => undefined);
      keeper.readAhead(pair, "f");
      FakeWorker.instances[0].hello();
      await flush();
      keeper.drop();
      await flush();
      expect(FakeWorker.instances[0].terminated).toBe(true);
      expect(FakeWorker.instances).toHaveLength(2);
      FakeWorker.instances[1].hello();
      await flush();
      keeper.readAhead(pair, "g");
      await flush();
      keeper.drop(true);
      await flush();
      expect(FakeWorker.instances).toHaveLength(2);
    });

    it("reads for the click on the page when the read ahead fails without a worker", async () => {
      FakeWorker.failOnCreate = true;
      const { createFaceReadKeeper } = await load();
      const keeper = createFaceReadKeeper(() => undefined);
      keeper.readAhead(pair, "f");
      await flush();
      expect(page.faceReads).toBe(0);
      await keeper.forClick(pair, "f", new AbortController().signal, () => true);
      expect(page.faceReads).toBe(1);
    });

    it("tells a click that its own read took too long", async () => {
      vi.useFakeTimers();
      const { createFaceReadKeeper, GEOMETRY_WORKER_TIMEOUT_MS } = await load();
      const keeper = createFaceReadKeeper(() => undefined);
      const click = keeper.forClick(pair, "f", new AbortController().signal, () => true);
      const failed = expect(click).rejects.toThrow(/too long/);
      FakeWorker.instances[0].hello();
      await vi.advanceTimersByTimeAsync(GEOMETRY_WORKER_TIMEOUT_MS);
      await failed;
    });

    it("reads a group with text in it for the click alone, on the page", async () => {
      const { createFaceReadKeeper } = await load();
      const heard: string[] = [];
      const keeper = createFaceReadKeeper((fingerprint) => heard.push(fingerprint));
      const tag = { ...pair, groupedShapes: [{ id: "a", kind: "box" }, { id: "t", kind: "text" }] } as unknown as WorkplaneShape;
      await keeper.forClick(tag, "t", new AbortController().signal, () => true);
      await keeper.forClick(tag, "t", new AbortController().signal, () => true);
      expect(page.faceReads).toBe(2);
      expect(heard).toEqual([]);
      expect(FakeWorker.instances).toHaveLength(0);
    });
  });

  it("reads in the worker only a group whose parts are joined and hold no text", async () => {
    const { faceReadInWorker } = await load();
    expect(faceReadInWorker(pair)).toBe(true);
    expect(faceReadInWorker({ id: "box", kind: "box" } as WorkplaneShape)).toBe(false);
    expect(faceReadInWorker({ ...pair, groupedShapes: [{ id: "a", kind: "box" }, { id: "t", kind: "text" }] } as unknown as WorkplaneShape)).toBe(false);
  });

  it("says so when a face read takes too long", async () => {
    vi.useFakeTimers();
    const { faceReadPositionsOffThread, GEOMETRY_WORKER_TIMEOUT_MS } = await load();
    const result = faceReadPositionsOffThread(pair);
    const failed = expect(result).rejects.toThrow(/too long/);
    FakeWorker.instances[0].hello();
    await vi.advanceTimersByTimeAsync(GEOMETRY_WORKER_TIMEOUT_MS);
    await failed;
    expect(page.faceReads).toBe(0);
  });
});
