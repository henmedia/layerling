import { describe, expect, it } from "vitest";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { shapeDefaultsAsset, shapeDefaultsFromShape } from "@/lib/shapeDefaults";
import { normalizeShapeCustomizations } from "@/lib/workplaneSettings";
import { workplaneShapesEqual } from "@/lib/workplaneShapes";
import { sameShapeApartFromPlacement } from "@/lib/editorMeshCore";
import { editorHistoryEntry } from "@/lib/editorHistory";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";
import { exportLylProject, importLylProject } from "@/lib/lylProject";
import { ERROR_RULES } from "@/lib/userErrors";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * Settings that were dropped on the way (checked 11.11.2026): "Save as default" left out the fields that came later,
 * the AI bridge lost a spiral bevel gear's angle and a thread's taper, head, drive and collar, two shapes that differed
 * only in a print-check mark counted as the same, and a .lyl took any value for those marks.
 */

function shapeOf(kind: WorkplaneShape["kind"], patch: Partial<WorkplaneShape> = {}) {
  const asset = shapeDefaultsAsset(kind);
  if (!asset) throw new Error(`no asset for ${kind}`);
  return { ...makeShapeFromAsset(asset), ...patch } as WorkplaneShape;
}

/** A shape made from its settings, as layerling_create_shape makes it. */
function made(kind: WorkplaneShape["kind"], params: Record<string, unknown>) {
  const asset = toolbarShapeAssets.find((entry) => entry.kind === kind)!;
  const settings = normalizeShapeCustomizations({ [kind]: params })[kind] ?? {};
  return makeShapeFromAsset(asset, { x: 0, z: 0 }, settings);
}

describe("Save as default", () => {
  it("keeps a screw hole's slot, recess and rim chamfer", () => {
    expect(shapeDefaultsFromShape(shapeOf("counterbore", { screwHoleChamfer: 1 }))).toMatchObject({ screwHoleChamfer: 1 });
    expect(shapeDefaultsFromShape(shapeOf("countersink", { screwHoleRecess: 2 }))).toMatchObject({ screwHoleRecess: 2 });
    expect(shapeDefaultsFromShape(shapeOf("countersink", { screwHoleSlot: true, width: 14 }))).toMatchObject({ screwHoleSlot: true });
  });

  it("keeps the slanted teeth of a ring gear and a spiral bevel gear", () => {
    expect(shapeDefaultsFromShape(shapeOf("gear", { gearType: "internal", ringRackHelixAngle: 20, ringRackHerringbone: true }))).toMatchObject({ ringRackHelixAngle: 20, ringRackHerringbone: true });
    expect(shapeDefaultsFromShape(shapeOf("gear", { gearType: "bevel", bevelHelixAngle: 30 }))).toMatchObject({ bevelHelixAngle: 30 });
  });

  it("keeps a thread's taper and a text without kerning", () => {
    expect(shapeDefaultsFromShape(shapeOf("thread", { threadTaper: true }))).toMatchObject({ threadTaper: true });
    expect(shapeDefaultsFromShape(shapeOf("text", { textKerning: false }))).toMatchObject({ textKerning: false });
  });

  it("still leaves a hinge's opening angle out (#1336)", () => {
    expect(shapeDefaultsFromShape(shapeOf("hinge", { hingeAngle: -90 }))).toBeNull();
  });
});

describe("a shape made through the AI bridge", () => {
  it("is a spiral bevel gear when asked for one, and a straight one keeps no angle", () => {
    expect(made("gear", { gearType: "bevel", bevelHelixAngle: 30 }).bevelHelixAngle).toBe(30);
    expect(made("gear", { gearType: "bevel", bevelHelixAngle: 99 }).bevelHelixAngle).toBe(45);
    expect(made("gear", { gearType: "bevel" }).bevelHelixAngle).toBeUndefined();
    expect(made("gear", { gearType: "spur", bevelHelixAngle: 30 }).bevelHelixAngle).toBeUndefined();
  });

  it("is a tapered thread with its own head, drive and collar when asked for one", () => {
    expect(made("thread", { threadTaper: true }).threadTaper).toBe(true);
    expect(made("thread", { threadTaper: false }).threadTaper).toBeUndefined();
    const screw = made("thread", { threadRole: "screw", threadHead: "cylinder", threadHeadHeight: 7, threadHeadDiameter: 12, threadDrive: "hex", threadDriveSize: 4 });
    expect(screw.threadHeadHeight).toBe(7);
    expect(screw.threadHeadDiameter).toBe(12);
    expect(screw.threadDriveSize).toBe(4);
  });

  it("keeps a text's kerning off", () => {
    expect(made("text", { textKerning: false }).textKerning).toBe(false);
  });
});

describe("marks for the print check", () => {
  it("count as a change", () => {
    const pin = shapeOf("cylinder");
    expect(workplaneShapesEqual(pin, { ...pin, breakawayBase: true })).toBe(false);
    expect(workplaneShapesEqual(pin, { ...pin, stencilBridge: true })).toBe(false);
    expect(workplaneShapesEqual(pin, { ...pin, supportRibFor: "box-1" })).toBe(false);
    expect(workplaneShapesEqual(pin, { ...pin, breakawayBase: false })).toBe(true);
  });

  it("leave the mesh as it is, as hiding and locking do", () => {
    const body = shapeOf("box");
    for (const patch of [{ breakawayBase: true }, { stencilBridge: true }, { supportRibFor: "box-1" }, { hidden: true }, { locked: true }, { shapeLocked: true }, { transparent: true }]) {
      expect(sameShapeApartFromPlacement(body, { ...body, ...patch })).toBe(true);
    }
    expect(sameShapeApartFromPlacement(body, { ...body, height: body.height + 1 })).toBe(false);
  });

  it("must be true or false in a .lyl, and a rib's body an id", async () => {
    const project = (shape: unknown) => exportLylProject({
      projectId: "marks", projectName: "Marks", createdAt: 1_700_000_000_000, modifiedAt: 1_700_000_100_000,
      shapes: [shape as WorkplaneShape], history: [editorHistoryEntry([shape as WorkplaneShape], [])], historyIndex: 0, assets: [],
      workspace: DEFAULT_WORKPLANE_WORKSPACE, snapGrid: DEFAULT_SNAP_GRID, placementElevation: 0,
    });
    const pin = { ...shapeOf("cylinder"), id: "pin", breakawayBase: true, supportRibFor: "box-1" };
    const restored = (await importLylProject(await project(pin))).shapes[0];
    expect(restored.breakawayBase).toBe(true);
    expect(restored.supportRibFor).toBe("box-1");
    await expect(importLylProject(await project({ ...pin, breakawayBase: "yes" }))).rejects.toThrow(/breakawayBase/);
    await expect(importLylProject(await project({ ...pin, supportRibFor: 3 }))).rejects.toThrow(/supportRibFor/);
  });
});

describe("the slotted hole's and sloped profile's kernel errors", () => {
  it("have a text of their own in every language", () => {
    const keyOf = (text: string) => ERROR_RULES.find((rule) => rule.pattern.test(text))?.key;
    expect(keyOf("A slotted hole's section has no width")).toBe("error.measuresOutOfRange");
    for (const text of ["A slotted hole needs one section of straight lines", "The slotted hole did not become one solid", "The slotted hole is not a valid solid", "The sloped profile solid has no edges to round"]) {
      expect(keyOf(text)).toBe("error.solidNotValid");
    }
  });
});
