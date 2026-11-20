import { cubicPoint, curveControls } from "@/lib/sketchPaths";
import type { OrderedSketchPath } from "@/lib/sketchSmoothHandles";
import type { OffsetGeometry } from "@/lib/sketchOffsets";
import type { SketchOffset } from "@/types/layerling";

type Vec = { x: number; z: number };
type Piece = { a: Vec; b: Vec; c: Vec; d: Vec; kind: "line" | "bezier" };
const EPS = 1e-8;
/** Fitting target in sketch millimetres, independent of zoom/display precision. */
export const CURVE_OFFSET_TOLERANCE = 0.01;
const MAX_PIECES = 2048;
const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, z: a.z - b.z });
const cross = (a: Vec, b: Vec) => a.x * b.z - a.z * b.x;
const norm = (v: Vec) => Math.hypot(v.x, v.z);
const mix = (a: Vec, b: Vec, t: number): Vec => ({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
const area = (points: Vec[]) => points.reduce((sum, p, i) => sum + cross(p, points[(i + 1) % points.length]), 0) / 2;
const line = (a: Vec, d: Vec): Piece => ({ a, b: mix(a, d, 1 / 3), c: mix(a, d, 2 / 3), d, kind: "line" });
const at = (p: Piece, t: number): Vec => cubicPoint({ ...p.a, id: "" }, p.b, p.c, { ...p.d, id: "" }, t);
function derivative(p: Piece, t: number): Vec {
  const u = 1 - t;
  return { x: 3 * (u * u * (p.b.x - p.a.x) + 2 * u * t * (p.c.x - p.b.x) + t * t * (p.d.x - p.c.x)),
    z: 3 * (u * u * (p.b.z - p.a.z) + 2 * u * t * (p.c.z - p.b.z) + t * t * (p.d.z - p.c.z)) };
}
function acceleration(p: Piece, t: number): Vec {
  return { x: 6 * ((1 - t) * (p.c.x - 2 * p.b.x + p.a.x) + t * (p.d.x - 2 * p.c.x + p.b.x)),
    z: 6 * ((1 - t) * (p.c.z - 2 * p.b.z + p.a.z) + t * (p.d.z - 2 * p.c.z + p.b.z)) };
}
function split(p: Piece, t: number): [Piece, Piece] {
  const a = mix(p.a, p.b, t), b = mix(p.b, p.c, t), c = mix(p.c, p.d, t);
  const d = mix(a, b, t), e = mix(b, c, t), f = mix(d, e, t);
  return [{ ...p, b: a, c: d, d: f }, { ...p, a: f, b: e, c }];
}
function flattened(pieces: Piece[], tolerance = CURVE_OFFSET_TOLERANCE / 4) {
  const result: Array<Vec & { piece: number; t: number }> = [];
  if (!pieces.length) return result;
  result.push({ ...pieces[0].a, piece: 0, t: 0 });
  const visit = (p: Piece, piece: number, from: number, to: number, depth: number) => {
    const chord = sub(p.d, p.a), length = norm(chord);
    const distance = (v: Vec) => {
      const delta = sub(v, p.a);
      const t = length < EPS ? 0 : Math.max(0, Math.min(1, (delta.x * chord.x + delta.z * chord.z) / length ** 2));
      return norm(sub(v, mix(p.a, p.d, t)));
    };
    if (p.kind === "line" || Math.max(distance(p.b), distance(p.c)) <= tolerance) {
      result.push({ ...p.d, piece, t: to });
      if (result.length > 8192) throw Error("This curve is too complex to offset within the accuracy limit. Simplify the source.");
      return;
    }
    if (depth >= 18) throw Error("This curve cannot be resolved accurately. Simplify its handles or use a smaller offset.");
    const halves = split(p, 0.5), middle = (from + to) / 2;
    visit(halves[0], piece, from, middle, depth + 1);
    visit(halves[1], piece, middle, to, depth + 1);
  };
  pieces.forEach((p, i) => visit(p, i, 0, 1, 0));
  return result;
}
function intersection(a: Vec, b: Vec, c: Vec, d: Vec) {
  const u = sub(b, a), v = sub(d, c), delta = sub(c, a), determinant = cross(u, v);
  if (Math.abs(determinant) < EPS) return null;
  return { t: cross(delta, v) / determinant, s: cross(delta, u) / determinant };
}
export function offsetPathCrosses(points: Vec[], closed: boolean) {
  const count = closed ? points.length : points.length - 1;
  for (let i = 0; i < count; i++) for (let j = i + 2; j < count; j++) {
    if (closed && i === 0 && j === count - 1) continue;
    const a = points[i], b = points[(i + 1) % points.length], c = points[j], d = points[(j + 1) % points.length];
    if (Math.max(a.x, b.x) + EPS < Math.min(c.x, d.x) || Math.max(c.x, d.x) + EPS < Math.min(a.x, b.x) ||
      Math.max(a.z, b.z) + EPS < Math.min(c.z, d.z) || Math.max(c.z, d.z) + EPS < Math.min(a.z, b.z)) continue;
    const hit = intersection(a, b, c, d);
    if (hit ? hit.t >= -EPS && hit.t <= 1 + EPS && hit.s >= -EPS && hit.s <= 1 + EPS
      : Math.abs(cross(sub(c, a), sub(b, a))) < EPS) return true;
  }
  return false;
}
/** Hermite fitting of the true normal offset, subdivided until interior error checks pass. */
function fitted(evaluate: (t: number) => { point: Vec; tangent: Vec }): Piece[] {
  const pieces: Piece[] = [];
  const visit = (from: number, to: number, depth: number) => {
    const start = evaluate(from), end = evaluate(to), h = (to - from) / 3;
    const p: Piece = { a: start.point, b: { x: start.point.x + h * start.tangent.x, z: start.point.z + h * start.tangent.z },
      c: { x: end.point.x - h * end.tangent.x, z: end.point.z - h * end.tangent.z }, d: end.point, kind: "bezier" };
    let error = 0;
    for (let i = 1; i < 8; i++) error = Math.max(error, norm(sub(at(p, i / 8), evaluate(from + (to - from) * i / 8).point)));
    if (to - from > 1 / 2 || error > CURVE_OFFSET_TOLERANCE / 4) {
      if (depth >= 16) throw Error("The curve offset cannot meet the accuracy target. Reduce the distance or simplify its handles.");
      const middle = (from + to) / 2;
      visit(from, middle, depth + 1); visit(middle, to, depth + 1);
    } else pieces.push(p);
    if (pieces.length > MAX_PIECES) throw Error("This curve offset is too complex. Simplify the source or reduce the distance.");
  };
  visit(0, 1, 0);
  return pieces;
}
/** Conservative Bernstein bounds ensure no tangent zero or inward curvature cusp is skipped between fit samples. */
function assertRegular(p: Piece, distance: number, depth = 0): void {
  for (const t of [0, 0.5, 1]) {
    const v = derivative(p, t), speed = norm(v);
    if (speed < EPS) throw Error("A curve tangent vanishes or reverses. Adjust its handles before offsetting.");
    if (1 - distance * cross(v, acceleration(p, t)) / speed ** 3 <= 1e-5) {
      throw Error("This offset forms a cusp or folds the curve. Reduce the distance or change sides.");
    }
  }
  const v = [sub(p.b, p.a), sub(p.c, p.b), sub(p.d, p.c)].map(q => ({ x: q.x * 3, z: q.z * 3 }));
  const a = [sub(v[1], v[0]), sub(v[2], v[1])].map(q => ({ x: q.x * 2, z: q.z * 2 }));
  const minimum = (axis: "x" | "z") => {
    const low = Math.min(...v.map(q => q[axis])), high = Math.max(...v.map(q => q[axis]));
    return low > 0 ? low : high < 0 ? -high : 0;
  };
  const speed = Math.hypot(minimum("x"), minimum("z"));
  const numerator = [0, 0, 0, 0], binomial = [1, 3, 3, 1];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
    numerator[i + j] += cross(v[i], a[j]) * [1, 2, 1][i] / binomial[i + j];
  }
  if (speed > EPS && Math.max(...numerator.map(n => distance * n)) < (1 - 1e-5) * speed ** 3) return;
  if (depth >= 18) throw Error("The curve is too close to a cusp to offset reliably. Reduce the distance or adjust its handles.");
  const halves = split(p, 0.5);
  assertRegular(halves[0], distance, depth + 1); assertRegular(halves[1], distance, depth + 1);
}

function offsetPiece(p: Piece, distance: number): Piece[] {
  if (p.kind === "line") {
    const v = sub(p.d, p.a), length = norm(v);
    if (length < EPS) throw Error("A source edge has zero length. Repair the source before offsetting.");
    const shift = (point: Vec) => ({ x: point.x - v.z / length * distance, z: point.z + v.x / length * distance });
    return [line(shift(p.a), shift(p.d))];
  }
  assertRegular(p, distance);
  return fitted((t) => {
    const point = at(p, t), v = derivative(p, t), speed = norm(v);
    if (speed < EPS) throw Error("A curve tangent vanishes or reverses. Adjust its handles before offsetting.");
    const curvature = cross(v, acceleration(p, t)) / speed ** 3;
    const scale = 1 - distance * curvature;
    if (scale <= 1e-5) throw Error("This offset forms a cusp or folds the curve. Reduce the distance or change sides.");
    return { point: { x: point.x - v.z / speed * distance, z: point.z + v.x / speed * distance },
      tangent: { x: v.x * scale, z: v.z * scale } };
  });
}
/** Trim an inside corner where adjacent fitted paths meet, preserving their curves. */
function trimCorner(before: Piece[], after: Piece[]) {
  const left = flattened(before), right = flattened(after);
  let best: { i: number; j: number; t: number; s: number; score: number } | undefined;
  for (let i = 1; i < left.length; i++) for (let j = 1; j < right.length; j++) {
    const hit = intersection(left[i - 1], left[i], right[j - 1], right[j]);
    if (!hit || hit.t < -EPS || hit.t > 1 + EPS || hit.s < -EPS || hit.s > 1 + EPS) continue;
    const li = left[i].piece, ri = right[j].piece;
    let t = (left[i - 1].piece === li ? left[i - 1].t : 0) * (1 - hit.t) + left[i].t * hit.t;
    let s = (right[j - 1].piece === ri ? right[j - 1].t : 0) * (1 - hit.s) + right[j].t * hit.s;
    for (let iteration = 0; iteration < 10; iteration++) {
      const delta = sub(at(after[ri], s), at(before[li], t)), u = derivative(before[li], t), v = derivative(after[ri], s), det = cross(u, v);
      if (Math.abs(det) < EPS) break;
      t += cross(delta, v) / det; s += cross(delta, u) / det;
    }
    if (t < -EPS || t > 1 + EPS || s < -EPS || s > 1 + EPS || norm(sub(at(before[li], t), at(after[ri], s))) > CURVE_OFFSET_TOLERANCE / 4) continue;
    const score = before.length - li - t + ri + s;
    if (!best || score < best.score) best = { i: li, j: ri, t: Math.max(0, Math.min(1, t)), s: Math.max(0, Math.min(1, s)), score };
  }
  if (!best) throw Error("The offset cannot join this inside curve corner without folding. Reduce the distance or smooth the source corner.");
  const end = split(before[best.i], best.t)[0], start = split(after[best.j], best.s)[1];
  const shared = mix(end.d, start.a, 0.5);
  end.c = { x: end.c.x + shared.x - end.d.x, z: end.c.z + shared.z - end.d.z }; end.d = shared;
  start.b = { x: start.b.x + shared.x - start.a.x, z: start.b.z + shared.z - start.a.z }; start.a = shared;
  before.splice(best.i, before.length, ...(norm(sub(end.d, end.a)) > EPS ? [end] : []));
  after.splice(0, best.j + 1, ...(norm(sub(start.d, start.a)) > EPS ? [start] : []));
  if (!before.length || !after.length) throw Error("The offset collapses a source edge. Reduce the distance.");
}
export function curveOffsetGeometry(path: OrderedSketchPath, distance: number, join: SketchOffset["join"], miterLimit: number): OffsetGeometry {
  const source: Piece[] = path.steps.map((step) => {
    const controls = curveControls(step);
    return (step.segment.kind ?? "line") === "line" || !controls.first || !controls.second ? line(step.from, step.to)
      : { a: step.from, b: controls.first, c: controls.second, d: step.to, kind: "bezier" };
  });
  const samples = flattened(source);
  if (path.closed) samples.pop();
  if (offsetPathCrosses(samples, path.closed)) throw Error("The source curve intersects itself. Repair it before offsetting.");
  const signedArea = path.closed ? area(samples) : 0;
  if (path.closed && Math.abs(signedArea) < EPS) throw Error("The source profile has no usable area.");
  const d = path.closed ? -Math.sign(signedArea) * distance : distance;
  const groups = source.map((piece) => offsetPiece(piece, d));
  const joins: Piece[][] = source.map(() => []);
  for (let i = 0; i < (path.closed ? source.length : source.length - 1); i++) {
    const j = (i + 1) % source.length, before = groups[i], after = groups[j];
    const a = before.at(-1)!.d, b = after[0].a;
    if (norm(sub(a, b)) < EPS) continue;
    const u = derivative(source[i], 1), v = derivative(source[j], 0), turn = cross(u, v) / (norm(u) * norm(v));
    if (Math.abs(turn) < EPS) throw Error("A reversing curve corner cannot be offset. Smooth the source corner.");
    if (turn * d > 0) { trimCorner(before, after); continue; }
    if (join === "bevel") { joins[i] = [line(a, b)]; continue; }
    const center = source[i].d;
    if (join === "miter") {
      const hit = intersection(a, { x: a.x + u.x, z: a.z + u.z }, b, { x: b.x + v.x, z: b.z + v.z });
      if (!hit) throw Error("This curve corner cannot be joined. Try round or bevel joins.");
      const corner = { x: a.x + u.x * hit.t, z: a.z + u.z * hit.t };
      if (norm(sub(corner, center)) > Math.abs(d) * miterLimit + EPS) throw Error("A corner exceeds the miter limit. Increase the limit or choose bevel/round joins.");
      joins[i] = [line(a, corner), line(corner, b)];
    } else {
      const start = Math.atan2(a.z - center.z, a.x - center.x), delta = sub(a, center), finish = sub(b, center);
      const sweep = Math.atan2(cross(delta, finish), delta.x * finish.x + delta.z * finish.z), radius = Math.abs(d);
      joins[i] = fitted((t) => {
        const angle = start + sweep * t;
        return { point: { x: center.x + radius * Math.cos(angle), z: center.z + radius * Math.sin(angle) },
          tangent: { x: -radius * sweep * Math.sin(angle), z: radius * sweep * Math.cos(angle) } };
      });
    }
  }
  const pieces = groups.flatMap((group, i) => [...group, ...joins[i]]).filter((p) => norm(sub(p.d, p.a)) > EPS);
  if (pieces.length > MAX_PIECES) throw Error("This curve offset is too complex. Simplify the source.");
  const outline = flattened(pieces);
  if (path.closed) outline.pop();
  if (offsetPathCrosses(outline, path.closed)) throw Error("The offset curve intersects itself. Reduce the distance or change sides.");
  if (path.closed && area(outline) * signedArea <= EPS) throw Error("This inset collapses the profile. Reduce the distance.");
  const points: OffsetGeometry["points"] = pieces.map((piece, i) => {
    const previous = i > 0 ? pieces[i - 1] : path.closed ? pieces.at(-1) : undefined;
    return { ...piece.a, ...(piece.kind === "bezier" ? { handleOut: piece.b } : {}),
      ...(previous?.kind === "bezier" ? { handleIn: previous.c } : {}) };
  });
  if (!path.closed) points.push({ ...pieces.at(-1)!.d, ...(pieces.at(-1)!.kind === "bezier" ? { handleIn: pieces.at(-1)!.c } : {}) });
  return { points, closed: path.closed, kinds: pieces.map((piece) => piece.kind), approximate: true };
}
