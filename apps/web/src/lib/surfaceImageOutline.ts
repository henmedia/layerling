/**
 * Outlines of a drawing, for an image pressed on once (#1268): where the grey of the drawing crosses half, found on a
 * fine raster of it, so the surface can be cut along them as it is along a text's letters, instead of following the
 * points of a small grey image (which came out in steps on a slanted line or a curve).
 */

/** How fine the drawing is looked at: points on its longer side. */
export const SURFACE_IMAGE_OUTLINE_RASTER = 1024;

/** The outlines are kept in whole numbers of this many parts of the image's width and height (a short number in the design). */
export const SURFACE_IMAGE_OUTLINE_UNITS = 8192;

/** At most this many points in all outlines of one image; beyond that they are simplified further. */
export const SURFACE_IMAGE_OUTLINE_MAX_POINTS = 20_000;

/** A drawing counts as drawn in two tones when at least this share of its points is close to dark or to light. */
const TWO_TONES_SHARE = 0.9;

/** The grey value of every point, 0 to 1, as the one's own image makes it (see surfaceTextureOwnImage): light = ink. */
export function drawingGrey(rgba: ArrayLike<number>, width: number, height: number) {
  const brightness = (o: number) => 0.299 * rgba[o] + 0.587 * rgba[o + 1] + 0.114 * rgba[o + 2];
  let clear = 0, ink = 0, opacity = 0;
  for (let o = 0; o < width * height * 4; o += 4) {
    const alpha = rgba[o + 3] / 255;
    if (alpha < 0.5) clear += 1;
    ink += brightness(o) * alpha;
    opacity += alpha;
  }
  const darkDrawing = clear > 0 && opacity > 0 && ink / opacity < 64;
  const grey = new Float32Array(width * height);
  for (let i = 0; i < grey.length; i += 1) {
    const o = i * 4;
    grey[i] = ((darkDrawing ? 255 - brightness(o) : brightness(o)) * (rgba[o + 3] / 255)) / 255;
  }
  return grey;
}

/** Whether nearly all of a drawing is dark or light (a line drawing, a logo): one in shades keeps its shades. */
export function inTwoTones(grey: ArrayLike<number>) {
  if (!grey.length) return false;
  let sure = 0;
  for (let i = 0; i < grey.length; i += 1) if (grey[i] < 0.2 || grey[i] > 0.8) sure += 1;
  return sure / grey.length >= TWO_TONES_SHARE;
}

/**
 * The lines where the grey crosses 0.5, as closed rings [u0, v0, u1, v1, ...] in whole numbers of
 * SURFACE_IMAGE_OUTLINE_UNITS across the image, v up. Marching squares over the points' middles, the crossing put
 * where the grey interpolates to 0.5 (so an anti-aliased edge is found between its points), the image's border a ground.
 */
export function drawingOutlines(grey: ArrayLike<number>, width: number, height: number, maxPoints = SURFACE_IMAGE_OUTLINE_MAX_POINTS): number[][] {
  if (width < 2 || height < 2) return [];
  // One ground point round the drawing, so a shape that reaches the border still closes.
  const W = width + 2;
  const f = (x: number, y: number) => (x < 0 || y < 0 || x >= width || y >= height ? -0.5 : grey[y * width + x] - 0.5);
  // A crossing is named by the edge it lies on: horizontal edges (between x and x + 1 at row y) and vertical ones.
  const pointsX: number[] = [], pointsY: number[] = [];
  const named = new Map<number, number>();
  const crossing = (x0: number, y0: number, x1: number, y1: number) => {
    const horizontal = y0 === y1;
    const key = horizontal ? (y0 + 1) * W * 2 + (x0 + 1) * 2 : (y0 + 1) * W * 2 + (x0 + 1) * 2 + 1;
    const got = named.get(key);
    if (got !== undefined) return got;
    const a = f(x0, y0), b = f(x1, y1);
    const t = a === b ? 0.5 : a / (a - b);
    pointsX.push(x0 + 0.5 + t * (x1 - x0));
    pointsY.push(y0 + 0.5 + t * (y1 - y0));
    named.set(key, pointsX.length - 1);
    return pointsX.length - 1;
  };
  const next = new Map<number, number[]>();
  const link = (a: number, b: number) => {
    const from = next.get(a);
    if (from) from.push(b);
    else next.set(a, [b]);
    const to = next.get(b);
    if (to) to.push(a);
    else next.set(b, [a]);
  };
  for (let y = -1; y < height; y += 1) {
    for (let x = -1; x < width; x += 1) {
      const tl = f(x, y), tr = f(x + 1, y), br = f(x + 1, y + 1), bl = f(x, y + 1);
      const code = (tl > 0 ? 1 : 0) | (tr > 0 ? 2 : 0) | (br > 0 ? 4 : 0) | (bl > 0 ? 8 : 0);
      if (code === 0 || code === 15) continue;
      const top = () => crossing(x, y, x + 1, y), right = () => crossing(x + 1, y, x + 1, y + 1);
      const bottom = () => crossing(x, y + 1, x + 1, y + 1), left = () => crossing(x, y, x, y + 1);
      switch (code) {
        case 1: case 14: link(left(), top()); break;
        case 2: case 13: link(top(), right()); break;
        case 3: case 12: link(left(), right()); break;
        case 4: case 11: link(right(), bottom()); break;
        case 6: case 9: link(top(), bottom()); break;
        case 7: case 8: link(left(), bottom()); break;
        case 5: case 10: {
          // Two corners across from each other: the middle's grey decides whether they are joined or apart.
          const joined = (tl + tr + br + bl) / 4 > 0;
          const light = code === 5;
          if (joined === light) {
            link(left(), bottom());
            link(top(), right());
          } else {
            link(left(), top());
            link(right(), bottom());
          }
          break;
        }
        default: break;
      }
    }
  }
  // Follow the links into rings: every crossing has two.
  const done = new Set<number>();
  const rings: Array<Array<[number, number]>> = [];
  for (const start of next.keys()) {
    if (done.has(start)) continue;
    const ring: Array<[number, number]> = [];
    let previous = -1, at = start;
    for (let guard = 0; guard <= pointsX.length + 1; guard += 1) {
      done.add(at);
      ring.push([pointsX[at], pointsY[at]]);
      const options = next.get(at) ?? [];
      const step = options.find((o) => o !== previous && !done.has(o)) ?? options.find((o) => o !== previous && o === start && ring.length > 2);
      if (step === undefined) break;
      previous = at;
      at = step;
      if (at === start) break;
    }
    if (ring.length >= 3) rings.push(ring);
  }
  let tolerance = 0.12;
  let out: number[][] = [];
  for (let round = 0; round < 12; round += 1) {
    out = rings.map((ring) => simplifyRing(ring, tolerance)).filter((ring) => ring.length >= 3).map((ring) => toUnits(ring, width, height));
    if (out.reduce((sum, ring) => sum + ring.length / 2, 0) <= maxPoints) break;
    tolerance *= 1.6;
  }
  return out.filter((ring) => ring.length >= 6);
}

/** The points of a ring in whole parts of the image (v up). */
function toUnits(ring: Array<[number, number]>, width: number, height: number) {
  const out: number[] = [];
  for (const [x, y] of ring) {
    out.push(Math.round((x / width) * SURFACE_IMAGE_OUTLINE_UNITS), Math.round((1 - y / height) * SURFACE_IMAGE_OUTLINE_UNITS));
  }
  return out;
}

/** A closed ring with the points that lie within `tolerance` of a straight line between their neighbours dropped (Douglas-Peucker). */
function simplifyRing(ring: Array<[number, number]>, tolerance: number): Array<[number, number]> {
  const n = ring.length;
  if (n <= 4) return ring;
  // Split at the point farthest from the first, so both halves have a clear chord.
  let far = 1, best = -1;
  for (let i = 1; i < n; i += 1) {
    const d = (ring[i][0] - ring[0][0]) ** 2 + (ring[i][1] - ring[0][1]) ** 2;
    if (d > best) {
      best = d;
      far = i;
    }
  }
  const keep = new Uint8Array(n);
  keep[0] = 1;
  keep[far] = 1;
  const run = (from: number, to: number) => {
    const stack: Array<[number, number]> = [[from, to]];
    while (stack.length) {
      const [a, b] = stack.pop() as [number, number];
      if (b - a < 2) continue;
      const [ax, ay] = ring[a % n], [bx, by] = ring[b % n];
      const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
      let worst = -1, at = -1;
      for (let i = a + 1; i < b; i += 1) {
        const [px, py] = ring[i % n];
        const t = l2 > 0 ? Math.min(1, Math.max(0, ((px - ax) * dx + (py - ay) * dy) / l2)) : 0;
        const d = Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
        if (d > worst) {
          worst = d;
          at = i;
        }
      }
      if (worst > tolerance && at >= 0) {
        keep[at % n] = 1;
        stack.push([a, at], [at, b]);
      }
    }
  };
  run(0, far);
  run(far, n);
  return ring.filter((_, i) => keep[i]);
}
