import { beforeAll, describe, expect, it, vi } from "vitest";
import manifoldModule from "manifold-3d";
import type { WorkplaneShape } from "@/types/layerling";
import { buildGroupedShapeFromSelection, buildHullShapeFromSelection, canHullShapes, restoreGroupedChildren } from "@/lib/editorBooleans";
import { closedMeshVolume } from "@/lib/cadProfileExtrusion";
import { groupShowsPartColors } from "@/lib/groupColors";
import { rememberManifoldRuntime } from "@/lib/manifoldHandle";

/** #863: the convex hull of the selected shapes, kept as a group that opens again. */
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

const box = (id: string, x: number, overrides: Partial<WorkplaneShape> = {}): WorkplaneShape => ({
  id, name: "Box", kind: "box", color: "#e64b3c", x, z: 0, elevation: 0, rotation: 0,
  width: 10, depth: 10, height: 10, size: 10, ...overrides,
});

function volumeOf(shape: WorkplaneShape) {
  const positions = shape.importedMesh!.positions;
  const vertices: [number, number, number][] = [];
  const faces: [number, number, number][] = [];
  for (let i = 0; i + 8 < positions.length; i += 9) {
    const at = vertices.length;
    vertices.push([positions[i], positions[i + 1], positions[i + 2]], [positions[i + 3], positions[i + 4], positions[i + 5]], [positions[i + 6], positions[i + 7], positions[i + 8]]);
    faces.push([at, at + 1, at + 2]);
  }
  return Math.abs(closedMeshVolume(vertices, faces));
}

describe("Hull (#863)", () => {
  it("wraps two boxes with a gap into one box that spans both, and keeps them as its parts", async () => {
    const { group } = await buildHullShapeFromSelection([box("a", -15), box("b", 15)], 200_000);
    expect(group).not.toBeNull();
    expect(group!.width).toBeCloseTo(40, 3);
    expect(group!.depth).toBeCloseTo(10, 3);
    expect(group!.height).toBeCloseTo(10, 3);
    // The gap is filled: a 40 x 10 x 10 block, not two cubes of 1000 mm³.
    expect(volumeOf(group!)).toBeCloseTo(4000, 0);
    expect(group!.groupedShapes).toHaveLength(2);
    const parts = restoreGroupedChildren(group!);
    expect(parts.map((part) => Math.round(part.x))).toEqual([-15, 15]);
  });

  it("cuts a hole in the selection out of the hull afterwards", async () => {
    const hole = box("h", 0, { hole: true, width: 4, depth: 4, height: 30, elevation: -10 });
    const { group } = await buildHullShapeFromSelection([box("a", -15), box("b", 15), hole], 200_000);
    expect(volumeOf(group!)).toBeCloseTo(4000 - 4 * 4 * 10, 0);
  });

  it("needs two shapes", () => {
    expect(canHullShapes([box("a", 0)])).toBe(false);
    expect(canHullShapes([box("a", 0, { hole: true })])).toBe(false);
    expect(canHullShapes([box("a", 0), box("b", 20, { hole: true })])).toBe(true);
    // Holes only make a hole (#1055).
    expect(canHullShapes([box("a", 0, { hole: true }), box("b", 20, { hole: true })])).toBe(true);
  });

  it("wraps holes only into a hole: two cylinder holes cut a slot (#1055)", async () => {
    const pin = (id: string, x: number): WorkplaneShape => ({ ...box(id, x), kind: "cylinder", hole: true, sides: 64, elevation: -1, height: 12 });
    const { group } = await buildHullShapeFromSelection([pin("a", -10), pin("b", 10)], 200_000);
    expect(group).not.toBeNull();
    expect(group!.hole).toBe(true);
    expect(group!.width).toBeCloseTo(30, 1);
    expect(group!.depth).toBeCloseTo(10, 1);
    // A slot 20 mm between centres, 10 mm wide, 12 high: the rectangle between the circles and one circle.
    const slot = (20 * 10 + Math.PI * 25) * 12;
    expect(volumeOf(group!)).toBeCloseTo(slot, -1);
    // Grouped with a plate, it cuts the slot out of it.
    const plate = box("p", 0, { width: 50, depth: 30, height: 10 });
    const cut = await buildGroupedShapeFromSelection([plate, { ...group!, groupOperation: "hull" as const }], 200_000);
    expect(cut.group).not.toBeNull();
    expect(volumeOf(cut.group!)).toBeCloseTo(50 * 30 * 10 - (20 * 10 + Math.PI * 25) * 10, -1);
  });

  it("stays one body in one colour inside another group with a hole", async () => {
    const { group } = await buildHullShapeFromSelection([box("a", -15), box("b", 15, { color: "#2f6fdf" })], 200_000);
    const hull = { ...group!, groupOperation: "hull" as const };
    expect(groupShowsPartColors(hull)).toBe(false);
    // Grouped with a box hole in the gap: the hole cuts the hull, it is not cut out of the two loose boxes.
    const hole = box("h", 0, { hole: true, width: 4, depth: 4, height: 30, elevation: -10 });
    const result = await buildGroupedShapeFromSelection([hull, hole], 200_000);
    expect(result.group).not.toBeNull();
    expect(volumeOf(result.group!)).toBeCloseTo(4000 - 4 * 4 * 10, 0);
  });
});
