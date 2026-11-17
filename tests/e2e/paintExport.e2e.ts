import { beforeAll, describe, expect, it, vi } from "vitest";
import manifoldModule from "manifold-3d";
import { strFromU8, unzipSync } from "fflate";
import { colorSeparatedExportMeshes, exportBodiesWithLooseHoles, unionOverlappingExportMeshes } from "@/lib/editorBooleans";
import { meshForShape } from "@/lib/editorMeshCore";
import { rememberManifoldRuntime } from "@/lib/manifoldHandle";
import { normalizePaintStroke, type PaintStroke } from "@/lib/paint";
import { clearPaintedMeshCache, meshIsClosed, paintedExportFaceColors } from "@/lib/paintMesh";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { exportMeshesTo3mf } from "@/lib/threemfExport";
import { canonicalizeShape } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

/**
 * A painted body (paint.ts) leaves the editor as the export window writes it: a 3MF and an OBJ take its mesh cut along
 * the paint, closed, with a colour on every face and the painted faces marked for the slicer; an STL takes the body as
 * it was, in one colour. A hole that cuts the painted body keeps the paint on what is left of it.
 */
const kernel = vi.hoisted(() => ({ runtime: null as Promise<unknown> | null }));
vi.mock("@/lib/editorMeshCore", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/editorMeshCore")>()),
  getManifoldRuntime: () => kernel.runtime,
}));
beforeAll(async () => {
  kernel.runtime = manifoldModule().then((runtime) => { runtime.setup(); rememberManifoldRuntime(runtime); return runtime; });
  await kernel.runtime;
  clearPaintedMeshCache();
});

const BLUE = "#1c7ed6";
const WHITE = "#ffffff";
const YELLOW = "#f2cf10";
const asset = (kind: string) => toolbarShapeAssets.find((entry) => entry.kind === kind)!;
const stroke = (patch: Partial<PaintStroke>) => normalizePaintStroke({ mode: "fill", size: [30, 20, 30], ...patch })!;
const painted = canonicalizeShape({
  ...makeShapeFromAsset(asset("box"), { x: 12, z: -5 }),
  id: "painted",
  name: "Painted",
  color: BLUE,
  width: 30,
  depth: 30,
  size: 30,
  height: 20,
  rotation: 30,
  paint: [
    stroke({ color: YELLOW, point: [0, 20, 0], normal: [0, 1, 0] }),
    stroke({ mode: "circle", color: WHITE, point: [0, 10, 15], normal: [0, 0, 1], diameter: 12 }),
  ],
} as WorkplaneShape);

const area = (mesh: { vertices: [number, number, number][]; faces: [number, number, number][] }, colors: readonly string[], color: string) => mesh.faces.reduce((sum, [a, b, c], face) => {
  if (colors[face] !== color) return sum;
  const [p, q, r] = [a, b, c].map((index) => mesh.vertices[index]);
  const u = [q[0] - p[0], q[1] - p[1], q[2] - p[2]];
  const v = [r[0] - p[0], r[1] - p[1], r[2] - p[2]];
  return sum + Math.hypot(u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]) / 2;
}, 0);

describe("a painted body, exported", () => {
  it("goes into a 3MF cut along its paint, closed, every painted face marked for the slicer", async () => {
    const { solids, meshes, cut } = await exportBodiesWithLooseHoles([painted], { painted: true });
    const separated = await colorSeparatedExportMeshes(solids, meshes, cut);
    expect(separated.meshes).toHaveLength(1);
    const mesh = separated.meshes[0];
    const colors = paintedExportFaceColors(mesh, solids[separated.quellen[0]])!;
    expect(colors).toHaveLength(mesh.faces.length);
    expect(meshIsClosed(mesh.faces, mesh.vertices.length)).toBe(true);
    // The top in yellow, a round patch of 12 mm on the front in white, the rest in the body's blue.
    expect(area(mesh, colors, YELLOW)).toBeCloseTo(900, 3);
    expect(area(mesh, colors, WHITE)).toBeGreaterThan(Math.PI * 36 * 0.99);
    expect(area(mesh, colors, WHITE)).toBeLessThan(Math.PI * 36 * 1.0001);
    const model = strFromU8(unzipSync(exportMeshesTo3mf([{ ...mesh, color: BLUE, faceColors: colors }]))["3D/3dmodel.model"]);
    const triangles = [...model.matchAll(/<triangle [^>]*\/>/g)].map((match) => match[0]);
    expect(triangles).toHaveLength(mesh.faces.length);
    expect(new Set(triangles.map((triangle) => /paint_color="([^"]+)"/.exec(triangle)?.[1])).size).toBe(3);
  });

  it("goes into an STL as the body was, its paint left out", async () => {
    const { solids, meshes, cut } = await exportBodiesWithLooseHoles([painted]);
    const joined = await unionOverlappingExportMeshes(solids, meshes, cut);
    expect(joined.meshes[0].faces).toHaveLength(meshForShape(painted).faces.length);
  });

  it("keeps its paint where a hole cut it", async () => {
    // A hole 4 mm across down through the middle: the yellow top loses its round opening, the white patch stays.
    const hole = canonicalizeShape({ ...makeShapeFromAsset(asset("cylinder"), { x: 12, z: -5 }), id: "hole", name: "Hole", hole: true, width: 4, depth: 4, size: 4, height: 60, elevation: -20 } as WorkplaneShape);
    const { solids, meshes, cut } = await exportBodiesWithLooseHoles([painted, hole], { painted: true });
    expect(cut).toEqual([true]);
    const separated = await colorSeparatedExportMeshes(solids, meshes, cut);
    const mesh = separated.meshes[0];
    const colors = paintedExportFaceColors(mesh, solids[separated.quellen[0]])!;
    // The top keeps its yellow less the hole's round opening.
    expect(area(mesh, colors, YELLOW)).toBeGreaterThan(900 - Math.PI * 4 - 1);
    expect(area(mesh, colors, YELLOW)).toBeLessThan(900 - Math.PI * 4 + 0.5);
    expect(area(mesh, colors, WHITE)).toBeGreaterThan(Math.PI * 36 * 0.95);
    // The hole's wall is the body's own colour.
    expect(colors.filter((color) => color === BLUE).length).toBeGreaterThan(10);
  });

  it("gives no colours of its own to a body without paint", () => {
    expect(paintedExportFaceColors(meshForShape({ ...painted, paint: undefined }), { ...painted, paint: undefined })).toBeNull();
  });
});
