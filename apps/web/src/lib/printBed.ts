import * as THREE from "three";
import { meshForShape } from "@/lib/editorMeshCore";
import { quaternionForShape } from "@/lib/geometryRotation";
import { PRINTER_PRESETS, type PrinterPreset } from "@/lib/printerPresets.generated";
import { isNonSolidShape, shapeDepth, shapeWidth } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

export function printerPresetById(id: string | undefined | null): PrinterPreset | null {
  if (!id) return null;
  return PRINTER_PRESETS.find((preset) => preset.id === id) ?? null;
}

export type BedFootprint = { minX: number; maxX: number; minZ: number; maxZ: number };

/**
 * Where a body stands on the plate, seen from above: its box, turned the way the
 * body is turned, projected onto the workplane. A tapered or imported body
 * stays inside that box, so the footprint never reports too little.
 */
export function shapeBedFootprint(shape: WorkplaneShape): BedFootprint {
  const halfWidth = shapeWidth(shape) / 2;
  const halfDepth = shapeDepth(shape) / 2;
  const halfHeight = shape.height / 2;
  const turn = quaternionForShape(shape);
  const corner = new THREE.Vector3();
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      for (const sz of [-1, 1]) {
        corner.set(sx * halfWidth, sy * halfHeight, sz * halfDepth).applyQuaternion(turn);
        minX = Math.min(minX, corner.x);
        maxX = Math.max(maxX, corner.x);
        minZ = Math.min(minZ, corner.z);
        maxZ = Math.max(maxZ, corner.z);
      }
    }
  }
  return { minX: shape.x + minX, maxX: shape.x + maxX, minZ: shape.z + minZ, maxZ: shape.z + maxZ };
}

/**
 * How low and how high a body reaches above the workplane, its box turned the
 * way the body is turned - the same generous box as the footprint.
 */
export function shapeVerticalExtent(shape: WorkplaneShape): { minY: number; maxY: number } {
  const halfWidth = shapeWidth(shape) / 2;
  const halfDepth = shapeDepth(shape) / 2;
  const halfHeight = shape.height / 2;
  const turn = quaternionForShape(shape);
  const corner = new THREE.Vector3();
  let reach = 0;
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      for (const sz of [-1, 1]) {
        corner.set(sx * halfWidth, sy * halfHeight, sz * halfDepth).applyQuaternion(turn);
        reach = Math.max(reach, Math.abs(corner.y));
      }
    }
  }
  const centre = (shape.elevation ?? 0) + halfHeight;
  return { minY: centre - reach, maxY: centre + reach };
}

export type BedOverhang = {
  shape: WorkplaneShape;
  /** How far the body reaches past each edge of the plate, in millimetres (0 = inside). */
  left: number;
  right: number;
  back: number;
  front: number;
  /** On a round plate, how far it reaches past the edge instead of past the four sides (0 = inside). */
  edge: number;
  /** How far it reaches above the printer's build height (0 = fits). */
  top: number;
};

/** A hair of tolerance, so a body placed exactly on the edge does not count. */
const BED_EDGE_TOLERANCE = 0.01;

/**
 * The bodies that do not fit a printer of `width` x `depth` x `height`: past
 * the plate, centred on the workplane origin as the grid is, or taller than
 * the build height. Height counts from the lowest printed body, because the
 * slicer sets the model down on the plate anyway - a design that floats or
 * sinks a little is not too tall for that. Holes, hidden bodies and rulers are
 * not printed, so they never count. A `round` plate (a delta printer's, #1024)
 * is a circle `width` across.
 */
export function bedOverhangs(shapes: readonly WorkplaneShape[], width: number, depth: number, height?: number, round = false): BedOverhang[] {
  const halfWidth = width / 2;
  const halfDepth = depth / 2;
  const printed = shapes.filter((shape) => !shape.hole && !shape.hidden && !isNonSolidShape(shape));
  const vertical = new Map(printed.map((shape) => [shape, shapeVerticalExtent(shape)]));
  const base = Math.min(...[...vertical.values()].map((extent) => extent.minY));
  const overhangs: BedOverhang[] = [];
  for (const shape of printed) {
    const footprint = shapeBedFootprint(shape);
    const sides = round ? { left: 0, right: 0, back: 0, front: 0 } : {
      left: Math.max(0, -halfWidth - footprint.minX),
      right: Math.max(0, footprint.maxX - halfWidth),
      back: Math.max(0, -halfDepth - footprint.minZ),
      front: Math.max(0, footprint.maxZ - halfDepth),
    };
    const edge = round ? Math.max(0, roundBedReach(shape, footprint, halfWidth) - halfWidth) : 0;
    const top = height ? Math.max(0, (vertical.get(shape)?.maxY ?? 0) - base - height) : 0;
    if (Math.max(sides.left, sides.right, sides.back, sides.front, edge, top) > BED_EDGE_TOLERANCE) {
      overhangs.push({ shape, ...sides, edge, top });
    }
  }
  return overhangs;
}

/**
 * How far from the plate's middle a body reaches, seen from above, for a round plate (#1024). The box round it reaches
 * past the circle with its corners long before a round body does - a cylinder as wide as the plate would never fit -
 * so a box that does not fit is measured again on the body's own mesh, and the box stands only when there is none.
 */
function roundBedReach(shape: WorkplaneShape, footprint: BedFootprint, radius: number) {
  const box = Math.max(...[footprint.minX, footprint.maxX].flatMap((x) => [footprint.minZ, footprint.maxZ].map((z) => Math.hypot(x, z))));
  if (box <= radius + BED_EDGE_TOLERANCE) return box;
  try {
    const { vertices } = meshForShape(shape);
    if (!vertices.length) return box;
    let reach = 0;
    for (const [x, , z] of vertices) reach = Math.max(reach, Math.hypot(x, z));
    return Math.min(box, reach);
  } catch {
    return box;
  }
}

/**
 * The warning clicked away body by body (#640): the ids still dismissed are only those that
 * are still outside, so a body that fits again and is moved out later warns again. Returns
 * `dismissed` itself when nothing changed, so a React state keeps its identity.
 */
export function keepDismissedOverhangs(dismissed: ReadonlySet<string>, overhangs: readonly BedOverhang[]): ReadonlySet<string> {
  if (dismissed.size === 0) return dismissed;
  const outside = new Set(overhangs.map((overhang) => overhang.shape.id));
  const kept = [...dismissed].filter((id) => outside.has(id));
  return kept.length === dismissed.size ? dismissed : new Set(kept);
}
