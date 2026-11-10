import manifoldModule, { type ManifoldToplevel } from "manifold-3d";
import * as THREE from "three";
import { beforeAll, describe, expect, it } from "vitest";
import { FACE_TOOL_OVERLAP } from "@/lib/faceTool";
import { faceToolPlan, sketchBodyFrame, sketchCapWorkplane } from "@/lib/faceToolFrame";
import { quaternionForShape } from "@/lib/geometryRotation";
import type { SketchProfile, WorkplaneShape } from "@/types/layerling";

function loop(prefix: string, corners: Array<[number, number]>): SketchProfile {
  const ids = corners.map((_, index) => `${prefix}${index}`);
  return {
    points: corners.map(([x, z], index) => ({ id: ids[index], x, z })),
    segments: ids.map((id, index) => ({ id: `${prefix}s${index}`, kind: "line" as const, startId: id, endId: ids[(index + 1) % ids.length] })),
  };
}

const square = loop("a", [[0, 0], [20, 0], [20, 10], [0, 10]]);

/** A sketch body of the 20 x 10 sketch, 6 high, its middle at (30, 40); no exact body, so its anchor is the middle of its points. */
function body(overrides: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return {
    id: "s", name: "Sketch extrusion", kind: "mesh", color: "#d41721", x: 30, z: 40, elevation: 0, size: 20,
    width: 20, depth: 10, height: 6, rotation: 0, locked: false, hidden: false,
    sketchProfile: square, sketchOperation: "extrude",
    ...overrides,
  } as WorkplaneShape;
}

const face = (origin: [number, number, number], normal: [number, number, number]) => ({
  workplane: { origin: { x: origin[0], y: origin[1], z: origin[2] }, normal: { x: normal[0], y: normal[1], z: normal[2] }, xAxis: { x: 1, y: 0, z: 0 }, zAxis: { x: 0, y: 0, z: 1 } },
});

describe("face tool on a sketch body's top or bottom", () => {
  it("finds the sketch where Edit sketch puts it", () => {
    const frame = sketchBodyFrame(body());
    // The sketch's (10, 5), the middle of its points, lies under the body's middle.
    expect(frame?.origin.x).toBeCloseTo(20, 9);
    expect(frame?.origin.y).toBeCloseTo(0, 9);
    expect(frame?.origin.z).toBeCloseTo(35, 9);
    expect(frame?.normal.y).toBeCloseTo(1, 9);
  });

  it("stands a body going out on the top, and starts a pocket at its depth", () => {
    const top = face([25, 6, 38], [0, 1, 0]);
    expect(sketchCapWorkplane(body(), top, { direction: "out", depth: 3 })?.origin.y).toBeCloseTo(6, 9);
    expect(sketchCapWorkplane(body(), top, { direction: "in", depth: 3 })?.origin.y).toBeCloseTo(3, 9);
  });

  it("reaches down from the bottom without turning the outline over", () => {
    const bottom = face([25, 0, 38], [0, -1, 0]);
    const out = sketchCapWorkplane(body(), bottom, { direction: "out", depth: 3 });
    expect(out?.origin.y).toBeCloseTo(-3, 9);
    expect(out?.normal.y).toBeCloseTo(1, 9);
    expect(sketchCapWorkplane(body(), bottom, { direction: "in", depth: 3 })?.origin.y).toBeCloseTo(-FACE_TOOL_OVERLAP, 9);
  });

  it("follows a body turned on its side", () => {
    const turned = body({ rotationX: 90, elevation: 0 });
    const frame = sketchBodyFrame(turned)!;
    const normal = new THREE.Vector3(0, 1, 0).applyQuaternion(quaternionForShape(turned));
    expect(frame.normal.x).toBeCloseTo(normal.x, 9);
    expect(frame.normal.y).toBeCloseTo(normal.y, 9);
    expect(frame.normal.z).toBeCloseTo(normal.z, 9);
    const topOrigin = new THREE.Vector3(frame.origin.x, frame.origin.y, frame.origin.z).addScaledVector(normal, 6);
    const placed = sketchCapWorkplane(turned, face([topOrigin.x, topOrigin.y, topOrigin.z], [normal.x, normal.y, normal.z]), { direction: "out", depth: 2 });
    expect(placed).not.toBeNull();
  });

  it("leaves a side face, a sketch of two areas and a mirrored body to the face's triangles", () => {
    expect(sketchCapWorkplane(body(), face([40, 3, 38], [1, 0, 0]), { direction: "out", depth: 2 })).toBeNull();
    const two = loop("b", [[30, 0], [40, 0], [40, 10], [30, 10]]);
    const islands = { points: [...square.points, ...two.points], segments: [...square.segments, ...two.segments] };
    expect(sketchBodyFrame(body({ sketchProfile: islands }))).toBeNull();
    expect(sketchBodyFrame(body({ mirrorX: true }))).toBeNull();
  });

  it("leaves a stroked, already set in or key-ringed sketch body to the face's triangles", () => {
    expect(sketchBodyFrame(body({ sketchProfile: { ...square, stroke: { width: 2, align: "inside", join: "miter", cap: "flat" } } }))).toBeNull();
    expect(sketchBodyFrame(body({ sketchProfile: { ...square, inset: { distance: 1, radius: 0 } } }))).toBeNull();
    expect(sketchBodyFrame(body({ sketchProfile: { ...square, keyring: { side: "left", diameter: 4, x: 0, z: 5 } } }))).toBeNull();
  });

  it("leaves a tapered, filleted or stretched sketch body to the face's triangles", () => {
    expect(sketchBodyFrame(body({ taperTopWidth: 10 }))).toBeNull();
    expect(sketchBodyFrame(body({ edgeTreatments: [{ kind: "fillet", amount: 1, edgeCount: 4 }] }))).toBeNull();
    // Pulled to 30 wide since its exact body was built 20 wide, and not built again yet.
    const frame = { x: 10, z: 5, elevation: 0, width: 20, depth: 10, height: 6 } as WorkplaneShape["cadBrepFrame"];
    expect(sketchBodyFrame(body({ width: 30, cadBrep: "brep", cadBrepFrame: frame }))).toBeNull();
  });
});

describe("what the face tool builds on a face", () => {
  let runtime: ManifoldToplevel;
  beforeAll(async () => {
    runtime = await manifoldModule();
    runtime.setup();
  });

  /** The body's top face: its frame, an outline of the face in it and the body's thickness behind it. */
  const top = {
    workplane: { origin: { x: 30, y: 6, z: 40 }, normal: { x: 0, y: 1, z: 0 }, xAxis: { x: 1, y: 0, z: 0 }, zAxis: { x: 0, y: 0, z: 1 } },
    outline: { loops: [[{ u: -10, v: -5 }, { u: 10, v: -5 }, { u: 10, v: 5 }, { u: -10, v: 5 }]] },
    thickness: 6,
  };

  it("carries a plain sketch body's own outline with the inset on its top", () => {
    const plan = faceToolPlan(runtime, body(), top, { direction: "out", inset: 2, radius: 1, depth: 3 })!;
    expect(plan.profile.points.map((point) => [point.x, point.z])).toEqual([[0, 0], [20, 0], [20, 10], [0, 10]]);
    expect(plan.profile.inset).toEqual({ distance: 2, radius: 1 });
    expect(plan.height).toBeCloseTo(3, 9);
    expect(plan.workplane.origin.y).toBeCloseTo(6, 9);
  });

  it("reaches from the bottom exactly as far as the depth, not into the body (#1577)", () => {
    const bottom = { ...top, workplane: { ...top.workplane, origin: { x: 30, y: 0, z: 40 }, normal: { x: 0, y: -1, z: 0 } } };
    const plan = faceToolPlan(runtime, body(), bottom, { direction: "out", inset: 0, radius: 0, depth: 3 })!;
    expect(plan.workplane.origin.y).toBeCloseTo(-3, 9);
    expect(plan.height).toBeCloseTo(3, 9);
  });

  it("keeps no inset when there is nothing to set in", () => {
    expect(faceToolPlan(runtime, body(), top, { direction: "out", inset: 0, radius: 0, depth: 3 })?.profile.inset).toBeUndefined();
  });

  it("takes the outline of the face's triangles, set in, on any other body", () => {
    const plan = faceToolPlan(runtime, body({ mirrorX: true }), top, { direction: "out", inset: 1, radius: 0, depth: 3 })!;
    expect(plan.profile.inset).toBeUndefined();
    const xs = plan.profile.points.map((point) => point.x);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(18, 6);
  });

  it("gives nothing when the inset leaves nothing of the top", () => {
    expect(faceToolPlan(runtime, body(), top, { direction: "out", inset: 6, radius: 0, depth: 3 })).toBeNull();
  });

  it("cuts a pocket no deeper than the body behind the face", () => {
    expect(faceToolPlan(runtime, body(), top, { direction: "in", inset: 2, radius: 0, depth: 30 })?.height).toBeCloseTo(6 + FACE_TOOL_OVERLAP, 9);
  });
});
