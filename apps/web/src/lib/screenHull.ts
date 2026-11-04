export type ScreenPoint = { x: number; y: number };

/** The convex outline around points on the screen, counter-clockwise in y-down pixels (monotone chain). */
export function convexHull(points: readonly ScreenPoint[]): ScreenPoint[] {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  if (sorted.length < 3) return sorted;
  const cross = (o: ScreenPoint, a: ScreenPoint, b: ScreenPoint) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: ScreenPoint[] = [];
  for (const point of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) lower.pop();
    lower.push(point);
  }
  const upper: ScreenPoint[] = [];
  for (let index = sorted.length - 1; index >= 0; index -= 1) {
    const point = sorted[index];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) upper.pop();
    upper.push(point);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

/**
 * Whether a point lies inside the outline the given points span on the screen, or within `margin` pixels of it.
 * Used for the selection frame: a right-click on empty space inside it still means the selection (#1282).
 */
export function pointInsideOutline(point: ScreenPoint, points: readonly ScreenPoint[], margin = 0): boolean {
  const hull = convexHull(points);
  if (hull.length < 3) return false;
  for (let index = 0; index < hull.length; index += 1) {
    const a = hull[index];
    const b = hull[(index + 1) % hull.length];
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    if (length === 0) continue;
    // The hull runs with the inside on the left of each edge; a negative distance is outside.
    const distance = ((b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x)) / length;
    if (distance < -margin) return false;
  }
  return true;
}
