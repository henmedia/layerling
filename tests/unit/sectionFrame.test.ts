import { describe, expect, it } from "vitest";
import { horizontalPlacementWorkplane, placementWorkplaneFromSurface } from "@/lib/placementWorkplane";
import { loopArea, sliceMeshContours } from "@/lib/sectionSvg";
import {
  computeSectionPlaneVector,
  getSectionBounds,
  sectionFrameFromView,
  sectionFrameFromWorkplane,
  sectionMeshInFrame,
  sectionOffsetInFrame,
  sectionPlacementWorkplane,
  sectionPointFromFrame,
  sectionPointToFrame,
  type SectionFrame,
  type SectionPlaneSettings,
} from "@/lib/sectionView";
import type { WorkplaneShape } from "@/types/layerling";

// The section view turned to the workplane or the view (#644): the same rules as on the design's axes,
// measured in a frame.

const dot = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) => a.x * b.x + a.y * b.y + a.z * b.z;

function keeps(settings: SectionPlaneSettings, point: [number, number, number]) {
  const { normal, constant } = computeSectionPlaneVector(settings);
  return normal.x * point[0] + normal.y * point[1] + normal.z * point[2] + constant >= 0;
}

function expectRightHanded(frame: SectionFrame) {
  for (const axis of [frame.xAxis, frame.yAxis, frame.zAxis]) expect(Math.hypot(axis.x, axis.y, axis.z)).toBeCloseTo(1, 9);
  expect(dot(frame.xAxis, frame.yAxis)).toBeCloseTo(0, 9);
  expect(dot(frame.xAxis, frame.zAxis)).toBeCloseTo(0, 9);
  // z = x × y: the cut is never seen mirrored.
  const { xAxis: x, yAxis: y, zAxis: z } = frame;
  expect(y.y * x.z - y.z * x.y).not.toBeNaN();
  expect(x.y * y.z - x.z * y.y).toBeCloseTo(z.x, 9);
  expect(x.z * y.x - x.x * y.z).toBeCloseTo(z.y, 9);
  expect(x.x * y.y - x.y * y.x).toBeCloseTo(z.z, 9);
}

/** A 20 mm cube around the origin, faces turning outwards. */
const CUBE = {
  vertices: [
    [-10, -10, -10], [10, -10, -10], [10, 10, -10], [-10, 10, -10],
    [-10, -10, 10], [10, -10, 10], [10, 10, 10], [-10, 10, 10],
  ] as Array<[number, number, number]>,
  faces: [
    [0, 2, 1], [0, 3, 2], [4, 5, 6], [4, 6, 7],
    [0, 1, 5], [0, 5, 4], [3, 7, 6], [3, 6, 2],
    [0, 4, 7], [0, 7, 3], [1, 2, 6], [1, 6, 5],
  ] as Array<[number, number, number]>,
};

function tiltedWorkplane(degrees: number) {
  // A workplane on a face that leans back about the left-right axis.
  const radians = (degrees * Math.PI) / 180;
  return placementWorkplaneFromSurface({ x: 0, y: 0, z: 0 }, { x: 0, y: Math.cos(radians), z: Math.sin(radians) }, { x: 1, y: 0, z: 0 });
}

describe("section frames", () => {
  it("are square, right-handed and the way back is exact", () => {
    const frame = sectionFrameFromWorkplane(tiltedWorkplane(35))!;
    expectRightHanded(frame);
    const view = sectionFrameFromView({ x: 3, y: 4, z: 5 }, { x: -1, y: -1, z: -1 }, { x: 1, y: 0, z: -1 })!;
    expectRightHanded(view);
    const point: [number, number, number] = [12.5, -3, 7.25];
    const back = sectionPointFromFrame(sectionPointToFrame(point, view), view);
    back.forEach((value, index) => expect(value).toBeCloseTo(point[index], 9));
  });

  it("on the base plate cut exactly as the design's own axes", () => {
    const frame = sectionFrameFromWorkplane(horizontalPlacementWorkplane(0))!;
    const shape = { id: "b", name: "Box", kind: "box", x: 10, z: -5, elevation: 5, width: 20, height: 10, depth: 30, rotation: 0, color: "#f00" } as WorkplaneShape;
    for (const axis of ["x", "y", "z"] as const) {
      const world = computeSectionPlaneVector({ enabled: true, axis, offset: 7, flipped: false, showPlane: true });
      const framed = computeSectionPlaneVector({ enabled: true, axis, offset: 7, flipped: false, showPlane: true, frame });
      expect(framed.normal.x).toBeCloseTo(world.normal.x, 9);
      expect(framed.normal.y).toBeCloseTo(world.normal.y, 9);
      expect(framed.normal.z).toBeCloseTo(world.normal.z, 9);
      expect(framed.constant).toBeCloseTo(world.constant, 9);
      expect(getSectionBounds([shape], axis, 200, 200, frame).center).toBeCloseTo(getSectionBounds([shape], axis).center, 6);
    }
  });

  it("keep what lies beyond the offset along the frame's axis, the other side when flipped", () => {
    const workplane = { ...tiltedWorkplane(40), origin: { x: 5, y: 20, z: -3 } };
    const frame = sectionFrameFromWorkplane(workplane)!;
    const settings: SectionPlaneSettings = { enabled: true, axis: "y", offset: 4, flipped: false, showPlane: true, frame };
    const beyond = sectionPointFromFrame([1, 5, -2], frame);
    const before = sectionPointFromFrame([1, 3, -2], frame);
    expect(keeps(settings, beyond)).toBe(true);
    expect(keeps(settings, before)).toBe(false);
    expect(keeps({ ...settings, flipped: true }, beyond)).toBe(false);
    expect(keeps({ ...settings, flipped: true }, before)).toBe(true);
  });

  it("in the view take away what lies in front", () => {
    // Looking down the -z axis from z = +100: the eye is on the near side.
    const frame = sectionFrameFromView({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: -1 }, { x: 1, y: 0, z: 0 })!;
    const settings: SectionPlaneSettings = { enabled: true, axis: "y", offset: 0, flipped: false, showPlane: true, frame };
    expect(keeps(settings, [0, 0, -5])).toBe(true);
    expect(keeps(settings, [0, 0, 5])).toBe(false);
  });

  it("slice a body parallel to a tilted workplane", () => {
    // 45 degrees through the middle of a 20 mm cube: a 20 by 20·√2 rectangle.
    const frame = sectionFrameFromWorkplane(tiltedWorkplane(45))!;
    const loops = sliceMeshContours(sectionMeshInFrame(CUBE, frame), "y", 0);
    expect(loops).toHaveLength(1);
    expect(loops[0].closed).toBe(true);
    expect(Math.abs(loopArea(loops[0].points))).toBeCloseTo(20 * 20 * Math.SQRT2, 6);
  });

  it("measure the design along the frame's axis", () => {
    const frame = sectionFrameFromWorkplane(tiltedWorkplane(45))!;
    const cube = { id: "c", name: "Cube", kind: "box", x: 0, z: 0, elevation: -10, width: 20, height: 20, depth: 20, rotation: 0, color: "#f00" } as WorkplaneShape;
    const bounds = getSectionBounds([cube], "y", 200, 200, frame);
    expect(bounds.center).toBeCloseTo(0, 6);
    // Across its diagonal the cube reaches 10·√2 either side, plus the margin.
    expect(bounds.max).toBeGreaterThanOrEqual(10 * Math.SQRT2);
    expect(bounds.max).toBeLessThan(10 * Math.SQRT2 + 3);
  });

  it("put the workplane on the turned cut", () => {
    const frame = sectionFrameFromWorkplane({ ...tiltedWorkplane(30), origin: { x: 2, y: 8, z: 1 } })!;
    const placed = sectionPlacementWorkplane({ axis: "y", offset: 6, flipped: false, frame });
    expect(sectionPointToFrame([placed.origin.x, placed.origin.y, placed.origin.z], frame)[1]).toBeCloseTo(6, 6);
    // Facing out of the body that stays, towards the side that was cut away.
    expect(dot(placed.normal, frame.yAxis)).toBeCloseTo(-1, 6);
  });

  // A view cut turns with the camera (#2118): zooming to the pointer or panning moves the point the view turns
  // about, and the cut must not travel through the design with it.
  it("in the view stay put when only the point the view turns about moves", () => {
    const before = sectionFrameFromView({ x: 0, y: 0, z: 0 }, { x: 0, y: -1, z: -1 }, { x: 1, y: 0, z: 0 })!;
    const after = sectionFrameFromView({ x: 30, y: 4, z: -12 }, { x: 0, y: -1, z: -1 }, { x: 1, y: 0, z: 0 })!;
    const offset = sectionOffsetInFrame("y", 5, before, after);
    const kept = (frame: SectionFrame, off: number) => computeSectionPlaneVector({ enabled: true, axis: "y", offset: off, flipped: false, showPlane: true, frame });
    const a = kept(before, 5);
    const b = kept(after, offset);
    expect(b.constant).toBeCloseTo(a.constant, 9);
    expect(dot(b.normal, a.normal)).toBeCloseTo(1, 9);
  });

  it("in the view keep the offset on a pure turn, so turning there and back is exact", () => {
    const at = (angle: number) => sectionFrameFromView({ x: 3, y: 2, z: 0 }, { x: Math.sin(angle), y: 0, z: -Math.cos(angle) }, { x: Math.cos(angle), y: 0, z: Math.sin(angle) })!;
    let frame = at(0);
    let offset = 20;
    for (let step = 1; step <= 24; step += 1) {
      const next = at((step * 15 * Math.PI) / 180);
      offset = sectionOffsetInFrame("y", offset, frame, next);
      frame = next;
    }
    expect(offset).toBeCloseTo(20, 9);
    expect(sectionOffsetInFrame("y", 20, at(Math.PI / 2), at(0))).toBeCloseTo(20, 9);
  });
});
