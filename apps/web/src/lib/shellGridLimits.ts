import { DEFAULT_GRIDFINITY_DIVIDER_THICKNESS, GRIDFINITY_BASEPLATE_HEIGHT, GRIDFINITY_DRAWER_CLEARANCE, GRIDFINITY_FLOOR, GRIDFINITY_GRID, MAX_GRIDFINITY_DIVIDER_THICKNESS, MAX_GRIDFINITY_LARGE_PLATE_UNITS, MIN_GRIDFINITY_DIVIDER_HEIGHT, MIN_GRIDFINITY_DIVIDER_THICKNESS } from "@/lib/gridfinityGeometry";

/* What the Gridfinity floor, the fit to the grid and the dividers of a hollowed box offer; no kernel in here, so the panel can use it. */

/** The floor of the box up to the top of the baseplate's sockets: the sockets' depth and the closed floor under them, in mm. */
export const SHELL_GRID_FLOOR = GRIDFINITY_BASEPLATE_HEIGHT + GRIDFINITY_FLOOR;
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

export type ShellGrid = { cells: number; fit: boolean };
/** `height`: over the floor, in mm, 0 or unset the full height; `thickness`: in mm, unset 1.2. */
export type ShellDividers = { x: number; z: number; height?: number; thickness?: number };

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
  const { cells, fit } = value as Record<string, unknown>;
  const count = clampShellCount(cells, MAX_SHELL_GRID_CELLS);
  return count > 0 ? { cells: count, fit: fit === true } : null;
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
  return out.x + out.z > 0 ? out : null;
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
