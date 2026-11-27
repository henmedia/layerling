import { describe, expect, it } from "vitest";
import { openEdgesAddedByEdgeTreatment, openSolidAmongClosed } from "@/lib/editorBooleans";
import type { WorkplaneShape } from "@/types/layerling";

// A 10 mm cube as a mesh, in its own frame; `missing` leaves triangles out, so the surface has a gap.
function meshCube(name: string, missing = 0, x = 0): WorkplaneShape {
  const c = [
    [-5, 0, -5], [5, 0, -5], [5, 10, -5], [-5, 10, -5],
    [-5, 0, 5], [5, 0, 5], [5, 10, 5], [-5, 10, 5],
  ];
  const faces = [
    [0, 2, 1], [0, 3, 2], [4, 5, 6], [4, 6, 7], [0, 1, 5], [0, 5, 4],
    [3, 7, 6], [3, 6, 2], [0, 4, 7], [0, 7, 3], [1, 2, 6], [1, 6, 5],
  ].slice(missing);
  const positions = faces.flatMap((face) => face.flatMap((index) => c[index]));
  return {
    id: name, name, kind: "mesh", color: "#e74c3c", x, z: 0, elevation: 0, size: 10, width: 10, depth: 10, height: 10, rotation: 0, locked: false, hidden: false,
    importedMesh: { positions, baseWidth: 10, baseDepth: 10, baseHeight: 10, triangleCount: faces.length, sourceFormat: "stl" },
  } as WorkplaneShape;
}

const hole = (x = 0) => ({ id: "hole", name: "hole", kind: "box", color: "#999999", hole: true, x, z: 0, elevation: 2, size: 6, width: 6, depth: 6, height: 6, rotation: 0, locked: false, hidden: false }) as WorkplaneShape;

describe("an open part among closed ones is not cut with them (Issue #2164)", () => {
  it("names the open part when a closed one would be cut with it", () => {
    expect(openSolidAmongClosed([meshCube("body"), meshCube("edge", 1)], [hole()])).toEqual({ name: "edge", count: 3 });
  });

  it("leaves the mix alone when no hole reaches a closed part", () => {
    expect(openSolidAmongClosed([meshCube("base", 0, 40), meshCube("scan", 1)], [hole()])).toBeNull();
  });

  it("leaves one open part alone, parts that are all open, and parts that are all closed", () => {
    expect(openSolidAmongClosed([meshCube("scan", 1)], [hole()])).toBeNull();
    expect(openSolidAmongClosed([meshCube("scan", 1), meshCube("other scan", 2)], [hole()])).toBeNull();
    expect(openSolidAmongClosed([meshCube("body"), meshCube("lid")], [hole()])).toBeNull();
  });
});

describe("a fillet or chamfer that opens a closed mesh (Issue #2164)", () => {
  it("counts the gaps it would bring", () => {
    expect(openEdgesAddedByEdgeTreatment(meshCube("before"), meshCube("after", 1))).toBe(3);
    expect(openEdgesAddedByEdgeTreatment(meshCube("before"), meshCube("after"))).toBe(0);
  });

  it("does not stand in the way of a mesh that was open before, or of an exact body", () => {
    expect(openEdgesAddedByEdgeTreatment(meshCube("scan", 1), meshCube("after", 2))).toBe(0);
    expect(openEdgesAddedByEdgeTreatment({ ...meshCube("exact"), cadBrep: "brep" } as WorkplaneShape, meshCube("after", 1))).toBe(0);
  });
});
