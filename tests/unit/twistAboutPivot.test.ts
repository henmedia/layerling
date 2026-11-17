import { describe, expect, it } from "vitest";
import { meshForShape } from "@/lib/editorMeshCore";
import { extrudeTwistPivot } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

function shape(kind: string, extra: Record<string, unknown> = {}): WorkplaneShape {
  return { id: "s", name: "s", kind, color: "#d41721", x: 0, z: 0, elevation: 0, size: 60, width: 20, depth: 60, height: 40, rotation: 0, ...extra } as unknown as WorkplaneShape;
}

/** The middle of the ring of vertices at the top of the body, in x and z. */
function topMiddle(mesh: ReturnType<typeof meshForShape>) {
  const top = Math.max(...mesh.vertices.map(([, y]) => y));
  const ring = mesh.vertices.filter(([, y]) => Math.abs(y - top) < 1e-6);
  const sum = ring.reduce((acc, [x, , z]) => ({ x: acc.x + x, z: acc.z + z }), { x: 0, z: 0 });
  return { x: sum.x / ring.length, z: sum.z / ring.length };
}

describe("a twist turns about the rotation pivot when the body has one", () => {
  it("has no twist pivot without a pivot, or without a twist", () => {
    expect(extrudeTwistPivot(shape("box", { extrudeTwist: 90 }))).toBeUndefined();
    expect(extrudeTwistPivot(shape("box", { rotationPivot: [0, 0, -0.5] }))).toBeUndefined();
  });

  it("reads the pivot as a fraction of the width and depth from the middle", () => {
    const pivot = extrudeTwistPivot(shape("box", { extrudeTwist: 90, rotationPivot: [0.25, 0.3, -0.5] }));
    expect(pivot?.x).toBeCloseTo(5, 6);
    expect(pivot?.z).toBeCloseTo(-30, 6);
  });

  it("keeps turning about the middle of the body when it has no pivot", () => {
    const top = topMiddle(meshForShape(shape("box", { extrudeTwist: 90 })));
    expect(top.x).toBeCloseTo(0, 4);
    expect(top.z).toBeCloseTo(0, 4);
  });

  it("turns the middle of the body round a pivot on its edge", () => {
    // Pivot on the middle of the back edge (z = -30). A quarter turn takes the body's middle, 30 mm in front of the
    // pivot, to 30 mm to the left of it: (-30, -30).
    const top = topMiddle(meshForShape(shape("box", { extrudeTwist: 90, rotationPivot: [0, 0, -0.5] })));
    expect(top.x).toBeCloseTo(-30, 4);
    expect(top.z).toBeCloseTo(-30, 4);
  });

  it("leaves the bottom where it was", () => {
    const mesh = meshForShape(shape("box", { extrudeTwist: 90, rotationPivot: [0, 0, -0.5] }));
    const bottom = Math.min(...mesh.vertices.map(([, y]) => y));
    const ring = mesh.vertices.filter(([, y]) => Math.abs(y - bottom) < 1e-6);
    const xs = ring.map(([x]) => x);
    const zs = ring.map(([, , z]) => z);
    expect(Math.min(...xs)).toBeCloseTo(-10, 4);
    expect(Math.max(...xs)).toBeCloseTo(10, 4);
    expect(Math.min(...zs)).toBeCloseTo(-30, 4);
    expect(Math.max(...zs)).toBeCloseTo(30, 4);
  });
});
