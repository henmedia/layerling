import { beforeAll, describe, expect, it, vi } from "vitest";
import manifoldModule from "manifold-3d";
import type { WorkplaneShape } from "@/types/layerling";
import { buildGroupedShapeFromSelection } from "@/lib/editorBooleans";
import { rememberManifoldRuntime } from "@/lib/manifoldHandle";

/**
 * Grouping plain solids merges them into one solid body (as a group does in Tinkercad), so no seams
 * show where they overlap. Parts in several colours keep their colours on the merged surface.
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

function box(id: string, x: number, z: number, color = "#ff0000", extra: object = {}, kind = "box"): WorkplaneShape {
  return { id, name: "Box", kind, color, x, z, elevation: 0, size: 10, width: 10, depth: 10, height: 10, rotation: 0, ...extra } as unknown as WorkplaneShape;
}

describe("grouping plain solids", () => {
  it("merges overlapping solids of one colour into one mesh and keeps the parts for ungrouping", async () => {
    const result = await buildGroupedShapeFromSelection([box("a", 0, 0), box("b", 5, 5)], 100_000);
    expect(result.group?.id).toMatch(/^grouped-manifold-union/);
    expect(result.group?.importedMesh).toBeTruthy();
    expect(result.group?.groupedShapes).toHaveLength(2);
  });

  it("merges solids of different colours too, in the colour of the part picked first and with Multicolor off", async () => {
    const result = await buildGroupedShapeFromSelection([box("a", 0, 0), box("b", 5, 5, "#0000ff")], 100_000);
    expect(result.group?.importedMesh).toBeTruthy();
    expect(result.group?.color).toBe("#ff0000");
    expect(result.group?.multicolor).toBeUndefined();
    expect(result.group?.groupedShapes?.map((part) => part.color)).toEqual(["#ff0000", "#0000ff"]);
    const other = await buildGroupedShapeFromSelection([box("b", 5, 5, "#0000ff"), box("a", 0, 0)], 100_000);
    expect(other.group?.color).toBe("#0000ff");
  });

  // The top of both boxes is one flat plane, 10 high: the part picked first has to own the part of it where they overlap.
  const topOwners = (group: WorkplaneShape) => {
    const mesh = group.importedMesh!;
    const owners = mesh.partOfTriangle!;
    expect(owners).toHaveLength(mesh.triangleCount);
    const found: Array<{ x: number; z: number; owner: number }> = [];
    for (let triangle = 0; triangle < mesh.triangleCount; triangle += 1) {
      const corners = [0, 1, 2].map((corner) => mesh.positions.slice(triangle * 9 + corner * 3, triangle * 9 + corner * 3 + 3));
      if (!corners.every((corner) => Math.abs(corner[1] - 10) < 1e-6)) continue;
      found.push({
        x: corners.reduce((sum, corner) => sum + corner[0], 0) / 3 + group.x,
        z: corners.reduce((sum, corner) => sum + corner[2], 0) / 3 + group.z,
        owner: owners[triangle],
      });
    }
    return found;
  };
  const inFirstBox = (point: { x: number; z: number }) => Math.abs(point.x) < 5 && Math.abs(point.z) < 5;
  const inSecondBox = (point: { x: number; z: number }) => Math.abs(point.x - 5) < 5 && Math.abs(point.z - 5) < 5;

  it("records which part owns every piece of the surface, the part picked first where two parts overlap", async () => {
    const result = await buildGroupedShapeFromSelection([box("a", 0, 0), box("b", 5, 5, "#0000ff")], 100_000);
    const top = topOwners(result.group!);
    expect(top.length).toBeGreaterThan(2);
    top.forEach((point) => {
      if (inFirstBox(point)) expect(point.owner).toBe(0);
      else expect(inSecondBox(point) && point.owner === 1).toBe(true);
    });
    expect(top.some((point) => point.owner === 1)).toBe(true);
  });

  it("gives the overlap to the other part when that one is picked first", async () => {
    const result = await buildGroupedShapeFromSelection([box("b", 5, 5, "#0000ff"), box("a", 0, 0)], 100_000);
    topOwners(result.group!).forEach((point) => {
      if (inSecondBox(point)) expect(point.owner).toBe(0);
      else expect(inFirstBox(point) && point.owner === 1).toBe(true);
    });
  });

  // A closed body: every edge is shared by exactly two triangles, and the volume is that of the union.
  const closedVolume = (group: WorkplaneShape) => {
    const positions = group.importedMesh!.positions;
    const key = (index: number) => [0, 1, 2].map((axis) => positions[index * 3 + axis].toFixed(4)).join(",");
    const edges = new Map<string, number>();
    let volume = 0;
    for (let triangle = 0; triangle < positions.length / 9; triangle += 1) {
      const [a, b, c] = [0, 1, 2].map((corner) => triangle * 3 + corner);
      [[a, b], [b, c], [c, a]].forEach(([from, to]) => {
        const edge = [key(from), key(to)].sort().join("|");
        edges.set(edge, (edges.get(edge) ?? 0) + 1);
      });
      const [pa, pb, pc] = [a, b, c].map((index) => positions.slice(index * 3, index * 3 + 3));
      volume += (pa[0] * (pb[1] * pc[2] - pb[2] * pc[1]) - pa[1] * (pb[0] * pc[2] - pb[2] * pc[0]) + pa[2] * (pb[0] * pc[1] - pb[1] * pc[0])) / 6;
    }
    return { volume, openOrDoubled: [...edges.values()].filter((count) => count !== 2).length };
  };

  it("leaves a closed body with no faces left inside where the parts meet", async () => {
    const result = await buildGroupedShapeFromSelection([box("a", 0, 0), box("b", 5, 5, "#0000ff"), box("c", 10, 0, "#00ff00")], 100_000);
    const { volume, openOrDoubled } = closedVolume(result.group!);
    expect(openOrDoubled).toBe(0);
    // 3 boxes of 1000, minus 250 where a meets b, 250 where b meets c, nothing where a and c touch only along an edge
    expect(Math.abs(volume)).toBeCloseTo(2500, 1);
  });

  it("merges overlapping round parts without losing triangle ownership", async () => {
    const result = await buildGroupedShapeFromSelection([
      box("a", 0, 0, "#f90", { transparent: true }, "cylinder"),
      box("b", 4, 0, "#09f", { transparent: true }, "cylinder"),
    ], 100_000);
    const mesh = result.group?.importedMesh;
    expect(mesh).toBeTruthy();
    expect(result.group?.transparent).toBe(true);
    expect(mesh?.partOfTriangle).toHaveLength(mesh?.triangleCount);
    expect(mesh?.partOfTriangle?.every((owner) => owner === 0 || owner === 1)).toBe(true);
    expect(mesh?.partOfTriangle?.some((owner) => owner === 0)).toBe(true);
    expect(mesh?.partOfTriangle?.some((owner) => owner === 1)).toBe(true);
  });

  // Round and square parts of one height share a flat top. Which part shows there follows the pick order, and the
  // part picked first keeps its own outline (a cylinder picked first keeps a round top), as in Tinkercad.
  const topPieces = (group: WorkplaneShape) => {
    const mesh = group.importedMesh!;
    const owners = mesh.partOfTriangle!;
    expect(owners).toHaveLength(mesh.triangleCount);
    const found: Array<{ x: number; z: number; owner: number }> = [];
    for (let triangle = 0; triangle < mesh.triangleCount; triangle += 1) {
      const corners = [0, 1, 2].map((corner) => mesh.positions.slice(triangle * 9 + corner * 3, triangle * 9 + corner * 3 + 3));
      if (!corners.every((corner) => Math.abs(corner[1] - 10) < 1e-3)) continue;
      found.push({
        x: corners.reduce((sum, corner) => sum + corner[0], 0) / 3 + group.x,
        z: corners.reduce((sum, corner) => sum + corner[2], 0) / 3 + group.z,
        owner: owners[triangle],
      });
    }
    return found;
  };
  // Clearly inside or clearly outside a part; the thin band along its outline is left out because the round part is a polygon.
  const covers = {
    cylinder: (centre: number) => (point: { x: number; z: number }) => {
      const distance = Math.hypot(point.x - centre, point.z);
      return distance < 4.8 ? true : distance > 5.2 ? false : null;
    },
    box: (centre: number) => (point: { x: number; z: number }) => {
      const inside = Math.min(5 - Math.abs(point.x - centre), 5 - Math.abs(point.z));
      return inside > 0.2 ? true : inside < -0.2 ? false : null;
    },
  };
  const expectFirstPickedOwns = (top: Array<{ x: number; z: number; owner: number }>, parts: Array<(point: { x: number; z: number }) => boolean | null>) => {
    let overlapChecked = 0;
    top.forEach((point) => {
      const covering = parts.map((part) => part(point));
      if (covering.includes(null)) return;
      const expected = covering.findIndex(Boolean);
      if (expected < 0) return;
      expect(point.owner).toBe(expected);
      if (covering.filter(Boolean).length > 1) overlapChecked += 1;
    });
    return overlapChecked;
  };

  it("keeps the round top of a cylinder picked before a cube of the same height", async () => {
    const result = await buildGroupedShapeFromSelection([box("cyl", 0, 0, "#f90", {}, "cylinder"), box("cube", 4, 0, "#f00")], 100_000);
    const overlapChecked = expectFirstPickedOwns(topPieces(result.group!), [covers.cylinder(0), covers.box(4)]);
    expect(overlapChecked).toBeGreaterThan(0);
  });

  it("keeps the square top of a cube picked before a cylinder of the same height", async () => {
    const result = await buildGroupedShapeFromSelection([box("cube", 4, 0, "#f00"), box("cyl", 0, 0, "#f90", {}, "cylinder")], 100_000);
    const overlapChecked = expectFirstPickedOwns(topPieces(result.group!), [covers.box(4), covers.cylinder(0)]);
    expect(overlapChecked).toBeGreaterThan(0);
  });

  it("gives every overlap to the part picked first among the parts that cover it, with three parts", async () => {
    const parts = [box("a", 0, 0, "#f90", {}, "cylinder"), box("b", 5, 0, "#f00"), box("c", 10, 0, "#09f", {}, "cylinder")];
    const result = await buildGroupedShapeFromSelection(parts, 100_000);
    const overlapChecked = expectFirstPickedOwns(topPieces(result.group!), [covers.cylinder(0), covers.box(5), covers.cylinder(10)]);
    expect(overlapChecked).toBeGreaterThan(0);
    const { openOrDoubled } = closedVolume(result.group!);
    expect(openOrDoubled).toBe(0);
  });

  it("keeps the merge closed where the split would leave stray strokes: two round parts of one height", async () => {
    const result = await buildGroupedShapeFromSelection([
      box("a", 0, 0, "#f90", {}, "cylinder"),
      box("b", 4, 0, "#09f", {}, "cylinder"),
    ], 100_000);
    expect(result.group?.importedMesh?.partOfTriangle).toHaveLength(result.group?.importedMesh?.triangleCount);
    const { volume, openOrDoubled } = closedVolume(result.group!);
    expect(openOrDoubled).toBe(0);
    expect(Math.abs(volume)).toBeGreaterThan(1000);
  });

  it("stays see-through when every part was see-through, and solid otherwise", async () => {
    const ghost = await buildGroupedShapeFromSelection([box("a", 0, 0, "#f00", { transparent: true }), box("b", 5, 5, "#f00", { transparent: true })], 100_000);
    expect(ghost.group?.transparent).toBe(true);
    const mixed = await buildGroupedShapeFromSelection([box("a", 0, 0, "#f00", { transparent: true }), box("b", 5, 5)], 100_000);
    expect(mixed.group?.transparent).toBeUndefined();
  });

  it("keeps the parts separate above the triangle limit", async () => {
    const result = await buildGroupedShapeFromSelection([box("a", 0, 0), box("b", 5, 5)], 4);
    expect(result.group?.importedMesh).toBeUndefined();
  });
});
