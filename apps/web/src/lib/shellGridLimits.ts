import { DEFAULT_GRIDFINITY_DIVIDER_THICKNESS, GRIDFINITY_BASEPLATE_HEIGHT, GRIDFINITY_MAGNET_DEPTH, GRIDFINITY_DRAWER_CLEARANCE, GRIDFINITY_FLOOR, GRIDFINITY_GRID, MAX_GRIDFINITY_DIVIDER_THICKNESS, MAX_GRIDFINITY_LARGE_PLATE_UNITS, MIN_GRIDFINITY_DIVIDER_HEIGHT, MIN_GRIDFINITY_DIVIDER_THICKNESS } from "@/lib/gridfinityGeometry";

/* What the Gridfinity floor, the fit to the grid and the dividers of a hollowed box offer; no kernel in here, so the panel can use it. */

/** The floor of the box up to the top of the baseplate's sockets: the sockets' depth and the closed floor under them, in mm. */
export const SHELL_GRID_FLOOR = GRIDFINITY_BASEPLATE_HEIGHT + GRIDFINITY_FLOOR;
/**
 * The floor with magnet holes (Discussion #1693): four 6.5 x 2.4 mm holes under each socket, where a bin's own magnets
 * sit (13 mm from the cell's middle each way), with the closed floor still under them, so the floor is that much thicker.
 */
export function shellGridFloor(grid: Pick<ShellGrid, "magnets" | "screws"> | null | undefined) {
  return SHELL_GRID_FLOOR + (grid?.magnets || grid?.screws ? GRIDFINITY_MAGNET_DEPTH : 0);
}
/**
 * The screw holes of the floor (Discussion #1693), to screw the box down in a drawer or onto a board: one through the
 * middle of each socket, wide enough for a 4 mm countersunk screw, and sunk at 45 degrees so the head lies level with
 * the socket's bottom and a bin still stands in it. The floor is as thick as with magnet holes, which leaves the
 * straight part of the hole under the head; the two go together, as the magnets sit 13 mm from the middle.
 */
export const SHELL_GRID_SCREW_DIAMETER = 4.5;
export const SHELL_GRID_SCREW_HEAD = 8.5;
export const SHELL_GRID_SCREW_SINK = (SHELL_GRID_SCREW_HEAD - SHELL_GRID_SCREW_DIAMETER) / 2;
/** The room left above the floor: the cavity must be at least this deep, in mm. */
export const SHELL_GRID_MIN_DEPTH = 3;
/** The play round the cells of a fitted box, as the drawer fit leaves it, in mm. */
export const SHELL_GRID_PLAY = GRIDFINITY_DRAWER_CLEARANCE;
export const MAX_SHELL_GRID_CELLS = MAX_GRIDFINITY_LARGE_PLATE_UNITS * MAX_GRIDFINITY_LARGE_PLATE_UNITS;

/**
 * A divider is this thick unless set otherwise, in mm, and a box has at most this many across and along. Thickness and
 * height keep to the Gridfinity compartments' (Discussion #1560, PR #1796), so a hollowed box and a bin work alike.
 */
export const SHELL_DIVIDER_THICKNESS = DEFAULT_GRIDFINITY_DIVIDER_THICKNESS;
export const MIN_SHELL_DIVIDER_THICKNESS = MIN_GRIDFINITY_DIVIDER_THICKNESS;
export const MAX_SHELL_DIVIDER_THICKNESS = MAX_GRIDFINITY_DIVIDER_THICKNESS;
/** A divider set lower stands at least this high over the floor, in mm; 0 (or unset) is the full height, up to the rim. */
export const MIN_SHELL_DIVIDER_HEIGHT = MIN_GRIDFINITY_DIVIDER_HEIGHT;
export const MAX_SHELL_DIVIDERS = 8;

export type ShellGrid = { cells: number; fit: boolean; magnets?: boolean; screws?: boolean };
/**
 * A divider set by hand: it runs along the width ("x") or the depth ("z") of
 * the box's inside, `at`, `from` and `to` in mm from the left and the back of the inside, and with `slant` its end lies
 * that many mm further across than its beginning.
 */
export type ShellDividerWall = { dir: "x" | "z"; at: number; from: number; to: number; slant?: number };
/** The most dividers set by hand that one box takes. */
export const MAX_SHELL_DIVIDER_WALLS = 40;
/**
 * `height`: over the floor, in mm, 0 or unset the full height; `thickness`: in mm, unset 1.2. With `manual` the dividers
 * are the `walls`, each placed freely, instead of `x` across and `z` along evenly spaced. `angle` says how the box is
 * turned about its height, in degrees, so that across and along stay the box's own when it is turned more than an
 * eighth of a turn; the dividers always follow the box's inside, whichever way it is turned.
 */
export type ShellDividers = { x: number; z: number; height?: number; thickness?: number; manual?: boolean; walls?: ShellDividerWall[]; angle?: number; scoops?: ShellScoop[]; scoopRadius?: number; pockets?: ShellPocket[]; pocketFill?: number };
/**
 * A shaped pocket: the box is filled solid above its floor (pocketFill mm high, to the rim when unset) and the outline
 * of a part is cut into that filling, `depth` mm deep from its top, so the part lies in a pocket of its own shape.
 * `points` are the outline in mm from the left and the back of the inside.
 */
export type ShellPocket = { points: { x: number; z: number }[]; depth: number };
export const MAX_SHELL_POCKETS = 12;
export const MAX_SHELL_POCKET_POINTS = 400;
export const POCKETS_FAILED_MESSAGE = "The shaped pockets could not be built on this body. Remove the last one or choose another part.";
/**
 * A finger scoop: the floor of the compartment that holds the point (x, z in mm from the left and the back of the
 * inside) runs up into that side of the compartment in a quarter round, so small parts can be pushed out with a finger.
 */
export type ShellScoop = { x: number; z: number; side: "front" | "back" | "left" | "right" };
export const SHELL_SCOOP_RADIUS = 12;
export const MIN_SHELL_SCOOP_RADIUS = 2;
export const MAX_SHELL_SCOOP_RADIUS = 60;
export const MAX_SHELL_SCOOPS = 60;
export const SCOOPS_FAILED_MESSAGE = "The finger scoops could not be built on this body. Switch them off or choose another side.";

export const GRID_NEEDS_TOP_MESSAGE = "A Gridfinity floor needs a body hollowed with only its top open.";
export const GRID_TOO_LOW_MESSAGE = "The body is too low for a Gridfinity floor: the floor takes 6.2 mm and the cavity needs 3 mm above it.";
export const GRID_NO_CELL_MESSAGE = "Not even one whole Gridfinity cell fits into the inside of this box.";
export const GRID_FAILED_MESSAGE = "The Gridfinity floor could not be built on this body. Switch it off or choose another wall.";
export const DIVIDERS_NEEDS_TOP_MESSAGE = "Dividers need a body hollowed with only its top open.";
export const DIVIDERS_WITH_GRID_MESSAGE = "Dividers do not go with a Gridfinity floor: its bins fill the cells, with only 0.5 mm between them. Use the bins as compartments, or switch the Gridfinity floor off.";
export const DIVIDERS_FAILED_MESSAGE = "The dividers could not be built on this body. Switch them off or choose fewer.";

/** A number of cells, or of dividers, kept to a whole number from 0 to `max`. */
export function clampShellCount(value: unknown, max: number) {
  const n = typeof value === "number" && Number.isFinite(value) ? Math.round(value) : 0;
  return Math.min(max, Math.max(0, n));
}

/** The Gridfinity floor as stored: null when off. */
export function normalizeShellGrid(value: unknown): ShellGrid | null {
  if (!value || typeof value !== "object") return null;
  const { cells, fit, magnets, screws } = value as Record<string, unknown>;
  const count = clampShellCount(cells, MAX_SHELL_GRID_CELLS);
  return count > 0 ? { cells: count, fit: fit === true, ...(magnets === true ? { magnets: true } : {}), ...(screws === true ? { screws: true } : {}) } : null;
}

/** The dividers as stored: null when there are none. */
export function normalizeShellDividers(value: unknown): ShellDividers | null {
  if (!value || typeof value !== "object") return null;
  const { x, z, height, thickness } = value as Record<string, unknown>;
  const out: ShellDividers = { x: clampShellCount(x, MAX_SHELL_DIVIDERS), z: clampShellCount(z, MAX_SHELL_DIVIDERS) };
  // A height over 0 is kept as set (the kernel holds it to at least 3 mm and to the rim); 0 or less is the full height.
  if (typeof height === "number" && Number.isFinite(height) && height > 0) out.height = Math.round(height * 1000) / 1000;
  if (typeof thickness === "number" && Number.isFinite(thickness)) {
    const t = Math.min(MAX_SHELL_DIVIDER_THICKNESS, Math.max(MIN_SHELL_DIVIDER_THICKNESS, Math.round(thickness * 1000) / 1000));
    if (Math.abs(t - SHELL_DIVIDER_THICKNESS) > 1e-9) out.thickness = t;
  }
  const { manual, walls, angle } = value as Record<string, unknown>;
  const list = normalizeShellDividerWalls(walls);
  if (list.length > 0) out.walls = list;
  if (manual === true) out.manual = true;
  if (typeof angle === "number" && Number.isFinite(angle) && Math.abs(angle % 360) > 1e-9) out.angle = Math.round((angle % 360) * 1000) / 1000;
  const { scoops, scoopRadius } = value as Record<string, unknown>;
  const dips = normalizeShellScoops(scoops);
  if (dips.length > 0) {
    out.scoops = dips;
    if (typeof scoopRadius === "number" && Number.isFinite(scoopRadius)) {
      const r = Math.min(MAX_SHELL_SCOOP_RADIUS, Math.max(MIN_SHELL_SCOOP_RADIUS, Math.round(scoopRadius * 1000) / 1000));
      if (Math.abs(r - SHELL_SCOOP_RADIUS) > 1e-9) out.scoopRadius = r;
    }
  }
  const { pockets, pocketFill } = value as Record<string, unknown>;
  const cut = normalizeShellPockets(pockets);
  if (cut.length > 0) {
    out.pockets = cut;
    if (typeof pocketFill === "number" && Number.isFinite(pocketFill) && pocketFill > 0) out.pocketFill = Math.round(Math.min(1e4, Math.max(1, pocketFill)) * 1000) / 1000;
  }
  // Dividers there are, or scoops or shaped pockets alone in a box without dividers.
  return (out.manual ? list.length : out.x + out.z) > 0 || dips.length > 0 || cut.length > 0 ? out : null;
}

/** A list in the tool's settings as it was sent (walls, scoops, pockets): the list itself, or the text of one; anything else is no list. */
export function shellSettingsList(value: unknown): unknown[] | undefined {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return undefined;
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

/** The shaped pockets as a clean list: outlines of at least three finite points, each with a depth. */
export function normalizeShellPockets(value: unknown): ShellPocket[] {
  if (!Array.isArray(value)) return [];
  const pockets: ShellPocket[] = [];
  for (const entry of value) {
    if (pockets.length >= MAX_SHELL_POCKETS) break;
    if (!entry || typeof entry !== "object") continue;
    const pocket = entry as Partial<ShellPocket>;
    if (!Array.isArray(pocket.points)) continue;
    const measure = (n: number) => Math.round(Math.min(1e4, Math.max(-1e4, n)) * 1000) / 1000;
    const points = pocket.points
      .filter((point) => point && typeof point === "object" && typeof point.x === "number" && typeof point.z === "number" && Number.isFinite(point.x) && Number.isFinite(point.z))
      .slice(0, MAX_SHELL_POCKET_POINTS)
      .map((point) => ({ x: measure(point.x), z: measure(point.z) }));
    if (points.length < 3) continue;
    const depth = typeof pocket.depth === "number" && Number.isFinite(pocket.depth) ? Math.min(1e4, Math.max(0.4, pocket.depth)) : 1e4;
    pockets.push({ points, depth: Math.round(depth * 1000) / 1000 });
  }
  return pockets;
}

/** The finger scoops as a clean list: points with finite measures, none below zero, and a side. */
export function normalizeShellScoops(value: unknown): ShellScoop[] {
  if (!Array.isArray(value)) return [];
  const scoops: ShellScoop[] = [];
  for (const entry of value) {
    if (scoops.length >= MAX_SHELL_SCOOPS) break;
    if (!entry || typeof entry !== "object") continue;
    const scoop = entry as Partial<ShellScoop>;
    if (![scoop.x, scoop.z].every((n) => typeof n === "number" && Number.isFinite(n))) continue;
    const measure = (n: number) => Math.round(Math.min(1e4, Math.max(0, n)) * 1000) / 1000;
    const side = scoop.side === "back" || scoop.side === "left" || scoop.side === "right" ? scoop.side : "front";
    scoops.push({ x: measure(scoop.x as number), z: measure(scoop.z as number), side });
  }
  return scoops;
}

/** The dividers set by hand as a clean list: walls with a direction and finite measures, none below zero, each one's beginning before its end. */
export function normalizeShellDividerWalls(value: unknown): ShellDividerWall[] {
  if (!Array.isArray(value)) return [];
  const walls: ShellDividerWall[] = [];
  for (const entry of value) {
    if (walls.length >= MAX_SHELL_DIVIDER_WALLS) break;
    if (!entry || typeof entry !== "object") continue;
    const wall = entry as Partial<ShellDividerWall>;
    if (wall.dir !== "x" && wall.dir !== "z") continue;
    if (![wall.at, wall.from, wall.to].every((n) => typeof n === "number" && Number.isFinite(n))) continue;
    const measure = (n: number) => Math.round(Math.min(1e4, Math.max(0, n)) * 1000) / 1000;
    const a = measure(wall.from as number);
    const b = measure(wall.to as number);
    const start = measure(wall.at as number);
    const end = typeof wall.slant === "number" && Number.isFinite(wall.slant) ? measure(start + wall.slant) : start;
    const [at, far] = a <= b ? [start, end] : [end, start];
    const slant = Math.round((far - at) * 1000) / 1000;
    walls.push({ dir: wall.dir, at, from: Math.min(a, b), to: Math.max(a, b), ...(slant !== 0 ? { slant } : {}) });
  }
  return walls;
}

/**
 * About how many cells the inside of a box holds, as a rectangle of its size less the walls: the most the slider
 * offers. A round or many-sided inside holds fewer; the CAD kernel counts the real ones and keeps to them.
 */
export function shellGridEstimate(width: number, depth: number, wall: number) {
  const across = (length: number) => Math.max(0, Math.floor((length - 2 * Math.max(0, wall) - SHELL_GRID_PLAY) / GRIDFINITY_GRID + 1e-9));
  const columns = across(width);
  const rows = across(depth);
  return { columns, rows, max: Math.min(MAX_SHELL_GRID_CELLS, columns * rows) };
}
