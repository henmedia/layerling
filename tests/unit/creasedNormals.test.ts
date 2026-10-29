import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { toCreasedNormals as threeCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { toCreasedNormals } from "@/lib/creasedNormals";
import { buildVase } from "@/lib/vase/vase-geometry.mjs";
import { normalizeVaseSettings, vaseSettingsInFrame } from "@/lib/vaseSettings";

function vaseGeometry() {
  const mesh = buildVase(vaseSettingsInFrame(normalizeVaseSettings({ body: "hohl", cutout: "voronoi", quality: "entwurf" }), 80, 80, 120));
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(mesh.vertices), 3));
  geometry.setIndex(new THREE.BufferAttribute(mesh.indices.slice(), 1));
  return geometry;
}

const CASES: Array<[string, () => THREE.BufferGeometry, number]> = [
  ["a box, all edges sharp", () => new THREE.BoxGeometry(10, 20, 30, 2, 3, 4), Math.PI / 6],
  ["a sphere, smooth with seams", () => new THREE.SphereGeometry(5, 24, 16), Math.PI / 6],
  ["a torus knot", () => new THREE.TorusKnotGeometry(8, 2, 120, 12), THREE.MathUtils.degToRad(12)],
  ["a cylinder without an index", () => new THREE.CylinderGeometry(4, 6, 10, 32).toNonIndexed(), THREE.MathUtils.degToRad(35)],
  ["a hollow Voronoi vase", vaseGeometry, THREE.MathUtils.degToRad(30)],
];

describe("toCreasedNormals gives what three's gives", () => {
  it.each(CASES)("for %s", (_label, make, angle) => {
    const expected = threeCreasedNormals(make(), angle);
    const actual = toCreasedNormals(make(), angle);
    expect(actual.index).toBeNull();
    expect(Array.from(actual.getAttribute("position").array)).toEqual(Array.from(expected.getAttribute("position").array));
    const want = expected.getAttribute("normal").array;
    const got = actual.getAttribute("normal").array;
    expect(got.length).toBe(want.length);
    let worst = 0;
    for (let i = 0; i < want.length; i += 1) worst = Math.max(worst, Math.abs(got[i] - want[i]));
    expect(worst).toBeLessThan(1e-6);
  });

  it("keeps the other attributes, as three does", () => {
    const actual = toCreasedNormals(new THREE.BoxGeometry(1, 1, 1), Math.PI / 6);
    expect(actual.getAttribute("uv").count).toBe(36);
  });
});
