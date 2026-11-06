import { describe, expect, it } from "vitest";
import { editorHistoryEntry } from "@/lib/editorHistory";
import { exportLylProject, importLylProject } from "@/lib/lylProject";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { canonicalizeShape, workplaneShapesEqual } from "@/lib/workplaneShapes";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";
import { mcpThreadSizeParams } from "@/lib/mcpShapeSettings";
import { cadModifierThreadForShape } from "@/lib/cadProfileExtrusion";
import {
  createThreadGeometry,
  normalizeThreadStarts,
  threadFootprintPatch,
  threadLead,
  threadSettings,
  threadStandardSize,
  threadStartsLimit,
} from "@/lib/threadGeometry";
import type { WorkplaneShape } from "@/types/layerling";
// @ts-expect-error the tool list is a plain .mjs module
import { tools } from "../../scripts/layerling-mcp-tools.mjs";

/*
 * Threads of several starts (#1348): a T8x8 lead screw has four threads side by side, a pitch of
 * 2 mm apart, each climbing 8 mm a turn. One start, the default, must stay exactly as before.
 */

const asset = toolbarShapeAssets.find((entry) => entry.kind === "thread")!;
const T8x8 = { threadProfile: "trapezoidal", threadDiameter: 8, threadPitch: 2, threadStarts: 4 } as const;

describe("the starts of a thread", () => {
  it("are whole, one by default, at most eight and at most a lead of half the circumference", () => {
    expect(threadSettings({}).starts).toBe(1);
    expect(normalizeThreadStarts(undefined, 8, 2)).toBe(1);
    expect(normalizeThreadStarts(3.6, 8, 2)).toBe(4);
    expect(normalizeThreadStarts(0, 8, 2)).toBe(1);
    // 8 mm round: half the circumference is 12.6 mm, six starts of 2 mm.
    expect(threadStartsLimit(8, 2)).toBe(6);
    expect(normalizeThreadStarts(8, 8, 2)).toBe(6);
    expect(threadStartsLimit(40, 1)).toBe(8);
    // A tapered thread has one.
    expect(normalizeThreadStarts(4, 8, 2, true)).toBe(1);
    expect(threadSettings({ ...T8x8, threadTaper: true }).starts).toBe(1);
    expect(threadLead(threadSettings(T8x8))).toBe(8);
  });

  it("leave the profile to the pitch: the core is as deep as one start's", () => {
    const one = threadSettings({ ...T8x8, threadStarts: 1 });
    const four = threadSettings(T8x8);
    expect(four.pitch).toBe(one.pitch);
    const part = (fields: Partial<WorkplaneShape>) => cadModifierThreadForShape(canonicalizeShape(makeShapeFromAsset(asset, { x: 0, z: 0 }, fields)))!;
    expect(part(T8x8).minor).toBeCloseTo(part({ ...T8x8, threadStarts: 1 }).minor, 9);
    expect(part(T8x8).starts).toBe(4);
    expect(part({ ...T8x8, threadStarts: 1 }).starts).toBeUndefined();
  });

  it("change the mesh only where they are set, and one start draws as before", () => {
    const base = { ...T8x8, threadStarts: undefined, width: 8, depth: 8, height: 20 };
    const plain = createThreadGeometry(base).getAttribute("position").array;
    const one = createThreadGeometry({ ...base, threadStarts: 1 }).getAttribute("position").array;
    expect(Array.from(one)).toEqual(Array.from(plain));
    const four = createThreadGeometry({ ...base, threadStarts: 4 });
    four.computeBoundingBox();
    expect(four.boundingBox!.max.y).toBeCloseTo(20, 6);
    expect(four.boundingBox!.max.x).toBeCloseTo(4, 2);
  });

  it("are no standard size, and a size from the menu or MCP sets them back to one", () => {
    expect(threadStandardSize(threadSettings({ threadDiameter: 6, threadPitch: 1 }))?.id).toBe("M6");
    expect(threadStandardSize(threadSettings({ threadDiameter: 6, threadPitch: 1, threadStarts: 2 }))).toBeNull();
    const params = mcpThreadSizeParams({ threadSize: "M8" }, "v");
    expect("threadStarts" in params && params.threadStarts === undefined).toBe(true);
    expect(mcpThreadSizeParams({ threadSize: "M8", threadStarts: 2 }, "v").threadStarts).toBe(2);
  });

  it("stay when the body is pulled bigger, and count in the comparison of two shapes", () => {
    const shape = canonicalizeShape(makeShapeFromAsset(asset, { x: 0, z: 0 }, T8x8));
    expect(shape.threadStarts).toBe(4);
    const patch = threadFootprintPatch({ ...shape, width: shape.width * 1.25, depth: (shape.depth ?? shape.width) * 1.25 });
    expect(patch.threadStarts).toBeGreaterThanOrEqual(4);
    expect(workplaneShapesEqual(shape, { ...shape, threadStarts: 2 })).toBe(false);
  });

  it("are kept in a saved project, always whole", async () => {
    const shape = canonicalizeShape(makeShapeFromAsset(asset, { x: 4, z: 6 }, T8x8));
    const save = async (shapes: WorkplaneShape[]) => exportLylProject({
      projectId: "project-lead-screw",
      projectName: "Spindel",
      createdAt: 1_700_000_000_000,
      modifiedAt: 1_700_000_100_000,
      shapes,
      history: [editorHistoryEntry(shapes, [])],
      historyIndex: 0,
      assets: [],
      workspace: DEFAULT_WORKPLANE_WORKSPACE,
      snapGrid: DEFAULT_SNAP_GRID,
      placementElevation: 0,
    });
    const restored = await importLylProject(await save([shape]));
    expect(restored.shapes[0].threadStarts).toBe(4);
    // Saving goes through the shape's own measures, so a half start comes back whole.
    const half = await importLylProject(await save([{ ...shape, threadStarts: 2.5 }]));
    expect(Number.isInteger(half.shapes[0].threadStarts)).toBe(true);
  });

  it("are offered through the AI connection", () => {
    const create = (tools as Array<{ name: string; inputSchema: { properties: Record<string, { type?: string; description?: string }> } }>).find((tool) => tool.name === "layerling_create_shape")!;
    expect(create.inputSchema.properties.threadStarts?.type).toBe("integer");
    expect(create.inputSchema.properties.threadStarts?.description).toContain("T8x8");
  });
});
