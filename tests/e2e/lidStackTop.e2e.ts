import { describe, expect, it } from "vitest";
import Module from "manifold-3d";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { hingeKnuckleRadius, lidForSolid, normalizeLidOptions } from "@/lib/lidTool";

type Solid = { delete?: () => void };

async function runtime() {
  const manifold = await Module();
  manifold.setup();
  return manifold;
}

type Kernel = Awaited<ReturnType<typeof runtime>>;
type Body = ReturnType<Kernel["Manifold"]["cube"]>;

const WIDTH = 80;
const DEPTH = 60;
const HEIGHT = 40;
const WALL = 2;
const FOOT = 3;
const INSET = WALL + 0.25;

/**
 * A box made stackable with a foot (the hollowing's stacking): 80 wide (x), 40 high (y, the scene's up) and 60 deep
 * (z), 2 mm walls, its foot 2.25 mm in and 3 mm high, widening at 45 degrees above it, the floor at 7.25 mm; its back is -z.
 */
function stackingBox(kernel: Kernel, created: Solid[]) {
  const { Manifold } = kernel;
  const keep = <T extends Solid>(value: T) => (created.push(value), value);
  const foot = keep(keep(Manifold.cube([WIDTH - 2 * INSET, DEPTH - 2 * INSET, FOOT], true)).translate([0, 0, FOOT / 2]));
  const low = keep(keep(Manifold.cube([WIDTH - 2 * INSET, DEPTH - 2 * INSET, 0.01], true)).translate([0, 0, FOOT]));
  const high = keep(keep(Manifold.cube([WIDTH, DEPTH, 0.01], true)).translate([0, 0, FOOT + INSET]));
  const flare = keep(Manifold.hull([low, high]));
  const upper = keep(keep(Manifold.cube([WIDTH, DEPTH, HEIGHT - FOOT - INSET], true)).translate([0, 0, (HEIGHT + FOOT + INSET) / 2]));
  const cavity = keep(keep(Manifold.cube([WIDTH - 2 * WALL, DEPTH - 2 * WALL, HEIGHT], true)).translate([0, 0, FOOT + INSET + WALL + HEIGHT / 2]));
  const up = keep(keep(Manifold.union([foot, flare, upper])).subtract(cavity));
  // From z up to the scene's y up, the frame's y (the back) to the scene's -z.
  return keep(up.rotate([-90, 0, 0]));
}

/** The lid as it closes the body: it prints upright, so it is only moved, its foot in the opening and flush at the front. */
function closing(body: Body, lid: Body, depth: number, created: Solid[]) {
  const bodyBox = body.boundingBox();
  const box = lid.boundingBox();
  const placed = lid.translate([bodyBox.min[0] - box.min[0], bodyBox.max[1] - depth - box.min[1], bodyBox.max[2] - box.max[2]]);
  created.push(placed);
  return placed;
}

function swung(lid: Body, y: number, z: number, degrees: number, created: Solid[]) {
  const there = lid.translate([0, -y, -z]);
  const turned = there.rotate([-degrees, 0, 0]);
  const back = turned.translate([0, y, z]);
  created.push(there, turned, back);
  return back;
}

/** Where the meshes for the pictures and the files to print go, when asked for (LID_STACK_OUT). */
function save(name: string, solid: Body) {
  const out = process.env.LID_STACK_OUT;
  if (!out) return;
  mkdirSync(out, { recursive: true });
  const mesh = solid.getMesh();
  const v: number[] = [];
  for (let index = 0; index < mesh.vertProperties.length; index += mesh.numProp) v.push(mesh.vertProperties[index], mesh.vertProperties[index + 1], mesh.vertProperties[index + 2]);
  writeFileSync(join(out, `${name}.json`), JSON.stringify({ v, i: Array.from(mesh.triVerts) }));
  // Binary STL, z up as slicers expect: the scene's y is up, its -z the back.
  const count = mesh.triVerts.length / 3;
  const buffer = Buffer.alloc(84 + count * 50);
  buffer.writeUInt32LE(count, 80);
  const point = (index: number) => [v[3 * index], -v[3 * index + 2], v[3 * index + 1]];
  for (let face = 0; face < count; face += 1) {
    const at = 84 + face * 50;
    [0, 1, 2].forEach((corner) => point(mesh.triVerts[3 * face + corner]).forEach((value, axis) => buffer.writeFloatLE(value, at + 12 + corner * 12 + axis * 4)));
  }
  writeFileSync(join(out, `${name}.stl`), buffer);
}

const OPTIONS = { type: "plug", thickness: 2, gap: 0.2, depth: 4, hinge: true, hingePin: 1.75, hingeGap: 0.3, stackTop: true };

describe("a hinged lid with a stacking top, printed upright (real Manifold kernel)", () => {
  it("is off unless asked for, and not with a screw-in or slide-in lid nor another hinge style", async () => {
    expect(normalizeLidOptions().stackTop).toBe(false);
    expect(normalizeLidOptions({ stackTop: "true" }).stackTop).toBe(true);
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const body = stackingBox(kernel, created);
      expect(lidForSolid(kernel, body, normalizeLidOptions({ ...OPTIONS, type: "slide", hinge: false }))).toEqual({ error: { code: "stackTopType" } });
      expect(lidForSolid(kernel, body, normalizeLidOptions({ ...OPTIONS, type: "screwIn", hinge: false }))).toEqual({ error: { code: "stackTopType" } });
      expect(lidForSolid(kernel, body, normalizeLidOptions({ ...OPTIONS, hingeStyle: "flush" }))).toEqual({ error: { code: "stackTopType" } });
      expect(lidForSolid(kernel, body, normalizeLidOptions({ ...OPTIONS, magnets: true }))).toEqual({ error: { code: "stackTopExtras" } });
      expect(lidForSolid(kernel, body, normalizeLidOptions({ ...OPTIONS, clickBumps: true }))).toEqual({ error: { code: "stackTopExtras" } });
    } finally {
      Array.from(new Set(created)).forEach((value) => value.delete?.());
    }
  });

  it("closes the box, swings open without touching it, and takes the next box's foot", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const body = stackingBox(kernel, created);
      const result = lidForSolid(kernel, body, normalizeLidOptions(OPTIONS));
      if ("error" in result) throw new Error(JSON.stringify(result.error));
      const { knuckles } = result.hinge!;
      created.push(result.lid, knuckles);
      expect(result.lid.status()).toBe("NoError");
      expect(result.lid.decompose().length).toBe(1);
      // It lies on its foot as it prints, the lowest point on the plate.
      expect(result.lid.boundingBox().min[1]).toBeCloseTo(0, 6);
      const whole = body.add(knuckles);
      created.push(whole);
      expect(whole.decompose().length).toBe(1);
      const lid = closing(body, result.lid, OPTIONS.depth, created);
      const lidBox = lid.boundingBox();
      const radius = hingeKnuckleRadius(normalizeLidOptions(OPTIONS));
      // The knuckles are flush with the top of the tray's rim; the axis behind the back by the radius and the gap.
      const axisY = lidBox.max[1] - radius;
      const axisZ = -DEPTH / 2 - radius - OPTIONS.hingeGap;
      expect(lidBox.min[2]).toBeCloseTo(axisZ - radius, 3);
      const touching = (solid: Body) => {
        const common = whole.intersect(solid);
        created.push(common);
        return common.volume();
      };
      expect(touching(lid)).toBeLessThan(1e-3);
      for (let degrees = 10; degrees <= 180; degrees += 10) expect(touching(swung(lid, axisY, axisZ, degrees, created)), `${degrees} degrees`).toBeLessThan(1e-3);
      // The next box stands on the tray's rim, its foot in the tray, and it cannot slide off sideways.
      const next = body.translate([0, lidBox.max[1] - FOOT, 0]);
      created.push(next);
      const nextCommon = next.intersect(lid);
      created.push(nextCommon);
      expect(nextCommon.volume()).toBeLessThan(1e-3);
      const slid = body.translate([1, lidBox.max[1] - FOOT, 0]);
      const slidCommon = slid.intersect(lid);
      created.push(slid, slidCommon);
      expect(slidCommon.volume()).toBeGreaterThan(1);
      // The lid's knuckles print without support: no point of the lid lies below the 45 degree line from its back face
      // above the flare. Checked as: the lid's part behind the box, cut at each height, never reaches farther out than
      // the height above the flare's top.
      const plateLow = body.boundingBox().max[1] + WALL + OPTIONS.gap;
      for (let y = lidBox.min[1] + 0.05; y < lidBox.max[1]; y += 0.25) {
        const slab = kernel.Manifold.cube([WIDTH + 20, 0.02, 40]).translate([-WIDTH / 2 - 10, y, -DEPTH / 2 - 30]);
        const behind = lid.intersect(slab);
        created.push(slab, behind);
        if (behind.isEmpty()) continue;
        const reach = -DEPTH / 2 - behind.boundingBox().min[2];
        expect(reach, `at ${y.toFixed(2)}`).toBeLessThanOrEqual(Math.max(0, y - plateLow) + 0.15);
      }
      // The body's knuckles stand on the back wall with a strong root: just over the rim each is at least 3 mm thick.
      const top = body.boundingBox().max[1];
      const slice = kernel.Manifold.cube([WIDTH + 20, 0.02, 30]).translate([-WIDTH / 2 - 10, top + 1, -DEPTH / 2 - 20]);
      const arms = knuckles.intersect(slice);
      created.push(slice, arms);
      for (const arm of arms.decompose()) {
        created.push(arm);
        const box = arm.boundingBox();
        expect(box.max[2] - box.min[2], "an arm just over the rim").toBeGreaterThan(3);
      }
      save("box", whole);
      save("lid-print", result.lid);
      save("lid-closed", lid);
      save("next", next);
      const open = swung(lid, axisY, axisZ, 110, created);
      save("lid-open", open);
    } finally {
      Array.from(new Set(created)).forEach((value) => value.delete?.());
    }
  });
});

/** A round box made stackable the same way: 60 across, 40 high, 2 mm walls, the foot 2.25 mm in and 3 mm high. */
function roundStackingBox(kernel: Kernel, created: Solid[]) {
  const { Manifold } = kernel;
  const keep = <T extends Solid>(value: T) => (created.push(value), value);
  const radius = 30;
  const foot = keep(Manifold.cylinder(FOOT, radius - INSET, radius - INSET, 128));
  const flare = keep(keep(Manifold.cylinder(INSET, radius - INSET, radius, 128)).translate([0, 0, FOOT]));
  const upper = keep(keep(Manifold.cylinder(HEIGHT - FOOT - INSET, radius, radius, 128)).translate([0, 0, FOOT + INSET]));
  const cavity = keep(keep(Manifold.cylinder(HEIGHT, radius - WALL, radius - WALL, 128)).translate([0, 0, FOOT + INSET + WALL]));
  const up = keep(keep(Manifold.union([foot, flare, upper])).subtract(cavity));
  return keep(up.rotate([-90, 0, 0]));
}

describe("a stacking top on the other kinds of lid, each printed upright (real Manifold kernel)", () => {
  const cases: { type: string; round: boolean; extra?: "thread" | "lugs" }[] = [
    { type: "flat", round: false },
    { type: "cap", round: false },
    { type: "both", round: false },
    { type: "screw", round: true, extra: "thread" },
    { type: "bayonet", round: true, extra: "lugs" },
  ];
  for (const { type, round, extra } of cases) {
    it(`${type}: closes the box without touching it and takes the next box's foot in its tray`, async () => {
      const kernel = await runtime();
      const created: Solid[] = [];
      try {
        const body = round ? roundStackingBox(kernel, created) : stackingBox(kernel, created);
        const result = lidForSolid(kernel, body, normalizeLidOptions({ type, thickness: 2, gap: 0.2, depth: 4, stackTop: true }));
        if ("error" in result) throw new Error(JSON.stringify(result.error));
        created.push(result.lid);
        expect(result.lid.status()).toBe("NoError");
        expect(result.lid.decompose().length).toBe(1);
        expect(result.lid.boundingBox().min[1]).toBeCloseTo(0, 6);
        const added = extra === "thread" ? result.screw?.thread : extra === "lugs" ? result.bayonet?.lugs : null;
        if (extra) expect(added).toBeTruthy();
        const whole = added ? body.add(added) : body;
        if (added) created.push(added, whole);
        // Closed: its tray's rim 2 + 3 mm over the rim, in the middle of the body.
        const bodyBox = body.boundingBox();
        const box = result.lid.boundingBox();
        const lid = result.lid.translate([
          (bodyBox.min[0] + bodyBox.max[0]) / 2 - (box.min[0] + box.max[0]) / 2,
          HEIGHT + 5 - box.max[1],
          (bodyBox.min[2] + bodyBox.max[2]) / 2 - (box.min[2] + box.max[2]) / 2,
        ]);
        created.push(lid);
        const common = whole.intersect(lid);
        created.push(common);
        expect(common.volume()).toBeLessThan(1e-3);
        // Under a cap a solid foot fills the opening, so its plate does not hang over it as it prints.
        if (type !== "flat") expect(lid.boundingBox().min[1]).toBeLessThan(HEIGHT - 3.5);
        const next = whole.translate([0, HEIGHT + 5 - FOOT, 0]);
        const onTop = next.intersect(lid);
        const slid = whole.translate([1, HEIGHT + 5 - FOOT, 0]);
        const pushed = slid.intersect(lid);
        created.push(next, onTop, slid, pushed);
        expect(onTop.volume()).toBeLessThan(1e-3);
        expect(pushed.volume()).toBeGreaterThan(1);
        save(`${type}-lid`, result.lid);
      } finally {
        Array.from(new Set(created)).forEach((value) => value.delete?.());
      }
    });
  }

  it("takes latches: the lid's cheeks grow out of its face, the body's pins stay, the clip is that much longer", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const body = stackingBox(kernel, created);
      for (const hinge of [false, true]) {
        const options = normalizeLidOptions({ ...OPTIONS, hinge, latches: 2 });
        const result = lidForSolid(kernel, body, options);
        if ("error" in result) throw new Error(JSON.stringify(result.error));
        created.push(result.lid);
        expect(result.lid.decompose().length).toBe(1);
        expect(result.latch?.count).toBe(2);
        const parts = [body, result.latch!.body, ...(result.hinge ? [result.hinge.knuckles] : [])];
        const whole = kernel.Manifold.union(parts);
        created.push(result.latch!.body, result.latch!.clips, whole);
        // Closed: its back at the body's back (behind it the knuckles with a hinge), its foot in the opening.
        const radius = hingeKnuckleRadius(options);
        const back = -DEPTH / 2 - (hinge ? 2 * radius + OPTIONS.hingeGap : 0);
        const own = result.lid.boundingBox();
        const lid = result.lid.translate([-WIDTH / 2 - own.min[0], HEIGHT - OPTIONS.depth - own.min[1], back - own.min[2]]);
        created.push(lid);
        const common = whole.intersect(lid);
        created.push(common);
        expect(common.volume()).toBeLessThan(1e-3);
        // The clips are longer than without a stacking top.
        const plain = lidForSolid(kernel, body, normalizeLidOptions({ ...OPTIONS, hinge, latches: 2, stackTop: false }));
        if ("error" in plain) throw new Error(JSON.stringify(plain.error));
        created.push(plain.lid, plain.latch!.clips, plain.latch!.body);
        const length = (clips: Body) => { const box = clips.boundingBox(); return box.max[0] - box.min[0]; };
        expect(length(result.latch!.clips)).toBeGreaterThan(length(plain.latch!.clips) + 5);
      }
    } finally {
      Array.from(new Set(created)).forEach((value) => value.delete?.());
    }
  });

  it("flat with a hinge: swings open without touching the box", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const body = stackingBox(kernel, created);
      const options = normalizeLidOptions({ ...OPTIONS, type: "flat" });
      const result = lidForSolid(kernel, body, options);
      if ("error" in result) throw new Error(JSON.stringify(result.error));
      const { knuckles } = result.hinge!;
      created.push(result.lid, knuckles);
      expect(result.lid.decompose().length).toBe(1);
      const whole = body.add(knuckles);
      created.push(whole);
      const lid = closing(body, result.lid, 0, created);
      const lidBox = lid.boundingBox();
      const radius = hingeKnuckleRadius(options);
      const axisY = lidBox.max[1] - radius;
      const axisZ = -DEPTH / 2 - radius - OPTIONS.hingeGap;
      for (let degrees = 0; degrees <= 180; degrees += 10) {
        const common = whole.intersect(swung(lid, axisY, axisZ, degrees, created));
        created.push(common);
        expect(common.volume(), `${degrees} degrees`).toBeLessThan(1e-3);
      }
    } finally {
      Array.from(new Set(created)).forEach((value) => value.delete?.());
    }
  });
});
