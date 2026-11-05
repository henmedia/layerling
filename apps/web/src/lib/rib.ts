import * as THREE from "three";
import { addPrismAlongX, arcPoints, IndexedMesh, type ProfilePoint } from "@/lib/enclosureMesh";

/*
 * The rib: a thin wall that stiffens a floor or a wall, or a gusset that braces a wall against the floor. Straight,
 * it runs along x (width its length), as high as the shape and as thick as its depth; its top flat, round (a half
 * circle across it) or chamfered (45 degrees at both edges, a third of the thickness). As a gusset it is a right
 * triangle seen from the side: the upright leg against a wall at the back of x, the foot along the floor, both ends
 * cut off short so they print and do not end in a feather; width the foot, height the leg, depth the thickness.
 *
 * A rib can stand on a foot (Discussion #1307): a thin plate under its whole length, centred under it and wider than
 * it, so it holds on the bed or the floor it stands on and a thinner rib still stands. A gusset's foot lies under its
 * leg along the floor, from the wall to the tip; up the wall the wall it braces holds it. The foot is part of the box,
 * so the box stays what is printed: with the foot the depth is the foot's width and the rib's own thickness is kept
 * on its own, the height still the whole height, the foot at the bottom of it.
 *
 * A rib is printed best about as thick as the wall it stiffens or a little thinner, a few times as high as thick, a
 * multiple of the line width (two lines of 0.4 mm: 0.8 mm; four: 1.6 mm). Several in a row come from Pattern.
 */

export type RibStyle = "straight" | "gusset";
export type RibTop = "flat" | "round" | "chamfer";

/** The rib a new one starts as: four lines of 0.4 mm. */
export const DEFAULT_RIB_THICKNESS = 1.6;
/** A foot starts three times as wide as its rib: a line and a half beside a rib of two lines, on each side. */
export const RIB_FOOT_WIDTH_FACTOR = 3;
/** Four layers of 0.2 mm (three of 0.28): stiff enough not to curl up at the edges, thin enough to stay a foot. */
export const DEFAULT_RIB_FOOT_THICKNESS = 0.8;
export const MIN_RIB_FOOT_THICKNESS = 0.2;
/** How far the foot reaches out beside the rib at the least, on each side: one line of a 0.4 mm nozzle. */
export const MIN_RIB_FOOT_OVERHANG = 0.4;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

export function normalizeRibStyle(value: unknown): RibStyle {
  return value === "gusset" ? "gusset" : "straight";
}

export function normalizeRibTop(value: unknown): RibTop {
  return value === "round" || value === "chamfer" ? value : "flat";
}

export type RibFields = {
  width: number;
  depth?: number;
  height: number;
  ribStyle?: RibStyle;
  ribTop?: RibTop;
  /** A foot under the rib (Discussion #1307); missing means none, as every rib had before. */
  ribFoot?: boolean;
  /** With the foot: the rib's own thickness, the depth being the foot's width. */
  ribThickness?: number;
  /** The foot's thickness, its height from the bottom. */
  ribFootThickness?: number;
};

/** The foot under a rib: its width across, the whole box's depth, and its thickness from the bottom up. */
export type RibFoot = { width: number; thickness: number };

/** How short a gusset's ends are cut: at most 0.6 mm, never more than a tenth of its legs. */
function gussetEnd(width: number, height: number) {
  return Math.min(0.6, width / 10, height / 10);
}

/**
 * The straight rib's cross-section (u = z, v = y), counter-clockwise from the floor's back corner. With a foot the rib
 * stands on it: the foot across the bottom, the rib from the foot's top up, its top as without.
 */
export function ribProfile(thickness: number, height: number, top: RibTop, foot: RibFoot | null = null): ProfilePoint[] {
  const half = thickness / 2;
  const base = foot ? foot.thickness : 0;
  const start: ProfilePoint[] = foot
    ? [{ u: -foot.width / 2, v: 0 }, { u: foot.width / 2, v: 0 }, { u: foot.width / 2, v: base }, { u: half, v: base }]
    : [{ u: -half, v: 0 }, { u: half, v: 0 }];
  const end: ProfilePoint[] = foot ? [{ u: -half, v: base }, { u: -foot.width / 2, v: base }] : [];
  // The round and the chamfered top need room above the foot; a rib too low for them stays flat.
  if (top === "round" && height - base > half + 0.1) {
    return [...start, ...arcPoints({ u: 0, v: height - half }, half, 0, Math.PI, 12), ...end];
  }
  if (top === "chamfer" && height - base > thickness / 3 + 0.1) {
    const c = thickness / 3;
    return [...start, { u: half, v: height - c }, { u: half - c, v: height }, { u: -half + c, v: height }, { u: -half, v: height - c }, ...end];
  }
  return [...start, { u: half, v: height }, { u: -half, v: height }, ...end];
}

/**
 * The rib's measures as its fields give them: its kind, length (or foot), height and thickness, and its foot or null.
 * Without a foot the depth is the rib's thickness, as it always was. With one the depth is the foot's width and the
 * rib keeps its own thickness (a third of the foot when it has none), at least a line narrower on each side so the
 * foot reaches out beside it; the foot at most half the height, so the rib still stands above it.
 */
export function ribSize(shape: RibFields) {
  const style = normalizeRibStyle(shape.ribStyle);
  const top = normalizeRibTop(shape.ribTop);
  const width = Math.max(0.2, shape.width);
  const height = Math.max(0.2, shape.height);
  const depth = Math.max(0.2, shape.depth ?? shape.width);
  if (shape.ribFoot !== true) return { style, top, width, height, thickness: depth, foot: null };
  const thickness = clamp(finite(shape.ribThickness) ? shape.ribThickness : depth / RIB_FOOT_WIDTH_FACTOR, 0.2, Math.max(0.2, depth - 2 * MIN_RIB_FOOT_OVERHANG));
  const footThickness = clamp(finite(shape.ribFootThickness) ? shape.ribFootThickness : DEFAULT_RIB_FOOT_THICKNESS, MIN_RIB_FOOT_THICKNESS, height / 2);
  // A box no wider than the rib leaves no foot to stand on.
  const foot: RibFoot | null = depth - thickness > 1e-6 ? { width: depth, thickness: footThickness } : null;
  return { style, top, width, height, thickness, foot };
}

/** The foot's width a rib of `thickness` starts with when its foot is switched on. */
export function ribFootWidthFor(thickness: number) {
  return Math.round(thickness * RIB_FOOT_WIDTH_FACTOR * 100) / 100;
}

/**
 * What switching a rib's foot on or off changes, the box following it so it stays what is printed. On, the rib keeps
 * its thickness (or takes the one given) and the depth becomes the foot's width, three times the rib unless given;
 * off, the depth is the rib's thickness again (or the one given), and the kept thickness goes.
 */
export function ribFootSwitch(shape: RibFields, on: boolean, given: { thickness?: number; depth?: number } = {}): Pick<RibFields, "ribFoot" | "ribThickness" | "depth"> {
  const { thickness } = ribSize(shape);
  if (!on) return { ribFoot: false, ribThickness: undefined, depth: given.depth ?? thickness };
  const rib = Math.max(0.2, given.thickness ?? thickness);
  return { ribFoot: true, ribThickness: rib, depth: given.depth ?? ribFootWidthFor(rib) };
}

/** A new thickness for a rib on its foot: the foot widens with it only where it would no longer reach out beside it. */
export function ribThicknessOnFootPatch(shape: RibFields, thickness: number): Pick<RibFields, "ribThickness" | "depth"> {
  const depth = Math.max(0.2, shape.depth ?? shape.width);
  return { ribThickness: thickness, depth: Math.max(depth, Math.round((thickness + 2 * MIN_RIB_FOOT_OVERHANG) * 100) / 100) };
}

/**
 * The gusset seen from the side along z (u = x, v = y), counter-clockwise: the leg up the wall at x = -width/2, the
 * foot along the floor, both ends cut short.
 */
export function ribGussetOutline(width: number, height: number): ProfilePoint[] {
  const e = gussetEnd(width, height);
  return [
    { u: -width / 2, v: 0 },
    { u: width / 2, v: 0 },
    { u: width / 2, v: e },
    { u: -width / 2 + e, v: height },
    { u: -width / 2, v: height },
  ];
}

/**
 * The gusset on its foot, in its own frame (x along the floor, the wall at -width/2, z across): the gusset's
 * cross-section across z at each point along x is the foot with the gusset standing on it, as high as the gusset's top
 * there. Its top runs straight between the wall, the end of the short top at the wall and the tip, so the body is
 * those cross-sections joined from one to the next by flat faces. Where the gusset's top comes down to the foot (a
 * foot thicker than the tip is high) the gusset ends in it, and the foot alone runs on to the tip.
 */
function addGussetOnFoot(mesh: IndexedMesh, width: number, height: number, thickness: number, foot: RibFoot) {
  const e = gussetEnd(width, height);
  const ft = foot.thickness;
  const x1 = -width / 2 + e;
  const x2 = width / 2;
  const stations = [{ x: -width / 2, h: height }, { x: x1, h: height }];
  if (e > ft + 1e-9) stations.push({ x: x2, h: e });
  else {
    const meets = x1 + ((height - ft) / (height - e)) * (x2 - x1);
    stations.push({ x: meets, h: ft });
    if (x2 - meets > 1e-9) stations.push({ x: x2, h: ft });
  }
  const fw = foot.width / 2;
  const t = thickness / 2;
  // Each cross-section: the foot's bottom, its side, its top out to the rib, the rib up and across and down, the
  // foot's top on the other side. Where the rib has come down to the foot its points are the foot's, so the faces
  // there close up instead of lying flat on one another.
  const rings = stations.map(({ x, h }) => {
    const at = (z: number, y: number) => mesh.point(x, y, z);
    const footLeft = at(-fw, 0), footRight = at(fw, 0), rightEdge = at(fw, ft), rightRoot = at(t, ft), leftRoot = at(-t, ft), leftEdge = at(-fw, ft);
    const standing = h > ft + 1e-9;
    const rightTop = standing ? at(t, h) : rightRoot;
    const leftTop = standing ? at(-t, h) : leftRoot;
    return [footLeft, footRight, rightEdge, rightRoot, rightTop, leftTop, leftRoot, leftEdge];
  });
  for (let s = 0; s + 1 < rings.length; s += 1) {
    const a = rings[s], b = rings[s + 1];
    for (let i = 0; i < 8; i += 1) mesh.quad(a[i], a[(i + 1) % 8], b[(i + 1) % 8], b[i]);
  }
  // The two ends: the foot's rectangle fanned from its bottom corner (its top is split where the rib stands), and the
  // rib's end above it, which at the tip is nothing where the rib has come down to the foot.
  for (const r of [rings[0], rings[rings.length - 1]]) {
    mesh.tri(r[0], r[1], r[2]);
    mesh.tri(r[0], r[2], r[3]);
    mesh.tri(r[0], r[3], r[6]);
    mesh.tri(r[0], r[6], r[7]);
    mesh.quad(r[3], r[4], r[5], r[6]);
  }
}

export function ribMesh(shape: RibFields) {
  const { style, top, width, height, thickness, foot } = ribSize(shape);
  const mesh = new IndexedMesh();
  if (style === "gusset") {
    if (foot) {
      addGussetOnFoot(mesh, width, height, thickness, foot);
      return mesh;
    }
    // Pushed along x in the builder, so the outline is drawn in (z, y) and turned: here u is x.
    addPrismAlongX(mesh, ribGussetOutline(width, height), thickness);
    // The builder pushes along x: turn the result so the outline lies in x-y and the thickness runs along z.
    for (let i = 0; i < mesh.positions.length; i += 3) {
      const x = mesh.positions[i], z = mesh.positions[i + 2];
      mesh.positions[i] = z;
      mesh.positions[i + 2] = -x;
    }
    return mesh;
  }
  addPrismAlongX(mesh, ribProfile(thickness, height, top, foot), width);
  return mesh;
}

export function createRibGeometry(shape: RibFields): THREE.BufferGeometry {
  return ribMesh(shape).geometry(30);
}
