import { describe, expect, it } from "vitest";
import { importedShapeFromStl } from "@/lib/stlImport";

function boxStl(width: number, ySize: number, zSize: number, name = "box") {
  const vertices = [
    [0, 0, 0], [width, 0, 0], [width, ySize, 0], [0, ySize, 0],
    [0, 0, zSize], [width, 0, zSize], [width, ySize, zSize], [0, ySize, zSize],
  ];
  const faces = [
    [0, 2, 1], [0, 3, 2], [4, 5, 6], [4, 6, 7],
    [0, 1, 5], [0, 5, 4], [1, 2, 6], [1, 6, 5],
    [2, 3, 7], [2, 7, 6], [3, 0, 4], [3, 4, 7],
  ];
  const facets = faces.map(([a, b, c]) => `facet normal 0 0 0
  outer loop
    vertex ${vertices[a].join(" ")}
    vertex ${vertices[b].join(" ")}
    vertex ${vertices[c].join(" ")}
  endloop
endfacet`).join("\n");
  const source = `solid ${name}\n${facets}\nendsolid ${name}`;
  return new TextEncoder().encode(source).buffer;
}

describe("STL import orientation", () => {
  it("maps a clearly Z-up slicer model to Layerling Y-up", () => {
    const shape = importedShapeFromStl("z-up-box.stl", boxStl(80, 60, 20));

    expect(shape.importedMesh?.baseWidth).toBeCloseTo(80);
    expect(shape.importedMesh?.baseHeight).toBeCloseTo(20);
    expect(shape.importedMesh?.baseDepth).toBeCloseTo(60);
  });

  it("preserves an unmistakably flat Y-up legacy model", () => {
    const shape = importedShapeFromStl("raspberry-pi-like.stl", boxStl(89, 20, 58));

    expect(shape.importedMesh?.baseWidth).toBeCloseTo(89);
    expect(shape.importedMesh?.baseHeight).toBeCloseTo(20);
    expect(shape.importedMesh?.baseDepth).toBeCloseTo(58);
  });

  it("works out the normals from the triangles when the file's are 0 0 0 (#988)", () => {
    const mesh = importedShapeFromStl("zero-normals.stl", boxStl(80, 60, 20)).importedMesh!;
    const positions = mesh.positions;
    const normals = mesh.normals!;
    expect(normals).toHaveLength(positions.length);
    const centre = [0, 0, 0];
    for (let i = 0; i < positions.length; i += 3) for (let axis = 0; axis < 3; axis += 1) centre[axis] += positions[i + axis] / (positions.length / 3);
    for (let corner = 0; corner < positions.length; corner += 9) {
      const middle = [0, 1, 2].map((axis) => (positions[corner + axis] + positions[corner + 3 + axis] + positions[corner + 6 + axis]) / 3 - centre[axis]);
      for (let i = corner; i < corner + 9; i += 3) {
        expect(Math.hypot(normals[i], normals[i + 1], normals[i + 2])).toBeCloseTo(1);
        // Every face of the box looks away from its middle.
        expect(normals[i] * middle[0] + normals[i + 1] * middle[1] + normals[i + 2] * middle[2]).toBeGreaterThan(0);
      }
    }
  });

  it("preserves our own STL exports regardless of proportions", () => {
    const shape = importedShapeFromStl("layerling.stl", boxStl(20, 80, 10, "layerling_design"));

    expect(shape.importedMesh?.baseHeight).toBeCloseTo(80);
    expect(shape.importedMesh?.baseDepth).toBeCloseTo(10);
  });
});
