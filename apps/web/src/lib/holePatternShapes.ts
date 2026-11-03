import * as THREE from "three";
import { faceFrameWorkplane } from "@/lib/carryOntoFace";
import {
  faceOutlineFromTriangles,
  holeFootprintSize,
  holeHasHead,
  holeHeadDepth,
  holeHeadSize,
  holePatternCenters,
  type FaceOutline,
  type HolePatternSettings,
} from "@/lib/holePattern";
import { placementPatchForNewShape, type PlacementWorkplane } from "@/lib/placementWorkplane";
import { nearestFaceTriangle, planarFaceTriangles } from "@/lib/rotationPivot";
import { METRIC_COUNTERSINK_ANGLE, screwHoleFields, screwHoleSizesFor, type ScrewHoleSize } from "@/lib/screwHoleSizes";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { createLocalId } from "@/lib/localIds";
import { canonicalizeShape, shapeDepth, shapeWidth, withHoleMode } from "@/lib/workplaneShapes";
import type { ShapeKind, WorkplaneShape } from "@/types/layerling";

type Vec = { x: number; y: number; z: number };

/** How far a hole reaches out of the face and past the far side, so the cut leaves no skin behind. */
export const HOLE_OVERSHOOT = 0.2;

/** A flat face of a body, measured once when it is picked. */
export type PerforableFace = {
  workplane: PlacementWorkplane;
  outline: FaceOutline;
  /** How thick the body is behind the face, along the face's normal. */
  thickness: number;
};

export type FaceReadResult =
  | { ok: true; face: PerforableFace }
  | { ok: false; reason: "noFace" | "curved" };

/**
 * The flat face around a click. `positions` holds the body's world triangles
 * (nine numbers each); the face is the one whose triangle lies nearest to
 * `point` among those that face `normal`. A face of a single facet is a
 * curved surface, not a face to perforate.
 */
export function readPerforableFace(positions: ArrayLike<number>, point: Vec, normal: Vec): FaceReadResult {
  const triangleCount = Math.floor(positions.length / 9);
  const n = new THREE.Vector3(normal.x, normal.y, normal.z);
  if (triangleCount === 0 || n.lengthSq() < 1e-12) return { ok: false, reason: "noFace" };
  n.normalize();

  const p = new THREE.Vector3(point.x, point.y, point.z);
  const hit = nearestFaceTriangle(positions, point, n);
  if (hit < 0) return { ok: false, reason: "noFace" };

  const face = planarFaceTriangles(positions, hit);
  if (!face || face.triangles.length < 2) return { ok: false, reason: face ? "curved" : "noFace" };

  const workplane = faceFrameWorkplane(point, n);
  // Lay the origin on the face's plane itself, not on whatever the click was slightly off by.
  const o = hit * 9;
  const onPlane = new THREE.Vector3(positions[o], positions[o + 1], positions[o + 2]);
  const offset = n.dot(p.clone().sub(onPlane));
  const origin = p.clone().addScaledVector(n, -offset);
  workplane.origin = { x: origin.x, y: origin.y, z: origin.z };

  const outline = faceOutlineFromTriangles(positions, face.triangles, {
    origin: workplane.origin,
    xAxis: workplane.xAxis,
    zAxis: workplane.zAxis,
  });
  if (!outline) return { ok: false, reason: "noFace" };

  const planeOffset = n.dot(origin);
  let lowest = Infinity;
  for (let index = 0; index < positions.length; index += 3) {
    lowest = Math.min(lowest, n.x * positions[index] + n.y * positions[index + 1] + n.z * positions[index + 2]);
  }
  return { ok: true, face: { workplane, outline, thickness: Math.max(0, planeOffset - lowest) } };
}

/** The screw sizes a hole with this head offers (a countersink only those ISO 15065 has). */
export function holePatternScrewSizes(type: "counterbore" | "countersink"): ScrewHoleSize[] {
  return screwHoleSizesFor(type);
}

/** Shaft, head and depth for a screw of this size, as the counterbore and countersink shapes take them (#1232). */
export function holePatternScrewPatch(type: "counterbore" | "countersink", size: ScrewHoleSize): Pick<HolePatternSettings, "size" | "headSize" | "headDepth"> {
  const fields = screwHoleFields(type, size, 0);
  return { size: fields.screwHoleShaft, headSize: fields.width, ...(fields.screwHoleHeadDepth !== undefined ? { headDepth: fields.screwHoleHeadDepth } : {}) };
}

/** The screw size whose hole the settings make, or null for measures of their own. */
export function holePatternScrewSize(settings: Pick<HolePatternSettings, "form" | "size" | "holeType" | "headSize" | "headDepth">): ScrewHoleSize | null {
  if (!holeHasHead(settings)) return null;
  const type = settings.holeType as "counterbore" | "countersink";
  const near = (a: number | undefined, b: number | undefined) => a !== undefined && b !== undefined && Math.abs(a - b) < 0.005;
  return holePatternScrewSizes(type).find((size) => {
    const patch = holePatternScrewPatch(type, size);
    return near(settings.size, patch.size) && near(holeHeadSize(settings), patch.headSize) && (type === "countersink" || near(holeHeadDepth(settings), patch.headDepth));
  }) ?? null;
}

const FORM_KIND: Record<HolePatternSettings["form"], ShapeKind> = {
  round: "cylinder",
  square: "box",
  rectangle: "box",
  hexagon: "polygon",
  slot: "slot",
  // An own shape is a copy of itself; the kind is not used for it.
  custom: "box",
};

/** The depth the holes actually get: the body's thickness plus a skin's worth, or what was asked for. */
export function holeDepth(face: Pick<PerforableFace, "thickness">, settings: Pick<HolePatternSettings, "depth">) {
  return settings.depth === null ? face.thickness + HOLE_OVERSHOOT : settings.depth;
}

/** Kinds that are round seen from above, so an own shape of one takes a round room on the face (#1235). */
const ROUND_KINDS = new Set<ShapeKind>(["cylinder", "sphere", "halfSphere", "cone", "curvedCone", "paraboloid", "tube", "ring", "torus", "counterbore", "countersink", "doubleCountersink", "finishingWasher"]);

/** The footprint settings of a shape repeated over the face: its own width and depth, round for the round kinds. */
export function holePatternCustomFootprint(shape: WorkplaneShape): Pick<HolePatternSettings, "customId" | "customWidth" | "customDepth" | "customRound"> {
  return { customId: shape.id, customWidth: shapeWidth(shape), customDepth: shapeDepth(shape), customRound: ROUND_KINDS.has(shape.kind) && Math.abs(shapeWidth(shape) - shapeDepth(shape)) < 1e-6 };
}

/** A shape and its parts with ids made by `idFor`, so a preview keeps the same ids while the numbers change. */
function cloneTree(shape: WorkplaneShape, idFor: (id: string) => string): WorkplaneShape {
  return { ...shape, id: idFor(shape.id), groupedShapes: shape.groupedShapes?.map((child) => cloneTree(child, idFor)) };
}

export type HolePatternPlan = {
  holes: WorkplaneShape[];
  tooMany: boolean;
  /** Holes round the edge: the length of the line they go round on, and whether they sit on its corners. */
  ring?: { length: number; onCorners: boolean };
};

/**
 * The hole shapes of a pattern on a face: ordinary hole shapes standing on the
 * face, reaching `depth` into the body and a little out of it. Nothing is cut
 * here - grouping them with the body does that, and ungrouping frees them.
 */
export function holePatternShapes(
  face: PerforableFace,
  settings: HolePatternSettings,
  namePrefix: string,
  /** Ids that stay the same from one call to the next, for a preview that is redrawn while the numbers change. */
  previewIdPrefix?: string,
  /** Own shape (#1235): the shape from the scene that is repeated in place of a hole. */
  custom?: WorkplaneShape | null,
): HolePatternPlan {
  if (settings.form === "custom" && !custom) return { holes: [], tooMany: false };
  const { centers, tooMany, ring } = holePatternCenters(face.outline, settings);
  if (tooMany || centers.length === 0) return { holes: [], tooMany, ...(ring ? { ring } : {}) };

  if (settings.form === "custom" && custom) {
    // A copy of the shape stands upright on every place, turned with the face: a body a little sunk in so it joins, a
    // hole reaching its own height into the face and a little out of it. Its own turn is not taken along.
    const { workplane } = face;
    const normal = new THREE.Vector3(workplane.normal.x, workplane.normal.y, workplane.normal.z);
    const origin = new THREE.Vector3(workplane.origin.x, workplane.origin.y, workplane.origin.z);
    const xAxis = new THREE.Vector3(workplane.xAxis.x, workplane.xAxis.y, workplane.xAxis.z);
    const zAxis = new THREE.Vector3(workplane.zAxis.x, workplane.zAxis.y, workplane.zAxis.z);
    const name = custom.name || namePrefix;
    const pieces = centers.map((center, index) => {
      const onFace = origin.clone().addScaledVector(xAxis, center.u).addScaledVector(zAxis, center.v);
      const base = custom.hole
        ? onFace.addScaledVector(normal, HOLE_OVERSHOOT - custom.height)
        : onFace.addScaledVector(normal, -HOLE_OVERSHOOT);
      const copy = cloneTree(custom, (id) => (previewIdPrefix ? `${previewIdPrefix}-${index}-${id}` : createLocalId(`${id}-pattern`)));
      const placed: WorkplaneShape = {
        ...copy,
        ...(previewIdPrefix ? { id: `${previewIdPrefix}-${index}` } : {}),
        name: `${name} ${index + 1}`,
        locked: false,
        ...placementPatchForNewShape(copy, workplane, base),
      };
      return canonicalizeShape(placed);
    });
    return { holes: pieces, tooMany: false, ...(ring ? { ring } : {}) };
  }

  // A round hole with a head is a counterbore or countersink shape (#1232), its head on the face.
  const headType = holeHasHead(settings) ? settings.holeType as "counterbore" | "countersink" : null;
  const kind = headType ?? FORM_KIND[settings.form];
  const asset = toolbarShapeAssets.find((entry) => entry.kind === kind);
  if (!asset) return { holes: [], tooMany: false };
  const depth = holeDepth(face, settings);
  const height = depth + HOLE_OVERSHOOT;
  // The shape's top stands HOLE_OVERSHOOT out of the face: the counterbore reaches that much deeper, and the
  // countersink's cone, opening at 90 degrees, is that much wider up there, so both meet the face as set.
  const head: { width: number; screwHoleShaft: number; screwHoleHeadDepth?: number; screwHoleAngle?: number } | null = headType ? {
    screwHoleShaft: Math.max(0.5, settings.size),
    ...(headType === "counterbore"
      ? { screwHoleHeadDepth: holeHeadDepth(settings) + HOLE_OVERSHOOT, width: holeHeadSize(settings) }
      : { screwHoleAngle: METRIC_COUNTERSINK_ANGLE, width: holeHeadSize(settings) + 2 * HOLE_OVERSHOOT }),
  } : null;
  const size = head ? { width: head.width, height: head.width } : holeFootprintSize(settings);
  const { workplane } = face;
  const normal = new THREE.Vector3(workplane.normal.x, workplane.normal.y, workplane.normal.z);
  const origin = new THREE.Vector3(workplane.origin.x, workplane.origin.y, workplane.origin.z);
  const xAxis = new THREE.Vector3(workplane.xAxis.x, workplane.xAxis.y, workplane.xAxis.z);
  const zAxis = new THREE.Vector3(workplane.zAxis.x, workplane.zAxis.y, workplane.zAxis.z);

  const holes = centers.map((center, index) => {
    const top = origin.clone().addScaledVector(xAxis, center.u).addScaledVector(zAxis, center.v).addScaledVector(normal, HOLE_OVERSHOOT);
    const base = top.clone().addScaledVector(normal, -height);
    const made = makeShapeFromAsset(
      { ...asset, name: `${namePrefix} ${index + 1}` },
      { x: 0, z: 0, elevation: 0 },
      {
        width: size.width,
        depth: size.height,
        height,
        sides: settings.form === "hexagon" ? 6 : undefined,
        ...(head ? { screwHoleShaft: head.screwHoleShaft, screwHoleHeadDepth: head.screwHoleHeadDepth, screwHoleAngle: head.screwHoleAngle } : {}),
      },
    );
    const sized = { ...made, width: size.width, depth: size.height, height, size: Math.max(size.width, size.height) };
    const placed = { ...sized, ...placementPatchForNewShape(sized, workplane, base), ...(previewIdPrefix ? { id: `${previewIdPrefix}-${index}` } : {}) };
    return canonicalizeShape(withHoleMode(placed, true));
  });
  return { holes, tooMany: false, ...(ring ? { ring } : {}) };
}
