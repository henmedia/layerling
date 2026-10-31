import { describe, expect, it } from "vitest";
import { restoreGroupedChildren } from "@/lib/editorBooleans";
import { meshForShape } from "@/lib/editorMeshCore";
import type { WorkplaneShape } from "@/types/layerling";

// Discussion #1066: a thread in a group that is enlarged is built again at its new size, as Ungroup builds it, and
// not stretched with the group's other parts, which squeezed or pulled its turns.
const thread: WorkplaneShape = {
  id: "t", name: "Thread", kind: "thread", color: "#2f80ed", x: 0, z: 0, elevation: 0, rotation: 0,
  width: 10, depth: 10, height: 20, size: 10, threadDiameter: 10, threadPitch: 1.5,
};

const group = (width: number, height: number): WorkplaneShape => ({
  id: "g", name: "Group", kind: "group", color: "#2f80ed", x: 0, z: 0, elevation: 0, rotation: 0,
  width, depth: width, height, size: width,
  groupedBaseWidth: 10, groupedBaseDepth: 10, groupedBaseHeight: 20,
  groupedShapes: [thread],
});

const extent = (vertices: readonly (readonly number[])[], axis: number) => {
  const values = vertices.map((vertex) => vertex[axis]);
  return Math.max(...values) - Math.min(...values);
};

describe("a thread in an enlarged group (#1066)", () => {
  it("looks as the thread does after Ungroup", () => {
    const enlarged = group(30, 20);
    const inGroup = meshForShape(enlarged);
    const [opened] = restoreGroupedChildren(enlarged);
    const alone = meshForShape(opened);
    expect(inGroup.vertices.length).toBe(alone.vertices.length);
    for (const axis of [0, 1, 2]) expect(extent(inGroup.vertices, axis)).toBeCloseTo(extent(alone.vertices, axis), 4);
  });

  it("is the same as before when the group is stretched evenly or not at all", () => {
    const same = group(10, 20);
    const inGroup = meshForShape(same);
    const alone = meshForShape(thread);
    expect(inGroup.vertices.length).toBe(alone.vertices.length);
    for (const axis of [0, 1, 2]) expect(extent(inGroup.vertices, axis)).toBeCloseTo(extent(alone.vertices, axis), 4);
  });
});
