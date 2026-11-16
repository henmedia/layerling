import manifoldModule from "manifold-3d";
import { beforeAll, describe, expect, it } from "vitest";
import { buildGroupedShapeFromSelection, restoreGroupedChildren } from "@/lib/editorBooleans";
import { rememberManifoldRuntime } from "@/lib/manifoldHandle";
import { groupRoundHoles, withHoleDiameters } from "@/lib/groupHoles";
import { analyzeTriangleSoup } from "@/lib/svgImport";
import type { WorkplaneShape } from "@/types/layerling";

beforeAll(async () => {
  const kernel = await manifoldModule();
  kernel.setup();
  rememberManifoldRuntime(kernel);
});

function shape(id: string, kind: WorkplaneShape["kind"], extra: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return { id, name: kind, kind, color: "#888888", x: 0, z: 0, elevation: 0, size: 6, width: 6, depth: 6, height: 10, rotation: 0, ...extra } as WorkplaneShape;
}
const hole = (id: string, x: number, z: number, diameter = 3.3) => shape(id, "cylinder", { hole: true, sides: 64, x, z, elevation: -1, width: diameter, depth: diameter, size: diameter, height: 8 });

async function group(parts: WorkplaneShape[]) {
  const result = await buildGroupedShapeFromSelection(parts, 400_000);
  expect(result.group).toBeTruthy();
  return result.group!;
}
const rebuild = async (_original: WorkplaneShape, parts: WorkplaneShape[]) => (await buildGroupedShapeFromSelection(parts, 400_000)).group ?? null;
const volume = (shapeWithMesh: WorkplaneShape) => analyzeTriangleSoup(Array.from(shapeWithMesh.importedMesh!.positions)).volume;

describe("round holes of a group", () => {
  it("are found in a group inside the group, and all get a new diameter in their own places", async () => {
    const plate = shape("plate", "box", { width: 60, depth: 40, height: 4, size: 60 });
    const holes = await group([hole("a", -20, -10), hole("b", 20, -10), hole("c", -20, 10), hole("d", 20, 10)]);
    const mount = await group([plate, holes]);
    const found = groupRoundHoles(mount);
    expect(found).toHaveLength(4);
    found.forEach((h) => expect(h.diameter).toBeCloseTo(3.3, 3));

    const changed = await withHoleDiameters(mount, { all: 5 }, rebuild);
    expect(changed).toBeTruthy();
    const after = groupRoundHoles(changed!);
    expect(after).toHaveLength(4);
    after.forEach((h) => expect(h.diameter).toBeCloseTo(5, 3));
    // The plate lost more: four holes of 5 mm instead of 3.3 mm through its 4 mm.
    expect(volume(mount) - volume(changed!)).toBeCloseTo(4 * Math.PI * (2.5 ** 2 - 1.65 ** 2) * 4, 0);
    // Each hole kept its middle and its depth.
    const inner = restoreGroupedChildren(changed!).find((part) => part.groupedShapes?.length)!;
    const middles = restoreGroupedChildren(inner).map((part) => [Math.round(part.x), Math.round(part.z), part.height]);
    expect(middles).toEqual(expect.arrayContaining([[-20, -10, 8], [20, -10, 8], [-20, 10, 8], [20, 10, 8]]));
  });

  it("changes one hole alone", async () => {
    const plate = shape("plate", "box", { width: 60, depth: 40, height: 4, size: 60 });
    const mount = await group([plate, hole("a", -20, 0), hole("b", 20, 0)]);
    const [first, second] = groupRoundHoles(mount);
    const changed = await withHoleDiameters(mount, { one: { path: second.path, diameter: 6 } }, rebuild);
    const after = groupRoundHoles(changed!);
    expect(after[0].diameter).toBeCloseTo(first.diameter, 3);
    expect(after[1].diameter).toBeCloseTo(6, 3);
  });

  it("finds none in a group without round holes, and leaves a square hole as it is", async () => {
    const plate = shape("plate", "box", { width: 30, depth: 30, height: 4, size: 30 });
    const square = shape("sq", "box", { hole: true, width: 5, depth: 5, height: 8, elevation: -1 });
    const mount = await group([plate, square]);
    expect(groupRoundHoles(mount)).toHaveLength(0);
    expect(await withHoleDiameters(mount, { all: 3 }, rebuild)).toBe(mount);
  });
});
