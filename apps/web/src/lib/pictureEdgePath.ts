import type { PreparedPicture, TracePoint } from "@/lib/pictureTrace";

/*
 * The magnetic lasso's way along an edge of the picture: between two spots clicked near an edge, the
 * way that keeps to it round its bends (intelligent scissors, after Mortensen and Barrett 1995). Each
 * pixel costs the less to cross the stronger the edge it lies on, and the cheapest way from one spot to
 * the other (Dijkstra, within a box round the two) runs along the edge. It works on the traced picture
 * (shrunk to the tracer's size); the spots and the way are given in the picture's own pixels.
 */

/** How far a spot clicked moves to the strongest edge near it, in traced pixels. */
const SNAP_REACH = 5;
/** An edge weaker than this (0 to 1) is no edge to move a spot to. */
const SNAP_EDGE = 0.2;
/** What a step costs on the strongest edge, against 1 on none: low, so the way keeps to an edge round a long bend. */
const EDGE_STEP_COST = 0.05;
/**
 * What a step costs for each traced pixel it lies off the straight line between the ends: little
 * beside an edge's pull, but where there is no edge it keeps the way on the straight line, rather than
 * on any of the many ways as short as it (a diagonal and then straight on, say).
 */
const LINE_PULL = 0.002;
/** How far the way may stray from the box round its ends: a share of their distance, and at least this many traced pixels. */
const CORRIDOR_SHARE = 0.4;
const MIN_CORRIDOR = 10;
/** The edge strength that counts as full: this share of the pixels lie on a weaker edge. */
const FULL_EDGE_SHARE = 0.985;
/** How closely the way is kept when its steps are thinned out, in traced pixels. */
const PATH_TOLERANCE = 0.6;

/**
 * How strong an edge each pixel of the traced picture lies on, 0 to 1: the colour's steepest change
 * there (Sobel, the strongest of the three channels; a transparent pixel counts as white), as a share
 * of a strong edge of this picture, so a soft photo has edges as well as a hard drawing.
 */
export function edgeStrength(picture: PreparedPicture): Float32Array {
  if (picture.edges) return picture.edges;
  const { width, height, data } = picture.pixels;
  const channels = [0, 1, 2].map((channel) => {
    const out = new Float32Array(width * height);
    for (let index = 0; index < width * height; index += 1) {
      const opacity = data[index * 4 + 3] / 255;
      out[index] = (data[index * 4 + channel] * opacity + 255 * (1 - opacity)) / 255;
    }
    return out;
  });
  const steepness = new Float32Array(width * height);
  for (let y = 0; y < height; y += 1) {
    const up = Math.max(0, y - 1) * width;
    const row = y * width;
    const down = Math.min(height - 1, y + 1) * width;
    for (let x = 0; x < width; x += 1) {
      const left = Math.max(0, x - 1);
      const right = Math.min(width - 1, x + 1);
      let most = 0;
      for (const value of channels) {
        const across = value[up + right] + 2 * value[row + right] + value[down + right] - value[up + left] - 2 * value[row + left] - value[down + left];
        const along = value[down + left] + 2 * value[down + x] + value[down + right] - value[up + left] - 2 * value[up + x] - value[up + right];
        most = Math.max(most, Math.hypot(across, along));
      }
      steepness[row + x] = most;
    }
  }
  // A strong edge of this picture: few pixels lie on a stronger one (counted in 1024 steps up to the steepest). Never less than a faint step, so an even picture has no edges.
  let steepest = 0;
  for (const value of steepness) steepest = Math.max(steepest, value);
  const counts = new Uint32Array(1024);
  for (const value of steepness) counts[Math.min(1023, Math.floor((value / Math.max(1e-9, steepest)) * 1024))] += 1;
  let below = 0;
  let step = 0;
  while (step < 1023 && below + counts[step] <= steepness.length * FULL_EDGE_SHARE) below += counts[step++];
  const full = Math.max(0.4, ((step + 1) / 1024) * steepest);
  const edges = steepness.map((value) => Math.min(1, value / full));
  picture.edges = edges;
  return edges;
}

const toTraced = (picture: PreparedPicture, spot: TracePoint) => ({
  x: Math.min(picture.pixels.width - 1, Math.max(0, Math.floor(spot.x / picture.scaleX))),
  y: Math.min(picture.pixels.height - 1, Math.max(0, Math.floor(spot.y / picture.scaleY))),
});
const toPicture = (picture: PreparedPicture, x: number, y: number): TracePoint => ({ x: (x + 0.5) * picture.scaleX, y: (y + 0.5) * picture.scaleY });

/**
 * The spot moved onto the strongest edge near it (within a few traced pixels, the nearer the better),
 * in the picture's own pixels; where no edge is near, the spot as it is.
 */
export function snapToEdge(picture: PreparedPicture, spot: TracePoint): TracePoint {
  const edges = edgeStrength(picture);
  const { width, height } = picture.pixels;
  const centre = toTraced(picture, spot);
  let best: { x: number; y: number; score: number; edge: number } | null = null;
  for (let y = Math.max(0, centre.y - SNAP_REACH); y <= Math.min(height - 1, centre.y + SNAP_REACH); y += 1) {
    for (let x = Math.max(0, centre.x - SNAP_REACH); x <= Math.min(width - 1, centre.x + SNAP_REACH); x += 1) {
      const away = Math.hypot(x - centre.x, y - centre.y);
      if (away > SNAP_REACH) continue;
      const edge = edges[y * width + x];
      const score = edge - (0.04 * away) / SNAP_REACH;
      if (!best || score > best.score) best = { x, y, score, edge };
    }
  }
  return best && best.edge >= SNAP_EDGE ? toPicture(picture, best.x, best.y) : spot;
}

/** A queue that hands out the cheapest entry first (a binary heap). */
class CheapestFirst {
  private costs: number[] = [];
  private items: number[] = [];
  get size() {
    return this.items.length;
  }
  push(item: number, cost: number) {
    const { costs, items } = this;
    let index = items.length;
    costs.push(cost);
    items.push(item);
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (costs[parent] <= cost) break;
      costs[index] = costs[parent];
      items[index] = items[parent];
      index = parent;
    }
    costs[index] = cost;
    items[index] = item;
  }
  pop(): number {
    const { costs, items } = this;
    const top = items[0];
    const lastCost = costs.pop()!;
    const lastItem = items.pop()!;
    if (items.length) {
      let index = 0;
      for (;;) {
        let child = index * 2 + 1;
        if (child >= items.length) break;
        if (child + 1 < items.length && costs[child + 1] < costs[child]) child += 1;
        if (costs[child] >= lastCost) break;
        costs[index] = costs[child];
        items[index] = items[child];
        index = child;
      }
      costs[index] = lastCost;
      items[index] = lastItem;
    }
    return top;
  }
}

/** The steps thinned out to those the way needs to stay within `tolerance` of them (Douglas-Peucker). */
function thinned(points: readonly { x: number; y: number }[], tolerance: number) {
  if (points.length <= 2) return points.slice();
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length) {
    const [from, to] = stack.pop()!;
    const a = points[from];
    const b = points[to];
    const span = Math.hypot(b.x - a.x, b.y - a.y);
    let farthest = -1;
    let most = tolerance;
    for (let index = from + 1; index < to; index += 1) {
      const point = points[index];
      const off = span < 1e-9
        ? Math.hypot(point.x - a.x, point.y - a.y)
        : Math.abs((b.x - a.x) * (a.y - point.y) - (a.x - point.x) * (b.y - a.y)) / span;
      if (off > most) {
        most = off;
        farthest = index;
      }
    }
    if (farthest < 0) continue;
    keep[farthest] = 1;
    stack.push([from, farthest], [farthest, to]);
  }
  return points.filter((_, index) => keep[index]);
}

/**
 * The way from one spot to another along the strongest edges between them, in the picture's own
 * pixels: its first point at `from`, its last at `to` (both on the traced picture's pixel middles),
 * thinned to the points it needs. Where no edge runs between them, it is about the straight line.
 */
export function edgePath(picture: PreparedPicture, from: TracePoint, to: TracePoint): TracePoint[] {
  const edges = edgeStrength(picture);
  const { width, height } = picture.pixels;
  const start = toTraced(picture, from);
  const end = toTraced(picture, to);
  if (start.x === end.x && start.y === end.y) return [toPicture(picture, start.x, start.y)];
  const margin = Math.max(MIN_CORRIDOR, Math.ceil(CORRIDOR_SHARE * Math.hypot(end.x - start.x, end.y - start.y)));
  const left = Math.max(0, Math.min(start.x, end.x) - margin);
  const top = Math.max(0, Math.min(start.y, end.y) - margin);
  const boxWidth = Math.min(width - 1, Math.max(start.x, end.x) + margin) - left + 1;
  const boxHeight = Math.min(height - 1, Math.max(start.y, end.y) + margin) - top + 1;
  const cost = new Float32Array(boxWidth * boxHeight);
  const lineX = end.x - start.x;
  const lineY = end.y - start.y;
  const lineLength = lineX * lineX + lineY * lineY;
  for (let y = 0; y < boxHeight; y += 1) {
    for (let x = 0; x < boxWidth; x += 1) {
      const weak = 1 - edges[(top + y) * width + left + x];
      const along = Math.min(1, Math.max(0, ((left + x - start.x) * lineX + (top + y - start.y) * lineY) / lineLength));
      const off = Math.hypot(left + x - start.x - along * lineX, top + y - start.y - along * lineY);
      cost[y * boxWidth + x] = EDGE_STEP_COST + weak * weak + LINE_PULL * off;
    }
  }
  const spent = new Float64Array(boxWidth * boxHeight).fill(Infinity);
  const cameFrom = new Int32Array(boxWidth * boxHeight).fill(-1);
  const done = new Uint8Array(boxWidth * boxHeight);
  const source = (start.y - top) * boxWidth + start.x - left;
  const target = (end.y - top) * boxWidth + end.x - left;
  const queue = new CheapestFirst();
  spent[source] = 0;
  queue.push(source, 0);
  while (queue.size) {
    const cell = queue.pop();
    if (done[cell]) continue;
    done[cell] = 1;
    if (cell === target) break;
    const x = cell % boxWidth;
    const y = (cell - x) / boxWidth;
    for (let dy = -1; dy <= 1; dy += 1) {
      const ny = y + dy;
      if (ny < 0 || ny >= boxHeight) continue;
      for (let dx = -1; dx <= 1; dx += 1) {
        const nx = x + dx;
        if ((dx === 0 && dy === 0) || nx < 0 || nx >= boxWidth) continue;
        const next = ny * boxWidth + nx;
        if (done[next]) continue;
        const step = (dx && dy ? Math.SQRT2 : 1) * (cost[cell] + cost[next]) / 2;
        const total = spent[cell] + step;
        if (total < spent[next]) {
          spent[next] = total;
          cameFrom[next] = cell;
          queue.push(next, total);
        }
      }
    }
  }
  const steps: { x: number; y: number }[] = [];
  for (let cell = target; cell >= 0; cell = cell === source ? -1 : cameFrom[cell]) {
    const x = cell % boxWidth;
    steps.push({ x: left + x, y: top + (cell - x) / boxWidth });
  }
  steps.reverse();
  return thinned(steps, PATH_TOLERANCE).map((step) => toPicture(picture, step.x, step.y));
}
