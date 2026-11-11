import { horizontalPlacementWorkplane, normalizePlacementWorkplane, type PlacementPoint, type PlacementWorkplane } from "@/lib/placementWorkplane";
import { CORNER_RULER_DEFAULT_ARM_ELEVATION, cornerRulerFrameForWorkplane, keptCornerRulerArms, type CornerRulerAxis, type CornerRulerAxisModes, type CornerRulerFrame, type CornerRulerMode } from "@/lib/rulerDimensions";

/**
 * The framing square a design keeps (#829): where it was set, on which workplane, which way its arms point and how it
 * counts. Kept like the saved views - per design, beside it in the browser and in a `.lyl` file -, never in the undo
 * history, so it is where it was when the design is opened again.
 */
export type SavedCornerRuler = {
  corner: PlacementPoint;
  workplane: PlacementWorkplane;
  frame: CornerRulerFrame;
  armLengthX: number;
  armLengthZ: number;
  mode?: CornerRulerMode;
  axisModes?: CornerRulerAxisModes;
  occlude?: boolean;
  /** The bodies at the arms show no measures of their own, only the selected ones do (#831). */
  selectedOnly?: boolean;
  /** How long the third arm, standing up from the corner, is; left out while it has its first length (Discussion #1649). */
  armLengthElevation?: number;
  /** The arms switched away from the start (the two in the plane on, the third off); left out when none is (Discussion #1649). */
  arms?: Partial<Record<CornerRulerAxis, boolean>>;
};

const CORNER_RULERS_STORAGE_PREFIX = "layerling.cornerRulers.";
const START_WITH_CORNER_RULER_STORAGE_KEY = "layerling.editor.startWithCornerRuler";
const DEFAULT_ARM_X = 100;
const DEFAULT_ARM_Z = 80;
const MODES: readonly CornerRulerMode[] = ["endpoint", "midpoint"];

function point(value: unknown): PlacementPoint | null {
  if (!value || typeof value !== "object") return null;
  const { x, y, z } = value as Partial<PlacementPoint>;
  return [x, y, z].every((entry) => typeof entry === "number" && Number.isFinite(entry)) ? { x: x!, y: y!, z: z! } : null;
}

function arm(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

function normalizeRuler(value: unknown): SavedCornerRuler | null {
  if (!value || typeof value !== "object") return null;
  const entry = value as Record<string, unknown>;
  const corner = point(entry.corner);
  const frame = entry.frame as Record<string, unknown> | undefined;
  const xAxis = point(frame?.xAxis);
  const zAxis = point(frame?.zAxis);
  const normal = point(frame?.normal);
  if (!corner || !xAxis || !zAxis || !normal || !entry.workplane) return null;
  const mode = MODES.includes(entry.mode as CornerRulerMode) ? (entry.mode as CornerRulerMode) : undefined;
  const axisModes: CornerRulerAxisModes = {};
  if (entry.axisModes && typeof entry.axisModes === "object") {
    for (const axis of ["x", "z", "elevation"] as const) {
      const axisMode = (entry.axisModes as Record<string, unknown>)[axis];
      if (MODES.includes(axisMode as CornerRulerMode)) axisModes[axis] = axisMode as CornerRulerMode;
    }
  }
  const armLengthElevation = arm(entry.armLengthElevation, CORNER_RULER_DEFAULT_ARM_ELEVATION);
  const arms = keptArms(entry.arms);
  return {
    corner,
    workplane: normalizePlacementWorkplane(entry.workplane),
    frame: { xAxis, zAxis, normal },
    armLengthX: arm(entry.armLengthX, DEFAULT_ARM_X),
    armLengthZ: arm(entry.armLengthZ, DEFAULT_ARM_Z),
    ...(mode ? { mode } : {}),
    ...(Object.keys(axisModes).length ? { axisModes } : {}),
    ...(entry.occlude === false ? { occlude: false } : {}),
    ...(entry.selectedOnly === true ? { selectedOnly: true } : {}),
    ...(armLengthElevation !== CORNER_RULER_DEFAULT_ARM_ELEVATION ? { armLengthElevation } : {}),
    ...(arms ? { arms } : {}),
  };
}

/**
 * The arms a stored square names as switched, reduced to those that differ from the start (Discussion #1649). A
 * square with all three off cannot be: it keeps the start then.
 */
function keptArms(value: unknown): Partial<Record<CornerRulerAxis, boolean>> | undefined {
  if (!value || typeof value !== "object") return undefined;
  const named: Partial<Record<CornerRulerAxis, boolean>> = {};
  for (const axis of ["x", "z", "elevation"] as const) {
    const shown = (value as Record<string, unknown>)[axis];
    if (typeof shown === "boolean") named[axis] = shown;
  }
  return keptCornerRulerArms(named);
}

/** The framing squares read from storage or a file, or null when there is none. */
export function normalizeSavedCornerRulers(value: unknown): SavedCornerRuler[] | null {
  if (!Array.isArray(value)) return null;
  const rulers = value.map(normalizeRuler).filter((ruler): ruler is SavedCornerRuler => Boolean(ruler));
  return rulers.length ? rulers : null;
}

/** What is kept of a framing square in the view: its fields without the view's own id. */
export function savedCornerRuler<T extends SavedCornerRuler>(ruler: T): SavedCornerRuler {
  const { corner, workplane, frame, armLengthX, armLengthZ, mode, axisModes, occlude, selectedOnly, armLengthElevation, arms } = ruler;
  return {
    corner, workplane, frame, armLengthX, armLengthZ,
    ...(mode ? { mode } : {}),
    ...(axisModes ? { axisModes } : {}),
    ...(occlude === false ? { occlude } : {}),
    ...(selectedOnly === true ? { selectedOnly } : {}),
    ...(armLengthElevation !== undefined && armLengthElevation !== CORNER_RULER_DEFAULT_ARM_ELEVATION ? { armLengthElevation } : {}),
    ...(keptCornerRulerArms(arms) ? { arms: keptCornerRulerArms(arms) } : {}),
  };
}

export function readCornerRulers(projectId: string | null | undefined): SavedCornerRuler[] {
  if (!projectId) return [];
  try {
    const stored = window.localStorage.getItem(CORNER_RULERS_STORAGE_PREFIX + projectId);
    return (stored ? normalizeSavedCornerRulers(JSON.parse(stored)) : null) ?? [];
  } catch {
    return [];
  }
}

export function writeCornerRulers(projectId: string | null | undefined, rulers: readonly SavedCornerRuler[] | null) {
  if (!projectId) return;
  try {
    const kept = normalizeSavedCornerRulers(rulers?.map(savedCornerRuler) ?? null);
    if (kept) window.localStorage.setItem(CORNER_RULERS_STORAGE_PREFIX + projectId, JSON.stringify(kept));
    else window.localStorage.removeItem(CORNER_RULERS_STORAGE_PREFIX + projectId);
  } catch {
    // Without storage the framing square lasts until the design is left.
  }
}

/** Whether a new design starts with a framing square at the origin (#1386): a setting of this browser, off until it is switched on. */
export function readStartWithCornerRuler(): boolean {
  try {
    return window.localStorage.getItem(START_WITH_CORNER_RULER_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function writeStartWithCornerRuler(on: boolean) {
  try {
    if (on) window.localStorage.setItem(START_WITH_CORNER_RULER_STORAGE_KEY, "true");
    else window.localStorage.removeItem(START_WITH_CORNER_RULER_STORAGE_KEY);
  } catch {
    // Without storage new designs start without one, as before.
  }
}

/** The framing square a new design starts with: its corner at the origin of the base plate, turned as a click there places it. */
export function startCornerRuler(): SavedCornerRuler {
  const workplane = horizontalPlacementWorkplane(0);
  return {
    corner: { x: 0, y: 0, z: 0 },
    workplane,
    frame: cornerRulerFrameForWorkplane(workplane),
    armLengthX: DEFAULT_ARM_X,
    armLengthZ: DEFAULT_ARM_Z,
    mode: "endpoint",
  };
}

/**
 * Gives a design just made its framing square at the origin, when the setting asks for one (#1386). Only a new design
 * gets it: a design that had one and lost it keeps it removed, and one that has a square keeps its own.
 */
export function seedStartCornerRuler(projectId: string) {
  if (!readStartWithCornerRuler() || readCornerRulers(projectId).length) return;
  writeCornerRulers(projectId, [startCornerRuler()]);
}
