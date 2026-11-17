import { describe, expect, it } from "vitest";
import Module from "manifold-3d";
import { lidForSolid, lidThread, normalizeLidOptions } from "@/lib/lidTool";

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

/** Whether a tiny cube at (x, y, z) lies in the solid. */
function solidAt(kernel: Kernel, solid: Body, [x, y, z]: readonly [number, number, number], created: Solid[]) {
  const probe = kernel.Manifold.cube([0.05, 0.05, 0.05], true).translate([x, y, z]);
  const hit = solid.intersect(probe);
  created.push(probe, hit);
  return hit.volume() > 0.00005;
}

const SCREW = { type: "screw", thickness: 2, gap: 0.2, wall: 1.6, threadPitch: 3, threadTurns: 2 };

describe("a screw lid for a round body (real Manifold kernel, Discussion #1393)", () => {
  it("puts a thread on the outside of the pot's top and makes a cap with the same thread inside, which closes without touching it", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const body = openPot(kernel, created);
      const result = lidForSolid(kernel, body, normalizeLidOptions(SCREW));
      if ("error" in result) throw new Error(JSON.stringify(result.error));
      const { lid, screw } = result;
      created.push(lid);
      expect(screw).toBeDefined();
      created.push(screw!.thread);
      expect(lid.status()).toBe("NoError");
      expect(screw!.thread.status()).toBe("NoError");
      expect(lid.decompose().length).toBe(1);
      expect(screw!.thread.decompose().length).toBe(1);
      // 3 mm pitch: 0.9 mm deep, two turns, 6 mm of rim; the cap is the pot, the gap, the thread and its wall across.
      expect(screw!.pitch).toBe(3);
      expect(screw!.turns).toBe(2);
      expect(screw!.depth).toBeCloseTo(0.9, 9);
      expect(screw!.diameter).toBeCloseTo(60 + 2 * (0.2 + 0.9 + 1.6), 2);
      const threadBox = screw!.thread.boundingBox();
      expect(threadBox.max[1]).toBeCloseTo(50 - 0.2, 3);
      expect(threadBox.min[1]).toBeCloseTo(50 - 6, 3);
      // The thread stands the depth out of the wall and reaches 0.8 mm into it.
      expect(threadBox.max[0]).toBeGreaterThan(30.85);
      expect(threadBox.max[0]).toBeLessThan(30.91);
      const withThread = body.add(screw!.thread);
      created.push(withThread);
      expect(withThread.decompose().length).toBe(1);
      expect(withThread.genus()).toBe(body.genus());
      // Closed: the cap's plate on the rim, its rim round the thread, nothing of it in the pot or its thread.
      const closed = closing(body, lid, 2, created);
      const overlap = closed.intersect(withThread);
      created.push(overlap);
      expect(overlap.volume()).toBeLessThan(1e-6);
      const capBox = closed.boundingBox();
      expect(capBox.min[1]).toBeCloseTo(50 - 6, 3);
      expect(capBox.max[1]).toBeCloseTo(52, 3);
      expect(capBox.max[0]).toBeCloseTo(32.7, 2);
      // The cap's mouth widens at 45 degrees to clear the thread's crest: just above it, nothing of the cap comes nearer
      // the axis than the crest's 30.9 mm plus the gap, all the way round; a millimetre up its thread is there.
      for (let step = 0; step < 16; step += 1) {
        const angle = (2 * Math.PI * step) / 16;
        expect(solidAt(kernel, closed, [31 * Math.cos(angle), 44.05, 31 * Math.sin(angle)], created), `mouth at ${step}`).toBe(false);
      }
      expect([...Array(16).keys()].some((step) => solidAt(kernel, closed, [30.5 * Math.cos((2 * Math.PI * step) / 16), 45.2, 30.5 * Math.sin((2 * Math.PI * step) / 16)], created))).toBe(true);
      // Turned 90 degrees on the pot, the threads are a quarter of a pitch apart in height: then they do meet.
      const turned = closed.rotate([0, 90, 0]);
      const clash = turned.intersect(withThread);
      created.push(turned, clash);
      expect(clash.volume()).toBeGreaterThan(1);
    } finally {
      dispose(created);
    }
  });

  it("is a right-hand thread, its crest a pitch higher each turn anticlockwise seen from above", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const body = openPot(kernel, created);
      const result = lidForSolid(kernel, body, normalizeLidOptions(SCREW));
      if ("error" in result) throw new Error(JSON.stringify(result.error));
      created.push(result.lid, result.screw!.thread);
      const thread = result.screw!.thread;
      // On the right (+x) a crest's middle is at 47 mm (a whole number of pitches below the rim at 50); a quarter turn
      // on anticlockwise seen from above, at the back (-z: the frame's +y is the scene's -z), it is 0.75 mm higher. 0.8 mm
      // out of the wall the crest is 0.8 mm wide: its flat 0.6 mm and a tenth of each flank.
      const crestAt = (x: number, z: number) => {
        const heights: number[] = [];
        for (let y = 45.8; y <= 49.2; y += 0.05) if (solidAt(kernel, thread, [x, y, z], created)) heights.push(y);
        return heights;
      };
      const right = crestAt(30.8, 0);
      expect(right.length).toBeGreaterThan(0);
      expect(Math.min(...right)).toBeCloseTo(46.6, 1);
      expect(Math.max(...right)).toBeCloseTo(47.4, 1);
      const back = crestAt(0, -30.8);
      expect(Math.min(...back)).toBeCloseTo(47.35, 1);
      expect(Math.max(...back)).toBeCloseTo(48.15, 1);
    } finally {
      dispose(created);
    }
  });

  it("keeps the gap between the threads everywhere, the same on a wide flat pot with a coarser thread and on a small tube", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      for (const [body, given, top] of [
        [openPot(kernel, created, 100, 30, 2.4), { ...SCREW, threadPitch: 4, threadTurns: 1.5, gap: 0.3 }, 30],
        // A tube open at both ends, 30 across with a 1.2 mm wall.
        [openPot(kernel, created, 30, 40, 1.2).subtract(kernel.Manifold.cylinder(4, 13.8, 13.8, 192).rotate([-90, 0, 0]).translate([0, -1, 0])), { ...SCREW, threadPitch: 2 }, 40],
      ] as const) {
        created.push(body);
        const result = lidForSolid(kernel, body, normalizeLidOptions(given));
        if ("error" in result) throw new Error(JSON.stringify(result.error));
        created.push(result.lid, result.screw!.thread);
        const closed = closing(body, result.lid, 2, created);
        const withThread = body.add(result.screw!.thread);
        const overlap = closed.intersect(withThread);
        created.push(withThread, overlap);
        expect(overlap.volume()).toBeLessThan(1e-6);
        // The narrowest gap is on the flanks, at 45 degrees: the gap in the radius times the sine of 45 degrees. (The
        // thread's top, inside the wall, lies 0.2 mm under the plate: what counts is what stands out of the wall.)
        const outside = result.screw!.thread.subtract(body);
        created.push(outside);
        const gap = closed.minGap(outside, 2);
        expect(gap).toBeCloseTo(given.gap * Math.SQRT1_2, 3);
        expect(result.screw!.thread.boundingBox().max[1]).toBeCloseTo(top - 0.2, 3);
      }
    } finally {
      dispose(created);
    }
  });

  it("prints without support: the body upright with its thread, the cap turned over on its plate, no face steeper than 45 degrees overhead", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const body = openPot(kernel, created);
      const result = lidForSolid(kernel, body, normalizeLidOptions(SCREW));
      if ("error" in result) throw new Error(JSON.stringify(result.error));
      created.push(result.lid, result.screw!.thread);
      // Faces that look down more steeply than 45 degrees, other than those lying on the plate (the lowest height) and,
      // for the thread, those inside the pot's wall (nearer the axis than its outer face).
      const overhangs = (solid: Body, inside: number) => {
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
          if ([a, b, c].every((corner) => Math.hypot(corner[0], corner[2]) < inside)) continue;
          count += 1;
        }
        return count;
      };
      expect(overhangs(result.screw!.thread, 29.99)).toBe(0);
      expect(overhangs(result.lid, 0)).toBe(0);
      // The cap lies on its plate: its lowest face is a whole disc as wide as the cap.
      const lidBox = result.lid.boundingBox();
      expect(lidBox.max[0] - lidBox.min[0]).toBeCloseTo(65.4, 2);
      // Turned so the scene's up is the kernel's z, which it slices along.
      const upright = result.lid.rotate([90, 0, 0]);
      const slab = upright.slice(lidBox.min[1] + 0.01);
      created.push(upright, slab);
      expect(slab.area()).toBeCloseTo(Math.PI * 32.7 ** 2, -1);
    } finally {
      dispose(created);
    }
  });

  it("refuses a box, a wall too thin, a body too low, a gap too large for the thread, a closed top and the extras", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const refusal = (body: Body, given: Record<string, unknown> = {}) => {
        const result = lidForSolid(kernel, body, normalizeLidOptions({ ...SCREW, ...given }));
        if (!("error" in result)) created.push(result.lid, ...(result.screw ? [result.screw.thread] : []));
        return "error" in result ? result.error : null;
      };
      const outer = kernel.Manifold.cube([60, 30, 40], true).translate([0, 15, 0]);
      const inner = kernel.Manifold.cube([56, 30, 36], true).translate([0, 17, 0]);
      const box = outer.subtract(inner);
      created.push(outer, inner, box);
      expect(refusal(box)).toEqual({ code: "screwNotRound" });
      expect(refusal(openPot(kernel, created, 60, 50, 0.6))).toEqual({ code: "screwThinWall" });
      expect(refusal(openPot(kernel, created, 60, 6, 2))).toEqual({ code: "screwTooLow", height: 6 });
      expect(refusal(openPot(kernel, created), { gap: 0.6 })).toEqual({ code: "screwGapDeep", gap: 0.45 });
      const solid = kernel.Manifold.cylinder(50, 30, 30, 192).rotate([-90, 0, 0]);
      created.push(solid);
      expect(refusal(solid)).toEqual({ code: "notOpen" });
      for (const extra of [{ magnets: true }, { hinge: true }, { clickBumps: true }, { handle: "tab" }, { handle: "notch" }]) {
        expect(refusal(openPot(kernel, created), extra), JSON.stringify(extra)).toEqual({ code: "screwExtras" });
      }
      // A depth that would be too deep for a rim does not count: the thread decides how far the cap reaches.
      expect(refusal(openPot(kernel, created, 60, 20, 2), { depth: 50 })).toBeNull();
    } finally {
      dispose(created);
    }
  });

  it("measures the thread from the pitch: 0.3 of it deep, at most 1.5 mm", () => {
    expect(lidThread({ threadPitch: 3, threadTurns: 2 })).toMatchObject({ pitch: 3, depth: expect.closeTo(0.9, 12), crest: expect.closeTo(0.6, 12), height: 6 });
  });
});
