import type { CadModifierProfileLoop, CadModifierProfileSegment } from "@/lib/cadModifierTypes";
import type { FlatSpringEnds, ThreadHand } from "@/types/layerling";

/*
 * The spiral spring (Discussion #412), as in a clock: a band wound flat on
 * the plate. Its centre line is made of half circles round two centres half
 * a pitch apart, each half a pitch larger than the one before, so every
 * winding keeps the same distance to the next and the line has no kink. Its
 * outline is that line offset by half the band each way: straight pieces and
 * circular arcs only, so the exact body gets it as it is.
 *
 * Inside, the spring ends in the open (`none`), in a ring round the middle
 * for an axle (`eye`) or in a bar through the middle (`tab`); the band goes
 * there in one more half circle of half the size. Outside it runs straight
 * on, clear of the winding before it, into the same end.
 */

export const DEFAULT_SPIRAL_SPRING_TURNS = 5;
export const DEFAULT_SPIRAL_SPRING_WIRE = 1.2;
export const DEFAULT_SPIRAL_SPRING_INNER = 8;
export const SPIRAL_SPRING_DIAMETER = 50;
export const SPIRAL_SPRING_HEIGHT = 5;
export const MIN_SPIRAL_SPRING_WIRE = 0.4;
export const MAX_SPIRAL_SPRING_TURNS = 40;

/** Neighbouring windings keep at least a quarter of their pitch free, as the waves of a flat spring do. */
const MIN_PITCH_PER_WIRE = 4 / 3;
/** The ring's outer radius and the bar's half length, in bands. */
const EYE = 1.75;
const TAB = 1.5;

type Point = { x: number; z: number };

export type SpiralSpringFields = {
  springTurns?: number;
  springWire?: number;
  springInner?: number;
  springEnds?: FlatSpringEnds;
  springHand?: ThreadHand;
};

function finite(value: number | undefined, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function endsOf(value: string | undefined): FlatSpringEnds {
  return value === "tab" || value === "none" ? value : "eye";
}

/** The smallest free inside: with an end in the middle it needs the room of that end and a gap round it. */
function smallestInner(wire: number, ends: FlatSpringEnds) {
  return ends === "none" ? Math.max(1, wire) : 4.4 * wire;
}

function arcSegment(cx: number, cz: number, r: number, start: number, end: number): CadModifierProfileSegment {
  return { kind: "arc", x: cx + r * Math.cos(end), z: cz + r * Math.sin(end), cx, cz, rx: r, rz: r, start, end };
}

function lineTo(x: number, z: number): CadModifierProfileSegment {
  return { kind: "line", x, z };
}

/** The outline at the true size, winding outwards from x = the first radius, its angle growing from x to z. */
function outline(wire: number, inner: number, turns: number, pitch: number, ends: FlatSpringEnds): CadModifierProfileLoop[] {
  const half = wire / 2;
  const step = pitch / 2;
  const first = inner / 2 + half;
  const count = turns * 2;
  const centre = (index: number) => (index % 2 ? step : 0);
  const radius = (index: number) => first + index * step;
  const endX = step + radius(count - 1);
  // The winding the outer end runs past, with a gap as wide as half the one between windings.
  const clear = radius(count - 2) + half + (pitch - wire) / 2;
  const hub = first / 2;
  const eye = EYE * wire;
  const tab = TAB * wire;

  // Where the half circle into the middle, `r` round (hub, 0), comes out of the ring round the middle.
  const leaveEye = (r: number): Point => {
    const x = (eye * eye - r * r + hub * hub) / (2 * hub);
    return { x, z: -Math.sqrt(Math.max(0, eye * eye - x * x)) };
  };
  const hubAngle = (point: Point) => {
    const angle = Math.atan2(point.z, point.x - hub);
    return angle < 0 ? angle + 2 * Math.PI : angle;
  };
  const innerLeft = ends === "eye" ? leaveEye(hub - half) : { x: ends === "tab" ? half : first - half, z: 0 };
  const innerRight = ends === "eye" ? leaveEye(hub + half) : { x: -half, z: 0 };
  const eyeZ = Math.max(eye + wire, Math.sqrt(Math.max(0, (clear + eye) ** 2 - endX * endX)));
  const tabZ = Math.max(2 * wire, Math.sqrt(Math.max(0, clear * clear - (endX - tab) ** 2)));

  const segments: CadModifierProfileSegment[] = [];
  // The side towards the middle, from the inside out.
  if (ends === "eye") segments.push(arcSegment(hub, 0, hub - half, hubAngle(innerLeft), 2 * Math.PI));
  if (ends === "tab") segments.push(arcSegment(hub, 0, hub - half, Math.PI, 2 * Math.PI));
  for (let index = 0; index < count; index += 1) segments.push(arcSegment(centre(index), 0, radius(index) - half, index * Math.PI, (index + 1) * Math.PI));
  // The outer end.
  const left = endX - half;
  const right = endX + half;
  if (ends === "eye") {
    const angle = Math.asin(half / eye);
    segments.push(lineTo(left, eyeZ - Math.sqrt(eye * eye - half * half)));
    segments.push(arcSegment(endX, eyeZ, eye, -Math.PI / 2 - angle, -5 * Math.PI / 2 + angle));
  } else if (ends === "tab") {
    segments.push(lineTo(left, tabZ), lineTo(endX - tab, tabZ), lineTo(endX - tab, tabZ + wire), lineTo(endX + tab, tabZ + wire), lineTo(endX + tab, tabZ), lineTo(right, tabZ));
  }
  segments.push(lineTo(right, 0));
  // The side away from the middle, back in.
  for (let index = count - 1; index >= 0; index -= 1) segments.push(arcSegment(centre(index), 0, radius(index) + half, (index + 1) * Math.PI, index * Math.PI));
  // The inner end.
  if (ends === "eye") {
    segments.push(arcSegment(hub, 0, hub + half, 2 * Math.PI, hubAngle(innerRight)));
    const from = Math.atan2(innerRight.z, innerRight.x);
    let to = Math.atan2(innerLeft.z, innerLeft.x);
    while (to > from) to -= 2 * Math.PI;
    segments.push(arcSegment(0, 0, eye, from, to));
  } else if (ends === "tab") {
    segments.push(arcSegment(hub, 0, hub + half, 2 * Math.PI, Math.PI));
    segments.push(lineTo(-tab, 0), lineTo(-tab, wire), lineTo(tab, wire), lineTo(tab, 0), lineTo(half, 0));
  } else {
    segments.push(lineTo(innerLeft.x, 0));
  }
  const loops: CadModifierProfileLoop[] = [{ x: innerLeft.x, z: innerLeft.z, segments }];
  if (ends === "eye") {
    const ring = eye - wire;
    [{ x: 0, z: 0 }, { x: endX, z: eyeZ }].forEach((at) => loops.push({
      x: at.x + ring,
      z: at.z,
      segments: [arcSegment(at.x, at.z, ring, 0, Math.PI), arcSegment(at.x, at.z, ring, Math.PI, 2 * Math.PI)],
    }));
  }
  return loops;
}

/** The loop's true extent: every corner, and each arc's outermost points. */
function extent(loop: CadModifierProfileLoop) {
  const box = { minX: loop.x, maxX: loop.x, minZ: loop.z, maxZ: loop.z };
  const add = (x: number, z: number) => {
    box.minX = Math.min(box.minX, x);
    box.maxX = Math.max(box.maxX, x);
    box.minZ = Math.min(box.minZ, z);
    box.maxZ = Math.max(box.maxZ, z);
  };
  loop.segments.forEach((segment) => {
    add(segment.x, segment.z);
    if (segment.kind !== "arc") return;
    const low = Math.min(segment.start, segment.end);
    const high = Math.max(segment.start, segment.end);
    for (let quarter = Math.ceil(low / (Math.PI / 2)); quarter * (Math.PI / 2) <= high; quarter += 1) {
      const angle = quarter * (Math.PI / 2);
      add(segment.cx + segment.rx * Math.cos(angle), segment.cz + segment.rz * Math.sin(angle));
    }
  });
  return box;
}

function naturalWidth(wire: number, inner: number, turns: number, pitch: number, ends: FlatSpringEnds) {
  const box = extent(outline(wire, inner, turns, pitch, ends)[0]);
  return box.maxX - box.minX;
}

function fits(width: number, wire: number, inner: number, turns: number, ends: FlatSpringEnds) {
  return naturalWidth(wire, inner, turns, wire * MIN_PITCH_PER_WIRE, ends) <= width + 1e-9;
}

/** The largest value from `low` up to `high` that still passes, rounded down to a hundredth. */
function largest(low: number, high: number, passes: (value: number) => boolean) {
  if (high <= low || !passes(low)) return low;
  if (passes(high)) return high;
  let good = low;
  let bad = high;
  for (let pass = 0; pass < 40; pass += 1) {
    const middle = (good + bad) / 2;
    if (passes(middle)) good = middle;
    else bad = middle;
  }
  return Math.max(low, Math.floor(good * 100) / 100);
}

/** The band that fits with one winding round the smallest inside. */
export function spiralSpringWireLimits(width: number, ends?: FlatSpringEnds) {
  const end = endsOf(ends);
  return { min: MIN_SPIRAL_SPRING_WIRE, max: largest(MIN_SPIRAL_SPRING_WIRE, width / 4, (wire) => fits(width, wire, smallestInner(wire, end), 1, end)) };
}

/** As many windings as fit round the smallest inside. */
export function spiralSpringTurnLimits(width: number, wire: number, ends?: FlatSpringEnds) {
  const end = endsOf(ends);
  let max = 1;
  while (max < MAX_SPIRAL_SPRING_TURNS && fits(width, wire, smallestInner(wire, end), max + 1, end)) max += 1;
  return { min: 1, max };
}

export function spiralSpringInnerLimits(width: number, wire: number, turns: number, ends?: FlatSpringEnds) {
  const end = endsOf(ends);
  const min = smallestInner(wire, end);
  return { min, max: largest(min, width, (inner) => fits(width, wire, inner, turns, end)) };
}

export function spiralSpringSettings(shape: SpiralSpringFields, width: number) {
  const ends = endsOf(shape.springEnds);
  const within = (value: number, limits: { min: number; max: number }) => Math.min(limits.max, Math.max(limits.min, value));
  const wire = within(finite(shape.springWire, DEFAULT_SPIRAL_SPRING_WIRE), spiralSpringWireLimits(width, ends));
  const turns = within(Math.round(finite(shape.springTurns, DEFAULT_SPIRAL_SPRING_TURNS)), spiralSpringTurnLimits(width, wire, ends));
  const inner = within(finite(shape.springInner, DEFAULT_SPIRAL_SPRING_INNER), spiralSpringInnerLimits(width, wire, turns, ends));
  const hand: ThreadHand = shape.springHand === "left" ? "left" : "right";
  return { ends, wire, turns, inner, hand };
}

/** The pitch that makes the spring exactly `width` wide. */
function pitchFor(width: number, wire: number, inner: number, turns: number, ends: FlatSpringEnds) {
  let low = wire * MIN_PITCH_PER_WIRE;
  let high = Math.max(low, width / turns);
  for (let pass = 0; pass < 60; pass += 1) {
    const middle = (low + high) / 2;
    if (naturalWidth(wire, inner, turns, middle, ends) <= width) low = middle;
    else high = middle;
  }
  return low;
}

/** The free gap between two windings. */
export function spiralSpringGap(shape: SpiralSpringFields, width: number) {
  const { wire, inner, turns, ends } = spiralSpringSettings(shape, width);
  return pitchFor(width, wire, inner, turns, ends) - wire;
}

/** How deep the spring is at this width when nothing is stretched. */
export function spiralSpringDepth(shape: SpiralSpringFields, width: number) {
  const { wire, inner, turns, ends } = spiralSpringSettings(shape, width);
  const box = extent(outline(wire, inner, turns, pitchFor(width, wire, inner, turns, ends), ends)[0]);
  return Math.round((box.maxZ - box.minZ) * 1000) / 1000;
}

/** The box a spiral spring starts in, as deep as it naturally is. */
export function spiralSpringDimensions(shape: SpiralSpringFields = {}) {
  return { width: SPIRAL_SPRING_DIAMETER, depth: spiralSpringDepth(shape, SPIRAL_SPRING_DIAMETER), height: SPIRAL_SPRING_HEIGHT };
}

/** The band's outline (and the rings' holes) in the plate's x/z plane, filling the box exactly. */
export function spiralSpringProfileLoops(options: SpiralSpringFields & { width: number; depth: number }): CadModifierProfileLoop[] {
  const width = Math.max(0.2, options.width);
  const depth = Math.max(0.2, options.depth);
  const { wire, inner, turns, ends, hand } = spiralSpringSettings(options, width);
  const loops = outline(wire, inner, turns, pitchFor(width, wire, inner, turns, ends), ends);
  const box = extent(loops[0]);
  const scaleX = width / (box.maxX - box.minX);
  const scaleZ = depth / (box.maxZ - box.minZ);
  const midX = (box.minX + box.maxX) / 2;
  const midZ = (box.minZ + box.maxZ) / 2;
  // Seen from above z runs down, so the outline as built winds outwards clockwise: the right hand. Left mirrors it.
  const flip = hand === "left" ? -1 : 1;
  const x = (value: number) => (value - midX) * scaleX;
  const z = (value: number) => (value - midZ) * scaleZ * flip;
  return loops.map((loop) => ({
    x: x(loop.x),
    z: z(loop.z),
    segments: loop.segments.map((segment): CadModifierProfileSegment => segment.kind === "arc"
      ? { ...segment, x: x(segment.x), z: z(segment.z), cx: x(segment.cx), cz: z(segment.cz), rx: segment.rx * scaleX, rz: segment.rz * scaleZ, start: segment.start * flip, end: segment.end * flip }
      : segment.kind === "line" ? { ...segment, x: x(segment.x), z: z(segment.z) } : segment),
  }));
}
