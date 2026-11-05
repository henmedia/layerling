import { describe, expect, it } from "vitest";
// @ts-expect-error the tool list is a plain .mjs module
import { tools } from "../../scripts/layerling-mcp-tools.mjs";
import { MESSAGES_EN } from "@/lib/messages.en";
import { PORT_PRESET_ORDER, PORT_PRESETS, portContourPoints, portPresetFor, portPresetSize, type PortPreset } from "@/lib/portGeometry";

/*
 * Anderson Powerpole PP15/30/45 blocks of 1 to 4 poles in the Port opening's list (Discussion #1190):
 * housings 7.90 x 7.90 mm at the front, 7.90 mm apart, a dovetail tongue 0.50 mm proud (8.40 mm in the
 * maker's drawing), and about 0.25 mm of room on every side.
 */

const POWERPOLE: PortPreset[] = ["powerpole1", "powerpole2", "powerpole3", "powerpole4"];

describe("the Powerpole blocks of the Port opening", () => {
  it("come last in the list, 1 to 4 poles", () => {
    expect(PORT_PRESET_ORDER.slice(-4)).toEqual(POWERPOLE);
    expect(PORT_PRESET_ORDER.indexOf("powerpole1")).toBe(PORT_PRESET_ORDER.indexOf("dsub9") + 1);
  });

  it("are 7.9 mm per pole plus the tongue and the room, 8.9 mm high", () => {
    POWERPOLE.forEach((key, index) => {
      const poles = index + 1;
      const preset = PORT_PRESETS[key];
      expect(preset.width, key).toBeCloseTo(7.9 * poles + 0.5 + 2 * 0.25, 6);
      expect(preset.height, key).toBeCloseTo(7.9 + 0.5 + 2 * 0.25, 6);
      expect([preset.corner, preset.profile, preset.screwHoles], key).toEqual([0.5, "rounded", undefined]);
    });
  });

  it("draw an outline as large as the opening and are found again from it, with extra clearance too", () => {
    for (const key of POWERPOLE) {
      for (const clearance of [0, 0.3]) {
        const size = portPresetSize(key, clearance);
        const points = portContourPoints(size.width, size.height, size.corner, 128, size.profile);
        const xs = points.map((point) => point.x);
        const ys = points.map((point) => point.y);
        expect(Math.max(...xs) - Math.min(...xs), `${key} ${clearance}`).toBeCloseTo(size.width, 2);
        expect(Math.max(...ys) - Math.min(...ys), `${key} ${clearance}`).toBeCloseTo(size.height, 2);
        expect(portPresetFor(size.width, size.height, size.corner, size.profile, clearance), `${key} ${clearance}`).toBe(key);
      }
    }
  });

  it("have a name in the list and can be made through the AI connection", () => {
    for (const key of POWERPOLE) expect(MESSAGES_EN[`port.${key}` as keyof typeof MESSAGES_EN], key).toMatch(/^Powerpole, \d poles?$/);
    const create = (tools as Array<{ name: string; inputSchema: { properties: Record<string, { enum?: string[]; description?: string }> } }>).find((tool) => tool.name === "layerling_create_shape")!;
    const preset = create.inputSchema.properties.portPreset;
    expect(preset.enum).toEqual(PORT_PRESET_ORDER);
    expect(preset.description).toContain("powerpole1 to powerpole4");
  });
});
