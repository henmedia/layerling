import * as THREE from "three";
import { useEffect, useRef, type RefObject } from "react";
import type { ThreeState } from "@/components/workplane/ViewportOverlays";
import { CAMERA_MAX_DISTANCE, panCameraTo } from "@/components/workplane/cameraRig";
import { aimPickRay, firstShapeHit, pickShapeIdAt, RENDER_LAYER_SHAPES } from "@/components/workplane/viewportPicking";
import { horizontalPlacementWorkplane, placementWorkplaneCoordinates, placementWorkplaneIsBase, type PlacementWorkplane } from "@/lib/placementWorkplane";
import type { WorkplaneShape, WorkplaneWorkspaceSettings } from "@/types/layerling";

/**
 * A double click in the 3D view. On a sketch body it opens its sketch, as in similar tools; on a
 * group or a bundle it opens that for editing (#150). The first click has already selected it, so
 * this is the same as Edit Sketch or Edit group. On empty workplane it slides the view so that the
 * spot comes to the middle of the screen. Each can be switched off in the settings.
 */

/** How far a double click may be let go from where its second press began, in screen pixels: further, that press drew a selection frame. */
const DOUBLE_CLICK_PIXELS = 5;

type ViewportDoubleClickOptions = {
  threeRef: RefObject<ThreeState | null>;
  hostRef: RefObject<HTMLDivElement | null>;
  shapesRef: RefObject<readonly WorkplaneShape[]>;
  selectedIdsRef: RefObject<readonly string[]>;
  workspaceRef: RefObject<WorkplaneWorkspaceSettings>;
  pivotPickModeRef: RefObject<boolean | undefined>;
  /** The workplane the scene draws: the one set, or the plate while the workplane is hidden. */
  drawnWorkplane: () => PlacementWorkplane;
  onEditSketch?: () => void;
  onOpenGroup?: (id: string) => void;
};

/** Where a ray meets a workplane inside a plate of this size around its origin; null beside it or along it. */
export function workplanePointOnRay(ray: THREE.Ray, workplane: PlacementWorkplane, width = Infinity, depth = Infinity): THREE.Vector3 | null {
  const { origin, normal } = workplane;
  const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(new THREE.Vector3(normal.x, normal.y, normal.z).normalize(), new THREE.Vector3(origin.x, origin.y, origin.z));
  const point = ray.intersectPlane(plane, new THREE.Vector3());
  if (!point) return null;
  const local = placementWorkplaneCoordinates(workplane, point);
  return Math.abs(local.x) <= width / 2 && Math.abs(local.z) <= depth / 2 ? point : null;
}

/**
 * The nearest spot under a ray on the drawn workplane, inside its plate (as large as the base plate),
 * or on the level of the base plate, beside the plate too; null where the ray meets neither.
 */
export function nearestWorkplanePoint(ray: THREE.Ray, drawn: PlacementWorkplane, width: number, depth: number): THREE.Vector3 | null {
  const points = [workplanePointOnRay(ray, horizontalPlacementWorkplane())];
  if (!placementWorkplaneIsBase(drawn)) points.push(workplanePointOnRay(ray, drawn, width, depth));
  return points
    .filter((point): point is THREE.Vector3 => point !== null)
    .sort((a, b) => a.distanceToSquared(ray.origin) - b.distanceToSquared(ray.origin))[0] ?? null;
}

/**
 * The spot "Centre the view here" in the right-click menu slides to (Discussion #2198): the surface of the
 * body under the pointer, else the nearest workplane spot, as a double click on empty space finds it;
 * null where neither lies within reach.
 */
export function viewCentreAt(state: ThreeState, clientX: number, clientY: number, drawn: PlacementWorkplane, width: number, depth: number): THREE.Vector3 | null {
  aimPickRay(state, clientX, clientY, RENDER_LAYER_SHAPES);
  const point = firstShapeHit(state)?.point.clone() ?? nearestWorkplanePoint(state.raycaster.ray, drawn, width, depth);
  // A ray close to the horizon meets the plate's level thousands of millimetres out: no slide that far.
  return point && point.distanceTo(state.controls.target) <= CAMERA_MAX_DISTANCE ? point : null;
}

/**
 * Listens for double clicks on the 3D view. Returns the spot where the last left press on empty
 * space began a selection frame; the view's pointer handler sets it, and clears it for any other
 * press, so a double click meant for a tool (the tape measure, a note, a pick) never moves the view.
 */
export function useViewportDoubleClick(options: ViewportDoubleClickOptions) {
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const emptyPressRef = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const state = optionsRef.current.threeRef.current;
    // Pointer capture sends the clicks to the host, not to the canvas inside it.
    const host = optionsRef.current.hostRef.current;
    if (!state || !host) return;
    const onDoubleClick = (event: MouseEvent) => {
      const { shapesRef, selectedIdsRef, workspaceRef, pivotPickModeRef, drawnWorkplane, onEditSketch, onOpenGroup } = optionsRef.current;
      if (event.button !== 0 || pivotPickModeRef.current) return;
      const settings = workspaceRef.current;
      const id = pickShapeIdAt(state, event.clientX, event.clientY);
      if (!id) {
        const press = emptyPressRef.current;
        if (!press || settings.doubleClickCentersView === false) return;
        if (Math.hypot(event.clientX - press.x, event.clientY - press.y) > DOUBLE_CLICK_PIXELS) return;
        aimPickRay(state, event.clientX, event.clientY);
        const point = nearestWorkplanePoint(state.raycaster.ray, drawnWorkplane(), settings.width, settings.depth);
        // A ray close to the horizon meets the plate's level thousands of millimetres out: no slide that far.
        if (point && point.distanceTo(state.controls.target) <= CAMERA_MAX_DISTANCE) panCameraTo(state, point);
        return;
      }
      const shape = shapesRef.current.find((candidate) => candidate.id === id);
      if (!shape || shape.locked) return;
      const selected = selectedIdsRef.current;
      if (selected.length !== 1 || selected[0] !== shape.id) return;
      if (shape.sketchProfile && settings.doubleClickOpensSketch !== false) onEditSketch?.();
      else if (shape.groupedShapes?.length && settings.doubleClickOpensGroup !== false) onOpenGroup?.(shape.id);
    };
    host.addEventListener("dblclick", onDoubleClick);
    return () => host.removeEventListener("dblclick", onDoubleClick);
  }, []);
  return emptyPressRef;
}
