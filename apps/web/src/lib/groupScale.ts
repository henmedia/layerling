import { shapeDepth, shapeHasShapeDeform, shapeWidth } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

export type GroupChildBounds = { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number };

/**
 * How far a group stretches its parts. A group keeps its parts at the size
 * they were grouped at; resizing it changes only its own width, height and
 * depth. The viewport, Ungroup and the group's mesh all stretch the parts by
 * this much, so they agree on its size. A group saved without its grouped size
 * falls back to the bounds of its parts.
 */
export function groupedContentScale(group: WorkplaneShape, childBounds: GroupChildBounds): [number, number, number] {
  const baseWidth = group.groupedBaseWidth ?? childBounds.maxX - childBounds.minX;
  const baseHeight = group.groupedBaseHeight ?? childBounds.maxY - childBounds.minY;
  const baseDepth = group.groupedBaseDepth ?? childBounds.maxZ - childBounds.minZ;
  return [
    shapeWidth(group) / Math.max(0.001, baseWidth),
    group.height / Math.max(0.001, baseHeight),
    shapeDepth(group) / Math.max(0.001, baseDepth),
  ];
}

/** Stretches the parts' vertices, given in the group's own frame, to the group's size. */
export function scaleGroupedVertices<T extends readonly [number, number, number]>(vertices: readonly T[], [sx, sy, sz]: readonly [number, number, number]) {
  return vertices.map(([x, y, z]) => [x * sx, y * sy, z * sz] as [number, number, number]);
}

/**
 * How far the group's stretch lengthens each of a part's own width, height and depth. The stretch
 * runs along the group's axes; a part turned inside the group (a bar laid on its side) has its
 * width, height and depth on other axes, so each is stretched by the length its own axis gets
 * (#234). `axes` are the part's own x, y and z in the group's frame. For a part that is not
 * turned this is the group's own stretch; for a part turned by quarter turns it is exact.
 */
export function groupedPartSizeScale(
  axes: readonly [readonly [number, number, number], readonly [number, number, number], readonly [number, number, number]],
  [sx, sy, sz]: readonly [number, number, number],
): { width: number; height: number; depth: number } {
  const along = ([x, y, z]: readonly [number, number, number]) => Math.hypot(x * sx, y * sy, z * sz);
  return { width: along(axes[0]), height: along(axes[1]), depth: along(axes[2]) };
}

type Vec3 = [number, number, number];

/** A box in a group's own frame: x and z from the group's middle, y from its foot. */
export type GroupFrameBox = { min: readonly [number, number, number]; max: readonly [number, number, number] };

/**
 * A part as the layout below sees it, in the group's own frame: its middle, its own width, height and
 * depth, and its own x, y and z axes in the group's frame (left out for a part that is not turned).
 */
export type GroupPartBox = {
  center: readonly [number, number, number];
  size: readonly [number, number, number];
  axes?: readonly [readonly [number, number, number], readonly [number, number, number], readonly [number, number, number]];
};

/**
 * Where a part goes when its group is resized keeping its parts: its new middle in the group's frame,
 * how far it is stretched along each of the group's axes, its own new width, height and depth, and
 * whether the group became too small for it to keep its size and it had to shrink with it after all.
 */
export type GroupPartPlacement = { center: Vec3; stretch: Vec3; size: Vec3; shrunk: boolean };

/**
 * A part reaching across at least this share of a group along an axis spans it (Discussion #526): the
 * plate under a few holes, the back of a display stand standing on its foot, the hollow inside a box
 * with walls a few millimetres thick. It grows with the group and keeps its distance to both sides.
 */
export const GROUP_SPAN_SHARE = 0.9;

/**
 * A part whose distances to the two sides differ by at most this share of the group's length, or
 * GROUP_CENTRE_TOLERANCE millimetres, counts as centred and stays as centred as it was.
 */
export const GROUP_CENTRE_SHARE = 0.01;
export const GROUP_CENTRE_TOLERANCE = 0.05;

/** Rounding left over from the sums above, far below anything printed. */
const PLACEMENT_EPSILON = 1e-6;

/**
 * Where a part lies along one axis of a group resized from `from` to `to`, when the group keeps its parts
 * (Discussion #526). There is no solver behind it, only one rule per part, so the result can be told
 * beforehand. A part that spans the group (GROUP_SPAN_SHARE) grows or shrinks with it and keeps its
 * distance to both sides; for the plate itself, which reaches from side to side, that is the stretch every
 * group makes. Every other part keeps its own length and its distance to the nearer side, and a centred one
 * stays centred: a hole 5 mm from the left end of a plate is still 5 mm from it when the plate is 40 mm
 * longer, one 5 mm from the right end moves with the right end, and a slot in the middle stays in the middle.
 * A distance below zero is a part that sticks out past a side, a hole cutting through the bottom, and it
 * sticks out as far as before.
 *
 * Made so small that a part no longer fits at its own length and its distance - it would reach past the far
 * side, or a spanning part would be left with no length at all - the part shrinks with the group after all,
 * as every part of a group always did, and says so in `shrunk`.
 */
export function keepPartAlongAxis(
  part: { min: number; max: number },
  from: { min: number; max: number },
  to: { min: number; max: number },
): { min: number; max: number; shrunk: boolean } {
  const length = from.max - from.min;
  const resized = to.max - to.min;
  // An axis the resize did not touch leaves every part on it exactly where it was.
  if (Math.abs(resized - length) <= PLACEMENT_EPSILON && Math.abs(to.min - from.min) <= PLACEMENT_EPSILON) return { ...part, shrunk: false };
  const stretched = () => {
    const scale = resized / Math.max(PLACEMENT_EPSILON, length);
    return { min: to.min + (part.min - from.min) * scale, max: to.min + (part.max - from.min) * scale, shrunk: true };
  };
  const nearMin = part.min - from.min;
  const nearMax = from.max - part.max;
  const covered = Math.min(part.max, from.max) - Math.max(part.min, from.min);
  if (covered >= GROUP_SPAN_SHARE * length - PLACEMENT_EPSILON) {
    const min = to.min + nearMin;
    const max = to.max - nearMax;
    return max - min > PLACEMENT_EPSILON ? { min, max, shrunk: false } : stretched();
  }
  const own = part.max - part.min;
  const centred = Math.abs(nearMin - nearMax) <= Math.max(GROUP_CENTRE_TOLERANCE, GROUP_CENTRE_SHARE * length);
  const min = centred
    ? (to.min + to.max) / 2 + ((part.min + part.max) / 2 - (from.min + from.max) / 2) - own / 2
    : nearMin < nearMax ? to.min + nearMin : to.max - nearMax - own;
  const max = min + own;
  // It may not reach further past a side than it did before.
  const fits = min >= to.min + Math.min(0, nearMin) - PLACEMENT_EPSILON && max <= to.max + Math.min(0, nearMax) + PLACEMENT_EPSILON;
  return fits ? { min, max, shrunk: false } : stretched();
}

/**
 * The parts of a group resized from the box `from` to the box `to`, laid out by keepPartAlongAxis along each
 * of the group's axes on their own. A turned part is laid out by its box in the group's frame and keeps its
 * turn; its own width, height and depth follow the stretch along the axes they lie on (groupedPartSizeScale),
 * exactly for a part turned by quarter turns.
 */
export function keptPartsLayout(from: GroupFrameBox, to: GroupFrameBox, parts: readonly GroupPartBox[]): GroupPartPlacement[] {
  const unturned = [[1, 0, 0], [0, 1, 0], [0, 0, 1]] as const;
  return parts.map((part) => {
    const axes = part.axes ?? unturned;
    const center: Vec3 = [0, 0, 0];
    const stretch: Vec3 = [1, 1, 1];
    let shrunk = false;
    for (const axis of [0, 1, 2] as const) {
      const reach = axes.reduce((sum, own, index) => sum + Math.abs(own[axis]) * part.size[index] / 2, 0);
      const placed = keepPartAlongAxis(
        { min: part.center[axis] - reach, max: part.center[axis] + reach },
        { min: from.min[axis], max: from.max[axis] },
        { min: to.min[axis], max: to.max[axis] },
      );
      center[axis] = (placed.min + placed.max) / 2;
      stretch[axis] = reach > PLACEMENT_EPSILON ? (placed.max - placed.min) / (2 * reach) : 1;
      shrunk ||= placed.shrunk;
    }
    const own = groupedPartSizeScale(axes, stretch);
    return { center, stretch, size: [part.size[0] * own.width, part.size[1] * own.height, part.size[2] * own.depth], shrunk };
  });
}

/**
 * Whether a group offers the choice of keeping its holes and small parts at all: a group or a bundle. A hull,
 * an intersection and a loft are bodies of their own round their parts, not the parts laid side by side; a name
 * tag, an icon tag, a QR code and an SBC board are built again from their own settings in their own panels.
 */
export function offersGroupResize(shape: WorkplaneShape): boolean {
  if (!shape.groupedShapes?.length) return false;
  if (shape.groupOperation !== undefined && shape.groupOperation !== "group" && shape.groupOperation !== "bundle") return false;
  return !shape.layeredText && !shape.layeredIcon && !shape.qrCode && !shape.sbcBoard;
}

/**
 * Whether a group that offers it can keep its parts now. A mirrored group, a tapered, twisted or bent one, and
 * one with fillets, chamfers, a texture or a wrap of its own stretch everything as before: built again from its
 * parts, the last would lose what was made of the whole, and the layout does not reach into a mirror or a taper,
 * whose sides do not stand where the group's box says.
 */
export function groupCanKeepParts(shape: WorkplaneShape): boolean {
  if (!offersGroupResize(shape)) return false;
  if (shape.mirrorX || shape.mirrorY || shape.mirrorZ) return false;
  if (shapeHasShapeDeform(shape)) return false;
  return !shape.edgeTreatments?.length && !shape.surfaceTexture && !shape.cylinderWrap;
}

/** Whether resizing this group keeps its holes and small parts (Discussion #526): the setting is on and it can. */
export function groupKeepsPartsOnResize(shape: WorkplaneShape): boolean {
  return shape.groupResize === "keepParts" && groupCanKeepParts(shape);
}
