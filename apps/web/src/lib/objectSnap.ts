/**
 * Fangen beim Verschieben: der gezogene Umriss rastet mit Kante oder Mitte an
 * Kante oder Mitte einer anderen Form ein, getrennt fuer X und Z.
 *
 * Alles in Weltkoordinaten auf der Grundebene; die Umrisse sind achsparallele
 * Huellrechtecke, so wie Ausrichten sie auch nimmt.
 */

export type SnapBox = { minX: number; maxX: number; minZ: number; maxZ: number };

/** A guide line at `value` on `axis`, drawn across the other axis from `from` to `to`. */
export type ObjectSnapGuide = { axis: "x" | "z"; value: number; from: number; to: number };

export type ObjectSnapResult = { dx: number | null; dz: number | null; guides: ObjectSnapGuide[] };

const SAME_LINE = 1e-6;

function lines(min: number, max: number) {
  return [min, (min + max) / 2, max];
}

function bestOffset(moving: number[], targets: SnapBox[], pick: (box: SnapBox) => number[], threshold: number) {
  let best: number | null = null;
  targets.forEach((target) => {
    pick(target).forEach((line) => {
      moving.forEach((own) => {
        const offset = line - own;
        if (Math.abs(offset) <= threshold && (best === null || Math.abs(offset) < Math.abs(best) - SAME_LINE)) best = offset;
      });
    });
  });
  return best;
}

export function shiftSnapBox(box: SnapBox, dx: number, dz: number): SnapBox {
  return { minX: box.minX + dx, maxX: box.maxX + dx, minZ: box.minZ + dz, maxZ: box.maxZ + dz };
}

/**
 * Finds the smallest shift (each axis on its own, at most `threshold`) that lays
 * an edge or the centre of `moving` onto an edge or centre of a target, plus the
 * guide lines that show every alignment the shifted box then has.
 */
export function objectSnapOffset(moving: SnapBox, targets: SnapBox[], threshold: number): ObjectSnapResult {
  if (targets.length === 0 || !(threshold > 0)) return { dx: null, dz: null, guides: [] };
  const dx = bestOffset(lines(moving.minX, moving.maxX), targets, (box) => lines(box.minX, box.maxX), threshold);
  const dz = bestOffset(lines(moving.minZ, moving.maxZ), targets, (box) => lines(box.minZ, box.maxZ), threshold);
  const snapped = shiftSnapBox(moving, dx ?? 0, dz ?? 0);
  const guides: ObjectSnapGuide[] = [];
  const addGuides = (axis: "x" | "z") => {
    const own = axis === "x" ? lines(snapped.minX, snapped.maxX) : lines(snapped.minZ, snapped.maxZ);
    targets.forEach((target) => {
      const theirs = axis === "x" ? lines(target.minX, target.maxX) : lines(target.minZ, target.maxZ);
      theirs.forEach((line) => {
        if (!own.some((value) => Math.abs(value - line) < SAME_LINE)) return;
        const from = axis === "x" ? Math.min(snapped.minZ, target.minZ) : Math.min(snapped.minX, target.minX);
        const to = axis === "x" ? Math.max(snapped.maxZ, target.maxZ) : Math.max(snapped.maxX, target.maxX);
        const existing = guides.find((guide) => guide.axis === axis && Math.abs(guide.value - line) < SAME_LINE);
        if (existing) {
          existing.from = Math.min(existing.from, from);
          existing.to = Math.max(existing.to, to);
        } else {
          guides.push({ axis, value: line, from, to });
        }
      });
    });
  };
  if (dx !== null) addGuides("x");
  if (dz !== null) addGuides("z");
  return { dx, dz, guides };
}

/**
 * Where the dragged side of a resize can stop (Discussion #1647): a line along `axis` with the stretch it takes up
 * across the other axis, for the guide line. Edges and middles of other bodies, and the walls the side runs into.
 */
export type EdgeSnapTarget = { value: number; from: number; to: number };

/** The left, middle and right (or front, middle and back) lines of each box along `axis`. */
export function boxEdgeTargets(boxes: readonly SnapBox[], axis: "x" | "z"): EdgeSnapTarget[] {
  return boxes.flatMap((box) => {
    const [min, max] = axis === "x" ? [box.minX, box.maxX] : [box.minZ, box.maxZ];
    const [from, to] = axis === "x" ? [box.minZ, box.maxZ] : [box.minX, box.maxX];
    return lines(min, max).map((value) => ({ value, from, to }));
  });
}

/**
 * The side handle of a resize (Discussion #1647). The side opposite the handle stays at `anchor` (or, with `symmetric`,
 * the middle stays at `anchor` and both sides move); the dragged side lies `direction` (+1 or -1) times the size from it,
 * half of it when symmetric. When that side comes within `threshold` of a target it is pulled onto it: the answer is
 * the size that puts it there exactly, with the target, or null when nothing is near or the size would be below `minSize`.
 */
export function snapResizeEdge(
  edge: { anchor: number; direction: 1 | -1; size: number; symmetric: boolean },
  targets: readonly EdgeSnapTarget[],
  threshold: number,
  minSize: number,
): { size: number; target: EdgeSnapTarget } | null {
  if (!(threshold > 0) || !(edge.size > 0)) return null;
  const reach = edge.symmetric ? edge.size / 2 : edge.size;
  const side = edge.anchor + edge.direction * reach;
  let best: { size: number; target: EdgeSnapTarget; distance: number } | null = null;
  for (const target of targets) {
    const distance = Math.abs(target.value - side);
    if (distance > threshold || (best && distance >= best.distance - SAME_LINE)) continue;
    const towards = (target.value - edge.anchor) * edge.direction;
    // Rounded to a millionth, so a side snapped to 45.2 from -35.2 gives 80.4 and not 80.40000000000001.
    const size = Math.round((edge.symmetric ? towards * 2 : towards) * 1e6) / 1e6;
    if (!(size >= minSize)) continue;
    best = { size, target, distance };
  }
  return best ? { size: best.size, target: best.target } : null;
}

/** The guide line of a snapped side: along the target, reaching over the moving body's own stretch too. */
export function edgeSnapGuide(axis: "x" | "z", target: EdgeSnapTarget, movingFrom: number, movingTo: number): ObjectSnapGuide {
  return { axis, value: target.value, from: Math.min(target.from, movingFrom), to: Math.max(target.to, movingTo) };
}
