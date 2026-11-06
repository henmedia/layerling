import { strToU8, zip, zipSync } from "fflate";
import { layerlingToZUp, type MeshPoint } from "@/lib/meshCoordinates";
import { weldMeshVertices } from "@/lib/objExport";

// ---------------------------------------------------------------------------
// 3MF export - the counterpart of threemfImport.ts.
//
// Spec: https://github.com/3MFConsortium/spec_core/blob/master/3MF%20Core%20Specification.md
//
// The package holds the three parts a 3MF consumer requires: the content
// types, the root relationship and 3D/3dmodel.model. Every body becomes an
// object of its own with its name and colour, and a build item that places it
// where it stands in the scene. Coordinates are millimetres, Z-up, exactly as
// the STL export writes them.
// ---------------------------------------------------------------------------

export type ThreeMfExportMesh = {
  name: string;
  /** "#rrggbb"; anything else falls back to the default body colour. */
  color?: string;
  /** A colour per face, for a body whose parts keep their own colours (#153); wins over `color`. */
  faceColors?: readonly string[];
  vertices: readonly MeshPoint[];
  faces: readonly (readonly [number, number, number])[];
};

export const THREE_MF_MEDIA_TYPE = "model/3mf";
const MODEL_PATH = "3D/3dmodel.model";
const CORE_NAMESPACE = "http://schemas.microsoft.com/3dmanufacturing/core/2015/02";
const MATERIAL_NAMESPACE = "http://schemas.microsoft.com/3dmanufacturing/material/2015/02";
const MODEL_RELATIONSHIP = "http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel";
const DEFAULT_COLOR = "#D97813";

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>
</Types>
`;

const ROOT_RELATIONSHIPS = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Target="/${MODEL_PATH}" Id="rel0" Type="${MODEL_RELATIONSHIP}"/>
</Relationships>
`;

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    // Control characters are not allowed in XML 1.0 at all.
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
}

function displayColor(color: string | undefined) {
  return color && /^#[0-9a-f]{6}$/i.test(color) ? color.toUpperCase() : DEFAULT_COLOR;
}

/**
 * How OrcaSlicer writes a whole triangle painted with a filament (1 to 32): its state, with two bits before it that say
 * the triangle is not split, in hexadecimal, the last digit first (TriangleSelector::serialize, CONST_FILAMENTS in
 * Model.cpp). Past 32 it paints nothing.
 */
function paintColor(filament: number) {
  const hex = (value: number) => value.toString(16).toUpperCase();
  if (filament <= 2) return hex(filament * 4);
  if (filament <= 17) return `${hex(filament - 3)}C`;
  return filament <= 32 ? `${hex(filament - 18)}FC` : "";
}

/** Micrometre precision keeps the file small without moving anything a printer could see. */
function coordinate(value: number) {
  const rounded = Math.round(value * 1e6) / 1e6;
  return Object.is(rounded, -0) ? "0" : String(rounded);
}

/**
 * The colours are written twice, on purpose. The core `basematerials` group,
 * which each object points at, is what most programs read. Bambu Studio and
 * OrcaSlicer do not read it from files they did not write themselves; they
 * read the Materials extension's `m:colorgroup`, but only when the triangles
 * point at it, and then offer to map the colours onto filaments. So every
 * triangle names the colour group too. A program that knows neither simply
 * sees the geometry.
 *
 * OrcaSlicer and the slicers built on it do not read a colour per triangle,
 * though (#1308), so when a body has several colours, every triangle in the
 * file is also painted with its colour's filament in their own `paint_color`,
 * which PrusaSlicer 2.9 reads too, up to 15 colours, and from which Bambu
 * Studio 2.9 takes the filaments instead of asking. The filaments follow the
 * colour group's order, up to 32; past that a face is left unpainted and prints
 * with filament 1. A file without such a body stays as it was.
 */
export function exportMeshesTo3mf(meshes: readonly ThreeMfExportMesh[], metadata: { title?: string } = {}): Uint8Array {
  return zipSync(threeMfPackageFiles(meshes, metadata), THREE_MF_ZIP_OPTIONS);
}

/**
 * The same file, packed by fflate's workers: for a 300,000-triangle export packing took 1.3 s of
 * the page's main thread. Where those workers cannot start, it is packed here as before.
 */
export async function exportMeshesTo3mfAsync(meshes: readonly ThreeMfExportMesh[], metadata: { title?: string } = {}): Promise<Uint8Array> {
  const files = threeMfPackageFiles(meshes, metadata);
  try {
    return await new Promise<Uint8Array>((resolve, reject) => {
      zip(files, THREE_MF_ZIP_OPTIONS, (error, data) => (error ? reject(error) : resolve(data)));
    });
  } catch {
    return zipSync(files, THREE_MF_ZIP_OPTIONS);
  }
}

const THREE_MF_ZIP_OPTIONS = { level: 6 } as const;

function threeMfPackageFiles(meshes: readonly ThreeMfExportMesh[], metadata: { title?: string }) {
  const colors = [...new Set(meshes.flatMap((mesh) => [displayColor(mesh.color), ...(mesh.faceColors ?? []).map(displayColor)]))];
  const objects: string[] = [];
  const items: string[] = [];
  const colorGroupId = meshes.length + 2; // after the material group (1) and the objects (2...)
  const painted = meshes.some(({ faceColors = [] }) => faceColors.some((color) => color !== faceColors[0] && displayColor(color) !== displayColor(faceColors[0])));
  const paints = painted ? colors.map((_, index) => paintColor(index + 1)) : [];

  meshes.forEach((mesh, index) => {
    const welded = weldMeshVertices(mesh);
    if (welded.faces.length === 0) return;
    const id = index + 2; // 1 is the material group
    const vertices = welded.vertices
      .map((vertex) => {
        const [x, y, z] = layerlingToZUp(vertex);
        return `<vertex x="${coordinate(x)}" y="${coordinate(y)}" z="${coordinate(z)}"/>`;
      })
      .join("");
    const colorIndex = colors.indexOf(displayColor(mesh.color));
    const triangles = welded.faces
      .map(([a, b, c], index) => {
        const faceColor = mesh.faceColors?.[welded.kept[index]];
        const triangleColor = faceColor ? colors.indexOf(displayColor(faceColor)) : colorIndex;
        const paint = paints[triangleColor];
        return `<triangle v1="${a}" v2="${b}" v3="${c}" pid="${colorGroupId}" p1="${triangleColor}"${paint ? ` paint_color="${paint}"` : ""}/>`;
      })
      .join("");
    const name = escapeXml(mesh.name || `Body ${index + 1}`);
    objects.push(
      `  <object id="${id}" type="model" name="${name}" pid="1" pindex="${colorIndex}">` +
        `<mesh><vertices>${vertices}</vertices><triangles>${triangles}</triangles></mesh></object>`,
    );
    items.push(`  <item objectid="${id}"/>`);
  });

  if (objects.length === 0) {
    throw new Error("3MF export needs at least one body with triangles");
  }

  const materials = colors
    .map((color, index) => `<base name="${escapeXml(`Color ${index + 1}`)}" displaycolor="${color}"/>`)
    .join("");
  const colorGroup = colors.map((color) => `<m:color color="${color}FF"/>`).join("");
  const title = metadata.title?.trim() ? `  <metadata name="Title">${escapeXml(metadata.title.trim())}</metadata>\n` : "";
  const model = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="${CORE_NAMESPACE}" xmlns:m="${MATERIAL_NAMESPACE}">
${title}  <metadata name="Application">layerling</metadata>
 <resources>
  <basematerials id="1">${materials}</basematerials>
  <m:colorgroup id="${colorGroupId}">${colorGroup}</m:colorgroup>
${objects.join("\n")}
 </resources>
 <build>
${items.join("\n")}
 </build>
</model>
`;

  return {
    "[Content_Types].xml": strToU8(CONTENT_TYPES),
    "_rels/.rels": strToU8(ROOT_RELATIONSHIPS),
    [MODEL_PATH]: strToU8(model),
  };
}
