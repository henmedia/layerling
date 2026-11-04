import * as THREE from "three";
import { useEffect, type RefObject } from "react";
import { findShapeObject, type ThreeState } from "@/components/workplane/ViewportOverlays";
import { visibleWorkArea } from "@/lib/visibleWorkArea";

type Direction = { x: number; y: number; z: number };

/**
 * What the editor's keys need to know of the 3D view: which way the screen
 * points, and how to keep moved bodies in sight.
 */
declare global {
  interface Window {
    /** Which way the screen points in the world: right, and away from the viewer (up on a view from above). */
    layerlingScreenDirections?: () => { right: Direction; away: Direction };
    /** Moves the view along when bodies moved by keyboard would leave it. */
    layerlingFollowMove?: (ids: string[], translation: Direction) => void;
    /**
     * Tells the view that the arrow keys are about to move these bodies, so the movement
     * dimensions show the way, added up over the key steps (Discussion #1289).
     */
    layerlingKeyboardMove?: (ids: string[], translation: Direction, rise: boolean) => void;
  }
}

export function useViewportKeyboardHooks(threeRef: RefObject<ThreeState | null>) {
  // The arrow keys move along what the screen shows, and the view follows
  // what they push past its edge (both in LayerlingEditor's nudge).
  useEffect(() => {
    window.layerlingScreenDirections = () => {
      const camera = threeRef.current?.camera;
      if (!camera) return { right: { x: 1, y: 0, z: 0 }, away: { x: 0, y: 0, z: -1 } };
      camera.updateMatrixWorld();
      const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
      const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
      const forward = camera.getWorldDirection(new THREE.Vector3());
      // Seen from above "away" is up on the screen, seen from the side it is
      // into the screen; the sum points the right way for both and between.
      const away = forward.add(up);
      return { right: { x: right.x, y: right.y, z: right.z }, away: { x: away.x, y: away.y, z: away.z } };
    };
    window.layerlingFollowMove = (ids, translation) => {
      const state = threeRef.current;
      if (!state || !ids.length) return;
      const bounds = new THREE.Box3();
      ids.forEach((id) => {
        const object = findShapeObject(state, id);
        if (object) bounds.expandByObject(object);
      });
      if (bounds.isEmpty()) return;
      const center = bounds.getCenter(new THREE.Vector3());
      const moved = center.clone().add(new THREE.Vector3(translation.x, translation.y, translation.z));
      // Past the part of the picture really seen - not under the camera bar or the settings -, the view
      // takes the same step, so the bodies stay where they are on screen. Only for a body that was in
      // the picture and would leave it: one that already lies outside simply moves.
      // Following that too made the body stand still and everything else slide past (#486).
      const canvas = state.renderer.domElement;
      const area = visibleWorkArea(canvas, canvas.clientWidth, canvas.clientHeight);
      const isInPicture = (point: THREE.Vector3) => {
        const projected = point.clone().project(state.camera);
        const px = (projected.x + 1) / 2 * canvas.clientWidth;
        const py = (1 - projected.y) / 2 * canvas.clientHeight;
        return projected.z < 1 && px >= area.left && px <= area.right && py >= area.top && py <= area.bottom;
      };
      if (!isInPicture(center) || isInPicture(moved)) return;
      const step = new THREE.Vector3(translation.x, translation.y, translation.z);
      state.camera.position.add(step);
      state.controls.target.add(step);
      state.controls.update();
      state.needsRender = true;
    };
    return () => {
      delete window.layerlingScreenDirections;
      delete window.layerlingFollowMove;
    };
  }, [threeRef]);
}
