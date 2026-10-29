import { describe, expect, it } from "vitest";
import { dragRotationDegrees, rotateSketchPoints, rotateSketchPointsAbout, selectedClosedSketchPoints, SKETCH_TURN_FREE_STEP, SKETCH_TURN_RING_STEP, SKETCH_TURN_SHIFT_STEP, sketchPointsPivot, sketchTurnRing, sketchTurnStep } from "@/lib/sketchRotation";
import type { SketchProfile } from "@/types/layerling";

const rectangle: SketchProfile = {
  points: [
    { id: "a", x: 0, z: 0, handleOut: { x: 1, z: 0 } },
    { id: "b", x: 4, z: 0 },
    { id: "c", x: 4, z: 2 },
    { id: "d", x: 0, z: 2 },
  ],
  segments: [
    { id: "ab", startId: "a", endId: "b" },
    { id: "bc", startId: "b", endId: "c" },
    { id: "cd", startId: "c", endId: "d" },
    { id: "da", startId: "d", endId: "a" },
  ],
};

describe("sketch rotation", () => {
  it("recognizes a complete closed sketch selection", () => {
    const points = selectedClosedSketchPoints(rectangle, {
      pointIds: ["a", "b", "c", "d"],
      segmentIds: ["ab", "bc", "cd", "da"],
    });
    expect(points?.map((point) => point.id)).toEqual(["a", "b", "c", "d"]);
  });

  it("rejects an open, partial, or image-inclusive selection", () => {
    expect(selectedClosedSketchPoints(rectangle, {
      pointIds: ["a", "b", "c", "d"],
      segmentIds: ["ab", "bc", "cd"],
    })).toBeNull();
    expect(selectedClosedSketchPoints(rectangle, {
      pointIds: ["a", "b", "c", "d"],
      segmentIds: ["ab", "bc", "cd", "da"],
      imageIds: ["reference-image"],
    })).toBeNull();
  });

  it("rotates points and bezier handles around the selection bounds center", () => {
    const rotated = rotateSketchPoints(rectangle.points, 90);
    const first = rotated.find((point) => point.id === "a");
    expect(first?.x).toBeCloseTo(3, 8);
    expect(first?.z).toBeCloseTo(-1, 8);
    expect(first?.handleOut?.x).toBeCloseTo(3, 8);
    expect(first?.handleOut?.z).toBeCloseTo(0, 8);
  });
});

describe("turning a selection by its handle (#330)", () => {
  it("turns points and curve handles about a pivot, the sketch's z running down the screen", () => {
    const turned = rotateSketchPointsAbout([{ id: "p", x: 10, z: 0, handleOut: { x: 12, z: 0 } }], { x: 0, z: 0 }, 90);
    expect(turned[0].x).toBeCloseTo(0, 9);
    expect(turned[0].z).toBeCloseTo(10, 9);
    expect(turned[0].handleOut?.x).toBeCloseTo(0, 9);
    expect(turned[0].handleOut?.z).toBeCloseTo(12, 9);
  });

  it("is what R does when the pivot is the middle of the box, and keeps the distances", () => {
    const points = rectangle.points;
    const viaPivot = rotateSketchPointsAbout(points, sketchPointsPivot(points), 45);
    const viaR = rotateSketchPoints(points, 45);
    viaPivot.forEach((point, index) => {
      expect(point.x).toBeCloseTo(viaR[index].x, 9);
      expect(point.z).toBeCloseTo(viaR[index].z, 9);
    });
    const [a, b] = [viaPivot[0], viaPivot[1]];
    expect(Math.hypot(b.x - a.x, b.z - a.z)).toBeCloseTo(4, 9);
  });

  it("reads the turn off the pointer's way round the pivot, snapped in steps with Shift", () => {
    const pivot = { x: 0, z: 0 };
    expect(dragRotationDegrees(pivot, { x: 10, z: 0 }, { x: 0, z: 10 })).toBeCloseTo(90, 9);
    expect(dragRotationDegrees(pivot, { x: 10, z: 0 }, { x: 10, z: 0 })).toBe(0);
    expect(dragRotationDegrees(pivot, { x: 10, z: 0 }, { x: 10, z: 3 }, 15)).toBe(15);
    expect(dragRotationDegrees(pivot, { x: 10, z: 1 }, { x: -10, z: -1 })).toBeCloseTo(180, 6);
    expect(dragRotationDegrees(pivot, { x: -10, z: 1 }, { x: -10, z: -1 })).toBeCloseTo(11.4, 0);
  });
});

// Forum, 621358: on a 1 mm grid an exact 90° was out of reach; the turn now snaps by a ring as in 3D.
describe("the step a turn in the sketch snaps to", () => {
  const pivot = { x: 3, z: -2 };
  const ring = sketchTurnRing(pivot, { x: 13, z: -2 });

  it("draws the ring a little inside the point where the handle was taken", () => {
    expect(ring).toBeCloseTo(7.5, 9);
  });

  it("snaps to 22.5° inside the ring, to whole degrees outside, to 15° with Shift", () => {
    expect(sketchTurnStep(pivot, ring, { x: 3, z: 3 }, false)).toBe(SKETCH_TURN_RING_STEP);
    expect(sketchTurnStep(pivot, ring, { x: 3, z: 12 }, false)).toBe(SKETCH_TURN_FREE_STEP);
    expect(sketchTurnStep(pivot, ring, { x: 3, z: 3 }, true)).toBe(SKETCH_TURN_SHIFT_STEP);
    expect(sketchTurnStep(pivot, ring, { x: 3, z: 12 }, true)).toBe(SKETCH_TURN_SHIFT_STEP);
  });

  it("lands on exactly 90° inside the ring from a pointer a little off", () => {
    const start = { x: 13, z: -2 };
    const near = { x: 3.4, z: 3 };
    expect(dragRotationDegrees(pivot, start, near, sketchTurnStep(pivot, ring, near, false))).toBe(90);
  });

  it("turns in whole degrees outside the ring, off the grid", () => {
    const start = { x: 13, z: -2 };
    const far = { x: 3 + 20 * Math.cos((37.3 * Math.PI) / 180), z: -2 + 20 * Math.sin((37.3 * Math.PI) / 180) };
    expect(dragRotationDegrees(pivot, start, far, sketchTurnStep(pivot, ring, far, false))).toBe(37);
  });
});
