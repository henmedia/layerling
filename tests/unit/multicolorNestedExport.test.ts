import { describe, expect, it } from "vitest";
import { exportFaceColors, multicolorExportSolids } from "@/lib/editorBooleans";
import { meshForShape } from "@/lib/editorMeshCore";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * An Icon tag (a bundle of its layers) grouped with a QR code and set to Multicolor (Discussion #1398): the view drew
 * every layer in its colour, but 3MF and OBJ gave the whole tag the tag's one colour, because the export coloured each
 * part of the group by the part's own colour. A part that shows its own parts' colours now gives those parts.
 */

const WHITE = "#ffffff";
const RED = "#d41721";
const YELLOW = "#ffd400";

function box(id: string, color: string, x: number, fields: Record<string, unknown> = {}) {
  return { id, name: id, kind: "box", color, x, z: 0, elevation: 0, size: 20, width: 20, depth: 20, height: 10, rotation: 0, ...fields } as unknown as WorkplaneShape;
}

/** A tag of two layers, white on red, as a bundle, beside a yellow code, in a group showing its parts' colours. */
function taggedGroup(bundleFields: Record<string, unknown> = {}) {
  const tag = {
    ...box("tag", WHITE, 0, { height: 15 }),
    kind: "mesh",
    groupOperation: "bundle",
    groupedShapes: [box("top", WHITE, 0, { elevation: 10, height: 5 }), box("base", RED, 0)],
    ...bundleFields,
  } as WorkplaneShape;
  const code = box("code", YELLOW, 30, { width: 10, depth: 10, size: 10, height: 15 });
  return { ...box("group", WHITE, 12.5, { width: 45, size: 45, height: 15 }), kind: "mesh", groupedShapes: [tag, code], multicolor: true } as WorkplaneShape;
}

/** The colour of every face of the group's mesh whose middle lies over the tag between two heights above its bottom. */
function tagFaceColors(group: WorkplaneShape, fromY: number, toY: number) {
  const mesh = meshForShape(group);
  const solids = multicolorExportSolids(group)!;
  const colors = exportFaceColors(mesh, solids, group.color);
  solids.forEach((solid) => solid.probe.geometry.dispose());
  const minX = Math.min(...mesh.vertices.map(([x]) => x));
  const minY = Math.min(...mesh.vertices.map(([, y]) => y));
  const seen = new Set<string>();
  mesh.faces.forEach((face, index) => {
    const [x, y] = face.reduce(([sx, sy], point) => [sx + mesh.vertices[point][0] / 3, sy + mesh.vertices[point][1] / 3], [0, 0]);
    if (x < minX + 20 && y > minY + fromY + 1e-6 && y < minY + toY - 1e-6) seen.add(colors[index]);
  });
  return [...seen].sort();
}

describe("an Icon tag in a Multicolor group keeps its layers' colours in 3MF and OBJ (#1398)", () => {
  it("gives every layer of the tag its own colour, beside the code's", () => {
    const group = taggedGroup();
    const solids = multicolorExportSolids(group);
    expect(solids?.map((solid) => solid.color).sort()).toEqual([RED, YELLOW, WHITE].sort());
    solids?.forEach((solid) => solid.probe.geometry.dispose());
    expect(tagFaceColors(group, 0, 10)).toEqual([RED]);
    expect(tagFaceColors(group, 10, 15)).toEqual([WHITE]);
  });

  it("gives a tag shown in one colour that colour, as the view draws it", () => {
    const group = taggedGroup({ multicolor: false, color: "#00aa00" });
    const solids = multicolorExportSolids(group);
    expect(solids?.map((solid) => solid.color).sort()).toEqual(["#00aa00", YELLOW].sort());
    solids?.forEach((solid) => solid.probe.geometry.dispose());
    expect(tagFaceColors(group, 0, 15)).toEqual(["#00aa00"]);
  });

  it("leaves a group whose parts all show one colour, down through the tag, without colours", () => {
    const tag = taggedGroup().groupedShapes![0];
    const group = taggedGroup();
    const oneColour = { ...group, groupedShapes: [{ ...tag, groupedShapes: tag.groupedShapes!.map((layer) => ({ ...layer, color: YELLOW })) }, group.groupedShapes![1]] } as WorkplaneShape;
    expect(multicolorExportSolids(oneColour)).toBeNull();
  });
});
