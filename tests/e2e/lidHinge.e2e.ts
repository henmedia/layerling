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

describe("a lid with a hinge along the back (real Manifold kernel)", () => {
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

  it("prints its pin apart when asked, beside the lid and a millimetre shorter than the hinge", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const body = openBox(kernel, created);
      const result = lidForSolid(kernel, body, normalizeLidOptions({ ...HINGED, hingePin: 3, hingePrintPin: true }));
      if ("error" in result) throw new Error(JSON.stringify(result.error));
      const pin = result.hinge!.pin!;
      created.push(result.lid, result.hinge!.knuckles, pin);
      const box = pin.boundingBox();
      expect(box.max[1] - box.min[1]).toBeCloseTo(3, 1);
      expect(box.min[1]).toBeCloseTo(0, 3);
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
      // A round pot has no straight back.
      const pot = kernel.Manifold.cylinder(30, 20, 20, 64).rotate([-90, 0, 0]).subtract(kernel.Manifold.cylinder(30, 18, 18, 64).rotate([-90, 0, 0]).translate([0, 2, 0]));
      created.push(pot);
      expect(lidForSolid(kernel, pot, normalizeLidOptions(HINGED))).toEqual({ error: { code: "hingeNoBack" } });
    } finally {
      dispose(created);
    }
  });
});
