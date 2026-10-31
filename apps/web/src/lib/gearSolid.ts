import type { OcctKernel, ShapeHandle } from "occt-wasm";
import type { CadModifierHelicalGearPart } from "@/lib/cadModifierTypes";

/*
 * The exact body of a helical gear, as its display mesh draws it
 * (`createGearGeometry`): the tooth ring turned evenly from foot to top.
 *
 * Every corner of the ring climbs on a helix of its own radius, all with the
 * same pitch. A side of the ring stays a straight line at every height - the
 * same turn moves both its ends - so each side face is the ruled surface
 * between the helices of its two corners, which a ruled loft between the two
 * helix edges builds. Those faces and the two flat ends are sewn into one
 * solid, without a boolean; the mesh's stretch to width x depth follows, and
 * last the straight round bore is cut through it.
 *
 * A herringbone gear (#1007) is the lower half, a helical gear half as high
 * that turns half as far, and its mirror image above the middle: the faces of
 * both halves are sewn as one, again without a boolean. Joined with a
 * boolean, the halves take many times as long.
 *
 * Built with the axis on z (the kernel's helix frame) and stood up on y.
 */

/** z up to y up: (x, y, z) -> (x, z, -y). A point at angle phi from +x towards +y lands at angle -phi from +x towards +z. */
const Z_TO_Y_UP = [1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0];
const AXIS = { point: { x: 0, y: 0, z: 0 }, direction: { x: 0, y: 0, z: 1 } };

/** The helical gear part's exact solid in the shape's own frame, y up. Throws when the kernel cannot build it. */
export function helicalGearPartSolid(cad: OcctKernel, part: CadModifierHelicalGearPart): ShapeHandle {
  const { corners, twist, height, stretch, boreRadius, herringbone } = part;
  if (!(corners.length >= 3 && height > 0 && stretch.x > 0 && stretch.z > 0 && boreRadius >= 0 && Number.isFinite(twist))) throw new Error("The gear's measures are out of range");
  // As drawn, a corner at angle a from +x towards +z turns on towards +z as
  // it rises; the turn up to y maps that to angle -a, turning clockwise
  // about +z seen from above - a left-hand helix for a positive twist.
  const turns = Math.abs(twist) > 1e-9;
  // A herringbone gear that does not turn is a straight one, one face a side.
  const halved = herringbone === true && turns;
  const rise = halved ? height / 2 : height;
  const climb = halved ? twist / 2 : twist;
  const at = (radius: number, angle: number, z: number) => ({ x: radius * Math.cos(-angle), y: radius * Math.sin(-angle), z });
  const rails = corners.map(({ angle, radius }) => {
    if (!turns) return cad.makeWire([cad.makeLineEdge(at(radius, angle, 0), at(radius, angle, height))]);
    const helix = cad.makeHelixWireHanded({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }, (2 * Math.PI * rise) / Math.abs(climb), rise, radius, climb > 0);
    // The helix starts on +x; turned to the corner's own angle.
    return cad.rotate(helix, AXIS, -angle);
  });
  const faces: ShapeHandle[] = [];
  rails.forEach((rail, index) => {
    const ruled = cad.loft([rail, rails[(index + 1) % rails.length]], false, true);
    faces.push(...cad.getSubShapes(ruled, "face"));
  });
  const end = (z: number, turn: number) => {
    const points = corners.map(({ angle, radius }) => at(radius, angle + turn, z));
    return cad.makeFace(cad.makeWire(points.map((point, index) => cad.makeLineEdge(point, points[(index + 1) % points.length]))));
  };
  faces.push(end(0, 0));
  if (halved) faces.push(...faces.map((face) => cad.mirror(face, { x: 0, y: 0, z: height / 2 }, { x: 0, y: 0, z: 1 })));
  else faces.push(end(height, twist));
  const size = Math.max(...corners.map((corner) => corner.radius));
  const shells = cad.getSubShapes(cad.sew(faces, size * 1e-6), "shell");
  if (shells.length !== 1) throw new Error(`The gear's sides sewed into ${shells.length} shells`);
  let solid = cad.makeSolid(shells[0]);
  if (!(cad.getVolume(solid) > 0)) solid = cad.makeSolid(cad.reverseShape(shells[0]));
  if (!cad.isValid(solid) || !(cad.getVolume(solid) > 0)) throw new Error("The gear's sides did not close into a valid solid");
  solid = cad.transform(solid, Z_TO_Y_UP);
  if (Math.abs(stretch.x - 1) > 1e-12 || Math.abs(stretch.z - 1) > 1e-12) {
    solid = cad.generalTransform(solid, [stretch.x, 0, 0, 0, 0, 1, 0, 0, 0, 0, stretch.z, 0]);
  }
  if (boreRadius > 0) {
    // A cylinder past both ends, stood up on y like the rest.
    const bore = cad.transform(cad.translate(cad.makeCylinder(boreRadius, height + 2), 0, 0, -1), Z_TO_Y_UP);
    const cut = cad.cut(solid, bore);
    const solids = cad.isSolid(cut) ? [cut] : cad.getSubShapes(cut, "solid");
    if (solids.length !== 1) throw new Error(`The gear with its bore came out as ${solids.length} solids`);
    solid = solids[0];
  }
  if (!cad.isValid(solid) || !(cad.getVolume(solid) > 0)) throw new Error("The gear body is not a valid solid");
  return solid;
}
