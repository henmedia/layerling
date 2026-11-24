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
 * flip (turn over for printing), info (e.g. capacity in ml), stand (for a part built lying down as it is printed:
 * where it stands when put together - a point (x, v, w) of it is then at (x, stand.y - w, v + stand.z)) }. The meshes lie in the vase's
 * coordinates (centre on the axis); when assembled, the vase is lifted by `lift`, a part by
 * `lift + z` (saucer at the bottom, legs or stand on it, inserts in the vase: z = 0).
 * `layoutParts` lays everything out side by side for printing - preview and file use the same.
 */
import { MeshBuilder, triangulate } from './mesh-tools.mjs'
import { LID_MODES, WALL_RAIL, buildVase, floorLayout, normalizeParams, teapotKnobMesh, threadDepthAt } from './vase-geometry.mjs'

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
  // (A docked bowl stands under the pot: the pot is lifted by the bowl's height.)
  const dock = layout.dock
  const standLevel = p.saucerMode === 'schale' ? saucerFloor + saucerRib : dock ? dock.height : 0
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
    const low = p.saucerHeight
    // A slanted rim: level with the spout's side (0 degrees), higher towards the other (180 degrees) - a plane cut
    // through the dish. At most three quarters up the pot.
    const rise = Math.max(0, Math.min(p.saucerRise, lift + 0.75 * H - low))
    if (rise < p.saucerRise - 0.05) notes.push(`Der schräge Rand des Untersetzers ist auf ${rise.toFixed(0)} mm begrenzt – höher als drei Viertel des Topfs geht er nicht.`)
    const top = low + rise
    const lowAt = (a) => low + (rise * (1 - Math.cos(a))) / 2
    // Spout at the front (0 degrees) and finger grip at the back (180 degrees): the rim is lower there and drawn
    // outwards. With a slanted rim the high side is the grip.
    const spout = p.saucerSpout === 'ja'
    const grip = p.saucerGrip === 'ja' && rise < 1
    const dip = (a) => (spout ? 3.5 * bump(a, 0, 0.2) : 0) + (grip ? Math.min(low * 0.35, 5) * bump(a, Math.PI, 0.5) : 0)
    const bulge = (a, t) => ((spout ? 5 * bump(a, 0, 0.17) : 0) + (grip ? 3 * bump(a, Math.PI, 0.5) : 0)) * t * t
    const zTop = (a) => lowAt(a) - dip(a)
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
    // The wall: straight and a little flared (a plate), or following the pot at the gap's distance ('huelle'). The
    // pot must still lift out, so at every height the wall is as wide as the pot's widest point below it; and it leans
    // out by 45 degrees at most, so it prints without supports.
    let hug = null
    if (p.saucerForm === 'huelle') {
      const step = 1, count = Math.max(2, Math.ceil((top - floor) / step) + 1)
      const da = (2 * Math.PI) / N
      hug = new Array(N)
      for (let j = 0; j < N; j++) {
        const column = new Float64Array(count)
        let widest = 0
        for (let i = 0; i < count; i++) {
          // (The pot counted as standing on the table: the dish then also clears a pot that stands lower than on its ribs.)
          const zp = floor + i * step
          let m = 0
          for (let s = -1; s <= 1; s++) {
            const a = j * da + (s * da) / 2
            m = Math.max(m, zp <= 0 ? rim(a) : shape.outerAt(a, Math.min(H, zp)) + outward)
          }
          widest = Math.max(widest, m / Math.cos(da / 2))
          column[i] = widest
        }
        for (let i = count - 2; i >= 0; i--) column[i] = Math.max(column[i], column[i + 1] - step)
        hug[j] = column
      }
    }
    const hugAt = (a, z) => {
      const column = hug[((Math.round(a / ((2 * Math.PI) / N)) % N) + N) % N]
      const x = clamp(z - floor, 0, column.length - 1.001)
      const i = Math.floor(x)
      return column[i] + (column[i + 1] - column[i]) * (x - i)
    }
    const rInner = hug
      ? (a, z) => hugAt(a, z) + gap + bulge(a, (z - floor) / (top - floor))
      : (a, z) => base(a) + gap + (z - floor) * flare + bulge(a, (z - floor) / (top - floor))
    const rows = clamp(Math.ceil(top / 2.5), 10, 40)
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
  /* ---------- Docked bowl ---------- */
  // Flush under the pot, in its bottom outline (floorLayout / dockLayout): built standing on z = 0, the pot on its
  // three bosses.
  if (dock) safely('Die angedockte Schale', () => {
    const b = new MeshBuilder()
    const { body, floor, insetAt, bossR, pin } = dock
    const rows = clamp(Math.ceil(body / 1.25), 8, 40)
    const outerAt = (a, h) => rim(a) - insetAt(h)
    // The wall is measured square to its face: where it leans, it is wider along the radius.
    const innerAt = (a, h) => {
      const lean = (insetAt(Math.max(0, h - 0.25)) - insetAt(h + 0.25)) / 0.5
      return outerAt(a, h) - dock.wall * Math.sqrt(1 + lean * lean)
    }
    const outer = [], inner = []
    for (let i = 0; i <= rows; i++) outer.push(b.ring(N, (a) => outerAt(a, (body * i) / rows), (body * i) / rows))
    for (let i = 0; i <= rows; i++) {
      const h = floor + ((body - floor) * i) / rows
      inner.push(b.ring(N, (a) => innerAt(a, h), h))
    }
    b.wall(outer)
    b.wall(inner, true)
    b.band(outer[rows], inner[rows], true)
    b.cap(outer[0], 0, [], true)
    b.cap(inner[0], floor, [], false)
    for (const point of dock.points) {
      const profile = dock.magnet
        ? [[0, floor - 0.4], [bossR, floor - 0.4], [bossR, dock.height], [pin.r, dock.height], [pin.r, dock.height - pin.depth], [0, dock.height - pin.depth]]
        : [[0, floor - 0.4], [bossR, floor - 0.4], [bossR, dock.height], [2.5, dock.height], [2, dock.height + 2.6], [0, dock.height + 2.6]]
      b.lathe(profile, 32, { transform: (x, y, z) => [x + point.cx, y + point.cy, z] })
    }
    let vol = 0
    const steps = 20
    for (let i = 0; i < steps; i++) {
      const h = floor + ((i + 0.5) * (body - floor)) / steps
      vol += (ringArea((a) => innerAt(a, h)) - 3 * Math.PI * bossR * bossR) * ((body - floor) / steps)
    }
    const hold = dock.magnet
      ? `hält mit 3 Magneten Ø ${fmt(p.magnetDiameter)} × ${fmt(p.magnetHeight)} mm – je einen in die Schale und in den Topfboden kleben, so dass sie sich anziehen`
      : 'der Topf steht auf 3 Zapfen, die ihn mittig halten'
    parts.push({ id: 'andockschale', name: 'Angedockte Schale', mesh: b.mesh(), z: -dock.height, merge: false, flip: false, info: `fasst etwa ${ml(vol)} ml; ${hold}` })
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
      // The pot's inner wall is measured once on a fine grid (under a millimetre up, a fraction of a ring point's step
      // round); a ring point of the insert then takes the narrowest place
      // - half-way to its neighbours round the pot (the inner wall of narrow fins and pointed arches comes further in
      //   between two points than at either of them),
      // - from the row below it to the row above it (so the straight wall between two rows stays inside as well, also
      //   past a step in the pot's form),
      // - and a bottom's thickness further down: the insert then also fits where it stands that much lower than on
      //   the pot's inner floor - laid into the pot on the plate in the editor, or pressed in a little.
      const rows = clamp(Math.ceil((z1 - z0) / 5), 16, 36)
      const zs = Array.from({ length: rows + 1 }, (_, i) => z0 + ((z1 - z0) * i) / rows)
      const env = new Array(rows + 1)
      const AN = N
      const drop = hollow ? layout.floor : 1.2
      const fine = AN >= 400 ? 4 : 8
      const zBase = Math.max(floorTop + 0.2, z0 - drop)
      const levels = Math.max(8, Math.min(240, Math.ceil((H - zBase) / 0.75)))
      const levelStep = (H - zBase) / levels
      const narrowest = new Array(levels + 1)
      const cells = AN * fine
      const sampled = new Float64Array(cells)
      // Between fins (the wave style with narrow ribs) the inner wall jumps from the rib to the core: the insert is
      // round there, as wide as the core - it could not follow the ribs anyway, least of all on a twisted pot.
      const finned = (p.section === 'welle' && p.sectionWaveStyle === 'lamellen') || (p.section2 === 'welle' && p.section2WaveStyle === 'lamellen')
      for (let k = 0; k <= levels; k++) {
        const z = zBase + k * levelStep
        for (let cell = 0; cell < cells; cell++) sampled[cell] = cavity((2 * Math.PI * cell) / cells, z)
        const ring = new Float64Array(AN)
        if (finned) {
          let least = Infinity
          for (let cell = 0; cell < cells; cell++) least = Math.min(least, sampled[cell])
          ring.fill(least)
        } else {
          for (let j = 0; j < AN; j++) {
            let least = Infinity
            for (let s = -fine / 2; s <= fine / 2; s++) least = Math.min(least, sampled[(j * fine + s + cells) % cells])
            ring[j] = least
          }
        }
        narrowest[k] = ring
      }
      const levelOf = (z) => clamp((z - zBase) / levelStep, 0, levels)
      for (let i = rows; i >= 0; i--) {
        env[i] = new Float64Array(AN)
        const from = Math.floor(levelOf((i > 0 ? zs[i - 1] : zs[0]) - drop)), to = Math.ceil(levelOf(i < rows ? zs[i + 1] : H))
        for (let j = 0; j < AN; j++) {
          let m = Infinity
          for (let k = from; k <= to; k++) m = Math.min(m, narrowest[k][j])
          env[i][j] = i < rows ? Math.min(m, env[i + 1][j]) : m
        }
      }
      // Fins, arches and points have flanks the samples can just miss: a little more room there.
      const sharp = (p.section === 'welle' && p.sectionWaveStyle !== 'weich') || (p.section2 === 'welle' && p.section2WaveStyle !== 'weich') ? 0.3 : 0
      const room = c + 0.4 + sharp
      const rAt = (i) => (a) => {
        const x = (((a / (2 * Math.PI)) % 1) + 1) % 1 * AN
        const j = Math.floor(x) % AN, f = x - Math.floor(x)
        return env[i][j] * (1 - f) + env[i][(j + 1) % AN] * f - room
      }
      const minR = Math.min(...env[0]) - room
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
  /* ---------- Lamp base ---------- */
  // The base a lampshade stands on: a hollow foot, open below, with a sloped seat at the top that centres the shade
  // (which has no bottom), the light in its middle - an LED disc laid in from above, or a plate with the hole for a
  // screw socket - and a slot at the back of the foot for the cable. It is printed turned over, the seat on the bed:
  // every face then leans by 45 degrees at most, and nothing needs supports.
  if (p.lamp === 'sockel') safely('Der Lampensockel', () => {
    // How wide the shade is inside at its bottom: by its wall, or printed in the slicer's vase mode by one line.
    const insideAt = p.body === 'hohl' ? (a) => shape.innerAt(a, 0) : (a) => shape.outerAt(a, 0) - p.lineWidth
    let inner = Infinity, outer = 0
    for (let k = 0; k < 144; k++) {
      const a = (2 * Math.PI * k) / 144
      inner = Math.min(inner, insideAt(a))
      outer = Math.max(outer, shape.outerAt(a, 0) + outward)
    }
    const wall = 2.6
    // The seat: a cone the shade's bottom edge comes to rest on, 1.5 mm reaching into the shade and 2.5 mm below it.
    const seatTop = 1.5, seatDrop = 2.5
    const rs0 = inner - c - seatTop, rs1 = inner - c + seatDrop
    // The light: the hole it sits in, and what hangs below the deck for it.
    const disc = p.lampBaseLight === 'scheibe'
    const hole = disc ? p.lampDisc / 2 + 0.3 : p.lampHole / 2
    const collar = disc ? hole + 2.4 : hole
    if (collar + 2 > rs0 - wall) throw new Error(disc ? `die LED-Scheibe (Ø ${fmt(p.lampDisc)} mm) passt nicht in den Schirm – unten innen sind es nur Ø ${fmt(2 * inner)} mm` : `das Loch für die Fassung (Ø ${fmt(p.lampHole)} mm) passt nicht in den Schirm – unten innen sind es nur Ø ${fmt(2 * inner)} mm`)
    // The collar that holds an LED disc reaches down by its height and a lip; the foot is at least that high.
    const below = disc ? p.lampDiscHeight + 4.4 : 3
    let height = p.lampBaseHeight
    if (height < below + 6) {
      height = below + 6
      notes.push(`Sockel auf ${fmt(height)} mm erhöht, damit die LED-Scheibe (${fmt(p.lampDiscHeight)} mm hoch) hineinpasst.`)
    }
    // The foot: as wide as asked against the shade's bottom, but flaring by no more than it can print (45 degrees,
    // turned over) - how fast a form may flare depends on how it runs.
    const belly = p.lampBaseShape === 'bauch'
    const flare = { bauch: Math.PI, zylinder: 1, kegel: 1, kelch: Math.PI / 2, glocke: Math.PI / 2, stufe: 2 }[p.lampBaseShape]
    // A bellied base stands on a foot a little narrower than its top and is widest half way down; the others end at
    // their widest (or narrowest) on the table.
    let foot = belly ? rs1 * 0.92 : Math.max(12, (outer * p.lampBaseWidth) / 100)
    let bulge = belly ? Math.max(0, (outer * p.lampBaseWidth) / 100 + 6 - (rs1 + foot) / 2) : 0
    const reach = belly ? bulge : foot - rs1
    // (A little short of 45 degrees: the cable's slot draws the wall above it up and makes it steeper there.)
    const room = height * 0.85
    // (Drawn in counts the same: turned over, a wall that leans in hangs over on its inside.)
    if (Math.abs(reach) * flare > room) {
      if (belly) bulge = room / flare
      else foot = rs1 + (Math.sign(reach) * room) / flare
      notes.push(`Sockel auf Ø ${fmt(2 * (belly ? (rs1 + foot) / 2 + bulge : foot))} mm begrenzt – ${reach > 0 ? 'breiter' : 'schmaler'} würde er beim Drucken zu flach überhängen. Dafür die Höhe vergrößern.`)
    }
    // The wall stays clear of the light's holder inside it, however narrow a foot is asked for.
    const wallFrom = collar + 2
    foot = Math.max(foot, wallFrom + wall + 1.5)
    // The wall's radius from the seat (s = 0) down to the table (s = 1).
    const span = foot - rs1
    const radiusAt = (s) => {
      if (belly) return rs1 + span * s + bulge * Math.sin(Math.PI * s)
      if (p.lampBaseShape === 'glocke') return rs1 + span * Math.sin((s * Math.PI) / 2)
      if (p.lampBaseShape === 'kelch') return rs1 + span * (1 - Math.cos((s * Math.PI) / 2))
      if (p.lampBaseShape === 'stufe') return rs1 + span * clamp((s - 0.25) / 0.5, 0, 1)
      if (p.lampBaseShape === 'zylinder') return rs1 + span * clamp((s * height) / Math.max(1e-6, Math.abs(span)), 0, 1)
      return rs1 + span * s
    }
    const zSeat = -seatDrop, zTable = zSeat - height
    const ribs = p.lampBaseRibs
    const steps = p.lampBaseShape === 'kegel' && !ribs ? 1 : 24
    const outerWall = [], innerWall = []
    for (let k = 0; k <= steps; k++) {
      const s = k / steps
      outerWall.push([radiusAt(s), zSeat - s * height])
      innerWall.push([radiusAt(s) - wall, zSeat - s * height])
    }
    // A closed profile, counter-clockwise: up the outside, in over the deck, down through the light's hole, and back
    // out and down the inside.
    const profile = [...outerWall.reverse(), [rs0, seatTop], [hole, seatTop]]
    const deck = seatTop - 3
    if (disc) {
      // The disc comes to rest on a lip that slopes in under it (a slope, so it prints turned over, and so the disc
      // centres itself); the middle stays open for the cable.
      const seatZ = seatTop - p.lampDiscHeight
      profile.push([hole, seatZ], [hole - 3.2, seatZ - 3.2], [hole - 3.2, seatZ - 4.4], [collar, seatZ - 4.4], [collar, deck])
    } else profile.push([hole, deck])
    profile.push([rs0 + (seatTop - deck) - wall, deck], ...innerWall)
    // The cable's slot: at the back of the foot the wall's lower edge is lifted in an arch, the wall above it drawn up.
    const slotHeight = p.lampNotch > 0 ? Math.min(p.lampNotchHeight, height - 6) : 0
    const slotWidth = p.lampNotch > 0 ? 2 * Math.asin(Math.min(0.9, p.lampNotch / 2 / Math.max(1, foot))) + 0.06 : 0
    // Grooves up the wall: round ones, 0.9 mm deep, fading out towards the seat so the shade sits on a plain ring.
    const ribDepth = 0.9
    const b = new MeshBuilder()
    b.lathe(profile, clamp(Math.max(168, ribs * 8), 168, 720), {
      transform: slotHeight > 0 || ribs > 0 ? (x, y, z) => {
        // Only the wall: the seat above it and the light's holder inside it stay as they are.
        const r = Math.hypot(x, y)
        if (z >= zSeat || r < wallFrom) return [x, y, z]
        const a = Math.atan2(y, x)
        const down = (zSeat - z) / height
        let scale = 1
        if (ribs > 0) scale = 1 - ((ribDepth * 0.5 * (1 - Math.cos(ribs * a)) * clamp(down / 0.12, 0, 1)) / Math.max(1, r))
        const lifted = slotHeight > 0 ? slotHeight * bump(a, Math.PI / 2, slotWidth) : 0
        return [x * scale, y * scale, zTable + lifted + ((z - zTable) / height) * (height - lifted)]
      } : null,
    })
    // The shade's bottom edge rests where the seat is as wide as the shade is inside.
    lift = height + seatDrop + c
    const light = disc ? `LED-Scheibe Ø ${fmt(p.lampDisc)} mm, ${fmt(p.lampDiscHeight)} mm hoch` : `Fassung im Loch Ø ${fmt(p.lampHole)} mm`
    parts.push({ id: 'sockel', name: 'Lampensockel', mesh: b.mesh(), z: -c, merge: false, flip: true, info: `Ø ${fmt(2 * (belly ? (rs1 + foot) / 2 + bulge : Math.max(foot, rs1)))} mm, ${fmt(height + seatDrop + seatTop)} mm hoch; ${light}${slotHeight > 0 ? '; Kabel hinten heraus' : ''}. Umgedreht drucken, ohne Stützen.` })
  })

  /* ---------- Wall plate ---------- */
  // The back plate of a shade for the wall: a flat plate in the shade's outline (as seen from the front), with two
  // holes for screws and one for the cable, and along each side a low strip the half shade slips over, so it sits
  // where it belongs while the glue sets. Built lying down as it is printed, the strips up.
  if (p.body === 'hohl' && p.lamp === 'wand') safely('Die Wandplatte', () => {
    const thick = 2.4, strip = 1.6, stripHeight = 3.2
    const steps = Math.max(24, Math.min(240, Math.round(H / 1.5)))
    const right = [], left = [], inRight = [], inLeft = []
    for (let k = 0; k <= steps; k++) {
      const z = (H * k) / steps
      right.push([shape.outerAt(0, z) + outward, z - H / 2])
      left.push([-(shape.outerAt(Math.PI, z) + outward), z - H / 2])
      inRight.push(shape.innerAt(0, z) - c)
      inLeft.push(shape.innerAt(Math.PI, z) - c)
    }
    // The outline, counter-clockwise: up the right side, down the left.
    const outline = [...right, ...left.reverse()]
    const b = new MeshBuilder()
    const holes = []
    const halfWidthAt = (v) => {
      const k = clamp(Math.round(((v + H / 2) / H) * steps), 0, steps)
      return Math.min(right[k][0], -left[steps - k][0])
    }
    for (const [v, r] of [[-H / 4, p.lampWallScrew / 2], [H / 4, p.lampWallScrew / 2], [0, 4]]) if (halfWidthAt(v) > r + 4) holes.push({ cx: 0, cy: v, r })
    const holeLoops = holes.map((hole, k) => Array.from({ length: 20 }, (_, i) => {
      // Clockwise, as a hole runs, and turned a little so no point of one lies level with a point of another.
      const a = 0.21 + 0.4 * k - (2 * Math.PI * i) / 20
      return [hole.cx + hole.r * Math.cos(a), hole.cy + hole.r * Math.sin(a)]
    }))
    const face = triangulate(outline, holeLoops)
    if (!face.complete) throw new Error('der Umriss ließ sich nicht füllen')
    const flatPoints = [...outline, ...holeLoops.flat()]
    const lower = flatPoints.map(([x, y]) => b.addVertex(x, y, 0)), upper = flatPoints.map(([x, y]) => b.addVertex(x, y, thick))
    for (const [i, j, k] of face.triangles) {
      b.tris.push(lower[i], lower[k], lower[j])
      b.tris.push(upper[i], upper[j], upper[k])
    }
    // The rim round the outline, and the walls of the holes.
    const rim = (from, countOf, inward) => {
      for (let k = 0; k < countOf; k++) {
        const a = from + k, d = from + ((k + 1) % countOf)
        if (inward) { b.tris.push(lower[a], upper[d], lower[d]); b.tris.push(lower[a], upper[a], upper[d]) }
        else { b.tris.push(lower[a], lower[d], upper[d]); b.tris.push(lower[a], upper[d], upper[a]) }
      }
    }
    rim(0, outline.length, false)
    let from = outline.length
    for (const loop of holeLoops) {
      // (A hole's points run clockwise: its wall, seen the same way round, looks into the hole.)
      rim(from, loop.length, false)
      from += loop.length
    }
    // The two strips, a little into the plate so they are one with it: each follows the shade's inner wall.
    const stripAlong = (inner, sign) => {
      const lowZ = thick - 0.3, highZ = thick + stripHeight
      const first = Math.max(1, Math.round((4 / H) * steps)), last = steps - first
      const rows = []
      for (let k = first; k <= last; k++) {
        const v = (H * k) / steps - H / 2
        const outerX = sign * inner[k], innerX = sign * (inner[k] - strip)
        rows.push([b.addVertex(outerX, v, lowZ), b.addVertex(outerX, v, highZ), b.addVertex(innerX, v, highZ), b.addVertex(innerX, v, lowZ)])
      }
      // Four long faces between neighbouring sections, and the two ends; turned so the normals look outwards.
      const quad = (p0, p1, p2, p3) => { if (sign > 0) b.tris.push(p0, p1, p2, p0, p2, p3); else b.tris.push(p0, p2, p1, p0, p3, p2) }
      for (let k = 0; k < rows.length - 1; k++) {
        const A = rows[k], B = rows[k + 1]
        for (let e = 0; e < 4; e++) quad(A[e], B[e], B[(e + 1) % 4], A[(e + 1) % 4])
      }
      const A = rows[0], Z = rows[rows.length - 1]
      quad(A[0], A[1], A[2], A[3])
      quad(Z[3], Z[2], Z[1], Z[0])
    }
    stripAlong(inRight, 1)
    stripAlong(inLeft, -1)
    // (`stand`: built lying down, it stands at the shade's back when put together.)
    parts.push({ id: 'wandplatte', name: 'Wandplatte', mesh: b.mesh(), z: 0, merge: false, flip: false, stand: { y: thick, z: H / 2 }, info: `${holes.length} Löcher (Schrauben Ø ${fmt(p.lampWallScrew)} mm, Kabel Ø 8 mm). Flach drucken, die Leisten nach oben; den Schirm aufstecken und kleben.` })
  })

  /* ---------- Wall rail and holder ---------- */
  // A pot for the wall (vaseShape cut its back flat): a dovetail rail moulded on its back, and a holder for the wall
  // the rail slides into from above. The rail's lower end is a wedge at 45 degrees - it prints without supports, and
  // on the holder's ramp the pot's weight pulls the rail into the dovetail.
  const wallRail = layout.wall
  if (wallRail) safely('Die Wandschiene', () => {
    const { back, flat, top, bottom } = wallRail
    const { neck, head, headDepth } = WALL_RAIL
    // The pot's back at x (across) and z: where the ray from the axis crosses the outline there.
    const surfaceY = (x, z) => {
      let lo = 0.2, hi = Math.PI - 0.2
      for (let k = 0; k < 24; k++) {
        const mid = (lo + hi) / 2
        if (shape.outerAt(mid, z) * Math.cos(mid) > x) lo = mid
        else hi = mid
      }
      const th = (lo + hi) / 2
      return shape.outerAt(th, z) * Math.sin(th)
    }
    // Into the pot's wall by a little, so rail and pot are one body.
    const overlap = Math.min(0.6, p.wall * 0.4)
    const K = 7
    const sectionAt = (z) => {
      const yBack = Math.min(back, flat + (z - bottom))
      const xs = [], ys = []
      let most = -Infinity
      for (let k = 0; k <= K + 1; k++) {
        const x = neck - (2 * neck * k) / (K + 1)
        const y = surfaceY(x, z) - overlap
        xs.push(x)
        ys.push(y)
        most = Math.max(most, y)
      }
      if (yBack < most + 0.3) return null
      // The dovetail's head has its place at the wall, the last `headDepth` before the rail's back - not at the end
      // of the wedge, which is only as wide as the neck until it has grown that far (so it passes between the
      // holder's rails). (A hair wider than the neck there, so no three points of the outline lie in a line.)
      const yNeck = Math.max(Math.min(back - headDepth, yBack - 0.05), ys[0] + 0.05, ys[K + 1] + 0.05)
      const half = neck + Math.max(0.001, yBack - yNeck - (yBack > back - headDepth ? 0 : 0.05))
      // Counter-clockwise seen from above: up the right side, along the back, down the left, back along the pot.
      const points = [[neck, ys[0]], [neck, yNeck], [half, yBack], [-half, yBack], [-neck, yNeck], [-neck, ys[K + 1]]]
      for (let k = K; k >= 1; k--) points.push([xs[k], ys[k]])
      return points
    }
    // Layers a millimetre apart; where the pot is narrower than the flat, the rail starts lower (a buttress).
    const count = Math.max(8, Math.ceil(top - Math.max(0, bottom - 80)))
    let layers = []
    for (let i = 0; i <= count; i++) {
      const z = top - ((top - Math.max(0, bottom - 80)) * (count - i)) / count
      const points = sectionAt(z)
      if (points) layers.push({ z, points })
      else layers = []
    }
    if (layers.length < 8) throw new Error('die Schiene fand keinen Halt am Topf')
    const b = new MeshBuilder()
    const rings = layers.map(({ z, points }) => points.map(([x, y]) => b.addVertex(x, y, z)))
    const M = rings[0].length
    for (let i = 0; i + 1 < rings.length; i++) {
      const A = rings[i], B = rings[i + 1]
      for (let k = 0; k < M; k++) {
        const n = (k + 1) % M
        b.tris.push(A[k], A[n], B[n], A[k], B[n], B[k])
      }
    }
    const lowFace = triangulate(layers[0].points, []), topFace = triangulate(layers[layers.length - 1].points, [])
    if (!lowFace.complete || !topFace.complete) throw new Error('die Enden der Schiene ließen sich nicht schließen')
    for (const [i, j, k] of lowFace.triangles) b.tris.push(rings[0][i], rings[0][k], rings[0][j])
    for (const [i, j, k] of topFace.triangles) b.tris.push(rings[rings.length - 1][i], rings[rings.length - 1][j], rings[rings.length - 1][k])
    parts.push({ id: 'wandschiene', name: 'Wandschiene (angeformt)', mesh: b.mesh(), z: 0, merge: true, flip: false })

    // The holder, lying on its back as it is printed: a plate with two rails that lean in over the pocket (45
    // degrees), a ramp at the lower end the rail's wedge sits on, and countersunk holes in the pocket's floor - the
    // screws are hidden once the pot hangs.
    // `fit` is the play to each side of the rail, `behind` the gap between the rail's back and the plate. The rails'
    // slanted faces are moved out by both: moved by the play alone and back by the gap, a face at 45 degrees would
    // lie on the rail's again.
    const fit = c + 0.1, behind = 0.3
    const plate = 4, lip = headDepth + behind + 1.2, margin = 6
    const railLength = margin + (top - bottom) - 4
    const pocket = head + fit + behind
    const outerU = pocket + 6.5, plateU = pocket + 9
    const h = new MeshBuilder()
    /** A prism: a polygon (counter-clockwise) between two levels, put into space by `place`; `mirror` where that turns it over. */
    const prism = (polygon, l0, l1, place, mirror) => {
      const face = triangulate(polygon, [])
      if (!face.complete) throw new Error('ein Teil des Halters ließ sich nicht füllen')
      const lower = polygon.map(([u, v]) => h.addVertex(...place(u, v, l0))), upper = polygon.map(([u, v]) => h.addVertex(...place(u, v, l1)))
      const tri = (i, j, k) => (mirror ? h.tris.push(i, k, j) : h.tris.push(i, j, k))
      for (const [i, j, k] of face.triangles) {
        tri(lower[i], lower[k], lower[j])
        tri(upper[i], upper[j], upper[k])
      }
      for (let k = 0; k < polygon.length; k++) {
        const n = (k + 1) % polygon.length
        tri(lower[k], lower[n], upper[n])
        tri(lower[k], upper[n], upper[k])
      }
    }
    // The plate with rounded corners; the screw holes are countersunk towards the pocket (they open upwards in print).
    const corner = 5
    const outline = []
    for (const [cx, cy, a0] of [[plateU - corner, corner, -Math.PI / 2], [plateU - corner, railLength - corner, 0], [-plateU + corner, railLength - corner, Math.PI / 2], [-plateU + corner, corner, Math.PI]]) {
      for (let k = 0; k <= 6; k++) outline.push([cx + corner * Math.cos(a0 + (Math.PI / 2) * (k / 6)), cy + corner * Math.sin(a0 + (Math.PI / 2) * (k / 6))])
    }
    const screw = p.lampWallScrew / 2
    const first = margin + WALL_RAIL.flat + 2 * screw + 3, last = railLength - 2 * screw - 4
    const screws = last - first >= 4 * screw + 2 ? [first, last] : [(first + last) / 2]
    const loop = (v, r, k) => Array.from({ length: 24 }, (_, i) => {
      const a = 0.17 + 0.4 * k - (2 * Math.PI * i) / 24
      return [r * Math.cos(a), v + r * Math.sin(a)]
    })
    const sink = Math.min(screw, plate - 1.2)
    const levels = [[0, screw], [plate - sink, screw], [plate, screw + sink]]
    const faces = [0, 2].map((level) => {
      const loops = screws.map((v, k) => loop(v, levels[level][1], k))
      const face = triangulate(outline, loops)
      if (!face.complete) throw new Error('die Platte des Halters ließ sich nicht füllen')
      const points = [...outline, ...loops.flat()].map(([u, v]) => h.addVertex(u, v, levels[level][0]))
      for (const [i, j, k] of face.triangles) (level === 0 ? h.tris.push(points[i], points[k], points[j]) : h.tris.push(points[i], points[j], points[k]))
      return points
    })
    for (let k = 0; k < outline.length; k++) {
      const n = (k + 1) % outline.length
      h.tris.push(faces[0][k], faces[0][n], faces[1][n], faces[0][k], faces[1][n], faces[1][k])
    }
    screws.forEach((v, s) => {
      const from = outline.length + 24 * s
      const mid = loop(v, levels[1][1], s).map(([u, w]) => h.addVertex(u, w, levels[1][0]))
      const lowLoop = faces[0].slice(from, from + 24), highLoop = faces[1].slice(from, from + 24)
      for (const [A, B] of [[lowLoop, mid], [mid, highLoop]]) {
        for (let k = 0; k < 24; k++) {
          const n = (k + 1) % 24
          h.tris.push(A[k], A[n], B[n], A[k], B[n], B[k])
        }
      }
    })
    // The two rails (a section in u and height, run along the holder), a little into the plate.
    const z0 = plate - 0.3
    for (const side of [1, -1]) {
      const section = [[pocket, z0], [outerU, z0], [outerU, plate + lip], [neck + fit, plate + lip], [neck + fit, plate + headDepth + behind], [pocket, plate]]
      const polygon = side > 0 ? section : section.map(([u, w]) => [-u, w]).reverse()
      prism(polygon, margin * 0.4, railLength - 1.5, (u, w, v) => [u, v, w], true)
    }
    // The ramp between them, at the lower end: its face falls towards the pot at 45 degrees, as the rail's wedge does.
    const rampTop = margin + WALL_RAIL.flat
    prism([[margin * 0.4, z0], [rampTop + 0.3, z0], [rampTop - lip, plate + lip], [margin * 0.4, plate + lip]], -pocket - 0.3, pocket + 0.3, (v, w, u) => [u, v, w], false)
    parts.push({
      id: 'wandhalter', name: 'Wandhalter', mesh: h.mesh(), z: 0, merge: false, flip: false,
      // Put together it stands behind the pot: its plate 0.3 mm behind the rail, the ramp under the rail's wedge.
      stand: { y: back + behind + plate, z: bottom - margin + behind },
      info: `${screws.length === 1 ? 'Ein Loch' : `${screws.length} Löcher`} für Senkkopfschrauben Ø ${fmt(p.lampWallScrew)} mm, ${fmt(2 * plateU)} × ${fmt(railLength)} mm. Flach drucken, die Leisten nach oben; mit der Rampe nach unten an die Wand schrauben und den Topf von oben einschieben. Für Töpfe bis etwa 2 kg, am besten aus PETG.`,
    })
  })

  return { parts, lift, notes }
}

/**
 * A part's mesh where it sits when everything is put together, in the vase's coordinates: `z` above the vase's
 * bottom, or - for a part built lying down as it is printed - stood up at its `stand` (a quarter turn, so the
 * triangles still face out).
 */
export function assembledMesh(part) {
  const source = part.mesh.vertices
  const vertices = new Float64Array(source.length)
  for (let i = 0; i < source.length; i += 3) {
    vertices[i] = source[i]
    if (part.stand) {
      vertices[i + 1] = part.stand.y - source[i + 2]
      vertices[i + 2] = source[i + 1] + part.stand.z
    } else {
      vertices[i + 1] = source[i + 1]
      vertices[i + 2] = source[i + 2] + (part.z ?? 0)
    }
  }
  return { vertices, indices: part.mesh.indices }
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
