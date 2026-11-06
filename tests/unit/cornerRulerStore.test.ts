import { afterEach, describe, expect, it, vi } from "vitest";
import {
  normalizeSavedCornerRulers,
  readCornerRulers,
  readStartWithCornerRuler,
  savedCornerRuler,
  seedStartCornerRuler,
  writeCornerRulers,
  writeStartWithCornerRuler,
  type SavedCornerRuler,
} from "@/lib/cornerRulerStore";
import { editorHistoryEntry } from "@/lib/editorHistory";
import { exportLylProject, importLylProject } from "@/lib/lylProject";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";
import type { WorkplaneShape } from "@/types/layerling";

// #829: the framing square stays where it was set when the design is opened again.
const box: WorkplaneShape = { id: "b", name: "Box", kind: "box", color: "#123456", x: 0, z: 0, size: 20, width: 20, depth: 20, height: 10, rotation: 0 };
const square: SavedCornerRuler = {
  corner: { x: -60, y: 0, z: 45 },
  workplane: { origin: { x: 0, y: 0, z: 0 }, normal: { x: 0, y: 1, z: 0 }, xAxis: { x: 1, y: 0, z: 0 }, zAxis: { x: 0, y: 0, z: 1 } },
  frame: { xAxis: { x: 0, y: 0, z: -1 }, zAxis: { x: 1, y: 0, z: 0 }, normal: { x: 0, y: 1, z: 0 } },
  armLengthX: 100,
  armLengthZ: 80,
  mode: "midpoint",
  axisModes: { elevation: "endpoint" },
};

function pack(cornerRulers?: SavedCornerRuler[] | null, projectId?: string) {
  return exportLylProject({
    ...(projectId ? { projectId } : {}),
    projectName: "Squared",
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
    ...(cornerRulers !== undefined ? { cornerRulers } : {}),
  });
}

function stubStorage() {
  const entries = new Map<string, string>();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => entries.get(key) ?? null,
      setItem: (key: string, value: string) => void entries.set(key, String(value)),
      removeItem: (key: string) => void entries.delete(key),
    },
  });
  return entries;
}

describe("the framing square a design keeps (#829)", () => {
  it("travels in a saved file, mode and all", async () => {
    const restored = await importLylProject(await pack([square]));
    expect(restored.cornerRulers).toEqual([square]);
  });

  it("keeps that its measures of the bodies at the arms are shown only for the selection (#831)", async () => {
    const restored = await importLylProject(await pack([{ ...square, selectedOnly: true }]));
    expect(restored.cornerRulers?.[0].selectedOnly).toBe(true);
    expect((await importLylProject(await pack([square]))).cornerRulers?.[0].selectedOnly).toBeUndefined();
    expect(savedCornerRuler({ ...square, selectedOnly: true, id: "x" }).selectedOnly).toBe(true);
  });

  it("is simply absent from a file saved without one", async () => {
    expect((await importLylProject(await pack(null))).cornerRulers).toBeUndefined();
  });

  it("keeps the fields of the view's square but not its id", () => {
    expect(savedCornerRuler({ ...square, id: "corner-ruler-3" })).toEqual(square);
  });

  it("drops what cannot be a square and fills in arm lengths", () => {
    expect(normalizeSavedCornerRulers(null)).toBeNull();
    expect(normalizeSavedCornerRulers([{ corner: { x: 1, y: 0 } }, "x"])).toBeNull();
    const { armLengthX: _x, armLengthZ: _z, ...withoutArms } = square;
    expect(normalizeSavedCornerRulers([{ ...withoutArms, mode: "sideways", axisModes: { x: "nope" } }])).toEqual([
      { corner: square.corner, workplane: square.workplane, frame: square.frame, armLengthX: 100, armLengthZ: 80 },
    ]);
  });
});

describe("new designs that start with a framing square at the origin (#1386)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const atOrigin: SavedCornerRuler = {
    corner: { x: 0, y: 0, z: 0 },
    workplane: square.workplane,
    // As a click on the plate places it: the arms along the plate, turned a quarter.
    frame: square.frame,
    armLengthX: 100,
    armLengthZ: 80,
    mode: "endpoint",
  };

  it("is off until it is switched on, so a new design starts without one as before", () => {
    stubStorage();
    expect(readStartWithCornerRuler()).toBe(false);
    seedStartCornerRuler("new-1");
    expect(readCornerRulers("new-1")).toEqual([]);
  });

  it("switched on, gives a new design a square at the origin of the plate", () => {
    stubStorage();
    writeStartWithCornerRuler(true);
    expect(readStartWithCornerRuler()).toBe(true);
    seedStartCornerRuler("new-2");
    expect(readCornerRulers("new-2")).toEqual([atOrigin]);
  });

  it("leaves a square the design has where it is", () => {
    stubStorage();
    writeStartWithCornerRuler(true);
    writeCornerRulers("kept", [square]);
    seedStartCornerRuler("kept");
    expect(readCornerRulers("kept")).toEqual([square]);
  });

  it("puts the square in the design's file from the start, as for a design made in the server folder", async () => {
    stubStorage();
    writeStartWithCornerRuler(true);
    seedStartCornerRuler("on-server");
    expect((await importLylProject(await pack(undefined, "on-server"))).cornerRulers).toEqual([atOrigin]);
  });

  it("switched off again, forgets the setting, and without storage stays off", () => {
    const entries = stubStorage();
    writeStartWithCornerRuler(true);
    writeStartWithCornerRuler(false);
    expect(entries.size).toBe(0);
    vi.stubGlobal("window", { localStorage: { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); }, removeItem: () => { throw new Error("blocked"); } } });
    expect(readStartWithCornerRuler()).toBe(false);
    expect(() => writeStartWithCornerRuler(true)).not.toThrow();
    expect(() => seedStartCornerRuler("blocked")).not.toThrow();
  });
});
