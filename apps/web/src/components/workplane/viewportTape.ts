"use client";

import { type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { sectionPointFromFrame, type SectionFrame, type SectionPlaneAxis } from "@/lib/sectionView";
import { type SectionLoop, type SectionPoint } from "@/lib/sectionSvg";
import { circleOfLoop, sectionMeasurement, sectionPointToWorld, type SectionSnap } from "@/lib/sectionMeasure";
import * as THREE from "three";
import type { MeasurementAccuracy } from "@/types/layerling";
import { pointerReach } from "@/lib/pointerReach";
import { outwardFaceNormal } from "@/lib/layFlat";
import { axisLockedPoint, circleOfEdgePoints, closedRoundEdge, cornerOnRoundEdge, perpendicularFootOnPlane, perpendicularFootOnSegment, perpendicularPointsOnCircle, pointAcrossCircle, roundEdgeMeasure } from "@/lib/tapeCircle";
import { planarFaces } from "@/lib/faceCentre";
import { aimPickRay, RENDER_LAYER_SHAPES } from "@/components/workplane/viewportPicking";
import { type ThreeState, type TapeAttachment, type TapeEdgeAttachment, type TapeCandidate, type TapeCentre, type TapeCentreKind, projectToScreen, tapeShapeDimensions, formatMeasure, findShapeObject, worldPointHidden } from "@/components/workplane/ViewportOverlays";
import { clamp } from "./viewportShapeObjects";

export function tapeAttachmentFromWorld(state: ThreeState, shapeId: string, world: THREE.Vector3, kind: TapeAttachment["kind"] = "surface"): TapeAttachment | null {
  const object = findShapeObject(state, shapeId);
  if (!object) return null;
  const dimensions = tapeShapeDimensions(object);
  const local = object.worldToLocal(world.clone());
  return {
    shapeId,
    kind,
    topologyKey: object.userData.tapeTopologyKey as string | undefined,
    normalized: [
      local.x / Math.max(0.001, dimensions[0]),
      local.y / Math.max(0.001, dimensions[1]),
      local.z / Math.max(0.001, dimensions[2]),
    ],
  };
}

export function chainTapeLineSegments(segments: Array<[THREE.Vector3, THREE.Vector3]>) {
  if (segments.length <= 1) return segments.map(([a, b]) => [a, b]);
  const bounds = new THREE.Box3();
  segments.forEach(([a, b]) => {
    bounds.expandByPoint(a);
    bounds.expandByPoint(b);
  });
  const tolerance = Math.max(1e-6, bounds.getSize(new THREE.Vector3()).length() * 1e-5);
  const tangentLimit = Math.cos(THREE.MathUtils.degToRad(20));
  const unused = new Set(segments.map((_, index) => index));
  const paths: THREE.Vector3[][] = [];

  // Which segments end near a point, by grid cell: a dense mesh has thousands of segments, and
  // looking through all of them for every step of every path took seconds.
  const cell = tolerance * 2;
  const cellKey = (x: number, y: number, z: number) => `${x},${y},${z}`;
  const grid = new Map<string, number[]>();
  segments.forEach(([a, b], index) => {
    [a, b].forEach((point) => {
      const key = cellKey(Math.floor(point.x / cell), Math.floor(point.y / cell), Math.floor(point.z / cell));
      const list = grid.get(key);
      if (list) {
        if (list[list.length - 1] !== index) list.push(index);
      } else {
        grid.set(key, [index]);
      }
    });
  });
  const near = (point: THREE.Vector3, into: Set<number>) => {
    const cx = Math.floor(point.x / cell);
    const cy = Math.floor(point.y / cell);
    const cz = Math.floor(point.z / cell);
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dz = -1; dz <= 1; dz += 1) {
          grid.get(cellKey(cx + dx, cy + dy, cz + dz))?.forEach((index) => {
            if (unused.has(index)) into.add(index);
          });
        }
      }
    }
  };

  while (unused.size > 0) {
    const firstIndex = unused.values().next().value as number;
    unused.delete(firstIndex);
    const path = [segments[firstIndex][0].clone(), segments[firstIndex][1].clone()];
    let extended = true;
    while (extended) {
      extended = false;
      const end = path[path.length - 1];
      const start = path[0];
      const candidates = new Set<number>();
      near(end, candidates);
      near(start, candidates);
      // The lowest index that fits wins, as when every unused segment was tried in turn.
      for (const index of [...candidates].sort((x, y) => x - y)) {
        const [a, b] = segments[index];
        const endDirection = end.clone().sub(path[path.length - 2]).normalize();
        const endOther = a.distanceTo(end) <= tolerance ? b : b.distanceTo(end) <= tolerance ? a : null;
        if (endOther && Math.abs(endDirection.dot(endOther.clone().sub(end).normalize())) >= tangentLimit) {
          path.push(endOther.clone());
          unused.delete(index);
          extended = true;
          break;
        }
        const startDirection = start.clone().sub(path[1]).normalize();
        const startOther = a.distanceTo(start) <= tolerance ? b : b.distanceTo(start) <= tolerance ? a : null;
        if (startOther && Math.abs(startDirection.dot(startOther.clone().sub(start).normalize())) >= tangentLimit) {
          path.unshift(startOther.clone());
          unused.delete(index);
          extended = true;
          break;
        }
      }
    }
    paths.push(path);
  }
  return paths;
}

export const tapePathCache = new WeakMap<THREE.Object3D, { key: string; paths: THREE.Vector3[][] }>();

/** The edge paths of a line in world space, chained where they run on; kept while the line and its matrix stay as they are. */
export function tapeWorldPaths(child: THREE.Line, position: THREE.BufferAttribute | THREE.InterleavedBufferAttribute): THREE.Vector3[][] {
  const key = `${child.geometry.uuid}:${(position as THREE.BufferAttribute).version ?? 0}:${position.count}:${child.matrixWorld.elements.join(",")}`;
  const cached = tapePathCache.get(child);
  if (cached && cached.key === key) return cached.paths;
  const paths: THREE.Vector3[][] = [];
  if ((child as THREE.LineSegments).isLineSegments) {
    const segments: Array<[THREE.Vector3, THREE.Vector3]> = [];
    for (let index = 0; index + 1 < position.count; index += 2) {
      segments.push([
        new THREE.Vector3().fromBufferAttribute(position, index).applyMatrix4(child.matrixWorld),
        new THREE.Vector3().fromBufferAttribute(position, index + 1).applyMatrix4(child.matrixWorld),
      ]);
    }
    paths.push(...chainTapeLineSegments(segments));
  } else {
    const path: THREE.Vector3[] = [];
    for (let index = 0; index < position.count; index += 1) path.push(new THREE.Vector3().fromBufferAttribute(position, index).applyMatrix4(child.matrixWorld));
    if ((child as THREE.LineLoop).isLineLoop && path.length > 2) path.push(path[0].clone());
    paths.push(path);
  }
  tapePathCache.set(child, { key, paths });
  return paths;
}

/** How close, in pixels, the pointer has to come to a perpendicular foot for it to catch (#589). */
export const TAPE_PERPENDICULAR_SNAP_PIXELS = 16;

export function surfaceHitWorldNormal(state: ThreeState, hit: THREE.Intersection): THREE.Vector3 | null {
  if (!hit.face || !(hit.object instanceof THREE.Mesh)) return null;
  const mesh = hit.object as THREE.Mesh<THREE.BufferGeometry>;
  mesh.updateWorldMatrix(true, false);
  const position = mesh.geometry.getAttribute("position");
  if (!position) return null;
  const corner = (index: number) => new THREE.Vector3().fromBufferAttribute(position, index).applyMatrix4(mesh.matrixWorld);
  const normal = outwardFaceNormal(corner(hit.face.a), corner(hit.face.b), corner(hit.face.c), state.raycaster.ray.direction);
  return normal ? new THREE.Vector3(normal.x, normal.y, normal.z).normalize() : null;
}

/**
 * When the first point of a measurement has been placed, the foot of the perpendicular onto the
 * hovered face (or along the first face's normal across a bore) catches the pointer when it comes
 * near, or anywhere on the face while Shift is held (#589).
 */
export function snapSurfacePerpendicularPoint(
  state: ThreeState,
  surfaceHit: THREE.Intersection,
  hitNormal: THREE.Vector3 | null,
  startWorld: THREE.Vector3,
  startNormal: THREE.Vector3 | null,
  pointerX: number,
  pointerY: number,
  rect: DOMRect,
  shiftKey: boolean,
): THREE.Vector3 | null {
  const raycaster = new THREE.Raycaster();
  raycaster.layers.set(RENDER_LAYER_SHAPES);
  const notClipped = (point: THREE.Vector3) => !state.sectionPlane || state.sectionPlane.distanceToPoint(point) >= -0.001;
  const pointLiesOnMesh = (point: THREE.Vector3, normal: THREE.Vector3) => {
    const unit = normal.clone().normalize();
    for (const sign of [1, -1]) {
      raycaster.set(point.clone().addScaledVector(unit, 0.05 * sign), unit.clone().multiplyScalar(-sign));
      const hit = raycaster.intersectObject(surfaceHit.object, false).find((entry) => entry.distance <= 0.1 && notClipped(entry.point));
      if (hit) return true;
    }
    return false;
  };

  const candidates: THREE.Vector3[] = [];
  if (startNormal && startNormal.lengthSq() > 1e-12) {
    const direction = startNormal.clone().normalize();
    if (surfaceHit.point.clone().sub(startWorld).dot(direction) < 0) direction.negate();
    raycaster.set(startWorld.clone().addScaledVector(direction, 1e-3), direction);
    const hits = raycaster.intersectObject(surfaceHit.object, false).filter((entry) => notClipped(entry.point));
    if (hits.length > 0) {
      hits.sort((a, b) => a.point.distanceToSquared(surfaceHit.point) - b.point.distanceToSquared(surfaceHit.point));
      candidates.push(hits[0].point.clone());
    }
  }
  if (hitNormal) {
    const foot = perpendicularFootOnPlane(startWorld, surfaceHit.point, hitNormal);
    if (foot && pointLiesOnMesh(foot, hitNormal)) {
      candidates.push(foot);
    }
  }

  const projected = new THREE.Vector3();
  const snapReach = pointerReach(TAPE_PERPENDICULAR_SNAP_PIXELS);
  let best: { point: THREE.Vector3; screenDistance: number } | null = null;
  for (const candidate of candidates) {
    projected.copy(candidate).project(state.camera);
    const sx = ((projected.x + 1) / 2) * rect.width;
    const sy = ((1 - projected.y) / 2) * rect.height;
    const screenDistance = Math.hypot(pointerX - sx, pointerY - sy);
    if (screenDistance <= snapReach || shiftKey) {
      if (!best || screenDistance < best.screenDistance) {
        best = { point: candidate, screenDistance };
      }
    }
  }
  if (best) return best.point;

  if (shiftKey && hitNormal) {
    const baseInPlane = perpendicularFootOnPlane(startWorld, surfaceHit.point, hitNormal) ?? startWorld;
    const locked = axisLockedPoint(baseInPlane, surfaceHit.point, hitNormal);
    if (locked.distanceToSquared(startWorld) > 1e-12 && pointLiesOnMesh(locked, hitNormal)) {
      return locked;
    }
  }
  return null;
}

/** How close, in pixels, the pointer has to come to the centre of a face or of a round edge for it to catch (Discussion #610). */
export const TAPE_CENTRE_SNAP_PIXELS = 14;
/**
 * A mesh with more triangles than this has its faces' centres left out. Its faces are found once, the first time the
 * pointer is over it, as the picking tree of a large mesh is built on the first ray: about a third of a second at a
 * million triangles, and more the bigger the mesh.
 */
const TAPE_FACE_MAX_TRIANGLES = 1_000_000;

const tapeFaceCache = new WeakMap<THREE.BufferGeometry, {
  position: THREE.BufferAttribute;
  positionVersion: number;
  index: THREE.BufferAttribute | null;
  indexVersion: number;
  faces: ReturnType<typeof planarFaces>;
}>();

/**
 * The flat faces of a body's mesh, found the first time the tape measure points at it and kept while the mesh stays
 * as it is, so the pointer can go from face to face on a large mesh without it being searched again (Discussion #610).
 * Read in the mesh's own triangle order, the one a ray's hit names: a picking tree puts an index in front of an
 * imported mesh, or reorders the one there, the first time a ray is cast against it.
 */
export function tapeMeshFaces(mesh: THREE.Mesh) {
  const geometry = mesh.geometry as THREE.BufferGeometry;
  const position = geometry.getAttribute("position") as THREE.BufferAttribute | undefined;
  if (!position || position.itemSize !== 3 || (position as unknown as THREE.InterleavedBufferAttribute).isInterleavedBufferAttribute) return null;
  const index = geometry.index;
  const cached = tapeFaceCache.get(geometry);
  if (cached && cached.position === position && cached.positionVersion === position.version && cached.index === index && cached.indexVersion === (index?.version ?? -1)) {
    return cached.faces;
  }
  const faces = planarFaces(position.array, index?.array ?? null, TAPE_FACE_MAX_TRIANGLES);
  tapeFaceCache.set(geometry, { position, positionVersion: position.version, index, indexVersion: index?.version ?? -1, faces });
  return faces;
}

/** A closed round edge in the room: the rim of a hole, of a cylinder, of a boss. `open` is worked out when it is first offered. */
export type TapeRim = { center: THREE.Vector3; radius: number; normal: THREE.Vector3; open?: boolean };

const tapeRimCache = new WeakMap<THREE.Vector3[][], Array<TapeRim | null>>();

/** The closed round edges among a line's edge paths, kept with the paths, which stay while the line and its matrix do. */
function tapePathRims(paths: THREE.Vector3[][]) {
  const cached = tapeRimCache.get(paths);
  if (cached) return cached;
  const rims = paths.map((points) => {
    if (points.length < 4 || !roundEdgeMeasure(points)?.full) return null;
    const circle = circleOfEdgePoints(points);
    return circle ? { center: circle.center, radius: circle.radius, normal: circle.normal } : null;
  });
  tapeRimCache.set(paths, rims);
  return rims;
}

/**
 * Whether the middle of a round edge is open, as in a hole, or filled, as on the top of a cylinder or at the foot of
 * a boss standing on a plate: a face across the middle fills it, and so does the body itself when the middle lies
 * inside it, behind an odd number of its faces along the axis. The faces are counted once where the ray meets
 * several at one spot (the middle of a fan of triangles).
 */
export function tapeRimOpen(body: THREE.Object3D, rim: TapeRim) {
  const raycaster = new THREE.Raycaster();
  raycaster.layers.set(RENDER_LAYER_SHAPES);
  const distances = (origin: THREE.Vector3, direction: THREE.Vector3) => {
    raycaster.set(origin, direction);
    const found = raycaster.intersectObject(body, true).filter((entry) => entry.object instanceof THREE.Mesh).map((entry) => entry.distance).sort((a, b) => a - b);
    return found.filter((distance, index) => index === 0 || distance - found[index - 1] > 1e-4);
  };
  const along = distances(rim.center.clone().addScaledVector(rim.normal, -0.05), rim.normal);
  const back = distances(rim.center.clone().addScaledVector(rim.normal, 0.05), rim.normal.clone().negate());
  if ((along[0] ?? Infinity) <= 0.1 || (back[0] ?? Infinity) <= 0.1) return false;
  return along.length % 2 === 0;
}

export type TapeCentreSnap = { candidate: TapeCandidate; distance: number };

/**
 * The centres the tape measure offers near the pointer (Discussion #610): the middle of the flat face under it - the
 * centre of its area, which on a round face such as a cylinder's top is the centre of the circle - and the centre of
 * a closed round edge the pointer is inside or near, the rim of a hole, of a cylinder or of a boss, as tapeCircle
 * finds it. A facet of a round surface is no face with a middle, and a centre a body hides is not offered. `snap` is
 * the nearest within reach: a point fixed to its body like a corner, so a length typed for a measurement from one
 * centre to another moves the body centre to centre. A hole cut into a group counts as the group's, whose edges are
 * the ones drawn.
 */
export function tapeCentresNear(state: ThreeState, shapeIds: string[], clientX: number, clientY: number): { offers: TapeCentre[]; snap: TapeCentreSnap | null } {
  const rect = state.renderer.domElement.getBoundingClientRect();
  const pointerX = clientX - rect.left;
  const pointerY = clientY - rect.top;
  const reach = pointerReach(TAPE_CENTRE_SNAP_PIXELS);
  const edgeReach = pointerReach(12);
  const targets = shapeIds.flatMap((id) => {
    const object = findShapeObject(state, id);
    return object ? [object] : [];
  });
  if (targets.length === 0) return { offers: [], snap: null };
  state.camera.updateMatrixWorld();
  targets.forEach((target) => target.updateWorldMatrix(true, true));
  const projected = new THREE.Vector3();
  const screenOf = (point: THREE.Vector3) => {
    projected.copy(point).project(state.camera);
    if (!Number.isFinite(projected.x) || !Number.isFinite(projected.y) || projected.z < -1 || projected.z > 1) return null;
    return { x: ((projected.x + 1) / 2) * rect.width, y: ((1 - projected.y) / 2) * rect.height };
  };
  const notClipped = (point: THREE.Vector3) => !state.sectionPlane || state.sectionPlane.distanceToPoint(point) >= -0.001;
  const cameraPosition = state.camera.getWorldPosition(new THREE.Vector3());
  type Found = { point: THREE.Vector3; kind: TapeCentreKind; shapeId: string; normal: THREE.Vector3 | null; distance: number; depth: number };

  // The rims around or near the pointer, the nearest first; of two the same distance away, the one in front.
  const cameraRight = new THREE.Vector3().setFromMatrixColumn(state.camera.matrixWorld, 0).normalize();
  const rims: Array<{ rim: TapeRim; target: THREE.Object3D; distance: number; depth: number }> = [];
  targets.forEach((target) => {
    target.traverse((child) => {
      if (!(child instanceof THREE.Line) || !child.visible) return;
      const position = child.geometry.getAttribute("position");
      if (!position || position.count < 4) return;
      tapePathRims(tapeWorldPaths(child, position)).forEach((rim) => {
        if (!rim || !notClipped(rim.center)) return;
        const centre = screenOf(rim.center);
        const side = screenOf(rim.center.clone().addScaledVector(cameraRight, rim.radius));
        if (!centre || !side) return;
        const distance = Math.hypot(pointerX - centre.x, pointerY - centre.y);
        if (distance > Math.hypot(side.x - centre.x, side.y - centre.y) + edgeReach) return;
        rims.push({ rim, target, distance, depth: rim.center.distanceTo(cameraPosition) });
      });
    });
  });
  rims.sort((a, b) => Math.round(a.distance) - Math.round(b.distance) || a.depth - b.depth);
  let rimFound: Found | null = null;
  for (const entry of rims.slice(0, 4)) {
    if (worldPointHidden(entry.rim.center, state)) continue;
    entry.rim.open ??= tapeRimOpen(entry.target, entry.rim);
    rimFound = {
      point: entry.rim.center,
      kind: entry.rim.open ? "hole" : "circle",
      shapeId: entry.target.userData.shapeId as string,
      normal: entry.rim.normal,
      distance: entry.distance,
      depth: entry.depth,
    };
    break;
  }

  // The flat face under the pointer.
  let faceFound: Found | null = null;
  aimPickRay(state, clientX, clientY, RENDER_LAYER_SHAPES);
  const hit = state.raycaster.intersectObjects(targets, true).find((entry) => entry.object instanceof THREE.Mesh && notClipped(entry.point));
  if (hit && hit.faceIndex !== undefined && hit.faceIndex !== null) {
    const mesh = hit.object as THREE.Mesh;
    const face = tapeMeshFaces(mesh)?.faceOf(hit.faceIndex);
    if (face && !face.curved) {
      mesh.updateWorldMatrix(true, false);
      const point = new THREE.Vector3(...face.centre).applyMatrix4(mesh.matrixWorld);
      const screen = notClipped(point) ? screenOf(point) : null;
      const normal = surfaceHitWorldNormal(state, hit);
      if (screen && !worldPointHidden(point, state)) {
        faceFound = {
          point,
          kind: "face",
          shapeId: mesh.userData.shapeId as string,
          normal,
          distance: Math.hypot(pointerX - screen.x, pointerY - screen.y),
          depth: point.distanceTo(cameraPosition),
        };
      }
    }
  }

  // The top of a cylinder has its middle twice, as a face and as a rim: shown once, a hole's first.
  const found: Found[] = [];
  if (faceFound && rimFound && faceFound.point.distanceTo(rimFound.point) <= 1e-3) {
    found.push(rimFound.kind === "hole" ? rimFound : { ...faceFound, distance: Math.min(faceFound.distance, rimFound.distance) });
  } else {
    if (faceFound) found.push(faceFound);
    if (rimFound) found.push(rimFound);
  }
  const offers = found.map((entry) => ({ x: entry.point.x, y: entry.point.y, z: entry.point.z, kind: entry.kind }));
  const nearest = found
    .filter((entry) => entry.distance <= reach)
    .sort((a, b) => Math.round(a.distance) - Math.round(b.distance) || a.depth - b.depth)[0];
  const attachment = nearest ? tapeAttachmentFromWorld(state, nearest.shapeId, nearest.point) : null;
  if (!nearest || !attachment) return { offers, snap: null };
  const normal = nearest.normal;
  return {
    offers,
    snap: {
      distance: nearest.distance,
      candidate: {
        x: nearest.point.x,
        y: nearest.point.y,
        z: nearest.point.z,
        attachment,
        centre: nearest.kind,
        ...(normal ? { surfaceNormal: [normal.x, normal.y, normal.z] as [number, number, number] } : {}),
      },
    },
  };
}

/** Whether two lists of centres on offer are the same, so a move of the pointer that changes nothing redraws nothing. */
export function sameTapeCentres(a: readonly TapeCentre[] | undefined, b: readonly TapeCentre[] | undefined) {
  const first = a ?? [];
  const second = b ?? [];
  return first.length === second.length && first.every((centre, index) => centre.kind === second[index].kind
    && Math.hypot(centre.x - second[index].x, centre.y - second[index].y, centre.z - second[index].z) < 0.0001);
}

export function pickModelTapeCandidate(
  state: ThreeState,
  shapeIds: string[],
  clientX: number,
  clientY: number,
  startWorld?: THREE.Vector3 | null,
  startNormal?: THREE.Vector3 | null,
  shiftKey = false,
  /** Leave out corners and edges a body hides, so a click lands on what is seen (the protractor, #1228). */
  skipHidden = false,
  /** Measuring whole edges: a round rim wins over a corner that only sits on it (the end of a cylinder's side line). */
  preferRoundRim = false,
  /** The centre of a face or a round edge within reach (Discussion #610), from tapeCentresNear. */
  centre: TapeCentreSnap | null = null,
): TapeCandidate | null {
  const rect = state.renderer.domElement.getBoundingClientRect();
  const pointerX = clientX - rect.left;
  const pointerY = clientY - rect.top;
  // A finger reaches further than a mouse pointer (#337).
  const vertexReach = pointerReach(9);
  const edgeReach = pointerReach(12);
  const perpReach = pointerReach(TAPE_PERPENDICULAR_SNAP_PIXELS);
  const targets = shapeIds.flatMap((id) => {
    const object = findShapeObject(state, id);
    return object ? [object] : [];
  });
  if (targets.length === 0) return null;

  state.camera.updateMatrixWorld();
  targets.forEach((target) => target.updateWorldMatrix(true, true));
  const vertexCandidates: Array<{ distance: number; candidate: TapeCandidate }> = [];
  const edgeCandidates: Array<{ distance: number; perpendicular?: boolean; pointerDistance?: number; candidate: TapeCandidate; round?: ReturnType<typeof closedRoundEdge> }> = [];
  const projected = new THREE.Vector3();

  targets.forEach((target) => {
    const shapeId = target.userData.shapeId as string;
    target.traverse((child) => {
      if (!(child instanceof THREE.Line) || !child.visible) return;
      const position = child.geometry.getAttribute("position");
      if (!position || position.count < 2) return;
      // The chained edge paths only change with the line or its matrix, not with the pointer;
      // rebuilding them on every move took seconds on a dense imported mesh.
      const paths = tapeWorldPaths(child, position);

      paths.forEach((worldPoints, pathIndex) => {
        if (worldPoints.length < 2) return;
        // One rect and one matrix update for the whole pick: projectToScreen reads the layout for every point.
        const screens = worldPoints.map((point) => {
          projected.copy(point).project(state.camera);
          return { x: ((projected.x + 1) / 2) * rect.width, y: ((1 - projected.y) / 2) * rect.height };
        });
        // Anything near the pointer? Only then are the attachments of this path worth building.
        const closeToPointer = screens.some((screen, index) => {
          if (Math.hypot(pointerX - screen.x, pointerY - screen.y) <= vertexReach) return true;
          const next = screens[index + 1];
          return next ? distanceToScreenSegment(pointerX, pointerY, screen.x, screen.y, next.x, next.y) <= edgeReach : false;
        });
        if (!closeToPointer) return;
        const attachments = worldPoints.map((point) => tapeAttachmentFromWorld(state, shapeId, point, "edge"));
        if (attachments.some((attachment) => !attachment)) return;
        const normalizedPoints = attachments.map((attachment) => (attachment as TapeAttachment).normalized);
        const edge: TapeEdgeAttachment = {
          key: `${shapeId}:${child.uuid}:${pathIndex}`,
          shapeId,
          normalizedPoints,
          topologyKey: target.userData.tapeTopologyKey as string | undefined,
        };
        const endpointIndexes = worldPoints[0].distanceToSquared(worldPoints[worldPoints.length - 1]) < 1e-10 ? [0] : [0, worldPoints.length - 1];
        endpointIndexes.forEach((index) => {
          const screen = screens[index];
          const distance = Math.hypot(pointerX - screen.x, pointerY - screen.y);
          if (distance <= vertexReach) {
            vertexCandidates.push({
              distance,
              candidate: {
                x: worldPoints[index].x,
                y: worldPoints[index].y,
                z: worldPoints[index].z,
                attachment: { ...(attachments[index] as TapeAttachment), kind: "vertex" },
              },
            });
          }
        });

        let snappedPerpendicular = false;
        if (startWorld) {
          let bestPerp: {
            screenDistance: number;
            edgeDistance: number;
            world: THREE.Vector3;
            normalized: [number, number, number];
          } | null = null;

          const circle = circleOfEdgePoints(worldPoints);
          if (circle) {
            const across = pointAcrossCircle(circle, startWorld);
            const radialPoints = [
              ...perpendicularPointsOnCircle(circle, startWorld),
              ...(across ? [across] : []),
            ];
            for (const radial of radialPoints) {
              projected.copy(radial).project(state.camera);
              const sx = ((projected.x + 1) / 2) * rect.width;
              const sy = ((1 - projected.y) / 2) * rect.height;
              const screenDistance = Math.hypot(pointerX - sx, pointerY - sy);
              if (screenDistance <= perpReach || shiftKey) {
                const attachment = tapeAttachmentFromWorld(state, shapeId, radial, "edge");
                if (attachment && (!bestPerp || screenDistance < bestPerp.screenDistance)) {
                  bestPerp = {
                    screenDistance,
                    edgeDistance: screenDistance <= perpReach ? 0 : Math.min(edgeReach, screenDistance),
                    world: radial,
                    normalized: attachment.normalized,
                  };
                }
              }
            }
          }

          for (let index = 0; index + 1 < worldPoints.length; index += 1) {
            const foot = perpendicularFootOnSegment(startWorld, worldPoints[index], worldPoints[index + 1]);
            if (!foot) continue;
            projected.copy(foot.point).project(state.camera);
            const sx = ((projected.x + 1) / 2) * rect.width;
            const sy = ((1 - projected.y) / 2) * rect.height;
            const screenDistance = Math.hypot(pointerX - sx, pointerY - sy);
            if (screenDistance <= perpReach || shiftKey) {
              const normalizedA = normalizedPoints[index];
              const normalizedB = normalizedPoints[index + 1];
              const normalized: [number, number, number] = [
                normalizedA[0] + (normalizedB[0] - normalizedA[0]) * foot.amount,
                normalizedA[1] + (normalizedB[1] - normalizedA[1]) * foot.amount,
                normalizedA[2] + (normalizedB[2] - normalizedA[2]) * foot.amount,
              ];
              if (!bestPerp || screenDistance < bestPerp.screenDistance) {
                bestPerp = {
                  screenDistance,
                  edgeDistance: screenDistance <= perpReach
                    ? 0
                    : distanceToScreenSegment(pointerX, pointerY, screens[index].x, screens[index].y, screens[index + 1].x, screens[index + 1].y),
                  world: foot.point,
                  normalized,
                };
              }
            }
          }

          if (bestPerp) {
            snappedPerpendicular = true;
            edgeCandidates.push({
              distance: bestPerp.edgeDistance,
              perpendicular: true,
              pointerDistance: bestPerp.screenDistance,
              candidate: {
                x: bestPerp.world.x,
                y: bestPerp.world.y,
                z: bestPerp.world.z,
                attachment: {
                  shapeId,
                  kind: "edge",
                  topologyKey: target.userData.tapeTopologyKey as string | undefined,
                  normalized: bestPerp.normalized,
                },
                edge,
              },
            });
          }
        }

        if (snappedPerpendicular) return;

        const round = preferRoundRim ? closedRoundEdge(worldPoints) : null;
        for (let index = 0; index + 1 < worldPoints.length; index += 1) {
          const aScreen = screens[index];
          const bScreen = screens[index + 1];
          const dx = bScreen.x - aScreen.x;
          const dy = bScreen.y - aScreen.y;
          const amount = dx * dx + dy * dy > 0.001 ? clamp(((pointerX - aScreen.x) * dx + (pointerY - aScreen.y) * dy) / (dx * dx + dy * dy), 0, 1) : 0;
          const distance = Math.hypot(pointerX - (aScreen.x + dx * amount), pointerY - (aScreen.y + dy * amount));
          if (distance <= edgeReach) {
            const world = worldPoints[index].clone().lerp(worldPoints[index + 1], amount);
            const normalizedA = normalizedPoints[index];
            const normalizedB = normalizedPoints[index + 1];
            edgeCandidates.push({
              distance,
              candidate: {
                x: world.x,
                y: world.y,
                z: world.z,
                attachment: {
                  shapeId,
                  kind: "edge",
                  topologyKey: target.userData.tapeTopologyKey as string | undefined,
                  normalized: [
                    normalizedA[0] + (normalizedB[0] - normalizedA[0]) * amount,
                    normalizedA[1] + (normalizedB[1] - normalizedA[1]) * amount,
                    normalizedA[2] + (normalizedB[2] - normalizedA[2]) * amount,
                  ],
                },
                edge,
              },
              round,
            });
          }
        }
      });
    });
  });

  vertexCandidates.sort((a, b) => a.distance - b.distance);
  edgeCandidates.sort((a, b) => a.distance - b.distance);
  const inView = (entry: { candidate: TapeCandidate }) => !skipHidden || !worldPointHidden(new THREE.Vector3(entry.candidate.x, entry.candidate.y, entry.candidate.z), state);
  if (shiftKey && edgeCandidates[0]?.perpendicular && inView(edgeCandidates[0])) return edgeCandidates[0].candidate;
  const vertex = vertexCandidates.find(inView);
  // A centre wins over a corner or an edge farther from the pointer: in a small hole the rim lies close round its middle.
  if (centre) {
    const edgeDistance = Math.min(Infinity, ...edgeCandidates.filter(inView).map((entry) => entry.pointerDistance ?? entry.distance));
    if (centre.distance <= (vertex?.distance ?? Infinity) && centre.distance <= edgeDistance) return centre.candidate;
  }
  if (vertex) {
    // A corner that only sits on a round rim within reach (the end of a cylinder's side line) gives way to the rim.
    const corner = new THREE.Vector3(vertex.candidate.x, vertex.candidate.y, vertex.candidate.z);
    const rim = preferRoundRim ? edgeCandidates.find((entry) => entry.round && inView(entry) && cornerOnRoundEdge(corner, entry.round)) : undefined;
    return (rim ?? vertex).candidate;
  }
  const edgeCandidate = edgeCandidates.find(inView);
  if (edgeCandidate) return edgeCandidate.candidate;

  aimPickRay(state, clientX, clientY, RENDER_LAYER_SHAPES);
  const surfaceHit = state.raycaster.intersectObjects(targets, true).find(
    (entry) => entry.object instanceof THREE.Mesh && (!state.sectionPlane || state.sectionPlane.distanceToPoint(entry.point) >= -0.001),
  );
  if (!surfaceHit) return null;
  const shapeId = surfaceHit.object.userData.shapeId as string;
  const hitNormal = surfaceHitWorldNormal(state, surfaceHit);
  const surfaceNormal: [number, number, number] | undefined = hitNormal ? [hitNormal.x, hitNormal.y, hitNormal.z] : undefined;
  if (startWorld) {
    const snappedPoint = snapSurfacePerpendicularPoint(
      state,
      surfaceHit,
      hitNormal,
      startWorld,
      startNormal ?? null,
      pointerX,
      pointerY,
      rect,
      shiftKey,
    );
    if (snappedPoint) {
      const snappedAttachment = tapeAttachmentFromWorld(state, shapeId, snappedPoint);
      if (snappedAttachment) {
        return { x: snappedPoint.x, y: snappedPoint.y, z: snappedPoint.z, attachment: snappedAttachment, surfaceNormal };
      }
    }
  }
  const attachment = tapeAttachmentFromWorld(state, shapeId, surfaceHit.point);
  return attachment ? { x: surfaceHit.point.x, y: surfaceHit.point.y, z: surfaceHit.point.z, attachment, surfaceNormal } : null;
}

export function distanceToScreenSegment(x: number, y: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  const amount = lengthSq > 0.0001 ? clamp(((x - ax) * dx + (y - ay) * dy) / lengthSq, 0, 1) : 0;
  return Math.hypot(x - (ax + dx * amount), y - (ay + dy * amount));
}

export type SectionMeasureModel = {
  axis: SectionPlaneAxis;
  offset: number;
  /** The frame of a turned plane (#644); the points are in its terms. */
  frame: SectionFrame | null;
  loops: SectionLoop[];
  a: SectionPoint | null;
  b: SectionPoint | null;
  hover: SectionSnap | null;
};

export type SectionMeasureOverlayState = {
  signature: string;
  outlines: string[];
  a: { x: number; y: number } | null;
  b: { x: number; y: number } | null;
  hover: { x: number; y: number; kind: SectionSnap["kind"] } | null;
  label: { x: number; y: number; text: string } | null;
  /** The centres of round outlines: marked so it shows that they snap. */
  centers: Array<{ x: number; y: number }>;
};

/** Ø in front of a diameter and R in front of a radius, so the number says what it measures. */
export function sectionMeasureLabel(result: ReturnType<typeof sectionMeasurement>, accuracy: MeasurementAccuracy) {
  const prefix = result.circle === "diameter" ? "Ø " : result.circle === "radius" ? "R " : "";
  return `${prefix}${formatMeasure(result.distance, accuracy)}`;
}

/** The cut's outlines and the measurement on screen; nothing in the scene itself. */
export function syncSectionMeasureOverlay(
  state: ThreeState,
  active: boolean,
  model: SectionMeasureModel,
  overlayRef: MutableRefObject<SectionMeasureOverlayState | null>,
  setOverlay: Dispatch<SetStateAction<SectionMeasureOverlayState | null>>,
  accuracy: MeasurementAccuracy,
) {
  if (!active) {
    if (overlayRef.current) {
      overlayRef.current = null;
      setOverlay(null);
    }
    return;
  }
  const toScreen = (point: SectionPoint) => {
    const [x, y, z] = sectionPointFromFrame(sectionPointToWorld(point, model.axis, model.offset), model.frame);
    return projectToScreen(new THREE.Vector3(x, y, z), state);
  };
  const outlines = model.loops.map((loop) => {
    const screen = loop.points.map(toScreen);
    if (loop.closed && screen.length > 0) screen.push(screen[0]);
    return screen.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  });
  const a = model.a ? toScreen(model.a) : null;
  const b = model.b ? toScreen(model.b) : null;
  const hoverScreen = model.hover ? toScreen(model.hover.point) : null;
  const label = model.a && model.b && a && b
    ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - 18, text: sectionMeasureLabel(sectionMeasurement(model.a, model.b, model.axis, model.offset, model.loops), accuracy) }
    : null;
  const centers = model.loops.flatMap((loop) => {
    const circle = circleOfLoop(loop);
    return circle ? [toScreen(circle.center)] : [];
  });
  const next: SectionMeasureOverlayState = {
    signature: "",
    outlines,
    a,
    b,
    hover: hoverScreen && model.hover ? { ...hoverScreen, kind: model.hover.kind } : null,
    label,
    centers,
  };
  next.signature = JSON.stringify([outlines.join("|").length, outlines[0]?.slice(0, 40), a, b, next.hover, label?.text, label?.x, centers.map((center) => `${center.x.toFixed(0)},${center.y.toFixed(0)}`).join(" ")]);
  if (overlayRef.current?.signature === next.signature) return;
  overlayRef.current = next;
  setOverlay(next);
}
