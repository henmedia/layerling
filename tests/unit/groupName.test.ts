import { describe, expect, it } from "vitest";
import { nameForNewGroup } from "@/lib/groupName";
import type { WorkplaneShape } from "@/types/layerling";

function shape(name: string, extra: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return { id: name, name, kind: "box", color: "#fff", x: 0, z: 0, size: 10, width: 10, depth: 10, height: 10, ...extra } as WorkplaneShape;
}

describe("the name of a new group (Discussion #1854)", () => {
  it("takes the name of the one part somebody named", () => {
    expect(nameForNewGroup([shape("Box"), shape(" Lid "), shape("Cylinder", { kind: "cylinder" })], "Group")).toBe("Lid");
    expect(nameForNewGroup([shape("Lid"), shape("Box")], "Bundle")).toBe("Lid");
  });

  it("keeps the editor's name when no part or more than one part was named", () => {
    expect(nameForNewGroup([shape("Box"), shape("Cylinder", { kind: "cylinder" })], "Group")).toBe("Group");
    expect(nameForNewGroup([shape("Lid"), shape("Base")], "Group")).toBe("Group");
    expect(nameForNewGroup([shape("Lid"), shape("Lid")], "Bundle")).toBe("Bundle");
  });

  it("does not take a group's or bundle's handed-out name for a name somebody gave", () => {
    const inner = shape("Group", { kind: "mesh", groupedShapes: [shape("Lid"), shape("Base")] });
    expect(nameForNewGroup([inner, shape("Box")], "Group")).toBe("Group");
    expect(nameForNewGroup([shape("Bundle", { kind: "mesh" }), shape("Hull", { kind: "mesh" })], "Group")).toBe("Group");
  });

  it("passes a named group's name on when it is grouped again", () => {
    const inner = shape("Case", { kind: "mesh", groupedShapes: [shape("Box"), shape("Box")] });
    expect(nameForNewGroup([inner, shape("Box")], "Group")).toBe("Case");
  });

  it("is not called after a hole while a solid is among the parts", () => {
    expect(nameForNewGroup([shape("Box"), shape("Cable slot", { hole: true })], "Group")).toBe("Group");
    expect(nameForNewGroup([shape("Plate"), shape("Cable slot", { hole: true })], "Group")).toBe("Plate");
    expect(nameForNewGroup([shape("Box", { hole: true }), shape("Cable slot", { hole: true })], "Group")).toBe("Cable slot");
  });

  it("keeps the name of the one body a tool cuts or adds to", () => {
    expect(nameForNewGroup([shape("Housing")], "Group")).toBe("Housing");
    expect(nameForNewGroup([shape("Box")], "Group")).toBe("Group");
  });
});
