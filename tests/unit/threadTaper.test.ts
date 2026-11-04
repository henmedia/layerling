import { describe, expect, it } from "vitest";
import {
  createThreadGeometry,
  defaultThreadPitch,
  normalizeThreadDepth,
  THREAD_SIZE_GROUPS,
  threadBuildPlan,
  threadNaturalFootprint,
  threadSettings,
  threadSizeById,
  threadSizeSettings,
  threadStandardSize,
  threadUsesInchPitch,
} from "@/lib/threadGeometry";
import { mcpThreadSizeName, mcpThreadSizeParams } from "@/lib/mcpShapeSettings";
import { canonicalizeShape, workplaneShapesEqual } from "@/lib/workplaneShapes";
import { editorHistoryEntry } from "@/lib/editorHistory";
import { exportLylProject, importLylProject } from "@/lib/lylProject";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";
import type { ThreadRole, WorkplaneShape } from "@/types/layerling";

/*
 * Tapered threads (NPT, Discussion #1267): 1 in 16 on the diameter, the set diameter at the wide end. An outside
 * thread narrows towards its tip at the top, an inside one widens towards its mouth at the top.
 */

type Position = { count: number; getX: (i: number) => number; getY: (i: number) => number; getZ: (i: number) => number };

/** Every edge of a closed body belongs to exactly two triangles. */
function edgeUses(position: Position) {
  const uses = new Map<string, number>();
  const key = (i: number) => [position.getX(i), position.getY(i), position.getZ(i)].map((value) => value.toFixed(5)).join(",");
  for (let i = 0; i + 2 < position.count; i += 3) {
    const corners = [key(i), key(i + 1), key(i + 2)];
    if (new Set(corners).size < 3) continue;
    for (let edge = 0; edge < 3; edge += 1) {
      const a = corners[edge];
      const b = corners[(edge + 1) % 3];
      const pair = a < b ? `${a}:${b}` : `${b}:${a}`;
      uses.set(pair, (uses.get(pair) ?? 0) + 1);
    }
  }
  return uses;
}

const npt = threadSizeById('1/2" NPT')!;
const nptFields = (role: ThreadRole, height: number) => {
  const chosen = threadSizeSettings(npt, "v", null);
  return {
    threadRole: role,
    threadDiameter: chosen.diameter,
    threadPitch: chosen.pitch,
    threadProfile: chosen.profile,
    threadDepth: chosen.depth,
    threadFlankAngle: chosen.flankAngle,
    threadTaper: chosen.taper,
    // No chamfers: the radii at the very ends are the thread's own.
    threadChamfer: 0,
    threadChamferBottom: 0,
    height,
  };
};

function meshOf(fields: ReturnType<typeof nptFields>) {
  const footprint = threadNaturalFootprint(threadSettings(fields));
  return createThreadGeometry({ ...fields, width: footprint.width, depth: footprint.depth });
}

/** The largest and smallest distance from the axis of the thread wall's points within a band of heights. */
function radiiBetween(position: Position, from: number, to: number, within: number) {
  let max = 0;
  let min = Infinity;
  for (let i = 0; i < position.count; i += 1) {
    const y = position.getY(i);
    if (y < from || y > to) continue;
    const radius = Math.hypot(position.getX(i), position.getZ(i));
    // The thread wall only: not the outer body of a nut, not the centre of an end face.
    if (radius > within || radius < within / 4) continue;
    max = Math.max(max, radius);
    min = Math.min(min, radius);
  }
  return { max, min };
}

describe("NPT sizes", () => {
  const sizes = THREAD_SIZE_GROUPS.find((group) => group.series === "NPT")!.sizes;

  it("lists 1/16\" to 4\" with the standard's threads per inch, tapered, with 60 degree flanks", () => {
    expect(sizes.map((size) => size.id)).toEqual(["1/16\" NPT", "1/8\" NPT", "1/4\" NPT", "3/8\" NPT", "1/2\" NPT", "3/4\" NPT", "1\" NPT", "1 1/4\" NPT", "1 1/2\" NPT", "2\" NPT", "2 1/2\" NPT", "3\" NPT", "3 1/2\" NPT", "4\" NPT"]);
    expect(npt.diameter).toBeCloseTo(0.84 * 25.4, 6);
    expect(npt.pitch).toBeCloseTo(25.4 / 14, 9);
    expect(threadSizeById('1" NPT')!.pitch).toBeCloseTo(25.4 / 11.5, 9);
    for (const size of sizes) {
      expect(size).toMatchObject({ system: "pipe", profile: "custom", flankAngle: 60, taper: true });
      // The depth fits the own profile's limits, so it is kept as it is: about 0.78 pitch.
      expect(normalizeThreadDepth(size.depth, size.pitch, size.diameter, 60)).toBe(size.depth);
      expect(size.depth! / size.pitch).toBeGreaterThan(0.778);
      // The pitch field asks for threads per inch.
      expect(threadUsesInchPitch(size.diameter)).toBe(true);
    }
  });

  it("leaves 5/16\" UNC its own pitch, though 1/16\" NPT has its diameter", () => {
    expect(threadSizeById('1/16" NPT')!.diameter).toBeCloseTo(7.9375, 3);
    expect(defaultThreadPitch(7.9375)).toBeCloseTo(25.4 / 18, 9);
  });

  it("switches the taper on with an NPT size and off again with another size; a free taper stays", () => {
    const m6 = threadSizeById("M6")!;
    expect(threadSizeSettings(npt, "v", null)).toMatchObject({ profile: "custom", taper: true });
    expect(threadSizeSettings(m6, "custom", npt)).toEqual({ diameter: 6, pitch: 1, profile: "v", taper: false });
    expect(threadSizeSettings(m6, "v", null)).not.toHaveProperty("taper");
  });

  it("is a standard size only as tapered as the size", () => {
    const tapered = { diameter: npt.diameter, pitch: npt.pitch, taper: true };
    expect(threadStandardSize(tapered)?.id).toBe('1/2" NPT');
    expect(threadStandardSize({ ...tapered, taper: false })).toBeNull();
    expect(threadStandardSize({ diameter: 6, pitch: 1, taper: true })).toBeNull();
    expect(threadStandardSize({ diameter: 6, pitch: 1, taper: false })?.id).toBe("M6");
  });
});

describe("a tapered thread's display mesh", () => {
  it.each<[ThreadRole, number]>([["rod", 20], ["screw", 24], ["nut", 14], ["bore", 16]])("is closed as a %s", (role, height) => {
    const position = meshOf(nptFields(role, height)).getAttribute("position") as unknown as Position;
    const counts = [...edgeUses(position).values()];
    expect(counts.length).toBeGreaterThan(1000);
    expect(counts.every((count) => count === 2)).toBe(true);
  });

  it("narrows a rod 1 in 16 on the diameter towards its tip at the top", () => {
    const fields = nptFields("rod", 20);
    const plan = threadBuildPlan({ ...fields, width: 30, depth: 30 });
    const position = meshOf(fields).getAttribute("position") as unknown as Position;
    // Over a pitch at each end the crest reaches the outer diameter there, the root the core diameter.
    const low = radiiBetween(position, 0, plan.settings.pitch, plan.major + 1);
    const high = radiiBetween(position, 20 - plan.settings.pitch, 20, plan.major + 1);
    expect(low.max).toBeCloseTo(plan.major, 2);
    // The top band starts a pitch below the top, where the crest is widest within it.
    expect(high.max).toBeCloseTo(plan.major - (20 - plan.settings.pitch) / 32, 2);
    expect(low.min - high.min).toBeCloseTo(20 / 32 - plan.settings.pitch / 32, 1);
  });

  it("widens a tapped hole towards its mouth at the top, where it has the set diameter", () => {
    const fields = nptFields("bore", 16);
    const plan = threadBuildPlan({ ...fields, width: 30, depth: 30 });
    const position = meshOf(fields).getAttribute("position") as unknown as Position;
    const low = radiiBetween(position, 0, plan.settings.pitch, plan.major + 1);
    const high = radiiBetween(position, 16 - plan.settings.pitch, 16, plan.major + 1);
    expect(high.max).toBeCloseTo(plan.major, 2);
    expect(low.max).toBeCloseTo(plan.major - (16 - plan.settings.pitch) / 32, 2);
  });

  it("leaves a straight thread as it was", () => {
    const fields = { threadRole: "rod" as const, threadDiameter: 6, threadPitch: 1, height: 12 };
    const footprint = threadNaturalFootprint(threadSettings(fields));
    const straight = createThreadGeometry({ ...fields, width: footprint.width, depth: footprint.depth }).getAttribute("position").array;
    const off = createThreadGeometry({ ...fields, threadTaper: false, width: footprint.width, depth: footprint.depth }).getAttribute("position").array;
    expect(Array.from(off)).toEqual(Array.from(straight));
    expect(threadBuildPlan({ ...fields, width: 6, depth: 6 }).taperSlope).toBe(0);
  });
});

describe("a tapered thread through the bridge", () => {
  it("sets the taper with an NPT size and clears it with another size, unless the call says otherwise", () => {
    expect(mcpThreadSizeParams({ threadSize: '1/2" NPT' }, "v")).toMatchObject({ threadDiameter: npt.diameter, threadPitch: npt.pitch, threadProfile: "custom", threadDepth: npt.depth, threadFlankAngle: 60, threadTaper: true });
    expect(mcpThreadSizeParams({ threadSize: "M6" }, "custom", true)).toMatchObject({ threadTaper: false });
    expect(mcpThreadSizeParams({ threadSize: "M6" }, "v")).not.toHaveProperty("threadTaper");
    expect(mcpThreadSizeParams({ threadSize: "M6", threadTaper: true }, "v")).toMatchObject({ threadTaper: true });
  });

  it("names the size only when the thread is tapered as the size is", () => {
    const shape = { kind: "thread", threadDiameter: npt.diameter, threadPitch: npt.pitch } as const;
    expect(mcpThreadSizeName({ ...shape, threadTaper: true })).toBe('1/2" NPT');
    expect(mcpThreadSizeName(shape)).toBeUndefined();
  });

  it("tells a tapered thread from a straight one", () => {
    const base = { id: "t", name: "Thread", kind: "thread", color: "#888", x: 0, z: 0, elevation: 0, rotation: 0, width: 10, depth: 10, size: 10, height: 10 } as WorkplaneShape;
    expect(workplaneShapesEqual(base, { ...base, threadTaper: true })).toBe(false);
  });
});

describe("a tapered thread in a saved package", () => {
  it("keeps the taper through placing, tidying, saving and loading", async () => {
    const asset = toolbarShapeAssets.find((entry) => entry.kind === "thread")!;
    const fields = nptFields("rod", 20);
    const shape = canonicalizeShape(makeShapeFromAsset(asset, { x: 0, z: 0 }, fields));
    expect(shape.threadTaper).toBe(true);
    const shapes = [shape];
    const bytes = await exportLylProject({
      projectId: "project-npt",
      projectName: "NPT",
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
    const loaded = (await importLylProject(bytes)).shapes[0];
    expect(loaded.threadTaper).toBe(true);
    expect(mcpThreadSizeName(loaded)).toBe('1/2" NPT');
    // A straight thread stays without the field, as before.
    expect(canonicalizeShape(makeShapeFromAsset(asset, { x: 0, z: 0 }, { threadDiameter: 6, threadPitch: 1 })).threadTaper).toBeUndefined();
  });
});
