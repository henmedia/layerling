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

function stlUsesLayerlingYUp(buffer: ArrayBuffer, position: THREE.BufferAttribute | THREE.InterleavedBufferAttribute) {
  // Our own ASCII STL exports are already Y-up. Preserve those, including tall
  // models where geometry alone cannot reveal an up axis.
  const header = stlHeader(buffer);
  if (header.includes("layerling")) return true;

  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < position.count; i += 1) {
    minY = Math.min(minY, position.getY(i));
    maxY = Math.max(maxY, position.getY(i));
    minZ = Math.min(minZ, position.getZ(i));
    maxZ = Math.max(maxZ, position.getZ(i));
  }

  const ySpan = maxY - minY;
  const zSpan = maxZ - minZ;
  // Some legacy/model-library STLs (including the Raspberry Pi fixture) are
  // unmistakably flat on Y. Keep that established orientation; ambiguous STL
  // files follow the slicer-standard Z-up convention.
  return Number.isFinite(ySpan) && Number.isFinite(zSpan) && ySpan <= zSpan * 0.55;
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

export function importedShapeFromStl(fileName: string, buffer: ArrayBuffer): WorkplaneShape {
  const rawGeometry = stlLoader.parse(buffer);
  const geometry = rawGeometry.index ? rawGeometry.toNonIndexed() : rawGeometry.clone();
  const position = geometry.getAttribute("position");
  const rawPositions: number[] = [];
  const usesLayerlingYUp = stlUsesLayerlingYUp(buffer, position);

  for (let i = 0; i < position.count; i += 1) {
    const sourcePosition: [number, number, number] = [position.getX(i), position.getY(i), position.getZ(i)];
    rawPositions.push(...(usesLayerlingYUp ? sourcePosition : zUpToLayerling(sourcePosition)));
  }

  // The file's facet normals are left out: many programs write 0 0 0 or stale ones, and the
  // triangles' own order gives the same direction for a sound file (#988), as Tinkercad and Cura do.
  return importedShapeFromTriangleSoup(fileName, rawPositions, undefined);
}
