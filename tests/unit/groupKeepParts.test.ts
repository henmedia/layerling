import { describe, expect, it } from "vitest";
import { groupedShape } from "@/lib/editorBooleans";
import { groupsStretchedInstead, groupsToKeepParts, keptPartsForResize, placeKeptPartsGroup } from "@/lib/groupKeepParts";
import { GROUP_SPAN_SHARE, groupCanKeepParts, groupKeepsPartsOnResize, keepPartAlongAxis, keptPartsLayout, offersGroupResize, type GroupFrameBox } from "@/lib/groupScale";
import { groupNeedsThreadRecut } from "@/lib/groupThreadRecut";
import { canonicalizeShape, normalizeGroupResize, shapeDepth, shapeWidth } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

// Discussion #526: a plate that is made 40 mm longer keeps its corner holes 5 mm from its corners and round,
// and its slot in the middle, when its group is set to keep its holes and small parts.

const plateAxis = { min: -50, max: 50 };
const longerAxis = { min: -70, max: 70 };

function along(part: [number, number], from = plateAxis, to = longerAxis) {
  const placed = keepPartAlongAxis({ min: part[0], max: part[1] }, from, to);
  return [Number(placed.min.toFixed(6)), Number(placed.max.toFixed(6)), placed.shrunk] as const;
}

describe("a part along one axis of a group that keeps its parts (#526)", () => {
  it("stretches the part that spans the group, as every group does", () => {
    expect(along([-50, 50])).toEqual([-70, 70, false]);
  });

  it("keeps a part near a side at its own length and its distance to that side", () => {
    // A 6 mm hole 5 mm from the left end, and one 5 mm from the right end.
    expect(along([-45, -39])).toEqual([-65, -59, false]);
    expect(along([39, 45])).toEqual([59, 65, false]);
  });

  it("keeps a part in the middle in the middle, and a part a little off it as far off", () => {
    expect(along([-12, 12])).toEqual([-12, 12, false]);
    // 0.4 mm off on a 100 mm plate is still centred: it stays 0.4 mm off.
    expect(along([-11.6, 12.4])).toEqual([-11.6, 12.4, false]);
    // Well off the middle it keeps its distance to the nearer side instead.
    expect(along([-20, 4])).toEqual([-40, -16, false]);
    expect(along([-4, 20])).toEqual([16, 40, false]);
  });

  it("stretches a part reaching across nearly the whole group, keeping its distance to both sides", () => {
    // The inside of a box with 2 mm walls keeps the walls 2 mm thick.
    expect(along([-48, 48])).toEqual([-68, 68, false]);
    // The back of a stand on its 3 mm foot, made taller: it still stands on the foot.
    expect(along([3, 83], { min: 0, max: 83 }, { min: 0, max: 123 })).toEqual([3, 123, false]);
    // The share that counts as spanning, and just below it.
    const span = GROUP_SPAN_SHARE * 100;
    expect(along([-50, -50 + span])[2]).toBe(false);
    expect(along([-50, -50 + span])[1] - along([-50, -50 + span])[0]).toBeCloseTo(span + 40, 6);
    expect(along([-50, -50 + span - 1])).toEqual([-70, -70 + span - 1, false]);
  });

  it("lets a part sticking out past a side stick out as far as before", () => {
    // A 4 mm plate made 10 mm thick: a hole through it and 1 mm past both faces still goes through.
    expect(along([-1, 5], { min: 0, max: 4 }, { min: 0, max: 10 })).toEqual([-1, 11, false]);
    // A pocket cut 2 mm deep into the underside stays 2 mm deep.
    expect(along([-1, 2], { min: 0, max: 4 }, { min: 0, max: 10 })).toEqual([-1, 2, false]);
  });

  it("leaves every part on an axis the resize did not touch exactly as it was", () => {
    for (const part of [{ min: -45.3, max: -39.1 }, { min: 12.7, max: 18.9 }, { min: -0.3, max: 0.1 }, { min: -49.9, max: 49.7 }]) {
      expect(keepPartAlongAxis(part, plateAxis, plateAxis)).toEqual({ ...part, shrunk: false });
    }
  });

  it("shrinks a part with the group, as before, when the group becomes too small for it", () => {
    const tiny = { min: -5, max: 5 };
    // The hole would reach past the far side at its size and distance.
    expect(along([-45, -39], plateAxis, tiny)).toEqual([-4.5, -3.9, true]);
    // The slot is longer than the whole group now.
    expect(along([-12, 12], plateAxis, tiny)).toEqual([-1.2, 1.2, true]);
    // The plate itself is the group.
    expect(along([-50, 50], plateAxis, tiny)).toEqual([-5, 5, false]);
    // The inside of the box would have no length left between walls of 2 mm.
    expect(along([-48, 48], plateAxis, { min: -1.5, max: 1.5 })).toEqual([-1.44, 1.44, true]);
    // Shrunk but still room: the hole keeps its size.
    expect(along([-45, -39], plateAxis, { min: -10, max: 10 })).toEqual([-5, 1, false]);
  });
});

describe("the parts of a group that keeps its parts (#526)", () => {
  const from: GroupFrameBox = { min: [-50, 0, -30], max: [50, 4, 30] };
  const to: GroupFrameBox = { min: [-70, 0, -30], max: [70, 4, 30] };

  it("lays out a plate with four corner holes and a slot made 40 mm longer", () => {
    const holes = [[-42, -22], [42, -22], [-42, 22], [42, 22]].map(([x, z]) => ({ center: [x, 2, z] as const, size: [6, 4, 6] as const }));
    const [plate, ...rest] = keptPartsLayout(from, to, [{ center: [0, 2, 0], size: [100, 4, 60] }, ...holes, { center: [0, 2, 0], size: [24, 4, 6] }]);
    expect(plate.size).toEqual([140, 4, 60]);
    expect(plate.stretch).toEqual([1.4, 1, 1]);
    expect(rest.map((part) => part.center)).toEqual([[-62, 2, -22], [62, 2, -22], [-62, 2, 22], [62, 2, 22], [0, 2, 0]]);
    expect(rest.map((part) => part.size)).toEqual([[6, 4, 6], [6, 4, 6], [6, 4, 6], [6, 4, 6], [24, 4, 6]]);
    expect([plate, ...rest].some((part) => part.shrunk)).toBe(false);
  });

  it("lays out a turned part by its box in the group and gives it its own size along its own axes", () => {
    // A bar of 20 x 4 x 4 turned a quarter turn about the vertical: its length lies along the group's depth.
    const quarter = [[0, 0, -1], [0, 1, 0], [1, 0, 0]] as const;
    const [bar] = keptPartsLayout(from, to, [{ center: [-40, 2, 0], size: [20, 4, 4], axes: quarter }]);
    // 4 mm wide in the group, 8 mm from the left end: it moves with that end and keeps its size.
    expect(bar.center[0]).toBeCloseTo(-60, 9);
    expect(bar.size).toEqual([20, 4, 4]);
    // The same bar across the whole depth, the depth made 100: its own length follows, its thickness does not.
    const deeper: GroupFrameBox = { min: [-50, 0, -50], max: [50, 4, 50] };
    const [across] = keptPartsLayout(from, deeper, [{ center: [-40, 2, 0], size: [60, 4, 4], axes: quarter }]);
    expect(across.size[0]).toBeCloseTo(100, 9);
    expect(across.size[1]).toBeCloseTo(4, 9);
    expect(across.size[2]).toBeCloseTo(4, 9);
    expect(across.stretch[2]).toBeCloseTo(100 / 60, 9);
  });

  it("keeps a square peg turned by 45 degrees at its size, its box at its distance to the side", () => {
    const half = Math.SQRT1_2;
    const turned = [[half, 0, -half], [0, 1, 0], [half, 0, half]] as const;
    const [peg] = keptPartsLayout(from, to, [{ center: [-40, 2, 0], size: [10, 4, 10], axes: turned }]);
    expect(peg.center[0]).toBeCloseTo(-60, 9);
    expect(peg.size.map((value) => Number(value.toFixed(9)))).toEqual([10, 4, 10]);
    expect(peg.shrunk).toBe(false);
  });

  it("says which parts had to shrink with a group made too small for them", () => {
    const narrow: GroupFrameBox = { min: [-5, 0, -30], max: [5, 4, 30] };
    const placed = keptPartsLayout(from, narrow, [{ center: [0, 2, 0], size: [100, 4, 60] }, { center: [-42, 2, -22], size: [6, 4, 6] }]);
    expect(placed.map((part) => part.shrunk)).toEqual([false, true]);
    expect(placed[1].size[0]).toBeCloseTo(0.6, 9);
    // Only along the axis that became too small: its depth stays.
    expect(placed[1].size[2]).toBe(6);
  });
});

function box(id: string, x: number, z: number, width: number, depth: number, overrides: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return { id, name: id, kind: "box", color: "#3f8fd2", x, z, elevation: 0, rotation: 0, width, depth, height: 4, size: Math.max(width, depth), ...overrides };
}

function cornerPlate(overrides: Partial<WorkplaneShape> = {}): WorkplaneShape {
  const holes = [[-42, -22], [42, -22], [-42, 22], [42, 22]].map(([x, z], index) => ({ ...box(`hole-${index}`, x, z, 6, 6), kind: "cylinder" as const, hole: true }));
  return { ...groupedShape([box("plate", 0, 0, 100, 60), ...holes])!, id: "group", groupResize: "keepParts", ...overrides };
}

const longer = (group: WorkplaneShape, width = 140) => ({ ...group, width, size: Math.max(width, shapeDepth(group)) });

describe("which groups keep their parts (#526)", () => {
  it("offers the choice on groups and bundles only", () => {
    const group = cornerPlate();
    expect(offersGroupResize(group)).toBe(true);
    expect(offersGroupResize({ ...group, groupOperation: "bundle" })).toBe(true);
    expect(offersGroupResize({ ...group, groupOperation: "hull" })).toBe(false);
    expect(offersGroupResize({ ...group, groupOperation: "intersection" })).toBe(false);
    expect(offersGroupResize({ ...group, layeredText: true })).toBe(false);
    expect(offersGroupResize(box("plate", 0, 0, 100, 60))).toBe(false);
  });

  it("stretches a mirrored, tapered or finished group as a whole", () => {
    const group = cornerPlate();
    expect(groupKeepsPartsOnResize(group)).toBe(true);
    expect(groupKeepsPartsOnResize({ ...group, groupResize: undefined })).toBe(false);
    expect(groupCanKeepParts({ ...group, mirrorX: true })).toBe(false);
    expect(groupCanKeepParts({ ...group, kind: "box", taperTopWidth: 50 })).toBe(false);
    expect(groupCanKeepParts({ ...group, edgeTreatments: [{ kind: "fillet", amount: 1, edgeCount: 4 }] })).toBe(false);
  });

  it("finds a group that was just resized, or switched on while stretched, and no other", () => {
    const group = cornerPlate();
    const before = new Map([[group.id, group]]);
    expect(groupsToKeepParts(before, [longer(group)]).map((shape) => shape.id)).toEqual(["group"]);
    // Not resized, or not set to keep its parts.
    expect(groupsToKeepParts(before, [group])).toEqual([]);
    expect(groupsToKeepParts(new Map([[group.id, { ...group, groupResize: undefined }]]), [longer({ ...group, groupResize: undefined })])).toEqual([]);
    // Stretched before the choice was made: switching it on lays the parts out again.
    const stretched = longer({ ...group, groupResize: undefined });
    expect(groupsToKeepParts(new Map([[group.id, stretched]]), [{ ...stretched, groupResize: "keepParts" }])).toHaveLength(1);
    // A group that comes in new (a copy, a part of an ungrouped group, another design) is left as it comes.
    expect(groupsToKeepParts(new Map(), [longer(group)])).toEqual([]);
    expect(groupsToKeepParts(before, [{ ...longer(group), id: "copy" }])).toEqual([]);
    // A locked group, and a mirrored one, which stretches everything and says so.
    expect(groupsToKeepParts(before, [{ ...longer(group), locked: true }])).toEqual([]);
    const mirrored = { ...group, mirrorZ: true };
    expect(groupsToKeepParts(new Map([[group.id, mirrored]]), [longer(mirrored)])).toEqual([]);
    expect(groupsStretchedInstead(new Map([[group.id, mirrored]]), [longer(mirrored)])).toHaveLength(1);
    expect(groupsStretchedInstead(before, [longer(group)])).toEqual([]);
  });

  it("leaves a resized group with a thread to this rebuild, not to cutting it again for the thread", () => {
    const tapped = { ...box("tap", 0, 0, 6, 6), kind: "thread" as const, threadDiameter: 6, threadPitch: 1, threadRole: "bore" as const, hole: true };
    const group = { ...groupedShape([box("plate", 0, 0, 40, 20), tapped])!, groupOperation: "group" as const };
    expect(groupNeedsThreadRecut(longer(group, 80))).toBe(true);
    expect(groupNeedsThreadRecut(longer({ ...group, groupResize: "keepParts" }, 80))).toBe(false);
  });

  it("saves only the choice to keep the parts; stretching is what a group does anyway", () => {
    expect(normalizeGroupResize("keepParts")).toBe("keepParts");
    expect(normalizeGroupResize("stretch")).toBeUndefined();
    expect(normalizeGroupResize("sideways")).toBeUndefined();
    expect(canonicalizeShape(cornerPlate()).groupResize).toBe("keepParts");
    expect("groupResize" in canonicalizeShape(cornerPlate({ groupResize: "stretch" }))).toBe(false);
  });
});

describe("the parts of a resized group, ready to be built again (#526)", () => {
  it("puts the corner holes 5 mm from the corners of the longer plate, round, with the plate stretched", () => {
    const { parts, shrunk } = keptPartsForResize(longer(cornerPlate()));
    expect(shrunk).toBe(0);
    const [plate, ...holes] = parts;
    expect(shapeWidth(plate)).toBeCloseTo(140, 9);
    expect(shapeDepth(plate)).toBeCloseTo(60, 9);
    expect(holes.map((hole) => [Number(hole.x.toFixed(6)), Number(hole.z.toFixed(6))])).toEqual([[-62, -22], [62, -22], [-62, 22], [62, 22]]);
    expect(holes.every((hole) => hole.hole && hole.kind === "cylinder" && shapeWidth(hole) === 6 && shapeDepth(hole) === 6)).toBe(true);
  });

  it("lays out a turned group in its own unturned frame, where it stands", () => {
    const turned = { ...longer(cornerPlate()), rotation: 30, x: 10, z: -5 };
    const { parts } = keptPartsForResize(turned);
    expect(parts.every((part) => part.rotation === 0)).toBe(true);
    expect(parts[1].x).toBeCloseTo(10 - 62, 9);
    expect(parts[1].z).toBeCloseTo(-5 - 22, 9);
  });

  it("keeps a part turned in the group turned", () => {
    const group = { ...groupedShape([box("plate", 0, 0, 100, 60), box("peg", -40, 0, 10, 10, { rotation: 45 })])!, groupResize: "keepParts" as const };
    const [, peg] = keptPartsForResize(longer(group)).parts;
    expect(peg.rotation).toBeCloseTo(45, 6);
    expect(shapeWidth(peg)).toBeCloseTo(10, 6);
    expect(peg.x - group.x).toBeCloseTo(-60, 6);
  });

  it("counts the parts that shrank with a group made too small for them", () => {
    expect(keptPartsForResize(longer(cornerPlate(), 10)).shrunk).toBe(4);
  });

  it("puts the group built again where the resized one stands, turned as it was, with everything of its own", () => {
    const resized = { ...longer(cornerPlate()), name: "Stand", color: "#e0793a", multicolor: true, rotation: 90, x: 10, z: 20, rotationPivot: [0.5, 0, 0] as [number, number, number] };
    const rebuilt = { ...groupedShape(keptPartsForResize(resized).parts)!, x: resized.x + 1, z: resized.z };
    const placed = placeKeptPartsGroup(rebuilt, resized);
    expect([placed.id, placed.name, placed.color, placed.multicolor, placed.groupResize, placed.rotation]).toEqual(["group", "Stand", "#e0793a", true, "keepParts", 90]);
    expect(placed.groupedShapes).toBe(rebuilt.groupedShapes);
    expect(placed.groupedBaseWidth).toBeCloseTo(140, 9);
    // Built 1 mm off along x, unturned; turned a quarter turn, that is 1 mm along -z.
    expect(placed.x).toBeCloseTo(10, 9);
    expect(placed.z).toBeCloseTo(19, 9);
    // The pivot stays where it stood in the design, 70 mm along the group's own x from the resized middle: 69 mm from the new one.
    expect(placed.rotationPivot?.[0]).toBeCloseTo(69 / 140, 6);
  });
});
