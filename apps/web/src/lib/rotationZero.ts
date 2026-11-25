import * as THREE from "three";
import { meshForShape } from "@/lib/editorMeshCore";
import { noteAnchorFromWorld, noteAnchorWorld } from "@/lib/noteAnchoring";
import { carryShapePivot, shapeIsTurned } from "@/lib/rotationPivot";
import { cleanNearZero, meshYawDegrees, shapeDepth, shapeHasShapeDeform, shapeWidth } from "@/lib/workplaneShapes";
import type { WorkplaneNote, WorkplaneShape } from "@/types/layerling";

/*
 * "Take as zero" (Discussion #2067): a mesh that was turned until it lay right keeps that turn in its
 * points, so its angles read 0 and its frame and handles stand along the plate again. Nothing moves.
 */

type Triple = { x: number; y: number; z: number };

/**
 * Whether the body is a plain mesh whose turn can go into its points. A shape with measures of its own, a group, text
 * and an exact body (STEP, Make exact) would lose what they are; paint, a texture, a wrap and edge work keep places in
 * the body's own frame.
 */
export function canTakeRotationAsZero(shape: WorkplaneShape) {
  return shape.kind === "mesh"
    && Boolean(shape.importedMesh && shape.importedMesh.positions.length >= 9 && !shape.importedMesh.brepStep)
    && !shape.groupedShapes?.length
    && !shape.cadBrep && !shape.cadPrimitiveFrame && !shape.parametricSource
    && !shape.sketchProfile && !shape.sketchPose && !shape.imagePlate && !shape.previewOnly
    && !shape.edgeTreatments?.length && !shape.edgeTreatmentHistory?.length
    && !shape.paint?.length && !shape.surfaceTexture && !shape.cylinderWrap && !shape.moldOf
    && !shapeHasShapeDeform(shape);
}

/** The body where it stands, with its turn in its mesh; null when it cannot be done or there is no turn. */
export function rotationTakenAsZero(shape: WorkplaneShape): WorkplaneShape | null {
  if (!canTakeRotationAsZero(shape) || !shapeIsTurned(shape)) return null;
  const mesh = meshForShape(shape);
  if (mesh.faces.length < 1) return null;

  const box = new THREE.Box3();
  const point = new THREE.Vector3();
  mesh.vertices.forEach(([x, y, z]) => box.expandByPoint(point.set(x, y, z)));
  const size = box.getSize(new THREE.Vector3());
  if (![size.x, size.y, size.z].every((value) => Number.isFinite(value) && value > 0)) return null;
  const middle = box.getCenter(new THREE.Vector3());

  const positions: number[] = [];
  mesh.faces.forEach((face) => face.forEach((index) => {
    const [x, y, z] = mesh.vertices[index];
    positions.push(x - middle.x, y - box.min.y, z - middle.z);
  }));

  // The place and size stay exact: rounding them would move or stretch the body a little.
  return carryShapePivot(shape, {
    ...shape,
    x: cleanNearZero(middle.x, 1e-9),
    z: cleanNearZero(middle.z, 1e-9),
    elevation: cleanNearZero(box.min.y, 1e-9),
    width: size.x,
    depth: size.z,
    height: size.y,
    size: Math.max(size.x, size.z),
    rotation: 0,
    rotationX: 0,
    rotationZ: 0,
    mirrorX: undefined,
    mirrorY: undefined,
    mirrorZ: undefined,
    // Formulas were typed for the angles and measures it had before.
    formulas: undefined,
    cadDisplayEdges: undefined,
    cadDisplayEdgesVersion: undefined,
    importedMesh: {
      positions,
      normals: turnedNormals(shape),
      baseWidth: size.x,
      baseDepth: size.z,
      baseHeight: size.y,
      triangleCount: mesh.faces.length,
      sourceFormat: "json",
    },
  });
}

/** The mesh's own shading, turned with it; undefined when it has none. */
function turnedNormals(shape: WorkplaneShape) {
  const mesh = shape.importedMesh;
  // meshForShape may turn the corners of a mirrored body's triangles round: its normals are made new.
  if (!mesh?.normals || mesh.normals.length !== mesh.positions.length || shape.mirrorX || shape.mirrorY || shape.mirrorZ) return undefined;
  const turn = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(
    THREE.MathUtils.degToRad(shape.rotationX ?? 0),
    THREE.MathUtils.degToRad(meshYawDegrees(shape)),
    THREE.MathUtils.degToRad(shape.rotationZ ?? 0),
    "XYZ",
  ));
  // A stretched body's normals go with the inverse of the stretch.
  const stretch: Triple = { x: shapeWidth(shape) / mesh.baseWidth, y: shape.height / mesh.baseHeight, z: shapeDepth(shape) / mesh.baseDepth };
  const normals: number[] = [];
  const normal = new THREE.Vector3();
  for (let i = 0; i + 2 < mesh.normals.length; i += 3) {
    normal.set(mesh.normals[i] / stretch.x, mesh.normals[i + 1] / stretch.y, mesh.normals[i + 2] / stretch.z).normalize().transformDirection(turn);
    normals.push(normal.x, normal.y, normal.z);
  }
  return normals;
}

/** Notes pinned to the body stay on their spot while its frame changes under them. */
export function notesOnNewFrame(notes: WorkplaneNote[], before: WorkplaneShape, after: WorkplaneShape): WorkplaneNote[] {
  if (!notes.some((note) => note.anchor?.shapeId === before.id)) return notes;
  return notes.map((note) => note.anchor?.shapeId === before.id
    ? { ...note, anchor: { shapeId: after.id, normalized: noteAnchorFromWorld(after, noteAnchorWorld(before, note.anchor.normalized)) } }
    : note);
}
