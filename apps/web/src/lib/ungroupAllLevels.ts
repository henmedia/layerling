import { groupBeforeEdgeTreatments, wasGroupBeforeEdgeTreatments } from "@/lib/edgeTreatmentHistory";
import { restoreGroupedChildren } from "@/lib/editorBooleans";
import { groupHeld } from "@/lib/shapeLock";
import type { WorkplaneShape } from "@/types/layerling";

/**
 * Whether ungrouping every level takes this part of a group apart too: a plain group that is not locked. A bundle, a
 * hull, an intersection and a loft are bodies of their own and stay whole.
 */
function opensFurther(part: WorkplaneShape) {
  if (groupHeld(part) || (part.groupOperation ?? "group") !== "group") return false;
  return Boolean(part.groupedShapes?.length) || wasGroupBeforeEdgeTreatments(part);
}

/** Whether a group holds groups that ungrouping every level takes apart too; with edge features it looks beneath them. */
export function hasGroupsInside(group: WorkplaneShape): boolean {
  const opened = group.groupedShapes?.length ? group : groupBeforeEdgeTreatments(group);
  return Boolean(opened?.groupedShapes?.some(opensFurther));
}

/** The parts of one group where they stand; a group with a fillet or chamfer takes its edge features back first (#514). */
export function ungroupedParts(group: WorkplaneShape): WorkplaneShape[] {
  const opened = group.groupedShapes?.length ? group : groupBeforeEdgeTreatments(group);
  return opened ? restoreGroupedChildren(opened) : [];
}

/** The parts of a group with the groups inside it taken apart as well, down to the last one. */
export function ungroupAllLevels(group: WorkplaneShape): WorkplaneShape[] {
  return ungroupedParts(group).flatMap((part) => opensFurther(part) ? ungroupAllLevels(part) : [part]);
}
