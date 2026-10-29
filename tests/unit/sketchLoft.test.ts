import { describe, expect, it } from "vitest";
import { canSketchLoft, sketchLoftPair } from "@/lib/sketchLoft";
import { colorForParts, canToggleGroupColors, groupShowsPartColors } from "@/lib/groupColors";
import { guideSectionForShape } from "@/lib/guideLinks";
import { restoreGroupedChildrenForEdges } from "@/lib/editorBooleans";
import type { WorkplaneShape } from "@/types/layerling";

function sketch(id: string, elevation: number, height = 2, extra: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return {
    id,
    name: id,
    kind: "mesh",
    color: "#888888",
    x: 0,
    z: 0,
    elevation,
    size: 10,
    width: 10,
    depth: 10,
    height,
    rotation: 0,
    sketchProfile: { points: [], segments: [] },
    sketchOperation: "extrude",
    ...extra,
  } as WorkplaneShape;
}

describe("loft between two sketches", () => {
  it("takes two sketch bodies, the lower one first, whichever way they were selected", () => {
    const pair = sketchLoftPair([sketch("top", 30), sketch("bottom", 0)]);
    expect(pair.ok && [pair.lower.id, pair.upper.id]).toEqual(["bottom", "top"]);
    // Standing on the same height, the one reaching higher is the top.
    const level = sketchLoftPair([sketch("tall", 0, 20), sketch("flat", 0, 2)]);
    expect(level.ok && [level.lower.id, level.upper.id]).toEqual(["flat", "tall"]);
  });

  it("refuses anything but two sketch bodies lying flat", () => {
    expect(canSketchLoft([sketch("a", 0)])).toBe(false);
    expect(canSketchLoft([sketch("a", 0), sketch("b", 10), sketch("c", 20)])).toBe(false);
    expect(canSketchLoft([sketch("a", 0), { ...sketch("b", 10), sketchProfile: undefined }])).toBe(false);
    expect(canSketchLoft([sketch("a", 0), sketch("b", 10, 2, { sketchOperation: "revolve" })])).toBe(false);
    expect(canSketchLoft([sketch("a", 0), sketch("b", 10, 2, { hole: true })])).toBe(false);
    const tipped = sketchLoftPair([sketch("a", 0), sketch("b", 10, 2, { rotationX: 90 })]);
    expect(tipped.ok).toBe(false);
    // Turned about the vertical is fine.
    expect(canSketchLoft([sketch("a", 0), sketch("b", 10, 2, { rotation: 45 })])).toBe(true);
  });

  it("treats the loft as one body, as a hull: one colour, the hull's guide section, not opened for the edge tool", () => {
    const loft = { ...sketch("loft", 0, 30), sketchProfile: undefined, groupOperation: "loft", groupedShapes: [sketch("a", 0), sketch("b", 28)] } as WorkplaneShape;
    expect(groupShowsPartColors(loft)).toBe(false);
    expect(canToggleGroupColors(loft)).toBe(false);
    expect(colorForParts(loft, "#ff0000")).toBe("#ff0000");
    expect(guideSectionForShape(loft)).toBe("intersection");
    expect(restoreGroupedChildrenForEdges(loft)).toEqual([{ shape: loft, scope: [] }]);
  });
});
