import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { exportMeshesTo3mf, type ThreeMfExportMesh } from "@/lib/threemfExport";

// A unit cube in Layerling's Y-up coordinates, standing on the workplane,
// written as 12 triangles with 36 unshared corners - the way meshForShape
// hands meshes over.
function cube(name: string, color: string | undefined, offsetX = 0): ThreeMfExportMesh {
  const corners: [number, number, number][] = [
    [0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0],
    [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1],
  ].map(([x, y, z]) => [x + offsetX, y, z]);
  const quads = [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [2, 3, 7, 6], [1, 2, 6, 5], [0, 4, 7, 3]];
  const vertices: [number, number, number][] = [];
  const faces: [number, number, number][] = [];
  for (const [a, b, c, d] of quads) {
    for (const triangle of [[a, b, c], [a, c, d]]) {
      faces.push([vertices.length, vertices.length + 1, vertices.length + 2]);
      triangle.forEach((corner) => vertices.push(corners[corner]));
    }
  }
  return { name, color, vertices, faces };
}

function readPackage(bytes: Uint8Array) {
  const files = unzipSync(bytes);
  return {
    names: Object.keys(files).sort(),
    contentTypes: strFromU8(files["[Content_Types].xml"]),
    rels: strFromU8(files["_rels/.rels"]),
    model: strFromU8(files["3D/3dmodel.model"]),
  };
}

function vertexCoordinates(objectXml: string) {
  return [...objectXml.matchAll(/<vertex x="([^"]+)" y="([^"]+)" z="([^"]+)"\/>/g)].map((match) => match.slice(1, 4).map(Number));
}

describe("exportMeshesTo3mf", () => {
  it("writes the three parts a 3MF consumer requires", () => {
    const { names, contentTypes, rels, model } = readPackage(exportMeshesTo3mf([cube("Box", "#d97813")]));

    expect(names).toEqual(["3D/3dmodel.model", "[Content_Types].xml", "_rels/.rels"]);
    expect(contentTypes).toContain('Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"');
    expect(rels).toContain('Target="/3D/3dmodel.model"');
    expect(rels).toContain('Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"');
    expect(model).toContain('<model unit="millimeter"');
    expect(model).toContain('xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"');
  });

  it("welds shared corners and keeps every triangle", () => {
    const { model } = readPackage(exportMeshesTo3mf([cube("Box", undefined)]));

    expect(vertexCoordinates(model)).toHaveLength(8);
    expect([...model.matchAll(/<triangle /g)]).toHaveLength(12);
  });

  it("writes Z-up coordinates like the STL export", () => {
    const { model } = readPackage(exportMeshesTo3mf([cube("Box", undefined)]));
    const points = vertexCoordinates(model);

    // Layerling's height (y 0..1) becomes z, its depth (z 0..1) becomes -y.
    expect(Math.min(...points.map((point) => point[2]))).toBe(0);
    expect(Math.max(...points.map((point) => point[2]))).toBe(1);
    expect(Math.min(...points.map((point) => point[1]))).toBe(-1);
    expect(Math.max(...points.map((point) => point[1]))).toBe(0);
  });

  it("keeps every body as its own named, coloured object with a build item", () => {
    const { model } = readPackage(exportMeshesTo3mf([
      cube("Base <plate> & lid", "#d97813"),
      cube("Peg", "#1e88e5", 3),
      cube("Second base", "#D97813", 6),
    ]));

    expect(model).toContain('<base name="Color 1" displaycolor="#D97813"/><base name="Color 2" displaycolor="#1E88E5"/></basematerials>');
    expect(model).toContain('name="Base &lt;plate&gt; &amp; lid" pid="1" pindex="0"');
    expect(model).toContain('name="Peg" pid="1" pindex="1"');
    expect(model).toContain('name="Second base" pid="1" pindex="0"');
    expect([...model.matchAll(/<item objectid="(\d+)"\/>/g)].map((match) => match[1])).toEqual(["2", "3", "4"]);
  });

  it("also writes the colours as a Materials-extension colour group that every triangle names, the way Bambu Studio and OrcaSlicer read them", () => {
    const { model } = readPackage(exportMeshesTo3mf([
      cube("Base", "#d97813"),
      cube("Peg", "#1e88e5", 3),
    ]));

    expect(model).toContain('xmlns:m="http://schemas.microsoft.com/3dmanufacturing/material/2015/02"');
    // Two objects (ids 2 and 3) and the material group (1) come first, so the group is 4.
    expect(model).toContain('<m:colorgroup id="4"><m:color color="#D97813FF"/><m:color color="#1E88E5FF"/></m:colorgroup>');
    const triangleColours = [...model.matchAll(/<triangle v1="\d+" v2="\d+" v3="\d+" pid="(\d+)" p1="(\d+)"\/>/g)];
    expect(triangleColours).toHaveLength(24); // 12 triangles per cube
    expect(new Set(triangleColours.map((match) => match[1]))).toEqual(new Set(["4"]));
    expect(triangleColours.slice(0, 12).every((match) => match[2] === "0")).toBe(true);
    expect(triangleColours.slice(12).every((match) => match[2] === "1")).toBe(true);
    // The core material group stays for the programs that read that one.
    expect(model).toContain('name="Peg" pid="1" pindex="1"');
  });

  it("falls back to the default colour for anything that is not #rrggbb", () => {
    const { model } = readPackage(exportMeshesTo3mf([cube("Box", "orange")]));
    expect(model).toContain('displaycolor="#D97813"');
  });

  it("adds the design name as title metadata", () => {
    const { model } = readPackage(exportMeshesTo3mf([cube("Box", undefined)], { title: "Gear & case" }));
    expect(model).toContain('<metadata name="Title">Gear &amp; case</metadata>');
  });

  it("refuses to write a package without any triangles", () => {
    expect(() => exportMeshesTo3mf([{ name: "Empty", vertices: [], faces: [] }])).toThrow(/at least one body/);
  });
});

describe("exportMeshesTo3mf with a colour per face (#153)", () => {
  it("gives every triangle the colour of its part", () => {
    const mesh = cube("Multicolor group", "#00ff00");
    const faceColors = mesh.faces.map((_, index) => (index < 6 ? "#ff0000" : "#0000ff"));
    const { model } = readPackage(exportMeshesTo3mf([{ ...mesh, faceColors }]));
    const colors = [...model.matchAll(/<m:color color="([^"]+)"/g)].map((match) => match[1]);
    const used = [...model.matchAll(/<triangle [^>]*p1="(\d+)"/g)].map((match) => colors[Number(match[1])]);
    expect(used.filter((color) => color === "#FF0000FF")).toHaveLength(6);
    expect(used.filter((color) => color === "#0000FFFF")).toHaveLength(6);
  });
});

/** Each triangle's painting for OrcaSlicer and the slicers built on it, in the order the triangles are written; null where there is none. */
function paintings(model: string) {
  return [...model.matchAll(/<triangle [^>]*?\/>/g)].map((match) => /paint_color="([^"]*)"/.exec(match[0])?.[1] ?? null);
}

/** A cube whose first `count` triangles have another colour, as a group cut into one body shows its parts (#153). */
function twoColours(mesh: ThreeMfExportMesh, other: string, count = 4): ThreeMfExportMesh {
  return { ...mesh, faceColors: mesh.faces.map((_, index) => (index < count ? other : mesh.color!)) };
}

describe("exportMeshesTo3mf painting a body of several colours for OrcaSlicer (Discussion #1308)", () => {
  it("paints a body of two colours with each colour's filament, numbered in the order of the colour group", () => {
    const { model } = readPackage(exportMeshesTo3mf([twoColours(cube("Bin", "#4f7fa8"), "#f2c200")]));
    // Filament 1 is "4" and 2 is "8", as OrcaSlicer writes a whole triangle of that state.
    expect(paintings(model)).toEqual([...Array(4).fill("8"), ...Array(8).fill("4")]);
  });

  it("then paints every triangle of every body, the bodies of one colour too", () => {
    const { model } = readPackage(exportMeshesTo3mf([twoColours(cube("Bin", "#4f7fa8"), "#f2c200"), cube("Box", "#ff0000", 3)]));
    // Filament 3 is "0C".
    expect(paintings(model)).toEqual([...Array(4).fill("8"), ...Array(8).fill("4"), ...Array(12).fill("0C")]);
  });

  it("gives a colour the same filament in every body", () => {
    const { model } = readPackage(exportMeshesTo3mf([twoColours(cube("A", "#4f7fa8"), "#f2c200", 2), twoColours(cube("B", "#ff0000", 3), "#f2c200", 2)]));
    const painted = paintings(model);
    // Blue 1, yellow 2, red 3.
    expect(painted.slice(0, 2)).toEqual(["8", "8"]);
    expect(painted.slice(12, 14)).toEqual(["8", "8"]);
    expect(new Set(painted.slice(14))).toEqual(new Set(["0C"]));
  });

  it("numbers the filaments past 2, past 17 and up to 32 as OrcaSlicer does, and leaves those beyond unpainted", () => {
    const colours = Array.from({ length: 33 }, (_, index) => `#0000${index.toString(16).padStart(2, "0")}`);
    // The first body has the second colour on its last six faces, which keeps the colours in their order.
    const meshes = colours.map((color, index) => cube(`Box ${index}`, color, index * 2));
    meshes[0] = { ...meshes[0], faceColors: meshes[0].faces.map((_, index) => colours[index < 6 ? 0 : 1]) };
    const painted = paintings(readPackage(exportMeshesTo3mf(meshes)).model);
    const first = (filament: number) => painted[(filament - 1) * 12];
    expect([1, 2, 3, 4, 16, 17, 18, 19, 32].map(first)).toEqual(["4", "8", "0C", "1C", "DC", "EC", "0FC", "1FC", "EFC"]);
    expect(first(33)).toBeNull();
  });

  it("paints nothing when every body has one colour, also in several colours, and writes the triangles as before", () => {
    // The last body has one colour written in capitals on some of its faces.
    for (const meshes of [[cube("A", "#4f7fa8"), cube("B", "#4f7fa8", 3)], [cube("A", "#4f7fa8"), cube("B", "#ff0000", 3)], [twoColours(cube("A", "#4f7fa8"), "#4f7fa8")], [twoColours(cube("A", "#4f7fa8"), "#4F7FA8")]]) {
      const { model } = readPackage(exportMeshesTo3mf(meshes));
      expect(model).not.toContain("paint_color");
      const triangles = model.match(/<triangle [^>]*\/>/g)!;
      expect(triangles.every((triangle) => /^<triangle v1="\d+" v2="\d+" v3="\d+" pid="\d+" p1="\d+"\/>$/.test(triangle)), triangles[0]).toBe(true);
    }
  });
});
