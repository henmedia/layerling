import { describe, expect, it } from "vitest";
import { editorHistoryEntry } from "@/lib/editorHistory";
import { exportLylProject, importLylProject } from "@/lib/lylProject";
import {
  MAX_PORT_CLEARANCE,
  normalizePortClearance,
  portChamfer,
  portContourPoints,
  PORT_PRESET_ORDER,
  PORT_PRESETS,
  portPresetFor,
  portPresetSize,
} from "@/lib/portGeometry";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";
import { canonicalizeShape } from "@/lib/workplaneShapes";

const portAsset = () => toolbarShapeAssets.find((entry) => entry.kind === "port")!;

describe("Micro-HDMI port opening and extra clearance", () => {
  it("has a Micro-HDMI preset: shell 6.2 x 3.0 plus about 0.3 mm, both lower corners cut", () => {
    const preset = PORT_PRESETS.microHdmi;
    expect(preset).toEqual({ width: 6.8, height: 3.6, corner: 0.3, profile: "microHdmi" });
    expect(PORT_PRESET_ORDER.indexOf("microHdmi")).toBe(PORT_PRESET_ORDER.indexOf("miniHdmi") + 1);
    const chamfer = portChamfer("microHdmi", 6.8, 3.6)!;
    expect(chamfer.x).toBeCloseTo(1, 6);
    expect(chamfer.y).toBeCloseTo(0.9, 6);
    expect(chamfer.left && chamfer.right).toBe(true);
    const bottom = portContourPoints(6.8, 3.6, 0.3, 32, "microHdmi").filter((point) => Math.abs(point.y) < 1e-9).map((point) => point.x);
    expect(Math.min(...bottom)).toBeCloseTo(-3.4 + 1, 6);
    expect(Math.max(...bottom)).toBeCloseTo(3.4 - 1, 6);
    expect(portPresetFor(6.8, 3.6, 0.3, "microHdmi")).toBe("microHdmi");
  });

  it("grows a preset by twice the clearance and its corners by the clearance", () => {
    const usbC = portPresetSize("usbC", 0.3);
    expect(usbC.width).toBeCloseTo(PORT_PRESETS.usbC.width + 0.6, 9);
    expect(usbC.height).toBeCloseTo(PORT_PRESETS.usbC.height + 0.6, 9);
    // Fully round ends stay fully round.
    expect(usbC.corner).toBeCloseTo(usbC.height / 2, 9);
    const hdmi = portPresetSize("hdmi", 0.5);
    expect(hdmi.width).toBeCloseTo(16.7, 9);
    expect(hdmi.height).toBeCloseTo(7.2, 9);
    expect(hdmi.corner).toBeCloseTo(0.8, 9);
    expect(portPresetSize("rj45")).toEqual({ ...PORT_PRESETS.rj45 });
  });

  it("still knows the preset with its clearance, and not without it", () => {
    for (const key of PORT_PRESET_ORDER) {
      const grown = portPresetSize(key, 0.4);
      expect(portPresetFor(grown.width, grown.height, grown.corner, grown.profile, 0.4), key).toBe(key);
      expect(portPresetFor(grown.width, grown.height, grown.corner, grown.profile), key).toBeNull();
    }
  });

  it("keeps the clearance between 0 and 2 mm", () => {
    expect(MAX_PORT_CLEARANCE).toBe(2);
    expect(normalizePortClearance(undefined)).toBe(0);
    expect(normalizePortClearance(Number.NaN)).toBe(0);
    expect(normalizePortClearance(-1)).toBe(0);
    expect(normalizePortClearance(0.35)).toBe(0.35);
    expect(normalizePortClearance(5)).toBe(2);
  });

  it("writes no clearance for a new opening, so older designs stay as they were", () => {
    const shape = makeShapeFromAsset(portAsset(), { x: 0, z: 0, elevation: 0 });
    expect(shape.portClearance).toBeUndefined();
    expect(portPresetFor(shape.width ?? 0, shape.height, shape.cornerFillet, shape.portProfile, shape.portClearance)).toBe("usbC");
  });

  it("keeps the clearance in a saved design and refuses one out of range", async () => {
    const grown = portPresetSize("microHdmi", 0.3);
    const source = canonicalizeShape(makeShapeFromAsset(portAsset(), { x: 0, z: 0, elevation: 0 }, {
      width: grown.width, height: grown.height, cornerFillet: grown.corner, portProfile: grown.profile, portClearance: 0.3,
    }));
    expect(source.portClearance).toBe(0.3);
    const project = (shape: typeof source) => exportLylProject({
      projectId: "port",
      projectName: "Port",
      createdAt: 1_700_000_000_000,
      modifiedAt: 1_700_000_100_000,
      shapes: [shape],
      history: [editorHistoryEntry([shape], [])],
      historyIndex: 0,
      assets: [],
      workspace: DEFAULT_WORKPLANE_WORKSPACE,
      snapGrid: DEFAULT_SNAP_GRID,
      placementElevation: 0,
    });
    const [loaded] = (await importLylProject(await project(source))).shapes;
    expect(loaded.portClearance).toBe(0.3);
    expect(loaded.portProfile).toBe("microHdmi");
    expect(portPresetFor(loaded.width ?? 0, loaded.height, loaded.cornerFillet, loaded.portProfile, loaded.portClearance)).toBe("microHdmi");
    await expect(importLylProject(await project({ ...source, portClearance: 3 }))).rejects.toThrow(/portClearance/);
  });
});
