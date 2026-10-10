import manifoldModule, { type ManifoldToplevel } from "manifold-3d";
import { beforeAll, describe, expect, it } from "vitest";
import { textLetterSizePatch } from "@/lib/nameTag";
import { textFillComponents } from "@/lib/textFill";
import { loadTextFonts } from "@/lib/textFonts";
import { textLayerShapes, type NameTagKeyring } from "@/lib/textLayers";
import type { WorkplaneShape } from "@/types/layerling";

/**
 * #215: a silhouette has no holes at all. Dropping each letter's own counters was not enough:
 * once the wider outlines of neighbouring letters touch they close a pocket between them, and
 * "Arany" in Sans at letter size 11, 1.5 mm wider, kept one between n and y.
 */
let runtime: ManifoldToplevel;

beforeAll(async () => {
  runtime = await manifoldModule();
  runtime.setup();
  await loadTextFonts();
});

/** The layer 1.5 mm wider than the letters, as the name tag builds it, with or without "No holes". */
function wider(words: string, silhouette: boolean, keyring: NameTagKeyring | null = null) {
  const text = { id: "t", name: "Text", kind: "text", color: "#ffffff", x: 0, z: 0, elevation: 0, rotation: 0, width: 60, depth: 20, size: 60, height: 1, text: words, font: "Sans" } as WorkplaneShape;
  const source = { ...text, ...textLetterSizePatch(text, 11) };
  const parts = textLayerShapes(source, [{ grow: 0, height: 1, color: "#ffffff" }, { grow: 1.5, height: 1, color: "#d41721", ...(silhouette ? { silhouette: true } : {}) }], [], keyring);
  return parts[1];
}

const holesOf = (shape: WorkplaneShape) => textFillComponents(runtime, shape)!.flatMap(({ holes }) => holes).map((hole) => {
  const xs = hole.map((point) => point.x);
  const zs = hole.map((point) => point.z);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs) };
});

describe("the silhouette of a wider text (#215)", () => {
  it("Arany, Sans, letter size 11, 1.5 mm wider: no hole with the silhouette, the pocket between n and y without", () => {
    expect(holesOf(wider("Arany", true))).toEqual([]);
    const holes = holesOf(wider("Arany", false));
    expect(holes).toHaveLength(1);
    // Where it was measured: x 13.73 to 14.98, z 0.5 to 4 (the word reaches from -23.19 to 23.19).
    expect(holes[0].minX).toBeCloseTo(13.75, 0);
    expect(holes[0].maxX).toBeCloseTo(15, 0);
    expect(holes[0].minZ).toBeCloseTo(0.5, 0);
    expect(holes[0].maxZ).toBeCloseTo(4, 0);
  });

  it("Kitty: the four pockets between its letters close with the silhouette, and stay without", () => {
    expect(holesOf(wider("Kitty", true))).toEqual([]);
    expect(holesOf(wider("Kitty", false))).toHaveLength(4);
  });

  it("a key ring on a silhouette layer keeps exactly its one hole", () => {
    // A single wider layer is the bottom one: it carries the tab and the hole.
    const layer = wider("Arany", true, { side: "left", diameter: 1.85 });
    expect(layer.textKeyring?.ear).toBe(true);
    const holes = holesOf(layer);
    expect(holes).toHaveLength(1);
    expect(holes[0].maxX - holes[0].minX).toBeCloseTo(1.85, 2);
    expect(holes[0].maxZ - holes[0].minZ).toBeCloseTo(1.85, 2);
  });
});
