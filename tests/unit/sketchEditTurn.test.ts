import { describe, expect, it } from "vitest";
import { sketchEditTurn, sketchEditTurnOnPlate, turnedSketchProfile } from "@/lib/sketchEditTurn";
import { plateCenterX, plateIndexAt } from "@/lib/buildPlates";
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

// Discussion #1887: a sketch body on plate 2 opened on the first plate's plane; the sketch view showed plate 1 with the
// bodies there, and the body's own outline lay a plate further to the right, out of reach.
describe("a sketch body on a further build plate, edited on that plate", () => {
  const workspace = { width: 200, depth: 200, plates: ["", ""] };
  // The body stands on plate 2, unturned, its sketch's origin 30 mm right of that plate's middle.
  const bodyOrigin = { x: plateCenterX(workspace, 1) + 30, z: -7 };
  const plain = sketchEditTurn(bodyOrigin, { x: 1, z: 0 }, { x: 0, z: 1 });

  it("counts the drawing from the middle of the body's plate, so it lies on the plate that is shown", () => {
    const plateX = plateCenterX(workspace, plateIndexAt(workspace, bodyOrigin.x));
    expect(plateX).toBe(220);
    const onPlate = sketchEditTurnOnPlate(plain, plateX);
    if (!onPlate) throw new Error("no turn");
    const drawn = turnedSketchProfile(profile, onPlate, "toPlate");
    // Within the plate's own half width, where before it lay 220 mm further on.
    drawn.points.forEach((point) => expect(Math.abs(point.x)).toBeLessThanOrEqual(workspace.width / 2));
    expect(drawn.points[1].x).toBeCloseTo(40, 9);
    // On the plate's plane moved to its middle, that is where the body stands in the scene.
    expect(plateX + drawn.points[1].x).toBeCloseTo(bodyOrigin.x + 10, 9);
    expect(drawn.points[1].z).toBeCloseTo(-7, 9);
  });

  it("comes back as it was drawn, and leaves a body on the first plate alone", () => {
    const onPlate = sketchEditTurnOnPlate(plain, 220);
    if (!onPlate) throw new Error("no turn");
    const back = turnedSketchProfile(turnedSketchProfile(profile, onPlate, "toPlate"), onPlate, "toBody");
    back.points.forEach((point, index) => {
      expect(point.x).toBeCloseTo(profile.points[index].x, 9);
      expect(point.z).toBeCloseTo(profile.points[index].z, 9);
    });
    expect(sketchEditTurnOnPlate(plain, 0)).toBe(plain);
    expect(sketchEditTurnOnPlate(null, 220)).toBeNull();
  });
});
