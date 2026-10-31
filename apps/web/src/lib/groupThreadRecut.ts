import { restoreGroupedChildren } from "@/lib/editorBooleans";
import { localGroupBounds } from "@/lib/editorMeshCore";
import { groupedContentScale } from "@/lib/groupScale";
import type { WorkplaneShape } from "@/types/layerling";

/** A group stretched by less than this along every axis counts as its own size. */
const STRETCH_TOLERANCE = 1e-6;

function holdsThread(parts: readonly WorkplaneShape[]): boolean {
  return parts.some((part) => part.kind === "thread" || Boolean(part.groupedShapes?.length && holdsThread(part.groupedShapes)));
}

/**
 * A group with a thread in it that has been resized (Discussion #1066). A group with a hole is cut into one body when
 * it is made, and resizing only stretches that body, the thread's turns and tapped holes with it; such a group is
 * cut again from its parts, the thread round and at its chosen size. A locked
 * group stays as it is, and one with edges or a texture on it keeps them rather than losing them to a new cut.
 */
export function groupNeedsThreadRecut(shape: WorkplaneShape): boolean {
  const parts = shape.groupedShapes;
  // Only a plain group is cut as Group cuts it; an intersection, a hull or a loft is made another way.
  if (!parts?.length || (shape.groupOperation && shape.groupOperation !== "group") || shape.locked) return false;
  if (shape.edgeTreatments?.length || shape.surfaceTexture) return false;
  if (!holdsThread(parts)) return false;
  const stretch = groupedContentScale(shape, localGroupBounds(parts));
  return stretch.some((value) => Math.abs(value - 1) > STRETCH_TOLERANCE);
}

/**
 * What the group should be cut again from: its parts as Ungroup gives them, in the group's own unturned frame - except
 * that a thread keeps everything it was given, so an M6 stays an M6. It moves with the stretch and its length follows
 * it, so a tapped hole through a plate that grows thicker still goes through.
 */
export function threadRecutParts(shape: WorkplaneShape): WorkplaneShape[] {
  const children = shape.groupedShapes ?? [];
  const restored = restoreGroupedChildren({ ...shape, rotation: 0, rotationX: 0, rotationZ: 0, mirrorX: false, mirrorY: false, mirrorZ: false });
  return restored.map((part, index) => {
    const original = children[index];
    if (part.kind !== "thread" || original?.kind !== "thread") return part;
    // Ungroup also scales the thread's depth, chamfers and head with the stretch; here all of it stays as it was chosen.
    return {
      ...original,
      id: part.id,
      x: part.x,
      z: part.z,
      elevation: part.elevation,
      height: part.height,
      rotation: part.rotation,
      rotationX: part.rotationX,
      rotationZ: part.rotationZ,
      mirrorX: part.mirrorX,
      mirrorY: part.mirrorY,
      mirrorZ: part.mirrorZ,
    };
  });
}

/**
 * The group cut again, put where the old one stood: the same object (id, name, colour and other settings), turned and
 * mirrored as it was, its middle where the old one's was.
 */
export function placeRecutGroup(recut: WorkplaneShape, original: WorkplaneShape): WorkplaneShape {
  const middle = (original.elevation ?? 0) + original.height / 2;
  return {
    ...recut,
    id: original.id,
    name: original.name,
    color: original.color,
    hole: original.hole,
    transparent: original.transparent,
    hidden: original.hidden,
    groupOperation: original.groupOperation,
    multicolor: original.multicolor,
    rotationPivot: original.rotationPivot,
    rotation: original.rotation,
    rotationX: original.rotationX,
    rotationZ: original.rotationZ,
    mirrorX: original.mirrorX,
    mirrorY: original.mirrorY,
    mirrorZ: original.mirrorZ,
    x: original.x,
    z: original.z,
    elevation: middle - recut.height / 2,
  };
}
