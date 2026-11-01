"use client";

import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import * as THREE from "three";
import { projectToScreen, type ThreeState } from "@/components/workplane/ViewportOverlays";
import type { ClearanceBox, ClearanceVec3 } from "@/lib/clearanceCheck";

/**
 * The place a row of the clearance check stands for, in the view: the narrowest gap as a line between its two points
 * with the gap written on it, or the middle of an overlap. `request` counts the clicks on rows: each one brings the
 * camera to the place, also when the same row is clicked again.
 */
export type ClearanceMark = {
  kind: "overlap" | "touching" | "tight" | "fine";
  a: ClearanceVec3;
  b: ClearanceVec3;
  label: string;
  /** What the camera frames: the overlap, or the two points. */
  box: ClearanceBox;
  request: number;
};

export type ClearanceMarkOverlayState = {
  kind: ClearanceMark["kind"];
  a: { x: number; y: number };
  b: { x: number; y: number };
  label: { x: number; y: number; text: string };
  signature: string;
};

/** The camera looks at least this far round the place (mm): a gap of 0.3 mm framed alone would fill the screen, and the parts around it show where it is. */
const CLEARANCE_FOCUS_MM = 30;

/** The box the camera frames for a mark: the place, grown to CLEARANCE_FOCUS_MM where it is smaller. */
export function clearanceFocusBox(mark: Pick<ClearanceMark, "box">) {
  const box = new THREE.Box3(new THREE.Vector3(...mark.box.min), new THREE.Vector3(...mark.box.max));
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const half = new THREE.Vector3(
    Math.max(size.x, CLEARANCE_FOCUS_MM) / 2,
    Math.max(size.y, CLEARANCE_FOCUS_MM) / 2,
    Math.max(size.z, CLEARANCE_FOCUS_MM) / 2,
  );
  return new THREE.Box3(center.clone().sub(half), center.clone().add(half));
}

/** The mark on screen, kept in step with the camera; nothing in the scene itself. */
export function syncClearanceMarkOverlay(
  state: ThreeState,
  mark: ClearanceMark | null,
  overlayRef: MutableRefObject<ClearanceMarkOverlayState | null>,
  setOverlay: Dispatch<SetStateAction<ClearanceMarkOverlayState | null>>,
) {
  if (!mark) {
    if (overlayRef.current) {
      overlayRef.current = null;
      setOverlay(null);
    }
    return;
  }
  const a = projectToScreen(new THREE.Vector3(...mark.a), state);
  const b = projectToScreen(new THREE.Vector3(...mark.b), state);
  // The label sits beside the line, never on it: the line can be shorter than the label.
  const label = { x: (a.x + b.x) / 2, y: Math.min(a.y, b.y) - 22, text: mark.label };
  const next: ClearanceMarkOverlayState = { kind: mark.kind, a, b, label, signature: "" };
  next.signature = JSON.stringify([mark.kind, mark.label, Math.round(a.x), Math.round(a.y), Math.round(b.x), Math.round(b.y)]);
  if (overlayRef.current?.signature === next.signature) return;
  overlayRef.current = next;
  setOverlay(next);
}

export function ClearanceMarkOverlay({ overlay }: { overlay: ClearanceMarkOverlayState }) {
  const { a, b, label, kind } = overlay;
  return (
    <div className={`clearance-mark-overlay ${kind}`} aria-hidden="true">
      <svg className="tape-guides" width="100%" height="100%">
        <circle className="clearance-mark-ring" cx={(a.x + b.x) / 2} cy={(a.y + b.y) / 2} r="14" />
        <line className="clearance-mark-line" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
        <circle className="clearance-mark-point" cx={a.x} cy={a.y} r="3.5" />
        <circle className="clearance-mark-point" cx={b.x} cy={b.y} r="3.5" />
      </svg>
      <span className="tape-label clearance-mark-label" style={{ left: label.x, top: label.y }}>{label.text}</span>
    </div>
  );
}
