import { describe, expect, it } from "vitest";
import { editorHistoryEntry } from "@/lib/editorHistory";
import { meshForShape } from "@/lib/editorMeshCore";
import { mcpShapeSummary } from "@/lib/editorMcpSummary";
import { guideChapterForShape, guideHref, guideSectionForShape } from "@/lib/guideLinks";
import { exportLylProject, importLylProject } from "@/lib/lylProject";
import { MCP_SHAPE_SETTING_KEYS } from "@/lib/mcpShapeSettings";
import { DEFAULT_PATTIES, DEFAULT_PATTIES_DEPTH, DEFAULT_PATTIES_HEIGHT, DEFAULT_PATTIES_WIDTH, PATTIES_PATTERNS, normalizePatties } from "@/lib/pattiesPattern";
import { libraryShapeAssets, makeShapeFromAsset, sceneShape, shapeAssetLabel, shapeAssetMenuLabel, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { shapeLibrarySections } from "@/lib/shapeLibrarySections";
import { canonicalizeShape, shapeSupportsTaper, workplaneShapesEqual } from "@/lib/workplaneShapes";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE, normalizeShapeCustomizations } from "@/lib/workplaneSettings";
import { creatableShapeKinds, shapeSettingSchema } from "../../scripts/layerling-mcp-tools.mjs";
import type { WorkplaneShape } from "@/types/layerling";

const asset = toolbarShapeAssets.find((entry) => entry.kind === "patties")!;

function plate(patties: WorkplaneShape["patties"] = undefined, change: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return canonicalizeShape({ ...makeShapeFromAsset(asset, { x: 0, z: 0 }, patties ? { patties } : {}), id: "plate", ...change });
}

describe("Patties: a shape of the library", () => {
  it("is in the library, among the decorative shapes, under a name that says what it is for", () => {
    expect(asset).toBeDefined();
    expect(libraryShapeAssets.some((entry) => entry.id === "patties")).toBe(true);
    const section = shapeLibrarySections(libraryShapeAssets).find((entry) => entry.shapes.some((shape) => shape.id === "patties"));
    expect(section?.id).toBe("decorative");
    expect(shapeAssetLabel(asset)).toBe("Patties");
    expect(shapeAssetMenuLabel(asset).split("\n")).toEqual(["Patties", "Pattern plate", "Stencil"]);
  });

  it("starts as a stencil of 80 by 80 mm with every setting set", () => {
    const shape = plate();
    expect(shape.kind).toBe("patties");
    expect([shape.width, shape.depth, shape.height]).toEqual([DEFAULT_PATTIES_WIDTH, DEFAULT_PATTIES_DEPTH, DEFAULT_PATTIES_HEIGHT]);
    expect(shape.patties).toEqual(DEFAULT_PATTIES);
    expect(shape.hole).toBeFalsy();
  });

  it("is built as a closed mesh the editor can cut and export", () => {
    const mesh = meshForShape(plate({ pattern: "dots", count: 6 }));
    expect(mesh.vertices.length).toBeGreaterThan(100);
    expect(mesh.faces.length).toBeGreaterThan(100);
    const ys = mesh.vertices.map((vertex) => vertex[1]);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(DEFAULT_PATTIES_HEIGHT, 5);
  });

  it("counts as changed when one of its settings changes, and is copied with them", () => {
    const first = plate();
    expect(workplaneShapesEqual(first, plate())).toBe(true);
    expect(workplaneShapesEqual(first, plate({ ...DEFAULT_PATTIES, gap: 2 }))).toBe(false);
    expect(workplaneShapesEqual(first, plate({ ...DEFAULT_PATTIES, mode: "raised" }))).toBe(false);
    expect(sceneShape(plate({ pattern: "cells", seed: 5 })).patties).toMatchObject({ pattern: "cells", seed: 5 });
  });

  it("takes no taper: a plate is flat", () => {
    expect(shapeSupportsTaper("patties")).toBe(false);
  });

  it("keeps its pattern through a saved design file", async () => {
    const shapes = [
      plate({ pattern: "petals", count: 5, sides: 7, mode: "raised", base: 1 }, { id: "stamp" }),
      plate({ pattern: "cells", outline: "fan", fanTop: 90, fanBottom: 70, fanSide: 100, seamless: true, seed: 42 }, { id: "fan", x: 120 }),
    ];
    const exported = await exportLylProject({
      projectId: "patties", projectName: "Patties", createdAt: 1_700_000_000_000, modifiedAt: 1_700_000_100_000,
      shapes, history: [editorHistoryEntry(shapes, [])], historyIndex: 0, assets: [],
      workspace: DEFAULT_WORKPLANE_WORKSPACE, snapGrid: DEFAULT_SNAP_GRID, placementElevation: 0,
    });
    const restored = await importLylProject(exported);
    const byId = new Map(restored.shapes.map((shape) => [shape.id, shape]));
    expect(byId.get("stamp")?.patties).toEqual(normalizePatties({ pattern: "petals", count: 5, sides: 7, mode: "raised", base: 1 }));
    expect(byId.get("fan")?.patties).toMatchObject({ pattern: "cells", outline: "fan", fanTop: 90, fanBottom: 70, fanSide: 100, seamless: true, seed: 42 });
    expect(workplaneShapesEqual(byId.get("fan")!, shapes[1])).toBe(true);
  });

  it("keeps a figure of one's own through a saved design file, and tells two figures apart", async () => {
    const own = [[-0.7, -0.7, 0.7, -0.7, 0, 0.9], [0.2, 0.2, 0.4, 0.2, 0.3, 0.4]];
    const shapes = [plate({ pattern: "motif", motif: "custom", motifLoops: own }, { id: "own" })];
    const exported = await exportLylProject({
      projectId: "patties", projectName: "Patties", createdAt: 1_700_000_000_000, modifiedAt: 1_700_000_100_000,
      shapes, history: [editorHistoryEntry(shapes, [])], historyIndex: 0, assets: [],
      workspace: DEFAULT_WORKPLANE_WORKSPACE, snapGrid: DEFAULT_SNAP_GRID, placementElevation: 0,
    });
    const restored = (await importLylProject(exported)).shapes[0];
    expect(restored.patties).toMatchObject({ pattern: "motif", motif: "custom", motifLoops: own });
    expect(workplaneShapesEqual(restored, shapes[0])).toBe(true);
    expect(workplaneShapesEqual(restored, plate({ pattern: "motif", motif: "custom", motifLoops: [own[0]] }, { id: "own" }))).toBe(false);
    expect(workplaneShapesEqual(restored, plate({ pattern: "motif", motif: "custom" }, { id: "own" }))).toBe(false);
  });

  it("refuses a design file whose pattern settings could not have been written by the editor", async () => {
    const shapes = [plate()];
    const exported = await exportLylProject({
      projectId: "patties", projectName: "Patties", createdAt: 1_700_000_000_000, modifiedAt: 1_700_000_100_000,
      shapes: [{ ...shapes[0], patties: { pattern: "plaid" } as never }], history: [editorHistoryEntry(shapes, [])], historyIndex: 0, assets: [],
      workspace: DEFAULT_WORKPLANE_WORKSPACE, snapGrid: DEFAULT_SNAP_GRID, placementElevation: 0,
    });
    await expect(importLylProject(exported)).rejects.toThrow(/patties\.pattern must be one of/);
  });
});

describe("Patties: saved defaults and the AI bridge", () => {
  const patties = (source: Record<string, unknown>, fallback?: Record<string, unknown>) =>
    normalizeShapeCustomizations({ patties: source }, fallback ? { patties: fallback } : {}).patties ?? {};

  it("takes the settings as one object, or its JSON text, each within its range", () => {
    expect(patties({ patties: { pattern: "scales", count: 99, gap: 0.1 } }).patties).toMatchObject({ pattern: "scales", count: 60, gap: 0.4 });
    expect(patties({ patties: '{"pattern":"waves","amount":80}' }).patties).toMatchObject({ pattern: "waves", amount: 80 });
    expect(patties({ patties: "waves" }).patties).toBeUndefined();
    expect(patties({}).patties).toBeUndefined();
  });

  it("lays what is given over a saved default", () => {
    const saved = { patties: { ...DEFAULT_PATTIES, pattern: "cells", gap: 2 } };
    expect(patties({ patties: { count: 14 } }, saved).patties).toMatchObject({ pattern: "cells", gap: 2, count: 14 });
    expect(patties({}, saved).patties).toMatchObject({ pattern: "cells", gap: 2 });
  });

  it("can be made and read through the bridge", () => {
    expect(creatableShapeKinds).toContain("patties");
    expect(MCP_SHAPE_SETTING_KEYS).toContain("patties");
    expect(shapeSettingSchema.patties.description).toMatch(/only/i);
    for (const word of [...PATTIES_PATTERNS, "heart", "paw", "motifSvg", "stencil", "raised", "sunk", "pieces", "fan", "polar", "seamless", "cutEdge"]) {
      expect(shapeSettingSchema.patties.description, word).toContain(word);
    }
    // The settings go out as text, whole, and come back as the same plate.
    const reported = mcpShapeSummary(plate({ pattern: "dots", count: 7 })).settings?.patties;
    expect(typeof reported).toBe("string");
    expect(JSON.parse(reported as string)).toEqual(normalizePatties({ pattern: "dots", count: 7 }));
    expect(patties({ patties: reported }).patties).toEqual(normalizePatties({ pattern: "dots", count: 7 }));
  });
});

describe("Patties: the guide", () => {
  it("has a section of its own behind the question mark", () => {
    expect(guideSectionForShape({ kind: "patties" })).toBe("patties");
    expect(guideHref("en", guideChapterForShape({ kind: "patties" }), guideSectionForShape({ kind: "patties" }))).toBe("/guide/shapes.html#patties-a-pattern-plate");
    expect(guideHref("de", guideChapterForShape({ kind: "patties" }), guideSectionForShape({ kind: "patties" }))).toBe("/anleitung/formen.html#patties-eine-musterplatte");
  });
});
