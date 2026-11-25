/*
 * The diameters of a round tube or ring (#384, forum). Outer diameter, inner diameter and wall are
 * one fact seen three ways - outer = inner + 2 x wall - and typing any of them must give the same
 * tube whatever was typed before. So each entry changes what it names and lets the others follow:
 * the outer diameter keeps the bore (the wall gives way), the inner diameter keeps the outer one (the
 * wall gives way) unless the bore does not fit inside it, and then the outer one grows by the wall.
 * That is for a tube nothing was typed for yet: after that the one of the three typed last stays at the next
 * entry and the third follows (Discussion #2062), see tubeAfterTyped.
 */

/** The thinnest wall a tube can have, in mm. */
export const MIN_TUBE_WALL = 0.5;

export type TubeDiameters = { outer: number; wall: number };

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/** The thickest wall an outer diameter allows: a little less than the radius, so a bore is left. */
export function tubeWallLimit(outer: number) {
  return Math.max(MIN_TUBE_WALL, outer / 2 - 0.1);
}

/** The bore of a tube of this outer diameter and wall. */
export function tubeInnerDiameter(outer: number, wall: number) {
  return Math.max(0.2, outer - 2 * Math.min(wall, tubeWallLimit(outer)));
}

/** The outer diameter was typed: the bore stays, the wall changes (down to the thinnest, then the bore shrinks). */
export function tubeAfterOuter(outer: number, inner: number): TubeDiameters {
  return { outer, wall: clamp((outer - inner) / 2, MIN_TUBE_WALL, tubeWallLimit(outer)) };
}

/** The inner diameter was typed: the outer one stays; if the bore does not fit in it, the outer one grows by the wall. */
export function tubeAfterInner(inner: number, outer: number, wall: number): TubeDiameters {
  if (inner <= outer - 2 * MIN_TUBE_WALL) {
    return { outer, wall: clamp((outer - inner) / 2, MIN_TUBE_WALL, tubeWallLimit(outer)) };
  }
  const keptWall = Math.max(MIN_TUBE_WALL, wall);
  return { outer: inner + 2 * keptWall, wall: keptWall };
}

export type TubeMeasure = "outer" | "inner" | "wall";

/**
 * What was typed for each tube, the latest first, with the value it came to. Only for as long as the editor is open:
 * an entry counts while the tube still has that value, so undo, a dragged handle or a washer size chosen since ends it.
 */
export type TubeTyped = { measure: TubeMeasure; value: number };

const VALUE_TOLERANCE = 0.005;

function tubeMeasures(tube: TubeDiameters): Record<TubeMeasure, number> {
  return { outer: tube.outer, inner: tubeInnerDiameter(tube.outer, tube.wall), wall: Math.min(tube.wall, tubeWallLimit(tube.outer)) };
}

/** The measure that stays when `typing` is typed: the other one of the three typed last, if it still holds. */
export function tubeKeptMeasure(typing: TubeMeasure, tube: TubeDiameters, typed: readonly TubeTyped[]): TubeMeasure | null {
  const now = tubeMeasures(tube);
  return typed.find((entry) => entry.measure !== typing && Math.abs(now[entry.measure] - entry.value) < VALUE_TOLERANCE)?.measure ?? null;
}

/** The tube after `measure` was typed, keeping the one of the other two typed last; without one, as described at the top. */
export function tubeAfterTyped(measure: TubeMeasure, value: number, tube: TubeDiameters, typed: readonly TubeTyped[]): TubeDiameters {
  const { inner, wall } = tubeMeasures(tube);
  const kept = tubeKeptMeasure(measure, tube, typed);
  if (measure === "outer") return kept === "wall" ? { outer: value, wall: clamp(wall, MIN_TUBE_WALL, tubeWallLimit(value)) } : tubeAfterOuter(value, inner);
  if (measure === "inner") return kept === "wall" ? { outer: value + 2 * wall, wall } : tubeAfterInner(value, tube.outer, wall);
  if (kept === "inner") {
    const nextWall = Math.max(MIN_TUBE_WALL, value);
    return { outer: inner + 2 * nextWall, wall: nextWall };
  }
  return { outer: tube.outer, wall: clamp(value, MIN_TUBE_WALL, tubeWallLimit(tube.outer)) };
}

/** The list with this entry in front, what it came to as its value. */
export function tubeTypedWith(typed: readonly TubeTyped[], measure: TubeMeasure, after: TubeDiameters): TubeTyped[] {
  return [{ measure, value: tubeMeasures(after)[measure] }, ...typed.filter((entry) => entry.measure !== measure)];
}

const typedByShape = new Map<string, TubeTyped[]>();

/** What was typed for this shape in this session, the latest first. */
export function tubeTyped(shapeId: string): readonly TubeTyped[] {
  return typedByShape.get(shapeId) ?? [];
}

export function rememberTubeTyped(shapeId: string, measure: TubeMeasure, after: TubeDiameters) {
  typedByShape.set(shapeId, tubeTypedWith(tubeTyped(shapeId), measure, after));
}
