/**
 * Laying a body's paint strokes (paint.ts) onto its mesh: which faces of the surface take which colour.
 *
 * A fill needs no cut: it spreads over whole faces, from the one clicked, across every edge flatter than
 * its angle. A circle and a lasso have edges of their own that run through the faces, and a circle on a
 * box face of two triangles would come out as a few coloured triangles. So the mesh is cut along them
 * first: the body is split by the stroke's volume with the geometry kernel (a cylinder along the normal
 * for a circle, short ones along the line joined for a brush, the drawn shape drawn out along the line of
 * sight for a lasso), and of each half only the
 * faces that come from the body's own surface are kept, the cut faces dropped. Put back together, the
 * two halves are the body's surface as it was, with the region's edge as edges of the mesh; their
 * corners along the cut are welded, and where the kernel tidied a corner away on one side only, the face
 * on the other side is split at it, so the result is a closed mesh again. Each face remembers which face
 * of the mesh before it came from (the kernel's face ids), so it keeps the colour that face had.
 *
 * Of the faces inside the volume, a circle paints those it reaches from the point clicked without going
 * over a face turned away from it by more than 80° (the cylinder goes through the whole body, and the
 * back of it or a side face it grazes keeps its colour), a brush the same from its points, each face held
 * to the normal of the point nearest to it; a lasso paints those the eye saw: turned towards
 * it and with nothing of the body between them and the eye.
 *
 * Without the kernel (not loaded yet) or for a mesh it cannot take (an open import), the same regions are
 * found on whole faces, by their middles: the edges then follow the triangles.
 */
import * as THREE from "three";
import type { CrossSection, Manifold, ManifoldToplevel } from "manifold-3d";
import { MeshBVH } from "three-mesh-bvh";
import { meshForShape, sameShapeApartFromPlacement, type MeshData, type Vec3 } from "@/lib/editorMeshCore";
import { weldOnGrid } from "@/lib/gridWeld";
import { loadedManifoldRuntime, manifoldRevision, requestManifoldRuntime } from "@/lib/manifoldHandle";
import { canPaintShape, normalizePaintStroke, pressureDiameter, type PaintStroke, type PaintToolSettings, type PaintVec3 } from "@/lib/paint";
import { mirroredAxisCount, mirrorSign, shapeDepth, shapeWidth } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

/** A body's mesh with its paint: the faces cut along the strokes' edges, and the colour of each face. */
export type PaintedMesh = {
  vertices: Vec3[];
  faces: [number, number, number][];
  /** The colour of each face, or null where it keeps the body's own. */
  colors: (string | null)[];
  /** How many strokes found nothing on the body as it is now: an edit took their place away. They are kept, not laid. */
  skipped: number;
  /** Whether the circles and lassos were cut into the mesh; false when whole faces were coloured instead. */
  cut: boolean;
  /** Whether every stroke that needed a cut got one (true when none needed it): what a stroke laid on later carries on from. */
  cutOk?: boolean;
};

/** Faces turned away from a circle's normal by more than this many degrees stop it: the back of a thin wall, a side face it grazes. */
export const PAINT_CIRCLE_TURN = 80;
/** Corners closer than this, in mm, are one corner when the two halves of a cut are put together. */
export const PAINT_WELD = 1e-4;
/** A stroke's point must lie this close to the surface (mm, and a share of the body's size) to find its face again. */
const PAINT_SEED_REACH = 0.05;
const PAINT_SEED_SHARE = 0.02;
/** A circle is cut as a polygon of sides about this long (mm), with at least 32 and at most 256 of them. */
const PAINT_CIRCLE_SIDE = 0.4;
/** A brush's patches are cut as polygons of sides about this long (mm), with 12 to 64 of them: there are many. */
const PAINT_BRUSH_SIDE = 0.5;
/** Two points of a brush line whose normals differ by less than this many degrees are joined by one solid (their hull). */
const PAINT_BRUSH_JOIN = 30;
/** A brush line painted as a ball is made of at most this many balls. */
const PAINT_BALL_POINTS = 150;
/** A face is part of a brush line when its middle lies within this many half widths of it (the surface bends away under a patch). */
const PAINT_BRUSH_REACH = 1.15;
/** ... and its corners within this many times as far (a corner on the rim of a patch on a strongly bent surface lies further off). */
const PAINT_BRUSH_CORNER_REACH = 1.4;
/** A brush line is looked for on the body from at most this many of its points. */
const PAINT_BRUSH_SEEDS = 16;
/** Above this many faces the mesh is coloured in whole faces: a cut per stroke would take seconds. */
export const PAINT_CUT_TRIANGLE_LIMIT = 400_000;

type WorkMesh = { positions: number[]; faces: number[]; colors: (string | null)[] };

function size3(shape: WorkplaneShape): PaintVec3 {
  return [Math.max(1e-6, shapeWidth(shape)), Math.max(1e-6, shape.height), Math.max(1e-6, shapeDepth(shape))];
}

/**
 * From the body's own frame to the world: as the 3D view places the body's object, turned by its own
 * yaw (also a round body's, whose mesh does not show it), mirrored, standing at its place.
 */
export function paintBodyMatrix(shape: WorkplaneShape) {
  const degrees = THREE.MathUtils.degToRad;
  return new THREE.Matrix4().compose(
    new THREE.Vector3(shape.x, (shape.elevation ?? 0) + shape.height / 2, shape.z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(degrees(shape.rotationX ?? 0), degrees(shape.rotation), degrees(shape.rotationZ ?? 0), "XYZ")),
    new THREE.Vector3(mirrorSign(shape.mirrorX), mirrorSign(shape.mirrorY), mirrorSign(shape.mirrorZ)),
  ).multiply(new THREE.Matrix4().makeTranslation(0, -shape.height / 2, 0));
}

/** The body's mesh in its own frame: as meshForShape builds it, before it is placed, taper and twist included. */
export function paintBaseMesh(shape: WorkplaneShape): MeshData {
  return meshForShape({
    ...shape,
    x: 0,
    z: 0,
    elevation: 0,
    rotation: 0,
    rotationX: 0,
    rotationZ: 0,
    mirrorX: false,
    mirrorY: false,
    mirrorZ: false,
  });
}

/** A stroke made by a click on the body at `point` with the surface's `normal` there, both in the world. */
export function paintStrokeAt(shape: WorkplaneShape, point: THREE.Vector3Like, normal: THREE.Vector3Like, settings: PaintToolSettings): PaintStroke | null {
  const inverse = paintBodyMatrix(shape).invert();
  const local = new THREE.Vector3(point.x, point.y, point.z).applyMatrix4(inverse);
  const direction = new THREE.Vector3(normal.x, normal.y, normal.z).transformDirection(inverse);
  const mode = settings.mode === "circle" || settings.mode === "height" ? settings.mode : "fill";
  // A band runs level round the body as it is printed: across the world's up, whatever the face clicked.
  const up = new THREE.Vector3(0, 1, 0).transformDirection(inverse);
  const raw = {
    mode,
    ...(settings.erase ? {} : { color: settings.color }),
    size: size3(shape),
    point: local.toArray(),
    normal: (mode === "height" ? up : direction).toArray(),
    ...(mode === "circle" ? { diameter: settings.diameter, ball: settings.ball } : mode === "height" ? { band: settings.band } : { angle: settings.angle }),
  };
  return normalizePaintStroke(raw);
}

/** A point of a brush line as the view gives it: where it lies on the body and the face's normal, in the world, and the pen's pressure. */
export type PaintBrushSample = { point: THREE.Vector3Like; normal: THREE.Vector3Like; pressure?: number | null };

/**
 * A brush stroke along points the pointer took over the body, in the world (Discussion #1778). Points closer
 * than a tenth of the line's width to the one kept before are left out; a pen's pressure sets each point's
 * width when the tool takes it (`pressure` set and a pressure given).
 */
export function paintBrushStroke(shape: WorkplaneShape, samples: readonly PaintBrushSample[], settings: PaintToolSettings): PaintStroke | null {
  if (!samples.length) return null;
  const inverse = paintBodyMatrix(shape).invert();
  const usePressure = settings.pressure && samples.some((sample) => typeof sample.pressure === "number" && Number.isFinite(sample.pressure));
  const path: PaintVec3[] = [];
  const normals: PaintVec3[] = [];
  const diameters: number[] = [];
  const gap = Math.max(0.02, settings.diameter / 10);
  let last: THREE.Vector3 | null = null;
  samples.forEach((sample, index) => {
    const local = new THREE.Vector3(sample.point.x, sample.point.y, sample.point.z).applyMatrix4(inverse);
    // The last point stays wherever it is, so the line ends where the pointer was lifted.
    if (last && local.distanceTo(last) < gap && index < samples.length - 1) return;
    last = local;
    path.push(local.toArray());
    normals.push(new THREE.Vector3(sample.normal.x, sample.normal.y, sample.normal.z).transformDirection(inverse).toArray());
    diameters.push(usePressure ? pressureDiameter(settings.diameter, sample.pressure ?? 1) : settings.diameter);
  });
  return normalizePaintStroke({
    mode: "brush",
    ...(settings.erase ? {} : { color: settings.color }),
    size: size3(shape),
    diameter: settings.diameter,
    path,
    normals,
    ...(usePressure ? { diameters } : {}),
    ball: settings.ball,
  });
}

/**
 * The outward normal of the body's surface nearest to a point in the world, for a stroke given only a point
 * (the MCP tool); null when the point is further from the body than a stroke would look for it.
 */
export function paintSurfaceNormalAt(shape: WorkplaneShape, point: THREE.Vector3Like): THREE.Vector3 | null {
  const matrix = paintBodyMatrix(shape);
  const local = new THREE.Vector3(point.x, point.y, point.z).applyMatrix4(matrix.clone().invert());
  const mesh = paintBaseMesh(shape);
  const triangle = new THREE.Triangle();
  const closest = new THREE.Vector3();
  let best: THREE.Vector3 | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  const box = new THREE.Box3();
  mesh.faces.forEach(([a, b, c]) => {
    triangle.set(new THREE.Vector3(...mesh.vertices[a]), new THREE.Vector3(...mesh.vertices[b]), new THREE.Vector3(...mesh.vertices[c]));
    box.expandByPoint(triangle.a).expandByPoint(triangle.b).expandByPoint(triangle.c);
    if (triangle.getArea() < 1e-12) return;
    const distance = triangle.closestPointToPoint(local, closest).distanceTo(local);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = triangle.getNormal(new THREE.Vector3());
    }
  });
  const found = best as THREE.Vector3 | null;
  if (!found || bestDistance > PAINT_SEED_REACH + PAINT_SEED_SHARE * box.getSize(new THREE.Vector3()).length()) return null;
  // The body's own mesh faces outwards; a mirror in the placement turns the normal with it.
  return found.transformDirection(matrix);
}

/** The sides a flat view can look from, as the MCP tool takes a lasso. */
export const PAINT_VIEW_SIDES = ["top", "bottom", "front", "back", "left", "right"] as const;
export type PaintViewSide = (typeof PAINT_VIEW_SIDES)[number];

/**
 * A lasso drawn in a flat view from one side (the MCP tool): the outline's points are in millimetres along the
 * world's two axes across that view - x and z (positive towards the front) from the top or the bottom, x and the
 * height from the front or the back, z and the height from the left or the right.
 */
export function paintSideLasso(side: PaintViewSide, points: ReadonlyArray<[number, number]>): { view: PaintLassoView; outline: Array<[number, number]> } {
  const axes: Record<PaintViewSide, { forward: THREE.Vector3; right: THREE.Vector3; up: THREE.Vector3; across: [THREE.Vector3, THREE.Vector3] }> = {
    top: { forward: new THREE.Vector3(0, -1, 0), right: new THREE.Vector3(1, 0, 0), up: new THREE.Vector3(0, 0, -1), across: [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1)] },
    bottom: { forward: new THREE.Vector3(0, 1, 0), right: new THREE.Vector3(1, 0, 0), up: new THREE.Vector3(0, 0, 1), across: [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1)] },
    front: { forward: new THREE.Vector3(0, 0, -1), right: new THREE.Vector3(1, 0, 0), up: new THREE.Vector3(0, 1, 0), across: [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0)] },
    back: { forward: new THREE.Vector3(0, 0, 1), right: new THREE.Vector3(-1, 0, 0), up: new THREE.Vector3(0, 1, 0), across: [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0)] },
    left: { forward: new THREE.Vector3(1, 0, 0), right: new THREE.Vector3(0, 0, 1), up: new THREE.Vector3(0, 1, 0), across: [new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0)] },
    right: { forward: new THREE.Vector3(-1, 0, 0), right: new THREE.Vector3(0, 0, -1), up: new THREE.Vector3(0, 1, 0), across: [new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0)] },
  };
  const { forward, right, up, across } = axes[side];
  const outline = points.map(([a, b]): [number, number] => {
    const point = across[0].clone().multiplyScalar(a).addScaledVector(across[1], b);
    return [point.dot(right), point.dot(up)];
  });
  return { view: { origin: new THREE.Vector3(), right, up, forward, perspective: false }, outline };
}

/** Where the eye was for a lasso, in the world: its position (or a point on the line of sight for a flat view) and its axes. */
export type PaintLassoView = {
  origin: THREE.Vector3Like;
  right: THREE.Vector3Like;
  up: THREE.Vector3Like;
  forward: THREE.Vector3Like;
  perspective: boolean;
};

/** A lasso stroke from the shape drawn on the screen (see PaintStroke.outline for its units) and the view it was drawn in. */
export function paintLassoStroke(shape: WorkplaneShape, view: PaintLassoView, outline: ReadonlyArray<[number, number]>, settings: PaintToolSettings): PaintStroke | null {
  const inverse = paintBodyMatrix(shape).invert();
  const toLocal = (value: THREE.Vector3Like) => new THREE.Vector3(value.x, value.y, value.z);
  return normalizePaintStroke({
    mode: "lasso",
    ...(settings.erase ? {} : { color: settings.color }),
    size: size3(shape),
    origin: toLocal(view.origin).applyMatrix4(inverse).toArray(),
    right: toLocal(view.right).transformDirection(inverse).toArray(),
    up: toLocal(view.up).transformDirection(inverse).toArray(),
    forward: toLocal(view.forward).transformDirection(inverse).toArray(),
    perspective: view.perspective,
    outline,
  });
}

/**
 * A body's strokes moved into the frame of another body standing where it stands: a group cut into one body
 * that is built again (its parts changed in an open group) has a frame of its own, standing on its new lowest
 * point. Each stroke goes through the world, as it lies on the old body now, and keeps the new body's size.
 */
export function rebasePaintStrokes(strokes: readonly PaintStroke[], from: WorkplaneShape, to: WorkplaneShape): PaintStroke[] {
  const into = paintBodyMatrix(to).invert().multiply(paintBodyMatrix(from));
  const size = size3(from);
  return strokes.flatMap((stroke) => {
    const stretch = new THREE.Vector3(size[0] / stroke.size[0], size[1] / stroke.size[1], size[2] / stroke.size[2]);
    const point = (value: PaintVec3 | undefined) => (value ? new THREE.Vector3(...value).multiply(stretch).applyMatrix4(into).toArray() : undefined);
    const along = (value: PaintVec3 | undefined) => (value ? new THREE.Vector3(...value).multiply(stretch).transformDirection(into).toArray() : undefined);
    const normal = stroke.normal ? new THREE.Vector3(...stroke.normal).divide(stretch).transformDirection(into).toArray() : undefined;
    const moved = normalizePaintStroke({
      ...stroke,
      size: size3(to),
      point: point(stroke.point),
      normal,
      origin: point(stroke.origin),
      right: along(stroke.right),
      up: along(stroke.up),
      forward: along(stroke.forward),
      path: stroke.path?.map((entry) => point(entry)),
      normals: stroke.normals?.map((entry) => new THREE.Vector3(...entry).divide(stretch).transformDirection(into).toArray()),
    });
    return moved ? [moved] : [];
  });
}

/** Whether every edge of the faces is used once each way: a closed mesh, turned consistently. */
export function meshIsClosed(faces: ReadonlyArray<ArrayLike<number>> | ArrayLike<number>, vertexCount?: number) {
  const flat = flatFaces(faces);
  const count = vertexCount ?? flat.reduce((most, index) => Math.max(most, index + 1), 0);
  const edges = new Map<number, number>();
  for (let index = 0; index < flat.length; index += 3) {
    for (let corner = 0; corner < 3; corner += 1) {
      const key = flat[index + corner] * count + flat[index + ((corner + 1) % 3)];
      edges.set(key, (edges.get(key) ?? 0) + 1);
    }
  }
  for (const [key, uses] of edges) {
    const from = Math.floor(key / count);
    const to = key - from * count;
    if (uses !== 1 || edges.get(to * count + from) !== 1) return false;
  }
  return edges.size > 0;
}

function flatFaces(faces: ReadonlyArray<ArrayLike<number>> | ArrayLike<number>): number[] {
  const list = faces as ArrayLike<unknown>;
  if (list.length && typeof list[0] !== "number") return (faces as ReadonlyArray<ArrayLike<number>>).flatMap((face) => [face[0], face[1], face[2]]);
  return Array.from(faces as ArrayLike<number>);
}

/**
 * The faces put together on shared corners: corners within `tolerance` are welded, faces that shrank to
 * a line dropped, and an edge that only one side has a corner on is split at it (see the top of the
 * file). `source` says for every face left which face it came from.
 */
export function closeSeams(positions: ArrayLike<number>, faces: ArrayLike<number>, tolerance = PAINT_WELD) {
  const vertexCount = positions.length / 3;
  const points: number[][] = [];
  for (let index = 0; index < vertexCount; index += 1) points.push([positions[index * 3], positions[index * 3 + 1], positions[index * 3 + 2]]);
  const welded = weldOnGrid(points, tolerance);
  const ids = Array.from(welded.ids);
  let corners = welded.first.map((first) => points[first]);
  let triangles: number[][] = [];
  let source: number[] = [];
  for (let face = 0; face * 3 < faces.length; face += 1) {
    const a = ids[faces[face * 3]];
    const b = ids[faces[face * 3 + 1]];
    const c = ids[faces[face * 3 + 2]];
    if (a === b || b === c || c === a) continue;
    triangles.push([a, b, c]);
    source.push(face);
  }
  const openEdges = () => {
    const edges = new Set<number>();
    const count = corners.length;
    triangles.forEach(([a, b, c]) => {
      edges.add(a * count + b);
      edges.add(b * count + c);
      edges.add(c * count + a);
    });
    const open: Array<{ face: number; from: number; to: number; other: number }> = [];
    triangles.forEach(([a, b, c], face) => {
      [[a, b, c], [b, c, a], [c, a, b]].forEach(([from, to, other]) => {
        if (!edges.has(to * count + from)) open.push({ face, from, to, other });
      });
    });
    return open;
  };
  // Two corners the grid put either side of a line of it are welded by hand: they lie on open edges.
  let open = openEdges();
  if (open.length) {
    const loose = [...new Set(open.flatMap((edge) => [edge.from, edge.to]))];
    const merged = new Map<number, number>();
    for (let i = 0; i < loose.length; i += 1) {
      if (merged.has(loose[i])) continue;
      for (let j = i + 1; j < loose.length; j += 1) {
        if (merged.has(loose[j])) continue;
        const p = corners[loose[i]];
        const q = corners[loose[j]];
        if (Math.abs(p[0] - q[0]) <= tolerance * 2 && Math.abs(p[1] - q[1]) <= tolerance * 2 && Math.abs(p[2] - q[2]) <= tolerance * 2) merged.set(loose[j], loose[i]);
      }
    }
    if (merged.size) {
      const keptTriangles: number[][] = [];
      const keptSource: number[] = [];
      triangles.forEach((triangle, index) => {
        const next = triangle.map((corner) => merged.get(corner) ?? corner);
        if (next[0] === next[1] || next[1] === next[2] || next[2] === next[0]) return;
        keptTriangles.push(next);
        keptSource.push(source[index]);
      });
      triangles = keptTriangles;
      source = keptSource;
      open = openEdges();
    }
  }
  // A corner on one side's edge that the other side tidied away: the face along that edge is split at it.
  for (let pass = 0; pass < 8 && open.length; pass += 1) {
    const loose = [...new Set(open.flatMap((edge) => [edge.from, edge.to]))];
    const replaced = new Map<number, number[][]>();
    for (const edge of open) {
      if (replaced.has(edge.face)) continue;
      const from = corners[edge.from];
      const to = corners[edge.to];
      const along = [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
      const lengthSq = along[0] ** 2 + along[1] ** 2 + along[2] ** 2;
      if (lengthSq < 1e-24) continue;
      const between: Array<[number, number]> = [];
      for (const corner of loose) {
        if (corner === edge.from || corner === edge.to) continue;
        const point = corners[corner];
        const t = ((point[0] - from[0]) * along[0] + (point[1] - from[1]) * along[1] + (point[2] - from[2]) * along[2]) / lengthSq;
        if (t <= 1e-9 || t >= 1 - 1e-9) continue;
        const off = Math.hypot(from[0] + along[0] * t - point[0], from[1] + along[1] * t - point[1], from[2] + along[2] * t - point[2]);
        if (off <= tolerance) between.push([t, corner]);
      }
      if (!between.length) continue;
      between.sort((left, right) => left[0] - right[0]);
      const chain = [edge.from, ...between.map(([, corner]) => corner), edge.to];
      replaced.set(edge.face, chain.slice(0, -1).map((corner, index) => [corner, chain[index + 1], edge.other]));
    }
    if (!replaced.size) break;
    const nextTriangles: number[][] = [];
    const nextSource: number[] = [];
    triangles.forEach((triangle, index) => {
      (replaced.get(index) ?? [triangle]).forEach((piece) => {
        nextTriangles.push(piece);
        nextSource.push(source[index]);
      });
    });
    triangles = nextTriangles;
    source = nextSource;
    open = openEdges();
  }
  // Only the corners still used are kept.
  const used = new Map<number, number>();
  const kept: number[] = [];
  const outFaces: number[] = [];
  triangles.forEach((triangle) => triangle.forEach((corner) => {
    let index = used.get(corner);
    if (index === undefined) {
      index = used.size;
      used.set(corner, index);
      kept.push(corners[corner][0], corners[corner][1], corners[corner][2]);
    }
    outFaces.push(index);
  }));
  corners = [];
  return { positions: kept, faces: outFaces, source, closed: open.length === 0 && meshIsClosed(outFaces, used.size) };
}

function faceNormals(mesh: WorkMesh) {
  const count = mesh.faces.length / 3;
  const normals = new Float64Array(count * 3);
  const p = mesh.positions;
  for (let face = 0; face < count; face += 1) {
    const a = mesh.faces[face * 3] * 3;
    const b = mesh.faces[face * 3 + 1] * 3;
    const c = mesh.faces[face * 3 + 2] * 3;
    const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2];
    const vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const length = Math.hypot(nx, ny, nz);
    if (length > 1e-14) {
      normals[face * 3] = nx / length;
      normals[face * 3 + 1] = ny / length;
      normals[face * 3 + 2] = nz / length;
    }
  }
  return normals;
}

function centroid(mesh: WorkMesh, face: number, target: THREE.Vector3) {
  const p = mesh.positions;
  const a = mesh.faces[face * 3] * 3;
  const b = mesh.faces[face * 3 + 1] * 3;
  const c = mesh.faces[face * 3 + 2] * 3;
  return target.set((p[a] + p[b] + p[c]) / 3, (p[a + 1] + p[b + 1] + p[c + 1]) / 3, (p[a + 2] + p[b + 2] + p[c + 2]) / 3);
}

/** For each face, the faces across its three edges (-1 where there is none). */
function faceNeighbours(mesh: WorkMesh) {
  const count = mesh.faces.length / 3;
  const vertexCount = mesh.positions.length / 3;
  const byEdge = new Map<number, number>();
  for (let face = 0; face < count; face += 1) {
    for (let corner = 0; corner < 3; corner += 1) byEdge.set(mesh.faces[face * 3 + corner] * vertexCount + mesh.faces[face * 3 + ((corner + 1) % 3)], face);
  }
  const neighbours = new Int32Array(count * 3).fill(-1);
  for (let face = 0; face < count; face += 1) {
    for (let corner = 0; corner < 3; corner += 1) {
      const across = byEdge.get(mesh.faces[face * 3 + ((corner + 1) % 3)] * vertexCount + mesh.faces[face * 3 + corner]);
      if (across !== undefined) neighbours[face * 3 + corner] = across;
    }
  }
  return neighbours;
}

function bounds(mesh: WorkMesh) {
  const box = new THREE.Box3();
  const point = new THREE.Vector3();
  for (let index = 0; index < mesh.positions.length; index += 3) box.expandByPoint(point.set(mesh.positions[index], mesh.positions[index + 1], mesh.positions[index + 2]));
  return box;
}

/**
 * The face a stroke's point lies on: the nearest one to it whose normal is within 60° of the stroke's,
 * as long as it is near enough to be the same surface. Faces in `only` alone count when it is given.
 */
function seedFace(mesh: WorkMesh, normals: Float64Array, point: THREE.Vector3, normal: THREE.Vector3, reach: number, only?: Uint8Array) {
  const triangle = new THREE.Triangle();
  const closest = new THREE.Vector3();
  const p = mesh.positions;
  let best = -1;
  let bestDistance = Number.POSITIVE_INFINITY;
  let bestFacing = -2;
  for (let face = 0; face < mesh.faces.length / 3; face += 1) {
    if (only && !only[face]) continue;
    const facing = normals[face * 3] * normal.x + normals[face * 3 + 1] * normal.y + normals[face * 3 + 2] * normal.z;
    if (facing < 0.5) continue;
    const a = mesh.faces[face * 3] * 3;
    const b = mesh.faces[face * 3 + 1] * 3;
    const c = mesh.faces[face * 3 + 2] * 3;
    triangle.a.set(p[a], p[a + 1], p[a + 2]);
    triangle.b.set(p[b], p[b + 1], p[b + 2]);
    triangle.c.set(p[c], p[c + 1], p[c + 2]);
    const distance = triangle.closestPointToPoint(point, closest).distanceTo(point);
    if (distance < bestDistance - 1e-7 || (distance <= bestDistance + 1e-7 && facing > bestFacing)) {
      best = face;
      bestDistance = Math.min(distance, bestDistance);
      bestFacing = facing;
    }
  }
  return best >= 0 && bestDistance <= reach ? best : -1;
}

/** The faces reached from `seed` across edges that `passes` lets through. */
function spread(mesh: WorkMesh, neighbours: Int32Array, seed: number, passes: (from: number, to: number) => boolean) {
  const reached = new Uint8Array(mesh.faces.length / 3);
  reached[seed] = 1;
  const queue = [seed];
  while (queue.length) {
    const face = queue.pop()!;
    for (let corner = 0; corner < 3; corner += 1) {
      const next = neighbours[face * 3 + corner];
      if (next < 0 || reached[next] || !passes(face, next)) continue;
      reached[next] = 1;
      queue.push(next);
    }
  }
  return reached;
}

/** Turns a matrix of three's into the column-major list the kernel takes. */
function kernelMatrix(matrix: THREE.Matrix4) {
  return Array.from(matrix.elements) as unknown as Parameters<Manifold["transform"]>[0];
}

/** What a stroke's volume needs to know of the body: its corners in the stroke's own frame (the stretch taken back). */
function strokeFrameBounds(mesh: WorkMesh, stretch: THREE.Vector3) {
  const box = new THREE.Box3();
  const point = new THREE.Vector3();
  for (let index = 0; index < mesh.positions.length; index += 3) {
    box.expandByPoint(point.set(mesh.positions[index] / stretch.x, mesh.positions[index + 1] / stretch.y, mesh.positions[index + 2] / stretch.z));
  }
  return box;
}

/** A circle's volume in the stroke's frame: a cylinder along its normal through the whole body. */
function circleVolume(runtime: ManifoldToplevel, stroke: PaintStroke, frameBox: THREE.Box3, made: Array<{ delete(): void }>) {
  const radius = (stroke.diameter ?? 0) / 2;
  const centre = new THREE.Vector3(...stroke.point!);
  const axis = new THREE.Vector3(...stroke.normal!).normalize();
  const reach = frameBox.getSize(new THREE.Vector3()).length() + frameBox.distanceToPoint(centre) + 1;
  const sides = Math.min(256, Math.max(32, Math.ceil((Math.PI * 2 * radius) / PAINT_CIRCLE_SIDE)));
  const cylinder = runtime.Manifold.cylinder(reach * 2, radius, radius, sides, true);
  made.push(cylinder);
  const turn = new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), axis));
  return { solid: cylinder, frame: new THREE.Matrix4().makeTranslation(centre.x, centre.y, centre.z).multiply(turn) };
}

/** The width of a brush line at its `index`-th point, in mm. */
function brushDiameter(stroke: PaintStroke, index: number) {
  return stroke.diameters?.[index] ?? stroke.diameter ?? 0;
}

/**
 * A brush line's volume in the stroke's frame. The line is taken in runs whose normals stay within
 * PAINT_BRUSH_JOIN of the run's first: each run is drawn flat across its own direction (the mean of its
 * points' normals) - a round patch at every point, each joined to the next by their hull, as wide as the line
 * is there - and drawn out along it, from one and a half radii plus a little under its deepest point to as far
 * over its highest (enough for the surface to bend away under a patch). A run reaches on to the next run's
 * first point and back to the last of the one before, so no gap opens round a bend between two points far
 * apart, and is cut off where the next run begins: by the plane through the line where the two runs' surfaces
 * meet (their tangent planes at the points either side of the bend), half way between their directions. So a
 * line over the edge of a box is drawn by one solid on the top and one down the side, which meet at the edge
 * and reach no further. Drawn flat, a run is one cut however many points it has; a solid at each point would
 * take seconds.
 */
function brushVolume(runtime: ManifoldToplevel, stroke: PaintStroke, made: Array<{ delete(): void }>) {
  const path = (stroke.path ?? []).map((entry) => new THREE.Vector3(...entry));
  const normals = (stroke.normals ?? []).map((entry) => new THREE.Vector3(...entry).normalize());
  if (!path.length) return null;
  const join = Math.cos(THREE.MathUtils.degToRad(PAINT_BRUSH_JOIN));
  const own: number[][] = [];
  let run: number[] = [0];
  for (let index = 1; index < path.length; index += 1) {
    if (normals[index].dot(normals[run[0]]) < join) {
      own.push(run);
      run = [];
    }
    run.push(index);
  }
  own.push(run);
  const axes = own.map((members) => {
    const axis = members.reduce((sum, index) => sum.add(normals[index]), new THREE.Vector3());
    return axis.lengthSq() > 1e-12 ? axis.normalize() : normals[members[0]].clone();
  });
  // Between run k and run k + 1: the plane through the line where their tangent planes meet, its normal towards run k.
  const bends = own.slice(0, -1).map((members, index) => {
    const [a, b] = [axes[index], axes[index + 1]];
    const normal = a.clone().sub(b);
    const length = normal.length();
    if (length < 0.05) return null;
    const offset = (a.dot(path[members[members.length - 1]]) - b.dot(path[own[index + 1][0]])) / length;
    return { normal: normal.divideScalar(length), offset };
  });
  const solids: Manifold[] = [];
  for (const [runIndex, ownMembers] of own.entries()) {
    const members = [
      ...(runIndex > 0 ? [own[runIndex - 1][own[runIndex - 1].length - 1]] : []),
      ...ownMembers,
      ...(runIndex + 1 < own.length ? [own[runIndex + 1][0]] : []),
    ];
    const axis = axes[runIndex];
    const across = Math.abs(axis.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const right = across.addScaledVector(axis, -across.dot(axis)).normalize();
    const up = new THREE.Vector3().crossVectors(axis, right);
    let low = Number.POSITIVE_INFINITY;
    let high = Number.NEGATIVE_INFINITY;
    const discs = members.map((index) => {
      const radius = brushDiameter(stroke, index) / 2;
      const depth = path[index].dot(axis);
      low = Math.min(low, depth - radius * 1.5 - 0.2);
      high = Math.max(high, depth + radius * 1.5 + 0.2);
      const x = path[index].dot(right);
      const y = path[index].dot(up);
      const sides = Math.min(64, Math.max(12, Math.ceil((Math.PI * 2 * radius) / PAINT_BRUSH_SIDE)));
      return Array.from({ length: sides }, (_, side): [number, number] => {
        const angle = (side / sides) * Math.PI * 2;
        return [x + Math.cos(angle) * radius, y + Math.sin(angle) * radius];
      });
    });
    const parts: CrossSection[] = [];
    if (discs.length === 1) {
      const disc = new runtime.CrossSection([discs[0]], "NonZero");
      made.push(disc);
      parts.push(disc);
    }
    for (let index = 0; index + 1 < discs.length; index += 1) {
      const hull = runtime.CrossSection.hull([discs[index], discs[index + 1]]);
      made.push(hull);
      parts.push(hull);
    }
    const flat = parts.length === 1 ? parts[0] : runtime.CrossSection.union(parts);
    if (flat !== parts[0]) made.push(flat);
    if (flat.area() <= 1e-12) continue;
    const prism = flat.extrude(high - low);
    made.push(prism);
    const frame = new THREE.Matrix4().makeBasis(right, up, axis).setPosition(axis.clone().multiplyScalar(low));
    let placed = prism.transform(kernelMatrix(frame));
    made.push(placed);
    const before = runIndex > 0 ? bends[runIndex - 1] : null;
    const after = runIndex < bends.length ? bends[runIndex] : null;
    if (before) {
      placed = placed.trimByPlane([-before.normal.x, -before.normal.y, -before.normal.z], -before.offset);
      made.push(placed);
    }
    if (after) {
      placed = placed.trimByPlane([after.normal.x, after.normal.y, after.normal.z], after.offset);
      made.push(placed);
    }
    if (!placed.isEmpty()) solids.push(placed);
  }
  if (!solids.length) return null;
  const solid = solids.length === 1 ? solids[0] : runtime.Manifold.union(solids);
  if (solid !== solids[0]) made.push(solid);
  return { solid, frame: new THREE.Matrix4() };
}

/** A ball painted with a circle: the sphere round its point, as wide as the circle. */
function ballVolume(runtime: ManifoldToplevel, stroke: PaintStroke, made: Array<{ delete(): void }>) {
  const radius = (stroke.diameter ?? 0) / 2;
  const sphere = runtime.Manifold.sphere(radius, Math.min(96, Math.max(24, Math.ceil((Math.PI * 2 * radius) / PAINT_CIRCLE_SIDE))));
  made.push(sphere);
  return { solid: sphere, frame: new THREE.Matrix4().makeTranslation(...(stroke.point as [number, number, number])) };
}

/**
 * A brush line painted as a ball: a sphere at its points, each joined to the next by their hull, so all of the surface
 * within its half width of the line is inside, round edges too. Its points are taken at least a third of the width apart
 * and PAINT_BALL_POINTS at most, as a solid each takes time.
 */
function ballLineVolume(runtime: ManifoldToplevel, stroke: PaintStroke, made: Array<{ delete(): void }>) {
  const path = stroke.path ?? [];
  if (!path.length) return null;
  let kept: number[] = [0];
  path.forEach((point, index) => {
    if (index === 0) return;
    const last = path[kept[kept.length - 1]];
    const gap = Math.min(brushDiameter(stroke, index), brushDiameter(stroke, kept[kept.length - 1])) / 3;
    if (Math.hypot(point[0] - last[0], point[1] - last[1], point[2] - last[2]) >= gap || index === path.length - 1) kept.push(index);
  });
  if (kept.length > PAINT_BALL_POINTS) kept = Array.from({ length: PAINT_BALL_POINTS }, (_, at) => kept[Math.round((at * (kept.length - 1)) / (PAINT_BALL_POINTS - 1))]);
  const spheres = kept.map((index) => {
    const radius = brushDiameter(stroke, index) / 2;
    const sphere = runtime.Manifold.sphere(radius, Math.min(48, Math.max(16, Math.ceil((Math.PI * 2 * radius) / PAINT_BRUSH_SIDE))));
    made.push(sphere);
    const placed = sphere.translate(path[index] as [number, number, number]);
    made.push(placed);
    return placed;
  });
  const pieces = spheres.length === 1 ? spheres : spheres.slice(1).map((sphere, index) => {
    const hull = runtime.Manifold.hull([spheres[index], sphere]);
    made.push(hull);
    return hull;
  });
  const solid = pieces.length === 1 ? pieces[0] : runtime.Manifold.union(pieces);
  if (solid !== pieces[0]) made.push(solid);
  return { solid, frame: new THREE.Matrix4() };
}

/** A band's volume: a slab `band` thick across its up direction through its point, wider than the body. */
function bandVolume(runtime: ManifoldToplevel, stroke: PaintStroke, frameBox: THREE.Box3, made: Array<{ delete(): void }>) {
  const centre = new THREE.Vector3(...stroke.point!);
  const up = new THREE.Vector3(...stroke.normal!).normalize();
  const across = (frameBox.getSize(new THREE.Vector3()).length() + frameBox.distanceToPoint(centre)) * 3 + 10;
  const slab = runtime.Manifold.cube([across, across, stroke.band ?? 0], true);
  made.push(slab);
  const turn = new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), up));
  return { solid: slab, frame: new THREE.Matrix4().makeTranslation(centre.x, centre.y, centre.z).multiply(turn) };
}

/**
 * Specks gone (a "gaps" stroke): every patch of faces in one colour (the body's own counts as one) smaller than `limit`
 * mm² takes the colour it shares the longest border with. The patches are found on the colours as they were before.
 */
function fillGaps(mesh: WorkMesh, limit: number) {
  const count = mesh.faces.length / 3;
  const p = mesh.positions;
  const neighbours = faceNeighbours(mesh);
  const area = new Float64Array(count);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const triangle = new THREE.Triangle(a, b, c);
  for (let face = 0; face < count; face += 1) {
    const [i, j, k] = [mesh.faces[face * 3] * 3, mesh.faces[face * 3 + 1] * 3, mesh.faces[face * 3 + 2] * 3];
    a.set(p[i], p[i + 1], p[i + 2]);
    b.set(p[j], p[j + 1], p[j + 2]);
    c.set(p[k], p[k + 1], p[k + 2]);
    area[face] = triangle.getArea();
  }
  const patch = new Int32Array(count).fill(-1);
  const before = mesh.colors.slice();
  let changed = 0;
  for (let seed = 0; seed < count; seed += 1) {
    if (patch[seed] >= 0) continue;
    const members = [seed];
    patch[seed] = seed;
    let size = 0;
    const border = new Map<string | null, number>();
    for (let at = 0; at < members.length; at += 1) {
      const face = members[at];
      size += area[face];
      for (let corner = 0; corner < 3; corner += 1) {
        const next = neighbours[face * 3 + corner];
        if (next < 0) continue;
        if (before[next] === before[face]) {
          if (patch[next] < 0) {
            patch[next] = seed;
            members.push(next);
          }
          continue;
        }
        const from = mesh.faces[face * 3 + corner] * 3;
        const to = mesh.faces[face * 3 + ((corner + 1) % 3)] * 3;
        const length = Math.hypot(p[to] - p[from], p[to + 1] - p[from + 1], p[to + 2] - p[from + 2]);
        border.set(before[next], (border.get(before[next]) ?? 0) + length);
      }
    }
    if (size >= limit || !border.size) continue;
    const [colour] = [...border.entries()].sort((left, right) => right[1] - left[1])[0];
    members.forEach((face) => {
      mesh.colors[face] = colour;
    });
    changed += members.length;
  }
  return changed;
}

/** Whether a point in the stroke's frame lies within a brush line: no further from it than half its width there. */
function nearBrush(stroke: PaintStroke, point: THREE.Vector3) {
  const path = stroke.path ?? [];
  const from = new THREE.Vector3();
  const to = new THREE.Vector3();
  const closest = new THREE.Vector3();
  const segment = new THREE.Line3();
  for (let index = 0; index < path.length; index += 1) {
    from.set(...path[index]);
    if (index + 1 >= path.length) {
      if (from.distanceTo(point) <= brushDiameter(stroke, index) / 2) return true;
      continue;
    }
    to.set(...path[index + 1]);
    segment.set(from, to);
    const t = segment.closestPointToPointParameter(point, true);
    segment.at(t, closest);
    const radius = (brushDiameter(stroke, index) * (1 - t) + brushDiameter(stroke, index + 1) * t) / 2;
    if (closest.distanceTo(point) <= radius) return true;
  }
  return false;
}

/** A lasso's volume in the stroke's frame: the shape drawn, drawn out along the line of sight over the body's depth. */
function lassoVolume(runtime: ManifoldToplevel, stroke: PaintStroke, frameBox: THREE.Box3, made: Array<{ delete(): void }>) {
  const origin = new THREE.Vector3(...stroke.origin!);
  const right = new THREE.Vector3(...stroke.right!);
  const up = new THREE.Vector3(...stroke.up!);
  const forward = new THREE.Vector3(...stroke.forward!);
  let near = Number.POSITIVE_INFINITY;
  let far = Number.NEGATIVE_INFINITY;
  const corner = new THREE.Vector3();
  for (let index = 0; index < 8; index += 1) {
    corner.set(index & 1 ? frameBox.max.x : frameBox.min.x, index & 2 ? frameBox.max.y : frameBox.min.y, index & 4 ? frameBox.max.z : frameBox.min.z);
    const depth = corner.sub(origin).dot(forward);
    near = Math.min(near, depth);
    far = Math.max(far, depth);
  }
  near -= 1;
  far += 1;
  if (stroke.perspective) {
    // The eye stands in front of the body or in it: what lies behind it was not seen.
    if (far <= 0) return null;
    near = Math.max(near, far * 1e-3);
  }
  const section = new runtime.CrossSection([stroke.outline!.map(([x, y]) => [x, y] as [number, number])], "NonZero");
  made.push(section);
  if (section.area() <= 1e-12) return null;
  let solid: Manifold;
  if (stroke.perspective) {
    // From the eye, the shape grows with the distance: at `near` it is `near` times as large as on the plane at 1.
    const scaled: CrossSection = section.scale(near);
    made.push(scaled);
    solid = scaled.extrude(far - near, 0, 0, [far / near, far / near]);
  } else {
    solid = section.extrude(far - near);
  }
  made.push(solid);
  const frame = new THREE.Matrix4().makeBasis(right, up, forward).setPosition(origin.clone().addScaledVector(forward, near));
  return { solid, frame };
}

/** Whether a point in the stroke's frame lies in the lasso's shape as seen from its eye (winding count, as the kernel fills it). */
function insideLasso(stroke: PaintStroke, point: THREE.Vector3) {
  const relative = point.clone().sub(new THREE.Vector3(...stroke.origin!));
  const depth = relative.dot(new THREE.Vector3(...stroke.forward!));
  if (stroke.perspective && depth <= 1e-9) return false;
  const scale = stroke.perspective ? 1 / depth : 1;
  const x = relative.dot(new THREE.Vector3(...stroke.right!)) * scale;
  const y = relative.dot(new THREE.Vector3(...stroke.up!)) * scale;
  const outline = stroke.outline!;
  let winding = 0;
  for (let index = 0; index < outline.length; index += 1) {
    const [x1, y1] = outline[index];
    const [x2, y2] = outline[(index + 1) % outline.length];
    if (y1 <= y) {
      if (y2 > y && (x2 - x1) * (y - y1) - (x - x1) * (y2 - y1) > 0) winding += 1;
    } else if (y2 <= y && (x2 - x1) * (y - y1) - (x - x1) * (y2 - y1) < 0) {
      winding -= 1;
    }
  }
  return winding !== 0;
}

/**
 * The mesh cut by a stroke's volume, as the top of the file tells: the faces of both halves that come
 * from the body, put together again, each with the colour of the face it came from, and which of them
 * lie inside the volume. Null when the kernel cannot take the mesh, the volume misses it, or the halves
 * do not close up again.
 */
function cutAlong(runtime: ManifoldToplevel, mesh: WorkMesh, volume: Manifold): { mesh: WorkMesh; inside: Uint8Array } | null {
  const count = mesh.faces.length / 3;
  const made: Array<{ delete(): void }> = [];
  try {
    const id = runtime.Manifold.reserveIDs(1);
    const faceID = new Uint32Array(count);
    for (let face = 0; face < count; face += 1) faceID[face] = face;
    const source = new runtime.Mesh({
      numProp: 3,
      vertProperties: Float32Array.from(mesh.positions),
      triVerts: Uint32Array.from(mesh.faces),
      faceID,
      runOriginalID: Uint32Array.of(id),
      runIndex: Uint32Array.of(0, count * 3),
    });
    const body = new runtime.Manifold(source);
    made.push(body);
    if (body.status() !== "NoError" || body.numTri() === 0) return null;
    const halves = body.split(volume);
    made.push(...halves);
    const positions: number[] = [];
    const faces: number[] = [];
    const from: number[] = [];
    const side: number[] = [];
    halves.forEach((half, halfIndex) => {
      const out = half.getMesh();
      const offset = positions.length / 3;
      for (let index = 0; index < out.numVert; index += 1) {
        positions.push(out.vertProperties[index * out.numProp], out.vertProperties[index * out.numProp + 1], out.vertProperties[index * out.numProp + 2]);
      }
      for (let run = 0; run < out.runOriginalID.length; run += 1) {
        if (out.runOriginalID[run] !== id) continue;
        for (let face = out.runIndex[run] / 3; face < out.runIndex[run + 1] / 3; face += 1) {
          faces.push(out.triVerts[face * 3] + offset, out.triVerts[face * 3 + 1] + offset, out.triVerts[face * 3 + 2] + offset);
          from.push(out.faceID[face]);
          side.push(halfIndex === 0 ? 1 : 0);
        }
      }
    });
    if (!side.some(Boolean)) return null;
    const closed = closeSeams(positions, faces);
    if (!closed.closed) return null;
    const inside = new Uint8Array(closed.source.length);
    closed.source.forEach((face, index) => {
      inside[index] = side[face];
    });
    return {
      mesh: { positions: closed.positions, faces: closed.faces, colors: closed.source.map((face) => mesh.colors[from[face]] ?? null) },
      inside,
    };
  } catch {
    return null;
  } finally {
    made.forEach((entry) => {
      try {
        entry.delete();
      } catch {
        // Already let go.
      }
    });
  }
}

/** The faces a lasso's eye saw: turned towards it, with nothing of the body between them and it. */
function seenFaces(mesh: WorkMesh, normals: Float64Array, candidates: Uint8Array, eye: THREE.Vector3 | null, look: THREE.Vector3) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(mesh.positions, 3));
  geometry.setIndex(mesh.faces);
  const bvh = new MeshBVH(geometry);
  const size = bounds(mesh).getSize(new THREE.Vector3()).length();
  const lift = Math.max(1e-4, size * 1e-5);
  const middle = new THREE.Vector3();
  const towards = new THREE.Vector3();
  const ray = new THREE.Ray();
  const seen = new Uint8Array(candidates.length);
  for (let face = 0; face < candidates.length; face += 1) {
    if (!candidates[face]) continue;
    centroid(mesh, face, middle);
    if (eye) towards.subVectors(eye, middle);
    else towards.copy(look).negate();
    const distance = eye ? towards.length() : Number.POSITIVE_INFINITY;
    towards.normalize();
    const facing = normals[face * 3] * towards.x + normals[face * 3 + 1] * towards.y + normals[face * 3 + 2] * towards.z;
    if (facing <= 1e-6) continue;
    ray.origin.copy(middle).addScaledVector(towards, lift);
    ray.direction.copy(towards);
    const hit = bvh.raycastFirst(ray, THREE.DoubleSide, 0, distance);
    if (!hit) seen[face] = 1;
  }
  geometry.dispose();
  return seen;
}

/**
 * The faces a brush line paints, of those inside its volume: reached from the faces under its points without
 * going over one turned away by more than PAINT_CIRCLE_TURN from the normal of the line's point nearest to it.
 * Null when none of its points lies on the body.
 */
function brushRegion(mesh: WorkMesh, normals: Float64Array, inside: Uint8Array, stroke: PaintStroke, stretch: THREE.Vector3, reach: number) {
  const points = (stroke.path ?? []).map((entry) => new THREE.Vector3(...entry).multiply(stretch));
  const pointNormals = (stroke.normals ?? []).map((entry) => new THREE.Vector3(...entry).divide(stretch).normalize());
  if (!points.length) return null;
  // A face counts when its middle lies within the line's half width, with some room: the surface bends away under a patch.
  const grow = (stretch.x + stretch.y + stretch.z) / 3;
  const radii = points.map((_, index) => (brushDiameter(stroke, index) / 2) * grow * PAINT_BRUSH_REACH + 0.05);
  const segment = new THREE.Line3();
  const closest = new THREE.Vector3();
  const nearLine = (point: THREE.Vector3, share = 1) => {
    if (points.length === 1) return point.distanceTo(points[0]) <= radii[0] * share;
    for (let index = 0; index + 1 < points.length; index += 1) {
      segment.set(points[index], points[index + 1]);
      const t = segment.closestPointToPointParameter(point, true);
      if (segment.at(t, closest).distanceTo(point) <= (radii[index] * (1 - t) + radii[index + 1] * t) * share) return true;
    }
    return false;
  };
  // A long thin face of the cut that runs away from the line round a bend has a corner far from it.
  const corner = new THREE.Vector3();
  const cornersNear = (face: number) => {
    for (let at = 0; at < 3; at += 1) {
      const index = mesh.faces[face * 3 + at] * 3;
      if (!nearLine(corner.set(mesh.positions[index], mesh.positions[index + 1], mesh.positions[index + 2]), PAINT_BRUSH_CORNER_REACH)) return false;
    }
    return true;
  };
  const limit = Math.cos(THREE.MathUtils.degToRad(PAINT_CIRCLE_TURN));
  const middle = new THREE.Vector3();
  const facing = new Int8Array(inside.length);
  const faces = (face: number) => {
    if (facing[face]) return facing[face] > 0;
    centroid(mesh, face, middle);
    let nearest = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;
    points.forEach((point, index) => {
      const distance = point.distanceToSquared(middle);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = index;
      }
    });
    const normal = pointNormals[nearest];
    const ok = normals[face * 3] * normal.x + normals[face * 3 + 1] * normal.y + normals[face * 3 + 2] * normal.z >= limit && nearLine(middle) && cornersNear(face);
    facing[face] = ok ? 1 : -1;
    return ok;
  };
  const neighbours = faceNeighbours(mesh);
  const region = new Uint8Array(inside.length);
  const step = Math.max(1, Math.ceil(points.length / PAINT_BRUSH_SEEDS));
  const seeds = points.map((_, index) => index).filter((index) => index % step === 0 || index === points.length - 1);
  let found = false;
  for (const index of seeds) {
    const seed = seedFace(mesh, normals, points[index], pointNormals[index], reach, inside);
    if (seed < 0 || region[seed]) continue;
    const reached = spread(mesh, neighbours, seed, (_, to) => inside[to] === 1 && faces(to));
    for (let face = 0; face < reached.length; face += 1) if (reached[face]) region[face] = 1;
    found = true;
  }
  return found ? region : null;
}

/**
 * A mesh with its strokes laid on, in the frame the mesh is in (the body's own, at its size now, `size`).
 * `runtime` is the geometry kernel; without it (null) the circles and lassos colour whole faces.
 */
export function paintMeshWithStrokes(runtime: ManifoldToplevel | null, source: MeshData, strokes: readonly PaintStroke[], size: PaintVec3, startColors?: readonly (string | null)[]): PaintedMesh {
  // The corners shared as far as they are the same: an import comes with three of its own to each face.
  const flat: number[] = [];
  source.vertices.forEach(([x, y, z]) => flat.push(x, y, z));
  const sourceFaces: number[] = [];
  source.faces.forEach(([a, b, c]) => sourceFaces.push(a, b, c));
  const shared = closeSeams(flat, sourceFaces, 1e-6);
  // A mesh painted already (its colours given) keeps them: its faces as closeSeams left them, each with its face's colour.
  const colors = startColors && startColors.length === source.faces.length
    ? shared.source.map((face) => startColors[face] ?? null)
    : shared.faces.length ? new Array(shared.faces.length / 3).fill(null) : [];
  let mesh: WorkMesh = { positions: shared.positions, faces: shared.faces, colors };
  const canCut = Boolean(runtime) && shared.closed && mesh.faces.length / 3 <= PAINT_CUT_TRIANGLE_LIMIT;
  let cut = canCut;
  let skipped = 0;
  const reachFor = (box: THREE.Box3) => PAINT_SEED_REACH + PAINT_SEED_SHARE * box.getSize(new THREE.Vector3()).length();
  for (const stroke of strokes) {
    const faceCount = mesh.faces.length / 3;
    if (faceCount === 0) break;
    const stretch = new THREE.Vector3(size[0] / stroke.size[0], size[1] / stroke.size[1], size[2] / stroke.size[2]);
    const color = stroke.color ?? null;
    const box = bounds(mesh);
    let region: Uint8Array | null = null;
    if (stroke.mode === "gaps") {
      fillGaps(mesh, stroke.area ?? 0);
      continue;
    }
    if (stroke.mode === "fill") {
      const normals = faceNormals(mesh);
      const point = new THREE.Vector3(...stroke.point!).multiply(stretch);
      const normal = new THREE.Vector3(...stroke.normal!).divide(stretch).normalize();
      const seed = seedFace(mesh, normals, point, normal, reachFor(box));
      if (seed >= 0) {
        const limit = Math.cos(THREE.MathUtils.degToRad(stroke.angle ?? 30)) - 1e-9;
        const neighbours = faceNeighbours(mesh);
        region = spread(mesh, neighbours, seed, (from, to) => {
          const dot = normals[from * 3] * normals[to * 3] + normals[from * 3 + 1] * normals[to * 3 + 1] + normals[from * 3 + 2] * normals[to * 3 + 2];
          // A face that shrank to nothing has no normal and does not stop the fill.
          return dot >= limit || (normals[from * 3] === 0 && normals[from * 3 + 1] === 0 && normals[from * 3 + 2] === 0)
            || (normals[to * 3] === 0 && normals[to * 3 + 1] === 0 && normals[to * 3 + 2] === 0);
        });
      }
    } else {
      // The stroke's volume, in its own frame, stretched with the body onto the mesh.
      const frameBox = strokeFrameBounds(mesh, stretch);
      const stretchMatrix = new THREE.Matrix4().makeScale(stretch.x, stretch.y, stretch.z);
      let inside: Uint8Array | null = null;
      if (canCut && runtime) {
        const made: Array<{ delete(): void }> = [];
        try {
          const volume = stroke.mode === "circle"
            ? (stroke.ball ? ballVolume(runtime, stroke, made) : circleVolume(runtime, stroke, frameBox, made))
            : stroke.mode === "brush"
              ? (stroke.ball ? ballLineVolume(runtime, stroke, made) : brushVolume(runtime, stroke, made))
              : stroke.mode === "height"
                ? bandVolume(runtime, stroke, frameBox, made)
                : lassoVolume(runtime, stroke, frameBox, made);
          if (volume) {
            const placed = volume.solid.transform(kernelMatrix(stretchMatrix.clone().multiply(volume.frame)));
            made.push(placed);
            const result = cutAlong(runtime, mesh, placed);
            if (result) {
              mesh = result.mesh;
              inside = result.inside;
            }
          }
        } catch {
          inside = null;
        } finally {
          made.forEach((entry) => {
            try {
              entry.delete();
            } catch {
              // Already let go.
            }
          });
        }
        if (!inside) cut = false;
      }
      if (!inside) {
        // Whole faces, by their middles, in the stroke's own frame.
        inside = new Uint8Array(mesh.faces.length / 3);
        const middle = new THREE.Vector3();
        const centre = stroke.point ? new THREE.Vector3(...stroke.point) : null;
        const axis = stroke.normal ? new THREE.Vector3(...stroke.normal).normalize() : null;
        const radius = (stroke.diameter ?? 0) / 2;
        for (let face = 0; face < inside.length; face += 1) {
          centroid(mesh, face, middle).divide(stretch);
          if (stroke.mode === "circle" && stroke.ball) {
            inside[face] = middle.distanceTo(centre!) <= radius ? 1 : 0;
          } else if (stroke.mode === "height") {
            inside[face] = Math.abs(middle.clone().sub(centre!).dot(axis!)) <= (stroke.band ?? 0) / 2 ? 1 : 0;
          } else if (stroke.mode === "circle") {
            const offset = middle.sub(centre!);
            inside[face] = offset.clone().addScaledVector(axis!, -offset.dot(axis!)).length() <= radius ? 1 : 0;
          } else if (stroke.mode === "brush") {
            inside[face] = nearBrush(stroke, middle) ? 1 : 0;
          } else {
            inside[face] = insideLasso(stroke, middle) ? 1 : 0;
          }
        }
      }
      const normals = faceNormals(mesh);
      if (stroke.ball || stroke.mode === "height") {
        // A ball or a band paints all of the surface inside it, round edges and on the back too.
        region = inside.some(Boolean) ? inside : null;
      } else if (stroke.mode === "circle") {
        const point = new THREE.Vector3(...stroke.point!).multiply(stretch);
        const normal = new THREE.Vector3(...stroke.normal!).divide(stretch).normalize();
        const seed = seedFace(mesh, normals, point, normal, reachFor(box), inside);
        if (seed >= 0) {
          const limit = Math.cos(THREE.MathUtils.degToRad(PAINT_CIRCLE_TURN));
          const facing = (face: number) => normals[face * 3] * normal.x + normals[face * 3 + 1] * normal.y + normals[face * 3 + 2] * normal.z >= limit;
          region = spread(mesh, faceNeighbours(mesh), seed, (_, to) => inside![to] === 1 && facing(to));
        }
      } else if (stroke.mode === "brush") {
        region = brushRegion(mesh, normals, inside, stroke, stretch, reachFor(box));
      } else {
        const eye = stroke.perspective ? new THREE.Vector3(...stroke.origin!).multiply(stretch) : null;
        const look = new THREE.Vector3(...stroke.forward!).multiply(stretch).normalize();
        region = seenFaces(mesh, normals, inside, eye, look);
        if (!region.some(Boolean)) region = null;
      }
    }
    if (!region) {
      skipped += 1;
      continue;
    }
    for (let face = 0; face < region.length; face += 1) if (region[face]) mesh.colors[face] = color;
  }
  const vertices: Vec3[] = [];
  for (let index = 0; index < mesh.positions.length; index += 3) vertices.push([mesh.positions[index], mesh.positions[index + 1], mesh.positions[index + 2]]);
  const faces: [number, number, number][] = [];
  for (let index = 0; index < mesh.faces.length; index += 3) faces.push([mesh.faces[index], mesh.faces[index + 1], mesh.faces[index + 2]]);
  return { vertices, faces, colors: mesh.colors, skipped, cut: cut && strokes.some((stroke) => stroke.mode !== "fill" && stroke.mode !== "gaps"), cutOk: cut || !strokes.some((stroke) => stroke.mode !== "fill" && stroke.mode !== "gaps") };
}

const MAX_PAINTED_MESHES = 16;
const paintedMeshCache: Array<{ shape: WorkplaneShape; revision: number; painted: PaintedMesh }> = [];

/**
 * A painted body's mesh in its own frame, with its paint (null for a body without paint, or one that
 * cannot carry any). The last few are kept, found again by everything but where the body stands, so
 * moving or turning it does not lay the strokes again. Until the kernel is there the strokes colour
 * whole faces, and the kernel is asked for; the 3D view draws the body again when it comes.
 */
export function paintedBodyMesh(shape: WorkplaneShape): PaintedMesh | null {
  if (!shape.paint?.length || !canPaintShape(shape)) return null;
  const runtime = loadedManifoldRuntime();
  if (!runtime) {
    try {
      requestManifoldRuntime();
    } catch {
      // The strokes colour whole faces.
    }
  }
  const revision = manifoldRevision();
  const index = paintedMeshCache.findIndex((entry) => entry.revision === revision && entry.shape.paint === shape.paint && sameShapeApartFromPlacement(entry.shape, shape));
  if (index >= 0) {
    const [entry] = paintedMeshCache.splice(index, 1);
    paintedMeshCache.push(entry);
    return entry.painted;
  }
  // A stroke added to strokes laid already (the paint tool adds one at a time): only the new ones are laid, onto the mesh
  // as those left it, instead of every stroke again - on a large body each takes a cut of the whole mesh.
  const strokes = shape.paint;
  const unpainted = { ...shape, paint: undefined };
  let earlier: { painted: PaintedMesh; count: number } | null = null;
  for (const entry of paintedMeshCache) {
    const kept = entry.shape.paint ?? [];
    if (entry.revision !== revision || kept.length >= strokes.length || (earlier && kept.length <= earlier.count)) continue;
    if (!kept.every((stroke, at) => stroke === strokes[at])) continue;
    if (!sameShapeApartFromPlacement({ ...entry.shape, paint: undefined }, unpainted)) continue;
    earlier = { painted: entry.painted, count: kept.length };
  }
  let painted: PaintedMesh;
  if (earlier) {
    const added = paintMeshWithStrokes(runtime, { name: shape.name, vertices: earlier.painted.vertices, faces: earlier.painted.faces }, strokes.slice(earlier.count), size3(shape), earlier.painted.colors);
    const cutOk = (earlier.painted.cutOk ?? earlier.painted.cut) && (added.cutOk ?? added.cut);
    painted = {
      ...added,
      skipped: earlier.painted.skipped + added.skipped,
      cutOk,
      cut: cutOk && strokes.some((stroke) => stroke.mode !== "fill" && stroke.mode !== "gaps"),
    };
  } else {
    painted = paintMeshWithStrokes(runtime, paintBaseMesh(shape), strokes, size3(shape));
  }
  paintedMeshCache.push({ shape: { ...shape }, revision, painted });
  while (paintedMeshCache.length > MAX_PAINTED_MESHES) paintedMeshCache.shift();
  return painted;
}

/** For tests: forget the painted meshes kept. */
export function clearPaintedMeshCache() {
  paintedMeshCache.length = 0;
}

/** The export meshes paintedWorldMesh made, with the colours of their faces, while they are in use. */
const paintedExportColors = new WeakMap<MeshData, string[]>();

/**
 * A painted body as it is exported: its mesh in the world, cut along its strokes, and the colour of every
 * face, its own where no paint lies (for the 3MF's painted faces, threemfExport.ts).
 */
export function paintedWorldMesh(shape: WorkplaneShape): { mesh: MeshData; faceColors: string[] } | null {
  const painted = paintedBodyMesh(shape);
  if (!painted || !painted.colors.some(Boolean)) return null;
  const matrix = paintBodyMatrix(shape);
  const point = new THREE.Vector3();
  const flipped = mirroredAxisCount(shape) % 2 === 1;
  const mesh: MeshData = {
    name: shape.name.replace(/[^a-z0-9_-]+/gi, "_") || "shape",
    vertices: painted.vertices.map(([x, y, z]) => point.set(x, y, z).applyMatrix4(matrix).toArray() as Vec3),
    faces: painted.faces.map(([a, b, c]) => (flipped ? [a, c, b] : [a, b, c]) as [number, number, number]),
  };
  const faceColors = painted.colors.map((color) => color ?? shape.color);
  paintedExportColors.set(mesh, faceColors);
  return { mesh, faceColors };
}

/** Faces this close to a painted face (mm) and turned the same way take its colour when a cut or a join made the mesh anew. */
const PAINT_TRANSFER_REACH = 0.02;

/**
 * The colour of every face of an exported body that came from a painted one, or null when it did not.
 * The mesh paintedWorldMesh made has its colours; one that a hole cut from it or a join with a body of the
 * same colour made anew finds each face's colour on the painted mesh: the painted face nearest to its
 * middle, if the face lies on it, else the body's own colour.
 */
export function paintedExportFaceColors(mesh: MeshData, shape: WorkplaneShape | undefined): string[] | null {
  const own = paintedExportColors.get(mesh);
  if (own && own.length === mesh.faces.length) return own;
  if (!shape) return null;
  const painted = paintedWorldMesh(shape);
  if (!painted) return null;
  const positions = new Float32Array(painted.mesh.vertices.length * 3);
  painted.mesh.vertices.forEach(([x, y, z], index) => positions.set([x, y, z], index * 3));
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(painted.mesh.faces.flat());
  // Indirect, so the tree leaves the faces in their order and a hit's face is the painted mesh's own.
  const bvh = new MeshBVH(geometry, { indirect: true });
  const triangle = new THREE.Triangle();
  const normal = new THREE.Vector3();
  const middle = new THREE.Vector3();
  const other = new THREE.Triangle();
  const otherNormal = new THREE.Vector3();
  // Corners reused for every face (Triangle.set copies them): a large painted body made three new vectors per face twice over.
  const cornerA = new THREE.Vector3();
  const cornerB = new THREE.Vector3();
  const cornerC = new THREE.Vector3();
  const colors = mesh.faces.map(([a, b, c]) => {
    triangle.set(cornerA.fromArray(mesh.vertices[a]), cornerB.fromArray(mesh.vertices[b]), cornerC.fromArray(mesh.vertices[c]));
    triangle.getMidpoint(middle);
    triangle.getNormal(normal);
    const hit = bvh.closestPointToPoint(middle, undefined, 0, PAINT_TRANSFER_REACH);
    if (!hit || hit.faceIndex === undefined) return shape.color;
    const [i, j, k] = painted.mesh.faces[hit.faceIndex];
    other.set(cornerA.fromArray(painted.mesh.vertices[i]), cornerB.fromArray(painted.mesh.vertices[j]), cornerC.fromArray(painted.mesh.vertices[k])).getNormal(otherNormal);
    return otherNormal.dot(normal) > 0.9 ? painted.faceColors[hit.faceIndex] : shape.color;
  });
  geometry.dispose();
  return colors;
}
