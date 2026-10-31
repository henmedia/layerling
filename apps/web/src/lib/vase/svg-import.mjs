/**
 * Reading SVG for the vase: a cross-section (one closed outline seen from above) and a body form
 * (the silhouette seen from the side). A plain ES module without the DOM - runs in the browser, in
 * a worker and in Node.
 *
 * It reads path (all commands, relative and absolute), polygon, polyline, rect (also with round
 * corners), circle, ellipse and line, in groups with `transform`. The size comes from width/height
 * and viewBox (mm, cm, in, pt, pc, px; without a unit px, as in the browser), so that the measures
 * come out in mm. Hidden layers (display:none) and defs, clipPath etc. do not count.
 *
 *   readSvg(text)        -> { paths: [{ start, segs: [{ c1, c2, p }], closed }], notes }  (mm, y up)
 *   svgToSection(text)   -> { ok, drawPoints, notes, size }   outline as drawn points (symmetry "Free")
 *   svgToProfile(text)   -> { ok, profilePoints, height, diameter, notes }
 */
import { MAX_DRAW_POINTS, PROFILE_CORNER, PROFILE_HANDLE, profileSpline } from './vase-geometry.mjs'

const MM = { mm: 1, cm: 10, in: 25.4, pt: 25.4 / 72, pc: 25.4 / 6, px: 25.4 / 96, '': 25.4 / 96 }
const SKIP = new Set(['defs', 'clippath', 'mask', 'symbol', 'pattern', 'marker', 'lineargradient', 'radialgradient', 'filter', 'title', 'desc', 'metadata', 'style', 'script', 'text', 'foreignobject'])
const NUM = /[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/y
const KAPPA = 0.5522847498307936

/* ---------- Affine maps [a, b, c, d, e, f]: x' = a x + c y + e, y' = b x + d y + f ---------- */

const IDENTITY = [1, 0, 0, 1, 0, 0]
const mul = (m, n) => [
  m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
]
const apply = (m, [x, y]) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]

function parseTransform(text) {
  let m = IDENTITY
  if (!text) return m
  for (const [, name, args] of text.matchAll(/(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g)) {
    const v = (args.match(/[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) ?? []).map(Number)
    let t = IDENTITY
    if (name === 'matrix' && v.length >= 6) t = v.slice(0, 6)
    else if (name === 'translate') t = [1, 0, 0, 1, v[0] ?? 0, v[1] ?? 0]
    else if (name === 'scale') t = [v[0] ?? 1, 0, 0, v[1] ?? v[0] ?? 1, 0, 0]
    else if (name === 'rotate') {
      const a = ((v[0] ?? 0) * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a)
      const [cx, cy] = [v[1] ?? 0, v[2] ?? 0]
      t = mul(mul([1, 0, 0, 1, cx, cy], [c, s, -s, c, 0, 0]), [1, 0, 0, 1, -cx, -cy])
    } else if (name === 'skewX') t = [1, 0, Math.tan(((v[0] ?? 0) * Math.PI) / 180), 1, 0, 0]
    else if (name === 'skewY') t = [1, Math.tan(((v[0] ?? 0) * Math.PI) / 180), 0, 1, 0, 0]
    m = mul(m, t)
  }
  return m
}

/** Length with a unit -> mm; null without a number or for a percentage. */
function lengthMm(text) {
  const m = /^\s*([-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?)\s*([a-z%]*)\s*$/i.exec(text ?? '')
  if (!m || m[2] === '%') return null
  const f = MM[m[2].toLowerCase()]
  return f === undefined ? null : Number(m[1]) * f
}

/* ---------- Paths: everything as cubic Bezier pieces ---------- */

const lineSeg = (a, b) => ({ c1: [a[0] + (b[0] - a[0]) / 3, a[1] + (b[1] - a[1]) / 3], c2: [a[0] + (2 * (b[0] - a[0])) / 3, a[1] + (2 * (b[1] - a[1])) / 3], p: b, line: true })

/** Elliptical arc (SVG endpoint form) as Bezier pieces of at most 90 degrees. */
function arcSegs(from, rx, ry, phiDeg, large, sweep, to) {
  const [x1, y1] = from, [x2, y2] = to
  if (Math.abs(x1 - x2) < 1e-12 && Math.abs(y1 - y2) < 1e-12) return []
  rx = Math.abs(rx); ry = Math.abs(ry)
  if (rx < 1e-12 || ry < 1e-12) return [lineSeg(from, to)]
  const phi = (phiDeg * Math.PI) / 180, cos = Math.cos(phi), sin = Math.sin(phi)
  const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2
  const x1p = cos * dx + sin * dy, y1p = -sin * dx + cos * dy
  const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry)
  if (lambda > 1) { rx *= Math.sqrt(lambda); ry *= Math.sqrt(lambda) }
  const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p
  const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p
  const coef = Math.sqrt(Math.max(0, num / den)) * (large === sweep ? -1 : 1)
  const cxp = (coef * rx * y1p) / ry, cyp = (-coef * ry * x1p) / rx
  const cx = cos * cxp - sin * cyp + (x1 + x2) / 2, cy = sin * cxp + cos * cyp + (y1 + y2) / 2
  const ang = (ux, uy, vx, vy) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy)
  const th1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry)
  let dth = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry)
  if (!sweep && dth > 0) dth -= 2 * Math.PI
  if (sweep && dth < 0) dth += 2 * Math.PI
  const n = Math.max(1, Math.ceil(Math.abs(dth) / (Math.PI / 2) - 1e-9))
  const d = dth / n, k = (4 / 3) * Math.tan(d / 4)
  const map = (u, v) => [cx + rx * u * cos - ry * v * sin, cy + rx * u * sin + ry * v * cos]
  const out = []
  for (let i = 0; i < n; i++) {
    const a0 = th1 + i * d, a1 = a0 + d
    const p = i === n - 1 ? [x2, y2] : map(Math.cos(a1), Math.sin(a1))
    out.push({ c1: map(Math.cos(a0) - k * Math.sin(a0), Math.sin(a0) + k * Math.cos(a0)), c2: map(Math.cos(a1) + k * Math.sin(a1), Math.sin(a1) - k * Math.cos(a1)), p })
  }
  return out
}

/** Reads path data `d`. An error in the text ends the reading at that point (as in the browser). */
export function parsePathData(d) {
  const paths = []
  let i = 0
  const n = d.length
  const skip = () => { while (i < n && /[\s,]/.test(d[i])) i++ }
  const num = () => {
    skip()
    NUM.lastIndex = i
    const m = NUM.exec(d)
    if (!m) return null
    i = NUM.lastIndex
    return Number(m[0])
  }
  const flag = () => {
    skip()
    if (d[i] === '0' || d[i] === '1') return Number(d[i++])
    return null
  }
  let cur = [0, 0], start = [0, 0], sub = null, cmd = null, lastCtrl = null, lastCmd = ''
  const begin = (pt) => { sub = { start: pt, segs: [], closed: false }; paths.push(sub); start = pt; cur = pt }
  const push = (seg) => { if (!sub) begin(cur); sub.segs.push(seg); cur = seg.p }
  while (i < n) {
    skip()
    if (i >= n) break
    if (/[a-zA-Z]/.test(d[i])) cmd = d[i++]
    else if (cmd === null) break
    const rel = cmd === cmd.toLowerCase()
    const C = cmd.toUpperCase()
    const at = (x, y) => (rel ? [cur[0] + x, cur[1] + y] : [x, y])
    let ok = true
    if (C === 'Z') {
      if (sub) {
        if (Math.hypot(cur[0] - start[0], cur[1] - start[1]) > 1e-9) push(lineSeg(cur, start))
        sub.closed = true
        cur = start
        sub = null
      }
      lastCtrl = null
      lastCmd = 'Z'
      // Z is always followed by a new command; numbers after it would be an error.
      skip()
      if (i < n && !/[a-zA-Z]/.test(d[i])) break
      continue
    }
    if (C === 'M') {
      const x = num(), y = num()
      if (x === null || y === null) break
      begin(at(x, y))
      cmd = rel ? 'l' : 'L' // further number pairs are lines
      lastCtrl = null
    } else if (C === 'L') {
      const x = num(), y = num()
      if (x === null || y === null) break
      push(lineSeg(cur, at(x, y)))
      lastCtrl = null
    } else if (C === 'H' || C === 'V') {
      const v = num()
      if (v === null) break
      const p = C === 'H' ? [rel ? cur[0] + v : v, cur[1]] : [cur[0], rel ? cur[1] + v : v]
      push(lineSeg(cur, p))
      lastCtrl = null
    } else if (C === 'C' || C === 'S') {
      let c1
      if (C === 'C') {
        const a = num(), b = num()
        if (a === null || b === null) break
        c1 = at(a, b)
      } else c1 = lastCtrl && /[CS]/.test(lastCmd) ? [2 * cur[0] - lastCtrl[0], 2 * cur[1] - lastCtrl[1]] : cur
      const e = num(), f = num(), x = num(), y = num()
      if ([e, f, x, y].includes(null)) break
      const c2 = at(e, f), p = at(x, y)
      push({ c1, c2, p })
      lastCtrl = c2
    } else if (C === 'Q' || C === 'T') {
      let q
      if (C === 'Q') {
        const a = num(), b = num()
        if (a === null || b === null) break
        q = at(a, b)
      } else q = lastCtrl && /[QT]/.test(lastCmd) ? [2 * cur[0] - lastCtrl[0], 2 * cur[1] - lastCtrl[1]] : cur
      const x = num(), y = num()
      if (x === null || y === null) break
      const p = at(x, y)
      // Quadratic -> cubic, exact.
      push({ c1: [cur[0] + (2 / 3) * (q[0] - cur[0]), cur[1] + (2 / 3) * (q[1] - cur[1])], c2: [p[0] + (2 / 3) * (q[0] - p[0]), p[1] + (2 / 3) * (q[1] - p[1])], p })
      lastCtrl = q
    } else if (C === 'A') {
      const rx = num(), ry = num(), rot = num(), large = flag(), sweep = flag(), x = num(), y = num()
      if ([rx, ry, rot, large, sweep, x, y].includes(null)) break
      const from = cur
      for (const seg of arcSegs(from, rx, ry, rot, large, sweep, at(x, y))) push(seg)
      lastCtrl = null
    } else ok = false
    if (!ok) break
    lastCmd = C
  }
  return paths.filter((p) => p.segs.length > 0)
}

/** Basic shapes as paths. */
function ellipsePath(cx, cy, rx, ry) {
  const k = KAPPA
  const P = (u, v) => [cx + rx * u, cy + ry * v]
  return [{ start: P(1, 0), closed: true, segs: [
    { c1: P(1, k), c2: P(k, 1), p: P(0, 1) },
    { c1: P(-k, 1), c2: P(-1, k), p: P(-1, 0) },
    { c1: P(-1, -k), c2: P(-k, -1), p: P(0, -1) },
    { c1: P(k, -1), c2: P(1, -k), p: P(1, 0) },
  ] }]
}
function pointsPath(text, closed) {
  const v = (text?.match(/[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) ?? []).map(Number)
  const pts = []
  for (let k = 0; k + 1 < v.length; k += 2) pts.push([v[k], v[k + 1]])
  if (pts.length < 2) return []
  const segs = []
  for (let k = 1; k < pts.length; k++) segs.push(lineSeg(pts[k - 1], pts[k]))
  if (closed && Math.hypot(pts[0][0] - pts.at(-1)[0], pts[0][1] - pts.at(-1)[1]) > 1e-9) segs.push(lineSeg(pts.at(-1), pts[0]))
  return [{ start: pts[0], segs, closed }]
}
function rectPath(a) {
  const x = Number(a.x ?? 0), y = Number(a.y ?? 0), w = Number(a.width), h = Number(a.height)
  if (!(w > 0 && h > 0)) return []
  let rx = a.rx !== undefined ? Number(a.rx) : NaN, ry = a.ry !== undefined ? Number(a.ry) : NaN
  if (!Number.isFinite(rx) && Number.isFinite(ry)) rx = ry
  if (!Number.isFinite(ry) && Number.isFinite(rx)) ry = rx
  rx = Math.min(Math.max(0, rx || 0), w / 2); ry = Math.min(Math.max(0, ry || 0), h / 2)
  if (rx === 0 || ry === 0) return pointsPath(`${x},${y} ${x + w},${y} ${x + w},${y + h} ${x},${y + h}`, true)
  const k = KAPPA
  const segs = []
  let cur = [x + rx, y]
  const L = (p) => { segs.push(lineSeg(cur, p)); cur = p }
  const A = (c1, c2, p) => { segs.push({ c1, c2, p }); cur = p }
  L([x + w - rx, y]); A([x + w - rx + k * rx, y], [x + w, y + ry - k * ry], [x + w, y + ry])
  L([x + w, y + h - ry]); A([x + w, y + h - ry + k * ry], [x + w - rx + k * rx, y + h], [x + w - rx, y + h])
  L([x + rx, y + h]); A([x + rx - k * rx, y + h], [x, y + h - ry + k * ry], [x, y + h - ry])
  L([x, y + ry]); A([x, y + ry - k * ry], [x + rx - k * rx, y], [x + rx, y])
  return [{ start: [x + rx, y], segs, closed: true }]
}

function attrs(text) {
  const out = {}
  for (const m of text.matchAll(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) out[m[1]] = m[2] ?? m[3]
  return out
}
const hidden = (a) => a.display === 'none' || /(^|;)\s*display\s*:\s*none/.test(a.style ?? '') || a.visibility === 'hidden'

/**
 * All shapes of an SVG file as paths in mm, y up (like the drawing boards). `notes`
 * reports what did not work (no measures in the file, nothing found).
 */
export function readSvg(text) {
  const notes = []
  const src = String(text ?? '').replace(/<!--[\s\S]*?-->/g, '').replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '').replace(/<\?[\s\S]*?\?>/g, '').replace(/<!DOCTYPE[^>]*>/gi, '')
  const stack = [IDENTITY]
  let skipDepth = 0
  let root = null
  const raw = []
  for (const m of src.matchAll(/<(\/?)([a-zA-Z][\w:.-]*)([^>]*?)(\/?)>/g)) {
    const [, close, tagRaw, attrText, selfClose] = m
    const tag = tagRaw.toLowerCase().replace(/^svg:/, '')
    if (close) {
      if (skipDepth > 0) skipDepth--
      else if (stack.length > 1) stack.pop()
      continue
    }
    const a = attrs(attrText)
    if (skipDepth > 0 || SKIP.has(tag) || hidden(a)) {
      if (!selfClose) skipDepth++
      continue
    }
    if (tag === 'svg' && !root) {
      root = a
      if (!selfClose) stack.push(IDENTITY)
      continue
    }
    const m2 = mul(stack.at(-1), parseTransform(a.transform))
    let shapes = null
    if (tag === 'path') shapes = parsePathData(a.d ?? '')
    else if (tag === 'polygon') shapes = pointsPath(a.points, true)
    else if (tag === 'polyline') shapes = pointsPath(a.points, false)
    else if (tag === 'line') shapes = pointsPath(`${a.x1 ?? 0},${a.y1 ?? 0} ${a.x2 ?? 0},${a.y2 ?? 0}`, false)
    else if (tag === 'rect') shapes = rectPath(a)
    else if (tag === 'circle') shapes = Number(a.r) > 0 ? ellipsePath(Number(a.cx ?? 0), Number(a.cy ?? 0), Number(a.r), Number(a.r)) : []
    else if (tag === 'ellipse') shapes = Number(a.rx) > 0 && Number(a.ry) > 0 ? ellipsePath(Number(a.cx ?? 0), Number(a.cy ?? 0), Number(a.rx), Number(a.ry)) : []
    else if (tag === 'svg') {
      // Nested svg: like a group, moved by x/y (its viewBox does not count here).
      if (!selfClose) stack.push(mul(stack.at(-1), [1, 0, 0, 1, Number(a.x ?? 0), Number(a.y ?? 0)]))
      continue
    }
    if (shapes) {
      for (const sh of shapes) raw.push({ ...sh, m: m2 })
      continue
    }
    // Group or unknown container: its transform applies to everything inside it.
    if (!selfClose) stack.push(m2)
  }
  if (!root) notes.push('Keine SVG-Datei erkannt.')
  // User units -> mm: viewBox and width/height; without them 96 px per inch, as in the browser.
  let unit = [MM.px, 0, 0, MM.px, 0, 0]
  const vb = (root?.viewBox ?? '').split(/[\s,]+/).filter(Boolean).map(Number)
  const W = lengthMm(root?.width), H = lengthMm(root?.height)
  if (vb.length === 4 && vb[2] > 0 && vb[3] > 0) {
    let sx = W !== null ? W / vb[2] : H !== null ? H / vb[3] : MM.px
    let sy = H !== null ? H / vb[3] : sx
    if (W === null && H !== null) sx = sy
    // Aspect ratio as with preserveAspectRatio "xMidYMid meet": the same scale, centred.
    const s = Math.min(sx, sy)
    const ox = W !== null ? (W - vb[2] * s) / 2 : 0, oy = H !== null ? (H - vb[3] * s) / 2 : 0
    unit = [s, 0, 0, s, ox - vb[0] * s, oy - vb[1] * s]
  }
  if (root && W === null && H === null) notes.push('Die Datei nennt keine Größe in mm – gelesen wie im Browser (96 px je Zoll).')
  // y up (SVG points down).
  const flip = mul([1, 0, 0, -1, 0, 0], unit)
  const paths = raw.map(({ start, segs, closed, m }) => {
    const t = mul(flip, m)
    return { start: apply(t, start), closed, segs: segs.map((s) => ({ c1: apply(t, s.c1), c2: apply(t, s.c2), p: apply(t, s.p), line: s.line === true })) }
  })
  if (root && !paths.length) notes.push('In der Datei steht keine Form (Pfad, Vieleck, Rechteck, Kreis).')
  return { paths, notes }
}

/* ---------- Helpers ---------- */

function bez(a, s, t) {
  const u = 1 - t
  return [
    u * u * u * a[0] + 3 * u * u * t * s.c1[0] + 3 * u * t * t * s.c2[0] + t * t * t * s.p[0],
    u * u * u * a[1] + 3 * u * u * t * s.c1[1] + 3 * u * t * t * s.c2[1] + t * t * t * s.p[1],
  ]
}
/** Path as a polyline (a closed one without repeating its start). */
function flatten(path, steps = 24) {
  const out = [path.start]
  let a = path.start
  for (const s of path.segs) {
    const n = s.line ? 1 : steps
    for (let k = 1; k <= n; k++) out.push(bez(a, s, k / n))
    a = s.p
  }
  if (Math.hypot(out[0][0] - out.at(-1)[0], out[0][1] - out.at(-1)[1]) < 1e-9) out.pop()
  return out
}
function area(poly) {
  let a = 0
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) a += (poly[j][0] - poly[i][0]) * (poly[j][1] + poly[i][1])
  return a / 2
}
function centroid(poly) {
  let cx = 0, cy = 0, a = 0
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const f = poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1]
    a += f
    cx += (poly[j][0] + poly[i][0]) * f
    cy += (poly[j][1] + poly[i][1]) * f
  }
  return Math.abs(a) < 1e-12 ? null : [cx / (3 * a), cy / (3 * a)]
}
function bbox(poly) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const [x, y] of poly) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y) }
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 }
}
function insidePoly(poly, [x, y]) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j]
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}
/** The largest closed shape (open ones are closed), with its polyline. */
function largest(paths) {
  let best = null
  for (const path of paths) {
    const poly = flatten(path)
    if (poly.length < 3) continue
    const a = Math.abs(area(poly))
    if (!best || a > best.area) best = { path, poly, area: a }
  }
  return best
}
const fmt = (v) => v.toLocaleString('de-DE', { maximumFractionDigits: 1 })

/** Simplifies a polyline (Douglas-Peucker) to at most `max` points; returns their indices. */
function simplifyClosed(poly, max) {
  const n = poly.length
  const keep = new Uint8Array(n)
  // Start at two points far apart.
  let far = 0
  for (let i = 1; i < n; i++) if (Math.hypot(poly[i][0] - poly[0][0], poly[i][1] - poly[0][1]) > Math.hypot(poly[far][0] - poly[0][0], poly[far][1] - poly[0][1])) far = i
  keep[0] = keep[far] = 1
  const segDist = (p, a, b) => {
    const dx = b[0] - a[0], dy = b[1] - a[1]
    const l = dx * dx + dy * dy
    const t = l > 0 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l)) : 0
    return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy)
  }
  let count = 2
  while (count < max) {
    // The largest deviation over all sections between kept points.
    let best = -1, bestD = 0
    const kept = []
    for (let i = 0; i < n; i++) if (keep[i]) kept.push(i)
    for (let k = 0; k < kept.length; k++) {
      const a = kept[k], b = kept[(k + 1) % kept.length]
      for (let i = (a + 1) % n; i !== b; i = (i + 1) % n) {
        const d = segDist(poly[i], poly[a], poly[b])
        if (d > bestD) { bestD = d; best = i }
      }
    }
    if (best < 0 || bestD < 1e-4) break
    keep[best] = 1
    count++
  }
  const out = []
  for (let i = 0; i < n; i++) if (keep[i]) out.push(i)
  return out
}

/* ---------- Cross-section ---------- */

/**
 * The largest closed shape as a cross-section: points in the unit circle round the centroid,
 * largest radius 1, anticlockwise. Every Bezier node becomes a point with its own tangents
 * before and after it - the curve stays the same. More than 120 nodes: simplified.
 */
export function svgToSection(text) {
  const read = readSvg(text)
  const paths = read.paths
  // For the cross-section only the shape counts, not the size (the diameter stays).
  const notes = read.notes.filter((n) => !/96 px je Zoll/.test(n))
  const best = largest(paths)
  if (!best) return { ok: false, notes: notes.length ? notes : ['Keine geschlossene Form gefunden.'] }
  const others = paths.filter((p) => p !== best.path).length
  if (others) notes.push(`${others === 1 ? 'Eine weitere Form' : `${others} weitere Formen`} in der Datei ${others === 1 ? 'bleibt' : 'bleiben'} unberücksichtigt – genommen wird die größte.`)
  if (!best.path.closed) notes.push('Die Form war offen und wird geschlossen.')
  let { path, poly } = best
  const c = centroid(poly)
  if (!c || !insidePoly(poly, c)) return { ok: false, notes: [...notes, 'Die Mitte der Form liegt nicht in der Form (z. B. ein C oder Ring) – so lässt sich keine Vase drehen.'] }
  // Anticlockwise: reverse the path if needed (Bezier pieces backwards).
  if (area(poly) < 0) {
    const pts = [path.start, ...path.segs.map((s) => s.p)]
    const segs = []
    for (let k = path.segs.length - 1; k >= 0; k--) {
      const s = path.segs[k]
      segs.push({ c1: s.c2, c2: s.c1, p: pts[k], line: s.line })
    }
    path = { start: pts.at(-1), segs, closed: true }
    poly = poly.slice().reverse()
  }
  // Pieces without length (doubled points, as drawing programs sometimes write them) are dropped.
  const segs = []
  let from = path.start
  for (const s of path.segs) {
    const same = (q) => Math.hypot(q[0] - from[0], q[1] - from[1]) < 1e-9
    if (same(s.p) && same(s.c1) && same(s.c2)) continue
    segs.push(s)
    from = s.p
  }
  // Closed: a last line back to the start, if it is missing.
  const last = segs.at(-1).p
  if (Math.hypot(last[0] - path.start[0], last[1] - path.start[1]) > 1e-9) segs.push(lineSeg(last, path.start))
  const maxR = Math.max(...poly.map(([x, y]) => Math.hypot(x - c[0], y - c[1])))
  const n = (q) => [(q[0] - c[0]) / maxR, (q[1] - c[1]) / maxR]
  const size = bbox(poly)
  let drawPoints
  if (segs.length <= MAX_DRAW_POINTS) {
    // Point k sits at the start of piece k; tangent after it = 3 (c1 - point), before it = 3 (point - c2 of the piece before).
    drawPoints = segs.map((s, k) => {
      const prev = segs[(k - 1 + segs.length) % segs.length]
      const P = k === 0 ? path.start : segs[k - 1].p
      const [x, y] = n(P)
      if (s.line && prev.line) return { x, y, corner: true }
      const out = [(3 * (s.c1[0] - P[0])) / maxR, (3 * (s.c1[1] - P[1])) / maxR]
      const inn = [(3 * (P[0] - prev.c2[0])) / maxR, (3 * (P[1] - prev.c2[1])) / maxR]
      const q = { x, y, corner: false, tx: out[0], ty: out[1] }
      if (Math.hypot(out[0] - inn[0], out[1] - inn[1]) > 1e-9) Object.assign(q, { ix: inn[0], iy: inn[1] })
      return q
    })
  } else {
    // Too many nodes: sample densely, simplify; kinks over 35 degrees become corners.
    const dense = flatten({ start: path.start, segs }, 16)
    const keep = simplifyClosed(dense, MAX_DRAW_POINTS)
    drawPoints = keep.map((i, k) => {
      const a = dense[keep[(k - 1 + keep.length) % keep.length]], b = dense[i], d = dense[keep[(k + 1) % keep.length]]
      const t1 = Math.atan2(b[1] - a[1], b[0] - a[0]), t2 = Math.atan2(d[1] - b[1], d[0] - b[0])
      let turn = Math.abs(t2 - t1)
      if (turn > Math.PI) turn = 2 * Math.PI - turn
      const [x, y] = n(b)
      return { x, y, corner: turn > (35 * Math.PI) / 180 }
    })
    notes.push(`Der Umriss hat ${segs.length} Abschnitte – auf ${drawPoints.length} Punkte vereinfacht.`)
  }
  return { ok: true, drawPoints, notes, size: { width: size.w, height: size.h } }
}

/* ---------- Body form ---------- */

/** Crossings of a horizontal line with the polyline. */
function crossings(poly, y) {
  const xs = []
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j]
    if ((yi > y) !== (yj > y)) xs.push(xi + ((y - yi) * (xj - xi)) / (yj - yi))
  }
  return xs
}

/**
 * A silhouette as a body form: radius per height. Whole silhouette -> half the width; right half
 * with a straight vertical edge on the left -> distance to that edge (the axis). From that, points
 * with handles, as few as possible, until the curve is at most `tolerance` mm off.
 */
export function svgToProfile(text, { tolerance = 0.2 } = {}) {
  const { paths, notes } = readSvg(text)
  const best = largest(paths)
  if (!best) return { ok: false, notes: notes.length ? notes : ['Keine geschlossene Form gefunden.'] }
  const others = paths.filter((p) => p !== best.path).length
  if (others) notes.push(`${others === 1 ? 'Eine weitere Form' : `${others} weitere Formen`} in der Datei ${others === 1 ? 'bleibt' : 'bleiben'} unberücksichtigt – genommen wird die größte.`)
  const poly = best.poly
  const box = bbox(poly)
  if (box.h < 1e-6 || box.w < 1e-6) return { ok: false, notes: [...notes, 'Die Form hat keine Höhe oder Breite.'] }
  const N = 400
  const ts = [], los = [], his = []
  for (let k = 0; k <= N; k++) {
    const t = k / N
    const y = box.y0 + box.h * Math.min(1 - 1e-6, Math.max(1e-6, t))
    const xs = crossings(poly, y)
    if (!xs.length) continue
    ts.push(t)
    los.push(Math.min(...xs))
    his.push(Math.max(...xs))
  }
  // Half: a straight vertical edge on the left almost everywhere, not on the right. A rectangle
  // (both sides straight) counts as the whole silhouette of a cylinder.
  const straight = (xs, at) => xs.filter((x) => Math.abs(x - at) < box.w * 0.01).length >= xs.length * 0.9
  const half = straight(los, box.x0) && !straight(his, box.x1)
  notes.push(half ? 'Gelesen als rechte Hälfte; die gerade linke Kante ist die Drehachse.' : 'Gelesen als ganze Silhouette; die Drehachse liegt in der Mitte.')
  const rs = his.map((hi, k) => Math.max(0, half ? hi - box.x0 : (hi - los[k]) / 2))
  const fit = profileFromSamples(ts, rs, box.h, { tolerance })
  if (!fit) return { ok: false, notes: [...notes, 'Aus der Form lässt sich keine Körperform ablesen.'] }
  notes.push(`Aus der Datei: ${fmt(fit.height)} mm hoch, ${fmt(fit.diameter)} mm breit, ${fit.profilePoints.length} Punkte.`)
  return { ok: true, ...fit, notes }
}

/**
 * Body form from measured radii: `ts` heights 0..1 (ascending), `rs` radii in mm, `H` height in mm.
 * Points with handles, as few as possible (at most 40), until the curve is at most `tolerance` mm off;
 * kinks over `cornerAngle` degrees (20 to start) become corners. Given `maxPoints` (Trace), as many points
 * as that, 3 to 40, unless the curve is within `tolerance` before. Shared by SVG, mesh and photo import.
 * Null when there is nothing.
 */
export function profileFromSamples(ts, rs, H, { tolerance = 0.2, maxPoints, cornerAngle = 20 } = {}) {
  const maxR = Math.max(...rs)
  if (!(maxR > 0) || ts.length < 3 || !(H > 0)) return null
  const asked = maxPoints !== undefined
  const most = asked ? Math.max(3, Math.min(40, Math.round(maxPoints))) : 40
  const r = rs.map((v) => v / maxR)
  // Slope (radius per height, normalised) left and right of every sample point.
  const slopeL = (k) => (k > 0 ? (r[k] - r[k - 1]) / (ts[k] - ts[k - 1]) : (r[1] - r[0]) / (ts[1] - ts[0]))
  const slopeR = (k) => (k < ts.length - 1 ? (r[k + 1] - r[k]) / (ts[k + 1] - ts[k]) : slopeL(k))
  const angleMm = (s) => Math.atan((s * maxR) / H)
  // A kink sharper than `cornerAngle` degrees is a corner; at 180 there are none.
  const isCorner = (k) => cornerAngle < 180 && k > 0 && k < ts.length - 1 && Math.abs(angleMm(slopeL(k)) - angleMm(slopeR(k))) > (cornerAngle * Math.PI) / 180
  const pointAt = (k) => {
    if (isCorner(k)) return [ts[k], Math.max(0.03, r[k]), PROFILE_CORNER]
    const s = k === 0 ? slopeR(0) : k === ts.length - 1 ? slopeL(k) : (slopeL(k) + slopeR(k)) / 2
    return [ts[k], Math.max(0.03, r[k]), PROFILE_HANDLE, Math.max(-40, Math.min(40, s))]
  }
  // Start with the bottom, the top, the widest place and all kinks; then insert where the
  // curve is furthest off, up to `maxPoints` points.
  const chosen = new Set([0, ts.length - 1, r.indexOf(1)])
  for (let k = 1; k < ts.length - 1 && chosen.size < Math.min(20, most); k++) if (isCorner(k)) chosen.add(k)
  const build = () => [...chosen].sort((a, b) => a - b).map(pointAt)
  let points = build()
  for (let round = 0; round < 40; round++) {
    const at = profileSpline(points).at
    let worst = -1, worstD = 0
    for (let k = 0; k < ts.length; k++) {
      // With a number of points asked for, the worst place that is not a point yet: one that is cannot get better.
      if (asked && chosen.has(k)) continue
      const d = Math.abs(at(ts[k]) - r[k]) * maxR
      if (d > worstD) { worstD = d; worst = k }
    }
    if (worstD <= tolerance || chosen.size >= most || worst < 0 || chosen.has(worst)) break
    chosen.add(worst)
    points = build()
  }
  return { profilePoints: points, height: H, diameter: 2 * maxR }
}
