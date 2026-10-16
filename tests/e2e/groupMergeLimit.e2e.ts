import { beforeAll, describe, expect, it, vi } from "vitest";
import manifoldModule from "manifold-3d";
import type { WorkplaneShape } from "@/types/layerling";
import { buildGroupedShapeFromSelection } from "@/lib/editorBooleans";
import { rememberManifoldRuntime } from "@/lib/manifoldHandle";

/**
 * Grouping imported solids merges them into one closed body. Above the triangle limit the kernel is
 * skipped and the meshes are only laid together, which an export keeps as overlapping parts that
 * slicers report as non-manifold edges: the group has to say so instead of looking merged.
 */
// The editor loads the 2D/3D kernel from the page's own address; here it comes from the package.
const kernel = vi.hoisted(() => ({ runtime: null as Promise<unknown> | null }));
vi.mock("@/lib/editorMeshCore", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/editorMeshCore")>()),
  getManifoldRuntime: () => kernel.runtime,
}));

beforeAll(async () => {
  kernel.runtime = manifoldModule().then((runtime) => {
    runtime.setup();
    rememberManifoldRuntime(runtime);
    return runtime;
  });
  await kernel.runtime;
});

/** A cube of 10 mm as 12 triangles, counter-clockwise seen from outside, its corner at `offset`. */
function cube(offset: number): number[][][] {
  const v = (x: number, y: number, z: number) => [x * 10 + offset, y * 10, z * 10 + offset];
  const quad = (a: number[], b: number[], c: number[], d: number[]) => [[a, b, c], [a, c, d]];
  return [
    ...quad(v(0, 0, 0), v(0, 0, 1), v(1, 0, 1), v(1, 0, 0)),
    ...quad(v(1, 0, 0), v(1, 0, 1), v(1, 1, 1), v(1, 1, 0)),
    ...quad(v(1, 1, 0), v(1, 1, 1), v(0, 1, 1), v(0, 1, 0)),
    ...quad(v(0, 1, 0), v(0, 1, 1), v(0, 0, 1), v(0, 0, 0)),
    ...quad(v(0, 0, 1), v(0, 1, 1), v(1, 1, 1), v(1, 0, 1)),
    ...quad(v(0, 0, 0), v(1, 0, 0), v(1, 1, 0), v(0, 1, 0)),
  ];
}

function meshShape(id: string, offset: number): WorkplaneShape {
  const triangles = cube(offset);
  return {
    id,
    name: "Part",
    kind: "mesh",
    color: "#0098c7",
    x: 5 + offset,
    z: 5 + offset,
    elevation: 0,
    size: 10,
    width: 10,
    depth: 10,
    height: 10,
    rotation: 0,
    importedMesh: { positions: triangles.flat(2), baseWidth: 10, baseDepth: 10, baseHeight: 10, triangleCount: triangles.length, sourceFormat: "stl" },
  } as unknown as WorkplaneShape;
}

describe("grouping imported solids and the triangle limit", () => {
  // Two cubes of 12 triangles each that overlap by half their width and depth.
  const parts = () => [meshShape("a", 0), meshShape("b", 5)];

  it("merges them into one solid below the limit, without a warning", async () => {
    const result = await buildGroupedShapeFromSelection(parts(), 10_000);
    expect(result.group?.id).toMatch(/^grouped-manifold-union/);
    expect(result.mergeWarning).toBeUndefined();
  });

  it("lays them together above the limit and says so, with the count and the limit", async () => {
    const result = await buildGroupedShapeFromSelection(parts(), 20);
    expect(result.group?.id).toMatch(/^grouped-mesh/);
    expect(result.group?.importedMesh?.triangleCount).toBe(24);
    expect(result.mergeWarning).toContain("24");
    expect(result.mergeWarning).toContain("20");
  });
});
