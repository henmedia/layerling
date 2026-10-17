import manifoldModule, { type ManifoldToplevel } from "manifold-3d";
import { beforeAll, describe, expect, it } from "vitest";
import { cadModifierGridfinityForShape } from "@/lib/cadProfileExtrusion";
import { editorHistoryEntry } from "@/lib/editorHistory";
import { exportLylProject, importLylProject } from "@/lib/lylProject";
import { rememberManifoldRuntime } from "@/lib/manifoldHandle";
import { sceneShape } from "@/lib/shapeCatalog";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";
import { canonicalizeShape, workplaneShapesEqual } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";
import {
  GRIDFINITY_LABEL_WALL_KEYS,
  GRIDFINITY_LIP_HEIGHT,
  gridfinityFootprintPatch,
  gridfinityLabelLength,
  gridfinityLabelLimits,
  gridfinityLabelledTriangles,
  gridfinityLabelPieces,
  gridfinityPlan,
  gridfinityShapePatch,
  gridfinityTriangles,
  gridfinityUnits,
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
