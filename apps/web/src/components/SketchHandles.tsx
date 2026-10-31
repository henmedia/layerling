"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import { LockKeyhole } from "lucide-react";
import { rotateHandleArrow } from "@/components/workplane/transformOverlayTypes";
import type { PlateSpot, RotateHandleSpot } from "@/lib/sketchHandleSpots";

/** The radius of the arrow's arc in screen pixels, as on the 3D editor's rotate handles. */
const ARROW_RADIUS = 26 * 0.6;

/**
 * How wide, in screen pixels, the band along the arrow that takes the pointer is. Only the arrow itself grabs:
 * the 3D handle's 40px square, standing just beyond a corner, covered most of the sketch's corner square and
 * a drag meant to scale turned instead (forum, 621826).
 */
export const SKETCH_ROTATE_HIT_WIDTH = 14;

/** The arrow for a spot whose way out from the middle is `outward`, in screen pixels about the spot. */
export function sketchRotateArrow(outward: PlateSpot) {
  // Flat on the plate: the arc lies in the plate and turns about its normal.
  return rotateHandleArrow((point) => ({ x: point.x, y: point.z }), { x: 0, y: 0, z: 0 }, { x: outward.x, y: 0, z: outward.z }, { x: 0, y: 1, z: 0 }, ARROW_RADIUS);
}

/**
 * The turning arrows round a picture or a selection in the sketch: the 3D editor's rotate handle for the
 * up axis, the same arrow in the same blue, one at each spot. Drawn in screen pixels, scaled onto the plate.
 */
export function SketchRotateHandles({
  spots,
  screenUnit,
  entity,
  locked = false,
  title,
  onPointerDown,
}: {
  spots: RotateHandleSpot[];
  screenUnit: number;
  entity: string;
  /** A locked selection's arrows stay, grey and inert, as on a locked body in 3D. */
  locked?: boolean;
  title: string;
  onPointerDown: (event: ReactPointerEvent<SVGGElement>, corner: number) => void;
}) {
  return (
    <g className="sketch-rotate-handles">
      {spots.map((spot) => {
        const arrow = sketchRotateArrow(spot.outward);
        return (
          <g key={spot.corner} className={`sketch-rotate-handle ${locked ? "locked" : ""}`} data-sketch-entity={entity} transform={`translate(${spot.x} ${spot.z}) scale(${screenUnit})`} onPointerDown={(event) => onPointerDown(event, spot.corner)}>
            <title>{title}</title>
            <svg x={-15} y={-15} width={30} height={30} viewBox="-15 -15 30 30" overflow="visible">
              <path className="sketch-rotate-handle-hit" d={`${arrow.arc} ${arrow.heads}`} strokeWidth={SKETCH_ROTATE_HIT_WIDTH} />
              <path className="rotate-arrow-arc" d={arrow.arc} />
              <path className="rotate-arrow-heads" d={arrow.heads} />
            </svg>
          </g>
        );
      })}
    </g>
  );
}

/** The padlock on a locked picture: a click on it unlocks the picture. */
export function SketchLockBadge({
  spot,
  screenUnit,
  title,
  onPointerDown,
}: {
  spot: PlateSpot;
  screenUnit: number;
  title: string;
  onPointerDown: (event: ReactPointerEvent<SVGGElement>) => void;
}) {
  return (
    <g className="sketch-lock-badge" data-sketch-entity="image-handle" transform={`translate(${spot.x} ${spot.z}) scale(${screenUnit})`} onPointerDown={onPointerDown}>
      <title>{title}</title>
      <rect x={-12} y={-12} width={24} height={24} rx={6} />
      <LockKeyhole x={-7.5} y={-7.5} size={15} />
    </g>
  );
}

/**
 * The ring shown while a picture or a selection turns (forum, 621358), like the 3D editor's rotation wheel:
 * with the pointer inside it the turn snaps to 22.5°, a mark for each step; outside it goes in whole degrees.
 * `active` while the pointer is inside. In plate units around `pivot`; strokes stay one screen pixel wide.
 */
export function SketchTurnRing({
  pivot,
  radius,
  active,
  screenUnit,
}: {
  pivot: { x: number; z: number };
  radius: number;
  active: boolean;
  screenUnit: number;
}) {
  const ticks = Array.from({ length: 16 }, (_, index) => {
    const angle = (index * Math.PI) / 8;
    // Every fourth mark, a right angle, reaches further in.
    const inner = radius - (index % 4 === 0 ? 10 : 5) * screenUnit;
    return { key: index, x1: Math.cos(angle) * inner, z1: Math.sin(angle) * inner, x2: Math.cos(angle) * radius, z2: Math.sin(angle) * radius };
  });
  return (
    <g className={`sketch-turn-ring ${active ? "active" : ""}`} pointerEvents="none" transform={`translate(${pivot.x} ${pivot.z})`}>
      <circle r={radius} strokeWidth={1.5 * screenUnit} strokeDasharray={`${4 * screenUnit} ${3 * screenUnit}`} />
      {ticks.map((tick) => (
        <line key={tick.key} x1={tick.x1} y1={tick.z1} x2={tick.x2} y2={tick.z2} strokeWidth={1.5 * screenUnit} />
      ))}
    </g>
  );
}
