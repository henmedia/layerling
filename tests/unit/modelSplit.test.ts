import { describe, expect, it } from "vitest";
import { SPLIT_AXIS_DISPLAY_ORDER, modelSplitPlane, splitAxisFromLabel, splitAxisLabel, splitPlaneIntersectsPoints, snapSplitPositionToVertices, splitOrientationForNormal, splitPositionAlongWorkplane, splitRotationAxes, splitShapeFromWorldPositions } from "@/lib/modelSplit";
import type { WorkplaneShape } from "@/types/layerling";

const source: WorkplaneShape = {
  id: "source",
  name: "Source",
  kind: "box",
  color: "#d41721",
  x: 0,
  z: 0,
  elevation: 0,
  size: 10,
  width: 10,
  depth: 10,
  height: 10,
  rotation: 0,
};

describe("model split helpers", () => {
  it("centers and reorients the preview plane within model bounds", () => {
    const points: Array<[number, number, number]> = [[-4, 2, -6], [8, 12, 10]];
    const plane = modelSplitPlane(points, "y");
    expect(plane).toMatchObject({
      axis: "y",
      rotation: [0, 0],
      normal: [0, 1, 0],
      origin: [2, 7, 2],
      position: 7,
      min: 2,
      max: 12,
      size: Math.sqrt(500) * 1.1,
    });
    expect(plane?.preview.center).toEqual([2, 7, 2]);
    expect(plane?.preview.width).toBeCloseTo(16 * 1.1 + 4, 8);
    expect(plane?.preview.height).toBeCloseTo(12 * 1.1 + 4, 8);
    expect(modelSplitPlane(points, "x", 6)?.origin).toEqual([6, 7, 2]);
  });

  // Issue #1606: a flat grid 180 x 180 x 5 mm cut across X. The preview was a square of the whole diagonal (about
  // 280 mm) around the middle, so it stood 140 mm above and below the plate; now it fits the grid on the plane.
  it("draws the preview plane to fit the part on the plane", () => {
    const points: Array<[number, number, number]> = [[0, 0, 0], [180, 5, 180], [0, 5, 180], [180, 0, 0]];
    const plane = modelSplitPlane(points, "x", 40)!;
    const { center, u, v, width, height } = plane.preview;
    expect(center).toEqual([40, 2.5, 90]);
    // A standing plane is drawn upright: one side along the scene's up.
    expect(v).toEqual([0, 1, 0]);
    expect(Math.abs(u[2])).toBe(1);
    expect(width).toBeCloseTo(180 * 1.1 + 4, 8);
    // 5 mm tall, but kept at a tenth of the long side so it still reads as a plane.
    expect(height).toBeCloseTo(18, 8);
    expect(plane.size).toBeGreaterThan(250);
  });

  it("keeps the preview's axes on the plane, turned the right way, also when tilted", () => {
    const points: Array<[number, number, number]> = [];
    for (const x of [-20, 20]) for (const y of [0, 30]) for (const z of [-10, 10]) points.push([x, y, z]);
    for (const [axis, rotation] of [["x", [25, -40]], ["y", [30, 20]], ["z", [0, 90]], ["y", [0, 0]]] as const) {
      const plane = modelSplitPlane(points, axis, undefined, rotation)!;
      const { u, v } = plane.preview;
      const n = plane.normal;
      const dot = (a: readonly number[], b: readonly number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
      expect(dot(u, n)).toBeCloseTo(0, 9);
      expect(dot(v, n)).toBeCloseTo(0, 9);
      expect(dot(u, v)).toBeCloseTo(0, 9);
      // u x v = normal, so the viewport can build its turn from the three.
      const cross = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      cross.forEach((value, index) => expect(value).toBeCloseTo(n[index], 9));
      // Every corner of the part, laid onto the plane, lies inside the rectangle.
      for (const x of [-20, 20]) for (const y of [0, 30]) for (const z of [-10, 10]) {
        const relative = [x - plane.preview.center[0], y - plane.preview.center[1], z - plane.preview.center[2]];
        expect(Math.abs(dot(relative, u))).toBeLessThanOrEqual(plane.preview.width / 2);
        expect(Math.abs(dot(relative, v))).toBeLessThanOrEqual(plane.preview.height / 2);
      }
    }
  });

  it("rotates the plane normal and projection range for angled cuts", () => {
    const points: Array<[number, number, number]> = [[-4, 2, -6], [8, 12, 10]];
    const plane = modelSplitPlane(points, "y", undefined, [45, 0]);
    expect(plane?.rotation).toEqual([45, 0]);
    expect(plane?.normal[0]).toBe(0);
    expect(plane?.normal[1]).toBeCloseTo(Math.SQRT1_2, 8);
    expect(plane?.normal[2]).toBeCloseTo(Math.SQRT1_2, 8);
    expect(plane?.origin).toEqual([2, 7, 2]);
    expect(plane?.min).toBeCloseTo(-2 * Math.SQRT2, 8);
    expect(plane?.max).toBeCloseTo(11 * Math.SQRT2, 8);
  });

  it("turns the plane about the two axes it does not cut across", () => {
    const labels = (label: string) => splitRotationAxes(splitAxisFromLabel(label)!).map(splitAxisLabel);
    expect(labels("X")).toEqual(["Y", "Z"]);
    expect(labels("Y")).toEqual(["Z", "X"]);
    expect(labels("Z")).toEqual(["X", "Y"]);
  });

  it("tilts the plane about the second axis alone", () => {
    const points: Array<[number, number, number]> = [[-5, -5, -5], [5, 5, 5]];
    // An X cut turned 90 degrees about the vertical axis faces along the depth.
    expect(modelSplitPlane(points, "x", undefined, [0, 90])?.normal).toEqual([0, 0, -1]);
    const normal = modelSplitPlane(points, "y", undefined, [0, 30])?.normal;
    expect(normal?.[0]).toBeCloseTo(-0.5, 8);
    expect(normal?.[1]).toBeCloseTo(Math.sqrt(3) / 2, 8);
    expect(normal?.[2]).toBe(0);
  });

  it("combines both tilts, the first axis before the second", () => {
    const points: Array<[number, number, number]> = [[-5, -5, -5], [5, 5, 5]];
    const normal = modelSplitPlane(points, "x", undefined, [45, 45])?.normal ?? [];
    expect(normal[0]).toBeCloseTo(0.5, 8);
    expect(normal[1]).toBeCloseTo(Math.SQRT1_2, 8);
    expect(normal[2]).toBeCloseTo(-0.5, 8);
    expect(Math.hypot(...normal)).toBeCloseTo(1, 8);
  });

  it("lays the plane on a face square to the axes without turning it", () => {
    expect(splitOrientationForNormal([0, 1, 0])).toEqual({ axis: "y", rotation: [0, 0] });
    expect(splitOrientationForNormal([0, -1, 0])).toEqual({ axis: "y", rotation: [0, 0] });
    expect(splitOrientationForNormal([-1, 0, 0])).toEqual({ axis: "x", rotation: [0, 0] });
    expect(splitOrientationForNormal([0, 0, 2])).toEqual({ axis: "z", rotation: [0, 0] });
    expect(splitOrientationForNormal([0, 0, 0])).toBeNull();
  });

  it("finds the turns that lay the plane on a slanted face", () => {
    const points: Array<[number, number, number]> = [[-4, 2, -6], [8, 12, 10]];
    const faces: Array<[number, number, number]> = [
      [0.3, 0.8, -0.2], [-0.9, 0.2, 0.4], [0.1, -0.5, 0.85], [0.6, 0.6, 0.53], [-0.4, -0.7, -0.6],
    ];
    for (const face of faces) {
      const orientation = splitOrientationForNormal(face);
      expect(orientation).not.toBeNull();
      const plane = modelSplitPlane(points, orientation!.axis, undefined, orientation!.rotation);
      const length = Math.hypot(...face);
      const alignment = plane!.normal.reduce((sum, value, index) => sum + value * face[index] / length, 0);
      expect(Math.abs(alignment)).toBeCloseTo(1, 6);
      orientation!.rotation.forEach((angle) => expect(Math.abs(angle)).toBeLessThanOrEqual(90));
    }
  });

  it("keeps an odd face angle exact and rounds only float noise", () => {
    const angle = Math.atan2(1, 3);
    const odd = splitOrientationForNormal([Math.sin(angle), Math.cos(angle), 0]);
    expect(odd?.axis).toBe("y");
    const [tilt, other] = [...odd!.rotation].map(Math.abs).sort((a, b) => b - a);
    expect(Math.abs(tilt - angle * 180 / Math.PI)).toBeLessThan(1e-12);
    expect(other).toBe(0);
    const thirty = 30 * Math.PI / 180;
    const noisy = splitOrientationForNormal([Math.sin(thirty) + 1e-13, Math.cos(thirty), 0]);
    expect(noisy?.rotation.map(Math.abs)).toContain(30);
  });

  it("snaps a picked position onto a vertex just beside it", () => {
    const points: Array<[number, number, number]> = [[0, 0, 0], [0, 10, 0], [5, 20, 0]];
    expect(snapSplitPositionToVertices(points, [0, 1, 0], 10 - 3e-7)).toBe(10);
    expect(snapSplitPositionToVertices(points, [0, 1, 0], 10.4)).toBe(10.4);
  });

  it("aligns through the workplane's origin, but across the base plate through the parts' middle (#1590)", () => {
    // A tube standing from x 20 to 60, away from the middle of the plate.
    const points: Array<[number, number, number]> = [[20, 0, -20], [60, 30, 20]];
    const across = modelSplitPlane(points, "x")!;
    expect(across.position).toBe(40);
    // Across the base plate the origin (x 0) only marks the plate's middle: the plane goes through the tube's middle.
    expect(splitPositionAlongWorkplane(points, across, [0, 0, 0], false)).toBe(40);
    expect(splitPositionAlongWorkplane(points, across, [25, 0, 0], false)).toBe(40);
    // A workplane laid on the part cuts through its origin where that crosses the part, snapped onto a vertex...
    expect(splitPositionAlongWorkplane(points, across, [25, 30, 0], true)).toBe(25);
    const withStep: Array<[number, number, number]> = [...points, [32, 10, 0]];
    expect(splitPositionAlongWorkplane(withStep, across, [32 - 3e-4, 30, 0], true)).toBe(32);
    // ...and through the middle where it misses the part.
    expect(splitPositionAlongWorkplane(points, across, [80, 30, 0], true)).toBe(40);
  });

  it("only reports a cut when vertices exist on both sides", () => {
    const points: Array<[number, number, number]> = [[-5, 0, 0], [5, 0, 0]];
    expect(splitPlaneIntersectsPoints(points, [1, 0, 0], 0)).toBe(true);
    expect(splitPlaneIntersectsPoints(points, [1, 0, 0], -5)).toBe(false);
    expect(splitPlaneIntersectsPoints(points, [1, 0, 0], 8)).toBe(false);
  });

  it("normalizes world-space split triangles into an editable mesh shape", () => {
    const part = splitShapeFromWorldPositions(source, [
      4, 3, -2,
      8, 3, -2,
      4, 9, 6,
    ], "part-a", "Source A");
    expect(part).toMatchObject({
      id: "part-a",
      name: "Source A",
      kind: "mesh",
      x: 6,
      z: 2,
      elevation: 3,
      width: 4,
      depth: 8,
      height: 6,
    });
    expect(part?.importedMesh?.positions).toEqual([-2, 0, -4, 2, 0, -4, -2, 6, 4]);
  });

  it("keeps a split hole a hole", () => {
    const triangle = [0, 0, 0, 4, 0, 0, 0, 4, 4];
    expect(splitShapeFromWorldPositions({ ...source, hole: true }, triangle, "part", "Hole A")?.hole).toBe(true);
    expect(splitShapeFromWorldPositions(source, triangle, "part", "Solid A")?.hole).toBeUndefined();
  });

  it("names the axes as the Position card does, with Z up", () => {
    expect(SPLIT_AXIS_DISPLAY_ORDER.map(splitAxisLabel)).toEqual(["X", "Y", "Z"]);
    expect(splitAxisLabel("y")).toBe("Z");
    expect(splitAxisLabel("z")).toBe("Y");
    expect(["x", "y", "z", "Z", "w"].map(splitAxisFromLabel)).toEqual(["x", "z", "y", "y", null]);
  });
});
