import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { pivotBoxCorners, scrollAxisMetrics, scrollDistance, scrollViewAlong } from "@/lib/viewScroll";

/** Scrollbars for the 3D view (Discussion #1241): what the thumbs show and how far a drag moves the view. */
describe("view scrollbars", () => {
  const plate = pivotBoxCorners({ halfWidth: 100, halfDepth: 100, minY: 0, maxY: 0 });
  const right = new THREE.Vector3(1, 0, 0);

  it("puts the thumb in the middle for a view centred on the plate, as long as its share of the track", () => {
    const m = scrollAxisMetrics(plate, right, new THREE.Vector3(0, 0, 0), 50);
    // The track: the plate's 200 mm widened by half the view at each end.
    expect(m.length).toBeCloseTo(250);
    expect(m.size).toBeCloseTo(50 / 250);
    expect(m.start + m.size / 2).toBeCloseTo(0.5);
  });

  it("runs the thumb to the ends when the view's centre stands on the plate's edges", () => {
    expect(scrollAxisMetrics(plate, right, new THREE.Vector3(-100, 0, 0), 50).start).toBeCloseTo(0);
    const atRight = scrollAxisMetrics(plate, right, new THREE.Vector3(100, 0, 0), 50);
    expect(atRight.start + atRight.size).toBeCloseTo(1);
  });

  it("keeps a thumb that is easy to catch when zoomed in close", () => {
    expect(scrollAxisMetrics(plate, right, new THREE.Vector3(0, 0, 0), 0.5).size).toBeGreaterThanOrEqual(0.06);
  });

  it("takes in a view that stands past the plate, so the thumb stays on the track", () => {
    const m = scrollAxisMetrics(plate, right, new THREE.Vector3(160, 0, 0), 50);
    expect(m.start).toBeGreaterThanOrEqual(0);
    expect(m.start + m.size).toBeLessThanOrEqual(1 + 1e-9);
  });

  it("moves the view so that the thumb follows the pointer", () => {
    const pivot = new THREE.Vector3(0, 0, 0);
    const before = scrollAxisMetrics(plate, right, pivot, 50);
    // A drag over a tenth of the track.
    const moved = scrollDistance(before, 50, 0.1);
    const after = scrollAxisMetrics(plate, right, pivot.clone().addScaledVector(right, moved), 50);
    expect(after.start - before.start).toBeCloseTo(0.1);
    // Also with a thumb held at its shortest, longer than the view's share.
    const close = scrollAxisMetrics(plate, right, pivot, 0.5);
    const step = scrollDistance(close, 0.5, 0.1);
    expect(scrollAxisMetrics(plate, right, pivot.clone().addScaledVector(right, step), 0.5).start - close.start).toBeCloseTo(0.1);
  });

  it("slides camera and pivot together, so nothing turns", () => {
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.set(0, 100, 100);
    const target = new THREE.Vector3(0, 0, 0);
    let updates = 0;
    const view = { camera, controls: { target, minPolarAngle: 0, maxPolarAngle: Math.PI, update: () => (updates += 1) } };
    const offsetBefore = camera.position.clone().sub(target);
    scrollViewAlong(view, right, 12);
    expect(target.x).toBeCloseTo(12);
    expect(camera.position.clone().sub(target).distanceTo(offsetBefore)).toBeCloseTo(0);
    expect(updates).toBe(1);
    scrollViewAlong(view, right, 0);
    expect(updates).toBe(1);
  });
});
