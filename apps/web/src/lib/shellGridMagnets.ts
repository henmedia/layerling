import { GRIDFINITY_GRID, MAX_GRIDFINITY_LARGE_PLATE_UNITS, gridfinityOutlineCells } from "@/lib/gridfinityGeometry";
import type { LidShapeMagnets } from "@/lib/lidTool";
import { shapeDepth, shapeWidth } from "@/lib/workplaneShapes";
import { MAX_SHELL_GRID_CELLS, SHELL_GRID_PLAY } from "@/lib/shellGridLimits";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * The Lid tool's magnets in the corners of a box with a Gridfinity floor: a pocket with its wall, and a post where the wall
 * cannot hold it, reach into the cavity's corners - where the cells of the floor lie when the box is just large enough for
 * them. The Lid tool says so, and the person makes the box larger or takes fewer cells.
 */

type Point = { x: number; z: number };

/** The wall round a magnet's pocket, in mm, as the Lid tool draws it (lidTool's MAGNET_WALL). */
export const MAGNET_POCKET_WALL = 1.2;

/** The Gridfinity floor a body was hollowed with: its wall, its most cells and the body's middle and size; null when it has none. */
export function shellGridOf(shape: WorkplaneShape) {
  const hollow = [...(shape.edgeTreatmentHistory ?? [])].reverse().find((entry) => entry.feature.kind === "shell")?.feature;
  if (!hollow?.shellGrid) return null;
  return { wall: hollow.amount, cells: hollow.shellGrid.cells };
}

/** The cells of the floor of a box `width` x `depth` with this wall, as the CAD kernel counts them (a rectangular inside), nearest the middle first. */
export function shellGridCellsOf(width: number, depth: number, wall: number, most: number): Point[] {
  const hx = width / 2 - wall, hz = depth / 2 - wall;
  if (hx <= 0 || hz <= 0) return [];
  const all = gridfinityOutlineCells([{ x: -hx, z: -hz }, { x: hx, z: -hz }, { x: hx, z: hz }, { x: -hx, z: hz }], MAX_GRIDFINITY_LARGE_PLATE_UNITS);
  const distance = (c: Point) => Math.hypot(c.x, c.z);
  return [...all].sort((p, q) => distance(p) - distance(q) || p.z - q.z || p.x - q.x).slice(0, Math.max(1, Math.min(most, MAX_SHELL_GRID_CELLS)));
}

/** Whether a rectangle turned by `turn` degrees about (x, z) meets an upright square: the separating axis test. */
function turnedMeetsSquare(x: number, z: number, width: number, depth: number, turn: number, cell: Point, half: number) {
  const a = (turn * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  const box = [[-width / 2, -depth / 2], [width / 2, -depth / 2], [width / 2, depth / 2], [-width / 2, depth / 2]].map(([u, v]) => ({ x: x + u * c - v * s, z: z + u * s + v * c }));
  const square = [{ x: cell.x - half, z: cell.z - half }, { x: cell.x + half, z: cell.z - half }, { x: cell.x + half, z: cell.z + half }, { x: cell.x - half, z: cell.z + half }];
  const axes = [{ x: 1, z: 0 }, { x: 0, z: 1 }, { x: c, z: s }, { x: -s, z: c }];
  return axes.every((axis) => {
    const project = (points: Point[]) => points.map((p) => p.x * axis.x + p.z * axis.z);
    const [lo1, hi1] = [Math.min(...project(box)), Math.max(...project(box))];
    const [lo2, hi2] = [Math.min(...project(square)), Math.max(...project(square))];
    return hi1 > lo2 + 1e-6 && hi2 > lo1 + 1e-6;
  });
}

/** Whether a circle meets an upright square. */
function circleMeetsSquare(x: number, z: number, radius: number, cell: Point, half: number) {
  const dx = Math.max(Math.abs(x - cell.x) - half, 0), dz = Math.max(Math.abs(z - cell.z) - half, 0);
  return dx * dx + dz * dz < radius * radius - 1e-9;
}

/**
 * Whether the magnets reach into a cell of the Gridfinity floor of `shape` (a body hollowed with one): the cells as the
 * kernel counts them for the body's size, a cell the square its socket opens with, and the magnets' pockets with their
 * wall and their posts (round or box-shaped bodies in the scene's frame). A pocket in the wall alone meets none.
 */
export function magnetsMeetGridCells(shape: WorkplaneShape, magnets: LidShapeMagnets, width: number, depth: number): boolean {
  const grid = shellGridOf(shape);
  if (!grid) return false;
  const half = GRIDFINITY_GRID / 2 - SHELL_GRID_PLAY / 2;
  const cells = shellGridCellsOf(width, depth, grid.wall, grid.cells).map((cell) => ({ x: cell.x + shape.x, z: cell.z + shape.z }));
  const meets = (part: WorkplaneShape, extra: number, cell: Point) => (part.kind === "box"
    ? turnedMeetsSquare(part.x, part.z, shapeWidth(part) + 2 * extra, shapeDepth(part) + 2 * extra, part.rotation ?? 0, cell, half)
    : circleMeetsSquare(part.x, part.z, shapeWidth(part) / 2 + extra, cell, half));
  // A pocket with the wall round it, as far as a post's round part reaches. A post the kernel could not draw exactly is one
  // mesh for all four corners: its size says nothing about one corner, and it reaches no further towards the middle than
  // its pocket's wall (the rest of it runs out to the corner), so only the exact parts, a cylinder or a box, are looked at.
  const exact = magnets.posts.filter((part) => part.kind === "box" || part.kind === "cylinder");
  return cells.some((cell) => magnets.pockets.some((part) => meets(part, MAGNET_POCKET_WALL, cell)) || exact.some((part) => meets(part, 0, cell)));
}

/**
 * The smallest box, in mm, whose floor holds the same cells as now (columns x rows) with these magnets clear of them: the
 * cells' 42 mm each and the same margin added to both sides, in steps of 0.1 mm, the magnets' pockets in the corners as
 * the Lid tool puts them in a box with square corners. Null when the body has no Gridfinity floor, the magnets have no
 * pockets, or no size up to 60 mm more fits.
 */
export function magnetsGridLeastSize(shape: WorkplaneShape, magnets: LidShapeMagnets, width: number, depth: number): { width: number; depth: number; columns: number; rows: number } | null {
  const grid = shellGridOf(shape);
  if (!grid || !magnets.pockets.length) return null;
  const now = shellGridCellsOf(width, depth, grid.wall, grid.cells);
  if (!now.length) return null;
  const count = (values: number[]) => new Set(values.map((value) => Math.round(value * 1000))).size;
  const columns = count(now.map((cell) => cell.x));
  const rows = count(now.map((cell) => cell.z));
  const diameter = Math.max(...magnets.pockets.map((pocket) => shapeWidth(pocket)));
  // The Lid tool looks for each pocket's place in steps of 0.05 mm along the corner's diagonal, so it lands up to a step further in.
  const reach = diameter / 2 + MAGNET_POCKET_WALL + 0.05 / Math.SQRT2;
  const same = { x: 0, z: 0, edgeTreatmentHistory: [{ feature: { kind: "shell", amount: grid.wall, shellGrid: { cells: columns * rows } } }] } as unknown as WorkplaneShape;
  for (let tenths = 0; tenths <= 600; tenths += 1) {
    const w = Math.round((columns * GRIDFINITY_GRID + tenths / 10) * 10) / 10;
    const d = Math.round((rows * GRIDFINITY_GRID + tenths / 10) * 10) / 10;
    const cells = shellGridCellsOf(w, d, grid.wall, columns * rows);
    if (cells.length !== columns * rows || count(cells.map((cell) => cell.x)) !== columns) continue;
    const pockets = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz]) => ({ kind: "cylinder", x: sx * (w / 2 - reach), z: sz * (d / 2 - reach), width: diameter, depth: diameter }) as unknown as WorkplaneShape);
    if (!magnetsMeetGridCells(same, { pockets, posts: [] }, w, d)) return { width: w, depth: d, columns, rows };
  }
  return null;
}
