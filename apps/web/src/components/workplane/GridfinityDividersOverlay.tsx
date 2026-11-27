"use client";

import { useEffect, useRef, type Dispatch, type MutableRefObject, type PointerEvent as ReactPointerEvent, type SetStateAction, type WheelEvent as ReactWheelEvent } from "react";
import * as THREE from "three";
import { projectToScreen, type ThreeState } from "@/components/workplane/ViewportOverlays";
import { pointerRayFor } from "@/components/workplane/viewportPicking";
import { dragHasStarted } from "@/lib/dragStart";
import { gridfinityDividerDragged, gridfinityDividerGrips, type GridfinityDividerStart } from "@/lib/gridfinityDividerGrips";
import type { GridfinityAxis } from "@/lib/gridfinityGeometry";
import { t } from "@/lib/i18n";
import { formatCurrentLengthShort } from "@/lib/measurementUnits";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * A Gridfinity bin's dividers dragged in the view (Discussion #1799), as Hollow's dividers by hand are (ShellWallsOverlay):
 * while one bin with dividers is selected, each divider from wall to wall has a grip on its top that moves it, and every
 * compartment shows its size, so the compartments a divider makes can be seen while it moves. Only the grips take the
 * pointer. The pointer is followed on the plane of the dividers' top, in the bin's own frame, so a divider moves under it
 * however the bin is turned, tilted or mirrored and wherever the camera looks.
 */

type Screen = { x: number; y: number };

/**
 * How steeply the view must look at the dividers' top for grips: 20 degrees. Flatter, the depth shows at about a third of
 * its length (sin 20° is 0.34) or less, and on a bin at 3 pixels a millimetre a slip of 6 pixels moves a divider about 6 mm.
 */
const EDGE_ON = Math.sin(THREE.MathUtils.degToRad(20));

export type GridfinityDividersOverlayState = {
  shapeId: string;
  dividers: { axis: GridfinityAxis; index: number; from: Screen; to: Screen; grip: Screen }[];
  parts: { from: Screen; to: Screen }[];
  /** The sizes of the compartments wide enough on screen for their label. */
  compartments: { at: Screen; text: string }[];
  signature: string;
};

/**
 * A divider being dragged: where it and the pointer were as it began, how many dividers ran its way then, and whether the
 * pointer has gone far enough to move it.
 */
export type GridfinityDividerDrag = { axis: GridfinityAxis; index: number; count: number; start: GridfinityDividerStart; at: { x: number; z: number }; client: Screen; pointer: number; started: boolean; grip: HTMLElement };

/**
 * The bin's frame in the scene: a point of its plan (x across, z deep from its middle) on the dividers' top. The shape's
 * object stands at the middle of its height, turned and mirrored as the shape is, and the bin's mesh is built from its
 * bottom, so the plan's height is taken down by half the shape's.
 */
function frameOf(state: ThreeState, shape: WorkplaneShape) {
  const record = state.shapeRecords.get(shape.id);
  const grips = gridfinityDividerGrips(shape);
  if (!record || !grips) return null;
  const object = record.object;
  object.updateWorldMatrix(true, false);
  const level = grips.top - shape.height / 2;
  const toWorld = (x: number, z: number) => object.localToWorld(new THREE.Vector3(x, level, z));
  const fromWorld = (point: THREE.Vector3) => {
    const local = object.worldToLocal(point.clone());
    return { x: local.x, z: local.z };
  };
  const plane = new THREE.Plane().setFromCoplanarPoints(toWorld(0, 0), toWorld(1, 0), toWorld(0, 1));
  return { grips, toWorld, fromWorld, plane };
}

/**
 * The place under the pointer on the dividers' top, in the bin's frame; null for a ray that meets that plane flatter than
 * 20 degrees. The ray is the view's own, which in a flat view starts behind the camera (Discussion #1558), so it still
 * meets dividers that stand above it.
 */
function pointerOnBin(state: ThreeState, shape: WorkplaneShape, clientX: number, clientY: number) {
  const frame = frameOf(state, shape);
  if (!frame) return null;
  const ray = pointerRayFor(state, clientX, clientY);
  if (Math.abs(ray.direction.dot(frame.plane.normal)) < EDGE_ON) return null;
  const hit = ray.intersectPlane(frame.plane, new THREE.Vector3());
  return hit ? frame.fromWorld(hit) : null;
}

/** The grips, lines and sizes on screen, kept in step with the camera and the bin. */
export function syncGridfinityDividersOverlay(
  state: ThreeState,
  shape: WorkplaneShape | null,
  overlayRef: MutableRefObject<GridfinityDividersOverlayState | null>,
  setOverlay: Dispatch<SetStateAction<GridfinityDividersOverlayState | null>>,
  dragged: { axis: GridfinityAxis; index: number } | null,
) {
  const frame = shape ? frameOf(state, shape) : null;
  const clear = () => {
    if (!overlayRef.current) return;
    overlayRef.current = null;
    setOverlay(null);
  };
  if (!shape || !frame) return clear();
  const { grips, toWorld, plane } = frame;
  const { camera } = state;
  // Seen along the dividers' top (straight from the front or a side), the grips would lie on one line and a slip would
  // throw a divider to its end: nothing is drawn then. A perspective camera looks at the bin along the ray to its middle.
  const look = camera instanceof THREE.PerspectiveCamera ? toWorld(0, 0).sub(camera.position).normalize() : camera.getWorldDirection(new THREE.Vector3());
  if (Math.abs(look.dot(plane.normal)) < EDGE_ON) return clear();
  // A point behind a perspective camera has no place on the screen: a divider or a compartment reaching behind it is left out.
  const inFront = (points: { x: number; z: number }[]) => !(camera instanceof THREE.PerspectiveCamera) || points.every((point) => toWorld(point.x, point.z).applyMatrix4(camera.matrixWorldInverse).z < -1e-3);
  // So is a grip a perspective camera sees too flat to follow, as the pointer on it would be.
  const steep = (point: { x: number; z: number }) => !(camera instanceof THREE.PerspectiveCamera) || Math.abs(toWorld(point.x, point.z).sub(camera.position).normalize().dot(plane.normal)) >= EDGE_ON;
  const screen = (point: { x: number; z: number }) => projectToScreen(toWorld(point.x, point.z), state);
  const next: GridfinityDividersOverlayState = {
    shapeId: shape.id,
    // The divider being dragged stays, so its grip keeps the pointer until it is let go.
    dividers: grips.dividers.filter((divider) => (dragged?.axis === divider.axis && dragged.index === divider.index) || (inFront([divider.from, divider.to]) && steep(divider.grip))).map((divider) => ({ axis: divider.axis, index: divider.index, from: screen(divider.from), to: screen(divider.to), grip: screen(divider.grip) })),
    parts: grips.parts.filter((part) => inFront([part.from, part.to])).map((part) => ({ from: screen(part.from), to: screen(part.to) })),
    compartments: grips.compartments.flatMap((compartment) => {
      const { centre, width, depth } = compartment;
      const flat = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz]) => ({ x: centre.x + (sx * width) / 2, z: centre.z + (sz * depth) / 2 }));
      if (!inFront(flat)) return [];
      const corners = flat.map(screen);
      const wide = Math.max(...corners.map((corner) => corner.x)) - Math.min(...corners.map((corner) => corner.x));
      const high = Math.max(...corners.map((corner) => corner.y)) - Math.min(...corners.map((corner) => corner.y));
      // Rounded as Hollow's are (#2099): whole millimetres, inches to the nearest eighth or to two decimals.
      const text = `${formatCurrentLengthShort(width)} × ${formatCurrentLengthShort(depth)}`;
      // A size wider than its compartment on screen would lie over the next one; it shows once there is room, about 7 px a character.
      return wide >= Math.max(48, text.length * 7) && high >= 22 ? [{ at: screen(centre), text }] : [];
    }),
    signature: "",
  };
  const rounded = (point: Screen) => `${Math.round(point.x)},${Math.round(point.y)}`;
  next.signature = JSON.stringify([shape.id, next.dividers.map((divider) => [rounded(divider.from), rounded(divider.to), rounded(divider.grip)]), next.parts.map((part) => [rounded(part.from), rounded(part.to)]), next.compartments.map((entry) => [rounded(entry.at), entry.text])]);
  if (overlayRef.current?.signature === next.signature) return;
  overlayRef.current = next;
  setOverlay(next);
}

/**
 * Ends a divider drag, however it ends: the grip lets go of the pointer, and a drag that has started ends its
 * interaction, so the whole drag is one step in the history. With Esc (#440) the editor first puts the bin back as it
 * was when the drag began, and the drag leaves no step. Says whether there was a drag to end.
 */
export function endGridfinityDividerDrag(dragRef: MutableRefObject<GridfinityDividerDrag | null>, onInteractionActiveChange?: (active: boolean) => void, onCancelInteraction?: () => void) {
  const current = dragRef.current;
  if (!current) return false;
  dragRef.current = null;
  try {
    current.grip.releasePointerCapture(current.pointer);
  } catch {
    // Nothing was held.
  }
  if (current.started) {
    onCancelInteraction?.();
    onInteractionActiveChange?.(false);
  }
  return true;
}

export function GridfinityDividersOverlay({
  overlay,
  shape,
  threeRef,
  dragRef,
  onUpdateShape,
  onInteractionActiveChange,
  onBeginCameraDrag,
  onCameraWheel,
}: {
  overlay: GridfinityDividersOverlayState;
  /** The bin the overlay is about, as it is now. */
  shape: WorkplaneShape;
  threeRef: MutableRefObject<ThreeState | null>;
  /** The divider being dragged; the viewport holds it, so Esc can call the drag off. */
  dragRef: MutableRefObject<GridfinityDividerDrag | null>;
  onUpdateShape: (id: string, patch: Partial<WorkplaneShape>) => void;
  onInteractionActiveChange?: (active: boolean) => void;
  /** A middle or right press on a grip turns or shifts the view (other presses it leaves alone), and the wheel zooms it, as over the move handles. */
  onBeginCameraDrag: (event: ReactPointerEvent<Element>) => void;
  onCameraWheel: (event: ReactWheelEvent<Element>) => void;
}) {
  const onInteractionActiveChangeRef = useRef(onInteractionActiveChange);
  onInteractionActiveChangeRef.current = onInteractionActiveChange;
  const grips = gridfinityDividerGrips(shape);
  // Grips that go while a divider is dragged (another tool opened, another bin selected) end the drag, so it is one step.
  useEffect(() => () => {
    endGridfinityDividerDrag(dragRef, onInteractionActiveChangeRef.current);
  }, [dragRef]);
  // So does a new number of dividers that way (the MCP, say): its places and list from the start no longer fit the bin.
  useEffect(() => {
    const current = dragRef.current;
    if (current && grips?.dividers.filter((divider) => divider.axis === current.axis).length !== current.count) endGridfinityDividerDrag(dragRef, onInteractionActiveChangeRef.current);
  }, [dragRef, grips]);

  if (overlay.shapeId !== shape.id || !grips) return null;

  const begin = (event: ReactPointerEvent<HTMLButtonElement>, grip: { axis: GridfinityAxis; index: number }) => {
    // Middle and right presses went to the view (onPointerDownCapture); back and forward do nothing.
    if (event.button > 0) return;
    event.stopPropagation();
    // One drag at a time: a second finger or pen on a grip waits for the first to let go. The same pointer pressing
    // again was let go where the grip did not see it, so its drag is over.
    if (dragRef.current) {
      if (dragRef.current.pointer !== event.pointerId) return;
      endGridfinityDividerDrag(dragRef, onInteractionActiveChange);
    }
    const state = threeRef.current;
    const divider = grips.dividers.find((entry) => entry.axis === grip.axis && entry.index === grip.index);
    if (!state || !divider) return;
    const at = pointerOnBin(state, shape, event.clientX, event.clientY);
    if (!at) return;
    dragRef.current = { axis: divider.axis, index: divider.index, count: grips.dividers.filter((entry) => entry.axis === divider.axis).length, start: { position: divider.position, kept: divider.axis === "x" ? shape.gridfinityDividerPositionsX : shape.gridfinityDividerPositionsZ }, at, client: { x: event.clientX, y: event.clientY }, pointer: event.pointerId, started: false, grip: event.currentTarget };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // A pointer the browser no longer knows cannot be held; the drag then ends when it leaves the grip.
    }
  };
  const move = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const current = dragRef.current;
    const state = threeRef.current;
    if (!current || current.pointer !== event.pointerId || !state) return;
    // A click with a slightly shaky hand moves nothing (#150), and so leaves evenly spaced dividers as they are.
    if (!current.started) {
      if (!dragHasStarted(current.client.x, current.client.y, event.clientX, event.clientY)) return;
      current.started = true;
      onInteractionActiveChange?.(true);
    }
    const at = pointerOnBin(state, shape, event.clientX, event.clientY);
    if (!at) return;
    const offset = current.axis === "x" ? at.x - current.at.x : at.z - current.at.z;
    const patch = gridfinityDividerDragged(shape, current.axis, current.index, current.start, offset, event.altKey ? 0.1 : undefined);
    if (patch) onUpdateShape(shape.id, patch);
  };
  const end = (event: ReactPointerEvent<HTMLButtonElement>) => {
    // Only the grip holding the drag ends it: a late lost capture of the grip pressed before does not.
    if (dragRef.current?.pointer === event.pointerId && dragRef.current.grip === event.currentTarget) endGridfinityDividerDrag(dragRef, onInteractionActiveChange);
  };
  const name = (divider: { axis: GridfinityAxis; index: number }) => t(divider.axis === "x" ? "gridfinity.dividerGripAcross" : "gridfinity.dividerGripDeep", { number: divider.index + 1 });

  return (
    <div
      className="shell-walls-overlay gridfinity-dividers-overlay"
      data-testid="gridfinity-dividers-overlay"
      onPointerDownCapture={onBeginCameraDrag}
      onWheelCapture={onCameraWheel}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <svg className="tape-guides" width="100%" height="100%" aria-hidden="true">
        {overlay.parts.map((part, index) => (
          <line key={`part-${index}`} className="shell-walls-overlay-line" x1={part.from.x} y1={part.from.y} x2={part.to.x} y2={part.to.y} />
        ))}
        {overlay.dividers.map((divider) => (
          <line key={`${divider.axis}${divider.index}`} className="shell-walls-overlay-line" x1={divider.from.x} y1={divider.from.y} x2={divider.to.x} y2={divider.to.y} />
        ))}
      </svg>
      {overlay.compartments.map((compartment, index) => (
        <div key={`compartment-${index}`} className="shell-walls-overlay-compartment" style={{ left: compartment.at.x, top: compartment.at.y }}>
          <span className="shell-walls-overlay-size">{compartment.text}</span>
        </div>
      ))}
      {overlay.dividers.map((divider) => (
        <button
          key={`grip-${divider.axis}${divider.index}`}
          type="button"
          className="shell-walls-overlay-grip move"
          style={{ left: divider.grip.x, top: divider.grip.y }}
          title={name(divider)}
          aria-label={name(divider)}
          data-testid="gridfinity-dividers-overlay-grip"
          onPointerDown={(event) => begin(event, divider)}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          onLostPointerCapture={end}
        />
      ))}
    </div>
  );
}
