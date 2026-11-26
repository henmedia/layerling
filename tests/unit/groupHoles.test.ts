import manifoldModule from "manifold-3d";
import { beforeAll, describe, expect, it } from "vitest";
import { buildGroupedShapeFromSelection, restoreGroupedChildren } from "@/lib/editorBooleans";
import { rememberManifoldRuntime } from "@/lib/manifoldHandle";
import { groupRoundHoles, holeCircles, withHoleDiameters } from "@/lib/groupHoles";
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

describe("a circle of holes (Discussion #2102)", () => {
  // Six 4.3 mm holes on a 30 mm circle round (5, -3), as Pattern's circle lays them, and a 10 mm hole in the middle.
  const boltHoles = (diameter = 30, count = 6, total = 360) => Array.from({ length: count }, (_, index) => {
    const angle = ((total === 360 ? total / count : total / (count - 1)) * index * Math.PI) / 180;
    return hole(`b${index}`, 5 + (diameter / 2) * Math.cos(angle), -3 + (diameter / 2) * Math.sin(angle), 4.3);
  });
  const flange = async () => group([shape("plate", "cylinder", { width: 60, depth: 60, size: 60, height: 4, x: 5, z: -3 }), hole("middle", 5, -3, 10), ...boltHoles()]);

  it("is found among the group's holes: its holes, its diameter, and how small it may get", async () => {
    const circles = holeCircles(groupRoundHoles(await flange()));
    expect(circles).toHaveLength(1);
    expect(circles[0].paths).toHaveLength(6);
    expect(circles[0].holeDiameter).toBeCloseTo(4.3, 3);
    expect(circles[0].diameter).toBeCloseTo(30, 3);
    expect(circles[0].centre[0]).toBeCloseTo(5, 3);
    expect(circles[0].centre[2]).toBeCloseTo(-3, 3);
    // Neighbours 60° apart touch when the circle is 4.3 / sin(30°) = 8.6 mm across.
    expect(circles[0].minDiameter).toBeCloseTo(8.6, 2);
  });

  it("gets a new diameter: the holes move out from its middle, keep their size, and the middle hole stays", async () => {
    const before = await flange();
    const [circle] = holeCircles(groupRoundHoles(before));
    const changed = await withHoleDiameters(before, { circle: { paths: circle.paths, centre: circle.centre, from: circle.diameter, to: 40 } }, rebuild);
    expect(changed).toBeTruthy();
    const holes = groupRoundHoles(changed!);
    const onCircle = holes.filter((h) => Math.abs(h.diameter - 4.3) < 1e-3);
    expect(onCircle).toHaveLength(6);
    onCircle.forEach((h) => expect(Math.hypot(h.middle[0] - 5, h.middle[2] + 3)).toBeCloseTo(20, 3));
    const middle = holes.find((h) => Math.abs(h.diameter - 10) < 1e-3)!;
    expect(middle.middle[0]).toBeCloseTo(5, 3);
    expect(middle.middle[2]).toBeCloseTo(-3, 3);
    const [after] = holeCircles(holes);
    expect(after.diameter).toBeCloseTo(40, 3);
    // The plate lost as much as before: the holes only moved, still inside it.
    expect(volume(changed!)).toBeCloseTo(volume(before), 0);
  });

  it("is found in a group inside the group, and on an arc", async () => {
    const pattern = await group(boltHoles(24, 4, 180));
    const part = await group([shape("plate", "box", { width: 60, depth: 60, size: 60, height: 4, x: 5, z: -3 }), pattern]);
    const circles = holeCircles(groupRoundHoles(part));
    expect(circles).toHaveLength(1);
    expect(circles[0].diameter).toBeCloseTo(24, 3);
    const changed = await withHoleDiameters(part, { circle: { paths: circles[0].paths, centre: circles[0].centre, from: 24, to: 36 } }, rebuild);
    expect(holeCircles(groupRoundHoles(changed!))[0].diameter).toBeCloseTo(36, 3);
  });

  it("is not made of the corners of a rectangle, nor of holes of different sizes", async () => {
    const corners = await group([shape("plate", "box", { width: 60, depth: 40, height: 4, size: 60 }), hole("a", -20, -10), hole("b", 20, -10), hole("c", -20, 10), hole("d", 20, 10)]);
    expect(holeCircles(groupRoundHoles(corners))).toEqual([]);
    const mixed = await group([shape("plate", "box", { width: 60, depth: 60, height: 4, size: 60 }), hole("a", 10, 0, 3), hole("b", -5, 8.66, 4), hole("c", -5, -8.66, 5)]);
    expect(holeCircles(groupRoundHoles(mixed))).toEqual([]);
  });
});
