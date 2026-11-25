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

/**
 * A round box 60 across and 40 high (y up), wall and floor 2 mm, open at the top, with a tube in its middle that is
 * open at both ends: 20 across outside, its bore 16 across and right through the floor.
 */
function boxWithTube(kernel: Kernel, created: Solid[]) {
  const upright = (height: number, radius: number) => kernel.Manifold.cylinder(height, radius, radius, 192).rotate([-90, 0, 0]);
  const outer = upright(40, 30);
  const cavity = upright(40, 28).translate([0, 2, 0]);
  const tube = upright(40, 10);
  const bore = upright(44, 8).translate([0, -2, 0]);
  const hollow = outer.subtract(cavity);
  const withTube = hollow.add(tube);
  const body = withTube.subtract(bore);
  created.push(outer, cavity, tube, bore, hollow, withTube, body);
  return body;
}

/** The same tube alone: a pipe without a floor, whose only opening goes right through. */
function pipe(kernel: Kernel, created: Solid[]) {
  const upright = (height: number, radius: number) => kernel.Manifold.cylinder(height, radius, radius, 192).rotate([-90, 0, 0]);
  const outer = upright(40, 10);
  const bore = upright(44, 8).translate([0, -2, 0]);
  const body = outer.subtract(bore);
  created.push(outer, bore, body);
  return body;
}

/** The lid for `body`, moved back over the middle: what of a disc `radius` across the axis it fills, per mm of height, at `y`. */
function lidOf(kernel: Kernel, body: (kernel: Kernel, created: Solid[]) => ReturnType<Kernel["Manifold"]["cylinder"]>, given: Record<string, unknown>) {
  const created: Solid[] = [];
  try {
    const result = lidForSolid(kernel, body(kernel, created), normalizeLidOptions({ thickness: 2, gap: 0.2, depth: 4, wall: 1.6, ...given }));
    if ("error" in result) throw new Error(JSON.stringify(result.error));
    created.push(result.lid, ...(result.screw?.thread ? [result.screw.thread] : []));
    const box = result.lid.boundingBox();
    const centred = result.lid.translate([-(box.min[0] + box.max[0]) / 2, -box.min[1], -(box.min[2] + box.max[2]) / 2]);
    // The lid lies turned over, its plate at the bottom: the middle of the plate is a millimetre up.
    const probe = (radius: number, from: number, to: number) => {
      const rod = kernel.Manifold.cylinder(to - from, radius, radius, 96).rotate([-90, 0, 0]).translate([0, from, 0]);
      const common = centred.intersect(rod);
      created.push(rod, common);
      return common.volume();
    };
    const pieces = result.lid.decompose();
    created.push(centred, ...pieces);
    return { openings: result.openings ?? 0, volume: result.lid.volume(), pieces: pieces.length, height: box.max[1] - box.min[1], bore: probe(7.5, -1, 10), plate: probe(29, 0, 2), genus: result.lid.genus() };
  } finally {
    dispose(created);
  }
}

/**
 * Discussion #1988: a round box with a tube standing in its middle, open all the way through. The lid closes the box
 * and leaves the tube's bore open, where it used to put a plug into it.
 */
describe("a lid that leaves an opening right through the body open", () => {
  it("cuts the tube's bore through the plate and puts no lip into it", async () => {
    const kernel = await runtime();
    const lid = lidOf(kernel, boxWithTube, { type: "plug" });
    expect(lid.openings).toBe(1);
    // Nothing of the lid within the bore, plate or lip, and the lid is one piece with a hole through it.
    expect(lid.bore).toBeLessThan(0.01);
    expect(lid.pieces).toBe(1);
    expect(lid.height).toBeCloseTo(6, 3);
    // The plate: a disc 60 across less the bore 16 across, 2 mm thick.
    expect(lid.plate).toBeGreaterThan(Math.PI * (29 * 29 - 8 * 8) * 2 * 0.995);
    expect(lid.plate).toBeLessThan(Math.PI * (29 * 29 - 8 * 8) * 2 * 1.001);
  });

  it("closes the bore as before when asked to", async () => {
    const kernel = await runtime();
    const open = lidOf(kernel, boxWithTube, { type: "plug" });
    const closed = lidOf(kernel, boxWithTube, { type: "plug", leaveOpenings: false });
    expect(closed.openings).toBe(0);
    // The plate over the bore, 2 mm thick, and a lip in it, a ring 1.6 mm wide and 4 mm deep, the gap from the bore's wall.
    expect(closed.bore).toBeGreaterThan(Math.PI * (7.5 * 7.5 * 2 + (7.5 * 7.5 - 6.2 * 6.2) * 4) * 0.99);
    expect(closed.volume).toBeGreaterThan(open.volume + Math.PI * 8 * 8 * 2 * 0.99);
  });

  it("leaves the bore open in every kind of lid that fits the box", async () => {
    const kernel = await runtime();
    for (const type of ["cap", "both", "flat", "screw", "bayonet"]) {
      const lid = lidOf(kernel, boxWithTube, { type });
      expect([type, lid.openings]).toEqual([type, 1]);
      expect(lid.bore).toBeLessThan(0.01);
      expect(lid.pieces).toBe(1);
    }
  });

  it("goes round the tube with the lip, the gap from its wall", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const body = boxWithTube(kernel, created);
      const result = lidForSolid(kernel, body, normalizeLidOptions({ type: "plug", thickness: 2, gap: 0.2, depth: 4, wall: 1.6 }));
      if ("error" in result) throw new Error(JSON.stringify(result.error));
      created.push(result.lid);
      // Turned back over and put on the body, the lid touches it only at the rim: no overlap with the tube.
      const box = result.lid.boundingBox();
      const turned = result.lid.transform([1, 0, 0, 0, 0, -1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1]);
      const turnedBox = turned.boundingBox();
      const on = turned.translate([-(turnedBox.min[0] + turnedBox.max[0]) / 2, 40 + 2 - turnedBox.max[1], -(turnedBox.min[2] + turnedBox.max[2]) / 2]);
      const overlap = on.intersect(body);
      created.push(turned, on, overlap);
      expect(box.max[1] - box.min[1]).toBeCloseTo(6, 3);
      expect(overlap.volume()).toBeLessThan(0.05);
    } finally {
      dispose(created);
    }
  });

  it("still plugs a pipe without a floor, whose only opening goes through", async () => {
    const kernel = await runtime();
    const lid = lidOf(kernel, pipe, { type: "plug" });
    expect(lid.openings).toBe(0);
    expect(lid.bore).toBeGreaterThan(Math.PI * 7.5 * 7.5 * 2 * 0.99);
  });
});
