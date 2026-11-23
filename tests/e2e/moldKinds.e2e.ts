import { describe, expect, it } from "vitest";
import Module from "manifold-3d";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { MOLD_DEFAULTS, moldForSolid, moldMix, moldNotes, normalizeMoldOptions, type MoldOptions, type MoldPartRole } from "@/lib/moldTool";

/*
 * The mold tool's further kinds and ways: the silicone skin mold with its shell, the core mold for a vessel, the two
 * cases that the halves of a mold are poured in, a pour box that follows the outline, and for the two-part mold the
 * pour through the seam, the wick, the sealing lip and four parts. The bodies are built z up and handed over in the
 * scene's frame (y up), as in the mold tool's other tests; what comes back is turned z up again to be measured.
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

function made(kernel: Kernel, keep: Keep, body: Body, options: Partial<MoldOptions>, layout = false) {
  const result = moldForSolid(kernel, body, normalizeMoldOptions({ ...MOLD_DEFAULTS, shrinkage: 0, ...options }), layout);
  if ("error" in result) throw new Error(`${result.error} ${result.message ?? ""}`);
  const parts = result.parts.map((part) => ({ ...part, solid: up(keep(part.solid) as Body, keep) }));
  parts.forEach((part) => saveStl(`${options.kind ?? "twoPart"}-${part.role}${part.number ?? ""}${layout ? "-print" : ""}`, part.solid));
  const of = (role: MoldPartRole, number?: number) => {
    const part = parts.find((entry) => entry.role === role && (number === undefined || entry.number === number));
    if (!part) throw new Error(`no part ${role}`);
    return part.solid;
  };
  return { result, parts, of };
}

/** Where the meshes for the pictures go, when asked for (MOLD_OUT). */
function saveStl(name: string, body: Body) {
  const out = process.env.MOLD_OUT;
  if (!out) return;
  mkdirSync(out, { recursive: true });
  const mesh = body.getMesh();
  const lines = ["solid m"];
  for (let index = 0; index < mesh.triVerts.length; index += 3) {
    lines.push("facet normal 0 0 0", "outer loop");
    for (let corner = 0; corner < 3; corner += 1) {
      const offset = mesh.triVerts[index + corner] * mesh.numProp;
      lines.push(`vertex ${mesh.vertProperties[offset]} ${mesh.vertProperties[offset + 1]} ${mesh.vertProperties[offset + 2]}`);
    }
    lines.push("endloop", "endfacet");
  }
  lines.push("endsolid m");
  writeFileSync(join(out, `${name}.stl`), lines.join("\n"));
}

function overlap(a: Body, b: Body, keep: Keep) {
  return keep(a.intersect(b)).volume();
}

/** How much of a disc `radius` wide round (x, y) is solid at `z`, in mm². */
function solidAt(kernel: Kernel, keep: Keep, body: Body, x: number, y: number, z: number, radius: number) {
  return keep(keep(body.slice(z)).intersect(keep(kernel.CrossSection.circle(radius, 32).translate([x, y])))).area();
}

/** The area shut in by a body's cross-section at `z` (its hollow), in mm². */
function hollowAt(kernel: Kernel, keep: Keep, body: Body, z: number) {
  const cut = keep(body.slice(z));
  const outlines = cut.toPolygons().filter((polygon) => {
    let twice = 0;
    polygon.forEach(([x0, y0], index) => {
      const [x1, y1] = polygon[(index + 1) % polygon.length];
      twice += x0 * y1 - x1 * y0;
    });
    return twice > 0;
  });
  return keep(kernel.CrossSection.ofPolygons(outlines, "Positive")).area() - cut.area();
}

/** A pillar candle standing: 20 wide, 40 high. */
const pillar = (kernel: Kernel, keep: Keep) => scene(keep(kernel.Manifold.cylinder(40, 10, 10, 96)), keep);
/** A mushroom: a stem 8 wide and 20 high under a cap 24 wide and 6 high. */
const mushroom = (kernel: Kernel, keep: Keep) => scene(keep(keep(kernel.Manifold.cylinder(20.5, 4, 4, 48)).add(keep(keep(kernel.Manifold.cylinder(6, 12, 12, 64)).translate([0, 0, 20])))), keep);
/** A cup: 40 wide and 40 high, its wall and bottom 3 thick, open at the top. */
const cup = (kernel: Kernel, keep: Keep) => scene(keep(keep(kernel.Manifold.cylinder(40, 20, 20, 96)).subtract(keep(keep(kernel.Manifold.cylinder(40, 17, 17, 96)).translate([0, 0, 3])))), keep);
/** A planter that opens out: 30 wide at the foot, 50 at the rim, 40 high, wall and bottom 4 thick. */
const planter = (kernel: Kernel, keep: Keep) => scene(keep(keep(kernel.Manifold.cylinder(40, 15, 25, 96)).subtract(keep(keep(kernel.Manifold.cylinder(40, 11.4, 21, 96)).translate([0, 0, 4])))), keep);

describe("silicone skin mold", () => {
  it("takes the silicone a blanket of the gap takes, far less than a pour box", () => withKernel((kernel, keep) => {
    const { result } = made(kernel, keep, pillar(kernel, keep), { kind: "skin", gap: 5, wall: 4, sprueDiameter: 6 });
    // Round the pillar a tube 5 thick and 40 high, over it a rounded cap: about pi * (15² - 10²) * 40 + 3.07 ml.
    const blanket = (Math.PI * (15 * 15 - 10 * 10) * 40 + Math.PI * (625 - 125 / 3 + 20 * (Math.PI * 25) / 4)) / 1000;
    expect(result.volume).toBeGreaterThan(blanket * 0.97);
    expect(result.volume).toBeLessThan(blanket * 1.12);
    const boxed = (30 * 30 * 45 - Math.PI * 100 * 40) / 1000;
    expect(result.saved).toBeCloseTo(boxed - result.volume, 1);
    expect(result.saved!).toBeGreaterThan(boxed * 0.3);
    expect(result.mix?.material).toBe("silicone");
    expect(moldNotes(result, "skin").join(" ")).toContain("less silicone");
  }));

  it("keeps the gap round the master and stands the shell in the base's groove", () => withKernel((kernel, keep) => {
    const body = mushroom(kernel, keep);
    const { parts, of } = made(kernel, keep, body, { kind: "skin", gap: 5, wall: 4, shellSplit: false });
    expect(parts.map((part) => part.role)).toEqual(["skinBase", "skinShell"]);
    const master = up(body, keep);
    const shell = of("skinShell");
    // Nothing of the shell within 4.5 mm of the master: the master grown by that much stays clear of it.
    const grown = keep(master.minkowskiSum(keep(kernel.Manifold.sphere(4.5, 16))));
    expect(overlap(shell, grown, keep)).toBeLessThan(1);
    expect(overlap(of("skinBase"), shell, keep)).toBeLessThan(0.5);
    // The base's seat is 0.6 deep and no wider than the master's foot needs.
    expect(overlap(of("skinBase"), master, keep)).toBeLessThan(0.5);
    // The shell reaches 2 mm into the groove below the master's foot.
    expect(shell.boundingBox().min[2]).toBeCloseTo(-2, 1);
  }));

  it("never widens upward inside, so the shell lifts off, and has a sprue over the master's top", () => withKernel((kernel, keep) => {
    const { of } = made(kernel, keep, mushroom(kernel, keep), { kind: "skin", gap: 5, wall: 4, shellSplit: false, sprueDiameter: 8 });
    const shell = of("skinShell");
    // Under the cap the stem is thin, but the shell's hollow stays as wide as round the cap.
    const underCap = hollowAt(kernel, keep, shell, 8);
    const atCap = hollowAt(kernel, keep, shell, 23);
    expect(underCap).toBeGreaterThan(atCap - 1);
    expect(atCap).toBeGreaterThan(Math.PI * 16.5 * 16.5);
    // The roof lies 5 mm over the cap's top (26), 4 thick; the sprue goes through it.
    expect(shell.boundingBox().max[2]).toBeCloseTo(35, 1);
    expect(solidAt(kernel, keep, shell, 0, 0, 33, 3.5)).toBeLessThan(0.5);
    expect(solidAt(kernel, keep, shell, 9, 0, 33, 1.5)).toBeGreaterThan(6);
  }));

  it("prints the shell roof down and makes two bolted halves by default", () => withKernel((kernel, keep) => {
    const { parts } = made(kernel, keep, mushroom(kernel, keep), { kind: "skin", gap: 5, wall: 4 }, true);
    expect(parts.map((part) => `${part.role}${part.number ?? ""}`)).toEqual(["skinBase", "skinShellHalf1", "skinShellHalf2"]);
    for (const part of parts) expect(part.solid.boundingBox().min[2]).toBeCloseTo(0, 3);
    const half = parts[1].solid;
    // The roof is the first layer: at 1 mm the half is solid but for the sprue, wider than it is half way up.
    const first = keep(half.slice(1)).area();
    expect(first).toBeGreaterThan(keep(half.slice(15)).area());
    // The flange with its bolt holes sticks out beyond the shell: wider across the seam than the shell alone (2 * (12 + 5 + 4)).
    const size = half.boundingBox();
    expect(Math.max(size.max[0] - size.min[0], size.max[1] - size.min[1])).toBeGreaterThan(42 + 20);
  }));
});

describe("pour box following the outline", () => {
  it("takes less silicone than the rectangle for a round master", () => withKernel((kernel, keep) => {
    const body = pillar(kernel, keep);
    const rect = made(kernel, keep, body, { kind: "box", gap: 10, above: 12 });
    const contour = made(kernel, keep, body, { kind: "box", gap: 10, above: 12, boxShape: "contour" });
    expect(rect.result.volume).toBeCloseTo((40 * 40 * 52 - Math.PI * 100 * 40) / 1000, 0);
    expect(contour.result.volume).toBeGreaterThan((Math.PI * 400 * 52 - Math.PI * 100 * 40) / 1000 - 0.5);
    expect(contour.result.volume).toBeLessThan((Math.PI * 400 * 52 - Math.PI * 100 * 40) / 1000 + 1.5);
    expect(contour.result.saved).toBeCloseTo(rect.result.volume - contour.result.volume, 3);
    expect(rect.result.saved).toBeUndefined();
    const master = up(body, keep);
    expect(overlap(contour.of("frame"), master, keep)).toBeLessThan(1e-6);
    expect(overlap(contour.of("frame"), contour.of("base"), keep)).toBeLessThan(0.5);
  }));
});

describe("core mold for a vessel", () => {
  it("casts the vessel's wall: base with core and two sleeve halves close round it without a gap", () => withKernel((kernel, keep) => {
    const body = cup(kernel, keep);
    const { result, parts, of } = made(kernel, keep, body, { kind: "core", wall: 5, floor: 3, keys: false, castMaterial: "plaster", density: 1.6 });
    expect(parts.map((part) => `${part.role}${part.number ?? ""}`)).toEqual(["coreBase", "sleeveHalf1", "sleeveHalf2"]);
    const master = up(body, keep);
    expect(result.volume).toBeCloseTo(master.volume() / 1000, 1);
    // Parts and cast together fill the block: 50 x 50 round the cup, 40 high, and the plate 3 thick.
    const together = parts.reduce((sum, part) => sum + part.solid.volume(), 0) + master.volume();
    // (the plate lies 0.02 mm into the rim, so that it and the core are one body)
    expect(together).toBeGreaterThan(50 * 50 * 43 - 120);
    expect(together).toBeLessThan(50 * 50 * 43 + 1);
    for (const part of parts) expect(overlap(part.solid, master, keep)).toBeLessThan(part.role === "coreBase" ? 20 : 1e-6);
    expect(overlap(of("sleeveHalf", 1), of("sleeveHalf", 2), keep)).toBeLessThan(1e-6);
    // The core fills the cup's inside: 17 wide, 37 deep.
    expect(of("coreBase").volume()).toBeGreaterThan(50 * 50 * 3 + Math.PI * 17 * 17 * 37 - 100);
    expect(of("coreBase").volume()).toBeLessThan(50 * 50 * 3 + Math.PI * 17 * 17 * 37 + 1);
    expect(result.warnings).toEqual([]);
    expect(result.mix?.totalG).toBeCloseTo(result.volume * 1.1 * 1.6, 3);
  }));

  it("keys the sleeve to the plate and the halves to each other, and lays the parts out to print", () => withKernel((kernel, keep) => {
    const { result, parts } = made(kernel, keep, cup(kernel, keep), { kind: "core", wall: 5 }, true);
    // Four cones on the plate, and two on each side of the seam (the cup is high enough for two).
    expect(result.keys).toBe(8);
    for (const part of parts) expect(part.solid.boundingBox().min[2]).toBeCloseTo(0, 3);
    // The base lies plate down, the core standing on it.
    const base = parts[0].solid;
    expect(keep(base.slice(1)).area()).toBeGreaterThan(keep(base.slice(10)).area() * 2);
    // Each half lies on its outside, the seam face up: half the block's width high.
    // (the block 64 wide), and the cones on the seam face 4 more.
    expect(parts[1].solid.boundingBox().max[2]).toBeCloseTo(36, 0);
  }));

  it("makes a drain hole with a pin on the core", () => withKernel((kernel, keep) => {
    const body = cup(kernel, keep);
    const plain = made(kernel, keep, body, { kind: "core", keys: false });
    const drained = made(kernel, keep, body, { kind: "core", keys: false, drain: true, drainDiameter: 8 });
    const pin = (plain.result.volume - drained.result.volume) * 1000;
    // A pin through the 3 mm bottom, 8 wide at the core and a little less at the brim.
    expect(pin).toBeGreaterThan(Math.PI * 3.6 * 3.6 * 3 * 0.95);
    expect(pin).toBeLessThan(Math.PI * 4 * 4 * 3 * 1.05);
  }));

  it("says so when there is no hollow, when the core cannot come out, and when the rim is not level", () => withKernel((kernel, keep) => {
    const solid = moldForSolid(kernel, pillar(kernel, keep), normalizeMoldOptions({ ...MOLD_DEFAULTS, kind: "core" }), false);
    expect(solid).toEqual({ error: "noHollow" });
    // A vase whose inside is 30 wide below a neck 16 wide.
    const vase = scene(keep(keep(kernel.Manifold.cylinder(40, 20, 20, 96))
      .subtract(keep(keep(kernel.Manifold.cylinder(25, 15, 15, 96)).translate([0, 0, 3])))
      .subtract(keep(keep(kernel.Manifold.cylinder(20, 8, 8, 96)).translate([0, 0, 25])))), keep);
    expect(made(kernel, keep, vase, { kind: "core" }).result.warnings).toContain("coreUndercut");
    // A cup with a notch 3 mm deep in its rim: cut a little lower, as little as closes it.
    const notched = scene(keep(up(cup(kernel, keep), keep).subtract(keep(kernel.Manifold.cube([8, 8, 6], true).translate([18.5, 0, 40])))), keep);
    const cut = made(kernel, keep, notched, { kind: "core" });
    expect(cut.result.warnings).toContain("rimCut");
    expect(cut.result.rimCut).toBeCloseTo(4, 5);
    expect(moldNotes(cut.result, "core").join(" ")).toContain("4 mm lower");
  }));

  it("makes the sleeve in one piece for a vessel that opens out", () => withKernel((kernel, keep) => {
    const body = planter(kernel, keep);
    const { result, parts } = made(kernel, keep, body, { kind: "core", shellSplit: false, castMaterial: "concrete", density: 2.3 });
    expect(parts.map((part) => part.role)).toEqual(["coreBase", "sleeve"]);
    expect(result.warnings).toEqual([]);
    // Upside down in a sleeve in one piece, a vessel that narrows to its rim would stick.
    const narrowing = scene(keep(keep(kernel.Manifold.cylinder(40, 25, 15, 96)).subtract(keep(keep(kernel.Manifold.cylinder(40, 12, 12, 96)).translate([0, 0, 4])))), keep);
    expect(made(kernel, keep, narrowing, { kind: "core", shellSplit: false }).result.warnings).toContain("undercut");
    expect(made(kernel, keep, narrowing, { kind: "core", shellSplit: true }).result.warnings).not.toContain("undercut");
  }));
});

describe("two cases for the halves of a mold", () => {
  it("gives two open cases whose pours make up the block round the master", () => withKernel((kernel, keep) => {
    const ball = scene(keep(kernel.Manifold.sphere(10, 96).translate([0, 0, 10])), keep);
    const { result, parts } = made(kernel, keep, ball, { kind: "halves", gap: 8, wall: 2, floor: 3, sprue: false, keys: false, direction: "z" });
    expect(parts.map((part) => part.role)).toEqual(["caseFirst", "caseSecond"]);
    // Round the ball 8 mm all round: a block 36 x 36 x 36 less the ball.
    expect(result.volume).toBeCloseTo((36 * 36 * 36 - (4 / 3) * Math.PI * 1000) / 1000, 0);
    expect(result.parting).toBeCloseTo(50, 0);
    expect(result.analysis?.ratings.map((rating) => rating.axis)).toEqual(["z", "x", "y"]);
    // Each case: a plate 40 x 40 x 3, walls 2 thick and 18 high, and half the ball.
    for (const part of parts) expect(part.solid.volume()).toBeCloseTo(40 * 40 * 3 + (40 * 40 - 36 * 36) * 18 + (2 / 3) * Math.PI * 1000, -2);
  }));

  it("lays both cases plate down and gives them natches that fit and a pour channel in the seam", () => withKernel((kernel, keep) => {
    const body = pillar(kernel, keep);
    const { result, parts } = made(kernel, keep, body, { kind: "halves", gap: 10, wall: 2, direction: "x", sprueDiameter: 8 }, true);
    expect(result.keys).toBe(4);
    for (const part of parts) {
      expect(part.solid.boundingBox().min[2]).toBeCloseTo(0, 3);
      // The plate is the first layer, all of it.
      expect(keep(part.solid.slice(0.5)).area()).toBeGreaterThan(44 * 64 - 4 * Math.PI * 16);
    }
    // The first case has its natches standing on the plate, the second sunk into it: the plate (4 + 1.2) is thicker than they are deep.
    const [first, second] = parts.map((part) => part.solid);
    expect(first.volume()).toBeGreaterThan(second.volume());
    // The pour channel: a half cone from the pillar's top out to the frame, in both cases.
    const plain = made(kernel, keep, body, { kind: "halves", gap: 10, wall: 2, direction: "x", sprue: false }, true);
    expect(first.volume()).toBeGreaterThan(plain.parts[0].solid.volume() + 100);
    expect(result.volume).toBeLessThan(plain.result.volume);
  }));

  it("makes the mold larger for slip that shrinks, and mixes plaster with water", () => withKernel((kernel, keep) => {
    const body = pillar(kernel, keep);
    const plain = made(kernel, keep, body, { kind: "halves", gap: 25, moldMaterial: "plaster", sprue: false, mixA: 100, mixB: 70, direction: "x" });
    const slip = made(kernel, keep, body, { kind: "halves", gap: 25, moldMaterial: "plaster", sprue: false, castMaterial: "clay", shrinkage: 10, direction: "x" });
    // The cases grow with the master, 10 % in every direction: the pillar 40 high makes them 4 mm higher.
    const tall = (result: typeof plain) => result.parts[0].solid.boundingBox().max[2] - result.parts[0].solid.boundingBox().min[2];
    expect(tall(slip)).toBeCloseTo(tall(plain) + 4, 1);
    expect(plain.result.mix?.material).toBe("plaster");
    expect(plain.result.mix!.aG / plain.result.mix!.bG).toBeCloseTo(100 / 70, 5);
    expect(plain.result.mix!.totalG).toBeCloseTo(plain.result.volume * 1.1 * 1.6, 3);
    expect(moldNotes(plain.result, "halves").join(" ")).toContain("powder");
    // Slip in a printed mold does not set: the two-part mold says so.
    expect(made(kernel, keep, body, { kind: "twoPart", castMaterial: "clay" }).result.warnings).toContain("clayNeedsPlaster");
  }));
});

describe("two-part mold poured through the seam", () => {
  it("lays the sprue in the seam on the master's top, half in each half", () => withKernel((kernel, keep) => {
    const body = pillar(kernel, keep);
    const top = made(kernel, keep, body, { direction: "x", castMaterial: "wax", density: 0.9, keys: false });
    const seam = made(kernel, keep, body, { direction: "x", pour: "seam", castMaterial: "wax", density: 0.9, keys: false });
    const [left, right] = [seam.of("left"), seam.of("right")];
    // Over the pillar's top (40) the channel runs up the axis to the block's top (45): open in the middle, solid beside it.
    for (const half of [left, right]) {
      expect(solidAt(kernel, keep, keep(left.add(right)), 0, 0, 42, 3.5)).toBeLessThan(0.5);
      expect(keep(keep(half.slice(42)).intersect(keep(kernel.CrossSection.circle(3.9, 48)))).area()).toBeLessThan(0.5);
    }
    expect(solidAt(kernel, keep, keep(left.add(right)), 0, 9, 42, 0.8)).toBeGreaterThan(1.9);
    // Each half has half the channel: the same volume taken out of both.
    expect(left.volume()).toBeCloseTo(right.volume(), -1);
    // The mold poured from the top has its sprue in the right half alone.
    expect(Math.abs(top.of("left").volume() - top.of("right").volume())).toBeGreaterThan(100);
    expect(seam.result.sprues).toBe(1);
    expect(seam.result.warnings).not.toContain("airTrap");
    expect(seam.result.analysis?.pourUp?.map((value) => Math.round(value))).toEqual([0, 1, 0]);
    expect(seam.result.analysis!.volume).toBeGreaterThan(seam.result.volume);
    expect(seam.result.warnings).toContain("hotCast");
    expect(moldNotes(seam.result, "twoPart").join(" ")).toContain("through the seam");
  }));

  it("falls back to the pour from the top where the seam lies level", () => withKernel((kernel, keep) => {
    const { result } = made(kernel, keep, pillar(kernel, keep), { direction: "z", pour: "seam" });
    expect(result.warnings).toContain("seamFallback");
    expect(result.analysis?.pourUp).toBeUndefined();
    expect(result.sprues).toBe(1);
  }));

  it("leads a wick hole out opposite the sprue", () => withKernel((kernel, keep) => {
    const body = pillar(kernel, keep);
    const plain = made(kernel, keep, body, { direction: "x", pour: "seam" });
    const wicked = made(kernel, keep, body, { direction: "x", pour: "seam", wick: true, wickDiameter: 2 });
    const both = (result: typeof plain) => keep(result.of("left").add(result.of("right")));
    // Below the pillar's foot (0) the mold's wall is 12 thick: solid without a wick, a 2 mm hole on the axis with one.
    expect(solidAt(kernel, keep, both(plain), 0, 0, -6, 0.8)).toBeGreaterThan(1.9);
    expect(solidAt(kernel, keep, both(wicked), 0, 0, -6, 0.8)).toBeLessThan(0.05);
    // Poured from the top the wick goes through the lower half's floor.
    const lying = made(kernel, keep, body, { direction: "z", wick: true });
    expect(solidAt(kernel, keep, lying.of("lower"), 0, 0, -2.5, 0.8)).toBeLessThan(0.05);
    expect(solidAt(kernel, keep, made(kernel, keep, body, { direction: "z" }).of("lower"), 0, 0, -2.5, 0.8)).toBeGreaterThan(1.9);
  }));

  it("puts a sealing lip round the cavity that fits its groove", () => withKernel((kernel, keep) => {
    const ball = scene(keep(kernel.Manifold.sphere(10, 96).translate([0, 0, 10])), keep);
    const plain = made(kernel, keep, ball, { direction: "z", sprue: false, prySlots: false });
    const sealed = made(kernel, keep, ball, { direction: "z", sprue: false, prySlots: false, seal: true });
    // A ridge 0.9 high and 2.4 wide at its foot round a circle of 20: about 2 * pi * 12.7 * 0.9 * 1.5.
    const ridge = sealed.of("lower").volume() - plain.of("lower").volume();
    expect(ridge).toBeGreaterThan(80);
    expect(ridge).toBeLessThan(140);
    expect(plain.of("upper").volume() - sealed.of("upper").volume()).toBeGreaterThan(ridge);
    expect(overlap(sealed.of("lower"), sealed.of("upper"), keep)).toBeLessThan(1e-6);
  }));
});

describe("two-part mold in four parts", () => {
  /** A block 30 x 30 x 24 with a blind hole 6 wide and 8 deep in each of its four sides, each off the middle. */
  const pocketed = (kernel: Kernel, keep: Keep) => {
    const hole = (turn: [number, number, number], at: [number, number, number]) => keep(keep(keep(kernel.Manifold.cylinder(9, 3, 3, 48)).rotate(turn)).translate(at));
    return scene(keep(keep(kernel.Manifold.cube([30, 30, 24], true).translate([0, 0, 12]))
      .subtract(hole([0, 90, 0], [7, 3.5, 12])).subtract(hole([0, -90, 0], [-7, -3.5, 12]))
      .subtract(hole([-90, 0, 0], [-3.5, 7, 12])).subtract(hole([90, 0, 0], [3.5, -7, 12]))), keep);
  };

  it("frees recesses on all four sides, which stick in any two halves, and suggests itself", () => withKernel((kernel, keep) => {
    const body = pocketed(kernel, keep);
    const two = made(kernel, keep, body, { castMaterial: "resin" });
    expect(two.result.warnings).toContain("undercut");
    expect(two.result.analysis?.fourParts?.axis).toBe("z");
    expect(two.result.analysis!.fourParts!.undercutPercent).toBeLessThan(0.5);
    const four = made(kernel, keep, body, { castMaterial: "resin", pieces: "four", direction: "z" });
    expect(four.result.warnings).not.toContain("undercut");
    expect(four.parts.map((part) => `${part.role}${part.number}`)).toEqual(["quarter1", "quarter2", "quarter3", "quarter4"]);
    expect(four.result.analysis?.fourParts).toBeUndefined();
    expect(moldNotes(four.result, "twoPart").join(" ")).toContain("Four parts");
  }));

  it("makes four side parts that meet without overlap, keyed across each seam", () => withKernel((kernel, keep) => {
    const body = pocketed(kernel, keep);
    const { result, parts } = made(kernel, keep, body, { pieces: "four", direction: "z", sprue: false });
    const master = up(body, keep);
    // A cone at two heights across each of the four seams.
    expect(result.keys).toBe(8);
    for (let a = 0; a < parts.length; a += 1) {
      expect(overlap(parts[a].solid, master, keep)).toBeLessThan(1e-6);
      for (let b = a + 1; b < parts.length; b += 1) expect(overlap(parts[a].solid, parts[b].solid, keep)).toBeLessThan(1e-6);
    }
    // Together with the master they fill the block: 54 x 54 x 34 (the wall 12 at the sides for the keys, 5 above and below).
    const together = parts.reduce((sum, part) => sum + part.solid.volume(), 0) + master.volume();
    // (less what the keys' holes are larger than their cones)
    expect(together).toBeGreaterThan(54 * 54 * 34 - 150);
    expect(together).toBeLessThan(54 * 54 * 34 + 1);
    // The right part reaches into the hole on the right side.
    expect(solidAt(kernel, keep, parts[0].solid, 12, 3.5, 12, 2)).toBeGreaterThan(12);
  }));

  it("lays each part on its outside to print and keeps the sprue in the seams", () => withKernel((kernel, keep) => {
    const { result, parts } = made(kernel, keep, pocketed(kernel, keep), { pieces: "four", direction: "z" }, true);
    expect(result.sprues).toBe(1);
    for (const part of parts) {
      expect(part.solid.boundingBox().min[2]).toBeCloseTo(0, 3);
      // Lying on its outer face a part is half the block's width high.
      expect(part.solid.boundingBox().max[2]).toBeCloseTo(27, 0);
    }
  }));
});

describe("the settings together", () => {
  /** A figure: a block 30 x 20 x 10 with two domes on it, one higher than the other. */
  const figure = (kernel: Kernel, keep: Keep) => {
    const dome = (radius: number, x: number) => keep(keep(keep(kernel.Manifold.sphere(radius, 48)).trimByPlane([0, 0, 1], 0)).translate([x, 0, 10]));
    return scene(keep(keep(kernel.Manifold.cube([30, 20, 10], true).translate([0, 0, 5])).add(dome(8, -6)).add(dome(4, 11))), keep);
  };

  it("makes every part whole whatever is switched on with it", () => withKernel((kernel, keep) => {
    const body = figure(kernel, keep);
    const everything = { ears: true, screws: true, bands: true, prySlots: true, seal: true, wick: true };
    const cases: Partial<MoldOptions>[] = [
      { kind: "twoPart", direction: "x", pour: "seam", ...everything },
      { kind: "twoPart", direction: "y", pour: "seam", ...everything },
      { kind: "twoPart", direction: "y", pour: "seam", outer: "shell", ...everything },
      { kind: "twoPart", direction: "z", outer: "shell", ...everything },
      { kind: "twoPart", pieces: "four", direction: "auto", outer: "shell", ...everything },
      { kind: "twoPart", pieces: "four", direction: "x", ownOpenings: true, ...everything },
      { kind: "skin", gap: 4, wall: 3, direction: "y" },
      { kind: "skin", gap: 8, shellSplit: false, vents: false },
      { kind: "halves", direction: "z", gap: 10 },
      { kind: "halves", direction: "y", gap: 25, moldMaterial: "plaster", shrinkage: 10 },
      { kind: "box", boxShape: "contour", gap: 6 },
    ];
    for (const options of cases) {
      for (const layout of [false, true]) {
        const { result, parts } = made(kernel, keep, body, options, layout);
        const label = JSON.stringify(options);
        for (const part of parts) {
          expect(part.solid.status(), label).toBe("NoError");
          expect(part.solid.volume(), label).toBeGreaterThan(100);
          // One body each: nothing has come loose of a part.
          expect(part.solid.decompose().filter((piece) => keep(piece).volume() > 0.5).length, `${label} ${part.role}`).toBe(1);
        }
        expect(result.mix!.totalG, label).toBeGreaterThan(0);
      }
    }
  }));

  it("vents the lower dome of a skin mold and tells of a high point a seam cannot vent", () => withKernel((kernel, keep) => {
    const body = figure(kernel, keep);
    // The sprue stands over the higher dome; the lower one has a roof of its own in the shell.
    expect(made(kernel, keep, body, { kind: "skin", gap: 4, wall: 3 }).result.vents).toBe(1);
    expect(made(kernel, keep, body, { kind: "skin", gap: 4, wall: 3, vents: false }).result.vents).toBe(0);
    // Standing on its end with the seam through both domes, the figure has no high point beside the seam.
    const seam = made(kernel, keep, body, { direction: "y", pour: "seam" });
    expect(seam.result.sprues).toBe(1);
    expect(seam.result.vents).toBe(1);
    expect(seam.result.warnings).not.toContain("airTrap");
  }));
});

describe("what to mix", () => {
  it("adds the allowance, splits by the ratio and prices the pour", () => {
    const options = normalizeMoldOptions({ ...MOLD_DEFAULTS, kind: "box", allowance: 10, mixA: 100, mixB: 10, price: 30 });
    const mix = moldMix(500, options);
    expect(mix.material).toBe("silicone");
    expect(mix.volume).toBeCloseTo(550, 6);
    expect(mix.totalG).toBeCloseTo(605, 6);
    expect(mix.aG).toBeCloseTo(550, 6);
    expect(mix.bG).toBeCloseTo(55, 6);
    expect(mix.cost).toBeCloseTo(18.15, 6);
    // A cast takes its own density, and a material that is not mixed from two has one part.
    const wax = moldMix(100, normalizeMoldOptions({ ...MOLD_DEFAULTS, kind: "twoPart", castMaterial: "wax", density: 0.9, allowance: 0, mixB: 0 }));
    expect(wax.totalG).toBeCloseTo(90, 6);
    expect(wax.bG).toBe(0);
    expect(wax.cost).toBeNull();
  });
});
