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
 *
 * Inch screws (Discussion #1534), countersink only: the numbered sizes #2 to #14 of ASME B18.6.1 (wood screws; machine
 * screws of the same number to B18.6.3 have the same body and head), which are also the gauges Australian wood screws are
 * sold by (AS 3566: a 6-gauge is a #6). Their heads are 82 degrees. The head diameter is the largest the standard allows
 * (a sharp edge), so the head sits flush; the shaft is the body diameter plus the same room ISO 273 medium gives a metric
 * screw of that diameter (0.4 mm up to 4 mm, 0.5 mm up to 5.5 mm, 0.6 mm above).
 */

import { countersinkDepth } from "@/lib/screwHoleGeometry";

export type MetricScrewHoleSize = "M2" | "M2.5" | "M3" | "M4" | "M5" | "M6" | "M8" | "M10" | "M12" | "M14" | "M16" | "M20" | "M24" | "M30";
export type InchScrewHoleSize = "#2" | "#3" | "#4" | "#5" | "#6" | "#7" | "#8" | "#9" | "#10" | "#12" | "#14";
export type ScrewHoleSize = MetricScrewHoleSize | InchScrewHoleSize;

type ScrewHoleRow = { diameter: number; shaft: number; counterbore: number; countersink?: number };

const SCREW_HOLE_ROWS: Record<MetricScrewHoleSize, ScrewHoleRow> = {
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

/** Inch body and largest head diameter to ASME B18.6.1, in inches. */
const INCH_SCREW_ROWS: Record<InchScrewHoleSize, { body: number; head: number }> = {
  "#2": { body: 0.086, head: 0.172 },
  "#3": { body: 0.099, head: 0.199 },
  "#4": { body: 0.112, head: 0.225 },
  "#5": { body: 0.125, head: 0.252 },
  "#6": { body: 0.138, head: 0.279 },
  "#7": { body: 0.151, head: 0.305 },
  "#8": { body: 0.164, head: 0.332 },
  "#9": { body: 0.177, head: 0.358 },
  "#10": { body: 0.19, head: 0.385 },
  "#12": { body: 0.216, head: 0.438 },
  "#14": { body: 0.242, head: 0.507 },
};

/** The countersink angle of inch countersunk screws. */
export const INCH_COUNTERSINK_ANGLE = 82;

const MILLIMETERS_PER_INCH = 25.4;
const roundTo = (value: number, step: number) => Math.round(value / step) * step;

/** An inch screw's countersink in millimetres: the head to a hundredth, the clearance hole to a tenth. */
function inchCountersink(size: InchScrewHoleSize) {
  const row = INCH_SCREW_ROWS[size];
  const body = row.body * MILLIMETERS_PER_INCH;
  const room = body <= 4 ? 0.4 : body <= 5.5 ? 0.5 : 0.6;
  return { head: Math.round(row.head * MILLIMETERS_PER_INCH * 100) / 100, shaft: Math.round(roundTo(body + room, 0.1) * 10) / 10 };
}

export const isInchScrewHoleSize = (size: ScrewHoleSize): size is InchScrewHoleSize => size.startsWith("#");

/** How far the head sits below the face in a counterbore. */
const COUNTERBORE_HEAD_ROOM = 0.4;
/** The countersink angle of metric countersunk screws. */
export const METRIC_COUNTERSINK_ANGLE = 90;
/** What a hole is left for the shaft at least, when a size makes it longer. */
const MIN_SHAFT_RUN = 1;

export type ScrewHoleKind = "counterbore" | "countersink" | "doubleCountersink";

/** The metric sizes, smallest first. */
export const SCREW_HOLE_SIZE_ORDER = Object.keys(SCREW_HOLE_ROWS) as MetricScrewHoleSize[];
/** The inch sizes, smallest first: countersinks only. */
export const INCH_SCREW_HOLE_SIZES = Object.keys(INCH_SCREW_ROWS) as InchScrewHoleSize[];

/** The sizes a hole of this kind offers: a counterbore the metric ones, a countersink those ISO 15065 has and the inch ones. */
export function screwHoleSizesFor(kind: ScrewHoleKind): ScrewHoleSize[] {
  return kind === "counterbore"
    ? SCREW_HOLE_SIZE_ORDER
    : [...SCREW_HOLE_SIZE_ORDER.filter((size) => SCREW_HOLE_ROWS[size].countersink !== undefined), ...INCH_SCREW_HOLE_SIZES];
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
  const cones = kind === "doubleCountersink" ? 2 : 1;
  if (isInchScrewHoleSize(size)) {
    const { head, shaft } = inchCountersink(size);
    return {
      width: head,
      depth: head,
      height: Math.max(length, countersinkDepth(head, shaft, INCH_COUNTERSINK_ANGLE) * cones + MIN_SHAFT_RUN),
      screwHoleShaft: shaft,
      screwHoleAngle: INCH_COUNTERSINK_ANGLE,
    };
  }
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

/*
 * Finishing washers (rosettes, Discussion #1131) for countersunk screws: no norm sets their measures, so they follow
 * the countersink of the same size. The bore is the clearance hole, the seat the countersink at 90 degrees, the ring
 * under the seat a quarter of the screw's diameter (at least 1.5 mm), and the rim reaches a third of the diameter (at
 * least 2 mm) past the seat. An M3 comes out 10.3 x 3 mm and an M6 16.6 x 4.5 mm, as the washers sold for them.
 */

export type FinishingWasherFields = { width: number; depth: number; height: number; screwHoleShaft: number; screwHoleHeadDepth: number; screwHoleAngle: number };

const roundToHundredth = (value: number) => Math.round(value * 100) / 100;

/** The sizes a finishing washer offers: the metric ones with a countersink (its seat is a 90 degree cone). */
export function finishingWasherSizes(): MetricScrewHoleSize[] {
  return SCREW_HOLE_SIZE_ORDER.filter((size) => SCREW_HOLE_ROWS[size].countersink !== undefined);
}

export function isFinishingWasherSize(value: unknown): value is MetricScrewHoleSize {
  return typeof value === "string" && (finishingWasherSizes() as string[]).includes(value);
}

/** A finishing washer of this size as the shape's own fields. */
export function finishingWasherFields(size: MetricScrewHoleSize): FinishingWasherFields {
  const row = SCREW_HOLE_ROWS[size];
  const seat = row.countersink ?? row.counterbore;
  const seatDepth = roundToHundredth(countersinkDepth(seat, row.shaft, METRIC_COUNTERSINK_ANGLE));
  const outer = roundToHundredth(seat + 2 * Math.max(2, row.diameter / 3));
  return {
    width: outer,
    depth: outer,
    height: roundToHundredth(seatDepth + Math.max(1.5, row.diameter / 4)),
    screwHoleShaft: row.shaft,
    screwHoleHeadDepth: seatDepth,
    screwHoleAngle: METRIC_COUNTERSINK_ANGLE,
  };
}

/** The size whose finishing washer these measures are, or null for one of measures of its own. */
export function finishingWasherSizeFor(washer: { width: number; height: number; screwHoleShaft: number; screwHoleHeadDepth: number; screwHoleAngle: number }): MetricScrewHoleSize | null {
  const near = (a: number, b: number) => Math.abs(a - b) < 0.005;
  return finishingWasherSizes().find((size) => {
    const fields = finishingWasherFields(size);
    return near(washer.width, fields.width) && near(washer.height, fields.height) && near(washer.screwHoleShaft, fields.screwHoleShaft)
      && near(washer.screwHoleHeadDepth, fields.screwHoleHeadDepth) && near(washer.screwHoleAngle, fields.screwHoleAngle);
  }) ?? null;
}
