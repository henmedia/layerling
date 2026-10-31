import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { placementWorkplanePoint } from "@/lib/placementWorkplane";
import { MAX_SECTION_SKETCH_SEGMENTS, sectionPointInFrame, sectionSketchProfile } from "@/lib/sectionSketch";
import { projectSectionPoint, sliceMeshContours, type SectionLoop, type SectionMesh } from "@/lib/sectionSvg";
import { sectionFrameFrom, sectionMeshInFrame, sectionPlacementWorkplane, type SectionPlaneAxis } from "@/lib/sectionView";
import type { SketchProfile } from "@/types/layerling";

/*
 * A sketch from the section view (#1022): the cut's outlines become a sketch lying on the cut, its round
 * parts as true arcs and circles.
 */

/** A three.js body as a mesh, as the export gives it: corners per triangle, not welded. */
function meshFromGeometry(geometry: THREE.BufferGeometry): SectionMesh {
  const source = geometry.index ? geometry.toNonIndexed() : geometry;
  const position = source.getAttribute("position");
  const vertices: Array<[number, number, number]> = [];
  const faces: Array<[number, number, number]> = [];
  for (let index = 0; index < position.count; index += 1) vertices.push([position.getX(index), position.getY(index), position.getZ(index)]);
  for (let index = 0; index + 2 < position.count; index += 3) faces.push([index, index + 1, index + 2]);
  return { vertices, faces };
}

/** A 20 x 20 mm plate, 10 mm thick (along z), with a bore of 8 mm in the middle. */
function plateWithBore() {
  const outline = new THREE.Shape([new THREE.Vector2(-10, -10), new THREE.Vector2(10, -10), new THREE.Vector2(10, 10), new THREE.Vector2(-10, 10)]);
  const bore = new THREE.Path();
  bore.absarc(0, 0, 4, 0, Math.PI * 2, true);
  outline.holes.push(bore);
  return meshFromGeometry(new THREE.ExtrudeGeometry(outline, { depth: 10, bevelEnabled: false, curveSegments: 32 }));
}

/** Every point of the sketch, handles included, where it lies in the world. */
function worldPoints(profile: SketchProfile, workplane: ReturnType<typeof sectionPlacementWorkplane>) {
  return profile.points.flatMap((point) => [point, point.handleIn, point.handleOut])
    .filter((point): point is { x: number; z: number } => Boolean(point))
    .map((point) => placementWorkplanePoint(workplane, point.x, point.z));
}

/** The ids of each closed outline of the sketch, following its lines. */
function outlineSegments(profile: SketchProfile) {
  const next = new Map(profile.segments.map((segment) => [segment.startId, segment]));
  const seen = new Set<string>();
  const outlines: Array<SketchProfile["segments"]> = [];
  for (const segment of profile.segments) {
    if (seen.has(segment.id)) continue;
    const ring: SketchProfile["segments"] = [];
    let current: SketchProfile["segments"][number] | undefined = segment;
    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      ring.push(current);
      current = next.get(current.endId);
    }
    expect(current).toBe(segment);
    outlines.push(ring);
  }
  return outlines;
}

describe("sectionPointInFrame", () => {
  it("undoes projectSectionPoint on every axis", () => {
    const axes: SectionPlaneAxis[] = ["x", "y", "z"];
    for (const axis of axes) {
      const index = { x: 0, y: 1, z: 2 }[axis];
      const point: [number, number, number] = [3, -4, 7];
      point[index] = 2.5;
      expect(sectionPointInFrame(projectSectionPoint(point, axis), axis, 2.5)).toEqual(point.map((value) => value + 0));
    }
  });
});

describe("sectionSketchProfile", () => {
  it("lays a plate with a bore on the cut: a square of four lines and the bore as a true circle", () => {
    const axis = "z";
    const offset = 5;
    const workplane = sectionPlacementWorkplane({ axis, offset, flipped: false });
    const made = sectionSketchProfile(sliceMeshContours(plateWithBore(), axis, offset), axis, offset, null, workplane);
    expect(made.tooMany).toBe(false);
    expect(made.openLeftOut).toBe(0);
    expect(made.outlines).toBe(2);
    const profile = made.profile!;
    const outlines = outlineSegments(profile).sort((a, b) => a.length - b.length);
    expect(outlines.map((ring) => ring.length)).toEqual([4, 4]);
    const kinds = outlines.map((ring) => [...new Set(ring.map((segment) => segment.kind))].join());
    expect(kinds.sort()).toEqual(["bezier", "line"]);
    // Every point lies on the cut, and the bore's corners on its circle of 4 mm.
    for (const point of worldPoints(profile, workplane)) expect(point.z).toBeCloseTo(offset, 9);
    const bore = outlines.find((ring) => ring[0].kind === "bezier")!;
    for (const segment of bore) {
      const point = profile.points.find((candidate) => candidate.id === segment.startId)!;
      const world = placementWorkplanePoint(workplane, point.x, point.z);
      expect(Math.hypot(world.x, world.y)).toBeCloseTo(4, 3);
    }
    const square = outlines.find((ring) => ring[0].kind === "line")!;
    for (const segment of square) {
      const point = profile.points.find((candidate) => candidate.id === segment.startId)!;
      const world = placementWorkplanePoint(workplane, point.x, point.z);
      expect(Math.abs(world.x)).toBeCloseTo(10, 6);
      expect(Math.abs(world.y)).toBeCloseTo(10, 6);
    }
  });

  it("puts a cut of a turned section view where that plane lies in the world", () => {
    const frame = sectionFrameFrom({ x: 2, y: 3, z: -1 }, { x: 0.3, y: 0.2, z: 1 }, { x: 1, y: 0, z: 0 })!;
    const offset = 4;
    const workplane = sectionPlacementWorkplane({ axis: "y", offset, flipped: true, frame });
    const loops = sliceMeshContours(sectionMeshInFrame(plateWithBore(), frame), "y", offset);
    const made = sectionSketchProfile(loops, "y", offset, frame, workplane);
    expect(made.outlines).toBeGreaterThan(0);
    for (const point of worldPoints(made.profile!, workplane)) {
      const along = (point.x - frame.origin.x) * frame.yAxis.x + (point.y - frame.origin.y) * frame.yAxis.y + (point.z - frame.origin.z) * frame.yAxis.z;
      expect(along).toBeCloseTo(offset, 9);
    }
  });

  it("gives a half disc an arc and a line, with at least three steps", () => {
    const half = new THREE.Shape();
    half.moveTo(-6, 0);
    half.absarc(0, 0, 6, Math.PI, 0, true);
    half.lineTo(-6, 0);
    const mesh = meshFromGeometry(new THREE.ExtrudeGeometry(half, { depth: 8, bevelEnabled: false, curveSegments: 24 }));
    const workplane = sectionPlacementWorkplane({ axis: "z", offset: 4, flipped: false });
    const made = sectionSketchProfile(sliceMeshContours(mesh, "z", 4), "z", 4, null, workplane);
    expect(made.outlines).toBe(1);
    const [ring] = outlineSegments(made.profile!);
    expect(ring.length).toBeGreaterThanOrEqual(3);
    expect(ring.filter((segment) => segment.kind === "line")).toHaveLength(1);
    expect(ring.filter((segment) => segment.kind === "bezier").length).toBeGreaterThanOrEqual(2);
  });

  it("leaves out outlines that do not close", () => {
    const open: SectionLoop = { points: [{ u: 0, v: 0 }, { u: 5, v: 0 }, { u: 5, v: 5 }], closed: false };
    const made = sectionSketchProfile([open], "y", 0, null, sectionPlacementWorkplane({ axis: "y", offset: 0, flipped: false }));
    expect(made).toEqual({ profile: null, outlines: 0, openLeftOut: 1, tooMany: false });
  });

  it("refuses a cut with more lines than a sketch takes", () => {
    const squares: SectionLoop[] = Array.from({ length: MAX_SECTION_SKETCH_SEGMENTS / 4 + 1 }, (_, index) => ({
      closed: true,
      points: [{ u: index * 3, v: 0 }, { u: index * 3 + 1, v: 0 }, { u: index * 3 + 1, v: 1 }, { u: index * 3, v: 1 }],
    }));
    const made = sectionSketchProfile(squares, "y", 0, null, sectionPlacementWorkplane({ axis: "y", offset: 0, flipped: false }));
    expect(made.tooMany).toBe(true);
    expect(made.profile).toBeNull();
  });
});
