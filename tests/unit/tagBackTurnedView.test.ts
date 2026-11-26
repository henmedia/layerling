import * as THREE from "three";
import { afterEach, describe, expect, it } from "vitest";
import type { ThreeState } from "@/components/workplane/ViewportOverlays";
import { createShapeObject, tagsShownTurnedNow, turnTagsShown, updateShapeObjectTransform } from "@/components/workplane/viewportShapeObjects";
import type { WorkplaneShape } from "@/types/layerling";

// A tag card's Back (tagBack.ts) shows the tag turned over in its place, as a page of a book is turned: only the tag's
// object turns, about its own up-down axis and its middle; the shape itself, the plate and the camera stay as they are.
const tag: WorkplaneShape = {
  id: "tag", name: "Tag", kind: "box", color: "#ffffff", x: 10, z: -5, elevation: 2, rotation: 30, width: 40, depth: 15, height: 3,
};

function placed(shape: WorkplaneShape) {
  const object = new THREE.Group();
  updateShapeObjectTransform(object, shape);
  return object;
}

function fakeState(records: Array<{ object: THREE.Group; shape: WorkplaneShape }>) {
  return { shapeRecords: new Map(records.map((record) => [record.shape.id, record])), needsRender: false } as unknown as ThreeState;
}

const at = (object: THREE.Object3D, local: THREE.Vector3) => local.clone().applyMatrix4(object.matrixWorld);
const corner = new THREE.Vector3(18, 1.5, 6);

afterEach(() => turnTagsShown(null, []));

describe("a tag shown from its Back", () => {
  it("turns over about its own up-down axis and middle, and turns back on Front", () => {
    const object = placed(tag);
    const other = placed({ ...tag, id: "other", x: -30 });
    const before = at(object, corner);
    const middle = object.position.clone();
    const state = fakeState([{ object, shape: tag }, { object: other, shape: { ...tag, id: "other", x: -30 } }]);
    const otherBefore = at(other, corner);
    const mirrored = new THREE.Vector3(-corner.x, -corner.y, corner.z);
    const turnedCorner = at(placed(tag), mirrored);

    turnTagsShown(state, ["tag"]);
    expect(tagsShownTurnedNow()).toEqual(["tag"]);
    expect(state.needsRender).toBe(true);
    // In its place and at its height; its right top corner is now where its left bottom one was, front and back kept.
    expect(object.position.distanceTo(middle)).toBeLessThan(1e-9);
    expect(at(object, corner).distanceTo(turnedCorner)).toBeLessThan(1e-9);
    expect(at(other, corner).distanceTo(otherBefore)).toBeLessThan(1e-9);

    turnTagsShown(state, []);
    expect(tagsShownTurnedNow()).toEqual([]);
    expect(at(object, corner).distanceTo(before)).toBeLessThan(1e-9);
  });

  it("stays turned when it is moved or built again while on Back", () => {
    const object = placed(tag);
    const moved = { ...tag, x: 25 };
    const turnedCorner = at(placed(moved), new THREE.Vector3(-corner.x, -corner.y, corner.z));
    turnTagsShown(fakeState([{ object, shape: tag }]), ["tag"]);
    updateShapeObjectTransform(object, moved);
    expect(at(object, corner).distanceTo(turnedCorner)).toBeLessThan(1e-9);
    const rebuilt = createShapeObject(moved);
    rebuilt.updateMatrixWorld(true);
    expect(at(rebuilt, corner).distanceTo(at(object, corner))).toBeLessThan(1e-9);
  });
});
