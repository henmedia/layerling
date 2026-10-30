/**
 * A photo as a template: find the object (a vase, a pot) in the photo and take its outline as the body
 * form - in real dimensions, entered beforehand. Usable without a browser (tests): `img` is
 * { width, height, data } with RGBA bytes like ImageData.
 *
 * How it is found: background = the colour at the image border (median); whatever differs clearly from it
 * belongs to the object (Otsu threshold, at least a fixed distance against noise); the largest connected
 * region counts - crumbs, dust and spots at the edge do not. If the border itself is busy
 * (a room, a shelf), there is no clear background: then `ok: false` with a reason. Rim and base, seen
 * at an angle from above as an ellipse, do not count towards the height.
 */
import { profileFromSamples } from './svg-import.mjs'

/** Longest side of the grid the search runs on (faster, and noise averages out). */
const GRID = 360

/** Average the image down to at most GRID pixels per side: { w, h, rgb (Float32, 3 per point), f (factor) }. */
function downsample(img) {
  const f = Math.max(1, Math.max(img.width, img.height) / GRID)
  const w = Math.max(1, Math.round(img.width / f)), h = Math.max(1, Math.round(img.height / f))
  const rgb = new Float32Array(w * h * 3)
  const cnt = new Float32Array(w * h)
  for (let y = 0; y < img.height; y++) {
    const gy = Math.min(h - 1, Math.floor(y / f))
    for (let x = 0; x < img.width; x++) {
      const gx = Math.min(w - 1, Math.floor(x / f))
      const k = (y * img.width + x) * 4, g = gy * w + gx
      // Transparent pixels (PNG) count as white.
      const a = img.data[k + 3] / 255
      rgb[g * 3] += img.data[k] * a + 255 * (1 - a)
      rgb[g * 3 + 1] += img.data[k + 1] * a + 255 * (1 - a)
      rgb[g * 3 + 2] += img.data[k + 2] * a + 255 * (1 - a)
      cnt[g]++
    }
  }
  for (let g = 0; g < w * h; g++) for (let c = 0; c < 3; c++) rgb[g * 3 + c] /= cnt[g] || 1
  return { w, h, rgb, f: img.width / w, fy: img.height / h }
}

const median = (list) => {
  const s = Float32Array.from(list).sort()
  return s.length ? s[s.length >> 1] : 0
}

/** Otsu threshold over values 0..max (256 levels). */
function otsu(values, max) {
  const hist = new Float64Array(256)
  for (const v of values) hist[Math.min(255, Math.floor((v / max) * 255))]++
  const total = values.length
  let sum = 0
  for (let i = 0; i < 256; i++) sum += i * hist[i]
  let sumB = 0, wB = 0, best = 0, at = 0
  for (let i = 0; i < 256; i++) {
    wB += hist[i]
    if (!wB || wB === total) continue
    sumB += i * hist[i]
    const mB = sumB / wB, mF = (sum - sumB) / (total - wB)
    const between = wB * (total - wB) * (mB - mF) ** 2
    if (between > best) { best = between; at = i }
  }
  return ((at + 0.5) / 255) * max
}

/**
 * Find the object in the photo. Returns { ok, box: { x0, y0, x1, y1 } in the photo's pixels (y down;
 * top and bottom are the centres of the rim and base ellipses), rows: per grid row from the top [left, right]
 * or null, top/bottom: first and last row of the body, grid: { w, h, f, fy }, threshold, autoThreshold, notes }.
 * `threshold` (0 to 1, a share of the largest colour distance) sets how far a colour must lie from the
 * background's to belong to the object (Trace); without it, it is found from the photo (Otsu). Both come back.
 */
export function findObject(img, { threshold = null } = {}) {
  if (!img || !(img.width > 2) || !(img.height > 2) || !img.data) return { ok: false, notes: ['Kein Bild.'] }
  const g = downsample(img)
  const { w, h, rgb } = g
  // Background: median of the border points, per colour channel.
  const border = []
  for (let x = 0; x < w; x++) border.push(x, (h - 1) * w + x)
  for (let y = 1; y < h - 1; y++) border.push(y * w, y * w + w - 1)
  const bg = [0, 1, 2].map((c) => median(border.map((p) => rgb[p * 3 + c])))
  const dist = new Float32Array(w * h)
  for (let p = 0; p < w * h; p++) dist[p] = Math.hypot(rgb[p * 3] - bg[0], rgb[p * 3 + 1] - bg[1], rgb[p * 3 + 2] - bg[2])
  const MIN = 28
  // Busy border: many border points differ clearly from the median - then there is no clear background.
  const busy = border.filter((p) => dist[p] > 2 * MIN).length / border.length
  if (busy > 0.35) return { ok: false, notes: ['Der Hintergrund ist unruhig (am Bildrand keine einheitliche Farbe) – der Gegenstand lässt sich nicht sicher finden. Am besten vor einer hellen, einfarbigen Wand fotografieren; sonst „Kalibrieren“.'] }
  const auto = Math.max(MIN, otsu(dist, 442))
  const T = threshold === null ? auto : Math.min(438, Math.max(4, threshold * 442))
  const fg = new Uint8Array(w * h)
  for (let p = 0; p < w * h; p++) fg[p] = dist[p] > T ? 1 : 0
  // Largest connected region (4-neighbourhood).
  const label = new Int32Array(w * h).fill(-1)
  let bestLabel = -1, bestSize = 0
  const stack = []
  for (let p = 0, n = 0; p < w * h; p++) {
    if (!fg[p] || label[p] >= 0) continue
    let size = 0
    label[p] = n
    stack.push(p)
    while (stack.length) {
      const q = stack.pop()
      size++
      const x = q % w, y = (q - x) / w
      for (const r of [x > 0 ? q - 1 : -1, x < w - 1 ? q + 1 : -1, y > 0 ? q - w : -1, y < h - 1 ? q + w : -1]) {
        if (r >= 0 && fg[r] && label[r] < 0) { label[r] = n; stack.push(r) }
      }
    }
    if (size > bestSize) { bestSize = size; bestLabel = n }
    n++
  }
  if (bestLabel < 0 || bestSize < 0.01 * w * h) return { ok: false, notes: ['Im Foto hebt sich nichts deutlich vom Hintergrund ab.'] }
  // Per row, the left and right edge of the region.
  const rows = []
  for (let y = 0; y < h; y++) {
    let lo = -1, hi = -1
    for (let x = 0; x < w; x++) if (label[y * w + x] === bestLabel) { if (lo < 0) lo = x; hi = x }
    rows.push(lo < 0 ? null : [lo, hi])
  }
  const object = objectFromRows(rows, g)
  if (!object.ok) return object
  return { ...object, threshold: T / 442, autoThreshold: auto / 442 }
}

/**
 * The object drawn round by hand (the magnetic lasso of Trace) instead of found: `outline` a closed polygon
 * in the photo's pixels ([x, y], y down). Inside it is the object, whatever the background - a shelf, a room.
 * Returns the same as findObject (without a threshold), or `ok: false` when the outline holds next to nothing.
 */
export function outlineObject(img, outline) {
  if (!img || !(img.width > 2) || !(img.height > 2)) return { ok: false, notes: ['Kein Bild.'] }
  if (!outline || outline.length < 3) return { ok: false, notes: ['Kein Gegenstand gefunden.'] }
  const f = Math.max(1, Math.max(img.width, img.height) / GRID)
  const w = Math.max(1, Math.round(img.width / f)), h = Math.max(1, Math.round(img.height / f))
  const g = { w, h, f: img.width / w, fy: img.height / h }
  // Per grid row, through its middle: the outline's crossings, from the first to the last a grid point's middle lies between.
  const rows = []
  let inside = 0
  for (let y = 0; y < h; y++) {
    const sy = (y + 0.5) * g.fy
    const crossings = []
    for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
      const [ax, ay] = outline[j], [bx, by] = outline[i]
      if ((ay > sy) !== (by > sy)) crossings.push(ax + ((sy - ay) * (bx - ax)) / (by - ay))
    }
    crossings.sort((a, b) => a - b)
    let lo = -1, hi = -1
    for (let k = 0; k + 1 < crossings.length; k += 2) {
      const from = Math.max(0, Math.ceil(crossings[k] / g.f - 0.5)), to = Math.min(w - 1, Math.floor(crossings[k + 1] / g.f - 0.5))
      if (to < from) continue
      inside += to - from + 1
      if (lo < 0) lo = from
      hi = to
    }
    rows.push(lo < 0 ? null : [lo, hi])
  }
  if (inside < 0.002 * w * h) return { ok: false, notes: ['Der Gegenstand ist im Foto zu klein für einen Umriss.'] }
  return objectFromRows(rows, g, { drawn: true })
}

/**
 * The object from its extent per grid row ([left, right] or null): its box in the photo's pixels, top and
 * bottom without the ellipses of rim and base, and notes. `drawn`: drawn round by hand, so filling the photo
 * is no sign of a missing background.
 */
function objectFromRows(rows, g, { drawn = false } = {}) {
  const { w, h } = g
  let y0 = h, y1 = -1, x0 = w, x1 = -1
  rows.forEach((row, y) => {
    if (!row) return
    y0 = Math.min(y0, y); y1 = Math.max(y1, y); x0 = Math.min(x0, row[0]); x1 = Math.max(x1, row[1])
  })
  const notes = []
  if (!drawn && x1 - x0 >= w - 2 && y1 - y0 >= h - 2) return { ok: false, notes: ['Der gefundene Bereich füllt das ganze Foto – der Gegenstand hebt sich nicht vom Hintergrund ab.'] }
  if (x0 === 0 || x1 === w - 1 || y0 === 0) notes.push('Der Gegenstand reicht bis an den Bildrand – vielleicht ist er angeschnitten.')
  // Perspective: photographed slightly from above, rim and base appear as ellipses - the outermost rows
  // get abruptly narrower (more than 8 % per row; a real foot tapers off more gently). They do not count
  // towards the height: rim and base lie in the middle of their ellipse, where the full width is reached.
  const width = (y) => (rows[y] ? rows[y][1] - rows[y][0] + 1 : 0)
  const capMax = Math.max(1, Math.round(0.05 * (y1 - y0 + 1)))
  let top = y0, bottom = y1
  while (top < y0 + capMax && width(top) < 0.92 * width(top + 1)) top++
  while (bottom > y1 - capMax && width(bottom) < 0.92 * width(bottom - 1)) bottom--
  // Towards its middle the ellipse flattens out: after the steep part, go on while it still gets noticeably wider.
  if (top > y0) while (top < y0 + capMax && width(top) < 0.98 * width(top + 1)) top++
  if (bottom < y1) while (bottom > y1 - capMax && width(bottom) < 0.98 * width(bottom - 1)) bottom--
  if (top > y0 + 1 || bottom < y1 - 1) notes.push('Rand und Boden erscheinen als Ellipse (leicht von oben fotografiert) – gemessen wird zwischen ihren Mitten.')
  const box = { x0: x0 * g.f, y0: top * g.fy, x1: (x1 + 1) * g.f, y1: (bottom + 1) * g.fy }
  return { ok: true, box, rows, top, bottom, grid: { w, h, f: g.f, fy: g.fy }, notes }
}

/**
 * Outline of a found object as a body form: per row half the width (the middle taken per row - in case
 * it stands askew), smoothed and simplified to a few points. `height`, `diameter`: real dimensions in mm
 * (diameter = the widest point); without a diameter, the height's scale applies across as well.
 * `maxPoints` and `cornerAngle` as in profileFromSamples (Trace sets them).
 * Returns { ok, profilePoints, height, diameter, notes } like the SVG import.
 */
export function photoProfile(found, { height, diameter = null, tolerance = null, maxPoints, cornerAngle } = {}) {
  if (!found?.ok) return { ok: false, notes: found?.notes ?? ['Kein Gegenstand gefunden.'] }
  if (!(height > 0)) return { ok: false, notes: ['Bitte die Höhe des Gegenstands in mm angeben.'] }
  const { rows, grid, top, bottom } = found
  const n = bottom - top + 1
  if (n < 8) return { ok: false, notes: ['Der Gegenstand ist im Foto zu klein für einen Umriss.'] }
  // Half the width per row in the photo's pixels; gaps (a row without a hit) are bridged.
  const half = []
  for (let y = top; y <= bottom; y++) half.push(rows[y] ? ((rows[y][1] - rows[y][0] + 1) * grid.f) / 2 : null)
  for (let k = 0; k < n; k++) {
    if (half[k] !== null) continue
    let a = k - 1, b = k + 1
    while (b < n && half[b] === null) b++
    half[k] = a >= 0 && b < n ? (half[a] + half[b]) / 2 : a >= 0 ? half[a] : half[b]
  }
  // Smooth: a running median over 5 rows (edges stay), then a mean over 3.
  const med = half.map((_, k) => median(half.slice(Math.max(0, k - 2), k + 3)))
  const smooth = med.map((_, k) => (med[Math.max(0, k - 1)] + med[k] + med[Math.min(n - 1, k + 1)]) / 3)
  const pxH = n * grid.fy
  const sy = height / pxH
  const widest = Math.max(...smooth) * 2
  const sx = diameter > 0 ? diameter / widest : sy
  // From bottom to top: t = 0 at the foot.
  const ts = [], rs = []
  for (let k = n - 1; k >= 0; k--) {
    ts.push((n - 1 - k) / (n - 1))
    rs.push(smooth[k] * sx)
  }
  const tol = tolerance ?? Math.max(0.3, height / 300)
  const fit = profileFromSamples(ts, rs, height, { tolerance: tol, maxPoints, cornerAngle })
  if (!fit) return { ok: false, notes: ['Aus dem Umriss lässt sich keine Körperform ablesen.'] }
  const notes = [...found.notes]
  const ratio = diameter > 0 ? sx / sy : 1
  if (Math.abs(ratio - 1) > 0.08) notes.push(`Breite und Höhe passen nicht zum Seitenverhältnis im Foto (quer ${Math.round((ratio - 1) * 100)} % gestreckt) – schräg fotografiert? Der Umriss folgt den eingegebenen Maßen.`)
  return { ok: true, ...fit, height, diameter: diameter > 0 ? diameter : fit.diameter, notes }
}

/**
 * Placement of the photo behind the drawing (mm, y up), so that the found object is `height` high and
 * `diameter` wide (stretched across if need be), centred on the axis, with its foot on the bed:
 * { x0, y0, w, h } as the photo lies in the drawing area.
 */
export function photoPlacement(img, box, { height, diameter = null }) {
  const sy = height / (box.y1 - box.y0)
  const sx = diameter > 0 ? diameter / (box.x1 - box.x0) : sy
  const w = img.width * sx, h = img.height * sy
  const cx = ((box.x0 + box.x1) / 2) * sx
  return { x0: -cx, y0: -(img.height - box.y1) * sy, w, h }
}
