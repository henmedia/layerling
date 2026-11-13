import { bentTubeSettings } from "@/lib/bentTubeGeometry";
import { canonicalizeShape, hollowStretchSincePicture } from "@/lib/workplaneShapes";
import type { EdgeTreatmentHistoryEntry, WorkplaneShape } from "@/types/layerling";

export function edgeTreatmentAppliedFrame(shape: WorkplaneShape): NonNullable<EdgeTreatmentHistoryEntry["appliedFrame"]> {
  return {
    x: shape.x,
    z: shape.z,
    elevation: shape.elevation ?? 0,
    width: shape.width,
    depth: shape.depth,
    height: shape.height,
    rotation: shape.rotation ?? 0,
    rotationX: shape.rotationX ?? 0,
    rotationZ: shape.rotationZ ?? 0,
    mirrorX: Boolean(shape.mirrorX),
    mirrorY: Boolean(shape.mirrorY),
    mirrorZ: Boolean(shape.mirrorZ),
  };
}

function cloneJsonShape(shape: WorkplaneShape): WorkplaneShape {
  return JSON.parse(JSON.stringify(canonicalizeShape(shape))) as WorkplaneShape;
}

function compactSnapshotHistory(shape: WorkplaneShape, stripOwnHistory: boolean): WorkplaneShape {
  const next: WorkplaneShape = {
    ...shape,
    groupedShapes: shape.groupedShapes?.map((child) => compactSnapshotHistory(child, false)),
  };
  if (stripOwnHistory) {
    delete next.edgeTreatmentHistory;
  } else if (shape.edgeTreatmentHistory) {
    next.edgeTreatmentHistory = shape.edgeTreatmentHistory.map((entry) => ({
      ...entry,
      before: compactSnapshotHistory(entry.before, true),
    }));
  }
  return next;
}

export function cloneWorkplaneShapeSnapshot(shape: WorkplaneShape): WorkplaneShape {
  return canonicalizeShape(compactSnapshotHistory(cloneJsonShape(shape), true));
}

export function compactEdgeTreatmentHistory(history: EdgeTreatmentHistoryEntry[] | undefined): EdgeTreatmentHistoryEntry[] {
  return (history ?? []).map((entry) => ({
    ...entry,
    feature: { ...entry.feature },
    before: cloneWorkplaneShapeSnapshot(entry.before),
  }));
}

/**
 * Whether this body was a group before its fillets and chamfers (#514): a group that got an edge feature is one mesh
 * with the history of its features, and the first of them remembers the group as it was. Cheap, for the buttons.
 */
export function wasGroupBeforeEdgeTreatments(shape: WorkplaneShape) {
  return !shape.groupedShapes?.length && Boolean(shape.edgeTreatmentHistory?.[0]?.before.groupedShapes?.length);
}

/** The group such a body was before its first edge feature, with the body's own place and size; null when it was none. */
export function groupBeforeEdgeTreatments(shape: WorkplaneShape): WorkplaneShape | null {
  if (!wasGroupBeforeEdgeTreatments(shape)) return null;
  return restoreShapeBeforeEdgeTreatment(shape, shape.edgeTreatmentHistory![0]);
}

/**
 * The tube, ring or bent tube such a body was before its first fillet or chamfer, with the body's own place and size;
 * null when it was none. Its bore still cuts what the body is grouped with (#1067): the fillet made it one mesh,
 * and the mesh alone has no bore to hand on.
 */
export function tubeBeforeEdgeTreatments(shape: WorkplaneShape): WorkplaneShape | null {
  const first = shape.edgeTreatmentHistory?.[0];
  if (!shape.importedMesh || shape.groupedShapes?.length || !first) return null;
  const before = first.before;
  const hollow = before.kind === "tube" || before.kind === "ring" || (before.kind === "bentTube" && bentTubeSettings(before).innerProfile !== "none");
  return hollow ? restoreShapeBeforeEdgeTreatment(shape, first) : null;
}

/**
 * The shape of its own (a Hirth joint, a gear, a cylinder ...) this body was before its first edge feature, as it was
 * then; null when it was a group, an imported mesh or nothing. A fillet makes the body a fixed one with only its three
 * measures, and the panel says where the other settings went (#1689).
 */
export function shapeBeforeEdgeTreatments(shape: WorkplaneShape): WorkplaneShape | null {
  const first = shape.edgeTreatmentHistory?.[0];
  if (!first || !shape.importedMesh || shape.groupedShapes?.length) return null;
  const before = first.before;
  if (before.importedMesh || before.groupedShapes?.length || before.kind === "mesh") return null;
  return before;
}

export function restoreShapeBeforeEdgeTreatment(shape: WorkplaneShape, entry: EdgeTreatmentHistoryEntry) {
  const before = cloneWorkplaneShapeSnapshot(entry.before);
  const entryIndex = (shape.edgeTreatmentHistory ?? []).findIndex((candidate) => candidate.id === entry.id);
  const earlierHistory = entryIndex > 0
    ? compactEdgeTreatmentHistory(shape.edgeTreatmentHistory?.slice(0, entryIndex))
    : undefined;
  const applied = entry.appliedFrame;
  const stretch = hollowStretchSincePicture(shape, entry);
  const width = applied ? before.width * stretch.x : before.width;
  const depth = applied ? before.depth * stretch.z : before.depth;
  const height = applied ? before.height * stretch.height : before.height;
  const toggleMirror = (beforeValue: boolean | undefined, currentValue: boolean | undefined, appliedValue: boolean | undefined) => (
    Boolean(beforeValue) !== (Boolean(currentValue) !== Boolean(appliedValue))
  ) || undefined;
  return canonicalizeShape({
    ...before,
    id: shape.id,
    name: shape.name,
    color: shape.color,
    hole: shape.hole || undefined,
    locked: shape.locked,
    hidden: shape.hidden,
    x: applied ? before.x + shape.x - applied.x : before.x,
    z: applied ? before.z + shape.z - applied.z : before.z,
    // Kept by its middle, as x and z are: a body turned before it was baked has its bottom elsewhere, and kept by
    // the bottom a teardrop stood up and hollowed sank 28 mm into the plate when it was made bigger (Discussion #1150).
    elevation: applied
      ? (before.elevation ?? 0) + before.height / 2 + ((shape.elevation ?? 0) + shape.height / 2) - (applied.elevation + applied.height / 2) - height / 2
      : before.elevation,
    width,
    depth,
    height,
    size: Math.max(width, depth),
    rotation: applied ? (before.rotation ?? 0) + (shape.rotation ?? 0) - applied.rotation : before.rotation,
    rotationX: applied ? (before.rotationX ?? 0) + (shape.rotationX ?? 0) - applied.rotationX : before.rotationX,
    rotationZ: applied ? (before.rotationZ ?? 0) + (shape.rotationZ ?? 0) - applied.rotationZ : before.rotationZ,
    mirrorX: applied ? toggleMirror(before.mirrorX, shape.mirrorX, applied.mirrorX) : before.mirrorX,
    mirrorY: applied ? toggleMirror(before.mirrorY, shape.mirrorY, applied.mirrorY) : before.mirrorY,
    mirrorZ: applied ? toggleMirror(before.mirrorZ, shape.mirrorZ, applied.mirrorZ) : before.mirrorZ,
    edgeTreatmentHistory: earlierHistory?.length ? earlierHistory : undefined,
  });
}
