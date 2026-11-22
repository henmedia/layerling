import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { readableEulerDegrees, rotationPatchFromQuaternion, signedDegrees } from "@/lib/geometryRotation";

const turn = (x: number, y: number, z: number) =>
  new THREE.Quaternion().setFromEuler(new THREE.Euler(THREE.MathUtils.degToRad(x), THREE.MathUtils.degToRad(y), THREE.MathUtils.degToRad(z), "XYZ"));

describe("angles a person would write", () => {
  it("wraps angles to -180 .. 180", () => {
    expect(signedDegrees(270)).toBe(-90);
    expect(signedDegrees(-190)).toBe(170);
    expect(signedDegrees(180)).toBe(180);
  });

  // What a rotation field does with an angle beyond half a turn (Discussion #1842): ten digits round a dial, 36 degrees apart.
  it("takes a typed angle past 180 as the same turn", () => {
    expect(signedDegrees(216)).toBe(-144);
    expect(signedDegrees(324)).toBe(-36);
    expect(signedDegrees(360)).toBe(0);
    expect(signedDegrees(-181)).toBe(179);
    expect(signedDegrees(540)).toBe(180);
  });

  // The case seen with the R key: 135 degrees about the vertical came out as X 180, Y 45, Z 180.
  it("reads a turn about the vertical as just that", () => {
    const angles = readableEulerDegrees(turn(0, 135, 0));
    expect(angles.x).toBeCloseTo(0);
    expect(angles.y).toBeCloseTo(135);
    expect(angles.z).toBeCloseTo(0);
    const odd = readableEulerDegrees(turn(180, 45, 180));
    expect(odd.x).toBeCloseTo(0);
    expect(odd.y).toBeCloseTo(135);
    expect(odd.z).toBeCloseTo(0);
  });

  it("keeps plain angles as they are", () => {
    const angles = readableEulerDegrees(turn(30, 20, -40));
    expect(angles.x).toBeCloseTo(30);
    expect(angles.y).toBeCloseTo(20);
    expect(angles.z).toBeCloseTo(-40);
  });

  it("stores the same turn it reads", () => {
    const quaternion = turn(180, 45, 180);
    const patch = rotationPatchFromQuaternion(quaternion);
    const back = turn(patch.rotationX, patch.rotation, patch.rotationZ);
    expect(Math.abs(back.dot(quaternion))).toBeCloseTo(1, 6);
  });
});
