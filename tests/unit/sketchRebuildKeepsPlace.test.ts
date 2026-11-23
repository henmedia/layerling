import { describe, expect, it } from "vitest";
import { shapeFromCadMesh, sketchMeshReference } from "@/lib/editorSketchCad";
import { movedWithEditedOutline, placedLikeExisting, sketchBodyAnchor } from "@/lib/sketchPlacement";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * Issue #1954: a hook drawn as a sketch stood where it was drawn, its world place within a hair of its sketch middle.
 * Its CAD frame held the middle of its facets (3.0497622: the round end's facets fall 0.000475 mm short of the true
 * surface), its place the true 3.05. On a sketch edit the rebuilt middle was snapped to the world place, the old one
 * was not, and the body moved by the difference, 0.000238 mm, with every edit. A plate aligned to it no longer touched
 * it, and a fillet along the joint rounded the hook's own edge inward.
 */
const MESH_MIDDLE = 3.0497622;
const WORLD_Z = 3.05;

/** A block standing in the sketch's coordinates: 2.85 wide, 2.0995 deep (facets short on one side), 10 high. */
function hookFacets() {
  const half = 2.0995245 / 2;
  const [x0, x1, z0, z1, y0, y1] = [13.15, 16, MESH_MIDDLE - half, MESH_MIDDLE + half, 0, 10];
  const corners = [
    [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1],
    [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1],
  ];
  const faces = [[0, 1, 2, 3], [4, 7, 6, 5], [0, 4, 5, 1], [1, 5, 6, 2], [2, 6, 7, 3], [3, 7, 4, 0]];
  const indices = faces.flatMap(([a, b, c, d]) => [a, b, c, a, c, d]);
  return { positions: new Float32Array(corners.flat()), normals: new Float32Array(0), indices: new Uint32Array(indices) };
}

const hook = (): WorkplaneShape => ({
  id: "hook", name: "Sketch extrusion", kind: "mesh", color: "#d41721", x: 14.575, z: WORLD_Z, elevation: 4, rotation: 0,
  width: 2.85, depth: 2.1, height: 10, size: 2.85,
  sketchProfile: { points: [], segments: [] },
  cadBrep: "brep",
  cadBrepFrame: { x: 14.575, z: MESH_MIDDLE, elevation: 0, width: 2.85, depth: 2.1, height: 10 },
});

const axes = { x: [1, 0, 0] as const, z: [0, 0, 1] as const };

describe("a sketch body rebuilt from an outline that did not move (#1954)", () => {
  const facets = hookFacets();
  const deflection = { linear: 0.05, angular: 0.16 };

  it("stays exactly where it stood", () => {
    const existing = hook();
    const rebuilt = shapeFromCadMesh(sketchMeshReference(existing, existing), facets.positions, facets.normals, facets.indices, "brep", deflection)!;
    const placed = movedWithEditedOutline(placedLikeExisting(rebuilt, existing), existing, sketchBodyAnchor(existing), { x: rebuilt.x, z: rebuilt.z }, axes);
    expect(placed.z).toBe(WORLD_Z);
    expect(placed.x).toBe(existing.x);
    // Its frame stays the sketch middle it had, so the next edit starts from the same place.
    expect(rebuilt.cadBrepFrame?.z).toBeCloseTo(MESH_MIDDLE, 7);
  });

  it("moved by a hair when measured against its world place, as before", () => {
    const existing = hook();
    const rebuilt = shapeFromCadMesh(existing, facets.positions, facets.normals, facets.indices, "brep", deflection)!;
    const placed = movedWithEditedOutline(placedLikeExisting(rebuilt, existing), existing, sketchBodyAnchor(existing), { x: rebuilt.x, z: rebuilt.z }, axes);
    expect(Math.abs(placed.z - WORLD_Z)).toBeGreaterThan(0.0002);
  });

  it("still follows an outline whose middle really moved", () => {
    const existing = hook();
    const shifted = new Float32Array(facets.positions);
    for (let index = 2; index < shifted.length; index += 3) shifted[index] += 1;
    const rebuilt = shapeFromCadMesh(sketchMeshReference(existing, existing), shifted, facets.normals, facets.indices, "brep", deflection)!;
    const placed = movedWithEditedOutline(placedLikeExisting(rebuilt, existing), existing, sketchBodyAnchor(existing), { x: rebuilt.x, z: rebuilt.z }, axes);
    expect(placed.z).toBeCloseTo(WORLD_Z + 1, 5);
  });
});
