
import type { ManifoldToplevel } from "manifold-3d";
import { ADDITION, Brush, Evaluator, HOLLOW_INTERSECTION, HOLLOW_SUBTRACTION, INTERSECTION, SUBTRACTION, type CSGOperation } from "three-bvh-csg";
import * as THREE from "three";
import { numberLocale, t } from "@/lib/i18n";
import { sphereTessellation } from "@/lib/sphereTessellation";
import { groupShowsPartColors } from "@/lib/groupColors";
import { acceleratedRaycast, computeBoundsTree } from "three-mesh-bvh";
import { groupedContentScale, groupedPartSizeScale, scaleGroupedVertices } from "@/lib/groupScale";
import { dropSplitSlivers, unionSplitManifoldComponents } from "@/lib/manifoldSplit";
import { splitAxisLabel, splitPlaneIntersectsPoints, splitShapeFromWorldPositions, type ModelSplitPlane } from "@/lib/modelSplit";
import { canonicalizeShape, cleanRotationDegrees, isNonSolidShapeKind, meshYawDegrees, mirrorSign, normalizeDegrees, resizedImportedCoordinates, resizedShapeSize, shapeDepth, shapeHasShapeDeform, shapeWidth, withHoleMode } from "@/lib/workplaneShapes";
import { closedMeshVolume } from "@/lib/cadProfileExtrusion";
import { meshSurfaceAreas } from "@/lib/printEstimate";
import { createLocalId, derivedLocalId } from "@/lib/localIds";
import { boundsOverlap, exportColorGroups, meshBounds, overlappingExportClusters } from "@/lib/exportUnion";
import type { WorkplaneShape } from "@/types/layerling";
import { type Vec3, type MeshData, type Cuboid, type ShapeUpdatePatch, type ManifoldSolid, CUTTER_PADDING, CUTTER_LATERAL_PADDING, POINT_TOLERANCE, CUTTER_RESIDUAL_INSET, MIN_SHAPE_DIMENSION, IMPORTED_FALLBACK_BOOLEAN_TRIANGLE_LIMIT, COPLANAR_BOOLEAN_RESCUE_DEGREES, cleanModelDimension, getManifoldRuntime, transformMesh, meshForShape, appendMeshData, formatTriangleCount, shapeAabb, boundsForShapes, boundsForCuboids, meshAabb, geometryFromMeshData, positionsFromGeometryDrawRange, boundsForPositions, positionsDifferFromMeshData, geometryDiffersFromMeshData, positionsBoundaryEdges, meshDataPositions, midpoint, localGroupBounds } from "@/lib/editorMeshCore";

export type GroupBuildResult = {
  group: WorkplaneShape | null;
  booleanSelection: WorkplaneShape[];
  hasSolid: boolean;
  hasHole: boolean;
  hasImportedMesh: boolean;
  consumed: boolean;
  failureNotice: string;
  /**
   * The cut was made by the fallback that opens a mesh without closing the cut face, because the
   * solid's surface has gaps: how many open edges it has. 0 when the cut is closed (#346).
   */
  openGapEdges?: number;
  /**
   * The solids were grouped by laying their meshes together, not merged into one, because they have
   * more triangles than the limit: what to tell the user, since an export keeps them overlapping.
   */
  mergeWarning?: string;
};

type IntersectionAttempt =
  | { status: "success"; group: WorkplaneShape }
  | { status: "empty" }
  | { status: "unsupported" };

export type IntersectionBuildResult = {
  group: WorkplaneShape | null;
  empty: boolean;
  failureNotice: string;
};

function cutBoundaryEdgeCount(positions: number[], cutters: WorkplaneShape[]) {
  if (cutters.length === 0) {
    return 0;
  }
  return positionsBoundaryEdges(positions).filter((edge) => cutters.some((cutter) => pointInsideHoleShape(edge.midpoint, cutter))).length;
}

function introducesOpenCutBoundary(resultPositions: number[], sourceMesh: MeshData, cutters: WorkplaneShape[]) {
  const resultCutBoundaries = cutBoundaryEdgeCount(resultPositions, cutters);
  if (resultCutBoundaries === 0) {
    return false;
  }

  const sourceCutBoundaries = cutBoundaryEdgeCount(meshDataPositions(sourceMesh), cutters);
  return resultCutBoundaries > sourceCutBoundaries + Math.max(4, Math.floor(sourceCutBoundaries * 0.25));
}

function paddedCutterShape(shape: WorkplaneShape): WorkplaneShape {
  // The hole sticks out a hair at both ends, so one that ends flush with a face leaves no skin.
  const height = shape.height + CUTTER_PADDING * 2;
  // Its width and depth stay as typed but for a thousandth of a millimetre: padding them by 0.05 cut a
  // 7.9 mm hole at 8.0 (#254), none at all left a hole that touches a wall along a line cutting a slab
  // out of it. A thousandth keeps the size and breaks that touch.
  const width = shapeWidth(shape) + CUTTER_LATERAL_PADDING * 2;
  const depth = shapeDepth(shape) + CUTTER_LATERAL_PADDING * 2;
  return {
    ...shape,
    width,
    depth,
    height,
    size: Math.max(width, depth),
    elevation: (shape.elevation ?? 0) - CUTTER_PADDING,
    baseRadius: shape.baseRadius ? shape.baseRadius + CUTTER_LATERAL_PADDING : shape.baseRadius,
  };
}

function brushFromShape(shape: WorkplaneShape, cutter = false) {
  const brush = new Brush(geometryFromMeshData(meshForShape(cutter ? paddedCutterShape(shape) : shape)));
  brush.updateMatrixWorld(true);
  return brush;
}

function positiveCuboid(cuboid: Cuboid) {
  return cuboid.maxX - cuboid.minX > 0.01 && cuboid.maxY - cuboid.minY > 0.01 && cuboid.maxZ - cuboid.minZ > 0.01;
}

function subtractCuboid(source: Cuboid, cutter: Cuboid): Cuboid[] {
  const overlap = {
    minX: Math.max(source.minX, cutter.minX),
    maxX: Math.min(source.maxX, cutter.maxX),
    minY: Math.max(source.minY, cutter.minY),
    maxY: Math.min(source.maxY, cutter.maxY),
    minZ: Math.max(source.minZ, cutter.minZ),
    maxZ: Math.min(source.maxZ, cutter.maxZ),
  };

  if (!positiveCuboid(overlap)) {
    return [source];
  }

  return [
    { ...source, maxX: overlap.minX },
    { ...source, minX: overlap.maxX },
    { minX: overlap.minX, maxX: overlap.maxX, minY: source.minY, maxY: source.maxY, minZ: source.minZ, maxZ: overlap.minZ },
    { minX: overlap.minX, maxX: overlap.maxX, minY: source.minY, maxY: source.maxY, minZ: overlap.maxZ, maxZ: source.maxZ },
    { minX: overlap.minX, maxX: overlap.maxX, minY: source.minY, maxY: overlap.minY, minZ: overlap.minZ, maxZ: overlap.maxZ },
    { minX: overlap.minX, maxX: overlap.maxX, minY: overlap.maxY, maxY: source.maxY, minZ: overlap.minZ, maxZ: overlap.maxZ },
  ].filter(positiveCuboid);
}

function cuboidsOverlap(a: Cuboid, b: Cuboid) {
  return (
    Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX) > 0.01 &&
    Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY) > 0.01 &&
    Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ) > 0.01
  );
}

function hasSolidHoleOverlap(solids: WorkplaneShape[], holes: WorkplaneShape[]) {
  const solidBounds = solids.map(meshAabb);
  const holeBounds = holes.map((hole) => meshAabb(paddedCutterShape(hole)));
  return solidBounds.some((solid) => holeBounds.some((hole) => cuboidsOverlap(solid, hole)));
}

function pointInsideCuboid(point: Vec3, cuboid: Cuboid, inset = -POINT_TOLERANCE) {
  const minX = cuboid.minX + inset;
  const maxX = cuboid.maxX - inset;
  const minY = cuboid.minY + inset;
  const maxY = cuboid.maxY - inset;
  const minZ = cuboid.minZ + inset;
  const maxZ = cuboid.maxZ - inset;
  return (
    minX <= maxX &&
    minY <= maxY &&
    minZ <= maxZ &&
    point[0] >= minX &&
    point[0] <= maxX &&
    point[1] >= minY &&
    point[1] <= maxY &&
    point[2] >= minZ &&
    point[2] <= maxZ
  );
}

/*

 * The box round a mesh or group cutter, kept per shape object. The checks below ask
 * for it once per sampled point, and for a group the mesh is rebuilt from its
 * children on every ask - three grouped threads against a 15,000-triangle import
 * meant minutes on the main thread, the page "unresponsive" (#214). Shapes are
 * never changed in place, so the box stays right for as long as the object lives.
 */
const holeShapeBoundsCache = new WeakMap<WorkplaneShape, Cuboid>();

function holeShapeBounds(shape: WorkplaneShape): Cuboid {
  const cached = holeShapeBoundsCache.get(shape);
  if (cached) return cached;
  const bounds = meshAabb(shape);
  holeShapeBoundsCache.set(shape, bounds);
  return bounds;
}

function pointInsideHoleShape(point: Vec3, shape: WorkplaneShape, strictInterior = false) {
  if (shape.importedMesh || shape.groupedShapes?.length) {
    return pointInsideCuboid(point, holeShapeBounds(shape), strictInterior ? CUTTER_RESIDUAL_INSET : -POINT_TOLERANCE);
  }

  const centerY = shape.height / 2;
  const inverse = new THREE.Matrix4()
    .makeRotationFromEuler(
      new THREE.Euler(
        THREE.MathUtils.degToRad(shape.rotationX ?? 0),
        THREE.MathUtils.degToRad(shape.rotation),
        THREE.MathUtils.degToRad(shape.rotationZ ?? 0),
        "XYZ",
      ),
    )
    .invert();
  const local = new THREE.Vector3(point[0] - shape.x, point[1] - (shape.elevation ?? 0) - centerY, point[2] - shape.z).applyMatrix4(inverse);
  const localY = local.y + centerY;
  const halfWidth = shapeWidth(shape) / 2;
  const halfDepth = shapeDepth(shape) / 2;
  if (strictInterior) {
    const yInset = Math.min(CUTTER_RESIDUAL_INSET, shape.height * 0.25);
    const xInset = Math.min(CUTTER_RESIDUAL_INSET, halfWidth * 0.25);
    const zInset = Math.min(CUTTER_RESIDUAL_INSET, halfDepth * 0.25);
    const innerHalfWidth = halfWidth - xInset;
    const innerHalfDepth = halfDepth - zInset;
    if (innerHalfWidth <= 0 || innerHalfDepth <= 0 || localY <= yInset || localY >= shape.height - yInset) {
      return false;
    }

    if (shape.kind === "cylinder" || shape.kind === "ellipse" || shape.kind === "sphere" || shape.kind === "halfSphere" || shape.kind === "cone" || shape.kind === "torus" || shape.kind === "tube" || shape.kind === "ring") {
      const nx = local.x / Math.max(POINT_TOLERANCE, innerHalfWidth);
      const nz = local.z / Math.max(POINT_TOLERANCE, innerHalfDepth);
      return nx * nx + nz * nz < 1;
    }

    return Math.abs(local.x) < innerHalfWidth && Math.abs(local.z) < innerHalfDepth;
  }

  const insideHeight = localY >= -POINT_TOLERANCE && localY <= shape.height + POINT_TOLERANCE;
  if (!insideHeight) {
    return false;
  }

  if (shape.kind === "cylinder" || shape.kind === "ellipse" || shape.kind === "sphere" || shape.kind === "halfSphere" || shape.kind === "cone" || shape.kind === "torus" || shape.kind === "tube" || shape.kind === "ring") {
    const nx = local.x / Math.max(POINT_TOLERANCE, halfWidth);
    const nz = local.z / Math.max(POINT_TOLERANCE, halfDepth);
    return nx * nx + nz * nz <= 1.0001;
  }

  return Math.abs(local.x) <= halfWidth + POINT_TOLERANCE && Math.abs(local.z) <= halfDepth + POINT_TOLERANCE;
}

function triangleCentroid([a, b, c]: Vec3[]): Vec3 {
  return [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];
}

function triangleAabb([a, b, c]: Vec3[]): Cuboid {
  return {
    minX: Math.min(a[0], b[0], c[0]),
    maxX: Math.max(a[0], b[0], c[0]),
    minY: Math.min(a[1], b[1], c[1]),
    maxY: Math.max(a[1], b[1], c[1]),
    minZ: Math.min(a[2], b[2], c[2]),
    maxZ: Math.max(a[2], b[2], c[2]),
  };
}

function cuboidsTouch(a: Cuboid, b: Cuboid, tolerance = 0.0001) {
  return (
    Math.min(a.maxX, b.maxX) + tolerance >= Math.max(a.minX, b.minX) &&
    Math.min(a.maxY, b.maxY) + tolerance >= Math.max(a.minY, b.minY) &&
    Math.min(a.maxZ, b.maxZ) + tolerance >= Math.max(a.minZ, b.minZ)
  );
}

function triangleTouchesHoleShape(triangle: Vec3[], hole: WorkplaneShape, holeBounds: Cuboid) {
  const bounds = triangleAabb(triangle);
  if (!cuboidsTouch(bounds, holeBounds)) {
    return false;
  }

  const [a, b, c] = triangle;
  const samples = [a, b, c, triangleCentroid(triangle), midpoint(a, b), midpoint(b, c), midpoint(c, a)];
  if (samples.some((point) => pointInsideHoleShape(point, hole))) {
    return true;
  }

  // Imported STLs are often open triangle soups. A cutter can cross a small triangle
  // without catching any sampled point, so tiny overlapping triangles are clipped too.
  const triangleSpan = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY, bounds.maxZ - bounds.minZ);
  const cutterSpan = Math.max(holeBounds.maxX - holeBounds.minX, holeBounds.maxY - holeBounds.minY, holeBounds.maxZ - holeBounds.minZ);
  return triangleSpan <= cutterSpan * 0.35;
}

function cutterTouchedTriangleCount(mesh: MeshData, cutters: WorkplaneShape[]) {
  const cutterInfo = cutters.map((cutter) => ({ shape: cutter, bounds: meshAabb(cutter) }));
  return mesh.faces.reduce((total, [ai, bi, ci]) => {
    const triangle = [mesh.vertices[ai], mesh.vertices[bi], mesh.vertices[ci]];
    return total + (cutterInfo.some((cutter) => triangleTouchesHoleShape(triangle, cutter.shape, cutter.bounds)) ? 1 : 0);
  }, 0);
}

function isAxisAlignedBoxCutter(shape: WorkplaneShape) {
  const rotation = Math.abs(normalizeDegrees(shape.rotation));
  const rotationX = Math.abs(normalizeDegrees(shape.rotationX ?? 0));
  const rotationZ = Math.abs(normalizeDegrees(shape.rotationZ ?? 0));
  const straightY = rotation < 0.001 || Math.abs(rotation - 180) < 0.001 || Math.abs(rotation - 360) < 0.001;
  const straightX = rotationX < 0.001 || Math.abs(rotationX - 180) < 0.001 || Math.abs(rotationX - 360) < 0.001;
  const straightZ = rotationZ < 0.001 || Math.abs(rotationZ - 180) < 0.001 || Math.abs(rotationZ - 360) < 0.001;
  // A tapered, twisted or leaning box is no longer a box: the fast paths that
  // treat it as one dropped the deformation when grouping (Eichhornkobel,
  // forum, 27.09.2026).
  return shape.kind === "box" && straightX && straightY && straightZ && !shapeHasShapeDeform(shape);
}

function cuboidsToMesh(name: string, cuboids: Cuboid[], centerX: number, centerZ: number, baseY = 0): MeshData {
  const vertices: Vec3[] = [];
  const faces: [number, number, number][] = [];

  const uniqueSorted = (values: number[]) =>
    values
      .slice()
      .sort((a, b) => a - b)
      .filter((value, index, sorted) => index === 0 || Math.abs(value - sorted[index - 1]) > 0.0001);

  const xs = uniqueSorted(cuboids.flatMap((cuboid) => [cuboid.minX, cuboid.maxX]));
  const ys = uniqueSorted(cuboids.flatMap((cuboid) => [cuboid.minY, cuboid.maxY]));
  const zs = uniqueSorted(cuboids.flatMap((cuboid) => [cuboid.minZ, cuboid.maxZ]));
  const filled = new Set<string>();
  const cellKey = (x: number, y: number, z: number) => `${x}:${y}:${z}`;

  for (let xi = 0; xi < xs.length - 1; xi += 1) {
    for (let yi = 0; yi < ys.length - 1; yi += 1) {
      for (let zi = 0; zi < zs.length - 1; zi += 1) {
        const cx = (xs[xi] + xs[xi + 1]) / 2;
        const cy = (ys[yi] + ys[yi + 1]) / 2;
        const cz = (zs[zi] + zs[zi + 1]) / 2;
        const inside = cuboids.some(
          (cuboid) =>
            cx > cuboid.minX + 0.0001 &&
            cx < cuboid.maxX - 0.0001 &&
            cy > cuboid.minY + 0.0001 &&
            cy < cuboid.maxY - 0.0001 &&
            cz > cuboid.minZ + 0.0001 &&
            cz < cuboid.maxZ - 0.0001,
        );
        if (inside) {
          filled.add(cellKey(xi, yi, zi));
        }
      }
    }
  }

  const isFilled = (x: number, y: number, z: number) => filled.has(cellKey(x, y, z));
  const addQuad = (points: Vec3[]) => {
    const offset = vertices.length;
    vertices.push(...points);
    faces.push([offset, offset + 1, offset + 2], [offset, offset + 2, offset + 3]);
  };

  for (let xi = 0; xi < xs.length - 1; xi += 1) {
    for (let yi = 0; yi < ys.length - 1; yi += 1) {
      for (let zi = 0; zi < zs.length - 1; zi += 1) {
        if (!isFilled(xi, yi, zi)) {
          continue;
        }

        const x0 = xs[xi] - centerX;
        const x1 = xs[xi + 1] - centerX;
        const y0 = ys[yi] - baseY;
        const y1 = ys[yi + 1] - baseY;
        const z0 = zs[zi] - centerZ;
        const z1 = zs[zi + 1] - centerZ;

        if (!isFilled(xi - 1, yi, zi)) addQuad([[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]]);
        if (!isFilled(xi + 1, yi, zi)) addQuad([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]]);
        if (!isFilled(xi, yi - 1, zi)) addQuad([[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]]);
        if (!isFilled(xi, yi + 1, zi)) addQuad([[x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0]]);
        if (!isFilled(xi, yi, zi - 1)) addQuad([[x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0]]);
        if (!isFilled(xi, yi, zi + 1)) addQuad([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]]);
      }
    }
  }

  return { name, vertices, faces };
}

function booleanMeshShape(selection: WorkplaneShape[], groupChildren?: WorkplaneShape[]): WorkplaneShape | null {
  const solids = selection.filter((shape) => !shape.hole && !shape.locked);
  const holes = selection.filter((shape) => shape.hole);
  if (solids.length === 0 || holes.length === 0) {
    return null;
  }

  try {
    const sourceTriangleCount = solids.reduce((total, solid) => total + meshForShape(solid).faces.length, 0);
    const overlappingCut = hasSolidHoleOverlap(solids, holes);
    const evaluator = new Evaluator();
    evaluator.useGroups = false;
    evaluator.attributes = ["position", "normal"];
    let result = brushFromShape(solids[0]);

    solids.slice(1).forEach((solid) => {
      result = evaluator.evaluate(result, brushFromShape(solid), ADDITION);
    });

    holes.forEach((hole) => {
      result = evaluator.evaluate(result, brushFromShape(hole, true), SUBTRACTION);
    });

    const resultPositions = positionsFromGeometryDrawRange(result.geometry);
    const groupBounds = boundsForPositions(resultPositions);
    if (!groupBounds) {
      return null;
    }

    const centerX = (groupBounds.minX + groupBounds.maxX) / 2;
    const centerZ = (groupBounds.minZ + groupBounds.maxZ) / 2;
    const minY = groupBounds.minY;
    const rawWidth = Math.max(MIN_SHAPE_DIMENSION, groupBounds.maxX - groupBounds.minX);
    const rawHeight = Math.max(MIN_SHAPE_DIMENSION, groupBounds.maxY - groupBounds.minY);
    const rawDepth = Math.max(MIN_SHAPE_DIMENSION, groupBounds.maxZ - groupBounds.minZ);
    const width = cleanModelDimension(rawWidth);
    const height = cleanModelDimension(rawHeight);
    const depth = cleanModelDimension(rawDepth);
    const positions: number[] = [];

    for (let i = 0; i < resultPositions.length; i += 3) {
      positions.push(resultPositions[i] - centerX, resultPositions[i + 1] - minY, resultPositions[i + 2] - centerZ);
    }

    const firstSolid = solids[0];
    const nextTriangleCount = Math.floor(positions.length / 9);
    if (overlappingCut && Math.abs(nextTriangleCount - sourceTriangleCount) <= 1) {
      return null;
    }

    return {
      id: createLocalId("grouped-boolean"),
      name: "Group",
      kind: "mesh",
      color: firstSolid.color,
      x: centerX,
      z: centerZ,
      elevation: minY,
      size: Math.max(width, depth),
      width,
      depth,
      height,
      rotation: 0,
      importedMesh: {
        positions,
        baseWidth: rawWidth,
        baseDepth: rawDepth,
        baseHeight: rawHeight,
        triangleCount: nextTriangleCount,
        sourceFormat: "json",
      },
      groupedBaseWidth: width,
      groupedBaseDepth: depth,
      groupedBaseHeight: height,
      groupedShapes: (groupChildren ?? selection).map((shape) => cloneAsGroupChild(shape, centerX, centerZ, minY)),
      locked: false,
      hidden: false,
    };
  } catch {
    return null;
  }
}

function resultGeometryToMeshShape(
  selection: WorkplaneShape[],
  solids: WorkplaneShape[],
  geometry: THREE.BufferGeometry,
  idPrefix: string,
  groupChildren?: WorkplaneShape[],
): WorkplaneShape | null {
  const resultPositions = positionsFromGeometryDrawRange(geometry);
  const groupBounds = boundsForPositions(resultPositions);
  if (!groupBounds) {
    return null;
  }

  const centerX = (groupBounds.minX + groupBounds.maxX) / 2;
  const centerZ = (groupBounds.minZ + groupBounds.maxZ) / 2;
  const minY = groupBounds.minY;
  const rawWidth = Math.max(MIN_SHAPE_DIMENSION, groupBounds.maxX - groupBounds.minX);
  const rawHeight = Math.max(MIN_SHAPE_DIMENSION, groupBounds.maxY - groupBounds.minY);
  const rawDepth = Math.max(MIN_SHAPE_DIMENSION, groupBounds.maxZ - groupBounds.minZ);
  const width = cleanModelDimension(rawWidth);
  const height = cleanModelDimension(rawHeight);
  const depth = cleanModelDimension(rawDepth);
  const positions: number[] = [];

  for (let i = 0; i < resultPositions.length; i += 3) {
    positions.push(resultPositions[i] - centerX, resultPositions[i + 1] - minY, resultPositions[i + 2] - centerZ);
  }

  const firstSolid = solids[0];

  return {
    id: createLocalId(idPrefix),
    name: "Group",
    kind: "mesh",
    color: firstSolid.color,
    x: centerX,
    z: centerZ,
    elevation: minY,
    size: Math.max(width, depth),
    width,
    depth,
    height,
    rotation: 0,
    importedMesh: {
      positions,
      baseWidth: rawWidth,
      baseDepth: rawDepth,
      baseHeight: rawHeight,
      triangleCount: Math.floor(positions.length / 9),
      sourceFormat: "json",
    },
    groupedBaseWidth: width,
    groupedBaseDepth: depth,
    groupedBaseHeight: height,
    groupedShapes: (groupChildren ?? selection).map((shape) => cloneAsGroupChild(shape, centerX, centerZ, minY)),
    locked: false,
    hidden: false,
  };
}

function isUsableBooleanGroup(group: WorkplaneShape | null, sourceTriangleCount = 0, enforceMinimumTriangles = true) {
  if (!group?.importedMesh) {
    return false;
  }

  const positions = group.importedMesh.positions;
  const triangleCount = group.importedMesh.triangleCount;
  const dimensions = [group.width, group.height, group.depth, group.size, group.x, group.z, group.elevation ?? 0];
  if (positions.length < 9 || triangleCount < 1 || positions.some((value) => !Number.isFinite(value)) || dimensions.some((value) => !Number.isFinite(value))) {
    return false;
  }

  const minTriangles = enforceMinimumTriangles && sourceTriangleCount > 0 ? Math.max(2, Math.min(48, Math.floor(sourceTriangleCount * 0.004))) : 2;
  return triangleCount >= minTriangles && group.width > 0.01 && group.height > 0.01 && group.depth > 0.01;
}

function looksLikeUnchangedBooleanResult(group: WorkplaneShape | null, sourceTriangleCount: number, requireChanged = true) {
  if (!group?.importedMesh) {
    return true;
  }

  if (!requireChanged) {
    return false;
  }

  const sameTriangles = Math.abs(group.importedMesh.triangleCount - sourceTriangleCount) <= 1;
  return sameTriangles;
}

function shapeContainsImportedMesh(shape: WorkplaneShape): boolean {
  return Boolean(shape.importedMesh) || Boolean(shape.groupedShapes?.some(shapeContainsImportedMesh));
}

function shapeIsImportedHole(shape: WorkplaneShape): boolean {
  return Boolean(shape.hole) && shapeContainsImportedMesh(shape);
}

function coplanarRescueCutterShape(shape: WorkplaneShape): WorkplaneShape {
  if (!shapeIsImportedHole(shape) || hasNonZeroRotation(shape)) {
    return shape;
  }
  return {
    ...shape,
    rotation: shape.rotation + COPLANAR_BOOLEAN_RESCUE_DEGREES,
    rotationZ: (shape.rotationZ ?? 0) + COPLANAR_BOOLEAN_RESCUE_DEGREES,
  };
}

export function cloneAsGroupChild(shape: WorkplaneShape, centerX: number, centerZ: number, minY: number): WorkplaneShape {
  return {
    ...shape,
    id: derivedLocalId(shape.id, "group-child"),
    x: shape.x - centerX,
    z: shape.z - centerZ,
    elevation: (shape.elevation ?? 0) - minY,
  };
}

function mergedSolidMeshData(solids: WorkplaneShape[]) {
  const mergedSolidMesh: MeshData = { name: "ImportedBooleanSource", vertices: [], faces: [] };

  solids.forEach((solid) => {
    appendMeshData(mergedSolidMesh.vertices, mergedSolidMesh.faces, meshForShape(solid));
  });

  return mergedSolidMesh;
}

export function meshDataToManifoldMesh(runtime: ManifoldToplevel, mesh: MeshData) {
  const vertProperties = new Float32Array(mesh.vertices.length * 3);
  mesh.vertices.forEach(([x, y, z], index) => {
    vertProperties[index * 3] = x;
    vertProperties[index * 3 + 1] = y;
    vertProperties[index * 3 + 2] = z;
  });

  const triVerts = new Uint32Array(mesh.faces.length * 3);
  mesh.faces.forEach(([a, b, c], index) => {
    triVerts[index * 3] = a;
    triVerts[index * 3 + 1] = b;
    triVerts[index * 3 + 2] = c;
  });

  const manifoldMesh = new runtime.Mesh({
    numProp: 3,
    vertProperties,
    triVerts,
    tolerance: 0.0001,
  });
  manifoldMesh.merge();
  return manifoldMesh;
}

function boxBoundsToManifold(runtime: ManifoldToplevel, bounds: Cuboid, created: ManifoldSolid[]) {
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  const depth = bounds.maxZ - bounds.minZ;
  if (width <= 0.0001 || height <= 0.0001 || depth <= 0.0001) {
    return null;
  }

  const box = runtime.Manifold.cube([width, height, depth]);
  created.push(box);
  const moved = box.translate([bounds.minX, bounds.minY, bounds.minZ]);
  if (moved !== box && moved) {
    created.push(moved);
  }
  return moved;
}

function trackManifold<T extends ManifoldSolid | null>(created: ManifoldSolid[], value: T): T {
  if (value) {
    created.push(value);
  }
  return value;
}

function manifoldTransformFromMatrix(matrix: THREE.Matrix4) {
  return matrix.elements as unknown as Parameters<ManifoldSolid["transform"]>[0];
}

function shapeRotationQuaternion(shape: WorkplaneShape) {
  return new THREE.Quaternion().setFromEuler(
    new THREE.Euler(
      THREE.MathUtils.degToRad(shape.rotationX ?? 0),
      THREE.MathUtils.degToRad(meshYawDegrees(shape)),
      THREE.MathUtils.degToRad(shape.rotationZ ?? 0),
      "XYZ",
    ),
  );
}

function primitiveTransformMatrix(shape: WorkplaneShape, scale: THREE.Vector3, alignRotation?: THREE.Euler) {
  const center = new THREE.Vector3(shape.x, (shape.elevation ?? 0) + shape.height / 2, shape.z);
  const matrix = new THREE.Matrix4().compose(center, shapeRotationQuaternion(shape), new THREE.Vector3(1, 1, 1));
  if (alignRotation) {
    matrix.multiply(new THREE.Matrix4().makeRotationFromEuler(alignRotation));
  }
  matrix.multiply(new THREE.Matrix4().makeScale(scale.x, scale.y, scale.z));
  return matrix;
}

function transformedPrimitiveManifold(primitive: ManifoldSolid, matrix: THREE.Matrix4, created: ManifoldSolid[]) {
  trackManifold(created, primitive);
  return trackManifold(created, primitive.transform(manifoldTransformFromMatrix(matrix)));
}

function primitiveManifoldForShape(runtime: ManifoldToplevel, shape: WorkplaneShape, created: ManifoldSolid[]) {
  // Taper, twist and lean are not part of the analytic primitives; the mesh
  // carries them.
  if (shapeHasShapeDeform(shape)) {
    return null;
  }
  const width = shapeWidth(shape);
  const depth = shapeDepth(shape);
  const height = shape.height;
  if (width <= 0.0001 || depth <= 0.0001 || height <= 0.0001) {
    return null;
  }

  if (shape.kind === "box") {
    return transformedPrimitiveManifold(runtime.Manifold.cube(1, true), primitiveTransformMatrix(shape, new THREE.Vector3(width, height, depth)), created);
  }

  if (shape.kind === "sphere") {
    const { widthSegments } = sphereTessellation(shape.steps);
    return transformedPrimitiveManifold(
      runtime.Manifold.sphere(1, widthSegments),
      primitiveTransformMatrix(shape, new THREE.Vector3(width / 2, height / 2, depth / 2)),
      created,
    );
  }

  if (shape.kind === "cylinder" || shape.kind === "ellipse" || shape.kind === "cone") {
    const sides = shape.sides ?? 96;
    const topRadiusScale =
      shape.kind === "cone"
        ? shape.baseRadius
          ? (shape.topRadius ?? 0) / shape.baseRadius
          : 0
        : 1;
    return transformedPrimitiveManifold(
      runtime.Manifold.cylinder(1, 1, topRadiusScale, sides, true),
      primitiveTransformMatrix(shape, new THREE.Vector3(width / 2, depth / 2, height), new THREE.Euler(-Math.PI / 2, 0, 0, "XYZ")),
      created,
    );
  }

  return null;
}

export function shapeToManifoldSolid(runtime: ManifoldToplevel, shape: WorkplaneShape, created: ManifoldSolid[], useBoxPrimitive = false) {
  if (useBoxPrimitive && isAxisAlignedBoxCutter(shape)) {
    return primitiveManifoldForShape(runtime, shape, created) ?? boxBoundsToManifold(runtime, meshAabb(shape), created);
  }

  const primitive = primitiveManifoldForShape(runtime, shape, created);
  if (primitive) {
    return primitive;
  }

  const mesh = meshDataToManifoldMesh(runtime, meshForShape(shape));
  let solid: ManifoldSolid;
  try {
    solid = runtime.Manifold.ofMesh(mesh);
  } finally {
    disposeManifold(mesh);
  }
  if (solid.status() !== "NoError") return solid;
  // A group of solids is the loose pile of its parts' surfaces, and parts that
  // overlap or lie on top of one another (a frame whose posts stand in its
  // rails) are several shells in one mesh. A cut through such a pile comes out
  // wrong, so the shells are joined into one body first.
  const normalized = unionSplitManifoldComponents(runtime, solid);
  created.push(solid, ...normalized.created);
  return normalized.solid ?? solid;
}

function shapesToManifoldUnion(runtime: ManifoldToplevel, shapes: WorkplaneShape[], created: ManifoldSolid[], useBoxPrimitive = false) {
  const parts: ManifoldSolid[] = [];
  for (const shape of shapes) {
    const part = shapeToManifoldSolid(runtime, shape, created, useBoxPrimitive);
    if (!part || part.status() !== "NoError" || part.numTri() < 1) {
      disposeManifold(part);
      return null;
    }
    parts.push(part);
    created.push(part);
  }

  if (parts.length === 0) {
    return null;
  }

  if (parts.length === 1) {
    return parts[0];
  }

  const union = runtime.Manifold.union(parts);
  created.push(union);
  return union.status() === "NoError" && union.numTri() > 0 ? union : null;
}

async function splitShapeByPlane(shape: WorkplaneShape, plane: Pick<ModelSplitPlane, "axis" | "normal" | "position">) {
  const created: ManifoldSolid[] = [];
  try {
    const runtime = await getManifoldRuntime();
    let solid = shapeToManifoldSolid(runtime, shape, created);
    if (!solid || solid.status() !== "NoError" || solid.numTri() < 1) {
      return { parts: null, error: t("split.error.notClosed", { status: solid?.status() ?? "empty" }) };
    }
    created.push(solid);
    const normalized = unionSplitManifoldComponents(runtime, solid);
    created.push(...normalized.created);
    if (!normalized.solid) {
      return { parts: null, error: t("split.error.overlapping") };
    }
    solid = normalized.solid;
    const [rawPositive, rawNegative] = solid.splitByPlane(plane.normal, plane.position);
    created.push(rawPositive, rawNegative);
    const trimmedPositive = dropSplitSlivers(runtime, rawPositive);
    const trimmedNegative = dropSplitSlivers(runtime, rawNegative);
    created.push(...trimmedPositive.created, ...trimmedNegative.created);
    const positive = trimmedPositive.solid;
    const negative = trimmedNegative.solid;
    if (
      !positive || !negative
      || positive.status() !== "NoError" || negative.status() !== "NoError"
      || positive.numTri() < 1 || negative.numTri() < 1
    ) {
      return { parts: null, error: t("split.error.emptyHalf") };
    }

    const positiveMesh = positive.getMesh();
    const negativeMesh = negative.getMesh();
    try {
      const label = splitAxisLabel(plane.axis);
      const positiveShape = splitShapeFromWorldPositions(
        shape,
        manifoldMeshToPositions(positiveMesh),
        createLocalId(`${shape.id}-split-positive`),
        `${shape.name} (${label}+)`,
      );
      const negativeShape = splitShapeFromWorldPositions(
        shape,
        manifoldMeshToPositions(negativeMesh),
        createLocalId(`${shape.id}-split-negative`),
        `${shape.name} (${label}-)`,
      );
      return positiveShape && negativeShape
        ? { parts: [canonicalizeShape(positiveShape), canonicalizeShape(negativeShape)] as [WorkplaneShape, WorkplaneShape] }
        : { parts: null, error: t("split.error.store") };
    } finally {
      disposeManifold(positiveMesh);
      disposeManifold(negativeMesh);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error ?? "");
    return { parts: null, error: message ? t("split.error.kernel", { message }) : t("split.error.kernelUnknown") };
  } finally {
    Array.from(new Set(created)).forEach(disposeManifold);
  }
}

export type SplitShapesOutcome =
  | { status: "stale" }
  | { status: "failed"; shape: WorkplaneShape; error: string }
  | { status: "done"; replacements: Map<string, WorkplaneShape[]>; splitCount: number };

/** Splits every target the plane crosses; `stillCurrent` is asked after each one. */
export async function splitShapesByPlane(
  targets: readonly WorkplaneShape[],
  plane: Pick<ModelSplitPlane, "axis" | "normal" | "position">,
  stillCurrent: () => boolean,
): Promise<SplitShapesOutcome> {
  const replacements = new Map<string, WorkplaneShape[]>();
  let splitCount = 0;
  for (const shape of targets) {
    if (!splitPlaneIntersectsPoints(meshForShape(shape).vertices, plane.normal, plane.position)) continue;
    const result = await splitShapeByPlane(shape, plane);
    if (!stillCurrent()) return { status: "stale" };
    if (!result.parts) return { status: "failed", shape, error: result.error ?? t("split.error.failedDefault") };
    replacements.set(shape.id, result.parts);
    splitCount += 1;
  }
  return { status: "done", replacements, splitCount };
}

function manifoldMeshToPositions(mesh: InstanceType<ManifoldToplevel["Mesh"]>) {
  const positions: number[] = [];
  const numProp = mesh.numProp;
  for (let i = 0; i < mesh.triVerts.length; i += 1) {
    const vertexIndex = mesh.triVerts[i];
    const offset = vertexIndex * numProp;
    positions.push(mesh.vertProperties[offset], mesh.vertProperties[offset + 1], mesh.vertProperties[offset + 2]);
  }
  return positions;
}

function positionsInteriorTriangleCount(positions: number[], cutters: WorkplaneShape[], strictInterior = false) {
  let count = 0;
  for (let i = 0; i + 8 < positions.length; i += 9) {
    const centroid: Vec3 = [
      (positions[i] + positions[i + 3] + positions[i + 6]) / 3,
      (positions[i + 1] + positions[i + 4] + positions[i + 7]) / 3,
      (positions[i + 2] + positions[i + 5] + positions[i + 8]) / 3,
    ];
    if (cutters.some((cutter) => pointInsideHoleShape(centroid, cutter, strictInterior))) {
      count += 1;
    }
  }
  return count;
}

function meshPositionsToGroupShape(selection: WorkplaneShape[], solids: WorkplaneShape[], positions: number[], idPrefix: string, groupChildren?: WorkplaneShape[]): WorkplaneShape | null {
  if (positions.length < 9) {
    return null;
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];
    const z = positions[i + 2];
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    maxZ = Math.max(maxZ, z);
  }

  if (![minX, minY, minZ, maxX, maxY, maxZ].every(Number.isFinite)) {
    return null;
  }

  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const rawWidth = Math.max(MIN_SHAPE_DIMENSION, maxX - minX);
  const rawHeight = Math.max(MIN_SHAPE_DIMENSION, maxY - minY);
  const rawDepth = Math.max(MIN_SHAPE_DIMENSION, maxZ - minZ);
  const width = cleanModelDimension(rawWidth);
  const height = cleanModelDimension(rawHeight);
  const depth = cleanModelDimension(rawDepth);
  const normalizedPositions: number[] = [];
  for (let i = 0; i < positions.length; i += 3) {
    normalizedPositions.push(positions[i] - centerX, positions[i + 1] - minY, positions[i + 2] - centerZ);
  }

  const firstSolid = solids[0];
  return {
    id: createLocalId(idPrefix),
    name: "Group",
    kind: "mesh",
    color: firstSolid.color,
    x: centerX,
    z: centerZ,
    elevation: minY,
    size: Math.max(width, depth),
    width,
    depth,
    height,
    rotation: 0,
    importedMesh: {
      positions: normalizedPositions,
      baseWidth: rawWidth,
      baseDepth: rawDepth,
      baseHeight: rawHeight,
      triangleCount: Math.floor(normalizedPositions.length / 9),
      sourceFormat: "json",
    },
    groupedBaseWidth: width,
    groupedBaseDepth: depth,
    groupedBaseHeight: height,
    groupedShapes: (groupChildren ?? selection).map((shape) => cloneAsGroupChild(shape, centerX, centerZ, minY)),
    locked: false,
    hidden: false,
  };
}

function manifoldMeshToMeshData(mesh: InstanceType<ManifoldToplevel["Mesh"]>, name: string): MeshData {
  const numProp = mesh.numProp;
  const vertices: Vec3[] = [];
  for (let offset = 0; offset + 2 < mesh.vertProperties.length; offset += numProp) {
    vertices.push([mesh.vertProperties[offset], mesh.vertProperties[offset + 1], mesh.vertProperties[offset + 2]]);
  }
  const faces: [number, number, number][] = [];
  for (let offset = 0; offset + 2 < mesh.triVerts.length; offset += 3) {
    faces.push([mesh.triVerts[offset], mesh.triVerts[offset + 1], mesh.triVerts[offset + 2]]);
  }
  return { name, vertices, faces };
}

/**
 * Was sich durchdringt, wird fuer die Ausfuhr zu einem Koerper. Sonst stehen
 * zwei ineinander steckende Huellen in der Datei: der Schneider raeumt das
 * meist still auf, CGAL bricht daran ab. Getrennte Teile bleiben getrennt, und
 * wenn die Vereinigung nicht gelingt, geht die Ausfuhr trotzdem durch - nur
 * eben mit den einzelnen Koerpern und einem Hinweis.
 */
/**
 * A group of solids without holes is the loose pile of its parts' surfaces,
 * so its parts overlap each other even when nothing else does.
 */
function isPileOfSolids(shape: WorkplaneShape) {
  return Boolean(shape.groupedShapes && shape.groupedShapes.length > 1 && !shape.importedMesh);
}

export async function unionOverlappingExportMeshes(shapes: WorkplaneShape[], meshes: MeshData[]) {
  const gruppen = overlappingExportClusters(meshes.map((mesh) => meshBounds(mesh.vertices)));
  if (!gruppen.some((gruppe) => gruppe.length > 1 || isPileOfSolids(shapes[gruppe[0]]))) {
    return { meshes, quellen: meshes.map((_, index) => index), verschmolzen: 0, gescheitert: 0 };
  }
  const runtime = await getManifoldRuntime().catch(() => null);
  const ergebnis: MeshData[] = [];
  // Which input shape each result stands for - a merged body takes its first
  // member, so the 3MF export can keep names and colours.
  const quellen: number[] = [];
  let verschmolzen = 0;
  let gescheitert = 0;
  for (const gruppe of gruppen) {
    if (gruppe.length === 1 && !isPileOfSolids(shapes[gruppe[0]])) {
      ergebnis.push(meshes[gruppe[0]]);
      quellen.push(gruppe[0]);
      continue;
    }
    const created: ManifoldSolid[] = [];
    let vereinigt: MeshData | null = null;
    try {
      const union = runtime ? shapesToManifoldUnion(runtime, gruppe.map((index) => shapes[index]), created, true) : null;
      if (union && union.status() === "NoError" && union.numTri() > 0) {
        vereinigt = manifoldMeshToMeshData(union.getMesh(), meshes[gruppe[0]].name);
      }
    } catch {
      vereinigt = null;
    } finally {
      Array.from(new Set(created)).forEach(disposeManifold);
    }
    if (vereinigt && vereinigt.faces.length > 0) {
      ergebnis.push(vereinigt);
      quellen.push(gruppe[0]);
      if (gruppe.length > 1) verschmolzen += gruppe.length;
    } else {
      gruppe.forEach((index) => {
        ergebnis.push(meshes[index]);
        quellen.push(index);
      });
      gescheitert += 1;
    }
  }
  return { meshes: ergebnis, quellen, verschmolzen, gescheitert };
}

/**
 * Das Volumen dessen, was eine STL enthielte: nur sichtbare Koerper, Gruppen
 * mit ihren Aussparungen verrechnet, Durchdringungen nur einmal gezaehlt.
 * Daraus schaetzt das Exportfenster Gewicht und Filament.
 */
/**
 * The bodies an export writes, with every hole left ungrouped taken out of the bodies it
 * reaches (#203) - as the view shades it, as grouping would cut it and as the STEP export
 * already did. Only the holes that go along count: with a selection, the selected ones.
 * A body cut away entirely drops out; one whose cut fails stays whole and is counted.
 */
export async function exportBodiesWithLooseHoles(visible: readonly WorkplaneShape[]) {
  const solids = visible.filter((shape) => !shape.hole && !isNonSolidShapeKind(shape.kind));
  const meshes = solids.map(meshForShape);
  const holes = visible.filter((shape) => shape.hole && !isNonSolidShapeKind(shape.kind));
  const untouched = { solids, meshes, cut: solids.map(() => false), holeCutsFailed: 0 };
  if (holes.length === 0 || solids.length === 0) return untouched;
  // Padded like a grouped cut, so a hole flush with a face goes cleanly through it.
  const cutters = holes.map((hole) => meshForShape(paddedCutterShape(hole)));
  const cutterBounds = cutters.map((mesh) => meshBounds(mesh.vertices));
  const reaching = meshes.map((mesh) => {
    const bounds = meshBounds(mesh.vertices);
    return cutters.filter((_, index) => Boolean(bounds && cutterBounds[index] && boundsOverlap(bounds, cutterBounds[index]!, -1e-4)));
  });
  if (reaching.every((list) => list.length === 0)) return untouched;
  const runtime = await getManifoldRuntime().catch(() => null);
  const keptSolids: WorkplaneShape[] = [];
  const keptMeshes: MeshData[] = [];
  const keptCut: boolean[] = [];
  let holeCutsFailed = 0;
  meshes.forEach((mesh, index) => {
    const cutting = reaching[index];
    if (cutting.length === 0) {
      keptSolids.push(solids[index]);
      keptMeshes.push(mesh);
      keptCut.push(false);
      return;
    }
    const created: ManifoldSolid[] = [];
    let result: MeshData | null = null;
    let emptied = false;
    try {
      if (!runtime) throw new Error("no manifold runtime");
      const ofMesh = (source: MeshData) => {
        const manifoldMesh = meshDataToManifoldMesh(runtime, source);
        try {
          const solid = runtime.Manifold.ofMesh(manifoldMesh);
          created.push(solid);
          return solid.status() === "NoError" && solid.numTri() > 0 ? solid : null;
        } finally {
          disposeManifold(manifoldMesh);
        }
      };
      const body = ofMesh(mesh);
      const tools = cutting.map(ofMesh);
      if (body && tools.every(Boolean)) {
        const cutter = tools.length === 1 ? tools[0]! : runtime.Manifold.union(tools as ManifoldSolid[]);
        created.push(cutter);
        const rest = body.subtract(cutter);
        created.push(rest);
        if (rest.status() === "NoError") {
          if (rest.numTri() > 0) result = manifoldMeshToMeshData(rest.getMesh(), mesh.name);
          else emptied = true;
        }
      }
    } catch {
      result = null;
    } finally {
      Array.from(new Set(created)).forEach(disposeManifold);
    }
    if (emptied) return;
    if (!result) holeCutsFailed += 1;
    keptSolids.push(solids[index]);
    keptMeshes.push(result ?? mesh);
    keptCut.push(Boolean(result));
  });
  return { solids: keptSolids, meshes: keptMeshes, cut: keptCut, holeCutsFailed };
}

export async function exportSolidVolume(source: readonly WorkplaneShape[]) {
  const { visible } = visibleExportShapes(source);
  const { solids, meshes: cut, holeCutsFailed } = await exportBodiesWithLooseHoles(visible);
  if (solids.length === 0) return { volumeMm3: 0, sideMm2: 0, flatMm2: 0, solids: 0, bodies: 0, unionFailed: 0 };
  const { meshes, gescheitert } = await unionOverlappingExportMeshes(solids, cut);
  const volumeMm3 = meshes.reduce((sum, mesh) => sum + Math.abs(closedMeshVolume(mesh.vertices, mesh.faces)), 0);
  // The surface, for the estimate with walls and infill (#320).
  const areas = meshes.map((mesh) => meshSurfaceAreas(mesh.vertices, mesh.faces));
  const sideMm2 = areas.reduce((sum, area) => sum + area.sideMm2, 0);
  const flatMm2 = areas.reduce((sum, area) => sum + area.flatMm2, 0);
  return { volumeMm3, sideMm2, flatMm2, solids: solids.length, bodies: meshes.length, unionFailed: gescheitert + holeCutsFailed };
}

export type ExportSolidVolume = Awaited<ReturnType<typeof exportSolidVolume>>;

export const PRINT_MATERIAL_STORAGE_KEY = "layerling.printMaterial";
export const PRINT_INFILL_STORAGE_KEY = "layerling.printInfill";
export const PRINT_WALLS_STORAGE_KEY = "layerling.printWalls";

export function formatEstimateNumber(value: number, digits: number) {
  return value.toLocaleString(numberLocale(), { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/**
 * Fuer die 3MF: Farben bleiben eigene Koerper, damit der Slicer sie Filamenten
 * zuordnen kann. Gleichfarbiges wird wie bei STL verschmolzen. Wo sich zwei
 * Farben durchdringen, gewinnt die spaeter angelegte Form - ein Logo, das in
 * einer Platte steckt, schneidet sich dort seine Tasche, statt dass zwei
 * Koerper denselben Raum beanspruchen (Discussion #79).
 */
/** Die Lage der Schnittebene fuer Dateiname und Titel: auf Zehntel, ohne ueberfluessige Nullen. */
export function formatSectionOffset(offset: number) {
  const rounded = Math.round(offset * 100) / 100;
  return String(Object.is(rounded, -0) ? 0 : rounded);
}

export const SECTION_SEEN_FROM_KEYS = {
  right: "camera.sectionSeenFromRight",
  top: "camera.sectionSeenFromTop",
  front: "camera.sectionSeenFromFront",
} as const;

/** Die sichtbaren Teile fuer einen Export, dazu der Satz, der die ausgeblendeten nennt. */
/** A bundle goes out as its parts, each a body of its own with its own colour; its holes cut nothing. */
export function expandBundles(source: readonly WorkplaneShape[]): WorkplaneShape[] {
  return source.flatMap((shape) => (
    shape.groupOperation === "bundle" && shape.groupedShapes?.length
      ? expandBundles(restoreGroupedChildren(shape)).filter((part) => !part.hidden)
      : [shape]
  ));
}

export function visibleExportShapes(source: readonly WorkplaneShape[]) {
  const shown = source.filter((shape) => !shape.hidden);
  const hidden = source.length - shown.length;
  const visible = expandBundles(shown);
  const hiddenNote = hidden === 0 ? "" : hidden === 1 ? t("status.exportHiddenSkippedOne") : t("status.exportHiddenSkippedMany", { count: hidden });
  return { visible, hiddenNote };
}

export type PartColorSolid = { probe: THREE.Mesh; box: THREE.Box3; color: string };

/**
 * The parts of a group that shows each part in its own colour (Multicolor), as solids in the
 * world, ready to ask "which part is this point in" (#153). A group cut into one mesh keeps its
 * parts in the frame of that mesh, standing on its lowest point; a group of separate parts in
 * the frame its children have before the group's own size and place are applied.
 */
export function multicolorExportSolids(shape: WorkplaneShape): PartColorSolid[] | null {
  if (shape.hole || !shape.groupedShapes?.length || !groupShowsPartColors(shape)) return null;
  const parts = shape.groupedShapes.filter((part) => !part.hole && !part.hidden);
  if (parts.length === 0 || new Set(parts.map((part) => part.color)).size < 2) return null;
  const imported = shape.importedMesh;
  let lowest = Number.POSITIVE_INFINITY;
  if (imported) for (let index = 1; index < imported.positions.length; index += 3) lowest = Math.min(lowest, imported.positions[index]);
  const scale = imported ? null : groupedContentScale(shape, localGroupBounds(shape.groupedShapes));
  const solids: PartColorSolid[] = [];
  parts.forEach((part) => {
    const local = meshForShape(part);
    if (local.faces.length === 0) return;
    let vertices: Vec3[];
    if (imported) {
      const flat = local.vertices.flatMap(([x, y, z]) => [x, y - (Number.isFinite(lowest) ? lowest : 0), z]);
      const resized = resizedImportedCoordinates(shape, flat);
      vertices = [];
      for (let index = 0; index + 2 < resized.length; index += 3) vertices.push([resized[index], resized[index + 1], resized[index + 2]]);
    } else {
      vertices = scaleGroupedVertices(local.vertices, scale!) as Vec3[];
    }
    const world = transformMesh({ name: local.name, vertices, faces: local.faces }, shape);
    const positions = new Float32Array(world.faces.length * 9);
    world.faces.forEach((face, faceIndex) => face.forEach((point, corner) => {
      const vertex = world.vertices[point];
      positions.set([vertex[0], vertex[1], vertex[2]], faceIndex * 9 + corner * 3);
    }));
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.computeBoundingBox();
    computeBoundsTree.call(geometry, { targetLeafSize: 12 });
    const probe = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
    probe.raycast = acceleratedRaycast;
    solids.push({ probe, box: geometry.boundingBox ?? new THREE.Box3(), color: part.color });
  });
  return solids.length ? solids : null;
}

const PART_COLOR_PROBE = new THREE.Vector3(0.5773, 0.5774, 0.5775).normalize();

/**
 * A colour for every face of an exported body: the colour of the part the face belongs to,
 * found a hair inside the face. A face in no part (a body merged in with it) keeps `fallback`.
 */
export function exportFaceColors(mesh: MeshData, solids: PartColorSolid[], fallback: string): string[] {
  const raycaster = new THREE.Raycaster();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const edge = new THREE.Vector3();
  const point = new THREE.Vector3();
  const near = 0.5;
  return mesh.faces.map(([ia, ib, ic]) => {
    a.fromArray(mesh.vertices[ia]);
    b.fromArray(mesh.vertices[ib]);
    c.fromArray(mesh.vertices[ic]);
    normal.subVectors(b, a).cross(edge.subVectors(c, a));
    const area = normal.length();
    if (area < 1e-12) return fallback;
    normal.divideScalar(area);
    point.addVectors(a, b).add(c).multiplyScalar(1 / 3).addScaledVector(normal, -0.02);
    for (const solid of solids) {
      if (!solid.box.containsPoint(point)) continue;
      raycaster.set(point, PART_COLOR_PROBE);
      if (raycaster.intersectObject(solid.probe, false).length % 2 === 1) return solid.color;
    }
    let best: PartColorSolid | null = null;
    let bestDistance = near;
    for (const solid of solids) {
      const distance = solid.box.distanceToPoint(point);
      if (distance <= bestDistance) {
        best = solid;
        bestDistance = distance;
      }
    }
    return best?.color ?? fallback;
  });
}

export async function colorSeparatedExportMeshes(shapes: WorkplaneShape[], meshes: MeshData[]) {
  const farben = exportColorGroups(shapes.map((shape) => shape.color));
  if (farben.length <= 1) {
    return unionOverlappingExportMeshes(shapes, meshes);
  }
  const koerper: { mesh: MeshData; quelle: number; farbe: number }[] = [];
  let verschmolzen = 0;
  let gescheitert = 0;
  for (const [farbe, gruppe] of farben.entries()) {
    const teil = await unionOverlappingExportMeshes(gruppe.map((index) => shapes[index]), gruppe.map((index) => meshes[index]));
    teil.meshes.forEach((mesh, index) => koerper.push({ mesh, quelle: gruppe[teil.quellen[index]], farbe }));
    verschmolzen += teil.verschmolzen;
    gescheitert += teil.gescheitert;
  }

  const grenzen = koerper.map((entry) => meshBounds(entry.mesh.vertices));
  // Echte Durchdringung, kein blosses Beruehren: das schneidet nichts weg.
  const durchdringt = (a: number, b: number) => {
    const ka = grenzen[a];
    const kb = grenzen[b];
    return Boolean(ka && kb && boundsOverlap(ka, kb, -1e-4));
  };
  const runtime = koerper.some((_, a) => koerper.some((entry, b) => entry.farbe !== koerper[a].farbe && durchdringt(a, b)))
    ? await getManifoldRuntime().catch(() => null)
    : null;

  const ergebnis: MeshData[] = [];
  const quellen: number[] = [];
  koerper.forEach((entry, index) => {
    const schneider = koerper
      .map((other, otherIndex) => ({ other, otherIndex }))
      .filter(({ other, otherIndex }) => other.farbe !== entry.farbe && other.quelle > entry.quelle && durchdringt(index, otherIndex));
    if (schneider.length === 0 || !runtime) {
      if (schneider.length > 0) gescheitert += 1;
      ergebnis.push(entry.mesh);
      quellen.push(entry.quelle);
      return;
    }
    const created: ManifoldSolid[] = [];
    let rest: MeshData | null = null;
    let leer = false;
    try {
      const ofMesh = (mesh: MeshData) => {
        const manifoldMesh = meshDataToManifoldMesh(runtime, mesh);
        try {
          const solid = runtime.Manifold.ofMesh(manifoldMesh);
          created.push(solid);
          return solid.status() === "NoError" && solid.numTri() > 0 ? solid : null;
        } finally {
          disposeManifold(manifoldMesh);
        }
      };
      const basis = ofMesh(entry.mesh);
      const werkzeuge = schneider.map(({ other }) => ofMesh(other.mesh));
      if (basis && werkzeuge.every(Boolean)) {
        const vereinigt = werkzeuge.length === 1 ? werkzeuge[0]! : runtime.Manifold.union(werkzeuge as ManifoldSolid[]);
        created.push(vereinigt);
        const differenz = basis.subtract(vereinigt);
        created.push(differenz);
        if (differenz.status() === "NoError") {
          if (differenz.numTri() > 0) rest = manifoldMeshToMeshData(differenz.getMesh(), entry.mesh.name);
          else leer = true;
        }
      }
    } catch {
      rest = null;
    } finally {
      Array.from(new Set(created)).forEach(disposeManifold);
    }
    if (leer) return;
    if (rest && rest.faces.length > 0) {
      ergebnis.push(rest);
    } else {
      gescheitert += 1;
      ergebnis.push(entry.mesh);
    }
    quellen.push(entry.quelle);
  });
  return { meshes: ergebnis, quellen, verschmolzen, gescheitert };
}

export function disposeManifold(value: unknown) {
  (value as { delete?: () => void } | null)?.delete?.();
}

async function manifoldBooleanMeshShape(selection: WorkplaneShape[], triangleLimit: number, options: { requireImported?: boolean; idPrefix?: string } = {}, groupChildren?: WorkplaneShape[]): Promise<WorkplaneShape | null> {
  // GROUPING SAFETY NOTE FOR FUTURE AGENTS:
  // Imported STL + hole grouping stays on exact boolean first. Rotated cutters
  // are validated against their real oriented volume, not their broad AABB.
  const solids = selection.filter((shape) => !shape.hole && !shape.locked);
  const holes = selection.filter((shape) => shape.hole);
  if (solids.length === 0 || holes.length === 0 || (options.requireImported !== false && !selection.some((shape) => Boolean(shape.importedMesh)))) {
    return null;
  }

  const sourceMesh = mergedSolidMeshData(solids);
  const cutterTriangleCount = holes.reduce((total, hole) => total + meshForShape(hole).faces.length, 0);
  if (sourceMesh.faces.length + cutterTriangleCount > triangleLimit) {
    return null;
  }
  const cutterShapes = holes.map(paddedCutterShape);
  const residualValidationShapes = holes;
  const sourceInteriorTriangles = cutterInteriorTriangleCount(sourceMesh, cutterShapes);
  const sourceTouchedTriangles = cutterTouchedTriangleCount(sourceMesh, cutterShapes);
  const sourceCutTriangles = Math.max(sourceInteriorTriangles, sourceTouchedTriangles);

  const created: ManifoldSolid[] = [];
  let result: ManifoldSolid | null = null;

  try {
    const runtime = await getManifoldRuntime();
    const solid = shapesToManifoldUnion(runtime, solids, created, true);
    const cutterSolid = shapesToManifoldUnion(runtime, holes.map(paddedCutterShape), created, true);
    if (!solid || !cutterSolid) {
      return null;
    }

    result = solid.subtract(cutterSolid);
    created.push(result);
    if (result.status() !== "NoError" || result.numTri() < 1) {
      return null;
    }

    const outputMesh = result.getMesh();
    const positions = manifoldMeshToPositions(outputMesh);
    const resultChanged = positionsDifferFromMeshData(positions, sourceMesh);
    if (!resultChanged) {
      return null;
    }
    const hasImportedOperand = selection.some((shape) => Boolean(shape.importedMesh));
    const canUseResidualInteriorValidation =
      !hasImportedOperand && holes.every((hole) => hole.kind === "box" && !hole.importedMesh && !hole.groupedShapes?.length);
    if (canUseResidualInteriorValidation) {
      const remainingInteriorTriangles = positionsInteriorTriangleCount(positions, residualValidationShapes, true);
      if (sourceCutTriangles > 0 && remainingInteriorTriangles > Math.max(12, Math.floor(sourceCutTriangles * 0.35))) {
        return null;
      }
    }

    const group = meshPositionsToGroupShape(selection, solids, positions, options.idPrefix ?? "grouped-manifold-cut", groupChildren);
    const usable = isUsableBooleanGroup(group, sourceMesh.faces.length);
    const changedEnough = sourceCutTriangles > 0 || !looksLikeUnchangedBooleanResult(group, sourceMesh.faces.length, true);
    if (!usable || !changedEnough) {
      return null;
    }
    return group;
  } catch {
    return null;
  } finally {
    Array.from(new Set(created)).forEach(disposeManifold);
  }
}

async function manifoldUnionMeshShape(selection: WorkplaneShape[], triangleLimit: number, groupChildren?: WorkplaneShape[]): Promise<WorkplaneShape | null> {
  const solids = selection.filter((shape) => !shape.hole && !shape.locked);
  if (solids.length < 2 || !selection.some((shape) => Boolean(shape.importedMesh))) {
    return null;
  }

  const mergedSourceMesh = mergedSolidMeshData(solids);
  if (mergedSourceMesh.faces.length > triangleLimit) {
    return null;
  }

  const created: ManifoldSolid[] = [];
  let result: ManifoldSolid | null = null;
  try {
    const runtime = await getManifoldRuntime();
    result = shapesToManifoldUnion(runtime, solids, created, true);
    if (!result) {
      return null;
    }
    if (result.status() !== "NoError" || result.numTri() < 1) {
      return null;
    }

    const outputMesh = result.getMesh();
    const positions = manifoldMeshToPositions(outputMesh);
    const group = meshPositionsToGroupShape(selection, solids, positions, "grouped-manifold-union", groupChildren);
    return isUsableBooleanGroup(group, mergedSourceMesh.faces.length, false) ? group : null;
  } catch {
    return null;
  } finally {
    Array.from(new Set(created)).forEach(disposeManifold);
  }
}

function asIntersectionGroup(group: WorkplaneShape): WorkplaneShape {
  return {
    ...group,
    name: "Intersection",
    hole: false,
  };
}

// Was miteinander geschnitten wird: entweder alle Koerper gegen alle
// Aussparungen (je Seite vereinigt, so war es seit 1.0.0) oder - ohne
// Aussparung in der Auswahl - jeder Koerper fuer sich, so dass nur bleibt,
// was alle gemeinsam haben. Die Anleitung versprach Letzteres immer schon,
// der Knopf blieb aber grau (Forum 617194).
export type IntersectionPlan = {
  operands: WorkplaneShape[][];
  colorSource: WorkplaneShape[];
  children: WorkplaneShape[];
};

function intersectionPlanForSelection(groupable: WorkplaneShape[]): IntersectionPlan | null {
  const candidates = groupable.filter((shape) => !shape.locked);
  if (candidates.some((shape) => shape.hole)) {
    const booleanSelection = expandGroupsForBoolean(candidates);
    const solids = booleanSelection.filter((shape) => !shape.hole);
    const holes = booleanSelection.filter((shape) => shape.hole);
    return solids.length && holes.length ? { operands: [solids, holes], colorSource: solids, children: booleanSelection } : null;
  }
  // Eine Gruppe zaehlt hier als ein Koerper, so wie sie aussieht - also mit
  // ihren Bohrungen, nicht als lose Teile.
  return candidates.length >= 2 ? { operands: candidates.map((shape) => [shape]), colorSource: candidates, children: candidates } : null;
}

export function canIntersectShapes(groupable: WorkplaneShape[]) {
  return intersectionPlanForSelection(groupable) !== null;
}

function intersectionOperandsOverlap(operands: WorkplaneShape[][]) {
  const [first, ...rest] = operands;
  return rest.every((operand) => hasSolidHoleOverlap(first, operand));
}

async function manifoldIntersectionMeshShape(plan: IntersectionPlan, triangleLimit: number): Promise<IntersectionAttempt> {
  const sourceTriangleCount = plan.children.reduce((total, shape) => total + meshForShape(shape).faces.length, 0);
  if (sourceTriangleCount > triangleLimit) {
    return { status: "unsupported" };
  }

  const created: ManifoldSolid[] = [];
  try {
    const runtime = await getManifoldRuntime();
    let result: ManifoldSolid | null = null;
    for (const operand of plan.operands) {
      const solid = shapesToManifoldUnion(runtime, operand, created, true);
      if (!solid) {
        return { status: "unsupported" };
      }
      if (!result) {
        result = solid;
        continue;
      }
      result = result.intersect(solid);
      created.push(result);
      if (result.status() !== "NoError") {
        return { status: "unsupported" };
      }
    }
    if (!result || result.numTri() < 1) {
      return { status: "empty" };
    }

    const outputMesh = result.getMesh();
    const positions = manifoldMeshToPositions(outputMesh);
    const group = meshPositionsToGroupShape(plan.children, plan.colorSource, positions, "grouped-manifold-intersection");
    return group && isUsableBooleanGroup(group, sourceTriangleCount, false)
      ? { status: "success", group: asIntersectionGroup(group) }
      : { status: "unsupported" };
  } catch {
    return { status: "unsupported" };
  } finally {
    Array.from(new Set(created)).forEach(disposeManifold);
  }
}

function bvhIntersectionMeshShape(plan: IntersectionPlan, operation: CSGOperation, idPrefix: string): IntersectionAttempt {
  // Die hohle Schnittmenge behaelt nur die Haut der ersten Seite - fuer mehr
  // als zwei Partner ist das keine Schnittmenge mehr.
  if (operation === HOLLOW_INTERSECTION && plan.operands.length !== 2) {
    return { status: "unsupported" };
  }

  try {
    const evaluator = new Evaluator();
    evaluator.useGroups = false;
    evaluator.attributes = ["position", "normal"];
    (evaluator as Evaluator & { useCDTClipping: boolean }).useCDTClipping = true;

    const operandBrushes = plan.operands.map((operand) => {
      let brush = brushFromShape(operand[0]);
      operand.slice(1).forEach((shape) => {
        brush = evaluator.evaluate(brush, brushFromShape(shape), ADDITION);
        brush.updateMatrixWorld(true);
      });
      return brush;
    });

    let result = operandBrushes[0];
    operandBrushes.slice(1).forEach((brush) => {
      result = evaluator.evaluate(result, brush, operation);
      result.updateMatrixWorld(true);
    });
    if (positionsFromGeometryDrawRange(result.geometry).length < 9) {
      return { status: "empty" };
    }

    const sourceTriangleCount = plan.operands[0].reduce((total, shape) => total + meshForShape(shape).faces.length, 0);
    const group = resultGeometryToMeshShape(plan.children, plan.colorSource, result.geometry, idPrefix);
    return group && isUsableBooleanGroup(group, sourceTriangleCount, false)
      ? { status: "success", group: asIntersectionGroup(group) }
      : { status: "unsupported" };
  } catch {
    return { status: "unsupported" };
  }
}

export async function buildIntersectionShapeFromSelection(groupable: WorkplaneShape[], triangleLimit: number): Promise<IntersectionBuildResult> {
  const plan = intersectionPlanForSelection(groupable);
  if (!plan) {
    return {
      group: null,
      empty: false,
      failureNotice: t("status.selectSolidAndHole"),
    };
  }

  if (!intersectionOperandsOverlap(plan.operands)) {
    return { group: null, empty: true, failureNotice: "" };
  }

  const manifoldAttempt = await manifoldIntersectionMeshShape(plan, triangleLimit);
  if (manifoldAttempt.status === "success") {
    return { group: manifoldAttempt.group, empty: false, failureNotice: "" };
  }
  if (manifoldAttempt.status === "empty") {
    return { group: null, empty: true, failureNotice: "" };
  }

  const exactAttempt = bvhIntersectionMeshShape(plan, INTERSECTION, "grouped-intersection");
  if (exactAttempt.status === "success") {
    return { group: exactAttempt.group, empty: false, failureNotice: "" };
  }
  const hasImportedMesh = plan.children.some((shape) => Boolean(shape.importedMesh));
  if (exactAttempt.status === "empty" && !hasImportedMesh) {
    return { group: null, empty: true, failureNotice: "" };
  }

  const hollowAttempt = bvhIntersectionMeshShape(plan, HOLLOW_INTERSECTION, "grouped-hollow-intersection");
  if (hollowAttempt.status === "success") {
    return { group: hollowAttempt.group, empty: false, failureNotice: "" };
  }
  if (hollowAttempt.status === "empty" || exactAttempt.status === "empty") {
    return { group: null, empty: true, failureNotice: "" };
  }

  return {
    group: null,
    empty: false,
    failureNotice: "Could not calculate this Intersection cleanly",
  };
}

function cutterInteriorTriangleCount(mesh: MeshData, cutters: WorkplaneShape[]) {
  return mesh.faces.reduce((total, [ai, bi, ci]) => {
    const centroid = triangleCentroid([mesh.vertices[ai], mesh.vertices[bi], mesh.vertices[ci]]);
    return total + (cutters.some((cutter) => pointInsideHoleShape(centroid, cutter)) ? 1 : 0);
  }, 0);
}

function geometryInteriorTriangleCount(geometry: THREE.BufferGeometry, cutters: WorkplaneShape[], strictInterior = false) {
  const positions = positionsFromGeometryDrawRange(geometry);
  let count = 0;
  for (let i = 0; i + 8 < positions.length; i += 9) {
    const centroid: Vec3 = [
      (positions[i] + positions[i + 3] + positions[i + 6]) / 3,
      (positions[i + 1] + positions[i + 4] + positions[i + 7]) / 3,
      (positions[i + 2] + positions[i + 5] + positions[i + 8]) / 3,
    ];
    if (cutters.some((cutter) => pointInsideHoleShape(centroid, cutter, strictInterior))) {
      count += 1;
    }
  }
  return count;
}

function clearsImportedCutVolume(geometry: THREE.BufferGeometry, sourceInteriorTriangles: number, cutters: WorkplaneShape[]) {
  if (sourceInteriorTriangles <= 0 || cutters.length === 0) {
    return true;
  }

  const remainingInteriorTriangles = geometryInteriorTriangleCount(geometry, cutters, true);
  return remainingInteriorTriangles <= Math.max(4, Math.floor(sourceInteriorTriangles * 0.05));
}

function importedBooleanMeshShape(selection: WorkplaneShape[], groupChildren?: WorkplaneShape[]): WorkplaneShape | null {
  const solids = selection.filter((shape) => !shape.hole && !shape.locked);
  const holes = selection.filter((shape) => shape.hole);
  if (solids.length === 0 || holes.length === 0 || !selection.some((shape) => Boolean(shape.importedMesh))) {
    return null;
  }

  const mergedSolidMesh = mergedSolidMeshData(solids);
  const sourceTriangleCount = mergedSolidMesh.faces.length;
  const cutterTriangleCount = holes.reduce((total, hole) => total + meshForShape(hole).faces.length, 0);
  if (sourceTriangleCount + cutterTriangleCount > IMPORTED_FALLBACK_BOOLEAN_TRIANGLE_LIMIT) {
    return null;
  }

  const cutterShapes = holes.map(paddedCutterShape);
  const hasImportedHole = holes.some(shapeIsImportedHole);
  const hasStraightImportedHole = holes.some((hole) => shapeIsImportedHole(hole) && !hasNonZeroRotation(hole));
  const sourceInteriorTriangles = cutterInteriorTriangleCount(mergedSolidMesh, cutterShapes);
  const sourceTouchedTriangles = cutterTouchedTriangleCount(mergedSolidMesh, cutterShapes);
  const sourceCutTriangles = Math.max(sourceInteriorTriangles, sourceTouchedTriangles);
  const baseAttempts: Array<{ operation: CSGOperation; idPrefix: string; rescueCoplanar?: boolean }> = [
    // Imported STLs are often not watertight. Hollow subtraction still lets the hole bite into triangle meshes.
    { operation: HOLLOW_SUBTRACTION, idPrefix: "grouped-import-hollow-cut" },
    { operation: SUBTRACTION, idPrefix: "grouped-import-cut" },
  ];
  const attempts = hasStraightImportedHole
    ? [
        ...baseAttempts,
        { operation: HOLLOW_SUBTRACTION, idPrefix: "grouped-import-rescue-hollow-cut", rescueCoplanar: true },
        { operation: SUBTRACTION, idPrefix: "grouped-import-rescue-cut", rescueCoplanar: true },
      ]
    : baseAttempts;

  for (const attempt of attempts) {
    try {
      const evaluator = new Evaluator();
      evaluator.useGroups = false;
      evaluator.attributes = ["position", "normal"];
      (evaluator as Evaluator & { useCDTClipping: boolean }).useCDTClipping = true;
      let result = new Brush(geometryFromMeshData(mergedSolidMesh));
      result.updateMatrixWorld(true);

      const operationHoles = attempt.rescueCoplanar ? holes.map(coplanarRescueCutterShape) : holes;
      operationHoles.forEach((hole) => {
        result = evaluator.evaluate(result, brushFromShape(hole, true), attempt.operation);
        result.updateMatrixWorld(true);
      });

      const group = resultGeometryToMeshShape(selection, solids, result.geometry, attempt.idPrefix, groupChildren);
      const resultPositions = positionsFromGeometryDrawRange(result.geometry);
      const resultChanged = geometryDiffersFromMeshData(result.geometry, mergedSolidMesh);
      const hasOpenCutBoundary = hasImportedHole && introducesOpenCutBoundary(resultPositions, mergedSolidMesh, operationHoles.map(paddedCutterShape));
      if (
        isUsableBooleanGroup(group, sourceTriangleCount) &&
        (sourceCutTriangles > 0 ? resultChanged : !looksLikeUnchangedBooleanResult(group, sourceTriangleCount, true)) &&
        !hasOpenCutBoundary &&
        clearsImportedCutVolume(result.geometry, sourceCutTriangles, operationHoles)
      ) {
        return group;
      }
    } catch {
      // Try the next boolean operation before giving up.
    }
  }

  return null;
}

function boxedBooleanMeshShape(selection: WorkplaneShape[], groupChildren?: WorkplaneShape[]): WorkplaneShape | null {
  const solids = selection.filter((shape) => !shape.hole && shape.kind === "box" && !shape.locked);
  const holes = selection.filter((shape) => shape.hole && shape.kind === "box");
  if (solids.length === 0 || holes.length === 0) {
    return null;
  }

  const cutters = holes.map((hole) => shapeAabb(paddedCutterShape(hole)));
  const cuboids = solids.flatMap((solid) => cutters.reduce<Cuboid[]>((parts, cutter) => parts.flatMap((part) => subtractCuboid(part, cutter)), [shapeAabb(solid)]));
  if (cuboids.length === 0) {
    return null;
  }

  const groupBounds = boundsForCuboids(cuboids);
  const centerX = (groupBounds.minX + groupBounds.maxX) / 2;
  const centerZ = (groupBounds.minZ + groupBounds.maxZ) / 2;
  const width = Math.max(MIN_SHAPE_DIMENSION, groupBounds.maxX - groupBounds.minX);
  const minY = groupBounds.minY;
  const height = Math.max(MIN_SHAPE_DIMENSION, groupBounds.maxY - groupBounds.minY);
  const depth = Math.max(MIN_SHAPE_DIMENSION, groupBounds.maxZ - groupBounds.minZ);
  const mesh = cuboidsToMesh("Group", cuboids, centerX, centerZ, minY);
  const positions = mesh.faces.flatMap(([ai, bi, ci]) => [mesh.vertices[ai], mesh.vertices[bi], mesh.vertices[ci]]).flat();
  const firstSolid = solids[0];

  return {
    id: createLocalId("grouped-boolean"),
    name: "Group",
    kind: "mesh",
    color: firstSolid.color,
    x: centerX,
    z: centerZ,
    elevation: minY,
    size: Math.max(width, depth),
    width,
    depth,
    height,
    rotation: 0,
    importedMesh: {
      positions,
      baseWidth: width,
      baseDepth: depth,
      baseHeight: height,
      triangleCount: Math.floor(positions.length / 9),
      sourceFormat: "json",
    },
    groupedBaseWidth: width,
    groupedBaseDepth: depth,
    groupedBaseHeight: height,
    groupedShapes: (groupChildren ?? selection).map((shape) => cloneAsGroupChild(shape, centerX, centerZ, minY)),
    locked: false,
    hidden: false,
  };
}

function cutFullyConsumesSolids(selection: WorkplaneShape[]) {
  const solids = selection.filter((shape) => !shape.hole && !shape.locked);
  const holes = selection.filter((shape) => shape.hole).map(paddedCutterShape);
  if (solids.length === 0 || holes.length === 0) {
    return false;
  }

  const sourceMesh = mergedSolidMeshData(solids);
  if (sourceMesh.faces.length === 0 || !hasSolidHoleOverlap(solids, holes)) {
    return false;
  }

  return sourceMesh.faces.every(([ai, bi, ci]) => {
    const triangle = [sourceMesh.vertices[ai], sourceMesh.vertices[bi], sourceMesh.vertices[ci]];
    const centroid: Vec3 = [
      (triangle[0][0] + triangle[1][0] + triangle[2][0]) / 3,
      (triangle[0][1] + triangle[1][1] + triangle[2][1]) / 3,
      (triangle[0][2] + triangle[1][2] + triangle[2][2]) / 3,
    ];
    return holes.some((hole) => pointInsideHoleShape(centroid, hole));
  });
}

function mergedMeshShape(selection: WorkplaneShape[], groupChildren?: WorkplaneShape[]): WorkplaneShape | null {
  const groupable = selection.filter((shape) => !shape.locked);
  if (groupable.length < 2) {
    return null;
  }

  // Keep imported STL/SVG groups as a baked mesh. The viewport child-group path rescales children to a wrapper box.
  const vertices: Vec3[] = [];
  const faces: [number, number, number][] = [];
  groupable.map(meshForShape).forEach((mesh) => {
    appendMeshData(vertices, faces, mesh);
  });

  if (vertices.length < 3 || faces.length < 1) {
    return null;
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  vertices.forEach(([x, y, z]) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    maxZ = Math.max(maxZ, z);
  });

  if (![minX, minY, minZ, maxX, maxY, maxZ].every(Number.isFinite)) {
    return null;
  }

  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const rawWidth = Math.max(MIN_SHAPE_DIMENSION, maxX - minX);
  const rawHeight = Math.max(MIN_SHAPE_DIMENSION, maxY - minY);
  const rawDepth = Math.max(MIN_SHAPE_DIMENSION, maxZ - minZ);
  const width = cleanModelDimension(rawWidth);
  const height = cleanModelDimension(rawHeight);
  const depth = cleanModelDimension(rawDepth);
  const positions: number[] = [];

  faces.forEach(([ai, bi, ci]) => {
    [vertices[ai], vertices[bi], vertices[ci]].forEach(([x, y, z]) => {
      positions.push(x - centerX, y - minY, z - centerZ);
    });
  });

  const firstSolid = groupable.find((shape) => !shape.hole) ?? groupable[0];
  const holeOnly = groupable.every((shape) => shape.hole);

  return {
    id: createLocalId("grouped-mesh"),
    name: "Group",
    kind: "mesh",
    color: holeOnly ? "#b8c2cc" : firstSolid.color,
    hole: holeOnly,
    x: centerX,
    z: centerZ,
    elevation: minY,
    size: Math.max(width, depth),
    width,
    depth,
    height,
    rotation: 0,
    importedMesh: {
      positions,
      baseWidth: rawWidth,
      baseDepth: rawDepth,
      baseHeight: rawHeight,
      triangleCount: faces.length,
      sourceFormat: "json",
    },
    groupedBaseWidth: width,
    groupedBaseDepth: depth,
    groupedBaseHeight: height,
    groupedShapes: (groupChildren ?? groupable).map((shape) => cloneAsGroupChild(shape, centerX, centerZ, minY)),
    locked: false,
    hidden: false,
  };
}

export function groupedShape(selection: WorkplaneShape[]): WorkplaneShape | null {
  const groupable = selection.filter((shape) => !shape.locked);
  if (groupable.length < 2) {
    return null;
  }

  const groupBounds = boundsForShapes(groupable);
  const minX = groupBounds.minX;
  const maxX = groupBounds.maxX;
  const minY = groupBounds.minY;
  const maxY = groupBounds.maxY;
  const minZ = groupBounds.minZ;
  const maxZ = groupBounds.maxZ;
  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const width = cleanModelDimension(Math.max(MIN_SHAPE_DIMENSION, maxX - minX));
  const depth = cleanModelDimension(Math.max(MIN_SHAPE_DIMENSION, maxZ - minZ));
  const height = cleanModelDimension(Math.max(MIN_SHAPE_DIMENSION, maxY - minY));
  const firstSolid = groupable.find((shape) => !shape.hole) ?? groupable[0];
  const holeOnly = groupable.every((shape) => shape.hole);

  return {
    id: createLocalId("group"),
    name: "Group",
    kind: "mesh",
    color: firstSolid.color,
    hole: holeOnly,
    x: centerX,
    z: centerZ,
    elevation: minY,
    size: Math.max(width, depth),
    width,
    depth,
    height,
    rotation: 0,
    groupedBaseWidth: width,
    groupedBaseDepth: depth,
    groupedBaseHeight: height,
    groupedShapes: groupable.map((shape) => cloneAsGroupChild(shape, centerX, centerZ, minY)),
    locked: false,
    hidden: false,
  };
}

export function quaternionForShape(shape: { rotation: number; rotationX?: number; rotationZ?: number }) {
  return new THREE.Quaternion().setFromEuler(
    new THREE.Euler(
      THREE.MathUtils.degToRad(shape.rotationX ?? 0),
      THREE.MathUtils.degToRad(shape.rotation),
      THREE.MathUtils.degToRad(shape.rotationZ ?? 0),
      "XYZ",
    ),
  );
}

export function rotationFromQuaternion(quaternion: THREE.Quaternion) {
  const euler = new THREE.Euler().setFromQuaternion(quaternion, "XYZ");
  return {
    rotationX: cleanRotationDegrees(THREE.MathUtils.radToDeg(euler.x)),
    rotation: cleanRotationDegrees(THREE.MathUtils.radToDeg(euler.y)),
    rotationZ: cleanRotationDegrees(THREE.MathUtils.radToDeg(euler.z)),
  };
}

export const ARROW_KEYS: ReadonlySet<string> = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]);

export function cleanShapePatch(patch: ShapeUpdatePatch): Partial<WorkplaneShape> {
  const { bakeTransform: _bakeTransform, ...rest } = patch;
  const next = { ...rest };
  if (typeof next.rotation === "number") {
    next.rotation = cleanRotationDegrees(next.rotation, 1);
  }
  if (typeof next.rotationX === "number") {
    next.rotationX = cleanRotationDegrees(next.rotationX, 1);
  }
  if (typeof next.rotationZ === "number") {
    next.rotationZ = cleanRotationDegrees(next.rotationZ, 1);
  }
  return next;
}

export function restoreGroupedChildren(group: WorkplaneShape): WorkplaneShape[] {
  const children = group.groupedShapes ?? [];
  if (children.length === 0) {
    return [];
  }

  const [sx, sy, sz] = groupedContentScale(group, localGroupBounds(children));
  const groupQuaternion = quaternionForShape(group);
  const groupReflection = new THREE.Matrix4().makeScale(mirrorSign(group.mirrorX), mirrorSign(group.mirrorY), mirrorSign(group.mirrorZ));
  const groupCenter = new THREE.Vector3(group.x, (group.elevation ?? 0) + group.height / 2, group.z);

  return children.map((child) => {
    // The group stretches along its own axes; a turned part has its width, height and depth on others.
    const childQuaternion = quaternionForShape(child);
    const partAxes = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)]
      .map((axis) => axis.applyQuaternion(childQuaternion).toArray() as [number, number, number]) as [[number, number, number], [number, number, number], [number, number, number]];
    const partScale = groupedPartSizeScale(partAxes, [sx, sy, sz]);
    const width = shapeWidth(child) * partScale.width;
    const depth = shapeDepth(child) * partScale.depth;
    const height = child.height * partScale.height;
    const localCenter = new THREE.Vector3(
      child.x * sx * mirrorSign(group.mirrorX),
      (((child.elevation ?? 0) + child.height / 2) * sy - group.height / 2) * mirrorSign(group.mirrorY),
      child.z * sz * mirrorSign(group.mirrorZ),
    ).applyQuaternion(groupQuaternion);
    const worldCenter = groupCenter.clone().add(localCenter);
    const childRotationMatrix = new THREE.Matrix4()
      .makeRotationFromQuaternion(groupQuaternion)
      .multiply(groupReflection)
      .multiply(new THREE.Matrix4().makeRotationFromQuaternion(quaternionForShape(child)))
      .multiply(groupReflection);
    const childRotation = rotationFromQuaternion(new THREE.Quaternion().setFromRotationMatrix(childRotationMatrix));
    const restored: WorkplaneShape = {
      ...child,
      id: derivedLocalId(child.id, "ungroup"),
      x: worldCenter.x,
      z: worldCenter.z,
      elevation: worldCenter.y - height / 2,
      width,
      depth,
      height,
      size: resizedShapeSize(width, depth),
      rotation: childRotation.rotation,
      rotationX: childRotation.rotationX,
      rotationZ: childRotation.rotationZ,
      mirrorX: Boolean(child.mirrorX) !== Boolean(group.mirrorX) || undefined,
      mirrorY: Boolean(child.mirrorY) !== Boolean(group.mirrorY) || undefined,
      mirrorZ: Boolean(child.mirrorZ) !== Boolean(group.mirrorZ) || undefined,
      hidden: group.hidden ? true : child.hidden,
    };
    return canonicalizeShape(group.hole && !children.some((c) => c.hole) ? withHoleMode(restored, true) : restored);
  });
}

/**
 * The bodies of a group for the edge tool, with the groups inside it opened where that changes nothing:
 * a group of nothing but holes (the usual way to cut a pattern) or of nothing but solids. Left closed it
 * reaches the kernel as one mesh of several loose pieces, and its curves are facets there; opened, every
 * hole is the exact shape it was. A group that mixes solids and holes cuts only its own solids, so it stays closed (#394).
 */
export function restoreGroupedChildrenForEdges(group: WorkplaneShape): WorkplaneShape[] {
  return restoreGroupedChildren(group).flatMap((child) => {
    const grandChildren = child.groupedShapes ?? [];
    const opensCleanly = grandChildren.length > 0
      && !child.importedMesh
      && !shapeHasShapeDeform(child)
      && (child.groupOperation === undefined || child.groupOperation === "group")
      && (grandChildren.every((part) => part.hole) || grandChildren.every((part) => !part.hole))
      && (child.hole || grandChildren.every((part) => !part.hole));
    return opensCleanly ? restoreGroupedChildrenForEdges(child) : [child];
  });
}

function expandGroupsForBoolean(selection: WorkplaneShape[]): WorkplaneShape[] {
  return selection.flatMap((shape) => {
    if (shape.importedMesh) {
      return [shape];
    }
    return shape.groupedShapes?.length ? restoreGroupedChildren(shape) : [shape];
  });
}

function expandGroupsForBoxBoolean(selection: WorkplaneShape[]): WorkplaneShape[] {
  return selection.flatMap((shape) => (shape.groupedShapes?.length ? restoreGroupedChildren(shape) : [shape]));
}

function canUseBoxBoolean(selection: WorkplaneShape[]) {
  return selection.every(isAxisAlignedBoxCutter);
}

function hasNonZeroRotation(shape: WorkplaneShape) {
  const rotation = Math.abs(normalizeDegrees(shape.rotation));
  const rotationX = Math.abs(normalizeDegrees(shape.rotationX ?? 0));
  const rotationZ = Math.abs(normalizeDegrees(shape.rotationZ ?? 0));
  return [rotation, rotationX, rotationZ].some((value) => value > 0.001 && Math.abs(value - 360) > 0.001);
}

/**
 * Why a cut with an imported mesh did not come about. Above the kernel's limit
 * the triangle count alone is the reason; between the two limits the kernel
 * was tried and refused the mesh, and only the fallback stopped at the count.
 */
function importedCutFailureNotice(selection: WorkplaneShape[], succeeded: boolean, triangleLimit: number) {
  const fallback = "Could not cut this imported mesh cleanly";
  if (succeeded) return fallback;
  const triangleCount = selection
    .filter((shape) => !shape.locked || shape.hole)
    .reduce((total, shape) => total + (shape.importedMesh?.triangleCount ?? meshForShape(shape).faces.length), 0);
  if (triangleCount > triangleLimit) {
    return t("status.cutTooComplex", { triangles: formatTriangleCount(triangleCount), limit: formatTriangleCount(triangleLimit) });
  }
  if (triangleCount > IMPORTED_FALLBACK_BOOLEAN_TRIANGLE_LIMIT) {
    return t("status.cutNotWatertightTooComplex", { triangles: formatTriangleCount(triangleCount), limit: formatTriangleCount(IMPORTED_FALLBACK_BOOLEAN_TRIANGLE_LIMIT) });
  }
  return fallback;
}

/**
 * How many edges of the solids' surface belong to one triangle only: the gaps of a mesh that is not
 * closed. A STEP part's surface can have a few cracks, and the clean cut refuses such a mesh.
 */
export function openSurfaceEdgeCount(solids: WorkplaneShape[]) {
  return positionsBoundaryEdges(meshDataPositions(mergedSolidMeshData(solids))).length;
}

/** The fallback cut ("hollow subtraction") takes the material away but does not cap the cut face. */
const OPEN_CUT_ID = /^grouped-import-(?:rescue-)?hollow-cut/;

export async function buildGroupedShapeFromSelection(groupable: WorkplaneShape[], triangleLimit: number): Promise<GroupBuildResult> {
  const booleanSelection = expandGroupsForBoolean(groupable);
  const hasSolid = booleanSelection.some((shape) => !shape.hole);
  const hasHole = booleanSelection.some((shape) => shape.hole);
  const hasImportedMesh = booleanSelection.some((shape) => Boolean(shape.importedMesh));
  const boxBooleanSelection = hasSolid && hasHole ? expandGroupsForBoxBoolean(groupable) : [];
  // Der Boolesche Kern rechnet auf der geflachten Auswahl, aber das Ergebnis
  // soll trotzdem die urspruenglichen, ungeflachten Formen als seine
  // "groupedShapes" tragen - sonst geht eine mitgebrachte Gruppe (z. B. vier
  // gruppierte Gewinde) beim Vereinigen verloren, weil sie ab da nur noch
  // als vier einzelne Kinder existiert (Forum: Gruppe verschwindet beim
  // Aufloesen einer Vereinigung, die eine Gewinde-Gruppe enthielt).
  const cleanBoxGroup = canUseBoxBoolean(boxBooleanSelection) ? boxedBooleanMeshShape(boxBooleanSelection, groupable) : null;
  const manifoldCutGroup = hasSolid && hasHole ? await manifoldBooleanMeshShape(booleanSelection, triangleLimit, { requireImported: false }, groupable) : null;
  const manifoldImportedMerge = hasImportedMesh && hasSolid && !hasHole ? await manifoldUnionMeshShape(booleanSelection, triangleLimit, groupable) : null;
  const exactImportedGroup = hasImportedMesh && hasSolid && hasHole ? manifoldCutGroup ?? importedBooleanMeshShape(booleanSelection, groupable) : null;
  const bakedImportedMerge = hasImportedMesh && !(hasSolid && hasHole) ? manifoldImportedMerge ?? mergedMeshShape(booleanSelection, groupable) : null;
  const group = hasSolid && hasHole
    ? cleanBoxGroup ??
      exactImportedGroup ??
      (hasImportedMesh
        ? null
        : manifoldCutGroup ?? booleanMeshShape(booleanSelection, groupable))
    : hasImportedMesh
      ? bakedImportedMerge ?? groupedShape(groupable)
      : groupedShape(groupable);
  const consumed = !group && hasSolid && hasHole && cutFullyConsumesSolids(booleanSelection);
  // The cut was made, but the fallback left its face open: say so when the cause is gaps in the surface (#346).
  const openGapEdges = group && hasImportedMesh && hasSolid && hasHole && OPEN_CUT_ID.test(group.id)
    ? openSurfaceEdgeCount(booleanSelection.filter((shape) => !shape.hole && !shape.locked))
    : 0;
  // Above the limit the solids are only laid together, not merged: an export keeps them overlapping.
  const unmergedTriangles = group && group === bakedImportedMerge && !manifoldImportedMerge && hasSolid
    ? group.importedMesh?.triangleCount ?? 0
    : 0;
  const mergeWarning = unmergedTriangles > triangleLimit
    ? t("status.groupNotMerged", { triangles: formatTriangleCount(unmergedTriangles), limit: formatTriangleCount(triangleLimit) })
    : undefined;
  return {
    group,
    openGapEdges,
    mergeWarning,
    booleanSelection,
    hasSolid,
    hasHole,
    hasImportedMesh,
    consumed,
    failureNotice: hasImportedMesh && hasSolid && hasHole
      ? importedCutFailureNotice(booleanSelection, Boolean(group) || consumed, triangleLimit)
      : hasSolid && hasHole ? "Could not cut this selection" : "Could not group this selection",
  };
}
