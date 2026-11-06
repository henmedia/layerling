import { beforeAll, describe, expect, it, vi } from "vitest";
import manifoldModule from "manifold-3d";
import { unzipSync, strFromU8 } from "fflate";
import { colorSeparatedExportMeshes, exportBodiesWithLooseHoles, unionOverlappingExportMeshes, visibleExportShapes } from "@/lib/editorBooleans";
import { rememberManifoldRuntime } from "@/lib/manifoldHandle";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { normalizeSurfaceTexture, surfaceTexturePositions, applySurfaceTexture } from "@/lib/surfaceTexture";
import { surfaceTextureInput, surfaceTextureResultShape, textureSurfacePositions } from "@/lib/surfaceTextureShape";
import { exportMeshesTo3mf } from "@/lib/threemfExport";
import { canonicalizeShape } from "@/lib/workplaneShapes";

/**
 * The pattern as a part of its own (Discussion #1347) leaves the editor as a bundle does: in a 3MF the body and the pattern
 * are two bodies, each in its colour, for a second filament; in an STL, which knows no colours, they are one body - the
 * textured body.
 */
const kernel = vi.hoisted(() => ({ runtime: null as Promise<unknown> | null }));
vi.mock("@/lib/editorMeshCore", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/editorMeshCore")>()),
  getManifoldRuntime: () => kernel.runtime,
}));
beforeAll(async () => {
  kernel.runtime = manifoldModule().then((runtime) => { runtime.setup(); rememberManifoldRuntime(runtime); return runtime; });
  await kernel.runtime;
});

const asset = toolbarShapeAssets.find((entry) => entry.kind === "box")!;
const box = canonicalizeShape({ ...makeShapeFromAsset(asset, { x: 0, z: 0 }), id: "box-1", name: "Box", color: "#d41721", width: 40, depth: 30, size: 40, height: 25 });
/** A closed body's volume, its faces as they are wound (a cut leaves slivers without volume that must not be turned over). */
const volumeOf = (mesh: { vertices: [number, number, number][]; faces: [number, number, number][] }) => soupVolume(mesh.faces.flatMap((face) => face.flatMap((index) => mesh.vertices[index])));
const soupVolume = (positions: ArrayLike<number>) => {
  let sum = 0;
  for (let i = 0; i < positions.length; i += 9) {
    const [ax, ay, az, bx, by, bz, cx, cy, cz] = Array.from({ length: 9 }, (_, k) => positions[i + k]);
    sum += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
  }
  return sum;
};

describe.each([
  ["raised knurling", { pattern: "knurl", direction: "outward", depth: 0.8, detail: "coarse" }],
  ["bricks cut in", { pattern: "bricks", direction: "inward", depth: 0.8, detail: "coarse" }],
])("a box with %s as a part of its own, exported", (_name, given) => {
  const settings = normalizeSurfaceTexture({ ...given, patternPart: true, patternColor: "#ffffff" });
  const bundle = surfaceTextureResultShape(box, null, textureSurfacePositions(surfaceTextureInput(box), settings), settings, [], "Box – Pattern")!;
  // What the two make together: raised, the textured box; cut in, the box as it was.
  const textured = given.direction === "outward" ? soupVolume(surfaceTexturePositions(applySurfaceTexture(surfaceTextureInput(box), given))) : soupVolume(surfaceTextureInput(box));

  it("goes into a 3MF as two bodies in their colours", async () => {
    const { visible } = visibleExportShapes([bundle]);
    expect(visible.map((part) => part.color)).toEqual(["#d41721", "#ffffff"]);
    const { solids, meshes, cut } = await exportBodiesWithLooseHoles(visible);
    const separated = await colorSeparatedExportMeshes(solids, meshes, cut);
    expect(separated.meshes).toHaveLength(2);
    const bodies = separated.meshes.map((mesh, index) => ({ ...mesh, name: solids[separated.quellen[index]].name, color: solids[separated.quellen[index]].color }));
    expect(bodies.map((body) => body.color)).toEqual(["#d41721", "#ffffff"]);
    // Together as much as the textured body: the two meet without a gap and hardly overlap.
    const together = bodies.reduce((sum, body) => sum + volumeOf(body), 0);
    expect(Math.abs(together - textured)).toBeLessThan(2e-4 * textured);
    const model = strFromU8(unzipSync(exportMeshesTo3mf(bodies))["3D/3dmodel.model"]);
    expect(model.match(/<object /g)).toHaveLength(2);
    expect(model).toContain("#D41721");
    expect(model).toContain("#FFFFFF");
  }, 60_000);

  it("goes into an STL as one body: the textured box, or the box as it was with its joints filled", async () => {
    const { visible } = visibleExportShapes([bundle]);
    const { solids, meshes, cut } = await exportBodiesWithLooseHoles(visible);
    const joined = await unionOverlappingExportMeshes(solids, meshes, cut);
    expect(joined.meshes).toHaveLength(1);
    expect(Math.abs(volumeOf(joined.meshes[0]) - textured)).toBeLessThan(2e-4 * textured);
  }, 60_000);
});
