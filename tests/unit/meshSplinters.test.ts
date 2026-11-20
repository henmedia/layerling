import { describe, expect, it } from "vitest";
import type { MeshData } from "@/lib/editorMeshCore";
import { removeLooseSplinters } from "@/lib/meshSplinters";

type Vec = [number, number, number];
type Part = { vertices: Vec[]; faces: [number, number, number][] };

/** A box as twelve triangles, outward facing. */
function box(min: Vec, max: Vec): Part {
  const [x0, y0, z0] = min;
  const [x1, y1, z1] = max;
  const v: Vec[] = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]];
  const quads = [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [2, 3, 7, 6], [1, 2, 6, 5], [3, 0, 4, 7]];
  const faces: [number, number, number][] = [];
  for (const [a, b, c, d] of quads) faces.push([a, b, c], [a, c, d]);
  return { vertices: v, faces };
}

/** A prism with a regular n-sided base: 4n - 4 triangles, so a body that is no splinter by its size of triangle count. */
function prism(sides: number, radius: number, height: number): Part {
  const vertices: Vec[] = [];
  for (let level = 0; level < 2; level += 1) {
    for (let k = 0; k < sides; k += 1) vertices.push([radius * Math.cos((k / sides) * 2 * Math.PI), level * height, radius * Math.sin((k / sides) * 2 * Math.PI)]);
  }
  const faces: [number, number, number][] = [];
  for (let k = 1; k < sides - 1; k += 1) faces.push([0, k + 1, k], [sides, sides + k, sides + k + 1]);
  for (let k = 0; k < sides; k += 1) {
    const next = (k + 1) % sides;
    faces.push([k, next, sides + next], [k, sides + next, sides + k]);
  }
  return { vertices, faces };
}

/** A tetrahedron with the given corners, facing outward. */
function tetra(a: Vec, b: Vec, c: Vec, d: Vec): Part {
  return { vertices: [a, b, c, d], faces: [[0, 2, 1], [0, 1, 3], [1, 2, 3], [0, 3, 2]] };
}

function join(name: string, parts: Part[]): MeshData {
  const vertices: Vec[] = [];
  const faces: [number, number, number][] = [];
  for (const part of parts) {
    const offset = vertices.length;
    vertices.push(...part.vertices);
    for (const [a, b, c] of part.faces) faces.push([a + offset, b + offset, c + offset]);
  }
  return { name, vertices, faces };
}

describe("loose splinters of an export (#352)", () => {
  const plate = prism(32, 10, 3);

  it("leaves a mesh without splinters as it was", () => {
    const mesh = join("plate", [plate]);
    const result = removeLooseSplinters(mesh);
    expect(result.removed).toBe(0);
    expect(result.mesh).toBe(mesh);
  });

  it("takes out a tiny tetrahedron and a thin shard but keeps a small cube and a drawn pyramid", () => {
    const tiny = tetra([30, 0, 0], [30.4, 0, 0], [30, 0.4, 0], [30, 0, 0.4]);
    const thin = tetra([40, 0, 0], [43, 0, 0], [40, 0.02, 0], [40, 0, 3]);
    const cube = box([50, 0, 0], [53, 3, 3]);
    const pyramid = tetra([60, 0, 0], [66, 0, 0], [60, 6, 0], [60, 0, 6]);
    const mesh = join("mixed", [plate, tiny, thin, cube, pyramid]);
    const result = removeLooseSplinters(mesh);
    expect(result.removed).toBe(2);
    expect(result.mesh.faces.length).toBe(mesh.faces.length - 8);
    // No corner of a removed piece is left over: the plate, the cube and the pyramid have 8 + 8 + 4.
    expect(result.mesh.vertices.length).toBe(64 + 8 + 4);
  });

  it("takes out a tiny closed piece of many triangles and a flat sheet of no volume but keeps a thin ring", () => {
    const speck = prism(12, 0.3, 0.3);
    const ring = prism(24, 8, 0.3);
    // An open flat sheet: the top of a prism alone, with no volume.
    const sheet: Part = { vertices: prism(24, 8, 0).vertices.slice(0, 24).map(([x, , z]) => [x + 40, 0, z] as Vec), faces: [] };
    for (let k = 1; k < 23; k += 1) sheet.faces.push([0, k + 1, k]);
    const mesh = join("tiny and thin", [plate, { vertices: speck.vertices.map(([x, y, z]) => [x + 30, y, z] as Vec), faces: speck.faces }, { vertices: ring.vertices.map(([x, y, z]) => [x + 20, y, z] as Vec), faces: ring.faces }, sheet]);
    const result = removeLooseSplinters(mesh);
    expect(result.removed).toBe(2);
    expect(result.mesh.faces.length).toBe(mesh.faces.length - speck.faces.length - sheet.faces.length);
  });

  it("takes out a flat sheet of no volume however large, but keeps a small cube", () => {
    // Two faces on each other: a closed shell of nothing, 12 mm long.
    const sheet: Part = {
      vertices: [[50, 0, 0], [62, 0, 0], [62, 0, 4], [50, 0, 4]],
      faces: [[0, 1, 2], [0, 2, 3], [0, 2, 1], [0, 3, 2]],
    };
    const cube = box([70, 0, 0], [73, 3, 3]);
    const mesh = join("sheet", [plate, sheet, cube]);
    const result = removeLooseSplinters(mesh);
    expect(result.removed).toBe(1);
    expect(result.mesh.faces.length).toBe(mesh.faces.length - sheet.faces.length);
  });

  it("keeps a drawn piece with some volume whose corners the weld did not join (#1258)", () => {
    // A dot of 4.5 mm3 of 92 triangles with one triangle missing: open by the edge count, but it holds a body.
    const dot = prism(24, 1.2, 1);
    const open: Part = { vertices: dot.vertices.map(([x, y, z]) => [x + 30, y, z] as Vec), faces: dot.faces.slice(0, dot.faces.length - 1) };
    const mesh = join("dot", [plate, open]);
    const result = removeLooseSplinters(mesh);
    expect(result.removed).toBe(0);
    expect(result.mesh.faces.length).toBe(mesh.faces.length);
  });

  it("always keeps the piece with the most triangles", () => {
    const mesh = join("specks", [
      tetra([0, 0, 0], [0.4, 0, 0], [0, 0.4, 0], [0, 0, 0.4]),
      prism(8, 0.3, 0.3),
      tetra([9, 0, 0], [9.4, 0, 0], [9, 0.4, 0], [9, 0, 0.4]),
    ]);
    const result = removeLooseSplinters(mesh);
    expect(result.removed).toBe(2);
    expect(result.mesh.faces.length).toBe(prism(8, 0.3, 0.3).faces.length);
  });

  it("finds the pieces of a mesh listed as a soup, where every triangle has its own corners", () => {
    const soupVertices: Vec[] = [];
    const soupFaces: [number, number, number][] = [];
    const speck = tetra([30, 0, 0], [30.4, 0, 0], [30, 0.4, 0], [30, 0, 0.4]);
    for (const part of [plate, speck]) {
      for (const [a, b, c] of part.faces) {
        const base = soupVertices.length;
        soupVertices.push(part.vertices[a], part.vertices[b], part.vertices[c]);
        soupFaces.push([base, base + 1, base + 2]);
      }
    }
    const result = removeLooseSplinters({ name: "soup", vertices: soupVertices, faces: soupFaces });
    expect(result.removed).toBe(1);
    expect(result.mesh.faces.length).toBe(plate.faces.length);
  });
});

/*
 * The body as it was before the cut tells a part someone drew from a leftover of the cut (Issue #1781): four small
 * teeth in one group, standing in a head of another colour, came out of the cut that gave the head their place as
 * pieces of 0.3 mm3 each, and all but one went as splinters.
 */
describe("small pieces a body was drawn with (Issue #1781)", () => {
  const plate = prism(32, 10, 3);
  /** A tooth of 1 x 1 x 1 mm at x, and what a cut left of it: the 0.3 mm that stood out of the head. */
  const tooth = (x: number) => box([x, 0, 0], [x + 1, 1, 1]);
  const toothLeft = (x: number) => box([x, 0, 0.7], [x + 1, 1, 1]);

  it("keeps what is left of every drawn piece, though each is under half a cubic millimetre", () => {
    const drawn = join("details", [plate, tooth(20), tooth(23), tooth(26)]);
    const cut = join("details", [plate, toothLeft(20), toothLeft(23), toothLeft(26)]);
    expect(removeLooseSplinters(cut).removed).toBe(3);
    const result = removeLooseSplinters(cut, [drawn]);
    expect(result.removed).toBe(0);
    expect(result.mesh).toBe(cut);
  });

  it("keeps a small drawn piece a merge left as it was", () => {
    const speck = box([20, 0, 0], [20.6, 0.6, 0.6]);
    const merged = join("merged", [plate, speck]);
    expect(removeLooseSplinters(merged).removed).toBe(1);
    expect(removeLooseSplinters(merged, [join("plate", [plate]), join("speck", [speck])]).removed).toBe(0);
  });

  it("still takes out the sliver left of a large drawn piece, and a splinter that lies in no drawn piece", () => {
    // A letter of 6 x 3 x 3 mm that another layer took but for a grain of 0.027 mm3, and a grain beside everything drawn.
    const letter = box([20, 0, 0], [26, 3, 3]);
    const drawn = join("letters", [plate, letter]);
    const cut = join("letters", [plate, box([20, 0, 0], [20.3, 0.3, 0.3]), tetra([40, 0, 0], [40.4, 0, 0], [40, 0.4, 0], [40, 0, 0.4])]);
    expect(removeLooseSplinters(cut, [drawn]).removed).toBe(2);
  });

  it("keeps only the largest part left of a drawn piece, and nothing that holds next to nothing", () => {
    // The cut left two parts of one tooth, 0.3 and 0.1 mm3, and of another tooth a sheet of 0.005 mm3.
    const drawn = join("details", [plate, tooth(20), tooth(23)]);
    const cut = join("details", [plate, toothLeft(20), box([20, 0, 0], [21, 1, 0.1]), box([23, 0, 0], [24, 1, 0.005])]);
    const result = removeLooseSplinters(cut, [drawn]);
    expect(result.removed).toBe(2);
    expect(result.mesh.faces.length).toBe(plate.faces.length + 12);
  });

  describe("in a mesh layerling worked out itself, as every group is kept (Issue #1781)", () => {
    const moved = (part: Part, dx: number): Part => ({ vertices: part.vertices.map(([x, y, z]) => [x + dx, y, z] as Vec), faces: part.faces });
    // A whisker dot of a logo: 60 triangles round its outline, 0.07 mm3 in it.
    const dot = (x: number) => moved(prism(16, 0.15, 1), x);
    // What a cut made earlier in the design left in the group: a closed grain of four triangles, 0.036 mm3.
    const grain = tetra([40, 0, 0], [40.6, 0, 0], [40, 0.6, 0], [40, 0, 0.6]);

    it("keeps the small pieces of many triangles the group was drawn with", () => {
      const body = join("inlay", [plate, dot(20), dot(23), dot(26)]);
      expect(removeLooseSplinters(body).removed).toBe(3);
      const result = removeLooseSplinters(body, [{ ...body, workedOut: true }]);
      expect(result.removed).toBe(0);
      expect(result.mesh).toBe(body);
    });

    it("still takes out a handful of triangles, which is drawn only in a mesh that was not worked out", () => {
      const body = join("inlay", [plate, dot(20), grain]);
      expect(removeLooseSplinters(body, [{ ...body, workedOut: true }]).removed).toBe(1);
      expect(removeLooseSplinters(body, [body]).removed).toBe(0);
    });
  });
});
