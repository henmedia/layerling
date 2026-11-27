import { describe, expect, it } from "vitest";
import { plateCenterX, plateCenterZ, plateOfShape, shapeMovedBy, shapesOntoFirstPlate } from "@/lib/buildPlates";
import { DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";
import type { WorkplaneShape } from "@/types/layerling";

const box = (id: string, x: number, z: number): WorkplaneShape => ({
  id, name: id, kind: "box", color: "#ff0000", x, z, elevation: 0, size: 20, width: 20, depth: 20, height: 10, rotation: 0,
});

const three = { ...DEFAULT_WORKPLANE_WORKSPACE, plates: ["", "", ""] };

describe("a copy goes onto the clipboard as if on the first plate (Discussion #2124)", () => {
  it("leaves a copy from the first plate, or from a design with one plate, as it is", () => {
    const shapes = [box("a", 10, -5)];
    expect(shapesOntoFirstPlate(three, shapes)).toBe(shapes);
    const moved = [box("b", plateCenterX(three, 2) + 10, 0)];
    expect(shapesOntoFirstPlate(DEFAULT_WORKPLANE_WORKSPACE, moved)).toBe(moved);
  });

  it("moves a copy from plate 3 to the same spot on plate 1, the parts keeping their places to each other", () => {
    const offset = plateCenterX(three, 2);
    const copied = shapesOntoFirstPlate(three, [box("a", offset + 10, -5), box("b", offset - 30, 20)]);
    expect(copied.map((shape) => [shape.x, shape.z])).toEqual([[10, -5], [-30, 20]]);
  });

  it("follows the rows when the plates stand in rows", () => {
    const rows = { ...three, plates: ["", "", "", ""], platesPerRow: 2 };
    const dx = plateCenterX(rows, 3);
    const dz = plateCenterZ(rows, 3);
    expect(dz).not.toBe(0);
    const [copied] = shapesOntoFirstPlate(rows, [box("a", dx + 4, dz - 6)]);
    expect([copied.x, copied.z]).toEqual([4, -6]);
  });

  it("pasted on another plate, the copy lands at the same spot there", () => {
    const [copied] = shapesOntoFirstPlate(three, [box("a", plateCenterX(three, 2) + 10, -5)]);
    const pasted = shapeMovedBy(copied, plateCenterX(three, 1), plateCenterZ(three, 1));
    expect(plateOfShape(three, pasted)).toBe(1);
    expect(pasted.x - plateCenterX(three, 1)).toBe(10);
  });
});
