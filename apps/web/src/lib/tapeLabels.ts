/**
 * What a tape measurement's label says beyond its length, and where on the screen it stands: beside the
 * line rather than on it, and clear of the other measurements where there is room.
 */

export type ScreenPoint = { x: number; y: number };
/** A box by its centre and its full width and height. */
export type ScreenBox = { x: number; y: number; w: number; h: number };
export type TapeAxisSpans = { X: number; Y: number; Z: number };

/**
 * How far a measurement reaches along each axis as the editor shows them (X, Y = -z, Z = y inside):
 * the difference for a straight line, the width of the box around it for a whole edge.
 */
export function tapeAxisSpans(points: readonly { x: number; y: number; z: number }[]): TapeAxisSpans {
  const span = (read: (point: { x: number; y: number; z: number }) => number) => {
    const values = points.map(read);
    return values.length ? Math.max(...values) - Math.min(...values) : 0;
  };
  return { X: span((point) => point.x), Y: span((point) => point.z), Z: span((point) => point.y) };
}

/** The axes a measurement runs along, those that would not read 0 at this accuracy: "X", "XZ", or "3D" for all three. */
export function tapeAxisTag(spans: TapeAxisSpans, accuracy: number) {
  const zero = 0.5 * 10 ** -accuracy;
  const axes = (["X", "Y", "Z"] as const).filter((axis) => spans[axis] >= zero);
  return axes.length === 3 ? "3D" : axes.join("");
}

/** The point halfway along a line on the screen, and the direction of the line there. */
export function screenPolylineMiddle(points: readonly ScreenPoint[]): { point: ScreenPoint; direction: ScreenPoint } {
  const gap = (a: ScreenPoint, b: ScreenPoint) => Math.hypot(b.x - a.x, b.y - a.y);
  let length = 0;
  for (let index = 0; index + 1 < points.length; index += 1) length += gap(points[index], points[index + 1]);
  let traversed = 0;
  for (let index = 0; index + 1 < points.length; index += 1) {
    const a = points[index];
    const b = points[index + 1];
    const piece = gap(a, b);
    if (piece > 1e-9 && traversed + piece >= length / 2) {
      const amount = (length / 2 - traversed) / piece;
      return { point: { x: a.x + (b.x - a.x) * amount, y: a.y + (b.y - a.y) * amount }, direction: { x: (b.x - a.x) / piece, y: (b.y - a.y) / piece } };
    }
    traversed += piece;
  }
  return { point: points[0] ? { ...points[0] } : { x: 0, y: 0 }, direction: { x: 1, y: 0 } };
}

/** Whether the line from a to b passes through the box (clipped against it, Liang-Barsky). */
export function segmentHitsBox(a: ScreenPoint, b: ScreenPoint, box: ScreenBox) {
  let enter = 0;
  let leave = 1;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const clips: Array<[number, number]> = [
    [-dx, a.x - (box.x - box.w / 2)],
    [dx, box.x + box.w / 2 - a.x],
    [-dy, a.y - (box.y - box.h / 2)],
    [dy, box.y + box.h / 2 - a.y],
  ];
  for (const [p, q] of clips) {
    if (Math.abs(p) < 1e-12) {
      if (q < 0) return false;
      continue;
    }
    const amount = q / p;
    if (p < 0) enter = Math.max(enter, amount);
    else leave = Math.min(leave, amount);
    if (enter > leave) return false;
  }
  return true;
}

function boxesOverlap(a: ScreenBox, b: ScreenBox) {
  return Math.abs(a.x - b.x) * 2 < a.w + b.w && Math.abs(a.y - b.y) * 2 < a.h + b.h;
}

/** Between a label and its line: a little more than half a point or middle mark (12px), so the mark on the line never counts as in the way. */
const LABEL_GAP = 8;
/** How much further out the second try goes, when both sides near the line are taken. */
const LABEL_STEP = 24;

/**
 * Where the centre of a label goes: off the line on its side, upwards first, then the other side, then
 * a step further out. The first place that touches no line and no taken box wins; otherwise the one that touches fewest.
 */
export function placeTapeLabel(
  middle: ScreenPoint,
  direction: ScreenPoint,
  size: { w: number; h: number },
  lines: ReadonlyArray<readonly ScreenPoint[]>,
  taken: readonly ScreenBox[],
): ScreenPoint {
  const length = Math.hypot(direction.x, direction.y);
  let normal = length > 1e-9 ? { x: -direction.y / length, y: direction.x / length } : { x: 0, y: -1 };
  if (normal.y > 0 || (normal.y === 0 && normal.x < 0)) normal = { x: -normal.x, y: -normal.y };
  // Far enough along the normal that the box clears the line itself.
  const clearance = (Math.abs(normal.x) * size.w) / 2 + (Math.abs(normal.y) * size.h) / 2 + LABEL_GAP;
  let best: { point: ScreenPoint; touches: number } | null = null;
  for (const reach of [clearance, clearance + LABEL_STEP]) {
    for (const side of [1, -1]) {
      const point = { x: middle.x + normal.x * reach * side, y: middle.y + normal.y * reach * side };
      const box = { ...point, ...size };
      let touches = taken.filter((other) => boxesOverlap(box, other)).length;
      for (const line of lines) {
        for (let index = 0; index + 1 < line.length; index += 1) {
          if (segmentHitsBox(line[index], line[index + 1], box)) {
            touches += 1;
            break;
          }
        }
      }
      if (touches === 0) return point;
      if (!best || touches < best.touches) best = { point, touches };
    }
  }
  return (best as { point: ScreenPoint }).point;
}

/** About how big a label is on the screen: 13px semibold digits in a pill, the axis tag in front. */
export function tapeLabelSize(text: string, tag: string) {
  return { w: Math.max(46, text.length * 7.6 + 18 + (tag ? tag.length * 7 + 8 : 0)), h: 24 };
}
