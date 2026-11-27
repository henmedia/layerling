import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { ALL_MATE_AXES, faceCentre, mateMotion, pointMotion, pointTurnAboutAxis, pointTurnAboutPivot, shortestTurn, turnedAbout } from "@/lib/mateFaces";

const v = (x: number, y: number, z: number) => ({ x, y, z });

describe("aligning one face with another", () => {
  // A body whose right face (+x) sits at x = 10, and a target whose left face (-x) sits at x = 50.
  const source = { normal: v(1, 0, 0), point: v(10, 3, 4) };
  const target = { normal: v(-1, 0, 0), point: v(50, 0, 0) };

  it("slides face to face without turning when the faces already look at each other", () => {
    const motion = mateMotion(source, target, "against");
    expect(motion.rotation).toBeNull();
    expect(motion.translation.x).toBeCloseTo(40);
    expect(motion.translation.y).toBeCloseTo(0);
    expect(motion.translation.z).toBeCloseTo(0);
  });

  it("leaves the gap asked for, out of the target face", () => {
    const motion = mateMotion(source, target, "against", 2);
    expect(motion.translation.x).toBeCloseTo(38);
  });

  it("turns the face round to lie flush beside the other", () => {
    const motion = mateMotion(source, target, "flush");
    expect(motion.rotation).not.toBeNull();
    const turned = new THREE.Vector3(1, 0, 0).applyQuaternion(motion.rotation!);
    expect(turned.x).toBeCloseTo(-1);
    // About the clicked point, so the face stays at x = 10 and then slides to x = 50.
    expect(motion.pivot.x).toBeCloseTo(10);
    expect(motion.translation.x).toBeCloseTo(40);
  });

  it("only slides along the target's normal, keeping the body's place sideways", () => {
    const top = { normal: v(0, 1, 0), point: v(7, 20, -3) };
    const bottom = { normal: v(0, -1, 0), point: v(-5, 5, 9) };
    const motion = mateMotion(bottom, top, "against");
    expect(motion.translation.x).toBeCloseTo(0);
    expect(motion.translation.z).toBeCloseTo(0);
    expect(motion.translation.y).toBeCloseTo(15);
  });

  it("takes the shortest turn, also for opposite directions", () => {
    const quarter = shortestTurn(v(1, 0, 0), v(0, 0, 1));
    expect(new THREE.Vector3(1, 0, 0).applyQuaternion(quarter).z).toBeCloseTo(1);
    const half = shortestTurn(v(0, 1, 0), v(0, -1, 0));
    expect(new THREE.Vector3(0, 1, 0).applyQuaternion(half).y).toBeCloseTo(-1);
  });
});

describe("moving a point onto a point (Discussion #1491)", () => {
  // World y is the height; the editor shows it as Z, and world z as Y.
  const corner = v(10, 0.65, 4);
  const goal = v(13, 2, -6);

  it("moves the whole way along all three axes", () => {
    const motion = pointMotion(corner, goal, ALL_MATE_AXES);
    expect([motion.x, motion.y, motion.z]).toEqual([3, 1.35, -10].map((value) => expect.closeTo(value, 9)));
  });

  it("puts the point straight above the other with only X and Y on, keeping its height", () => {
    const motion = pointMotion(corner, goal, { x: true, y: true, z: false });
    expect(motion.x).toBeCloseTo(3, 9);
    expect(motion.z).toBeCloseTo(-10, 9);
    expect(motion.y).toBe(0);
  });

  it("only lifts it to the same height with only Z on", () => {
    const motion = pointMotion(corner, goal, { x: false, y: false, z: true });
    expect(motion.x).toBe(0);
    expect(motion.z).toBe(0);
    expect(motion.y).toBeCloseTo(1.35, 9);
  });
});

describe("turning by a second and third pair of points (Discussion #1491)", () => {
  const pivot = v(5, 2, -3);

  it("turns about the first point so the line through the second point runs through the target", () => {
    const source = v(15, 2, -3); // 10 along x from the pivot
    const target = v(5, 2, 17); // 20 along z: the parts need not be the same length
    const rotation = pointTurnAboutPivot(pivot, source, target)!;
    const landed = turnedAbout(source, rotation, pivot);
    expect([landed.x, landed.y, landed.z]).toEqual([5, 2, 7].map((value) => expect.closeTo(value, 9)));
    // The pivot itself stays where it is.
    const still = turnedAbout(pivot, rotation, pivot);
    expect([still.x, still.y, still.z]).toEqual([5, 2, -3].map((value) => expect.closeTo(value, 9)));
  });

  it("gives no turn for a second point on the first", () => {
    expect(pointTurnAboutPivot(pivot, pivot, v(9, 9, 9))).toBeNull();
    expect(pointTurnAboutPivot(pivot, v(9, 9, 9), v(5, 2, -3.00001))).toBeNull();
  });

  it("turns about the line through the first two points only, until the third point faces the target", () => {
    const axisPoint = v(15, 2, -3); // the line runs along x
    const source = v(8, 2, 1); // 4 along z off the line
    const target = v(30, 7, -3); // 5 up off the line
    const rotation = pointTurnAboutAxis(pivot, axisPoint, source, target)!;
    const landed = turnedAbout(source, rotation, pivot);
    // Same place along the line and same distance from it, now straight up like the target.
    expect([landed.x, landed.y, landed.z]).toEqual([8, 6, -3].map((value) => expect.closeTo(value, 9)));
    // Points on the line stay where they are.
    const onLine = turnedAbout(axisPoint, rotation, pivot);
    expect([onLine.x, onLine.y, onLine.z]).toEqual([15, 2, -3].map((value) => expect.closeTo(value, 9)));
  });

  it("turns the other way round for a target on the other side", () => {
    const rotation = pointTurnAboutAxis(pivot, v(15, 2, -3), v(8, 2, 1), v(0, -1, -3))!;
    const landed = turnedAbout(v(8, 2, 1), rotation, pivot);
    expect([landed.x, landed.y, landed.z]).toEqual([8, -2, -3].map((value) => expect.closeTo(value, 9)));
  });

  it("gives no turn for a third point on the line", () => {
    expect(pointTurnAboutAxis(pivot, v(15, 2, -3), v(40, 2, -3), v(0, 9, 0))).toBeNull();
    expect(pointTurnAboutAxis(pivot, pivot, v(8, 2, 1), v(0, 9, 0))).toBeNull();
  });
});

describe("Centre the faces (Discussion #2168)", () => {
  // The top of a 20 x 10 plate at height 2, as two triangles, and a second face apart from it in the same plane.
  const vertices: Array<[number, number, number]> = [
    [0, 2, 0], [20, 2, 0], [20, 2, 10], [0, 2, 10],
    [40, 2, 0], [44, 2, 0], [44, 2, 4], [40, 2, 4],
  ];
  const faces: Array<[number, number, number]> = [[0, 2, 1], [0, 3, 2], [4, 6, 5], [4, 7, 6]];
  const up = { x: 0, y: 1, z: 0 };

  it("finds the middle of the clicked face only, wherever on it the click was", () => {
    const middle = faceCentre(vertices, faces, { x: 1, y: 2, z: 9 }, up)!;
    expect([middle.x, middle.y, middle.z]).toEqual([10, 2, 5]);
    const other = faceCentre(vertices, faces, { x: 41, y: 2, z: 1 }, up)!;
    expect([other.x, other.y, other.z]).toEqual([42, 2, 2]);
  });

  it("finds nothing where no face of that plane and direction lies", () => {
    expect(faceCentre(vertices, faces, { x: 1, y: 7, z: 1 }, up)).toBeNull();
    expect(faceCentre(vertices, faces, { x: 1, y: 2, z: 1 }, { x: 0, y: -1, z: 0 })).toBeNull();
  });

  it("is not moved by how the face is cut into triangles", () => {
    const fine: Array<[number, number, number]> = [...vertices.slice(0, 4), [1, 2, 0], [2, 2, 0]];
    const cut: Array<[number, number, number]> = [[0, 3, 4], [4, 3, 5], [5, 3, 2], [5, 2, 1]];
    const middle = faceCentre(fine, cut, { x: 10, y: 2, z: 5 }, up)!;
    expect(middle.x).toBeCloseTo(10, 6);
    expect(middle.z).toBeCloseTo(5, 6);
  });

  it("puts the middles over each other and keeps the gap", () => {
    const source = { normal: { x: 0, y: -1, z: 0 }, point: { x: 31, y: 30, z: 4 } };
    const target = { normal: up, point: { x: 1, y: 10, z: 1 } };
    const centres = { source: { x: 35, y: 30, z: 8 }, target: { x: 5, y: 10, z: -2 } };
    const motion = mateMotion(source, target, "against", 2, centres);
    expect([motion.translation.x, motion.translation.y, motion.translation.z]).toEqual([-30, -18, -10]);
  });

  it("puts the middles over each other when the part has to turn first", () => {
    const source = { normal: { x: 1, y: 0, z: 0 }, point: { x: 12, y: 3, z: 1 } };
    const target = { normal: up, point: { x: 0, y: 10, z: 0 } };
    const centres = { source: { x: 12, y: 5, z: 4 }, target: { x: -7, y: 10, z: 6 } };
    const motion = mateMotion(source, target, "against", 0, centres);
    const landed = turnedAbout(centres.source, motion.rotation!, motion.pivot).add(motion.translation);
    expect(landed.x).toBeCloseTo(-7, 6);
    expect(landed.y).toBeCloseTo(10, 6);
    expect(landed.z).toBeCloseTo(6, 6);
  });
});
