import manifoldModule, { type ManifoldToplevel } from "manifold-3d";
import { beforeAll, describe, expect, it } from "vitest";
import { latchBox, latchMesh, latchPlan } from "@/lib/latchShape";
import { lidLatchMeasures } from "@/lib/lidLatch";
import { meshForShape } from "@/lib/editorMeshCore";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { SHAPE_LIBRARY_SECTIONS } from "@/lib/shapeLibrarySections";
import { exportLylProject, importLylProject } from "@/lib/lylProject";
import { editorHistoryEntry } from "@/lib/editorHistory";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";
import { guideSectionForShape } from "@/lib/guideLinks";
import type { IndexedMesh } from "@/lib/enclosureMesh";
import type { WorkplaneShape } from "@/types/layerling";

let runtime: ManifoldToplevel;

beforeAll(async () => {
  runtime = await manifoldModule();
  runtime.setup();
});

function extent(mesh: IndexedMesh) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < mesh.positions.length; i += 3) for (let k = 0; k < 3; k += 1) {
    min[k] = Math.min(min[k], mesh.positions[i + k]);
    max[k] = Math.max(max[k], mesh.positions[i + k]);
  }
  return { min, max };
}

/** The mesh as the kernel takes it, its overlapping pieces fused, split into its separate bodies. */
function bodies(mesh: IndexedMesh) {
  mesh.orient();
  const solid = runtime.Manifold.ofMesh(new runtime.Mesh({ numProp: 3, vertProperties: new Float32Array(mesh.positions), triVerts: new Uint32Array(mesh.indices) }));
  expect(solid.status()).toBe("NoError");
  // Each prism on its own is closed; fused, the pins and their cheeks become one body each.
  const fused = runtime.Manifold.union(solid.decompose());
  return fused.decompose();
}

describe("the latch shape (Discussion #2063)", () => {
  it("is the lid tool's latch: the same clip width, grip and pin", () => {
    const plan = latchPlan({ latchWidth: 12, latchGrip: 0.3 });
    const lid = lidLatchMeasures(12, 0.3);
    expect(plan.measures.pin).toBe(lid.pin);
    expect(plan.measures.opening).toBe(lid.opening);
    expect(plan.measures.lidOpening).toBe(lid.lidOpening);
    // Without a spacing of its own the pins are as far apart as on a lid made by the lid tool.
    expect(plan.measures.spacing).toBe(lid.spacing);
    expect(plan.width).toBeCloseTo(lid.span, 9);
  });

  it("shows two pins and the clip closed over them as three separate bodies, filling its box", () => {
    const { mesh, plan } = latchMesh({});
    const box = extent(mesh);
    expect(box.max[0] - box.min[0]).toBeCloseTo(plan.width, 6);
    expect(box.max[1] - box.min[1]).toBeCloseTo(plan.height, 6);
    expect(box.max[2] - box.min[2]).toBeCloseTo(plan.depth, 6);
    expect(box.min[1]).toBeCloseTo(0, 6);
    expect(box.min[2]).toBeCloseTo(-plan.depth / 2, 6);
    expect(bodies(mesh)).toHaveLength(3);
  });

  it("leaves the clip out for the pins, and lays the clip alone on its side", () => {
    expect(bodies(latchMesh({ latchPart: "pins" }).mesh)).toHaveLength(2);
    const { mesh, plan } = latchMesh({ latchPart: "clip", latchWidth: 16 });
    expect(bodies(mesh)).toHaveLength(1);
    const box = extent(mesh);
    // Its width along the wall is now its height on the bed.
    expect(box.max[1] - box.min[1]).toBeCloseTo(16, 6);
    expect(box.max[0] - box.min[0]).toBeCloseTo(plan.width, 6);
    expect(box.max[2] - box.min[2]).toBeCloseTo(plan.depth, 6);
  });

  it("keeps its pins apart by at least the clip's two sockets, and longer when asked", () => {
    const short = latchPlan({ latchSpacing: 1 });
    expect(short.measures.spacing).toBe(short.minSpacing);
    const long = latchPlan({ latchSpacing: 20 });
    expect(long.lidPin - long.bodyPin).toBe(20);
    expect(latchBox({ latchSpacing: 20 }).height - latchBox({}).height).toBeCloseTo(20 - short.minSpacing, 9);
  });

  it("comes out of the library in the enclosure section, closed as the editor builds it, and links to its guide section", () => {
    expect(SHAPE_LIBRARY_SECTIONS.find((section) => section.id === "enclosure")?.shapes).toContain("latch");
    const shape = makeShapeFromAsset(toolbarShapeAssets.find((entry) => entry.kind === "latch")!, { x: 0, z: 0 });
    expect(shape).toMatchObject({ kind: "latch", latchPart: "both", latchWidth: 12, latchGrip: 0.3 });
    expect(shape.height).toBeCloseTo(latchBox({}).height, 9);
    const mesh = meshForShape(shape);
    expect(mesh.faces.length).toBeGreaterThan(100);
    expect(guideSectionForShape(shape)).toBe("latch");
  });

  it("keeps its settings in a .lyl file and refuses a part it does not know", async () => {
    const shape: WorkplaneShape = { ...makeShapeFromAsset(toolbarShapeAssets.find((entry) => entry.kind === "latch")!, { x: 0, z: 0 }), id: "latch-1", latchPart: "pins", latchWidth: 16, latchGrip: 0.4, latchSpacing: 14 };
    const save = (shapes: WorkplaneShape[]) => exportLylProject({
      projectId: "latch", projectName: "Latch", createdAt: 1_700_000_000_000, modifiedAt: 1_700_000_100_000,
      shapes, history: [editorHistoryEntry(shapes, [])], historyIndex: 0, assets: [],
      workspace: DEFAULT_WORKPLANE_WORKSPACE, snapGrid: DEFAULT_SNAP_GRID, placementElevation: 0,
    });
    const restored = (await importLylProject(await save([shape]))).shapes.find((entry) => entry.id === "latch-1");
    expect(restored).toMatchObject({ latchPart: "pins", latchWidth: 16, latchGrip: 0.4, latchSpacing: 14 });
    const broken = await save([{ ...shape, latchPart: "bolt" } as unknown as WorkplaneShape]);
    await expect(importLylProject(broken)).rejects.toThrow(/latchPart/);
  });
});
