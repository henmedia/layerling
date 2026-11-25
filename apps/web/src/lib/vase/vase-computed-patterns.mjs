/**
 * The vase's worked-out relief patterns: families whose height is a formula over the unrolled wall, not a picture.
 *
 * Each is a height 0..1 (1 the vase's outline, 0 sunk by the relief's depth) at (cu, cv) in cells: `cu` runs round the
 * vase (`around` whole cells, so the pattern closes without a seam), `cv` up it. `width` (0.15 to 0.9, the vase's
 * `patternWidth`) is how broad a family's joints, ribs or strands are, as a share of a cell. `blur` is the spacing of
 * the build's grid in cells: no flank is steeper than that grid can draw, so an edge that crosses the grid at a slant
 * stays an edge and does not come out as a row of teeth.
 *
 * Nothing is read from a picture and nothing is kept per point, so these are the quickest patterns the vase has, and
 * they stay sharp at any size.
 */

/** The families with their German names (the editor shows its own, translated). */
export const COMPUTED_PATTERNS = {
  wabennetz: 'Wabennetz',
  ziegel: 'Ziegel',
  noppen: 'Noppen',
  gehaemmert: 'Gehämmert',
  strick: 'Strick',
  korb: 'Korbgeflecht',
  ringe: 'Ringe',
  rauschen: 'Sanfte Hügel',
}

const SQRT3 = Math.sqrt(3)

/** Height from the middle of a feature (x = 0) to its edge (x = 1): a cosine, round at both ends. */
function fall(x) {
  return x >= 1 ? 0 : x <= 0 ? 1 : 0.5 + 0.5 * Math.cos(Math.PI * x)
}

/** Height over the distance to a border, in cells: 0 on the border, 1 from `gap` inwards. */
function rise(edge, gap) {
  return edge >= gap ? 1 : edge <= 0 ? 0 : fall(1 - edge / gap)
}

function hash(i, j, seed) {
  let h = Math.imul(i | 0, 374761393) ^ Math.imul(j | 0, 668265263) ^ Math.imul(seed | 0, 1274126177)
  h = Math.imul(h ^ (h >>> 13), 1103515245)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

// The nearer of the two hexagon grids' centres, as an offset; carried out in these two without an object.
let hexX = 0, hexY = 0
function hexOffset(a, b) {
  const y = b / SQRT3
  const ax = a - Math.floor(a) - 0.5, ay = (y - Math.floor(y) - 0.5) * SQRT3
  const bx = a + 0.5 - Math.floor(a + 0.5) - 0.5, by = (y + 0.5 - Math.floor(y + 0.5) - 0.5) * SQRT3
  if (ax * ax + ay * ay < bx * bx + by * by) {
    hexX = ax
    hexY = ay
  } else {
    hexX = bx
    hexY = by
  }
}

/** A net of hexagons: flat cells with joints between them. */
function wabennetz(a, b, around, width, soft) {
  hexOffset(a, b)
  const x = Math.abs(hexX), y = Math.abs(hexY)
  const d = Math.max(x, 0.5 * x + (SQRT3 / 2) * y)
  return rise(0.5 - d, Math.max(0.3 * width, soft))
}

/** Bricks in rows, every other row shifted by half a brick; a brick is two cells long. */
function ziegel(a, b, around, width, soft) {
  const row = Math.floor(b * 2)
  const x = a + (row & 1 ? 0.5 : 0)
  const fx = x - Math.floor(x), fy = b * 2 - row
  const edge = Math.min(Math.min(fx, 1 - fx), Math.min(fy, 1 - fy) * 0.5)
  return rise(edge, Math.max(0.3 * width, soft))
}

/** Round studs on a sunk ground, set as hexagons are. */
function noppen(a, b, around, width, soft) {
  hexOffset(a, b)
  return fall(Math.hypot(hexX, hexY) / Math.max(0.25 + 0.3 * width, soft))
}

/** Hammered: shallow dents, one per point of a loose grid, with soft ridges where two meet. */
function gehaemmert(a, b, around, width) {
  const ci = Math.floor(a), cj = Math.floor(b)
  let best = Infinity, second = Infinity
  for (let dj = -1; dj <= 1; dj++) {
    const j = cj + dj
    for (let di = -1; di <= 1; di++) {
      const i = ci + di
      const wrapped = ((i % around) + around) % around
      const px = i + 0.15 + 0.7 * hash(wrapped, j, 17), py = j + 0.15 + 0.7 * hash(wrapped, j, 7936)
      const d = (px - a) * (px - a) + (py - b) * (py - b)
      if (d < best) {
        second = best
        best = d
      } else if (d < second) second = d
    }
  }
  // The dent is deepest at its point; towards the next dent the wall comes back up to a rounded ridge.
  const near = Math.sqrt(best), ridge = (Math.sqrt(second) - near) / 2
  const dent = Math.min(1, (near / (0.45 + 0.4 * width)) ** 2)
  const t = Math.min(1, ridge / 0.12), inside = t * t * (3 - 2 * t)
  return 1 - inside * (1 - dent)
}

function segmentDistance(px, py, ax, ay, bx, by) {
  const vx = bx - ax, vy = by - ay
  let t = ((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy)
  t = t < 0 ? 0 : t > 1 ? 1 : t
  return Math.hypot(px - ax - t * vx, py - ay - t * vy)
}

/** Knitting: every stitch a V, two legs from the bottom middle up to the sides; the stitches above and below reach in. */
function strick(a, b, around, width, soft) {
  const x = a - Math.floor(a), y = b - Math.floor(b)
  let d = Infinity
  for (let k = -1; k <= 1; k++) {
    const left = segmentDistance(x, y, 0.5, k, 0.1, k + 1.15)
    const right = segmentDistance(x, y, 0.5, k, 0.9, k + 1.15)
    if (left < d) d = left
    if (right < d) d = right
  }
  return fall(d / Math.max(0.42 * width + 0.02, soft))
}

/** A basket weave: strands run round and strands run up; where two cross, one arches over the other. */
function korb(a, b, around, width, soft) {
  // Two strands to a cell each way: which one lies on top changes from strand to strand, and with two to a cell that
  // comes out even round the vase whatever the count of cells is.
  const ia = Math.floor(a * 2), ib = Math.floor(b * 2)
  const x = a * 2 - ia, y = b * 2 - ib
  const over = (ia + ib) & 1 ? 1 : -1
  const half = Math.max(0.2 + 0.3 * width, 2 * soft)
  const round = fall(Math.abs(y - 0.5) / half) * (0.55 + over * 0.45 * Math.sin(Math.PI * x))
  const up = fall(Math.abs(x - 0.5) / half) * (0.55 - over * 0.45 * Math.sin(Math.PI * y))
  return round > up ? round : up
}

/** Rings round the vase, two to a cell, swaying a little so they do not look turned on a lathe. */
function ringe(a, b, around, width, soft) {
  const y = b * 2 + 0.12 * Math.sin((2 * Math.PI * 3 * a) / around)
  return fall(Math.abs(y - Math.floor(y) - 0.5) / Math.max(0.5 * width + 0.1, 2 * soft))
}

const ease = (t) => t * t * t * (t * (t * 6 - 15) + 10)

/** Gentle hills: three layers of smooth noise, each half as high and twice as fine as the one before. */
function rauschen(a, b, around) {
  let sum = 0, weight = 0, amp = 1, freq = 1
  for (let o = 0; o < 3; o++) {
    const period = around * freq
    const x = a * freq, y = b * freq
    const ix = Math.floor(x), iy = Math.floor(y)
    const fx = ease(x - ix), fy = ease(y - iy)
    const i0 = ((ix % period) + period) % period, i1 = (i0 + 1) % period
    const seed = 5 + o * 101
    const v00 = hash(i0, iy, seed), v10 = hash(i1, iy, seed), v01 = hash(i0, iy + 1, seed), v11 = hash(i1, iy + 1, seed)
    const low = v00 + (v10 - v00) * fx
    sum += amp * (low + (v01 + (v11 - v01) * fx - low) * fy)
    weight += amp
    amp *= 0.5
    freq *= 2
  }
  // The middle half of what noise gives, spread over the whole depth: plain noise seldom reaches its ends.
  const h = (sum / weight - 0.25) * 2
  return h < 0 ? 0 : h > 1 ? 1 : h
}

const FUNCTIONS = { wabennetz, ziegel, noppen, gehaemmert, strick, korb, ringe, rauschen }

/** Whether a family is one of the worked-out ones. */
export function isComputedPattern(effect) {
  return Object.prototype.hasOwnProperty.call(FUNCTIONS, effect)
}

/**
 * The height 0..1 of a worked-out family at (cu, cv) in cells; `blur` is the softening the build's grid asks for
 * (a Gaussian's width in cells, as the picture families get it).
 */
export function computedHeight(effect, cu, cv, around, width, blur = 0) {
  // A flank at least three grid steps wide (the blur is about half a step).
  return FUNCTIONS[effect](cu, cv, around, width, 6 * blur)
}

/** How many fine features a family has across a cell: the build gives its grid that many more points. */
export function computedDetail(effect, width) {
  const w = Math.max(0.15, width)
  if (effect === 'strick') return 2.5
  if (effect === 'wabennetz' || effect === 'ziegel') return Math.min(4, Math.max(1.5, 0.8 / w))
  if (effect === 'ringe') return 2
  if (effect === 'rauschen') return 1.5
  return 1.5
}
