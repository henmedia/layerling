import * as THREE from "three";
import { boundsForShapes, localGroupBounds } from "@/lib/editorMeshCore";
import { restoreGroupedChildren } from "@/lib/editorBooleans";
import { quaternionForShape } from "@/lib/geometryRotation";
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

type Standing = Pick<WorkplaneShape, "rotation" | "rotationX" | "rotationZ" | "mirrorX" | "mirrorY" | "mirrorZ">;

/**
 * Which of a body's ends is up, as the body itself sees it: the direction that points up in the design, in the body's
 * own frame - before its turns and its mirroring. A body turned about the vertical keeps its answer; one turned over or
 * mirrored top to bottom gets the opposite one. Make lid remembers it on the lid (`lidFor.up`), so the Lid tool knows
 * later which end the lid was made for (Discussion #2052).
 */
export function lidBodyUp(body: Standing): [number, number, number] {
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(quaternionForShape(body).invert());
  const clean = (value: number, mirrored: boolean | undefined) => (Math.round(value * 1e4) / 1e4) * (mirrored ? -1 : 1) + 0;
  return [clean(up.x, body.mirrorX), clean(up.y, body.mirrorY), clean(up.z, body.mirrorZ)];
}

/**
 * Whether a lid sits on the end of `body` that is up now: the end it was made for. A lid from before the end was
 * remembered is taken to sit there, as it was until then.
 */
export function lidSitsOnTop(lid: Pick<WorkplaneShape, "lidFor">, body: Standing): boolean {
  const made = lid.lidFor?.up;
  if (!made) return true;
  const now = lidBodyUp(body);
  return made[0] * now[0] + made[1] * now[1] + made[2] * now[2] > 0.999;
}

/** The lids made for `body`, as it stands in the design under its id. */
function lidsOf(shapes: readonly WorkplaneShape[], body: WorkplaneShape): WorkplaneShape[] {
  return shapes.filter((shape) => shape.lidFor?.body === body.id && shape.id !== body.id);
}

/** The lid of `body` that sits on the end that is up now: the one the Lid tool changes. Undefined where that end has none. */
export function lidOnTop(shapes: readonly WorkplaneShape[], body: WorkplaneShape): WorkplaneShape | undefined {
  return lidsOf(shapes, body).find((lid) => lidSitsOnTop(lid, body));
}

/**
 * What the Lid tool changes on `body` instead of making another lid: the lid on the end that is up, and the body to make
 * it again for - the body itself, or the box inside it where a lid's parts were grouped with it. That box is taken out of
 * its group and gets all its lids made again, which goes only where none of them sits on the other end. Null where the
 * tool makes a new lid: no lid on this end, or a group that cannot be taken apart so.
 */
export function lidToChange(shapes: readonly WorkplaneShape[], body: WorkplaneShape, isBox: (child: WorkplaneShape) => boolean = isHollowedBox): { lid: WorkplaneShape; bare: WorkplaneShape } | null {
  const lid = body.hole ? undefined : lidOnTop(shapes, body);
  const bare = lid ? (body.groupedShapes?.length ? (lidsAllOnTop(shapes, body) ? lidGroupBody(body, isBox) : null) : body) : null;
  return lid && bare ? { lid, bare } : null;
}

/** Whether `body` has a lid on an end that is not up now, and none on the end that is: the Lid tool makes a second lid, for this end. */
export function lidOnOtherEndOnly(shapes: readonly WorkplaneShape[], body: WorkplaneShape): boolean {
  return lidsOf(shapes, body).length > 0 && !lidOnTop(shapes, body);
}

/**
 * Whether `body` has lids and each of them sits on the end that is up now: only then do they follow the body as it is
 * hollowed again or resized. A lid on the other end was made for the body turned over, and would come out for the wrong
 * end if it were made again for the body as it stands.
 */
export function lidsAllOnTop(shapes: readonly WorkplaneShape[], body: WorkplaneShape): boolean {
  const lids = lidsOf(shapes, body);
  return lids.length > 0 && lids.every((lid) => lidSitsOnTop(lid, body));
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
