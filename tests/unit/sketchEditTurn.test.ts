import { describe, expect, it } from "vitest";
import { sketchEditTurn, turnedSketchProfile } from "@/lib/sketchEditTurn";
import { imageAngleTo } from "@/lib/sketchImageTransform";
import type { SketchProfile } from "@/types/layerling";

// Forum, 621358: a sketch body turned 90° about the vertical opened in its own frame, not as it stood in 3D.
const degrees = 90;
const radians = (degrees * Math.PI) / 180;
// A turn about the vertical as three.js does it: x goes to (cos, -sin), z to (sin, cos) in the plate's x/z.
const turn = sketchEditTurn({ x: 12, z: -7 }, { x: Math.cos(radians), z: -Math.sin(radians) }, { x: Math.sin(radians), z: Math.cos(radians) });

const profile: SketchProfile = {
  points: [
    { id: "a", x: 0, z: 0, handleOut: { x: 2, z: 0 } },
    { id: "b", x: 10, z: 0, handleIn: { x: 8, z: 1 } },
    { id: "c", x: 10, z: 5 },
  ],
  segments: [
    { id: "ab", startId: "a", endId: "b", kind: "bezier" },
    { id: "bc", startId: "b", endId: "c" },
    { id: "ca", startId: "c", endId: "a" },
  ],
  images: [{ id: "img", name: "i", dataUrl: "", mimeType: "image/png", pixelWidth: 1, pixelHeight: 1, x: 5, z: 2, width: 4, depth: 2, rotation: 10 }],
  notes: [{ id: "n", text: "note", x: 3, z: 4 }],
};

describe("a sketch body turned about the vertical, edited on the plate", () => {
  it("is a plain turn, and a tilted or mirrored frame is not", () => {
    expect(turn).not.toBeNull();
    expect(sketchEditTurn({ x: 0, z: 0 }, { x: 1, z: 0 }, { x: 0, z: -1 })).toBeNull();
    expect(sketchEditTurn({ x: 0, z: 0 }, { x: 0.7, z: 0 }, { x: 0, z: 1 })).toBeNull();
  });

  it("puts the points where the body stands, turned and moved", () => {
    if (!turn) throw new Error("no turn");
    const plate = turnedSketchProfile(profile, turn, "toPlate");
    const b = plate.points[1];
    // Along the body's x, 10 mm: on the plate a quarter turn on, from the body's origin.
    expect(b.x).toBeCloseTo(12, 9);
    expect(b.z).toBeCloseTo(-17, 9);
    expect(plate.points[0].handleOut?.x).toBeCloseTo(12, 9);
    expect(plate.points[0].handleOut?.z).toBeCloseTo(-9, 9);
    expect(plate.notes?.[0].x).toBeCloseTo(12 + 4, 9);
    expect(plate.notes?.[0].z).toBeCloseTo(-7 - 3, 9);
  });

  it("turns a picture with the points, so it still lies along the same edge", () => {
    if (!turn) throw new Error("no turn");
    const plate = turnedSketchProfile(profile, turn, "toPlate");
    // The direction from a to b, measured as a picture's angle, turned by as much as the picture.
    const before = imageAngleTo(profile.points[0], profile.points[1]);
    const after = imageAngleTo(plate.points[0], plate.points[1]);
    const turnedBy = ((after - before) % 360 + 540) % 360 - 180;
    const image = plate.images?.[0];
    expect(image?.rotation).toBeCloseTo(10 + turnedBy, 9);
  });

  it("comes back as it was", () => {
    if (!turn) throw new Error("no turn");
    const back = turnedSketchProfile(turnedSketchProfile(profile, turn, "toPlate"), turn, "toBody");
    back.points.forEach((point, index) => {
      expect(point.x).toBeCloseTo(profile.points[index].x, 9);
      expect(point.z).toBeCloseTo(profile.points[index].z, 9);
    });
    expect(back.points[1].handleIn?.x).toBeCloseTo(8, 9);
    expect(back.images?.[0].rotation).toBeCloseTo(10, 9);
    expect(back.images?.[0].x).toBeCloseTo(5, 9);
    expect(back.notes?.[0].z).toBeCloseTo(4, 9);
    expect(back.segments).toEqual(profile.segments);
  });
});
