import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { HOLE_OVERSHOOT, readPerforableFace, type PerforableFace } from "@/lib/holePatternShapes";
import { quaternionForShape } from "@/lib/geometryRotation";
import { THREAD_INSERT_SIZES, customThreadInsert } from "@/lib/threadInsert";
import { makeThreadInsertHole, measureThreadInsert, threadInsertSurfaceCenter } from "@/lib/threadInsertGeometry";

/** World triangles of a box from (-w/2, 0, -d/2) to (w/2, h, d/2), two per side. */
function boxTriangles(w: number, h: number, d: number) {
  const geometry = new THREE.BoxGeometry(w, h, d).toNonIndexed();
  geometry.translate(0, h / 2, 0);
  return Array.from(geometry.getAttribute("position").array as Float32Array);
}

function topFace(positions: number[], x: number, z: number, y: number): PerforableFace {
  const read = readPerforableFace(positions, { x, y, z }, { x: 0, y: 1, z: 0 });
  if (!read.ok) throw new Error("no face");
  return read.face;
}

describe("the thread insert on a flat face (#1828)", () => {
  const m3 = THREAD_INSERT_SIZES.find((spec) => spec.name === "M3")!;

  it("lets a hole in the middle of a thick block through, with the wall and the depth it has", () => {
    const result = measureThreadInsert(topFace(boxTriangles(40, 20, 30), 0, 0, 20), m3);
    expect(result.allowed).toBe(true);
    expect(result.materialDepth).toBeCloseTo(20, 3);
    expect(result.edgeDistance).toBeCloseTo(15, 3);
  });

  it("blocks a spot too near the edge, and says the wall is what is short", () => {
    // 2 mm in from the short edge: 2 - 2 (the hole's radius) leaves no wall.
    const result = measureThreadInsert(topFace(boxTriangles(40, 20, 30), 18, 0, 20), m3);
    expect(result.allowed).toBe(false);
    expect(result.wallShort).toBe(true);
    expect(result.depthShort).toBe(false);
    expect(result.edgeDistance).toBeCloseTo(2, 3);
  });

  it("blocks a plate that is thinner than the insert is long", () => {
    const result = measureThreadInsert(topFace(boxTriangles(40, 4, 30), 0, 0, 4), m3);
    expect(result.allowed).toBe(false);
    expect(result.depthShort).toBe(true);
    expect(result.wallShort).toBe(false);
    expect(result.materialDepth).toBeCloseTo(4, 3);
  });

  it("makes an ordinary round hole shape: the insert's length deep and HOLE_OVERSHOOT out of the face", () => {
    const face = topFace(boxTriangles(40, 20, 30), 5, 3, 20);
    const hole = makeThreadInsertHole(face, m3);
    expect(hole.hole).toBe(true);
    expect(hole.kind).toBe("cylinder");
    expect(hole.width).toBeCloseTo(m3.d3, 6);
    expect(hole.depth).toBeCloseTo(m3.d3, 6);
    expect(hole.height).toBeCloseTo(m3.L + HOLE_OVERSHOOT, 6);
    // Its own up axis points out of the face, along +y; the top stands HOLE_OVERSHOOT above it, the foot L below it.
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(quaternionForShape(hole));
    expect(up.y).toBeCloseTo(1, 4);
    const centre = new THREE.Vector3(hole.x, (hole.elevation ?? 0) + hole.height / 2, hole.z);
    expect(centre.clone().addScaledVector(up, hole.height / 2).y).toBeCloseTo(20 + HOLE_OVERSHOOT, 4);
    expect(centre.clone().addScaledVector(up, -hole.height / 2).y).toBeCloseTo(20 - m3.L, 4);
    expect(centre.x).toBeCloseTo(5, 4);
    expect(centre.z).toBeCloseTo(3, 4);
  });

  it("names the hole after the size, or after the diameter for a size of its own", () => {
    const face = topFace(boxTriangles(40, 20, 30), 0, 0, 20);
    expect(makeThreadInsertHole(face, m3).name).toContain("M3");
    expect(makeThreadInsertHole(face, customThreadInsert(7, 8)).name).toContain("Ø7");
  });

  it("finds the middle of the face for the purple mark", () => {
    const centre = threadInsertSurfaceCenter(topFace(boxTriangles(40, 20, 30), 12, 7, 20));
    expect(centre).not.toBeNull();
    expect(centre!.point.x).toBeCloseTo(0, 3);
    expect(centre!.point.z).toBeCloseTo(0, 3);
    expect(centre!.point.y).toBeCloseTo(20, 3);
  });
});
