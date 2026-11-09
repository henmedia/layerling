import manifoldModule, { type ManifoldToplevel } from "manifold-3d";
import { beforeAll, describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  GRIDFINITY_LIP_HEIGHT,
  gridfinityDividerPositions,
  gridfinityFootprintPatch,
  gridfinityGrowth,
  gridfinityHasPieces,
  gridfinityLabelledTriangles,
  gridfinityOverhang,
  gridfinityOverhangChamfer,
  gridfinityOverhangChamferMax,
  gridfinityOverhangPatch,
  gridfinityOverhangPieces,
  gridfinityOverhangSupportSides,
  gridfinityPlan,
  gridfinityShapePatch,
  gridfinitySize,
  gridfinityTriangles,
  gridfinityUnits,
} from "@/lib/gridfinityGeometry";
import { canonicalizeShape, shapeLocalOffset, workplaneShapesEqual } from "@/lib/workplaneShapes";
import { cadModifierGridfinityForShape } from "@/lib/cadProfileExtrusion";
import { editorHistoryEntry } from "@/lib/editorHistory";
import { meshForShape } from "@/lib/editorMeshCore";
import { mcpShapeSummary } from "@/lib/editorMcpSummary";
import { exportLylProject, importLylProject } from "@/lib/lylProject";
import { rememberManifoldRuntime } from "@/lib/manifoldHandle";
import { mcpGridfinityOverhangPatch } from "@/lib/mcpShapeSettings";
import { sceneShape } from "@/lib/shapeCatalog";
import { shapeGeometrySignature } from "@/components/workplane/viewportShapeObjects";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE, normalizeShapeCustomizations } from "@/lib/workplaneSettings";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * A bin's overhang: its body above the feet reaching out beyond the grid on a side, over a baseplate's padding to
 * the drawer's wall, the feet staying where they are.
 */

const bin = (fields: Record<string, unknown> = {}) => ({ width: 83.5, depth: 41.5, height: 21 + GRIDFINITY_LIP_HEIGHT, gridfinityType: "bin" as const, gridfinityLip: true, ...fields });
const plate = (fields: Record<string, unknown> = {}) => ({ width: 84, depth: 42, height: 5, gridfinityType: "baseplate" as const, ...fields });
const ov = (back: number, front: number, left: number, right: number) => ({ gridfinityOverhangBack: back, gridfinityOverhangFront: front, gridfinityOverhangLeft: left, gridfinityOverhangRight: right });

describe("gridfinity bin overhang: size", () => {
  it("grows a bin's box by the overhang plus the clearance, only on overhung sides", () => {
    expect(gridfinityOverhangPatch(bin(), { right: 19.75 })).toEqual({ fields: { gridfinityOverhangRight: 19.75 }, width: 103.5, depth: 41.5, shift: { x: 10, z: 0 } });
    expect(gridfinityOverhangPatch(bin(), { left: -3, back: 50 })).toEqual({ fields: { gridfinityOverhangLeft: 0, gridfinityOverhangBack: 41 }, width: 83.5, depth: 82.75, shift: { x: 0, z: -20.625 } });
    // Taken back to none, the box and the bin's middle come back.
    expect(gridfinityOverhangPatch(bin({ width: 103.5, ...ov(0, 0, 0, 19.75) }), { right: 0 })).toEqual({ fields: { gridfinityOverhangRight: 0 }, width: 83.5, depth: 41.5, shift: { x: -10, z: 0 } });
  });

  it("reads the units back exactly from an overhung box, and keeps the overhang through a change of units", () => {
    const overhung = bin({ width: 103.5, ...ov(0, 0, 0, 19.75) });
    expect(gridfinityUnits(overhung)).toEqual({ x: 2, z: 1, y: 3 });
    expect(gridfinityFootprintPatch(overhung)).toEqual({ width: 103.5, depth: 41.5, height: 25.4 });
    expect(gridfinityShapePatch(overhung, { x: 3 })).toMatchObject({ width: 145.5, depth: 41.5 });
    // A drag to 140 mm reads (140 + 0.5 - 20) / 42 = 2.87, three units, and the box takes the overhang back on.
    expect(gridfinityFootprintPatch({ ...overhung, width: 140 })).toEqual({ width: 145.5, depth: 41.5, height: 25.4 });
  });

  it("overhangs a bin only: a baseplate and a tray keep the settings and are built as before", () => {
    expect(gridfinityOverhang(plate(ov(5, 5, 5, 5)))).toEqual({ back: 0, front: 0, left: 0, right: 0 });
    expect(gridfinityGrowth(plate(ov(5, 5, 5, 5)))).toEqual({ back: 0, front: 0, left: 0, right: 0 });
    expect(gridfinityGrowth(bin({ gridfinityType: "tray", ...ov(5, 5, 5, 5) }))).toEqual({ back: 0, front: 0, left: 0, right: 0 });
    expect(gridfinityTriangles(plate(ov(5, 5, 5, 5)))).toStrictEqual(gridfinityTriangles(plate()));
  });

  it("never reads a baseplate's padding on a bin", () => {
    expect(gridfinityGrowth(bin({ gridfinityPaddingLeft: 9 }))).toEqual({ back: 0, front: 0, left: 0, right: 0 });
  });

  it("drops the overhang from a baseplate's size and brings it back on the bin", () => {
    const overhung = bin({ width: 103.5, ...ov(0, 0, 0, 19.75) });
    const asPlate = gridfinityShapePatch(overhung, { type: "baseplate" });
    expect(asPlate).toMatchObject({ width: 84, depth: 42 });
    expect(gridfinityShapePatch({ ...overhung, ...asPlate }, { type: "bin" })).toMatchObject({ width: 103.5, depth: 41.5 });
  });

  it("leaves a bin without overhang fields exactly as before", () => {
    expect(gridfinitySize("bin", { x: 2, z: 1, y: 3 })).toEqual({ width: 83.5, depth: 41.5, height: 25.4 });
    expect(gridfinityGrowth(bin())).toEqual({ back: 0, front: 0, left: 0, right: 0 });
  });
});

describe("gridfinity bin overhang: plan", () => {
  /** 2 x 1 x 3 with the lip, overhung 19.75 mm on the right. */
  const right = (fields: Record<string, unknown> = {}) => bin({ width: 103.5, gridfinityOverhangRight: 19.75, ...fields });

  it("plans a grown overhang: the outer box, the feet off its middle, the inside across the full width", () => {
    const p = gridfinityPlan(right());
    expect(p.size).toMatchObject({ width: 103.5, depth: 41.5 });
    expect(p.cells.map((c) => c.x)).toEqual([-31, 11]);
    expect(p.overhang).toMatchObject({ mode: "grown", offset: { x: 0, z: 0 }, chamfer: 0, outer: { width: 103.5, depth: 41.5 } });
    // Spread across the full inside, 103.5 - 2 x 0.95 = 101.6, not 83.5's: the one divider sits at its middle.
    expect(gridfinityDividerPositions(right({ gridfinityCompartmentsX: 2 }), "x")).toEqual([50.8]);
  });

  it("plans a ring overhang: the grid bin in the middle of its own plan, its offset in the box and the ring's top", () => {
    const p = gridfinityPlan(right({ gridfinityOverhangLipOnGrid: true }));
    expect(p.size).toMatchObject({ width: 83.5, depth: 41.5 });
    expect(p.cells.map((c) => c.x)).toEqual([-21, 21]);
    expect(p.overhang).toMatchObject({ mode: "ring", offset: { x: -10, z: 0 }, ringTop: 21, outer: { width: 103.5, depth: 41.5 } });
    // Solid with the lip on the wider outline: a flat top flush with the lip's top.
    // Solid with the lip on the wider outline: flat 0.35 mm under the lip's sharp top, or under its chamfer if larger.
    expect(gridfinityPlan(right({ gridfinityOverhangSolid: true })).overhang).toMatchObject({ mode: "ring", ringTop: 25.35 });
    expect(gridfinityPlan(right({ gridfinityOverhangSolid: true, gridfinityLipChamfer: 0.5 })).overhang).toMatchObject({ mode: "ring", ringTop: 24.99 });
    expect(gridfinityPlan(right({ gridfinityOverhangSolid: true, gridfinityLip: false, height: 21 })).overhang).toMatchObject({ mode: "ring", ringTop: 21 });
    // The shelves, scoops and dividers read the same grid plan.
    expect(gridfinityDividerPositions(right({ gridfinityOverhangSolid: true, gridfinityCompartmentsX: 2 }), "x")).toEqual([40.8]);
  });

  it("limits a hollow overhang's chamfer to the height above the feet less two floors, and names the sides flatter than 45 degrees", () => {
    const three = right({ gridfinityOverhangChamfer: 99 });
    expect(gridfinityOverhangChamferMax(three)).toBe(13.85);
    expect(gridfinityOverhangChamfer(three)).toBe(13.85);
    expect(gridfinityOverhangSupportSides(three)).toEqual(["right"]);
    expect(gridfinityOverhangChamfer(right({ gridfinityOverhangChamfer: -2 }))).toBe(0);
    expect(gridfinityOverhangSupportSides(right())).toEqual([]);
    // 20 mm up over the right's 20 mm is 45 degrees; less is flatter.
    const four = right({ height: 32.4, gridfinityOverhangChamfer: 20 });
    expect(gridfinityOverhangSupportSides(four)).toEqual([]);
    expect(gridfinityOverhangSupportSides({ ...four, gridfinityOverhangChamfer: 19.9 })).toEqual(["right"]);
    // 10.25 mm at the back rises the same 20 mm, steeper.
    expect(gridfinityOverhangSupportSides({ ...four, gridfinityOverhangBack: 10, depth: 51.75 })).toEqual([]);
    expect(gridfinityOverhangSupportSides({ ...four, gridfinityOverhangChamfer: 15, gridfinityOverhangBack: 10, depth: 51.75 })).toEqual(["right"]);
  });

  it("lets a solid overhang's chamfer rise to 0.6 mm under its top at the outer wall", () => {
    // 3 units with the lip: the top 0.05 under the lip's peak at 25.4, 0.6 left over the slope: 25.35 - 4.75 - 0.6.
    const solid = right({ gridfinityOverhangSolid: true });
    expect(gridfinityOverhangChamferMax(solid)).toBe(20);
    // With the lip's chamfer the outer edge is that much lower; with the lip kept on the grid, the top is at its foot (21).
    expect(gridfinityOverhangChamferMax({ ...solid, gridfinityLipChamfer: 1 })).toBe(19);
    expect(gridfinityOverhangChamferMax({ ...solid, gridfinityOverhangLipOnGrid: true })).toBe(15.65);
    expect(gridfinityOverhangChamferMax(right({ gridfinityOverhangLipOnGrid: true }))).toBe(15.65);
  });

  it("slopes each side straight from its foot line up to the chamfer's height at the outer wall, its angle its own", () => {
    // 15.6 at the front, 13.2 on the left, 6.8 on the right (15.85, 13.45, 7.05 from the bin's walls), 13.8 mm.
    const shape = bin({ width: 104, depth: 57.35, gridfinityOverhangFront: 15.6, gridfinityOverhangLeft: 13.2, gridfinityOverhangRight: 6.8, gridfinityOverhangChamfer: 13.8 });
    const wedges = Object.fromEntries(gridfinityOverhangPieces(gridfinityPlan(shape))!.wedges.map((w) => [w.side, w]));
    const reach: Record<string, number> = { front: 15.85, left: 13.45, right: 7.05 };
    const wall: Record<string, number> = { front: 28.675, left: 52, right: 52 };
    ["front", "left", "right"].forEach((side) => {
      const section = wedges[side].section;
      const [, [u1, y1], [u2, y2]] = section;
      // Starts on the foot line and rises 13.8 over the side's whole reach (the left and right a micrometre less, so they
      // never meet another through a rounded corner's vertex).
      expect(u2, side).toBeCloseTo(wall[side] - reach[side], 9);
      expect(y2, side).toBe(4.75);
      const slope = (y1 - y2) / (u1 - u2);
      expect(slope, side).toBeCloseTo(13.8 / reach[side], 3);
      expect(wedges[side].lift, side).toBeCloseTo(1.2 * Math.hypot(1, 13.8 / reach[side]), 9);
      expect(Math.min(...section.map(([, y]) => y)), side).toBe(section[0][1]);
    });
  });

  it("starts the slope on the foot line however low the chamfer, hollow or solid", () => {
    const back = bin({ depth: 82.75, height: 53.4, gridfinityHalfGrid: true, gridfinityOverhangBack: 41, gridfinityOverhangChamfer: 5 });
    [false, true].forEach((solid) => {
      const plan = gridfinityPlan({ ...back, gridfinityOverhangSolid: solid });
      const wedge = gridfinityOverhangPieces(plan)!.wedges[0];
      const foot = plan.overhang!.outer.depth / 2 - plan.overhang!.growth.back;
      expect(wedge.section.some(([u, y]) => Math.abs(u - foot) < 1e-9 && y === 4.75), `solid ${solid}`).toBe(true);
    });
  });

  it("has no overhang plan or pieces without an overhang, so a bin builds as before", () => {
    expect(gridfinityPlan(bin()).overhang).toBeNull();
    expect(gridfinityOverhangPieces(gridfinityPlan(bin()))).toBeNull();
    expect(gridfinityPlan(bin({ gridfinityOverhangChamfer: 5, gridfinityOverhangSolid: true })).overhang).toBeNull();
    expect(gridfinityHasPieces(bin({ gridfinityOverhangSolid: true }))).toBe(false);
  });

  it("lays a wedge and a skin under each chamfered side, and none without a chamfer", () => {
    const pieces = gridfinityOverhangPieces(gridfinityPlan(right({ height: 32.4, gridfinityOverhangChamfer: 20 })))!;
    expect(pieces.wedges.map((w) => w.side)).toEqual(["right"]);
    expect(pieces.wedges[0].section).toContainEqual([31.75, 4.75]);
    // Lifted a floor's thickness square to the 45 degree slope: 1.2 / cos 45.
    expect(pieces.wedges[0].lift).toBeCloseTo(1.2 * Math.SQRT2, 4);
    expect(pieces.ring).toBeNull();
    expect(pieces.envelope).toMatchObject({ hx: 51.75, hz: 20.75 });
    expect(gridfinityOverhangPieces(gridfinityPlan(right({ height: 32.4 })))!.wedges).toEqual([]);
    expect(gridfinityHasPieces(right({ gridfinityOverhangChamfer: 5 }))).toBe(true);
    expect(gridfinityHasPieces(right())).toBe(false);
  });

  it("lays a ring around the grid bin where the overhang is solid", () => {
    const pieces = gridfinityOverhangPieces(gridfinityPlan(right({ gridfinityOverhangSolid: true })))!;
    // The hole is the bin without overhang set in 0.3 mm, into its wall: x from -51.45 to 31.45, z from -20.45 to 20.45,
    // its corners on the bin's corner centres. The ring is the box beyond those centres (31.75 - 3.75 = 28) less the hole.
    const { inner, zones } = pieces.ring!;
    // Up to where the lip is 0.35 mm thick, then a cap 0.02 mm into the wall up past the lip's peak, the whole bin
    // trimmed flat 0.05 mm under the peak.
    expect(pieces.ring).toMatchObject({ from: 4.75, to: 25.05, open: [], cap: { from: 25.04, to: 25.41 }, trim: 25.35 });
    expect(pieces.ring!.cap!.inner.cx + pieces.ring!.cap!.inner.hx).toBeCloseTo(31.73, 9);
    expect(inner.cx - inner.hx).toBeCloseTo(-51.45, 9);
    expect(inner.cx + inner.hx).toBeCloseTo(31.45, 9);
    expect(inner.hz).toBeCloseTo(20.45, 9);
    expect(inner.radius).toBeCloseTo(3.45, 9);
    expect(zones).toHaveLength(1);
    expect(zones[0].x0).toBeCloseTo(28, 9);
    expect(gridfinityHasPieces(right({ gridfinityOverhangSolid: true }))).toBe(true);
  });
});

type V = [number, number, number];

/** Every directed edge appears once and its reverse once: closed, consistently wound, two-manifold. */
function edgeProblems(triangles: V[][]) {
  const ids = new Map<string, number>();
  const id = (v: V) => {
    const key = v.map((n) => Math.round(n * 1e5)).join(",");
    if (!ids.has(key)) ids.set(key, ids.size);
    return ids.get(key)!;
  };
  const directed = new Map<string, number>();
  triangles.forEach((t) => {
    const [a, b, c] = t.map(id);
    for (const [p, q] of [[a, b], [b, c], [c, a]]) if (p !== q) directed.set(`${p}>${q}`, (directed.get(`${p}>${q}`) ?? 0) + 1);
  });
  let problems = 0;
  directed.forEach((count, key) => {
    const [p, q] = key.split(">");
    if (count !== 1 || directed.get(`${q}>${p}`) !== 1) problems += 1;
  });
  return problems;
}

function volume(triangles: V[][]) {
  return triangles.reduce((sum, [a, b, c]) => sum + (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6, 0);
}

function bounds(triangles: V[][]) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  triangles.flat().forEach((v) => v.forEach((n, i) => { min[i] = Math.min(min[i], n); max[i] = Math.max(max[i], n); }));
  return { min, max };
}

describe("gridfinity bin overhang: display mesh", { timeout: 60_000 }, () => {
  let runtime: ManifoldToplevel;
  beforeAll(async () => {
    runtime = await manifoldModule();
    runtime.setup();
  });
  const right = (fields: Record<string, unknown> = {}) => bin({ width: 103.5, gridfinityOverhangRight: 19.75, ...fields });

  it("grows the bin out to the overhung outline, closed, its underside flat on the padding", () => {
    const mesh = gridfinityLabelledTriangles(runtime, right()) as V[][];
    expect(edgeProblems(mesh)).toBe(0);
    const b = bounds(mesh);
    expect(b.min[0]).toBeCloseTo(-51.75, 6);
    expect(b.max[0]).toBeCloseTo(51.75, 6);
    expect(volume(mesh)).toBeGreaterThan(volume(gridfinityTriangles(bin()) as V[][]) + 1000);
    // Nothing of the overhang reaches below the top of the feet.
    expect(Math.min(...mesh.flat().filter((v) => v[0] > 31.8).map((v) => v[1]))).toBeCloseTo(4.75, 6);
  });

  it("keeps the lip on the grid, the overhang solid with a flat top at the lip's foot", () => {
    const mesh = gridfinityLabelledTriangles(runtime, right({ gridfinityOverhangLipOnGrid: true })) as V[][];
    expect(edgeProblems(mesh)).toBe(0);
    expect(bounds(mesh).max[0]).toBeCloseTo(51.75, 6);
    expect(Math.max(...mesh.flat().filter((v) => v[0] > 32).map((v) => v[1]))).toBeCloseTo(21, 6);
    // The lip still stands 4.4 mm over it on the grid.
    expect(bounds(mesh).max[1]).toBeCloseTo(25.4, 6);
  });

  it("chamfers the overhang's underside up from the feet to the outer wall", () => {
    const shape = right({ height: 32.4, gridfinityOverhangChamfer: 20 });
    const mesh = gridfinityLabelledTriangles(runtime, shape) as V[][];
    expect(edgeProblems(mesh)).toBe(0);
    // At the outer wall the underside is 20 mm over the feet's top.
    expect(Math.min(...mesh.flat().filter((v) => v[0] > 51.7).map((v) => v[1]))).toBeCloseTo(24.75, 2);
    // The cavity never opens through the slope: the mesh is one closed body and lighter than the flat one by less than the wedge.
    const flat = gridfinityLabelledTriangles(runtime, right({ height: 32.4 })) as V[][];
    const wedge = 0.5 * 20 * 20 * 41.5;
    expect(volume(flat) - volume(mesh)).toBeGreaterThan(0);
    expect(volume(flat) - volume(mesh)).toBeLessThan(wedge);
  });

  it("runs the floor out to the overhung outline on an open side", () => {
    const mesh = gridfinityLabelledTriangles(runtime, right({ gridfinityOpenRight: true })) as V[][];
    expect(edgeProblems(mesh)).toBe(0);
    expect(Math.max(...mesh.flat().filter((v) => Math.abs(v[1] - 5.95) < 1e-6).map((v) => v[0]))).toBeCloseTo(51.75, 6);
  });
});

describe("gridfinity bin overhang: the feet stay put", () => {
  it("moves a turned bin by half the change, so each foot stays where it was on the plate", () => {
    const shape = { ...bin(), x: 5, z: -3, rotation: 37 };
    const world = (s: typeof shape) => gridfinityPlan(s).cells.map((c) => {
      const o = shapeLocalOffset(s, c.x, c.z);
      return [s.x + o.x, s.z + o.z];
    });
    const before = world(shape);
    const patch = gridfinityOverhangPatch(shape, { right: 19.75, back: 7 });
    const move = shapeLocalOffset(shape, patch.shift.x, patch.shift.z);
    const after = world({ ...shape, ...patch.fields, width: patch.width, depth: patch.depth, x: shape.x + move.x, z: shape.z + move.z });
    after.forEach(([x, z], k) => {
      expect(x).toBeCloseTo(before[k][0], 9);
      expect(z).toBeCloseTo(before[k][1], 9);
    });
  });
});

describe("gridfinity bin overhang: saved, passed on and reached through the MCP", { timeout: 60_000 }, () => {
  const binShape = (fields: Record<string, unknown> = {}) => ({ id: "g", name: "bin", kind: "gridfinity", x: 0, z: 0, elevation: 0, size: 83.5, width: 83.5, depth: 41.5, height: 25.4, rotation: 0, color: "#4f7fa8", gridfinityType: "bin", gridfinityLip: true, ...fields }) as WorkplaneShape;
  const settings = { width: 103.5, size: 103.5, gridfinityOverhangBack: 0, gridfinityOverhangFront: 0, gridfinityOverhangLeft: 0, gridfinityOverhangRight: 19.75, gridfinityOverhangChamfer: 5, gridfinityOverhangSolid: true, gridfinityOverhangLipOnGrid: true };

  it("keeps each side's overhang to 0 to 41 mm in hundredths, and the chamfer to no less than 0", () => {
    expect(canonicalizeShape(binShape({ gridfinityOverhangLeft: -4, gridfinityOverhangRight: 99, gridfinityOverhangBack: 3.456, gridfinityOverhangChamfer: -2 }))).toMatchObject({ gridfinityOverhangLeft: 0, gridfinityOverhangRight: 41, gridfinityOverhangBack: 3.46, gridfinityOverhangChamfer: 0 });
  });

  it("tells every overhang setting apart and keeps them all through a saved project", async () => {
    const overhung = canonicalizeShape(binShape(settings));
    for (const [key, value] of Object.entries(settings)) {
      if (key === "width" || key === "size") continue;
      expect(workplaneShapesEqual(overhung, { ...overhung, [key]: typeof value === "boolean" ? !value : (value as number) + 1 }), key).toBe(false);
    }
    const project = (shapes: WorkplaneShape[]) => exportLylProject({ projectId: "overhang", projectName: "Overhang", createdAt: 1_700_000_000_000, modifiedAt: 1_700_000_100_000, shapes, history: [editorHistoryEntry(shapes, [])], historyIndex: 0, assets: [], workspace: DEFAULT_WORKPLANE_WORKSPACE, snapGrid: DEFAULT_SNAP_GRID, placementElevation: 0 });
    const [loaded] = (await importLylProject(await project([overhung]))).shapes;
    expect(workplaneShapesEqual(loaded, overhung)).toBe(true);
    expect(loaded).toMatchObject(settings);
    expect(sceneShape(overhung)).toMatchObject(settings);
    // A design saved without them loads without them.
    const [plain] = (await importLylProject(await project([canonicalizeShape(binShape())]))).shapes;
    expect(plain.gridfinityOverhangRight).toBeUndefined();
    expect(plain.gridfinityOverhangSolid).toBeUndefined();
  });

  it("passes the overhang on to the mesh the booleans use, the viewport's cache key and the exact body", async () => {
    const overhung = binShape({ width: 103.5, size: 103.5, gridfinityOverhangRight: 19.75 });
    const mesh = meshForShape(overhung);
    const xs = mesh.vertices.map((v) => v[0]);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(103.5, 6);
    expect(shapeGeometrySignature(overhung)).not.toBe(shapeGeometrySignature({ ...overhung, gridfinityOverhangRight: 10 }));
    for (const key of ["gridfinityOverhangChamfer", "gridfinityOverhangSolid", "gridfinityOverhangLipOnGrid"] as const) {
      const value = key === "gridfinityOverhangChamfer" ? 5 : true;
      expect(shapeGeometrySignature({ ...overhung, [key]: value }), key).not.toBe(shapeGeometrySignature(overhung));
    }
    rememberManifoldRuntime(await manifoldModule().then((m) => { m.setup(); return m; }));
    expect(cadModifierGridfinityForShape({ ...overhung, gridfinityOverhangChamfer: 3, gridfinityOverhangSolid: true })).toMatchObject({ gridfinityOverhangRight: 19.75, gridfinityOverhangChamfer: 3, gridfinityOverhangSolid: true });
  });

  it("keeps the overhang in a saved custom Gridfinity shape", () => {
    const entry = normalizeShapeCustomizations({ gridfinity: { gridfinityOverhangRight: 12, gridfinityOverhangChamfer: 4, gridfinityOverhangSolid: true, gridfinityOverhangLipOnGrid: true } } as never).gridfinity;
    expect(entry).toMatchObject({ gridfinityOverhangRight: 12, gridfinityOverhangChamfer: 4, gridfinityOverhangSolid: true, gridfinityOverhangLipOnGrid: true });
  });

  it("writes an overhang given through the MCP as the panel does: the box, and the bin moved so its feet stay put", () => {
    const target = binShape({ x: 5, z: 2 });
    expect(mcpGridfinityOverhangPatch(target, {}, { gridfinityOverhangRight: 19.75 })).toEqual({ width: 103.5, depth: 41.5, size: 103.5, x: 15, z: 2 });
    expect(mcpGridfinityOverhangPatch(target, {}, { gridfinityOverhangRight: "wide" })).toEqual({});
    expect(mcpGridfinityOverhangPatch({ ...target, gridfinityType: "baseplate", width: 84, depth: 42, height: 5 }, {}, { gridfinityOverhangRight: 19.75 })).toEqual({});
    expect(mcpGridfinityOverhangPatch(target, {}, { x: 3 })).toEqual({});
    expect(mcpShapeSummary(canonicalizeShape(binShape(settings))).settings).toMatchObject({ gridfinityOverhangRight: 19.75, gridfinityOverhangChamfer: 5, gridfinityOverhangSolid: true, gridfinityOverhangLipOnGrid: true });
  });
});

/** Where a vertical line at (x, z) is inside the mesh: [from, to] in y, bottom up (even-odd over the triangles it crosses). */
function column(triangles: V[][], x: number, z: number) {
  const ys: number[] = [];
  triangles.forEach(([a, b, c]) => {
    const d = (b[0] - a[0]) * (c[2] - a[2]) - (c[0] - a[0]) * (b[2] - a[2]);
    if (Math.abs(d) < 1e-12) return;
    const u = ((x - a[0]) * (c[2] - a[2]) - (c[0] - a[0]) * (z - a[2])) / d;
    const v = ((b[0] - a[0]) * (z - a[2]) - (x - a[0]) * (b[2] - a[2])) / d;
    if (u < 0 || v < 0 || u + v > 1) return;
    ys.push(a[1] + u * (b[1] - a[1]) + v * (c[1] - a[1]));
  });
  ys.sort((p, q) => p - q);
  const spans: Array<[number, number]> = [];
  for (let k = 0; k + 1 < ys.length; k += 2) spans.push([ys[k], ys[k + 1]]);
  return spans;
}

describe("gridfinity bin overhang: review fixes", { timeout: 120_000 }, () => {
  let runtime: ManifoldToplevel;
  beforeAll(async () => {
    runtime = await manifoldModule();
    runtime.setup();
  });
  const right = (fields: Record<string, unknown> = {}) => bin({ width: 103.5, gridfinityOverhangRight: 19.75, ...fields });

  it("hands a solid overhang's whole box to the exact body, so it is built with the units on screen", () => {
    rememberManifoldRuntime(runtime);
    const shape = { id: "g", name: "bin", kind: "gridfinity", x: 0, z: 0, elevation: 0, size: 113.75, rotation: 0, color: "#4f7fa8", ...bin({ width: 113.75, gridfinityOverhangRight: 30, gridfinityOverhangSolid: true }) } as WorkplaneShape;
    const part = cadModifierGridfinityForShape(shape)!;
    expect(part).toMatchObject({ width: 113.75, depth: 41.5 });
    expect(gridfinityPlan(part).count).toMatchObject({ x: 2, z: 1 });
    expect(gridfinityPlan(part).overhang?.outer).toEqual({ width: 113.75, depth: 41.5 });
  });

  it("leaves no fin hanging under a corner where two chamfered sides meet", () => {
    const mesh = gridfinityLabelledTriangles(runtime, bin({ width: 103.5, depth: 60.5, height: 32.4, gridfinityOverhangRight: 19.75, gridfinityOverhangBack: 18.75, gridfinityOverhangChamfer: 18 })) as V[][];
    expect(edgeProblems(mesh)).toBe(0);
    // At (49, -13) the right side's slope is the higher: 17.25 mm out from its foot line (31.75), 18 over 20.
    expect(column(mesh, 49, -13)[0][0]).toBeCloseTo(4.75 + (17.25 * 18) / 20, 1);
  });

  it("fills a solid overhang out to the bin's corner where it meets a side without overhang", () => {
    const mesh = gridfinityLabelledTriangles(runtime, right({ gridfinityOverhangSolid: true })) as V[][];
    expect(edgeProblems(mesh)).toBe(0);
    // Outside the grid bin's rounded corner (centre 28, 17; 3.75) and inside the box: solid from the feet's top up.
    const spans = column(mesh, 30.45, 20.35);
    expect(spans.length).toBeGreaterThan(0);
    expect(spans[0][0]).toBeCloseTo(4.75, 4);
  });

  it("joins a solid overhang to the bin's corners with no seam: solid everywhere just inside the outline, the whole height", () => {
    // Inside along a line 0.02 mm in from the rounded outline: a column there is solid from the feet's top to the ring's top.
    const solidJustInside = (shape: ReturnType<typeof bin>, top: number) => {
      const mesh = gridfinityLabelledTriangles(runtime, shape) as V[][];
      const hx = shape.width / 2;
      const hz = shape.depth / 2;
      const r = 3.75;
      const empty: string[] = [];
      const check = (x: number, z: number) => {
        const dx = Math.max(0, Math.abs(x) - (hx - r));
        const dz = Math.max(0, Math.abs(z) - (hz - r));
        if (dx * dx + dz * dz > (r - 0.015) ** 2) return;
        const spans = column(mesh, x, z);
        if (!spans.some(([from, to]) => from <= 4.76 && to >= top - 0.01)) empty.push(`${x.toFixed(2)},${z.toFixed(2)}`);
      };
      for (let x = -hx + 0.02; x < hx; x += 0.05) [-hz + 0.02, hz - 0.02].forEach((z) => check(x, z));
      for (let z = -hz + 0.02; z < hz; z += 0.05) [-hx + 0.02, hx - 0.02].forEach((x) => check(x, z));
      return empty;
    };
    // With the lip kept on the grid the ring's top is the lip's foot; the bin's own wall goes on up from there.
    expect(solidJustInside(right({ gridfinityOverhangLipOnGrid: true }), 21)).toEqual([]);
    expect(solidJustInside(bin({ depth: 61.25, gridfinityOverhangFront: 19.75, gridfinityOverhangLipOnGrid: true }), 21)).toEqual([]);
    expect(solidJustInside(right({ gridfinityOverhangSolid: true }), 21)).toEqual([]);
  });

  it("tops a solid overhang flush with the lip's peak, with nothing standing past the lip's slope inside the bin", () => {
    // The bin's right wall is at x 31.75; the lip's peak is on it at 25.4 (21 + 4.4), or with a 0.5 mm chamfer
    // 0.35 mm in and 0.35 mm lower; inside, the lip leans in at 45 degrees.
    [0, 0.5].forEach((chamfer) => {
      const mesh = gridfinityLabelledTriangles(runtime, right({ gridfinityOverhangSolid: true, gridfinityLipChamfer: chamfer })) as V[][];
      expect(edgeProblems(mesh)).toBe(0);
      const peak = 25.4 - chamfer * Math.SQRT1_2;
      const atPeak = 31.75 - chamfer * Math.SQRT1_2;
      const top = (x: number, z: number) => Math.max(...column(mesh, x, z).map(([, to]) => to));
      [0, 15, -15].forEach((z) => {
        // Flush: the overhang's top is the bin's highest point, the lip's edge trimmed to it, 0.05 mm under the peak.
        expect(top(40, z)).toBeGreaterThan(peak - 0.06);
        expect(top(40, z)).toBeCloseTo(bounds(mesh).max[1], 4);
        [0.1, 0.3, 0.6].forEach((inset) => expect(top(atPeak - inset, z)).toBeLessThanOrEqual(peak - inset + 1e-3));
      });
      // Round the corner where the overhang meets the side without one, the lip's edge stands no higher than the overhang.
      [[30.5, 18.5], [30.9, 19.5], [31.3, 20.2]].forEach(([x, z]) => {
        const spans = column(mesh, x, z);
        expect(spans.length).toBe(1);
        expect(spans[0][1]).toBeLessThanOrEqual(peak + 1e-6);
      });
    });
  });

  it("chamfers a solid overhang's outer top edge as the lip's, so the chamfer runs on round the corners", () => {
    // With a 1 mm chamfer the lip's outer wall ends 1 mm under its top (25.4) and its face rises 1 in 1 + sqrt 2 to the
    // peak; the whole top is trimmed 0.05 mm lower to meet the overhang. The overhang's outer edge (x 51.75) takes the
    // same face, so where it meets the side without overhang there is no notch.
    const mesh = gridfinityLabelledTriangles(runtime, right({ gridfinityOverhangSolid: true, gridfinityLipChamfer: 1 })) as V[][];
    expect(edgeProblems(mesh)).toBe(0);
    const face = (inset: number) => 25.4 - 1 - 0.05 + inset / (1 + Math.SQRT2);
    const top = (x: number, z: number) => Math.max(...column(mesh, x, z).map(([, to]) => to));
    [0, 15].forEach((z) => {
      [0.1, 0.4].forEach((inset) => expect(top(51.75 - inset, z), `${inset} ${z}`).toBeCloseTo(face(inset), 2));
      // Further in, the flat top.
      expect(top(45, z)).toBeCloseTo(25.4 - Math.SQRT1_2 - 0.05, 2);
    });
    // Along the side without overhang the lip's own chamfer is there as before, 0.05 mm lower: at the back, 0.1 mm in.
    expect(top(20, -20.75 + 0.1)).toBeCloseTo(face(0.1), 2);
  });

  it("keeps a solid overhang's chamfer at its highest under the top and the lip's chamfer, nothing pushing up through", () => {
    // 19 mm, the most with a 1 mm lip chamfer: 0.6 under the chamfered edge at 24.35. The top stays the lip's chamfer face.
    [{ gridfinityLipChamfer: 1, gridfinityOverhangChamfer: 99 }, { gridfinityOverhangChamfer: 99 }].forEach((fields) => {
      const shape = right({ gridfinityOverhangSolid: true, ...fields });
      const plain = gridfinityLabelledTriangles(runtime, right({ gridfinityOverhangSolid: true, gridfinityLipChamfer: fields.gridfinityLipChamfer })) as V[][];
      const mesh = gridfinityLabelledTriangles(runtime, shape) as V[][];
      expect(edgeProblems(mesh)).toBe(0);
      const top = (m: V[][], x: number, z: number) => Math.max(...column(m, x, z).map(([, to]) => to));
      [51.6, 51.2, 50, 45].forEach((x) => [0, 15].forEach((z) => expect(top(mesh, x, z), `${JSON.stringify(fields)} ${x} ${z}`).toBeCloseTo(top(plain, x, z), 4)));
    });
  });

  it("keeps a hollow overhang's skin inside the lip at its highest chamfer, however steep, nothing pushing up through", () => {
    // 6.8 on the right (7.05 from the wall) at 13.85: about 63 degrees, the skin 2.6 mm over the slope.
    [{}, { gridfinityLipChamfer: 1 }].forEach((fields) => {
      const plain = gridfinityLabelledTriangles(runtime, bin({ width: 90.55, gridfinityOverhangRight: 6.8, ...fields })) as V[][];
      const mesh = gridfinityLabelledTriangles(runtime, bin({ width: 90.55, gridfinityOverhangRight: 6.8, gridfinityOverhangChamfer: 99, ...fields })) as V[][];
      expect(edgeProblems(mesh)).toBe(0);
      const top = (m: V[][], x: number, z: number) => Math.max(...column(m, x, z).map(([, to]) => to));
      [45.2, 44.8, 43].forEach((x) => [0, 15].forEach((z) => expect(top(mesh, x, z), `${JSON.stringify(fields)} ${x} ${z}`).toBeCloseTo(top(plain, x, z), 4)));
    });
  });

  it("joins a steep chamfer's skin to the floor, with no gap between them where the slope starts", () => {
    // 6.8 mm on the right (7.05 from the bin's wall) under a 13.8 mm chamfer, about 63 degrees: the skin lifted 2.6 mm.
    // Just outside the foot line the slope is at 4.75 + 0.3 x 13.8 / 7.05 and the material runs on without a break up
    // through the floor (5.95) and the skin over the slope.
    const mesh = gridfinityLabelledTriangles(runtime, bin({ width: 90.55, gridfinityOverhangRight: 6.8, gridfinityOverhangChamfer: 13.8 })) as V[][];
    expect(edgeProblems(mesh)).toBe(0);
    const tan = 13.8 / 7.05;
    const start = 45.275 - 7.05;
    [0, 10, -10].forEach((z) => {
      const spans = column(mesh, start + 0.3, z);
      expect(spans[0][0]).toBeCloseTo(4.75 + 0.3 * tan, 2);
      expect(spans[0][1]).toBeGreaterThan(6.5);
    });
  });

  it("slopes every side to the same height at the outer wall, the slopes meeting cleanly at the corners", () => {
    const mesh = gridfinityLabelledTriangles(runtime, bin({ width: 104, depth: 57.35, gridfinityOverhangFront: 15.6, gridfinityOverhangLeft: 13.2, gridfinityOverhangRight: 6.8, gridfinityOverhangChamfer: 13.8 })) as V[][];
    expect(edgeProblems(mesh)).toBe(0);
    // Each side drops 13.8 over its reach in from its outer wall: the front's 15.85, the left's 13.45, the right's 7.05.
    [1, 3].forEach((d) => {
      expect(column(mesh, 0, 28.675 - d)[0][0]).toBeCloseTo(4.75 + 13.8 * (1 - d / 15.85), 2);
      expect(column(mesh, -52 + d, 0)[0][0]).toBeCloseTo(4.75 + 13.8 * (1 - d / 13.45), 2);
      expect(column(mesh, 52 - d, 0)[0][0]).toBeCloseTo(4.75 + 13.8 * (1 - d / 7.05), 2);
    });
  });

  it("runs the inside straight from the floor up the slope, with no step where the slope starts", () => {
    // The skin's top is a floor's thickness over the slope, square to it: higher than the floor's 1.2 mm where the slope
    // starts, so it runs on down at the slope's angle, past the start, until it meets the floor's top (5.95).
    const mesh = gridfinityLabelledTriangles(runtime, bin({ width: 104, depth: 57.35, gridfinityOverhangFront: 15.6, gridfinityOverhangLeft: 13.2, gridfinityOverhangRight: 6.8, gridfinityOverhangChamfer: 13.8 })) as V[][];
    expect(edgeProblems(mesh)).toBe(0);
    const skinTop = (reach: number, back: number) => {
      const slope = 13.8 / reach;
      return 4.75 + 1.2 * Math.hypot(1, slope) - slope * back;
    };
    // 0.2 mm short of where each slope starts, on its foot line.
    [0.2, 0.4].forEach((d) => {
      expect(column(mesh, 44.95 - d, 0)[0][1], `right ${d}`).toBeCloseTo(skinTop(7.05, d), 2);
      expect(column(mesh, -38.55 + d, 0)[0][1], `left ${d}`).toBeCloseTo(skinTop(13.45, d), 2);
      expect(column(mesh, 0, 12.825 - d)[0][1], `front ${d}`).toBeCloseTo(skinTop(15.85, d), 2);
    });
    // Further in, the floor.
    expect(column(mesh, 44.95 - 1, 0)[0][1]).toBeCloseTo(5.95, 4);
  });

  it("joins two sides rising as high at a corner without a seam", () => {
    // 19 mm from the bin's walls on the right and at the back, both risen in full: they meet on the corner's diagonal.
    const both = (fields: Record<string, unknown>) => gridfinityLabelledTriangles(runtime, bin({ width: 102.5, depth: 60.5, height: 32.4, gridfinityOverhangRight: 18.75, gridfinityOverhangBack: 18.75, ...fields })) as V[][];
    expect(edgeProblems(both({ gridfinityOverhangChamfer: 19 }))).toBe(0);
    expect(edgeProblems(both({ gridfinityOverhangChamfer: 10 }))).toBe(0);
    expect(edgeProblems(both({ gridfinityOverhangChamfer: 10, gridfinityLip: false, height: 28 }))).toBe(0);
  });

  it("keeps a side switched open open across a solid overhang, with the floor out to the outline", () => {
    const mesh = gridfinityLabelledTriangles(runtime, right({ gridfinityOverhangSolid: true, gridfinityOpenRight: true })) as V[][];
    expect(edgeProblems(mesh)).toBe(0);
    const spans = column(mesh, 45, 0);
    expect(spans).toHaveLength(1);
    expect(spans[0][0]).toBeCloseTo(4.75, 4);
    // The floor's 5.95 mm, the ring 0.01 mm under it so no face of the two lies on the other.
    expect(spans[0][1]).toBeCloseTo(5.94, 4);
  });

  it("keeps the feet of a mirrored bin where they were, as the viewport draws it", () => {
    const shape = { ...bin(), x: 5, z: -3, rotation: 37, mirrorX: true, mirrorZ: false };
    const world = (s: typeof shape) => {
      const object = new THREE.Object3D();
      object.position.set(s.x, 0, s.z);
      object.rotation.set(0, THREE.MathUtils.degToRad(s.rotation), 0);
      object.scale.set(s.mirrorX ? -1 : 1, 1, s.mirrorZ ? -1 : 1);
      object.updateMatrixWorld();
      return gridfinityPlan(s).cells.map((c) => object.localToWorld(new THREE.Vector3(c.x, 0, c.z)));
    };
    const before = world(shape);
    const patch = gridfinityOverhangPatch(shape, { right: 19.75 });
    const move = shapeLocalOffset(shape, patch.shift.x, patch.shift.z);
    const after = world({ ...shape, ...patch.fields, width: patch.width, depth: patch.depth, x: shape.x + move.x, z: shape.z + move.z });
    after.forEach((p, k) => {
      expect(p.x).toBeCloseTo(before[k].x, 9);
      expect(p.z).toBeCloseTo(before[k].z, 9);
    });
  });
});
