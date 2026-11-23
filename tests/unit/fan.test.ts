import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
// @ts-expect-error the tool list is a plain .mjs module
import { tools } from "../../scripts/layerling-mcp-tools.mjs";
import { editorHistoryEntry } from "@/lib/editorHistory";
import { exportLylProject, importLylProject, type LylProjectDocumentV1 } from "@/lib/lylProject";
import {
  blowerSpiralPoint,
  DEFAULT_FAN,
  FAN_ORDER,
  FANS,
  fanSolids,
  fanSolidsExtent,
  MAX_FAN_CLEARANCE,
  MAX_FAN_REACH,
  normalizeFanSettings,
} from "@/lib/fans";
import { groupMarksOf } from "@/lib/groupMarks";
import { fanAsset, libraryShapeAssets, makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { SHAPE_LIBRARY_SECTIONS } from "@/lib/shapeLibrarySections";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";
import { canonicalizeShape, workplaneShapesEqual } from "@/lib/workplaneShapes";
import type { FanSettings, WorkplaneShape } from "@/types/layerling";

function fanBody(id: string, fan: FanSettings = { fan: "axial3010", clearance: 0.3, inletReach: 4 }): WorkplaneShape {
  const box = makeShapeFromAsset(toolbarShapeAssets.find((asset) => asset.id === "box")!);
  return canonicalizeShape({ ...box, id, name: "Fan", fan });
}

async function exported(shapes: WorkplaneShape[]) {
  return exportLylProject({
    projectId: "fan",
    projectName: "Fan",
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
}

async function withDefinition(patch: Record<string, unknown>) {
  const files = unzipSync(await exported([fanBody("fan")]));
  const document = JSON.parse(strFromU8(files["project.json"])) as LylProjectDocumentV1;
  document.states.forEach((state) => state.nodes.forEach((node) => Object.assign(node.definition, patch)));
  files["project.json"] = strToU8(JSON.stringify(document));
  return zipSync(files);
}

const byName = (solids: ReturnType<typeof fanSolids>, name: string) => solids.find((solid) => solid.name === name)!;

describe("fan data (Discussion #1962)", () => {
  it("knows the radial blowers, the 5015 first, then the axial fans by size", () => {
    expect(FAN_ORDER).toEqual([
      "blower5015", "blower5015wide", "blower4020", "blower4010",
      "axial2510", "axial3010", "axial4010", "axial4020", "axial6015", "axial6025", "axial8025", "axial9225", "axial12025",
    ]);
    expect(DEFAULT_FAN).toBe("blower5015");
    for (const type of FAN_ORDER) expect(FANS[type].type).toBe(type);
  });

  it("measures the 5015 as NopSCADlib's RB5015, its holes as the GDSTIME and YOUNUON drawings", () => {
    const blower = FANS.blower5015;
    expect([blower.width, blower.depth, blower.height]).toEqual([51.3, 51, 15]);
    expect(blower.screwHole).toBe(4.6);
    const [[ax, ay], [bx, by]] = blower.screwHoles;
    expect(Math.hypot(bx - ax, by - ay)).toBeCloseTo(57, 2);
    expect(blower.bore).toBe(31.5);
    expect(blower.kind === "blower" && blower.exitWidth).toBe(20);
  });

  it("gives the wide-outlet 5015 the same casing and holes with a 38 x 15 nozzle, 34 x 12.5 inside", () => {
    const wide = FANS.blower5015wide;
    const blower = FANS.blower5015;
    expect([wide.width, wide.depth, wide.height, wide.axis, wide.screwHoles, wide.screwHole]).toEqual([blower.width, blower.depth, blower.height, blower.axis, blower.screwHoles, blower.screwHole]);
    if (wide.kind !== "blower") throw new Error("a blower");
    expect(wide.exitWidth).toBe(38);
    expect(wide.exitWidth - 2 * wide.wall).toBe(34);
    expect(wide.height - wide.base - wide.top).toBe(12.5);
  });

  it("measures the 3010 as Delta's AFB0305 drawing: four 3.2 holes 24 apart, a 29 cut-out", () => {
    const axial = FANS.axial3010;
    expect([axial.width, axial.depth, axial.height]).toEqual([30, 30, 10]);
    expect(axial.screwHole).toBe(3.2);
    const xs = new Set(axial.screwHoles.map(([x]) => x));
    expect([...xs].sort((a, b) => a - b)).toEqual([3, 27]);
    expect(axial.screwHoles).toHaveLength(4);
    expect(axial.opening).toBe(29);
  });

  it("runs the blower's spiral round the casing's box", () => {
    const blower = FANS.blower5015;
    // Left at 0°, the back edge at 90°, the right edge at 180°, as the casing's box says.
    expect(blowerSpiralPoint(blower, 0)[0]).toBeCloseTo(0, 6);
    expect(blowerSpiralPoint(blower, 90)[1]).toBeCloseTo(51, 6);
    expect(blowerSpiralPoint(blower, 180)[0]).toBeCloseTo(51.3, 6);
    // It narrows towards the nozzle: the tongue at 360° is inside where it started.
    expect(blowerSpiralPoint(blower, 358)[0]).toBeGreaterThan(5);
  });
});

describe("fan settings", () => {
  it("are read safely, a reach of 0 left out", () => {
    expect(normalizeFanSettings({ fan: "axial3010", clearance: 0.25 })).toEqual({ fan: "axial3010", clearance: 0.25 });
    expect(normalizeFanSettings({ fan: "blower5015" })).toEqual({ fan: "blower5015", clearance: 0 });
    expect(normalizeFanSettings({ fan: "blower5015", clearance: 9, inletReach: 80, outletReach: 0, screwReach: 3 })).toEqual({ fan: "blower5015", clearance: MAX_FAN_CLEARANCE, inletReach: MAX_FAN_REACH, screwReach: 3 });
    expect(normalizeFanSettings({ fan: "4010" })).toBeNull();
    expect(normalizeFanSettings(null)).toBeNull();
  });

  it("are kept through saving and loading, and by Done in Edit Bundle", async () => {
    const fan = fanBody("fan");
    const plain = canonicalizeShape({ ...fanBody("plain"), fan: undefined });
    const restored = await importLylProject(await exported([fan, plain]));
    const byId = new Map(restored.shapes.map((shape) => [shape.id, shape]));
    expect(byId.get("fan")!.fan).toEqual({ fan: "axial3010", clearance: 0.3, inletReach: 4 });
    expect(workplaneShapesEqual(byId.get("fan")!, fan)).toBe(true);
    expect(byId.get("plain")!.fan).toBeUndefined();
    expect(groupMarksOf(fan).fan).toEqual(fan.fan);
    expect(workplaneShapesEqual(fan, { ...fan, fan: { fan: "axial3010", clearance: 0.3, inletReach: 5 } })).toBe(false);
  });

  it("refuses an unknown fan or a value out of range", async () => {
    await expect(importLylProject(await withDefinition({ fan: { fan: "4010", clearance: 0 } }))).rejects.toThrow(/fan\.fan/);
    await expect(importLylProject(await withDefinition({ fan: { fan: "axial3010", clearance: 3 } }))).rejects.toThrow(/fan\.clearance/);
    await expect(importLylProject(await withDefinition({ fan: { fan: "axial3010", clearance: 0, outletReach: 51 } }))).rejects.toThrow(/fan\.outletReach/);
    await expect(importLylProject(await withDefinition({ fan: { fan: "axial3010", clearance: 0, screwReach: "2" } }))).rejects.toThrow(/fan\.screwReach/);
  });
});

describe("fan bodies", () => {
  it("draws the openings, the hub and the screw holes on a solid body when nothing reaches out", () => {
    const solids = fanSolids({ fan: "blower5015", clearance: 0 });
    expect(byName(solids, "Body")).toMatchObject({ form: "outline", x0: 0, x1: 51.3, y0: 0, y1: 51, bottom: 0, top: 15 });
    expect(solids.filter((solid) => solid.role === "reach")).toEqual([]);
    expect(byName(solids, "Inlet")).toMatchObject({ role: "opening", form: "cylinder", bottom: 15 });
    expect(byName(solids, "Inlet").x1 - byName(solids, "Inlet").x0).toBeCloseTo(31.5, 6);
    // The nozzle's mouth on the front face, inside its walls.
    expect(byName(solids, "Outlet")).toMatchObject({ role: "opening", form: "box", x0: 1.2, x1: 18.8, y1: 0, bottom: 1.5, top: 13.7 });
    expect(solids.filter((solid) => solid.name.startsWith("Screw hole"))).toHaveLength(2);
    const extent = fanSolidsExtent(solids);
    expect(extent.bottom).toBe(0);
  });

  it("reaches the blower's inlet up, its outlet out of the nozzle and its screw holes out of both faces", () => {
    const solids = fanSolids({ fan: "blower5015", clearance: 0.5, inletReach: 4, outletReach: 6, screwReach: 3 });
    expect(byName(solids, "Body")).toMatchObject({ x0: -0.5, x1: 51.8, y0: -0.5, y1: 51.5, bottom: -0.5, top: 15.5 });
    const inlet = byName(solids, "Inlet");
    expect(inlet).toMatchObject({ role: "reach", bottom: 15.5, top: 19.5 });
    expect(inlet.x1 - inlet.x0).toBeCloseTo(32.5, 6);
    expect(solids.some((solid) => solid.name === "Hub")).toBe(false);
    expect(byName(solids, "Outlet")).toMatchObject({ role: "reach", x0: -0.5, x1: 20.5, y0: -6.5, y1: -0.5, bottom: -0.5, top: 15.5 });
    const screws = solids.filter((solid) => solid.name.startsWith("Screw hole"));
    expect(screws).toHaveLength(4);
    // The screw holes keep their size whatever the clearance.
    for (const screw of screws) expect(screw.x1 - screw.x0).toBeCloseTo(4.6, 6);
    expect(fanSolidsExtent(solids)).toMatchObject({ bottom: -3.5, top: 19.5, minY: -6.5 });
  });

  it("draws the wide outlet's mouth and reaches it out as wide as its nozzle", () => {
    expect(byName(fanSolids({ fan: "blower5015wide", clearance: 0 }), "Outlet")).toMatchObject({ role: "opening", x0: 2, x1: 36, bottom: 1.25, top: 13.75 });
    expect(byName(fanSolids({ fan: "blower5015wide", clearance: 0.5, outletReach: 3 }), "Outlet")).toMatchObject({ role: "reach", x0: -0.5, x1: 38.5, y0: -3.5, y1: -0.5, bottom: -0.5, top: 15.5 });
  });

  it("takes each axial fan's frame, holes and spacing from Delta's drawings", () => {
    const delta: Record<string, [number, number, number, number]> = {
      axial2510: [25, 10, 20, 2.8], axial3010: [30, 10, 24, 3.2], axial4010: [40, 10, 32, 3.2], axial4020: [40, 20, 32, 3.5],
      axial6015: [60, 15, 50, 4.5], axial6025: [60, 25.4, 50, 4.5], axial8025: [80, 25.4, 71.5, 4.5], axial9225: [92, 25.4, 82.5, 4.5], axial12025: [120, 25.4, 105, 4.5],
    };
    for (const [type, [width, height, spacing, hole]] of Object.entries(delta)) {
      const spec = FANS[type as keyof typeof FANS];
      expect([spec.width, spec.depth, spec.height, spec.screwHole]).toEqual([width, width, height, hole]);
      const xs = [...new Set(spec.screwHoles.map(([x]) => x))].sort((a, b) => a - b);
      expect(xs[1] - xs[0]).toBeCloseTo(spacing, 6);
      expect(spec.screwHoles).toHaveLength(4);
    }
  });

  it("cuts an axial fan's opening as Delta's panel cut-out: round, cut square where the drawing has a square", () => {
    const inlet = byName(fanSolids({ fan: "axial12025", clearance: 0, inletReach: 3 }), "Inlet");
    expect(inlet).toMatchObject({ role: "reach", form: "cylinder", square: 117, round: 132, x0: 1.5, x1: 118.5 });
    const small = byName(fanSolids({ fan: "axial3010", clearance: 0.5, inletReach: 3 }), "Inlet");
    expect(small.square).toBeUndefined();
    expect(small.x1 - small.x0).toBeCloseTo(30, 6);
  });

  it("gives the 4020 blower lugs lower than its casing, its holes starting on their tops", () => {
    const solids = fanSolids({ fan: "blower4020", clearance: 0, screwReach: 2 });
    const lugs = solids.filter((solid) => solid.form === "lug");
    expect(lugs).toHaveLength(3);
    for (const lug of lugs) expect(lug).toMatchObject({ bottom: 0, top: 13 });
    expect(byName(solids, "Screw hole 1")).toMatchObject({ bottom: 13, top: 15 });
    expect(byName(solids, "Body")).toMatchObject({ form: "outline", top: 20 });
  });

  it("puts the square 4010 blower's outlet in the middle of its front", () => {
    expect(byName(fanSolids({ fan: "blower4010", clearance: 0 }), "Outlet")).toMatchObject({ role: "opening", x0: 6.1, x1: 33.9, bottom: 1.5, top: 8.5 });
  });

  it("reaches an axial fan's outlet down out of its underside", () => {
    const solids = fanSolids({ fan: "axial3010", clearance: 0, outletReach: 5 });
    expect(byName(solids, "Body")).toMatchObject({ form: "box", x1: 30, y1: 30, top: 10 });
    const outlet = byName(solids, "Outlet");
    expect(outlet).toMatchObject({ role: "reach", form: "cylinder", bottom: -5, top: 0 });
    expect(outlet.x1 - outlet.x0).toBeCloseTo(29, 6);
    expect(solids.filter((solid) => solid.name.startsWith("Screw hole"))).toHaveLength(4);
  });
});

describe("the Fan in the shape library", () => {
  it("is its own entry after the SBC board, in the systems section", () => {
    const ids = libraryShapeAssets.map((asset) => asset.id);
    expect(ids.indexOf("fan")).toBe(ids.indexOf("sbcBoard") + 1);
    expect(fanAsset.src).toContain("fan.png");
    expect(SHAPE_LIBRARY_SECTIONS.find((section) => section.id === "systems")!.shapes).toContain("fan");
  });
});

type Tool = { name: string; inputSchema: { properties: Record<string, { type?: string; enum?: string[]; minimum?: number; maximum?: number }>; required?: string[] } };

describe("layerling_create_fan", () => {
  const tool = (tools as Tool[]).find((entry) => entry.name === "layerling_create_fan")!;

  it("is in the tool list with the card's choices", () => {
    expect(tool).toBeDefined();
    expect(tool.inputSchema.required).toBeUndefined();
    expect(tool.inputSchema.properties.fan.enum).toEqual(FAN_ORDER);
    expect(tool.inputSchema.properties.clearance).toMatchObject({ minimum: 0, maximum: MAX_FAN_CLEARANCE });
    for (const key of ["inletReach", "outletReach", "screwReach"]) expect(tool.inputSchema.properties[key]).toMatchObject({ minimum: 0, maximum: MAX_FAN_REACH });
  });
});
