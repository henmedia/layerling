import { describe, expect, it } from "vitest";
import { holePatternCenters, normalizeHolePattern, rectangleOutline } from "@/lib/holePattern";
import { HOLE_OVERSHOOT, holePatternCustomFootprint, holePatternShapes, type PerforableFace } from "@/lib/holePatternShapes";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * An own shape (#1235): the hole pattern repeats a shape from the scene in place of a hole - rivets on a plate, the
 * treads of a diamond plate. Its width and depth are its room on the face; a body stands on the face and joins it, a
 * hole is cut in by its own height; the shape itself is copied, not moved.
 */

const asset = (kind: string) => toolbarShapeAssets.find((entry) => entry.kind === kind)!;
const rivet = (patch: Partial<WorkplaneShape> = {}): WorkplaneShape => ({
  ...makeShapeFromAsset({ ...asset("cylinder"), name: "Rivet" }, { x: 200, z: 0, elevation: 0 }, { width: 4, depth: 4, height: 2 }),
  width: 4,
  depth: 4,
  height: 2,
  rotation: 30,
  ...patch,
});
// The top of a 10 mm plate, 100 x 60, at y = 10.
const face: PerforableFace = {
  workplane: { origin: { x: 0, y: 10, z: 0 }, normal: { x: 0, y: 1, z: 0 }, xAxis: { x: 1, y: 0, z: 0 }, zAxis: { x: 0, y: 0, z: 1 } } as PerforableFace["workplane"],
  outline: rectangleOutline(-50, -30, 50, 30),
  thickness: 10,
};
const settingsFor = (shape: WorkplaneShape, patch = {}) => normalizeHolePattern({ form: "custom", arrangement: "grid", spacing: 10, margin: 2, ...holePatternCustomFootprint(shape), ...patch });

describe("an own shape repeated over a face", () => {
  it("takes the shape's width and depth as its room, round for a cylinder", () => {
    expect(holePatternCustomFootprint(rivet())).toMatchObject({ customWidth: 4, customDepth: 4, customRound: true });
    const block = { ...makeShapeFromAsset(asset("box"), { x: 0, z: 0 }, { width: 8, depth: 3, height: 1 }), width: 8, depth: 3, height: 1 };
    expect(holePatternCustomFootprint(block)).toMatchObject({ customWidth: 8, customDepth: 3, customRound: false });
    // 8 mm wide copies 10 mm apart in a 96 mm row that keeps 2 mm from the edge: nine fit along, as for an 8 x 3 hole.
    const along = holePatternCenters(rectangleOutline(-50, -30, 50, 30), settingsFor(block)).centers;
    expect(new Set(along.map((center) => center.v.toFixed(3))).size).toBeGreaterThan(1);
    expect(along.filter((center) => Math.abs(center.v - along[0].v) < 1e-6)).toHaveLength(9);
  });

  it("stands every copy of a body on the face, a little sunk in so it joins, upright and with fresh ids", () => {
    const source = rivet();
    const { holes } = holePatternShapes(face, settingsFor(source), "Hole", undefined, source);
    expect(holes.length).toBeGreaterThan(10);
    for (const piece of holes) {
      expect(piece.kind).toBe("cylinder");
      expect(Boolean(piece.hole)).toBe(false);
      expect(piece.elevation).toBeCloseTo(10 - HOLE_OVERSHOOT);
      expect(piece.height).toBe(2);
      expect(piece.rotation ?? 0).toBeCloseTo(0);
      expect(piece.id).not.toBe(source.id);
      expect(piece.name).toMatch(/^Rivet \d+$/);
    }
    expect(new Set(holes.map((piece) => piece.id)).size).toBe(holes.length);
  });

  it("cuts a hole shape in by its own height", () => {
    const source = rivet({ hole: true, height: 3 });
    const { holes } = holePatternShapes(face, settingsFor(source), "Hole", undefined, source);
    expect(holes.length).toBeGreaterThan(0);
    expect(holes.every((piece) => piece.hole)).toBe(true);
    expect(holes[0].elevation).toBeCloseTo(10 + HOLE_OVERSHOOT - 3);
  });

  it("copies a group with its parts, each under a fresh id", () => {
    const part = rivet();
    const group: WorkplaneShape = { ...rivet(), id: "group-1", kind: "group", groupedShapes: [part] } as WorkplaneShape;
    const { holes } = holePatternShapes(face, settingsFor(group, { arrangement: "perimeter", perimeterBy: "count", perimeterCount: 4 }), "Hole", undefined, group);
    const childIds = holes.flatMap((piece) => piece.groupedShapes?.map((child) => child.id) ?? []);
    expect(childIds.length).toBe(holes.length);
    expect(childIds).not.toContain(part.id);
    expect(new Set(childIds).size).toBe(childIds.length);
  });

  it("keeps the ids of a preview from one call to the next", () => {
    const source = rivet();
    const first = holePatternShapes(face, settingsFor(source), "Hole", "preview", source).holes.map((piece) => piece.id);
    const second = holePatternShapes(face, settingsFor(source), "Hole", "preview", source).holes.map((piece) => piece.id);
    expect(second).toEqual(first);
  });

  it("makes nothing without the shape", () => {
    expect(holePatternShapes(face, settingsFor(rivet()), "Hole", undefined, null).holes).toEqual([]);
  });
});
