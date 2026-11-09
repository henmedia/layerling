import { JoinType, type BoundingBox, type OcctKernel, type ShapeHandle } from "occt-wasm";
import { isCadModifierWasmMemoryFault } from "@/lib/cadModifierRuntime";
import { shellOpenSides } from "@/lib/shellLimits";
import type { ShellEdges, ShellOpenings, ShellSide } from "@/types/layerling";
import { isKernelMemoryFault } from "@/lib/kernelFault";

// Hollowing ("shell") for the CAD modifier worker. It lives outside the worker
// so the end-to-end tests can run it against the real OCCT kernel.

export function orientedFaceNormal(cad: OcctKernel, face: ShapeHandle, point: { x: number; y: number; z: number }) {
  const uv = cad.uvFromPoint(face, point);
  // surfaceNormal already honours the face orientation (see shellOpeningFacesBySide);
  // flipping a reversed face again turned its normal inward.
  const normal = cad.surfaceNormal(face, uv.u, uv.v);
  const length = Math.hypot(normal.x, normal.y, normal.z) || 1;
  return { x: normal.x / length, y: normal.y / length, z: normal.z / length };
}

function shapeIsValid(cad: OcctKernel, shape: ShapeHandle) {
  try {
    return Boolean(cad.isValid(shape));
  } catch (error) {
    if (isKernelMemoryFault(error)) throw error;
    return false;
  }
}

/**
 * Whether a failure is more than a verdict on the distance: a missing kernel function, or a WebAssembly fault after which
 * the kernel must be started again. Those go up to the worker instead of being read as "too thick" or "too far".
 */
function mustSurface(error: unknown) {
  if (!(error instanceof Error)) return false;
  return /is not a function/.test(error.message) || isCadModifierWasmMemoryFault(error.message, error.name);
}

function releaseAll(cad: OcctKernel, handles: ShapeHandle[]) {
  handles.forEach((handle) => {
    try {
      cad.release(handle);
    } catch {
      // already gone
    }
  });
}

const SIDE_AXES: Record<ShellSide, { axis: "x" | "y" | "z"; sign: 1 | -1 }> = {
  top: { axis: "y", sign: 1 },
  bottom: { axis: "y", sign: -1 },
  front: { axis: "z", sign: 1 },
  back: { axis: "z", sign: -1 },
  right: { axis: "x", sign: 1 },
  left: { axis: "x", sign: -1 },
};

/**
 * The planar faces a hollowed body leaves open, grouped by side: on each side
 * the ones that face straight out along that axis and sit at the very edge of
 * the solid - the lid of a box, the end of a cylinder, the front of a drawer
 * slot.
 */
export function shellOpeningFacesBySide(cad: OcctKernel, solid: ShapeHandle, faces: ShapeHandle[], openings: ShellOpenings) {
  const sides = shellOpenSides(openings);
  const found = new Map<ShellSide, ShapeHandle[]>(sides.map((side) => [side, []]));
  if (sides.length === 0) return found;
  const bounds = cad.getBoundingBox(solid, false);
  const extent = { x: [bounds.xmin, bounds.xmax], y: [bounds.ymin, bounds.ymax], z: [bounds.zmin, bounds.zmax] } as const;
  faces.forEach((face) => {
    if (cad.surfaceType(face) !== "plane") return;
    const center = cad.getSurfaceCenterOfMass(face);
    // surfaceNormal already honours the face orientation here, so it points
    // out of the solid as it is (checked against a box in cadShell.e2e.ts).
    const uv = cad.uvFromPoint(face, center);
    const raw = cad.surfaceNormal(face, uv.u, uv.v);
    const length = Math.hypot(raw.x, raw.y, raw.z) || 1;
    sides.forEach((side) => {
      const { axis, sign } = SIDE_AXES[side];
      const [min, max] = extent[axis];
      const tolerance = Math.max(1e-4, (max - min) * 1e-4);
      const facesOut = (raw[axis] / length) * sign > 0.999;
      const atEdge = Math.abs(center[axis] - (sign > 0 ? max : min)) <= tolerance;
      if (facesOut && atEdge) found.get(side)?.push(face);
    });
  });
  // No flat face square to a side, as on a box whose top was cut off at an angle (Discussion #1544): the flat face
  // that leans that way most and reaches furthest out on it is that side's opening - the sloping top.
  sides.forEach((side) => {
    if ((found.get(side)?.length ?? 0) > 0) return;
    const { axis, sign } = SIDE_AXES[side];
    const [min, max] = extent[axis];
    const tolerance = Math.max(1e-4, (max - min) * 1e-4);
    const candidates = faces.flatMap((face) => {
      if (cad.surfaceType(face) !== "plane") return [];
      const normal = orientedFaceNormal(cad, face, cad.getSurfaceCenterOfMass(face));
      if (normal[axis] * sign < SLANTED_OPENING_MIN_COSINE) return [];
      const box = cad.getBoundingBox(face, false);
      const reach = sign > 0 ? box[`${axis}max`] : -box[`${axis}min`];
      return [{ face, reach, area: cad.getSurfaceArea(face) }];
    });
    if (candidates.length === 0) return;
    const furthest = Math.max(...candidates.map((candidate) => candidate.reach));
    const reaching = candidates.filter((candidate) => candidate.reach >= furthest - tolerance);
    // Faces the slope was cut into (a groove across it) all lie in one plane; the largest one stands for it.
    const largest = reaching.reduce((best, candidate) => (candidate.area > best.area ? candidate : best));
    found.get(side)?.push(largest.face);
  });
  return found;
}

/** A sloping face counts as a side's opening while it leans no more than 60 degrees away from facing that side. */
const SLANTED_OPENING_MIN_COSINE = 0.5;

/**
 * An inward offset of a body with an inner corner comes back as a closed shell
 * rather than a solid, and a boolean cut with a bare shell fails. Close it.
 */
function cavityFromOffset(cad: OcctKernel, offset: ShapeHandle) {
  if (cad.getShapeType(offset) !== "shell") return offset;
  try {
    return cad.makeSolid(offset);
  } finally {
    cad.release(offset);
  }
}

/**
 * Hollows a body whose open face the kernel's thick solid cannot take: a face with a pocket in it, such
 * as the top of a block with a blind pocket, or a ring (forum, #302). The body is grown by a slab on
 * each open face, the inward offset of that closed body is its cavity - the way a body closed on every
 * side is hollowed, which the kernel does well - and the cavity is cut from the body as it was. The
 * slab is taller than the wall, so the cavity reaches right up to the open face and through it.
 */
function shellByExtension(cad: OcctKernel, solid: ShapeHandle, open: ShapeHandle[], wall: number, tolerance: number, joinType: JoinType.Arc | JoinType.Intersection, cutFrom: ShapeHandle = solid) {
  const handles: ShapeHandle[] = [];
  try {
    let grown = cad.copy(solid);
    handles.push(grown);
    for (const face of open) {
      const normal = orientedFaceNormal(cad, face, cad.getSurfaceCenterOfMass(face));
      const reach = wall * 2 + 1e-3;
      const slab = cad.extrude(face, normal.x * reach, normal.y * reach, normal.z * reach);
      handles.push(slab);
      const fused = cad.unifySameDomain(cad.fuse(grown, slab));
      handles.push(fused);
      grown = fused;
    }
    const cavity = hollowCavity(cad, grown, wall, tolerance, joinType);
    handles.push(cavity);
    return cad.cut(cutFrom, cavity);
  } finally {
    releaseAll(cad, handles);
  }
}

/**
 * Hollows a body whose rounded outside edges are no wider than the wall (#1521: an enclosure rounded
 * by 1 mm with 2 mm walls). Inside such a wall the rounding has no say, so the cavity is that of the
 * body with sharp edges, grown over its open faces like shellByExtension, and cut from the body as it
 * is: the outside keeps its roundings.
 */
function shellBySharpenedExtension(cad: OcctKernel, solid: ShapeHandle, sharp: ShapeHandle | null, openings: ShellOpenings, wall: number, tolerance: number, joinType: JoinType.Arc | JoinType.Intersection) {
  if (sharp === null) throw new Error("invalid shell");
  const faces = cad.getSubShapes(sharp, "face");
  try {
    const open = [...shellOpeningFacesBySide(cad, sharp, faces, openings).values()].flat();
    if (open.length === 0) throw new Error("invalid shell");
    return shellByExtension(cad, sharp, open, wall, tolerance, joinType, solid);
  } finally {
    releaseAll(cad, faces);
  }
}

/** The raw messages of a hollowing that failed; the editor words them for the person (cadModifierRuntime). */
export const TOO_THICK_MESSAGE = "The walls cannot be this thick for this body. Choose a thinner wall.";
export const CANNOT_HOLLOW_MESSAGE = "This body cannot be hollowed with any wall thickness.";
/** The thin wall tried when a hollowing fails, to tell a wall that is too thick from a body that cannot be hollowed. */
const PROBE_WALL = 0.05;
const MIN_PROBE_WALL = 0.01;

/**
 * Hollows one solid to walls of `thickness`, measured inward.
 *
 * With faces to open this is OCCT's thick solid. A body closed on every side
 * has nothing to remove, so its cavity is cut out with an inward offset copy
 * instead. The precise tolerance is tried first; the coarser one survives more
 * curved inputs.
 */
function shellBody(cad: OcctKernel, solid: ShapeHandle, thickness: number, openings: ShellOpenings, edges: ShellEdges) {
  // Rounded inner corners are tried first. An outline made of many short straight pieces, such as
  // a traced drawing, can defeat the arc joins at every wall thickness while sharp joins build it
  // without trouble (forum 618422), so a rounded request falls back to sharp ones.
  const joinTypes: Array<JoinType.Arc | JoinType.Intersection> = edges === "sharp" ? [JoinType.Intersection] : [JoinType.Arc, JoinType.Intersection];
  const faces = cad.getSubShapes(solid, "face");
  try {
    const bySide = shellOpeningFacesBySide(cad, solid, faces, openings);
    const open = [...bySide.values()].flat();
    // A side asked for by name must be there. The old frame ("top-bottom")
    // was content with either end, so it still is.
    const missing = [...bySide.entries()].find(([, sideFaces]) => sideFaces.length === 0)?.[0];
    if (missing && (Array.isArray(openings) || open.length === 0)) {
      throw new Error(`This body has no flat ${missing} face to leave open`);
    }
    // Past the thickness a body can take, OCCT may hand back the untouched
    // solid as a "valid" result - a hollow body has to lose volume.
    const solidVolume = cad.getVolume(solid);
    let lastError: unknown = null;
    const attempt = (wall: number): ShapeHandle | null => {
      // The body without the rounded edges the wall swallows, worked out once for every try below.
      let sharp: ShapeHandle | null | undefined;
      const sharpened = () => (sharp === undefined ? (sharp = withoutSmallOutsideRounds(cad, solid, wall)) : sharp);
      try {
        return attemptWith(wall, sharpened);
      } finally {
        if (sharp) cad.release(sharp);
      }
    };
    const attemptWith = (wall: number, sharpened: () => ShapeHandle | null): ShapeHandle | null => {
      for (const joinType of joinTypes) {
        for (const tolerance of [1e-6, 1e-3]) {
          // With faces to open, the thick solid first; where it fails (a face with a pocket in it), the
          // body grown over the open faces. A closed body is hollowed with the offset of itself.
          const builds: Array<() => ShapeHandle> = open.length > 0
            ? [
              () => cad.shell(solid, open, wall, tolerance, joinType),
              () => shellByExtension(cad, solid, open, wall, tolerance, joinType),
              () => shellBySharpenedExtension(cad, solid, sharpened(), openings, wall, tolerance, joinType),
            ]
            : [() => {
              const cavity = hollowCavity(cad, solid, wall, tolerance, joinType, sharpened);
              try {
                return cad.cut(solid, cavity);
              } finally {
                cad.release(cavity);
              }
            }];
          for (const build of builds) {
            try {
              const result = build();
              const volume = shapeIsValid(cad, result) ? cad.getVolume(result) : 0;
              if (volume > 0 && volume < solidVolume * (1 - 1e-6)) return result;
              cad.release(result);
              lastError = new Error("invalid shell");
            } catch (error) {
              // A missing kernel function or a kernel fault is not a verdict on the wall thickness.
              if (mustSurface(error)) throw error;
              lastError = error;
            }
          }
        }
      }
      return null;
    };
    // An upright prism is hollowed through its outline first (shellByOutline): the same walls, and the
    // kernel's thick solid is never asked, which on some outlines does not come back at all.
    const outlined = shellByOutline(cad, solid, thickness, openings, edges);
    if (outlined) return outlined;
    // A top cut off at an angle and left open: through the walls' outline as well (Discussion #1544).
    const slopedTop = open.length > 0 && shellOpenSides(openings).every((side) => side === "top")
      && open.some((face) => orientedFaceNormal(cad, face, cad.getSurfaceCenterOfMass(face)).y < 0.999);
    if (slopedTop) {
      const below = shellBelowSlopedTop(cad, solid, thickness, open, edges);
      if (below) return below;
    }
    const probe = Math.max(MIN_PROBE_WALL, Math.min(thickness / 4, PROBE_WALL));
    if (outlined === null && thickness > probe * 1.01) {
      const thin = shellByOutline(cad, solid, probe, openings, edges);
      if (thin) {
        cad.release(thin);
        throw new Error(TOO_THICK_MESSAGE);
      }
    }
    const hollowed = attempt(thickness);
    if (hollowed) return hollowed;
    if (lastError instanceof Error && lastError.message.startsWith("This body")) throw lastError;
    // Every failure used to be reported as "too thick", also at 0.2 mm. Only a body that can be
    // hollowed with a very thin wall is a body whose wall was too thick. A body that fails even
    // then is not clean for the kernel (forum 618422: an imported house whose door was cut down
    // to its bottom edge, so that the cutout touches the outline).
    if (thickness > probe * 1.01) {
      const thin = attempt(probe);
      if (thin) {
        cad.release(thin);
        throw new Error(TOO_THICK_MESSAGE);
      }
    }
    throw new Error(CANNOT_HOLLOW_MESSAGE);
  } finally {
    releaseAll(cad, faces);
  }
}

/**
 * A face for the wire moved by `distance` outward (negative: inward), checked by its area; null when the kernel
 * cannot. Which way a wire moves depends on how it runs, so the way whose area changes as it should is the one. The
 * moved outline must lie where it should, too: a wire of many small arcs (an STL rebuilt with arcs) came back with
 * arcs of no length in it, its face was "valid" and still bigger than its own area, and every cut with it failed.
 */
function movedOutlineFace(cad: OcctKernel, wire: ShapeHandle, distance: number, joinTypes: Array<JoinType.Arc | JoinType.Intersection>, keep: (handle: ShapeHandle) => ShapeHandle) {
  const original = keep(cad.makeFace(wire));
  const base = cad.getSurfaceArea(original);
  for (const joinType of joinTypes) {
    for (const sign of [1, -1]) {
      try {
        const face = keep(cad.makeFace(keep(cad.offsetWire2D(wire, sign * distance, joinType))));
        const area = cad.getSurfaceArea(face);
        if (!(area > 1e-9 && (distance > 0 ? area > base + 1e-9 : area < base - 1e-9))) continue;
        // Moved inward, the face lies within the outline; moved outward, the outline lies within it.
        const shared = cad.getSurfaceArea(keep(cad.common(original, face)));
        const expected = distance > 0 ? base : area;
        if (Math.abs(shared - expected) <= Math.max(1e-6, expected * 1e-4)) return face;
      } catch (error) {
        if (mustSurface(error)) throw error;
        // The other way round, or nothing.
      }
    }
  }
  return null;
}

/**
 * The wire as a closed outline of straight pieces, its curves sampled within `deflection`; null when the pieces do
 * not join up. The kernel's 2D offset takes such an outline where it fails on a run of small arcs.
 */
function polygonWire(cad: OcctKernel, wire: ShapeHandle, deflection: number, keep: (handle: ShapeHandle) => ShapeHandle) {
  const data = cad.wireframe(wire, { deflection });
  const groups = Array.from({ length: data.edgeCount }, (_, index) => ({ start: data.edgeGroups[index * 3], count: data.edgeGroups[index * 3 + 1] }));
  // The groups count points or floats; whichever adds up to all of them.
  const byPoint = groups.reduce((sum, group) => sum + group.count, 0) * 3 === data.pointCount;
  type Point = { x: number; y: number; z: number };
  const pieces = groups.map(({ start, count }) => {
    const points: Point[] = [];
    const first = byPoint ? start * 3 : start;
    const floats = byPoint ? count * 3 : count;
    for (let at = first; at + 2 < first + floats; at += 3) points.push({ x: data.points[at], y: data.points[at + 1], z: data.points[at + 2] });
    return points;
  }).filter((points) => points.length >= 2);
  if (pieces.length === 0) return null;
  const near = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) <= 1e-3;
  const ring = [...pieces.shift()!];
  while (pieces.length > 0) {
    const last = ring[ring.length - 1];
    const index = pieces.findIndex((piece) => near(piece[0], last) || near(piece[piece.length - 1], last));
    if (index < 0) return null;
    const [piece] = pieces.splice(index, 1);
    ring.push(...(near(piece[0], last) ? piece : [...piece].reverse()).slice(1));
  }
  if (!near(ring[0], ring[ring.length - 1])) return null;
  ring.pop();
  const points = ring.filter((point, index) => index === 0 || Math.hypot(point.x - ring[index - 1].x, point.z - ring[index - 1].z) > 1e-6);
  if (points.length < 3) return null;
  return keep(cad.makeWire(points.map((point, index) => keep(cad.makeLineEdge(point, points[(index + 1) % points.length])))));
}

/** Whether a face's normal lies flat everywhere: sampled across its parameter range. */
function standsUpright(cad: OcctKernel, face: ShapeHandle) {
  const { uMin, uMax, vMin, vMax } = cad.uvBounds(face);
  for (const s of [0.05, 0.5, 0.95]) {
    for (const t of [0.05, 0.5, 0.95]) {
      const normal = cad.surfaceNormal(face, uMin + (uMax - uMin) * s, vMin + (vMax - vMin) * t);
      const length = Math.hypot(normal.x, normal.y, normal.z) || 1;
      if (Math.abs(normal.y / length) > 1e-4) return false;
    }
  }
  return true;
}

/** Sampled outlines run within this of the curves they stand for. */
const OUTLINE_DEFLECTION = 0.01;

/**
 * Hollows an upright prism - flat at its bottom and top, every side standing straight - through its outline: the
 * bottom face's outline moved inward by the wall (its holes outward) and pushed up into the cavity, which is cut
 * from the prism. The kernel's thick solid cannot take a wall that makes faces of the side vanish, and on some
 * outlines it does not come back at all (Making Layers, mail 08.11.2026: a box with an oval on it, cut off at the
 * box's side, exported as an STL and imported again; as straight pieces the thick solid failed from a 1.5 mm wall
 * on, rebuilt with arcs it never finished). The 2D offset lets pieces vanish as it should. The walls are the ones the
 * thick solid builds for such a body: the inside corners upright as rounded or as sharp as asked, where walls meet
 * the floor sharp. The outline is moved as it is first; where the kernel cannot move it cleanly, as straight pieces
 * within 0.01 mm of it. Only for openings at the top and the bottom. Undefined when the body is no upright prism or
 * the openings are on its sides, null when it is one but its outline cannot be moved.
 */
function shellByOutline(cad: OcctKernel, solid: ShapeHandle, thickness: number, openings: ShellOpenings, edges: ShellEdges): ShapeHandle | null | undefined {
  const sides = shellOpenSides(openings);
  if (sides.some((side) => side !== "top" && side !== "bottom")) return undefined;
  const made: ShapeHandle[] = [];
  const keep = (handle: ShapeHandle) => {
    made.push(handle);
    return handle;
  };
  try {
    const bounds = cad.getBoundingBox(solid, false);
    const flat = Math.max(1e-4, (bounds.ymax - bounds.ymin) * 1e-5);
    const faces = cad.getSubShapes(solid, "face");
    made.push(...faces);
    const bottoms: ShapeHandle[] = [];
    for (const face of faces) {
      const center = cad.getSurfaceCenterOfMass(face);
      const normal = orientedFaceNormal(cad, face, center);
      if (cad.surfaceType(face) === "plane" && Math.abs(normal.y) > 0.999) {
        if (normal.y < 0 && Math.abs(center.y - bounds.ymin) <= flat) bottoms.push(face);
        else if (!(normal.y > 0 && Math.abs(center.y - bounds.ymax) <= flat)) return undefined;
        continue;
      }
      // Every other face stands upright everywhere, not only at its middle (a bulging vase side is
      // upright at its widest), and runs from the bottom to the top: the body is one layer.
      if (!standsUpright(cad, face)) return undefined;
      const box = cad.getBoundingBox(face, false);
      if (box.ymin > bounds.ymin + flat || box.ymax < bounds.ymax - flat) return undefined;
    }
    if (bottoms.length !== 1) return undefined;
    return hollowedThroughOutline(cad, solid, bottoms[0], bounds, thickness, sides, edges, made, keep, true);
  } catch (error) {
    if (mustSurface(error)) throw error;
    return null;
  } finally {
    releaseAll(cad, made);
  }
}

/**
 * A body standing straight up to a top cut off at an angle (Discussion #1544), with that top open: its outline,
 * taken across halfway up, moved inward by the wall and pushed from the floor up through the sloping top, cut from
 * the body. The kernel's thick solid and the offsets cannot take the round where a rounded box's walls meet its
 * sloping top; they gave the body back untouched or did not finish at all. Undefined when the walls do not stand
 * straight between the floor and the lowest point of the opening, null when the outline cannot be moved.
 */
function shellBelowSlopedTop(cad: OcctKernel, solid: ShapeHandle, thickness: number, open: ShapeHandle[], edges: ShellEdges): ShapeHandle | null | undefined {
  const made: ShapeHandle[] = [];
  const keep = (handle: ShapeHandle) => {
    made.push(handle);
    return handle;
  };
  try {
    const bounds = cad.getBoundingBox(solid, false);
    const flat = Math.max(1e-4, (bounds.ymax - bounds.ymin) * 1e-5);
    const openLow = Math.min(...open.map((face) => cad.getBoundingBox(face, false).ymin));
    const floor = bounds.ymin + thickness;
    if (!(openLow - floor > thickness)) return undefined;
    // The body cut across at a height: the face its slice lies on there, looking down.
    const across = (height: number) => {
      const slab = keep(cad.translate(keep(cad.makeBox(bounds.xmax - bounds.xmin + 2, 0.01, bounds.zmax - bounds.zmin + 2)), bounds.xmin - 1, height, bounds.zmin - 1));
      const faces = cad.getSubShapes(keep(cad.common(solid, slab)), "face");
      made.push(...faces);
      const below = faces.filter((face) => {
        if (cad.surfaceType(face) !== "plane") return false;
        const center = cad.getSurfaceCenterOfMass(face);
        return Math.abs(center.y - height) <= flat && orientedFaceNormal(cad, face, center).y < -0.999;
      });
      return below.length === 1 ? below[0] : null;
    };
    const lower = floor + (openLow - floor) * 0.25;
    const upper = floor + (openLow - floor) * 0.75;
    const low = across(lower);
    const high = across(upper);
    if (!low || !high) return undefined;
    // Straight walls: the same outline low and high.
    const lowArea = cad.getSurfaceArea(low);
    if (!(Math.abs(cad.getSurfaceArea(high) - lowArea) <= lowArea * 1e-4)) return undefined;
    const bottom = keep(cad.translate(low, 0, bounds.ymin - lower, 0));
    return hollowedThroughOutline(cad, solid, bottom, bounds, thickness, ["top"], edges, made, keep, false);
  } catch (error) {
    if (mustSurface(error)) throw error;
    return null;
  } finally {
    releaseAll(cad, made);
  }
}

/**
 * The cavity of shellByOutline: `bottom`'s outline moved inward by the wall (its holes outward), pushed up from the
 * floor (or from below a bottom left open) to under the top (or above a top left open), cut from the body. With
 * `rebuildPrism` the bottom pushed up stands in for a body the cut does not take. The result is taken out of `made`.
 */
function hollowedThroughOutline(
  cad: OcctKernel,
  solid: ShapeHandle,
  bottom: ShapeHandle,
  bounds: BoundingBox,
  thickness: number,
  sides: ShellSide[],
  edges: ShellEdges,
  made: ShapeHandle[],
  keep: (handle: ShapeHandle) => ShapeHandle,
  rebuildPrism: boolean,
): ShapeHandle | null {
  const flat = Math.max(1e-4, (bounds.ymax - bounds.ymin) * 1e-5);
  const wires = cad.getSubShapes(bottom, "wire");
  made.push(...wires);
  const outlines = wires
    .map((wire) => ({ wire, area: cad.getSurfaceArea(keep(cad.makeFace(wire))) }))
    .sort((a, b) => b.area - a.area);
  // Sharp joins first where they are asked for; an outline of many short pieces can defeat them in 2D too, and
  // rounded joins only touch the corners that point into the cavity, so they are the way out.
  const joinTypes: Array<JoinType.Arc | JoinType.Intersection> = edges === "sharp" ? [JoinType.Intersection, JoinType.Arc] : [JoinType.Arc, JoinType.Intersection];
  const low = sides.includes("bottom") ? bounds.ymin - 1 : bounds.ymin + thickness;
  const high = sides.includes("top") ? bounds.ymax + 1 : bounds.ymax - thickness;
  if (high - low <= flat) return null;
  const pushedUp = (face: ShapeHandle) => keep(cad.extrude(keep(cad.translate(face, 0, low - bounds.ymin, 0)), 0, high - low, 0));
  // The outline is moved as it is; where the kernel cannot move it cleanly, as straight pieces. Then the body the
  // cavity is cut from is that outline pushed up too: a prism of arcs and a cavity of straight pieces did not cut.
  const polygons = new Map<ShapeHandle, ShapeHandle | null>();
  const polygonOf = (wire: ShapeHandle) => {
    if (!polygons.has(wire)) polygons.set(wire, polygonWire(cad, wire, OUTLINE_DEFLECTION, keep));
    return polygons.get(wire) ?? null;
  };
  const build = (asPolygon: boolean) => {
    const wireOf = (wire: ShapeHandle) => (asPolygon ? polygonOf(wire) : wire);
    const outer = wireOf(outlines[0].wire);
    const inside = outer ? movedOutlineFace(cad, outer, -thickness, joinTypes, keep) : null;
    if (!inside) return null;
    let cavity = pushedUp(inside);
    for (const { wire } of outlines.slice(1)) {
      const hole = wireOf(wire);
      const around = hole ? movedOutlineFace(cad, hole, thickness, joinTypes, keep) : null;
      if (!around) return null;
      cavity = keep(cad.cut(cavity, pushedUp(around)));
    }
    // The prism to cut from: the body itself, then its bottom face (or its outline as straight pieces, with the
    // holes taken out) pushed up again, built the same way as the cavity.
    // A body that is no prism (its top cut at an angle) is only ever the body itself.
    const base = asPolygon
      ? outlines.slice(1).reduce((face, { wire }) => keep(cad.cut(face, keep(cad.makeFace(polygonOf(wire)!)))), keep(cad.makeFace(outer!)))
      : bottom;
    const rebuilt = rebuildPrism ? [keep(cad.extrude(base, 0, bounds.ymax - bounds.ymin, 0))] : [];
    const prisms = asPolygon ? (rebuildPrism ? rebuilt : [solid]) : [solid, ...rebuilt];
    for (const prism of prisms) {
      // The cut comes back as a compound around the one solid; the hollowed body is that solid.
      const solids = cad.getSubShapes(keep(cad.cut(prism, cavity)), "solid");
      made.push(...solids);
      if (solids.length !== 1) continue;
      const volume = shapeIsValid(cad, solids[0]) ? cad.getVolume(solids[0]) : 0;
      if (volume > 0 && volume < cad.getVolume(solid) * (1 - 1e-6)) return solids[0];
    }
    return null;
  };
  const tried = (asPolygon: boolean) => {
    try {
      return build(asPolygon);
    } catch (error) {
      if (mustSurface(error)) throw error;
      return null;
    }
  };
  const result = tried(false) ?? tried(true);
  if (!result) return null;
  made.splice(made.indexOf(result), 1);
  return result;
}

/** A face smaller than this has no area worth the name; the kernel's own tolerance is far below it. */
const ZERO_AREA_FACE = 1e-4;
/** A face whose area is under this share of the square of its own length is a sliver. */
const SLIVER_RATIO = 1e-3;

/**
 * A copy of the body without its sliver faces, or null when it has none (or they cannot be taken
 * out cleanly). A mesh whose pieces overlapped a little comes out of the conversion with a flat
 * face as long as a finger and thinner than a hair; every other face of the body is fine and still
 * the kernel cannot hollow it (forum 618422: an imported drawing of a house, 0.00 mm2 on a face
 * 8 mm long).
 */
function withoutSliverFaces(cad: OcctKernel, solid: ShapeHandle): ShapeHandle | null {
  const faces = cad.getSubShapes(solid, "face");
  try {
    const slivers = faces.filter((face) => {
      const area = cad.getSurfaceArea(face);
      if (area < ZERO_AREA_FACE) return true;
      const box = cad.getBoundingBox(face, false);
      const lengthSquared = (box.xmax - box.xmin) ** 2 + (box.ymax - box.ymin) ** 2 + (box.zmax - box.zmin) ** 2;
      return area < lengthSquared * SLIVER_RATIO;
    });
    if (slivers.length === 0) return null;
    try {
      const cleaned = cad.defeature(solid, slivers, 1e-4);
      if (cad.isSolid(cleaned) && shapeIsValid(cad, cleaned)) return cleaned;
      cad.release(cleaned);
    } catch (error) {
      if (mustSurface(error)) throw error;
      // The body stays as it is; hollowing it may fail as before.
    }
    return null;
  } finally {
    releaseAll(cad, faces);
  }
}

export function shellSolid(cad: OcctKernel, solid: ShapeHandle, thickness: number, openings: ShellOpenings, edges: ShellEdges = "round") {
  const cleaned = withoutSliverFaces(cad, solid);
  try {
    return shellBody(cad, cleaned ?? solid, thickness, openings, edges);
  } finally {
    if (cleaned !== null) cad.release(cleaned);
  }
}

/** The raw message of an offset that failed; the editor words it for the person (cadModifierRuntime). */
export const CANNOT_OFFSET_MESSAGE = "This body cannot be grown or shrunk by this distance. Choose a smaller distance.";

/**
 * Offsets every face of a body along its normal by `distance`: outward when it grows, inward when it
 * shrinks (#919), the outside of a clearance gap for a press fit. Round corners (the offset surface of
 * an edge is a cylinder) or sharp ones (the faces run on until they meet). The precise tolerance is
 * tried first, the coarser one survives more curved inputs; a result that did not grow or shrink the
 * volume is not an offset.
 */
export function offsetSolid(cad: OcctKernel, solid: ShapeHandle, distance: number, shrink: boolean, edges: ShellEdges = "round") {
  const joinTypes: Array<JoinType.Arc | JoinType.Intersection> = edges === "sharp" ? [JoinType.Intersection] : [JoinType.Arc, JoinType.Intersection];
  const result = checkedOffset(cad, solid, distance, shrink, joinTypes, [1e-6, 1e-3]);
  if (result) return result;
  throw new Error(CANNOT_OFFSET_MESSAGE);
}

/**
 * The offset of a body, tried with each join and tolerance in turn and taken only when it is a closed
 * body where an offset can be; null when none is. Hollowing cuts its cavity with the same (#1521).
 */
function checkedOffset(cad: OcctKernel, solid: ShapeHandle, distance: number, shrink: boolean, joinTypes: Array<JoinType.Arc | JoinType.Intersection>, tolerances: number[], sharpenedOf?: () => ShapeHandle | null) {
  const baseVolume = cad.getVolume(solid);
  const baseBounds = cad.getBoundingBox(solid, false);
  const attempt = (body: ShapeHandle) => {
    for (const joinType of joinTypes) {
      for (const tolerance of tolerances) {
        try {
          const result = cavityFromOffset(cad, cad.offset(body, shrink ? -distance : distance, tolerance, joinType));
          const volume = isClosedSolid(cad, result) && reachesOffsetBounds(cad.getBoundingBox(result, false), baseBounds, distance, shrink) ? cad.getVolume(result) : 0;
          if (volume > 0 && (shrink ? volume < baseVolume * (1 - 1e-6) : volume > baseVolume * (1 + 1e-6))) return result;
          cad.release(result);
        } catch (error) {
          if (mustSurface(error)) throw error;
        }
      }
    }
    return null;
  };
  const direct = attempt(solid);
  if (direct) return direct;
  if (shrink) {
    // Rounded outside edges no wider than the distance shrink to nothing, and the kernel cannot
    // take them away on its own (#1521: a box rounded by 1 mm shrunk by 2). Shrunk that far, a
    // rounded edge ends up sharp anyway, so it is taken off first and the body shrunk without it.
    // A caller that tries several joins on one body hands in the sharpened body and releases it itself.
    const sharpened = sharpenedOf ? sharpenedOf() : withoutSmallOutsideRounds(cad, solid, distance);
    if (sharpened !== null) {
      try {
        const result = attempt(sharpened);
        if (result) return result;
      } finally {
        if (!sharpenedOf) cad.release(sharpened);
      }
    }
  }
  return null;
}

/** The cavity of a hollowing: the body shrunk by the wall, checked like any offset (#1521). */
function hollowCavity(cad: OcctKernel, body: ShapeHandle, wall: number, tolerance: number, joinType: JoinType.Arc | JoinType.Intersection, sharpened?: () => ShapeHandle | null) {
  const cavity = checkedOffset(cad, body, wall, true, [joinType], [tolerance], sharpened);
  if (!cavity) throw new Error("invalid shell");
  return cavity;
}

/**
 * Whether an offset's box is where an offset can put it: each side of the box moves out (grown) or
 * in (shrunk) by at least the distance - a sharp corner on a slanted face reaches further, a shrunk
 * body has no point nearer the old outside than the distance. A rounded edge shrunk past its radius
 * came back from the kernel as a closed body shrunk by half the distance, its roundings turned inside
 * out (#1521).
 */
function reachesOffsetBounds(bounds: BoundingBox, base: BoundingBox, distance: number, shrink: boolean) {
  const slack = Math.max(1e-3, distance * 1e-3);
  const outward = [base.xmin - bounds.xmin, base.ymin - bounds.ymin, base.zmin - bounds.zmin, bounds.xmax - base.xmax, bounds.ymax - base.ymax, bounds.zmax - base.zmax];
  return outward.every((move) => (shrink ? -move : move) >= distance - slack);
}

/**
 * Whether a shape is one or more closed solids and nothing else. When the kernel's offset fails
 * without saying so, it hands back loose shells that no longer meet, valid each on its own and
 * with a volume; a hole made of that has openings, and cutting it fails later (#1521).
 */
function isClosedSolid(cad: OcctKernel, shape: ShapeHandle) {
  try {
    if (!cad.isValid(shape)) return false;
    const solids = cad.getSubShapes(shape, "solid");
    try {
      if (solids.length === 0) return false;
      const shellsInSolids = solids.reduce((sum, solid) => sum + cad.subShapeCount(solid, "shell"), 0);
      return shellsInSolids === cad.subShapeCount(shape, "shell") && cad.subShapeCount(shape, "face") === solids.reduce((sum, solid) => sum + cad.subShapeCount(solid, "face"), 0);
    } finally {
      releaseAll(cad, solids);
    }
  } catch (error) {
    if (mustSurface(error)) throw error;
    return false;
  }
}

const ROUND_SURFACES = new Set(["cylinder", "sphere", "torus"]);

/**
 * A copy of the body with its rounded outside edges taken off where they are no wider than
 * `distance` - fillets and rounded corners, back to the sharp edge they replaced - or null when
 * it has none or they cannot be taken off. A face bends outward when the middle of a chord across
 * it lies inside the body; a hole or an inside rounding bends the other way and stays.
 */
function withoutSmallOutsideRounds(cad: OcctKernel, solid: ShapeHandle, distance: number): ShapeHandle | null {
  const faces = cad.getSubShapes(solid, "face");
  try {
    const rounds = faces.filter((face) => {
      if (!ROUND_SURFACES.has(cad.surfaceType(face))) return false;
      const { uMin, uMax, vMin, vMax } = cad.uvBounds(face);
      const u = (uMin + uMax) / 2;
      const v = (vMin + vMax) / 2;
      const curvature = cad.surfaceCurvature(face, u, v);
      const bend = Math.max(Math.abs(curvature.min), Math.abs(curvature.max));
      if (!(bend > 0) || 1 / bend > distance * (1 + 1e-6)) return false;
      const middle = cad.pointOnSurface(face, u, v);
      // The chord across the bend: along u on a cylinder, along whichever direction bows more elsewhere.
      // It runs from a quarter to three quarters of the face, so on a face that goes all the way round,
      // a round hole, it is a diameter whose middle lies on the axis rather than back on the face.
      const at = (from: number, to: number, share: number) => from + (to - from) * share;
      const chords = [
        [cad.pointOnSurface(face, at(uMin, uMax, 0.25), v), cad.pointOnSurface(face, at(uMin, uMax, 0.75), v)],
        [cad.pointOnSurface(face, u, at(vMin, vMax, 0.25)), cad.pointOnSurface(face, u, at(vMin, vMax, 0.75))],
      ]
        .map(([a, b]) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 }))
        .map((point) => ({ point, bow: Math.hypot(point.x - middle.x, point.y - middle.y, point.z - middle.z) }))
        .sort((a, b) => b.bow - a.bow);
      if (!(chords[0].bow > 1e-6)) return false;
      return cad.containsPoint(solid, chords[0].point, 1e-7);
    });
    if (rounds.length === 0) return null;
    try {
      const sharpened = cad.defeature(solid, rounds, 1e-4);
      if (isClosedSolid(cad, sharpened) && cad.getVolume(sharpened) >= cad.getVolume(solid) * (1 - 1e-9)) return sharpened;
      cad.release(sharpened);
    } catch (error) {
      if (mustSurface(error)) throw error;
    }
    return null;
  } finally {
    releaseAll(cad, faces);
  }
}

/**
 * The heights (y, the body's own up) at which the body has a flat face looking straight up or down,
 * with its bottom and top: between two of them the body is one layer, the same from bottom to top
 * wherever its sides stand upright.
 */
function horizontalFaceLevels(cad: OcctKernel, solid: ShapeHandle, bounds: { ymin: number; ymax: number }) {
  const tolerance = Math.max(1e-5, (bounds.ymax - bounds.ymin) * 1e-6);
  const levels = [bounds.ymin, bounds.ymax];
  const faces = cad.getSubShapes(solid, "face");
  try {
    faces.forEach((face) => {
      if (cad.surfaceType(face) !== "plane") return;
      const center = cad.getSurfaceCenterOfMass(face);
      if (Math.abs(orientedFaceNormal(cad, face, center).y) > 0.999) levels.push(center.y);
    });
  } finally {
    releaseAll(cad, faces);
  }
  return levels
    .filter((level) => level >= bounds.ymin - tolerance && level <= bounds.ymax + tolerance)
    .sort((a, b) => a - b)
    .filter((level, index, sorted) => index === 0 || level - sorted[index - 1] > tolerance);
}

/**
 * Offsets a body sideways only (#1057): its sides move by `distance`, its flat tops and bottoms stay at
 * their heights, so a border grows all round without the body getting taller. OCCT offsets every face
 * alike, so the body is cut into layers at the heights of its flat faces; each layer is offset as a
 * whole and cut back to its own height, and the layers are joined again. A shrink grows the room around
 * the layer instead and takes that away, so the layer keeps its height there too.
 */
export function offsetSolidSideways(cad: OcctKernel, solid: ShapeHandle, distance: number, shrink: boolean, edges: ShellEdges = "round") {
  const bounds = cad.getBoundingBox(solid, false);
  const levels = horizontalFaceLevels(cad, solid, bounds);
  const margin = distance * 2 + 1;
  const slab = (bottom: number, top: number) => cad.makeBoxFromCorners(
    { x: bounds.xmin - margin, y: bottom, z: bounds.zmin - margin },
    { x: bounds.xmax + margin, y: top, z: bounds.zmax + margin },
  );
  const handles: ShapeHandle[] = [];
  const keep = (handle: ShapeHandle) => {
    handles.push(handle);
    return handle;
  };
  const layers: ShapeHandle[] = [];
  try {
    for (let index = 0; index + 1 < levels.length; index += 1) {
      const bottom = levels[index];
      const top = levels[index + 1];
      const height = keep(slab(bottom, top));
      // The first and last cut reach past the body, so they do not lie on its own top and bottom.
      const reach = keep(slab(index === 0 ? bottom - margin : bottom, index + 2 === levels.length ? top + margin : top));
      // A cut leaves faces split where they used to run on; OCCT's offset fails on those, so they are merged first.
      const layer = keep(cad.unifySameDomain(keep(cad.common(solid, reach))));
      if (!(cad.getVolume(layer) > 0)) continue;
      if (shrink) {
        const around = keep(cad.unifySameDomain(keep(cad.cut(height, layer))));
        const grown = keep(offsetSolid(cad, around, distance, false, edges));
        const taken = keep(cad.common(grown, height));
        const rest = cad.cut(layer, taken);
        if (cad.getVolume(rest) > 0) layers.push(rest);
        else cad.release(rest);
      } else {
        const grown = keep(offsetSolid(cad, layer, distance, false, edges));
        layers.push(cad.common(grown, height));
      }
    }
    if (layers.length === 0) throw new Error(CANNOT_OFFSET_MESSAGE);
    const joined = layers.length === 1 ? cad.copy(layers[0]) : keep(cad.fuseAll(layers));
    const result = layers.length === 1 ? joined : cad.unifySameDomain(joined);
    const baseVolume = cad.getVolume(solid);
    const volume = shapeIsValid(cad, result) ? cad.getVolume(result) : 0;
    if (volume > 0 && (shrink ? volume < baseVolume * (1 - 1e-6) : volume > baseVolume * (1 + 1e-6))) return result;
    cad.release(result);
    throw new Error(CANNOT_OFFSET_MESSAGE);
  } catch (error) {
    if (mustSurface(error)) throw error;
    throw new Error(CANNOT_OFFSET_MESSAGE);
  } finally {
    releaseAll(cad, [...handles, ...layers]);
  }
}
