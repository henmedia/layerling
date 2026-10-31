import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  hasMatchingPart,
  isObjectListOrder,
  normalizeObjectListQuery,
  shapeMatchesSearch,
  showInObjectList,
  sortObjectList,
  type ObjectListLabels,
} from "@/lib/objectListSearch";
import { hasOwnShapeName } from "@/lib/shapeCatalog";
import type { WorkplaneShape } from "@/types/layerling";

// Only the fields the search reads; the rest of a shape does not matter here.
const shape = (id: string, kind: string, name?: string, groupedShapes?: WorkplaneShape[]) =>
  ({ id, kind, name, groupedShapes }) as unknown as WorkplaneShape;

// Stands in for the panel's labels: the shown name, and "N parts" or the kind for the subtitle.
const labels: ObjectListLabels = (item) => [
  item.name ?? item.kind,
  item.groupedShapes?.length ? `${item.groupedShapes.length} parts` : item.kind,
];

const bolt = shape("bolt", "cylinder", "M3 bolt");
const nut = shape("nut", "hexagon", "Nut");
const innerGroup = shape("inner", "group", "Fasteners", [bolt, nut]);
const outerGroup = shape("outer", "group", "Bracket", [shape("plate", "box", "Plate"), innerGroup]);
const sphere = shape("sphere", "sphere", "Knob");

describe("normalizing the search text", () => {
  it("trims and lower-cases it", () => {
    expect(normalizeObjectListQuery("  M3 Bolt ")).toBe("m3 bolt");
    expect(normalizeObjectListQuery("   ")).toBe("");
  });
});

describe("matching a shape itself", () => {
  it("finds it by name, kind label or internal kind, ignoring case", () => {
    expect(shapeMatchesSearch(bolt, "bolt", labels)).toBe(true);
    expect(shapeMatchesSearch(bolt, "cylinder", labels)).toBe(true);
    expect(shapeMatchesSearch(shape("x", "screwHole", "Mount"), "screwhole", labels)).toBe(true);
    expect(shapeMatchesSearch(bolt, "nut", labels)).toBe(false);
  });

  it("lets everything through with no search", () => {
    expect(shapeMatchesSearch(bolt, "", labels)).toBe(true);
  });

  it("does not count a match inside a group as the group's own", () => {
    expect(shapeMatchesSearch(outerGroup, "bolt", labels)).toBe(false);
  });
});

describe("matching parts inside groups", () => {
  it("finds a direct part", () => {
    expect(hasMatchingPart(outerGroup, "plate", labels)).toBe(true);
  });

  it("finds a part in a group inside a group", () => {
    expect(hasMatchingPart(outerGroup, "bolt", labels)).toBe(true);
    expect(hasMatchingPart(outerGroup, "hexagon", labels)).toBe(true);
    expect(hasMatchingPart(innerGroup, "bolt", labels)).toBe(true);
  });

  it("finds a nested group by its own name", () => {
    expect(hasMatchingPart(outerGroup, "fasteners", labels)).toBe(true);
  });

  it("is false when nothing inside matches, for plain shapes and with no search", () => {
    expect(hasMatchingPart(outerGroup, "knob", labels)).toBe(false);
    expect(hasMatchingPart(bolt, "bolt", labels)).toBe(false);
    expect(hasMatchingPart(outerGroup, "", labels)).toBe(false);
  });
});

describe("which top-level rows stay in the list", () => {
  const visible = (query: string) =>
    [outerGroup, sphere].filter((item) => showInObjectList(item, query, labels)).map((item) => item.id);

  it("keeps a group when a part deep inside matches", () => {
    expect(visible("bolt")).toEqual(["outer"]);
  });

  it("keeps shapes that match themselves", () => {
    expect(visible("knob")).toEqual(["sphere"]);
    expect(visible("bracket")).toEqual(["outer"]);
  });

  it("keeps everything with no search and nothing without a match", () => {
    expect(visible("")).toEqual(["outer", "sphere"]);
    expect(visible("washer")).toEqual([]);
  });
});

describe("sorting the list by name (#1046)", () => {
  const ids = (items: WorkplaneShape[]) => items.map((item) => item.id);
  const byName = (items: WorkplaneShape[]) =>
    ids(sortObjectList(items, "name", hasOwnShapeName, (item) => item.name ?? item.kind, "en"));

  // In the order they were added: two left with the editor's name, the rest renamed.
  const added = [
    shape("box1", "box", "Box"),
    shape("p10", "box", "Part 10"),
    shape("lid", "box", "lid"),
    shape("cyl", "cylinder"),
    shape("p2", "box", "Part 2"),
    shape("base", "box", "Base"),
  ];

  it("puts named shapes first, A to Z with numbers counted, and the rest below as added", () => {
    expect(byName(added)).toEqual(["base", "lid", "p2", "p10", "box1", "cyl"]);
  });

  it("keeps the design's order with \"added\" and leaves the given list alone", () => {
    const sorted = sortObjectList(added, "added", hasOwnShapeName, (item) => item.name ?? item.kind);
    expect(ids(sorted)).toEqual(ids(added));
    byName(added);
    expect(ids(added)).toEqual(["box1", "p10", "lid", "cyl", "p2", "base"]);
  });

  it("keeps the order of equal names", () => {
    expect(byName([shape("a", "box", "Leg"), shape("b", "box", "leg"), shape("c", "box", "Leg")])).toEqual(["a", "b", "c"]);
  });

  it("reads a stored order only when it is one of the two", () => {
    expect(isObjectListOrder("name")).toBe(true);
    expect(isObjectListOrder("added")).toBe(true);
    expect(isObjectListOrder("size")).toBe(false);
    expect(isObjectListOrder(null)).toBe(false);
  });
});

describe("the object list panel", () => {
  const panel = readFileSync(
    fileURLToPath(new URL("../../apps/web/src/components/workplane/ObjectListPanel.tsx", import.meta.url)),
    "utf8",
  );

  it("filters its rows with the search that looks inside groups", () => {
    expect(panel).toContain("showInObjectList(shape, query, searchLabels)");
  });

  it("opens groups whose parts match and shows the nested parts that lead to them", () => {
    expect(panel).toContain("searchExpandedGroups[shape.id] ?? hasMatchingPart(shape)");
    expect(panel).toContain("renderGroupParts(child.groupedShapes, depth + 1, false)");
  });

  it("shows all parts of a group that matches by its own name", () => {
    expect(panel).toContain("renderGroupParts(shape.groupedShapes, 0, !query || shapeMatches(shape))");
  });

  it("sorts its rows and the parts of groups in the chosen order", () => {
    expect(panel).toContain("const listedShapes = sortShapes(filteredShapes)");
    expect(panel).toContain("sortShapes(parts).flatMap(");
  });
});
