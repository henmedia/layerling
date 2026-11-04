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
