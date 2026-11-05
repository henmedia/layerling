import { beforeAll, describe, expect, it, vi } from "vitest";
import manifoldModule, { type ManifoldToplevel } from "manifold-3d";
import type { WorkplaneShape } from "@/types/layerling";
import { buildGroupedShapeFromSelection } from "@/lib/editorBooleans";
import { rememberManifoldRuntime } from "@/lib/manifoldHandle";

/**
 * #1334: a box is built by the kernel from its own numbers, a mesh from 32-bit ones. A face at -58.45, which 32 bits
 * cannot hold, then lay a millionth of a millimetre apart in the two, and a mesh hole through the box left that gap
 * standing as a skin of no thickness where it should have opened.
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

/** An L of 20 x 14 mm, 2.5 mm thick, as a triangle soup round its middle: not convex, so the cut takes it as it is. */
function lPositions() {
  const foot = runtime.Manifold.cube([20, 7, 2.5]).translate([-10, 0, -1.25]);
  const post = runtime.Manifold.cube([10, 7, 2.5]).translate([-10, 7, -1.25]);
  const mesh = runtime.Manifold.union([foot, post]).getMesh();
  const positions: number[] = [];
  for (let triangle = 0; triangle < mesh.numTri; triangle += 1) {
    for (let corner = 0; corner < 3; corner += 1) {
      const vertex = mesh.triVerts[triangle * 3 + corner];
      positions.push(mesh.vertProperties[vertex * mesh.numProp], mesh.vertProperties[vertex * mesh.numProp + 1], mesh.vertProperties[vertex * mesh.numProp + 2]);
    }
  }
  return positions;
}

function area(positions: ArrayLike<number>) {
  let total = 0;
  for (let i = 0; i + 8 < positions.length; i += 9) {
    const u = [positions[i + 3] - positions[i], positions[i + 4] - positions[i + 1], positions[i + 5] - positions[i + 2]];
    const v = [positions[i + 6] - positions[i], positions[i + 7] - positions[i + 1], positions[i + 8] - positions[i + 2]];
    total += Math.hypot(u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]) / 2;
  }
  return total;
}

describe("a mesh hole through a box whose face 32 bits cannot hold (#1334)", () => {
  it("opens the box cleanly, without a skin of no thickness", async () => {
    // A 30 x 30 plate standing 2.5 mm thick from z -60.95 to -58.45, as in the reporter's display frame.
    const plate: WorkplaneShape = {
      id: "plate", name: "Box", kind: "box", color: "#d41721", x: -218, z: -59.7, elevation: 0, rotation: 0,
      width: 30, depth: 2.5, height: 30, size: 30,
    };
    const hole: WorkplaneShape = {
      id: "hole", name: "L", kind: "mesh", color: "#999999", x: -218, z: -59.7, elevation: 8, rotation: 0,
      width: 20, depth: 2.5, height: 14, size: 20, hole: true,
      importedMesh: { positions: lPositions(), baseWidth: 20, baseDepth: 2.5, baseHeight: 14 },
    };
    const result = await buildGroupedShapeFromSelection([plate, hole], 200_000);
    expect(result.group).not.toBeNull();
    // Both faces of the plate less the L twice (2 x 900 + 4 x 75 - 2 x 210), and the L's walls (68 x 2.5).
    // The skin added the L twice more, 420 mm².
    expect(area(result.group!.importedMesh!.positions)).toBeCloseTo(1850, 0);
  });
});
