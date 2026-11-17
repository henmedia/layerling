import * as THREE from "three";
import { describe, expect, it } from "vitest";
import {
  HOLE_PATTERN_MIN_WALL,
  holeFootprintPolygon,
  holePatternCenters,
  holePatternWall,
  holeTurn,
  normalizeHolePattern,
  normalizeHoleAngle,
  rectangleOutline,
  segmentSegmentDistance,
  type Point2,
} from "@/lib/holePattern";
import { holePatternShapes, isRoundWallFace, readHolePatternFace, readPerforableFace } from "@/lib/holePatternShapes";
import { quaternionForShape } from "@/lib/geometryRotation";
import { meshForShape } from "@/lib/editorMeshCore";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * The rectangle and the slot of the hole pattern can be turned in the face (holeAngle, in degrees, counter-clockwise as
 * seen looking at the face). The turned outline is what the holes are fitted and spaced with, and every hole is cut
 * turned the same; the grid itself stays straight.
 */

function insideConvex(polygon: readonly Point2[], point: Point2) {
  let sign = 0;
  for (let i = 0; i < polygon.length; i += 1) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const cross = (b.u - a.u) * (point.v - a.v) - (b.v - a.v) * (point.u - a.u);
    if (Math.abs(cross) < 1e-9) continue;
    const s = cross > 0 ? 1 : -1;
    if (sign === 0) sign = s;
    else if (s !== sign) return false;
  }
  return true;
}

/** Clear distance between two placed outlines, 0 if they overlap. */
function gapBetween(a: readonly Point2[], b: readonly Point2[]) {
  if (a.some((point) => insideConvex(b, point)) || b.some((point) => insideConvex(a, point))) return 0;
  let nearest = Infinity;
  for (let i = 0; i < a.length; i += 1) {
    for (let j = 0; j < b.length; j += 1) {
      nearest = Math.min(nearest, segmentSegmentDistance(a[i], a[(i + 1) % a.length], b[j], b[(j + 1) % b.length]));
    }
  }
  return nearest;
}

const extent = (polygon: readonly Point2[]) => ({
  u: Math.max(...polygon.map((point) => Math.abs(point.u))),
  v: Math.max(...polygon.map((point) => Math.abs(point.v))),
});

describe("hole angle: the setting", () => {
  it("keeps any angle as the same hole direction from just over -90 up to 90", () => {
    expect(normalizeHoleAngle(0)).toBe(0);
    expect(normalizeHoleAngle(45)).toBe(45);
    expect(normalizeHoleAngle(-45)).toBe(-45);
    expect(normalizeHoleAngle(90)).toBe(90);
    expect(normalizeHoleAngle(-90)).toBe(90);
    expect(normalizeHoleAngle(100)).toBe(-80);
    expect(normalizeHoleAngle(-100)).toBe(80);
    expect(normalizeHoleAngle(180)).toBe(0);
    expect(normalizeHoleAngle(270)).toBe(90);
    expect(Object.is(normalizeHoleAngle(-0), 0)).toBe(true);
    expect(normalizeHoleAngle(Number.NaN)).toBe(0);
    expect(normalizeHoleAngle("30")).toBe(0);
  });

  it("turns only rectangles and slots, and is kept (but not used) while another form is chosen", () => {
    expect(holeTurn({ form: "slot", holeAngle: 30 })).toBeCloseTo((-30 * Math.PI) / 180, 12);
    expect(holeTurn({ form: "rectangle", holeAngle: 30 })).toBeCloseTo((-30 * Math.PI) / 180, 12);
    for (const form of ["round", "square", "hexagon", "custom"] as const) expect(holeTurn({ form, holeAngle: 30 })).toBe(0);
    expect(holeTurn({ form: "slot" })).toBe(0);
    const square = normalizeHolePattern({ form: "square", size: 6, spacing: 1, holeAngle: 30 });
    const plain = normalizeHolePattern({ form: "square", size: 6, spacing: 1 });
    expect(square.holeAngle).toBe(30);
    expect(square.spacing).toBeCloseTo(plain.spacing, 9);
    expect(holeFootprintPolygon(square)).toEqual(holeFootprintPolygon(plain));
    // 0 is left out, so settings saved without the angle stay as they were.
    expect("holeAngle" in normalizeHolePattern({ form: "slot", holeAngle: 0 })).toBe(false);
    expect(normalizeHolePattern({ form: "slot", holeAngle: 120 }).holeAngle).toBe(-60);
  });

  for (const form of ["slot", "rectangle"] as const) {
    it(`turns the ${form}'s outline counter-clockwise as seen looking at the face (the frame's u to v is clockwise)`, () => {
      const flat = holeFootprintPolygon({ form, size: 12, height: 5 });
      expect(extent(flat).u).toBeCloseTo(6, 6);
      expect(extent(flat).v).toBeCloseTo(2.5, 6);
      const upright = holeFootprintPolygon({ form, size: 12, height: 5, holeAngle: 90 });
      expect(extent(upright).u).toBeCloseTo(2.5, 6);
      expect(extent(upright).v).toBeCloseTo(6, 6);
      // At 45 the far end in +u lies towards -v in the frame, which is counter-clockwise on the face.
      const turned = holeFootprintPolygon({ form, size: 12, height: 5, holeAngle: 45 });
      // The middle of the far end: a rectangle has two corners there, as far along u - v as each other.
      const reach = Math.max(...turned.map((point) => point.u - point.v));
      const end = turned.filter((point) => point.u - point.v > reach - 1e-6);
      const farEnd = { u: end.reduce((sum, point) => sum + point.u, 0) / end.length, v: end.reduce((sum, point) => sum + point.v, 0) / end.length };
      expect(farEnd.u).toBeGreaterThan(3);
      expect(farEnd.v).toBeLessThan(-3);
    });
  }

  it("turns a rectangle's corners exactly", () => {
    // 12 x 5 turned by 30: the corner (6, 2.5) goes to (6 cos 30 + 2.5 sin 30, -6 sin 30 + 2.5 cos 30) in the frame.
    const turned = holeFootprintPolygon({ form: "rectangle", size: 12, height: 5, holeAngle: 30 });
    expect(turned).toHaveLength(4);
    const c = Math.cos(Math.PI / 6);
    const s = Math.sin(Math.PI / 6);
    const corner = { u: 6 * c + 2.5 * s, v: -6 * s + 2.5 * c };
    expect(turned.some((point) => Math.abs(point.u - corner.u) < 1e-9 && Math.abs(point.v - corner.v) < 1e-9)).toBe(true);
  });
});

describe("hole angle: turned holes keep the least wall to every neighbour", () => {
  const angles = [15, 30, 45, 60, 75, 89, -30, -60];
  for (const form of ["slot", "rectangle"] as const) {
  for (const arrangement of ["grid", "staggered"] as const) {
    for (const holeAngle of angles) {
      it(`${form}, ${arrangement}, ${holeAngle} degrees: spacing and rows raised so no two holes come closer than the wall`, () => {
        const settings = normalizeHolePattern({ form, size: 10, height: 2, spacing: 0.5, rowSpacing: 0.5, arrangement, margin: 2, holeAngle });
        const outline = holeFootprintPolygon(settings);
        const { centers } = holePatternCenters(rectangleOutline(0, 0, 80, 60), settings);
        expect(centers.length).toBeGreaterThan(10);
        const placed = centers.map((c) => outline.map((point) => ({ u: point.u + c.u, v: point.v + c.v })));
        let nearest = Infinity;
        for (let i = 0; i < placed.length; i += 1) {
          for (let j = i + 1; j < placed.length; j += 1) {
            if (Math.hypot(centers[i].u - centers[j].u, centers[i].v - centers[j].v) > 12) continue;
            nearest = Math.min(nearest, gapBetween(placed[i], placed[j]));
          }
        }
        expect(nearest).toBeGreaterThanOrEqual(HOLE_PATTERN_MIN_WALL - 1e-4);
        // The wall the panel shows is the nearest pair on the face.
        expect(holePatternWall(settings)).toBeCloseTo(nearest, 3);
        // Packed close: the rows sit no further apart than needed.
        expect(nearest).toBeLessThan(HOLE_PATTERN_MIN_WALL + 0.05);
      });
    }
  }
  }

  it("keeps the slots of an unturned pattern exactly where they were", () => {
    const before = normalizeHolePattern({ form: "slot", size: 10, height: 2, spacing: 13, rowSpacing: 4, arrangement: "staggered", margin: 2 });
    const after = normalizeHolePattern({ ...before, holeAngle: 0 });
    expect(after).toEqual(before);
    expect(holePatternCenters(rectangleOutline(0, 0, 80, 60), after).centers).toEqual(holePatternCenters(rectangleOutline(0, 0, 80, 60), before).centers);
  });
});

/** World triangles of a box from (-w/2, 0, -d/2) to (w/2, h, d/2), two per side. */
function boxTriangles(w: number, h: number, d: number) {
  const geometry = new THREE.BoxGeometry(w, h, d).toNonIndexed();
  geometry.translate(0, h / 2, 0);
  return Array.from(geometry.getAttribute("position").array as Float32Array);
}

/** The world direction of a hole's width (its own x) and depth (its own z). */
function holeAxes(hole: WorkplaneShape) {
  const turn = quaternionForShape(hole);
  return { width: new THREE.Vector3(1, 0, 0).applyQuaternion(turn), depth: new THREE.Vector3(0, 0, 1).applyQuaternion(turn) };
}

describe("hole angle: the holes cut", () => {
  for (const [form, kind] of [["slot", "slot"], ["rectangle", "box"]] as const) {
  it(`stands every ${form} turned counter-clockwise on a top face, inside the margin`, () => {
    const positions = boxTriangles(100, 20, 100);
    const read = readPerforableFace(positions, { x: 0, y: 20, z: 0 }, { x: 0, y: 1, z: 0 });
    if (!read.ok) throw new Error("no face");
    const settings = normalizeHolePattern({ form, size: 20, height: 3, spacing: 9, rowSpacing: 9, arrangement: "grid", margin: 4, depth: null, holeAngle: 45 });
    const plan = holePatternShapes(read.face, settings, "Hole");
    expect(plan.holes.length).toBeGreaterThan(20);
    // Seen from above x points right and -z up the screen: counter-clockwise from x by 45 is towards +x and -z.
    const along = new THREE.Vector3(1, 0, -1).normalize();
    for (const hole of plan.holes) {
      expect(hole.kind).toBe(kind);
      expect(hole.width).toBeCloseTo(20, 6);
      expect(hole.depth).toBeCloseTo(3, 6);
      const { width, depth } = holeAxes(hole);
      expect(Math.abs(width.dot(along))).toBeCloseTo(1, 4);
      expect(Math.abs(depth.y)).toBeLessThan(1e-6);
      // The slot's ends and sides stay the margin inside the 100 x 100 face: the cut turns the way the fit did.
      for (const end of [-1, 1]) {
        for (const side of [-1, 1]) {
          const corner = new THREE.Vector3(hole.x, 0, hole.z).addScaledVector(width, end * 10).addScaledVector(depth, side * 1.5);
          expect(Math.abs(corner.x)).toBeLessThanOrEqual(50 - 4 + 1e-3);
          expect(Math.abs(corner.z)).toBeLessThanOrEqual(50 - 4 + 1e-3);
        }
      }
    }
  });
  }

  it("leaves unturned slots as they were", () => {
    const positions = boxTriangles(100, 20, 100);
    const read = readPerforableFace(positions, { x: 0, y: 20, z: 0 }, { x: 0, y: 1, z: 0 });
    if (!read.ok) throw new Error("no face");
    const settings = normalizeHolePattern({ form: "slot", size: 20, height: 3, spacing: 24, rowSpacing: 6, arrangement: "grid", margin: 4, depth: null });
    for (const hole of holePatternShapes(read.face, settings, "Hole").holes) {
      expect(Math.abs(holeAxes(hole).width.x)).toBeCloseTo(1, 6);
    }
  });

  const tube = (() => {
    const asset = toolbarShapeAssets.find((entry) => entry.kind === "tube")!;
    const made = makeShapeFromAsset({ ...asset, name: "tube" }, { x: 0, z: 0, elevation: 0 }, { width: 60, depth: 60, height: 40 });
    return { ...made, id: "test-tube", width: 60, depth: 60, height: 40, size: 60, sides: 96, bevel: 2.5 } as WorkplaneShape;
  })();
  const tubePositions = () => {
    const mesh = meshForShape(tube);
    return new Float64Array(mesh.faces.flatMap((face) => face.flatMap((index) => mesh.vertices[index])));
  };
  const nearest = (holes: WorkplaneShape[], z: number) => holes.reduce((best, hole) => (Math.abs(hole.z - z) + Math.abs(hole.x) < Math.abs(best.z - z) + Math.abs(best.x) ? hole : best));

  it("turns slots on the outside of a tube counter-clockwise as seen from outside", () => {
    const read = readHolePatternFace(tubePositions(), new THREE.Vector3(0, 20, 30), new THREE.Vector3(0, 0, 1));
    if (!read.ok || !isRoundWallFace(read.face)) throw new Error("not a round wall");
    expect(read.face.round.outside).toBe(true);
    const settings = normalizeHolePattern({ form: "slot", size: 8, height: 2, spacing: 12, rowSpacing: 12, arrangement: "grid", margin: 3, depth: null, holeAngle: 45 });
    const plan = holePatternShapes(read.face, settings, "Hole");
    expect(plan.holes.length).toBeGreaterThan(5);
    // At the front, seen from +z: x to the right, y up; counter-clockwise from x by 45 is up and to the right.
    const front = nearest(plan.holes, 30);
    const { width } = holeAxes(front);
    expect(Math.abs(width.dot(new THREE.Vector3(1, 1, 0).normalize()))).toBeCloseTo(1, 2);
  });

  it("turns rectangles on the outside of a tube counter-clockwise as seen from outside", () => {
    const read = readHolePatternFace(tubePositions(), new THREE.Vector3(0, 20, 30), new THREE.Vector3(0, 0, 1));
    if (!read.ok || !isRoundWallFace(read.face)) throw new Error("not a round wall");
    const settings = normalizeHolePattern({ form: "rectangle", size: 8, height: 2, spacing: 12, rowSpacing: 12, arrangement: "grid", margin: 3, depth: null, holeAngle: 45 });
    const plan = holePatternShapes(read.face, settings, "Hole");
    expect(plan.holes.length).toBeGreaterThan(5);
    const front = nearest(plan.holes, 30);
    expect(front.kind).toBe("box");
    const { width } = holeAxes(front);
    expect(Math.abs(width.dot(new THREE.Vector3(1, 1, 0).normalize()))).toBeCloseTo(1, 2);
  });

  it("turns slots in a bore counter-clockwise as seen from inside it", () => {
    const read = readHolePatternFace(tubePositions(), new THREE.Vector3(0, 20, 27.5), new THREE.Vector3(0, 0, -1));
    if (!read.ok || !isRoundWallFace(read.face)) throw new Error("not a round wall");
    expect(read.face.round.outside).toBe(false);
    const settings = normalizeHolePattern({ form: "slot", size: 8, height: 2, spacing: 12, rowSpacing: 12, arrangement: "grid", margin: 3, depth: null, holeAngle: 45 });
    const plan = holePatternShapes(read.face, settings, "Hole");
    expect(plan.holes.length).toBeGreaterThan(5);
    // From the axis looking at +z the right is -x: counter-clockwise from there by 45 is up and towards -x.
    const front = nearest(plan.holes, 27.5);
    const { width } = holeAxes(front);
    expect(Math.abs(width.dot(new THREE.Vector3(-1, 1, 0).normalize()))).toBeCloseTo(1, 2);
  });
});
