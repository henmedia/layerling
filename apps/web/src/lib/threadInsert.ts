/**
 * Threaded (heat-set) inserts: the sizes the tool offers and the check that a hole for one has enough material
 * around it (PR #1828 by @markopo1982).
 *
 * `d3` is the diameter of the hole, `L` the length of the insert and so the depth of the hole, `W` the wall the insert
 * wants round it, measured from the hole's edge.
 */
export type ThreadInsertSpec = {
  /** What the list shows; also the id of the size. */
  name: string;
  d3: number;
  L: number;
  W: number;
};

export const CUSTOM_THREAD_INSERT = "custom";

export const THREAD_INSERT_SIZES: readonly ThreadInsertSpec[] = [
  { name: "M2", d3: 3.2, L: 4, W: 1.3 },
  { name: "M2.5", d3: 4, L: 5.7, W: 1.6 },
  { name: "M3", d3: 4, L: 5.7, W: 1.6 },
  { name: "M4", d3: 5.6, L: 8.1, W: 2.1 },
  { name: "M5", d3: 6.4, L: 9.5, W: 2.6 },
  { name: "M6", d3: 8, L: 12.7, W: 3.3 },
  { name: "M8", d3: 9.6, L: 12.7, W: 4.5 },
  { name: "M3 short", d3: 4, L: 4, W: 1.6 },
  { name: "M4 short", d3: 5.6, L: 4, W: 2.1 },
  { name: "M5 short", d3: 6.4, L: 5.8, W: 2.6 },
  { name: "1/4-20", d3: 8, L: 12.7, W: 3.3 },
];

export const THREAD_INSERT_DEFAULT = "M3";
export const THREAD_INSERT_MIN_SIZE = 0.1;

/** A size of the user's own: the wall follows the diameter, rounded up to 0.1 mm. */
export function customThreadInsert(d3: number, L: number): ThreadInsertSpec {
  return { name: CUSTOM_THREAD_INSERT, d3, L, W: Math.ceil((d3 / 2.45) * 10 - 1e-9) / 10 };
}

/** The spec for the chosen entry of the list, or the typed numbers for the custom one; null while they are no numbers. */
export function threadInsertSpec(preset: string, customDiameter: string, customLength: string): ThreadInsertSpec | null {
  if (preset === CUSTOM_THREAD_INSERT) {
    const spec = customThreadInsert(Number(customDiameter.replace(",", ".")), Number(customLength.replace(",", ".")));
    return Number.isFinite(spec.d3) && Number.isFinite(spec.L) && spec.d3 >= THREAD_INSERT_MIN_SIZE && spec.L >= THREAD_INSERT_MIN_SIZE ? spec : null;
  }
  return THREAD_INSERT_SIZES.find((size) => size.name === preset) ?? null;
}

export type ThreadInsertMeasure = {
  /** From the middle of the hole to the nearest edge of the part. */
  edgeDistance: number;
  /** The material there is in the direction of the hole. */
  materialDepth: number;
};

export type ThreadInsertResult = {
  allowed: boolean;
  /** The numbers were not usable: the hole stays blocked. */
  invalid: boolean;
  /** The wall beside the hole is thinner than the insert wants. */
  wallShort: boolean;
  /** The part is not deep enough for the insert. */
  depthShort: boolean;
  /** The wall beside the hole as it is, and as it must be. */
  wall: number;
  requiredWall: number;
  /** The depth as it is, and as it must be. */
  materialDepth: number;
  requiredDepth: number;
  /** The smallest width of part round the hole that is wide enough. */
  minimumOuterDiameter: number;
  edgeDistance: number;
};

const EPSILON = 1e-6;

/** Whether a hole for the insert may be made there: wall beside it and depth behind it both have to reach. */
export function checkThreadInsert(spec: ThreadInsertSpec, measure: ThreadInsertMeasure): ThreadInsertResult {
  const requiredWall = spec.W;
  const wall = measure.edgeDistance - spec.d3 / 2;
  const base = {
    wall,
    requiredWall,
    materialDepth: measure.materialDepth,
    requiredDepth: spec.L,
    minimumOuterDiameter: spec.d3 + 2 * spec.W,
    edgeDistance: measure.edgeDistance,
  };
  const numbers = [spec.d3, spec.L, spec.W, measure.edgeDistance, measure.materialDepth];
  if (numbers.some((value) => !Number.isFinite(value)) || spec.d3 <= 0 || spec.L <= 0 || spec.W <= 0 || measure.edgeDistance < 0 || measure.materialDepth < 0) {
    return { ...base, allowed: false, invalid: true, wallShort: false, depthShort: false };
  }
  const wallShort = wall + EPSILON < spec.W;
  const depthShort = measure.materialDepth + EPSILON < spec.L;
  return { ...base, allowed: !wallShort && !depthShort, invalid: false, wallShort, depthShort };
}
