import { describe, expect, it } from "vitest";
import { hasGroupsInside, ungroupAllLevels, ungroupedParts } from "@/lib/ungroupAllLevels";
import type { WorkplaneShape } from "@/types/layerling";

const part = (id: string, patch: Partial<WorkplaneShape> = {}): WorkplaneShape => ({
  id, name: id, kind: "box", color: "#888888", x: 0, z: 0, elevation: 0, size: 10, width: 10, depth: 10, height: 10, rotation: 0, rotationX: 0, rotationZ: 0, locked: false, hidden: false, ...patch,
} as WorkplaneShape);
const group = (id: string, children: WorkplaneShape[], patch: Partial<WorkplaneShape> = {}) => part(id, { kind: "mesh", groupedShapes: children, groupedBaseWidth: 10, groupedBaseDepth: 10, groupedBaseHeight: 10, ...patch });
const names = (shapes: WorkplaneShape[]) => shapes.map((shape) => shape.name);

describe("ungrouping every level", () => {
  const nested = group("c", [group("b", [group("a", [part("box"), part("bore", { hole: true })]), part("second")]), part("third")]);

  it("takes the groups inside a group apart too, where they stand", () => {
    expect(names(ungroupedParts(nested))).toEqual(["b", "third"]);
    const parts = ungroupAllLevels({ ...nested, x: 25, elevation: 4 });
    expect(names(parts)).toEqual(["box", "bore", "second", "third"]);
    expect(parts[1].hole).toBe(true);
    parts.forEach((shape) => {
      expect(shape.x).toBeCloseTo(25, 9);
      expect(shape.elevation).toBeCloseTo(4, 9);
    });
    expect(new Set(parts.map((shape) => shape.id)).size).toBe(4);
  });

  it("keeps bundles, hulls, intersections, lofts and locked groups inside whole", () => {
    (["bundle", "hull", "intersection", "loft"] as const).forEach((groupOperation) => {
      const outer = group("o", [group("inner", [part("x"), part("y")], { groupOperation }), part("z")]);
      expect(names(ungroupAllLevels(outer))).toEqual(["inner", "z"]);
      expect(hasGroupsInside(outer)).toBe(false);
    });
    const locked = group("o", [group("inner", [part("x"), part("y")], { locked: true }), part("z")]);
    expect(names(ungroupAllLevels(locked))).toEqual(["inner", "z"]);
  });

  it("opens a selected bundle itself, and the groups in it", () => {
    const bundle = group("o", [group("inner", [part("x"), part("y")]), part("z")], { groupOperation: "bundle" });
    expect(names(ungroupAllLevels(bundle))).toEqual(["x", "y", "z"]);
  });

  it("is offered only where a group holds another", () => {
    expect(hasGroupsInside(nested)).toBe(true);
    expect(hasGroupsInside(group("a", [part("x"), part("y")]))).toBe(false);
    expect(hasGroupsInside(part("x"))).toBe(false);
  });
});
