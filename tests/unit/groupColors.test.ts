import { describe, expect, it } from "vitest";
import { canToggleGroupColors, colorForParts, groupDisplayMergeable, groupShowsPartColors } from "@/lib/groupColors";
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

const parts = [shape({ id: "a" }), shape({ id: "b", color: "#2f7fd8" })];
const cutMesh: WorkplaneShape["importedMesh"] = {
  positions: [0, 0, 0, 1, 0, 0, 0, 1, 0],
  baseWidth: 1,
  baseDepth: 1,
  baseHeight: 1,
  triangleCount: 1,
  sourceFormat: "json",
};

describe("groupShowsPartColors", () => {
  it("is off for a plain shape", () => {
    expect(groupShowsPartColors(shape())).toBe(false);
  });

  it("keeps what a group showed before the switch existed", () => {
    expect(groupShowsPartColors(shape({ kind: "mesh", groupedShapes: parts }))).toBe(true);
    expect(groupShowsPartColors(shape({ kind: "mesh", groupedShapes: parts, importedMesh: cutMesh }))).toBe(false);
  });

  it("follows the switch once it is set", () => {
    expect(groupShowsPartColors(shape({ kind: "mesh", groupedShapes: parts, multicolor: false }))).toBe(false);
    expect(groupShowsPartColors(shape({ kind: "mesh", groupedShapes: parts, importedMesh: cutMesh, multicolor: true }))).toBe(true);
  });

  it("shows a bundle in its parts' colours until Multicolor is switched off", () => {
    expect(groupShowsPartColors(shape({ kind: "mesh", groupedShapes: parts, groupOperation: "bundle" }))).toBe(true);
    expect(groupShowsPartColors(shape({ kind: "mesh", groupedShapes: parts, groupOperation: "bundle", multicolor: true }))).toBe(true);
    expect(groupShowsPartColors(shape({ kind: "mesh", groupedShapes: parts, groupOperation: "bundle", multicolor: false }))).toBe(false);
  });
});

describe("canToggleGroupColors", () => {
  it("offers the switch on groups and bundles, not on holes or hulls", () => {
    expect(canToggleGroupColors(shape())).toBe(false);
    expect(canToggleGroupColors(shape({ kind: "mesh", groupedShapes: parts }))).toBe(true);
    expect(canToggleGroupColors(shape({ kind: "mesh", groupedShapes: parts, groupOperation: "bundle" }))).toBe(true);
    expect(canToggleGroupColors(shape({ kind: "mesh", groupedShapes: parts, groupOperation: "hull" }))).toBe(false);
    expect(canToggleGroupColors(shape({ kind: "mesh", groupedShapes: parts, hole: true }))).toBe(false);
  });
});

describe("colorForParts", () => {
  it("keeps the parts of a group or bundle in their own colours, so Multicolor can bring them back", () => {
    expect(colorForParts(shape({ kind: "mesh", groupedShapes: parts }), "#800080")).toBeUndefined();
    expect(colorForParts(shape({ kind: "mesh", groupedShapes: parts, groupOperation: "bundle" }), "#800080")).toBeUndefined();
  });

  it("hands the colour down for a single shape and for a hull", () => {
    expect(colorForParts(shape(), "#800080")).toBe("#800080");
    expect(colorForParts(shape({ kind: "mesh", groupedShapes: parts, groupOperation: "hull" }), "#800080")).toBe("#800080");
  });
});

describe("groupDisplayMergeable", () => {
  it("merges a plain group of plain solids", () => {
    expect(groupDisplayMergeable(shape({ kind: "mesh", groupedShapes: parts }))).toBe(true);
    expect(groupDisplayMergeable(shape({ kind: "mesh", groupedShapes: parts, groupOperation: "group" }))).toBe(true);
  });

  it("leaves bundles, hulls, cut groups, holes and nested groups as their parts", () => {
    expect(groupDisplayMergeable(shape({ kind: "mesh", groupedShapes: parts, groupOperation: "bundle" }))).toBe(false);
    expect(groupDisplayMergeable(shape({ kind: "mesh", groupedShapes: parts, groupOperation: "hull" }))).toBe(false);
    expect(groupDisplayMergeable(shape({ kind: "mesh", groupedShapes: parts, importedMesh: cutMesh }))).toBe(false);
    expect(groupDisplayMergeable(shape({ kind: "mesh", groupedShapes: [parts[0], { ...parts[1], hole: true }] }))).toBe(false);
    expect(groupDisplayMergeable(shape({ kind: "mesh", groupedShapes: [parts[0], shape({ id: "c", kind: "mesh", groupedShapes: parts })] }))).toBe(false);
  });

  it("leaves a tapered group as its parts, and its colours as they were (#1029)", () => {
    const tapered = shape({ kind: "mesh", groupedShapes: parts, taperTopWidth: 10 } as Partial<WorkplaneShape>);
    expect(groupDisplayMergeable(tapered)).toBe(false);
    expect(groupShowsPartColors(tapered)).toBe(true);
  });
});
