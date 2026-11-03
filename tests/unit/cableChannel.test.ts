import { describe, expect, it } from "vitest";
import { cableChannelShapeFields, cableGrid, findCableChannel, normalizeCableOptions, sampleDistance, type CableChannelPath, type Vec3 } from "@/lib/cableChannel";
import { meshForShape } from "@/lib/editorMeshCore";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { canonicalizeShape } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

/** A box's triangles in the world, nine numbers each: x, z the middle of its footprint, y its bottom. */
function boxTriangles(x: number, y: number, z: number, width: number, height: number, depth: number): number[] {
  const asset = toolbarShapeAssets.find((entry) => entry.kind === "box")!;
  const shape = canonicalizeShape({ ...makeShapeFromAsset(asset, { x, z }), x, z, elevation: y, width, depth, height, size: Math.max(width, depth) });
  const mesh = meshForShape(shape);
  return mesh.faces.flatMap((face) => face.flatMap((index) => mesh.vertices[index]));
}
const close = (a: Vec3, b: Vec3, tolerance: number) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) <= tolerance;

/** The channel's tube as Layerling draws it: its mesh from the shape fields, in the world. */
function tubeMesh(path: CableChannelPath, diameter: number) {
  const asset = toolbarShapeAssets.find((entry) => entry.kind === "bentTube")!;
  const shape = canonicalizeShape({ ...makeShapeFromAsset(asset, { x: 0, z: 0 }), ...cableChannelShapeFields(path, diameter) } as WorkplaneShape);
  return meshForShape(shape).vertices as Vec3[];
}

describe("the cable channel's grid", () => {
  it("knows inside from outside and how far each point is from the hull", () => {
    const grid = cableGrid(boxTriangles(0, 0, 0, 40, 30, 20))!;
    expect(grid).not.toBeNull();
    // The middle of a 40 x 30 x 20 box is 10 mm from its nearest faces, the front and back.
    expect(sampleDistance(grid, [0, 15, 0])).toBeGreaterThan(9);
    expect(sampleDistance(grid, [0, 15, 0])).toBeLessThan(11);
    expect(sampleDistance(grid, [0, 15, 8])).toBeLessThan(3);
    expect(sampleDistance(grid, [30, 15, 0])).toBe(0);
  });
});

describe("finding a cable channel", () => {
  const box = boxTriangles(0, 0, 0, 80, 40, 40);

  it("runs straight through when the ends face each other", () => {
    const result = findCableChannel(box, { point: [-40, 20, 0], normal: [-1, 0, 0] }, { point: [40, 20, 0], normal: [1, 0, 0] }, { diameter: 5 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.segments).toHaveLength(1);
    expect(result.minBend).toBe(Infinity);
    expect(result.length).toBeGreaterThan(79);
    expect(result.length).toBeLessThan(81);
    expect(result.minWall).toBeGreaterThan(15);
  });

  it("bends gently from a side into the top, starting and ending just outside the body", () => {
    const entry = { point: [-40, 12, 0] as Vec3, normal: [-1, 0, 0] as Vec3 };
    const exit = { point: [20, 40, 0] as Vec3, normal: [0, 1, 0] as Vec3 };
    const result = findCableChannel(box, entry, exit, { diameter: 5, minBend: 20, minWall: 1.5 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.tight).toBe(false);
    expect(result.thin).toBe(false);
    expect(result.minBend).toBeGreaterThan(19.5);
    expect(result.minWall).toBeGreaterThanOrEqual(1.4);
    // The tube runs in along the normal and out along the normal, a millimetre beyond the surface each time.
    expect(close(result.centreLine[0], [-41, 12, 0], 1e-6)).toBe(true);
    expect(close(result.centreLine[result.centreLine.length - 1], [20, 41, 0], 0.05)).toBe(true);
    expect(result.segments.length).toBeLessThanOrEqual(12);
  });

  it("puts the bent tube where the channel runs, as Layerling draws it", () => {
    const entry = { point: [-40, 12, 5] as Vec3, normal: [-1, 0, 0] as Vec3 };
    const exit = { point: [25, 40, -6] as Vec3, normal: [0, 1, 0] as Vec3 };
    const result = findCableChannel(box, entry, exit, { diameter: 6, minBend: 18 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const vertices = tubeMesh(result, 6);
    // Every vertex of the tube Layerling draws lies on its wall, 3 mm from the centre line the search found.
    const line = result.centreLine;
    const toLine = (p: Vec3) => {
      let best = Infinity;
      for (let i = 0; i + 1 < line.length; i += 1) {
        const a = line[i], b = line[i + 1];
        const ab: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
        const l2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2 || 1;
        const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1] + (p[2] - a[2]) * ab[2]) / l2));
        best = Math.min(best, Math.hypot(p[0] - a[0] - ab[0] * t, p[1] - a[1] - ab[1] * t, p[2] - a[2] - ab[2] * t));
      }
      return best;
    };
    const distances = vertices.filter((_vertex, index) => index % 5 === 0).map(toLine);
    expect(Math.min(...distances)).toBeGreaterThan(2.8);
    expect(Math.max(...distances)).toBeLessThan(3.2);
  });

  it("goes round two corners of a U and says so when the bends must be tighter than asked", () => {
    // A U of three boxes: two posts on a base, 12 mm thick.
    const u = [...boxTriangles(6, 12, 0, 12, 40, 12), ...boxTriangles(30, 0, 0, 60, 12, 12), ...boxTriangles(54, 12, 0, 12, 40, 12)];
    const entry = { point: [6, 52, 0] as Vec3, normal: [0, 1, 0] as Vec3 };
    const exit = { point: [54, 52, 0] as Vec3, normal: [0, 1, 0] as Vec3 };
    const gentle = findCableChannel(u, entry, exit, { diameter: 4, minBend: 6, minWall: 1 });
    expect(gentle.ok).toBe(true);
    if (!gentle.ok) return;
    expect(gentle.tight).toBe(false);
    expect(gentle.minWall).toBeGreaterThanOrEqual(0.9);
    // Down one post, along the base, up the other: the way is much longer than the straight line between the ends.
    expect(gentle.length).toBeGreaterThan(48 + 2 * 30);
    const stiff = findCableChannel(u, entry, exit, { diameter: 4, minBend: 30, minWall: 1 });
    expect(stiff.ok).toBe(true);
    if (stiff.ok) expect(stiff.tight).toBe(true);
  });

  it("finds no way through a wall thinner than the channel and its walls", () => {
    const plate = boxTriangles(0, 0, 0, 80, 4, 40);
    const result = findCableChannel(plate, { point: [-40, 2, 0], normal: [-1, 0, 0] }, { point: [40, 2, 0], normal: [1, 0, 0] }, { diameter: 5 });
    expect(result).toEqual({ ok: false, error: "endTooThin" });
  });

  it("keeps its settings in range", () => {
    expect(normalizeCableOptions({ diameter: 0.2, minBend: 0, minWall: 99 })).toEqual({ diameter: 1, minBend: 0.6, minWall: 10 });
    expect(normalizeCableOptions({})).toEqual({ diameter: 5, minBend: 25, minWall: 1.5 });
  });
});
