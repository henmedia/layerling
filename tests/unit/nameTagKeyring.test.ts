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
import { DEFAULT_TEXT_LAYERS, layerTextKeyringArgument, layerTextLayersError, normalizeTextLayers, textLayerShapes, textLayersOf, type NameTagKeyring, type TextLayer } from "@/lib/textLayers";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";
import { canonicalizeShape } from "@/lib/workplaneShapes";
import type { TextKeyringSide, WorkplaneShape } from "@/types/layerling";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";

// #215: the key ring hole and the corners of each layer, in the layer code, the MCP action and the .lyl check.
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
    // A middle layer wider than the plate reaches the hole (3 + 2.41 × 4 - 2 = 10.64 mm out): it gets the hole too, but no tab.
    const layers: TextLayer[] = [{ grow: 0, height: 1, color: "#ffffff" }, { grow: 12, height: 1, color: "#d41721" }, { grow: 3, height: 2, color: "#2b2b2b", silhouette: true }];
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
    // ... always the same distance beyond the letters (the plate's 3 mm and 2.41 hole diameters) and in their middle.
    for (const { letters, hole } of [short, long, big]) {
      expect(letters.minX - hole.x).toBeCloseTo(3 + 2.41 * 4, 1);
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

describe("the key ring tab, in the proportions of the measured one (#215)", () => {
  // plazmabokor's printed tab: 4.34 mm wide round a 1.85 mm hole, the hole 4.45 mm beyond the plate.
  const cases = (["left", "right", "top"] as TextKeyringSide[]).flatMap((side) => [1.85, 4].map((diameter) => [side, diameter] as const));
  it.each(cases)("%s, hole %s mm: width, distance, hole, half circle and parallel sides, measured", (side, diameter) => {
    const made: CrossSection[] = [];
    const source = sized(text(), 12);
    const plain = textLayerShapes(source, DEFAULT_TEXT_LAYERS);
    const parts = textLayerShapes(source, DEFAULT_TEXT_LAYERS, [], { side, diameter });
    // Along the tab (s, outwards) and across it (v), in the world.
    const along = (x: number, z: number) => (side === "right" ? x : side === "left" ? -x : -z);
    const across = (x: number, z: number) => (side === "top" ? x : z);
    const plate = boundsOf(outline(plain[2], made));
    const edge = side === "right" ? plate.maxX : side === "left" ? -plate.minX : -plate.minZ;
    const bottom = outline(parts[2], made);
    const hole = measuredHole(parts[2]);
    const holeAlong = along(hole.x, hole.z);
    const holeAcross = across(hole.x, hole.z);
    // The hole: its radius, and 2.41 diameters beyond the plate's edge.
    expect(hole.width / 2).toBeCloseTo(diameter / 2, 2);
    expect(holeAlong - edge).toBeCloseTo(2.41 * diameter, 2);
    // Straight, parallel sides 2.35 diameters apart, centred on the hole, wherever it is cut between plate and hole.
    for (const share of [0.25, 0.5, 0.75]) {
      const at = edge + share * (holeAlong - edge);
      const cut = side === "top" ? runtime.CrossSection.square([400, 0.02]).translate([-200, -at - 0.01]) : runtime.CrossSection.square([0.02, 400]).translate([side === "right" ? at - 0.01 : -at - 0.01, -200]);
      made.push(cut);
      const slice = bottom.intersect(cut);
      made.push(slice);
      const { min, max } = slice.bounds();
      const low = side === "top" ? min[0] : min[1];
      const high = side === "top" ? max[0] : max[1];
      expect(high - low).toBeCloseTo(2.35 * diameter, 2);
      expect(low - holeAcross).toBeCloseTo(-1.175 * diameter, 2);
      expect(high - holeAcross).toBeCloseTo(1.175 * diameter, 2);
    }
    // Beyond the hole's middle the outline is a half circle round it, 1.175 diameters out.
    const tip = textFillComponents(runtime, parts[2])!.flatMap(({ outer }) => outer)
      .map((point) => ({ x: point.x + parts[2].x, z: point.z + parts[2].z }))
      .filter((point) => along(point.x, point.z) > holeAlong + 1e-3);
    expect(tip.length).toBeGreaterThan(10);
    tip.forEach((point) => expect(Math.hypot(point.x - hole.x, point.z - hole.z)).toBeCloseTo(1.175 * diameter, 3));
    // Nothing reaches further than the half circle, and the tab is one piece with the plate.
    const reach = boundsOf(bottom);
    const far = side === "right" ? reach.maxX : side === "left" ? -reach.minX : -reach.minZ;
    expect(far - holeAlong).toBeCloseTo(1.175 * diameter, 2);
    expect(textFillComponents(runtime, parts[2])).toHaveLength(1);
    made.forEach((section) => section.delete());
  });
});

describe("the corners of each layer (#215)", () => {
  const plate = (join?: TextLayer["join"]): TextLayer[] => [{ grow: 0, height: 1, color: "#ffffff" }, { grow: 3, height: 2, color: "#2b2b2b", ...(join ? { join } : {}) }];

  it("round, bevel and sharp give different outlines, measured at a corner of the letters", () => {
    const made: CrossSection[] = [];
    const corner = (join?: TextLayer["join"]) => {
      const parts = textLayerShapes(sized(text({ text: "H" }), 12), plate(join));
      const wide = outline(parts[1], made);
      const box = boundsOf(wide);
      // A 0.4 mm square right in the corner of the box the 3 mm widening reaches.
      const square = runtime.CrossSection.square([0.4, 0.4]).translate([box.minX, box.minZ]);
      made.push(square);
      return { area: wide.area(), inCorner: covered(wide, square, made), stroke: parts[1].textStroke };
    };
    const round = corner();
    const bevel = corner("bevel");
    const sharp = corner("miter");
    expect(round.stroke?.join).toBe("round");
    expect(bevel.stroke?.join).toBe("bevel");
    expect(sharp.stroke?.join).toBe("miter");
    // Only the sharp corner reaches into the corner of the box; the round one passes it by 3 mm × (√2 - 1).
    expect(sharp.inCorner).toBeGreaterThan(0.99);
    expect(round.inCorner).toBeLessThan(1e-6);
    expect(bevel.inCorner).toBeLessThan(1e-6);
    // The bevel is cut square a full widening off the corner (Manifold's Square join), so it keeps more
    // than the round corner and less than the sharp one: the areas in that order.
    expect(sharp.area).toBeGreaterThan(bevel.area + 1);
    expect(bevel.area).toBeGreaterThan(round.area + 1);
    made.forEach((section) => section.delete());
  });

  it("old layers without a corner come out exactly as before: round", () => {
    const parts = textLayerShapes(sized(text(), 12), DEFAULT_TEXT_LAYERS);
    expect(parts[0].textStroke).toBeUndefined();
    expect(parts[1].textStroke).toEqual({ width: 1.5, align: "grow", join: "round", cap: "flat" });
    expect(parts[2].textStroke).toEqual({ width: 3, align: "grow", join: "round", cap: "flat" });
    parts.forEach((part) => expect(part.textKeyring).toBeUndefined());
    // Read back, a round layer stays without the field, so a stack saved before reads as it did.
    expect(textLayersOf(parts)!.layers).toEqual(DEFAULT_TEXT_LAYERS);
    expect(normalizeTextLayers([{ grow: 2, height: 1, color: "#ffffff", join: "round" }])).toEqual([{ grow: 2, height: 1, color: "#ffffff" }]);
    expect(textLayersOf(textLayerShapes(sized(text(), 12), plate("bevel")))!.layers[1].join).toBe("bevel");
  });
});

describe("layerling_layer_text's new arguments (#215)", () => {
  it("takes a key ring hole, keeps it when left out, refuses bad values", () => {
    expect(layerTextKeyringArgument(undefined)).toBeUndefined();
    expect(layerTextKeyringArgument(false)).toEqual({ keyring: null });
    expect(layerTextKeyringArgument(null)).toEqual({ keyring: null });
    expect(layerTextKeyringArgument(true)).toEqual({ keyring: { side: "left", diameter: 1.85 } });
    expect(layerTextKeyringArgument({ side: "top", diameter: 5.5 })).toEqual({ keyring: { side: "top", diameter: 5.5 } });
    expect(layerTextKeyringArgument({})).toEqual({ keyring: { side: "left", diameter: 1.85 } });
    expect(layerTextKeyringArgument({ side: "bottom" })).toEqual({ error: "keyring.side must be left, right or top" });
    expect(layerTextKeyringArgument({ diameter: 0.5 })).toEqual({ error: "keyring.diameter must be 1 to 20 mm" });
    expect(layerTextKeyringArgument({ diameter: 25 })).toEqual({ error: "keyring.diameter must be 1 to 20 mm" });
    expect(layerTextKeyringArgument({ diameter: "4" })).toHaveProperty("error");
    expect(layerTextKeyringArgument("left")).toHaveProperty("error");
  });

  it("takes a corner per layer, old layer lists the same as before, refuses an unknown corner", () => {
    const old = [{ grow: 0, height: 1.2, color: "#ffffff" }, { grow: 1.5, height: 1.2, color: "#d41721" }, { grow: 3, height: 2, color: "#2b2b2b", silhouette: true }];
    expect(layerTextLayersError(old)).toBeNull();
    expect(normalizeTextLayers(old)).toEqual(DEFAULT_TEXT_LAYERS);
    expect(normalizeTextLayers([{ grow: 0, height: 1, color: "#ffffff" }, { grow: 2, height: 2, color: "#d41721", join: "miter" }])![1].join).toBe("miter");
    expect(layerTextLayersError([{ grow: 0 }, { grow: 2, join: "pointy" }])).toBe("layers[1].join must be round, bevel or miter");
    expect(layerTextLayersError(undefined)).toBeNull();
  });

  it("are in the tool's schema", () => {
    const tool = (tools as { name: string; inputSchema: { properties: Record<string, { items?: { properties: Record<string, { enum?: string[] }> } }> } }[]).find((entry) => entry.name === "layerling_layer_text")!;
    expect(tool.inputSchema.properties.keyring).toBeDefined();
    expect(tool.inputSchema.properties.layers.items!.properties.join.enum).toEqual(["round", "bevel", "miter"]);
    // Everything it took before is still there.
    expect(Object.keys(tool.inputSchema.properties)).toEqual(expect.arrayContaining(["id", "text", "font", "layers", "names", "gap"]));
  });
});

describe(".lyl: the key ring hole and the corners (#215)", () => {
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
  const layers: TextLayer[] = [{ grow: 0, height: 1.2, color: "#ffffff" }, { grow: 1.5, height: 1.2, color: "#d41721", join: "bevel" }, { grow: 3, height: 2, color: "#2b2b2b", silhouette: true, join: "miter" }];
  const keyring: NameTagKeyring = { side: "right", diameter: 4 };

  it("keeps them through saving and opening", async () => {
    const parts = textLayerShapes(sized(text(), 12), layers, [], keyring);
    const restored = await importLylProject(await exportLylProject(input(parts)));
    expect(restored.shapes).toEqual(parts.map(canonicalizeShape));
    const read = textLayersOf(restored.shapes)!;
    expect(read.keyring).toEqual(keyring);
    expect(read.layers.map((layer) => layer.join)).toEqual([undefined, "bevel", "miter"]);
  });

  it("opens a file without them as before", async () => {
    const parts = textLayerShapes(sized(text(), 12), DEFAULT_TEXT_LAYERS);
    const restored = await importLylProject(await exportLylProject(input(parts)));
    expect(restored.shapes).toEqual(parts.map(canonicalizeShape));
    expect(textLayersOf(restored.shapes)!.keyring).toBeNull();
  });

  it("refuses an unknown side, an unknown corner and a diameter out of range", async () => {
    const saved = await exportLylProject(input(textLayerShapes(sized(text(), 12), layers, [], keyring)));
    await expect(importLylProject(mutate(saved, (definition) => { (definition.textKeyring as Record<string, unknown>).side = "bottom"; }))).rejects.toThrow("textKeyring must be a side");
    await expect(importLylProject(mutate(saved, (definition) => { (definition.textKeyring as Record<string, unknown>).diameter = 30; }))).rejects.toThrow("textKeyring must be a side");
    await expect(importLylProject(mutate(saved, (definition) => { (definition.textKeyring as Record<string, unknown>).diameter = 0.2; }))).rejects.toThrow("textKeyring must be a side");
    await expect(importLylProject(mutate(saved, (definition) => { (definition.textStroke as Record<string, unknown>).join = "pointy"; }))).rejects.toThrow("textStroke.join must be miter, round or bevel");
  });
});
