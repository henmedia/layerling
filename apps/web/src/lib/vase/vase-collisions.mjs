/**
 * Whether the vase and its accessories run into one another when they are put together: every body is a closed mesh
 * in the same coordinates (the vase's, z up), and two of them collide where a point of the one lies inside the other
 * by more than a play of 0.2 mm - parts that only touch (a pot on its saucer's ribs, a peg in its socket, a rail on
 * its ramp) do not.
 *
 *   assemblyCollisions([{ id, vertices, indices }, ...]) -> [{ a, b, depth }]
 *
 * `depth` is how deep at least (mm): the largest of 0.2, 0.5, 1, 2 and 4 mm by which the deepest point found can be
 * moved in every direction and still be inside the other body. It is counted inside the other body's material: a part
 * that goes right through a wall of 2 mm is no deeper in it than that wall allows.
 */

const LEVELS = [0.2, 0.5, 1, 2, 4]

/**
 * A closed mesh as a solid one can ask: how many times is a point wrapped by its surface (0 outside, 1 inside, 2
 * where two shells of it overlap)? Counted along a ray upwards: a face that looks up is left through, one that looks
 * down is entered. The triangles are sorted into a grid over x and y, so a question looks only at those above its cell.
 */
export function meshSolid(vertices, indices) {
  let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity
  for (let i = 0; i < vertices.length; i += 3) {
    if (vertices[i] < minX) minX = vertices[i]
    if (vertices[i] > maxX) maxX = vertices[i]
    if (vertices[i + 1] < minY) minY = vertices[i + 1]
    if (vertices[i + 1] > maxY) maxY = vertices[i + 1]
    if (vertices[i + 2] < minZ) minZ = vertices[i + 2]
    if (vertices[i + 2] > maxZ) maxZ = vertices[i + 2]
  }
  const count = indices.length / 3
  const cell = Math.min(10, Math.max(0.8, 3 * Math.sqrt(((maxX - minX) * (maxY - minY)) / Math.max(1, count))))
  const nx = Math.max(1, Math.ceil((maxX - minX) / cell)), ny = Math.max(1, Math.ceil((maxY - minY) / cell))
  const cellOf = (v, low, n) => Math.min(n - 1, Math.max(0, Math.floor((v - low) / cell)))
  // Two passes: how many triangles each cell holds, then the triangles themselves (faces seen edge-on are left out).
  const starts = new Uint32Array(nx * ny + 1)
  const span = (t, visit) => {
    const a = indices[t] * 3, b = indices[t + 1] * 3, c = indices[t + 2] * 3
    const area = (vertices[b] - vertices[a]) * (vertices[c + 1] - vertices[a + 1]) - (vertices[b + 1] - vertices[a + 1]) * (vertices[c] - vertices[a])
    if (Math.abs(area) < 1e-12) return
    const x0 = cellOf(Math.min(vertices[a], vertices[b], vertices[c]), minX, nx), x1 = cellOf(Math.max(vertices[a], vertices[b], vertices[c]), minX, nx)
    const y0 = cellOf(Math.min(vertices[a + 1], vertices[b + 1], vertices[c + 1]), minY, ny), y1 = cellOf(Math.max(vertices[a + 1], vertices[b + 1], vertices[c + 1]), minY, ny)
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) visit(y * nx + x)
  }
  for (let t = 0; t < indices.length; t += 3) span(t, (k) => { starts[k + 1]++ })
  for (let k = 0; k < nx * ny; k++) starts[k + 1] += starts[k]
  const fill = starts.slice(0, nx * ny)
  const list = new Uint32Array(starts[nx * ny])
  for (let t = 0; t < indices.length; t += 3) span(t, (k) => { list[fill[k]++] = t })
  const winding = (x, y, z) => {
    if (x < minX || x > maxX || y < minY || y > maxY || z < minZ || z > maxZ) return 0
    // A hair beside the point, so the ray does not run along an edge two triangles share.
    const px = x + 1.3e-7, py = y + 0.7e-7
    const k = cellOf(py, minY, ny) * nx + cellOf(px, minX, nx)
    let turns = 0
    for (let i = starts[k]; i < starts[k + 1]; i++) {
      const t = list[i]
      const a = indices[t] * 3, b = indices[t + 1] * 3, c = indices[t + 2] * 3
      const ax = vertices[a], ay = vertices[a + 1], bx = vertices[b], by = vertices[b + 1], cx = vertices[c], cy = vertices[c + 1]
      const area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax)
      const w0 = (bx - px) * (cy - py) - (by - py) * (cx - px)
      const w1 = (cx - px) * (ay - py) - (cy - py) * (ax - px)
      const w2 = area - w0 - w1
      if (area > 0 ? w0 < 0 || w1 < 0 || w2 < 0 : w0 > 0 || w1 > 0 || w2 > 0) continue
      if ((w0 * vertices[a + 2] + w1 * vertices[b + 2] + w2 * vertices[c + 2]) / area > z) turns += area > 0 ? 1 : -1
    }
    return turns
  }
  return { winding, box: [minX, minY, minZ, maxX, maxY, maxZ] }
}

/** How deep at least a point lies in a solid: the largest level it can be moved by in all six directions and stay inside; 0 if not even by the play. */
function depthIn(solid, x, y, z) {
  let depth = 0
  for (const level of LEVELS) {
    if (solid.winding(x + level, y, z) <= 0 || solid.winding(x - level, y, z) <= 0 || solid.winding(x, y + level, z) <= 0
      || solid.winding(x, y - level, z) <= 0 || solid.winding(x, y, z + level) <= 0 || solid.winding(x, y, z - level) <= 0) break
    depth = level
  }
  return depth
}

export function assemblyCollisions(bodies) {
  const solids = bodies.map(() => null)
  const solidOf = (k) => (solids[k] ??= meshSolid(bodies[k].vertices, bodies[k].indices))
  const boxes = bodies.map((body) => {
    const box = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity]
    for (let i = 0; i < body.vertices.length; i += 3) {
      for (let k = 0; k < 3; k++) {
        if (body.vertices[i + k] < box[k]) box[k] = body.vertices[i + k]
        if (body.vertices[i + k] > box[k + 3]) box[k + 3] = body.vertices[i + k]
      }
    }
    return box
  })
  const deepest = new Map()
  const top = LEVELS[LEVELS.length - 1]
  for (let a = 0; a < bodies.length; a++) {
    for (let b = 0; b < bodies.length; b++) {
      if (a === b) continue
      const A = boxes[a], B = boxes[b]
      if (A[0] > B[3] || B[0] > A[3] || A[1] > B[4] || B[1] > A[4] || A[2] > B[5] || B[2] > A[5]) continue
      const key = a < b ? `${a}_${b}` : `${b}_${a}`
      if (deepest.get(key) === top) continue
      const solid = solidOf(b)
      const v = bodies[a].vertices
      let depth = deepest.get(key) ?? 0, probes = 0
      for (let i = 0; i < v.length && depth < top && probes < 4000; i += 3) {
        const x = v[i], y = v[i + 1], z = v[i + 2]
        if (x < B[0] || x > B[3] || y < B[1] || y > B[4] || z < B[2] || z > B[5]) continue
        if (solid.winding(x, y, z) <= 0) continue
        probes++
        const d = depthIn(solid, x, y, z)
        if (d > depth) depth = d
      }
      if (depth > 0) deepest.set(key, depth)
    }
  }
  return [...deepest.entries()].map(([key, depth]) => {
    const [a, b] = key.split('_').map(Number)
    return { a: bodies[a].id, b: bodies[b].id, depth }
  })
}
