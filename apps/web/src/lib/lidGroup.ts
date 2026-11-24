import { boundsForShapes, localGroupBounds } from "@/lib/editorMeshCore";
import { restoreGroupedChildren } from "@/lib/editorBooleans";
import { groupedContentScale } from "@/lib/groupScale";
import { resizedShapeSize, shapeDepth, shapeWidth, shellRebuildEntry } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

/**
 * A box that Make lid grouped with the lid's parts - a hinge's knuckles, latches' cheeks, magnets' pockets and posts -
 * and what Hollow, the Lid tool and a resize need of it: the hollowed box inside the group, as it stands in the design.
 */

/** The part of a lid's group that is the box: the solid that can be hollowed again from its settings. */
const isHollowedBox = (child: WorkplaneShape) => !child.hole && shellRebuildEntry(child) !== null;

/**
 * The hollowed box inside a body that Make lid grouped with the lid's parts, as it stands in the design and under the
 * group's id and name: Hollow works on it, and the lid's parts are made again with the lid afterwards. Null for anything
 * else, and for a box that cannot be hollowed again from its settings.
 */
export function lidGroupBody(group: WorkplaneShape, isBox: (child: WorkplaneShape) => boolean = isHollowedBox): WorkplaneShape | null {
  if (!group.groupedShapes?.length || group.hole) return null;
  const at = group.groupedShapes.findIndex(isBox);
  const inner = at < 0 ? undefined : restoreGroupedChildren(group)[at];
  return inner ? { ...inner, id: group.id, name: group.name } : null;
}

/** Whether a group has been resized since it was made: its parts are stretched to fit, by more than a hundredth of a millimetre. */
export function lidGroupStretched(group: WorkplaneShape): boolean {
  const children = group.groupedShapes ?? [];
  if (!children.length) return false;
  const [sx, sy, sz] = groupedContentScale(group, localGroupBounds(children));
  return Math.abs(sx - 1) * shapeWidth(group) > 0.01 || Math.abs(sy - 1) * group.height > 0.01 || Math.abs(sz - 1) * shapeDepth(group) > 0.01;
}

/** A box smaller than this along any side, in mm, is none to hollow. */
const MIN_BOX = 2;

/**
 * The box inside a lid's group that was resized, at the size the group now asks of it (under the group's id and name):
 * what stood out of the box on each side - the hinge's knuckles behind it, a latch's cheeks in front - stands out as far
 * as before, and the box takes the rest, where stretching the group stretched the knuckles and the walls with it. So a
 * group made 30 mm wider gets a box 30 mm wider. A box that stands turned inside its group is given the group's stretch
 * as it is. Null where there is no box in the group, or none would be left.
 */
export function lidGroupBodyResized(group: WorkplaneShape, isBox: (child: WorkplaneShape) => boolean = isHollowedBox): WorkplaneShape | null {
  const children = group.groupedShapes ?? [];
  const at = children.findIndex(isBox);
  if (at < 0 || group.hole) return null;
  const child = children[at];
  const named = (shape: WorkplaneShape): WorkplaneShape => ({ ...shape, id: group.id, name: group.name, size: resizedShapeSize(shapeWidth(shape), shapeDepth(shape)) });
  const [sx, sy, sz] = groupedContentScale(group, localGroupBounds(children));
  const turned = Math.abs(child.rotation ?? 0) > 1e-6 || Math.abs(child.rotationX ?? 0) > 1e-6 || Math.abs(child.rotationZ ?? 0) > 1e-6;
  if (turned || group.mirrorX || group.mirrorY || group.mirrorZ) return named(restoreGroupedChildren(group)[at]);
  // The group as it was made, standing square where it stands now: the box in it, and how far the group reaches past it.
  const width = shapeWidth(group);
  const depth = shapeDepth(group);
  const made: WorkplaneShape = { ...group, rotation: 0, rotationX: 0, rotationZ: 0, width: width / sx, depth: depth / sz, height: group.height / sy, size: resizedShapeSize(width / sx, depth / sz) };
  const box = boundsForShapes([restoreGroupedChildren(made)[at]]);
  const foot = group.elevation ?? 0;
  const past = {
    left: box.minX - (group.x - width / sx / 2), right: group.x + width / sx / 2 - box.maxX,
    back: box.minZ - (group.z - depth / sz / 2), front: group.z + depth / sz / 2 - box.maxZ,
    below: box.minY - foot, above: foot + group.height / sy - box.maxY,
  };
  const size = { width: width - past.left - past.right, depth: depth - past.back - past.front, height: group.height - past.below - past.above };
  if (size.width < MIN_BOX || size.depth < MIN_BOX || size.height < MIN_BOX) return null;
  const placements = children.map((part, index) => index === at
    ? {
      center: [-width / 2 + past.left + size.width / 2, past.below + size.height / 2, -depth / 2 + past.back + size.depth / 2] as [number, number, number],
      stretch: [size.width / shapeWidth(part), size.height / part.height, size.depth / shapeDepth(part)] as [number, number, number],
    }
    : { center: [part.x * sx, ((part.elevation ?? 0) + part.height / 2) * sy, part.z * sz] as [number, number, number], stretch: [sx, sy, sz] as [number, number, number] });
  return named(restoreGroupedChildren(group, placements)[at]);
}

/**
 * Where a lid made again lies: where the old one lay (`old`: moved beside the printer's other parts, or set on the box),
 * or, after a resize (`clear`), beside the box again (`fresh`, where Make lid lays it) when the old place is on the plate
 * and the box now stands there - a lid lying flat at the box's foot whose outline meets the box's from above.
 */
export function lidPlaceAgain(
  old: Pick<WorkplaneShape, "x" | "z" | "elevation" | "rotationX" | "rotationZ">,
  fresh: Pick<WorkplaneShape, "x" | "z" | "elevation"> & { width: number; depth: number },
  box: { minX: number; maxX: number; minZ: number; maxZ: number } | null,
  clear: boolean,
): { x: number; z: number; elevation: number | undefined } {
  const there = { x: old.x, z: old.z, elevation: old.elevation };
  if (!clear || !box) return there;
  const lying = Math.abs((old.elevation ?? 0) - (fresh.elevation ?? 0)) < 0.01 && !(old.rotationX ?? 0) && !(old.rotationZ ?? 0);
  const meets = old.x - fresh.width / 2 < box.maxX && old.x + fresh.width / 2 > box.minX && old.z - fresh.depth / 2 < box.maxZ && old.z + fresh.depth / 2 > box.minZ;
  return lying && meets ? { x: fresh.x, z: fresh.z, elevation: fresh.elevation } : there;
}
