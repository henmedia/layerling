import type { TextEdge, TextEdgeSide, WorkplaneShape } from "@/types/layerling";

/**
 * The edge of a text's letters (#225): rounded or chamfered, the way a printed name tag's
 * letters on top are finished. A plain text can take it on the bottom or on both ends instead:
 * a text cut out of another body as inset letters gets a chamfered floor, which prints without
 * bridges on a side wall. The geometry is built in textFill; this is what the shape, a saved
 * design and the layers card agree on, kept free of the 3D libraries so a design file can check it.
 */

export const MIN_TEXT_EDGE = 0.05;
export const MAX_TEXT_EDGE = 5;

/** The ends of the letters an edge can go on, top first: the default, left out of a stored edge. */
export const TEXT_EDGE_SIDES: readonly TextEdgeSide[] = ["top", "bottom", "both"];

export function isTextEdgeSide(value: unknown): value is TextEdgeSide {
  return value === "top" || value === "bottom" || value === "both";
}

/**
 * A letter edge as the shape holds it: round or chamfer, its size within the limits, the side only
 * when it is the bottom or both; undefined for none or nonsense. A side it does not know is the top.
 */
export function normalizeTextEdge(value: unknown): TextEdge | undefined {
  if (!value || typeof value !== "object") return undefined;
  const { kind, size, side } = value as { kind?: unknown; size?: unknown; side?: unknown };
  const width = Number(size);
  if ((kind !== "round" && kind !== "chamfer") || !Number.isFinite(width)) return undefined;
  return {
    kind,
    size: Math.round(Math.min(MAX_TEXT_EDGE, Math.max(MIN_TEXT_EDGE, width)) * 1000) / 1000,
    ...(side === "bottom" || side === "both" ? { side } : {}),
  };
}

/**
 * The edge for a name tag's layers, which take it on the top only: a bottom edge there would cut a
 * groove where the letters meet the layer under them.
 */
export function topTextEdge(value: unknown): TextEdge | undefined {
  const edge = normalizeTextEdge(value);
  return edge ? { kind: edge.kind, size: edge.size } : undefined;
}

/** Which end of the letters an edge is on: the top unless it says otherwise. */
export function textEdgeSide(edge: Pick<TextEdge, "side"> | undefined): TextEdgeSide {
  return edge?.side ?? "top";
}

/** The largest edge a text of `height` takes on `side`: its height, or half of it when both ends have one; never above MAX_TEXT_EDGE. */
export function maxTextEdgeSize(height: number, side: TextEdgeSide) {
  return Math.min(MAX_TEXT_EDGE, side === "both" ? height / 2 : height);
}

/**
 * The longest text whose letters still get a rounded or chamfered top edge. The edge is built letter outline by
 * letter outline in several steps, and its time grows faster than the text: measured on 08.11.2026 in Sans,
 * 24 characters 3 s, 40 characters 5 s, 250 characters a full minute (Script nearly two). Since a text takes
 * 250 characters (MAX_TEXT_LENGTH), a longer one keeps its edge setting but is built with plain letters.
 */
export const MAX_EDGED_TEXT_LENGTH = 40;

/**
 * The longest text whose letters take an edge on both ends without a warning. Both ends build two
 * edges, about twice the time of one: measured on 21.11.2026, 40 characters of Script with a 1 mm
 * round on both ends took 46 s. The edge is still built up to MAX_EDGED_TEXT_LENGTH, the panel
 * only says it will take a while.
 */
export const SLOW_BOTH_EDGES_LENGTH = 20;

/** Whether this text's edge on both ends will take long to build: over SLOW_BOTH_EDGES_LENGTH characters. */
export function textEdgeBuildsSlowly(shape: Pick<WorkplaneShape, "kind" | "textEdge" | "text">) {
  return textHasEdge(shape) && textEdgeSide(normalizeTextEdge(shape.textEdge)) === "both" && Array.from(shape.text ?? "").length > SLOW_BOTH_EDGES_LENGTH;
}

/** Whether a text is short enough for its letters to take a top edge: up to MAX_EDGED_TEXT_LENGTH characters. */
export function textAllowsEdge(shape: Pick<WorkplaneShape, "text">) {
  return Array.from(shape.text ?? "").length <= MAX_EDGED_TEXT_LENGTH;
}

/** Whether the letters of this text get their edge rounded or chamfered. */
export function textHasEdge(shape: Pick<WorkplaneShape, "kind" | "textEdge" | "text">) {
  return shape.kind === "text" && Boolean(normalizeTextEdge(shape.textEdge)) && textAllowsEdge(shape);
}

/**
 * How far the outline stands in from its full size at each of the edge's `steps + 1` boundaries,
 * and how high each stands above where the edge begins: a quarter circle for round, a straight
 * slope at 45 degrees for chamfer. The first is (0, 0), the last (size, size).
 */
export function textEdgeLevels(edge: TextEdge, steps: number): { height: number; inset: number }[] {
  return Array.from({ length: steps + 1 }, (_, index) => {
    if (edge.kind === "chamfer") {
      const along = (edge.size * index) / steps;
      return { height: along, inset: along };
    }
    const angle = (index / steps) * (Math.PI / 2);
    return { height: edge.size * Math.sin(angle), inset: edge.size * (1 - Math.cos(angle)) };
  });
}

/**
 * The letters' outline from the underside up, as the heights where it changes and how far it stands
 * in there: on the bottom the edge's levels mirrored, from `size` in at the underside out to the full
 * outline; on the top as they are. The full outline between them is one point at each end of the
 * straight wall, left out where the wall has no height. `size` is the edge's, at most what the side
 * takes; `steps` as for textEdgeLevels. Heights rise from 0 to `height`.
 */
export function textEdgeProfile(edge: Pick<TextEdge, "kind" | "side">, size: number, height: number, steps: number): { height: number; inset: number }[] {
  const side = textEdgeSide(edge);
  const levels = textEdgeLevels({ kind: edge.kind, size }, steps);
  const bottom = side === "top" ? [{ height: 0, inset: 0 }] : [...levels].reverse().map((level) => ({ height: size - level.height, inset: level.inset }));
  const top = side === "bottom" ? [{ height, inset: 0 }] : levels.map((level) => ({ height: height - size + level.height, inset: level.inset }));
  // Where the two meet without a wall between them, the full outline stands there once.
  return top[0].height - bottom[bottom.length - 1].height > 1e-4 ? [...bottom, ...top] : [...bottom, ...top.slice(1)];
}
