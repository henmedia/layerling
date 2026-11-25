import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { concentricMotion } from "@/lib/mateFaces";
import { roundFaceNear, roundFaceTriangles } from "@/lib/roundFaceAxis";

type Profile = [radius: number, along: number][];

/**
 * World-space triangles of a body turned about an axis: each step of the
 * profile (radius, height along the axis) becomes a ring of `sides` quads.
 */
function lathe(profile: Profile, sides: number, centre: THREE.Vector3, axis: THREE.Vector3) {
  const up = axis.clone().normalize();
  const u = new THREE.Vector3().crossVectors(up, Math.abs(up.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)).normalize();
  const v = new THREE.Vector3().crossVectors(up, u);
  const at = (radius: number, along: number, step: number) => {
    const angle = (step / sides) * Math.PI * 2;
    return centre.clone()
      .addScaledVector(u, Math.cos(angle) * radius)
      .addScaledVector(v, Math.sin(angle) * radius)
      .addScaledVector(up, along);
  };
  const positions: number[] = [];
  const rings: number[] = [];
  for (let ring = 0; ring + 1 < profile.length; ring += 1) {
    rings.push(positions.length / 9);
    const [r0, a0] = profile[ring];
    const [r1, a1] = profile[ring + 1];
    for (let step = 0; step < sides; step += 1) {
      const p00 = at(r0, a0, step);
      const p01 = at(r0, a0, step + 1);
      const p10 = at(r1, a1, step);
      const p11 = at(r1, a1, step + 1);
      positions.push(...p00.toArray(), ...p01.toArray(), ...p11.toArray());
      positions.push(...p00.toArray(), ...p11.toArray(), ...p10.toArray());
    }
  }
  return { positions: new Float64Array(positions), rings };
}

const expectSameLine = (direction: { x: number; y: number; z: number }, axis: THREE.Vector3) => {
  expect(Math.abs(new THREE.Vector3(direction.x, direction.y, direction.z).dot(axis.clone().normalize()))).toBeCloseTo(1, 6);
};

describe("finding the axis of a round face", () => {
  it("reads axis, centre and radius of a hole far from the origin and tilted", () => {
    const axis = new THREE.Vector3(0.3, 1, -0.2).normalize();
    const centre = new THREE.Vector3(120, 40, -75);
    const { positions } = lathe([[2.5, 0], [2.5, 8]], 48, centre, axis);
    const found = roundFaceTriangles(positions, 7);
    expect(found).not.toBeNull();
    expect(found!.triangles).toHaveLength(96);
    expectSameLine(found!.axis.direction, axis);
    expect(found!.axis.radius).toBeCloseTo(2.5, 6);
    // Half way along the wall, on the axis.
    const middle = centre.clone().addScaledVector(axis, 4);
    expect(found!.axis.point.x).toBeCloseTo(middle.x, 5);
    expect(found!.axis.point.y).toBeCloseTo(middle.y, 5);
    expect(found!.axis.point.z).toBeCloseTo(middle.z, 5);
  });

  it("stops at a chamfer and a flat rim and still finds the axis", () => {
    const axis = new THREE.Vector3(0, 1, 0);
    // Hole wall 0..6, a 45° chamfer up to 7, then the flat top out to radius 10.
    const { positions, rings } = lathe([[3, 0], [3, 6], [4, 7], [10, 7]], 32, new THREE.Vector3(5, 0, 5), axis);
    const found = roundFaceTriangles(positions, 3);
    expect(found).not.toBeNull();
    expect(found!.triangles.every((triangle) => triangle < rings[1])).toBe(true);
    expect(found!.triangles).toHaveLength(64);
    expect(found!.axis.radius).toBeCloseTo(3, 6);
    expect(found!.axis.point.x).toBeCloseTo(5, 6);
    expect(found!.axis.point.z).toBeCloseTo(5, 6);
    expect(found!.axis.point.y).toBeCloseTo(3, 6);
  });

  it("works on a coarse hole of eight sides", () => {
    const axis = new THREE.Vector3(1, 0, 0);
    const { positions } = lathe([[4, 0], [4, 2]], 8, new THREE.Vector3(0, 10, 0), axis);
    const found = roundFaceTriangles(positions, 0);
    expect(found).not.toBeNull();
    expectSameLine(found!.axis.direction, axis);
    expect(found!.axis.point.y).toBeCloseTo(10, 6);
  });

  it("refuses a flat face", () => {
    const { positions } = lathe([[0, 5], [10, 5]], 32, new THREE.Vector3(), new THREE.Vector3(0, 1, 0));
    expect(roundFaceTriangles(positions, 4)).toBeNull();
  });

  it("refuses a cone, whose normals do not stand square to one axis", () => {
    const { positions } = lathe([[2, 0], [8, 6]], 32, new THREE.Vector3(), new THREE.Vector3(0, 1, 0));
    expect(roundFaceTriangles(positions, 4)).toBeNull();
  });

  // Strips along z over a profile in x and y, the outward side up.
  const strips = (profile: [x: number, y: number][], length: number) => new Float64Array(profile.slice(1).flatMap(([x1, y1], index) => {
    const [x0, y0] = profile[index];
    return [x0, y0, 0, x0, y0, length, x1, y1, length, x0, y0, 0, x1, y1, length, x1, y1, 0];
  }));

  it("refuses a flat floor with small tilted faces at its rim (Issue #2060)", () => {
    // A floor of many facets with a 30-degree flank at one edge: the circle through it has a huge radius, and one
    // percent of that is far more than the flank is high.
    const floor: [number, number][] = Array.from({ length: 41 }, (_, step) => [step * 2 - 40, 0]);
    const positions = strips([[-41, 0.577], ...floor, [41, 0.577]], 80);
    for (let triangle = 0; triangle < positions.length / 9; triangle += 1) expect(roundFaceTriangles(positions, triangle)).toBeNull();
  });

  it("still reads a shallow arc of a large radius, with corners rounded to a hundredth of its depth", () => {
    // Radius 500, 12 degrees of it: 2.7 mm deep.
    const arc = Array.from({ length: 25 }, (_, step): [number, number] => {
      const angle = (((step / 24) * 12 - 6) * Math.PI) / 180;
      return [Math.sin(angle) * 500, Math.cos(angle) * 500 - 500 + (step % 2 ? 0.02 : -0.02)];
    });
    const found = roundFaceTriangles(strips(arc, 30), 20);
    expect(found).not.toBeNull();
    expect(found!.axis.radius).toBeGreaterThan(480);
    expect(found!.axis.radius).toBeLessThan(520);
    expect(found!.triangles).toHaveLength(48);
  });

  it("finds a hole's wall from a point on its axis, past the closer faces of a thin plate", () => {
    // A hole of radius 6 through a 1 mm plate: the flat faces lie 0.5 mm from the point, the wall 6 mm.
    const { positions } = lathe([[20, 0], [6, 0], [6, 1], [20, 1]], 40, new THREE.Vector3(30, 0, 30), new THREE.Vector3(0, 1, 0));
    const vertices: number[][] = [];
    const faces: number[][] = [];
    for (let offset = 0; offset < positions.length; offset += 9) {
      const first = vertices.length;
      for (let corner = 0; corner < 9; corner += 3) vertices.push([positions[offset + corner], positions[offset + corner + 1], positions[offset + corner + 2]]);
      faces.push([first, first + 1, first + 2]);
    }
    const axis = roundFaceNear({ vertices, faces }, { x: 30, y: 0.5, z: 30 });
    expect(axis).not.toBeNull();
    expect(axis!.radius).toBeCloseTo(6, 6);
    expect(axis!.point.x).toBeCloseTo(30, 6);
    expect(axis!.point.z).toBeCloseTo(30, 6);
    // A point out on the flat plate belongs to no round face, even with the hole a few millimetres off.
    expect(roundFaceNear({ vertices, faces }, { x: 47, y: 1, z: 30 })).toBeNull();
  });
});

describe("putting two round faces on one axis", () => {
  it("slides a pin straight across onto the hole's axis and keeps its height", () => {
    const motion = concentricMotion(
      { point: { x: 2, y: 7, z: -3 }, direction: { x: 0, y: 1, z: 0 } },
      { point: { x: 10, y: 0, z: 4 }, direction: { x: 0, y: -1, z: 0 } },
    );
    expect(motion.rotation).toBeNull();
    expect(motion.translation.x).toBeCloseTo(8);
    expect(motion.translation.y).toBeCloseTo(0);
    expect(motion.translation.z).toBeCloseTo(7);
  });

  it("turns a lying pin upright about its own axis point, then lands it on the axis", () => {
    const source = { point: { x: 0, y: 2, z: 0 }, direction: { x: 1, y: 0, z: 0 } };
    const target = { point: { x: 5, y: 0, z: 5 }, direction: { x: 0, y: 1, z: 0 } };
    const motion = concentricMotion(source, target);
    expect(motion.rotation).not.toBeNull();
    const turned = new THREE.Vector3(1, 0, 0).applyQuaternion(motion.rotation!);
    expect(Math.abs(turned.y)).toBeCloseTo(1);
    const landed = new THREE.Vector3(0, 2, 0).add(motion.translation);
    expect(landed.x).toBeCloseTo(5);
    expect(landed.z).toBeCloseTo(5);
    expect(landed.y).toBeCloseTo(2);
  });
});
