import { readFileSync } from "node:fs";
import { gunzipSync } from "fflate";
import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { simplifyTrianglePositions } from "@/lib/meshSimplify";
import { analyzeTriangleSoup, validateClosedSolidTriangleSoup } from "@/lib/svgImport";

/** A finely divided, closed sphere as the triangle soup an STL import produces. */
function sphereSoup(radius = 10) {
  return Array.from(new THREE.IcosahedronGeometry(radius, 20).getAttribute("position").array as ArrayLike<number>);
}

function bounds(positions: number[]) {
  const box = new THREE.Box3().setFromArray(positions);
  return box.getSize(new THREE.Vector3());
}

describe("simplifying an imported mesh", () => {
  it("reduces the triangle count to about the target", async () => {
    const source = sphereSoup();
    const sourceTriangles = source.length / 9;
    const result = await simplifyTrianglePositions(source, sourceTriangles / 4);

    expect(result.triangleCount).toBe(result.positions.length / 9);
    expect(result.triangleCount).toBeLessThanOrEqual(Math.ceil(sourceTriangles / 4));
    expect(result.triangleCount).toBeGreaterThan(sourceTriangles / 8);
  });

  it("keeps the body closed and about its size", async () => {
    const source = sphereSoup();
    const result = await simplifyTrianglePositions(source, source.length / 9 / 4);

    expect(() => validateClosedSolidTriangleSoup(result.positions)).not.toThrow();
    const before = bounds(source);
    const after = bounds(result.positions);
    expect(after.x).toBeGreaterThan(before.x * 0.97);
    expect(after.y).toBeGreaterThan(before.y * 0.97);
    expect(after.z).toBeGreaterThan(before.z * 0.97);
    expect(after.x).toBeLessThanOrEqual(before.x + 1e-9);
  });

  it("only uses corners the mesh already had", async () => {
    const source = sphereSoup();
    const known = new Set<string>();
    for (let index = 0; index < source.length; index += 3) known.add(source.slice(index, index + 3).join(","));
    const result = await simplifyTrianglePositions(source, 500);
    for (let index = 0; index < result.positions.length; index += 3) {
      expect(known.has(result.positions.slice(index, index + 3).join(","))).toBe(true);
    }
  });

  it("returns the mesh as it is when the target is not below its count", async () => {
    const source = sphereSoup();
    const result = await simplifyTrianglePositions(source, source.length / 9);
    expect(result.positions).toEqual(source);
  });
});

describe("a target the triangles without area leave no room for (#2163)", () => {
  it("leaves those triangles out instead of failing", async () => {
    const source = sphereSoup(10);
    const sourceTriangles = source.length / 9;
    // 300 facets without area, two corners at one place, as an STL can have them.
    const folded = Array.from({ length: 300 }, (_unused, index) => [index, 0, 0, index, 0, 0, index + 1, 0, 0]).flat();
    const result = await simplifyTrianglePositions([...source, ...folded], sourceTriangles + 200);

    expect(result.triangleCount).toBe(sourceTriangles);
    expect(result.positions).toHaveLength(sourceTriangles * 9);
    expect(() => validateClosedSolidTriangleSoup(result.positions)).not.toThrow();
  });
});

/** Closed as Offset and Hollow need it: every edge between exactly two triangles. Thin slivers are allowed. */
function openOrNonManifoldEdges(positions: number[]) {
  const analysis = analyzeTriangleSoup(positions);
  return analysis.boundaryEdges + analysis.nonManifoldEdges;
}

describe("a closed mesh stays closed (#1562)", () => {
  // The texture part of the bug report: 20,608 triangles, closed, as float32 corners. Simplified, it used to keep
  // flaps - two triangles on the same three points, facing opposite ways - and with them edges with four triangles.
  const part = () => {
    const bytes = gunzipSync(readFileSync("tests/fixtures/simplify-flaps-1562.f32.gz"));
    return Array.from(new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4));
  };

  it.each([
    [2267, false],
    [8000, false],
    [1500, false],
    [4000, true],
  ])("stays closed at %i triangles (keep edges: %s)", async (target, keepEdges) => {
    const source = part();
    expect(openOrNonManifoldEdges(source)).toBe(0);
    const result = await simplifyTrianglePositions(source, target, { keepEdges });

    expect(result.triangleCount).toBeLessThan(source.length / 9);
    expect(result.positions).toHaveLength(result.triangleCount * 9);
    expect(openOrNonManifoldEdges(result.positions)).toBe(0);
  });
});
