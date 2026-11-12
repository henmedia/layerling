/**
 * Images for the surface texture's pattern "image": grey height maps, light = the full depth. The ready ones are drawn
 * here in code (no pictures of others, no questions of licence), each tiling without a seam: noise and cells run on a
 * torus, every wave has whole periods per tile. One's own image comes in as grey values (see surfaceTextureOwnImage),
 * kept with the settings as Base64.
 */

import { SURFACE_IMAGE_OUTLINE_MAX_POINTS, SURFACE_IMAGE_OUTLINE_UNITS } from "@/lib/surfaceImageOutline";

/** The ready images, by the name the settings keep. */
export const SURFACE_TEXTURE_IMAGE_PRESETS = ["topography", "wood", "woodRift", "guilloche", "terrazzo", "craquelure", "cord", "moire", "mosaic", "folds", "fingerprint", "rosettes"] as const;
export type SurfaceTextureImagePreset = (typeof SURFACE_TEXTURE_IMAGE_PRESETS)[number];

/** A fitting tile width per ready image, mm: wide enough for its lines to print. */
export const SURFACE_TEXTURE_IMAGE_TILE: Record<SurfaceTextureImagePreset, number> = {
  topography: 90,
  wood: 80,
  woodRift: 60,
  guilloche: 70,
  terrazzo: 60,
  craquelure: 70,
  cord: 45,
  moire: 70,
  mosaic: 55,
  folds: 45,
  fingerprint: 70,
  rosettes: 45,
};

/** A grey image: values 0 to 255, a row at a time from the top. */
export type GreyImage = { width: number; height: number; data: Uint8Array };

/**
 * One's own image as the settings keep it: its size and its grey values as Base64. A drawing in two tones (an SVG) also
 * keeps its outlines (#1268): closed rings [u0, v0, u1, v1, ...] in whole numbers from 0 to SURFACE_IMAGE_OUTLINE_UNITS
 * across the image, v up, filled even-odd. Pressed on once, the surface is cut along them, as along a text's letters.
 */
export type SurfaceTextureOwnImage = { width: number; height: number; data: string; outline?: number[][] };

/** One's own image has at most this many points on its longer side (kept in the design, in every undo step). */
export const SURFACE_TEXTURE_OWN_IMAGE_SIZE = 256;

const TAU = 2 * Math.PI;
const fract = (x: number) => x - Math.floor(x);
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const wrap = (i: number, n: number) => ((i % n) + n) % n;

function hash2(i: number, j: number, seed: number) {
  let h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(seed, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1103515245);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}

/** Value noise with a period of n grid cells per tile (u, v from 0 to 1). */
function noise(u: number, v: number, n: number, seed: number) {
  return noiseXY(u, v, n, n, seed);
}

/** Value noise with a period of its own each way (nx cells across, ny along): for drawn-out shapes. */
function noiseXY(u: number, v: number, nx: number, ny: number, seed: number) {
  const x = u * nx, y = v * ny;
  const xi = Math.floor(x), yi = Math.floor(y);
  const fx = x - xi, fy = y - yi;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const h = (a: number, b: number) => hash2(wrap(xi + a, nx), wrap(yi + b, ny), seed);
  return (h(0, 0) * (1 - sx) + h(1, 0) * sx) * (1 - sy) + (h(0, 1) * (1 - sx) + h(1, 1) * sx) * sy;
}

/** A year ring over one period: the late wood rises quickly (a dark, hard line), the early wood falls softly. */
const ring = (t: number) => {
  const r = fract(t);
  return r < 0.18 ? smoothstep(0, 0.18, r) : 1 - smoothstep(0.18, 1, r);
};

function fbm(u: number, v: number, n: number, seed: number, octaves = 4) {
  let sum = 0, amp = 0.5, norm = 0;
  for (let o = 0; o < octaves; o += 1) {
    sum += amp * noise(u, v, n << o, seed + o * 101);
    norm += amp;
    amp *= 0.5;
  }
  return sum / norm;
}

/** Cells (Voronoi) on the torus: distance to the nearest cell point, to the border, and the cell's number. */
function cells(u: number, v: number, n: number, seed: number, jitter = 0.8) {
  const x = u * n, y = v * n;
  const xi = Math.floor(x), yi = Math.floor(y);
  let d1 = Infinity, d2 = Infinity, id = 0;
  let p1x = 0, p1y = 0, p2x = 0, p2y = 0;
  for (let dj = -2; dj <= 2; dj += 1) {
    for (let di = -2; di <= 2; di += 1) {
      const i = xi + di, j = yi + dj;
      const wi = wrap(i, n), wj = wrap(j, n);
      const px = i + 0.5 + jitter * (hash2(wi, wj, seed) - 0.5);
      const py = j + 0.5 + jitter * (hash2(wi, wj, seed + 7) - 0.5);
      const d = (px - x) ** 2 + (py - y) ** 2;
      if (d < d1) {
        d2 = d1;
        p2x = p1x;
        p2y = p1y;
        d1 = d;
        p1x = px;
        p1y = py;
        id = wj * n + wi;
      } else if (d < d2) {
        d2 = d;
        p2x = px;
        p2y = py;
      }
    }
  }
  const len = Math.hypot(p2x - p1x, p2y - p1y) || 1;
  return { center: Math.sqrt(d1) / n, edge: (d2 - d1) / (2 * len) / n, id };
}

/** The cross-section of a round thread: 0 to 1 over one thread's width. */
const thread = (t: number) => Math.sqrt(Math.max(0, 1 - (2 * fract(t) - 1) ** 2));
/** A triangle wave 0, 1, 0 over one period. */
const tri = (t: number) => 1 - Math.abs(2 * fract(t) - 1);
/** Distance between two values on a circle of length 1 (for lines without a seam). */
const wrapDist = (a: number, b: number) => {
  const d = fract(a - b);
  return Math.min(d, 1 - d);
};

const GENERATORS: Record<SurfaceTextureImagePreset, (u: number, v: number) => number> = {
  topography(u, v) {
    // Contour lines of a landscape: a raised line on every level.
    const h = fbm(u, v, 2, 61, 3);
    const d = Math.abs(fract(h * 9) - 0.5);
    return smoothstep(0.28, 0.46, d);
  },
  wood(u, v) {
    // A flat sawn board: year rings as nested arches, slightly bent - pointed in the middle, flatter to the side,
    // with a small second peak.
    const peak = (t: number) => tri(t) ** 1.8;
    const warp = 0.7 * fbm(u, v, 3, 141, 3);
    const phase = 6 * v - 2.4 * peak(u) - 0.5 * peak(2 * u + 0.37) + warp;
    const pores = noiseXY(u, v, 90, 14, 149);
    return 0.82 * ring(phase) + 0.18 * smoothstep(0.55, 0.9, pores);
  },
  woodRift(u, v) {
    // Rift sawn: almost straight, close rings along it, with long pores.
    const warp = 0.6 * fbm(u, v, 4, 151, 3) + 0.15 * noiseXY(u, v, 8, 2, 157);
    const lines = ring(16 * u + warp);
    const pores = noiseXY(u, v, 120, 10, 163);
    return 0.75 * lines + 0.25 * (1 - smoothstep(0.62, 0.82, pores));
  },
  guilloche(u, v) {
    // Interlaced wavy lines as on a watch's dial: two sets running against each other.
    const n = 7, w = 0.02;
    let best = 0;
    for (let k = 0; k < n; k += 1) {
      for (const dir of [1, -1]) {
        const c = (k + 0.5) / n + 0.055 * Math.sin(TAU * (3 * u + ((dir * k) / n) * 2)) * dir;
        best = Math.max(best, 1 - smoothstep(0, w, wrapDist(v, c)));
      }
    }
    return best;
  },
  terrazzo(u, v) {
    // Stone chips of different size and height in a fine-grained mass.
    let value = 0.12 + 0.1 * fbm(u, v, 32, 71, 2);
    for (const [n, seed, share] of [[5, 73, 0.75], [11, 79, 0.6], [23, 83, 0.45]]) {
      const c = cells(u, v, n, seed, 0.95);
      if (hash2(c.id, n, seed + 1) > share) continue;
      // A chip is a cell with a narrow border round it; angular, each cell a height of its own.
      const chip = smoothstep(0.001, 0.004, c.edge - 0.06 / n);
      value = Math.max(value, chip * (0.55 + 0.45 * hash2(c.id, n, seed + 2)));
    }
    return value;
  },
  craquelure(u, v) {
    // Hairline cracks as in an old glaze: coarse, wavering cracks and fine ones between them.
    const du = 0.025 * (noise(u, v, 6, 91) - 0.5), dv = 0.025 * (noise(u, v, 6, 97) - 0.5);
    const big = cells(fract(u + du), fract(v + dv), 5, 101, 0.95);
    const small = cells(fract(u + du * 2), fract(v + dv * 2), 13, 103, 0.95);
    const crackBig = 1 - smoothstep(0.002, 0.012, big.edge);
    const crackSmall = (1 - smoothstep(0.001, 0.005, small.edge)) * (hash2(small.id, 0, 107) < 0.55 ? 0.6 : 0);
    return 1 - Math.max(crackBig, crackSmall);
  },
  cord(u, v) {
    // Twisted cords in rows: slanted strands, falling away to the cord's edge.
    const rows = 6, strands = 14;
    const t = fract(v * rows);
    const s = u * strands + t * 1.6;
    return thread(s) * Math.sqrt(Math.max(0, 1 - (2 * t - 1) ** 2));
  },
  moire(u, v) {
    // Two almost equal line grids over each other: large beats.
    const g1 = 0.5 + 0.5 * Math.cos(TAU * (12 * u + 2 * v));
    const g2 = 0.5 + 0.5 * Math.cos(TAU * (13 * u - 1 * v));
    return g1 * g2;
  },
  mosaic(u, v) {
    // Little stones of different heights with a joint, set a little unevenly.
    const n = 14;
    const row = Math.floor(v * n);
    const x = u * n + 0.35 * hash2(wrap(row, n), 0, 113);
    const col = Math.floor(x);
    const fx = fract(x), fy = fract(v * n);
    const edge = Math.min(fx, 1 - fx, fy, 1 - fy);
    return smoothstep(0.06, 0.14, edge) * (0.35 + 0.65 * hash2(wrap(col, n), wrap(row, n), 127));
  },
  folds(u, v) {
    // Folded paper (Miura fold): zigzag ridges with folds across each row - slanted diamonds.
    const cols = 6, rows = 8;
    return 0.65 * tri(u * cols + 0.45 * tri(v * rows)) + 0.35 * tri(v * rows);
  },
  fingerprint(u, v) {
    // Fine ridges that follow a flow and bend into whorls.
    const warp = 5 * fbm(u, v, 2, 131, 3);
    return smoothstep(0.15, 0.85, 0.5 + 0.5 * Math.sin(TAU * (11 * u + 7 * v) + TAU * warp));
  },
  rosettes(u, v) {
    // Ornament tiles: a rosette of eight leaves and a ring in each field.
    const n = 3;
    const x = fract(u * n) - 0.5, y = fract(v * n) - 0.5;
    const r = Math.hypot(x, y), a = Math.atan2(y, x);
    const petal = 0.17 + 0.17 * Math.abs(Math.cos(4 * a));
    const leaves = r < petal ? 0.55 + 0.45 * Math.sqrt(1 - r / petal) : 0;
    const circle = 1 - smoothstep(0.01, 0.03, Math.abs(r - 0.42));
    const dot = 1 - smoothstep(0.03, 0.05, r);
    return Math.max(leaves, circle * 0.8, dot);
  },
};

const presetCache = new Map<string, GreyImage>();

/** A ready image as grey values, `size` points a side, its values spread over 0 to 255. */
export function surfaceTexturePresetImage(name: SurfaceTextureImagePreset, size = 256): GreyImage {
  const key = `${name}:${size}`;
  const cached = presetCache.get(key);
  if (cached) return cached;
  const draw = GENERATORS[name];
  const values = new Float64Array(size * size);
  let lo = Infinity, hi = -Infinity;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      // The middle of each point; row 0 is the top, v counts from the bottom.
      const value = draw((x + 0.5) / size, 1 - (y + 0.5) / size);
      values[y * size + x] = value;
      lo = Math.min(lo, value);
      hi = Math.max(hi, value);
    }
  }
  const data = new Uint8Array(size * size);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.round((255 * (values[i] - lo)) / (hi - lo || 1));
  const image = { width: size, height: size, data };
  presetCache.set(key, image);
  return image;
}

/**
 * The image's grey value at (u, v), 0 to 1, bilinear with the points' middles at (i + 0.5) / width as a graphics card
 * repeats a texture. With `clamp` it ends at its border instead of running on from the other side (mirrored tiles).
 */
export function sampleGreyImage(image: GreyImage, u: number, v: number, clamp = false) {
  const { width: w, height: h, data } = image;
  const cu = clamp ? clamp01(u) : fract(u);
  const cv = clamp ? clamp01(v) : fract(v);
  const x = cu * w - 0.5;
  const y = (1 - cv) * h - 0.5;
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const fx = x - x0, fy = y - y0;
  const at = clamp
    ? (i: number, j: number) => data[Math.min(h - 1, Math.max(0, j)) * w + Math.min(w - 1, Math.max(0, i))]
    : (i: number, j: number) => data[wrap(j, h) * w + wrap(i, w)];
  const top = at(x0, y0) * (1 - fx) + at(x0 + 1, y0) * fx;
  const bottom = at(x0, y0 + 1) * (1 - fx) + at(x0 + 1, y0 + 1) * fx;
  return (top * (1 - fy) + bottom * fy) / 255;
}

/**
 * Softened over `radius` points (three box filters, close to a Gaussian), without a seam over the tile's borders. An
 * image pressed on once has no neighbour beyond its border (`clampEdges`): softened round the tile, its left edge ran
 * over into its right one and drew a line there (#1268).
 */
export function blurGreyImage(image: GreyImage, radius: number, clampEdges = false): GreyImage {
  const r = Math.round(radius);
  if (r <= 0) return image;
  const { width: w, height: h } = image;
  const index = clampEdges ? (i: number, n: number) => Math.min(n - 1, Math.max(0, i)) : wrap;
  let a = Float64Array.from(image.data);
  let b = new Float64Array(a.length);
  for (let pass = 0; pass < 3; pass += 1) {
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        let sum = 0;
        for (let k = -r; k <= r; k += 1) sum += a[y * w + index(x + k, w)];
        b[y * w + x] = sum / (2 * r + 1);
      }
    }
    [a, b] = [b, a];
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        let sum = 0;
        for (let k = -r; k <= r; k += 1) sum += a[index(y + k, h) * w + x];
        b[y * w + x] = sum / (2 * r + 1);
      }
    }
    [a, b] = [b, a];
  }
  return { width: w, height: h, data: Uint8Array.from(a, (x) => Math.round(x)) };
}

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** Bytes as Base64, the same in a worker, in the page and in tests. */
export function bytesToBase64(bytes: Uint8Array) {
  const out: string[] = [];
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    out.push(B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (i + 1 < bytes.length ? B64[(n >> 6) & 63] : "=") + (i + 2 < bytes.length ? B64[n & 63] : "="));
  }
  return out.join("");
}

export function base64ToBytes(text: string) {
  const clean = String(text).replace(/[^A-Za-z0-9+/]/g, "");
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let o = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const n = (B64.indexOf(clean[i]) << 18) | (B64.indexOf(clean[i + 1]) << 12) | ((B64.indexOf(clean[i + 2]) & 63) << 6) | (B64.indexOf(clean[i + 3]) & 63);
    if (o < out.length) out[o++] = (n >> 16) & 255;
    if (o < out.length) out[o++] = (n >> 8) & 255;
    if (o < out.length) out[o++] = n & 255;
  }
  return out;
}

/** One's own image as the settings may keep it: whole numbers within the size, and exactly as many grey values; else null. */
export function normalizeSurfaceTextureOwnImage(input: unknown): SurfaceTextureOwnImage | null {
  if (!input || typeof input !== "object") return null;
  const { width, height, data, outline } = input as { width?: unknown; height?: unknown; data?: unknown; outline?: unknown };
  if (typeof width !== "number" || typeof height !== "number" || typeof data !== "string") return null;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 2 || height < 2) return null;
  if (width > SURFACE_TEXTURE_OWN_IMAGE_SIZE || height > SURFACE_TEXTURE_OWN_IMAGE_SIZE) return null;
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(data) || base64ToBytes(data).length !== width * height) return null;
  const rings = normalizeOwnImageOutline(outline);
  return rings.length ? { width, height, data, outline: rings } : { width, height, data };
}

/** The outlines as the settings may keep them: rings of at least three points in whole parts of the image, within the budget; the rest dropped. */
function normalizeOwnImageOutline(input: unknown): number[][] {
  if (!Array.isArray(input)) return [];
  const out: number[][] = [];
  let budget = SURFACE_IMAGE_OUTLINE_MAX_POINTS * 2;
  for (const ring of input) {
    if (!Array.isArray(ring) || ring.length < 6 || ring.length % 2 !== 0 || ring.length > budget) continue;
    if (!ring.every((value) => Number.isInteger(value) && value >= 0 && value <= SURFACE_IMAGE_OUTLINE_UNITS)) continue;
    out.push(ring.slice());
    budget -= ring.length;
  }
  return out;
}

/**
 * Pixels of a picture (RGBA, as a canvas gives them) as one's own image: grey by brightness, transparent counted as
 * dark, made smaller to SURFACE_TEXTURE_OWN_IMAGE_SIZE on its longer side by averaging.
 *
 * A dark drawing on a transparent ground - black lines, a black logo, as an SVG often is - would come out all dark
 * that way, the drawing as dark as its ground, and the texture showed nothing (#1268). On a transparent ground a dark
 * drawing counts by how dark it is: its ink becomes the full depth and the ground stays.
 */
export function surfaceTextureOwnImage(rgba: ArrayLike<number>, width: number, height: number): SurfaceTextureOwnImage {
  const scale = Math.min(1, SURFACE_TEXTURE_OWN_IMAGE_SIZE / Math.max(width, height));
  const w = Math.max(2, Math.round(width * scale)), h = Math.max(2, Math.round(height * scale));
  const sum = new Float64Array(w * h), count = new Float64Array(w * h);
  const brightness = (o: number) => 0.299 * rgba[o] + 0.587 * rgba[o + 1] + 0.114 * rgba[o + 2];
  // Whether the picture has a transparent ground (some of it see-through), and how bright what is drawn on it is.
  let clear = 0, ink = 0, opacity = 0;
  for (let o = 0; o < width * height * 4; o += 4) {
    const alpha = rgba[o + 3] / 255;
    if (alpha < 0.5) clear += 1;
    ink += brightness(o) * alpha;
    opacity += alpha;
  }
  // Clearly dark (a quarter of white at most, as black or navy ink is): a picture of all tones keeps its own.
  const darkDrawing = clear > 0 && opacity > 0 && ink / opacity < 64;
  for (let y = 0; y < height; y += 1) {
    const ty = Math.min(h - 1, Math.floor((y * h) / height));
    for (let x = 0; x < width; x += 1) {
      const tx = Math.min(w - 1, Math.floor((x * w) / width));
      const o = (y * width + x) * 4;
      const grey = (darkDrawing ? 255 - brightness(o) : brightness(o)) * (rgba[o + 3] / 255);
      sum[ty * w + tx] += grey;
      count[ty * w + tx] += 1;
    }
  }
  const data = Uint8Array.from(sum, (value, i) => Math.round(count[i] ? value / count[i] : 0));
  return { width: w, height: h, data: bytesToBase64(data) };
}

/** A short name for one's own image that changes with any of its points (FNV-1a over the Base64). */
export function ownImageKey(own: SurfaceTextureOwnImage) {
  let h = 2166136261;
  for (let i = 0; i < own.data.length; i += 1) h = Math.imul(h ^ own.data.charCodeAt(i), 16777619);
  // The outlines count too: the same grey values with other outlines is another image.
  for (const ring of own.outline ?? []) {
    h = Math.imul(h ^ ring.length, 16777619);
    for (const value of ring) h = Math.imul(h ^ value, 16777619);
  }
  return `${own.width}x${own.height}:${(h >>> 0).toString(36)}`;
}

const ownCache = new Map<string, GreyImage>();

/** One's own image as grey values to sample (kept for the last few images). */
export function ownGreyImage(own: SurfaceTextureOwnImage): GreyImage {
  const key = ownImageKey(own);
  const cached = ownCache.get(key);
  if (cached) return cached;
  const image = { width: own.width, height: own.height, data: base64ToBytes(own.data) };
  if (ownCache.size > 4) ownCache.clear();
  ownCache.set(key, image);
  return image;
}
