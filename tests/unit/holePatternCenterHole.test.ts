import manifoldModule from "manifold-3d";
import * as THREE from "three";
import { beforeAll, describe, expect, it } from "vitest";
import { faceMiddle, holeCenterOwnSize, holePatternCenters, normalizeHolePattern, type HolePatternSettings } from "@/lib/holePattern";
import { holePatternShapes, readPerforableFace } from "@/lib/holePatternShapes";
import { rememberManifoldRuntime } from "@/lib/manifoldHandle";

/*
 * A hole in the middle of the face (Discussion #1904): with a ring of holes along the edge and with mounting holes for
 * screws, one more hole like the others in the middle - the drain holes in a plant pot's floor. It does not count
 * among the others, can have a size of its own where a hole has one size and no head, and is left out where it does
 * not fit.
 */

beforeAll(async () => {
  const runtime = await manifoldModule();
  runtime.setup();
  rememberManifoldRuntime(runtime);
});

const rect = (w: number, d: number, turn = 0, du = 0, dv = 0) => {
  const c = Math.cos(turn), s = Math.sin(turn);
  return [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([u, v]) => ({ u: u * c - v * s + du, v: u * s + v * c + dv }));
};
const circle = (radius: number, du = 0, dv = 0, steps = 64) => Array.from({ length: steps }, (_, index) => {
  const angle = (index / steps) * Math.PI * 2;
  return { u: du + radius * Math.cos(angle), v: dv + radius * Math.sin(angle) };
});
const mounting = (patch: Partial<HolePatternSettings> = {}) => normalizeHolePattern({ form: "round", size: 4, arrangement: "corners", margin: 5, ...patch });
const ring = (patch: Partial<HolePatternSettings> = {}) => normalizeHolePattern({ form: "round", size: 6, arrangement: "perimeter", margin: 8, perimeterBy: "count", perimeterCount: 6, ...patch });

/** World triangles of a box from (-w/2, 0, -d/2) to (w/2, h, d/2), two per side. */
function boxTriangles(w: number, h: number, d: number) {
  const geometry = new THREE.BoxGeometry(w, h, d).toNonIndexed();
  geometry.translate(0, h / 2, 0);
  return Array.from(geometry.getAttribute("position").array as Float32Array);
}

describe("a hole in the middle of the face (Discussion #1904)", () => {
  it("is off unless asked for, and the others stay where they were", () => {
    const without = holePatternCenters({ loops: [rect(90, 70)] }, mounting());
    const withOne = holePatternCenters({ loops: [rect(90, 70)] }, mounting({ centerHole: true }));
    expect(without.centers).toHaveLength(4);
    expect(without.centerHole).toBeUndefined();
    expect(withOne.centers.slice(0, 4)).toEqual(without.centers);
    expect(withOne.centers).toHaveLength(5);
    expect(withOne.centerHole).toEqual({ index: 4 });
    expect(withOne.centers[4].u).toBeCloseTo(0, 9);
    expect(withOne.centers[4].v).toBeCloseTo(0, 9);
  });

  it("sits in the middle of a round face, a moved one and a turned one", () => {
    const round = holePatternCenters({ loops: [circle(40, 12, -7)] }, mounting({ centerHole: true, cornerCount: 6 }));
    expect(round.centers).toHaveLength(7);
    expect(round.centers[6].u).toBeCloseTo(12, 6);
    expect(round.centers[6].v).toBeCloseTo(-7, 6);
    const turned = faceMiddle([rect(60, 30, Math.PI / 6, 5, 9)]);
    expect(turned?.u).toBeCloseTo(5, 6);
    expect(turned?.v).toBeCloseTo(9, 6);
  });

  it("does not count among the holes round the edge", () => {
    const plain = holePatternCenters({ loops: [circle(40)] }, ring());
    const withOne = holePatternCenters({ loops: [circle(40)] }, ring({ centerHole: true }));
    expect(plain.centers).toHaveLength(6);
    expect(withOne.centers).toHaveLength(7);
    expect(withOne.centers.slice(0, 6)).toEqual(plain.centers);
    expect(withOne.centerHole).toEqual({ index: 6 });
    expect(Math.hypot(withOne.centers[6].u, withOne.centers[6].v)).toBeLessThan(1e-6);
    expect(withOne.ring).toEqual(plain.ring);
  });

  it("is left out where the middle of the face is open", () => {
    // A ring: a round face with a bore in its middle.
    const open = holePatternCenters({ loops: [circle(40), circle(10)] }, mounting({ centerHole: true, cornerCount: 6 }));
    expect(open.centers).toHaveLength(6);
    expect(open.centerHole).toEqual({ index: null });
  });

  it("is left out where it would run into the others", () => {
    // Round a small face the holes stand 5 mm from the middle: a 4 mm hole there leaves 1 mm between them, a 6.5 mm
    // one less than the least wall.
    const tight = { loops: [circle(12)] };
    expect(holePatternCenters(tight, mounting({ centerHole: true, cornerCount: 3 })).centerHole).toEqual({ index: 3 });
    const wide = holePatternCenters(tight, mounting({ centerHole: true, centerHoleSize: 6.5, cornerCount: 3 }));
    expect(wide.centers).toHaveLength(3);
    expect(wide.centerHole).toEqual({ index: null });
  });

  it("is not for a pattern that fills the face or for a 19 inch rack", () => {
    expect(holePatternCenters({ loops: [rect(60, 40)] }, normalizeHolePattern({ form: "round", size: 4, spacing: 8, arrangement: "grid", centerHole: true })).centerHole).toBeUndefined();
    const rack = holePatternCenters({ loops: [rect(482.6, 88.1)] }, mounting({ rack: true, centerHole: true }));
    expect(rack.centers).toHaveLength(4);
    expect(rack.centerHole).toBeUndefined();
  });

  it("takes a size of its own only for a hole with one size and no head", () => {
    expect(holeCenterOwnSize(mounting({ centerHole: true, centerHoleSize: 10 }))).toBe(10);
    expect(holeCenterOwnSize(mounting({ centerHole: true, centerHoleSize: 4 }))).toBeNull();
    expect(holeCenterOwnSize(mounting({ centerHole: true }))).toBeNull();
    expect(holeCenterOwnSize(mounting({ centerHoleSize: 10 }))).toBeNull();
    expect(holeCenterOwnSize(mounting({ centerHole: true, centerHoleSize: 10, holeType: "countersink" }))).toBeNull();
    expect(holeCenterOwnSize(ring({ centerHole: true, centerHoleSize: 10, form: "slot" }))).toBeNull();
    expect(holeCenterOwnSize(ring({ centerHole: true, centerHoleSize: 10, form: "hexagon" }))).toBe(10);
  });

  it("keeps the choice when the settings are cleaned, and nothing when it was never made", () => {
    expect(mounting({ centerHole: true, centerHoleSize: 9 })).toMatchObject({ centerHole: true, centerHoleSize: 9 });
    expect(mounting({ centerHole: true, centerHoleSize: 900 }).centerHoleSize).toBe(200);
    expect("centerHole" in mounting()).toBe(false);
    expect("centerHoleSize" in mounting({ centerHole: true })).toBe(false);
  });

  it("makes the hole in the middle like the others, or wider", () => {
    const read = readPerforableFace(boxTriangles(80, 4, 60), { x: 0, y: 4, z: 0 }, { x: 0, y: 1, z: 0 });
    if (!read.ok) throw new Error("no face");
    const same = holePatternShapes(read.face, mounting({ centerHole: true }), "Hole");
    expect(same.holes).toHaveLength(5);
    expect(same.centerHole).toEqual({ index: 4 });
    expect(same.holes.map((hole) => hole.width)).toEqual([4, 4, 4, 4, 4]);
    expect(same.holes[4].x).toBeCloseTo(0, 6);
    expect(same.holes[4].z).toBeCloseTo(0, 6);
    expect(same.holes[4].hole).toBe(true);
    expect(same.holes[4].height).toBeCloseTo(same.holes[0].height, 9);

    const wider = holePatternShapes(read.face, mounting({ centerHole: true, centerHoleSize: 12 }), "Hole");
    expect(wider.holes.map((hole) => hole.width)).toEqual([4, 4, 4, 4, 12]);
    expect(wider.holes[4].depth).toBe(12);
    expect(wider.holes[4].kind).toBe("cylinder");
    expect(wider.holes[4].height).toBeCloseTo(wider.holes[0].height, 9);

    // A screw's head goes on the hole in the middle too; a size of its own does not apply then.
    const heads = holePatternShapes(read.face, mounting({ centerHole: true, centerHoleSize: 12, holeType: "counterbore", headSize: 8 }), "Hole");
    expect(heads.holes).toHaveLength(5);
    expect(new Set(heads.holes.map((hole) => `${hole.kind}:${hole.width}`)).size).toBe(1);
    expect(heads.holes[4].kind).toBe("counterbore");
  });

  it("slopes the hole in the middle through the wall with the others", () => {
    const read = readPerforableFace(boxTriangles(80, 4, 60), { x: 0, y: 4, z: 0 }, { x: 0, y: 1, z: 0 });
    if (!read.ok) throw new Error("no face");
    const sloped = holePatternShapes(read.face, ring({ centerHole: true, centerHoleSize: 10, holeTilt: 30, perimeterCount: 4 }), "Hole");
    expect(sloped.centerHole?.index).toBe(sloped.holes.length - 1);
    const middle = sloped.holes[sloped.holes.length - 1];
    expect(middle.width).toBe(10);
    // The wider hole's slanted end reaches further out of the face, so it is the longer one.
    expect(middle.height).toBeGreaterThan(sloped.holes[0].height);
  });
});
