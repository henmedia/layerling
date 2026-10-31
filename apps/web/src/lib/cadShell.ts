import { JoinType, type OcctKernel, type ShapeHandle } from "occt-wasm";
import { isCadModifierWasmMemoryFault } from "@/lib/cadModifierRuntime";
import { shellOpenSides } from "@/lib/shellLimits";
import type { ShellEdges, ShellOpenings, ShellSide } from "@/types/layerling";

// Hollowing ("shell") for the CAD modifier worker. It lives outside the worker
// so the end-to-end tests can run it against the real OCCT kernel.

export function orientedFaceNormal(cad: OcctKernel, face: ShapeHandle, point: { x: number; y: number; z: number }) {
  const uv = cad.uvFromPoint(face, point);
  // surfaceNormal already honours the face orientation (see shellOpeningFaces);
  // flipping a reversed face again turned its normal inward.
  const normal = cad.surfaceNormal(face, uv.u, uv.v);
  const length = Math.hypot(normal.x, normal.y, normal.z) || 1;
  return { x: normal.x / length, y: normal.y / length, z: normal.z / length };
}

function shapeIsValid(cad: OcctKernel, shape: ShapeHandle) {
  try {
    return Boolean(cad.isValid(shape));
  } catch {
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
  return found;
}

/** All the faces a hollowed body leaves open. */
export function shellOpeningFaces(cad: OcctKernel, solid: ShapeHandle, faces: ShapeHandle[], openings: ShellOpenings) {
  return [...shellOpeningFacesBySide(cad, solid, faces, openings).values()].flat();
}

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
function shellByExtension(cad: OcctKernel, solid: ShapeHandle, open: ShapeHandle[], wall: number, tolerance: number, joinType: JoinType.Arc | JoinType.Intersection) {
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
    const cavity = cavityFromOffset(cad, cad.offset(grown, -wall, tolerance, joinType));
    handles.push(cavity);
    return cad.cut(solid, cavity);
  } finally {
    releaseAll(cad, handles);
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
      for (const joinType of joinTypes) {
        for (const tolerance of [1e-6, 1e-3]) {
          // With faces to open, the thick solid first; where it fails (a face with a pocket in it), the
          // body grown over the open faces. A closed body is hollowed with the offset of itself.
          const builds: Array<() => ShapeHandle> = open.length > 0
            ? [() => cad.shell(solid, open, wall, tolerance, joinType), () => shellByExtension(cad, solid, open, wall, tolerance, joinType)]
            : [() => {
              const cavity = cavityFromOffset(cad, cad.offset(solid, -wall, tolerance, joinType));
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
    const hollowed = attempt(thickness);
    if (hollowed) return hollowed;
    if (lastError instanceof Error && lastError.message.startsWith("This body")) throw lastError;
    // Every failure used to be reported as "too thick", also at 0.2 mm. Only a body that can be
    // hollowed with a very thin wall is a body whose wall was too thick. A body that fails even
    // then is not clean for the kernel (forum 618422: an imported house whose door was cut down
    // to its bottom edge, so that the cutout touches the outline).
    const probe = Math.max(MIN_PROBE_WALL, Math.min(thickness / 4, PROBE_WALL));
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
    } catch {
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
  const baseVolume = cad.getVolume(solid);
  for (const joinType of joinTypes) {
    for (const tolerance of [1e-6, 1e-3]) {
      try {
        const result = cavityFromOffset(cad, cad.offset(solid, shrink ? -distance : distance, tolerance, joinType));
        const volume = shapeIsValid(cad, result) ? cad.getVolume(result) : 0;
        if (volume > 0 && (shrink ? volume < baseVolume * (1 - 1e-6) : volume > baseVolume * (1 + 1e-6))) return result;
        cad.release(result);
      } catch (error) {
        if (mustSurface(error)) throw error;
      }
    }
  }
  throw new Error(CANNOT_OFFSET_MESSAGE);
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
