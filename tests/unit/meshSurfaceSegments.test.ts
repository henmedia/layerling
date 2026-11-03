import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { freeformShare, segmentMesh, summarizeSegmentation, weldMesh } from "@/lib/meshSurfaceSegments";

/** A three.js geometry as the triangle soup an STL import holds. */
function soup(geometry: THREE.BufferGeometry) {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  return Array.from(flat.getAttribute("position").array as ArrayLike<number>);
}

function segmented(geometry: THREE.BufferGeometry) {
  const seg = segmentMesh(weldMesh(soup(geometry)));
  expect(seg).not.toBeNull();
  return seg!;
}

describe("finding the faces of a mesh", () => {
  it("finds a box's six planes", () => {
    const summary = summarizeSegmentation(segmented(new THREE.BoxGeometry(30, 20, 10, 4, 3, 2)));
    expect(summary).toMatchObject({ plane: 6, cylinder: 0, cone: 0, sphere: 0, torus: 0, facets: 0 });
  });

  it("finds a cylinder's mantle and its two caps", () => {
    const summary = summarizeSegmentation(segmented(new THREE.CylinderGeometry(10, 10, 20, 48, 3)));
    expect(summary).toMatchObject({ plane: 2, cylinder: 1, cone: 0, facets: 0 });
  });

  it("finds a cone's mantle and its base", () => {
    const summary = summarizeSegmentation(segmented(new THREE.CylinderGeometry(4, 10, 20, 48, 3)));
    expect(summary).toMatchObject({ plane: 2, cone: 1, cylinder: 0, facets: 0 });
  });

  it("finds a sphere as one sphere", () => {
    const summary = summarizeSegmentation(segmented(new THREE.SphereGeometry(10, 48, 24)));
    expect(summary).toMatchObject({ sphere: 1, plane: 0, facets: 0 });
  });

  it("finds a ring as one torus", () => {
    const summary = summarizeSegmentation(segmented(new THREE.TorusGeometry(20, 5, 24, 64)));
    expect(summary).toMatchObject({ torus: 1, sphere: 0, cylinder: 0, facets: 0 });
  });

  it("puts a knot down as free-form and a cylinder not", () => {
    expect(freeformShare(segmented(new THREE.TorusKnotGeometry(10, 3, 96, 12)))).toBeGreaterThan(0.5);
    expect(freeformShare(segmented(new THREE.CylinderGeometry(10, 10, 20, 48, 3)))).toBeLessThan(0.05);
  });

  it("gives up on a mesh that is not closed", () => {
    expect(segmentMesh(weldMesh(soup(new THREE.CylinderGeometry(10, 10, 20, 48, 3, true))))).toBeNull();
  });
});
