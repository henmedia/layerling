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
