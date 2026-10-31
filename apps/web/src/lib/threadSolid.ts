import type { OcctKernel, ShapeHandle, SweepMode } from "occt-wasm";
import type { CadModifierThreadPart } from "@/lib/cadModifierTypes";
import type { ThreadDriveOutline } from "@/lib/threadGeometry";

/** SweepMode.FixedUp, by value: the STEP export runs this outside the worker, where occt-wasm is only a type. */
const FIXED_UP = 2 as SweepMode;

/*
 * The exact body of a thread shape, as its display mesh draws it
 * (`createThreadGeometry`): the profile over one pitch - the drawn points
 * joined straight, or for Whitworth the arcs they sample - swept along a
 * helix; cut to length, with 45 degree chamfers at the thread ends; and for a
 * screw its head, for a nut its hex body around it.
 *
 * **Half a turn at a time.** A single sweep along many turns, fused with a
 * core cylinder, took the kernel half a minute and came out invalid. Instead
 * half a turn is built as a closed slab - the profile swept half round, the
 * helical strip from the axis to the crest below and above it, and the flat
 * profile section at both ends - and copied up, turned half round, half a
 * pitch at a time. Neighbouring copies meet face to face (the strip of one is
 * the strip of the next, the end section of one the start section of the
 * next); those shared faces are dropped and the rest is sewn into one solid,
 * without a boolean. Only the ends are cut, by the solid of revolution that
 * the chamfers and the length leave of the thread.
 *
 * Built with the axis on z (the kernel's helix and sweep frame) and stood up
 * on y at the end.
 */

type Point = [number, number];

const AXIS = { point: { x: 0, y: 0, z: 0 }, direction: { x: 0, y: 0, z: 1 } };
/** z up to y up: (x, y, z) -> (x, z, -y). A point at angle phi from +x towards +y lands at angle -phi from +x towards +z. */
const Z_TO_Y_UP = [1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0];

function closedWire(cad: OcctKernel, points: readonly Point[]) {
  const edges: ShapeHandle[] = [];
  for (let index = 0; index < points.length; index += 1) {
    const a = points[index];
    const b = points[(index + 1) % points.length];
    if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-9) continue;
    edges.push(cad.makeLineEdge({ x: a[0], y: 0, z: a[1] }, { x: b[0], y: 0, z: b[1] }));
  }
  return cad.makeWire(edges);
}

/** The solid of revolution about z of an outline in the x/z half plane (x = radius). */
function revolved(cad: OcctKernel, outline: readonly Point[]) {
  return cad.revolve(cad.makeFace(closedWire(cad, outline)), AXIS, 2 * Math.PI);
}

/** A prism of `height` from z = 0 on a hexagon with a corner on +x. */
function hexPrism(cad: OcctKernel, acrossFlats: number, height: number) {
  const corner = acrossFlats / Math.sqrt(3);
  const points = Array.from({ length: 6 }, (_, index) => ({ x: corner * Math.cos((index * Math.PI) / 3), y: corner * Math.sin((index * Math.PI) / 3), z: 0 }));
  const wire = cad.makeWire(points.map((point, index) => cad.makeLineEdge(point, points[(index + 1) % points.length])));
  return cad.extrude(cad.makeFace(wire), 0, 0, height);
}

/** Both rims of a turned body broken at 45 degrees: what is left of anything round within `faceRadius` at the faces. */
function rimChamferBound(cad: OcctKernel, faceRadius: number, height: number) {
  return revolved(cad, [[0, 0], [faceRadius, 0], [faceRadius + height / 2, height / 2], [faceRadius, height], [0, height]]);
}

function oneSolid(cad: OcctKernel, shape: ShapeHandle, what: string) {
  const solids = cad.isSolid(shape) ? [shape] : cad.getSubShapes(shape, "solid");
  if (solids.length !== 1) throw new Error(`The thread's ${what} came out as ${solids.length} solids`);
  return solids[0];
}

function boxKey(cad: OcctKernel, face: ShapeHandle) {
  const box = cad.getBoundingBox(face);
  // Rounded to a ten-thousandth, and never "-0": a face at z = 0 and its partner must read alike.
  return [box.xmin, box.ymin, box.zmin, box.xmax, box.ymax, box.zmax].map((value) => String(Math.round(value * 1e4) + 0)).join(",");
}

/**
 * Half a turn of the thread as faces: the profile swept half round, the
 * helical strip from the axis to the crest below it and one pitch above it,
 * and the flat profile section at both ends. Half, not whole: a sweep places
 * its profile at the nearest point of its spine, and the end of a whole turn
 * stands right above its start - some profile edges went down a pitch.
 */
/** A straight edge in the x/z half plane (x = radius). */
function lineEdge(cad: OcctKernel, a: Point, b: Point) {
  return cad.makeLineEdge({ x: a[0], y: 0, z: a[1] }, { x: b[0], y: 0, z: b[1] });
}

/**
 * One pitch of the profile in the x/z half plane, from the crest at z = 0 to
 * the crest at z = pitch: the true curve where the part names one, else the
 * points joined straight. A curve is one face per edge where the points make
 * one per chord - a Whitworth G1/2 rod had thousands of faces.
 */
function profileEdges(cad: OcctKernel, part: CadModifierThreadPart): ShapeHandle[] {
  const { pitch, major, minor } = part;
  const radiusAt = (level: number) => minor + (major - minor) * level;
  const curve = part.curve;
  if (curve?.kind === "round") {
    // A cubic spline through the cosine at 48 points a pitch, level and
    // vertical at both crests: off the cosine by far less than a micron.
    const samples = 48;
    const points = Array.from({ length: samples + 1 }, (_, index) => {
      const u = index / samples;
      return { x: radiusAt((1 + Math.cos(2 * Math.PI * u)) / 2), y: 0, z: u * pitch };
    });
    return [cad.interpolatePointsWithTangents(points, { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: 1 })];
  }
  if (curve?.kind === "whitworth") {
    // Crest arcs about (major - r, 0) and (major - r, pitch), the root arc
    // about (minor + r, pitch / 2), each running to where it is tangent to
    // the straight flank: 90 degrees less the half angle from its middle.
    const radius = curve.radius * pitch;
    const arcEnd = Math.PI / 2 - curve.halfAngle;
    const crest = (centerZ: number, angle: number): Point => [major - radius + radius * Math.cos(angle), centerZ + radius * Math.sin(angle)];
    const root = (angle: number): Point => [minor + radius - radius * Math.cos(angle), pitch / 2 + radius * Math.sin(angle)];
    const arc = (a: Point, b: Point, c: Point) => cad.makeArcEdge({ x: a[0], y: 0, z: a[1] }, { x: b[0], y: 0, z: b[1] }, { x: c[0], y: 0, z: c[1] });
    return [
      arc(crest(0, 0), crest(0, arcEnd / 2), crest(0, arcEnd)),
      lineEdge(cad, crest(0, arcEnd), root(-arcEnd)),
      arc(root(-arcEnd), root(0), root(arcEnd)),
      lineEdge(cad, root(arcEnd), crest(pitch, -arcEnd)),
      arc(crest(pitch, -arcEnd), crest(pitch, -arcEnd / 2), crest(pitch, 0)),
    ];
  }
  const profile: Point[] = [...part.profile.map((point): Point => [radiusAt(point.level), point.u * pitch]), [radiusAt(part.profile[0].level), pitch]];
  const edges: ShapeHandle[] = [];
  for (let index = 0; index + 1 < profile.length; index += 1) {
    const a = profile[index];
    const b = profile[index + 1];
    if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-9) continue;
    edges.push(lineEdge(cad, a, b));
  }
  return edges;
}

/**
 * Half a turn of the thread as faces: the profile swept half round, the
 * helical strip from the axis to the crest below it and one pitch above it,
 * and the flat profile section at both ends. Half, not whole: a sweep places
 * its profile at the nearest point of its spine, and the end of a whole turn
 * stands right above its start - some profile edges went down a pitch.
 */
function halfTurnFaces(cad: OcctKernel, part: CadModifierThreadPart, climbsCounterClockwise: boolean) {
  const pitch = part.pitch;
  // Both ends of the profile lie at the crest radius of its first point.
  const crestRadius = part.curve ? part.major : part.minor + (part.major - part.minor) * part.profile[0].level;
  const edges = profileEdges(cad, part);
  // The profile keeps the axis in its plane (fixed binormal), so every point
  // of it runs on a helix of its own radius and the same pitch - the
  // display's own construction.
  const helix = cad.makeHelixWireHanded({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }, pitch, pitch / 2, crestRadius, !climbsCounterClockwise);
  const flanks = cad.getSubShapes(cad.sweepAdvanced(cad.makeWire(edges), helix, { mode: FIXED_UP, up: { x: 0, y: 0, z: 1 } }), "face");
  // Inside the thread wherever two half turns meet, so only the outermost
  // strips and sections remain - and those are cut away with the ends.
  const strip = cad.getSubShapes(cad.loft([cad.makeWire([cad.makeLineEdge({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: pitch / 2 })]), helix], false, true), "face");
  const section = cad.makeFace(cad.makeWire([
    lineEdge(cad, [0, 0], [crestRadius, 0]),
    ...edges,
    lineEdge(cad, [crestRadius, pitch], [0, pitch]),
    lineEdge(cad, [0, pitch], [0, 0]),
  ]));
  const sectionEnd = cad.translate(cad.rotate(section, AXIS, Math.PI), 0, 0, pitch / 2);
  return [...flanks, ...strip, ...strip.map((face) => cad.translate(face, 0, 0, pitch)), section, sectionEnd];
}

/** Half turn `index` (0 starts on +x with its crest at z = `crestZ`), as faces. */
function halfTurn(cad: OcctKernel, unit: readonly ShapeHandle[], index: number, crestZ: number, pitch: number) {
  return unit.map((face) => {
    const turned = index % 2 === 0 ? face : cad.rotate(face, AXIS, Math.PI);
    return cad.translate(turned, 0, 0, crestZ + (index * pitch) / 2);
  });
}

/** Faces sewn into one solid, less the faces two half turns share: those are inside it. */
function sewnSolid(cad: OcctKernel, faces: readonly ShapeHandle[], pitch: number) {
  const keys = faces.map((face) => boxKey(cad, face));
  const count = new Map<string, number>();
  keys.forEach((key) => count.set(key, (count.get(key) ?? 0) + 1));
  const outer = faces.filter((_, index) => count.get(keys[index]) === 1);
  const sewn = cad.sew(outer, Math.max(1e-5, pitch * 1e-4));
  const shells = cad.getSubShapes(sewn, "shell");
  if (shells.length !== 1) throw new Error(`The thread's turns sewed into ${shells.length} shells`);
  let solid = cad.makeSolid(shells[0]);
  if (!(cad.getVolume(solid) > 0)) solid = cad.makeSolid(cad.reverseShape(shells[0]));
  if (!cad.isValid(solid) || !(cad.getVolume(solid) > 0)) throw new Error("The thread's turns did not close into a valid solid");
  return solid;
}

/**
 * Half turns covering z = `zFrom`..`zTo` at every angle, at least half a
 * pitch past both, crest at z = `crestZ` on +x. Half turn i covers its half
 * of the circle from z = crestZ + i pitch/2 (rising half a pitch across it)
 * to one pitch higher.
 */
function halfTurnRange(zFrom: number, zTo: number, crestZ: number, pitch: number) {
  return { first: 2 * Math.floor((zFrom - crestZ) / pitch) - 3, last: 2 * Math.ceil((zTo - crestZ) / pitch) + 1 };
}

/** The tap: the thread as a solid from `zFrom` to `zTo` (at least), uncut. */
function helicalSolid(cad: OcctKernel, part: CadModifierThreadPart, zFrom: number, zTo: number, crestZ: number, climbsCounterClockwise: boolean) {
  const unit = halfTurnFaces(cad, part, climbsCounterClockwise);
  const { first, last } = halfTurnRange(zFrom, zTo, crestZ, part.pitch);
  const faces: ShapeHandle[] = [];
  for (let index = first; index <= last; index += 1) faces.push(...halfTurn(cad, unit, index, crestZ, part.pitch));
  return sewnSolid(cad, faces, part.pitch);
}

/** The outside thread from `bottom` to the top: within the major radius, less the chamfer cones at its ends. */
function outsideThreadBound(cad: OcctKernel, part: CadModifierThreadPart, bottom: number, chamferBottom: boolean) {
  const { major, height, chamfer, chamferLow } = part;
  // Wider than the crest, so no face of the bound lies on a crest; the
  // chamfer cones run on to that width, past the crest, where they cut
  // nothing more but cross the crest instead of touching it.
  const clear = major + Math.max(0.1, part.pitch);
  const broken = chamfer > 0;
  const outline: Point[] = [[0, bottom]];
  if (chamferLow > 0 && chamferBottom) outline.push([major - chamferLow, bottom], [clear, bottom + chamferLow + (clear - major)]);
  else outline.push([clear, bottom]);
  if (broken) outline.push([clear, height - chamfer - (clear - major)], [major - chamfer, height]);
  else outline.push([clear, height]);
  outline.push([0, height]);
  return revolved(cad, outline);
}

/**
 * The outside thread cut to length and chamfered. Only the half turns that
 * reach into a chamfer or past an end are cut - a boolean on every turn of a
 * long rod took many seconds - and the rest is sewn on unchanged.
 */
function outsideThread(cad: OcctKernel, part: CadModifierThreadPart, bottom: number, crestZ: number, climbsCounterClockwise: boolean) {
  const { pitch, height, chamfer, chamferLow } = part;
  const unit = halfTurnFaces(cad, part, climbsCounterClockwise);
  const bound = outsideThreadBound(cad, part, bottom, part.chamferBottom);
  const { first, last } = halfTurnRange(bottom, height, crestZ, pitch);
  const broken = chamfer > 0;
  const clearOfBottom = bottom + (chamferLow > 0 && part.chamferBottom ? chamferLow + Math.max(0.1, pitch) : 0) + pitch * 0.01;
  const clearOfTop = height - (broken ? chamfer + Math.max(0.1, pitch) : 0) - pitch * 0.01;
  const low: ShapeHandle[] = [];
  const middle: ShapeHandle[] = [];
  const high: ShapeHandle[] = [];
  for (let index = first; index <= last; index += 1) {
    const from = crestZ + (index * pitch) / 2;
    const to = from + 1.5 * pitch;
    const faces = halfTurn(cad, unit, index, crestZ, pitch);
    if (from < clearOfBottom) low.push(...faces);
    else if (to > clearOfTop) high.push(...faces);
    else middle.push(...faces);
  }
  const trimmed = (faces: ShapeHandle[]) => cad.getSubShapes(oneSolid(cad, cad.common(sewnSolid(cad, faces, pitch), bound), "thread end"), "face");
  if (middle.length === 0) return oneSolid(cad, cad.common(sewnSolid(cad, [...low, ...high], pitch), bound), "thread");
  return sewnSolid(cad, [...trimmed(low), ...middle, ...(high.length ? trimmed(high) : [])], pitch);
}

/** The cone a chamfer cuts into an inside thread at z = `face`, opening outwards from it (`direction` 1 at the bottom, -1 at the top). */
function insideChamferCone(cad: OcctKernel, part: CadModifierThreadPart, face: number, direction: 1 | -1, chamfer: number) {
  const { major, minor } = part;
  const beyond = Math.max(1, part.pitch);
  // The cone runs on a little past the crest into the tap, so it crosses the
  // crest instead of ending on it: a ring lying on the crest made the boolean
  // fail for some pitches and phases. The tap fills almost all of that sliver.
  const reach = major - minor;
  const past = Math.min(reach * 0.25, Math.max(0, minor - 0.02));
  // At 45 degrees from the mouth down to the core, so the crests are cut away right down to the
  // core and no ledge is left at the outer diameter (#269).
  const outline: Point[] = [[0, face - direction * beyond], [major + chamfer + beyond, face - direction * beyond], [minor - past, face + direction * (chamfer + reach + past)], [0, face + direction * (chamfer + reach + past)]];
  return revolved(cad, direction === 1 ? outline : [...outline].reverse());
}

function screwHead(cad: OcctKernel, head: NonNullable<CadModifierThreadPart["head"]>) {
  let body: ShapeHandle;
  if (head.kind === "hex") body = hexPrism(cad, head.acrossFlats, head.height);
  else if (head.kind === "countersunk") body = revolved(cad, [[0, 0], [head.radius, 0], [head.neckRadius, head.height], [0, head.height]]);
  else body = cad.makeCylinder(head.radius, head.height);
  if (head.chamferFaceRadius > 0) body = oneSolid(cad, cad.common(body, rimChamferBound(cad, head.chamferFaceRadius, head.height)), "head");
  if (head.socketDepth > 0 && head.driveOutline) body = oneSolid(cad, cad.cut(body, drivePrism(cad, head.driveOutline, head.socketDepth)), "head");
  return body;
}

/**
 * The drive as a prism of `depth` from z = 0, from its outline: straight
 * edges and true arcs. The outline lies in the shape's x/z plane; the turn
 * up to y takes this z-up (x, y) to (x, -z), so z goes in as -y.
 */
function drivePrism(cad: OcctKernel, outline: ThreadDriveOutline, depth: number) {
  const at = ([x, z]: readonly [number, number]) => ({ x, y: -z, z: 0 });
  const edges: ShapeHandle[] = [];
  let from = outline.start;
  for (const edge of outline.edges) {
    edges.push(edge.mid ? cad.makeArcEdge(at(from), at(edge.mid), at(edge.to)) : cad.makeLineEdge(at(from), at(edge.to)));
    from = edge.to;
  }
  return cad.extrude(cad.makeFace(cad.makeWire(edges)), 0, 0, depth);
}

/** The thread part's exact solid in the shape's own frame, y up. Throws when the kernel cannot build it. */
export function threadPartSolid(cad: OcctKernel, part: CadModifierThreadPart): ShapeHandle {
  const { role, pitch, height, shaftBottom } = part;
  if (!(part.major > part.minor && part.minor > 0 && pitch > 0 && height > 0)) throw new Error("The thread's measures are out of range");
  if (Math.max(part.chamfer, part.chamferLow) > 0.001 && part.major - Math.max(part.chamfer, part.chamferLow) < 0.05) throw new Error("The thread's chamfer reaches its axis");
  // A thread that climbs with the angle from +x towards +z (hand 1) is a
  // left-hand one; the turn up to y maps it to clockwise about +z seen from above.
  const counterClockwise = part.hand !== 1;
  let solid: ShapeHandle;
  if (role === "rod" || role === "screw") {
    // A screw's thread reaches a little into its head, so the two overlap
    // rather than touch - above the socket floor, so the socket stays open.
    const head = role === "screw" ? part.head : undefined;
    const into = head ? Math.min(pitch, (shaftBottom - (head.socketDepth > 0 ? head.socketDepth : 0)) * 0.5) : 0;
    const bottom = shaftBottom - into;
    solid = outsideThread(cad, part, bottom, shaftBottom, counterClockwise);
    if (head) solid = oneSolid(cad, cad.fuse(screwHead(cad, head), solid), "screw");
  } else {
    // A nut or a tapped hole: the thread as the tap that cuts it, reaching
    // past both faces, and the chamfer cones that widen its mouths.
    const tap = helicalSolid(cad, part, -pitch, height + pitch, 0, counterClockwise);
    const cones = [
      ...(part.chamferBottom && part.chamferLow > 0 ? [insideChamferCone(cad, part, 0, 1, part.chamferLow)] : []),
      ...(part.chamfer > 0 ? [insideChamferCone(cad, part, height, -1, part.chamfer)] : []),
    ];
    if (role === "nut" && part.nut) {
      let body = hexPrism(cad, part.nut.acrossFlats, height);
      if (part.nut.chamferFaceRadius > 0) body = oneSolid(cad, cad.common(body, rimChamferBound(cad, part.nut.chamferFaceRadius, height)), "nut");
      for (const cone of cones) body = oneSolid(cad, cad.cut(body, cone), "nut");
      solid = oneSolid(cad, cad.cut(body, tap), "nut");
    } else {
      let hole = tap;
      for (const cone of cones) hole = oneSolid(cad, cad.fuse(hole, cone), "tapped hole");
      const clear = part.major + Math.max(part.chamfer, part.chamferLow) + Math.max(1, pitch);
      solid = oneSolid(cad, cad.common(hole, revolved(cad, [[0, 0], [clear, 0], [clear, height], [0, height]])), "tapped hole");
    }
  }
  if (!cad.isValid(solid)) throw new Error("The thread body is not a valid solid");
  return cad.transform(solid, Z_TO_Y_UP);
}
