// @vitest-environment jsdom
import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { exportMeshesTo3mf } from "@/lib/threemfExport";
import { importedShapesFrom3mf } from "@/lib/threemfImport";

const CORE = "http://schemas.microsoft.com/3dmanufacturing/core/2015/02";
const PRODUCTION = "http://schemas.microsoft.com/3dmanufacturing/production/2015/06";

/** Ein Wuerfel der Kante `size` ab dem Ursprung, als 3MF-Netz (12 Dreiecke). */
function cubeMesh(size: number, offsetX = 0) {
  const vertices: string[] = [];
  for (const x of [0, size]) for (const y of [0, size]) for (const z of [0, size]) vertices.push(`<vertex x="${x + offsetX}" y="${y}" z="${z}"/>`);
  const v = (i: number, j: number, k: number) => i * 4 + j * 2 + k;
  const quads = [
    [v(0, 0, 0), v(0, 1, 0), v(1, 1, 0), v(1, 0, 0)],
    [v(0, 0, 1), v(1, 0, 1), v(1, 1, 1), v(0, 1, 1)],
    [v(0, 0, 0), v(1, 0, 0), v(1, 0, 1), v(0, 0, 1)],
    [v(0, 1, 0), v(0, 1, 1), v(1, 1, 1), v(1, 1, 0)],
    [v(0, 0, 0), v(0, 0, 1), v(0, 1, 1), v(0, 1, 0)],
    [v(1, 0, 0), v(1, 1, 0), v(1, 1, 1), v(1, 0, 1)],
  ];
  const triangles = quads.flatMap(([a, b, c, d]) => [`<triangle v1="${a}" v2="${b}" v3="${c}"/>`, `<triangle v1="${a}" v2="${c}" v3="${d}"/>`]);
  return { vertices: vertices.join(""), triangles: triangles.join("") };
}

function meshXml(...cubes: Array<ReturnType<typeof cubeMesh>>) {
  // Mehrere Wuerfel in einem Netz: die Indizes der spaeteren verschieben sich.
  let vertices = "";
  let triangles = "";
  cubes.forEach((cube, index) => {
    vertices += cube.vertices;
    triangles += cube.triangles.replace(/v(\d)="(\d+)"/g, (_, n, i) => `v${n}="${Number(i) + index * 8}"`);
  });
  return `<mesh><vertices>${vertices}</vertices><triangles>${triangles}</triangles></mesh>`;
}

function model(body: string) {
  return `<?xml version="1.0" encoding="UTF-8"?><model unit="millimeter" xmlns="${CORE}" xmlns:p="${PRODUCTION}">${body}</model>`;
}

function package3mf(files: Record<string, string>) {
  const bytes = zipSync(Object.fromEntries(Object.entries(files).map(([name, text]) => [name, strToU8(text)])));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

/** So schreibt Bambu Studio ein Projekt: Teile in eigenen Modelldateien, Modifier als type="other". */
const BAMBU_TWO_OBJECTS = package3mf({
  "3D/3dmodel.model": model(`
    <resources>
      <object id="3" type="model"><components>
        <component p:path="/3D/Objects/object_1.model" objectid="1"/>
        <component p:path="/3D/Objects/object_1.model" objectid="2" transform="1 0 0 0 1 0 0 0 1 100 0 0"/>
      </components></object>
      <object id="6" type="model"><components>
        <component p:path="/3D/Objects/object_2.model" objectid="4"/>
      </components></object>
    </resources>
    <build>
      <item objectid="3"/>
      <item objectid="6" transform="1 0 0 0 1 0 0 0 1 50 0 0"/>
    </build>`),
  "3D/Objects/object_1.model": model(`<resources>
    <object id="1" type="model">${meshXml(cubeMesh(10))}</object>
    <object id="2" type="other">${meshXml(cubeMesh(10))}</object>
  </resources><build/>`),
  "3D/Objects/object_2.model": model(`<resources><object id="4" type="model">${meshXml(cubeMesh(20))}</object></resources><build/>`),
  "Metadata/model_settings.config": `<?xml version="1.0" encoding="UTF-8"?><config>
    <object id="3"><metadata key="name" value="small.step"/><metadata key="extruder" value="1"/>
      <part id="1" subtype="normal_part"/><part id="2" subtype="modifier_part"><metadata key="extruder" value="0"/></part></object>
    <object id="6"><metadata key="name" value="large.step"/><metadata key="extruder" value="1"/>
      <part id="4" subtype="normal_part"/></object>
  </config>`,
  "Metadata/project_settings.config": JSON.stringify({ filament_colour: ["#E8DBB7"] }),
});

describe("importedShapesFrom3mf", () => {
  it("brings each object of the build in as its own body, even in one colour", () => {
    const result = importedShapesFrom3mf("trays.3mf", BAMBU_TWO_OBJECTS);
    expect(result.split).toBe(true);
    expect(result.objects).toBe(2);
    const [small, large] = result.shapes;
    expect(small.name).toBe("trays small");
    expect(large.name).toBe("trays large");
    expect(small.color).toBe("#e8dbb7");
    expect(large.color).toBe("#e8dbb7");
    expect(small.width).toBeCloseTo(10);
    expect(large.width).toBeCloseTo(20);
    // Beide an ihrem Platz zueinander: Mitte 5 gegen Mitte 50 + 10.
    expect(large.x - small.x).toBeCloseTo(55);
  });

  it("leaves out modifier parts, which do not print", () => {
    const [small] = importedShapesFrom3mf("trays.3mf", BAMBU_TWO_OBJECTS).shapes;
    expect(small.importedMesh?.triangleCount).toBe(12);
    expect(small.width).toBeCloseTo(10);
  });

  it("keeps a single object with a modifier as one body", () => {
    const buffer = package3mf({
      "3D/3dmodel.model": model(`<resources>
        <object id="1" type="model">${meshXml(cubeMesh(10))}</object>
        <object id="2" type="other">${meshXml(cubeMesh(10))}</object>
        <object id="3" type="model"><components>
          <component objectid="1"/>
          <component objectid="2" transform="1 0 0 0 1 0 0 0 1 100 0 0"/>
        </components></object>
      </resources><build><item objectid="3"/></build>`),
    });
    const result = importedShapesFrom3mf("part.3mf", buffer);
    expect(result.split).toBe(false);
    expect(result.shapes).toHaveLength(1);
    expect(result.shapes[0].importedMesh?.triangleCount).toBe(12);
    expect(result.shapes[0].width).toBeCloseTo(10);
  });

  it("leaves out a PrusaSlicer modifier volume inside the object's mesh", () => {
    const buffer = package3mf({
      "3D/3dmodel.model": model(`<resources>
        <object id="1" type="model">${meshXml(cubeMesh(10), cubeMesh(10, 100))}</object>
      </resources><build><item objectid="1"/></build>`),
      "Metadata/Slic3r_PE_model.config": `<?xml version="1.0" encoding="UTF-8"?><config><object id="1">
        <volume firstid="0" lastid="11"><metadata type="volume" key="volume_type" value="ModelPart"/></volume>
        <volume firstid="12" lastid="23"><metadata type="volume" key="modifier" value="1"/><metadata type="volume" key="volume_type" value="ParameterModifier"/></volume>
      </object></config>`,
    });
    const result = importedShapesFrom3mf("part.3mf", buffer);
    expect(result.shapes).toHaveLength(1);
    expect(result.shapes[0].importedMesh?.triangleCount).toBe(12);
    expect(result.shapes[0].width).toBeCloseTo(10);
  });

  it("numbers the filaments of one object when the build has several", () => {
    const buffer = package3mf({
      "3D/3dmodel.model": model(`<resources>
        <object id="1" type="model">${meshXml(cubeMesh(10))}</object>
        <object id="2" type="model">${meshXml(cubeMesh(10, 10))}</object>
        <object id="3" type="model"><components><component objectid="1"/><component objectid="2"/></components></object>
        <object id="4" type="model">${meshXml(cubeMesh(10))}</object>
      </resources><build><item objectid="3"/><item objectid="4" transform="1 0 0 0 1 0 0 0 1 50 0 0"/></build>`),
      "Metadata/model_settings.config": `<?xml version="1.0" encoding="UTF-8"?><config>
        <object id="3"><metadata key="name" value="base"/><metadata key="extruder" value="1"/>
          <part id="1"/><part id="2"><metadata key="extruder" value="2"/></part></object>
        <object id="4"><metadata key="name" value="lid"/><metadata key="extruder" value="1"/></object>
      </config>`,
      "Metadata/project_settings.config": JSON.stringify({ filament_colour: ["#E8DBB7", "#7D6556"] }),
    });
    const result = importedShapesFrom3mf("box.3mf", buffer);
    expect(result.shapes.map((shape) => [shape.name, shape.color])).toEqual([
      ["box base 1", "#e8dbb7"],
      ["box base 2", "#7d6556"],
      ["box lid", "#e8dbb7"],
    ]);
  });

  it("still splits one object by colour", () => {
    const buffer = package3mf({
      "3D/3dmodel.model": model(`<resources>
        <basematerials id="9"><base name="Red" displaycolor="#FF0000"/><base name="Blue" displaycolor="#0000FF"/></basematerials>
        <object id="1" type="model" pid="9" pindex="0">${meshXml(cubeMesh(10))}</object>
        <object id="2" type="model" pid="9" pindex="1">${meshXml(cubeMesh(10, 10))}</object>
        <object id="3" type="model"><components><component objectid="1"/><component objectid="2"/></components></object>
      </resources><build><item objectid="3"/></build>`),
    });
    const result = importedShapesFrom3mf("two.3mf", buffer);
    expect(result.split).toBe(true);
    expect(result.objects).toBe(1);
    expect(result.shapes.map((shape) => [shape.name, shape.color])).toEqual([["two Red", "#ff0000"], ["two Blue", "#0000ff"]]);
  });

  it("does not call its own painted export painted in the slicer, but a painting without a colour of the triangle's own", () => {
    const vertices: Array<[number, number, number]> = [[0, 0, 0], [10, 0, 0], [0, 10, 0], [0, 0, 10]];
    const faces: Array<[number, number, number]> = [[0, 2, 1], [0, 1, 3], [0, 3, 2], [1, 2, 3]];
    const exported = exportMeshesTo3mf([{ name: "Bin", color: "#4f7fa8", vertices, faces, faceColors: ["#f2c200", "#4f7fa8", "#4f7fa8", "#4f7fa8"] }]);
    const own = importedShapesFrom3mf("bin.3mf", exported.buffer.slice(exported.byteOffset, exported.byteOffset + exported.byteLength) as ArrayBuffer);
    expect(own.painted).toBe(0);
    expect(own.shapes.map((shape) => shape.color).sort()).toEqual(["#4f7fa8", "#f2c200"]);
    const painted = (attributes: string) => importedShapesFrom3mf("painted.3mf", package3mf({
      "3D/3dmodel.model": model(`<resources>
        <basematerials id="9"><base name="Red" displaycolor="#FF0000"/></basematerials>
        <object id="1" type="model" pid="9" pindex="0">${meshXml(cubeMesh(10)).replace('<triangle v1="0"', `<triangle ${attributes} v1="0"`)}</object>
      </resources><build><item objectid="1"/></build>`),
    })).painted;
    expect(painted('paint_color="8"')).toBe(1);
    // A colour group the file does not have gives the triangle no colour of its own.
    expect(painted('pid="77" p1="0" paint_color="8"')).toBe(1);
  });
});
