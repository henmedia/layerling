import { beforeAll, describe, expect, it, vi } from "vitest";
import manifoldModule, { type ManifoldToplevel } from "manifold-3d";
import type { WorkplaneShape } from "@/types/layerling";
import { buildGroupedShapeFromSelection, exportSolidVolume } from "@/lib/editorBooleans";
import { rememberManifoldRuntime } from "@/lib/manifoldHandle";

/**
 * A hole box raised a little above the bottom of a solid box leaves that little as a floor (#691). The hole used
 * to stick out 0.05 mm at both ends, so a floor up to 0.05 mm took the whole box away and a thicker one came out
 * 0.05 mm too thin.
 */
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

function box(id: string, hole: boolean, elevation: number, height: number, width = 20): WorkplaneShape {
  return {
    id,
    name: "Box",
    kind: "box",
    color: "#d41721",
    x: 0,
    z: 0,
    elevation,
    size: Math.max(width, 20),
    width,
    depth: 20,
    height,
    rotation: 0,
    hole,
  } as WorkplaneShape;
}

describe("a hole box raised above the bottom of a solid box", () => {
  it.each([0.01, 0.05, 0.06, 1])("leaves a floor of %s mm", async (floor) => {
    // Wider than the solid, like the hole in the report, and taller, so only the floor stays.
    const result = await buildGroupedShapeFromSelection([box("solid", false, 0, 20), box("hole", true, floor, 25, 40)], 100_000);
    expect(result.consumed).toBe(false);
    expect(result.group).not.toBeNull();
    const { volumeMm3 } = await exportSolidVolume([result.group!]);
    // The hole still reaches a thousandth further down, which is all the floor loses.
    expect(Math.abs(volumeMm3 - 20 * 20 * floor)).toBeLessThan(20 * 20 * 0.0015);
  });

  it("still takes the whole box away when the hole starts at its bottom", async () => {
    const result = await buildGroupedShapeFromSelection([box("solid", false, 0, 20), box("hole", true, 0, 20)], 100_000);
    expect(result.consumed).toBe(true);
    expect(result.group).toBeNull();
  });

  it("leaves no skin when the hole ends flush with the top", async () => {
    const result = await buildGroupedShapeFromSelection([box("solid", false, 0, 20), box("hole", true, 5, 15, 10)], 100_000);
    const { volumeMm3 } = await exportSolidVolume([result.group!]);
    // The hole is a thousandth wider all round, so a little more than its own volume goes.
    expect(Math.abs(volumeMm3 - (20 * 20 * 20 - 10 * 20 * 15))).toBeLessThan(1);
  });
});

/**
 * A hole that sits on a face inside the body, to take off a peg down to the plate it stands on, cut a thousandth into
 * that face as well: a ring of 0.001 mm stayed round the hole, drawn as a line on the plate (#1133).
 */
function heightsOf(positions: number[]) {
  const heights = new Set<number>();
  for (let index = 1; index < positions.length; index += 3) heights.add(Math.round(positions[index] * 1e5) / 1e5);
  return [...heights].sort((a, b) => a - b);
}

/** A plate of 20 x 20 x 2 with a round peg of 6 mm standing on it up to 16.5 mm, as one imported mesh like the STL of the report. */
async function plateWithPegPositions() {
  const runtime = (await kernel.runtime) as ManifoldToplevel;
  const { Manifold } = runtime;
  const plate = Manifold.cube([20, 2, 20]).translate([-10, 0, -10]);
  const peg = Manifold.cylinder(14.5, 3, 3, 48).rotate([-90, 0, 0]).translate([-3, 2, -6]);
  const mesh = plate.add(peg).getMesh();
  const positions: number[] = [];
  for (let triangle = 0; triangle < mesh.numTri; triangle += 1) {
    for (let corner = 0; corner < 3; corner += 1) {
      const vertex = mesh.triVerts[triangle * 3 + corner];
      positions.push(mesh.vertProperties[vertex * mesh.numProp], mesh.vertProperties[vertex * mesh.numProp + 1], mesh.vertProperties[vertex * mesh.numProp + 2]);
    }
  }
  return positions;
}

describe("a hole resting on the top of a plate", () => {
  it("takes the peg off without a step in the plate", async () => {
    const plate = box("plate", false, 0, 2);
    const peg = { ...box("peg", false, 2, 10, 6), depth: 6, size: 6 } as WorkplaneShape;
    const hole = { ...box("hole", true, 2, 20, 10), depth: 10, size: 10 } as WorkplaneShape;
    const result = await buildGroupedShapeFromSelection([plate, peg, hole], 100_000);
    expect(result.group).not.toBeNull();
    expect(heightsOf(result.group!.importedMesh!.positions)).toEqual([0, 2]);
  });

  it("takes the peg of an imported part off without a step in the plate", async () => {
    const part = {
      id: "part", name: "question", kind: "mesh", color: "#0098c7", x: 0, z: 0, elevation: 0, rotation: 0,
      width: 20, depth: 20, height: 16.5, size: 20,
      importedMesh: { positions: await plateWithPegPositions(), baseWidth: 20, baseDepth: 20, baseHeight: 16.5 },
    } as WorkplaneShape;
    const hole = { id: "hole", name: "Cylinder", kind: "cylinder", color: "#d97813", x: -3, z: -6, elevation: 2, rotation: 0, width: 10.3, depth: 10.3, height: 20, size: 10.3, hole: true } as WorkplaneShape;
    const result = await buildGroupedShapeFromSelection([part, hole], 100_000);
    expect(result.group).not.toBeNull();
    expect(heightsOf(result.group!.importedMesh!.positions)).toEqual([0, 2]);
  });
});
