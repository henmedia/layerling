/*
 * Washers to ISO 7089, the normal series (Discussion #1052): bore, outer diameter and thickness for
 * each metric screw size. A washer is a round tube of these measures, so it needs no shape of its
 * own: the tube's properties offer the sizes, and a tube that has one's measures shows that size.
 */

export type WasherSize = "M1.6" | "M2" | "M2.5" | "M3" | "M4" | "M5" | "M6" | "M8" | "M10" | "M12" | "M14" | "M16" | "M20" | "M24" | "M30";

export type WasherMeasures = { inner: number; outer: number; thickness: number };

export const WASHER_SIZES: Record<WasherSize, WasherMeasures> = {
  "M1.6": { inner: 1.7, outer: 4, thickness: 0.3 },
  M2: { inner: 2.2, outer: 5, thickness: 0.3 },
  "M2.5": { inner: 2.7, outer: 6, thickness: 0.5 },
  M3: { inner: 3.2, outer: 7, thickness: 0.5 },
  M4: { inner: 4.3, outer: 9, thickness: 0.8 },
  M5: { inner: 5.3, outer: 10, thickness: 1 },
  M6: { inner: 6.4, outer: 12, thickness: 1.6 },
  M8: { inner: 8.4, outer: 16, thickness: 1.6 },
  M10: { inner: 10.5, outer: 20, thickness: 2 },
  M12: { inner: 13, outer: 24, thickness: 2.5 },
  M14: { inner: 15, outer: 28, thickness: 2.5 },
  M16: { inner: 17, outer: 30, thickness: 3 },
  M20: { inner: 21, outer: 37, thickness: 3 },
  M24: { inner: 25, outer: 44, thickness: 4 },
  M30: { inner: 31, outer: 56, thickness: 4 },
};

export const WASHER_SIZE_ORDER = Object.keys(WASHER_SIZES) as WasherSize[];

export function isWasherSize(value: unknown): value is WasherSize {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(WASHER_SIZES, value);
}

/** The size whose washer these measures are, or null for a tube of measures of its own. */
export function washerSizeFor(outer: number, inner: number, thickness: number): WasherSize | null {
  const near = (a: number, b: number) => Math.abs(a - b) < 0.005;
  return WASHER_SIZE_ORDER.find((size) => {
    const washer = WASHER_SIZES[size];
    return near(outer, washer.outer) && near(inner, washer.inner) && near(thickness, washer.thickness);
  }) ?? null;
}

/** A washer as the tube's own fields: the outer diameter both ways, its thickness as height, the wall from the bore. */
export function washerTubeFields(size: WasherSize) {
  const washer = WASHER_SIZES[size];
  return { width: washer.outer, depth: washer.outer, height: washer.thickness, bevel: (washer.outer - washer.inner) / 2 };
}
