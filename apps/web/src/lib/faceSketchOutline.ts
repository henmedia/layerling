import type { SectionLoop } from "@/lib/sectionSvg";
import { sectionPointToFrame, type SectionFrame } from "@/lib/sectionView";

/*
 * The outline of the face "Sketch from face" was given (#2127), taken from the face's own triangles (#2173). It used
 * to be what a cut just under the face's plane gave, which also took everything else the plane runs through: on a
 * body that is not convex the plane of one face goes right through it.
 */

type FaceMesh = { vertices: ReadonlyArray<readonly [number, number, number]>; faces: ReadonlyArray<readonly [number, number, number]> };

/** How far (mm) a corner may lie off the clicked face's plane and still belong to it. */
const PLANE_TOLERANCE = 0.01;
/** The least a triangle's normal agrees with the face's: about 2.5 degrees. */
const NORMAL_AGREEMENT = 0.999;
/** Corners this close (mm) are one corner. */
const WELD = 1e-3;

type Flat = { u: number; v: number };

/** Twice the signed area of the triangle a, b, c. */
const turn = (a: Flat, b: Flat, c: Flat) => (b.u - a.u) * (c.v - a.v) - (b.v - a.v) * (c.u - a.u);

function distanceToSegment(point: Flat, a: Flat, b: Flat) {
  const du = b.u - a.u;
  const dv = b.v - a.v;
  const along = Math.max(0, Math.min(1, ((point.u - a.u) * du + (point.v - a.v) * dv) / (du * du + dv * dv || 1)));
  return Math.hypot(point.u - a.u - du * along, point.v - a.v - dv * along);
}

function distanceToTriangle(point: Flat, a: Flat, b: Flat, c: Flat) {
  const sides = [turn(a, b, point), turn(b, c, point), turn(c, a, point)];
  if (sides.every((side) => side >= 0) || sides.every((side) => side <= 0)) return 0;
  return Math.min(distanceToSegment(point, a, b), distanceToSegment(point, b, c), distanceToSegment(point, c, a));
}

const edgeKey = (a: number, b: number) => (a < b ? `${a} ${b}` : `${b} ${a}`);

/** Closed outlines out of loose edges; where an outline touches itself at a corner it comes apart there. */
function chainLoops(edges: ReadonlyArray<readonly [number, number]>) {
  const at = new Map<number, number[]>();
  edges.forEach(([a, b], index) => {
    for (const end of [a, b]) {
      const list = at.get(end);
      if (list) list.push(index);
      else at.set(end, [index]);
    }
  });
  const used = new Array<boolean>(edges.length).fill(false);
  const loops: number[][] = [];
  edges.forEach(([start], first) => {
    if (used[first]) return;
    const path = [start];
    const seen = new Map([[start, 0]]);
    for (;;) {
      const here = path[path.length - 1];
      const next = at.get(here)!.find((index) => !used[index]);
      if (next === undefined) break;
      used[next] = true;
      const [a, b] = edges[next];
      const there = a === here ? b : a;
      const back = seen.get(there);
      if (back === undefined) {
        seen.set(there, path.length);
        path.push(there);
        continue;
      }
      const loop = path.splice(back + 1);
      loop.unshift(there);
      for (const corner of loop.slice(1)) seen.delete(corner);
      if (loop.length >= 3) loops.push(loop);
    }
  });
  return loops;
}

/**
 * The outlines, holes included, of the flat face of `meshes` lying in the frame's plane (height 0) and looking the way
 * its height runs, as sliceMeshContours would give them for axis "y": u along the frame's x, v along its z. A face
 * is what hangs together over edges, so two faces in one plane that touch at a corner, or not at all, are two. With
 * `at`, the point clicked, only the face there is taken; without it every face of that side. Null when no triangle
 * lies in the plane, as on a rounded surface.
 */
export function faceSketchLoops(meshes: readonly FaceMesh[], frame: SectionFrame, at: readonly [number, number, number] | null): SectionLoop[] | null {
  const corners: Flat[] = [];
  const cells = new Map<string, number[]>();
  const corner = (u: number, v: number) => {
    const cu = Math.floor(u / WELD);
    const cv = Math.floor(v / WELD);
    for (let du = -1; du <= 1; du += 1) {
      for (let dv = -1; dv <= 1; dv += 1) {
        const found = cells.get(`${cu + du} ${cv + dv}`)?.find((index) => Math.hypot(corners[index].u - u, corners[index].v - v) <= WELD);
        if (found !== undefined) return found;
      }
    }
    const key = `${cu} ${cv}`;
    const list = cells.get(key);
    if (list) list.push(corners.length);
    else cells.set(key, [corners.length]);
    corners.push({ u, v });
    return corners.length - 1;
  };

  const triangles: [number, number, number][] = [];
  for (const mesh of meshes) {
    const placed = mesh.vertices.map((vertex) => sectionPointToFrame(vertex, frame));
    for (const face of mesh.faces) {
      const [a, b, c] = [placed[face[0]], placed[face[1]], placed[face[2]]];
      if (!a || !b || !c || [a, b, c].some((point) => Math.abs(point[1]) > PLANE_TOLERANCE)) continue;
      const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      const normal = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
      const length = Math.hypot(normal[0], normal[1], normal[2]);
      if (length < 1e-9 || normal[1] / length < NORMAL_AGREEMENT) continue;
      const triangle: [number, number, number] = [corner(a[0], a[2]), corner(b[0], b[2]), corner(c[0], c[2])];
      if (new Set(triangle).size === 3) triangles.push(triangle);
    }
  }
  if (triangles.length === 0) return null;

  // A corner lying on a neighbour's edge (a T-junction) splits that edge, so the two still hang together over it.
  const uses = new Map<string, number>();
  for (const [a, b, c] of triangles) {
    for (const key of [edgeKey(a, b), edgeKey(b, c), edgeKey(c, a)]) uses.set(key, (uses.get(key) ?? 0) + 1);
  }
  const loose = new Set<number>();
  for (const [key, count] of uses) {
    if (count === 1) key.split(" ").forEach((index) => loose.add(Number(index)));
  }
  const across = [...loose].sort((a, b) => corners[a].u - corners[b].u);
  const firstFrom = (u: number) => {
    let low = 0;
    let high = across.length;
    while (low < high) {
      const middle = (low + high) >> 1;
      if (corners[across[middle]].u < u) low = middle + 1;
      else high = middle;
    }
    return low;
  };
  const pieces = (a: number, b: number): [number, number][] => {
    if (uses.get(edgeKey(a, b)) !== 1) return [[a, b]];
    const from = corners[a];
    const to = corners[b];
    const du = to.u - from.u;
    const dv = to.v - from.v;
    const squared = du * du + dv * dv;
    const between: { index: number; along: number }[] = [];
    const highest = Math.max(from.u, to.u) + WELD;
    for (let step = firstFrom(Math.min(from.u, to.u) - WELD); step < across.length && corners[across[step]].u <= highest; step += 1) {
      const index = across[step];
      if (index === a || index === b) continue;
      const along = ((corners[index].u - from.u) * du + (corners[index].v - from.v) * dv) / squared;
      if (along <= 0 || along >= 1 || distanceToSegment(corners[index], from, to) > WELD) continue;
      between.push({ index, along });
    }
    const chain = [a, ...between.sort((x, y) => x.along - y.along).map((entry) => entry.index), b];
    return chain.slice(1).map((end, step) => [chain[step], end]);
  };
  const edgesOf = triangles.map(([a, b, c]) => [...pieces(a, b), ...pieces(b, c), ...pieces(c, a)]);

  const parent = triangles.map((_, index) => index);
  const root = (index: number): number => {
    while (parent[index] !== index) {
      parent[index] = parent[parent[index]];
      index = parent[index];
    }
    return index;
  };
  const owner = new Map<string, number>();
  edgesOf.forEach((edges, index) => {
    for (const [a, b] of edges) {
      const key = edgeKey(a, b);
      const other = owner.get(key);
      if (other === undefined) owner.set(key, index);
      else parent[root(index)] = root(other);
    }
  });

  let clicked: number | null = null;
  if (at) {
    const placed = sectionPointToFrame(at, frame);
    const point = { u: placed[0], v: placed[2] };
    let nearest = Number.POSITIVE_INFINITY;
    triangles.forEach(([a, b, c], index) => {
      const distance = distanceToTriangle(point, corners[a], corners[b], corners[c]);
      if (distance < nearest) {
        nearest = distance;
        clicked = root(index);
      }
    });
  }

  const faces = new Map<number, Map<string, { ends: [number, number]; count: number }>>();
  edgesOf.forEach((edges, index) => {
    const face = root(index);
    if (clicked !== null && face !== clicked) return;
    let rim = faces.get(face);
    if (!rim) faces.set(face, (rim = new Map()));
    for (const ends of edges) {
      const key = edgeKey(ends[0], ends[1]);
      const entry = rim.get(key);
      if (entry) entry.count += 1;
      else rim.set(key, { ends, count: 1 });
    }
  });

  const loops: SectionLoop[] = [];
  for (const rim of faces.values()) {
    const outline = [...rim.values()].filter((entry) => entry.count % 2 === 1).map((entry) => entry.ends);
    for (const loop of chainLoops(outline)) loops.push({ points: loop.map((index) => ({ u: corners[index].u, v: corners[index].v })), closed: true });
  }
  return loops.length ? loops : null;
}
