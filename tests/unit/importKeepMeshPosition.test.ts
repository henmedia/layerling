import { describe, expect, it } from "vitest";
import { placeColoredParts } from "@/lib/coloredImport";
import { zUpToLayerling } from "@/lib/meshCoordinates";
import { importedShapesFromObj } from "@/lib/objImport";
import { importedShapeFromStl, importedShapeFromTriangleSoup } from "@/lib/stlImport";
import type { WorkplaneShape } from "@/types/layerling";

/** A box from `from` to `to` in the file's own Z-up frame, as triangles. */
function boxTriangles([x0, y0, z0]: number[], [x1, y1, z1]: number[]) {
  const vertices = [
    [x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0],
    [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1],
  ];
  const faces = [
    [0, 2, 1], [0, 3, 2], [4, 5, 6], [4, 6, 7],
    [0, 1, 5], [0, 5, 4], [1, 2, 6], [1, 6, 5],
    [2, 3, 7], [2, 7, 6], [3, 0, 4], [3, 4, 7],
  ];
  return faces.map((face) => face.map((index) => vertices[index]));
}

function boxStl(from: number[], to: number[]) {
  const facets = boxTriangles(from, to).map((corners) => `facet normal 0 0 0
  outer loop
${corners.map((corner) => `    vertex ${corner.join(" ")}`).join("\n")}
  endloop
endfacet`).join("\n");
  return new TextEncoder().encode(`solid part\n${facets}\nendsolid part`).buffer;
}

function boxObj(from: number[], to: number[]) {
  const corners = boxTriangles(from, to).flat();
  return [
    ...corners.map((corner) => `v ${corner.join(" ")}`),
    ...Array.from({ length: corners.length / 3 }, (_, face) => `f ${face * 3 + 1} ${face * 3 + 2} ${face * 3 + 3}`),
  ].join("\n");
}

/** The points of a body where they stand on the workplane: its mesh moved to its place. */
function worldPoints(shape: WorkplaneShape) {
  const positions = shape.importedMesh!.positions;
  const points: number[][] = [];
  for (let index = 0; index < positions.length; index += 3) {
    points.push([positions[index] + shape.x, positions[index + 1] + (shape.elevation ?? 0), positions[index + 2] + shape.z]);
  }
  return points;
}

function lowest(shape: WorkplaneShape) {
  return Math.min(...worldPoints(shape).map((point) => point[1]));
}

describe("Keep the position from the file (Issue #1939)", () => {
  it("puts an STL where its file puts it, the file's origin in the middle of the plate", () => {
    const shape = importedShapeFromStl("hip.stl", boxStl([5, 10, 20], [25, 30, 32]), { keepPosition: true });
    const expected = boxTriangles([5, 10, 20], [25, 30, 32]).flat().map((corner) => zUpToLayerling(corner as [number, number, number]));
    worldPoints(shape).forEach((point, index) => point.forEach((value, axis) => expect(value).toBeCloseTo(expected[index][axis], 4)));
    expect(shape.elevation).toBeCloseTo(20);
  });

  it("lets two parts imported one after the other keep their places to each other", () => {
    const body = importedShapeFromStl("body.stl", boxStl([-10, -10, 30], [10, 10, 60]), { keepPosition: true });
    const hip = importedShapeFromStl("hip.stl", boxStl([-8, -6, 0], [8, 6, 30]), { keepPosition: true });
    // The body sits right on the hip, as in the file.
    expect(lowest(body)).toBeCloseTo(30);
    expect(lowest(hip)).toBeCloseTo(0);
    expect(body.x).toBeCloseTo(hip.x);
    expect(body.z).toBeCloseTo(hip.z);
  });

  it("leaves the usual spot when it is off", () => {
    const shape = importedShapeFromStl("hip.stl", boxStl([5, 10, 20], [25, 30, 32]));
    expect(shape.x).toBe(10);
    expect(shape.z).toBe(-10);
    expect(shape.elevation ?? 0).toBe(0);
    expect(lowest(shape)).toBeCloseTo(0);
  });

  it("keeps the position of an OBJ, one body or one per colour", () => {
    const left = importedShapesFromObj("left.obj", boxObj([-40, 0, 0], [-30, 10, 10]), [], { keepPosition: true }).shapes[0];
    const right = importedShapesFromObj("right.obj", boxObj([30, 0, 0], [40, 10, 10]), [], { keepPosition: true }).shapes[0];
    expect(right.x - left.x).toBeCloseTo(70);
    expect(left.x).toBeCloseTo(-35);
    const plain = importedShapesFromObj("left.obj", boxObj([-40, 0, 0], [-30, 10, 10])).shapes[0];
    expect(plain.x).toBe(10);
  });

  it("puts every coloured part at its own place in the file", () => {
    const parts = [
      { color: "#ff0000", positions: boxTriangles([0, 0, 5], [10, 10, 15]).flat().flatMap((corner) => zUpToLayerling(corner as [number, number, number])) },
      { color: "#00ff00", positions: boxTriangles([50, 0, 0], [60, 10, 10]).flat().flatMap((corner) => zUpToLayerling(corner as [number, number, number])) },
    ];
    const build = (positions: number[]) => importedShapeFromTriangleSoup("parts.3mf", positions, undefined, "3mf");
    const kept = placeColoredParts("parts", parts, build, { keepPosition: true });
    expect(kept[0].x).toBeCloseTo(5);
    expect(kept[1].x).toBeCloseTo(55);
    expect(kept[0].elevation).toBeCloseTo(5);
    expect(kept[1].elevation).toBeCloseTo(0);
    // Without it the parts keep their places to each other, around the usual spot.
    const usual = placeColoredParts("parts", parts, build);
    expect(usual[1].x - usual[0].x).toBeCloseTo(50);
    expect(usual[0].elevation).toBeCloseTo(5);
  });
});
