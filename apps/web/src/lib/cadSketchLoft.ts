import { JoinType, type OcctKernel, type ShapeHandle } from "occt-wasm";
import { cadSketchRegions, orderedCadSketchPaths, type OrderedCadSketchPath } from "@/lib/sketchCadProfile";
import { pathWire } from "@/lib/sketchCadWire";
import type { SketchProfile, SketchStroke } from "@/types/layerling";

/**
 * A loft between two sketches: the outline of one sketch body at the bottom, the outline of another at the top,
 * and straight walls between them, as the kernel's loft makes them (ThruSections). A hole in both outlines - a
 * ring, say - is lofted the same way and cut out, so two frames give a hollow wall.
 *
 * The sketches are drawn in their own coordinates; `SketchLoftPlace` puts each one where its body stands.
 */
export type SketchLoftPlace = {
  /** The middle of the sketch's outlines in its own coordinates: it goes to (x, z). */
  centerX: number;
  centerZ: number;
  x: number;
  z: number;
  /** The height of the section: the bottom of the lower body, the top of the upper one. */
  y: number;
  /** The body's turn about the vertical, in degrees, and its mirroring. */
  rotation: number;
  mirrorX?: boolean;
  mirrorZ?: boolean;
};

/** One end of the loft: a sketch, the line it is built as if it has one, and where its body stands. */
export type SketchLoftSection = { profile: SketchProfile; stroke?: SketchStroke; place: SketchLoftPlace };

/** The worker's answer when the two sketches do not have one outline each. */
export const SKETCH_LOFT_OUTLINES = "loft-outlines";
/** The worker's answer when the two outlines have a different number of holes. */
export const SKETCH_LOFT_HOLES = "loft-holes";
/** The worker's answer when the kernel cannot loft the outlines into one solid. */
export const SKETCH_LOFT_FAILED = "loft-failed";
/** The worker's answer when a sketch's line cannot be moved by the kernel; its outline is then sent as straight pieces. */
export const SKETCH_LOFT_STROKE_UNSUPPORTED = "loft-stroke-unsupported";

/** The 3x4 matrix, row by row, that takes a point of the sketch (x, 0, z) to the world. */
export function sketchLoftMatrix(place: SketchLoftPlace): number[] {
  const turn = (place.rotation * Math.PI) / 180;
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  const mx = place.mirrorX ? -1 : 1;
  const mz = place.mirrorZ ? -1 : 1;
  // Mirrored first, then turned about the vertical as three turns a body: x' = x cos + z sin, z' = -x sin + z cos.
  const xx = mx * cos;
  const xz = mz * sin;
  const zx = -mx * sin;
  const zz = mz * cos;
  return [
    xx, 0, xz, place.x - (xx * place.centerX + xz * place.centerZ),
    0, 1, 0, place.y,
    zx, 0, zz, place.z - (zx * place.centerX + zz * place.centerZ),
  ];
}

type Loop = { wire: ShapeHandle; middle: { x: number; z: number } };
type Section = { outer: Loop; holes: Loop[] };

function pathMiddle(path: OrderedCadSketchPath) {
  const sum = path.points.reduce((total, point) => ({ x: total.x + point.x, z: total.z + point.z }), { x: 0, z: 0 });
  const count = Math.max(1, path.points.length);
  return { x: sum.x / count, z: sum.z / count };
}

/** The outline moved out by `delta` (in by a negative one), exactly, or null where the kernel cannot. */
function movedWire(cad: OcctKernel, wire: ShapeHandle, delta: number, join: number): ShapeHandle | null {
  if (delta === 0) return wire;
  const area = cad.getSurfaceArea(cad.makeFace(wire));
  // Which way the kernel moves depends on the way the outline runs: the side that grows or shrinks as asked is the one.
  for (const sign of [1, -1]) {
    try {
      const moved = cad.offsetWire2D(wire, sign * delta, join);
      const movedArea = cad.getSurfaceArea(cad.makeFace(moved));
      if (movedArea > 1e-9 && (delta > 0 ? movedArea > area : movedArea < area)) return moved;
    } catch {
      // The other way, or the straight pieces.
    }
  }
  return null;
}

/** The loops of one end in the sketch's plane: its outline and holes, or the two sides of its line. */
function sectionLoops(cad: OcctKernel, profile: SketchProfile, stroke?: SketchStroke): Section {
  if (stroke) {
    const paths = orderedCadSketchPaths(profile).filter((path) => path.closed);
    if (paths.length !== 1 || stroke.join === "bevel" || !(stroke.align === "outside" || stroke.align === "inside" || stroke.align === "center")) {
      throw new Error(SKETCH_LOFT_STROKE_UNSUPPORTED);
    }
    const base = pathWire(cad, paths[0]);
    const join = stroke.join === "round" ? JoinType.Arc : JoinType.Intersection;
    const out = stroke.align === "outside" ? stroke.width : stroke.align === "center" ? stroke.width / 2 : 0;
    const outer = movedWire(cad, base, out, join);
    const inner = movedWire(cad, base, out - stroke.width, join);
    if (!outer || !inner) throw new Error(SKETCH_LOFT_STROKE_UNSUPPORTED);
    const middle = pathMiddle(paths[0]);
    return { outer: { wire: outer, middle }, holes: [{ wire: inner, middle }] };
  }
  const regions = cadSketchRegions(profile);
  if (regions.length !== 1) throw new Error(SKETCH_LOFT_OUTLINES);
  const loop = (path: OrderedCadSketchPath): Loop => ({ wire: pathWire(cad, path), middle: pathMiddle(path) });
  return { outer: loop(regions[0].outer), holes: regions[0].holes.map(loop) };
}

function placed(cad: OcctKernel, loop: Loop, matrix: number[]): Loop {
  return {
    wire: cad.transform(loop.wire, matrix),
    middle: { x: matrix[0] * loop.middle.x + matrix[2] * loop.middle.z + matrix[3], z: matrix[8] * loop.middle.x + matrix[10] * loop.middle.z + matrix[11] },
  };
}

/** Each hole of the upper end goes with the hole of the lower one whose middle is nearest. */
function pairedHoles(lower: Loop[], upper: Loop[]) {
  const remaining = [...upper];
  const distance = (a: Loop, b: Loop) => Math.hypot(a.middle.x - b.middle.x, a.middle.z - b.middle.z);
  return lower.map((hole) => {
    let best = 0;
    remaining.forEach((entry, index) => {
      if (distance(entry, hole) < distance(remaining[best], hole)) best = index;
    });
    const [partner] = remaining.splice(best, 1);
    return [hole, partner] as const;
  });
}

function loftedSolid(cad: OcctKernel, lower: ShapeHandle, upper: ShapeHandle) {
  const lofted = cad.loft([lower, upper], true, true);
  const solids = cad.isSolid(lofted) ? [lofted] : cad.getSubShapes(lofted, "solid");
  if (solids.length !== 1) throw new Error(SKETCH_LOFT_FAILED);
  // An outline running clockwise lofts inside out; turned the right way it is the same body.
  return cad.getVolume(solids[0]) < 0 ? cad.reverseShape(solids[0]) : solids[0];
}

/** The loft from the outline of the bottom sketch to the outline of the top one, each placed where its body stands. */
export function buildSketchLoftSolid(cad: OcctKernel, bottom: SketchLoftSection, top: SketchLoftSection): ShapeHandle {
  const lowerMatrix = sketchLoftMatrix(bottom.place);
  const upperMatrix = sketchLoftMatrix(top.place);
  const lowerLoops = sectionLoops(cad, bottom.profile, bottom.stroke);
  const upperLoops = sectionLoops(cad, top.profile, top.stroke);
  if (lowerLoops.holes.length !== upperLoops.holes.length) throw new Error(SKETCH_LOFT_HOLES);
  const lower = { outer: placed(cad, lowerLoops.outer, lowerMatrix), holes: lowerLoops.holes.map((hole) => placed(cad, hole, lowerMatrix)) };
  const upper = { outer: placed(cad, upperLoops.outer, upperMatrix), holes: upperLoops.holes.map((hole) => placed(cad, hole, upperMatrix)) };
  let result = loftedSolid(cad, lower.outer.wire, upper.outer.wire);
  for (const [hole, partner] of pairedHoles(lower.holes, upper.holes)) {
    result = cad.cut(result, loftedSolid(cad, hole.wire, partner.wire));
  }
  const solids = cad.isSolid(result) ? [result] : cad.getSubShapes(result, "solid");
  if (solids.length !== 1 || !cad.isValid(solids[0]) || cad.getVolume(solids[0]) <= 1e-9) throw new Error(SKETCH_LOFT_FAILED);
  return solids[0];
}
