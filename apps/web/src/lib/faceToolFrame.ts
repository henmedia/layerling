import * as THREE from "three";
import type { ManifoldToplevel } from "manifold-3d";
import { FACE_TOOL_OVERLAP, faceToolHeight, faceToolSettingsOn, faceToolWorkplane, insetFaceProfile, insetSketchProfile, type FaceToolSettings } from "@/lib/faceTool";
import { quaternionForShape } from "@/lib/geometryRotation";
import type { PerforableFace } from "@/lib/holePatternShapes";
import { placementWorkplaneFromSurface, type PlacementWorkplane } from "@/lib/placementWorkplane";
import { cadSketchRegions } from "@/lib/sketchCadProfile";
import { sketchBodyAnchor } from "@/lib/sketchPlacement";
import { sketchBodyStretch } from "@/lib/sketchResize";
import { cloneSketchProfile } from "@/lib/sketchSmoothHandles";
import { shapeHasShapeDeform } from "@/lib/workplaneShapes";
import type { SketchProfile, WorkplaneShape } from "@/types/layerling";

/**
 * Where a plain extruded sketch body's sketch lies: the plane of its bottom face, sketch x and z
 * along the body's own axes, the sketch's origin where Edit sketch puts it (as beginSketchEdit in
 * LayerlingEditor works it out). Null for a body whose bottom face is not its sketch any more
 * (stretched, tapered, twisted, mirrored, edge-treated, stroked, with a key ring, revolved, swept, grouped),
 * and for a sketch of more than one area, whose top is more than the one face that was picked.
 */
export function sketchBodyFrame(shape: WorkplaneShape): PlacementWorkplane | null {
  const profile = shape.sketchProfile;
  if (!profile || (shape.sketchOperation && shape.sketchOperation !== "extrude") || shape.sketchRevolve || profile.stroke || profile.inset || profile.keyring) return null;
  if (shape.hole || shape.mirrorX || shape.mirrorY || shape.mirrorZ || shape.edgeTreatments?.length || shape.groupedShapes?.length) return null;
  if (shapeHasShapeDeform(shape) || sketchBodyStretch(shape)) return null;
  let regions: ReturnType<typeof cadSketchRegions>;
  try {
    regions = cadSketchRegions(profile);
  } catch {
    return null;
  }
  if (regions.length !== 1) return null;
  const quaternion = quaternionForShape(shape);
  const normal = new THREE.Vector3(0, 1, 0).applyQuaternion(quaternion).normalize();
  const xAxis = new THREE.Vector3(1, 0, 0).applyQuaternion(quaternion).normalize();
  const zAxis = new THREE.Vector3(0, 0, 1).applyQuaternion(quaternion).normalize();
  const anchor = sketchBodyAnchor(shape);
  const origin = new THREE.Vector3(shape.x, (shape.elevation ?? 0) + shape.height / 2, shape.z)
    .addScaledVector(normal, -shape.height / 2)
    .addScaledVector(xAxis, -anchor.x)
    .addScaledVector(zAxis, -anchor.z);
  return placementWorkplaneFromSurface(
    { x: origin.x, y: origin.y, z: origin.z },
    { x: normal.x, y: normal.y, z: normal.z },
    { x: xAxis.x, y: xAxis.y, z: xAxis.z },
  );
}

/**
 * When the picked face is the top or the bottom of a plain sketch body, the plane the new body
 * stands on in that body's sketch frame: moved along its normal so that a body going out starts on
 * the face, and a pocket starts at its bottom and reaches a little out. The normal stays the
 * frame's, so the outline is not mirrored; on the bottom the new body reaches down from below.
 * Null on any other face.
 */
export function sketchCapWorkplane(source: WorkplaneShape, face: Pick<PerforableFace, "workplane">, settings: Pick<FaceToolSettings, "direction" | "depth">): PlacementWorkplane | null {
  const frame = sketchBodyFrame(source);
  if (!frame) return null;
  const n = frame.normal;
  const facing = n.x * face.workplane.normal.x + n.y * face.workplane.normal.y + n.z * face.workplane.normal.z;
  if (Math.abs(facing) < 0.999) return null;
  const level = n.x * (face.workplane.origin.x - frame.origin.x) + n.y * (face.workplane.origin.y - frame.origin.y) + n.z * (face.workplane.origin.z - frame.origin.z);
  const top = facing > 0 && Math.abs(level - source.height) < 1e-3;
  const bottom = facing < 0 && Math.abs(level) < 1e-3;
  if (!top && !bottom) return null;
  const out = settings.direction === "out";
  const shift = top ? (out ? source.height : source.height - settings.depth) : (out ? -settings.depth : -FACE_TOOL_OVERLAP);
  return { ...frame, origin: { x: frame.origin.x + n.x * shift, y: frame.origin.y + n.y * shift, z: frame.origin.z + n.z * shift } };
}

/**
 * What the face tool builds on a face: the sketch, the plane it stands on and its height. On a plain
 * sketch body's top or bottom that is the body's own outline with the inset; anywhere else the
 * outline of the face's triangles, set in. Null when the inset and the radius leave nothing.
 */
export function faceToolPlan(runtime: ManifoldToplevel, source: WorkplaneShape, face: PerforableFace, requested: FaceToolSettings): { profile: SketchProfile; workplane: PlacementWorkplane; height: number } | null {
  const settings = faceToolSettingsOn(face, requested);
  const height = faceToolHeight(settings);
  const inset = { distance: settings.inset, radius: settings.radius };
  const setIn = inset.distance > 0 || inset.radius > 0;
  const capWorkplane = source.sketchProfile ? sketchCapWorkplane(source, face, settings) : null;
  if (capWorkplane && source.sketchProfile) {
    const outline = { ...cloneSketchProfile(source.sketchProfile), images: [] };
    if (setIn && !insetSketchProfile(runtime, outline, inset)) return null;
    return { profile: setIn ? { ...outline, inset } : outline, workplane: capWorkplane, height };
  }
  const profile = insetFaceProfile(runtime, face.outline, inset.distance, inset.radius);
  return profile ? { profile, workplane: faceToolWorkplane(face, settings), height } : null;
}
