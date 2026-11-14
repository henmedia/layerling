import * as THREE from "three";
import type { WorkplaneShape } from "@/types/layerling";

export type PlacementPoint = { x: number; y: number; z: number };

export type PlacementWorkplane = {
  origin: PlacementPoint;
  normal: PlacementPoint;
  xAxis: PlacementPoint;
  zAxis: PlacementPoint;
};

/**
 * The plane a revolve sketch is drawn on, seen from the front (#525): x across, the height up, through the origin, where the axis stands.
 * The other bodies are shown projected onto it - their side view, in the same view as the profile - instead of their outline from above.
 */
export const REVOLVE_REFERENCE_WORKPLANE: PlacementWorkplane = {
  origin: { x: 0, y: 0, z: 0 },
  normal: { x: 0, y: 0, z: -1 },
  xAxis: { x: 1, y: 0, z: 0 },
  zAxis: { x: 0, y: -1, z: 0 },
};
/**
 * Whether a revolved body stands with its axis upright (#525). Such a body was drawn on a horizontal plane, and when its
 * sketch is opened again to edit it, the other bodies are shown from the front like while drawing it. The workplane the
 * edit starts from is the body's own foot, at the height it stands at, which is no longer the base plate - so the plate
 * alone cannot tell the two cases apart.
 */
export function revolveBodyStandsUpright(shape: Pick<WorkplaneShape, "rotation" | "rotationX" | "rotationZ">): boolean {
  const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(
    THREE.MathUtils.degToRad(shape.rotationX ?? 0),
    THREE.MathUtils.degToRad(shape.rotation),
    THREE.MathUtils.degToRad(shape.rotationZ ?? 0),
    "XYZ",
  ));
  return new THREE.Vector3(0, 1, 0).applyQuaternion(quaternion).y > 1 - 1e-6;
}
const EPSILON = 1e-8;

function vector(point: PlacementPoint) {
  return new THREE.Vector3(point.x, point.y, point.z);
}

function point(value: THREE.Vector3): PlacementPoint {
  return {
    x: value.x === 0 ? 0 : value.x,
    y: value.y === 0 ? 0 : value.y,
    z: value.z === 0 ? 0 : value.z,
  };
}

function clean(value: number) {
  const rounded = Number(value.toFixed(6));
  return Math.abs(rounded) < 1e-6 ? 0 : rounded;
}

function finitePoint(value: unknown): PlacementPoint | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<PlacementPoint>;
  if (![candidate.x, candidate.y, candidate.z].every((coordinate) => typeof coordinate === "number" && Number.isFinite(coordinate))) {
    return null;
  }
  return { x: candidate.x as number, y: candidate.y as number, z: candidate.z as number };
}

export function horizontalPlacementWorkplane(elevation = 0): PlacementWorkplane {
  return {
    origin: { x: 0, y: Number.isFinite(elevation) ? elevation : 0, z: 0 },
    normal: { x: 0, y: 1, z: 0 },
    xAxis: { x: 1, y: 0, z: 0 },
    zAxis: { x: 0, y: 0, z: 1 },
  };
}

export function normalizePlacementWorkplane(value: unknown, fallbackElevation = 0): PlacementWorkplane {
  if (!value || typeof value !== "object") return horizontalPlacementWorkplane(fallbackElevation);
  const candidate = value as Partial<PlacementWorkplane>;
  const origin = finitePoint(candidate.origin);
  const normal = finitePoint(candidate.normal);
  const xAxis = finitePoint(candidate.xAxis);
  if (!origin || !normal || !xAxis || vector(normal).lengthSq() < EPSILON || vector(xAxis).lengthSq() < EPSILON) {
    return horizontalPlacementWorkplane(fallbackElevation);
  }
  // Ein bereits gueltiges Achsenkreuz bleibt Bit fuer Bit erhalten. Erneutes
  // Normalisieren kippt auf schraegen Ebenen die letzte Nachkommastelle hin
  // und her - Speichern und Projektliste haben sich darueber endlos
  // gegenseitig aktualisiert ("Maximum update depth exceeded").
  const zAxis = finitePoint(candidate.zAxis);
  if (zAxis && orthonormalFrame(normal, xAxis, zAxis)) {
    return { origin, normal: { ...normal }, xAxis: { ...xAxis }, zAxis: { ...zAxis } };
  }
  return placementWorkplaneFromSurface(origin, normal, xAxis);
}

function orthonormalFrame(normal: PlacementPoint, xAxis: PlacementPoint, zAxis: PlacementPoint) {
  const n = vector(normal);
  const x = vector(xAxis);
  const z = vector(zAxis);
  const tolerance = 1e-9;
  return Math.abs(n.lengthSq() - 1) < tolerance
    && Math.abs(x.lengthSq() - 1) < tolerance
    && Math.abs(n.dot(x)) < tolerance
    && x.clone().cross(n).distanceToSquared(z) < tolerance;
}

export function placementWorkplaneFingerprint(workplane: PlacementWorkplane) {
  return [
    workplane.origin.x, workplane.origin.y, workplane.origin.z,
    workplane.normal.x, workplane.normal.y, workplane.normal.z,
    workplane.xAxis.x, workplane.xAxis.y, workplane.xAxis.z,
    workplane.zAxis.x, workplane.zAxis.y, workplane.zAxis.z,
  ].map(clean).join(":");
}

export function placementWorkplaneFromSurface(
  origin: PlacementPoint,
  surfaceNormal: PlacementPoint,
  tangentHint: PlacementPoint,
  reverse = false,
  upright = false,
): PlacementWorkplane {
  const normal = vector(surfaceNormal).normalize();
  if (reverse) normal.negate();

  // Auf einer stehenden oder schraegen Flaeche zeigt "oben" in der Skizze
  // (-zAxis) nach oben in der Welt. Die Kante der Flaeche allein legte das
  // nicht fest: auf der Rueck- und der rechten Seite stand die Skizze sonst
  // auf dem Kopf (Forum 617195).
  if (upright && Math.abs(normal.y) < 0.999) {
    const zAxis = new THREE.Vector3(0, 1, 0).projectOnPlane(normal).normalize().negate();
    const xAxis = normal.clone().cross(zAxis).normalize();
    return {
      origin: { x: origin.x, y: origin.y, z: origin.z },
      normal: point(normal),
      xAxis: point(xAxis),
      zAxis: point(zAxis),
    };
  }

  let xAxis = vector(tangentHint).projectOnPlane(normal);
  if (xAxis.lengthSq() < EPSILON) {
    const candidates = [
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 1, 0),
    ];
    xAxis = candidates.reduce((best, candidate) => {
      const projected = candidate.clone().projectOnPlane(normal);
      return projected.lengthSq() > best.lengthSq() ? projected : best;
    }, new THREE.Vector3());
  }
  xAxis.normalize();
  const zAxis = xAxis.clone().cross(normal).normalize();

  return {
    origin: { x: origin.x, y: origin.y, z: origin.z },
    normal: point(normal),
    xAxis: point(xAxis),
    zAxis: point(zAxis),
  };
}

export function snapPlacementWorkplaneOrigin(
  workplane: PlacementWorkplane,
  step: number,
  referenceOrigin: PlacementPoint = { x: 0, y: 0, z: 0 },
): PlacementWorkplane {
  if (!Number.isFinite(step) || step <= 0) return workplane;

  const normal = vector(workplane.normal);
  const xAxis = vector(workplane.xAxis);
  const zAxis = vector(workplane.zAxis);
  const origin = vector(workplane.origin);
  const reference = vector(referenceOrigin);
  const anchor = reference.clone().addScaledVector(
    normal,
    origin.clone().sub(reference).dot(normal),
  );
  const offset = origin.clone().sub(anchor);
  const snappedOrigin = anchor
    .addScaledVector(xAxis, Math.round(offset.dot(xAxis) / step) * step)
    .addScaledVector(zAxis, Math.round(offset.dot(zAxis) / step) * step);

  return {
    ...workplane,
    origin: point(snappedOrigin),
  };
}

export function placementWorkplaneQuaternion(workplane: PlacementWorkplane) {
  const basis = new THREE.Matrix4().makeBasis(
    vector(workplane.xAxis),
    vector(workplane.normal),
    vector(workplane.zAxis),
  );
  return new THREE.Quaternion().setFromRotationMatrix(basis).normalize();
}

export function placementWorkplaneCoordinates(workplane: PlacementWorkplane, worldPoint: PlacementPoint) {
  const relative = vector(worldPoint).sub(vector(workplane.origin));
  return {
    x: relative.dot(vector(workplane.xAxis)),
    y: relative.dot(vector(workplane.normal)),
    z: relative.dot(vector(workplane.zAxis)),
  };
}

/** A view tilted less than this towards the workplane sees it edge-on (#1744), as the sine of the angle. */
export const EDGE_ON_WORKPLANE_SINE = Math.sin(THREE.MathUtils.degToRad(8));

/**
 * Where the pointer drags on a workplane seen edge-on (#1744), as from the front with the plate level:
 * the pointer's ray meets an upright plane through the workplane's origin that faces the camera, and
 * that point is brought straight down onto the workplane. So a part follows the pointer along the
 * axis that shows and keeps its depth, where the ray itself would miss the workplane or meet it far
 * behind. Null when the view is not edge-on; then the ray meets the workplane itself.
 */
export function edgeOnWorkplanePoint(workplane: PlacementWorkplane, ray: THREE.Ray, viewDirection: THREE.Vector3): THREE.Vector3 | null {
  const normal = vector(workplane.normal).normalize();
  const view = viewDirection.clone().normalize();
  if (Math.abs(view.dot(normal)) >= EDGE_ON_WORKPLANE_SINE) return null;
  const facing = view.projectOnPlane(normal);
  if (facing.lengthSq() < 1e-9) return null;
  const origin = vector(workplane.origin);
  const hit = ray.intersectPlane(new THREE.Plane().setFromNormalAndCoplanarPoint(facing.normalize(), origin), new THREE.Vector3());
  if (!hit) return null;
  return hit.addScaledVector(normal, -normal.dot(hit.clone().sub(origin)));
}

export function placementWorkplanePoint(workplane: PlacementWorkplane, x: number, z: number): PlacementPoint {
  const world = vector(workplane.origin)
    .addScaledVector(vector(workplane.xAxis), x)
    .addScaledVector(vector(workplane.zAxis), z);
  return point(world);
}

export function placementPatchForNewShape(
  shape: Pick<WorkplaneShape, "height">,
  workplane: PlacementWorkplane,
  basePoint: PlacementPoint = workplane.origin,
  /** Sunk into the face: the top of the shape on the point, the body below it, not the foot on it (#940). */
  sunk = false,
): Pick<WorkplaneShape, "x" | "z" | "elevation" | "rotation" | "rotationX" | "rotationZ"> {
  const quaternion = placementWorkplaneQuaternion(workplane);
  const euler = new THREE.Euler().setFromQuaternion(quaternion, "XYZ");
  const center = vector(basePoint).addScaledVector(vector(workplane.normal), sunk ? -shape.height / 2 : shape.height / 2);
  return {
    x: clean(center.x),
    z: clean(center.z),
    elevation: clean(center.y - shape.height / 2),
    rotation: clean(THREE.MathUtils.radToDeg(euler.y)),
    rotationX: clean(THREE.MathUtils.radToDeg(euler.x)),
    rotationZ: clean(THREE.MathUtils.radToDeg(euler.z)),
  };
}

export function translationToWorkplane(
  workplane: PlacementWorkplane,
  worldVertices: PlacementPoint[],
  /** The top of the shape goes to the workplane, below it, in place of the base on it (#940). */
  top = false,
): PlacementPoint {
  if (worldVertices.length === 0) return { x: 0, y: 0, z: 0 };
  const origin = vector(workplane.origin);
  const normal = vector(workplane.normal);
  const distance = worldVertices.reduce(
    (reached, vertex) => (top ? Math.max(reached, vector(vertex).sub(origin).dot(normal)) : Math.min(reached, vector(vertex).sub(origin).dot(normal))),
    top ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
  );
  const translation = normal.multiplyScalar(-distance);
  return point(translation);
}

export function placementWorkplaneIsBase(workplane: PlacementWorkplane) {
  return (
    Math.abs(workplane.origin.x) < 1e-6
    && Math.abs(workplane.origin.y) < 1e-6
    && Math.abs(workplane.origin.z) < 1e-6
    && Math.abs(workplane.normal.x) < 1e-6
    && Math.abs(workplane.normal.y - 1) < 1e-6
    && Math.abs(workplane.normal.z) < 1e-6
  );
}

/**
 * How far along X a workplane lies that is the plate itself, only moved sideways - the plate's frame put in the middle of
 * another build plate, where a new sketch starts on that plate (#1660) - or null for any other workplane (lifted, tilted,
 * turned, or moved along Z). The base plate itself gives 0.
 */
export function placementWorkplanePlateShift(workplane: PlacementWorkplane): number | null {
  const near = (value: number, target: number) => Math.abs(value - target) < 1e-6;
  const upright = near(workplane.normal.x, 0) && near(workplane.normal.y, 1) && near(workplane.normal.z, 0);
  const square = near(workplane.xAxis.x, 1) && near(workplane.xAxis.y, 0) && near(workplane.xAxis.z, 0)
    && near(workplane.zAxis.x, 0) && near(workplane.zAxis.y, 0) && near(workplane.zAxis.z, 1);
  if (!upright || !square || Math.abs(workplane.origin.y) > 1e-6 || Math.abs(workplane.origin.z) > 1e-6) return null;
  return Math.abs(workplane.origin.x) < 1e-6 ? 0 : workplane.origin.x;
}

// A workplane moved or turned on the plate but still lying in its plane. Its grid
// and the plate's then share one plane, slightly offset, and the two make a
// moiré (#178), so the plate keeps only its outline.
export function placementWorkplaneLiesOnBase(workplane: PlacementWorkplane) {
  return (
    Math.abs(workplane.origin.y) < 1e-3
    && Math.abs(workplane.normal.x) < 1e-6
    && Math.abs(Math.abs(workplane.normal.y) - 1) < 1e-6
    && Math.abs(workplane.normal.z) < 1e-6
  );
}
