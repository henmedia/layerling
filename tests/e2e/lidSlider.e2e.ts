import { describe, expect, it } from "vitest";
import Module from "manifold-3d";
import { lidForSolid, normalizeLidOptions } from "@/lib/lidTool";

type Solid = { delete?: () => void };
type Kernel = Awaited<ReturnType<typeof Module>>;
type Body = ReturnType<Kernel["Manifold"]["cube"]>;

const SCENE_TO_UP = [1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1];
const WIDTH = 80;
const DEPTH = 60;
const HEIGHT = 40;
const WALL = 2;

/**
 * Slide latches (Discussion #1587) put together again: the lid turned back over onto the box, the slider turned up from
 * its print into its rail where it locks, and moved along to where it opens.
 */
describe("slide latches", () => {
  it("hold the lid down when slid left, let it go when slid right, and keep the slider in its rail", async () => {
    const kernel = await Module();
    kernel.setup();
    const { Manifold } = kernel;
    const created: Solid[] = [];
    const keep = <T extends Solid>(value: T) => (created.push(value), value);
    try {
      // A box 80 x 60 x 40, z up, hollowed with its top open, its front at y = -30; then in the scene's frame.
      const outer = keep(keep(Manifold.cube([WIDTH, DEPTH, HEIGHT], true)).translate([0, 0, HEIGHT / 2]));
      const inner = keep(keep(Manifold.cube([WIDTH - 2 * WALL, DEPTH - 2 * WALL, HEIGHT], true)).translate([0, 0, WALL + HEIGHT / 2]));
      const box = keep(keep(outer.subtract(inner)).rotate([-90, 0, 0]));
      const options = normalizeLidOptions({ type: "plug", latches: 1, latchStyle: "slider" });
      const result = lidForSolid(kernel, box, options);
      if ("error" in result) throw new Error(JSON.stringify(result.error));
      expect(result.latch?.style).toBe("slider");
      expect(result.latch?.count).toBe(1);
      expect(result.latch?.labels).toHaveLength(1);
      const travel = result.latch!.travel!;
      expect(travel).toBeGreaterThanOrEqual(6);
      const up = (solid: Body) => keep(solid.transform(SCENE_TO_UP as never));
      const body = keep(up(box).add(up(result.latch!.body)));
      // The lid turned back over: its plate's top at the rim plus its thickness, its nose 4 mm in front of the front.
      const turned = keep(up(result.lid).rotate([180, 0, 0]));
      const lidBox = turned.boundingBox();
      const lid = keep(turned.translate([-WIDTH / 2 - lidBox.min[0], -DEPTH / 2 - 4 - lidBox.min[1], HEIGHT + options.thickness - lidBox.max[2]]));
      // The slider turned up from its print (face down) into the rail, where it locks.
      const g = options.sliderPlay;
      const zR1 = HEIGHT - 7 - g;
      const zR0 = zR1 - 9;
      const slider0 = keep(up(result.latch!.clips).rotate([-90, 0, 0]));
      const sliderBox = slider0.boundingBox();
      const slider = keep(slider0.translate([-options.sliderWidth / 2 + 0.01 - sliderBox.min[0], -DEPTH / 2 - 4 - g - 3 - sliderBox.min[1], (zR0 + zR1) / 2 - 1.8 - 1.8 - sliderBox.min[2]]));
      const overlap = (a: Body, b: Body) => {
        const both = a.intersect(b);
        const volume = both.volume();
        both.delete();
        return volume;
      };
      const lifted = (by: number) => keep(lid.translate([0, 0, by]));
      expect(overlap(slider, body)).toBeLessThan(0.01);
      expect(overlap(slider, lid)).toBeLessThan(0.01);
      expect(overlap(lid, body)).toBeLessThan(0.01);
      // Locked: the lid cannot come up 1 mm.
      expect(overlap(slider, lifted(1))).toBeGreaterThan(1);
      // Open: the slider still in its rail, and the lid comes off.
      const open = keep(slider.translate([travel, 0, 0]));
      expect(overlap(open, body)).toBeLessThan(0.01);
      expect(overlap(open, lifted(1))).toBeLessThan(0.01);
      expect(overlap(open, lifted(8))).toBeLessThan(0.01);
      // Further right it runs into the bump that keeps it in the rail.
      expect(overlap(keep(slider.translate([travel + 3, 0, 0])), body)).toBeGreaterThan(0.05);
      // Printed flat on its face: it lies on the plate.
      expect(result.latch!.clips.boundingBox().min[1]).toBeCloseTo(0, 3);
    } finally {
      created.forEach((value) => value.delete?.());
    }
  });

  it("make barrel bolts that print in place, hold the lid when slid into its keeper, and stay put in their notches", async () => {
    const kernel = await Module();
    kernel.setup();
    const { Manifold } = kernel;
    const created: Solid[] = [];
    const keep = <T extends Solid>(value: T) => (created.push(value), value);
    try {
      const outer = keep(keep(Manifold.cube([WIDTH, DEPTH, HEIGHT], true)).translate([0, 0, HEIGHT / 2]));
      const inner = keep(keep(Manifold.cube([WIDTH - 2 * WALL, DEPTH - 2 * WALL, HEIGHT], true)).translate([0, 0, WALL + HEIGHT / 2]));
      const box = keep(keep(outer.subtract(inner)).rotate([-90, 0, 0]));
      const options = normalizeLidOptions({ type: "plug", latches: 1, latchStyle: "bolt" });
      const result = lidForSolid(kernel, box, options);
      if ("error" in result) throw new Error(JSON.stringify(result.error));
      expect(result.latch?.style).toBe("bolt");
      expect(result.latch?.boltLabels).toHaveLength(1);
      const travel = result.latch!.travel!;
      const up = (solid: Body) => keep(solid.transform(SCENE_TO_UP as never));
      const body = keep(up(box).add(up(result.latch!.body)));
      const bolt = up(result.latch!.clips);
      // The tube's axis: as far in front of the wall as its radius less 0.4 mm, its radius under the rim.
      const rt = options.boltDiameter / 2 + options.boltPlay + 1.6;
      const ay = -DEPTH / 2 - (rt - 0.4);
      const zc = HEIGHT - options.boltPlay - rt;
      const turnedLid = keep(up(result.lid).rotate([180, 0, 0]));
      const lidBox = turnedLid.boundingBox();
      const lid = keep(turnedLid.translate([-WIDTH / 2 - lidBox.min[0], ay - rt - lidBox.min[1], HEIGHT + options.thickness - lidBox.max[2]]));
      const overlap = (a: Body, b: Body) => {
        const both = a.intersect(b);
        const volume = both.volume();
        both.delete();
        return volume;
      };
      const tipped = (solid: Body, degrees: number) => keep(keep(keep(solid.translate([0, -ay, -zc])).rotate([degrees, 0, 0])).translate([0, ay, zc]));
      const at = (dx: number) => keep(bolt.translate([dx, 0, 0]));
      // Printed in place: nothing touches.
      expect(overlap(bolt, body)).toBeLessThan(0.01);
      expect(overlap(bolt, lid)).toBeLessThan(0.01);
      // Open: the lid comes off.
      expect(overlap(bolt, keep(lid.translate([0, 0, 8])))).toBeLessThan(0.01);
      // Slid right into the keeper: it fits, and the lid cannot come up.
      expect(overlap(at(travel), body)).toBeLessThan(0.01);
      expect(overlap(at(travel), lid)).toBeLessThan(0.01);
      expect(overlap(at(travel), keep(lid.translate([0, 0, 1])))).toBeGreaterThan(1);
      // At either end the knob tips forward into its notch, and then the bolt cannot slide; half way it cannot tip.
      for (const dx of [0, travel]) expect(overlap(tipped(at(dx), 70), body)).toBeLessThan(0.01);
      expect(overlap(keep(tipped(at(travel), 70).translate([-2, 0, 0])), body)).toBeGreaterThan(0.05);
      expect(overlap(tipped(at(travel / 2), 70), body)).toBeGreaterThan(0.05);
    } finally {
      created.forEach((value) => value.delete?.());
    }
  });

  it("is refused with a stacking top", async () => {
    const kernel = await Module();
    kernel.setup();
    const box = kernel.Manifold.cube([60, 40, 30], true).translate([0, 0, 15]).subtract(kernel.Manifold.cube([56, 36, 30], true).translate([0, 0, 17])).rotate([-90, 0, 0]);
    const result = lidForSolid(kernel, box, normalizeLidOptions({ type: "plug", latches: 1, latchStyle: "slider", stackTop: true }));
    expect("error" in result && result.error.code).toBe("sliderStackTop");
  });
});
