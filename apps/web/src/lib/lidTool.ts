import type { CrossSection, ManifoldToplevel, Mat4 } from "manifold-3d";
import { shapeToManifoldSolid, disposeManifold } from "@/lib/editorBooleans";
import { getManifoldRuntime, type ManifoldSolid } from "@/lib/editorMeshCore";
import { numberLocale, t } from "@/lib/i18n";
import { createLocalId } from "@/lib/localIds";
import { splitShapeFromWorldPositions } from "@/lib/modelSplit";
import { sceneShape } from "@/lib/shapeCatalog";
import { canonicalizeShape, isNonSolidShape } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

/**
 * A lid for a body that is open at the top (#1009): a box hollowed with its top open, a pot, a tray. The body is cut just
 * below its rim; the outline of that cut is the body seen from above, the empty part inside it the opening. From these:
 * - plug: a plate as large as the body with a lip below it that goes into the opening, the gap smaller all round;
 * - cap: a plate a wall wider than the body with a rim below it that goes over the outside, the gap larger all round;
 * - both: the lip of the plug and the rim of the cap on one plate, so the body's wall sits in a groove between them (#1062);
 * - flat: only the plate, as large as the body, to glue on or lay on top.
 * With magnets, the lid holds by four round magnets in the corners: a pocket for each in the body's rim and one facing
 * it in the lid's plate. A wall too thin for a pocket gets a post in that corner, from the bottom up to the rim, which
 * the lid's lip then goes round.
 * The lid comes out as a body of its own beside the one it closes, turned over with its plate on the plate, ready to
 * print. Everything is worked out with Manifold, in a frame where z is up (the scene's y).
 */

export type LidType = "plug" | "cap" | "both" | "flat";

/**
 * The kind of lid; the plate's thickness, the gap per side, how deep the lip or rim reaches down and how thick its wall
 * is, in mm. With `magnets`, pockets for four round magnets of that diameter and height, with `magnetGap` of play per
 * side (a little to press them in, more to glue them).
 */
export type LidOptions = {
  type: LidType;
  thickness: number;
  gap: number;
  depth: number;
  wall: number;
  magnets: boolean;
  magnetDiameter: number;
  magnetHeight: number;
  magnetGap: number;
};

export const LID_TYPES: readonly LidType[] = ["plug", "cap", "both", "flat"];
export const LID_DEFAULTS: LidOptions = { type: "plug", thickness: 2, gap: 0.2, depth: 4, wall: 1.6, magnets: false, magnetDiameter: 6, magnetHeight: 2, magnetGap: 0.1 };
export const LID_FITS = [0.1, 0.2, 0.3] as const;
export const MIN_LID_THICKNESS = 0.4;
export const MAX_LID_THICKNESS = 10;
export const MAX_LID_GAP = 1;
export const MIN_LID_DEPTH = 1;
export const MAX_LID_DEPTH = 50;
export const MIN_LID_WALL = 0.4;
export const MAX_LID_WALL = 10;
/** Common round magnets, diameter by height in mm. */
export const LID_MAGNET_SIZES = [{ diameter: 6, height: 2 }, { diameter: 8, height: 3 }, { diameter: 10, height: 3 }] as const;
export const MIN_MAGNET_DIAMETER = 2;
export const MAX_MAGNET_DIAMETER = 25;
export const MIN_MAGNET_HEIGHT = 0.5;
export const MAX_MAGNET_HEIGHT = 10;
export const MAX_MAGNET_GAP = 0.5;
/** How much deeper a pocket is than its magnet, so the magnet never stands proud and the lid closes flat, in mm. */
const MAGNET_DEPTH_EXTRA = 0.2;
/** How much the plate keeps above a pocket in the lid, in mm: about three layers. */
const MAGNET_SKIN = 0.6;
/** How much material is kept round a pocket, and below it in the body, in mm. */
const MAGNET_WALL = 1.2;
/** How many sides a pocket's circle has, in the lid and in the body. */
const MAGNET_SIDES = 48;
/** How far a pocket reaches beyond the face it opens in, so the cut leaves no sheet of no thickness. */
const MAGNET_OVERCUT = 1;
/** How far apart the lid lies from the body it closes, in mm. */
const LID_SPACING = 10;
/** An opening smaller than this, in mm², is no opening: the body is closed at the top. */
const MIN_OPENING_AREA = 1;

function finiteNumber(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** The options with a missing, mistyped or out-of-range value replaced by the nearest allowed one. */
export function normalizeLidOptions(value?: Partial<Record<keyof LidOptions, unknown>> | null): LidOptions {
  const result: LidOptions = { ...LID_DEFAULTS };
  const type = typeof value?.type === "string" ? value.type.trim().toLowerCase() : "";
  if ((LID_TYPES as readonly string[]).includes(type)) result.type = type as LidType;
  const thickness = finiteNumber(value?.thickness);
  if (thickness !== null) result.thickness = clamp(thickness, MIN_LID_THICKNESS, MAX_LID_THICKNESS);
  const gap = finiteNumber(value?.gap);
  if (gap !== null) result.gap = clamp(gap, 0, MAX_LID_GAP);
  const depth = finiteNumber(value?.depth);
  if (depth !== null) result.depth = clamp(depth, MIN_LID_DEPTH, MAX_LID_DEPTH);
  const wall = finiteNumber(value?.wall);
  if (wall !== null) result.wall = clamp(wall, MIN_LID_WALL, MAX_LID_WALL);
  if (value?.magnets === true || value?.magnets === "true") result.magnets = true;
  const magnetDiameter = finiteNumber(value?.magnetDiameter);
  if (magnetDiameter !== null) result.magnetDiameter = clamp(magnetDiameter, MIN_MAGNET_DIAMETER, MAX_MAGNET_DIAMETER);
  const magnetHeight = finiteNumber(value?.magnetHeight);
  if (magnetHeight !== null) result.magnetHeight = clamp(magnetHeight, MIN_MAGNET_HEIGHT, MAX_MAGNET_HEIGHT);
  const magnetGap = finiteNumber(value?.magnetGap);
  if (magnetGap !== null) result.magnetGap = clamp(magnetGap, 0, MAX_MAGNET_GAP);
  return result;
}

/** How deep a magnet's pocket is, in the body and in the lid, in mm. */
export function magnetPocketDepth(options: Pick<LidOptions, "magnetHeight">) {
  return options.magnetHeight + MAGNET_DEPTH_EXTRA;
}

/** The thinnest plate that holds a magnet's pocket with a skin above it, in mm (to a tenth, up). */
export function lidThicknessForMagnets(options: Pick<LidOptions, "magnetHeight">) {
  return Math.ceil((magnetPocketDepth(options) + MAGNET_SKIN) * 10 - 1e-6) / 10;
}

export type LidError =
  | { code: "notClosed" | "notOpen" | "tooSmall" | "tooShallow" | "empty" | "magnetsNoRoom" }
  | { code: "magnetsThinLid"; thickness: number }
  | { code: "kernel"; message?: string };

/** The scene (y up) turned so that y points along z, Manifold's up; a turn about x, so nothing is mirrored. */
const SCENE_TO_UP: Mat4 = [1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1];
const UP_TO_SCENE: Mat4 = [1, 0, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1];

function signedArea(polygon: readonly (readonly [number, number])[]) {
  let area = 0;
  polygon.forEach(([x, y], index) => {
    const [nx, ny] = polygon[(index + 1) % polygon.length];
    area += x * ny - nx * y;
  });
  return area / 2;
}

/** The outline round a cut with every hole in it filled: the body as seen from above at that height. */
function filled(runtime: ManifoldToplevel, section: CrossSection, created: { delete?: () => void }[]) {
  const outer = section.toPolygons().filter((polygon) => signedArea(polygon as [number, number][]) > 0);
  const result = new runtime.CrossSection(outer as [number, number][][], "Positive");
  created.push(result);
  return result;
}

function keep<T extends { delete?: () => void }>(created: { delete?: () => void }[], value: T): T {
  created.push(value);
  return value;
}

type Point = readonly [number, number];

/** The point of the outlines nearest `spot`, and how far it is. */
function nearestOnOutline(polygons: readonly (readonly Point[])[], spot: Point) {
  let best: { point: Point; distance: number } = { point: spot, distance: Infinity };
  for (const polygon of polygons) {
    polygon.forEach((start, index) => {
      const end = polygon[(index + 1) % polygon.length];
      const dx = end[0] - start[0];
      const dy = end[1] - start[1];
      const length = dx * dx + dy * dy;
      const along = length > 1e-18 ? clamp(((spot[0] - start[0]) * dx + (spot[1] - start[1]) * dy) / length, 0, 1) : 0;
      const point: Point = [start[0] + along * dx, start[1] + along * dy];
      const distance = Math.hypot(point[0] - spot[0], point[1] - spot[1]);
      if (distance < best.distance) best = { point, distance };
    });
  }
  return best;
}

/** Whether `spot` lies inside the outlines (even-odd, so a hole in them is outside). */
function insideOutline(polygons: readonly (readonly Point[])[], [x, y]: Point) {
  let inside = false;
  for (const polygon of polygons) {
    polygon.forEach((start, index) => {
      const end = polygon[(index + 1) % polygon.length];
      if ((start[1] > y) !== (end[1] > y) && x < start[0] + ((y - start[1]) * (end[0] - start[0])) / (end[1] - start[1])) inside = !inside;
    });
  }
  return inside;
}

/** The points' convex hull, anticlockwise (Andrew's monotone chain). */
function convexHull(points: readonly Point[]): Point[] {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (sorted.length < 3) return sorted;
  const cross = (o: Point, a: Point, b: Point) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Point[] = [];
  for (const point of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) lower.pop();
    lower.push(point);
  }
  const upper: Point[] = [];
  for (const point of [...sorted].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) upper.pop();
    upper.push(point);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/**
 * The turn (in radians, 0 to a quarter turn) of the smallest rectangle round the points: a side of it lies along a side of
 * their hull. A body standing square has none, so a box turned on the plate gets its magnets in its own corners. Of the
 * turns whose rectangle is hardly larger (a round pot has many), the one nearest none.
 */
function snugTurn(points: readonly Point[]) {
  const hull = convexHull(points);
  const quarter = Math.PI / 2;
  const turns = [0, ...hull.map((start, index) => {
    const end = hull[(index + 1) % hull.length];
    return ((Math.atan2(end[1] - start[1], end[0] - start[0]) % quarter) + quarter) % quarter;
  })];
  const sized = turns.map((turn) => {
    const cos = Math.cos(turn);
    const sin = Math.sin(turn);
    const us = hull.map(([x, y]) => x * cos + y * sin);
    const vs = hull.map(([x, y]) => -x * sin + y * cos);
    return { turn, area: (Math.max(...us) - Math.min(...us)) * (Math.max(...vs) - Math.min(...vs)) };
  });
  const smallest = Math.min(...sized.map(({ area }) => area));
  const offSquare = (turn: number) => Math.min(turn, quarter - turn);
  return sized
    .filter(({ area }) => area <= smallest * 1.01)
    .reduce((best, entry) => (offSquare(entry.turn) < offSquare(best.turn) ? entry : best)).turn;
}

/**
 * Where the magnets go, in the frame where z is up: one in each corner of the body as seen from above, as near the
 * corner as a circle of `reach` fits inside the outline. A corner is the point of the outline nearest a corner of the
 * smallest rectangle round it, and the magnet moves in from it at 45 degrees to that rectangle's sides, so in a box,
 * turned or not, it keeps the same distance to both sides and in a round pot it sits on a diagonal. Each comes with the
 * corner it was found from. Null when four do not fit `apart` from one another.
 */
export function magnetPlaces(polygons: readonly (readonly Point[])[], reach: number, apart: number): { centre: Point; corner: Point }[] | null {
  const points = polygons.flat();
  if (points.length < 3) return null;
  // Worked out with the rectangle square to the axes, then turned back.
  const turn = snugTurn(points);
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  const square = (point: Point): Point => [point[0] * cos + point[1] * sin, -point[0] * sin + point[1] * cos];
  const back = (point: Point): Point => [point[0] * cos - point[1] * sin, point[0] * sin + point[1] * cos];
  const squared = polygons.map((polygon) => polygon.map(square));
  const xs = squared.flat().map(([x]) => x);
  const ys = squared.flat().map(([, y]) => y);
  const min: Point = [Math.min(...xs), Math.min(...ys)];
  const max: Point = [Math.max(...xs), Math.max(...ys)];
  const furthest = Math.hypot(max[0] - min[0], max[1] - min[1]) / 2;
  const places: { centre: Point; corner: Point }[] = [];
  for (const [cornerX, cornerY, signX, signY] of [[min[0], min[1], 1, 1], [max[0], min[1], -1, 1], [max[0], max[1], -1, -1], [min[0], max[1], 1, -1]] as const) {
    const corner = nearestOnOutline(squared, [cornerX, cornerY]).point;
    let found: Point | null = null;
    for (let step = 0; step * 0.05 <= furthest + reach; step += 1) {
      const along = (step * 0.05) / Math.SQRT2;
      const centre: Point = [corner[0] + signX * along, corner[1] + signY * along];
      if (insideOutline(squared, centre) && nearestOnOutline(squared, centre).distance >= reach - 1e-6) {
        found = centre;
        break;
      }
    }
    if (!found) return null;
    places.push({ centre: back(found), corner: back(corner) });
  }
  for (let first = 0; first < places.length; first += 1) {
    for (let second = first + 1; second < places.length; second += 1) {
      if (Math.hypot(places[first].centre[0] - places[second].centre[0], places[first].centre[1] - places[second].centre[1]) < apart) return null;
    }
  }
  return places;
}

/** A pocket for a magnet in the body, in the scene's frame: a hole cylinder of this diameter whose bottom lies at `elevation`. */
export type MagnetPocket = { x: number; z: number; elevation: number; height: number; diameter: number };

export type LidResult = { lid: ManifoldSolid; magnets?: { posts: ManifoldSolid | null; pockets: MagnetPocket[] } } | { error: LidError };

/**
 * The lid for `body` (in the scene's frame, y up), lying turned over beside it: its plate on the workplane at the
 * height of the body's bottom, the lip or rim pointing up. With magnets, also the pockets the body needs, and the posts
 * for the corners where its wall is too thin to hold one (both in the scene's frame, where the body stands).
 */
export function lidForSolid(runtime: ManifoldToplevel, body: ManifoldSolid, given: LidOptions): LidResult {
  const created: { delete?: () => void }[] = [];
  // What is handed back is not deleted with the rest.
  const handed = new Set<unknown>();
  try {
    const options = normalizeLidOptions(given);
    const up = keep(created, body.transform(SCENE_TO_UP));
    const box = up.boundingBox();
    const top = box.max[2];
    const height = top - box.min[2];
    // Just below the rim, so a rim that is a hair uneven still counts as the top.
    const rim = top - Math.min(0.3, height * 0.02);
    let section = keep(created, up.slice(rim));
    const outline = filled(runtime, section, created);
    let opening = keep(created, outline.subtract(section));
    const hasOpening = opening.area() >= MIN_OPENING_AREA;
    if (options.type !== "flat" && !hasOpening) return { error: { code: "notOpen" } };
    if (options.type !== "flat" && options.depth >= height) return { error: { code: "tooShallow" } };

    // The magnets: a pocket in each corner with a wall round it, and a post where the body's wall cannot hold that.
    const pocketRadius = options.magnetDiameter / 2 + options.magnetGap;
    const pocketDepth = magnetPocketDepth(options);
    let magnetCentres: Point[] = [];
    let posts: ManifoldSolid | null = null;
    if (options.magnets) {
      if (options.thickness < lidThicknessForMagnets(options) - 1e-9) return { error: { code: "magnetsThinLid", thickness: lidThicknessForMagnets(options) } };
      if (height < pocketDepth + MAGNET_WALL) return { error: { code: "magnetsNoRoom" } };
      const reach = pocketRadius + MAGNET_WALL;
      const polygons = outline.toPolygons() as Point[][];
      const places = magnetPlaces(polygons, reach, 2 * pocketRadius + MAGNET_WALL);
      if (!places) return { error: { code: "magnetsNoRoom" } };
      magnetCentres = places.map(({ centre }) => centre);
      // Each post is the round wall of its pocket drawn out to its corner, inside the outline.
      const round = places.map(({ centre, corner }) => keep(created, runtime.CrossSection.hull([
        keep(created, keep(created, runtime.CrossSection.circle(reach, MAGNET_SIDES)).translate([centre[0], centre[1]])),
        [[[corner[0], corner[1]]]],
      ])));
      const footprint = keep(created, keep(created, runtime.CrossSection.union(round)).intersect(outline));
      const added = keep(created, footprint.subtract(section));
      if (added.area() > 0.01) {
        section = keep(created, section.add(footprint));
        opening = keep(created, outline.subtract(section));
        const column = keep(created, keep(created, footprint.extrude(height)).translate([0, 0, box.min[2]]));
        const within = keep(created, column.intersect(keep(created, up.hull())));
        if (!within.isEmpty()) posts = keep(created, within.transform(UP_TO_SCENE));
      }
    }

    const prism = (area: CrossSection, low: number, high: number) => keep(created, keep(created, area.extrude(high - low)).translate([0, 0, low]));
    const parts: ManifoldSolid[] = [];
    if (options.type === "flat") {
      parts.push(prism(outline, top, top + options.thickness));
    } else {
      const inner = keep(created, outline.offset(options.gap, "Round", 2, 48));
      const outer = keep(created, outline.offset(options.gap + options.wall, "Round", 2, 48));
      parts.push(prism(options.type === "plug" ? outline : outer, top, top + options.thickness));
      if (options.type !== "cap") {
        const lip = keep(created, opening.offset(-options.gap, "Round", 2, 48));
        if (lip.area() < MIN_OPENING_AREA) return { error: { code: "tooSmall" } };
        const inside = keep(created, opening.offset(-(options.gap + options.wall), "Round", 2, 48));
        const ring = inside.area() >= MIN_OPENING_AREA ? keep(created, lip.subtract(inside)) : lip;
        parts.push(prism(ring, top - options.depth, top));
      }
      if (options.type !== "plug") parts.push(prism(keep(created, outer.subtract(inner)), top - options.depth, top));
    }
    let made = parts.length === 1 ? parts[0] : keep(created, runtime.Manifold.union(parts));
    if (made.isEmpty()) return { error: { code: "empty" } };
    // The lid's pockets face the body's: they open in the plate's underside, where it lies on the rim.
    if (magnetCentres.length) {
      const pockets = magnetCentres.map(([x, y]) => keep(created, keep(created, runtime.Manifold.cylinder(pocketDepth + MAGNET_OVERCUT, pocketRadius, pocketRadius, MAGNET_SIDES)).translate([x, y, top - MAGNET_OVERCUT])));
      made = keep(created, made.subtract(keep(created, runtime.Manifold.union(pockets))));
    }
    // Turned over about the x axis (y and z change sign, nothing is mirrored), then laid beside the body on its bottom.
    const turned = keep(created, made.transform([1, 0, 0, 0, 0, -1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1]));
    const lidBox = turned.boundingBox();
    const shift: [number, number, number] = [
      box.max[0] + LID_SPACING - lidBox.min[0],
      (box.min[1] + box.max[1]) / 2 - (lidBox.min[1] + lidBox.max[1]) / 2,
      box.min[2] - lidBox.min[2],
    ];
    const placed = keep(created, turned.translate(shift));
    const lid = placed.transform(UP_TO_SCENE);
    handed.add(lid);
    if (!options.magnets) return { lid };
    handed.add(posts);
    // Back in the scene's frame: up is y, and the frame's y is the scene's z turned round.
    const pockets = magnetCentres.map(([x, y]): MagnetPocket => ({
      x,
      z: -y,
      elevation: top - pocketDepth,
      height: pocketDepth + MAGNET_OVERCUT,
      diameter: 2 * pocketRadius,
    }));
    return { lid, magnets: { posts, pockets } };
  } catch (error) {
    return { error: { code: "kernel", message: error instanceof Error ? error.message : String(error ?? "") } };
  } finally {
    Array.from(new Set(created)).forEach((value) => {
      if (!handed.has(value)) value.delete?.();
    });
  }
}

/** The message for why the lid could not be made. */
export function lidErrorMessage(error: LidError) {
  switch (error.code) {
    case "notClosed":
      return t("lid.error.notClosed");
    case "notOpen":
      return t("lid.error.notOpen");
    case "tooSmall":
      return t("lid.error.tooSmall");
    case "tooShallow":
      return t("lid.error.tooShallow");
    case "empty":
      return t("lid.error.empty");
    case "magnetsNoRoom":
      return t("lid.error.magnetsNoRoom");
    case "magnetsThinLid":
      return t("lid.error.magnetsThinLid", { thickness: error.thickness.toLocaleString(numberLocale()) });
    default:
      return error.message ? t("lid.error.kernel", { message: error.message }) : t("lid.error.kernelUnknown");
  }
}

function positionsOf(mesh: ReturnType<ManifoldSolid["getMesh"]>) {
  const positions: number[] = [];
  for (let index = 0; index < mesh.triVerts.length; index += 1) {
    const offset = mesh.triVerts[index] * mesh.numProp;
    positions.push(mesh.vertProperties[offset], mesh.vertProperties[offset + 1], mesh.vertProperties[offset + 2]);
  }
  return positions;
}

/** With magnets, what the body needs as well: the posts for its corners (a mesh, if any) and the pockets (hole cylinders). */
export type LidShapeMagnets = { posts: WorkplaneShape | null; pockets: WorkplaneShape[] };

export type LidShapeResult = { lid: WorkplaneShape; magnets?: LidShapeMagnets } | { lid: null; error: string };

/**
 * The lid for the selected bodies: the solids joined and the holes among them cut away, then the lid made for what is
 * left. It is a mesh named after the first body, in its colour. With magnets, the posts and pockets for the body come
 * with it, standing where they go: grouped with the bodies, they cut the pockets into them.
 */
export async function lidForShapes(targets: readonly WorkplaneShape[], given: LidOptions): Promise<LidShapeResult> {
  const solids = targets.filter((shape) => !shape.hole && !isNonSolidShape(shape));
  const holes = targets.filter((shape) => shape.hole);
  if (!solids.length) return { lid: null, error: t("lid.error.needsBody") };
  const created: ManifoldSolid[] = [];
  try {
    const runtime = await getManifoldRuntime();
    const closed = (part: ManifoldSolid | null): part is ManifoldSolid => Boolean(part && part.status() === "NoError" && part.numTri() > 0);
    const builtParts = solids.map((shape) => shapeToManifoldSolid(runtime, shape, created));
    const builtCutters = holes.map((shape) => shapeToManifoldSolid(runtime, shape, created));
    const parts = builtParts.filter(closed);
    const cutters = builtCutters.filter(closed);
    if (parts.length !== builtParts.length || cutters.length !== builtCutters.length) {
      return { lid: null, error: lidErrorMessage({ code: "notClosed" }) };
    }
    let body = parts.length === 1 ? parts[0] : runtime.Manifold.union(parts);
    created.push(body);
    if (cutters.length) {
      body = body.subtract(runtime.Manifold.union(cutters));
      created.push(body);
    }
    const result = lidForSolid(runtime, body, given);
    if ("error" in result) return { lid: null, error: lidErrorMessage(result.error) };
    created.push(result.lid);
    if (result.magnets?.posts) created.push(result.magnets.posts);
    const source = solids[0];
    const shape = splitShapeFromWorldPositions(source, positionsOf(result.lid.getMesh()), createLocalId(`${source.id}-lid`), t("lid.name", { name: source.name }));
    if (!shape) return { lid: null, error: lidErrorMessage({ code: "empty" }) };
    const lid = canonicalizeShape({ ...shape, hidden: false });
    if (!result.magnets) return { lid };
    const posts = result.magnets.posts
      ? splitShapeFromWorldPositions(source, positionsOf(result.magnets.posts.getMesh()), createLocalId(`${source.id}-magnet-posts`), t("lid.magnetPosts", { name: source.name }))
      : null;
    const pockets = result.magnets.pockets.map((pocket, index) => sceneShape({
      id: createLocalId(`${source.id}-magnet`),
      name: t("lid.magnetPocket", { number: index + 1 }),
      kind: "cylinder",
      color: source.color,
      hole: true,
      x: pocket.x,
      z: pocket.z,
      elevation: pocket.elevation,
      width: pocket.diameter,
      depth: pocket.diameter,
      height: pocket.height,
      sides: MAGNET_SIDES,
    }));
    return { lid, magnets: { posts: posts ? canonicalizeShape({ ...posts, hidden: false }) : null, pockets } };
  } catch (error) {
    return { lid: null, error: lidErrorMessage({ code: "kernel", message: error instanceof Error ? error.message : String(error ?? "") }) };
  } finally {
    Array.from(new Set(created)).forEach(disposeManifold);
  }
}
