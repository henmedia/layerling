import { describe, expect, it } from "vitest";
import { cornerEdgeCandidates } from "@/lib/cadCornerEdges";
import type { CadModifierEdge } from "@/lib/cadModifierTypes";

function edge(id: number, points: number[], owner = 0): CadModifierEdge {
  return { id, owner, points, display: true, selectable: true, angle: 90, boundary: false, manifold: true };
}

// The back right corner of the ESP32C3 mount in #1178: the back top edge chamfered, the right one not yet.
const edges = [
  edge(0, [60.5, 0, -31.75, 60.5, 7, -31.75]), // upright corner, up to where the back chamfer starts
  edge(1, [60.5, 8, -30.75, 60.5, 7, -31.75]), // the short slanted edge where the back chamfer ends on the right wall
  edge(2, [60.5, 8, -30.75, 60.5, 8, -23.75]), // the right top edge, still sharp
  edge(3, [60.5, 6.6, -23.75, 60.5, 8, -23.75]), // the side of the cable slot at the top edge's other end
  edge(4, [31.5, 7, -31.75, 60.5, 7, -31.75]), // the back chamfer's lower edge, long
  edge(5, [60.5, 0, -31.75, 60.5, 0, -6.75]), // the foot, long
];

describe("cornerEdgeCandidates (#1178)", () => {
  it("offers the short edge between the corner and the top edge as a bridge, the slot's side as another", () => {
    expect(cornerEdgeCandidates(edges, [0, 2], 1)).toEqual({ bridges: [1], others: [3] });
  });

  it("leaves out edges longer than twice the size", () => {
    expect(cornerEdgeCandidates(edges, [0, 2], 0.5)).toEqual({ bridges: [], others: [] });
  });

  it("offers nothing that is picked already, not selectable, or on another solid", () => {
    const other = [...edges.slice(0, 3), { ...edges[3], selectable: false }, ...edges.slice(4)];
    expect(cornerEdgeCandidates(other, [0, 1, 2], 1)).toEqual({ bridges: [], others: [] });
    const elsewhere = edges.map((entry) => entry.id === 1 ? { ...entry, owner: 1 } : entry);
    expect(cornerEdgeCandidates(elsewhere, [0, 2], 1).bridges).toEqual([]);
  });
});
