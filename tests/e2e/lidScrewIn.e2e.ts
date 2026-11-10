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
 * top, standing on y = 0 round the y axis: 60 across, 50 high, 2 mm wall, as the editor's hollowed cylinder, a pen
 * holder. `floor` makes the floor thicker than the wall.
 */
function openPot(kernel: Kernel, created: Solid[], diameter = 60, height = 50, wall = 2, floor = wall, sides = 192) {
  const outer = kernel.Manifold.cylinder(height, diameter / 2, diameter / 2, sides).rotate([-90, 0, 0]);
  const cavity = kernel.Manifold.cylinder(height, diameter / 2 - wall, diameter / 2 - wall, sides).rotate([-90, 0, 0]).translate([0, floor, 0]);
  const pot = outer.subtract(cavity);
  created.push(outer, cavity, pot);
  return pot;
}

/**
 * The lid turned back over and set on the body as it closes it: its plate on the rim (y = top), on the body's axis. The
 * lid is round, its plate the widest of it, so its box is centred on its axis.
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

/** What of the closed lid lies below the rim at `top`: its plug. */
function plugOf(kernel: Kernel, closed: Body, top: number, created: Solid[]) {
  const box = closed.boundingBox();
  const below = kernel.Manifold.cube([box.max[0] - box.min[0] + 2, top - box.min[1] + 1, box.max[2] - box.min[2] + 2]).translate([box.min[0] - 1, box.min[1] - 1, box.min[2] - 1]);
  const plug = closed.intersect(below);
  created.push(below, plug);
  return plug;
}

const SCREW_IN = { type: "screwIn", thickness: 2, gap: 0.2, wall: 1.6, threadPitch: 3, threadTurns: 2 };

describe("a screw-in lid for a round body (real Manifold kernel, Discussion #1432)", () => {
  it("puts a thread inside the pot's opening and makes a plate with a threaded plug that closes without touching it", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const body = openPot(kernel, created);
      const result = lidForSolid(kernel, body, normalizeLidOptions(SCREW_IN));
      if ("error" in result) throw new Error(JSON.stringify(result.error));
      const { lid, screw } = result;
      created.push(lid);
      expect(screw).toBeDefined();
      created.push(screw!.thread);
      expect(lid.status()).toBe("NoError");
      expect(screw!.thread.status()).toBe("NoError");
      expect(lid.decompose().length).toBe(1);
      expect(screw!.thread.decompose().length).toBe(1);
      // 3 mm pitch: 0.9 mm deep, two turns, 6 mm of plug; the plug the opening less the gap across, and hollow.
      expect(screw!.inside).toBe(true);
      expect(screw!.hollow).toBe(true);
      expect(screw!.pitch).toBe(3);
      expect(screw!.turns).toBe(2);
      expect(screw!.depth).toBeCloseTo(0.9, 9);
      expect(screw!.diameter).toBeCloseTo(2 * (28 * Math.cos(Math.PI / 192) - 0.2), 6);
      const threadBox = screw!.thread.boundingBox();
      expect(threadBox.max[1]).toBeCloseTo(50 - 0.2, 3);
      expect(threadBox.min[1]).toBeCloseTo(50 - 6, 3);
      // In the wall: 0.8 mm beyond the opening's face at most, never outside the pot.
      expect(threadBox.max[0]).toBeCloseTo(28.8, 2);
      // The thread stands the depth in from the opening's face: a crest 27.1 mm from the axis, nothing nearer.
      const inner = kernel.Manifold.cylinder(60, 27.05, 27.05, 192).rotate([-90, 0, 0]);
      const crest = kernel.Manifold.cylinder(60, 27.2, 27.2, 192).rotate([-90, 0, 0]);
      const nearer = screw!.thread.intersect(inner);
      const atCrest = screw!.thread.intersect(crest);
      created.push(inner, crest, nearer, atCrest);
      expect(nearer.volume()).toBeLessThan(1e-6);
      expect(atCrest.volume()).toBeGreaterThan(1);
      // Added inside, not cut in: the pot keeps every bit of its wall, the thread joins it as one piece.
      const withThread = body.add(screw!.thread);
      created.push(withThread);
      expect(withThread.decompose().length).toBe(1);
      expect(withThread.genus()).toBe(body.genus());
      expect(withThread.volume()).toBeGreaterThan(body.volume() + 10);
      const outside = withThread.boundingBox();
      expect(outside.max[0]).toBeCloseTo(30, 3);
      // Closed: the plate on the rim, as wide as the pot, the plug in the opening, nothing of it in the pot or its thread.
      const closed = closing(body, lid, 2, created);
      const overlap = closed.intersect(withThread);
      created.push(overlap);
      expect(overlap.volume()).toBeLessThan(1e-6);
      const lidBox = closed.boundingBox();
      expect(lidBox.min[1]).toBeCloseTo(50 - 6, 3);
      expect(lidBox.max[1]).toBeCloseTo(52, 3);
      expect(lidBox.max[0]).toBeCloseTo(30, 2);
      // The plug is a ring: hollow on the axis, solid 1 mm inside its thread's root (the opening, the gap and the depth).
      expect(solidAt(kernel, closed, [0, 47, 0], created)).toBe(false);
      expect(solidAt(kernel, closed, [0, 51, 0], created)).toBe(true);
      expect(solidAt(kernel, closed, [27.99 - 0.2 - 0.9 - 1, 47, 0], created)).toBe(true);
      // Its end narrows at 45 degrees to clear the thread's crest: just above it, nothing of the plug comes farther from
      // the axis than the crest's 27.1 mm less the gap, all the way round; a millimetre up its thread is there.
      for (let step = 0; step < 16; step += 1) {
        const angle = (2 * Math.PI * step) / 16;
        expect(solidAt(kernel, closed, [27 * Math.cos(angle), 44.05, 27 * Math.sin(angle)], created), `end at ${step}`).toBe(false);
      }
      expect([...Array(16).keys()].some((step) => solidAt(kernel, closed, [27.5 * Math.cos((2 * Math.PI * step) / 16), 45.2, 27.5 * Math.sin((2 * Math.PI * step) / 16)], created))).toBe(true);
      // The narrowest room is on the flanks, at 45 degrees: the gap in the radius times the sine of 45 degrees.
      const plug = plugOf(kernel, closed, 50, created);
      const standing = screw!.thread.subtract(body);
      created.push(standing);
      expect(plug.minGap(standing, 2)).toBeCloseTo(0.2 * Math.SQRT1_2, 3);
      // Turned 90 degrees in the opening, the threads are a quarter of a pitch apart in height: then they do meet.
      const turned = closed.rotate([0, 90, 0]);
      const clash = turned.intersect(withThread);
      created.push(turned, clash);
      expect(clash.volume()).toBeGreaterThan(1);
    } finally {
      dispose(created);
    }
  });

  it("screws in: turned back along the thread step by step it never meets the pot, and keeps the gap until it is out", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const body = openPot(kernel, created);
      const result = lidForSolid(kernel, body, normalizeLidOptions(SCREW_IN));
      if ("error" in result) throw new Error(JSON.stringify(result.error));
      created.push(result.lid, result.screw!.thread);
      const withThread = body.add(result.screw!.thread);
      const standing = result.screw!.thread.subtract(body);
      created.push(withThread, standing);
      const closed = closing(body, result.lid, 2, created);
      // A right-hand thread: turned anticlockwise seen from above (a positive turn about y), it climbs a pitch a turn.
      // Two turns bring the plug's end up to the rim: out.
      for (let degrees = 0; degrees <= 720; degrees += 24) {
        const lifted = closed.rotate([0, degrees, 0]).translate([0, (3 * degrees) / 360, 0]);
        const overlap = lifted.intersect(withThread);
        created.push(lifted, overlap);
        expect(overlap.volume(), `${degrees} degrees`).toBeLessThan(1e-6);
        if (degrees < 660) {
          const plug = plugOf(kernel, lifted, 50, created);
          expect(plug.minGap(standing, 2), `${degrees} degrees`).toBeGreaterThan(0.2 * Math.SQRT1_2 - 0.01);
        }
      }
      // The other way round, it meets the thread at once: it is the thread that holds it.
      const wrong = closed.rotate([0, -60, 0]).translate([0, 0.5, 0]);
      const clash = wrong.intersect(withThread);
      created.push(wrong, clash);
      expect(clash.volume()).toBeGreaterThan(1);
      // Lifted straight up by half a pitch without turning, too.
      const pulled = closed.translate([0, 1.5, 0]);
      const caught = pulled.intersect(withThread);
      created.push(pulled, caught);
      expect(caught.volume()).toBeGreaterThan(1);
    } finally {
      dispose(created);
    }
  });

  it("keeps the gap on a wide flat pot with a coarser thread, and on a small tube whose plug stays solid", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      for (const [body, given, top, hollow, digits] of [
        [openPot(kernel, created, 100, 30, 2.4), { ...SCREW_IN, threadPitch: 4, threadTurns: 1.5, gap: 0.3 }, 30, true, 3],
        // A tube open at both ends, 10 across with a 1.2 mm wall: a plug 6 mm across at its thread's root has no room for
        // a 4 mm hole with 1.6 mm of wall round it. Its 96 points round lie farther apart for its size: the gap between
        // them is a few thousandths less.
        [openPot(kernel, created, 10, 30, 1.2).subtract(kernel.Manifold.cylinder(4, 3.8, 3.8, 192).rotate([-90, 0, 0]).translate([0, -1, 0])), { ...SCREW_IN, threadPitch: 2 }, 30, false, 2],
      ] as const) {
        created.push(body);
        const result = lidForSolid(kernel, body, normalizeLidOptions(given));
        if ("error" in result) throw new Error(JSON.stringify(result.error));
        created.push(result.lid, result.screw!.thread);
        expect(result.screw!.hollow).toBe(hollow);
        const closed = closing(body, result.lid, 2, created);
        const withThread = body.add(result.screw!.thread);
        const overlap = closed.intersect(withThread);
        created.push(withThread, overlap);
        expect(overlap.volume()).toBeLessThan(1e-6);
        const standing = result.screw!.thread.subtract(body);
        created.push(standing);
        expect(plugOf(kernel, closed, top, created).minGap(standing, 2)).toBeCloseTo(given.gap * Math.SQRT1_2, digits);
        expect(result.screw!.thread.boundingBox().max[1]).toBeCloseTo(top - 0.2, 3);
        expect(solidAt(kernel, closed, [0, top - 1, 0], created)).toBe(!hollow);
      }
    } finally {
      dispose(created);
    }
  });

  it("prints without support: the body upright with its thread, the lid on its plate with the plug up, no face steeper than 45 degrees overhead", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const body = openPot(kernel, created);
      const result = lidForSolid(kernel, body, normalizeLidOptions(SCREW_IN));
      if ("error" in result) throw new Error(JSON.stringify(result.error));
      created.push(result.lid, result.screw!.thread);
      // Faces that look down more steeply than 45 degrees, other than those of the lid lying on the plate (its lowest
      // height) and those of the thread in the pot's wall (farther from the axis than the opening's face). The thread does
      // not stand on the plate: its own lowest end counts.
      const overhangs = (solid: Body, wall: number, onPlate: boolean) => {
        const mesh = solid.getMesh();
        const point = (index: number) => [0, 1, 2].map((axis) => mesh.vertProperties[mesh.triVerts[index] * mesh.numProp + axis]);
        const lowest = onPlate ? solid.boundingBox().min[1] : -Infinity;
        let count = 0;
        for (let triangle = 0; triangle < mesh.triVerts.length / 3; triangle += 1) {
          const [a, b, c] = [0, 1, 2].map((corner) => point(3 * triangle + corner));
          const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
          const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
          const normal = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
          const length = Math.hypot(...normal);
          if (length < 1e-12 || normal[1] / length > -Math.SQRT1_2 - 1e-3) continue;
          if ([a, b, c].every((corner) => Math.abs(corner[1] - lowest) < 1e-4)) continue;
          if ([a, b, c].every((corner) => Math.hypot(corner[0], corner[2]) > wall)) continue;
          count += 1;
        }
        return count;
      };
      expect(overhangs(result.screw!.thread, 28.01, false)).toBe(0);
      // The lid lies beside the pot, so no face of it counts as in the wall.
      expect(overhangs(result.lid, Infinity, true)).toBe(0);
      // The lid lies on its plate, as wide as the pot, the plug standing up from it 6 mm.
      const lidBox = result.lid.boundingBox();
      expect(lidBox.max[0] - lidBox.min[0]).toBeCloseTo(60, 2);
      expect(lidBox.max[1] - lidBox.min[1]).toBeCloseTo(8, 3);
      // Turned so the scene's up is the kernel's z, which it slices along.
      const upright = result.lid.rotate([90, 0, 0]);
      const slab = upright.slice(lidBox.min[1] + 0.01);
      created.push(upright, slab);
      expect(slab.area()).toBeCloseTo(Math.PI * 30 ** 2, -1);
    } finally {
      dispose(created);
    }
  });

  it("refuses a box, a square opening, a wall too thin, a body too low, an opening too shallow or too small, a gap too large, a closed top and the extras", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const refusal = (body: Body, given: Record<string, unknown> = {}) => {
        const result = lidForSolid(kernel, body, normalizeLidOptions({ ...SCREW_IN, ...given }));
        if (!("error" in result)) created.push(result.lid, ...(result.screw ? [result.screw.thread] : []));
        return "error" in result ? result.error : null;
      };
      const outer = kernel.Manifold.cube([60, 30, 40], true).translate([0, 15, 0]);
      const inner = kernel.Manifold.cube([56, 30, 36], true).translate([0, 17, 0]);
      const box = outer.subtract(inner);
      created.push(outer, inner, box);
      expect(refusal(box)).toEqual({ code: "screwInNotRound" });
      // A round pot with a square pocket.
      const cylinder = kernel.Manifold.cylinder(50, 30, 30, 192).rotate([-90, 0, 0]);
      const pocket = kernel.Manifold.cube([36, 50, 36], true).translate([0, 27, 0]);
      const squarePocket = cylinder.subtract(pocket);
      created.push(cylinder, pocket, squarePocket);
      expect(refusal(squarePocket)).toEqual({ code: "screwInNotRound" });
      expect(refusal(openPot(kernel, created, 60, 50, 0.6))).toEqual({ code: "screwThinWall" });
      expect(refusal(openPot(kernel, created, 60, 6, 2))).toEqual({ code: "screwTooLow", height: 6 });
      // 12 mm high with a 6 mm floor: the plug would stand on the floor.
      expect(refusal(openPot(kernel, created, 60, 12, 2, 6))).toEqual({ code: "screwInShallow", height: 6 });
      expect(refusal(openPot(kernel, created, 60, 12, 2, 5.5))).toBeNull();
      // 8 mm across with a 1.2 mm wall: a 5.6 mm opening. A plug 4 mm across at its thread's root needs 6.2 round it with
      // a 3 mm pitch (0.9 mm deep) and the gap, 6.4 with a 0.3 mm gap; a 2 mm pitch (0.6 mm deep) goes into 5.8.
      expect(refusal(openPot(kernel, created, 8, 30, 1.2))).toEqual({ code: "screwInSmallOpening", diameter: 6.2 });
      expect(refusal(openPot(kernel, created, 8, 30, 1.2), { gap: 0.3 })).toEqual({ code: "screwInSmallOpening", diameter: 6.4 });
      expect(refusal(openPot(kernel, created, 8, 30, 1.1), { threadPitch: 2 })).toBeNull();
      expect(refusal(openPot(kernel, created), { gap: 0.6 })).toEqual({ code: "screwGapDeep", gap: 0.45 });
      created.push(cylinder);
      expect(refusal(cylinder)).toEqual({ code: "notOpen" });
      for (const extra of [{ magnets: true }, { hinge: true }, { clickBumps: true }, { handle: "tab" }, { handle: "notch" }]) {
        expect(refusal(openPot(kernel, created), extra), JSON.stringify(extra)).toEqual({ code: "screwExtras" });
      }
      // A depth that would be too deep for a lip does not count: the thread decides how far the plug reaches.
      expect(refusal(openPot(kernel, created, 60, 20, 2), { depth: 50 })).toBeNull();
    } finally {
      dispose(created);
    }
  });

  it("takes the screw lid's thread: the same pitch, depth and length", () => {
    expect(lidThread(normalizeLidOptions(SCREW_IN))).toEqual(lidThread(normalizeLidOptions({ ...SCREW_IN, type: "screw" })));
  });
});
