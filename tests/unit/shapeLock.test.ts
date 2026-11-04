import { describe, expect, it } from "vitest";
import { groupedShape } from "@/lib/editorBooleans";
import { bodyLocked, groupHeld, holdsShapeLock, patchFitsShapeLock, shapeLockBroken } from "@/lib/shapeLock";
import type { WorkplaneShape } from "@/types/layerling";

function box(id: string, x: number, extra: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return { id, name: id, kind: "box", color: "#888888", x, z: 0, elevation: 0, size: 10, width: 10, depth: 10, height: 10, rotation: 0, ...extra } as WorkplaneShape;
}

describe("Lock shape (#1277)", () => {
  const part = box("part", 0, { shapeLocked: true });
  const plain = box("plain", 20);

  it("tells the shape lock from the full lock", () => {
    expect(holdsShapeLock(part)).toBe(true);
    expect(holdsShapeLock(plain)).toBe(false);
    expect(bodyLocked(part)).toBe(true);
    expect(bodyLocked(box("locked", 0, { locked: true }))).toBe(true);
    expect(groupHeld(part)).toBe(true);
    expect(groupHeld(plain)).toBe(false);
  });

  it("takes where the part is and the locks, nothing else", () => {
    expect(patchFitsShapeLock({ x: 5, z: 2, elevation: 1, rotation: 90, rotationX: 0, rotationZ: 0 })).toBe(true);
    expect(patchFitsShapeLock({ hidden: true, transparent: true, locked: true })).toBe(true);
    expect(patchFitsShapeLock({ x: 5, formulas: { x: "2+3" } })).toBe(true);
    expect(patchFitsShapeLock({ width: 20 })).toBe(false);
    expect(patchFitsShapeLock({ name: "Other" })).toBe(false);
    expect(patchFitsShapeLock({ color: "#ff0000" })).toBe(false);
    expect(patchFitsShapeLock({ hole: true })).toBe(false);
    expect(patchFitsShapeLock({ threadPitch: 2 })).toBe(false);
    // Unlocking the shape in the same change lets the rest through.
    expect(patchFitsShapeLock({ shapeLocked: false, width: 20, name: "Other" })).toBe(true);
  });

  it("lets moving and turning through the commit", () => {
    const moved = { ...part, x: 30, z: -4, elevation: 2, rotation: 45, rotationX: 10 };
    expect(shapeLockBroken([part, plain], [moved, plain])).toBeNull();
  });

  it("refuses a resize, a new name, a mirror or a hole", () => {
    expect(shapeLockBroken([part], [{ ...part, width: 12 }])?.id).toBe("part");
    expect(shapeLockBroken([part], [{ ...part, name: "Renamed" }])?.id).toBe("part");
    expect(shapeLockBroken([part], [{ ...part, mirrorX: true }])?.id).toBe("part");
    expect(shapeLockBroken([part], [{ ...part, hole: true }])?.id).toBe("part");
  });

  it("lets a change through that unlocks the shape too", () => {
    expect(shapeLockBroken([part], [{ ...part, shapeLocked: undefined, width: 12 }])).toBeNull();
  });

  it("groups the part, and the copy in the group keeps the lock", () => {
    const group = groupedShape([part, plain]);
    expect(group).not.toBeNull();
    expect(group!.groupedShapes!.find((child) => child.name === "part")?.shapeLocked).toBe(true);
    expect(holdsShapeLock(group)).toBe(true);
    expect(groupHeld(group)).toBe(false);
    expect(shapeLockBroken([part, plain], [group!])).toBeNull();
  });

  it("refuses resizing a group that holds a part of locked shape, but not moving it", () => {
    const group = groupedShape([part, plain])!;
    expect(shapeLockBroken([group], [{ ...group, x: group.x + 10, rotation: 90 }])).toBeNull();
    expect(shapeLockBroken([group], [{ ...group, width: group.width * 2 }])?.id).toBe(group.id);
    // A part of the group scaled inside it: the part itself is held.
    const scaled = { ...group, groupedShapes: group.groupedShapes!.map((child) => child.shapeLocked ? { ...child, width: 20 } : child) };
    expect(shapeLockBroken([group], [scaled])?.name).toBe("part");
  });

  it("refuses taking a part out of a group of locked shape", () => {
    const group = { ...groupedShape([plain, box("other", 40)])!, shapeLocked: true };
    const fewer = { ...group, groupedShapes: group.groupedShapes!.slice(0, 1) };
    expect(shapeLockBroken([group], [fewer])?.id).toBe(group.id);
  });

  it("leaves designs without a shape lock alone", () => {
    expect(shapeLockBroken([plain], [{ ...plain, width: 50, name: "Big" }])).toBeNull();
  });
});
