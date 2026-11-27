import { describe, expect, it } from "vitest";
import Module from "manifold-3d";
import { lidForSolid, normalizeLidOptions } from "@/lib/lidTool";
import { TURN_BUTTON_PLAY, lidTurnButtonMeasures } from "@/lib/lidTurnButton";

type Solid = { delete?: () => void };
type Kernel = Awaited<ReturnType<typeof Module>>;
type Body = ReturnType<Kernel["Manifold"]["cube"]>;

const SCENE_TO_UP = [1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1];
const WIDTH = 80;
const DEPTH = 60;
const HEIGHT = 40;
const THICKNESS = 2;

/**
 * Turn buttons (Discussion #2047) put together again: the box upright (z up, its front at y = -30) with its ledges and
 * the bars where they print, the push-in lid turned back over onto the rim; then a front bar turned about its pin.
 */
describe("turn buttons on a lid", () => {
  const build = async (extra: Record<string, unknown>, height = HEIGHT) => {
    const kernel = await Module();
    kernel.setup();
    const { Manifold } = kernel;
    const created: Solid[] = [];
    const keep = <T extends Solid>(value: T) => (created.push(value), value);
    const outer = keep(keep(Manifold.cube([WIDTH, DEPTH, height], true)).translate([0, 0, height / 2]));
    const inner = keep(keep(Manifold.cube([WIDTH - 4, DEPTH - 4, height], true)).translate([0, 0, 2 + height / 2]));
    const box = keep(keep(outer.subtract(inner)).rotate([-90, 0, 0]));
    const options = normalizeLidOptions({ type: "plug", thickness: THICKNESS, latches: 2, latchStyle: "turn", ...extra });
    return { kernel, created, keep, box, options, result: lidForSolid(kernel, box, options) };
  };
  const overlap = (a: Body, b: Body) => {
    const both = a.intersect(b);
    const volume = both.volume();
    both.delete();
    return volume;
  };

  it("print the bars on their pins clear of the box, turn them over the lid's edge to hold it and click every quarter turn", async () => {
    const { created, keep, box, options, result } = await build({ latchBack: true });
    try {
      if ("error" in result) throw new Error(JSON.stringify(result.error));
      const latch = result.latch!;
      expect(latch.style).toBe("turn");
      expect(latch.count).toBe(4);
      const up = (solid: Body) => keep(solid.transform(SCENE_TO_UP as never));
      const ledges = up(latch.body);
      const body = keep(up(box).add(ledges));
      const bars = up(latch.clips!);
      // One bar for each button, each with its hole round the pin, clear of the box and its ledge by the play.
      const pieces = bars.decompose();
      pieces.forEach((piece) => created.push(piece));
      expect(pieces.length).toBe(4);
      for (const piece of pieces) expect(piece.genus()).toBe(1);
      expect(overlap(bars, body)).toBe(0);
      expect(bars.minGap(body, 1)).toBeGreaterThan(TURN_BUTTON_PLAY - 0.01);

      // The lid turned back over onto the rim, centred as the box is: it touches neither the ledges nor the bars.
      const turned = up(result.lid).rotate([180, 0, 0]);
      const lidBox = turned.boundingBox();
      const lid = keep(turned.translate([-(lidBox.min[0] + lidBox.max[0]) / 2, -(lidBox.min[1] + lidBox.max[1]) / 2, HEIGHT + THICKNESS - lidBox.max[2]]));
      expect(overlap(lid, body)).toBeLessThan(0.01);
      expect(overlap(lid, bars)).toBe(0);
      expect(lid.minGap(bars, 1)).toBeGreaterThan(TURN_BUTTON_PLAY - 0.01);

      // A front bar turned about its pin, from along the wall to over the lid's edge and on.
      const m = lidTurnButtonMeasures(options.turnLength);
      const bar = pieces.find((piece) => piece.boundingBox().max[1] < -DEPTH / 2 && piece.boundingBox().max[0] < 0)!;
      const barBox = bar.boundingBox();
      const [px, py] = [(barBox.min[0] + barBox.max[0]) / 2, -DEPTH / 2 - m.out];
      const turnBy = (degrees: number) => keep(keep(keep(bar.translate([-px, -py, 0])).rotate([0, 0, degrees])).translate([px, py, 0]));
      for (const degrees of [-90, 0, 90, 180]) {
        // In each quarter the bump is in a groove: nothing touches.
        expect(overlap(turnBy(degrees), body)).toBe(0);
        expect(overlap(turnBy(degrees), lid)).toBe(0);
      }
      for (const degrees of [20, 45, 70]) {
        // Between them the bar rides over the bump, a little more than it can lift (the detent), and never on the lid.
        const between = overlap(turnBy(degrees), body);
        expect(between).toBeGreaterThan(0);
        expect(between).toBeLessThan(1);
        expect(overlap(turnBy(degrees), lid)).toBe(0);
      }
      // Turned over the lid, it holds it: lifted by the play and a little more, the lid runs into the bar; along the wall, not.
      const lifted = keep(lid.translate([0, 0, TURN_BUTTON_PLAY + 0.2]));
      expect(overlap(turnBy(90), lifted)).toBeGreaterThan(1);
      expect(overlap(turnBy(0), lifted)).toBe(0);
      // It reaches well over the lid's edge.
      expect(turnBy(90).boundingBox().max[1]).toBeGreaterThan(-DEPTH / 2 + m.length / 5);
    } finally {
      Array.from(new Set(created)).forEach((solid) => solid.delete?.());
    }
  });

  it("go opposite a hinge, on a flat lid too, and say why when they cannot be made", async () => {
    const hinged = await build({ hinge: true, latchBack: true, type: "flat" });
    try {
      if ("error" in hinged.result) throw new Error(JSON.stringify(hinged.result.error));
      expect(hinged.result.latch?.count).toBe(2);
      expect(hinged.result.latch!.body.boundingBox().min[2]).toBeGreaterThan(DEPTH / 2 - 1);
      for (const solid of [hinged.result.lid, hinged.result.latch!.body, hinged.result.latch!.clips!]) expect(solid.status()).toBe("NoError");
    } finally {
      hinged.created.forEach((solid) => solid.delete?.());
    }
    const low = await build({}, 10);
    try {
      expect("error" in low.result && low.result.error.code).toBe("latchBodyLow");
    } finally {
      low.created.forEach((solid) => solid.delete?.());
    }
    const crowded = await build({ latches: 4, turnLength: 40 });
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
