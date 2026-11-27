import type { WorkplaneShape } from "@/types/layerling";
import * as THREE from "three";
import { quaternionForShape } from "@/lib/geometryRotation";
import { placementWorkplaneFromSurface, type PlacementWorkplane } from "@/lib/placementWorkplane";
import { shapeDepth, shapeWidth } from "@/lib/workplaneShapes";

export type SectionPlaneAxis = "x" | "y" | "z";

/** The letter the editor shows for an axis, as in the position fields: X width, Y depth, Z height. */
export type SectionAxisLetter = "X" | "Y" | "Z";

/**
 * `axis` stays three.js (y up); what the user reads uses the position fields'
 * letters (z up): x is X, z (depth) is Y, y (height) is Z.
 */
export const SECTION_AXIS_LETTER: Readonly<Record<SectionPlaneAxis, SectionAxisLetter>> = { x: "X", y: "Z", z: "Y" };

/** The axes in the order the panel shows them: X, Y, Z. */
export const SECTION_AXES_SHOWN: readonly SectionPlaneAxis[] = ["x", "z", "y"];

export function sectionAxisLetter(axis: SectionPlaneAxis): SectionAxisLetter {
  return SECTION_AXIS_LETTER[axis];
}

export function sectionAxisFromLetter(letter: SectionAxisLetter): SectionPlaneAxis {
  return letter === "X" ? "x" : letter === "Y" ? "z" : "y";
}

/**
 * What the axes of the section view are measured along (#644): the design's own axes, the workplane's
 * (X and Y in the workplane, Z out of it), or the view - Z then runs away from the eye, so the plane faces the screen.
 */
export type SectionOrientation = "world" | "workplane" | "view";

/**
 * The frame a turned section plane is measured in: x, y (up out of the plane, as a workplane's normal) and z,
 * at right angles, z = x × y so the cut is never seen mirrored. Offsets count from the origin along the chosen axis.
 */
export type SectionFrame = {
  origin: { x: number; y: number; z: number };
  xAxis: { x: number; y: number; z: number };
  yAxis: { x: number; y: number; z: number };
  zAxis: { x: number; y: number; z: number };
};

export type SectionPlaneSettings = {
  enabled: boolean;
  axis: SectionPlaneAxis;
  offset: number;
  flipped: boolean;
  showPlane: boolean;
  orientation?: SectionOrientation;
  /** Set for the workplane and the view; absent or null for the design's own axes. */
  frame?: SectionFrame | null;
  /** On the view: the plane turns with the camera (absent counts as on); false holds it where it was taken. */
  followView?: boolean;
};

export type SectionBounds = {
  min: number;
  max: number;
  center: number;
  step: number;
};

export const DEFAULT_SECTION_SETTINGS: SectionPlaneSettings = {
  enabled: false,
  axis: "x",
  offset: 0,
  flipped: false,
  showPlane: true,
  orientation: "world",
  frame: null,
};

type Vec = { x: number; y: number; z: number };

function unit(value: Vec): Vec | null {
  const length = Math.hypot(value.x, value.y, value.z);
  return Number.isFinite(length) && length > 1e-9 ? { x: value.x / length, y: value.y / length, z: value.z / length } : null;
}

function crossOf(a: Vec, b: Vec): Vec {
  return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
}

function dotOf(a: Vec, b: Vec) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

/**
 * A frame from a y direction and a hint for x: x is made square to y, z = x × y. Null when y has no length.
 */
export function sectionFrameFrom(origin: Vec, yDirection: Vec, xHint: Vec): SectionFrame | null {
  const yAxis = unit(yDirection);
  if (!yAxis) return null;
  const along = dotOf(xHint, yAxis);
  let xAxis = unit({ x: xHint.x - yAxis.x * along, y: xHint.y - yAxis.y * along, z: xHint.z - yAxis.z * along });
  if (!xAxis) {
    // The hint runs along y: take the world axis that lies flattest in the plane.
    const candidates: Vec[] = [{ x: 1, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }, { x: 0, y: 1, z: 0 }];
    const best = candidates.reduce((pick, candidate) => (Math.abs(dotOf(candidate, yAxis)) < Math.abs(dotOf(pick, yAxis)) ? candidate : pick));
    const d = dotOf(best, yAxis);
    xAxis = unit({ x: best.x - yAxis.x * d, y: best.y - yAxis.y * d, z: best.z - yAxis.z * d })!;
  }
  return { origin: { ...origin }, xAxis, yAxis, zAxis: crossOf(xAxis, yAxis) };
}

/** The workplane's frame: X and Y as in the workplane, the height out of it. */
export function sectionFrameFromWorkplane(workplane: Pick<PlacementWorkplane, "origin" | "normal" | "xAxis">): SectionFrame | null {
  return sectionFrameFrom(workplane.origin, workplane.normal, workplane.xAxis);
}

/**
 * The view's frame: the height runs away from the eye, so a cut across it faces the screen and takes away
 * what lies in front; x runs to the right of the screen. The origin is the point the view turns about.
 */
export function sectionFrameFromView(origin: Vec, viewDirection: Vec, screenRight: Vec): SectionFrame | null {
  return sectionFrameFrom(origin, viewDirection, screenRight);
}

/** The direction of an axis in the world: a column of the frame, or the axis itself without one. */
export function sectionAxisVector(axis: SectionPlaneAxis, frame?: SectionFrame | null): Vec {
  if (frame) return axis === "x" ? frame.xAxis : axis === "y" ? frame.yAxis : frame.zAxis;
  return axis === "x" ? { x: 1, y: 0, z: 0 } : axis === "y" ? { x: 0, y: 1, z: 0 } : { x: 0, y: 0, z: 1 };
}

/**
 * The offset along `axis` in a new frame that keeps the plane where it is in the design as far as it can: the new
 * plane goes through the point of the old one closest to the new origin. When only the origin moves (zooming to the
 * pointer, panning) the plane stays put; when the axis turns it pivots about that point.
 */
export function sectionOffsetInFrame(axis: SectionPlaneAxis, offset: number, from: SectionFrame, to: SectionFrame): number {
  const before = sectionAxisVector(axis, from);
  const distance = dotOf(before, from.origin) + offset - dotOf(before, to.origin);
  return distance * dotOf(sectionAxisVector(axis, to), before);
}

/** A world point in the frame's coordinates (unchanged without a frame). */
export function sectionPointToFrame(point: readonly [number, number, number], frame?: SectionFrame | null): [number, number, number] {
  if (!frame) return [point[0], point[1], point[2]];
  const relative = { x: point[0] - frame.origin.x, y: point[1] - frame.origin.y, z: point[2] - frame.origin.z };
  return [dotOf(relative, frame.xAxis), dotOf(relative, frame.yAxis), dotOf(relative, frame.zAxis)];
}

/** A point given in the frame's coordinates back in the world (unchanged without a frame). */
export function sectionPointFromFrame(point: readonly [number, number, number], frame?: SectionFrame | null): [number, number, number] {
  if (!frame) return [point[0], point[1], point[2]];
  const [a, b, c] = point;
  const { origin, xAxis, yAxis, zAxis } = frame;
  return [
    origin.x + xAxis.x * a + yAxis.x * b + zAxis.x * c,
    origin.y + xAxis.y * a + yAxis.y * b + zAxis.y * c,
    origin.z + xAxis.z * a + yAxis.z * b + zAxis.z * c,
  ];
}

/** A mesh moved into the frame, so slicing it across a frame axis is the same as across a world axis. */
export function sectionMeshInFrame<T extends { vertices: ReadonlyArray<readonly [number, number, number]> }>(mesh: T, frame?: SectionFrame | null): T {
  if (!frame) return mesh;
  return { ...mesh, vertices: mesh.vertices.map((vertex) => sectionPointToFrame(vertex, frame)) };
}

/**
 * Calculates the bounding range for the cutting plane slider along the chosen axis.
 * Adds a small margin around the shapes so the user can easily slice through the entire model.
 */
export function getSectionBounds(
  shapes: WorkplaneShape[],
  axis: SectionPlaneAxis,
  workspaceWidth = 200,
  workspaceDepth = 200,
  frame: SectionFrame | null = null,
): SectionBounds {
  const visible = shapes.filter((shape) => !shape.hidden);
  if (visible.length === 0 && frame) return { min: -100, max: 100, center: 0, step: 0.5 };
  if (visible.length === 0) {
    if (axis === "x") return { min: -workspaceWidth / 2, max: workspaceWidth / 2, center: 0, step: 0.5 };
    if (axis === "y") return { min: 0, max: 100, center: 50, step: 0.5 };
    return { min: -workspaceDepth / 2, max: workspaceDepth / 2, center: 0, step: 0.5 };
  }

  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  visible.forEach((shape) => {
    // The box around the turned shape: a part turned or tipped reaches
    // further along some axes than its width, depth and height say.
    const half = new THREE.Vector3(shapeWidth(shape) / 2, shape.height / 2, shapeDepth(shape) / 2);
    const rotation = new THREE.Matrix4().makeRotationFromQuaternion(quaternionForShape(shape)).elements;
    const direction = sectionAxisVector(axis, frame);
    // Column-major: the shape's own axes are the columns at 0, 4 and 8.
    const along = (column: number) => Math.abs(direction.x * rotation[column] + direction.y * rotation[column + 1] + direction.z * rotation[column + 2]);
    const reach = along(0) * half.x + along(4) * half.y + along(8) * half.z;
    const middle: [number, number, number] = [shape.x, (shape.elevation ?? 0) + shape.height / 2, shape.z];
    const center = sectionPointToFrame(middle, frame)[axis === "x" ? 0 : axis === "y" ? 1 : 2];
    min = Math.min(min, center - reach);
    max = Math.max(max, center + reach);
  });

  const span = Math.max(max - min, 1);
  const padding = Math.max(span * 0.05, 1);
  const paddedMin = Math.round((min - padding) * 10) / 10;
  const paddedMax = Math.round((max + padding) * 10) / 10;
  const center = Math.round(((min + max) / 2) * 10) / 10;

  return {
    min: paddedMin,
    max: paddedMax,
    center,
    step: 0.5,
  };
}

/**
 * The fine slider's window: a twentieth of the coarse range to either side,
 * at least 0.5 mm and at most 10 mm, in steps 200 times finer than that.
 */
export function sectionFineWindow(bounds: Pick<SectionBounds, "min" | "max">) {
  const span = Math.min(10, Math.max(0.5, (bounds.max - bounds.min) / 20));
  return { span, step: span / 200 };
}

/**
 * The workplane on the cut (#154): on the plane of the section view, facing out of the body that
 * stays - towards the side that was cut away, as the face a cut leaves does. A sketch started there
 * draws the way one looks at that cut, so its outline in the sketch view is the cut's own. The
 * origin is where the plane crosses its axis.
 */
export function sectionPlacementWorkplane(settings: Pick<SectionPlaneSettings, "axis" | "offset" | "flipped" | "frame">): PlacementWorkplane {
  const { normal } = computeSectionPlaneVector({ ...settings, enabled: true, showPlane: true });
  const frame = settings.frame ?? null;
  const [x, y, z] = sectionPointFromFrame([
    settings.axis === "x" ? settings.offset : 0,
    settings.axis === "y" ? settings.offset : 0,
    settings.axis === "z" ? settings.offset : 0,
  ], frame);
  // On a turned plane the sketch keeps the frame's x across, as on the workplane it came from.
  const hint = frame ? (settings.axis === "x" ? frame.zAxis : frame.xAxis) : { x: 1, y: 0, z: 0 };
  return placementWorkplaneFromSurface({ x, y, z }, { x: -normal.x || 0, y: -normal.y || 0, z: -normal.z || 0 }, hint, false, !frame);
}

/**
 * Computes normal vector and plane constant D for Ax + By + Cz + D = 0.
 * In Three.js: points with n · p + D >= 0 are kept, points with n · p + D < 0 are discarded.
 */
export function computeSectionPlaneVector(settings: SectionPlaneSettings) {
  if (settings.frame) {
    // Kept: points whose coordinate along the frame axis is at least the offset (at most, flipped).
    const direction = sectionAxisVector(settings.axis, settings.frame);
    const sign = settings.flipped ? -1 : 1;
    const base = dotOf(direction, settings.frame.origin) + settings.offset;
    return {
      normal: { x: sign * direction.x || 0, y: sign * direction.y || 0, z: sign * direction.z || 0 },
      constant: -sign * base,
    };
  }
  let nx = 0;
  let ny = 0;
  let nz = 0;

  if (settings.axis === "x") {
    nx = settings.flipped ? -1 : 1;
  } else if (settings.axis === "y") {
    ny = settings.flipped ? -1 : 1;
  } else {
    nz = settings.flipped ? -1 : 1;
  }

  // If not flipped: n · p - offset >= 0 => keeps p >= offset.
  // If flipped: -n · p + offset >= 0 => keeps p <= offset.
  const constant = settings.flipped ? settings.offset : -settings.offset;

  return {
    normal: { x: nx, y: ny, z: nz },
    constant,
  };
}
