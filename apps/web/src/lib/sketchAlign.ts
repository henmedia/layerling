import type { SketchPoint, SketchProfile } from "@/types/layerling";

/**
 * Lining up outlines in a sketch (#836), as Align does with bodies in the 3D editor: two circles centred on
 * each other become a ring. An outline is the selected points that hang together by lines; each moves as a
 * whole, so it keeps its shape. The edges and middles are those of the outline's points, as the selection
 * frame shows them. In the sketch, top is the smaller z, the way the frame is drawn.
 */
export type SketchAlignMode = "left" | "centerX" | "right" | "top" | "centerZ" | "bottom";

type Bounds = { minX: number; maxX: number; minZ: number; maxZ: number };

function boundsOf(points: readonly SketchPoint[]): Bounds {
  return {
    minX: Math.min(...points.map((point) => point.x)),
    maxX: Math.max(...points.map((point) => point.x)),
    minZ: Math.min(...points.map((point) => point.z)),
    maxZ: Math.max(...points.map((point) => point.z)),
  };
}

/** The selected points, outline by outline: the ones a line joins belong together. */
export function sketchSelectionOutlines(profile: SketchProfile, pointIds: readonly string[]): SketchPoint[][] {
  const selected = new Set(pointIds);
  const points = profile.points.filter((point) => selected.has(point.id));
  const parent = new Map(points.map((point) => [point.id, point.id]));
  const root = (id: string): string => {
    let current = id;
    while (parent.get(current) !== current) current = parent.get(current)!;
    parent.set(id, current);
    return current;
  };
  for (const segment of profile.segments) {
    if (!parent.has(segment.startId) || !parent.has(segment.endId)) continue;
    parent.set(root(segment.startId), root(segment.endId));
  }
  const outlines = new Map<string, SketchPoint[]>();
  for (const point of points) {
    const key = root(point.id);
    const list = outlines.get(key);
    if (list) list.push(point);
    else outlines.set(key, [point]);
  }
  return [...outlines.values()];
}

/** Whether Align has something to do: two outlines or more, and one of them free to move. */
export function canAlignSketchSelection(profile: SketchProfile, pointIds: readonly string[]) {
  const outlines = sketchSelectionOutlines(profile, pointIds);
  return outlines.length > 1 && outlines.some((outline) => !outline.every((point) => point.locked));
}

/**
 * The moved points, outline by outline, or null when there is nothing to line up. They line up on the frame
 * round all of them; a locked outline stays where it is, and the others line up on the frame of the locked ones.
 */
export function alignSketchSelection(profile: SketchProfile, pointIds: readonly string[], mode: SketchAlignMode): SketchPoint[] | null {
  if (!canAlignSketchSelection(profile, pointIds)) return null;
  const outlines = sketchSelectionOutlines(profile, pointIds);
  const locked = outlines.filter((outline) => outline.every((point) => point.locked));
  const reference = boundsOf((locked.length ? locked : outlines).flat());
  const horizontal = mode === "left" || mode === "centerX" || mode === "right";
  const target = (bounds: Bounds) => {
    if (mode === "left") return bounds.minX;
    if (mode === "right") return bounds.maxX;
    if (mode === "centerX") return (bounds.minX + bounds.maxX) / 2;
    if (mode === "top") return bounds.minZ;
    if (mode === "bottom") return bounds.maxZ;
    return (bounds.minZ + bounds.maxZ) / 2;
  };
  const goal = target(reference);
  const moved: SketchPoint[] = [];
  for (const outline of outlines) {
    if (outline.some((point) => point.locked)) continue;
    const shift = goal - target(boundsOf(outline));
    if (Math.abs(shift) < 1e-9) continue;
    const dx = horizontal ? shift : 0;
    const dz = horizontal ? 0 : shift;
    const move = (value: { x: number; z: number }) => ({ x: value.x + dx, z: value.z + dz });
    for (const point of outline) {
      moved.push({
        ...point,
        ...move(point),
        handleIn: point.handleIn ? move(point.handleIn) : undefined,
        handleOut: point.handleOut ? move(point.handleOut) : undefined,
      });
    }
  }
  return moved.length ? moved : null;
}
