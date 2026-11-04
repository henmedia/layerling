import type { WorkplaneShape } from "@/types/layerling";

/**
 * Lock shape (#1277), the second level of locking. Lock (Ctrl+L) holds a part
 * still and keeps it out of grouping; a part with its shape locked can still be
 * moved, turned, lifted, aligned, copied and grouped with others, but its size,
 * its settings, its name and its body stay as they are: no resizing, no edge
 * tools, no ungrouping, no mirroring, no deleting. A copy keeps the lock, so
 * building with a locked part never needs it unlocked.
 *
 * A group with a part of locked shape somewhere inside it is held the same way
 * as far as its size and body go - scaling or filleting it would change the
 * part - but it can be ungrouped and opened, and the part keeps its lock.
 */

/** What a part of locked shape still takes through an update: where it is, and the locks themselves. */
export const SHAPE_LOCK_PATCH_KEYS = new Set([
  "locked",
  "shapeLocked",
  "hidden",
  "transparent",
  "x",
  "z",
  "elevation",
  "rotation",
  "rotationX",
  "rotationZ",
  "rotationPivot",
  // A calculation typed into the position fields rides along with the change (#180).
  "formulas",
  // A turn typed into the panel may ask to be baked in; if that changed the size, the commit refuses it.
  "bakeTransform",
]);

/** The part's own shape is locked. */
export function shapeLockedSelf(shape: Pick<WorkplaneShape, "shapeLocked"> | null | undefined): boolean {
  return Boolean(shape?.shapeLocked);
}

/** The part, or any part inside it, has its shape locked. */
export function holdsShapeLock(shape: Pick<WorkplaneShape, "shapeLocked" | "groupedShapes"> | null | undefined): boolean {
  if (!shape) return false;
  if (shape.shapeLocked) return true;
  return Boolean(shape.groupedShapes?.some((part) => holdsShapeLock(part)));
}

/** Nothing may change the body or the size: the part is locked, or holds a part of locked shape. */
export function bodyLocked(shape: Pick<WorkplaneShape, "locked" | "shapeLocked" | "groupedShapes"> | null | undefined): boolean {
  return Boolean(shape?.locked) || holdsShapeLock(shape);
}

/** The group may not be taken apart or opened: it is locked, or its own shape is. */
export function groupHeld(shape: Pick<WorkplaneShape, "locked" | "shapeLocked"> | null | undefined): boolean {
  return Boolean(shape?.locked || shape?.shapeLocked);
}

/** Whether an update may reach a part of locked shape: it only touches what the part still takes, or it unlocks the shape too. */
export function patchFitsShapeLock(patch: Record<string, unknown>): boolean {
  return patch.shapeLocked === false || Object.keys(patch).every((key) => SHAPE_LOCK_PATCH_KEYS.has(key));
}

const SIZE_TOLERANCE = 1e-6;

function sizeChanged(before: WorkplaneShape, after: WorkplaneShape) {
  return (["width", "depth", "height"] as const).some((key) => Math.abs((before[key] ?? 0) - (after[key] ?? 0)) > SIZE_TOLERANCE * Math.max(1, Math.abs(before[key] ?? 0)));
}

function childIds(shape: WorkplaneShape) {
  return (shape.groupedShapes ?? []).map((part) => part.id).join("|");
}

function indexById(shapes: WorkplaneShape[], into = new Map<string, WorkplaneShape>()) {
  for (const shape of shapes) {
    into.set(shape.id, shape);
    if (shape.groupedShapes?.length) indexById(shape.groupedShapes, into);
  }
  return into;
}

/**
 * The last line of defence, in the editor's commit: a change that would resize,
 * rename, mirror, turn into a hole or regroup a part of locked shape - or resize
 * a group holding one - is refused as a whole, whatever tool tried it. Parts are
 * matched by id; a part that is gone (grouped, which gives its copy in the group
 * a new id, or deleted, which the tools refuse) is not looked at here. A part
 * whose lock goes off in the same change is let through.
 */
export function shapeLockBroken(before: WorkplaneShape[], after: WorkplaneShape[]): WorkplaneShape | null {
  if (!before.some(holdsShapeLock)) return null;
  const next = indexById(after);
  const visit = (shapes: WorkplaneShape[]): WorkplaneShape | null => {
    for (const shape of shapes) {
      if (!holdsShapeLock(shape)) continue;
      const changed = next.get(shape.id);
      if (changed && holdsShapeLock(changed)) {
        if (sizeChanged(shape, changed)) return shape;
        if (shape.shapeLocked && changed.shapeLocked) {
          if ((shape.name ?? "") !== (changed.name ?? "")) return shape;
          if (Boolean(shape.hole) !== Boolean(changed.hole)) return shape;
          if (shape.kind !== changed.kind) return shape;
          if (Boolean(shape.mirrorX) !== Boolean(changed.mirrorX) || Boolean(shape.mirrorY) !== Boolean(changed.mirrorY) || Boolean(shape.mirrorZ) !== Boolean(changed.mirrorZ)) return shape;
          if (childIds(shape) !== childIds(changed)) return shape;
        }
      }
      if (shape.groupedShapes?.length) {
        const inner = visit(shape.groupedShapes);
        if (inner) return inner;
      }
    }
    return null;
  };
  return visit(before);
}
