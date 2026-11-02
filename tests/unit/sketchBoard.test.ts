import { describe, expect, it } from "vitest";
import { sketchBoardSize, sketchFarthestReach, sketchMinZoom, sketchPointerReach } from "@/lib/sketchBoard";
import { clampNudge } from "@/lib/sketchSelection";

const workplane = { width: 250, depth: 200 };
const point = (id: string, x: number, z: number) => ({ id, x, z });

describe("the sketch plate grows with the sketch (#1177)", () => {
  it("stays the workplane while everything lies on it", () => {
    expect(sketchBoardSize(workplane, { points: [point("a", -100, 80), point("b", 100, -80)] }, 10)).toEqual(workplane);
  });

  it("grows in whole steps to hold a profile moved off the workplane, with room around it", () => {
    // A revolve profile far left of the axis, for a wide radius.
    const board = sketchBoardSize(workplane, { points: [point("a", -160, 10), point("b", -140, -30)] }, 10);
    expect(board.width / 2).toBeGreaterThanOrEqual(160 + 20);
    expect((board.width / 2) % 10).toBe(0);
    expect(board.depth).toBe(workplane.depth);
  });

  it("holds curve handles and turned pictures as well", () => {
    const board = sketchBoardSize(workplane, {
      points: [{ id: "a", x: 0, z: 0, handleOut: { x: 0, z: 150 } }],
      images: [{ id: "i", name: "", dataUrl: "", mimeType: "image/png", pixelWidth: 1, pixelHeight: 1, x: 120, z: 0, width: 40, depth: 30 }],
    }, 10);
    expect(board.depth / 2).toBeGreaterThanOrEqual(150);
    expect(board.width / 2).toBeGreaterThanOrEqual(120 + 25);
  });

  it("does not grow past ten workplanes for a stray far point", () => {
    expect(sketchBoardSize(workplane, { points: [point("a", 1e6, 0)] }, 10).width).toBe(workplane.width * 10);
  });

  it("lets the pointer reach a workplane past the plate, so a dragged profile is no longer pushed back", () => {
    const profile = { points: [point("a", -160, 0), point("b", -140, 0)] };
    const board = sketchBoardSize(workplane, profile, 10);
    const reach = sketchPointerReach(workplane, board);
    expect(reach.halfWidth).toBe(board.width / 2 + workplane.width / 2);
    // Moving the outside profile a little further left is taken as asked, not cut back to the workplane.
    expect(clampNudge(profile.points, -50, 0, reach.halfWidth, reach.halfDepth)).toEqual({ dx: -50, dz: 0 });
  });

  it("takes a typed position as far as the plate may grow", () => {
    const farthest = sketchFarthestReach(workplane);
    expect(clampNudge([point("a", -10, 0)], -290, 0, farthest.halfWidth, farthest.halfDepth)).toEqual({ dx: -290, dz: 0 });
  });

  it("zooms out further on a grown plate, so all of it fits, and as before on the workplane", () => {
    expect(sketchMinZoom(workplane, workplane, 0.75)).toBe(0.75);
    expect(sketchMinZoom(workplane, { width: 500, depth: 200 }, 0.75)).toBeCloseTo(0.375, 9);
  });
});
