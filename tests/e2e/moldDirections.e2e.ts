import { describe, expect, it } from "vitest";
import Module from "manifold-3d";
import { MOLD_DEFAULTS, moldForSolid, moldUndercutLevel, normalizeMoldOptions, type MoldOptions } from "@/lib/moldTool";

/*
 * The test bodies of the mold tool's opening directions, undercut and air checks (Konstruktionsanweisung Gussform,
 * section 7), built z up and handed over in the scene's frame (y up).
 */

type Solid = { delete?: () => void };
const kernelPromise = (async () => {
  const manifold = await Module();
  manifold.setup();
  return manifold;
})();
type Kernel = Awaited<typeof kernelPromise>;
type Body = ReturnType<Kernel["Manifold"]["cube"]>;

async function withKernel<T>(run: (kernel: Kernel, keep: <S extends Solid>(value: S) => S) => T) {
  const kernel = await kernelPromise;
  const created: Solid[] = [];
  const keep = <S extends Solid>(value: S) => (created.push(value), value);
  try {
    return run(kernel, keep);
  } finally {
    created.forEach((value) => value.delete?.());
  }
}

function scene(body: Body, keep: <S extends Solid>(value: S) => S) {
  return keep(body.rotate([-90, 0, 0]));
}

function mold(kernel: Kernel, body: Body, options: Partial<MoldOptions>, layout = false, keep?: <S extends Solid>(value: S) => S) {
  const result = moldForSolid(kernel, body as never, normalizeMoldOptions({ ...MOLD_DEFAULTS, shrinkage: 0, ...options }), layout);
  if ("error" in result) throw new Error(`${result.error} ${result.message ?? ""}`);
  result.parts.forEach((part) => keep?.(part.solid));
  return result;
}

function overlap(a: Body, b: Body) {
  const both = a.intersect(b);
  const volume = both.volume();
  both.delete();
  return volume;
}

describe("mold opening directions and checks", () => {
  it("gives each of six separate masters a sprue of its own, so every cavity fills", async () => {
    await withKernel((kernel, keep) => {
      // Six blocks 12 x 12 x 10 mm in two rows of three, 6 mm apart, as in a tray of soap bars.
      const blocks = [0, 1, 2].flatMap((col) => [0, 1].map((row) => keep(kernel.Manifold.cube([12, 12, 10]).translate([col * 18, row * 18, 0]))));
      const body = scene(keep(kernel.Manifold.union(blocks)), keep);
      const result = mold(kernel, body, { kind: "twoPart", direction: "z", keys: false, vents: true }, false, keep);
      expect(result.sprues).toBe(6);
      const sprues = result.analysis!.highPoints.filter((point) => point.sprue);
      expect(sprues).toHaveLength(6);
      // Every block's top has its sprue over it (scene frame: x across, z along the depth), none shared.
      const spots = new Set(sprues.map(({ point }) => `${Math.floor(point[0] / 18)},${Math.floor(-point[2] / 18)}`));
      expect(spots.size).toBe(6);
      // The upper half has a channel through it into each cavity: six holes through it at least.
      const upper = result.parts[1].solid as unknown as Body;
      expect(upper.genus()).toBeGreaterThanOrEqual(6);
    });
  });

  it("keeps one sprue for a single master", async () => {
    await withKernel((kernel, keep) => {
      const body = scene(keep(kernel.Manifold.cube([20, 20, 10])), keep);
      const result = mold(kernel, body, { kind: "twoPart", direction: "z" }, false, keep);
      expect(result.sprues).toBe(1);
    });
  });

  it("rates a ball parted in the middle free of undercut in every direction", async () => {
    await withKernel((kernel, keep) => {
      const ball = scene(keep(kernel.Manifold.sphere(12, 96).translate([0, 0, 12])), keep);
      const result = mold(kernel, ball, { kind: "twoPart" }, false, keep);
      const analysis = result.analysis!;
      expect(analysis.ratings).toHaveLength(3);
      for (const rating of analysis.ratings) {
        expect(rating.undercutPercent).toBeLessThan(0.1);
        expect(rating.parting).toBeCloseTo(50, 0);
      }
      expect(result.warnings).not.toContain("undercut");
      // One sprue at the top, no other vent needed.
      expect(result.vents).toBe(0);
      expect(analysis.findings.filter((finding) => finding.kind === "airTrap")).toEqual([]);
      // The halves are closed bodies and stay out of each other and of the master.
      const [a, b] = result.parts.map((part) => part.solid);
      expect(a.status()).toBe("NoError");
      expect(b.status()).toBe("NoError");
      expect(overlap(a, b)).toBeLessThan(0.01);
      expect(overlap(a, ball)).toBeLessThan(0.01);
      // The cavity is the ball's volume within 1 %.
      expect(Math.abs(result.volume - ball.volume() / 1000) / (ball.volume() / 1000)).toBeLessThan(0.01);
    });
  });

  it("does not suggest up/down for a ball on a pyramid base, and the three figures differ clearly", async () => {
    await withKernel((kernel, keep) => {
      const base = keep(kernel.Manifold.cylinder(10, 14.14, 7, 4).rotate([0, 0, 45]));
      const ball = keep(keep(kernel.Manifold.sphere(10, 96)).translate([0, 0, 14.2]));
      const part = scene(keep(base.add(ball)), keep);
      const result = mold(kernel, part, { kind: "twoPart", direction: "auto" }, false, keep);
      const analysis = result.analysis!;
      expect(analysis.axis).not.toBe("z");
      const byAxis = Object.fromEntries(analysis.ratings.map((rating) => [rating.axis, rating.undercutPercent]));
      expect(byAxis.z).toBeGreaterThan(byAxis[analysis.axis] + 2);
      // The halves are named for the way they open.
      expect(result.parts.map((part) => part.role)).toEqual(analysis.axis === "x" ? ["left", "right"] : ["front", "back"]);
    });
  });

  it("finds the undercut of a mushroom-like spool opened along its stem and suggests opening it across", async () => {
    await withKernel((kernel, keep) => {
      // A mushroom with a second cap at its foot (a spool): opened up and down, the mold fills the groove round the stem
      // between the caps and holds the cast whatever the parting; opened to the sides, each half slides off.
      const stem = keep(kernel.Manifold.cylinder(20, 4, 4, 48));
      const cap = keep(keep(kernel.Manifold.cylinder(5, 12, 12, 64)).translate([0, 0, 15]));
      const foot = keep(kernel.Manifold.cylinder(5, 12, 12, 64));
      const mushroom = scene(keep(kernel.Manifold.union([stem, cap, foot])), keep);
      const along = mold(kernel, mushroom, { kind: "twoPart", direction: "z", castMaterial: "resin" }, false, keep);
      expect(along.warnings).toContain("undercut");
      const finding = along.analysis!.findings.find((entry) => entry.kind === "undercut");
      expect(finding?.level).toBe("problem");
      expect(finding!.areaMm2).toBeGreaterThan(50);
      expect(along.analysis!.undercutPositions.length).toBeGreaterThan(0);
      const suggested = mold(kernel, mushroom, { kind: "twoPart", direction: "auto", castMaterial: "resin" }, false, keep);
      expect(suggested.analysis!.axis).not.toBe("z");
      expect(suggested.analysis!.rating.undercutMm2).toBeLessThan(finding!.areaMm2 / 4);
    });
  });

  it("vents a second high point by itself and reports an air trap where its vent is switched off", async () => {
    await withKernel((kernel, keep) => {
      const plate = keep(kernel.Manifold.cube([50, 20, 4], true).translate([0, 0, 2]));
      const tall = keep(keep(kernel.Manifold.cylinder(20, 5, 5, 48)).translate([-15, 0, 0]));
      const short = keep(keep(kernel.Manifold.cylinder(14, 5, 5, 48)).translate([15, 0, 0]));
      const towers = scene(keep(kernel.Manifold.union([plate, tall, short])), keep);
      const vented = mold(kernel, towers, { kind: "twoPart", direction: "z", parting: 10, autoParting: false }, false, keep);
      expect(vented.vents).toBeGreaterThanOrEqual(1);
      const points = vented.analysis!.highPoints;
      expect(points.filter((point) => point.sprue)).toHaveLength(1);
      expect(points.filter((point) => !point.sprue && point.vented).length).toBe(vented.vents);
      expect(vented.analysis!.findings.filter((finding) => finding.kind === "airTrap")).toEqual([]);
      const closed = mold(kernel, towers, { kind: "twoPart", direction: "z", parting: 10, autoParting: false, ventsOff: [0] }, false, keep);
      const trapped = closed.analysis!.findings.filter((finding) => finding.kind === "airTrap");
      expect(trapped).toHaveLength(1);
      expect(closed.warnings).toContain("airTrap");
      // On the short tower's top, 14 mm up, 15 mm to the right (the scene's x, its height y).
      expect(trapped[0].point[0]).toBeCloseTo(15, -1);
      expect(trapped[0].point[1]).toBeCloseTo(14, 0);
    });
  });

  it("gives a hint for faces without draft in a rigid material, and none in silicone", async () => {
    await withKernel((kernel, keep) => {
      const cube = scene(keep(kernel.Manifold.cube([20, 20, 20], true).translate([0, 0, 10])), keep);
      const rigid = mold(kernel, cube, { kind: "twoPart", castMaterial: "plaster" }, false, keep);
      expect(rigid.analysis!.rating.undercutPercent).toBeLessThan(0.1);
      const draft = rigid.analysis!.findings.filter((finding) => finding.kind === "draft");
      expect(draft).toHaveLength(1);
      expect(draft[0].level).toBe("hint");
      // The four sides that run along the opening.
      expect(draft[0].areaMm2).toBeCloseTo(4 * 400, -1);
      const soft = mold(kernel, cube, { kind: "twoPart", castMaterial: "silicone" }, false, keep);
      expect(soft.analysis!.findings.filter((finding) => finding.kind === "draft")).toEqual([]);
    });
  });

  it("rates undercuts by the casting material", () => {
    expect(moldUndercutLevel("silicone", 1, 100)).toBe("hint");
    expect(moldUndercutLevel("silicone", 3, 100)).toBe("problem");
    expect(moldUndercutLevel("resin", 0.5, 10)).toBe("problem");
    expect(moldUndercutLevel("plaster", 0.01, 2)).toBe(null);
  });

  it("makes the cavity larger by the shrinkage", async () => {
    await withKernel((kernel, keep) => {
      const cube = scene(keep(kernel.Manifold.cube([20, 20, 20], true).translate([0, 0, 10])), keep);
      const grown = mold(kernel, cube, { kind: "twoPart", shrinkage: 1 }, false, keep);
      expect(grown.volume).toBeCloseTo((8000 * 1.01 ** 3) / 1000, 2);
    });
  });

  it("makes a contour shell that saves material and still closes round the master", async () => {
    await withKernel((kernel, keep) => {
      const ball = scene(keep(kernel.Manifold.sphere(15, 96).translate([0, 0, 15])), keep);
      const block = mold(kernel, ball, { kind: "twoPart", outer: "block", wall: 6 }, false, keep);
      const shell = mold(kernel, ball, { kind: "twoPart", outer: "shell", wall: 6 }, false, keep);
      const volumeOf = (result: typeof block) => result.parts.reduce((sum, part) => sum + part.solid.volume(), 0);
      expect(volumeOf(shell)).toBeLessThan(volumeOf(block) * 0.85);
      const [a, b] = shell.parts.map((part) => part.solid);
      expect(overlap(a, b)).toBeLessThan(0.01);
      expect(overlap(a, ball)).toBeLessThan(0.01);
      expect(overlap(b, ball)).toBeLessThan(0.01);
      expect(a.decompose().length).toBe(1);
      expect(b.decompose().length).toBe(1);
      // Laid out to print: each half stands flat on the plate.
      const laid = mold(kernel, ball, { kind: "twoPart", outer: "shell", wall: 6 }, true, keep);
      for (const part of laid.parts) expect(part.solid.boundingBox().min[1]).toBeCloseTo(0, 5);
    });
  });

  it("drills bolt holes through both halves and cuts grooves for rubber bands", async () => {
    await withKernel((kernel, keep) => {
      const cube = scene(keep(kernel.Manifold.cube([20, 20, 20], true).translate([0, 0, 10])), keep);
      const plain = mold(kernel, cube, { kind: "twoPart", direction: "z" }, false, keep);
      const bolted = mold(kernel, cube, { kind: "twoPart", direction: "z", screws: true, bands: true }, false, keep);
      plain.parts.forEach((part, index) => expect(bolted.parts[index].solid.volume()).toBeLessThan(part.solid.volume() - 20));
      expect(overlap(bolted.parts[0].solid, bolted.parts[1].solid)).toBeLessThan(0.01);
    });
  });

  it("lays the halves closed round the master when asked, else beside it with the parting face up", async () => {
    await withKernel((kernel, keep) => {
      const cube = scene(keep(kernel.Manifold.cube([20, 20, 20], true).translate([0, 0, 10])), keep);
      const shut = mold(kernel, cube, { kind: "twoPart", direction: "x", output: "assembled" }, true, keep);
      const box = cube.boundingBox();
      const both = shut.parts.map((part) => part.solid.boundingBox());
      expect(Math.min(...both.map((b) => b.min[0]))).toBeLessThan(box.min[0]);
      expect(Math.max(...both.map((b) => b.max[0]))).toBeGreaterThan(box.max[0]);
      expect(overlap(shut.parts[0].solid, cube)).toBeLessThan(0.01);
      const laid = mold(kernel, cube, { kind: "twoPart", direction: "x" }, true, keep);
      for (const part of laid.parts) {
        expect(part.solid.boundingBox().min[1]).toBeCloseTo(0, 5);
        expect(part.solid.boundingBox().min[0]).toBeGreaterThan(box.max[0]);
      }
    });
  });

  it("keeps the keys out of the cavity of a very small part with a thin wall", async () => {
    await withKernel((kernel, keep) => {
      const small = scene(keep(kernel.Manifold.cube([4, 4, 4], true).translate([0, 0, 2])), keep);
      const result = mold(kernel, small, { kind: "twoPart", wall: 2 }, false, keep);
      expect(result.keys).toBe(4);
      expect(overlap(result.parts[0].solid, small)).toBeLessThan(0.01);
      expect(overlap(result.parts[1].solid, small)).toBeLessThan(0.01);
      expect(overlap(result.parts[0].solid, result.parts[1].solid)).toBeLessThan(0.01);
    });
  });

  it("embosses a relief: the die fits the stamp turned over, and only one way round", async () => {
    await withKernel((kernel, keep) => {
      // A coin: a disc 3 mm thick with a raised bar 1.5 mm high off the middle.
      const disc = keep(kernel.Manifold.cylinder(3, 15, 15, 64));
      const bar = keep(kernel.Manifold.cube([16, 4, 1.5]).translate([-4, 3, 3]));
      const coin = scene(keep(disc.add(bar)), keep);
      const material = 0.5;
      const result = mold(kernel, coin, { kind: "die", dieMode: "relief", material, base: 4 }, false, keep);
      expect(result.parts.map((part) => part.role)).toEqual(["punch", "die"]);
      expect(result.clearance).toBe(material);
      const toUp = (body: Body) => keep(body.rotate([90, 0, 0]));
      const [punch, die] = result.parts.map((part) => toUp(part.solid));
      const plate = punch.boundingBox();
      const middleY = (plate.min[1] + plate.max[1]) / 2;
      const height = 4.5;
      // The die turned over onto the punch with the sheet between: they do not meet.
      const onto = keep(keep(die.rotate([180, 0, 0])).translate([0, 2 * middleY, 4 + material + 4 + height]));
      expect(overlap(punch, onto)).toBeLessThan(0.5);
      // Turned round by half a turn the thinner pin no longer fits its hole.
      const centreX = (plate.min[0] + plate.max[0]) / 2;
      const wrong = keep(keep(keep(onto.translate([-centreX, -middleY, 0])).rotate([0, 0, 180])).translate([centreX, middleY, 0]));
      expect(overlap(punch, wrong)).toBeGreaterThan(1);
    });
  });
});
