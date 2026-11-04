import { cloneSketchProfile } from "@/lib/sketchSmoothHandles";
import type { SketchPoint, SketchProfile } from "@/types/layerling";

type Pt = { x: number; z: number };
type Handles = { handleIn: Pt; handleOut: Pt };

/** A handle that lies on its own point cannot be seen or grabbed, and bends nothing (#636). */
export function isDegenerateHandle(point: Pt, handle: Pt | undefined) {
  return !handle || (Math.abs(handle.x - point.x) < 1e-9 && Math.abs(handle.z - point.z) < 1e-9);
}

/** A third of the way from `point` to `toward`: where a handle with no length of its own is drawn and, once pulled, starts. */
function thirdToward(point: Pt, toward: Pt): Pt {
  return { x: point.x + (toward.x - point.x) / 3, z: point.z + (toward.z - point.z) / 3 };
}

/**
 * The handles a Bezier point gets from a plain click: along the side that leads to it, a third of its length each
 * way, so the curve is visibly bent and the handles can be taken at once (#636). Null when nothing leads to it.
 */
export function chordHandles(from: Pt | null, point: Pt): Handles | null {
  if (!from || (Math.abs(from.x - point.x) < 1e-9 && Math.abs(from.z - point.z) < 1e-9)) return null;
  const back = thirdToward(point, from);
  return { handleIn: back, handleOut: { x: 2 * point.x - back.x, z: 2 * point.z - back.z } };
}

/**
 * A side only bends when both of its ends have the handle that faces it. The Bezier tool gives every new point
 * handles, but a point that was there before - one it starts from or ends on - has none unless it was curved
 * already, and the side stayed straight (#635). Here the point the side starts from gets an outgoing handle, and
 * the point it ends on an incoming one, a third of the way along the side where nothing was dragged out; handles a
 * point already has are left alone, unless they lie on the point itself (#636).
 *
 * `dragged` is what the pointer pulled out of `pointId` (the same handles the tool gives a new point), null for a
 * plain click. `activeId` is the point the chain runs from, null when `pointId` starts it. Null when nothing changes.
 */
export function withBezierHandles(profile: SketchProfile, pointId: string, dragged: Handles | null, activeId: string | null): SketchProfile | null {
  const next = cloneSketchProfile(profile);
  const point = next.points.find((entry) => entry.id === pointId);
  if (!point) return null;
  const active = activeId && activeId !== pointId ? next.points.find((entry) => entry.id === activeId) ?? null : null;
  let changed = false;
  const pulled = dragged && !isDegenerateHandle(point, dragged.handleOut) ? dragged : null;
  const hadHandles = Boolean(point.handleIn || point.handleOut);
  // The side that ends here needs the incoming handle, the one that starts here the outgoing one; a drag sets the
  // facing one and fills the other with its mirror image only when it is missing.
  if (activeId) {
    if (pulled) {
      point.handleIn = pulled.handleIn;
      changed = true;
      if (isDegenerateHandle(point, point.handleOut)) point.handleOut = pulled.handleOut;
    } else if (isDegenerateHandle(point, point.handleIn) && active) {
      point.handleIn = thirdToward(point, active);
      changed = true;
    }
  } else if (pulled) {
    point.handleOut = pulled.handleOut;
    changed = true;
    if (isDegenerateHandle(point, point.handleIn)) point.handleIn = pulled.handleIn;
  }
  if (pulled && !hadHandles) point.mode = "smooth";
  if (active && isDegenerateHandle(active, active.handleOut)) {
    active.handleOut = thirdToward(active, point);
    changed = true;
  }
  return changed ? next : null;
}

/** The outgoing handle the point a chain runs from needs for the next side to bend, or the profile itself when it has one. */
export function withBezierStartHandle(profile: SketchProfile, activeId: string | null, toward: Pt): SketchProfile {
  if (!activeId) return profile;
  const active = profile.points.find((entry) => entry.id === activeId);
  if (!active || !isDegenerateHandle(active, active.handleOut)) return profile;
  const handleOut = thirdToward(active, toward);
  return { ...profile, points: profile.points.map((entry) => (entry.id === activeId ? { ...entry, handleOut } : entry)) };
}

/**
 * Where a handle is drawn. One that lies on its point (older sketches kept those from a click) is shown a third of
 * the way to the neighbour on that side, so it can be taken; the curve stays as it is until it is dragged.
 */
export function displayedHandle(profile: SketchProfile, point: SketchPoint, which: "in" | "out"): Pt | undefined {
  const handle = which === "in" ? point.handleIn : point.handleOut;
  if (!handle || !isDegenerateHandle(point, handle)) return handle;
  const side = profile.segments.find((segment) => (which === "in" ? segment.endId : segment.startId) === point.id && (segment.kind ?? "line") !== "line");
  const neighbourId = side ? (which === "in" ? side.startId : side.endId) : null;
  const neighbour = neighbourId ? profile.points.find((entry) => entry.id === neighbourId) : null;
  return neighbour ? thirdToward(point, neighbour) : handle;
}

/**
 * Where a handle lies from its own point, as it is drawn (#1250): the numbers its fields show. Undefined when the
 * point has no such handle.
 */
export function handleOffset(profile: SketchProfile, point: SketchPoint, which: "in" | "out"): Pt | undefined {
  const at = displayedHandle(profile, point, which);
  return at ? { x: at.x - point.x, z: at.z - point.z } : undefined;
}

/** Where a handle goes for a typed offset from its point, kept on the plate as a dragged one is (#1250). */
export function handleAtOffset(point: Pt, offset: Pt, reach: { halfWidth: number; halfDepth: number }): Pt {
  return {
    x: Math.min(reach.halfWidth, Math.max(-reach.halfWidth, point.x + offset.x)),
    z: Math.min(reach.halfDepth, Math.max(-reach.halfDepth, point.z + offset.z)),
  };
}
