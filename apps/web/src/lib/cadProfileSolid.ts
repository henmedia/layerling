import type { OcctKernel, ShapeHandle } from "occt-wasm";
import type { CadModifierProfileLoop, CadModifierProfilePart, CadModifierProfileSegment } from "@/lib/cadModifierTypes";

/*
 * Exact solids for catalog shapes that are an outline pushed straight up
 * (star, heart, crescent, slot, polygon, honeycomb). The outline arrives as
 * lines and circular or elliptical arcs; the kernel gets real arcs and flat
 * caps, so a star is 22 faces instead of one face per display triangle, and
 * fillets and chamfers on it cost milliseconds instead of seconds.
 *
 * No three.js here: the CAD worker and the kernel tests import this file.
 */

type ProfileArc = Extract<CadModifierProfileSegment, { kind: "arc" }>;
type Point = { x: number; z: number };

const UP = { x: 0, y: 1, z: 0 };
const ORIGIN = { x: 0, y: 0, z: 0 };
const TWO_PI = Math.PI * 2;

export function profileArcPoint(arc: Pick<ProfileArc, "cx" | "cz" | "rx" | "rz">, angle: number): Point {
  return { x: arc.cx + arc.rx * Math.cos(angle), z: arc.cz + arc.rz * Math.sin(angle) };
}

/** Axis-aligned bounds [minX, minZ, maxX, maxZ] of a loop, arcs by their true extent. */
export function profileLoopBounds(loop: CadModifierProfileLoop) {
  let minX = loop.x;
  let maxX = loop.x;
  let minZ = loop.z;
  let maxZ = loop.z;
  const add = (point: Point) => {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minZ = Math.min(minZ, point.z);
    maxZ = Math.max(maxZ, point.z);
  };
  loop.segments.forEach((segment) => {
    add(segment);
    if (segment.kind !== "arc") return;
    const low = Math.min(segment.start, segment.end);
    const high = Math.max(segment.start, segment.end);
    for (let quarter = Math.ceil(low / (Math.PI / 2)); quarter * (Math.PI / 2) <= high; quarter += 1) {
      add(profileArcPoint(segment, quarter * (Math.PI / 2)));
    }
  });
  return [minX, minZ, maxX, maxZ];
}

function profileExtent(profile: CadModifierProfilePart) {
  const bounds = profileLoopBounds(profile.loops[0]);
  return Math.max(bounds[2] - bounds[0], bounds[3] - bounds[1], profile.height, 1e-3);
}

function samePoint(a: Point, b: Point, tolerance: number) {
  return Math.hypot(a.x - b.x, a.z - b.z) <= tolerance;
}

/** Throws unless every number is finite, every loop closes and every arc ends where it says. */
export function validateCadProfile(profile: CadModifierProfilePart) {
  if (profile.kind !== "extrusion") throw new Error(`Unsupported CAD profile: ${String((profile as { kind: unknown }).kind)}`);
  if (!Number.isFinite(profile.height) || profile.height <= 0) throw new Error("The profile has no height");
  if (!profile.loops.length) throw new Error("The profile has no outline");
  const tolerance = profileExtent(profile) * 1e-7;
  profile.loops.forEach((loop) => {
    if (!Number.isFinite(loop.x) || !Number.isFinite(loop.z) || loop.segments.length < 2) {
      throw new Error("The profile outline is incomplete");
    }
    let current: Point = loop;
    loop.segments.forEach((segment) => {
      const values = segment.kind === "arc"
        ? [segment.x, segment.z, segment.cx, segment.cz, segment.rx, segment.rz, segment.start, segment.end]
        : [segment.x, segment.z];
      if (!values.every(Number.isFinite)) throw new Error("The profile outline has an invalid point");
      if (segment.kind === "arc") {
        const sweep = Math.abs(segment.end - segment.start);
        if (segment.rx <= 0 || segment.rz <= 0 || sweep <= 1e-9 || sweep > TWO_PI - 1e-9) {
          throw new Error("The profile outline has an invalid arc");
        }
        if (!samePoint(profileArcPoint(segment, segment.start), current, tolerance) || !samePoint(profileArcPoint(segment, segment.end), segment, tolerance)) {
          throw new Error("A profile arc does not meet its neighbours");
        }
      } else if (samePoint(current, segment, tolerance)) {
        throw new Error("The profile outline has a zero-length line");
      }
      current = segment;
    });
    if (!samePoint(current, loop, tolerance)) throw new Error("The profile outline is not closed");
  });
}

function vec(point: Point) {
  return { x: point.x, y: 0, z: point.z };
}

/*
 * Measured on occt-wasm 5.3.5: makeEllipseArc with the normal +Y lays the
 * major axis along +Z and the minor axis along +X, parameter growing from +Z
 * towards +X. The arc is built around the origin in that frame and then turned
 * and moved rigidly into place, which keeps it an analytic ellipse. The ends
 * are checked afterwards, so a kernel that lays the axes out differently is
 * caught here instead of producing a wrong body.
 */
function ellipseArcEdge(cad: OcctKernel, from: Point, arc: ProfileArc, tolerance: number) {
  const majorAlongZ = arc.rz >= arc.rx;
  const first = majorAlongZ ? Math.PI / 2 - arc.start : -arc.start;
  const last = majorAlongZ ? Math.PI / 2 - arc.end : -arc.end;
  const raw = majorAlongZ
    ? cad.makeEllipseArc(ORIGIN, UP, arc.rz, arc.rx, Math.min(first, last), Math.max(first, last))
    : cad.makeEllipseArc(ORIGIN, UP, arc.rx, arc.rz, Math.min(first, last), Math.max(first, last));
  const placement = majorAlongZ
    ? [1, 0, 0, arc.cx, 0, 1, 0, 0, 0, 0, 1, arc.cz]
    : [0, 0, 1, arc.cx, 0, 1, 0, 0, -1, 0, 0, arc.cz];
  const edge = cad.transform(raw, placement);
  cad.release(raw);
  const vertices = cad.getSubShapes(edge, "vertex");
  try {
    const ends = vertices.map((vertex) => cad.vertexPosition(vertex));
    const touches = (point: Point) => ends.some((end) => Math.abs(end.y) <= tolerance && samePoint({ x: end.x, z: end.z }, point, tolerance));
    const parameters = cad.curveParameters(edge) as { first: number; last: number };
    const middle = cad.curvePointAtParam(edge, (parameters.first + parameters.last) / 2);
    if (!touches(from) || !touches(arc) || !samePoint({ x: middle.x, z: middle.z }, profileArcPoint(arc, (arc.start + arc.end) / 2), tolerance)) {
      throw new Error("The kernel laid out an elliptical arc differently than expected");
    }
  } finally {
    vertices.forEach((vertex) => cad.release(vertex));
  }
  return edge;
}

function segmentEdge(cad: OcctKernel, from: Point, segment: CadModifierProfileSegment, tolerance: number) {
  if (segment.kind === "line") return cad.makeLineEdge(vec(from), vec(segment));
  if (Math.abs(segment.rx - segment.rz) <= 1e-9 * Math.max(segment.rx, segment.rz)) {
    return cad.makeArcEdge(vec(from), vec(profileArcPoint(segment, (segment.start + segment.end) / 2)), vec(segment));
  }
  return ellipseArcEdge(cad, from, segment, tolerance);
}

function loopWire(cad: OcctKernel, loop: CadModifierProfileLoop, tolerance: number) {
  const edges: ShapeHandle[] = [];
  let current: Point = loop;
  loop.segments.forEach((segment) => {
    edges.push(segmentEdge(cad, current, segment, tolerance));
    current = segment;
  });
  return cad.makeWire(edges);
}

/**
 * The exact body of a profile in the shape's local frame: outline in the X/Z
 * plane at y = 0, pushed up to y = height. Throws when anything about it is
 * off - the caller falls back to the display mesh.
 */
export function profileExtrusionSolid(cad: OcctKernel, profile: CadModifierProfilePart) {
  validateCadProfile(profile);
  const tolerance = profileExtent(profile) * 1e-6;
  const [outer, ...holes] = profile.loops;
  let face = cad.makeFace(loopWire(cad, outer, tolerance));
  if (holes.length > 0) face = cad.addHolesInFace(face, holes.map((hole) => loopWire(cad, hole, tolerance)));
  let solid = cad.extrude(face, 0, profile.height, 0);
  const solids = cad.isSolid(solid) ? [solid] : cad.getSubShapes(solid, "solid");
  if (solids.length !== 1) throw new Error("The profile did not become one solid");
  solid = solids[0];
  let valid = false;
  try {
    valid = Boolean(cad.isValid(solid));
  } catch {
    valid = false;
  }
  if (!valid) throw new Error("The profile solid is not valid");
  if (!(cad.getVolume(solid) > 0)) throw new Error("The profile solid is inside out");
  return solid;
}

/**
 * Null when the exact body agrees with the display mesh it replaces, otherwise
 * what disagrees. The mesh only approximates the arcs, so the check is loose:
 * it catches a body in the wrong place, turned or mirrored the wrong way, or
 * missing a large part of its volume - not small differences in detail, which
 * the tests compare shape by shape.
 */
export function cadProfileSolidMismatch(cad: OcctKernel, solid: ShapeHandle, expected: CadModifierProfilePart["expected"]) {
  if (!expected || expected.bounds.length !== 6 || ![...expected.bounds, expected.volume].every(Number.isFinite)) return null;
  const box = cad.getBoundingBox(solid);
  const actual = [box.xmin, box.ymin, box.zmin, box.xmax, box.ymax, box.zmax];
  const size = Math.max(
    expected.bounds[3] - expected.bounds[0],
    expected.bounds[4] - expected.bounds[1],
    expected.bounds[5] - expected.bounds[2],
  );
  const boundsTolerance = 0.05 * size + 0.05;
  const worst = Math.max(...actual.map((value, index) => Math.abs(value - expected.bounds[index])));
  if (!(worst <= boundsTolerance)) return `bounds differ by ${worst.toFixed(3)} mm`;
  const volume = Math.abs(cad.getVolume(solid));
  const expectedVolume = Math.abs(expected.volume);
  if (!(Math.abs(volume - expectedVolume) <= 0.15 * expectedVolume + 1e-6)) {
    return `volume ${volume.toFixed(2)} instead of ${expectedVolume.toFixed(2)} mm³`;
  }
  return null;
}
