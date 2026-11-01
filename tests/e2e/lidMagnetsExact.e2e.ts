import { beforeAll, describe, expect, it, vi } from "vitest";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { WorkplaneShape } from "@/types/layerling";

// Manifold loads its files relative to the page; in node they are the public folder.
(globalThis as unknown as { window: unknown }).window = { location: { href: pathToFileURL(resolve("apps/web/public") + "/").href } };

// The STEP export runs against the real OpenCascade kernel, loaded from node_modules (as in stepRoundTrip.e2e.ts).
vi.mock("@/lib/brepKernel", async () => {
  const brep = await import("brepjs");
  const { OcctKernel } = await import("occt-wasm");
  const wasm = join(dirname(fileURLToPath(import.meta.resolve("occt-wasm"))), "occt-wasm.wasm");
  let ready: Promise<typeof brep> | null = null;
  let raw: Awaited<ReturnType<typeof OcctKernel.init>> | null = null;
  return {
    occtKernel: () => raw,
    loadBrepWithOcct: () =>
      (ready ??= (async () => {
        const kernel = await OcctKernel.init({ wasm });
        raw = kernel;
        brep.registerKernel("occt-wasm", brep.OcctWasmAdapter.fromKernel(kernel));
        return brep;
      })()),
  };
});

let brep: typeof import("brepjs");
let lidForShapes: typeof import("@/lib/lidTool").lidForShapes;
let normalizeLidOptions: typeof import("@/lib/lidTool").normalizeLidOptions;
let groupedWithMagnets: typeof import("@/lib/lidTool").groupedWithMagnets;
let editorBooleans: typeof import("@/lib/editorBooleans");
let meshCore: typeof import("@/lib/editorMeshCore");
let exportShapesToStep: typeof import("@/lib/stepExport").exportShapesToStep;

beforeAll(async () => {
  brep = await import("brepjs");
  ({ lidForShapes, normalizeLidOptions, groupedWithMagnets } = await import("@/lib/lidTool"));
  editorBooleans = await import("@/lib/editorBooleans");
  meshCore = await import("@/lib/editorMeshCore");
  ({ exportShapesToStep } = await import("@/lib/stepExport"));
  const { loadBrepWithOcct } = await import("@/lib/brepKernel");
  await loadBrepWithOcct();
});

function box(id: string, overrides: Partial<WorkplaneShape>): WorkplaneShape {
  return { id, name: "Box", kind: "box", color: "#d41721", x: 0, z: 0, elevation: 0, size: 60, width: 60, depth: 40, height: 30, rotation: 0, ...overrides } as WorkplaneShape;
}

/**
 * A box 60 x 40 x 30 with 2 mm walls and floor, open at the top, turned by `rotation` degrees: a solid and a hole, as
 * one makes it in the editor before grouping.
 */
const openBox = (rotation: number) => [
  box("outer", { rotation, x: 5, z: -3 }),
  box("inner", { rotation, x: 5, z: -3, width: 56, depth: 36, elevation: 2, hole: true }),
];

describe("lid magnets: posts the CAD kernel takes exactly", () => {
  it("makes the posts of cylinders and boxes, within the body however it is turned, and the body exports to STEP", async () => {
    for (const rotation of [0, 30]) {
      const targets = openBox(rotation);
      const result = await lidForShapes(targets, normalizeLidOptions({ type: "plug", thickness: 2.8, magnets: true }));
      if (!result.lid) throw new Error(result.error);
      const { posts, pockets } = result.magnets!;
      expect(posts.map((post) => post.kind).sort()).toEqual(["box", "box", "box", "box", "cylinder", "cylinder", "cylinder", "cylinder"]);
      expect(posts.every((post) => !post.importedMesh)).toBe(true);
      expect(pockets).toHaveLength(4);

      const runtime = await meshCore.getManifoldRuntime();
      const created: import("@/lib/editorMeshCore").ManifoldSolid[] = [];
      try {
        const solid = (shape: WorkplaneShape) => editorBooleans.shapeToManifoldSolid(runtime, { ...shape, hole: false }, created)!;
        const outer = solid(targets[0]);
        const walls = outer.subtract(solid(targets[1]));
        const postSolid = runtime.Manifold.union(posts.map(solid));
        created.push(walls, postSolid);
        // Turned with the box, the posts stay inside it: a box turned the wrong way would stick out at the corners.
        const outside = postSolid.subtract(outer);
        created.push(outside);
        expect(outside.volume()).toBeLessThan(0.05);
        // Each pocket lies in material all round: walls and posts hold a cylinder 1 mm wider than the pocket.
        const held = runtime.Manifold.union(walls, postSolid);
        created.push(held);
        for (const pocket of pockets) {
          const around = solid({ ...pocket, width: pocket.width + 2, depth: pocket.depth + 2, height: pocket.height - 1.01 });
          const inside = held.intersect(around);
          created.push(inside);
          expect(inside.volume()).toBeCloseTo(around.volume(), 0);
        }

        // Grouped as the editor groups them (the box's own hole kept to the box, so it leaves the posts whole), the box
        // goes to STEP with nothing left out: the walls and every piece of the posts, each with the pockets cut out of
        // it (a mesh post would be skipped, the pockets then open).
        const grouped = await groupedWithMagnets(targets, result.magnets!, (shapes) => editorBooleans.buildGroupedShapeFromSelection(shapes, 250_000));
        expect(grouped.group).not.toBeNull();
        const { blob, exportedCount, skipped } = await exportShapesToStep([grouped.group!]);
        expect(skipped).toEqual([]);
        expect(exportedCount).toBe(1 + posts.length);
        const read = await brep.importSTEP(blob);
        if (!read.ok) throw new Error("STEP not read back");
        const measured = brep.measureVolume(read.value);
        if (!measured.ok) throw new Error("no volume");
        const drill = runtime.Manifold.union(pockets.map(solid));
        created.push(drill);
        const expected = [walls, ...posts.map(solid)].reduce((sum, part) => {
          const cut = part.subtract(drill);
          created.push(cut);
          return sum + cut.volume();
        }, 0);
        expect(Math.abs(measured.value - expected) / expected).toBeLessThan(0.005);
      } finally {
        Array.from(new Set(created)).forEach((value) => value.delete?.());
      }
    }
  }, 120_000);
});
