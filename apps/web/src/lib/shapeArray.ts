/**
 * Patterns: the selection repeated n times in a row or around a circle - hole
 * rows, bolt circles, the teeth of a ring, and with a rise or a growing radius
 * stairs, screws and spirals. Pure numbers; the editor turns them into copies.
 *
 * Coordinates as the user sees them, like a slicer: X to the right, Y to the
 * back, Z up. In the scene that is x, -z and y.
 */
export type ArrayMode = "row" | "circle";
export type ArrayDirection = "x" | "y" | "z";

export type ArraySettings = {
  mode: ArrayMode;
  /** Pieces in the pattern, the original included. */
  count: number;
  /** Row: centre to centre along X, Y and Z (up) at once; negative runs the other way. */
  spacingX: number;
  spacingY: number;
  spacingZ: number;
  /** Circle: the angle the pattern spans; 360 closes the ring. */
  angle: number;
  /** Circle centre in user coordinates (X, Y). */
  centerX: number;
  centerY: number;
  /** Circle: turn each copy with the circle, like teeth, or keep it as it is. */
  rotateCopies: boolean;
  /** Circle: height gained per copy; a climbing circle is a screw. */
  rise: number;
  /** Circle: distance from the centre gained per copy; positive widens, negative tightens (a spiral). */
  radiusChange: number;
  /**
   * Group the pieces into one object when the pattern is created. Left out, it follows the count: off for a few pieces,
   * on above ARRAY_AUTO_GROUP_ABOVE. Once the person ticks or unticks the box, their choice stays.
   */
  groupCopies?: boolean;
  /**
   * Row: spread over a body (#1037) - the plate the holes go into. The row runs along X or Y to the body's far end and
   * leaves the same gap there as the original has at its own end; the spacing follows the count. Null: the spacings count.
   */
  fit?: ArrayFit | null;
};

export type ArrayFit = { axis: "x" | "y"; bodyId: string };

/** Where a piece or a body reaches along one axis. */
export type ArraySpan = { min: number; max: number };

/** The piece's gap to the body's nearer end, and whether that end is the start (min) of the axis. */
export function arrayFitGap(piece: ArraySpan, body: ArraySpan) {
  const start = piece.min - body.min;
  const end = body.max - piece.max;
  return start <= end + 1e-9 ? { gap: start, fromStart: true } : { gap: end, fromStart: false };
}

/**
 * The step from piece to piece that ends the row as far from the body's far end as the original stands from its near
 * one: 5 holes of 8 mm, 20 mm in from both ends of a 150 mm plate, are 25.5 mm apart. Negative runs towards the start.
 */
export function arrayFitStep(count: number, piece: ArraySpan, body: ArraySpan) {
  const { gap, fromStart } = arrayFitGap(piece, body);
  const free = body.max - body.min - (piece.max - piece.min) - 2 * gap;
  return (fromStart ? 1 : -1) * free / (clampArrayCount(count) - 1);
}

/** How far the piece moves along the axis for its gap to the nearer end to become `gap`. */
export function arrayFitShift(piece: ArraySpan, body: ArraySpan, gap: number) {
  const current = arrayFitGap(piece, body);
  return current.fromStart ? gap - current.gap : current.gap - gap;
}

/** A pattern of more pieces than this is grouped unless the person says otherwise. */
export const ARRAY_AUTO_GROUP_ABOVE = 5;

/** Whether creating the pattern also groups its pieces: the person's choice, or by count while there is none. */
export function arrayGroupsCopies(settings: Pick<ArraySettings, "count" | "groupCopies">) {
  return settings.groupCopies ?? settings.count > ARRAY_AUTO_GROUP_ABOVE;
}

/**
 * The settings with the circle centre moved to the pivot (scene x and z), or the same object when it already sits
 * there: a pivot dragged to a new place moves the pattern's circle with it (#638).
 */
export function arrayFollowingPivot(settings: ArraySettings, pivot: { x: number; z: number }): ArraySettings {
  const centerX = pivot.x;
  const centerY = -pivot.z;
  return settings.centerX === centerX && settings.centerY === centerY ? settings : { ...settings, centerX, centerY };
}

/**
 * Where a circle pattern turned its pieces, as the pivot they keep (#990): the circle's centre, at the height of a pivot that
 * stood there already, or else halfway up the pieces (`bottom` to `top`, scene y). The middle of the pieces' box is not it:
 * three legs round a ball fill a box wider one way than the other. Null for a row.
 */
export function arrayCirclePivot(settings: Pick<ArraySettings, "mode" | "centerX" | "centerY">, bottom: number, top: number, pivot?: { x: number; y: number; z: number } | null) {
  if (settings.mode !== "circle") return null;
  const x = settings.centerX;
  const z = -settings.centerY || 0;
  const onCentre = pivot && Math.abs(pivot.x - x) < 1e-6 && Math.abs(pivot.z - z) < 1e-6;
  return { x, y: onCentre ? pivot.y : (bottom + top) / 2, z };
}

export const ARRAY_MIN_COUNT = 2;
export const ARRAY_MAX_COUNT = 100;

export function clampArrayCount(count: number) {
  if (!Number.isFinite(count)) return ARRAY_MIN_COUNT;
  return Math.min(ARRAY_MAX_COUNT, Math.max(ARRAY_MIN_COUNT, Math.round(count)));
}

/** The three spacings of a row that steps `spacing` along one axis only - what a row was before it could use all three. */
export function singleAxisSpacing(direction: ArrayDirection, spacing: number) {
  return {
    spacingX: direction === "x" ? spacing : 0,
    spacingY: direction === "y" ? spacing : 0,
    spacingZ: direction === "z" ? spacing : 0,
  };
}

/**
 * The row's spacings with a fit to a body worked out (pieces and body in scene coordinates): along the chosen axis only,
 * the step from arrayFitStep. Without a fit, or for a circle, the settings as they are.
 */
export function arrayWithFit<T extends Pick<ArraySettings, "mode" | "count" | "spacingX" | "spacingY" | "spacingZ" | "fit">>(
  settings: T,
  pieces: { minX: number; maxX: number; minZ: number; maxZ: number },
  body: { minX: number; maxX: number; minZ: number; maxZ: number } | null,
): T {
  if (settings.mode !== "row" || !settings.fit || !body) return settings;
  if (settings.fit.axis === "x") {
    return { ...settings, ...singleAxisSpacing("x", arrayFitStep(settings.count, { min: pieces.minX, max: pieces.maxX }, { min: body.minX, max: body.maxX })) };
  }
  // Y points to the back, -z in the scene: a step towards +z is a negative Y spacing.
  const step = arrayFitStep(settings.count, { min: pieces.minZ, max: pieces.maxZ }, { min: body.minZ, max: body.maxZ });
  return { ...settings, ...singleAxisSpacing("y", -step || 0) };
}

/** Scene offset of the copy at `index` (1 = first copy) in a row. */
export function rowOffset(settings: Pick<ArraySettings, "spacingX" | "spacingY" | "spacingZ">, index: number) {
  // Y points to the back, which is -z in the scene; Z (up) is y.
  return { dx: settings.spacingX * index, dy: settings.spacingZ * index, dz: -settings.spacingY * index || 0 };
}

/**
 * A scene point, already turned to its place on the circle, moved away from or
 * towards the centre by `amount` along the line from the centre. A point that
 * sits on the centre has no direction of its own, so it goes the way the
 * circle has turned (`degrees` from X). This is what makes a spiral.
 */
export function moveAlongRadius(point: { x: number; z: number }, center: { x: number; y: number }, degrees: number, amount: number) {
  if (!amount) return { x: point.x, z: point.z };
  const relX = point.x - center.x;
  const relY = -point.z - center.y;
  const distance = Math.hypot(relX, relY);
  const radians = (degrees * Math.PI) / 180;
  const dirX = distance > 1e-9 ? relX / distance : Math.cos(radians);
  const dirY = distance > 1e-9 ? relY / distance : Math.sin(radians);
  return { x: center.x + dirX * (distance + amount), z: -(center.y + dirY * (distance + amount)) };
}

/**
 * Angle between neighbours on a circle. A full circle shares 360° among all
 * pieces - the last copy must not land on the original; an arc puts the first
 * and last piece on its two ends.
 */
export function circleStepDegrees(count: number, angle: number) {
  const pieces = clampArrayCount(count);
  const full = Math.abs(Math.abs(angle) - 360) < 1e-9 || Math.abs(angle) > 360;
  return full ? 360 / pieces * Math.sign(angle || 1) : angle / (pieces - 1);
}

/**
 * A scene point turned about the vertical axis through the centre (given in
 * user coordinates). Positive angles run counter-clockwise seen from above.
 */
export function rotateAroundVertical(point: { x: number; z: number }, center: { x: number; y: number }, degrees: number) {
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  // In user coordinates X = x and Y = -z; turn there, then go back.
  const relX = point.x - center.x;
  const relY = -point.z - center.y;
  const nextX = relX * cos - relY * sin;
  const nextY = relX * sin + relY * cos;
  return { x: center.x + nextX, z: -(center.y + nextY) };
}
