import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { formatPrintCheckArea, printCheckLineFocus, printCheckLineIds } from "@/components/workplane/PrintCheckPanel";
import { clipThinWallOverlay, syncThinWallOverlay } from "@/components/workplane/ThinWallOverlay";
import { RENDER_LAYER_HELPERS, type ThreeState } from "@/components/workplane/ViewportOverlays";
import {
  PRINT_CHECK_CONTACT_MM2_PER_MM,
  PRINT_CHECK_DEFAULT_NOZZLE_MM,
  measureThinWalls,
  normalizePrintCheckOptions,
  printCheckMinimumWall,
  printCheckOpenMeshes,
  printCheckSmallContact,
  printCheckTopLevelId,
  printCheckWarnings,
  type PrintCheckPiece,
  type PrintCheckResult,
} from "@/lib/printCheck";
import type { WorkplaneShape } from "@/types/layerling";

type V = [number, number, number];

/**
 * A convex body as an indexed mesh, each triangle turned outwards (away from the middle of its corners), the way
 * Manifold hands its meshes over.
 */
function convexMesh(points: V[], faces: number[][]) {
  const middle = points.reduce((sum, p) => [sum[0] + p[0] / points.length, sum[1] + p[1] / points.length, sum[2] + p[2] / points.length] as V, [0, 0, 0] as V);
  const indices: number[] = [];
  for (const face of faces) {
    for (let k = 1; k + 1 < face.length; k += 1) {
      const [a, b, c] = [face[0], face[k], face[k + 1]].map((index) => points[index]);
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      const out = (a[0] - middle[0]) * n[0] + (a[1] - middle[1]) * n[1] + (a[2] - middle[2]) * n[2];
      indices.push(...(out >= 0 ? [face[0], face[k], face[k + 1]] : [face[0], face[k + 1], face[k]]));
    }
  }
  return { positions: points.flat(), indices };
}

/** A box from `min` to `max` (scene frame, y up). */
function boxMesh(min: V, max: V) {
  const points: V[] = [];
  for (const x of [min[0], max[0]]) for (const y of [min[1], max[1]]) for (const z of [min[2], max[2]]) points.push([x, y, z]);
  // Corner index: x * 4 + y * 2 + z.
  return convexMesh(points, [[0, 1, 3, 2], [4, 5, 7, 6], [0, 1, 5, 4], [2, 3, 7, 6], [0, 2, 6, 4], [1, 3, 7, 5]]);
}

/** Two meshes as one (the second's corners after the first's). */
function both(a: { positions: number[]; indices: number[] }, b: { positions: number[]; indices: number[] }) {
  const offset = a.positions.length / 3;
  return { positions: [...a.positions, ...b.positions], indices: [...a.indices, ...b.indices.map((index) => index + offset)] };
}

/** A box with a cavity inside, the cavity's faces turned inwards: a hollow body with walls of these thicknesses. */
function hollowBox(size: V, walls: { side: number; sideThin?: number; floor: number }) {
  const outer = boxMesh([0, 0, 0], size);
  const inner = boxMesh([walls.sideThin ?? walls.side, walls.floor, walls.side], [size[0] - walls.side, size[1] - walls.floor, size[2] - walls.side]);
  const cavity = { positions: inner.positions, indices: inner.indices.flatMap((_, index, all) => (index % 3 === 0 ? [all[index], all[index + 2], all[index + 1]] : [])) };
  return both(outer, cavity);
}

const area = (positions: number[]) => {
  let total = 0;
  for (let i = 0; i < positions.length; i += 9) {
    const u = [positions[i + 3] - positions[i], positions[i + 4] - positions[i + 1], positions[i + 5] - positions[i + 2]];
    const v = [positions[i + 6] - positions[i], positions[i + 7] - positions[i + 1], positions[i + 8] - positions[i + 2]];
    total += Math.hypot(u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]) / 2;
  }
  return total;
};

describe("the print check's settings", () => {
  it("starts at a 0.4 mm nozzle, walls of two lines, and keeps the nozzle within its range", () => {
    expect(PRINT_CHECK_DEFAULT_NOZZLE_MM).toBe(0.4);
    expect(printCheckMinimumWall(0.4)).toBeCloseTo(0.8, 12);
    expect(printCheckMinimumWall(0.6)).toBeCloseTo(1.2, 12);
    expect(normalizePrintCheckOptions()).toEqual({ nozzle: 0.4, overhangAngle: 45 });
    expect(normalizePrintCheckOptions({ nozzle: 9 }).nozzle).toBe(2);
    expect(normalizePrintCheckOptions({ nozzle: 0 }).nozzle).toBe(0.1);
    expect(normalizePrintCheckOptions({ nozzle: Number.NaN }).nozzle).toBe(0.4);
    expect(normalizePrintCheckOptions({ overhangAngle: 50 }).overhangAngle).toBe(50);
  });
});

describe("measuring the walls", () => {
  it("finds a plate of 0.5 mm too thin for a 0.4 mm nozzle, on both of its faces", () => {
    const plate = boxMesh([0, 0, 0], [20, 0.5, 20]);
    const measured = measureThinWalls(plate.positions, plate.indices, printCheckMinimumWall(0.4));
    expect(measured.places).toHaveLength(2);
    for (const place of measured.places) {
      expect(place.thinnestMm).toBeCloseTo(0.5, 4);
      expect(place.areaMm2).toBeCloseTo(400, 6);
    }
    // The narrow sides look across the whole plate: no wall there.
    expect(area(measured.positions)).toBeCloseTo(800, 6);
    expect(measured.rays).toBeGreaterThan(12);
  });

  it("leaves a plate of 2 mm alone, and a 0.5 mm one for a 0.2 mm nozzle", () => {
    const thick = boxMesh([0, 0, 0], [20, 2, 20]);
    expect(measureThinWalls(thick.positions, thick.indices, 0.8).places).toHaveLength(0);
    const plate = boxMesh([0, 0, 0], [20, 0.5, 20]);
    expect(measureThinWalls(plate.positions, plate.indices, printCheckMinimumWall(0.2)).places).toHaveLength(0);
  });

  it("finds a standing wall of 0.6 mm, also inside a hollow box, and paints only that wall", () => {
    // A 30 x 20 x 20 box, hollow: one side wall 0.6 mm, the other walls, floor and top 2 mm.
    const box = hollowBox([30, 20, 20], { side: 2, sideThin: 0.6, floor: 2 });
    const measured = measureThinWalls(box.positions, box.indices, 0.8);
    expect(measured.places.length).toBeGreaterThanOrEqual(2);
    expect(measured.places[0].thinnestMm).toBeCloseTo(0.6, 3);
    // The cavity's face beside the thin wall (16 x 16), and as much of the outer face, where the cavity is behind it.
    const painted = area(measured.positions);
    expect(painted).toBeGreaterThan(2 * 16 * 16 - 30);
    expect(painted).toBeLessThan(2 * 16 * 16 + 30);
    // Everything painted lies at the thin side, x below 0.6.
    for (let i = 0; i < measured.positions.length; i += 3) expect(measured.positions[i]).toBeLessThanOrEqual(0.6 + 1e-6);
  });

  it("does not take a sharp edge for a wall: a wedge's faces meet at a slant", () => {
    // A wedge 20 long, 20 high on a 20 x 20 floor: an edge of 45° along its top-front.
    const wedge = convexMesh([[0, 0, 0], [20, 0, 0], [0, 0, 20], [20, 0, 20], [0, 20, 0], [20, 20, 0]], [[0, 1, 3, 2], [0, 1, 5, 4], [2, 3, 5, 4], [0, 2, 4], [1, 3, 5]]);
    expect(measureThinWalls(wedge.positions, wedge.indices, 0.8).places).toHaveLength(0);
  });

  it("drops a thin place smaller than 1 mm², and keeps it with a smaller minimum", () => {
    const tab = boxMesh([0, 0, 0], [0.9, 0.5, 0.9]);
    expect(measureThinWalls(tab.positions, tab.indices, 0.8).places).toHaveLength(0);
    expect(measureThinWalls(tab.positions, tab.indices, 0.8, { minArea: 0.5 }).places).toHaveLength(2);
  });

  it("paints a large face in pieces where only part of it is thin", () => {
    // An L-shaped bar, 40 mm deep: a floor of 0.5 mm, 40 wide, and on its left half a block 10 mm tall. Its underside
    // is one face, thin only under the right half; the floor's top there is thin too.
    const profile: [number, number][] = [[0, 0], [40, 0], [40, 0.5], [20, 0.5], [20, 10], [0, 10]];
    const positions = [...profile.map(([x, y]) => [x, y, 0]), ...profile.map(([x, y]) => [x, y, 40])].flat();
    const fan = [[0, 1, 2], [0, 2, 3], [0, 3, 4], [0, 4, 5]];
    const indices = [
      ...fan.flatMap(([a, b, c]) => [a, c, b]),
      ...fan.flatMap(([a, b, c]) => [a + 6, b + 6, c + 6]),
      ...profile.flatMap((_, i) => {
        const j = (i + 1) % profile.length;
        return [i, j, j + 6, i, j + 6, i + 6];
      }),
    ];
    const owners = indices.filter((_, index) => index % 3 === 0).map(() => 7);
    const measured = measureThinWalls(positions, indices, 0.8, { owners });
    expect(measured.places).toHaveLength(2);
    expect(measured.places[0]).toMatchObject({ owner: 7 });
    expect(measured.places[0].thinnestMm).toBeCloseTo(0.5, 3);
    // 20 x 40 on top of the floor, about as much of the underside, cut along x = 20 in pieces of 0.6 mm.
    const painted = area(measured.positions);
    expect(painted).toBeGreaterThan(1600 - 30);
    expect(painted).toBeLessThan(1600 + 30);
    for (let i = 0; i < measured.positions.length; i += 3) expect(measured.positions[i]).toBeGreaterThan(19);
  });

  it("casts fewer, larger pieces when a surface would take more rays than allowed", () => {
    const plate = boxMesh([0, 0, 0], [200, 0.5, 200]);
    const measured = measureThinWalls(plate.positions, plate.indices, 0.8, { rayBudget: 2_000 });
    expect(measured.rays).toBeLessThanOrEqual(2_000);
    expect(area(measured.positions)).toBeCloseTo(80_000, 1);
  });
});

describe("what the print check reports", () => {
  const piece = (patch: Partial<PrintCheckPiece>): PrintCheckPiece => ({
    key: "piece-1", ids: ["a"], name: "A", box: { min: [0, 0, 0], max: [1, 1, 1] }, triangles: 12, onPlate: true, floating: false, heightMm: 10, footprintMm2: 100, smallContact: false, ...patch,
  });
  const result = (patch: Partial<PrintCheckResult>): PrintCheckResult => ({
    nozzleMm: 0.4, minimumWallMm: 0.8, pieces: [], thinWalls: { places: [], positions: [], rays: 0 }, wallTriangles: 0,
    overhang: { angle: 45, areaMm2: 0, steepest: null }, openMeshes: [], unchecked: [], joined: true, ...patch,
  });

  it("warns about small contact below half a square millimetre for each millimetre of height", () => {
    expect(PRINT_CHECK_CONTACT_MM2_PER_MM).toBe(0.5);
    // A sphere of 20 mm: its first layer is about 6 mm² under 20 mm of height.
    expect(printCheckSmallContact(6.2, 20)).toBe(true);
    expect(printCheckSmallContact(100, 10)).toBe(false);
    expect(printCheckSmallContact(10, 20)).toBe(false);
    expect(printCheckSmallContact(9.9, 20)).toBe(true);
    expect(printCheckSmallContact(0, 0)).toBe(false);
  });

  it("counts the checks that found something", () => {
    expect(printCheckWarnings(result({}))).toBe(0);
    expect(printCheckWarnings(result({
      pieces: [piece({ floating: true, onPlate: false }), piece({ smallContact: true })],
      overhang: { angle: 45, areaMm2: 12, steepest: { degrees: 60, name: "A" } },
      openMeshes: [{ id: "m", name: "Scan", openEdges: 4, nonManifoldEdges: 0, box: { min: [0, 0, 0], max: [1, 1, 1] } }],
      thinWalls: { places: [{ id: "a", name: "A", areaMm2: 3, thinnestMm: 0.5, point: [0, 0, 0], box: { min: [0, 0, 0], max: [1, 1, 1] } }], positions: [], rays: 9 },
    }))).toBe(5);
    expect(printCheckWarnings(result({ thinWalls: null }))).toBe(0);
  });

  it("finds the object a bundle's part belongs to", () => {
    const shapes = [{ id: "box" }, { id: "tag", groupedShapes: [{ id: "plate" }, { id: "letters", groupedShapes: [{ id: "a" }] }] }] as unknown as WorkplaneShape[];
    expect(printCheckTopLevelId(shapes, "box")).toBe("box");
    expect(printCheckTopLevelId(shapes, "a")).toBe("tag");
    expect(printCheckTopLevelId(shapes, "nothing")).toBeNull();
  });

  it("counts the open and the shared edges of an imported mesh, and passes a closed one", () => {
    const meshShape = (id: string, positions: number[]) => ({
      id, name: id, kind: "mesh", color: "#888888", x: 0, z: 0, elevation: 0, rotation: 0, size: 10, width: 10, depth: 10, height: 10,
      importedMesh: { positions, baseWidth: 10, baseDepth: 10, baseHeight: 10, triangleCount: positions.length / 9, sourceFormat: "stl" },
    }) as unknown as WorkplaneShape;
    const cube = boxMesh([-5, 0, -5], [5, 10, 5]);
    const soup = cube.indices.flatMap((index) => cube.positions.slice(index * 3, index * 3 + 3));
    expect(printCheckOpenMeshes([meshShape("closed", soup)])).toEqual([]);
    // Without its last two triangles (one face) the cube is open along that face's four edges.
    expect(printCheckOpenMeshes([meshShape("open", soup.slice(0, soup.length - 18))])).toEqual([
      { id: "open", name: "open", openEdges: 4, nonManifoldEdges: 0, box: { min: [-5, 0, -5], max: [5, 10, 5] } },
    ]);
    // A third triangle on an edge of the cube: that edge is shared by three.
    const fin = [-5, 0, -5, 5, 0, -5, 0, -3, -5];
    const shared = printCheckOpenMeshes([meshShape("fin", [...soup, ...fin])]);
    expect(shared[0].nonManifoldEdges).toBe(1);
    // Two closed cubes standing edge to edge: no open edge, but the edge they share has four faces.
    const neighbour = boxMesh([5, 10, -5], [15, 20, 5]);
    const pair = [...soup, ...neighbour.indices.flatMap((index) => neighbour.positions.slice(index * 3, index * 3 + 3))];
    expect(printCheckOpenMeshes([meshShape("pair", pair)])).toMatchObject([{ id: "pair", openEdges: 0, nonManifoldEdges: 1 }]);
    // A body of the editor's own is never counted.
    expect(printCheckOpenMeshes([{ id: "b", name: "b", kind: "box" } as unknown as WorkplaneShape])).toEqual([]);
  });
});

describe("what Show points at", () => {
  const box = (min: V, max: V) => ({ min, max });
  const piece = (patch: Partial<PrintCheckPiece>): PrintCheckPiece => ({
    key: "piece-1", ids: ["a"], name: "A", box: box([0, 0, 0], [1, 1, 1]), triangles: 12, onPlate: true, floating: false, heightMm: 10, footprintMm2: 100, smallContact: false, ...patch,
  });
  const found: PrintCheckResult = {
    nozzleMm: 0.4, minimumWallMm: 0.8, wallTriangles: 0, joined: true, unchecked: [],
    pieces: [
      piece({ key: "piece-1", ids: ["lid", "knob"], floating: true, onPlate: false, box: box([0, 5, 0], [10, 8, 10]) }),
      piece({ key: "piece-2", ids: ["ball"], smallContact: true, box: box([20, 0, 20], [36, 16, 36]) }),
      piece({ key: "piece-3", ids: ["tray"], box: box([-40, 0, -40], [-10, 20, -10]) }),
    ],
    thinWalls: { places: [{ id: "tray", name: "Tray", areaMm2: 4, thinnestMm: 0.5, point: [-10, 10, -20], box: box([-10, 2, -30], [-10, 18, -20]) }], positions: [], rays: 1 },
    overhang: { angle: 45, areaMm2: 10, steepest: { degrees: 60, name: "Lid" } },
    openMeshes: [{ id: "scan", name: "Scan", openEdges: 3, nonManifoldEdges: 0, box: box([50, 0, 0], [60, 10, 10]) }],
  };

  it("selects the floating parts, those on too little of the plate and the open meshes, nothing for walls and overhangs", () => {
    expect(printCheckLineIds(found, "floating")).toEqual(["lid", "knob"]);
    expect(printCheckLineIds(found, "contact")).toEqual(["ball"]);
    expect(printCheckLineIds(found, "openMesh")).toEqual(["scan"]);
    expect(printCheckLineIds(found, "thin")).toEqual([]);
    expect(printCheckLineIds(found, "overhang")).toEqual([]);
  });

  it("frames what a line found, all of it together", () => {
    expect(printCheckLineFocus(found, "floating")).toEqual(box([0, 5, 0], [10, 8, 10]));
    expect(printCheckLineFocus(found, "thin")).toEqual(box([-10, 2, -30], [-10, 18, -20]));
    expect(printCheckLineFocus({ ...found, pieces: found.pieces.map((entry) => ({ ...entry, smallContact: true })) }, "contact")).toEqual(box([-40, 0, -40], [36, 20, 36]));
    expect(printCheckLineFocus(found, "overhang")).toBeNull();
    expect(printCheckLineFocus({ ...found, openMeshes: [] }, "openMesh")).toBeNull();
  });

  it("writes an area in mm² up to 100 and in cm² above", () => {
    expect(formatPrintCheckArea(3.991)).toMatch(/^3[.,]99 mm²$/);
    expect(formatPrintCheckArea(57.6)).toMatch(/^57[.,]6 mm²$/);
    expect(formatPrintCheckArea(576)).toMatch(/^5[.,]76 cm²$/);
    expect(formatPrintCheckArea(12_345)).toMatch(/^123[.,]5 cm²$/);
  });
});

describe("the red paint of the thin walls", () => {
  const stateWithScene = () => ({ scene: new THREE.Scene(), sectionPlane: null, needsRender: false }) as unknown as ThreeState;
  const paint = (state: ThreeState) => state.scene.children.filter((child) => child.name === "PrintCheckThinWalls") as THREE.Mesh[];

  it("lies on the bodies as a mesh of its own, drawn towards the camera, and is replaced and taken away", () => {
    const state = stateWithScene();
    syncThinWallOverlay(state, [0, 0, 0, 1, 0, 0, 0, 1, 0]);
    const [mesh] = paint(state);
    expect(mesh.geometry.getAttribute("position").count).toBe(3);
    expect(mesh.layers.isEnabled(RENDER_LAYER_HELPERS)).toBe(true);
    const material = mesh.material as THREE.MeshLambertMaterial;
    expect(material.polygonOffset).toBe(true);
    expect(material.polygonOffsetFactor).toBeLessThan(0);
    expect(material.depthWrite).toBe(false);
    expect(state.needsRender).toBe(true);
    // The grid over the red, so it shows on a red body too.
    const shader = { fragmentShader: "#include <color_fragment>", vertexShader: "", uniforms: {} };
    material.onBeforeCompile(shader as never, undefined as never);
    expect(shader.fragmentShader).toContain("gl_FragCoord.x - gl_FragCoord.y");
    syncThinWallOverlay(state, [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 1, 0, 1, 1]);
    expect(paint(state)).toHaveLength(1);
    expect(paint(state)[0].geometry.getAttribute("position").count).toBe(6);
    syncThinWallOverlay(state, []);
    expect(paint(state)).toHaveLength(0);
    syncThinWallOverlay(state, [0, 0, 0, 1, 0, 0, 0, 1, 0]);
    syncThinWallOverlay(state, null);
    expect(paint(state)).toHaveLength(0);
  });

  it("is cut by the section view as the bodies are", () => {
    const state = stateWithScene();
    const plane = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0);
    state.sectionPlane = plane;
    syncThinWallOverlay(state, [0, 0, 0, 1, 0, 0, 0, 1, 0]);
    const material = paint(state)[0].material as THREE.Material;
    expect(material.clippingPlanes).toEqual([plane]);
    state.sectionPlane = null;
    clipThinWallOverlay(state);
    expect(material.clippingPlanes).toBeNull();
    // With nothing painted there is nothing to cut.
    syncThinWallOverlay(state, null);
    expect(() => clipThinWallOverlay(state)).not.toThrow();
  });
});
