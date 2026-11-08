import type { OcctKernel, ShapeHandle, Vec3 } from "occt-wasm";
import { isKernelMemoryFault } from "@/lib/kernelFault";

/*
 * Why a fillet is refused at a curved edge (#1473): the kernel builds a fillet as the surface a ball of that radius
 * traces rolling along the edge. Where the edge bends round the outside of the body tighter than the ball, that surface
 * folds over itself and the kernel gives up, with no word on where. A sharp corner is no such bend: it is two edges
 * meeting, and the kernel patches the corner. An inside bend (a notch in the outline) has room for the ball.
 *
 * So, when a fillet is refused, the picked curved edges are sampled finely, the tightest outside bend found, and the
 * refusal says how tight it is and marks those edges. Said only when it is true: a bend tighter than the radius.
 */

/** The message the worker sends; the number is the tightest bend in mm, rounded down to two places. */
export const TIGHT_BEND_MESSAGE_START = "The selected edges bend tighter than the fillet radius";

export function tightBendMessage(bend: number) {
  return `${TIGHT_BEND_MESSAGE_START}: the tightest bend has a radius of ${tightBendShown(bend)} mm. Choose a radius smaller than that, or make that bend rounder.`;
}

/** The bend as said: rounded down, so a radius just under the number shown is still under the real bend. */
export function tightBendShown(bend: number) {
  return Math.max(0.01, Math.floor(bend * 100 + 1e-9) / 100);
}

/** The bend back out of the worker's message (for the MCP path, which only has the text). */
export function tightBendFromMessage(message: string) {
  if (!message.startsWith(TIGHT_BEND_MESSAGE_START)) return null;
  const match = /radius of ([\d.]+) mm/.exec(message);
  return match ? Number(match[1]) : null;
}

/** The radius of the circle through three points; Infinity when they lie on one line. */
export function circumradius(a: Vec3, b: Vec3, c: Vec3) {
  const ab = distance(a, b);
  const bc = distance(b, c);
  const ca = distance(c, a);
  const area2 = length(cross(sub(b, a), sub(c, a)));
  if (area2 <= 1e-12 * Math.max(ab * bc, 1e-12)) return Infinity;
  return (ab * bc * ca) / (2 * area2);
}

export type BendSample = { radius: number; index: number; point: Vec3; towardCentre: Vec3; tangent: Vec3 };

/**
 * The bends of a polyline sampled along a curve that are tighter than `limit`, tightest first: one for each stretch of
 * points tighter than the limit, at the point where it bends most. Each comes with the direction to the bend's centre
 * and the curve's direction there. On a closed curve the ends join.
 */
export function bendsTighterThan(points: Vec3[], limit: number, closed = false): BendSample[] {
  const count = points.length;
  const bends: BendSample[] = [];
  if (count < 3) return bends;
  const radii = points.map((at, index) => {
    if (!closed && (index === 0 || index === count - 1)) return Infinity;
    return circumradius(points[(index - 1 + count) % count], at, points[(index + 1) % count]);
  });
  // On a closed curve the walk starts where it is not tight, so a stretch over the joint stays one.
  const start = closed ? Math.max(0, radii.findIndex((radius) => !(radius < limit))) : 0;
  const tightest: number[] = [];
  let current = -1;
  for (let step = 0; step < count; step += 1) {
    const index = (start + step) % count;
    if (!(radii[index] < limit)) {
      if (current >= 0) tightest.push(current);
      current = -1;
      continue;
    }
    if (current < 0 || radii[index] < radii[current]) current = index;
  }
  if (current >= 0) tightest.push(current);
  for (const index of tightest) {
    const radius = radii[index];
    const before = points[(index - 1 + count) % count];
    const at = points[index];
    const after = points[(index + 1) % count];
    const towardCentre = unit(sub(add(before, after), scale(at, 2)));
    const tangent = unit(sub(after, before));
    if (!towardCentre || !tangent) continue;
    bends.push({ radius, index, point: at, towardCentre, tangent });
  }
  return bends.sort((left, right) => left.radius - right.radius);
}

/**
 * Whether the body lies on the side of the bend's centre: an outside bend, which a fillet cannot follow tighter than its
 * radius. The solid is probed on a small circle round the edge, and the middle of the part inside it compared with the
 * direction to the centre.
 */
export function bendsRoundTheOutside(inside: (point: Vec3) => boolean, bend: BendSample, probe: number) {
  const helper: Vec3 = Math.abs(bend.tangent.x) < 0.9 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 };
  const u = unit(cross(bend.tangent, helper));
  if (!u) return false;
  const v = cross(bend.tangent, u);
  const samples = 12;
  let material: Vec3 = { x: 0, y: 0, z: 0 };
  let hits = 0;
  for (let index = 0; index < samples; index += 1) {
    const angle = ((index + 0.5) / samples) * 2 * Math.PI;
    const direction = add(scale(u, Math.cos(angle)), scale(v, Math.sin(angle)));
    if (!inside(add(bend.point, scale(direction, probe)))) continue;
    material = add(material, direction);
    hits += 1;
  }
  if (hits === 0 || hits === samples) return false;
  return dot(material, bend.towardCentre) > 0;
}

export type TightBend = { radius: number; edgeIds: number[] };

/**
 * The tightest outside bend among the picked edges that is tighter than `radius`, and the edges that have one; null when
 * none is (then something else refused the fillet). Straight edges are skipped; past the deadline the edges measured
 * so far count.
 */
export function tightestOutsideBend(cad: OcctKernel, solid: ShapeHandle, entries: { id: number; edge: ShapeHandle }[], radius: number, deadline: number): TightBend | null {
  let tightest = Infinity;
  const edgeIds: number[] = [];
  for (const entry of entries) {
    if (performance.now() > deadline) break;
    try {
      if (cad.curveType(entry.edge) === "line") continue;
      const range = cad.curveParameters(entry.edge);
      const curveLength = cad.curveLength(entry.edge);
      if (!(curveLength > 0)) continue;
      // A tenth of the radius between samples finds a bend tighter than it to a few hundredths of a millimetre.
      const step = Math.max(0.005, Math.min(0.1, radius / 10));
      const steps = Math.max(24, Math.min(800, Math.ceil(curveLength / step)));
      const closed = cad.curveIsClosed(entry.edge);
      const points: Vec3[] = [];
      for (let index = 0; index <= steps; index += 1) {
        if (closed && index === steps) break;
        points.push(cad.curvePointAtParam(entry.edge, range.first + ((range.last - range.first) * index) / steps));
      }
      // The tightest few are checked for their side: an inside bend in the same edge must not hide an outside one.
      const bends = bendsTighterThan(points, radius, closed).slice(0, 6);
      for (const bend of bends) {
        const probe = Math.max(0.002, Math.min(0.02, bend.radius * 0.2));
        if (!bendsRoundTheOutside((point) => cad.containsPoint(solid, point, probe * 1e-3), bend, probe)) continue;
        tightest = Math.min(tightest, bend.radius);
        edgeIds.push(entry.id);
        break;
      }
    } catch (error) {
      if (isKernelMemoryFault(error)) throw error;
    }
  }
  return edgeIds.length ? { radius: tightest, edgeIds } : null;
}

function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function scale(a: Vec3, factor: number): Vec3 {
  return { x: a.x * factor, y: a.y * factor, z: a.z * factor };
}

function dot(a: Vec3, b: Vec3) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
}

function length(a: Vec3) {
  return Math.hypot(a.x, a.y, a.z);
}

function distance(a: Vec3, b: Vec3) {
  return length(sub(a, b));
}

function unit(a: Vec3): Vec3 | null {
  const size = length(a);
  return size > 1e-12 ? scale(a, 1 / size) : null;
}
