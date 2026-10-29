import { describe, expect, it } from "vitest";
import { groupedShape, restoreGroupedChildren, restoreGroupedChildrenForEdges as scopedParts } from "@/lib/editorBooleans";
import type { WorkplaneShape } from "@/types/layerling";

function shape(overrides: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return {
    id: "shape",
    name: "Shape",
    kind: "box",
    color: "#ff5a47",
    x: 0,
    z: 0,
    elevation: 0,
    size: 20,
    width: 20,
    depth: 20,
    height: 20,
    rotation: 0,
    locked: false,
    hidden: false,
    ...overrides,
  };
}

// The group of two holes that is then grouped with a plate (#394).
function plateWithHoleGroup() {
  const holes = groupedShape([
    shape({ id: "hole-a", kind: "cylinder", x: -30, hole: true, height: 20 }),
    shape({ id: "hole-b", kind: "cylinder", x: 30, hole: true, height: 20 }),
  ]);
  if (!holes) throw new Error("the holes did not group");
  const plate = shape({ id: "plate", width: 100, depth: 40, size: 100, height: 6 });
  const group = groupedShape([plate, holes]);
  if (!group) throw new Error("the plate did not group");
  return group;
}

/** The id a part had before grouping and opening gave it suffixes. */
const baseId = (id: string) => id.split(/-(?:group-child|ungroup)-/)[0];
const restoreGroupedChildrenForEdges = (group: WorkplaneShape) => scopedParts(group).map((part) => part.shape);

describe("the bodies of a group for the edge tool", () => {
  it("opens a group of nothing but holes into its holes", () => {
    const group = plateWithHoleGroup();
    expect(restoreGroupedChildren(group)).toHaveLength(2);
    const parts = restoreGroupedChildrenForEdges(group);
    expect(parts).toHaveLength(3);
    expect(parts.filter((part) => part.hole)).toHaveLength(2);
    expect(parts.filter((part) => !part.hole)).toHaveLength(1);
    expect(parts.every((part) => part.kind !== "mesh")).toBe(true);
  });

  it("keeps the holes where they stood", () => {
    const parts = restoreGroupedChildrenForEdges(plateWithHoleGroup());
    const holeCenters = parts.filter((part) => part.hole).map((part) => part.x).sort((a, b) => a - b);
    expect(holeCenters[0]).toBeCloseTo(-30, 6);
    expect(holeCenters[1]).toBeCloseTo(30, 6);
  });

  it("opens a group that mixes solids and holes into a scope of its own, since it cuts only its own solids", () => {
    const inner = groupedShape([
      shape({ id: "block", width: 20, depth: 20, size: 20 }),
      shape({ id: "bore", kind: "cylinder", hole: true, width: 8, depth: 8, size: 8, height: 30 }),
    ]);
    if (!inner) throw new Error("the inner group did not group");
    const outer = groupedShape([shape({ id: "plate", x: 40, width: 40, size: 40 }), inner]);
    if (!outer) throw new Error("the outer group did not group");
    const parts = scopedParts(outer);
    expect(parts.map((part) => [baseId(part.shape.id), part.scope])).toEqual([
      ["plate", []],
      ["block", [0]],
      ["bore", [0]],
    ]);
    expect(parts.every((part) => !(part.shape.groupedShapes?.length))).toBe(true);
  });

  it("leaves a plain group as it is", () => {
    const group = groupedShape([shape({ id: "a" }), shape({ id: "b", x: 40 })]);
    if (!group) throw new Error("did not group");
    expect(restoreGroupedChildrenForEdges(group).map((part) => part.id.split("-ungroup-")[0])).toEqual(["a", "b"]);
  });

  // #996: a wedge with its holes, patterned four times and grouped - each copy's holes cut only its own wedge.
  it("gives every patterned copy of a holder its own scope", () => {
    const holder = (index: number) => {
      const holes = groupedShape([
        shape({ id: `drop-${index}-a`, kind: "teardrop", hole: true, x: index * 26 - 5, width: 6.75, depth: 22, size: 22, height: 7.8 }),
        shape({ id: `drop-${index}-b`, kind: "teardrop", hole: true, x: index * 26 + 5, width: 6.75, depth: 22, size: 22, height: 7.8 }),
      ]);
      if (!holes) throw new Error("the holes did not group");
      const group = groupedShape([shape({ id: `wedge-${index}`, kind: "wedge", x: index * 26, width: 34, depth: 100, size: 100 }), { ...holes, hole: true }]);
      if (!group) throw new Error("the holder did not group");
      // Every computed group carries its mesh; that alone must not keep it closed.
      return { ...group, importedMesh: { positions: [], indices: [], baseWidth: 34, baseDepth: 100, baseHeight: 20 } } as WorkplaneShape;
    };
    const all = groupedShape([0, 1, 2, 3].map(holder));
    if (!all) throw new Error("the holders did not group");
    const parts = scopedParts(all);
    expect(parts).toHaveLength(12);
    for (let index = 0; index < 4; index += 1) {
      const own = parts.filter((part) => baseId(part.shape.id).endsWith(`-${index}`) || baseId(part.shape.id).includes(`-${index}-`));
      expect(own).toHaveLength(3);
      expect(new Set(own.map((part) => part.scope.join("/")))).toEqual(new Set([String(index)]));
    }
  });

  it("numbers the scopes of a group of only solids on with its own level", () => {
    const mixed = (id: string, x: number) => {
      const group = groupedShape([
        shape({ id: `${id}-block`, x }),
        shape({ id: `${id}-cut`, kind: "cylinder", hole: true, x, width: 8, depth: 8, size: 8, height: 30 }),
      ]);
      if (!group) throw new Error("did not group");
      return group;
    };
    const solids = groupedShape([mixed("b", 40), shape({ id: "c", x: 80 })]);
    if (!solids) throw new Error("did not group");
    const outer = groupedShape([mixed("a", 0), solids]);
    if (!outer) throw new Error("did not group");
    const scopes = Object.fromEntries(scopedParts(outer).map((part) => [baseId(part.shape.id), part.scope.join("/")]));
    expect(scopes["a-block"]).toBe(scopes["a-cut"]);
    expect(scopes["b-block"]).toBe(scopes["b-cut"]);
    expect(scopes["a-cut"]).not.toBe(scopes["b-cut"]);
    expect(scopes["c"]).toBe("");
  });

  it("keeps a group closed whose mesh is more than its parts", () => {
    const inner = groupedShape([
      shape({ id: "block", width: 20, depth: 20, size: 20 }),
      shape({ id: "bore", kind: "cylinder", hole: true, width: 8, depth: 8, size: 8, height: 30 }),
    ]);
    if (!inner) throw new Error("did not group");
    const textured = { ...inner, surfaceTexture: { pattern: "knurl" } } as unknown as WorkplaneShape;
    const outer = groupedShape([shape({ id: "plate", x: 40, width: 40, size: 40 }), textured]);
    if (!outer) throw new Error("did not group");
    expect(scopedParts(outer)).toHaveLength(2);
  });
});
