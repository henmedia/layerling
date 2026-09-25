import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { groundFootprintForFrame, liftGeometryForFrame, type SelectionFrame } from "@/lib/liftGeometry";
import { horizontalPlacementWorkplane, type PlacementWorkplane } from "@/lib/placementWorkplane";

function createSelectionFrame(overrides: Partial<SelectionFrame> = {}): SelectionFrame {
  const width = overrides.width ?? 10;
  const height = overrides.height ?? 20;
  const depth = overrides.depth ?? 30;
  return {
    ids: ["test-shape"],
    center: overrides.center ?? new THREE.Vector3(0, height / 2, 0),
    quaternion: overrides.quaternion ?? new THREE.Quaternion(),
    xAxis: overrides.xAxis ?? new THREE.Vector3(1, 0, 0),
    yAxis: overrides.yAxis ?? new THREE.Vector3(0, 1, 0),
    zAxis: overrides.zAxis ?? new THREE.Vector3(0, 0, 1),
    width,
    height,
    depth,
    min: new THREE.Vector3(-width / 2, -height / 2, -depth / 2),
    max: new THREE.Vector3(width / 2, height / 2, depth / 2),
    singleShape: null,
    ...overrides,
  };
}

describe("liftGeometryForFrame", () => {
  const basePlane = horizontalPlacementWorkplane(0);

  it("calculates correct lift geometry for an unrotated shape on the base workplane", () => {
    const frame = createSelectionFrame({
      width: 10,
      height: 20,
      depth: 30,
      center: new THREE.Vector3(0, 10, 0),
    });

    const lift = liftGeometryForFrame(frame, basePlane);

    expect(lift.axis.x).toBeCloseTo(0);
    expect(lift.axis.y).toBeCloseTo(1);
    expect(lift.axis.z).toBeCloseTo(0);
    expect(lift.low).toBeCloseTo(0);
    expect(lift.high).toBeCloseTo(20);
    expect(lift.height).toBeCloseTo(20);
    expect(lift.elevation).toBeCloseTo(0);
    expect(lift.pointAt(lift.low)).toEqual(new THREE.Vector3(0, 0, 0));
    expect(lift.pointAt(lift.high)).toEqual(new THREE.Vector3(0, 20, 0));
  });

  it("calculates positive elevation when lifted above the base workplane", () => {
    const frame = createSelectionFrame({
      width: 10,
      height: 20,
      depth: 30,
      center: new THREE.Vector3(0, 25, 0),
    });

    const lift = liftGeometryForFrame(frame, basePlane);

    expect(lift.low).toBeCloseTo(15);
    expect(lift.high).toBeCloseTo(35);
    expect(lift.elevation).toBeCloseTo(15);
    expect(lift.pointAt(0)).toEqual(new THREE.Vector3(0, 0, 0));
    expect(lift.pointAt(lift.elevation)).toEqual(new THREE.Vector3(0, 15, 0));
  });

  it("returns zero elevation when intersecting the base workplane", () => {
    const frame = createSelectionFrame({
      width: 10,
      height: 20,
      depth: 30,
      center: new THREE.Vector3(0, 5, 0),
    });

    const lift = liftGeometryForFrame(frame, basePlane);

    expect(lift.low).toBeCloseTo(-5);
    expect(lift.high).toBeCloseTo(15);
    expect(lift.elevation).toBeCloseTo(0);
  });

  it("calculates negative elevation when entirely below the base workplane", () => {
    const frame = createSelectionFrame({
      width: 10,
      height: 20,
      depth: 30,
      center: new THREE.Vector3(0, -25, 0),
    });

    const lift = liftGeometryForFrame(frame, basePlane);

    expect(lift.low).toBeCloseTo(-35);
    expect(lift.high).toBeCloseTo(-15);
    expect(lift.elevation).toBeCloseTo(-15);
  });

  it("keeps lift axis aligned to workplane normal when rotated 90 degrees about X (Issue #19)", () => {
    // Rotated 90° about X:
    // xAxis stays (1, 0, 0)
    // yAxis points along world +Z (0, 0, 1) -> horizontal!
    // zAxis points along world -Y (0, -1, 0)
    const frame = createSelectionFrame({
      width: 10,
      height: 20,
      depth: 30,
      xAxis: new THREE.Vector3(1, 0, 0),
      yAxis: new THREE.Vector3(0, 0, 1),
      zAxis: new THREE.Vector3(0, -1, 0),
      center: new THREE.Vector3(0, 15, 0), // depth / 2 = 15 above workplane
    });

    const lift = liftGeometryForFrame(frame, basePlane);

    // Axis must be workplane normal (0, 1, 0), NOT frame.yAxis (0, 0, 1)
    expect(lift.axis.x).toBeCloseTo(0);
    expect(lift.axis.y).toBeCloseTo(1);
    expect(lift.axis.z).toBeCloseTo(0);

    // Extent along world Y comes from depth (zAxis), which is 30 -> reach is 15
    expect(lift.low).toBeCloseTo(0);
    expect(lift.high).toBeCloseTo(30);
    expect(lift.height).toBeCloseTo(30);
    expect(lift.elevation).toBeCloseTo(0);

    // Top point along lift axis is at y = 30
    expect(lift.pointAt(lift.high)).toEqual(new THREE.Vector3(0, 30, 0));
    expect(lift.pointAt(lift.low)).toEqual(new THREE.Vector3(0, 0, 0));
  });

  it("keeps lift axis aligned to workplane normal when rotated 90 degrees about Z", () => {
    // Rotated 90° about Z:
    // xAxis points along world +Y (0, 1, 0)
    // yAxis points along world -X (-1, 0, 0) -> horizontal!
    // zAxis stays (0, 0, 1)
    const frame = createSelectionFrame({
      width: 10,
      height: 20,
      depth: 30,
      xAxis: new THREE.Vector3(0, 1, 0),
      yAxis: new THREE.Vector3(-1, 0, 0),
      zAxis: new THREE.Vector3(0, 0, 1),
      center: new THREE.Vector3(0, 5, 0), // width / 2 = 5 above workplane
    });

    const lift = liftGeometryForFrame(frame, basePlane);

    expect(lift.axis.x).toBeCloseTo(0);
    expect(lift.axis.y).toBeCloseTo(1);
    expect(lift.axis.z).toBeCloseTo(0);

    // Extent along world Y comes from width (xAxis), which is 10 -> reach is 5
    expect(lift.low).toBeCloseTo(0);
    expect(lift.high).toBeCloseTo(10);
    expect(lift.height).toBeCloseTo(10);
    expect(lift.elevation).toBeCloseTo(0);
  });

  it("correctly computes reach for a 45 degree rotation about X", () => {
    const angle = Math.PI / 4;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const frame = createSelectionFrame({
      width: 20,
      height: 20,
      depth: 20,
      xAxis: new THREE.Vector3(1, 0, 0),
      yAxis: new THREE.Vector3(0, cos, sin),
      zAxis: new THREE.Vector3(0, -sin, cos),
      center: new THREE.Vector3(0, 20 * Math.SQRT2, 0),
    });

    const lift = liftGeometryForFrame(frame, basePlane);
    const expectedReach = 10 * Math.SQRT2; // 10 * cos(45) + 10 * sin(45)

    expect(lift.high - lift.low).toBeCloseTo(2 * expectedReach);
  });

  it("works with a tilted or offset placement workplane", () => {
    const verticalWorkplane: PlacementWorkplane = {
      origin: { x: 10, y: 0, z: 50 },
      normal: { x: 0, y: 0, z: 1 },
      xAxis: { x: 1, y: 0, z: 0 },
      zAxis: { x: 0, y: -1, z: 0 },
    };

    const frame = createSelectionFrame({
      width: 20,
      height: 20,
      depth: 10,
      center: new THREE.Vector3(10, 10, 60), // 10 units along normal from z=50
    });

    const lift = liftGeometryForFrame(frame, verticalWorkplane);

    expect(lift.axis.x).toBeCloseTo(0);
    expect(lift.axis.y).toBeCloseTo(0);
    expect(lift.axis.z).toBeCloseTo(1);

    // Extent along z is depth (10) -> reach is 5
    // Center is at z=60, origin is at z=50 -> centerHeight is 10
    // low = 10 - 5 = 5, high = 10 + 5 = 15
    expect(lift.low).toBeCloseTo(5);
    expect(lift.high).toBeCloseTo(15);
    expect(lift.elevation).toBeCloseTo(5);
    expect(lift.pointAt(0)).toEqual(new THREE.Vector3(10, 10, 50));
    expect(lift.pointAt(lift.elevation)).toEqual(new THREE.Vector3(10, 10, 55));
  });
});

describe("groundFootprintForFrame", () => {
  const basePlane = horizontalPlacementWorkplane(0);
  // rotationX 90: the shape's own y axis lies flat along world z.
  const turnedX = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
  const turnedAxes = {
    quaternion: turnedX,
    xAxis: new THREE.Vector3(1, 0, 0).applyQuaternion(turnedX),
    yAxis: new THREE.Vector3(0, 1, 0).applyQuaternion(turnedX),
    zAxis: new THREE.Vector3(0, 0, 1).applyQuaternion(turnedX),
  };

  function bounds(points: THREE.Vector3[]) {
    return new THREE.Box3().setFromPoints(points);
  }

  it("draws nothing for a shape standing on the workplane", () => {
    const frame = createSelectionFrame({ center: new THREE.Vector3(0, 10, 0) });
    expect(groundFootprintForFrame(frame, basePlane)).toBeNull();
  });

  it("draws the frame's own rectangle under a lifted unrotated shape", () => {
    const frame = createSelectionFrame({ center: new THREE.Vector3(5, 25, -3) });
    const footprint = groundFootprintForFrame(frame, basePlane);

    expect(footprint).toHaveLength(4);
    const box = bounds(footprint!);
    expect(box.min.x).toBeCloseTo(0);
    expect(box.max.x).toBeCloseTo(10);
    expect(box.min.z).toBeCloseTo(-18);
    expect(box.max.z).toBeCloseTo(12);
    expect(box.min.y).toBeCloseTo(0.04);
    expect(box.max.y).toBeCloseTo(0.04);
  });

  it("draws nothing for a 90 degree turned shape lying on the workplane away from the origin", () => {
    // Regression (#19 comment): the footprint was measured along the shape's
    // own y axis, read the 40 mm sideways offset as a height and stood upright.
    const frame = createSelectionFrame({
      ...turnedAxes,
      width: 20,
      height: 20,
      depth: 20,
      center: new THREE.Vector3(0, 10, 40),
    });

    expect(groundFootprintForFrame(frame, basePlane)).toBeNull();
  });

  it("lays the footprint of a lifted 90 degree turned shape flat on the workplane", () => {
    const frame = createSelectionFrame({
      ...turnedAxes,
      width: 20,
      height: 30,
      depth: 20,
      center: new THREE.Vector3(0, 25, 40),
    });
    const footprint = groundFootprintForFrame(frame, basePlane);

    expect(footprint).toHaveLength(4);
    const box = bounds(footprint!);
    expect(box.min.y).toBeCloseTo(0.04);
    expect(box.max.y).toBeCloseTo(0.04);
    expect(box.min.x).toBeCloseTo(-10);
    expect(box.max.x).toBeCloseTo(10);
    // The turned height (30) now runs along world z.
    expect(box.min.z).toBeCloseTo(25);
    expect(box.max.z).toBeCloseTo(55);
  });

  it("wraps a 45 degree turned shape in the outline of its projection", () => {
    const turned = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 4);
    const frame = createSelectionFrame({
      quaternion: turned,
      xAxis: new THREE.Vector3(1, 0, 0).applyQuaternion(turned),
      yAxis: new THREE.Vector3(0, 1, 0).applyQuaternion(turned),
      zAxis: new THREE.Vector3(0, 0, 1).applyQuaternion(turned),
      width: 10,
      height: 10,
      depth: 10,
      center: new THREE.Vector3(0, 30, 0),
    });
    const footprint = groundFootprintForFrame(frame, basePlane);

    expect(footprint).toHaveLength(4);
    const box = bounds(footprint!);
    const halfDiagonal = Math.SQRT2 * 5;
    expect(box.min.z).toBeCloseTo(-halfDiagonal);
    expect(box.max.z).toBeCloseTo(halfDiagonal);
    expect(box.min.x).toBeCloseTo(-5);
    expect(box.max.x).toBeCloseTo(5);
  });

  it("draws a footprint for a shape below the workplane", () => {
    const frame = createSelectionFrame({ center: new THREE.Vector3(0, -20, 0) });
    expect(groundFootprintForFrame(frame, basePlane)).toHaveLength(4);
  });
});
