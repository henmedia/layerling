import { describe, expect, it } from "vitest";
import Module from "manifold-3d";
import { LID_THREAD_STANDARD_SPECS, lidForSolid, lidStandardThread, normalizeLidOptions, type LidThreadStandard } from "@/lib/lidTool";

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
 * top, standing on y = 0 round the y axis, as the editor's hollowed cylinder.
 */
function openPot(kernel: Kernel, created: Solid[], diameter: number, height: number, wall: number, sides = 192) {
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
  const probe = kernel.Manifold.cube([0.02, 0.02, 0.02], true).translate([x, y, z]);
  const hit = solid.intersect(probe);
  created.push(probe, hit);
  return hit.volume() > 0.000004;
}

/** The heights from `low` to `high`, every `step`, at which the solid is there at `radius` from the y axis, `degrees` round. */
function heightsAt(kernel: Kernel, solid: Body, radius: number, degrees: number, low: number, high: number, step: number, created: Solid[]) {
  const angle = (degrees * Math.PI) / 180;
  const heights: number[] = [];
  for (let y = low; y <= high + 1e-9; y += step) if (solidAt(kernel, solid, [radius * Math.cos(angle), y, -radius * Math.sin(angle)], created)) heights.push(y);
  return heights;
}

/** The middles of the runs of heights that lie a step apart: where a groove or a crest is, up the wall. */
function middles(heights: number[], step: number) {
  const runs: number[][] = [];
  for (const height of heights) {
    const last = runs.at(-1);
    if (last && height - last.at(-1)! < step * 1.5) last.push(height);
    else runs.push([height]);
  }
  return runs.map((run) => (run[0] + run.at(-1)!) / 2);
}

const PCO = { type: "screw", threadStandard: "pco1881", thickness: 2, gap: 0.2, wall: 1.6 };

describe("a screw lid with a standard's thread (real Manifold kernel)", () => {
  it("makes a PCO 1881 cap to the standard and gives a body that is the neck the neck's thread; closed, they do not touch", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      // The neck under the thread is 24.94 mm across, its bore 21.74: a 1.6 mm wall.
      const body = openPot(kernel, created, 24.94, 30, 1.6);
      const result = lidForSolid(kernel, body, normalizeLidOptions(PCO));
      if ("error" in result) throw new Error(JSON.stringify(result.error));
      const { lid, screw } = result;
      created.push(lid);
      expect(screw).toBeDefined();
      expect(screw!.thread).not.toBeNull();
      created.push(screw!.thread!);
      expect(screw!.standard).toBe("pco1881");
      expect(screw!.capOnly).toBeNull();
      expect(lid.status()).toBe("NoError");
      expect(screw!.thread!.status()).toBe("NoError");
      expect(lid.decompose().length).toBe(1);
      expect(screw!.thread!.decompose().length).toBe(1);
      // 2.7 mm pitch, 650 degrees of thread, 1.23 deep; the cap 27.4 + 2 x (0.2 + 1.6) across.
      expect(screw!.pitch).toBe(2.7);
      expect(screw!.turns).toBeCloseTo(650 / 360, 9);
      expect(screw!.depth).toBeCloseTo(1.23, 9);
      expect(screw!.diameter).toBeCloseTo(31, 6);
      // The thread on the neck: from 1.7 mm below the rim down 650 degrees and its tooth, 27.4 mm across at its crest.
      const threadBox = screw!.thread!.boundingBox();
      expect(threadBox.max[1]).toBeCloseTo(30 - 1.7, 3);
      expect(threadBox.min[1]).toBeCloseTo(30 - lidStandardThread("pco1881").end, 3);
      expect(threadBox.max[0]).toBeGreaterThan(13.68);
      expect(threadBox.max[0]).toBeLessThanOrEqual(13.7 + 1e-6);
      const withThread = body.add(screw!.thread!);
      created.push(withThread);
      expect(withThread.decompose().length).toBe(1);
      expect(withThread.genus()).toBe(body.genus());
      // Its crest climbs 2.7 mm a turn, a right-hand thread: on the right (+x), 13.6 from the axis, a whole crest's middle
      // is two pitches below the rim; a quarter and a half turn on anticlockwise seen from above (the back, -z, and the
      // left) it is 0.675 and 1.35 mm higher. (Near the thread's ends its crests are cut back.)
      const crestAt = (degrees: number) => {
        const runs = middles(heightsAt(kernel, withThread, 13.6, degrees, 21, 29, 0.02, created), 0.02);
        const widths = runs.map((middle) => heightsAt(kernel, withThread, 13.6, degrees, middle - 0.8, middle + 0.8, 0.02, created).length);
        return runs[widths.indexOf(Math.max(...widths))];
      };
      expect(crestAt(0)).toBeCloseTo(30 - 2 * 2.7, 1);
      expect(crestAt(90) - crestAt(0)).toBeCloseTo(0.675, 1);
      expect(crestAt(180) - crestAt(0)).toBeCloseTo(1.35, 1);
      // 0.1 mm in from the crest the thread is the crest and a little of each flank wide: 1.02 + 2 x 0.1 x tan 15 degrees.
      expect(heightsAt(kernel, withThread, 13.6, 0, crestAt(0) - 0.8, crestAt(0) + 0.8, 0.02, created).length * 0.02).toBeCloseTo(1.02 + 0.2 * Math.tan(Math.PI / 12), 1);
      // Closed: the cap's plate on the rim, its rim round the thread, nothing of it in the neck or its thread.
      const closed = closing(body, lid, 2, created);
      const overlap = closed.intersect(withThread);
      created.push(overlap);
      expect(overlap.volume()).toBeLessThan(1e-6);
      // What stands out of the neck keeps the gap from the cap, square to the steep flanks as well.
      const outside = screw!.thread!.subtract(body);
      created.push(outside);
      const gap = closed.minGap(outside, 2);
      expect(gap).toBeGreaterThan(0.198);
      expect(gap).toBeLessThanOrEqual(0.2 + 1e-6);
      const capBox = closed.boundingBox();
      expect(capBox.min[1]).toBeCloseTo(30 - 10, 3);
      expect(capBox.max[1]).toBeCloseTo(32, 3);
      // The cap's thread inside: its ridges 25.07 + 0.4 mm across (the lip above the thread and the gap) and its grooves
      // 27.4 + 0.4: nothing of it nearer the axis than 12.735 anywhere round, its ridges just outside that; nothing in the
      // grooves short of 13.9, the wall all round past it.
      for (let step = 0; step < 12; step += 1) {
        expect(heightsAt(kernel, closed, 12.72, step * 30, 20.5, 29.8, 0.1, created), `ridges at ${step * 30}°`).toEqual([]);
      }
      expect(heightsAt(kernel, closed, 12.76, 0, 20.5, 29.8, 0.1, created).length).toBeGreaterThan(10);
      expect(heightsAt(kernel, closed, 13.88, 0, 21.5, 29.8, 0.05, created).length).toBeLessThan(heightsAt(kernel, closed, 13.92, 0, 21.5, 29.8, 0.05, created).length);
      expect(heightsAt(kernel, closed, 13.92, 0, 21.5, 29.8, 0.05, created).length).toBe(Math.floor((29.8 - 21.5) / 0.05 + 1e-6) + 1);
      // Its grooves, where the neck's crests run, are 2.7 mm apart up the wall, as the crests are.
      const grooves = middles(heightsAt(kernel, closed, 13.85, 0, 20.5, 29.8, 0.02, created).filter((y) => y > 21.5), 0.02);
      const steps = grooves.slice(1).map((y, index) => y - grooves[index]);
      expect(steps.length).toBeGreaterThan(1);
      for (const step of steps) expect(step).toBeCloseTo(2.7, 1);
      // Turned 90 degrees on the neck, the threads are a quarter of a pitch apart in height: then they do meet.
      const turned = closed.rotate([0, 90, 0]);
      const clash = turned.intersect(withThread);
      created.push(turned, clash);
      expect(clash.volume()).toBeGreaterThan(1);
    } finally {
      dispose(created);
    }
  });

  it("makes the same cap alone for a body that is not the neck, and leaves the body as it is", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const options = normalizeLidOptions(PCO);
      const neck = lidForSolid(kernel, openPot(kernel, created, 24.94, 30, 1.6), options);
      if ("error" in neck) throw new Error(JSON.stringify(neck.error));
      created.push(neck.lid, neck.screw!.thread!);
      // A tube as wide as the bottle a cap is wanted for: 30 mm across, not the neck under the thread.
      const tube = openPot(kernel, created, 30, 20, 2);
      const alone = lidForSolid(kernel, tube, options);
      if ("error" in alone) throw new Error(JSON.stringify(alone.error));
      created.push(alone.lid);
      expect(alone.screw!.thread).toBeNull();
      expect(alone.screw!.capOnly).toEqual({ reason: "size", diameter: 30 });
      expect(alone.screw!.standard).toBe("pco1881");
      expect(alone.screw!.diameter).toBeCloseTo(31, 6);
      // The same cap: as much of it, its inside as the neck's cap's, turned so they line up.
      expect(alone.lid.volume()).toBeCloseTo(neck.lid.volume(), 1);
      const neckBox = neck.lid.boundingBox();
      const aloneBox = alone.lid.boundingBox();
      expect(aloneBox.max[1] - aloneBox.min[1]).toBeCloseTo(neckBox.max[1] - neckBox.min[1], 6);
      const shifted = alone.lid.translate([neckBox.min[0] - aloneBox.min[0], neckBox.min[1] - aloneBox.min[1], neckBox.min[2] - aloneBox.min[2]]);
      const apart = shifted.subtract(neck.lid);
      created.push(shifted, apart);
      expect(apart.volume()).toBeLessThan(0.01);
      // A box is no neck either, and a solid stand-in gets its cap as well.
      const outer = kernel.Manifold.cube([40, 30, 40], true).translate([0, 15, 0]);
      const inner = kernel.Manifold.cube([36, 30, 36], true).translate([0, 17, 0]);
      const box = outer.subtract(inner);
      created.push(outer, inner, box);
      const boxed = lidForSolid(kernel, box, options);
      if ("error" in boxed) throw new Error(JSON.stringify(boxed.error));
      created.push(boxed.lid);
      expect(boxed.screw!.capOnly).toEqual({ reason: "notRound" });
      expect(boxed.screw!.thread).toBeNull();
      const rod = kernel.Manifold.cylinder(20, 15, 15, 96).rotate([-90, 0, 0]);
      created.push(rod);
      const solid = lidForSolid(kernel, rod, options);
      if ("error" in solid) throw new Error(JSON.stringify(solid.error));
      created.push(solid.lid);
      expect(solid.screw!.capOnly).toEqual({ reason: "size", diameter: 30 });
    } finally {
      dispose(created);
    }
  });

  it("fills a neck a little thinner than the standard's up to it, and cuts the ends of the thread back from the body's face", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const body = openPot(kernel, created, 24.2, 30, 1.6);
      const result = lidForSolid(kernel, body, normalizeLidOptions(PCO));
      if ("error" in result) throw new Error(JSON.stringify(result.error));
      created.push(result.lid, result.screw!.thread!);
      const withThread = body.add(result.screw!.thread!);
      created.push(withThread);
      expect(withThread.decompose().length).toBe(1);
      // Between the thread's ends, 12.43 from the axis (the standard's neck less a hair) is solid all round; above and
      // below them it is the body's own 12.1.
      for (const degrees of [0, 45, 90, 135, 180, 225, 270, 315]) {
        expect(heightsAt(kernel, withThread, 12.43, degrees, 23.4, 27.2, 0.2, created).length, `${degrees}°`).toBe(20);
      }
      expect(heightsAt(kernel, withThread, 12.43, 0, 28.5, 29.9, 0.2, created)).toEqual([]);
      const closed = closing(body, result.lid, 2, created);
      const overlap = closed.intersect(withThread);
      created.push(overlap);
      expect(overlap.volume()).toBeLessThan(1e-6);
    } finally {
      dispose(created);
    }
  });

  it("makes every standard's cap close on its neck without touching, its thread at the standard's sizes", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      for (const standard of Object.keys(LID_THREAD_STANDARD_SPECS) as Exclude<LidThreadStandard, "own">[]) {
        const thread = lidStandardThread(standard);
        const height = thread.capDepth + 5;
        const body = openPot(kernel, created, thread.minor, height, 2, 256);
        const result = lidForSolid(kernel, body, normalizeLidOptions({ ...PCO, threadStandard: standard, gap: 0.3 }));
        if ("error" in result) throw new Error(`${standard}: ${JSON.stringify(result.error)}`);
        created.push(result.lid);
        expect(result.screw!.thread, standard).not.toBeNull();
        created.push(result.screw!.thread!);
        expect(result.screw!.pitch, standard).toBe(thread.pitch);
        expect(result.screw!.depth, standard).toBeCloseTo((thread.major - thread.minor) / 2, 9);
        expect(result.screw!.diameter, standard).toBeCloseTo(thread.major + 2 * (0.3 + 1.6), 6);
        const threadBox = result.screw!.thread!.boundingBox();
        expect(threadBox.max[0], standard).toBeLessThanOrEqual(thread.major / 2 + 1e-6);
        expect(threadBox.max[0], standard).toBeGreaterThan(thread.major / 2 - 0.03);
        expect(threadBox.max[1], standard).toBeCloseTo(height - thread.start, 3);
        const withThread = body.add(result.screw!.thread!);
        const closed = closing(body, result.lid, 2, created);
        const overlap = closed.intersect(withThread);
        created.push(withThread, overlap);
        expect(overlap.volume(), standard).toBeLessThan(1e-6);
        const outside = result.screw!.thread!.subtract(body);
        created.push(outside);
        // The points of both wind with the thread, so its steep flanks keep the gap to a few thousandths.
        const gap = closed.minGap(outside, 2);
        expect(gap, standard).toBeGreaterThan(0.297);
        expect(gap, standard).toBeLessThanOrEqual(0.3 + 1e-6);
        expect(closed.boundingBox().min[1], standard).toBeCloseTo(height - thread.capDepth, 3);
      }
    } finally {
      dispose(created);
    }
  });

  it("refuses a neck too low for the thread, one that does not stay a neck as far as the cap reaches, a thin wall and a gap too large", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const refusal = (body: Body, given: Record<string, unknown> = {}) => {
        const result = lidForSolid(kernel, body, normalizeLidOptions({ ...PCO, ...given }));
        if (!("error" in result)) created.push(result.lid, ...(result.screw?.thread ? [result.screw.thread] : []));
        return "error" in result ? result.error : null;
      };
      // 650 degrees and the tooth from 1.7 mm down end 8.25 mm down; 0.4 mm must stay below.
      expect(refusal(openPot(kernel, created, 24.94, 8.5, 1.6))).toEqual({ code: "screwStandardTooLow", standard: "pco1881", height: 8.3 });
      expect(refusal(openPot(kernel, created, 24.94, 8.7, 1.6))).toBeNull();
      // A neck 6 mm long on a wider shoulder: the cap, 10 mm deep, would sit on it.
      const shoulder = kernel.Manifold.cylinder(24, 20, 20, 192).rotate([-90, 0, 0]);
      const necked = openPot(kernel, created, 24.94, 30, 1.6).add(shoulder);
      created.push(shoulder, necked);
      expect(refusal(necked)).toEqual({ code: "screwStandardNeck", standard: "pco1881", depth: 10 });
      expect(refusal(openPot(kernel, created, 24.94, 30, 0.6))).toEqual({ code: "screwThinWall" });
      // At most half the thread's depth: 0.61 mm.
      expect(refusal(openPot(kernel, created, 24.94, 30, 1.6), { gap: 0.65 })).toEqual({ code: "screwStandardGapDeep", gap: 0.61 });
      // Pitch and turns do not count with a standard: these would be too low for the body as the own thread.
      expect(refusal(openPot(kernel, created, 24.94, 12, 1.6), { threadPitch: 8, threadTurns: 8 })).toBeNull();
    } finally {
      dispose(created);
    }
  });
});
