
import { bentTubeParameterPatch, bentTubeProfileRadii, bentTubeSettings } from "@/lib/bentTubeGeometry";
import { BUNDLE_SCOPE_BASE } from "@/lib/cadModifierGroups";
import { removeLooseSplinters } from "@/lib/meshSplinters";
import { closeSmallMeshHoles } from "@/lib/meshHoleFill";
import { meshIsConvex } from "@/lib/meshConvexity";
import type { ManifoldToplevel } from "manifold-3d";
import { loadedManifoldRuntime } from "@/lib/manifoldHandle";
import { ADDITION, Brush, Evaluator, HOLLOW_INTERSECTION, HOLLOW_SUBTRACTION, INTERSECTION, SUBTRACTION, type CSGOperation } from "three-bvh-csg";
import * as THREE from "three";
import { numberLocale, t } from "@/lib/i18n";
import { currentLengthUnitLabel, formatLengthMm } from "@/lib/measurementUnits";
import { sphereTessellation } from "@/lib/sphereTessellation";
import { groupDisplayMergeable, groupShowsPartColors } from "@/lib/groupColors";
import { gridfinityLabelColor, gridfinityLetterMeshes } from "@/lib/gridfinityLetterColor";
import { acceleratedRaycast, computeBoundsTree } from "three-mesh-bvh";
import { groupCanKeepParts, groupedContentScale, groupedPartSizeScale, scaleGroupedVertices, type GroupPartPlacement } from "@/lib/groupScale";
import { applySplitConnectors, dropSplitSlivers, planSplitConnectors, splitByPlaneClearOfFaces, unionSplitManifoldComponents } from "@/lib/manifoldSplit";
import { paintedWorldMesh } from "@/lib/paintMesh";
import { addConnectorTallies, NO_CONNECTORS, splitFramePoint, tongueOutlines, type SplitConnectorKind, type SplitConnectorOptions, type SplitConnectorTally, type SplitTongueOutline } from "@/lib/splitConnectors";
import { splitAxisLabel, splitPlaneIntersectsPoints, splitShapeFromWorldPositions, type ModelSplitPlane } from "@/lib/modelSplit";
import { starSettingsForSize } from "@/lib/starGeometry";
import { canonicalizeShape, cleanRotationDegrees, isNonSolidShape, meshYawDegrees, mirrorSign, normalizeDegrees, resizedImportedCoordinates, resizedShapeSize, shapeDepth, shapeHasShapeDeform, shapeHasTaper, shapeTaperDimensions, shapeWidth, withHoleMode } from "@/lib/workplaneShapes";
import { closedMeshVolume } from "@/lib/cadProfileExtrusion";
import { meshSurfaceAreas } from "@/lib/printEstimate";
import { createLocalId, derivedLocalId } from "@/lib/localIds";
import { boundsOverlap, exportColorGroups, meshBounds, overlappingExportClusters } from "@/lib/exportUnion";
import type { WorkplaneShape } from "@/types/layerling";
import { cylinderToEllipsePatch } from "@/lib/cylinderToEllipse";
import { pointInDrillPoint, shapeDrillPointAngle } from "@/lib/drillPoint";
import { tubeBeforeEdgeTreatments } from "@/lib/edgeTreatmentHistory";
import { type Vec3, type MeshData, type Cuboid, type ShapeUpdatePatch, type ManifoldSolid, CUTTER_PADDING, CUTTER_LATERAL_PADDING, POINT_TOLERANCE, CUTTER_RESIDUAL_INSET, MIN_SHAPE_DIMENSION, IMPORTED_FALLBACK_BOOLEAN_TRIANGLE_LIMIT, COPLANAR_BOOLEAN_RESCUE_DEGREES, cleanModelDimension, getManifoldRuntime, transformMesh, meshForShape, groupedContentMesh, deformFrameOf, appendMeshData, formatTriangleCount, shapeAabb, boundsForShapesOfVertices, boundsForCuboids, meshAabb, geometryFromMeshData, positionsFromGeometryDrawRange, boundsForPositions, positionsDifferFromMeshData, geometryDiffersFromMeshData, positionsBoundaryEdges, meshDataPositions, midpoint, localGroupBounds } from "@/lib/editorMeshCore";

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
  /** How many small openings of an open mesh were capped so the kernel took it (#791). */
  closedHoles?: number;
  /**
   * The solids were grouped by laying their meshes together, not merged into one, because they have
   * more triangles than the limit.
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
  // It is a scale round the middle, which only widens a simple shape all round. An imported, sketched or grouped
  // cutter is scaled as a whole, so both walls of a strip far from its middle move the same way: a copy set to hole
  // then left a thin wall of the part standing (#607). Those keep their width and depth exactly.
  const lateral = widensEvenlyWhenScaled(shape) ? CUTTER_LATERAL_PADDING : 0;
  const width = shapeWidth(shape) + lateral * 2;
  const depth = shapeDepth(shape) + lateral * 2;
  return {
    ...shape,
    width,
    depth,
    height,
    size: Math.max(width, depth),
    elevation: (shape.elevation ?? 0) - CUTTER_PADDING,
    baseRadius: shape.baseRadius ? shape.baseRadius + lateral : shape.baseRadius,
  };
}

/**
 * A shape of its own outline - not an imported mesh, a sketch body, a text or a group of parts - or a mesh
 * without any inward bulge, such as a box with a fillet. A filleted hole flush with a wall got no widening
 * and left a skin of no thickness on that wall (#928).
 */
function widensEvenlyWhenScaled(shape: WorkplaneShape) {
  if (shape.groupedShapes?.length || shape.kind === "text") return false;
  if (!shape.importedMesh && !shape.sketchProfile) return true;
  return !!shape.importedMesh && meshIsConvex(shape.importedMesh.positions);
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

    if (shape.kind === "cylinder" || shape.kind === "ellipse" || shape.kind === "sphere" || shape.kind === "halfSphere" || shape.kind === "paraboloid" || shape.kind === "curvedCone" || shape.kind === "cone" || shape.kind === "torus" || shape.kind === "tube" || shape.kind === "ring") {
      const nx = local.x / Math.max(POINT_TOLERANCE, innerHalfWidth);
      const nz = local.z / Math.max(POINT_TOLERANCE, innerHalfDepth);
      return nx * nx + nz * nz < 1;
    }

    return Math.abs(local.x) < innerHalfWidth && Math.abs(local.z) < innerHalfDepth;
  }

  const insideHeight = localY >= -POINT_TOLERANCE && localY <= shape.height + POINT_TOLERANCE;
  if (!insideHeight) {
    // A drill point reaches below the bottom (Discussion #621). The strict test above leaves it out, so a face on
    // its cone is never counted as a piece left inside the hole.
    return localY < 0 && pointInDrillPoint(shape, local.x, localY, local.z, POINT_TOLERANCE);
  }

  if (shape.kind === "cylinder" || shape.kind === "ellipse" || shape.kind === "sphere" || shape.kind === "halfSphere" || shape.kind === "paraboloid" || shape.kind === "curvedCone" || shape.kind === "cone" || shape.kind === "torus" || shape.kind === "tube" || shape.kind === "ring") {
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

/**
 * The openings capped, and the ones too large to cap, since the last `takeHoleFillTally`, per mesh:
 * one task may build the same body more than once.
 */
let holeFillTally = new Map<string, { closed: number; open: number }>();

export function takeHoleFillTally() {
  const values = [...holeFillTally.values()];
  holeFillTally = new Map();
  return { closed: values.reduce((sum, entry) => sum + entry.closed, 0), open: values.reduce((sum, entry) => sum + entry.open, 0) };
}

function noteHoleFill(data: MeshData, closed: number, open: number) {
  if (closed === 0 && open === 0) return;
  holeFillTally.set(`${data.faces.length}|${data.vertices.length}|${data.vertices[0]?.join(",") ?? ""}`, { closed, open });
}

function manifoldOfMeshData(runtime: ManifoldToplevel, data: MeshData) {
  const mesh = meshDataToManifoldMesh(runtime, data);
  try {
    return runtime.Manifold.ofMesh(mesh);
  } finally {
    disposeManifold(mesh);
  }
}

/**
 * The solid of a mesh. A mesh with small openings (an OBJ figure whose eyes are left open, #791)
 * is refused by the kernel as "Not manifold"; its openings are then capped and the mesh is tried
 * again, and the tally says how many were capped or stayed open for the message.
 */
export function manifoldFromMeshData(runtime: ManifoldToplevel, data: MeshData): ManifoldSolid {
  let solid: ManifoldSolid | null = null;
  let refusal: unknown = null;
  try {
    solid = manifoldOfMeshData(runtime, data);
    if (solid.status() === "NoError") return solid;
  } catch (error) {
    refusal = error;
  }
  const repair = closeSmallMeshHoles(data);
  if (repair.closed > 0) {
    try {
      const repaired = manifoldOfMeshData(runtime, repair.mesh);
      if (repaired.status() === "NoError") {
        disposeManifold(solid);
        noteHoleFill(data, repair.closed, repair.open);
        return repaired;
      }
      disposeManifold(repaired);
    } catch {
      // The capped mesh is refused too; the first answer stands.
    }
  }
  noteHoleFill(data, 0, repair.open);
  if (solid) return solid;
  throw refusal;
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
  // A mirrored shape is mirrored about its own middle before it is turned, as transformMesh does it. A box, a sphere
  // and an even cylinder look the same either way, a cone with two radii does not: it came out upside down (#1733).
  if (shape.mirrorX || shape.mirrorY || shape.mirrorZ) {
    matrix.multiply(new THREE.Matrix4().makeScale(mirrorSign(shape.mirrorX), mirrorSign(shape.mirrorY), mirrorSign(shape.mirrorZ)));
  }
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

  // A drilled hole ends in a cone (Discussion #621), which the kernel's cylinder has not: it takes its mesh.
  if ((shape.kind === "cylinder" && shapeDrillPointAngle(shape) === undefined) || shape.kind === "ellipse" || shape.kind === "cone") {
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

/**
 * The kernel's own box, sphere or cylinder with its corners rounded to 32 bits, as every mesh is on its way into the
 * kernel. Built from its own numbers, a face at -58.45, which 32 bits cannot hold, lay a millionth of a millimetre
 * away from the same face of a mesh, and a hole through both left that gap standing as a skin of no thickness (#1334).
 */
function onMeshGrid(runtime: ManifoldToplevel, solid: ManifoldSolid | null, created: ManifoldSolid[]) {
  if (!solid || solid.status() !== "NoError" || solid.numTri() < 1) return solid;
  const snapped = runtime.Manifold.ofMesh(solid.getMesh());
  created.push(snapped);
  return snapped.status() === "NoError" && snapped.numTri() > 0 ? snapped : solid;
}

export function shapeToManifoldSolid(runtime: ManifoldToplevel, shape: WorkplaneShape, created: ManifoldSolid[], useBoxPrimitive = false) {
  if (useBoxPrimitive && isAxisAlignedBoxCutter(shape)) {
    return onMeshGrid(runtime, primitiveManifoldForShape(runtime, shape, created) ?? boxBoundsToManifold(runtime, meshAabb(shape), created), created);
  }

  const primitive = onMeshGrid(runtime, primitiveManifoldForShape(runtime, shape, created), created);
  if (primitive) {
    return primitive;
  }

  const solid = manifoldFromMeshData(runtime, meshForShape(shape));
  // Listed before it is checked: a solid that did not close is the caller's to report and `created`'s to free.
  created.push(solid);
  if (solid.status() !== "NoError") return solid;
  // A group of solids is the loose pile of its parts' surfaces, and parts that
  // overlap or lie on top of one another (a frame whose posts stand in its
  // rails) are several shells in one mesh. A cut through such a pile comes out
  // wrong, so the shells are joined into one body first.
  const normalized = unionSplitManifoldComponents(runtime, solid);
  created.push(...normalized.created);
  return normalized.solid ?? solid;
}

function shapesToManifoldUnion(runtime: ManifoldToplevel, shapes: WorkplaneShape[], created: ManifoldSolid[], useBoxPrimitive = false) {
  const parts: ManifoldSolid[] = [];
  for (const shape of shapes) {
    const part = shapeToManifoldSolid(runtime, shape, created, useBoxPrimitive);
    if (!part || part.status() !== "NoError" || part.numTri() < 1) {
      // One listed in `created` is freed there; freeing it here as well would free it twice, which manifold refuses.
      if (part && !created.includes(part)) disposeManifold(part);
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

type SplitPlaneArgs = Pick<ModelSplitPlane, "axis" | "normal" | "position">;

/**
 * The two halves of a shape's solid, cut by the plane with the skins of no thickness dropped, and the solid they were cut
 * from; or why there are none. What it makes goes into `created`, for the caller to free.
 */
async function splitShapeHalves(shape: WorkplaneShape, plane: SplitPlaneArgs, created: ManifoldSolid[]) {
  const runtime = await getManifoldRuntime();
  let solid = shapeToManifoldSolid(runtime, shape, created);
  if (!solid || solid.status() !== "NoError" || solid.numTri() < 1) {
    return { error: openHolesError() ?? t("split.error.notClosed", { status: solid?.status() ?? "empty" }) };
  }
  const { closed: closedHoles } = takeHoleFillTally();
  created.push(solid);
  const normalized = unionSplitManifoldComponents(runtime, solid);
  created.push(...normalized.created);
  if (!normalized.solid) {
    return { error: t("split.error.overlapping") };
  }
  solid = normalized.solid;
  const [rawPositive, rawNegative] = splitByPlaneClearOfFaces(solid, plane.normal, plane.position);
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
    return { error: t("split.error.emptyHalf") };
  }
  return { runtime, solid, positive, negative, closedHoles };
}

/**
 * Splits a shape in two with the plane: the two halves, named after their side, and with `connectors` (Discussion #832)
 * the holes, pegs and loose dowels that line them up again (splitConnectors.ts) - the dowels as a third body beside them.
 * A hole is split without: it has nothing to line up.
 */
export async function splitShapeByPlane(shape: WorkplaneShape, plane: SplitPlaneArgs, connectors?: SplitConnectorOptions) {
  const created: ManifoldSolid[] = [];
  takeHoleFillTally();
  try {
    const halves = await splitShapeHalves(shape, plane, created);
    if ("error" in halves) {
      return { parts: null, error: halves.error };
    }
    const { runtime, closedHoles } = halves;
    let { positive, negative } = halves;
    let pins: ManifoldSolid | null = null;
    let tally: SplitConnectorTally | null = null;
    if (connectors && connectors.kind !== "none" && !shape.hole) {
      const plan = planSplitConnectors(runtime, positive, negative, plane.normal, plane.position, connectors, created);
      ({ positive, negative, pins } = applySplitConnectors(runtime, positive, negative, plan, connectors, halves.solid.boundingBox(), created));
      tally = plan.tally;
      if (positive.status() !== "NoError" || negative.status() !== "NoError" || positive.numTri() < 1 || negative.numTri() < 1) {
        return { parts: null, error: t("split.error.emptyHalf") };
      }
    }

    const positiveMesh = positive.getMesh();
    const negativeMesh = negative.getMesh();
    const pinsMesh = pins?.getMesh() ?? null;
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
      const pinsShape = pinsMesh
        ? splitShapeFromWorldPositions(shape, manifoldMeshToPositions(pinsMesh), createLocalId(`${shape.id}-split-dowels`), t("split.dowelsName", { name: shape.name }))
        : null;
      if (!positiveShape || !negativeShape || (pinsMesh && !pinsShape)) {
        return { parts: null, error: t("split.error.store") };
      }
      // Dowels on a breakaway base say so, for the print check (#1633).
      const dowels = pinsShape && connectors?.kind === "dowels" && connectors.dowelBase ? { ...pinsShape, breakawayBase: true } : pinsShape;
      const parts: WorkplaneShape[] = [canonicalizeShape(positiveShape), canonicalizeShape(negativeShape), ...(dowels ? [canonicalizeShape(dowels)] : [])];
      return { parts, closedHoles, ...(tally ? { connectors: tally } : {}) };
    } finally {
      disposeManifold(positiveMesh);
      disposeManifold(negativeMesh);
      disposeManifold(pinsMesh);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error ?? "");
    return { parts: null, error: openHolesError() ?? (message ? t("split.error.kernel", { message }) : t("split.error.kernelUnknown")) };
  } finally {
    Array.from(new Set(created)).forEach(disposeManifold);
  }
}

/** Longest a body is made longer or shorter in one stretch (Discussions #506, #1569), in mm. */
export const MAX_STRETCH_LENGTH = 1000;
/**
 * How far the pieces of a stretch reach into each other, in mm. Laid exactly face to face, Manifold's union can keep
 * them as separate shells where a tilted cut leaves its faces a rounding apart, or where the filler meets a floor over
 * only part of its face; this much overlap joins them for sure and is far below what a printer shows.
 */
const STRETCH_OVERLAP = 1e-3;
/**
 * How thin (mm) a triangle at a stretch's seams may be before the kernel folds it away. Where the overlap meets a slanted
 * or rounded wall, the union leaves slivers thinner than it along both seams and the filler's sides - over a thousand on
 * a ramp, drawn as black lines and left standing as remnants after a later cut (Discussion #1569); twice the overlap
 * folds them, as they would never print.
 */
const STRETCH_SEAM_TOLERANCE = 2 * STRETCH_OVERLAP;

/** What the Split panel's Stretch starts with, in mm. */
export const DEFAULT_STRETCH_LENGTH = 10;

/** A stretch's length for the status line, in the workspace's unit, without trailing zeros: "20 mm", "12.5 mm", "1⅝ in". */
export function stretchLengthLabel(length: number) {
  const shown = formatLengthMm(Math.abs(length), 2);
  return `${/^\d+\.\d+$/.test(shown) ? String(Number(shown)) : shown} ${currentLengthUnitLabel()}`;
}

/** The status line after a stretch: how many objects got how much longer or shorter. */
export function stretchNotice(length: number, count: number, lengthLabel: string) {
  const key = length > 0
    ? count === 1 ? "status.stretchLongerOne" : "status.stretchLongerMany"
    : count === 1 ? "status.stretchShorterOne" : "status.stretchShorterMany";
  return t(key, { count, length: lengthLabel });
}

/**
 * The rotation that turns `unit` onto +z, and its inverse, as Manifold's column-major matrices: the rows of the rotation
 * are two directions square to the normal and the normal itself, so it keeps the hand of the space.
 */
function rotationOntoZ(unit: Vec3) {
  const helper: Vec3 = Math.abs(unit[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  const dot = helper[0] * unit[0] + helper[1] * unit[1] + helper[2] * unit[2];
  const rawU: Vec3 = [helper[0] - dot * unit[0], helper[1] - dot * unit[1], helper[2] - dot * unit[2]];
  const lengthU = Math.hypot(...rawU);
  const u: Vec3 = [rawU[0] / lengthU, rawU[1] / lengthU, rawU[2] / lengthU];
  const v: Vec3 = [unit[1] * u[2] - unit[2] * u[1], unit[2] * u[0] - unit[0] * u[2], unit[0] * u[1] - unit[1] * u[0]];
  type Mat4 = Parameters<ManifoldSolid["transform"]>[0];
  const onto = [u[0], v[0], unit[0], 0, u[1], v[1], unit[1], 0, u[2], v[2], unit[2], 0, 0, 0, 0, 1] as Mat4;
  const back = [u[0], u[1], u[2], 0, v[0], v[1], v[2], 0, unit[0], unit[1], unit[2], 0, 0, 0, 0, 1] as Mat4;
  return { onto, back };
}

/**
 * Makes a shape longer at the plane (Discussions #506, #1569): the part on the side the plane's normal points to moves
 * `length` mm along it, and the cut through the body at the plane, drawn out over that length, fills the gap - so a case
 * gets longer through its straight walls while the compartments and rounded corners on either side keep their size. A
 * negative length shortens it instead: a slice that thick comes out on that side of the plane, and the part beyond moves
 * back to close the gap. One body comes back, a mesh, under the shape's name.
 */
export async function stretchShapeByPlane(
  shape: WorkplaneShape,
  plane: SplitPlaneArgs,
  length: number,
): Promise<{ parts: WorkplaneShape[]; closedHoles: number; connectors?: SplitConnectorTally } | { parts: null; error: string }> {
  const created: ManifoldSolid[] = [];
  takeHoleFillTally();
  try {
    if (!Number.isFinite(length) || Math.abs(length) < 0.001) return { parts: null, error: t("split.error.stretchZero") };
    const halves = await splitShapeHalves(shape, plane, created);
    if ("error" in halves) return { parts: null, error: halves.error ?? t("split.error.failedDefault") };
    const { runtime, solid, negative, positive, closedHoles } = halves;
    const normalLength = Math.hypot(...plane.normal);
    const unit: Vec3 = [plane.normal[0] / normalLength, plane.normal[1] / normalLength, plane.normal[2] / normalLength];
    const keep = (made: ManifoldSolid) => {
      created.push(made);
      return made;
    };
    // The cut a hair past `at` on the side that moves, clear of a face lying there (a pocket's floor laid on with a
    // picked face), drawn out along the normal from `from` over `over` mm and turned back into place.
    const { onto, back } = rotationOntoZ(unit);
    const turned = keep(solid.transform(onto));
    const drawnOut = (at: number, from: number, over: number) => {
      const section = turned.slice(at + 1e-3);
      try {
        if (section.isEmpty() || section.area() <= 1e-9) return null;
        return keep(keep(keep(section.extrude(over)).translate([0, 0, from])).transform(back));
      } finally {
        section.delete();
      }
    };
    let joined: ManifoldSolid;
    if (length > 0) {
      const filler = drawnOut(plane.position, plane.position - STRETCH_OVERLAP, length + 2 * STRETCH_OVERLAP);
      if (!filler) return { parts: null, error: t("split.error.emptyHalf") };
      const moved = keep(positive.translate([unit[0] * length, unit[1] * length, unit[2] * length]));
      joined = keep(runtime.Manifold.union([negative, filler, moved]));
    } else {
      // Shorter: what lies beyond the slice comes back onto the plane, joined by a hair-thin piece of its own cut face.
      const cut = -length;
      const [beyond, slice] = splitByPlaneClearOfFaces(solid, unit, plane.position + cut);
      keep(beyond);
      keep(slice);
      const trimmed = dropSplitSlivers(runtime, beyond);
      created.push(...trimmed.created);
      if (!trimmed.solid || trimmed.solid.status() !== "NoError" || trimmed.solid.numTri() < 1) {
        return { parts: null, error: t("split.error.stretchTooShort") };
      }
      const moved = keep(trimmed.solid.translate([-unit[0] * cut, -unit[1] * cut, -unit[2] * cut]));
      const joint = drawnOut(plane.position + cut, plane.position - STRETCH_OVERLAP, 2 * STRETCH_OVERLAP);
      joined = keep(runtime.Manifold.union(joint ? [negative, joint, moved] : [negative, moved]));
    }
    if (joined.status() !== "NoError" || joined.numTri() < 1) return { parts: null, error: t("split.error.emptyHalf") };
    // The slivers at the seams come from different pieces, and the kernel folds only within one mesh: taken as one first.
    joined = foldedThinWalls(keep(joined.asOriginal()), joined, STRETCH_SEAM_TOLERANCE, created);
    const mesh = joined.getMesh();
    try {
      const stretched = splitShapeFromWorldPositions(shape, manifoldMeshToPositions(mesh), createLocalId(`${shape.id}-stretched`), shape.name);
      if (!stretched) return { parts: null, error: t("split.error.store") };
      return { parts: [canonicalizeShape(stretched)], closedHoles };
    } finally {
      disposeManifold(mesh);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error ?? "");
    return { parts: null, error: openHolesError() ?? (message ? t("split.error.kernel", { message }) : t("split.error.kernelUnknown")) };
  } finally {
    Array.from(new Set(created)).forEach(disposeManifold);
  }
}

/**
 * Where the connectors would go, for the Split panel to show before the cut: what they come to, and their middles in the
 * world - or, for a dovetail, the outlines of its tongues on the plane.
 */
export type SplitConnectorPreview = { tally: SplitConnectorTally; points: Array<[number, number, number]>; holes: number; tongues?: SplitTongueOutline[] };

/**
 * The connectors the split would make, worked out as the split works them out, without making them: for each solid the
 * plane crosses, its halves, the pieces of its cut face and what fits there. Holes are counted apart; a body that cannot
 * be split adds nothing, the split itself says why.
 */
export async function previewSplitConnectors(targets: readonly WorkplaneShape[], plane: SplitPlaneArgs, connectors: SplitConnectorOptions): Promise<SplitConnectorPreview> {
  let tally = NO_CONNECTORS;
  const points: Array<[number, number, number]> = [];
  let holes = 0;
  const tongues: SplitTongueOutline[] = [];
  if (connectors.kind === "none") return { tally, points, holes };
  for (const shape of targets) {
    if (!splitPlaneIntersectsPoints(meshForShape(shape).vertices, plane.normal, plane.position)) continue;
    if (shape.hole) {
      holes += 1;
      continue;
    }
    const created: ManifoldSolid[] = [];
    takeHoleFillTally();
    try {
      const halves = await splitShapeHalves(shape, plane, created);
      if ("error" in halves) continue;
      const plan = planSplitConnectors(halves.runtime, halves.positive, halves.negative, plane.normal, plane.position, connectors, created);
      tally = addConnectorTallies(tally, plan.tally);
      points.push(...plan.points.map((point) => splitFramePoint(plan.frame, point, plan.position)));
      tongues.push(...plan.tongues.flatMap((tongue) => tongueOutlines(plan.frame, plan.position, tongue, connectors)));
    } catch {
      // The split will say what went wrong with this body.
    } finally {
      takeHoleFillTally();
      Array.from(new Set(created)).forEach(disposeManifold);
    }
  }
  return { tally, points, holes, ...(connectors.kind === "dovetail" ? { tongues } : {}) };
}

/** A status message with the note that small holes of the mesh were closed first (#791). */
export function withClosedHolesNote(message: string, closedHoles = 0) {
  if (closedHoles < 1) return message;
  const note = closedHoles === 1 ? t("status.holeClosedOne") : t("status.holesClosedMany", { count: closedHoles });
  return `${/[.!?。]$/.test(message) ? message : `${message}.`} ${note}`;
}

/**
 * A split's status message with what its connectors came to (Discussion #832): the dowels to print beside the halves,
 * the plugs that line them up, the dovetails that hold them and how they go together, or that none fit and the parts
 * were split without. Nothing for a split without connectors, or one that only cut holes.
 */
export function withConnectorsNote(message: string, kind: SplitConnectorKind, tally?: SplitConnectorTally) {
  if (kind === "none" || !tally || tally.faces === 0) return message;
  const count = tally.placed;
  const note = count === 0
    ? t(kind === "dovetail" ? "status.splitNoDovetail" : "status.splitNoConnectors")
    : kind === "dowels"
      ? (count === 1 ? t("status.splitDowelsOne") : t("status.splitDowelsMany", { count }))
      : kind === "dovetail"
        ? (count === 1 ? t("status.splitDovetailOne") : t("status.splitDovetailMany", { count }))
        : (count === 1 ? t("status.splitPlugsOne") : t("status.splitPlugsMany", { count }));
  return `${/[.!?。]$/.test(message) ? message : `${message}.`} ${note}`;
}

/** Why a mesh with openings too large to cap could not be cut, or null when that was not the cause (#791). */
function openHolesError() {
  const { open } = takeHoleFillTally();
  return open > 0 ? t("status.holesTooLarge", { count: open }) : null;
}

export type SplitShapesOutcome =
  | { status: "stale" }
  | { status: "failed"; shape: WorkplaneShape; error: string }
  | {
    status: "done";
    replacements: Map<string, WorkplaneShape[]>;
    splitCount: number;
    closedHoles: number;
    /** What the connectors came to, when the split was asked for them. */
    connectors?: SplitConnectorTally;
  };

/**
 * The cut of one target - or with `stretch` the target made that much longer there -, or `missed` when the plane does
 * not go through it, with `beyond` when it lies wholly on the side the plane's normal points to (a stretch moves it).
 */
export async function splitShapeIfCrossed(shape: WorkplaneShape, plane: SplitPlaneArgs, connectors?: SplitConnectorOptions, stretch?: number) {
  const vertices = meshForShape(shape).vertices;
  if (!splitPlaneIntersectsPoints(vertices, plane.normal, plane.position)) {
    const [nx, ny, nz] = plane.normal;
    return { missed: true as const, beyond: vertices.some(([x, y, z]) => x * nx + y * ny + z * nz > plane.position + 1e-5) };
  }
  if (stretch !== undefined) return stretchShapeByPlane(shape, plane, stretch);
  return splitShapeByPlane(shape, plane, connectors);
}

/** A group built again from its parts after a stretch, keeping what is its own (lib/LayerlingEditor's rebuildGroupFromParts). */
export type RebuildStretchedGroup = (group: WorkplaneShape, parts: WorkplaneShape[]) => Promise<WorkplaneShape | { error: string }>;

type StretchPartsResult =
  | { missed: true; beyond: boolean }
  | { parts: WorkplaneShape[]; closedHoles: number }
  | { parts: null; error?: string };

/** `shape` moved as a whole by `offset` in the world (x, height, z), as a part beyond a stretch's plane goes. */
function shiftedShape(shape: WorkplaneShape, offset: Vec3): WorkplaneShape {
  const clean = (value: number) => (Math.abs(value) < 1e-9 ? 0 : Math.round(value * 1e6) / 1e6);
  return { ...shape, x: clean(shape.x + offset[0]), elevation: clean((shape.elevation ?? 0) + offset[1]), z: clean(shape.z + offset[2]) };
}

/**
 * A group stretched part by part (Discussion #1707): the parts the plane crosses get longer, the parts wholly beyond it
 * move along by the length, the parts before it stay as they are, and the group is built again from them, so it stays a
 * group that can be ungrouped, its holes stay holes and its untouched parts keep their settings. A group inside it is
 * stretched the same way. Only a group whose parts lie where its box says (`groupCanKeepParts`: not mirrored, deformed,
 * filleted, textured or wrapped) goes so; any other is stretched as one body, as before.
 */
async function stretchGroupByParts(
  group: WorkplaneShape,
  plane: SplitPlaneArgs,
  stretch: number,
  splitOne: typeof splitShapeIfCrossed,
  rebuildGroup: RebuildStretchedGroup,
  offset: Vec3,
): Promise<StretchPartsResult> {
  const children = restoreGroupedChildren(group);
  const next: WorkplaneShape[] = [];
  let crossed = false;
  let beyondCount = 0;
  let closedHoles = 0;
  for (const child of children) {
    const result: StretchPartsResult = groupCanKeepParts(child)
      ? await stretchGroupByParts(child, plane, stretch, splitOne, rebuildGroup, offset)
      : await splitOne(child, plane, undefined, stretch);
    if ("missed" in result) {
      if (result.beyond) beyondCount += 1;
      next.push(result.beyond ? shiftedShape(child, offset) : child);
      continue;
    }
    if (!result.parts) return { parts: null, error: result.error };
    crossed = true;
    closedHoles += result.closedHoles ?? 0;
    next.push(...result.parts);
  }
  // The plane in a gap between the parts still makes the group longer; wholly on one side it is missed.
  if (!crossed && (beyondCount === 0 || beyondCount === children.length)) return { missed: true, beyond: beyondCount > 0 };
  const rebuilt = await rebuildGroup(group, next);
  if ("error" in rebuilt) return { parts: null, error: rebuilt.error };
  return { parts: [rebuilt], closedHoles };
}

/**
 * Splits every target the plane crosses; `stillCurrent` is asked after each one. `splitOne` makes
 * each cut, off the page in the editor (lib/geometryWorker.ts), the test whether the plane crosses
 * included: for a large import that test builds its whole mesh.
 */
export async function splitShapesByPlane(
  targets: readonly WorkplaneShape[],
  plane: SplitPlaneArgs,
  stillCurrent: () => boolean,
  splitOne: typeof splitShapeIfCrossed = splitShapeIfCrossed,
  connectors?: SplitConnectorOptions,
  stretch?: number,
  rebuildGroup?: RebuildStretchedGroup,
): Promise<SplitShapesOutcome> {
  const replacements = new Map<string, WorkplaneShape[]>();
  let splitCount = 0;
  let closedHoles = 0;
  // A stretch keeps each body whole, so it takes no connectors.
  const asked = stretch === undefined && connectors && connectors.kind !== "none" ? connectors : undefined;
  let tally: SplitConnectorTally | undefined = asked ? NO_CONNECTORS : undefined;
  // How far a stretch moves what lies beyond its plane: along the plane's normal, by the length (back for a minus one).
  const normalLength = Math.hypot(...plane.normal) || 1;
  const offset: Vec3 = stretch === undefined
    ? [0, 0, 0]
    : [plane.normal[0] / normalLength * stretch, plane.normal[1] / normalLength * stretch, plane.normal[2] / normalLength * stretch];
  for (const shape of targets) {
    const result: StretchPartsResult | Awaited<ReturnType<typeof splitShapeIfCrossed>> = stretch !== undefined && rebuildGroup && groupCanKeepParts(shape)
      ? await stretchGroupByParts(shape, plane, stretch, splitOne, rebuildGroup, offset)
      : await splitOne(shape, plane, asked, stretch);
    if ("missed" in result) {
      // Selected with the stretched ones, a part wholly beyond the plane moves along (Discussion #1707): a hole at the
      // end of a case stays at the end. It is not counted as stretched.
      if (stretch !== undefined && result.beyond) replacements.set(shape.id, [shiftedShape(shape, offset)]);
      continue;
    }
    if (!stillCurrent()) return { status: "stale" };
    if (!result.parts) return { status: "failed", shape, error: result.error ?? t("split.error.failedDefault") };
    replacements.set(shape.id, result.parts);
    splitCount += 1;
    closedHoles += result.closedHoles ?? 0;
    if (tally && "connectors" in result && result.connectors) tally = addConnectorTallies(tally, result.connectors);
  }
  return { status: "done", replacements, splitCount, closedHoles, ...(tally ? { connectors: tally } : {}) };
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

async function unionOverlappingExportMeshesRaw(shapes: WorkplaneShape[], meshes: MeshData[], cut?: readonly boolean[]) {
  const gruppen = overlappingExportClusters(meshes.map((mesh) => meshBounds(mesh.vertices)));
  if (!gruppen.some((gruppe) => gruppe.length > 1 || isPileOfSolids(shapes[gruppe[0]]))) {
    return { meshes, quellen: meshes.map((_, index) => index), verschmolzen: 0, gescheitert: 0, gestutzt: meshes.map((_, index) => Boolean(cut?.[index])) };
  }
  const runtime = await getManifoldRuntime().catch(() => null);
  const ergebnis: MeshData[] = [];
  // Which results a cut or a merge of several bodies made: only there a splinter can have been left behind (#585).
  const gestutzt: boolean[] = [];
  // Which input shape each result stands for - a merged body takes its first
  // member, so the 3MF export can keep names and colours.
  const quellen: number[] = [];
  let verschmolzen = 0;
  let gescheitert = 0;
  for (const gruppe of gruppen) {
    if (gruppe.length === 1 && !isPileOfSolids(shapes[gruppe[0]])) {
      ergebnis.push(meshes[gruppe[0]]);
      quellen.push(gruppe[0]);
      gestutzt.push(Boolean(cut?.[gruppe[0]]));
      continue;
    }
    const created: ManifoldSolid[] = [];
    let vereinigt: MeshData | null = null;
    try {
      // A body a loose hole was cut from is joined as its cut mesh, not rebuilt from its uncut shape.
      const union = !runtime ? null : gruppe.some((index) => cut?.[index])
        ? runtime.Manifold.union(gruppe.map((index) => {
            const source = meshDataToManifoldMesh(runtime, meshes[index]);
            try {
              const solid = runtime.Manifold.ofMesh(source);
              created.push(solid);
              return solid;
            } finally {
              disposeManifold(source);
            }
          }))
        : shapesToManifoldUnion(runtime, gruppe.map((index) => shapes[index]), created, true);
      if (union) created.push(union);
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
      // One shape that is only a pile of its own pieces, such as a text, has lost nothing by being joined.
      gestutzt.push(gruppe.length > 1 || gruppe.some((index) => cut?.[index]));
      if (gruppe.length > 1) verschmolzen += gruppe.length;
    } else {
      gruppe.forEach((index) => {
        ergebnis.push(meshes[index]);
        quellen.push(index);
        gestutzt.push(Boolean(cut?.[index]));
      });
      gescheitert += 1;
    }
  }
  return { meshes: ergebnis, quellen, verschmolzen, gescheitert, gestutzt };
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
export async function exportBodiesWithLooseHoles(visible: readonly WorkplaneShape[], options: { painted?: boolean } = {}) {
  const solids = visible.filter((shape) => !shape.hole && !isNonSolidShape(shape));
  // A file that keeps colours (3MF, OBJ) takes a painted body cut along its paint (paintMesh.ts), the kernel loaded
  // first so the strokes are cut in rather than coloured on whole faces. An STL stays one colour and as it was.
  if (options.painted && solids.some((shape) => shape.paint?.length)) await getManifoldRuntime().catch(() => null);
  const meshes = solids.map((shape) => (options.painted ? paintedWorldMesh(shape)?.mesh : undefined) ?? meshForShape(shape));
  const holes = visible.filter((shape) => shape.hole && !isNonSolidShape(shape));
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
  const { solids, meshes: cut, cut: wasCut, holeCutsFailed } = await exportBodiesWithLooseHoles(visible);
  if (solids.length === 0) return { volumeMm3: 0, sideMm2: 0, flatMm2: 0, solids: 0, bodies: 0, unionFailed: 0 };
  const { meshes, gescheitert } = await unionOverlappingExportMeshes(solids, cut, wasCut);
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
/** A bundle goes out as its parts, each a body of its own with its own colour (or the bundle's, letters included, with Multicolor off); its holes cut nothing. */
export function expandBundles(source: readonly WorkplaneShape[]): WorkplaneShape[] {
  return source.flatMap((shape) => (
    shape.groupOperation === "bundle" && shape.groupedShapes?.length && !keptWholeForItsDeform(shape)
      ? expandBundles(restoreGroupedChildren(shape).map((part) => (shape.multicolor === false ? { ...part, color: shape.color, gridfinityLabelColor: undefined } : part))).filter((part) => !part.hidden)
      : [shape]
  ));
}

/**
 * A bundle tapered, twisted or leaned as a whole goes out whole (#1648): its parts on their own cannot carry that, so
 * taken apart its texture came out straight while the view showed it twisted. meshForShape turns it as the view does.
 * One with a hole in it is still taken apart, or the hole would come out solid.
 */
function keptWholeForItsDeform(bundle: WorkplaneShape): boolean {
  if (!shapeHasShapeDeform(bundle)) return false;
  const hasHole = (shape: WorkplaneShape): boolean => (shape.groupedShapes ?? []).some((part) => !part.hidden && (part.hole || hasHole(part)));
  return !hasHole(bundle);
}

export function visibleExportShapes(source: readonly WorkplaneShape[]) {
  // A reference image (#680) is a guide, never part of an export, a section or an estimate.
  const bodies = source.filter((shape) => !shape.imagePlate);
  const shown = bodies.filter((shape) => !shape.hidden);
  const hidden = bodies.length - shown.length;
  const visible = expandBundles(shown);
  const hiddenNote = hidden === 0 ? "" : hidden === 1 ? t("status.exportHiddenSkippedOne") : t("status.exportHiddenSkippedMany", { count: hidden });
  return { visible, hiddenNote };
}

export type PartColorSolid = { probe: THREE.Mesh; box: THREE.Box3; color: string };

/**
 * The parts of a group that shows each part in its own colour (Multicolor), as solids in the
 * world, ready to ask "which part is this point in" (#153), and a Gridfinity bin's letters in a
 * colour of their own, then the bin (#1308). A group cut into one mesh keeps its
 * parts in the frame of that mesh, standing on its lowest point; a group of separate parts in
 * the frame its children have before the group's own size and place are applied.
 */
export function multicolorExportSolids(shape: WorkplaneShape): PartColorSolid[] | null {
  // The first solid a point lies in gives its colour, so the letters come first. The box round the bin keeps the
  // nearest-box fallback from giving the faces beside the letters their colour.
  const letterColor = gridfinityLabelColor(shape);
  if (letterColor) {
    const letters = gridfinityLetterMeshes(shape).map((letter) => partColorSolid(transformMesh(letter, shape), letterColor));
    const bounds = meshBounds(meshForShape(shape).vertices);
    return letters.length && bounds ? [...letters, partColorSolid(cuboidsToMesh("bin", [bounds], 0, 0), shape.color)] : null;
  }
  if (!showsOwnPartColors(shape)) return null;
  const colors = new Set<string>();
  collectPartColors(shape, colors);
  if (colors.size < 2) return null;
  const meshes = partColorMeshes(shape);
  return meshes.length ? meshes.map(({ mesh, color }) => partColorSolid(mesh, color)) : null;
}

/**
 * Whether a group's parts keep their own colours, as the view draws them. A part of such a group that is a group or
 * bundle itself - an Icon tag is a bundle of its layers - shows its own parts' colours in turn (#1398).
 */
function showsOwnPartColors(shape: WorkplaneShape) {
  return !shape.hole && Boolean(shape.groupedShapes?.length) && groupShowsPartColors(shape);
}

/** The colours a group shows, down through the groups and bundles inside it that show their parts' colours too. */
function collectPartColors(shape: WorkplaneShape, into: Set<string>) {
  (shape.groupedShapes ?? []).filter((part) => !part.hole && !part.hidden).forEach((part) => {
    const letters = gridfinityLabelColor(part);
    if (letters) into.add(letters);
    if (showsOwnPartColors(part)) collectPartColors(part, into);
    else into.add(part.color);
  });
}

/**
 * The parts of a group as meshes in their own colours, placed as `meshForShape` places the group: in the world for a
 * group on the plate, in its group's frame for a group inside another one. A part that shows its own parts' colours
 * gives those parts instead of one mesh in its own colour, so an Icon tag in a Multicolor group keeps its layers (#1398).
 */
function partColorMeshes(shape: WorkplaneShape): Array<{ mesh: MeshData; color: string }> {
  const parts = (shape.groupedShapes ?? []).filter((part) => !part.hole && !part.hidden);
  const imported = shape.importedMesh;
  let lowest = Number.POSITIVE_INFINITY;
  if (imported) for (let index = 1; index < imported.positions.length; index += 3) lowest = Math.min(lowest, imported.positions[index]);
  const scale = imported ? null : groupedContentScale(shape, localGroupBounds(shape.groupedShapes ?? []));
  // A tapered or twisted group turns each part over the whole group's height, as meshForShape does, not over the
  // part's own: the pattern of a twisted bundle, higher up than its body, kept its colour off the twisted faces (#1648).
  const frame = !imported && shapeHasShapeDeform(shape) ? deformFrameOf(groupedContentMesh(shape).vertices) : undefined;
  const meshes: Array<{ mesh: MeshData; color: string }> = [];
  const add = (local: MeshData, color: string) => {
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
    meshes.push({ mesh: transformMesh({ name: local.name, vertices, faces: local.faces }, shape, frame), color });
  };
  parts.forEach((part) => {
    // A bin's letters in their own colour come before the bin, as for a bin on its own; here the bin stays its mesh, as
    // the group's other parts lie in its box.
    const color = gridfinityLabelColor(part);
    if (color) gridfinityLetterMeshes(part).forEach((letter) => add(transformMesh(letter, part), color));
    if (showsOwnPartColors(part)) partColorMeshes(part).forEach((inner) => add(inner.mesh, inner.color));
    else add(meshForShape(part), part.color);
  });
  return meshes;
}

/** A body in the world as a solid to ask "is this point in it". */
function partColorSolid(world: MeshData, color: string): PartColorSolid {
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
  return { probe, box: geometry.boundingBox ?? new THREE.Box3(), color };
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

async function colorSeparatedExportMeshesRaw(shapes: WorkplaneShape[], meshes: MeshData[], cut?: readonly boolean[]) {
  const farben = exportColorGroups(shapes.map((shape) => shape.color));
  if (farben.length <= 1) {
    return unionOverlappingExportMeshesRaw(shapes, meshes, cut);
  }
  const koerper: { mesh: MeshData; quelle: number; farbe: number; gestutzt: boolean }[] = [];
  let verschmolzen = 0;
  let gescheitert = 0;
  for (const [farbe, gruppe] of farben.entries()) {
    const teil = await unionOverlappingExportMeshesRaw(gruppe.map((index) => shapes[index]), gruppe.map((index) => meshes[index]), cut && gruppe.map((index) => cut[index]));
    teil.meshes.forEach((mesh, index) => koerper.push({ mesh, quelle: gruppe[teil.quellen[index]], farbe, gestutzt: teil.gestutzt[index] }));
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
  const gestutzt: boolean[] = [];

  /** The bodies of another colour that reach a body and came later: the shapes that cut it (Discussion #79). */
  const spaeter = (index: number) => koerper
    .map((other, otherIndex) => ({ other, otherIndex }))
    .filter(({ other, otherIndex }) => other.farbe !== koerper[index].farbe && other.quelle > koerper[index].quelle && durchdringt(index, otherIndex));

  /** A body with the cutters taken off: what is left, nothing (`leer`), or a cut that did not work (`rest` and `leer` both null/false). */
  const abziehen = (entry: (typeof koerper)[number], schneider: { other: (typeof koerper)[number] }[]) => {
    const created: ManifoldSolid[] = [];
    let rest: MeshData | null = null;
    let leer = false;
    try {
      const ofMesh = (mesh: MeshData) => {
        const manifoldMesh = meshDataToManifoldMesh(runtime!, mesh);
        try {
          const solid = runtime!.Manifold.ofMesh(manifoldMesh);
          created.push(solid);
          return solid.status() === "NoError" && solid.numTri() > 0 ? solid : null;
        } finally {
          disposeManifold(manifoldMesh);
        }
      };
      const basis = ofMesh(entry.mesh);
      const werkzeuge = schneider.map(({ other }) => ofMesh(other.mesh));
      if (basis && werkzeuge.every(Boolean)) {
        const vereinigt = werkzeuge.length === 1 ? werkzeuge[0]! : runtime!.Manifold.union(werkzeuge as ManifoldSolid[]);
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
      leer = false;
    } finally {
      Array.from(new Set(created)).forEach(disposeManifold);
    }
    return { rest, leer };
  };

  // A body that lies entirely inside later ones of another colour would be cut away to nothing and vanish from the file
  // without a word (#906: a text inside a plate). It stays whole instead and the later bodies take its pocket.
  const ersterSchnitt = new Map<number, { rest: MeshData | null; leer: boolean }>();
  const verschluckt = new Set<number>();
  if (runtime) {
    koerper.forEach((entry, index) => {
      const schneider = spaeter(index);
      if (schneider.length === 0) return;
      const ergebnisSchnitt = abziehen(entry, schneider);
      ersterSchnitt.set(index, ergebnisSchnitt);
      if (ergebnisSchnitt.leer) verschluckt.add(index);
    });
  }
  koerper.forEach((entry, index) => {
    const alle = spaeter(index);
    // A swallowed body is cut only by later swallowed ones; any other body by the later bodies that were not swallowed
    // and by the earlier ones that were, which win over it.
    const schneider = verschluckt.has(index)
      ? alle.filter(({ otherIndex }) => verschluckt.has(otherIndex))
      : [
          ...alle.filter(({ otherIndex }) => !verschluckt.has(otherIndex)),
          ...koerper
            .map((other, otherIndex) => ({ other, otherIndex }))
            .filter(({ other, otherIndex }) => verschluckt.has(otherIndex) && other.farbe !== entry.farbe && other.quelle < entry.quelle && durchdringt(index, otherIndex)),
        ];
    if (schneider.length === 0 || !runtime) {
      if (schneider.length > 0) gescheitert += 1;
      ergebnis.push(entry.mesh);
      quellen.push(entry.quelle);
      gestutzt.push(entry.gestutzt);
      return;
    }
    const gleich = schneider.length === alle.length && schneider.every(({ otherIndex }) => alle.some((one) => one.otherIndex === otherIndex));
    const schnitt = gleich && ersterSchnitt.has(index) ? ersterSchnitt.get(index)! : abziehen(entry, schneider);
    if (schnitt.leer) return;
    if (schnitt.rest && schnitt.rest.faces.length > 0) {
      ergebnis.push(schnitt.rest);
      gestutzt.push(true);
    } else {
      gescheitert += 1;
      ergebnis.push(entry.mesh);
      gestutzt.push(entry.gestutzt);
    }
    quellen.push(entry.quelle);
  });
  return { meshes: ergebnis, quellen, verschmolzen, gescheitert, gestutzt };
}

/**
 * What an export writes: the loose splinters a cut or the colour separation leaves behind are left out (#352), as
 * `splinters` counts. A slicer shows them as spikes, and they can lift a flat design off the plate.
 */
function withoutSplinters<T extends { meshes: MeshData[]; gestutzt: boolean[] }>(result: T): T & { splinters: number } {
  let splinters = 0;
  const meshes = result.meshes.map((mesh, index) => {
    // Only what a cut, a merge of several bodies or the colour separation made can hold a splinter. A body they did
    // not touch is as it was drawn: a thin small letter is no splinter (#585).
    if (!result.gestutzt[index]) return mesh;
    const cleaned = removeLooseSplinters(mesh);
    splinters += cleaned.removed;
    return cleaned.mesh;
  });
  return { ...result, meshes, splinters };
}

export async function unionOverlappingExportMeshes(shapes: WorkplaneShape[], meshes: MeshData[], cut?: readonly boolean[]) {
  return withoutSplinters(await unionOverlappingExportMeshesRaw(shapes, meshes, cut));
}

/**
 * The surface the face tools read a face from: a plain group's or bundle's
 * solid parts joined into one, as for the export, so a face across two parts
 * is one face; any other body, and one with a hole among its parts or in a
 * bundle inside them, as it is drawn.
 */
export async function faceReadMesh(shape: WorkplaneShape): Promise<MeshData> {
  const mesh = meshForShape(shape);
  if (!faceReadJoins(shape)) return mesh;
  return (await unionOverlappingExportMeshes([shape], [mesh])).meshes[0];
}

/** Whether faceReadMesh joins this body's parts: a plain group or bundle of solids, no hole among them. */
export function faceReadJoins(shape: WorkplaneShape) {
  return isPileOfSolids(shape) && !bundleParts(shape).some((part) => part.hole);
}

/** The triangles of faceReadMesh in the world, nine numbers each: what the face readers take. */
export async function faceReadPositions(shape: WorkplaneShape): Promise<Float64Array> {
  const mesh = await faceReadMesh(shape);
  const positions = new Float64Array(mesh.faces.length * 9);
  mesh.faces.forEach((face, index) => {
    face.forEach((vertexIndex, corner) => {
      const vertex = mesh.vertices[vertexIndex];
      positions[index * 9 + corner * 3] = vertex[0];
      positions[index * 9 + corner * 3 + 1] = vertex[1];
      positions[index * 9 + corner * 3 + 2] = vertex[2];
    });
  });
  return positions;
}

export async function colorSeparatedExportMeshes(shapes: WorkplaneShape[], meshes: MeshData[], cut?: readonly boolean[]) {
  return withoutSplinters(await colorSeparatedExportMeshesRaw(shapes, meshes, cut));
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
    result = foldCutterPaddingSteps(result, created);

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

/**
 * A hole sticks out a thousandth at its ends (CUTTER_PADDING), so one flush with the outside leaves no skin. Where an end
 * rests on a face inside the body - a hole on the top of a plate, to take a peg off it - it cut that thousandth into the
 * face too, and the step round the hole showed as a line on the plate (#1133). The kernel folds walls that thin away.
 */
const CUT_STEP_TOLERANCE = CUTTER_PADDING * 2;

/**
 * Whether folding thin walls away left the solid's shape alone. Folding a step a few thousandths high moves next to no
 * volume and surface, but the kernel can also fold a whole corner into one slanted face: in a housing grouped with its
 * holes, the corner of a block beside a round dent lost 51 mm³ and 371 mm² that way (Discussion #1272). Such a fold
 * is not taken; the solid then keeps its thin steps, which only show as fine lines.
 */
export function foldKeptShape(before: { volume: number; area: number }, after: { volume: number; area: number }) {
  const volumeChange = Math.abs(after.volume - before.volume);
  const areaChange = Math.abs(after.area - before.area);
  return volumeChange <= Math.max(0.05, Math.abs(before.volume) * 1e-4) && areaChange <= Math.max(1, before.area * 1e-3);
}

function measured(solid: ManifoldSolid) {
  return { volume: solid.volume(), area: solid.surfaceArea() };
}

/** The solid with walls thinner than `tolerance` folded away by the kernel, or the solid as it was when that fails or changes its shape. */
function foldedThinWalls(source: ManifoldSolid, result: ManifoldSolid, tolerance: number, created: ManifoldSolid[]): ManifoldSolid {
  const tidy = source.setTolerance(tolerance);
  created.push(tidy);
  if (tidy.status() !== "NoError" || tidy.numTri() < 1) return result;
  return foldKeptShape(measured(result), measured(tidy)) ? tidy : result;
}

function foldCutterPaddingSteps(result: ManifoldSolid, created: ManifoldSolid[]): ManifoldSolid {
  // The step's floor comes from the hole and its rim from the part: the kernel folds only within one source mesh, so
  // the result is taken as a mesh of its own first. Nothing reads the triangles' source afterwards.
  const whole = result.asOriginal();
  created.push(whole);
  return foldedThinWalls(whole, result, CUT_STEP_TOLERANCE, created);
}

/** How thin (mm) a triangle of a merged group may be before the kernel folds it away: well above the viewer's 1/10,000 mm, far below anything printable. */
const MERGE_SLIVER_TOLERANCE = 5e-4;

function manifoldUnionMeshShapeWithRuntime(
  selection: WorkplaneShape[],
  triangleLimit: number,
  groupChildren: WorkplaneShape[] | undefined,
  options: { requireImported?: boolean },
  runtime: ManifoldToplevel,
): WorkplaneShape | null {
  const solids = selection.filter((shape) => !shape.hole && !shape.locked);
  if (solids.length < 2 || (options.requireImported !== false && !selection.some((shape) => Boolean(shape.importedMesh)))) {
    return null;
  }

  const mergedSourceMesh = mergedSolidMeshData(solids);
  if (mergedSourceMesh.faces.length > triangleLimit) {
    return null;
  }

  const created: ManifoldSolid[] = [];
  let result: ManifoldSolid | null = null;
  try {
    // The merged boundary is independent of selection order. Surface colours are assigned later by
    // testing which source part actually contributes each exposed face, not by kernel triangle provenance.
    result = shapesToManifoldUnion(runtime, solids, created, true);
    if (!result) {
      return null;
    }
    if (result.status() !== "NoError" || result.numTri() < 1) {
      return null;
    }

    // Where round parts cross, the merge leaves triangles thinner than the viewer can tell apart (a corner is one
    // when it rounds to the same 1/10,000 mm). Every such sliver breaks the pairing of its neighbours there, and the
    // edge lines drew the unpaired edges as stray strokes across a see-through group. The kernel folds them away,
    // keeping the merged boundary cleaner.
    if (options.requireImported === false) {
      result = foldedThinWalls(result, result, MERGE_SLIVER_TOLERANCE, created);
    }
    const positions = manifoldMeshToPositions(result.getMesh());
    const group = meshPositionsToGroupShape(selection, solids, positions, "grouped-manifold-union", groupChildren);
    return isUsableBooleanGroup(group, mergedSourceMesh.faces.length, false) ? group : null;
  } catch {
    return null;
  } finally {
    Array.from(new Set(created)).forEach(disposeManifold);
  }
}

async function manifoldUnionMeshShape(
  selection: WorkplaneShape[],
  triangleLimit: number,
  groupChildren?: WorkplaneShape[],
  options: { requireImported?: boolean } = {},
): Promise<WorkplaneShape | null> {
  try {
    return manifoldUnionMeshShapeWithRuntime(selection, triangleLimit, groupChildren, options, await getManifoldRuntime());
  } catch {
    return null;
  }
}

/**
 * Builds the merged mesh for display only. The returned mesh is derived from the group's original parts and must
 * never be assigned to the saved WorkplaneShape. Callers should cache it against the group's geometry signature.
 */
export function buildGroupDisplayMesh(shape: WorkplaneShape): NonNullable<WorkplaneShape["importedMesh"]> | null {
  const runtime = loadedManifoldRuntime();
  const parts = shape.groupedShapes;
  // Plain, visible, solid primitives only. Bundles, nested groups, holes and imported meshes retain the existing
  // renderer rather than risking a misleading partial merge.
  if (!runtime || !parts || !groupDisplayMergeable(shape)) return null;
  // Manifold's triangulation can depend on operand order, especially for coplanar/coincident faces.
  // Use a canonical order so selecting the same solids in a different order cannot change the displayed
  // boundary mesh. This order is only for the derived display mesh; saved child order is untouched.
  const canonicalParts = [...parts].sort((left, right) => left.id.localeCompare(right.id));
  const merged = manifoldUnionMeshShapeWithRuntime(canonicalParts, IMPORTED_FALLBACK_BOOLEAN_TRIANGLE_LIMIT, canonicalParts, { requireImported: false }, runtime);
  return merged?.importedMesh ?? null;
}

/** All parts of a bundle with the bundles in it opened too, so their holes and solids count as the bundle's own. */
function bundleParts(bundle: WorkplaneShape): WorkplaneShape[] {
  return restoreGroupedChildren(bundle).filter((part) => !part.hidden).flatMap((part) => (
    part.groupOperation === "bundle" && part.groupedShapes?.length ? bundleParts(part) : expandGroupsForBoolean([part])
  ));
}

function isBundleWithHole(shape: WorkplaneShape) {
  return !shape.hole && shape.groupOperation === "bundle" && Boolean(shape.groupedShapes?.length) && bundleParts(shape).some((part) => part.hole);
}

/**
 * A bundle with a hole in it, grouped with other parts, cuts them but not its own solids, as in Tinkercad (#646):
 * a peg in a bundle with the hole beside it used to lose the part of it the hole overlaps. The hole of a bundle
 * cuts as itself less the bundle's solids; the rest is one cut as before, so the bundle's solids still take the
 * other holes.
 */
async function manifoldBundleCutShape(selected: WorkplaneShape[], triangleLimit: number, groupChildren: WorkplaneShape[]): Promise<WorkplaneShape | null> {
  const bundles = selected.filter(isBundleWithHole);
  if (bundles.length === 0) return null;
  const rest = expandGroupsForBoolean(selected.filter((shape) => !bundles.includes(shape)));
  const bundleSets = bundles.map((bundle) => {
    const parts = bundleParts(bundle);
    return { solids: parts.filter((part) => !part.hole && !part.locked), holes: parts.filter((part) => part.hole) };
  });
  const solids = [...rest.filter((shape) => !shape.hole && !shape.locked), ...bundleSets.flatMap((set) => set.solids)];
  const outerHoles = rest.filter((shape) => shape.hole);
  if (solids.length === 0) return null;
  const sourceMesh = mergedSolidMeshData(solids);
  const cutterTriangleCount = [...outerHoles, ...bundleSets.flatMap((set) => set.holes)]
    .reduce((total, hole) => total + meshForShape(hole).faces.length, 0);
  if (sourceMesh.faces.length + cutterTriangleCount > triangleLimit) return null;

  const created: ManifoldSolid[] = [];
  try {
    const runtime = await getManifoldRuntime();
    let result = shapesToManifoldUnion(runtime, solids, created, true);
    if (!result) return null;
    if (outerHoles.length) {
      const cutter = shapesToManifoldUnion(runtime, outerHoles.map(paddedCutterShape), created, true);
      if (!cutter) return null;
      result = result.subtract(cutter);
      created.push(result);
    }
    for (const set of bundleSets) {
      let cutter = shapesToManifoldUnion(runtime, set.holes.map(paddedCutterShape), created, true);
      if (!cutter) return null;
      if (set.solids.length) {
        const own = shapesToManifoldUnion(runtime, set.solids, created, true);
        if (!own) return null;
        cutter = cutter.subtract(own);
        created.push(cutter);
      }
      result = result.subtract(cutter);
      created.push(result);
    }
    if (result.status() !== "NoError" || result.numTri() < 1) return null;
    result = foldCutterPaddingSteps(result, created);
    const positions = manifoldMeshToPositions(result.getMesh());
    const group = meshPositionsToGroupShape(selected, solids, positions, "grouped-bundle-cut", groupChildren);
    return isUsableBooleanGroup(group, sourceMesh.faces.length, false) ? group : null;
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

export type HullBuildResult = {
  group: WorkplaneShape | null;
  failureNotice: string;
};

/** Whether a selection can be hulled: two shapes or more, at least one of them a solid. */
export function canHullShapes(shapes: WorkplaneShape[]) {
  const solids = shapes.filter((shape) => !shape.hole && !isNonSolidShape(shape));
  // Holes only make a hole: two cylinder holes, a slot (#1055).
  return shapes.length >= 2 && (solids.length >= 1 || shapes.every((shape) => shape.hole && !isNonSolidShape(shape)));
}

/**
 * The convex hull of the selected solids (#863): the smallest convex body round all of them, as if
 * they were shrink-wrapped, so a half sphere on a cylinder or four corner posts become one smooth body.
 * Holes in the selection are cut out of the hull afterwards, as a group cuts them; a selection of holes
 * only is wrapped itself and the hull is a hole (#1055), so two cylinder holes cut a slot. The parts stay in the
 * group, which Edit group opens again and builds anew; the hull itself is a mesh (Manifold.hull of the
 * parts' solids), so its round faces are facets, as the parts' own meshes are.
 */
export type HullBuildOptions = {
  /**
   * The holes and hollows of each part stay open (Discussion #1440): what a part's own hull has more than the part - the
   * bore of a tube, the inside of a hollowed cylinder, the holes of a group - is cut out of the hull again, and the parts
   * are joined back in, so a neighbour that reaches into it is not cut. A recess at the side of a part stays too.
   */
  keepHoles?: boolean;
};

export async function buildHullShapeFromSelection(groupable: WorkplaneShape[], triangleLimit: number, options: HullBuildOptions = {}): Promise<HullBuildResult> {
  const shapes = groupable.filter((shape) => !isNonSolidShape(shape));
  if (!canHullShapes(shapes)) return { group: null, failureNotice: t("status.hullNeedsShapes") };
  const holesOnly = shapes.every((shape) => shape.hole);
  const solids = holesOnly ? shapes : shapes.filter((shape) => !shape.hole);
  const holes = holesOnly ? [] : shapes.filter((shape) => shape.hole);
  const sourceTriangleCount = shapes.reduce((total, shape) => total + meshForShape(shape).faces.length, 0);
  if (sourceTriangleCount > triangleLimit) {
    return { group: null, failureNotice: t("status.hullTooBig", { count: formatTriangleCount(sourceTriangleCount), limit: formatTriangleCount(triangleLimit) }) };
  }
  const created: ManifoldSolid[] = [];
  try {
    const runtime = await getManifoldRuntime();
    const parts: ManifoldSolid[] = [];
    for (const solid of solids) {
      const part = shapeToManifoldSolid(runtime, solid, created);
      if (!part || part.status() !== "NoError" || part.numTri() < 1) return { group: null, failureNotice: t("status.hullFailed") };
      created.push(part);
      parts.push(part);
    }
    let result = runtime.Manifold.hull(parts);
    created.push(result);
    const keepHoles = Boolean(options.keepHoles) && !holesOnly;
    if (keepHoles) {
      for (const part of parts) {
        const own = runtime.Manifold.hull([part]);
        created.push(own);
        const inside = own.subtract(part);
        created.push(inside);
        if (inside.isEmpty()) continue;
        result = result.subtract(inside);
        created.push(result);
      }
      for (const part of parts) {
        result = result.add(part);
        created.push(result);
      }
    }
    if (holes.length) {
      const cutter = shapesToManifoldUnion(runtime, holes, created);
      if (!cutter) return { group: null, failureNotice: t("status.hullFailed") };
      result = result.subtract(cutter);
      created.push(result);
    }
    if (result.status() !== "NoError" || result.numTri() < 1) return { group: null, failureNotice: t("status.hullFailed") };
    const group = meshPositionsToGroupShape(shapes, solids, manifoldMeshToPositions(result.getMesh()), "grouped-hull");
    return group
      ? { group: { ...group, name: "Hull", hole: holesOnly, ...(keepHoles ? { hullKeepHoles: true } : {}) }, failureNotice: "" }
      : { group: null, failureNotice: t("status.hullFailed") };
  } catch {
    return { group: null, failureNotice: t("status.hullFailed") };
  } finally {
    Array.from(new Set(created)).forEach(disposeManifold);
  }
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

/**
 * A group the person makes of plain solids is drawn as one body, so it starts in one colour; Multicolor brings
 * the parts' colours back. Groups saved before keep showing their parts' colours (#1029), and so do the groups
 * the editor makes itself (a name tag's plate and letters).
 */
function newPlainGroup(selection: WorkplaneShape[]): WorkplaneShape | null {
  const group = groupedShape(selection);
  return group && groupDisplayMergeable(group) ? { ...group, multicolor: false } : group;
}

export function groupedShape(selection: WorkplaneShape[]): WorkplaneShape | null {
  const groupable = selection.filter((shape) => !shape.locked);
  if (groupable.length < 2) {
    return null;
  }

  const groupBounds = boundsForShapesOfVertices(groupable);
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

export function cleanShapePatch(patch: ShapeUpdatePatch): Partial<WorkplaneShape> {
  const { bakeTransform: _bakeTransform, ...rest } = patch;
  const next = { ...rest };
  if (typeof next.rotation === "number") {
    next.rotation = cleanRotationDegrees(next.rotation, 2);
  }
  if (typeof next.rotationX === "number") {
    next.rotationX = cleanRotationDegrees(next.rotationX, 2);
  }
  if (typeof next.rotationZ === "number") {
    next.rotationZ = cleanRotationDegrees(next.rotationZ, 2);
  }
  return next;
}

function coneRadiiForWidth(cone: WorkplaneShape, width: number): Partial<WorkplaneShape> {
  const factor = width / Math.max(0.001, shapeWidth(cone));
  return {
    baseRadius: (cone.baseRadius ?? shapeWidth(cone) / 2) * factor,
    ...(cone.topRadius !== undefined ? { topRadius: cone.topRadius * factor } : {}),
  };
}

/** The taper and the lean of a part a group stretches by `scaleX` along its width and `scaleZ` along its depth. */
function taperedPartPatch(part: WorkplaneShape, scaleX: number, scaleZ: number): Partial<WorkplaneShape> {
  const patch: Partial<WorkplaneShape> = {};
  if (shapeHasTaper(part)) {
    const taper = shapeTaperDimensions(part);
    patch.taperTopWidth = Math.max(MIN_SHAPE_DIMENSION, taper.topWidth * scaleX);
    patch.taperBottomWidth = Math.max(MIN_SHAPE_DIMENSION, taper.bottomWidth * scaleX);
    patch.taperTopDepth = Math.max(MIN_SHAPE_DIMENSION, taper.topDepth * scaleZ);
    patch.taperBottomDepth = Math.max(MIN_SHAPE_DIMENSION, taper.bottomDepth * scaleZ);
  }
  if (part.extrudeTopOffsetX) patch.extrudeTopOffsetX = part.extrudeTopOffsetX * scaleX;
  if (part.extrudeTopOffsetZ) patch.extrudeTopOffsetZ = part.extrudeTopOffsetZ * scaleZ;
  return patch;
}

/** A part's own x, y and z axes in its group's frame: where its width, height and depth lie there. */
export function groupPartAxes(child: WorkplaneShape): [[number, number, number], [number, number, number], [number, number, number]] {
  const childQuaternion = quaternionForShape(child);
  return [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)]
    .map((axis) => axis.applyQuaternion(childQuaternion).toArray() as [number, number, number]) as [[number, number, number], [number, number, number], [number, number, number]];
}

/**
 * The parts of a group where they stand, at the size the group gives them. Left to itself the group stretches
 * them all by its own stretch; `placements` (one for each part, in their order) put each part somewhere of its
 * own instead - its middle in the group's frame, x and z from the group's middle and y from its foot, and its
 * stretch along the group's axes - for a group that keeps its holes and small parts (Discussion #526).
 */
export function restoreGroupedChildren(group: WorkplaneShape, placements?: readonly Pick<GroupPartPlacement, "center" | "stretch">[]): WorkplaneShape[] {
  const children = group.groupedShapes ?? [];
  if (children.length === 0) {
    return [];
  }

  const [sx, sy, sz] = groupedContentScale(group, localGroupBounds(children));
  const groupQuaternion = quaternionForShape(group);
  const groupReflection = new THREE.Matrix4().makeScale(mirrorSign(group.mirrorX), mirrorSign(group.mirrorY), mirrorSign(group.mirrorZ));
  const groupCenter = new THREE.Vector3(group.x, (group.elevation ?? 0) + group.height / 2, group.z);

  return children.map((child, index) => {
    // The group stretches along its own axes; a turned part has its width, height and depth on others.
    const placement = placements?.[index];
    const partScale = groupedPartSizeScale(groupPartAxes(child), placement?.stretch ?? [sx, sy, sz]);
    const width = shapeWidth(child) * partScale.width;
    const depth = shapeDepth(child) * partScale.depth;
    const height = child.height * partScale.height;
    const [localX, localY, localZ] = placement?.center ?? [child.x * sx, ((child.elevation ?? 0) + child.height / 2) * sy, child.z * sz];
    const localCenter = new THREE.Vector3(
      localX * mirrorSign(group.mirrorX),
      (localY - group.height / 2) * mirrorSign(group.mirrorY),
      localZ * mirrorSign(group.mirrorZ),
    ).applyQuaternion(groupQuaternion);
    const worldCenter = groupCenter.clone().add(localCenter);
    const childRotationMatrix = new THREE.Matrix4()
      .makeRotationFromQuaternion(groupQuaternion)
      .multiply(groupReflection)
      .multiply(new THREE.Matrix4().makeRotationFromQuaternion(quaternionForShape(child)))
      .multiply(groupReflection);
    const childRotation = rotationFromQuaternion(new THREE.Quaternion().setFromRotationMatrix(childRotationMatrix));
    // A cylinder always stays round (canonicalizeShape), so one the group stretches more one way than the other
    // would come back as a circle of the larger size: an ellipse keeps both (#844).
    const asEllipse = Math.abs(width - depth) > 1e-6 ? cylinderToEllipsePatch(child) : null;
    const restored: WorkplaneShape = {
      ...child,
      ...asEllipse,
      id: derivedLocalId(child.id, "ungroup"),
      x: worldCenter.x,
      z: worldCenter.z,
      elevation: worldCenter.y - height / 2,
      width,
      depth,
      height,
      size: resizedShapeSize(width, depth),
      // A cone is shaped by its own radii, not by its width: they stretch with it (#756).
      ...(child.kind === "cone" ? coneRadiiForWidth(child, width) : {}),
      ...(child.kind === "star" ? starSettingsForSize({ ...child, width: shapeWidth(child), depth: shapeDepth(child) }, width, depth) : {}),
      // A taper and a lean are kept in millimetres: they stretch with the part, or a tapered top fell back to its
      // old size when a widened group was cut with a hole or opened (#893).
      ...taperedPartPatch(child, partScale.width, partScale.depth),
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
 * The bodies of a group for the edge tool, with the groups inside it opened into their parts where that changes nothing:
 * a group of nothing but holes (the usual way to cut a pattern) or of nothing but solids. Left closed it
 * reaches the kernel as one mesh of several loose pieces, and its curves are facets there; opened, every
 * hole is the exact shape it was.
 *
 * A group that mixes solids and holes cuts only its own solids (#394), so its parts come with a scope of their own:
 * the kernel cuts its holes into its solids before the rest is added. Left closed it went as its mesh, and four
 * such groups patterned and grouped were thousands of triangles the edge tool could not finish (#996).
 */
export type EdgeToolPart = { shape: WorkplaneShape; scope: number[] };

export function restoreGroupedChildrenForEdges(group: WorkplaneShape, scope: number[] = [], nestedScopes = { count: 0 }): EdgeToolPart[] {
  // A hull or an intersection is its own body, not the sum of its parts: opened, Hollow hollowed the two rounds of a
  // hull one by one and the hull was gone, and an intersection could not be hollowed at all (#908). Its mesh goes.
  // A loft between two sketches is the same: its parts are only its two outlines.
  if (group.groupOperation === "hull" || group.groupOperation === "intersection" || group.groupOperation === "loft") return [{ shape: group, scope }];
  return restoreGroupedChildren(group).flatMap((child) => {
    const grandChildren = child.groupedShapes ?? [];
    // Only while its mesh is still nothing but its parts. Every computed group carries its mesh, so that alone says
    // nothing; baking an edge treatment, a deform or a simplification drops the parts, and texture, wrap or vase stay out.
    const plainParts = grandChildren.length > 0
      && !shapeHasShapeDeform(child)
      && !child.edgeTreatments?.length
      && !child.cadBrep
      && !child.surfaceTexture
      && !child.cylinderWrap
      && !child.vase;
    const plainGroup = plainParts && (child.groupOperation === undefined || child.groupOperation === "group");
    // A bundle of nothing but holes cuts what it is grouped with, as its holes would one by one. Left closed it went as
    // its mesh, each round hole a polygon of 96 flat strips, and filleting their rims lost a whole hole (#1503).
    const holeBundle = plainParts && child.groupOperation === "bundle" && Boolean(child.hole) && grandChildren.every((part) => part.hole);
    const opensCleanly = holeBundle || (plainGroup
      && (grandChildren.every((part) => part.hole) || grandChildren.every((part) => !part.hole))
      && (child.hole || grandChildren.every((part) => !part.hole)));
    // Opened into the same level, so it numbers the scopes inside it on with that level's count.
    if (opensCleanly) return restoreGroupedChildrenForEdges(child, scope, nestedScopes);
    const opensInOwnScope = plainGroup
      && !child.hole
      && grandChildren.some((part) => part.hole)
      && grandChildren.some((part) => !part.hole);
    if (opensInOwnScope) return restoreGroupedChildrenForEdges(child, [...scope, nestedScopes.count++], { count: 0 });
    // A bundle that mixes solids and holes: its holes cut what it is grouped with, not its own solids (#646). Left closed it
    // went as its mesh, which has the hole already taken out of its own solids and so no hole at all: a peg standing in its
    // own hole came out of a chamfer with the hole filled (#1164).
    const opensAsBundle = grandChildren.length > 0
      && child.groupOperation === "bundle"
      && !shapeHasShapeDeform(child)
      && !child.hole
      && !child.edgeTreatments?.length
      && !child.cadBrep
      && !child.surfaceTexture
      && !child.cylinderWrap
      && !child.vase
      && grandChildren.some((part) => part.hole)
      && grandChildren.some((part) => !part.hole);
    if (opensAsBundle) return restoreGroupedChildrenForEdges(child, [...scope, BUNDLE_SCOPE_BASE + nestedScopes.count++], { count: 0 });
    return [{ shape: child, scope }];
  });
}

/**
 * A bent tube's opening as a hole (#892), as `splitBoreTube` does it for a tube: the pipe as a solid without its opening, and the opening as a bent tube of its own
 * that is a hole - same path, same start, the opening's profile as its outside. Both come from `bentTubeParameterPatch`,
 * so a pipe that was stretched by its handles keeps that stretch in each part.
 */
function splitBentTubeBore(shape: WorkplaneShape): WorkplaneShape[] {
  const settings = bentTubeSettings(shape);
  const radii = bentTubeProfileRadii(settings);
  if (settings.innerProfile === "none" || radii.inner === null) return [shape];
  const sides = settings.innerProfile === "square" ? 4 : settings.innerProfile === "hexagon" ? 6 : settings.innerProfile === "octagon" ? 8 : 0;
  const boreSize = sides === 0 ? 2 * radii.inner : 2 * radii.inner * Math.cos(Math.PI / sides);
  const { tubeBoreHole: _flag, ...rest } = shape;
  const solid = { ...rest, ...bentTubeParameterPatch(shape, { bentTubeInnerProfile: "none" }) };
  // The opening starts where the pipe starts, in all three directions, turned and mirrored as the pipe is: handed its
  // path, the patch keeps the start in place in height too, as it does when the bends change. Its box sharing its middle
  // with the pipe's is not enough: a pipe lying flat has the opening a wall lower (#892), and one standing, by its
  // rotation (#1367) or by the roll of a bend (#1545), has a leg and a bend in its height, so the opening ended short of
  // the top end and closed it.
  const boreChanges = { bentTubeProfile: settings.innerProfile, bentTubeInnerProfile: "none" as const, bentTubeSize: boreSize, bentTubeSegments: settings.segments };
  const bore = {
    ...rest,
    ...bentTubeParameterPatch(shape, boreChanges),
    id: derivedLocalId(shape.id, "bore"),
    hole: true,
  };
  return [solid, bore];
}

/**
 * A tube or ring whose bore counts as a hole (#892) is cut as two shapes: its outer cylinder, a solid, and its bore, a hole.
 * The bore then cuts whatever the tube is grouped with, as a hole does - the wall of the other tube in a T-junction, which the
 * bore of a plain tube never reaches. Only where shapes are combined: the tube itself stays one shape.
 */
export function splitBoreTube(shape: WorkplaneShape): WorkplaneShape[] {
  // A filleted or chamfered tube stays the solid it is, its ends rounded; the bore of the tube it was cuts the rest (#1067).
  const tube = shape.tubeBoreHole === true && !shape.hole ? tubeBeforeEdgeTreatments(shape) : null;
  if (tube) return [{ ...shape, tubeBoreHole: undefined }, ...splitBoreTube({ ...tube, tubeBoreHole: true }).slice(1)];
  if (shape.tubeBoreHole === true && !shape.hole && !shape.importedMesh && shape.kind === "bentTube") return splitBentTubeBore(shape);
  if (shape.tubeBoreHole !== true || shape.hole || shape.importedMesh || (shape.kind !== "tube" && shape.kind !== "ring")) return [shape];
  const wall = Math.max(0, shape.bevel ?? 4);
  const width = shape.width - 2 * wall;
  const depth = (shape.depth ?? shape.width) - 2 * wall;
  if (!(width > 0.05) || !(depth > 0.05)) return [shape];
  const { tubeBoreHole: _flag, bevel: _wall, ...rest } = shape;
  return [
    { ...rest, kind: "cylinder", bevel: 0 },
    // The bore's slope and side drop are measured over the tube, so its top lies on the tube's (#1698): measured over its
    // own, narrower width it ran down more steeply, stood out past the sloped end on one side and stopped short on the other.
    { ...rest, id: derivedLocalId(shape.id, "bore"), kind: "cylinder", hole: true, bevel: 0, width, depth, size: Math.max(width, depth), slopeSpan: { width: shape.width, depth: shape.depth ?? shape.width } },
  ];
}

function expandGroupsForBoolean(selection: WorkplaneShape[]): WorkplaneShape[] {
  return selection.filter(shownInCut).flatMap((shape) => {
    if (shape.importedMesh) {
      return [shape];
    }
    return shape.groupedShapes?.length ? restoreGroupedChildren(shape) : [shape];
  }).flatMap(splitBoreTube).filter(shownInCut);
}

/**
 * A part hidden inside a group stays one of its parts, but it is not cut and not cut with (#1323): the group's
 * body is what is shown, as the plain group and the export already had it. A hidden ring came back on Done.
 * A group hidden as a whole stays out too, before it is taken apart into parts that are not hidden themselves.
 */
function shownInCut(shape: WorkplaneShape) {
  return !shape.hidden;
}

function expandGroupsForBoxBoolean(selection: WorkplaneShape[]): WorkplaneShape[] {
  // An intersection or a hull is not the sum of its parts: opened, a hull of four boxes would be cut as the four boxes (#863).
  return selection.filter(shownInCut).flatMap((shape) => (shape.groupedShapes?.length && shape.groupOperation !== "intersection" && shape.groupOperation !== "hull" && shape.groupOperation !== "loft" ? restoreGroupedChildren(shape) : [shape])).flatMap(splitBoreTube).filter(shownInCut);
}

/** The solids hidden among the parts of a group, where they stand, also those hidden inside a group among them. */
function hiddenSolidsAmong(selection: WorkplaneShape[]): WorkplaneShape[] {
  return selection.flatMap((shape) => {
    if (shape.hidden) return shape.hole ? [] : [shape];
    if (shape.importedMesh || !shape.groupedShapes?.length) return [];
    return hiddenSolidsAmong(restoreGroupedChildren(shape));
  });
}

/**
 * A group with a hole is cut into one body, and its box was that body's box. A solid hidden in it stays out of the
 * body (shownInCut) but is still one of its parts, and in a plain group it keeps its room: a wide ring hidden on an
 * axle kept the group as wide as the ring, until the group had a hole (#1323). The box now takes in the hidden solids
 * there too, the body standing where it was inside it, and the alignment counts them (alignBounds). Not below the
 * body's foot: the view stands a body on the foot of its box. The same goes for a group with an imported mesh.
 */
function withRoomForHiddenParts(group: WorkplaneShape, selected: WorkplaneShape[]): WorkplaneShape {
  const mesh = group.importedMesh;
  if (!mesh || mesh.positions.length < 9 || mesh.assetId || mesh.storageResourceId || mesh.brepStep || group.cadBrep || !group.groupedShapes?.length) return group;
  if (group.rotation || group.rotationX || group.rotationZ) return group;
  const hidden = hiddenSolidsAmong(selected);
  if (!hidden.length) return group;
  const room = boundsForShapesOfVertices(hidden);
  if (![room.minX, room.maxX, room.maxY, room.minZ, room.maxZ].every(Number.isFinite)) return group;
  const width = shapeWidth(group);
  const depth = shapeDepth(group);
  const foot = group.elevation ?? 0;
  const minX = Math.min(group.x - width / 2, room.minX);
  const maxX = Math.max(group.x + width / 2, room.maxX);
  const minZ = Math.min(group.z - depth / 2, room.minZ);
  const maxZ = Math.max(group.z + depth / 2, room.maxZ);
  const nextWidth = cleanModelDimension(Math.max(width, maxX - minX));
  const nextDepth = cleanModelDimension(Math.max(depth, maxZ - minZ));
  const nextHeight = cleanModelDimension(Math.max(group.height, room.maxY - foot));
  const grows = (next: number, now: number) => next - now > POINT_TOLERANCE;
  if (!grows(nextWidth, width) && !grows(nextDepth, depth) && !grows(nextHeight, group.height)) return group;
  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const shiftX = centerX - group.x;
  const shiftZ = centerZ - group.z;
  // The body's points and the parts are kept at the size the group was built at, a hair from its size in the world.
  const meshX = mesh.baseWidth / Math.max(MIN_SHAPE_DIMENSION, width);
  const meshY = mesh.baseHeight / Math.max(MIN_SHAPE_DIMENSION, group.height);
  const meshZ = mesh.baseDepth / Math.max(MIN_SHAPE_DIMENSION, depth);
  const partsX = (group.groupedBaseWidth ?? width) / Math.max(MIN_SHAPE_DIMENSION, width);
  const partsY = (group.groupedBaseHeight ?? group.height) / Math.max(MIN_SHAPE_DIMENSION, group.height);
  const partsZ = (group.groupedBaseDepth ?? depth) / Math.max(MIN_SHAPE_DIMENSION, depth);
  const positions = mesh.positions.slice();
  for (let offset = 0; offset + 2 < positions.length; offset += 3) {
    positions[offset] -= shiftX * meshX;
    positions[offset + 2] -= shiftZ * meshZ;
  }
  return {
    ...group,
    x: centerX,
    z: centerZ,
    width: nextWidth,
    depth: nextDepth,
    height: nextHeight,
    size: Math.max(nextWidth, nextDepth),
    importedMesh: { ...mesh, positions, baseWidth: nextWidth * meshX, baseDepth: nextDepth * meshZ, baseHeight: nextHeight * meshY },
    groupedBaseWidth: nextWidth * partsX,
    groupedBaseDepth: nextDepth * partsZ,
    groupedBaseHeight: nextHeight * partsY,
    groupedShapes: group.groupedShapes.map((part) => ({ ...part, x: part.x - shiftX * partsX, z: part.z - shiftZ * partsZ })),
  };
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

/**
 * A group of several colours that is brought into another group opens into its parts there, so the outer group can
 * show each part in its colour (#418): a group made of a red and a white part, grouped with a hole, used to
 * come out in one colour, as the outer group only knew the inner group as one body. A group of one colour, a hole,
 * a bundle and a group that does not show its parts in their colours stay as they are.
 */
function withMulticolorGroupsOpened(selection: WorkplaneShape[]): WorkplaneShape[] {
  return selection.flatMap((shape) => {
    if (shape.hole || shape.groupOperation === "bundle" || !shape.groupedShapes?.length || !groupShowsPartColors(shape)) return [shape];
    const parts = shape.groupedShapes.filter((part) => !part.hole && !part.hidden);
    if (new Set(parts.map((part) => part.color)).size < 2) return [shape];
    return restoreGroupedChildren(shape);
  });
}

export async function buildGroupedShapeFromSelection(selected: WorkplaneShape[], triangleLimit: number): Promise<GroupBuildResult> {
  takeHoleFillTally();
  // What the group carries as its parts; the cut itself is made from what was selected.
  const groupable = withMulticolorGroupsOpened(selected);
  const booleanSelection = expandGroupsForBoolean(selected);
  const hasSolid = booleanSelection.some((shape) => !shape.hole);
  // A bundle's hole can sit in a bundle inside it, one level deeper than the selection is opened here: then the group
  // was made as a plain one and cut nothing, while a second bundle with its hole on top made the same group cut (#1528).
  const hasHole = booleanSelection.some((shape) => shape.hole) || selected.some(isBundleWithHole);
  const hasImportedMesh = booleanSelection.some((shape) => Boolean(shape.importedMesh));
  const boxBooleanSelection = hasSolid && hasHole ? expandGroupsForBoxBoolean(selected) : [];
  // Der Boolesche Kern rechnet auf der geflachten Auswahl, aber das Ergebnis
  // soll trotzdem die urspruenglichen, ungeflachten Formen als seine
  // "groupedShapes" tragen - sonst geht eine mitgebrachte Gruppe (z. B. vier
  // gruppierte Gewinde) beim Vereinigen verloren, weil sie ab da nur noch
  // als vier einzelne Kinder existiert (Forum: Gruppe verschwindet beim
  // Aufloesen einer Vereinigung, die eine Gewinde-Gruppe enthielt).
  const bundleCutGroup = hasSolid && hasHole ? await manifoldBundleCutShape(selected, triangleLimit, groupable) : null;
  const cleanBoxGroup = !bundleCutGroup && canUseBoxBoolean(boxBooleanSelection) ? boxedBooleanMeshShape(boxBooleanSelection, groupable) : null;
  const manifoldCutGroup = hasSolid && hasHole ? bundleCutGroup ?? await manifoldBooleanMeshShape(booleanSelection, triangleLimit, { requireImported: false }, groupable) : null;
  const manifoldImportedMerge = hasImportedMesh && hasSolid && !hasHole ? await manifoldUnionMeshShape(booleanSelection, triangleLimit, groupable) : null;
  const exactImportedGroup = hasImportedMesh && hasSolid && hasHole ? manifoldCutGroup ?? importedBooleanMeshShape(booleanSelection, groupable) : null;
  const bakedImportedMerge = hasImportedMesh && !(hasSolid && hasHole) ? manifoldImportedMerge ?? mergedMeshShape(booleanSelection, groupable) : null;
  const built = hasSolid && hasHole
    ? cleanBoxGroup ??
      exactImportedGroup ??
      (hasImportedMesh
        ? null
        : manifoldCutGroup ?? booleanMeshShape(booleanSelection, groupable))
    : hasImportedMesh
      ? bakedImportedMerge ?? groupedShape(groupable)
      : newPlainGroup(groupable);
  const group = built ? withRoomForHiddenParts(built, selected) : null;
  const consumed = !group && hasSolid && hasHole && cutFullyConsumesSolids(booleanSelection);
  // The cut was made, but the fallback left its face open: say so when the cause is gaps in the surface (#346).
  const openGapEdges = group && hasImportedMesh && hasSolid && hasHole && OPEN_CUT_ID.test(group.id)
    ? openSurfaceEdgeCount(booleanSelection.filter((shape) => !shape.hole && !shape.locked))
    : 0;
  // Above the limit the solids are only laid together, they are kept overlapping when exported.
  const unmergedTriangles = group && built === bakedImportedMerge && !manifoldImportedMerge && hasSolid
    ? group.importedMesh?.triangleCount ?? 0
    : 0;
  const mergeWarning = unmergedTriangles > triangleLimit
    ? t("status.groupNotMerged", { triangles: formatTriangleCount(unmergedTriangles), limit: formatTriangleCount(triangleLimit) })
    : undefined;
  const holes = takeHoleFillTally();
  return {
    group,
    openGapEdges,
    mergeWarning,
    closedHoles: group ? holes.closed : 0,
    booleanSelection,
    hasSolid,
    hasHole,
    hasImportedMesh,
    consumed,
    failureNotice: holes.open > 0 && !group && !consumed
      ? t("status.holesTooLarge", { count: holes.open })
      : hasImportedMesh && hasSolid && hasHole
        ? importedCutFailureNotice(booleanSelection, Boolean(group) || consumed, triangleLimit)
        : hasSolid && hasHole ? "Could not cut this selection" : "Could not group this selection",
  };
}
