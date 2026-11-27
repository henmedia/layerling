import { describe, expect, it } from "vitest";
import Module from "manifold-3d";
import * as THREE from "three";
import { fastEdgesGeometry } from "@/lib/fastEdgesGeometry";
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

/**
 * A hollowed letter O as the font draws it, near enough: an oval with an oval counter, `sides` corners round each, its
 * floor and walls 2 mm, open at the top, the counter right through.
 */
function letterO(kernel: Kernel, created: Solid[], sides: number) {
  const oval = (across: number, high: number) => Array.from({ length: sides }, (_, index): [number, number] => [across * Math.cos((2 * Math.PI * index) / sides), high * Math.sin((2 * Math.PI * index) / sides)]);
  const ring = new kernel.CrossSection([oval(20, 26), oval(10, 15).reverse()]);
  const cavity = ring.offset(-2, "Round", 2, 48);
  const outer = ring.extrude(30);
  const inner = cavity.extrude(30).translate([0, 0, 2]);
  const hollow = outer.subtract(inner);
  const body = hollow.rotate([-90, 0, 0]);
  created.push(ring, cavity, outer, inner, hollow, body);
  return body;
}

/**
 * The edges the editor draws on the lid (as `getEdgesGeometry` does, at 25 degrees) that lie inside its plate's two flat
 * faces, where there should be none: an edge on such a face's outline also belongs to a triangle that is not flat.
 */
function linesOnPlate(lid: ReturnType<Kernel["Manifold"]["cylinder"]>) {
  const mesh = lid.getMesh();
  const corner = (index: number) => [0, 1, 2].map((axis) => mesh.vertProperties[index * mesh.numProp + axis]) as [number, number, number];
  const key = (point: [number, number, number]) => point.map((value) => Math.round(value * 1e4)).join(",");
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(Array.from({ length: mesh.numVert }, (_, index) => corner(index)).flat()), 3));
  geometry.setIndex(Array.from(mesh.triVerts));
  const outlines = new Set<string>();
  for (let triangle = 0; triangle < mesh.numTri; triangle += 1) {
    const [a, b, c] = [0, 1, 2].map((offset) => corner(mesh.triVerts[3 * triangle + offset]));
    const normal = new THREE.Triangle(new THREE.Vector3(...a), new THREE.Vector3(...b), new THREE.Vector3(...c)).getNormal(new THREE.Vector3());
    if (Math.abs(normal.y) > 0.99) continue;
    for (const [from, to] of [[a, b], [b, c], [c, a]]) outlines.add(`${key(from)}|${key(to)}`).add(`${key(to)}|${key(from)}`);
  }
  const box = lid.boundingBox();
  const lines = fastEdgesGeometry(geometry, 25).getAttribute("position");
  let count = 0;
  for (let index = 0; index < lines.count; index += 2) {
    const from: [number, number, number] = [lines.getX(index), lines.getY(index), lines.getZ(index)];
    const to: [number, number, number] = [lines.getX(index + 1), lines.getY(index + 1), lines.getZ(index + 1)];
    const onFace = [box.min[1], box.max[1]].some((y) => Math.abs(from[1] - y) < 1e-4 && Math.abs(to[1] - y) < 1e-4);
    if (onFace && !outlines.has(`${key(from)}|${key(to)}`)) count += 1;
  }
  return count;
}

/**
 * Discussion #1988, the lit letters: the lids of the O and the B, whose counters they leave open, showed lines across
 * their plates. They were slivers a hair wide in the flat faces, turned the wrong way by rounding.
 */
describe("the plate of a lid that leaves an opening open", () => {
  it("shows no lines across its flat faces on a letter O", async () => {
    const kernel = await runtime();
    for (const sides of [61, 97]) {
      for (const type of ["plug", "cap", "both", "flat"]) {
        const created: Solid[] = [];
        try {
          const result = lidForSolid(kernel, letterO(kernel, created, sides), normalizeLidOptions({ type, thickness: 2, gap: 0.2, depth: 4, wall: 1.6 }));
          if ("error" in result) throw new Error(JSON.stringify(result.error));
          created.push(result.lid);
          expect([sides, type, result.openings]).toEqual([sides, type, 1]);
          expect([sides, type, linesOnPlate(result.lid)]).toEqual([sides, type, 0]);
        } finally {
          dispose(created);
        }
      }
    }
  });
});
