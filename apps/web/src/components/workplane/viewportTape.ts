"use client";

import { type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { sectionPointFromFrame, type SectionFrame, type SectionPlaneAxis } from "@/lib/sectionView";
import { type SectionLoop, type SectionPoint } from "@/lib/sectionSvg";
import { circleOfLoop, sectionMeasurement, sectionPointToWorld, type SectionSnap } from "@/lib/sectionMeasure";
import * as THREE from "three";
import type { MeasurementAccuracy } from "@/types/layerling";
import { pointerReach } from "@/lib/pointerReach";
import { outwardFaceNormal } from "@/lib/layFlat";
import { axisLockedPoint, circleOfEdgePoints, closedRoundEdge, cornerOnRoundEdge, perpendicularFootOnPlane, perpendicularFootOnSegment, perpendicularPointsOnCircle, pointAcrossCircle } from "@/lib/tapeCircle";
import { aimPickRay, RENDER_LAYER_SHAPES } from "@/components/workplane/viewportPicking";
import { type ThreeState, type TapeAttachment, type TapeEdgeAttachment, type TapeCandidate, projectToScreen, tapeShapeDimensions, formatMeasure, findShapeObject, worldPointHidden } from "@/components/workplane/ViewportOverlays";
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
  const edgeCandidates: Array<{ distance: number; perpendicular?: boolean; candidate: TapeCandidate; round?: ReturnType<typeof closedRoundEdge> }> = [];
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
