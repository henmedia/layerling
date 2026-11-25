import Module, { type ManifoldToplevel } from "manifold-3d";
import { beforeAll, describe, expect, it } from "vitest";
import { CYLINDER_WRAP_STEP_DEGREES, wrapMeshAroundCylinder, type CylinderWrapInput } from "@/lib/cylinderWrap";
import { solidWrapBender } from "@/lib/cylinderWrapSolid";
import { meshForShape } from "@/lib/editorMeshCore";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import type { WorkplaneShape } from "@/types/layerling";

let runtime: ManifoldToplevel;
beforeAll(async () => {
  runtime = await Module();
  runtime.setup();
});

function shapeMesh(kind: string, fields: Partial<WorkplaneShape> = {}) {
  return meshForShape({ ...makeShapeFromAsset(toolbarShapeAssets.find((entry) => entry.kind === kind)!, { x: 0, z: 0 }), ...fields } as WorkplaneShape);
}

function wrapped(mesh: CylinderWrapInput, diameter: number, inward: boolean, solid: boolean) {
  const result = wrapMeshAroundCylinder(mesh, { diameter, inward }, solid ? solidWrapBender(runtime) : undefined);
  if ("error" in result) throw new Error(result.error);
  return result;
}

function box(positions: number[]) {
  const low = [Infinity, Infinity, Infinity];
  const high = [-Infinity, -Infinity, -Infinity];
  for (let index = 0; index < positions.length; index += 1) {
    low[index % 3] = Math.min(low[index % 3], positions[index]);
    high[index % 3] = Math.max(high[index % 3], positions[index]);
  }
  return [...low, ...high];
}

/** The directions from the axis the points lie in: one for each cut across the arc. */
function directions(positions: number[]) {
  const found = new Set<number>();
  for (let i = 0; i < positions.length; i += 3) found.add(Math.round(((Math.atan2(positions[i], positions[i + 2]) * 180) / Math.PI / CYLINDER_WRAP_STEP_DEGREES) * 100));
  return found.size;
}

/** Edges that are not shared by exactly two triangles, a point being a point to the micrometre. */
function openEdges(positions: number[]) {
  const point = (at: number) => `${positions[at].toFixed(6)},${positions[at + 1].toFixed(6)},${positions[at + 2].toFixed(6)}`;
  const count = new Map<string, number>();
  for (let i = 0; i < positions.length; i += 9) {
    const corners = [point(i), point(i + 3), point(i + 6)];
    corners.forEach((corner, index) => {
      const key = [corner, corners[(index + 1) % 3]].sort().join("|");
      count.set(key, (count.get(key) ?? 0) + 1);
    });
  }
  return [...count.values()].filter((value) => value !== 2).length;
}

function signedVolume(positions: number[]) {
  let volume = 0;
  for (let i = 0; i < positions.length; i += 9) {
    const [ax, ay, az, bx, by, bz, cx, cy, cz] = positions.slice(i, i + 9);
    volume += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
  }
  return volume;
}

/** A closed body is wrapped strip by strip with the solid kernel: the same body in far fewer triangles (Discussion #1975). */
describe("wrapping with the solid kernel", () => {
  for (const [diameter, inward] of [[4, false], [20, false], [20, true], [50, false], [400, false]] as const) {
    it(`gives the same box on a wall of ${diameter} mm${inward ? ", engraved" : ""}, closed and in every strip`, () => {
      const mesh = shapeMesh("box", { width: diameter * 1.5, depth: 10, height: diameter > 10 ? 2 : 0.5 });
      const before = wrapped(mesh, diameter, inward, false);
      const after = wrapped(mesh, diameter, inward, true);
      expect(after.positions.length).toBeLessThan(before.positions.length);
      expect({ ...after, positions: null }).toEqual({ ...before, positions: null });
      const size = box(before.positions);
      box(after.positions).forEach((value, index) => expect(Math.abs(value - size[index])).toBeLessThan(5e-4));
      expect(Math.abs(signedVolume(after.positions) / signedVolume(before.positions) - 1)).toBeLessThan(1e-4);
      expect(directions(after.positions)).toBe(directions(before.positions));
      expect(openEdges(after.positions)).toBe(0);
    });
  }

  it("keeps a Patties plate at a few ten thousand triangles instead of hundreds of thousands", () => {
    const mesh = shapeMesh("patties");
    const before = wrapped(mesh, 50, false, false);
    const after = wrapped(mesh, 50, false, true);
    expect(before.positions.length / 9).toBeGreaterThan(500000);
    expect(after.positions.length / 9).toBeLessThan(30000);
    expect(Math.abs(signedVolume(after.positions) / signedVolume(before.positions) - 1)).toBeLessThan(1e-3);
    expect(openEdges(after.positions)).toBe(0);
  }, 60000);

  it("closes a body that goes once around into a ring", () => {
    const after = wrapped(shapeMesh("box", { width: 2 * Math.PI * 20 - 1e-6, depth: 10, height: 2 }), 40, false, true);
    expect(Math.abs(signedVolume(after.positions) / (Math.PI * (22 * 22 - 20 * 20) * 10) - 1)).toBeLessThan(2e-3);
  });

  it("wraps an open mesh triangle by triangle, as before", () => {
    const mesh = shapeMesh("box", { width: 20, depth: 10, height: 2 });
    const open = { vertices: mesh.vertices, faces: mesh.faces.slice(2) };
    expect(wrapped(open, 30, false, true).positions).toEqual(wrapped(open, 30, false, false).positions);
  });
});
