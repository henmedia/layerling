import * as THREE from "three";
import { describe, expect, it } from "vitest";
import type { DrawingMesh, DrawingPoint3 } from "@/lib/drawingProjection";
import { toSvgViewEdges } from "@/lib/svgExport";

/** A cube of 10 mm, y up as in the editor, from 0 to 10 on every axis. */
function cube(): DrawingMesh {
  const vertices: DrawingPoint3[] = [];
  for (let i = 0; i < 8; i += 1) vertices.push([i & 1 ? 10 : 0, i & 2 ? 10 : 0, i & 4 ? 10 : 0]);
  const quad = (a: number, b: number, c: number, d: number): Array<[number, number, number]> => [[a, b, c], [a, c, d]];
  return {
    vertices,
    faces: [
      ...quad(0, 2, 3, 1), ...quad(4, 5, 7, 6), // z = 0, z = 10
      ...quad(0, 1, 5, 4), ...quad(2, 6, 7, 3), // y = 0, y = 10
      ...quad(0, 4, 6, 2), ...quad(1, 3, 7, 5), // x = 0, x = 10
    ],
  };
}

const camera = (x: number, y: number, z = 0): [number, number, number, number] => {
  const turn = new THREE.Quaternion().setFromEuler(new THREE.Euler(x * Math.PI / 180, y * Math.PI / 180, z, "YXZ"));
  return [turn.x, turn.y, turn.z, turn.w];
};
/** Looking down at the cube's corner from the front right, as the view cube's corner does. */
const corner = camera(-35.264, 45);
const body = [{ name: "Cube", color: "#2266aa", mesh: cube() }];
const segments = (path: string) => (path.match(/ d="([^"]*)"/)![1]!.match(/[ML]/g) ?? []).length - (path.match(/ d="([^"]*)"/)![1]!.match(/M/g) ?? []).length + (path.match(/ d="([^"]*)"/)![1]!.match(/Z/g) ?? []).length;
const paths = (svg: string) => svg.match(/<path [^>]*>/g) ?? [];

describe("SVG of the current view (Discussion #2103)", () => {
  it("draws the front of the cube as a square at 1:1, straight on", () => {
    const svg = toSvgViewEdges(body, [0, 0, 0, 1], "edges", "Cube");
    // 10 mm and 2 mm free on each side.
    expect(svg).toContain('width="14mm" height="14mm"');
    expect(paths(svg)).toHaveLength(1);
    expect(segments(paths(svg)[0]!)).toBe(4);
    expect(svg).toContain('stroke="#2266aa"');
  });

  it("draws the nine edges one sees from a corner, and the three behind dashed when asked", () => {
    const seen = toSvgViewEdges(body, corner, "edges");
    expect(paths(seen)).toHaveLength(1);
    expect(segments(paths(seen)[0]!)).toBe(9);
    const all = toSvgViewEdges(body, corner, "hidden");
    const hidden = paths(all).filter((path) => path.includes('data-hidden="true"'));
    expect(hidden).toHaveLength(1);
    expect(hidden[0]).toContain('stroke-dasharray');
    expect(segments(hidden[0]!)).toBe(3);
    // The hidden lines come first, the ones in sight lie over them.
    expect(all.indexOf('data-hidden="true"')).toBeLessThan(all.lastIndexOf("<path"));
  });

  it("draws only the outline, the six sides of the hexagon a cube shows from its corner", () => {
    const svg = toSvgViewEdges(body, corner, "outline");
    expect(paths(svg)).toHaveLength(1);
    expect(segments(paths(svg)[0]!)).toBe(6);
  });

  it("turns with the camera: seen from above, the cube's depth runs up the page", () => {
    const svg = toSvgViewEdges([{ ...body[0]!, mesh: { ...cube(), vertices: cube().vertices.map(([x, y, z]): DrawingPoint3 => [x, y, z * 3]) } }], camera(-90, 0), "edges");
    expect(svg).toContain('width="14mm" height="34mm"');
  });

  it("rejects a design with nothing to see", () => {
    expect(() => toSvgViewEdges([], corner)).toThrow();
  });
});
