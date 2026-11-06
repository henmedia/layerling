import { describe, expect, it } from "vitest";
// @ts-expect-error the tool list is a plain .mjs module
import { tools } from "../../scripts/layerling-mcp-tools.mjs";
import { cadModifierProfileForShape } from "@/lib/cadProfileExtrusion";
import { portScrewHoleShapes, portWithScrewHolesGroup, screwHolesOfPort } from "@/lib/editorPortScrewHoles";
import {
  isPolygonPortProfile,
  maxPortCorner,
  PORT_PRESET_ORDER,
  PORT_PRESETS,
  PORT_PROFILES,
  portContourPoints,
  portPresetFor,
  portPresetSize,
  portScrewHoles,
  type PortPreset,
} from "@/lib/portGeometry";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * The plugs of model batteries and motors and the serial port in the Port opening's list: XT30,
 * XT60, MT60, MPX and D-Sub 9, from the makers' drawings, and the D-Sub's screw holes beside it.
 */

const NEW: PortPreset[] = ["xt30", "xt60", "mt60", "mpx", "dsub9"];

function bounds(points: Array<{ x: number; y: number }>) {
  return {
    minX: Math.min(...points.map((point) => point.x)),
    maxX: Math.max(...points.map((point) => point.x)),
    minY: Math.min(...points.map((point) => point.y)),
    maxY: Math.max(...points.map((point) => point.y)),
  };
}

function port(preset: PortPreset, fields: Partial<WorkplaneShape> = {}, clearance = 0): WorkplaneShape {
  const size = portPresetSize(preset, clearance);
  const asset = toolbarShapeAssets.find((entry) => entry.kind === "port")!;
  return { ...makeShapeFromAsset(asset, { x: 0, z: 0, elevation: 0 }, { width: size.width, depth: 8, height: size.height, cornerFillet: size.corner, portProfile: size.profile }), portClearance: clearance || undefined, ...fields } as WorkplaneShape;
}

describe("the new sockets of the Port opening", () => {
  it("come after RJ45, in this order, before the Powerpole blocks", () => {
    expect(PORT_PRESET_ORDER.slice(PORT_PRESET_ORDER.indexOf("rj45") + 1, PORT_PRESET_ORDER.indexOf("powerpole1"))).toEqual(NEW);
  });

  it("are the makers' sizes with about 0.25 mm of room, the D-Sub its panel cut-out", () => {
    // Amass XT30U 10.20 x 5.20, XT60 16.00 x 8.10, MT60 12.00 x 12.50; Multiplex MPX 16 x 6.4.
    expect([PORT_PRESETS.xt30.width, PORT_PRESETS.xt30.height]).toEqual([10.7, 5.7]);
    expect([PORT_PRESETS.xt60.width, PORT_PRESETS.xt60.height]).toEqual([16.5, 8.6]);
    expect([PORT_PRESETS.mt60.width, PORT_PRESETS.mt60.height]).toEqual([12.5, 13]);
    expect([PORT_PRESETS.mpx.width, PORT_PRESETS.mpx.height, PORT_PRESETS.mpx.profile]).toEqual([16.5, 6.9, "rounded"]);
    // Spectrum Control D-Sub panel cut-out, shell size 9: 19.74 x 11.18, screw holes 3.18 mm 24.99 mm apart.
    expect([PORT_PRESETS.dsub9.width, PORT_PRESETS.dsub9.height]).toEqual([19.74, 11.18]);
    expect(PORT_PRESETS.dsub9.screwHoles).toEqual({ spacing: 24.99, diameter: 3.18 });
    for (const key of NEW) expect(PORT_PROFILES).toContain(PORT_PRESETS[key].profile);
  });

  it("draw an outline exactly as wide and tall as the opening, with or without extra clearance", () => {
    for (const key of NEW) {
      for (const clearance of [0, 0.4]) {
        const size = portPresetSize(key, clearance);
        const box = bounds(portContourPoints(size.width, size.height, size.corner, 256, size.profile));
        expect(box.maxX - box.minX, `${key} ${clearance}`).toBeCloseTo(size.width, 2);
        expect(box.maxY - box.minY, `${key} ${clearance}`).toBeCloseTo(size.height, 2);
        expect(box.minY, `${key} ${clearance}`).toBeCloseTo(0, 3);
        expect(portPresetFor(size.width, size.height, size.corner, size.profile, clearance), `${key} ${clearance}`).toBe(key);
      }
    }
  });

  it("narrow one end of the XT60 and XT30 by two cut corners", () => {
    for (const key of ["xt60", "xt30"] as PortPreset[]) {
      const size = portPresetSize(key);
      const points = portContourPoints(size.width, size.height, 0, 32, size.profile);
      // Without rounding: six corners, the left end only the middle part of the height.
      expect(points).toHaveLength(6);
      const left = points.filter((point) => Math.abs(point.x + size.width / 2) < 1e-9);
      expect(left).toHaveLength(2);
      expect(Math.min(...left.map((point) => point.y))).toBeGreaterThan(0.2 * size.height);
      const right = points.filter((point) => Math.abs(point.x - size.width / 2) < 1e-9);
      expect(right.map((point) => point.y).sort()).toEqual([0, size.height]);
    }
  });

  it("make the MT60 a triangle and the D-Sub a trapezoid with sides 10 degrees from upright", () => {
    expect(portContourPoints(12.5, 13, 0, 32, "mt60")).toHaveLength(3);
    const dsub = portContourPoints(19.74, 11.18, 0, 32, "dsub9");
    expect(dsub).toHaveLength(4);
    const top = dsub.filter((point) => Math.abs(point.y - 11.18) < 1e-9);
    expect(top).toHaveLength(2);
    expect(dsub.filter((point) => Math.abs(point.y) < 1e-9)).toHaveLength(2);
    const topRight = top.find((point) => point.x > 0)!;
    const lowerRight = dsub.filter((point) => point.y < 1e-9).find((point) => point.x > 0)!;
    expect((Math.atan2(topRight.x - lowerRight.x, 11.18) * 180) / Math.PI).toBeCloseTo(10, 3);
  });

  it("keep their corner radius below half the smaller side", () => {
    for (const key of NEW) {
      const size = portPresetSize(key);
      expect(size.corner, key).toBeLessThanOrEqual(maxPortCorner(size.width, size.height, size.profile));
    }
    expect(isPolygonPortProfile("mt60")).toBe(true);
    expect(isPolygonPortProfile("hdmi")).toBe(false);
  });

  it("have an exact body: one outline of arcs and straight sides", () => {
    for (const key of ["xt30", "xt60", "mt60", "dsub9"] as PortPreset[]) {
      const profile = cadModifierProfileForShape(port(key));
      expect(profile, key).not.toBeNull();
      expect(profile!.loops, key).toHaveLength(1);
      const arcs = profile!.loops[0].segments.filter((segment) => segment.kind === "arc");
      expect(arcs.length, key).toBe(key === "mt60" ? 3 : key === "dsub9" ? 4 : 6);
    }
  });
});

describe("the D-Sub's screw holes", () => {
  it("belong to the D-Sub only, grown by the clearance", () => {
    expect(portScrewHoles("dsub9")).toEqual({ spacing: 24.99, diameter: 3.18 });
    expect(portScrewHoles("dsub9", 0.3)!.diameter).toBeCloseTo(3.78, 9);
    for (const key of PORT_PRESET_ORDER.filter((entry) => entry !== "dsub9")) expect(portScrewHoles(key), key).toBeNull();
    expect(screwHolesOfPort(port("dsub9"))).toEqual({ spacing: 24.99, diameter: 3.18 });
    expect(screwHolesOfPort(port("xt60"))).toBeNull();
    // An opening changed by hand is no D-Sub any more.
    expect(screwHolesOfPort({ ...port("dsub9"), width: 25 })).toBeNull();
  });

  it("stand 24.99 mm apart at the opening's middle height, as holes of their own as deep as it", () => {
    const opening = port("dsub9", { x: 10, z: -4, elevation: 2 });
    const holes = portScrewHoleShapes(opening);
    expect(holes).toHaveLength(2);
    for (const hole of holes) {
      expect(hole.kind).toBe("port");
      expect(hole.hole).toBe(true);
      expect(hole.width).toBeCloseTo(3.18, 9);
      expect(hole.height).toBeCloseTo(3.18, 9);
      expect(hole.cornerFillet).toBeCloseTo(1.59, 9);
      expect(hole.depth).toBeCloseTo(8, 9);
      expect(hole.z).toBeCloseTo(-4, 9);
      // middle height: 2 + 11.18 / 2
      expect((hole.elevation ?? 0) + hole.height / 2).toBeCloseTo(2 + 11.18 / 2, 9);
    }
    expect(holes.map((hole) => hole.x).sort((a, b) => a - b)).toEqual([expect.closeTo(10 - 12.495, 9), expect.closeTo(10 + 12.495, 9)]);
  });

  it("turn with the opening", () => {
    const holes = portScrewHoleShapes(port("dsub9", { x: 0, z: 0, elevation: 0, rotation: 90 }));
    for (const hole of holes) {
      expect(hole.rotation).toBe(90);
      expect(hole.x).toBeCloseTo(0, 9);
      expect(Math.abs(hole.z)).toBeCloseTo(12.495, 9);
    }
  });

  it("come with the opening as one hole group named D-Sub 9, the other sockets not", () => {
    const group = portWithScrewHolesGroup(port("dsub9", { x: 10, z: -4, elevation: 2 }))!;
    expect(group.name).toBe("D-Sub 9");
    expect(group.hole).toBe(true);
    expect(group.groupedShapes).toHaveLength(3);
    expect(group.groupedShapes!.every((part) => part.kind === "port" && part.hole)).toBe(true);
    // from one hole's outer edge to the other's: 24.99 + 3.18; as tall as the opening, where it stood
    expect(group.width).toBeCloseTo(24.99 + 3.18, 6);
    expect(group.height).toBeCloseTo(11.18, 6);
    expect(group.elevation).toBeCloseTo(2, 6);
    expect(group.x).toBeCloseTo(10, 6);
    expect(group.z).toBeCloseTo(-4, 6);
    expect(portWithScrewHolesGroup(port("xt60"))).toBeNull();
  });
});

type Tool = { name: string; inputSchema: { properties: Record<string, { type?: string; enum?: string[] }> } };

describe("the MCP", () => {
  it("offers the new sockets, their outlines and the screw holes", () => {
    const create = (tools as Tool[]).find((entry) => entry.name === "layerling_create_shape")!;
    expect(create.inputSchema.properties.portPreset.enum).toEqual(PORT_PRESET_ORDER);
    expect(create.inputSchema.properties.portProfile.enum).toEqual(PORT_PROFILES);
    expect(create.inputSchema.properties.portScrewHoles.type).toBe("boolean");
  });
});
