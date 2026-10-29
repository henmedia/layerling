import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { cadModifierPrimitiveForAnalyticShape } from "@/lib/cadBakeMetadata";
import { createTorusGeometry } from "@/components/workplane/viewportShapeObjects";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { TORUS_MAX_TUBE_RATIO, torusTubeRatio } from "@/lib/torusShape";
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
    const shape = canonicalizeShape(torusShape({ torusTubeRatio: TORUS_MAX_TUBE_RATIO }));
    expect(holeRadius(shape)).toBeLessThan(0.3);
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
