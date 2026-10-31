import { describe, expect, it } from "vitest";
import {
  createThreadGeometry,
  THREAD_SIZE_GROUPS,
  threadNaturalFootprint,
  threadSettings,
  threadSizeById,
  threadSizeFor,
  threadSizeSettings,
} from "@/lib/threadGeometry";
import { mcpThreadSizeName, mcpThreadSizeParams } from "@/lib/mcpShapeSettings";
import type { ThreadRole } from "@/types/layerling";

/*
 * Bottle necks (#1079). PCO 1881 as the OpenSCAD library BOSL2 has it
 * (pco1881_neck): outer 27.4 mm, core 24.2 mm, pitch 2.7 mm, 15 degrees a flank.
 */
type Position = { count: number; getX(index: number): number; getY(index: number): number; getZ(index: number): number };

function openOrDoubledEdges(position: Position) {
  const uses = new Map<string, number>();
  const key = (index: number) => [position.getX(index), position.getY(index), position.getZ(index)].map((value) => value.toFixed(5)).join(",");
  for (let index = 0; index + 2 < position.count; index += 3) {
    const corners = [key(index), key(index + 1), key(index + 2)];
    if (corners[0] === corners[1] || corners[1] === corners[2] || corners[0] === corners[2]) continue;
    for (let edge = 0; edge < 3; edge += 1) {
      const a = corners[edge];
      const b = corners[(edge + 1) % 3];
      const id = a < b ? `${a}:${b}` : `${b}:${a}`;
      uses.set(id, (uses.get(id) ?? 0) + 1);
    }
  }
  return [...uses.values()].filter((count) => count !== 2).length;
}

describe("PCO 1881 bottle neck", () => {
  const pco = threadSizeById("PCO 1881")!;

  it("is its own series at the end of the size menu, with the neck's measures", () => {
    expect(THREAD_SIZE_GROUPS.at(-1)?.series).toBe("bottle");
    expect(THREAD_SIZE_GROUPS.at(-1)?.sizes.map((size) => size.id)).toEqual(["PCO 1881"]);
    expect(pco.system).toBe("bottle");
    expect(pco.diameter).toBe(27.4);
    expect(pco.pitch).toBe(2.7);
    // Core 24.2 mm: 1.6 mm deep, 2 x 15 degrees.
    expect(pco.diameter - 2 * pco.depth!).toBeCloseTo(24.2, 9);
    expect(pco.flankAngle).toBe(30);
    expect(threadSizeFor(27.4, 2.7)?.id).toBe("PCO 1881");
  });

  it("always brings its own profile along, and a size chosen after it its standard profile", () => {
    for (const current of ["v", "whitworth", "trapezoidal", "round", "custom"] as const) {
      expect(threadSizeSettings(pco, current, null)).toEqual({ diameter: 27.4, pitch: 2.7, profile: "custom", depth: 1.6, flankAngle: 30 });
    }
    const m6 = threadSizeById("M6")!;
    expect(threadSizeSettings(m6, "custom", pco)).toEqual({ diameter: 6, pitch: 1, profile: "v" });
    // An own profile chosen on a free size stays.
    expect(threadSizeSettings(m6, "custom", null).profile).toBe("custom");
  });

  it("comes through the MCP bridge with its depth and flank angle", () => {
    expect(mcpThreadSizeParams({ threadSize: "PCO 1881", threadRole: "nut" }, "v")).toEqual({
      threadSize: "PCO 1881",
      threadRole: "nut",
      threadDiameter: 27.4,
      threadPitch: 2.7,
      threadProfile: "custom",
      threadDepth: 1.6,
      threadFlankAngle: 30,
    });
    expect(mcpThreadSizeParams({ threadSize: "PCO 1881", threadDepth: 1.4 }, "v").threadDepth).toBe(1.4);
    expect(mcpThreadSizeName({ kind: "thread", threadDiameter: 27.4, threadPitch: 2.7 })).toBe("PCO 1881");
  });

  it.each(["rod", "nut", "bore"] as const)("builds a closed %s", (role: ThreadRole) => {
    const fields = { threadRole: role, threadDiameter: 27.4, threadPitch: 2.7, threadProfile: "custom", threadDepth: 1.6, threadFlankAngle: 30 } as const;
    const settings = threadSettings(fields);
    expect(settings.depth).toBe(1.6);
    expect(settings.flankAngle).toBe(30);
    const footprint = threadNaturalFootprint(settings);
    const built = createThreadGeometry({ ...fields, width: footprint.width, depth: footprint.depth, height: 12 });
    const position = built.getAttribute("position") as unknown as Position;
    expect(position.count).toBeGreaterThan(1000);
    expect(openOrDoubledEdges(position)).toBe(0);
  });
});
