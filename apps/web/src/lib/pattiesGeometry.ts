import * as THREE from "three";
import { toCreasedNormals } from "@/lib/creasedNormals";
import {
  DEFAULT_PATTIES_DEPTH,
  DEFAULT_PATTIES_HEIGHT,
  DEFAULT_PATTIES_WIDTH,
  normalizePatties,
  pattiesLoopArea,
  pattiesPlan,
  type PattiesLoop,
  type PattiesPlan,
  type PattiesSettings,
} from "@/lib/pattiesPattern";

/**
 * Patties, the pattern plate: a flat plate that carries a pattern of figures, built from its settings every time.
 * The figures come from pattiesPattern.ts; this file makes the body.
 *
 * Four ways to build it:
 * - stencil: the figures are cut through the plate. A stencil for glaze or paint, a screen, a trivet, a vent.
 * - raised: the figures stand on a plate. A stamp, a texture mat to roll clay on, a relief.
 * - sunk: the figures are pressed into the plate. A mould for sprigs, an inlay bed for a second colour.
 * - pieces: the figures alone. Turned into a hole they perforate any body; as solids they are inlays.
 */

/** What a shape carries for the pattern plate: its settings, whole or in part. */
export type PattiesShapeFields = { patties?: Partial<PattiesSettings> | null };

export { DEFAULT_PATTIES_DEPTH, DEFAULT_PATTIES_HEIGHT, DEFAULT_PATTIES_WIDTH };

/** The settings of a pattern plate, every one set and within its range. */
export function pattiesSettingsOfShape(shape: PattiesShapeFields | null | undefined): PattiesSettings {
  return normalizePatties(shape?.patties);
}

/** The thinnest plate and the least a figure stands out of it or reaches into it. */
export const PATTIES_MIN_HEIGHT = 0.4;
const MIN_STEP = 0.2;

/** How thick the plate under raised or sunk figures really is: it leaves the figures at least a layer. */
export function pattiesBaseThickness(settings: Pick<PattiesSettings, "base">, height: number) {
  return Math.max(MIN_STEP, Math.min(settings.base, height - MIN_STEP));
}

/** The plan of the last few plates: the inspector and the body ask for the same one many times while a slider moves. */
const planCache = new Map<string, PattiesPlan>();

export function pattiesPlanOfShape(shape: PattiesShapeFields | null | undefined, width: number, depth: number): PattiesPlan {
  const settings = pattiesSettingsOfShape(shape);
  const key = JSON.stringify([settings, width, depth]);
  const cached = planCache.get(key);
  if (cached) return cached;
  const plan = pattiesPlan(settings, width, depth);
  if (planCache.size >= 6) planCache.delete(planCache.keys().next().value as string);
  planCache.set(key, plan);
  return plan;
}

type Triangle = [number, number, number];

/**
 * A flat face over an outline with holes, as triangles that turn counter-clockwise and name the points by their
 * place in `[outline, ...holes]` laid end to end.
 *
 * The triangles come from three's ear cutting, which leaves out a point that sits on a straight run with its two
 * neighbours. Inside one loop there is no such point (cleanPattiesLoop), but once the holes are tied to the outline
 * there can be: the corners of two figures in a row, or of figures cut along one line, sit on one line. A point left
 * out is a crack - the wall beside the face still stands on it. So afterwards every triangle edge that runs over
 * such a point is cut there, until every edge inside the face has its partner.
 */
export function pattiesFaceTriangles(outline: PattiesLoop, holes: PattiesLoop[]): Triangle[] {
  const loops = [outline, ...holes];
  const points = loops.flat();
  const contour = outline.map((p) => new THREE.Vector2(p.x, p.y));
  const inner = holes.map((loop) => loop.map((p) => new THREE.Vector2(p.x, p.y)));
  const area = (a: number, b: number, c: number) =>
    (points[b].x - points[a].x) * (points[c].y - points[a].y) - (points[b].y - points[a].y) * (points[c].x - points[a].x);
  let triangles: Triangle[] = [];
  for (const [a, b, c] of THREE.ShapeUtils.triangulateShape(contour, inner)) {
    const cross = area(a, b, c);
    // A triangle without area closes nothing; the edges it leaves open are cut to fit below.
    if (Math.abs(cross) < 1e-10) continue;
    triangles.push(cross > 0 ? [a, b, c] : [a, c, b]);
  }

  // The edges of the face itself: the outline the way it runs, the holes the other way round.
  const count = points.length;
  const key = (a: number, b: number) => a * count + b;
  const border = new Set<number>();
  let start = 0;
  loops.forEach((loop, index) => {
    for (let i = 0; i < loop.length; i += 1) {
      const a = start + i, b = start + ((i + 1) % loop.length);
      border.add(index === 0 ? key(a, b) : key(b, a));
    }
    start += loop.length;
  });

  const order = points.map((_, index) => index).sort((a, b) => points[a].x - points[b].x);
  const xs = order.map((index) => points[index].x);
  const firstFrom = (x: number) => {
    let low = 0, high = xs.length;
    while (low < high) {
      const mid = (low + high) >> 1;
      if (xs[mid] < x) low = mid + 1;
      else high = mid;
    }
    return low;
  };
  /** The points that sit on the open stretch between two points, in order from the first to the second. */
  const between = (a: number, b: number) => {
    const p = points[a], q = points[b];
    const dx = q.x - p.x, dy = q.y - p.y;
    const length = Math.hypot(dx, dy);
    const found: { index: number; t: number }[] = [];
    if (length < 1e-9) return found;
    const slack = 1e-7;
    for (let i = firstFrom(Math.min(p.x, q.x) - slack); i < xs.length && xs[i] <= Math.max(p.x, q.x) + slack; i += 1) {
      const index = order[i];
      if (index === a || index === b) continue;
      const r = points[index];
      const off = Math.abs((r.x - p.x) * dy - (r.y - p.y) * dx) / length;
      if (off > slack) continue;
      const t = ((r.x - p.x) * dx + (r.y - p.y) * dy) / (length * length);
      if (t > 1e-9 && t < 1 - 1e-9) found.push({ index, t });
    }
    return found.sort((m, n) => m.t - n.t);
  };

  for (let pass = 0; pass < 12; pass += 1) {
    const edges = new Set<number>();
    for (const [a, b, c] of triangles) {
      edges.add(key(a, b));
      edges.add(key(b, c));
      edges.add(key(c, a));
    }
    let changed = false;
    const next: Triangle[] = [];
    for (const triangle of triangles) {
      let cut = false;
      for (let side = 0; side < 3 && !cut; side += 1) {
        const a = triangle[side], b = triangle[(side + 1) % 3], c = triangle[(side + 2) % 3];
        if (border.has(key(a, b)) || edges.has(key(b, a))) continue;
        const on = between(a, b);
        if (!on.length) continue;
        const stops = [a, ...on.map((entry) => entry.index), b];
        for (let i = 0; i + 1 < stops.length; i += 1) next.push([stops[i], stops[i + 1], c]);
        cut = true;
        changed = true;
      }
      if (!cut) next.push(triangle);
    }
    triangles = next;
    if (!changed) break;
  }
  return triangles;
}

class Mesh {
  readonly positions: number[] = [];
  readonly indices: number[] = [];

  /** The loop's points at one height; returns where they start. */
  ring(loop: PattiesLoop, y: number) {
    const start = this.positions.length / 3;
    for (const p of loop) this.positions.push(p.x, y, p.y);
    return start;
  }

  /**
   * A flat face from its triangles, facing up or down. `loops` are the loops the triangles were made from and
   * `starts` where each one's points are at this height.
   */
  face(triangles: Triangle[], loops: PattiesLoop[], starts: number[], up: boolean) {
    const at: number[] = [];
    loops.forEach((loop, index) => {
      for (let i = 0; i < loop.length; i += 1) at.push(starts[index] + i);
    });
    // Seen from above, counter-clockwise in x and z faces down.
    for (const [a, b, c] of triangles) {
      if (up) this.indices.push(at[a], at[c], at[b]);
      else this.indices.push(at[a], at[b], at[c]);
    }
  }

  /** The wall of a counter-clockwise loop between two heights, facing away from the loop or into it. */
  wall(count: number, low: number, high: number, outward: boolean) {
    for (let i = 0; i < count; i += 1) {
      const j = (i + 1) % count;
      const b0 = low + i, b1 = low + j, t0 = high + i, t1 = high + j;
      if (outward) this.indices.push(b0, t1, b1, b0, t0, t1);
      else this.indices.push(b0, b1, t1, b0, t1, t0);
    }
  }

  geometry() {
    const indexed = new THREE.BufferGeometry();
    indexed.setAttribute("position", new THREE.Float32BufferAttribute(this.positions, 3));
    indexed.setIndex(this.indices);
    // 30 degrees keeps the plate's faces and the corners of the figures sharp and the round figures smooth.
    const geometry = toCreasedNormals(indexed, THREE.MathUtils.degToRad(30));
    indexed.dispose();
    geometry.computeBoundingBox();
    return geometry;
  }
}

/**
 * The body of a plan. It is closed: every flat face is made of the very points its walls stand on, so no edge is
 * left open and the body can be cut, joined and sliced like any other.
 */
export function pattiesGeometryFromPlan(plan: PattiesPlan, settings: PattiesSettings, height: number): THREE.BufferGeometry {
  const top = Math.max(PATTIES_MIN_HEIGHT, height);
  const mesh = new Mesh();
  // The plan is drawn as on paper, y up; on the workplane the back is at -z. Seen from above the plate then reads
  // as the plan does - a heart with its point to the front, a letter the right way round. Turned over like this a
  // loop runs the other way, so it is taken backwards and keeps turning counter-clockwise in x and z.
  const onPlane = (loop: PattiesLoop): PattiesLoop => loop.map((p) => ({ x: p.x, y: -p.y })).reverse();
  const outline = onPlane(plan.outline);
  const figures = plan.figures.filter((loop) => loop.length >= 3 && pattiesLoopArea(loop) > 0).map(onPlane);
  const mode = figures.length ? settings.mode : "stencil";

  if (mode === "pieces") {
    for (const loop of figures) {
      const low = mesh.ring(loop, 0);
      const high = mesh.ring(loop, top);
      const cap = pattiesFaceTriangles(loop, []);
      mesh.face(cap, [loop], [low], false);
      mesh.face(cap, [loop], [high], true);
      mesh.wall(loop.length, low, high, true);
    }
    return mesh.geometry();
  }

  const loops = [outline, ...figures];
  // The plate's top with the figures left open; a stencil's bottom is the same face.
  const pierced = pattiesFaceTriangles(outline, figures);

  if (mode === "stencil") {
    const low = loops.map((loop) => mesh.ring(loop, 0));
    const high = loops.map((loop) => mesh.ring(loop, top));
    mesh.face(pierced, loops, low, false);
    mesh.face(pierced, loops, high, true);
    mesh.wall(outline.length, low[0], high[0], true);
    figures.forEach((loop, index) => mesh.wall(loop.length, low[index + 1], high[index + 1], false));
    return mesh.geometry();
  }

  // Raised and sunk: a plate, and a step up or down at every figure.
  const step = pattiesBaseThickness(settings, top);
  const raised = mode === "raised";
  // The level the plate's own top is at, and the level the figures' tops (or floors) are at.
  const plateTop = raised ? step : top;
  const figureTop = raised ? top : step;
  const bottom = mesh.ring(outline, 0);
  const edge = mesh.ring(outline, plateTop);
  const around = figures.map((loop) => mesh.ring(loop, plateTop));
  const caps = figures.map((loop) => mesh.ring(loop, figureTop));
  mesh.face(pattiesFaceTriangles(outline, []), [outline], [bottom], false);
  mesh.wall(outline.length, bottom, edge, true);
  mesh.face(pierced, loops, [edge, ...around], true);
  figures.forEach((loop, index) => {
    if (raised) mesh.wall(loop.length, around[index], caps[index], true);
    else mesh.wall(loop.length, caps[index], around[index], false);
    mesh.face(pattiesFaceTriangles(loop, []), [loop], [caps[index]], true);
  });
  return mesh.geometry();
}

/**
 * The pattern plate as a body in [-width/2, width/2] x [0, height] x [-depth/2, depth/2], standing on y = 0.
 */
export function createPattiesGeometry(width: number, height: number, depth: number, shape: PattiesShapeFields | null | undefined): THREE.BufferGeometry {
  const safeWidth = Math.max(1, Number.isFinite(width) ? width : DEFAULT_PATTIES_WIDTH);
  const safeDepth = Math.max(1, Number.isFinite(depth) ? depth : DEFAULT_PATTIES_DEPTH);
  const safeHeight = Math.max(PATTIES_MIN_HEIGHT, Number.isFinite(height) ? height : DEFAULT_PATTIES_HEIGHT);
  const settings = pattiesSettingsOfShape(shape);
  return pattiesGeometryFromPlan(pattiesPlanOfShape(shape, safeWidth, safeDepth), settings, safeHeight);
}
