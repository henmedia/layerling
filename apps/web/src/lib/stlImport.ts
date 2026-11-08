import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { reportedMeshExtent } from "@/lib/importedMeshBase";
import { createLocalId } from "@/lib/localIds";
import { zUpToLayerling } from "@/lib/meshCoordinates";
import type { WorkplaneShape } from "@/types/layerling";

const stlLoader = new STLLoader();
const SUPPORTED_IMPORT_EXTENSIONS = new Set(["stl", "svg"]);

function fileExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

function stlHeader(buffer: ArrayBuffer) {
  return new TextDecoder("ascii").decode(new Uint8Array(buffer, 0, Math.min(80, buffer.byteLength))).toLowerCase();
}

/**
 * Whether an STL is already in layerling's own Y-up frame: only our own ASCII exports, known by their header. Every
 * other STL is Z-up, as every slicer reads it, and keeps the orientation it was made in. A guess from the proportions
 * (thin in Y means Y-up) laid upright flat parts down: a knife standing on its back, 306 × 30 × 70 mm, came in lying
 * flat (Discussion #1450).
 */
function stlUsesLayerlingYUp(buffer: ArrayBuffer) {
  return stlHeader(buffer).includes("layerling");
}

/** The name an imported body takes after its file. */
export function importedMeshName(fileName: string, sourceFormat: NonNullable<WorkplaneShape["importedMesh"]>["sourceFormat"] = "stl") {
  return fileName.replace(/\.[^.]+$/, "") || `Imported ${sourceFormat.toUpperCase()}`;
}

export function importedShapeFromTriangleSoup(
  fileName: string,
  rawPositions: number[],
  rawNormals: number[] | undefined,
  sourceFormat: NonNullable<WorkplaneShape["importedMesh"]>["sourceFormat"] = "stl",
): WorkplaneShape {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(rawPositions, 3));
  if (rawNormals?.length === rawPositions.length) {
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(rawNormals, 3));
  } else {
    geometry.computeVertexNormals();
  }
  geometry.computeBoundingBox();

  const box = geometry.boundingBox;
  if (!box) {
    throw new Error("STL has no readable geometry");
  }

  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const maxDimension = Math.max(size.x, size.y, size.z);
  if (!Number.isFinite(maxDimension) || maxDimension <= 0) {
    throw new Error("STL geometry is empty");
  }

  const scale = 1;
  const position = geometry.getAttribute("position");
  const normal = geometry.getAttribute("normal");
  const positions: number[] = [];
  const normals: number[] = [];

  for (let i = 0; i < position.count; i += 1) {
    positions.push((position.getX(i) - center.x) * scale, (position.getY(i) - box.min.y) * scale, (position.getZ(i) - center.z) * scale);
    if (normal) {
      normals.push(normal.getX(i), normal.getY(i), normal.getZ(i));
    }
  }

  const width = reportedMeshExtent(size.x * scale);
  const height = reportedMeshExtent(size.y * scale);
  const depth = reportedMeshExtent(size.z * scale);
  const triangleCount = Math.floor(position.count / 3);

  return {
    id: createLocalId("uploaded-mesh"),
    name: importedMeshName(fileName, sourceFormat),
    kind: "mesh",
    color: "#0098c7",
    x: 10,
    z: -10,
    size: Math.max(width, depth),
    width,
    depth,
    height,
    rotation: 0,
    rotationX: 0,
    rotationZ: 0,
    importedMesh: {
      positions,
      normals: normals.length ? normals : undefined,
      baseWidth: width,
      baseDepth: depth,
      baseHeight: height,
      triangleCount,
      sourceFormat,
    },
    locked: false,
    hidden: false,
  };
}

export function importExtensionSupported(fileName: string) {
  return SUPPORTED_IMPORT_EXTENSIONS.has(fileExtension(fileName));
}

/**
 * How an STL is read. `yUp` reads it in layerling's own Y-up frame whatever its header says: a design saved before
 * 1.151.0 had some STLs read that way (see `stlReadBeforeZUp`), and keeps them so when it opens again (Issue #1518).
 */
export type StlReadOptions = { yUp?: boolean };

export function importedShapeFromStl(fileName: string, buffer: ArrayBuffer, options: StlReadOptions = {}): WorkplaneShape {
  const rawGeometry = stlLoader.parse(buffer);
  const geometry = rawGeometry.index ? rawGeometry.toNonIndexed() : rawGeometry.clone();
  const position = geometry.getAttribute("position");
  const rawPositions: number[] = [];
  const usesLayerlingYUp = options.yUp === true || stlUsesLayerlingYUp(buffer);

  for (let i = 0; i < position.count; i += 1) {
    const sourcePosition: [number, number, number] = [position.getX(i), position.getY(i), position.getZ(i)];
    rawPositions.push(...(usesLayerlingYUp ? sourcePosition : zUpToLayerling(sourcePosition)));
  }

  // The file's facet normals are left out: many programs write 0 0 0 or stale ones, and the
  // triangles' own order gives the same direction for a sound file (#988), as Tinkercad and Cura do.
  return importedShapeFromTriangleSoup(fileName, rawPositions, undefined);
}

type StlMeshSize = { baseWidth: number; baseDepth: number; baseHeight: number };
type StlShapeSize = { width?: number; depth?: number; height?: number };

function sameSize(a: number, b: number) {
  return Math.abs(a - b) <= Math.max(0.01, Math.abs(b) * 0.001);
}

/** Whether a part keeps one scale on all three axes (within 1 %) against the given mesh size. */
function evenScale(shape: StlShapeSize, width: number, depth: number, height: number) {
  const scales = [(shape.width ?? 0) / width, (shape.depth ?? 0) / depth, (shape.height ?? 0) / height];
  if (!scales.every((scale) => Number.isFinite(scale) && scale > 0)) return false;
  return Math.max(...scales) / Math.min(...scales) <= 1.01;
}

/**
 * Whether a saved STL part was read Y-up when it was imported, before every STL was read Z-up (1.151.0, Discussion #1450).
 * A design keeps the STL file and reads it again when it opens, so such a part opened turned by 90° and stretched to its
 * old size (Issue #1518). `zUp` is the file read the new way. It only applies where the old rule read the file Y-up (thin
 * in Y, at most 0.55 of its Z), and then either the saved mesh size is the old reading's, or the design was saved once
 * more after opening wrongly: then the saved size is the new reading's, but the part's own size only fits the old one.
 */
export function stlReadBeforeZUp(zUp: StlMeshSize, saved: StlMeshSize, shape: StlShapeSize) {
  // Read Z-up, the file's Y is our depth and its Z our height; read Y-up, the two change places.
  if (!(zUp.baseDepth <= zUp.baseHeight * 0.55)) return false;
  const savedAsOld = sameSize(saved.baseWidth, zUp.baseWidth) && sameSize(saved.baseDepth, zUp.baseHeight) && sameSize(saved.baseHeight, zUp.baseDepth);
  if (savedAsOld) return true;
  return evenScale(shape, zUp.baseWidth, zUp.baseHeight, zUp.baseDepth) && !evenScale(shape, zUp.baseWidth, zUp.baseDepth, zUp.baseHeight);
}
