import type { SketchConstraint, SketchPoint } from "@/types/layerling";

export type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
export type SelectionBounds = { minX: number; maxX: number; minZ: number; maxZ: number; width: number; depth: number; cx: number; cz: number };

/** A selection made entirely from complete concentric circles resizes about its center. */
export function concentricResizeLocks(pointIds: readonly string[], constraints: readonly SketchConstraint[]) {
  const selected = new Set(pointIds);
  const covered = new Set<string>();
  for (const rule of constraints) {
    if (rule.kind !== "concentric") continue;
    for (const outline of rule.circles) {
      if (outline.every((id) => selected.has(id))) outline.forEach((id) => covered.add(id));
    }
  }
  if (!covered.size || covered.size !== selected.size) return undefined;
  const fixed = new Set<string>();
  for (const rule of constraints) {
    if (rule.kind === "circle-diameter") rule.outline.forEach((id) => fixed.add(id));
  }
  return fixed;
}

function mapPoints(points: SketchPoint[], map: (value: { x: number; z: number }) => { x: number; z: number }, fixed?: ReadonlySet<string>) {
  return points.map((point) => fixed?.has(point.id) ? point : ({
    ...point,
    ...map(point),
    handleIn: point.handleIn ? map(point.handleIn) : undefined,
    handleOut: point.handleOut ? map(point.handleOut) : undefined,
  }));
}

function scaleAboutCenter(points: SketchPoint[], bounds: SelectionBounds, factor: number, fixed: ReadonlySet<string>) {
  if (!Number.isFinite(factor) || Math.abs(factor - 1) < 1e-12) return points;
  return mapPoints(points, (point) => ({
    x: bounds.cx + (point.x - bounds.cx) * factor,
    z: bounds.cz + (point.z - bounds.cz) * factor,
  }), fixed);
}

/**
 * Selected sketch points stretched by a handle of their frame. With `proportional` - Shift on a
 * corner (#168), or the switch "Keep proportions" (#653) - both sides take the same stretch: a
 * corner from the opposite corner, a side from the opposite side, the other direction about the
 * middle.
 */
export function resizeSketchPoints(points: SketchPoint[], bounds: SelectionBounds, handle: ResizeHandle, current: { x: number; z: number }, proportional = false, concentricLocks?: ReadonlySet<string>) {
  const minimum = 0.5;
  if (concentricLocks) {
    const dx = handle.includes("w") ? bounds.minX - bounds.cx : handle.includes("e") ? bounds.maxX - bounds.cx : 0;
    const dz = handle.includes("n") ? bounds.minZ - bounds.cz : handle.includes("s") ? bounds.maxZ - bounds.cz : 0;
    const factor = ((current.x - bounds.cx) * dx + (current.z - bounds.cz) * dz) / (dx * dx + dz * dz);
    return scaleAboutCenter(points, bounds, Math.max(Math.min(1, minimum / Math.min(bounds.width, bounds.depth)), factor), concentricLocks);
  }
  let minX = bounds.minX;
  let maxX = bounds.maxX;
  let minZ = bounds.minZ;
  let maxZ = bounds.maxZ;
  if (handle.includes("w")) minX = Math.min(current.x, bounds.maxX - minimum);
  if (handle.includes("e")) maxX = Math.max(current.x, bounds.minX + minimum);
  if (handle.includes("n")) minZ = Math.min(current.z, bounds.maxZ - minimum);
  if (handle.includes("s")) maxZ = Math.max(current.z, bounds.minZ + minimum);
  const width = Math.max(minimum, bounds.width);
  const depth = Math.max(minimum, bounds.depth);
  let scaleX = (maxX - minX) / width;
  let scaleZ = (maxZ - minZ) / depth;
  if (proportional && handle.length === 2) {
    const scale = Math.max(scaleX, scaleZ);
    scaleX = scale;
    scaleZ = scale;
    if (handle.includes("w")) minX = bounds.maxX - width * scale;
    else maxX = bounds.minX + width * scale;
    if (handle.includes("n")) minZ = bounds.maxZ - depth * scale;
    else maxZ = bounds.minZ + depth * scale;
  } else if (proportional) {
    // A side handle: the other direction follows, about the middle of the frame.
    if (handle === "e" || handle === "w") {
      scaleZ = scaleX;
      minZ = bounds.cz - (depth * scaleZ) / 2;
    } else {
      scaleX = scaleZ;
      minX = bounds.cx - (width * scaleX) / 2;
    }
  }
  const map = (value: { x: number; z: number }) => ({
    x: minX + (value.x - bounds.minX) * scaleX,
    z: minZ + (value.z - bounds.minZ) * scaleZ,
  });
  return mapPoints(points, map);
}

/** A width or height typed into the frame: along that axis only, or both alike while the proportions are kept. */
export function resizeSketchPointsToSize(points: SketchPoint[], bounds: SelectionBounds, axis: "x" | "z", size: number, proportional = false, concentricLocks?: ReadonlySet<string>) {
  if (concentricLocks) {
    const factor = size / (axis === "x" ? bounds.width : bounds.depth);
    return scaleAboutCenter(points, bounds, Math.max(Math.min(1, 0.5 / Math.min(bounds.width, bounds.depth)), factor), concentricLocks);
  }
  if (proportional) {
    const scale = size / Math.max(0.5, axis === "x" ? bounds.width : bounds.depth);
    return resizeSketchPoints(points, bounds, "se", { x: bounds.minX + bounds.width * scale, z: bounds.minZ + bounds.depth * scale }, true);
  }
  const target = axis === "x" ? { x: bounds.minX + size, z: bounds.maxZ } : { x: bounds.maxX, z: bounds.minZ + size };
  return resizeSketchPoints(points, bounds, axis === "x" ? "e" : "s", target);
}
