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

/**
 * A box 60 wide (x), 30 high (y, the scene's up) and 40 deep (z), with 2 mm walls and floor, open at the top; its back is
 * -z. With `corner`, its upright edges rounded by that much outside (2 mm less inside).
 */
function openBox(kernel: Kernel, created: Solid[], corner = 0, width = 60) {
  if (!corner) {
    const outer = kernel.Manifold.cube([width, 30, 40], true).translate([0, 15, 0]);
    const inner = kernel.Manifold.cube([width - 4, 30, 36], true).translate([0, 17, 0]);
    const body = outer.subtract(inner);
    created.push(outer, inner, body);
    return body;
  }
  const rounded = (sizeX: number, sizeZ: number, radius: number) => kernel.CrossSection.square([sizeX - 2 * radius, sizeZ - 2 * radius], true).offset(radius, "Round", 2, 64);
  const outline = rounded(width, 40, corner);
  const hollow = rounded(width - 4, 36, corner - 2);
  const outer = outline.extrude(30).rotate([-90, 0, 0]);
  const inner = hollow.extrude(30).rotate([-90, 0, 0]).translate([0, 2, 0]);
  const body = outer.subtract(inner);
  created.push(outline, hollow, outer, inner, body);
  return body;
}

/** The lid turned back over and laid on the rim of the 60 x 40 box, as it closes it. */
function closing(lid: Body, created: Solid[]) {
  const turned = lid.rotate([180, 0, 0]);
  const box = turned.boundingBox();
  const closed = turned.translate([-30 - box.min[0], 32 - box.max[1], 20 - box.max[2]]);
  created.push(turned, closed);
  return closed;
}

/** The widest it opens about an axis along x at height `y` and depth `z`, in steps of five degrees, before it touches `body`. */
function widestOpening(lid: Body, body: Body, y: number, z: number, created: Solid[]) {
  let widest = 0;
  for (let degrees = 5; degrees <= 180; degrees += 5) {
    const there = lid.translate([0, -y, -z]);
    const turned = there.rotate([-degrees, 0, 0]);
    const open = turned.translate([0, y, z]);
    const hit = open.intersect(body);
    created.push(there, turned, open, hit);
    if (hit.volume() > 0.01) break;
    widest = degrees;
  }
  return widest;
}

const HINGED = { type: "plug", thickness: 2, gap: 0.2, depth: 4, wall: 1.6, hinge: true, hingePin: 1.75, hingeGap: 0.3, hingeStyle: "flush", hingeEndPlugs: true };
const RADIUS = hingeKnuckleRadius({ hingePin: 1.75 });
/** The hinge's axis on the back of the 60 x 40 box: flush with the lid's top and the back face. */
const AXIS_Y = 32 - RADIUS;
const AXIS_Z = -20 + RADIUS;

/**
 * The two plugs, as they lie beside the lid, each turned back onto its corner (they lie turned an eighth about their
 * length) and put into its end of the hinge along x, its inner end `depth` in from where the hinge's line leaves the body
 * at `ends`: the left one first.
 */
function plugsInPlace(plugs: Body, ends: [number, number], depth: number, y: number, z: number, created: Solid[]) {
  const pieces = plugs.decompose().sort((a, b) => a.boundingBox().min[0] - b.boundingBox().min[0]);
  created.push(...pieces);
  return pieces.map((piece, index) => {
    const upright = piece.rotate([-45, 0, 0]);
    const box = upright.boundingBox();
    const x = index === 0 ? ends[0] + depth - box.max[0] : ends[1] - depth - box.min[0];
    const placed = upright.translate([x, y - (box.min[1] + box.max[1]) / 2, z - (box.min[2] + box.max[2]) / 2]);
    created.push(upright, placed);
    return placed;
  });
}

/** A square rod standing on a corner, `half` from its middle to each side, along x from `from` to `to` on the hinge's axis. */
function squareRod(kernel: Kernel, half: number, from: number, to: number, y: number, z: number, created: Solid[]) {
  const square = kernel.CrossSection.square([2 * half, 2 * half], true).rotate(45);
  const rod = square.extrude(to - from).rotate([0, 90, 0]).translate([from, y, z]);
  created.push(square, rod);
  return rod;
}

describe("end plugs for a flush hinge (Discussion #1387, real Manifold kernel)", () => {
  it("make square pockets at both ends that the pin passes, and plugs that fill them flush with the box's sides and cannot turn", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    // How much of `solid` a rod or zone takes.
    const overlap = (solid: Body, other: Body) => {
      const common = solid.intersect(other);
      created.push(common);
      return common.volume();
    };
    try {
      const body = openBox(kernel, created);
      const result = lidForSolid(kernel, body, normalizeLidOptions({ ...HINGED, hingePrintPin: true }));
      if ("error" in result) throw new Error(JSON.stringify(result.error));
      const { knuckles, cuts, plugs, pin, pinLength, count } = result.hinge!;
      created.push(result.lid, knuckles, cuts!, plugs!, pin!);
      expect(count).toBe(7);
      // 60 mm between the sides, 4 mm of plug at each end and half a millimetre to each: a 51 mm pin, printed that long.
      expect(pinLength).toBeCloseTo(51, 6);
      expect(pin!.boundingBox().max[0] - pin!.boundingBox().min[0]).toBeCloseTo(51, 3);
      const whole = body.add(knuckles).subtract(cuts!);
      created.push(whole);
      expect(whole.decompose().length).toBe(1);
      const box = whole.boundingBox();
      expect(box.max[0] - box.min[0]).toBeCloseTo(60, 3);
      expect(box.max[2] - box.min[2]).toBeCloseTo(40, 3);
      // Over the plug's 4 mm at each end the hole is a square standing on a corner, 0.925 mm from its middle to each side
      // (as tight round the pin as the body's round holes): a square rod a hair smaller goes in 4 mm, not 4.5.
      for (const [from, to, deeper] of [[-31, -26.05, -25.5], [26.05, 31, 25.5]] as const) {
        expect(overlap(whole, squareRod(kernel, 0.915, from, to, AXIS_Y, AXIS_Z, created)), `square at ${from}`).toBeLessThan(1e-4);
        const longer = from < 0 ? squareRod(kernel, 0.915, from, deeper, AXIS_Y, AXIS_Z, created) : squareRod(kernel, 0.915, deeper, to, AXIS_Y, AXIS_Z, created);
        expect(overlap(whole, longer), `square past the pocket at ${from}`).toBeGreaterThan(1e-3);
        expect(overlap(whole, squareRod(kernel, 0.94, from, to, AXIS_Y, AXIS_Z, created)), `a larger square at ${from}`).toBeGreaterThan(1e-3);
      }
      // So the pin goes in from either end, through every knuckle and both pockets.
      const filament = kernel.Manifold.cylinder(70, 0.875, 0.875, 48).rotate([0, 90, 0]).translate([-35, AXIS_Y, AXIS_Z]);
      created.push(filament);
      expect(overlap(whole, filament)).toBeLessThan(0.001);

      // Two plugs, each a square as thick as the pin (1.75 mm) and 4 mm long, lying on a flat side beside the lid.
      const pieces = plugs!.decompose();
      created.push(...pieces);
      expect(pieces.length).toBe(2);
      for (const piece of pieces) {
        const lying = piece.boundingBox();
        expect(piece.volume()).toBeCloseTo(1.75 * 1.75 * 4, 2);
        expect(lying.min[1]).toBeCloseTo(0, 6);
        expect(lying.max[1] - lying.min[1]).toBeCloseTo(1.75, 3);
        expect(lying.max[0] - lying.min[0]).toBeCloseTo(4, 3);
        expect(overlap(piece, result.lid)).toBeLessThan(1e-6);
        expect(overlap(piece, pin!)).toBeLessThan(1e-6);
      }
      // Put in, they fill the pockets: flush with the box's sides, overlapping neither the box nor the closed lid, and
      // 0.05 mm short of the pocket's walls all round.
      const closed = closing(result.lid, created);
      const inPlace = plugsInPlace(plugs!, [-30, 30], 4, AXIS_Y, AXIS_Z, created);
      for (const [index, plug] of inPlace.entries()) {
        const placed = plug.boundingBox();
        expect(index === 0 ? placed.min[0] : placed.max[0]).toBeCloseTo(index === 0 ? -30 : 30, 3);
        expect(overlap(plug, whole), `plug ${index} in the box`).toBeLessThan(1e-3);
        expect(overlap(plug, closed), `plug ${index} in the lid`).toBeLessThan(1e-3);
        const larger = (index === 0 ? squareRod(kernel, 0.925 - 0.01, -30.01, -26.01, AXIS_Y, AXIS_Z, created) : squareRod(kernel, 0.925 - 0.01, 26.01, 30.01, AXIS_Y, AXIS_Z, created));
        const filled = larger.subtract(plug);
        created.push(filled);
        // What of the pocket the plug leaves: a skin of 0.04 mm round its four sides.
        expect(filled.volume()).toBeLessThan(4 * 1.83 * 0.045 * 4);
        // Turned by 5 degrees about the hinge's line it runs into the pocket's walls: it cannot turn.
        const there = plug.translate([0, -AXIS_Y, -AXIS_Z]);
        const turned = there.rotate([5, 0, 0]);
        const back = turned.translate([0, AXIS_Y, AXIS_Z]);
        created.push(there, turned, back);
        expect(overlap(back, whole), `plug ${index} turned`).toBeGreaterThan(0.01);
      }
      // The pin between them touches neither.
      const shortPin = kernel.Manifold.cylinder(51, 0.875, 0.875, 48).rotate([0, 90, 0]).translate([-25.5, AXIS_Y, AXIS_Z]);
      created.push(shortPin);
      for (const plug of inPlace) expect(overlap(shortPin, plug)).toBeLessThan(1e-6);
      expect(overlap(shortPin, whole)).toBeLessThan(0.001);
      // The lid still closes without overlap and opens well past upright, the plugs in.
      const withPlugs = whole.add(inPlace[0]).add(inPlace[1]);
      created.push(withPlugs);
      expect(overlap(closed, withPlugs)).toBeLessThan(0.01);
      expect(widestOpening(closed, withPlugs, AXIS_Y, AXIS_Z, created)).toBeGreaterThanOrEqual(110);
    } finally {
      dispose(created);
    }
  });

  it("on a box with rounded corners runs the end knuckles into the corners, so the plugs end flush in the round", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    const overlap = (solid: Body, other: Body) => {
      const common = solid.intersect(other);
      created.push(common);
      return common.volume();
    };
    // Whether a tiny cube at (x, y, z) lies in the solid.
    const solidAt = (solid: Body, x: number, y: number, z: number) => overlap(solid, (() => {
      const probe = kernel.Manifold.cube([0.04, 0.04, 0.04], true).translate([x, y, z]);
      created.push(probe);
      return probe;
    })()) > 1e-6;
    try {
      // Rounded by 6 mm: the back runs straight from x -24 to 24, and the hinge's line leaves the box at about ±28.99.
      const body = openBox(kernel, created, 6);
      const result = lidForSolid(kernel, body, normalizeLidOptions(HINGED));
      if ("error" in result) throw new Error(JSON.stringify(result.error));
      const { knuckles, cuts, plugs, pinLength, count } = result.hinge!;
      created.push(result.lid, knuckles, cuts!, plugs!);
      expect(count).toBe(5);
      // Where the round crosses the axis: 3.325 mm in front of the corner's middle, 6 mm round it (on a round of 64 sides).
      const edge = 24 + Math.sqrt(36 - (6 - RADIUS) ** 2);
      expect(pinLength).toBeCloseTo(2 * edge - 9, 2);
      // The end knuckles reach out into the corners, to the round.
      const reach = knuckles.boundingBox();
      expect(reach.min[0]).toBeLessThan(-29.5);
      expect(reach.max[0]).toBeGreaterThan(29.5);
      const whole = body.add(knuckles).subtract(cuts!);
      const closed = closing(result.lid, created);
      created.push(whole);
      expect(whole.decompose().length).toBe(1);
      expect(closed.decompose().length).toBe(1);
      const inPlace = plugsInPlace(plugs!, [-edge, edge], 4, AXIS_Y, AXIS_Z, created);
      // Where a corner rounds, at depth z, along the line at height y: the round's x, on the left.
      const roundAt = (z: number) => -24 - Math.sqrt(36 - (z + 14) ** 2);
      for (const [index, plug] of inPlace.entries()) {
        const side = index === 0 ? 1 : -1;
        expect(overlap(plug, whole), `plug ${index} in the box`).toBeLessThan(1e-3);
        expect(overlap(plug, closed), `plug ${index} in the lid`).toBeLessThan(1e-3);
        // Its end follows the round: across the plug, just inside the round there is plug, just outside nothing.
        for (const along of [-0.7, -0.35, 0, 0.35, 0.7]) {
          const z = AXIS_Z + along;
          const x = roundAt(z) * side;
          expect(solidAt(plug, x + 0.06 * side, AXIS_Y, z), `plug ${index} inside the round at z ${z}`).toBe(true);
          expect(solidAt(plug, x - 0.06 * side, AXIS_Y, z), `plug ${index} outside the round at z ${z}`).toBe(false);
        }
      }
      // Round the axis, from the round in to past the plugs, the box and the plugs fill all but the play: no room cut
      // round the axis in the corners any more (without plugs, all of it is empty).
      const outline = kernel.CrossSection.square([48, 28], true).offset(6, "Round", 2, 64);
      const column = outline.extrude(32).rotate([-90, 0, 0]);
      created.push(outline, column);
      for (const [from, to] of [[-29.4, -25.2], [25.2, 29.4]]) {
        const zone = kernel.Manifold.cylinder(to - from, RADIUS - 0.1, RADIUS - 0.1, 48).rotate([0, 90, 0]).translate([from, AXIS_Y, AXIS_Z]);
        const within = zone.intersect(column);
        const empty = within.subtract(whole).subtract(inPlace[0]).subtract(inPlace[1]);
        created.push(zone, within, empty);
        expect(within.volume()).toBeGreaterThan(60);
        expect(empty.volume(), `empty round the axis from ${from}`).toBeLessThan(3);
      }
      // The lid still closes without overlap and opens well past upright, the plugs in.
      const withPlugs = whole.add(inPlace[0]).add(inPlace[1]);
      created.push(withPlugs);
      expect(overlap(closed, withPlugs)).toBeLessThan(0.01);
      expect(widestOpening(closed, withPlugs, AXIS_Y, AXIS_Z, created)).toBeGreaterThanOrEqual(110);
      // Each plug lies on a flat side: its lowest twentieth of a millimetre is a whole side's area. Its end, cut to the
      // round, leans up rather than over: the plug is as long at the bottom as anywhere higher up.
      for (const piece of plugs!.decompose()) {
        const slab = (from: number) => {
          const layer = piece.intersect(kernel.Manifold.cube([200, 0.05, 200], true).translate([0, from + 0.025, 0]));
          created.push(layer);
          return layer;
        };
        const [bottom, middle, top] = [slab(0), slab(0.85), slab(1.7)];
        created.push(piece);
        expect(bottom.volume() / 0.05).toBeGreaterThan(1.75 * 3.9);
        const length = (layer: Body) => layer.boundingBox().max[0] - layer.boundingBox().min[0];
        expect(length(bottom)).toBeGreaterThan(length(middle) - 1e-3);
        expect(length(middle)).toBeGreaterThan(length(top) - 1e-3);
        expect(length(bottom)).toBeGreaterThan(length(top) + 0.3);
      }
    } finally {
      dispose(created);
    }
  });

  it("go along any side, and the pin's line passes freely while the pockets end 4 mm in", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    const hits = (solid: Body, rod: Body) => {
      const common = solid.intersect(rod);
      created.push(common);
      return common.volume() > 1e-4;
    };
    try {
      const body = openBox(kernel, created);
      // Each side's hinge line in the scene: along x at the back and front, along z at the right and left, and its length.
      const sides = {
        back: { along: "x", at: [AXIS_Y, -20 + RADIUS], length: 60 },
        front: { along: "x", at: [AXIS_Y, 20 - RADIUS], length: 60 },
        right: { along: "z", at: [30 - RADIUS, AXIS_Y], length: 40 },
        left: { along: "z", at: [-30 + RADIUS, AXIS_Y], length: 40 },
      } as const;
      for (const [hingeSide, line] of Object.entries(sides)) {
        const result = lidForSolid(kernel, body, normalizeLidOptions({ ...HINGED, hingeSide }));
        if ("error" in result) throw new Error(JSON.stringify(result.error));
        const { knuckles, cuts, plugs, pinLength } = result.hinge!;
        created.push(result.lid, knuckles, cuts!, plugs!);
        expect(pinLength, hingeSide).toBeCloseTo(line.length - 9, 6);
        const pieces = plugs!.decompose();
        created.push(...pieces);
        expect(pieces.length, hingeSide).toBe(2);
        pieces.forEach((piece) => expect(piece.volume(), hingeSide).toBeCloseTo(1.75 * 1.75 * 4, 2));
        const whole = body.add(knuckles).subtract(cuts!);
        created.push(whole);
        // A rod along the hinge's line, from `from` to `to` (along it, from the middle).
        const rod = (shape: "round" | "square", from: number, to: number) => {
          const profile = shape === "round" ? kernel.CrossSection.circle(0.875, 48) : kernel.CrossSection.square([1.83, 1.83], true).rotate(45);
          const along = profile.extrude(to - from).translate([0, 0, from]);
          // Along z the profile is drawn as it is; along x it is turned so z runs along x.
          const placed = line.along === "z" ? along.translate([line.at[0], line.at[1], 0]) : along.rotate([0, 90, 0]).translate([0, line.at[0], line.at[1]]);
          created.push(profile, along, placed);
          return placed;
        };
        const half = line.length / 2;
        expect(hits(whole, rod("round", -half - 5, half + 5)), `${hingeSide}: the pin's line`).toBe(false);
        for (const sign of [-1, 1]) {
          const [outer, inner, past] = [sign * (half + 1), sign * (half - 3.95), sign * (half - 4.5)];
          expect(hits(whole, rod("square", Math.min(outer, inner), Math.max(outer, inner))), `${hingeSide}: the pocket at ${sign}`).toBe(false);
          expect(hits(whole, rod("square", Math.min(outer, past), Math.max(outer, past))), `${hingeSide}: past the pocket at ${sign}`).toBe(true);
        }
      }
    } finally {
      dispose(created);
    }
  });

  it("keep a thick pin's knuckles whole round the pocket: its corners are cut flat 0.8 mm inside the knuckle, as a teardrop's point is", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const body = openBox(kernel, created);
      const result = lidForSolid(kernel, body, normalizeLidOptions({ ...HINGED, hingePin: 8, hingePinPlay: 0.2 }));
      if ("error" in result) throw new Error(JSON.stringify(result.error));
      const { knuckles, cuts, plugs } = result.hinge!;
      created.push(result.lid, knuckles, cuts!, plugs!);
      const radius = hingeKnuckleRadius({ hingePin: 8, hingePinPlay: 0.2 });
      const [y, z] = [32 - radius, -20 + radius];
      const whole = body.add(knuckles).subtract(cuts!);
      created.push(whole);
      // An 8 mm square on its corner would reach 5.73 mm from the axis, through all but 0.07 mm of the 5.8 mm knuckle;
      // cut flat at 5 mm (its new corners 5.05 mm out), the knuckle keeps its outer 0.74 mm all round the pocket.
      for (const [from, to] of [[-29.9, -26.1], [26.1, 29.9]]) {
        const ring = kernel.Manifold.cylinder(to - from, radius - 0.02, radius - 0.02, 96).subtract(kernel.Manifold.cylinder(to - from, radius - 0.74, radius - 0.74, 96));
        const placed = ring.rotate([0, 90, 0]).translate([from, y, z]);
        const missing = placed.subtract(whole);
        created.push(ring, placed, missing);
        expect(missing.volume(), `ring at ${from}`).toBeLessThan(0.01);
      }
      // And the plugs, cut the same way less the grip, still fill their pockets without touching the box.
      const inPlace = plugsInPlace(plugs!, [-30, 30], 4, y, z, created);
      for (const plug of inPlace) {
        const hit = plug.intersect(whole);
        created.push(hit);
        expect(hit.volume()).toBeLessThan(1e-3);
        expect(plug.volume()).toBeGreaterThan(8 * 8 * 4 * 0.9);
      }
    } finally {
      dispose(created);
    }
  });

  it("are only for a flush hinge, are shortened where the end knuckles are short and refused where they are too short", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const body = openBox(kernel, created);
      expect(lidForSolid(kernel, body, normalizeLidOptions({ ...HINGED, hingeStyle: "outside" }))).toEqual({ error: { code: "endPlugsFlush" } });
      expect(lidForSolid(kernel, body, normalizeLidOptions({ ...HINGED, hingeStyle: "pivot" }))).toEqual({ error: { code: "endPlugsFlush" } });
      // Without a hinge, asking for end plugs changes nothing.
      const noHinge = lidForSolid(kernel, body, normalizeLidOptions({ ...HINGED, hinge: false }));
      if ("error" in noHinge) throw new Error(JSON.stringify(noHinge.error));
      created.push(noHinge.lid);
      expect(noHinge.hinge).toBeUndefined();
      // Without end plugs, a flush hinge has none and the pin's length is left to the hinge, as before.
      const without = lidForSolid(kernel, body, normalizeLidOptions({ ...HINGED, hingeEndPlugs: false, hingePrintPin: true }));
      if ("error" in without) throw new Error(JSON.stringify(without.error));
      created.push(without.lid, without.hinge!.knuckles, without.hinge!.cuts!, without.hinge!.pin!);
      expect(without.hinge!.plugs).toBeNull();
      expect(without.hinge!.pinLength).toBeNull();
      expect(without.hinge!.pin!.boundingBox().max[0] - without.hinge!.pin!.boundingBox().min[0]).toBeCloseTo(59, 3);
      // 15 knuckles on 60 mm are 3.72 mm wide: the plugs reach 2.22 mm in, leaving 1.5 mm of the end knuckle to the pin.
      const narrow = lidForSolid(kernel, body, normalizeLidOptions({ ...HINGED, hingeKnuckles: 15 }));
      if ("error" in narrow) throw new Error(JSON.stringify(narrow.error));
      created.push(narrow.lid, narrow.hinge!.knuckles, narrow.hinge!.cuts!, narrow.hinge!.plugs!);
      const width = (60 - 14 * 0.3) / 15;
      expect(narrow.hinge!.pinLength).toBeCloseTo(60 - 2 * (width - 1.5) - 1, 6);
      const pieces = narrow.hinge!.plugs!.decompose();
      created.push(...pieces);
      pieces.forEach((piece) => expect(piece.volume()).toBeCloseTo(1.75 * 1.75 * (width - 1.5), 2));
      // On 50 mm they are 3.05 mm wide, too short for a plug of 2 mm.
      const short = openBox(kernel, created, 0, 50);
      expect(lidForSolid(kernel, short, normalizeLidOptions({ ...HINGED, hingeKnuckles: 15 }))).toEqual({ error: { code: "endPlugsShort" } });
      expect(lidForSolid(kernel, short, normalizeLidOptions({ ...HINGED, hingeKnuckles: 13 })).hasOwnProperty("lid")).toBe(true);
    } finally {
      dispose(created);
    }
  });
});
