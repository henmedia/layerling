import * as THREE from "three";
import { acceleratedRaycast, computeBoundsTree } from "three-mesh-bvh";
import { useCallback, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { WorkplaneShape } from "@/types/layerling";
import { projectShapesExtent, type ThreeState } from "@/components/workplane/ViewportOverlays";
import { outwardFaceNormal } from "@/lib/layFlat";
import type { PaintLassoView } from "@/lib/paintMesh";
import { planarFaceCentroid, planarFaceTriangles, snapsToWalls, type PivotPoint } from "@/lib/rotationPivot";
import { roundFaceTriangles, type RoundFaceAxis } from "@/lib/roundFaceAxis";
import { setPickRayFromCamera } from "@/lib/cameraRay";
import { wallsInBand, wallTargetsFromHits, type MoveWallSnap, type SideWalls, type SnapBox, type WallHit } from "@/lib/objectSnap";

/**
 * Finding what is under the pointer in the 3D view: the ray from the camera
 * through the pointer, the body it hits first, the pick-only clicks of the
 * History view, and the rays that find the walls a moved or resized part
 * snaps to.
 */

export const RENDER_LAYER_SHAPES = 1;
/** How far beside a body a press may land and still mean it, in screen pixels: a fingertip covers more than a mouse pointer. */
const PICK_TOLERANCE_PIXELS = 6;
const PICK_TOLERANCE_PIXELS_TOUCH = 16;
const PICK_TOLERANCE_RAYS = 8;
/** Two surfaces this far apart along the ray (mm) are the same spot: bodies lying exactly on one another, a copy on its original. */
const PICK_TIE_DISTANCE = 0.01;
/** How far a press may travel and still be a click rather than a turn of the view, in screen pixels. */
const PICK_ONLY_CLICK_PIXELS = 5;

type PickRayState = Pick<ThreeState, "renderer" | "pointer" | "raycaster" | "camera">;

/**
 * Points the raycaster from the camera through a spot on the screen and, when
 * a layer is given, makes it see only that layer. Returns the canvas rectangle
 * for callers that aim more rays around the same spot.
 */
export function aimPickRay(state: PickRayState, clientX: number, clientY: number, layer?: number) {
  const rect = state.renderer.domElement.getBoundingClientRect();
  state.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  state.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  setPickRayFromCamera(state.raycaster, state.pointer, state.camera);
  if (layer !== undefined) state.raycaster.layers.set(layer);
  return rect;
}

/** The ray from the camera through a spot on the screen. */
export function pointerRayFor(state: PickRayState, clientX: number, clientY: number) {
  aimPickRay(state, clientX, clientY);
  return state.raycaster.ray;
}

/**
 * The body under the pointer, as a click means it: only surfaces count, a body
 * cut away by the section view does not, and neither do image plates or
 * previews. A press that just misses still finds the body next to it.
 */
/** Whether a ray hit picks a body: its surface, in front of the section plane, and not a locked reference image or a preview. */
function pickableShapeHit(state: ThreeState, shapes: readonly WorkplaneShape[]) {
  return (entry: THREE.Intersection) => {
    // Only surfaces pick a body. Its edge lines count as hit within 1.15 mm of the ray, so
    // through a slot narrower than about 3 mm the rim always won over the body behind it (#193).
    if (!(entry.object instanceof THREE.Mesh)) return false;
    if (cutAway(state, entry.point)) return false;
    const shapeId = entry.object.userData.shapeId;
    if (typeof shapeId !== "string") return false;
    const shape = shapes.find((candidate) => candidate.id === shapeId);
    // A reference image (#680) is picked where no body lies over it, unless it is locked: then clicks go through to the plate.
    return shape ? !(shape.imagePlate && shape.locked) && !shape.previewOnly : false;
  };
}

/** Every body the ray under the pointer passes through, front to back, each once: what "Select other" lists (#804). */
export function shapesUnderPointer(state: ThreeState, shapes: readonly WorkplaneShape[], clientX: number, clientY: number) {
  aimPickRay(state, clientX, clientY, RENDER_LAYER_SHAPES);
  const ids: string[] = [];
  for (const entry of state.raycaster.intersectObjects(state.shapeLayer.children, true).filter(pickableShapeHit(state, shapes))) {
    const id = entry.object.userData.shapeId as string;
    if (!ids.includes(id)) ids.push(id);
  }
  return ids;
}

export function pickShapeAt(
  state: ThreeState,
  shapes: readonly WorkplaneShape[],
  clientX: number,
  clientY: number,
  pointerType = "mouse",
  /** The selected bodies: where several lie at the same spot, the press means the one already selected (#484). */
  preferIds: readonly string[] = [],
) {
  const tolerance = pointerType === "touch" ? PICK_TOLERANCE_PIXELS_TOUCH : PICK_TOLERANCE_PIXELS;
  const rect = aimPickRay(state, clientX, clientY, RENDER_LAYER_SHAPES);

  const pickable = pickableShapeHit(state, shapes);
  const pickableHits = state.raycaster.intersectObjects(state.shapeLayer.children, true).filter(pickable);
  const hit = pickableHits[0];
  if (hit) {
    // A copy lies exactly on its original, so the ray meets both at the same distance and the one
    // that comes first in the list wins - the original, though the copy is the body that is selected.
    // Pressing on it then selected the original and moved that, and the copy chain was gone (#484).
    const tiedHits = pickableHits.filter((entry) => entry.distance - hit.distance <= PICK_TIE_DISTANCE);
    // A loose hole flush with a body's face (a hole the height of the plate it cuts, as a DXF brings them, #774)
    // meets the ray where the body does: the press means the hole, which is all one sees there, even with the
    // body selected - or the hole could not be picked to move or size it.
    const holes = tiedHits.filter((entry) => shapes.find((candidate) => candidate.id === entry.object.userData.shapeId)?.hole);
    const candidates = holes.length > 0 ? holes : tiedHits;
    const tied = preferIds.length > 0
      ? candidates.find((entry) => preferIds.includes(entry.object.userData.shapeId as string))
      : undefined;
    return (tied ?? candidates[0]).object.userData.shapeId as string;
  }

  // A press that just misses still means the body next to it: a thin wall or
  // a small part is hard to hit exactly. So the same test runs once more on
  // a small ring around the pointer - but no further. The middle of a bore
  // or the gap between two parts of a group is empty space and stays so.
  let nearestId: string | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (let step = 0; step < PICK_TOLERANCE_RAYS; step += 1) {
    const angle = (step / PICK_TOLERANCE_RAYS) * Math.PI * 2;
    state.pointer.x = ((clientX + Math.cos(angle) * tolerance - rect.left) / rect.width) * 2 - 1;
    state.pointer.y = -((clientY + Math.sin(angle) * tolerance - rect.top) / rect.height) * 2 + 1;
    setPickRayFromCamera(state.raycaster, state.pointer, state.camera);
    const near = state.raycaster.intersectObjects(state.shapeLayer.children, true).find(pickable);
    if (near && near.distance < nearestDistance) {
      nearestId = near.object.userData.shapeId as string;
      nearestDistance = near.distance;
    }
  }

  return nearestId;
}

/**
 * The first body surface the aimed ray meets that the section view has not cut
 * away: only meshes count, not edge lines. `needsFace` asks for a hit that
 * knows its triangle; `skip` passes through these bodies. `throughSeeThrough`
 * looks past transparent bodies and holes to a solid one behind them, and
 * takes the first see-through one only when nothing solid is there.
 */
export function firstShapeHit(state: ThreeState, options: { needsFace?: boolean; skip?: ReadonlySet<string>; throughSeeThrough?: boolean } = {}) {
  const hits = state.raycaster.intersectObjects(state.shapeLayer.children, true).filter((entry) => {
    if (cutAway(state, entry.point)) return false;
    if (!(entry.object instanceof THREE.Mesh)) return false;
    const shapeId = entry.object.userData.shapeId;
    if (typeof shapeId !== "string" || options.skip?.has(shapeId)) return false;
    return !options.needsFace || Boolean(entry.face);
  });
  if (!options.throughSeeThrough) return hits[0];
  return hits.find((entry) => !seeThrough(entry.object as THREE.Mesh)) ?? hits[0];
}

/** A body drawn see-through: a transparent solid or a hole. */
function seeThrough(mesh: THREE.Mesh) {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  return materials.every((material) => material.transparent && material.opacity < 1);
}

/** Whether the section view has cut `point` away. */
function cutAway(state: ThreeState, point: THREE.Vector3) {
  return Boolean(state.sectionPlane && state.sectionPlane.distanceToPoint(point) < -0.001);
}

/** Where the rays that find walls start, across a side and up its height, as parts of each from its middle. */
export const WALL_RAYS_ACROSS = [-0.4, -0.2, 0, 0.2, 0.4];
export const WALL_RAYS_UP = [-0.4, 0, 0.4];

/**
 * Every surface met by rays along `axis` right across the scene, beside a part being moved, spread as a resize sends
 * them from a side handle. Each ray counts every surface it crosses, so the inner wall of a box is found from outside
 * it too. `skip` holds the moved and the hidden bodies.
 */
export function castWallHits(state: ThreeState, box: SnapBox, height: { min: number; max: number }, axis: "x" | "z", skip: ReadonlySet<string>): WallHit[] {
  const across = axis === "x" ? "z" : "x";
  const [crossMin, crossMax] = axis === "x" ? [box.minZ, box.maxZ] : [box.minX, box.maxX];
  const strip = new THREE.Box3(new THREE.Vector3(-Infinity, height.min, -Infinity), new THREE.Vector3(Infinity, height.max, Infinity));
  strip.min[across] = crossMin;
  strip.max[across] = crossMax;
  // Only the bodies the rays can meet, so a heavy body off to the side costs nothing. A treated body that has no tree
  // yet gets one here once, indirect, so its triangles keep the order face picking counts them by.
  const meshes: THREE.Mesh[] = [];
  const reach = new THREE.Box3();
  const bounds = new THREE.Box3();
  state.shapeLayer.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || typeof object.userData.shapeId !== "string" || skip.has(object.userData.shapeId)) return;
    if (!object.layers.isEnabled(RENDER_LAYER_SHAPES)) return;
    if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
    if (!bounds.copy(object.geometry.boundingBox!).applyMatrix4(object.matrixWorld).intersectsBox(strip)) return;
    if (!object.geometry.boundsTree && object.raycast !== acceleratedRaycast) {
      computeBoundsTree.call(object.geometry, { targetLeafSize: 12, indirect: true });
    }
    meshes.push(object);
    reach.union(bounds);
  });
  if (meshes.length === 0) return [];
  const direction = new THREE.Vector3();
  direction[axis] = 1;
  const normalMatrix = new THREE.Matrix3();
  const hits: WallHit[] = [];
  // A raycaster of its own: the shared one stops at the first hit of a bounds tree.
  const raycaster = new THREE.Raycaster();
  for (const side of WALL_RAYS_ACROSS) {
    for (const up of WALL_RAYS_UP) {
      const origin = new THREE.Vector3();
      // A millimetre before the first body, so every face is met from outside.
      origin[axis] = reach.min[axis] - 1;
      origin[across] = (crossMin + crossMax) / 2 + side * (crossMax - crossMin);
      origin.y = (height.min + height.max) / 2 + up * (height.max - height.min);
      raycaster.set(origin, direction);
      const found: THREE.Intersection[] = [];
      meshes.forEach((mesh) => acceleratedRaycast.call(mesh, raycaster, found));
      found.forEach((entry) => {
        if (!entry.face || cutAway(state, entry.point)) return;
        // The face's own normal, not the one turned towards the ray: which way a wall faces is the point.
        const normal = entry.face.normal.clone().applyMatrix3(normalMatrix.getNormalMatrix(entry.object.matrixWorld)).normalize();
        hits.push({ point: entry.point, normal });
      });
    }
  }
  return hits;
}

/** The bodies the rays that find walls pass through: the moved and the hidden ones. */
export function wallRaySkip(shapes: WorkplaneShape[], moved: Set<string>) {
  return new Set([...moved, ...shapes.filter((entry) => entry.hidden).map((entry) => entry.id)]);
}

/**
 * What finding the walls beside a moved selection starts from, or undefined unless every part of it snaps to walls
 * (snapsToWalls).
 */
export function wallSnapForSelection(shapes: WorkplaneShape[], moved: Set<string>): MoveWallSnap | undefined {
  const selected = shapes.filter((entry) => moved.has(entry.id));
  if (selected.length === 0 || !selected.every(snapsToWalls)) return undefined;
  const { min, max } = projectShapesExtent(selected, new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3());
  // No stretch covered yet, so the first move casts.
  const uncast = () => ({ min: [], max: [], from: Infinity, to: -Infinity });
  return { height: { min: min.y, max: max.y }, skip: wallRaySkip(shapes, moved), x: uncast(), z: uncast() };
}

/**
 * The walls beside `box` along `axes`: found with rays the first time, and again once the selection's middle has left
 * the stretch they were found over, so rays are not sent on every move.
 */
export function moveSnapWalls(state: ThreeState, wallSnap: MoveWallSnap, box: SnapBox, axes: readonly ("x" | "z")[]): SideWalls {
  axes.forEach((axis) => {
    const [from, to] = axis === "x" ? [box.minZ, box.maxZ] : [box.minX, box.maxX];
    const centre = (from + to) / 2;
    if (centre >= wallSnap[axis].from && centre <= wallSnap[axis].to) return;
    wallSnap[axis] = { ...wallTargetsFromHits(castWallHits(state, box, wallSnap.height, axis, wallSnap.skip), axis), from, to };
  });
  return wallsInBand(wallSnap, box);
}

/** The first body the ray meets, whatever it is, without the near-miss ring. */
export function pickShapeIdAt(state: ThreeState, clientX: number, clientY: number): string | null {
  aimPickRay(state, clientX, clientY, RENDER_LAYER_SHAPES);
  const hit = firstShapeHit(state);
  return hit ? (hit.object.userData.shapeId as string) : null;
}

/** Where the ray meets one reference image (#680), through anything in front of it: a point to calibrate it by. */
export function pickImagePoint(state: ThreeState, shapeId: string, clientX: number, clientY: number): { x: number; y: number; z: number } | null {
  aimPickRay(state, clientX, clientY, RENDER_LAYER_SHAPES);
  const hit = state.raycaster.intersectObjects(state.shapeLayer.children, true)
    .find((entry) => entry.object instanceof THREE.Mesh && entry.object.userData.shapeId === shapeId);
  return hit ? { x: hit.point.x, y: hit.point.y, z: hit.point.z } : null;
}

export type LayFlatPick = { shapeId: string; normal: { x: number; y: number; z: number }; point: { x: number; y: number; z: number }; axis?: RoundFaceAxis | null };

/** The mesh's triangles in world space, nine numbers per triangle, as the face searches take them. */
export function worldTrianglePositions(mesh: THREE.Mesh<THREE.BufferGeometry>): Float64Array {
  mesh.updateWorldMatrix(true, false);
  const position = mesh.geometry.getAttribute("position");
  const index = mesh.geometry.getIndex();
  const cornerCount = index ? index.count : position.count;
  const positions = new Float64Array(cornerCount * 3);
  const corner = new THREE.Vector3();
  for (let offset = 0; offset < cornerCount; offset += 1) {
    corner.fromBufferAttribute(position, index ? index.getX(offset) : offset).applyMatrix4(mesh.matrixWorld);
    positions[offset * 3] = corner.x;
    positions[offset * 3 + 1] = corner.y;
    positions[offset * 3 + 2] = corner.z;
  }
  return positions;
}

/** The middle of the face a pivot click hit, as drawn, and the face itself, for a group whose face is read from its parts joined. */
export function pickRotationPivot(state: ThreeState, clientX: number, clientY: number): { point: PivotPoint; face: LayFlatPick | null } | null {
  aimPickRay(state, clientX, clientY, RENDER_LAYER_SHAPES);
  const hit = firstShapeHit(state, { needsFace: true });
  if (!hit || hit.faceIndex === undefined || hit.faceIndex === null) return null;
  const faceIndex = hit.faceIndex;
  const mesh = hit.object as THREE.Mesh<THREE.BufferGeometry>;
  const positions = worldTrianglePositions(mesh);
  const corner = (offset: number) => new THREE.Vector3().fromArray(positions, (faceIndex * 3 + offset) * 3);
  const normal = outwardFaceNormal(corner(0), corner(1), corner(2), state.raycaster.ray.direction);
  const point = { x: hit.point.x, y: hit.point.y, z: hit.point.z };
  return { point: planarFaceCentroid(positions, faceIndex) ?? point, face: normal ? { shapeId: mesh.userData.shapeId as string, normal, point } : null };
}

/**
 * The middle of the flat face under the pointer, for a reference point on it (#881): the centre of the area of every
 * triangle in that plane joined to the one hit. A curved surface is no face with a middle, so a lone facet gives null.
 */
export function pickFaceCentre(state: ThreeState, clientX: number, clientY: number): PivotPoint | null {
  aimPickRay(state, clientX, clientY, RENDER_LAYER_SHAPES);
  const hit = firstShapeHit(state, { needsFace: true });
  if (!hit || hit.faceIndex === undefined || hit.faceIndex === null) return null;
  const positions = worldTrianglePositions(hit.object as THREE.Mesh<THREE.BufferGeometry>);
  const face = planarFaceTriangles(positions, hit.faceIndex);
  if (!face || face.triangles.length < 2) return null;
  return planarFaceCentroid(positions, hit.faceIndex);
}

/** A face for "Align faces": as for Lay flat, and for a round face (a hole, a pin) its axis as well. */
export function pickMateFace(state: ThreeState, clientX: number, clientY: number): LayFlatPick | null {
  const pick = pickLayFlatFace(state, clientX, clientY);
  const hit = firstShapeHit(state, { needsFace: true });
  if (!pick || !hit || hit.faceIndex === undefined || hit.faceIndex === null) return pick;
  const round = roundFaceTriangles(worldTrianglePositions(hit.object as THREE.Mesh<THREE.BufferGeometry>), hit.faceIndex);
  return { ...pick, axis: round?.axis ?? null };
}

/**
 * A lasso drawn for the paint tool, from its points in pixels of the view: the eye and its axes in the world,
 * and the shape on the plane one millimetre in front of the eye for a view in perspective, or in millimetres
 * across a flat view (as PaintStroke keeps it).
 */
export function paintLassoInView(state: PickRayState, points: ReadonlyArray<[number, number]>): { view: PaintLassoView; outline: Array<[number, number]> } | null {
  const camera = state.camera;
  camera.updateMatrixWorld();
  const rect = state.renderer.domElement.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  const origin = new THREE.Vector3().setFromMatrixPosition(camera.matrixWorld);
  const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).normalize();
  const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1).normalize();
  const forward = camera.getWorldDirection(new THREE.Vector3());
  const perspective = (camera as THREE.PerspectiveCamera).isPerspectiveCamera === true;
  const outline = points.map(([x, y]): [number, number] => {
    // A point on the ray through the pixel: half way into the view in perspective, on the near plane of a flat view.
    const along = new THREE.Vector3((x / rect.width) * 2 - 1, -(y / rect.height) * 2 + 1, perspective ? 0.5 : -1).unproject(camera).sub(origin);
    if (!perspective) return [along.dot(right), along.dot(up)];
    const depth = Math.max(1e-9, along.dot(forward));
    return [along.dot(right) / depth, along.dot(up) / depth];
  });
  return { view: { origin, right, up, forward, perspective }, outline };
}

/**
 * Where a click lands on the body being painted (paint.ts): the point and the face's outward normal there,
 * when that body is the first one the ray meets; a body in front of it, or the plate, gives null.
 */
export function pickPaintFace(state: ThreeState, shapeId: string, clientX: number, clientY: number): LayFlatPick | null {
  aimPickRay(state, clientX, clientY, RENDER_LAYER_SHAPES);
  const hit = firstShapeHit(state, { needsFace: true });
  if (!hit || !hit.face || hit.object.userData.shapeId !== shapeId) return null;
  return pickLayFlatFace(state, clientX, clientY);
}

export function pickLayFlatFace(state: ThreeState, clientX: number, clientY: number): LayFlatPick | null {
  aimPickRay(state, clientX, clientY, RENDER_LAYER_SHAPES);
  const hit = firstShapeHit(state, { needsFace: true });
  if (!hit || !hit.face) return null;
  const mesh = hit.object as THREE.Mesh<THREE.BufferGeometry>;
  mesh.updateWorldMatrix(true, false);
  const position = mesh.geometry.getAttribute("position");
  const corner = (index: number) => new THREE.Vector3().fromBufferAttribute(position, index).applyMatrix4(mesh.matrixWorld);
  const normal = outwardFaceNormal(corner(hit.face.a), corner(hit.face.b), corner(hit.face.c), state.raycaster.ray.direction);
  return normal ? { shapeId: mesh.userData.shapeId as string, normal, point: { x: hit.point.x, y: hit.point.y, z: hit.point.z } } : null;
}

export function rayPointOnRotationPlane(state: ThreeState, clientX: number, clientY: number, pivot: THREE.Vector3, axis: THREE.Vector3) {
  aimPickRay(state, clientX, clientY);
  const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(axis.clone().normalize(), pivot);
  return state.raycaster.ray.intersectPlane(plane, new THREE.Vector3());
}

export function splitAxisParameter(state: ThreeState, clientX: number, clientY: number, axisOrigin: THREE.Vector3, axisNormal: THREE.Vector3) {
  const ray = pointerRayFor(state, clientX, clientY);
  const between = new THREE.Vector3().subVectors(axisOrigin, ray.origin);
  const alignment = axisNormal.dot(ray.direction);
  const denominator = 1 - alignment * alignment;
  if (denominator < 1e-4) return null;
  return (alignment * between.dot(ray.direction) - between.dot(axisNormal)) / denominator;
}

/**
 * Selecting without editing, for the History view: the objects of an earlier
 * state can be picked to bring them back, but nothing in the view moves.
 */
export type PickOnlySelection = {
  /** The picked objects, drawn with the selection outline. */
  ids: string[];
  /** A click on an object (or on nothing, with null). `toggle` is Shift: add or remove it. */
  onPick: (id: string | null, toggle: boolean) => void;
};

/**
 * Pointer handlers for pick-only mode. They stand in for the 3D view's own
 * handlers, so no tool, handle or drag can start. A press that is let go
 * where it started picks; a press that travels turns the view, which the
 * camera controls handle on their own.
 */
export function usePickOnlyPointer(
  selection: PickOnlySelection | null | undefined,
  pick: (clientX: number, clientY: number, pointerType: string) => string | null,
) {
  const pressRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const selectionRef = useRef(selection);
  selectionRef.current = selection;

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    pressRef.current = event.button === 0 && event.isPrimary
      ? { pointerId: event.pointerId, x: event.clientX, y: event.clientY }
      : null;
  }, []);

  const onPointerUp = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const press = pressRef.current;
    pressRef.current = null;
    const current = selectionRef.current;
    if (!current || !press || press.pointerId !== event.pointerId) return;
    if (Math.hypot(event.clientX - press.x, event.clientY - press.y) >= PICK_ONLY_CLICK_PIXELS) return;
    current.onPick(pick(event.clientX, event.clientY, event.pointerType), event.shiftKey);
  }, [pick]);

  const onPointerCancel = useCallback(() => {
    pressRef.current = null;
  }, []);

  return { onPointerDown, onPointerUp, onPointerCancel };
}
