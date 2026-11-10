/**
 * Paint (Modify group, Surface): parts of a body's surface in colours of their own, for printing in
 * several colours, as the paint tools of the slicers do it, only kept with the design. The body stays
 * one body of one shape; what it carries is a list of strokes, each a region and a colour, and the
 * regions are found again on the body's mesh whenever it is built (paintMesh.ts), so they move,
 * turn and stretch with it and survive a change of its size.
 *
 * - "fill" spreads from the point clicked over the surface until it meets an edge sharper than
 *   `angle`: a flat face, the wall of a cylinder, the floor of a pocket or the inside of a hole.
 * - "circle" is a round patch `diameter` across, centred on the point clicked and laid onto the
 *   surface along its normal there.
 * - "lasso" is a shape drawn on the screen: the surface inside it that the eye saw, not the back of
 *   the body behind it.
 *
 * A stroke without a colour is the eraser: its region goes back to the body's own colour. The
 * strokes are laid in order, a later one over an earlier one. This file holds the data and its
 * checks, with no geometry; paintMesh.ts lays the strokes onto a mesh.
 */
import { normalizeHexColor } from "@/lib/coloredImport";
import { groupShowsPartColors } from "@/lib/groupColors";
import { isNonSolidShape } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

export type PaintMode = "fill" | "circle" | "lasso";
export type PaintVec3 = [number, number, number];

/**
 * One stroke of paint, in the body's own frame: its mesh as built before it is placed, standing on
 * y = 0 and centred over x = z = 0, in millimetres at the size the body had when the stroke was made
 * (`size`). When the body is resized, the stroke is stretched with it by the new size over `size`.
 */
export type PaintStroke = {
  mode: PaintMode;
  /** "#rrggbb"; left out, the stroke erases: its region goes back to the body's own colour. */
  color?: string;
  /** Width, height and depth of the body when the stroke was made, in mm. */
  size: PaintVec3;
  /** fill and circle: the point clicked on the surface. */
  point?: PaintVec3;
  /** fill and circle: the surface's outward normal there, of length 1. */
  normal?: PaintVec3;
  /** fill: how sharp an edge, in degrees between the faces, stops the fill. */
  angle?: number;
  /** circle: how wide the patch is, in mm. */
  diameter?: number;
  /**
   * lasso: where the eye was. For a view in perspective the eye itself, and the outline lies on the
   * plane one millimetre in front of it; for a flat (orthographic) view a point on the line of sight
   * through the middle of the screen, and the outline is in millimetres across the view.
   */
  origin?: PaintVec3;
  /** lasso: the screen's right, up and the direction the eye looked in, each of length 1. */
  right?: PaintVec3;
  up?: PaintVec3;
  forward?: PaintVec3;
  /** lasso: whether the view was in perspective. */
  perspective?: boolean;
  /** lasso: the shape drawn, as [right, up] pairs (see origin). */
  outline?: Array<[number, number]>;
};

/** What the paint panel works with: the mode, the colour and the eraser, the angle of a fill and a circle's size. */
export type PaintToolSettings = {
  mode: PaintMode;
  /** "#rrggbb" the strokes paint in. */
  color: string;
  /** The strokes take the paint off again instead. */
  erase: boolean;
  /** fill: degrees between two faces from which their edge stops the fill. */
  angle: number;
  /** circle: diameter in mm. */
  diameter: number;
};

export const PAINT_DEFAULT_ANGLE = 30;
export const PAINT_MIN_ANGLE = 1;
export const PAINT_MAX_ANGLE = 90;
export const PAINT_DEFAULT_DIAMETER = 10;
export const PAINT_MIN_DIAMETER = 0.2;
export const PAINT_MAX_DIAMETER = 1000;
/** A body carries this many strokes at most; "Clear all" makes room again. */
export const PAINT_MAX_STROKES = 500;
/** A lasso is kept with this many points at most; a longer one is thinned out evenly. */
export const PAINT_MAX_OUTLINE_POINTS = 400;
/** The colour a first stroke starts with when the design offers nothing else: a red that stands out on the default blue. */
export const PAINT_DEFAULT_COLOR = "#e03131";

export const DEFAULT_PAINT_TOOL: PaintToolSettings = {
  mode: "fill",
  color: PAINT_DEFAULT_COLOR,
  erase: false,
  angle: PAINT_DEFAULT_ANGLE,
  diameter: PAINT_DEFAULT_DIAMETER,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** Keeps every setting of the panel inside what the tool offers. */
export function normalizePaintTool(settings: Partial<PaintToolSettings>): PaintToolSettings {
  return {
    mode: settings.mode === "circle" || settings.mode === "lasso" ? settings.mode : "fill",
    color: normalizeHexColor(settings.color) ?? DEFAULT_PAINT_TOOL.color,
    erase: settings.erase === true,
    angle: clamp(finite(settings.angle) ? settings.angle : PAINT_DEFAULT_ANGLE, PAINT_MIN_ANGLE, PAINT_MAX_ANGLE),
    diameter: clamp(finite(settings.diameter) ? settings.diameter : PAINT_DEFAULT_DIAMETER, PAINT_MIN_DIAMETER, PAINT_MAX_DIAMETER),
  };
}

function vec3(value: unknown): PaintVec3 | null {
  return Array.isArray(value) && value.length === 3 && value.every(finite) ? [value[0], value[1], value[2]] : null;
}

function unit(value: unknown): PaintVec3 | null {
  const vector = vec3(value);
  if (!vector) return null;
  const length = Math.hypot(...vector);
  return length > 1e-9 ? [vector[0] / length, vector[1] / length, vector[2] / length] : null;
}

/** A drawn outline with at most `limit` points, every n-th kept so the shape stays as drawn. */
export function thinnedOutline(points: ReadonlyArray<[number, number]>, limit = PAINT_MAX_OUTLINE_POINTS): Array<[number, number]> {
  if (points.length <= limit) return points.map(([x, y]) => [x, y]);
  const step = points.length / limit;
  return Array.from({ length: limit }, (_, index) => {
    const [x, y] = points[Math.floor(index * step)];
    return [x, y];
  });
}

/**
 * A stroke as it is kept, or null when it cannot be one: read from a saved design or from an MCP call,
 * so everything is checked. Numbers are rounded to what a print can show, which keeps the file short.
 */
export function normalizePaintStroke(value: unknown): PaintStroke | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const mode = raw.mode === "fill" || raw.mode === "circle" || raw.mode === "lasso" ? raw.mode : null;
  const size = vec3(raw.size);
  if (!mode || !size || size.some((entry) => entry <= 0)) return null;
  const color = raw.color === undefined || raw.color === null ? undefined : normalizeHexColor(String(raw.color));
  if (raw.color !== undefined && raw.color !== null && !color) return null;
  const round = (entry: number, digits = 4) => Number(entry.toFixed(digits));
  const roundVec = (entry: PaintVec3, digits = 4): PaintVec3 => [round(entry[0], digits), round(entry[1], digits), round(entry[2], digits)];
  const stroke: PaintStroke = { mode, ...(color ? { color } : {}), size: roundVec(size) };
  if (mode === "fill" || mode === "circle") {
    const point = vec3(raw.point);
    const normal = unit(raw.normal);
    if (!point || !normal) return null;
    stroke.point = roundVec(point);
    stroke.normal = roundVec(normal, 6);
    if (mode === "fill") stroke.angle = round(clamp(finite(raw.angle) ? raw.angle : PAINT_DEFAULT_ANGLE, PAINT_MIN_ANGLE, PAINT_MAX_ANGLE), 2);
    else stroke.diameter = round(clamp(finite(raw.diameter) ? raw.diameter : PAINT_DEFAULT_DIAMETER, PAINT_MIN_DIAMETER, PAINT_MAX_DIAMETER));
    return stroke;
  }
  const origin = vec3(raw.origin);
  const right = unit(raw.right);
  const up = unit(raw.up);
  const forward = unit(raw.forward);
  const outline = Array.isArray(raw.outline)
    ? raw.outline.filter((point): point is [number, number] => Array.isArray(point) && point.length === 2 && finite(point[0]) && finite(point[1]))
    : [];
  if (!origin || !right || !up || !forward || outline.length < 3) return null;
  stroke.origin = roundVec(origin);
  stroke.right = roundVec(right, 6);
  stroke.up = roundVec(up, 6);
  stroke.forward = roundVec(forward, 6);
  stroke.perspective = raw.perspective === true;
  // A point on the plane in front of the eye is a fraction of a millimetre; across a flat view it is millimetres.
  const digits = stroke.perspective ? 6 : 4;
  stroke.outline = thinnedOutline(outline).map(([x, y]) => [round(x, digits), round(y, digits)]);
  return stroke;
}

/** The strokes of a saved design or an MCP call, those that can be strokes, at most PAINT_MAX_STROKES of them (the last ones). */
export function normalizePaintStrokes(value: unknown): PaintStroke[] {
  if (!Array.isArray(value)) return [];
  return value.map(normalizePaintStroke).filter((stroke): stroke is PaintStroke => stroke !== null).slice(-PAINT_MAX_STROKES);
}

/**
 * Whether a body can be painted: one solid body of its own, or a group cut into one body (a body with its
 * holes cut, an intersection, a hull) in one colour. A hole, a sketch or a picture cannot, nor a bundle or a
 * group of separate parts (their parts are painted on their own) or a group showing its parts' colours.
 */
export function canPaintShape(shape: WorkplaneShape) {
  if (shape.hole || isNonSolidShape(shape) || shape.kind === "ruler") return false;
  if (!shape.groupedShapes?.length) return true;
  return Boolean(shape.importedMesh) && shape.groupOperation !== "bundle" && !groupShowsPartColors(shape);
}

/**
 * The colours of a design to paint with: those of its solid bodies and of their paint, the parts of groups
 * included, in the order they come, at most `limit` of them.
 */
export function designPaintColors(shapes: readonly WorkplaneShape[], limit = 21): string[] {
  const colors: string[] = [];
  const visit = (list: readonly WorkplaneShape[]) => list.forEach((shape) => {
    if (shape.hole || isNonSolidShape(shape)) return;
    [shape.color, ...paintColors(shape)].forEach((color) => {
      const hex = normalizeHexColor(color);
      if (hex && !colors.includes(hex)) colors.push(hex);
    });
    if (shape.groupedShapes?.length) visit(shape.groupedShapes);
  });
  visit(shapes);
  return colors.slice(0, limit);
}

/** How far apart two colours are, 0 to about 441: the distance of their red, green and blue. */
function colorDistance(a: string, b: string) {
  const channels = (hex: string) => [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16));
  const [left, right] = [channels(a), channels(b)];
  return Math.hypot(left[0] - right[0], left[1] - right[1], left[2] - right[2]);
}

/**
 * The colour the tool starts with on a body: the one painted with last (`last`), unless it is hardly the body's own;
 * else the first colour of the design that stands apart from the body's; else white on a dark or strong body, near
 * black on a light one, as a pattern part starts (surfaceTextureShape.ts).
 */
export function paintStartColor(bodyColor: string, designColors: readonly string[], last: string | null) {
  const body = normalizeHexColor(bodyColor) ?? "#000000";
  const apart = (color: string | null | undefined) => {
    const hex = normalizeHexColor(color);
    return hex && colorDistance(hex, body) > 80 ? hex : null;
  };
  if (apart(last)) return apart(last)!;
  const fromDesign = designColors.map(apart).find(Boolean);
  if (fromDesign) return fromDesign;
  const [r, g, b] = [1, 3, 5].map((at) => parseInt(body.slice(at, at + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45 ? "#111111" : "#ffffff";
}

/** The colours a body's paint shows, in the order they were first used; the eraser gives none. */
export function paintColors(shape: Pick<WorkplaneShape, "paint">): string[] {
  const colors: string[] = [];
  shape.paint?.forEach((stroke) => {
    if (stroke.color && !colors.includes(stroke.color)) colors.push(stroke.color);
  });
  return colors;
}
