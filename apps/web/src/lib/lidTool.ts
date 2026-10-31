import type { CrossSection, ManifoldToplevel, Mat4 } from "manifold-3d";
import { shapeToManifoldSolid, disposeManifold } from "@/lib/editorBooleans";
import { getManifoldRuntime, type ManifoldSolid } from "@/lib/editorMeshCore";
import { t } from "@/lib/i18n";
import { createLocalId } from "@/lib/localIds";
import { splitShapeFromWorldPositions } from "@/lib/modelSplit";
import { canonicalizeShape, isNonSolidShape } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

/**
 * A lid for a body that is open at the top (#1009): a box hollowed with its top open, a pot, a tray. The body is cut just
 * below its rim; the outline of that cut is the body seen from above, the empty part inside it the opening. From these:
 * - plug: a plate as large as the body with a lip below it that goes into the opening, the gap smaller all round;
 * - cap: a plate a wall wider than the body with a rim below it that goes over the outside, the gap larger all round;
 * - flat: only the plate, as large as the body, to glue on or lay on top.
 * The lid comes out as a body of its own beside the one it closes, turned over with its plate on the plate, ready to
 * print. Everything is worked out with Manifold, in a frame where z is up (the scene's y).
 */

export type LidType = "plug" | "cap" | "flat";

/** The kind of lid; the plate's thickness, the gap per side, how deep the lip or rim reaches down and how thick its wall is, in mm. */
export type LidOptions = {
  type: LidType;
  thickness: number;
  gap: number;
  depth: number;
  wall: number;
};

export const LID_TYPES: readonly LidType[] = ["plug", "cap", "flat"];
export const LID_DEFAULTS: LidOptions = { type: "plug", thickness: 2, gap: 0.2, depth: 4, wall: 1.6 };
export const LID_FITS = [0.1, 0.2, 0.3] as const;
export const MIN_LID_THICKNESS = 0.4;
export const MAX_LID_THICKNESS = 10;
export const MAX_LID_GAP = 1;
export const MIN_LID_DEPTH = 1;
export const MAX_LID_DEPTH = 50;
export const MIN_LID_WALL = 0.4;
export const MAX_LID_WALL = 10;
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
  return result;
}

export type LidError = { code: "notClosed" | "notOpen" | "tooSmall" | "tooShallow" | "empty" } | { code: "kernel"; message?: string };

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

export type LidResult = { lid: ManifoldSolid } | { error: LidError };

/**
 * The lid for `body` (in the scene's frame, y up), lying turned over beside it: its plate on the workplane at the
 * height of the body's bottom, the lip or rim pointing up.
 */
export function lidForSolid(runtime: ManifoldToplevel, body: ManifoldSolid, given: LidOptions): LidResult {
  const created: { delete?: () => void }[] = [];
  try {
    const options = normalizeLidOptions(given);
    const up = keep(created, body.transform(SCENE_TO_UP));
    const box = up.boundingBox();
    const top = box.max[2];
    const height = top - box.min[2];
    // Just below the rim, so a rim that is a hair uneven still counts as the top.
    const rim = top - Math.min(0.3, height * 0.02);
    const section = keep(created, up.slice(rim));
    const outline = filled(runtime, section, created);
    const opening = keep(created, outline.subtract(section));
    const hasOpening = opening.area() >= MIN_OPENING_AREA;
    if (options.type !== "flat" && !hasOpening) return { error: { code: "notOpen" } };
    if (options.type !== "flat" && options.depth >= height) return { error: { code: "tooShallow" } };

    const prism = (area: CrossSection, low: number, high: number) => keep(created, keep(created, area.extrude(high - low)).translate([0, 0, low]));
    const parts: ManifoldSolid[] = [];
    if (options.type === "flat") {
      parts.push(prism(outline, top, top + options.thickness));
    } else if (options.type === "plug") {
      parts.push(prism(outline, top, top + options.thickness));
      const lip = keep(created, opening.offset(-options.gap, "Round", 2, 48));
      if (lip.area() < MIN_OPENING_AREA) return { error: { code: "tooSmall" } };
      const inside = keep(created, opening.offset(-(options.gap + options.wall), "Round", 2, 48));
      const ring = inside.area() >= MIN_OPENING_AREA ? keep(created, lip.subtract(inside)) : lip;
      parts.push(prism(ring, top - options.depth, top));
    } else {
      const inner = keep(created, outline.offset(options.gap, "Round", 2, 48));
      const outer = keep(created, outline.offset(options.gap + options.wall, "Round", 2, 48));
      parts.push(prism(outer, top, top + options.thickness));
      parts.push(prism(keep(created, outer.subtract(inner)), top - options.depth, top));
    }
    const made = parts.length === 1 ? parts[0] : keep(created, runtime.Manifold.union(parts));
    if (made.isEmpty()) return { error: { code: "empty" } };
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
    return { lid };
  } catch (error) {
    return { error: { code: "kernel", message: error instanceof Error ? error.message : String(error ?? "") } };
  } finally {
    Array.from(new Set(created)).forEach((value) => value.delete?.());
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

export type LidShapeResult = { lid: WorkplaneShape } | { lid: null; error: string };

/**
 * The lid for the selected bodies: the solids joined and the holes among them cut away, then the lid made for what is
 * left. It is a mesh named after the first body, in its colour.
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
    const source = solids[0];
    const shape = splitShapeFromWorldPositions(source, positionsOf(result.lid.getMesh()), createLocalId(`${source.id}-lid`), t("lid.name", { name: source.name }));
    if (!shape) return { lid: null, error: lidErrorMessage({ code: "empty" }) };
    return { lid: canonicalizeShape({ ...shape, hidden: false }) };
  } catch (error) {
    return { lid: null, error: lidErrorMessage({ code: "kernel", message: error instanceof Error ? error.message : String(error ?? "") }) };
  } finally {
    Array.from(new Set(created)).forEach(disposeManifold);
  }
}
