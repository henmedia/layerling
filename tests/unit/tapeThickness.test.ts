import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { wallThicknessAt } from "@/lib/tapeThickness";

/** A body as the editor draws one: a group with a surface and its edge lines. */
function body(geometry: THREE.BufferGeometry, side: THREE.Side = THREE.FrontSide) {
  const group = new THREE.Group();
  group.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ side })));
  group.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry), new THREE.LineBasicMaterial()));
  return group;
}

/** A box with a pocket from the top: outer 40 x 30 x 40, walls 2 mm, floor 3 mm. */
function hollowBox(side: THREE.Side = THREE.FrontSide) {
  const outer = new THREE.BoxGeometry(40, 30, 40).toNonIndexed();
  const inner = new THREE.BoxGeometry(36, 27, 36).toNonIndexed();
  inner.translate(0, 1.5, 0);
  // The pocket's faces look inwards, as the walls of a hollow do.
  const position = inner.getAttribute("position");
  const turned = new Float32Array(position.count * 3);
  for (let index = 0; index < position.count; index += 3) {
    for (const [from, to] of [[0, 0], [1, 2], [2, 1]] as const) {
      turned.set([position.getX(index + from), position.getY(index + from), position.getZ(index + from)], (index + to) * 3);
    }
  }
  const geometry = new THREE.BufferGeometry();
  const outerPosition = outer.getAttribute("position").array as Float32Array;
  const merged = new Float32Array(outerPosition.length + turned.length);
  merged.set(outerPosition, 0);
  merged.set(turned, outerPosition.length);
  geometry.setAttribute("position", new THREE.BufferAttribute(merged, 3));
  return body(geometry, side);
}

describe("how thick a body is under the pointer (Discussion #1820)", () => {
  it("reads all of a solid block, square to the face", () => {
    const block = body(new THREE.BoxGeometry(20, 10, 30));
    const top = wallThicknessAt(block, new THREE.Vector3(3, 5, -4), new THREE.Vector3(0, 1, 0));
    expect(top?.thickness).toBeCloseTo(10, 6);
    expect(top?.exit.toArray()).toEqual([3, expect.closeTo(-5, 6), -4]);
    expect(wallThicknessAt(block, new THREE.Vector3(10, 1, 2), new THREE.Vector3(1, 0, 0))?.thickness).toBeCloseTo(20, 6);
  });

  it("reads the wall and the floor of a hollow box, from outside and from inside", () => {
    for (const side of [THREE.FrontSide, THREE.DoubleSide]) {
      const box = hollowBox(side);
      expect(wallThicknessAt(box, new THREE.Vector3(20, 4, 5), new THREE.Vector3(1, 0, 0))?.thickness).toBeCloseTo(2, 5);
      expect(wallThicknessAt(box, new THREE.Vector3(18, 4, 5), new THREE.Vector3(-1, 0, 0))?.thickness).toBeCloseTo(2, 5);
      expect(wallThicknessAt(box, new THREE.Vector3(2, -12, 5), new THREE.Vector3(0, 1, 0))?.thickness).toBeCloseTo(3, 5);
      expect(wallThicknessAt(box, new THREE.Vector3(2, -15, 5), new THREE.Vector3(0, -1, 0))?.thickness).toBeCloseTo(3, 5);
    }
  });

  it("goes through the middle of a round body and follows a body that was moved, turned and stretched", () => {
    const ball = body(new THREE.SphereGeometry(8, 64, 32));
    const direction = new THREE.Vector3(1, 2, -1).normalize();
    expect(wallThicknessAt(ball, direction.clone().multiplyScalar(8), direction)?.thickness).toBeCloseTo(16, 1);

    const block = body(new THREE.BoxGeometry(20, 10, 30));
    block.position.set(100, 20, -50);
    block.rotation.y = Math.PI / 2;
    block.scale.set(1, 2, 1);
    expect(wallThicknessAt(block, new THREE.Vector3(100, 30, -50), new THREE.Vector3(0, 1, 0))?.thickness).toBeCloseTo(20, 5);
    expect(wallThicknessAt(block, new THREE.Vector3(115, 22, -48), new THREE.Vector3(1, 0, 0))?.thickness).toBeCloseTo(30, 5);
  });

  it("says nothing where there is no way through: no surface, a flat sheet, no direction", () => {
    const block = body(new THREE.BoxGeometry(20, 10, 30));
    expect(wallThicknessAt(block, new THREE.Vector3(3, 5, -4), new THREE.Vector3(0, 0, 0))).toBeNull();
    expect(wallThicknessAt(new THREE.Group(), new THREE.Vector3(), new THREE.Vector3(0, 1, 0))).toBeNull();
    const sheet = body(new THREE.PlaneGeometry(10, 10), THREE.DoubleSide);
    expect(wallThicknessAt(sheet, new THREE.Vector3(1, 1, 0), new THREE.Vector3(0, 0, 1))).toBeNull();
  });

  it("only looks at surfaces on the layer it is given", () => {
    const block = body(new THREE.BoxGeometry(20, 10, 30));
    block.traverse((child) => child.layers.set(3));
    expect(wallThicknessAt(block, new THREE.Vector3(3, 5, -4), new THREE.Vector3(0, 1, 0), 3)?.thickness).toBeCloseTo(10, 6);
    expect(wallThicknessAt(block, new THREE.Vector3(3, 5, -4), new THREE.Vector3(0, 1, 0), 5)).toBeNull();
  });
});
