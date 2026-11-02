import type { OcctKernel, ShapeHandle } from "occt-wasm";
import { cadSketchRegions, type OrderedCadSketchPath } from "@/lib/sketchCadProfile";
import { circularArcMidpoint } from "@/lib/sketchCircularArc";
import { solidSketchProfile } from "@/lib/sketchConstruction";
import type { SketchProfile } from "@/types/layerling";

// A revolved sketch as an exact CAD body, built like an extruded one. It lives
// outside the worker so the end-to-end tests can run it against the real kernel.

/** How far a point may stand to the right of the axis and still count as on it. */
const AXIS_TOLERANCE = 1e-6;

/**
 * The profile stands left of the axis (x <= 0), as the sketch view draws it, at least in part:
 * what reaches past the axis is cut off there, as the mesh revolve does (#1183).
 */
export function revolveProfileFitsAxis(sketch: SketchProfile) {
  // A construction line may stand anywhere; only the outline counts (#229).
  const profile = solidSketchProfile(sketch);
  return profile.points.some((point) => point.x < -AXIS_TOLERANCE);
}

/** Whether `point` lies on the straight line through `from` and `to`, within a thousandth of a millimetre. */
function onLine(from: { x: number; z: number }, to: { x: number; z: number }, point: { x: number; z: number }) {
  const length = Math.hypot(to.x - from.x, to.z - from.z);
  if (length < 1e-9) return Math.hypot(point.x - from.x, point.z - from.z) < 1e-3;
  return Math.abs((to.x - from.x) * (point.z - from.z) - (to.z - from.z) * (point.x - from.x)) / length < 1e-3;
}

/**
 * The section as a wire in the plane z = 0: the distance from the axis along x,
 * the height along y. The sketch's x runs left of the axis and its z downwards,
 * so both flip - the same mapping the mesh revolve uses. Whatever lies past the
 * axis comes out at x < 0 and is cut off from the face afterwards.
 */
function sectionWire(cad: OcctKernel, path: OrderedCadSketchPath, maxZ: number) {
  const map = (point: { x: number; z: number }) => ({ x: -point.x, y: maxZ - point.z, z: 0 });
  const edges = path.steps.map(({ segment, from, to }) => {
    const forward = segment.startId === from.id;
    const first = forward ? from.handleOut : from.handleIn;
    const second = forward ? to.handleIn : to.handleOut;
    // A curve whose handles lie on the line between its ends is that line: so a top drawn as such a curve stays a flat face to hollow from (#1183).
    if (segment.kind !== "line" && first && second && !(onLine(from, to, first) && onLine(from, to, second))) {
      // A rounded corner turns into a torus piece, not a free-form surface.
      const middle = circularArcMidpoint(from, first, second, to);
      if (middle) return cad.makeArcEdge(map(from), map(middle), map(to));
      return cad.makeBezierEdge([map(from), map(first), map(second), map(to)]);
    }
    return cad.makeLineEdge(map(from), map(to));
  });
  return cad.makeWire(edges);
}

/**
 * The exact solid of revolution of a sketch about the vertical axis, from
 * `startAngle` degrees through `sweepAngle` (negative sweeps go the other way,
 * as in the mesh revolve). A profile, or a curve of it, that reaches past the
 * axis is cut off at the axis (#1183: a curve handle 1.5 mm past it left the
 * body a mesh that could not be hollowed). Throws when nothing lies left of
 * the axis or there is no closed loop; the caller may then fall back.
 */
export function buildRevolvedSketchSolid(cad: OcctKernel, sketch: SketchProfile, startAngle: number, sweepAngle: number): ShapeHandle {
  const profile = solidSketchProfile(sketch);
  if (!revolveProfileFitsAxis(profile)) throw new Error("The profile crosses the revolve axis");
  const regions = cadSketchRegions(profile);
  if (regions.length === 0) throw new Error("No closed profile found. Draw at least one closed loop and ensure it has no degenerate (zero-area) geometry.");
  const maxZ = Math.max(...profile.points.flatMap((point) => [point.z, point.handleIn?.z ?? point.z, point.handleOut?.z ?? point.z]));
  const sweep = Math.abs(sweepAngle);
  const angle = Math.min(2 * Math.PI, (sweep * Math.PI) / 180);
  const rotation = sweepAngle < 0 ? startAngle + sweepAngle : startAngle;
  const axis = { point: { x: 0, y: 0, z: 0 }, direction: { x: 0, y: 1, z: 0 } };
  const solids: ShapeHandle[] = regions.flatMap((region) => {
    let face = cad.makeFace(sectionWire(cad, region.outer, maxZ));
    if (region.holes.length > 0) face = cad.addHolesInFace(face, region.holes.map((hole) => sectionWire(cad, hole, maxZ)));
    const bounds = cad.getBoundingBox(face, false);
    if (bounds.xmax <= AXIS_TOLERANCE) return [];
    // The part past the axis would turn through the body; keep only the half x >= 0, which may leave several faces.
    const faces = bounds.xmin < -AXIS_TOLERANCE
      ? cad.getSubShapes(cad.common(face, cad.translate(cad.makeRectangle(bounds.xmax + 1, bounds.ymax - bounds.ymin + 2), 0, bounds.ymin - 1, 0)), "face")
      : [face];
    return faces.map((piece) => {
      let solid = cad.revolve(piece, axis, angle);
      if (Math.abs(rotation) > 1e-8) solid = cad.rotate(solid, axis, (rotation * Math.PI) / 180);
      return solid;
    });
  });
  if (solids.length === 0) throw new Error("The profile lies right of the revolve axis");
  const result = solids.length === 1 ? solids[0] : cad.makeCompound(solids);
  if (!cad.isValid(result)) throw new Error("OpenCascade produced invalid sketch topology");
  return result;
}
