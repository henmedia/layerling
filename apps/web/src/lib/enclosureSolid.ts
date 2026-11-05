import type { OcctKernel, ShapeHandle } from "occt-wasm";
import type { CadModifierEnclosurePart } from "@/lib/cadModifierTypes";
import type { ProfilePoint } from "@/lib/enclosureMesh";
import { screwBossGussetAngles, screwBossGussetTip, screwBossPlan, type ScrewBossFields, type ScrewBossPlan } from "@/lib/screwBoss";
import { snapFitCatchFor, snapFitHookOutline, snapFitPlan, type SnapFitFields } from "@/lib/snapFit";
import { ribGussetOutline, ribProfile, ribSize, type RibFields } from "@/lib/rib";

/*
 * The exact bodies of the enclosure parts (#1246), from the same plans and outlines as their display meshes
 * (screwBossMesh, snapFitMesh, ribMesh), so Fillet, Hollow and the STEP export take them as they take a box. Where
 * the mesh has polygons the body has true circles: the post and its hole, the rib's round top, the fillet at the
 * hook's root.
 *
 * The screw boss is a cylinder with its gussets joined to it, each a prism standing out from inside the post, and
 * the hole cut last: a solid of revolution with the chamfer at its mouth, run on past the top so no face of it lies
 * on the post's. Set as a hole, the boss is that pocket alone (#1288), opening at the boss's top. The
 * snap-fit and the rib are their side outlines pushed straight across, as the mesh pushes them; the snap-fit's hook
 * and catch stay two bodies, as Separate Parts splits them.
 *
 * Built in the shape's own frame (y up, the bottom at y = 0, centred on x and z).
 */

type Vec3 = { x: number; y: number; z: number };

/** z up to y up: (x, y, z) -> (x, z, -y). */
const Z_TO_Y_UP = [1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0];
const Y_AXIS = { point: { x: 0, y: 0, z: 0 }, direction: { x: 0, y: 1, z: 0 } };
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

function ribSolid(cad: OcctKernel, fields: RibFields) {
  const { style, top, width, height, thickness } = ribSize(fields);
  if (style === "gusset") {
    // Seen from the side along z, as the mesh turns it: the outline in x-y, the thickness across z.
    return cad.extrude(outlineFace(cad, ribGussetOutline(width, height), (p) => ({ x: p.u, y: p.v, z: -thickness / 2 })), 0, 0, thickness);
  }
  return cad.extrude(outlineFace(cad, ribProfile(thickness, height, top), (p) => ({ x: -width / 2, y: p.v, z: p.u })), width, 0, 0);
}
