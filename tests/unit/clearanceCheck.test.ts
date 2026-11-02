import { describe, expect, it } from "vitest";
import { clearanceMarkFor, clearanceRowIds, clearanceRows, formatClearanceLength } from "@/components/workplane/ClearancePanel";
import { clearanceFocusBox } from "@/components/workplane/ClearanceMarkOverlay";
import {
  CLEARANCE_DEFAULT_THRESHOLD_MM,
  CLEARANCE_SEARCH_MM,
  CLEARANCE_TOUCH_MM,
  checkClearance,
  classifyClearanceGap,
  clearanceBoxesNear,
  clearanceDirection,
  clearanceMeshShape,
  clearancePairKey,
  clearancePartName,
  clearanceSourceShapes,
  normalizeClearanceOptions,
  reclassifyClearance,
  sortClearanceResult,
  type ClearanceGap,
  type ClearanceResult,
} from "@/lib/clearanceCheck";
import { DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";
import type { WorkplaneShape } from "@/types/layerling";

const box = (min: [number, number, number], max: [number, number, number]) => ({ min, max });
const gap = (a: string, b: string, gapMm: number): ClearanceGap => ({ a, b, gapMm, pointA: [0, 0, 0], pointB: [gapMm, 0, 0], direction: "side" });
const result = (patch: Partial<ClearanceResult>): ClearanceResult => ({ parts: [], overlaps: [], touching: [], tight: [], fine: [], clearCount: 0, unchecked: [], tooFew: false, ...patch });
const cube = (id: string, patch: Partial<WorkplaneShape> = {}) => (
  { id, name: id, kind: "box", color: "#d97813", x: 0, z: 0, elevation: 0, rotation: 0, width: 10, depth: 10, size: 10, height: 10, locked: false, hidden: false, ...patch } as WorkplaneShape
);

describe("the clearance check", () => {
  it("starts at 0.3 mm, looks 5 mm far and keeps what it is given within its range", () => {
    expect(CLEARANCE_DEFAULT_THRESHOLD_MM).toBe(0.3);
    expect(CLEARANCE_SEARCH_MM).toBe(5);
    const defaults = normalizeClearanceOptions();
    expect(defaults).toMatchObject({ threshold: 0.3, splitParts: true, searchLength: 5 });
    expect(normalizeClearanceOptions({ threshold: 99, splitParts: false }).threshold).toBe(5);
    expect(normalizeClearanceOptions({ threshold: 0 }).threshold).toBe(0.01);
    expect(normalizeClearanceOptions({ threshold: Number.NaN }).threshold).toBe(0.3);
    expect(normalizeClearanceOptions({ splitParts: false }).splitParts).toBe(false);
  });

  it("calls a gap above or below one between layers, and one beside the other within a layer", () => {
    expect(clearanceDirection([0, 0, 0], [0, 0.4, 0])).toBe("layer");
    expect(clearanceDirection([0, 0, 0], [0.4, 0, 0])).toBe("side");
    expect(clearanceDirection([0, 0, 0], [0, 0, -0.4])).toBe("side");
    // Steeper than 45° from the plate: between layers; flatter: within one.
    expect(clearanceDirection([0, 0, 0], [0.3, 0.31, 0])).toBe("layer");
    expect(clearanceDirection([0, 0, 0], [0.31, 0.3, 0])).toBe("side");
    expect(clearanceDirection([1, 1, 1], [1, 1, 1])).toBe("side");
  });

  it("measures only pairs whose boxes come within the search length", () => {
    const a = box([0, 0, 0], [10, 10, 10]);
    expect(clearanceBoxesNear(a, box([14.9, 0, 0], [20, 10, 10]), 5)).toBe(true);
    expect(clearanceBoxesNear(a, box([15.1, 0, 0], [20, 10, 10]), 5)).toBe(false);
    // Apart along one axis is apart, however close the others are.
    expect(clearanceBoxesNear(a, box([0, 0, 16], [10, 10, 20]), 5)).toBe(false);
    expect(clearanceBoxesNear(a, box([5, 5, 5], [6, 6, 6]), 0)).toBe(true);
  });

  it("sorts a gap below the threshold as too tight, from it on as fine, and next to nothing as touching", () => {
    expect(classifyClearanceGap(0.2, 0.3)).toBe("tight");
    expect(classifyClearanceGap(0.3, 0.3)).toBe("fine");
    expect(classifyClearanceGap(CLEARANCE_TOUCH_MM / 2, 0.3)).toBe("touching");
  });

  it("lists overlaps largest first and gaps narrowest first", () => {
    const sorted = sortClearanceResult(result({
      overlaps: [{ a: "a", b: "b", volumeMm3: 2, center: [0, 0, 0], box: box([0, 0, 0], [1, 1, 1]), positions: [] }, { a: "c", b: "d", volumeMm3: 50, center: [0, 0, 0], box: box([0, 0, 0], [1, 1, 1]), positions: [] }],
      tight: [gap("a", "b", 0.25), gap("c", "d", 0.1)],
      fine: [gap("a", "c", 2), gap("b", "d", 0.5)],
    }));
    expect(sorted.overlaps.map((overlap) => overlap.volumeMm3)).toEqual([50, 2]);
    expect(sorted.tight.map((entry) => entry.gapMm)).toEqual([0.1, 0.25]);
    expect(sorted.fine.map((entry) => entry.gapMm)).toEqual([0.5, 2]);
  });

  it("moves gaps between too tight and fine when the threshold changes, without measuring again", () => {
    const found = result({ tight: [gap("a", "b", 0.2)], fine: [gap("b", "c", 0.35), gap("c", "d", 0.6)] });
    const stricter = reclassifyClearance(found, 0.4);
    expect(stricter.tight.map((entry) => entry.gapMm)).toEqual([0.2, 0.35]);
    expect(stricter.fine.map((entry) => entry.gapMm)).toEqual([0.6]);
    const looser = reclassifyClearance(found, 0.1);
    expect(looser.tight).toHaveLength(0);
    expect(looser.fine.map((entry) => entry.gapMm)).toEqual([0.2, 0.35, 0.6]);
  });

  it("names a separate part after its object, and an object checked whole by its own name", () => {
    expect(clearancePartName("Dragon", 3, (n) => `Part ${n}`)).toBe("Dragon · Part 3");
    expect(clearancePartName("Lid", null, (n) => `Part ${n}`)).toBe("Lid");
  });

  it("takes the bodies an export takes: visible, no holes, no reference images", () => {
    const shapes = [cube("a"), cube("hidden", { hidden: true }), cube("hole", { hole: true }), cube("image", { imagePlate: true } as Partial<WorkplaneShape>)];
    expect(clearanceSourceShapes(shapes).map((shape) => shape.id)).toEqual(["a"]);
  });

  it("finds nothing to check in fewer than two bodies", async () => {
    const none = await checkClearance([]);
    expect(none.tooFew).toBe(true);
    expect(none.parts).toHaveLength(0);
  });

  it("turns triangles of the scene into a mesh object standing where they are", () => {
    const shape = clearanceMeshShape("o", "Overlap", "#e5484d", [0, 2, 0, 4, 2, 0, 0, 6, 8])!;
    expect(shape).toMatchObject({ kind: "mesh", x: 2, elevation: 2, z: 4, width: 4, height: 4, depth: 8 });
    expect(shape.importedMesh?.triangleCount).toBe(1);
    expect(clearanceMeshShape("o", "Overlap", "#e5484d", [0, 0, 0])).toBeNull();
  });
});

describe("the clearance check's list and the place it shows", () => {
  const found = result({
    parts: [
      { key: "a", id: "a", name: "Box", part: null, box: box([0, 0, 0], [10, 10, 10]), triangles: 12 },
      { key: "f#1", id: "f", name: "Flexi · Part 1", part: 1, box: box([12, 0, 0], [20, 10, 10]), triangles: 40 },
      { key: "f#2", id: "f", name: "Flexi · Part 2", part: 2, box: box([20.2, 0, 0], [30, 10, 10]), triangles: 40 },
    ],
    overlaps: [{ a: "a", b: "f#1", volumeMm3: 12.5, center: [1, 2, 3], box: box([0, 0, 0], [2, 4, 6]), positions: [] }],
    touching: [{ a: "a", b: "f#2", point: null }],
    tight: [gap("f#1", "f#2", 0.2)],
    fine: [gap("a", "f#2", 1.5)],
    unchecked: [{ a: "f#1", b: "a", reason: "triangles" }],
  });

  it("lists overlaps, touching, too tight, fine and not checked in that order, with the parts' names", () => {
    const rows = clearanceRows(found, DEFAULT_WORKPLANE_WORKSPACE);
    expect(rows.map((row) => row.kind)).toEqual(["overlap", "touching", "tight", "fine", "unchecked"]);
    expect(rows[2]).toMatchObject({ a: "Flexi · Part 1", b: "Flexi · Part 2", key: clearancePairKey("f#1", "f#2") });
  });

  it("writes a gap in hundredths of a millimetre", () => {
    expect(formatClearanceLength(0.2, DEFAULT_WORKPLANE_WORKSPACE)).toMatch(/^0[.,]20 mm$/);
  });

  it("marks a gap between its two points, an overlap in its middle, and a touch where the boxes meet", () => {
    const tight = clearanceMarkFor(found, clearancePairKey("f#1", "f#2"), DEFAULT_WORKPLANE_WORKSPACE, 3)!;
    expect(tight).toMatchObject({ kind: "tight", a: [0, 0, 0], b: [0.2, 0, 0], request: 3 });
    const overlap = clearanceMarkFor(found, clearancePairKey("a", "f#1"), DEFAULT_WORKPLANE_WORKSPACE, 1)!;
    expect(overlap).toMatchObject({ kind: "overlap", a: [1, 2, 3], b: [1, 2, 3] });
    expect(overlap.label).toMatch(/12[.,]5 mm³/);
    // Box and Flexi part 2 have no point of contact: the middle of where their boxes overlap (an empty overlap here).
    const touch = clearanceMarkFor(found, clearancePairKey("a", "f#2"), DEFAULT_WORKPLANE_WORKSPACE, 1)!;
    expect(touch.kind).toBe("touching");
    expect(touch.a[1]).toBe(5);
    expect(clearanceMarkFor(found, "nothing", DEFAULT_WORKPLANE_WORKSPACE, 1)).toBeNull();
  });

  it("outlines the objects of a row once, also when both are parts of one", () => {
    expect(clearanceRowIds(found, clearancePairKey("f#1", "f#2"))).toEqual(["f"]);
    expect(clearanceRowIds(found, clearancePairKey("a", "f#2"))).toEqual(["a", "f"]);
  });

  it("frames at least 30 mm round a place, more round a larger overlap", () => {
    const small = clearanceFocusBox({ box: box([0, 0, 0], [0.3, 0, 0]) });
    expect(small.max.x - small.min.x).toBeCloseTo(30, 6);
    expect((small.max.x + small.min.x) / 2).toBeCloseTo(0.15, 6);
    const large = clearanceFocusBox({ box: box([0, 0, 0], [80, 1, 1]) });
    expect(large.max.x - large.min.x).toBeCloseTo(80, 6);
  });
});
