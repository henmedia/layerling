import manifoldModule, { type ManifoldToplevel } from "manifold-3d";
import { beforeAll, describe, expect, it } from "vitest";
import { simplifyStoppedShort, simplifyTrianglePositions } from "@/lib/meshSimplify";
import { validateClosedSolidTriangleSoup } from "@/lib/svgImport";

let runtime: ManifoldToplevel;

beforeAll(async () => {
  runtime = await manifoldModule();
  runtime.setup();
});

/** A 40 x 40 x 5 mm plate with a 10 mm bore of 96 sides, its faces divided finely as a scan or a fine STL export leaves them. */
function plateWithBore() {
  const { Manifold } = runtime;
  const plate = Manifold.cube([40, 40, 5], true);
  const bore = Manifold.cylinder(8, 5, 5, 96, true);
  const solid = plate.subtract(bore).refineToLength(1.2);
  const mesh = solid.getMesh();
  const soup: number[] = [];
  for (let index = 0; index < mesh.triVerts.length; index += 1) {
    const vertex = mesh.triVerts[index];
    for (let axis = 0; axis < 3; axis += 1) soup.push(mesh.vertProperties[vertex * mesh.numProp + axis]);
  }
  plate.delete();
  bore.delete();
  solid.delete();
  return soup;
}

/** The corners of the soup on the rim of the bore, at the top or the bottom. */
function rimPoints(positions: number[]) {
  const points = new Set<string>();
  for (let index = 0; index < positions.length; index += 3) {
    const [x, y, z] = positions.slice(index, index + 3);
    if (Math.abs(Math.hypot(x, y) - 5) < 1e-3 && Math.abs(Math.abs(z) - 2.5) < 1e-3) points.add([x, y, z].map((value) => value.toFixed(4)).join(","));
  }
  return points;
}

/** How far the plate's corners and edges reach: the outer edges stay where they are only if every corner of the box is still there. */
function boxCorners(positions: number[]) {
  const corners = new Set<string>();
  for (let index = 0; index < positions.length; index += 3) {
    const [x, y, z] = positions.slice(index, index + 3);
    if (Math.abs(Math.abs(x) - 20) < 1e-4 && Math.abs(Math.abs(y) - 20) < 1e-4 && Math.abs(Math.abs(z) - 2.5) < 1e-4) corners.add([x, y, z].map(Math.sign).join(","));
  }
  return corners.size;
}

describe("simplifying a mesh with its edges kept", () => {
  it("thins the flat faces out and leaves the bore's rim and the plate's corners as they were", async () => {
    const source = plateWithBore();
    const sourceTriangles = source.length / 9;
    const rim = rimPoints(source);
    expect(rim.size).toBe(192);

    const kept = await simplifyTrianglePositions(source, sourceTriangles * 0.02, { keepEdges: true });
    expect(() => validateClosedSolidTriangleSoup(kept.positions)).not.toThrow();
    // The flat faces carried almost all the triangles: most of them go.
    expect(kept.triangleCount).toBeLessThan(sourceTriangles * 0.25);
    expect(rimPoints(kept.positions).size).toBe(192);
    expect(boxCorners(kept.positions)).toBe(8);
  });

  it("rounds the rim off without the option, to reach the target", async () => {
    const source = plateWithBore();
    const free = await simplifyTrianglePositions(source, source.length / 9 * 0.02);
    expect(rimPoints(free.positions).size).toBeLessThan(192);
  });
});

describe("a simplification that stops short of the count asked for (#1335)", () => {
  /** The plate with its bore as a CAD export leaves it: no faces divided, almost every point on an edge. */
  function coarsePlate() {
    const { Manifold } = runtime;
    const plate = Manifold.cube([40, 40, 5], true);
    const bore = Manifold.cylinder(8, 5, 5, 96, true);
    const solid = plate.subtract(bore);
    const mesh = solid.getMesh();
    const soup: number[] = [];
    for (let index = 0; index < mesh.triVerts.length; index += 1) {
      const vertex = mesh.triVerts[index];
      for (let axis = 0; axis < 3; axis += 1) soup.push(mesh.vertProperties[vertex * mesh.numProp + axis]);
    }
    plate.delete();
    bore.delete();
    solid.delete();
    return soup;
  }

  it("is told when the kept edges leave the simplifier nothing to take, whatever the count", async () => {
    const source = coarsePlate();
    const sourceTriangles = source.length / 9;
    const half = await simplifyTrianglePositions(source, sourceTriangles / 2, { keepEdges: true });
    const tenth = await simplifyTrianglePositions(source, sourceTriangles / 10, { keepEdges: true });
    // The same result for half and a tenth: the preview cannot change, and the panel says why.
    expect(tenth.triangleCount).toBe(half.triangleCount);
    expect(simplifyStoppedShort(tenth.triangleCount, sourceTriangles / 10)).toBe(true);
  });

  it("is not told when the result reaches the count", async () => {
    const source = plateWithBore();
    const target = source.length / 9 / 2;
    const free = await simplifyTrianglePositions(source, target);
    expect(simplifyStoppedShort(free.triangleCount, target)).toBe(false);
    expect(simplifyStoppedShort(target * 1.1, target)).toBe(false);
    expect(simplifyStoppedShort(target * 1.1 + 5, target)).toBe(true);
  });
});
