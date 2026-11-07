import { describe, expect, it } from "vitest";
import Module from "manifold-3d";
import { bayonetTurn, lidForSolid, normalizeLidOptions } from "@/lib/lidTool";

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
 * The cap turned back over and set on the body as it closes it, locked: its plate on the rim (y = top), on the body's
 * axis. The cap is round, so its box is centred on its axis.
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

/** The cap turned about the pot's axis by `degrees`, anticlockwise seen from above, and lifted by `lift`. */
function moved(cap: Body, degrees: number, lift: number, created: Solid[]) {
  const turned = cap.rotate([0, degrees, 0]).translate([0, lift, 0]);
  created.push(turned);
  return turned;
}

const BAYONET = { type: "bayonet", thickness: 2, gap: 0.2, wall: 1.6, bayonetLugs: 3, bayonetDepth: 8, bayonetAxialGap: 0.3, bayonetDetent: 0.3 };

describe("a bayonet lid for a round body (real Manifold kernel, Discussion #1424)", () => {
  it("puts three lugs on the outside of the pot's top and makes a cap with an L-shaped slot for each, which locks without touching them", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const body = openPot(kernel, created);
      const result = lidForSolid(kernel, body, normalizeLidOptions(BAYONET));
      if ("error" in result) throw new Error(JSON.stringify(result.error));
      const { lid, bayonet } = result;
      created.push(lid);
      expect(bayonet).toBeDefined();
      created.push(bayonet!.lugs);
      expect(lid.status()).toBe("NoError");
      expect(bayonet!.lugs.status()).toBe("NoError");
      expect(lid.decompose().length).toBe(1);
      expect(bayonet!.lugs.decompose().length).toBe(3);
      // 60 mm across: lugs 1.5 mm out of the wall and 9 mm wide; three of them, a turn of 40 degrees.
      expect(bayonet!.count).toBe(3);
      expect(bayonet!.turn).toBe(40);
      expect(bayonet!.height).toBe(1.5);
      expect(bayonet!.width).toBeCloseTo(9, 6);
      expect(bayonet!.diameter).toBeCloseTo(60 + 2 * (1.5 + 0.2 + 1.6), 2);
      const withLugs = body.add(bayonet!.lugs);
      created.push(withLugs);
      expect(withLugs.decompose().length).toBe(1);
      expect(withLugs.genus()).toBe(body.genus());
      const lugBox = bayonet!.lugs.boundingBox();
      expect(lugBox.max[1]).toBeCloseTo(50 - 0.2, 3);
      // Locked: the plate on the rim, the cap round the lugs, nothing of it in the pot or its lugs.
      const closed = closing(body, lid, 2, created);
      expect(shared(closed, withLugs, created)).toBeLessThan(1e-6);
      const capBox = closed.boundingBox();
      expect(capBox.min[1]).toBeCloseTo(50 - 8, 3);
      expect(capBox.max[1]).toBeCloseTo(52, 3);
      // The first lug at the front (+z), the others a third of the way round.
      const lugs = bayonet!.lugs.decompose();
      created.push(...lugs);
      const middles = lugs.map((lug) => {
        const box = lug.boundingBox();
        return Math.round((Math.atan2(-(box.min[2] + box.max[2]) / 2, (box.min[0] + box.max[0]) / 2) * 180) / Math.PI);
      }).sort((a, b) => a - b);
      expect(middles).toEqual([-90, 30, 150]);
    } finally {
      dispose(created);
    }
  });

  it("goes down over the lugs with its slots above them, turns clockwise to lock past the rib, then stops and holds", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const body = openPot(kernel, created);
      const result = lidForSolid(kernel, body, normalizeLidOptions(BAYONET));
      if ("error" in result) throw new Error(JSON.stringify(result.error));
      created.push(result.lid, result.bayonet!.lugs);
      const withLugs = body.add(result.bayonet!.lugs);
      created.push(withLugs);
      const closed = closing(body, result.lid, 2, created);
      const turn = result.bayonet!.turn;
      expect(turn).toBe(bayonetTurn(3));
      const at = (degrees: number, lift: number) => shared(moved(closed, degrees, lift, created), withLugs, created);
      // Open, turned back by the turn: the slots stand over the lugs, so it goes all the way down onto the rim, and off.
      for (const lift of [10, 8, 6, 4, 3, 2, 1, 0.5, 0.2, 0]) expect(at(turn, lift), `open, ${lift} mm up`).toBeLessThan(1e-6);
      // Set on a little off the slots, the ledge comes down on the lugs.
      expect(at(turn - 10, 3)).toBeGreaterThan(0.1);
      expect(at(turn + 10, 3)).toBeGreaterThan(0.1);
      // Down on the rim, turned clockwise from the slots to the lock: the lugs pass only the ribs, which stand just behind
      // the locked lugs - a lug 9 mm wide (16 degrees at its outer face) and a rib 2.6 mm (5 degrees) meet over the last
      // 22 degrees of the turn, the gap before the lock.
      const sweep = Array.from({ length: 41 }, (_, step) => ({ degrees: turn * (1 - step / 40), volume: at(turn * (1 - step / 40), 0) }));
      const touched = sweep.filter(({ volume }) => volume > 1e-6);
      expect(touched.length).toBeGreaterThan(0);
      expect(Math.min(...touched.map(({ degrees }) => degrees))).toBeGreaterThan(0);
      expect(Math.max(...touched.map(({ degrees }) => degrees))).toBeLessThan(23);
      expect(Math.max(...touched.map(({ degrees }) => degrees))).toBeGreaterThan(20);
      // The rib reaches 0.3 mm past the gap into the lugs' way: a sliver of each lug, a few tenths of a cubic millimetre.
      expect(Math.max(...sweep.map(({ volume }) => volume))).toBeLessThan(3);
      expect(sweep[sweep.length - 1].volume).toBeLessThan(1e-6);
      // A step past the lock the stops are there.
      expect(at(-2, 0)).toBeGreaterThan(0.1);
      // Locked, the ledges hold it down: it lifts by the axial gap and no further; open, it lifts off.
      expect(at(0, 0.25)).toBeLessThan(1e-6);
      expect(at(0, 0.6)).toBeGreaterThan(0.1);
      // Closed, nothing of the cap comes nearer the lugs than the gap: round them, under them (the axial gap on the
      // 45 degree slopes, 0.7 of 0.3), from the ribs and stops along the wall, and the plate 0.2 above their tops.
      const outside = result.bayonet!.lugs.subtract(body);
      created.push(outside);
      expect(closed.minGap(outside, 2)).toBeGreaterThan(0.199);
      expect(closed.minGap(outside, 2)).toBeLessThan(0.2 + 1e-3);
    } finally {
      dispose(created);
    }
  });

  it("turns without touching anything when the detent is off, and its lugs follow a larger pot and the count", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      for (const [diameter, lugs, detent, height, width] of [[60, 3, 0, 1.5, 9], [100, 4, 0.3, 2.5, 15], [100, 2, 0.5, 2.5, 15]] as const) {
        const body = openPot(kernel, created, diameter, 40, 2.4);
        const given = { ...BAYONET, bayonetLugs: lugs, bayonetDetent: detent, gap: 0.3, bayonetAxialGap: 0.4 };
        const result = lidForSolid(kernel, body, normalizeLidOptions(given));
        if ("error" in result) throw new Error(JSON.stringify(result.error));
        created.push(result.lid, result.bayonet!.lugs);
        const { bayonet } = result;
        expect(bayonet!.count).toBe(lugs);
        expect(bayonet!.lugs.decompose().length).toBe(lugs);
        expect(bayonet!.turn).toBe(bayonetTurn(lugs));
        expect(bayonet!.height).toBe(height);
        expect(bayonet!.width).toBeCloseTo(width, 6);
        expect(bayonet!.diameter).toBeCloseTo(diameter + 2 * (height + 0.3 + 1.6), 2);
        const withLugs = body.add(bayonet!.lugs);
        const closed = closing(body, result.lid, 2, created);
        created.push(withLugs);
        const at = (degrees: number, lift: number) => shared(moved(closed, degrees, lift, created), withLugs, created);
        for (const lift of [6, 3, 1, 0]) expect(at(bayonet!.turn, lift), `${diameter} mm, ${lugs} lugs, open, ${lift} mm up`).toBeLessThan(1e-6);
        const sweep = Array.from({ length: 21 }, (_, step) => at(bayonet!.turn * (1 - step / 20), 0));
        if (detent === 0) expect(Math.max(...sweep), `${diameter} mm, ${lugs} lugs`).toBeLessThan(1e-6);
        else expect(Math.max(...sweep), `${diameter} mm, ${lugs} lugs`).toBeGreaterThan(1e-3);
        expect(sweep[sweep.length - 1]).toBeLessThan(1e-6);
        expect(at(0, 0.35)).toBeLessThan(1e-6);
        expect(at(0, 0.8)).toBeGreaterThan(0.1);
        const outside = bayonet!.lugs.subtract(body);
        created.push(outside);
        // The plate 0.2 above the lugs' tops comes nearest: the gap round them is 0.3, the axial 0.4 on the slopes 0.28.
        expect(closed.minGap(outside, 2)).toBeCloseTo(0.2, 2);
        const under = closed.translate([0, 0.1, 0]);
        created.push(under);
        expect(under.minGap(outside, 2)).toBeCloseTo((0.4 - 0.1) * Math.SQRT1_2, 2);
      }
    } finally {
      dispose(created);
    }
  });

  it("prints without support: the body upright with its lugs, the cap turned over on its plate, no face steeper than 45 degrees overhead", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const body = openPot(kernel, created);
      const result = lidForSolid(kernel, body, normalizeLidOptions(BAYONET));
      if ("error" in result) throw new Error(JSON.stringify(result.error));
      created.push(result.lid, result.bayonet!.lugs);
      // Faces that look down more steeply than 45 degrees, other than those lying on the printer's plate (at `plate`, the
      // pot's bottom for its lugs) and, for the lugs, those inside the pot's wall (nearer the axis than its outer face).
      const overhangs = (solid: Body, inside: number, centre: readonly [number, number], plate: number) => {
        const mesh = solid.getMesh();
        const point = (index: number) => [0, 1, 2].map((axis) => mesh.vertProperties[mesh.triVerts[index] * mesh.numProp + axis]);
        const lowest = plate;
        let count = 0;
        for (let triangle = 0; triangle < mesh.triVerts.length / 3; triangle += 1) {
          const [a, b, c] = [0, 1, 2].map((corner) => point(3 * triangle + corner));
          const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
          const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
          const normal = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
          const length = Math.hypot(...normal);
          if (length < 1e-12 || normal[1] / length > -Math.SQRT1_2 - 1e-3) continue;
          if ([a, b, c].every((corner) => Math.abs(corner[1] - lowest) < 1e-4)) continue;
          if ([a, b, c].every((corner) => Math.hypot(corner[0] - centre[0], corner[2] - centre[1]) < inside)) continue;
          count += 1;
        }
        return count;
      };
      expect(overhangs(result.bayonet!.lugs, 29.99, [0, 0], 0)).toBe(0);
      const lidBox = result.lid.boundingBox();
      const lidCentre = [(lidBox.min[0] + lidBox.max[0]) / 2, (lidBox.min[2] + lidBox.max[2]) / 2] as const;
      expect(overhangs(result.lid, 0, lidCentre, lidBox.min[1])).toBe(0);
      expect(lidBox.max[0] - lidBox.min[0]).toBeCloseTo(66.6, 2);
      // The cap lies on its plate: its lowest face is a whole disc as wide as the cap.
      const upright = result.lid.rotate([90, 0, 0]);
      const slab = upright.slice(lidBox.min[1] + 0.01);
      created.push(upright, slab);
      expect(slab.area()).toBeCloseTo(Math.PI * 33.3 ** 2, -1);
    } finally {
      dispose(created);
    }
  });

  it("refuses a box, a wall too thin, a body too low, a gap too large for the lugs, a rim too short, too many lugs, a closed top and the extras", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const refusal = (body: Body, given: Record<string, unknown> = {}) => {
        const result = lidForSolid(kernel, body, normalizeLidOptions({ ...BAYONET, ...given }));
        if (!("error" in result)) created.push(result.lid, ...(result.bayonet ? [result.bayonet.lugs] : []));
        return "error" in result ? result.error : null;
      };
      const outer = kernel.Manifold.cube([60, 30, 40], true).translate([0, 15, 0]);
      const inner = kernel.Manifold.cube([56, 30, 36], true).translate([0, 17, 0]);
      const box = outer.subtract(inner);
      created.push(outer, inner, box);
      expect(refusal(box)).toEqual({ code: "bayonetNotRound" });
      expect(refusal(openPot(kernel, created, 60, 50, 0.6))).toEqual({ code: "bayonetThinWall" });
      expect(refusal(openPot(kernel, created, 60, 8, 2))).toEqual({ code: "bayonetTooLow", height: 8 });
      // 1.5 mm lugs take a gap of 0.75 at most.
      expect(refusal(openPot(kernel, created), { gap: 0.8 })).toEqual({ code: "bayonetGapDeep", gap: 0.75 });
      // The lug's top 0.2 under the rim, 1.5 of face, the axial 0.3, the ledge's slope 1.5 less the gap of 0.2, 1 below.
      expect(refusal(openPot(kernel, created), { bayonetDepth: 4 })).toEqual({ code: "bayonetShallow", depth: 4.3 });
      expect(refusal(openPot(kernel, created), { bayonetDepth: 4.3 })).toBeNull();
      // A tube 20 mm across has room for two lugs and a turn of 45 degrees, not for three.
      expect(refusal(openPot(kernel, created, 20, 30, 1.6), { bayonetLugs: 3 })).toEqual({ code: "bayonetNoRoom" });
      expect(refusal(openPot(kernel, created, 20, 30, 1.6), { bayonetLugs: 2 })).toBeNull();
      const solid = kernel.Manifold.cylinder(50, 30, 30, 192).rotate([-90, 0, 0]);
      created.push(solid);
      expect(refusal(solid)).toEqual({ code: "notOpen" });
      for (const extra of [{ magnets: true }, { hinge: true }, { clickBumps: true }, { handle: "tab" }, { handle: "notch" }]) {
        expect(refusal(openPot(kernel, created), extra), JSON.stringify(extra)).toEqual({ code: "bayonetExtras" });
      }
      // A depth that would be too deep for a rim does not count: the bayonet's own depth decides how far the cap reaches.
      expect(refusal(openPot(kernel, created, 60, 20, 2), { depth: 50 })).toBeNull();
    } finally {
      dispose(created);
    }
  });
});
