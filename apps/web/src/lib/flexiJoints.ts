import type { ManifoldToplevel, Mat4 } from "manifold-3d";
import { shapeToManifoldSolid, disposeManifold } from "@/lib/editorBooleans";
import { getManifoldRuntime, type ManifoldSolid } from "@/lib/editorMeshCore";
import { numberLocale, t } from "@/lib/i18n";
import { createLocalId } from "@/lib/localIds";
import { splitShapeFromWorldPositions } from "@/lib/modelSplit";
import { canonicalizeShape, isNonSolidShape } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

/**
 * Flexi joints: a body lying flat on the plate is cut across its length into links, and every cut gets a joint printed
 * in place, so the links swing to the sides once printed (Liane's mail, 29.10.2026). One link carries a knuckle, an
 * upright column that is wider in the middle than at its ends (cones of 45 degrees, which print without support), on a
 * neck; the next one holds it in a socket round it with the clearance all round, open towards the neck, so the knuckle
 * can neither be pulled out to the side nor slide out upwards. The cut between the links is a V that opens outwards by
 * the swing angle, so the links can turn that far either way before they touch.
 *
 * Everything is worked out in the joint frame: u along the axis the body is cut across, v to the side, w up. The links
 * are meshes, made with Manifold as the split is.
 */

/** The axis of the scene the links follow: x, or z (the depth, shown as Y). */
export type FlexiAxis = "x" | "z";

/**
 * How many joints (left out: as many as the body's length and width suggest), the clearance and the swing to either side,
 * in mm and degrees; the knuckle's diameter at its widest (left out: the largest that fits, up to 12 mm); how far the
 * first joint lies from the body's start and the last from its end along the axis, in mm (left out: the links are as long
 * as one another).
 */
export type FlexiOptions = {
  axis?: FlexiAxis;
  joints?: number;
  clearance: number;
  swing: number;
  size?: number;
  start?: number;
  end?: number;
};

export const FLEXI_DEFAULTS: FlexiOptions = { clearance: 0.4, swing: 30 };
export const MIN_FLEXI_CLEARANCE = 0.1;
export const MAX_FLEXI_CLEARANCE = 1;
export const MIN_FLEXI_SWING = 5;
export const MAX_FLEXI_SWING = 60;
export const MAX_FLEXI_JOINTS = 30;
/** The knuckle's radius at its widest, in mm: smaller ones break, larger ones the automatic size does not make. */
const MIN_KNUCKLE = 2;
const AUTO_KNUCKLE = 6;
const MAX_KNUCKLE = 15;
/** The flat foot and top of the knuckle below and above its cones, in mm. */
const KNUCKLE_FOOT = 0.4;
/** The bulge of the knuckle must be at least this much to hold it in its socket, in mm. */
const MIN_BULGE = 0.6;
/** Half the neck's width at least, in mm. */
const MIN_NECK = 0.6;
/** How much of the knuckle's wall stays round it beyond the socket, in mm (and a tenth of the knuckle's radius more). */
const RING_WALL = 1.2;

function finiteNumber(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** The options with a missing, mistyped or out-of-range value replaced by the nearest allowed one. */
export function normalizeFlexiOptions(value?: Partial<Record<keyof FlexiOptions, unknown>> | null): FlexiOptions {
  const result: FlexiOptions = { ...FLEXI_DEFAULTS };
  const axis = typeof value?.axis === "string" ? value.axis.trim().toLowerCase() : "";
  // The panel and the AI name the depth Y, as the Position card does.
  if (axis === "x") result.axis = "x";
  else if (axis === "y" || axis === "z") result.axis = "z";
  const joints = finiteNumber(value?.joints);
  if (joints !== null && joints >= 1) result.joints = clamp(Math.round(joints), 1, MAX_FLEXI_JOINTS);
  const clearance = finiteNumber(value?.clearance);
  if (clearance !== null) result.clearance = clamp(clearance, MIN_FLEXI_CLEARANCE, MAX_FLEXI_CLEARANCE);
  const swing = finiteNumber(value?.swing);
  if (swing !== null) result.swing = clamp(swing, MIN_FLEXI_SWING, MAX_FLEXI_SWING);
  const size = finiteNumber(value?.size);
  if (size !== null && size > 0) result.size = clamp(size, 2 * MIN_KNUCKLE, 2 * MAX_KNUCKLE);
  const start = finiteNumber(value?.start);
  if (start !== null && start > 0) result.start = start;
  const end = finiteNumber(value?.end);
  if (end !== null && end > 0) result.end = end;
  return result;
}

/** The radial gap between two 45 degree cones that leaves `clearance` measured across their surfaces. */
function coneGap(clearance: number) {
  return clearance * Math.SQRT2;
}

function ringWall(knuckle: number) {
  return RING_WALL + 0.1 * knuckle;
}

/** The outer radius of the socket's ring round a knuckle `knuckle` wide at its widest. */
export function flexiRingRadius(knuckle: number, clearance: number) {
  return knuckle + coneGap(clearance) + ringWall(knuckle);
}

/** The largest knuckle radius whose ring fits in `halfWidth` to either side of the axis. */
export function flexiKnuckleForHalfWidth(halfWidth: number, clearance: number) {
  return (halfWidth - 0.3 - coneGap(clearance) - RING_WALL) / 1.1;
}

/** One joint as it is built. */
export type FlexiJointPlan = {
  /** Where along the axis (u) and to the side (v) the knuckle stands, and from where to where the body reaches there (w). */
  u: number;
  v: number;
  bottom: number;
  top: number;
  /** The knuckle's radius at its widest and at its foot and top, and how high each of its cones is. */
  knuckle: number;
  foot: number;
  bulge: number;
  ring: number;
  /** Half the neck's width, how far the socket is open to either side (radians), and the swing (radians). */
  neck: number;
  opening: number;
  swing: number;
};

/** The heights of a knuckle `knuckle` wide in a body `height` high: how high each cone is, and its radius at foot and top. */
export function flexiKnuckleProfile(knuckle: number, height: number) {
  const bulge = Math.min(0.45 * knuckle, (height - 2 * KNUCKLE_FOOT) / 2);
  return { bulge, foot: knuckle - bulge };
}

/**
 * How far the socket opens round a knuckle and how wide the neck can be for the swing asked: the socket still holds the
 * knuckle where it is widest, and the neck turned as far as the swing still clears the opening where the socket is
 * narrowest, round the knuckle's foot and top. Null when no neck fits.
 */
export function flexiNeck(knuckle: number, foot: number, clearance: number, swingDegrees: number) {
  const socket = knuckle + coneGap(clearance);
  const narrowest = foot + coneGap(clearance);
  const grip = Math.max(0.5, 0.15 * knuckle);
  const opening = Math.asin(Math.min(0.95, (knuckle - grip) / socket));
  const widest = opening - Math.asin(Math.min(1, (MIN_NECK + clearance) / narrowest));
  const swing = Math.min((swingDegrees * Math.PI) / 180, widest);
  if (swing < (MIN_FLEXI_SWING * Math.PI) / 180) return null;
  const neck = Math.min(narrowest * Math.sin(opening - swing) - clearance, 0.9 * foot);
  return { opening, swing, neck: Math.max(MIN_NECK, neck) };
}

/** Where the joints lie along the axis, the body reaching from `min` to `max` there. */
export function flexiJointPositions(min: number, max: number, count: number, start?: number, end?: number) {
  const length = max - min;
  if (count === 1) {
    if (start !== undefined) return [min + start];
    if (end !== undefined) return [max - end];
    return [min + length / 2];
  }
  const first = start !== undefined ? min + start : min + length / (count + 1);
  const last = end !== undefined ? max - end : max - length / (count + 1);
  return Array.from({ length: count }, (_, index) => first + ((last - first) * index) / (count - 1));
}

/** How far apart two neighbouring joints must be, so that neither one's socket nor knuckle reaches into the other's cut. */
export function flexiMinimumSpacing(previous: FlexiJointPlan, next: FlexiJointPlan, clearance: number) {
  const lean = Math.tan(Math.max(previous.swing, next.swing) / 2);
  const side = Math.abs(next.v - previous.v);
  return Math.max(
    previous.ring + next.ring + 2 * clearance + 0.5,
    next.ring + 2 * clearance + 0.5 + (side + next.ring) * lean,
    previous.ring + 2 * clearance + 0.5 + (side + previous.ring) * lean,
  );
}

export type FlexiError =
  | { code: "notClosed" | "tooShort" | "kernel"; message?: string }
  | { code: "tooThin" | "tooFlat" | "tooClose" | "empty"; joint: number; value?: number };

type Frame = { along: [number, number, number]; side: [number, number, number] };

/**
 * The joint frame, right-handed so nothing is mirrored: along the axis, to the side, and up (the scene's y). Along x the
 * side is -z, along z it is x.
 */
function frameFor(axis: FlexiAxis): Frame {
  return axis === "x" ? { along: [1, 0, 0], side: [0, 0, -1] } : { along: [0, 0, 1], side: [1, 0, 0] };
}

/** World to joint frame: the frame's axes as rows (column-major). */
function toFrame({ along, side }: Frame): Mat4 {
  return [along[0], side[0], 0, 0, along[1], side[1], 1, 0, along[2], side[2], 0, 0, 0, 0, 0, 1];
}

/** Joint frame to world: the frame's axes as columns. */
function toWorld({ along, side }: Frame): Mat4 {
  return [along[0], along[1], along[2], 0, side[0], side[1], side[2], 0, 0, 1, 0, 0, 0, 0, 0, 1];
}

/** (u, v, w) to (v, w, u): the axis up, so `slice` cuts across it. */
const ALONG_UP: Mat4 = [0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1];

type Rect = { min: readonly [number, number] | number[]; max: readonly [number, number] | number[] };

/**
 * Where a joint goes in the body's cross-section at `u` (in v and w): in its largest piece, at the middle of the width
 * that piece has halfway up, and from its foot to its top there. Null where the plane misses the body.
 */
function jointSite(runtime: ManifoldToplevel, alongUp: ManifoldSolid, u: number, created: { delete?: () => void }[]) {
  const section = alongUp.slice(u);
  created.push(section);
  const pieces = section.decompose();
  created.push(...pieces);
  const piece = pieces.reduce<(typeof pieces)[number] | null>((best, candidate) => (!best || candidate.area() > best.area() ? candidate : best), null);
  if (!piece || piece.area() <= 1e-6) return null;
  const bounds = piece.bounds() as Rect;
  const rect = (x0: number, y0: number, x1: number, y1: number) => runtime.CrossSection.ofPolygons([[[x0, y0], [x1, y0], [x1, y1], [x0, y1]]]);
  const middle = (bounds.min[1] + bounds.max[1]) / 2;
  const band = rect(bounds.min[0] - 1, middle - 0.05, bounds.max[0] + 1, middle + 0.05);
  const across = piece.intersect(band);
  const spans = across.decompose();
  created.push(band, across, ...spans);
  const widest = spans.reduce<{ from: number; to: number } | null>((best, span) => {
    const box = span.bounds() as Rect;
    return !best || box.max[0] - box.min[0] > best.to - best.from ? { from: box.min[0], to: box.max[0] } : best;
  }, null);
  if (!widest) return null;
  const v = (widest.from + widest.to) / 2;
  const post = rect(v - 0.05, bounds.min[1] - 1, v + 0.05, bounds.max[1] + 1);
  const upright = piece.intersect(post);
  created.push(post, upright);
  const column = upright.bounds() as Rect;
  if (!(column.max[1] > column.min[1])) return null;
  return { v, halfWidth: (widest.to - widest.from) / 2, bottom: column.min[1], top: column.max[1] };
}

/**
 * The joints for a body in the joint frame, sized to its cross-section at each cut and checked that the socket's ring
 * lies in the body there; or why they do not fit (joints counted from 1).
 */
function planJoints(runtime: ManifoldToplevel, body: ManifoldSolid, positions: readonly number[], options: FlexiOptions, created: { delete?: () => void }[]): FlexiJointPlan[] | FlexiError {
  const alongUp = body.transform(ALONG_UP);
  created.push(alongUp);
  const plans: FlexiJointPlan[] = [];
  for (const [index, u] of positions.entries()) {
    const site = jointSite(runtime, alongUp, u, created);
    if (!site) return { code: "tooThin", joint: index + 1, value: 0 };
    const height = site.top - site.bottom;
    const fits = flexiKnuckleForHalfWidth(site.halfWidth, options.clearance);
    let knuckle = Math.min(options.size !== undefined ? options.size / 2 : AUTO_KNUCKLE, fits);
    if (knuckle < MIN_KNUCKLE) return { code: "tooThin", joint: index + 1, value: 2 * site.halfWidth };
    let plan: FlexiJointPlan | null = null;
    while (knuckle >= MIN_KNUCKLE) {
      const { bulge, foot } = flexiKnuckleProfile(knuckle, height);
      if (bulge < MIN_BULGE) return { code: "tooFlat", joint: index + 1, value: height };
      const ring = flexiRingRadius(knuckle, options.clearance);
      // The ring round the socket must lie in the body all round, or the socket breaks open at the side.
      const disc = runtime.CrossSection.circle(ring, 48);
      const probe = disc.extrude(height - 2 * KNUCKLE_FOOT).translate([u, site.v, site.bottom + KNUCKLE_FOOT]);
      const inside = body.intersect(probe);
      created.push(disc, probe, inside);
      const neck = flexiNeck(knuckle, foot, options.clearance, options.swing);
      if (inside.volume() >= 0.97 * probe.volume() && neck) {
        plan = { u, v: site.v, bottom: site.bottom, top: site.top, knuckle, foot, bulge, ring, neck: neck.neck, opening: neck.opening, swing: neck.swing };
        break;
      }
      knuckle *= 0.85;
    }
    if (!plan) return { code: "tooThin", joint: index + 1, value: 2 * site.halfWidth };
    const previous = plans[plans.length - 1];
    if (previous && plan.u - previous.u < flexiMinimumSpacing(previous, plan, options.clearance)) {
      return { code: "tooClose", joint: index + 1, value: flexiMinimumSpacing(previous, plan, options.clearance) };
    }
    plans.push(plan);
  }
  return plans;
}

/** A polygon in the (u, v) plane stood up from `low` to `high`. */
function prism(runtime: ManifoldToplevel, polygon: [number, number][], low: number, high: number, created: { delete?: () => void }[]) {
  const section = runtime.CrossSection.ofPolygons([polygon]);
  const solid = section.extrude(high - low).translate([0, 0, low]);
  created.push(section, solid);
  return solid;
}

/** The knuckle's column, `grow` wider all round (the socket), from `low` to `high`; its cones where the body is at the joint. */
function knuckleColumn(runtime: ManifoldToplevel, plan: FlexiJointPlan, grow: number, low: number, high: number, created: { delete?: () => void }[]) {
  const base = plan.bottom + KNUCKLE_FOOT;
  const crown = plan.top - KNUCKLE_FOOT;
  const outline: [number, number][] = [
    [0, low],
    [plan.foot + grow, low],
    [plan.foot + grow, base],
    [plan.knuckle + grow, base + plan.bulge],
    [plan.knuckle + grow, crown - plan.bulge],
    [plan.foot + grow, crown],
    [plan.foot + grow, high],
    [0, high],
  ];
  const points = outline.filter((point, index) => index === 0 || Math.abs(point[0] - outline[index - 1][0]) > 1e-9 || Math.abs(point[1] - outline[index - 1][1]) > 1e-9);
  const segments = clamp(Math.ceil((2 * Math.PI * (plan.knuckle + grow)) / 0.5), 32, 128);
  const section = runtime.CrossSection.ofPolygons([points]);
  const solid = section.revolve(segments).translate([plan.u, plan.v, 0]);
  created.push(section, solid);
  return solid;
}

/**
 * The two sides of a joint: what the link before it (A, towards -u) and the link after it (B) may have there. A has its
 * side of the V beyond the socket's ring, the knuckle and the neck; B its side of the V, the ring round the socket open
 * towards the neck, without the socket. The two never come nearer than the clearance, also turned by the swing.
 */
function jointSides(runtime: ManifoldToplevel, plan: FlexiJointPlan, clearance: number, low: number, high: number, far: number, created: { delete?: () => void }[]) {
  const half = Math.PI / 2 - plan.swing / 2;
  // Each side's edges lie half the clearance off the V's rays, so the apex moves along the axis.
  const shift = clearance / 2 / Math.sin(half);
  const ray = (from: [number, number], angle: number, length: number): [number, number] => [from[0] + length * Math.cos(angle), from[1] + length * Math.sin(angle)];
  const sector = (apex: [number, number], middle: number, spread: number, length: number) => prism(runtime, [apex, ray(apex, middle - spread, length), ray(apex, middle, length), ray(apex, middle + spread, length)], low, high, created);
  const pivot: [number, number] = [plan.u, plan.v];

  const sideA = sector([plan.u - shift, plan.v], Math.PI, half, far);
  const clear = runtime.CrossSection.circle(plan.ring + clearance, 96);
  const clearColumn = clear.extrude(high - low).translate([plan.u, plan.v, low]);
  const outerA = sideA.subtract(clearColumn);
  const knuckle = knuckleColumn(runtime, plan, 0, low, high, created);
  const reach = plan.ring + clearance + 0.5;
  const neck = prism(runtime, [[plan.u - reach, plan.v - plan.neck], [plan.u, plan.v - plan.neck], [plan.u, plan.v + plan.neck], [plan.u - reach, plan.v + plan.neck]], low, high, created);
  const a = runtime.Manifold.union([outerA, knuckle, neck]);

  const sideB = sector([plan.u + shift, plan.v], 0, half, far);
  const disc = runtime.CrossSection.circle(plan.ring, 96);
  const ringColumn = disc.extrude(high - low).translate([plan.u, plan.v, low]);
  const opening = sector(pivot, Math.PI, plan.opening, 2 * plan.ring + 2);
  const ring = ringColumn.subtract(opening);
  const socket = knuckleColumn(runtime, plan, coneGap(clearance), low, high, created);
  const joined = runtime.Manifold.union([sideB, ring]);
  const b = joined.subtract(socket);
  created.push(clear, clearColumn, outerA, a, disc, ringColumn, ring, joined, b);
  return { a, b };
}

export type FlexiResult = { links: ManifoldSolid[]; plans: FlexiJointPlan[] } | { error: FlexiError };

/**
 * How many joints a body `length` long and `width` wide gets when none are asked for: as many as leave links long enough
 * for the spacing two joints of the automatic size need (flexiMinimumSpacing, the body straight).
 */
export function automaticFlexiJoints(length: number, width: number, clearance = FLEXI_DEFAULTS.clearance, swing = FLEXI_DEFAULTS.swing) {
  const knuckle = Math.max(MIN_KNUCKLE, Math.min(AUTO_KNUCKLE, flexiKnuckleForHalfWidth(width / 2, clearance)));
  const ring = flexiRingRadius(knuckle, clearance);
  const spacing = 2 * ring + 2 * clearance + 0.5 + 2 * ring * Math.tan((swing * Math.PI) / 360);
  return clamp(Math.floor(length / spacing) - 1, 1, 15);
}

/**
 * Cuts a closed body (in the scene's coordinates) into links with a joint between each two, as `options` asks. The
 * links come back in the scene's coordinates, from the body's start along the axis to its end; the caller frees them.
 * Without a joint count, fewer joints are tried when the ones the size suggests lie too close.
 */
export function articulateSolid(runtime: ManifoldToplevel, body: ManifoldSolid, given: FlexiOptions): FlexiResult {
  const created: { delete?: () => void }[] = [];
  try {
    const box = body.boundingBox();
    const axis = given.axis ?? (box.max[0] - box.min[0] >= box.max[2] - box.min[2] ? "x" : "z");
    const options = { ...given, axis };
    const frame = frameFor(axis);
    const local = body.transform(toFrame(frame));
    created.push(local);
    const bounds = local.boundingBox();
    const length = bounds.max[0] - bounds.min[0];
    const width = bounds.max[1] - bounds.min[1];
    const low = bounds.min[2] - 1;
    const high = bounds.max[2] + 1;
    const far = 4 * Math.hypot(length, width, high - low) + 20;
    let count = options.joints ?? automaticFlexiJoints(length, width, options.clearance, options.swing);
    let plans: FlexiJointPlan[] | FlexiError;
    for (;;) {
      const positions = flexiJointPositions(bounds.min[0], bounds.max[0], count, options.start, options.end);
      if (positions.some((u) => u <= bounds.min[0] + 1 || u >= bounds.max[0] - 1) || positions.some((u, index) => index > 0 && u <= positions[index - 1])) {
        return { error: { code: "tooShort" } };
      }
      plans = planJoints(runtime, local, positions, options, created);
      if (!("code" in plans) || plans.code !== "tooClose" || options.joints !== undefined || count <= 1) break;
      count -= 1;
    }
    if ("code" in plans) return { error: plans };

    const sides = plans.map((plan) => jointSides(runtime, plan, options.clearance, low, high, far, created));
    const links: ManifoldSolid[] = [];
    for (let index = 0; index <= plans.length; index += 1) {
      const before = index > 0 ? sides[index - 1].b : null;
      const after = index < plans.length ? sides[index].a : null;
      let region = before ?? after;
      if (before && after) {
        region = before.intersect(after);
        created.push(region);
      }
      const link = local.intersect(region as ManifoldSolid);
      created.push(link);
      if (link.status() !== "NoError" || link.volume() <= 1e-3) return { error: { code: "empty", joint: index + 1 } };
      links.push(link.transform(toWorld(frame)));
    }
    return { links, plans };
  } catch (error) {
    return { error: { code: "kernel", message: error instanceof Error ? error.message : String(error ?? "") } };
  } finally {
    Array.from(new Set(created)).forEach(disposeManifold);
  }
}

/** A size in mm as the interface's language writes it, to one decimal. */
function millimetres(value = 0) {
  return value.toLocaleString(numberLocale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/** The message for why the joints could not be made. */
export function flexiErrorMessage(error: FlexiError) {
  switch (error.code) {
    case "notClosed":
      return t("flexi.error.notClosed");
    case "tooShort":
      return t("flexi.error.tooShort");
    case "tooThin":
      return t("flexi.error.tooThin", { joint: error.joint, size: millimetres(error.value) });
    case "tooFlat":
      return t("flexi.error.tooFlat", { joint: error.joint, size: millimetres(error.value) });
    case "tooClose":
      return t("flexi.error.tooClose", { joint: error.joint, size: millimetres(error.value) });
    case "empty":
      return t("flexi.error.empty", { link: error.joint });
    default:
      return error.message ? t("flexi.error.kernel", { message: error.message }) : t("flexi.error.kernelUnknown");
  }
}

function positionsOf(mesh: ReturnType<ManifoldSolid["getMesh"]>) {
  const positions: number[] = [];
  for (let index = 0; index < mesh.triVerts.length; index += 1) {
    const offset = mesh.triVerts[index] * mesh.numProp;
    positions.push(mesh.vertProperties[offset], mesh.vertProperties[offset + 1], mesh.vertProperties[offset + 2]);
  }
  return positions;
}

export type FlexiShapesResult =
  | { links: WorkplaneShape[]; joints: number; swing: number; axis: FlexiAxis }
  | { links: null; error: string };

/**
 * The selected bodies made into links: the solids joined, the holes among them cut away, then cut into links with joints
 * between them. The links are meshes named after the first body and keep its colour.
 */
export async function articulateShapes(targets: readonly WorkplaneShape[], given: FlexiOptions): Promise<FlexiShapesResult> {
  const solids = targets.filter((shape) => !shape.hole && !isNonSolidShape(shape));
  const holes = targets.filter((shape) => shape.hole);
  if (!solids.length) return { links: null, error: t("flexi.error.needsBody") };
  const created: ManifoldSolid[] = [];
  try {
    const runtime = await getManifoldRuntime();
    const closed = (part: ManifoldSolid | null): part is ManifoldSolid => Boolean(part && part.status() === "NoError" && part.numTri() > 0);
    const builtParts = solids.map((shape) => shapeToManifoldSolid(runtime, shape, created));
    const builtCutters = holes.map((shape) => shapeToManifoldSolid(runtime, shape, created));
    const parts = builtParts.filter(closed);
    const cutters = builtCutters.filter(closed);
    if (parts.length !== builtParts.length || cutters.length !== builtCutters.length) {
      return { links: null, error: flexiErrorMessage({ code: "notClosed" }) };
    }
    let body = parts.length === 1 ? parts[0] : runtime.Manifold.union(parts);
    created.push(body);
    if (cutters.length) {
      body = body.subtract(runtime.Manifold.union(cutters));
      created.push(body);
    }
    const result = articulateSolid(runtime, body, given);
    if ("error" in result) return { links: null, error: flexiErrorMessage(result.error) };
    created.push(...result.links);
    const source = solids[0];
    const links: WorkplaneShape[] = [];
    for (const [index, link] of result.links.entries()) {
      const mesh = link.getMesh();
      const shape = splitShapeFromWorldPositions(source, positionsOf(mesh), createLocalId(`${source.id}-flexi-${index + 1}`), t("flexi.linkName", { name: source.name, number: index + 1 }));
      if (!shape) return { links: null, error: flexiErrorMessage({ code: "empty", joint: index + 1 }) };
      links.push(canonicalizeShape({ ...shape, hidden: false }));
    }
    const swing = Math.min(...result.plans.map((plan) => (plan.swing * 180) / Math.PI));
    const box = body.boundingBox();
    const axis = given.axis ?? (box.max[0] - box.min[0] >= box.max[2] - box.min[2] ? "x" : "z");
    return { links, joints: result.plans.length, swing: Math.round(swing), axis };
  } catch (error) {
    return { links: null, error: flexiErrorMessage({ code: "kernel", message: error instanceof Error ? error.message : String(error ?? "") }) };
  } finally {
    Array.from(new Set(created)).forEach(disposeManifold);
  }
}
