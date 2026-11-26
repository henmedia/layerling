import { describe, expect, it } from "vitest";
import Module from "manifold-3d";
import { lidForSolid, lidSnapHookArm, normalizeLidOptions } from "@/lib/lidTool";

type Solid = { delete?: () => void };
type Kernel = Awaited<ReturnType<typeof Module>>;
type Body = ReturnType<Kernel["Manifold"]["cube"]>;

const SCENE_TO_UP = [1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1];
const WIDTH = 80;
const DEPTH = 60;
const HEIGHT = 40;
const WALL = 2;

/**
 * Snap hooks (Discussion #2047) put together again: the lid turned back over onto the box, where its hooks hang in front
 * of the wall with their barbs under the catches, clear of them; lifted, the barbs run into the catches.
 */
describe("snap hooks on a lid", () => {
  const build = async (extra: Record<string, unknown>, height = HEIGHT) => {
    const kernel = await Module();
    kernel.setup();
    const { Manifold } = kernel;
    const created: Solid[] = [];
    const keep = <T extends Solid>(value: T) => (created.push(value), value);
    // A box 80 x 60, z up, hollowed with its top open, its front at y = -30; then in the scene's frame.
    const outer = keep(keep(Manifold.cube([WIDTH, DEPTH, height], true)).translate([0, 0, height / 2]));
    const inner = keep(keep(Manifold.cube([WIDTH - 2 * WALL, DEPTH - 2 * WALL, height], true)).translate([0, 0, WALL + height / 2]));
    const box = keep(keep(outer.subtract(inner)).rotate([-90, 0, 0]));
    const options = normalizeLidOptions({ type: "plug", latches: 2, latchStyle: "snap", ...extra });
    return { kernel, created, keep, box, options, result: lidForSolid(kernel, box, options) };
  };

  it("click under the catches on the body, print with the lid and leave nothing loose", async () => {
    const { created, keep, box, options, result } = await build({ latchBack: true });
    try {
      if ("error" in result) throw new Error(JSON.stringify(result.error));
      expect(result.latch?.style).toBe("snap");
      expect(result.latch?.count).toBe(4);
      expect(result.latch?.clips).toBeUndefined();
      expect(result.latch?.arm).toBe(lidSnapHookArm(options.snapUndercut));
      const up = (solid: Body) => keep(solid.transform(SCENE_TO_UP as never));
      const catches = up(result.latch!.body);
      const body = keep(up(box).add(catches));
      // The catches stand out of the front and back walls, below the rim.
      const catchBox = catches.boundingBox();
      expect(catchBox.min[1]).toBeCloseTo(-DEPTH / 2 - options.snapUndercut, 3);
      expect(catchBox.max[1]).toBeCloseTo(DEPTH / 2 + options.snapUndercut, 3);
      expect(catchBox.max[2]).toBeLessThan(HEIGHT - 2);
      // The lid turned back over onto the rim: its plate's top at the rim plus its thickness, centred as the box is.
      const turned = keep(up(result.lid).rotate([180, 0, 0]));
      const lidBox = turned.boundingBox();
      const lid = keep(turned.translate([-(lidBox.min[0] + lidBox.max[0]) / 2, -(lidBox.min[1] + lidBox.max[1]) / 2, HEIGHT + options.thickness - lidBox.max[2]]));
      // The hooks hang in front of the front and back walls, below the catches.
      const placed = lid.boundingBox();
      expect(placed.min[2]).toBeLessThan(catchBox.min[2]);
      expect(placed.min[1]).toBeLessThan(-DEPTH / 2 - options.snapUndercut);
      const overlap = (a: Body, b: Body) => {
        const both = a.intersect(b);
        const volume = both.volume();
        both.delete();
        return volume;
      };
      // Closed, the lid and its hooks are clear of the body; lifted by a millimetre, the barbs run into the catches.
      expect(overlap(lid, body)).toBeLessThan(0.01);
      expect(overlap(keep(lid.translate([0, 0, 1])), body)).toBeGreaterThan(1);
    } finally {
      created.forEach((solid) => solid.delete?.());
    }
  });

  it("ask for a taller box when the arm does not fit below the rim", async () => {
    const { created, result } = await build({ snapUndercut: 2.5 }, 15);
    try {
      expect("error" in result && result.error.code).toBe("latchBodyLow");
    } finally {
      created.forEach((solid) => solid.delete?.());
    }
  });
});
