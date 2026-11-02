import * as THREE from "three";
import { quaternionForShape, rotatedGeometryShapePatch } from "@/lib/geometryRotation";
import { placementWorkplaneFromSurface, placementWorkplaneQuaternion, type PlacementWorkplane } from "@/lib/placementWorkplane";
import { cleanNearZero, shapeDepth, shapeWidth } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

type Vec = { x: number; y: number; z: number };

/**
 * the usual Cruise for parts already placed (#195): the selection is set down on a face - its
 * underside (the bottom of the leading part, as that part stands) turned onto the face and its
 * foot, the middle of that underside, on the point. The leading part lines up with the face as a
 * new shape dropped there would, keeping only its own turn about its up axis - so its edges run
 * along the face's edges instead of standing askew after a shortest turn. Only the angles and
 * the place of each part change: nothing is baked.
 */
export function carriedOntoFace(
  shapes: readonly WorkplaneShape[],
  ids: readonly string[],
  target: { point: Vec; normal: Vec; workplane?: PlacementWorkplane },
  leadId?: string,
  /** Sunk into the face: the top of the selection, as it stands, on the point, so the parts go below it (#940). */
  sunk = false,
): Map<string, Partial<WorkplaneShape>> {
  const moving = shapes.filter((shape) => ids.includes(shape.id));
  const patches = new Map<string, Partial<WorkplaneShape>>();
  if (!moving.length) return patches;
  const lead = moving.find((shape) => shape.id === leadId) ?? moving[0];
  const leadTurn = quaternionForShape(lead);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(leadTurn).normalize();
  // The lead's own spin about its up axis, measured against the frame a face facing `up` has.
  const spin = frameFacing(up).invert().multiply(leadTurn);
  const wanted = (target.workplane ? placementWorkplaneQuaternion(target.workplane) : frameFacing(target.normal)).multiply(spin);
  const turn = wanted.multiply(leadTurn.clone().invert()).normalize();
  const turned = Math.abs(Math.abs(turn.w) - 1) > 1e-12;

  // The foot: the lowest level of the selection along `up`, in the middle of what it covers there.
  const side = Math.abs(up.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const u = new THREE.Vector3().crossVectors(up, side).normalize();
  const v = new THREE.Vector3().crossVectors(up, u).normalize();
  const low = { up: Infinity, upMax: -Infinity, uMin: Infinity, uMax: -Infinity, vMin: Infinity, vMax: -Infinity };
  moving.forEach((shape) => frameCorners(shape).forEach((corner) => {
    low.up = Math.min(low.up, corner.dot(up));
    low.upMax = Math.max(low.upMax, corner.dot(up));
    low.uMin = Math.min(low.uMin, corner.dot(u));
    low.uMax = Math.max(low.uMax, corner.dot(u));
    low.vMin = Math.min(low.vMin, corner.dot(v));
    low.vMax = Math.max(low.vMax, corner.dot(v));
  }));
  const foot = up.clone().multiplyScalar(sunk ? low.upMax : low.up)
    .addScaledVector(u, (low.uMin + low.uMax) / 2)
    .addScaledVector(v, (low.vMin + low.vMax) / 2);
  const shift = new THREE.Vector3(target.point.x, target.point.y, target.point.z).sub(foot);

  moving.forEach((shape) => {
    const rotated: Partial<WorkplaneShape> = turned ? rotatedGeometryShapePatch(shape, turn, foot) : {};
    const x = (rotated.x ?? shape.x) + shift.x;
    const z = (rotated.z ?? shape.z) + shift.z;
    const elevation = (rotated.elevation ?? shape.elevation ?? 0) + shift.y;
    patches.set(shape.id, {
      ...rotated,
      x: cleanNearZero(x, 0.0005),
      z: cleanNearZero(z, 0.0005),
      elevation: cleanNearZero(elevation, 0.0005),
    });
  });
  return patches;
}

/**
 * The frame a face pointing along `normal` gets when nothing else decides it: on a lying face
 * x along the plate's x, on a standing or sloped one x level and "up" up the slope - the same
 * rules the workplane follows on a face, so a part carried from face to face keeps its edges in line.
 */
function frameFacing(normal: Vec) {
  return placementWorkplaneQuaternion(faceFrameWorkplane({ x: 0, y: 0, z: 0 }, normal));
}

/** The workplane frame a face pointing along `normal` gets (see frameFacing), with its origin at `origin`. */
export function faceFrameWorkplane(origin: Vec, normal: Vec): PlacementWorkplane {
  const n = new THREE.Vector3(normal.x, normal.y, normal.z).normalize();
  const level = new THREE.Vector3(1, 0, 0).projectOnPlane(n);
  if (level.lengthSq() < 1e-8) level.set(0, 0, 1).projectOnPlane(n);
  return placementWorkplaneFromSurface(origin, n, level, false, true);
}

/** The eight corners of a part's frame in the world, as the view places it. */
function frameCorners(shape: WorkplaneShape) {
  const hw = shapeWidth(shape) / 2;
  const hh = shape.height / 2;
  const hd = shapeDepth(shape) / 2;
  const center = new THREE.Vector3(shape.x, (shape.elevation ?? 0) + hh, shape.z);
  const rotation = quaternionForShape(shape);
  const corners: THREE.Vector3[] = [];
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
    corners.push(new THREE.Vector3(sx * hw, sy * hh, sz * hd).applyQuaternion(rotation).add(center));
  }
  return corners;
}
