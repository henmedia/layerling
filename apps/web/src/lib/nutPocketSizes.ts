/*
 * Pockets for hex nuts (Stephan Kühne's mail, 31.10.2026): a hexagon prism offers the nut of each metric screw size,
 * and one choice sets the width across flats and the height of an ISO 4032 nut plus a little room for printing, so
 * the prism used as a hole takes the nut. Like the washer (washerSizes.ts) the size is no field of its own: a
 * hexagon with one's measures shows that size.
 *
 * The hexagon stands with two flats facing the sides: its width is the width across flats, its length the width
 * across corners.
 */

export type NutPocketSize = "M2" | "M2.5" | "M3" | "M4" | "M5" | "M6" | "M8" | "M10" | "M12" | "M14" | "M16" | "M20" | "M24" | "M30";

/** Width across flats and height of the nut, ISO 4032. */
const NUTS: Record<NutPocketSize, { acrossFlats: number; height: number }> = {
  M2: { acrossFlats: 4, height: 1.6 },
  "M2.5": { acrossFlats: 5, height: 2 },
  M3: { acrossFlats: 5.5, height: 2.4 },
  M4: { acrossFlats: 7, height: 3.2 },
  M5: { acrossFlats: 8, height: 4.7 },
  M6: { acrossFlats: 10, height: 5.2 },
  M8: { acrossFlats: 13, height: 6.8 },
  M10: { acrossFlats: 16, height: 8.4 },
  M12: { acrossFlats: 18, height: 10.8 },
  M14: { acrossFlats: 21, height: 12.8 },
  M16: { acrossFlats: 24, height: 14.8 },
  M20: { acrossFlats: 30, height: 18 },
  M24: { acrossFlats: 36, height: 21.5 },
  M30: { acrossFlats: 46, height: 25.6 },
};

/** Room for printing, across flats and in height: the nut goes in by hand and does not turn. */
export const NUT_POCKET_ROOM = 0.4;

export const NUT_POCKET_SIZE_ORDER = Object.keys(NUTS) as NutPocketSize[];

export function isNutPocketSize(value: unknown): value is NutPocketSize {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(NUTS, value);
}

/** The pocket as the hexagon's own fields: across flats as width, across corners as length, the nut's height. */
export function nutPocketFields(size: NutPocketSize) {
  const nut = NUTS[size];
  const width = nut.acrossFlats + NUT_POCKET_ROOM;
  return { width, depth: width / Math.cos(Math.PI / 6), height: nut.height + NUT_POCKET_ROOM };
}

/** The size whose pocket this hexagon is, or null. Only a six-sided prism can be one. */
export function nutPocketSizeFor(sides: number, width: number, depth: number, height: number): NutPocketSize | null {
  if (Math.round(sides) !== 6) return null;
  const near = (a: number, b: number) => Math.abs(a - b) < 0.005;
  return NUT_POCKET_SIZE_ORDER.find((size) => {
    const pocket = nutPocketFields(size);
    return near(width, pocket.width) && near(depth, pocket.depth) && near(height, pocket.height);
  }) ?? null;
}
