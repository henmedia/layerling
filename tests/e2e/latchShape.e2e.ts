import { beforeAll, describe, expect, it, vi } from "vitest";
import manifoldModule, { type ManifoldToplevel } from "manifold-3d";
import type { WorkplaneShape } from "@/types/layerling";
import { buildGroupedShapeFromSelection } from "@/lib/editorBooleans";
import { rememberManifoldRuntime } from "@/lib/manifoldHandle";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { latchBox, latchPlan } from "@/lib/latchShape";

/**
 * The latch as a shape of its own (Discussion #2063), grouped by the real kernel: its pins fuse with the box's wall they
 * stand on, and with the clip shown closed over them the clip stays a body of its own, so Separate Parts can take it off.
 */
const kernel = vi.hoisted(() => ({ runtime: null as Promise<unknown> | null }));
vi.mock("@/lib/editorMeshCore", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/editorMeshCore")>()),
  getManifoldRuntime: () => kernel.runtime,
}));

let runtime: ManifoldToplevel;
beforeAll(async () => {
  kernel.runtime = manifoldModule().then((loaded) => {
    loaded.setup();
    rememberManifoldRuntime(loaded);
    return loaded;
  });
  runtime = (await kernel.runtime) as ManifoldToplevel;
});

/** How many separate bodies a grouped shape's triangles make, its corners welded. */
function bodyCount(positions: ArrayLike<number>) {
  const mesh = new runtime.Mesh({ numProp: 3, vertProperties: Float32Array.from(positions), triVerts: Uint32Array.from({ length: positions.length / 3 }, (_, index) => index), tolerance: 0.0001 });
  mesh.merge();
  return runtime.Manifold.ofMesh(mesh).decompose().length;
}

function grouped(latch: WorkplaneShape) {
  // A 60 mm wide, 40 mm high box wall whose front face is at z = 0; the latch stands on it, its back on the wall.
  const wall: WorkplaneShape = { id: "wall", name: "Box", kind: "box", color: "#d41721", x: 0, z: -5, elevation: 0, rotation: 0, width: 60, depth: 10, height: 40, size: 60 };
  const depth = latch.depth ?? latch.width;
  // A small hole through the wall away from the latch, so the group is built by the kernel rather than only laid together.
  const hole: WorkplaneShape = { id: "hole", name: "Hole", kind: "box", color: "#999999", x: 25, z: -5, elevation: 30, rotation: 0, width: 4, depth: 12, height: 4, size: 4, hole: true };
  return buildGroupedShapeFromSelection([wall, hole, { ...latch, x: 0, z: depth / 2 - 0.2, elevation: 10 }], 400_000);
}

function latchShape(changes: Partial<WorkplaneShape>): WorkplaneShape {
  const shape = makeShapeFromAsset(toolbarShapeAssets.find((entry) => entry.kind === "latch")!, { x: 0, z: 0 });
  return { ...shape, ...changes, ...latchBox({ ...shape, ...changes }), id: "latch" };
}

describe("the latch shape grouped with a box (Discussion #2063)", () => {
  it("fuses its pins with the wall", async () => {
    const result = await grouped(latchShape({ latchPart: "pins" }));
    expect(result.group).not.toBeNull();
    // One body: the wall with both pins and their cheeks.
    expect(bodyCount(result.group!.importedMesh!.positions)).toBe(1);
  });

  it("keeps the clip closed over the pins a body of its own", async () => {
    const result = await grouped(latchShape({ latchPart: "both", latchWidth: 16 }));
    expect(result.group).not.toBeNull();
    expect(bodyCount(result.group!.importedMesh!.positions)).toBe(2);
    expect(latchPlan({ latchWidth: 16 }).measures.width).toBe(16);
  });
});
