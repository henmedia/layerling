import type { MeshData } from "@/lib/editorMeshCore";

/**
 * Tiny loose pieces that a cut or the colour separation of an export leaves behind (#352): a closed shell of a
 * handful of triangles, a tetrahedron the size of a grain of sand, lying in or on the surface of a layer. They are
 * invisible in the editor, but a slicer shows them as spikes, and they can even lift a flat design off the plate.
 */
export const SPLINTER_MAX_TRIANGLES = 24;
/** Up to this many triangles a closed piece can still be a splinter, if it is tiny. */
export const SPLINTER_MAX_TRIANGLES_TINY = 1000;
/** A closed loose piece smaller than this, in cubic millimetres, is no part anyone drew. */
export const SPLINTER_MAX_VOLUME = 0.5;
/** A piece with an edge of its box longer than this, in millimetres, is never a splinter. */
export const SPLINTER_MAX_SIZE = 6;
/**
 * A piece that holds less than this, in cubic millimetres, holds nothing: a flat sheet of two faces on each other, a
 * leftover of a cut. It goes whatever its size and number of triangles.
 */
export const SPLINTER_NO_VOLUME = 0.01;
/** A thin shard of a few triangles: its volume is this share of the box round it, or less. */
export const SPLINTER_THIN_SHARE = 0.05;

/**
 * What is left of a piece someone drew is still that piece while it holds at least this share of what the piece held:
 * a tooth half sunk into a head is a tooth, the sliver left of a letter another layer took is not.
 */
export const SPLINTER_DRAWN_SHARE = 0.05;

const WELD = 1000;
/** How far a piece may reach past the box of the drawn piece it is left of, in millimetres: the weld's own step. */
const DRAWN_BOX_SLACK = 2 / WELD;

/** The loose pieces of a mesh: for every vertex the corner it is welded to, and for a corner the piece it belongs to. */
function loosePieces(mesh: MeshData) {
  // Corners at the same place are one corner, as a soup of triangles lists every corner again.
  const keyToId = new Map<string, number>();
  const corner = new Int32Array(mesh.vertices.length);
  for (let index = 0; index < mesh.vertices.length; index += 1) {
    const [x, y, z] = mesh.vertices[index];
    const key = `${Math.round(x * WELD)},${Math.round(y * WELD)},${Math.round(z * WELD)}`;
    let id = keyToId.get(key);
    if (id === undefined) {
      id = keyToId.size;
      keyToId.set(key, id);
    }
    corner[index] = id;
  }
  const parent = new Int32Array(keyToId.size);
  for (let index = 0; index < parent.length; index += 1) parent[index] = index;
  const find = (start: number) => {
    let node = start;
    while (parent[node] !== node) {
      parent[node] = parent[parent[node]];
      node = parent[node];
    }
    return node;
  };
  for (const [a, b, c] of mesh.faces) {
    const rootA = find(corner[a]);
    parent[find(corner[b])] = rootA;
    parent[find(corner[c])] = rootA;
  }
  return { corner, find };
}

/** What every loose piece holds, signed, and the box round it as [minX, minY, minZ, maxX, maxY, maxZ]. */
function measuredPieces(mesh: MeshData, { corner, find }: ReturnType<typeof loosePieces>) {
  const volume = new Map<number, number>();
  const box = new Map<number, number[]>();
  for (const [a, b, c] of mesh.faces) {
    const root = find(corner[a]);
    const pa = mesh.vertices[a];
    const pb = mesh.vertices[b];
    const pc = mesh.vertices[c];
    const signed = (pa[0] * (pb[1] * pc[2] - pb[2] * pc[1]) - pa[1] * (pb[0] * pc[2] - pb[2] * pc[0]) + pa[2] * (pb[0] * pc[1] - pb[1] * pc[0])) / 6;
    volume.set(root, (volume.get(root) ?? 0) + signed);
    const bounds = box.get(root) ?? [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
    for (const p of [pa, pb, pc]) {
      for (let axis = 0; axis < 3; axis += 1) {
        if (p[axis] < bounds[axis]) bounds[axis] = p[axis];
        if (p[axis] > bounds[axis + 3]) bounds[axis + 3] = p[axis];
      }
    }
    box.set(root, bounds);
  }
  return { volume, box };
}

const boxVolumeOf = (bounds: readonly number[]) => (bounds[3] - bounds[0]) * (bounds[4] - bounds[1]) * (bounds[5] - bounds[2]);

/** Whether a box lies in another one, give or take the weld's step. */
function boxWithin(inner: readonly number[], outer: readonly number[]) {
  for (let axis = 0; axis < 3; axis += 1) {
    if (inner[axis] < outer[axis] - DRAWN_BOX_SLACK || inner[axis + 3] > outer[axis + 3] + DRAWN_BOX_SLACK) return false;
  }
  return true;
}

/**
 * The mesh without its splinters, and how many pieces were left out. A piece counts as a splinter when it is closed
 * and tiny (under half a cubic millimetre), or has only a few triangles and is thin; a small cube or a pyramid
 * someone drew is neither, and neither is a thin ring. The mesh comes back as it was when there is nothing to remove,
 * and the piece with the most triangles always stays.
 *
 * `drawn` are the meshes the body was made from, before the cut or the merge. A loose piece one of them already had
 * is a part someone drew, however small: four teeth of a few tenths of a cubic millimetre, grouped and standing in
 * a head of another colour, went as splinters of the cut that gave the head their place, all but one, while the
 * same teeth exported on their own were all there (Issue #1781). So of every drawn piece the largest part left stays,
 * as the largest piece of the whole body does, while it still holds a real share of the piece
 * (SPLINTER_DRAWN_SHARE) and holds something at all. Which drawn piece a part is left of is read from the boxes:
 * the smallest drawn piece whose box it lies in.
 */
export function removeLooseSplinters(mesh: MeshData, drawn: readonly MeshData[] = []): { mesh: MeshData; removed: number } {
  const faceCount = mesh.faces.length;
  if (faceCount < 8) return { mesh, removed: 0 };

  const pieces = loosePieces(mesh);
  const { corner, find } = pieces;

  const triangles = new Map<number, number>();
  for (const [a] of mesh.faces) {
    const root = find(corner[a]);
    triangles.set(root, (triangles.get(root) ?? 0) + 1);
  }
  const candidates = new Set<number>();
  triangles.forEach((_count, root) => candidates.add(root));
  // The piece with the most triangles is the body itself, whatever its size.
  let largestRoot = -1;
  let largestCount = -1;
  triangles.forEach((count, root) => {
    if (count > largestCount) {
      largestCount = count;
      largestRoot = root;
    }
  });
  candidates.delete(largestRoot);
  if (candidates.size === 0) return { mesh, removed: 0 };

  // A piece is closed when every edge of it belongs to two triangles.
  const edgeUses = new Map<string, number>();
  const openRoots = new Set<number>();
  for (const [a, b, c] of mesh.faces) {
    const root = find(corner[a]);
    // Whether a piece is open is only asked of the small ones.
    if (!candidates.has(root) || (triangles.get(root) ?? 0) > SPLINTER_MAX_TRIANGLES_TINY) continue;
    for (const [from, to] of [[a, b], [b, c], [c, a]]) {
      const low = Math.min(corner[from], corner[to]);
      const high = Math.max(corner[from], corner[to]);
      if (low === high) continue;
      const key = `${low}:${high}`;
      edgeUses.set(key, (edgeUses.get(key) ?? 0) + 1);
    }
  }
  edgeUses.forEach((uses, key) => {
    if (uses !== 2) openRoots.add(find(Number(key.split(":")[0])));
  });

  const { volume, box } = measuredPieces(mesh, pieces);

  const splinters = new Set<number>();
  candidates.forEach((root) => {
    const bounds = box.get(root)!;
    const boxVolume = (bounds[3] - bounds[0]) * (bounds[4] - bounds[1]) * (bounds[5] - bounds[2]);
    const solid = Math.abs(volume.get(root) ?? 0);
    if (solid < SPLINTER_NO_VOLUME) {
      splinters.add(root);
      return;
    }
    if (Math.max(bounds[3] - bounds[0], bounds[4] - bounds[1], bounds[5] - bounds[2]) >= SPLINTER_MAX_SIZE) return;
    if ((triangles.get(root) ?? 0) <= SPLINTER_MAX_TRIANGLES) {
      // A handful of triangles is never a part, open or closed, when it is tiny or a thin shard.
      if (solid < SPLINTER_MAX_VOLUME || solid < boxVolume * SPLINTER_THIN_SHARE) splinters.add(root);
    } else if ((triangles.get(root) ?? 0) <= SPLINTER_MAX_TRIANGLES_TINY && openRoots.has(root)) {
      // An open shell holds (almost) no volume: the leftover of a cut, a sheet of no thickness. A piece that does hold
      // something is a part someone drew whose corners the weld did not join (a dot, a plank of a logo, #1258).
      if (solid < SPLINTER_MAX_VOLUME || solid < boxVolume * SPLINTER_THIN_SHARE) splinters.add(root);
    } else if (solid < SPLINTER_MAX_VOLUME) {
      // A closed shell, or one of many triangles, goes when it is that tiny; a thin ring stays.
      splinters.add(root);
    }
  });
  if (splinters.size > 0 && drawn.length > 0) {
    const drawnPieces = drawn.flatMap((source) => {
      const measured = measuredPieces(source, loosePieces(source));
      return [...measured.box].map(([root, bounds]) => ({ bounds, held: Math.abs(measured.volume.get(root) ?? 0) }));
    });
    [...splinters].forEach((root) => {
      const bounds = box.get(root)!;
      const solid = Math.abs(volume.get(root) ?? 0);
      if (solid < SPLINTER_NO_VOLUME) return;
      let home: (typeof drawnPieces)[number] | null = null;
      for (const piece of drawnPieces) {
        if (boxWithin(bounds, piece.bounds) && (!home || boxVolumeOf(piece.bounds) < boxVolumeOf(home.bounds))) home = piece;
      }
      if (!home || solid < home.held * SPLINTER_DRAWN_SHARE) return;
      // Only the largest part left of a drawn piece is that piece; what else the cut left in its box stays a splinter.
      for (const [other, otherBounds] of box) {
        if (other !== root && Math.abs(volume.get(other) ?? 0) > solid && boxWithin(otherBounds, home.bounds)) return;
      }
      splinters.delete(root);
    });
  }
  if (splinters.size === 0) return { mesh, removed: 0 };

  const faces: [number, number, number][] = [];
  const vertexOf = new Map<number, number>();
  const vertices: MeshData["vertices"] = [];
  const take = (index: number) => {
    let mapped = vertexOf.get(index);
    if (mapped === undefined) {
      mapped = vertices.length;
      vertexOf.set(index, mapped);
      vertices.push(mesh.vertices[index]);
    }
    return mapped;
  };
  for (const face of mesh.faces) {
    if (splinters.has(find(corner[face[0]]))) continue;
    faces.push([take(face[0]), take(face[1]), take(face[2])]);
  }
  return { mesh: { ...mesh, vertices, faces }, removed: splinters.size };
}
