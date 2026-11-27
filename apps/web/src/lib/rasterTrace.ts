/*
 * A picture (PNG, JPG) as an outline: the pixels of one part of it - the dark or the light one -
 * become closed lines round that part, written as an SVG with one filled path. The SVG then goes
 * the way of any other SVG file, so a traced picture is checked, imported and built exactly as a
 * drawn one.
 *
 * The outline runs where the picture changes from one part to the other (marching squares on the
 * pixels, between their centres), so a soft edge gives a smooth line, and a short, straight run of
 * the line becomes one piece. Specks smaller than a few pixels are left out. Transparent pixels are
 * never part of the shape.
 */

/** RGBA pixels, four bytes each, row by row from the top - as a canvas's ImageData holds them. */
export type RasterPixels = { width: number; height: number; data: Uint8ClampedArray | Uint8Array };

/** Which part of the picture becomes the shape. */
export type RasterPart = "dark" | "light";

export type RasterTraceOptions = {
  /** The dark part (a black logo on white) or the light one (a white logo on black). Dark by default. */
  part?: RasterPart;
  /** Where dark turns light, 0 to 1. 0.5 by default. */
  threshold?: number;
  /**
   * Every pixel that is not transparent is the shape, whatever its colour (`part` is not used): for a
   * picture on a transparent background, where the transparency already says what the picture is.
   */
  byOpacity?: boolean;
  /** At most this many line pieces in the whole outline; the line is straightened until it fits. */
  maxSegments?: number;
  /** How wide the outline comes out, in the SVG's units, its height in proportion. One pixel one unit by default. */
  width?: number;
};

export type RasterTrace = {
  /** The outline as an SVG file's text, one pixel being one unit unless a width was asked for. */
  svg: string;
  /** How many closed lines the outline has. */
  rings: number;
  /** How many line pieces all of them have together. */
  segments: number;
};

/** A picture larger than this, in pixels along its longer side, is shrunk before it is traced. */
export const MAX_RASTER_TRACE_SIDE = 1000;
/** As many line pieces as an outline gets by default: few enough for the CAD kernel to build quickly. */
export const DEFAULT_RASTER_TRACE_SEGMENTS = 1200;
export const RASTER_TRACE_EMPTY = "The picture has no shape to trace";

const FIRST_TOLERANCE = 0.35;
const MAX_TOLERANCE = 6;

type Point = { x: number; y: number };

/** The picture shrunk so its longer side is at most `maxSide` pixels, each new pixel the average of those it covers. */
export function shrinkRaster(pixels: RasterPixels, maxSide = MAX_RASTER_TRACE_SIDE): RasterPixels {
  const { width, height, data } = pixels;
  const factor = Math.max(width, height) / maxSide;
  if (factor <= 1) return pixels;
  const newWidth = Math.max(1, Math.round(width / factor));
  const newHeight = Math.max(1, Math.round(height / factor));
  const out = new Uint8ClampedArray(newWidth * newHeight * 4);
  for (let y = 0; y < newHeight; y += 1) {
    const fromY = Math.floor((y * height) / newHeight);
    const toY = Math.max(fromY + 1, Math.floor(((y + 1) * height) / newHeight));
    for (let x = 0; x < newWidth; x += 1) {
      const fromX = Math.floor((x * width) / newWidth);
      const toX = Math.max(fromX + 1, Math.floor(((x + 1) * width) / newWidth));
      // Colours weighed by their opacity, so a transparent pixel's colour does not tint the edge.
      let red = 0;
      let green = 0;
      let blue = 0;
      let alpha = 0;
      let count = 0;
      for (let sy = fromY; sy < toY; sy += 1) {
        for (let sx = fromX; sx < toX; sx += 1) {
          const index = (sy * width + sx) * 4;
          const opacity = data[index + 3];
          red += data[index] * opacity;
          green += data[index + 1] * opacity;
          blue += data[index + 2] * opacity;
          alpha += opacity;
          count += 1;
        }
      }
      const target = (y * newWidth + x) * 4;
      if (alpha > 0) {
        out[target] = red / alpha;
        out[target + 1] = green / alpha;
        out[target + 2] = blue / alpha;
      }
      out[target + 3] = alpha / count;
    }
  }
  return { width: newWidth, height: newHeight, data: out };
}

/**
 * How much each pixel belongs to the shape, 0 to 1, on a grid one pixel wider on every side (that
 * border is empty, so every line closes). A transparent pixel belongs to nothing.
 */
export function shapeField(pixels: RasterPixels, part: RasterPart, byOpacity = false) {
  const { width, height, data } = pixels;
  const gridWidth = width + 2;
  const field = new Float32Array(gridWidth * (height + 2));
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const lightness = (0.2126 * data[index] + 0.7152 * data[index + 1] + 0.0722 * data[index + 2]) / 255;
      const opacity = data[index + 3] / 255;
      field[(y + 1) * gridWidth + x + 1] = byOpacity ? opacity : opacity * (part === "dark" ? 1 - lightness : lightness);
    }
  }
  return softened(field, gridWidth, height + 2);
}

/** The field blurred by a 3x3 weighting (1 2 1), which rounds off the steps of hard pixel edges. */
export function softened(field: Float32Array, width: number, height: number) {
  const across = new Float32Array(field.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x;
      across[index] = (field[index - 1] + 2 * field[index] + field[index + 1]) / 4;
    }
  }
  const out = new Float32Array(field.length);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      out[index] = (across[index - width] + 2 * across[index] + across[index + width]) / 4;
    }
  }
  return out;
}

/**
 * The closed lines where the field crosses `threshold` (marching squares). Grid point (x, y) is the
 * centre of pixel (x - 1, y - 1); the lines come back in pixel coordinates.
 */
export function fieldRings(field: Float32Array, width: number, height: number, threshold: number): Point[][] {
  const value = (x: number, y: number) => field[y * width + x];
  // A crossing on the edge from grid point (x, y) to the right (even key) or downward (odd key).
  const crossing = (key: number): Point => {
    const down = key % 2 === 1;
    const cell = Math.floor(key / 2);
    const x = cell % width;
    const y = Math.floor(cell / width);
    const from = value(x, y);
    const to = down ? value(x, y + 1) : value(x + 1, y);
    const t = to === from ? 0.5 : Math.min(1, Math.max(0, (threshold - from) / (to - from)));
    return down ? { x: x - 0.5, y: y + t - 0.5 } : { x: x + t - 0.5, y: y - 0.5 };
  };
  // Every piece joins two crossings; every crossing lies on exactly two pieces.
  const ends = new Map<number, number[]>();
  const pieces: [number, number][] = [];
  const join = (a: number, b: number) => {
    const piece = pieces.length;
    pieces.push([a, b]);
    for (const key of [a, b]) {
      const list = ends.get(key);
      if (list) list.push(piece);
      else ends.set(key, [piece]);
    }
  };
  for (let y = 0; y < height - 1; y += 1) {
    for (let x = 0; x < width - 1; x += 1) {
      const topLeft = value(x, y) >= threshold;
      const topRight = value(x + 1, y) >= threshold;
      const bottomRight = value(x + 1, y + 1) >= threshold;
      const bottomLeft = value(x, y + 1) >= threshold;
      const kind = (topLeft ? 8 : 0) | (topRight ? 4 : 0) | (bottomRight ? 2 : 0) | (bottomLeft ? 1 : 0);
      if (kind === 0 || kind === 15) continue;
      const top = 2 * (y * width + x);
      const bottom = 2 * ((y + 1) * width + x);
      const left = 2 * (y * width + x) + 1;
      const right = 2 * (y * width + x + 1) + 1;
      const middleInside = (value(x, y) + value(x + 1, y) + value(x + 1, y + 1) + value(x, y + 1)) / 4 >= threshold;
      switch (kind) {
        case 1: case 14: join(left, bottom); break;
        case 2: case 13: join(bottom, right); break;
        case 3: case 12: join(left, right); break;
        case 4: case 11: join(top, right); break;
        case 6: case 9: join(top, bottom); break;
        case 7: case 8: join(top, left); break;
        case 5:
          if (middleInside) { join(top, left); join(bottom, right); } else { join(top, right); join(left, bottom); }
          break;
        case 10:
          if (middleInside) { join(top, right); join(left, bottom); } else { join(top, left); join(bottom, right); }
          break;
      }
    }
  }
  const used = new Uint8Array(pieces.length);
  const rings: Point[][] = [];
  for (let start = 0; start < pieces.length; start += 1) {
    if (used[start]) continue;
    const ring: Point[] = [];
    let piece = start;
    let key = pieces[start][0];
    while (!used[piece]) {
      used[piece] = 1;
      ring.push(crossing(key));
      key = pieces[piece][0] === key ? pieces[piece][1] : pieces[piece][0];
      const next = ends.get(key)!.find((candidate) => !used[candidate]);
      if (next === undefined) break;
      piece = next;
    }
    rings.push(ring);
  }
  return rings;
}

export function ringArea(ring: Point[]) {
  let area = 0;
  for (let index = 0; index < ring.length; index += 1) {
    const a = ring[index];
    const b = ring[(index + 1) % ring.length];
    area += a.x * b.y - b.x * a.y;
  }
  return Math.abs(area) / 2;
}

/** Below every tolerance a ring is straightened with (the halving in simpleStraightenedRings stops at a quarter of the first). */
const FINEST_TOLERANCE = FIRST_TOLERANCE / 8;

/**
 * How far each point of an open run may be straightened away (Douglas-Peucker): a point stays at a
 * tolerance when its weight is above it. The farthest point of a stretch, where the stretch is cut,
 * does not depend on the tolerance, only whether it is cut does: a point stays when it and every
 * cut above it lie farther than the tolerance. So the cuts are worked out once and each tolerance
 * only reads them; worked out again for every tolerance, a traced line drawing of a couple of
 * hundred thousand points took seconds with the page frozen. The ends always stay.
 */
function straighteningWeights(points: Point[]): Float64Array {
  const weights = new Float64Array(points.length);
  weights[0] = Infinity;
  weights[points.length - 1] = Infinity;
  const stack: [number, number, number][] = [[0, points.length - 1, Infinity]];
  while (stack.length) {
    const [from, to, above] = stack.pop()!;
    const a = points[from], b = points[to];
    const dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy);
    let farthest = -1;
    let distance = FINEST_TOLERANCE;
    for (let index = from + 1; index < to; index += 1) {
      const p = points[index];
      const d = length < 1e-12 ? Math.hypot(p.x - a.x, p.y - a.y) : Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / length;
      if (d > distance) {
        distance = d;
        farthest = index;
      }
    }
    if (farthest >= 0) {
      const weight = Math.min(distance, above);
      weights[farthest] = weight;
      stack.push([from, farthest, weight], [farthest, to, weight]);
    }
  }
  return weights;
}

/** The points of an open run that stay when every point closer than `tolerance` to the straight line is dropped (Douglas-Peucker). */
function straightened(points: Point[], weights: Float64Array, tolerance: number): Point[] {
  return points.filter((_, index) => weights[index] > tolerance);
}

/** A closed line cut at its first point and the point farthest from it, with the weights of each half. */
type RingHalves = { first: Point[]; firstWeights: Float64Array; second: Point[]; secondWeights: Float64Array };
const ringHalves = new WeakMap<Point[], RingHalves>();

/** A closed line straightened: cut at its first point and the point farthest from it, each half on its own. */
function straightenedRing(ring: Point[], tolerance: number): Point[] {
  if (ring.length < 4) return ring;
  let halves = ringHalves.get(ring);
  if (!halves) {
    let farthest = 1;
    ring.forEach((point, index) => {
      if (Math.hypot(point.x - ring[0].x, point.y - ring[0].y) > Math.hypot(ring[farthest].x - ring[0].x, ring[farthest].y - ring[0].y)) farthest = index;
    });
    const first = ring.slice(0, farthest + 1);
    const second = [...ring.slice(farthest), ring[0]];
    halves = { first, firstWeights: straighteningWeights(first), second, secondWeights: straighteningWeights(second) };
    ringHalves.set(ring, halves);
  }
  const first = straightened(halves.first, halves.firstWeights, tolerance);
  const second = straightened(halves.second, halves.secondWeights, tolerance);
  return [...first.slice(0, -1), ...second.slice(0, -1)];
}

/** Whether two segments cross or touch, other than at a corner they share. */
function segmentsMeet(a: Point, b: Point, c: Point, d: Point) {
  const side = (p: Point, q: Point, r: Point) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const d1 = side(c, d, a), d2 = side(c, d, b), d3 = side(a, b, c), d4 = side(a, b, d);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
  const on = (p: Point, q: Point, r: Point) => Math.min(p.x, q.x) <= r.x && r.x <= Math.max(p.x, q.x) && Math.min(p.y, q.y) <= r.y && r.y <= Math.max(p.y, q.y);
  return (d1 === 0 && on(c, d, a)) || (d2 === 0 && on(c, d, b)) || (d3 === 0 && on(a, b, c)) || (d4 === 0 && on(a, b, d));
}

/**
 * Whether a closed ring crosses or touches itself: the kernel cannot make a face of such a ring. The
 * sides are put in a grid of buckets, so each is held only against the sides near it: a traced line
 * drawing makes rings of a couple of hundred thousand corners, and holding every side against
 * every other took seconds with the page frozen. Neighbouring sides share a corner and are not held
 * against each other, as before.
 */
export function ringCrossesItself(ring: Point[]) {
  const n = ring.length;
  if (n < 4) return false;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, length = 0;
  for (let i = 0; i < n; i += 1) {
    const a = ring[i], b = ring[(i + 1) % n];
    minX = Math.min(minX, a.x); maxX = Math.max(maxX, a.x);
    minY = Math.min(minY, a.y); maxY = Math.max(maxY, a.y);
    length += Math.hypot(b.x - a.x, b.y - a.y);
  }
  // About one side per bucket, and buckets no smaller than an average side.
  const size = Math.max(length / n, Math.hypot(maxX - minX, maxY - minY) / Math.sqrt(n), 1e-9);
  const columns = Math.floor((maxX - minX) / size) + 1;
  const buckets = new Map<number, number[]>();
  for (let i = 0; i < n; i += 1) {
    const a = ring[i], b = ring[(i + 1) % n];
    const x0 = Math.floor((Math.min(a.x, b.x) - minX) / size), x1 = Math.floor((Math.max(a.x, b.x) - minX) / size);
    const y0 = Math.floor((Math.min(a.y, b.y) - minY) / size), y1 = Math.floor((Math.max(a.y, b.y) - minY) / size);
    for (let y = y0; y <= y1; y += 1) {
      for (let x = x0; x <= x1; x += 1) {
        const key = y * columns + x;
        const list = buckets.get(key);
        if (list) list.push(i);
        else buckets.set(key, [i]);
      }
    }
  }
  for (const sides of buckets.values()) {
    for (let p = 0; p < sides.length; p += 1) {
      for (let q = p + 1; q < sides.length; q += 1) {
        const i = Math.min(sides[p], sides[q]), j = Math.max(sides[p], sides[q]);
        // Neighbours share a corner: the next side, and the first and the last side.
        if (j - i === 1 || (i === 0 && j === n - 1)) continue;
        if (segmentsMeet(ring[i], ring[(i + 1) % n], ring[j], ring[(j + 1) % n])) return true;
      }
    }
  }
  return false;
}

/**
 * A ring without its repeated corners, cut where it comes back to a corner it passed before: two
 * parts of a picture that meet in one point make a figure eight, which the kernel cannot make a
 * face of, and as two rings it is the same area.
 */
function pinchedApart(ring: Point[]): Point[][] {
  const points = ring.filter((point, index) => {
    const next = ring[(index + 1) % ring.length];
    return ring.length < 2 || point.x !== next.x || point.y !== next.y;
  });
  const rings: Point[][] = [];
  const path: Point[] = [];
  const seen = new Map<string, number>();
  for (const point of points) {
    const key = `${point.x},${point.y}`;
    const at = seen.get(key);
    if (at === undefined) {
      seen.set(key, path.length);
      path.push(point);
      continue;
    }
    // Back at a corner passed before: the loop since then is a ring of its own.
    const loop = path.splice(at + 1);
    loop.forEach((corner) => seen.delete(`${corner.x},${corner.y}`));
    if (loop.length >= 2) rings.push([path[at], ...loop]);
  }
  if (path.length >= 3) rings.push(path);
  return rings.filter((piece) => piece.length >= 3);
}

/**
 * A ring straightened as far as `tolerance` lets it, unless that makes it cross itself - a thin
 * part of a picture straightened into a bow tie (Discussion #1997) - then straightened less, and in
 * the end the traced ring itself; each cut apart where it touches itself.
 */
function simpleStraightenedRings(ring: Point[], tolerance: number): Point[][] {
  for (let step = tolerance; step >= FIRST_TOLERANCE / 4; step /= 2) {
    const pieces = pinchedApart(straightenedRing(ring, step));
    if (!pieces.some(ringCrossesItself)) return pieces;
  }
  return pinchedApart(ring);
}

const coordinate = (value: number) => String(Math.round(value * 100) / 100);

/**
 * The closed lines round one part of a picture, straightened, in the pixels of the picture as it
 * was traced (shrunk to MAX_RASTER_TRACE_SIDE at most; its size comes along): x to the right, y
 * down, a pixel's edges on whole numbers. Throws RASTER_TRACE_EMPTY when that part has nothing
 * larger than a speck.
 */
export function traceRasterRings(source: RasterPixels, options: RasterTraceOptions = {}): { rings: Array<Array<{ x: number; y: number }>>; width: number; height: number } {
  const pixels = shrinkRaster(source);
  const { width, height } = pixels;
  const threshold = Math.min(0.95, Math.max(0.05, options.threshold ?? 0.5));
  const maxSegments = Math.max(8, options.maxSegments ?? DEFAULT_RASTER_TRACE_SEGMENTS);
  const field = shapeField(pixels, options.part ?? "dark", options.byOpacity === true);
  // A speck: smaller than a few pixels, or than a thousandth of a percent of the picture.
  const speck = Math.max(3, width * height * 1e-5);
  const rings = fieldRings(field, width + 2, height + 2, threshold).filter((ring) => ring.length >= 3 && ringArea(ring) >= speck);
  if (!rings.length) throw new Error(RASTER_TRACE_EMPTY);
  let tolerance = FIRST_TOLERANCE;
  let lines: Point[][] = [];
  for (;;) {
    lines = rings.flatMap((ring) => simpleStraightenedRings(ring, tolerance)).filter((ring) => ring.length >= 3);
    const segments = lines.reduce((sum, ring) => sum + ring.length, 0);
    if (segments <= maxSegments || tolerance >= MAX_TOLERANCE) break;
    tolerance = Math.min(MAX_TOLERANCE, tolerance * 1.35);
  }
  if (!lines.length) throw new Error(RASTER_TRACE_EMPTY);
  return { rings: lines, width, height };
}

/**
 * Traces one part of a picture as an outline. Throws RASTER_TRACE_EMPTY when that part has
 * nothing larger than a speck.
 */
export function traceRaster(source: RasterPixels, options: RasterTraceOptions = {}): RasterTrace {
  const { rings: lines, width, height } = traceRasterRings(source, options);
  let unit = 1;
  if (options.width !== undefined) {
    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    for (const point of lines.flat()) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
    }
    unit = options.width / Math.max(1e-6, maxX - minX);
  }
  const path = lines.map((ring) => `M${ring.map((point) => `${coordinate(point.x * unit)} ${coordinate(point.y * unit)}`).join("L")}Z`).join("");
  const svgWidth = coordinate(width * unit);
  const svgHeight = coordinate(height * unit);
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}"><path fill="#000000" fill-rule="evenodd" d="${path}"/></svg>`,
    rings: lines.length,
    segments: lines.reduce((sum, ring) => sum + ring.length, 0),
  };
}
