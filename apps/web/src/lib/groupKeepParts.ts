import * as THREE from "three";
import { groupPartAxes, quaternionForShape, restoreGroupedChildren } from "@/lib/editorBooleans";
import { localGroupBounds } from "@/lib/editorMeshCore";
import { groupCanKeepParts, groupedContentScale, groupKeepsPartsOnResize, keptPartsLayout, offersGroupResize, type GroupFrameBox } from "@/lib/groupScale";
import { threadAsChosen } from "@/lib/groupThreadRecut";
import { carryShapePivot } from "@/lib/rotationPivot";
import { shapeDepth, shapeWidth } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

/** A group stretched by less than this along every axis counts as its own size. */
const STRETCH_TOLERANCE = 1e-6;

/** Whether a group stretches its parts at all: it was resized since it was built from them. */
function groupStretched(shape: WorkplaneShape): boolean {
  const parts = shape.groupedShapes;
  if (!parts?.length) return false;
  return groupedContentScale(shape, localGroupBounds(parts)).some((value) => Math.abs(value - 1) > STRETCH_TOLERANCE);
}

function sameSize(a: WorkplaneShape, b: WorkplaneShape): boolean {
  return shapeWidth(a) === shapeWidth(b) && a.height === b.height && shapeDepth(a) === shapeDepth(b);
}

/**
 * The groups that keep their holes and small parts (Discussion #526) and were just resized: `before` is the design
 * as it stood before the step, by id, `after` as it stands now. A group counts when it stood in the design before
 * under the same id at another size - with the handles, the size fields, Scale in percent or MCP - or when the
 * setting was just switched on for a group that was stretched already, and now stretches its parts. A group that
 * came in new (a copy, an ungrouped part, a design opened) is left as it comes, and so is one Undo or Redo brings
 * back at its own size: each is built at its size when it gets there.
 *
 * The others are found by groupsStretchedInstead: groups set to keep their parts that cannot (groupCanKeepParts).
 */
export function groupsToKeepParts(before: ReadonlyMap<string, WorkplaneShape>, after: readonly WorkplaneShape[]): WorkplaneShape[] {
  return after.filter((shape) => {
    const previous = before.get(shape.id);
    if (!previous || shape.locked || !groupKeepsPartsOnResize(shape) || !groupStretched(shape)) return false;
    return !sameSize(previous, shape) || !groupKeepsPartsOnResize(previous);
  });
}

/** The groups set to keep their parts that were just resized but stretch everything instead, mirrored or tapered. */
export function groupsStretchedInstead(before: ReadonlyMap<string, WorkplaneShape>, after: readonly WorkplaneShape[]): WorkplaneShape[] {
  return after.filter((shape) => {
    const previous = before.get(shape.id);
    return Boolean(previous) && shape.groupResize === "keepParts" && offersGroupResize(shape) && !groupCanKeepParts(shape) && !sameSize(previous!, shape);
  });
}

/**
 * The parts of a resized group laid out keeping its holes and small parts (keptPartsLayout), in the group's own
 * unturned frame where it stands, ready to be built into the group again; and how many of them had to shrink with
 * the group after all because it became smaller than they are with their distance. The group's box is the one it
 * was built at, its x and z round its middle and y up from its foot, the box it was resized from.
 *
 * Every part keeps its turn. A nested group is one part, kept or stretched as a whole. A thread keeps everything
 * it was given and takes only its place and its length from the layout, as a resized group cuts it again (#1066).
 */
export function keptPartsForResize(group: WorkplaneShape): { parts: WorkplaneShape[]; shrunk: number } {
  const children = group.groupedShapes ?? [];
  const bounds = localGroupBounds(children);
  const scale = groupedContentScale(group, bounds);
  // A group saved without the size it was built at falls back to the box of its parts, as its stretch does.
  const fromMin: [number, number, number] = [
    group.groupedBaseWidth !== undefined ? -group.groupedBaseWidth / 2 : bounds.minX,
    group.groupedBaseHeight !== undefined ? 0 : bounds.minY,
    group.groupedBaseDepth !== undefined ? -group.groupedBaseDepth / 2 : bounds.minZ,
  ];
  const fromMax: [number, number, number] = [
    group.groupedBaseWidth !== undefined ? group.groupedBaseWidth / 2 : bounds.maxX,
    group.groupedBaseHeight ?? bounds.maxY,
    group.groupedBaseDepth !== undefined ? group.groupedBaseDepth / 2 : bounds.maxZ,
  ];
  const from: GroupFrameBox = { min: fromMin, max: fromMax };
  const to: GroupFrameBox = { min: fromMin.map((value, axis) => value * scale[axis]) as [number, number, number], max: fromMax.map((value, axis) => value * scale[axis]) as [number, number, number] };
  const placements = keptPartsLayout(from, to, children.map((child) => ({
    center: [child.x, (child.elevation ?? 0) + child.height / 2, child.z],
    size: [shapeWidth(child), child.height, shapeDepth(child)],
    axes: groupPartAxes(child),
  })));
  const restored = restoreGroupedChildren({ ...group, rotation: 0, rotationX: 0, rotationZ: 0 }, placements);
  return {
    parts: restored.map((part, index) => threadAsChosen(part, children[index])),
    shrunk: placements.filter((placement) => placement.shrunk).length,
  };
}

/** What a group built again from its parts brings: its body and its parts, its size and where its box stands. */
const REBUILT_KEYS = [
  "kind", "importedMesh", "groupedShapes", "groupedBaseWidth", "groupedBaseDepth", "groupedBaseHeight", "width", "depth", "height", "size",
  "cadBrep", "cadBrepFrame", "cadDisplayEdges", "cadDisplayEdgesVersion", "cadMeshDeflection", "cadPrimitiveFrame",
] as const;

/**
 * The group built again from the parts of keptPartsForResize, put where the resized one stands: the same object
 * with everything that is its own - id, name, colour, solid or hole, Multicolor, see-through, its locks, this
 * setting and the rest - and only the body, the parts and the size of the new one. It was built unturned round the
 * resized group's middle; turned as that one is, its middle goes where that turn takes it, and its pivot stays
 * where it was in the design.
 */
export function placeKeptPartsGroup(rebuilt: WorkplaneShape, resized: WorkplaneShape): WorkplaneShape {
  const middle = new THREE.Vector3(resized.x, (resized.elevation ?? 0) + resized.height / 2, resized.z);
  const offset = new THREE.Vector3(rebuilt.x, (rebuilt.elevation ?? 0) + rebuilt.height / 2, rebuilt.z).sub(middle).applyQuaternion(quaternionForShape(resized));
  const placed: WorkplaneShape = { ...resized };
  for (const key of REBUILT_KEYS) (placed as Record<string, unknown>)[key] = rebuilt[key];
  placed.x = middle.x + offset.x;
  placed.z = middle.z + offset.z;
  placed.elevation = middle.y + offset.y - rebuilt.height / 2;
  return carryShapePivot(resized, placed);
}
