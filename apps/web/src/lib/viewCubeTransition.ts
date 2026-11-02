import * as THREE from "three";
import { VIEW_CUBE_POLE_EPSILON } from "@/lib/viewCubeDrag";

/**
 * A click on the view cube turns the camera from where it stands to the clicked face, edge or
 * corner instead of jumping there. The turn runs on the orbit sphere around the pivot: the
 * radius stays, the angles take the shortest way, and the eye eases out into the new view.
 * A double click on the workplane slides the pivot to the spot the same way, the angle kept.
 */
export const VIEW_CUBE_TURN_MS = 320;

/** Whether the system asks for less motion; then a click on the view cube cuts to the view, as it always did. */
export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** A turn around the pivot: a click on the view cube. */
export type ViewTurn = {
  from: THREE.Spherical;
  to: THREE.Spherical;
  startedAt: number;
  duration: number;
  /** The pivot moving along with the turn: a look onto the workplane brings its origin to the middle (#1128). */
  slide?: PivotSlide;
};

/** A slide of the pivot with the camera alongside: a double click on the workplane centres the view there. */
export type PivotSlide = {
  pivotFrom: THREE.Vector3;
  pivotTo: THREE.Vector3;
  startedAt: number;
  duration: number;
};

export type CameraTurn = ViewTurn | PivotSlide;

/** Ease-out cubic: quick at the first click, gentle as the view settles. */
export function turnEase(progress: number): number {
  const left = 1 - THREE.MathUtils.clamp(progress, 0, 1);
  return 1 - left * left * left;
}

/**
 * The turn from the camera's current offset to a new one. The distance is kept, and the
 * azimuth takes the shorter way round, so a click never swings the long way (and never
 * through the pivot, as a straight line between two positions would).
 */
export function cameraTurn(fromOffset: THREE.Vector3, toOffset: THREE.Vector3, startedAt: number, duration = VIEW_CUBE_TURN_MS): ViewTurn {
  const from = new THREE.Spherical().setFromVector3(fromOffset);
  const to = new THREE.Spherical().setFromVector3(toOffset);
  to.radius = from.radius;
  to.phi = THREE.MathUtils.clamp(to.phi, VIEW_CUBE_POLE_EPSILON, Math.PI - VIEW_CUBE_POLE_EPSILON);
  let theta = to.theta;
  if (theta - from.theta > Math.PI) theta -= Math.PI * 2;
  else if (theta - from.theta < -Math.PI) theta += Math.PI * 2;
  to.theta = theta;
  return { from, to, startedAt, duration: Math.max(1, duration) };
}

/**
 * The camera offset at `now`, and whether the turn has arrived. The ends are exact, so a
 * turn that is cut short by a drag never leaves the camera between two views.
 */
export function cameraTurnOffset(turn: ViewTurn, now: number): { offset: THREE.Vector3; done: boolean } {
  const progress = THREE.MathUtils.clamp((now - turn.startedAt) / turn.duration, 0, 1);
  const eased = turnEase(progress);
  const spherical = new THREE.Spherical(
    THREE.MathUtils.lerp(turn.from.radius, turn.to.radius, eased),
    THREE.MathUtils.lerp(turn.from.phi, turn.to.phi, eased),
    THREE.MathUtils.lerp(turn.from.theta, turn.to.theta, eased),
  ).makeSafe();
  return { offset: new THREE.Vector3().setFromSpherical(spherical), done: progress >= 1 };
}

/** The slide of the pivot from where it is to a new spot, eased out like a turn. */
export function pivotSlide(from: THREE.Vector3, to: THREE.Vector3, startedAt: number, duration = VIEW_CUBE_TURN_MS): PivotSlide {
  return { pivotFrom: from.clone(), pivotTo: to.clone(), startedAt, duration: Math.max(1, duration) };
}

/** The pivot at `now`, and whether the slide has arrived; the ends are exact. */
export function pivotSlidePoint(slide: PivotSlide, now: number): { pivot: THREE.Vector3; done: boolean } {
  const progress = THREE.MathUtils.clamp((now - slide.startedAt) / slide.duration, 0, 1);
  if (progress >= 1) return { pivot: slide.pivotTo.clone(), done: true };
  return { pivot: slide.pivotFrom.clone().lerp(slide.pivotTo, turnEase(progress)), done: false };
}
