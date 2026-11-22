import { describe, expect, it } from "vitest";
import Module from "manifold-3d";
import {
  MOLD_DEFAULTS, MOLD_MAX_OPENINGS, MOLD_OPENING_REACH, moldForSolid, moldNotes, moldOpeningAt, moldWarningText, normalizeMoldOpenings, normalizeMoldOptions,
  type MoldOpening, type MoldOptions,
} from "@/lib/moldTool";

/*
 * The openings of a two-part mold set by the user (Discussion #1806): the switch `ownOpenings` and the list `openings`.
 * The test bodies are built z up and handed over in the scene's frame (y up), as in the mold tool's other tests.
 */

type Solid = { delete?: () => void };
const kernelPromise = (async () => {
  const manifold = await Module();
  manifold.setup();
  return manifold;
})();
type Kernel = Awaited<typeof kernelPromise>;
type Body = ReturnType<Kernel["Manifold"]["cube"]>;
type Keep = <S extends Solid>(value: S) => S;

async function withKernel<T>(run: (kernel: Kernel, keep: Keep) => T) {
  const kernel = await kernelPromise;
  const created: Solid[] = [];
  const keep = <S extends Solid>(value: S) => (created.push(value), value);
  try {
    return run(kernel, keep);
  } finally {
    created.forEach((value) => value.delete?.());
  }
}

const SCENE_TO_UP = [1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1] as const;
const scene = (body: Body, keep: Keep) => keep(body.rotate([-90, 0, 0]));
const up = (body: Body, keep: Keep) => keep(body.transform([...SCENE_TO_UP] as never));

/**
 * Two towers on a plate 50 x 20 x 4 round the origin: a tall one (20 high) at x = -15 and a short one (14 high) at
 * x = 15, both 10 wide. The bounding box's middle is over the origin, so an opening's x and y are the towers' own.
 */
function towers(kernel: Kernel, keep: Keep) {
  const { Manifold } = kernel;
  const plate = keep(Manifold.cube([50, 20, 4], true).translate([0, 0, 2]));
  const tall = keep(keep(Manifold.cylinder(20, 5, 5, 48)).translate([-15, 0, 0]));
  const short = keep(keep(Manifold.cylinder(14, 5, 5, 48)).translate([15, 0, 0]));
  return keep(Manifold.union([plate, tall, short]));
}

/** A block 30 x 20 x 10 with a dome 18 wide on it: its highest point is one point, where the funnel's depth hangs on the height. */
function figure(kernel: Kernel, keep: Keep) {
  const { Manifold } = kernel;
  const base = keep(Manifold.cube([30, 20, 10], true).translate([0, 0, 5]));
  const ball = keep(keep(keep(Manifold.sphere(9, 64)).trimByPlane([0, 0, 1], 0)).translate([0, 0, 10]));
  return keep(base.add(ball));
}

function mold(kernel: Kernel, body: Body, options: Partial<MoldOptions>, keep: Keep) {
  const result = moldForSolid(kernel, body as never, normalizeMoldOptions({ ...MOLD_DEFAULTS, direction: "z", shrinkage: 0, parting: 10, autoParting: false, ...options }), false);
  if ("error" in result) throw new Error(`${result.error} ${result.message ?? ""}`);
  result.parts.forEach((part) => keep(part.solid));
  return result;
}

/** How much of a disc `radius` wide round (x, y) is solid in `body` at the height z: 0 where a channel runs. */
function solidAt(kernel: Kernel, body: Body, x: number, y: number, z: number, radius: number, keep: Keep) {
  const cut = keep(body.slice(z));
  const disc = keep(keep(kernel.CrossSection.circle(radius, 32)).translate([x, y]));
  return keep(cut.intersect(disc)).area();
}

/** The volume two bodies do not share. */
function difference(a: Body, b: Body, keep: Keep) {
  return keep(a.subtract(b)).volume() + keep(b.subtract(a)).volume();
}

describe("the mold's own openings: the list kept to what a mold takes", () => {
  it("keeps the switch off and the list empty unless they are given", () => {
    expect(MOLD_DEFAULTS.ownOpenings).toBe(false);
    expect(MOLD_DEFAULTS.openings).toEqual([]);
    const options = normalizeMoldOptions({});
    expect(options.ownOpenings).toBe(false);
    expect(options.openings).toEqual([]);
    expect(normalizeMoldOptions({ ownOpenings: "true" }).ownOpenings).toBe(true);
    expect(normalizeMoldOptions({ openings: "nonsense" }).openings).toEqual([]);
  });

  it("leaves out what has no place or no kind, and keeps a place within reach of the master", () => {
    const openings = normalizeMoldOpenings([
      { x: 1, y: 2, kind: "sprue" },
      { x: "3.5", y: -4, kind: "vent" },
      { x: Number.NaN, y: 0, kind: "vent" },
      { x: 0, y: Number.POSITIVE_INFINITY, kind: "vent" },
      { x: 5, kind: "vent" },
      { x: 5, y: 5, kind: "funnel" },
      { x: 5, y: 5 },
      null,
      "sprue",
      { x: 1e9, y: -1e9, kind: "vent" },
    ]);
    expect(openings).toEqual([
      { x: 1, y: 2, kind: "sprue" },
      { x: 3.5, y: -4, kind: "vent" },
      { x: MOLD_OPENING_REACH, y: -MOLD_OPENING_REACH, kind: "vent" },
    ]);
    expect(normalizeMoldOpenings(undefined)).toEqual([]);
    expect(normalizeMoldOpenings({ x: 1, y: 1, kind: "vent" })).toEqual([]);
  });

  it("takes two openings on nearly the same spot as one, the first, and no more than a mold has room for", () => {
    expect(normalizeMoldOpenings([{ x: 10, y: 10, kind: "vent" }, { x: 10.2, y: 10.1, kind: "sprue" }, { x: 11, y: 10, kind: "sprue" }])).toEqual([
      { x: 10, y: 10, kind: "vent" },
      { x: 11, y: 10, kind: "sprue" },
    ]);
    const many = Array.from({ length: 40 }, (_, index) => ({ x: index * 2, y: 0, kind: "vent" }));
    const kept = normalizeMoldOpenings(many);
    expect(kept).toHaveLength(MOLD_MAX_OPENINGS);
    expect(kept[MOLD_MAX_OPENINGS - 1].x).toBe((MOLD_MAX_OPENINGS - 1) * 2);
    expect(normalizeMoldOptions({ openings: many }).openings).toHaveLength(MOLD_MAX_OPENINGS);
  });

  it("turns a point picked in the view into a place across the parting face from the master's middle", () => {
    // Opening up and down, the scene's x and -z are the frame's x and y; the height (the scene's y) does not count.
    const analysis = { centre: [10, 5, -20] as [number, number, number], across: [[1, 0, 0], [0, 0, -1]] as [[number, number, number], [number, number, number]] };
    expect(moldOpeningAt(analysis, [13, 99, -24])).toEqual({ x: 3, y: 4 });
    expect(moldOpeningAt(analysis, [10, 0, -20])).toEqual({ x: 0, y: 0 });
  });

  it("says how many openings were set and how many were left out", () => {
    const result = { parts: [], volume: 10, warnings: ["openingMissed" as const, "noSprue" as const], keys: 4, vents: 2, sprues: 0, ownOpenings: { missed: 3 } };
    const notes = moldNotes(result, "twoPart");
    expect(notes).toContain("Openings set by hand: sprues 0, vents 2.");
    expect(notes).toContain("Openings beside the master were left out: 3.");
    expect(notes).toContain(moldWarningText("noSprue"));
    // Several sprues the user set do not mean several cavities.
    expect(moldNotes({ ...result, warnings: [], sprues: 2 }, "twoPart").join(" ")).not.toContain("separate cavities");
    expect(moldNotes({ parts: [], volume: 10, warnings: [], keys: 4, vents: 0, sprues: 2 }, "twoPart").join(" ")).toContain("2 separate cavities");
  });
});

describe("the mold's own openings: where the channels go", () => {
  it("makes no sprue and no vent by itself once the switch is on, and says the mold cannot be poured", async () => {
    await withKernel((kernel, keep) => {
      const master = scene(towers(kernel, keep), keep);
      const automatic = mold(kernel, master, {}, keep);
      expect(automatic.sprues).toBe(1);
      expect(automatic.vents).toBeGreaterThanOrEqual(1);
      const own = mold(kernel, master, { ownOpenings: true, openings: [] }, keep);
      expect(own.sprues).toBe(0);
      expect(own.vents).toBe(0);
      expect(own.warnings).toContain("noSprue");
      expect(own.ownOpenings).toEqual({ missed: 0 });
      // The upper half is whole: the same as with the sprue switched off, and more than with the automatic openings.
      const closed = mold(kernel, master, { sprue: false }, keep);
      expect(own.parts[1].solid.volume()).toBeCloseTo(closed.parts[1].solid.volume(), 3);
      expect(own.parts[1].solid.volume()).toBeGreaterThan(automatic.parts[1].solid.volume() + 50);
      // The switch off, the list is not looked at.
      const ignored = mold(kernel, master, { ownOpenings: false, openings: [{ x: 15, y: 0, kind: "sprue" }] }, keep);
      expect(ignored.sprues).toBe(automatic.sprues);
      expect(ignored.vents).toBe(automatic.vents);
      expect(ignored.ownOpenings).toBeUndefined();
      expect(difference(ignored.parts[1].solid, automatic.parts[1].solid, keep)).toBeLessThan(0.01);
    });
  });

  it("runs a sprue and a vent from the top down into the cavity where they were set", async () => {
    await withKernel((kernel, keep) => {
      const master = scene(towers(kernel, keep), keep);
      // The other way round than the automatic placement: the sprue over the short tower, the vent over the tall one.
      const openings: MoldOpening[] = [{ x: 15, y: 0, kind: "sprue" }, { x: -15, y: 0, kind: "vent" }];
      const own = mold(kernel, master, { ownOpenings: true, openings }, keep);
      expect(own.sprues).toBe(1);
      expect(own.vents).toBe(1);
      expect(own.warnings).not.toContain("noSprue");
      expect(own.warnings).not.toContain("openingMissed");
      // Both towers' tops have an opening, so no air stays.
      expect(own.warnings).not.toContain("airTrap");
      const upper = up(own.parts[1].solid, keep);
      // The sprue (8 wide) is open from just over the short tower's top (14) to the mold's top (25).
      for (const z of [14.2, 18, 24.5]) expect(solidAt(kernel, upper, 15, 0, z, 3.5, keep)).toBeLessThan(0.01);
      // The vent (2.5 wide) likewise over the tall tower (20), and round it the mold is solid: no sprue there.
      for (const z of [20.2, 22, 24.5]) expect(solidAt(kernel, upper, -15, 0, z, 1, keep)).toBeLessThan(0.01);
      expect(solidAt(kernel, upper, -15, 0, 20.5, 3.5, keep)).toBeGreaterThan(Math.PI * 3.5 * 3.5 - Math.PI * 1.25 * 1.25 - 1);
      // The funnel widens the sprue at the top.
      expect(solidAt(kernel, upper, 15, 0, 24.8, 8, keep)).toBeLessThan(Math.PI * 64 - Math.PI * 16 - 20);
      expect(keep(upper.intersect(up(master, keep))).volume()).toBeLessThan(0.01);
      // The posts of the preview stand on the towers' tops and know their place in the list.
      const points = own.analysis!.highPoints;
      expect(points).toHaveLength(2);
      const sprue = points.find((point) => point.sprue)!;
      expect(sprue.opening).toBe(0);
      expect(sprue.point[0]).toBeCloseTo(15, 3);
      expect(sprue.point[1]).toBeCloseTo(14, 3);
      const vent = points.find((point) => !point.sprue)!;
      expect(vent.opening).toBe(1);
      expect(vent.vented).toBe(true);
      expect(vent.point[1]).toBeCloseTo(20, 3);
    });
  });

  it("keeps the openings on the same spots of the master when the master is moved", async () => {
    await withKernel((kernel, keep) => {
      const body = towers(kernel, keep);
      const openings: MoldOpening[] = [{ x: 15, y: 0, kind: "sprue" }, { x: -15, y: 0, kind: "vent" }];
      const here = mold(kernel, scene(body, keep), { ownOpenings: true, openings }, keep);
      const there = mold(kernel, scene(keep(body.translate([40, 7, 3])), keep), { ownOpenings: true, openings }, keep);
      expect(there.sprues).toBe(1);
      expect(there.vents).toBe(1);
      expect(there.warnings).toEqual(here.warnings);
      const moved = keep(up(here.parts[1].solid, keep).translate([40, 7, 3]));
      expect(difference(moved, up(there.parts[1].solid, keep), keep)).toBeLessThan(0.05);
    });
  });

  it("leaves out an opening beside the master, and one over a place that lies wholly in the lower half, and says how many", async () => {
    await withKernel((kernel, keep) => {
      const master = scene(towers(kernel, keep), keep);
      // Parted at half the height (10): the plate (4 high) lies in the lower half, only the towers reach into the upper.
      const openings: MoldOpening[] = [{ x: -15, y: 0, kind: "sprue" }, { x: 0, y: 30, kind: "vent" }, { x: 0, y: 0, kind: "vent" }, { x: 15, y: 0, kind: "vent" }];
      const own = mold(kernel, master, { ownOpenings: true, openings, parting: 50 }, keep);
      expect(own.warnings).toContain("openingMissed");
      expect(own.ownOpenings).toEqual({ missed: 2 });
      expect(own.analysis!.missedOpenings).toEqual([1, 2]);
      expect(own.sprues).toBe(1);
      expect(own.vents).toBe(1);
      expect(moldNotes(own, "twoPart")).toContain("Openings beside the master were left out: 2.");
      // Nothing is drilled where the two were left out.
      const upper = up(own.parts[1].solid, keep);
      expect(solidAt(kernel, upper, 0, 0, 20, 1, keep)).toBeGreaterThan(3);
      const whole = mold(kernel, master, { ownOpenings: true, openings: [openings[0], openings[3]], parting: 50 }, keep);
      expect(difference(upper, up(whole.parts[1].solid, keep), keep)).toBeLessThan(0.01);
    });
  });

  it("warns, but still makes the mold, when there is no sprue among the openings", async () => {
    await withKernel((kernel, keep) => {
      const master = scene(towers(kernel, keep), keep);
      const own = mold(kernel, master, { ownOpenings: true, openings: [{ x: 15, y: 0, kind: "vent" }] }, keep);
      expect(own.parts).toHaveLength(2);
      expect(own.warnings).toContain("noSprue");
      expect(own.sprues).toBe(0);
      expect(own.vents).toBe(1);
      expect(moldNotes(own, "twoPart")).toContain(moldWarningText("noSprue"));
    });
  });

  it("still shows a high point no opening reaches as an air trap", async () => {
    await withKernel((kernel, keep) => {
      const master = scene(towers(kernel, keep), keep);
      const own = mold(kernel, master, { ownOpenings: true, openings: [{ x: -15, y: 0, kind: "sprue" }] }, keep);
      expect(own.warnings).toContain("airTrap");
      const traps = own.analysis!.findings.filter((finding) => finding.kind === "airTrap");
      expect(traps.length).toBeGreaterThanOrEqual(1);
      // On the short tower's top, which has no opening; none on the tall tower's, where the sprue stands.
      expect(traps.every((trap) => Math.hypot(trap.point[0] - 15, trap.point[2]) < 6)).toBe(true);
      const open = own.analysis!.highPoints.filter((point) => !point.vented);
      expect(open.length).toBe(traps.length);
      expect(open.every((point) => point.opening === undefined)).toBe(true);
      // The sprue alone on the short tower leaves the tall one, the highest point of all, as the trap.
      const other = mold(kernel, master, { ownOpenings: true, openings: [{ x: 15, y: 0, kind: "sprue" }] }, keep);
      const left = other.analysis!.findings.filter((finding) => finding.kind === "airTrap");
      expect(left.length).toBeGreaterThanOrEqual(1);
      expect(left.every((trap) => Math.hypot(trap.point[0] + 15, trap.point[2]) < 6)).toBe(true);
    });
  });

  it("gives the very mold of the automatic placement when the suggested openings are taken over as they are", async () => {
    await withKernel((kernel, keep) => {
      const cases: Array<[Body, Partial<MoldOptions>]> = [
        [towers(kernel, keep), {}],
        [towers(kernel, keep), { outer: "shell" }],
        // A dome: the funnel's depth hangs on the exact height of the top. Found parting, and the master off the origin.
        [keep(figure(kernel, keep).translate([12, -30, 2])), { autoParting: true }],
        [figure(kernel, keep), { autoParting: true, shrinkage: 0.5, wall: 4 }],
      ];
      for (const [body, options] of cases) {
        const master = scene(body, keep);
        const automatic = mold(kernel, master, options, keep);
        const suggested = automatic.analysis!.suggested;
        expect(suggested.filter((opening) => opening.kind === "sprue")).toHaveLength(automatic.sprues);
        expect(suggested.filter((opening) => opening.kind === "vent")).toHaveLength(automatic.vents);
        const own = mold(kernel, master, { ...options, ownOpenings: true, openings: suggested }, keep);
        expect(own.sprues).toBe(automatic.sprues);
        expect(own.vents).toBe(automatic.vents);
        expect(own.ownOpenings).toEqual({ missed: 0 });
        expect(own.warnings).toEqual(automatic.warnings);
        // The suggestion is the same whether the user sets the openings or not.
        expect(own.analysis!.suggested).toEqual(suggested);
        expect(own.analysis!.volume).toBeCloseTo(automatic.analysis!.volume, 4);
        own.parts.forEach((part, index) => {
          expect(part.solid.volume()).toBeCloseTo(automatic.parts[index].solid.volume(), 2);
          expect(difference(part.solid, automatic.parts[index].solid, keep)).toBeLessThan(0.02);
        });
      }
    });
  });

  it("suggests the sprue and the vents also while they are switched off", async () => {
    await withKernel((kernel, keep) => {
      const master = scene(towers(kernel, keep), keep);
      const automatic = mold(kernel, master, {}, keep);
      const off = mold(kernel, master, { sprue: false, vents: false }, keep);
      expect(off.sprues).toBe(0);
      expect(off.analysis!.suggested).toEqual(automatic.analysis!.suggested);
    });
  });
});
