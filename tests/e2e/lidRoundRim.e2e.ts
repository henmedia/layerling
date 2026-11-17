import { beforeAll, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import Module from "manifold-3d";
import { OcctKernel } from "occt-wasm";
import { buildRevolvedSketchSolid } from "@/lib/cadSketchRevolve";
import { lidForSolid, normalizeLidOptions } from "@/lib/lidTool";
import { strokedSketchProfile } from "@/lib/sketchStroke";
import type { SketchProfile } from "@/types/layerling";

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

/** The points of a quarter or half circle round (x, y), from `from` to `to` degrees anticlockwise. */
function arc(x: number, y: number, radius: number, from: number, to: number, steps = 24): [number, number][] {
  return Array.from({ length: steps + 1 }, (_, step) => {
    const angle = ((from + ((to - from) * step) / steps) * Math.PI) / 180;
    return [x + radius * Math.cos(angle), y + radius * Math.sin(angle)];
  });
}

/**
 * A round pot standing on y = 0 round the y axis, turned from its half cross-section (distance from the axis, height),
 * as a revolved sketch is: an outer wall `radius` from the axis and `height` high, a floor 2 mm thick, and its rim as
 * `rim` draws it from the outer wall's top (radius, top of the straight wall) over to the inner wall.
 */
function pot(kernel: Kernel, created: Solid[], rim: (radius: number, height: number, wall: number) => [number, number][], radius = 30, height = 50, wall = 2) {
  const section = new kernel.CrossSection([[[0, 0], [radius, 0], ...rim(radius, height, wall), [radius - wall, 2], [0, 2]]], "NonZero");
  const turned = section.revolve(192);
  const body = turned.rotate([-90, 0, 0]);
  created.push(section, turned, body);
  return body;
}

/** Rims: square as a hollowed cylinder's, filleted or chamfered on the outside or inside, round over the whole wall. */
const square = () => (radius: number, height: number, wall: number): [number, number][] => [[radius, height], [radius - wall, height]];
const filletOutside = (size: number) => (radius: number, height: number, wall: number): [number, number][] => [...arc(radius - size, height - size, size, 0, 90), [radius - wall, height]];
const chamferOutside = (size: number) => (radius: number, height: number, wall: number): [number, number][] => [[radius, height - size], [radius - size, height], [radius - wall, height]];
const chamferInside = (size: number) => (radius: number, height: number, wall: number): [number, number][] => [[radius, height], [radius - wall + size, height], [radius - wall, height - size]];
const roundOver = () => (radius: number, height: number, wall: number): [number, number][] => arc(radius - wall / 2, height - wall / 2, wall / 2, 0, 180);

/**
 * The cap turned back over and set on the body as it closes it: its plate on the rim's highest point (y = top), on the
 * body's axis, the y axis. The cap is round, so its box is centred on its axis (a body the CAD kernel meshed is not: its
 * points round the axis need not lie evenly either side).
 */
function closing(body: Body, lid: Body, thickness: number, created: Solid[]) {
  const turned = lid.rotate([180, 0, 0]);
  const box = turned.boundingBox();
  const placed = turned.translate([-(box.min[0] + box.max[0]) / 2, body.boundingBox().max[1] + thickness - box.max[1], -(box.min[2] + box.max[2]) / 2]);
  created.push(turned, placed);
  return placed;
}

/** The volume two solids share. */
function shared(a: Body, b: Body, created: Solid[]) {
  const common = a.intersect(b);
  created.push(common);
  return common.volume();
}

/** How far the body reaches from its axis at height y, seen from above: its outline's farthest point. */
function reachAt(body: Body, y: number, created: Solid[]) {
  const upright = body.rotate([90, 0, 0]);
  const cut = upright.slice(y);
  created.push(upright, cut);
  return Math.max(...cut.toPolygons().flat().map(([x, z]) => Math.hypot(x, z)));
}

const SCREW = { type: "screw", thickness: 2, gap: 0.2, wall: 1.6, threadPitch: 3, threadTurns: 2 };
const BAYONET = { type: "bayonet", thickness: 2, gap: 0.2, wall: 1.6, bayonetLugs: 3, bayonetDepth: 8, bayonetAxialGap: 0.3, bayonetDetent: 0.3 };

/**
 * A screw lid on `body`, whose rim's highest point is at `top` and whose wall is `radius` from the axis below the
 * rounding: the thread sits on the straight wall below the rounding, `rimRounding` lower than under a square rim, the cap
 * reaches over the rounding with its plate on the rim, and the two close without touching, the gap between them on the
 * thread's flanks. Returns how far down the rounding reached.
 */
function screwOnRoundedRim(kernel: Kernel, body: Body, top: number, radius: number, created: Solid[], given: Record<string, unknown> = SCREW) {
  const options = normalizeLidOptions(given);
  const result = lidForSolid(kernel, body, options);
  if ("error" in result) throw new Error(JSON.stringify(result.error));
  const { lid, screw } = result;
  created.push(lid, screw!.thread);
  expect(lid.status()).toBe("NoError");
  expect(lid.decompose().length).toBe(1);
  const rounding = screw!.rimRounding;
  const wallTop = top - rounding;
  const height = options.threadPitch * options.threadTurns;
  // The thread ends 0.2 mm under where the rounding begins, as under a square rim, and starts its height lower.
  const threadBox = screw!.thread.boundingBox();
  expect(threadBox.max[1]).toBeCloseTo(wallTop - 0.2, 3);
  expect(threadBox.min[1]).toBeCloseTo(wallTop - height, 3);
  // There the wall is still as wide as below: within the thread's root inset, so its top end lies inside the wall.
  expect(reachAt(body, threadBox.max[1], created)).toBeGreaterThan(radius - 0.1);
  const withThread = body.add(screw!.thread);
  created.push(withThread);
  expect(withThread.decompose().length).toBe(1);
  expect(withThread.genus()).toBe(body.genus());
  // Closed: the plate on the rim's highest point, the cap's rim down to the thread's start, nothing of it in the body.
  const closed = closing(body, lid, options.thickness, created);
  expect(shared(closed, withThread, created)).toBeLessThan(1e-6);
  const capBox = closed.boundingBox();
  expect(capBox.min[1]).toBeCloseTo(wallTop - height, 3);
  expect(capBox.max[1]).toBeCloseTo(top + options.thickness, 3);
  expect(closed.minGap(body, 1)).toBeLessThan(1e-3);
  // Nothing of the cap comes nearer the thread than the gap on its 45 degree flanks.
  const outside = screw!.thread.subtract(body);
  created.push(outside);
  expect(closed.minGap(outside, 2)).toBeCloseTo(options.gap * Math.SQRT1_2, 3);
  // Turned a quarter turn on the body, the threads are a quarter of a pitch apart in height: then they do meet.
  const turned = closed.rotate([0, 90, 0]);
  created.push(turned);
  expect(shared(turned, withThread, created)).toBeGreaterThan(1);
  return rounding;
}

describe("a screw lid on a pot whose rim is rounded or chamfered (real Manifold kernel, Discussion #1426)", () => {
  it("puts the thread on the straight wall below an outside fillet, a chamfer or a rim round over the whole wall, the cap over the rounding", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      // A fillet of 1.5 mm: the thread begins where the wall comes within 0.05 mm of its full width, 1.12 mm under the top.
      const filleted = screwOnRoundedRim(kernel, pot(kernel, created, filletOutside(1.5)), 50, 30, created);
      expect(filleted).toBeGreaterThan(1.1);
      expect(filleted).toBeLessThan(1.2);
      // A chamfer of 1.5 mm at 45 degrees: as far down as it goes, to within 0.05 mm.
      expect(screwOnRoundedRim(kernel, pot(kernel, created, chamferOutside(1.5)), 50, 30, created)).toBeCloseTo(1.5, 1);
      // Half a circle over a 2.4 mm wall, as a stroke with round ends draws it, on a pot of 80 mm and a 4 mm pitch.
      const over = screwOnRoundedRim(kernel, pot(kernel, created, roundOver(), 40, 60, 2.4), 60, 40, created, { ...SCREW, threadPitch: 4, gap: 0.3 });
      expect(over).toBeGreaterThan(0.8);
      expect(over).toBeLessThan(1.2);
    } finally {
      dispose(created);
    }
  });

  it("goes under a chamfer inside that leaves the rim too thin for the thread, and keeps a square rim's thread where it was", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      // 1.8 mm of a 2 mm wall chamfered away inside: 0.5 mm of wall 0.3 mm under the top, too thin before (Discussion
      // #1426); the outside is straight to the top, but the thread goes where the wall is whole.
      expect(screwOnRoundedRim(kernel, pot(kernel, created, chamferInside(1.8)), 50, 30, created)).toBeCloseTo(1.8, 1);
      // A square rim, and one chamfered a little inside that leaves enough wall: as before, the thread 0.2 mm under the top.
      for (const rim of [square(), chamferInside(1)]) {
        const result = lidForSolid(kernel, pot(kernel, created, rim), normalizeLidOptions(SCREW));
        if ("error" in result) throw new Error(JSON.stringify(result.error));
        created.push(result.lid, result.screw!.thread);
        expect(result.screw!.rimRounding).toBe(0);
        expect(result.screw!.thread.boundingBox().max[1]).toBeCloseTo(49.8, 3);
      }
    } finally {
      dispose(created);
    }
  });

  it("refuses a rounding that leaves too little straight wall for the thread, and a pot that tapers or flares at the top as before", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const refusal = (body: Body, given: Record<string, unknown> = SCREW) => {
        const result = lidForSolid(kernel, body, normalizeLidOptions(given));
        if (!("error" in result)) created.push(result.lid, ...(result.screw ? [result.screw.thread] : []), ...(result.bayonet ? [result.bayonet.lugs] : []));
        return "error" in result ? result.error : null;
      };
      // 8.5 mm high with a 4 mm wall: a square rim leaves room for 6 mm of thread and 8 of a bayonet's cap, a fillet of 3
      // mm outside does not.
      expect(refusal(pot(kernel, created, square(), 30, 8.5, 4))).toBeNull();
      expect(refusal(pot(kernel, created, filletOutside(3), 30, 8.5, 4))).toEqual({ code: "screwRimRound", height: 6 });
      expect(refusal(pot(kernel, created, square(), 30, 8.5, 4), BAYONET)).toBeNull();
      expect(refusal(pot(kernel, created, filletOutside(3), 30, 8.5, 4), BAYONET)).toEqual({ code: "bayonetRimRound", height: 8 });
      // One turn fits under the fillet.
      expect(refusal(pot(kernel, created, filletOutside(3), 30, 8.5, 4), { ...SCREW, threadTurns: 1 })).toBeNull();
      // A pot narrowing to the top all the way up, and one whose rim flares out past the wall, are still not round enough.
      const cone = new kernel.CrossSection([[[0, 0], [34, 0], [30, 50], [28, 50], [31.84, 2], [0, 2]]], "NonZero");
      const coneTurned = cone.revolve(192);
      const conePot = coneTurned.rotate([-90, 0, 0]);
      created.push(cone, coneTurned, conePot);
      expect(refusal(conePot)).toEqual({ code: "screwNotRound" });
      const flared = pot(kernel, created, (radius, height, wall) => [[radius, height - 3], [radius + 1, height], [radius - wall, height]]);
      expect(refusal(flared)).toEqual({ code: "screwNotRound" });
      expect(refusal(flared, BAYONET)).toEqual({ code: "bayonetNotRound" });
    } finally {
      dispose(created);
    }
  });
});

describe("a bayonet lid on a pot whose rim is rounded (real Manifold kernel, Discussion #1426)", () => {
  it("puts the lugs below the rounding, and the cap locks over it, held by its ledges and free to come off when turned back", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      for (const rim of [filletOutside(1.5), roundOver()]) {
        const body = pot(kernel, created, rim);
        const result = lidForSolid(kernel, body, normalizeLidOptions(BAYONET));
        if ("error" in result) throw new Error(JSON.stringify(result.error));
        const { lid, bayonet } = result;
        created.push(lid, bayonet!.lugs);
        const wallTop = 50 - bayonet!.rimRounding;
        expect(bayonet!.rimRounding).toBeGreaterThan(0.6);
        expect(bayonet!.rimRounding).toBeLessThan(1.5);
        expect(bayonet!.lugs.boundingBox().max[1]).toBeCloseTo(wallTop - 0.2, 3);
        const withLugs = body.add(bayonet!.lugs);
        created.push(withLugs);
        expect(withLugs.decompose().length).toBe(1);
        const closed = closing(body, lid, 2, created);
        expect(shared(closed, withLugs, created)).toBeLessThan(1e-6);
        expect(closed.boundingBox().min[1]).toBeCloseTo(wallTop - 8, 3);
        expect(closed.minGap(body, 1)).toBeLessThan(1e-3);
        const at = (degrees: number, lift: number) => {
          const moved = closed.rotate([0, degrees, 0]).translate([0, lift, 0]);
          created.push(moved);
          return shared(moved, withLugs, created);
        };
        // Locked, it lifts by the axial gap and no further; turned back by the turn, it comes off.
        expect(at(0, 0.25)).toBeLessThan(1e-6);
        expect(at(0, 0.6)).toBeGreaterThan(0.1);
        for (const lift of [10, 4, 1, 0]) expect(at(bayonet!.turn, lift), `open, ${lift} mm up`).toBeLessThan(1e-6);
      }
    } finally {
      dispose(created);
    }
  });
});

describe("a screw lid on a vessel revolved from a stroke with round ends, as the editor builds it (OCCT and Manifold, Discussion #1426)", () => {
  let cad: OcctKernel;

  beforeAll(async () => {
    const wasm = join(dirname(fileURLToPath(import.meta.resolve("occt-wasm"))), "occt-wasm.wasm");
    cad = await OcctKernel.init({ wasm });
  });

  it("threads the straight neck under the round rim of a potter's vessel: a floor, a flaring belly and a neck, one line 3 mm wide", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      // Drawn left of the axis, the sketch's z running down: the floor out to 25 mm, the belly out to 32 mm 15 mm up, the
      // neck straight up to 55 mm; round corners and round ends.
      const line: SketchProfile = {
        points: [{ id: "a", x: 0, z: 0 }, { id: "b", x: -25, z: 0 }, { id: "c", x: -32, z: -15 }, { id: "d", x: -32, z: -55 }],
        segments: [{ id: "s1", kind: "line", startId: "a", endId: "b" }, { id: "s2", kind: "line", startId: "b", endId: "c" }, { id: "s3", kind: "line", startId: "c", endId: "d" }],
        stroke: { width: 3, align: "center", join: "round", cap: "round" },
      };
      const band = strokedSketchProfile(kernel, line, { clipToRevolveSide: true });
      expect(band).not.toBeNull();
      const solid = buildRevolvedSketchSolid(cad, band!, 0, 360);
      expect(cad.isValid(solid)).toBe(true);
      const mesh = cad.tessellate(solid, { linearDeflection: 0.02, angularDeflection: 0.2 });
      cad.release(solid);
      const triangles = new kernel.Mesh({ numProp: 3, vertProperties: new Float32Array(mesh.positions), triVerts: new Uint32Array(mesh.indices), tolerance: 0.0001 });
      triangles.merge();
      const body = kernel.Manifold.ofMesh(triangles);
      created.push(body);
      expect(body.status()).toBe("NoError");
      const box = body.boundingBox();
      // The neck's round end 1.5 mm over its line, the wall 33.5 mm from the axis outside.
      expect(box.max[1] - box.min[1]).toBeCloseTo(58, 2);
      expect((box.max[0] - box.min[0]) / 2).toBeCloseTo(33.5, 1);
      const rounding = screwOnRoundedRim(kernel, body, box.max[1], 33.5, created);
      expect(rounding).toBeGreaterThan(1);
      expect(rounding).toBeLessThan(1.5);
    } finally {
      dispose(created);
    }
  });
});
