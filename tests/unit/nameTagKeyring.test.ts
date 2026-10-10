import manifoldModule, { type CrossSection, type ManifoldToplevel } from "manifold-3d";
import { beforeAll, describe, expect, it } from "vitest";
// @ts-expect-error - the bridge is plain JavaScript without types.
import { tools } from "../../scripts/layerling-mcp-tools.mjs";
import { editorHistoryEntry } from "@/lib/editorHistory";
import { exportLylProject, importLylProject, type LylProjectDocumentV1, type LylProjectExportInput } from "@/lib/lylProject";
import { textLetterSizePatch } from "@/lib/nameTag";
import { textFillComponents, textHasFill } from "@/lib/textFill";
import { loadTextFonts } from "@/lib/textFonts";
import { textGlyphShapes } from "@/lib/textGeometry";
import { DEFAULT_TEXT_LAYERS, layerTextKeyringArgument, textLayerShapes, textLayersOf, type NameTagKeyring, type TextLayer } from "@/lib/textLayers";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";
import { canonicalizeShape } from "@/lib/workplaneShapes";
import type { TextKeyringSide, WorkplaneShape } from "@/types/layerling";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";

// #215: the key ring hole, in the layer code, the MCP action and the .lyl check.
let runtime: ManifoldToplevel;

beforeAll(async () => {
  runtime = await manifoldModule();
  runtime.setup();
  await loadTextFonts();
});

const text = (overrides: Partial<WorkplaneShape> = {}): WorkplaneShape => ({
  id: "t", name: "Text", kind: "text", color: "#ffffff", x: 0, z: 0, elevation: 0, rotation: 0,
  width: 60, depth: 20, height: 1.2, size: 60, text: "Name", font: "Sans", ...overrides,
});
const sized = (shape: WorkplaneShape, size: number) => ({ ...shape, ...textLetterSizePatch(shape, size) });

/** A layer's outline in the world's x/z, as Manifold sees it: the fill path where it has one, else the glyphs. */
function outline(shape: WorkplaneShape, made: CrossSection[]): CrossSection {
  const keep = (section: CrossSection) => {
    made.push(section);
    return section;
  };
  let rings: [number, number][][];
  if (textHasFill(shape)) {
    rings = textFillComponents(runtime, shape)!.flatMap(({ outer, holes }) => [outer, ...holes]).map((ring) => ring.map((point) => [point.x, point.z] as [number, number]));
  } else {
    const glyphs = textGlyphShapes(shape)!;
    rings = glyphs.glyphs.flatMap(({ glyph, map }) => {
      const sampled = glyph.extractPoints(glyphs.curveSegments);
      return [sampled.shape, ...sampled.holes].map((ring) => ring.map((point) => map(point)).map((point) => [point.x, point.z] as [number, number]));
    });
  }
  return keep(keep(new runtime.CrossSection(rings, "EvenOdd")).translate([shape.x, shape.z]));
}

/** The round hole of a layer's outline, measured: the hole ring of about the area of a disc, its middle and width. */
function measuredHole(shape: WorkplaneShape) {
  const rings = textFillComponents(runtime, shape)!.flatMap(({ holes }) => holes);
  const round = rings.map((ring) => {
    const xs = ring.map((point) => point.x);
    const zs = ring.map((point) => point.z);
    return { x: shape.x + (Math.min(...xs) + Math.max(...xs)) / 2, z: shape.z + (Math.min(...zs) + Math.max(...zs)) / 2, width: Math.max(...xs) - Math.min(...xs), depth: Math.max(...zs) - Math.min(...zs) };
  }).filter((hole) => Math.abs(hole.width - hole.depth) < 0.05);
  expect(round).toHaveLength(1);
  return round[0];
}

const disc = (x: number, z: number, radius: number, made: CrossSection[]) => {
  const section = runtime.CrossSection.circle(radius, 96).translate([x, z]);
  made.push(section);
  return section;
};
const covered = (region: CrossSection, part: CrossSection, made: CrossSection[]) => {
  const common = region.intersect(part);
  made.push(common);
  return common.area() / part.area();
};

function boundsOf(section: CrossSection) {
  const { min, max } = section.bounds();
  return { minX: min[0], maxX: max[0], minZ: min[1], maxZ: max[1], midX: (min[0] + max[0]) / 2, midZ: (min[1] + max[1]) / 2 };
}

describe("the key ring hole (#215)", () => {
  it.each(["left", "right", "top"] as TextKeyringSide[])("goes through the bottom layer on the %s, in an ear round it, measured", (side) => {
    const made: CrossSection[] = [];
    const parts = textLayerShapes(sized(text({ x: 7, z: -3 }), 12), DEFAULT_TEXT_LAYERS, [], { side, diameter: 4 });
    const letters = boundsOf(outline(parts[0], made));
    const bottom = outline(parts[2], made);
    const hole = measuredHole(parts[2]);
    expect(hole.width).toBeCloseTo(4, 1);
    // Outside the letters on its side, centred on them the other way.
    if (side === "left") expect(hole.x).toBeLessThan(letters.minX - 2);
    if (side === "right") expect(hole.x).toBeGreaterThan(letters.maxX + 2);
    if (side === "top") expect(hole.z).toBeLessThan(letters.minZ - 2);
    if (side === "top") expect(hole.x).toBeCloseTo(letters.midX, 2);
    else expect(hole.z).toBeCloseTo(letters.midZ, 2);
    // Nothing of the bottom layer inside the hole; all of a ring round it is the ear.
    expect(covered(bottom, disc(hole.x, hole.z, 1.9, made), made)).toBeLessThan(1e-6);
    const ring = disc(hole.x, hole.z, 4.2, made).subtract(disc(hole.x, hole.z, 2.1, made));
    made.push(ring);
    expect(covered(bottom, ring, made)).toBeGreaterThan(0.999);
    // The ear holds on to the plate: one piece.
    expect(textFillComponents(runtime, parts[2])).toHaveLength(1);
    // The layers above do not reach that far and stay as they were.
    expect(parts[0].textKeyring).toBeUndefined();
    expect(parts[1].textKeyring).toBeUndefined();
    made.forEach((section) => section.delete());
  });

  it("goes through every layer it touches", () => {
    const made: CrossSection[] = [];
    // A middle layer wider than the plate reaches the hole: it gets the hole too, but no ear.
    const layers: TextLayer[] = [{ grow: 0, height: 1, color: "#ffffff" }, { grow: 9, height: 1, color: "#d41721" }, { grow: 3, height: 2, color: "#2b2b2b", silhouette: true }];
    const parts = textLayerShapes(sized(text(), 12), layers, [], { side: "right", diameter: 4 });
    expect(parts[1].textKeyring).toMatchObject({ side: "right", diameter: 4 });
    expect(parts[1].textKeyring?.ear).toBeUndefined();
    const hole = measuredHole(parts[2]);
    expect(covered(outline(parts[1], made), disc(hole.x, hole.z, 1.9, made), made)).toBeLessThan(1e-6);
    made.forEach((section) => section.delete());
  });

  it("moves with a longer text and a bigger letter size", () => {
    const made: CrossSection[] = [];
    const measure = (words: string, size: number) => {
      const parts = textLayerShapes(sized(text({ text: words }), size), DEFAULT_TEXT_LAYERS, [], { side: "left", diameter: 4 });
      const letters = boundsOf(outline(parts[0], made));
      return { letters, hole: measuredHole(parts[2]) };
    };
    const short = measure("Name", 12);
    const long = measure("Alexandra", 12);
    const big = measure("Name", 20);
    // Further out with the longer word and the bigger letters ...
    expect(long.hole.x).toBeLessThan(short.hole.x - 10);
    expect(big.hole.x).toBeLessThan(short.hole.x - 5);
    // ... always the same distance beyond the letters (the plate's 3 mm and the ear's 4.5 mm) and in their middle.
    for (const { letters, hole } of [short, long, big]) {
      expect(letters.minX - hole.x).toBeCloseTo(7.5, 1);
      expect(hole.z).toBeCloseTo(letters.midZ, 2);
    }
    made.forEach((section) => section.delete());
  });

  it("is read back from the stack and built again the same", () => {
    const parts = textLayerShapes(sized(text({ x: 4, z: 9, rotation: 25 }), 12), DEFAULT_TEXT_LAYERS, [], { side: "top", diameter: 5 });
    const read = textLayersOf([parts[1], parts[2], parts[0]])!;
    expect(read.keyring).toEqual({ side: "top", diameter: 5 });
    expect(textLayerShapes(read.source, read.layers, read.ids, read.keyring)).toEqual(parts);
  });
});

describe("layerling_layer_text's new arguments (#215)", () => {
  it("takes a key ring hole, keeps it when left out, refuses bad values", () => {
    expect(layerTextKeyringArgument(undefined)).toBeUndefined();
    expect(layerTextKeyringArgument(false)).toEqual({ keyring: null });
    expect(layerTextKeyringArgument(null)).toEqual({ keyring: null });
    expect(layerTextKeyringArgument(true)).toEqual({ keyring: { side: "left", diameter: 4 } });
    expect(layerTextKeyringArgument({ side: "top", diameter: 5.5 })).toEqual({ keyring: { side: "top", diameter: 5.5 } });
    expect(layerTextKeyringArgument({})).toEqual({ keyring: { side: "left", diameter: 4 } });
    expect(layerTextKeyringArgument({ side: "bottom" })).toEqual({ error: "keyring.side must be left, right or top" });
    expect(layerTextKeyringArgument({ diameter: 0.5 })).toEqual({ error: "keyring.diameter must be 1 to 20 mm" });
    expect(layerTextKeyringArgument({ diameter: 25 })).toEqual({ error: "keyring.diameter must be 1 to 20 mm" });
    expect(layerTextKeyringArgument({ diameter: "4" })).toHaveProperty("error");
    expect(layerTextKeyringArgument("left")).toHaveProperty("error");
  });

  it("are in the tool's schema", () => {
    const tool = (tools as { name: string; inputSchema: { properties: Record<string, { items?: { properties: Record<string, { enum?: string[] }> } }> } }[]).find((entry) => entry.name === "layerling_layer_text")!;
    expect(tool.inputSchema.properties.keyring).toBeDefined();
    // Everything it took before is still there.
    expect(Object.keys(tool.inputSchema.properties)).toEqual(expect.arrayContaining(["id", "text", "font", "layers", "names", "gap"]));
  });
});

describe(".lyl: the key ring hole (#215)", () => {
  function input(shapes: WorkplaneShape[]): LylProjectExportInput {
    return {
      projectId: "p", projectName: "Name tags", createdAt: 1_700_000_000_000, modifiedAt: 1_700_000_100_000,
      shapes, history: [editorHistoryEntry(shapes, [])], historyIndex: 0, assets: [],
      workspace: DEFAULT_WORKPLANE_WORKSPACE, snapGrid: DEFAULT_SNAP_GRID, placementElevation: 0,
    };
  }
  function mutate(bytes: Uint8Array, change: (definition: Record<string, unknown>) => void) {
    const files = unzipSync(bytes);
    const document = JSON.parse(strFromU8(files["project.json"])) as LylProjectDocumentV1;
    const node = document.states[0].nodes.find((entry) => (entry.definition as Record<string, unknown>).textKeyring !== undefined)!;
    change(node.definition as Record<string, unknown>);
    files["project.json"] = strToU8(JSON.stringify(document));
    return zipSync(files);
  }
  const layers: TextLayer[] = [...DEFAULT_TEXT_LAYERS];
  const keyring: NameTagKeyring = { side: "right", diameter: 4 };

  it("keeps them through saving and opening", async () => {
    const parts = textLayerShapes(sized(text(), 12), layers, [], keyring);
    const restored = await importLylProject(await exportLylProject(input(parts)));
    expect(restored.shapes).toEqual(parts.map(canonicalizeShape));
    const read = textLayersOf(restored.shapes)!;
    expect(read.keyring).toEqual(keyring);
  });

  it("opens a file without them as before", async () => {
    const parts = textLayerShapes(sized(text(), 12), DEFAULT_TEXT_LAYERS);
    const restored = await importLylProject(await exportLylProject(input(parts)));
    expect(restored.shapes).toEqual(parts.map(canonicalizeShape));
    expect(textLayersOf(restored.shapes)!.keyring).toBeNull();
  });

  it("refuses an unknown side and a diameter out of range", async () => {
    const saved = await exportLylProject(input(textLayerShapes(sized(text(), 12), layers, [], keyring)));
    await expect(importLylProject(mutate(saved, (definition) => { (definition.textKeyring as Record<string, unknown>).side = "bottom"; }))).rejects.toThrow("textKeyring must be a side");
    await expect(importLylProject(mutate(saved, (definition) => { (definition.textKeyring as Record<string, unknown>).diameter = 30; }))).rejects.toThrow("textKeyring must be a side");
    await expect(importLylProject(mutate(saved, (definition) => { (definition.textKeyring as Record<string, unknown>).diameter = 0.2; }))).rejects.toThrow("textKeyring must be a side");
  });
});
