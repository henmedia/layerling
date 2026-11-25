import * as THREE from "three";
import { addPrismAlongX, arcPoints, IndexedMesh, type ProfilePoint } from "@/lib/enclosureMesh";
import {
  DEFAULT_LID_LATCH_GRIP,
  DEFAULT_LID_LATCH_WIDTH,
  lidLatchClipProfile,
  lidLatchMeasures,
  MAX_LID_LATCH_GRIP,
  MAX_LID_LATCH_WIDTH,
  MIN_LID_LATCH_GRIP,
  MIN_LID_LATCH_WIDTH,
  type LidLatchMeasures,
} from "@/lib/lidLatch";

/*
 * The latch as a shape of its own (Discussion #2063): the lid tool's clip latch, like those on a camera battery box, to
 * put on any box, lid or case, so nobody has to build a box with latches only to cut them off. It is made of the same
 * measures as the lid tool's (`lidLatch.ts`), so a clip printed for one fits the other when its width and grip are the
 * same.
 *
 * It stands as it sits on a wall, the lid on top: x runs along the wall, y up and z out of it, the wall at the back
 * (least z). The body's pin sits low between two cheeks, the lid's pin high between two more, the cheeks running into
 * the wall on a 45 degree slope so they print on an upright wall without support; the lid's are the body's turned
 * over, for a lid that prints upside down. With "Both" the clip is shown closed over both pins, with the play it has,
 * so the three are separate bodies: Separate Parts splits them. "Pins" leaves the clip out, to group with a box and its
 * lid. "Clip" is the clip alone, lying on its side as it prints.
 */

export type LatchPart = "both" | "pins" | "clip";
export const LATCH_PARTS: readonly LatchPart[] = ["both", "pins", "clip"];
export const MAX_LATCH_SPACING = 80;

export function normalizeLatchPart(value: unknown): LatchPart {
  return value === "pins" || value === "clip" ? value : "both";
}

export type LatchFields = {
  latchPart?: LatchPart;
  /** The clip's width along the wall, mm. */
  latchWidth?: number;
  /** How hard the clip grips its pins, mm (see `lidLatch.ts`). */
  latchGrip?: number;
  /** How far apart the two pins' middles are, mm: the clip's length between its sockets. */
  latchSpacing?: number;
};

export type LatchPlan = {
  part: LatchPart;
  measures: LidLatchMeasures;
  /** The least spacing: the two sockets' outsides and a little room between them. */
  minSpacing: number;
  /** The body's pin's middle and the lid's, up from the bottom of the shape (for the clip alone, along it from its tab's end). */
  bodyPin: number;
  lidPin: number;
  /** How far the cheeks reach along the wall above or below their pin before they meet it. */
  cheekRun: number;
  /** The clip's profile's reach out of the wall: the least (it may tuck a hair behind the pins' cheeks) and the most. */
  clipNear: number;
  clipFar: number;
  /** The shape's own box at its true size. */
  width: number;
  depth: number;
  height: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function latchPlan(shape: LatchFields): LatchPlan {
  const part = normalizeLatchPart(shape.latchPart);
  const measures0 = lidLatchMeasures(
    finite(shape.latchWidth) ? shape.latchWidth : DEFAULT_LID_LATCH_WIDTH,
    finite(shape.latchGrip) ? shape.latchGrip : DEFAULT_LID_LATCH_GRIP,
  );
  const minSpacing = measures0.spacing;
  const spacing = clamp(finite(shape.latchSpacing) ? shape.latchSpacing : minSpacing, minSpacing, MAX_LATCH_SPACING);
  const measures = { ...measures0, spacing };
  const { rim, tab, reach, cheekRadius } = measures;
  // The cheeks meet the wall on a 45 degree slope from their round end, as in the lid tool.
  const cheekRun = reach + cheekRadius * Math.SQRT2;
  const profile = lidLatchClipProfile(measures);
  const clipNear = Math.min(0, ...profile.map(([, n]) => n));
  if (part === "clip") {
    // Lying on its side: x along the clip, from the tab's end to the lid's socket, z out of the wall as it would be.
    const clipLow = Math.min(...profile.map(([v]) => v));
    const clipHigh = Math.max(...profile.map(([v]) => v));
    const clipIn = Math.min(...profile.map(([, n]) => n));
    const clipOut = Math.max(...profile.map(([, n]) => n));
    return { part, measures, minSpacing, bodyPin: -clipLow, lidPin: spacing - clipLow, cheekRun, clipNear: clipIn, clipFar: clipOut, width: clipHigh - clipLow, depth: clipOut - clipIn, height: measures.width };
  }
  const clipFar = Math.max(...profile.map(([, n]) => n), reach + cheekRadius);
  const bodyPin = Math.max(rim + tab, cheekRun);
  const lidPin = bodyPin + spacing;
  return { part, measures, minSpacing, bodyPin, lidPin, cheekRun, clipNear, clipFar, width: measures.span, depth: clipFar - clipNear, height: lidPin + cheekRun };
}

/** The box a latch with these settings takes, to keep the shape's size with its settings. */
export function latchBox(shape: LatchFields) {
  const plan = latchPlan(shape);
  return { width: plan.width, depth: plan.depth, height: plan.height };
}

/** A circle's outline, `u` out of the wall and `v` up, anticlockwise. */
function circle(u: number, v: number, radius: number, steps = 32): ProfilePoint[] {
  return arcPoints({ u, v }, radius, 0, Math.PI * 2, steps).slice(0, steps);
}

/**
 * A cheek's side outline: round about its pin on the outside, flat along the wall's face towards the other pin, and
 * running into the wall at 45 degrees on the side away from it (`way` -1 below the body's pin, 1 above the lid's), as
 * the lid tool's cheeks do.
 */
function cheekOutline(measures: LidLatchMeasures, pin: number, way: -1 | 1, back: number): ProfilePoint[] {
  const { reach, cheekRadius } = measures;
  const run = reach + cheekRadius * Math.SQRT2;
  const points: ProfilePoint[] = [
    { u: back, v: pin - way * cheekRadius },
    // From the point nearest the other pin round the outside to where the 45 degree slope leaves the circle.
    ...arcPoints({ u: reach, v: pin }, cheekRadius, (-way * Math.PI) / 2, (way * Math.PI) / 4, 16),
    { u: back, v: pin + way * run },
  ];
  return points.filter((p, i, all) => i === 0 || Math.hypot(p.u - all[i - 1].u, p.v - all[i - 1].v) > 1e-6);
}

/** Moves every point of the mesh from `start` on. */
function shift(mesh: IndexedMesh, start: number, dx: number, dy: number, dz: number) {
  for (let i = start * 3; i < mesh.positions.length; i += 3) {
    mesh.positions[i] += dx;
    mesh.positions[i + 1] += dy;
    mesh.positions[i + 2] += dz;
  }
}

/** One pin with its two cheeks, centred on x = 0, the wall at u = `back`. */
function addPinMount(mesh: IndexedMesh, measures: LidLatchMeasures, pin: number, way: -1 | 1, back: number) {
  const inside = measures.width / 2 + measures.sidePlay;
  const cheek = cheekOutline(measures, pin, way, back);
  for (const sign of [-1, 1]) {
    const start = mesh.positions.length / 3;
    addPrismAlongX(mesh, cheek, measures.cheek);
    shift(mesh, start, sign * (inside + measures.cheek / 2), 0, 0);
  }
  // The pin reaches into both cheeks to their middles, so it is fused with them when the shape is built.
  addPrismAlongX(mesh, circle(measures.reach, pin, measures.pin), 2 * inside + measures.cheek);
}

export function latchMesh(shape: LatchFields) {
  const plan = latchPlan(shape);
  const { measures, part } = plan;
  const mesh = new IndexedMesh();
  // The clip's profile: v from the body's pin up, n out of the wall.
  const clip: ProfilePoint[] = lidLatchClipProfile(measures).map(([v, n]) => ({ u: n, v }));
  if (part === "clip") {
    // Drawn along x as it stands, then laid on its side: along becomes up, up becomes along.
    addPrismAlongX(mesh, clip, measures.width);
    const p = mesh.positions;
    for (let i = 0; i < p.length; i += 3) {
      const along = p[i];
      p[i] = p[i + 1] + plan.bodyPin - plan.width / 2;
      p[i + 1] = along + measures.width / 2;
      p[i + 2] -= plan.clipNear + plan.depth / 2;
    }
    mesh.orient();
    return { mesh, plan };
  }
  // The wall at the back: the clip may come a hair nearer the wall than the cheeks' backs.
  const back = 0;
  addPinMount(mesh, measures, plan.bodyPin, -1, back);
  addPinMount(mesh, measures, plan.lidPin, 1, back);
  if (part === "both") {
    const start = mesh.positions.length / 3;
    addPrismAlongX(mesh, clip, measures.width);
    shift(mesh, start, 0, plan.bodyPin, 0);
  }
  // Centred in depth like every shape: the back of the box at -depth/2.
  for (let i = 2; i < mesh.positions.length; i += 3) mesh.positions[i] -= plan.clipNear + plan.depth / 2;
  return { mesh, plan };
}

/** The latch's mesh, stretched to the shape's box should that differ from the latch's own size. */
export function createLatchGeometry(shape: LatchFields & { width: number; depth?: number; height: number }): THREE.BufferGeometry {
  const { mesh, plan } = latchMesh(shape);
  const geometry = mesh.geometry(30);
  const sx = shape.width > 0 ? shape.width / plan.width : 1;
  const sy = shape.height > 0 ? shape.height / plan.height : 1;
  const sz = (shape.depth ?? 0) > 0 ? (shape.depth as number) / plan.depth : 1;
  if (Math.abs(sx - 1) > 1e-6 || Math.abs(sy - 1) > 1e-6 || Math.abs(sz - 1) > 1e-6) {
    geometry.scale(sx, sy, sz);
    geometry.computeBoundingBox();
  }
  return geometry;
}

export { DEFAULT_LID_LATCH_GRIP as DEFAULT_LATCH_GRIP, DEFAULT_LID_LATCH_WIDTH as DEFAULT_LATCH_WIDTH };
export { MIN_LID_LATCH_WIDTH as MIN_LATCH_WIDTH, MAX_LID_LATCH_WIDTH as MAX_LATCH_WIDTH, MIN_LID_LATCH_GRIP as MIN_LATCH_GRIP, MAX_LID_LATCH_GRIP as MAX_LATCH_GRIP };
