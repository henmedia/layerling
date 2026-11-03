import * as THREE from "three";

/*
 * The curved cone (#1211): a cone whose side bends, from the bottom circle up to a smaller top
 * circle. Inward it becomes a trumpet like a pseudosphere, outward a dome with a flat top. Its
 * section is the quadratic Bezier curve from the bottom rim to the top rim; the control point
 * moves from the middle of the straight side (no bend) to the corner of the box the two ends span,
 * so the side never reaches past the bottom circle nor above the top. The display mesh, the
 * boolean mesh and the exact body (cadProfileExtrusion.ts) all take the section from here.
 */

/** The top's diameter as a share of the bottom's: 0 is a point, 1 a cylinder. */
export const DEFAULT_CURVED_CONE_TOP = 0.25;
/** How far the side bends: -1 fully inward (a trumpet), 0 straight, 1 fully outward (a dome). */
export const DEFAULT_CURVED_CONE_BEND = -0.8;
/** Corners round the display mesh when the side count follows the size. */
export const CURVED_CONE_RINGS = 48;

export function normalizeCurvedConeTop(value: number | undefined) {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value as number)) : DEFAULT_CURVED_CONE_TOP;
}

export function normalizeCurvedConeBend(value: number | undefined) {
  return Number.isFinite(value) ? Math.min(1, Math.max(-1, value as number)) : DEFAULT_CURVED_CONE_BEND;
}

/** The section of the side in the plane through the axis: from the bottom rim (base, 0) to the top rim (top, height), and the control point. */
export function curvedConeSection(width: number, height: number, top: number | undefined, bend: number | undefined) {
  const base = Math.max(0.001, width / 2);
  const topRadius = base * normalizeCurvedConeTop(top);
  const amount = normalizeCurvedConeBend(bend);
  const middle = { x: (base + topRadius) / 2, z: height / 2 };
  // Inward the side first runs in along the bottom, outward it first rises along the bottom's rim.
  const corner = amount < 0 ? { x: topRadius, z: 0 } : { x: base, z: height };
  const share = Math.abs(amount);
  const control = { x: middle.x + (corner.x - middle.x) * share, z: middle.z + (corner.z - middle.z) * share };
  return { base, top: topRadius, height, control };
}

type Section = ReturnType<typeof curvedConeSection>;

function sectionPoint(section: Section, s: number) {
  const a = (1 - s) * (1 - s);
  const b = 2 * (1 - s) * s;
  const c = s * s;
  return { r: a * section.base + b * section.control.x + c * section.top, y: b * section.control.z + c * section.height };
}

function sectionTangent(section: Section, s: number) {
  return {
    r: 2 * (1 - s) * (section.control.x - section.base) + 2 * s * (section.top - section.control.x),
    y: 2 * (1 - s) * section.control.z + 2 * s * (section.height - section.control.z),
  };
}

/** The curved cone's display mesh, standing from y = 0 to its height, oval when the depth differs from the width. */
export function createCurvedConeGeometry(width: number, height: number, depth: number, top: number | undefined, bend: number | undefined, sides: number) {
  const section = curvedConeSection(width, Math.max(0.001, height), top, bend);
  const around = Math.max(3, Math.round(sides));
  const stretch = depth / Math.max(0.001, width);
  const positions: number[] = [];
  const normals: number[] = [];
  const at = (r: number, y: number, step: number) => {
    const angle = (step / around) * Math.PI * 2;
    return [Math.cos(angle) * r, y, Math.sin(angle) * r * stretch] as const;
  };
  const normalAt = (s: number, step: number) => {
    // The side's normal in the section, turned round and taken through the stretch along z.
    const tangent = sectionTangent(section, Math.min(1 - 1e-6, Math.max(1e-6, s)));
    const angle = (step / around) * Math.PI * 2;
    const vector = new THREE.Vector3(Math.cos(angle) * tangent.y, -tangent.r, (Math.sin(angle) * tangent.y) / Math.max(0.001, stretch)).normalize();
    return [vector.x, vector.y, vector.z] as const;
  };
  const push = (point: readonly number[], normal: readonly number[]) => {
    positions.push(...point);
    normals.push(...normal);
  };
  for (let ring = 0; ring < CURVED_CONE_RINGS; ring += 1) {
    const s0 = ring / CURVED_CONE_RINGS;
    const s1 = (ring + 1) / CURVED_CONE_RINGS;
    const p0 = sectionPoint(section, s0);
    const p1 = sectionPoint(section, s1);
    for (let step = 0; step < around; step += 1) {
      const a = at(p0.r, p0.y, step);
      const b = at(p0.r, p0.y, step + 1);
      const c = at(p1.r, p1.y, step + 1);
      const d = at(p1.r, p1.y, step);
      if (p0.r > 1e-9) {
        push(a, normalAt(s0, step));
        push(c, normalAt(s1, step + 1));
        push(b, normalAt(s0, step + 1));
      }
      if (p1.r > 1e-9) {
        push(a, normalAt(s0, step));
        push(d, normalAt(s1, step));
        push(c, normalAt(s1, step + 1));
      }
    }
  }
  for (let step = 0; step < around; step += 1) {
    push([0, 0, 0], [0, -1, 0]);
    push(at(section.base, 0, step), [0, -1, 0]);
    push(at(section.base, 0, step + 1), [0, -1, 0]);
    if (section.top > 1e-9) {
      push([0, section.height, 0], [0, 1, 0]);
      push(at(section.top, section.height, step + 1), [0, 1, 0]);
      push(at(section.top, section.height, step), [0, 1, 0]);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  return geometry;
}
