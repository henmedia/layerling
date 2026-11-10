import { type CylinderSurface, cross, dot, norm, type PlaneSurface, scale, sub, unit, type V3 } from "@/lib/meshSurfaceFit";

/*
 * A flat face that runs into a round one at almost no angle (the side of a hull of cylinders, the straight wall of a
 * slot) touches it in the real part. Its mesh does not: a hull of two polygons joins two of their corners, and the
 * line through them misses the circles' common tangent by up to half a polygon step, about half a degree for a
 * cylinder of 96 sides. Rebuilt as it is, the plane cuts the cylinder in a sliver a hair wide, and the kernel refuses
 * every chamfer and fillet on the faces round it (#1442). So such a plane is set onto the tangent: to one cylinder it
 * is moved, to two whose axes run along it it is turned onto their common tangent.
 */

/** Up to this much off touching, a plane next to a cylinder is taken to touch it: a cylinder of 24 sides is within it. */
const TOUCH_ANGLE = (8 * Math.PI) / 180;

type Region = { id: number; surface: { kind: string }; triangles: number[]; facet?: boolean };

/**
 * The planes of `regions` that nearly touch their cylinder neighbours, set onto them in place. `crease` is the angle
 * between a triangle and its k-th neighbour; `points` the planes' corners, none of which may move further than the
 * gap the polygon left.
 */
export function touchPlanesToCylinders(
  regions: Region[],
  regionOfTriangle: ArrayLike<number>,
  neighbors: ArrayLike<number>,
  crease: (t: number, k: number) => number,
  cornersOf: (t: number) => V3[],
  tolerance: number,
) {
  for (const region of regions) {
    if (region.facet || region.surface.kind !== "plane") continue;
    const plane = region.surface as PlaneSurface;
    const touching = new Map<number, CylinderSurface>();
    for (const t of region.triangles) {
      for (let k = 0; k < 3; k += 1) {
        const other = regions[regionOfTriangle[neighbors[t * 3 + k]]];
        if (!other || other.id === region.id || other.facet || other.surface.kind !== "cylinder") continue;
        if (crease(t, k) > TOUCH_ANGLE) continue;
        const cylinder = other.surface as CylinderSurface;
        if (nearlyTouching(plane, cylinder, tolerance)) touching.set(other.id, cylinder);
      }
    }
    if (touching.size === 0 || touching.size > 2) continue;
    const [first, second] = [...touching.values()];
    const set = second ? tangentToBoth(plane, first, second) : tangentTo(plane, first);
    if (!set) continue;
    // The plane's own corners stay where they were, give or take the gap the polygon left.
    const slack = Math.max(...[...touching.values()].map((c) => c.radius * (1 - Math.cos(TOUCH_ANGLE)))) + tolerance;
    const corners = region.triangles.flatMap(cornersOf);
    if (corners.some((p) => Math.abs(dot(set.normal, p) - set.offset) > slack)) continue;
    region.surface = set;
  }
}

/** The axis runs along the plane, and the plane is as far from it as the radius, give or take the touch angle. */
function nearlyTouching(plane: PlaneSurface, cylinder: CylinderSurface, tolerance: number) {
  if (Math.abs(dot(plane.normal, cylinder.axis)) > 1e-3) return false;
  const distance = Math.abs(dot(plane.normal, cylinder.origin) - plane.offset);
  return distance <= cylinder.radius + tolerance && distance >= cylinder.radius * Math.cos(TOUCH_ANGLE) - tolerance;
}

/** Which side of the plane the axis is on: behind it for a round end of a solid, in front for a slot's. */
function side(plane: PlaneSurface, cylinder: CylinderSurface) {
  return Math.sign(dot(plane.normal, cylinder.origin) - plane.offset) || -1;
}

function tangentTo(plane: PlaneSurface, cylinder: CylinderSurface): PlaneSurface {
  return { kind: "plane", normal: plane.normal, offset: dot(plane.normal, cylinder.origin) - side(plane, cylinder) * cylinder.radius };
}

/** The plane turned about the cylinders' common direction until it touches both, the solution nearer the old one. */
function tangentToBoth(plane: PlaneSurface, a: CylinderSurface, b: CylinderSurface): PlaneSurface | null {
  if (Math.abs(Math.abs(dot(a.axis, b.axis)) - 1) > 1e-6) return null;
  const axis = a.axis;
  const between = sub(a.origin, b.origin);
  const across = sub(between, scale(axis, dot(between, axis)));
  const length = norm(across);
  if (length < 1e-9) return null;
  const sa = side(plane, a), sb = side(plane, b);
  // n . (oa - ob) = sa ra - sb rb, with n square to the axis.
  const c = (sa * a.radius - sb * b.radius) / length;
  if (Math.abs(c) > 1) return null;
  const d = unit(across);
  const e = unit(cross(axis, d));
  const s = Math.sqrt(1 - c * c);
  const options = [unit([d[0] * c + e[0] * s, d[1] * c + e[1] * s, d[2] * c + e[2] * s]), unit([d[0] * c - e[0] * s, d[1] * c - e[1] * s, d[2] * c - e[2] * s])];
  const normal = dot(options[0], plane.normal) >= dot(options[1], plane.normal) ? options[0] : options[1];
  if (dot(normal, plane.normal) < Math.cos(TOUCH_ANGLE)) return null;
  return { kind: "plane", normal, offset: dot(normal, a.origin) - sa * a.radius };
}
