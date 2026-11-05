import type { OcctKernel, ShapeHandle } from "occt-wasm";
import type { CadModifierHirthPart } from "@/lib/cadModifierTypes";
import { hirthCrestAngle, hirthRootAngle } from "@/lib/hirthGeometry";

/*
 * The exact body of a Hirth joint (#1016), as its display mesh draws it
 * (`createHirthGeometry`). Every flank is a plane through the point on the
 * axis where the crests and roots meet, so the toothed top is a pyramid-like
 * crown of flat triangles from that point out past the rim; its sides go
 * straight down past the bottom. That crown, kept within the rim's cylinder
 * from y = 0 up, is the joint; the round bore is cut through it last.
 *
 * Saw teeth (Discussion #1320) put a root right under its crest where a flank
 * stands at 90 degrees: that triangle of the crown stands upright, and the
 * crown's sides beside it run down through the root to the foot.
 *
 * Built in the shape's own frame (y up, the bottom at y = 0, centred on x and z).
 */

/** z up to y up: (x, y, z) -> (x, z, -y). */
const Z_TO_Y_UP = [1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0];
/** How far past the rim the crown reaches, as a share of the rim. */
const CROWN_REACH = 1.25;

type Point = { x: number; y: number; z: number };

/** The Hirth joint part's exact solid in the shape's own frame, y up. Throws when the kernel cannot build it. */
export function hirthPartSolid(cad: OcctKernel, part: CadModifierHirthPart): ShapeHandle {
  const { rx, rz, height, teeth, toothHeight, boreRadius } = part;
  const split = part.split ?? 0.5;
  if (!(rx > 0 && rz > 0 && height >= toothHeight && toothHeight > 0 && teeth >= 3 && boreRadius >= 0 && boreRadius < Math.min(rx, rz) && split >= 0 && split <= 1)) {
    throw new Error("The Hirth joint's measures are out of range");
  }
  const half = toothHeight / 2;
  const apexY = height - half;
  const bottom = Math.min(0, apexY - CROWN_REACH * half) - 1;
  const apex: Point = { x: 0, y: apexY, z: 0 };
  const rimPoint = (angle: number, rise: number): Point => ({
    x: CROWN_REACH * rx * Math.cos(angle),
    y: apexY + CROWN_REACH * half * rise,
    z: CROWN_REACH * rz * Math.sin(angle),
  });
  // Crest, root, crest ... round the crown, each with its foot below the bottom.
  const corners: Array<{ point: Point; angle: number }> = [];
  for (let index = 0; index < teeth; index += 1) {
    const crest = hirthCrestAngle(teeth, index, split);
    const root = hirthRootAngle(teeth, index, split);
    corners.push({ point: rimPoint(crest, 1), angle: crest }, { point: rimPoint(root, -1), angle: root });
  }
  const at = (index: number) => corners[(index + corners.length) % corners.length];
  const sameAngle = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) < 1e-9;
  // A step: two corners at the same angle. The lower of them lies on the upper one's way down to its foot.
  const lowerBeside = (index: number): Point[] => {
    const corner = at(index);
    return [at(index - 1), at(index + 1)].filter((other) => sameAngle(other.angle, corner.angle) && other.point.y < corner.point.y).map((other) => other.point);
  };
  const foot = (point: Point): Point => ({ ...point, y: bottom });
  const polygon = (points: Point[]) => cad.makeFace(cad.makeWire(points.map((point, index) => cad.makeLineEdge(point, points[(index + 1) % points.length]))));
  const faces: ShapeHandle[] = [];
  const feet: Point[] = [];
  corners.forEach((corner, index) => {
    const next = at(index + 1);
    faces.push(polygon([apex, corner.point, next.point]));
    if (sameAngle(corner.angle, next.angle)) return;
    feet.push(foot(corner.point));
    faces.push(polygon([corner.point, ...lowerBeside(index), foot(corner.point), foot(next.point), ...lowerBeside(index + 1), next.point]));
  });
  faces.push(polygon(feet));
  const size = Math.max(rx, rz, height);
  const shells = cad.getSubShapes(cad.sew(faces, size * 1e-6), "shell");
  if (shells.length !== 1) throw new Error(`The Hirth joint's crown sewed into ${shells.length} shells`);
  let crown = cad.makeSolid(shells[0]);
  if (!(cad.getVolume(crown) > 0)) crown = cad.makeSolid(cad.reverseShape(shells[0]));
  if (!cad.isValid(crown) || !(cad.getVolume(crown) > 0)) throw new Error("The Hirth joint's crown did not close into a valid solid");

  // The rim's cylinder from y = 0 to above the crests; on an oval footprint a true ellipse pushed
  // up (a stretched cylinder comes out a B-spline about 1 % too big).
  const round = Math.abs(rx - rz) <= 1e-9 * size;
  const ellipse = () => {
    const edge = cad.makeEllipseArc({ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, Math.max(rx, rz), Math.min(rx, rz), 0, 2 * Math.PI, rx >= rz ? { x: 1, y: 0, z: 0 } : { x: 0, y: 0, z: 1 });
    return cad.extrude(cad.makeFace(cad.makeWire([edge])), 0, height + 1, 0);
  };
  const rim = round ? cad.transform(cad.makeCylinder(rx, height + 1), Z_TO_Y_UP) : ellipse();
  const kept = cad.common(crown, rim);
  const pieces = cad.isSolid(kept) ? [kept] : cad.getSubShapes(kept, "solid");
  if (pieces.length !== 1) throw new Error(`The Hirth joint came out as ${pieces.length} solids`);
  let solid = pieces[0];
  if (boreRadius > 0) {
    const bore = cad.transform(cad.translate(cad.makeCylinder(boreRadius, height + 2), 0, 0, -1), Z_TO_Y_UP);
    const cut = cad.cut(solid, bore);
    const solids = cad.isSolid(cut) ? [cut] : cad.getSubShapes(cut, "solid");
    if (solids.length !== 1) throw new Error(`The Hirth joint with its bore came out as ${solids.length} solids`);
    solid = solids[0];
  }
  if (!cad.isValid(solid) || !(cad.getVolume(solid) > 0)) throw new Error("The Hirth joint is not a valid solid");
  return solid;
}
