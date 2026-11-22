import { describe, expect, it } from "vitest";
// @ts-expect-error - the bridge is plain JavaScript and carries no types.
import { tools } from "../../scripts/layerling-mcp-tools.mjs";
import { BOLT_FILAMENT_DIAMETER, BOLT_SPLIT_DEFAULTS, boltFilamentChannel, boltFilamentPlay, boltSplitStatus, normalizeBoltSplitOptions } from "@/lib/boltSplit";
import { hingePinGrip } from "@/lib/lidTool";
import { THREAD_SIZES, threadNaturalFootprint, threadNaturalHeight, threadSettings } from "@/lib/threadGeometry";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * Filament as the pins of a screw split lengthwise (Discussion #1851): what does not need the kernel. The geometry is
 * tested with the kernel in tests/e2e/boltSplit.e2e.ts.
 */

function rod(threadDiameter: number, threadPitch: number): WorkplaneShape {
  const fields = { threadRole: "rod", threadDiameter, threadPitch } as WorkplaneShape;
  const settings = threadSettings(fields);
  const footprint = threadNaturalFootprint(settings);
  return { id: "t", name: "Rod", kind: "thread", color: "#888888", x: 0, z: 0, elevation: 0, rotation: 0, width: footprint.width, depth: footprint.depth, size: footprint.width, height: threadNaturalHeight(settings), ...fields } as WorkplaneShape;
}

describe("filament as the pins of a split screw", () => {
  it("is off unless asked for, and only true switches it on", () => {
    expect(BOLT_SPLIT_DEFAULTS.filament).toBe(false);
    expect(normalizeBoltSplitOptions().filament).toBe(false);
    expect(normalizeBoltSplitOptions({ filament: true }).filament).toBe(true);
    expect(normalizeBoltSplitOptions({ filament: "yes" }).filament).toBe(false);
    expect(normalizeBoltSplitOptions({ filament: true, pinPlay: 0.2 })).toEqual({ pins: true, pinPlay: 0.2, filament: true });
  });

  it("is 1.75 mm filament in holes with the play of the lid hinge's filament holes", () => {
    expect(BOLT_FILAMENT_DIAMETER).toBe(1.75);
    for (const play of [0.05, 0.1, 0.15, 0.2, 0.3, 0.5]) expect(boltFilamentPlay(play)).toBeCloseTo(hingePinGrip({ hingePinPlay: play }), 9);
    expect(boltFilamentPlay(0.15)).toBeCloseTo(0.075, 9);
    // A hole exactly as large as the filament takes none: never less than 0.05 mm.
    expect(boltFilamentPlay(0)).toBeCloseTo(0.05, 9);
  });

  it("fits every metric thread of the size menu from M4 up, and none below", () => {
    const metric = THREAD_SIZES.filter((size) => size.system === "metric");
    expect(metric.length).toBeGreaterThan(10);
    for (const size of metric) {
      const channel = boltFilamentChannel(rod(size.diameter, size.pitch));
      if (size.diameter < 4) expect(channel, size.id).toBeNull();
      else {
        expect(channel, size.id).not.toBeNull();
        expect(channel!.radius).toBeCloseTo(0.95, 9);
        // The roof: a point at 45 degrees, or a flat top at most 0.7 mm wide.
        expect(2 * (channel!.radius * Math.SQRT2 - channel!.top)).toBeLessThan(0.7);
      }
    }
    // With the widest play it still fits an M4.
    expect(boltFilamentChannel(rod(4, 0.7), 0.5)).not.toBeNull();
  });

  it("says which lengths to cut, and to push the ends flush where no piece goes across the head", () => {
    const base = { pins: 0, pinDiameter: 0, pinLength: 0 };
    expect(boltSplitStatus("M5", { ...base, placed: { head: 1, thread: 1 }, filament: [4.5, 21.5] }, true))
      .toBe("M5 split lengthwise: two halves lying on their cut faces. Cut 1.75 mm filament: 4.5 mm, 21.5 mm.");
    expect(boltSplitStatus("M4", { ...base, placed: { head: 0, thread: 1 }, filament: [11] }, true))
      .toBe("M4 split lengthwise: two halves lying on their cut faces. Cut 1.75 mm filament: 11 mm. It lines the halves up across; push their ends flush while the glue sets.");
    expect(boltSplitStatus("M3", { ...base, placed: { head: 0, thread: 0 }, filament: [] }, true)).toBe("M3 split lengthwise: two halves, without centring pins (there is no room for them).");
    expect(boltSplitStatus("M3", { ...base, placed: { head: 0, thread: 0 }, filament: [] }, false)).toBe("M3 split lengthwise: two halves lying on their cut faces.");
    expect(boltSplitStatus("M10", { pins: 2, pinDiameter: 2, pinLength: 5.4, placed: { head: 1, thread: 1 }, filament: [] }, true))
      .toBe("M10 split lengthwise: two halves lying on their cut faces and 2 centring pins Ø 2 × 5.4 mm.");
  });

  it("is a setting of the MCP tool layerling_split_bolt, which answers with the lengths", () => {
    const tool = (tools as { name: string; description: string; inputSchema: { properties: Record<string, { type: string; description: string }> } }[]).find((entry) => entry.name === "layerling_split_bolt")!;
    expect(tool.inputSchema.properties.filament.type).toBe("boolean");
    expect(tool.inputSchema.properties.filament.description).toContain("1.75 mm");
    expect(tool.description).toContain("`filament`");
    expect(tool.description).toContain("from M4 up");
    expect(tool.description).toContain("filament (the lengths to cut in mm");
  });
});
