import manifoldModule, { type ManifoldToplevel } from "manifold-3d";
import * as THREE from "three";
import { beforeAll, describe, expect, it } from "vitest";
import {
  FACE_TOOL_OVERLAP,
  faceToolHeight,
  faceToolWorkplane,
  insetFaceProfile,
  faceToolSettingsOn,
  insetSketchProfile,
  normalizeFaceTool,
} from "@/lib/faceTool";
import { cloneSketchProfile } from "@/lib/sketchSmoothHandles";
import { readPerforableFace } from "@/lib/holePatternShapes";
import type { SketchProfile } from "@/types/layerling";

let runtime: ManifoldToplevel;

beforeAll(async () => {
  runtime = await manifoldModule();
  runtime.setup();
});

/** World triangles of a box from (-w/2, 0, -d/2) to (w/2, h, d/2), two per side. */
function boxTriangles(w: number, h: number, d: number) {
  const geometry = new THREE.BoxGeometry(w, h, d).toNonIndexed();
  geometry.translate(0, h / 2, 0);
  return Array.from(geometry.getAttribute("position").array as Float32Array);
}

/** The filled area of a profile of straight closed loops, openings taken off (shoelace, signed by winding). */
function area(profile: SketchProfile | null) {
  if (!profile) return 0;
  const byId = new Map(profile.points.map((point) => [point.id, point]));
  let sum = 0;
  profile.segments.forEach((segment) => {
    const a = byId.get(segment.startId)!;
    const b = byId.get(segment.endId)!;
    sum += a.x * b.z - b.x * a.z;
  });
  return Math.abs(sum / 2);
}

const square = (half: number) => [
  { u: -half, v: -half },
  { u: half, v: -half },
  { u: half, v: half },
  { u: -half, v: half },
];

describe("face tool", () => {
  const positions = boxTriangles(100, 60, 20);
  const read = readPerforableFace(positions, { x: 5, y: 30, z: 10 }, { x: 0, y: 0, z: 1 });
  if (!read.ok) throw new Error("no face");
  const face = read.face;

  it("takes the whole face with no inset", () => {
    expect(area(insetFaceProfile(runtime, face.outline, 0))).toBeCloseTo(100 * 60, 3);
  });

  it("moves every edge inward by the inset and keeps square corners", () => {
    const profile = insetFaceProfile(runtime, face.outline, 5);
    expect(area(profile)).toBeCloseTo(90 * 50, 3);
    expect(profile?.points).toHaveLength(4);
  });

  it("widens an opening in the face by the same inset", () => {
    const outline = { loops: [square(20), square(5)] };
    // 36 x 36 left of the 40 x 40 face, minus the 10 x 10 opening grown to 14 x 14.
    expect(area(insetFaceProfile(runtime, outline, 2))).toBeCloseTo(36 * 36 - 14 * 14, 3);
  });

  it("rounds the corners to the radius and keeps the inset at the straight sides", () => {
    const profile = insetFaceProfile(runtime, face.outline, 5, 4);
    // A 90 x 50 rectangle with corners of radius 4: the area lacks (4 - pi) r^2, near enough for arcs made of straight pieces.
    const polygonCircle = 48 / 2 * Math.sin((2 * Math.PI) / 48);
    expect(area(profile)).toBeCloseTo(90 * 50 - (4 - polygonCircle) * 16, 0);
    const xs = profile!.points.map((point) => point.x);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(90, 3);
    expect(profile!.points.length).toBeGreaterThan(4);
  });

  it("keeps a sharp tip pointed, and ends it in an arc with a radius", () => {
    // A thin triangle pointing along +u. Moved inward, its tip stays a point and moves back by more
    // than the inset; with a radius the point becomes an arc of several points.
    const outline = { loops: [[{ u: 0, v: -10 }, { u: 40, v: 0 }, { u: 0, v: 10 }]] };
    const pointed = insetFaceProfile(runtime, outline, 1)!;
    const round = insetFaceProfile(runtime, outline, 1, 2)!;
    const tip = (profile: SketchProfile) => profile.points.filter((point) => point.x > Math.max(...profile.points.map((p) => p.x)) - 0.5).length;
    expect(tip(pointed)).toBe(1);
    expect(Math.max(...pointed.points.map((point) => point.x))).toBeLessThan(40 - 1);
    expect(tip(round)).toBeGreaterThan(1);
  });

  it("rounds the inner corner of an L-shaped face too", () => {
    // A 40 x 40 square with the 20 x 20 quarter at +u +v missing: five outer corners and one inner one at (20, 20).
    const outline = { loops: [[{ u: 0, v: 0 }, { u: 40, v: 0 }, { u: 40, v: 20 }, { u: 20, v: 20 }, { u: 20, v: 40 }, { u: 0, v: 40 }]] };
    const profile = insetFaceProfile(runtime, outline, 0, 3)!;
    // Each outer corner loses (1 - pi/4) r^2, the inner one gains as much: four corners' worth less than 1200.
    expect(area(profile)).toBeCloseTo(1200 - 4 * (1 - Math.PI / 4) * 9, 0);
    const nearInnerCorner = profile.points.filter((point) => Math.hypot(point.x - 20, point.z - 20) < 0.5);
    expect(nearInnerCorner).toHaveLength(0);
  });

  it("sets a sketch's own outline in, for a body the kernel cannot build", () => {
    const ids = ["a", "b", "c", "d"];
    const corners: Array<[number, number]> = [[0, 0], [40, 0], [40, 30], [0, 30]];
    const sketch: SketchProfile = {
      points: corners.map(([x, z], index) => ({ id: ids[index], x, z })),
      segments: ids.map((id, index) => ({ id: `s${index}`, kind: "line" as const, startId: id, endId: ids[(index + 1) % 4] })),
    };
    expect(area(insetSketchProfile(runtime, sketch, { distance: 3, radius: 0 }))).toBeCloseTo(34 * 24, 3);
  });

  it("gives nothing when the inset eats the whole face", () => {
    expect(insetFaceProfile(runtime, face.outline, 30)).toBeNull();
  });

  it("starts a body going out on the face, exactly as tall as the depth, and a pocket at its bottom (#1577)", () => {
    const out = faceToolWorkplane(face, { direction: "out", depth: 3 });
    expect(out.origin.z).toBeCloseTo(10, 6);
    expect(faceToolHeight({ direction: "out", depth: 3 })).toBeCloseTo(3, 6);
    const pocket = faceToolWorkplane(face, { direction: "in", depth: 3 });
    expect(pocket.origin.z).toBeCloseTo(10 - 3, 6);
    expect(faceToolHeight({ direction: "in", depth: 3 })).toBeCloseTo(3 + FACE_TOOL_OVERLAP, 6);
    expect(pocket.normal).toEqual(face.workplane.normal);
  });

  it("holds a pocket to the body behind the face and leaves a body going out alone", () => {
    expect(faceToolSettingsOn({ thickness: 5 }, { direction: "in", inset: 0, radius: 0, depth: 30 }).depth).toBe(5);
    expect(faceToolSettingsOn({ thickness: 5 }, { direction: "in", inset: 0, radius: 0, depth: 3 }).depth).toBe(3);
    expect(faceToolSettingsOn({ thickness: 5 }, { direction: "out", inset: 0, radius: 0, depth: 30 }).depth).toBe(30);
  });

  it("keeps the inset when a sketch is copied for a build", () => {
    expect(cloneSketchProfile({ points: [], segments: [], inset: { distance: 2, radius: 1 } }).inset).toEqual({ distance: 2, radius: 1 });
  });

  it("keeps the settings in range", () => {
    expect(normalizeFaceTool({ inset: -4, radius: -1, depth: 0 })).toEqual({ direction: "out", inset: 0, radius: 0, depth: 0.2, separate: false });
    expect(normalizeFaceTool({ direction: "in", depth: 5 }).direction).toBe("in");
    // The switch for a body of its own (#750) only counts when it is exactly true.
    expect(normalizeFaceTool({ separate: true }).separate).toBe(true);
    expect(normalizeFaceTool({ separate: "yes" as unknown as boolean }).separate).toBe(false);
  });
});
