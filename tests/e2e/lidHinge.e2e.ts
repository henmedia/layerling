import { describe, expect, it } from "vitest";
import Module from "manifold-3d";
import { hingeKnuckleRadius, lidForSolid, normalizeLidOptions } from "@/lib/lidTool";

type Solid = { delete?: () => void };

function dispose(values: Solid[]) {
  Array.from(new Set(values)).forEach((value) => value?.delete?.());
}

async function runtime() {
  const manifold = await Module();
  manifold.setup();
  return manifold;
}

type Kernel = Awaited<ReturnType<typeof runtime>>;
type Body = ReturnType<Kernel["Manifold"]["cube"]>;

/** A box 60 wide (x), 30 high (y, the scene's up) and 40 deep (z), with 2 mm walls and floor, open at the top; its back is -z. */
function openBox(kernel: Kernel, created: Solid[]) {
  const outer = kernel.Manifold.cube([60, 30, 40], true).translate([0, 15, 0]);
  const inner = kernel.Manifold.cube([56, 30, 36], true).translate([0, 17, 0]);
  const body = outer.subtract(inner);
  created.push(outer, inner, body);
  return body;
}

/**
 * The hinged lid turned back over and set on the body as it closes it: its plate on the rim, flush with the body's
 * sides and front (its knuckles stand out at the back).
 */
function closing(body: Body, lid: Body, thickness: number, created: Solid[]) {
  const turned = lid.rotate([180, 0, 0]);
  const bodyBox = body.boundingBox();
  const box = turned.boundingBox();
  const placed = turned.translate([bodyBox.min[0] - box.min[0], bodyBox.max[1] + thickness - box.max[1], bodyBox.max[2] - box.max[2]]);
  created.push(turned, placed);
  return placed;
}

/** The lid swung open by `degrees` about the hinge's axis (along x, at height `y` and depth `z`): its front rising. */
function swung(lid: Body, y: number, z: number, degrees: number, created: Solid[]) {
  const there = lid.translate([0, -y, -z]);
  const turned = there.rotate([-degrees, 0, 0]);
  const back = turned.translate([0, y, z]);
  created.push(there, turned, back);
  return back;
}

const HINGED = { type: "plug", thickness: 2, gap: 0.2, depth: 4, wall: 1.6, hinge: true, hingePin: 1.75, hingeGap: 0.3 };

describe("a lid with a hinge along the back or another side (real Manifold kernel)", () => {
  it("knows its options: off unless asked for, an odd number of knuckles, sizes in range", () => {
    expect(normalizeLidOptions().hinge).toBe(false);
    expect(normalizeLidOptions({ hinge: "true" }).hinge).toBe(true);
    expect(normalizeLidOptions({ hingeKnuckles: 4 }).hingeKnuckles).toBe(5);
    expect(normalizeLidOptions({ hingeKnuckles: 1 }).hingeKnuckles).toBe(3);
    expect(normalizeLidOptions({ hingeKnuckles: 0 }).hingeKnuckles).toBe(0);
    expect(normalizeLidOptions({ hingePin: 0.2, hingeGap: 5 })).toMatchObject({ hingePin: 1, hingeGap: 1 });
  });

  it("swings open about its pin without touching the box, from closed to nearly flat behind it", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const body = openBox(kernel, created);
      const result = lidForSolid(kernel, body, normalizeLidOptions(HINGED));
      if ("error" in result) throw new Error(JSON.stringify(result.error));
      expect(result.hinge).toBeDefined();
      const { knuckles, pin, count } = result.hinge!;
      created.push(result.lid, knuckles);
      expect(count).toBe(5);
      expect(pin).toBeNull();
      expect(knuckles.status()).toBe("NoError");
      expect(result.lid.status()).toBe("NoError");
      // The body's knuckles grow out of its back wall: with the box they are one piece, standing on its back.
      const whole = body.add(knuckles);
      created.push(whole);
      expect(whole.decompose().length).toBe(1);
      const knuckleBox = knuckles.boundingBox();
      expect(knuckleBox.max[2]).toBeLessThan(-19.5);
      expect(knuckleBox.min[1]).toBeGreaterThan(0.4);
      // The lid lies printed upside down, on its plate, the knuckles flush with it.
      expect(result.lid.boundingBox().min[1]).toBeCloseTo(0, 3);
      // Closed, it lies on the rim without overlapping, and the lid keeps the gap to the body's knuckles.
      const closed = closing(body, result.lid, 2, created);
      const overlap = closed.intersect(whole);
      created.push(overlap);
      expect(overlap.volume()).toBeLessThan(0.01);
      expect(closed.minGap(knuckles, 1)).toBeGreaterThan(0.25);
      // Swung open about the axis, flush with the lid's top and the gap behind the back, it never touches the box.
      const radius = hingeKnuckleRadius({ hingePin: 1.75 });
      const axisY = 30 + 2 - radius;
      const axisZ = -(20 + radius + 0.3);
      for (const degrees of [10, 30, 60, 90, 120, 150, 170]) {
        const open = swung(closed, axisY, axisZ, degrees, created);
        const hit = open.intersect(whole);
        created.push(hit);
        expect(hit.volume(), `open ${degrees} degrees`).toBeLessThan(0.01);
      }
      // A pin of 1.75 mm filament goes through every knuckle without touching one.
      const filament = kernel.Manifold.cylinder(70, 0.875, 0.875, 48).rotate([0, 90, 0]).translate([-35, axisY, axisZ]);
      created.push(filament);
      const onPin = [closed.intersect(filament), whole.intersect(filament)];
      created.push(...onPin);
      onPin.forEach((part) => expect(part.volume()).toBeLessThan(0.001));
    } finally {
      dispose(created);
    }
  });

  it("gives the pin's holes a point on top as each part is printed: up in the body, towards the inside in the lid", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    // Whether a tiny cube at (x, y, z) lies in the solid.
    const solidAt = (solid: Body, x: number, y: number, z: number) => {
      const probe = kernel.Manifold.cube([0.1, 0.1, 0.1], true).translate([x, y, z]);
      const hit = solid.intersect(probe);
      created.push(probe, hit);
      return hit.volume() > 0.0005;
    };
    try {
      const radius = hingeKnuckleRadius({ hingePin: 1.75 });
      const axisY = 30 + 2 - radius;
      const axisZ = -(20 + radius + 0.3);
      // Past the round hole (1.075 mm with the pin's 0.2 mm of play) but within its point (1.52 mm).
      const off = 1.25;
      // The middle of the first knuckle (the body's) and of the second (the lid's) along the 60 mm back.
      const bodyX = -23.7;
      const lidX = -11.9;
      for (const teardrop of [true, false]) {
        const body = openBox(kernel, created);
        const result = lidForSolid(kernel, body, normalizeLidOptions({ ...HINGED, hingeTeardrop: teardrop }));
        if ("error" in result) throw new Error(JSON.stringify(result.error));
        const knuckles = result.hinge!.knuckles;
        const closed = closing(body, result.lid, 2, created);
        created.push(result.lid, knuckles);
        expect(solidAt(knuckles, bodyX, axisY + off, axisZ), `body above, teardrop ${teardrop}`).toBe(!teardrop);
        expect(solidAt(knuckles, bodyX, axisY - off, axisZ), `body below, teardrop ${teardrop}`).toBe(true);
        expect(solidAt(closed, lidX, axisY - off, axisZ), `lid below, teardrop ${teardrop}`).toBe(!teardrop);
        expect(solidAt(closed, lidX, axisY + off, axisZ), `lid above, teardrop ${teardrop}`).toBe(true);
        // The round part is the same either way: the pin's hole with its play.
        expect(solidAt(knuckles, bodyX, axisY, axisZ + 1)).toBe(false);
        expect(solidAt(knuckles, bodyX, axisY, axisZ + 1.1)).toBe(true);
      }
    } finally {
      dispose(created);
    }
  });

  it("widens the pin's holes by the play asked for (#1220)", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    const solidAt = (solid: Body, x: number, y: number, z: number) => {
      const probe = kernel.Manifold.cube([0.1, 0.1, 0.1], true).translate([x, y, z]);
      const hit = solid.intersect(probe);
      created.push(probe, hit);
      return hit.volume() > 0.0009;
    };
    try {
      expect(normalizeLidOptions().hingePinPlay).toBe(0.2);
      for (const [play, free] of [[0.1, false], [0.4, true]] as const) {
        const radius = hingeKnuckleRadius({ hingePin: 1.75, hingePinPlay: play });
        const axisY = 30 + 2 - radius;
        const axisZ = -(20 + radius + 0.3);
        const body = openBox(kernel, created);
        const result = lidForSolid(kernel, body, normalizeLidOptions({ ...HINGED, hingePinPlay: play }));
        if ("error" in result) throw new Error(JSON.stringify(result.error));
        created.push(result.lid, result.hinge!.knuckles);
        // 1.125 mm from the axis, beside it in the first knuckle (the body's): inside the hole with 0.4 mm of play
        // (1.275 mm), in the knuckle's wall with 0.1 mm (0.975 mm).
        expect(solidAt(result.hinge!.knuckles, -23.7, axisY, axisZ + 1.125), `play ${play}`).toBe(!free);
      }
    } finally {
      dispose(created);
    }
  });

  it("goes along a round pot too: its knuckles on a block reaching in to the wall, and it swings open clear of the pot", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      // A pot 40 across and 30 high, its wall 2 mm.
      const outer = kernel.Manifold.cylinder(30, 20, 20, 96).rotate([-90, 0, 0]);
      const cavity = kernel.Manifold.cylinder(30, 18, 18, 96).rotate([-90, 0, 0]).translate([0, 2, 0]);
      const pot = outer.subtract(cavity);
      created.push(outer, cavity, pot);
      const result = lidForSolid(kernel, pot, normalizeLidOptions(HINGED));
      if ("error" in result) throw new Error(JSON.stringify(result.error));
      const { knuckles, count } = result.hinge!;
      created.push(result.lid, knuckles);
      // Where the wall stays within a knuckle's radius of the hinge's line: about 19 mm, three knuckles.
      expect(count).toBe(3);
      const knuckleBox = knuckles.boundingBox();
      expect(knuckleBox.max[0] - knuckleBox.min[0]).toBeGreaterThan(17);
      expect(knuckleBox.max[0] - knuckleBox.min[0]).toBeLessThan(20);
      // At the outer end of the first knuckle the wall has fallen away from the hinge's line: the block under it fills
      // the room between them (the wall at z = -17.9 there, the knuckle's own strip from -19.6).
      const solidAt = (solid: Body, x: number, y: number, z: number) => {
        const probe = kernel.Manifold.cube([0.1, 0.1, 0.1], true).translate([x, y, z]);
        const hit = solid.intersect(probe);
        created.push(probe, hit);
        return hit.volume() > 0.0005;
      };
      expect(solidAt(knuckles, -9, 27, -19)).toBe(true);
      // One piece with the pot, and nothing of it inside the pot.
      const whole = pot.add(knuckles);
      const inside = knuckles.intersect(cavity);
      created.push(whole, inside);
      expect(whole.decompose().length).toBe(1);
      expect(inside.volume()).toBeLessThan(0.01);
      // The lid is one piece with its knuckles, closes without overlapping and swings open clear of the pot.
      const closed = closing(pot, result.lid, 2, created);
      const parts = closed.decompose();
      created.push(...parts);
      expect(parts.length).toBe(1);
      const overlap = closed.intersect(whole);
      created.push(overlap);
      expect(overlap.volume()).toBeLessThan(0.01);
      const radius = hingeKnuckleRadius({ hingePin: 1.75 });
      const axisY = 30 + 2 - radius;
      const axisZ = -(20 + radius + 0.3);
      for (const degrees of [10, 30, 60, 90, 120, 150, 170]) {
        const open = swung(closed, axisY, axisZ, degrees, created);
        const hit = open.intersect(whole);
        created.push(hit);
        expect(hit.volume(), `open ${degrees} degrees`).toBeLessThan(0.01);
      }
      // With five knuckles the lid's outer ones sit where its plate has curved away (its edge at z = -19.3 at x = -5.3):
      // their web reaches in to it.
      const five = lidForSolid(kernel, pot, normalizeLidOptions({ ...HINGED, hingeKnuckles: 5 }));
      if ("error" in five) throw new Error(JSON.stringify(five.error));
      created.push(five.lid, five.hinge!.knuckles);
      const fiveClosed = closing(pot, five.lid, 2, created);
      expect(solidAt(fiveClosed, -5.3, 31, -19.5)).toBe(true);
      const filament = kernel.Manifold.cylinder(40, 0.875, 0.875, 48).rotate([0, 90, 0]).translate([-20, axisY, axisZ]);
      created.push(filament);
      const onPin = [closed.intersect(filament), whole.intersect(filament)];
      created.push(...onPin);
      onPin.forEach((part) => expect(part.volume()).toBeLessThan(0.001));
    } finally {
      dispose(created);
    }
  });

  it("goes along the side picked: the hinge of the body turned that side to the back, turned back", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    const atOrigin = (solid: Body) => {
      const min = solid.boundingBox().min;
      const moved = solid.translate([-min[0], -min[1], -min[2]]);
      created.push(moved);
      return moved;
    };
    const sameShape = (a: Body, b: Body, what: string) => {
      const extra = a.subtract(b);
      const missing = b.subtract(a);
      created.push(extra, missing);
      expect(extra.volume(), what).toBeLessThan(0.01);
      expect(missing.volume(), what).toBeLessThan(0.01);
    };
    try {
      const body = openBox(kernel, created);
      // The turn about the scene's up axis that brings each side to the back (-z), and where its knuckles stand.
      const sides = [
        { side: "right", degrees: 90, outside: (box: { min: number[]; max: number[] }) => box.min[0] > 29.5 },
        { side: "front", degrees: 180, outside: (box: { min: number[]; max: number[] }) => box.min[2] > 19.5 },
        { side: "left", degrees: -90, outside: (box: { min: number[]; max: number[] }) => box.max[0] < -29.5 },
      ];
      for (const { side, degrees, outside } of sides) {
        const result = lidForSolid(kernel, body, normalizeLidOptions({ ...HINGED, hingeSide: side }));
        if ("error" in result) throw new Error(`${side}: ${JSON.stringify(result.error)}`);
        const turned = body.rotate([0, degrees, 0]);
        created.push(turned);
        const atBack = lidForSolid(kernel, turned, normalizeLidOptions(HINGED));
        if ("error" in atBack) throw new Error(`${side}: ${JSON.stringify(atBack.error)}`);
        created.push(result.lid, result.hinge!.knuckles, atBack.lid, atBack.hinge!.knuckles);
        expect(outside(result.hinge!.knuckles.boundingBox()), `${side}: knuckles outside that side`).toBe(true);
        // The right and the left side are 40 mm long, the front 60 mm like the back: knuckles by length.
        expect(result.hinge!.count, side).toBe(atBack.hinge!.count);
        expect(result.hinge!.count, side).toBe(side === "front" ? 5 : 3);
        // The body's knuckles are those of the turned body, turned back; the lid is that one's, turned the same way as
        // it lies (turned over, so the other way round).
        const knuckles = result.hinge!.knuckles.rotate([0, degrees, 0]);
        created.push(knuckles);
        sameShape(knuckles, atBack.hinge!.knuckles, `${side}: knuckles`);
        const lid = result.lid.rotate([0, -degrees, 0]);
        created.push(lid);
        sameShape(atOrigin(lid), atOrigin(atBack.lid), `${side}: lid`);
        // On the body they grow out of its wall, and the lid lies beside both, clear of them.
        const whole = body.add(result.hinge!.knuckles);
        const hit = result.lid.intersect(whole);
        created.push(whole, hit);
        expect(whole.decompose().length, side).toBe(1);
        expect(hit.volume(), side).toBeLessThan(0.001);
      }
    } finally {
      dispose(created);
    }
  });

  it("prints its pin apart when asked, beside the lid, a millimetre shorter than the hinge and on a flat", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const body = openBox(kernel, created);
      const result = lidForSolid(kernel, body, normalizeLidOptions({ ...HINGED, hingePin: 3, hingePrintPin: true }));
      if ("error" in result) throw new Error(JSON.stringify(result.error));
      const pin = result.hinge!.pin!;
      created.push(result.lid, result.hinge!.knuckles, pin);
      const box = pin.boundingBox();
      // It lies on a flat a tenth of its diameter wide, so it is that much lower than round.
      expect(box.max[1] - box.min[1]).toBeCloseTo(2.7, 2);
      expect(box.min[1]).toBeCloseTo(0, 3);
      expect(box.max[2] - box.min[2]).toBeCloseTo(3, 1);
      // The back's 60 mm less half a millimetre at each end, less one.
      expect(box.max[0] - box.min[0]).toBeCloseTo(58, 1);
      expect(pin.intersect(result.lid).volume()).toBeLessThan(0.001);
    } finally {
      dispose(created);
    }
  });

  it("goes with a push-in or a flat lid, and says why not otherwise", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const body = openBox(kernel, created);
      expect(lidForSolid(kernel, body, normalizeLidOptions({ ...HINGED, type: "cap" }))).toEqual({ error: { code: "hingeLidType" } });
      expect(lidForSolid(kernel, body, normalizeLidOptions({ ...HINGED, type: "both" }))).toEqual({ error: { code: "hingeLidType" } });
      const flat = lidForSolid(kernel, body, normalizeLidOptions({ ...HINGED, type: "flat" }));
      if ("error" in flat) throw new Error(JSON.stringify(flat.error));
      created.push(flat.lid, flat.hinge!.knuckles);
      // A body too low for the slope under its knuckles.
      const low = kernel.Manifold.cube([60, 6, 40], true).translate([0, 3, 0]).subtract(kernel.Manifold.cube([56, 6, 36], true).translate([0, 5, 0]));
      created.push(low);
      expect(lidForSolid(kernel, low, normalizeLidOptions({ ...HINGED, depth: 2 }))).toEqual({ error: { code: "hingeTooLow" } });
      // A pot too small for three knuckles where its wall stays near the hinge's line.
      const small = kernel.Manifold.cylinder(30, 4, 4, 64).rotate([-90, 0, 0]).subtract(kernel.Manifold.cylinder(30, 3, 3, 64).rotate([-90, 0, 0]).translate([0, 2, 0]));
      created.push(small);
      expect(lidForSolid(kernel, small, normalizeLidOptions(HINGED))).toEqual({ error: { code: "hingeNoBack" } });
    } finally {
      dispose(created);
    }
  });
});
