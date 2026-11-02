import type { ManifoldToplevel } from "manifold-3d";
import { cadShapeFromSketchProfile } from "@/lib/editorSketchCad";
import type { MeshData, Vec3 } from "@/lib/editorMeshCore";
import { placementWorkplaneFromSurface } from "@/lib/placementWorkplane";
import { MAX_SECTION_SKETCH_SEGMENTS, sectionSketchProfile } from "@/lib/sectionSketch";
import { projectSectionPoint, type SectionLoop } from "@/lib/sectionSvg";
import type { SectionPlaneAxis } from "@/lib/sectionView";
import { placeSketchShape } from "@/lib/sketchPlacement";
import { canonicalizeShape, withHoleMode } from "@/lib/workplaneShapes";
import type { SketchProfile, WorkplaneShape } from "@/types/layerling";

/*
 * Punch (Algotz, #703): the outline of one body, seen along an axis, cut straight through another, as a cookie
 * cutter goes through dough. The punch may stand anywhere in front of the target; only its outline and where it
 * sits across the axis count. The opening is a sketch body set to hole and grouped with the target, so it stays an
 * exact body, can be edited as a sketch and taken out again by ungrouping. The punch itself stays, to be moved,
 * turned and used again.
 */

/** The axes a punch goes along, in the scene's terms (y is up). */
export const PUNCH_AXES: readonly SectionPlaneAxis[] = ["x", "z", "y"];

/** How far the opening reaches past the target on both sides, so no skin is left on either face. */
const PUNCH_MARGIN = 1;

/** The largest clearance the tool takes, in mm. */
export const MAX_PUNCH_CLEARANCE = 10;

/** How much the outline may be straightened, in mm: first hardly at all, more only when it has too many pieces for a sketch. */
const SIMPLIFY_STEPS = [0.002, 0.01, 0.03, 0.08];

const coordinate = (point: Vec3, axis: SectionPlaneAxis) => (axis === "x" ? point[0] : axis === "y" ? point[1] : point[2]);

/** Where a mesh begins and ends along an axis. */
export function meshSpanAlong(mesh: MeshData, axis: SectionPlaneAxis) {
  let min = Infinity;
  let max = -Infinity;
  for (const vertex of mesh.vertices) {
    const value = coordinate(vertex, axis);
    if (value < min) min = value;
    if (value > max) max = value;
  }
  return { min, max };
}

function meshCenter(mesh: MeshData): Vec3 {
  const center = (axis: SectionPlaneAxis) => {
    const { min, max } = meshSpanAlong(mesh, axis);
    return (min + max) / 2;
  };
  return [center("x"), center("y"), center("z")];
}

/**
 * The axis a punch most likely goes along: the one along which it stands furthest from the target, as one holds a
 * stamp in front of a plate. Straight down when the two share their middle.
 */
export function punchAxisBetween(punch: MeshData, target: MeshData): SectionPlaneAxis {
  const a = meshCenter(punch);
  const b = meshCenter(target);
  const apart = PUNCH_AXES.map((axis) => ({ axis, distance: Math.abs(coordinate(a, axis) - coordinate(b, axis)) }));
  const furthest = apart.reduce((best, entry) => (entry.distance > best.distance ? entry : best));
  return furthest.distance > 1e-6 ? furthest.axis : "y";
}

type CrossSection = InstanceType<ManifoldToplevel["CrossSection"]>;

/**
 * The outline of a mesh seen along an axis, in the section view's u and v for that axis: every triangle laid flat
 * and all of them joined. That needs no closed surface, so an imported model with gaps punches as well.
 */
export function meshSilhouette(runtime: ManifoldToplevel, mesh: MeshData, axis: SectionPlaneAxis): CrossSection {
  const triangles: [number, number][][] = [];
  for (const face of mesh.faces) {
    const flat = face.map((index) => {
      const point = projectSectionPoint(mesh.vertices[index], axis);
      return [point.u, point.v] as [number, number];
    });
    const [a, b, c] = flat;
    const twice = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    // Seen edge on, a triangle covers nothing; the others all run counter-clockwise, so Positive joins them.
    if (Math.abs(twice) < 1e-10) continue;
    triangles.push(twice > 0 ? flat : [a, c, b]);
  }
  return new runtime.CrossSection(triangles, "Positive");
}

/** The outline's rings as the section view's loops. */
function sectionLoops(section: CrossSection): SectionLoop[] {
  return section.toPolygons().map((ring) => ({ closed: true, points: ring.map(([u, v]) => ({ u, v })) }));
}

export type PunchPlan =
  | { ok: true; profile: SketchProfile; workplane: ReturnType<typeof placementWorkplaneFromSurface>; height: number; outlines: number }
  | { ok: false; problem: "miss" | "empty" | "tooMany" };

/**
 * The sketch of the opening: the punch's outline along `axis`, grown by `clearance`, on a plane just before the
 * target, facing along the axis, and how far it reaches to come out just behind the target.
 */
export function punchPlan(runtime: ManifoldToplevel, punch: MeshData, target: MeshData, axis: SectionPlaneAxis, clearance: number): PunchPlan {
  const made: CrossSection[] = [];
  const keep = (section: CrossSection) => {
    made.push(section);
    return section;
  };
  try {
    let outline = keep(meshSilhouette(runtime, punch, axis));
    if (outline.isEmpty()) return { ok: false, problem: "empty" };
    const grow = Math.max(0, Math.min(MAX_PUNCH_CLEARANCE, clearance));
    if (grow > 1e-4) outline = keep(outline.offset(grow, "Round", 2, 64));
    const hit = keep(outline.intersect(keep(meshSilhouette(runtime, target, axis))));
    if (hit.area() < 1e-4) return { ok: false, problem: "miss" };
    const span = meshSpanAlong(target, axis);
    const start = span.min - PUNCH_MARGIN;
    const height = span.max - span.min + PUNCH_MARGIN * 2;
    const normal = { x: axis === "x" ? 1 : 0, y: axis === "y" ? 1 : 0, z: axis === "z" ? 1 : 0 };
    const origin = { x: axis === "x" ? start : 0, y: axis === "y" ? start : 0, z: axis === "z" ? start : 0 };
    const workplane = placementWorkplaneFromSurface(origin, normal, axis === "x" ? { x: 0, y: 0, z: -1 } : { x: 1, y: 0, z: 0 }, false, true);
    for (const epsilon of SIMPLIFY_STEPS) {
      const simple = keep(outline.simplify(epsilon));
      const sketch = sectionSketchProfile(sectionLoops(simple), axis, start, null, workplane);
      if (sketch.tooMany) continue;
      if (!sketch.profile) return { ok: false, problem: "empty" };
      return { ok: true, profile: sketch.profile, workplane, height, outlines: sketch.outlines };
    }
    return { ok: false, problem: "tooMany" };
  } finally {
    made.forEach((section) => section.delete());
  }
}

export { MAX_SECTION_SKETCH_SEGMENTS as MAX_PUNCH_SEGMENTS };

/** The opening as a body: the plan's sketch extruded by the CAD worker, set where the plan says and made a hole. */
export async function punchHoleShape(plan: Extract<PunchPlan, { ok: true }>, look: { name: string; color: string }): Promise<WorkplaneShape> {
  const built = await cadShapeFromSketchProfile(plan.profile, plan.height);
  const placed = placeSketchShape({ ...built, name: look.name, color: look.color }, plan.workplane);
  return canonicalizeShape(withHoleMode(placed, true));
}
