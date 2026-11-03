import * as THREE from "three";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { outwardFaceNormal } from "@/lib/layFlat";
import { angleAtVertex, angleBetweenFaces, formatFaceAngles, formatProtractorAngle } from "@/lib/protractor";
import { planarFaceTriangles } from "@/lib/rotationPivot";
import { findShapeObject, projectToScreen, tapePointWorld, type TapePoint, type ThreeState } from "./ViewportOverlays";
import { aimPickRay, firstShapeHit, RENDER_LAYER_SHAPES, worldTrianglePositions } from "./viewportPicking";
import { tapeAttachmentFromWorld } from "./viewportTape";

/**
 * The protractor (#1228): an angle measured on screen, from three points (the corner first, then one
 * on each side) or between two flat faces. Like the tape measure it snaps to corners and edges and
 * follows the bodies it was placed on; unlike it, it keeps one measurement and none of it is saved.
 */

export type ProtractorKind = "points" | "faces";

/** A flat face clicked: where, and its outward normal - in the body's own frame when on a body, so it turns with it. */
export type ProtractorFace = { point: TapePoint; normal: [number, number, number] };

export type ProtractorModel = {
  kind: ProtractorKind;
  /** The corner first, then a point on each side. */
  points: TapePoint[];
  faces: ProtractorFace[];
  /** Where the next point or face would go, for the preview. */
  hoverPoint: TapePoint | null;
  hoverFace: ProtractorFace | null;
};

export const EMPTY_PROTRACTOR: ProtractorModel = { kind: "points", points: [], faces: [], hoverPoint: null, hoverFace: null };

export type ProtractorOverlayState = {
  signature: string;
  legs: Array<{ x1: number; y1: number; x2: number; y2: number; preview: boolean }>;
  /** The arc between the legs, drawn in 3D and projected, so it stays true in perspective. */
  arc: string | null;
  dots: Array<{ x: number; y: number }>;
  /** The outward normals of the clicked faces, as short strokes. */
  normals: Array<{ x1: number; y1: number; x2: number; y2: number }>;
  hover: { x: number; y: number } | null;
  label: { x: number; y: number; text: string } | null;
};

/** How long a face's normal stroke is drawn, in screen pixels. */
const PROTRACTOR_NORMAL_PIXELS = 30;

const vectorOf = ([x, y, z]: [number, number, number]) => new THREE.Vector3(x, y, z);

/** A face's normal in the world, turned with its body. */
export function protractorFaceNormalWorld(state: ThreeState, face: ProtractorFace) {
  const normal = vectorOf(face.normal);
  const object = face.point.attachment ? findShapeObject(state, face.point.attachment.shapeId) : null;
  if (object) {
    object.updateWorldMatrix(true, false);
    normal.applyMatrix3(new THREE.Matrix3().getNormalMatrix(object.matrixWorld));
  }
  return normal.normalize();
}

/** A face given in the world (by a click, or by MCP), kept in the frame of the body it lies on. */
export function protractorFaceFromWorld(state: ThreeState, shapeId: string | null, point: THREE.Vector3, normal: THREE.Vector3, id: string): ProtractorFace {
  const attachment = shapeId ? tapeAttachmentFromWorld(state, shapeId, point, "surface") : null;
  const object = attachment ? findShapeObject(state, attachment.shapeId) : null;
  const stored = normal.clone().normalize();
  if (object) {
    object.updateWorldMatrix(true, false);
    stored.applyMatrix3(new THREE.Matrix3().getNormalMatrix(object.matrixWorld).invert()).normalize();
  }
  return { point: { id, x: point.x, y: point.y, z: point.z, ...(attachment ? { attachment } : {}) }, normal: [stored.x, stored.y, stored.z] };
}

/**
 * The flat face under the pointer, or `curved` when the pointer is on a body but not on a flat face: a
 * lone facet of a round surface has no angle worth reading.
 */
export function pickProtractorFace(state: ThreeState, clientX: number, clientY: number): { shapeId: string; point: THREE.Vector3; normal: THREE.Vector3 } | "curved" | null {
  aimPickRay(state, clientX, clientY, RENDER_LAYER_SHAPES);
  const hit = firstShapeHit(state, { needsFace: true });
  if (!hit || hit.faceIndex === undefined || hit.faceIndex === null) return null;
  const mesh = hit.object as THREE.Mesh<THREE.BufferGeometry>;
  const positions = worldTrianglePositions(mesh);
  const face = planarFaceTriangles(positions, hit.faceIndex);
  if (!face || face.triangles.length < 2) return "curved";
  const corner = (offset: number) => new THREE.Vector3().fromArray(positions, (hit.faceIndex! * 3 + offset) * 3);
  const normal = outwardFaceNormal(corner(0), corner(1), corner(2), state.raycaster.ray.direction);
  if (!normal) return "curved";
  return { shapeId: mesh.userData.shapeId as string, point: hit.point.clone(), normal: new THREE.Vector3(normal.x, normal.y, normal.z) };
}

/** The angle the model reads, in degrees, and its label; null until it is complete. */
export function protractorReading(state: ThreeState, model: ProtractorModel) {
  if (model.kind === "points") {
    if (model.points.length < 3) return null;
    const [vertex, a, b] = model.points.map((point) => tapePointWorld(state, point));
    const angle = angleAtVertex(vertex, a, b);
    return angle === null ? null : { angle, text: formatProtractorAngle(angle) };
  }
  if (model.faces.length < 2) return null;
  const angles = angleBetweenFaces(protractorFaceNormalWorld(state, model.faces[0]), protractorFaceNormalWorld(state, model.faces[1]));
  return angles === null ? null : { angle: angles.angle, other: angles.other, text: formatFaceAngles(angles) };
}

/** Points on the arc from `a` to `b` around `vertex`, `radius` out, in the plane the three span. */
function arcPoints(vertex: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3, radius: number) {
  const u = a.clone().sub(vertex).normalize();
  const w = b.clone().sub(vertex).normalize();
  const angle = u.angleTo(w);
  const across = w.clone().addScaledVector(u, -Math.cos(angle));
  // Straight (180°) or folded flat (0°): no plane to draw the arc in.
  if (across.lengthSq() < 1e-10) return null;
  across.normalize();
  const steps = Math.max(6, Math.ceil(angle / (Math.PI / 36)));
  return Array.from({ length: steps + 1 }, (_, index) => {
    const t = (angle * index) / steps;
    return vertex.clone().addScaledVector(u, radius * Math.cos(t)).addScaledVector(across, radius * Math.sin(t));
  });
}

/** The protractor on screen; nothing in the scene itself. */
export function syncProtractorOverlay(
  state: ThreeState,
  active: boolean,
  model: ProtractorModel,
  overlayRef: MutableRefObject<ProtractorOverlayState | null>,
  setOverlay: Dispatch<SetStateAction<ProtractorOverlayState | null>>,
) {
  const empty = model.points.length === 0 && model.faces.length === 0 && !model.hoverPoint && !model.hoverFace;
  if (!active || empty) {
    if (overlayRef.current) {
      overlayRef.current = null;
      setOverlay(null);
    }
    return;
  }
  const next: ProtractorOverlayState = { signature: "", legs: [], arc: null, dots: [], normals: [], hover: null, label: null };
  const toScreen = (point: THREE.Vector3) => projectToScreen(point, state);
  if (model.kind === "points") {
    const placed = model.points.map((point) => tapePointWorld(state, point));
    const hover = model.hoverPoint && placed.length < 3 ? tapePointWorld(state, model.hoverPoint) : null;
    const all = hover ? [...placed, hover] : placed;
    const screens = all.map(toScreen);
    for (let index = 1; index < all.length; index += 1) {
      next.legs.push({ x1: screens[0].x, y1: screens[0].y, x2: screens[index].x, y2: screens[index].y, preview: hover !== null && index === all.length - 1 });
    }
    next.dots = screens.slice(0, placed.length);
    next.hover = hover ? screens[screens.length - 1] : null;
    if (all.length === 3) {
      const [vertex, a, b] = all;
      const angle = angleAtVertex(vertex, a, b);
      const radius = 0.3 * Math.min(vertex.distanceTo(a), vertex.distanceTo(b));
      const arc = angle !== null && radius > 1e-6 ? arcPoints(vertex, a, b, radius) : null;
      if (arc) next.arc = arc.map(toScreen).map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
      if (angle !== null) {
        // Beside the middle of the arc, out from the corner, so it does not sit on a leg.
        const middle = arc ? toScreen(arc[Math.floor(arc.length / 2)]) : screens[0];
        const away = { x: middle.x - screens[0].x, y: middle.y - screens[0].y };
        const length = Math.hypot(away.x, away.y) || 1;
        next.label = { x: middle.x + (away.x / length) * 22, y: middle.y + (away.y / length) * 22, text: formatProtractorAngle(angle) };
      }
    }
  } else {
    const faces = model.hoverFace && model.faces.length < 2 ? [...model.faces, model.hoverFace] : model.faces;
    const points = faces.map((face) => tapePointWorld(state, face.point));
    const screens = points.map(toScreen);
    faces.forEach((face, index) => {
      const normal = protractorFaceNormalWorld(state, face);
      const start = screens[index];
      const unit = toScreen(points[index].clone().add(normal));
      const reach = Math.hypot(unit.x - start.x, unit.y - start.y);
      // A normal pointing straight at the camera has no stroke to draw.
      if (reach < 1e-3) return;
      const scale = PROTRACTOR_NORMAL_PIXELS / reach;
      next.normals.push({ x1: start.x, y1: start.y, x2: start.x + (unit.x - start.x) * scale, y2: start.y + (unit.y - start.y) * scale });
    });
    next.dots = screens.slice(0, model.faces.length);
    next.hover = model.hoverFace && model.faces.length < 2 ? screens[screens.length - 1] : null;
    if (screens.length === 2) {
      next.legs.push({ x1: screens[0].x, y1: screens[0].y, x2: screens[1].x, y2: screens[1].y, preview: next.hover !== null });
      const angles = angleBetweenFaces(protractorFaceNormalWorld(state, faces[0]), protractorFaceNormalWorld(state, faces[1]));
      if (angles) next.label = { x: (screens[0].x + screens[1].x) / 2, y: (screens[0].y + screens[1].y) / 2 - 18, text: formatFaceAngles(angles) };
    }
  }
  const round = (value: number) => value.toFixed(1);
  next.signature = JSON.stringify([
    next.legs.map((leg) => [round(leg.x1), round(leg.y1), round(leg.x2), round(leg.y2), leg.preview]),
    next.arc,
    next.dots.map((dot) => [round(dot.x), round(dot.y)]),
    next.normals.map((stroke) => [round(stroke.x2), round(stroke.y2)]),
    next.hover && [round(next.hover.x), round(next.hover.y)],
    next.label && [round(next.label.x), round(next.label.y), next.label.text],
  ]);
  if (overlayRef.current?.signature === next.signature) return;
  overlayRef.current = next;
  setOverlay(next);
}

export function ProtractorOverlay({ overlay }: { overlay: ProtractorOverlayState }) {
  return (
    <div className="protractor-overlay" aria-hidden="true">
      <svg className="tape-guides" width="100%" height="100%">
        {overlay.legs.map((leg, index) => (
          <line key={index} className={`protractor-leg ${leg.preview ? "preview" : ""}`} x1={leg.x1} y1={leg.y1} x2={leg.x2} y2={leg.y2} />
        ))}
        {overlay.arc ? <polyline className="protractor-arc" points={overlay.arc} fill="none" /> : null}
        {overlay.normals.map((stroke, index) => (
          <line key={`normal-${index}`} className="protractor-normal" x1={stroke.x1} y1={stroke.y1} x2={stroke.x2} y2={stroke.y2} />
        ))}
        {overlay.dots.map((dot, index) => (
          <circle key={`dot-${index}`} className="protractor-point" cx={dot.x} cy={dot.y} r="4.5" />
        ))}
        {overlay.hover ? <circle className="protractor-hover" cx={overlay.hover.x} cy={overlay.hover.y} r="5" /> : null}
      </svg>
      {overlay.label ? <span className="tape-label protractor-label" style={{ left: overlay.label.x, top: overlay.label.y }}>{overlay.label.text}</span> : null}
    </div>
  );
}
