import { loftEaseShare, LOFT_SMOOTH_SECTIONS } from "@/lib/loftEase";
import { JoinType, type OcctKernel, type ShapeHandle } from "occt-wasm";
import type { CadModifierProfileLoop, CadModifierProfilePart, CadModifierProfileSegment } from "@/lib/cadModifierTypes";

/*
 * Exact solids for catalog shapes that are an outline pushed straight up
 * (star, heart, crescent, slot, polygon, honeycomb, spur gear, text, the
 * ellipse, tube and round roof) or a section turned around an axis (bores,
 * the half sphere, the stretched sphere and cone). The
 * outline arrives as lines, circular or elliptical arcs and Bezier curves; the
 * kernel gets real curves and flat caps, so a star is 22 faces instead of one
 * face per display triangle, and fillets and chamfers on it cost milliseconds
 * instead of seconds.
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
    // A Bezier curve stays inside the hull of its control points.
    if (segment.kind === "bezier") segment.controls.forEach(add);
    if (segment.kind !== "arc") return;
    const low = Math.min(segment.start, segment.end);
    const high = Math.max(segment.start, segment.end);
    for (let quarter = Math.ceil(low / (Math.PI / 2)); quarter * (Math.PI / 2) <= high; quarter += 1) {
      add(profileArcPoint(segment, quarter * (Math.PI / 2)));
    }
  });
  return [minX, minZ, maxX, maxZ];
}

/** Points along a segment from `from`, its end included; curves sampled finely. */
function segmentPoints(from: Point, segment: CadModifierProfileSegment): Point[] {
  if (segment.kind === "line") return [{ x: segment.x, z: segment.z }];
  const steps = 64;
  const points: Point[] = [];
  for (let step = 1; step <= steps; step += 1) {
    const t = step / steps;
    if (segment.kind === "arc") {
      points.push(profileArcPoint(segment, segment.start + (segment.end - segment.start) * t));
    } else {
      let row: Point[] = [from, ...segment.controls, { x: segment.x, z: segment.z }];
      while (row.length > 1) row = row.slice(1).map((point, index) => ({ x: row[index].x + (point.x - row[index].x) * t, z: row[index].z + (point.z - row[index].z) * t }));
      points.push(row[0]);
    }
  }
  return points;
}

/** Area inside a profile - outer loop minus holes - from finely sampled outlines. */
export function profileArea(profile: CadModifierProfilePart) {
  const loopArea = (loop: CadModifierProfileLoop) => {
    let twice = 0;
    let current: Point = { x: loop.x, z: loop.z };
    loop.segments.forEach((segment) => {
      segmentPoints(current, segment).forEach((point) => {
        twice += current.x * point.z - point.x * current.z;
        current = point;
      });
    });
    return Math.abs(twice) / 2;
  };
  const [outer, ...holes] = profile.loops;
  return loopArea(outer) - holes.reduce((total, hole) => total + loopArea(hole), 0);
}

function profileExtent(profile: CadModifierProfilePart) {
  const bounds = profileLoopBounds(profile.loops[0]);
  return Math.max(bounds[2] - bounds[0], bounds[3] - bounds[1], profile.height, 1e-3);
}

function samePoint(a: Point, b: Point, tolerance: number) {
  return Math.hypot(a.x - b.x, a.z - b.z) <= tolerance;
}

function sameRadius(a: number, b: number) {
  return Math.abs(a - b) <= 1e-9 * Math.max(a, b);
}

/** An arc once round: a loop of its own, a circle or ellipse in one closed edge. */
export function isWholeEllipse(segment: CadModifierProfileSegment) {
  return segment.kind === "arc" && Math.abs(Math.abs(segment.end - segment.start) - TWO_PI) <= 1e-9;
}

/** Throws unless every number is finite, every loop closes and every arc ends where it says. */
export function validateCadProfile(profile: CadModifierProfilePart) {
  if (profile.kind !== "extrusion" && profile.kind !== "revolution" && profile.kind !== "sweep" && profile.kind !== "loft") throw new Error(`Unsupported CAD profile: ${String((profile as { kind: unknown }).kind)}`);
  if (!Number.isFinite(profile.height) || profile.height <= 0) throw new Error("The profile has no height");
  if (!profile.loops.length) throw new Error("The profile has no outline");
  if (profile.kind === "sweep") validateSweepPath(profile.path);
  if (profile.kind === "loft" && profile.apex) {
    // A loft to a point: one outline of straight lines below it, and no top section.
    if (!Number.isFinite(profile.apex.x) || !Number.isFinite(profile.apex.z)) throw new Error("The loft's point is not a number");
    if (profile.topLoops || profile.loops.length !== 1 || profile.loops[0].segments.some((segment) => segment.kind !== "line")) {
      throw new Error("A loft to a point needs one straight-sided outline and no top");
    }
    // Its sides are built flat, so nothing may turn, tilt, smooth or chamfer them.
    const tilted = Math.abs(profile.tilt?.x ?? 0) > 1e-9 || Math.abs(profile.tilt?.z ?? 0) > 1e-9;
    if (Math.abs(profile.twist ?? 0) > 1e-9 || tilted || (profile.smooth ?? 0) > 1e-9 || (profile.capChamfer?.size ?? 0) > 1e-4) {
      throw new Error("A loft to a point cannot be turned, tilted, smoothed or chamfered");
    }
  } else if (profile.kind === "loft") {
    // The top has to be the bottom's partner piece for piece: the loft joins them in that order.
    // A piece may face one of another kind - a side of a square a quarter of a circle (#188).
    const top = profile.topLoops ?? [];
    const sameShape = top.length === profile.loops.length && top.every((loop, index) => (
      loop.segments.length === profile.loops[index].segments.length
    ));
    if (!sameShape) throw new Error("The loft's top does not match its bottom");
    validateLoops({ ...profile, kind: "extrusion", loops: top });
  }
  validateLoops(profile);
}

function validateLoops(profile: CadModifierProfilePart) {
  const tolerance = profileExtent(profile) * 1e-7;
  profile.loops.forEach((loop) => {
    // A loop of one segment is only a whole ellipse, and only where it is not turned around an axis (an extrusion, a loft or a sweep's round tube).
    const whole = profile.kind !== "revolution" && loop.segments.length === 1 && isWholeEllipse(loop.segments[0]);
    if (!Number.isFinite(loop.x) || !Number.isFinite(loop.z) || (loop.segments.length < 2 && !whole)) {
      throw new Error("The profile outline is incomplete");
    }
    let current: Point = loop;
    loop.segments.forEach((segment) => {
      const values = segment.kind === "arc"
        ? [segment.x, segment.z, segment.cx, segment.cz, segment.rx, segment.rz, segment.start, segment.end]
        : segment.kind === "bezier"
          ? [segment.x, segment.z, ...segment.controls.flatMap((control) => [control.x, control.z])]
          : [segment.x, segment.z];
      if (!values.every(Number.isFinite)) throw new Error("The profile outline has an invalid point");
      if (segment.kind === "arc") {
        const sweep = Math.abs(segment.end - segment.start);
        if (segment.rx <= 0 || segment.rz <= 0 || sweep <= 1e-9 || (sweep > TWO_PI - 1e-9 && !whole)) {
          throw new Error("The profile outline has an invalid arc");
        }
        if (!samePoint(profileArcPoint(segment, segment.start), current, tolerance) || !samePoint(profileArcPoint(segment, segment.end), segment, tolerance)) {
          throw new Error("A profile arc does not meet its neighbours");
        }
      } else if (segment.kind === "bezier") {
        if (segment.controls.length < 1 || segment.controls.length > 2) throw new Error("The profile outline has an invalid curve");
        if ([segment, ...segment.controls].every((point) => samePoint(current, point, tolerance))) {
          throw new Error("The profile outline has a zero-length curve");
        }
      } else if (samePoint(current, segment, tolerance)) {
        throw new Error("The profile outline has a zero-length line");
      }
      current = segment;
    });
    if (!samePoint(current, loop, tolerance)) throw new Error("The profile outline is not closed");
  });
}

/** A sweep's centre line: at least one piece, every number finite, every frame a rigid placement. */
function validateSweepPath(path: CadModifierProfilePart["path"]) {
  if (!Array.isArray(path) || path.length === 0) throw new Error("The sweep has no centre line");
  path.forEach((piece) => {
    const frame = piece.frame;
    if (!Array.isArray(frame) || frame.length !== 12 || !frame.every(Number.isFinite)) throw new Error("A sweep piece has an invalid frame");
    // Columns of the 3x3 part: unit length, square to each other, right-handed.
    const column = (index: number) => [frame[index], frame[4 + index], frame[8 + index]];
    const [a, b, c] = [column(0), column(1), column(2)];
    const dotOf = (p: number[], q: number[]) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
    const determinant = a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0]);
    if ([dotOf(a, a), dotOf(b, b), dotOf(c, c)].some((value) => Math.abs(value - 1) > 1e-6)
      || [dotOf(a, b), dotOf(b, c), dotOf(a, c)].some((value) => Math.abs(value) > 1e-6)
      || Math.abs(determinant - 1) > 1e-6) {
      throw new Error("A sweep piece frame is not a rigid placement");
    }
    if (piece.kind === "straight") {
      if (!Number.isFinite(piece.length) || piece.length <= 0) throw new Error("A straight sweep piece has no length");
    } else if (piece.kind === "bend") {
      if (![...piece.center, ...piece.axis, piece.angle].every(Number.isFinite) || piece.angle <= 0 || piece.angle > TWO_PI) throw new Error("A sweep bend is invalid");
      if (Math.abs(Math.hypot(...piece.axis) - 1) > 1e-6) throw new Error("A sweep bend axis is not a unit vector");
    } else {
      throw new Error("Unknown sweep piece");
    }
  });
}

type V3 = [number, number, number];

/** Rodrigues rotation of v about a unit axis. */
function turned(v: V3, axis: V3, angle: number): V3 {
  const c = Math.cos(angle);
  const sn = Math.sin(angle);
  const d = (axis[0] * v[0] + axis[1] * v[1] + axis[2] * v[2]) * (1 - c);
  const k: V3 = [axis[1] * v[2] - axis[2] * v[1], axis[2] * v[0] - axis[0] * v[2], axis[0] * v[1] - axis[1] * v[0]];
  return [v[0] * c + k[0] * sn + axis[0] * d, v[1] * c + k[1] * sn + axis[1] * d, v[2] * c + k[2] * sn + axis[2] * d];
}

/** The section planes a piece starts and ends in: a point on each and its normal (the running direction). */
function pieceEnds(piece: NonNullable<CadModifierProfilePart["path"]>[number]) {
  const start: V3 = [piece.frame[3], piece.frame[7], piece.frame[11]];
  const tangent: V3 = [piece.frame[1], piece.frame[5], piece.frame[9]];
  if (piece.kind === "straight") {
    return { start: { point: start, normal: tangent }, end: { point: [start[0] + tangent[0] * piece.length, start[1] + tangent[1] * piece.length, start[2] + tangent[2] * piece.length] as V3, normal: tangent } };
  }
  const offset = turned([start[0] - piece.center[0], start[1] - piece.center[1], start[2] - piece.center[2]], piece.axis, piece.angle);
  return {
    start: { point: start, normal: tangent },
    end: { point: [piece.center[0] + offset[0], piece.center[1] + offset[1], piece.center[2] + offset[2]] as V3, normal: turned(tangent, piece.axis, piece.angle) },
  };
}

/**
 * The section pushed along each straight piece and turned through each bend,
 * then joined into one body: every piece's faces except the section faces
 * where two pieces meet (found by lying in that section's plane, within the
 * section's reach of the centre line), sewn into one closed shell and merged where faces
 * continue each other. A round tube becomes cylinders and tori, a polygonal
 * one planes and cones - analytic faces only.
 *
 * Not a boolean union: the pieces only touch at those section faces, and
 * fusing them could run for minutes - a twelve-segment square tube that does
 * not touch itself was still running after four minutes at its sixteenth
 * piece, while sewing takes well under a second. A tube that runs into itself
 * would need the union, so it never comes here (bentTubeSweep keeps it on the
 * display mesh).
 */
function sweptSolid(cad: OcctKernel, face: ShapeHandle, profile: CadModifierProfilePart, extent: number) {
  const path = profile.path ?? [];
  const tolerance = Math.max(1e-7, extent * 1e-7);
  // How far the section reaches from the centre line. A 180 degree bend ends in
  // the plane it starts in, on the other side of the bend: a section face has
  // to lie in the plane and near the plane's point on the centre line.
  const [minX, minZ, maxX, maxZ] = profileLoopBounds(profile.loops[0]);
  const reach = Math.hypot(Math.max(Math.abs(minX), Math.abs(maxX)), Math.max(Math.abs(minZ), Math.abs(maxZ))) * (1 + 1e-6) + tolerance;
  const kept: ShapeHandle[] = [];
  path.forEach((piece, index) => {
    const placed = cad.transform(face, piece.frame);
    const solid = piece.kind === "straight"
      // The running direction is the frame's local +Y (its second column).
      ? cad.extrude(placed, piece.frame[1] * piece.length, piece.frame[5] * piece.length, piece.frame[9] * piece.length)
      : cad.revolve(placed, {
        point: { x: piece.center[0], y: piece.center[1], z: piece.center[2] },
        direction: { x: piece.axis[0], y: piece.axis[1], z: piece.axis[2] },
      }, piece.angle);
    const ends = pieceEnds(piece);
    // A section face lies in its plane along every edge - sampled at both ends and the middle, so a
    // side face of a 180 degree bend (corners in the same plane, arcs not) is not taken for one.
    const inPlane = (candidate: ShapeHandle, plane: { point: V3; normal: V3 }) => cad.surfaceType(candidate) === "plane"
      && cad.getSubShapes(candidate, "edge").every((edge) => {
        const range = cad.curveParameters(edge) as { first: number; last: number };
        return [range.first, (range.first + range.last) / 2, range.last].every((parameter) => {
          const point = cad.curvePointAtParam(edge, parameter);
          const offset = [point.x - plane.point[0], point.y - plane.point[1], point.z - plane.point[2]];
          return Math.abs(offset[0] * plane.normal[0] + offset[1] * plane.normal[1] + offset[2] * plane.normal[2]) <= tolerance * 10
            && Math.hypot(offset[0], offset[1], offset[2]) <= reach;
        });
      });
    cad.getSubShapes(solid, "face").forEach((candidate) => {
      const inner = (index > 0 && inPlane(candidate, ends.start)) || (index < path.length - 1 && inPlane(candidate, ends.end));
      if (!inner) kept.push(candidate);
    });
  });
  const sewn = cad.sew(kept, tolerance * 100);
  const shells = cad.isShell(sewn) ? [sewn] : cad.getSubShapes(sewn, "shell");
  if (shells.length !== 1) throw new Error(`The swept pieces did not close into one shell (${shells.length})`);
  const solid = cad.makeSolid(shells[0]);
  // Merging faces that continue each other (a square tube's flat sides along
  // a bend in their plane) is a nicety: on some tight bends the kernel's
  // merge fails outright (occt-wasm 5.4.0 traps with "memory access out of
  // bounds" on a hexagon tube with bends at 1.01 times the minimum radius)
  // while the sewn solid is valid - then the solid stays as sewn.
  try {
    const merged = cad.unifySameDomain(solid);
    if (cad.isValid(merged)) return merged;
  } catch {
    // Keep the sewn solid.
  }
  return solid;
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

/** A whole ellipse round (cx, 0, cz), semi-axes rx along X and rz along Z, as one closed edge. */
function wholeEllipseEdge(cad: OcctKernel, arc: ProfileArc) {
  const center = { x: arc.cx, y: 0, z: arc.cz };
  if (sameRadius(arc.rx, arc.rz)) return cad.makeCircleEdge(center, UP, arc.rx);
  // With the normal +Y the major axis lies along +Z (see above); a wider one is turned a quarter.
  if (arc.rz > arc.rx) return cad.makeEllipseEdge(center, UP, arc.rz, arc.rx);
  const raw = cad.makeEllipseEdge(ORIGIN, UP, arc.rx, arc.rz);
  const edge = cad.transform(raw, [0, 0, 1, arc.cx, 0, 1, 0, 0, -1, 0, 0, arc.cz]);
  cad.release(raw);
  return edge;
}

function segmentEdge(cad: OcctKernel, from: Point, segment: CadModifierProfileSegment, tolerance: number) {
  if (segment.kind === "line") return cad.makeLineEdge(vec(from), vec(segment));
  if (segment.kind === "bezier") return cad.makeBezierEdge([vec(from), ...segment.controls.map(vec), vec(segment)]);
  if (isWholeEllipse(segment)) return wholeEllipseEdge(cad, segment);
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
type P3 = { x: number; y: number; z: number };

/** The corners of a straight-sided loop, at height y. */
function loopCorners(loop: CadModifierProfileLoop, y: number): P3[] {
  return [loop, ...loop.segments.slice(0, -1)].map((point) => ({ x: point.x, y, z: point.z }));
}

/** Whether every side between a straight-sided bottom and its top is flat: its four corners in one plane. */
function sidesAreFlat(profile: CadModifierProfilePart, tolerance: number) {
  const top = profile.topLoops ?? [];
  return profile.loops.every((loop, index) => {
    const lower = loopCorners(loop, 0);
    const upper = loopCorners(top[index], profile.height);
    return lower.every((a, corner) => {
      const next = (corner + 1) % lower.length;
      const [b, c, d] = [lower[next], upper[next], upper[corner]];
      const u = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
      const v = { x: c.x - a.x, y: c.y - a.y, z: c.z - a.z };
      const n = { x: u.y * v.z - u.z * v.y, y: u.z * v.x - u.x * v.z, z: u.x * v.y - u.y * v.x };
      const length = Math.hypot(n.x, n.y, n.z);
      return length > 0 && Math.abs((d.x - a.x) * n.x + (d.y - a.y) * n.y + (d.z - a.z) * n.z) / length <= tolerance;
    });
  });
}

/**
 * A tapered or leaning prism whose sides all stay flat (a box, or a polygon
 * scaled evenly), built face by face so that every side is a plane - a
 * lofted side comes out as a B-spline even when it is flat. A loft to a point
 * (a pyramid) has no top: each side is the triangle from a bottom edge to the point.
 */
function flatLoftSolid(cad: OcctKernel, profile: CadModifierProfilePart, tolerance: number) {
  const top = profile.topLoops ?? [];
  const ring = (points: P3[]) => cad.makeWire(points.map((point, index) => cad.makeLineEdge(point, points[(index + 1) % points.length])));
  const faces: ShapeHandle[] = [];
  const cap = (loops: CadModifierProfileLoop[], y: number) => {
    let face = cad.makeFace(ring(loopCorners(loops[0], y)));
    if (loops.length > 1) face = cad.addHolesInFace(face, loops.slice(1).map((loop) => ring(loopCorners(loop, y))));
    faces.push(face);
  };
  cap(profile.loops, 0);
  const apex = profile.apex ? { x: profile.apex.x, y: profile.height, z: profile.apex.z } : null;
  if (!apex) cap(top, profile.height);
  profile.loops.forEach((loop, index) => {
    const lower = loopCorners(loop, 0);
    const upper = apex ? [] : loopCorners(top[index], profile.height);
    lower.forEach((a, corner) => {
      const next = (corner + 1) % lower.length;
      faces.push(cad.makeFace(ring(apex ? [a, lower[next], apex] : [a, lower[next], upper[next], upper[corner]])));
    });
  });
  const sewn = cad.sew(faces, tolerance * 100);
  const shells = cad.isShell(sewn) ? [sewn] : cad.getSubShapes(sewn, "shell");
  if (shells.length !== 1) throw new Error(`The tapered sides did not close into one shell (${shells.length})`);
  // An outline running the other way round sews into a shell facing inwards; made a solid the other way, it faces out.
  const solid = [shells[0], cad.reverseShape(shells[0])].map((shell) => cad.makeSolid(shell))
    .find((candidate) => cad.isValid(candidate) && cad.getVolume(candidate) > 0);
  if (!solid) throw new Error("The tapered sides did not make a valid solid");
  return solid;
}

/**
 * A tapered or leaning extrusion: every loop of the bottom joined to its
 * partner at the top by straight lines, the openings cut out of the outer
 * body. A ruled loft between two copies of the same outline, scaled and
 * shifted, is exactly the body the display's taper and lean draw. A
 * straight-sided outline whose sides all stay flat is built face by face
 * instead (flatLoftSolid), so that its sides are planes. A side that does not
 * stay flat (a slanted edge tapered more across than along) is the ruled
 * surface between its bottom and top edge - here the loft's own.
 */
/** Two partner loops mixed: every number in them taken that far from the bottom to the top. */
function mixLoops<T>(bottom: T, top: T, t: number): T {
  if (typeof bottom === "number" && typeof top === "number") return (bottom + (top - bottom) * t) as T;
  if (Array.isArray(bottom) && Array.isArray(top)) return bottom.map((entry, index) => mixLoops(entry, top[index], t)) as T;
  if (bottom && top && typeof bottom === "object" && typeof top === "object") {
    const mixed: Record<string, unknown> = {};
    for (const key of Object.keys(bottom)) {
      mixed[key] = mixLoops((bottom as Record<string, unknown>)[key], (top as Record<string, unknown>)[key], t);
    }
    return mixed as T;
  }
  return bottom;
}

/** Degrees between two sections of a twisted loft: close enough that the smooth loft stays within 0.05 % of the true twist. */
export const TWIST_SECTION_STEP = 7.5;

/**
 * A twisted extrusion (#184): the section, scaled and shifted as for a taper and a lean, turned
 * a little further at every step up, and a smooth loft through all of them. Measured against the
 * true twist, a corner between two sections lies within 0.05 % of where it belongs, and the
 * volume comes out exact - a twist only turns each slice.
 */
function twistedLoftSolid(cad: OcctKernel, profile: CadModifierProfilePart, tolerance: number) {
  const top = profile.topLoops ?? [];
  const twist = profile.twist ?? 0;
  const center = profile.twistCenter ?? { x: 0, z: 0 };
  const lean = profile.twistLean ?? { x: 0, z: 0 };
  const tilt = profile.tilt ?? { x: 0, z: 0 };
  const turnSections = Math.max(2, Math.ceil(Math.max(Math.abs(twist), Math.abs(tilt.x), Math.abs(tilt.z)) / (profile.twistStep ?? TWIST_SECTION_STEP)) + 1);
  const sections = (profile.smooth ?? 0) > 1e-9 ? Math.max(turnSections, LOFT_SMOOTH_SECTIONS) : turnSections;
  const solidOf = (index: number) => {
    const wires: ShapeHandle[] = [];
    for (let step = 0; step < sections; step += 1) {
      const t = step / (sections - 1);
      // A smooth transition (#271) mixes the two ends along an S-curve; the turn and the height stay even.
      const share = loftEaseShare(t, profile.smooth ?? 0);
      const loop = mixLoops(profile.loops[index], top[index], share);
      const angle = (twist * t * Math.PI) / 180;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      // The lean shifts the whole section, so the turn goes around the section's own middle, shifted with it.
      const cx = center.x + lean.x * share;
      const cz = center.z + lean.z * share;
      // Turned about the vertical through (cx, cz): x' = (x - cx)cos - (z - cz)sin, z' = (x - cx)sin + (z - cz)cos;
      // then tilted about x (y = z sin a, z = z cos a) and about z (x = x cos b - y sin b, y = x sin b + y cos b);
      // then put back on (cx, cz) and lifted - as loftGeometry's placeTurned draws it.
      const a = (tilt.x * t * Math.PI) / 180;
      const b = (tilt.z * t * Math.PI) / 180;
      const [ca, sa, cb, sb] = [Math.cos(a), Math.sin(a), Math.cos(b), Math.sin(b)];
      // Rows of the 3x3 turn applied to (x - cx, y, z - cz); y is 0 on a section.
      const r = [
        [cb * cos - sb * sa * sin, -sb * ca, -cb * sin - sb * sa * cos],
        [sb * cos + cb * sa * sin, cb * ca, -sb * sin + cb * sa * cos],
        [ca * sin, -sa, ca * cos],
      ];
      const matrix = [
        r[0][0], r[0][1], r[0][2], cx - r[0][0] * cx - r[0][2] * cz,
        r[1][0], r[1][1], r[1][2], profile.height * t - r[1][0] * cx - r[1][2] * cz,
        r[2][0], r[2][1], r[2][2], cz - r[2][0] * cx - r[2][2] * cz,
      ];
      wires.push(cad.transform(loopWire(cad, loop, tolerance), matrix));
    }
    const lofted = cad.loft(wires, true, false);
    const solids = cad.isSolid(lofted) ? [lofted] : cad.getSubShapes(lofted, "solid");
    if (solids.length !== 1) throw new Error("A twisted loft did not become one solid");
    return cad.getVolume(solids[0]) < 0 ? cad.reverseShape(solids[0]) : solids[0];
  };
  let solid = solidOf(0);
  for (let index = 1; index < profile.loops.length; index += 1) {
    solid = cad.cut(solid, solidOf(index));
  }
  const solids = cad.isSolid(solid) ? [solid] : cad.getSubShapes(solid, "solid");
  if (solids.length !== 1) throw new Error("The twisted loft with its openings did not become one solid");
  return solids[0];
}

/** Whether four corners a, b, c, d (in this order round a side) lie in one plane. */
function pieceIsFlat([a, b, c, d]: P3[], tolerance: number) {
  const u = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
  const v = { x: c.x - a.x, y: c.y - a.y, z: c.z - a.z };
  const n = { x: u.y * v.z - u.z * v.y, y: u.z * v.x - u.x * v.z, z: u.x * v.y - u.y * v.x };
  const length = Math.hypot(n.x, n.y, n.z);
  return length > 0 && Math.abs((d.x - a.x) * n.x + (d.y - a.y) * n.y + (d.z - a.z) * n.z) / length <= tolerance;
}

/**
 * Whether a tapered outline of straight sides and arcs (a rounded box, a slot) can be built piece by piece: the
 * top is the bottom's partner in kind, and every straight side stays flat - its four corners in one plane.
 */
function piecewiseLoftPossible(profile: CadModifierProfilePart, tolerance: number) {
  const top = profile.topLoops ?? [];
  return profile.loops.every((loop, index) => {
    const upper = top[index];
    if (!upper || loop.segments.length < 3 || loop.segments.length !== upper.segments.length) return false;
    let a: Point = loop;
    let c: Point = upper;
    return loop.segments.every((segment, piece) => {
      const partner = upper.segments[piece];
      const ok = segment.kind === partner.kind && (segment.kind === "line" || (segment.kind === "arc" && !isWholeEllipse(segment)))
        && (segment.kind !== "line" || pieceIsFlat([{ x: a.x, y: 0, z: a.z }, { x: segment.x, y: 0, z: segment.z }, { x: partner.x, y: profile.height, z: partner.z }, { x: c.x, y: profile.height, z: c.z }], tolerance));
      a = segment;
      c = partner;
      return ok;
    });
  });
}

/**
 * A tapered or leaning prism whose outline has straight sides and arcs, built piece by piece: every straight side
 * a plane, every arc corner the ruled surface between its two arcs. A loft through the whole wire gives a B-spline
 * for the flat sides too, and a chamfer or fillet along such a side then comes out curved (#612).
 */
function piecewiseLoftSolid(cad: OcctKernel, profile: CadModifierProfilePart, tolerance: number) {
  const top = profile.topLoops ?? [];
  const lift = [1, 0, 0, 0, 0, 1, 0, profile.height, 0, 0, 1, 0];
  const faces: ShapeHandle[] = [];
  const cap = (loops: CadModifierProfileLoop[], raised: boolean) => {
    const wires = loops.map((loop) => {
      const wire = loopWire(cad, loop, tolerance);
      return raised ? cad.transform(wire, lift) : wire;
    });
    let face = cad.makeFace(wires[0]);
    if (wires.length > 1) face = cad.addHolesInFace(face, wires.slice(1));
    faces.push(face);
  };
  cap(profile.loops, false);
  cap(top, true);
  profile.loops.forEach((loop, index) => {
    const upper = top[index];
    let from: Point = loop;
    let fromTop: Point = upper;
    loop.segments.forEach((segment, piece) => {
      const partner = upper.segments[piece];
      if (segment.kind === "line") {
        const a = { x: from.x, y: 0, z: from.z };
        const b = { x: segment.x, y: 0, z: segment.z };
        const c = { x: partner.x, y: profile.height, z: partner.z };
        const d = { x: fromTop.x, y: profile.height, z: fromTop.z };
        faces.push(cad.makeFace(cad.makeWire([cad.makeLineEdge(a, b), cad.makeLineEdge(b, c), cad.makeLineEdge(c, d), cad.makeLineEdge(d, a)])));
      } else {
        const lower = cad.makeWire([segmentEdge(cad, from, segment, tolerance)]);
        const raised = cad.transform(cad.makeWire([segmentEdge(cad, fromTop, partner, tolerance)]), lift);
        faces.push(cad.loft([lower, raised], false, true));
      }
      from = segment;
      fromTop = partner;
    });
  });
  const sewn = cad.sew(faces, tolerance * 100);
  const shells = cad.isShell(sewn) ? [sewn] : cad.getSubShapes(sewn, "shell");
  if (shells.length !== 1) throw new Error(`The tapered pieces did not close into one shell (${shells.length})`);
  const solid = [shells[0], cad.reverseShape(shells[0])].map((shell) => cad.makeSolid(shell))
    .find((candidate) => cad.isValid(candidate) && cad.getVolume(candidate) > 0);
  if (!solid) throw new Error("The tapered pieces did not make a valid solid");
  return solid;
}

/** A loop scaled by `sx` across (x) and `sz` in height (z) about the origin. */
function loopScaled(loop: CadModifierProfileLoop, sx: number, sz: number): CadModifierProfileLoop {
  return {
    x: loop.x * sx,
    z: loop.z * sz,
    segments: loop.segments.map((segment): CadModifierProfileSegment => {
      if (segment.kind === "line") return { ...segment, x: segment.x * sx, z: segment.z * sz };
      if (segment.kind === "bezier") return { ...segment, x: segment.x * sx, z: segment.z * sz, controls: segment.controls.map((control) => ({ x: control.x * sx, z: control.z * sz })) };
      return { ...segment, x: segment.x * sx, z: segment.z * sz, cx: segment.cx * sx, cz: segment.cz * sz, rx: segment.rx * sx, rz: segment.rz * sz };
    }),
  };
}

/**
 * A loft through the bottom section scaled step by step (slope and narrowing along, `sections`):
 * split at its corners into runs, each run ruled between two sections or smooth through more,
 * the runs fused into one body.
 */
function sectionedLoftSolid(cad: OcctKernel, profile: CadModifierProfilePart, tolerance: number) {
  const sections = profile.sections ?? [];
  const runs: Array<typeof sections> = [];
  let run: typeof sections = [];
  sections.forEach((section, index) => {
    run.push(section);
    if (index > 0 && (section.corner || index === sections.length - 1)) {
      runs.push(run);
      run = [section];
    }
  });
  // `loops` is the first section already: the others are scaled relative to it.
  const first = sections[0];
  const runSolid = (index: number, part: typeof sections) => {
    const wires = part.map((section) => cad.transform(loopWire(cad, loopScaled(profile.loops[index], section.sx / first.sx, section.sz / first.sz), tolerance), [1, 0, 0, 0, 0, 1, 0, profile.height * section.t, 0, 0, 1, 0]));
    const lofted = cad.loft(wires, true, part.length === 2);
    const solids = cad.isSolid(lofted) ? [lofted] : cad.getSubShapes(lofted, "solid");
    if (solids.length !== 1) throw new Error("A sectioned loft did not become one solid");
    return cad.getVolume(solids[0]) < 0 ? cad.reverseShape(solids[0]) : solids[0];
  };
  const solidOf = (index: number) => runs.slice(1).reduce((body, part) => cad.fuse(body, runSolid(index, part)), runSolid(index, runs[0]));
  let solid = solidOf(0);
  for (let index = 1; index < profile.loops.length; index += 1) solid = cad.cut(solid, solidOf(index));
  const solids = cad.isSolid(solid) ? [solid] : cad.getSubShapes(solid, "solid");
  if (solids.length !== 1) throw new Error("The sectioned loft did not become one solid");
  return solids[0];
}

function loftSolid(cad: OcctKernel, profile: CadModifierProfilePart, tolerance: number) {
  // A triangle is always flat.
  if (profile.apex) return flatLoftSolid(cad, profile, tolerance);
  const top = profile.topLoops ?? [];
  if ((profile.sections?.length ?? 0) > 2) return sectionedLoftSolid(cad, profile, tolerance);
  if (Math.abs(profile.twist ?? 0) > 1e-9 || Math.abs(profile.tilt?.x ?? 0) > 1e-9 || Math.abs(profile.tilt?.z ?? 0) > 1e-9 || (profile.smooth ?? 0) > 1e-9) {
    return twistedLoftSolid(cad, profile, tolerance);
  }
  if ([...profile.loops, ...top].every((loop) => loop.segments.every((segment) => segment.kind === "line")) && sidesAreFlat(profile, tolerance)) {
    return flatLoftSolid(cad, profile, tolerance);
  }
  if (piecewiseLoftPossible(profile, tolerance)) {
    try {
      return piecewiseLoftSolid(cad, profile, tolerance);
    } catch {
      // Whatever the pieces do not close into: the loft through the whole wire below builds it.
    }
  }
  const lift = [1, 0, 0, 0, 0, 1, 0, profile.height, 0, 0, 1, 0];
  /*
   * A whole circle or ellipse is one closed edge, and the kernel starts it
   * where its major axis points - along x for one end, along z for the other
   * when the taper turns a wide oval into a narrow one. The ruled loft joins
   * the two edges start to start, so it would twist a quarter turn. Then both
   * are split into two halves from the angle 0 and pi: both ends start at
   * the same point of the outline and every ruling joins a point to its own
   * partner. Ends built the same way stay one edge each - one rim to pick.
   */
  const halves = (loop: CadModifierProfileLoop): CadModifierProfileLoop => {
    if (loop.segments.length !== 1 || !isWholeEllipse(loop.segments[0])) return loop;
    const whole = loop.segments[0] as ProfileArc;
    const at = (angle: number) => profileArcPoint(whole, angle);
    const first = whole.start;
    const middle = whole.start + (whole.end - whole.start) / 2;
    return {
      ...at(first),
      segments: [
        { ...whole, ...at(middle), start: first, end: middle },
        { ...whole, ...at(whole.end), start: middle, end: whole.end },
      ],
    };
  };
  // wholeEllipseEdge builds a circle, an ellipse long along z and one long
  // along x three ways; two ends built the same way start at the same point.
  const build = (loop: CadModifierProfileLoop) => {
    const arc = loop.segments[0] as ProfileArc;
    return sameRadius(arc.rx, arc.rz) ? "circle" : arc.rz > arc.rx ? "along z" : "along x";
  };
  const solidOf = (index: number) => {
    const [lower, upper] = [profile.loops[index], top[index]];
    // A straight-sided loop whose sides stay flat is built face by face even
    // beside a round one (a bevel gear round its bore): planes, not B-splines.
    const single: CadModifierProfilePart = { ...profile, loops: [lower], topLoops: [upper] };
    if ([lower, upper].every((loop) => loop.segments.every((segment) => segment.kind === "line")) && sidesAreFlat(single, tolerance)) {
      return flatLoftSolid(cad, single, tolerance);
    }
    const split = lower.segments.length === 1 && isWholeEllipse(lower.segments[0]) && build(lower) !== build(upper);
    const bottomWire = loopWire(cad, split ? halves(lower) : lower, tolerance);
    const raw = loopWire(cad, split ? halves(upper) : upper, tolerance);
    const topWire = cad.transform(raw, lift);
    const lofted = cad.loft([bottomWire, topWire], true, true);
    const solids = cad.isSolid(lofted) ? [lofted] : cad.getSubShapes(lofted, "solid");
    if (solids.length !== 1) throw new Error("A loft did not become one solid");
    // A loop running clockwise lofts inside out; turned the right way it is the same body.
    return cad.getVolume(solids[0]) < 0 ? cad.reverseShape(solids[0]) : solids[0];
  };
  let solid = solidOf(0);
  for (let index = 1; index < profile.loops.length; index += 1) {
    solid = cad.cut(solid, solidOf(index));
  }
  const solids = cad.isSolid(solid) ? [solid] : cad.getSubShapes(solid, "solid");
  if (solids.length !== 1) throw new Error("The loft with its openings did not become one solid");
  return solids[0];
}

/** Round corners. */
const JOIN_ARC = JoinType.Arc;

/**
 * A flat face pushed up `height` from y = 0, whichever way round the kernel built the face: a face
 * looking down makes an inside-out prism going up, which is pushed down and lifted back instead.
 */
function faceSolid(cad: OcctKernel, face: ShapeHandle, height: number) {
  const up = cad.extrude(face, 0, height, 0);
  if (cad.isValid(up) && cad.getVolume(up) > 0) return up;
  return cad.translate(cad.extrude(face, 0, -height, 0), 0, height, 0);
}

/**
 * The one face a shape the kernel made from moved outlines consists of, valid: such a result can
 * come out with tiny overlaps that the kernel's own repair closes, which is kept only where it did
 * not change the area. Throws when it is not one face, or stays invalid.
 */
function validFace(cad: OcctKernel, shape: ShapeHandle) {
  const single = (candidate: ShapeHandle) => {
    const faces = cad.isFace(candidate) ? [candidate] : cad.getSubShapes(candidate, "face");
    return faces.length === 1 ? faces[0] : null;
  };
  const face = single(shape);
  if (face && cad.isValid(face)) return face;
  const area = cad.getSurfaceArea(shape);
  const repaired = single(cad.fixShape(shape));
  if (!repaired || !cad.isValid(repaired) || !(Math.abs(cad.getSurfaceArea(repaired) - area) <= 0.01 * area)) throw new Error("The moved outlines are not a valid face");
  return repaired;
}

/**
 * The faces an outline's offset encloses: `delta` out (wider) or in, whichever way round the kernel
 * counts it. Moved out, `faces` is the one face and `pockets` the voids that close up inside it, as
 * at the mouth of an "e"; moved in, `faces` has a face for each piece the outline falls into. Null
 * when it comes back no wider (narrower) than the outline - an inward offset that has closed up, say.
 */
function offsetFaces(cad: OcctKernel, wire: ShapeHandle, delta: number, wider: boolean): { faces: ShapeHandle[]; pockets: ShapeHandle[] } | null {
  const base = cad.makeFace(wire);
  const baseArea = cad.getSurfaceArea(base);
  const baseBox = cad.getBoundingBox(base);
  for (const signed of [delta, -delta]) {
    let pieces: Array<{ face: ShapeHandle; area: number }>;
    try {
      const moved = cad.offsetWire2D(wire, signed, JOIN_ARC);
      const wires = cad.isWire(moved) ? [moved] : cad.getSubShapes(moved, "wire");
      pieces = wires.map((piece) => {
        const face = validFace(cad, cad.makeFace(piece));
        return { face, area: cad.getSurfaceArea(face) };
      }).sort((a, b) => b.area - a.area);
    } catch {
      continue;
    }
    if (!pieces.length) continue;
    const faces = wider ? [pieces[0].face] : pieces.map((piece) => piece.face);
    const pockets = wider ? pieces.slice(1).map((piece) => piece.face) : [];
    const area = (wider ? pieces[0].area - pieces.slice(1).reduce((sum, piece) => sum + piece.area, 0) : pieces.reduce((sum, piece) => sum + piece.area, 0));
    if (!(area > 1e-9) || (wider ? area <= baseArea : area >= baseArea)) continue;
    // Moved in, it has to stay inside where it started.
    const outside = !wider && faces.some((face) => {
      const box = cad.getBoundingBox(face);
      return box.xmin < baseBox.xmin - 1e-6 || box.xmax > baseBox.xmax + 1e-6 || box.zmin < baseBox.zmin - 1e-6 || box.zmax > baseBox.zmax + 1e-6;
    });
    if (outside) continue;
    return { faces, pockets };
  }
  return null;
}

/** A turn smaller than this at the joint of two segments is a font's small kink, not a corner (3.5 degrees). */
const SMOOTH_TURN = 0.061;

/**
 * An outline of a font with the small kinks at the joints of its curves taken out: where two
 * segments meet at a turn of a few degrees at most, their end directions are made one (the curves'
 * control points turned a little about the joint, a straight neighbour keeps its direction). A
 * font draws many such joints - the kernel then puts a round corner of the offset's radius on each
 * one when it moves the outline out, an edge a hundredth of a millimetre long that no fillet will
 * go over. Straight lines stay as they are, corners too.
 */
function smoothedLoop(loop: CadModifierProfileLoop): CadModifierProfileLoop {
  type Pt = { x: number; z: number };
  // A quadratic curve's one control point serves both ends: as a cubic each end has its own.
  let from: Pt = { x: loop.x, z: loop.z };
  const segments = loop.segments.map((segment) => {
    const start = from;
    from = segment;
    if (segment.kind !== "bezier") return { ...segment };
    if (segment.controls.length !== 1) return { ...segment, controls: segment.controls.map((control) => ({ ...control })) };
    const [control] = segment.controls;
    const third = (a: Pt, b: Pt) => ({ x: a.x + (2 / 3) * (b.x - a.x), z: a.z + (2 / 3) * (b.z - a.z) });
    return { ...segment, controls: [third(start, control), third({ x: segment.x, z: segment.z }, control)] };
  });
  const count = segments.length;
  const point = (index: number): Pt => (index < 0 ? { x: loop.x, z: loop.z } : segments[index]);
  // The direction a segment arrives in, and leaves in.
  const arrival = (index: number): Pt => {
    const segment = segments[index];
    const before = segment.kind === "bezier" ? segment.controls[segment.controls.length - 1] : point(index - 1);
    return { x: segment.x - before.x, z: segment.z - before.z };
  };
  const departure = (index: number): Pt => {
    const segment = segments[index];
    const origin = point(index - 1);
    const after = segment.kind === "bezier" ? segment.controls[0] : segment;
    return { x: after.x - origin.x, z: after.z - origin.z };
  };
  const turnOf = (a: Pt, b: Pt) => {
    const turn = Math.atan2(a.x * b.z - a.z * b.x, a.x * b.x + a.z * b.z);
    return turn;
  };
  const rotate = (center: Pt, target: Pt, angle: number): Pt => {
    const dx = target.x - center.x;
    const dz = target.z - center.z;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return { x: center.x + dx * cos - dz * sin, z: center.z + dx * sin + dz * cos };
  };
  for (let index = 0; index < count; index += 1) {
    const before = (index + count - 1) % count;
    const turn = turnOf(arrival(before), departure(index));
    if (Math.abs(turn) < 1e-12 || Math.abs(turn) > SMOOTH_TURN) continue;
    const joint = segments[before];
    const arriving = segments[before];
    const leaving = segments[index];
    // A straight neighbour keeps its direction; between two curves each turns half way.
    const turnArriving = leaving.kind === "line" ? turn : arriving.kind === "line" ? 0 : turn / 2;
    const turnLeaving = arriving.kind === "line" ? -turn : leaving.kind === "line" ? 0 : -turn / 2;
    if (arriving.kind === "line" && leaving.kind === "line") continue;
    if (arriving.kind === "bezier" && turnArriving !== 0) {
      const last = arriving.controls.length - 1;
      arriving.controls[last] = rotate(joint, arriving.controls[last], turnArriving);
    }
    if (leaving.kind === "bezier" && turnLeaving !== 0) leaving.controls[0] = rotate(joint, leaving.controls[0], turnLeaving);
  }
  return { x: loop.x, z: loop.z, segments };
}

/** A side face narrower than this (mm) is a leftover of the kernel's offset, not part of a letter. */
const SLIVER_WIDTH = 0.05;

/**
 * The solid without the slivers its sides can carry: where the kernel moves an outline out past a
 * sharp inside corner it leaves a side face a hundredth of a millimetre wide, and a fillet will not
 * go over it. The faces beside it are carried on to meet, which the kernel does for removing small
 * features. The solid as it is when that does not work out.
 */
function withoutSlivers(cad: OcctKernel, solid: ShapeHandle, height: number) {
  const slivers = cad.getSubShapes(solid, "face").filter((face) => {
    const box = cad.getBoundingBox(face);
    // A side face: not one of the flat ends.
    return !(Math.abs(box.ymax - box.ymin) < 1e-9) && cad.getSurfaceArea(face) < height * SLIVER_WIDTH;
  });
  if (!slivers.length) return solid;
  try {
    const volume = cad.getVolume(solid);
    const cleaned = cad.defeature(solid, slivers, 0);
    const solids = cad.isSolid(cleaned) ? [cleaned] : cad.getSubShapes(cleaned, "solid");
    if (solids.length === 1 && cad.isValid(solids[0]) && Math.abs(cad.getVolume(solids[0]) - volume) <= 1e-3 * volume) return solids[0];
  } catch (error) {
    if (/memory|WebAssembly|abort/i.test(error instanceof Error ? error.message : String(error))) throw error;
  }
  return solid;
}

/**
 * A widened text (profile.grow) as one exact solid: every letter's outline moved out by the kernel,
 * its counters moved in (and gone where they close up), the letters joined as flat faces - the
 * joining of flat faces is robust where that of the curved walls of two prisms is not - and the
 * face pushed up once. Throws when anything is off - the caller then builds `profile.loops`, the
 * polygon outline of the same body.
 */
export function grownProfileSolid(cad: OcctKernel, profile: CadModifierProfilePart) {
  const grow = profile.grow!;
  const tolerance = profileExtent(profile) * 1e-6;
  const height = profile.height;
  let joined: ShapeHandle | null = null;
  for (const region of grow.regions) {
    const outerWire = loopWire(cad, smoothedLoop(region.outer), tolerance);
    let face: ShapeHandle;
    const cutAway = (hole: ShapeHandle) => {
      face = validFace(cad, cad.cut(face, hole));
    };
    if (grow.width > 0) {
      const wider = offsetFaces(cad, outerWire, grow.width, true);
      if (!wider) throw new Error("A letter could not be widened by the kernel");
      face = wider.faces[0];
      // The voids that close up inside it are holes in the letters, except in a silhouette.
      if (!grow.silhouette) wider.pockets.forEach(cutAway);
    } else {
      face = validFace(cad, cad.makeFace(outerWire));
    }
    for (const hole of grow.silhouette ? [] : region.holes) {
      const wire = loopWire(cad, smoothedLoop(hole), tolerance);
      // A counter that the widening has closed leaves nothing to cut.
      const smaller = grow.width > 0 ? offsetFaces(cad, wire, -grow.width, false)?.faces : [validFace(cad, cad.makeFace(wire))];
      (smaller ?? []).forEach(cutAway);
    }
    joined = joined ? cad.fuse(joined, face) : face;
  }
  if (!joined) throw new Error("The widened text has no letters");
  let face = validFace(cad, cad.unifySameDomain(joined));
  // Letters that run together once wider can close a pocket between them; a silhouette has none.
  if (grow.silhouette && cad.getSubShapes(face, "wire").length > 1) face = validFace(cad, cad.makeFace(cad.outerWire(face)));
  let solid = withoutSlivers(cad, faceSolid(cad, face, height), height);
  if (!cad.isSolid(solid) || !cad.isValid(solid)) throw new Error("The widened text is not a valid solid");
  const volume = cad.getVolume(solid);
  const expected = grow.area * height;
  if (!(Math.abs(volume - expected) <= 0.05 * expected)) throw new Error("The widened text does not keep the outline's volume");
  return solid;
}

export function profileExtrusionSolid(cad: OcctKernel, profile: CadModifierProfilePart): ShapeHandle {
  if (profile.trim && profile.kind === "extrusion") {
    // Slope along: the plain body, and what of it lies inside the side outline pushed across.
    const base = profileExtrusionSolid(cad, { ...profile, trim: undefined });
    const trim = profile.trim;
    const face = cad.makeFace(loopWire(cad, trim.loops[0], profileExtent(profile) * 1e-6));
    const prism = cad.transform(cad.extrude(face, 0, trim.height, 0), trim.frame);
    const kept = cad.common(base, prism);
    const solids = cad.isSolid(kept) ? [kept] : cad.getSubShapes(kept, "solid");
    if (solids.length !== 1 || !cad.isValid(solids[0]) || !(cad.getVolume(solids[0]) > 0)) throw new Error("The trimmed profile solid is not valid");
    return solids[0];
  }
  validateCadProfile(profile);
  if (profile.kind === "extrusion" && profile.grow) {
    try {
      return grownProfileSolid(cad, profile);
    } catch (error) {
      // A kernel that has run out of room is for the caller to reset; anything else the outline of straight pieces answers.
      if (/memory|WebAssembly|abort/i.test(error instanceof Error ? error.message : String(error))) throw error;
    }
  }
  const tolerance = profileExtent(profile) * 1e-6;
  if (profile.kind === "loft") {
    const solid = loftSolid(cad, profile, tolerance);
    if (!cad.isSolid(solid) || !cad.isValid(solid)) throw new Error("The lofted profile solid is not valid");
    if (!(cad.getVolume(solid) > 0)) throw new Error("The lofted profile solid is inside out");
    return profile.capChamfer && profile.capChamfer.size > 1e-4 ? chamferedLoft(cad, solid, profile) : solid;
  }
  const [outer, ...holes] = profile.loops;
  let face = cad.makeFace(loopWire(cad, outer, tolerance));
  if (holes.length > 0) face = cad.addHolesInFace(face, holes.map((hole) => loopWire(cad, hole, tolerance)));
  // A revolution turns its half-section once around the Z axis; the result stands along Z.
  let solid = profile.kind === "revolution"
    ? cad.revolve(face, { point: ORIGIN, direction: { x: 0, y: 0, z: 1 } }, TWO_PI)
    : profile.kind === "sweep"
      ? sweptSolid(cad, face, profile, profileExtent(profile))
      : cad.extrude(face, 0, profile.height, 0);
  const solids = cad.isSolid(solid) ? [solid] : cad.getSubShapes(solid, "solid");
  if (solids.length !== 1) throw new Error("The profile did not become one solid");
  solid = solids[0];
  const isValid = (candidate: ShapeHandle) => {
    try {
      return Boolean(cad.isValid(candidate));
    } catch {
      return false;
    }
  };
  if (!isValid(solid) && profile.kind !== "extrusion") throw new Error("The turned or swept profile solid is not valid");
  if (!isValid(solid)) {
    // Some font outlines (the "1" of the Rounded face, for one) come out of
    // the face builder flagged invalid, and the kernel's own repair fixes
    // them. It is only kept when it did not change the body: its volume has to
    // match the outline's area times the height - elsewhere the repair can
    // throw away most of a glyph and still call the rest valid.
    const repaired = cad.fixShape(solid);
    const repairedSolids = cad.isSolid(repaired) ? [repaired] : cad.getSubShapes(repaired, "solid");
    if (repairedSolids.length !== 1 || !isValid(repairedSolids[0])) throw new Error("The profile solid is not valid");
    const expectedVolume = profileArea(profile) * profile.height;
    if (!(Math.abs(cad.getVolume(repairedSolids[0]) - expectedVolume) <= 0.005 * expectedVolume)) {
      throw new Error("The repaired profile solid does not keep the outline's volume");
    }
    solid = repairedSolids[0];
  }
  if (!(cad.getVolume(solid) > 0)) throw new Error("The profile solid is inside out");
  if (profile.capFillet && profile.capFillet > 1e-4 && profile.kind === "extrusion") {
    // The flat ends of the extrusion: every edge lying in the plane y = 0 or y = height.
    const edges = cad.getSubShapes(solid, "edge").filter((edge) => {
      const box = cad.getBoundingBox(edge);
      return Math.abs(box.ymax - box.ymin) < 1e-6 && (Math.abs(box.ymin) < 1e-6 || Math.abs(box.ymin - profile.height) < 1e-6);
    });
    const rounded = cad.fillet(solid, edges, profile.capFillet);
    if (!cad.isSolid(rounded) || !isValid(rounded) || !(cad.getVolume(rounded) > 0)) throw new Error("The rounded ends of the profile solid are not valid");
    return rounded;
  }
  if (profile.capChamfer && profile.capChamfer.size > 1e-4 && profile.kind === "extrusion") {
    // A turned bound: the axis on y, a cone at 45 degrees at each end and
    // room to spare in between; what the extrusion has in common with it.
    const { radius, size } = profile.capChamfer;
    const h = profile.height;
    const spare = radius + 1;
    const section = [
      { x: 0, y: 0 }, { x: radius - size, y: 0 }, { x: spare, y: spare - radius + size },
      { x: spare, y: h - (spare - radius + size) }, { x: radius - size, y: h }, { x: 0, y: h },
    ].map((point) => ({ x: point.x, y: point.y, z: 0 }));
    const wire = cad.makeWire(section.map((point, index) => cad.makeLineEdge(point, section[(index + 1) % section.length])));
    const bound = cad.revolve(cad.makeFace(wire), { point: { x: 0, y: 0, z: 0 }, direction: { x: 0, y: 1, z: 0 } }, Math.PI * 2);
    const common = cad.common(solid, bound);
    const solids = cad.isSolid(common) ? [common] : cad.getSubShapes(common, "solid");
    if (solids.length !== 1 || !isValid(solids[0]) || !(cad.getVolume(solids[0]) > 0)) throw new Error("The chamfered ends of the profile solid are not valid");
    return solids[0];
  }
  return solid;
}

/**
 * A tapered or leaning knurl (#630) with its 45 degree ends: the loft meets a
 * turned bound whose section is the straight cone the display mesh has,
 * narrowed by the taper at each height and sheared by the lean. The cone is
 * followed through three heights per end, so the narrowing does not bend it.
 */
function chamferedLoft(cad: OcctKernel, solid: ShapeHandle, profile: CadModifierProfilePart) {
  const { radius, size, bottomScale = 1, topScale = 1, lean } = profile.capChamfer as NonNullable<CadModifierProfilePart["capChamfer"]>;
  const h = profile.height;
  const scaleAt = (y: number) => bottomScale + (topScale - bottomScale) * (y / h);
  const cone = (y: number) => (radius - size + Math.min(y, h - y)) * scaleAt(y);
  const wide = (radius + 2 * size) * Math.max(bottomScale, topScale);
  const reach = Math.min(2 * size, h / 2);
  const section = [
    { x: 0, y: 0 }, { x: cone(0), y: 0 }, { x: cone(size), y: size }, { x: cone(reach), y: reach },
    { x: wide, y: reach }, { x: wide, y: h - reach },
    { x: cone(h - reach), y: h - reach }, { x: cone(h - size), y: h - size }, { x: cone(h), y: h }, { x: 0, y: h },
  ].map((point) => ({ x: point.x, y: point.y, z: 0 }));
  const wire = cad.makeWire(section.map((point, index) => cad.makeLineEdge(point, section[(index + 1) % section.length])));
  let bound = cad.revolve(cad.makeFace(wire), { point: { x: 0, y: 0, z: 0 }, direction: { x: 0, y: 1, z: 0 } }, Math.PI * 2);
  if (lean && (Math.abs(lean.x) > 1e-9 || Math.abs(lean.z) > 1e-9)) {
    bound = cad.generalTransform(bound, [1, lean.x / h, 0, 0, 0, 1, 0, 0, 0, lean.z / h, 1, 0]);
  }
  const common = cad.common(solid, bound);
  const solids = cad.isSolid(common) ? [common] : cad.getSubShapes(common, "solid");
  if (solids.length !== 1 || !cad.isValid(solids[0]) || !(cad.getVolume(solids[0]) > 0)) throw new Error("The chamfered ends of the lofted profile solid are not valid");
  return solids[0];
}

function meshedBounds(cad: OcctKernel, solid: ShapeHandle, deflection: number) {
  const probe = cad.copy(solid);
  try {
    const { positions } = cad.tessellate(probe, { linearDeflection: Math.max(1e-4, deflection), angularDeflection: 0.5 });
    const bounds = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
    for (let index = 0; index + 2 < positions.length; index += 3) {
      for (let axis = 0; axis < 3; axis += 1) {
        bounds[axis] = Math.min(bounds[axis], positions[index + axis]);
        bounds[axis + 3] = Math.max(bounds[axis + 3], positions[index + axis]);
      }
    }
    return bounds;
  } finally {
    cad.release(probe);
  }
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
  const differ = (bounds: number[]) => Math.max(...bounds.map((value, index) => Math.abs(value - expected.bounds[index])));
  let worst = differ(actual);
  if (!(worst <= boundsTolerance)) {
    // The kernel's box is loose on a turned curved face - a tipped half
    // sphere measured 4 mm too big - so ask a coarse mesh of a copy (a copy,
    // so the body itself keeps no triangulation the preview would reuse).
    // Its vertices lie on the faces: that box is short of the true one by the
    // deflection at most, 0.5 % of the size - a tenth of the tolerance.
    worst = differ(meshedBounds(cad, solid, size * 5e-3));
  }
  if (!(worst <= boundsTolerance)) return `bounds differ by ${worst.toFixed(3)} mm`;
  const volume = Math.abs(cad.getVolume(solid));
  const expectedVolume = Math.abs(expected.volume);
  if (!(Math.abs(volume - expectedVolume) <= 0.15 * expectedVolume + 1e-6)) {
    return `volume ${volume.toFixed(2)} instead of ${expectedVolume.toFixed(2)} mm³`;
  }
  return null;
}
