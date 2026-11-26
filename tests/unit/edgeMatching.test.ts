import { describe, expect, it } from "vitest";
import { matchingEdgeIds } from "@/lib/edgeMatching";
import type { CadModifierEdge } from "@/lib/cadModifierTypes";

const ring = (id: number, rx: number, rz: number, y: number, start = 0): CadModifierEdge => ({
  id,
  points: Array.from({ length: 17 }, (_, index) => {
    const turn = start + (index / 16) * Math.PI * 2;
    return [Math.cos(turn) * rx, y, Math.sin(turn) * rz];
  }).flat(),
  display: true,
  selectable: true,
  angle: 90,
  boundary: false,
  manifold: true,
});
const seam = (id: number, x: number): CadModifierEdge => ({ ...ring(id, 0, 0, 0), points: [x, 0, 0, x, 15, 0, x, 30, 0] });

describe("finding the edges of a rebuilt body again (forum, 621213)", () => {
  // As the kernel numbered them: the round tube starts with its top rim, the oval one with its seam.
  const round = [ring(0, 20, 20, 30), seam(1, 20), ring(2, 20, 20, 0), ring(3, 18, 18, 30), seam(4, 18), ring(5, 18, 18, 0)];
  const oval = [seam(0, 30), ring(1, 30, 20, 30, Math.PI), ring(2, 30, 20, 0), ring(3, 28, 18, 0), seam(4, 28), ring(5, 28, 18, 30)];
  const all = (edges: CadModifierEdge[]) => edges.map((edge) => edge.id);

  it("finds the top outer rim of a tube stretched into an oval", () => {
    expect(matchingEdgeIds(round, [0], oval, all(oval))).toEqual([1]);
    expect(matchingEdgeIds(round, [0, 3], oval, all(oval))).toEqual([1, 5]);
  });

  it("finds nothing when the edge is not there any more", () => {
    expect(matchingEdgeIds(round, [0], oval, [0, 2, 3, 4])).toBeNull();
    expect(matchingEdgeIds(round, [9], oval, all(oval))).toBeNull();
  });
});

describe("finding the edges again after an older fillet got another size (Discussion #175)", () => {
  const edge = (id: number, points: number[]): CadModifierEdge => ({ id, points, display: true, selectable: true, angle: 90, boundary: false, manifold: true });
  /** The top rim of a 40 x 30 x 20 box whose four upright edges are rounded with this radius: four straight edges of two points each, four arcs. */
  const rim = (radius: number, firstId = 0) => {
    const w = 20, d = 15, y = 20;
    const arc = (cx: number, cz: number, from: number) => Array.from({ length: 9 }, (_, index) => {
      const turn = from + (index / 8) * (Math.PI / 2);
      return [cx + Math.cos(turn) * radius, y, cz + Math.sin(turn) * radius];
    }).flat();
    return [
      edge(firstId, [-w + radius, y, -d, w - radius, y, -d]),
      edge(firstId + 1, arc(w - radius, -d + radius, -Math.PI / 2)),
      edge(firstId + 2, [w, y, -d + radius, w, y, d - radius]),
      edge(firstId + 3, arc(w - radius, d - radius, 0)),
      edge(firstId + 4, [w - radius, y, d, -w + radius, y, d]),
      edge(firstId + 5, arc(-w + radius, d - radius, Math.PI / 2)),
      edge(firstId + 6, [-w, y, d - radius, -w, y, -d + radius]),
      edge(firstId + 7, arc(-w + radius, -d + radius, Math.PI)),
      // The bottom rim, so that the frame of all edges is the box.
      edge(firstId + 8, [-w, 0, -d, w, 0, -d, w, 0, d, -w, 0, d, -w, 0, -d]),
    ];
  };
  const ids = (edges: CadModifierEdge[]) => edges.map((item) => item.id);

  it("follows the rim when the radius grows from 3 to 7 mm, where point to point the straight edges are gone", () => {
    const before = rim(3);
    // Numbered otherwise, as a rebuilt body may be.
    const after = rim(7, 20);
    const top = [0, 1, 2, 3, 4, 5, 6, 7];
    expect(matchingEdgeIds(before, top, after, ids(after))).toBeNull();
    expect(matchingEdgeIds(before, top, after, ids(after), true)).toEqual([20, 21, 22, 23, 24, 25, 26, 27]);
    // And back, to a smaller radius.
    expect(matchingEdgeIds(after, [20, 22, 24, 26], before, ids(before), true)).toEqual([0, 2, 4, 6]);
  });

  it("still finds nothing for an edge that is gone: a radius that swallows the short sides", () => {
    const before = rim(3);
    const after = rim(15, 20).filter((item) => item.id !== 22 && item.id !== 26);
    expect(matchingEdgeIds(before, [2], after, ids(after), true)).toBeNull();
  });

  it("does not take an edge twice", () => {
    const before = rim(3);
    const after = rim(4, 20);
    const matched = matchingEdgeIds(before, [0, 1, 2, 3, 4, 5, 6, 7], after, ids(after), true);
    expect(new Set(matched).size).toBe(8);
  });
});
