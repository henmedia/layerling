/*
 * Counterbores and countersinks for a metric screw size (Stephan Kühne's mail, 31.10.2026): one choice sets the
 * shaft, the head's diameter and its depth or angle, as a screw of that size needs them. Like the washer
 * (washerSizes.ts) the size is no field of its own: a hole with one's measures shows that size.
 *
 * - Shaft: the clearance hole to ISO 273, medium series.
 * - Counterbore: diameter to DIN 974-1 for socket head cap screws (ISO 4762); depth the head height (the screw's
 *   diameter) plus 0.4 mm, so the head sits a little below the face.
 * - Countersink: diameter to ISO 15065 at 90 degrees, for countersunk screws (ISO 10642, ISO 7046). The norm goes
 *   up to M20.
 */

import { countersinkDepth } from "@/lib/screwHoleGeometry";

export type ScrewHoleSize = "M2" | "M2.5" | "M3" | "M4" | "M5" | "M6" | "M8" | "M10" | "M12" | "M14" | "M16" | "M20" | "M24" | "M30";

type ScrewHoleRow = { diameter: number; shaft: number; counterbore: number; countersink?: number };

const SCREW_HOLE_ROWS: Record<ScrewHoleSize, ScrewHoleRow> = {
  M2: { diameter: 2, shaft: 2.4, counterbore: 4.4, countersink: 4.4 },
  "M2.5": { diameter: 2.5, shaft: 2.9, counterbore: 5.5, countersink: 5.5 },
  M3: { diameter: 3, shaft: 3.4, counterbore: 6.5, countersink: 6.3 },
  M4: { diameter: 4, shaft: 4.5, counterbore: 8, countersink: 9.4 },
  M5: { diameter: 5, shaft: 5.5, counterbore: 10, countersink: 10.4 },
  M6: { diameter: 6, shaft: 6.6, counterbore: 11, countersink: 12.6 },
  M8: { diameter: 8, shaft: 9, counterbore: 15, countersink: 17.3 },
  M10: { diameter: 10, shaft: 11, counterbore: 18, countersink: 20 },
  M12: { diameter: 12, shaft: 13.5, counterbore: 20, countersink: 24 },
  M14: { diameter: 14, shaft: 15.5, counterbore: 24, countersink: 28 },
  M16: { diameter: 16, shaft: 17.5, counterbore: 26, countersink: 32 },
  M20: { diameter: 20, shaft: 22, counterbore: 33, countersink: 40 },
  M24: { diameter: 24, shaft: 26, counterbore: 40 },
  M30: { diameter: 30, shaft: 33, counterbore: 48 },
};

/** How far the head sits below the face in a counterbore. */
const COUNTERBORE_HEAD_ROOM = 0.4;
/** The countersink angle of metric countersunk screws. */
export const METRIC_COUNTERSINK_ANGLE = 90;
/** What a hole is left for the shaft at least, when a size makes it longer. */
const MIN_SHAFT_RUN = 1;

export type ScrewHoleKind = "counterbore" | "countersink" | "doubleCountersink";

export const SCREW_HOLE_SIZE_ORDER = Object.keys(SCREW_HOLE_ROWS) as ScrewHoleSize[];

/** The sizes a hole of this kind offers: a countersink only those ISO 15065 has. */
export function screwHoleSizesFor(kind: ScrewHoleKind): ScrewHoleSize[] {
  return kind === "counterbore" ? SCREW_HOLE_SIZE_ORDER : SCREW_HOLE_SIZE_ORDER.filter((size) => SCREW_HOLE_ROWS[size].countersink !== undefined);
}

export function isScrewHoleSize(value: unknown, kind: ScrewHoleKind): value is ScrewHoleSize {
  return typeof value === "string" && (screwHoleSizesFor(kind) as string[]).includes(value);
}

export type ScrewHoleFields = { width: number; depth: number; height: number; screwHoleShaft: number; screwHoleHeadDepth?: number; screwHoleAngle?: number };

/**
 * A hole of this size as the shape's own fields. Its length stays, unless it is too short for the head: then it
 * grows so the shaft keeps at least a millimetre (a double countersink on both faces).
 */
export function screwHoleFields(kind: ScrewHoleKind, size: ScrewHoleSize, length: number): ScrewHoleFields {
  const row = SCREW_HOLE_ROWS[size];
  if (kind === "counterbore") {
    const headDepth = row.diameter + COUNTERBORE_HEAD_ROOM;
    return {
      width: row.counterbore,
      depth: row.counterbore,
      height: Math.max(length, headDepth + MIN_SHAFT_RUN),
      screwHoleShaft: row.shaft,
      screwHoleHeadDepth: headDepth,
    };
  }
  const head = row.countersink ?? row.counterbore;
  const cone = countersinkDepth(head, row.shaft, METRIC_COUNTERSINK_ANGLE);
  const cones = kind === "doubleCountersink" ? 2 : 1;
  return {
    width: head,
    depth: head,
    height: Math.max(length, cone * cones + MIN_SHAFT_RUN),
    screwHoleShaft: row.shaft,
    screwHoleAngle: METRIC_COUNTERSINK_ANGLE,
  };
}

/** The size whose hole these measures are, or null for a hole of measures of its own. The length does not count. */
export function screwHoleSizeFor(
  kind: ScrewHoleKind,
  hole: { width: number; screwHoleShaft: number; screwHoleHeadDepth: number; screwHoleAngle: number },
): ScrewHoleSize | null {
  const near = (a: number, b: number | undefined) => b !== undefined && Math.abs(a - b) < 0.005;
  return screwHoleSizesFor(kind).find((size) => {
    const fields = screwHoleFields(kind, size, 0);
    return near(hole.width, fields.width)
      && near(hole.screwHoleShaft, fields.screwHoleShaft)
      && (kind === "counterbore" ? near(hole.screwHoleHeadDepth, fields.screwHoleHeadDepth) : near(hole.screwHoleAngle, fields.screwHoleAngle));
  }) ?? null;
}
