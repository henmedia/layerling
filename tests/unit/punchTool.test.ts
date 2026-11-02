import manifoldModule, { type ManifoldToplevel } from "manifold-3d";
import { beforeAll, describe, expect, it } from "vitest";
import type { MeshData, Vec3 } from "@/lib/editorMeshCore";
import { meshIsClosed, meshSilhouette, punchAxisBetween, punchPlan } from "@/lib/punchTool";
import type { SketchProfile } from "@/types/layerling";

/** A box from its two corners, as a loose mesh; several of them overlap without being joined, as a model with stray shells. */
function boxes(...corners: Array<[Vec3, Vec3]>): MeshData {
  const vertices: Vec3[] = [];
  const faces: [number, number, number][] = [];
  for (const [[x0, y0, z0], [x1, y1, z1]] of corners) {
    const base = vertices.length;
    vertices.push([x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]);
    const quads = [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [2, 3, 7, 6], [1, 2, 6, 5], [0, 4, 7, 3]];
    for (const [a, b, c, d] of quads) faces.push([base + a, base + b, base + c], [base + a, base + c, base + d]);
  }
  return { name: "test", vertices, faces };
}

/** The area a sketch of straight lines encloses: outer rings count, rings inside them take away. */
function sketchArea(profile: SketchProfile) {
  const byId = new Map(profile.points.map((point) => [point.id, point]));
  const rings = new Map<string, Array<{ x: number; z: number }>>();
  for (const segment of profile.segments) {
    const ring = segment.startId.replace(/-\d+$/, "");
    const start = byId.get(segment.startId)!;
    rings.set(ring, [...(rings.get(ring) ?? []), start]);
  }
  const areas = [...rings.values()].map((ring) => Math.abs(ring.reduce((sum, point, index) => {
    const next = ring[(index + 1) % ring.length];
    return sum + point.x * next.z - next.x * point.z;
  }, 0)) / 2);
  const largest = Math.max(...areas);
  return areas.reduce((sum, area) => sum + (area === largest ? area : -area), 0);
}

describe("punch", () => {
  let runtime: ManifoldToplevel;
  beforeAll(async () => {
    runtime = await manifoldModule();
    runtime.setup();
  });

  // A plate 40 x 40 x 3 lying flat, and an L of two overlapping bars standing 20 mm above it.
  const plate = boxes([[-20, 0, -20], [20, 3, 20]]);
  const ell = boxes([[-10, 20, -10], [10, 22, -6]], [[-10, 20, -10], [-6, 22, 10]]);

  it("goes along the axis the punch stands apart from the target", () => {
    expect(punchAxisBetween(ell, plate)).toBe("y");
    expect(punchAxisBetween(boxes([[30, 0, -5], [34, 3, 5]]), plate)).toBe("x");
    expect(punchAxisBetween(plate, plate)).toBe("y");
  });

  it("keeps a concave outline and joins overlapping shells", () => {
    const outline = meshSilhouette(runtime, ell, "y");
    expect(outline.area()).toBeCloseTo(20 * 4 + 16 * 4, 3);
    outline.delete();
    const plan = punchPlan(runtime, ell, plate, "y", 0);
    if (!plan.ok) throw new Error(plan.problem);
    expect(plan.outlines).toBe(1);
    expect(sketchArea(plan.profile)).toBeCloseTo(144, 2);
    // From just below the plate to just above it, wherever the punch stands.
    expect(plan.workplane.origin.y).toBeCloseTo(-1, 6);
    expect(plan.workplane.normal.y).toBeCloseTo(1, 6);
    expect(plan.height).toBeCloseTo(5, 6);
  });

  it("keeps the hole of a ring", () => {
    const ring = boxes([[-10, 10, -10], [10, 12, -6]], [[-10, 10, 6], [10, 12, 10]], [[-10, 10, -10], [-6, 12, 10]], [[6, 10, -10], [10, 12, 10]]);
    const plan = punchPlan(runtime, ring, plate, "y", 0);
    if (!plan.ok) throw new Error(plan.problem);
    expect(plan.outlines).toBe(2);
    expect(sketchArea(plan.profile)).toBeCloseTo(400 - 144, 2);
  });

  it("grows the outline by the clearance", () => {
    const square = boxes([[-5, 10, -5], [5, 12, 5]]);
    const plan = punchPlan(runtime, square, plate, "y", 0.5);
    if (!plan.ok) throw new Error(plan.problem);
    const xs = plan.profile.points.map((point) => point.x);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(11, 2);
  });

  it("punches with an open surface, whichever way its triangles face", () => {
    const closed = boxes([[-5, 10, -5], [5, 12, 5]]);
    expect(meshIsClosed(closed)).toBe(true);
    expect(meshIsClosed(ell)).toBe(true);
    // Only the bottom of the box, facing down and away from above: a sheet with gaps all round.
    const sheet: MeshData = { name: "sheet", vertices: closed.vertices, faces: closed.faces.slice(4, 6) };
    expect(meshIsClosed(sheet)).toBe(false);
    const outline = meshSilhouette(runtime, sheet, "y");
    expect(outline.area()).toBeCloseTo(100, 3);
    outline.delete();
    const edgeOn = meshSilhouette(runtime, sheet, "x");
    expect(edgeOn.isEmpty()).toBe(true);
    edgeOn.delete();
    expect(punchPlan(runtime, sheet, plate, "x", 0)).toEqual({ ok: false, problem: "empty" });
  });

  it("says when the outline misses the target", () => {
    const aside = boxes([[30, 10, 30], [34, 12, 34]]);
    expect(punchPlan(runtime, aside, plate, "y", 0)).toEqual({ ok: false, problem: "miss" });
  });

  it("punches sideways through a standing plate", () => {
    const wall = boxes([[-2, 0, -20], [2, 30, 20]]);
    const peg = boxes([[20, 10, -3], [30, 16, 3]]);
    expect(punchAxisBetween(peg, wall)).toBe("x");
    const plan = punchPlan(runtime, peg, wall, "x", 0);
    if (!plan.ok) throw new Error(plan.problem);
    expect(sketchArea(plan.profile)).toBeCloseTo(36, 2);
    expect(plan.workplane.origin.x).toBeCloseTo(-3, 6);
    expect(plan.height).toBeCloseTo(6, 6);
  });
});
