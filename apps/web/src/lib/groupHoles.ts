import type { WorkplaneShape } from "@/types/layerling";
import { restoreGroupedChildren } from "@/lib/editorBooleans";
import { shapeDepth, shapeWidth } from "@/lib/workplaneShapes";

/**
 * The round holes of a group, for changing their diameter all at once or one by one from the group's panel: a round
 * hole is a cylinder (as wide as it is deep) that cuts, in the group itself or in a group inside it. A part's place in
 * the group is its path of part numbers, outermost first. A tag, QR code or board keeps its holes as its card made
 * them, so its parts are not looked into; nor is a bundle's, whose parts do not cut one another.
 */
export type GroupHole = { path: number[]; diameter: number };

/** A cylinder hole that is round, not stretched into an ellipse. */
export function isRoundHole(part: WorkplaneShape) {
  return part.kind === "cylinder" && Boolean(part.hole) && Math.abs(shapeWidth(part) - shapeDepth(part)) < 1e-3;
}

/** Whether the holes inside this part may be changed through the group around it. */
export function opensForHoles(part: WorkplaneShape) {
  return Boolean(part.groupedShapes?.length) && part.groupOperation !== "bundle" && !part.sbcBoard && !part.rackPlate && !part.qrCode && !part.layeredText && !part.layeredIcon;
}

export function groupRoundHoles(group: WorkplaneShape, prefix: number[] = []): GroupHole[] {
  if (!opensForHoles(group)) return [];
  return restoreGroupedChildren(group).flatMap((part, index) => {
    const path = [...prefix, index];
    if (isRoundHole(part)) return [{ path, diameter: Math.round(shapeWidth(part) * 1e4) / 1e4 }];
    return opensForHoles(part) ? groupRoundHoles(part, path) : [];
  });
}

export function samePath(a: readonly number[], b: readonly number[]) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

/** A change of the holes' diameter: `all` sets every round hole, `one` the hole at its path. */
export type GroupHoleChange = { all: number } | { one: { path: number[]; diameter: number } };

export function holeDiameterFor(change: GroupHoleChange, path: readonly number[]) {
  if ("all" in change) return change.all;
  return samePath(change.one.path, path) ? change.one.diameter : null;
}

/** Whether a change reaches anything inside the part at `path`. */
export function changeReaches(change: GroupHoleChange, path: readonly number[]) {
  if ("all" in change) return true;
  return change.one.path.length > path.length && path.every((value, index) => change.one.path[index] === value);
}

/**
 * The group with its round holes changed, built again from the inside out: a group inside it with a changed hole is
 * built first, then the group around it. Every hole keeps its middle, its depth and its turn; only its width and depth
 * (its diameter) change. `rebuild` puts a group together again from its parts, as Edit group's Done does.
 */
export async function withHoleDiameters(
  group: WorkplaneShape,
  change: GroupHoleChange,
  rebuild: (original: WorkplaneShape, parts: WorkplaneShape[]) => Promise<WorkplaneShape | null>,
  prefix: number[] = [],
): Promise<WorkplaneShape | null> {
  const parts = restoreGroupedChildren(group);
  let changed = false;
  const next: WorkplaneShape[] = [];
  for (const [index, part] of parts.entries()) {
    const path = [...prefix, index];
    if (isRoundHole(part)) {
      const diameter = holeDiameterFor(change, path);
      if (diameter !== null && diameter > 0 && Math.abs(diameter - shapeWidth(part)) > 1e-6) {
        next.push({ ...part, width: diameter, depth: diameter, size: diameter });
        changed = true;
        continue;
      }
    } else if (opensForHoles(part) && changeReaches(change, path) && groupRoundHoles(part, path).length) {
      const inner = await withHoleDiameters(part, change, rebuild, path);
      if (inner === null) return null;
      if (inner !== part) {
        next.push(inner);
        changed = true;
        continue;
      }
    }
    next.push(part);
  }
  if (!changed) return group;
  return rebuild(group, next);
}
