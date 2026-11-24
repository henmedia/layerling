import * as THREE from "three";
import { quaternionForShape, rotationPatchFromQuaternion } from "@/lib/geometryRotation";
import type { EdgeTreatmentHistoryEntry, WorkplaneShape } from "@/types/layerling";

type Frame = NonNullable<EdgeTreatmentHistoryEntry["appliedFrame"]>;
type Pose = Pick<WorkplaneShape, "rotation" | "rotationX" | "rotationZ" | "mirrorX" | "mirrorY" | "mirrorZ">;

const ANGLES = ["rotationX", "rotation", "rotationZ"] as const;
const MIRRORS = ["mirrorX", "mirrorY", "mirrorZ"] as const;

function samePose(a: Pose, b: Pose) {
  return ANGLES.every((angle) => Math.abs((a[angle] ?? 0) - (b[angle] ?? 0)) < 1e-6)
    && MIRRORS.every((mirror) => Boolean(a[mirror]) === Boolean(b[mirror]));
}

function poseFields(pose: Pose) {
  return {
    rotation: pose.rotation,
    rotationX: pose.rotationX,
    rotationZ: pose.rotationZ,
    mirrorX: pose.mirrorX || undefined,
    mirrorY: pose.mirrorY || undefined,
    mirrorZ: pose.mirrorZ || undefined,
  };
}

/** A pose as a matrix: the body is mirrored in its own frame, then turned, as the viewport draws it. */
function poseMatrix(pose: Pose) {
  const mirror = new THREE.Matrix4().makeScale(pose.mirrorX ? -1 : 1, pose.mirrorY ? -1 : 1, pose.mirrorZ ? -1 : 1);
  return new THREE.Matrix4().makeRotationFromQuaternion(quaternionForShape(pose)).multiply(mirror);
}

/** A matrix of turns and mirrorings read back as a pose; a mirrored one as one mirroring along x and a turn. */
function poseOfMatrix(matrix: THREE.Matrix4): Pose {
  const mirrorX = matrix.determinant() < 0;
  const turn = mirrorX ? matrix.clone().multiply(new THREE.Matrix4().makeScale(-1, 1, 1)) : matrix;
  return { ...rotationPatchFromQuaternion(new THREE.Quaternion().setFromRotationMatrix(turn)), mirrorX };
}

/**
 * A hollow body as it stands without the turns and mirrorings since its hollowing, round its middle (#2024). The sides
 * left open, the stacking rim, the floor and the dividers belong to the body: hollowed again as it stands now, a tube
 * laid down after its hollowing was opened at the sides that point up and down today.
 */
export function shapeInHollowingPose(shape: WorkplaneShape, applied: Frame | undefined): WorkplaneShape {
  return !applied || samePose(shape, applied) ? shape : { ...shape, ...poseFields(applied) };
}

/** The body hollowed again in the pose of its hollowing, turned and mirrored back to how `shape` stands. */
export function rebuiltInPoseOf(rebuilt: WorkplaneShape, shape: WorkplaneShape, applied: Frame | undefined): WorkplaneShape {
  if (!applied || samePose(shape, applied)) return rebuilt;
  const change = poseMatrix(shape).multiply(poseMatrix(applied).invert());
  const middle = (body: WorkplaneShape) => new THREE.Vector3(body.x, (body.elevation ?? 0) + body.height / 2, body.z);
  const pivot = middle(shape);
  const placed = middle(rebuilt).sub(pivot).applyMatrix4(change).add(pivot);
  // A rebuilt body that does not stand in the recorded pose takes the difference on top of its own.
  const pose = samePose(rebuilt, applied) ? shape : poseOfMatrix(change.clone().multiply(poseMatrix(rebuilt)));
  return { ...rebuilt, x: placed.x, z: placed.z, elevation: placed.y - rebuilt.height / 2, ...poseFields(pose) };
}
