import * as THREE from "three";
import { addPrismAlongX, arcPoints, IndexedMesh, type ProfilePoint } from "@/lib/enclosureMesh";

/*
 * The snap-fit: a cantilever hook and, as its counterpart, the catch it snaps under - the one on a lid, the other on
 * the inside of a box's wall. It stands as it sits in an enclosure printed upright, the lid on top: the hook hangs from
 * its foot at the top of the shape, the barb at the bottom. Width is the hook's width (x); height runs from the foot's
 * top to the hook's tip (y); depth from the foot's back to the front (z). The arm stands at the front of the foot, its
 * front flush with the foot's; the barb at the arm's tip points forward (+z) by the undercut, with a lead-in slope
 * below it (the entry angle, measured from the direction the hook goes in: 30 degrees slides in easily) and above it
 * the face that holds (90 degrees holds for good, 45 lets it be pulled apart). Where the arm leaves the foot a fillet
 * keeps the root from cracking. With "Both", the catch stands in front, where it sits when snapped in: a ledge on the
 * wall (its back at the front of the box, z = depth/2), the clearance above the barb and beside the arm, its top at 45
 * degrees, so on an upright wall only its holding face, as wide as the undercut, reaches out flat. "Hook" or "Catch"
 * alone make that part fill the box.
 *
 * The plan measures from the foot (y up from the foot, as a hook printed with its lid would stand); the mesh is turned
 * over at the end so the foot is at the top.
 *
 * Each measure has its own range, and the box limits them further, so the arm, the barb and the catch always stay in
 * it (#2161). Across, the arm's thickness and the undercut share the depth (less the clearance in front of the catch):
 * each keeps what it asks for while the other leaves room, and where both ask too much, each gets at least half. Up
 * the height, the barb's slope, its holding face and, with "Both", the catch under it have to fit between the foot and
 * the top: the lead-in angle grows steeper first (the undercut is what holds), up to 60 degrees, and only then the
 * undercut gets smaller. Where even the smallest hook leaves no room for the clearance, that gets smaller too. The
 * plan says which measures the box limited, so the panel can say so.
 *
 * The arm bends by the undercut as it goes in; the strain at its root is about 1.5 * thickness * undercut / length^2
 * (a straight cantilever of even thickness). PLA starts to break above about 2 %, PETG and ABS take about 4 %: the
 * panel says how much this hook asks for.
 */

export type SnapFitPart = "both" | "hook" | "catch";

export const DEFAULT_SNAP_FIT_THICKNESS = 1.6;
export const DEFAULT_SNAP_FIT_UNDERCUT = 1;
export const DEFAULT_SNAP_FIT_LEAD_ANGLE = 30;
export const DEFAULT_SNAP_FIT_RETAIN_ANGLE = 90;
export const DEFAULT_SNAP_FIT_CLEARANCE = 0.2;
export const DEFAULT_SNAP_FIT_FOOT = 1.6;
/** The smallest thickness and undercut, the steepest lead-in angle: the ranges of the panel's fields. */
export const MIN_SNAP_FIT_THICKNESS = 0.4;
export const MAX_SNAP_FIT_THICKNESS = 20;
export const MIN_SNAP_FIT_UNDERCUT = 0.2;
export const MAX_SNAP_FIT_UNDERCUT = 10;
export const MIN_SNAP_FIT_LEAD_ANGLE = 10;
export const MAX_SNAP_FIT_LEAD_ANGLE = 60;
/** The catch's short upright tip; the room it keeps below the box's top (a layer); the arm's length below the barb at least. */
const CATCH_TIP = 0.6;
const CATCH_ROOM = 0.2;
const MIN_ARM = 0.5;
/** Strain at the root above which PLA tends to break, and above which PETG and ABS do. */
export const SNAP_FIT_STRAIN_PLA = 0.02;
export const SNAP_FIT_STRAIN_TOUGH = 0.04;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

export function normalizeSnapFitPart(value: unknown): SnapFitPart {
  return value === "hook" || value === "catch" ? value : "both";
}

export type SnapFitFields = {
  width: number;
  depth?: number;
  height: number;
  snapFitPart?: SnapFitPart;
  snapFitThickness?: number;
  snapFitUndercut?: number;
  snapFitLeadAngle?: number;
  snapFitRetainAngle?: number;
  snapFitClearance?: number;
  snapFitFoot?: number;
};

export type SnapFitPlan = {
  part: SnapFitPart;
  width: number;
  height: number;
  depth: number;
  thickness: number;
  undercut: number;
  clearance: number;
  lead: number;
  retain: number;
  foot: number;
  fillet: number;
  /** Heights from the foot of the barb's holding face at the arm, where it meets the tip, and where the slope starts. */
  holdY: number;
  holdTipY: number;
  slopeY: number;
  /** Front of the arm (z), its back, the barb's tip. */
  armFront: number;
  armBack: number;
  barbTip: number;
  /** The arm's length from the foot to the holding face, and the strain at its root as it snaps in. */
  armLength: number;
  strain: number;
  /** The measures the box's size limited below what was asked for (#2161). */
  limited: SnapFitLimits;
};

export type SnapFitLimits = { thickness: boolean; undercut: boolean; lead: boolean; clearance: boolean };

/** How far a holding face of `retain` degrees rises over the undercut (0 for a square one). */
export function snapFitHoldRise(undercut: number, retain: number) {
  return retain >= 89.9 ? 0 : undercut / Math.tan((retain * Math.PI) / 180);
}

/** The catch's height: its short upright tip, the 45 degree underside and the rise of a slanted holding face. */
export function snapFitCatchHeight(undercut: number, retain = DEFAULT_SNAP_FIT_RETAIN_ANGLE) {
  return 0.6 + undercut + snapFitHoldRise(undercut, retain);
}

/**
 * What was asked for, or where it does not fit the most that does, down to a whole step of the panel's field (less
 * than one step stays as it is), so the panel says a round number.
 */
function within(asked: number, most: number, step: number) {
  if (asked <= most + 1e-6) return asked;
  return most >= step ? Number((Math.floor(most / step + 1e-6) * step).toFixed(6)) : Math.max(0, most);
}
const cot = (degrees: number) => (degrees >= 89.9 ? 0 : 1 / Math.tan((degrees * Math.PI) / 180));

/**
 * The most undercut that fits in `room` up the height: its slope at `lead`, its holding face at `retain`, the land at
 * its tip (half the undercut, at most 0.4) and, with `withCatch`, the catch's undercut under it as well.
 */
function undercutForRoom(room: number, lead: number, retain: number, withCatch: boolean) {
  const perUndercut = cot(lead) + cot(retain) + (withCatch ? 1 : 0);
  const small = room / (perUndercut + 0.5);
  return small <= 0.8 ? small : (room - 0.4) / perUndercut;
}

/** The gentlest lead-in angle (a whole degree) that leaves `room` up the height for `undercut`. */
function leadForRoom(room: number, undercut: number, retain: number, withCatch: boolean) {
  const slopeRun = room - Math.min(0.4, undercut / 2) - undercut * (cot(retain) + (withCatch ? 1 : 0));
  return slopeRun <= 0 ? MAX_SNAP_FIT_LEAD_ANGLE : Math.ceil(Math.atan(undercut / slopeRun) / (Math.PI / 180) - 1e-6);
}

/** What the hook's fields make in its box (the catch's box for "Catch"): every measure within what fits. */
export function snapFitPlan(shape: SnapFitFields): SnapFitPlan {
  const part = normalizeSnapFitPart(shape.snapFitPart);
  const width = Math.max(0.5, shape.width);
  const height = Math.max(1, shape.height);
  const depth = Math.max(0.5, shape.depth ?? shape.width);
  const askedThickness = clamp(finite(shape.snapFitThickness) ? shape.snapFitThickness : DEFAULT_SNAP_FIT_THICKNESS, MIN_SNAP_FIT_THICKNESS, MAX_SNAP_FIT_THICKNESS);
  const askedUndercut = clamp(finite(shape.snapFitUndercut) ? shape.snapFitUndercut : DEFAULT_SNAP_FIT_UNDERCUT, MIN_SNAP_FIT_UNDERCUT, MAX_SNAP_FIT_UNDERCUT);
  const askedClearance = clamp(finite(shape.snapFitClearance) ? shape.snapFitClearance : DEFAULT_SNAP_FIT_CLEARANCE, 0, 2);
  const askedLead = clamp(finite(shape.snapFitLeadAngle) ? shape.snapFitLeadAngle : DEFAULT_SNAP_FIT_LEAD_ANGLE, MIN_SNAP_FIT_LEAD_ANGLE, MAX_SNAP_FIT_LEAD_ANGLE);
  const retain = clamp(finite(shape.snapFitRetainAngle) ? shape.snapFitRetainAngle : DEFAULT_SNAP_FIT_RETAIN_ANGLE, 30, 90);
  const foot = clamp(finite(shape.snapFitFoot) ? shape.snapFitFoot : DEFAULT_SNAP_FIT_FOOT, 0, height / 3);
  const both = part === "both";
  let thickness = askedThickness;
  let undercut = askedUndercut;
  let clearance = askedClearance;
  let lead = askedLead;
  if (part === "catch") {
    // The ledge alone fills its box: as deep as its undercut, as high as its tip, undercut and slanted holding face.
    undercut = within(askedUndercut, Math.min(depth, (height - CATCH_TIP) / (1 + cot(retain))), 0.1);
  } else {
    // Up the height: the arm below the barb, and with "Both" the catch under it, a layer below the box's top.
    const hookRoom = height - foot - MIN_ARM;
    const catchRoom = (c: number) => height - c - CATCH_TIP - CATCH_ROOM;
    const roomFor = (c: number, steepest: number) =>
      Math.min(undercutForRoom(hookRoom, steepest, retain, false), both ? undercutForRoom(catchRoom(c), steepest, retain, true) : Infinity);
    if (both) {
      // The clearance gives way only where the smallest hook and catch would not fit otherwise.
      const across = depth - MIN_SNAP_FIT_THICKNESS - MIN_SNAP_FIT_UNDERCUT;
      const up = catchRoom(0) - MIN_SNAP_FIT_UNDERCUT * (cot(MAX_SNAP_FIT_LEAD_ANGLE) + cot(retain) + 1) - MIN_SNAP_FIT_UNDERCUT / 2;
      clearance = within(askedClearance, Math.max(0, Math.min(across, up)), 0.05);
    }
    // Across: the arm and the undercut share the depth; each keeps what it asks while the other leaves it room.
    const across = depth - (both ? clearance : 0);
    const upright = roomFor(clearance, MAX_SNAP_FIT_LEAD_ANGLE);
    undercut = within(askedUndercut, Math.min(upright, across - Math.min(askedThickness, across / 2)), 0.1);
    thickness = within(askedThickness, across - Math.min(askedUndercut, upright, across / 2), 0.1);
    // The lead-in angle as gentle as asked, or as gentle as still leaves room for this undercut.
    const leadNeeded = Math.max(
      leadForRoom(hookRoom, undercut, retain, false),
      both ? leadForRoom(catchRoom(clearance), undercut, retain, true) : MIN_SNAP_FIT_LEAD_ANGLE,
    );
    lead = clamp(Math.max(askedLead, leadNeeded), MIN_SNAP_FIT_LEAD_ANGLE, MAX_SNAP_FIT_LEAD_ANGLE);
  }
  const limited: SnapFitLimits = {
    thickness: part !== "catch" && thickness < askedThickness - 1e-6,
    undercut: undercut < askedUndercut - 1e-6,
    lead: part !== "catch" && lead > askedLead + 1e-6,
    clearance: both && clearance < askedClearance - 1e-6,
  };
  const fillet = foot > 0 ? Math.min(thickness / 2, 1) : 0;
  const rad = Math.PI / 180;
  const slopeRun = undercut / Math.tan(lead * rad);
  const holdRun = snapFitHoldRise(undercut, retain);
  const land = Math.min(0.4, undercut / 2);
  const holdTipY = height - slopeRun - land;
  const holdY = holdTipY - holdRun;
  const slopeY = holdTipY + land;
  // The front of the box is the barb's tip, or for both the wall the catch stands on.
  const barbTip = part === "both" ? depth / 2 - clearance : depth / 2;
  const armFront = barbTip - undercut;
  const armBack = armFront - thickness;
  const armLength = Math.max(0.5, holdY - foot);
  return {
    part,
    width,
    height,
    depth,
    thickness,
    undercut,
    clearance,
    lead,
    retain,
    foot,
    fillet,
    holdY,
    holdTipY,
    slopeY,
    armFront,
    armBack,
    barbTip,
    armLength,
    strain: (1.5 * thickness * undercut) / (armLength * armLength),
    limited,
  };
}

/** The hook's side outline (u = z, v = y), counter-clockwise: foot, the arm's front with the barb, its back with the fillet. */
export function snapFitHookOutline(plan: SnapFitPlan): ProfilePoint[] {
  const { depth, foot, fillet, armFront, armBack, barbTip, holdY, holdTipY, slopeY, height } = plan;
  const back = -depth / 2;
  const points: ProfilePoint[] = [
    { u: back, v: 0 },
    { u: armFront, v: 0 },
    { u: armFront, v: holdY },
    { u: barbTip, v: holdTipY },
    { u: barbTip, v: slopeY },
    { u: armFront, v: height },
    { u: armBack, v: height },
  ];
  if (foot > 0 && armBack - back > fillet + 0.2) {
    // Down the arm's back into the foot through a fillet (a quarter circle round a centre behind the arm).
    points.push({ u: armBack, v: foot + fillet });
    arcPoints({ u: armBack - fillet, v: foot + fillet }, fillet, 0, -Math.PI / 2, 6).slice(1).forEach((p) => points.push(p));
    points.push({ u: back, v: foot });
  } else {
    points.push({ u: armBack, v: 0 });
    points.splice(0, 1);
  }
  return points.filter((p, i, all) => i === 0 || Math.hypot(p.u - all[i - 1].u, p.v - all[i - 1].v) > 1e-6);
}

/**
 * The catch's side outline, measured from the hook's foot like the plan: a ledge reaching `reach` from the wall (its
 * back, at `wall`), its face towards the foot the barb's holding face moved by the clearance - level, or sloping
 * towards the wall by `rise` for a slanted one - a short upright tip, and 45 degrees back to the wall on its far side.
 * Turned over under a lid, that slope is the catch's top: it prints on an upright wall without support. `top` is the
 * holding face's height at the tip.
 */
export function snapFitCatchOutline(wall: number, reach: number, top: number, rise: number): ProfilePoint[] {
  const tip = 0.6;
  return [
    { u: wall - reach, v: top },
    { u: wall - reach, v: top - tip },
    { u: wall, v: top - tip - reach },
    { u: wall, v: top + rise },
  ];
}

/**
 * Where the catch stands, as its side outline measured from the hook's foot, or null for none: alone it fills its
 * box, its back at the front; with the hook, where it sits snapped in, the clearance under the holding face and in
 * front of the arm, left out where the box has no room for it under the barb.
 */
export function snapFitCatchFor(plan: SnapFitPlan): ProfilePoint[] | null {
  const rise = snapFitHoldRise(plan.undercut, plan.retain);
  if (plan.part === "catch") {
    // Turned over, its holding face at the bottom, the slope on top.
    const reach = Math.min(plan.depth, plan.undercut);
    const top = Math.max(0.6 + reach, plan.height - rise * (reach / plan.undercut));
    return snapFitCatchOutline(plan.depth / 2, reach, top, rise * (reach / plan.undercut));
  }
  if (plan.part !== "both") return null;
  const top = plan.holdY - plan.clearance;
  return top - 0.6 - plan.undercut > 0 ? snapFitCatchOutline(plan.depth / 2, plan.undercut, top, rise) : null;
}

export function snapFitMesh(shape: SnapFitFields) {
  const plan = snapFitPlan(shape);
  const mesh = new IndexedMesh();
  if (plan.part !== "catch") addPrismAlongX(mesh, snapFitHookOutline(plan), plan.width);
  const catchOutline = snapFitCatchFor(plan);
  if (catchOutline) addPrismAlongX(mesh, catchOutline, plan.width);
  turnOver(mesh, plan.height);
  return { mesh, plan };
}

/** Upside down, as it sits under a lid: y becomes height - y (the mirror turns the faces inside out; geometry() turns them back). */
function turnOver(mesh: IndexedMesh, height: number) {
  for (let i = 1; i < mesh.positions.length; i += 3) mesh.positions[i] = height - mesh.positions[i];
  mesh.orient();
}

export function createSnapFitGeometry(shape: SnapFitFields): THREE.BufferGeometry {
  return snapFitMesh(shape).mesh.geometry(30);
}

/** The box the catch alone needs: as deep as the undercut, as high as its ledge. */
export function snapFitCatchBox(undercut: number, retain = DEFAULT_SNAP_FIT_RETAIN_ANGLE) {
  return { depth: undercut, height: snapFitCatchHeight(undercut, retain) };
}
