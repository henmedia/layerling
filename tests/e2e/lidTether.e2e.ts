import { describe, expect, it } from "vitest";
import Module from "manifold-3d";
import { lidForSolid, normalizeLidOptions } from "@/lib/lidTool";

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
 * A round pot `diameter` across and `height` high (y, the scene's up), with a wall and floor `wall` thick, open at the
 * top, standing on y = 0 round the y axis: 60 across, 50 high, 2 mm wall, as the editor's hollowed cylinder.
 */
function openPot(kernel: Kernel, created: Solid[], diameter = 60, height = 50, wall = 2, sides = 192) {
  const outer = kernel.Manifold.cylinder(height, diameter / 2, diameter / 2, sides).rotate([-90, 0, 0]);
  const cavity = kernel.Manifold.cylinder(height, diameter / 2 - wall, diameter / 2 - wall, sides).rotate([-90, 0, 0]).translate([0, wall, 0]);
  const pot = outer.subtract(cavity);
  created.push(outer, cavity, pot);
  return pot;
}

/**
 * The cap turned back over and set on the body as it closes it: its plate on the rim (y = top), on the body's axis. The
 * cap is round, so its box is centred on its axis.
 */
function closing(body: Body, lid: Body, thickness: number, created: Solid[]) {
  const turned = lid.rotate([180, 0, 0]);
  const bodyBox = body.boundingBox();
  const box = turned.boundingBox();
  const placed = turned.translate([
    (bodyBox.min[0] + bodyBox.max[0]) / 2 - (box.min[0] + box.max[0]) / 2,
    bodyBox.max[1] + thickness - box.max[1],
    (bodyBox.min[2] + bodyBox.max[2]) / 2 - (box.min[2] + box.max[2]) / 2,
  ]);
  created.push(turned, placed);
  return placed;
}

/** The volume two solids share. */
function shared(a: Body, b: Body, created: Solid[]) {
  const common = a.intersect(b);
  created.push(common);
  return common.volume();
}

/** The solid moved by (x, y, z). */
function shifted(solid: Body, [x, y, z]: readonly [number, number, number], created: Solid[]) {
  const moved = solid.translate([x, y, z]);
  created.push(moved);
  return moved;
}

/** A tether's ring is 1.2 mm wide across the radius and 2 mm tall; its strap 0.6 mm thick. */
const RING_WIDTH = 1.2;
const RING_HEIGHT = 2;
const STRAP_THICKNESS = 0.6;

/**
 * The tether's two rings cut out of the printed part and set where they go on the pot's axis (y up): the cap's ring as
 * it was printed, its bottom at `capLow`, the body's turned over about the scene's z, its top at `neckHigh`, so the
 * strap's stub on each points to +x, on the cap's ring at its lower edge and on the body's at its upper edge. Each ring
 * is cut out with 0.3 mm of the strap. The part starts where the cap does along x (`lid`), its opening on that side
 * keeping it from quite reaching there. Returns the strap between the rings as printed, too.
 */
function mountedRings(kernel: Kernel, part: Body, lid: Body, tether: { strap: number; neckRing: number; capRing: number }, capLow: number, neckHigh: number, created: Solid[]) {
  const box = part.boundingBox();
  const capOuter = tether.capRing / 2 + RING_WIDTH;
  const neckOuter = tether.neckRing / 2 + RING_WIDTH;
  const middleZ = (box.min[2] + box.max[2]) / 2;
  const capX = lid.boundingBox().min[0] + capOuter;
  const neckX = capX + capOuter + tether.strap + neckOuter;
  const around = (x: number, radius: number) => {
    const cylinder = kernel.Manifold.cylinder(10, radius, radius, 256).rotate([-90, 0, 0]).translate([x, box.min[1] - 1, middleZ]);
    const cut = part.intersect(cylinder);
    created.push(cylinder, cut);
    return cut;
  };
  const capCut = around(capX, capOuter + 0.3);
  const neckCut = around(neckX, neckOuter + 0.3);
  const capRing = shifted(capCut, [-capX, capLow - box.min[1], -middleZ], created);
  const centredNeck = shifted(neckCut, [-neckX, -box.min[1], -middleZ], created);
  const flipped = centredNeck.rotate([0, 0, 180]);
  created.push(flipped);
  const neckRing = shifted(flipped, [0, neckHigh, 0], created);
  // The strap between them, as printed: the part between the rings' outer faces along its middle, a hundredth of a
  // millimetre in from each, so nothing of a ring that only touches there comes with it.
  const between = kernel.Manifold.cube([neckX - neckOuter - (capX + capOuter) - 0.02, 20, 2 * capOuter + 2]).translate([capX + capOuter + 0.01, box.min[1] - 1, middleZ - capOuter - 1]);
  const strap = part.intersect(between);
  created.push(between, strap);
  return { capRing, neckRing, capOuter, neckOuter, strap };
}

/**
 * Faces that look down more steeply than 45 degrees, other than those lying on the printer's plate (at `plate`) and,
 * for parts of the body, those inside its wall (nearer the axis `centre` than `inside`).
 */
function overhangs(solid: Body, inside: number, centre: readonly [number, number], plate: number) {
  const mesh = solid.getMesh();
  const point = (index: number) => [0, 1, 2].map((axis) => mesh.vertProperties[mesh.triVerts[index] * mesh.numProp + axis]);
  let count = 0;
  for (let triangle = 0; triangle < mesh.triVerts.length / 3; triangle += 1) {
    const [a, b, c] = [0, 1, 2].map((corner) => point(3 * triangle + corner));
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const normal = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const length = Math.hypot(...normal);
    if (length < 1e-12 || normal[1] / length > -Math.SQRT1_2 - 1e-3) continue;
    if ([a, b, c].every((corner) => Math.abs(corner[1] - plate) < 1e-4)) continue;
    if ([a, b, c].every((corner) => Math.hypot(corner[0] - centre[0], corner[2] - centre[1]) < inside)) continue;
    count += 1;
  }
  return count;
}

const SCREW = { type: "screw", thickness: 2, gap: 0.2, wall: 1.6, threadPitch: 3, threadTurns: 2, tether: true };
const BAYONET = { type: "bayonet", thickness: 2, gap: 0.2, wall: 1.6, bayonetLugs: 3, bayonetDepth: 8, bayonetAxialGap: 0.3, bayonetDetent: 0, tether: true };

describe("a tether for a screw or bayonet cap (real Manifold kernel, asked in the Layerling User Group on Facebook)", () => {
  it("adds a bead below the screw cap for one ring and a collar and bead round the cap for the other, and both rings fit their places without touching", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const body = openPot(kernel, created);
      const result = lidForSolid(kernel, body, normalizeLidOptions(SCREW));
      if ("error" in result) throw new Error(JSON.stringify(result.error));
      const { lid, screw, tether } = result;
      created.push(lid, screw!.thread);
      expect(tether).toBeDefined();
      created.push(tether!.part, tether!.bead);
      for (const solid of [lid, tether!.part, tether!.bead]) expect(solid.status()).toBe("NoError");
      expect(lid.decompose().length).toBe(1);
      expect(tether!.part.decompose().length).toBe(1);
      expect(tether!.bead.decompose().length).toBe(1);
      // Both rings are open, so they can be opened a little to snap on: two closed rings would make the part a body with
      // two holes through it. Each opening is on the side away from the strap, which lies along x between them.
      expect(tether!.part.genus()).toBe(0);
      const partBox = tether!.part.boundingBox();
      const lidMinX = lid.boundingBox().min[0];
      const middleZ = (partBox.min[2] + partBox.max[2]) / 2;
      const material = (x: number) => {
        const probe = kernel.Manifold.cube([0.2, 0.2, 0.2], true).translate([x, 1, middleZ]);
        const hit = tether!.part.intersect(probe);
        created.push(probe, hit);
        return hit.volume() > 1e-4;
      };
      // The cap's ring from x = lidMinX to + 68.2, the strap 16 mm on, then the body's ring 62.8 across.
      expect(material(lidMinX + 0.6)).toBe(false);
      expect(material(lidMinX + 68.2 - 0.6)).toBe(true);
      expect(material(lidMinX + 68.2 + 16 + 0.6)).toBe(true);
      expect(material(lidMinX + 68.2 + 16 + 62.8 - 0.6)).toBe(false);
      // The rings 0.2 mm larger inside than the pot (60) and the cap (65.4); the strap 16 mm long.
      expect(tether!.neckRing).toBeCloseTo(60.4, 6);
      expect(tether!.capRing).toBeCloseTo(65.8, 6);
      expect(tether!.strap).toBe(16);
      // The cap is as wide as its collar now: the screw lid says so.
      expect(screw!.diameter).toBeCloseTo(2 * (32.7 + 0.7), 6);
      // The bead: under the cap's mouth (44), the ring's 2 mm and the play above and below it; its flat top 0.7 mm out.
      const beadBox = tether!.bead.boundingBox();
      expect(beadBox.max[1]).toBeCloseTo(44 - 0.2 - 2 - 0.2, 6);
      expect(beadBox.max[0]).toBeGreaterThan(30.69);
      expect(beadBox.max[0]).toBeLessThan(30.71);
      // Thread and bead go with the body as one, which keeps its single opening.
      const withAll = body.add(screw!.thread).add(tether!.bead);
      created.push(withAll);
      expect(withAll.decompose().length).toBe(1);
      expect(withAll.genus()).toBe(body.genus());
      // The cap: as wide as its collar and bead now, 0.2 + 0.5 out of its rim; closed, nothing of it in the body.
      const closed = closing(body, lid, 2, created);
      expect(shared(closed, withAll, created)).toBeLessThan(1e-6);
      const capBox = closed.boundingBox();
      expect(capBox.max[0]).toBeCloseTo(32.7 + 0.7, 2);
      expect(capBox.min[1]).toBeCloseTo(44, 3);
      // The rings where they go: the cap's under its collar (51), the body's under the cap's mouth.
      const { capRing, neckRing } = mountedRings(kernel, tether!.part, lid, tether!, 51 - 0.2 - 2, 44 - 0.2, created);
      for (const [name, ring, other] of [
        ["the body's ring in the body", neckRing, withAll], ["the body's ring in the cap", neckRing, closed], ["the cap's ring in the cap", capRing, closed],
        ["the cap's ring in the body", capRing, withAll], ["the rings in each other", capRing, neckRing],
      ] as const) expect(shared(ring, other, created), name).toBeLessThan(1e-6);
      // Each keeps the play: the body's ring round the pot and from the bead and the cap's mouth, the cap's round the cap
      // and below its collar, 0.7 of it on its bead's 45 degree slope.
      expect(neckRing.minGap(withAll, 1)).toBeCloseTo(0.2, 2);
      expect(neckRing.minGap(closed, 1)).toBeCloseTo(0.2, 2);
      expect(capRing.minGap(closed, 1)).toBeCloseTo(0.2 * Math.SQRT1_2, 2);
    } finally {
      dispose(created);
    }
  });

  it("lets the screw cap turn a whole turn off, the cap turning inside its ring, without the cap or the rings touching the body", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const body = openPot(kernel, created);
      const result = lidForSolid(kernel, body, normalizeLidOptions(SCREW));
      if ("error" in result) throw new Error(JSON.stringify(result.error));
      const { lid, screw, tether } = result;
      created.push(lid, screw!.thread, tether!.part, tether!.bead);
      const withAll = body.add(screw!.thread).add(tether!.bead);
      // What stands out of the pot's wall: the thread and the bead (the cap's plate rests on the rim when closed).
      const outside = screw!.thread.add(tether!.bead).subtract(body);
      created.push(withAll, outside);
      const closed = closing(body, lid, 2, created);
      const { capRing, neckRing } = mountedRings(kernel, tether!.part, lid, tether!, 48.8, 43.8, created);
      // Turned anticlockwise seen from above, the cap rises a pitch a turn; the cap's ring rises with it but is held by
      // the strap, so the cap turns inside it.
      for (let step = 0; step <= 24; step += 1) {
        const degrees = 15 * step;
        const lift = (3 * degrees) / 360;
        const cap = shifted(closed.rotate([0, degrees, 0]), [0, lift, 0], created);
        const ring = shifted(capRing, [0, lift, 0], created);
        expect(shared(cap, withAll, created), `cap at ${degrees}°`).toBeLessThan(1e-6);
        expect(shared(cap, neckRing, created), `cap and body's ring at ${degrees}°`).toBeLessThan(1e-6);
        expect(shared(ring, cap, created), `cap's ring at ${degrees}°`).toBeLessThan(1e-6);
        expect(shared(ring, withAll, created), `cap's ring and body at ${degrees}°`).toBeLessThan(1e-6);
        expect(shared(ring, neckRing, created), `rings at ${degrees}°`).toBeLessThan(1e-6);
        if (step % 6 === 0) {
          expect(cap.minGap(outside, 1), `gap at ${degrees}°`).toBeGreaterThan(0.2 * Math.SQRT1_2 - 1e-3);
          expect(ring.minGap(cap, 1), `ring's gap at ${degrees}°`).toBeGreaterThan(0.2 * Math.SQRT1_2 - 1e-3);
        }
      }
    } finally {
      dispose(created);
    }
  });

  it("keeps both rings on: slid down or up, each runs into a bead, the collar or the thread, and its strap reaches with the cap lifted off and tipped aside", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const body = openPot(kernel, created);
      const result = lidForSolid(kernel, body, normalizeLidOptions(SCREW));
      if ("error" in result) throw new Error(JSON.stringify(result.error));
      const { lid, screw, tether } = result;
      created.push(lid, screw!.thread, tether!.part, tether!.bead);
      const withAll = body.add(screw!.thread).add(tether!.bead);
      created.push(withAll);
      const closed = closing(body, lid, 2, created);
      const mounted = mountedRings(kernel, tether!.part, lid, tether!, 48.8, 43.8, created);
      const { capRing, neckRing } = mounted;
      // The body's ring slid down: from a little more than the play on it is in the bead, all the way until it would be
      // past it, 3.1 mm down, where the bead's slope comes in to the ring's inner face.
      for (let down = 0.25; down <= 3; down += 0.25) {
        expect(shared(shifted(neckRing, [0, -down, 0], created), withAll, created), `body's ring ${down} mm down`).toBeGreaterThan(1e-3);
      }
      // Up, it runs into the thread's start, then into the thread wherever it is.
      for (let up = 0.75; up <= 6; up += 0.25) {
        expect(shared(shifted(neckRing, [0, up, 0], created), withAll, created), `body's ring ${up} mm up`).toBeGreaterThan(1e-3);
      }
      // The cap's ring towards the mouth runs into the cap's bead, towards the plate into the collar.
      for (let down = 0.25; down <= 3; down += 0.25) {
        expect(shared(shifted(capRing, [0, -down, 0], created), closed, created), `cap's ring ${down} mm down`).toBeGreaterThan(1e-3);
      }
      for (let up = 0.25; up <= 1; up += 0.25) {
        expect(shared(shifted(capRing, [0, up, 0], created), closed, created), `cap's ring ${up} mm up`).toBeGreaterThan(1e-3);
      }
      // The strap as printed is 16 mm between the rings, 5 mm wide and 0.6 thick all along, lying on the plate.
      const strapBox = mounted.strap.boundingBox();
      expect(strapBox.max[0] - strapBox.min[0]).toBeCloseTo(16 - 0.02, 6);
      expect(strapBox.max[2] - strapBox.min[2]).toBeCloseTo(5, 6);
      expect(strapBox.min[1]).toBeCloseTo(0, 6);
      expect(strapBox.max[1]).toBeCloseTo(STRAP_THICKNESS, 6);
      expect(mounted.strap.volume()).toBeCloseTo((16 - 0.02) * 5 * STRAP_THICKNESS, 3);
      // Its ends: the cap's ring's outer face at its lower edge, the body's ring's at its upper edge, both at +x.
      const capEnd: [number, number] = [mounted.capOuter, 48.8 + STRAP_THICKNESS / 2];
      const neckEnd: [number, number] = [mounted.neckOuter, 43.8 - STRAP_THICKNESS / 2];
      // Closed, the strap bows out; unscrewed and lifted until the cap's mouth is a millimetre over the rim (7 mm), it
      // still reaches, with 2 mm to spare for its bends.
      expect(Math.hypot(capEnd[0] - neckEnd[0], capEnd[1] - neckEnd[1])).toBeLessThan(tether!.strap / 2);
      expect(Math.hypot(capEnd[0] - neckEnd[0], capEnd[1] + 7 - neckEnd[1])).toBeLessThan(tether!.strap - 2);
      // Then tipped a quarter turn outwards about its mouth's outer edge (32.7 mm out, 51 up), the cap stands beside the
      // neck, clear of the pot, the thread, the bead and the body's ring, and the strap still reaches; from there it can
      // swing down and hang.
      const tip = (solid: Body) => {
        const moved = solid.translate([-32.7, 7 - 51, 0]).rotate([0, 0, -90]).translate([32.7, 51, 0]);
        created.push(moved);
        return moved;
      };
      const tipped = tip(closed);
      expect(tipped.boundingBox().min[0]).toBeGreaterThan(32.7 - 1e-3);
      expect(shared(tipped, withAll, created)).toBeLessThan(1e-6);
      expect(shared(tipped, neckRing, created)).toBeLessThan(1e-6);
      const tippedEnd: [number, number] = [32.7 + (capEnd[1] + 7 - 51), 51 - (capEnd[0] - 32.7)];
      expect(Math.hypot(tippedEnd[0] - neckEnd[0], tippedEnd[1] - neckEnd[1])).toBeLessThan(tether!.strap - 2);
      // The rings and the strap as one part beside the cap, clear of the pot and the cap.
      const partBox = tether!.part.boundingBox();
      const lidBox = lid.boundingBox();
      expect(partBox.max[2]).toBeLessThan(lidBox.min[2]);
      expect(partBox.min[1]).toBeCloseTo(0, 6);
      expect(partBox.max[1]).toBeCloseTo(RING_HEIGHT, 6);
      expect(partBox.min[0]).toBeGreaterThan(body.boundingBox().max[0]);
    } finally {
      dispose(created);
    }
  });

  it("prints without support: the tether flat, the body upright with its bead, the cap with its collar and bead turned over on its plate", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      for (const given of [SCREW, BAYONET]) {
        const body = openPot(kernel, created);
        const result = lidForSolid(kernel, body, normalizeLidOptions(given));
        if ("error" in result) throw new Error(JSON.stringify(result.error));
        created.push(result.lid, result.tether!.part, result.tether!.bead, ...(result.screw ? [result.screw.thread] : []), ...(result.bayonet ? [result.bayonet.lugs] : []));
        expect(overhangs(result.tether!.part, 0, [0, 0], 0), given.type).toBe(0);
        expect(overhangs(result.tether!.bead, 29.99, [0, 0], 0), given.type).toBe(0);
        const lidBox = result.lid.boundingBox();
        expect(overhangs(result.lid, 0, [(lidBox.min[0] + lidBox.max[0]) / 2, (lidBox.min[2] + lidBox.max[2]) / 2], lidBox.min[1]), given.type).toBe(0);
      }
    } finally {
      dispose(created);
    }
  });

  it("goes on a bayonet cap too: the rings stay clear while the cap goes down over the lugs and turns to lock, and the lugs keep the body's ring on", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const body = openPot(kernel, created);
      const result = lidForSolid(kernel, body, normalizeLidOptions(BAYONET));
      if ("error" in result) throw new Error(JSON.stringify(result.error));
      const { lid, bayonet, tether } = result;
      created.push(lid, bayonet!.lugs, tether!.part, tether!.bead);
      // The cap 66.6 across, its mouth 8 mm under the rim (42).
      expect(tether!.capRing).toBeCloseTo(66.6 + 0.4, 6);
      expect(tether!.neckRing).toBeCloseTo(60.4, 6);
      expect(bayonet!.diameter).toBeCloseTo(2 * (33.3 + 0.7), 6);
      const withAll = body.add(bayonet!.lugs).add(tether!.bead);
      created.push(withAll);
      expect(withAll.decompose().length).toBe(1);
      const closed = closing(body, lid, 2, created);
      const { capRing, neckRing } = mountedRings(kernel, tether!.part, lid, tether!, 48.8, 42 - 0.2, created);
      expect(shared(closed, withAll, created)).toBeLessThan(1e-6);
      const turn = bayonet!.turn;
      // Set on open (turned back by the turn), pushed down and turned to the lock: no part touches another.
      const positions = [
        ...[8, 4, 2, 0].map((lift) => ({ degrees: turn, lift })),
        ...Array.from({ length: 9 }, (_, step) => ({ degrees: turn * (1 - step / 8), lift: 0 })),
      ];
      for (const { degrees, lift } of positions) {
        const cap = shifted(closed.rotate([0, degrees, 0]), [0, lift, 0], created);
        const ring = shifted(capRing, [0, lift, 0], created);
        expect(shared(cap, withAll, created), `cap at ${degrees}°, ${lift} mm up`).toBeLessThan(1e-6);
        expect(shared(cap, neckRing, created), `cap and body's ring at ${degrees}°, ${lift} mm up`).toBeLessThan(1e-6);
        expect(shared(ring, cap, created), `cap's ring at ${degrees}°, ${lift} mm up`).toBeLessThan(1e-6);
        expect(shared(ring, withAll, created), `cap's ring and body at ${degrees}°, ${lift} mm up`).toBeLessThan(1e-6);
        expect(shared(ring, neckRing, created), `rings at ${degrees}°, ${lift} mm up`).toBeLessThan(1e-6);
      }
      // With the cap off, the body's ring slides up the wall below the lugs, but not past them: their undersides come down
      // to 47 mm at its inner face.
      expect(shared(shifted(neckRing, [0, 2, 0], created), withAll, created)).toBeLessThan(1e-6);
      expect(shared(shifted(neckRing, [0, 6, 0], created), withAll, created)).toBeGreaterThan(1e-3);
      expect(shared(shifted(neckRing, [0, -0.5, 0], created), withAll, created)).toBeGreaterThan(1e-3);
    } finally {
      dispose(created);
    }
  });

  it("refuses a tether on a lid that is not turned, a cap too short for its ring, a body too low or not round below the cap, and a wall too thin there", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const refusal = (body: Body, given: Record<string, unknown> = {}) => {
        const result = lidForSolid(kernel, body, normalizeLidOptions({ ...SCREW, ...given }));
        if (!("error" in result)) created.push(result.lid, ...(result.screw ? [result.screw.thread] : []), ...(result.bayonet ? [result.bayonet.lugs] : []), ...(result.tether ? [result.tether.part, result.tether.bead] : []));
        return "error" in result ? result.error : null;
      };
      for (const type of ["plug", "cap", "both", "flat"]) expect(refusal(openPot(kernel, created), { type }), type).toEqual({ code: "tetherType" });
      // A single turn of a 3 mm thread: the collar, the ring and the bead take 3.8 mm of rim.
      expect(refusal(openPot(kernel, created), { threadTurns: 1 })).toEqual({ code: "tetherCapShort", depth: 3.8 });
      expect(refusal(openPot(kernel, created), { threadTurns: 1.5 })).toBeNull();
      expect(refusal(openPot(kernel, created), { type: "bayonet", bayonetDepth: 4.3 })).toBeNull();
      // Under the cap the ring, the play above and below it and the bead take 4.5 mm, and 0.4 mm of the pot stays below.
      expect(refusal(openPot(kernel, created, 60, 10.8))).toEqual({ code: "tetherNoNeck", length: 4.5 });
      expect(refusal(openPot(kernel, created, 60, 11))).toBeNull();
      // A bottle whose neck (the pot's top 10 mm) stands on a wider body: the neck must reach 4.5 mm below the cap.
      const bottle = (neck: number) => {
        const wide = kernel.Manifold.cylinder(50 - neck, 40, 40, 192).rotate([-90, 0, 0]);
        const hollow = kernel.Manifold.cylinder(50, 28, 28, 192).rotate([-90, 0, 0]).translate([0, 2, 0]);
        const shape = openPot(kernel, created).add(wide).subtract(hollow);
        created.push(wide, hollow, shape);
        return shape;
      };
      expect(refusal(bottle(10))).toEqual({ code: "tetherNoNeck", length: 4.5 });
      expect(refusal(bottle(11))).toBeNull();
      // A wall of 2 mm where the thread goes and 0.6 mm lower down, where the bead goes.
      const outer = kernel.Manifold.cylinder(50, 30, 30, 192).rotate([-90, 0, 0]);
      const hollow = kernel.Manifold.cylinder(50, 28, 28, 192).rotate([-90, 0, 0]).translate([0, 2, 0]);
      const thinner = kernel.Manifold.cylinder(41, 29.4, 29.4, 192).rotate([-90, 0, 0]).translate([0, 2, 0]);
      const thin = outer.subtract(hollow).subtract(thinner);
      created.push(outer, hollow, thinner, thin);
      expect(refusal(thin)).toEqual({ code: "tetherThinWall" });
    } finally {
      dispose(created);
    }
  });
});
