import { DEFAULT_OVERHANG_ANGLE, normalizeOverhangAngle } from "@/lib/overhangLimits";
import type { CustomSnapGrid, CustomSnapGridSize, GridSize, HistoryRetentionLimit, MeasurementAccuracy, ShapeCustomization, ShapeCustomizationMap, ShapeKind, WorkplaneWorkspaceSettings } from "@/types/layerling";
import { normalizeScaleForUnits } from "@/lib/measurementUnits";
import { DEFAULT_IMPERIAL_GRID_BLOCK_PRESET, DEFAULT_METRIC_GRID_BLOCK_PRESET, DEFAULT_EDGE_LINE_COLOR, DEFAULT_LIGHT_AZIMUTH, DEFAULT_LIGHT_ELEVATION, DEFAULT_SKETCH_BACKGROUND, DEFAULT_SKETCH_GRID_COLOR, DEFAULT_SKETCH_PLATE_COLOR, DEFAULT_WORKPLANE_BACKGROUND, DEFAULT_WORKPLANE_GRID_COLOR, DEFAULT_WORKPLANE_SURFACE_COLOR, inchGridPresetMm } from "@/lib/workplaneGrid";
import { isThreadProfile } from "@/lib/threadProfiles";
import { normalizeHexColor } from "@/lib/coloredImport";
import { TORUS_MAX_TUBE_RATIO, TORUS_MIN_TUBE_RATIO } from "@/lib/torusShape";

export const DEFAULT_SNAP_GRID: GridSize = "1.0 mm";
export const BRICK_SNAP_STEP = 8;
// Used only when the snap grid is off: fine steps, since that is why the grid is switched off (#293).
// An arrow moves 0.01 mm (#370, as in Tinkercad); Shift as many times that as with a grid.
export const KEYBOARD_NUDGE_FALLBACK_STEP = 0.01;
// Shift has always moved five times as far as a plain arrow press.
export const KEYBOARD_NUDGE_COARSE_FACTOR = 5;
export const KEYBOARD_NUDGE_FINE_DIVISOR = 5;
export const MIN_CUSTOM_SHAPE_DIMENSION = 0.01;
export const MAX_CUSTOM_SHAPE_DIMENSION = 2000;
export const MAX_HIGH_RESOLUTION_SIDES = 512;
export const MAX_HIGH_RESOLUTION_STEPS = 256;

// How many triangles the exact kernel is handed for a cut, merge or intersection
// with an imported mesh. It works on the main thread: around a second for a few
// hundred thousand triangles, noticeably longer towards the upper end, so the
// default stays where a slower computer still answers within seconds.
export const DEFAULT_BOOLEAN_TRIANGLE_LIMIT = 250_000;
export const MIN_BOOLEAN_TRIANGLE_LIMIT = 10_000;
export const MAX_BOOLEAN_TRIANGLE_LIMIT = 5_000_000;
export const BOOLEAN_TRIANGLE_LIMIT_STEP = 10_000;
// Named choices for the limit; the free number field remains for other values.
export const BOOLEAN_TRIANGLE_LIMIT_PRESETS = [
  { id: "older", limit: 100_000 },
  { id: "normal", limit: DEFAULT_BOOLEAN_TRIANGLE_LIMIT },
  { id: "fast", limit: 1_000_000 },
] as const;
export type BooleanTriangleLimitPreset = (typeof BOOLEAN_TRIANGLE_LIMIT_PRESETS)[number]["id"];

export function booleanTriangleLimitPreset(limit: number): BooleanTriangleLimitPreset | null {
  return BOOLEAN_TRIANGLE_LIMIT_PRESETS.find((preset) => preset.limit === limit)?.id ?? null;
}

export const DEFAULT_WORKPLANE_WORKSPACE: WorkplaneWorkspaceSettings = {
  width: 200,
  depth: 200,
  sizePreset: "200 x 200 mm",
  printer: "",
  gridBlockSize: 5,
  gridBlockPreset: "5 mm",
  gridColor: DEFAULT_WORKPLANE_GRID_COLOR,
  gridMajorInterval: 5,
  gridMajorColor: "",
  background: DEFAULT_WORKPLANE_BACKGROUND,
  surfaceColor: DEFAULT_WORKPLANE_SURFACE_COLOR,
  showAxes: true,
  showPlateLabels: true,
  gridLinesGrow: true,
  edgeLines: false,
  edgeColor: DEFAULT_EDGE_LINE_COLOR,
  strongHoles: false,
  showShadows: true,
  cameraInertia: true,
  fastMode: false,
  shadeContrast: 0,
  softLighting: false,
  shadowStrength: 100,
  shadowSoftness: 0,
  lightAzimuth: DEFAULT_LIGHT_AZIMUTH,
  lightElevation: DEFAULT_LIGHT_ELEVATION,
  sketchBackground: DEFAULT_SKETCH_BACKGROUND,
  sketchGridColor: DEFAULT_SKETCH_GRID_COLOR,
  sketchPlateColor: DEFAULT_SKETCH_PLATE_COLOR,
  overhangAngle: DEFAULT_OVERHANG_ANGLE,
  showGrid: true,
  clickToPlaceShapes: true,
  selectBeforeMove: false,
  frameByDirection: false,
  pasteCentered: false,
  doubleClickOpensSketch: true,
  doubleClickOpensGroup: true,
  doubleClickCentersView: true,
  objectSnap: true,
  stlAsDownload: false,
  confirmTabClose: false,
  dimensionsAlwaysVisible: true,
  showRotationAngles: true,
  zoomSpeed: 5,
  units: "Metric (Default)",
  inchFormat: "fraction",
  scale: "1:1 (millimeters)",
  accuracy: 2,
  historyLimit: 100,
  booleanTriangleLimit: DEFAULT_BOOLEAN_TRIANGLE_LIMIT,
  customSnapGrids: [],
  shapeCustomizations: {},
};

const ZOOM_SPEED_SLIDER_MIN = 1;
/** The slider's top. Up to 10 it is the range it always had; the steps above go on at the same rate (#331). */
export const ZOOM_SPEED_SLIDER_MAX = 14;
const ZOOM_SPEED_STEPS_TO_FAST = 9;
const ZOOM_SPEED_FAST_TO_SLOW = 20;
/** Each slider step changes the rate by this factor, in the first ten steps and above them. */
const ZOOM_SPEED_STEP = ZOOM_SPEED_FAST_TO_SLOW ** (1 / ZOOM_SPEED_STEPS_TO_FAST);
// OrbitControls.zoomSpeed at the default slider position. The old mapping was
// 0.28 + slider * 0.09, which left the fast end only about three times the slow end.
export const DEFAULT_ORBIT_ZOOM_SPEED = 0.73;

/**
 * Maps the zoom slider onto OrbitControls.zoomSpeed.
 * Each wheel event scales camera distance by 0.95^(zoomSpeed * |deltaY| / 100),
 * so this value is the zoom rate. The curve is geometric: from 1 to 10 the fast end is
 * twenty times the slow end, the default slider position keeps the old rate, and the
 * steps from 10 to the top go on with the same factor per step.
 */
export function orbitControlsZoomSpeed(slider: number): number {
  const position = Number.isFinite(slider)
    ? Math.min(ZOOM_SPEED_SLIDER_MAX, Math.max(ZOOM_SPEED_SLIDER_MIN, slider))
    : DEFAULT_WORKPLANE_WORKSPACE.zoomSpeed;
  const slowest = DEFAULT_ORBIT_ZOOM_SPEED / ZOOM_SPEED_STEP ** (DEFAULT_WORKPLANE_WORKSPACE.zoomSpeed - ZOOM_SPEED_SLIDER_MIN);
  return slowest * ZOOM_SPEED_STEP ** (position - ZOOM_SPEED_SLIDER_MIN);
}

/**
 * The slider position the buttons and keys +/- always step at. They do not follow the slider:
 * a trackpad wants it high, and there a single step jumped too far. At the default position a
 * step is the button's own multiplier, as it was for anyone who never moved the slider.
 */
const ZOOM_BUTTON_SLIDER_POSITION = DEFAULT_WORKPLANE_WORKSPACE.zoomSpeed;

/** The distance multipliers of one zoom step, shared by the toolbar buttons and the keys +/-. */
export const ZOOM_STEP_IN = 0.72;
export const ZOOM_STEP_OUT = 1.28;

/** Raises a fixed distance multiplier by the rate at ZOOM_BUTTON_SLIDER_POSITION. */
export function zoomDistanceScale(step: number): number {
  return step ** (orbitControlsZoomSpeed(ZOOM_BUTTON_SLIDER_POSITION) / DEFAULT_ORBIT_ZOOM_SPEED);
}

const METRIC_SNAP_GRIDS: GridSize[] = ["Off", "0.1 mm", "0.25 mm", "0.5 mm", "1.0 mm", "2.0 mm", "5.0 mm", "Brick"];
const IMPERIAL_SNAP_GRIDS: GridSize[] = ["Off", "1/64 in", "1/32 in", "1/16 in", "1/8 in", "1/4 in", "1/2 in", "1 in"];
const fixedSnapGrids: GridSize[] = [...METRIC_SNAP_GRIDS, ...IMPERIAL_SNAP_GRIDS.filter((size) => size !== "Off")];

export const MIN_CUSTOM_SNAP_GRID = 0.01;
export const MAX_CUSTOM_SNAP_GRID = 1000;
export const MAX_CUSTOM_SNAP_GRIDS = 12;
export const MAX_CUSTOM_SNAP_GRID_NAME = 32;
/** A custom measure snaps whole, halved and quartered: 1U, 0.5U and 0.25U (and with it 0.75U). */
export const CUSTOM_SNAP_GRID_DIVISORS = [1, 2, 4] as const;

/** The divisors a custom measure is offered with: all three, or only the whole when it is set to that (#329). */
export function customSnapGridDivisors(grid: { wholeOnly?: boolean }): readonly number[] {
  return grid.wholeOnly ? [1] : CUSTOM_SNAP_GRID_DIVISORS;
}
const CUSTOM_SNAP_GRID_FRACTIONS: Record<number, string> = { 1: "1", 2: "½", 4: "¼" };

function cleanCustomSnapSize(value: number) {
  return Number(Math.min(MAX_CUSTOM_SNAP_GRID, Math.max(MIN_CUSTOM_SNAP_GRID, value)).toFixed(4));
}

export function customSnapGridSize(size: number, divisor: number): CustomSnapGridSize {
  return `custom:${cleanCustomSnapSize(size)}:${divisor}`;
}

/** The measure and divisor a custom snap step stands for, or null for any other value. */
export function parseCustomSnapGrid(value: unknown): { size: number; divisor: number } | null {
  if (typeof value !== "string") return null;
  const match = /^custom:(\d+(?:\.\d+)?):(\d+)$/.exec(value);
  if (!match) return null;
  const size = Number(match[1]);
  const divisor = Number(match[2]);
  if (!(CUSTOM_SNAP_GRID_DIVISORS as readonly number[]).includes(divisor)) return null;
  if (!Number.isFinite(size) || size < MIN_CUSTOM_SNAP_GRID || size > MAX_CUSTOM_SNAP_GRID) return null;
  return { size, divisor };
}

export function normalizeCustomSnapGrids(value: unknown, fallback: CustomSnapGrid[] = []): CustomSnapGrid[] {
  if (!Array.isArray(value)) return fallback;
  const grids: CustomSnapGrid[] = [];
  for (const entry of value) {
    if (grids.length >= MAX_CUSTOM_SNAP_GRIDS) break;
    if (!entry || typeof entry !== "object") continue;
    const { name, size } = entry as { name?: unknown; size?: unknown };
    if (typeof size !== "number" || !Number.isFinite(size) || size <= 0) continue;
    grids.push({
      name: typeof name === "string" ? name.trim().slice(0, MAX_CUSTOM_SNAP_GRID_NAME) : "",
      size: cleanCustomSnapSize(size),
      ...((entry as { wholeOnly?: unknown }).wholeOnly === true ? { wholeOnly: true } : {}),
    });
  }
  return grids;
}

/** The snap steps offered for a unit system: inch fractions for Imperial, millimetres otherwise. */
export function snapGridOptionsForUnits(units: string): GridSize[] {
  return units === "Imperial" ? IMPERIAL_SNAP_GRIDS : METRIC_SNAP_GRIDS;
}

/** The snap menu: the steps of the unit system, then each custom measure whole, halved and quartered (or just whole, as set). */
export function snapGridOptions(units: string, customGrids: CustomSnapGrid[] = []): GridSize[] {
  const custom = customGrids.flatMap((grid) => customSnapGridDivisors(grid).map((divisor) => customSnapGridSize(grid.size, divisor)));
  return [...snapGridOptionsForUnits(units), ...new Set(custom)];
}

/**
 * The snap step a key picks from the snap menu (#748): Alt+1 to Alt+9 and Alt+0 take that entry of the
 * menu, so Alt+1 turns snapping off; comma and period step one entry finer or coarser. Off counts as finer than
 * the finest step: comma goes there from the finest step, period leaves it for the finest step.
 * The digit comes from the key's position, since Option+digit types a sign on the Mac. Null when the key
 * picks nothing or the step would stay the same.
 */
export function snapGridForShortcut(
  event: Pick<KeyboardEvent, "key" | "code" | "altKey" | "ctrlKey" | "metaKey" | "shiftKey">,
  options: GridSize[],
  current: GridSize,
): GridSize | null {
  if (event.ctrlKey || event.metaKey || event.shiftKey) return null;
  let next: GridSize | undefined;
  const digit = /^Digit(\d)$/.exec(event.code);
  if (event.altKey) {
    if (!digit) return null;
    next = options[(Number(digit[1]) + 9) % 10];
  } else if ((event.key === "," || event.key === ".") && event.code !== "NumpadDecimal") {
    const steps: GridSize[] = options.filter((size) => size !== "Off");
    const index = steps.indexOf(current);
    if (index < 0) next = event.key === "." ? steps[0] : undefined;
    else if (index === 0 && event.key === "," && options.includes("Off")) next = "Off";
    else next = steps[index + (event.key === "." ? 1 : -1)];
  }
  return next && next !== current ? next : null;
}

/**
 * What a custom snap step is called in a menu: "½ × MX Key Unit". A step whose
 * measure is no longer in the list keeps working and shows its millimetres.
 */
export function customSnapGridLabel(value: unknown, customGrids: CustomSnapGrid[] = []): string | null {
  const parsed = parseCustomSnapGrid(value);
  if (!parsed) return null;
  const name = customGrids.find((grid) => grid.size === parsed.size)?.name.trim() || `${parsed.size} mm`;
  // Used whole, a grid carries its name alone: "10 mm", not "1 × 10 mm" (#329).
  if (parsed.divisor === 1) return name;
  return `${CUSTOM_SNAP_GRID_FRACTIONS[parsed.divisor] ?? `1/${parsed.divisor}`} × ${name}`;
}

/**
 * The plate's grid for a unit system: an inch preset with Imperial, a
 * millimetre one otherwise. A preset of the other system (a design set to
 * Imperial before inch grids existed, or switched back to metric) gives way
 * to the usual default; a custom size stays as it is.
 */
export function gridBlockForUnits(units: string, preset: string, size: number): { gridBlockPreset: string; gridBlockSize: number } {
  const inchMm = inchGridPresetMm(preset);
  if (units === "Imperial") {
    if (inchMm !== null) return { gridBlockPreset: preset, gridBlockSize: inchMm };
    if (preset === "Custom") return { gridBlockPreset: preset, gridBlockSize: size };
    return { gridBlockPreset: DEFAULT_IMPERIAL_GRID_BLOCK_PRESET, gridBlockSize: inchGridPresetMm(DEFAULT_IMPERIAL_GRID_BLOCK_PRESET)! };
  }
  if (inchMm !== null) return { gridBlockPreset: DEFAULT_METRIC_GRID_BLOCK_PRESET, gridBlockSize: Number.parseFloat(DEFAULT_METRIC_GRID_BLOCK_PRESET) };
  return { gridBlockPreset: preset, gridBlockSize: size };
}

/**
 * The workspace in another unit system, as the unit field of the settings makes it: the plate's grid follows
 * (an inch preset with Imperial, a millimetre one otherwise) and the scale is one the system has (#422). The
 * snap step follows through `snapGridForUnits`. The grid of the system left behind is remembered, so switching
 * to inches and back brings "1 mm" back and not the usual 5 mm (#442).
 */
export function workspaceForUnits<T extends Pick<WorkplaneWorkspaceSettings, "units" | "gridBlockPreset" | "gridBlockSize" | "scale"> & { gridBlockOtherUnits?: string }>(workspace: T, units: string): T {
  if (units === workspace.units) return workspace;
  const remembered = workspace.gridBlockOtherUnits;
  const arrivingInInches = units === "Imperial";
  const rememberedFits = remembered !== undefined && remembered !== "Custom" && (inchGridPresetMm(remembered) !== null) === arrivingInInches;
  const grid = rememberedFits
    ? { gridBlockPreset: remembered, gridBlockSize: inchGridPresetMm(remembered) ?? Number.parseFloat(remembered) }
    : gridBlockForUnits(units, workspace.gridBlockPreset, workspace.gridBlockSize);
  // A custom size goes with the user to the other system as it is, so only a preset is worth remembering.
  const left = workspace.gridBlockPreset !== "Custom" ? workspace.gridBlockPreset : remembered;
  const next = { ...workspace, units, ...grid, gridBlockOtherUnits: left };
  return { ...next, scale: normalizeScaleForUnits(next.units, next.scale) };
}

/** Keeps the current snap step when the unit system offers it, else the usual default (1.0 mm or 1/8 in). */
export function snapGridForUnits(units: string, snap: GridSize): GridSize {
  // A measure of the user's own is millimetres whatever the plate is ruled in.
  if (parseCustomSnapGrid(snap)) return snap;
  if (snapGridOptionsForUnits(units).includes(snap)) return snap;
  return units === "Imperial" ? "1/8 in" : DEFAULT_SNAP_GRID;
}
const customizableShapeKinds: ShapeKind[] = [
  "box", "roundedBox", "cylinder", "slot", "ellipse", "sphere", "sketch", "scribble", "cone", "pyramid", "roof", "text", "roundRoof",
  "halfSphere", "paraboloid", "torus", "tube", "bentTube", "star", "heart", "crescent", "gear", "honeycomb", "hinge", "knurl", "dovetail", "counterbore", "countersink", "doubleCountersink", "teardrop", "loft", "vase", "thread", "spring", "gridfinity", "ring", "wedge", "polygon", "icosahedron", "ruler", "mesh",
];

function numberOrDefault(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stringOrDefault(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function colorOrDefault(value: unknown, fallback: string) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value.trim()) ? value : fallback;
}

function booleanOrDefault(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function accuracyOrDefault(value: unknown, fallback: MeasurementAccuracy) {
  return value === 1 || value === 2 || value === 3 ? value : fallback;
}

function historyLimitOrDefault(value: unknown, fallback: HistoryRetentionLimit): HistoryRetentionLimit {
  if (value === "unlimited") return value;
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(5000, Math.max(1, Math.round(value)));
}

function booleanTriangleLimitOrDefault(value: unknown, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(MAX_BOOLEAN_TRIANGLE_LIMIT, Math.max(MIN_BOOLEAN_TRIANGLE_LIMIT, Math.round(value)));
}

function optionalShapeDimension(value: unknown, fallback: number | undefined) {
  if (value === undefined) return fallback;
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(MAX_CUSTOM_SHAPE_DIMENSION, Math.max(MIN_CUSTOM_SHAPE_DIMENSION, value));
}

function optionalShapeNumber(value: unknown, fallback: number | undefined, min: number, max: number, integer = false) {
  if (value === undefined) return fallback;
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  const normalized = Math.min(max, Math.max(min, value));
  return integer ? Math.round(normalized) : normalized;
}

function optionalShapeText(value: unknown, fallback: string | undefined, maxLength: number) {
  if (value === undefined) return fallback;
  if (typeof value !== "string") return fallback;
  return value.slice(0, maxLength) || " ";
}

export function normalizeShapeCustomizations(value: unknown, fallback: ShapeCustomizationMap = {}): ShapeCustomizationMap {
  const candidate = value && typeof value === "object" ? value as Partial<Record<ShapeKind, unknown>> : {};
  const normalized: ShapeCustomizationMap = {};
  customizableShapeKinds.forEach((kind) => {
    const raw = candidate[kind];
    const source = raw && typeof raw === "object" ? raw as Partial<ShapeCustomization> : {};
    const fallbackEntry = fallback[kind];
    const entry: ShapeCustomization = {
      width: optionalShapeDimension(source.width, fallbackEntry?.width),
      depth: optionalShapeDimension(source.depth, fallbackEntry?.depth),
      height: optionalShapeDimension(source.height, fallbackEntry?.height),
      maxDimension: optionalShapeDimension(source.maxDimension, fallbackEntry?.maxDimension),
      color: normalizeHexColor(typeof source.color === "string" ? source.color : undefined) ?? fallbackEntry?.color,
    };
    if (kind === "sphere" || kind === "halfSphere" || kind === "paraboloid" || kind === "torus") {
      entry.steps = optionalShapeNumber(source.steps, fallbackEntry?.steps, 6, MAX_HIGH_RESOLUTION_STEPS, true);
    }
    if (kind === "torus") {
      entry.sides = optionalShapeNumber(source.sides, fallbackEntry?.sides, 12, MAX_HIGH_RESOLUTION_SIDES, true);
      entry.torusTubeRatio = optionalShapeNumber(source.torusTubeRatio, fallbackEntry?.torusTubeRatio, TORUS_MIN_TUBE_RATIO, TORUS_MAX_TUBE_RATIO);
    }
    if (kind === "cylinder" || kind === "ellipse" || kind === "slot" || kind === "cone" || kind === "tube" || kind === "ring" || kind === "counterbore" || kind === "countersink" || kind === "doubleCountersink" || kind === "teardrop") {
      entry.sides = optionalShapeNumber(source.sides, fallbackEntry?.sides, 3, MAX_HIGH_RESOLUTION_SIDES, true);
    } else if (kind === "pyramid" || kind === "polygon") {
      entry.sides = optionalShapeNumber(source.sides, fallbackEntry?.sides, 3, 24, true);
      if (kind === "pyramid") {
        entry.topWidth = optionalShapeNumber(source.topWidth, fallbackEntry?.topWidth, 0, MAX_CUSTOM_SHAPE_DIMENSION);
        entry.topDepth = optionalShapeNumber(source.topDepth, fallbackEntry?.topDepth, 0, MAX_CUSTOM_SHAPE_DIMENSION);
      }
    } else if (kind === "roundRoof") {
      entry.sides = optionalShapeNumber(source.sides, fallbackEntry?.sides, 4, MAX_HIGH_RESOLUTION_SIDES, true);
    }
    if (kind === "cone") {
      entry.topRadius = optionalShapeNumber(source.topRadius, fallbackEntry?.topRadius, 0, MAX_CUSTOM_SHAPE_DIMENSION / 2);
      entry.baseRadius = optionalShapeNumber(source.baseRadius, fallbackEntry?.baseRadius, MIN_CUSTOM_SHAPE_DIMENSION, MAX_CUSTOM_SHAPE_DIMENSION / 2);
    }
    if (kind === "tube" || kind === "ring") {
      entry.bevel = optionalShapeNumber(source.bevel, fallbackEntry?.bevel, 0.5, 20);
    }
    if (kind === "star") {
      entry.starPoints = optionalShapeNumber(source.starPoints, fallbackEntry?.starPoints, 3, 32, true);
      entry.starInnerSize = optionalShapeNumber(source.starInnerSize, fallbackEntry?.starInnerSize, 0.1, MAX_CUSTOM_SHAPE_DIMENSION);
      entry.starOuterFillet = optionalShapeNumber(source.starOuterFillet, fallbackEntry?.starOuterFillet, 0, MAX_CUSTOM_SHAPE_DIMENSION);
      entry.starInnerFillet = optionalShapeNumber(source.starInnerFillet, fallbackEntry?.starInnerFillet, 0, MAX_CUSTOM_SHAPE_DIMENSION);
      entry.starQuality = optionalShapeNumber(source.starQuality, fallbackEntry?.starQuality, 4, 48, true);
    }
    if (kind === "heart") {
      entry.heartTipFillet = optionalShapeNumber(source.heartTipFillet, fallbackEntry?.heartTipFillet, 0, MAX_CUSTOM_SHAPE_DIMENSION);
      entry.heartQuality = optionalShapeNumber(source.heartQuality, fallbackEntry?.heartQuality, 16, 64, true);
    }
    if (kind === "crescent") {
      entry.crescentThickness = optionalShapeNumber(source.crescentThickness, fallbackEntry?.crescentThickness, 1, MAX_CUSTOM_SHAPE_DIMENSION);
      entry.crescentTipFillet = optionalShapeNumber(source.crescentTipFillet, fallbackEntry?.crescentTipFillet, 0, MAX_CUSTOM_SHAPE_DIMENSION);
      entry.crescentQuality = optionalShapeNumber(source.crescentQuality, fallbackEntry?.crescentQuality, 16, 64, true);
    }
    if (kind === "honeycomb") {
      entry.honeycombCellSize = optionalShapeNumber(source.honeycombCellSize, fallbackEntry?.honeycombCellSize, 2, 100);
      entry.honeycombWallThickness = optionalShapeNumber(source.honeycombWallThickness, fallbackEntry?.honeycombWallThickness, 0.4, 50);
      entry.honeycombFrameWidth = optionalShapeNumber(source.honeycombFrameWidth, fallbackEntry?.honeycombFrameWidth, 0, 100);
    }
    if (kind === "counterbore" || kind === "countersink" || kind === "doubleCountersink") {
      entry.screwHoleShaft = optionalShapeNumber(source.screwHoleShaft, fallbackEntry?.screwHoleShaft, 0.1, MAX_CUSTOM_SHAPE_DIMENSION);
      entry.screwHoleHeadDepth = optionalShapeNumber(source.screwHoleHeadDepth, fallbackEntry?.screwHoleHeadDepth, 0.1, MAX_CUSTOM_SHAPE_DIMENSION);
      entry.screwHoleAngle = optionalShapeNumber(source.screwHoleAngle, fallbackEntry?.screwHoleAngle, 30, 150);
    }
    if (kind === "hinge") {
      entry.hingeKnuckles = optionalShapeNumber(source.hingeKnuckles, fallbackEntry?.hingeKnuckles, 3, 15, true);
      entry.hingeKnuckleWidth = optionalShapeNumber(source.hingeKnuckleWidth, fallbackEntry?.hingeKnuckleWidth, 1, MAX_CUSTOM_SHAPE_DIMENSION);
      entry.hingePinDiameter = optionalShapeNumber(source.hingePinDiameter, fallbackEntry?.hingePinDiameter, 0.2, MAX_CUSTOM_SHAPE_DIMENSION);
      entry.hingeLeafThickness = optionalShapeNumber(source.hingeLeafThickness, fallbackEntry?.hingeLeafThickness, 0.1, MAX_CUSTOM_SHAPE_DIMENSION);
      entry.hingeClearance = optionalShapeNumber(source.hingeClearance, fallbackEntry?.hingeClearance, 0.1, 1);
      entry.hingePinless = typeof source.hingePinless === "boolean" ? source.hingePinless : fallbackEntry?.hingePinless;
      entry.hingeStyle = source.hingeStyle === "cone" || source.hingeStyle === "pinless" || source.hingeStyle === "pin" || source.hingeStyle === "liftOff" ? source.hingeStyle : fallbackEntry?.hingeStyle;
      entry.hingeConeSize = optionalShapeNumber(source.hingeConeSize, fallbackEntry?.hingeConeSize, 0.6, MAX_CUSTOM_SHAPE_DIMENSION);
      entry.hingeScrewHoles = optionalShapeNumber(source.hingeScrewHoles, fallbackEntry?.hingeScrewHoles, 0, 6, true);
      entry.hingeScrewDiameter = optionalShapeNumber(source.hingeScrewDiameter, fallbackEntry?.hingeScrewDiameter, 1, 12);
      entry.hingeScrewSpacing = optionalShapeNumber(source.hingeScrewSpacing, fallbackEntry?.hingeScrewSpacing, 0, MAX_CUSTOM_SHAPE_DIMENSION);
      entry.hingeScrewAcross = optionalShapeNumber(source.hingeScrewAcross, fallbackEntry?.hingeScrewAcross, 0, MAX_CUSTOM_SHAPE_DIMENSION);
      entry.hingeScrewCountersink = typeof source.hingeScrewCountersink === "boolean" ? source.hingeScrewCountersink : fallbackEntry?.hingeScrewCountersink;
      entry.hingeCornerRadius = optionalShapeNumber(source.hingeCornerRadius, fallbackEntry?.hingeCornerRadius, 0, MAX_CUSTOM_SHAPE_DIMENSION);
      entry.hingeLeafStyle = source.hingeLeafStyle === "fingers" || source.hingeLeafStyle === "plate" ? source.hingeLeafStyle : fallbackEntry?.hingeLeafStyle;
      entry.hingeScrewHead = source.hingeScrewHead === "countersunk" || source.hingeScrewHead === "straight" || source.hingeScrewHead === "nut" || source.hingeScrewHead === "countersunkNut" ? source.hingeScrewHead : fallbackEntry?.hingeScrewHead;
      entry.hingeNutWidth = optionalShapeNumber(source.hingeNutWidth, fallbackEntry?.hingeNutWidth, 0, 40);
    }
    if (kind === "gridfinity") {
      entry.gridfinityType = source.gridfinityType === "bin" || source.gridfinityType === "baseplate" || source.gridfinityType === "tray" ? source.gridfinityType : fallbackEntry?.gridfinityType;
      entry.gridfinityLip = typeof source.gridfinityLip === "boolean" ? source.gridfinityLip : fallbackEntry?.gridfinityLip;
      entry.gridfinityMagnets = typeof source.gridfinityMagnets === "boolean" ? source.gridfinityMagnets : fallbackEntry?.gridfinityMagnets;
      entry.gridfinityHalfGrid = typeof source.gridfinityHalfGrid === "boolean" ? source.gridfinityHalfGrid : fallbackEntry?.gridfinityHalfGrid;
      entry.gridfinityLabelBack = typeof source.gridfinityLabelBack === "boolean" ? source.gridfinityLabelBack : fallbackEntry?.gridfinityLabelBack;
      entry.gridfinityLabelFront = typeof source.gridfinityLabelFront === "boolean" ? source.gridfinityLabelFront : fallbackEntry?.gridfinityLabelFront;
      entry.gridfinityLabelLeft = typeof source.gridfinityLabelLeft === "boolean" ? source.gridfinityLabelLeft : fallbackEntry?.gridfinityLabelLeft;
      entry.gridfinityLabelRight = typeof source.gridfinityLabelRight === "boolean" ? source.gridfinityLabelRight : fallbackEntry?.gridfinityLabelRight;
      entry.gridfinityLabelBackWidth = optionalShapeNumber(source.gridfinityLabelBackWidth, fallbackEntry?.gridfinityLabelBackWidth, 0, MAX_CUSTOM_SHAPE_DIMENSION);
      entry.gridfinityLabelBackLength = optionalShapeNumber(source.gridfinityLabelBackLength, fallbackEntry?.gridfinityLabelBackLength, 0, MAX_CUSTOM_SHAPE_DIMENSION);
      entry.gridfinityLabelBackOffset = optionalShapeNumber(source.gridfinityLabelBackOffset, fallbackEntry?.gridfinityLabelBackOffset, -MAX_CUSTOM_SHAPE_DIMENSION, MAX_CUSTOM_SHAPE_DIMENSION);
      entry.gridfinityLabelFrontWidth = optionalShapeNumber(source.gridfinityLabelFrontWidth, fallbackEntry?.gridfinityLabelFrontWidth, 0, MAX_CUSTOM_SHAPE_DIMENSION);
      entry.gridfinityLabelFrontLength = optionalShapeNumber(source.gridfinityLabelFrontLength, fallbackEntry?.gridfinityLabelFrontLength, 0, MAX_CUSTOM_SHAPE_DIMENSION);
      entry.gridfinityLabelFrontOffset = optionalShapeNumber(source.gridfinityLabelFrontOffset, fallbackEntry?.gridfinityLabelFrontOffset, -MAX_CUSTOM_SHAPE_DIMENSION, MAX_CUSTOM_SHAPE_DIMENSION);
      entry.gridfinityLabelLeftWidth = optionalShapeNumber(source.gridfinityLabelLeftWidth, fallbackEntry?.gridfinityLabelLeftWidth, 0, MAX_CUSTOM_SHAPE_DIMENSION);
      entry.gridfinityLabelLeftLength = optionalShapeNumber(source.gridfinityLabelLeftLength, fallbackEntry?.gridfinityLabelLeftLength, 0, MAX_CUSTOM_SHAPE_DIMENSION);
      entry.gridfinityLabelLeftOffset = optionalShapeNumber(source.gridfinityLabelLeftOffset, fallbackEntry?.gridfinityLabelLeftOffset, -MAX_CUSTOM_SHAPE_DIMENSION, MAX_CUSTOM_SHAPE_DIMENSION);
      entry.gridfinityLabelRightWidth = optionalShapeNumber(source.gridfinityLabelRightWidth, fallbackEntry?.gridfinityLabelRightWidth, 0, MAX_CUSTOM_SHAPE_DIMENSION);
      entry.gridfinityLabelRightLength = optionalShapeNumber(source.gridfinityLabelRightLength, fallbackEntry?.gridfinityLabelRightLength, 0, MAX_CUSTOM_SHAPE_DIMENSION);
      entry.gridfinityLabelRightOffset = optionalShapeNumber(source.gridfinityLabelRightOffset, fallbackEntry?.gridfinityLabelRightOffset, -MAX_CUSTOM_SHAPE_DIMENSION, MAX_CUSTOM_SHAPE_DIMENSION);
      entry.gridfinityLabelCorner = source.gridfinityLabelCorner === "round" || source.gridfinityLabelCorner === "chamfer" ? source.gridfinityLabelCorner : fallbackEntry?.gridfinityLabelCorner;
      entry.gridfinityLabelCornerSize = optionalShapeNumber(source.gridfinityLabelCornerSize, fallbackEntry?.gridfinityLabelCornerSize, 0, MAX_CUSTOM_SHAPE_DIMENSION);
      entry.gridfinityScoopBack = typeof source.gridfinityScoopBack === "boolean" ? source.gridfinityScoopBack : fallbackEntry?.gridfinityScoopBack;
      entry.gridfinityScoopFront = typeof source.gridfinityScoopFront === "boolean" ? source.gridfinityScoopFront : fallbackEntry?.gridfinityScoopFront;
      entry.gridfinityScoopLeft = typeof source.gridfinityScoopLeft === "boolean" ? source.gridfinityScoopLeft : fallbackEntry?.gridfinityScoopLeft;
      entry.gridfinityScoopRight = typeof source.gridfinityScoopRight === "boolean" ? source.gridfinityScoopRight : fallbackEntry?.gridfinityScoopRight;
      entry.gridfinityScoopRadius = optionalShapeNumber(source.gridfinityScoopRadius, fallbackEntry?.gridfinityScoopRadius, 0, MAX_CUSTOM_SHAPE_DIMENSION);
      entry.gridfinityFloorHeight = optionalShapeNumber(source.gridfinityFloorHeight, fallbackEntry?.gridfinityFloorHeight, 0, MAX_CUSTOM_SHAPE_DIMENSION);
      entry.gridfinityOpenBack = typeof source.gridfinityOpenBack === "boolean" ? source.gridfinityOpenBack : fallbackEntry?.gridfinityOpenBack;
      entry.gridfinityOpenFront = typeof source.gridfinityOpenFront === "boolean" ? source.gridfinityOpenFront : fallbackEntry?.gridfinityOpenFront;
      entry.gridfinityOpenLeft = typeof source.gridfinityOpenLeft === "boolean" ? source.gridfinityOpenLeft : fallbackEntry?.gridfinityOpenLeft;
      entry.gridfinityOpenRight = typeof source.gridfinityOpenRight === "boolean" ? source.gridfinityOpenRight : fallbackEntry?.gridfinityOpenRight;
      entry.gridfinityLipChamfer = optionalShapeNumber(source.gridfinityLipChamfer, fallbackEntry?.gridfinityLipChamfer, 0, MAX_CUSTOM_SHAPE_DIMENSION);
      entry.gridfinityWallThickness = optionalShapeNumber(source.gridfinityWallThickness, fallbackEntry?.gridfinityWallThickness, 0, MAX_CUSTOM_SHAPE_DIMENSION);
      entry.gridfinityOpeningCorner = source.gridfinityOpeningCorner === "round" || source.gridfinityOpeningCorner === "chamfer" ? source.gridfinityOpeningCorner : fallbackEntry?.gridfinityOpeningCorner;
      entry.gridfinityOpeningCornerSize = optionalShapeNumber(source.gridfinityOpeningCornerSize, fallbackEntry?.gridfinityOpeningCornerSize, 0, MAX_CUSTOM_SHAPE_DIMENSION);
      entry.gridfinityPaddingBack = optionalShapeNumber(source.gridfinityPaddingBack, fallbackEntry?.gridfinityPaddingBack, 0, MAX_CUSTOM_SHAPE_DIMENSION);
      entry.gridfinityPaddingFront = optionalShapeNumber(source.gridfinityPaddingFront, fallbackEntry?.gridfinityPaddingFront, 0, MAX_CUSTOM_SHAPE_DIMENSION);
      entry.gridfinityPaddingLeft = optionalShapeNumber(source.gridfinityPaddingLeft, fallbackEntry?.gridfinityPaddingLeft, 0, MAX_CUSTOM_SHAPE_DIMENSION);
      entry.gridfinityPaddingRight = optionalShapeNumber(source.gridfinityPaddingRight, fallbackEntry?.gridfinityPaddingRight, 0, MAX_CUSTOM_SHAPE_DIMENSION);
      entry.gridfinityCornerRadius = optionalShapeNumber(source.gridfinityCornerRadius, fallbackEntry?.gridfinityCornerRadius, 0, MAX_CUSTOM_SHAPE_DIMENSION);
      entry.gridfinityBinCornerRadius = optionalShapeNumber(source.gridfinityBinCornerRadius, fallbackEntry?.gridfinityBinCornerRadius, 0, MAX_CUSTOM_SHAPE_DIMENSION);
      entry.gridfinityCompartmentsX = optionalShapeNumber(source.gridfinityCompartmentsX, fallbackEntry?.gridfinityCompartmentsX, 1, MAX_CUSTOM_SHAPE_DIMENSION, true);
      entry.gridfinityCompartmentsZ = optionalShapeNumber(source.gridfinityCompartmentsZ, fallbackEntry?.gridfinityCompartmentsZ, 1, MAX_CUSTOM_SHAPE_DIMENSION, true);
      entry.gridfinityDividerThickness = optionalShapeNumber(source.gridfinityDividerThickness, fallbackEntry?.gridfinityDividerThickness, 0, MAX_CUSTOM_SHAPE_DIMENSION);
    }
    if (kind === "knurl") {
      entry.knurlPattern = source.knurlPattern === "straight" || source.knurlPattern === "diamond" || source.knurlPattern === "round" ? source.knurlPattern : fallbackEntry?.knurlPattern;
      entry.knurlCount = optionalShapeNumber(source.knurlCount, fallbackEntry?.knurlCount, 6, 180, true);
      entry.knurlDepth = optionalShapeNumber(source.knurlDepth, fallbackEntry?.knurlDepth, 0.1, MAX_CUSTOM_SHAPE_DIMENSION);
      entry.knurlAngle = optionalShapeNumber(source.knurlAngle, fallbackEntry?.knurlAngle, 10, 60);
      entry.knurlChamfer = optionalShapeNumber(source.knurlChamfer, fallbackEntry?.knurlChamfer, 0, MAX_CUSTOM_SHAPE_DIMENSION);
    }
    if (kind === "loft") {
      const outline = (value: unknown, fallback: "round" | "rectangle" | "polygon" | undefined) =>
        value === "round" || value === "rectangle" || value === "polygon" ? value : fallback;
      entry.loftBottomOutline = outline(source.loftBottomOutline, fallbackEntry?.loftBottomOutline);
      entry.loftTopOutline = outline(source.loftTopOutline, fallbackEntry?.loftTopOutline);
      for (const key of ["loftBottomWidth", "loftBottomDepth", "loftTopWidth", "loftTopDepth"] as const) {
        entry[key] = optionalShapeNumber(source[key], fallbackEntry?.[key], 1, MAX_CUSTOM_SHAPE_DIMENSION);
      }
      for (const key of ["loftBottomCorner", "loftTopCorner", "loftWall"] as const) {
        entry[key] = optionalShapeNumber(source[key], fallbackEntry?.[key], 0, MAX_CUSTOM_SHAPE_DIMENSION / 2);
      }
      entry.loftTwist = optionalShapeNumber(source.loftTwist, fallbackEntry?.loftTwist, -360, 360);
      entry.loftSmooth = optionalShapeNumber(source.loftSmooth, fallbackEntry?.loftSmooth, 0, 1);
      entry.loftSegments = optionalShapeNumber(source.loftSegments, fallbackEntry?.loftSegments, 16, 360, true);
      entry.loftTiltX = optionalShapeNumber(source.loftTiltX, fallbackEntry?.loftTiltX, -45, 45);
      entry.loftTiltZ = optionalShapeNumber(source.loftTiltZ, fallbackEntry?.loftTiltZ, -45, 45);
      for (const key of ["loftBottomSides", "loftTopSides"] as const) {
        entry[key] = optionalShapeNumber(source[key], fallbackEntry?.[key], 3, 24, true);
      }
      for (const key of ["loftOffsetX", "loftOffsetZ"] as const) {
        entry[key] = optionalShapeNumber(source[key], fallbackEntry?.[key], -MAX_CUSTOM_SHAPE_DIMENSION, MAX_CUSTOM_SHAPE_DIMENSION);
      }
    }
    if (kind === "dovetail") {
      entry.dovetailNeckWidth = optionalShapeNumber(source.dovetailNeckWidth, fallbackEntry?.dovetailNeckWidth, 0.1, MAX_CUSTOM_SHAPE_DIMENSION);
      entry.dovetailClearance = optionalShapeNumber(source.dovetailClearance, fallbackEntry?.dovetailClearance, 0, 2);
    }
    if (kind === "roundedBox") {
      entry.cornerFillet = optionalShapeNumber(source.cornerFillet, fallbackEntry?.cornerFillet, 0, MAX_CUSTOM_SHAPE_DIMENSION / 2);
      entry.topBottomFillet = optionalShapeNumber(source.topBottomFillet, fallbackEntry?.topBottomFillet, 0, MAX_CUSTOM_SHAPE_DIMENSION / 2);
      entry.roundedBoxQuality = optionalShapeNumber(source.roundedBoxQuality, fallbackEntry?.roundedBoxQuality, 1, 32, true);
    }
    if (kind === "bentTube") {
      const profiles = ["round", "square", "hexagon", "octagon"];
      entry.bentTubeProfile = source.bentTubeProfile === undefined
        ? fallbackEntry?.bentTubeProfile
        : profiles.includes(source.bentTubeProfile)
          ? source.bentTubeProfile
          : fallbackEntry?.bentTubeProfile;
      entry.bentTubeInnerProfile = source.bentTubeInnerProfile === undefined
        ? fallbackEntry?.bentTubeInnerProfile
        : source.bentTubeInnerProfile === "none" || profiles.includes(source.bentTubeInnerProfile)
          ? source.bentTubeInnerProfile
          : fallbackEntry?.bentTubeInnerProfile;
      entry.bentTubeSize = optionalShapeNumber(source.bentTubeSize, fallbackEntry?.bentTubeSize, 1, 500);
      entry.bentTubeWall = optionalShapeNumber(source.bentTubeWall, fallbackEntry?.bentTubeWall, 0.2, 250);
      entry.bentTubeQuality = optionalShapeNumber(source.bentTubeQuality, fallbackEntry?.bentTubeQuality, 12, 96, true);
    }
    if (kind === "text") {
      entry.text = optionalShapeText(source.text, fallbackEntry?.text, 24);
      entry.font = source.font === undefined
        ? fallbackEntry?.font
        : ["Multilanguage", "Sans", "Serif", "Script", "Monospace", "Rounded", "Stencil"].includes(source.font)
          ? source.font
          : fallbackEntry?.font;
      entry.bevel = optionalShapeNumber(source.bevel, fallbackEntry?.bevel, 0, 8);
      entry.segments = optionalShapeNumber(source.segments, fallbackEntry?.segments, 0, 24, true);
      entry.textCurved = typeof source.textCurved === "boolean" ? source.textCurved : fallbackEntry?.textCurved;
      entry.textInward = typeof source.textInward === "boolean" ? source.textInward : fallbackEntry?.textInward;
      entry.textFlipped = typeof source.textFlipped === "boolean" ? source.textFlipped : fallbackEntry?.textFlipped;
      entry.textRadius = optionalShapeNumber(source.textRadius, fallbackEntry?.textRadius, 5, 500);
      entry.textSize = optionalShapeNumber(source.textSize, fallbackEntry?.textSize, 0.5, 200);
    }
    if (kind === "spring") {
      entry.springTurns = optionalShapeNumber(source.springTurns, fallbackEntry?.springTurns, 1, 60, true);
      entry.springWire = optionalShapeNumber(source.springWire, fallbackEntry?.springWire, 0.3, 120);
      entry.springQuality = optionalShapeNumber(source.springQuality, fallbackEntry?.springQuality, 12, 96, true);
      entry.springHand = source.springHand === undefined
        ? fallbackEntry?.springHand
        : source.springHand === "right" || source.springHand === "left"
          ? source.springHand
          : fallbackEntry?.springHand;
    }
    if (kind === "thread") {
      entry.threadRole = source.threadRole === undefined
        ? fallbackEntry?.threadRole
        : ["rod", "screw", "nut", "bore"].includes(source.threadRole)
          ? source.threadRole
          : fallbackEntry?.threadRole;
      entry.threadHead = source.threadHead === undefined
        ? fallbackEntry?.threadHead
        : ["cylinder", "countersunk", "hex"].includes(source.threadHead)
          ? source.threadHead
          : fallbackEntry?.threadHead;
      entry.threadHand = source.threadHand === undefined
        ? fallbackEntry?.threadHand
        : source.threadHand === "right" || source.threadHand === "left"
          ? source.threadHand
          : fallbackEntry?.threadHand;
      entry.threadProfile = source.threadProfile === undefined
        ? fallbackEntry?.threadProfile
        : isThreadProfile(source.threadProfile)
          ? source.threadProfile
          : fallbackEntry?.threadProfile;
      entry.threadDiameter = optionalShapeNumber(source.threadDiameter, fallbackEntry?.threadDiameter, 1, 160);
      entry.threadPitch = optionalShapeNumber(source.threadPitch, fallbackEntry?.threadPitch, 0.2, 12);
      entry.threadClearance = optionalShapeNumber(source.threadClearance, fallbackEntry?.threadClearance, 0, 1.5);
      entry.threadBoltClearance = optionalShapeNumber(source.threadBoltClearance, fallbackEntry?.threadBoltClearance, 0, 1);
      entry.threadAxialClearance = optionalShapeNumber(source.threadAxialClearance, fallbackEntry?.threadAxialClearance, 0, 1);
      entry.threadDepth = optionalShapeNumber(source.threadDepth, fallbackEntry?.threadDepth, 0.01, 40);
      entry.threadFlankAngle = optionalShapeNumber(source.threadFlankAngle, fallbackEntry?.threadFlankAngle, 10, 90);
      entry.threadQuality = optionalShapeNumber(source.threadQuality, fallbackEntry?.threadQuality, 12, 96, true);
      entry.threadChamfer = optionalShapeNumber(source.threadChamfer, fallbackEntry?.threadChamfer, 0, 40);
      entry.threadChamferBottom = optionalShapeNumber(source.threadChamferBottom, fallbackEntry?.threadChamferBottom, 0, 40);
      entry.threadHeadChamfer = optionalShapeNumber(source.threadHeadChamfer, fallbackEntry?.threadHeadChamfer, 0, 40);
    }
    if (kind === "gear") {
      entry.teeth = optionalShapeNumber(source.teeth, fallbackEntry?.teeth, 6, 150, true);
      entry.toothSize = optionalShapeNumber(source.toothSize, fallbackEntry?.toothSize, 0.2, MAX_CUSTOM_SHAPE_DIMENSION / 2);
      entry.toothWidth = optionalShapeNumber(source.toothWidth, fallbackEntry?.toothWidth, MIN_CUSTOM_SHAPE_DIMENSION, MAX_CUSTOM_SHAPE_DIMENSION);
      entry.centerHoleSize = optionalShapeNumber(source.centerHoleSize, fallbackEntry?.centerHoleSize, 0, MAX_CUSTOM_SHAPE_DIMENSION);
      entry.gearType = source.gearType === undefined
        ? fallbackEntry?.gearType
        : source.gearType === "spur" || source.gearType === "helical" || source.gearType === "herringbone" || source.gearType === "bevel" || source.gearType === "internal" || source.gearType === "rack"
          ? source.gearType
          : fallbackEntry?.gearType;
      entry.helixAngle = optionalShapeNumber(source.helixAngle, fallbackEntry?.helixAngle, -45, 45);
      entry.helixQuality = optionalShapeNumber(source.helixQuality, fallbackEntry?.helixQuality, 4, 32, true);
      entry.gearProfile = source.gearProfile === "involute" || source.gearProfile === "round" || source.gearProfile === "simple" ? source.gearProfile : fallbackEntry?.gearProfile;
      entry.gearPressureAngle = optionalShapeNumber(source.gearPressureAngle, fallbackEntry?.gearPressureAngle, 14.5, 30);
      entry.gearBacklash = optionalShapeNumber(source.gearBacklash, fallbackEntry?.gearBacklash, 0, 2);
      entry.gearRim = optionalShapeNumber(source.gearRim, fallbackEntry?.gearRim, 0.5, 60);
    }
    const compact = Object.fromEntries(Object.entries(entry).filter(([, entryValue]) => entryValue !== undefined)) as ShapeCustomization;
    if (Object.keys(compact).length > 0) normalized[kind] = compact;
  });
  return normalized;
}

/**
 * Groesstes Mass, das eine Kante annehmen darf, solange der Arbeitsbereich fuer
 * die Art keins vorgibt. Das Merkmalsfeld und die MCP-Bruecke rechnen mit
 * derselben Zahl - haetten sie je eine eigene, liesse sich ueber die Bruecke
 * etwas bauen, das der Regler daneben nicht mehr einstellen kann.
 */
export const DEFAULT_TAPER_DIMENSION_MAX = 480;

export function shapeDimensionLimit(workspace: WorkplaneWorkspaceSettings, kind: ShapeKind, appDefault: number) {
  return workspace.shapeCustomizations[kind]?.maxDimension ?? appDefault;
}

/**
 * The most a position can be typed in, in mm (100 m): far beyond any plate, only a guard against a typo
 * such as 1e9 (#425). The sliders and handles reach as far as the plate does, see `positionReach`.
 */
export const POSITION_TYPED_LIMIT = 100_000;

/**
 * How far the sliders of a position reach, along the plate and up: a plate and a half across, up to the
 * printer's height, never less than the 220 mm they always had. A number can be typed beyond it.
 */
export function positionReach(workspace: Pick<WorkplaneWorkspaceSettings, "width" | "depth">, printerHeight?: number | null) {
  return Math.max(220, Math.max(workspace.width, workspace.depth) * 1.5, printerHeight ?? 0);
}

/** The longest a ruler gets: what its Length slider reaches, and how far its handles pull it (#500). */
export const RULER_MAX_LENGTH = 500;

/**
 * How far a handle may pull a body (#181). The fixed ceilings (220 mm across, 180 mm high) date
 * from the fixed 200 mm plate; a larger plate or printer lets the handles go as far as it reaches,
 * and a body already larger - typed in - never shrinks the moment it is grabbed. A custom size
 * limit for the shape still wins over the plate.
 */
export function handleDimensionLimit(
  workspace: Pick<WorkplaneWorkspaceSettings, "width" | "depth" | "shapeCustomizations">,
  kind: ShapeKind,
  appDefault: number,
  axis: "across" | "height",
  currentSize: number,
  printerHeight?: number | null,
) {
  const custom = workspace.shapeCustomizations[kind]?.maxDimension;
  const current = Number.isFinite(currentSize) ? currentSize : 0;
  if (custom !== undefined) return Math.max(custom, current);
  // A ruler only measures and is never printed, so the plate is no limit for it: the handles go as far as its slider (#500).
  if (kind === "ruler" && axis === "across") return Math.max(RULER_MAX_LENGTH, workspace.width, workspace.depth, current);
  const plate = axis === "across"
    ? Math.max(workspace.width, workspace.depth)
    : printerHeight ?? Math.max(workspace.width, workspace.depth);
  return Math.max(appDefault, plate, current);
}

export function normalizeSnapGrid(value: unknown, fallback: GridSize = DEFAULT_SNAP_GRID): GridSize {
  if (parseCustomSnapGrid(value)) return value as GridSize;
  return fixedSnapGrids.includes(value as GridSize) ? (value as GridSize) : fallback;
}

/** Step the snap grid setting represents, in millimetres. "Off" yields 0. */
export function snapGridStep(size: GridSize) {
  if (size === "Off") {
    return 0;
  }
  if (size === "Brick") {
    return BRICK_SNAP_STEP;
  }
  const custom = parseCustomSnapGrid(size);
  if (custom) return custom.size / custom.divisor;
  const inch = /^(\d+)(?:\/(\d+))? in$/.exec(size);
  if (inch) return (Number(inch[1]) / Number(inch[2] ?? 1)) * 25.4;
  return Number.parseFloat(size) || 1;
}

/**
 * Distance one arrow-key press moves the selection.
 *
 * Pointer dragging has always snapped to the snap grid, while the keyboard
 * moved a hard-coded millimetre. With the grid at 5mm a drag landed on the
 * 5mm lattice and the very next arrow press pushed the shape off it again.
 * Following the grid keeps an aligned shape aligned; Shift keeps its former
 * meaning of a coarser step. With the grid off an arrow moves 0.01 mm.
 * Alt is the opposite of Shift (#749): a fifth of the step; with both, Shift wins.
 */
export function keyboardNudgeStep(size: GridSize, coarse: boolean, coarseFactor = KEYBOARD_NUDGE_COARSE_FACTOR, fine = false) {
  const grid = snapGridStep(size);
  const base = grid > 0 ? grid : KEYBOARD_NUDGE_FALLBACK_STEP;
  if (coarse) return base * coarseFactor;
  return fine ? base / KEYBOARD_NUDGE_FINE_DIVISOR : base;
}

/**
 * How many steps Shift and an arrow key move (#222): as many as the darker grid line is apart,
 * the "Darker grid line every" setting - 5 by default, and 10 as in similar tools. In inches the
 * setting is not offered, so it stays at 5.
 */
export function keyboardNudgeCoarseFactor(workspace: Pick<WorkplaneWorkspaceSettings, "units" | "gridMajorInterval">) {
  return workspace.units === "Imperial" ? KEYBOARD_NUDGE_COARSE_FACTOR : workspace.gridMajorInterval === 10 ? 10 : KEYBOARD_NUDGE_COARSE_FACTOR;
}

// Projects saved before the workplane turned ochre still carry the turquoise
// grid and its cool background. Anyone who never picked a colour of their own
// gets the current default; a deliberate choice is left alone.
const LEGACY_GRID_COLOR = "#28b4de";
const LEGACY_BACKGROUND = "#f8fbfc";

function migratedLegacyColor(value: string, legacy: string, current: string) {
  return value.trim().toLowerCase() === legacy ? current : value;
}

export function normalizeWorkspaceSettings(value: unknown, fallback: WorkplaneWorkspaceSettings = DEFAULT_WORKPLANE_WORKSPACE): WorkplaneWorkspaceSettings {
  const candidate = value && typeof value === "object" ? (value as Partial<WorkplaneWorkspaceSettings>) : {};
  const units = stringOrDefault(candidate.units, fallback.units);
  return {
    width: numberOrDefault(candidate.width, fallback.width),
    depth: numberOrDefault(candidate.depth, fallback.depth),
    sizePreset: stringOrDefault(candidate.sizePreset, fallback.sizePreset),
    // Older settings have no printer; that is "none", not the fallback's choice.
    printer: typeof candidate.printer === "string" ? candidate.printer : candidate.sizePreset === undefined ? fallback.printer : "",
    ...gridBlockForUnits(
      units,
      stringOrDefault(candidate.gridBlockPreset, fallback.gridBlockPreset),
      numberOrDefault(candidate.gridBlockSize, fallback.gridBlockSize),
    ),
    gridBlockOtherUnits: typeof candidate.gridBlockOtherUnits === "string" && candidate.gridBlockOtherUnits.trim() ? candidate.gridBlockOtherUnits : fallback.gridBlockOtherUnits,
    gridColor: migratedLegacyColor(colorOrDefault(candidate.gridColor, fallback.gridColor), LEGACY_GRID_COLOR, fallback.gridColor),
    gridMajorInterval: candidate.gridMajorInterval === 10 ? 10 : candidate.gridMajorInterval === 5 ? 5 : fallback.gridMajorInterval,
    gridMajorColor: candidate.gridMajorColor === "" ? "" : colorOrDefault(candidate.gridMajorColor, fallback.gridMajorColor),
    background: migratedLegacyColor(stringOrDefault(candidate.background, fallback.background), LEGACY_BACKGROUND, fallback.background),
    surfaceColor: colorOrDefault(candidate.surfaceColor, fallback.surfaceColor),
    showAxes: booleanOrDefault(candidate.showAxes, fallback.showAxes),
    showPlateLabels: booleanOrDefault(candidate.showPlateLabels, fallback.showPlateLabels),
    gridLinesGrow: booleanOrDefault(candidate.gridLinesGrow, fallback.gridLinesGrow),
    edgeLines: booleanOrDefault(candidate.edgeLines, fallback.edgeLines),
    edgeColor: colorOrDefault(candidate.edgeColor, fallback.edgeColor),
    strongHoles: booleanOrDefault(candidate.strongHoles, fallback.strongHoles),
    showShadows: booleanOrDefault(candidate.showShadows, fallback.showShadows),
    cameraInertia: booleanOrDefault(candidate.cameraInertia, fallback.cameraInertia),
    fastMode: booleanOrDefault(candidate.fastMode, fallback.fastMode),
    shadeContrast: Math.round(Math.max(-100, Math.min(100, numberOrDefault(candidate.shadeContrast, fallback.shadeContrast)))),
    softLighting: booleanOrDefault(candidate.softLighting, fallback.softLighting),
    shadowStrength: Math.round(Math.max(0, Math.min(100, numberOrDefault(candidate.shadowStrength, fallback.shadowStrength)))),
    shadowSoftness: Math.round(Math.max(0, Math.min(100, numberOrDefault(candidate.shadowSoftness, fallback.shadowSoftness)))),
    lightAzimuth: Math.round(Math.max(-180, Math.min(180, numberOrDefault(candidate.lightAzimuth, fallback.lightAzimuth)))),
    lightElevation: Math.round(Math.max(10, Math.min(90, numberOrDefault(candidate.lightElevation, fallback.lightElevation)))),
    sketchBackground: colorOrDefault(candidate.sketchBackground, fallback.sketchBackground),
    sketchGridColor: colorOrDefault(candidate.sketchGridColor, fallback.sketchGridColor),
    sketchPlateColor: colorOrDefault(candidate.sketchPlateColor, fallback.sketchPlateColor),
    overhangAngle: normalizeOverhangAngle(candidate.overhangAngle, fallback.overhangAngle),
    showGrid: booleanOrDefault(candidate.showGrid, fallback.showGrid),
    // "gridFromOrigin" (1.34.0) switched the grid back to the plate's corner;
    // it went again in 1.34.1 and is ignored: the grid always meets the axes.
    // Earlier names are ignored on purpose: "cruiseShapes" (until 1.18.6) was on
    // but did nothing, and "placeShapesByClick" (1.18.7) was off by default -
    // with 1.18.8 click placement is on for everyone unless switched off again.
    clickToPlaceShapes: booleanOrDefault(candidate.clickToPlaceShapes, fallback.clickToPlaceShapes),
    selectBeforeMove: booleanOrDefault(candidate.selectBeforeMove, fallback.selectBeforeMove),
    frameByDirection: booleanOrDefault(candidate.frameByDirection, fallback.frameByDirection),
    pasteCentered: booleanOrDefault(candidate.pasteCentered, fallback.pasteCentered),
    doubleClickOpensSketch: booleanOrDefault(candidate.doubleClickOpensSketch, fallback.doubleClickOpensSketch),
    doubleClickOpensGroup: booleanOrDefault(candidate.doubleClickOpensGroup, fallback.doubleClickOpensGroup),
    doubleClickCentersView: booleanOrDefault(candidate.doubleClickCentersView, fallback.doubleClickCentersView),
    objectSnap: booleanOrDefault(candidate.objectSnap, fallback.objectSnap),
    stlAsDownload: booleanOrDefault(candidate.stlAsDownload, fallback.stlAsDownload),
    confirmTabClose: booleanOrDefault(candidate.confirmTabClose, fallback.confirmTabClose),
    dimensionsAlwaysVisible: booleanOrDefault(candidate.dimensionsAlwaysVisible, fallback.dimensionsAlwaysVisible),
    showRotationAngles: booleanOrDefault(candidate.showRotationAngles, fallback.showRotationAngles),
    zoomSpeed: numberOrDefault(candidate.zoomSpeed, fallback.zoomSpeed),
    units,
    inchFormat: candidate.inchFormat === "decimal" ? "decimal" : "fraction",
    scale: normalizeScaleForUnits(units, stringOrDefault(candidate.scale, fallback.scale)),
    accuracy: accuracyOrDefault(candidate.accuracy, fallback.accuracy),
    historyLimit: historyLimitOrDefault(candidate.historyLimit, fallback.historyLimit),
    booleanTriangleLimit: booleanTriangleLimitOrDefault(candidate.booleanTriangleLimit, fallback.booleanTriangleLimit),
    customSnapGrids: normalizeCustomSnapGrids(candidate.customSnapGrids, fallback.customSnapGrids),
    shapeCustomizations: normalizeShapeCustomizations(candidate.shapeCustomizations, fallback.shapeCustomizations),
  };
}

export function canBeginShapeDrag(selectBeforeMove: boolean, alreadySelected: boolean) {
  return !selectBeforeMove || alreadySelected;
}

export function workplaneSettingsFingerprint(workspace: WorkplaneWorkspaceSettings, snapGrid: GridSize) {
  return JSON.stringify({ workspace, snapGrid });
}

export function workspaceHydrationSyncDecision(pendingFingerprint: string | null, currentFingerprint: string) {
  if (pendingFingerprint === null) {
    return { shouldSync: true, pendingFingerprint: null };
  }
  return {
    shouldSync: false,
    pendingFingerprint: currentFingerprint === pendingFingerprint ? null : pendingFingerprint,
  };
}

/**
 * "Make default" is meant for every design created afterwards, so it lives
 * under one key for the whole browser. It used to be filed under the id of
 * the project it was pressed in, which a new project never looks up - a new
 * design fell back to the built-in settings, shadows and zoom speed included.
 */
export const WORKSPACE_DEFAULT_STORAGE_KEY = "layerling.workspaceDefault.global";
/** Fired on the window when this browser's default has just been saved. */
export const WORKSPACE_DEFAULT_SAVED_EVENT = "layerling:workspace-default-saved";

function browserStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/**
 * The grid as the app starts it - visibility, colours, spacing and line weight - for "Reset grid" on the
 * Workplane page (#503: a grid colour that matched the plate hid every line, and a new design started from
 * the same saved default). Inch grids go back to their own standard spacing; the size of the plate and the
 * printer are not touched.
 */
export function standardGridSettings(units: string) {
  const inches = units === "Imperial";
  return {
    showGrid: DEFAULT_WORKPLANE_WORKSPACE.showGrid,
    gridColor: DEFAULT_WORKPLANE_WORKSPACE.gridColor,
    gridMajorColor: DEFAULT_WORKPLANE_WORKSPACE.gridMajorColor,
    gridMajorInterval: DEFAULT_WORKPLANE_WORKSPACE.gridMajorInterval,
    gridLinesGrow: DEFAULT_WORKPLANE_WORKSPACE.gridLinesGrow,
    gridBlockPreset: inches ? DEFAULT_IMPERIAL_GRID_BLOCK_PRESET : DEFAULT_METRIC_GRID_BLOCK_PRESET,
    gridBlockSize: inches ? (inchGridPresetMm(DEFAULT_IMPERIAL_GRID_BLOCK_PRESET) ?? DEFAULT_WORKPLANE_WORKSPACE.gridBlockSize) : DEFAULT_WORKPLANE_WORKSPACE.gridBlockSize,
  };
}

/**
 * Puts the grid of the default saved with "Make default" back to the standard, leaving everything else of it
 * as it is, so that new designs start with a visible grid too. False when there is no saved default.
 */
export function resetGridInSavedDefault(storage: Storage | null = browserStorage()) {
  const saved = readWorkspaceDefault(storage);
  if (!saved || !storage) return false;
  return saveWorkspaceDefault({ ...saved.workspace, ...standardGridSettings(saved.workspace.units) }, saved.snap, storage);
}

/**
 * "Use my default" (#754): the look the user saved with "Make default" - colours, grid, shadows, camera, shape
 * starts - put on the design that is open, which a file brings with its own. A printer in the saved default comes
 * along with its plate, since that is the printer the user prints on (#850); without one the design keeps its plate
 * and printer. The units and how they are shown stay with the design. The grid spacing stays too when the saved
 * default counts in other units, since it is a length in those.
 */
export function workspaceWithSavedDefault(current: WorkplaneWorkspaceSettings, saved: WorkplaneWorkspaceSettings): WorkplaneWorkspaceSettings {
  const sameUnits = saved.units === current.units;
  const plate = saved.printer ? saved : current;
  return {
    ...saved,
    width: plate.width,
    depth: plate.depth,
    sizePreset: plate.sizePreset,
    printer: plate.printer,
    units: current.units,
    inchFormat: current.inchFormat,
    scale: current.scale,
    accuracy: current.accuracy,
    ...(sameUnits ? {} : { gridBlockPreset: current.gridBlockPreset, gridBlockSize: current.gridBlockSize }),
  };
}

export function readWorkspaceDefault(storage: Storage | null = browserStorage()) {
  if (!storage) {
    return null;
  }
  try {
    const parsed = JSON.parse(storage.getItem(WORKSPACE_DEFAULT_STORAGE_KEY) ?? "null") as {
      workspace?: unknown;
      snap?: unknown;
    } | null;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    return {
      workspace: normalizeWorkspaceSettings(parsed.workspace),
      snap: normalizeSnapGrid(parsed.snap, DEFAULT_SNAP_GRID),
    };
  } catch {
    return null;
  }
}

/**
 * "Save as default" on a shape (#483): the values of its kind also go into the browser's default workspace, so a new
 * design starts with them, not only the design that is open. Only that kind's entry changes, whatever else the
 * default holds; with no entry (Reset defaults) the kind goes back to what the app starts it with.
 */
export function saveShapeDefaultsForNewDesigns(
  kind: ShapeKind,
  entry: ShapeCustomization | null,
  storage: Storage | null = browserStorage(),
) {
  const stored = readWorkspaceDefault(storage);
  const base = stored?.workspace ?? normalizeWorkspaceSettings(undefined);
  const shapeCustomizations = { ...base.shapeCustomizations };
  if (entry) shapeCustomizations[kind] = entry;
  else delete shapeCustomizations[kind];
  return saveWorkspaceDefault({ ...base, shapeCustomizations }, stored?.snap ?? DEFAULT_SNAP_GRID, storage);
}

export function saveWorkspaceDefault(
  workspace: WorkplaneWorkspaceSettings,
  snap: GridSize,
  storage: Storage | null = browserStorage(),
) {
  if (!storage) {
    return false;
  }
  try {
    storage.setItem(WORKSPACE_DEFAULT_STORAGE_KEY, JSON.stringify({
      workspace: normalizeWorkspaceSettings(workspace),
      snap: normalizeSnapGrid(snap, DEFAULT_SNAP_GRID),
    }));
    // The server store keeps a copy for every browser (serverWorkspaceDefault.ts).
    if (typeof window !== "undefined" && storage === browserStorage()) window.dispatchEvent(new Event(WORKSPACE_DEFAULT_SAVED_EVENT));
    return true;
  } catch {
    return false;
  }
}

/**
 * The view settings as they take effect: fast mode switches shadows, edge lines on all bodies and
 * camera inertia off, whatever they are set to, and keeps their own values for when it goes off.
 */
export function effectiveViewSettings<T extends Pick<WorkplaneWorkspaceSettings, "showShadows" | "edgeLines" | "cameraInertia" | "fastMode">>(workspace: T): T {
  if (!workspace.fastMode) return workspace;
  return { ...workspace, showShadows: false, edgeLines: false, cameraInertia: false };
}

/** How many pixels the view draws per screen pixel: fast mode draws no more than the screen has. */
export function viewPixelRatio(workspace: Pick<WorkplaneWorkspaceSettings, "fastMode">, devicePixelRatio: number) {
  return workspace.fastMode ? 1 : Math.min(Math.max(1, devicePixelRatio || 1), 2);
}
