import type { SketchProfile } from "@/types/layerling";

/**
 * The cookie cutter (#982): the outline of a sketch as the wall of a cutter and a flat rim round its foot. Both are the sketch
 * body's own fill modes (#197), so the parts stay editable one by one: the wall is a line outside the silhouette (the outline
 * without its holes), the rim a wider line outside it, low, so the cutter stands on it and the thumb has something to press.
 * The wall's top runs in to a cutting edge, and the outline is mirrored: the cutter is printed on its rim and turned over to
 * cut, so a text or a logo would come out the wrong way round otherwise.
 */

/**
 * The wall's thickness, how high the cutter stands, how far the rim reaches beyond the wall and how high it is, and how wide
 * the cutting edge on top of the wall is (0 for a flat top), in mm; whether the outline is mirrored left to right.
 */
export type CookieCutterOptions = { wall: number; height: number; rim: number; rimHeight: number; edge: number; mirror: boolean };

type CookieCutterSize = Exclude<keyof CookieCutterOptions, "mirror">;

export const COOKIE_CUTTER_DEFAULTS: CookieCutterOptions = { wall: 1.2, height: 15, rim: 4, rimHeight: 2, edge: 0.4, mirror: true };

const LIMITS: Record<CookieCutterSize, readonly [number, number]> = {
  wall: [0.4, 10],
  height: [2, 100],
  rim: [0.5, 30],
  rimHeight: [0.4, 20],
  edge: [0, 10],
};

/** The options with a missing, mistyped or out-of-range value replaced by the nearest allowed one. */
export function normalizeCookieCutterOptions(value?: Partial<Record<keyof CookieCutterOptions, unknown>> | null): CookieCutterOptions {
  const result = { ...COOKIE_CUTTER_DEFAULTS };
  for (const key of Object.keys(LIMITS) as CookieCutterSize[]) {
    const number = Number(value?.[key]);
    if (value?.[key] === undefined || value?.[key] === null || value?.[key] === "" || !Number.isFinite(number)) continue;
    const [min, max] = LIMITS[key];
    result[key] = Math.min(max, Math.max(min, number));
  }
  if (typeof value?.mirror === "boolean") result.mirror = value.mirror;
  // The rim cannot be higher than the cutter itself: it would then be the cutter.
  result.rimHeight = Math.min(result.rimHeight, result.height);
  // An edge as wide as the wall, or wider, is the flat top.
  if (result.edge >= result.wall) result.edge = 0;
  return result;
}

/**
 * The outline a cutter is made of: the sketch's points and segments, without a fill mode, key ring or face tool of its own;
 * mirrored left to right when asked, the curves' handles with their points.
 */
function outlineOf(profile: SketchProfile, mirror: boolean): SketchProfile {
  const flip = (place: { x: number; z: number }) => (mirror ? { x: -place.x || 0, z: place.z } : { ...place });
  return {
    points: profile.points.map((point) => ({
      ...point,
      ...flip(point),
      ...(point.handleIn ? { handleIn: flip(point.handleIn) } : {}),
      ...(point.handleOut ? { handleOut: flip(point.handleOut) } : {}),
    })),
    segments: profile.segments.map((segment) => ({ ...segment })),
  };
}

/**
 * The two sketches a cutter is built from: the wall - a line `wall` mm wide outside the silhouette, with its cutting edge -
 * and the rim, a line `wall + rim` mm wide, which holds the wall's foot as well. Round corners, so a thin wall does not run
 * to a point.
 */
export function cookieCutterProfiles(source: SketchProfile, options: CookieCutterOptions): { wall: SketchProfile; rim: SketchProfile } {
  const outline = outlineOf(source, options.mirror);
  const line = (width: number, edge?: number): SketchProfile => ({
    ...outline,
    points: outline.points.map((point) => ({ ...point })),
    segments: outline.segments.map((segment) => ({ ...segment })),
    silhouette: true,
    stroke: { width, align: "outside", join: "round", cap: "flat", ...(edge ? { edge } : {}) },
  });
  return { wall: line(options.wall, options.edge), rim: line(options.wall + options.rim) };
}

/** Closer than this, in mm, two points of a cut outline are one: a smooth surface cut by the plane has no use for more. */
const MIN_POINT_GAP = 0.05;
/** An outline of more points than this is refused: the kernel could not build a wall along it in time. */
export const MAX_COOKIE_CUTTER_POINTS = 6000;

type OutlineLoop = { points: ReadonlyArray<{ u: number; v: number }>; closed: boolean };

/**
 * What a body stands on - the closed outlines the workplane cuts through it, seen from above (u across, v towards the front, as
 * in sketch mode) - as a sketch round the middle of its box, and that middle in the world. Null when nothing closed is left.
 * Throws when the outline has too many points.
 */
export function outlineFromLoops(loops: readonly OutlineLoop[]): { profile: SketchProfile; x: number; z: number } | null {
  const rings = loops
    .filter((loop) => loop.closed)
    .map((loop) => loop.points.filter((point, index, all) => index === 0 || Math.hypot(point.u - all[index - 1].u, point.v - all[index - 1].v) >= MIN_POINT_GAP))
    // The closing edge: the last point may lie on the first.
    .map((ring) => (ring.length > 1 && Math.hypot(ring[0].u - ring[ring.length - 1].u, ring[0].v - ring[ring.length - 1].v) < MIN_POINT_GAP ? ring.slice(0, -1) : ring))
    .filter((ring) => ring.length >= 3);
  if (!rings.length) return null;
  const total = rings.reduce((sum, ring) => sum + ring.length, 0);
  if (total > MAX_COOKIE_CUTTER_POINTS) throw new Error("cookie-cutter-outline-too-complex");
  const all = rings.flat();
  const us = all.map((point) => point.u);
  const vs = all.map((point) => point.v);
  const x = (Math.min(...us) + Math.max(...us)) / 2;
  const z = (Math.min(...vs) + Math.max(...vs)) / 2;
  const round = (value: number) => Math.round(value * 1e5) / 1e5;
  const profile: SketchProfile = { points: [], segments: [] };
  rings.forEach((ring, ringIndex) => {
    const ids = ring.map((point, index) => {
      const id = `p${ringIndex}-${index}`;
      profile.points.push({ id, x: round(point.u - x), z: round(point.v - z), mode: "corner" });
      return id;
    });
    ids.forEach((id, index) => profile.segments.push({ id: `s${ringIndex}-${index}`, startId: id, endId: ids[(index + 1) % ids.length], kind: "line" }));
  });
  return { profile, x, z };
}
