import type { MessageKey } from "@/lib/messages.en";
import type { EditorHistoryEntry } from "@/lib/editorHistory";
import { localIdBase } from "@/lib/localIds";
import type { EdgeTreatmentFeature, WorkplaneShape } from "@/types/layerling";

/**
 * What one step of the history did, as a sentence key and its values, so the
 * history view can say what the arrows would undo and redo. The entries carry
 * no name for the action that made them, so the step is read from the
 * difference between the state before and the state after - which also works
 * for the history of a project saved before this existed.
 */
export type HistoryStepDescription = {
  key: MessageKey;
  values?: Record<string, string | number>;
};

type ChangeKind = "moved" | "rotated" | "resized" | "color" | "hole" | "solid" | "renamed" | "mirrored" | "edges" | "rounded" | "chamfered" | "hollowed" | "offset" | "facesDeleted" | "hidden" | "shown" | "locked" | "unlocked" | "edited";

/** What a treatment the step added did, by the tool that made it. */
const FEATURE_KINDS: Record<EdgeTreatmentFeature["kind"], ChangeKind> = {
  fillet: "rounded",
  chamfer: "chamfered",
  chamfillet: "edges",
  shell: "hollowed",
  offset: "offset",
  deleteFace: "facesDeleted",
  // A texture is no treatment in the list; it is kept only in the history, for Change and Remove.
  surfaceTexture: "edited",
};

const POSITION_FIELDS = new Set(["x", "z", "elevation"]);
const ROTATION_FIELDS = new Set(["rotation", "rotationX", "rotationZ", "rotationPivot"]);
const SIZE_FIELDS = new Set(["size", "width", "depth", "height", "groupedBaseWidth", "groupedBaseDepth", "groupedBaseHeight"]);
const MIRROR_FIELDS = new Set(["mirrorX", "mirrorY", "mirrorZ"]);
const EDGE_FIELDS = new Set(["edgeTreatments", "edgeTreatmentHistory", "cadDisplayEdges", "cadDisplayEdgesVersion", "cadBrep", "cadBrepFrame", "sketchPose", "cadMeshDeflection"]);
/** Fields that follow from another change and say nothing of their own. */
const DERIVED_FIELDS = new Set(["formulas"]);

function sameValue(a: unknown, b: unknown) {
  if (a === b) return true;
  if (a === undefined || b === undefined || a === null || b === null) return false;
  if (typeof a !== "object" || typeof b !== "object") return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

function changedFields(before: WorkplaneShape, after: WorkplaneShape) {
  const fields = new Set<string>();
  const record = (shape: WorkplaneShape) => shape as unknown as Record<string, unknown>;
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    const a = record(before)[key];
    const b = record(after)[key];
    // A flag that went from missing to false (or back) is no change.
    if ((a === undefined && b === false) || (a === false && b === undefined)) continue;
    if (!sameValue(a, b)) fields.add(key);
  }
  return fields;
}

function changeKind(before: WorkplaneShape, after: WorkplaneShape, fields: Set<string>): ChangeKind | null {
  const meaningful = [...fields].filter((field) => !DERIVED_FIELDS.has(field));
  if (meaningful.length === 0) return null;
  // One more treatment is that treatment, whatever else it rebuilt - a group treated becomes a body of its own.
  const treatments = after.edgeTreatments ?? [];
  if (treatments.length === (before.edgeTreatments?.length ?? 0) + 1) return FEATURE_KINDS[treatments[treatments.length - 1].kind] ?? "edges";
  const only = (group: Set<string>) => meaningful.every((field) => group.has(field));
  if (only(new Set(["name"]))) return "renamed";
  if (only(new Set(["color"]))) return "color";
  if (only(new Set(["hole"]))) return after.hole ? "hole" : "solid";
  if (only(new Set(["hidden"]))) return after.hidden ? "hidden" : "shown";
  if (only(new Set(["locked"]))) return after.locked ? "locked" : "unlocked";
  if (only(POSITION_FIELDS)) return "moved";
  if (only(new Set([...ROTATION_FIELDS, ...POSITION_FIELDS]))) return meaningful.some((field) => ROTATION_FIELDS.has(field)) ? "rotated" : "moved";
  // A resize from a handle keeps the opposite side in place, so it moves the centre too.
  if (only(new Set([...SIZE_FIELDS, ...POSITION_FIELDS])) && meaningful.some((field) => SIZE_FIELDS.has(field))) return "resized";
  if (only(new Set([...MIRROR_FIELDS, ...POSITION_FIELDS])) && meaningful.some((field) => MIRROR_FIELDS.has(field))) return "mirrored";
  if (meaningful.some((field) => field === "edgeTreatments") && only(new Set([...EDGE_FIELDS, ...SIZE_FIELDS, ...POSITION_FIELDS]))) return "edges";
  return "edited";
}

const ONE_KEYS: Record<ChangeKind, MessageKey> = {
  moved: "historyStep.movedOne",
  rotated: "historyStep.rotatedOne",
  resized: "historyStep.resizedOne",
  color: "historyStep.colorOne",
  hole: "historyStep.holeOne",
  solid: "historyStep.solidOne",
  renamed: "historyStep.renamedOne",
  mirrored: "historyStep.mirroredOne",
  edges: "historyStep.edgesOne",
  rounded: "historyStep.roundedOne",
  chamfered: "historyStep.chamferedOne",
  hollowed: "historyStep.hollowedOne",
  offset: "historyStep.offsetOne",
  facesDeleted: "historyStep.facesDeletedOne",
  hidden: "historyStep.hiddenOne",
  shown: "historyStep.shownOne",
  locked: "historyStep.lockedOne",
  unlocked: "historyStep.unlockedOne",
  edited: "historyStep.editedOne",
};

const MANY_KEYS: Record<ChangeKind, MessageKey> = {
  moved: "historyStep.movedMany",
  rotated: "historyStep.rotatedMany",
  resized: "historyStep.resizedMany",
  color: "historyStep.colorMany",
  hole: "historyStep.holeMany",
  solid: "historyStep.solidMany",
  renamed: "historyStep.editedMany",
  mirrored: "historyStep.mirroredMany",
  edges: "historyStep.edgesMany",
  rounded: "historyStep.roundedMany",
  chamfered: "historyStep.chamferedMany",
  hollowed: "historyStep.hollowedMany",
  offset: "historyStep.offsetMany",
  facesDeleted: "historyStep.facesDeletedMany",
  hidden: "historyStep.hiddenMany",
  shown: "historyStep.shownMany",
  locked: "historyStep.lockedMany",
  unlocked: "historyStep.unlockedMany",
  edited: "historyStep.editedMany",
};

/**
 * The ids of a group's parts as they were before grouping gave them ids of
 * their own, so a part matches the object it was on the plate - and again
 * after ungrouping, which gives it yet another.
 */
function groupedBaseIds(shape: WorkplaneShape) {
  return new Set((shape.groupedShapes ?? []).map((part) => localIdBase(part.id)));
}

/** A shape's content apart from its id and where it stands: the same for a copy and its source. */
function contentSignature(shape: WorkplaneShape): string {
  const { id: _id, x: _x, z: _z, elevation: _elevation, groupedShapes, ...rest } = shape;
  return JSON.stringify({ ...rest, groupedShapes: groupedShapes?.map(contentSignature) });
}

/**
 * The objects that came in as copies of objects that were there before -
 * Duplicate, paste, an Alt-drag or a pattern - as the source each copies, or
 * null when one of them is no copy. Only shapes of the same kind and size are
 * compared in full, so a step with large meshes stays quick.
 */
function copySources(before: WorkplaneShape[], added: WorkplaneShape[]): WorkplaneShape[] | null {
  const signatures = new Map<WorkplaneShape, string>();
  const signature = (shape: WorkplaneShape) => {
    let known = signatures.get(shape);
    if (known === undefined) {
      known = contentSignature(shape);
      signatures.set(shape, known);
    }
    return known;
  };
  const sources: WorkplaneShape[] = [];
  for (const copy of added) {
    const source = before.find((candidate) => candidate.kind === copy.kind
      && candidate.width === copy.width && candidate.depth === copy.depth && candidate.height === copy.height
      && signature(candidate) === signature(copy));
    if (!source) return null;
    sources.push(source);
  }
  return sources;
}

/** How many groups are open for editing in a state, when the editor still knows; see describeHistoryStep. */
export type OpenGroupCount = (entry: EditorHistoryEntry) => number;

function describeShapes(before: WorkplaneShape[], after: WorkplaneShape[], openGroupsChange = 0): HistoryStepDescription | null {
  const beforeById = new Map(before.map((shape) => [shape.id, shape]));
  const afterById = new Map(after.map((shape) => [shape.id, shape]));
  const added = after.filter((shape) => !beforeById.has(shape.id));
  const removed = before.filter((shape) => !afterById.has(shape.id));

  if (added.length > 0 || removed.length > 0) {
    // Grouping takes the parts off the plate and puts one group in their place;
    // Done on a group open for editing does the same.
    if (added.length === 1 && removed.length > 0 && added[0].groupedShapes?.length) {
      const parts = groupedBaseIds(added[0]);
      if (removed.every((shape) => parts.has(localIdBase(shape.id)))) {
        return openGroupsChange < 0
          ? { key: "historyStep.groupClosed", values: { name: added[0].name } }
          : { key: "historyStep.grouped", values: { count: removed.length, name: added[0].name } };
      }
    }
    // Ungrouping takes a group away and puts its parts back; Edit group lays them out the same way.
    if (removed.length === 1 && added.length > 0 && removed[0].groupedShapes?.length) {
      const parts = groupedBaseIds(removed[0]);
      if (added.every((shape) => parts.has(localIdBase(shape.id)))) {
        return openGroupsChange > 0
          ? { key: "historyStep.groupOpened", values: { name: removed[0].name } }
          : { key: "historyStep.ungrouped", values: { name: removed[0].name } };
      }
    }
    // Cancel on a group open for editing puts the group back as it was.
    if (openGroupsChange < 0 && added.length === 1 && added[0].groupedShapes?.length) {
      return { key: "historyStep.groupClosed", values: { name: added[0].name } };
    }
    if (removed.length === 0) {
      const sources = copySources(before, added);
      if (sources) {
        if (sources.length === 1) return { key: "historyStep.duplicatedOne", values: { name: sources[0].name } };
        return sources.every((source) => source === sources[0])
          ? { key: "historyStep.copiesOf", values: { count: sources.length, name: sources[0].name } }
          : { key: "historyStep.duplicatedMany", values: { count: sources.length } };
      }
      return added.length === 1
        ? { key: "historyStep.addedOne", values: { name: added[0].name } }
        : { key: "historyStep.addedMany", values: { count: added.length } };
    }
    if (added.length === 0) {
      return removed.length === 1
        ? { key: "historyStep.deletedOne", values: { name: removed[0].name } }
        : { key: "historyStep.deletedMany", values: { count: removed.length } };
    }
    if (removed.length === 1 && added.length > 1) {
      return { key: "historyStep.splitOne", values: { name: removed[0].name, count: added.length } };
    }
    return { key: "historyStep.replaced", values: { removed: removed.length, added: added.length } };
  }

  const changes: { before: WorkplaneShape; after: WorkplaneShape; kind: ChangeKind }[] = [];
  for (const shape of after) {
    const previous = beforeById.get(shape.id);
    if (!previous) continue;
    const kind = changeKind(previous, shape, changedFields(previous, shape));
    if (kind) changes.push({ before: previous, after: shape, kind });
  }
  if (changes.length === 0) {
    const reordered = before.some((shape, index) => after[index]?.id !== shape.id);
    return reordered ? { key: "historyStep.reordered" } : null;
  }
  if (changes.length === 1) {
    const [change] = changes;
    if (change.kind === "renamed") {
      return { key: "historyStep.renamedOne", values: { name: change.before.name, newName: change.after.name } };
    }
    return { key: ONE_KEYS[change.kind], values: { name: change.after.name } };
  }
  const kind = changes.every((change) => change.kind === changes[0].kind) ? changes[0].kind : "edited";
  return { key: MANY_KEYS[kind], values: { count: changes.length } };
}

function describeNotes(before: EditorHistoryEntry, after: EditorHistoryEntry): HistoryStepDescription | null {
  const beforeNotes = before.notes ?? [];
  const afterNotes = after.notes ?? [];
  if (sameValue(beforeNotes, afterNotes)) return null;
  const beforeIds = new Set(beforeNotes.map((note) => note.id));
  const afterIds = new Set(afterNotes.map((note) => note.id));
  const added = afterNotes.filter((note) => !beforeIds.has(note.id));
  const removed = beforeNotes.filter((note) => !afterIds.has(note.id));
  const isPoint = (note: { kind?: string }) => note.kind === "point";
  if (added.length > 0 && removed.length === 0) {
    return { key: added.every(isPoint) ? "historyStep.pointAdded" : "historyStep.noteAdded" };
  }
  if (removed.length > 0 && added.length === 0) {
    return { key: removed.every(isPoint) ? "historyStep.pointRemoved" : "historyStep.noteRemoved" };
  }
  const changed = afterNotes.filter((note) => beforeIds.has(note.id));
  return { key: changed.length > 0 && changed.every(isPoint) && added.length === 0 ? "historyStep.pointChanged" : "historyStep.noteChanged" };
}

/**
 * What the step from `before` to `after` did. Without a state before it, the
 * entry is where the history begins. `openGroups` tells opening and closing a
 * group for editing apart from ungrouping and grouping, which change the
 * shapes the same way; without it (or for a history loaded from a file, which
 * does not keep which groups were open) they read as the latter.
 */
export function describeHistoryStep(before: EditorHistoryEntry | undefined, after: EditorHistoryEntry, openGroups?: OpenGroupCount): HistoryStepDescription {
  if (!before) return { key: "historyStep.start" };
  const openGroupsChange = openGroups ? Math.sign(openGroups(after) - openGroups(before)) : 0;
  const shapes = describeShapes(before.shapes, after.shapes, openGroupsChange);
  if (shapes) return shapes;
  const notes = describeNotes(before, after);
  if (notes) return notes;
  if (!sameValue(before.placementWorkplane, after.placementWorkplane)) return { key: "historyStep.workplane" };
  return { key: "historyStep.changed" };
}

/** The steps the arrows of the History view would undo and redo from the state at `index`. */
export function historyStepsAround(entries: EditorHistoryEntry[], index: number, openGroups?: OpenGroupCount) {
  return {
    last: index > 0 ? describeHistoryStep(entries[index - 1], entries[index], openGroups) : null,
    next: index < entries.length - 1 ? describeHistoryStep(entries[index], entries[index + 1], openGroups) : null,
  };
}
