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

/** The lid swung open by `degrees` about an axis along x at height `y` and depth `z`: its front rising. */
function swung(lid: Body, y: number, z: number, degrees: number, created: Solid[]) {
  const there = lid.translate([0, -y, -z]);
  const turned = there.rotate([-degrees, 0, 0]);
  const back = turned.translate([0, y, z]);
  created.push(there, turned, back);
  return back;
}

/** The widest it opens, in steps of five degrees, before it touches `body`. */
function widestOpening(lid: Body, body: Body, y: number, z: number, created: Solid[]) {
  let widest = 0;
  for (let degrees = 5; degrees <= 180; degrees += 5) {
    const open = swung(lid, y, z, degrees, created);
    const hit = open.intersect(body);
    created.push(hit);
    if (hit.volume() > 0.01) break;
    widest = degrees;
  }
  return widest;
}

const HINGED = { type: "plug", thickness: 2, gap: 0.2, depth: 4, wall: 1.6, hinge: true, hingePin: 1.75, hingeGap: 0.3 };
const RADIUS = hingeKnuckleRadius({ hingePin: 1.75 });

describe("a flush hinge, in the back wall (real Manifold kernel)", () => {
  it("keeps the box its size, closes without overlap and opens well past upright without touching", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const body = openBox(kernel, created);
      const result = lidForSolid(kernel, body, normalizeLidOptions({ ...HINGED, hingeStyle: "flush" }));
      if ("error" in result) throw new Error(JSON.stringify(result.error));
      const { knuckles, cuts, count, style } = result.hinge!;
      created.push(result.lid, knuckles, cuts!);
      expect(style).toBe("flush");
      // Corner to corner, 60 mm: seven knuckles.
      expect(count).toBe(7);
      // Nothing stands out: the box with its knuckles and slots is as large as it was.
      const whole = body.add(knuckles).subtract(cuts!);
      created.push(whole);
      const box = whole.boundingBox();
      expect(box.min[2]).toBeGreaterThan(-20.001);
      expect(box.max[0] - box.min[0]).toBeCloseTo(60, 3);
      expect(box.max[2] - box.min[2]).toBeCloseTo(40, 3);
      expect(whole.decompose().length).toBe(1);
      // The lid, turned back over and laid on the rim, is as large as the box and overlaps nothing.
      const turned = result.lid.rotate([180, 0, 0]);
      const lidBox = turned.boundingBox();
      expect(lidBox.max[0] - lidBox.min[0]).toBeCloseTo(60, 3);
      expect(lidBox.max[2] - lidBox.min[2]).toBeCloseTo(40, 3);
      const closed = turned.translate([-30 - lidBox.min[0], 32 - lidBox.max[1], 20 - lidBox.max[2]]);
      created.push(turned, closed);
      const overlap = closed.intersect(whole);
      created.push(overlap);
      expect(overlap.volume()).toBeLessThan(0.01);
      expect(closed.decompose().length).toBe(1);
      // The axis: flush with the lid's top and the back face.
      const axisY = 32 - RADIUS;
      const axisZ = -20 + RADIUS;
      const widest = widestOpening(closed, whole, axisY, axisZ, created);
      expect(widest).toBeGreaterThanOrEqual(110);
      // A 1.75 mm filament goes through every knuckle without touching one.
      const filament = kernel.Manifold.cylinder(70, 0.875, 0.875, 48).rotate([0, 90, 0]).translate([-35, axisY, axisZ]);
      created.push(filament);
      const onPin = [closed.intersect(filament), whole.intersect(filament)];
      created.push(...onPin);
      onPin.forEach((part) => expect(part.volume()).toBeLessThan(0.001));
    } finally {
      dispose(created);
    }
  });
});

describe("a flush hinge on a box with rounded corners (real Manifold kernel)", () => {
  it("cuts plate and wall round the axis right up to the end knuckles: no sliver left standing at either end", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      // As openBox, its upright edges rounded by 6 mm outside (4 mm inside): the back runs straight from x -24 to 24.
      const rounded = (width: number, depth: number, radius: number) => kernel.CrossSection.square([width - 2 * radius, depth - 2 * radius], true).offset(radius, "Round", 2, 64);
      const outline = rounded(60, 40, 6);
      const hollow = rounded(56, 36, 4);
      const outer = outline.extrude(30).rotate([-90, 0, 0]);
      const inner = hollow.extrude(30).rotate([-90, 0, 0]).translate([0, 2, 0]);
      const body = outer.subtract(inner);
      created.push(outline, hollow, outer, inner, body);
      const result = lidForSolid(kernel, body, normalizeLidOptions({ ...HINGED, hingeStyle: "flush" }));
      if ("error" in result) throw new Error(JSON.stringify(result.error));
      const { knuckles, cuts, count } = result.hinge!;
      created.push(result.lid, knuckles, cuts!);
      expect(count).toBe(5);
      const whole = body.add(knuckles).subtract(cuts!);
      const turned = result.lid.rotate([180, 0, 0]);
      created.push(whole, turned);
      const lidBox = turned.boundingBox();
      const closed = turned.translate([-30 - lidBox.min[0], 32 - lidBox.max[1], 20 - lidBox.max[2]]);
      created.push(closed);
      expect(whole.decompose().length).toBe(1);
      expect(closed.decompose().length).toBe(1);
      const axisY = 32 - RADIUS;
      const axisZ = -20 + RADIUS;
      // Round the axis beside each end knuckle (the body's, where the knuckles start and end), out into the corner:
      // nothing of the lid, and nothing of the box. (A sliver of the plate 0.01 mm thin stood here, and a fin of the wall
      // as thick as the gap.)
      const ends = knuckles.boundingBox();
      expect(ends.min[0]).toBeGreaterThan(-26);
      expect(ends.max[0]).toBeLessThan(26);
      const room = RADIUS + 0.3 - 0.05;
      for (const [from, to] of [[ends.min[0] - 2, ends.min[0] - 0.02], [ends.max[0] + 0.02, ends.max[0] + 2]]) {
        const zone = kernel.Manifold.cylinder(to - from, room, room, 48).rotate([0, 90, 0]).translate([from, axisY, axisZ]);
        const inLid = closed.intersect(zone);
        const inBox = whole.intersect(zone);
        created.push(zone, inLid, inBox);
        expect(inLid.volume()).toBeLessThan(1e-4);
        expect(inBox.volume()).toBeLessThan(1e-4);
      }
      // And it still closes without overlap and opens well past upright.
      const overlap = closed.intersect(whole);
      created.push(overlap);
      expect(overlap.volume()).toBeLessThan(0.01);
      expect(widestOpening(closed, whole, axisY, axisZ, created)).toBeGreaterThanOrEqual(110);
    } finally {
      dispose(created);
    }
  });
});

describe("a pivot lid, on two pins through the side walls (real Manifold kernel)", () => {
  it("lies in the opening on a ledge, takes a pin through each side wall into its bar and opens to upright", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const body = openBox(kernel, created);
      const result = lidForSolid(kernel, body, normalizeLidOptions({ ...HINGED, hingeStyle: "pivot" }));
      if ("error" in result) throw new Error(JSON.stringify(result.error));
      const { knuckles: ledge, cuts, count, style } = result.hinge!;
      created.push(result.lid, ledge, cuts!);
      expect(style).toBe("pivot");
      expect(count).toBe(2);
      const whole = body.add(ledge).subtract(cuts!);
      created.push(whole);
      const box = whole.boundingBox();
      expect(box.max[0] - box.min[0]).toBeCloseTo(60, 3);
      expect(box.max[2] - box.min[2]).toBeCloseTo(40, 3);
      expect(box.max[1]).toBeCloseTo(30, 3);
      // In the opening: its top level with the rim, the gap to the side walls and the front.
      const turned = result.lid.rotate([180, 0, 0]);
      const lidBox = turned.boundingBox();
      expect(lidBox.max[0] - lidBox.min[0]).toBeCloseTo(56 - 0.4, 1);
      const closed = turned.translate([-(lidBox.min[0] + lidBox.max[0]) / 2, 30 - lidBox.max[1], 18 - 0.2 - lidBox.max[2]]);
      created.push(turned, closed);
      const overlap = closed.intersect(whole);
      created.push(overlap);
      expect(overlap.volume()).toBeLessThan(0.01);
      // It rests on the ledge: a little lower, it would sit in it.
      const lower = closed.translate([0, -0.3, 0]);
      const resting = lower.intersect(whole);
      created.push(lower, resting);
      expect(resting.volume()).toBeGreaterThan(0.5);
      // A pin of filament from outside through each side wall into the bar's end, touching nothing.
      const axisY = 30 - RADIUS;
      const axisZ = -(18 - 0.3 - RADIUS);
      for (const [from, length] of [[-30.5, 2 + 0.3 + 3], [30.5 - (2 + 0.3 + 3), 2 + 0.3 + 3]] as const) {
        const pin = kernel.Manifold.cylinder(length, 0.875, 0.875, 48).rotate([0, 90, 0]).translate([from, axisY, axisZ]);
        const hits = [pin.intersect(whole), pin.intersect(closed)];
        created.push(pin, ...hits);
        hits.forEach((hit) => expect(hit.volume()).toBeLessThan(0.001));
      }
      const widest = widestOpening(closed, whole, axisY, axisZ, created);
      expect(widest).toBeGreaterThanOrEqual(90);
    } finally {
      dispose(created);
    }
  });
});

describe("a pivot lid's pins and sides", () => {
  it("prints its two pins apart when asked, each as long as wall, gap and the bar's hole, and turns on any straight side", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const body = openBox(kernel, created);
      const result = lidForSolid(kernel, body, normalizeLidOptions({ ...HINGED, hingeStyle: "pivot", hingePrintPin: true }));
      if ("error" in result) throw new Error(JSON.stringify(result.error));
      created.push(result.lid, result.hinge!.knuckles, result.hinge!.cuts!, result.hinge!.pin!);
      const pins = result.hinge!.pin!.decompose();
      created.push(...pins);
      expect(pins.length).toBe(2);
      // The side walls are 2 mm, the gap 0.3 and the hole in the bar 6 mm deep: 8.3 less half a millimetre.
      for (const pin of pins) expect(pin.boundingBox().max[0] - pin.boundingBox().min[0]).toBeCloseTo(7.8, 2);
      expect(result.lid.intersect(result.hinge!.pin!).volume()).toBeLessThan(0.001);
      // On the right side (+x) of the 60 x 40 box the pins go through the front and back walls, along z.
      const right = lidForSolid(kernel, body, normalizeLidOptions({ ...HINGED, hingeStyle: "pivot", hingeSide: "right" }));
      if ("error" in right) throw new Error(JSON.stringify(right.error));
      created.push(right.lid, right.hinge!.knuckles, right.hinge!.cuts!);
      const holes = right.hinge!.cuts!.boundingBox();
      expect(holes.max[2] - holes.min[2]).toBeGreaterThan(40);
      expect(holes.min[0]).toBeGreaterThan(20);
    } finally {
      dispose(created);
    }
  });
});

describe("which hinge goes where", () => {
  it("keeps magnets to the hinge outside, and a flush hinge and a pivot lid to straight sides", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const body = openBox(kernel, created);
      expect(lidForSolid(kernel, body, normalizeLidOptions({ ...HINGED, hingeStyle: "flush", magnets: true, thickness: 2.8 }))).toEqual({ error: { code: "hingeStyleMagnets" } });
      expect(lidForSolid(kernel, body, normalizeLidOptions({ ...HINGED, hingeStyle: "pivot", magnets: true, thickness: 2.8 }))).toEqual({ error: { code: "hingeStyleMagnets" } });
      const outer = kernel.Manifold.cylinder(30, 20, 20, 96).rotate([-90, 0, 0]);
      const cavity = kernel.Manifold.cylinder(30, 18, 18, 96).rotate([-90, 0, 0]).translate([0, 2, 0]);
      const pot = outer.subtract(cavity);
      created.push(outer, cavity, pot);
      expect(lidForSolid(kernel, pot, normalizeLidOptions({ ...HINGED, hingeStyle: "flush" }))).toEqual({ error: { code: "hingeStyleStraight" } });
      expect(lidForSolid(kernel, pot, normalizeLidOptions({ ...HINGED, hingeStyle: "pivot" }))).toEqual({ error: { code: "pivotNoSides" } });
    } finally {
      dispose(created);
    }
  });
});
