import type { AppThemePalette, ResolvedAppTheme } from "@/lib/appTheme";

const WORKPLANE_BOUNDARY_EPSILON = 0.0001;

export const WORKPLANE_LINE_ELEVATION = 0;
export const WORKPLANE_MAJOR_GRID_INTERVAL = 5;
export const DEFAULT_WORKPLANE_GRID_COLOR = "#c08a12";
/** The light theme's work-area background and workplane surface, which can be changed in the settings. */
export const DEFAULT_WORKPLANE_BACKGROUND = "#fbf8f0";
export const DEFAULT_WORKPLANE_SURFACE_COLOR = "#fdf4dd";
/** The sketch view's background and grid colour in the light theme, which can be changed in the settings. */
export const DEFAULT_SKETCH_BACKGROUND = "#fcfbf8";
export const DEFAULT_SKETCH_GRID_COLOR = "#d9822b";
/** The sketch's area under the grid in the light theme (#143). */
export const DEFAULT_SKETCH_PLATE_COLOR = "#f5f0e7";
/** Edge lines on every body, when switched on: black like in similar tools. */
export const DEFAULT_EDGE_LINE_COLOR = "#000000";

/** Width to height of the label texture, and so of the mesh that carries it. */
export const WORKPLANE_LABEL_ASPECT = 4;
const WORKPLANE_LABEL_MIN_HEIGHT = 3;
const WORKPLANE_LABEL_MAX_HEIGHT = 26;
const WORKPLANE_LABEL_HEIGHT_RATIO = 0.085;
const WORKPLANE_LABEL_MAX_WIDTH_RATIO = 0.62;
/**
 * Gap between the plane edge and the nearest edge of the text, as a share of
 * the text height. The same on both axes, so the label sits squarely in the
 * corner rather than closer to one edge than the other.
 *
 * Kept small: the texture carries padding of its own, so the gap that reads on
 * screen is already wider than this, and a caption that drifts away from its
 * corner wastes the plane it is supposed to leave free.
 */
const WORKPLANE_LABEL_INSET_RATIO = 0.05;

export type WorkplaneLabelLayout = {
  width: number;
  height: number;
  /** Distance in front of the plane centre, towards the near edge. */
  depthOffset: number;
  /** Distance from the plane centre towards the left edge, so negative. */
  lateralOffset: number;
};

/**
 * Size and placement of the workplane label, in workspace units.
 *
 * It sits in the near left corner rather than centred on the front edge, so it
 * reads as a caption for the plane and leaves the middle of the workspace free.
 * It scales with the plane so it stays legible on a small workspace without
 * dominating a large one, and never reaches the edges it sits between.
 */
export function workplaneLabelLayout(width: number, depth: number): WorkplaneLabelLayout {
  const safeWidth = Number.isFinite(width) && width > 0 ? width : 0;
  const safeDepth = Number.isFinite(depth) && depth > 0 ? depth : 0;
  if (safeWidth <= 0 || safeDepth <= 0) {
    return { width: 0, height: 0, depthOffset: 0, lateralOffset: 0 };
  }

  const preferredHeight = Math.min(safeWidth, safeDepth) * WORKPLANE_LABEL_HEIGHT_RATIO;
  const clampedHeight = Math.min(
    Math.max(preferredHeight, WORKPLANE_LABEL_MIN_HEIGHT),
    WORKPLANE_LABEL_MAX_HEIGHT,
  );
  const maxLabelWidth = safeWidth * WORKPLANE_LABEL_MAX_WIDTH_RATIO;
  const labelWidth = Math.min(clampedHeight * WORKPLANE_LABEL_ASPECT, maxLabelWidth);
  const labelHeight = labelWidth / WORKPLANE_LABEL_ASPECT;
  const inset = labelHeight * WORKPLANE_LABEL_INSET_RATIO;
  // The axis arrows share the front left corner, and the name does not make room for them: it starts at
  // the corner as if they were not there (Stefan, 14.10.2026), so it takes the same small gap from both
  // edges and leaves as much of the plate free as it can.
  return {
    width: labelWidth,
    height: labelHeight,
    depthOffset: Math.max(0, safeDepth / 2 - inset - labelHeight / 2),
    lateralOffset: Math.min(0, -labelWidth / 2, -safeWidth / 2 + inset + labelWidth / 2),
  };
}

export type WorkplaneGridCoordinate = {
  coordinate: number;
  index: number;
};

export type WorkplaneGridPalette = {
  minor: { color: string; opacity: number };
  major: { color: string; opacity: number };
  axis: { color: string; opacity: number };
  border: { color: string; opacity: number };
};

export type WorkplaneThemePalette = {
  sceneBackground: string;
  surface: { color: string; opacity: number };
  grid: WorkplaneGridPalette;
};

export function workplaneGridPalette(
  theme: ResolvedAppTheme = "light",
  configuredColor: string = DEFAULT_WORKPLANE_GRID_COLOR,
  palette: AppThemePalette = "default",
  majorColor = "",
): WorkplaneGridPalette {
  const base = baseWorkplaneGridPalette(theme, configuredColor, palette);
  // The darker lines in a colour of their own (#143); the centre cross and the border take it
  // too, a little stronger, as similar tools draw them.
  if (!/^#[0-9a-f]{6}$/i.test(majorColor)) return base;
  return {
    ...base,
    major: { color: majorColor, opacity: theme === "dark" ? 0.8 : 0.9 },
    axis: { color: majorColor, opacity: 1 },
    border: { color: majorColor, opacity: 1 },
  };
}

function baseWorkplaneGridPalette(theme: ResolvedAppTheme, configuredColor: string, palette: AppThemePalette): WorkplaneGridPalette {
  if (configuredColor.toLowerCase() !== DEFAULT_WORKPLANE_GRID_COLOR) {
    return {
      minor: { color: configuredColor, opacity: theme === "dark" ? 0.42 : 0.38 },
      major: { color: configuredColor, opacity: theme === "dark" ? 0.7 : 0.68 },
      axis: { color: configuredColor, opacity: 0.94 },
      border: { color: configuredColor, opacity: 0.9 },
    };
  }
  if (theme === "dark" && palette === "graphite") {
    // Light grey lines on a neutral ground, no yellow cast.
    return {
      minor: { color: "#8c8c8c", opacity: 0.45 },
      major: { color: "#b4b4b4", opacity: 0.7 },
      axis: { color: "#dcdcdc", opacity: 0.92 },
      border: { color: "#c8c8c8", opacity: 0.88 },
    };
  }
  if (theme === "dark") {
    return {
      minor: { color: "#6b5a2a", opacity: 0.5 },
      major: { color: "#8f7526", opacity: 0.72 },
      axis: { color: "#c9a23c", opacity: 0.92 },
      border: { color: "#b08f2f", opacity: 0.88 },
    };
  }
  return {
    minor: { color: "#e0c377", opacity: 0.55 },
    major: { color: "#c08a12", opacity: 0.7 },
    axis: { color: "#9c720c", opacity: 0.88 },
    border: { color: "#b8830f", opacity: 0.9 },
  };
}

export function workplaneThemePalette(
  theme: ResolvedAppTheme,
  configuredBackground: string,
  configuredGridColor: string = DEFAULT_WORKPLANE_GRID_COLOR,
  palette: AppThemePalette = "default",
  configuredSurface: string = DEFAULT_WORKPLANE_SURFACE_COLOR,
  configuredMajorColor = "",
): WorkplaneThemePalette {
  // The background and the surface colour belong to the light theme; the dark
  // themes keep their own, so a light choice cannot spoil them.
  if (theme === "dark" && palette === "graphite") {
    return {
      sceneBackground: "#1e1e1e",
      surface: { color: "#343434", opacity: 0.9 },
      grid: workplaneGridPalette("dark", configuredGridColor, "graphite", configuredMajorColor),
    };
  }
  return theme === "dark"
    ? {
        sceneBackground: "#141210",
        surface: { color: "#332b16", opacity: 0.9 },
        grid: workplaneGridPalette("dark", configuredGridColor, "default", configuredMajorColor),
      }
    : {
        sceneBackground: configuredBackground,
        surface: { color: configuredSurface, opacity: 0.68 },
        grid: workplaneGridPalette("light", configuredGridColor, "default", configuredMajorColor),
      };
}

/** Grid sizes offered with Imperial units; the line spacing in millimetres follows from the name. */
export const IMPERIAL_GRID_BLOCK_PRESETS = ["1/8 in", "1/4 in", "1/2 in", "1 in"] as const;
export const DEFAULT_IMPERIAL_GRID_BLOCK_PRESET = "1/4 in";
export const DEFAULT_METRIC_GRID_BLOCK_PRESET = "5 mm";
const MM_PER_INCH = 25.4;

/** Millimetres of an inch grid preset such as "1/4 in", or null for anything else. */
export function inchGridPresetMm(preset: string): number | null {
  const match = /^(\d+)(?:\/(\d+))? in$/.exec(preset);
  if (!match) return null;
  const value = Number(match[1]) / (match[2] ? Number(match[2]) : 1);
  return value > 0 ? value * MM_PER_INCH : null;
}

export type WorkplaneGridLayout = {
  step: number;
  /** Every how many lines a stronger one is drawn. */
  majorInterval: number;
};

/**
 * How the plate's grid is laid out. Lines always run through the origin, so
 * the stronger lines meet the axes whatever the plate measures. Millimetre
 * grids draw a stronger line every fifth, inch grids on every whole inch.
 */
export function workplaneGridLayout(workspace: { gridBlockSize: number; gridBlockPreset?: string; units?: string; gridMajorInterval?: number }): WorkplaneGridLayout {
  const step = Math.min(200, Math.max(1, workspace.gridBlockSize));
  const inches = inchGridPresetMm(workspace.gridBlockPreset ?? "") !== null || workspace.units === "Imperial";
  // A millimetre grid draws its darker line every fifth or, as similar tools, every tenth step (#143).
  if (!inches) return { step, majorInterval: workspace.gridMajorInterval === 10 ? 10 : WORKPLANE_MAJOR_GRID_INTERVAL };
  const perInch = Math.round(MM_PER_INCH / step);
  const majorInterval = Math.abs(perInch * step - MM_PER_INCH) < 1e-6 && perInch >= 2 ? perInch : step >= MM_PER_INCH - 1e-6 ? 12 : WORKPLANE_MAJOR_GRID_INTERVAL;
  return { step, majorInterval };
}

/** Lines through the origin at whole steps, inside the plate; `index` counts from the origin (negative to the left). */
export function centeredWorkplaneGridCoordinates(span: number, step: number): WorkplaneGridCoordinate[] {
  if (!Number.isFinite(span) || !Number.isFinite(step) || span <= 0 || step <= 0) return [];
  const halfSpan = span / 2;
  const last = Math.floor((halfSpan - WORKPLANE_BOUNDARY_EPSILON) / step);
  const coordinates: WorkplaneGridCoordinate[] = [];
  for (let index = -last; index <= last; index += 1) {
    const coordinate = index === 0 ? 0 : index * step;
    if (Math.abs(Math.abs(coordinate) - halfSpan) < WORKPLANE_BOUNDARY_EPSILON) continue;
    coordinates.push({ coordinate, index });
  }
  return coordinates;
}

/** The grid lines across `span` for a layout, each marked as the axis, a major or a minor line. */
/**
 * How wide the grid's lines lie on the plate, in millimetres, besides their one-pixel line (#143):
 * a band that grows as you zoom in, as every grid line does in similar tools, while the pixel line
 * keeps the grid visible from afar. A twentieth of the grid step for the fine lines, twice that for
 * the darker ones, so a 1 mm grid gets 0.05 and 0.1 mm.
 */
export function workplaneGridBandWidths(step: number) {
  const minor = Math.min(0.5, Math.max(0.02, (Number.isFinite(step) && step > 0 ? step : 1) * 0.05));
  return { minor, major: minor * 2 };
}

/** How wide the centre cross stays on the screen at least, in CSS pixels, however far out you zoom (Discussion #1666). */
export const AXIS_MIN_PIXELS = 3;

/**
 * How many mm one CSS pixel covers at a point `depth` mm in front of the camera: for a perspective camera from its
 * vertical field of view, for an orthographic one from its frame and zoom. Not finite when it cannot be told.
 */
export function mmPerScreenPixel(
  camera: { perspective: true; fovDegrees: number } | { perspective: false; top: number; bottom: number; zoom: number },
  depth: number,
  viewportHeight: number,
) {
  if (!(viewportHeight > 0)) return Number.NaN;
  if (camera.perspective) return (2 * Math.max(0, depth) * Math.tan((camera.fovDegrees * Math.PI) / 360)) / viewportHeight;
  return (camera.top - camera.bottom) / (camera.zoom || 1) / viewportHeight;
}

/** The centre cross's width in mm: its own band, or wider when that would come out thinner than AXIS_MIN_PIXELS on the screen. */
export function axisCrossWidth(bandWidth: number, mmPerPixel: number) {
  return Number.isFinite(mmPerPixel) && mmPerPixel > 0 ? Math.max(bandWidth, AXIS_MIN_PIXELS * mmPerPixel) : bandWidth;
}

export function workplaneGridLines(span: number, layout: WorkplaneGridLayout) {
  const coordinates = centeredWorkplaneGridCoordinates(span, layout.step);
  return coordinates.map(({ coordinate, index }) => ({
    coordinate,
    kind: coordinate === 0 ? "axis" as const : index % layout.majorInterval === 0 ? "major" as const : "minor" as const,
  }));
}

/**
 * Light levels of the scene: ambient (hemisphere), the key light that casts the shadows and
 * the fill light. Contrast moves light from the even ambient to the key light, so shaded
 * sides get darker and the shadows show more; 0 is the original balance.
 */
export function sceneLightLevels(contrast: number) {
  const c = Math.max(-100, Math.min(100, Number.isFinite(contrast) ? contrast : 0)) / 100;
  if (c <= 0) return { ambient: 2.1 * (1 - 0.5 * c), key: 3.1 * (1 + 0.5 * c), fill: 1.2, head: 0 };
  // Towards "punchy" the range reaches further than it used to (#143): the even light and the
  // fill light fade much more, so shaded sides and shadows get really dark at the top end.
  // The first half of the slider is close to the old one.
  const strong = c * c;
  return { ambient: 2.1 * (1 - 0.5 * c - 0.3 * strong), key: 3.1 * (1 + 0.5 * c + 0.2 * strong), fill: 1.2 * (1 - 0.6 * strong), head: 0 };
}

/**
 * Soft light (#812): most of the light comes from the viewer's eye (`head`, carried with the camera), so a face
 * turned towards you is lit and none is left dark, and the fixed lights are much weaker, so a face turned up is no
 * longer burnt out to white (the renderer clips, it has no tone mapping). The key light stays a little for the
 * shadows. Contrast still works: towards "punchy" the eye light takes over from the even light.
 */
export function softSceneLightLevels(contrast: number) {
  const c = Math.max(-100, Math.min(100, Number.isFinite(contrast) ? contrast : 0)) / 100;
  return { ambient: 1.5 * (1 - 0.4 * c), key: 0.9 * (1 + 0.3 * c), fill: 0.25, head: 2.4 * (1 + 0.25 * c) };
}

/** Where the main light stands by default: in front, to the right and above, as layerling always had it. */
export const DEFAULT_LIGHT_AZIMUTH = 43;
export const DEFAULT_LIGHT_ELEVATION = 52;

/**
 * The main light's position for a direction (#143): the azimuth turns it round the plate, 0° from
 * the front and 90° from the right; the elevation lifts it, 90° straight above as in similar tools.
 * Straight above is held a hair off the vertical, so the shadow camera keeps an up direction.
 */
export function keyLightPosition(azimuth: number, elevation: number, distance = 165) {
  const az = ((Number.isFinite(azimuth) ? azimuth : DEFAULT_LIGHT_AZIMUTH) * Math.PI) / 180;
  const el = (Math.max(10, Math.min(89.5, Number.isFinite(elevation) ? elevation : DEFAULT_LIGHT_ELEVATION)) * Math.PI) / 180;
  return {
    x: distance * Math.cos(el) * Math.sin(az),
    y: distance * Math.sin(el),
    z: distance * Math.cos(el) * Math.cos(az),
  };
}

/**
 * The fill light, opposite the main light: its old fixed place turned round the plate by as much
 * as the main light was turned from its default, so the default looks exactly as it always did.
 */
export function fillLightPosition(azimuth: number) {
  const turn = (((Number.isFinite(azimuth) ? azimuth : DEFAULT_LIGHT_AZIMUTH) - DEFAULT_LIGHT_AZIMUTH) * Math.PI) / 180;
  const x = -95;
  const z = -60;
  return { x: x * Math.cos(turn) + z * Math.sin(turn), y: 45, z: z * Math.cos(turn) - x * Math.sin(turn) };
}

/** How far the shadow edge is blurred, in shadow-map texels: 0 % is the crisp edge of before. */
export function shadowBlurRadius(softness: number) {
  const s = Math.max(0, Math.min(100, Number.isFinite(softness) ? softness : 0)) / 100;
  return 1 + s * 14;
}

/** The colours of the axis arrows, as in Bambu Studio and OrcaSlicer: X red, Y green, Z blue. */
export const AXIS_ARROW_COLORS = { x: "#e5484d", y: "#3fae5a", z: "#3b82f6" } as const;

/**
 * Where the axis arrows stand and how long they are: at the front left corner of the plate, so
 * that X and Y both run along its edges and stay on it, long enough to read at a glance and never
 * longer than a fifth of the smaller side. The arrows point along the numbers' directions,
 * right-handed (#182): X to the right, Y towards the back (the way the Y field counts) and Z up.
 */
export function axisArrowLayout(width: number, depth: number) {
  const smaller = Math.max(1, Math.min(width, depth));
  const length = Math.max(6, Math.min(24, smaller * 0.12, smaller * 0.2));
  return { x: -width / 2, z: depth / 2, length };
}
