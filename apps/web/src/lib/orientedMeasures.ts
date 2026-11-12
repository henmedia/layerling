import * as THREE from "three";
import { quaternionForShape } from "@/lib/geometryRotation";
import type { WorkplaneShape } from "@/types/layerling";

/**
 * The size fields of a turned body (#230). A body keeps its own measures - width along its own x,
 * height along its own y, length along its own z - whatever way it is turned. After "Lay flat" a
 * roof's "height" field therefore still meant the roof's own height, which then ran sideways.
 *
 * When the body stands turned by right angles each own axis lies on one axis of the scene, and the
 * fields can say so: the one that runs up is the Height, the one along X the Width, the one along
 * Y (the back, as a slicer sees it) the Length. Only the labels and the order change; every field
 * still writes the same measure of the body.
 */
export type MeasureField = "width" | "height" | "length";

const OWN_AXES: Record<MeasureField, [number, number, number]> = {
  width: [1, 0, 0],
  height: [0, 1, 0],
  length: [0, 0, 1],
};

/** How close to an axis of the scene counts as on it: about 0.8 degrees. */
const ALIGNED = 1 - 1e-4;

export type OrientedMeasures =
  /** Not turned at all: the fields mean what they say. */
  | { kind: "upright" }
  /** Turned by right angles: `meaning[field]` is the direction that own measure runs in now. */
  | { kind: "aligned"; meaning: Record<MeasureField, MeasureField> }
  /** Turned some other way: no word for the directions fits. */
  | { kind: "tilted" };

export function orientedMeasures(shape: Pick<WorkplaneShape, "rotation" | "rotationX" | "rotationZ">): OrientedMeasures {
  const quaternion = quaternionForShape(shape);
  if (Math.abs(Math.abs(quaternion.w) - 1) < 1e-9) return { kind: "upright" };
  const meaning = {} as Record<MeasureField, MeasureField>;
  for (const field of Object.keys(OWN_AXES) as MeasureField[]) {
    const [x, y, z] = OWN_AXES[field];
    const turned = new THREE.Vector3(x, y, z).applyQuaternion(quaternion);
    const along = [Math.abs(turned.x), Math.abs(turned.y), Math.abs(turned.z)];
    const strongest = along.indexOf(Math.max(...along));
    if (along[strongest] < ALIGNED) return { kind: "tilted" };
    meaning[field] = strongest === 0 ? "width" : strongest === 1 ? "height" : "length";
  }
  const same = meaning.width === "width" && meaning.height === "height" && meaning.length === "length";
  return same ? { kind: "upright" } : { kind: "aligned", meaning };
}

/** The usual order of the fields: length, width, height - by the direction each one means now. */
const FIELD_ORDER: Record<MeasureField, number> = { length: 0, width: 1, height: 2 };

/**
 * Whether a field is one of the three plain measures, called by `labels` Width, Height or Length. A
 * measure with a name of its own - a countersink's Head diameter and Total length, a cylinder's
 * Diameter - means the same whichever way the body lies, and keeps its name and place (#1634).
 */
export function isPlainMeasure(field: { id: string; label: string }, labels: Record<MeasureField, string>): boolean {
  return field.id in OWN_AXES && Object.values(labels).includes(field.label);
}

/**
 * `fields` relabelled and put in the usual order by what each measure means now. `labels` holds the
 * wording of the three directions. Fields other than the three plain measures stay as they were.
 */
export function withOrientedMeasures<T extends { id: string; label: string }>(
  fields: readonly T[],
  oriented: OrientedMeasures,
  labels: Record<MeasureField, string>,
): T[] {
  if (oriented.kind !== "aligned") return [...fields];
  const isMeasure = (field: T) => isPlainMeasure(field, labels);
  const relabelled = fields.map((field) => (isMeasure(field) ? { ...field, label: labels[oriented.meaning[field.id as MeasureField]] } : field));
  // The measures take back the places they stood in, sorted among themselves.
  const sorted = relabelled
    .filter(isMeasure)
    .sort((a, b) => FIELD_ORDER[oriented.meaning[a.id as MeasureField]] - FIELD_ORDER[oriented.meaning[b.id as MeasureField]]);
  let next = 0;
  return relabelled.map((field) => (isMeasure(field) ? sorted[next++] : field));
}
