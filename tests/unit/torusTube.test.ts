import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { cadModifierPrimitiveForAnalyticShape } from "@/lib/cadBakeMetadata";
import { createTorusGeometry } from "@/components/workplane/viewportShapeObjects";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { TORUS_CLOSED_TUBE_RATIO, TORUS_MAX_TUBE_RATIO, torusTubeRatio } from "@/lib/torusShape";
import { canonicalizeShape } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * #981: a torus of 10 mm set to 5 mm high closed its hole, because the height was the tube.
 * Now the tube has its own thickness, kept as a share of the outer size, and the height only
 * squashes or stretches it - the way a flat ring is meant to look.
 */

function torusShape(overrides: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return {
    id: "torus-shape",
    name: "Torus",
    kind: "torus",
    color: "#0098c7",
    x: 0,
    z: 0,
    elevation: 0,
    size: 10,
    width: 10,
    depth: 10,
    height: 2,
    rotation: 0,
    rotationX: 0,
    rotationZ: 0,
    locked: false,
    hidden: false,
    ...overrides,
  };
}

/** The smallest distance from the axis any point of the torus reaches: the radius of the hole. */
function holeRadius(shape: WorkplaneShape) {
  const geometry = createTorusGeometry(shape.width ?? 0, shape.height, shape.depth ?? 0, shape);
  const position = geometry.getAttribute("position");
  let inner = Infinity;
  for (let index = 0; index < position.count; index += 1) {
    inner = Math.min(inner, Math.hypot(position.getX(index), position.getZ(index)));
  }
  return inner;
}

function bounds(shape: WorkplaneShape) {
  const geometry = createTorusGeometry(shape.width ?? 0, shape.height, shape.depth ?? 0, shape);
  geometry.computeBoundingBox();
  return geometry.boundingBox!.getSize(new THREE.Vector3());
}

describe("torus tube thickness (#981)", () => {
  it("keeps the hole open when a 10 mm torus is set to 5 mm high", () => {
    const flat = canonicalizeShape(torusShape());
    expect(flat.torusTubeRatio).toBeCloseTo(0.2);
    const taller = canonicalizeShape({ ...flat, height: 5 });
    expect(taller.torusTubeRatio).toBeCloseTo(0.2);
    // Tube 2 mm across, so the hole is 6 mm wide whatever the height.
    expect(holeRadius(taller)).toBeCloseTo(3, 1);
    const size = bounds(taller);
    expect(size.x).toBeCloseTo(10, 3);
    expect(size.y).toBeCloseTo(5, 3);
    expect(size.z).toBeCloseTo(10, 3);
  });

  it("draws a torus from before #981 exactly as it was, its height as the tube", () => {
    const old = torusShape({ width: 34, depth: 34, size: 34, height: 8 });
    expect(old.torusTubeRatio).toBeUndefined();
    const loaded = canonicalizeShape(old);
    expect(loaded.torusTubeRatio).toBeCloseTo(8 / 34);
    const before = createTorusGeometry(34, 8, 34, old).getAttribute("position").array;
    const after = createTorusGeometry(34, 8, 34, loaded).getAttribute("position").array;
    expect(after.length).toBe(before.length);
    for (let index = 0; index < before.length; index += 1) {
      expect(after[index]).toBeCloseTo(before[index], 5);
    }
  });

  it("scales the tube along with the outer size", () => {
    const shape = canonicalizeShape(torusShape({ width: 20, depth: 20, size: 20, height: 4 }));
    const halved = canonicalizeShape({ ...shape, width: 10, depth: 10, size: 10, height: 2 });
    expect(holeRadius(halved)).toBeCloseTo(holeRadius(shape) / 2, 1);
  });

  it("closes the hole only at half the outer size", () => {
    const shape = canonicalizeShape(torusShape({ torusTubeRatio: TORUS_CLOSED_TUBE_RATIO }));
    expect(holeRadius(shape)).toBeLessThan(0.3);
    const open = canonicalizeShape(torusShape({ torusTubeRatio: 0.4 }));
    expect(holeRadius(open)).toBeGreaterThan(0.5);
  });

  // #2187: a tube wider than the ring leaves a dimple where the hole was, and the whole outer size is a sphere.
  it("draws a tube wider than the ring as a closed spindle torus with a dimple on top and below", () => {
    const shape = canonicalizeShape(torusShape({ width: 100, depth: 100, height: 70, size: 100, torusTubeRatio: 0.7 }));
    const geometry = createTorusGeometry(100, 70, 100, shape);
    const position = geometry.getAttribute("position");
    let volume = 0;
    let topOnAxis = -Infinity;
    for (let index = 0; index + 2 < position.count; index += 3) {
      const [a, b, c] = [0, 1, 2].map((offset) => new THREE.Vector3().fromBufferAttribute(position, index + offset));
      volume += a.dot(b.clone().cross(c)) / 6;
      [a, b, c].forEach((point) => {
        if (Math.hypot(point.x, point.z) < 1e-6) topOnAxis = Math.max(topOnAxis, point.y);
      });
    }
    // Tube radius 35 about a ring of 15: the dimple's tip lies sqrt(35² - 15²) above the middle.
    expect(topOnAxis).toBeCloseTo(Math.sqrt(35 * 35 - 15 * 15), 3);
    // The volume of the spindle torus: the turned part of the circle outside the axis, summed in thin slices.
    const R = 15;
    const r = 35;
    let sampled = 0;
    const n = 4000;
    for (let i = 0; i < n; i += 1) {
      const y = -r + ((i + 0.5) / n) * 2 * r;
      const half = Math.sqrt(r * r - y * y);
      const outer = R + half;
      const inner = Math.max(0, R - half);
      sampled += Math.PI * (outer * outer - inner * inner) * (2 * r / n);
    }
    expect(volume).toBeGreaterThan(sampled * 0.995);
    expect(volume).toBeLessThan(sampled * 1.001);
    geometry.computeBoundingBox();
    const size = geometry.boundingBox!.getSize(new THREE.Vector3());
    expect(size.x).toBeCloseTo(100, 3);
    expect(size.y).toBeCloseTo(70, 3);
  });

  it("lets the tube grow to the whole outer size, a sphere", () => {
    expect(TORUS_MAX_TUBE_RATIO).toBe(1);
    const sphere = canonicalizeShape(torusShape({ width: 20, depth: 20, height: 20, size: 20, torusTubeRatio: 1 }));
    const primitive = cadModifierPrimitiveForAnalyticShape(sphere);
    expect(primitive?.kind).toBe("torus");
    expect(primitive && "majorRadius" in primitive ? primitive.majorRadius : NaN).toBeCloseTo(0, 6);
    const geometry = createTorusGeometry(20, 20, 20, sphere);
    const position = geometry.getAttribute("position");
    let volume = 0;
    for (let index = 0; index + 2 < position.count; index += 3) {
      const [a, b, c] = [0, 1, 2].map((offset) => new THREE.Vector3().fromBufferAttribute(position, index + offset));
      volume += a.dot(b.clone().cross(c)) / 6;
    }
    expect(volume).toBeGreaterThan((4 / 3) * Math.PI * 1000 * 0.99);
    expect(volume).toBeLessThan((4 / 3) * Math.PI * 1000 * 1.0001);
  });

  it("gives a new torus from the shapes menu the tube its height shows", () => {
    const asset = toolbarShapeAssets.find((entry) => entry.kind === "torus")!;
    const shape = makeShapeFromAsset(asset);
    expect(shape.torusTubeRatio).toBeCloseTo(torusTubeRatio({ width: shape.width, depth: shape.depth, height: shape.height, size: shape.size }));
  });

  it("stays an exact CAD torus only while the tube is as thick as the torus is high", () => {
    const round = canonicalizeShape(torusShape());
    expect(cadModifierPrimitiveForAnalyticShape(round)?.kind).toBe("torus");
    const squashed = canonicalizeShape({ ...round, height: 5 });
    expect(cadModifierPrimitiveForAnalyticShape(squashed)).toBeNull();
  });
});
