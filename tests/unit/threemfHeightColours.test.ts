// @vitest-environment jsdom
import path from "node:path";
import { pathToFileURL } from "node:url";
import { strToU8, zipSync } from "fflate";
import { beforeAll, describe, expect, it } from "vitest";
import { splitShapeIntoHeightBands } from "@/lib/editorBooleans";
import { setManifoldAssetBase } from "@/lib/editorMeshCore";
import { importModelFiles } from "@/lib/modelImport";
import { importedShapesFrom3mf } from "@/lib/threemfImport";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * Colour changes by height (Discussion #2108): a slicer project with one object on one filament, and a list of heights
 * where the printer switches filament. They come in with the bodies they apply to, and, asked for, cut the bodies there
 * into a band per colour.
 */

const CORE = "http://schemas.microsoft.com/3dmanufacturing/core/2015/02";
const WHITE = "#ffffff";
const BLACK = "#000000";
const RED = "#ff0000";
const SKIN = "#ffb08a";

beforeAll(() => {
  setManifoldAssetBase(pathToFileURL(path.resolve("node_modules/manifold-3d") + path.sep).href);
});

/** A closed box from (x, 0, 0), `w` × `d` × `h` mm, as a 3MF object. */
function boxObject(id: number, w: number, d: number, h: number, x = 0) {
  const corners = [0, 1].flatMap((k) => [0, 1].flatMap((j) => [0, 1].map((i) => [x + i * w, j * d, k * h])));
  const v = (i: number, j: number, k: number) => k * 4 + j * 2 + i;
  const quads = [
    [v(0, 0, 0), v(0, 1, 0), v(1, 1, 0), v(1, 0, 0)],
    [v(0, 0, 1), v(1, 0, 1), v(1, 1, 1), v(0, 1, 1)],
    [v(0, 0, 0), v(1, 0, 0), v(1, 0, 1), v(0, 0, 1)],
    [v(0, 1, 0), v(0, 1, 1), v(1, 1, 1), v(1, 1, 0)],
    [v(0, 0, 0), v(0, 0, 1), v(0, 1, 1), v(0, 1, 0)],
    [v(1, 0, 0), v(1, 1, 0), v(1, 1, 1), v(1, 0, 1)],
  ];
  const vertices = corners.map(([a, b, c]) => `<vertex x="${a}" y="${b}" z="${c}"/>`).join("");
  const triangles = quads.flatMap(([a, b, c, dd]) => [`<triangle v1="${a}" v2="${b}" v3="${c}"/>`, `<triangle v1="${a}" v2="${c}" v3="${dd}"/>`]).join("");
  return `<object id="${id}" type="model"><mesh><vertices>${vertices}</vertices><triangles>${triangles}</triangles></mesh></object>`;
}

const bambuSettings = (objects: number[], plates?: number[][]) => `<?xml version="1.0" encoding="UTF-8"?><config>${objects
  .map((id) => `<object id="${id}"><metadata key="name" value="Box ${id}"/><metadata key="extruder" value="1"/></object>`).join("")}${(plates ?? [])
  .map((ids, index) => `<plate><metadata key="plater_id" value="${index + 1}"/>${ids.map((id) => `<model_instance><metadata key="object_id" value="${id}"/></model_instance>`).join("")}</plate>`).join("")}</config>`;

const bambuChanges = (plates: Array<{ id: number; layers: string }>) => `<?xml version="1.0" encoding="utf-8"?><custom_gcodes_per_layer>${plates
  .map((plate) => `<plate><plate_info id="${plate.id}"/>${plate.layers}<mode value="MultiAsSingle"/></plate>`).join("")}</custom_gcodes_per_layer>`;

const CHANGES = `<layer top_z="2" type="2" extruder="2" color="#000000" extra="" gcode="tool_change"/>
<layer top_z="4" type="2" extruder="3" color="#FF0000" extra="" gcode="tool_change"/>
<layer top_z="6" type="2" extruder="4" color="#FFB08A" extra="" gcode="tool_change"/>`;

function package3mf(objects: string, items: number[], extra: Record<string, string>) {
  const model = `<?xml version="1.0" encoding="UTF-8"?><model unit="millimeter" xmlns="${CORE}"><resources>${objects}</resources><build>${items
    .map((id) => `<item objectid="${id}"/>`).join("")}</build></model>`;
  const files: Record<string, Uint8Array> = { "3D/3dmodel.model": strToU8(model) };
  Object.entries(extra).forEach(([name, text]) => { files[name] = strToU8(text); });
  const zipped = zipSync(files);
  return zipped.buffer.slice(zipped.byteOffset, zipped.byteOffset + zipped.byteLength) as ArrayBuffer;
}

const FILAMENTS = JSON.stringify({ filament_colour: ["#FFFFFF", "#000000", "#FF0000", "#FFB08A"] });

/** The test file of Discussion #2108: a 30 × 30 × 8 mm block, white, changing to black, red and skin at 2, 4 and 6 mm. */
const block = () => package3mf(boxObject(1, 30, 30, 8), [1], {
  "Metadata/model_settings.config": bambuSettings([1]),
  "Metadata/project_settings.config": FILAMENTS,
  "Metadata/custom_gcode_per_layer.xml": bambuChanges([{ id: 1, layers: CHANGES }]),
});

function shapeBounds(shape: WorkplaneShape) {
  return { bottom: shape.elevation ?? 0, top: (shape.elevation ?? 0) + shape.height };
}

describe("reading colour changes by height", () => {
  it("reads Bambu Studio's changes with the colours they change to", () => {
    const result = importedShapesFrom3mf("block.3mf", block());
    expect(result.shapes).toHaveLength(1);
    expect(result.shapes[0].color).toBe(WHITE);
    expect(result.heightChanges.get(0)).toEqual({ changes: [{ height: 2, color: BLACK }, { height: 4, color: RED }, { height: 6, color: SKIN }] });
  });

  it("gives a plate's changes only to that plate's objects", () => {
    const buffer = package3mf(boxObject(1, 30, 30, 8) + boxObject(2, 10, 10, 8, 50), [1, 2], {
      "Metadata/model_settings.config": bambuSettings([1, 2], [[1], [2]]),
      "Metadata/project_settings.config": FILAMENTS,
      "Metadata/custom_gcode_per_layer.xml": bambuChanges([{ id: 1, layers: CHANGES }]),
    });
    const result = importedShapesFrom3mf("plates.3mf", buffer);
    expect(result.shapes).toHaveLength(2);
    expect(result.heightChanges.get(0)?.changes).toHaveLength(3);
    expect(result.heightChanges.has(1)).toBe(false);
  });

  it("reads PrusaSlicer's changes, a colour change taking its colour from the filament when it names none", () => {
    const buffer = package3mf(boxObject(1, 30, 30, 8), [1], {
      "Metadata/Slic3r_PE.config": "; filament_colour = #FFFFFF;#00FF00\n",
      "Metadata/Prusa_Slicer_custom_gcode_per_print_z.xml": `<?xml version="1.0" encoding="utf-8"?><custom_gcodes_per_print_z>
<code print_z="3" type="0" extruder="1" color="#0000FF" extra="" gcode="M600"/>
<code print_z="5" type="1" extruder="1" color="" extra="Pause" gcode="M601"/>
<code print_z="6" type="2" extruder="2" color="" extra="" gcode="tool_change"/>
<mode value="SingleExtruder"/></custom_gcodes_per_print_z>`,
    });
    const result = importedShapesFrom3mf("prusa.3mf", buffer);
    // The pause at 5 mm is no change of colour.
    expect(result.heightChanges.get(0)?.changes).toEqual([{ height: 3, color: "#0000ff" }, { height: 6, color: "#00ff00" }]);
  });

  it("leaves out a change to the colour it already has and one above the body, and has none without the list", () => {
    const buffer = package3mf(boxObject(1, 30, 30, 8), [1], {
      "Metadata/model_settings.config": bambuSettings([1]),
      "Metadata/project_settings.config": FILAMENTS,
      "Metadata/custom_gcode_per_layer.xml": bambuChanges([{ id: 1, layers: `<layer top_z="2" type="2" extruder="1" color="#FFFFFF" gcode="tool_change"/>
<layer top_z="4" type="0" extruder="1" color="#FF0000" gcode="M600"/><layer top_z="12" type="2" extruder="2" color="#000000" gcode="tool_change"/>` }]),
    });
    expect(importedShapesFrom3mf("same.3mf", buffer).heightChanges.get(0)).toEqual({ changes: [{ height: 4, color: RED }] });
    const plain = package3mf(boxObject(1, 30, 30, 8), [1], { "Metadata/model_settings.config": bambuSettings([1]), "Metadata/project_settings.config": FILAMENTS });
    expect(importedShapesFrom3mf("plain.3mf", plain).heightChanges.size).toBe(0);
  });
});

describe("cutting at the colour changes", () => {
  it("cuts the block into four bands of 2 mm, each in its colour, the whole block together", async () => {
    const result = importedShapesFrom3mf("block.3mf", block());
    const bands = await splitShapeIntoHeightBands(result.shapes[0], result.heightChanges.get(0)!);
    expect(bands).not.toBeNull();
    expect(bands!.map((band) => band.color)).toEqual([WHITE, BLACK, RED, SKIN]);
    const bottom = shapeBounds(result.shapes[0]).bottom;
    bands!.forEach((band, index) => {
      expect(shapeBounds(band).bottom).toBeCloseTo(bottom + index * 2, 4);
      expect(band.height).toBeCloseTo(2, 4);
      expect(band.width).toBeCloseTo(30, 4);
      expect(band.depth).toBeCloseTo(30, 4);
      expect(band.x).toBeCloseTo(result.shapes[0].x, 4);
      expect(band.z).toBeCloseTo(result.shapes[0].z, 4);
      expect(band.importedMesh?.sourceFormat).toBe("json");
    });
  });

  it("asks on import: yes brings the bands, no the block as before, and a file without changes does not ask", async () => {
    const file = () => new File([block()], "block.3mf");
    const asked: string[] = [];
    const yes = await importModelFiles([file()], { askHeightColours: async (question) => { asked.push(question.fileName); expect(question).toEqual({ fileName: "block.3mf", heights: [2, 4, 6], colors: [WHITE, BLACK, RED, SKIN] }); return true; } });
    expect(yes!.shapes.map((shape) => shape.color)).toEqual([WHITE, BLACK, RED, SKIN]);
    expect(yes!.assets).toHaveLength(0);
    const no = await importModelFiles([file()], { askHeightColours: async () => false });
    const before = await importModelFiles([file()]);
    expect(no!.shapes).toHaveLength(1);
    expect(no!.shapes[0].color).toBe(WHITE);
    expect({ ...no!.shapes[0], id: "" }).toEqual({ ...before!.shapes[0], id: "" });
    const plain = package3mf(boxObject(1, 30, 30, 8), [1], { "Metadata/model_settings.config": bambuSettings([1]), "Metadata/project_settings.config": FILAMENTS });
    await importModelFiles([new File([plain], "plain.3mf")], { askHeightColours: async (question) => { asked.push(question.fileName); return true; } });
    expect(asked).toEqual(["block.3mf"]);
  });
});
