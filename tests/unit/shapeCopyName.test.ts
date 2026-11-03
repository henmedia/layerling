import { describe, expect, it } from "vitest";
import { MESSAGES_EN } from "@/lib/messages.en";
import { shapeNamesIn, withCopyName } from "@/lib/shapeCopyName";
import type { WorkplaneShape } from "@/types/layerling";

const EN = { copy: MESSAGES_EN["dashboard.copyOf"], numbered: MESSAGES_EN["dashboard.copyOfNumbered"] };

function shape(name: string, extra: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return { id: name, name, kind: "box", color: "#fff", x: 0, z: 0, size: 10, width: 10, depth: 10, height: 10, ...extra } as WorkplaneShape;
}

describe("the name of a copied shape (#1213)", () => {
  it("calls the copy of a named shape after it, counting up", () => {
    const taken = ["Holder"];
    const first = withCopyName(shape("Holder"), taken, EN);
    expect(first.name).toBe("Holder (copy)");
    const second = withCopyName(shape("Holder (copy)"), taken, EN);
    expect(second.name).toBe("Holder (copy 2)");
  });

  it("keeps the name the editor handed out", () => {
    const copy = shape("Box");
    expect(withCopyName(copy, ["Box"], EN)).toBe(copy);
  });

  it("gives several copies in one go different names", () => {
    const taken = ["Peg"];
    const names = [shape("Peg"), shape("Peg")].map((entry) => withCopyName(entry, taken, EN).name);
    expect(names).toEqual(["Peg (copy)", "Peg (copy 2)"]);
  });

  it("keeps the name when pasting after Cut, as nobody carries it any more", () => {
    const copy = shape("Holder");
    expect(withCopyName(copy, [], EN, true)).toBe(copy);
    expect(withCopyName(shape("Holder"), ["Holder"], EN, true).name).toBe("Holder (copy)");
  });

  it("reads the names inside groups too", () => {
    const group = shape("Case", { groupedShapes: [shape("Lid"), shape("Base")] });
    expect(shapeNamesIn([group])).toEqual(["Case", "Lid", "Base"]);
  });
});
