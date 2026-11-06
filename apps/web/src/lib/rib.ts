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
 * The foot is square at its corners or oval (Discussion #1307: a square corner is where the plastic, shrinking as it
 * cools, pulls up off the bed first). The oval one is an ellipse seen from above, centred under the rib, as wide as
 * the square one and just long enough that at the rib's two ends it is still twice as wide as the rib, so the ends
 * stand on it too: a gusset's is half of one, its straight side against the wall, from where it runs past the tip.
 * The box takes the ellipse in as it takes the foot's width: on an oval foot the width is the foot's length, and the
 * rib's own length follows from it (ribOvalFootStretch).
 *
 * A rib is printed best about as thick as the wall it stiffens or a little thinner, a few times as high as thick, a
 * multiple of the line width (two lines of 0.4 mm: 0.8 mm; four: 1.6 mm). Several in a row come from Pattern.
 */

export type RibStyle = "straight" | "gusset";
export type RibTop = "flat" | "round" | "chamfer";
export type RibFootShape = "square" | "oval";

/** The rib a new one starts as: four lines of 0.4 mm. */
export const DEFAULT_RIB_THICKNESS = 1.6;
/** A foot starts three times as wide as its rib: a line and a half beside a rib of two lines, on each side. */
export const RIB_FOOT_WIDTH_FACTOR = 3;
/** Four layers of 0.2 mm (three of 0.28): stiff enough not to curl up at the edges, thin enough to stay a foot. */
export const DEFAULT_RIB_FOOT_THICKNESS = 0.8;
export const MIN_RIB_FOOT_THICKNESS = 0.2;
/** How far the foot reaches out beside the rib at the least, on each side: one line of a 0.4 mm nozzle. */
export const MIN_RIB_FOOT_OVERHANG = 0.4;
/**
 * How many times as long as the rib an oval foot is at the most before it is cut short: half again. Longer, it would be
 * mostly ellipse past the rib's ends, the foot of a rib nearly half as thick as the foot is wide.
 */
export const MAX_RIB_OVAL_FOOT_STRETCH = 1.5;
/** The pieces the mesh draws a whole oval foot's outline with (a gusset's half of them); the exact body is a true ellipse. */
export const RIB_OVAL_FOOT_SEGMENTS = 64;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

export function normalizeRibStyle(value: unknown): RibStyle {
  return value === "gusset" ? "gusset" : "straight";
}

export function normalizeRibTop(value: unknown): RibTop {
  return value === "round" || value === "chamfer" ? value : "flat";
}

export function normalizeRibFootShape(value: unknown): RibFootShape {
  return value === "oval" ? "oval" : "square";
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
  /** Its shape seen from above; missing means square, as every foot was before. */
  ribFootShape?: RibFootShape;
};

/**
 * The foot under a rib: its width across, the whole box's depth, its thickness from the bottom up, its shape, and its
 * length along the rib, the box's width (a square foot's is the rib's own length; an oval one reaches past the ends).
 */
export type RibFoot = { width: number; thickness: number; shape: RibFootShape; length: number };

/** How short a gusset's ends are cut: at most 0.6 mm, never more than a tenth of its legs. */
function gussetEnd(width: number, height: number) {
  return Math.min(0.6, width / 10, height / 10);
}

/**
 * The straight rib's top (u = z, v = y), from its right side up over the top to its left side. The round and the
 * chamfered top need room above the foot (`base` its thickness); a rib too low for them stays flat.
 */
function ribTopPoints(thickness: number, height: number, top: RibTop, base: number): ProfilePoint[] {
  const half = thickness / 2;
  if (top === "round" && height - base > half + 0.1) return arcPoints({ u: 0, v: height - half }, half, 0, Math.PI, 12);
  if (top === "chamfer" && height - base > thickness / 3 + 0.1) {
    const c = thickness / 3;
    return [{ u: half, v: height - c }, { u: half - c, v: height }, { u: -half + c, v: height }, { u: -half, v: height - c }];
  }
  return [{ u: half, v: height }, { u: -half, v: height }];
}

/**
 * The straight rib's cross-section (u = z, v = y), counter-clockwise from the floor's back corner. With a square foot
 * the rib stands on it: the foot across the bottom, the rib from the foot's top up, its top as without. An oval foot
 * is not the same all along the rib, so it is no part of the cross-section: see ribProfileOnFoot.
 */
export function ribProfile(thickness: number, height: number, top: RibTop, foot: RibFoot | null = null): ProfilePoint[] {
  const half = thickness / 2;
  const square = foot?.shape === "square" ? foot : null;
  const base = foot ? foot.thickness : 0;
  if (!square) return [{ u: -half, v: 0 }, { u: half, v: 0 }, ...ribTopPoints(thickness, height, top, base)];
  const start: ProfilePoint[] = [{ u: -square.width / 2, v: 0 }, { u: square.width / 2, v: 0 }, { u: square.width / 2, v: base }, { u: half, v: base }];
  const end: ProfilePoint[] = [{ u: -half, v: base }, { u: -square.width / 2, v: base }];
  return [...start, ...ribTopPoints(thickness, height, top, base), ...end];
}

/**
 * The straight rib alone above a foot `base` thick (u = z, v = y), counter-clockwise from its bottom's back corner at
 * `bottom`: the mesh starts it on the foot's top, the exact body lower, inside the foot it is joined to. Its top is
 * the one it has on that foot.
 */
export function ribProfileOnFoot(thickness: number, height: number, top: RibTop, base: number, bottom = base): ProfilePoint[] {
  const half = thickness / 2;
  return [{ u: -half, v: bottom }, { u: half, v: bottom }, ...ribTopPoints(thickness, height, top, base)];
}

/**
 * How many times as long as the rib its oval foot is: along a straight rib its whole length to the rib's, from the wall
 * a gusset's half of an ellipse to the gusset's foot along the floor. An ellipse b wide on each side of the rib (half
 * the foot's width) reaches out t (the rib's thickness) from the rib's middle, half a rib beside each of its faces, at
 * the rib's ends when it is 1 / sqrt(1 - (t / b)^2) times as long as the rib; so the ends stand on the foot as well.
 *
 * A foot hardly wider than twice the rib would need a very long ellipse for that, and a narrower one could not do it
 * at all: there the foot is cut short at MAX_RIB_OVAL_FOOT_STRETCH, and the ends stand on less of it than t. Never on
 * none: however short it is cut, at the rib's ends the foot still reaches out beside the rib half as far as in its
 * middle, so a foot only a little wider than the rib stays long rather than leave its ends standing in the air.
 */
export function ribOvalFootStretch(thickness: number, footWidth: number) {
  const b = footWidth / 2;
  // A foot no wider than the rib leaves nothing to reach out beside it (ribSize gives it no foot then).
  if (!(b > thickness / 2)) return 1;
  // The ellipse through the rib's end, reaching `half` from the rib's middle there.
  const through = (half: number) => 1 / Math.sqrt(1 - (half / b) ** 2);
  const stretch = thickness < b ? through(thickness) : Infinity;
  if (stretch <= MAX_RIB_OVAL_FOOT_STRETCH) return stretch;
  return Math.max(MAX_RIB_OVAL_FOOT_STRETCH, through((b + thickness / 2) / 2));
}

/**
 * The rib's measures as its fields give them: its kind, length (or foot), height and thickness, and its foot or null.
 * Without a foot the depth is the rib's thickness, as it always was. With one the depth is the foot's width and the
 * rib keeps its own thickness (a third of the foot when it has none), at least a line narrower on each side so the
 * foot reaches out beside it; the foot at most half the height, so the rib still stands above it. On an oval foot the
 * width is the foot's length and `width` here the rib's own, shorter by ribOvalFootStretch.
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
  if (!(depth - thickness > 1e-6)) return { style, top, width, height, thickness, foot: null };
  const footShape = normalizeRibFootShape(shape.ribFootShape);
  const foot: RibFoot = { width: depth, thickness: footThickness, shape: footShape, length: width };
  return { style, top, width: footShape === "oval" ? width / ribOvalFootStretch(thickness, depth) : width, height, thickness, foot };
}

/** A measure as the panel keeps it: to a hundredth of a millimetre. */
const hundredths = (value: number) => Math.round(value * 100) / 100;

/** The box's width for a rib `length` long with the foot `shape` gives it: an oval foot's length, otherwise the rib's own. */
export function ribBoxWidth(shape: RibFields, length: number) {
  const { thickness, foot } = ribSize(shape);
  return hundredths(foot?.shape === "oval" ? length * ribOvalFootStretch(thickness, foot.width) : length);
}

/**
 * What a change to a rib's foot or thickness does to its box's width, `next` its fields after the change: where it
 * stands on an oval foot before or after, the width follows the foot, so the rib stays as long as it was. Switched to
 * the oval foot the box grows by the ellipse past the rib's ends; back to a square one, or none, it is the rib's length
 * again. Empty where neither stands on an oval foot, the width then being the rib's length all along.
 */
export function ribLengthKeepingPatch(shape: RibFields, next: RibFields): { width?: number } {
  const before = ribSize(shape);
  if (before.foot?.shape !== "oval" && ribSize(next).foot?.shape !== "oval") return {};
  return { width: ribBoxWidth(next, before.width) };
}

/** Where a shape stands and how it is turned, as the editor places it. */
export type RibPlacement = { x: number; z: number; elevation?: number; width: number; rotation?: number; rotationX?: number; rotationZ?: number; mirrorX?: boolean };

/**
 * Where a gusset's box goes when its width becomes `width` and its wall is to stay where it is. A straight rib's box
 * grows round its middle and the rib stays where it stands; a gusset's oval foot only reaches past the tip, so the box
 * grows away from the wall, and its middle moves along the gusset by half of what it grows, turned and mirrored as the
 * gusset is (the editor turns a shape about the middle of its box).
 */
export function ribGussetWallKeepingPlace(shape: RibPlacement, width: number): Pick<RibPlacement, "x" | "z" | "elevation"> {
  const along = new THREE.Vector3(((shape.mirrorX ? -1 : 1) * (width - shape.width)) / 2, 0, 0).applyEuler(
    new THREE.Euler(THREE.MathUtils.degToRad(shape.rotationX ?? 0), THREE.MathUtils.degToRad(shape.rotation ?? 0), THREE.MathUtils.degToRad(shape.rotationZ ?? 0), "XYZ"),
  );
  const near = (value: number) => (Math.abs(value) < 0.0005 ? 0 : value);
  const place: Pick<RibPlacement, "x" | "z" | "elevation"> = { x: near(shape.x + along.x), z: near(shape.z + along.z) };
  if (Math.abs(along.y) > 1e-9) place.elevation = near((shape.elevation ?? 0) + along.y);
  return place;
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

/**
 * The points of an oval foot's outline at height `y`, the ellipse through (a, 0) and (0, b) round (cx, 0): the whole
 * of it from (cx + a, 0) on, or (`half`) the half beyond x = cx, from (cx, b) round to (cx, -b), its two ends on that
 * line exactly so the faces there stay flat.
 */
function ovalFootRing(mesh: IndexedMesh, cx: number, a: number, b: number, y: number, half: boolean) {
  const pieces = half ? RIB_OVAL_FOOT_SEGMENTS / 2 : RIB_OVAL_FOOT_SEGMENTS;
  const count = half ? pieces + 1 : pieces;
  return Array.from({ length: count }, (_, k) => {
    if (half && (k === 0 || k === pieces)) return { index: mesh.point(cx, y, k === 0 ? b : -b), x: cx, z: k === 0 ? b : -b };
    const angle = half ? Math.PI / 2 - (Math.PI * k) / pieces : (2 * Math.PI * k) / pieces;
    const x = cx + a * Math.cos(angle), z = b * Math.sin(angle);
    return { index: mesh.point(x, y, z), x, z };
  });
}

/** A flat face through the points (x, z) at their indices, as a shape with holes in it, each a loop of its own. */
function fillFlat(mesh: IndexedMesh, outer: Array<{ index: number; x: number; z: number }>, holes: Array<Array<{ index: number; x: number; z: number }>> = []) {
  const all = [outer, ...holes].flat();
  const flat = (loop: typeof outer) => loop.map((p) => new THREE.Vector2(p.x, p.z));
  THREE.ShapeUtils.triangulateShape(flat(outer), holes.map(flat)).forEach(([a, b, c]) => mesh.tri(all[a].index, all[b].index, all[c].index));
}

/** An oval foot's side, between its outline on the floor and at its top: all round, or a gusset's from wall to wall. */
function addOvalPlateSides(mesh: IndexedMesh, low: ReturnType<typeof ovalFootRing>, high: ReturnType<typeof ovalFootRing>, closed: boolean) {
  const n = low.length;
  for (let k = 0; k + 1 < n || (closed && k < n); k += 1) {
    const j = (k + 1) % n;
    mesh.quad(low[k].index, low[j].index, high[j].index, high[k].index);
  }
}

/**
 * The straight rib on its oval foot: the rib's cross-section above the foot pushed along its length, open at its
 * bottom, and the foot's plate round it, the plate's top a face with the rib's footprint as a hole, where the rib's
 * walls meet it.
 */
function addRibOnOvalFoot(mesh: IndexedMesh, length: number, height: number, thickness: number, top: RibTop, foot: RibFoot) {
  const base = foot.thickness;
  const { left, right } = addPrismAlongX(mesh, ribProfileOnFoot(thickness, height, top, base), length, [0]);
  const low = ovalFootRing(mesh, 0, foot.length / 2, foot.width / 2, 0, false);
  const high = ovalFootRing(mesh, 0, foot.length / 2, foot.width / 2, base, false);
  addOvalPlateSides(mesh, low, high, true);
  fillFlat(mesh, low);
  const half = thickness / 2;
  const at = (index: number, x: number, z: number) => ({ index, x, z });
  fillFlat(mesh, high, [[at(left[0], -length / 2, -half), at(right[0], length / 2, -half), at(right[1], length / 2, half), at(left[1], -length / 2, half)]]);
}

/**
 * The gusset on its oval foot, in the box's frame (x along the floor, the wall at -foot.length / 2, z across): the
 * gusset's side above the foot pushed across its thickness, open at its bottom, standing on half an ellipse whose
 * straight side lies against the wall. At the wall the gusset's end and the plate's are one face, as on the square
 * foot; the plate's top is the half ellipse with the gusset's footprint taken out of it, a U open towards the wall.
 * Where the gusset's top comes down to the foot (a foot thicker than the tip is high) the gusset ends in it there.
 */
function addGussetOnOvalFoot(mesh: IndexedMesh, width: number, height: number, thickness: number, foot: RibFoot) {
  const e = gussetEnd(width, height);
  const ft = foot.thickness;
  const wall = -foot.length / 2;
  const x1 = wall + e;
  const x2 = wall + width;
  // The side above the foot, counter-clockwise from the wall at the foot's top: along the foot to the tip (or to where
  // the top comes down into the foot), up the tip, the sloping top, the short top at the wall, and down the wall.
  const side: Array<[number, number]> = e > ft + 1e-9
    ? [[wall, ft], [x2, ft], [x2, e], [x1, height], [wall, height]]
    : [[wall, ft], [x1 + ((height - ft) / (height - e)) * (x2 - x1), ft], [x1, height], [wall, height]];
  const t = thickness / 2;
  const right = side.map(([x, y]) => mesh.point(x, y, t));
  const left = side.map(([x, y]) => mesh.point(x, y, -t));
  const n = side.length;
  // Both sides are convex, fanned from the corner at the wall; across between them the tip, the tops, not the bottom
  // (0 -> 1), which stands on the foot, nor the wall (n - 1 -> 0), which is one face with the plate's end.
  for (let i = 1; i + 1 < n; i += 1) {
    mesh.tri(right[0], right[i], right[i + 1]);
    mesh.tri(left[0], left[i + 1], left[i]);
    mesh.quad(right[i], right[i + 1], left[i + 1], left[i]);
  }
  const low = ovalFootRing(mesh, wall, foot.length, foot.width / 2, 0, true);
  const high = ovalFootRing(mesh, wall, foot.length, foot.width / 2, ft, true);
  addOvalPlateSides(mesh, low, high, false);
  fillFlat(mesh, low);
  const at = (index: number, [x]: [number, number], z: number) => ({ index, x, z });
  fillFlat(mesh, [...high, at(left[0], side[0], -t), at(left[1], side[1], -t), at(right[1], side[1], t), at(right[0], side[0], t)]);
  // The end at the wall, as on the square foot: the plate's end fanned from its bottom corner, the gusset's above it.
  const r = [low[low.length - 1].index, low[0].index, high[0].index, right[0], right[n - 1], left[n - 1], left[0], high[high.length - 1].index];
  mesh.tri(r[0], r[1], r[2]);
  mesh.tri(r[0], r[2], r[3]);
  mesh.tri(r[0], r[3], r[6]);
  mesh.tri(r[0], r[6], r[7]);
  mesh.quad(r[3], r[4], r[5], r[6]);
}

export function ribMesh(shape: RibFields) {
  const { style, top, width, height, thickness, foot } = ribSize(shape);
  const mesh = new IndexedMesh();
  if (style === "gusset") {
    if (foot?.shape === "oval") {
      addGussetOnOvalFoot(mesh, width, height, thickness, foot);
      return mesh;
    }
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
  if (foot?.shape === "oval") addRibOnOvalFoot(mesh, width, height, thickness, top, foot);
  else addPrismAlongX(mesh, ribProfile(thickness, height, top, foot), width);
  return mesh;
}

export function createRibGeometry(shape: RibFields): THREE.BufferGeometry {
  return ribMesh(shape).geometry(30);
}
