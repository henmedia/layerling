import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { groupedShape } from "@/lib/editorBooleans";
import { createShapeObject } from "@/components/workplane/viewportShapeObjects";
import { alignBounds } from "@/lib/alignSize";
import { meshAabb } from "@/lib/editorMeshCore";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * A part hidden inside a group (#1323): the group keeps its size, and the parts left are drawn as they are.
 * The viewport measured the content without the hidden part and stretched what was left to fill the group's box.
 */

function solid(id: string, kind: string, x: number, size: number): WorkplaneShape {
  return { id, name: id, kind, color: "#ff0000", x, z: 0, elevation: 0, size, width: size, depth: size, height: size, rotation: 0 } as unknown as WorkplaneShape;
}

describe("a group with a hidden part in the viewport (#1323)", () => {
  it("draws the parts left at their own size and place", () => {
    const group = groupedShape([solid("box", "box", -20, 20), solid("ball", "sphere", 15, 10)])!;
    expect(group.width).toBeCloseTo(50, 6);
    const hidden = { ...group, groupedShapes: group.groupedShapes!.map((part) => (part.kind === "box" ? { ...part, hidden: true } : part)) };

    const object = createShapeObject(hidden, false, undefined, false);
    const content = object.children.find((child) => child.userData.groupedShapeContent)!;
    expect(content).toBeTruthy();
    expect(content.scale.x).toBeCloseTo(1, 6);
    expect(content.scale.y).toBeCloseTo(1, 6);
    expect(content.scale.z).toBeCloseTo(1, 6);

    object.updateMatrixWorld(true);
    const ball = new THREE.Box3().setFromObject(content, true);
    const size = ball.getSize(new THREE.Vector3());
    expect(size.x).toBeCloseTo(10, 1);
    expect(size.y).toBeCloseTo(10, 1);
    expect(size.z).toBeCloseTo(10, 1);
    // The ball stays where it was: 15 mm right of the group's old centre at -5, so 20 mm from the group's middle.
    expect((ball.min.x + ball.max.x) / 2 - object.position.x).toBeCloseTo(20, 1);
  });

  it("is aligned by its whole box, the hidden part with it, while its mesh leaves the hidden part out", () => {
    const group = groupedShape([solid("box", "box", -20, 20), solid("ball", "sphere", 15, 10)])!;
    const hidden = { ...group, groupedShapes: group.groupedShapes!.map((part) => (part.kind === "box" ? { ...part, hidden: true } : part)) };
    const bounds = alignBounds(hidden);
    expect(bounds.minX).toBeCloseTo(-30, 1);
    expect(bounds.maxX).toBeCloseTo(20, 1);
    expect(bounds.maxY).toBeCloseTo(20, 1);
    // What is exported and drawn as one body is still only the ball.
    const mesh = meshAabb(hidden);
    expect(mesh.minX).toBeCloseTo(10, 1);
    expect(mesh.maxY).toBeCloseTo(10, 1);
  });
});
