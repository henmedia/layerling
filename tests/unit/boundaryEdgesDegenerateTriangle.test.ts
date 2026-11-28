import { describe, expect, it } from "vitest";
import { positionsBoundaryEdges } from "@/lib/editorMeshCore";

/*
 * Issue #2195: three fillets meeting in a corner of a grouped body left one triangle with two corners on the same point.
 * Its edge of no length counted as an open edge, and the fillet was refused as one that would leave gaps.
 */

type P = [number, number, number];
const A: P = [0, 0, 0];
const B: P = [10, 0, 0];
const C: P = [0, 10, 0];
const D: P = [0, 0, 10];

// A closed tetrahedron, its faces turned outwards.
const tetrahedron: P[][] = [[A, C, B], [A, B, D], [B, C, D], [C, A, D]];
const flat = (triangles: P[][]) => triangles.flat(2);

describe("open edges of a mesh", () => {
  it("finds none on a closed body", () => {
    expect(positionsBoundaryEdges(flat(tetrahedron))).toHaveLength(0);
  });

  it("does not take a triangle with two corners on one point for a gap", () => {
    expect(positionsBoundaryEdges(flat([...tetrahedron, [B, D, D]]))).toHaveLength(0);
  });

  it("still finds a real gap, also where such a triangle lies along its rim", () => {
    const open = tetrahedron.slice(1);
    expect(positionsBoundaryEdges(flat(open))).toHaveLength(3);
    expect(positionsBoundaryEdges(flat([...open, [A, C, C]]))).toHaveLength(3);
  });
});
