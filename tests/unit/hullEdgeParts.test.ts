import { describe, expect, it } from "vitest";
import { restoreGroupedChildrenForEdges } from "@/lib/editorBooleans";
import type { WorkplaneShape } from "@/types/layerling";

// #908: Hollow and the edge tools open a group into its parts, but a hull or an intersection is a body of its own.
const round = (id: string, x: number, size: number): WorkplaneShape => ({
  id, name: "Round", kind: "cylinder", color: "#e67e22", x, z: 0, elevation: 0, rotation: 0,
  width: size, depth: size, height: 10, size,
});

const group = (groupOperation?: WorkplaneShape["groupOperation"]): WorkplaneShape => ({
  id: "g", name: "Group", kind: "mesh", color: "#e67e22", x: 0, z: 0, elevation: 0, rotation: 0,
  width: 80, depth: 40, height: 10, size: 80, groupOperation,
  groupedShapes: [round("a", -25, 20), round("b", 25, 40)],
});

describe("which bodies the edge tools get from a group (#908)", () => {
  it("keeps a hull and an intersection whole", () => {
    expect(restoreGroupedChildrenForEdges(group("hull")).map((part) => part.shape.id)).toEqual(["g"]);
    expect(restoreGroupedChildrenForEdges(group("intersection")).map((part) => part.shape.id)).toEqual(["g"]);
  });

  it("still opens an ordinary group into its parts", () => {
    expect(restoreGroupedChildrenForEdges(group("group"))).toHaveLength(2);
    expect(restoreGroupedChildrenForEdges(group())).toHaveLength(2);
  });
});
