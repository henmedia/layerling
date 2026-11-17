import manifoldModule from "manifold-3d";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { buildGroupedShapeFromSelection, groupedShape } from "@/lib/editorBooleans";
import { rememberManifoldRuntime } from "@/lib/manifoldHandle";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * Issue #1528: a bundle with a hole in it cuts what it is grouped with. When the hole sat in a bundle inside that bundle
 * (a peg in its hole, bundled, and bundled again with a collar), grouping it with a body made a plain group that cut
 * nothing; the same group cut when another bundle with its hole on top was in it too.
 */

// The bundle cut loads its kernel from the page; here it is the one of the tests.
const kernel = vi.hoisted(() => ({ runtime: null as Promise<unknown> | null }));
vi.mock("@/lib/editorMeshCore", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/editorMeshCore")>()),
  getManifoldRuntime: () => kernel.runtime,
}));

beforeAll(async () => {
  const runtime = await manifoldModule();
  runtime.setup();
  rememberManifoldRuntime(runtime);
  kernel.runtime = Promise.resolve(runtime);
});

function part(id: string, extra: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return {
    id, name: id, kind: "box", color: "#ff0000", x: 0, z: 0, elevation: 0, size: 10, width: 10, depth: 10, height: 10, rotation: 0,
    ...extra,
  } as unknown as WorkplaneShape;
}

function bundle(id: string, parts: WorkplaneShape[]): WorkplaneShape {
  return { ...groupedShape(parts)!, id, name: id, groupOperation: "bundle" } as WorkplaneShape;
}

function volume(mesh: NonNullable<WorkplaneShape["importedMesh"]>) {
  const p = mesh.positions;
  const indices = mesh.indices ?? Array.from({ length: p.length / 3 }, (_, index) => index);
  let total = 0;
  for (let offset = 0; offset + 2 < indices.length; offset += 3) {
    const [a, b, c] = [indices[offset], indices[offset + 1], indices[offset + 2]].map((index) => [p[index * 3], p[index * 3 + 1], p[index * 3 + 2]]);
    total += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
  }
  return Math.abs(total);
}

describe("a hole in a bundle inside a bundle cuts what it is grouped with (#1528)", () => {
  it("cuts the body as the hole one level up does", async () => {
    // A 20 mm block; a 6 mm hole 10 mm deep from its top, a 6 mm peg 4 mm tall standing in the hole's bottom.
    const block = part("block", { width: 20, depth: 20, size: 20, height: 20 });
    const hole = part("hole", { width: 6, depth: 6, size: 6, height: 10, elevation: 10, hole: true });
    const peg = part("peg", { width: 6, depth: 6, size: 6, height: 4, elevation: 10 });
    const collar = part("collar", { x: 30, width: 4, depth: 4, size: 4, height: 4 });
    const inner = bundle("inner", [hole, peg]);
    const outer = bundle("outer", [collar, inner]);
    const result = await buildGroupedShapeFromSelection([block, outer], 200_000);
    expect(result.group?.importedMesh).toBeTruthy();
    // Block 8000, collar 64, less the hole above the peg: 6 x 6 x 6 = 216.
    expect(volume(result.group!.importedMesh!)).toBeCloseTo(8000 + 64 - 216, 0);
  });
});
