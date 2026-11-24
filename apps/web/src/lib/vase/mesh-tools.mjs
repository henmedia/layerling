/**
 * Small mesh tools for bottoms and accessories: triangulating a polygon with holes
 * (ear clipping), joining two rings round the origin (zipper), circles.
 * Everything works with points [x, y] in a plane; the callers set the height.
 */

/** Twice the area of a polygon (positive = counter-clockwise). */
export function signedArea2(pts) {
  let a = 0
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) a += (pts[j][0] - pts[i][0]) * (pts[j][1] + pts[i][1])
  return a
}

/** Circle of n points, counter-clockwise (or clockwise with `cw`). */
export function circle(cx, cy, r, n, cw = false, phase = 0) {
  const out = []
  for (let k = 0; k < n; k++) {
    const a = phase + ((cw ? -1 : 1) * 2 * Math.PI * k) / n
    out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)])
  }
  return out
}

const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

function inTriangle(p, a, b, c) {
  // Strictly inside or on an edge (not the corners themselves).
  const d1 = cross(a, b, p), d2 = cross(b, c, p), d3 = cross(c, a, p)
  return d1 >= 0 && d2 >= 0 && d3 >= 0
}

/**
 * Triangulates a polygon with holes. `outer` counter-clockwise, each of `holes` clockwise
 * (the function reverses any given the wrong way round). Returns triangles as indices into
 * the point list [...outer, ...holes[0], ...holes[1], ...] - counter-clockwise. Meant for
 * small polygons (a few hundred points).
 */
export function triangulate(outer, holes = []) {
  const pts = []
  const ring = (list, wantCcw) => {
    const start = pts.length
    const ccw = signedArea2(list) > 0
    for (const p of list) pts.push(p)
    const idx = list.map((_, i) => start + i)
    return ccw === wantCcw ? idx : idx.reverse()
  }
  let poly = ring(outer, true)
  const holeRings = holes.map((h) => ring(h, false))
  // Bring the holes in one after another, the rightmost first.
  holeRings.sort((a, b) => Math.max(...b.map((i) => pts[i][0])) - Math.max(...a.map((i) => pts[i][0])))
  for (const hole of holeRings) poly = bridge(poly, hole, pts)
  const triangles = earClip(poly, pts)
  // Complete: a polygon with n points and h holes gives n + 2h - 2 triangles.
  const complete = triangles.length === pts.length + 2 * holeRings.length - 2
  return { points: pts, triangles, complete }
}

/** Inserts a hole by a bridge from its rightmost point to a visible point of the border. */
function bridge(poly, hole, pts) {
  let hi = 0
  for (let k = 1; k < hole.length; k++) if (pts[hole[k]][0] > pts[hole[hi]][0]) hi = k
  const M = pts[hole[hi]]
  // Ray to the right: the nearest edge it crosses.
  let best = Infinity, bestEdge = -1, bestX = 0
  for (let k = 0; k < poly.length; k++) {
    const a = pts[poly[k]], b = pts[poly[(k + 1) % poly.length]]
    if ((a[1] > M[1]) === (b[1] > M[1])) continue
    const x = a[0] + ((M[1] - a[1]) * (b[0] - a[0])) / (b[1] - a[1])
    if (x >= M[0] && x - M[0] < best) { best = x - M[0]; bestEdge = k; bestX = x }
  }
  if (bestEdge < 0) throw new Error('Loch liegt nicht im Vieleck')
  const ea = poly[bestEdge], eb = poly[(bestEdge + 1) % poly.length]
  let P = pts[ea][0] > pts[eb][0] ? bestEdge : (bestEdge + 1) % poly.length
  const I = [bestX, M[1]]
  // If border points lie in the triangle M-I-P, take the one with the smallest angle to the ray.
  const tri = [M, I, pts[poly[P]]]
  const ccwTri = cross(tri[0], tri[1], tri[2]) >= 0 ? tri : [tri[0], tri[2], tri[1]]
  let bestAngle = Infinity
  for (let k = 0; k < poly.length; k++) {
    const q = pts[poly[k]]
    if (k === P || q[0] < M[0]) continue
    if (!inTriangle(q, ccwTri[0], ccwTri[1], ccwTri[2])) continue
    const ang = Math.abs(Math.atan2(q[1] - M[1], q[0] - M[0]))
    if (ang < bestAngle) { bestAngle = ang; P = k }
  }
  // If the point occurs more than once (the end of an earlier bridge), take the occurrence whose
  // angle holds the new bridge - otherwise it would cross the old one.
  const target = poly[P]
  const sightOk = (k) => {
    const a = pts[poly[k]], prv = pts[poly[(k - 1 + poly.length) % poly.length]], nxt = pts[poly[(k + 1) % poly.length]]
    if (cross(prv, a, nxt) >= 0) return cross(a, nxt, M) >= 0 && cross(a, M, prv) >= 0
    return cross(a, nxt, M) >= 0 || cross(a, M, prv) >= 0
  }
  if (!sightOk(P)) {
    for (let k = 0; k < poly.length; k++) if (poly[k] === target && k !== P && sightOk(k)) { P = k; break }
  }
  const holeSeq = [...hole.slice(hi), ...hole.slice(0, hi), hole[hi]]
  return [...poly.slice(0, P + 1), ...holeSeq, poly[P], ...poly.slice(P + 1)]
}

function earClip(poly, pts) {
  // Doubly linked list; only reflex corners can lie inside an ear - so only they are checked.
  const n = poly.length
  const prev = new Int32Array(n), next = new Int32Array(n), alive = new Uint8Array(n).fill(1)
  for (let k = 0; k < n; k++) { prev[k] = (k - 1 + n) % n; next[k] = (k + 1) % n }
  const P = (k) => pts[poly[k]]
  const isReflex = (k) => cross(P(prev[k]), P(k), P(next[k])) <= 1e-12
  let reflex = new Set()
  for (let k = 0; k < n; k++) if (isReflex(k)) reflex.add(k)
  const same = (a, b) => a[0] === b[0] && a[1] === b[1]
  const isEar = (k) => {
    const ka = prev[k], kc = next[k]
    const a = P(ka), b = P(k), c = P(kc)
    if (cross(a, b, c) <= 1e-12) return false
    for (const r of reflex) {
      if (r === ka || r === k || r === kc) continue
      const q = P(r)
      if (same(q, a) || same(q, b) || same(q, c)) continue
      if (inTriangle(q, a, b, c)) return false
    }
    return true
  }
  const remove = (k) => {
    alive[k] = 0
    reflex.delete(k)
    next[prev[k]] = next[k]
    prev[next[k]] = prev[k]
    for (const j of [prev[k], next[k]]) { if (isReflex(j)) reflex.add(j); else reflex.delete(j) }
  }
  const tris = []
  let left = n
  let k = 0
  let sinceClip = 0
  while (left > 3 && sinceClip <= left) {
    const ka = prev[k], kc = next[k]
    if (poly[ka] === poly[kc]) {
      // Tip of a bridge (a-b-a): b has all its triangles; remove it without a triangle. Points that
      // merely lie on a straight line stay - other faces (the hole wall) hang on them, otherwise a
      // gap would open.
      remove(k); left--; k = kc; sinceClip = 0
      continue
    }
    if (isEar(k)) {
      tris.push([poly[ka], poly[k], poly[kc]])
      remove(k); left--; k = kc; sinceClip = 0
      continue
    }
    k = next[k]
    sinceClip++
  }
  if (left === 3) {
    const kc = next[k], ka = prev[k]
    if (cross(P(ka), P(k), P(kc)) > 1e-12) tris.push([poly[ka], poly[k], poly[kc]])
  }
  return tris
}

/**
 * Joins two rings round the origin (both star-shaped, `inner` wholly inside `outer`, both
 * counter-clockwise, angles rising from any start). Returns triangles of indices: `inner[i]`,
 * `outer[j]` are indices into `coords` (points [x, y]). The triangles are counter-clockwise
 * (normal towards +z, seen from above).
 */
export function zipRings(inner, outer, coords) {
  const ang = (i) => Math.atan2(coords[i][1], coords[i][0])
  // Lay out both rings from the point with the smallest angle >= -pi, angles unrolled in rising order.
  const unroll = (ring) => {
    let s = 0
    for (let k = 1; k < ring.length; k++) if (ang(ring[k]) < ang(ring[s])) s = k
    const seq = [...ring.slice(s), ...ring.slice(0, s)]
    const a = []
    let prev = -Infinity
    for (const i of seq) {
      let t = ang(i)
      while (t < prev) t += 2 * Math.PI
      a.push(t)
      prev = t
    }
    return { seq, a }
  }
  const I = unroll(inner), O = unroll(outer)
  const tris = []
  let i = 0, j = 0
  const ni = I.seq.length, no = O.seq.length
  const ai = (k) => I.a[k % ni] + 2 * Math.PI * Math.floor(k / ni)
  const ao = (k) => O.a[k % no] + 2 * Math.PI * Math.floor(k / no)
  while (i < ni || j < no) {
    const nextI = i < ni ? ai(i + 1) : Infinity
    const nextO = j < no ? ao(j + 1) : Infinity
    if (nextI <= nextO) {
      tris.push([I.seq[i % ni], O.seq[j % no], I.seq[(i + 1) % ni]])
      i++
    } else {
      tris.push([O.seq[j % no], O.seq[(j + 1) % no], I.seq[i % ni]])
      j++
    }
  }
  return tris
}

const LOOP_POINTS = 20

/**
 * Flat face with holes in a plane: border `ring` (indices, star-shaped round the axis),
 * holes { cx, cy, r, z } (z: height of the hole's rim, for a slope), or openings of any outline
 * { points: [[x, y], ...] } (counter-clockwise, no point twice - the windows between the spokes
 * of a lampshade's carrier). Inside, the border shrunk
 * towards the centre, with the holes, by ear clipping; a strip joins it to the border.
 * `down`: normal pointing down. Returns, per hole, the indices of its rim (counter-clockwise).
 */
export function capWithHoles(ring, z, holes, down, verts, tris, addVertex) {
  const xy = (i) => [verts[i * 3], verts[i * 3 + 1]]
  if (!holes.length) {
    const c = addVertex(0, 0, z)
    for (let j = 0; j < ring.length; j++) {
      const k = (j + 1) % ring.length
      if (down) tris.push(c, ring[k], ring[j])
      else tris.push(c, ring[j], ring[k])
    }
    return []
  }
  // Inner ring = the border, shrunk towards the centre: a border that is star-shaped round the
  // centre stays wholly inside, and a simple strip joins the two rings. The factor is large
  // enough for all holes to fit into the inner ring.
  const radiusAt = (a) => {
    // Where the ray at angle a crosses the border.
    const dx = Math.cos(a), dy = Math.sin(a)
    let best = Infinity
    for (let j = 0; j < ring.length; j++) {
      const [x0, y0] = xy(ring[j]), [x1, y1] = xy(ring[(j + 1) % ring.length])
      const ex = x1 - x0, ey = y1 - y0
      const den = dx * ey - dy * ex
      if (Math.abs(den) < 1e-12) continue
      const t = (x0 * ey - y0 * ex) / den
      const u = (x0 * dy - y0 * dx) / den
      if (t > 0 && u >= -1e-9 && u <= 1 + 1e-9) best = Math.min(best, t)
    }
    return Number.isFinite(best) ? best : 1
  }
  let f = 0.5
  for (const h of holes) {
    if (h.points) {
      // An opening with an outline of its own (see the holes' description): its corners.
      for (const [px, py] of h.points) f = Math.max(f, (Math.hypot(px, py) + 0.9) / Math.max(1e-6, radiusAt(Math.atan2(py, px))))
      continue
    }
    // The hole's rim, measured densely all round: between two samples the border can wind
    // closer to the hole (corners, ribs).
    for (let k = 0; k < 48; k++) {
      const a = (2 * Math.PI * k) / 48
      const px = h.cx + (h.r + 0.3) * Math.cos(a), py = h.cy + (h.r + 0.3) * Math.sin(a)
      f = Math.max(f, (Math.hypot(px, py) + 0.6) / Math.max(1e-6, radiusAt(Math.atan2(py, px))))
    }
  }
  f = Math.min(f, 0.985)
  const kRing = ring.map((i) => { const [x, y] = xy(i); return addVertex(x * f, y * f, z) })
  for (let j = 0; j < ring.length; j++) {
    const k = (j + 1) % ring.length
    if (down) { tris.push(kRing[j], ring[k], ring[j]); tris.push(kRing[j], kRing[k], ring[k]) }
    else { tris.push(kRing[j], ring[j], ring[k]); tris.push(kRing[j], ring[k], kRing[k]) }
  }
  // Hole rims turned slightly: then no hole point lies exactly level with another point, which
  // keeps the ear clipping clear of special cases.
  const loops = holes.map((h, k) => (h.points ?? circle(h.cx, h.cy, h.r, LOOP_POINTS, false, 0.1234 + 0.377 * k)).map(([x, y]) => addVertex(x, y, h.z ?? z)))
  let t = triangulate(kRing.map(xy), loops.map((l) => l.map(xy)))
  let rim = kRing
  if (!t.complete) {
    // A hole reaches past the inner ring: triangulate directly within the border, without it
    // (slower, but exact). The strip to the inner ring is then dropped.
    tris.length -= ring.length * 6
    t = triangulate(ring.map(xy), loops.map((l) => l.map(xy)))
    rim = ring
    if (!t.complete) throw new Error('Ein Loch im Boden liegt zu nah am Rand – weniger oder kleinere Löcher wählen.')
  }
  const map = [...rim, ...loops.flat()]
  for (const [a, b, c] of t.triangles) {
    if (down) tris.push(map[a], map[c], map[b])
    else tris.push(map[a], map[b], map[c])
  }
  return loops
}

/**
 * The half of a closed mesh that lies at y <= 0, closed again by a flat face in the plane y = 0 (its normal towards
 * +y): the body cut through along the plane, as a lampshade for a wall is. Triangles the plane crosses are clipped;
 * the lines it leaves in the plane are joined to loops and filled (triangulate), holes within outlines included.
 * Returns { vertices, indices }; throws where the cut does not come out as closed loops.
 */
export function halveMesh(vertices, indices, eps = 1e-7) {
  const count = vertices.length / 3
  // Below the plane (kept), in it, or above it (cut away).
  const side = new Int8Array(count)
  for (let i = 0; i < count; i++) side[i] = vertices[i * 3 + 1] < -eps ? -1 : vertices[i * 3 + 1] > eps ? 1 : 0
  const out = []
  const kept = new Int32Array(count).fill(-1)
  const keep = (i) => {
    if (kept[i] < 0) {
      kept[i] = out.length / 3
      out.push(vertices[i * 3], side[i] === 0 ? 0 : vertices[i * 3 + 1], vertices[i * 3 + 2])
    }
    return kept[i]
  }
  // Where an edge crosses the plane: one point per edge, whichever triangle asks.
  const crossings = new Map()
  const crossing = (a, b) => {
    const key = a < b ? a * count + b : b * count + a
    let at = crossings.get(key)
    if (at === undefined) {
      const ya = vertices[a * 3 + 1], yb = vertices[b * 3 + 1]
      const t = ya / (ya - yb)
      at = out.length / 3
      out.push(vertices[a * 3] + (vertices[b * 3] - vertices[a * 3]) * t, 0, vertices[a * 3 + 2] + (vertices[b * 3 + 2] - vertices[a * 3 + 2]) * t)
      crossings.set(key, at)
    }
    return at
  }
  const tris = []
  // The cut's lines, each as the flat face needs it (against the way the kept face runs along it); a line met from
  // both sides (two kept faces touching in the plane) is no border and falls away.
  const lines = new Map()
  const line = (from, to) => {
    if (from === to) return
    const back = `${to}>${from}`
    if (lines.has(back)) lines.delete(back)
    else lines.set(`${from}>${to}`, [from, to])
  }
  for (let t = 0; t < indices.length; t += 3) {
    const v = [indices[t], indices[t + 1], indices[t + 2]]
    const s = [side[v[0]], side[v[1]], side[v[2]]]
    const most = Math.max(s[0], s[1], s[2]), least = Math.min(s[0], s[1], s[2])
    if (least >= 0) continue
    if (most <= 0) {
      const k = [keep(v[0]), keep(v[1]), keep(v[2])]
      tris.push(k[0], k[1], k[2])
      for (let e = 0; e < 3; e++) if (s[e] === 0 && s[(e + 1) % 3] === 0) line(k[(e + 1) % 3], k[e])
      continue
    }
    const poly = [], inPlane = []
    for (let e = 0; e < 3; e++) {
      const i = v[e], j = v[(e + 1) % 3]
      if (s[e] <= 0) {
        poly.push(keep(i))
        inPlane.push(s[e] === 0)
      }
      if (s[e] * s[(e + 1) % 3] < 0) {
        poly.push(crossing(i, j))
        inPlane.push(true)
      }
    }
    for (let k = 1; k < poly.length - 1; k++) tris.push(poly[0], poly[k], poly[k + 1])
    for (let k = 0; k < poly.length; k++) {
      const next = (k + 1) % poly.length
      if (inPlane[k] && inPlane[next]) line(poly[next], poly[k])
    }
  }
  // The lines, end to end, are the outlines of what the plane cut through.
  const onward = new Map()
  for (const [from, to] of lines.values()) {
    if (!onward.has(from)) onward.set(from, [])
    onward.get(from).push(to)
  }
  const loops = []
  for (const start of [...onward.keys()]) {
    while (onward.get(start)?.length) {
      const loop = [start]
      let at = onward.get(start).pop()
      let guard = 0
      while (at !== start) {
        loop.push(at)
        const next = onward.get(at)
        if (!next?.length || guard++ > lines.size) throw new Error('Der Schnitt durch den Körper schließt sich nicht.')
        at = next.pop()
      }
      if (loop.length >= 3) loops.push(loop)
    }
  }
  // In the plane a point is (z, x): counter-clockwise there is a normal towards +y.
  const flat = (i) => [out[i * 3 + 2], out[i * 3]]
  const area = (loop) => {
    let a = 0
    for (let k = 0; k < loop.length; k++) {
      const p = flat(loop[k]), q = flat(loop[(k + 1) % loop.length])
      a += p[0] * q[1] - q[0] * p[1]
    }
    return a / 2
  }
  const inside = (point, loop) => {
    let within = false
    for (let k = 0, j = loop.length - 1; k < loop.length; j = k++) {
      const p = flat(loop[k]), q = flat(loop[j])
      if ((p[1] > point[1]) !== (q[1] > point[1]) && point[0] < ((q[0] - p[0]) * (point[1] - p[1])) / (q[1] - p[1]) + p[0]) within = !within
    }
    return within
  }
  const outlines = loops.map((loop) => ({ loop, size: Math.abs(area(loop)) })).filter((entry) => entry.size > 1e-9).sort((a, b) => b.size - a.size)
  // An outline within an odd number of others is a hole, of the smallest one round it.
  const holesOf = new Map()
  for (let k = 0; k < outlines.length; k++) {
    const round = []
    for (let j = 0; j < k; j++) if (inside(flat(outlines[k].loop[0]), outlines[j].loop)) round.push(j)
    if (round.length % 2 === 0) holesOf.set(k, [])
    else holesOf.get(round[round.length - 1])?.push(outlines[k].loop)
  }
  for (const [k, holes] of holesOf) {
    const outer = outlines[k].loop
    const filled = triangulate(outer.map(flat), holes.map((hole) => hole.map(flat)))
    if (!filled.complete) throw new Error('Die Schnittfläche ließ sich nicht schließen.')
    const all = [...outer, ...holes.flat()]
    for (const [a, b, c] of filled.triangles) tris.push(all[a], all[b], all[c])
  }
  return { vertices: Float64Array.from(out), indices: Uint32Array.from(tris) }
}

/** Wall of a hole between two matching hole rims (`a` below, `b` above); normal towards the hole's centre. */
export function holeWall(a, b, tris) {
  for (let k = 0; k < a.length; k++) {
    const k1 = (k + 1) % a.length
    tris.push(a[k], b[k1], a[k1])
    tris.push(a[k], b[k], b[k1])
  }
}

/** Ceiling of a blind hole (normal pointing down, into the hole). */
export function holeCeiling(loop, h, z, tris, addVertex) {
  const c = addVertex(h.cx, h.cy, z)
  for (let k = 0; k < loop.length; k++) tris.push(c, loop[(k + 1) % loop.length], loop[k])
}

/**
 * Kit for closed meshes: collecting points and triangles, rings round the z axis,
 * walls between rings, rims, flat faces with holes, lathed bodies, boxes.
 * Convention: triangles counter-clockwise seen from outside (normal pointing out).
 */
export class MeshBuilder {
  constructor() {
    this.verts = []
    this.tris = []
    this.addVertex = (x, y, z) => {
      this.verts.push(x, y, z)
      return this.verts.length / 3 - 1
    }
  }

  /** Ring of n points: radius r(theta), height z(theta) (number or function), angles from `phase`. */
  ring(n, r, z, phase = 0) {
    const row = new Array(n)
    for (let j = 0; j < n; j++) {
      const a = phase + (2 * Math.PI * j) / n
      const rr = typeof r === 'function' ? r(a) : r
      const zz = typeof z === 'function' ? z(a) : z
      row[j] = this.addVertex(rr * Math.cos(a), rr * Math.sin(a), zz)
    }
    return row
  }

  /** Wall through rings (from bottom to top). `inward`: normal towards the axis (inner wall). */
  wall(rows, inward = false) {
    const n = rows[0].length
    for (let i = 0; i < rows.length - 1; i++) {
      const a = rows[i], b = rows[i + 1]
      for (let j = 0; j < n; j++) {
        const k = (j + 1) % n
        if (inward) { this.tris.push(a[j], b[k], a[k]); this.tris.push(a[j], b[j], b[k]) }
        else { this.tris.push(a[j], a[k], b[k]); this.tris.push(a[j], b[k], b[j]) }
      }
    }
  }

  /** Strip between two rings of equal length: a rim on top (`up`) or at the bottom. Outside = `outer`. */
  band(outer, inner, up) {
    const n = outer.length
    for (let j = 0; j < n; j++) {
      const k = (j + 1) % n
      if (up) { this.tris.push(outer[j], outer[k], inner[k]); this.tris.push(outer[j], inner[k], inner[j]) }
      else { this.tris.push(outer[j], inner[k], outer[k]); this.tris.push(outer[j], inner[j], inner[k]) }
    }
  }

  /** Flat face over a ring (star-shaped round the axis), with holes; returns the hole rims. */
  cap(ring, z, holes = [], down = false) {
    return capWithHoles(ring, z, holes, down, this.verts, this.tris, this.addVertex)
  }

  /** Through holes: wall between the hole rims below and above. */
  holeWalls(lower, upper) {
    lower.forEach((loop, k) => holeWall(loop, upper[k], this.tris))
  }

  /**
   * Lathed body: a closed profile [[r, z], ...], counter-clockwise (r to the right, z up), turned
   * round the z axis in n segments. Points with r = 0 become a single point on the axis.
   * `transform(x, y, z)` moves/shears every point (e.g. the splay of a leg).
   */
  lathe(profile, n, { phase = 0, transform = null } = {}) {
    const rings = profile.map(([r, z]) => {
      if (r <= 1e-9) {
        const [x, y, zz] = transform ? transform(0, 0, z) : [0, 0, z]
        return { axis: this.addVertex(x, y, zz) }
      }
      const row = new Array(n)
      for (let j = 0; j < n; j++) {
        const a = phase + (2 * Math.PI * j) / n
        const [x, y, zz] = transform ? transform(r * Math.cos(a), r * Math.sin(a), z) : [r * Math.cos(a), r * Math.sin(a), z]
        row[j] = this.addVertex(x, y, zz)
      }
      return { row }
    })
    // Profile counter-clockwise: section i -> i+1 is a face with its normal pointing out.
    for (let i = 0; i < rings.length; i++) {
      const A = rings[i], B = rings[(i + 1) % rings.length]
      for (let j = 0; j < n; j++) {
        const k = (j + 1) % n
        if (A.row && B.row) { this.tris.push(A.row[j], B.row[k], B.row[j]); this.tris.push(A.row[j], A.row[k], B.row[k]) }
        else if (A.row && B.axis !== undefined) this.tris.push(A.row[j], A.row[k], B.axis)
        else if (A.axis !== undefined && B.row) this.tris.push(A.axis, B.row[k], B.row[j])
      }
    }
  }

  /** Box (centre cx, cy, z from z0 to z1, width w across, length l along), turned by `angle`. */
  box(cx, cy, z0, z1, l, w, angle = 0) {
    const c = Math.cos(angle), s = Math.sin(angle)
    const pt = (u, v, z) => this.addVertex(cx + u * c - v * s, cy + u * s + v * c, z)
    const lo = [pt(-l / 2, -w / 2, z0), pt(l / 2, -w / 2, z0), pt(l / 2, w / 2, z0), pt(-l / 2, w / 2, z0)]
    const hi = [pt(-l / 2, -w / 2, z1), pt(l / 2, -w / 2, z1), pt(l / 2, w / 2, z1), pt(-l / 2, w / 2, z1)]
    this.tris.push(lo[0], lo[2], lo[1], lo[0], lo[3], lo[2])
    this.tris.push(hi[0], hi[1], hi[2], hi[0], hi[2], hi[3])
    this.wall([lo, hi])
  }

  /** Mesh { vertices, indices } (Float64Array, Uint32Array). */
  mesh() {
    return { vertices: Float64Array.from(this.verts), indices: Uint32Array.from(this.tris) }
  }
}
