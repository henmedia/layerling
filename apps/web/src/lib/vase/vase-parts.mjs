/**
 * Accessories for the vase, each part a closed mesh of its own: legs (plug-in or moulded on),
 * stand, saucer (a dish, or hidden in the hollow foot), inserts (planter insert, self-watering,
 * flower frog for cut flowers, water tube), lids (push-in, snap-on, screw-on).
 *
 * Own designs with everyday use in mind: saucer with support ribs, centring tabs, spout and
 * finger grip; tapered pegs that clamp and centre themselves; stand with a sloped seat (centres
 * the pot, prints without supports); inserts with lifting tabs, a perforated floor without slope
 * and a watering shaft. Every fit has a clearance (`fitClearance`).
 *
 *   buildParts(vaseParams, { outward }) -> { parts: [...], lift, notes }
 *
 * A part: { id, name, mesh: { vertices, indices }, z, merge (belongs to the vase's object),
 * flip (turn over for printing), info (e.g. capacity in ml) }. The meshes lie in the vase's
 * coordinates (centre on the axis); when assembled, the vase is lifted by `lift`, a part by
 * `lift + z` (saucer at the bottom, legs or stand on it, inserts in the vase: z = 0).
 * `layoutParts` lays everything out side by side for printing - preview and file use the same.
 */
import { MeshBuilder } from './mesh-tools.mjs'
import { LID_MODES, buildVase, floorLayout, normalizeParams, teapotKnobMesh, threadDepthAt } from './vase-geometry.mjs'

const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const ml = (mm3) => Math.round(mm3 / 1000)
/** Soft window round an angle (1 in the middle, 0 from `width` on). */
const bump = (a, center, width) => {
  let d = Math.abs(((a - center + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI)
  return d >= width ? 0 : 0.5 * (1 + Math.cos((Math.PI * d) / width))
}

/** Area of a ring r(theta) (polygon of n points). */
function ringArea(r, n = 256) {
  let a = 0
  for (let k = 0; k < n; k++) {
    const t0 = (2 * Math.PI * k) / n, t1 = (2 * Math.PI * (k + 1)) / n
    a += 0.5 * r(t0) * r(t1) * Math.sin(t1 - t0)
  }
  return a
}

export function buildParts(input, { outward = 0 } = {}) {
  const p = normalizeParams(input)
  const layout = floorLayout(p)
  const { shape } = layout
  const H = p.height
  const c = p.fitClearance
  const notes = []
  const parts = []
  // Lampshade: no saucer, no insert - water and light do not mix.
  if (p.body === 'hohl' && p.lamp !== 'keine') {
    if (p.saucerMode !== 'keine' || p.insertMode !== 'keine') notes.push('Beim Lampenschirm gibt es keinen Untersetzer und keinen Einsatz.')
    p.saucerMode = 'keine'
    p.insertMode = 'keine'
  }
  // Rings fine enough for the cross-section (slats, waves, corners).
  const N = clamp(Math.max(192, (p.section === 'welle' ? p.sectionWaves : 0) * 8, p.section === 'vieleck' ? p.polySides * 24 : 0,
    (p.section2 === 'welle' ? p.section2Waves : 0) * 8, p.section2 === 'vieleck' ? p.section2Sides * 24 : 0), 192, 720)
  // Rim of the bottom, including any pattern standing outwards.
  const rim = (a) => shape.rimAt(a) + outward
  /**
   * Widest outline of the pot (pattern included) between heights z0 and z1, as a table per ring
   * angle: a bulging pot is wider above its bottom than at it - hoop, dish and tabs must fit round
   * that point. Between two ring points, with a margin for the chord.
   */
  const potEnvelope = (z0, z1) => {
    const table = new Float64Array(N)
    const da = (2 * Math.PI) / N
    for (let j = 0; j < N; j++) {
      let m = 0
      const steps = Math.max(8, Math.ceil((z1 - z0) / 0.5))
      for (let s = -2; s <= 2; s++) {
        const a = j * da + (s * da) / 2
        for (let i = 0; i <= steps; i++) m = Math.max(m, shape.outerAt(a, z0 + ((z1 - z0) * i) / steps))
      }
      table[j] = m / Math.cos(da / 2) + outward
    }
    return (a) => table[((Math.round(a / da) % N) + N) % N]
  }
  /** Builds the parts one by one: if one fails, only that one is missing - with a note instead of an abort. */
  const safely = (label, fn) => {
    try { fn() } catch (error) { notes.push(`${label} ließ sich nicht bauen: ${error.message}`) }
  }
  // Height the pot or the legs stand at: in the saucer, on its ribs. No ribs with legs - the legs
  // already keep the pot out of the water, and one foot on a rib with the others beside it would
  // make it wobble.
  const saucerFloor = 2, saucerRib = p.saucerRibs === 'ja' && p.legMode === 'keine' ? 2.5 : 0
  const standLevel = p.saucerMode === 'schale' ? saucerFloor + saucerRib : 0
  let lift = standLevel
  // Feet of the legs (centre and radius at the bottom), for the check in the saucer.
  const feet = []
  const splayOut = (h) => h * Math.tan((p.legSplay * Math.PI) / 180)
  const footR = p.legShape === 'zylinder' ? p.legDiameter / 2 : (p.legDiameter / 2) * 0.62

  /* ---------- Legs and stand ---------- */
  const legShape = (b, x, y, angle, topZ, height, withPeg, splayDeg) => {
    const rT = p.legDiameter / 2
    const rB = p.legShape === 'zylinder' ? rT : rT * 0.62
    const ch = Math.min(1, rB * 0.3)
    const peg = layout.peg
    const socket = peg.r + c
    // Tapered peg: at the shoulder as wide as the socket (+0.05 mm, so it clamps), slimmer towards the tip.
    const profile = [[0, topZ - height], [rB - ch, topZ - height], [rB, topZ - height + ch], [rT, topZ]]
    if (withPeg) profile.push([socket + 0.05, topZ], [peg.r - 0.2, topZ + peg.length - 0.8], [peg.r - 1, topZ + peg.length], [0, topZ + peg.length])
    else profile.push([0, topZ])
    const t = Math.tan((splayDeg * Math.PI) / 180)
    const ca = Math.cos(angle), sa = Math.sin(angle)
    b.lathe(profile, p.legShape === 'kantig' ? 4 : 40, {
      phase: p.legShape === 'kantig' ? Math.PI / 4 : 0,
      // Splay: sheared outwards below the top edge; the top and bottom faces stay level.
      transform: (u, v, z) => {
        const out = z < topZ ? (topZ - z) * t : 0
        const lu = u + out
        return [x + lu * ca - v * sa, y + lu * sa + v * ca, z]
      },
    })
  }
  if (p.legMode === 'stecken' || p.legMode === 'angeformt') safely('Die Beine', () => {
    // Plug-in legs only where a socket fits into the bottom.
    const legs = p.legMode === 'stecken' ? layout.legs.filter((leg) => leg.socket) : layout.legs
    if (p.legMode === 'stecken' && !legs.length) notes.push('Ohne Buchsen im Boden gibt es keine Steckbeine.')
    else {
      const merged = new MeshBuilder()
      legs.forEach((leg, k) => {
        feet.push({ a: leg.angle, r: Math.hypot(leg.x, leg.y) + splayOut(p.legHeight), fr: footR })
        if (p.legMode === 'stecken') {
          const b = new MeshBuilder()
          legShape(b, leg.x, leg.y, leg.angle, 0, p.legHeight, true, p.legSplay)
          parts.push({ id: `bein-${k + 1}`, name: `Bein ${k + 1}`, mesh: b.mesh(), z: 0, merge: false, flip: false })
        } else legShape(merged, leg.x, leg.y, leg.angle, 0.6, p.legHeight + 0.6, false, p.legSplay)
      })
      if (p.legMode === 'angeformt') {
        parts.push({ id: 'beine', name: 'Beine (angeformt)', mesh: merged.mesh(), z: 0, merge: true, flip: false })
        notes.push('Angeformte Beine: Der Boden liegt beim Drucken frei – mit Stützen unter dem Boden drucken, oder Steckbeine wählen (ohne Stützen).')
      }
      lift = standLevel + p.legHeight
    }
  })
  if (p.legMode === 'staender') safely('Der Ständer', () => {
    // Hoop following the cross-section: inside, with clearance round the pot; below it a sloped seat
    // (45 degrees) that the pot sits on with its edge, centring itself. Open in the middle (drainage).
    const b = new MeshBuilder()
    const rIn = (a) => rim(a) + c + 0.5
    const zBot = -12, zTop = 8
    const lipW = (a) => clamp(rim(a) * 0.12, 4, 10)
    const rLip = (a) => rIn(a) - lipW(a)
    // Where the pot rests on the slope (45 degrees, hoop z = r - rIn): with its edge - or, if it
    // widens at the bottom flatter than 45 degrees, with its flank; it then sits that much higher.
    let seat = -Infinity
    for (let k = 0; k < 360; k++) {
      const a = (2 * Math.PI * k) / 360
      for (let h = 0; h <= lipW(a) + 2; h += 0.25) seat = Math.max(seat, shape.outerAt(a, h) + outward - h - rIn(a))
    }
    // The hoop's wall stands round the pot's widest point within the wall's height (bulging pots);
    // a step leads down to the slope.
    const env = potEnvelope(0, zTop - seat + 1)
    const rWall = (a) => Math.max(rIn(a), env(a) + c + 0.5)
    const rOut = (a) => rWall(a) + 3.2
    const rows = [
      b.ring(N, rOut, zBot), b.ring(N, rOut, zTop), b.ring(N, rWall, zTop), b.ring(N, rWall, 0), b.ring(N, rIn, 0),
      b.ring(N, rLip, (a) => -lipW(a)), b.ring(N, rLip, zBot),
    ]
    b.wall([rows[0], rows[1]])
    b.band(rows[1], rows[2], true)
    b.wall([rows[3], rows[2]], true)
    b.band(rows[3], rows[4], true)
    b.wall([rows[5], rows[4]], true)
    b.wall([rows[6], rows[5]], true)
    b.band(rows[0], rows[6], false)
    // Legs under the hoop, reaching slightly into it (one object).
    for (let k = 0; k < p.legCount; k++) {
      const a = (2 * Math.PI * k) / p.legCount + Math.PI / p.legCount
      const r = (rLip(a) + rOut(a)) / 2
      legShape(b, r * Math.cos(a), r * Math.sin(a), a, zBot + 0.6, p.legHeight + 0.6, false, p.legSplay)
      feet.push({ a, r: r + splayOut(p.legHeight + 0.6), fr: footR })
    }
    lift = standLevel + p.legHeight + (seat - zBot)
    // Turn over for printing: the hoop rests on its top edge, and the slope needs no supports.
    const shift = p.legHeight - zBot
    const m = b.mesh()
    for (let i = 2; i < m.vertices.length; i += 3) m.vertices[i] += shift
    parts.push({ id: 'staender', name: 'Ständer', mesh: m, z: standLevel - lift, merge: false, flip: true })
  })

  /* ---------- Saucer ---------- */
  if (p.saucerMode === 'schale') safely('Der Untersetzer', () => {
    const b = new MeshBuilder()
    const floor = saucerFloor
    const flare = Math.tan((8 * Math.PI) / 180)
    const top = p.saucerHeight
    // Spout at the front (0 degrees) and finger grip at the back (180 degrees): the rim is lower there and drawn outwards.
    const spout = p.saucerSpout === 'ja'
    const grip = p.saucerGrip === 'ja'
    const dip = (a) => (spout ? 3.5 * bump(a, 0, 0.2) : 0) + (grip ? Math.min(top * 0.35, 5) * bump(a, Math.PI, 0.5) : 0)
    const bulge = (a, t) => ((spout ? 5 * bump(a, 0, 0.17) : 0) + (grip ? 3 * bump(a, Math.PI, 0.5) : 0)) * t * t
    const zTop = (a) => top - dip(a)
    // The pot stands `lift` above the table; as far as it reaches into the dish, it counts here as wide
    // as at its widest point (bulging) - the inner wall follows that.
    const reach = Math.max(0, top - lift + 0.5)
    const env = reach > 0 ? potEnvelope(0, Math.min(H, reach)) : null
    const base = (a) => Math.max(rim(a), env ? env(a) : 0)
    // With legs or a stand, the dish grows until all feet stand in it with 1.5 mm to spare
    // (every point of the foot, not only its centre).
    // Notches in the rim (waves, corners) can lie between two points of the foot: check against
    // the narrowest rim over the foot's whole angle range.
    let gap = p.saucerGap
    for (const f of feet) {
      const span = Math.asin(Math.min(1, f.fr / Math.max(f.r, f.fr))) + 0.01
      let low = Infinity
      for (let k = 0; k <= 64; k++) low = Math.min(low, base(f.a - span + (2 * span * k) / 64))
      gap = Math.max(gap, f.r + f.fr + 1.5 - low)
    }
    const rInner = (a, z) => base(a) + gap + (z - floor) * flare + bulge(a, (z - floor) / (top - floor))
    const rows = 10
    const outer = [], inner = []
    for (let i = 0; i <= rows; i++) {
      const t = i / rows
      outer.push(b.ring(N, (a) => rInner(a, t * zTop(a)) + p.saucerWall, (a) => t * zTop(a)))
    }
    for (let i = 0; i <= rows; i++) {
      const t = i / rows
      inner.push(b.ring(N, (a) => rInner(a, floor + t * (zTop(a) - floor)), (a) => floor + t * (zTop(a) - floor)))
    }
    b.wall(outer)
    b.wall(inner, true)
    b.band(outer[rows], inner[rows], true)
    b.cap(outer[0], 0, [], true)
    b.cap(inner[0], floor, [], false)
    let ribVolume = 0
    const ribH = saucerRib
    const tabEnv = ribH > 0 ? potEnvelope(0, 5.5) : null
    if (ribH > 0) {
      // Support ribs: the pot stands 2.5 mm above the floor, so not in the water.
      // At the end of every rib a centring tab just outside the pot's edge.
      const n = 6
      for (let k = 0; k < n; k++) {
        const a = (2 * Math.PI * k) / n + Math.PI / n
        const r1 = rim(a) * 0.3, r2 = rim(a) - 1
        const L = r2 - r1, mid = (r1 + r2) / 2
        b.box(mid * Math.cos(a), mid * Math.sin(a), floor - 0.4, floor + ribH, L, 2.4, a)
        ribVolume += L * 2.4 * ribH
        // Tab just outside the pot's widest point within the tab's height (5 mm); only if it still
        // fits in front of the inner wall.
        const rt = tabEnv(a) + c + 0.3 + 1
        if (rt + 1.2 < rInner(a, floor)) {
          b.box(rt * Math.cos(a), rt * Math.sin(a), floor - 0.4, floor + ribH + 5, 2, 6, a)
          ribVolume += 2 * 6 * (ribH + 5)
        }
      }
    }
    // Capacity up to the lowest point of the rim (spout).
    let minTop = Infinity
    for (let k = 0; k < 360; k++) minTop = Math.min(minTop, zTop((2 * Math.PI * k) / 360))
    let vol = 0
    const steps = 20
    for (let i = 0; i < steps; i++) {
      const z = floor + ((i + 0.5) * (minTop - floor)) / steps
      vol += ringArea((a) => rInner(a, z)) * ((minTop - floor) / steps)
    }
    vol -= ribVolume
    parts.push({ id: 'untersetzer', name: 'Untersetzer', mesh: b.mesh(), z: -lift, merge: false, flip: false, info: `fasst etwa ${ml(vol)} ml` })
    if (gap > p.saucerGap + 0.05) notes.push(`Untersetzer auf ${(gap).toFixed(1).replace('.', ',')} mm Abstand zum Topf erweitert, damit alle Füße darin stehen.`)
  })
  if (p.saucerMode === 'versteckt') safely('Die versteckte Schale', () => {
    if (!(p.body === 'hohl' && layout.foot > 0)) notes.push('Die versteckte Schale braucht eine hohle Vase mit hohlem Fuß (Boden-Einstellung „Hohler Fuß“).')
    else {
      // Dish in the hollow of the foot: outside with clearance to the foot's wall, 1.5 mm lower than the foot.
      const foot = layout.foot
      const rIn0 = (a) => {
        let m = Infinity
        for (let i = 0; i <= 6; i++) m = Math.min(m, shape.innerAt(a, (foot * i) / 6))
        return m - c - 0.4
      }
      const h = foot - 1.5
      const wall = 1.6, floor = 1.6
      let minR = Infinity
      for (let k = 0; k < 72; k++) minR = Math.min(minR, rIn0((2 * Math.PI * k) / 72))
      if (h < 4) notes.push('Für die versteckte Schale ist der hohle Fuß zu niedrig – mindestens 5,5 mm.')
      else if (minR - wall < 5) notes.push('Der hohle Fuß ist zu eng für eine versteckte Schale.')
      else {
        const b = new MeshBuilder()
        const o0 = b.ring(N, rIn0, 0), o1 = b.ring(N, rIn0, h)
        const i1 = b.ring(N, (a) => rIn0(a) - wall, h), i0 = b.ring(N, (a) => rIn0(a) - wall, floor)
        b.wall([o0, o1])
        b.band(o1, i1, true)
        b.wall([i0, i1], true)
        b.cap(o0, 0, [], true)
        b.cap(i0, floor, [], false)
        const vol = ringArea((a) => rIn0(a) - wall) * (h - floor)
        if (lift > 0) notes.push('Auf Beinen oder im Ständer steht die versteckte Schale nicht mehr auf dem Tisch – dann lieber einen Untersetzer wählen.')
        parts.push({ id: 'schale', name: 'Versteckte Schale', mesh: b.mesh(), z: 0, merge: false, flip: false, info: `fasst etwa ${ml(vol)} ml` })
      }
    }
  })

  /* ---------- Inserts ---------- */
  const hollow = p.body === 'hohl'
  const floorTop = hollow ? layout.foot + layout.floor : 1.2
  // Inner space per angle and height; for a solid body (slicer vase mode) about one line of wall.
  const cavity = (a, z) => (hollow ? shape.innerAt(a, z) : shape.outerAt(a, z) - 1)
  if (p.insertMode === 'pflanze' || p.insertMode === 'bewaesserung') safely('Der Einsatz', () => {
    const water = p.insertMode === 'bewaesserung'
    const z0 = floorTop + (water ? p.reservoirHeight : p.insertStandoff)
    const z1 = H - 1.5
    if (z1 - z0 < 15) notes.push('Für einen Einsatz ist die Vase zu niedrig.')
    else {
      // Envelope for putting it in from above: at every height at most as wide as the narrowest point above it.
      const rows = 16
      const zs = Array.from({ length: rows + 1 }, (_, i) => z0 + ((z1 - z0) * i) / rows)
      const env = new Array(rows + 1)
      const AN = N
      for (let i = rows; i >= 0; i--) {
        env[i] = new Float64Array(AN)
        for (let j = 0; j < AN; j++) {
          const a = (2 * Math.PI * j) / AN
          let m = cavity(a, zs[i])
          // Check densely between this height and the next (neck, ribs); at the top, up to the rim
          // the insert has to pass through.
          if (i < rows) for (let s = 1; s < 4; s++) m = Math.min(m, cavity(a, zs[i] + ((zs[i + 1] - zs[i]) * s) / 4))
          else for (let s = 1; s <= 4; s++) m = Math.min(m, cavity(a, z1 + ((H - z1) * s) / 4))
          env[i][j] = i < rows ? Math.min(m, env[i + 1][j]) : m
        }
      }
      const rAt = (i) => (a) => {
        const x = (((a / (2 * Math.PI)) % 1) + 1) % 1 * AN
        const j = Math.floor(x) % AN, f = x - Math.floor(x)
        return env[i][j] * (1 - f) + env[i][(j + 1) % AN] * f - c - 0.4
      }
      const minR = Math.min(...env[0]) - c - 0.4
      const wall = p.insertWall, floorT = 2
      if (minR < (water ? 18 : 12)) notes.push(water ? 'Die Öffnung ist zu eng für einen Einsatz mit Selbstbewässerung.' : 'Die Öffnung ist zu eng für einen Einsatz.')
      else {
        const b = new MeshBuilder()
        const outer = zs.map((z, i) => b.ring(N, rAt(i), z))
        const inner = zs.map((z, i) => b.ring(N, (a) => rAt(i)(a) - wall, i === 0 ? z + floorT : z))
        b.wall(outer)
        b.wall(inner, true)
        b.band(outer[rows], inner[rows], true)
        // Perforated floor: circles must not touch and must lie inside, on the floor plate
        // (narrow inserts lose the outer holes or the watering shaft).
        const plate = (a) => rAt(0)(a) - wall
        const onPlate = (h, margin) => {
          for (let k = 0; k < 24; k++) {
            const a = (2 * Math.PI * k) / 24
            const x = h.cx + (h.r + margin) * Math.cos(a), y = h.cy + (h.r + margin) * Math.sin(a)
            if (Math.hypot(x, y) + 0.6 > 0.98 * plate(Math.atan2(y, x))) return false
          }
          return true
        }
        const apart = (h, list, gap) => list.every((o) => Math.hypot(h.cx - o.cx, h.cy - o.cy) >= h.r + o.r + gap)
        const center = { cx: 0, cy: 0, r: water ? 5 : 3 }
        const holes = [center]
        // Feet as spacers to the vase's bottom (with self-watering, tall columns in the water).
        const fr = clamp(minR * 0.13, 2, water ? 5 : 3.5)
        const rFoot = clamp(minR * 0.62, center.r + fr + 1.5, minR - wall - fr - 1)
        const feet = [0, 1, 2].map((k) => {
          const a = (2 * Math.PI * k) / 3 + Math.PI / 6
          return { cx: rFoot * Math.cos(a), cy: rFoot * Math.sin(a), r: fr }
        })
        if (!water) {
          const rr = clamp(minR * 0.45, center.r + 4, minR)
          for (let k = 0; k < 5; k++) {
            const a = (2 * Math.PI * k) / 5 + 0.3
            const h = { cx: rr * Math.cos(a), cy: rr * Math.sin(a), r: 2.5 }
            if (onPlate(h, 1.2) && apart(h, [...holes, ...feet], 1.5)) holes.push(h)
          }
        }
        let shaft = null
        if (water) {
          // Watering shaft at the wall (90 degrees): a tube reaching below the floor into the water.
          // The tube reaches to just above the vase's bottom: it must stand clear inside the vase there too.
          const a = Math.PI / 2
          const ro = 7, ri = 5
          const tubeFits = (s) => {
            for (let k = 0; k < 24; k++) {
              const x = s.cx + ro * Math.cos((2 * Math.PI * k) / 24), y = s.cy + ro * Math.sin((2 * Math.PI * k) / 24)
              const ang = Math.atan2(y, x), r = Math.hypot(x, y)
              if (r > plate(ang) - 0.8) return false
              for (let i = 0; i <= 6; i++) if (r > cavity(ang, floorTop + 0.5 + ((z0 - floorTop - 0.5) * i) / 6) - c - 0.5) return false
            }
            return true
          }
          for (let rr = Math.min(plate(a) - ro - 1, 0.97 * plate(a) - ri - 1.5); rr >= center.r + ro + 1.5 && !shaft; rr -= 1) {
            const s = { cx: rr * Math.cos(a), cy: rr * Math.sin(a), r: ro }
            if (tubeFits(s) && onPlate({ ...s, r: ri + 0.3 }, 0.5) && apart(s, [center, ...feet], 1.5)) {
              shaft = { cx: s.cx, cy: s.cy, ro, ri }
              holes.push({ cx: s.cx, cy: s.cy, r: ri + 0.3 })
            }
          }
          if (!shaft) notes.push('Für einen Gießschacht ist der Einsatz zu schmal – zum Nachfüllen den Einsatz kurz herausheben.')
        }
        const under = b.cap(outer[0], z0, holes, true)
        const above = b.cap(inner[0], z0 + floorT, holes, false)
        b.holeWalls(under, above)
        for (const f of feet) {
          b.lathe([[0, floorTop], [f.r, floorTop], [f.r, z0 + 0.6], [0, z0 + 0.6]], 24, {
            transform: (x, y, z) => [x + f.cx, y + f.cy, z],
          })
        }
        // Two lifting tabs on the inside of the rim, for lifting it out. The tab's flat outer side stays
        // inside the envelope at every point (ribs, corners), but reaches into the wall.
        for (const a of [0, Math.PI]) {
          let rOut = rAt(rows)(a) - wall + 0.5
          const fits = (ro) => {
            for (let s = -5; s <= 5; s += 0.5) {
              const x = ro * Math.cos(a) - s * Math.sin(a), y = ro * Math.sin(a) + s * Math.cos(a)
              const ang = Math.atan2(y, x)
              for (let i = rows - 3; i <= rows; i++) if (Math.hypot(x, y) > rAt(i)(ang) - 0.25) return false
            }
            return true
          }
          while (!fits(rOut) && rOut > 8) rOut -= 0.25
          const r = rOut - 2.5
          b.box(r * Math.cos(a), r * Math.sin(a), z1 - 6, z1, 5, 10, a)
        }
        if (shaft) {
          b.lathe([[shaft.ri, floorTop + 0.5], [shaft.ro, floorTop + 0.5], [shaft.ro, z1], [shaft.ri, z1]], 32, {
            transform: (x, y, z) => [x + shaft.cx, y + shaft.cy, z],
          })
        }
        const info = water
          ? `Wasservorrat etwa ${ml(ringArea((a) => cavity(a, floorTop + 1)) * p.reservoirHeight * 0.9)} ml${shaft ? ' – nachfüllen über den Schacht' : ''}`
          : `Erde etwa ${ml(ringArea(rAt(0)) * (z1 - z0) * 0.85)} ml`
        parts.push({ id: 'einsatz', name: water ? 'Einsatz Selbstbewässerung' : 'Pflanzeinsatz', mesh: b.mesh(), z: 0, merge: false, flip: false, info, floor: { holes, feet, shaft } })
        if (water && !hollow) notes.push('Selbstbewässerung braucht eine dichte, hohle Vase als Wasserbehälter.')
      }
    }
  })
  if (p.insertMode === 'stecker') safely('Der Steckeinsatz', () => {
    // Plate on the rim with holes for stems (larger towards the middle, smaller further out), below it
    // a collar that sits in the opening. Printed with the plate down.
    const b = new MeshBuilder()
    const plateR = (a) => shape.outerAt(a, H) + 1
    // The collar sits in the opening from H - 8 to H: as wide as the opening's narrowest point there.
    const collarO = (a) => {
      let m = Infinity
      for (let i = 0; i <= 8; i++) m = Math.min(m, cavity(a, H - 8 + i))
      return m - c
    }
    const collarI = (a) => collarO(a) - 1.6
    let minCollar = Infinity
    for (let k = 0; k < 360; k++) minCollar = Math.min(minCollar, collarI((2 * Math.PI * k) / 360))
    if (minCollar < 8) notes.push('Die Öffnung ist zu eng für einen Steckeinsatz.')
    else {
      const t = 2.4
      const big = p.frogHole / 2, small = big * 0.65
      const holes = []
      const step = p.frogHole * 1.9
      for (let iy = -20; iy <= 20; iy++) {
        for (let ix = -20; ix <= 20; ix++) {
          const x = (ix + (iy % 2 ? 0.5 : 0)) * step, y = iy * step * 0.866
          const d = Math.hypot(x, y)
          const r = d < minCollar * 0.45 ? big : small
          if (d + r + 1.4 < minCollar && holes.length < 60) holes.push({ cx: x, cy: y, r })
        }
      }
      if (!holes.length) throw new Error('kein Loch dieser Größe passt in die Öffnung – kleinere Löcher wählen')
      const lo = b.ring(N, plateR, H), hi = b.ring(N, plateR, H + t)
      b.wall([lo, hi])
      const under = b.cap(lo, H, holes, true)
      const above = b.cap(hi, H + t, holes, false)
      b.holeWalls(under, above)
      const k0 = b.ring(N, collarO, H - 8), k1 = b.ring(N, collarO, H + 0.4)
      const j1 = b.ring(N, collarI, H + 0.4), j0 = b.ring(N, collarI, H - 8)
      b.wall([k0, k1])
      b.band(k1, j1, true)
      b.wall([j0, j1], true)
      b.band(k0, j0, false)
      parts.push({ id: 'stecker', name: 'Steckeinsatz', mesh: b.mesh(), z: 0, merge: false, flip: true, info: `${holes.length} ${holes.length === 1 ? 'Loch' : 'Löcher'} für Stiele` })
    }
  })
  if (p.insertMode === 'roehrchen') safely('Das Wasserröhrchen', () => {
    // Watertight tube: fits through the narrowest point, hangs on the rim by a collar.
    // Narrowest point sampled densely: otherwise slats and corners fall between the samples.
    let narrow = Infinity
    for (let i = 0; i <= 48; i++) {
      const z = floorTop + 2 + ((H - floorTop - 2) * i) / 48
      for (let k = 0; k < 2880; k++) narrow = Math.min(narrow, cavity((2 * Math.PI * k) / 2880, z))
    }
    const rt = Math.min(p.tubeDiameter / 2, narrow - c - 0.5)
    let rimMin = Infinity
    for (let k = 0; k < 72; k++) rimMin = Math.min(rimMin, shape.outerAt((2 * Math.PI * k) / 72, H))
    // Collar almost out to the outer edge of the opening: it rests securely and does not overhang.
    const rf = Math.max(rt + 3, rimMin - 0.3)
    let openMin = Infinity
    for (let k = 0; k < 720; k++) openMin = Math.min(openMin, cavity((2 * Math.PI * k) / 720, H))
    if (rt < 4) notes.push('Die Vase ist zu eng für ein Wasserröhrchen.')
    else {
      const b = new MeshBuilder()
      const w = 1.6, zb = floorTop + 3
      b.lathe([[0, zb], [rt - 1, zb], [rt, zb + 1], [rt, H], [rf, H], [rf, H + 2], [rt - w, H + 2], [rt - w, zb + 2], [0, zb + 2]], 64)
      const vol = Math.PI * (rt - w) ** 2 * (H - zb - 2)
      parts.push({ id: 'roehrchen', name: 'Wasserröhrchen', mesh: b.mesh(), z: 0, merge: false, flip: true, info: `fasst etwa ${ml(vol)} ml – dicht drucken (3 Wände, keine Lücken)` })
      if (rf < openMin + 1) notes.push('Der Kragen des Röhrchens liegt kaum auf dem Rand – die Öffnung ist fast so weit wie die Vase.')
    }
  })
  /* ---------- Lid ---------- */
  // Plate on the rim (as wide as the outside of the vase, with a grip edge on the screw lid), below it
  // a lip or a threaded plug that sits in the opening. Printed with the plate down: lip, bead and
  // thread point upwards, their flanks at 45 degrees - no supports needed.
  if (p.lidMode !== 'keiner') safely('Der Deckel', () => {
    // Teapot lid: the vase's own top, cut off (the body ends there), with a lip into the opening and a knob apart.
    if (p.lidMode === 'kanne') {
      if (!layout.teapot) return
      const { cut, height, lip } = layout.teapot
      const lid = buildVase(p, { part: 'lid' })
      parts.push({ id: 'deckel', name: LID_MODES.kanne, mesh: { vertices: lid.vertices, indices: lid.indices }, z: 0, merge: false, flip: true, info: `Oberteil ab ${fmt(cut)} mm (${fmt(height)} mm hoch), Lippe ${fmt(lip)} mm, ${fmt(p.lidClearance, 2)} mm Spiel` })
      if (lid.knob) {
        const knob = teapotKnobMesh(p, layout.shape)
        parts.push({ id: 'knauf', name: 'Knauf', mesh: { vertices: knob.vertices, indices: knob.indices }, z: 0, merge: false, flip: true, info: `Ø ${fmt(knob.d)} mm – mit dem Zapfen ins Loch oben im Deckel kleben` })
      }
      return
    }
    if (p.lamp !== 'keine') return
    if (p.insertMode === 'stecker' || p.insertMode === 'roehrchen') return
    const lid = shape.lid
    if (p.lidMode !== 'stuelp' && !lid) {
      notes.push(`Ein ${LID_MODES[p.lidMode]} braucht eine hohle Vase – Bauart „Hohl mit Wand“ wählen.`)
      return
    }
    const t = p.lidThickness
    const L = p.lidDepth
    const grip = p.lidGrip === 'ja' && p.lidMode === 'schraube'
    // Grip edge: 36 shallow ridges (0.8 mm), so the hand gets a hold when screwing.
    const plateR = (a) => shape.outerAt(a, H) + outward + (grip ? 0.8 * (0.5 + 0.5 * Math.cos(36 * a)) : 0)
    // Lip or plug: outside with clearance to the opening, inside a wall of 1.2 mm (snap-on lid) or 1.6 mm (with the thread, a core 2.4 mm inside).
    let plugO, plugI, zs, info
    if (p.lidMode === 'schraube') {
      const zb = lid.z0 + 0.5
      plugO = (a, z) => shape.neck - p.lidClearance + lid.depth * threadDepthAt(a, z, lid, p)
      const core = shape.neck - p.lidClearance - 2.4
      if (core < 4) throw new Error('die Öffnung ist zu eng für ein Gewinde')
      plugI = () => core
      const n = Math.ceil((H - zb) / (lid.pitch / 16))
      zs = Array.from({ length: n + 1 }, (_, i) => zb + ((H - zb) * i) / n)
      info = `Gewinde ${fmt(lid.pitch)} mm Steigung, ${fmt((H - lid.z0) / lid.pitch)} Gänge, Rechtsgewinde`
    } else {
      // The lip follows the opening: per angle, the narrowest point over the lip's length.
      const openAt = (a) => {
        let m = Infinity
        for (let i = 0; i <= 8; i++) m = Math.min(m, cavity(a, H - L + (L * i) / 8))
        return m
      }
      const table = new Float64Array(N)
      for (let j = 0; j < N; j++) table[j] = openAt((2 * Math.PI * j) / N)
      const at = (a) => table[((Math.round((a / (2 * Math.PI)) * N) % N) + N) % N]
      const wall = p.lidMode === 'schnapp' ? 1.2 : 1.6
      // Schnapp (snap-on lid): a bead on the lip where the groove is; 0.3 mm larger than the opening, with clearance in the groove.
      const bead = (z) => {
        if (!lid || lid.kind !== 'schnapp') return 0
        const d = Math.abs(z - lid.zc) / (lid.half - 0.4)
        return d >= 1 ? 0 : (p.lidClearance + lid.snap) * (1 - d)
      }
      plugO = (a, z) => at(a) - p.lidClearance + bead(z)
      plugI = (a) => at(a) - p.lidClearance - wall
      let minI = Infinity
      for (let j = 0; j < N; j++) minI = Math.min(minI, table[j] - p.lidClearance - wall)
      if (minI < 3) throw new Error('die Öffnung ist zu eng für eine Lippe')
      const zb = H - L
      const n = Math.max(2, Math.ceil(L / (lid?.kind === 'schnapp' ? 0.2 : 2)))
      zs = Array.from({ length: n + 1 }, (_, i) => zb + (L * i) / n)
      info = p.lidMode === 'schnapp' ? `Lippe ${fmt(L)} mm mit Wulst, rastet ${fmt(lid.snap, 2)} mm ein` : `Lippe ${fmt(L)} mm, ${fmt(p.lidClearance, 2)} mm Spiel`
    }
    const b = new MeshBuilder()
    const lo = b.ring(N, plateR, H), hi = b.ring(N, plateR, H + t)
    b.wall([lo, hi])
    b.cap(hi, H + t, [], false)
    const outerRows = zs.map((z) => b.ring(N, (a) => plugO(a, z), z))
    b.band(lo, outerRows[outerRows.length - 1], false)
    b.wall(outerRows)
    const innerRows = [b.ring(N, (a) => plugI(a), zs[0]), b.ring(N, (a) => plugI(a), H)]
    b.band(outerRows[0], innerRows[0], false)
    b.wall(innerRows, true)
    b.cap(innerRows[1], H, [], true)
    parts.push({ id: 'deckel', name: LID_MODES[p.lidMode], mesh: b.mesh(), z: 0, merge: false, flip: true, info })
  })
  return { parts, lift, notes }
}

const fmt = (v, digits = 1) => v.toLocaleString('de-DE', { maximumFractionDigits: digits })

/** Bounding box of a mesh: { min: [x, y, z], max: [x, y, z] }. */
export function meshBox(vertices) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < vertices.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], vertices[i + k])
      max[k] = Math.max(max[k], vertices[i + k])
    }
  }
  return { min, max }
}

/** A point in its pose: (x, y, z) -> turned over (180 degrees about x) and moved. */
export function placePoint(pose, x, y, z) {
  return pose.flip ? [x + pose.dx, -y + pose.dy, -z + pose.dz] : [x + pose.dx, y + pose.dy, z + pose.dz]
}

/**
 * Pose of the vase and of every part, the same for preview and file. `mode`:
 * - 'zusammen' (assembled): as put together (vase lifted by `lift`, parts by `lift + z`);
 * - 'druck' (print): every part ready to print (turned over if `flip`), on z = 0, in rows to the
 *   right of the vase. Parts with `merge` belong to the vase and lie as it does.
 * `vaseBox` is the box of the vase, pattern included. Returns { vase, parts }, each with { flip, dx, dy, dz }.
 */
export function layoutParts(vaseBox, parts, lift, mode, { gap = 10, rowWidth = 220 } = {}) {
  if (mode === 'zusammen') {
    return {
      vase: { flip: false, dx: 0, dy: 0, dz: lift },
      parts: parts.map((part) => ({ flip: false, dx: 0, dy: 0, dz: lift + (part.merge ? 0 : part.z ?? 0) })),
    }
  }
  // The vase with its moulded-on parts: onto the bed together.
  const obj = { min: [...vaseBox.min], max: [...vaseBox.max] }
  const boxes = parts.map((part) => part.box ?? meshBox(part.mesh.vertices))
  parts.forEach((part, k) => {
    if (!part.merge) return
    for (let i = 0; i < 3; i++) {
      obj.min[i] = Math.min(obj.min[i], boxes[k].min[i])
      obj.max[i] = Math.max(obj.max[i], boxes[k].max[i])
    }
  })
  const vase = { flip: false, dx: 0, dy: 0, dz: -obj.min[2] }
  const x0 = obj.max[0] + gap
  const width = Math.max(rowWidth, obj.max[0] - obj.min[0])
  let cx = x0, cy = obj.min[1], rowH = 0
  const poses = parts.map((part, k) => {
    if (part.merge) return { ...vase }
    const b = boxes[k]
    const flip = Boolean(part.flip)
    const yMin = flip ? -b.max[1] : b.min[1], yMax = flip ? -b.min[1] : b.max[1]
    const zMin = flip ? -b.max[2] : b.min[2]
    const sx = b.max[0] - b.min[0], sy = yMax - yMin
    if (cx > x0 && cx + sx > x0 + width) { cx = x0; cy += rowH + gap; rowH = 0 }
    const pose = { flip, dx: cx - b.min[0], dy: cy - yMin, dz: -zMin }
    cx += sx + gap
    rowH = Math.max(rowH, sy)
    return pose
  })
  return { vase, parts: poses }
}
