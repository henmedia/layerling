/**
 * Relief patterns of the vase: pattern families and leaf reliefs, each a height field over the
 * unrolled surface of the vase. The core subtracts the depth from the radius, the gallery draws its tiles from the very
 * same functions.
 *
 * Most families and most leaves come from pictures (vase-pattern-maps.mjs): a pattern is one seamless tile of heights,
 * read between its points (bilinear), so it is smooth at any size; a leaf is a signed distance field of its outline, so
 * its edge is sharp and round at any size and its dome grows with the distance from the edge. Wisp ribs, the tulip
 * petal and one's own drawn leaf are worked out here.
 * One's own picture or a text (the family `bild`) is read as the built-in pictures are, from the tile
 * vase-own-picture.mjs makes of the picture in the settings.
 *
 * Surface coordinates. Around the vase a pattern has a whole number of cells `N` (tiles of a picture), so it closes at
 * 360 degrees without a seam; `cu` counts cells around (0..N), turning along with the vase's twist. Up the vase, `cv`
 * counts cells too, measured along the contour and scaled by the local circumference ("conformal"): a cell keeps its
 * proportions wherever it lies, times the stretch. On a belly the cells grow, at a neck they shrink, and the number of
 * repeats stays the same when the profile changes - the pattern follows the measured circumference.
 *
 * Height. Every family gives h in 0..1 per point: 1 is the raised relief, which lies on the vase's own surface (the
 * profile), 0 the background, sunk in by the relief depth. Inside the height range the depth is reliefDepth x (1 - h);
 * outside it the surface stays smooth, with a soft transition at the borders. So a relief never stands out of the
 * vase's outline and never lies on it as a loose island: it is part of the wall.
 *
 * Leaves stand in rows from the bottom of the height range; a lower row lies over the row above it, and within a row
 * each leaf's left edge lies over its left neighbour's right edge - a rule that holds all round, so the overlap closes
 * at the seam too. Where one leaf lies over another, its edge stands a step above the leaf beneath.
 *
 * Print-friendly mode: going up, the surface may move outwards by at most as much as it rises (45 degrees). Every
 * lower edge of a relief then slopes instead of overhanging; the upper edges stay sharp.
 */
import { inflateSync } from 'fflate'
import { ownPicturePlaceholder, ownPictureTile } from './vase-own-picture.mjs'
import { LEAF_MAPS, PATTERN_MAPS } from './vase-pattern-maps.mjs'
import { COMPUTED_PATTERNS, computedDetail, computedHeight, isComputedPattern } from './vase-computed-patterns.mjs'

/** The pattern families with their German names (the editor shows its own, translated). */
export const PATTERNS = {
  blueten: 'Flow Petals',
  rautenwelle: 'Wave Diamond',
  tulpenblaetter: 'Tulip Leaves',
  blattfluss: 'Fließende Blätter',
  wisp: 'Wisp Ribs',
  zellen: 'Organic Voronoi',
  waben: 'Hexagon Relief',
  geflecht: 'Diamond Weave',
  wellen: 'Wellen',
  schuppen: 'Schuppen',
  kiesel: 'Kiesel',
  adern: 'Blattadern',
  blaetter: 'Blätter',
  /** One's own picture or a text (vase-own-picture.mjs): the picture is in the settings, `patternImage`. */
  bild: 'Eigenes Bild oder Text',
  /** The worked-out families (vase-computed-patterns.mjs): formulas over the wall instead of pictures. */
  ...COMPUTED_PATTERNS,
}

/** Leaf shapes; `eigen` takes the outline drawn in `leafPoints`. */
export const LEAF_SHAPES = { tulpe: 'Tulpe', ginkgo: 'Ginkgo', lotus: 'Lotus', efeu: 'Efeu', ahorn: 'Ahorn', monstera: 'Monstera', farn: 'Farn', eiche: 'Eiche', linde: 'Linde', weide: 'Weide', eigen: 'Eigenes Blatt' }

/** How the leaf rows stand: offset by half a leaf, turning up in a spiral, or straight above one another. */
export const LEAF_LAYOUTS = { verstreut: 'Verstreut', versetzt: 'Versetzt', spirale: 'Spiralförmig', regelmaessig: 'Regelmäßig' }

/** Default outline of a drawn leaf: [along 0..1 from the base to the tip, half width 0..1]. */
export const DEFAULT_LEAF_POINTS = Object.freeze([[0, 0.12], [0.18, 0.7], [0.45, 1], [0.75, 0.72], [1, 0]])

/**
 * How many of a picture's motifs one of its tiles holds across: `patternCount` counts motifs round the vase, so a tile
 * of twenty pebbles and one of a single diamond both read the same.
 */
const MOTIFS_PER_TILE = { blueten: 2, geflecht: 2, waben: 2, wellen: 3, zellen: 5, rautenwelle: 1, blattfluss: 2, schuppen: 2, kiesel: 6, adern: 2 }

/**
 * The rows a worked-out family stands in, for keeping its size (see reliefField): how high a row is, in cells, and by
 * how much of a row the rows are shifted so that their borders lie where the pattern has the least to lose - between
 * two courses of bricks, between two rows of studs. A picture's rows are its tiles.
 */
const ROW_PERIOD = { ziegel: 0.5, noppen: Math.sqrt(3) / 2, wabennetz: Math.sqrt(3) / 2, ringe: 0.5, korb: 0.5, strick: 1, gehaemmert: 1, rauschen: 1 }
const ROW_OFFSET = { noppen: 0.5, wabennetz: 0.5 }

/** Leaf width at 100 % (mm at the widest circumference: four or five large leaves round a vase 90 mm wide). */
const LEAF_WIDTH_MM = 66
/** The drawn leaves: length per width, and width per cell (more than 1: neighbours overlap at the sides). */
const DRAWN_LEAF = { tulpe: { aspect: 1.9, width: 1.0 }, eigen: { aspect: 1.7, width: 1.0 } }
/** Leaves from pictures: width per cell (their length per width is the picture's own). */
const PICTURE_LEAF_WIDTH = { ginkgo: 1.15, lotus: 1.05, efeu: 1.1, ahorn: 1.1, monstera: 1.1, farn: 1.0, eiche: 1.05, linde: 1.05, weide: 1.0 }
/** How far a leaf over another stands above it (share of the relief depth). */
const OVERLAP_STEP = 0.2
/** The lowest a leaf's edge stands above the background. */
const LEAF_EDGE = 0.2

const TAU = 2 * Math.PI

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function smooth(edge0, edge1, x) {
  if (edge1 <= edge0) return x < edge0 ? 0 : 1
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

function frac(x) {
  return x - Math.floor(x)
}

function hash2(i, j, seed) {
  let h = Math.imul(i | 0, 374761393) ^ Math.imul(j | 0, 668265263) ^ Math.imul(seed | 0, 1274126177)
  h = Math.imul(h ^ (h >>> 13), 1103515245)
  h ^= h >>> 16
  return (h >>> 0) / 4294967295
}

export function isReliefPattern(effect) {
  return Object.prototype.hasOwnProperty.call(PATTERNS, effect)
}

/** Whether a family comes from a picture (and so ignores roundness, joints and band width): a built-in one, or one's own. */
export function isPicturePattern(effect) {
  return effect === 'bild' || Object.prototype.hasOwnProperty.call(PATTERN_MAPS, effect)
}

/**
 * The tile a picture family reads its heights from: the family's built-in one, or for `bild` the vase's own picture
 * (null while it has none, and the wall stays smooth).
 */
function pictureOf(p) {
  return p.effect === 'bild' ? ownPictureTile(p.patternImage) : PATTERN_MAPS[p.effect] ?? null
}

/** Whether a leaf comes from a picture. */
export function isPictureLeaf(shape) {
  return Object.prototype.hasOwnProperty.call(LEAF_MAPS, shape)
}

/** A map's numbers, unpacked once: deflated rows of differences from the left neighbour. */
const unpacked = new Map()
function mapValues(entry) {
  // One's own picture comes as heights already.
  if (entry.values) return entry.values
  let values = unpacked.get(entry)
  if (values) return values
  const text = atob(entry.data)
  const packed = new Uint8Array(text.length)
  for (let i = 0; i < text.length; i++) packed[i] = text.charCodeAt(i)
  values = inflateSync(packed)
  const n = entry.size
  for (let y = 0; y < n; y++) {
    let sum = 0
    for (let x = 0; x < n; x++) {
      sum = (sum + values[y * n + x]) & 255
      values[y * n + x] = sum
    }
  }
  unpacked.set(entry, values)
  return values
}

/**
 * A tile softened by a Gaussian of `level` steps (sigma 2^(level/2) texels), worked out once per tile and step and
 * repeating both ways like the tile.
 */
const softened = new Map()
/** The same for one's own pictures, which come and go: kept as long as the picture is. */
const softenedOwn = new WeakMap()
// The tile and steps asked for last: every point of a wall reads the same tile at one step or two neighbouring ones.
let softEntry = null, softLevels = null
function softValues(entry, level) {
  if (level <= 0) return mapValues(entry)
  if (entry !== softEntry) {
    const kept = entry.own ? softenedOwn : softened
    let known = kept.get(entry)
    if (!known) kept.set(entry, (known = []))
    softEntry = entry
    softLevels = known
  }
  const levels = softLevels
  let out = levels[level]
  if (out) return out
  const n = entry.size
  const raw = mapValues(entry)
  const sigma = 2 ** ((level - 1) / 2)
  const reach = Math.ceil(3 * sigma)
  const kernel = new Float64Array(2 * reach + 1)
  let total = 0
  for (let k = -reach; k <= reach; k++) total += kernel[k + reach] = Math.exp(-(k * k) / (2 * sigma * sigma))
  for (let k = 0; k < kernel.length; k++) kernel[k] /= total
  const wrap = (i) => ((i % n) + n) % n
  const across = new Float32Array(n * n)
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      let sum = 0
      for (let k = -reach; k <= reach; k++) sum += kernel[k + reach] * raw[y * n + wrap(x + k)]
      across[y * n + x] = sum
    }
  }
  out = new Float32Array(n * n)
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      let sum = 0
      for (let k = -reach; k <= reach; k++) sum += kernel[k + reach] * across[wrap(y + k) * n + x]
      out[y * n + x] = sum
    }
  }
  levels[level] = out
  return out
}

/**
 * A pattern tile's height 0..1 at (u, v) in tiles, repeating both ways; v counts up the vase (the picture's rows down).
 * Read between its points along smooth curves (Catmull-Rom over four by four points): straight lines between them left
 * the picture's raster as small corners along every edge. `blur` (texels) softens its edges to what the vase's grid can
 * show: a sharp edge between grid points came out as a fine zigzag along it, in the fine quality, too.
 */
function tileHeight(entry, u, v, blur = 0) {
  if (blur > 0.5) {
    // Between two softened steps, blended, so the softness changes smoothly up a tapering vase.
    const x = clamp(1 + 2 * Math.log2(blur), 0, 12)
    const lo = Math.floor(x), f = x - lo
    const a = tileAt(entry, softValues(entry, lo), u, v)
    return f < 1e-3 ? a : a + (tileAt(entry, softValues(entry, lo + 1), u, v) - a) * f
  }
  return tileAt(entry, mapValues(entry), u, v)
}

function tileAt(entry, values, u, v) {
  // Read for every point of the wall, so written out: no lists and no helpers that are made anew per point. The sums
  // run in the same order as four weights times four rows of four points would.
  const n = entry.size
  const x = frac(u) * n - 0.5
  const y = (1 - frac(v)) * n - 0.5
  const x0 = Math.floor(x), y0 = Math.floor(y)
  const fx = x - x0, fy = y - y0
  const fx2 = fx * fx, fx3 = fx2 * fx, fy2 = fy * fy, fy3 = fy2 * fy
  const wx0 = (-fx3 + 2 * fx2 - fx) / 2, wx1 = (3 * fx3 - 5 * fx2 + 2) / 2, wx2 = (-3 * fx3 + 4 * fx2 + fx) / 2, wx3 = (fx3 - fx2) / 2
  const wy0 = (-fy3 + 2 * fy2 - fy) / 2, wy1 = (3 * fy3 - 5 * fy2 + 2) / 2, wy2 = (-3 * fy3 + 4 * fy2 + fy) / 2, wy3 = (fy3 - fy2) / 2
  // x0 and y0 lie from -1 to n - 1: the four points round them wrap at most once.
  const xa = x0 - 1 < 0 ? x0 - 1 + n : x0 - 1, xb = x0 < 0 ? x0 + n : x0, xc = x0 + 1 >= n ? x0 + 1 - n : x0 + 1, xd = x0 + 2 >= n ? x0 + 2 - n : x0 + 2
  const ra = (y0 - 1 < 0 ? y0 - 1 + n : y0 - 1) * n, rb = (y0 < 0 ? y0 + n : y0) * n, rc = (y0 + 1 >= n ? y0 + 1 - n : y0 + 1) * n, rd = (y0 + 2 >= n ? y0 + 2 - n : y0 + 2) * n
  const la = 0 + wx0 * values[ra + xa] + wx1 * values[ra + xb] + wx2 * values[ra + xc] + wx3 * values[ra + xd]
  const lb = 0 + wx0 * values[rb + xa] + wx1 * values[rb + xb] + wx2 * values[rb + xc] + wx3 * values[rb + xd]
  const lc = 0 + wx0 * values[rc + xa] + wx1 * values[rc + xb] + wx2 * values[rc + xc] + wx3 * values[rc + xd]
  const ld = 0 + wx0 * values[rd + xa] + wx1 * values[rd + xb] + wx2 * values[rd + xc] + wx3 * values[rd + xd]
  return clamp((0 + wy0 * la + wy1 * lb + wy2 * lc + wy3 * ld) / 255, 0, 1)
}

/** A leaf picture's signed distance (in its board's texels, positive inside) at board point (x, y), 0..1, y down. */
function leafDistance(entry, x, y) {
  const n = entry.size
  const values = mapValues(entry)
  const px = x * n - 0.5, py = y * n - 0.5
  if (px < 0 || py < 0 || px > n - 1 || py > n - 1) return -32
  const x0 = Math.floor(px), y0 = Math.floor(py)
  const fx = px - x0, fy = py - y0
  const x1 = Math.min(n - 1, x0 + 1), y1 = Math.min(n - 1, y0 + 1)
  const a = values[y0 * n + x0], b = values[y0 * n + x1], c = values[y1 * n + x0], d = values[y1 * n + x1]
  const v = (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy
  return (v - 128) / 4
}

/** A leaf picture's length per width: base to tip against its widest. */
function pictureLeafAspect(entry) {
  return (entry.base - entry.tip) / (2 * entry.half)
}

/** Points of a drawn leaf outline: at least two, along 0..1 ascending, half width 0..1; null when unusable. */
export function normalizeLeafPoints(list) {
  if (!Array.isArray(list)) return null
  const out = []
  for (const point of list) {
    if (!Array.isArray(point) || point.length < 2) continue
    const t = Number(point[0]), w = Number(point[1])
    if (!Number.isFinite(t) || !Number.isFinite(w)) continue
    out.push([clamp(t, 0, 1), clamp(w, 0, 1)])
    if (out.length >= 24) break
  }
  out.sort((a, b) => a[0] - b[0])
  if (out.length < 2) return null
  out[0][0] = 0
  out[out.length - 1][0] = 1
  return out
}

/** Half width of a drawn leaf at t (0..1), a smooth curve through its points. */
function drawnHalfWidth(points, t) {
  if (t <= 0 || t >= 1) return t <= 0 ? points[0][1] : points[points.length - 1][1]
  let i = 0
  while (i < points.length - 2 && t > points[i + 1][0]) i++
  const [t0, w0] = points[i], [t1, w1] = points[i + 1]
  const s = (t - t0) / Math.max(1e-6, t1 - t0)
  return w0 + (w1 - w0) * s * s * (3 - 2 * s)
}

/**
 * How far the point last given to leafHeight lies inside the leaf's outline, in lengths of the leaf: leavesAt turns it
 * into a narrow slope at the edge, so the outline is not a step the grid draws as a staircase.
 */
let leafEdge = 0

/** The midrib and side veins of a leaf (0..1, 1 = a vein's groove), in its own coordinates. */
function veins(t, xn) {
  const rib = Math.exp(-((xn / 0.06) ** 2)) * smooth(0.02, 0.12, t) * (1 - smooth(0.85, 0.97, t))
  const a = frac(t * 4.5 - Math.abs(xn) * 1.1 + 0.2)
  const sideVein = Math.abs(xn) > 0.1 ? Math.exp(-(((a - 0.5) / 0.06) ** 2)) * (1 - Math.abs(xn)) : 0
  return Math.max(rib, 0.45 * sideVein)
}

/**
 * One leaf: its height 0..1 at (t, xn), or -1 outside it. t runs from the base (0) to the tip (1), xn across from -1 to
 * 1 at the widest place. `curve` domes the top, `withVeins` presses the veins in (on a drawn leaf, and the midrib of the
 * long picture leaves).
 */
export function leafHeight(shape, t, xn, curve, withVeins, points, halfWidthInLengths = 0.3) {
  if (t < -0.02 || t > 1.02) return -1
  const picture = LEAF_MAPS[shape]
  let dome
  let vein = 0
  if (picture) {
    const x = 0.5 + xn * picture.half
    const y = picture.base + (picture.tip - picture.base) * t
    const d = leafDistance(picture, x, y)
    if (d <= 0) return -1
    const lengthTexels = (picture.base - picture.tip) * picture.size
    leafEdge = d / lengthTexels
    // The dome rises over the first twelfth of the leaf's length in from its edge; narrow parts (a stem, a fern's
    // leaflets) stay low, broad ones get a full rounded top.
    const inward = Math.min(1, d / (0.08 * lengthTexels))
    dome = 1 - (1 - inward) * (1 - inward)
    if (withVeins && (shape === 'weide' || shape === 'linde' || shape === 'eiche')) vein = Math.exp(-((xn / 0.05) ** 2)) * smooth(0.04, 0.15, t) * (1 - smooth(0.85, 0.97, t))
  } else {
    const ax = Math.abs(xn)
    const hw = shape === 'tulpe'
      ? Math.pow(Math.max(0, Math.sin(Math.PI * clamp(t, 0, 1))), 0.55) * (1 - 0.22 * Math.max(0, t - 0.45))
      : drawnHalfWidth(points ?? DEFAULT_LEAF_POINTS, clamp(t, 0, 1))
    if (hw <= 1e-3 || ax >= hw) return -1
    // Inside the outline: across to the side, and to the base and the tip, in lengths of the leaf.
    leafEdge = Math.min((hw - ax) * halfWidthInLengths, Math.max(0, t), Math.max(0, 1 - t))
    const across = ax / hw
    dome = Math.sqrt(Math.max(0, 1 - across * across))
    if (withVeins) vein = veins(t, xn)
  }
  const top = (1 - curve) + curve * dome
  const tipFade = picture ? 1 : 1 - 0.25 * smooth(0.82, 1, t)
  return clamp(LEAF_EDGE + (1 - LEAF_EDGE) * top * tipFade - 0.16 * vein, 0, 1)
}

/** Wisp ribs: bundles of narrow ribs in a sunk channel, between smooth fields. */
function wisp(cu, cv, group, width, blur = 0) {
  const f = frac(cu)
  if (f >= width) return 1
  const k = (f / width) * group
  const rib = Math.abs(frac(k) - 0.5) * 2
  // Round ribs: a cosine across each, so the grid draws them smooth at any lean. Ribs too fine for the grid (`blur`,
  // a Gaussian's width in cells) fade as a cosine does under that blur, to a smooth channel: drawn at full height they
  // came out as knotted, beaded ribs.
  const period = width / group
  const keep = Math.exp((-2 * Math.PI * Math.PI * blur * blur) / (period * period))
  const ridge = 0.5 + 0.5 * keep * Math.cos(Math.PI * rib)
  // The channel's two ends rise softly to the fields.
  const edge = Math.min(f, width - f) / width
  return clamp(Math.max(ridge * 0.95, 1 - smooth(0, Math.max(0.08, (2.5 * blur) / width), edge)), 0, 1)
}

/** Voronoi joints for the gallery's tile of the older surface: plump cells (F2 - F1 of a jittered grid). */
function cells(cu, cv, around, gap, round, seed) {
  const ci = Math.floor(cu), cj = Math.floor(cv)
  let d1 = Infinity, d2 = Infinity
  for (let di = -1; di <= 1; di++) {
    const i = ci + di
    const wrapped = ((i % around) + around) % around
    for (let dj = -1; dj <= 1; dj++) {
      const j = cj + dj
      const px = i + 0.15 + 0.7 * hash2(wrapped, j, seed)
      const py = j + 0.15 + 0.7 * hash2(wrapped, j, seed + 7919)
      const d = Math.hypot(px - cu, py - cv)
      if (d < d1) { d2 = d1; d1 = d } else if (d < d2) d2 = d
    }
  }
  const edge = (d2 - d1) / 2
  const half = gap / 2
  if (edge <= half) return 0
  return Math.pow(smooth(half, half + 0.08 + 0.35 * round, edge), 0.7)
}

/**
 * How many fine features a family has across one cell (ribs of a bundle, a fern's leaflets, a vein picture's veins):
 * the core gives the grid that many more columns and rows, so they come out as shapes and not as a zip of steps.
 */
export function patternDetail(p) {
  if (p.effect === 'wisp') return Math.max(1, Math.round(p.patternGroup) / Math.max(0.15, p.patternWidth))
  if (p.effect === 'tulpenblaetter') return 1.5
  if (p.effect === 'blaetter') return { farn: 6, monstera: 3, ahorn: 3, eiche: 2.5, ginkgo: 2, efeu: 2 }[p.leafShape] ?? 1.5
  if (p.effect === 'adern') return 4
  // One's own picture or a text: letters and fine lines, as a vein picture has.
  if (p.effect === 'bild') return 4
  if (isComputedPattern(p.effect)) return computedDetail(p.effect, p.patternWidth)
  if (isPicturePattern(p.effect)) return 1.5 * (MOTIFS_PER_TILE[p.effect] ?? 1) ** 0.5
  return 1
}

/** The width of a leaf in cells and its length per width. */
function leafForm(shape, leafAspect) {
  const picture = LEAF_MAPS[shape]
  if (picture) return { width: PICTURE_LEAF_WIDTH[shape] ?? 1, aspect: pictureLeafAspect(picture) * leafAspect }
  const drawn = DRAWN_LEAF[shape] ?? DRAWN_LEAF.tulpe
  return { width: drawn.width, aspect: drawn.aspect * leafAspect }
}

/** The count of cells around for a family: tiles of a picture, leaves from their size and the widest circumference. */
export function patternCellsAround(p, maxCircumference) {
  if (p.effect === 'blaetter') {
    const { width } = leafForm(p.leafShape, 1)
    const leaf = (LEAF_WIDTH_MM * p.leafSize) / 100
    return clamp(Math.round(maxCircumference / (leaf / width)), 3, 64)
  }
  if (isPicturePattern(p.effect)) return clamp(Math.round(p.patternCount / (MOTIFS_PER_TILE[p.effect] ?? 1)), 1, 96)
  // Tulip leaves: half as many leaves round as the count says, each one broad.
  if (p.effect === 'tulpenblaetter') return clamp(Math.round(p.patternCount / 2.4), 3, 40)
  return clamp(Math.round(p.patternCount), 3, 96)
}

/** Leaf rows: the lower lies over the upper, within a row the left edge over the neighbour's right. */
function leavesAt(cu, cv, around, o) {
  const { shape, aspect, width, overlap, layout, tilt, curve, withVeins, points, step, bend = 0, fixed = null } = o
  const scattered = layout === 'verstreut'
  const length = width * aspect
  // The slope at a leaf's edge: about a twentieth of a cell, in lengths of the leaf.
  const ramp = 0.055 / length
  const halfWidthInLengths = width / 2 / length
  const pitch = Math.max(0.12, length * (1 - overlap))
  const sin = Math.sin(tilt), cos = Math.cos(tilt)
  if (cv < -0.05) return 0
  const rTop = Math.floor(cv / pitch)
  const rows = Math.ceil((length * 1.2) / pitch) + (scattered ? 2 : 1)
  const farthest = (length * 1.3 + width + 1) ** 2
  // How far up from its row and down below it a leaf may reach, and how far to the side (in cells).
  const spread = scattered ? 1.2 : 1
  // The steepest a leaf may lean: its own tilt, and a scattered leaf's turn of up to 0.375 radians more.
  const leanMost = Math.sin(Math.min(Math.PI / 2, Math.abs(tilt) + (scattered ? 0.4 : 0)))
  const rowAbove = length * 1.05 * spread + width * 0.5 * leanMost + (scattered ? 0.35 * pitch : 0) + 0.05
  const rowBelow = (width * 0.6 + Math.abs(bend) * 0.35 * length + 0.05) * leanMost * spread + (scattered ? 0.35 * pitch + 0.1 : 0.05)
  const side = (width * 0.62 + length * (leanMost + Math.abs(bend) * 0.4)) * spread + (scattered ? 0.4 : 0.02)
  // How many leaves to each side may reach this point: a long leaf that leans or bends reaches far sideways.
  const reach = Math.ceil(width * 0.7 + length * (Math.abs(sin) + Math.abs(bend) * 0.35 + (scattered ? 0.45 : 0)) + (scattered ? 0.5 : 0)) + 1
  let hit = -1, hitTop = 0, hitEdge = 1
  let beneath = 0
  // A leaning leaf reaches below its own row with its lower corner, a scattered one sits a little lower: rows above count too.
  const below = Math.ceil((width * Math.abs(sin) + (scattered ? 0.6 * pitch : 0)) / pitch) + 1
  for (let r = Math.max(0, rTop - rows); r <= rTop + below; r++) {
    // Rows from the lowest that may reach this point: the first hit is the leaf that lies on top.
    const off = layout === 'regelmaessig' ? 0 : layout === 'spirale' ? frac(r * 0.381966) : (r % 2) * 0.5
    const dyRow = cv - r * pitch
    // A row whose leaves cannot reach this height is passed over at once.
    if (dyRow > rowAbove || dyRow < -rowBelow) continue
    // Leaves that keep their size (`fixed`): each row has as many leaves round as fit its own height's circumference,
    // and the point is measured in that row's places; `ring` is the circumference at the point, in cells.
    const rowAround = fixed ? fixed.count(r) : around
    const scale = fixed ? fixed.ring / rowAround : 1
    const cuRow = fixed ? fixed.u * rowAround : cu
    const lean = (dyRow * (sin / Math.max(0.2, cos))) / scale
    const c = Math.round(cuRow - off - lean)
    let rowBest = -1, rowX = Infinity, rowOther = 0, rowEdge = 1, rowCover = 0
    for (let k = c - reach; k <= c + reach; k++) {
      // Scattered: each leaf a little off its place, turned and sized its own way (the same every time, and the same
      // a whole turn further round, so the seam closes).
      // A leaf whose base lies farther away than it is long (and wide) cannot reach this point.
      let near = cuRow - (k + off)
      near = (near - rowAround * Math.round(near / rowAround)) * scale
      if (near > side || near < -side || near * near + dyRow * dyRow > farthest) continue
      const wrapped = ((k % rowAround) + rowAround) % rowAround
      const jx = scattered ? (hash2(wrapped, r, 17) - 0.5) * 0.7 : 0
      const jy = scattered ? (hash2(wrapped, r, 29) - 0.5) * 0.6 * pitch : 0
      const turn = scattered ? (hash2(wrapped, r, 41) - 0.5) * 0.75 : 0
      const size = scattered ? 0.82 + 0.36 * hash2(wrapped, r, 53) : 1
      const lsin = Math.sin(tilt + turn), lcos = Math.cos(tilt + turn)
      let dx = cuRow - (k + off + jx)
      dx = (dx - rowAround * Math.round(dx / rowAround)) * scale
      const dy0 = dyRow - jy
      const along = (dx * lsin + dy0 * lcos) / size
      let across = (dx * lcos - dy0 * lsin) / size
      const t = along / length
      // A bent leaf: its middle line curves to the side towards the tip, like a flame.
      const leafBend = bend + (scattered ? (hash2(wrapped, r, 67) - 0.5) * 0.3 : 0)
      across -= leafBend * t * t * length * 0.35
      const xn = across / (width / 2)
      if (t < -0.02 || t > 1.02 || Math.abs(xn) > 1.05) continue
      const v = leafHeight(shape, t, xn, curve, withVeins, points, halfWidthInLengths)
      if (v < 0) continue
      const edge = smooth(0, ramp, leafEdge)
      rowCover = Math.max(rowCover, edge)
      if (xn < rowX) {
        if (rowBest >= 0) rowOther = Math.max(rowOther, rowBest * rowEdge)
        rowBest = v
        rowX = xn
        rowEdge = edge
      } else rowOther = Math.max(rowOther, v * edge)
    }
    if (rowBest < 0) continue
    // The leaf on top with its own dome; at its edge it meets what it covers, so where its edge lies lower than the leaf
    // beneath, a fine groove shows the outline - as on a carved vase.
    const top = rowBest
    const own = rowOther + (top - rowOther) * rowEdge
    // How much this row covers the point: its leaves together, so a leaf just starting at its edge does not let the
    // row beneath show through where a neighbour of the same row lies.
    if (hit < 0) { hit = own; hitTop = own; hitEdge = rowCover }
    else beneath = Math.max(beneath, own)
  }
  if (hit < 0) return 0
  if (beneath <= 0) return clamp(hit, 0, 1)
  return clamp(beneath + (hitTop - beneath) * hitEdge, 0, 1)
}

/** The tulip leaves' own leaf: length per width, width per cell, and how much more their rows overlap. */
const TULIP = { aspect: 2.7, width: 1.35, overlap: 0.25 }

/** A leaf family's rows in cells: a leaf's length and the distance between rows. */
function leafRows(p) {
  const form = p.effect === 'tulpenblaetter' ? { width: TULIP.width, aspect: TULIP.aspect } : leafForm(p.leafShape, p.leafAspect)
  const overlap = p.leafOverlap / 100 + (p.effect === 'tulpenblaetter' ? TULIP.overlap : 0)
  const length = form.width * form.aspect
  return { length, pitch: Math.max(0.12, length * (1 - overlap)) }
}

/** The height 0..1 of a family at (cu, cv), in cells; `around` is the count of cells round the vase. */
export function patternHeight(p, cu, cv, around, fixed = null, blur = 0, middle = null) {
  // `blur`: how far the pattern is softened to the build grid, a Gaussian's width in cells.
  // `middle`: for one's own picture as a band or put on once, the height (in cells) its middle sits at; null tiles it.
  const lean = (clamp(p.patternTwist, -75, 75) * Math.PI) / 180
  const sheared = cu + Math.tan(lean) * cv
  const picture = pictureOf(p)
  if (picture) {
    let v = cv / picture.aspect
    let h = 0
    if (middle === null) h = tileHeight(picture, sheared, v, blur * picture.size)
    else {
      // One row of the picture: above and below it the wall is the pattern's background. Put on once, the row has
      // one picture alone, the first of those that fit round the vase.
      v = (cv - middle) / picture.aspect + 0.5
      const u = cu + Math.tan(lean) * (cv - middle)
      if (v > 0 && v < 1 && (p.patternFit !== 'einmal' || u - Math.floor(u / around) * around < 1)) h = tileHeight(picture, u, v, blur * picture.size)
    }
    return p.patternInvert === 'ja' ? 1 - h : h
  }
  if (p.effect === 'wisp') return wisp(sheared, cv, Math.round(p.patternGroup), p.patternWidth, blur)
  if (isComputedPattern(p.effect)) {
    const h = computedHeight(p.effect, sheared, cv, around, p.patternWidth, blur)
    return p.patternInvert === 'ja' ? 1 - h : h
  }
  if (p.effect === 'tulpenblaetter') {
    // Long tulip leaves rising from the bottom in a spiral, overlapping at the sides, bent like flames by the lean.
    return leavesAt(cu, cv, around, { shape: 'tulpe', aspect: TULIP.aspect, width: TULIP.width, overlap: p.leafOverlap / 100 + TULIP.overlap, layout: 'spirale', tilt: lean, curve: 1, withVeins: false, points: null, step: OVERLAP_STEP, bend: Math.sign(p.patternTwist) * Math.min(0.8, Math.abs(p.patternTwist) / 45), fixed })
  }
  if (p.effect === 'blaetter') {
    const form = leafForm(p.leafShape, p.leafAspect)
    return leavesAt(cu, cv, around, {
      shape: p.leafShape,
      aspect: form.aspect,
      width: form.width,
      overlap: p.leafOverlap / 100,
      layout: p.leafLayout,
      tilt: (clamp(p.leafTilt, -45, 45) * Math.PI) / 180,
      curve: p.leafCurve,
      withVeins: p.leafVeins === 'ja',
      points: p.leafShape === 'eigen' ? (p.leafPoints ?? DEFAULT_LEAF_POINTS) : null,
      step: OVERLAP_STEP,
      fixed,
    })
  }
  return 1
}

/** Stretch of the cells up the vase (1 = as tall as wide). Leaves keep their own proportions. */
function cellStretch(p) {
  return p.effect === 'blaetter' || p.effect === 'tulpenblaetter' ? 1 : p.patternAspect
}

/** The last few leaf rasters, so a check right after a build (or the same vase again) does not work them out anew. */
const rasterCache = new Map()

/**
 * Leaf heights on a raster over cells `around` by the range v0..v1, about 0.45 mm apart at the widest place (`cellMm` a
 * cell's width there) and at most about 500,000 points; read between its points. Round the vase it
 * repeats, so the seam closes as before.
 */
function leafRaster(p, around, v0, v1, cellMm, fixedFor = null, shapeKey = '') {
  const key = JSON.stringify([shapeKey, p.leafFixed, p.effect, p.leafShape, p.leafSize, p.leafOverlap, p.leafLayout, p.leafTilt, p.leafCurve, p.leafVeins, p.leafAspect, p.leafPoints, p.patternTwist, p.patternCount, around, Math.round(v0 * 1e4), Math.round(v1 * 1e4), Math.round(cellMm * 100)])
  const known = rasterCache.get(key)
  if (known) return known
  const span = Math.max(1e-3, v1 - v0)
  let per = Math.max(24, Math.ceil(cellMm / 0.45))
  while (per > 24 && around * per * (span * per + 2) > 500000) per = Math.floor(per * 0.9)
  const columns = around * per
  const rows = Math.max(2, Math.ceil(span * per) + 2)
  const values = new Float32Array(columns * rows)
  for (let j = 0; j < rows; j++) {
    const cv = v0 + (j - 1) / per
    for (let i = 0; i < columns; i++) values[j * columns + i] = patternHeight(p, i / per, cv, around, fixedFor ? fixedFor(i / columns, cv) : null)
  }
  const at = (cu, cv) => {
    const x = cu * per
    const y = (cv - v0) * per + 1
    if (y < 0 || y > rows - 1) return patternHeight(p, cu, cv, around, fixedFor ? fixedFor(frac(cu / around), cv) : null)
    const x0 = Math.floor(x), y0 = Math.floor(y)
    const fx = x - x0, fy = y - y0
    const xa = ((x0 % columns) + columns) % columns, xb = (xa + 1) % columns
    const y1 = Math.min(rows - 1, y0 + 1)
    const a = values[y0 * columns + xa], b = values[y0 * columns + xb]
    const c = values[y1 * columns + xa], d = values[y1 * columns + xb]
    return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy
  }
  rasterCache.set(key, at)
  while (rasterCache.size > 3) rasterCache.delete(rasterCache.keys().next().value)
  return at
}

/**
 * A function of the height alone that remembers its last answer: a vase is built and checked a row at a time, so all
 * the points of a row ask for the same height one after another.
 */
export function perHeight(f) {
  let last = NaN, value = 0
  return (z) => {
    if (z !== last) {
      value = f(z)
      last = z
    }
    return value
  }
}

/**
 * The depth (mm, inwards) of a relief pattern on a vase: `shape` from vaseShape, `zone(z)` the height range's mask.
 * Returns { depthAt(theta, z, base), around, cellAt(z) } - cellAt gives a cell's size in mm at height z.
 */
export function reliefField(p, shape, zoneOf) {
  const { H, R, rotation, twistT } = shape
  const zone = perHeight(zoneOf)
  const turned = perHeight((z) => rotation(twistT(z)))
  const mean = shape.section?.mean ?? 1
  // Conformal height: cells up the contour per mm, from a table of 1024 steps.
  const steps = 1024
  let maxC = 0
  const circumference = new Float64Array(steps + 1)
  for (let k = 0; k <= steps; k++) {
    circumference[k] = TAU * R((k / steps) * H) * mean
    maxC = Math.max(maxC, circumference[k])
  }
  const around = patternCellsAround(p, maxC)
  const stretch = cellStretch(p)
  // Leaves that keep their size: cells of one size all the way up (the widest place's), and each row of leaves as
  // many round as fit there; otherwise conformal cells that shrink with the circumference.
  const leafy = p.effect === 'blaetter' || p.effect === 'tulpenblaetter'
  const keepSize = leafy && p.leafFixed === 'ja'
  // The other families can keep their size, too (not wisp ribs, which run up the vase in one piece): cells of one size
  // all the way up, and each row of the pattern as many round as fit at its height (see `keptHeight` below).
  const sizeKept = !leafy && p.leafFixed === 'ja' && p.effect !== 'wisp'
  const cellMm = maxC / around
  const V = new Float64Array(steps + 1)
  for (let k = 1; k <= steps; k++) {
    const z0 = ((k - 1) / steps) * H, z1 = (k / steps) * H
    const ds = Math.hypot(z1 - z0, R(z1) - R(z0))
    const c = Math.max(1e-3, (circumference[k] + circumference[k - 1]) / 2)
    V[k] = V[k - 1] + (keepSize ? ds / cellMm : sizeKept ? ds / (cellMm * stretch) : (ds * around) / (c * stretch))
  }
  const vOf = (z) => {
    const x = clamp(z / H, 0, 1) * steps
    const k = Math.min(steps - 1, Math.floor(x))
    return V[k] + (V[k + 1] - V[k]) * (x - k)
  }
  const vAt = perHeight(vOf)
  // Leaves start their first row at the bottom of the range, so the lowest leaves sit on its border.
  const start = leafy ? vAt((p.zoneFrom / 100) * H) : 0
  // The circumference (in cells) at a height given in cells up from the start: V looked up backwards.
  const ringAt = (cv) => {
    const v = clamp(cv + start, 0, V[steps])
    let lo = 0, hi = steps
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (V[mid] < v) lo = mid; else hi = mid }
    const f = (v - V[lo]) / Math.max(1e-9, V[hi] - V[lo])
    return (circumference[lo] + (circumference[hi] - circumference[lo]) * f) / cellMm
  }
  const rowsOf = keepSize ? leafRows(p) : null
  const fixedFor = keepSize ? (u, cv) => ({ u, ring: ringAt(cv), count: (r) => Math.max(3, Math.round(ringAt(r * rowsOf.pitch + 0.5 * rowsOf.length))) }) : null
  const shapeKey = keepSize ? Array.from({ length: 17 }, (_, k) => Math.round(circumference[k * 64] * 10)).join(',') : ''
  const amount = Math.max(0, p.reliefDepth)
  // A pattern softened to the build grid's spacing (about the columns' spacing in mm per quality), in cells where the
  // cell has the size it has at that height.
  const picture = pictureOf(p)
  // One's own picture as a band or put on once sits with its middle at the middle of the height range (by height, not by cells: a
  // narrow neck has many small cells, and their middle would lie far up).
  const once = p.effect === 'bild' && p.patternFit !== 'kacheln' ? vAt(((p.zoneFrom + p.zoneTo) / 200) * H) : null
  let gridMm = { entwurf: 1.17, standard: 0.7, fein: 0.45 }[p.quality] ?? 0.7
  // A picture's edges are softened fully to the grid in every quality. The quicker qualities used to soften them only a
  // little, to keep them crisp: but an edge finer than the grid that crosses it at a slant comes out as a row of teeth
  // (seen on every leaf edge and hexagon side at Standard). Wisp ribs fade by half the grid.
  const soften = p.effect === 'wisp' ? 0.5 : 0.55
  const computed = isComputedPattern(p.effect)
  // (Not remembered per height: it follows the grid's spacing, which the build sets later.)
  const blurAt = (z) => {
    if (!picture && !computed && p.effect !== 'wisp') return 0
    const x = clamp(z / H, 0, 1) * steps
    const k = Math.min(steps - 1, Math.floor(x))
    const c = circumference[k] + (circumference[k + 1] - circumference[k]) * (x - k)
    return sizeKept ? (soften * gridMm) / cellMm : (soften * gridMm * around) / Math.max(1e-3, c)
  }
  // Leaves look at many leaves around each point: they are worked out once on a fine raster over the height range and
  // read from it between its points, which makes building and checking a leaf vase many times faster.
  // One's own picture faces the front: the middle of one picture lies there (three quarters of the way round from
  // where the cells start), so a picture put on once, or a word, is seen when the vase is looked at from the front.
  const front = p.effect === 'bild' ? 0.75 * around - 0.5 : 0
  // A family that keeps its size: the pattern stands in rows (a row of bricks, of studs, of a picture's tiles), and each
  // row has as many cells round the vase as fit at its height, a whole number, so it closes without a seam. Where two
  // rows with different counts meet, one is faded into the other over a narrow band: there the pattern cannot fit
  // itself, and a soft join reads better than a step.
  const rowPeriod = picture ? picture.aspect : (ROW_PERIOD[p.effect] ?? 1)
  const rowOrigin = once !== null ? once - rowPeriod / 2 : -(ROW_OFFSET[p.effect] ?? 0) * rowPeriod
  const rowCounts = new Map()
  const countOfRow = (r) => {
    let n = rowCounts.get(r)
    if (n === undefined) rowCounts.set(r, (n = Math.max(3, Math.round(ringAt(rowOrigin + (r + 0.5) * rowPeriod)))))
    return n
  }
  const inRow = (f, cv, r, blur) => {
    const n = countOfRow(r)
    return patternHeight(p, f * n - (p.effect === 'bild' ? 0.75 * n - 0.5 : 0), cv, n, null, blur, once)
  }
  const ROW_JOIN = 0.16
  const keptHeight = (cu, cv, z) => {
    const f = cu / around
    const x = (cv - rowOrigin) / rowPeriod
    const r = Math.floor(x), t = x - r
    const blur = blurAt(z)
    const h = inRow(f, cv, r, blur)
    // (A picture put on once or as a band is one row: nothing to join it to.)
    if (once !== null) return h
    if (t < ROW_JOIN && countOfRow(r - 1) !== countOfRow(r)) return h + (inRow(f, cv, r - 1, blur) - h) * 0.5 * (1 - smooth(0, ROW_JOIN, t))
    if (t > 1 - ROW_JOIN && countOfRow(r + 1) !== countOfRow(r)) return h + (inRow(f, cv, r + 1, blur) - h) * 0.5 * (1 - smooth(0, ROW_JOIN, 1 - t))
    return h
  }
  const heightAt = leafy ? leafRaster(p, around, vAt((p.zoneFrom / 100) * H) - start, vAt((p.zoneTo / 100) * H) - start, cellMm, fixedFor, shapeKey) : sizeKept ? keptHeight : (cu, cv, z) => patternHeight(p, cu - front, cv, around, null, blurAt(z), once)
  const raw = (theta, z, base) => {
    const m = zone(z)
    if (m <= 0) return 0
    const depth = Math.min(amount, base / 3) * m
    if (depth <= 0) return 0
    const turn = theta - turned(z)
    const cu = frac(turn / TAU) * around
    const h = heightAt(cu, vAt(z) - start, z)
    return depth * (1 - h)
  }
  const friendly = p.printFriendly === 'ja'
  // Print-friendly: going up, the surface - the vase's own outline less the relief - may come out by at most what it
  // rises: base(z) - d(z) <= base(z - s) - d(z - s) + s, never deeper than the relief itself. Worked out once per
  // upright line round the vase, from the bottom up (each row from the one below), on a raster half a millimetre
  // fine, and read from it between its points.
  const outer = shape.outerAt
  let friendlyRaster = null
  const buildFriendly = () => {
    // As fine as the build grid (at most 0.4 mm up and 0.5 mm round), so fine ribs do not come out beaded from it.
    const stepZ = Math.min(0.4, Math.max(0.2, gridMm * 0.8))
    const top = Math.min(H, (p.zoneTo / 100) * H + 1)
    const rows = Math.max(2, Math.ceil(top / stepZ) + 1)
    // Its columns are the build grid's and turn with it (with the pattern's lines), so the mesh reads them where they
    // lie and slanted ribs come out smooth; each point is still held to the point straight below it.
    const columns = gridColumns ? Math.min(gridColumns, Math.ceil(maxC / 0.3)) : clamp(Math.ceil(maxC / Math.min(0.5, Math.max(0.2, gridMm * 0.8))), 360, 2400)
    const values = new Float32Array(columns * rows)
    // The outline along the row below, read between its points like the depths.
    let bases = new Float64Array(columns), basesNow = new Float64Array(columns)
    let before = 0
    for (let r = 0; r < rows; r++) {
      const z = Math.min(H, r * stepZ)
      const turn = turnUp(z)
      // How far the point straight below lies in the row below, in columns.
      const back = r > 0 ? ((turn - before) / TAU) * columns : 0
      const zBelow = Math.max(0, z - stepZ)
      for (let c = 0; c < columns; c++) {
        const theta = (TAU * c) / columns + turn
        const base = outer(theta, z)
        const own = raw(theta, z, base)
        let d = own
        if (r > 0 && zone(z) > 0) {
          const x = c + back
          const x0 = Math.floor(x), f = x - x0
          const xa = ((x0 % columns) + columns) % columns, xb = (xa + 1) % columns
          const row = (r - 1) * columns
          const previous = values[row + xa] + (values[row + xb] - values[row + xa]) * f
          const baseBelow = bases[xa] + (bases[xb] - bases[xa]) * f
          const need = previous + (base - baseBelow) - (z - zBelow)
          if (need > d) d = Math.min(need, Math.max(own, Math.min(amount, base / 3) * zone(z)))
        }
        values[r * columns + c] = d
        basesNow[c] = base
      }
      ;[bases, basesNow] = [basesNow, bases]
      before = turn
    }
    friendlyRaster = { values, rows, columns, stepZ, top }
  }
  const depthAt = !friendly ? raw : (theta, z, base) => {
    if (zone(z) <= 0) return raw(theta, z, base)
    if (!friendlyRaster) buildFriendly()
    const { values, rows, columns, stepZ, top } = friendlyRaster
    if (z > top) return raw(theta, z, base)
    const x = frac((theta - turnUp(z)) / TAU) * columns
    const y = Math.min(rows - 1, Math.max(0, z / stepZ))
    const x0 = Math.floor(x), y0 = Math.floor(y)
    const fx = x - x0, fy = y - y0
    const xa = x0 % columns, xb = (xa + 1) % columns
    const y1 = Math.min(rows - 1, y0 + 1)
    const a = values[y0 * columns + xa], b = values[y0 * columns + xb]
    const c = values[y1 * columns + xa], d = values[y1 * columns + xb]
    // Never shallower than the relief's own depth here (the raster is read between its points).
    return Math.max(raw(theta, z, base), (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy)
  }
  const cellAt = (z) => {
    if (sizeKept) return cellMm
    const x = clamp(z / H, 0, 1) * steps
    const k = Math.min(steps, Math.round(x))
    return circumference[k] / around
  }
  // The build tells the field its grid's real spacing (mm) before it reads any depth.
  let gridColumns = 0
  const setGrid = (mm, columns = 0) => {
    if (!(mm > 0) || (Math.abs(mm - gridMm) < 1e-6 && columns === gridColumns)) return
    gridMm = mm
    gridColumns = columns
    friendlyRaster = null
  }
  // The angle a line of the pattern has turned to at height z (the vase's twist and the pattern's lean): the build turns
  // its grid along, so slanted ribs and edges run along the grid instead of across it, where they came out beaded.
  // (A family that keeps its size has another count of cells in every row: its lines do not turn as one, and the grid is left upright.)
  const shear = leafy || sizeKept ? 0 : Math.tan((clamp(p.patternTwist, -75, 75) * Math.PI) / 180)
  const turnAt = (z) => rotation(twistT(z)) - (TAU * shear * (vOf(z) - start)) / around
  // The same from the bottom up, as the build's grid and the print-friendly raster turn.
  let bottomTurn = null
  const turnUp = perHeight((z) => turnAt(z) - (bottomTurn ??= turnAt(0)))
  return { depthAt, around, cellAt, setGrid, turnAt, turnUp, maxCircumference: maxC, detail: patternDetail(p) }
}

/** The look of the vase's older surfaces (grooves, stripes, Voronoi joints, facets) for the gallery's tiles. */
function classicPreview(effect, cu, cv, around) {
  if (effect === 'rillen') return 1 - Math.pow(0.5 + 0.5 * Math.cos(TAU * cu * 2.5), 2)
  if (effect === 'streifen') return 1 - Math.pow(Math.max(0, Math.cos(TAU * (cu * 2 + cv * 1.2))), 6)
  if (effect === 'voronoi') return 1 - (cells(cu * 1.4, cv * 1.4, Math.round(around * 1.4), 0.1, 0.05, 3) > 0 ? 0 : 1)
  if (effect === 'lowpoly') {
    // Facets: a jittered triangle grid, each triangle flat at a height of its own.
    const i = Math.floor(cu * 1.6), j = Math.floor(cv * 1.6)
    const upper = frac(cu * 1.6) + frac(cv * 1.6) > 1 ? 1 : 0
    return 0.35 + 0.6 * hash2(i, j * 2 + upper, 11)
  }
  return 1
}

/**
 * A preview of a family as heights on an unrolled cylinder, `columns` x `rows` values from 0 (sunk) to 1 (raised),
 * row 0 at the bottom: the gallery shades its tiles from it.
 */
export function patternPreview(p, columns = 48, rows = 48, cellsAcross = null) {
  // A picture's tile once; leaves and the worked-out families three cells across.
  const around = cellsAcross ?? (isPicturePattern(p.effect) ? 1 : 3)
  const stretch = cellStretch(p)
  const out = new Float32Array(columns * rows)
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < columns; i++) {
      const cu = ((i + 0.5) / columns) * around
      const cv = ((j + 0.5) / rows) * around / stretch * (rows / columns)
      // One's own picture: the vase's, or while it has none a small picture that stands for it.
      if (p.effect === 'bild' && !ownPictureTile(p.patternImage)) out[j * columns + i] = ownPicturePlaceholder((i + 0.5) / columns, (j + 0.5) / rows)
      else out[j * columns + i] = isReliefPattern(p.effect) ? patternHeight(p, cu, cv, around) : classicPreview(p.effect, cu, cv, around)
    }
  }
  return out
}
