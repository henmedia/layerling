import * as THREE from "three";
import { toCreasedNormals } from "@/lib/creasedNormals";
import type { WorkplaneShape } from "@/types/layerling";
import { roundSideCount } from "@/lib/roundSideCount";

/*
 * Das druckbare Scharnier (print-in-place): zwei Blaetter, die flach
 * aufgeklappt auf der Platte liegen, abwechselnde Knoechel auf der Achse und
 * ein Stift, der mit dem ersten Blatt verwachsen ist und mit Spiel durch die
 * Knoechel des zweiten laeuft. Gedruckt wird es in einem Stueck und bewegt
 * sich danach.
 *
 * Breite ist die Laenge entlang der Achse (x), Tiefe beide Blaetter zusammen
 * (z, Blatt A hinten bei -z, Blatt B vorn bei +z), Hoehe der Durchmesser der
 * Knoechel. Die Blaetter liegen unten (y = 0) mit ihrer Staerke. Knoechel
 * Nummer 0, 2, 4 ... gehoeren zu A, 1, 3 ... zu B; die Zahl ist ungerade, so
 * sitzt A an beiden Enden und haelt den Stift.
 *
 * Damit die Teile nicht verwachsen, hat B um den Stift eine Bohrung mit
 * Spiel, zwischen den Knoecheln bleibt ein Spalt in Spielbreite, und jedes
 * Blatt endet unter den Knoecheln des anderen um das Spiel vor ihnen. Die
 * Blattstaerke ist so begrenzt, dass ein Blatt unter der Bohrung bleibt.
 */

export const DEFAULT_HINGE_WIDTH = 40;
export const DEFAULT_HINGE_DEPTH = 40;
export const DEFAULT_HINGE_HEIGHT = 8;
export const DEFAULT_HINGE_KNUCKLES = 5;
export const DEFAULT_HINGE_PIN_DIAMETER = 3;
export const DEFAULT_HINGE_LEAF_THICKNESS = 2;
export const DEFAULT_HINGE_CLEARANCE = 0.4;
export const MIN_HINGE_KNUCKLES = 3;
export const MAX_HINGE_KNUCKLES = 15;
/** With a knuckle width given the count follows it, up to this many. */
export const MAX_HINGE_KNUCKLES_BY_WIDTH = 31;
export const MIN_HINGE_CLEARANCE = 0.1;
export const MAX_HINGE_CLEARANCE = 1;
export const MAX_HINGE_ANGLE = 180;
const MIN_LEAF = 0.4;
const MIN_KNUCKLE_LENGTH = 1;
/** The cone hinge needs a cone at least this big to hold; knuckles that are too short for it are made fewer. */
const MIN_CONE_RADIUS = 0.8;
/** A wall at least this thick stays in a knuckle between the two recesses. */
const CONE_WALL = 0.4;

export type HingeStyle = "pin" | "pinless" | "cone";

/**
 * The hinge's style (#907): a printed pin through the knuckles (default), a bore for a pin of one's own ("pinless", which
 * `hingePinless` used to switch on and still does for designs that have it), or cones on every other knuckle nesting into the others.
 */
export function normalizeHingeStyle(value?: string, pinless?: boolean): HingeStyle {
  if (value === "cone" || value === "pinless" || value === "pin") return value;
  return pinless === true ? "pinless" : "pin";
}

/** Whether the hinge is made of parts the CAD kernel knows (boxes, cylinders, tubes): the pin hinge is, the cone hinge is a mesh. */
export function hingeHasExactParts(shape: Pick<HingeShapeFields, "hingeStyle" | "hingePinless">) {
  return normalizeHingeStyle(shape.hingeStyle, shape.hingePinless) !== "cone";
}

/** The radial gap that leaves `clearance` between two 45 degree cones measured across the surfaces. */
function coneGap(clearance: number) {
  return clearance * Math.SQRT2;
}

/**
 * The radius of the cone at the root on a knuckle `length` long: the cone is as long as it is wide at the root (45 degrees,
 * which prints without bridges lying flat), it fits the knuckle's round end, and the knuckle that takes two cones keeps a wall.
 */
export function hingeConeRadius(length: number, height: number, clearance: number) {
  const reach = (length - CONE_WALL) / 2 - coneGap(clearance) + clearance;
  // The recess keeps a wall of 0.6 mm round it in the round end of the knuckle.
  const room = height / 2 - 0.6 - (coneGap(clearance) - clearance);
  return Math.max(0, Math.min(room, reach));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function finite(value: number | undefined, fallback: number) {
  return Number.isFinite(value) ? (value as number) : fallback;
}

export function normalizeHingeClearance(value?: number) {
  return clamp(finite(value, DEFAULT_HINGE_CLEARANCE), MIN_HINGE_CLEARANCE, MAX_HINGE_CLEARANCE);
}

/** How far the second leaf is folded up from lying flat, in degrees: 0 is open, 180 is closed. */
export function normalizeHingeAngle(value?: number) {
  return clamp(finite(value, 0), 0, MAX_HINGE_ANGLE);
}

/** An odd count between 3 and 15, fewer when the knuckles would get shorter than 1 mm. */
export function normalizeHingeKnuckles(value: number | undefined, width = DEFAULT_HINGE_WIDTH, clearance = DEFAULT_HINGE_CLEARANCE, max = MAX_HINGE_KNUCKLES) {
  let count = Math.round(finite(value, DEFAULT_HINGE_KNUCKLES));
  if (count % 2 === 0) count += 1;
  count = clamp(count, MIN_HINGE_KNUCKLES, max);
  while (count > MIN_HINGE_KNUCKLES && (width - (count - 1) * clearance) / count < MIN_KNUCKLE_LENGTH) count -= 2;
  return count;
}

/** A knuckle width given in mm: at least 1, or undefined when there is none (0 or less leaves the count to `hingeKnuckles`). */
export function normalizeHingeKnuckleWidth(value?: number) {
  return Number.isFinite(value) && (value as number) > 0 ? Math.max(1, value as number) : undefined;
}

/** The fewest knuckles (odd) that are no wider than `maxWidth`, for a hinge `width` long: what a knuckle width asks for. */
export function hingeKnucklesForWidth(width: number, maxWidth: number, clearance = DEFAULT_HINGE_CLEARANCE) {
  let count = MIN_HINGE_KNUCKLES;
  while (count < MAX_HINGE_KNUCKLES_BY_WIDTH && (width - (count - 1) * clearance) / count > maxWidth) count += 2;
  return normalizeHingeKnuckles(count, width, clearance, MAX_HINGE_KNUCKLES_BY_WIDTH);
}

/** The pin keeps a wall of at least 0.4 mm around its bore in B's knuckles. */
export function normalizeHingePinDiameter(value: number | undefined, height: number, clearance = DEFAULT_HINGE_CLEARANCE) {
  const radius = Math.max(0.5, height / 2);
  const max = Math.max(0.2, 2 * (radius - clearance - MIN_LEAF));
  return clamp(finite(value, Math.min(DEFAULT_HINGE_PIN_DIAMETER, height * 0.4)), Math.min(0.2, max), max);
}

/**
 * A leaf stays below B's bore: no thicker than the knuckle's radius less bore radius. The cone hinge has no bore, so its
 * leaf may be as thick as the whole knuckle: flush with it (#907).
 */
export function normalizeHingeLeafThickness(value: number | undefined, height: number, pinDiameter: number, clearance = DEFAULT_HINGE_CLEARANCE, style: HingeStyle = "pin") {
  const radius = Math.max(0.5, height / 2);
  const max = style === "cone" ? Math.max(0.1, height) : Math.max(0.1, radius - pinDiameter / 2 - clearance);
  return clamp(finite(value, DEFAULT_HINGE_LEAF_THICKNESS), Math.min(MIN_LEAF, max), max);
}

/**
 * How far from the axis a leaf ends beside the other part's knuckle, so that the clearance holds: where its top corner comes
 * closest to the round knuckle, or, for a leaf thicker than the radius, its edge level with the axis.
 */
function leafReach(radius: number, leaf: number, clearance: number) {
  if (leaf > radius) return radius + clearance;
  return Math.sqrt((radius + clearance) * (radius + clearance) - (radius - leaf) * (radius - leaf));
}

/** The depth below which a leaf would not reach past the other part's knuckles. */
export function minimumHingeDepth(height: number, leaf: number, clearance: number) {
  return 2 * (leafReach(height / 2, leaf, clearance) + 0.5);
}

/** The largest cone diameter that fits knuckles `length` long on a hinge `height` high, for the size field. */
export function hingeLargestConeSize(length: number, height: number, clearance: number) {
  return 2 * Math.max(0.3, hingeConeRadius(length, height, clearance));
}

export type HingeShapeFields = Pick<WorkplaneShape, "width" | "height"> & {
  depth?: number;
  hingeKnuckles?: number;
  /** The knuckles are at most this wide and their number follows it. */
  hingeKnuckleWidth?: number;
  hingePinDiameter?: number;
  hingeLeafThickness?: number;
  hingeClearance?: number;
  /** No printed pin: the bore runs through every knuckle, for a pin of one's own. */
  hingePinless?: boolean;
  /** "pin" (default), "pinless" (a bore for a pin of one's own) or "cone": cones on every other knuckle nesting into the others. */
  hingeStyle?: string;
  /** The cone hinge: the diameter of a cone where it grows from its knuckle, in mm; left out, the largest that fits. */
  hingeConeSize?: number;
  /** Part B folded up about the pin's axis, in degrees (0 = lying flat, 180 = closed). */
  hingeAngle?: number;
  sides?: number;
};

/** Everything the body is built from, in the shape's own frame (x along the axis, y up from 0, z across). */
export function hingePlan(shape: HingeShapeFields) {
  const width = Math.max(1, shape.width);
  const height = Math.max(1, shape.height);
  const radius = height / 2;
  const clearance = normalizeHingeClearance(shape.hingeClearance);
  const pinDiameter = normalizeHingePinDiameter(shape.hingePinDiameter, height, clearance);
  const pinRadius = pinDiameter / 2;
  const boreRadius = pinRadius + clearance;
  const style = normalizeHingeStyle(shape.hingeStyle, shape.hingePinless);
  const leaf = normalizeHingeLeafThickness(shape.hingeLeafThickness, height, pinDiameter, clearance, style);
  const knuckleWidth = normalizeHingeKnuckleWidth(shape.hingeKnuckleWidth);
  let knuckles = knuckleWidth ? hingeKnucklesForWidth(width, knuckleWidth, clearance) : normalizeHingeKnuckles(shape.hingeKnuckles, width, clearance);
  const lengthFor = (count: number) => (width - (count - 1) * clearance) / count;
  // Knuckles too short to carry a cone are made fewer, the way ones shorter than 1 mm are.
  if (style === "cone") while (knuckles > MIN_HINGE_KNUCKLES && hingeConeRadius(lengthFor(knuckles), height, clearance) < MIN_CONE_RADIUS) knuckles -= 2;
  const knuckleLength = lengthFor(knuckles);
  const largestCone = Math.max(0.3, hingeConeRadius(knuckleLength, height, clearance));
  const coneRadius = style === "cone"
    ? Number.isFinite(shape.hingeConeSize) && (shape.hingeConeSize as number) > 0 ? clamp((shape.hingeConeSize as number) / 2, 0.3, largestCone) : largestCone
    : 0;
  const gap = coneGap(clearance);
  // The recess takes the cone with the gap all round: its opening where the knuckles meet, and how deep it goes into the knuckle.
  const recessRadius = coneRadius - clearance + gap;
  const recessDepth = coneRadius + gap - clearance;
  // Where the top of a leaf meets the knuckle's outside, and where the other leaf may end.
  const chord = Math.sqrt(Math.max(0, radius * radius - (radius - leaf) * (radius - leaf)));
  // The leaf's top corner is where it comes closest to the round knuckle:
  // the clearance has to hold there, not just level with the leaf.
  const leafStart = leafReach(radius, leaf, clearance);
  // Each leaf keeps at least half a millimetre beyond the other's knuckles.
  const depth = Math.max(minimumHingeDepth(height, leaf, clearance), shape.depth ?? shape.width);
  const segments = Array.from({ length: knuckles }, (_, index) => {
    const x0 = -width / 2 + index * (knuckleLength + clearance);
    return { x0, x1: x0 + knuckleLength, owner: index % 2 === 0 ? "a" as const : "b" as const };
  });
  // A multiple of four puts a corner exactly at the bottom of every circle.
  const sides = Math.max(16, Math.ceil(roundSideCount(shape.sides, height, height) / 4) * 4);
  const pinless = style === "pinless";
  const angle = normalizeHingeAngle(shape.hingeAngle);
  return { width, depth, height, radius, clearance, pinless, angle, style, coneRadius, recessRadius, recessDepth, pinRadius, boreRadius, leaf, knuckles, knuckleLength, chord, leafStart, segments, sides };
}

export type HingePlan = ReturnType<typeof hingePlan>;

type P = { u: number; v: number };

function circle(plan: HingePlan, r: number): P[] {
  return Array.from({ length: plan.sides }, (_, k) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * k) / plan.sides;
    return { u: r * Math.cos(angle), v: plan.radius + r * Math.sin(angle) };
  });
}

/** The knuckle's outside from angle `from` to `to` (radians, increasing), its corners in between. */
function arc(plan: HingePlan, from: number, to: number): P[] {
  const points: P[] = [];
  for (let k = 0; k <= plan.sides * 2; k += 1) {
    const angle = -Math.PI / 2 + (2 * Math.PI * k) / plan.sides;
    if (angle > from + 1e-9 && angle < to - 1e-9) points.push({ u: plan.radius * Math.cos(angle), v: plan.radius + plan.radius * Math.sin(angle) });
  }
  return points;
}

/** The sections every body is made of, counter-clockwise in (u = z, v = y). */
export function hingeSections(plan: HingePlan) {
  const { depth, leaf, chord, leafStart: e } = plan;
  const half = depth / 2;
  const right = Math.asin((leaf - plan.radius) / plan.radius); // where a leaf top meets the knuckle on +z
  const left = Math.PI - right;
  const bottom = { u: 0, v: 0 };
  const arcA = arc(plan, -Math.PI / 2, left);
  const arcB = arc(plan, right, (3 * Math.PI) / 2);
  return {
    // A's knuckle with its leaf, the pin inside it.
    aFull: [{ u: -half, v: 0 }, { u: -e, v: 0 }, bottom, ...arcA, { u: -chord, v: leaf }, { u: -e, v: leaf }, { u: -half, v: leaf }],
    aCap: [{ u: -e, v: 0 }, bottom, ...arcA, { u: -chord, v: leaf }, { u: -e, v: leaf }],
    aLeaf: [{ u: -half, v: 0 }, { u: -e, v: 0 }, { u: -e, v: leaf }, { u: -half, v: leaf }],
    pin: circle(plan, plan.pinRadius),
    coneBase: circle(plan, plan.coneRadius),
    recess: circle(plan, plan.recessRadius),
    bFull: [bottom, { u: e, v: 0 }, { u: half, v: 0 }, { u: half, v: leaf }, { u: e, v: leaf }, { u: chord, v: leaf }, ...arcB],
    bCap: [bottom, { u: e, v: 0 }, { u: e, v: leaf }, { u: chord, v: leaf }, ...arcB],
    bLeaf: [{ u: e, v: 0 }, { u: half, v: 0 }, { u: half, v: leaf }, { u: e, v: leaf }],
    bore: circle(plan, plan.boreRadius),
  };
}

type Vec3 = [number, number, number];

/**
 * The display body: both parts as closed, watertight triangle meshes, built in
 * slices along the axis. Each slice is a section pushed from x0 to x1; where
 * the section changes, the cap between them is the part that ends.
 */
export function hingeTriangles(shape: HingeShapeFields) {
  const plan = hingePlan(shape);
  const s = hingeSections(plan);
  const triangles: Vec3[][] = [];
  const at = (x: number, p: P): Vec3 => [x, p.v, p.u];
  const push = (a: Vec3, b: Vec3, c: Vec3, want: Vec3) => {
    const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const n = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
    triangles.push(n[0] * want[0] + n[1] * want[1] + n[2] * want[2] >= 0 ? [a, b, c] : [a, c, b]);
  };
  const walls = (loop: P[], x0: number, x1: number, inward = false) => {
    loop.forEach((p, i) => {
      const q = loop[(i + 1) % loop.length];
      const du = q.u - p.u;
      const dv = q.v - p.v;
      const sign = inward ? -1 : 1;
      const want: Vec3 = [0, -du * sign, dv * sign];
      push(at(x0, p), at(x1, p), at(x1, q), want);
      push(at(x0, p), at(x1, q), at(x0, q), want);
    });
  };
  // A cone from the ring `r` at `x` to its point at `apexX`: the body's own (solid) or a recess in a knuckle (the other way round).
  const cone = (x: number, r: number, apexX: number, solid: boolean) => {
    const axis = at(apexX, { u: 0, v: plan.radius });
    const toward = Math.sign(apexX - x) * (solid ? 1 : -1);
    const sign = solid ? 1 : -1;
    for (let k = 0; k < plan.sides; k += 1) {
      const a0 = -Math.PI / 2 + (2 * Math.PI * k) / plan.sides;
      const a1 = -Math.PI / 2 + (2 * Math.PI * (k + 1)) / plan.sides;
      const p: P = { u: r * Math.cos(a0), v: plan.radius + r * Math.sin(a0) };
      const q: P = { u: r * Math.cos(a1), v: plan.radius + r * Math.sin(a1) };
      const mid = (a0 + a1) / 2;
      push(at(x, p), at(x, q), axis, [toward, sign * Math.sin(mid), sign * Math.cos(mid)]);
    }
  };
  const cap = (outer: P[], holes: P[][], x: number, direction: 1 | -1) => {
    const contour = outer.map((p) => new THREE.Vector2(p.u, p.v));
    const holeVectors = holes.map((hole) => hole.map((p) => new THREE.Vector2(p.u, p.v)));
    const all = [...outer, ...holes.flat()];
    THREE.ShapeUtils.triangulateShape(contour, holeVectors).forEach(([a, b, c]) => push(at(x, all[a]), at(x, all[b]), at(x, all[c]), [direction, 0, 0]));
  };
  const left = -plan.width / 2;
  const rightEnd = plan.width / 2;

  // Part A: knuckles with the pin, joined by the pin and the leaf in between.
  // Without the pin (a pin of one's own goes in) A's knuckles carry the same bore as B's, end to end.
  // In the cone style there is no pin and no bore: A's knuckles end in a cone towards each neighbour, which nests into B's recess.
  const coned = plan.style === "cone";
  const a = plan.segments.filter((segment) => segment.owner === "a");
  a.forEach((segment, index) => {
    walls(s.aFull, segment.x0, segment.x1);
    if (plan.pinless && !coned) walls(s.bore, segment.x0, segment.x1, true);
    const hole = coned ? s.coneBase : plan.pinless ? s.bore : s.pin;
    const endHoles = plan.pinless && !coned ? [s.bore] : [];
    if (index === 0) cap(s.aFull, endHoles, left, -1);
    else {
      cap(s.aCap, [hole], segment.x0, -1);
      if (coned) cone(segment.x0, plan.coneRadius, segment.x0 - plan.coneRadius, true);
    }
    if (index === a.length - 1) cap(s.aFull, endHoles, rightEnd, 1);
    else {
      cap(s.aCap, [hole], segment.x1, 1);
      if (coned) cone(segment.x1, plan.coneRadius, segment.x1 + plan.coneRadius, true);
      const next = a[index + 1];
      walls(s.aLeaf, segment.x1, next.x0);
      if (!plan.pinless && !coned) walls(s.pin, segment.x1, next.x0);
    }
  });

  // Part B: its leaf runs the whole length, its knuckles carry the bore.
  const firstOfB = triangles.length;
  const b = plan.segments.filter((segment) => segment.owner === "b");
  let x = left;
  cap(s.bLeaf, [], left, -1);
  b.forEach((segment) => {
    walls(s.bLeaf, x, segment.x0);
    walls(s.bFull, segment.x0, segment.x1);
    if (coned) {
      // A blind conical recess in each end face, for the cones of the neighbours.
      cap(s.bCap, [s.recess], segment.x0, -1);
      cone(segment.x0, plan.recessRadius, segment.x0 + plan.recessDepth, false);
      cap(s.bCap, [s.recess], segment.x1, 1);
      cone(segment.x1, plan.recessRadius, segment.x1 - plan.recessDepth, false);
    } else {
      cap(s.bCap, [s.bore], segment.x0, -1);
      walls(s.bore, segment.x0, segment.x1, true);
      cap(s.bCap, [s.bore], segment.x1, 1);
    }
    x = segment.x1;
  });
  walls(s.bLeaf, x, rightEnd);
  cap(s.bLeaf, [], rightEnd, 1);
  if (plan.angle > 0) {
    // B folds up about the axis through the middle of the pin (y = radius, z = 0).
    const turn = (plan.angle * Math.PI) / 180;
    const sin = Math.sin(turn);
    const cos = Math.cos(turn);
    for (let i = firstOfB; i < triangles.length; i += 1) {
      triangles[i] = triangles[i].map(([px, py, pz]): Vec3 => {
        const dy = py - plan.radius;
        return [px, plan.radius + dy * cos + pz * sin, -dy * sin + pz * cos];
      });
    }
  }
  return triangles;
}

/** A closed, watertight hinge from y = 0 to y = height, centred on x and z. */
export function createHingeGeometry(shape: HingeShapeFields): THREE.BufferGeometry {
  const positions: number[] = [];
  hingeTriangles(shape).forEach((triangle) => triangle.forEach((vertex) => positions.push(...vertex)));
  const raw = new THREE.BufferGeometry();
  raw.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const geometry = toCreasedNormals(raw, THREE.MathUtils.degToRad(30));
  raw.dispose();
  geometry.computeBoundingBox();
  return geometry;
}

/**
 * The exact body in parts the CAD kernel already knows - boxes, lying
 * cylinders and lying tubes - in the shape's own frame: x along the axis,
 * `elevation` from the bottom of the shape, before its own turn. Overlapping
 * parts are fused into the two bodies.
 */
export function hingeLocalParts(shape: HingeShapeFields): Array<Pick<WorkplaneShape, "kind" | "x" | "z" | "elevation" | "width" | "depth" | "height" | "rotationX" | "rotationZ" | "bevel">> {
  const plan = hingePlan(shape);
  const { width, depth, radius, leaf, leafStart: e, knuckleLength, pinRadius, boreRadius } = plan;
  const leafDepth = depth / 2 - e;
  // A cylinder or tube lies along x when turned 90 degrees about z; its height is then its length.
  const lying = (x: number, diameter: number, length: number) => ({ x, z: 0, elevation: radius - length / 2, width: diameter, depth: diameter, height: length, rotationZ: 90 });
  const parts: Array<Pick<WorkplaneShape, "kind" | "x" | "z" | "elevation" | "width" | "depth" | "height" | "rotationX" | "rotationZ" | "bevel">> = [
    { kind: "box", x: 0, z: -(depth / 2 + e) / 2, elevation: 0, width, depth: leafDepth, height: leaf },
    { kind: "box", x: 0, z: (depth / 2 + e) / 2, elevation: 0, width, depth: leafDepth, height: leaf },
  ];
  if (!plan.pinless) parts.push({ kind: "cylinder", ...lying(0, pinRadius * 2, width) });
  plan.segments.forEach((segment) => {
    const center = (segment.x0 + segment.x1) / 2;
    if (segment.owner === "a") {
      // A pinless hinge has the same bore through A's knuckles as through B's.
      if (plan.pinless) parts.push({ kind: "tube", ...lying(center, radius * 2, knuckleLength), bevel: radius - boreRadius });
      else parts.push({ kind: "cylinder", ...lying(center, radius * 2, knuckleLength) });
      parts.push({ kind: "box", x: center, z: -e / 2, elevation: 0, width: knuckleLength, depth: e, height: leaf });
    } else {
      parts.push({ kind: "tube", ...lying(center, radius * 2, knuckleLength), bevel: radius - boreRadius });
      parts.push({ kind: "box", x: center, z: e / 2, elevation: 0, width: knuckleLength, depth: e, height: leaf });
    }
  });
  if (plan.angle > 0) {
    // B's boxes fold up about the axis and turn with it; its tubes lie on the axis and only spin in place.
    const turn = (plan.angle * Math.PI) / 180;
    const bBoxes = new Set<(typeof parts)[number]>([parts[1], ...parts.filter((part, index) => index > 1 && part.kind === "box" && (part.z ?? 0) > 0)]);
    bBoxes.forEach((part) => {
      const dy = (part.elevation ?? 0) + part.height / 2 - radius;
      const dz = part.z ?? 0;
      part.elevation = radius + dy * Math.cos(turn) + dz * Math.sin(turn) - part.height / 2;
      part.z = -dy * Math.sin(turn) + dz * Math.cos(turn);
      part.rotationX = -plan.angle;
    });
  }
  return parts;
}
