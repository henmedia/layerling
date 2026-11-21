import { Session } from "node:inspector";
import { describe, expect, it } from "vitest";
import { appendEditorHistorySnapshot, editorHistoryEntry, type EditorHistoryEntry } from "@/lib/editorHistory";
import { exportLylProject, importLylProject, type LylProjectExportInput } from "@/lib/lylProject";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";
import type { WorkplaneShape } from "@/types/layerling";

// An enclosure built around an imported STEP assembly (#1794): a board of many small exact parts,
// a few copies of a second board, and plain boxes that are moved about. Every part carries its
// tessellation and its exact body as text, as a STEP import leaves them.
type Workload = { label: string; parts: number; trianglesPerPart: number; brepChars: number; historyLimit: number };

const WORKLOADS: Workload[] = [
  { label: "step-assembly", parts: 400, trianglesPerPart: 700, brepChars: 60_000, historyLimit: 10 },
];
if (process.env.LAYERLING_PERF_LARGE === "1") {
  WORKLOADS.push({ label: "step-few-large-parts", parts: 6, trianglesPerPart: 45_000, brepChars: 4_000_000, historyLimit: 10 });
}

function pseudoRandom(seed: number) {
  let state = seed >>> 0 || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function stepPart(workload: Workload, index: number): WorkplaneShape {
  const random = pseudoRandom(index + 1);
  const positions = Array.from({ length: workload.trianglesPerPart * 9 }, () => Number((random() * 80).toFixed(6)));
  const normals = Array.from({ length: workload.trianglesPerPart * 9 }, () => Number((random() * 2 - 1).toFixed(6)));
  let brep = "ISO-10303-21;\n";
  let entity = 0;
  while (brep.length < workload.brepChars) {
    entity += 1;
    brep += `#${entity}=CARTESIAN_POINT('',(${(random() * 80).toFixed(12)},${(random() * 80).toFixed(12)},${(random() * 80).toFixed(12)}));\n`;
  }
  return {
    id: `part-${index}`,
    name: `Part ${index}`,
    kind: "box",
    color: "#2f7d32",
    x: index % 20,
    z: Math.floor(index / 20),
    elevation: 0,
    size: 20,
    width: 20,
    depth: 18,
    height: 16,
    rotation: 0,
    rotationX: 0,
    rotationZ: 0,
    importedMesh: {
      positions,
      normals,
      baseWidth: 20,
      baseDepth: 18,
      baseHeight: 16,
      triangleCount: workload.trianglesPerPart,
      sourceFormat: "step",
      brepStep: brep,
    },
  } as WorkplaneShape;
}

function box(index: number): WorkplaneShape {
  return {
    id: `box-${index}`,
    name: `Box ${index}`,
    kind: "box",
    color: "#cc3344",
    x: index * 30,
    z: 100,
    elevation: 0,
    size: 20,
    width: 20,
    depth: 20,
    height: 4,
    rotation: 0,
    rotationX: 0,
    rotationZ: 0,
  } as WorkplaneShape;
}

function design(workload: Workload): WorkplaneShape[] {
  const board: WorkplaneShape = {
    ...box(999),
    id: "board",
    name: "Board",
    kind: "box",
    groupedShapes: Array.from({ length: workload.parts }, (_unused, index) => stepPart(workload, index)),
  } as WorkplaneShape;
  return [board, ...Array.from({ length: 20 }, (_unused, index) => box(index))];
}

function input(shapes: WorkplaneShape[], history: EditorHistoryEntry[], historyIndex: number): LylProjectExportInput {
  return {
    projectId: "project-perf-step",
    projectName: "Autosave perf STEP",
    createdAt: 1_700_000_000_000,
    modifiedAt: 1_700_000_100_000,
    shapes,
    history,
    historyIndex,
    assets: [],
    workspace: DEFAULT_WORKPLANE_WORKSPACE,
    snapGrid: DEFAULT_SNAP_GRID,
    placementElevation: 0,
    view: null,
    savedViews: null,
    cornerRulers: null,
    tapeMeasurements: null,
    compressionLevel: 1,
  } as LylProjectExportInput;
}

/** The longest stretch the thread was held without a break, and the whole time of `run`. */
async function measure<T>(run: () => Promise<T>) {
  let longest = 0;
  let last = performance.now();
  const timer = setInterval(() => {
    const now = performance.now();
    longest = Math.max(longest, now - last);
    last = now;
  }, 1);
  const start = performance.now();
  const value = await run();
  const ms = performance.now() - start;
  await new Promise((resolve) => setTimeout(resolve, 5));
  longest = Math.max(longest, performance.now() - last);
  clearInterval(timer);
  return { value, ms, blocked: longest };
}

async function profiled<T>(run: () => Promise<T>) {
  if (!process.env.LAYERLING_PERF_PROFILE) return run();
  const session = new Session();
  session.connect();
  const post = (method: string, params?: object) => new Promise<unknown>((resolve, reject) => session.post(method as never, params as never, (error: Error | null, result: unknown) => (error ? reject(error) : resolve(result))));
  await post("Profiler.enable");
  await post("Profiler.setSamplingInterval", { interval: 500 });
  await post("Profiler.start");
  const value = await run();
  const { profile } = await post("Profiler.stop") as { profile: { nodes: Array<{ id: number; callFrame: { functionName: string; url: string; lineNumber: number }; hitCount?: number }>; samples: number[]; timeDeltas: number[] } };
  const selfById = new Map<number, number>();
  profile.samples.forEach((id, index) => selfById.set(id, (selfById.get(id) ?? 0) + (profile.timeDeltas[index] ?? 0)));
  const byFunction = new Map<string, number>();
  profile.nodes.forEach((node) => {
    const key = `${node.callFrame.functionName || "(anonymous)"} ${node.callFrame.url.split("/").slice(-1)[0]}:${node.callFrame.lineNumber + 1}`;
    byFunction.set(key, (byFunction.get(key) ?? 0) + (selfById.get(node.id) ?? 0));
  });
  console.table([...byFunction].sort((a, b) => b[1] - a[1]).slice(0, 14).map(([name, micros]) => ({ function: name, ms: Number((micros / 1000).toFixed(1)) })));
  session.disconnect();
  return value;
}

describe("autosave of a design built around an imported STEP assembly", () => {
  WORKLOADS.forEach((workload) => {
    it(`saves ${workload.label} after moving one small box without holding the thread for the whole package`, async () => {
      let shapes = design(workload);
      let history: EditorHistoryEntry[] = [editorHistoryEntry(shapes, [])];
      let index = 0;
      const step = (move: number) => {
        shapes = shapes.map((shape) => (shape.id === `box-${move % 20}` ? { ...shape, x: shape.x + 1 + move } : shape));
        const next = appendEditorHistorySnapshot(history, index, editorHistoryEntry(shapes, []), workload.historyLimit);
        history = next.entries;
        index = next.index;
      };
      const first = await measure(() => (process.env.LAYERLING_PERF_PROFILE === "first" ? profiled(() => exportLylProject(input(shapes, history, index))) : exportLylProject(input(shapes, history, index))));
      const rows: Array<Record<string, string | number>> = [
        { save: "first", "ms": Math.round(first.ms), "thread held (ms)": Math.round(first.blocked), "states": history.length },
      ];
      let last = first;
      // Past the history limit, so the oldest state drops out with every step as it does in a long session.
      for (let move = 1; move <= workload.historyLimit + 3; move += 1) {
        step(move);
        const final = move === workload.historyLimit + 3 && process.env.LAYERLING_PERF_PROFILE === "1";
        last = await measure(() => (final ? profiled(() => exportLylProject(input(shapes, history, index))) : exportLylProject(input(shapes, history, index))));
        if (move <= 2 || move >= workload.historyLimit) rows.push({ save: `after move ${move}`, "ms": Math.round(last.ms), "thread held (ms)": Math.round(last.blocked), "states": history.length });
      }
      rows.push({ save: "archive (MB)", "ms": Number((last.value.byteLength / 1024 / 1024).toFixed(1)), "thread held (ms)": "", "states": "" });
      console.table(rows);

      const reopened = await importLylProject(last.value);
      expect(reopened.shapes).toHaveLength(shapes.length);
      expect(reopened.shapes[0].groupedShapes).toHaveLength(workload.parts);
      expect(reopened.shapes[0].groupedShapes?.[0].importedMesh?.brepStep).toBe(shapes[0].groupedShapes?.[0].importedMesh?.brepStep);
    });
  });
});
