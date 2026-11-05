import type { OcctKernel, ShapeHandle } from "occt-wasm";
import type { CadModifierEnclosurePart } from "@/lib/cadModifierTypes";
import type { ProfilePoint } from "@/lib/enclosureMesh";
import { screwBossGussetAngles, screwBossGussetTip, screwBossPlan, type ScrewBossFields, type ScrewBossPlan } from "@/lib/screwBoss";
import { snapFitCatchFor, snapFitHookOutline, snapFitPlan, type SnapFitFields } from "@/lib/snapFit";
import { ribGussetOutline, ribProfile, ribProfileOnFoot, ribSize, type RibFields, type RibFoot } from "@/lib/rib";

/*
 * The exact bodies of the enclosure parts (#1246), from the same plans and outlines as their display meshes
 * (screwBossMesh, snapFitMesh, ribMesh), so Fillet, Hollow and the STEP export take them as they take a box. Where
 * the mesh has polygons the body has true circles: the post and its hole, the rib's round top, the fillet at the
 * hook's root.
 *
 * The screw boss is a cylinder with its gussets joined to it, each a prism standing out from inside the post, and
 * the hole cut last: a solid of revolution with the chamfer at its mouth, run on past the top so no face of it lies
 * on the post's. Set as a hole, the boss is that pocket alone (#1288), opening at the boss's top. The
 * snap-fit and the rib are their side outlines pushed straight across, as the mesh pushes them, a straight rib's foot
 * (Discussion #1307) in its outline; a gusset on its foot is joined to the foot's plate, and so is a rib on an oval
 * foot, whose plate is a true ellipse pushed up (half of one under a gusset). The snap-fit's hook and catch stay two
 * bodies, as Separate Parts splits them.
 *
 * Built in the shape's own frame (y up, the bottom at y = 0, centred on x and z).
 */

type Vec3 = { x: number; y: number; z: number };

/** z up to y up: (x, y, z) -> (x, z, -y). */
const Z_TO_Y_UP = [1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0];
const Y_AXIS = { point: { x: 0, y: 0, z: 0 }, direction: { x: 0, y: 1, z: 0 } };
const UP = { x: 0, y: 1, z: 0 };
/** How far the hole's cutter runs on past the top and, for a hole that goes through, below the floor. */
const CUTTER_REACH = 1;

/** What the messages call each part. */
export const ENCLOSURE_PART_NAMES: Record<CadModifierEnclosurePart["kind"], string> = { screwBoss: "screw boss", snapFit: "snap-fit", rib: "rib" };

/** The enclosure part's exact solid (two for a snap-fit's hook and catch) in the shape's own frame, y up. Throws when the kernel cannot build it. */
export function enclosurePartSolid(cad: OcctKernel, part: CadModifierEnclosurePart): ShapeHandle {
  const solid = part.kind === "screwBoss" ? screwBossSolid(cad, part.fields) : part.kind === "snapFit" ? snapFitSolid(cad, part.fields) : ribSolid(cad, part.fields);
  if (!cad.isValid(solid) || !(cad.getVolume(solid) > 0)) throw new Error(`The ${ENCLOSURE_PART_NAMES[part.kind]} is not a valid solid`);
  return solid;
}

/**
 * A closed outline as a face, each point placed by `at`. A run of points the outline reaches along one arc becomes
 * that arc, drawn through the run's middle point (all of them lie on the circle), so the body is round where the
 * mesh has the arc's chords.
 */
function outlineFace(cad: OcctKernel, outline: ProfilePoint[], at: (point: ProfilePoint) => Vec3) {
  const n = outline.length;
  const edges: ShapeHandle[] = [];
  for (let i = 0; i < n; ) {
    const from = outline[i];
    const next = (i + 1) % n;
    const arc = outline[next].arc;
    if (arc) {
      const run = [next];
      while (run.length < n - 1 && outline[(run[run.length - 1] + 1) % n].arc === arc) run.push((run[run.length - 1] + 1) % n);
      if (run.length >= 2) {
        edges.push(cad.makeArcEdge(at(from), at(outline[run[Math.floor((run.length - 1) / 2)]]), at(outline[run[run.length - 1]])));
        i += run.length;
        continue;
      }
    }
    if (Math.hypot(outline[next].u - from.u, outline[next].v - from.v) > 1e-9) edges.push(cad.makeLineEdge(at(from), at(outline[next])));
    i += 1;
  }
  return cad.makeFace(cad.makeWire(edges));
}

/** One solid out of what a boolean left, or an error naming how many there were. */
function oneSolid(cad: OcctKernel, shape: ShapeHandle, what: string) {
  const solids = cad.isSolid(shape) ? [shape] : cad.getSubShapes(shape, "solid");
  if (solids.length !== 1) throw new Error(`The ${what} came out as ${solids.length} solids`);
  return solids[0];
}

/** The hole as a solid of revolution about y: from its floor up through the chamfer, run on by `reach` past the top (and the floor, going through). */
function screwBossCavity(cad: OcctKernel, plan: ScrewBossPlan, reach: number) {
  const { holeRadius: rh, holeDepth, through, chamfer, height: H } = plan;
  const floor = through ? -reach : H - holeDepth;
  const section: Array<[number, number]> = [[0, floor], [rh, floor]];
  // The chamfer is 45 degrees: run on past the top, it keeps that slope.
  if (chamfer > 1e-9) section.push([rh, H - chamfer], [rh + chamfer + reach, H + reach]);
  else section.push([rh, H + reach]);
  section.push([0, H + reach]);
  const points = section.map(([r, y]) => ({ x: r, y, z: 0 }));
  const wire = cad.makeWire(points.map((point, index) => cad.makeLineEdge(point, points[(index + 1) % points.length])));
  return cad.revolve(cad.makeFace(wire), Y_AXIS, 2 * Math.PI);
}

/**
 * A gusset as a prism across its thickness: seen from the side, from inside the post out to the footprint along the
 * floor, up the short end, and down the sloping top to the post, where it meets the post's wall at the gusset's
 * height on both its faces, as in the mesh. The top's slope runs on a little into the post, so no corner of the
 * prism lies on the post's wall.
 */
function screwBossGusset(cad: OcctKernel, plan: ScrewBossPlan, angle: number) {
  const { radius: R, gussetHalf: a, gussetHeight: hg, gussetReach: reach, height: H } = plan;
  const tip = screwBossGussetTip(plan);
  const base = Math.sqrt(R * R - a * a);
  const slope = (hg - tip) / (reach - base);
  // In past the wall, the slope rises: no higher than halfway from the gusset's top to the post's.
  const inward = Math.min(base / 2, (H - hg) / 2 / slope);
  const inner = base - inward;
  const top = hg + slope * inward;
  const e = { x: Math.cos(angle), z: Math.sin(angle) };
  const n = { x: -Math.sin(angle), z: Math.cos(angle) };
  const outline: ProfilePoint[] = [{ u: inner / 2, v: 0 }, { u: reach, v: 0 }, { u: reach, v: tip }, { u: inner, v: top }, { u: inner / 2, v: top }];
  const face = outlineFace(cad, outline, (p) => ({ x: p.u * e.x - a * n.x, y: p.v, z: p.u * e.z - a * n.z }));
  return cad.extrude(face, 2 * a * n.x, 0, 2 * a * n.z);
}

function screwBossSolid(cad: OcctKernel, fields: ScrewBossFields) {
  const plan = screwBossPlan(fields);
  if (fields.hole) {
    // Grouped as a hole, the boss is its pocket, as its mesh is (screwBossCavityMesh): from its floor up to the
    // boss's top, where the post's hole opens.
    return oneSolid(cad, screwBossCavity(cad, plan, 0), "screw boss's pocket");
  }
  const post = cad.transform(cad.makeCylinder(plan.radius, plan.height), Z_TO_Y_UP);
  const gussets = screwBossGussetAngles(plan).map((angle) => screwBossGusset(cad, plan, angle));
  // Joined, the post's floor and the gussets' are one face again.
  const braced = gussets.length ? oneSolid(cad, cad.unifySameDomain(cad.fuseAll([post, ...gussets])), "screw boss with its gussets") : post;
  return oneSolid(cad, cad.unifySameDomain(cad.cut(braced, screwBossCavity(cad, plan, CUTTER_REACH))), "screw boss with its hole");
}

function snapFitSolid(cad: OcctKernel, fields: SnapFitFields) {
  const plan = snapFitPlan(fields);
  // Pushed across x as the mesh is, and turned over as it is: the foot at the top, y = height - v.
  const prism = (outline: ProfilePoint[]) => cad.extrude(outlineFace(cad, outline, (p) => ({ x: -plan.width / 2, y: plan.height - p.v, z: p.u })), plan.width, 0, 0);
  const bodies: ShapeHandle[] = [];
  if (plan.part !== "catch") bodies.push(prism(snapFitHookOutline(plan)));
  const catchOutline = snapFitCatchFor(plan);
  if (catchOutline) bodies.push(prism(catchOutline));
  if (bodies.length === 0) throw new Error("The snap-fit has neither hook nor catch");
  // Hook and catch stand apart by the clearance: two bodies, as Separate Parts splits them.
  return bodies.length === 1 ? bodies[0] : cad.makeCompound(bodies);
}

/**
 * An oval foot's plate: the ellipse round (cx, 0, 0) with the semi-axes a along x and b along z, as a true ellipse,
 * pushed up by the foot's thickness. `half` keeps the half beyond x = cx, closed along that line: a gusset's against
 * its wall. The kernel's ellipse wants its major axis first, so a foot wider than long lays it across.
 */
function ovalPlate(cad: OcctKernel, cx: number, a: number, b: number, thickness: number, half: boolean) {
  const center = { x: cx, y: 0, z: 0 };
  const along = a >= b;
  const major = Math.max(a, b), minor = Math.min(a, b);
  // With the normal up the second axis is up x the first: -z after x, x after z. The half beyond cx is cos t >= 0 along
  // x, sin t >= 0 along z.
  const [start, end] = half ? (along ? [-Math.PI / 2, Math.PI / 2] : [0, Math.PI]) : [0, 2 * Math.PI];
  const arc = Math.abs(a - b) <= 1e-9 * major && !half
    ? cad.makeCircleEdge(center, UP, a)
    : cad.makeEllipseArc(center, UP, major, minor, start, end, along ? { x: 1, y: 0, z: 0 } : { x: 0, y: 0, z: 1 });
  const edges = [arc];
  if (half) {
    const ends = cad.getSubShapes(arc, "vertex").map((vertex) => cad.vertexPosition(vertex));
    const { first, last } = cad.curveParameters(arc) as { first: number; last: number };
    const middle = cad.curvePointAtParam(arc, (first + last) / 2);
    // The half beyond the wall, from one end of the wall's line to the other: anything else would be a wrong body.
    if (ends.length !== 2 || !ends.every((point) => Math.abs(point.x - cx) <= 1e-6 * major && Math.abs(Math.abs(point.z) - b) <= 1e-6 * major) || !(Math.abs(middle.x - (cx + a)) <= 1e-6 * major)) {
      throw new Error("The kernel laid out the oval foot's half ellipse differently than expected");
    }
    edges.push(cad.makeLineEdge(ends[1], ends[0]));
  }
  return cad.extrude(cad.makeFace(cad.makeWire(edges)), 0, thickness, 0);
}

/** The rib standing on its oval foot (`rib`, from the floor up through the plate) joined to the plate, one solid. */
function onOvalFoot(cad: OcctKernel, rib: ShapeHandle, foot: RibFoot, half: boolean, what: string) {
  const plate = half ? ovalPlate(cad, -foot.length / 2, foot.length, foot.width / 2, foot.thickness, true) : ovalPlate(cad, 0, foot.length / 2, foot.width / 2, foot.thickness, false);
  return oneSolid(cad, cad.unifySameDomain(cad.fuse(rib, plate)), what);
}

function ribSolid(cad: OcctKernel, fields: RibFields) {
  const { style, top, width, height, thickness, foot } = ribSize(fields);
  if (style === "gusset") {
    // Seen from the side along z, as the mesh turns it: the outline in x-y, the thickness across z. On an oval foot
    // the box is the foot's, the gusset's wall at its back.
    const shift = foot?.shape === "oval" ? (width - foot.length) / 2 : 0;
    const gusset = cad.extrude(outlineFace(cad, ribGussetOutline(width, height), (p) => ({ x: p.u + shift, y: p.v, z: -thickness / 2 })), 0, 0, thickness);
    if (!foot) return gusset;
    if (foot.shape === "oval") return onOvalFoot(cad, gusset, foot, true, "gusset on its oval foot");
    // Its foot a plate under its whole leg along the floor, joined to it; the faces they share are one again.
    const plate = cad.makeBoxFromCorners({ x: -width / 2, y: 0, z: -foot.width / 2 }, { x: width / 2, y: foot.thickness, z: foot.width / 2 });
    return oneSolid(cad, cad.unifySameDomain(cad.fuse(gusset, plate)), "gusset on its foot");
  }
  // A straight rib on its square foot is still one cross-section pushed along: the foot is part of the outline. On an
  // oval one the rib runs down into the plate, so the two overlap where they are joined rather than only touch.
  const along = (outline: ProfilePoint[]) => cad.extrude(outlineFace(cad, outline, (p) => ({ x: -width / 2, y: p.v, z: p.u })), width, 0, 0);
  if (foot?.shape === "oval") return onOvalFoot(cad, along(ribProfileOnFoot(thickness, height, top, foot.thickness, 0)), foot, false, "rib on its oval foot");
  return along(ribProfile(thickness, height, top, foot));
}
