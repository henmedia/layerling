import * as THREE from "three";
import { cadBrepTransformForShape, cadTransformFromMatrix, cadTransformToMatrix } from "@/lib/cadBakeMetadata";
import { quaternionForShape } from "@/lib/geometryRotation";
import {
  placementPatchForNewShape,
  placementWorkplanePoint,
  type PlacementWorkplane,
} from "@/lib/placementWorkplane";
import { sketchBodyStretch } from "@/lib/sketchResize";
import { canonicalizeShape, cleanRotationDegrees } from "@/lib/workplaneShapes";
import type { SketchPose, WorkplaneShape } from "@/types/layerling";

export function placeSketchShape(
  shape: WorkplaneShape,
  workplane: PlacementWorkplane,
  existing?: WorkplaneShape | null,
) {
  if (existing) return placedLikeExisting(shape, existing);

  const basePoint = placementWorkplanePoint(workplane, shape.x, shape.z);
  return canonicalizeShape({
    ...shape,
    ...placementPatchForNewShape(shape, workplane, basePoint),
  });
}

/** A rebuilt sketch body put where the body it replaces stands, turned and mirrored as that one. */
export function placedLikeExisting(shape: WorkplaneShape, existing: WorkplaneShape) {
  return canonicalizeShape({
    ...shape,
    x: existing.x,
    z: existing.z,
    elevation: existing.elevation ?? 0,
    rotation: existing.rotation,
    rotationX: existing.rotationX ?? 0,
    rotationZ: existing.rotationZ ?? 0,
    mirrorX: existing.mirrorX,
    mirrorY: existing.mirrorY,
    mirrorZ: existing.mirrorZ,
    locked: existing.locked,
    hidden: existing.hidden,
    sketchPose: undefined,
  });
}

export const placeSketchExtrusion = placeSketchShape;

/** A point in a sketch's own coordinates. */
export type SketchAnchor = { x: number; z: number };

/**
 * Where the middle of an extruded sketch body sits in its sketch's own coordinates. The body stands at
 * its x and z with that point under its middle, so the sketch is drawn over the body by putting this
 * point there (#291). The exact body remembers it: its frame is the middle of the outline as it was
 * built, curves included. Without it - or while the body is stretched - the middle of the points
 * stands in, which is the same for an outline of straight lines.
 */
export function sketchBodyAnchor(shape: WorkplaneShape): SketchAnchor {
  if (shape.sketchPose) return { ...shape.sketchPose.anchor };
  const frame = shape.cadBrepFrame;
  if (shape.cadBrep && frame && !sketchBodyStretch(shape)) return { x: frame.x, z: frame.z };
  const points = shape.sketchProfile?.points ?? [];
  if (!points.length) return { x: 0, z: 0 };
  const xs = points.map((point) => point.x);
  const zs = points.map((point) => point.z);
  return { x: (Math.min(...xs) + Math.max(...xs)) / 2, z: (Math.min(...zs) + Math.max(...zs)) / 2 };
}

/**
 * An edited sketch body, put where its outline is: the rebuilt body is centred on its new outline, so
 * it moves by as much as that middle moved in the sketch - turned into the body's own directions
 * (`xAxis`, `zAxis`: where its sketch axes point in the world). What the edit left alone stays where it
 * was; before, the body kept its middle and a corner pulled out moved everything else (#291).
 */
export function movedWithEditedOutline(
  placed: WorkplaneShape,
  existing: WorkplaneShape,
  before: SketchAnchor,
  after: SketchAnchor,
  axes: { x: readonly [number, number, number]; z: readonly [number, number, number] },
) {
  const dx = after.x - before.x;
  const dz = after.z - before.z;
  if (Math.abs(dx) < 1e-9 && Math.abs(dz) < 1e-9) return placed;
  return canonicalizeShape({
    ...placed,
    x: existing.x + axes.x[0] * dx + axes.z[0] * dz,
    z: existing.z + axes.x[2] * dx + axes.z[2] * dz,
    elevation: (existing.elevation ?? 0) + axes.x[1] * dx + axes.z[1] * dz,
  });
}

/** Where a sketch body's sketch lies in the world: sketch points (y up from the sketch) taken to where they stand. */
export function sketchToWorldMatrix(shape: WorkplaneShape) {
  const anchor = sketchBodyAnchor(shape);
  const quaternion = quaternionForShape(shape);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(quaternion);
  const bottom = new THREE.Vector3(shape.x, (shape.elevation ?? 0) + shape.height / 2, shape.z).addScaledVector(up, -shape.height / 2);
  return new THREE.Matrix4()
    .compose(bottom, quaternion, new THREE.Vector3(1, 1, 1))
    .multiply(new THREE.Matrix4().makeTranslation(-anchor.x, 0, -anchor.z));
}

/**
 * A sketch body whose turn and place an edge treatment or hollowing baked into its exact body (#1006), as it stood before:
 * turned and placed so that its sketch lies where it was drawn, at its extrusion's height. Edit sketch opens it there
 * and the body built from it again stands there. Any other body, or one stretched or mirrored since, as it is.
 */
export function sketchPoseOf(shape: WorkplaneShape): WorkplaneShape {
  const pose = shape.sketchPose;
  if (!pose || !shape.sketchProfile || !shape.cadBrep || !shape.cadBrepFrame) return shape;
  const matrix = cadTransformToMatrix(cadBrepTransformForShape(shape)).multiply(cadTransformToMatrix(pose.transform));
  if (matrix.determinant() < 0) return shape;
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  matrix.decompose(position, quaternion, scale);
  if ([scale.x, scale.y, scale.z].some((value) => Math.abs(value - 1) > 1e-3)) return shape;
  const middle = new THREE.Vector3(pose.anchor.x, pose.height / 2, pose.anchor.z).applyMatrix4(matrix);
  const turn = new THREE.Euler().setFromQuaternion(quaternion, "XYZ");
  return {
    ...shape,
    x: middle.x,
    z: middle.z,
    elevation: middle.y - pose.height / 2,
    height: pose.height,
    rotation: cleanRotationDegrees(THREE.MathUtils.radToDeg(turn.y), 6),
    rotationX: cleanRotationDegrees(THREE.MathUtils.radToDeg(turn.x), 6),
    rotationZ: cleanRotationDegrees(THREE.MathUtils.radToDeg(turn.z), 6),
  };
}

/**
 * What a sketch body keeps of its sketch's place when its exact body is baked where it stands, turned and placed (see
 * SketchPose): the baked body's coordinates are the world's at that moment. Undefined for a revolve or a sweep, and for
 * a body mirrored or stretched, whose sketch no longer lies as drawn.
 */
export function bakedSketchPose(source: WorkplaneShape): SketchPose | undefined {
  if (!source.sketchProfile || (source.sketchOperation && source.sketchOperation !== "extrude") || source.sketchRevolve) return undefined;
  const posed = sketchPoseOf(source);
  if (source.sketchPose && posed === source) return undefined;
  if (posed.mirrorX || posed.mirrorY || posed.mirrorZ || (!posed.sketchPose && sketchBodyStretch(posed))) return undefined;
  return { transform: cadTransformFromMatrix(sketchToWorldMatrix(posed)), height: posed.height, anchor: sketchBodyAnchor(posed) };
}
