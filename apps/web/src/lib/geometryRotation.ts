import * as THREE from "three";
import type { PlacementWorkplane } from "@/lib/placementWorkplane";
import { cleanNearZero, cleanRotationDegrees } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

export const GEOMETRY_ROTATION_STEP_DEGREES = 45;
export const GEOMETRY_FINE_ROTATION_STEP_DEGREES = 22.5;

type GeometryRotationShortcutEvent = {
  altKey: boolean;
  code: string;
  ctrlKey: boolean;
  key: string;
  metaKey: boolean;
  shiftKey: boolean;
};

export function geometryRotationDegreesForShortcut(event: GeometryRotationShortcutEvent) {
  if (event.ctrlKey || event.metaKey || event.altKey) {
    return null;
  }
  if (event.code !== "KeyR" && (event.key ?? "").toLowerCase() !== "r") {
    return null;
  }
  return event.shiftKey ? GEOMETRY_FINE_ROTATION_STEP_DEGREES : GEOMETRY_ROTATION_STEP_DEGREES;
}

export function geometryRotationDelta(workplane: PlacementWorkplane, degrees: number) {
  const axis = new THREE.Vector3(workplane.normal.x, workplane.normal.y, workplane.normal.z);
  if (axis.lengthSq() < 0.000001) {
    axis.set(0, 1, 0);
  } else {
    axis.normalize();
  }
  return new THREE.Quaternion().setFromAxisAngle(axis, THREE.MathUtils.degToRad(Number.isFinite(degrees) ? degrees : 0));
}

type ShapeRotation = Pick<WorkplaneShape, "rotation"> & { rotationX?: number; rotationZ?: number };

/**
 * Zwei Drehungen hintereinander. Ueber Eulerwinkel liesse sich das nicht
 * ehrlich addieren - ueber Quaternionen schon, und heraus kommen wieder die
 * drei Winkel, die der Datensatz fuehrt.
 */
export function composedShapeRotation(outer: ShapeRotation, inner: ShapeRotation) {
  return rotationPatchFromQuaternion(quaternionForShape(outer).multiply(quaternionForShape(inner)));
}

export function quaternionForShape(shape: ShapeRotation) {
  return new THREE.Quaternion().setFromEuler(
    new THREE.Euler(
      THREE.MathUtils.degToRad(shape.rotationX ?? 0),
      THREE.MathUtils.degToRad(shape.rotation),
      THREE.MathUtils.degToRad(shape.rotationZ ?? 0),
      "XYZ",
    ),
  );
}

/**
 * Liegt die Richtung auf einer eigenen Achse des Koerpers (in welche Richtung
 * auch immer)? Dann laesst sich ein Zug entlang dieser Richtung als blosses
 * Mass ausdruecken, und die Drehung bleibt stehen (Forum 617212).
 */
export function directionIsOwnShapeAxis(shape: ShapeRotation, direction: { x: number; y: number; z: number }) {
  const wanted = new THREE.Vector3(direction.x, direction.y, direction.z);
  if (wanted.lengthSq() < 1e-12) return false;
  wanted.normalize();
  const quaternion = quaternionForShape(shape);
  return [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)]
    .some((axis) => Math.abs(axis.applyQuaternion(quaternion).dot(wanted)) > 1 - 1e-6);
}

/** An angle in degrees between -180 and 180. */
export function signedDegrees(value: number) {
  const wrapped = ((value % 360) + 360) % 360;
  return wrapped > 180 ? wrapped - 360 : wrapped;
}

/**
 * The X, Y and Z angles of a turn, the way a person would write them. Every
 * turn has two sets of XYZ angles - (x, y, z) and (x + 180, 180 - y, z + 180)
 * are the same turn - and the plain conversion sometimes picks the odd one: a
 * quarter and a half turn about Y came out as X 180, Y 45, Z 180. Of the two,
 * the one with the smaller tilts about X and Z is taken.
 */
export function readableEulerDegrees(quaternion: THREE.Quaternion) {
  const euler = new THREE.Euler().setFromQuaternion(quaternion, "XYZ");
  const first = [euler.x, euler.y, euler.z].map((angle) => signedDegrees(THREE.MathUtils.radToDeg(angle)));
  const second = [signedDegrees(first[0] + 180), signedDegrees(180 - first[1]), signedDegrees(first[2] + 180)];
  const tilt = ([x, y, z]: number[]) => Math.abs(x) + Math.abs(z) + Math.abs(y) * 1e-6;
  const [x, y, z] = tilt(second) < tilt(first) - 1e-6 ? second : first;
  return { x, y, z };
}

export function rotationPatchFromQuaternion(quaternion: THREE.Quaternion) {
  const { x, y, z } = readableEulerDegrees(quaternion);
  return {
    rotationX: cleanRotationDegrees(x),
    rotation: cleanRotationDegrees(y),
    rotationZ: cleanRotationDegrees(z),
  };
}

export function rotatedGeometryShapePatch(
  shape: WorkplaneShape,
  rotationDelta: THREE.Quaternion,
  pivot: THREE.Vector3 | null,
): Partial<WorkplaneShape> {
  const patch: Partial<WorkplaneShape> = rotationPatchFromQuaternion(
    rotationDelta.clone().multiply(quaternionForShape(shape)),
  );

  if (pivot) {
    const startCenter = new THREE.Vector3(shape.x, (shape.elevation ?? 0) + shape.height / 2, shape.z);
    const nextCenter = pivot.clone().add(startCenter.sub(pivot).applyQuaternion(rotationDelta));
    patch.x = cleanNearZero(nextCenter.x, 0.0005);
    patch.z = cleanNearZero(nextCenter.z, 0.0005);
    patch.elevation = cleanNearZero(nextCenter.y - shape.height / 2, 0.0005);
  }

  return patch;
}
