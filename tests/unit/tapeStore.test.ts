import { describe, expect, it } from "vitest";
import { editorHistoryEntry } from "@/lib/editorHistory";
import { exportLylProject, importLylProject } from "@/lib/lylProject";
import { highestTapeIdNumber, normalizeSavedTape, savedTape, type SavedTape } from "@/lib/tapeStore";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";
import type { WorkplaneShape } from "@/types/layerling";

// #881: the measurements of the tape measure stay with the design, and so does whether they are shown.
const box: WorkplaneShape = { id: "b", name: "Box", kind: "box", color: "#123456", x: 0, z: 0, size: 20, width: 20, depth: 20, height: 10, rotation: 0 };
const tape: SavedTape = {
  points: [
    { id: "p1", x: 0, y: 0, z: 0, attachment: { shapeId: "b", normalized: [-0.5, -0.5, -0.5], kind: "vertex", topologyKey: "k1" } },
    { id: "p2", x: 20, y: 0, z: 0 },
    { id: "p3", x: 5, y: 5, z: 5, attachment: { shapeId: "b", normalized: [0, 0.5, 0], kind: "edge" } },
    { id: "p4", x: 5, y: 5, z: 25 },
  ],
  segments: [
    { id: "s1", startId: "p1", endId: "p2" },
    { id: "s2", startId: "p3", endId: "p4", edge: { key: "e", shapeId: "b", normalizedPoints: [[0, 0, 0], [1, 0, 0]], topologyKey: "k2" } },
  ],
};

function pack(tapeMeasurements?: SavedTape | null) {
  return exportLylProject({
    projectName: "Measured",
    createdAt: 1_700_000_000_000,
    modifiedAt: 1_700_000_100_000,
    shapes: [box],
    history: [editorHistoryEntry([box], [])],
    historyIndex: 0,
    assets: [],
    workspace: DEFAULT_WORKPLANE_WORKSPACE,
    snapGrid: DEFAULT_SNAP_GRID,
    placementElevation: 0,
    savedViews: null,
    view: null,
    cornerRulers: null,
    tapeMeasurements,
  });
}

describe("the measurements a design keeps (#881)", () => {
  it("travel in a saved file, attachments and all", async () => {
    expect((await importLylProject(await pack(tape))).tapeMeasurements).toEqual(tape);
  });

  it("keep whether they are shown", async () => {
    const restored = await importLylProject(await pack({ ...tape, hidden: true }));
    expect(restored.tapeMeasurements?.hidden).toBe(true);
    expect((await importLylProject(await pack(tape))).tapeMeasurements?.hidden).toBeUndefined();
  });

  it("are simply absent from a file saved without any", async () => {
    expect((await importLylProject(await pack(null))).tapeMeasurements).toBeUndefined();
  });

  it("keep the points and lines of the model, not a measurement under way", () => {
    const model = { ...tape, startPointId: "p9", hover: { x: 1, y: 2, z: 3 }, startNormal: [0, 1, 0] };
    expect(savedTape(model)).toEqual(tape);
  });

  it("drop what cannot be a measurement", () => {
    expect(normalizeSavedTape(null)).toBeNull();
    expect(normalizeSavedTape({ points: [], segments: [] })).toBeNull();
    // A line to a point that is not there, a point without a place, and a point no line uses.
    const read = normalizeSavedTape({
      points: [{ id: "a", x: 0, y: 0, z: 0 }, { id: "b", x: 1, y: 0, z: 0 }, { id: "c", x: "x", y: 0, z: 0 }, { id: "lone", x: 5, y: 5, z: 5 }],
      segments: [{ id: "ok", startId: "a", endId: "b" }, { id: "bad", startId: "a", endId: "zzz" }, { id: "bad2", startId: "a", endId: "c" }],
    });
    expect(read?.segments.map((segment) => segment.id)).toEqual(["ok"]);
    expect(read?.points.map((point) => point.id)).toEqual(["a", "b"]);
  });

  it("read an attachment only when it is whole", () => {
    const read = normalizeSavedTape({
      points: [
        { id: "a", x: 0, y: 0, z: 0, attachment: { shapeId: "b", normalized: [0, 0], kind: "vertex" } },
        { id: "b", x: 1, y: 0, z: 0, attachment: { shapeId: "b", normalized: [0, 0, 1], kind: "sideways" } },
      ],
      segments: [{ id: "s", startId: "a", endId: "b", edge: { key: "e", shapeId: "b", normalizedPoints: [[0, 0, 0]] } }],
    });
    expect(read?.points[0].attachment).toBeUndefined();
    expect(read?.points[1].attachment).toEqual({ shapeId: "b", normalized: [0, 0, 1] });
    expect(read?.segments[0].edge).toBeUndefined();
  });
});

describe("highestTapeIdNumber", () => {
  it("counts on from the highest id of the kept points and lines, so a new one never takes a kept id", () => {
    expect(highestTapeIdNumber({ points: [], segments: [] })).toBe(0);
    expect(highestTapeIdNumber({
      points: [{ id: "tape-point-2" }, { id: "tape-point-7" }],
      segments: [{ id: "tape-segment-3" }],
    })).toBe(7);
    expect(highestTapeIdNumber({ points: [{ id: "tape-point-1" }], segments: [{ id: "tape-segment-12" }] })).toBe(12);
    // Ids from elsewhere (an AI, an older file) without a number are passed over.
    expect(highestTapeIdNumber({ points: [{ id: "a" }, { id: "tape-point-4" }], segments: [] })).toBe(4);
  });
});
