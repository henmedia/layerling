import { MeshoptSimplifier } from "meshoptimizer/simplifier";

export type SimplifiedMesh = {
  /** Triangle soup, nine numbers per triangle, in the frame of the input. */
  positions: number[];
  triangleCount: number;
};

export type SimplifyOptions = {
  /**
   * Keeps sharp edges and the rims of holes where they are. Flat and gently curved areas still
   * lose most of their triangles, but a box edge stays straight and a bore stays as round as it
   * was. Off, the simplifier is free to round them off to reach the target.
   */
  keepEdges?: boolean;
};

/** Two faces meeting at more than this angle (degrees) make an edge to keep. */
export const SIMPLIFY_EDGE_ANGLE = 30;
/** With keepEdges, how far a round face may move, as a share of the mesh's largest extent (0.04 mm on an 80 mm part). */
const KEEP_EDGES_ERROR = 5e-4;
/** An edge point whose two edge lines turn by less than this (degrees) lies on a straight edge. */
const STRAIGHT_ANGLE = 1;

/**
 * Reduces a triangle soup to about `targetTriangles` triangles.
 *
 * An imported mesh lists every triangle with its own three corners. The
 * simplifier collapses edges, so corners at the same place are first welded
 * into one vertex - otherwise every triangle is an island and the surface
 * tears open. The result keeps the corners it was left with exactly where
 * they were; nothing is moved, so the body stays the size it was.
 *
 * The count is a target, not a promise: the simplifier stops early rather
 * than change the topology (close a hole, merge two walls), and with
 * `keepEdges` rather than move a sharp edge or let a round face stray from its shape.
 */
export async function simplifyTrianglePositions(positions: ArrayLike<number>, targetTriangles: number, options: SimplifyOptions = {}): Promise<SimplifiedMesh> {
  const cornerCount = Math.floor(positions.length / 9) * 3;
  const sourceTriangles = cornerCount / 3;
  const target = Math.max(4, Math.min(sourceTriangles, Math.round(targetTriangles)));
  if (sourceTriangles <= 4 || target >= sourceTriangles) {
    return { positions: Array.from(positions).slice(0, cornerCount * 3), triangleCount: sourceTriangles };
  }

  await MeshoptSimplifier.ready;
  const vertices = new Float32Array(cornerCount * 3);
  for (let index = 0; index < vertices.length; index += 1) vertices[index] = positions[index];

  // weld[corner] is the first corner at the same place: the welded index buffer.
  const weld = MeshoptSimplifier.generatePositionRemap(vertices, 3);
  const welded: number[] = [];
  for (let corner = 0; corner < cornerCount; corner += 3) {
    const a = weld[corner];
    const b = weld[corner + 1];
    const c = weld[corner + 2];
    // A triangle folded onto a line or a point has no area to keep.
    if (a !== b && b !== c && a !== c) welded.push(a, b, c);
  }

  const prepared = options.keepEdges ? splitAtEdges(welded, vertices) : compacted(welded, vertices);
  const [kept] = options.keepEdges
    // Round faces may only move by a small share of the mesh's size: a bore stays a fine cylinder, not a few wide
    // strips across it, and flat faces, which lose nothing by it, still lose most of their triangles.
    ? MeshoptSimplifier.simplifyWithAttributes(prepared.indices, prepared.vertices, 3, new Float32Array(0), 0, [], prepared.lock, target * 3, KEEP_EDGES_ERROR)
    // The error bound is relative to the size of the mesh; 1 lets the triangle
    // count alone decide where to stop.
    : MeshoptSimplifier.simplify(prepared.indices, prepared.vertices, 3, target * 3, 1);

  const result = new Array<number>(kept.length * 3);
  for (let index = 0; index < kept.length; index += 1) {
    const source = prepared.sourceOfVertex[kept[index]] * 3;
    result[index * 3] = positions[source];
    result[index * 3 + 1] = positions[source + 1];
    result[index * 3 + 2] = positions[source + 2];
  }
  return { positions: result, triangleCount: kept.length / 3 };
}

type PreparedMesh = {
  indices: Uint32Array;
  vertices: Float32Array;
  /** The corner of the soup each vertex stands for. */
  sourceOfVertex: Uint32Array;
  lock: Uint8Array | null;
};

/**
 * The welded mesh with only the corners triangles point at: the simplifier
 * takes two vertices at one place for a seam and will not collapse across it.
 */
function compacted(welded: number[], vertices: Float32Array): PreparedMesh {
  const indices = new Uint32Array(welded);
  const [compact, vertexCount] = MeshoptSimplifier.compactMesh(indices);
  const sourceOfVertex = new Uint32Array(vertexCount);
  const compactVertices = new Float32Array(vertexCount * 3);
  for (let corner = 0; corner < compact.length; corner += 1) {
    const vertex = compact[corner];
    if (vertex === 0xffffffff) continue;
    sourceOfVertex[vertex] = corner;
    compactVertices.set(vertices.subarray(corner * 3, corner * 3 + 3), vertex * 3);
  }
  return { indices, vertices: compactVertices, sourceOfVertex, lock: null };
}

/**
 * The welded mesh cut open along its sharp edges, with the corners that have to stay put locked.
 *
 * Where two faces meet at more than SIMPLIFY_EDGE_ANGLE, each side gets its own copy of the edge's
 * points. The simplifier takes such a pair for a seam: it only ever collapses a seam point along
 * the seam, onto the next point of the same edge, never across it into a face - so a sharp edge
 * can lose points only where it runs straight and keeps its line. A point where an edge bends (the
 * rim of a bore, every polygon corner of it), where edges meet (a box corner) or where one ends is
 * locked: it stays, and with it the roundness of the hole.
 */
function splitAtEdges(welded: number[], vertices: Float32Array): PreparedMesh {
  const triangleCount = welded.length / 3;
  const vertexCount = vertices.length / 3;
  const normals = new Float64Array(triangleCount * 3);
  for (let triangle = 0; triangle < triangleCount; triangle += 1) {
    const a = welded[triangle * 3] * 3;
    const b = welded[triangle * 3 + 1] * 3;
    const c = welded[triangle * 3 + 2] * 3;
    const ux = vertices[b] - vertices[a];
    const uy = vertices[b + 1] - vertices[a + 1];
    const uz = vertices[b + 2] - vertices[a + 2];
    const vx = vertices[c] - vertices[a];
    const vy = vertices[c + 1] - vertices[a + 1];
    const vz = vertices[c + 2] - vertices[a + 2];
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    const length = Math.hypot(nx, ny, nz) || 1;
    normals[triangle * 3] = nx / length;
    normals[triangle * 3 + 1] = ny / length;
    normals[triangle * 3 + 2] = nz / length;
  }

  // The triangles on each edge, keyed by its two welded ends.
  const edgeKey = (a: number, b: number) => (a < b ? a * vertexCount + b : b * vertexCount + a);
  const edgeTriangles = new Map<number, number[]>();
  for (let triangle = 0; triangle < triangleCount; triangle += 1) {
    for (let side = 0; side < 3; side += 1) {
      const key = edgeKey(welded[triangle * 3 + side], welded[triangle * 3 + (side + 1) % 3]);
      const list = edgeTriangles.get(key);
      if (list) list.push(triangle);
      else edgeTriangles.set(key, [triangle]);
    }
  }
  const creaseCos = Math.cos(SIMPLIFY_EDGE_ANGLE * Math.PI / 180);
  const sharp = new Set<number>();
  edgeTriangles.forEach((list, key) => {
    // An open rim or an edge shared by more than two faces counts as sharp, too.
    if (list.length !== 2) {
      sharp.add(key);
      return;
    }
    const [first, second] = list;
    const dot = normals[first * 3] * normals[second * 3]
      + normals[first * 3 + 1] * normals[second * 3 + 1]
      + normals[first * 3 + 2] * normals[second * 3 + 2];
    if (dot < creaseCos) sharp.add(key);
  });

  // The triangles around each welded vertex, as offsets into one list.
  const start = new Uint32Array(vertexCount + 1);
  for (const vertex of welded) start[vertex + 1] += 1;
  for (let vertex = 0; vertex < vertexCount; vertex += 1) start[vertex + 1] += start[vertex];
  const fill = start.slice(0, vertexCount);
  const around = new Uint32Array(welded.length);
  for (let corner = 0; corner < welded.length; corner += 1) around[fill[welded[corner]]++] = Math.floor(corner / 3);

  // Each corner's vertex in the split mesh.
  const splitOfCorner = new Uint32Array(welded.length);
  const sourceOfVertex: number[] = [];
  const locked: number[] = [];
  const parent: number[] = [];
  const find = (index: number): number => {
    let root = index;
    while (parent[root] !== root) root = parent[root];
    while (parent[index] !== root) {
      const next = parent[index];
      parent[index] = root;
      index = next;
    }
    return root;
  };
  const straightCos = Math.cos(STRAIGHT_ANGLE * Math.PI / 180);
  for (let vertex = 0; vertex < vertexCount; vertex += 1) {
    const from = start[vertex];
    const to = start[vertex + 1];
    if (from === to) continue;
    parent.length = 0;
    for (let local = 0; local < to - from; local += 1) parent.push(local);
    // Triangles that share an edge that is not sharp lie on the same side of every sharp edge here.
    const byNeighbour = new Map<number, number>();
    const sharpNeighbours = new Set<number>();
    for (let local = 0; local < to - from; local += 1) {
      const triangle = around[from + local];
      for (let slot = 0; slot < 3; slot += 1) {
        const neighbour = welded[triangle * 3 + slot];
        if (neighbour === vertex) continue;
        if (sharp.has(edgeKey(vertex, neighbour))) {
          sharpNeighbours.add(neighbour);
          continue;
        }
        const seen = byNeighbour.get(neighbour);
        if (seen === undefined) byNeighbour.set(neighbour, local);
        else parent[find(local)] = find(seen);
      }
    }
    const splitOfRoot = new Map<number, number>();
    for (let local = 0; local < to - from; local += 1) {
      const root = find(local);
      let split = splitOfRoot.get(root);
      if (split === undefined) {
        split = sourceOfVertex.length;
        splitOfRoot.set(root, split);
        sourceOfVertex.push(vertex);
      }
      const triangle = around[from + local];
      for (let slot = 0; slot < 3; slot += 1) {
        if (welded[triangle * 3 + slot] === vertex) splitOfCorner[triangle * 3 + slot] = split;
      }
    }
    if (sharpNeighbours.size === 0 || straightThrough(vertex, sharpNeighbours, vertices, straightCos)) continue;
    splitOfRoot.forEach((split) => locked.push(split));
  }

  const splitVertices = new Float32Array(sourceOfVertex.length * 3);
  sourceOfVertex.forEach((vertex, split) => splitVertices.set(vertices.subarray(vertex * 3, vertex * 3 + 3), split * 3));
  const lock = new Uint8Array(sourceOfVertex.length);
  for (const split of locked) lock[split] = 1;
  return { indices: splitOfCorner, vertices: splitVertices, sourceOfVertex: Uint32Array.from(sourceOfVertex), lock };
}

/** Whether a point lies in the middle of one straight sharp edge: two edge lines, in opposite directions. */
function straightThrough(vertex: number, neighbours: Set<number>, vertices: Float32Array, straightCos: number) {
  if (neighbours.size !== 2) return false;
  const [first, second] = [...neighbours];
  const direction = (other: number) => {
    const x = vertices[other * 3] - vertices[vertex * 3];
    const y = vertices[other * 3 + 1] - vertices[vertex * 3 + 1];
    const z = vertices[other * 3 + 2] - vertices[vertex * 3 + 2];
    const length = Math.hypot(x, y, z) || 1;
    return [x / length, y / length, z / length];
  };
  const a = direction(first);
  const b = direction(second);
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] < -straightCos;
}
