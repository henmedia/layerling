import { describe, expect, it } from "vitest";
import { SKETCH_ROTATE_HIT_WIDTH, sketchRotateArrow } from "@/components/SketchHandles";
import { rotateHandleSpots } from "@/lib/sketchHandleSpots";

// As SketchWorkspace draws them, in screen pixels: the arrows stand 22px beyond a corner, the corner squares are 12px.
const GAP = 22;
const SQUARE = 12;

function pointsOf(d: string) {
  return [...d.matchAll(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)].map((match) => ({ x: Number(match[1]), z: Number(match[2]) }));
}

/** How far a point lies outside an axis-aligned square of side `size` about `centre`. */
function distanceToSquare(point: { x: number; z: number }, centre: { x: number; z: number }, size: number) {
  const dx = Math.max(0, Math.abs(point.x - centre.x) - size / 2);
  const dz = Math.max(0, Math.abs(point.z - centre.z) - size / 2);
  return Math.hypot(dx, dz);
}

describe("sketch rotate handle grab area (forum, 621826)", () => {
  const corners = [{ x: -50, z: -50 }, { x: 50, z: -50 }, { x: 50, z: 50 }, { x: -50, z: 50 }];
  const spots = rotateHandleSpots(corners, { x: 0, z: 0 }, GAP);

  it("leaves every corner square free to scale", () => {
    for (const spot of spots) {
      const arrow = sketchRotateArrow(spot.outward);
      const corner = corners[spot.corner];
      const band = pointsOf(`${arrow.arc} ${arrow.heads}`).map((point) => ({ x: spot.x + point.x, z: spot.z + point.z }));
      const nearest = Math.min(...band.map((point) => distanceToSquare(point, corner, SQUARE)));
      expect(nearest).toBeGreaterThan(SKETCH_ROTATE_HIT_WIDTH / 2);
    }
  });

  it("the old 40px square reached over the corner square", () => {
    const spot = spots[0];
    const corner = corners[spot.corner];
    // Its inner corner, 20px back towards the shape on both axes.
    const reach = { x: spot.x - 20 * Math.sign(spot.outward.x), z: spot.z - 20 * Math.sign(spot.outward.z) };
    expect(distanceToSquare(reach, corner, SQUARE)).toBe(0);
  });
});
