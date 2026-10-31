import * as THREE from "three";
import type { WorkplaneShape } from "@/types/layerling";
import { hingeLocalParts } from "@/lib/hingeGeometry";
import { meshYawDegrees, mirrorSign } from "@/lib/workplaneShapes";

export type HingeWorldPart = WorkplaneShape & {
  /** The knuckle of the cone hinge's B the part belongs to, as in `hingeLocalParts`. */
  knuckle?: number;
};

/**
 * The hinge's exact parts placed in the world, as ordinary shapes the edge
 * tool and the STEP export already build exactly. A round part - a lying
 * cylinder or tube, an upright corner cylinder or screw hole - is turned only
 * about x and z: round shapes ignore their yaw when they are placed, and being
 * round, any turn that sets the axis the right way is the same body; a cone
 * points one way, so its axis is its tip's direction. The screw holes keep
 * their `hole` mark and are cut out of the rest.
 */
export function hingeWorldParts(hinge: WorkplaneShape): HingeWorldPart[] {
  const centerY = hinge.height / 2;
  const turn = new THREE.Euler(
    THREE.MathUtils.degToRad(hinge.rotationX ?? 0),
    THREE.MathUtils.degToRad(meshYawDegrees(hinge)),
    THREE.MathUtils.degToRad(hinge.rotationZ ?? 0),
    "XYZ",
  );
  const quaternion = new THREE.Quaternion().setFromEuler(turn);
  const matrix = new THREE.Matrix4()
    .makeTranslation(hinge.x, (hinge.elevation ?? 0) + centerY, hinge.z)
    .multiply(new THREE.Matrix4().makeRotationFromQuaternion(quaternion))
    .multiply(new THREE.Matrix4().makeScale(mirrorSign(hinge.mirrorX), mirrorSign(hinge.mirrorY), mirrorSign(hinge.mirrorZ)))
    .multiply(new THREE.Matrix4().makeTranslation(0, -centerY, 0));
  const mirror = new THREE.Matrix4().makeScale(mirrorSign(hinge.mirrorX), mirrorSign(hinge.mirrorY), mirrorSign(hinge.mirrorZ));
  const mirrorInverse = mirror.clone().invert();
  return hingeLocalParts({ ...hinge, depth: hinge.depth ?? hinge.width }).map((part, index) => {
    const center = new THREE.Vector3(part.x, (part.elevation ?? 0) + part.height / 2, part.z).applyMatrix4(matrix);
    let rotation = { rotationX: hinge.rotationX ?? 0, rotation: hinge.rotation, rotationZ: hinge.rotationZ ?? 0 };
    // A box, or a nut's six-sided pocket, turns with the hinge about its own axis too: it is not round.
    const square = part.kind === "box" || part.kind === "polygon";
    if (square && part.rotationX) {
      // A folded leaf: its own turn about the axis, seen through the hinge's mirror, then the hinge's turn.
      const fold = new THREE.Matrix4().makeRotationX(THREE.MathUtils.degToRad(part.rotationX));
      const own = new THREE.Quaternion().setFromRotationMatrix(mirror.clone().multiply(fold).multiply(mirrorInverse));
      const euler = new THREE.Euler().setFromQuaternion(quaternion.clone().multiply(own), "XYZ");
      rotation = { rotationX: THREE.MathUtils.radToDeg(euler.x), rotation: THREE.MathUtils.radToDeg(euler.y), rotationZ: THREE.MathUtils.radToDeg(euler.z) };
    } else if (!square) {
      // Where the axis points: along the hinge's own x when lying, else up, folded with B's leaf and seen through the
      // mirror (a countersink's head stays on the leaf's top); a cone's towards its tip, which its own turn sets.
      const axis = part.kind === "cone"
        ? new THREE.Vector3(0, 1, 0).applyEuler(new THREE.Euler(THREE.MathUtils.degToRad(part.rotationX ?? 0), 0, THREE.MathUtils.degToRad(part.rotationZ ?? 0), "XYZ")).applyMatrix4(mirror).applyQuaternion(quaternion).normalize()
        : part.rotationZ === 90
          ? new THREE.Vector3(1, 0, 0).applyQuaternion(quaternion).normalize()
          : new THREE.Vector3(0, 1, 0).applyMatrix4(new THREE.Matrix4().makeRotationX(THREE.MathUtils.degToRad(part.rotationX ?? 0))).applyMatrix4(mirror).applyQuaternion(quaternion).normalize();
      const sinZ = THREE.MathUtils.clamp(-axis.x, -1, 1);
      const rotationZ = Math.asin(sinZ);
      const rotationX = Math.atan2(axis.z, axis.y);
      rotation = { rotationX: THREE.MathUtils.radToDeg(rotationX), rotation: 0, rotationZ: THREE.MathUtils.radToDeg(rotationZ) };
    }
    return {
      id: `${hinge.id}-part-${index}`,
      name: hinge.name,
      kind: part.kind,
      color: hinge.color,
      x: center.x,
      z: center.z,
      elevation: center.y - part.height / 2,
      size: Math.max(part.width, part.depth ?? part.width),
      width: part.width,
      depth: part.depth,
      height: part.height,
      ...rotation,
      bevel: part.bevel,
      ...(part.hole ? { hole: true } : {}),
      ...(part.kind === "countersink" ? { screwHoleShaft: part.screwHoleShaft, screwHoleAngle: part.screwHoleAngle } : {}),
      ...(part.kind === "polygon" ? { sides: part.sides } : {}),
      ...(part.knuckle === undefined ? {} : { knuckle: part.knuckle }),
    };
  });
}

/** B's knuckles each in a scope of their own, below zero where the groups' scopes count up (restoreGroupedChildrenForEdges). */
export function hingePartScope(scope: number[], part: HingeWorldPart) {
  return part.knuckle === undefined ? scope : [...scope, -1 - part.knuckle];
}
