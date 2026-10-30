import { describe, expect, it } from "vitest";
import { groupedShape, restoreGroupedChildren } from "@/lib/editorBooleans";
import { editorHistoryEntry } from "@/lib/editorHistory";
import { describeHistoryStep, historyStepsAround } from "@/lib/historyStepDescription";
import { historyStepTextIn } from "@/lib/historyStepText";
import type { WorkplaneNote, WorkplaneShape } from "@/types/layerling";

function box(overrides: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return {
    id: "box-1",
    name: "Box",
    kind: "box",
    color: "#d41721",
    x: 0,
    z: 0,
    elevation: 0,
    size: 20,
    width: 20,
    depth: 20,
    height: 20,
    rotation: 0,
    locked: false,
    hidden: false,
    ...overrides,
  };
}

const entry = (shapes: WorkplaneShape[], notes: WorkplaneNote[] = []) => editorHistoryEntry(shapes, [], notes);
const step = (before: WorkplaneShape[], after: WorkplaneShape[]) => describeHistoryStep(entry(before), entry(after));

describe("history step descriptions", () => {
  it("names the start of the history when there is no state before it", () => {
    expect(describeHistoryStep(undefined, entry([box()]))).toEqual({ key: "historyStep.start" });
  });

  it("names added and deleted objects", () => {
    const other = box({ id: "cyl", name: "Cylinder", kind: "cylinder" });
    expect(step([box()], [box(), other])).toEqual({ key: "historyStep.addedOne", values: { name: "Cylinder" } });
    expect(step([], [box(), other])).toEqual({ key: "historyStep.addedMany", values: { count: 2 } });
    expect(step([box(), other], [box()])).toEqual({ key: "historyStep.deletedOne", values: { name: "Cylinder" } });
  });

  it("tells moving, rotating, resizing and colouring apart", () => {
    expect(step([box()], [box({ x: 12, z: -3 })]).key).toBe("historyStep.movedOne");
    expect(step([box()], [box({ rotation: 45 })]).key).toBe("historyStep.rotatedOne");
    // A handle keeps the opposite side in place, so the centre moves with the size.
    expect(step([box()], [box({ width: 30, x: 5 })]).key).toBe("historyStep.resizedOne");
    expect(step([box()], [box({ color: "#00ff00" })]).key).toBe("historyStep.colorOne");
    expect(step([box()], [box({ hole: true })]).key).toBe("historyStep.holeOne");
    expect(step([box({ hole: true })], [box({ hole: false })]).key).toBe("historyStep.solidOne");
    expect(step([box()], [box({ hidden: true })]).key).toBe("historyStep.hiddenOne");
    expect(step([box()], [box({ name: "Lid" })])).toEqual({ key: "historyStep.renamedOne", values: { name: "Box", newName: "Lid" } });
  });

  it("counts several objects with the same change and falls back when they differ", () => {
    const a = box({ id: "a" });
    const b = box({ id: "b" });
    expect(step([a, b], [{ ...a, x: 4 }, { ...b, x: 4 }])).toEqual({ key: "historyStep.movedMany", values: { count: 2 }, detail: { kind: "length", mm: 4 } });
    expect(step([a, b], [{ ...a, x: 4 }, { ...b, color: "#000000" }])).toEqual({ key: "historyStep.editedMany", values: { count: 2 } });
  });

  it("recognises grouping and ungrouping", () => {
    const a = box({ id: "a", name: "A" });
    const b = box({ id: "b", name: "B" });
    const group = box({ id: "g", name: "Group", kind: "group" as WorkplaneShape["kind"], groupedShapes: [a, b] });
    expect(step([a, b], [group])).toEqual({ key: "historyStep.grouped", values: { count: 2, name: "Group" } });
    expect(step([group], [a, b])).toEqual({ key: "historyStep.ungrouped", values: { name: "Group" } });
  });

  it("names a change to the notes or reference points when no object changed", () => {
    const note: WorkplaneNote = { id: "n1", text: "Check this", x: 0, y: 0, z: 0 };
    const point: WorkplaneNote = { id: "p1", text: "", x: 1, y: 2, z: 3, kind: "point" };
    expect(describeHistoryStep(entry([box()]), entry([box()], [note])).key).toBe("historyStep.noteAdded");
    expect(describeHistoryStep(entry([box()]), entry([box()], [point])).key).toBe("historyStep.pointAdded");
    expect(describeHistoryStep(entry([box()], [point]), entry([box()], [{ ...point, x: 9 }])).key).toBe("historyStep.pointChanged");
  });
});

describe("history step descriptions of the editor's own steps", () => {
  const parts = () => [box({ id: "a", name: "A", x: -20 }), box({ id: "b", name: "B", x: 20, color: "#00ff00" })];
  const realGroup = () => {
    const group = groupedShape(parts());
    if (!group) throw new Error("the parts did not group");
    return { ...group, name: "Group" };
  };

  it("recognises grouping, though grouping gives every part an id of its own", () => {
    const group = realGroup();
    expect(group.groupedShapes?.map((part) => part.id)).not.toContain("a");
    expect(step(parts(), [group])).toEqual({ key: "historyStep.grouped", values: { count: 2, name: "Group" } });
  });

  it("recognises ungrouping, which gives the parts ids of their own again", () => {
    const group = realGroup();
    expect(step([group], restoreGroupedChildren(group))).toEqual({ key: "historyStep.ungrouped", values: { name: "Group" } });
  });

  it("tells Edit group and Done from ungrouping and grouping by the groups open in each state", () => {
    const group = realGroup();
    const closed = entry([group]);
    const opened = entry(restoreGroupedChildren(group));
    const open = (state: typeof closed) => (state === opened ? 1 : 0);
    expect(describeHistoryStep(closed, opened, open)).toEqual({ key: "historyStep.groupOpened", values: { name: "Group" } });
    expect(describeHistoryStep(opened, closed, open)).toEqual({ key: "historyStep.groupClosed", values: { name: "Group" } });
    expect(historyStepsAround([closed, opened], 1, open).last).toEqual({ key: "historyStep.groupOpened", values: { name: "Group" } });
  });

  it("names the tool of a new edge treatment, even when it rebuilt the body", () => {
    const treated = (kind: "fillet" | "chamfer" | "shell" | "deleteFace") => box({ edgeTreatments: [{ kind, amount: 1, edgeCount: 4 }], cadBrep: "brep", kind: "imported" as WorkplaneShape["kind"] });
    expect(step([box()], [treated("fillet")]).key).toBe("historyStep.roundedOne");
    expect(step([box()], [treated("chamfer")]).key).toBe("historyStep.chamferedOne");
    expect(step([box()], [treated("shell")]).key).toBe("historyStep.hollowedOne");
    expect(step([box()], [treated("deleteFace")]).key).toBe("historyStep.facesDeletedOne");
  });

  it("names copies as copies: Duplicate, paste and a pattern", () => {
    const source = box({ name: "Peg" });
    const copy = (id: string, x: number) => box({ id, name: "Peg", x });
    expect(step([source], [source, copy("c1", 30)])).toEqual({ key: "historyStep.duplicatedOne", values: { name: "Peg" } });
    expect(step([source], [source, copy("c1", 30), copy("c2", 60), copy("c3", 90)])).toEqual({ key: "historyStep.copiesOf", values: { count: 3, name: "Peg" } });
    const other = box({ id: "cyl", name: "Cylinder", kind: "cylinder" });
    expect(step([source, other], [source, other, copy("c1", 30), { ...other, id: "c2", x: 50 }])).toEqual({ key: "historyStep.duplicatedMany", values: { count: 2 } });
    // A copy that differs in more than its place is a new object, as one brought back from the history with its time in the name.
    expect(step([source], [source, box({ id: "c1", name: "Peg (12:32)" })])).toEqual({ key: "historyStep.addedOne", values: { name: "Peg (12:32)" } });
  });
});

describe("history step measures (#1023)", () => {
  const treated = (kind: "fillet" | "chamfer" | "shell" | "offset", amount: number) =>
    box({ edgeTreatments: [{ kind, amount, edgeCount: 4 }], cadBrep: "brep", kind: "imported" as WorkplaneShape["kind"] });

  it("gives a treatment the size it was made with", () => {
    expect(step([box()], [treated("fillet", 5)])).toMatchObject({ key: "historyStep.roundedOne", detail: { kind: "length", mm: 5 } });
    expect(step([box()], [treated("chamfer", 1.5)]).detail).toEqual({ kind: "length", mm: 1.5 });
    expect(step([box()], [treated("shell", 2)]).detail).toEqual({ kind: "length", mm: 2 });
  });

  it("gives a move its distance, a turn about one axis its angle and a resize the new size", () => {
    expect(step([box()], [box({ x: 3, z: 4 })]).detail).toEqual({ kind: "length", mm: 5 });
    expect(step([box()], [box({ rotation: 90 })]).detail).toEqual({ kind: "angle", degrees: 90 });
    expect(step([box({ rotation: 350 })], [box({ rotation: 10 })]).detail).toEqual({ kind: "angle", degrees: 20 });
    expect(step([box()], [box({ rotation: 30, rotationX: 45 })]).detail).toBeUndefined();
    expect(step([box()], [box({ width: 30, x: 5 })]).detail).toEqual({ kind: "size", mm: [30, 20, 20] });
  });

  it("shares a measure between objects only when they changed alike", () => {
    const a = box({ id: "a", name: "A" });
    const b = box({ id: "b", name: "B", x: 40 });
    expect(step([a, b], [{ ...a, x: 10 }, { ...b, x: 50 }]).detail).toEqual({ kind: "length", mm: 10 });
    expect(step([a, b], [{ ...a, x: 10 }, { ...b, x: 45 }]).detail).toBeUndefined();
  });

  it("leaves steps without one number as they were", () => {
    expect(step([box()], [box({ color: "#00ff00" })]).detail).toBeUndefined();
    expect(step([box()], [box({ name: "Lid" })]).detail).toBeUndefined();
  });

  it("prints the measure after the sentence, in millimetres for the AI tools", () => {
    expect(historyStepTextIn("en", { key: "historyStep.roundedOne", values: { name: "Box" }, detail: { kind: "length", mm: 5 } })).toBe("Rounded the edges of Box (5 mm)");
    expect(historyStepTextIn("en", { key: "historyStep.resizedOne", values: { name: "Box" }, detail: { kind: "size", mm: [30, 20, 12.5] } })).toBe("Resized Box (30 × 20 × 12.5 mm)");
    expect(historyStepTextIn("en", { key: "historyStep.rotatedOne", values: { name: "Box" }, detail: { kind: "angle", degrees: -45 } })).toBe("Rotated Box (-45°)");
    expect(historyStepTextIn("en", { key: "historyStep.colorOne", values: { name: "Box" } })).toBe("Changed the colour of Box");
  });
});
