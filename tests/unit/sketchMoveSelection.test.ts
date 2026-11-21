import { describe, expect, it } from "vitest";
import { clampNudge, constrainToAxis, sketchSegmentDragPointIds, sketchSelectionMovePointIds } from "@/lib/sketchSelection";

const profile = {
  segments: [
    { id: "s1", startId: "a", endId: "b", kind: "line" as const },
    { id: "s2", startId: "b", endId: "c", kind: "line" as const },
    { id: "s3", startId: "c", endId: "d", kind: "line" as const },
  ],
};

describe("what moves with a sketch selection", () => {
  it("moves a point, or the two ends of a line", () => {
    expect(sketchSelectionMovePointIds(profile, { kind: "point", id: "c" })).toEqual(["c"]);
    expect(sketchSelectionMovePointIds(profile, { kind: "segment", id: "s2" })).toEqual(["b", "c"]);
    expect(sketchSelectionMovePointIds(profile, null)).toEqual([]);
    expect(sketchSelectionMovePointIds(profile, { kind: "image", id: "i" })).toEqual([]);
  });

  it("adds the ends of selected lines to the selected points, each once", () => {
    const ids = sketchSelectionMovePointIds(profile, { kind: "multiple", pointIds: ["a", "b"], segmentIds: ["s2", "s3"] });
    expect([...ids].sort()).toEqual(["a", "b", "c", "d"]);
  });

  it("leaves the far end of a line that leads out of the selected points where it is (Issue #1800)", () => {
    // A frame round b and c of the open chain a-b-c-d selects the two points and all three lines:
    // s1 and s3 each touch one of the points. Only b and c move; a and d were never selected.
    const framed = { kind: "multiple" as const, pointIds: ["b", "c"], segmentIds: ["s1", "s2", "s3"] };
    expect([...sketchSelectionMovePointIds(profile, framed)].sort()).toEqual(["b", "c"]);
    // A line picked on its own beside the points, with neither end among them, still moves by its two ends.
    const apart = { kind: "multiple" as const, pointIds: ["a"], segmentIds: ["s3"] };
    expect([...sketchSelectionMovePointIds(profile, apart)].sort()).toEqual(["a", "c", "d"]);
    // Lines alone move by their ends, as before.
    const lines = { kind: "multiple" as const, pointIds: [], segmentIds: ["s1", "s3"] };
    expect([...sketchSelectionMovePointIds(profile, lines)].sort()).toEqual(["a", "b", "c", "d"]);
  });

  it("takes a grabbed line along whole, also where it leads out of the selection", () => {
    const framed = { kind: "multiple" as const, pointIds: ["b", "c"], segmentIds: ["s1", "s2", "s3"] };
    expect([...sketchSegmentDragPointIds(profile, framed, "s2")].sort()).toEqual(["b", "c"]);
    expect([...sketchSegmentDragPointIds(profile, framed, "s1")].sort()).toEqual(["a", "b", "c"]);
  });

  it("drags a line by itself, or the whole selection when the line belongs to a larger one", () => {
    expect(sketchSegmentDragPointIds(profile, null, "s1")).toEqual(["a", "b"]);
    expect(sketchSegmentDragPointIds(profile, { kind: "segment", id: "s3" }, "s1")).toEqual(["a", "b"]);
    const selection = { kind: "multiple" as const, pointIds: ["a", "b", "c"], segmentIds: ["s1", "s2"] };
    expect([...sketchSegmentDragPointIds(profile, selection, "s2")].sort()).toEqual(["a", "b", "c"]);
  });
});

describe("moving along one axis", () => {
  it("keeps the move on the axis that is followed more", () => {
    expect(constrainToAxis({ x: 10, z: 10 }, { x: 30, z: 14 })).toEqual({ x: 30, z: 10 });
    expect(constrainToAxis({ x: 10, z: 10 }, { x: 13, z: -20 })).toEqual({ x: 10, z: -20 });
    expect(constrainToAxis({ x: 0, z: 0 }, { x: 5, z: 5 })).toEqual({ x: 5, z: 0 });
  });

  it("locks a new sketch line to horizontal or vertical from the previous point", () => {
    const origin = { x: 25, z: -40 };
    expect(constrainToAxis(origin, { x: 80, z: -35 })).toEqual({ x: 80, z: -40 });
    expect(constrainToAxis(origin, { x: 28, z: 10 })).toEqual({ x: 25, z: 10 });
  });
});

describe("clampNudge", () => {
  it("leaves a nudge alone while everything stays on the plate", () => {
    expect(clampNudge([{ x: 0, z: 0 }, { x: 10, z: 5 }], 1, -1, 100, 100)).toEqual({ dx: 1, dz: -1 });
  });

  it("stops at the edge of the plate", () => {
    expect(clampNudge([{ x: 98, z: 0 }], 5, 0, 100, 100)).toEqual({ dx: 2, dz: 0 });
    expect(clampNudge([{ x: 0, z: -99 }, { x: 0, z: 40 }], 0, -5, 100, 100)).toEqual({ dx: 0, dz: -1 });
  });
});
