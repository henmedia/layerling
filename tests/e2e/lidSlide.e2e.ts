import { describe, expect, it } from "vitest";
import Module from "manifold-3d";
import { lidForSolid, normalizeLidOptions, type LidHingeSide } from "@/lib/lidTool";

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
 * A box `width` wide (x), `height` high (y, the scene's up) and `depth` deep (z), with walls and floor `wall` thick, open
 * at the top; its back is -z, its front +z. 60 x 40 x 30 with 2 mm walls to begin with.
 */
function openBox(kernel: Kernel, created: Solid[], width = 60, depth = 40, wall = 2, height = 30, floor = wall) {
  const outer = kernel.Manifold.cube([width, height, depth], true).translate([0, height / 2, 0]);
  const inner = kernel.Manifold.cube([width - 2 * wall, height, depth - 2 * wall], true).translate([0, height / 2 + floor, 0]);
  const body = outer.subtract(inner);
  created.push(outer, inner, body);
  return body;
}

/** A box as `openBox`, its corners rounded `radius` outside, the hollow's `radius` less the wall inside. */
function roundedBox(kernel: Kernel, created: Solid[], width = 60, depth = 40, wall = 2, height = 30, radius = 5) {
  const rounded = (w: number, d: number, r: number) => {
    const square = kernel.CrossSection.square([w - 2 * r, d - 2 * r], true);
    const grown = square.offset(r, "Round", 2, 64);
    created.push(square, grown);
    return grown;
  };
  const outer = rounded(width, depth, radius).extrude(height).rotate([-90, 0, 0]);
  const inner = rounded(width - 2 * wall, depth - 2 * wall, radius - wall).extrude(height).rotate([-90, 0, 0]).translate([0, wall, 0]);
  const body = outer.subtract(inner);
  created.push(outer, inner, body);
  return body;
}

/** The volume two solids share. */
function shared(a: Body, b: Body, created: Solid[]) {
  const common = a.intersect(b);
  created.push(common);
  return common.volume();
}

/** The way out of the box through the side the lid slides in through, in the scene (x right, z front). */
const OUT: Record<LidHingeSide, [number, number]> = { front: [0, 1], back: [0, -1], right: [1, 0], left: [-1, 0] };

/**
 * The lid turned back over and slid into the body as it closes it: its top level with the rim, its end flush with the
 * outside of the wall it slides in through, in the middle the other way (the lids here are alike on both sides of the
 * way they slide).
 */
function closing(body: Body, lid: Body, side: LidHingeSide, created: Solid[]) {
  const turned = lid.rotate([180, 0, 0]);
  const bodyBox = body.boundingBox();
  const box = turned.boundingBox();
  const [outX, outZ] = OUT[side];
  const along = (axis: 0 | 2, out: number) => (out > 0 ? bodyBox.max[axis] - box.max[axis] : out < 0 ? bodyBox.min[axis] - box.min[axis] : (bodyBox.min[axis] + bodyBox.max[axis]) / 2 - (box.min[axis] + box.max[axis]) / 2);
  const placed = turned.translate([along(0, outX), bodyBox.max[1] - box.max[1], along(2, outZ)]);
  created.push(turned, placed);
  return placed;
}

function moved(solid: Body, offset: [number, number, number], created: Solid[]) {
  const result = solid.translate(offset);
  created.push(result);
  return result;
}

/** A block of the solid between two corners, as a volume: to tell whether material is there. */
function within(kernel: Kernel, solid: Body, from: [number, number, number], to: [number, number, number], created: Solid[]) {
  const block = kernel.Manifold.cube([to[0] - from[0], to[1] - from[1], to[2] - from[2]]).translate(from);
  created.push(block);
  return shared(solid, block, created);
}

/**
 * How many faces look down more steeply than 45 degrees, other than those lying at the solid's lowest height, on the
 * printer's plate.
 */
function overhangs(solid: Body) {
  const mesh = solid.getMesh();
  const point = (index: number) => [0, 1, 2].map((axis) => mesh.vertProperties[mesh.triVerts[index] * mesh.numProp + axis]);
  const lowest = solid.boundingBox().min[1];
  let count = 0;
  for (let triangle = 0; triangle < mesh.triVerts.length / 3; triangle += 1) {
    const [a, b, c] = [0, 1, 2].map((corner) => point(3 * triangle + corner));
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const normal = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const length = Math.hypot(...normal);
    if (length < 1e-12 || normal[1] / length > -Math.SQRT1_2 - 1e-3) continue;
    if ([a, b, c].every((corner) => Math.abs(corner[1] - lowest) < 1e-4)) continue;
    count += 1;
  }
  return count;
}

const SLIDE = { type: "slide", thickness: 2, gap: 0.2 };

/** The lid for `body` with these options, its cut taken out of the body: both, and what came with them. */
function made(kernel: Kernel, body: Body, given: Record<string, unknown>, created: Solid[]) {
  const result = lidForSolid(kernel, body, normalizeLidOptions({ ...SLIDE, ...given }));
  if ("error" in result) throw new Error(JSON.stringify(result.error));
  created.push(result.lid, result.slide!.cuts);
  const cut = body.subtract(result.slide!.cuts);
  created.push(cut);
  return { lid: result.lid, slide: result.slide!, cut, handle: result.handle };
}

describe("a slide-in lid for a box (real Manifold kernel, Discussion #1443)", () => {
  it("cuts grooves into three walls and the front wall down to the lid's underside, and makes a lid that sits in them, flush with the rim and the front", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const body = openBox(kernel, created);
      const { lid, slide, cut } = made(kernel, body, {}, created);
      expect(lid.status()).toBe("NoError");
      expect(lid.decompose().length).toBe(1);
      expect(cut.decompose().length).toBe(1);
      expect(cut.genus()).toBe(body.genus());
      // A 2 mm plate: the tongue's 0.4 mm tip, the gap upright on the slope, 0.6 mm of wall above: 0.92 mm grooves.
      const depth = 2 - 0.4 - 0.2 * (Math.SQRT2 - 1) - 0.6;
      expect(slide.depth).toBeCloseTo(depth, 9);
      expect(slide.wall).toBeCloseTo(2, 6);
      expect(slide.side).toBe("front");
      expect(slide.bumps).toBe(0);
      // The plate the gap narrower than the opening, the tongues the depth wider; from the front's outside to the tongue
      // at the back, the depth less the gap into the back wall; as thick as the plate.
      const box = lid.boundingBox();
      expect(box.max[0] - box.min[0]).toBeCloseTo(56 - 0.4 + 2 * depth, 3);
      expect(box.max[1] - box.min[1]).toBeCloseTo(2, 6);
      expect(box.max[2] - box.min[2]).toBeCloseTo(40 - 2 + depth - 0.2, 3);
      // Closed: nothing of it in the body, the gap from it everywhere.
      const closed = closing(body, lid, "front", created);
      expect(shared(closed, cut, created)).toBeLessThan(1e-6);
      expect(closed.minGap(cut, 1)).toBeGreaterThan(0.199);
      expect(closed.minGap(cut, 1)).toBeLessThan(0.2 + 1e-3);
      // The front wall is cut down to the grooves' floor, 2.2 mm under the rim, where the lid passes; its corners stand
      // full height outside the grooves, which leave 1.07 mm of the side walls behind them and 0.6 mm above them at the
      // inner face (the cut reaches a hundredth further into the walls than the gap, so its faces do not lie in theirs).
      expect(within(kernel, cut, [-1, 27.85, 18.5], [1, 31, 19.5], created)).toBeLessThan(1e-6);
      expect(within(kernel, cut, [-1, 27.6, 18.5], [1, 27.75, 19.5], created)).toBeCloseTo(2 * 0.15 * 1, 6);
      expect(within(kernel, cut, [-29.9, 29.5, 18.5], [-29.2, 30, 19.5], created)).toBeCloseTo(0.7 * 0.5 * 1, 6);
      expect(within(kernel, cut, [-30, 27.9, -10], [-28 - depth - 0.02, 29.3, 10], created)).toBeCloseTo((2 - depth - 0.02) * 1.4 * 20, 4);
      expect(within(kernel, cut, [-28 - depth, 27.85, -10], [-28, 28.4, 10], created)).toBeLessThan(1e-6);
      expect(within(kernel, cut, [-28.06, 29.41, -10], [-28.01, 30, 10], created)).toBeCloseTo(0.05 * 0.59 * 20, 4);
      expect(within(kernel, cut, [-28.06, 29.3, -10], [-28.01, 29.34, 10], created)).toBeLessThan(1e-6);
      // The back wall has its groove too, and below the grooves' floor the box is untouched.
      expect(within(kernel, cut, [-10, 27.85, -18 - depth], [10, 28.4, -18], created)).toBeLessThan(1e-6);
      expect(within(kernel, cut, [-31, -1, -21], [31, 27.79, 21], created)).toBeCloseTo(within(kernel, body, [-31, -1, -21], [31, 27.79, 21], created), 6);
    } finally {
      dispose(created);
    }
  });

  it("slides out through the front and nowhere else: the grooves hold it down and sideways, the back stops it", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      for (const gap of [0.2, 0.35]) {
        const body = openBox(kernel, created);
        const { lid, cut } = made(kernel, body, { gap, thickness: 2.4 }, created);
        const closed = closing(body, lid, "front", created);
        expect(closed.minGap(cut, 1), `gap ${gap}`).toBeCloseTo(gap, 3);
        for (const out of [0.3, 1, 2.5, 5, 12, 25, 38, 45]) expect(shared(moved(closed, [0, 0, out], created), cut, created), `gap ${gap}, ${out} mm out`).toBeLessThan(1e-6);
        const step = gap + 0.2;
        expect(shared(moved(closed, [0, 0, -step], created), cut, created), "pushed in").toBeGreaterThan(0.01);
        expect(shared(moved(closed, [0, step * Math.SQRT2, 0], created), cut, created), "lifted").toBeGreaterThan(0.01);
        expect(shared(moved(closed, [step, 0, 0], created), cut, created), "to the right").toBeGreaterThan(0.01);
        expect(shared(moved(closed, [-step, 0, 0], created), cut, created), "to the left").toBeGreaterThan(0.01);
        // Halfway out it is still held down by the grooves.
        expect(shared(moved(closed, [0, step * Math.SQRT2, 20], created), cut, created), "halfway out, lifted").toBeGreaterThan(0.01);
      }
    } finally {
      dispose(created);
    }
  });

  it("slides in through the side picked: the back, the right or the left, each the way out there and nowhere else", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      for (const side of ["back", "right", "left"] as const) {
        const body = openBox(kernel, created, 50, 70);
        const { lid, slide, cut } = made(kernel, body, { slideSide: side }, created);
        expect(slide.side).toBe(side);
        const closed = closing(body, lid, side, created);
        expect(shared(closed, cut, created), side).toBeLessThan(1e-6);
        expect(closed.minGap(cut, 1), side).toBeCloseTo(0.2, 3);
        const [x, z] = OUT[side];
        for (const out of [1, 10, 30]) expect(shared(moved(closed, [x * out, 0, z * out], created), cut, created), `${side}, ${out} mm out`).toBeLessThan(1e-6);
        for (const [dx, dz] of [[-x, -z], [z, x], [-z, -x]]) expect(shared(moved(closed, [0.4 * dx, 0, 0.4 * dz], created), cut, created), `${side}, ${dx} ${dz}`).toBeGreaterThan(0.01);
        expect(shared(moved(closed, [0, 0.4, 0], created), cut, created), `${side}, lifted`).toBeGreaterThan(0.01);
        // Its end fills the cut wall flush: the body and the closed lid together are the box again, as tall as it was.
        const together = cut.add(closed);
        created.push(together);
        const box = together.boundingBox();
        expect([box.min[0], box.min[1], box.min[2], box.max[0], box.max[1], box.max[2]].map((value) => Math.round(value * 1000) / 1000)).toEqual([-25, 0, -35, 25, 30, 35]);
      }
    } finally {
      dispose(created);
    }
  });

  it("takes a box set down turned on the plate: the grooves and the lid follow its walls, through the wall facing most nearly the side picked", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const square = openBox(kernel, created);
      const madeFor = (side: LidHingeSide) => made(kernel, square, { slideSide: side }, created);
      // Turned 60 degrees about the up axis, the box's left wall faces most nearly the front.
      for (const [degrees, wall] of [[0.5, "front"], [5, "front"], [30, "front"], [-40, "front"], [60, "left"]] as const) {
        const body = square.rotate([0, degrees, 0]);
        created.push(body);
        const { lid, slide, cut } = made(kernel, body, { slideSide: "front" }, created);
        expect(slide.side, `${degrees}`).toBe("front");
        const expected = madeFor(wall);
        // Turned back square, the box takes the cut a square box takes through that wall, and as large a lid.
        const cutsBack = slide.cuts.rotate([0, -degrees, 0]);
        created.push(cutsBack);
        expect(cutsBack.subtract(expected.slide.cuts).volume(), `${degrees}`).toBeLessThan(1e-3);
        expect(expected.slide.cuts.subtract(cutsBack).volume(), `${degrees}`).toBeLessThan(1e-3);
        expect(lid.volume(), `${degrees}`).toBeCloseTo(expected.lid.volume(), 3);
        expect(slide.depth, `${degrees}`).toBeCloseTo(expected.slide.depth, 6);
        // And the lid, turned back with it, slides into the cut body as on the square box: lying turned over beside it,
        // the lid is turned the other way.
        const lidBack = lid.rotate([0, degrees, 0]);
        const cutBack = cut.rotate([0, -degrees, 0]);
        created.push(lidBack, cutBack);
        const closed = closing(square, lidBack, wall, created);
        expect(shared(closed, cutBack, created), `${degrees}`).toBeLessThan(1e-4);
        const [x, z] = OUT[wall];
        for (const out of [1, 30]) expect(shared(moved(closed, [x * out, 0, z * out], created), cutBack, created), `${degrees}, ${out} mm out`).toBeLessThan(1e-4);
        expect(shared(moved(closed, [0, 0.4, 0], created), cutBack, created), `${degrees}, lifted`).toBeGreaterThan(0.01);
      }
    } finally {
      dispose(created);
    }
  });

  it("takes a square box whose hole stands turned a little, too little to see: the lid follows the hole", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      // A box 60 x 50 with its hole off the middle, as in the Discussion's picture; the hole straight, then turned 0.3 degrees.
      const outer = kernel.Manifold.cube([60, 30, 50], true).translate([0, 15, 0]);
      const straightHole = kernel.Manifold.cube([36, 30, 36], true).translate([-8, 17, -5]);
      const turnedHole = kernel.Manifold.cube([36, 30, 36], true).rotate([0, 0.3, 0]).translate([-8, 17, -5]);
      const straight = outer.subtract(straightHole);
      const turned = outer.subtract(turnedHole);
      created.push(outer, straightHole, turnedHole, straight, turned);
      const expected = made(kernel, straight, {}, created);
      const { lid, slide, cut } = made(kernel, turned, {}, created);
      expect(slide.side).toBe("front");
      expect(lid.decompose().length).toBe(1);
      expect(cut.decompose().length).toBe(1);
      expect(lid.volume()).toBeCloseTo(expected.lid.volume(), 0);
      expect(slide.depth).toBeCloseTo(expected.slide.depth, 2);
    } finally {
      dispose(created);
    }
  });

  it("prints without support: the body upright, the lid turned over on its top, with its bump and grip too", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const cases = [
        { given: {}, plate: (55.2 - 0.4) * (40 - 2.4 - 0.2) },
        // The grip's grooves are 1.18 mm wide a hundredth above the top.
        { given: { clickBumps: true, handle: "notch" }, plate: (55.2 - 0.4) * (40 - 2.4 - 0.2) - 4 * 24 * 1.18 },
        { given: { slideSide: "right", thickness: 3, gap: 0.3, clickBumps: true, clickBumpHeight: 0.8 }, plate: (35.2 - 0.6) * (60 - 2.4 - 0.3) },
      ];
      for (const { given, plate } of cases) {
        const body = openBox(kernel, created, 60, 40, 2.4);
        const { lid, cut } = made(kernel, body, given, created);
        expect(overhangs(cut), JSON.stringify(given)).toBe(0);
        expect(overhangs(lid), JSON.stringify(given)).toBe(0);
        // The lid lies on its top: its lowest face is the whole plate (with a grip, less its grooves).
        const upright = lid.rotate([90, 0, 0]);
        const slab = upright.slice(lid.boundingBox().min[1] + 0.01);
        created.push(upright, slab);
        expect(slab.area(), JSON.stringify(given)).toBeCloseTo(plate, 0);
      }
    } finally {
      dispose(created);
    }
  });

  it("follows a box with rounded corners: the grooves go round the back corners, the lid's end fills the front ones", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const body = roundedBox(kernel, created);
      const { lid, slide, cut } = made(kernel, body, {}, created);
      expect(lid.decompose().length).toBe(1);
      expect(cut.decompose().length).toBe(1);
      expect(slide.wall).toBeCloseTo(2, 2);
      const closed = closing(body, lid, "front", created);
      expect(shared(closed, cut, created)).toBeLessThan(1e-6);
      expect(closed.minGap(cut, 1)).toBeGreaterThan(0.199);
      for (const out of [1, 5, 20, 45]) expect(shared(moved(closed, [0, 0, out], created), cut, created), `${out} mm out`).toBeLessThan(1e-6);
      expect(shared(moved(closed, [0, 0.4, 0], created), cut, created)).toBeGreaterThan(0.01);
      expect(shared(moved(closed, [0, 0, -0.4], created), cut, created)).toBeGreaterThan(0.01);
      expect(overhangs(cut)).toBe(0);
      expect(overhangs(lid)).toBe(0);
      // Closed, the lid's end fills the front corners as far as they are round, and nothing of it stands out of the box:
      // 3 mm in from the side, the corner's round of 5 mm is 0.42 mm short of the front (0.38 mm 3.1 mm in).
      const outside = body.hull();
      created.push(outside);
      expect(closed.subtract(outside).volume()).toBeLessThan(1e-6);
      expect(within(kernel, closed, [26.9, 29.5, 19], [27, 30, 19.5], created)).toBeCloseTo(0.1 * 0.5 * 0.5, 6);
      expect(within(kernel, closed, [26.9, 29.5, 19.7], [27, 30, 20], created)).toBeLessThan(1e-6);
    } finally {
      dispose(created);
    }
  });

  it("clicks shut by a bump under its end that must go up over the cut wall's inner edge to come out", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const body = openBox(kernel, created);
      const plain = made(kernel, body, {}, created);
      const bumped = made(kernel, body, { clickBumps: true, clickBumpHeight: 0.4 }, created);
      expect(bumped.slide.bumps).toBe(1);
      expect(bumped.lid.decompose().length).toBe(1);
      const closed = closing(body, bumped.lid, "front", created);
      expect(shared(closed, bumped.cut, created)).toBeLessThan(1e-6);
      expect(closed.minGap(bumped.cut, 2)).toBeGreaterThan(0.199);
      // The bump alone: what the lid has more than the plain one, where it sits closed.
      const bump = closed.subtract(closing(body, plain.lid, "front", created));
      created.push(bump);
      expect(bump.volume()).toBeGreaterThan(0.3);
      const bumpBox = bump.boundingBox();
      // In the middle across, standing 0.6 mm (the gap and its height) under the lid, 0.4 mm into the cut wall's way,
      // just behind its inner face.
      expect((bumpBox.min[0] + bumpBox.max[0]) / 2).toBeCloseTo(0, 6);
      expect(bumpBox.min[1]).toBeCloseTo(28 - 0.6, 3);
      expect(bumpBox.max[2]).toBeLessThan(18);
      expect(bumpBox.max[2]).toBeGreaterThan(16);
      for (const out of [0.5, 1, 2, 3]) expect(shared(moved(bump, [0, 0, out], created), bumped.cut, created), `${out} mm out`).toBeGreaterThan(1e-4);
      // Raised by its height it passes over the wall; by less it does not.
      for (const out of [0.5, 1, 2, 3, 5]) expect(shared(moved(bump, [0, 0.41, out], created), bumped.cut, created), `raised, ${out} mm out`).toBeLessThan(1e-6);
      expect(shared(moved(bump, [0, 0.3, 2], created), bumped.cut, created)).toBeGreaterThan(1e-4);
    } finally {
      dispose(created);
    }
  });

  it("takes a finger grip of grooves across its top, or a pull tab, at its end at the cut wall", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const body = openBox(kernel, created);
      const plain = made(kernel, body, {}, created);
      const grip = made(kernel, body, { handle: "notch" }, created);
      const tab = made(kernel, body, { handle: "tab" }, created);
      expect(grip.handle).toEqual({ style: "notch", notch: null });
      expect(tab.handle).toEqual({ style: "tab", notch: null });
      // Four grooves 0.6 mm deep at 45 degrees, 24 mm long: 0.36 mm² across each.
      expect(plain.lid.volume() - grip.lid.volume()).toBeCloseTo(4 * 0.36 * 24, 1);
      expect(grip.lid.decompose().length).toBe(1);
      // Near the end at the cut wall: the plate's top (lying on the plate) has them 2 to 11 mm from that end.
      const closed = closing(body, grip.lid, "front", created);
      expect(shared(closed, grip.cut, created)).toBeLessThan(1e-6);
      expect(within(kernel, closed, [-11, 29.7, 7], [11, 30, 17.8], created)).toBeLessThan(within(kernel, closed, [-11, 29.7, -10], [11, 30, 0.8], created) - 2);
      // The tab: 6 mm beyond the end, as thick as the plate.
      const plainBox = plain.lid.boundingBox();
      const tabBox = tab.lid.boundingBox();
      expect((tabBox.max[2] - tabBox.min[2]) - (plainBox.max[2] - plainBox.min[2])).toBeCloseTo(6, 6);
      expect(tabBox.max[1] - tabBox.min[1]).toBeCloseTo(2, 6);
      expect(tab.lid.volume() - plain.lid.volume()).toBeGreaterThan(20 * 3 * 2);
      // A box too narrow for the grip is refused.
      const narrow = lidForSolid(kernel, openBox(kernel, created, 16, 40), normalizeLidOptions({ ...SLIDE, handle: "notch" }));
      expect(narrow).toEqual({ error: { code: "handleSideShort" } });
    } finally {
      dispose(created);
    }
  });

  it("cuts walls inside the box down under the lid too", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const box = openBox(kernel, created);
      const divider = kernel.Manifold.cube([2, 30, 40], true).translate([0, 15, 0]);
      const body = box.add(divider);
      created.push(divider, body);
      const { lid, cut } = made(kernel, body, {}, created);
      const closed = closing(body, lid, "front", created);
      expect(shared(closed, cut, created)).toBeLessThan(1e-6);
      expect(shared(moved(closed, [0, 0, 30], created), cut, created)).toBeLessThan(1e-6);
      expect(within(kernel, cut, [-1, 27.85, -15], [1, 30, 15], created)).toBeLessThan(1e-6);
      expect(within(kernel, cut, [-1, 20, -15], [1, 27.75, 15], created)).toBeCloseTo(2 * 7.75 * 30, 3);
    } finally {
      dispose(created);
    }
  });

  it("refuses a round body, a tapering one, walls or a plate too thin, a box too shallow, a closed top, magnets and a hinge", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const refusal = (body: Body, given: Record<string, unknown> = {}) => {
        const result = lidForSolid(kernel, body, normalizeLidOptions({ ...SLIDE, ...given }));
        if (!("error" in result)) created.push(result.lid, ...(result.slide ? [result.slide.cuts] : []));
        return "error" in result ? result.error : null;
      };
      const outer = kernel.Manifold.cylinder(30, 25, 25, 96).rotate([-90, 0, 0]);
      const cavity = kernel.Manifold.cylinder(30, 23, 23, 96).rotate([-90, 0, 0]).translate([0, 2, 0]);
      const pot = outer.subtract(cavity);
      created.push(outer, cavity, pot);
      expect(refusal(pot)).toEqual({ code: "slideNotBox" });
      // Wider at the top: its walls lean out.
      const tapering = kernel.Manifold.hull([kernel.Manifold.cube([56, 0.01, 36], true), kernel.Manifold.cube([60, 0.01, 40], true).translate([0, 30, 0])]);
      const hollow = kernel.Manifold.hull([kernel.Manifold.cube([52, 0.01, 32], true).translate([0, 2, 0]), kernel.Manifold.cube([56, 0.01, 36], true).translate([0, 30.01, 0])]);
      const leaning = tapering.subtract(hollow);
      created.push(tapering, hollow, leaning);
      expect(refusal(leaning)).toEqual({ code: "slideNotBox" });
      // An L-shaped box: its opening's hull reaches out of it.
      const arm = openBox(kernel, created, 20, 40);
      const lShape = openBox(kernel, created).add(arm.translate([20, 0, -30]));
      created.push(lShape);
      expect(refusal(lShape)).toEqual({ code: "slideNotBox" });
      // The tongue must reach 0.4 mm past the gap into a wall that keeps 0.8 mm behind its groove: 1.4 mm.
      expect(refusal(openBox(kernel, created, 60, 40, 1.3))).toEqual({ code: "slideThinWall", wall: 1.4 });
      expect(refusal(openBox(kernel, created, 60, 40, 1.4))).toBeNull();
      expect(refusal(openBox(kernel, created, 60, 40, 1.4), { gap: 0.3 })).toEqual({ code: "slideThinWall", wall: 1.5 });
      // The plate must hold that and its tip, the gap on the slope and the wall above: 1.7 mm.
      expect(refusal(openBox(kernel, created), { thickness: 1.6 })).toEqual({ code: "slideThinLid", thickness: 1.7 });
      expect(refusal(openBox(kernel, created), { thickness: 1.7 })).toBeNull();
      // The opening must reach below the grooves' floor: 2.2 mm with a 2 mm plate.
      expect(refusal(openBox(kernel, created, 60, 40, 2, 30, 28))).toEqual({ code: "slideShallow", depth: 2.3 });
      expect(refusal(openBox(kernel, created, 60, 40, 2, 30, 27.7))).toBeNull();
      const solid = kernel.Manifold.cube([60, 30, 40], true).translate([0, 15, 0]);
      created.push(solid);
      expect(refusal(solid)).toEqual({ code: "notOpen" });
      for (const extra of [{ magnets: true }, { hinge: true }]) expect(refusal(openBox(kernel, created), extra), JSON.stringify(extra)).toEqual({ code: "slideExtras" });
      // Depth and wall do not count: neither a lip nor a rim.
      expect(refusal(openBox(kernel, created, 60, 40, 2, 10), { depth: 50, wall: 10 })).toBeNull();
    } finally {
      dispose(created);
    }
  });
});
