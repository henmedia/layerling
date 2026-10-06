import { describe, expect, it } from "vitest";
import { groupedContentScale, scaleGroupedVertices, type GroupChildBounds } from "@/lib/groupScale";
import type { WorkplaneShape } from "@/types/layerling";

// A 40 mm cube with a 20 mm cube on top, in the group's own frame: centred on
// x and z, standing on y = 0.
const childBounds: GroupChildBounds = { minX: -20, maxX: 20, minY: 0, maxY: 60, minZ: -20, maxZ: 20 };

function cubeCorners(half: number, bottom: number, top: number): Array<[number, number, number]> {
  return [-half, half].flatMap((x) => [bottom, top].flatMap((y) => [-half, half].map((z) => [x, y, z] as [number, number, number])));
}

const childVertices = [...cubeCorners(20, 0, 40), ...cubeCorners(10, 40, 60)];

function stackedGroup(overrides: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return {
    id: "group",
    name: "Group",
    kind: "mesh",
    color: "#d41721",
    x: 0,
    z: 0,
    elevation: 0,
    size: 40,
    width: 40,
    depth: 40,
    height: 60,
    rotation: 0,
    groupedBaseWidth: 40,
    groupedBaseDepth: 40,
    groupedBaseHeight: 60,
    ...overrides,
  };
}

function extent(vertices: ReadonlyArray<readonly [number, number, number]>, axis: 0 | 1 | 2) {
  const values = vertices.map((vertex) => vertex[axis]);
  return [Math.min(...values), Math.max(...values)];
}

describe("group scale", () => {
  it("leaves a group that was not resized as it is", () => {
    expect(groupedContentScale(stackedGroup(), childBounds)).toEqual([1, 1, 1]);
  });

  it("stretches the parts of a group resized to double", () => {
    const group = stackedGroup({ width: 80, depth: 80, height: 120, size: 80 });
    const scale = groupedContentScale(group, childBounds);
    expect(scale).toEqual([2, 2, 2]);
    const scaled = scaleGroupedVertices(childVertices, scale);
    // The full new height - a split plane can reach past the old 60 mm.
    expect(extent(scaled, 1)).toEqual([0, 120]);
    expect(extent(scaled, 0)).toEqual([-40, 40]);
    expect(extent(scaled, 2)).toEqual([-40, 40]);
    // The step between the two cubes moves up with it.
    expect(scaled).toContainEqual([20, 80, 20]);
    expect(scaled).toContainEqual([20, 120, 20]);
  });

  it("stretches each axis on its own", () => {
    const scale = groupedContentScale(stackedGroup({ height: 90 }), childBounds);
    expect(scale).toEqual([1, 1.5, 1]);
    expect(extent(scaleGroupedVertices(childVertices, scale), 1)).toEqual([0, 90]);
  });

  it("falls back to the bounds of the parts for a group saved without its grouped size", () => {
    const group = stackedGroup({ width: 60, depth: 40, height: 120, size: 60, groupedBaseWidth: undefined, groupedBaseDepth: undefined, groupedBaseHeight: undefined });
    expect(groupedContentScale(group, childBounds)).toEqual([1.5, 2, 1]);
  });

  it("stays finite for a flat group", () => {
    const flat = { ...childBounds, minY: 0, maxY: 0 };
    const scale = groupedContentScale(stackedGroup({ height: 2, groupedBaseHeight: undefined }), flat);
    expect(scale.every(Number.isFinite)).toBe(true);
  });
});
