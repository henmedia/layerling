import { describe, expect, it } from "vitest";
import * as THREE from "three";
import type { WorkplaneShape } from "@/types/layerling";
import { meshForShape } from "@/lib/editorMeshCore";
import { Brush, Evaluator, SUBTRACTION } from "three-bvh-csg";
import {
  buildRoundedRectContour,
  createRoundedBoxGeometry,
  normalizeCornerFillets,
  normalizeCornerFillet,
  normalizeEndFillets,
  normalizeTopBottomFillet,
  normalizeRoundedBoxQuality,
} from "@/lib/roundedBoxGeometry";

function edgeUseCounts(position: { count: number; getX: (index: number) => number; getY: (index: number) => number; getZ: (index: number) => number }) {
  const uses = new Map<string, number>();
  const keyForPoint = (index: number) => [position.getX(index), position.getY(index), position.getZ(index)]
    .map((value) => value.toFixed(5))
    .join(",");
  for (let index = 0; index + 2 < position.count; index += 3) {
    const triangle = [keyForPoint(index), keyForPoint(index + 1), keyForPoint(index + 2)];
    for (let edge = 0; edge < 3; edge += 1) {
      const a = triangle[edge];
      const b = triangle[(edge + 1) % 3];
      const key = a < b ? `${a}:${b}` : `${b}:${a}`;
      uses.set(key, (uses.get(key) ?? 0) + 1);
    }
  }
  return uses;
}

function signedVolume(position: { count: number; getX: (index: number) => number; getY: (index: number) => number; getZ: (index: number) => number }) {
  let volume = 0;
  for (let i = 0; i + 2 < position.count; i += 3) {
    const ax = position.getX(i), ay = position.getY(i), az = position.getZ(i);
    const bx = position.getX(i + 1), by = position.getY(i + 1), bz = position.getZ(i + 1);
    const cx = position.getX(i + 2), cy = position.getY(i + 2), cz = position.getZ(i + 2);
    volume += ax * (by * cz - bz * cy) + ay * (bz * cx - bx * cz) + az * (bx * cy - by * cx);
  }
  return volume / 6;
}

describe("roundedBox geometry", () => {
  it("creates a closed, watertight 2-manifold rounded box with only vertical corner fillets", () => {
    const geometry = createRoundedBoxGeometry({
      width: 40,
      depth: 30,
      height: 20,
      cornerFillet: 5,
      topBottomFillet: 0,
      roundedBoxQuality: 8,
    });
    const position = geometry.getAttribute("position");

    expect(position.count).toBeGreaterThan(40);
    expect(signedVolume(position)).toBeGreaterThan(0);
    expect([...edgeUseCounts(position).values()].every((uses) => uses === 2)).toBe(true);

    expect(geometry.boundingBox?.min.y).toBeCloseTo(0, 4);
    expect(geometry.boundingBox?.max.y).toBeCloseTo(20, 4);
    expect((geometry.boundingBox?.max.x ?? 0) - (geometry.boundingBox?.min.x ?? 0)).toBeCloseTo(40, 3);
    expect((geometry.boundingBox?.max.z ?? 0) - (geometry.boundingBox?.min.z ?? 0)).toBeCloseTo(30, 3);
  });

  it("creates a closed, watertight 2-manifold rounded box with both corner and top/bottom fillets", () => {
    const geometry = createRoundedBoxGeometry({
      width: 50,
      depth: 40,
      height: 25,
      cornerFillet: 6,
      topBottomFillet: 4,
      roundedBoxQuality: 8,
    });
    const position = geometry.getAttribute("position");

    expect(position.count).toBeGreaterThan(40);
    expect(signedVolume(position)).toBeGreaterThan(0);
    expect([...edgeUseCounts(position).values()].every((uses) => uses === 2)).toBe(true);

    expect(geometry.boundingBox?.min.y).toBeCloseTo(0, 4);
    expect(geometry.boundingBox?.max.y).toBeCloseTo(25, 4);
    expect((geometry.boundingBox?.max.x ?? 0) - (geometry.boundingBox?.min.x ?? 0)).toBeCloseTo(50, 3);
    expect((geometry.boundingBox?.max.z ?? 0) - (geometry.boundingBox?.min.z ?? 0)).toBeCloseTo(40, 3);
  });

  it("keeps the corner radius constant when changing dimensions (no stretching)", () => {
    const r = 5;
    const geomSmall = createRoundedBoxGeometry({
      width: 40,
      depth: 30,
      height: 20,
      cornerFillet: r,
      topBottomFillet: 0,
      roundedBoxQuality: 16,
    });

    const geomLarge = createRoundedBoxGeometry({
      width: 100,
      depth: 60,
      height: 20,
      cornerFillet: r,
      topBottomFillet: 0,
      roundedBoxQuality: 16,
    });

    // In small box: corner arc center is at (40/2 - 5, 30/2 - 5) = (15, 10).
    // The outermost corner point is at (20, 15), distance from center is sqrt(5^2 + 5^2) = 5*sqrt(2) approx 7.071.
    // In large box: corner arc center is at (100/2 - 5, 60/2 - 5) = (45, 25).
    // The distance from the center to any arc point must remain exactly r = 5.
    const posSmall = geomSmall.getAttribute("position");
    const posLarge = geomLarge.getAttribute("position");

    // Check that maximum extent in X and Z is exactly width/2 and depth/2
    let maxDistFromArcCenterSmall = 0;
    const arcCenterSmallX = 40 / 2 - r;
    const arcCenterSmallZ = 30 / 2 - r;
    for (let i = 0; i < posSmall.count; i += 1) {
      const x = posSmall.getX(i);
      const z = posSmall.getZ(i);
      if (x >= arcCenterSmallX && z >= arcCenterSmallZ) {
        const dist = Math.hypot(x - arcCenterSmallX, z - arcCenterSmallZ);
        if (dist > maxDistFromArcCenterSmall) maxDistFromArcCenterSmall = dist;
      }
    }

    let maxDistFromArcCenterLarge = 0;
    const arcCenterLargeX = 100 / 2 - r;
    const arcCenterLargeZ = 60 / 2 - r;
    for (let i = 0; i < posLarge.count; i += 1) {
      const x = posLarge.getX(i);
      const z = posLarge.getZ(i);
      if (x >= arcCenterLargeX && z >= arcCenterLargeZ) {
        const dist = Math.hypot(x - arcCenterLargeX, z - arcCenterLargeZ);
        if (dist > maxDistFromArcCenterLarge) maxDistFromArcCenterLarge = dist;
      }
    }

    // Both arc radii must match exactly 5 mm!
    expect(maxDistFromArcCenterSmall).toBeCloseTo(r, 2);
    expect(maxDistFromArcCenterLarge).toBeCloseTo(r, 2);
  });

  it("participates cleanly in CSG boolean operations", () => {
    const boxGeom = createRoundedBoxGeometry({
      width: 40,
      depth: 30,
      height: 20,
      cornerFillet: 5,
      topBottomFillet: 2,
    });
    const cutterGeom = new THREE.CylinderGeometry(5, 5, 30, 16);
    cutterGeom.translate(0, 10, 0);

    const boxBrush = new Brush(boxGeom);
    const cutterBrush = new Brush(cutterGeom);
    boxBrush.updateMatrixWorld(true);
    cutterBrush.updateMatrixWorld(true);

    const evaluator = new Evaluator();
    evaluator.useGroups = false;
    evaluator.attributes = ["position", "normal"];
    const result = evaluator.evaluate(boxBrush, cutterBrush, SUBTRACTION);
    const pos = result.geometry.getAttribute("position");
    expect(pos.count).toBeGreaterThan(0);
    expect(signedVolume(pos)).toBeGreaterThan(0);
  });

  it("normalizes parameters correctly", () => {
    expect(normalizeCornerFillet(null)).toBe(5);
    expect(normalizeCornerFillet(7.33)).toBe(7.33);
    // 0.25 mm used to come back as 0.3 mm (#705)
    expect(normalizeCornerFillet(0.25)).toBe(0.25);
    expect(normalizeCornerFillet(7.336)).toBe(7.34);
    expect(normalizeCornerFillet(100, 15)).toBe(15);
    expect(normalizeCornerFillet(-5)).toBe(0);

    expect(normalizeTopBottomFillet(undefined)).toBe(0);
    expect(normalizeTopBottomFillet(3.48)).toBe(3.48);
    expect(normalizeTopBottomFillet(0.25)).toBe(0.25);
    expect(normalizeTopBottomFillet(50, 8)).toBe(8);

    expect(normalizeRoundedBoxQuality(0)).toBe(1);
    expect(normalizeRoundedBoxQuality(1)).toBe(1);
    expect(normalizeRoundedBoxQuality(50)).toBe(32);
    expect(normalizeRoundedBoxQuality(12)).toBe(12);
  });

  it("takes quality 1 for chamfered corners, still watertight, with and without top and bottom rounding (#239)", () => {
    const flat = createRoundedBoxGeometry({ width: 40, depth: 30, height: 20, cornerFillet: 6, topBottomFillet: 0, roundedBoxQuality: 1 });
    const flatPosition = flat.getAttribute("position");
    expect(signedVolume(flatPosition)).toBeGreaterThan(0);
    expect([...edgeUseCounts(flatPosition).values()].every((uses) => uses === 2)).toBe(true);
    // One straight cut per corner: no vertex lies on an arc between the two cut ends.
    const corner = new Set<string>();
    for (let i = 0; i < flatPosition.count; i += 1) {
      const x = flatPosition.getX(i);
      const z = flatPosition.getZ(i);
      if (x > 14 - 1e-4 && z > 9 - 1e-4 && flatPosition.getY(i) < 1e-6) corner.add(`${x.toFixed(4)},${z.toFixed(4)}`);
    }
    expect(corner.size).toBe(2);
    const full = createRoundedBoxGeometry({ width: 50, depth: 40, height: 25, cornerFillet: 6, topBottomFillet: 4, roundedBoxQuality: 1 });
    const fullPosition = full.getAttribute("position");
    expect(signedVolume(fullPosition)).toBeGreaterThan(0);
    expect([...edgeUseCounts(fullPosition).values()].every((uses) => uses === 2)).toBe(true);
    expect((full.boundingBox?.max.x ?? 0) - (full.boundingBox?.min.x ?? 0)).toBeCloseTo(50, 3);
  });
});

describe("roundedBox chamfer (quality 1, #239)", () => {
  const chamfered = () => createRoundedBoxGeometry({ width: 40, depth: 30, height: 20, cornerFillet: 4, topBottomFillet: 3, roundedBoxQuality: 1 });

  it("is watertight with outward faces", () => {
    const position = chamfered().getAttribute("position");
    const uses = edgeUseCounts(position);
    expect([...uses.values()].every((count) => count === 2)).toBe(true);
    expect(signedVolume(position)).toBeGreaterThan(0);
  });

  it("keeps the size of the box", () => {
    const geometry = chamfered();
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    expect(box.max.x - box.min.x).toBeCloseTo(40, 4);
    expect(box.max.z - box.min.z).toBeCloseTo(30, 4);
    expect(box.max.y - box.min.y).toBeCloseTo(20, 4);
    expect(box.min.y).toBeCloseTo(0, 4);
  });

  it("is a chamfer, not a round: the volume is less than the round box of the same radii", () => {
    const round = createRoundedBoxGeometry({ width: 40, depth: 30, height: 20, cornerFillet: 4, topBottomFillet: 3, roundedBoxQuality: 8 });
    expect(signedVolume(chamfered().getAttribute("position"))).toBeLessThan(signedVolume(round.getAttribute("position")));
  });

  it("draws the top and bottom chamfer with one piece, like the corner-only box does for the corners", () => {
    const geometry = chamfered();
    const position = geometry.getAttribute("position");
    // On the plane through the middle of the depth, the edge between the top and the +x side is one slanted piece.
    const points = new Set<string>();
    for (let index = 0; index < position.count; index += 1) {
      if (position.getX(index) > 15.99 && position.getY(index) > 16.99 && Math.abs(position.getZ(index)) < 11.01) points.add(`${position.getX(index).toFixed(3)},${position.getY(index).toFixed(3)}`);
    }
    expect(points.size).toBe(2);
  });

  it("survives a corner fillet of zero and a body that is rounded to the middle", () => {
    for (const options of [{ cornerFillet: 0, topBottomFillet: 3 }, { cornerFillet: 15, topBottomFillet: 10 }]) {
      const position = createRoundedBoxGeometry({ width: 30, depth: 30, height: 20, roundedBoxQuality: 1, ...options }).getAttribute("position");
      expect(position.count).toBeGreaterThan(0);
      expect(signedVolume(position)).toBeGreaterThan(0);
      expect([...edgeUseCounts(position).values()].every((count) => count === 2)).toBe(true);
    }
  });
});

describe("own radii for each corner", () => {
  it("gives a box with four equal radii the very outline of one with a shared radius", () => {
    for (const quality of [1, 4, 8]) {
      for (const radius of [0, 3, 7.5, 15]) {
        expect(buildRoundedRectContour(40, 30, 99, quality, [radius, radius, radius, radius])).toEqual(buildRoundedRectContour(40, 30, radius, quality));
      }
    }
  });

  it("keeps a corner of no radius a sharp point, and the others rounded", () => {
    // back left, back right, front right, front left (the back is the small z)
    const contour = buildRoundedRectContour(40, 30, 5, 8, [0, 6, 0, 10]);
    const has = (x: number, z: number) => contour.some((point) => Math.hypot(point.x - x, point.z - z) < 1e-9);
    expect(has(-20, -15)).toBe(true);
    expect(has(20, 15)).toBe(true);
    expect(has(20, -15)).toBe(false);
    expect(has(-20, 15)).toBe(false);
    // the back right arc starts and ends 6 mm from the corner, the front left 10 mm
    expect(has(20, -15 + 6)).toBe(true);
    expect(has(20 - 6, -15)).toBe(true);
    expect(has(-20, 15 - 10)).toBe(true);
    expect(has(-20 + 10, 15)).toBe(true);
    for (const point of contour) {
      expect(Math.abs(point.x)).toBeLessThanOrEqual(20 + 1e-9);
      expect(Math.abs(point.z)).toBeLessThanOrEqual(15 + 1e-9);
    }
  });

  it("limits every radius to half the shorter side, whatever is asked", () => {
    expect(normalizeCornerFillets([0, 4, 99, -3], 15)).toEqual([0, 4, 15, 0]);
    expect(normalizeCornerFillets([1, 2, 3], 15)).toBeUndefined();
    expect(normalizeCornerFillets(["a", 2, 3, 4], 15)).toBeUndefined();
    expect(normalizeCornerFillets(undefined, 15)).toBeUndefined();
  });

  it("builds a closed body from different radii, and ignores them once the top and bottom are rounded", () => {
    const own = createRoundedBoxGeometry({ width: 40, depth: 30, height: 12, cornerFillet: 5, cornerFillets: [0, 6, 2, 10], topBottomFillet: 0, roundedBoxQuality: 6 });
    const position = own.getAttribute("position");
    expect([...edgeUseCounts(position).values()].every((count) => count === 2)).toBe(true);
    expect(signedVolume(position)).toBeGreaterThan(0);
    const rounded = createRoundedBoxGeometry({ width: 40, depth: 30, height: 12, cornerFillet: 5, topBottomFillet: 2, roundedBoxQuality: 6 });
    const roundedWithOwn = createRoundedBoxGeometry({ width: 40, depth: 30, height: 12, cornerFillet: 5, cornerFillets: [0, 6, 2, 10], topBottomFillet: 2, roundedBoxQuality: 6 });
    expect(Array.from(roundedWithOwn.getAttribute("position").array)).toEqual(Array.from(rounded.getAttribute("position").array));
  });
});

describe("a plain box pulled into a rounded box", () => {
  const box = { id: "b", name: "Box", kind: "box", x: 5, z: -3, elevation: 2, size: 40, width: 40, depth: 30, height: 12, rotation: 0, color: "#ff8800", radius: 0, steps: 10 } as WorkplaneShape;
  const extent = (shape: WorkplaneShape) => {
    const { vertices, faces } = meshForShape(shape);
    const low = [Infinity, Infinity, Infinity];
    const high = [-Infinity, -Infinity, -Infinity];
    for (const vertex of vertices) for (let axis = 0; axis < 3; axis += 1) { low[axis] = Math.min(low[axis], vertex[axis]); high[axis] = Math.max(high[axis], vertex[axis]); }
    let volume = 0;
    for (const [a, b, c] of faces) {
      const [p, q, r] = [vertices[a], vertices[b], vertices[c]];
      volume += (p[0] * (q[1] * r[2] - q[2] * r[1]) - p[1] * (q[0] * r[2] - q[2] * r[0]) + p[2] * (q[0] * r[1] - q[1] * r[0])) / 6;
    }
    return { low, high, volume };
  };

  it("keeps its size, place and volume at radius 0, and loses exactly the corners at a radius", () => {
    const before = extent(box);
    const none = extent({ ...box, kind: "roundedBox", cornerFillet: 0, topBottomFillet: 0 });
    for (let axis = 0; axis < 3; axis += 1) {
      expect(none.low[axis]).toBeCloseTo(before.low[axis], 4);
      expect(none.high[axis]).toBeCloseTo(before.high[axis], 4);
    }
    expect(none.volume).toBeCloseTo(before.volume, 3);
    const rounded = extent({ ...box, kind: "roundedBox", cornerFillet: 8, topBottomFillet: 0, roundedBoxQuality: 24 });
    for (let axis = 0; axis < 3; axis += 1) {
      expect(rounded.low[axis]).toBeCloseTo(before.low[axis], 4);
      expect(rounded.high[axis]).toBeCloseTo(before.high[axis], 4);
    }
    // each corner loses (1 - pi/4) r^2 of the outline, over the whole height
    expect(Math.abs(rounded.volume / (before.volume - 4 * (1 - Math.PI / 4) * 64 * 12) - 1)).toBeLessThan(2e-3);
  });
});

describe("rounded box: top and bottom on their own", () => {
  const build = (extra: Record<string, number | undefined>, quality = 8) => createRoundedBoxGeometry({
    width: 40, depth: 30, height: 20, cornerFillet: 5, roundedBoxQuality: quality, ...extra,
  });
  const verticalExtent = (geometry: ReturnType<typeof build>, atY: number) => {
    const position = geometry.getAttribute("position");
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < position.count; i += 1) {
      if (Math.abs(position.getY(i) - atY) > 1e-4) continue;
      min = Math.min(min, position.getX(i));
      max = Math.max(max, position.getX(i));
    }
    return max - min;
  };

  it("takes one radius for both ends as long as the bottom is not given", () => {
    const shared = build({ topBottomFillet: 4 });
    const same = build({ topBottomFillet: 4, bottomFillet: 4 });
    expect(same.getAttribute("position").count).toBe(shared.getAttribute("position").count);
    expect(signedVolume(same.getAttribute("position"))).toBeCloseTo(signedVolume(shared.getAttribute("position")), 6);
    expect(normalizeEndFillets(4, undefined, 20)).toEqual([4, 4]);
    expect(normalizeEndFillets(40, undefined, 20)).toEqual([10, 10]);
  });

  it("keeps a flat top over a rounded bottom, and the other way round", () => {
    // (the edge is drawn as a quarter of an ellipse as wide as the corner radius, so the two are alike here)
    const flatTop = build({ cornerFillet: 6, topBottomFillet: 0, bottomFillet: 6 });
    const position = flatTop.getAttribute("position");
    expect(signedVolume(position)).toBeGreaterThan(0);
    expect([...edgeUseCounts(position).values()].every((uses) => uses === 2)).toBe(true);
    expect(flatTop.boundingBox?.min.y).toBeCloseTo(0, 4);
    expect(flatTop.boundingBox?.max.y).toBeCloseTo(20, 4);
    // the top face reaches the full width, the bottom face is drawn in by the radius at each side
    expect(verticalExtent(flatTop, 20)).toBeCloseTo(40, 3);
    expect(verticalExtent(flatTop, 0)).toBeCloseTo(40 - 2 * 6, 3);

    const flatBottom = build({ cornerFillet: 6, topBottomFillet: 6, bottomFillet: 0 });
    expect(verticalExtent(flatBottom, 0)).toBeCloseTo(40, 3);
    expect(verticalExtent(flatBottom, 20)).toBeCloseTo(40 - 2 * 6, 3);
  });

  it("is the mirror image when the two radii swap, and holds the box's size", () => {
    const a = build({ topBottomFillet: 7, bottomFillet: 2 });
    const b = build({ topBottomFillet: 2, bottomFillet: 7 });
    expect(signedVolume(a.getAttribute("position"))).toBeCloseTo(signedVolume(b.getAttribute("position")), 2);
    for (const geometry of [a, b]) {
      expect(geometry.boundingBox?.min.y).toBeCloseTo(0, 4);
      expect(geometry.boundingBox?.max.y).toBeCloseTo(20, 4);
      expect((geometry.boundingBox?.max.x ?? 0) - (geometry.boundingBox?.min.x ?? 0)).toBeCloseTo(40, 3);
      expect([...edgeUseCounts(geometry.getAttribute("position")).values()].every((uses) => uses === 2)).toBe(true);
    }
    // a top that is rounded more takes more away than one rounded less
    expect(signedVolume(a.getAttribute("position"))).toBeLessThan(signedVolume(build({ topBottomFillet: 2, bottomFillet: 2 }).getAttribute("position")));
    expect(signedVolume(a.getAttribute("position"))).toBeGreaterThan(signedVolume(build({ topBottomFillet: 7, bottomFillet: 7 }).getAttribute("position")));
  });

  it("lets one end take up all the height the other leaves, and no more", () => {
    expect(normalizeEndFillets(18, 6, 20)).toEqual([14, 6]);
    expect(normalizeEndFillets(3, 25, 20)).toEqual([0, 20]);
    expect(normalizeEndFillets(-1, 2, 20)).toEqual([0, 2]);
    expect(normalizeEndFillets(Number.NaN, 2, 20)[0]).toBeGreaterThanOrEqual(0);
    // (with no wall left between the two the vertices of both rings coincide, as they do for a shared radius of half the height)
    const full = build({ topBottomFillet: 13, bottomFillet: 6 });
    expect([...edgeUseCounts(full.getAttribute("position")).values()].every((uses) => uses === 2)).toBe(true);
  });

  it("also holds with the flat chamfer of quality 1", () => {
    const geometry = build({ topBottomFillet: 0, bottomFillet: 5 }, 1);
    const position = geometry.getAttribute("position");
    expect(signedVolume(position)).toBeGreaterThan(0);
    expect([...edgeUseCounts(position).values()].every((uses) => uses === 2)).toBe(true);
    expect(verticalExtent(geometry, 20)).toBeCloseTo(40, 3);
    expect(verticalExtent(geometry, 0)).toBeLessThan(40 - 1);
  });
});
