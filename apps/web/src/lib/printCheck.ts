import * as THREE from "three";
import { MeshBVH } from "three-mesh-bvh";
import { BREAKAWAY_FOOT_MM, standsOnBreakawayBase } from "@/lib/breakawayBase";
import { clearanceBoxesNear, clearancePartName, clearanceSourceShapes, closestPointGeometry, separateParts, type ClearanceBox, type ClearanceVec3 } from "@/lib/clearanceCheck";
import { disposeManifold, shapeToManifoldSolid } from "@/lib/editorBooleans";
import { getManifoldRuntime, meshForShape } from "@/lib/editorMeshCore";
import { weldOnGrid } from "@/lib/gridWeld";
import { t } from "@/lib/i18n";
import type { ManifoldSolid } from "@/lib/manifoldSplit";
import { overhangFigures, type OverhangFigures } from "@/lib/overhangFigures";
import { DEFAULT_OVERHANG_ANGLE, normalizeOverhangAngle, OVERHANG_PLATE_TOLERANCE } from "@/lib/overhangLimits";
import { displayShapeName } from "@/lib/shapeCatalog";
import { surfaceMeshReport } from "@/lib/surfaceTextureMesh";
import { isSupportRib } from "@/lib/supportRibMark";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * The print check (Druck prüfen): what would go wrong if the bodies were printed as they stand. Five checks, each one a
 * line of the panel and a part of the MCP tool's answer:
 *
 * - thin walls: places thinner than two lines of the nozzle, which the slicer leaves out or prints as one weak line;
 * - floating parts: pieces that touch neither the plate nor another piece, and would be printed in the air;
 * - small contact: pieces that stand on very little of the plate for their height, and can come loose;
 * - overhangs: the figures of "Show overhangs" (lib/overhangFigures.ts), not worked out a second time;
 * - open meshes: imported meshes with edges that one triangle uses, or three and more.
 *
 * It only reads: nothing in the design changes. Everything is measured on the triangle meshes the slicer would get, in
 * the scene's frame (mm, y up: the height the user sees as Z), with the plate at y = 0. Overlapping bodies are joined
 * first, as the slicer joins them, so a plate sunk into a thicker body is not a thin wall, and two boxes stacked on
 * each other are one piece standing on the plate.
 */

export const PRINT_CHECK_DEFAULT_NOZZLE_MM = 0.4;
export const PRINT_CHECK_NOZZLE_LIMITS: [number, number] = [0.1, 2];
/** The nozzles most printers come with or take; any other is typed in. */
export const PRINT_CHECK_NOZZLES = [0.2, 0.4, 0.6, 0.8] as const;
/** A body this close above the plate stands on it, as the overhang hatching counts it; the same for two pieces. */
export const PRINT_CHECK_TOUCH_MM = OVERHANG_PLATE_TOLERANCE;
/**
 * Where the footprint is measured (mm above the plate): the middle of a first layer of 0.2 mm, the cross-section that
 * holds the print on the plate. A sphere touches the plate in a point, but its first layer is a small disc.
 */
export const PRINT_CHECK_FOOTPRINT_HEIGHT_MM = 0.1;
/**
 * Below this much footprint for each millimetre of height (mm² per mm) a piece may come loose: the nozzle pushes at
 * its top, and the little it stands on lets go. A sphere stays at about 0.3 whatever its size (its first layer grows
 * with the radius as the height does), the tip of a cone at 0, a pin of 4 mm across and 40 mm tall at 0.3; a cube of
 * 10 mm has 10, a cylinder of 6 mm across and 40 mm tall 0.7.
 */
export const PRINT_CHECK_CONTACT_MM2_PER_MM = 0.5;
/** Thin places smaller than this (mm² of surface) are left out: a sliver a cut leaves, the tip of a fine point. */
export const PRINT_CHECK_MIN_THIN_AREA_MM2 = 1;
/**
 * A wall has a face on the other side that runs nearly parallel: within this angle (degrees). Across a sharp edge the
 * ray meets the other face of the edge at a slant, and a wedge's or a cone's tip is no wall that drops out.
 */
export const PRINT_CHECK_WALL_PARALLEL_DEGREES = 30;
/** About this many rays are cast at the most: large faces are cut into fewer, larger pieces then. */
export const PRINT_CHECK_RAY_BUDGET = 400_000;
/** Above this many triangles the walls are not measured: building their tree and a ray each would take too long. */
export const PRINT_CHECK_WALL_TRIANGLE_LIMIT = 2_000_000;
/** A large face is cut into at most this many pieces along each side, so one face takes no more than 4,096 rays. */
const MAX_SPLIT = 64;
/** The ray starts this far inside the surface (mm), and a face it meets within this much more is the same place. */
const RAY_OFFSET = 1e-3;
const WALL_PARALLEL_COS = Math.cos((PRINT_CHECK_WALL_PARALLEL_DEGREES * Math.PI) / 180);

export type PrintCheckOptions = {
  /** The nozzle's width (mm); a wall needs two lines of it. */
  nozzle: number;
  /** The overhang limit of "Show overhangs" (degrees from the vertical). */
  overhangAngle: number;
};

/** A wall needs at least two lines of the nozzle (0.8 mm with 0.4): thinner, the slicer drops it or prints one weak line. */
export function printCheckMinimumWall(nozzle: number) {
  return 2 * nozzle;
}

export function normalizePrintCheckOptions(given: Partial<PrintCheckOptions> = {}): PrintCheckOptions {
  const [min, max] = PRINT_CHECK_NOZZLE_LIMITS;
  const nozzle = typeof given.nozzle === "number" ? given.nozzle : Number(given.nozzle);
  return {
    nozzle: Number.isFinite(nozzle) ? Math.min(max, Math.max(min, nozzle)) : PRINT_CHECK_DEFAULT_NOZZLE_MM,
    overhangAngle: normalizeOverhangAngle(given.overhangAngle, DEFAULT_OVERHANG_ANGLE),
  };
}

/** One place thinner than the minimum wall: connected triangles of the surface, with where it is thinnest. */
export type ThinWallPlace = {
  /** The owner (an index into the `owners` given) of the triangle where the place is thinnest; -1 when none was given. */
  owner: number;
  areaMm2: number;
  thinnestMm: number;
  point: ClearanceVec3;
  box: ClearanceBox;
};

export type ThinWallMeasurement = {
  /** The thin places that are kept (at least the minimum area), thinnest first. */
  places: ThinWallPlace[];
  /** The kept places as triangles in the scene's frame (nine numbers each), to paint them. */
  positions: number[];
  rays: number;
};

/**
 * The pieces a triangle of `positions`/`indices` is cut into: `n` along each side, n² pieces of the same size. Each
 * comes with its corners; the order is the same every time, so a measurement and its painting agree.
 */
function forEachPiece(
  corners: Float64Array,
  n: number,
  visit: (index: number, a: THREE.Vector3Tuple, b: THREE.Vector3Tuple, c: THREE.Vector3Tuple) => void,
) {
  const [ax, ay, az, bx, by, bz, cx, cy, cz] = corners;
  const at = (i: number, j: number): THREE.Vector3Tuple => [
    ax + ((bx - ax) * i + (cx - ax) * j) / n,
    ay + ((by - ay) * i + (cy - ay) * j) / n,
    az + ((bz - az) * i + (cz - az) * j) / n,
  ];
  let index = 0;
  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j < n - i; j += 1) {
      visit(index++, at(i, j), at(i + 1, j), at(i, j + 1));
      if (j < n - i - 1) visit(index++, at(i + 1, j), at(i + 1, j + 1), at(i, j + 1));
    }
  }
}

/**
 * How thick the material is behind each place of a closed surface, and where it is thinner than `minimumWall`. From
 * the middle of each triangle, or of each piece of a large one, a ray goes into the material against the face's
 * normal, from just inside the surface (RAY_OFFSET); the face it leaves the material through is the far side of the
 * wall, if it runs nearly parallel (PRINT_CHECK_WALL_PARALLEL_DEGREES). A ray that meets a face from the front
 * started outside (a crack in the mesh) and says nothing. Neighbouring thin triangles make one place; places smaller
 * than `minArea` are dropped. The triangles are wound outwards, as Manifold gives them.
 */
export function measureThinWalls(
  positions: ArrayLike<number>,
  indices: ArrayLike<number>,
  minimumWall: number,
  options: { owners?: ArrayLike<number>; minArea?: number; rayBudget?: number; skipOwners?: ReadonlySet<number>; footOwners?: ReadonlySet<number> } = {},
): ThinWallMeasurement {
  const minArea = options.minArea ?? PRINT_CHECK_MIN_THIN_AREA_MM2;
  const budget = options.rayBudget ?? PRINT_CHECK_RAY_BUDGET;
  const triangles = Math.floor(indices.length / 3);
  const vertexCount = Math.floor(positions.length / 3);
  const empty: ThinWallMeasurement = { places: [], positions: [], rays: 0 };
  if (!triangles || !(minimumWall > 0)) return empty;

  const corners = new Float64Array(triangles * 9);
  const normals = new Float64Array(triangles * 3);
  const areas = new Float64Array(triangles);
  const longest = new Float64Array(triangles);
  for (let tri = 0; tri < triangles; tri += 1) {
    for (let k = 0; k < 3; k += 1) {
      const vertex = indices[tri * 3 + k];
      for (let axis = 0; axis < 3; axis += 1) corners[tri * 9 + k * 3 + axis] = positions[vertex * 3 + axis];
    }
    const [ax, ay, az, bx, by, bz, cx, cy, cz] = corners.subarray(tri * 9, tri * 9 + 9);
    const ux = bx - ax, uy = by - ay, uz = bz - az;
    const vx = cx - ax, vy = cy - ay, vz = cz - az;
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const length = Math.hypot(nx, ny, nz);
    if (length < 1e-12) continue;
    normals[tri * 3] = nx / length;
    normals[tri * 3 + 1] = ny / length;
    normals[tri * 3 + 2] = nz / length;
    areas[tri] = length / 2;
    longest[tri] = Math.max(Math.hypot(ux, uy, uz), Math.hypot(vx, vy, vz), Math.hypot(cx - bx, cy - by, cz - bz));
  }

  // Pieces about a wall across, fewer and larger when there would be more rays than the budget.
  const splits = new Uint8Array(triangles);
  // The lowest point of each owner on a breakaway base: its socket's floor, up to BREAKAWAY_FOOT_MM above that, is one
  // layer thick on purpose (#1633).
  const footTop = new Map<number, number>();
  if (options.footOwners?.size && options.owners) {
    for (let tri = 0; tri < triangles; tri += 1) {
      const owner = Number(options.owners[tri]);
      if (!options.footOwners.has(owner)) continue;
      const low = Math.min(corners[tri * 9 + 1], corners[tri * 9 + 4], corners[tri * 9 + 7]);
      footTop.set(owner, Math.min(footTop.get(owner) ?? Infinity, low));
    }
    footTop.forEach((low, owner) => footTop.set(owner, low + BREAKAWAY_FOOT_MM));
  }
  const inFoot = (tri: number) => {
    if (!footTop.size || !options.owners) return false;
    const top = footTop.get(Number(options.owners[tri]));
    return top !== undefined && Math.max(corners[tri * 9 + 1], corners[tri * 9 + 4], corners[tri * 9 + 7]) <= top;
  };
  // Triangles of an owner that is thin on purpose (a support rib) get no rays: they are never a thin place.
  const skipped = (tri: number) => Boolean(options.skipOwners?.size && options.owners && options.skipOwners.has(Number(options.owners[tri]))) || inFoot(tri);
  let target = minimumWall;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    let total = 0;
    for (let tri = 0; tri < triangles; tri += 1) {
      const n = areas[tri] > 0 && !skipped(tri) ? Math.min(MAX_SPLIT, Math.max(1, Math.ceil(longest[tri] / target))) : 0;
      splits[tri] = n;
      total += n * n;
    }
    if (total <= budget || total <= triangles) break;
    target *= Math.sqrt(total / budget) * 1.05;
  }
  const offsets = new Uint32Array(triangles + 1);
  for (let tri = 0; tri < triangles; tri += 1) offsets[tri + 1] = offsets[tri] + splits[tri] * splits[tri];

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(Float32Array.from(positions), 3));
  geometry.setIndex(new THREE.BufferAttribute(Uint32Array.from(indices), 1));
  const bvh = new MeshBVH(geometry);
  // The thickness behind each piece, 0 where it is no thin wall.
  const thickness = new Float32Array(offsets[triangles]);
  const thinCount = new Uint32Array(triangles);
  try {
    const ray = new THREE.Ray();
    for (let tri = 0; tri < triangles; tri += 1) {
      const n = splits[tri];
      if (!n) continue;
      const nx = normals[tri * 3], ny = normals[tri * 3 + 1], nz = normals[tri * 3 + 2];
      ray.direction.set(-nx, -ny, -nz);
      forEachPiece(corners.subarray(tri * 9, tri * 9 + 9), n, (index, a, b, c) => {
        ray.origin.set((a[0] + b[0] + c[0]) / 3 - nx * RAY_OFFSET, (a[1] + b[1] + c[1]) / 3 - ny * RAY_OFFSET, (a[2] + b[2] + c[2]) / 3 - nz * RAY_OFFSET);
        const hit = bvh.raycastFirst(ray, THREE.DoubleSide, RAY_OFFSET, minimumWall);
        if (!hit?.face || hit.faceIndex === tri) return;
        // The far face leaves the material (it faces along the ray) and runs nearly parallel to this one.
        if (hit.face.normal.dot(ray.direction) < WALL_PARALLEL_COS) return;
        const across = hit.distance + RAY_OFFSET;
        if (across >= minimumWall) return;
        thickness[offsets[tri] + index] = across;
        thinCount[tri] += 1;
      });
    }
  } finally {
    geometry.boundsTree = undefined;
    geometry.dispose();
  }

  // Thin triangles that share an edge are one place.
  const parent = new Int32Array(triangles).fill(-1);
  const find = (tri: number) => {
    let root = tri;
    while (parent[root] !== root) root = parent[root];
    while (parent[tri] !== root) {
      const next = parent[tri];
      parent[tri] = root;
      tri = next;
    }
    return root;
  };
  const byEdge = new Map<number, number>();
  for (let tri = 0; tri < triangles; tri += 1) {
    if (!thinCount[tri]) continue;
    parent[tri] = tri;
    for (let k = 0; k < 3; k += 1) {
      const a = indices[tri * 3 + k], b = indices[tri * 3 + ((k + 1) % 3)];
      const key = a < b ? a * vertexCount + b : b * vertexCount + a;
      const other = byEdge.get(key);
      if (other === undefined) byEdge.set(key, tri);
      else parent[find(other)] = find(tri);
    }
  }

  type Gathered = ThinWallPlace & { triangles: number[] };
  const gathered = new Map<number, Gathered>();
  for (let tri = 0; tri < triangles; tri += 1) {
    if (!thinCount[tri]) continue;
    const root = find(tri);
    let place = gathered.get(root);
    if (!place) {
      place = { owner: -1, areaMm2: 0, thinnestMm: Infinity, point: [0, 0, 0], box: { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] }, triangles: [] };
      gathered.set(root, place);
    }
    const found = place;
    found.triangles.push(tri);
    const n = splits[tri];
    const share = areas[tri] / (n * n);
    forEachPiece(corners.subarray(tri * 9, tri * 9 + 9), n, (index, a, b, c) => {
      const across = thickness[offsets[tri] + index];
      if (!across) return;
      found.areaMm2 += share;
      for (const corner of [a, b, c]) {
        for (let axis = 0; axis < 3; axis += 1) {
          found.box.min[axis] = Math.min(found.box.min[axis], corner[axis]);
          found.box.max[axis] = Math.max(found.box.max[axis], corner[axis]);
        }
      }
      if (across < found.thinnestMm) {
        found.thinnestMm = across;
        found.point = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];
        found.owner = options.owners ? Number(options.owners[tri]) : -1;
      }
    });
  }

  const kept = [...gathered.values()].filter((place) => place.areaMm2 >= minArea).sort((p, q) => p.thinnestMm - q.thinnestMm);
  const painted: number[] = [];
  for (const place of kept) {
    for (const tri of place.triangles) {
      const n = splits[tri];
      const triangleCorners = corners.subarray(tri * 9, tri * 9 + 9);
      // A triangle thin all over is painted whole; one thin in part, piece by piece.
      if (thinCount[tri] === n * n) {
        for (let k = 0; k < 9; k += 1) painted.push(triangleCorners[k]);
        continue;
      }
      forEachPiece(triangleCorners, n, (index, a, b, c) => {
        if (thickness[offsets[tri] + index]) painted.push(...a, ...b, ...c);
      });
    }
  }
  return {
    places: kept.map(({ triangles: _triangles, ...place }) => place),
    positions: painted,
    rays: offsets[triangles],
  };
}

/** A piece that prints: a separate part of the joined bodies, with the bodies it is made of. */
export type PrintCheckPiece = {
  /** The piece's key in this result: "piece-n". */
  key: string;
  /** The checked objects the piece is made of (a bundle's parts by their own ids). */
  ids: string[];
  name: string;
  box: ClearanceBox;
  triangles: number;
  /** Its underside lies within PRINT_CHECK_TOUCH_MM of the plate (or below it). */
  onPlate: boolean;
  /** It touches neither the plate nor a piece that stands on it, through any chain of pieces. */
  floating: boolean;
  /** From the plate (or its underside, if higher) to its top (mm). */
  heightMm: number;
  /** Its cross-section PRINT_CHECK_FOOTPRINT_HEIGHT_MM above the plate (mm²), for a piece on the plate; else null. */
  footprintMm2: number | null;
  /** On the plate with less than PRINT_CHECK_CONTACT_MM2_PER_MM of footprint for each millimetre of height. */
  smallContact: boolean;
};

export type PrintCheckThinPlace = {
  /** The object the place is thinnest on, and its name. */
  id: string;
  name: string;
  areaMm2: number;
  thinnestMm: number;
  point: ClearanceVec3;
  box: ClearanceBox;
};

/** An object whose mesh is not closed, with its box to show it. */
export type PrintCheckOpenMesh = { id: string; name: string; openEdges: number; nonManifoldEdges: number; box: ClearanceBox };

export type PrintCheckResult = {
  nozzleMm: number;
  minimumWallMm: number;
  pieces: PrintCheckPiece[];
  /** null: not measured, the joined bodies have more than PRINT_CHECK_WALL_TRIANGLE_LIMIT triangles (see wallTriangles). */
  thinWalls: { places: PrintCheckThinPlace[]; positions: number[]; rays: number } | null;
  wallTriangles: number;
  overhang: OverhangFigures;
  openMeshes: PrintCheckOpenMesh[];
  /** Objects that are no closed body the kernel can read: their walls and their standing are not checked. */
  unchecked: Array<{ id: string; name: string }>;
  /** Overlapping bodies were joined; false when the join failed and they were measured lying in each other. */
  joined: boolean;
};

/**
 * Edges that one triangle uses (the surface is open there) and edges that three or more share, for every checked
 * object that is a mesh: an import, or what a cut made of one. The editor's own shapes are closed. Counted as the
 * surface texture counts them (surfaceMeshReport), on corners joined where they lie within a ten-thousandth of a
 * millimetre, by number (weldOnGrid): text keys took close to a second for 200,000 triangles.
 */
export function printCheckOpenMeshes(shapes: readonly WorkplaneShape[]): PrintCheckOpenMesh[] {
  const found: PrintCheckOpenMesh[] = [];
  for (const shape of shapes) {
    if (!shape.importedMesh) continue;
    const mesh = meshForShape(shape);
    if (!mesh.faces.length) continue;
    const { ids, count } = weldOnGrid(mesh.vertices, 1e-4);
    const corners: number[] = [];
    for (const [a, b, c] of mesh.faces) {
      // A triangle folded onto a line has no edges of its own.
      if (ids[a] !== ids[b] && ids[b] !== ids[c] && ids[c] !== ids[a]) corners.push(ids[a], ids[b], ids[c]);
    }
    const report = surfaceMeshReport(Uint32Array.from(corners), count);
    if (!report.openEdges && !report.nonManifoldEdges) continue;
    const box: ClearanceBox = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
    for (const vertex of mesh.vertices) {
      for (let axis = 0; axis < 3; axis += 1) {
        box.min[axis] = Math.min(box.min[axis], vertex[axis]);
        box.max[axis] = Math.max(box.max[axis], vertex[axis]);
      }
    }
    found.push({ id: shape.id, name: displayShapeName(shape), openEdges: report.openEdges, nonManifoldEdges: report.nonManifoldEdges, box });
  }
  return found;
}

function boxOf(solid: ManifoldSolid): ClearanceBox {
  const box = solid.boundingBox();
  return { min: [box.min[0], box.min[1], box.min[2]], max: [box.max[0], box.max[1], box.max[2]] };
}

/** Which of `owners` each triangle of a joined body comes from: Manifold keeps the original of every run of triangles. */
function triangleOwners(mesh: { runIndex?: Uint32Array; runOriginalID?: Uint32Array; triVerts: Uint32Array }, owners: ReadonlyMap<number, number>) {
  const result = new Int32Array(mesh.triVerts.length / 3).fill(-1);
  const runs = mesh.runOriginalID ?? new Uint32Array();
  const starts = mesh.runIndex ?? new Uint32Array();
  for (let run = 0; run < runs.length; run += 1) {
    const owner = owners.get(runs[run]) ?? -1;
    const end = run + 1 < starts.length ? starts[run + 1] : mesh.triVerts.length;
    for (let corner = starts[run]; corner < end; corner += 3) result[corner / 3] = owner;
  }
  return result;
}

/** The cross-section of a solid at height `y` of the scene (mm²): turned so that the scene's y is the kernel's z. */
function sectionArea(solid: ManifoldSolid, y: number, created: ManifoldSolid[]) {
  const turned = solid.rotate([90, 0, 0]);
  created.push(turned);
  const section = turned.slice(y);
  try {
    return Math.max(0, section.area());
  } finally {
    section.delete();
  }
}

/** A piece that stands on so little of the plate for its height that it can come loose. */
export function printCheckSmallContact(footprintMm2: number, heightMm: number) {
  return heightMm > 0 && footprintMm2 / heightMm < PRINT_CHECK_CONTACT_MM2_PER_MM;
}

/**
 * Checks the bodies among `source` (the export's: visible, bundles as their parts, no holes, rulers or reference
 * images) for what would go wrong when printing. `partLabel` names a separate part of one object ("Part 2").
 */
export async function checkPrint(source: readonly WorkplaneShape[], given: Partial<PrintCheckOptions> = {}, partLabel: (n: number) => string = (n) => t("clearance.part", { number: n })): Promise<PrintCheckResult> {
  const options = normalizePrintCheckOptions(given);
  const shapes = clearanceSourceShapes(source);
  const result: PrintCheckResult = {
    nozzleMm: options.nozzle,
    minimumWallMm: printCheckMinimumWall(options.nozzle),
    pieces: [],
    thinWalls: { places: [], positions: [], rays: 0 },
    wallTriangles: 0,
    // A support rib's bridges are overhangs on purpose, a layer high across a small gap (Discussion #1385).
    overhang: overhangFigures(shapes.filter((shape) => !isSupportRib(shape)), options.overhangAngle),
    openMeshes: printCheckOpenMeshes(shapes),
    unchecked: [],
    joined: true,
  };
  if (!shapes.length) return result;
  const runtime = await getManifoldRuntime();
  const created: ManifoldSolid[] = [];
  const geometries: THREE.BufferGeometry[] = [];
  try {
    // Each body gets an original id of its own, so every triangle of the joined bodies tells whose it is.
    const solids: ManifoldSolid[] = [];
    const ownerOf = new Map<number, number>();
    const owners: WorkplaneShape[] = [];
    for (const shape of shapes) {
      const solid = shapeToManifoldSolid(runtime, shape, created);
      if (solid) created.push(solid);
      if (!solid || solid.status() !== "NoError" || solid.numTri() === 0) {
        result.unchecked.push({ id: shape.id, name: displayShapeName(shape) });
        continue;
      }
      const original = solid.asOriginal();
      created.push(original);
      ownerOf.set(original.originalID(), owners.length);
      owners.push(shape);
      solids.push(original);
    }
    if (!solids.length) return result;
    let whole = solids.length === 1 ? solids[0] : runtime.Manifold.union(solids);
    if (whole !== solids[0]) created.push(whole);
    if (whole.status() !== "NoError" || (solids.length > 1 && whole.numTri() === 0)) {
      whole = runtime.Manifold.compose(solids);
      created.push(whole);
      result.joined = false;
    }

    result.wallTriangles = whole.numTri();
    if (result.wallTriangles > PRINT_CHECK_WALL_TRIANGLE_LIMIT) {
      result.thinWalls = null;
    } else {
      const mesh = whole.getMesh();
      try {
        const positions = new Float32Array((mesh.vertProperties.length / mesh.numProp) * 3);
        for (let vertex = 0; vertex < positions.length / 3; vertex += 1) {
          for (let axis = 0; axis < 3; axis += 1) positions[vertex * 3 + axis] = mesh.vertProperties[vertex * mesh.numProp + axis];
        }
        // A support rib is two lines thick and its bridges one line wide, on purpose (Discussion #1385).
        const ribs = new Set(owners.flatMap((shape, index) => (isSupportRib(shape) ? [index] : [])));
        // A breakaway base's socket floor is one layer thick, on purpose (#1633).
        const onBase = new Set(owners.flatMap((shape, index) => (standsOnBreakawayBase(shape) ? [index] : [])));
        const measured = measureThinWalls(positions, mesh.triVerts, result.minimumWallMm, { owners: triangleOwners(mesh, ownerOf), skipOwners: ribs, footOwners: onBase });
        result.thinWalls = {
          places: measured.places.map((place) => {
            const shape = owners[place.owner];
            return { id: shape?.id ?? "", name: shape ? displayShapeName(shape) : "", areaMm2: place.areaMm2, thinnestMm: place.thinnestMm, point: place.point, box: place.box };
          }),
          positions: measured.positions,
          rays: measured.rays,
        };
      } finally {
        disposeManifold(mesh);
      }
    }

    // The pieces that print: the separate parts of the joined bodies, a cavity with the piece round it.
    const solidsOfPieces = separateParts(runtime, whole, created);
    const ownersOfPiece = solidsOfPieces.map((piece) => {
      const mesh = piece.getMesh();
      try {
        // A piece taken apart from the others keeps their runs, empty: only runs with triangles name an owner.
        const owned = new Set<number>();
        triangleOwners(mesh, ownerOf).forEach((owner) => {
          if (owner >= 0) owned.add(owner);
        });
        return [...owned].sort((p, q) => p - q);
      } finally {
        disposeManifold(mesh);
      }
    });
    // A body that falls apart into several pieces names them "Body · Part n".
    const piecesOfOwner = new Map<number, number>();
    ownersOfPiece.forEach((list) => {
      if (list.length === 1) piecesOfOwner.set(list[0], (piecesOfOwner.get(list[0]) ?? 0) + 1);
    });
    const counted = new Map<number, number>();
    const pieces: PrintCheckPiece[] = solidsOfPieces.map((piece, index) => {
      const list = ownersOfPiece[index];
      let name = list.map((owner) => displayShapeName(owners[owner])).join(" + ");
      if (list.length === 1 && (piecesOfOwner.get(list[0]) ?? 0) > 1) {
        const number = (counted.get(list[0]) ?? 0) + 1;
        counted.set(list[0], number);
        name = clearancePartName(name, number, partLabel);
      }
      const box = boxOf(piece);
      const onPlate = box.min[1] <= PRINT_CHECK_TOUCH_MM;
      const heightMm = Math.max(0, box.max[1] - Math.max(0, box.min[1]));
      const footprintMm2 = onPlate ? sectionArea(piece, PRINT_CHECK_FOOTPRINT_HEIGHT_MM, created) : null;
      return {
        key: `piece-${index + 1}`,
        ids: list.map((owner) => owners[owner].id),
        name,
        box,
        triangles: piece.numTri(),
        onPlate,
        floating: false,
        heightMm,
        footprintMm2,
        smallContact: footprintMm2 !== null && printCheckSmallContact(footprintMm2, heightMm),
      };
    });

    // A piece rests on another when the two come within PRINT_CHECK_TOUCH_MM; what rests on the plate, through any
    // chain of pieces, stands. Pairs of pieces that both stand on the plate need no measuring.
    const root = pieces.map((_, index) => index);
    const find = (index: number): number => (root[index] === index ? index : (root[index] = find(root[index])));
    const geometry = new Map<number, THREE.BufferGeometry>();
    const geometryOfPiece = (index: number) => {
      let built = geometry.get(index);
      if (!built) {
        built = closestPointGeometry(solidsOfPieces[index]);
        geometry.set(index, built);
        geometries.push(built);
      }
      return built;
    };
    const identity = new THREE.Matrix4();
    for (let i = 0; i < pieces.length; i += 1) {
      for (let j = i + 1; j < pieces.length; j += 1) {
        if ((pieces[i].onPlate && pieces[j].onPlate) || find(i) === find(j)) continue;
        if (!clearanceBoxesNear(pieces[i].box, pieces[j].box, PRINT_CHECK_TOUCH_MM)) continue;
        const hitA = { point: new THREE.Vector3(), distance: 0, faceIndex: 0 };
        const hitB = { point: new THREE.Vector3(), distance: 0, faceIndex: 0 };
        const bvh = geometryOfPiece(i).boundsTree as MeshBVH;
        if (bvh.closestPointToGeometry(geometryOfPiece(j), identity, hitA, hitB, 0, PRINT_CHECK_TOUCH_MM)) root[find(i)] = find(j);
      }
    }
    const standing = new Set(pieces.flatMap((piece, index) => (piece.onPlate ? [find(index)] : [])));
    pieces.forEach((piece, index) => {
      piece.floating = !standing.has(find(index));
    });
    result.pieces = pieces;
    return result;
  } finally {
    for (const built of geometries) {
      built.boundsTree = undefined;
      built.dispose();
    }
    for (const solid of new Set(created)) {
      try {
        disposeManifold(solid);
      } catch {
        // Freed already.
      }
    }
  }
}

/** The pieces the check warns about, in the order of the panel. */
export function printCheckFloating(result: PrintCheckResult) {
  return result.pieces.filter((piece) => piece.floating);
}

export function printCheckSmallContacts(result: PrintCheckResult) {
  return result.pieces.filter((piece) => piece.smallContact);
}

/** How many of the five checks found something: thin walls, floating parts, small contact, overhangs, open meshes. */
export function printCheckWarnings(result: PrintCheckResult) {
  return [
    Boolean(result.thinWalls?.places.length),
    printCheckFloating(result).length > 0,
    printCheckSmallContacts(result).length > 0,
    result.overhang.areaMm2 > 0,
    result.openMeshes.length > 0,
  ].filter(Boolean).length;
}

/** The object a checked part belongs to in the design: itself, or the bundle it was taken out of. */
export function printCheckTopLevelId(shapes: readonly WorkplaneShape[], id: string) {
  const holds = (shape: WorkplaneShape): boolean => shape.id === id || Boolean(shape.groupedShapes?.some(holds));
  return shapes.find(holds)?.id ?? null;
}

const PRINT_CHECK_SETTINGS_KEY = "layerling.printCheck";

/** The nozzle as last used in this browser; blocked storage gives the default. */
export function readPrintCheckSettings(): Pick<PrintCheckOptions, "nozzle"> {
  try {
    const stored: unknown = JSON.parse(window.localStorage.getItem(PRINT_CHECK_SETTINGS_KEY) ?? "{}");
    return { nozzle: normalizePrintCheckOptions(stored && typeof stored === "object" ? stored as Partial<PrintCheckOptions> : {}).nozzle };
  } catch {
    return { nozzle: PRINT_CHECK_DEFAULT_NOZZLE_MM };
  }
}

export function writePrintCheckSettings(settings: Pick<PrintCheckOptions, "nozzle">) {
  try {
    window.localStorage.setItem(PRINT_CHECK_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Blocked storage: the nozzle holds until the page is closed.
  }
}
