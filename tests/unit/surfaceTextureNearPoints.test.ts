import { describe, expect, it } from "vitest";
import { normalsAndCreases, prepareSurfaceBase } from "@/lib/surfaceTextureMesh";

type Vec3 = [number, number, number];

/**
 * A closed body of revolution in the editor's inside frame (y up, faces wound outward) from rows of [radius, height]:
 * a wall between each two rows, a fan across the bottom and the top. The rows may lie as close as a mesh made from a
 * curved sketch puts them.
 */
function revolved(rows: Array<[number, number]>, segments = 48): number[] {
  const out: number[] = [];
  const tri = (a: Vec3, b: Vec3, c: Vec3) => out.push(...a, ...b, ...c);
  const at = (r: number, k: number, y: number): Vec3 => {
    const a = (2 * Math.PI * k) / segments;
    return [r * Math.cos(a), y, r * Math.sin(a)];
  };
  for (let k = 0; k < segments; k += 1) {
    for (let j = 0; j < rows.length - 1; j += 1) {
      const [r0, y0] = rows[j], [r1, y1] = rows[j + 1];
      tri(at(r0, k, y0), at(r1, k, y1), at(r1, k + 1, y1));
      tri(at(r0, k, y0), at(r1, k + 1, y1), at(r0, k + 1, y0));
    }
    const bottom = rows[0], top = rows[rows.length - 1];
    tri(at(0, k, bottom[1]), at(bottom[0], k + 1, bottom[1]), at(bottom[0], k, bottom[1]));
    tri(at(0, k, top[1]), at(top[0], k, top[1]), at(top[0], k + 1, top[1]));
  }
  return out;
}

/** A belly: the radius follows a circle, rows 4 mm apart. */
function belly(): Array<[number, number]> {
  return Array.from({ length: 11 }, (_, j) => {
    const y = j * 4;
    return [Math.sqrt(30 * 30 - (y - 20) * (y - 20)) * 0.9 + 3, y] as [number, number];
  });
}

/** The same rows, each followed by one a few thousandths of a millimetre above it and a hair out of line. */
function withNearRows(rows: Array<[number, number]>): Array<[number, number]> {
  return rows.flatMap(([r, y], j) => (j === 0 || j === rows.length - 1 ? [[r, y] as [number, number]] : [[r, y] as [number, number], [r + 0.004, y + 0.003] as [number, number]]));
}

describe("points that lie almost on each other (Discussion #1648)", () => {
  it("are taken for one point, so the thin triangles between them are gone", () => {
    const clean = prepareSurfaceBase(revolved(belly()));
    const near = prepareSurfaceBase(revolved(withNearRows(belly())));
    expect(near.vertices.length).toBe(clean.vertices.length);
    expect(near.indices.length).toBe(clean.indices.length);
    // Every thin wall between a row and its near twin collapsed; they were counted as degenerate.
    expect(near.removed.degenerate).toBeGreaterThan(0);
  });

  it("do not make sharp edges: a smooth belly with such rows has none", () => {
    const base = prepareSurfaceBase(revolved(withNearRows(belly())));
    const { crease } = normalsAndCreases(base.vertices, base.indices, 30);
    // The bottom and top edges of the body are real edges; nothing between them is.
    let sharp = 0;
    for (let i = 0; i < crease.length; i += 1) {
      const y = base.vertices[i * 3 + 1];
      if (crease[i] && y > 0.01 && y < 39.99) sharp += 1;
    }
    expect(sharp).toBe(0);
  });

  it("leave a body without them point for point as it was", () => {
    const base = prepareSurfaceBase(revolved(belly()));
    // 11 rows round the wall, a point in the middle of the bottom and of the top.
    expect(base.vertices.length / 3).toBe(11 * 48 + 2);
    expect(base.removed.degenerate).toBe(0);
  });

  it("do not merge a finely meshed body: the tolerance stays a small part of its edges", () => {
    // A rod 1 mm across with 48 sides: its edges are 0.065 mm, longer than the weld tolerance but not by much.
    const rows: Array<[number, number]> = Array.from({ length: 6 }, (_, j) => [0.5, j * 0.1]);
    const base = prepareSurfaceBase(revolved(rows));
    expect(base.vertices.length / 3).toBe(6 * 48 + 2);
  });
});
