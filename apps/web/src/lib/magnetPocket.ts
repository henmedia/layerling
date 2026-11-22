import { numberLocale, t } from "@/lib/i18n";

/*
 * Pockets for round magnets (an idea from the Layerling user group): figure painters set small magnets into the joints
 * of a multi-part figure instead of gluing it, so it comes apart for painting and shipping. Each magnet sits in a round
 * pocket a little deeper than the magnet, and below it a narrower well takes the glue that would otherwise push the
 * magnet back out; being narrower, it also keeps the magnet from sliding on into a hollow print. Cut out of a part, the
 * pocket and its well are an inverted top hat.
 *
 * Two tools make them: the Magnet pocket tool on a spot of a face (with the same pocket in the part that meets it there,
 * see magnetPocketGeometry.ts), and the Split tool's magnets connector, one pocket either side of the cut
 * (splitConnectors.ts, manifoldSplit.ts). What is worked out here is plain arithmetic, the same on the page and in the
 * worker: the sizes offered, the limits and the pocket's measures.
 */

/** The magnet, in mm: its `diameter` and `height`, the `gap` round it per side, and whether the pocket has a glue `well`. */
export type MagnetPocketSpec = {
  diameter: number;
  height: number;
  gap: number;
  well: boolean;
};

/** Common round magnets, diameter by height in mm, from those in figures' joints to those in boxes and lids. */
export const MAGNET_POCKET_SIZES: ReadonlyArray<{ diameter: number; height: number }> = [
  { diameter: 2, height: 1 },
  { diameter: 3, height: 1 },
  { diameter: 3, height: 2 },
  { diameter: 4, height: 2 },
  { diameter: 5, height: 1 },
  { diameter: 5, height: 2 },
  { diameter: 5, height: 3 },
  { diameter: 6, height: 2 },
  { diameter: 6, height: 3 },
  { diameter: 8, height: 2 },
  { diameter: 8, height: 3 },
  { diameter: 10, height: 2 },
  { diameter: 10, height: 3 },
  { diameter: 12, height: 3 },
];

/** The list's own entry for a size typed in. */
export const CUSTOM_MAGNET_SIZE = "custom";

/** 6 × 2 mm as the lid's magnets start (lidTool.ts), 0.1 mm round it, and a glue well. */
export const MAGNET_POCKET_DEFAULTS: MagnetPocketSpec = { diameter: 6, height: 2, gap: 0.1, well: true };

export const MIN_MAGNET_POCKET_DIAMETER = 1;
export const MAX_MAGNET_POCKET_DIAMETER = 30;
export const MIN_MAGNET_POCKET_HEIGHT = 0.5;
export const MAX_MAGNET_POCKET_HEIGHT = 10;
export const MAX_MAGNET_POCKET_GAP = 0.5;

/**
 * How much deeper a pocket is than its magnet, in mm: the magnet sits just below the face, so two magnets meeting
 * across a joint never hold the parts apart, and a first layer that came out a little thick does not either.
 */
export const MAGNET_POCKET_EXTRA_DEPTH = 0.2;
/** The glue well: this share of the magnet's diameter across, at least MAGNET_WELL_MIN, and this deep, in mm. */
const MAGNET_WELL_SHARE = 0.5;
const MAGNET_WELL_MIN = 1;
export const MAGNET_WELL_DEPTH = 1;
/** The ledge the magnet rests on round the well, at the least, in mm. */
const MAGNET_WELL_LEDGE = 0.5;
/** How much wall a pocket wants beside it, from its edge, in mm: two lines of a 0.4 mm nozzle and a little more. */
export const MAGNET_POCKET_WALL = 1;

export type MagnetPocketMeasures = {
  /** The pocket: the magnet's diameter with the gap on each side, and its height and MAGNET_POCKET_EXTRA_DEPTH deep. */
  pocketDiameter: number;
  pocketDepth: number;
  /** The glue well below it, 0 deep without one. */
  wellDiameter: number;
  wellDepth: number;
  /** Pocket and well together, from the face. */
  totalDepth: number;
  /** The wall the pocket wants beside it. */
  wall: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

const tenth = (value: number) => Math.round(value * 10) / 10;

/** The spec with every value held within its limits; a value that is no number takes the default's. */
export function normalizeMagnetPocketSpec(value?: Partial<Record<keyof MagnetPocketSpec, unknown>> | null): MagnetPocketSpec {
  const number = (raw: unknown, fallback: number) => {
    const parsed = typeof raw === "string" ? Number(raw.replace(",", ".")) : typeof raw === "number" ? raw : NaN;
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  return {
    diameter: clamp(number(value?.diameter, MAGNET_POCKET_DEFAULTS.diameter), MIN_MAGNET_POCKET_DIAMETER, MAX_MAGNET_POCKET_DIAMETER),
    height: clamp(number(value?.height, MAGNET_POCKET_DEFAULTS.height), MIN_MAGNET_POCKET_HEIGHT, MAX_MAGNET_POCKET_HEIGHT),
    gap: clamp(number(value?.gap, MAGNET_POCKET_DEFAULTS.gap), 0, MAX_MAGNET_POCKET_GAP),
    well: typeof value?.well === "boolean" ? value.well : MAGNET_POCKET_DEFAULTS.well,
  };
}

/** The pocket's measures for a magnet: see MagnetPocketMeasures. */
export function magnetPocketMeasures(spec: MagnetPocketSpec): MagnetPocketMeasures {
  const pocketDiameter = spec.diameter + 2 * spec.gap;
  const pocketDepth = spec.height + MAGNET_POCKET_EXTRA_DEPTH;
  // Narrower than the magnet by a ledge each side, so the magnet rests on it and cannot go on into the well.
  const widest = pocketDiameter - 2 * MAGNET_WELL_LEDGE;
  const wellDiameter = spec.well && widest >= MAGNET_WELL_MIN * 0.75 ? Math.min(widest, Math.max(MAGNET_WELL_MIN, tenth(spec.diameter * MAGNET_WELL_SHARE))) : 0;
  const wellDepth = wellDiameter > 0 ? MAGNET_WELL_DEPTH : 0;
  return { pocketDiameter, pocketDepth, wellDiameter, wellDepth, totalDepth: pocketDepth + wellDepth, wall: MAGNET_POCKET_WALL };
}

/** How a magnet's size is named: "6 × 2". */
export function magnetSizeName(spec: Pick<MagnetPocketSpec, "diameter" | "height">) {
  const short = (value: number) => String(Math.round(value * 100) / 100);
  return `${short(spec.diameter)} × ${short(spec.height)}`;
}

/** The id of a listed size ("6x2"), or CUSTOM_MAGNET_SIZE for any other. */
export function magnetSizeId(spec: Pick<MagnetPocketSpec, "diameter" | "height">) {
  const listed = MAGNET_POCKET_SIZES.find((size) => Math.abs(size.diameter - spec.diameter) < 1e-6 && Math.abs(size.height - spec.height) < 1e-6);
  return listed ? `${listed.diameter}x${listed.height}` : CUSTOM_MAGNET_SIZE;
}

/** The listed size for its id ("6x2"), or null. */
export function magnetSizeFromId(id: string) {
  return MAGNET_POCKET_SIZES.find((size) => `${size.diameter}x${size.height}` === id) ?? null;
}

/** What the pocket comes to, in a line for the panels: "Pocket Ø6.2 × 2.2 mm, glue well Ø3 × 1 mm". */
export function magnetPocketSummary(measures: MagnetPocketMeasures) {
  const mm = (value: number) => (Math.round(value * 100) / 100).toLocaleString(numberLocale());
  return measures.wellDepth > 0
    ? t("magnetPocket.summaryWell", { diameter: mm(measures.pocketDiameter), depth: mm(measures.pocketDepth), well: mm(measures.wellDiameter), wellDepth: mm(measures.wellDepth) })
    : t("magnetPocket.summary", { diameter: mm(measures.pocketDiameter), depth: mm(measures.pocketDepth) });
}
