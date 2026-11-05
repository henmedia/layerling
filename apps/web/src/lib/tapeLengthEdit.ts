/**
 * Typing a tape measurement's length (#823, Discussion #610): which body the typed number moves,
 * and why none does when the label stays as it is. The body at the second point moves, as with the
 * ruler in Tinkercad, unless only the body at the first point is selected; a measurement with a body
 * at one end only moves that body. A whole edge, two points on one body, two points on nothing or a
 * locked body move nothing, and the label says which of these it is instead of taking the number.
 */

export type TapeLengthRefusal = "edge" | "noBody" | "sameBody" | "locked";

/** `movesEnd`: the body at the second point moves; otherwise the one at the first. */
export type TapeLengthMover =
  | { shapeId: string; movesEnd: boolean }
  /** `shapeId`: the locked body, so the label can name it. */
  | { refusal: TapeLengthRefusal; shapeId?: string };

export type TapeLengthEnds = {
  /** The bodies the two points sit on, null for a point on the workplane or in free space. */
  startShapeId: string | null;
  endShapeId: string | null;
  /** The measurement runs along a whole edge of one body. */
  wholeEdge: boolean;
};

export function tapeLengthMover(ends: TapeLengthEnds, shapeById: (id: string) => { locked?: boolean } | undefined, selectedIds: readonly string[]): TapeLengthMover {
  if (ends.wholeEdge) return { refusal: "edge" };
  // A point on a body that is gone counts as a point on nothing.
  const startShapeId = ends.startShapeId && shapeById(ends.startShapeId) ? ends.startShapeId : null;
  const endShapeId = ends.endShapeId && shapeById(ends.endShapeId) ? ends.endShapeId : null;
  if (!startShapeId && !endShapeId) return { refusal: "noBody" };
  if (startShapeId === endShapeId) return { refusal: "sameBody" };
  const onlyStartSelected = Boolean(startShapeId && selectedIds.includes(startShapeId) && !(endShapeId && selectedIds.includes(endShapeId)));
  const shapeId = (onlyStartSelected ? startShapeId : endShapeId ?? startShapeId) as string;
  if (shapeById(shapeId)?.locked) return { refusal: "locked", shapeId };
  return { shapeId, movesEnd: shapeId === endShapeId };
}

/** The axes as the editor names them: X to the right, Y towards the back, Z up. */
export type TapeAxis = "X" | "Y" | "Z";

/** The axis inside the scene each of them runs along: Y is the inside z (its sign turned), Z the inside y. */
export const TAPE_SCENE_AXIS: Record<TapeAxis, "x" | "y" | "z"> = { X: "x", Y: "z", Z: "y" };

/** The axis as the editor names it for an axis inside the scene, as MCP gives it (y up). */
export const TAPE_EDITOR_AXIS: Record<"x" | "y" | "z", TapeAxis> = { x: "X", y: "Z", z: "Y" };

/**
 * The field a click on the label opens holds the length and, when the label's tip lists them, the
 * reach along each axis. Only one of them is applied: the one typed into last, or, when Enter is
 * pressed before anything was typed, the one that has the focus, so its number becomes exact.
 * Leaving the field without typing moves nothing; a number shown rounded is not a reason to nudge
 * the body by what the rounding left out.
 */
export type TapeLengthFieldName = "length" | TapeAxis;

export function tapeLengthFieldToApply(typed: TapeLengthFieldName | null, focused: TapeLengthFieldName | null, how: "enter" | "leave"): TapeLengthFieldName | null {
  if (typed) return typed;
  return how === "enter" ? focused : null;
}

/** Why a typed length moved nothing, beyond what the label says: no such measurement, or two points that give no direction. */
export type TapeLengthTypedRefusal = TapeLengthRefusal | "missing" | "noDirection";

/** What MCP asks of the tape measure (#881); `typeLength` types a length for one measurement, in millimetres (Discussion #610). */
export type TapeMeasurementsRequest = {
  visible?: boolean;
  dimensions?: boolean;
  /** `axis`: inside the scene, y up, as MCP gives positions; left out, the length along the line. */
  typeLength?: { id: string; length: number; axis?: "x" | "y" | "z" };
};

/** `moves`: the body a typed length would move. `moved`: what a typed length moved, and how far in millimetres. */
export type TapeMeasurementsAnswer = {
  visible: boolean;
  dimensions: boolean;
  measurements: Array<{ id: string; length: number; moves?: string }>;
  moved?: { id: string; name: string; distance: number };
};

/** The refusal in the words MCP answers in, which are English like the rest of its errors. */
export function tapeLengthMcpRefusal(refusal: TapeLengthTypedRefusal, name: string, axis?: "x" | "y" | "z") {
  switch (refusal) {
    case "missing":
      return "No measurement with this id; call layerling_measurements without one to list them";
    case "edge":
      return "This measurement runs along a whole edge; a length can only be typed for a measurement between two points";
    case "noBody":
      return "Neither point of this measurement lies on a body, so a typed length has nothing to move";
    case "sameBody":
      return "Both points of this measurement lie on the same body, so a typed length has nothing to move";
    case "locked":
      return `"${name}" is locked, so a typed length cannot move it; unlock it first`;
    default:
      return axis
        ? `The two points are level along ${axis}, so there is no direction to move in along it`
        : "The two points lie on top of each other, so there is no direction to move in";
  }
}
