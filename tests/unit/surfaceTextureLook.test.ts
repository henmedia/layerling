import { afterEach, describe, expect, it } from "vitest";
import * as THREE from "three";
import { TEXTURE_LOOK_COLOR, setTextureLookShape, shapeMaterialSignature, sharedShapeMaterial } from "@/components/workplane/viewportShapeObjects";
import { canonicalizeShape } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * "Show texture clearly" (Discussion #1972): the view draws one body in a plain grey so that the relief of its surface
 * texture reads on a white body too. It is a look only: the shape itself is not touched, and no other body changes.
 */

const body = (id: string, more: Partial<WorkplaneShape> = {}): WorkplaneShape => canonicalizeShape({
  id, name: "Cylinder", kind: "cylinder", color: "#ffffff", x: 0, z: 0, elevation: 0,
  size: 30, width: 30, depth: 30, height: 20, rotation: 0, ...more,
});

const colorOf = (shape: WorkplaneShape, vertexColors = false) => `#${sharedShapeMaterial(shape, vertexColors).color.getHexString()}`;

describe("the look at a body's texture", () => {
  afterEach(() => {
    setTextureLookShape(null);
  });

  it("draws the body in a plain grey and gives its own colour back", () => {
    const white = body("a");
    expect(colorOf(white)).toBe("#ffffff");
    expect(setTextureLookShape("a")).toBe(true);
    expect(colorOf(white)).toBe(TEXTURE_LOOK_COLOR);
    expect(white.color).toBe("#ffffff");
    expect(setTextureLookShape(null)).toBe(true);
    expect(colorOf(white)).toBe("#ffffff");
  });

  it("reaches a body already on screen through its material signature, and only that body", () => {
    const white = body("a");
    const other = body("b", { color: "#d97813" });
    const before = [shapeMaterialSignature(white), shapeMaterialSignature(other)];
    setTextureLookShape("a");
    expect(shapeMaterialSignature(white)).not.toBe(before[0]);
    expect(shapeMaterialSignature(other)).toBe(before[1]);
    expect(colorOf(other)).toBe("#d97813");
    // Asked for the same body again, nothing has to be drawn anew.
    expect(setTextureLookShape("a")).toBe(false);
  });

  it("shows painted and see-through bodies plain and solid, and leaves a hole a hole", () => {
    setTextureLookShape("a");
    const painted = sharedShapeMaterial(body("a"), true);
    expect(painted.vertexColors).toBe(false);
    expect(`#${painted.color.getHexString()}`).toBe(TEXTURE_LOOK_COLOR);
    const glass = sharedShapeMaterial(body("a", { transparent: true }));
    expect(glass.transparent).toBe(false);
    expect(glass.opacity).toBe(1);
    const hole = sharedShapeMaterial(body("a", { hole: true }));
    expect(hole).toBeInstanceOf(THREE.MeshStandardMaterial);
    expect(`#${hole.color.getHexString()}`).not.toBe(TEXTURE_LOOK_COLOR);
  });
});
