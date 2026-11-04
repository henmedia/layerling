import { describe, expect, it } from "vitest";
import { handleAtOffset, handleOffset } from "@/lib/sketchBezierHandles";
import { SKETCH_MIRROR_VERTICAL, mirrorSketchSelection } from "@/lib/sketchMirror";
import type { SketchProfile } from "@/types/layerling";

// The X and Y fields of a clicked curve handle (Discussion #1250): where it lies from its own point, typed to set it.

const reach = { halfWidth: 100, halfDepth: 100 };

function curve(): SketchProfile {
  return {
    points: [
      { id: "a", x: 10, z: 0, mode: "corner", handleOut: { x: 14, z: -6 } },
      { id: "b", x: 30, z: -20, mode: "smooth", handleIn: { x: 24, z: -26 }, handleOut: { x: 36, z: -14 } },
    ],
    segments: [{ id: "s", startId: "a", endId: "b", kind: "bezier" }],
  };
}

describe("sketch handle fields (#1250)", () => {
  it("reads a handle from its own point", () => {
    const profile = curve();
    expect(handleOffset(profile, profile.points[0], "out")).toEqual({ x: 4, z: -6 });
    expect(handleOffset(profile, profile.points[1], "in")).toEqual({ x: -6, z: -6 });
    expect(handleOffset(profile, profile.points[0], "in")).toBeUndefined();
  });

  it("a handle lying on its point reads from where it is drawn, a third of the way to its neighbour", () => {
    const profile = curve();
    profile.points[1].handleIn = { x: 30, z: -20 };
    const offset = handleOffset(profile, profile.points[1], "in")!;
    expect(offset.x).toBeCloseTo(-20 / 3, 9);
    expect(offset.z).toBeCloseTo(20 / 3, 9);
  });

  it("a typed offset puts the handle there and reads back the same", () => {
    const profile = curve();
    const point = profile.points[0];
    const at = handleAtOffset(point, { x: 12.5, z: -3 }, reach);
    expect(at).toEqual({ x: 22.5, z: -3 });
    point.handleOut = at;
    expect(handleOffset(profile, point, "out")).toEqual({ x: 12.5, z: -3 });
  });

  it("keeps the handle on the plate", () => {
    expect(handleAtOffset({ x: 90, z: -90 }, { x: 50, z: -50 }, reach)).toEqual({ x: 100, z: -100 });
  });

  it("the mirrored handle reads the same Y and X with the opposite sign, as the guide says", () => {
    const profile = curve();
    let next = 0;
    const mirrored = mirrorSketchSelection(profile, { kind: "multiple", pointIds: ["a", "b"], segmentIds: ["s"] }, SKETCH_MIRROR_VERTICAL, (prefix) => `${prefix}-${(next += 1)}`)!;
    const original = profile.points[1];
    const copy = mirrored.profile.points.find((point) => point.x === -original.x && point.z === original.z)!;
    const before = handleOffset(profile, original, "in")!;
    const after = handleOffset(mirrored.profile, copy, "in")!;
    expect(after.x).toBeCloseTo(-before.x, 9);
    expect(after.z).toBeCloseTo(before.z, 9);
  });
});
