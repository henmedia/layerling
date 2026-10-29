import { describe, expect, it } from "vitest";
import { importedMeshFootprint, shapeMeshFootprint } from "@/components/SketchWorkspace";
import { sketchReferenceShapeOnWorkplane } from "@/lib/editorSketchCad";
import { meshForShape } from "@/lib/editorMeshCore";
import type { WorkplaneShape } from "@/types/layerling";

// #596: a body under a sketch is drawn with its real outline, not as the rectangle of its width and depth.
const shape = (overrides: Partial<WorkplaneShape>): WorkplaneShape => ({
  id: "s", name: "Shape", kind: "polygon", color: "#2563eb", x: 10, z: -5, elevation: 0, rotation: 0,
  width: 24, depth: 24, height: 10, size: 24, ...overrides,
});

function corners(d: string | null) {
  const numbers = (d ?? "").match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi)?.map(Number) ?? [];
  const points: Array<[number, number]> = [];
  for (let index = 0; index + 1 < numbers.length; index += 2) points.push([numbers[index], numbers[index + 1]]);
  return points;
}

describe("the outline of a body under a sketch (#596)", () => {
  it("follows a polygon: not the four corners of its box", () => {
    const footprint = shapeMeshFootprint(shape({ kind: "polygon", sides: 6 }));
    expect(footprint?.world).toBe(true);
    const points = corners(footprint?.outlineD ?? null);
    // A hexagon has six corners, and the box's four corners (x ± 12, z ± 12) are not among them.
    const unique = new Set(points.map(([x, z]) => `${x.toFixed(2)},${z.toFixed(2)}`));
    expect(unique.size).toBe(6);
    const xs = points.map(([x]) => x);
    expect(Math.min(...xs)).toBeGreaterThan(10 - 12.01);
    expect(Math.max(...xs)).toBeLessThan(10 + 12.01);
  });

  it("stands where the body stands, turned as it is turned", () => {
    const plain = corners(shapeMeshFootprint(shape({ kind: "polygon", sides: 6 }))?.outlineD ?? null);
    const turned = corners(shapeMeshFootprint(shape({ kind: "polygon", sides: 6, rotation: 30 }))?.outlineD ?? null);
    const middle = (points: Array<[number, number]>) => [(Math.min(...points.map(([x]) => x)) + Math.max(...points.map(([x]) => x))) / 2, (Math.min(...points.map(([, z]) => z)) + Math.max(...points.map(([, z]) => z))) / 2];
    expect(middle(plain)[0]).toBeCloseTo(10, 1);
    expect(middle(plain)[1]).toBeCloseTo(-5, 1);
    expect(middle(turned)[0]).toBeCloseTo(10, 1);
    expect(middle(turned)[1]).toBeCloseTo(-5, 1);
    // Turned by 30 degrees a hexagon's corners move: the two outlines are not the same set of points.
    expect(new Set(plain.map(([x, z]) => `${x.toFixed(1)},${z.toFixed(1)}`)).size).toBeGreaterThan(0);
    expect(plain.map(([x, z]) => `${x.toFixed(1)},${z.toFixed(1)}`).sort().join("|")).not.toBe(turned.map(([x, z]) => `${x.toFixed(1)},${z.toFixed(1)}`).sort().join("|"));
  });

  it("shows a group by the outlines of its parts, not as a box (#778)", () => {
    // A thin round plate under a smaller hexagon, grouped: the box of the group would be 40 x 40.
    const group = shape({
      kind: "mesh", x: 0, z: 0, width: 40, depth: 40, height: 14,
      groupedShapes: [
        shape({ id: "plate", kind: "cylinder", x: 0, z: 0, width: 40, depth: 40, height: 4 }),
        shape({ id: "hex", kind: "polygon", sides: 6, x: 0, z: 0, elevation: 4, width: 12, depth: 12, height: 10 }),
      ],
    });
    const footprint = shapeMeshFootprint(group);
    expect(footprint?.world).toBe(true);
    const points = corners(footprint?.outlineD ?? null);
    // The plate is round: far more than four corners, and none of them on the box's corner (20, 20).
    expect(points.length).toBeGreaterThan(40);
    expect(points.some(([x, z]) => Math.abs(x - 20) < 0.5 && Math.abs(z - 20) < 0.5)).toBe(false);
    // Both parts are in it: the plate reaches 20 from the middle, the hexagon's corners stay within 6.5.
    expect(Math.max(...points.map(([x]) => Math.abs(x)))).toBeGreaterThan(19);
    expect(points.some(([x, z]) => Math.hypot(x, z) < 6.5)).toBe(true);
  });

  it("counts the triangle limit per part of a group, so fine parts keep their outline (#834)", () => {
    // Two bolts side by side in one group, as a knurl with a bolt in the report: each is under the limit, both together over it.
    // A group's parts stand relative to the group.
    const bolt = (id: string, x: number) => shape({ id, kind: "thread", x, z: 0, width: 10, depth: 10, height: 25 });
    const parts = [bolt("left", -8), bolt("right", 8)];
    const triangles = parts.map((part) => meshForShape(part).faces.length);
    expect(Math.max(...triangles)).toBeLessThanOrEqual(20000);
    expect(triangles[0] + triangles[1]).toBeGreaterThan(20000);
    const group = shape({ kind: "mesh", x: 25, z: 0, width: 26, depth: 10, height: 25, groupedShapes: parts });
    const points = corners(shapeMeshFootprint(group)?.outlineD ?? null);
    // Two round outlines, not the group's box with its corners at (25 ± 13, ± 5).
    expect(points.length).toBeGreaterThan(40);
    expect(points.some(([x, z]) => Math.abs(Math.abs(x - 25) - 13) < 0.3 && Math.abs(Math.abs(z) - 5) < 0.3)).toBe(false);
    expect(points.some(([x]) => x < 25)).toBe(true);
    expect(points.some(([x]) => x > 25)).toBe(true);
  });

  it("shows each part of a group on a side face, also the part behind the plane (#778)", () => {
    // A bar of 40 x 10 x 10 and a thin post of 6 mm on top of it, grouped; the workplane lies on the bar's front face (z = 5).
    const group = shape({
      kind: "mesh", x: 0, z: 0, width: 40, depth: 10, height: 30,
      groupedShapes: [
        shape({ id: "bar", kind: "box", x: 0, z: 0, width: 40, depth: 10, height: 10 }),
        shape({ id: "post", kind: "cylinder", x: 0, z: 0, elevation: 10, width: 6, depth: 6, height: 20 }),
      ],
    });
    const front = { origin: { x: 0, y: 0, z: 5 }, normal: { x: 0, y: 0, z: 1 }, xAxis: { x: 1, y: 0, z: 0 }, zAxis: { x: 0, y: -1, z: 0 } };
    const reference = sketchReferenceShapeOnWorkplane(group, front, true);
    expect(reference.importedMesh?.partTriangleCounts?.length).toBe(2);
    const points = corners(importedMeshFootprint(reference)?.outlineD ?? null);
    // The bar's face runs 40 wide and 10 high; the post stands 20 above it and only 6 wide. As one body only the bar's face showed.
    const heights = points.map(([, z]) => -z);
    expect(Math.max(...heights) - Math.min(...heights)).toBeGreaterThan(29);
    const top = Math.max(...heights);
    expect(points.filter(([, z]) => Math.abs(-z - top) < 0.5).every(([x]) => Math.abs(x) < 3.5)).toBe(true);
  });

  it("shows a body that has no face on the plane as it is seen, not as the hull round it (#778)", () => {
    // A ring seen from above: its hole is part of the outline, where the hull was one round patch.
    const torus = shape({ kind: "torus", x: 0, z: 0, width: 40, depth: 40, height: 10 });
    const above = { origin: { x: 0, y: 20, z: 0 }, normal: { x: 0, y: 1, z: 0 }, xAxis: { x: 1, y: 0, z: 0 }, zAxis: { x: 0, y: 0, z: 1 } };
    const points = corners(importedMeshFootprint(sketchReferenceShapeOnWorkplane(torus, above, true))?.outlineD ?? null);
    expect(Math.max(...points.map(([x, z]) => Math.hypot(x, z)))).toBeGreaterThan(19);
    expect(points.some(([x, z]) => Math.hypot(x, z) < 11)).toBe(true);
  });

  it("leaves boxes and round shapes to the cheaper drawing", () => {
    expect(shapeMeshFootprint(shape({ kind: "box" }))).toBeNull();
    expect(shapeMeshFootprint(shape({ kind: "cylinder" }))).toBeNull();
  });
});

describe("a body with a chamfered bottom edge under a sketch (#1006)", () => {
  it("shows the wall's outline when seen from above, not the smaller bottom face", async () => {
    const { footprintOfPositions } = await import("@/components/SketchWorkspace");
    // A 10 x 10 box, 10 high, its bottom edges chamfered by 1: the bottom face is 8 x 8, the top and the walls are 10 x 10.
    const v = (x: number, y: number, z: number) => [x, y, z];
    const quad = (a: number[], b: number[], c: number[], d: number[]) => [...a, ...b, ...c, ...a, ...c, ...d];
    const positions = [
      ...quad(v(1, 0, 1), v(9, 0, 1), v(9, 0, 9), v(1, 0, 9)),
      ...quad(v(0, 1, 0), v(10, 1, 0), v(10, 10, 0), v(0, 10, 0)),
      ...quad(v(0, 10, 0), v(0, 10, 10), v(10, 10, 10), v(10, 10, 0)),
      ...quad(v(0, 1, 10), v(0, 1, 0), v(0, 10, 0), v(0, 10, 10)),
      ...quad(v(10, 1, 0), v(10, 1, 10), v(10, 10, 10), v(10, 10, 0)),
      ...quad(v(0, 1, 10), v(10, 1, 10), v(10, 10, 10), v(0, 10, 10)),
    ];
    const width = (d: string | null) => {
      const xs = corners(d).map(([x]) => x);
      return Math.max(...xs) - Math.min(...xs);
    };
    const bottom = footprintOfPositions(positions, (x, z) => ({ x, z }), 10, 10, false);
    const seen = footprintOfPositions(positions, (x, z) => ({ x, z }), 10, 10, true);
    expect(width(bottom?.outlineD ?? null)).toBeCloseTo(8, 3);
    expect(width(seen?.outlineD ?? null)).toBeCloseTo(10, 3);
  });
});
