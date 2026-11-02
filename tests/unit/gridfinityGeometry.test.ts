import manifoldModule, { type ManifoldToplevel } from "manifold-3d";
import { beforeAll, describe, expect, it } from "vitest";
import * as THREE from "three";
import { createShapeObject, shapeGeometrySignature, tapeShapeTopologyKey } from "@/components/workplane/viewportShapeObjects";
import { cadModifierGridfinityForShape } from "@/lib/cadProfileExtrusion";
import { editorHistoryEntry } from "@/lib/editorHistory";
import { meshForShape } from "@/lib/editorMeshCore";
import { mcpShapeSummary } from "@/lib/editorMcpSummary";
import { exportLylProject, importLylProject } from "@/lib/lylProject";
import { rememberManifoldRuntime } from "@/lib/manifoldHandle";
import { mcpGridfinityListParams, mcpGridfinityOutlinePatch, mcpGridfinityPaddingPatch } from "@/lib/mcpShapeSettings";
import { makeShapeFromAsset, sceneShape, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE, normalizeShapeCustomizations } from "@/lib/workplaneSettings";
import { shapeDefaultsFromShape } from "@/lib/shapeDefaults";
import { canonicalizeShape, workplaneShapesEqual } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";
import {
  GRIDFINITY_LABEL_WALL_KEYS,
  GRIDFINITY_LIP_HEIGHT,
  GRIDFINITY_OPEN_WALL_KEYS,
  GRIDFINITY_SCOOP_WALL_KEYS,
  MAX_GRIDFINITY_LIP_CHAMFER,
  type GridfinityLabelCornerShape,
  type GridfinityLabelProfile,
  createGridfinityGeometry,
  gridfinityBinCornerFits,
  gridfinityBinCornerRadius,
  gridfinityCompartmentCount,
  gridfinityCompartmentCountPatch,
  gridfinityCompartmentCornerSize,
  gridfinityCompartmentCutBound,
  gridfinityCompartmentFloorBound,
  gridfinityCompartmentLabel,
  gridfinityCompartmentLabelLeftOut,
  gridfinityCompartmentLabelMaxWidth,
  gridfinityCompartmentMax,
  gridfinityCompartmentPieces,
  gridfinityCompartments,
  gridfinityCornerRadius,
  gridfinityDividerBound,
  gridfinityDividerFits,
  gridfinityDividerLimits,
  gridfinityDividerPositionPatch,
  gridfinityDividerPositions,
  gridfinityDividerThickness,
  gridfinityDrawerMax,
  gridfinityDrawerPatch,
  gridfinityDrawerSize,
  gridfinityFloorFits,
  gridfinityFloorHeight,
  gridfinityFloorMaxHeight,
  gridfinityFloorMinHeight,
  gridfinityFootprintPatch,
  gridfinityLabelCornerSize,
  gridfinityLabelFits,
  gridfinityLabelLength,
  gridfinityLabelLimits,
  gridfinityLabelMaxWidth,
  gridfinityLabelledTriangles,
  gridfinityLabelPieces,
  gridfinityHasPieces,
  gridfinityLipChamfer,
  gridfinityListPatch,
  gridfinityMaxUnits,
  gridfinityOpenFits,
  gridfinityOpening,
  gridfinityOpeningCornerSize,
  gridfinityOpeningCorners,
  gridfinityOpeningFits,
  gridfinityOpeningInside,
  gridfinityOpeningLimits,
  gridfinityOpeningMaxCornerSize,
  gridfinityOpeningOutline,
  gridfinityOpeningPatch,
  gridfinityOpeningSection,
  gridfinityOutlineCells,
  gridfinityOutlineFit,
  gridfinityOutlineFromLoops,
  gridfinityOutlineLimit,
  gridfinityOutlinePoints,
  gridfinityOutlineRemovalPatch,
  gridfinityOutlineToPlate,
  gridfinityPlateFlat,
  gridfinityPlateToWorld,
  gridfinityPadding,
  gridfinityPaddingPatch,
  gridfinityPlan,
  gridfinityScoopFits,
  gridfinityScoopMaxRadius,
  gridfinityScoopPieces,
  gridfinityScoopRadius,
  gridfinityScoopsLeftOut,
  gridfinityShapePatch,
  gridfinityTriangles,
  gridfinityUnitCompartments,
  gridfinityUnits,
  gridfinityWallMaxThickness,
  gridfinityWallProfile,
  gridfinityWallSolid,
  gridfinityWallThickness,
  normalizeGridfinityCompartmentLabels,
  normalizeGridfinityOpenings,
  normalizeGridfinityOutline,
  normalizeGridfinityDividerPositions,
  normalizeGridfinityType,
} from "@/lib/gridfinityGeometry";

type V = [number, number, number];

function weld(triangles: V[][]) {
  const ids = new Map<string, number>();
  const id = (v: V) => {
    const key = v.map((n) => Math.round(n * 1e5)).join(",");
    if (!ids.has(key)) ids.set(key, ids.size);
    return ids.get(key)!;
  };
  return triangles.map((t) => t.map(id) as [number, number, number]);
}

/** Every directed edge appears once and its reverse once: closed, consistently wound, two-manifold. */
function edgeProblems(triangles: V[][]) {
  const faces = weld(triangles);
  const directed = new Map<string, number>();
  faces.forEach(([a, b, c]) => {
    for (const [p, q] of [[a, b], [b, c], [c, a]]) {
      if (p === q) continue;
      const key = `${p}>${q}`;
      directed.set(key, (directed.get(key) ?? 0) + 1);
    }
  });
  let problems = 0;
  directed.forEach((count, key) => {
    const [p, q] = key.split(">");
    if (count !== 1 || directed.get(`${q}>${p}`) !== 1) problems += 1;
  });
  return problems;
}

function signedVolume(triangles: V[][]) {
  return triangles.reduce((sum, [a, b, c]) => sum + (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6, 0);
}

function components(triangles: V[][]) {
  const faces = weld(triangles);
  const parent = new Map<number, number>();
  const find = (x: number): number => { const p = parent.get(x) ?? x; if (p === x) return x; const r = find(p); parent.set(x, r); return r; };
  faces.forEach(([a, b, c]) => { parent.set(find(b), find(a)); parent.set(find(c), find(a)); });
  return new Set(faces.map(([a]) => find(a))).size;
}

function bounds(triangles: V[][]) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  triangles.flat().forEach((v) => v.forEach((n, i) => { min[i] = Math.min(min[i], n); max[i] = Math.max(max[i], n); }));
  return { min, max };
}

/** Where the solid is along x at height y, on the line z = 0.5 (clear of the mesh's own vertices): the x of every wall the line crosses. */
function crossings(triangles: V[][], y: number, z = 0.5) {
  const xs: number[] = [];
  triangles.forEach((t) => {
    const points: Array<[number, number]> = [];
    for (const [a, b] of [[t[0], t[1]], [t[1], t[2]], [t[2], t[0]]]) {
      if ((a[2] - z) * (b[2] - z) < 0) {
        const s = (z - a[2]) / (b[2] - a[2]);
        points.push([a[0] + s * (b[0] - a[0]), a[1] + s * (b[1] - a[1])]);
      }
    }
    if (points.length === 2) {
      const [[x1, y1], [x2, y2]] = points;
      if ((y1 - y) * (y2 - y) < 0) xs.push(x1 + ((y - y1) / (y2 - y1)) * (x2 - x1));
    }
  });
  return xs.sort((a, b) => a - b);
}

const bin = (fields: Record<string, unknown> = {}) => ({ width: 83.5, depth: 41.5, height: 21 + GRIDFINITY_LIP_HEIGHT, gridfinityType: "bin" as const, gridfinityLip: true, ...fields });
const plate = (fields: Record<string, unknown> = {}) => ({ width: 84, depth: 42, height: 5, gridfinityType: "baseplate" as const, ...fields });
/** A bin of 2 x 2 x 3 units: 81.6 mm inside both ways. */
const square = { width: 83.5, depth: 83.5 };
const piecesOf = (fields: Record<string, unknown>) => gridfinityLabelPieces(bin(fields))!;

type LabelPieces = ReturnType<typeof piecesOf>;

/** Where the corner pieces stand, [x, z] each. */
function cornersAt(pieces: LabelPieces) {
  return pieces.corners.map(({ at }) => [at.x, at.z].map((n) => Number(n.toFixed(9))));
}

/** The corner piece standing at (x, z), if there is one. */
function cornerAt(pieces: LabelPieces, x: number, z: number) {
  return pieces.corners.find(({ at }) => Math.abs(at.x - x) < 1e-9 && Math.abs(at.z - z) < 1e-9);
}

/** A bin of 2 x 1 x 3 units as the editor keeps it. */
function binShape(fields: Record<string, unknown>) {
  return { id: "g", name: "bin", kind: "gridfinity", x: 0, z: 0, elevation: 0, size: 83.5, width: 83.5, depth: 41.5, height: 25.4, rotation: 0, color: "#4f7fa8", gridfinityType: "bin", ...fields } as WorkplaneShape;
}

describe("gridfinity sizes", () => {
  it("takes the grid units from the size: 42 mm a unit, a bin 0.5 mm smaller, 7 mm a height unit", () => {
    expect(gridfinityUnits(bin())).toEqual({ x: 2, z: 1, y: 3 });
    expect(gridfinityUnits(plate())).toEqual({ x: 2, z: 1, y: 1 });
    expect(gridfinityUnits(bin({ width: 125.5, depth: 125.5, height: 42, gridfinityLip: false }))).toEqual({ x: 3, z: 3, y: 6 });
  });

  it("snaps a dragged size to whole units and keeps them between 1 and 6 across", () => {
    expect(gridfinityFootprintPatch(bin({ width: 100, depth: 30, height: 30 }))).toEqual({ width: 83.5, depth: 41.5, height: 28 + GRIDFINITY_LIP_HEIGHT });
    expect(gridfinityFootprintPatch(bin({ width: 1000, depth: 1, height: 1 }))).toEqual({ width: 251.5, depth: 41.5, height: 7 + GRIDFINITY_LIP_HEIGHT });
    expect(gridfinityFootprintPatch(plate({ width: 130, depth: 40, height: 20 }))).toEqual({ width: 126, depth: 42, height: 5 });
  });

  it("is 7 mm a unit tall, and the stacking lip adds 4.4 mm: a 3 unit bin is 25.4 mm", () => {
    expect(gridfinityFootprintPatch(bin({ gridfinityLip: false, height: 21 })).height).toBe(21);
    expect(gridfinityFootprintPatch(bin()).height).toBeCloseTo(25.4, 9);
  });

  it("writes the box of whole units for a change of type, units or lip", () => {
    expect(gridfinityShapePatch(bin(), { x: 3 })).toEqual({ gridfinityType: "bin", gridfinityLip: true, width: 125.5, depth: 41.5, height: 21 + GRIDFINITY_LIP_HEIGHT });
    expect(gridfinityShapePatch(bin(), { lip: false })).toMatchObject({ gridfinityLip: false, height: 21 });
    expect(gridfinityShapePatch(bin(), { type: "baseplate" })).toMatchObject({ gridfinityType: "baseplate", width: 84, depth: 42, height: 5 });
    // A baseplate has no height units; turned into a bin it gets the default three.
    expect(gridfinityShapePatch(plate(), { type: "bin" })).toMatchObject({ gridfinityType: "bin", width: 83.5, depth: 41.5, height: 21 + GRIDFINITY_LIP_HEIGHT });
    expect(gridfinityShapePatch(bin(), { x: 9, y: 0 })).toMatchObject({ width: 251.5, height: 7 + GRIDFINITY_LIP_HEIGHT });
  });

  it("keeps the height units when only the lip is switched", () => {
    expect(gridfinityFootprintPatch(bin({ gridfinityLip: false })).height).toBe(21);
    expect(gridfinityFootprintPatch(bin({ gridfinityLip: true, height: 21 })).height).toBeCloseTo(25.4, 9);
    for (let y = 1; y <= 20; y += 1) {
      expect(gridfinityUnits(bin({ height: 7 * y, gridfinityLip: true })).y).toBe(y);
      expect(gridfinityUnits(bin({ height: 7 * y + GRIDFINITY_LIP_HEIGHT, gridfinityLip: false })).y).toBe(y);
    }
  });
});

describe("gridfinity bin", () => {
  it("is closed, wound outwards and one piece, with and without lip and magnet holes", () => {
    for (const fields of [{}, { gridfinityLip: false }, { gridfinityMagnets: true }, { width: 41.5, depth: 41.5, height: 7 + GRIDFINITY_LIP_HEIGHT }, { width: 125.5, depth: 83.5, height: 42, gridfinityLip: false, gridfinityMagnets: true }]) {
      const triangles = gridfinityTriangles(bin(fields));
      expect(edgeProblems(triangles)).toBe(0);
      expect(signedVolume(triangles)).toBeGreaterThan(0);
      expect(components(triangles)).toBe(1);
    }
  });

  it("stands on y = 0 and fills its box exactly", () => {
    const { min, max } = bounds(gridfinityTriangles(bin()));
    expect(min[0]).toBeCloseTo(-41.75, 6);
    expect(max[0]).toBeCloseTo(41.75, 6);
    expect(min[2]).toBeCloseTo(-20.75, 6);
    expect(max[2]).toBeCloseTo(20.75, 6);
    expect(min[1]).toBeCloseTo(0, 6);
    expect(max[1]).toBeCloseTo(21 + GRIDFINITY_LIP_HEIGHT, 3);
  });

  it("has the specification's foot: 0.8 at 45 degrees, 1.8 straight, 2.15 at 45 degrees", () => {
    const triangles = gridfinityTriangles(bin({ width: 41.5, depth: 41.5 }));
    // The outer wall on the line z = 0, measured in from the bin's side at x = -20.75.
    const inset = (y: number) => crossings(triangles, y)[0] + 20.75;
    expect(inset(0.4)).toBeCloseTo(2.55, 6);
    expect(inset(1.7)).toBeCloseTo(2.15, 6);
    expect(inset(3.675)).toBeCloseTo(1.075, 6);
    expect(inset(6)).toBeCloseTo(0, 6);
  });

  it("has the specification's lip: in 0.7 at 45 degrees, 1.8 straight, then 45 degrees up to a sharp top on the outer wall", () => {
    const triangles = gridfinityTriangles(bin({ width: 41.5, depth: 41.5 }));
    const innerWall = (y: number) => crossings(triangles, y)[1] + 20.75;
    expect(innerWall(21.35)).toBeCloseTo(2.25, 6);
    expect(innerWall(22.6)).toBeCloseTo(1.9, 6);
    expect(innerWall(24.4)).toBeCloseTo(1, 6);
    expect(innerWall(25.3)).toBeCloseTo(0.1, 6);
  });

  it("runs the lip's support down to the floor in a bin of one height unit, which has no straight wall inside", () => {
    // Floor at 4.75 + 1.2 = 5.95; the support slopes in 45 degrees from 2.6 at the top (7) down to 1.55 at the floor.
    const triangles = gridfinityTriangles(bin({ width: 41.5, depth: 41.5, height: 7 + GRIDFINITY_LIP_HEIGHT }));
    const innerWall = (y: number) => crossings(triangles, y)[1] + 20.75;
    expect(innerWall(6.3)).toBeCloseTo(1.9, 6);
    expect(innerWall(6.8)).toBeCloseTo(2.4, 6);
    // Under the floor the bin is solid: only its two outer walls, no wall folded back below the floor.
    expect(crossings(triangles, 5.6)).toHaveLength(2);
  });

  it("puts a magnet hole 6.5 mm wide 13 mm from each unit's middle, both ways", () => {
    const plan = gridfinityPlan(bin({ gridfinityMagnets: true }));
    expect(plan.magnetHoles).toHaveLength(8);
    expect(plan.magnetHoles).toContainEqual({ x: -21 - 13, z: -13 });
    expect(plan.magnetHoles).toContainEqual({ x: 21 + 13, z: 13 });
    const triangles = gridfinityTriangles(bin({ width: 41.5, depth: 41.5, gridfinityMagnets: true }));
    // On the line z = 13.5 at y = 1 the hole is open for its chord there: 13 -+ sqrt(3.25^2 - 0.5^2).
    const xs = crossings(triangles, 1, 13.5).filter((x) => x > 5 && x < 18);
    expect(xs[0]).toBeCloseTo(13 - Math.sqrt(3.25 ** 2 - 0.25), 1);
    expect(xs[1]).toBeCloseTo(13 + Math.sqrt(3.25 ** 2 - 0.25), 1);
  });
});

describe("gridfinity baseplate", () => {
  it("is closed, wound outwards and one piece", () => {
    for (const fields of [{}, { width: 42, depth: 42 }, { width: 252, depth: 126 }]) {
      const triangles = gridfinityTriangles(plate(fields));
      expect(edgeProblems(triangles)).toBe(0);
      expect(signedVolume(triangles)).toBeGreaterThan(0);
      expect(components(triangles)).toBe(1);
    }
  });

  it("is 5 mm tall: the specification's 0.7, 1.8 and 2.15 on a 0.35 mm band", () => {
    const triangles = gridfinityTriangles(plate());
    const { min, max } = bounds(triangles);
    expect(max[0] - min[0]).toBeCloseTo(84, 6);
    expect(max[1]).toBeCloseTo(5, 6);
    // The ridge between the two sockets at x = 0: its right face, measured from the grid line.
    const ridge = (y: number) => crossings(triangles, y).filter((x) => x > 0 && x < 5)[0];
    expect(ridge(0.2)).toBeCloseTo(2.85, 6);
    expect(ridge(0.7)).toBeCloseTo(2.5, 6);
    expect(ridge(2)).toBeCloseTo(2.15, 6);
    expect(ridge(4)).toBeCloseTo(1, 6);
  });

  it("leaves 0.25 mm all round the feet of a bin resting 0.25 mm up on the ridges between the sockets", () => {
    const binWall = (y: number) => crossings(gridfinityTriangles(bin({ width: 41.5, depth: 41.5 })), y)[0] + 21;
    const plateWall = (y: number) => crossings(gridfinityTriangles(plate({ width: 42, depth: 42 })), y)[1] + 21;
    // At the plate's height y the seated bin is at its own height y - 0.25: on both slopes and the straight part.
    for (const y of [0.75, 2, 4]) expect(binWall(y - 0.25) - plateWall(y)).toBeCloseTo(0.25, 6);
  });
});

describe("gridfinity label shelf", () => {
  let runtime: ManifoldToplevel;

  beforeAll(async () => {
    runtime = await manifoldModule();
    runtime.setup();
  });

  it("leaves a bin without shelves, or one too low for them, exactly as it was", () => {
    expect(gridfinityLabelledTriangles(runtime, bin())).toEqual(gridfinityTriangles(bin()));
    const low = bin({ height: 14 + GRIDFINITY_LIP_HEIGHT, gridfinityLabelBack: true });
    expect(gridfinityLabelPieces(low)).toBeNull();
    expect(gridfinityLabelledTriangles(runtime, low)).toEqual(gridfinityTriangles(low));
    expect(gridfinityLabelPieces(plate({ gridfinityLabelBack: true }))).toBeNull();
  });

  it("is closed, wound outwards and one piece on any walls, full or a set length, round, chamfered or sharp", () => {
    const big = { width: 125.5, depth: 83.5, height: 42 + GRIDFINITY_LIP_HEIGHT };
    for (const fields of [
      { gridfinityLabelBack: true },
      { gridfinityLabelBack: true, gridfinityLabelLeft: true },
      { gridfinityLabelBack: true, gridfinityLabelFront: true, gridfinityLabelLeft: true, gridfinityLabelRight: true },
      { gridfinityLabelFront: true, gridfinityLabelFrontLength: 36, gridfinityLabelFrontOffset: -10 },
      { gridfinityLabelBack: true, gridfinityLabelLeft: true, gridfinityLabelRight: true, gridfinityLabelCorner: "chamfer" },
      { gridfinityLabelBack: true, gridfinityLabelCornerSize: 0 },
      { ...big, gridfinityLabelBack: true, gridfinityLabelFront: true, gridfinityLabelLeft: true, gridfinityLabelRight: true, gridfinityLabelCornerSize: 2 },
      { ...big, gridfinityLabelRight: true, gridfinityLabelRightLength: 30, gridfinityLabelRightOffset: 100, gridfinityMagnets: true },
      { gridfinityLabelFront: true, gridfinityLabelFrontLength: 36, gridfinityLabelFrontOffset: -10, gridfinityLabelCorner: "chamfer" },
      { gridfinityLabelBack: true, gridfinityLabelBackWidth: 30 },
      { gridfinityLabelBack: true, gridfinityLabelLeft: true, gridfinityLabelBackWidth: 6, gridfinityLabelLeftWidth: 16 },
      { gridfinityLabelBack: true, gridfinityLabelLeft: true, gridfinityLabelBackWidth: 6, gridfinityLabelLeftWidth: 16, gridfinityLabelCorner: "chamfer" },
      { gridfinityLabelBack: true, gridfinityLabelLeft: true, gridfinityLabelBackWidth: 6, gridfinityLabelLeftWidth: 16, gridfinityLabelBackLength: 36 },
      { gridfinityLabelBack: true, gridfinityLip: false },
      { width: 251.5, depth: 251.5, gridfinityLabelBack: true, gridfinityLabelLeft: true, gridfinityLabelBackWidth: 17, gridfinityLabelLeftWidth: 4, gridfinityLabelCorner: "chamfer" },
      { width: 125.5, depth: 83.5, gridfinityLabelBack: true, gridfinityLabelFront: true, gridfinityLabelLeft: true, gridfinityLabelRight: true, gridfinityLabelFrontWidth: 9, gridfinityLabelRightWidth: 30 },
      {
        ...big,
        height: 70 + GRIDFINITY_LIP_HEIGHT,
        gridfinityLabelBack: true,
        gridfinityLabelRight: true,
        gridfinityLabelBackWidth: 1000,
        gridfinityLabelBackLength: 34,
        gridfinityLabelBackOffset: 30,
        gridfinityLabelRightWidth: 1000,
        gridfinityLabelRightLength: 10,
        gridfinityLabelRightOffset: -66,
        gridfinityLabelCorner: "chamfer",
        gridfinityLabelCornerSize: 10,
      },
      { gridfinityLabelBack: true, gridfinityLabelBackLength: 10, gridfinityLabelCornerSize: 10 },
      { gridfinityLabelBack: true, gridfinityLabelLeft: true, gridfinityLabelBackLength: 15, gridfinityLabelBackOffset: -100, gridfinityLabelLeftLength: 15, gridfinityLabelLeftOffset: -100, gridfinityLabelCornerSize: 4 },
      { gridfinityLabelBack: true, gridfinityLabelBackLength: 10, gridfinityLabelBackOffset: 100, gridfinityLabelCornerSize: 10 },
    ]) {
      const triangles = gridfinityLabelledTriangles(runtime, bin(fields));
      expect(edgeProblems(triangles)).toBe(0);
      expect(signedVolume(triangles)).toBeGreaterThan(signedVolume(gridfinityTriangles(bin(fields))));
      expect(components(triangles)).toBe(1);
    }
  });

  it("has a flat top 0.85 mm under the wall's top, a 1.2 mm strip at the front and an underside rising at 36 degrees", () => {
    // A 10 mm shelf on the left wall of a bin of 3 units: the inner wall at x = -41.75 + 0.95 = -40.8,
    // the top at 21 - 0.85 = 20.15, the strip down to 18.95, the underside back to the wall at 18.95 - 10 tan 36.
    const rise = Math.tan((36 * Math.PI) / 180);
    const bottom = 18.95 - 10 * rise;
    const triangles = gridfinityLabelledTriangles(runtime, bin({ gridfinityLabelLeft: true, gridfinityLabelLeftWidth: 10, gridfinityLabelCornerSize: 0 }));
    const front = (y: number) => crossings(triangles, y)[1];
    // The display mesh moves the shelf pieces by a few thousandths of a millimetre (LABEL_MESH_NUDGE_X and so on).
    expect(front(20)).toBeCloseTo(-30.8, 2);
    expect(front(19.5)).toBeCloseTo(-30.8, 2);
    expect(front(16)).toBeCloseTo(-40.8 + (16 - bottom) / rise, 2);
    expect(front(13)).toBeCloseTo(-40.8 + (13 - bottom) / rise, 2);
    expect(front(bottom - 1)).toBeCloseTo(-40.8, 5);
    // Above the top only the lip's support, 0.95 + (20.3 - 19.35) in from the outer wall.
    expect(front(20.3)).toBeCloseTo(-41.75 + 0.95 + 0.95, 5);
  });

  it("is no wider than the bin's height allows: its underside ends 0.5 mm above the floor", () => {
    // 3 units: (21 - 0.85 - 1.2 - 5.95 - 0.5) / tan 36 = 12.5 / 0.7265 = 17.2 mm, so the 14 mm default fits.
    const rise = Math.tan((36 * Math.PI) / 180);
    expect(gridfinityLabelPieces(bin({ gridfinityLabelBack: true, gridfinityLabelBackWidth: 30 }))!.shelves[0].profile.width).toBeCloseTo(12.5 / rise, 9);
    expect(gridfinityLabelPieces(bin({ gridfinityLabelBack: true }))!.shelves[0].profile.width).toBe(14);
    expect(gridfinityLabelPieces(bin({ gridfinityLabelBack: true, gridfinityLabelBackWidth: 1 }))!.shelves[0].profile.width).toBe(4);
  });

  it("leaves at least 2 mm open across the bin, between facing shelves and their corner pieces", () => {
    // A bin of 1 x 1 x 6 units would take 46 mm by its height; inside it is 39.6 mm across, so with
    // shelves facing each other and the default 2 mm corners each takes at most 19.8 - 1 - 2 = 16.8, a lone one 39.6 - 2 - 2 = 35.6.
    const tall = { width: 41.5, depth: 41.5, height: 42 + GRIDFINITY_LIP_HEIGHT, gridfinityLabelBackWidth: 40, gridfinityLabelFrontWidth: 40, gridfinityLabelLeftWidth: 40, gridfinityLabelRightWidth: 40 };
    expect(gridfinityLabelPieces(bin({ ...tall, gridfinityLabelBack: true, gridfinityLabelFront: true }))!.shelves[0].profile.width).toBeCloseTo(16.8, 9);
    expect(gridfinityLabelPieces(bin({ ...tall, gridfinityLabelBack: true }))!.shelves[0].profile.width).toBeCloseTo(35.6, 9);
    // All four walls at the widest, 1 x 1, 2 x 1 and 6 x 6, rounded and chamfered: still one piece, closed,
    // with no pocket closed off inside and no two corner pieces touching across the gap.
    const widest = {
      gridfinityLabelBack: true,
      gridfinityLabelFront: true,
      gridfinityLabelLeft: true,
      gridfinityLabelRight: true,
      gridfinityLabelBackWidth: 1000,
      gridfinityLabelFrontWidth: 1000,
      gridfinityLabelLeftWidth: 1000,
      gridfinityLabelRightWidth: 1000,
    };
    for (const size of [{ width: 41.5, depth: 41.5 }, { width: 83.5, depth: 41.5, height: 21 + GRIDFINITY_LIP_HEIGHT }, { width: 251.5, depth: 251.5, height: 140 + GRIDFINITY_LIP_HEIGHT }]) {
      for (const [gridfinityLabelCorner, gridfinityLabelCornerSize] of [["round", 2], ["chamfer", 2], ["round", 5], ["chamfer", 5], ["round", 10], ["chamfer", 10]] as const) {
        const triangles = gridfinityLabelledTriangles(runtime, bin({ ...tall, ...size, ...widest, gridfinityLabelCorner, gridfinityLabelCornerSize }));
        expect(edgeProblems(triangles)).toBe(0);
        expect(components(triangles)).toBe(1);
      }
    }
  });

  it("moves a set length along the editor's axes: right on the back and front walls, towards the front on the sides", () => {
    // 20 mm moved 10 mm: on the back wall u runs with x, on the front wall against it, so both end up at x 0 to 20.
    const pieces = piecesOf({
      gridfinityLabelBack: true,
      gridfinityLabelFront: true,
      gridfinityLabelLeft: true,
      gridfinityLabelRight: true,
      gridfinityLabelBackLength: 20,
      gridfinityLabelBackOffset: 10,
      gridfinityLabelFrontLength: 20,
      gridfinityLabelFrontOffset: 10,
      gridfinityLabelLeftLength: 20,
      gridfinityLabelLeftOffset: 10,
      gridfinityLabelRightLength: 20,
      gridfinityLabelRightOffset: 10,
    });
    const [back, front, left, right] = pieces.shelves.map(({ profile }) => profile);
    expect([back.from, back.to]).toEqual([0, 20]);
    expect([front.from, front.to]).toEqual([-20, 0]);
    // The side walls are 39.6 mm inside: a 20 mm shelf moves at most 9.8 mm, to the front wall (+z) on both,
    // and that end runs into the front wall. On the left wall u runs against z, on the right wall with it.
    expect([left.from, left.to].map((n) => Number(n.toFixed(9)))).toEqual([-20.8, 0.2]);
    expect([right.from, right.to].map((n) => Number(n.toFixed(9)))).toEqual([-0.2, 20.8]);
  });

  it("runs an end that stops less than 1 mm short of the wall into it, and a length that does so at both ends from wall to wall", () => {
    // 80.8 mm on the 81.6 mm back wall leaves 0.4 mm at each end: too narrow to print, so it is a full
    // shelf, with the corner pieces where it meets the side walls and no rounded ends.
    const pieces = gridfinityLabelPieces(bin({ gridfinityLabelBack: true, gridfinityLabelBackLength: 80.8 }))!;
    expect(pieces.shelves[0].notches).toHaveLength(0);
    expect(pieces.corners).toHaveLength(2);
    expect(pieces.shelves[0].profile.to - pieces.shelves[0].profile.from).toBeGreaterThan(81.6);
    // 30 mm moved so its left end stops 0.5 mm short runs into the left wall there and keeps its right end.
    const oneEnd = gridfinityLabelPieces(bin({ gridfinityLabelBack: true, gridfinityLabelBackLength: 30, gridfinityLabelBackOffset: -25.3 }))!.shelves[0];
    expect(oneEnd.profile.from).toBeCloseTo(-41.8, 9);
    expect(oneEnd.profile.to).toBeCloseTo(-10.3, 9);
    expect(oneEnd.notches).toHaveLength(1);
    // A length of 0.2 mm is taken as the shortest shelf, 10 mm.
    const short = gridfinityLabelPieces(bin({ gridfinityLabelBack: true, gridfinityLabelBackLength: 0.2 }))!.shelves[0].profile;
    expect(short.to - short.from).toBeCloseTo(10, 9);
  });

  it("offers a length up to the wall's own, a width up to the bin across it, and moves a shelf only as far as its wall allows", () => {
    // Back wall 81.6 mm, left wall 39.6 mm: a 30 mm shelf moves 81.6 / 2 - 15 = 25.8 mm on the back wall, offered as 25 mm.
    expect(gridfinityLabelLimits(bin({ gridfinityLabelBack: true, gridfinityLabelLeft: true, gridfinityLabelBackLength: 30 }), "back")).toEqual({ length: 81.6, offset: 25, across: 39.6 });
    // On the left wall the length goes up to that wall's 39.6 mm.
    expect(gridfinityLabelLimits(bin({ gridfinityLabelLeft: true, gridfinityLabelLeftLength: 30 }), "left")).toEqual({ length: 39.6, offset: 4, across: 81.6 });
    // A length the shelf runs wall to wall with, 80 mm on the 81.6 mm wall, has nothing to move;
    // 5 mm is built as 10 mm and moves as that.
    expect(gridfinityLabelLimits(bin({ gridfinityLabelBack: true, gridfinityLabelBackLength: 80 }), "back").offset).toBe(0);
    expect(gridfinityLabelLength(bin({ gridfinityLabelBack: true, gridfinityLabelBackLength: 5 }), "back")).toBe(10);
    expect(gridfinityLabelLimits(bin({ gridfinityLabelBack: true, gridfinityLabelBackLength: 5 }), "back").offset).toBe(35);
  });

  it("gives each wall its own width and length: a full 16 mm shelf on the left beside a 36 mm one of 6 mm at the back", () => {
    const pieces = gridfinityLabelPieces(bin({ gridfinityLabelBack: true, gridfinityLabelLeft: true, gridfinityLabelBackWidth: 6, gridfinityLabelBackLength: 36, gridfinityLabelLeftWidth: 16 }))!;
    const [back, left] = pieces.shelves.map(({ profile }) => profile);
    expect(back.width).toBe(6);
    expect(back.to - back.from).toBeCloseTo(36, 9);
    expect(left.width).toBe(16);
    // The left shelf runs wall to wall: 39.6 mm inside, and 1 mm past each end into the walls.
    expect(left.to - left.from).toBeCloseTo(41.6, 9);
  });

  it("gives each wall its own position", () => {
    // 20 mm on the back wall moved 10 mm to the right runs from x 0 to 20; on the front wall moved 5 mm to the left, from x -15 to 5.
    const fields = { gridfinityLabelBack: true, gridfinityLabelFront: true, gridfinityLabelBackLength: 20, gridfinityLabelBackOffset: 10, gridfinityLabelFrontLength: 20, gridfinityLabelFrontOffset: -5 };
    const [back, front] = piecesOf(fields).shelves.map(({ profile }) => profile);
    expect([back.from, back.to]).toEqual([0, 20]);
    expect([front.from, front.to]).toEqual([-5, 15]);
  });

  /** The welded mesh as a Manifold solid, merged as the editor merges a mesh for its booleans. */
  function solidOf(triangles: V[][]) {
    const vertProperties = new Float32Array(triangles.flat(2));
    const triVerts = new Uint32Array(triangles.flatMap((_, i) => [3 * i, 3 * i + 1, 3 * i + 2]));
    const mesh = new runtime.Mesh({ numProp: 3, vertProperties, triVerts, tolerance: 1e-4 });
    mesh.merge();
    return new runtime.Manifold(mesh);
  }

  it("fills a corner only as deep as the 1.2 mm strip, at a wall and where shelves of different widths meet", () => {
    // Back 6 and left 16 on a bin of 2 x 1 x 3 units: the left shelf's front is at x -40.8 + 16 = -24.8,
    // the back shelf's at z -19.8 + 6 = -13.8, so they meet there; the back shelf meets the right wall at (40.8, -13.8).
    const fields = { gridfinityLabelBack: true, gridfinityLabelLeft: true, gridfinityLabelBackWidth: 6, gridfinityLabelLeftWidth: 16 };
    expect(cornersAt(piecesOf(fields))).toEqual(expect.arrayContaining([[-24.8, -13.8], [40.8, -13.8]]));
    for (const gridfinityLabelCorner of ["round", "chamfer"] as const) {
      const solid = solidOf(gridfinityLabelledTriangles(runtime, bin({ ...fields, gridfinityLabelCorner })));
      // A 0.3 mm column 0.4 mm out from both faces of each corner: material from the strip's bottom, 18.95,
      // to the top, 20.15, and none in the 3 mm below it.
      const material = (x: number, z: number, y0: number, y1: number) => {
        const column = runtime.Manifold.cube([0.3, y1 - y0, 0.3]).translate([x - 0.15, y0, z - 0.15]);
        const inside = solid.intersect(column);
        const volume = inside.volume();
        column.delete();
        inside.delete();
        return volume;
      };
      for (const [x, z] of [[-24.4, -13.4], [40.4, -13.4]]) {
        expect(material(x, z, 19.05, 20.05)).toBeCloseTo(0.09, 3);
        expect(material(x, z, 15.9, 18.9)).toBe(0);
      }
      solid.delete();
    }
  });

  it("meets a shorter shelf that runs into the same corner as it meets a full one", () => {
    // Back full and 14 mm, left 20 mm long pushed to the back, 10 mm wide, on a square bin:
    // the corner between their fronts is at x -40.8 + 10 = -30.8, z -40.8 + 14 = -26.8.
    const left = { ...square, gridfinityLabelBack: true, gridfinityLabelLeft: true, gridfinityLabelLeftWidth: 10 };
    const pushed = piecesOf({ ...left, gridfinityLabelLeftLength: 20, gridfinityLabelLeftOffset: -100 });
    expect(cornersAt(pushed)).toContainEqual([-30.8, -26.8]);
    expect(cornersAt(pushed)).not.toContainEqual([-40.8, -26.8]);
    // 30 mm moved so its back end stops 5 mm from the back wall, on the back shelf: it runs on into the wall,
    // with no rounded end hidden in the back shelf, and the two meet the same way.
    const onShelf = piecesOf({ ...left, gridfinityLabelLeftLength: 30, gridfinityLabelLeftOffset: -20.8 });
    expect(onShelf.shelves[1].profile.to).toBeGreaterThan(40.8);
    expect(onShelf.shelves[1].notches).toHaveLength(1);
    expect(cornersAt(onShelf)).toContainEqual([-30.8, -26.8]);
    // 16 mm long it reaches 2 mm past the back shelf's front: chamfered, a corner of those 2 mm; rounded, its free end's
    // rounding takes those 2 mm of front, and no corner is made there.
    const just = { ...left, gridfinityLabelLeftLength: 16, gridfinityLabelLeftOffset: -100, gridfinityLabelCornerSize: 5 };
    expect(cornerAt(piecesOf({ ...just, gridfinityLabelCorner: "chamfer" }), -30.8, -26.8)?.size).toBeCloseTo(2, 9);
    expect(cornerAt(piecesOf(just), -30.8, -26.8)).toBeUndefined();
    // 17.2 mm reaches 3.2 mm past, but its 2 mm rounded end and 0.5 mm leave only 0.7 mm of straight front: too little for a corner.
    expect(cornerAt(piecesOf({ ...left, gridfinityLabelLeftLength: 17.2, gridfinityLabelLeftOffset: -100 }), -30.8, -26.8)).toBeUndefined();
    // An 18 mm back shelf pushed against the full left one reaches 8 mm past its front: a chamfer of 8 mm, not 9 (half its length).
    const backShort = piecesOf({
      ...left,
      gridfinityLabelBackLength: 18,
      gridfinityLabelBackOffset: -100,
      gridfinityLabelCorner: "chamfer",
      gridfinityLabelCornerSize: 10,
    });
    expect(cornerAt(backShort, -30.8, -26.8)?.size).toBeCloseTo(8, 9);
    // A 4 mm back shelf and the left one 12 mm long pushed to the back: the left one reaches 8 mm past the back one's
    // front, but a corner takes at most half a shelf's length, 6 mm, whichever shelf makes it.
    const narrow = piecesOf({
      ...left,
      gridfinityLabelBackWidth: 4,
      gridfinityLabelLeftLength: 12,
      gridfinityLabelLeftOffset: -100,
      gridfinityLabelCorner: "chamfer",
      gridfinityLabelCornerSize: 10,
    });
    expect(cornerAt(narrow, -30.8, -36.8)?.size).toBeCloseTo(6, 9);
    for (const fields of [{}, { gridfinityLabelCorner: "chamfer" }]) {
      const triangles = gridfinityLabelledTriangles(runtime, bin({ ...left, gridfinityLabelLeftLength: 20, gridfinityLabelLeftOffset: -100, ...fields }));
      expect(edgeProblems(triangles)).toBe(0);
      expect(components(triangles)).toBe(1);
    }
  });

  it("meets a side shelf only where it starts at this wall and reaches past this shelf's front", () => {
    // On the 2 x 1 bin a 10 mm left shelf 10 mm long in the corner does not reach past the 14 mm back shelf's front:
    // the back shelf's corner is against the bare wall in front of it.
    const shortSide = { gridfinityLabelBack: true, gridfinityLabelLeft: true, gridfinityLabelLeftWidth: 10, gridfinityLabelLeftLength: 10, gridfinityLabelLeftOffset: -100 };
    expect(cornersAt(piecesOf(shortSide))).toContainEqual([-40.8, -5.8]);
    // Nor does a 10 mm back shelf 10 mm long reach past a full 14 mm left shelf's front.
    const shortBack = piecesOf({ gridfinityLabelBack: true, gridfinityLabelLeft: true, gridfinityLabelBackWidth: 10, gridfinityLabelBackLength: 10, gridfinityLabelBackOffset: -100 });
    expect(cornersAt(shortBack)).toContainEqual([-26.8, -19.8]);
    expect(cornersAt(shortBack)).not.toContainEqual([-26.8, -9.8]);
    // A left shelf that starts 20 mm from the back wall does not meet the back shelf, however far it reaches.
    const away = piecesOf({ ...square, gridfinityLabelBack: true, gridfinityLabelLeft: true, gridfinityLabelLeftLength: 20, gridfinityLabelLeftOffset: -10.8 });
    expect(cornersAt(away)).toContainEqual([-40.8, -26.8]);
    expect(cornersAt(away)).not.toContainEqual([-26.8, -26.8]);
    // On the 2 x 1 bin a 14 mm left shelf 14.5 mm long reaches only 0.5 mm past the 14 mm back shelf's front: it is taken
    // as ending there, and the back shelf's corner stays against the wall.
    expect(cornersAt(piecesOf({ gridfinityLabelBack: true, gridfinityLabelLeft: true, gridfinityLabelLeftLength: 14.5, gridfinityLabelLeftOffset: -100 }))).toContainEqual([-40.8, -5.8]);
  });

  it("runs an end that stops on a side shelf into the wall, and leaves one that stops clear of it", () => {
    // The 10 mm left shelf 10 mm long in the corner of the 2 x 1 bin: a back shelf stopping 5 mm from the left wall stops on
    // it and runs on into the wall, leaving no slot between its end and the wall or the left shelf's underside.
    const shortSide = { gridfinityLabelBack: true, gridfinityLabelLeft: true, gridfinityLabelLeftWidth: 10, gridfinityLabelLeftLength: 10, gridfinityLabelLeftOffset: -100 };
    const beside = piecesOf({ ...shortSide, gridfinityLabelBackLength: 30, gridfinityLabelBackOffset: -20.8 });
    expect(beside.shelves[0].profile.from).toBeLessThan(-40.8);
    expect(beside.shelves[0].notches).toHaveLength(1);
    // 11 mm from the wall it stops 1 mm in front of the left shelf's front, a slot too narrow to print: it runs on.
    expect(piecesOf({ ...shortSide, gridfinityLabelBackLength: 30, gridfinityLabelBackOffset: -14.8 }).shelves[0].profile.from).toBeLessThan(-40.8);
    // An end 14.5 mm from the left wall stops on the full 14 mm left shelf, within 1 mm of its front: it runs on.
    const fullLeft = { ...square, gridfinityLabelBack: true, gridfinityLabelLeft: true };
    expect(piecesOf({ ...fullLeft, gridfinityLabelBackLength: 30, gridfinityLabelBackOffset: -11.3 }).shelves[0].profile.from).toBeLessThan(-40.8);
    // 12 mm from the wall beside a 10 mm left shelf it stops clear of it (12 > 10 + 1) and stays free.
    expect(piecesOf({ ...fullLeft, gridfinityLabelLeftWidth: 10, gridfinityLabelBackLength: 30, gridfinityLabelBackOffset: -13.8 }).shelves[0].profile.from).toBeCloseTo(-28.8, 9);
    // A left shelf 20 mm long starting 20 mm from the back wall is not there for a back end 5 mm from the left wall.
    const away = { ...fullLeft, gridfinityLabelLeftLength: 20, gridfinityLabelLeftOffset: -10.8, gridfinityLabelBackLength: 30, gridfinityLabelBackOffset: -20.8 };
    expect(piecesOf(away).shelves[0].profile.from).toBeCloseTo(-35.8, 9);
    // A short shelf at the far end of its wall is not taken for one on the side shelf at the other end.
    expect(piecesOf({ gridfinityLabelBack: true, gridfinityLabelLeft: true, gridfinityLabelBackLength: 10, gridfinityLabelBackOffset: 100 }).shelves[0].profile.from).toBeCloseTo(30.8, 9);
  });

  it("joins two shelves that each stop on the other, and leaves no hole in the corner", () => {
    const genus = (fields: Record<string, unknown>) => {
      const solid = solidOf(gridfinityLabelledTriangles(runtime, bin({ ...square, ...fields })));
      const result = solid.genus();
      solid.delete();
      return result;
    };
    // A left shelf that stops 3 mm short of the back wall and a back shelf that stops 5 mm short of the left wall: both
    // reach past the other's front, run on into the corner and join, with the corner between their fronts.
    const both = piecesOf({
      ...square,
      gridfinityLabelBack: true,
      gridfinityLabelLeft: true,
      gridfinityLabelLeftWidth: 10,
      gridfinityLabelLeftLength: 30,
      gridfinityLabelLeftOffset: -22.8,
      gridfinityLabelBackLength: 30,
      gridfinityLabelBackOffset: -20.8,
    });
    expect(both.shelves[0].profile.from).toBeLessThan(-40.8);
    expect(both.shelves[1].profile.to).toBeGreaterThan(40.8);
    expect(cornersAt(both)).toContainEqual([-30.8, -26.8]);
    // The back shelf stops 3 mm from the left wall, on the left shelf; the left shelf stops 8 mm from the back wall, on the back
    // shelf. Only the left one reaches past the other's front, yet both run on into the corner.
    const one = { gridfinityLabelBack: true, gridfinityLabelLeft: true, gridfinityLabelBackLength: 10, gridfinityLabelBackOffset: -32.8, gridfinityLabelLeftLength: 30, gridfinityLabelLeftOffset: -17.8 };
    const [oneBack, oneLeft] = piecesOf({ ...square, ...one }).shelves.map(({ profile }) => profile);
    expect(oneBack.from).toBeLessThan(-40.8);
    expect(oneLeft.to).toBeGreaterThan(40.8);
    expect(genus(one)).toBe(0);
    // Two 10 mm shelves, each 3 mm from the other's wall: neither reaches past the other's front, and they still join.
    const neither = { gridfinityLabelBack: true, gridfinityLabelLeft: true, gridfinityLabelBackLength: 10, gridfinityLabelBackOffset: -32.8, gridfinityLabelLeftLength: 10, gridfinityLabelLeftOffset: -32.8 };
    const [neitherBack, neitherLeft] = piecesOf({ ...square, ...neither }).shelves.map(({ profile }) => profile);
    expect(neitherBack.from).toBeLessThan(-40.8);
    expect(neitherLeft.to).toBeGreaterThan(40.8);
    expect(genus(neither)).toBe(0);
  });

  it("runs an end into the wall that stops within 1 mm of the lip's support, which leans 0.8 mm into the bin at the shelf's top", () => {
    // 30 mm with its left end 1.5 mm from the wall: with the lip that is 0.7 mm from the support, so it runs in; without, it stays.
    const fields = { gridfinityLabelBack: true, gridfinityLabelBackLength: 30, gridfinityLabelBackOffset: -24.3 };
    expect(piecesOf(fields).shelves[0].profile.from).toBeCloseTo(-41.8, 9);
    expect(piecesOf({ ...fields, gridfinityLip: false, height: 21 }).shelves[0].profile.from).toBeCloseTo(-39.3, 9);
  });

  it("finishes no end hidden in the shelf of the wall behind it, and keeps it inside that shelf's front", () => {
    // 12 mm pushed against a full 14 mm left shelf: its end at x -28.8 lies inside that shelf, with no rounding and no corner
    // piece, and there is no corner where it meets the left wall either: that spot is inside the left shelf too.
    const hidden = piecesOf({ gridfinityLabelBack: true, gridfinityLabelLeft: true, gridfinityLabelBackLength: 12, gridfinityLabelBackOffset: -100 });
    expect(hidden.shelves[0].profile.to).toBeCloseTo(-28.8, 9);
    expect(hidden.shelves[0].notches).toHaveLength(0);
    expect(cornersAt(hidden)).not.toContainEqual([-28.8, -19.8]);
    expect(cornersAt(hidden)).not.toContainEqual([-40.8, -5.8]);
    // A back shelf 12 mm and a left shelf 10 mm, both pushed into the corner: neither reaches past the other's front,
    // so neither end is hidden and both keep their rounded ends.
    const corner = { ...square, gridfinityLabelBack: true, gridfinityLabelLeft: true, gridfinityLabelBackLength: 12, gridfinityLabelBackOffset: -100 };
    expect(piecesOf({ ...corner, gridfinityLabelLeftLength: 10, gridfinityLabelLeftOffset: -100 }).shelves.map(({ notches }) => notches.length)).toEqual([1, 1]);
    // A left shelf that stops 20 mm short of the back wall hides nothing of the back shelf in that corner.
    expect(piecesOf({ ...corner, gridfinityLabelLeftLength: 20, gridfinityLabelLeftOffset: -10.8 }).shelves[0].notches).toHaveLength(1);
    // 14.5 mm would end 0.5 mm in front of the left shelf, at -26.3: it is kept 0.5 mm inside, at -27.3.
    expect(piecesOf({ gridfinityLabelBack: true, gridfinityLabelLeft: true, gridfinityLabelBackLength: 14.5, gridfinityLabelBackOffset: -100 }).shelves[0].profile.to).toBeCloseTo(-27.3, 9);
  });

  it("keeps corner pieces clear of a shelf on the side wall that comes near them", () => {
    // 1 x 1 x 4 units: the right shelf's back end stops 16 mm from the back wall, 2 mm in front of the 14 mm back shelf.
    // With 2 mm corners neither the back shelf's corner at the right wall nor the piece beside the right shelf's end fits there.
    const near = piecesOf({
      width: 41.5,
      depth: 41.5,
      height: 28 + GRIDFINITY_LIP_HEIGHT,
      gridfinityLabelBack: true,
      gridfinityLabelRight: true,
      gridfinityLabelRightWidth: 8,
      gridfinityLabelRightLength: 15,
      gridfinityLabelRightOffset: 3.7,
      gridfinityLabelCorner: "chamfer",
      gridfinityLabelCornerSize: 2,
    });
    expect(cornersAt(near)).not.toContainEqual([19.8, -5.8]);
    expect(cornersAt(near)).not.toContainEqual([19.8, -3.8]);
    // A 30 mm shelf whose right end stops 2.5 mm from the right wall: with 5 mm corners the piece beside that end stops
    // 0.5 mm short of the wall, at 2 mm, so its curve never meets the wall at a slant.
    const wallNear = piecesOf({ gridfinityLabelBack: true, gridfinityLabelBackLength: 30, gridfinityLabelBackOffset: 23.3, gridfinityLabelCornerSize: 5 });
    expect(wallNear.corners.map(({ size }) => Number(size.toFixed(9)))).toEqual([5, 2]);
    // A back end 6 mm from the right wall beside a 4 mm right shelf whose end, with a 2 mm corner of its own, stops 3 mm
    // from the back wall: the 2 mm piece beside the back end would leave 6 - 4 - 2 - 2 = -2 mm, so it is left out.
    const clearance = piecesOf({
      gridfinityLabelBack: true,
      gridfinityLabelRight: true,
      gridfinityLabelRightWidth: 4,
      gridfinityLabelRightLength: 10,
      gridfinityLabelRightOffset: -11.8,
      gridfinityLabelBackLength: 30,
      gridfinityLabelBackOffset: 19.8,
    });
    expect(clearance.shelves[0].profile.to).toBeCloseTo(34.8, 9);
    expect(cornerAt(clearance, 34.8, -19.8)).toBeUndefined();
    // A shelf 4 mm wide is rounded at its free ends by at most half its width.
    const thin = piecesOf({ gridfinityLabelBack: true, gridfinityLabelBackWidth: 4, gridfinityLabelBackLength: 36, gridfinityLabelCornerSize: 10 });
    expect(thin.shelves[0].notches.map(({ size }) => size)).toEqual([2, 2]);
  });

  it("tells every shelf setting apart and keeps them all through a saved project", async () => {
    // All four walls on, each with its own width, length and offset.
    const settings: Record<string, unknown> = { gridfinityLabelCorner: "chamfer", gridfinityLabelCornerSize: 3 };
    Object.values(GRIDFINITY_LABEL_WALL_KEYS).forEach((keys, i) => Object.assign(settings, { [keys.on]: true, [keys.width]: 5 + i, [keys.length]: 20 + i, [keys.offset]: [-3, 2, 4, -1][i] }));
    const shelved = canonicalizeShape(binShape(settings));
    Object.entries(settings).forEach(([key, value]) => {
      const changed = typeof value === "boolean" ? !value : typeof value === "number" ? value + 1 : "round";
      expect(workplaneShapesEqual(shelved, { ...shelved, [key]: changed })).toBe(false);
    });
    const exported = await exportLylProject({
      projectId: "shelves",
      projectName: "Shelves",
      createdAt: 1_700_000_000_000,
      modifiedAt: 1_700_000_100_000,
      shapes: [shelved],
      history: [editorHistoryEntry([shelved], [])],
      historyIndex: 0,
      assets: [],
      workspace: DEFAULT_WORKPLANE_WORKSPACE,
      snapGrid: DEFAULT_SNAP_GRID,
      placementElevation: 0,
    });
    const [loaded] = (await importLylProject(exported)).shapes;
    expect(workplaneShapesEqual(loaded, shelved)).toBe(true);
    expect(loaded).toMatchObject(settings);
    expect(sceneShape(shelved)).toMatchObject(settings);
  });

  it("hands the shelves to the exact body only once Manifold has loaded, as the display mesh has them only then", () => {
    const settings = { gridfinityLabelBack: true, gridfinityLabelBackWidth: 10, gridfinityLabelBackLength: 36, gridfinityLabelBackOffset: -5, gridfinityLabelCorner: "chamfer", gridfinityLabelCornerSize: 2 } as const;
    const shelved = binShape(settings);
    expect(cadModifierGridfinityForShape(shelved)).toBeNull();
    expect(cadModifierGridfinityForShape({ ...shelved, gridfinityLabelBack: false })).not.toBeNull();
    // So is a finger scoop, and so are dividers.
    expect(cadModifierGridfinityForShape(binShape({ gridfinityScoopFront: true }))).toBeNull();
    expect(cadModifierGridfinityForShape(binShape({ gridfinityCompartmentsX: 3 }))).toBeNull();
    rememberManifoldRuntime(runtime);
    expect(cadModifierGridfinityForShape(shelved)).toMatchObject(settings);
  });

  it("keeps a set length on its wall and runs one longer than the wall from wall to wall", () => {
    // Back wall of a bin 2 units across: 81.6 mm inside, so a 30 mm shelf moved 100 mm starts at 10.8
    // and runs into the right wall, without a rounded end there: one corner piece beside the free end,
    // one where it meets the right wall, as a full shelf has.
    const moved = gridfinityLabelPieces(bin({ gridfinityLabelBack: true, gridfinityLabelBackLength: 30, gridfinityLabelBackOffset: 100 }))!;
    expect(moved.shelves[0].profile.from).toBeCloseTo(10.8, 9);
    expect(moved.shelves[0].profile.to).toBeGreaterThan(40.8);
    expect(moved.shelves[0].notches).toHaveLength(1);
    expect(cornersAt(moved)).toEqual([[10.8, -19.8], [40.8, -5.8]]);
    // A 10 mm shelf with 10 mm corners: its rounded front corners leave 1 mm of front between them; beside its free end
    // the corner piece stops 0.5 mm short of the rounding, at 14 - 4.5 - 0.5 mm, and where it runs into the wall it takes half its length.
    const tiny = gridfinityLabelPieces(bin({ gridfinityLabelBack: true, gridfinityLabelBackLength: 10, gridfinityLabelCornerSize: 10 }))!;
    expect(tiny.shelves[0].notches.map(({ size }) => size)).toEqual([4.5, 4.5]);
    const tinyMoved = gridfinityLabelPieces(bin({ gridfinityLabelBack: true, gridfinityLabelBackLength: 10, gridfinityLabelBackOffset: 100, gridfinityLabelCornerSize: 10 }))!;
    expect(tinyMoved.corners.map(({ size }) => size)).toEqual([9, 5]);
    // Chamfered, the end has no rounding: the corner piece beside it is the full 10 mm.
    const chamfered = gridfinityLabelPieces(bin({ gridfinityLabelBack: true, gridfinityLabelBackLength: 36, gridfinityLabelCorner: "chamfer", gridfinityLabelCornerSize: 10 }))!;
    expect(chamfered.corners.map(({ size }) => size)).toEqual([10, 10]);
    const long = gridfinityLabelPieces(bin({ gridfinityLabelBack: true, gridfinityLabelBackLength: 200 }))!.shelves[0].profile;
    expect(long.to - long.from).toBeGreaterThan(81.6);
  });
});

describe("gridfinity finger scoop", () => {
  let runtime: ManifoldToplevel;

  beforeAll(async () => {
    runtime = await manifoldModule();
    runtime.setup();
  });

  // What the scoops (and any shelves) add to the bin's own mesh, which has the floor rounding already.
  const added = (fields: Record<string, unknown>) => signedVolume(gridfinityLabelledTriangles(runtime, bin(fields))) - signedVolume(gridfinityTriangles(bin(fields)));

  it("leaves a bin without a scoop exactly as it was, also with a radius set", () => {
    expect(gridfinityScoopPieces(bin({ gridfinityScoopRadius: 5 }))).toBeNull();
    expect(gridfinityLabelledTriangles(runtime, bin({ gridfinityScoopRadius: 5 }))).toEqual(gridfinityTriangles(bin()));
    expect(gridfinityScoopPieces(plate({ gridfinityScoopFront: true }))).toBeNull();
    // A bin of one height unit has no room for a scoop of 3.5 mm, with the lip or without (1.05 mm of wall).
    expect(gridfinityScoopPieces(bin({ height: 7 + GRIDFINITY_LIP_HEIGHT, gridfinityScoopFront: true }))).toBeNull();
    expect(gridfinityScoopPieces(bin({ height: 7, gridfinityLip: false, gridfinityScoopFront: true }))).toBeNull();
    expect(gridfinityScoopFits(bin({ height: 14 + GRIDFINITY_LIP_HEIGHT }))).toBe(true);
  });

  it("is half the depth up to the lip's support unless set, at least 3.5 mm, keeps 0.5 mm of straight wall above it, and leaves 2 mm of floor between two", () => {
    // 3 units with the lip: 21 - 5.95 - 1.65 = 13.4 deep; without the lip 15.05; 6 units 34.4.
    expect(gridfinityScoopRadius(bin({ gridfinityScoopFront: true }))).toBeCloseTo(6.7, 9);
    expect(gridfinityScoopRadius(bin({ gridfinityScoopFront: true, gridfinityLip: false, height: 21 }))).toBeCloseTo(7.525, 9);
    expect(gridfinityScoopRadius(bin({ gridfinityScoopFront: true, height: 42 + GRIDFINITY_LIP_HEIGHT }))).toBeCloseTo(17.2, 9);
    expect(gridfinityScoopRadius(bin({ gridfinityScoopFront: true, gridfinityScoopRadius: 4 }))).toBe(4);
    expect(gridfinityScoopRadius(bin({ gridfinityScoopFront: true, gridfinityScoopRadius: 30 }))).toBeCloseTo(12.9, 9);
    // Two height units with the lip: 14 - 5.95 - 1.65 = 6.4 deep, half of it under the smallest radius, at most 5.9.
    expect(gridfinityScoopRadius(bin({ gridfinityScoopFront: true, height: 14 + GRIDFINITY_LIP_HEIGHT }))).toBe(3.5);
    expect(gridfinityScoopRadius(bin({ gridfinityScoopFront: true, height: 14 + GRIDFINITY_LIP_HEIGHT, gridfinityScoopRadius: 30 }))).toBeCloseTo(5.9, 9);
    // Never under 3.5 mm, clear of the floor's 2.8 mm rounding.
    expect(gridfinityScoopRadius(bin({ gridfinityScoopFront: true, gridfinityScoopRadius: 0.1 }))).toBe(3.5);
    // 12 units high: 84 - 7.6 = 76.4 deep, but the bin is 39.6 deep inside: one scoop stops 2 mm short of the wall opposite,
    // two facing each other 1 mm short of the middle.
    expect(gridfinityScoopRadius(bin({ gridfinityScoopFront: true, height: 84 + GRIDFINITY_LIP_HEIGHT, gridfinityScoopRadius: 50 }))).toBeCloseTo(37.6, 9);
    expect(gridfinityScoopRadius(bin({ gridfinityScoopFront: true, gridfinityScoopBack: true, height: 84 + GRIDFINITY_LIP_HEIGHT, gridfinityScoopRadius: 50 }))).toBeCloseTo(18.8, 9);
  });

  it("draws a radius within 0.03 mm of the one through the corner of the floor's rounding 0.03 mm below that", () => {
    // The sunk circle runs through the point 2.8 mm out from the scoop's wall and up from the floor, where the end wall's
    // corner rounding meets the floor's, at (2.8 + 0.02) / (1 - 1/sqrt(2)) = 9.6281 mm.
    const drawn = (gridfinityScoopRadius: number) => gridfinityScoopPieces(bin({ height: 28 + GRIDFINITY_LIP_HEIGHT, gridfinityScoopBack: true, gridfinityScoopRadius }))!.radius;
    for (const r of [9.6, 9.628, 9.65]) expect(drawn(r)).toBeCloseTo(9.5981, 4);
    for (const r of [9.5, 9.59, 9.67, 10]) expect(drawn(r)).toBe(r);
  });

  it("is closed, wound outwards and one piece on any walls, with the lip or without, beside label shelves and magnets", () => {
    for (const fields of [
      { gridfinityScoopFront: true },
      { gridfinityScoopBack: true },
      { gridfinityScoopLeft: true },
      { gridfinityScoopRight: true },
      { gridfinityScoopFront: true, gridfinityScoopLeft: true },
      { gridfinityScoopFront: true, gridfinityScoopBack: true, gridfinityScoopLeft: true, gridfinityScoopRight: true },
      { gridfinityScoopFront: true, gridfinityLip: false, height: 21 },
      { gridfinityScoopFront: true, gridfinityLip: false, height: 14 },
      { gridfinityScoopFront: true, height: 14 + GRIDFINITY_LIP_HEIGHT },
      { gridfinityScoopFront: true, gridfinityScoopRadius: 3.5 },
      { gridfinityScoopFront: true, gridfinityScoopBack: true, height: 140 + GRIDFINITY_LIP_HEIGHT, gridfinityScoopRadius: 100 },
      { gridfinityScoopFront: true, gridfinityLabelBack: true },
      { gridfinityScoopFront: true, gridfinityLabelFront: true, gridfinityLabelFrontWidth: 17 },
      { gridfinityScoopLeft: true, gridfinityLabelBack: true, gridfinityLabelLeft: true, gridfinityMagnets: true },
      { width: 251.5, depth: 251.5, height: 42 + GRIDFINITY_LIP_HEIGHT, gridfinityScoopFront: true, gridfinityScoopRight: true, gridfinityLabelBack: true },
      // Two scoops meeting on the crease of a round corner, which a move of the pieces onto it would pinch (LABEL_MESH_NUDGE).
      { width: 41.5, depth: 41.5, height: 14 + GRIDFINITY_LIP_HEIGHT, gridfinityScoopBack: true, gridfinityScoopRight: true, gridfinityScoopRadius: 5.9 },
      { width: 41.5, depth: 41.5, height: 14 + GRIDFINITY_LIP_HEIGHT, gridfinityScoopBack: true, gridfinityScoopLeft: true, gridfinityScoopRadius: 5.9 },
      { gridfinityScoopFront: true, height: 14 + GRIDFINITY_LIP_HEIGHT, width: 41.5 },
      { gridfinityScoopFront: true, gridfinityScoopBack: true, gridfinityScoopLeft: true, gridfinityScoopRight: true, gridfinityScoopRadius: 12 },
      { gridfinityScoopLeft: true, gridfinityLip: false, height: 14 },
      { gridfinityScoopBack: true, gridfinityLabelBack: true, gridfinityLabelLeft: true, gridfinityMagnets: true },
      { width: 251.5, depth: 251.5, height: 140 + GRIDFINITY_LIP_HEIGHT, gridfinityScoopFront: true, gridfinityScoopRadius: 100 },
    ]) {
      // The bin's own mesh, with its floor rounded, is closed too.
      const plain = gridfinityTriangles(bin(fields));
      expect(edgeProblems(plain)).toBe(0);
      expect(components(plain)).toBe(1);
      const triangles = gridfinityLabelledTriangles(runtime, bin(fields));
      expect(edgeProblems(triangles)).toBe(0);
      expect(components(triangles)).toBe(1);
      expect(added(fields)).toBeGreaterThan(0.5);
    }
  });

  it("draws the scoops in the viewport once Manifold has loaded", () => {
    rememberManifoldRuntime(runtime);
    const count = (fields: Record<string, unknown>) => createGridfinityGeometry(bin(fields)).getAttribute("position").count;
    expect(count({ gridfinityScoopFront: true })).toBeGreaterThan(count({}));
    // And in the mesh that booleans and the exact body's check use, with every wall and the radius passed on.
    const all = { gridfinityScoopBack: true, gridfinityScoopFront: true, gridfinityScoopLeft: true, gridfinityScoopRight: true, gridfinityScoopRadius: 4 };
    const mesh = meshForShape(binShape(all));
    const volume = signedVolume(mesh.faces.map((face) => face.map((i) => mesh.vertices[i]) as V[]));
    expect(volume).toBeCloseTo(signedVolume(gridfinityLabelledTriangles(runtime, bin(all))), 3);
  });

  it("adds a quarter circle's corner along the whole wall: about r squared times (1 - pi / 4) over the inside length", () => {
    // Over the floor's 2.8 mm rounding, which the wall has anyway: 2 x 1 x 3 units without the lip, r 7.525 with its circle
    // sunk 0.02 mm, 11.87 mm2, less the rounding's 1.68 mm2, over the back wall's 81.6 mm (831 mm3), less what the round
    // inner corners take off.
    const volume = added({ gridfinityScoopBack: true, gridfinityLip: false, height: 21 });
    expect(volume).toBeGreaterThan(800);
    expect(volume).toBeLessThan(840);
    // With the lip, r 6.7: 9.38 - 1.68 mm2, 628 mm3 at most.
    const lipped = added({ gridfinityScoopBack: true });
    expect(lipped).toBeGreaterThan(600);
    expect(lipped).toBeLessThan(632);
  });

  it("rounds into the wall: the floor rises along a quarter circle to the wall, which stands straight above it", () => {
    // The left wall of a 2 x 1 x 3 bin without the lip: inside at x = -40.8, floor at 5.95, r 7.525, the centre
    // r - 0.02 out from the wall and up from the floor.
    const r = 7.525;
    const c = r - 0.02;
    const triangles = gridfinityLabelledTriangles(runtime, bin({ gridfinityScoopLeft: true, gridfinityLip: false, height: 21 }));
    const wall = (y: number) => crossings(triangles, y)[1];
    for (const rise of [1, 3, 6]) expect(wall(5.95 + rise)).toBeCloseTo(-40.8 + c - Math.sqrt(r * r - (c - rise) ** 2), 2);
    expect(wall(5.95 + r + 1)).toBeCloseTo(-40.8, 2);
    // The right wall has no scoop, only the floor's 2.8 mm rounding: at 1.05 mm up, 2.8 - sqrt(2.8^2 - 1.75^2) = 0.614 in.
    expect(crossings(triangles, 7).at(-2)).toBeCloseTo(40.8 - 0.614, 1);
  });

  it("rounds every floor edge of a bin with a scoop by 2.8 mm, the inner corners' radius, and leaves a bin without one sharp", () => {
    // Across the middle of a 2 x 1 x 3 bin with a front scoop, at 1 mm above the floor (5.95): the left and right walls
    // (no scoop) stand 0.95 + 2.8 - sqrt(2.8^2 - 1.8^2) = 1.605 in from the outline at 41.75.
    const rounded = gridfinityLabelledTriangles(runtime, bin({ gridfinityScoopFront: true }));
    const walls = crossings(rounded, 6.95);
    expect(walls[1]).toBeCloseTo(-41.75 + 1.605, 1);
    expect(walls.at(-2)).toBeCloseTo(41.75 - 1.605, 1);
    // 3 mm up the walls stand straight again.
    expect(crossings(rounded, 9)[1]).toBeCloseTo(-40.8, 5);
    // Without a scoop the floor meets the wall in a sharp edge, as before.
    expect(crossings(gridfinityTriangles(bin()), 6.95)[1]).toBeCloseTo(-40.8, 5);
    expect(gridfinityPlan(bin()).floorRounding).toBe(0);
    expect(gridfinityPlan(bin({ gridfinityScoopFront: true })).floorRounding).toBeCloseTo(2.8, 9);
    // A bin with no room for a scoop is not rounded either.
    expect(gridfinityPlan(bin({ gridfinityScoopFront: true, gridfinityLip: false, height: 7 })).floorRounding).toBe(0);
  });

  it("tells every scoop setting apart and keeps them all through a saved project", async () => {
    const settings: Record<string, unknown> = { gridfinityScoopRadius: 4.5 };
    Object.values(GRIDFINITY_SCOOP_WALL_KEYS).forEach((key) => Object.assign(settings, { [key]: true }));
    const scooped = canonicalizeShape(binShape(settings));
    Object.entries(settings).forEach(([key, value]) => {
      expect(workplaneShapesEqual(scooped, { ...scooped, [key]: typeof value === "boolean" ? !value : (value as number) + 1 })).toBe(false);
    });
    const exported = await exportLylProject({
      projectId: "scoops",
      projectName: "Scoops",
      createdAt: 1_700_000_000_000,
      modifiedAt: 1_700_000_100_000,
      shapes: [scooped],
      history: [editorHistoryEntry([scooped], [])],
      historyIndex: 0,
      assets: [],
      workspace: DEFAULT_WORKPLANE_WORKSPACE,
      snapGrid: DEFAULT_SNAP_GRID,
      placementElevation: 0,
    });
    const [loaded] = (await importLylProject(exported)).shapes;
    expect(workplaneShapesEqual(loaded, scooped)).toBe(true);
    expect(loaded).toMatchObject(settings);
    expect(sceneShape(scooped)).toMatchObject(settings);
    expect(cadModifierGridfinityForShape(scooped)).toMatchObject(settings);
    // The settings an MCP action passes on keep them, and so does a bin kept as the default for new ones.
    expect(normalizeShapeCustomizations({ gridfinity: settings }, {})).toMatchObject({ gridfinity: settings });
    expect(shapeDefaultsFromShape(scooped)).toMatchObject(settings);
    const asset = toolbarShapeAssets.find((entry) => entry.kind === "gridfinity")!;
    expect(makeShapeFromAsset(asset, { x: 0, z: 0 }, settings)).toMatchObject(settings);
  });
});

describe("gridfinity half-size grid", () => {
  let runtime: ManifoldToplevel;

  beforeAll(async () => {
    runtime = await manifoldModule();
    runtime.setup();
  });

  const half = (fields: Record<string, unknown> = {}) => bin({ gridfinityHalfGrid: true, ...fields });

  it("leaves a bin with the setting off, and every baseplate, exactly as it was", () => {
    expect(gridfinityTriangles(bin({ gridfinityHalfGrid: false }))).toEqual(gridfinityTriangles(bin()));
    expect(gridfinityTriangles(plate({ gridfinityHalfGrid: true }))).toEqual(gridfinityTriangles(plate()));
    expect(gridfinityPlan(plate({ gridfinityHalfGrid: true })).size).toEqual({ width: 84, depth: 42, height: 5 });
  });

  it("counts cells of 21 mm, a bin 0.5 mm smaller, up to 12 of them: the 251.5 mm of 6 whole units", () => {
    expect(gridfinityPlan(half({ width: 20.5, depth: 62.5 })).size).toEqual({ width: 20.5, depth: 62.5, height: 25.4 });
    expect(gridfinityUnits(half({ width: 20.5, depth: 62.5 }))).toEqual({ x: 1, z: 3, y: 3 });
    expect(gridfinityUnits(half({ width: 1000, depth: 1 }))).toMatchObject({ x: 12, z: 1 });
    expect(gridfinityFootprintPatch(half({ width: 1000, depth: 1 }))).toMatchObject({ width: 251.5, depth: 20.5 });
    // A drag snaps to 21 mm cells: 30 mm is 1.45 cells, 33 mm 1.6.
    expect(gridfinityFootprintPatch(half({ width: 30, depth: 33 }))).toMatchObject({ width: 20.5, depth: 41.5 });
  });

  it("keeps the outline when switched on, and rounds to whole units when switched off", () => {
    // 2 x 1 whole units are 4 x 2 half units of the same 83.5 x 41.5; 6 x 6 are 12 x 12, and 12 is as many as there can be.
    expect(gridfinityShapePatch(bin(), { halfGrid: true })).toMatchObject({ gridfinityHalfGrid: true, width: 83.5, depth: 41.5 });
    expect(gridfinityShapePatch(bin({ width: 251.5, depth: 251.5 }), { halfGrid: true })).toMatchObject({ width: 251.5, depth: 251.5 });
    expect(gridfinityShapePatch(half(), { x: 12, z: 13 })).toMatchObject({ width: 251.5, depth: 251.5 });
    // 3 half units (62.5) round to 2 whole ones, 1 half unit to 1.
    expect(gridfinityShapePatch(half({ width: 62.5, depth: 20.5 }), { halfGrid: false })).toMatchObject({ gridfinityHalfGrid: false, width: 83.5, depth: 41.5 });
    // A half bin turned into a baseplate keeps its outline in whole units, and back again; an odd count is read as the
    // baseplate reads a size given to it, without the bin's 0.5 mm: 62.5 mm is 1 unit, as canonicalizeShape makes it.
    expect(gridfinityShapePatch(half(), { type: "baseplate" })).toMatchObject({ width: 84, depth: 42, height: 5 });
    expect(gridfinityShapePatch(half({ width: 62.5 }), { type: "baseplate" })).toMatchObject({ width: 42 });
    expect(gridfinityFootprintPatch({ ...half({ width: 62.5 }), gridfinityType: "baseplate" })).toMatchObject({ width: 42 });
    expect(gridfinityShapePatch(plate({ gridfinityHalfGrid: true }), { type: "bin" })).toMatchObject({ width: 83.5, depth: 41.5 });
    // Other changes leave the setting as it is.
    expect(gridfinityShapePatch(bin(), { lip: false })).not.toHaveProperty("gridfinityHalfGrid");
  });

  it("puts a foot under every 21 mm cell: 20.5 mm at the top, the specification's steps, 14.6 mm at the bottom", () => {
    // 2 x 1 half units: cells at x = -10.5 and 10.5. On the straight step (y 2) a foot is 10.25 - 2.15 = 8.1 from its middle;
    // at the bottom 10.25 - 2.95 = 7.3, widening at 45 degrees to 7.7 at y 0.4.
    const triangles = gridfinityTriangles(half({ width: 41.5, depth: 20.5 }));
    crossings(triangles, 2).forEach((x, i) => expect(x).toBeCloseTo([-18.6, -2.4, 2.4, 18.6][i], 9));
    crossings(triangles, 0.4).forEach((x, i) => expect(x).toBeCloseTo([-10.5 - 7.7, -10.5 + 7.7, 10.5 - 7.7, 10.5 + 7.7][i], 9));
    expect(crossings(triangles, 2)).toHaveLength(4);
  });

  it("is closed, wound outwards and one piece, with the lip, magnets, label shelves and scoops", () => {
    for (const fields of [
      { width: 20.5, depth: 20.5 },
      { width: 20.5, depth: 20.5, gridfinityLip: false, gridfinityMagnets: true },
      { width: 62.5, depth: 41.5, gridfinityMagnets: true },
      { width: 251.5, depth: 251.5, height: 7 + GRIDFINITY_LIP_HEIGHT, gridfinityMagnets: true },
      { width: 20.5, depth: 20.5, gridfinityLabelBack: true, gridfinityLabelFront: true, gridfinityLabelLeft: true, gridfinityLabelRight: true, gridfinityLabelCornerSize: 10 },
      { width: 62.5, depth: 20.5, gridfinityLabelBack: true, gridfinityScoopFront: true, gridfinityScoopLeft: true },
    ]) {
      const triangles = gridfinityLabelledTriangles(runtime, half(fields));
      expect(edgeProblems(triangles)).toBe(0);
      expect(signedVolume(triangles)).toBeGreaterThan(0);
      expect(components(triangles)).toBe(1);
    }
  });

  it("drills the magnet holes where a baseplate has them: one a foot, 2.5 mm towards its cell's corner on the 42 mm grid", () => {
    const holes = (fields: Record<string, unknown>) => gridfinityPlan(half({ gridfinityMagnets: true, ...fields })).magnetHoles.map(({ x, z }) => [x, z].map((n) => Number(n.toFixed(9))));
    // 2 x 2 half units: where a bin of one whole unit has them.
    expect(holes({ width: 41.5, depth: 41.5 }).sort()).toEqual([[-13, -13], [-13, 13], [13, -13], [13, 13]].sort());
    expect(holes({ width: 20.5, depth: 20.5 })).toEqual([[-2.5, -2.5]]);
    // 3 x 1: cells at x = -21, 0 and 21; the middle one's grid corner is on its right.
    expect(holes({ width: 62.5, depth: 20.5 })).toEqual([[-23.5, -2.5], [2.5, -2.5], [18.5, -2.5]]);
  });

  it("keeps the shelves' corners small enough in a bin of one half unit to leave 2 mm open between facing shelves", () => {
    // 18.6 mm inside: shelves of 4 mm on both sides and corner pieces of at most 9.3 - 1 - 4 = 4.3 mm.
    const pieces = gridfinityLabelPieces(half({ width: 20.5, depth: 20.5, gridfinityLabelBack: true, gridfinityLabelFront: true, gridfinityLabelCornerSize: 10 }))!;
    expect(pieces.shelves.map(({ profile }) => profile.width)).toEqual([4, 4]);
    pieces.corners.forEach(({ size }) => expect(size).toBeLessThanOrEqual(4.3 + 1e-9));
    // The Corner size field shows what is built.
    expect(gridfinityLabelCornerSize(half({ width: 20.5, depth: 20.5, gridfinityLabelCornerSize: 10 }))).toBeCloseTo(4.3, 9);
    // A bin of whole units keeps its 10 mm corners.
    expect(Math.max(...gridfinityLabelPieces(bin({ gridfinityLabelBack: true, gridfinityLabelCornerSize: 10 }))!.corners.map(({ size }) => size))).toBe(10);
  });

  it("keeps a half bin's size through a saved project, a new shape and the exact body", async () => {
    const shape = canonicalizeShape(binShape({ gridfinityHalfGrid: true, width: 20.5, depth: 62.5, size: 62.5 }));
    expect(shape).toMatchObject({ width: 20.5, depth: 62.5 });
    expect(workplaneShapesEqual(shape, { ...shape, gridfinityHalfGrid: false })).toBe(false);
    const exported = await exportLylProject({
      projectId: "half",
      projectName: "Half",
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
    const [loaded] = (await importLylProject(exported)).shapes;
    expect(loaded).toMatchObject({ gridfinityHalfGrid: true, width: 20.5, depth: 62.5 });
    expect(sceneShape(shape)).toMatchObject({ gridfinityHalfGrid: true });
    const asset = toolbarShapeAssets.find((entry) => entry.kind === "gridfinity")!;
    expect(canonicalizeShape(makeShapeFromAsset(asset, { x: 0, z: 0 }, { gridfinityHalfGrid: true, width: 20.5, depth: 20.5 }))).toMatchObject({ width: 20.5, depth: 20.5, gridfinityHalfGrid: true });
    expect(cadModifierGridfinityForShape(shape)).toMatchObject({ gridfinityHalfGrid: true, width: 20.5, depth: 62.5 });
    // The mesh that booleans and the exact body's check use has a foot under every cell: three under this bin, one under a whole one.
    const lowest = (s: WorkplaneShape) => meshForShape(s).vertices.filter(([, y]) => Math.abs(y) < 1e-6).length;
    expect(lowest(shape)).toBe(3 * lowest(canonicalizeShape(binShape({ width: 41.5, depth: 41.5, size: 41.5 }))));
    // The settings an MCP action passes on keep it, and so does a half bin kept as the default for new ones.
    expect(normalizeShapeCustomizations({ gridfinity: { gridfinityHalfGrid: true } }, {})).toMatchObject({ gridfinity: { gridfinityHalfGrid: true } });
    expect(shapeDefaultsFromShape(shape)).toMatchObject({ gridfinityHalfGrid: true, width: 20.5, depth: 62.5 });
  });
});

describe("gridfinity floor height", () => {
  let runtime: ManifoldToplevel;

  beforeAll(async () => {
    runtime = await manifoldModule();
    runtime.setup();
  });

  /** The inside of a 2 x 1 bin: 81.6 x 39.6 mm with corners of 2.8 mm. */
  const insideArea = 81.6 * 39.6 - (4 - Math.PI) * 2.8 * 2.8;

  it("leaves a bin with the floor unset or at 5.95 mm, a bin of 1 height unit with the lip and a baseplate exactly as they were", () => {
    expect(gridfinityTriangles(bin({ gridfinityFloorHeight: 5.95 }))).toEqual(gridfinityTriangles(bin()));
    expect(gridfinityTriangles(bin({ gridfinityFloorHeight: 2 }))).toEqual(gridfinityTriangles(bin()));
    // 1 unit with the lip: its support reaches the wall at 7 - 1.65 = 5.35, under the floor, so there is nothing to raise.
    const low = { height: 7 + GRIDFINITY_LIP_HEIGHT };
    expect(gridfinityFloorFits(bin(low))).toBe(false);
    expect(gridfinityTriangles(bin({ ...low, gridfinityFloorHeight: 20 }))).toEqual(gridfinityTriangles(bin(low)));
    expect(gridfinityTriangles(plate({ gridfinityFloorHeight: 4 }))).toEqual(gridfinityTriangles(plate()));
  });

  it("rises to where the lip's support leaves the wall, 1.65 mm under the top, or to the top of a bin without the lip", () => {
    expect(gridfinityFloorHeight(bin())).toBeCloseTo(5.95, 9);
    expect(gridfinityFloorMaxHeight(bin())).toBeCloseTo(19.35, 9);
    expect(gridfinityFloorHeight(bin({ gridfinityFloorHeight: 30 }))).toBeCloseTo(19.35, 9);
    expect(gridfinityFloorHeight(bin({ gridfinityFloorHeight: 12 }))).toBe(12);
    expect(gridfinityFloorMaxHeight(bin({ gridfinityLip: false, height: 21 }))).toBe(21);
    expect(gridfinityFloorFits(bin({ gridfinityLip: false, height: 7 }))).toBe(true);
    expect(gridfinityFloorMaxHeight(bin({ gridfinityLip: false, height: 7 }))).toBe(7);
    // The feet of a bin stacked on the lip reach 0.35 mm into it: the highest floor stays 1.3 mm under them.
    expect(gridfinityFloorMaxHeight(bin())).toBeLessThanOrEqual(21 - 0.35 - 1.3 + 1e-9);
    // Within 0.05 mm of the highest it is raised onto it, so no sliver of wall is left.
    expect(gridfinityFloorHeight(bin({ gridfinityFloorHeight: 19.32 }))).toBeCloseTo(19.35, 9);
    expect(gridfinityFloorHeight(bin({ gridfinityFloorHeight: 19.2 }))).toBe(19.2);
    expect(gridfinityFloorHeight(bin({ gridfinityLip: false, height: 21, gridfinityFloorHeight: 20.99 }))).toBe(21);
    // 0.05 under the highest, where the field's 0.05 mm steps end, is raised onto it too.
    expect(gridfinityFloorHeight(bin({ gridfinityLip: false, height: 21, gridfinityFloorHeight: 20.95 }))).toBe(21);
    expect(gridfinityFloorHeight(bin({ gridfinityLip: false, height: 21, gridfinityFloorHeight: 20.9 }))).toBe(20.9);
  });

  it("fills the bin up to the floor: the inside's area times the rise", () => {
    // Within 0.1 %: the mesh draws the 2.8 mm corners as polygons.
    const plain = signedVolume(gridfinityTriangles(bin()));
    const raised = (gridfinityFloorHeight: number) => signedVolume(gridfinityTriangles(bin({ gridfinityFloorHeight }))) - plain;
    expect(raised(10) / (insideArea * (10 - 5.95))).toBeCloseTo(1, 3);
    expect(raised(30) / (insideArea * (19.35 - 5.95))).toBeCloseTo(1, 3);
  });

  it("leaves a bin without the lip raised to the top as one solid block", () => {
    const triangles = gridfinityTriangles(bin({ gridfinityLip: false, height: 21, gridfinityFloorHeight: 21 }));
    // At 15 mm up the only walls a line crosses are the outer ones.
    expect(crossings(triangles, 15)).toHaveLength(2);
    crossings(triangles, 15).forEach((x, i) => expect(x).toBeCloseTo([-41.75, 41.75][i], 9));
    expect(bounds(triangles).max[1]).toBe(21);
  });

  it("is closed, wound outwards and one piece at any height, with the lip or without, shelves, scoops, magnets and the half-size grid", () => {
    for (const fields of [
      { gridfinityFloorHeight: 10 },
      { gridfinityFloorHeight: 19.35 },
      { gridfinityFloorHeight: 19.345 },
      { gridfinityFloorHeight: 19.34 },
      { gridfinityFloorHeight: 30, gridfinityMagnets: true },
      { gridfinityLip: false, height: 21, gridfinityFloorHeight: 21 },
      { gridfinityLip: false, height: 21, gridfinityFloorHeight: 20.99 },
      { gridfinityLip: false, height: 21, gridfinityFloorHeight: 20.999 },
      { gridfinityLip: false, height: 7, gridfinityFloorHeight: 7 },
      { gridfinityFloorHeight: 9, gridfinityScoopFront: true, gridfinityScoopLeft: true, gridfinityLabelBack: true },
      { height: 42 + GRIDFINITY_LIP_HEIGHT, gridfinityFloorHeight: 20, gridfinityScoopBack: true, gridfinityLabelFront: true, gridfinityLabelLeft: true },
      { gridfinityFloorHeight: 15.5, gridfinityLabelBack: true, gridfinityLabelFront: true },
      { gridfinityHalfGrid: true, width: 20.5, depth: 41.5, gridfinityFloorHeight: 12, gridfinityMagnets: true },
    ]) {
      const triangles = gridfinityLabelledTriangles(runtime, bin(fields));
      expect(edgeProblems(triangles)).toBe(0);
      expect(signedVolume(triangles)).toBeGreaterThan(0);
      expect(components(triangles)).toBe(1);
    }
  });

  it("starts the scoops on the raised floor, narrows the shelves above it, and leaves both out once it leaves them no room", () => {
    // A scoop rises from the floor to the lip's support: 21 - 10 - 1.65 = 9.35 mm, half of it by default.
    expect(gridfinityScoopRadius(bin({ gridfinityScoopFront: true, gridfinityFloorHeight: 10 }))).toBeCloseTo(4.675, 9);
    expect(gridfinityScoopPieces(bin({ gridfinityScoopFront: true, gridfinityFloorHeight: 10 }))!.floor).toBe(10);
    // It needs 3.5 + 0.5 mm: up to a floor of 21 - 1.65 - 4 = 15.35.
    expect(gridfinityScoopFits(bin({ gridfinityFloorHeight: 15.35 }))).toBe(true);
    expect(gridfinityScoopFits(bin({ gridfinityFloorHeight: 15.4 }))).toBe(false);
    expect(gridfinityScoopPieces(bin({ gridfinityScoopFront: true, gridfinityFloorHeight: 15.4 }))).toBeNull();
    // A shelf's underside ends 0.5 mm above the floor and the narrowest shelf is 4 mm: up to a floor of
    // 21 - 0.85 - 1.2 - 0.5 - 4 tan 36 = 15.54.
    expect(gridfinityLabelPieces(bin({ gridfinityLabelBack: true, gridfinityFloorHeight: 15.5 }))!.floor).toBe(15.5);
    // With the floor at 10 the widest shelf is (21 - 0.85 - 1.2 - 10 - 0.5) / tan 36 = 11.70 mm, under the 14 mm it has by default.
    const [shelf] = gridfinityLabelPieces(bin({ gridfinityLabelBack: true, gridfinityFloorHeight: 10 }))!.shelves;
    expect(shelf.profile.width).toBeCloseTo((21 - 0.85 - 1.2 - 10 - 0.5) / Math.tan((36 * Math.PI) / 180), 9);
    expect(gridfinityLabelFits(bin({ gridfinityFloorHeight: 15.5 }))).toBe(true);
    expect(gridfinityLabelFits(bin({ gridfinityFloorHeight: 15.6 }))).toBe(false);
    expect(gridfinityLabelPieces(bin({ gridfinityLabelBack: true, gridfinityFloorHeight: 15.6 }))).toBeNull();
    expect(gridfinityLabelledTriangles(runtime, bin({ gridfinityLabelBack: true, gridfinityScoopFront: true, gridfinityFloorHeight: 16 }))).toEqual(gridfinityTriangles(bin({ gridfinityFloorHeight: 16 })));
  });

  it("keeps the floor height through a saved project, the settings and the exact body", async () => {
    const settings = { gridfinityFloorHeight: 12.5 };
    const shape = canonicalizeShape(binShape(settings));
    expect(workplaneShapesEqual(shape, { ...shape, gridfinityFloorHeight: 13 })).toBe(false);
    const exported = await exportLylProject({
      projectId: "floor",
      projectName: "Floor",
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
    const [loaded] = (await importLylProject(exported)).shapes;
    expect(workplaneShapesEqual(loaded, shape)).toBe(true);
    expect(loaded).toMatchObject(settings);
    expect(sceneShape(shape)).toMatchObject(settings);
    expect(cadModifierGridfinityForShape(shape)).toMatchObject(settings);
    expect(normalizeShapeCustomizations({ gridfinity: settings }, {})).toMatchObject({ gridfinity: settings });
    expect(shapeDefaultsFromShape(shape)).toMatchObject(settings);
    const asset = toolbarShapeAssets.find((entry) => entry.kind === "gridfinity")!;
    expect(makeShapeFromAsset(asset, { x: 0, z: 0 }, settings)).toMatchObject(settings);
    // The mesh that booleans and the exact body's check use has the raised floor.
    const meshVolume = (s: WorkplaneShape) => { const { vertices, faces } = meshForShape(s); return signedVolume(faces.map((face) => face.map((i) => vertices[i]) as V[])); };
    expect((meshVolume(shape) - meshVolume(canonicalizeShape(binShape({})))) / (insideArea * (12.5 - 5.95))).toBeCloseTo(1, 3);
  });
});

describe("gridfinity bins without compartments, unchanged by them", () => {
  let runtime: ManifoldToplevel;

  beforeAll(async () => {
    runtime = await manifoldModule();
    runtime.setup();
  });

  const round9 = (n: number) => Number(n.toFixed(9));
  /** A shelf as [wall, width, from, to] and its strip setting where it has one. */
  const profileOf = ({ wall, width, from, to, strip }: GridfinityLabelProfile) => [wall, round9(width), round9(from), round9(to), ...(strip === undefined ? [] : [strip])];
  /** A corner piece or rounded end as [x, z, a.x, a.z, b.x, b.z, size, round, reach along a, reach along b]. */
  const cornerOf = ({ at, a, b, size, round, reachA, reachB }: GridfinityLabelCornerShape) => [round9(at.x), round9(at.z), round9(a.x), round9(a.z), round9(b.x), round9(b.z), round9(size), round, round9(reachA), round9(reachB)];
  /** Every field of the shelf pieces, to 1e-9: each shelf with its rounded ends, each corner piece with the shelves it lies under. */
  const shelvesOf = (fields: Record<string, unknown>) => {
    const pieces = gridfinityLabelPieces(bin(fields));
    return pieces && {
      top: round9(pieces.top),
      floor: round9(pieces.floor),
      inside: [round9(pieces.inside.hx), round9(pieces.inside.hz), round9(pieces.inside.radius)],
      shelves: pieces.shelves.map(({ profile, notches }) => [profileOf(profile), notches.map(cornerOf)]),
      corners: pieces.corners.map((corner) => [...cornerOf(corner), corner.under.map(profileOf)]),
    };
  };

  it("builds the same mesh and shelves for every bin of one compartment and every baseplate as before dividers came in", () => {
    // Taken before dividers came in: triangles and volume of the bin's own mesh and of the display mesh, and the
    // shelf pieces. A bin without dividers must come out exactly as it did then.
    const big = { width: 125.5, depth: 83.5, height: 42 + GRIDFINITY_LIP_HEIGHT };
    for (const [fields, triangles, volume, labelledTriangles, labelledVolume, shelves] of [
      [{}, 1084, 23244.7224, 1084, 23244.7224, null],
      [{ gridfinityLip: false, height: 21 }, 832, 21309.5035, 832, 21309.5035, null],
      [{ gridfinityMagnets: true }, 2108, 22611.6933, 2108, 22611.6933, null],
      [{ width: 41.5, depth: 41.5 }, 716, 12402.4573, 716, 12402.4573, null],
      [{ gridfinityHalfGrid: true, width: 20.5, depth: 20.5 }, 716, 3459.6073, 716, 3459.6073, null],
      [{ gridfinityFloorHeight: 12.5 }, 1084, 44365.0148, 1084, 44365.0148, null],
      [{ gridfinityScoopFront: true }, 1692, 23646.8348, 1456, 24251.216, null],
      [{ gridfinityScoopFront: true, gridfinityScoopBack: true, gridfinityScoopLeft: true, gridfinityScoopRight: true }, 1692, 23646.8348, 1328, 25374.4196, null],
      [
        { gridfinityLabelBack: true, gridfinityLabelLeft: true, gridfinityLabelRight: true },
        1084, 23244.7224, 1316, 35465.5396,
        {
          top: 20.15,
          floor: 5.95,
          inside: [40.8, 19.8, 2.8],
          shelves: [[["back", 14, -41.8, 41.8], []], [["left", 14, -20.8, 20.8], []], [["right", 14, -20.8, 20.8], []]],
          corners: [
            [-26.8, -5.8, 1, 0, 0, 1, 2, true, 1, 0, [["back", 14, -41.8, 41.8], ["back", 16, -41.8, 41.8, true], ["left", 14, -20.8, 20.8], ["left", 16, -20.8, 20.8, true]]],
            [26.8, -5.8, -1, 0, 0, 1, 2, true, 1, 0, [["back", 14, -41.8, 41.8], ["back", 16, -41.8, 41.8, true], ["right", 14, -20.8, 20.8], ["right", 16, -20.8, 20.8, true]]],
            [-26.8, 19.8, 0, -1, 1, 0, 2, true, 1, 0, [["left", 14, -20.8, 20.8], ["left", 16, -20.8, 20.8, true]]],
            [26.8, 19.8, 0, -1, -1, 0, 2, true, 1, 0, [["right", 14, -20.8, 20.8], ["right", 16, -20.8, 20.8, true]]],
          ],
        },
      ],
      [
        { gridfinityLabelFront: true, gridfinityLabelFrontLength: 36, gridfinityLabelFrontOffset: -10, gridfinityLabelCorner: "chamfer" },
        1084, 23244.7224, 1044, 26443.5113,
        {
          top: 20.15,
          floor: 5.95,
          inside: [40.8, 19.8, 2.8],
          shelves: [[["front", 14, -8, 28], []]],
          corners: [
            [8, 19.8, 1, 0, 0, -1, 2, false, 0, 1, [["front", 14, -41.8, 41.8]]],
            [-28, 19.8, -1, 0, 0, -1, 2, false, 0, 1, [["front", 14, -41.8, 41.8]]],
          ],
        },
      ],
      [
        { gridfinityLabelBack: true, gridfinityLabelBackLength: 30, gridfinityLabelBackOffset: 100 },
        1084, 23244.7224, 1166, 25861.2635,
        {
          top: 20.15,
          floor: 5.95,
          inside: [40.8, 19.8, 2.8],
          shelves: [[["back", 14, 10.8, 41.8], [[10.8, -5.8, 1, 0, 0, -1, 2, true, 1, 1]]]],
          corners: [
            [10.8, -19.8, -1, 0, 0, 1, 2, true, 0, 1, [["back", 14, -41.8, 41.8]]],
            [40.8, -5.8, -1, 0, 0, 1, 2, true, 1, 0, [["back", 14, -41.8, 41.8], ["back", 16, -41.8, 41.8, true]]],
          ],
        },
      ],
      [
        { gridfinityLabelBack: true, gridfinityLabelLeft: true, gridfinityLabelBackWidth: 6, gridfinityLabelLeftWidth: 16 },
        1084, 23244.7224, 1252, 28951.8788,
        {
          top: 20.15,
          floor: 5.95,
          inside: [40.8, 19.8, 2.8],
          shelves: [[["back", 6, -41.8, 41.8], []], [["left", 16, -20.8, 20.8], []]],
          corners: [
            [-24.8, -13.8, 1, 0, 0, 1, 2, true, 1, 0, [["back", 6, -41.8, 41.8], ["back", 8, -41.8, 41.8, true], ["left", 16, -20.8, 20.8], ["left", 18, -20.8, 20.8, true]]],
            [40.8, -13.8, -1, 0, 0, 1, 2, true, 1, 0, [["back", 6, -41.8, 41.8], ["back", 8, -41.8, 41.8, true]]],
            [-24.8, 19.8, 0, -1, 1, 0, 2, true, 1, 0, [["left", 16, -20.8, 20.8], ["left", 18, -20.8, 20.8, true]]],
          ],
        },
      ],
      [
        { ...big, gridfinityLabelBack: true, gridfinityLabelFront: true, gridfinityLabelLeft: true, gridfinityLabelRight: true },
        2416, 71039.5996, 2558, 103354.7915,
        {
          top: 41.15,
          floor: 5.95,
          inside: [61.8, 40.8, 2.8],
          shelves: [[["back", 14, -62.8, 62.8], []], [["front", 14, -62.8, 62.8], []], [["left", 14, -41.8, 41.8], []], [["right", 14, -41.8, 41.8], []]],
          corners: [
            [-47.8, -26.8, 1, 0, 0, 1, 2, true, 1, 0, [["back", 14, -62.8, 62.8], ["back", 16, -62.8, 62.8, true], ["left", 14, -41.8, 41.8], ["left", 16, -41.8, 41.8, true]]],
            [47.8, -26.8, -1, 0, 0, 1, 2, true, 1, 0, [["back", 14, -62.8, 62.8], ["back", 16, -62.8, 62.8, true], ["right", 14, -41.8, 41.8], ["right", 16, -41.8, 41.8, true]]],
            [47.8, 26.8, -1, 0, 0, -1, 2, true, 1, 0, [["front", 14, -62.8, 62.8], ["front", 16, -62.8, 62.8, true], ["right", 14, -41.8, 41.8], ["right", 16, -41.8, 41.8, true]]],
            [-47.8, 26.8, 1, 0, 0, -1, 2, true, 1, 0, [["front", 14, -62.8, 62.8], ["front", 16, -62.8, 62.8, true], ["left", 14, -41.8, 41.8], ["left", 16, -41.8, 41.8, true]]],
          ],
        },
      ],
    ] as const) {
      const context = JSON.stringify(fields);
      const plain = gridfinityTriangles(bin(fields));
      const labelled = gridfinityLabelledTriangles(runtime, bin(fields));
      expect(plain.length, context).toBe(triangles);
      expect(signedVolume(plain), context).toBeCloseTo(volume, 3);
      expect(labelled.length, context).toBe(labelledTriangles);
      expect(signedVolume(labelled), context).toBeCloseTo(labelledVolume, 3);
      expect(shelvesOf(fields), context).toEqual(shelves);
      // Every side's open switch stored as off builds the same (#682).
      const closed = { ...fields, gridfinityOpenBack: false, gridfinityOpenFront: false, gridfinityOpenLeft: false, gridfinityOpenRight: false };
      expect(gridfinityTriangles(bin(closed)), context).toEqual(plain);
      expect(gridfinityLabelledTriangles(runtime, bin(closed)), context).toEqual(labelled);
      expect(shelvesOf(closed), context).toEqual(shelves);
    }
    const baseplate = gridfinityTriangles(plate());
    expect(baseplate.length).toBe(812);
    expect(signedVolume(baseplate)).toBeCloseTo(2826.9698, 3);
    expect(gridfinityLabelledTriangles(runtime, plate())).toEqual(baseplate);
  });
});

describe("gridfinity bins with every side closed, unchanged by open sides", { timeout: 30_000 }, () => {
  let runtime: ManifoldToplevel;

  beforeAll(async () => {
    runtime = await manifoldModule();
    runtime.setup();
  });

  const closed = { gridfinityOpenBack: false, gridfinityOpenFront: false, gridfinityOpenLeft: false, gridfinityOpenRight: false };

  it("builds the same compartments, dividers and bounds as before open sides came in, also with every side switched off", () => {
    // Taken before open sides came in (#682): triangles and volume of the display mesh, the dividers' and the floors'
    // bounds, and each compartment's middle and half sizes.
    const even = [[-27.6, -10.2, 13.2, 9.6], [0, -10.2, 13.2, 9.6], [27.6, -10.2, 13.2, 9.6], [-27.6, 10.2, 13.2, 9.6], [0, 10.2, 13.2, 9.6], [27.6, 10.2, 13.2, 9.6]];
    for (const [fields, triangles, volume, dividers, floors, cells] of [
      [{ gridfinityScoopFront: true }, 5052, 28365.4391, 3156.200072676, 1791.343643112, even],
      [{ gridfinityScoopFront: true, gridfinityCompartmentLabels: [{ column: 1, row: 1, side: "back" }] }, 5170, 29894.8093, 3156.200072676, 1791.343643112, even],
      [
        { gridfinityDividerPositionsX: [10, 60.3], gridfinityDividerPositionsZ: [25.5] }, 3640, 27274.3485, 3156.200072676, 832.455566956,
        [[-36.1, -7.35, 4.7, 12.45], [-5.65, -7.35, 24.55, 12.45], [30.45, -7.35, 10.35, 12.45], [-36.1, 13.05, 4.7, 6.75], [-5.65, 13.05, 24.55, 6.75], [30.45, 13.05, 10.35, 6.75]],
      ],
      [{ gridfinityLip: false, height: 21 }, 3446, 25348.1282, 3176.959865306, 832.455566956, even],
    ] as const) {
      for (const shape of [bin({ gridfinityCompartmentsX: 3, gridfinityCompartmentsZ: 2, ...fields }), bin({ gridfinityCompartmentsX: 3, gridfinityCompartmentsZ: 2, ...fields, ...closed })]) {
        const context = JSON.stringify(shape);
        const mesh = gridfinityLabelledTriangles(runtime, shape) as V[][];
        expect(mesh.length, context).toBe(triangles);
        expect(signedVolume(mesh), context).toBeCloseTo(volume, 3);
        const pieces = gridfinityCompartmentPieces(shape)!;
        expect(pieces.cells.map((cell) => [cell.centre.x, cell.centre.z, cell.inside.hx, cell.inside.hz].map((n) => Number(n.toFixed(9)) + 0)), context).toEqual(cells);
        expect(gridfinityDividerBound(gridfinityPlan(shape), pieces), context).toBeCloseTo(dividers, 8);
        expect(gridfinityCompartmentFloorBound(gridfinityPlan(shape), pieces), context).toBeCloseTo(floors, 8);
      }
    }
  });

  it("leaves a solid block as it was with a side switched on: it has no sides to open", () => {
    const block = { gridfinityLip: false, height: 21, gridfinityFloorHeight: 21 };
    expect(gridfinityTriangles(bin({ ...block, gridfinityOpenFront: true }))).toStrictEqual(gridfinityTriangles(bin(block)));
  });
});

// Each case builds whole bins through Manifold; on a slow CI runner one took longer than the default 5 s (PR #657).
describe("gridfinity dividers", { timeout: 30_000 }, () => {
  let runtime: ManifoldToplevel;

  beforeAll(async () => {
    runtime = await manifoldModule();
    runtime.setup();
  });

  /** A bin of 6 x 6 x 3 units. */
  const large = { width: 251.5, depth: 251.5 };
  const count = (fields: Record<string, unknown>) => [gridfinityCompartmentCount(bin(fields), "x"), gridfinityCompartmentCount(bin(fields), "z")];
  const cellsOf = (fields: Record<string, unknown>) => gridfinityCompartments(bin(fields))!.cells;

  it("leaves a bin of one compartment, a bin too low for dividers and a baseplate exactly as they were", () => {
    const divided = { gridfinityCompartmentsX: 3, gridfinityCompartmentsZ: 2 };
    for (const fields of [{}, { gridfinityCompartmentsX: 1, gridfinityCompartmentsZ: 1, gridfinityDividerPositionsX: [20] }, { gridfinityDividerThickness: 2 }]) {
      expect(gridfinityTriangles(bin(fields)), JSON.stringify(fields)).toEqual(gridfinityTriangles(bin()));
      expect(gridfinityLabelledTriangles(runtime, bin(fields)), JSON.stringify(fields)).toEqual(gridfinityTriangles(bin()));
      expect(gridfinityCompartments(bin(fields)), JSON.stringify(fields)).toBeNull();
    }
    // 1 height unit with the lip, and 3 units with the floor raised to 17.2: no room for a divider.
    for (const fields of [{ height: 7 + GRIDFINITY_LIP_HEIGHT }, { gridfinityFloorHeight: 17.2 }]) {
      expect(gridfinityLabelledTriangles(runtime, bin({ ...fields, ...divided })), JSON.stringify(fields)).toEqual(gridfinityTriangles(bin(fields)));
      expect(gridfinityCompartments(bin({ ...fields, ...divided })), JSON.stringify(fields)).toBeNull();
      expect(count({ ...fields, ...divided }), JSON.stringify(fields)).toEqual([1, 1]);
    }
    expect(gridfinityLabelledTriangles(runtime, plate(divided))).toEqual(gridfinityTriangles(plate()));
    expect(gridfinityCompartments(plate(divided))).toBeNull();
  });

  it("is offered only while the divider top, 0.85 mm under the top, stands at least 3 mm above the floor", () => {
    // 1 unit: 7 - 0.85 - 5.95 = 0.2; 2 units: 7.2; 3 units with the floor at 17.15: 3.0, at 17.2: 2.95.
    expect(gridfinityDividerFits(bin({ height: 7 + GRIDFINITY_LIP_HEIGHT }))).toBe(false);
    expect(gridfinityDividerFits(bin({ height: 14 + GRIDFINITY_LIP_HEIGHT }))).toBe(true);
    expect(gridfinityDividerFits(bin({ gridfinityFloorHeight: 17.15 }))).toBe(true);
    expect(gridfinityDividerFits(bin({ gridfinityFloorHeight: 17.2 }))).toBe(false);
    // Without the lip the same.
    expect(gridfinityDividerFits(bin({ gridfinityLip: false, height: 7 }))).toBe(false);
    expect(gridfinityDividerFits(bin({ gridfinityLip: false, height: 14 }))).toBe(true);
    expect(gridfinityDividerFits(bin({ gridfinityLip: false, height: 21, gridfinityFloorHeight: 17.15 }))).toBe(true);
    expect(gridfinityDividerFits(bin({ gridfinityLip: false, height: 21, gridfinityFloorHeight: 17.2 }))).toBe(false);
    expect(gridfinityDividerFits(plate())).toBe(false);
  });

  it("spaces the dividers evenly unless they were moved, measured from the inside of the wall to their middle", () => {
    const fields = { gridfinityCompartmentsX: 3, gridfinityCompartmentsZ: 2 };
    // 81.6 x 39.6 inside: compartments of (81.6 - 2 x 1.2) / 3 = 26.4 across and (39.6 - 1.2) / 2 = 19.2 deep.
    gridfinityDividerPositions(bin(fields), "x").forEach((p, i) => expect(p).toBeCloseTo([27, 54.6][i], 9));
    gridfinityDividerPositions(bin(fields), "z").forEach((p, i) => expect(p).toBeCloseTo([19.8][i], 9));
    expect(gridfinityDividerPositions(bin(fields), "x")).toHaveLength(2);
    expect(gridfinityDividerPositions(bin(fields), "z")).toHaveLength(1);
    const compartments = gridfinityCompartments(bin(fields))!;
    expect(compartments.thickness).toBe(1.2);
    compartments.xs.forEach((x, i) => expect(x).toBeCloseTo([-13.8, 13.8][i], 9));
    compartments.zs.forEach((z, i) => expect(z).toBeCloseTo([0][i], 9));
    expect(compartments.cells).toHaveLength(6);
    const xs = [[-40.8, -14.4], [-13.2, 13.2], [14.4, 40.8]];
    const zs = [[-19.8, -0.6], [0.6, 19.8]];
    compartments.cells.forEach((cell) => {
      const context = `${cell.column},${cell.row}`;
      expect(cell.x0, context).toBeCloseTo(xs[cell.column][0], 9);
      expect(cell.x1, context).toBeCloseTo(xs[cell.column][1], 9);
      expect(cell.z0, context).toBeCloseTo(zs[cell.row][0], 9);
      expect(cell.z1, context).toBeCloseTo(zs[cell.row][1], 9);
      expect(cell.hx, context).toBeCloseTo(13.2, 9);
      expect(cell.hz, context).toBeCloseTo(9.6, 9);
      expect(cell.centre.x, context).toBeCloseTo((xs[cell.column][0] + xs[cell.column][1]) / 2, 9);
      expect(cell.centre.z, context).toBeCloseTo((zs[cell.row][0] + zs[cell.row][1]) / 2, 9);
      expect(cell.onWall, context).toEqual({ back: cell.row === 0, front: cell.row === 1, left: cell.column === 0, right: cell.column === 2 });
    });
    // Counted from the back left, row by row.
    expect(compartments.cells.map(({ column, row }) => [column, row])).toEqual([[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]]);
    for (const t of [0.8, 3]) {
      cellsOf({ gridfinityCompartmentsX: 3, gridfinityDividerThickness: t }).forEach((cell) => expect(cell.x1 - cell.x0, `${t}`).toBeCloseTo((81.6 - 2 * t) / 3, 9));
    }
  });

  it("takes the divider thickness between 0.8 and 3 mm, 1.2 unless set, and whole numbers of compartments", () => {
    expect(gridfinityDividerThickness(bin())).toBe(1.2);
    expect(gridfinityDividerThickness(bin({ gridfinityDividerThickness: 2 }))).toBe(2);
    expect(gridfinityDividerThickness(bin({ gridfinityDividerThickness: 0.5 }))).toBe(0.8);
    expect(gridfinityDividerThickness(bin({ gridfinityDividerThickness: 5 }))).toBe(3);
    expect(gridfinityDividerThickness(bin({ gridfinityDividerThickness: Number.NaN }))).toBe(1.2);
    expect(count({ gridfinityCompartmentsX: 1.5, gridfinityCompartmentsZ: 2.4 })).toEqual([2, 2]);
    expect(count({ gridfinityCompartmentsX: 0, gridfinityCompartmentsZ: -3 })).toEqual([1, 1]);
    expect(count({ gridfinityCompartmentsX: Number.NaN })).toEqual([1, 1]);
    expect(count({})).toEqual([1, 1]);
  });

  it("takes at most 4 compartments a grid unit each way and 40 in all, lowering the number across first", () => {
    expect(gridfinityUnitCompartments(bin({ width: 41.5 }), "x")).toBe(4);
    expect(gridfinityUnitCompartments(bin({ width: 41.5, gridfinityDividerThickness: 3 }), "x")).toBe(4);
    expect(gridfinityUnitCompartments(bin({ gridfinityHalfGrid: true, width: 20.5, depth: 20.5 }), "x")).toBe(2);
    expect(gridfinityUnitCompartments(bin(large), "z")).toBe(24);
    expect(gridfinityUnitCompartments(bin({ gridfinityHalfGrid: true, width: 125.5, depth: 20.5 }), "x")).toBe(12);
    // At that many with 3 mm dividers every compartment still has room: (39.6 - 3 x 3) / 4 = 7.65 and (18.6 - 3) / 2 = 7.8.
    cellsOf({ width: 41.5, gridfinityCompartmentsX: 9, gridfinityDividerThickness: 3 }).forEach((cell) => expect(cell.x1 - cell.x0).toBeCloseTo(7.65, 9));
    cellsOf({ gridfinityHalfGrid: true, width: 20.5, depth: 20.5, gridfinityCompartmentsX: 9, gridfinityDividerThickness: 3 }).forEach((cell) => expect(cell.x1 - cell.x0).toBeCloseTo(7.8, 9));
    for (const [fields, built] of [
      [{ ...large, gridfinityCompartmentsX: 10, gridfinityCompartmentsZ: 10 }, [4, 10]],
      [{ ...large, gridfinityCompartmentsX: 20, gridfinityCompartmentsZ: 5 }, [8, 5]],
      [{ ...large, gridfinityCompartmentsX: 24, gridfinityCompartmentsZ: 24 }, [1, 24]],
      [{ ...large, gridfinityCompartmentsX: 20, gridfinityCompartmentsZ: 6 }, [6, 6]],
      [{ ...large, gridfinityCompartmentsX: 30, gridfinityCompartmentsZ: 1 }, [24, 1]],
      [{ width: 251.5, gridfinityCompartmentsX: 24, gridfinityCompartmentsZ: 4 }, [10, 4]],
      [{ width: 41.5, depth: 41.5, gridfinityCompartmentsZ: 9 }, [1, 4]],
    ] as const) {
      expect(count(fields), JSON.stringify(fields)).toEqual(built);
      expect(cellsOf(fields), JSON.stringify(fields)).toHaveLength(built[0] * built[1]);
    }
    // What the settings window offers: with 5 deep at most 8 across, and with 8 across at most 5 deep.
    expect(gridfinityCompartmentMax(bin({ ...large, gridfinityCompartmentsZ: 5 }), "x")).toBe(8);
    expect(gridfinityCompartmentMax(bin({ ...large, gridfinityCompartmentsX: 8, gridfinityCompartmentsZ: 5 }), "z")).toBe(5);
    expect(gridfinityCompartmentMax(bin(large), "x")).toBe(24);
    expect(gridfinityCompartmentMax(bin(), "z")).toBe(4);
  });

  it("keeps every compartment at least 6 mm wide however the dividers were moved, and spaces a list of the wrong length evenly", () => {
    // 2 deep in 39.6 mm: a divider's middle stays between 6.6 and 33.
    const deep = (positions: number[]) => gridfinityDividerPositions(bin({ gridfinityCompartmentsZ: 2, gridfinityDividerPositionsZ: positions }), "z");
    expect(deep([3])[0]).toBeCloseTo(6.6, 9);
    expect(deep([36])[0]).toBeCloseTo(33, 9);
    expect(deep([12.5])).toEqual([12.5]);
    // Three across pushed onto one another keep 6 mm and a divider between their middles.
    const across = (positions: number[]) => gridfinityDividerPositions(bin({ gridfinityCompartmentsX: 3, gridfinityDividerPositionsX: positions }), "x");
    across([40, 40]).forEach((p, i) => expect(p).toBeCloseTo([40, 47.2][i], 9));
    across([80, 80]).forEach((p, i) => expect(p).toBeCloseTo([67.8, 75][i], 9));
    across([50, 20]).forEach((p, i) => expect(p).toBeCloseTo([20, 50][i], 9));
    across([30]).forEach((p, i) => expect(p).toBeCloseTo([27, 54.6][i], 9));
    across([30, 40, 50]).forEach((p, i) => expect(p).toBeCloseTo([27, 54.6][i], 9));
    cellsOf({ gridfinityCompartmentsX: 3, gridfinityDividerPositionsX: [0, 0] }).forEach((cell) => expect(cell.x1 - cell.x0).toBeGreaterThanOrEqual(6 - 1e-9));
  });

  it("offers each divider the room between its neighbours in steps of 0.1 mm", () => {
    const limits = (fields: Record<string, unknown>, axis: "x" | "z", index: number) => {
      const { min, max } = gridfinityDividerLimits(bin(fields), axis, index)!;
      return [Number(min.toFixed(9)), Number(max.toFixed(9))];
    };
    expect(limits({ gridfinityCompartmentsZ: 2 }, "z", 0)).toEqual([6.6, 33]);
    expect(limits({ gridfinityCompartmentsX: 3 }, "x", 0)).toEqual([6.6, 47.4]);
    expect(limits({ gridfinityCompartmentsX: 3 }, "x", 1)).toEqual([34.2, 75]);
    // 1.25 mm thick: 6.625 and 32.975 are rounded inwards onto the slider's steps.
    expect(limits({ gridfinityCompartmentsZ: 2, gridfinityDividerThickness: 1.25 }, "z", 0)).toEqual([6.7, 32.9]);
    expect(gridfinityDividerLimits(bin({ gridfinityCompartmentsZ: 2 }), "x", 0)).toBeNull();
    expect(gridfinityDividerLimits(bin({ gridfinityCompartmentsZ: 2 }), "z", 1)).toBeNull();
    // 1.7 mm thick in one unit: the dividers built at 6.85 and 14.55 sit off the steps, the first with no room at all.
    // Its slider keeps it where it is instead of offering 6.9 to 6.8, and the second's starts at it.
    const tight = bin({ width: 41.5, gridfinityCompartmentsX: 3, gridfinityDividerThickness: 1.7, gridfinityDividerPositionsX: [6.6, 13.8] });
    expect(gridfinityDividerPositions(tight, "x").map((p) => Number(p.toFixed(9)))).toEqual([6.85, 14.55]);
    expect(limits({ width: 41.5, gridfinityCompartmentsX: 3, gridfinityDividerThickness: 1.7, gridfinityDividerPositionsX: [6.6, 13.8] }, "x", 0)).toEqual([6.85, 6.85]);
    expect(limits({ width: 41.5, gridfinityCompartmentsX: 3, gridfinityDividerThickness: 1.7, gridfinityDividerPositionsX: [6.6, 13.8] }, "x", 1)).toEqual([14.55, 32.7]);
    gridfinityDividerPositions(tight, "x").forEach((p, i) => {
      const { min, max } = gridfinityDividerLimits(tight, "x", i)!;
      expect(min, `${i}`).toBeLessThanOrEqual(p);
      expect(max, `${i}`).toBeGreaterThanOrEqual(p);
    });
    // Moving the first one anywhere writes the places it already has.
    gridfinityDividerPositionPatch(tight, "x", 0, 6.9).gridfinityDividerPositionsX!.forEach((p, i) => expect(p).toBeCloseTo([6.85, 14.55][i], 9));
  });

  it("puts the dividers' top 0.85 mm under the top, with the lip or without", () => {
    expect(gridfinityCompartments(bin({ gridfinityCompartmentsX: 2 }))!.top).toBeCloseTo(20.15, 9);
    expect(gridfinityCompartments(bin({ gridfinityCompartmentsX: 2, gridfinityLip: false, height: 21 }))!.top).toBeCloseTo(20.15, 9);
    expect(gridfinityCompartments(bin({ gridfinityCompartmentsX: 2, height: 14 + GRIDFINITY_LIP_HEIGHT }))!.top).toBeCloseTo(13.15, 9);
  });

  it("rounds every compartment's floor by 2.8 mm with a scoop or without, and repeats each scoop in every compartment on its side", () => {
    const fields = { gridfinityCompartmentsX: 3, gridfinityCompartmentsZ: 2 };
    for (const scoop of [{}, { gridfinityScoopFront: true }]) {
      const pieces = gridfinityCompartmentPieces(bin({ ...fields, ...scoop }))!;
      expect(pieces.floorRounding, JSON.stringify(scoop)).toBeCloseTo(2.8, 9);
      expect(pieces.top, JSON.stringify(scoop)).toBeCloseTo(20.15, 9);
      expect(pieces.floor, JSON.stringify(scoop)).toBeCloseTo(5.95, 9);
      expect(pieces.thickness, JSON.stringify(scoop)).toBe(1.2);
      expect(pieces.cells.map(({ column, row }) => [column, row])).toEqual([[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]]);
    }
    expect(gridfinityCompartmentPieces(bin(fields))!.cells.every((cell) => cell.scoops === null)).toBe(true);
    expect(gridfinityCompartmentPieces(bin())).toBeNull();
    expect(gridfinityCompartmentPieces(bin({ ...fields, height: 7 + GRIDFINITY_LIP_HEIGHT }))).toBeNull();
    // The front scoop against the front wall in the front row and against the middle divider's back face in the back
    // row, each in the compartment's own frame, with the bin's radius, 6.7 for 3 units.
    expect(gridfinityScoopRadius(bin({ ...fields, gridfinityScoopFront: true }))).toBeCloseTo(6.7, 9);
    gridfinityCompartmentPieces(bin({ ...fields, gridfinityScoopFront: true }))!.cells.forEach((cell) => {
      const context = `${cell.column},${cell.row}`;
      expect(cell.inside.hx, context).toBeCloseTo(13.2, 9);
      expect(cell.inside.hz, context).toBeCloseTo(9.6, 9);
      expect(cell.inside.radius, context).toBeCloseTo(2.8, 9);
      expect(cell.centre.x, context).toBeCloseTo([-27.6, 0, 27.6][cell.column], 9);
      expect(cell.centre.z, context).toBeCloseTo([-10.2, 10.2][cell.row], 9);
      expect(cell.scoops!.radius, context).toBeCloseTo(6.7, 9);
      expect(cell.scoops!.floor, context).toBeCloseTo(5.95, 9);
      expect(cell.scoops!.centre[0], context).toBeCloseTo(6.68, 9);
      expect(cell.scoops!.centre[1], context).toBeCloseTo(12.63, 9);
      expect(cell.scoops!.inside, context).toEqual(cell.inside);
      expect(cell.scoops!.scoops, context).toHaveLength(1);
      expect(cell.scoops!.scoops[0].wall, context).toBe("front");
      expect(cell.scoops!.scoops[0].from, context).toBeCloseTo(-14.2, 9);
      expect(cell.scoops!.scoops[0].to, context).toBeCloseTo(14.2, 9);
    });
    // A left scoop runs along each compartment's left side, its depth.
    gridfinityCompartmentPieces(bin({ ...fields, gridfinityScoopLeft: true }))!.cells.forEach((cell) => {
      expect(cell.scoops!.scoops.map((s) => [s.wall, Number(s.from.toFixed(9)), Number(s.to.toFixed(9))])).toEqual([["left", -10.6, 10.6]]);
    });
  });

  it("makes a compartment's scoops smaller where they would leave less than 2 mm of floor, and leaves them out where even 3.5 mm would", () => {
    const cells = (fields: Record<string, unknown>) => gridfinityCompartmentPieces(bin({ gridfinityCompartmentsZ: 2, ...fields }))!.cells;
    const radius = (fields: Record<string, unknown>) => cells(fields).map((cell) => (cell.scoops ? Number(cell.scoops.radius.toFixed(9)) : null));
    const walls = (fields: Record<string, unknown>) => cells(fields).map((cell) => cell.scoops?.scoops.map((s) => s.wall) ?? null);
    // The divider 8.1 mm from the back wall leaves a back row 7.5 mm deep: a front scoop there takes 7.5 - 2 = 5.5 mm,
    // the front row (30.9 mm) keeps the bin's 6.7.
    expect(radius({ gridfinityScoopFront: true, gridfinityDividerPositionsZ: [8.1] })).toEqual([5.5, 6.7]);
    // Front and back scoops facing each other take half the row less 1 mm: 2.75 in the 7.5 mm row, under the smallest
    // radius, so both go; 9 mm keeps both at 3.5; 8.9 mm loses them.
    const facing = { gridfinityScoopFront: true, gridfinityScoopBack: true };
    expect(walls({ ...facing, gridfinityDividerPositionsZ: [8.1] })).toEqual([null, ["back", "front"]]);
    expect(radius({ ...facing, gridfinityDividerPositionsZ: [8.1] })).toEqual([null, 6.7]);
    expect(radius({ ...facing, gridfinityDividerPositionsZ: [9.6] })).toEqual([3.5, 6.7]);
    expect(walls({ ...facing, gridfinityDividerPositionsZ: [9.6] })).toEqual([["back", "front"], ["back", "front"]]);
    expect(walls({ ...facing, gridfinityDividerPositionsZ: [9.5] })).toEqual([null, ["back", "front"]]);
    // Each way on its own: in a column 7.5 mm wide the left and right scoops go and the front one stays, at the bin's radius.
    const column = gridfinityCompartmentPieces(bin({ gridfinityCompartmentsX: 2, gridfinityDividerPositionsX: [8.1], gridfinityScoopFront: true, gridfinityScoopLeft: true, gridfinityScoopRight: true }))!.cells;
    expect(column.map((cell) => cell.scoops!.scoops.map((s) => s.wall))).toEqual([["front"], ["front", "left", "right"]]);
    expect(column[0].scoops!.radius).toBeCloseTo(6.7, 9);
    // A radius a compartment makes smaller is kept off the 9.63 mm that runs through the corner of its roundings, as the bin's is.
    const corner = radius({ gridfinityScoopFront: true, gridfinityScoopRadius: 12, gridfinityDividerPositionsZ: [12.22] });
    expect(corner[0]).toBeCloseTo((2.8 + 0.02) / (1 - Math.SQRT1_2) - 0.03, 6);
    expect(corner[1]).toBe(12);
  });

  it("tells when a compartment is left without some of its scoops, not when a scoop is only made smaller", () => {
    const leftOut = (fields: Record<string, unknown>) => gridfinityScoopsLeftOut(bin({ gridfinityCompartmentsZ: 2, ...fields }));
    const facing = { gridfinityScoopFront: true, gridfinityScoopBack: true };
    expect(leftOut({ ...facing, gridfinityDividerPositionsZ: [8.1] })).toBe(true);
    expect(leftOut({ ...facing, gridfinityDividerPositionsZ: [9.6] })).toBe(false);
    expect(leftOut({ gridfinityScoopFront: true, gridfinityDividerPositionsZ: [8.1] })).toBe(false);
    expect(gridfinityScoopsLeftOut(bin({ gridfinityCompartmentsX: 2, gridfinityDividerPositionsX: [8.1], gridfinityScoopFront: true, gridfinityScoopLeft: true, gridfinityScoopRight: true }))).toBe(true);
    // Without dividers, or without scoops, nothing is left out.
    expect(gridfinityScoopsLeftOut(bin(facing))).toBe(false);
    expect(leftOut({ gridfinityDividerPositionsZ: [8.1] })).toBe(false);
  });

  it("bounds the volume the compartments' cut and the dividers must have, so the exact body can refuse one the kernel got wrong", () => {
    const fields = { gridfinityCompartmentsX: 3, gridfinityCompartmentsZ: 2 };
    // 81.6 x 39.6 inside less six compartments of 26.4 x 19.2, each with its four corners rounded by 2.8 mm and the bin's
    // the same: 3224.63 - 6 x 500.15 = 223.73 mm² of dividers, standing straight from the floor at 5.95 to where the
    // lip's support leaves the wall, 19.35, or to their top at 20.15 without the lip. With the lip, from 19.35 to 20.15
    // the dividers 0.8 mm clear of the walls: 80 x 38 less compartments of 25.6 / 26.4 / 25.6 by 18.4, 184.32 mm².
    const corners = (4 - Math.PI) * 2.8 ** 2;
    const dividers = 81.6 * 39.6 - corners - 6 * (26.4 * 19.2 - corners);
    expect(dividers).toBeCloseTo(223.73, 2);
    const pieces = gridfinityCompartmentPieces(bin(fields))!;
    // There, the 8 rounded corners where two dividers meet count too.
    expect(gridfinityDividerBound(gridfinityPlan(bin(fields)), pieces)).toBeCloseTo(dividers * 13.4 + (184.32 + 2 * corners) * 0.8, 6);
    const open = bin({ ...fields, gridfinityLip: false, height: 21 });
    expect(gridfinityDividerBound(gridfinityPlan(open), gridfinityCompartmentPieces(open)!)).toBeCloseTo(dividers * 14.2, 6);
    // Each compartment's floor rounding: 68.8 mm of fillet, r² (1 - pi / 4) in section, and four corners of pi r³ / 12.
    const fillet = 2.8 ** 2 * (1 - Math.PI / 4);
    const rounding = 68.8 * fillet + (Math.PI * 2.8 ** 3) / 3;
    expect(gridfinityCompartmentFloorBound(gridfinityPlan(open), gridfinityCompartmentPieces(open)!)).toBeCloseTo(6 * rounding, 6);
    expect(6 * rounding).toBeCloseTo(832.456, 3);
    // A front scoop of 6.7 mm, its circle 6.68 out and up: at least 6.68² - pi 6.7² / 4 over the fillet, along the 20.8 mm
    // between the compartment's corners.
    const scooped = bin({ ...fields, gridfinityScoopFront: true });
    expect(gridfinityCompartmentFloorBound(gridfinityPlan(scooped), gridfinityCompartmentPieces(scooped)!)).toBeCloseTo(6 * (rounding + (6.68 ** 2 - (Math.PI * 6.7 ** 2) / 4 - fillet) * 20.8), 6);
    // A floor raised to 17.15, 2.2 mm under the lip's support: along the walls (179.2 mm) only the fillet under 2.2 mm,
    // along the dividers (233.6 mm) all of it; the 8 corners where two dividers meet whole, the 16 at a wall up to 2.2 mm.
    const raised = bin({ ...fields, gridfinityFloorHeight: 17.15 });
    const low = 2.8 * 2.2 - ((Math.PI * 2.8 ** 2) / 4 - (0.6 * Math.sqrt(2.8 ** 2 - 0.36) + 2.8 ** 2 * Math.asin(0.6 / 2.8)) / 2);
    expect(low).toBeCloseTo(1.6695, 4);
    expect(gridfinityCompartmentFloorBound(gridfinityPlan(raised), gridfinityCompartmentPieces(raised)!)).toBeCloseTo(179.2 * low + 233.6 * fillet + (8 * Math.PI * 2.8 ** 3) / 12 + (16 * Math.PI * (2.8 ** 3 - 0.6 ** 3)) / 12, 6);
    // Each compartment's cutter reaches 0.3 mm over the top, at most its section of 26.4 x 19.2 less the four corners.
    const section = 26.4 * 19.2 - (4 - Math.PI) * 2.8 ** 2;
    expect(gridfinityCompartmentCutBound(pieces, { box: 1000, cutters: [100, 100, 100, 100, 100, 100] })).toBeCloseTo(1000 + 600 - 6 * section * 0.3, 9);
    expect(gridfinityCompartmentCutBound(pieces, { box: 1000, cutters: [100, 100, 100, 100, 100, 100] })).toBeCloseTo(699.72984, 4);
  });

  /**
   * The mesh of a bin with dividers is closed, wound outwards and one piece, and really has them: the plain bin's mesh
   * is what Manifold falls back on, so it must hold the dividers' bound more than the plain bin and differ from it.
   */
  const expectDivided = (fields: Record<string, unknown>) => {
    const shape = bin(fields);
    const mesh = gridfinityLabelledTriangles(runtime, shape) as V[][];
    const plain = gridfinityTriangles(shape) as V[][];
    const context = JSON.stringify(fields);
    expect(edgeProblems(mesh), context).toBe(0);
    expect(components(mesh), context).toBe(1);
    expect(mesh, context).not.toEqual(plain);
    expect(signedVolume(mesh), context).toBeGreaterThan(signedVolume(plain) + gridfinityDividerBound(gridfinityPlan(shape), gridfinityCompartmentPieces(shape)!));
    return { mesh, plain };
  };

  it("draws bins of 3 x 2 compartments with dividers and scoops, closed and in one piece", () => {
    for (const fields of [
      { gridfinityCompartmentsX: 3, gridfinityCompartmentsZ: 2, gridfinityScoopFront: true },
      { gridfinityCompartmentsX: 3, gridfinityCompartmentsZ: 2 },
      { gridfinityCompartmentsX: 3, gridfinityCompartmentsZ: 2, gridfinityLip: false, height: 21 },
      { gridfinityCompartmentsX: 3, gridfinityCompartmentsZ: 2, gridfinityDividerPositionsX: [10, 60.3], gridfinityDividerPositionsZ: [25.5] },
      { gridfinityCompartmentsX: 3, gridfinityCompartmentsZ: 2, gridfinityDividerThickness: 0.8 },
      { gridfinityCompartmentsX: 3, gridfinityCompartmentsZ: 2, gridfinityDividerThickness: 3 },
      { gridfinityCompartmentsX: 3, gridfinityCompartmentsZ: 2, gridfinityMagnets: true },
      { gridfinityCompartmentsX: 3, gridfinityCompartmentsZ: 2, gridfinityFloorHeight: 10, gridfinityScoopFront: true },
      { gridfinityCompartmentsX: 2, gridfinityCompartmentsZ: 2, gridfinityHalfGrid: true, width: 41.5, depth: 41.5 },
      { gridfinityCompartmentsX: 3, gridfinityCompartmentsZ: 2, height: 14 + GRIDFINITY_LIP_HEIGHT, gridfinityScoopFront: true },
      // Narrow rows: a scoop made smaller, and facing scoops left out.
      { gridfinityCompartmentsZ: 2, gridfinityDividerPositionsZ: [8.1], gridfinityScoopFront: true },
      { gridfinityCompartmentsZ: 2, gridfinityDividerPositionsZ: [8.1], gridfinityScoopFront: true, gridfinityScoopBack: true },
      // Wall shelves are not built in a bin with dividers: its labels are the compartments' own.
      { gridfinityCompartmentsX: 3, gridfinityCompartmentsZ: 2, gridfinityLabelBack: true },
    ]) expectDivided(fields);
  });

  it("draws a scoop on each wall, and on all four, in every compartment on its side", () => {
    for (const wall of ["back", "front", "left", "right"] as const) expectDivided({ gridfinityCompartmentsX: 3, gridfinityCompartmentsZ: 2, [GRIDFINITY_SCOOP_WALL_KEYS[wall]]: true });
    expectDivided({ gridfinityCompartmentsX: 3, gridfinityCompartmentsZ: 2, gridfinityScoopFront: true, gridfinityScoopBack: true, gridfinityScoopLeft: true, gridfinityScoopRight: true });
    // The front scoop in each of the six compartments adds about 183 mm³ over the floor's rounding, as in the exact body.
    const { mesh } = expectDivided({ gridfinityCompartmentsX: 3, gridfinityCompartmentsZ: 2, gridfinityScoopFront: true });
    const flat = expectDivided({ gridfinityCompartmentsX: 3, gridfinityCompartmentsZ: 2 }).mesh;
    expect(signedVolume(mesh) - signedVolume(flat)).toBeCloseTo(6 * 183, -2);
  });

  for (const deep of [[1, 2, 3], [4, 5, 6]]) {
    it(`draws 1 to 6 compartments across in a bin of 3 x 2 x 4 units, ${deep[0]} to ${deep[2]} deep, with a front scoop`, () => {
      for (const nz of deep) {
        for (let nx = 1; nx <= 6; nx += 1) {
          if (nx > 1 || nz > 1) expectDivided({ width: 125.5, depth: 83.5, height: 28 + GRIDFINITY_LIP_HEIGHT, gridfinityScoopFront: true, gridfinityCompartmentsX: nx, gridfinityCompartmentsZ: nz });
        }
      }
    }, 20_000);
  }

  it("draws 40 compartments in a bin of 6 x 6 x 3 units, 4 x 10 and 8 x 5", () => {
    expectDivided({ ...large, gridfinityScoopFront: true, gridfinityCompartmentsX: 4, gridfinityCompartmentsZ: 10 });
    expectDivided({ ...large, gridfinityCompartmentsX: 8, gridfinityCompartmentsZ: 5 });
  }, 20_000);

  it("adds the dividers and every compartment's rounded floor to the mesh of a bin without the lip, as calculated by hand", () => {
    // As in the exact body: 3176.96 mm³ of dividers and 832.46 of floor rounding, the mesh's polygons within 1 %.
    const { mesh, plain } = expectDivided({ gridfinityCompartmentsX: 3, gridfinityCompartmentsZ: 2, gridfinityLip: false, height: 21 });
    expect(Math.abs(signedVolume(mesh) - signedVolume(plain) - 4009.42) / 4009.42).toBeLessThan(0.01);
  });

  /** A bin of 2 x 1 x 3 units with 3 x 2 compartments of 26.4 x 19.2 and labels; the label pieces of one compartment. */
  const labelled = (labels: Record<string, unknown>[], fields: Record<string, unknown> = {}) => bin({ gridfinityCompartmentsX: 3, gridfinityCompartmentsZ: 2, gridfinityCompartmentLabels: labels, ...fields });
  const labelOf = (shape: ReturnType<typeof bin>, column: number, row: number) => gridfinityCompartmentPieces(shape)!.cells.find((cell) => cell.column === column && cell.row === row)!.labels;

  it("builds the wall shelves of a bin with dividers no more, and keeps them for a bin without", () => {
    const shelves = { gridfinityLabelBack: true, gridfinityLabelLeft: true };
    expect(gridfinityLabelPieces(bin({ ...shelves, gridfinityCompartmentsX: 3 }))).toBeNull();
    expect(gridfinityLabelPieces(bin({ ...shelves, gridfinityCompartmentsX: 1 }))).not.toBeNull();
  });

  it("caps a compartment's label corner and width so that 6 mm of it stays open, and offers no label where that leaves less than 4 mm", () => {
    const shape = labelled([{ column: 1, row: 0, side: "back" }], { gridfinityLabelCornerSize: 10 });
    const cell = gridfinityCompartments(shape)!.cells[1];
    // min(10, 9.6 - 1 - 4) = 4.6; the width min(17.2048, 19.2 - 6 - 2) = 11.2 with the corner at 2.
    expect(gridfinityCompartmentCornerSize(shape, cell)).toBeCloseTo(4.6, 9);
    expect(gridfinityCompartmentCornerSize(labelled([]), cell)).toBe(2);
    expect(gridfinityCompartmentLabelMaxWidth(labelled([]), cell, "back")).toBeCloseTo(11.2, 9);
    expect(gridfinityCompartmentLabelMaxWidth(labelled([]), cell, "left")).toBeCloseTo(17.2048, 4);
    expect(gridfinityCompartmentLabel(labelled([{ column: 1, row: 0, side: "back" }]), 1, 0)).toMatchObject({ side: "back", length: 100, align: "middle" });
    expect(gridfinityCompartmentLabel(labelled([{ column: 1, row: 0, side: "back" }]), 1, 0)!.width).toBeCloseTo(11.2, 9);
    expect(gridfinityCompartmentLabel(labelled([{ column: 1, row: 0, side: "back", width: 30 }]), 1, 0)!.width).toBeCloseTo(11.2, 9);
    expect(gridfinityCompartmentLabel(labelled([{ column: 1, row: 0, side: "back", width: 1 }]), 1, 0)!.width).toBe(4);
    const back = labelOf(labelled([{ column: 1, row: 0, side: "back" }]), 1, 0)!;
    expect(back.shelves).toHaveLength(1);
    expect(back.shelves[0].profile.width).toBeCloseTo(11.2, 9);
    // A row 6 mm deep: no corner and no room for a back label, but a left one along it.
    const shallow = { gridfinityDividerPositionsZ: [6.6] };
    expect(labelOf(labelled([{ column: 0, row: 0, side: "back" }], shallow), 0, 0)).toBeNull();
    expect(gridfinityCompartmentLabel(labelled([{ column: 0, row: 0, side: "back" }], shallow), 0, 0)).toBeNull();
    expect(labelOf(labelled([{ column: 0, row: 0, side: "left" }], shallow), 0, 0)).not.toBeNull();
  });

  it("takes a compartment label's first entry, ignores those outside the compartments, and builds none in a bin under 3 height units", () => {
    const two = [{ column: 2, row: 1, side: "right" }, { column: 2, row: 1, side: "front" }, { column: 5, row: 0, side: "back" }];
    expect(gridfinityCompartmentLabel(labelled(two), 2, 1)!.side).toBe("right");
    expect(gridfinityCompartmentPieces(labelled(two))!.cells.filter((cell) => cell.labels)).toHaveLength(1);
    expect(gridfinityCompartmentPieces(labelled(two, { height: 14 + GRIDFINITY_LIP_HEIGHT }))!.cells.every((cell) => !cell.labels)).toBe(true);
  });

  it("builds a compartment label from 10 % to the full length of its side, hides one under 4 mm, and runs one into the corners from the snap", () => {
    const span = (label: Record<string, unknown>) => {
      const pieces = labelOf(labelled([{ column: 1, row: 0, side: "back", ...label }]), 1, 0);
      return pieces ? pieces.shelves[0].profile : null;
    };
    // 30 % of 26.4 is 7.92 mm, centred; 150 % is the full length, run 1 mm into the dividers.
    expect(span({ length: 30 })!.to - span({ length: 30 })!.from).toBeCloseTo(7.92, 9);
    expect(span({ length: 150 })!.from).toBeCloseTo(-14.2, 9);
    expect(span({ length: 150 })!.to).toBeCloseTo(14.2, 9);
    // 10 % at the least, 2.64 mm, and 15 %, 3.96 mm, are under 4 mm and hidden; 16 % is 4.22.
    expect(span({ length: 5 })).toBeNull();
    expect(span({ length: 15 })).toBeNull();
    expect(span({ length: 16 })!.to - span({ length: 16 })!.from).toBeCloseTo(4.224, 9);
    // Start and end: one end runs into the divider, towards -x and towards +x on a back side.
    expect(span({ length: 50, align: "start" })!.from).toBeCloseTo(-14.2, 9);
    expect(span({ length: 50, align: "start" })!.to).toBeCloseTo(0, 9);
    expect(span({ length: 50, align: "end" })!.from).toBeCloseTo(0, 9);
    // On a left side start is towards -z, the back: the label's u runs towards the back there.
    const left = labelOf(labelled([{ column: 1, row: 0, side: "left", length: 50, align: "start" }]), 1, 0)!.shelves[0].profile;
    expect(left.to).toBeCloseTo(10.6, 9);
    expect(left.from).toBeCloseTo(0, 9);
  });

  it("snaps a label's end, or its end piece's outer edge, within 0.05 mm of the compartment's corner rounding onto it", () => {
    const ends = (length: number, align: string) => {
      const { from, to } = labelOf(labelled([{ column: 1, row: 0, side: "back", length, align }]), 1, 0)!.shelves[0].profile;
      return [Number(from.toFixed(9)), Number(to.toFixed(9))];
    };
    // The middle compartment's rounding starts 2.8 mm in from its sides, at x -10.4 and 10.4.
    expect(ends(78.9, "middle")).toEqual([-10.4, 10.4]);
    expect(ends(79.5, "middle")).toEqual([-10.494, 10.494]);
    // A 2 mm end piece beside a free end: its outer edge 2 mm further out, onto the rounding, puts the end at 8.4.
    expect(ends(81.85, "start")).toEqual([-14.2, 8.4]);
    expect(ends(89.39, "start")).toEqual([-14.2, 10.4]);
    expect(ends(89.5, "start")).toEqual([-14.2, 10.4]);
    expect(ends(89.8, "start")[1]).toBeCloseTo(10.5072, 9);
    expect(ends(81.85, "end")).toEqual([-8.4, 14.2]);
  });

  it("draws compartment labels on every side, round and chamfered, closed and in one piece, kept to their compartment", () => {
    for (const side of ["back", "front", "left", "right"]) {
      for (const corner of [{}, { gridfinityLabelCorner: "chamfer" }, { gridfinityLabelCornerSize: 0 }, { gridfinityLabelCornerSize: 10 }]) {
        const labels = [0, 1, 2].flatMap((column) => [0, 1].map((row) => ({ column, row, side, length: [100, 50, 30][column], align: ["middle", "start", "end"][(column + row) % 3], width: 8 })));
        const shape = labelled(labels, { gridfinityScoopFront: true, ...corner });
        const { mesh } = expectDivided({ gridfinityCompartmentsX: 3, gridfinityCompartmentsZ: 2, gridfinityCompartmentLabels: labels, gridfinityScoopFront: true, ...corner });
        const plainLabels = gridfinityLabelledTriangles(runtime, labelled([], { gridfinityScoopFront: true, ...corner })) as V[][];
        expect(signedVolume(mesh), `${side} ${JSON.stringify(corner)}`).toBeGreaterThan(signedVolume(plainLabels) + 6 * 25);
        // Every piece stays within its compartment and LABEL_PAST behind its side.
        gridfinityCompartmentPieces(shape)!.cells.forEach((cell) => {
          const pieces = cell.labels!;
          const along = side === "back" || side === "front" ? cell.inside.hx : cell.inside.hz;
          pieces.shelves.forEach(({ profile }) => {
            expect(profile.from, side).toBeGreaterThanOrEqual(-along - 1 - 1e-9);
            expect(profile.to, side).toBeLessThanOrEqual(along + 1 + 1e-9);
          });
          [...pieces.corners, ...pieces.shelves.flatMap((shelf) => shelf.notches)].forEach((c) => {
            expect(Math.abs(c.at.x), side).toBeLessThanOrEqual(cell.inside.hx + 1e-9);
            expect(Math.abs(c.at.z), side).toBeLessThanOrEqual(cell.inside.hz + 1e-9);
          });
        });
      }
    }
  });

  it("writes a count of 1 as unset and puts that axis's dividers back evenly spaced when the count changes", () => {
    // Written as undefined, not left out, so that applying the patch takes the stored places away.
    expect(gridfinityCompartmentCountPatch("x", 1)).toStrictEqual({ gridfinityCompartmentsX: undefined, gridfinityDividerPositionsX: undefined });
    expect(gridfinityCompartmentCountPatch("x", 3)).toStrictEqual({ gridfinityCompartmentsX: 3, gridfinityDividerPositionsX: undefined });
    expect(gridfinityCompartmentCountPatch("z", 2)).toStrictEqual({ gridfinityCompartmentsZ: 2, gridfinityDividerPositionsZ: undefined });
    // A divider moved, then 3 across made 4 and 3 again: the dividers are evenly spaced once more.
    let shape: Record<string, unknown> = { gridfinityCompartmentsX: 3 };
    shape = { ...shape, ...gridfinityDividerPositionPatch(bin(shape), "x", 0, 30) };
    expect(gridfinityDividerPositions(bin(shape), "x")[0]).toBeCloseTo(30, 9);
    shape = { ...shape, ...gridfinityCompartmentCountPatch("x", 4) };
    shape = { ...shape, ...gridfinityCompartmentCountPatch("x", 3) };
    gridfinityDividerPositions(bin(shape), "x").forEach((p, i) => expect(p).toBeCloseTo([27, 54.6][i], 9));
    // The other axis's dividers stay where they were moved.
    expect(gridfinityCompartmentCountPatch("x", 3)).not.toHaveProperty("gridfinityDividerPositionsZ");
    expect(gridfinityCompartmentCountPatch("z", 1)).not.toHaveProperty("gridfinityDividerPositionsX");
  });

  it("keeps moved dividers where they are when the bin is resized, and spaces those never moved evenly", () => {
    const fields = { gridfinityCompartmentsX: 3, gridfinityCompartmentsZ: 2 };
    const close = (positions: number[], expected: number[], context = "") => {
      expect(positions, context).toHaveLength(expected.length);
      positions.forEach((p, i) => expect(p, context).toBeCloseTo(expected[i], 9));
    };
    close(gridfinityDividerPositions(bin(fields), "x"), [27, 54.6]);
    // Never moved, 3 units across: (123.6 - 2.4) / 3 = 40.4 a compartment.
    close(gridfinityDividerPositions(bin({ ...fields, width: 125.5 }), "x"), [41, 82.6]);
    // Moving one divider writes its axis's whole list, the others where they are built.
    const moved = gridfinityDividerPositionPatch(bin(fields), "x", 0, 30);
    expect(Object.keys(moved)).toEqual(["gridfinityDividerPositionsX"]);
    close(moved.gridfinityDividerPositionsX!, [30, 54.6]);
    close(gridfinityDividerPositions(bin({ ...fields, ...moved, width: 125.5 }), "x"), [30, 54.6]);
    close(gridfinityDividerPositions(bin({ ...fields, ...moved, width: 125.5 }), "z"), [19.8]);
    // The deep axis was never moved: 2 units deep, (81.6 - 1.2) / 2 = 40.2 a compartment.
    close(gridfinityDividerPositions(bin({ ...fields, ...moved, depth: 83.5 }), "z"), [40.8]);
    // A moved divider is kept within the room its neighbours leave it, also in a bin made smaller.
    close(gridfinityDividerPositionPatch(bin(fields), "x", 1, 10).gridfinityDividerPositionsX!, [27, 34.2]);
    close(gridfinityDividerPositions(bin({ width: 41.5, gridfinityCompartmentsX: 2, gridfinityDividerPositionsX: [120] }), "x"), [33]);
    expect(gridfinityDividerPositionPatch(bin(fields), "x", 2, 30)).toEqual({});
  });

  it("takes the lists of dividers and labels as lists, and [] as unset", () => {
    expect(normalizeGridfinityDividerPositions([20, 40.5])).toEqual([20, 40.5]);
    expect(normalizeGridfinityDividerPositions("[20,40.5]")).toBeUndefined();
    expect(normalizeGridfinityDividerPositions([20, "x", Number.NaN, 30])).toEqual([20, 30]);
    expect(normalizeGridfinityDividerPositions([])).toEqual([]);
    expect(normalizeGridfinityDividerPositions(Array.from({ length: 30 }, (_, i) => i))).toHaveLength(23);
    expect(normalizeGridfinityDividerPositions("not a list")).toBeUndefined();
    expect(normalizeGridfinityDividerPositions(20)).toBeUndefined();
    const label = { column: 1, row: 0, side: "back", length: 50, align: "start", width: 8 };
    expect(normalizeGridfinityCompartmentLabels([label])).toEqual([label]);
    expect(normalizeGridfinityCompartmentLabels(JSON.stringify([label]))).toBeUndefined();
    // A label on an unknown side or without its compartment is left out; a value of the wrong kind is left unset.
    expect(normalizeGridfinityCompartmentLabels([{ column: 0, row: 0, side: "top" }, { row: 0, side: "back" }, "back", { column: 1.2, row: 2, side: "left", align: "up", width: "8" }])).toEqual([{ column: 1, row: 2, side: "left" }]);
    // One for each compartment any count could give, 24 x 24, so labels outside the current counts survive a change of count.
    expect(normalizeGridfinityCompartmentLabels(Array.from({ length: 600 }, (_, i) => ({ column: i % 24, row: Math.floor(i / 24), side: "front" })))).toHaveLength(576);
    expect(normalizeGridfinityCompartmentLabels({ column: 0 })).toBeUndefined();
    // What the MCP writes: only the lists it was given, an empty one as unset.
    expect(gridfinityListPatch({ gridfinityDividerPositionsX: [30, 54.6], gridfinityCompartmentLabels: [] })).toStrictEqual({ gridfinityDividerPositionsX: [30, 54.6], gridfinityCompartmentLabels: undefined });
    expect(gridfinityListPatch({ gridfinityDividerPositionsZ: [] })).toStrictEqual({ gridfinityDividerPositionsZ: undefined });
    expect(gridfinityListPatch({ gridfinityDividerPositionsZ: "nonsense", width: 40 })).toEqual({});
    // A count puts that axis's dividers back evenly spaced, as the settings window does, unless the same action places them.
    expect(gridfinityListPatch({ gridfinityCompartmentsX: 3 })).toStrictEqual({ gridfinityCompartmentsX: 3, gridfinityDividerPositionsX: undefined });
    expect(gridfinityListPatch({ gridfinityCompartmentsZ: 1 })).toStrictEqual({ gridfinityCompartmentsZ: undefined, gridfinityDividerPositionsZ: undefined });
    expect(gridfinityListPatch({ gridfinityCompartmentsX: 2.6, gridfinityDividerPositionsX: [30, 50] })).toEqual({ gridfinityCompartmentsX: 3, gridfinityDividerPositionsX: [30, 50] });
    expect(gridfinityListPatch({ gridfinityCompartmentsX: "3" })).toEqual({});
    // Through the MCP the lists also come as the JSON text layerling_read_scene reports them in; text that is no list is unset.
    const params = mcpGridfinityListParams({ gridfinityDividerPositionsX: "[30,54.6]", gridfinityDividerPositionsZ: "not a list", gridfinityCompartmentLabels: [label], gridfinityCompartmentsX: 3, width: 40 });
    expect(params).toStrictEqual({ gridfinityDividerPositionsX: [30, 54.6], gridfinityDividerPositionsZ: undefined, gridfinityCompartmentLabels: [label], gridfinityCompartmentsX: 3, width: 40 });
    expect(mcpGridfinityListParams({ gridfinityCompartmentLabels: JSON.stringify([label]), gridfinityDividerPositionsZ: "{}" })).toStrictEqual({ gridfinityCompartmentLabels: [label], gridfinityDividerPositionsZ: undefined });
    expect(gridfinityListPatch(params)).toStrictEqual({ gridfinityCompartmentsX: 3, gridfinityDividerPositionsX: [30, 54.6], gridfinityCompartmentLabels: [label] });
    expect(mcpGridfinityListParams({ width: 40 })).toStrictEqual({ width: 40 });
  });

  it("tells every divider setting apart and keeps them through a saved project, and keeps only the counts and the thickness as settings", async () => {
    const counts = { gridfinityCompartmentsX: 3, gridfinityCompartmentsZ: 2, gridfinityDividerThickness: 1.6 };
    const lists = {
      gridfinityDividerPositionsX: [25, 55],
      gridfinityDividerPositionsZ: [18],
      gridfinityCompartmentLabels: [{ column: 0, row: 0, side: "back" as const, length: 50, align: "start" as const, width: 8 }, { column: 2, row: 1, side: "right" as const }],
    };
    const settings = { ...counts, ...lists };
    const shape = canonicalizeShape(binShape(settings));
    const [label, other] = lists.gridfinityCompartmentLabels;
    for (const change of [
      { gridfinityCompartmentsX: 4 },
      { gridfinityCompartmentsZ: 1 },
      { gridfinityDividerThickness: 2 },
      { gridfinityDividerPositionsX: [25, 56] },
      { gridfinityDividerPositionsX: [25] },
      { gridfinityDividerPositionsZ: undefined },
      { gridfinityCompartmentLabels: [label] },
      { gridfinityCompartmentLabels: [{ ...label, column: 1 }, other] },
      { gridfinityCompartmentLabels: [{ ...label, row: 1 }, other] },
      { gridfinityCompartmentLabels: [{ ...label, side: "front" as const }, other] },
      { gridfinityCompartmentLabels: [{ ...label, length: 60 }, other] },
      { gridfinityCompartmentLabels: [{ ...label, align: "end" as const }, other] },
      { gridfinityCompartmentLabels: [{ ...label, width: 9 }, other] },
    ]) {
      expect(workplaneShapesEqual(shape, { ...shape, ...change }), JSON.stringify(change)).toBe(false);
    }
    expect(workplaneShapesEqual(shape, { ...shape, gridfinityDividerPositionsX: [25, 55], gridfinityCompartmentLabels: [{ ...label }, { ...other }] })).toBe(true);
    const save = (shapes: WorkplaneShape[]) => exportLylProject({
      projectId: "dividers",
      projectName: "Dividers",
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
    const [loaded] = (await importLylProject(await save([shape]))).shapes;
    expect(workplaneShapesEqual(loaded, shape)).toBe(true);
    expect(loaded).toMatchObject(settings);
    // A count that is not whole loads as it was saved and is built rounded.
    const [halfCount] = (await importLylProject(await save([canonicalizeShape(binShape({ gridfinityCompartmentsX: 1.5 }))]))).shapes;
    expect(halfCount.gridfinityCompartmentsX).toBe(1.5);
    expect(gridfinityCompartmentCount(halfCount, "x")).toBe(2);
    for (const wrong of [{ gridfinityCompartmentLabels: [{ column: 0, row: 0, side: "top" }] }, { gridfinityDividerPositionsX: ["x"] }, { gridfinityDividerPositionsX: 20 }, { gridfinityDividerPositionsX: [-1] }, { gridfinityDividerPositionsX: [2e6] }, { gridfinityDividerPositionsX: Array(65).fill(10) }, { gridfinityCompartmentLabels: [{ column: -1, row: 0, side: "back" }] }]) {
      await expect(importLylProject(await save([{ ...shape, ...wrong } as WorkplaneShape])), JSON.stringify(wrong)).rejects.toThrow();
    }
    expect(sceneShape(shape)).toMatchObject(settings);
    expect(cadModifierGridfinityForShape(shape)).toMatchObject(settings);
    // The settings a new shape or an MCP action takes and a bin kept as the default have the counts and the thickness;
    // the dividers' places and the labels belong to one bin's size.
    const kept = normalizeShapeCustomizations({ gridfinity: settings }, {}).gridfinity!;
    expect(kept).toMatchObject(counts);
    Object.keys(lists).forEach((key) => expect(kept, key).not.toHaveProperty(key));
    const defaults = shapeDefaultsFromShape(shape)!;
    expect(defaults).toMatchObject(counts);
    Object.keys(lists).forEach((key) => expect(defaults, key).not.toHaveProperty(key));
    const asset = toolbarShapeAssets.find((entry) => entry.kind === "gridfinity")!;
    expect(makeShapeFromAsset(asset, { x: 0, z: 0 }, counts)).toMatchObject(counts);
  });

  it("keeps what the MCP gives within what a saved project takes, so it opens again and builds as it did", async () => {
    const save = (shapes: WorkplaneShape[]) => exportLylProject({ projectId: "p", projectName: "P", createdAt: 1, modifiedAt: 2, shapes, history: [editorHistoryEntry(shapes, [])], historyIndex: 0, assets: [], workspace: DEFAULT_WORKPLANE_WORKSPACE, snapGrid: DEFAULT_SNAP_GRID, placementElevation: 0 });
    for (const params of [
      { gridfinityCompartmentsX: 3, gridfinityDividerPositionsX: [-5, 50] },
      { gridfinityCompartmentsX: 3, gridfinityDividerPositionsX: [20, 2e6] },
      { gridfinityCompartmentsX: 3, gridfinityCompartmentLabels: [{ column: 0, row: 0, side: "back", width: -2 }] },
      { gridfinityCompartmentsX: 3, gridfinityCompartmentLabels: [{ column: 0, row: 0, side: "back", length: -10 }] },
      { gridfinityCompartmentsX: 3, gridfinityCompartmentLabels: [{ column: 2e6, row: 0, side: "back" }, { column: 1, row: 0, side: "back", length: 1e7, width: 2e6 }] },
      { gridfinityCompartmentsX: 5e6, gridfinityCompartmentsZ: -4 },
    ] as Array<Record<string, unknown>>) {
      const context = JSON.stringify(params);
      const raw = canonicalizeShape(binShape(params));
      const shape = canonicalizeShape(binShape({ ...normalizeShapeCustomizations({ gridfinity: params }, {}).gridfinity, ...gridfinityListPatch(mcpGridfinityListParams(params)) }));
      const [loaded] = (await importLylProject(await save([shape]))).shapes;
      expect(workplaneShapesEqual(loaded, shape), context).toBe(true);
      // Kept within range only where the bin would clamp it anyway.
      for (const axis of ["x", "z"] as const) expect(gridfinityDividerPositions(loaded, axis), context).toEqual(gridfinityDividerPositions(raw, axis));
      expect(JSON.stringify(gridfinityCompartmentPieces(loaded)?.cells.map((cell) => cell.labels)), context).toBe(JSON.stringify(gridfinityCompartmentPieces(raw)?.cells.map((cell) => cell.labels)));
    }
  });

  it("reports the counts and the thickness to the MCP as numbers and the lists as JSON text", () => {
    const shape = canonicalizeShape(binShape({ gridfinityCompartmentsX: 3, gridfinityDividerThickness: 1.6, gridfinityDividerPositionsX: [25, 55], gridfinityCompartmentLabels: [{ column: 0, row: 0, side: "back" }] }));
    const { settings } = mcpShapeSummary(shape);
    expect(settings).toMatchObject({ gridfinityCompartmentsX: 3, gridfinityDividerThickness: 1.6, gridfinityDividerPositionsX: "[25,55]", gridfinityCompartmentLabels: '[{"column":0,"row":0,"side":"back"}]' });
    expect(normalizeGridfinityDividerPositions(JSON.parse(String(settings!.gridfinityDividerPositionsX)))).toEqual([25, 55]);
  });
});

describe("gridfinity open sides", { timeout: 60_000 }, () => {
  let runtime: ManifoldToplevel;

  beforeAll(async () => {
    runtime = await manifoldModule();
    runtime.setup();
  });

  /** Every one of the 15 ways to open one side or more, each as the switches it sets. */
  const openings = Array.from({ length: 15 }, (_, k) => Object.fromEntries(Object.values(GRIDFINITY_OPEN_WALL_KEYS).filter((_, i) => (k + 1) & (1 << i)).map((key) => [key, true])));
  const all = { gridfinityOpenBack: true, gridfinityOpenFront: true, gridfinityOpenLeft: true, gridfinityOpenRight: true };

  /** The mesh is closed, wound outwards, one piece and inside the bin's outline; the outline itself is reached, and the top unless every side is open. */
  const expectOpen = (fields: Record<string, unknown>) => {
    const shape = bin(fields);
    const mesh = gridfinityLabelledTriangles(runtime, shape) as V[][];
    const context = JSON.stringify(fields);
    expect(edgeProblems(mesh), context).toBe(0);
    expect(components(mesh), context).toBe(1);
    expect(signedVolume(mesh), context).toBeGreaterThan(0);
    const { size } = gridfinityPlan(shape);
    const { min, max } = bounds(mesh);
    [min[0] + size.width / 2, max[0] - size.width / 2, min[2] + size.depth / 2, max[2] - size.depth / 2, min[1]].forEach((d) => expect(Math.abs(d), context).toBeLessThan(1e-6));
    expect(max[1], context).toBeLessThan(size.height + 1e-5);
    if (!Object.values(gridfinityPlan(shape).open).every(Boolean)) expect(max[1], context).toBeGreaterThan(size.height - 2e-3);
    return mesh;
  };

  it("tells every open side apart and keeps them all through a saved project", async () => {
    const settings: Record<string, unknown> = {};
    Object.values(GRIDFINITY_OPEN_WALL_KEYS).forEach((key) => Object.assign(settings, { [key]: true }));
    const open = canonicalizeShape(binShape(settings));
    Object.keys(settings).forEach((key) => {
      expect(workplaneShapesEqual(open, { ...open, [key]: false })).toBe(false);
    });
    const save = (shapes: WorkplaneShape[]) => exportLylProject({
      projectId: "open",
      projectName: "Open",
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
    const [loaded] = (await importLylProject(await save([open]))).shapes;
    expect(workplaneShapesEqual(loaded, open)).toBe(true);
    expect(loaded).toMatchObject(settings);
    expect(sceneShape(open)).toMatchObject(settings);
    expect(cadModifierGridfinityForShape(open)).toMatchObject(settings);
    expect(normalizeShapeCustomizations({ gridfinity: settings }, {})).toMatchObject({ gridfinity: settings });
    expect(shapeDefaultsFromShape(open)).toMatchObject(settings);
    const asset = toolbarShapeAssets.find((entry) => entry.kind === "gridfinity")!;
    expect(makeShapeFromAsset(asset, { x: 0, z: 0 }, settings)).toMatchObject(settings);
    for (const key of Object.keys(settings)) {
      await expect(importLylProject(await save([{ ...open, [key]: "yes" } as WorkplaneShape])), key).rejects.toThrow(`${key} must be true or false`);
      // The mesh that booleans and exports use leaves that side open, as calculated by hand in "takes the wall and the lip off".
      const { vertices, faces } = meshForShape(canonicalizeShape(binShape({ [key]: true })));
      const volume = signedVolume(faces.map((face) => face.map((i) => vertices[i]) as V[]));
      expect(volume, key).toBeCloseTo(key === "gridfinityOpenBack" || key === "gridfinityOpenFront" ? 21497.68 : 22440.95, 1);
    }
  });

  it("opens a bin's sides at any floor with the lip, and without it until the floor reaches the top, and never a baseplate's", () => {
    const none = { back: false, front: false, left: false, right: false };
    expect(gridfinityPlan(bin({ gridfinityOpenFront: true, gridfinityOpenLeft: true })).open).toEqual({ ...none, front: true, left: true });
    // false and unset are the same.
    expect(gridfinityPlan(bin({ gridfinityOpenFront: false })).open).toEqual(none);
    // With the lip the floor stops at the support's foot, 19.35, and the lip is left on the other sides.
    for (const floor of [undefined, 12.5, 19.35]) expect(gridfinityOpenFits(bin({ gridfinityFloorHeight: floor })), `${floor}`).toBe(true);
    // Without the lip a floor of 20.9 leaves 0.1 mm of wall; 20.95 is raised onto the top, a solid block.
    expect(gridfinityOpenFits(bin({ gridfinityLip: false, height: 21, gridfinityFloorHeight: 20.9 }))).toBe(true);
    expect(gridfinityOpenFits(bin({ gridfinityLip: false, height: 21, gridfinityFloorHeight: 20.95 }))).toBe(false);
    expect(gridfinityPlan(bin({ gridfinityLip: false, height: 21, gridfinityFloorHeight: 20.95, ...all })).open).toEqual(none);
    expect(gridfinityOpenFits(plate())).toBe(false);
    expect(gridfinityPlan(plate(all)).open).toEqual(none);
  });

  it("builds no scoop or shelf on an open side, and keeps their settings for when it is closed again", () => {
    const scooped = { gridfinityScoopFront: true };
    expect(gridfinityScoopPieces(bin({ ...scooped, gridfinityOpenFront: true }))).toBeNull();
    // Nor the floor's rounding, which only a built scoop brings.
    expect(gridfinityPlan(bin({ ...scooped, gridfinityOpenFront: true })).floorRounding).toBe(0);
    expect(gridfinityScoopPieces(bin({ ...scooped, gridfinityOpenFront: false }))).toStrictEqual(gridfinityScoopPieces(bin(scooped)));
    const shelves = { gridfinityLabelFront: true, gridfinityLabelLeft: true };
    const open = piecesOf({ ...shelves, gridfinityOpenFront: true });
    // The left shelf runs out past the front, 1 mm past the inside as into a wall, with no corner piece at that end.
    expect(open.shelves.map(({ profile }) => [profile.wall, profile.width, profile.from, profile.to])).toEqual([["left", 14, -20.8, 20.8]]);
    expect(cornersAt(open)).toEqual([[-26.8, -19.8]]);
    expect(piecesOf({ ...shelves, gridfinityOpenFront: false })).toStrictEqual(piecesOf(shelves));
  });

  it("leaves a shelf or a scoop the room it has with no shelf or scoop facing it, when that side is open", () => {
    expect(gridfinityLabelMaxWidth(bin({ gridfinityLabelBack: true, gridfinityLabelFront: true, gridfinityOpenFront: true }), "back")).toBe(gridfinityLabelMaxWidth(bin({ gridfinityLabelBack: true }), "back"));
    expect(gridfinityLabelMaxWidth(bin({ gridfinityLabelBack: true }), "back")).toBeGreaterThan(gridfinityLabelMaxWidth(bin({ gridfinityLabelBack: true, gridfinityLabelFront: true }), "back"));
    // 6 height units, so the 2 mm of floor between two facing scoops is what limits them: 18.8 mm, alone 33.9.
    const tall = { height: 42 + GRIDFINITY_LIP_HEIGHT, gridfinityScoopBack: true };
    expect(gridfinityScoopMaxRadius(bin({ ...tall, gridfinityScoopFront: true }))).toBeCloseTo(18.8, 9);
    expect(gridfinityScoopMaxRadius(bin({ ...tall, gridfinityScoopFront: true, gridfinityOpenFront: true }))).toBeCloseTo(33.9, 9);
  });

  it("runs the scoops beside an open side out past the bin's outline, to be cut off there", () => {
    // The left wall's scoop from 1 mm past the outline at the front, 19.8 + 0.95 + 1, to 1 mm into the back wall.
    const ends = ({ scoops }: { scoops: Array<{ wall: string; from: number; to: number }> }) => scoops.map(({ wall, from, to }) => [wall, Number(from.toFixed(9)), Number(to.toFixed(9))]);
    expect(ends(gridfinityScoopPieces(bin({ gridfinityScoopLeft: true, gridfinityOpenFront: true }))!)).toEqual([["left", -21.75, 20.8]]);
    // So does a compartment's against the open side: 9.6 + 0.95 + 1.
    const cells = gridfinityCompartmentPieces(bin({ gridfinityCompartmentsX: 3, gridfinityCompartmentsZ: 2, gridfinityScoopLeft: true, gridfinityOpenFront: true }))!.cells;
    const front = cells.find((cell) => cell.column === 0 && cell.row === 1)!;
    expect(front.open).toEqual({ back: false, front: true, left: false, right: false });
    expect(ends(front.scoops!)).toEqual([["left", -11.55, 10.6]]);
    expect(ends(cells.find((cell) => cell.column === 0 && cell.row === 0)!.scoops!)).toEqual([["left", -10.6, 10.6]]);
  });

  it("offers a compartment no label on an open side, and keeps one facing a divider", () => {
    const shape = bin({ gridfinityCompartmentsX: 3, gridfinityCompartmentsZ: 2, gridfinityOpenFront: true, gridfinityCompartmentLabels: [{ column: 1, row: 1, side: "front" }, { column: 1, row: 0, side: "front" }] });
    expect(gridfinityCompartmentLabel(shape, 1, 1)).toBeNull();
    expect(gridfinityCompartmentLabel(shape, 1, 0)).not.toBeNull();
    const cells = gridfinityCompartments(shape)!.cells;
    expect(gridfinityCompartmentLabelMaxWidth(shape, cells.find((cell) => cell.column === 1 && cell.row === 1)!, "front")).toBe(0);
    expect(gridfinityCompartmentLabelMaxWidth(shape, cells.find((cell) => cell.column === 1 && cell.row === 0)!, "front")).toBeGreaterThan(4);
  });

  it("draws every open bin closed, in one piece and within its outline, with the lip and without, and one unit high", () => {
    for (const lip of [{}, { gridfinityLip: false, height: 21 }]) {
      const low = { height: "gridfinityLip" in lip ? 7 : 7 + GRIDFINITY_LIP_HEIGHT };
      for (const opening of openings) {
        for (const extra of [{}, { gridfinityMagnets: true }, { gridfinityHalfGrid: true, width: 20.5, depth: 41.5 }, { gridfinityFloorHeight: 12.5 }, low]) expectOpen({ ...lip, ...opening, ...extra });
      }
    }
  });

  it("draws an open bin closed where the pieces beside an open side are cut off at the outline", () => {
    // Cut off exactly at the outline, a piece's end lay in the plane of the bin's open end, with a sliver between them.
    for (const [x, scoops] of [[3, { gridfinityScoopRight: true }], [3, { gridfinityScoopFront: true, gridfinityScoopLeft: true, gridfinityScoopRight: true }], [2, { gridfinityScoopRight: true }]] as const) {
      expectOpen({ width: 83.5, depth: 41.5, height: 21 + GRIDFINITY_LIP_HEIGHT, gridfinityCompartmentsX: x, ...scoops, gridfinityOpenFront: true, gridfinityOpenLeft: true });
    }
  });

  it("draws every open bin with scoops on every wall and with label shelves on every wall", () => {
    // The shelves in a bin of 4 height units.
    for (const [lip, tall] of [[{}, 28 + GRIDFINITY_LIP_HEIGHT], [{ gridfinityLip: false, height: 21 }, 28]] as const) {
      for (const opening of openings) {
        expectOpen({ ...lip, ...opening, gridfinityScoopBack: true, gridfinityScoopFront: true, gridfinityScoopLeft: true, gridfinityScoopRight: true });
        expectOpen({ ...lip, ...opening, height: tall, gridfinityLabelBack: true, gridfinityLabelFront: true, gridfinityLabelLeft: true, gridfinityLabelRight: true });
      }
    }
  });

  it("draws every open bin of 3 x 2 compartments with a front scoop and labels, holding its dividers", () => {
    const labels = [{ column: 0, row: 0, side: "left" }, { column: 1, row: 1, side: "back" }, { column: 2, row: 1, side: "right" }, { column: 1, row: 0, side: "back" }];
    for (const lip of [{}, { gridfinityLip: false, height: 21 }]) {
      for (const opening of openings) {
        const fields = { ...lip, ...opening, gridfinityCompartmentsX: 3, gridfinityCompartmentsZ: 2, gridfinityScoopFront: true, gridfinityCompartmentLabels: labels };
        const mesh = expectOpen(fields);
        const shape = bin(fields);
        expect(signedVolume(mesh), JSON.stringify(fields)).toBeGreaterThan(signedVolume(gridfinityTriangles(shape) as V[][]) + gridfinityDividerBound(gridfinityPlan(shape), gridfinityCompartmentPieces(shape)!));
      }
    }
  });

  it("draws the shelves, scoops and dividers beside an open side out to its outline", () => {
    // Across the bin 0.15 mm in from the open front's outline, z = 20.6, past where its wall would stand at 19.8.
    const near = (xs: number[], expected: number[]) => {
      expect(xs.length).toBe(expected.length);
      xs.forEach((x, i) => expect(Math.abs(x - expected[i]), `${xs}`).toBeLessThan(2e-3));
    };
    // The left shelf's strip under its top at 20.15, out to its front 14 mm from the wall; the right wall there is the lip's
    // support, 0.15 mm up its 45 degrees from 19.35.
    near(crossings(gridfinityLabelledTriangles(runtime, bin({ gridfinityLabelLeft: true, gridfinityOpenFront: true })) as V[][], 19.5, 20.6), [-41.75, -26.8, 40.65, 41.75]);
    // The left scoop's quarter circle (r 6.7, centre 6.68 out and 12.63 up) at 7 mm: 3.048 mm out from the wall. (The right
    // wall there stands on the floor's rounding, which the scoop brings.)
    near(crossings(gridfinityLabelledTriangles(runtime, bin({ gridfinityScoopLeft: true, gridfinityOpenFront: true })) as V[][], 7, 20.6).slice(0, 2), [-41.75, -40.8 + 6.68 - Math.sqrt(6.7 ** 2 - 5.63 ** 2)]);
    // The dividers of 1.2 mm at x = -13.8 and 13.8.
    near(crossings(gridfinityLabelledTriangles(runtime, bin({ gridfinityCompartmentsX: 3, gridfinityOpenFront: true })) as V[][], 12, 20.6), [-41.75, -40.8, -14.4, -13.2, 13.2, 14.4, 40.8, 41.75]);
    // A compartment's label against the right wall runs out the same, its strip 14 mm from the wall; the left wall is the lip's support.
    const labelled = bin({ gridfinityCompartmentsX: 3, gridfinityOpenFront: true, gridfinityCompartmentLabels: [{ column: 2, row: 0, side: "right" }] });
    near(crossings(gridfinityLabelledTriangles(runtime, labelled) as V[][], 19.5, 20.6), [-41.75, -40.65, -14.4, -13.2, 13.2, 14.4, 26.8, 41.75]);
    // Low down, where a label's underside meets the wall beside an open side, it reaches the wall as it does mid-bin.
    const low = bin({ gridfinityCompartmentsX: 3, gridfinityOpenBack: true, gridfinityCompartmentLabels: [{ column: 0, row: 0, side: "left" }] });
    near(crossings(gridfinityLabelledTriangles(runtime, low) as V[][], 9.05, -20.6), [-41.75, -40.423, -14.4, -13.2, 13.2, 14.4, 40.8, 41.75]);
  });

  it("takes the wall and the lip off an open side, as calculated by hand", () => {
    // A bin of 2 x 1 x 3 with the lip, 83.5 x 41.5, corners 3.75 (k = 1 - 4 sin(pi / 16) for the mesh's 8 segments), floor
    // 5.95, top 21, wall top 25.4. The wall's inset i above the floor, 0.95 up to 19.35, the support out to 2.6 at 21, the lip
    // 1.9 from 21.7 to 23.5 and out to 0 at 25.4, holds A = 22.45875 mm² for each mm of straight wall, and its square 30.02304.
    // Open at the front: the front wall between the side walls' inner faces, 83.5 A - 2 x 30.02304 = 1815.2595 mm³, and the
    // two inner corners' rounding, 2 k (3.75 - i)² up the wall = 59.3455, go; the two outer corners, square from the feet up,
    // gain 2 k 3.75² x 20.65 = 127.5620. 23244.7224 - 1747.0430 = 21497.6794. Open on the left the same with 41.5 for 83.5.
    // All four open: the feet, 13728.2601, and the floor on them, 83.5 x 41.5 x 1.2.
    for (const [fields, volume] of [
      [{}, 23244.7224],
      [{ gridfinityOpenFront: true }, 21497.6794],
      [{ gridfinityOpenLeft: true }, 22440.9469],
      [{ gridfinityOpenFront: true, gridfinityOpenBack: true }, 19750.6363],
      [{ gridfinityOpenFront: true, gridfinityOpenLeft: true }, 20629.7725],
      [all, 13728.2601 + 83.5 * 41.5 * 1.2],
    ] as const) {
      expect(signedVolume(gridfinityTriangles(bin(fields)) as V[][]), JSON.stringify(fields)).toBeCloseTo(volume, 3);
    }
  });

  it("bounds the cut, the dividers and the floors of a bin with a side open without the material it no longer has", () => {
    const c = (4 - Math.PI) * 2.8 ** 2;
    // A front-open 3 x 2: the front row's cutters run 5.75 mm out through the open side, so their section over the top is
    // 26.4 x (19.2 + 5.75), all four corners still rounded at its far end.
    const divided = gridfinityCompartmentPieces(bin({ gridfinityCompartmentsX: 3, gridfinityCompartmentsZ: 2, gridfinityOpenFront: true }))!;
    expect(gridfinityCompartmentCutBound(divided, { box: 1000, cutters: [100, 100, 100, 100, 100, 100] })).toBeCloseTo(1600 - 0.3 * (3 * (26.4 * 19.2 - c) + 3 * (26.4 * 24.95 - c)), 9);
    // One row of three across, open at the front, without the lip: the inside of 81.6 x 39.6 with its two back corners
    // rounded, less three compartments of 26.4 x 39.6 with their two back corners rounded and square at the front, 14.2 high.
    const row = bin({ gridfinityCompartmentsX: 3, gridfinityOpenFront: true, gridfinityLip: false, height: 21 });
    expect(gridfinityDividerBound(gridfinityPlan(row), gridfinityCompartmentPieces(row)!)).toBeCloseTo((81.6 * 39.6 - c / 2 - 3 * (26.4 * 39.6 - c / 2)) * 14.2, 6);
    // Each compartment's floor rounding: no fillet along the open side and none in its two corners there; 20.8 mm of
    // fillet at the back, 34 along each side, and the two back corners of pi r³ / 12.
    const fillet = 2.8 ** 2 * (1 - Math.PI / 4);
    expect(gridfinityCompartmentFloorBound(gridfinityPlan(row), gridfinityCompartmentPieces(row)!)).toBeCloseTo(3 * (88.8 * fillet + (Math.PI * 2.8 ** 3) / 6), 6);
  });
});

describe("gridfinity baseplate padding", { timeout: 60_000 }, () => {
  /** Each side's padding, as the field it sets. */
  const pad = (back: number, front: number, left: number, right: number) => ({ gridfinityPaddingBack: back, gridfinityPaddingFront: front, gridfinityPaddingLeft: left, gridfinityPaddingRight: right });
  /** A baseplate of x by z units with these paddings, its box the grid and the padding together. */
  const padded = (x: number, z: number, back: number, front: number, left: number, right: number) => plate({ width: x * 42 + left + right, depth: z * 42 + back + front, ...pad(back, front, left, right) });

  it("is the baseplate it was with no padding on any side", () => {
    expect(gridfinityTriangles(plate(pad(0, 0, 0, 0)))).toStrictEqual(gridfinityTriangles(plate()));
    expect(gridfinityPlan(plate(pad(0, 0, 0, 0)))).toStrictEqual(gridfinityPlan(plate()));
  });

  it("reads the units from the size less the padding, and keeps the padding through a drag", () => {
    expect(gridfinityUnits(padded(2, 1, 0, 16.2, 0, 14.2))).toEqual({ x: 2, z: 1, y: 1 });
    expect(gridfinityUnits(padded(6, 6, 41, 0, 0, 41))).toEqual({ x: 6, z: 6, y: 1 });
    // A drag to 130 mm across reads (130 - 14.2) / 42 = 2.76, three units, and the box takes the padding back on.
    expect(gridfinityFootprintPatch(plate({ width: 130, depth: 58.2, ...pad(0, 16.2, 0, 14.2) }))).toEqual({ width: 140.2, depth: 58.2, height: 5 });
  });

  it("keeps a padded size to hundredths, as the padding is stored", () => {
    expect(gridfinityFootprintPatch(plate({ width: 297.95, depth: 42, gridfinityPaddingLeft: 22.98, gridfinityPaddingRight: 22.97 }))).toEqual({ width: 297.95, depth: 42, height: 5 });
  });

  it("keeps the units when only the padding changes, also by a side's whole 41 mm", () => {
    const six = plate({ width: 252, depth: 42 });
    expect(gridfinityPaddingPatch(six, { right: 41 })).toEqual({ gridfinityPaddingRight: 41, width: 293, depth: 42 });
    expect(gridfinityPaddingPatch(six, { front: 41, back: 3.5 })).toEqual({ gridfinityPaddingFront: 41, gridfinityPaddingBack: 3.5, width: 252, depth: 86.5 });
    expect(gridfinityPaddingPatch(padded(6, 1, 0, 0, 0, 41), { right: 0 })).toEqual({ gridfinityPaddingRight: 0, width: 252, depth: 42 });
    // Less than nothing is none, more than 41 mm is 41: 42 mm would be room for another unit of grid. It is kept to 0.01 mm.
    expect(gridfinityPaddingPatch(six, { left: -3, right: 50 })).toEqual({ gridfinityPaddingLeft: 0, gridfinityPaddingRight: 41, width: 293, depth: 42 });
    expect(gridfinityPaddingPatch(six, { left: 0.004, right: 14.237 })).toEqual({ gridfinityPaddingLeft: 0, gridfinityPaddingRight: 14.24, width: 266.24, depth: 42 });
  });

  it("pads a baseplate only: a bin keeps its settings and is built as before", () => {
    const fields = pad(5, 5, 5, 5);
    expect(gridfinityPadding(bin(fields))).toEqual({ back: 0, front: 0, left: 0, right: 0 });
    expect(gridfinityPadding(plate(fields))).toEqual({ back: 5, front: 5, left: 5, right: 5 });
    expect(gridfinityTriangles(bin(fields))).toStrictEqual(gridfinityTriangles(bin()));
    expect(gridfinityFootprintPatch(bin(fields))).toEqual(gridfinityFootprintPatch(bin()));
    // Turned into a baseplate, the padding it kept comes back with it.
    expect(gridfinityShapePatch(bin(fields), { type: "baseplate" })).toMatchObject({ gridfinityType: "baseplate", width: 94, depth: 52, height: 5 });
    expect(gridfinityShapePatch(padded(2, 1, 5, 5, 5, 5), { x: 3 })).toMatchObject({ width: 136, depth: 52 });
    // A baseplate keeping a half-size grid setting is read on the 21 mm grid as a bin less its padding: 2 units stay 4 cells.
    expect(gridfinityShapePatch(padded(2, 1, 0, 0, 41, 0), { type: "bin", halfGrid: true })).toMatchObject({ width: 83.5, depth: 41.5 });
  });

  it("moves the grid away from the padded sides: right is +x, front is +z", () => {
    const { cells, size } = gridfinityPlan(padded(2, 1, 0, 16.2, 0, 14.2));
    expect(size).toEqual({ width: 98.2, depth: 58.2, height: 5 });
    expect(cells.map(({ x, z }) => [Number(x.toFixed(9)), Number(z.toFixed(9))])).toEqual([[-28.1, -8.1], [13.9, -8.1]]);
    // The ridge between the two sockets, 2.15 mm either side of the grid line at the plate's middle height, moves with it.
    const ridge = crossings(gridfinityTriangles(padded(2, 1, 0, 16.2, 0, 14.2)), 2, -7.6).filter((x) => Math.abs(x + 7.1) < 5);
    expect(ridge.map((x) => Number(x.toFixed(6)))).toEqual([-9.25, -4.95]);
  });

  it("is closed, wound outwards and one piece with any sides padded, its padding a solid 5 mm border with the outer corners rounded as before", () => {
    const area = (w: number, d: number) => w * d - (4 - Math.PI) * 16;
    for (const [x, z] of [[1, 1], [2, 1], [3, 2]]) {
      const base = signedVolume(gridfinityTriangles(padded(x, z, 0, 0, 0, 0)));
      for (let k = 1; k < 16; k += 1) {
        for (const amount of [0.01, 2, 4, 14.2, 41]) {
          const p = [0, 1, 2, 3].map((i) => (k & (1 << i) ? amount : 0)) as [number, number, number, number];
          const shape = padded(x, z, ...p);
          const triangles = gridfinityTriangles(shape);
          const context = JSON.stringify({ x, z, p });
          expect(edgeProblems(triangles), context).toBe(0);
          expect(components(triangles), context).toBe(1);
          const w = x * 42 + p[2] + p[3];
          const d = z * 42 + p[0] + p[1];
          // The border adds the plate's 5 mm over the area the padding adds; the corners keep their 4 mm rounding.
          expect(signedVolume(triangles), context).toBeCloseTo(base + 5 * (area(w, d) - area(x * 42, z * 42)), 4);
          const { min, max } = bounds(triangles);
          [min[0] + w / 2, max[0] - w / 2, min[2] + d / 2, max[2] - d / 2, min[1], max[1] - 5].forEach((v) => expect(Math.abs(v), context).toBeLessThan(1e-9));
        }
      }
    }
  });

  it("keeps the padding through a saved project and everywhere a shape's settings go", async () => {
    const settings = pad(3, 16.2, 7.5, 14.2);
    const shape = canonicalizeShape({ ...binShape({ gridfinityType: "baseplate", width: 84 + 7.5 + 14.2, depth: 42 + 3 + 16.2, height: 5 }), ...settings });
    expect(shape).toMatchObject({ ...settings, width: 105.7, depth: 61.2 });
    Object.keys(settings).forEach((key) => expect(workplaneShapesEqual(shape, { ...shape, [key]: 1 }), key).toBe(false));
    const save = (shapes: WorkplaneShape[]) => exportLylProject({
      projectId: "padded",
      projectName: "Padded",
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
    const [loaded] = (await importLylProject(await save([shape]))).shapes;
    expect(workplaneShapesEqual(loaded, shape)).toBe(true);
    expect(sceneShape(shape)).toMatchObject(settings);
    // The exact body is built at the padded size, as the mesh is.
    expect(cadModifierGridfinityForShape(shape)).toMatchObject({ ...settings, width: 105.7, depth: 61.2 });
    expect(normalizeShapeCustomizations({ gridfinity: settings }, {})).toMatchObject({ gridfinity: settings });
    expect(shapeDefaultsFromShape(shape)).toMatchObject(settings);
    const asset = toolbarShapeAssets.find((entry) => entry.kind === "gridfinity")!;
    expect(makeShapeFromAsset(asset, { x: 0, z: 0 }, { ...settings, gridfinityType: "baseplate", width: 105.7, depth: 61.2 })).toMatchObject({ ...settings, width: 105.7, depth: 61.2 });
    for (const key of Object.keys(settings)) {
      await expect(importLylProject(await save([{ ...shape, [key]: "wide" } as unknown as WorkplaneShape])), key).rejects.toThrow(`${key} must be a finite number`);
    }
    // The mesh that booleans and exports use has the border: 5 mm over the area it adds.
    const mesh = (fields: WorkplaneShape) => {
      const { vertices, faces } = meshForShape(fields);
      return signedVolume(faces.map((face) => face.map((i) => vertices[i]) as V[]));
    };
    const plain = canonicalizeShape(binShape({ gridfinityType: "baseplate", width: 84, depth: 42, height: 5 }));
    expect(mesh(shape) - mesh(plain)).toBeCloseTo(5 * (105.7 * 61.2 - 84 * 42), 2);
  });

  it("keeps a padding the MCP gives within what a saved project takes", () => {
    const shape = canonicalizeShape({ ...binShape({ gridfinityType: "baseplate", width: 84, depth: 42, height: 5 }), gridfinityPaddingLeft: -4, gridfinityPaddingRight: 99 });
    expect(shape).toMatchObject({ gridfinityPaddingLeft: 0, gridfinityPaddingRight: 41 });
  });

  it("keeps the units through an MCP update with padding and no size, and the height and lip given with a change to a bin", () => {
    const six = canonicalizeShape(binShape({ gridfinityType: "baseplate", width: 252, depth: 42, height: 5 }));
    const update = (target: WorkplaneShape, params: Record<string, unknown>) => canonicalizeShape({ ...target, ...params, ...mcpGridfinityPaddingPatch(target, params as Partial<WorkplaneShape>, params) });
    expect(update(six, { gridfinityPaddingRight: 41 })).toMatchObject({ width: 293, depth: 42 });
    // A size given with it is read as the whole plate, on its own axis only: the other keeps its units.
    expect(update(six, { gridfinityPaddingRight: 41, width: 252 })).toMatchObject({ width: 251 });
    const deep = canonicalizeShape(binShape({ gridfinityType: "baseplate", width: 84, depth: 126, height: 5 }));
    expect(update(deep, { gridfinityPaddingFront: 30, width: 126 })).toMatchObject({ width: 126, depth: 156 });
    // A size that is no number is not given, as the update leaves it out.
    expect(mcpGridfinityPaddingPatch(six, {}, { gridfinityPaddingRight: 41, width: null })).toMatchObject({ width: 293 });
    // A padding that is no number is left as it was, and a move writes no size.
    expect(mcpGridfinityPaddingPatch(update(deep, { gridfinityPaddingFront: 30 }), {}, { gridfinityPaddingFront: "wide" })).toEqual({});
    expect(mcpGridfinityPaddingPatch(update(deep, { gridfinityPaddingFront: 30 }), {}, { x: 10 })).toEqual({});
    const padded = update(six, { gridfinityPaddingRight: 41 });
    // Turned into a bin it keeps its six units across, and the height and lip it is given, also with the padding set back to 0.
    for (const target of [padded, update(padded, { gridfinityPaddingRight: 0 })]) {
      expect(update(target, { gridfinityType: "bin", height: 46.4 })).toMatchObject({ width: 251.5, height: 46.4 });
      expect(update(target, { gridfinityType: "bin", gridfinityLip: false, height: 42 })).toMatchObject({ width: 251.5, height: 42, gridfinityLip: false });
    }
    // A bin with padding stored turned into a baseplate takes it back, six units and 41 mm.
    const bin = update(padded, { gridfinityType: "bin", height: 25.4 });
    expect(update(bin, { gridfinityType: "baseplate" })).toMatchObject({ width: 293, height: 5 });
  });

  it("makes a new baseplate with padding and no size of the default units, the padding added on", () => {
    const asset = toolbarShapeAssets.find((entry) => entry.kind === "gridfinity")!;
    // The default is 2 x 1 units: 84 x 42, and 30 mm on the right makes it 114 across, not 1 unit and 30 mm.
    expect(makeShapeFromAsset(asset, { x: 0, z: 0 }, { gridfinityType: "baseplate", gridfinityPaddingRight: 30, gridfinityPaddingFront: 41 })).toMatchObject({ width: 114, depth: 83 });
    expect(makeShapeFromAsset(asset, { x: 0, z: 0 }, { gridfinityType: "baseplate", gridfinityPaddingRight: 30, width: 114 })).toMatchObject({ width: 114 });
  });
});

describe("gridfinity baseplate corner radius", { timeout: 60_000 }, () => {
  /** What the mesh's rounding of radius r takes off a square corner: the square less the fan of its eight steps. */
  const cornerOff = (r: number) => r * r * (1 - 4 * Math.sin(Math.PI / 16));
  const pad = (back: number, front: number, left: number, right: number) => ({ gridfinityPaddingBack: back, gridfinityPaddingFront: front, gridfinityPaddingLeft: left, gridfinityPaddingRight: right });

  it("is the baseplate it was at 4 mm or unset, and a bin is built as before with it set", () => {
    expect(gridfinityCornerRadius(plate())).toBe(4);
    expect(gridfinityTriangles(plate({ gridfinityCornerRadius: 4 }))).toStrictEqual(gridfinityTriangles(plate()));
    expect(gridfinityTriangles(bin({ gridfinityCornerRadius: 0 }))).toStrictEqual(gridfinityTriangles(bin()));
    expect(gridfinityPlan(bin({ gridfinityCornerRadius: 0 }))).toStrictEqual(gridfinityPlan(bin()));
  });

  it("keeps the radius from 0 to 4 mm, to 0.01 mm, and builds one within 0.05 mm under the sockets' 4 mm as 4", () => {
    for (const [value, built] of [[2.346, 2.35], [0, 0], [0.004, 0], [-1, 0], [7, 4], [Number.NaN, 4], ["wide", 4], [3.94, 3.94], [3.95, 4], [3.96, 4], [3.99, 4]] as const) {
      expect(gridfinityCornerRadius(plate({ gridfinityCornerRadius: value })), `${value}`).toBe(built);
    }
  });

  it("is closed, wound outwards and one piece at any radius, padded or not, the corners filled out to it and the box and sockets as before", () => {
    for (const [x, z, p] of [[1, 1, [0, 0, 0, 0]], [2, 1, [0, 0, 0, 0]], [3, 2, [0, 0, 0, 0]], [2, 1, [0, 16.2, 0, 14.2]], [1, 1, [5, 5, 5, 5]], [2, 2, [0, 3, 0, 0]]] as const) {
      const w = x * 42 + p[2] + p[3];
      const d = z * 42 + p[0] + p[1];
      const shape = (r: number) => plate({ width: w, depth: d, ...pad(...p), gridfinityCornerRadius: r });
      const base = signedVolume(gridfinityTriangles(shape(4)));
      for (const r of [0, 0.5, 2, 3.9, 4]) {
        const triangles = gridfinityTriangles(shape(r));
        const context = JSON.stringify({ x, z, p, r });
        expect(edgeProblems(triangles), context).toBe(0);
        expect(components(triangles), context).toBe(1);
        // Each of the four corners gains the plate's 5 mm over what the smaller rounding no longer takes off.
        expect(signedVolume(triangles), context).toBeCloseTo(base + 4 * 5 * (cornerOff(4) - cornerOff(r)), 6);
        const { min, max } = bounds(triangles);
        [min[0] + w / 2, max[0] - w / 2, min[2] + d / 2, max[2] - d / 2, min[1], max[1] - 5].forEach((v) => expect(Math.abs(v), context).toBeLessThan(1e-9));
      }
      // Square, the plate reaches its box's corners at the top and the bottom.
      const square = gridfinityTriangles(shape(0)).flat();
      for (const [cx, cz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        for (const y of [0, 5]) expect(square.some((v) => Math.abs(v[0] - (cx * w) / 2) < 1e-9 && Math.abs(v[1] - y) < 1e-9 && Math.abs(v[2] - (cz * d) / 2) < 1e-9), `${cx} ${y} ${cz}`).toBe(true);
      }
    }
  });

  it("keeps the radius through a saved project, the settings and the exact body, and refuses nonsense", async () => {
    const settings = { gridfinityCornerRadius: 1.5 };
    const shape = canonicalizeShape({ ...binShape({ gridfinityType: "baseplate", width: 84, depth: 42, height: 5 }), ...settings });
    expect(shape).toMatchObject(settings);
    expect(workplaneShapesEqual(shape, { ...shape, gridfinityCornerRadius: 2 })).toBe(false);
    const save = (shapes: WorkplaneShape[]) => exportLylProject({
      projectId: "corner",
      projectName: "Corner",
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
    const [loaded] = (await importLylProject(await save([shape]))).shapes;
    expect(workplaneShapesEqual(loaded, shape)).toBe(true);
    expect(loaded).toMatchObject(settings);
    expect(sceneShape(shape)).toMatchObject(settings);
    expect(cadModifierGridfinityForShape(shape)).toMatchObject(settings);
    expect(normalizeShapeCustomizations({ gridfinity: settings }, {})).toMatchObject({ gridfinity: settings });
    expect(shapeDefaultsFromShape(shape)).toMatchObject(settings);
    expect(mcpShapeSummary(shape).settings).toMatchObject(settings);
    const asset = toolbarShapeAssets.find((entry) => entry.kind === "gridfinity")!;
    expect(makeShapeFromAsset(asset, { x: 0, z: 0 }, { ...settings, gridfinityType: "baseplate" })).toMatchObject(settings);
    await expect(importLylProject(await save([{ ...shape, gridfinityCornerRadius: "round" } as unknown as WorkplaneShape]))).rejects.toThrow("gridfinityCornerRadius must be a finite number");
    await expect(importLylProject(await save([{ ...shape, gridfinityCornerRadius: -1 }]))).rejects.toThrow("gridfinityCornerRadius is outside the supported range");
    // The mesh that booleans and exports use has the smaller corners: 5 mm over the area they add.
    const meshVolume = (s: WorkplaneShape) => { const { vertices, faces } = meshForShape(s); return signedVolume(faces.map((face) => face.map((i) => vertices[i]) as V[])); };
    const plain = canonicalizeShape(binShape({ gridfinityType: "baseplate", width: 84, depth: 42, height: 5 }));
    expect(meshVolume(shape) - meshVolume(plain)).toBeCloseTo(4 * 5 * (cornerOff(4) - cornerOff(1.5)), 4);
  });
});

describe("gridfinity bin corner radius", { timeout: 120_000 }, () => {
  let runtime: ManifoldToplevel;
  beforeAll(async () => {
    runtime = await manifoldModule();
    runtime.setup();
  });
  /** What the mesh's rounding of radius r takes off a square corner: the square less the fan of its eight steps. */
  const cornerOff = (r: number) => r * r * (1 - 4 * Math.sin(Math.PI / 16));
  const tray = { gridfinityType: "tray" as const, width: 80, depth: 40, height: 20 };
  const one = { width: 41.5, depth: 41.5 };
  const key = (v: V) => v.map((n) => n.toFixed(6)).join();

  it("is the bin it was at 3.75 mm, within 0.05 mm under it, or unset, and a baseplate or a tray ignores it", () => {
    expect(gridfinityBinCornerRadius(bin())).toBe(3.75);
    for (const value of [3.75, 3.71, 3.749]) expect(gridfinityTriangles(bin({ gridfinityBinCornerRadius: value })), `${value}`).toStrictEqual(gridfinityTriangles(bin()));
    expect(gridfinityPlan(bin({ gridfinityBinCornerRadius: 3.72 }))).toStrictEqual(gridfinityPlan(bin()));
    expect(gridfinityTriangles(plate({ gridfinityBinCornerRadius: 0 }))).toStrictEqual(gridfinityTriangles(plate()));
    expect(gridfinityPlan(plate({ gridfinityBinCornerRadius: 0 }))).toStrictEqual(gridfinityPlan(plate()));
    expect(gridfinityTriangles({ ...tray, gridfinityBinCornerRadius: 0 })).toStrictEqual(gridfinityTriangles(tray));
    expect(gridfinityPlan(plate({ gridfinityCornerRadius: 2 })).wallRadius).toBe(2);
    // The baseplate's own field still leaves a bin as it is, and the bin's leaves the inside its 3.75 mm.
    expect(gridfinityTriangles(bin({ gridfinityCornerRadius: 0 }))).toStrictEqual(gridfinityTriangles(bin()));
    expect(gridfinityPlan(bin({ gridfinityBinCornerRadius: 0 })).cornerRadius).toBe(3.75);
  });

  it("keeps the radius from 0 to 3.75 mm, to 0.01 mm, and builds one within 0.05 mm under 3.75 as 3.75", () => {
    for (const [value, built] of [[2.346, 2.35], [0, 0], [0.004, 0], [-1, 0], [7, 3.75], [Number.NaN, 3.75], ["wide", 3.75], [3.69, 3.69], [3.7, 3.75], [3.71, 3.75], [3.74, 3.75]] as const) {
      expect(gridfinityBinCornerRadius(bin({ gridfinityBinCornerRadius: value })), `${value}`).toBe(built);
    }
  });

  it("is offered on a bin with a closed corner, not where every corner is square on an open side, nor on a baseplate or a tray", () => {
    expect(gridfinityBinCornerFits(bin())).toBe(true);
    expect(gridfinityBinCornerFits(bin({ gridfinityOpenBack: true }))).toBe(true);
    expect(gridfinityBinCornerFits(bin({ gridfinityOpenBack: true, gridfinityOpenLeft: true }))).toBe(true);
    expect(gridfinityBinCornerFits(bin({ gridfinityOpenBack: true, gridfinityOpenFront: true }))).toBe(false);
    expect(gridfinityBinCornerFits(bin({ gridfinityOpenLeft: true, gridfinityOpenRight: true }))).toBe(false);
    expect(gridfinityBinCornerFits(bin({ gridfinityOpenBack: true, gridfinityOpenLeft: true, gridfinityOpenRight: true }))).toBe(false);
    // A side opened only partly keeps its corners.
    expect(gridfinityBinCornerFits(bin({ gridfinityOpenBack: true, gridfinityOpenFront: true, gridfinityOpenings: [{ side: "front", width: 20, depth: 10 }] }))).toBe(true);
    expect(gridfinityBinCornerFits(plate())).toBe(false);
    expect(gridfinityBinCornerFits(tray)).toBe(false);
  });

  it("is closed, wound outwards and one piece at any radius, with every setting a bin can have", () => {
    const solidOf = (triangles: V[][]) => {
      const vertProperties = new Float32Array(triangles.flat(2));
      const triVerts = new Uint32Array(triangles.flatMap((_, i) => [3 * i, 3 * i + 1, 3 * i + 2]));
      const mesh = new runtime.Mesh({ numProp: 3, vertProperties, triVerts, tolerance: 1e-4 });
      mesh.merge();
      return new runtime.Manifold(mesh);
    };
    const settings: Array<Record<string, unknown>> = [
      {},
      one,
      { gridfinityLip: false, height: 21 },
      { gridfinityLipChamfer: 1 },
      { gridfinityOpenBack: true },
      { gridfinityOpenBack: true, gridfinityOpenLeft: true },
      { gridfinityOpenFront: true, gridfinityOpenings: [{ side: "front", width: 20, depth: 10 }] },
      { gridfinityOpenFront: true, gridfinityOpenings: [{ side: "front", width: 30, depth: 24 }] },
      { ...one, gridfinityWallThickness: 20.5 },
      { gridfinityHalfGrid: true, width: 41.5, depth: 20.5 },
      { gridfinityWallThickness: 2.6 },
      { gridfinityWallThickness: 2.6, gridfinityLipChamfer: 0.5 },
      { ...square, gridfinityCompartmentsX: 2, gridfinityCompartmentsZ: 2, gridfinityScoopFront: true, gridfinityLabelBack: true },
      { gridfinityMagnets: true },
    ];
    for (const fields of settings) {
      for (const r of [0, 0.5, 2, 3.69]) {
        const shape = bin({ ...fields, gridfinityBinCornerRadius: r });
        const context = JSON.stringify({ fields, r });
        const triangles = gridfinityTriangles(shape);
        expect(edgeProblems(triangles), context).toBe(0);
        expect(components(triangles), context).toBe(1);
        const solid = solidOf(gridfinityLabelledTriangles(runtime, shape));
        expect(solid.status(), context).toBe("NoError");
        expect(solid.volume(), context).toBeGreaterThan(0);
        solid.delete();
      }
    }
  });

  it("adds the wall above the band over what the smaller rounding no longer takes off, at each closed corner", () => {
    // [fields, the top of the outer wall, closed corners]: the band ends 0.5 mm over the feet's 4.75 mm.
    const cases: Array<[Record<string, unknown>, number, number]> = [
      [{}, 25.4, 4],
      [one, 25.4, 4],
      [{ gridfinityLipChamfer: 1 }, 24.4, 4],
      [{ gridfinityLip: false, height: 21 }, 21, 4],
      [{ gridfinityOpenBack: true }, 25.4, 2],
      [{ gridfinityOpenBack: true, gridfinityOpenLeft: true }, 25.4, 1],
    ];
    for (const [fields, wallTop, corners] of cases) {
      const base = signedVolume(gridfinityTriangles(bin(fields)));
      for (const r of [0, 1.5, 3.69]) {
        expect(signedVolume(gridfinityTriangles(bin({ ...fields, gridfinityBinCornerRadius: r }))) - base, JSON.stringify({ fields, r })).toBeCloseTo(corners * (cornerOff(3.75) - cornerOff(r)) * (wallTop - 5.25), 6);
      }
    }
    // A 1 x 1 x 3 bin with the lip, square: 4 x 14.0625 x 0.219639 x 20.15 = 248.95 mm³ more.
    expect(signedVolume(gridfinityTriangles(bin({ ...one, gridfinityBinCornerRadius: 0 }))) - signedVolume(gridfinityTriangles(bin(one)))).toBeCloseTo(248.95, 2);
  });

  it("keeps the outline's 3.75 mm rounding up to 0.5 mm over the feet, and squares the wall from there up to the land", () => {
    const within = (v: V) => Math.hypot(Math.max(0, Math.abs(v[0]) - 17), Math.max(0, Math.abs(v[2]) - 17)) <= 3.75 + 1e-9;
    const corner = (v: V) => Math.abs(Math.abs(v[0]) - 20.75) < 1e-9 && Math.abs(Math.abs(v[2]) - 20.75) < 1e-9;
    for (const [fields, land] of [[{}, 25.4], [{ gridfinityLipChamfer: 1 }, 24.4], [{ gridfinityLip: false, height: 21 }, 21]] as const) {
      const square = gridfinityTriangles(bin({ ...one, ...fields, gridfinityBinCornerRadius: 0 })).flat();
      expect(square.filter((v) => v[1] < 5.25 - 1e-9 && !within(v)), JSON.stringify(fields)).toHaveLength(0);
      const corners = square.filter(corner);
      expect(Math.min(...corners.map((v) => v[1]))).toBeCloseTo(5.25, 9);
      expect(Math.max(...corners.map((v) => v[1]))).toBeCloseTo(land, 9);
      expect(new Set(corners.map((v) => `${Math.sign(v[0])}${Math.sign(v[2])}`)).size).toBe(4);
    }
  });

  it("keeps every point the bin had: the feet, the lip a stacked bin's feet rest on, and the inside", () => {
    for (const fields of [{}, { gridfinityLipChamfer: 0.5 }, { gridfinityOpenBack: true }, { gridfinityLip: false, height: 21 }, { gridfinityWallThickness: 2.6 }]) {
      const kept = new Set(gridfinityTriangles(bin({ ...fields, gridfinityBinCornerRadius: 0 })).flat().map(key));
      expect(gridfinityTriangles(bin(fields)).flat().filter((v) => !kept.has(key(v))), JSON.stringify(fields)).toHaveLength(0);
    }
  });

  it("keeps the radius through a saved project, the settings and the exact body, and refuses nonsense", async () => {
    const settings = { gridfinityBinCornerRadius: 1.5 };
    const shape = canonicalizeShape({ ...binShape({}), ...settings });
    expect(shape).toMatchObject(settings);
    expect(workplaneShapesEqual(shape, { ...shape, gridfinityBinCornerRadius: 2 })).toBe(false);
    expect(shapeGeometrySignature(shape)).not.toBe(shapeGeometrySignature({ ...shape, gridfinityBinCornerRadius: 2 }));
    const save = (shapes: WorkplaneShape[]) => exportLylProject({
      projectId: "bin-corner",
      projectName: "Bin corner",
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
    const [loaded] = (await importLylProject(await save([shape]))).shapes;
    expect(workplaneShapesEqual(loaded, shape)).toBe(true);
    expect(loaded).toMatchObject(settings);
    expect(sceneShape(shape)).toMatchObject(settings);
    expect(cadModifierGridfinityForShape(shape)).toMatchObject(settings);
    expect(normalizeShapeCustomizations({ gridfinity: settings }, {})).toMatchObject({ gridfinity: settings });
    expect(shapeDefaultsFromShape(shape)).toMatchObject(settings);
    expect(mcpShapeSummary(shape).settings).toMatchObject(settings);
    const asset = toolbarShapeAssets.find((entry) => entry.kind === "gridfinity")!;
    expect(makeShapeFromAsset(asset, { x: 0, z: 0 }, settings)).toMatchObject(settings);
    await expect(importLylProject(await save([{ ...shape, gridfinityBinCornerRadius: "square" } as unknown as WorkplaneShape]))).rejects.toThrow("gridfinityBinCornerRadius must be a finite number");
    await expect(importLylProject(await save([{ ...shape, gridfinityBinCornerRadius: -1 }]))).rejects.toThrow("gridfinityBinCornerRadius is outside the supported range");
    // The mesh that booleans and exports use has the smaller corners above the band.
    const meshVolume = (s: WorkplaneShape) => { const { vertices, faces } = meshForShape(s); return signedVolume(faces.map((face) => face.map((i) => vertices[i]) as V[])); };
    expect(meshVolume(shape) - meshVolume(canonicalizeShape(binShape({})))).toBeCloseTo(4 * (cornerOff(3.75) - cornerOff(1.5)) * (25.4 - 5.25), 3);
  });
});

describe("gridfinity baseplate fitted to a drawer", () => {
  const plate = (fields: Record<string, unknown> = {}) => ({ width: 252, depth: 252, height: 5, gridfinityType: "baseplate" as const, ...fields });

  it("shows the drawer a baseplate fills: its size and 0.5 mm", () => {
    expect(gridfinityDrawerSize(plate())).toEqual({ width: 252.5, depth: 252.5 });
    expect(gridfinityDrawerSize(plate({ width: 291.6, gridfinityPaddingLeft: 19.8, gridfinityPaddingRight: 19.8 }))).toEqual({ width: 292.1, depth: 252.5 });
  });

  it("takes as many units as fit and splits the rest evenly, 0.5 mm smaller than the drawer", () => {
    // 292.1 mm: 6 units and 39.6 mm, 19.8 each side.
    expect(gridfinityDrawerPatch(plate(), "x", 292.1)).toEqual({ gridfinityPaddingLeft: 19.8, gridfinityPaddingRight: 19.8, width: 291.6, depth: 252 });
    // 230 mm: 5 units and 19.5 mm, 9.75 each side.
    expect(gridfinityDrawerPatch(plate(), "z", 230)).toEqual({ gridfinityPaddingBack: 9.75, gridfinityPaddingFront: 9.75, width: 252, depth: 229.5 });
    // 250 mm: 5.94 units fit, so 5 and 39.5 mm, never 6 and a plate wider than the drawer.
    expect(gridfinityDrawerPatch(plate(), "x", 250)).toEqual({ gridfinityPaddingLeft: 19.75, gridfinityPaddingRight: 19.75, width: 249.5, depth: 252 });
    // An odd hundredth goes to the first side.
    expect(gridfinityDrawerPatch(plate(), "x", 230.05)).toEqual({ gridfinityPaddingLeft: 9.78, gridfinityPaddingRight: 9.77, width: 229.55, depth: 252 });
    // 298.45 mm: the size is whole hundredths, not 297.95000000000005.
    expect(gridfinityDrawerPatch(plate(), "x", 298.45)).toEqual({ gridfinityPaddingLeft: 22.98, gridfinityPaddingRight: 22.97, width: 297.95, depth: 252 });
    // A drawer of whole units and 0.5 mm takes no padding, also typed to a thousandth below that.
    expect(gridfinityDrawerPatch(plate(), "z", 84.497)).toEqual({ gridfinityPaddingBack: 0, gridfinityPaddingFront: 0, width: 252, depth: 84 });
    expect(gridfinityDrawerPatch(plate(), "x", 168.5)).toEqual({ gridfinityPaddingLeft: 0, gridfinityPaddingRight: 0, width: 168, depth: 252 });
  });

  it("splits the rest evenly whatever padding the plate had before", () => {
    expect(gridfinityDrawerPatch(plate({ width: 259.1, gridfinityPaddingRight: 7.1 }), "x", 260)).toEqual({ gridfinityPaddingLeft: 3.75, gridfinityPaddingRight: 3.75, width: 259.5, depth: 252 });
    expect(gridfinityDrawerPatch(plate({ width: 272, gridfinityPaddingLeft: 5, gridfinityPaddingRight: 15 }), "x", 292.5)).toEqual({ gridfinityPaddingLeft: 20, gridfinityPaddingRight: 20, width: 292, depth: 252 });
    // 298.45 mm: 6 units and 45.95 mm, 22.98 and 22.97.
    expect(gridfinityDrawerPatch(plate({ width: 259.1, gridfinityPaddingRight: 7.1 }), "x", 298.45)).toEqual({ gridfinityPaddingLeft: 22.98, gridfinityPaddingRight: 22.97, width: 297.95, depth: 252 });
  });

  it("fills what one baseplate can of a larger drawer, 6 units and 41 mm each side, and gives a smaller one 1 unit", () => {
    expect(gridfinityDrawerPatch(plate(), "x", 500)).toEqual({ gridfinityPaddingLeft: 41, gridfinityPaddingRight: 41, width: 334, depth: 252 });
    expect(gridfinityDrawerPatch(plate(), "z", 30)).toEqual({ gridfinityPaddingBack: 0, gridfinityPaddingFront: 0, width: 252, depth: 42 });
  });

  it("changes only the axis given, and the plate built from it fills the drawer", () => {
    const section = plate({ depth: 260.1, gridfinityPaddingBack: 8.1 });
    const fitted = { ...section, ...gridfinityDrawerPatch(section, "x", 292.1) };
    expect(fitted).toMatchObject({ depth: 260.1, gridfinityPaddingBack: 8.1, width: 291.6 });
    expect(gridfinityUnits(fitted)).toEqual({ x: 6, z: 6, y: 1 });
    expect(gridfinityDrawerSize(fitted)).toEqual({ width: 292.1, depth: 260.6 });
  });
});

describe("gridfinity wall thickness", { timeout: 60_000 }, () => {
  let runtime: ManifoldToplevel;
  beforeAll(async () => {
    runtime = await manifoldModule();
    runtime.setup();
  });
  const top = 21;
  const ledge = top - 0.85;

  it("builds every bin as before with no wall set or 0.95 mm", () => {
    for (const fields of [{}, { gridfinityLip: false, height: 21 }, { gridfinityOpenFront: true }, { gridfinityScoopFront: true, gridfinityLabelBack: true }, { gridfinityCompartmentsX: 3, gridfinityScoopFront: true }, { gridfinityHalfGrid: true, width: 20.5, depth: 41.5 }]) {
      expect(gridfinityTriangles(bin({ ...fields, gridfinityWallThickness: 0.95 })), JSON.stringify(fields)).toEqual(gridfinityTriangles(bin(fields)));
    }
    expect(gridfinityWallThickness(bin())).toBe(0.95);
  });

  it("ends a low bin's support on the floor exactly as before at the 0.95 mm wall", () => {
    // 2 height units with the lip at its highest floor: the support's foot is 2.6 - (14 - floor), 0.9499999999999997, as before the wall could be set.
    for (const floor of [12.3, 12.33, 99]) {
      for (const halfGrid of [false, true]) {
        const fields = { width: 41.5, depth: 41.5, height: 14 + GRIDFINITY_LIP_HEIGHT, gridfinityFloorHeight: floor, gridfinityHalfGrid: halfGrid };
        const plan = gridfinityPlan(bin(fields));
        const [inset] = gridfinityWallProfile(plan).at(-1)!;
        expect(inset, `${floor} ${halfGrid}`).toBe(2.6 - (14 - plan.floor));
        expect(gridfinityTriangles(bin({ ...fields, gridfinityWallThickness: 0.95 })), `${floor} ${halfGrid}`).toEqual(gridfinityTriangles(bin(fields)));
      }
    }
  });

  it("takes a wall from 0.8 mm up to where the walls meet, on a bin only", () => {
    expect(gridfinityWallThickness(bin({ gridfinityWallThickness: 0.5 }))).toBe(0.8);
    expect(gridfinityWallThickness(bin({ gridfinityWallThickness: 2.5 }))).toBe(2.5);
    expect(gridfinityWallMaxThickness(bin())).toBe(20.75);
    expect(gridfinityWallThickness(bin({ gridfinityWallThickness: 99 }))).toBe(20.75);
    expect(gridfinityWallThickness(plate({ gridfinityWallThickness: 3 }))).toBe(0.95);
    expect(gridfinityTriangles(plate({ gridfinityWallThickness: 3 }))).toEqual(gridfinityTriangles(plate()));
  });

  it("runs the support down to a thin wall and stops a wall over 1.75 mm at a ledge 0.85 mm under the top", () => {
    const profile = (w: number, fields = {}) => gridfinityWallProfile(gridfinityPlan(bin({ ...fields, gridfinityWallThickness: w })));
    expect(profile(1).slice(5)).toEqual([[1, top - 1.6], [1, 5.95]]);
    expect(profile(1.75)[5][0]).toBe(1.75);
    expect(profile(1.75)[5][1]).toBeCloseTo(ledge, 9);
    for (const w of [2.5, 5]) expect(profile(w).slice(5), `${w}`).toEqual([[1.75, ledge], [w, ledge], [w, 5.95]]);
    // A floor at the ledge ends the support there.
    expect(profile(2.5, { gridfinityFloorHeight: 30 }).slice(5)).toEqual([[1.75, ledge]]);
    expect(gridfinityWallProfile(gridfinityPlan(bin({ gridfinityLip: false, height: 21, gridfinityWallThickness: 4 }))).slice(2)).toEqual([[4, 21], [4, 5.95]]);
  });

  it("raises the highest floor with the wall up to the ledge, and leaves a 1-unit bin's floor alone until it can be raised", () => {
    const max = (w: number, fields = {}) => gridfinityFloorMaxHeight(bin({ ...fields, gridfinityWallThickness: w }));
    expect(max(0.95)).toBeCloseTo(19.35, 9);
    expect(max(1.75)).toBeCloseTo(ledge, 9);
    expect(max(2.5)).toBeCloseTo(ledge, 9);
    expect(max(2.5, { gridfinityLip: false, height: 21 })).toBe(21);
    const unit = { height: 7 + GRIDFINITY_LIP_HEIGHT };
    expect(max(1, unit)).toBe(5.95);
    // Within 0.05 mm of the floor there is nothing to raise: up to a wall of 1.6 mm, and from just over it there is.
    expect(max(1.6, unit)).toBe(5.95);
    expect(gridfinityFloorFits(bin({ ...unit, gridfinityWallThickness: 1.6 }))).toBe(false);
    expect(max(1.62, unit)).toBeCloseTo(6.02, 9);
    expect(gridfinityFloorFits(bin({ ...unit, gridfinityWallThickness: 1.62 }))).toBe(true);
    // Where the support runs down to the floor, it never leaves the wall thinner than set.
    expect(gridfinityWallProfile(gridfinityPlan(bin({ ...unit, gridfinityWallThickness: 1.58 }))).at(-1)).toEqual([1.58, 5.95]);
    expect(max(1.7, unit)).toBeCloseTo(6.1, 9);
    expect(max(2.5, unit)).toBeCloseTo(6.15, 9);
    // At 1.55 mm or less the wall of a 1-unit bin with the lip is all support, as before.
    expect(gridfinityTriangles(bin({ ...unit, gridfinityWallThickness: 1.2 }))).toEqual(gridfinityTriangles(bin(unit)));
  });

  it("runs a shelf's end into the wall where the lip's support leans past it, less as the wall grows and not at all from 1.75 mm", () => {
    // The end snaps within 1 mm of the wall's face plus the support's lean at the shelf's top, 1.75 mm less the wall.
    const offset = (w: number, length: number) => gridfinityLabelLimits(bin({ gridfinityWallThickness: w, gridfinityLabelBack: true, gridfinityLabelBackLength: length }), "back").offset;
    // At 2 mm (no lean) a shelf of 77 mm leaves 1.25 mm at each end of the 79.5 mm inside and can move.
    expect(offset(2, 77)).toBe(1);
    // At 0.8 mm (a lean of 0.95) a shelf of 78.1 mm leaves 1.9 mm, within 1.95: it runs from wall to wall.
    expect(offset(0.8, 78.1)).toBe(0);
    // A compartment's label against the bin's wall snaps the same way: 94 % of a 39.15 mm compartment stops short at 2 mm.
    const label = gridfinityCompartmentPieces(bin({ gridfinityWallThickness: 2, gridfinityCompartmentsX: 2, gridfinityCompartmentLabels: [{ column: 0, row: 0, side: "back", length: 94, align: "start" }] }))!
      .cells.find((cell) => cell.column === 0 && cell.row === 0)!.labels!;
    const [{ profile }] = label.shelves;
    expect(profile.to - profile.from).toBeLessThan(39.15 - 1);
  });

  it("never makes a bin open on every side solid, as it has no walls left to meet", () => {
    const open = { gridfinityOpenBack: true, gridfinityOpenFront: true, gridfinityOpenLeft: true, gridfinityOpenRight: true };
    expect(gridfinityWallSolid(bin({ gridfinityWallThickness: 20.5 }))).toBe(true);
    expect(gridfinityWallSolid(bin({ ...open, gridfinityWallThickness: 20.5 }))).toBe(false);
    expect(gridfinityFloorHeight(bin({ ...open, gridfinityWallThickness: 20.5 }))).toBe(5.95);
  });

  it("leaves a bin open on every side as it is whatever wall is set, as it has no wall to set", () => {
    const open = { gridfinityOpenBack: true, gridfinityOpenFront: true, gridfinityOpenLeft: true, gridfinityOpenRight: true, gridfinityCompartmentsX: 3, gridfinityScoopFront: true };
    expect(gridfinityPlan(bin({ ...open, gridfinityWallThickness: 10 })).wallThickness).toBe(0.95);
    expect(gridfinityTriangles(bin({ ...open, gridfinityWallThickness: 10 }))).toEqual(gridfinityTriangles(bin(open)));
    expect(gridfinityCompartmentPieces(bin({ ...open, gridfinityWallThickness: 10 }))).toEqual(gridfinityCompartmentPieces(bin(open)));
  });

  it("cuts the shelves, scoops, compartments and their labels to the bin's own inside", () => {
    for (const w of [0.8, 2.5, 4]) {
      const fields = { gridfinityWallThickness: w };
      const radius = Math.max(0, 3.75 - w);
      const shelves = gridfinityLabelPieces(bin({ ...fields, gridfinityLabelBack: true }))!;
      expect([shelves.inside.hx, shelves.inside.hz, shelves.inside.radius], `${w}`).toEqual([41.75 - w, 20.75 - w, radius]);
      const scoops = gridfinityScoopPieces(bin({ ...fields, gridfinityScoopFront: true }))!;
      expect([scoops.inside.hx, scoops.inside.hz, scoops.inside.radius], `${w}`).toEqual([41.75 - w, 20.75 - w, radius]);
      const compartments = gridfinityCompartmentPieces(bin({ ...fields, gridfinityCompartmentsX: 2, gridfinityScoopFront: true, gridfinityCompartmentLabels: [{ column: 0, row: 0, side: "back" }] }))!;
      expect(compartments.floorRounding, `${w}`).toBe(radius);
      compartments.cells.forEach((cell) => {
        expect(cell.inside.radius, `${w}`).toBe(radius);
        expect(cell.scoops?.inside, `${w}`).toEqual(cell.inside);
      });
      expect(compartments.cells[0].labels!.inside.radius, `${w}`).toBe(radius);
      // An open side's pieces run out the wall's thickness to the outline.
      expect(gridfinityLabelPieces(bin({ ...fields, gridfinityLabelBack: true, gridfinityOpenLeft: true }))!.inside.wallThickness, `${w}`).toBe(w);
    }
    expect(gridfinityPlan(bin({ gridfinityWallThickness: 6 })).reach).toBe(8);
    expect(gridfinityPlan(bin()).reach).toBe(5.75);
  });

  it("draws every wall closed and in one piece, up to a solid bin", () => {
    const setups: Array<Record<string, unknown>> = [
      {},
      { gridfinityLip: false, height: 21 },
      { gridfinityOpenFront: true },
      { gridfinityOpenBack: true, gridfinityOpenFront: true, gridfinityOpenLeft: true, gridfinityOpenRight: true },
      { gridfinityHalfGrid: true, width: 20.5, depth: 41.5 },
      { gridfinityScoopFront: true, gridfinityScoopLeft: true },
      { gridfinityLabelBack: true, gridfinityLabelLeft: true },
      { gridfinityCompartmentsX: 3, gridfinityScoopFront: true },
      { height: 7 + GRIDFINITY_LIP_HEIGHT },
    ];
    // Pairwise: each setup at two or three walls, every wall over several setups.
    const walls = [0.8, 1.75, 2.5, 3.75, 6, 99];
    setups.forEach((fields, i) => {
      for (const w of [walls[i % walls.length], walls[(i + 2) % walls.length], walls[(i + 4) % walls.length]]) {
        const label = `${JSON.stringify(fields)} ${w}`;
        const triangles = gridfinityLabelledTriangles(runtime, bin({ ...fields, gridfinityWallThickness: w }));
        expect(edgeProblems(triangles), label).toBe(0);
        expect(components(triangles), label).toBe(1);
      }
    });
  });

  it("leaves out what a narrow inside has no room for, and builds a bin solid where the walls leave less than 1 mm", () => {
    const half = { gridfinityHalfGrid: true, width: 20.5, depth: 41.5 };
    // A half-size cell 20.5 mm wide with a 6 mm wall is 8.5 mm inside: no shelves, no scoops across, fewer compartments.
    expect(gridfinityLabelFits(bin({ ...half, gridfinityWallThickness: 6 }))).toBe(false);
    expect(gridfinityLabelFits(bin({ ...half, gridfinityWallThickness: 5 }))).toBe(true);
    expect(gridfinityScoopPieces(bin({ ...half, gridfinityWallThickness: 7, gridfinityScoopLeft: true, gridfinityScoopRight: true }))).toBeNull();
    // 12 mm walls leave 17.5 mm: room for two 6 mm compartments beside a 1.2 mm divider, not three.
    expect(gridfinityCompartmentCount(bin({ width: 41.5, depth: 41.5, gridfinityWallThickness: 12, gridfinityCompartmentsX: 4 }), "x")).toBe(2);
    expect(gridfinityCompartmentCount(bin({ width: 41.5, depth: 41.5, gridfinityCompartmentsX: 4 }), "x")).toBe(4);
    // 41.5 wide: walls of 20.3 leave 0.9 mm, solid; the floor goes up to the ledge, or the top without the lip.
    expect(gridfinityWallSolid(bin({ width: 41.5, depth: 41.5, gridfinityWallThickness: 20.3 }))).toBe(true);
    expect(gridfinityWallSolid(bin({ width: 41.5, depth: 41.5, gridfinityWallThickness: 20.2 }))).toBe(false);
    expect(gridfinityPlan(bin({ width: 41.5, depth: 41.5, gridfinityWallThickness: 20.3 })).floor).toBeCloseTo(ledge, 9);
    expect(gridfinityPlan(bin({ width: 41.5, depth: 41.5, gridfinityLip: false, height: 21, gridfinityWallThickness: 99 })).floor).toBe(21);
    // Without the lip a solid bin is the block, its top a ring ending 0.5 mm from the middle.
    const block = gridfinityTriangles(bin({ width: 41.5, depth: 41.5, gridfinityLip: false, height: 21, gridfinityWallThickness: 99 }));
    expect(edgeProblems(block)).toBe(0);
    expect(signedVolume(block)).toBeCloseTo(signedVolume(gridfinityTriangles(bin({ width: 41.5, depth: 41.5, gridfinityLip: false, height: 21, gridfinityFloorHeight: 21 }))), 3);
  });

  it("keeps the wall through a saved project, the settings and the exact body, and refuses nonsense", async () => {
    const settings = { gridfinityWallThickness: 2.5 };
    const shape = canonicalizeShape(binShape(settings));
    expect(workplaneShapesEqual(shape, { ...shape, gridfinityWallThickness: 2.4 })).toBe(false);
    const save = (shapes: WorkplaneShape[]) => exportLylProject({
      projectId: "wall",
      projectName: "Wall",
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
    const [loaded] = (await importLylProject(await save([shape]))).shapes;
    expect(workplaneShapesEqual(loaded, shape)).toBe(true);
    expect(loaded).toMatchObject(settings);
    expect(sceneShape(shape)).toMatchObject(settings);
    expect(cadModifierGridfinityForShape(shape)).toMatchObject(settings);
    expect(normalizeShapeCustomizations({ gridfinity: settings }, {})).toMatchObject({ gridfinity: settings });
    expect(shapeDefaultsFromShape(shape)).toMatchObject(settings);
    const asset = toolbarShapeAssets.find((entry) => entry.kind === "gridfinity")!;
    expect(makeShapeFromAsset(asset, { x: 0, z: 0 }, settings)).toMatchObject(settings);
    await expect(importLylProject(await save([{ ...shape, gridfinityWallThickness: "thick" } as unknown as WorkplaneShape]))).rejects.toThrow("gridfinityWallThickness must be a finite number");
    await expect(importLylProject(await save([{ ...shape, gridfinityWallThickness: -1 }]))).rejects.toThrow("gridfinityWallThickness is outside the supported range");
    // The mesh that booleans and exports use has the thicker wall.
    const meshVolume = (s: WorkplaneShape) => { const { vertices, faces } = meshForShape(s); return signedVolume(faces.map((face) => face.map((i) => vertices[i]) as V[])); };
    expect(meshVolume(shape)).toBeGreaterThan(meshVolume(canonicalizeShape(binShape({}))) + 100);
  });
});

describe("gridfinity lip chamfer", () => {
  // The edge tool's chamfer of c on the lip's top: c down the outer wall, c / sqrt 2 in and down the slope (0.1768 at 0.25).
  const chamfered = (c: number) => [[0, 21 + GRIDFINITY_LIP_HEIGHT - c], [c * Math.SQRT1_2, 21 + GRIDFINITY_LIP_HEIGHT - c * Math.SQRT1_2]];

  it("leaves the lip sharp unless a chamfer is set", () => {
    const sharp = gridfinityTriangles(bin());
    for (const value of [0, -0.3, Number.NaN, undefined]) expect(gridfinityTriangles(bin({ gridfinityLipChamfer: value })), `${value}`).toEqual(sharp);
    expect(gridfinityWallProfile(gridfinityPlan(bin()))[1]).toEqual([0, 21 + GRIDFINITY_LIP_HEIGHT]);
  });

  it("takes a chamfer of up to 1 mm, on a bin with the lip only", () => {
    expect(gridfinityLipChamfer(bin({ gridfinityLipChamfer: 0.25 }))).toBe(0.25);
    expect(gridfinityLipChamfer(bin({ gridfinityLipChamfer: 2 }))).toBe(MAX_GRIDFINITY_LIP_CHAMFER);
    expect(gridfinityLipChamfer(bin({ gridfinityLipChamfer: -1 }))).toBe(0);
    expect(gridfinityLipChamfer(bin())).toBe(0);
    expect(gridfinityLipChamfer(bin({ gridfinityLipChamfer: 0.123 }))).toBe(0.12);
    expect(gridfinityLipChamfer(bin({ gridfinityLipChamfer: 1e-6 }))).toBe(0);
    expect(gridfinityTriangles(bin({ gridfinityLipChamfer: 0.004 }))).toEqual(gridfinityTriangles(bin()));
    expect(gridfinityLipChamfer(bin({ gridfinityLip: false, height: 21, gridfinityLipChamfer: 0.5 }))).toBe(0);
    expect(gridfinityLipChamfer(plate({ gridfinityLipChamfer: 0.5 }))).toBe(0);
    expect(gridfinityTriangles(plate({ gridfinityLipChamfer: 0.5 }))).toEqual(gridfinityTriangles(plate()));
    expect(gridfinityTriangles(bin({ gridfinityLip: false, height: 21, gridfinityLipChamfer: 0.5 }))).toEqual(gridfinityTriangles(bin({ gridfinityLip: false, height: 21 })));
  });

  it("chamfers the lip's top as the edge tool does, and leaves the rest of the wall as it is", () => {
    for (const c of [0.25, 1]) {
      const sharp = gridfinityWallProfile(gridfinityPlan(bin()));
      const wall = gridfinityWallProfile(gridfinityPlan(bin({ gridfinityLipChamfer: c })));
      expect(wall.length).toBe(sharp.length + 1);
      expect(wall[0]).toEqual(sharp[0]);
      [0, 1].forEach((k) => wall[1 + k].forEach((n, i) => expect(n, `${c} ${k} ${i}`).toBeCloseTo(chamfered(c)[k][i], 9)));
      expect(wall.slice(3)).toEqual(sharp.slice(2));
    }
    expect(chamfered(0.25)[1][0]).toBeCloseTo(0.1768, 4);
    // The exact body is built from the sharp wall and has the chamfer cut afterwards.
    expect(gridfinityWallProfile(gridfinityPlan(bin({ gridfinityLipChamfer: 0.5 })), 0, 0)).toEqual(gridfinityWallProfile(gridfinityPlan(bin()), 0));
  });

  it("takes off the ring under the chamfer, as calculated by hand", () => {
    const plain = signedVolume(gridfinityTriangles(bin()));
    for (const c of [0.25, 1]) {
      // A triangle of c along the wall and c along the slope, c * c / (2 * sqrt 2), swept round the outline at its centroid, c / (3 * sqrt 2) in.
      const inset = c / (3 * Math.SQRT2);
      const length = 2 * (83.5 - 2 * inset + 41.5 - 2 * inset) - (8 - 2 * Math.PI) * (3.75 - inset);
      const removed = (c * c) / (2 * Math.SQRT2) * length;
      expect((plain - signedVolume(gridfinityTriangles(bin({ gridfinityLipChamfer: c })))) / removed, `${c}`).toBeCloseTo(1, 2);
    }
  });

  it("draws every chamfered bin closed and in one piece, its top lowered by the chamfer", () => {
    const front = { gridfinityOpenFront: true };
    for (const fields of [
      {},
      front,
      { gridfinityOpenLeft: true, gridfinityOpenBack: true },
      { gridfinityHalfGrid: true, width: 20.5, depth: 41.5 },
      { gridfinityMagnets: true, gridfinityScoopFront: true, gridfinityLabelBack: true },
      { gridfinityCompartmentsX: 3, gridfinityCompartmentsZ: 2, gridfinityScoopFront: true },
      { height: 7 + GRIDFINITY_LIP_HEIGHT },
    ]) {
      for (const c of [0.25, 1]) {
        const triangles = gridfinityTriangles(bin({ ...fields, gridfinityLipChamfer: c }));
        const label = `${JSON.stringify(fields)} ${c}`;
        expect(edgeProblems(triangles), label).toBe(0);
        expect(components(triangles), label).toBe(1);
        const height = ((fields as { height?: number }).height ?? 21 + GRIDFINITY_LIP_HEIGHT) - c * Math.SQRT1_2;
        expect(bounds(triangles).max[1], label).toBeCloseTo(height, 9);
      }
    }
  });

  it("keeps the chamfer through a saved project, the settings and the exact body, and refuses nonsense", async () => {
    const settings = { gridfinityLipChamfer: 0.25 };
    const shape = canonicalizeShape(binShape(settings));
    expect(workplaneShapesEqual(shape, { ...shape, gridfinityLipChamfer: 0.3 })).toBe(false);
    const save = (shapes: WorkplaneShape[]) => exportLylProject({
      projectId: "chamfer",
      projectName: "Chamfer",
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
    const [loaded] = (await importLylProject(await save([shape]))).shapes;
    expect(workplaneShapesEqual(loaded, shape)).toBe(true);
    expect(loaded).toMatchObject(settings);
    expect(sceneShape(shape)).toMatchObject(settings);
    expect(cadModifierGridfinityForShape(shape)).toMatchObject(settings);
    expect(normalizeShapeCustomizations({ gridfinity: settings }, {})).toMatchObject({ gridfinity: settings });
    expect(shapeDefaultsFromShape(shape)).toMatchObject(settings);
    const asset = toolbarShapeAssets.find((entry) => entry.kind === "gridfinity")!;
    expect(makeShapeFromAsset(asset, { x: 0, z: 0 }, settings)).toMatchObject(settings);
    await expect(importLylProject(await save([{ ...shape, gridfinityLipChamfer: "small" } as unknown as WorkplaneShape]))).rejects.toThrow("gridfinityLipChamfer must be a finite number");
    await expect(importLylProject(await save([{ ...shape, gridfinityLipChamfer: -1 }]))).rejects.toThrow("gridfinityLipChamfer is outside the supported range");
    // The mesh that booleans and exports use has the chamfer.
    const meshVolume = (s: WorkplaneShape) => { const { vertices, faces } = meshForShape(s); return signedVolume(faces.map((face) => face.map((i) => vertices[i]) as V[])); };
    expect(meshVolume(canonicalizeShape(binShape({})))).toBeGreaterThan(meshVolume(shape) + 3);
  });
});

describe("gridfinity lip chamfer on a set wall", () => {
  const top = 21;
  const lipTop = top + GRIDFINITY_LIP_HEIGHT;

  it("chamfers the lip's top the same on a thin wall and above a ledge, and leaves the wall below as it is", () => {
    for (const wall of [1.2, 3]) {
      for (const c of [0.25, 1]) {
        const label = `${wall} ${c}`;
        const sharp = gridfinityWallProfile(gridfinityPlan(bin({ gridfinityWallThickness: wall })));
        const chamfered = gridfinityWallProfile(gridfinityPlan(bin({ gridfinityWallThickness: wall, gridfinityLipChamfer: c })));
        expect(chamfered.length, label).toBe(sharp.length + 1);
        expect(chamfered[0], label).toEqual(sharp[0]);
        [[0, lipTop - c], [c * Math.SQRT1_2, lipTop - c * Math.SQRT1_2]].forEach((point, k) => point.forEach((n, i) => expect(chamfered[1 + k][i], `${label} ${k} ${i}`).toBeCloseTo(n, 9)));
        expect(chamfered.slice(3), label).toEqual(sharp.slice(2));
      }
    }
    // Above 1.75 mm the wall stops at the ledge 0.85 mm under 7 mm per height unit, under the chamfered lip.
    const ledged = gridfinityWallProfile(gridfinityPlan(bin({ gridfinityWallThickness: 3, gridfinityLipChamfer: 1 })));
    expect(ledged).toContainEqual([1.75, top - 0.85]);
    expect(ledged).toContainEqual([3, top - 0.85]);
  });

  it("draws chamfered bins with thick walls closed and in one piece, their top lowered by the chamfer", () => {
    for (const fields of [
      { gridfinityWallThickness: 4, gridfinityLipChamfer: 0.25 },
      { gridfinityWallThickness: 4, gridfinityLipChamfer: 1, gridfinityOpenFront: true },
      { gridfinityWallThickness: 2.5, gridfinityLipChamfer: 0.5, gridfinityCompartmentsX: 2, gridfinityScoopFront: true },
      { gridfinityWallThickness: 4, gridfinityLipChamfer: 1, gridfinityOpenFront: true, gridfinityCompartmentsX: 2, gridfinityCompartmentsZ: 2 },
    ]) {
      const label = JSON.stringify(fields);
      const triangles = gridfinityTriangles(bin(fields));
      expect(edgeProblems(triangles), label).toBe(0);
      expect(components(triangles), label).toBe(1);
      expect(bounds(triangles).max[1], label).toBeCloseTo(lipTop - fields.gridfinityLipChamfer * Math.SQRT1_2, 9);
    }
  });
});

describe("gridfinity partly open side", { timeout: 60_000 }, () => {
  let runtime: ManifoldToplevel;

  beforeAll(async () => {
    runtime = await manifoldModule();
    runtime.setup();
  });

  // A bin of 2 x 1 x 3 units: 83.5 x 41.5, the lip's top at 25.4, the floor at 5.95, the wall 0.95 mm.
  const front = { gridfinityOpenFront: true };
  const opening = (entry: Record<string, unknown>) => ({ ...front, gridfinityOpenings: [{ side: "front", ...entry }] });

  it("opens a switched side in full on a bin its wall makes solid, whatever opening is set", () => {
    const solid = { width: 83.5, depth: 41.5, height: 25.4, gridfinityType: "bin" as const, gridfinityLip: true, gridfinityWallThickness: 20.75, ...front };
    const set = { ...solid, gridfinityOpenings: [{ side: "front", width: 20, depth: 10 }] };
    expect(gridfinityWallSolid(set)).toBe(true);
    expect(gridfinityPlan(set).open.front).toBe(true);
    expect(gridfinityPlan(set).notches).toEqual([]);
    expect(gridfinityTriangles(set)).toEqual(gridfinityTriangles(solid));
  });

  it("never makes a bin switched open on all four sides solid, a partly open one too: its wall leaves the side open in full", () => {
    const tray = { width: 83.5, depth: 41.5, height: 25.4, gridfinityType: "bin" as const, gridfinityLip: true, gridfinityOpenBack: true, gridfinityOpenFront: true, gridfinityOpenLeft: true, gridfinityOpenRight: true, gridfinityWallThickness: 20.75 };
    const set = { ...tray, gridfinityOpenings: [{ side: "left", width: 10, depth: 10 }] };
    const plan = gridfinityPlan(set);
    expect([plan.solid, plan.floor, plan.notches]).toEqual([false, 5.95, []]);
    expect(plan.open).toEqual({ back: true, front: true, left: true, right: true });
    expect(gridfinityTriangles(set)).toEqual(gridfinityTriangles(tray));
  });

  it("opens the long side of a bin switched open on all four sides as set, its wall leaving room there", () => {
    const tray = { width: 83.5, depth: 41.5, height: 25.4, gridfinityType: "bin" as const, gridfinityLip: true, gridfinityOpenBack: true, gridfinityOpenFront: true, gridfinityOpenLeft: true, gridfinityOpenRight: true, gridfinityWallThickness: 20.75 };
    const plan = gridfinityPlan({ ...tray, gridfinityOpenings: [{ side: "front", width: 10, depth: 10 }] });
    expect([plan.solid, plan.floor]).toEqual([false, 5.95]);
    expect(plan.notches).toHaveLength(1);
    expect(plan.notches[0]).toMatchObject({ side: "front", from: -5, to: 5 });
  });

  it("shows the distance as built beside a side open in full, where the opening runs out to the outline", () => {
    // Left open: the front's straight part runs from the outline at -41.75 to the right corner at 38, 79.75 long.
    const fields = bin({ ...opening({ width: 20, depth: 10, align: "start", distance: 58 }), gridfinityOpenLeft: true });
    const [notch] = gridfinityPlan(fields).notches;
    expect(notch.from).toBeCloseTo(-41.75 + 58, 9);
    expect(gridfinityOpening(fields, "front").distance).toBe(58);
    expect(gridfinityOpeningLimits(fields, "front").distance).toBeCloseTo(59.75, 9);
    // Beyond what the side takes, both the opening and the row stop at the end.
    const far = bin({ ...opening({ width: 20, depth: 10, align: "start", distance: 70 }), gridfinityOpenLeft: true });
    expect(gridfinityPlan(far).notches[0].from).toBeCloseTo(-41.75 + 59.75, 9);
    expect(gridfinityOpening(far, "front").distance).toBeCloseTo(59.75, 9);
  });

  it("builds a bin with no opening set, or one at the full depth and the full wall, exactly as before", () => {
    expect(gridfinityPlan(bin({ gridfinityOpenings: [] }))).toEqual(gridfinityPlan(bin()));
    expect(gridfinityTriangles(bin({ gridfinityOpenings: [] }))).toEqual(gridfinityTriangles(bin()));
    for (const entry of [{}, { width: 76, depth: 19.45 }, { width: 75.6 }, { depth: 19.1 }, { align: "start", distance: 3 }]) {
      const label = JSON.stringify(entry);
      expect(gridfinityPlan(bin(opening(entry))), label).toEqual(gridfinityPlan(bin(front)));
      expect(gridfinityTriangles(bin(opening(entry))), label).toEqual(gridfinityTriangles(bin(front)));
    }
    // An entry for a side that is not open is kept and does nothing.
    expect(gridfinityPlan(bin({ gridfinityOpenings: [{ side: "front", width: 20 }] }))).toEqual(gridfinityPlan(bin()));
  });

  it("keeps a valid entry for each side once, within what a saved project takes", () => {
    expect(normalizeGridfinityOpenings(undefined)).toBeUndefined();
    expect(normalizeGridfinityOpenings([
      { side: "front", depth: 10, width: 20, align: "end", distance: 1.4 },
      { side: "front", depth: 3 },
      { side: "top", depth: 3 },
      { side: "left", depth: Number.NaN, width: "wide", align: "sideways", distance: -2 },
      null,
    ])).toEqual([{ side: "front", depth: 10, width: 20, align: "end", distance: 1.4 }, { side: "left", distance: 0 }]);
  });

  it("places an opening on the straight part of its wall, centred or from either end", () => {
    // The front wall's straight part: 83.5 less the two corners of 3.75 mm, from -38 to 38.
    expect(gridfinityPlan(bin(opening({ width: 50, depth: 10 }))).notches).toEqual([{ side: "front", from: -25, to: 25, bottom: 15.4 }]);
    expect(gridfinityPlan(bin(opening({ width: 20, depth: 10, align: "start", distance: 5 }))).notches[0]).toMatchObject({ from: -33, to: -13 });
    expect(gridfinityPlan(bin(opening({ width: 20, depth: 10, align: "end", distance: 5 }))).notches[0]).toMatchObject({ from: 13, to: 33 });
    // A distance that would run off the wall stops at its end.
    expect(gridfinityPlan(bin(opening({ width: 20, depth: 10, align: "start", distance: 100 }))).notches[0]).toMatchObject({ from: 18, to: 38 });
    // The side walls run deep: 41.5 less two corners, from -17 to 17; start is the back.
    const left = gridfinityPlan(bin({ gridfinityOpenLeft: true, gridfinityOpenings: [{ side: "left", width: 10, depth: 10, align: "start", distance: 2 }] }));
    expect(left.notches).toEqual([{ side: "left", from: -15, to: -5, bottom: 15.4 }]);
    expect(left.open.left).toBe(false);
    expect(left.switched.left).toBe(true);
  });

  it("keeps an opening within its sizes and snaps it onto the full wall, the floor and off the ledge", () => {
    const notch = (entry: Record<string, unknown>, more: Record<string, unknown> = {}) => gridfinityPlan(bin({ ...opening(entry), ...more })).notches[0];
    expect(notch({ width: 2, depth: 10 })).toMatchObject({ from: -2.5, to: 2.5 });
    expect(notch({ width: 20, depth: 1 })).toMatchObject({ bottom: 23.4 });
    // A full width with less depth lowers the wall between the corners; a full depth with less width is a slot to the floor.
    expect(notch({ depth: 10 })).toMatchObject({ from: -38, to: 38, bottom: 15.4 });
    expect(notch({ width: 20 })).toMatchObject({ from: -10, to: 10, bottom: 5.95 });
    expect(notch({ width: 20, depth: 19.2 })).toMatchObject({ bottom: 5.95 });
    // Off the ledge and dividers' top, 0.85 mm under 21, so their faces never meet the opening's bottom.
    expect(notch({ width: 20, depth: 5.25 }).bottom).toBeCloseTo(20.2, 9);
    expect(notch({ width: 20, depth: 5.28 }).bottom).toBeCloseTo(20.1, 9);
    // Measured from the lip's top after a chamfer.
    expect(notch({ width: 20, depth: 10 }, { gridfinityLipChamfer: 1 }).bottom).toBeCloseTo(25.4 - Math.SQRT1_2 - 10, 5);
    // A raised floor stops it.
    expect(notch({ width: 20, depth: 15 }, { gridfinityFloorHeight: 12 })).toMatchObject({ bottom: 12 });
  });

  it("keeps an opening off the corners, as wide as the wall is thick, and runs it to an open neighbour's edge", () => {
    expect(gridfinityPlan(bin({ ...opening({ depth: 10 }), gridfinityWallThickness: 4 })).notches[0]).toMatchObject({ from: -37.75, to: 37.75 });
    expect(gridfinityPlan(bin({ ...opening({ depth: 10 }), gridfinityOpenLeft: true })).notches[0]).toMatchObject({ from: -41.75, to: 38 });
    // No opening on a bin built solid by its wall.
    expect(gridfinityPlan(bin({ ...opening({ width: 20, depth: 10 }), gridfinityWallThickness: 20.75 })).notches).toEqual([]);
  });

  it("takes the wall's setting when a side stays partly closed, even with all four switched open", () => {
    const all = { gridfinityOpenBack: true, gridfinityOpenFront: true, gridfinityOpenLeft: true, gridfinityOpenRight: true, gridfinityWallThickness: 2 };
    expect(gridfinityPlan(bin(all)).wallThickness).toBe(0.95);
    expect(gridfinityPlan(bin({ ...all, gridfinityOpenings: [{ side: "front", width: 20 }] })).wallThickness).toBe(2);
  });

  it("leaves shelves and scoops off a side switched open, partly or fully", () => {
    const shelved = { gridfinityLabelFront: true, gridfinityLabelBack: true, gridfinityScoopFront: true };
    expect(gridfinityLabelPieces(bin({ ...opening({ width: 20, depth: 10 }), ...shelved }))!.shelves).toHaveLength(1);
    expect(gridfinityScoopPieces(bin({ ...opening({ width: 20, depth: 10 }), ...shelved }))).toBeNull();
    expect(gridfinityLabelMaxWidth(bin({ ...opening({ width: 20, depth: 10 }), ...shelved }), "back")).toBe(gridfinityLabelMaxWidth(bin({ gridfinityLabelBack: true }), "back"));
    expect(gridfinityHasPieces(bin(opening({ width: 20, depth: 10 })))).toBe(true);
    expect(gridfinityHasPieces(bin(opening({})))).toBe(false);
  });

  it("cuts the wall's own section above the opening's bottom, the floor's rounding with it", () => {
    const plan = gridfinityPlan(bin(opening({ width: 50, depth: 10 })));
    expect(gridfinityOpeningSection(plan, plan.notches[0], 0).map(([u, y]) => [Math.round(u * 1e6) / 1e6, Math.round(y * 1e6) / 1e6])).toEqual([[-2, 15.4], [0.95, 15.4], [0.95, 19.35], [2.6, 21], [1.9, 21.7], [1.9, 23.5], [0, 25.4], [0, 26.4], [-2, 26.4]]);
    const slot = gridfinityPlan(bin(opening({ width: 20 })));
    const rounded = gridfinityOpeningSection(slot, slot.notches[0], 2.8);
    expect(rounded[1][0]).toBeCloseTo(0.95 + 2.8, 9);
    expect(rounded[1][1]).toBeCloseTo(5.95, 9);
    const shallow = gridfinityPlan(bin(opening({ width: 50, depth: 5 })));
    const [, start] = gridfinityOpeningSection(shallow, shallow.notches[0], 0);
    expect(start[0]).toBeCloseTo(0.95 + (20.4 - 19.35), 9);
    expect(start[1]).toBeCloseTo(20.4, 9);
  });

  it("draws the bin again when an opening changes", () => {
    const shape = binShape(opening({ width: 20, depth: 10 }));
    const deeper = { ...shape, gridfinityOpenings: [{ side: "front" as const, width: 20, depth: 12 }] };
    expect(shapeGeometrySignature(deeper)).not.toBe(shapeGeometrySignature(shape));
    expect(tapeShapeTopologyKey(deeper)).not.toBe(tapeShapeTopologyKey(shape));
  });

  it("reads and writes one side's opening as the panel shows it", () => {
    const shape = bin(opening({ width: 20, depth: 10, align: "end", distance: 3 }));
    expect(gridfinityOpening(shape, "front")).toEqual({ depth: 10, width: 20, align: "end", distance: 3 });
    expect(gridfinityOpening(bin(front), "front")).toEqual({ depth: 19.45, width: 76, align: "middle", distance: 0 });
    expect(gridfinityOpeningLimits(shape, "front")).toEqual({ depth: { min: 2, max: 19.45 }, width: { min: 5, max: 76 }, distance: 56 });
    expect(gridfinityOpeningPatch(shape, "front", { width: 30 })).toEqual({ gridfinityOpenings: [{ side: "front", width: 30, depth: 10, align: "end", distance: 3 }] });
    expect(gridfinityOpeningPatch(bin(front), "front", { depth: 8 })).toEqual({ gridfinityOpenings: [{ side: "front", depth: 8 }] });
  });

  it("cuts every width up to half a millimetre under the largest, and the whole side from there, beside an open side too", () => {
    const beside = (width: number) => gridfinityPlan(bin({ ...opening({ width, depth: 10 }), gridfinityOpenLeft: true })).notches[0];
    const widths = Array.from({ length: 71 }, (_, index) => 5 + index).map((width) => beside(width).to - beside(width).from);
    widths.forEach((width, index) => expect(width).toBeCloseTo(5 + index, 9));
    for (const width of [75.5, 76]) expect(beside(width), String(width)).toMatchObject({ from: -41.75, to: 38 });
    expect(gridfinityOpeningLimits(bin({ ...opening({ depth: 10 }), gridfinityOpenLeft: true }), "front").width.max).toBe(76);
  });

  it("opens a side in full where its straight part has no room for the narrowest opening", () => {
    const small = bin({ width: 41.5, ...opening({ width: 10, depth: 5 }), gridfinityWallThickness: 19 });
    expect(gridfinityPlan(small).open.front).toBe(true);
    expect(gridfinityPlan(small).notches).toEqual([]);
    expect(gridfinityOpeningFits(small, "front")).toBe(false);
    expect(gridfinityOpeningFits(bin(opening({ width: 10, depth: 5 })), "front")).toBe(true);
    expect(gridfinityOpeningFits(bin(), "front")).toBe(false);
  });

  it("says why a compartment's label shelf is left out: its side open in full, or switched open", () => {
    const cellOf = (fields: Record<string, unknown>) => gridfinityCompartments(bin({ gridfinityCompartmentsX: 3, gridfinityCompartmentsZ: 2, ...fields }))!.cells.find((cell) => cell.column === 1 && cell.row === 1)!;
    expect(gridfinityCompartmentLabelLeftOut(cellOf(front), "front")).toBe("open");
    expect(gridfinityCompartmentLabelLeftOut(cellOf(opening({ width: 20, depth: 10 })), "front")).toBe("switched");
    expect(gridfinityCompartmentLabelLeftOut(cellOf(opening({ width: 20, depth: 10 })), "back")).toBeNull();
    expect(gridfinityCompartmentLabelLeftOut(cellOf({}), "front")).toBeNull();
  });

  it("keeps the openings through a saved project, the exact body and the MCP, and not as settings, and refuses nonsense", async () => {
    const openings = [{ side: "front" as const, depth: 10, width: 30, align: "end" as const, distance: 3 }, { side: "left" as const, width: 12 }];
    const shape = canonicalizeShape(binShape({ gridfinityOpenFront: true, gridfinityOpenLeft: true, gridfinityOpenings: openings }));
    const [entry, other] = openings;
    for (const change of [
      { gridfinityOpenings: [entry] },
      { gridfinityOpenings: [{ ...entry, side: "back" as const }, other] },
      { gridfinityOpenings: [{ ...entry, depth: 11 }, other] },
      { gridfinityOpenings: [{ ...entry, width: 31 }, other] },
      { gridfinityOpenings: [{ ...entry, align: "start" as const }, other] },
      { gridfinityOpenings: [{ ...entry, distance: 4 }, other] },
    ]) {
      expect(workplaneShapesEqual(shape, { ...shape, ...change }), JSON.stringify(change)).toBe(false);
    }
    expect(workplaneShapesEqual(shape, { ...shape, gridfinityOpenings: [{ ...entry }, { ...other }] })).toBe(true);
    const save = (shapes: WorkplaneShape[]) => exportLylProject({ projectId: "openings", projectName: "Openings", createdAt: 1, modifiedAt: 2, shapes, history: [editorHistoryEntry(shapes, [])], historyIndex: 0, assets: [], workspace: DEFAULT_WORKPLANE_WORKSPACE, snapGrid: DEFAULT_SNAP_GRID, placementElevation: 0 });
    const [loaded] = (await importLylProject(await save([shape]))).shapes;
    expect(workplaneShapesEqual(loaded, shape)).toBe(true);
    expect(loaded.gridfinityOpenings).toEqual(openings);
    for (const wrong of [{ gridfinityOpenings: {} }, { gridfinityOpenings: [{ side: "top" }] }, { gridfinityOpenings: [{ side: "front", depth: "deep" }] }, { gridfinityOpenings: [{ side: "front", width: -1 }] }, { gridfinityOpenings: [{ side: "front", distance: 2e6 }] }, { gridfinityOpenings: [{ side: "front", align: "left" }] }, { gridfinityOpenings: [{ side: "front" }, { side: "front" }] }, { gridfinityOpenings: Array(5).fill({ side: "front" }) }]) {
      await expect(importLylProject(await save([{ ...shape, ...wrong } as unknown as WorkplaneShape])), JSON.stringify(wrong)).rejects.toThrow();
    }
    expect(sceneShape(shape)).toMatchObject({ gridfinityOpenings: openings });
    rememberManifoldRuntime(runtime);
    expect(cadModifierGridfinityForShape(shape)).toMatchObject({ gridfinityOpenings: openings });
    // The openings belong to one bin's size, as the dividers' places do.
    expect(normalizeShapeCustomizations({ gridfinity: { gridfinityOpenings: openings } }, {}).gridfinity ?? {}).not.toHaveProperty("gridfinityOpenings");
    expect(shapeDefaultsFromShape(shape) ?? {}).not.toHaveProperty("gridfinityOpenings");
    // Through the MCP as a list or as the JSON text layerling_read_scene reports.
    expect(mcpShapeSummary(shape).settings).toMatchObject({ gridfinityOpenings: JSON.stringify(openings) });
    expect(gridfinityListPatch(mcpGridfinityListParams({ gridfinityOpenings: JSON.stringify(openings) }))).toStrictEqual({ gridfinityOpenings: openings });
    expect(gridfinityListPatch(mcpGridfinityListParams({ gridfinityOpenings: [] }))).toStrictEqual({ gridfinityOpenings: undefined });
    // What the MCP gives outside what a saved project takes is kept within it, where the bin would clamp it anyway.
    const wide = canonicalizeShape(binShape({ gridfinityOpenFront: true, ...gridfinityListPatch({ gridfinityOpenings: [{ side: "front", depth: -3, width: 2e6, align: "end", distance: -2 }] }) }));
    const [reloaded] = (await importLylProject(await save([wide]))).shapes;
    expect(workplaneShapesEqual(reloaded, wide)).toBe(true);
    expect(gridfinityPlan(reloaded).notches).toEqual(gridfinityPlan(binShape({ gridfinityOpenFront: true, gridfinityOpenings: [{ side: "front", depth: -3, width: 2e6, align: "end", distance: -2 }] })).notches);
    // The mesh that booleans and exports use has the notches.
    const meshVolume = (s: WorkplaneShape) => { const { vertices, faces } = meshForShape(s); return signedVolume(faces.map((face) => face.map((i) => vertices[i]) as V[])); };
    expect(meshVolume(shape)).toBeLessThan(meshVolume({ ...shape, gridfinityOpenFront: false, gridfinityOpenLeft: false }) - 100);
  });

  it("draws a partly open bin closed and in one piece, with the wall's volume taken out", () => {
    for (const fields of [
      opening({ width: 30, depth: 10 }),
      opening({ width: 20 }),
      { ...opening({ depth: 8 }), gridfinityWallThickness: 2.5 },
      { ...opening({ width: 20, depth: 12, align: "start", distance: 1.4 }), gridfinityWallThickness: 4, gridfinityLipChamfer: 0.5 },
      { ...opening({ width: 20 }), gridfinityCompartmentsX: 3 },
      { ...opening({ width: 20 }), gridfinityScoopBack: true },
      { ...opening({ width: 20, depth: 10 }), gridfinityLip: false, height: 21 },
      { gridfinityOpenLeft: true, gridfinityOpenings: [{ side: "left", width: 12, depth: 6 }], gridfinityHalfGrid: true, width: 20.5, depth: 41.5 },
    ]) {
      const label = JSON.stringify(fields);
      const triangles = gridfinityLabelledTriangles(runtime, bin(fields));
      expect(edgeProblems(triangles), label).toBe(0);
      expect(components(triangles), label).toBe(1);
      expect(signedVolume(triangles), label).toBeLessThan(signedVolume(gridfinityLabelledTriangles(runtime, bin({ ...fields, gridfinityOpenFront: false, gridfinityOpenLeft: false }))) - 1);
    }
  });
});

describe("gridfinity notch corners", { timeout: 60_000 }, () => {
  let runtime: ManifoldToplevel;

  beforeAll(async () => {
    runtime = await manifoldModule();
    runtime.setup();
  });

  // A bin of 2 x 1 x 3 units: the lip's top at 25.4, the floor at 5.95, the front's straight part from -38 to 38.
  const opening = (entry: Record<string, unknown>, fields: Record<string, unknown> = {}) => bin({ gridfinityOpenFront: true, gridfinityOpenings: [{ side: "front", ...entry }], ...fields });
  // What the notch follows inside: the floor's rounding (none on a plain bin, 2.8 mm on a divided or scooped one) and the compartments' edges.
  const insideOf = (fields: ReturnType<typeof bin>) => gridfinityOpeningInside(gridfinityPlan(fields), gridfinityCompartmentPieces(fields));
  const cornersOf = (fields: ReturnType<typeof bin>) => {
    const plan = gridfinityPlan(fields);
    return gridfinityOpeningCorners(plan, plan.notches[0], insideOf(fields));
  };

  it("keeps a notch's corners square unless a size is set, the same triangles as before", () => {
    const sharp = opening({ width: 20, depth: 10 });
    const plan = gridfinityPlan(sharp);
    expect(gridfinityOpeningCorners(plan, plan.notches[0], insideOf(sharp))).toEqual({ fromTop: 0, fromBottom: 0, toTop: 0, toBottom: 0 });
    expect(gridfinityOpeningOutline(plan, plan.notches[0], insideOf(sharp))).toBeNull();
    const triangles = gridfinityLabelledTriangles(runtime, sharp);
    for (const fields of [{ gridfinityOpeningCornerSize: 0 }, { gridfinityOpeningCorner: "chamfer", gridfinityOpeningCornerSize: 0 }, { gridfinityOpeningCornerSize: 0.45 }]) {
      expect(gridfinityLabelledTriangles(runtime, { ...sharp, ...fields }), JSON.stringify(fields)).toEqual(triangles);
    }
  });

  it("gives each corner the size set, at most what the notch and the wall beside it take", () => {
    expect(cornersOf(opening({ width: 20, depth: 10 }, { gridfinityOpeningCornerSize: 2 }))).toEqual({ fromTop: 2, fromBottom: 2, toTop: 2, toBottom: 2 });
    // The top corners first, as far as the depth; the bottom ones then at most half the width and what the depth leaves.
    expect(cornersOf(opening({ width: 10, depth: 10 }, { gridfinityOpeningCornerSize: 8 }))).toEqual({ fromTop: 8, fromBottom: 2, toTop: 8, toBottom: 2 });
    expect(cornersOf(opening({ width: 10, depth: 15 }, { gridfinityOpeningCornerSize: 8 }))).toEqual({ fromTop: 8, fromBottom: 5, toTop: 8, toBottom: 5 });
    // The top corners stop at the end of the straight part: 2 mm from the right corner here.
    expect(cornersOf(opening({ width: 20, depth: 10, align: "end", distance: 2 }, { gridfinityOpeningCornerSize: 3 }))).toEqual({ fromTop: 3, fromBottom: 3, toTop: 2, toBottom: 3 });
    // A wall lowered between the corners has no top corners; beside a side open in full the notch's end has none at all.
    expect(cornersOf(opening({ depth: 10 }, { gridfinityOpeningCornerSize: 2 }))).toEqual({ fromTop: 0, fromBottom: 2, toTop: 0, toBottom: 2 });
    expect(cornersOf(opening({ depth: 10 }, { gridfinityOpeningCornerSize: 2, gridfinityOpenLeft: true }))).toEqual({ fromTop: 0, fromBottom: 0, toTop: 0, toBottom: 2 });
    expect(cornersOf(opening({ width: 20, depth: 10, align: "start", distance: 1 }, { gridfinityOpeningCornerSize: 2, gridfinityOpenLeft: true }))).toEqual({ fromTop: 1, fromBottom: 2, toTop: 2, toBottom: 2 });
    // To 0.01 mm, never more than set unless what is left would be under 0.01 mm, and square under 0.5 mm.
    expect(cornersOf(opening({ width: 20, depth: 10 }, { gridfinityOpeningCornerSize: 1.237 }))).toEqual({ fromTop: 1.24, fromBottom: 1.24, toTop: 1.24, toBottom: 1.24 });
    expect(cornersOf(opening({ width: 20, depth: 10, align: "end", distance: 0.95 }, { gridfinityOpeningCornerSize: 2 }))).toMatchObject({ toTop: 0.95 });
    expect(cornersOf(opening({ width: 20, depth: 10, align: "end", distance: 0.95 }, { gridfinityOpeningCornerSize: 0.99 }))).toMatchObject({ toTop: 0.95, fromTop: 0.99 });
    expect(cornersOf(opening({ width: 20, depth: 10, align: "end", distance: 1.005 }, { gridfinityOpeningCornerSize: 1 }))).toMatchObject({ toTop: 1.005, fromTop: 1 });
    expect(cornersOf(opening({ width: 20, depth: 10, align: "end", distance: 0.45 }, { gridfinityOpeningCornerSize: 2 }))).toMatchObject({ toTop: 0 });
  });

  it("keeps a slot's top corners above the floor's rounding, which the dividers' check counts on", () => {
    // 2 height units: the lip's top at 18.4, a slot to the floor 12.45 deep, the rounding 2.8 mm.
    const low = { height: 14 + GRIDFINITY_LIP_HEIGHT, gridfinityOpeningCornerSize: 10 };
    expect(cornersOf(opening({ width: 20 }, { ...low, gridfinityCompartmentsX: 3 }))).toEqual({ fromTop: 9.65, fromBottom: 2.8, toTop: 9.65, toBottom: 2.8 });
    // Without a rounding in the section there is nothing to stay above.
    expect(cornersOf(opening({ width: 20 }, low))).toEqual({ fromTop: 10, fromBottom: 2.45, toTop: 10, toBottom: 2.45 });
  });

  it("brings a corner down 0.01 mm at a time while it would end within 0.01 mm of a crease of the wall's section", () => {
    // A scooped bin's slot to the floor: its section's rounding turns at 5.95 + 2.8 (1 - cos 56.25 degrees), 1.2444 up.
    // A corner of 1.25 ends 0.0056 over it, 1.24 0.0044 under it, 1.23 0.0144 under it.
    expect(2.8 * (1 - Math.cos((5 * Math.PI) / 16))).toBeCloseTo(1.2444, 4);
    expect(cornersOf(opening({ width: 20 }, { gridfinityScoopBack: true, gridfinityOpeningCornerSize: 1.25 }))).toMatchObject({ fromBottom: 1.23, toBottom: 1.23 });
    // Without that rounding the same corner keeps the size set.
    expect(cornersOf(opening({ width: 20 }, { gridfinityOpeningCornerSize: 1.25 }))).toMatchObject({ fromBottom: 1.25, toBottom: 1.25 });
  });

  it("brings a corner down while it would leave a sliver of wall beside the corner's seam or cross a crease just beside it", () => {
    // 1.905 mm of straight wall beside the notch's right end: all of it ends 0.005 mm under the lip's crease at 23.5
    // (25.4 - 1.9), 1.9 leaves 0.005 mm of wall, 1.89 ends 0.01 mm over the crease; 1.88 is clear of both.
    const { toTop } = cornersOf(opening({ width: 20, depth: 10, align: "end", distance: 1.905 }, { gridfinityOpeningCornerSize: 2 }));
    expect(toTop).toBe(1.88);
    // A wall lowered across a 1 x 1 bin, 16 mm from its top: its bottom corners of 10 end on the corners' seams at 17,
    // and the support's foot at 26.35 crosses them 0.05 mm under their end, 0.00013 mm from the seam; they come down
    // until it crosses 0.01 mm or more from it.
    const plan = gridfinityPlan(bin({ width: 41.5, depth: 41.5, height: 28 + GRIDFINITY_LIP_HEIGHT, gridfinityOpenFront: true, gridfinityOpenings: [{ side: "front", depth: 16 }], gridfinityOpeningCornerSize: 10 }));
    const lowered = gridfinityOpeningCorners(plan, plan.notches[0], gridfinityOpeningInside(plan, null));
    const fromBottom = lowered.fromBottom;
    expect(fromBottom).toBeLessThan(10);
    const dy = plan.notches[0].bottom + fromBottom - 26.35;
    expect(dy <= 0 || fromBottom - Math.sqrt(fromBottom ** 2 - dy ** 2) >= 0.01).toBe(true);
  });

  it("keeps a divided bin's corners at the size set, the compartments' edges not counted", () => {
    // A slot to the floor at the right end of a bin with three compartments: its bottom corner there stood square up to 3.
    for (const size of [0.5, 1, 2, 3.5]) {
      expect(cornersOf(opening({ width: 20, align: "end", distance: 0 }, { gridfinityCompartmentsX: 3, gridfinityOpeningCornerSize: size })), String(size)).toMatchObject({ toBottom: size, fromBottom: size });
    }
    // A notch as deep as a 2.5 mm wall and a chamfered lip leave: its top corners of 4 to 6 came out at 3.85.
    for (const size of [4, 5, 6]) {
      expect(cornersOf(opening({ width: 27.5, depth: 21 }, { gridfinityWallThickness: 2.5, gridfinityLipChamfer: 0.5, gridfinityCompartmentsX: 3, gridfinityOpeningCornerSize: size })), String(size)).toMatchObject({ fromTop: size, toTop: size });
    }
  });

  it("draws the outline seen from the front: the flat bottom, the ends, and out over the top", () => {
    const plan = gridfinityPlan(opening({ width: 20, depth: 10 }, { gridfinityOpeningCorner: "chamfer", gridfinityOpeningCornerSize: 2 }));
    const outline = gridfinityOpeningOutline(plan, plan.notches[0], gridfinityOpeningInside(plan, null))!;
    expect(outline.notch).toEqual({ side: "front", from: -12, to: 12, bottom: 15.4 });
    // Along the front from its start at -12; up to 2 mm over the lip's top.
    expect(outline.outline.map(([t, y]) => [Math.round(t * 1e6) / 1e6, Math.round(y * 1e6) / 1e6])).toEqual([
      [0, 27.4], [0, 25.4], [2, 23.4], [2, 17.4], [4, 15.4], [20, 15.4], [22, 17.4], [22, 23.4], [24, 25.4], [24, 27.4],
    ]);
    const round = gridfinityPlan(opening({ width: 20, depth: 10 }, { gridfinityOpeningCornerSize: 2 }));
    const arcs = gridfinityOpeningOutline(round, round.notches[0], gridfinityOpeningInside(round, null))!.outline;
    expect(arcs).toHaveLength(2 + 4 * 9);
    // Halfway round the bottom corner at the start, about its centre 2 mm in and up.
    expect(arcs.some(([t, y]) => Math.abs(t - (4 - Math.SQRT2)) < 1e-9 && Math.abs(y - (17.4 - Math.SQRT2)) < 1e-9)).toBe(true);
  });

  it("puts each corner at its own end of the outline on the back, which runs the other way", () => {
    // A back notch from 16 to 36, 2 mm from the straight part's end at 38: its top corner there takes 2 mm, at 16 3 mm.
    const fields = bin({ gridfinityOpenBack: true, gridfinityOpenings: [{ side: "back", width: 20, depth: 10, align: "end", distance: 2 }], gridfinityOpeningCornerSize: 3 });
    const plan = gridfinityPlan(fields);
    expect(gridfinityOpeningCorners(plan, plan.notches[0], gridfinityOpeningInside(plan, null))).toEqual({ fromTop: 3, fromBottom: 3, toTop: 2, toBottom: 3 });
    // The outline starts from 38 (the frame's start on the back): the 2 mm corner ends 2 along, the 3 mm one 22 along.
    const outline = gridfinityOpeningOutline(plan, plan.notches[0], gridfinityOpeningInside(plan, null))!.outline;
    const has = (t: number, y: number) => outline.some(([u, v]) => Math.abs(u - t) < 1e-9 && Math.abs(v - y) < 1e-9);
    expect(has(2, 25.4 - 2)).toBe(true);
    expect(has(22, 25.4 - 3)).toBe(true);
  });

  it("draws the outline counter-clockwise on every side, whichever way the side runs", () => {
    const area = (points: Array<[number, number]>) => points.reduce((sum, [x0, y0], i) => {
      const [x1, y1] = points[(i + 1) % points.length];
      return sum + (x0 * y1 - x1 * y0) / 2;
    }, 0);
    const areas = (["back", "front", "left", "right"] as const).map((side) => {
      const fields = bin({ ...square, [GRIDFINITY_OPEN_WALL_KEYS[side]]: true, gridfinityOpenings: [{ side, width: 20, depth: 10, align: "start", distance: 4 }], gridfinityOpeningCornerSize: 2 });
      const plan = gridfinityPlan(fields);
      return area(gridfinityOpeningOutline(plan, plan.notches[0], gridfinityOpeningInside(plan, null))!.outline);
    });
    areas.forEach((value) => expect(value).toBeGreaterThan(0));
    areas.forEach((value) => expect(value).toBeCloseTo(areas[0], 9));
  });

  it("offers a corner size up to the largest any corner takes, and shows what is set within it", () => {
    expect(gridfinityOpeningMaxCornerSize(opening({ width: 20, depth: 10 }))).toBe(10);
    expect(gridfinityOpeningMaxCornerSize(opening({ width: 6, depth: 3 }))).toBe(3);
    expect(gridfinityOpeningMaxCornerSize(opening({}))).toBe(0);
    expect(gridfinityOpeningCornerSize(opening({ width: 6, depth: 3 }, { gridfinityOpeningCornerSize: 5 }))).toBe(3);
    expect(gridfinityOpeningCornerSize(opening({ width: 20, depth: 10 }))).toBe(0);
    expect(gridfinityOpeningCornerSize(opening({ width: 20, depth: 10 }, { gridfinityOpeningCornerSize: 1.5 }))).toBe(1.5);
    // As it is built, to 0.01 mm.
    expect(gridfinityOpeningCornerSize(opening({ width: 20, depth: 10 }, { gridfinityOpeningCornerSize: 1.237 }))).toBe(1.24);
  });

  it("draws rounded and chamfered corners closed and in one piece, the notch still cut", () => {
    for (const gridfinityOpeningCorner of ["round", "chamfer"]) {
      for (const fields of [
        opening({ width: 30, depth: 10 }),
        opening({ width: 20 }),
        opening({ depth: 8 }, { gridfinityWallThickness: 2.5 }),
        opening({ width: 20, depth: 12, align: "start", distance: 1.4 }, { gridfinityWallThickness: 4, gridfinityLipChamfer: 0.5 }),
        opening({ width: 20 }, { gridfinityCompartmentsX: 3 }),
        opening({ width: 20, depth: 10 }, { gridfinityLip: false, height: 21 }),
        opening({ width: 20, depth: 10, align: "start" }, { gridfinityOpenLeft: true }),
        bin({ width: 41.5, depth: 41.5, height: 7 + GRIDFINITY_LIP_HEIGHT, gridfinityOpenFront: true, gridfinityOpenings: [{ side: "front", width: 10, depth: 2 }] }),
        bin({ gridfinityOpenLeft: true, gridfinityOpenings: [{ side: "left", width: 12, depth: 6 }], gridfinityHalfGrid: true, width: 20.5, depth: 41.5 }),
      ]) {
        const set = { ...fields, gridfinityOpeningCorner, gridfinityOpeningCornerSize: 2 };
        const label = JSON.stringify(set);
        const triangles = gridfinityLabelledTriangles(runtime, set);
        expect(edgeProblems(triangles), label).toBe(0);
        expect(components(triangles), label).toBe(1);
        expect(signedVolume(triangles), label).toBeLessThan(signedVolume(gridfinityLabelledTriangles(runtime, { ...fields, gridfinityOpenFront: false, gridfinityOpenLeft: false })) - 1);
        expect(triangles, label).not.toEqual(gridfinityLabelledTriangles(runtime, fields));
      }
    }
  });

  it("keeps the corners through a saved project, the exact body, the settings and the MCP, and refuses nonsense", async () => {
    const shape = canonicalizeShape(binShape({ gridfinityOpenFront: true, gridfinityOpenings: [{ side: "front", width: 20, depth: 10 }], gridfinityOpeningCorner: "chamfer", gridfinityOpeningCornerSize: 2 }));
    expect(workplaneShapesEqual(shape, { ...shape, gridfinityOpeningCorner: "round" })).toBe(false);
    expect(workplaneShapesEqual(shape, { ...shape, gridfinityOpeningCornerSize: 2.5 })).toBe(false);
    const save = (shapes: WorkplaneShape[]) => exportLylProject({ projectId: "corners", projectName: "Corners", createdAt: 1, modifiedAt: 2, shapes, history: [editorHistoryEntry(shapes, [])], historyIndex: 0, assets: [], workspace: DEFAULT_WORKPLANE_WORKSPACE, snapGrid: DEFAULT_SNAP_GRID, placementElevation: 0 });
    const [loaded] = (await importLylProject(await save([shape]))).shapes;
    expect(loaded).toMatchObject({ gridfinityOpeningCorner: "chamfer", gridfinityOpeningCornerSize: 2 });
    for (const wrong of [{ gridfinityOpeningCorner: "square" }, { gridfinityOpeningCornerSize: "big" }, { gridfinityOpeningCornerSize: -1 }]) {
      await expect(importLylProject(await save([{ ...shape, ...wrong } as unknown as WorkplaneShape])), JSON.stringify(wrong)).rejects.toThrow();
    }
    expect(sceneShape(shape)).toMatchObject({ gridfinityOpeningCorner: "chamfer", gridfinityOpeningCornerSize: 2 });
    rememberManifoldRuntime(runtime);
    expect(cadModifierGridfinityForShape(shape)).toMatchObject({ gridfinityOpeningCorner: "chamfer", gridfinityOpeningCornerSize: 2 });
    expect(normalizeShapeCustomizations({ gridfinity: { gridfinityOpeningCorner: "chamfer", gridfinityOpeningCornerSize: 2 } }, {}).gridfinity).toMatchObject({ gridfinityOpeningCorner: "chamfer", gridfinityOpeningCornerSize: 2 });
    expect(shapeDefaultsFromShape(shape)).toMatchObject({ gridfinityOpeningCorner: "chamfer", gridfinityOpeningCornerSize: 2 });
    expect(mcpShapeSummary(shape).settings).toMatchObject({ gridfinityOpeningCorner: "chamfer", gridfinityOpeningCornerSize: 2 });
    expect(shapeGeometrySignature(shape)).not.toBe(shapeGeometrySignature({ ...shape, gridfinityOpeningCornerSize: 3 }));
    expect(tapeShapeTopologyKey(shape)).not.toBe(tapeShapeTopologyKey({ ...shape, gridfinityOpeningCorner: "round" }));
  });
});

describe("gridfinity tray", { timeout: 60_000 }, () => {
  let runtime: ManifoldToplevel;

  beforeAll(async () => {
    runtime = await manifoldModule();
    runtime.setup();
  });

  /** A tray of 80 x 40 x 20 mm: walls of 0.95, a floor of 1.2, corners of 3.75 outside and 2.8 inside. */
  const tray = (fields: Record<string, unknown> = {}) => ({ width: 80, depth: 40, height: 20, gridfinityType: "tray" as const, ...fields });
  /** A rounded rectangle's area, and what the mesh's eight steps a quarter take off a round corner of radius r, all four. */
  const area = (w: number, d: number, r: number) => w * d - (4 - Math.PI) * r * r;
  const polygonOff = (r: number) => 4 * r * r * (Math.PI / 4 - 4 * Math.sin(Math.PI / 16));
  /** The exact volume of a tray of this size, wall and floor: the outline over its height less the inside over its depth. */
  const exact = (w: number, d: number, h: number, wall: number, floor: number) => area(w, d, 3.75) * h - area(w - 2 * wall, d - 2 * wall, Math.max(0, 3.75 - wall)) * (h - floor);
  /** The same with the mesh's polygon corners. */
  const meshed = (w: number, d: number, h: number, wall: number, floor: number) => exact(w, d, h, wall, floor) - polygonOff(3.75) * h + polygonOff(Math.max(0, 3.75 - wall)) * (h - floor);

  it("has no grid: no feet, no magnet holes and no lip, whatever is stored, and its walls stand on y = 0", () => {
    for (const fields of [{}, { gridfinityLip: true, gridfinityMagnets: true, gridfinityHalfGrid: true, gridfinityLipChamfer: 1 }]) {
      const plan = gridfinityPlan(tray(fields));
      expect(plan).toMatchObject({ type: "tray", cells: [], magnetHoles: [], lip: false, magnets: false, lipChamfer: 0, top: 20, base: 0, floor: 1.2, dividerTop: 20, size: { width: 80, depth: 40, height: 20 } });
      expect(gridfinityWallProfile(plan)[0]).toEqual([0, 0]);
    }
    expect(normalizeGridfinityType("tray")).toBe("tray");
    expect(normalizeGridfinityType("trays")).toBe("bin");
    expect(normalizeGridfinityType(undefined)).toBe("bin");
    // No grid units: one of each, as the readers that count them expect.
    expect(gridfinityUnits(tray())).toEqual({ x: 1, z: 1, y: 1 });
  });

  it("keeps a set wall on a tray switched open on all four sides with one opened only partly", () => {
    const four = { gridfinityOpenFront: true, gridfinityOpenBack: true, gridfinityOpenLeft: true, gridfinityOpenRight: true };
    expect(gridfinityPlan(tray({ ...four, gridfinityOpenings: [{ side: "front", width: 30, depth: 8 }], gridfinityWallThickness: 2 })).wallThickness).toBe(2);
  });

  it("is closed, wound outwards and one piece, open on a side or all four, with compartments, scoops, shelves, a thick wall or solid", () => {
    for (const fields of [
      {},
      { gridfinityOpenFront: true },
      { gridfinityOpenLeft: true, gridfinityOpenBack: true },
      { gridfinityOpenBack: true, gridfinityOpenFront: true, gridfinityOpenLeft: true, gridfinityOpenRight: true },
      { gridfinityScoopBack: true, gridfinityScoopFront: true, gridfinityScoopLeft: true, gridfinityScoopRight: true },
      { gridfinityCompartmentsX: 3, gridfinityCompartmentsZ: 2 },
      { gridfinityCompartmentsX: 3, gridfinityCompartmentsZ: 2, gridfinityScoopFront: true, gridfinityCompartmentLabels: [{ column: 0, row: 0, side: "back" }] },
      { gridfinityLabelBack: true },
      { gridfinityLabelBack: true, gridfinityLabelLeft: true, gridfinityOpenFront: true },
      { gridfinityWallThickness: 2 },
      { gridfinityWallThickness: 5, gridfinityCompartmentsX: 2 },
      { gridfinityFloorHeight: 8, gridfinityScoopFront: true },
      { gridfinityFloorHeight: 20 },
      { gridfinityOpenFront: true, gridfinityOpenings: [{ side: "front", width: 30, depth: 8 }] },
      { gridfinityOpenFront: true, gridfinityOpenLeft: true, gridfinityOpenings: [{ side: "front", width: 20, depth: 8, align: "end" }, { side: "left", width: 10 }], gridfinityOpeningCornerSize: 2 },
      { width: 10, depth: 10, height: 3 },
      { width: 252, depth: 252, height: 140, gridfinityCompartmentsX: 8, gridfinityCompartmentsZ: 5 },
    ]) {
      const label = JSON.stringify(fields);
      for (const triangles of [gridfinityTriangles(tray(fields)), gridfinityLabelledTriangles(runtime, tray(fields))]) {
        expect(edgeProblems(triangles), label).toBe(0);
        expect(signedVolume(triangles), label).toBeGreaterThan(0);
        expect(components(triangles), label).toBe(1);
      }
    }
  });

  it("stands on y = 0 and fills its box exactly", () => {
    for (const [w, d, h] of [[80, 40, 20], [92.5, 31.2, 7.3], [10, 10, 3], [252, 252, 140]]) {
      const { min, max } = bounds(gridfinityTriangles(tray({ width: w, depth: d, height: h })));
      [min[0] + w / 2, max[0] - w / 2, min[1], max[1] - h, min[2] + d / 2, max[2] - d / 2].forEach((v) => expect(Math.abs(v), `${w} ${d} ${h}`).toBeLessThan(1e-9));
    }
  });

  it("holds the volume of its walls and floor: the outline over its height less the inside over its depth", () => {
    expect(exact(80, 40, 20, 0.95, 1.2)).toBeCloseTo(7943.63, 2);
    expect(signedVolume(gridfinityTriangles(tray()))).toBeCloseTo(meshed(80, 40, 20, 0.95, 1.2), 6);
    expect(signedVolume(gridfinityTriangles(tray()))).toBeCloseTo(7940.93, 2);
    expect(signedVolume(gridfinityTriangles(tray({ gridfinityWallThickness: 2 })))).toBeCloseTo(meshed(80, 40, 20, 2, 1.2), 6);
    expect(signedVolume(gridfinityTriangles(tray({ gridfinityFloorHeight: 5 })))).toBeCloseTo(meshed(80, 40, 20, 0.95, 5), 6);
  });

  it("has a flat bottom: one face down at y = 0 over the whole outline", () => {
    const triangles = gridfinityTriangles(tray());
    const bottom = triangles.filter((t) => t.every((v) => Math.abs(v[1]) < 1e-9));
    // Each faces down, and together they cover the outline drawn with the mesh's corners.
    const down = bottom.map(([a, b, c]) => ((b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2])) / 2);
    down.forEach((y) => expect(y).toBeLessThan(0));
    expect(-down.reduce((sum, y) => sum + y, 0)).toBeCloseTo(area(80, 40, 3.75) - polygonOff(3.75), 6);
    // Halfway up a line across it crosses the outer and the inner wall on each side, and nothing else.
    const across = crossings(triangles, 10);
    expect(across).toHaveLength(4);
    [-40, -39.05, 39.05, 40].forEach((x, i) => expect(across[i]).toBeCloseTo(x, 9));
  });

  it("keeps its size in mm and only clamps it to 10 to 252 mm across and deep and 3 to 140 mm high", () => {
    expect(gridfinityFootprintPatch(tray({ width: 80.3, depth: 40.7, height: 20.2 }))).toEqual({ width: 80.3, depth: 40.7, height: 20.2 });
    expect(gridfinityFootprintPatch(tray({ width: 5, depth: 400, height: 1 }))).toEqual({ width: 10, depth: 252, height: 3 });
    expect(gridfinityFootprintPatch(tray({ height: 200 }))).toEqual({ width: 80, depth: 40, height: 140 });
  });

  it("keeps the box when a bin becomes a tray, and reads a tray on the grid when it becomes a bin or a baseplate", () => {
    expect(gridfinityShapePatch(bin(), { type: "tray" })).toMatchObject({ gridfinityType: "tray", width: 83.5, depth: 41.5, height: 21 + GRIDFINITY_LIP_HEIGHT });
    // A baseplate keeps no height: turned into a tray it gets the tray's 20 mm.
    expect(gridfinityShapePatch(plate(), { type: "tray" })).toMatchObject({ gridfinityType: "tray", width: 84, depth: 42, height: 20 });
    // 100.5 / 42 is 2.39 units, 50.5 / 42 is 1.2, and (30 - 2.2) / 7 is 3.97 height units.
    const big = tray({ width: 100, depth: 50, height: 30 });
    expect(gridfinityShapePatch(big, { type: "bin" })).toMatchObject({ gridfinityType: "bin", width: 83.5, depth: 41.5, height: 28 + GRIDFINITY_LIP_HEIGHT });
    expect(gridfinityShapePatch(big, { type: "baseplate" })).toMatchObject({ gridfinityType: "baseplate", width: 84, depth: 42, height: 5 });
    expect(gridfinityShapePatch(tray(), { type: "tray" })).toMatchObject({ width: 80, depth: 40, height: 20 });
  });

  it("takes its floor from 1.2 mm up to the top, where it is a solid block", () => {
    expect(gridfinityFloorMinHeight(tray())).toBe(1.2);
    expect(gridfinityFloorMinHeight(bin())).toBeCloseTo(5.95, 9);
    expect(gridfinityFloorMaxHeight(tray())).toBe(20);
    expect(gridfinityFloorFits(tray())).toBe(true);
    expect(gridfinityFloorHeight(tray({ gridfinityFloorHeight: 19.97 }))).toBe(20);
    expect(gridfinityFloorHeight(tray({ gridfinityFloorHeight: 0.5 }))).toBe(1.2);
    expect(gridfinityFloorHeight(tray({ gridfinityFloorHeight: 7 }))).toBe(7);
    // Solid: the outline over the whole height.
    expect(signedVolume(gridfinityTriangles(tray({ gridfinityFloorHeight: 20 })))).toBeCloseTo((area(80, 40, 3.75) - polygonOff(3.75)) * 20, 6);
  });

  it("takes the bin's settings for walls, shelves, scoops and compartments, with no grid to count them by", () => {
    expect(gridfinityWallMaxThickness(tray())).toBe(20);
    // The shelf's underside ends 0.5 mm above the floor from the top: (20 - 1.2 - 1.2 - 0.5) / tan 36 degrees.
    expect(gridfinityLabelFits(tray())).toBe(true);
    expect(gridfinityLabelMaxWidth(tray({ gridfinityLabelBack: true }), "back")).toBeCloseTo((20 - 1.2 - 1.2 - 0.5) / Math.tan((36 * Math.PI) / 180), 9);
    expect(gridfinityLabelMaxWidth(tray({ gridfinityLabelBack: true }), "back")).toBeCloseTo(23.54, 2);
    // At 5 mm there is room for (5 - 2.9) / tan 36 = 2.89 mm of shelf, under the 4 mm one.
    expect(gridfinityLabelFits(tray({ height: 5 }))).toBe(false);
    // Half the depth from the floor to the top.
    expect(gridfinityScoopRadius(tray({ gridfinityScoopFront: true }))).toBeCloseTo(9.4, 9);
    // Dividers stand at least 3 mm above the floor, up to the top.
    expect(gridfinityDividerFits(tray({ height: 4.2 }))).toBe(true);
    expect(gridfinityDividerFits(tray({ height: 4.1 }))).toBe(false);
    expect(gridfinityDividerFits(tray({ height: 5 }))).toBe(true);
    // Only the 6 mm a compartment and the 40 in all: (78.1 + 1.2) / 7.2 is 11 across, (38.1 + 1.2) / 7.2 is 5 deep.
    expect(gridfinityCompartmentMax(tray(), "x")).toBe(11);
    expect(gridfinityCompartmentMax(tray(), "z")).toBe(5);
    expect(gridfinityCompartmentMax(tray({ gridfinityCompartmentsZ: 5 }), "x")).toBe(8);
    expect(gridfinityCompartmentCount(tray({ gridfinityCompartmentsX: 30 }), "x")).toBe(11);
  });

  it("runs its dividers and shelves up to the top, where a bin's stop 0.85 mm under it", () => {
    expect(gridfinityCompartmentPieces(tray({ gridfinityCompartmentsX: 3, gridfinityCompartmentsZ: 2 }))!.top).toBe(20);
    expect(gridfinityLabelPieces(tray({ gridfinityLabelBack: true }))!.top).toBe(20);
    expect(gridfinityCompartmentPieces(bin({ gridfinityCompartmentsX: 3 }))!.top).toBeCloseTo(21 - 0.85, 9);
    expect(gridfinityLabelPieces(bin({ gridfinityLabelBack: true }))!.top).toBeCloseTo(21 - 0.85, 9);
    // The dividers reach the tray's top: a line across at 19.9 mm crosses them and the walls.
    const triangles = gridfinityLabelledTriangles(runtime, tray({ gridfinityCompartmentsX: 3 }));
    expect(crossings(triangles, 19.9)).toHaveLength(8);
    expect(bounds(triangles).max[1]).toBeCloseTo(20, 9);
  });

  it("takes its partial openings from its own top, as a bin without the lip", () => {
    const plan = gridfinityPlan(tray({ gridfinityOpenFront: true, gridfinityOpenings: [{ side: "front", width: 30, depth: 8 }] }));
    expect(plan.notches).toEqual([{ side: "front", from: -15, to: 15, bottom: 12 }]);
    expect(gridfinityOpeningFits(tray({ gridfinityOpenFront: true }), "front")).toBe(true);
  });

  it("keeps a tray through a saved project, a new shape, the settings, the exact body and the MCP, and refuses an unknown type", async () => {
    const asset = toolbarShapeAssets.find((entry) => entry.kind === "gridfinity")!;
    expect(makeShapeFromAsset(asset, { x: 0, z: 0 }, { gridfinityType: "tray" })).toMatchObject({ gridfinityType: "tray", width: 80, depth: 40, height: 20 });
    expect(makeShapeFromAsset(asset, { x: 0, z: 0 }, { gridfinityType: "tray", width: 92.5 })).toMatchObject({ gridfinityType: "tray", width: 92.5, depth: 40, height: 20 });
    const shape = canonicalizeShape(binShape({ gridfinityType: "tray", width: 92.5, depth: 31.2, height: 17.3 }));
    expect(shape).toMatchObject({ width: 92.5, depth: 31.2, height: 17.3 });
    expect(canonicalizeShape({ ...shape, width: 500 })).toMatchObject({ width: 252 });
    const save = (shapes: WorkplaneShape[]) => exportLylProject({ projectId: "tray", projectName: "Tray", createdAt: 1, modifiedAt: 2, shapes, history: [editorHistoryEntry(shapes, [])], historyIndex: 0, assets: [], workspace: DEFAULT_WORKPLANE_WORKSPACE, snapGrid: DEFAULT_SNAP_GRID, placementElevation: 0 });
    const [loaded] = (await importLylProject(await save([shape]))).shapes;
    expect(workplaneShapesEqual(loaded, shape)).toBe(true);
    await expect(importLylProject(await save([{ ...shape, gridfinityType: "trays" } as unknown as WorkplaneShape]))).rejects.toThrow("gridfinityType is invalid");
    expect(normalizeShapeCustomizations({ gridfinity: { gridfinityType: "tray" } }, {}).gridfinity).toMatchObject({ gridfinityType: "tray" });
    expect(shapeDefaultsFromShape(shape)).toMatchObject({ gridfinityType: "tray" });
    expect(mcpShapeSummary(shape).settings).toMatchObject({ gridfinityType: "tray" });
    expect(cadModifierGridfinityForShape(shape)).toMatchObject({ gridfinityType: "tray", width: 92.5, depth: 31.2, height: 17.3 });
    // A padded baseplate turned into a tray through the MCP keeps its box across and deep, and its padding for later.
    const padded = canonicalizeShape(binShape({ gridfinityType: "baseplate", width: 94, depth: 42, height: 5, gridfinityPaddingLeft: 10 }));
    expect(mcpGridfinityPaddingPatch(padded, { gridfinityType: "tray" }, { gridfinityType: "tray" })).toMatchObject({ width: 94, depth: 42 });
    expect(canonicalizeShape({ ...padded, gridfinityType: "tray" })).toMatchObject({ width: 94, depth: 42, height: 5, gridfinityPaddingLeft: 10 });
  });
});

describe("gridfinity large plate", () => {
  const wide = (fields: Record<string, unknown> = {}) => plate({ width: 252, depth: 252, ...fields });
  const large = (fields: Record<string, unknown> = {}) => wide({ gridfinityLargePlate: true, ...fields });
  const plateShape = (fields: Record<string, unknown> = {}) => binShape(wide(fields));

  it("lets a baseplate have up to 12 units with the switch on, 6 without, and keeps a bin at 6", () => {
    expect(gridfinityMaxUnits(wide())).toBe(6);
    expect(gridfinityMaxUnits(large())).toBe(12);
    expect(gridfinityMaxUnits({ gridfinityType: "bin", gridfinityLargePlate: true })).toBe(6);
  });

  it("reads a plate's box as up to 12 units with the switch, the padding outside them", () => {
    expect(gridfinityFootprintPatch(wide({ width: 1000, depth: 1000 }))).toMatchObject({ width: 252, depth: 252 });
    expect(gridfinityFootprintPatch(large({ width: 1000, depth: 1000 }))).toEqual({ width: 504, depth: 504, height: 5 });
    // (1000 - 82) / 42 is more than 12: 12 units and the 82 mm of padding.
    expect(gridfinityFootprintPatch(large({ width: 1000, gridfinityPaddingLeft: 41, gridfinityPaddingRight: 41 }))).toMatchObject({ width: 586 });
  });

  it("clamps the units to the switch, and switching it off brings a large plate back to 6 units, its padding kept", () => {
    expect(gridfinityShapePatch(large(), { x: 13 })).toMatchObject({ width: 504 });
    expect(gridfinityShapePatch(large(), { x: 7 })).toMatchObject({ width: 294 });
    expect(gridfinityShapePatch(wide(), { largePlate: true })).toEqual({ gridfinityType: "baseplate", gridfinityLip: true, gridfinityLargePlate: true, width: 252, depth: 252, height: 5 });
    // 10 x 8 units and 5 mm and 3 mm of padding a side.
    const padded = large({ width: 430, depth: 342, gridfinityPaddingLeft: 5, gridfinityPaddingRight: 5, gridfinityPaddingBack: 3, gridfinityPaddingFront: 3 });
    expect(gridfinityShapePatch(padded, { largePlate: false })).toMatchObject({ gridfinityLargePlate: false, width: 262, depth: 258 });
    // A large plate turned into a bin is a bin of at most 6 units; it keeps the switch for when it is a baseplate again.
    const asBin = gridfinityShapePatch(large({ width: 420 }), { type: "bin" });
    expect(asBin).toMatchObject({ gridfinityType: "bin", width: 251.5 });
    expect(asBin).not.toHaveProperty("gridfinityLargePlate");
  });

  it("fits a large plate to a drawer of up to 12 units and 41 mm a side", () => {
    expect(gridfinityDrawerMax(wide())).toBe(334.5);
    expect(gridfinityDrawerMax(large())).toBe(586.5);
    expect(gridfinityDrawerPatch(large(), "x", 586.5)).toEqual({ gridfinityPaddingLeft: 41, gridfinityPaddingRight: 41, width: 586, depth: 252 });
    expect(gridfinityDrawerPatch(large(), "x", 546.5)).toEqual({ gridfinityPaddingLeft: 21, gridfinityPaddingRight: 21, width: 546, depth: 252 });
    expect(gridfinityDrawerPatch(large(), "x", 560)).toEqual({ gridfinityPaddingLeft: 27.75, gridfinityPaddingRight: 27.75, width: 559.5, depth: 252 });
    expect(gridfinityDrawerPatch(wide(), "x", 700)).toEqual({ gridfinityPaddingLeft: 41, gridfinityPaddingRight: 41, width: 334, depth: 252 });
  });

  it("builds a 12 x 12 plate: 144 sockets, closed, wound outwards and one piece, the editor's mesh as wide", () => {
    const part = large({ width: 504, depth: 504 });
    const plan = gridfinityPlan(part);
    expect(plan.count).toMatchObject({ x: 12, z: 12 });
    const triangles = gridfinityTriangles(part);
    expect(edgeProblems(triangles)).toBe(0);
    expect(signedVolume(triangles)).toBeGreaterThan(0);
    expect(components(triangles)).toBe(1);
    const mesh = meshForShape(canonicalizeShape(plateShape({ gridfinityLargePlate: true, width: 504, depth: 504 })));
    const xs = mesh.vertices.reduce((range, [x]) => ({ min: Math.min(range.min, x), max: Math.max(range.max, x) }), { min: Infinity, max: -Infinity });
    expect(xs.min).toBeCloseTo(-252, 6);
    expect(xs.max).toBeCloseTo(252, 6);
  });

  it("carries the switch to every place that builds or keeps the plate", async () => {
    const shape = canonicalizeShape(plateShape({ gridfinityLargePlate: true, width: 420, depth: 420 }));
    expect(shape).toMatchObject({ width: 420, depth: 420, gridfinityLargePlate: true });
    expect(canonicalizeShape(plateShape({ width: 420, depth: 420 }))).toMatchObject({ width: 252, depth: 252 });
    expect(workplaneShapesEqual(shape, { ...shape, gridfinityLargePlate: false })).toBe(false);
    expect(shapeGeometrySignature(shape)).not.toBe(shapeGeometrySignature({ ...shape, gridfinityLargePlate: false }));
    expect(tapeShapeTopologyKey(shape)).not.toBe(tapeShapeTopologyKey({ ...shape, gridfinityLargePlate: false }));
    // The viewport draws all ten units, not six in a box of ten.
    const drawn = new THREE.Box3().setFromObject(createShapeObject(shape, false, undefined, false));
    expect(drawn.max.x - drawn.min.x).toBeCloseTo(420, 3);
    expect(drawn.max.z - drawn.min.z).toBeCloseTo(420, 3);
    const part = cadModifierGridfinityForShape(shape)!;
    expect(part).toMatchObject({ gridfinityLargePlate: true, width: 420 });
    expect(gridfinityPlan(part).count).toMatchObject({ x: 10, z: 10 });
    expect(sceneShape(shape)).toMatchObject({ gridfinityLargePlate: true });
    expect(mcpShapeSummary(shape)).toMatchObject({ settings: { gridfinityLargePlate: true } });
    expect(normalizeShapeCustomizations({ gridfinity: { gridfinityLargePlate: true } }, {})).toMatchObject({ gridfinity: { gridfinityLargePlate: true } });
    expect(shapeDefaultsFromShape(shape)).toMatchObject({ gridfinityLargePlate: true });
    const asset = toolbarShapeAssets.find((entry) => entry.kind === "gridfinity")!;
    expect(canonicalizeShape(makeShapeFromAsset(asset, { x: 0, z: 0 }, { gridfinityType: "baseplate", gridfinityLargePlate: true, width: 504, depth: 504 }))).toMatchObject({ width: 504, depth: 504 });
    const save = (shapes: WorkplaneShape[]) => exportLylProject({ projectId: "large-plate", projectName: "Large plate", createdAt: 1, modifiedAt: 2, shapes, history: [editorHistoryEntry(shapes, [])], historyIndex: 0, assets: [], workspace: DEFAULT_WORKPLANE_WORKSPACE, snapGrid: DEFAULT_SNAP_GRID, placementElevation: 0 });
    const [loaded] = (await importLylProject(await save([shape]))).shapes;
    expect(loaded).toMatchObject({ width: 420, depth: 420, gridfinityLargePlate: true });
    // The same file without the switch opens as a plate of 6 units.
    const [plain] = (await importLylProject(await save([{ ...shape, gridfinityLargePlate: undefined }]))).shapes;
    expect(plain).toMatchObject({ width: 252, depth: 252 });
    await expect(importLylProject(await save([{ ...shape, gridfinityLargePlate: "yes" } as unknown as WorkplaneShape]))).rejects.toThrow("gridfinityLargePlate must be true or false");
  });
});

/*
 * A Gridfinity baseplate fitted into a drawn outline (Discussion #1061): whole
 * 42 mm cells wholly inside it, the rest solid. The outline is stored centred on
 * its bounds and stretched to the plate's box, as a sketch body is.
 */
describe("gridfinity outline", () => {
  type Point = { x: number; z: number };
  const rectangle = (width: number, depth: number): Point[] => [
    { x: -width / 2, z: -depth / 2 },
    { x: width / 2, z: -depth / 2 },
    { x: width / 2, z: depth / 2 },
    { x: -width / 2, z: depth / 2 },
  ];
  /** A square of side 2 * half with its corners rounded by radius, sampled every degree. */
  const roundedSquare = (half: number, radius: number): Point[] => {
    const points: Point[] = [];
    const corners = [
      { x: half - radius, z: -(half - radius), from: -90 },
      { x: half - radius, z: half - radius, from: 0 },
      { x: -(half - radius), z: half - radius, from: 90 },
      { x: -(half - radius), z: -(half - radius), from: 180 },
    ];
    corners.forEach(({ x, z, from }) => {
      for (let a = 0; a <= 90; a += 1) points.push({ x: x + radius * Math.cos(((from + a) * Math.PI) / 180), z: z + radius * Math.sin(((from + a) * Math.PI) / 180) });
    });
    return points;
  };
  const circle = (radius: number, count: number): Point[] => Array.from({ length: count }, (_, i) => ({ x: radius * Math.cos((2 * Math.PI * i) / count), z: radius * Math.sin((2 * Math.PI * i) / count) }));
  /** An L of 168 mm with a quarter cut away: twelve cells. */
  const l = [{ x: -84, z: -84 }, { x: 84, z: -84 }, { x: 84, z: 0 }, { x: 0, z: 0 }, { x: 0, z: 84 }, { x: -84, z: 84 }];
  const outlined = (outline: Point[], fields: Record<string, unknown> = {}) => {
    const xs = outline.map((p) => p.x);
    const zs = outline.map((p) => p.z);
    return { width: Math.max(...xs) - Math.min(...xs), depth: Math.max(...zs) - Math.min(...zs), height: 5, gridfinityType: "baseplate" as const, gridfinityOutline: outline, ...fields };
  };
  const columns = (cells: Point[]) => [...new Set(cells.map((c) => c.x))].sort((a, b) => a - b);
  const rows = (cells: Point[]) => [...new Set(cells.map((c) => c.z))].sort((a, b) => a - b);

  it("keeps an outline of at least three finite points, to 0.01 mm, always the same way round", () => {
    expect(normalizeGridfinityOutline(undefined)).toBeUndefined();
    expect(normalizeGridfinityOutline("square")).toBeUndefined();
    expect(normalizeGridfinityOutline([{ x: 0, z: 0 }, { x: 10, z: 0 }])).toBeUndefined();
    expect(normalizeGridfinityOutline([{ x: 0, z: 0 }, { x: Number.NaN, z: 1 }, { x: 10, z: 0 }, { x: 10, z: 10 }])).toEqual([{ x: 0, z: 0 }, { x: 10, z: 0 }, { x: 10, z: 10 }]);
    expect(normalizeGridfinityOutline([{ x: 0.123, z: 0 }, { x: 10, z: 0 }, { x: 10, z: 10.006 }])).toEqual([{ x: 0.12, z: 0 }, { x: 10, z: 0 }, { x: 10, z: 10.01 }]);
    // The same square drawn the other way round is stored the same way round.
    const square = [{ x: 0, z: 0 }, { x: 10, z: 0 }, { x: 10, z: 10 }, { x: 0, z: 10 }];
    expect(normalizeGridfinityOutline([...square].reverse())).toEqual(normalizeGridfinityOutline(square));
    // A point repeated in a row counts once.
    expect(normalizeGridfinityOutline([{ x: 0, z: 0 }, { x: 0, z: 0 }, { x: 10, z: 0 }, { x: 10, z: 10 }])).toHaveLength(3);
  });

  it("allows an outline the size of the largest drawer one plate fits: 6 units and 41 mm a side", () => {
    expect(gridfinityOutlineLimit({ gridfinityType: "baseplate" })).toBe(334);
  });

  it("fills a drawn rectangle with as many whole cells as fit, centred, as the drawer fit does", () => {
    // 252 mm: 6 cells between the grid's lines; 251.97 leaves no room for the outer ones, so 5 on its lines.
    expect(gridfinityOutlineCells(rectangle(252, 252), 6)).toHaveLength(36);
    expect(columns(gridfinityOutlineCells(rectangle(252, 252), 6))).toEqual([-105, -63, -21, 21, 63, 105]);
    expect(columns(gridfinityOutlineCells(rectangle(251.97, 251.97), 6))).toEqual([-84, -42, 0, 42, 84]);
    // The outline is kept to 0.01 mm, and a curve straightened leaves a side that much aslant: a drawer of whole cells keeps them.
    expect(gridfinityOutlineCells([{ x: -84, z: -63 }, { x: 84, z: -62.99 }, { x: 84, z: 63 }, { x: -84, z: 63 }], 6)).toHaveLength(12);
    // 304.5 mm (the drawer of #1100, 305 mm wide, less 0.25 mm a side) would take 7 across; one plate stops at 6.
    const drawer = gridfinityOutlineCells(rectangle(304.5, 334), 6);
    expect(columns(drawer)).toEqual([-105, -63, -21, 21, 63, 105]);
    expect(rows(drawer)).toEqual([-105, -63, -21, 21, 63, 105]);
    // 334 fits 7 cells on the grid's lines and 6 between them: the 6 that sit in the middle, as the drawer fit's 6 units and 41 mm a side.
    expect(columns(gridfinityOutlineCells(rectangle(334, 84), 6))).toEqual([-105, -63, -21, 21, 63, 105]);
  });

  it("takes only the cells wholly inside an L shape", () => {
    const cells = gridfinityOutlineCells(l, 6);
    expect(cells).toHaveLength(12);
    expect(cells.every((c) => c.z < 0 || c.x < 0)).toBe(true);
  });

  it("keeps equal borders on opposite sides of the places that hold as many cells, as a drawer fit does", () => {
    // An L of 200 x 170 with a 90 x 80 notch: 16 mm left and right and 1 mm front and back, as extrabold.tools centres it.
    const wide = [{ x: -100, z: -85 }, { x: 100, z: -85 }, { x: 100, z: 5 }, { x: 10, z: 5 }, { x: 10, z: 85 }, { x: -100, z: 85 }];
    const placed = gridfinityOutlineCells(wide, 6);
    expect(placed).toHaveLength(12);
    expect(Math.min(...columns(placed)) - 21 + 100).toBeCloseTo(16, 6);
    expect(100 - Math.max(...columns(placed)) - 21).toBeCloseTo(16, 6);
    expect(Math.min(...rows(placed)) - 21 + 85).toBeCloseTo(1, 6);
    expect(85 - Math.max(...rows(placed)) - 21).toBeCloseTo(1, 6);
  });

  it("puts the grid against the outline's straight sides when that holds more cells", () => {
    // An L of 200 mm with arms 84.3 mm wide, two cells and 0.3 mm: only a cell against the inside corner leaves room for 12.
    const wide = [{ x: -100, z: -100 }, { x: 100, z: -100 }, { x: 100, z: -15.7 }, { x: -15.7, z: -15.7 }, { x: -15.7, z: 100 }, { x: -100, z: 100 }];
    expect(gridfinityOutlineCells(wide, 6)).toHaveLength(12);
    // A round drawer 160 mm across has no straight side: 7 cells with the grid 12 mm off its middle, 6 on it.
    expect(gridfinityOutlineCells(circle(80, 96), 6)).toHaveLength(7);
    // Nor a turned one: 200 x 120 turned by 30 degrees holds 7.
    const turned = rectangle(200, 120).map((p) => ({ x: p.x * Math.cos(Math.PI / 6) - p.z * Math.sin(Math.PI / 6), z: p.x * Math.sin(Math.PI / 6) + p.z * Math.cos(Math.PI / 6) }));
    expect(gridfinityOutlineCells(turned, 6)).toHaveLength(7);
    expect(gridfinityOutlineCells(circle(290, 1000), 12).length).toBeGreaterThan(100);
  });

  it("keeps a cell whose socket's rounded corner the outline's corner leaves room for, and no other", () => {
    expect(gridfinityOutlineCells(rectangle(42, 42), 6)).toHaveLength(1);
    // A drawn arc arrives as short straight pieces inside it: the socket's own corner fits within the hundredth an outline is kept to.
    expect(gridfinityOutlineCells(roundedSquare(20.98, 4), 6)).toHaveLength(0);
    expect(gridfinityOutlineCells(roundedSquare(21, 4), 6)).toHaveLength(1);
    // A corner rounded more than the socket's 4 mm cuts into it.
    expect(gridfinityOutlineCells(roundedSquare(21, 5), 6)).toHaveLength(0);
  });

  it("takes no cell in an outline smaller than one, which lies wholly within a socket and touches none of its sides", () => {
    expect(gridfinityOutlineCells(rectangle(4.5, 4.5), 6)).toHaveLength(0);
    expect(gridfinityOutlineCells(rectangle(25, 25), 6)).toHaveLength(0);
    expect(gridfinityOutlineCells([{ x: -10, z: -8 }, { x: 10, z: -8 }, { x: 0, z: 12 }], 6)).toHaveLength(0);
  });

  it("stretches the stored outline to the plate's box", () => {
    const stored = rectangle(84, 42);
    expect(gridfinityOutlinePoints({ width: 168, depth: 84, gridfinityOutline: stored })).toEqual(rectangle(168, 84));
  });

  it("plans an outline plate with its own cells and box, and leaves a plate without one as it was", () => {
    const plan = gridfinityPlan(outlined(l));
    expect(plan.size).toEqual({ width: 168, depth: 168, height: 5 });
    expect(plan.cells).toHaveLength(12);
    expect(plan.outline).toEqual(l);
    // The same stored outline at another size has the cells of that size, and back again.
    const stored = rectangle(84, 84);
    const at = (size: number) => gridfinityPlan({ width: size, depth: size, height: 5, gridfinityType: "baseplate", gridfinityOutline: stored }).cells;
    expect(at(84)).toHaveLength(4);
    expect(at(168)).toHaveLength(16);
    expect(at(84)).toHaveLength(4);
    // Too small for one cell: a plain slab.
    expect(gridfinityPlan(outlined(rectangle(40, 40))).cells).toHaveLength(0);
    const rect = { width: 252, depth: 84, height: 5, gridfinityType: "baseplate" as const };
    expect(gridfinityPlan({ ...rect, gridfinityOutline: undefined })).toEqual(gridfinityPlan(rect));
    expect(gridfinityPlan(rect).outline).toBeNull();
  });

  it("keeps an outline plate's box as it is, within the largest drawer and the smallest tray", () => {
    expect(gridfinityFootprintPatch(outlined(rectangle(300, 100)))).toEqual({ width: 300, depth: 100, height: 5 });
    expect(gridfinityFootprintPatch({ ...outlined(rectangle(300, 100)), width: 400, depth: 4 })).toEqual({ width: 334, depth: 10, height: 5 });
  });

  it("draws an outline plate as a plain slab until Manifold cuts its sockets", () => {
    expect(gridfinityHasPieces(outlined(l))).toBe(true);
    const slab = gridfinityTriangles(outlined(l));
    expect(edgeProblems(slab)).toBe(0);
    expect(signedVolume(slab)).toBeCloseTo((168 * 168 - 84 * 84) * 5, 6);
    expect(components(slab)).toBe(1);
    // Kept to 0.01 mm, a fine curve has points on a line, which would leave holes in the slab's caps.
    expect(normalizeGridfinityOutline(circle(290, 1000))!.length).toBeLessThan(1000);
    expect(edgeProblems(gridfinityTriangles(outlined(circle(290, 1000), { gridfinityLargePlate: true })))).toBe(0);
  });

  describe("read from what is drawn", () => {
    let runtime: ManifoldToplevel;
    beforeAll(async () => {
      runtime = await manifoldModule();
      runtime.setup();
    });
    const widthOf = (points: Point[]) => Math.max(...points.map((p) => p.x)) - Math.min(...points.map((p) => p.x));

    it("sets the drawn outline in by 0.25 mm, as a drawer fit leaves 0.5 mm, and keeps its outer ring only", () => {
      const square = gridfinityOutlineFromLoops(runtime, [rectangle(100, 100)]);
      expect("points" in square && widthOf(square.points)).toBeCloseTo(99.5, 6);
      const holed = gridfinityOutlineFromLoops(runtime, [rectangle(100, 100), rectangle(20, 20)]);
      expect("points" in holed && holed.points).toHaveLength(4);
      expect(gridfinityOutlineFromLoops(runtime, [rectangle(100, 100), rectangle(20, 20).map((p) => ({ x: p.x + 200, z: p.z }))])).toEqual({ error: "several" });
      expect(gridfinityOutlineFromLoops(runtime, [rectangle(0.4, 0.4)])).toEqual({ error: "empty" });
    });

    it("draws a curve with fewer points, within 0.05 mm", () => {
      const round = gridfinityOutlineFromLoops(runtime, [circle(50, 360)]);
      expect("points" in round && round.points.length).toBeLessThan(360);
      expect("points" in round && widthOf(round.points)).toBeCloseTo(99.5, 1);
    });
  });

  it("fits a plate to an outline: centred on its box, which is the outline's, and no larger than one plate takes", () => {
    const fit = gridfinityOutlineFit({ gridfinityType: "baseplate" }, rectangle(100, 50).map((p) => ({ x: p.x + 60, z: p.z + 25 })));
    expect(fit).toEqual({ patch: { gridfinityOutline: rectangle(100, 50), width: 100, depth: 50 }, centre: { x: 60, z: 25 } });
    expect(gridfinityOutlineFit({ gridfinityType: "baseplate" }, rectangle(400, 50))).toEqual({ error: "size", limit: 334, large: 586 });
    expect(gridfinityOutlineFit({ gridfinityType: "baseplate" }, rectangle(600, 50))).toEqual({ error: "size", limit: 334 });
    expect(gridfinityOutlineFit({ gridfinityType: "baseplate", gridfinityLargePlate: true }, rectangle(600, 50))).toEqual({ error: "size", limit: 586 });
    // An outline crossing itself encloses no one area.
    expect(gridfinityOutlineFit({ gridfinityType: "baseplate" }, [{ x: 0, z: 0 }, { x: 100, z: 60 }, { x: 100, z: 0 }, { x: 0, z: 40 }])).toEqual({ error: "points" });
    expect(gridfinityOutlineFit({ gridfinityType: "baseplate" }, [{ x: 0, z: 0 }, { x: 1, z: 0 }])).toEqual({ error: "points" });
  });

  it("refuses an outline smaller than a plate can be, rather than a plate larger than it", () => {
    expect(gridfinityOutlineFit({ gridfinityType: "baseplate" }, rectangle(4.5, 4.5))).toEqual({ error: "small", limit: 10 });
    expect(gridfinityOutlineFit({ gridfinityType: "baseplate" }, rectangle(99.5, 9.99))).toEqual({ error: "small", limit: 10 });
    expect(gridfinityOutlineFit({ gridfinityType: "baseplate" }, rectangle(10, 10))).toMatchObject({ patch: { width: 10, depth: 10 } });
  });

  it("refuses an outline of more points than a plate keeps, and says so", () => {
    expect(gridfinityOutlineFit({ gridfinityType: "baseplate" }, circle(100, 1000))).toMatchObject({ patch: { width: 200, depth: 200 } });
    expect(gridfinityOutlineFit({ gridfinityType: "baseplate" }, circle(100, 1001))).toEqual({ error: "complex", limit: 1000 });
  });

  it("reads what is drawn in the plate's own frame, turned and mirrored as it is, and puts the fitted plate back", () => {
    const at = { x: 100, z: 50, rotation: 90 };
    const [[local]] = gridfinityOutlineToPlate([[{ x: 110, z: 50 }]], at);
    expect(local.x).toBeCloseTo(0, 9);
    expect(local.z).toBeCloseTo(10, 9);
    const flipped = { x: 100, z: 50, rotation: 0, mirrorX: true };
    const [[mirrored]] = gridfinityOutlineToPlate([[{ x: 110, z: 60 }]], flipped);
    expect(mirrored).toEqual({ x: -10, z: 10 });
    const back = gridfinityPlateToWorld({ x: 0, z: 10 }, at);
    expect(back.x).toBeCloseTo(110, 9);
    expect(back.z).toBeCloseTo(50, 9);
    expect(gridfinityPlateToWorld({ x: -10, z: 10 }, flipped)).toEqual({ x: 110, z: 60 });
    // Turned and mirrored both ways, a point goes into the plate's frame and comes back where it was.
    const both = { x: -30, z: 20, rotation: 30, mirrorX: true, mirrorZ: true };
    const [[inside]] = gridfinityOutlineToPlate([[{ x: 12, z: -7 }]], both);
    const again = gridfinityPlateToWorld(inside, both);
    expect(again.x).toBeCloseTo(12, 9);
    expect(again.z).toBeCloseTo(-7, 9);
    // A plate tipped over or turned upside down lies in no plane the drawing can be read in.
    expect(gridfinityPlateFlat(at)).toBe(true);
    expect(gridfinityPlateFlat({ ...at, rotationX: 30 })).toBe(false);
    expect(gridfinityPlateFlat({ ...at, rotationZ: 30 })).toBe(false);
    expect(gridfinityPlateFlat({ ...at, mirrorY: true })).toBe(false);
  });

  it("takes the outline away by fitting the plate to its box as a drawer", () => {
    expect(gridfinityOutlineRemovalPatch(outlined(rectangle(300, 100)))).toEqual({ gridfinityOutline: undefined, gridfinityPaddingLeft: 24, gridfinityPaddingRight: 24, gridfinityPaddingBack: 8, gridfinityPaddingFront: 8, width: 300, depth: 100 });
  });

  describe("carried with the plate", () => {
    let runtime: ManifoldToplevel;
    beforeAll(async () => {
      runtime = await manifoldModule();
      runtime.setup();
      rememberManifoldRuntime(runtime);
    });
    const meshVolume = (vertices: number[][], faces: number[][]) => signedVolume(faces.map((face) => face.map((i) => vertices[i]) as V[]));

    it("carries the outline to every place that builds or keeps the plate", async () => {
      const shape = canonicalizeShape(binShape({ gridfinityType: "baseplate", width: 168, depth: 168, height: 5, size: 168, gridfinityOutline: l }));
      expect(shape).toMatchObject({ width: 168, depth: 168, gridfinityOutline: l });
      const other = { ...shape, gridfinityOutline: l.map((p) => ({ x: -p.x, z: p.z })) };
      expect(workplaneShapesEqual(shape, other)).toBe(false);
      expect(shapeGeometrySignature(shape)).not.toBe(shapeGeometrySignature(other));
      expect(tapeShapeTopologyKey(shape)).not.toBe(tapeShapeTopologyKey(other));
      // Drawn as a plain slab until Manifold is there, the plate is drawn again when it is: its keys hold that revision.
      expect(shapeGeometrySignature(shape)).toContain('"labelKernel":1');
      expect(tapeShapeTopologyKey(shape)).toContain('"labelKernel":1');
      // The viewport and the editor's mesh hold the L with its twelve sockets, not the 4 x 4 plate of its box.
      const cut = signedVolume(gridfinityLabelledTriangles(runtime, shape));
      expect(cut).toBeLessThan(signedVolume(gridfinityTriangles({ ...shape, gridfinityOutline: undefined })) * 0.8);
      const drawn = createShapeObject(shape, false, undefined, false);
      let viewport = 0;
      drawn.traverse((node) => {
        if (!(node instanceof THREE.Mesh) || !node.visible) return;
        const position = (node.geometry as THREE.BufferGeometry).getAttribute("position");
        const index = (node.geometry as THREE.BufferGeometry).getIndex();
        const at = (k: number) => [position.getX(k), position.getY(k), position.getZ(k)];
        const count = index ? index.count : position.count;
        const vertices = Array.from({ length: position.count }, (_, k) => at(k));
        const faces = Array.from({ length: count / 3 }, (_, t) => [0, 1, 2].map((k) => (index ? index.getX(3 * t + k) : 3 * t + k)));
        viewport += meshVolume(vertices, faces);
      });
      expect(viewport).toBeCloseTo(cut, 0);
      const mesh = meshForShape(shape);
      expect(meshVolume(mesh.vertices, mesh.faces)).toBeCloseTo(cut, 0);
      expect(cadModifierGridfinityForShape(shape)).toMatchObject({ gridfinityOutline: l });
      // A box of no whole units is the outline's own, not the grid's: 150 x 100, not 168 x 84.
      const strip = canonicalizeShape(binShape({ gridfinityType: "baseplate", width: 150, depth: 100, height: 5, size: 150, gridfinityOutline: rectangle(150, 100) }));
      expect(cadModifierGridfinityForShape(strip)).toMatchObject({ width: 150, depth: 100 });
      expect(sceneShape(shape)).toMatchObject({ gridfinityOutline: l });
      expect(mcpShapeSummary(shape)).toMatchObject({ settings: { gridfinityOutline: JSON.stringify(l) } });
      // Given back as the scene gives it, a stretched plate keeps its box.
      expect(mcpShapeSummary({ ...shape, width: 252 })).toMatchObject({ settings: { gridfinityOutline: JSON.stringify(l.map((p) => ({ x: p.x * 1.5, z: p.z }))) } });
      const save = (shapes: WorkplaneShape[]) => exportLylProject({ projectId: "outline", projectName: "Outline", createdAt: 1, modifiedAt: 2, shapes, history: [editorHistoryEntry(shapes, [])], historyIndex: 0, assets: [], workspace: DEFAULT_WORKPLANE_WORKSPACE, snapGrid: DEFAULT_SNAP_GRID, placementElevation: 0 });
      const [loaded] = (await importLylProject(await save([shape]))).shapes;
      expect(loaded).toMatchObject({ width: 168, depth: 168, gridfinityOutline: l });
      // An older file has no outline: the plate of its box, 4 x 4 units.
      const [plain] = (await importLylProject(await save([{ ...shape, gridfinityOutline: undefined }]))).shapes;
      expect(gridfinityPlan(plain).cells).toHaveLength(16);
      await expect(importLylProject(await save([{ ...shape, gridfinityOutline: "yes" } as unknown as WorkplaneShape]))).rejects.toThrow("gridfinityOutline must be an array");
      await expect(importLylProject(await save([{ ...shape, gridfinityOutline: [{ x: 0, z: "a" }] } as unknown as WorkplaneShape]))).rejects.toThrow("gridfinityOutline[0].z");
      await expect(importLylProject(await save([{ ...shape, gridfinityOutline: [{ x: 0, z: 0 }, { x: 100, z: 60 }, { x: 100, z: 0 }, { x: 0, z: 40 }] }]))).rejects.toThrow("gridfinityOutline crosses itself");
    });

    it("keeps the drawn plate within a rounded outline, where a cell's square corner would reach past it", () => {
      // 58 mm across holds one cell, whose square corners reach 29.7 mm from the middle.
      const round = gridfinityLabelledTriangles(runtime, outlined(circle(29, 360)));
      expect(round.length).toBeGreaterThan(100);
      // The outline is kept to 0.01 mm, so its points may sit that much off the circle.
      expect(Math.max(...round.flat().map(([x, , z]) => Math.hypot(x, z)))).toBeLessThan(29.01);
    });
  });

  it("takes an outline through the MCP: in the plate's frame, as points or as the text the scene gives, an empty list taking it away", () => {
    const base = binShape({ gridfinityType: "baseplate", width: 252, depth: 252, height: 5, x: 10, z: 20 });
    const shifted = rectangle(100, 50).map((p) => ({ x: p.x + 5, z: p.z }));
    expect(mcpGridfinityOutlinePatch(base, { gridfinityOutline: shifted })).toMatchObject({ gridfinityOutline: rectangle(100, 50), width: 100, depth: 50, x: 15, z: 20 });
    expect(mcpGridfinityOutlinePatch(base, { gridfinityOutline: JSON.stringify(shifted) })).toMatchObject({ width: 100, depth: 50, x: 15 });
    const removed = mcpGridfinityOutlinePatch({ ...base, ...outlined(rectangle(300, 100)) }, { gridfinityOutline: [] });
    expect(removed).toHaveProperty("gridfinityOutline", undefined);
    expect(removed).toMatchObject({ width: 300, depth: 100, gridfinityPaddingLeft: 24 });
    expect(mcpGridfinityOutlinePatch(base, {})).toEqual({});
    expect(() => mcpGridfinityOutlinePatch(base, { gridfinityOutline: rectangle(400, 50) })).toThrow("at most 334 mm across and deep, or 586 mm with gridfinityLargePlate");
    expect(() => mcpGridfinityOutlinePatch(base, { gridfinityOutline: [{ x: 0, z: 0 }] })).toThrow("gridfinityOutline");
    expect(() => mcpGridfinityOutlinePatch(base, { gridfinityOutline: rectangle(100, 5) })).toThrow("at least 10 mm");
    expect(() => mcpGridfinityOutlinePatch(base, { gridfinityOutline: circle(100, 1001) })).toThrow("too many points: at most 1000");
    expect(() => mcpGridfinityOutlinePatch(binShape({}), { gridfinityOutline: rectangle(100, 50) })).toThrow("baseplate");
    // Padding does not apply to an outline plate: given through the MCP, it leaves the plate as it is.
    expect(mcpGridfinityPaddingPatch(binShape(outlined(rectangle(100, 50))), {}, { gridfinityPaddingLeft: 10 })).toEqual({});
    // A change of type takes the outline away, as in the editor.
    expect(mcpGridfinityOutlinePatch(binShape(outlined(rectangle(168, 84), { gridfinityType: "bin" })), { gridfinityType: "bin" })).toHaveProperty("gridfinityOutline", undefined);
  });

  it("takes the Large plate switch: an outline of up to 586 mm and 12 cells a row, kept on while the outline needs it", () => {
    expect(gridfinityOutlineLimit({ gridfinityType: "baseplate", gridfinityLargePlate: true })).toBe(586);
    expect(gridfinityPlan(outlined(rectangle(504, 504), { gridfinityLargePlate: true })).cells).toHaveLength(144);
    expect(gridfinityPlan(outlined(rectangle(504, 504))).size).toMatchObject({ width: 334, depth: 334 });
    expect(gridfinityShapePatch(outlined(rectangle(300, 100)), { largePlate: true })).toMatchObject({ gridfinityLargePlate: true, width: 300, depth: 100 });
    expect(() => mcpGridfinityOutlinePatch(binShape(outlined(rectangle(500, 100), { gridfinityLargePlate: true })), { gridfinityLargePlate: false })).toThrow("334 mm");
    expect(mcpGridfinityOutlinePatch(binShape(outlined(rectangle(300, 100), { gridfinityLargePlate: true })), { gridfinityLargePlate: false })).toEqual({});
  });

  it("drops the outline when the plate becomes a bin or a tray", () => {
    const shape = outlined(rectangle(168, 84));
    expect(gridfinityShapePatch(shape, { type: "bin" })).toMatchObject({ gridfinityType: "bin", gridfinityOutline: undefined });
    expect(gridfinityShapePatch(shape, { type: "tray" })).toMatchObject({ gridfinityType: "tray", gridfinityOutline: undefined });
    expect(gridfinityShapePatch(outlined(rectangle(168, 84)), { lip: false })).not.toHaveProperty("gridfinityOutline");
  });
});
