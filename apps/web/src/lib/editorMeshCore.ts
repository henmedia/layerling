
import type manifoldModule from "manifold-3d";
import type { ManifoldToplevel } from "manifold-3d";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { numberLocale } from "@/lib/i18n";
import { sphereTessellation } from "@/lib/sphereTessellation";
import { torusTessellation } from "@/lib/torusTessellation";
import { torusRadii, torusTubeRatio } from "@/lib/torusShape";
import { createGearGeometry } from "@/lib/gearGeometry";
import { createStarGeometry } from "@/lib/starGeometry";
import { createHeartGeometry } from "@/lib/heartGeometry";
import { createCrescentGeometry } from "@/lib/crescentGeometry";
import { createSlotGeometry } from "@/lib/slotGeometry";
import { createDovetailGeometry } from "@/lib/dovetailGeometry";
import { createLoftGeometry } from "@/lib/loftGeometry";
import { createHingeGeometry } from "@/lib/hingeGeometry";
import { createGridfinityGeometry } from "@/lib/gridfinityGeometry";
import { createKnurlGeometry } from "@/lib/knurlGeometry";
import { fittedVaseMesh } from "@/lib/vaseShape";
import { createTeardropGeometry } from "@/lib/teardropGeometry";
import { createScrewHoleGeometry } from "@/lib/screwHoleGeometry";
import { createHoneycombGeometry } from "@/lib/honeycombGeometry";
import { createRoundedBoxGeometry } from "@/lib/roundedBoxGeometry";
import { createBentTubeGeometry } from "@/lib/bentTubeGeometry";
import { createPrismGeometry } from "@/lib/prismGeometry";
import { createBooleanHalfSphereGeometry, createBooleanHollowCylinderGeometry, createBooleanRoundRoofGeometry, createParaboloidGeometry } from "@/lib/roundBodyGeometry";
import { createPyramidGeometry } from "@/lib/pyramidGeometry";
import { roundSideCount } from "@/lib/roundSideCount";
import { createThreadGeometry } from "@/lib/threadGeometry";
import { createSpringGeometry } from "@/lib/springGeometry";
import { textDisplayGeometry } from "@/lib/textFill";
import { rememberManifoldRuntime, setManifoldLoader } from "@/lib/manifoldHandle";
import { meshForTwist, twistBandCount } from "@/lib/heightSlices";
import { groupedContentScale, scaleGroupedVertices } from "@/lib/groupScale";
import { deformsAboutOrigin, meshYawDegrees, mirroredAxisCount, mirrorSign, resizedImportedMeshPositions, shapeDepth, shapeExtrudeDeformAt, shapeHasExtrudeDeform, shapeHasTaper, shapeTaperScaleAt, shapeWidth } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

export type Vec3 = [number, number, number];

export type MeshData = { name: string; vertices: Vec3[]; faces: [number, number, number][] };

export type Cuboid = { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number };

export type ShapeUpdatePatch = Partial<WorkplaneShape> & { bakeTransform?: boolean };

export type ManifoldSolid = ReturnType<ManifoldToplevel["Manifold"]["cube"]>;

/** What a hole sticks out at its top and bottom: 0.05 took a floor up to that thin away with it (#691). */
export const CUTTER_PADDING = 0.001;

/** What a hole is wider than typed, on each side: the size stays, an exact touch with a wall does not. */
export const CUTTER_LATERAL_PADDING = 0.001;

export const POINT_TOLERANCE = 0.0001;

export const CUTTER_RESIDUAL_INSET = 0.02;

export const MIN_SHAPE_DIMENSION = 0.01;

const MODEL_DIMENSION_PRECISION = 3;

// The exact kernel (Manifold) cuts a few hundred thousand triangles in about a
// second; its limit is the workspace setting handed to the boolean helpers
// below. The triangle-soup fallback for meshes that are not watertight is far
// slower and keeps this lower limit so it cannot freeze the editor.
export const IMPORTED_FALLBACK_BOOLEAN_TRIANGLE_LIMIT = 150000;

export const COPLANAR_BOOLEAN_RESCUE_DEGREES = 0.02;

let manifoldRuntimePromise: Promise<ManifoldToplevel> | null = null;

/** Lets a real grouping action load the runtime again after an idle preload was interrupted. */
export function resetManifoldRuntime() {
  manifoldRuntimePromise = null;
}

export function cleanModelDimension(value: number) {
  return Math.max(MIN_SHAPE_DIMENSION, Number(value.toFixed(MODEL_DIMENSION_PRECISION)));
}

// A worker has no page address to find manifold.js next to, so the page hands it over (lib/geometryWorker.ts).
let manifoldAssetBaseOverride: string | null = null;

export function setManifoldAssetBase(base: string) {
  manifoldAssetBaseOverride = base;
}

export function getManifoldRuntime() {
  const assetBase = manifoldAssetBaseOverride ?? (typeof window === "undefined" ? "/" : new URL(".", window.location.href).href);
  const manifoldScriptUrl = new URL("manifold.js", assetBase).href;
  const runtimeModule = import(/* webpackIgnore: true */ manifoldScriptUrl).then((module) => (module as { default: typeof manifoldModule }).default);
  // Drop a rejected attempt so a transient failure (e.g. a network blip
  // fetching the manifold wasm) can be retried on the next call instead of
  // poisoning every boolean operation for the rest of the session - same fix
  // as brepKernel.ts's loadBrepWithOcct.
  manifoldRuntimePromise ??= runtimeModule
    .then((module) => {
      return module({
        locateFile: ((file: string) => (file.endsWith(".wasm") ? new URL("manifold.wasm", assetBase).href : new URL(file, assetBase).href)) as () => string,
      });
    })
    .then((runtime) => {
      runtime.setup();
      // Text fills (#215) build on the spot and need the runtime without awaiting it.
      rememberManifoldRuntime(runtime);
      return runtime;
    })
    .catch((error) => {
      manifoldRuntimePromise = null;
      throw error;
    });
  return manifoldRuntimePromise;
}
setManifoldLoader(getManifoldRuntime);

function sanitizeName(name: string) {
  return name.replace(/[^a-z0-9_-]+/gi, "_") || "shape";
}

export function transformMesh(mesh: MeshData, shape: WorkplaneShape): MeshData {
  const centerY = shape.height / 2;
  const tapered = shapeHasTaper(shape);
  const deformed = shapeHasExtrudeDeform(shape);
  let minLocalY = 0;
  let maxLocalY = 1;
  // Taper and twist work towards the middle of the mesh's extent, as the
  // viewport does; a star or a heart is not centred on its origin.
  let deformCenterX = 0;
  let deformCenterZ = 0;
  if ((tapered || deformed) && mesh.vertices.length) {
    minLocalY = Number.POSITIVE_INFINITY;
    maxLocalY = Number.NEGATIVE_INFINITY;
    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minZ = Number.POSITIVE_INFINITY;
    let maxZ = Number.NEGATIVE_INFINITY;
    mesh.vertices.forEach((vertex) => {
      minLocalY = Math.min(minLocalY, vertex[1]);
      maxLocalY = Math.max(maxLocalY, vertex[1]);
      minX = Math.min(minX, vertex[0]);
      maxX = Math.max(maxX, vertex[0]);
      minZ = Math.min(minZ, vertex[2]);
      maxZ = Math.max(maxZ, vertex[2]);
    });
    deformCenterX = (minX + maxX) / 2;
    deformCenterZ = (minZ + maxZ) / 2;
    // A star turns about its own middle, not about the middle of its box (#476).
    if (deformsAboutOrigin(shape.kind)) {
      deformCenterX = 0;
      deformCenterZ = 0;
    }
  }
  const taperHeight = Math.max(1e-6, maxLocalY - minLocalY);
  // A twist needs vertices partway up to turn: cut the mesh into bands first, as the viewport does (#184).
  const bands = deformed ? twistBandCount(shape.extrudeTwist ?? 0) : 1;
  if (bands > 1 && mesh.vertices.length) {
    const sliced = meshForTwist(mesh.vertices as Vec3[], mesh.faces as Array<[number, number, number]>, minLocalY, maxLocalY, shape.extrudeTwist ?? 0);
    mesh = { ...mesh, vertices: sliced.vertices, faces: sliced.faces };
  }
  const matrix = new THREE.Matrix4().makeRotationFromEuler(
    new THREE.Euler(
      THREE.MathUtils.degToRad(shape.rotationX ?? 0),
      THREE.MathUtils.degToRad(meshYawDegrees(shape)),
      THREE.MathUtils.degToRad(shape.rotationZ ?? 0),
      "XYZ",
    ),
  );
  const mirrorX = mirrorSign(shape.mirrorX);
  const mirrorY = mirrorSign(shape.mirrorY);
  const mirrorZ = mirrorSign(shape.mirrorZ);
  const reversedWinding = mirroredAxisCount(shape) % 2 === 1;
  return {
    ...mesh,
    vertices: mesh.vertices.map(([x, y, z]) => {
      const normalizedHeight = (y - minLocalY) / taperHeight;
      const widthScale = tapered ? shapeTaperScaleAt(shape, normalizedHeight, "width") : 1;
      const depthScale = tapered ? shapeTaperScaleAt(shape, normalizedHeight, "depth") : 1;
      let localX = (x - deformCenterX) * widthScale;
      let localZ = (z - deformCenterZ) * depthScale;
      if (deformed) {
        const deform = shapeExtrudeDeformAt(shape, normalizedHeight);
        const cos = Math.cos(deform.twistRadians);
        const sin = Math.sin(deform.twistRadians);
        const twistedX = localX * cos - localZ * sin;
        const twistedZ = localX * sin + localZ * cos;
        localX = twistedX + deform.offsetX;
        localZ = twistedZ + deform.offsetZ;
      }
      localX += deformCenterX;
      localZ += deformCenterZ;
      const vertex = new THREE.Vector3(localX * mirrorX, (y - centerY) * mirrorY, localZ * mirrorZ).applyMatrix4(matrix);
      return [vertex.x + shape.x, vertex.y + (shape.elevation ?? 0) + centerY, vertex.z + shape.z] as Vec3;
    }),
    faces: reversedWinding ? mesh.faces.map(([a, b, c]) => [a, c, b] as [number, number, number]) : mesh.faces,
  };
}

function boxMesh(shape: WorkplaneShape): MeshData {
  const width = shapeWidth(shape);
  const depth = shapeDepth(shape);
  const height = shape.height;
  const x = width / 2;
  const z = depth / 2;
  return {
    name: sanitizeName(shape.name),
    vertices: [
      [-x, 0, -z],
      [x, 0, -z],
      [x, 0, z],
      [-x, 0, z],
      [-x, height, -z],
      [x, height, -z],
      [x, height, z],
      [-x, height, z],
    ],
    faces: [
      [0, 2, 1],
      [0, 3, 2],
      [4, 5, 6],
      [4, 6, 7],
      [0, 1, 5],
      [0, 5, 4],
      [1, 2, 6],
      [1, 6, 5],
      [2, 3, 7],
      [2, 7, 6],
      [3, 0, 4],
      [3, 4, 7],
    ],
  };
}

function cylinderMesh(shape: WorkplaneShape, sides = 96, topRadiusScale = 1): MeshData {
  const width = shapeWidth(shape);
  const depth = shapeDepth(shape);
  const height = shape.height;
  const vertices: Vec3[] = [[0, 0, 0], [0, height, 0]];
  for (let i = 0; i < sides; i += 1) {
    const angle = (i / sides) * Math.PI * 2;
    vertices.push([(Math.cos(angle) * width) / 2, 0, (Math.sin(angle) * depth) / 2]);
    vertices.push([(Math.cos(angle) * width * topRadiusScale) / 2, height, (Math.sin(angle) * depth * topRadiusScale) / 2]);
  }
  const faces: [number, number, number][] = [];
  for (let i = 0; i < sides; i += 1) {
    const next = (i + 1) % sides;
    const b0 = 2 + i * 2;
    const t0 = b0 + 1;
    const b1 = 2 + next * 2;
    const t1 = b1 + 1;
    faces.push([0, b1, b0]);
    if (topRadiusScale > 0) {
      faces.push([1, t0, t1]);
      faces.push([b0, b1, t1], [b0, t1, t0]);
    } else {
      faces.push([b0, b1, t0]);
    }
  }
  return { name: sanitizeName(shape.name), vertices, faces };
}

function sphereMesh(shape: WorkplaneShape): MeshData {
  const { widthSegments: lon, heightSegments: lat } = sphereTessellation(shape.steps);
  const width = shapeWidth(shape);
  const depth = shapeDepth(shape);
  const height = shape.height;
  const vertices: Vec3[] = [];
  for (let yStep = 0; yStep <= lat; yStep += 1) {
    const theta = (yStep / lat) * Math.PI;
    const y = height / 2 + Math.cos(theta) * (height / 2);
    const ring = Math.sin(theta);
    for (let xStep = 0; xStep < lon; xStep += 1) {
      const phi = (xStep / lon) * Math.PI * 2;
      vertices.push([(Math.cos(phi) * width * ring) / 2, y, (Math.sin(phi) * depth * ring) / 2]);
    }
  }
  const faces: [number, number, number][] = [];
  for (let yStep = 0; yStep < lat; yStep += 1) {
    for (let xStep = 0; xStep < lon; xStep += 1) {
      const next = (xStep + 1) % lon;
      const a = yStep * lon + xStep;
      const b = yStep * lon + next;
      const c = (yStep + 1) * lon + next;
      const d = (yStep + 1) * lon + xStep;
      faces.push([a, d, c], [a, c, b]);
    }
  }
  return { name: sanitizeName(shape.name), vertices, faces };
}

function bufferGeometryToMeshData(name: string, geometry: THREE.BufferGeometry): MeshData {
  const prepared = geometry.index ? geometry.toNonIndexed() : geometry;
  prepared.computeVertexNormals();
  prepared.computeBoundingBox();
  const minY = prepared.boundingBox?.min.y ?? 0;
  if (Math.abs(minY) > 0.000001) {
    prepared.translate(0, -minY, 0);
    prepared.computeBoundingBox();
  }

  const position = prepared.getAttribute("position");
  const vertices: Vec3[] = [];
  const faces: [number, number, number][] = [];
  for (let i = 0; i < position.count; i += 1) {
    vertices.push([position.getX(i), position.getY(i), position.getZ(i)]);
  }
  for (let i = 0; i + 2 < position.count; i += 3) {
    faces.push([i, i + 1, i + 2]);
  }

  if (prepared !== geometry) {
    prepared.dispose();
  }
  geometry.dispose();
  return { name, vertices, faces };
}

function createBooleanRoofGeometry(width: number, height: number, depth: number) {
  const w = width / 2;
  const d = depth / 2;
  const vertices = new Float32Array([
    -w, 0, -d, w, 0, -d, 0, height, -d,
    -w, 0, d, w, 0, d, 0, height, d,
  ]);
  const indices = [
    0, 2, 1,
    3, 4, 5,
    0, 1, 4, 0, 4, 3,
    0, 3, 5, 0, 5, 2,
    1, 2, 5, 1, 5, 4,
  ];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  return geometry;
}

function createBooleanWedgeGeometry(width: number, height: number, depth: number) {
  const w = width / 2;
  const d = depth / 2;
  const vertices = new Float32Array([
    -w, 0, -d, w, 0, -d, w, height, -d,
    -w, 0, d, w, 0, d, w, height, d,
  ]);
  const indices = [
    0, 2, 1,
    3, 4, 5,
    0, 1, 4, 0, 4, 3,
    1, 2, 5, 1, 5, 4,
    0, 3, 5, 0, 5, 2,
  ];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  return geometry;
}

function createBooleanTorusGeometry(width: number, height: number, depth: number, shape: Pick<WorkplaneShape, "sides" | "steps" | "torusTubeRatio">) {
  const { tubeRadius, majorRadius, outerDiameter, verticalScale } = torusRadii(width, depth, height, torusTubeRatio({ ...shape, width, depth, height }));
  const { ringSides, tubeSteps } = torusTessellation(shape, width, depth, height);
  const geometry = new THREE.TorusGeometry(majorRadius, tubeRadius, tubeSteps, ringSides);
  geometry.rotateX(Math.PI / 2);
  geometry.scale(width / Math.max(0.001, outerDiameter), verticalScale, depth / Math.max(0.001, outerDiameter));
  return geometry;
}

function createBooleanTextGeometry(shape: WorkplaneShape) {
  return textDisplayGeometry(shape);
}

function geometryMeshForShape(shape: WorkplaneShape): MeshData | null {
  const width = shapeWidth(shape);
  const depth = shapeDepth(shape);
  const height = shape.height;
  const size = Math.min(width, depth);
  let geometry: THREE.BufferGeometry | null = null;

  switch (shape.kind) {
    case "box":
      geometry = shape.radius && shape.radius > 0
        ? new RoundedBoxGeometry(width, height, depth, Math.max(1, shape.steps ?? 10), shape.radius)
        : new THREE.BoxGeometry(width, height, depth);
      break;
    case "ruler":
      // Reines Messwerkzeug, keine echte Formgeometrie - derselbe schlichte
      // Quader wie im Live-Viewport (WorkplaneViewport.tsx, case "ruler"),
      // nur ohne die Tick-Textur, die hier fuer Backen/Export nicht gebraucht
      // wird. Fehlte dieser Fall, fiel ein bei 45 Grad gebackenes Lineal auf
      // die falsche "sketch"-Ersatzgeometrie zurueck (Forum: kaputtes Netz
      // nach schraeger Drehung).
      geometry = new THREE.BoxGeometry(width, height, depth);
      break;
    case "cylinder":
    case "ellipse":
      geometry = createPrismGeometry(width, height, depth, roundSideCount(shape.sides, width, depth), shape.segments ?? 1);
      break;
    case "sphere":
      geometry = new THREE.SphereGeometry(1, sphereTessellation(shape.steps).widthSegments, sphereTessellation(shape.steps).heightSegments);
      geometry.scale(width / 2, height / 2, depth / 2);
      break;
    case "cone": {
      const baseRadius = shape.baseRadius ?? width / 2;
      geometry = new THREE.CylinderGeometry(shape.topRadius ?? 0, baseRadius, height, roundSideCount(shape.sides, width, depth));
      geometry.scale(1, 1, depth / Math.max(0.001, width));
      break;
    }
    case "pyramid":
      geometry = createPyramidGeometry(width, height, depth, shape.sides ?? 4, shape.topWidth, shape.topDepth);
      break;
    case "roof":
      geometry = createBooleanRoofGeometry(width, height, depth);
      break;
    case "roundRoof":
      geometry = createBooleanRoundRoofGeometry(width, height, depth, shape.sides ?? 64);
      break;
    case "halfSphere":
      geometry = createBooleanHalfSphereGeometry(width, height, depth, shape.steps ?? 32);
      break;
    case "paraboloid":
      geometry = createParaboloidGeometry(width, height, depth, shape.steps ?? 32);
      break;
    case "torus":
      geometry = createBooleanTorusGeometry(width, height, depth, shape);
      break;
    case "ring":
    case "tube":
      geometry = createBooleanHollowCylinderGeometry(width, height, depth, shape.bevel ?? 4, roundSideCount(shape.sides, width, depth));
      break;
    case "star":
      geometry = createStarGeometry({
        width,
        depth,
        height,
        starPoints: shape.starPoints,
        starInnerSize: shape.starInnerSize,
        starOuterFillet: shape.starOuterFillet,
        starInnerFillet: shape.starInnerFillet,
        starQuality: shape.starQuality,
      });
      break;
    case "heart":
      geometry = createHeartGeometry({
        width,
        depth,
        height,
        heartTipFillet: shape.heartTipFillet,
        heartQuality: shape.heartQuality,
      });
      break;
    case "crescent":
      geometry = createCrescentGeometry({
        width,
        depth,
        height,
        crescentThickness: shape.crescentThickness,
        crescentTipFillet: shape.crescentTipFillet,
        crescentQuality: shape.crescentQuality,
      });
      break;
    case "slot":
      geometry = createSlotGeometry({
        width,
        depth,
        height,
        sides: shape.sides,
        slotEndRatio: shape.slotEndRatio,
      });
      break;
    case "counterbore":
    case "countersink":
    case "doubleCountersink":
      geometry = createScrewHoleGeometry({ kind: shape.kind, width, depth, height, screwHoleShaft: shape.screwHoleShaft, screwHoleHeadDepth: shape.screwHoleHeadDepth, screwHoleAngle: shape.screwHoleAngle, sides: roundSideCount(shape.sides, width, depth) });
      break;
    case "teardrop":
      geometry = createTeardropGeometry({ width, depth, height, sides: roundSideCount(shape.sides, width, depth) });
      break;
    case "knurl":
      geometry = createKnurlGeometry({ width, height, knurlPattern: shape.knurlPattern, knurlCount: shape.knurlCount, knurlDepth: shape.knurlDepth, knurlAngle: shape.knurlAngle, knurlChamfer: shape.knurlChamfer });
      break;
    case "vase": {
      // The triangles as they are: the shaded geometry's normals cost twice the vase itself here, for nothing.
      const { positions } = fittedVaseMesh({ width, depth, height, vase: shape.vase });
      const vertices: Vec3[] = [];
      const faces: [number, number, number][] = [];
      for (let i = 0; i + 8 < positions.length; i += 9) {
        const base = vertices.length;
        vertices.push([positions[i], positions[i + 1], positions[i + 2]], [positions[i + 3], positions[i + 4], positions[i + 5]], [positions[i + 6], positions[i + 7], positions[i + 8]]);
        faces.push([base, base + 1, base + 2]);
      }
      return { name: sanitizeName(shape.name), vertices, faces };
    }
    case "hinge":
      geometry = createHingeGeometry({
        width,
        depth,
        height,
        hingeKnuckles: shape.hingeKnuckles,
        hingeKnuckleWidth: shape.hingeKnuckleWidth,
        hingeConeSize: shape.hingeConeSize,
        hingeStyle: shape.hingeStyle,
        hingePinDiameter: shape.hingePinDiameter,
        hingeLeafThickness: shape.hingeLeafThickness,
        hingeClearance: shape.hingeClearance,
        hingePinless: shape.hingePinless,
        hingeAngle: shape.hingeAngle,
        hingeScrewHoles: shape.hingeScrewHoles,
        hingeScrewDiameter: shape.hingeScrewDiameter,
        hingeScrewSpacing: shape.hingeScrewSpacing,
        hingeScrewAcross: shape.hingeScrewAcross,
        hingeScrewCountersink: shape.hingeScrewCountersink,
        hingeCornerRadius: shape.hingeCornerRadius,
        hingeLeafStyle: shape.hingeLeafStyle,
        hingeScrewHead: shape.hingeScrewHead,
        hingeNutWidth: shape.hingeNutWidth,
        sides: shape.sides,
      });
      break;
    case "gridfinity":
      geometry = createGridfinityGeometry({
        width,
        depth,
        height,
        gridfinityType: shape.gridfinityType,
        gridfinityLip: shape.gridfinityLip,
        gridfinityMagnets: shape.gridfinityMagnets,
        gridfinityHalfGrid: shape.gridfinityHalfGrid,
        gridfinityLabelBack: shape.gridfinityLabelBack,
        gridfinityLabelFront: shape.gridfinityLabelFront,
        gridfinityLabelLeft: shape.gridfinityLabelLeft,
        gridfinityLabelRight: shape.gridfinityLabelRight,
        gridfinityLabelBackWidth: shape.gridfinityLabelBackWidth,
        gridfinityLabelBackLength: shape.gridfinityLabelBackLength,
        gridfinityLabelBackOffset: shape.gridfinityLabelBackOffset,
        gridfinityLabelFrontWidth: shape.gridfinityLabelFrontWidth,
        gridfinityLabelFrontLength: shape.gridfinityLabelFrontLength,
        gridfinityLabelFrontOffset: shape.gridfinityLabelFrontOffset,
        gridfinityLabelLeftWidth: shape.gridfinityLabelLeftWidth,
        gridfinityLabelLeftLength: shape.gridfinityLabelLeftLength,
        gridfinityLabelLeftOffset: shape.gridfinityLabelLeftOffset,
        gridfinityLabelRightWidth: shape.gridfinityLabelRightWidth,
        gridfinityLabelRightLength: shape.gridfinityLabelRightLength,
        gridfinityLabelRightOffset: shape.gridfinityLabelRightOffset,
        gridfinityLabelCorner: shape.gridfinityLabelCorner,
        gridfinityLabelCornerSize: shape.gridfinityLabelCornerSize,
        gridfinityScoopBack: shape.gridfinityScoopBack,
        gridfinityScoopFront: shape.gridfinityScoopFront,
        gridfinityScoopLeft: shape.gridfinityScoopLeft,
        gridfinityScoopRight: shape.gridfinityScoopRight,
        gridfinityScoopRadius: shape.gridfinityScoopRadius,
        gridfinityFloorHeight: shape.gridfinityFloorHeight,
        gridfinityOpenBack: shape.gridfinityOpenBack,
        gridfinityOpenFront: shape.gridfinityOpenFront,
        gridfinityOpenLeft: shape.gridfinityOpenLeft,
        gridfinityOpenRight: shape.gridfinityOpenRight,
        gridfinityLipChamfer: shape.gridfinityLipChamfer,
        gridfinityWallThickness: shape.gridfinityWallThickness,
        gridfinityPaddingBack: shape.gridfinityPaddingBack,
        gridfinityPaddingFront: shape.gridfinityPaddingFront,
        gridfinityPaddingLeft: shape.gridfinityPaddingLeft,
        gridfinityPaddingRight: shape.gridfinityPaddingRight,
        gridfinityCornerRadius: shape.gridfinityCornerRadius,
        gridfinityBinCornerRadius: shape.gridfinityBinCornerRadius,
        gridfinityCompartmentsX: shape.gridfinityCompartmentsX,
        gridfinityCompartmentsZ: shape.gridfinityCompartmentsZ,
        gridfinityDividerThickness: shape.gridfinityDividerThickness,
        gridfinityDividerPositionsX: shape.gridfinityDividerPositionsX,
        gridfinityDividerPositionsZ: shape.gridfinityDividerPositionsZ,
        gridfinityCompartmentLabels: shape.gridfinityCompartmentLabels,
        gridfinityOpenings: shape.gridfinityOpenings,
        gridfinityOpeningCorner: shape.gridfinityOpeningCorner,
        gridfinityOpeningCornerSize: shape.gridfinityOpeningCornerSize,
      });
      break;
    case "loft":
      geometry = createLoftGeometry({ ...shape, width, depth, height });
      break;
    case "dovetail":
      geometry = createDovetailGeometry({
        width,
        depth,
        height,
        dovetailNeckWidth: shape.dovetailNeckWidth,
        dovetailClearance: shape.dovetailClearance,
        hole: shape.hole,
      });
      break;
    case "gear":
      geometry = createGearGeometry({
        width,
        depth,
        height,
        teeth: shape.teeth,
        toothSize: shape.toothSize,
        toothWidth: shape.toothWidth,
        centerHoleSize: shape.centerHoleSize,
        gearType: shape.gearType,
        gearRim: shape.gearRim,
        helixAngle: shape.helixAngle,
        helixQuality: shape.helixQuality,
        gearProfile: shape.gearProfile,
        gearPressureAngle: shape.gearPressureAngle,
        gearBacklash: shape.gearBacklash,
      });
      break;
    case "honeycomb":
      geometry = createHoneycombGeometry({
        width,
        depth,
        height,
        honeycombCellSize: shape.honeycombCellSize,
        honeycombWallThickness: shape.honeycombWallThickness,
        honeycombFrameWidth: shape.honeycombFrameWidth,
      });
      break;
    case "bentTube":
      geometry = createBentTubeGeometry({
        width,
        depth,
        height,
        bentTubeProfile: shape.bentTubeProfile,
        bentTubeInnerProfile: shape.bentTubeInnerProfile,
        bentTubeSize: shape.bentTubeSize,
        bentTubeWall: shape.bentTubeWall,
        bentTubeQuality: shape.bentTubeQuality,
        bentTubeSegments: shape.bentTubeSegments,
      });
      break;
    case "roundedBox":
      geometry = createRoundedBoxGeometry({
        width,
        depth,
        height,
        cornerFillet: shape.cornerFillet,
        topBottomFillet: shape.topBottomFillet,
        roundedBoxQuality: shape.roundedBoxQuality,
      });
      break;
    case "thread":
      geometry = createThreadGeometry({
        width,
        depth,
        height,
        threadRole: shape.threadRole,
        threadHead: shape.threadHead,
        threadHand: shape.threadHand,
        threadProfile: shape.threadProfile,
        threadDiameter: shape.threadDiameter,
        threadPitch: shape.threadPitch,
        threadClearance: shape.threadClearance,
        threadBoltClearance: shape.threadBoltClearance,
        threadAxialClearance: shape.threadAxialClearance,
        threadDepth: shape.threadDepth,
        threadFlankAngle: shape.threadFlankAngle,
        threadQuality: shape.threadQuality,
        threadHeadHeight: shape.threadHeadHeight,
        threadChamfer: shape.threadChamfer,
        threadChamferBottom: shape.threadChamferBottom,
        threadHeadChamfer: shape.threadHeadChamfer,
      });
      break;
    case "spring":
      geometry = createSpringGeometry({
        width,
        depth,
        height,
        springTurns: shape.springTurns,
        springWire: shape.springWire,
        springHand: shape.springHand,
        springQuality: shape.springQuality,
      });
      break;
    case "wedge":
      geometry = createBooleanWedgeGeometry(width, height, depth);
      break;
    case "polygon":
      geometry = createPrismGeometry(width, height, depth, shape.sides ?? 6);
      break;
    case "icosahedron":
      geometry = new THREE.IcosahedronGeometry(size / 2, 1);
      geometry.translate(0, height / 2, 0);
      break;
    case "text":
      geometry = createBooleanTextGeometry(shape);
      break;
    case "scribble":
      geometry = new THREE.TorusKnotGeometry(size * 0.22, size * 0.055, 120, 12);
      geometry.translate(0, height / 2, 0);
      break;
    case "sketch":
    default:
      geometry = new THREE.BoxGeometry(size, Math.max(3, height * 0.35), size * 0.72);
      break;
  }

  return geometry ? bufferGeometryToMeshData(sanitizeName(shape.name), geometry) : null;
}

/**
 * How far a mesh reaches along a direction: the largest dot product of its vertices with it,
 * -Infinity for none. A loop, because spreading a big import's vertices into Math.max overflows
 * the call stack (about 100,000 values).
 */
export function meshReachAlong(mesh: Pick<MeshData, "vertices">, direction: { x: number; y: number; z: number }) {
  let reach = -Infinity;
  for (const [x, y, z] of mesh.vertices) {
    const along = x * direction.x + y * direction.y + z * direction.z;
    if (along > reach) reach = along;
  }
  return reach;
}

export function meshForShape(shape: WorkplaneShape): MeshData {
  if (shape.kind === "mesh" && shape.importedMesh) {
    return importedMeshForShape(shape);
  }

  if (shape.groupedShapes?.length) {
    const vertices: Vec3[] = [];
    const faces: [number, number, number][] = [];
    shape.groupedShapes.filter((child) => !child.hidden).forEach((child) => {
      const childMesh = meshForShape(child);
      appendMeshData(vertices, faces, childMesh);
    });
    // Without the stretch, split, export and alignment would see a resized
    // group at the size it had when it was grouped.
    const scaled = scaleGroupedVertices(vertices, groupedContentScale(shape, localGroupBounds(shape.groupedShapes)));
    return transformMesh({ name: sanitizeName(shape.name), vertices: scaled, faces }, shape);
  }

  const cached = cachedUnplacedMesh(shape);
  if (cached) {
    return transformMesh({ name: sanitizeName(shape.name), vertices: cached.vertices, faces: cached.faces.map(([a, b, c]) => [a, b, c]) }, shape);
  }
  const raw =
    geometryMeshForShape(shape) ??
    (shape.kind === "cylinder" || shape.kind === "ellipse" || shape.kind === "tube" || shape.kind === "ring" || shape.kind === "torus"
      ? cylinderMesh(shape, shape.sides ?? 96)
      : shape.kind === "cone"
        ? cylinderMesh(shape, shape.sides ?? 96, shape.baseRadius ? (shape.topRadius ?? 0) / shape.baseRadius : 0)
        : shape.kind === "sphere" || shape.kind === "halfSphere"
          ? sphereMesh(shape)
          : shape.kind === "pyramid"
            ? cylinderMesh(shape, shape.sides ?? 4, 0)
            : boxMesh(shape));
  rememberUnplacedMesh(shape, raw);
  return transformMesh(raw, shape);
}

// Moving or turning a spring built it again from scratch, about 300 ms each time it was aligned,
// exported or split. The mesh before transformMesh does not depend on where the shape stands, so
// the last ones are kept and found by the other fields. Text is left out: it builds a stand-in
// until its font has loaded.
const PLACEMENT_FIELDS = new Set(["id", "name", "color", "x", "z", "elevation", "rotation", "rotationX", "rotationZ"]);
const MAX_UNPLACED_MESHES = 24;
const MAX_UNPLACED_MESH_VERTICES = 1_500_000;
const unplacedMeshCache: Array<{ shape: WorkplaneShape; mesh: MeshData }> = [];

/** Whether two shapes differ only in where they stand and how they are turned, named and coloured. */
export function sameShapeApartFromPlacement(a: WorkplaneShape, b: WorkplaneShape) {
  if (a === b) return true;
  const left = a as unknown as Record<string, unknown>;
  const right = b as unknown as Record<string, unknown>;
  for (const key in left) {
    if (!PLACEMENT_FIELDS.has(key) && left[key] !== right[key]) return false;
  }
  for (const key in right) {
    if (!PLACEMENT_FIELDS.has(key) && !(key in left) && right[key] !== undefined) return false;
  }
  return true;
}

function cachedUnplacedMesh(shape: WorkplaneShape) {
  if (shape.kind === "text") return null;
  const index = unplacedMeshCache.findIndex((entry) => sameShapeApartFromPlacement(entry.shape, shape));
  if (index < 0) return null;
  const [entry] = unplacedMeshCache.splice(index, 1);
  unplacedMeshCache.push(entry);
  return entry.mesh;
}

function rememberUnplacedMesh(shape: WorkplaneShape, mesh: MeshData) {
  if (shape.kind === "text" || mesh.vertices.length > MAX_UNPLACED_MESH_VERTICES) return;
  unplacedMeshCache.push({ shape: { ...shape }, mesh: { name: mesh.name, vertices: mesh.vertices, faces: mesh.faces.map(([a, b, c]) => [a, b, c]) } });
  let vertexCount = unplacedMeshCache.reduce((sum, entry) => sum + entry.mesh.vertices.length, 0);
  while (unplacedMeshCache.length > MAX_UNPLACED_MESHES || vertexCount > MAX_UNPLACED_MESH_VERTICES) {
    vertexCount -= unplacedMeshCache.shift()!.mesh.vertices.length;
  }
}

/** For tests: forget the kept meshes. */
export function clearUnplacedMeshCache() {
  unplacedMeshCache.length = 0;
}

export function appendMeshData(vertices: Vec3[], faces: [number, number, number][], mesh: MeshData) {
  const offset = vertices.length;
  for (let i = 0; i < mesh.vertices.length; i += 1) {
    vertices.push(mesh.vertices[i]);
  }
  for (let i = 0; i < mesh.faces.length; i += 1) {
    const [a, b, c] = mesh.faces[i];
    faces.push([a + offset, b + offset, c + offset]);
  }
}

function importedMeshForShape(shape: WorkplaneShape): MeshData {
  const mesh = shape.importedMesh;
  if (!mesh || mesh.positions.length < 9) {
    return transformMesh(boxMesh(shape), shape);
  }

  const resizedPositions = resizedImportedMeshPositions(shape);
  const vertices: Vec3[] = [];
  for (let i = 0; i < resizedPositions.length; i += 3) {
    vertices.push([resizedPositions[i], resizedPositions[i + 1], resizedPositions[i + 2]]);
  }

  const faces: [number, number, number][] = [];
  for (let i = 0; i + 2 < vertices.length; i += 3) {
    faces.push([i, i + 1, i + 2]);
  }

  return transformMesh({ name: sanitizeName(shape.name), vertices, faces }, shape);
}

/** Tausender trennen, in der gerade eingestellten Sprache. */
export function formatTriangleCount(count: number) {
  return count.toLocaleString(numberLocale());
}

export function shapeAabb(shape: WorkplaneShape): Cuboid {
  const halfWidth = shapeWidth(shape) / 2;
  const halfDepth = shapeDepth(shape) / 2;
  return {
    minX: shape.x - halfWidth,
    maxX: shape.x + halfWidth,
    minY: shape.elevation ?? 0,
    maxY: (shape.elevation ?? 0) + shape.height,
    minZ: shape.z - halfDepth,
    maxZ: shape.z + halfDepth,
  };
}

export function boundsForShapes(shapes: WorkplaneShape[]): Cuboid {
  const bounds = shapes.map(meshAabb);
  return boundsForCuboids(bounds);
}

export function boundsForCuboids(bounds: Cuboid[]): Cuboid {
  return {
    minX: Math.min(...bounds.map((box) => box.minX)),
    maxX: Math.max(...bounds.map((box) => box.maxX)),
    minY: Math.min(...bounds.map((box) => box.minY)),
    maxY: Math.max(...bounds.map((box) => box.maxY)),
    minZ: Math.min(...bounds.map((box) => box.minZ)),
    maxZ: Math.max(...bounds.map((box) => box.maxZ)),
  };
}

/**
 * The box around the real vertices of every shape, also of a wrapped body, which meshAabb measures by its
 * cylinder. A group is shown stretched to its size over the vertices it holds, so it has to be sized by them (#667).
 */
export function boundsForShapesOfVertices(shapes: WorkplaneShape[]): Cuboid {
  return boundsForCuboids(shapes.map((shape) => aabbOfShape(shape, true)));
}

export function meshAabb(shape: WorkplaneShape): Cuboid {
  return aabbOfShape(shape, false);
}

function aabbOfShape(shape: WorkplaneShape, ofVertices: boolean): Cuboid {
  // A wrapped body covers only an arc; its box around the cylinder's axis is what
  // makes "centre on the cylinder" put it on that cylinder's wall (#106).
  if (shape.cylinderWrap && shape.importedMesh && !ofVertices) return shapeAabb(shape);
  const mesh = meshForShape(shape);
  if (mesh.vertices.length === 0) {
    return shapeAabb(shape);
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  mesh.vertices.forEach(([x, y, z]) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    maxZ = Math.max(maxZ, z);
  });

  if (![minX, minY, minZ, maxX, maxY, maxZ].every(Number.isFinite)) {
    return shapeAabb(shape);
  }

  return { minX, maxX, minY, maxY, minZ, maxZ };
}

export function geometryFromMeshData(mesh: MeshData) {
  const positions: number[] = [];
  mesh.faces.forEach(([ai, bi, ci]) => {
    [mesh.vertices[ai], mesh.vertices[bi], mesh.vertices[ci]].forEach(([x, y, z]) => {
      positions.push(x, y, z);
    });
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

export function positionsFromGeometryDrawRange(geometry: THREE.BufferGeometry) {
  const position = geometry.getAttribute("position");
  if (!position) {
    return [];
  }

  const positions: number[] = [];
  const drawStart = Math.max(0, Math.floor(geometry.drawRange.start || 0));
  if (geometry.index) {
    const index = geometry.index;
    const drawCount = Number.isFinite(geometry.drawRange.count) ? Math.max(0, Math.floor(geometry.drawRange.count)) : index.count - drawStart;
    const end = Math.min(index.count, drawStart + drawCount);
    for (let i = drawStart; i + 2 < end; i += 3) {
      for (let offset = 0; offset < 3; offset += 1) {
        const vertexIndex = index.getX(i + offset);
        positions.push(position.getX(vertexIndex), position.getY(vertexIndex), position.getZ(vertexIndex));
      }
    }
    return positions;
  }

  const drawCount = Number.isFinite(geometry.drawRange.count) ? Math.max(0, Math.floor(geometry.drawRange.count)) : position.count - drawStart;
  const end = Math.min(position.count, drawStart + drawCount);
  for (let i = drawStart; i + 2 < end; i += 3) {
    positions.push(
      position.getX(i),
      position.getY(i),
      position.getZ(i),
      position.getX(i + 1),
      position.getY(i + 1),
      position.getZ(i + 1),
      position.getX(i + 2),
      position.getY(i + 2),
      position.getZ(i + 2),
    );
  }
  return positions;
}

export function boundsForPositions(positions: number[]): Cuboid | null {
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

  return [minX, minY, minZ, maxX, maxY, maxZ].every(Number.isFinite) ? { minX, maxX, minY, maxY, minZ, maxZ } : null;
}

export function quantizedPointKey([x, y, z]: Vec3, tolerance: number) {
  return [x, y, z].map((value) => Math.round(value / tolerance)).join(",");
}

function triangleSignature(points: Vec3[], tolerance: number) {
  return points.map((point) => quantizedPointKey(point, tolerance)).sort().join("|");
}

function addSignature(signatures: Map<string, number>, signature: string) {
  signatures.set(signature, (signatures.get(signature) ?? 0) + 1);
}

function meshSignatureMap(mesh: MeshData, tolerance: number) {
  const signatures = new Map<string, number>();
  mesh.faces.forEach(([ai, bi, ci]) => {
    addSignature(signatures, triangleSignature([mesh.vertices[ai], mesh.vertices[bi], mesh.vertices[ci]], tolerance));
  });
  return signatures;
}

function positionsSignatureMap(positions: number[], tolerance: number) {
  const signatures = new Map<string, number>();
  for (let i = 0; i + 8 < positions.length; i += 9) {
    addSignature(
      signatures,
      triangleSignature(
        [
          [positions[i], positions[i + 1], positions[i + 2]],
          [positions[i + 3], positions[i + 4], positions[i + 5]],
          [positions[i + 6], positions[i + 7], positions[i + 8]],
        ],
        tolerance,
      ),
    );
  }
  return signatures;
}

function signatureMapsDiffer(a: Map<string, number>, b: Map<string, number>) {
  if (a.size !== b.size) {
    return true;
  }
  for (const [signature, count] of a) {
    if (b.get(signature) !== count) {
      return true;
    }
  }
  return false;
}

export function positionsDifferFromMeshData(positions: number[], mesh: MeshData, tolerance = 0.0005) {
  if (Math.floor(positions.length / 9) !== mesh.faces.length) {
    return true;
  }
  return signatureMapsDiffer(positionsSignatureMap(positions, tolerance), meshSignatureMap(mesh, tolerance));
}

export function geometryDiffersFromMeshData(geometry: THREE.BufferGeometry, mesh: MeshData, tolerance = 0.0005) {
  return positionsDifferFromMeshData(positionsFromGeometryDrawRange(geometry), mesh, tolerance);
}

function sortedEdgeKey(a: Vec3, b: Vec3, tolerance: number) {
  const ak = quantizedPointKey(a, tolerance);
  const bk = quantizedPointKey(b, tolerance);
  return ak < bk ? `${ak}|${bk}` : `${bk}|${ak}`;
}

function edgeMidpoint(a: Vec3, b: Vec3): Vec3 {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
}

function addBoundaryEdge(edges: Map<string, { count: number; midpoint: Vec3 }>, a: Vec3, b: Vec3, tolerance: number) {
  const key = sortedEdgeKey(a, b, tolerance);
  const existing = edges.get(key);
  if (existing) {
    existing.count += 1;
  } else {
    edges.set(key, { count: 1, midpoint: edgeMidpoint(a, b) });
  }
}

export function positionsBoundaryEdges(positions: number[], tolerance = 0.0005) {
  const edges = new Map<string, { count: number; midpoint: Vec3 }>();
  for (let i = 0; i + 8 < positions.length; i += 9) {
    const a: Vec3 = [positions[i], positions[i + 1], positions[i + 2]];
    const b: Vec3 = [positions[i + 3], positions[i + 4], positions[i + 5]];
    const c: Vec3 = [positions[i + 6], positions[i + 7], positions[i + 8]];
    addBoundaryEdge(edges, a, b, tolerance);
    addBoundaryEdge(edges, b, c, tolerance);
    addBoundaryEdge(edges, c, a, tolerance);
  }
  return Array.from(edges.values()).filter((edge) => edge.count === 1);
}

export function meshDataPositions(mesh: MeshData) {
  const positions: number[] = [];
  mesh.faces.forEach(([ai, bi, ci]) => {
    [mesh.vertices[ai], mesh.vertices[bi], mesh.vertices[ci]].forEach(([x, y, z]) => {
      positions.push(x, y, z);
    });
  });
  return positions;
}

export function midpoint(a: Vec3, b: Vec3): Vec3 {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
}

export function localGroupBounds(children: WorkplaneShape[]): Cuboid {
  return boundsForShapes(children);
}
