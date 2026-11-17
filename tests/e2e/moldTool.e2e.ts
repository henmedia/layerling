import { describe, expect, it } from "vitest";
import Module from "manifold-3d";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { MOLD_DEFAULTS, moldDieClearance, moldForSolid, normalizeMoldOptions, type MoldOptions } from "@/lib/moldTool";

type Solid = { delete?: () => void };

async function runtime() {
  const manifold = await Module();
  manifold.setup();
  return manifold;
}

type Kernel = Awaited<ReturnType<typeof runtime>>;
type Body = ReturnType<Kernel["Manifold"]["cube"]>;

const SCENE_TO_UP = [1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1] as const;

/** From z up to the scene's y up. */
function toScene(body: Body, created: Solid[]) {
  const turned = body.rotate([-90, 0, 0]);
  created.push(turned);
  return turned;
}
function toUp(body: Body, created: Solid[]) {
  const turned = body.transform([...SCENE_TO_UP] as never);
  created.push(turned);
  return turned;
}

/** A figure: a block 30 x 20 x 10 with a dome 18 wide on it, its top at 19 mm. */
function figure(kernel: Kernel, created: Solid[]) {
  const { Manifold } = kernel;
  const keep = <T extends Solid>(value: T) => (created.push(value), value);
  const base = keep(Manifold.cube([30, 20, 10], true).translate([0, 0, 5]));
  const ball = keep(keep(keep(Manifold.sphere(9, 64)).trimByPlane([0, 0, 1], 0)).translate([0, 0, 10]));
  return toScene(keep(base.add(ball)), created);
}

/** A mushroom: a stem 8 wide and 20 high under a cap 24 wide and 6 high. */
function mushroom(kernel: Kernel, created: Solid[]) {
  const { Manifold } = kernel;
  const keep = <T extends Solid>(value: T) => (created.push(value), value);
  const stem = keep(Manifold.cylinder(20.5, 4, 4, 48));
  const cap = keep(keep(Manifold.cylinder(6, 12, 12, 64)).translate([0, 0, 20]));
  return toScene(keep(stem.add(cap)), created);
}

/** A star-ish plate 4 mm thick for the die: a 40 x 30 rectangle with a round notch. */
function badge(kernel: Kernel, created: Solid[]) {
  const { Manifold } = kernel;
  const keep = <T extends Solid>(value: T) => (created.push(value), value);
  const plate = keep(Manifold.cube([40, 30, 4], true).translate([0, 0, 2]));
  const notch = keep(keep(Manifold.cylinder(6, 6, 6, 48)).translate([20, 0, -1]));
  return toScene(keep(plate.subtract(notch)), created);
}

function made(kernel: Kernel, body: Body, options: Partial<MoldOptions>, layout = true) {
  // These cases were written for a mold opening up and down; the direction chosen by itself has tests of its own.
  const result = moldForSolid(kernel, body, normalizeMoldOptions({ ...MOLD_DEFAULTS, direction: "z", shrinkage: 0, ...options }), layout);
  if ("error" in result) throw new Error(`${result.error} ${result.message ?? ""}`);
  return result;
}

function overlap(a: Body, b: Body) {
  const both = a.intersect(b);
  const volume = both.volume();
  both.delete();
  return volume;
}

/** Where the meshes for the pictures go, when asked for (MOLD_OUT). */
function saveStl(name: string, body: Body) {
  const out = process.env.MOLD_OUT;
  if (!out) return;
  mkdirSync(out, { recursive: true });
  const mesh = body.getMesh();
  const lines = ["solid m"];
  for (let index = 0; index < mesh.triVerts.length; index += 3) {
    lines.push(" facet normal 0 0 0", "  outer loop");
    for (let corner = 0; corner < 3; corner += 1) {
      const at = mesh.triVerts[index + corner] * mesh.numProp;
      // The scene's (x, y up, z) to the file's z up.
      lines.push(`   vertex ${mesh.vertProperties[at]} ${-mesh.vertProperties[at + 2]} ${mesh.vertProperties[at + 1]}`);
    }
    lines.push("  endloop", " endfacet");
  }
  lines.push("endsolid m");
  writeFileSync(join(out, `${name}.stl`), lines.join("\n"));
}

describe("molds and dies", () => {
  it("keeps the settings within their ranges", () => {
    const options = normalizeMoldOptions({ kind: "nonsense", wall: 0.5, parting: 200, keyFit: "0.3", dieMode: "cut", pins: "false" });
    expect(options.kind).toBe("twoPart");
    expect(options.wall).toBe(2);
    expect(options.parting).toBe(95);
    expect(options.keyFit).toBe(0.3);
    expect(options.dieMode).toBe("cut");
    expect(options.pins).toBe(false);
    expect(moldDieClearance("form", 1.5)).toBe(1.5);
    expect(moldDieClearance("cut", 1)).toBe(0.07);
    expect(moldDieClearance("cut", 0.3)).toBe(0.05);
  });

  it("makes a two-part mold whose halves close round the master without running into each other", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const master = figure(kernel, created);
      const closed = made(kernel, master, { kind: "twoPart", parting: 40, autoParting: false }, false);
      expect(closed.parts.map((part) => part.role)).toEqual(["lower", "upper"]);
      const [lower, upper] = closed.parts.map((part) => part.solid);
      created.push(lower, upper);
      expect(closed.keys).toBe(4);
      // The air rises along the dome to the sprue: no vent needed.
      expect(closed.vents).toBe(0);
      expect(closed.warnings).toEqual([]);
      // The keys sit in their holes, and nothing of the mold is in the master's room.
      expect(overlap(lower, upper)).toBeLessThan(0.01);
      expect(overlap(lower, master)).toBeLessThan(0.01);
      expect(overlap(upper, master)).toBeLessThan(0.01);
      expect(closed.volume).toBeCloseTo(master.volume() / 1000, 3);
      // Each half one piece, with no holes through it but the sprue and vents.
      expect(lower.decompose().length).toBe(1);
      expect(upper.decompose().length).toBe(1);

      const laid = made(kernel, master, { kind: "twoPart", parting: 40, autoParting: false, ears: true });
      for (const part of laid.parts) {
        created.push(part.solid);
        saveStl(`twoPart-${part.role}`, part.solid);
        const box = part.solid.boundingBox();
        expect(box.min[1]).toBeCloseTo(0, 5);
        // Beside the master, not in it.
        expect(box.min[0]).toBeGreaterThan(master.boundingBox().max[0]);
      }
      // Laid out with the parting face up: the upper half's top is flat where the funnel opens, the keys' holes face up.
      saveStl("twoPart-master", master);
    } finally {
      created.forEach((value) => value.delete?.());
    }
  });

  it("makes a two-part mold of a fine master with hundreds of thousands of points (reported: maximum call stack exceeded)", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      // A dome of 1024 segments round on a block: about 130,000 points, more than Math.max(...points) takes.
      const keep = <T extends Solid>(value: T) => (created.push(value), value);
      const base = keep(kernel.Manifold.cube([30, 30, 6], true).translate([0, 0, 3]));
      const dome = keep(keep(keep(kernel.Manifold.sphere(12, 1024)).trimByPlane([0, 0, 1], 0)).translate([0, 0, 6]));
      const master = toScene(keep(base.add(dome)), created);
      expect(master.numVert()).toBeGreaterThan(120_000);
      const result = made(kernel, master, { kind: "twoPart", sprue: true, vents: true });
      created.push(...result.parts.map((part) => part.solid as Solid));
      expect(result.parts.length).toBeGreaterThanOrEqual(2);
    } finally {
      created.forEach((entry) => entry.delete());
    }
  }, 300000);

  it("vents the peaks the sprue does not reach", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const { Manifold } = kernel;
      const keep = <T extends Solid>(value: T) => (created.push(value), value);
      // Two towers on a plate: the sprue goes into the taller, a vent out of the lower one.
      const plate = keep(Manifold.cube([50, 20, 4], true).translate([0, 0, 2]));
      const tall = keep(keep(Manifold.cylinder(20, 5, 5, 48)).translate([-15, 0, 0]));
      const short = keep(keep(Manifold.cylinder(14, 5, 5, 48)).translate([15, 0, 0]));
      const master = toScene(keep(Manifold.union([plate, tall, short])), created);
      const closed = made(kernel, master, { kind: "twoPart", parting: 10, autoParting: false }, false);
      created.push(...closed.parts.map((part) => part.solid));
      // One vent on the short tower's top (its rim points level with each other count once each side of the grid).
      expect(closed.vents).toBeGreaterThanOrEqual(1);
      const upper = toUp(closed.parts[1].solid, created);
      // Something open above the short tower's top: the vent.
      const above = upper.slice(17);
      created.push(above);
      const probe = kernel.CrossSection.circle(6, 32).translate([15, 0]);
      const covered = above.intersect(probe);
      created.push(probe, covered);
      expect(covered.area()).toBeLessThan(Math.PI * 36 - 1);
      expect(overlap(upper, toUp(master, created))).toBeLessThan(0.01);
    } finally {
      created.forEach((value) => value.delete?.());
    }
  });

  it("warns of an undercut when the halves part where they cannot come off", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      // A ball on a block: the upper half cannot come off the ball's lower half, wherever it parts.
      const { Manifold } = kernel;
      const ball = toScene(created[created.push(Manifold.union([Manifold.cube([30, 20, 10], true).translate([0, 0, 5]), Manifold.sphere(9, 64).translate([0, 0, 19])])) - 1] as Body, created);
      const round = made(kernel, ball, { kind: "twoPart", parting: 35, autoParting: false });
      created.push(...round.parts.map((part) => part.solid));
      expect(round.warnings).toContain("undercut");
      const master = mushroom(kernel, created);
      const stuck = made(kernel, master, { kind: "twoPart", parting: 50, autoParting: false });
      created.push(...stuck.parts.map((part) => part.solid));
      expect(stuck.warnings).toContain("undercut");
      const free = made(kernel, master, { kind: "twoPart", parting: 78, autoParting: false });
      created.push(...free.parts.map((part) => part.solid));
      expect(free.warnings).not.toContain("undercut");
      const tray = made(kernel, master, { kind: "tray" });
      created.push(...tray.parts.map((part) => part.solid));
      expect(tray.warnings).toContain("undercut");
      // Found by itself: the cap's bottom, where the mushroom comes out of both halves.
      const found = made(kernel, master, { kind: "twoPart" });
      created.push(...found.parts.map((part) => part.solid));
      expect(found.warnings).not.toContain("undercut");
      expect(found.partingFound).toBe(true);
      expect(found.parting).toBeGreaterThanOrEqual(75);
      expect(found.parting).toBeLessThanOrEqual(80);
      // A cone parts at its base: the lower half a plate with the keys, the whole cone in the upper half.
      const cone = toScene(created[created.push(Manifold.cylinder(24, 15, 0.5, 64)) - 1] as Body, created);
      const based = made(kernel, cone, { kind: "twoPart" }, false);
      created.push(...based.parts.map((part) => part.solid));
      expect(based.parting).toBe(0);
      expect(based.partingFound).toBe(true);
      expect(based.warnings).toEqual([]);
      expect(overlap(based.parts[0].solid, based.parts[1].solid)).toBeLessThan(0.01);
      expect(overlap(based.parts[1].solid, cone)).toBeLessThan(0.01);
      // A ball on a block cannot come out anywhere: the widest level, with the warning.
      const nowhere = made(kernel, ball, { kind: "twoPart" });
      created.push(...nowhere.parts.map((part) => part.solid));
      expect(nowhere.partingFound).toBe(false);
      expect(nowhere.warnings).toContain("undercut");
    } finally {
      created.forEach((value) => value.delete?.());
    }
  });

  it("makes a pour box whose frame stands in the base's groove round the master", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const master = figure(kernel, created);
      const closed = made(kernel, master, { kind: "box", gap: 10, wall: 2.5, above: 12 }, false);
      const [base, frame] = closed.parts.map((part) => part.solid);
      created.push(base, frame);
      expect(closed.parts.map((part) => part.role)).toEqual(["base", "frame"]);
      expect(overlap(base, frame)).toBeLessThan(0.01);
      expect(overlap(frame, master)).toBeLessThan(0.01);
      // The master sits 0.6 mm deep in its seat.
      expect(overlap(base, master)).toBeLessThan(0.01);
      const frameBox = frame.boundingBox();
      expect(frameBox.max[1] - master.boundingBox().max[1]).toBeCloseTo(12, 3);
      // Silicone: 50 x 40 inside, 31 high, less the master.
      expect(closed.volume).toBeCloseTo((50 * 40 * 31 - master.volume()) / 1000, 1);
      const laid = made(kernel, master, { kind: "box" });
      laid.parts.forEach((part) => (created.push(part.solid), saveStl(`box-${part.role}`, part.solid)));
    } finally {
      created.forEach((value) => value.delete?.());
    }
  });

  it("makes an open tray mold the master's way up when turned out", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const master = figure(kernel, created);
      const tray = made(kernel, master, { kind: "tray", wall: 3, floor: 3 });
      const [part] = tray.parts;
      created.push(part.solid);
      saveStl("tray", part.solid);
      expect(tray.parts).toHaveLength(1);
      // Upside down the dome is at the bottom and the block above it: it comes out.
      expect(tray.warnings).toEqual([]);
      const box = part.solid.boundingBox();
      expect(box.max[1] - box.min[1]).toBeCloseTo(19 + 3, 2);
      expect(tray.volume).toBeCloseTo(master.volume() / 1000, 3);
    } finally {
      created.forEach((value) => value.delete?.());
    }
  });

  it("makes a punch and die that close over the sheet with the clearance all round", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const master = badge(kernel, created);
      for (const dieMode of ["form", "cut"] as const) {
        const material = 1;
        const closed = made(kernel, master, { kind: "die", dieMode, material, depth: 5, base: 5 }, false);
        expect(closed.parts.map((part) => part.role)).toEqual(["punch", "die"]);
        expect(closed.clearance).toBe(moldDieClearance(dieMode, material));
        expect(closed.warnings).toEqual([]);
        const [punch, die] = closed.parts.map((part) => toUp(part.solid, created));
        created.push(...closed.parts.map((part) => part.solid));
        const plate = punch.boundingBox();
        const middleY = (plate.min[1] + plate.max[1]) / 2;
        // The die turned over onto the punch, its face the sheet's thickness above the punch's plate.
        const turned = die.rotate([180, 0, 0]);
        const onto = turned.translate([0, 2 * middleY, 5 + material + 5 + 5]);
        created.push(turned, onto);
        expect(overlap(punch, onto)).toBeLessThan(0.01);
        // A sheet lying on the punch's top fits under the die in forming; pressed through it, the gap is the clearance.
        const sideways = onto.translate([closed.clearance! + 0.05, 0, 0]);
        created.push(sideways);
        expect(overlap(punch, sideways)).toBeGreaterThan(0.01);
        if (dieMode === "cut") {
          // The cavity goes through, so the slug falls out.
          const slice = die.slice(1);
          created.push(slice);
          expect(slice.area()).toBeLessThan((plate.max[0] - plate.min[0]) * (plate.max[1] - plate.min[1]) - 40 * 30 * 0.8);
        }
        const laid = made(kernel, master, { kind: "die", dieMode, material });
        laid.parts.forEach((part) => (created.push(part.solid), saveStl(`die-${dieMode}-${part.role}`, part.solid)));
      }
    } finally {
      created.forEach((value) => value.delete?.());
    }
  });
});
