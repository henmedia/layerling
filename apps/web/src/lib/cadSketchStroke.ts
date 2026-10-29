import { JoinType, type BoundingBox, type OcctKernel, type ShapeHandle } from "occt-wasm";
import { cadSketchRegions, orderedCadSketchPaths, type OrderedCadSketchPath } from "@/lib/sketchCadProfile";
import { pathWire } from "@/lib/sketchCadWire";
import { sampledPath } from "@/lib/sketchStroke";
import type { SketchProfile, SketchStroke } from "@/types/layerling";

/** Round corners, and corners carried on to a point. */
const JOIN_ARC = JoinType.Arc;
const JOIN_INTERSECTION = JoinType.Intersection;
/** A miter longer than this many times the half width is cut off in the polygon stroke; here the polygon stroke does it. */
const MITER_LIMIT = 4;

/**
 * Whether a drawn corner is too sharp for the kernel's pointed corner: it carries on without a
 * limit, where the stroke cuts a spike off beyond MITER_LIMIT (sketchStroke.ts).
 */
function hasSpikeCorner(path: OrderedCadSketchPath): boolean {
  const points = sampledPath(path);
  const count = points.length;
  for (let index = 0; index < count; index += 1) {
    const before = points[(index + count - 1) % count];
    const corner = points[index];
    const after = points[(index + 1) % count];
    const ax = corner.x - before.x;
    const az = corner.z - before.z;
    const bx = after.x - corner.x;
    const bz = after.z - corner.z;
    const lengths = Math.hypot(ax, az) * Math.hypot(bx, bz);
    if (lengths < 1e-12) continue;
    const cosTurn = (ax * bx + az * bz) / lengths;
    // The miter is 1 / cos(turn / 2) times the half width.
    if (Math.sqrt(Math.max(0, (1 + cosTurn) / 2)) < 1 / MITER_LIMIT) return true;
  }
  return false;
}

/** The area inside an outline as a flat prism `height` tall, the outline moved out by `delta` (in by a negative one). Null when the kernel cannot move it. */
function filledLoop(cad: OcctKernel, path: OrderedCadSketchPath, delta: number, join: number, height: number): ShapeHandle | null {
  const wire = pathWire(cad, path);
  const base = cad.makeFace(wire);
  if (delta === 0) return cad.extrude(base, 0, height, 0);
  const offset = cad.offsetWire2D(wire, delta, join);
  const face = cad.makeFace(offset);
  const baseArea = cad.getSurfaceArea(base);
  const area = cad.getSurfaceArea(face);
  // Out must be wider, in narrower and not gone: a collapsed or turned-inside-out offset is no result.
  if (!(area > 1e-9) || (delta > 0 ? area <= baseArea : area >= baseArea)) return null;
  return cad.extrude(face, 0, height, 0);
}

/** The material of one region - its outline and the holes in it - moved out by `delta` (the holes shrink then). */
function regionPrism(cad: OcctKernel, region: ReturnType<typeof cadSketchRegions>[number], delta: number, join: number, height: number): ShapeHandle | null {
  let solid = filledLoop(cad, region.outer, delta, join, height);
  if (!solid) return null;
  for (const hole of region.holes) {
    const hollow = filledLoop(cad, hole, -delta, join, height + 2);
    if (!hollow) return null;
    solid = cad.cut(solid, cad.translate(hollow, 0, -1, 0));
  }
  return solid;
}

/**
 * A stroked sketch (#154) or a widened one (#215) as an exact solid: the closed outlines moved
 * in or out by the kernel, so a line stays a plane, an arc a cylinder and a curve a single
 * spline face - not the hundreds of short straight pieces the polygon stroke makes, which the
 * edge tool cannot work on and which show as stripes. Null whenever the polygon stroke has to
 * do it: open lines, bevelled corners (the kernel has none), a pointed corner that would run
 * into a spike, a stroke wider than the outline allows, or any failure of the kernel.
 */
export function buildStrokedSketchSolid(cad: OcctKernel, profile: SketchProfile, stroke: SketchStroke, height: number): ShapeHandle | null {
  if (stroke.join === "bevel") return null;
  if (orderedCadSketchPaths(profile).some((path) => !path.closed)) return null;
  let regions: ReturnType<typeof cadSketchRegions>;
  try {
    regions = cadSketchRegions(profile);
  } catch {
    return null;
  }
  if (!regions.length) return null;
  const join = stroke.join === "round" ? JOIN_ARC : JOIN_INTERSECTION;
  if (stroke.join === "miter" && regions.some((region) => [region.outer, ...region.holes].some(hasSpikeCorner))) return null;
  try {
    const [outerDelta, innerDelta] = stroke.align === "inside"
      ? [0, -stroke.width]
      : stroke.align === "outside"
        ? [stroke.width, 0]
        : stroke.align === "grow"
          ? [stroke.width, null]
          : stroke.align === "shrink"
            ? [-stroke.width, null]
            : [stroke.width / 2, -stroke.width / 2];
    let result: ShapeHandle | null = null;
    const pieceBoxes: BoundingBox[] = [];
    for (const region of regions) {
      const outer = regionPrism(cad, region, outerDelta, join, height);
      if (!outer) return null;
      let piece = outer;
      if (innerDelta !== null) {
        const inner = regionPrism(cad, region, innerDelta, join, height + 2);
        if (!inner) return null;
        piece = cad.cut(outer, cad.translate(inner, 0, -1, 0));
      }
      pieceBoxes.push(cad.getBoundingBox(piece, false));
      result = result ? cad.fuse(result, piece) : piece;
    }
    if (!result || !cad.isValid(result) || !(cad.getVolume(result) > 1e-9)) return null;
    // Two walls grown into each other can lose one of them in the fuse, and the rest is still a valid solid (#982: the rim of a
    // mirrored "Rb" kept the R alone). The whole has to reach as far as every piece did.
    const box = cad.getBoundingBox(result, false);
    const reach = 1e-3;
    if (pieceBoxes.some((piece) => piece.xmin < box.xmin - reach || piece.xmax > box.xmax + reach || piece.zmin < box.zmin - reach || piece.zmax > box.zmax + reach)) return null;
    return result;
  } catch (error) {
    // A kernel that has crashed is for the caller to reset; any other failure is the polygon route's to handle.
    if (/memory|WebAssembly|abort/i.test(error instanceof Error ? error.message : String(error))) throw error;
    return null;
  }
}

/** Closer than this to the top, in mm, a point of an edge lies on it. */
const TOP_TOLERANCE = 1e-4;
/**
 * More rim pieces than this take no cutting edge: an outline cut from a body's triangles has hundreds of short straight
 * pieces, and one try of the kernel at chamfering 1 670 of them ran 159 s before it failed - the sketch worker stops at 30 s
 * and the cookie cutter failed with it (#982, a text body "Wera"). A drawn letter has a few dozen.
 */
const MAX_EDGE_PIECES = 200;
/** After this many milliseconds no further try is started; the one running cannot be stopped. */
const EDGE_BUDGET_MS = 8000;

/**
 * The rims along the very top of a solid standing from 0 to `height` (y up), split by the top faces' wires: `outer` the outer
 * wire of each top face - the wall's outside - and `inner` the rest, the outline the wall stands round.
 */
function topRims(cad: OcctKernel, solid: ShapeHandle, height: number) {
  const outer: ShapeHandle[] = [];
  const inner: ShapeHandle[] = [];
  const spread = (edges: ShapeHandle[]) => {
    const box = cad.getBoundingBox(cad.makeCompound(edges), false);
    return (box.xmax - box.xmin) * (box.zmax - box.zmin);
  };
  for (const face of cad.getSubShapes(solid, "face")) {
    const box = cad.getBoundingBox(face, false);
    if (Math.abs(box.ymin - height) > TOP_TOLERANCE || Math.abs(box.ymax - height) > TOP_TOLERANCE) continue;
    // The outer wire of a flat face reaches furthest; the holes in it lie inside.
    const wires = cad.getSubShapes(face, "wire").map((wire) => cad.getSubShapes(wire, "edge")).filter((edges) => edges.length);
    wires.sort((a, b) => spread(b) - spread(a));
    if (wires.length) outer.push(...wires[0]);
    wires.slice(1).forEach((edges) => inner.push(...edges));
  }
  return { outer, inner };
}

/**
 * A wall with a cutting edge (#982): the rims along the very top of the solid get a 45° chamfer reaching `amount` in from
 * each side, so the top runs in to a narrow edge. The solid stands from 0 to `height` (y up). A cut or a fuse leaves a
 * compound, which the kernel does not chamfer: each solid in it is chamfered on its own. Where the kernel cannot chamfer both
 * rims at once - a tight bend of a letter, where the two chamfers meet - it chamfers them one after the other, and failing
 * that one rim by twice as much, which leaves the same edge on top. Null when no solid has an edge up there, when the rims
 * are too many pieces to try (an outline cut from a body's triangles), or when none of this works in time.
 */
export function chamferTopEdges(cad: OcctKernel, shape: ShapeHandle, height: number, amount: number): ShapeHandle | null {
  const solids = cad.getSubShapes(shape, "solid").map((solid) => ({ solid, ...topRims(cad, solid, height) }));
  const pieces = solids.reduce((sum, { outer, inner }) => sum + outer.length + inner.length, 0);
  if (!pieces || pieces > MAX_EDGE_PIECES) return null;
  const started = performance.now();
  const attempt = (build: () => ShapeHandle) => {
    if (performance.now() - started > EDGE_BUDGET_MS) return null;
    try {
      const result = build();
      return cad.isValid(result) && cad.getVolume(result) > 1e-9 ? result : null;
    } catch (error) {
      if (/memory|WebAssembly|abort/i.test(error instanceof Error ? error.message : String(error))) throw error;
      return null;
    }
  };
  const chamfered: ShapeHandle[] = [];
  for (const { solid, outer, inner } of solids) {
    if (!outer.length && !inner.length) {
      chamfered.push(solid);
      continue;
    }
    const result = attempt(() => cad.chamfer(solid, [...outer, ...inner], amount))
      ?? (outer.length && inner.length
        ? attempt(() => {
          const first = cad.chamfer(solid, outer, amount);
          return cad.chamfer(first, topRims(cad, first, height).inner, amount);
        })
        : null)
      ?? (outer.length ? attempt(() => cad.chamfer(solid, outer, amount * 2)) : null)
      ?? (inner.length ? attempt(() => cad.chamfer(solid, inner, amount * 2)) : null);
    if (!result) return null;
    chamfered.push(result);
  }
  return chamfered.length === 1 ? chamfered[0] : cad.makeCompound(chamfered);
}
