import { beforeAll, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { acceleratedRaycast, computeBoundsTree } from "three-mesh-bvh";
import { strFromU8, unzipSync } from "fflate";
import manifoldModule, { type ManifoldToplevel } from "manifold-3d";
import { buildPartColoredMeshGeometry, createShapeObject, groupChildAppearance, shapeGeometrySignature, shapeMaterialSignature, syncShapeObjectAppearance, tapeShapeTopologyKey } from "@/components/workplane/viewportShapeObjects";
import { buildGroupDisplayMesh, buildGroupedShapeFromSelection, exportBodiesWithLooseHoles, exportFaceColors, expandBundles, multicolorExportSolids } from "@/lib/editorBooleans";
import { editorHistoryEntry } from "@/lib/editorHistory";
import { mcpShapeSummary } from "@/lib/editorMcpSummary";
import { meshForShape, sameShapeApartFromPlacement, type MeshData } from "@/lib/editorMeshCore";
import { GRIDFINITY_LABEL_TEXT_HEIGHT, GRIDFINITY_LABEL_TEXT_SINK } from "@/lib/gridfinityGeometry";
import { gridfinityLabelLetters } from "@/lib/gridfinityLabelText";
import { gridfinityLabelColor, gridfinityLetterGroups, gridfinityLetterMeshes } from "@/lib/gridfinityLetterColor";
import { exportLylProject, importLylProject } from "@/lib/lylProject";
import { rememberManifoldRuntime } from "@/lib/manifoldHandle";
import { mcpGridfinityPatch } from "@/lib/mcpShapeSettings";
import { exportMeshesToObj } from "@/lib/objExport";
import { makeShapeFromAsset, sceneShape, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { shapeDefaultsFromShape } from "@/lib/shapeDefaults";
import { loadTextFonts } from "@/lib/textFonts";
import { exportMeshesTo3mf } from "@/lib/threemfExport";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE, normalizeShapeCustomizations } from "@/lib/workplaneSettings";
import { canonicalizeShape, workplaneShapesEqual } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * Letters in a colour of their own on a Gridfinity bin's label shelves (Discussion #1308): the view draws them in it, and
 * a 3MF or OBJ gives their faces that colour on the bin's one body. What counts as the letters is checked against areas
 * worked out without the classification: the letters' footprint (their outlines joined by Manifold) plus what they add
 * to the bin's surface, which is their sides. Every face of the shelf round them and inside an A or a B keeps the bin's
 * colour, or the bin's area would come out short by it.
 */

type V = [number, number, number];

let runtime: ManifoldToplevel;

// A loose hole is cut with the kernel the export loads from the page; here it is the one of the tests.
const kernel = vi.hoisted(() => ({ runtime: null as Promise<unknown> | null }));
vi.mock("@/lib/editorMeshCore", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/editorMeshCore")>()),
  getManifoldRuntime: () => kernel.runtime,
}));

beforeAll(async () => {
  await loadTextFonts();
  runtime = await manifoldModule();
  runtime.setup();
  rememberManifoldRuntime(runtime);
  kernel.runtime = Promise.resolve(runtime);
});

const BIN = "#4f7fa8";
const LETTERS = "#f2c200";

function binShape(fields: Record<string, unknown> = {}) {
  return canonicalizeShape({ id: "g", name: "bin", kind: "gridfinity", x: 0, z: 0, elevation: 0, size: 83.5, width: 83.5, depth: 41.5, height: 25.4, rotation: 0, color: BIN, gridfinityType: "bin", gridfinityLabelBack: true, gridfinityLabelBackText: "AB", gridfinityLabelColor: LETTERS, ...fields } as WorkplaneShape);
}

function box(id: string, color: string, x: number, fields: Record<string, unknown> = {}) {
  return { id, name: id, kind: "box", color, x, z: 0, elevation: 0, size: 20, width: 20, depth: 20, height: 10, rotation: 0, ...fields } as unknown as WorkplaneShape;
}

const triangleArea = ([a, b, c]: V[]) => new THREE.Triangle(new THREE.Vector3(...a), new THREE.Vector3(...b), new THREE.Vector3(...c)).getArea();
const meshArea = (mesh: MeshData) => mesh.faces.reduce((sum, face) => sum + triangleArea(face.map((i) => mesh.vertices[i]) as V[]), 0);

/** The letters' footprint on their shelves: every glyph's outline less its holes, joined, so letters that run into one another count once. */
function footprint(shape: WorkplaneShape) {
  const sections = gridfinityLabelLetters({ ...shape, width: shape.width!, depth: shape.depth! }).flatMap((label) => label.glyphs.map((rings) => new runtime.CrossSection(rings, "EvenOdd")));
  const joined = runtime.CrossSection.union(sections);
  const area = joined.area();
  [...sections, joined].forEach((section) => section.delete());
  return area;
}

/** What the letters are by area: their tops (the footprint) and their sides (what they add to the bin's surface). */
function expectedAreas(shape: WorkplaneShape) {
  const plain = meshArea(meshForShape({ ...shape, gridfinityLabelBackText: undefined, gridfinityLabelFrontText: undefined, gridfinityLabelLeftText: undefined, gridfinityLabelRightText: undefined, gridfinityCompartmentLabels: shape.gridfinityCompartmentLabels?.map(({ text: _text, ...label }) => label) }));
  const lettered = meshArea(meshForShape(shape));
  const top = footprint(shape);
  return { letters: top + lettered - plain, bin: plain - top };
}

/** The area of each colour a body's faces are given. */
function areasByColor(mesh: MeshData, colors: readonly string[]) {
  const areas: Record<string, number> = {};
  mesh.faces.forEach((face, index) => {
    areas[colors[index]] = (areas[colors[index]] ?? 0) + triangleArea(face.map((i) => mesh.vertices[i]) as V[]);
  });
  return areas;
}

/** The colours a 3MF or OBJ export gives a shape's faces, as both export paths in the editor work them out. */
function exportColors(shape: WorkplaneShape, mesh = meshForShape(shape)) {
  const solids = multicolorExportSolids(shape);
  if (!solids) return null;
  const colors = exportFaceColors(mesh, solids, shape.color);
  solids.forEach(({ probe }) => probe.geometry.dispose());
  return { mesh, colors };
}

function expectLetterAreas(shape: WorkplaneShape, mesh?: MeshData, expected: { letters: number; bin?: number } = expectedAreas(shape)) {
  const exported = exportColors(shape, mesh);
  expect(exported).not.toBeNull();
  const areas = areasByColor(exported!.mesh, exported!.colors);
  expect(Object.keys(areas).sort()).toEqual([BIN, LETTERS].sort());
  // To 0.05 mm2, well above the float error of summing the mesh's areas; colouring the shelf beside the letters from the
  // nearest box, the mistake the bin's solid guards against, fails it.
  expect(areas[LETTERS]).toBeCloseTo(expected.letters, 1);
  if (expected.bin !== undefined) expect(areas[BIN]).toBeCloseTo(expected.bin, 1);
}

describe("the colour of a Gridfinity bin's letters", () => {
  it("is the one set, as #rrggbb, on a bin with a text", () => {
    expect(gridfinityLabelColor(binShape())).toBe(LETTERS);
    expect(gridfinityLabelColor(binShape({ gridfinityLabelColor: "#F2C200" }))).toBe(LETTERS);
  });

  it("is none when it is unset, not a colour, or the bin's own colour", () => {
    expect(gridfinityLabelColor(binShape({ gridfinityLabelColor: undefined }))).toBeUndefined();
    expect(gridfinityLabelColor(binShape({ gridfinityLabelColor: "yellow" }))).toBeUndefined();
    expect(gridfinityLabelColor(binShape({ gridfinityLabelColor: "#4F7FA8" }))).toBeUndefined();
    expect(gridfinityLabelColor(binShape({ color: "#4F7FA8", gridfinityLabelColor: BIN }))).toBeUndefined();
  });

  it("is none on a bin without a text, on a tray, on a baseplate and on a hole", () => {
    expect(gridfinityLabelColor(binShape({ gridfinityLabelBackText: undefined }))).toBeUndefined();
    expect(gridfinityLabelColor(binShape({ gridfinityLabelBackText: "  " }))).toBeUndefined();
    expect(gridfinityLabelColor(binShape({ gridfinityType: "tray", height: 20 }))).toBeUndefined();
    expect(gridfinityLabelColor(binShape({ gridfinityType: "baseplate", height: 5 }))).toBeUndefined();
    expect(gridfinityLabelColor(binShape({ hole: true }))).toBeUndefined();
    expect(gridfinityLabelColor({ ...box("b", BIN, 0), gridfinityLabelBackText: "AB", gridfinityLabelColor: LETTERS })).toBeUndefined();
  });
});

describe("the letters of a Gridfinity bin as solids", () => {
  it("makes each glyph a closed prism from 0.05 mm inside the shelf to the letters' top, its outline less its holes", () => {
    const shape = binShape();
    const meshes = gridfinityLetterMeshes(shape);
    const letters = gridfinityLabelLetters({ ...shape, width: shape.width!, depth: shape.depth! });
    expect(meshes).toHaveLength(letters.reduce((sum, label) => sum + label.glyphs.length, 0));
    const tall = GRIDFINITY_LABEL_TEXT_HEIGHT + GRIDFINITY_LABEL_TEXT_SINK;
    let volume = 0;
    meshes.forEach((mesh) => {
      // Every edge shared by two faces, once each way: closed and turned out.
      const edges = new Map<string, number>();
      mesh.faces.forEach(([a, b, c]) => [[a, b], [b, c], [c, a]].forEach(([p, q]) => edges.set(`${p}>${q}`, (edges.get(`${p}>${q}`) ?? 0) + 1)));
      edges.forEach((count, key) => {
        const [p, q] = key.split(">");
        expect(count).toBe(1);
        expect(edges.get(`${q}>${p}`)).toBe(1);
      });
      const ys = mesh.vertices.map(([, y]) => y);
      expect(Math.min(...ys)).toBeCloseTo(letters[0].top - GRIDFINITY_LABEL_TEXT_SINK, 9);
      expect(Math.max(...ys)).toBeCloseTo(letters[0].top + GRIDFINITY_LABEL_TEXT_HEIGHT, 9);
      volume += mesh.faces.reduce((sum, [a, b, c]) => sum + new THREE.Vector3(...mesh.vertices[a]).dot(new THREE.Vector3(...mesh.vertices[b]).cross(new THREE.Vector3(...mesh.vertices[c]))) / 6, 0);
    });
    // The prisms and the footprint are built from the same rings, so only rounding lies between them.
    expect(volume).toBeCloseTo(footprint(shape) * tall, 3);
  });

  it("has none without the fonts' letters, as on a bin without a text", () => {
    expect(gridfinityLetterMeshes(binShape({ gridfinityLabelBackText: undefined }))).toEqual([]);
  });
});

describe("a Gridfinity bin's letters in their own colour in a 3MF or OBJ", () => {
  it("gives the letters' tops and sides their colour and every other face the bin's, inside an A and a B too", () => {
    expectLetterAreas(binShape());
  });

  it.each([
    ["mirrored across x", { mirrorX: true }],
    ["mirrored across z", { mirrorZ: true }],
    ["upside down", { mirrorY: true }],
    ["turned and moved", { rotation: 30, x: 40, z: -25, elevation: 3 }],
    ["on all four shelves", { gridfinityLabelFront: true, gridfinityLabelLeft: true, gridfinityLabelRight: true, gridfinityLabelFrontText: "F", gridfinityLabelLeftText: "Left", gridfinityLabelRightText: "R" }],
    ["in Script, whose letters run into one another", { gridfinityLabelBackText: "office", gridfinityLabelFont: "Script" }],
    ["on a compartment's label", { gridfinityLabelBack: false, gridfinityLabelBackText: undefined, gridfinityCompartmentsX: 2, gridfinityCompartmentLabels: [{ column: 1, row: 0, side: "back", text: "Nuts" }] }],
  ])("finds the letters %s", (_name, fields) => {
    expectLetterAreas(binShape(fields));
  });

  it("colours the faces the same with the box round the bin as with the bin's own mesh", () => {
    const shape = binShape({ rotation: 30, gridfinityLabelFront: true, gridfinityLabelFrontText: "Office", gridfinityLabelFont: "Script" });
    const solids = multicolorExportSolids(shape)!;
    // The last solid is the box round the bin; asked as the bin's own mesh instead, no face changes.
    const mesh = meshForShape(shape);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(mesh.faces.flatMap((face) => face.flatMap((i) => mesh.vertices[i])), 3));
    geometry.computeBoundingBox();
    computeBoundsTree.call(geometry);
    const probe = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
    probe.raycast = acceleratedRaycast;
    const withMesh = [...solids.slice(0, -1), { probe, box: geometry.boundingBox!, color: shape.color }];
    expect(exportFaceColors(mesh, withMesh, shape.color)).toEqual(exportFaceColors(mesh, solids, shape.color));
  });

  it("writes the letters' faces in their colour in the bin's one object, the others in the bin's", () => {
    const shape = binShape();
    const { mesh, colors } = exportColors(shape)!;
    const model = strFromU8(unzipSync(exportMeshesTo3mf([{ ...mesh, color: shape.color, faceColors: colors }]))["3D/3dmodel.model"]);
    expect(model.match(/<object /g)).toHaveLength(1);
    const palette = [...model.matchAll(/<m:color color="(#[0-9A-F]{6})/gi)].map((match) => match[1].toLowerCase());
    expect(palette).toEqual([BIN, LETTERS]);
    const lettered = colors.filter((color) => color === LETTERS).length;
    expect(lettered).toBeGreaterThan(0);
    expect(model.match(/p1="1"/g)).toHaveLength(lettered);
  });

  it("gives the letters' colour to their points in an OBJ", () => {
    const shape = binShape({ gridfinityLabelColor: "#ff0000" });
    const { mesh, colors } = exportColors(shape)!;
    const points = exportMeshesToObj([{ ...mesh, color: shape.color, faceColors: colors }]).split("\n").filter((line) => line.startsWith("v "));
    expect(points.some((line) => line.endsWith(" 1 0 0"))).toBe(true);
    expect(points.some((line) => !line.endsWith(" 1 0 0"))).toBe(true);
  });

  it("still finds the letters after a loose hole has cut the bin", async () => {
    const shape = binShape();
    const hole = box("hole", "#999999", 30, { hole: true, z: 10, width: 8, depth: 8, height: 40, size: 8 });
    const { solids, meshes, cut } = await exportBodiesWithLooseHoles([shape, hole]);
    expect(cut).toEqual([true]);
    expect(meshArea(meshes[0])).not.toBeCloseTo(meshArea(meshForShape(shape)), 0);
    expectLetterAreas(solids[0], meshes[0], { letters: expectedAreas(shape).letters });
  });

  it("leaves the bin as it was without a colour of the letters' own, or with the bin's", () => {
    for (const fields of [{ gridfinityLabelColor: undefined }, { gridfinityLabelColor: BIN }, { gridfinityLabelColor: "#4F7FA8" }, { gridfinityType: "tray", height: 20 }, { gridfinityLabelBackText: undefined }, { gridfinityLabelBackText: "W".repeat(24), width: 41.5, size: 41.5 }]) {
      expect(multicolorExportSolids(binShape(fields)), JSON.stringify(fields)).toBeNull();
    }
    // The bin's mesh is the same with any colour of its letters, so an STL comes out the same, and is not built again for it.
    expect(meshForShape(binShape({ id: "other" }))).toEqual(meshForShape(binShape({ id: "other", gridfinityLabelColor: undefined })));
    expect(sameShapeApartFromPlacement(binShape(), binShape({ gridfinityLabelColor: "#ff0000" }))).toBe(true);
  });

  it("keeps the letters' colour in a group shown in its parts' colours, also when it is resized, and counts it as a second colour", async () => {
    const shape = binShape();
    const neighbour = box("box", BIN, 70);
    const built = await buildGroupedShapeFromSelection([shape, neighbour], 250_000);
    const group = { ...built.group!, multicolor: true } as WorkplaneShape;
    const expected = expectedAreas(shape);
    // The box beside the bin: 20 x 20 x 10 mm in the bin's colour.
    expectLetterAreas(group, undefined, { letters: expected.letters, bin: expected.bin + 1600 });
    // The letters and the bin together stretched 1.5 times every way, the letters' area with them.
    const grown = { ...group, size: (group.size ?? 0) * 1.5, width: group.width! * 1.5, depth: group.depth! * 1.5, height: group.height * 1.5 };
    expectLetterAreas(grown, undefined, { letters: expected.letters * 2.25, bin: (expected.bin + 1600) * 2.25 });
  });

  it("keeps the letters' colour when a group shown in its parts' colours goes into another group", async () => {
    const shape = binShape();
    const inner = { ...(await buildGroupedShapeFromSelection([shape, box("box", "#ff00ff", 70)], 250_000)).group!, multicolor: true } as WorkplaneShape;
    const outer = { ...(await buildGroupedShapeFromSelection([inner, box("other", "#00ff00", -80)], 250_000)).group!, multicolor: true } as WorkplaneShape;
    const areas = areasByColor(meshForShape(outer), exportColors(outer)!.colors);
    expect(Object.keys(areas).sort()).toEqual([BIN, LETTERS, "#ff00ff", "#00ff00"].sort());
    expect(areas[LETTERS]).toBeCloseTo(expectedAreas(shape).letters, 1);
  });

  it("keeps the letters' colour in a group cut by a hole only with Multicolor on", async () => {
    const shape = binShape();
    const hole = box("hole", "#999999", 30, { hole: true, z: 10, width: 8, depth: 8, height: 40, size: 8 });
    const built = await buildGroupedShapeFromSelection([shape, hole], 250_000);
    const group = built.group!;
    expect(group.importedMesh).toBeTruthy();
    expect(multicolorExportSolids(group)).toBeNull();
    expectLetterAreas({ ...group, multicolor: true }, undefined, { letters: expectedAreas(shape).letters });
  });

  it("leaves a group in one colour, a bundle in one colour and its parts without the letters' colour", () => {
    const shape = binShape();
    const group = { ...box("group", "#00ff00", 0), groupedShapes: [shape, box("box", BIN, 70)], multicolor: false } as WorkplaneShape;
    expect(multicolorExportSolids(group)).toBeNull();
    expect(gridfinityLabelColor(groupChildAppearance(group, shape))).toBeUndefined();
    expect(gridfinityLabelColor(groupChildAppearance({ ...group, multicolor: true }, shape))).toBe(LETTERS);
    const bundle = { ...group, groupOperation: "bundle" } as WorkplaneShape;
    const [part] = expandBundles([bundle]);
    expect(part.color).toBe("#00ff00");
    expect(gridfinityLabelColor(part)).toBeUndefined();
    expect(gridfinityLabelColor(expandBundles([{ ...bundle, multicolor: true }])[0])).toBe(LETTERS);
  });
});

/** The surface of a bin as the view draws it, in the frame the shape is built in. */
function surfaceOf(object: THREE.Group) {
  return object.children.find((child): child is THREE.Mesh => child instanceof THREE.Mesh && Boolean(child.userData.shapeSurface))!;
}

/** The colours a geometry's points are drawn in, each once. */
function colorsOf(geometry: THREE.BufferGeometry) {
  const color = geometry.getAttribute("color");
  const seen = new Set<string>();
  for (let index = 0; index < color.count; index += 1) seen.add(`#${new THREE.Color(color.getX(index), color.getY(index), color.getZ(index)).getHexString()}`);
  return [...seen].sort();
}

/** The middle of the first glyph's outline, a point inside the letter in the bins these tests build. */
function glyphMiddle(letters: ReturnType<typeof gridfinityLabelLetters>) {
  return letters[0].glyphs[0][0].reduce(([sx, sz], [px, pz], _i, ring) => [sx + px / ring.length, sz + pz / ring.length], [0, 0]);
}

/** The middle of every triangle of a geometry's range, rounded, to compare faces between the view and an export. */
function middles(position: THREE.BufferAttribute | THREE.InterleavedBufferAttribute, start: number, count: number) {
  const keys: string[] = [];
  for (let offset = start; offset < start + count; offset += 3) {
    const sum = [0, 0, 0];
    for (let corner = 0; corner < 3; corner += 1) {
      sum[0] += position.getX(offset + corner);
      sum[1] += position.getY(offset + corner);
      sum[2] += position.getZ(offset + corner);
    }
    keys.push(sum.map((value) => (value / 3).toFixed(3)).join(","));
  }
  return keys.sort();
}

describe("a Gridfinity bin's letters in their own colour in the view", () => {
  it("draws the letters' faces as a second group in a second material, the faces an export colours and no others", () => {
    const shape = binShape();
    const surface = surfaceOf(createShapeObject(shape));
    const materials = surface.material as THREE.MeshStandardMaterial[];
    expect(Array.isArray(materials)).toBe(true);
    expect(materials.map((material) => `#${material.color.getHexString()}`)).toEqual([BIN, LETTERS]);
    const { groups } = surface.geometry;
    expect(groups.map((group) => group.materialIndex)).toEqual([0, 1]);
    const position = surface.geometry.getAttribute("position");
    expect(groups[0].start).toBe(0);
    expect(groups[1].start + groups[1].count).toBe(position.count);
    // The view's triangles stand on y = 0 as the shape's mesh does; the same faces in the same colours, one by one.
    const { mesh, colors } = exportColors(shape)!;
    const exported = (color: string) => {
      const keys: string[] = [];
      mesh.faces.forEach((face, index) => {
        if (colors[index] !== color) return;
        const sum = face.reduce((acc, i) => acc.map((value, axis) => value + mesh.vertices[i][axis] / 3), [0, 0, 0]);
        keys.push(sum.map((value) => value.toFixed(3)).join(","));
      });
      return keys.sort();
    };
    expect(middles(position, groups[1].start, groups[1].count)).toEqual(exported(LETTERS));
    expect(middles(position, 0, groups[0].count)).toEqual(exported(BIN));
  });

  it("keeps the geometry whatever the letters' colour, sorts it once one is set, and draws them anew when it changes", () => {
    const shape = binShape();
    const other = { ...shape, gridfinityLabelColor: "#ff0000" };
    const unset = { ...shape, gridfinityLabelColor: undefined };
    for (const changed of [other, unset]) {
      expect(tapeShapeTopologyKey(changed)).toBe(tapeShapeTopologyKey(shape));
      expect(shapeMaterialSignature(changed)).not.toBe(shapeMaterialSignature(shape));
      expect(workplaneShapesEqual(changed, shape)).toBe(false);
    }
    expect(shapeGeometrySignature(other)).toBe(shapeGeometrySignature(shape));
    expect(surfaceOf(createShapeObject(other)).geometry).toBe(surfaceOf(createShapeObject(shape)).geometry);
    // Without a colour of their own the letters' faces are not sorted, as before, and are drawn in the bin's material.
    expect(shapeGeometrySignature(unset)).not.toBe(shapeGeometrySignature(shape));
    const plain = surfaceOf(createShapeObject(unset));
    expect(plain.geometry.groups).toEqual([]);
    expect(Array.isArray(plain.material)).toBe(false);
  });

  it("draws both colours again after the bin's colour or the letters' changes", () => {
    const shape = binShape();
    const object = createShapeObject(shape);
    const materialColors = () => {
      const { material } = surfaceOf(object);
      return (Array.isArray(material) ? material : [material]).map((entry) => `#${(entry as THREE.MeshStandardMaterial).color.getHexString()}`);
    };
    syncShapeObjectAppearance(object, { ...shape, color: "#00ff00" }, false, true);
    expect(materialColors()).toEqual(["#00ff00", LETTERS]);
    syncShapeObjectAppearance(object, { ...shape, color: "#00ff00", gridfinityLabelColor: "#ff0000" }, false, true);
    expect(materialColors()).toEqual(["#00ff00", "#ff0000"]);
    syncShapeObjectAppearance(object, { ...shape, color: "#00ff00", gridfinityLabelColor: undefined }, false, true);
    expect(materialColors()).toEqual(["#00ff00"]);
    syncShapeObjectAppearance(object, shape, false, true);
    expect(materialColors()).toEqual([BIN, LETTERS]);
  });

  it("keeps a face of no area in the bin's group, as an export gives it the bin's colour", () => {
    const shape = binShape();
    const letters = gridfinityLabelLetters({ ...shape, width: shape.width!, depth: shape.depth! });
    // A point inside the first glyph at the letters' middle height: a face of no area there, then the letters' top over it.
    const [x, z] = glyphMiddle(letters);
    const y = letters[0].top + GRIDFINITY_LABEL_TEXT_HEIGHT / 2;
    const top = letters[0].top + GRIDFINITY_LABEL_TEXT_HEIGHT;
    const built = new THREE.BufferGeometry();
    built.setAttribute("position", new THREE.Float32BufferAttribute([x, top, z, x + 0.01, top, z + 0.01, x + 0.01, top, z, x, y, z, x, y, z, x, y, z], 3));
    const geometry = gridfinityLetterGroups(built, letters);
    expect(geometry.groups.map(({ start, count }) => [start, count])).toEqual([[0, 3], [3, 3]]);
    expect(geometry.getAttribute("position").getY(0)).toBeCloseTo(y, 5);
  });

  it("keeps a face just above the letters' top in the bin's group", () => {
    const shape = binShape();
    const letters = gridfinityLabelLetters({ ...shape, width: shape.width!, depth: shape.depth! });
    const [x, z] = glyphMiddle(letters);
    // Facing up, 0.05 mm over the letters' top: its point 0.02 mm under it is still above them. The same face at the top is a letter's.
    const face = (y: number) => [x, y, z, x + 0.01, y, z + 0.01, x + 0.01, y, z];
    const top = letters[0].top + GRIDFINITY_LABEL_TEXT_HEIGHT;
    const built = new THREE.BufferGeometry();
    built.setAttribute("position", new THREE.Float32BufferAttribute([...face(top + 0.05), ...face(top)], 3));
    const geometry = gridfinityLetterGroups(built, letters);
    expect(geometry.groups.map(({ start, count }) => [start, count])).toEqual([[0, 3], [3, 3]]);
    expect(geometry.getAttribute("position").getY(0)).toBeCloseTo(top + 0.05, 5);
  });

  it("adds no groups to a mesh with no face in the letters", () => {
    const shape = binShape();
    const letters = gridfinityLabelLetters({ ...shape, width: shape.width!, depth: shape.depth! });
    const [x, z] = letters[0].glyphs[0][0][0];
    // Under the first glyph but below the shelves, as a bin built before its letters could be.
    const built = new THREE.BufferGeometry();
    built.setAttribute("position", new THREE.Float32BufferAttribute([x, -5, z, x + 0.01, -5, z + 0.01, x + 0.01, -5, z], 3));
    expect(gridfinityLetterGroups(built, letters).groups).toEqual([]);
  });

  it("draws a bin whose text is left out, or a hole, in one material", () => {
    expect(Array.isArray(surfaceOf(createShapeObject(binShape({ gridfinityLabelBackText: "W".repeat(24), width: 41.5, size: 41.5 }))).material)).toBe(false);
    expect(Array.isArray(surfaceOf(createShapeObject(binShape({ hole: true }))).material)).toBe(false);
  });

  it("shows the letters' colour in a group cut by a hole and shown in its parts' colours", async () => {
    const shape = binShape();
    const hole = box("hole", "#999999", 30, { hole: true, z: 10, width: 8, depth: 8, height: 40, size: 8 });
    const group = { ...(await buildGroupedShapeFromSelection([shape, hole], 250_000)).group!, multicolor: true } as WorkplaneShape;
    const geometry = buildPartColoredMeshGeometry(group.importedMesh!, group.groupedShapes!)!;
    const position = geometry.getAttribute("position");
    const color = geometry.getAttribute("color");
    const areas: Record<string, number> = {};
    const [a, b, c] = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
    for (let offset = 0; offset < position.count; offset += 3) {
      a.fromBufferAttribute(position, offset);
      b.fromBufferAttribute(position, offset + 1);
      c.fromBufferAttribute(position, offset + 2);
      const key = `#${new THREE.Color(color.getX(offset), color.getY(offset), color.getZ(offset)).getHexString()}`;
      areas[key] = (areas[key] ?? 0) + new THREE.Triangle(a, b, c).getArea();
    }
    expect(Object.keys(areas).sort()).toEqual([BIN, LETTERS].sort());
    expect(areas[LETTERS]).toBeCloseTo(expectedAreas(shape).letters, 1);
  });

  it("shows the letters' colour in a group drawn as one body with Multicolor on", async () => {
    const shape = binShape();
    const group = { ...(await buildGroupedShapeFromSelection([shape, box("box", "#ff00ff", 70)], 250_000)).group!, multicolor: true } as WorkplaneShape;
    const mesh = buildGroupDisplayMesh(group);
    expect(mesh).toBeTruthy();
    expect(colorsOf(buildPartColoredMeshGeometry(mesh!, group.groupedShapes!)!)).toEqual([BIN, LETTERS, "#ff00ff"].sort());
  });

  it("keeps a bin without letters of their own colour in its colour in a group drawn as one body with Multicolor on", async () => {
    const group = { ...(await buildGroupedShapeFromSelection([binShape({ gridfinityLabelColor: undefined }), box("box", "#ff00ff", 70)], 250_000)).group!, multicolor: true } as WorkplaneShape;
    expect(colorsOf(buildPartColoredMeshGeometry(buildGroupDisplayMesh(group)!, group.groupedShapes!)!)).toEqual([BIN, "#ff00ff"].sort());
  });
});

describe("part colours of other bodies drawn in several materials", () => {
  it("colours a picture plate in a group shown in its parts' colours by its own colour, not by its picture's white", async () => {
    // A picture plate is a box with a material for each side; only a bin's letters are split into surfaces of their own.
    const group = { ...(await buildGroupedShapeFromSelection([box("plate", "#ff0000", 0), box("box", "#0000ff", 30)], 250_000)).group!, multicolor: true } as WorkplaneShape;
    const mesh = buildGroupDisplayMesh(group)!;
    // Grouping gives the parts ids of their own; the plate is the red one.
    const parts = group.groupedShapes!.map((part) => (part.color === "#ff0000" ? { ...part, imagePlate: { dataUrl: "", mimeType: "image/png", pixelWidth: 1, pixelHeight: 1 } } : part));
    expect(parts.filter((part) => part.imagePlate)).toHaveLength(1);
    expect(colorsOf(buildPartColoredMeshGeometry(mesh, parts)!)).toEqual(["#0000ff", "#ff0000"]);
  });
});

describe("the letters' colour through the project, the defaults and MCP", () => {
  it("keeps the colour through a saved project, and refuses one that is not #rrggbb", async () => {
    const shape = binShape();
    const project = (shapes: WorkplaneShape[]) => exportLylProject({
      projectId: "letters",
      projectName: "Letters",
      createdAt: 1_700_000_000_000,
      modifiedAt: 1_700_000_100_000,
      shapes,
      history: [editorHistoryEntry(shapes, [])],
      historyIndex: 0,
      assets: [],
      workspace: DEFAULT_WORKPLANE_WORKSPACE,
      snapGrid: DEFAULT_SNAP_GRID,
      placementElevation: 0,
    });
    const roundTrip = async (shapes: WorkplaneShape[]) => importLylProject(await project(shapes));
    const [loaded] = (await roundTrip([shape])).shapes;
    expect(loaded.gridfinityLabelColor).toBe(LETTERS);
    expect(workplaneShapesEqual(loaded, shape)).toBe(true);
    expect(sceneShape(shape).gridfinityLabelColor).toBe(LETTERS);
    await expect(roundTrip([{ ...shape, gridfinityLabelColor: "yellow" }])).rejects.toThrow(/gridfinityLabelColor/);
    await expect(roundTrip([{ ...shape, gridfinityLabelColor: ["#f2c200"] } as unknown as WorkplaneShape])).rejects.toThrow(/gridfinityLabelColor/);
  });

  it("keeps the colour as a default for new bins, as the font", () => {
    expect(shapeDefaultsFromShape(binShape())).toMatchObject({ gridfinityLabelColor: LETTERS });
    expect(normalizeShapeCustomizations({ gridfinity: { gridfinityLabelColor: "#F2C200" } }, {})).toMatchObject({ gridfinity: { gridfinityLabelColor: LETTERS } });
    expect(normalizeShapeCustomizations({ gridfinity: { gridfinityLabelColor: "yellow" } }, {}).gridfinity?.gridfinityLabelColor).toBeUndefined();
    expect(normalizeShapeCustomizations({ gridfinity: { gridfinityLabelColor: 3 } }, {}).gridfinity?.gridfinityLabelColor).toBeUndefined();
    const asset = toolbarShapeAssets.find((entry) => entry.kind === "gridfinity")!;
    expect(makeShapeFromAsset(asset, { x: 0, z: 0 }, { gridfinityLabelColor: LETTERS })).toMatchObject({ gridfinityLabelColor: LETTERS });
  });

  it("takes the colour from MCP, an empty one as the bin's, and reads it back", () => {
    expect(mcpGridfinityPatch({ gridfinityLabelColor: "#F2C200" })).toStrictEqual({ gridfinityLabelColor: LETTERS });
    expect(mcpGridfinityPatch({ gridfinityLabelColor: "" })).toStrictEqual({ gridfinityLabelColor: undefined });
    expect(() => mcpGridfinityPatch({ gridfinityLabelColor: "yellow" })).toThrow(/gridfinityLabelColor/);
    expect(() => mcpGridfinityPatch({ gridfinityLabelColor: 3 })).toThrow(/gridfinityLabelColor/);
    expect(JSON.stringify(mcpShapeSummary(binShape()))).toContain(`"gridfinityLabelColor":"${LETTERS}"`);
  });
});
