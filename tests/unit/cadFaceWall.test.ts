import { describe, expect, it } from "vitest";
import { WALL_EDGE_ANGLE, cadFaceWall, toggledFaces } from "@/lib/cadFaceWall";

type Face = Parameters<typeof cadFaceWall>[1][number];

/** Faces from [id, neighbour, bend] triples: each edge both ways. */
function faces(count: number, edges: Array<[number, number, number]>): Face[] {
  const list: Face[] = Array.from({ length: count }, () => ({ neighbours: [], bends: [] }));
  edges.forEach(([a, b, bend]) => {
    list[a].neighbours.push(b);
    list[a].bends.push(bend);
    list[b].neighbours.push(a);
    list[b].bends.push(bend);
  });
  return list;
}

/*
 * A plate (top 0, bottom 1) with a round hole whose wall is sixteen facets (2 to 17), each turning 22.5 degrees into the
 * next: every facet turns 90 degrees into the top and the bottom.
 */
const facets = Array.from({ length: 16 }, (_, k) => k + 2);
const plate = faces(18, [
  ...facets.map((id, i): [number, number, number] => [id, facets[(i + 1) % facets.length], 22.5]),
  ...facets.flatMap((id): Array<[number, number, number]> => [[0, id, 90], [1, id, 90]]),
]);

describe("the whole wall at a face", () => {
  it("takes every facet of a hole's wall and stops at the plate", () => {
    expect(cadFaceWall(5, plate)).toEqual(facets);
    expect(cadFaceWall(0, plate)).toEqual([0]);
  });

  it("crosses a bend of exactly the limit and stops just above it", () => {
    expect(cadFaceWall(0, faces(2, [[0, 1, WALL_EDGE_ANGLE]]))).toEqual([0, 1]);
    expect(cadFaceWall(0, faces(2, [[0, 1, WALL_EDGE_ANGLE + 0.1]]))).toEqual([0]);
  });

  it("takes a fillet and the flat faces it runs smoothly into, which is why a plain click stays one face", () => {
    // A box's top (0) rounded into its front (2) by a fillet (1); the bottom (3) meets the front at 90 degrees.
    expect(cadFaceWall(1, faces(4, [[0, 1, 0], [1, 2, 0], [2, 3, 90]]))).toEqual([0, 1, 2]);
  });
});

describe("a click on faces in Delete face", () => {
  it("adds what is missing, and takes the faces out when all of them are picked", () => {
    expect(toggledFaces([], [2, 3])).toEqual([2, 3]);
    expect(toggledFaces([0, 3], [2, 3])).toEqual([0, 3, 2]);
    expect(toggledFaces([2, 0, 3], [2, 3])).toEqual([0]);
    expect(toggledFaces([0, 3], [3])).toEqual([0]);
  });
});
