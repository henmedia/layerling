import * as THREE from "three";
import { describe, expect, it } from "vitest";
import {
  axisLockedPoint,
  tapeLengthShift,
  circleOfEdgePoints,
  perpendicularFootOnPlane,
  perpendicularFootOnSegment,
  perpendicularPointsOnCircle,
  pointAcrossCircle,
  pointOnCircle,
} from "@/lib/tapeCircle";

/** A ring of `count` points on a circle, as a display edge has them; `closed` repeats the first point at the end. */
function ring(center: THREE.Vector3, radius: number, count: number, closed = true, normal = new THREE.Vector3(0, 1, 0), span = Math.PI * 2) {
  const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal.clone().normalize());
  const points: THREE.Vector3[] = [];
  const steps = closed ? count : count - 1;
  for (let index = 0; index <= steps; index += 1) {
    const angle = (index / steps) * span;
    points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius).applyQuaternion(quaternion).add(center));
  }
  return points;
}

describe("the circle of an edge, for the diameter of a measurement (#308)", () => {
  it("finds the centre and radius of a ring", () => {
    const center = new THREE.Vector3(12, 5, -7);
    const circle = circleOfEdgePoints(ring(center, 15, 64));
    expect(circle).not.toBeNull();
    expect(circle!.center.distanceTo(center)).toBeCloseTo(0, 6);
    expect(circle!.radius).toBeCloseTo(15, 6);
    expect(Math.abs(circle!.normal.y)).toBeCloseTo(1, 6);
  });

  it("finds it on a tilted ring and on an arc as well", () => {
    const center = new THREE.Vector3(-3, 2, 9);
    const tilted = circleOfEdgePoints(ring(center, 8, 48, true, new THREE.Vector3(1, 2, 3)));
    expect(tilted!.center.distanceTo(center)).toBeCloseTo(0, 6);
    expect(tilted!.radius).toBeCloseTo(8, 6);
    const arc = circleOfEdgePoints(ring(center, 8, 24, false, new THREE.Vector3(0, 0, 1), Math.PI * 0.8));
    expect(arc!.center.distanceTo(center)).toBeCloseTo(0, 6);
    expect(arc!.radius).toBeCloseTo(8, 6);
  });

  it("says no for a straight edge, an ellipse and a path that leaves the plane", () => {
    const line = Array.from({ length: 10 }, (_, index) => new THREE.Vector3(index, 0, 0));
    expect(circleOfEdgePoints(line)).toBeNull();
    const ellipse = ring(new THREE.Vector3(), 10, 64).map((point) => new THREE.Vector3(point.x * 1.5, point.y, point.z));
    expect(circleOfEdgePoints(ellipse)).toBeNull();
    const helix = ring(new THREE.Vector3(), 10, 64).map((point, index) => new THREE.Vector3(point.x, index * 0.2, point.z));
    expect(circleOfEdgePoints(helix)).toBeNull();
    expect(circleOfEdgePoints(ring(new THREE.Vector3(), 10, 3, false))).toBeNull();
  });

  it("gives the point across the circle, which makes the exact diameter", () => {
    const center = new THREE.Vector3(12, 5, -7);
    const circle = circleOfEdgePoints(ring(center, 15, 64))!;
    const start = new THREE.Vector3(12 + 15 * Math.cos(1), 5, -7 + 15 * Math.sin(1));
    const across = pointAcrossCircle(circle, start)!;
    expect(across.distanceTo(start)).toBeCloseTo(30, 6);
    expect(across.clone().add(start).multiplyScalar(0.5).distanceTo(center)).toBeCloseTo(0, 6);
  });

  it("puts a point from the side of the polygon onto the true circle", () => {
    const polygon = ring(new THREE.Vector3(0, 3, 0), 15, 24);
    const circle = circleOfEdgePoints(polygon)!;
    // The middle of a side lies inside the circle by the sagitta.
    const middle = polygon[0].clone().add(polygon[1]).multiplyScalar(0.5);
    expect(middle.clone().sub(circle.center).length()).toBeLessThan(15 - 0.05);
    const placed = pointOnCircle(circle, middle);
    expect(placed.clone().sub(circle.center).length()).toBeCloseTo(15, 9);
    expect(placed.y).toBeCloseTo(3, 9);
    // Two such points across each other are exactly a diameter apart.
    const across = pointAcrossCircle(circle, placed)!;
    expect(across.distanceTo(placed)).toBeCloseTo(30, 9);
  });

  it("gives nothing when the first point is not on the circle", () => {
    const circle = circleOfEdgePoints(ring(new THREE.Vector3(), 15, 64))!;
    expect(pointAcrossCircle(circle, new THREE.Vector3(3, 0, 3))).toBeNull();
  });
});

describe("perpendicular snapping and axis locking for the tape measure (#589)", () => {
  it("finds the perpendicular foot on an opposing edge segment", () => {
    const from = new THREE.Vector3(4, 3, -5);
    const a = new THREE.Vector3(0, 3, 10);
    const b = new THREE.Vector3(20, 3, 10);
    const foot = perpendicularFootOnSegment(from, a, b);
    expect(foot).not.toBeNull();
    expect(foot!.point.x).toBeCloseTo(4, 9);
    expect(foot!.point.y).toBeCloseTo(3, 9);
    expect(foot!.point.z).toBeCloseTo(10, 9);
    expect(foot!.amount).toBeCloseTo(0.2, 9);
    // The measurement line meets the edge at a right angle.
    expect(foot!.point.clone().sub(from).dot(b.clone().sub(a))).toBeCloseTo(0, 9);
  });

  it("returns null when the perpendicular foot falls outside the segment or on the start point itself", () => {
    const a = new THREE.Vector3(0, 0, 10);
    const b = new THREE.Vector3(20, 0, 10);
    expect(perpendicularFootOnSegment(new THREE.Vector3(-2, 0, 0), a, b)).toBeNull();
    expect(perpendicularFootOnSegment(new THREE.Vector3(25, 0, 0), a, b)).toBeNull();
    expect(perpendicularFootOnSegment(new THREE.Vector3(8, 0, 10), a, b)).toBeNull();
  });

  it("finds the perpendicular foot on an opposing face plane, including tilted faces", () => {
    const from = new THREE.Vector3(2, 7, -4);
    const foot = perpendicularFootOnPlane(from, new THREE.Vector3(15, 0, 99), new THREE.Vector3(1, 0, 0));
    expect(foot).not.toBeNull();
    expect(foot!.x).toBeCloseTo(15, 9);
    expect(foot!.y).toBeCloseTo(7, 9);
    expect(foot!.z).toBeCloseTo(-4, 9);
    expect(foot!.distanceTo(from)).toBeCloseTo(13, 9);

    // A start point that already lies in the plane has no perpendicular line to it.
    expect(perpendicularFootOnPlane(new THREE.Vector3(15, 7, -4), new THREE.Vector3(15, 0, 0), new THREE.Vector3(1, 0, 0))).toBeNull();
  });

  it("finds the radial near and far points on a circular edge from an outside or offset point", () => {
    const circle = circleOfEdgePoints(ring(new THREE.Vector3(0, 0, 0), 10, 64))!;
    // From an outer wall at x = 25, the radial points on the hole rim are at x = 10 and x = -10.
    const points = perpendicularPointsOnCircle(circle, new THREE.Vector3(25, 0, 0));
    expect(points).toHaveLength(2);
    expect(points[0].distanceTo(new THREE.Vector3(10, 0, 0))).toBeCloseTo(0, 6);
    expect(points[1].distanceTo(new THREE.Vector3(-10, 0, 0))).toBeCloseTo(0, 6);
    // From a point on the upper rim of a hole to the lower rim directly below it, only the point directly below is kept.
    const bottomCircle = circleOfEdgePoints(ring(new THREE.Vector3(0, 0, 0), 10, 64))!;
    const fromTopRim = new THREE.Vector3(10, 12, 0);
    const bottomPoints = perpendicularPointsOnCircle(bottomCircle, fromTopRim);
    expect(bottomPoints[0].distanceTo(new THREE.Vector3(10, 0, 0))).toBeCloseTo(0, 6);
  });

  it("locks a measurement along a face or the workplane to the dominant axis when Shift is held", () => {
    const from = new THREE.Vector3(10, 2, 3);
    const verticalWallNormal = new THREE.Vector3(1, 0, 0);
    const upWall = axisLockedPoint(from, new THREE.Vector3(10, 18, 5.4), verticalWallNormal);
    expect(upWall.x).toBeCloseTo(10, 9);
    expect(upWall.y).toBeCloseTo(18, 9);
    expect(upWall.z).toBeCloseTo(3, 9);

    const acrossWall = axisLockedPoint(from, new THREE.Vector3(10, 2.8, 25), verticalWallNormal);
    expect(acrossWall.x).toBeCloseTo(10, 9);
    expect(acrossWall.y).toBeCloseTo(2, 9);
    expect(acrossWall.z).toBeCloseTo(25, 9);
  });
});


describe("a typed tape length (#823, #963)", () => {
  // The edge of a box at x = 40, the left edge of a hole at x = 60: 20 mm apart.
  const edge = new THREE.Vector3(40, 0, 10);
  const hole = new THREE.Vector3(60, 0, 10);

  it("moves the body at the second point closer or further along the line", () => {
    expect(tapeLengthShift(edge, hole, 5, true)!.distanceTo(new THREE.Vector3(-15, 0, 0))).toBeLessThan(1e-9);
    expect(tapeLengthShift(edge, hole, 30, true)!.distanceTo(new THREE.Vector3(10, 0, 0))).toBeLessThan(1e-9);
  });

  it("takes it past the first point for a negative length, into the box", () => {
    const shift = tapeLengthShift(edge, hole, -5, true)!;
    expect(hole.clone().add(shift).distanceTo(new THREE.Vector3(35, 0, 10))).toBeLessThan(1e-9);
  });

  it("moves the body at the first point the other way when that one moves", () => {
    const shift = tapeLengthShift(edge, hole, -5, false)!;
    expect(edge.clone().add(shift).distanceTo(new THREE.Vector3(65, 0, 10))).toBeLessThan(1e-9);
  });

  it("gives no direction for two points on top of each other", () => {
    expect(tapeLengthShift(edge, edge.clone(), 5, true)).toBeNull();
  });
});
