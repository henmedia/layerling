/**
 * The face tool (Modify group): a flat face of a body pushed out or cut in as a pocket, set in from
 * its edge and with rounded corners. The outline maths, with no editor state; faceToolBody.ts builds
 * the body, on a sketch body's own frame where faceToolFrame.ts finds one.
 */
import type { CrossSection, ManifoldToplevel } from "manifold-3d";
import type { FaceOutline } from "@/lib/holePattern";
import type { PerforableFace } from "@/lib/holePatternShapes";
import type { PlacementWorkplane } from "@/lib/placementWorkplane";
import { orderedCadSketchPaths } from "@/lib/sketchCadProfile";
import { sampledPath } from "@/lib/sketchStroke";
import type { SketchInset, SketchProfile } from "@/types/layerling";

/** Out adds material standing on the face, in cuts a pocket into it. */
export type FaceToolDirection = "out" | "in";

export type FaceToolSettings = {
  direction: FaceToolDirection;
  /** How far the outline stays inside the face's edge, in mm; 0 is the whole face. */
  inset: number;
  /** Radius the corners of the outline are rounded to, in mm; 0 keeps them as the face has them. */
  radius: number;
  /** How far the new body stands out of the face, or the pocket reaches into it, in mm. */
  depth: number;
  /** Leaves the new body (or the pocket's hole) as a part of its own instead of grouping it with the body (#750). */
  separate: boolean;
};

export const DEFAULT_FACE_TOOL: FaceToolSettings = { direction: "out", inset: 0, radius: 0, depth: 2, separate: false };
export const FACE_TOOL_MAX_INSET = 50;
export const FACE_TOOL_MAX_RADIUS = 30;
export const FACE_TOOL_MIN_DEPTH = 0.2;
export const FACE_TOOL_MAX_DEPTH = 100;
/** How far a pocket reaches out of the face, so the cut leaves no skin over it. */
export const FACE_TOOL_OVERLAP = 0.2;

/**
 * How far the new body reaches past the face: a pocket a little out of it, a body going out not at
 * all. A body that reached into the old one stood out of its side walls wherever they lean in over
 * the face, a flat rim around it (#1577); the union joins bodies that only touch.
 */
export function faceToolOverlap(direction: FaceToolDirection) {
  return direction === "in" ? FACE_TOOL_OVERLAP : 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** Keeps every number of the settings inside what the tool offers. */
export function normalizeFaceTool(settings: Partial<FaceToolSettings>): FaceToolSettings {
  const number = (value: unknown, fallback: number) => (typeof value === "number" && Number.isFinite(value) ? value : fallback);
  return {
    direction: settings.direction === "in" ? "in" : "out",
    inset: clamp(number(settings.inset, DEFAULT_FACE_TOOL.inset), 0, FACE_TOOL_MAX_INSET),
    radius: clamp(number(settings.radius, DEFAULT_FACE_TOOL.radius), 0, FACE_TOOL_MAX_RADIUS),
    depth: clamp(number(settings.depth, DEFAULT_FACE_TOOL.depth), FACE_TOOL_MIN_DEPTH, FACE_TOOL_MAX_DEPTH),
    separate: settings.separate === true,
  };
}

/**
 * The face's outline set in by `inset`, every corner rounded to `radius` (the steps the kernel route
 * in cadSketchInset.ts takes too), as a sketch of straight lines in the face's own coordinates.
 * Openings grow by the inset. Null when nothing of the face is left.
 */
export function insetFaceProfile(runtime: ManifoldToplevel, outline: FaceOutline, inset: number, radius = 0): SketchProfile | null {
  const loops = outline.loops
    .filter((loop) => loop.length >= 3)
    .map((loop) => loop.map((point): [number, number] => [point.u, point.v]));
  if (!loops.length) return null;
  const made: CrossSection[] = [];
  const keep = (section: CrossSection) => {
    made.push(section);
    return section;
  };
  let polygons: ReturnType<CrossSection["toPolygons"]>;
  try {
    const region = keep(new runtime.CrossSection(loops, "EvenOdd"));
    // Miter keeps the inner corners of the face pointed when it shrinks; its outer corners stay pointed with any join.
    const shrink = inset + radius;
    const shrunk = shrink > 0 ? keep(region.offset(-shrink, "Miter", 2, 48)) : region;
    const rounded = radius > 0
      ? keep(keep(keep(shrunk.offset(radius, "Round", 2, 48)).offset(radius, "Round", 2, 48)).offset(-radius, "Round", 2, 48))
      : shrunk;
    const result = keep(rounded.simplify(1e-6));
    if (result.area() <= 1e-9) return null;
    polygons = result.toPolygons();
    if (!polygons.length) return null;
  } finally {
    new Set(made).forEach((section) => section.delete());
  }
  const points: SketchProfile["points"] = [];
  const segments: SketchProfile["segments"] = [];
  polygons.forEach((polygon, loopIndex) => {
    const ids = polygon.map((_, index) => `face-${loopIndex}-${index}`);
    polygon.forEach(([x, z], index) => points.push({ id: ids[index], x, z }));
    ids.forEach((id, index) => segments.push({ id: `face-${loopIndex}-s${index}`, startId: id, endId: ids[(index + 1) % ids.length], kind: "line" }));
  });
  return { points, segments };
}

/** The settings as they are built on a face: a pocket goes no deeper than the body behind the face. */
export function faceToolSettingsOn(face: { thickness: number }, settings: FaceToolSettings): FaceToolSettings {
  if (settings.direction === "out" || settings.depth <= face.thickness) return settings;
  return { ...settings, depth: Math.max(FACE_TOOL_MIN_DEPTH, face.thickness) };
}

/** The height of the body the tool builds: the depth, for a pocket plus the overlap out of the face. */
export function faceToolHeight(settings: Pick<FaceToolSettings, "direction" | "depth">) {
  return settings.depth + faceToolOverlap(settings.direction);
}

/**
 * The workplane the new body stands on: the face's own for a body going out, and for a pocket
 * going in moved along the normal to its bottom, so that it reaches a little out of the face.
 */
export function faceToolWorkplane(face: Pick<PerforableFace, "workplane">, settings: Pick<FaceToolSettings, "direction" | "depth">): PlacementWorkplane {
  const { origin, normal } = face.workplane;
  const shift = settings.direction === "out" ? 0 : -settings.depth;
  return {
    ...face.workplane,
    origin: { x: origin.x + normal.x * shift, y: origin.y + normal.y * shift, z: origin.z + normal.z * shift },
  };
}

/**
 * A sketch's own closed outlines set in by an inset, as straight lines: the route a sketch body
 * with an inset takes where the kernel cannot move its outlines (cadSketchInset.ts).
 */
export function insetSketchProfile(runtime: ManifoldToplevel, profile: SketchProfile, inset: SketchInset): SketchProfile | null {
  const loops = orderedCadSketchPaths(profile)
    .filter((path) => path.closed)
    .map((path) => sampledPath(path).map((point) => ({ u: point.x, v: point.z })));
  return insetFaceProfile(runtime, { loops }, inset.distance, inset.radius);
}
