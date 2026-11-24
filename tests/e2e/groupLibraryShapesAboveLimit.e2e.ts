import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import manifoldModule from "manifold-3d";
import type { WorkplaneShape } from "@/types/layerling";
import { buildGroupedShapeFromSelection } from "@/lib/editorBooleans";
import { positionsBoundaryEdges } from "@/lib/editorMeshCore";
import { rememberManifoldRuntime } from "@/lib/manifoldHandle";

/**
 * Discussion #1921: rings with a cylinder cut out of them had more triangles than the limit for imported meshes. The
 * group fell to the fallback cut without a word, its surface was full of gaps and the slicer filled the body.
 */
const kernel = vi.hoisted(() => ({ runtime: null as Promise<unknown> | null }));
vi.mock("@/lib/editorMeshCore", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/editorMeshCore")>()),
  getManifoldRuntime: () => kernel.runtime,
}));

let working: Promise<unknown>;
beforeAll(async () => {
  working = manifoldModule().then((runtime) => {
    runtime.setup();
    rememberManifoldRuntime(runtime);
    return runtime;
  });
  await working;
});
beforeEach(() => {
  kernel.runtime = working;
});

const base = { x: 0, z: 0, rotation: 0, rotationX: 0, rotationZ: 0, locked: false, hidden: false };
const ring = (id: string, elevation: number): WorkplaneShape =>
  ({ ...base, id, name: "Torus", kind: "torus", color: "#0098c7", elevation, size: 62, width: 62, depth: 62, height: 10.76, steps: 24, torusTubeRatio: 5 / 22, sides: 96 }) as WorkplaneShape;
const hole = { ...base, id: "hole", name: "Cylinder", kind: "cylinder", color: "#d97813", hole: true, elevation: -5, size: 58.5, width: 58.5, depth: 58.5, height: 40, sides: 96 } as WorkplaneShape;
const selection = () => [ring("a", 0), ring("b", 4.32), ring("c", 8.64), hole];

describe("a cut of library shapes above the triangle limit", () => {
  it("is made by the kernel and comes out closed", async () => {
    const result = await buildGroupedShapeFromSelection(selection(), 1000);
    expect(result.group?.id).toMatch(/^grouped-manifold-cut/);
    expect(positionsBoundaryEdges(result.group!.importedMesh!.positions)).toHaveLength(0);
    expect(result.mergeWarning).toBeUndefined();
  });

  it("says when the kernel cannot make it and the fallback leaves gaps", async () => {
    kernel.runtime = Promise.reject(new Error("no kernel"));
    kernel.runtime.catch(() => undefined);
    const result = await buildGroupedShapeFromSelection(selection(), 1000);
    expect(result.group?.id).toMatch(/^grouped-boolean/);
    expect(positionsBoundaryEdges(result.group!.importedMesh!.positions).length).toBeGreaterThan(0);
    expect(result.mergeWarning).toMatch(/open edges/);
  });

  it("keeps the limit for an imported mesh", async () => {
    const made = await buildGroupedShapeFromSelection(selection(), 1000);
    const imported = { ...made.group!, id: "imported", groupedShapes: undefined } as WorkplaneShape;
    const cut = await buildGroupedShapeFromSelection([imported, { ...hole, id: "hole-2", x: 30, width: 10, depth: 10, size: 10 }], 1000);
    expect(cut.group?.id ?? "").not.toMatch(/^grouped-manifold-cut/);
  });
});
