import { describe, expect, it } from "vitest";
import { faceSketchLoops } from "@/lib/faceSketchOutline";
import type { SectionFrame } from "@/lib/sectionView";
import type { SectionLoop } from "@/lib/sectionSvg";

// The frame of a face lying at height 0 and looking up: the height is y, the sketch's u is x and its v is z.
const up: SectionFrame = { origin: { x: 0, y: 0, z: 0 }, xAxis: { x: 1, y: 0, z: 0 }, yAxis: { x: 0, y: 1, z: 0 }, zAxis: { x: 0, y: 0, z: 1 } };

type Point = [number, number, number];
type Mesh = { vertices: Point[]; faces: Point[] };

/** Triangles given by their corners in x and z at height `y`, wound to look up; every one with corners of its own. */
function lying(triangles: [number, number][][], y = 0): Mesh {
  const mesh: Mesh = { vertices: [], faces: [] };
  for (const [a, b, c] of triangles) {
    const looksUp = (b[1] - a[1]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[1] - a[1]) > 0;
    const first = mesh.vertices.length;
    for (const [x, z] of looksUp ? [a, b, c] : [a, c, b]) mesh.vertices.push([x, y, z]);
    mesh.faces.push([first, first + 1, first + 2]);
  }
  return mesh;
}

const rect = (x0: number, z0: number, x1: number, z1: number): [number, number][][] => [
  [[x0, z0], [x1, z0], [x1, z1]],
  [[x0, z0], [x1, z1], [x0, z1]],
];

const area = (loop: SectionLoop) => Math.abs(loop.points.reduce((sum, point, index) => {
  const next = loop.points[(index + 1) % loop.points.length];
  return sum + point.u * next.v - next.u * point.v;
}, 0)) / 2;
const areas = (loops: SectionLoop[] | null) => (loops ?? []).map(area).sort((a, b) => b - a);

// Discussion #2173: the sketch held a cut through the whole body instead of the face clicked.
describe("the outline of a clicked face", () => {
  it("takes the face clicked of two in one plane that touch at a corner", () => {
    const mesh = lying([...rect(0, 0, 10, 10), ...rect(10, 10, 14, 14)]);
    expect(areas(faceSketchLoops([mesh], up, [5, 0, 5]))).toEqual([100]);
    expect(areas(faceSketchLoops([mesh], up, [12, 0, 12]))).toEqual([16]);
    expect(areas(faceSketchLoops([mesh], up, null))).toEqual([100, 16]);
  });

  it("leaves out what the plane runs through below and what looks the other way", () => {
    const face = lying(rect(0, 0, 10, 10));
    const deeper = lying(rect(20, 0, 30, 10), -3);
    const underside = lying(rect(40, 0, 50, 10));
    underside.faces = underside.faces.map(([a, b, c]) => [a, c, b]);
    expect(areas(faceSketchLoops([face, deeper, underside], up, null))).toEqual([100]);
  });

  it("gives a face with a hole both outlines", () => {
    // A frame 10 by 10 round a hole of 4 by 4, in four strips; the side strips meet the long ones in T-junctions.
    const mesh = lying([...rect(0, 0, 10, 3), ...rect(0, 7, 10, 10), ...rect(0, 3, 3, 7), ...rect(7, 3, 10, 7)]);
    expect(areas(faceSketchLoops([mesh], up, [1, 0, 1]))).toEqual([100, 16]);
  });

  it("is nothing where no triangle lies in the plane", () => {
    expect(faceSketchLoops([lying(rect(0, 0, 10, 10), -1)], up, [5, 0, 5])).toBeNull();
  });
});
