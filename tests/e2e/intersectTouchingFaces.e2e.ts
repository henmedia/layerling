import { beforeAll, describe, expect, it, vi } from "vitest";
import manifoldModule from "manifold-3d";
import type { WorkplaneShape } from "@/types/layerling";
import { buildGroupedShapeFromSelection, buildIntersectionShapeFromSelection, exportSolidVolume } from "@/lib/editorBooleans";
import { meshForShape } from "@/lib/editorMeshCore";
import { rememberManifoldRuntime } from "@/lib/manifoldHandle";

/**
 * Intersect on two parts that also touch along a flat face (Issue #1886): a box with a ball sunk into its top, and a box
 * standing exactly on that box. What they share is the ball's upper part. The kernel counts the face the two boxes
 * touch on as an overlap of no height, and the whole face came out with the ball as a paper-thin layer.
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

function shape(id: string, kind: "box" | "sphere", x: number, elevation: number, width: number, height: number, depth = width): WorkplaneShape {
  return { id, name: kind, kind, color: id.startsWith("green") ? "#2e9e44" : "#d41721", x, z: 0, elevation, size: Math.max(width, depth), width, depth, height, rotation: 0 } as WorkplaneShape;
}

async function grouped(shapes: WorkplaneShape[]) {
  const { group } = await buildGroupedShapeFromSelection(shapes, 1_000_000);
  if (!group) throw new Error("no group");
  return group;
}

/** The mesh's box, and how much of its surface lies flat at the height `y` facing up and facing down. */
function measure(result: WorkplaneShape, y: number) {
  const mesh = meshForShape(result);
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const vertex of mesh.vertices) {
    for (let axis = 0; axis < 3; axis += 1) {
      min[axis] = Math.min(min[axis], vertex[axis]);
      max[axis] = Math.max(max[axis], vertex[axis]);
    }
  }
  let up = 0;
  let down = 0;
  for (const face of mesh.faces) {
    const [a, b, c] = [mesh.vertices[face[0]], mesh.vertices[face[1]], mesh.vertices[face[2]]];
    if (![a, b, c].every((vertex) => Math.abs(vertex[1] - y) < 1e-4)) continue;
    // Twice the triangle's area as seen from above, with the sign of the side it faces.
    const twice = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]);
    if (twice > 0) up += twice / 2;
    else down -= twice / 2;
  }
  return { min, max, up, down };
}

// The lower box from 0 to `top`, 30 x 30; the ball 16 across, its middle 2 mm above the box's top and 3 mm off centre.
const BALL_SECTION = Math.PI * (8 * 8 - 2 * 2);
const lowerBox = (top: number) => shape("green-box", "box", 0, 0, 30, top);
const upperBox = (top: number) => shape("red-box", "box", 0, top, 30, 12);
const ball = (top: number, id = "green-ball") => shape(id, "sphere", 3, top - 6, 16, 16);

describe("the intersection of two parts that also touch along a face", () => {
  // 58.45 is a height 32 bits cannot hold exactly, as in #1334.
  it.each([10, 5.4, 58.45])("is the ball's upper part alone, with the boxes touching at %s mm", async (top) => {
    for (const selection of [
      [await grouped([lowerBox(top), ball(top)]), upperBox(top)],
      [upperBox(top), await grouped([lowerBox(top), ball(top)])],
    ]) {
      const result = await buildIntersectionShapeFromSelection(selection, 1_000_000);
      expect(result.group).not.toBeNull();
      const { min, max, up, down } = measure(result.group!, top);
      // The ball from 3 - 8 to 3 + 8, not the box from -15 to 15.
      expect(min[0]).toBeCloseTo(-5, 3);
      expect(max[0]).toBeCloseTo(11, 3);
      expect(min[1]).toBeCloseTo(top, 3);
      expect(max[1]).toBeCloseTo(top + 10, 3);
      // Its flat underside is the ball's section, drawn with straight sides; nothing at that height faces up.
      expect(up).toBeLessThan(1e-6);
      expect(down).toBeGreaterThan(BALL_SECTION * 0.98);
      expect(down).toBeLessThan(BALL_SECTION);
    }
  });

  it("is the ball's lower part alone when the ball belongs to the box on top", async () => {
    const result = await buildIntersectionShapeFromSelection([lowerBox(10), await grouped([upperBox(10), ball(10, "red-ball")])], 1_000_000);
    expect(result.group).not.toBeNull();
    const { min, max, up, down } = measure(result.group!, 10);
    expect(min[0]).toBeGreaterThan(-5);
    expect(max[0]).toBeLessThan(11);
    expect(max[1]).toBeCloseTo(10, 3);
    expect(down).toBeLessThan(1e-6);
    expect(up).toBeGreaterThan(BALL_SECTION * 0.98);
    expect(up).toBeLessThan(BALL_SECTION);
  });

  it("is empty when the parts only touch", async () => {
    // The box on top stands beside the ball: from 12 to 28, on the lower box from 12 to 15.
    const beside = shape("red-box", "box", 20, 10, 16, 12);
    const result = await buildIntersectionShapeFromSelection([await grouped([lowerBox(10), ball(10)]), beside], 1_000_000);
    expect(result.group).toBeNull();
    expect(result.empty).toBe(true);
  });

  it("keeps a thin slab the parts really share", async () => {
    // The box on top sunk 0.05 mm into the lower one, clear of the ball.
    const sunk = shape("red-box", "box", 20, 9.95, 16, 12);
    const result = await buildIntersectionShapeFromSelection([await grouped([lowerBox(10), ball(10)]), sunk], 1_000_000);
    expect(result.group).not.toBeNull();
    const { volumeMm3 } = await exportSolidVolume([result.group!]);
    expect(volumeMm3).toBeCloseTo(3 * 16 * 0.05, 3);
  });
});
