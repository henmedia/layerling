import { describe, expect, it } from "vitest";
import Module from "manifold-3d";
import { FLIP_HINGE_LENGTH, FLIP_HINGE_THICKNESS, flipTopPlan, lidForSolid, normalizeLidOptions } from "@/lib/lidTool";

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
 * top, standing on y = 0 round the y axis, as the screw lid's test has it.
 */
function openPot(kernel: Kernel, created: Solid[], diameter = 60, height = 50, wall = 2, sides = 192) {
  const outer = kernel.Manifold.cylinder(height, diameter / 2, diameter / 2, sides).rotate([-90, 0, 0]);
  const cavity = kernel.Manifold.cylinder(height, diameter / 2 - wall, diameter / 2 - wall, sides).rotate([-90, 0, 0]).translate([0, wall, 0]);
  const pot = outer.subtract(cavity);
  created.push(outer, cavity, pot);
  return pot;
}

/** The cap turned back over and set on the body as it closes it: its plate on the rim, on the body's axis. */
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

/** Whether a tiny cube at (x, y, z) lies in the solid. */
function solidAt(kernel: Kernel, solid: Body, [x, y, z]: readonly [number, number, number], created: Solid[]) {
  const probe = kernel.Manifold.cube([0.05, 0.05, 0.05], true).translate([x, y, z]);
  const hit = solid.intersect(probe);
  created.push(probe, hit);
  return hit.volume() > 0.00005;
}

/** A circle of `radius` round (0, 0), anticlockwise, as the frame where z is up has the pot's opening seen from above. */
function circle(radius: number, sides = 192): [number, number][] {
  return Array.from({ length: sides }, (_, index): [number, number] => [radius * Math.cos((2 * Math.PI * index) / sides), radius * Math.sin((2 * Math.PI * index) / sides)]);
}

const FLIP = { type: "screw", thickness: 2, gap: 0.2, wall: 1.6, threadPitch: 3, threadTurns: 2, flipTop: true, flipTopOpening: 8 };

/**
 * The flip-top cap closed on a pot 60 across with a 2 mm wall and 50 high, its plate from 50 to 52, and the same cap with
 * the strip taken out between flap and plate, in `pieces`: the cap, then the flap. The hinge is at the frame's +y, the
 * scene's -z: the strip runs along x at z = -(back + length / 2), on the plate's top, and `turn` swings a piece about it.
 */
function flipTopOnPot(kernel: Kernel, created: Solid[], given: Record<string, unknown> = {}) {
  const options = normalizeLidOptions({ ...FLIP, ...given });
  const body = openPot(kernel, created);
  const result = lidForSolid(kernel, body, options);
  if ("error" in result) throw new Error(JSON.stringify(result.error));
  created.push(result.lid, ...(result.screw ? [result.screw.thread] : []), ...(result.bayonet ? [result.bayonet.lugs] : []));
  const plan = flipTopPlan(options, [0, 0], [circle(28).reverse()]);
  if ("error" in plan) throw new Error(JSON.stringify(plan.error));
  const closed = closing(body, result.lid, options.thickness, created);
  const high = 50 + options.thickness;
  const half = plan.hingeWidth / 2;
  const strip = kernel.Manifold.cube([2 * half + options.gap, FLIP_HINGE_THICKNESS + 1, FLIP_HINGE_LENGTH - 0.04]).translate([-half - options.gap / 2, high - FLIP_HINGE_THICKNESS, -(plan.back + FLIP_HINGE_LENGTH - 0.02)]);
  const apart = closed.subtract(strip);
  const pieces = apart.decompose().sort((a, b) => b.volume() - a.volume());
  created.push(strip, apart, ...pieces);
  const turn = (solid: Body, degrees: number) => {
    // Opened: the flap's front (the scene's +z) rises about the strip's line on the plate's top.
    const turned = solid.translate([0, -high, plan.back + FLIP_HINGE_LENGTH / 2]).rotate([-degrees, 0, 0]).translate([0, high, -(plan.back + FLIP_HINGE_LENGTH / 2)]);
    created.push(turned);
    return turned;
  };
  const withThread = result.screw ? body.add(result.screw.thread) : body.add(result.bayonet!.lugs);
  created.push(withThread);
  return { result, options, plan, body, withThread, closed, pieces, high, turn };
}

describe("a flip-top on a screw lid (real Manifold kernel)", () => {
  it("is one body with its flap, joined by the strip alone, and the opening goes through the plate under the flap", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const { result, closed, pieces, plan, high } = flipTopOnPot(kernel, created);
      expect(result.lid.status()).toBe("NoError");
      expect(result.lid.decompose().length).toBe(1);
      expect(result.flipTop).toEqual({ opening: 8, flap: expect.closeTo(8.8, 9), hingeWidth: expect.closeTo(plan.hingeWidth, 9), hingeLength: 3, hingeThickness: 0.4 });
      // Without the strip, two: the cap, and the flap.
      expect(pieces.length).toBe(2);
      const [cap, flap] = pieces;
      // A rod a hair thinner than the opening goes through the cap's plate; the flap fills it.
      const rod = kernel.Manifold.cylinder(10, 3.95, 3.95, 96).rotate([-90, 0, 0]).translate([0, high - 6, 0]);
      const throughCap = cap.intersect(rod);
      const throughFlap = flap.intersect(rod);
      created.push(rod, throughCap, throughFlap);
      expect(throughCap.volume()).toBeLessThan(1e-6);
      expect(throughFlap.volume()).toBeGreaterThan(Math.PI * 3.95 ** 2 * 1.2);
      // Closed, the flap's top is flush with the plate's.
      expect(flap.boundingBox().max[1]).toBeCloseTo(high, 6);
      expect(closed.boundingBox().max[1]).toBeCloseTo(high, 6);
    } finally {
      dispose(created);
    }
  });

  it("keeps the gap between flap and plate all round, and the flap neither falls in nor lifts out without clicking past its catch", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const { pieces: [cap, flap] } = flipTopOnPot(kernel, created);
      expect(flap.minGap(cap, 1)).toBeGreaterThan(0.2 * Math.cos(Math.PI / 96) - 1e-4);
      expect(flap.minGap(cap, 1)).toBeLessThan(0.2 + 1e-4);
      const moved = (dy: number) => {
        const shifted = flap.translate([0, dy, 0]);
        const overlap = shifted.intersect(cap);
        created.push(shifted, overlap);
        return overlap.volume();
      };
      // Pressed in by less than the gap along its 45 degree seat it is free; further, it rests on the seat.
      expect(moved(-0.25)).toBeLessThan(1e-6);
      expect(moved(-0.4)).toBeGreaterThan(1e-3);
      // Lifted straight out it meets the plate over its catch at the front (the scene's +z).
      expect(moved(0.1)).toBeLessThan(1e-6);
      expect(moved(1)).toBeGreaterThan(1e-3);
      const lifted = flap.translate([0, 1, 0]).intersect(cap);
      created.push(lifted);
      expect(lifted.boundingBox().min[2]).toBeGreaterThan(1);
    } finally {
      dispose(created);
    }
  });

  it("swings up about the strip clear of the cap, its catch clicking past the plate's edge, and lies back on the plate", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const { pieces: [cap, flap], withThread, turn, high } = flipTopOnPot(kernel, created);
      const overlaps = [2, 4, 6, 8, 10, 15, 20, 30, 45, 60, 90, 120, 150, 180].map((degrees) => {
        const swung = turn(flap, degrees);
        const withCap = swung.intersect(cap);
        const withBody = swung.intersect(withThread);
        created.push(withCap, withBody);
        expect(withBody.volume(), `${degrees} degrees`).toBeLessThan(1e-6);
        return { degrees, volume: withCap.volume(), front: withCap.isEmpty() ? null : withCap.boundingBox().min[2] };
      });
      // At the start the catch at the front clicks past the plate's edge above it, and only there.
      const clicks = overlaps.filter(({ volume }) => volume > 1e-6);
      expect(clicks.length).toBeGreaterThan(0);
      for (const click of clicks) {
        expect(click.degrees).toBeLessThan(20);
        expect(click.front!).toBeGreaterThan(1);
      }
      // From 20 degrees on it swings free; laid right back it lies on the plate behind the hinge.
      for (const { degrees, volume } of overlaps.filter(({ degrees }) => degrees >= 20)) expect(volume, `${degrees} degrees`).toBeLessThan(1e-6);
      const open = turn(flap, 180).boundingBox();
      expect(open.min[1]).toBeCloseTo(high, 3);
      expect(open.max[2]).toBeLessThan(-3);
      // Upright, it stands over the hinge, above the plate.
      expect(turn(flap, 90).boundingBox().min[1]).toBeGreaterThan(high - 1e-3);
    } finally {
      dispose(created);
    }
  });

  it("prints in one go on its plate without support: flap and strip lie on the bed, and no face looks down more steeply than 45 degrees", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const { result } = flipTopOnPot(kernel, created);
      const lid = result.lid;
      // Faces that look down more steeply than 45 degrees, other than those lying on the bed (the lowest height).
      const mesh = lid.getMesh();
      const point = (index: number) => [0, 1, 2].map((axis) => mesh.vertProperties[mesh.triVerts[index] * mesh.numProp + axis]);
      const lowest = lid.boundingBox().min[1];
      let overhangs = 0;
      for (let triangle = 0; triangle < mesh.triVerts.length / 3; triangle += 1) {
        const [a, b, c] = [0, 1, 2].map((corner) => point(3 * triangle + corner));
        const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
        const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
        const normal = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
        const length = Math.hypot(...normal);
        if (length < 1e-12 || normal[1] / length > -Math.SQRT1_2 - 1e-3) continue;
        if ([a, b, c].every((corner) => Math.abs(corner[1] - lowest) < 1e-4)) continue;
        overhangs += 1;
      }
      expect(overhangs).toBe(0);
      // On the bed, at the cap's middle: the plate round the flap, the flap and, behind it, the strip, all one layer.
      const box = lid.boundingBox();
      const middle: [number, number] = [(box.min[0] + box.max[0]) / 2, (box.min[2] + box.max[2]) / 2];
      // Turned so the scene's up is the kernel's z, which it slices along: the frame's +y, where the hinge is, is the
      // printed cap's +z, and this slice's -y.
      const upright = lid.translate([-middle[0], 0, -middle[1]]).rotate([90, 0, 0]);
      created.push(upright);
      const bed = upright.slice(0.1);
      const aboveStrip = upright.slice(0.5);
      created.push(bed, aboveStrip);
      const plan = flipTopPlan(normalizeLidOptions(FLIP), [0, 0], [circle(28).reverse()]);
      if ("error" in plan) throw new Error(plan.error.code);
      // The strip's middle is solid on the bed and open just above it; the flap's middle is solid at both.
      const at = (section: typeof bed, x: number, y: number) => {
        const dot = kernel.CrossSection.square([0.05, 0.05], true).translate([x, y]);
        const hit = section.intersect(dot);
        created.push(dot, hit);
        return hit.area() > 1e-4;
      };
      const strip = -(plan.back + FLIP_HINGE_LENGTH / 2);
      expect(at(bed, 0, strip)).toBe(true);
      expect(at(aboveStrip, 0, strip)).toBe(false);
      expect(at(bed, 0, 0)).toBe(true);
      expect(at(aboveStrip, 0, 0)).toBe(true);
      // Beside the strip, the gap down to the bed.
      expect(at(bed, plan.hingeWidth / 2 + 0.1, strip)).toBe(false);
    } finally {
      dispose(created);
    }
  });

  it("goes on a bayonet cap too, the same flap in the same plate", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const { result, pieces, high, turn } = flipTopOnPot(kernel, created, { type: "bayonet" });
      expect(result.bayonet).toBeDefined();
      expect(result.lid.decompose().length).toBe(1);
      expect(result.flipTop?.opening).toBe(8);
      expect(pieces.length).toBe(2);
      const [cap, flap] = pieces;
      const rod = kernel.Manifold.cylinder(10, 3.95, 3.95, 96).rotate([-90, 0, 0]).translate([0, high - 6, 0]);
      const throughCap = cap.intersect(rod);
      const swung = turn(flap, 90).intersect(cap);
      created.push(rod, throughCap, swung);
      expect(throughCap.volume()).toBeLessThan(1e-6);
      expect(swung.volume()).toBeLessThan(1e-6);
      expect(flap.minGap(cap, 1)).toBeGreaterThan(0.2 * Math.cos(Math.PI / 96) - 1e-4);
    } finally {
      dispose(created);
    }
  });

  it("refuses an opening too large for the body, a plate too thin, and a lid that is lifted off", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const refusal = (body: Body, given: Record<string, unknown> = {}) => {
        const result = lidForSolid(kernel, body, normalizeLidOptions({ ...FLIP, ...given }));
        if (!("error" in result)) created.push(result.lid, ...(result.screw ? [result.screw.thread] : []));
        return "error" in result ? result.error : null;
      };
      // A tube 30 across with a 1.2 mm wall: 20 mm fits inside its opening with the hinge, 21 does not.
      const tube = openPot(kernel, created, 30, 40, 1.2);
      expect(refusal(tube, { flipTopOpening: 20 })).toBeNull();
      expect(refusal(tube, { flipTopOpening: 21 })).toEqual({ code: "flipTopTooLarge", opening: 20 });
      // Not even the smallest in a tube 12 across.
      expect(refusal(openPot(kernel, created, 12, 30, 1.2), { flipTopOpening: 4 })).toEqual({ code: "flipTopNoRoom" });
      expect(refusal(openPot(kernel, created), { thickness: 1.6 })).toEqual({ code: "flipTopThin", thickness: 1.8 });
      for (const type of ["plug", "cap", "both", "flat"]) expect(refusal(openPot(kernel, created), { type }), type).toEqual({ code: "flipTopType" });
    } finally {
      dispose(created);
    }
  });
});
