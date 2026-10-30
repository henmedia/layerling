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

/** A box 60 wide (x), 30 high (y, the scene's up) and 40 deep (z), with 2 mm walls and floor, open at the top. */
function openBox(kernel: Kernel, created: Solid[]) {
  const outer = kernel.Manifold.cube([60, 30, 40], true).translate([0, 15, 0]);
  const inner = kernel.Manifold.cube([56, 30, 36], true).translate([0, 17, 0]);
  const body = outer.subtract(inner);
  created.push(outer, inner, body);
  return body;
}

/**
 * The lid turned back over and set on the body as it closes it: its plate on the rim (y = top), centred over the body.
 * The tool lays it beside the body upside down; this undoes that, so the fit can be measured.
 */
function closing(kernel: Kernel, body: Body, lid: Body, thickness: number, created: Solid[]) {
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

/**
 * What of `solid` lies below the height `y`: the lip or rim of a closing lid, without its plate. The cut lies a hair below
 * `y`, or the plate's underside would stay behind as a sheet of no thickness lying on the rim.
 */
function below(kernel: Kernel, solid: Body, y: number, created: Solid[]) {
  const cutter = kernel.Manifold.cube([1000, 1000, 1000], true).translate([0, y - 0.01 - 500, 0]);
  const part = solid.intersect(cutter);
  created.push(cutter, part);
  return part;
}

describe("lid (real Manifold kernel, #1009)", () => {
  it("makes a push-in lid whose lip keeps the gap to the walls, laid beside the box with its plate down", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const body = openBox(kernel, created);
      const result = lidForSolid(kernel, body, normalizeLidOptions({ type: "plug", thickness: 2, gap: 0.2, depth: 4, wall: 1.6 }));
      if ("error" in result) throw new Error(JSON.stringify(result.error));
      const lid = result.lid;
      created.push(lid);
      expect(lid.status()).toBe("NoError");
      const box = lid.boundingBox();
      // Beside the box (10 mm away along x), on the plate, as large as the box, 2 mm plate and 4 mm lip high.
      expect(box.min[0]).toBeCloseTo(40, 3);
      expect(box.max[0] - box.min[0]).toBeCloseTo(60, 3);
      expect(box.max[2] - box.min[2]).toBeCloseTo(40, 3);
      expect(box.min[1]).toBeCloseTo(0, 3);
      expect(box.max[1]).toBeCloseTo(6, 3);
      // Plate down: the plate's 60 x 40 at the bottom, the narrower lip on top.
      const plate = below(kernel, lid, 1, created);
      expect(plate.volume()).toBeCloseTo(60 * 40 * 0.99, 0);
      // Turned back on the box it closes it without overlapping, and the lip keeps the gap to the walls.
      const closed = closing(kernel, body, lid, 2, created);
      const overlap = closed.intersect(body);
      created.push(overlap);
      expect(overlap.volume()).toBeLessThan(0.01);
      const lip = below(kernel, closed, 30, created);
      expect(lip.volume()).toBeGreaterThan(0);
      expect(lip.minGap(body, 1)).toBeGreaterThan(0.19);
      expect(lip.minGap(body, 1)).toBeLessThan(0.21);
      // The lip is a ring of 1.6 mm wall, 4 mm deep: (55.6 x 35.6 - 52.4 x 32.4) x 4.
      expect(lip.volume()).toBeCloseTo((55.6 * 35.6 - 52.4 * 32.4) * 3.99, 0);
    } finally {
      dispose(created);
    }
  });

  it("makes a lid that goes over the outside with the gap all round", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const body = openBox(kernel, created);
      const result = lidForSolid(kernel, body, normalizeLidOptions({ type: "cap", thickness: 2, gap: 0.3, depth: 5, wall: 1.6 }));
      if ("error" in result) throw new Error(JSON.stringify(result.error));
      created.push(result.lid);
      const box = result.lid.boundingBox();
      expect(box.max[0] - box.min[0]).toBeCloseTo(60 + 2 * 1.9, 2);
      expect(box.max[1] - box.min[1]).toBeCloseTo(7, 3);
      const closed = closing(kernel, body, result.lid, 2, created);
      const overlap = closed.intersect(body);
      created.push(overlap);
      expect(overlap.volume()).toBeLessThan(0.01);
      const rim = below(kernel, closed, 30, created);
      expect(rim.minGap(body, 1)).toBeGreaterThan(0.29);
      expect(rim.minGap(body, 1)).toBeLessThan(0.31);
      // The rim reaches 5 mm down the outside.
      expect(rim.boundingBox().min[1]).toBeCloseTo(25, 3);
      expect(rim.boundingBox().max[0] - rim.boundingBox().min[0]).toBeCloseTo(60 + 2 * 1.9, 2);
    } finally {
      dispose(created);
    }
  });

  it("follows a round pot", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      // A pot 30 across and 20 high, standing up (Manifold's z turned to the scene's y), 2 mm wall and floor.
      const outer = kernel.Manifold.cylinder(20, 15, 15, 96).rotate([-90, 0, 0]);
      const inner = kernel.Manifold.cylinder(20, 13, 13, 96).rotate([-90, 0, 0]).translate([0, 2, 0]);
      const body = outer.subtract(inner);
      created.push(outer, inner, body);
      const result = lidForSolid(kernel, body, normalizeLidOptions({ type: "plug" }));
      if ("error" in result) throw new Error(JSON.stringify(result.error));
      created.push(result.lid);
      const closed = closing(kernel, body, result.lid, 2, created);
      const overlap = closed.intersect(body);
      created.push(overlap);
      expect(overlap.volume()).toBeLessThan(0.01);
      const lip = below(kernel, closed, 20, created);
      // Faceted circles: the gap a little under 0.2 at worst.
      expect(lip.minGap(body, 1)).toBeGreaterThan(0.15);
      expect(lip.minGap(body, 1)).toBeLessThan(0.25);
    } finally {
      dispose(created);
    }
  });

  it("refuses a lip for a closed body, but lays a flat lid on it", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const closedBox = kernel.Manifold.cube([30, 10, 20], true).translate([0, 5, 0]);
      created.push(closedBox);
      expect(lidForSolid(kernel, closedBox, normalizeLidOptions({ type: "plug" }))).toEqual({ error: { code: "notOpen" } });
      expect(lidForSolid(kernel, closedBox, normalizeLidOptions({ type: "cap" }))).toEqual({ error: { code: "notOpen" } });
      const flat = lidForSolid(kernel, closedBox, normalizeLidOptions({ type: "flat", thickness: 3 }));
      if ("error" in flat) throw new Error(JSON.stringify(flat.error));
      created.push(flat.lid);
      expect(flat.lid.volume()).toBeCloseTo(30 * 20 * 3, 1);
    } finally {
      dispose(created);
    }
  });

  it("refuses a lip that reaches deeper than the body is high", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const body = openBox(kernel, created);
      expect(lidForSolid(kernel, body, normalizeLidOptions({ type: "plug", depth: 40 }))).toEqual({ error: { code: "tooShallow" } });
    } finally {
      dispose(created);
    }
  });
});
