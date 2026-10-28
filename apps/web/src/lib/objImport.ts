import * as THREE from "three";
import { placeColoredParts } from "@/lib/coloredImport";
import { reportedMeshExtent } from "@/lib/importedMeshBase";
import { createLocalId } from "@/lib/localIds";
import { zUpToLayerling } from "@/lib/meshCoordinates";
import type { WorkplaneShape } from "@/types/layerling";

type ObjFaceVertex = {
  vertexIndex: number;
  normalIndex?: number;
};

function resolveObjIndex(token: string, count: number, label: string) {
  const parsed = Number.parseInt(token, 10);
  if (!Number.isInteger(parsed) || parsed === 0) throw new Error(`OBJ has an invalid ${label} index`);
  const index = parsed > 0 ? parsed - 1 : count + parsed;
  if (index < 0 || index >= count) throw new Error(`OBJ ${label} index is out of range`);
  return index;
}

function faceNormal(points: readonly THREE.Vector3[]) {
  const normal = new THREE.Vector3();
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    normal.x += (current.y - next.y) * (current.z + next.z);
    normal.y += (current.z - next.z) * (current.x + next.x);
    normal.z += (current.x - next.x) * (current.y + next.y);
  }
  return normal;
}

function projectedFace(points: readonly THREE.Vector3[], normal: THREE.Vector3) {
  const absX = Math.abs(normal.x);
  const absY = Math.abs(normal.y);
  const absZ = Math.abs(normal.z);
  if (absX >= absY && absX >= absZ) return points.map((point) => new THREE.Vector2(point.y, point.z));
  if (absY >= absZ) return points.map((point) => new THREE.Vector2(point.x, point.z));
  return points.map((point) => new THREE.Vector2(point.x, point.y));
}

function triangulateFace(points: readonly THREE.Vector3[]) {
  if (points.length === 3) return [[0, 1, 2] as const];

  const polygonNormal = faceNormal(points);
  if (polygonNormal.lengthSq() <= 1e-20) throw new Error("OBJ contains a degenerate polygon face");
  const triangles = THREE.ShapeUtils.triangulateShape(projectedFace(points, polygonNormal), []);
  if (!triangles.length) throw new Error("OBJ contains a polygon face that could not be triangulated");

  return triangles.map(([a, b, c]) => {
    const triangleNormal = new THREE.Vector3()
      .subVectors(points[b], points[a])
      .cross(new THREE.Vector3().subVectors(points[c], points[a]));
    return triangleNormal.dot(polygonNormal) < 0 ? [a, c, b] as const : [a, b, c] as const;
  });
}

function orientTriangleToObjNormals(
  triangle: readonly [number, number, number],
  refs: readonly ObjFaceVertex[],
  vertices: readonly THREE.Vector3[],
  normals: readonly THREE.Vector3[],
): readonly [number, number, number] {
  const [aIndex, bIndex, cIndex] = triangle;
  const aRef = refs[aIndex];
  const bRef = refs[bIndex];
  const cRef = refs[cIndex];
  if (aRef.normalIndex === undefined || bRef.normalIndex === undefined || cRef.normalIndex === undefined) {
    return triangle;
  }

  const a = vertices[aRef.vertexIndex];
  const b = vertices[bRef.vertexIndex];
  const c = vertices[cRef.vertexIndex];
  const geometricNormal = new THREE.Vector3()
    .subVectors(b, a)
    .cross(new THREE.Vector3().subVectors(c, a));
  if (geometricNormal.lengthSq() <= 1e-20) return triangle;

  const objNormal = new THREE.Vector3()
    .add(normals[aRef.normalIndex])
    .add(normals[bRef.normalIndex])
    .add(normals[cRef.normalIndex]);
  if (objNormal.lengthSq() <= 1e-20) return triangle;

  return geometricNormal.dot(objNormal) < 0
    ? [aIndex, cIndex, bIndex] as const
    : triangle;
}

function generatedFaceNormals(positions: readonly number[]) {
  const normals: number[] = [];
  for (let index = 0; index + 8 < positions.length; index += 9) {
    const a = new THREE.Vector3(positions[index], positions[index + 1], positions[index + 2]);
    const b = new THREE.Vector3(positions[index + 3], positions[index + 4], positions[index + 5]);
    const c = new THREE.Vector3(positions[index + 6], positions[index + 7], positions[index + 8]);
    const normal = new THREE.Vector3()
      .subVectors(b, a)
      .cross(new THREE.Vector3().subVectors(c, a));
    if (normal.lengthSq() > 1e-20) normal.normalize();
    for (let vertex = 0; vertex < 3; vertex += 1) normals.push(normal.x, normal.y, normal.z);
  }
  return normals;
}

function objShapeName(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "") || "Imported OBJ";
}

function importedObjShapeFromTriangles(
  fileName: string,
  rawPositions: number[],
  rawNormals: number[] | undefined,
): WorkplaneShape {
  if (rawPositions.length < 9 || rawPositions.length % 9 !== 0) {
    throw new Error("OBJ has no readable mesh geometry");
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  for (let index = 0; index < rawPositions.length; index += 3) {
    const x = rawPositions[index];
    const y = rawPositions[index + 1];
    const z = rawPositions[index + 2];
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    maxZ = Math.max(maxZ, z);
  }

  const sizeX = maxX - minX;
  const sizeY = maxY - minY;
  const sizeZ = maxZ - minZ;
  const maxDimension = Math.max(sizeX, sizeY, sizeZ);
  if (!Number.isFinite(maxDimension) || maxDimension <= 0) throw new Error("OBJ geometry is empty");

  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const positions: number[] = [];
  for (let index = 0; index < rawPositions.length; index += 3) {
    positions.push(
      rawPositions[index] - centerX,
      rawPositions[index + 1] - minY,
      rawPositions[index + 2] - centerZ,
    );
  }

  const normals = rawNormals?.length === rawPositions.length
    ? [...rawNormals]
    : generatedFaceNormals(rawPositions);
  const width = reportedMeshExtent(sizeX);
  const height = reportedMeshExtent(sizeY);
  const depth = reportedMeshExtent(sizeZ);

  return {
    id: createLocalId("uploaded-mesh"),
    name: objShapeName(fileName),
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
      normals,
      baseWidth: width,
      baseDepth: depth,
      baseHeight: height,
      triangleCount: rawPositions.length / 9,
      sourceFormat: "obj",
    },
    locked: false,
    hidden: false,
  };
}

/** Ein Teil der Datei: alle Dreiecke einer Farbe oder eines Materials. */
type ObjPart = {
  key: string;
  color?: string;
  material?: string;
  positions: number[];
  normals: number[];
  completeNormals: boolean;
};

function colorChannel(value: number, scale: number) {
  return Math.round(Math.min(1, Math.max(0, value / scale)) * 255).toString(16).padStart(2, "0");
}

function hexColor(r: number, g: number, b: number) {
  // 0..1 ist die Regel; manche Programme schreiben 0..255.
  const scale = r > 1 || g > 1 || b > 1 ? 255 : 1;
  return `#${colorChannel(r, scale)}${colorChannel(g, scale)}${colorChannel(b, scale)}`;
}

/** Die Grundfarben (Kd) einer .mtl, je Materialname. */
export function parseMtlColors(source: string): Map<string, string> {
  const colors = new Map<string, string>();
  let current: string | null = null;
  source.split(/\r?\n/).forEach((sourceLine) => {
    const line = sourceLine.split("#", 1)[0].trim();
    if (!line) return;
    const [keyword, ...rest] = line.split(/\s+/);
    if (keyword === "newmtl") {
      current = rest.join(" ");
      return;
    }
    if (keyword === "Kd" && current !== null) {
      const values = rest.slice(0, 3).map(Number);
      if (values.length === 3 && values.every(Number.isFinite)) colors.set(current, hexColor(values[0], values[1], values[2]));
    }
  });
  return colors;
}

/**
 * Manche Programme nennen ihre Materialien nach der Farbe: "color_16089887" ist die
 * Zahl 0xF58D1F. Das hilft, wenn die .mtl nicht mitgekommen ist.
 */
function colorFromMaterialName(name: string) {
  const match = /^color_(\d{1,8})$/i.exec(name);
  if (!match) return undefined;
  const value = Number(match[1]);
  return value >= 0 && value <= 0xffffff ? `#${value.toString(16).padStart(6, "0")}` : undefined;
}

/**
 * Mehr verschiedene Eckpunktfarben als das sind keine Farbteile mehr, sondern
 * ein Farbverlauf (Scans, KI-Modelle): eine Datei mit 125 000 Farben wuerde
 * 125 000 Koerper, und der Editor bricht zusammen (#351). Sie kommt dann als
 * ein Koerper, ohne die Eckpunktfarben.
 */
export const MAX_OBJ_VERTEX_COLOR_PARTS = 64;

class ObjVertexColorOverflow extends Error {}

/**
 * Liest die Dreiecke einer OBJ und ordnet sie nach Farbe: Eckpunktfarben
 * (`v x y z r g b`, so schreibt layerling selbst) gehen vor, sonst das
 * Material aus `usemtl`. Ohne beides bleibt alles ein Teil.
 */
function parseObjParts(source: string, materialColors: ReadonlyMap<string, string>, legacyAxes = false, ignoreVertexColors = false) {
  // Nur sehr alte Exporte waren Z-oben und sagen das im Kopf. Seit 1.0.0
  // schreibt layerling Y-oben wie jedes OBJ-Programm; die erkannte Kopfzeile
  // allein drehte die eigene Datei beim Wiedereinlesen auf die Seite.
  // `legacyAxes` haelt diese alte Lesart fuer Projekte, die ihr Netz aus der
  // mitgespeicherten Datei neu bauen - sonst kippte dort ein Koerper um.
  const layerlingZUpExport = isLayerlingObj(source) && (legacyAxes || /^#.*\bZ-up\b/m.test(source));
  // Tinkercad writes its OBJ with Z up and says so in the first line (#599). A project that stored
  // such a file never rebuilds it from the file (see `importedShapesFromObj`), so `legacyAxes`
  // leaves it alone.
  const zUp = layerlingZUpExport || (!legacyAxes && isTinkercadObj(source));
  const vertices: THREE.Vector3[] = [];
  const vertexColors: Array<string | undefined> = [];
  const normals: THREE.Vector3[] = [];
  const parts = new Map<string, ObjPart>();
  let material: string | undefined;
  let faceCount = 0;
  let vertexColorParts = 0;

  source.split(/\r?\n/).forEach((sourceLine) => {
    const line = sourceLine.split("#", 1)[0].trim();
    if (!line) return;
    const fields = line.split(/\s+/);
    const keyword = fields[0];

    if (keyword === "v") {
      if (fields.length < 4) throw new Error("OBJ contains an invalid vertex");
      const values = fields.slice(1, 4).map(Number);
      if (values.some((value) => !Number.isFinite(value))) throw new Error("OBJ contains a non-finite vertex");
      vertices.push(new THREE.Vector3(values[0], values[1], values[2]));
      const rgb = fields.length >= 7 && !ignoreVertexColors ? fields.slice(4, 7).map(Number) : null;
      vertexColors.push(rgb && rgb.every(Number.isFinite) ? hexColor(rgb[0], rgb[1], rgb[2]) : undefined);
      return;
    }

    if (keyword === "vn") {
      if (fields.length < 4) throw new Error("OBJ contains an invalid normal");
      const values = fields.slice(1, 4).map(Number);
      if (values.some((value) => !Number.isFinite(value))) throw new Error("OBJ contains a non-finite normal");
      normals.push(new THREE.Vector3(values[0], values[1], values[2]).normalize());
      return;
    }

    if (keyword === "usemtl") {
      material = fields.slice(1).join(" ") || undefined;
      return;
    }

    if (keyword !== "f") return;
    if (fields.length < 4) throw new Error("OBJ contains a face with fewer than three vertices");

    const refs: ObjFaceVertex[] = fields.slice(1).map((token) => {
      const indices = token.split("/");
      const vertexIndex = resolveObjIndex(indices[0], vertices.length, "vertex");
      const normalIndex = indices.length >= 3 && indices[2]
        ? resolveObjIndex(indices[2], normals.length, "normal")
        : undefined;
      return { vertexIndex, normalIndex };
    });
    if (refs.length > 3 && refs[0].vertexIndex === refs[refs.length - 1].vertexIndex) refs.pop();
    if (refs.length < 3) throw new Error("OBJ contains a degenerate face");

    const vertexColor = vertexColors[refs[0].vertexIndex];
    const key = vertexColor ? `rgb:${vertexColor}` : material !== undefined ? `mtl:${material}` : "";
    let part = parts.get(key);
    if (!part) {
      if (vertexColor && (vertexColorParts += 1) > MAX_OBJ_VERTEX_COLOR_PARTS) throw new ObjVertexColorOverflow();
      part = {
        key,
        color: vertexColor ?? (material !== undefined ? materialColors.get(material) ?? colorFromMaterialName(material) : undefined),
        material: vertexColor ? undefined : material,
        positions: [],
        normals: [],
        completeNormals: true,
      };
      parts.set(key, part);
    }
    const target = part;

    const points = refs.map((ref) => vertices[ref.vertexIndex]);
    triangulateFace(points).forEach((triangle) => {
      const orientedTriangle = orientTriangleToObjNormals(triangle, refs, vertices, normals);
      orientedTriangle.forEach((faceIndex) => {
        const ref = refs[faceIndex];
        const point = vertices[ref.vertexIndex];
        const position: [number, number, number] = [point.x, point.y, point.z];
        target.positions.push(...(zUp ? zUpToLayerling(position) : position));
        if (ref.normalIndex === undefined) {
          target.completeNormals = false;
        } else {
          const normal = normals[ref.normalIndex];
          const sourceNormal: [number, number, number] = [normal.x, normal.y, normal.z];
          target.normals.push(...(zUp ? zUpToLayerling(sourceNormal) : sourceNormal));
        }
      });
      faceCount += 1;
    });
  });

  if (!vertices.length || !faceCount) {
    throw new Error("OBJ has no readable mesh geometry");
  }
  return [...parts.values()].filter((part) => part.positions.length >= 9);
}

/** Wie `parseObjParts`, aber mit der Grenze fuer Eckpunktfarben: darueber ohne sie noch einmal lesen. */
function parseObjPartsLimited(source: string, materialColors: ReadonlyMap<string, string>, legacyAxes = false) {
  try {
    return { parts: parseObjParts(source, materialColors, legacyAxes), droppedVertexColors: false };
  } catch (error) {
    if (!(error instanceof ObjVertexColorOverflow)) throw error;
    return { parts: parseObjParts(source, materialColors, legacyAxes, true), droppedVertexColors: true };
  }
}

function partNormals(part: ObjPart) {
  return part.completeNormals && part.normals.length === part.positions.length ? part.normals : undefined;
}

/**
 * Die ganze Datei als ein Koerper, wie bisher. Darueber baut eine .lyl einen
 * einteiligen OBJ-Import aus der mitgespeicherten Datei wieder auf.
 */
function isLayerlingObj(source: string) {
  return /^# Layerling OBJ export\b/m.test(source);
}

function isTinkercadObj(source: string) {
  return /^# Object Export From Tinkercad\b/m.test(source);
}

export function importedShapeFromObj(fileName: string, source: string, legacyAxes = false): WorkplaneShape {
  return wholeShapeFromObjParts(fileName, parseObjPartsLimited(source, new Map(), legacyAxes).parts);
}

function wholeShapeFromObjParts(fileName: string, parts: readonly ObjPart[]): WorkplaneShape {
  const positions = parts.flatMap((part) => part.positions);
  const complete = parts.every((part) => partNormals(part));
  return importedObjShapeFromTriangles(fileName, positions, complete ? parts.flatMap((part) => part.normals) : undefined);
}

export type ObjImportResult = {
  shapes: WorkplaneShape[];
  /** Mehr als ein Teil: dann tragen die Koerper ihr Netz selbst ("json"), nicht die Datei. */
  split: boolean;
  /** Materialien ohne bekannte Farbe - die .mtl fehlte vermutlich. */
  missingMaterialColors: boolean;
  /** Zu viele Eckpunktfarben (ein Farbverlauf): die Datei kam ohne sie als ein Koerper (#351). */
  droppedVertexColors: boolean;
};

/**
 * Eine OBJ mit Farben wird zu einem Koerper je Farbe, alle an ihrer Stelle
 * zueinander. Einfarbig bleibt es ein Koerper wie bisher, nur in seiner
 * Farbe (Discussion #79).
 */
export function importedShapesFromObj(fileName: string, source: string, mtlSources: readonly string[] = []): ObjImportResult {
  const materialColors = new Map<string, string>();
  mtlSources.forEach((mtl) => parseMtlColors(mtl).forEach((color, name) => materialColors.set(name, color)));
  const { parts, droppedVertexColors } = parseObjPartsLimited(source, materialColors);
  const missingMaterialColors = parts.some((part) => part.material !== undefined && !part.color);

  if (parts.length <= 1) {
    const whole = wholeShapeFromObjParts(fileName, parts);
    const color = parts[0]?.color;
    // Eine eigene OBJ traegt ihr Netz selbst: die .lyl baut OBJ-Quellen in der
    // alten Achsen-Lesart nach (siehe `legacyAxes`).
    const own = isLayerlingObj(source) || isTinkercadObj(source) ? { ...whole, importedMesh: { ...whole.importedMesh!, sourceFormat: "json" as const } } : whole;
    return { shapes: [color ? { ...own, color } : own], split: false, missingMaterialColors, droppedVertexColors };
  }

  // The parts are named after the file as one body would be; that body itself is not built.
  const shapes = placeColoredParts(
    objShapeName(fileName),
    parts.map((part) => ({
      color: part.color,
      label: part.material && !colorFromMaterialName(part.material) ? part.material : undefined,
      positions: part.positions,
      normals: partNormals(part),
    })),
    (positions, normals) => importedObjShapeFromTriangles(fileName, positions, normals),
  );
  return { shapes, split: true, missingMaterialColors, droppedVertexColors };
}
