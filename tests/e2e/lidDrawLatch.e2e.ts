import { describe, expect, it } from "vitest";
import Module from "manifold-3d";
import { lidForSolid, normalizeLidOptions } from "@/lib/lidTool";
import { DRAW_LATCH_PLAY, lidDrawLatchMeasures } from "@/lib/lidDrawLatch";

type Solid = { delete?: () => void };
type Kernel = Awaited<ReturnType<typeof Module>>;
type Body = ReturnType<Kernel["Manifold"]["cube"]>;

const SCENE_TO_UP = [1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1];
const WIDTH = 80;
const DEPTH = 60;
const HEIGHT = 40;
const WALL = 2;
const THICKNESS = 2;

/**
 * Draw latches (Discussion #2047) put together again: the box upright (z up, its front at y = -30), the latches' blocks
 * on it and the levers and links where they print; the push-in lid turned back over onto the rim; then a front lever
 * swung open about its pin, its link following with the hook on the lid's pin until it is slack.
 */
describe("draw latches on a lid", () => {
  const build = async (extra: Record<string, unknown>, height = HEIGHT) => {
    const kernel = await Module();
    kernel.setup();
    const { Manifold } = kernel;
    const created: Solid[] = [];
    const keep = <T extends Solid>(value: T) => (created.push(value), value);
    const outer = keep(keep(Manifold.cube([WIDTH, DEPTH, height], true)).translate([0, 0, height / 2]));
    const inner = keep(keep(Manifold.cube([WIDTH - 2 * WALL, DEPTH - 2 * WALL, height], true)).translate([0, 0, WALL + height / 2]));
    const box = keep(keep(outer.subtract(inner)).rotate([-90, 0, 0]));
    const options = normalizeLidOptions({ type: "plug", thickness: THICKNESS, latches: 2, latchStyle: "draw", ...extra });
    return { kernel, created, keep, box, options, result: lidForSolid(kernel, box, options) };
  };
  const overlap = (a: Body, b: Body) => {
    const both = a.intersect(b);
    const volume = both.volume();
    both.delete();
    return volume;
  };

  it("print levers and links in place on the box, clear of it and of each other, and draw the lid down over centre", async () => {
    const { kernel, created, keep, box, options, result } = await build({ latchBack: true });
    try {
      if ("error" in result) throw new Error(JSON.stringify(result.error));
      const latch = result.latch!;
      expect(latch.style).toBe("draw");
      expect(latch.count).toBe(4);
      expect(latch.clamp).toBe(0.2);
      const up = (solid: Body) => keep(solid.transform(SCENE_TO_UP as never));
      const body = keep(up(box).add(up(latch.body)));
      const parts = up(latch.clips!);
      // A lever and a link for each latch, each one piece with its rings closed: the lever's three holes (its pin, and
      // the slot above and below the cross pin), the link's one round the cross pin.
      const pieces = parts.decompose();
      pieces.forEach((piece) => created.push(piece));
      expect(pieces.length).toBe(8);
      expect(pieces.map((piece) => piece.genus()).sort()).toEqual([1, 1, 1, 1, 3, 3, 3, 3]);
      // As they print: clear of the box, its blocks and each other by the play.
      expect(overlap(parts, body)).toBe(0);
      expect(parts.minGap(body, 1)).toBeGreaterThan(DRAW_LATCH_PLAY - 0.01);
      for (let a = 0; a < pieces.length; a += 1) for (let b = a + 1; b < pieces.length; b += 1) expect(pieces[a].minGap(pieces[b], 1)).toBeGreaterThan(DRAW_LATCH_PLAY - 0.01);

      // The lid turned back over onto the rim, centred by its lip in the opening.
      const turned = up(result.lid).rotate([180, 0, 0]);
      const top = turned.boundingBox().max[2];
      const lip = keep(turned.intersect(keep(keep(kernel.Manifold.cube([1000, 1000, 2], true)).translate([0, 0, top - THICKNESS - 2]))));
      const lipBox = lip.boundingBox();
      const lid = keep(turned.translate([-(lipBox.min[0] + lipBox.max[0]) / 2, -(lipBox.min[1] + lipBox.max[1]) / 2, HEIGHT + THICKNESS - top]));
      expect(overlap(lid, body)).toBeLessThan(0.01);

      // The front latch on the left: the lever's pin along x, out from the front; the lid's pin above it.
      const m = lidDrawLatchMeasures(options.latchWidth, options.drawClamp);
      const zk = HEIGHT + THICKNESS - m.hookOutside;
      const [py, pz] = [-DEPTH / 2 - m.out, zk + m.pivot[1]];
      const [ky, kz] = [-DEPTH / 2 - m.out, zk];
      const front = pieces.filter((piece) => piece.boundingBox().max[1] < -DEPTH / 2 && piece.boundingBox().max[0] < 0);
      const lever = front.find((piece) => piece.genus() === 3)!;
      const link = front.find((piece) => piece.genus() === 1)!;
      // The lid's pin goes through the hook, which prints lower by the plays and the clamp: closing stretches it.
      expect(overlap(link, lid)).toBeGreaterThan(0.5);
      const plate = keep(lid.intersect(keep(kernel.Manifold.cube([WIDTH, DEPTH, 200], true))));
      const linkPoint = [-DEPTH / 2 - m.link[0], zk + m.link[1]];
      const hookPoint = [-DEPTH / 2 - m.hook[0], zk + m.hook[1]];
      const length = Math.hypot(hookPoint[0] - linkPoint[0], hookPoint[1] - linkPoint[1]);
      let tightest = { degrees: 0, reach: 0 };
      for (let degrees = 0; degrees <= 120; degrees += 10) {
        // Opened by `degrees`, its foot outward (towards -y).
        const turn = (-degrees * Math.PI) / 180;
        const swing = ([y, z]: number[]) => [py + (y - py) * Math.cos(turn) - (z - pz) * Math.sin(turn), pz + (y - py) * Math.sin(turn) + (z - pz) * Math.cos(turn)];
        const swung = keep(keep(keep(lever.translate([0, -py, -pz])).rotate([-degrees, 0, 0])).translate([0, py, pz]));
        expect(overlap(swung, body)).toBe(0);
        expect(overlap(swung, lid)).toBe(0);
        expect(swung.minGap(body, 1)).toBeGreaterThan(DRAW_LATCH_PLAY - 0.01);
        // The link on the swung cross pin, turned to point at the lid's pin, while it still reaches it.
        const cross = swing(linkPoint);
        const reach = Math.hypot(ky - cross[0], kz - cross[1]);
        if (reach > tightest.reach) tightest = { degrees, reach };
        if (reach < length) continue;
        const hook = swing(hookPoint);
        const aim = ((Math.atan2(kz - cross[1], ky - cross[0]) - Math.atan2(hook[1] - cross[1], hook[0] - cross[0])) * 180) / Math.PI;
        const carried = keep(keep(keep(link.translate([0, -py, -pz])).rotate([-degrees, 0, 0])).translate([0, py, pz]));
        const aimed = keep(keep(keep(carried.translate([0, -cross[0], -cross[1]])).rotate([aim, 0, 0])).translate([0, cross[0], cross[1]]));
        expect(overlap(aimed, body)).toBe(0);
        expect(overlap(aimed, plate)).toBe(0);
        expect(overlap(aimed, swung)).toBe(0);
      }
      // Tightest past where it is shut (dead centre, 20 degrees on), by more than the clamp it holds with.
      expect(tightest.degrees).toBe(20);
      const shut = Math.hypot(ky - linkPoint[0], kz - linkPoint[1]);
      expect(tightest.reach - shut).toBeGreaterThan(0.15);
    } finally {
      Array.from(new Set(created)).forEach((solid) => solid.delete?.());
    }
  });

  it("go opposite a hinge, on a flat lid too, and say why when they cannot be made", async () => {
    const hinged = await build({ hinge: true, latchBack: true, type: "flat" });
    try {
      if ("error" in hinged.result) throw new Error(JSON.stringify(hinged.result.error));
      expect(hinged.result.latch?.count).toBe(2);
      // At the front, opposite the hinge at the back: in the scene the front is +z.
      expect(hinged.result.latch!.body.boundingBox().min[2]).toBeGreaterThan(DEPTH / 2 - 1);
      for (const solid of [hinged.result.lid, hinged.result.latch!.body, hinged.result.latch!.clips!]) expect(solid.status()).toBe("NoError");
    } finally {
      hinged.created.forEach((solid) => solid.delete?.());
    }
    const low = await build({}, 18);
    try {
      expect("error" in low.result && low.result.error).toEqual({ code: "latchBodyLow", height: expect.any(Number) });
      if ("error" in low.result && low.result.error.code === "latchBodyLow") expect(low.result.error.height).toBeGreaterThan(18);
    } finally {
      low.created.forEach((solid) => solid.delete?.());
    }
    const crowded = await build({ latches: 4, latchWidth: 30 });
    try {
      expect("error" in crowded.result && crowded.result.error).toEqual({ code: "latchSideShort" });
    } finally {
      crowded.created.forEach((solid) => solid.delete?.());
    }
    const cap = await build({ type: "cap" });
    try {
      expect("error" in cap.result && cap.result.error).toEqual({ code: "latchLidType" });
    } finally {
      cap.created.forEach((solid) => solid.delete?.());
    }
  });
});
