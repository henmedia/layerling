import { describe, expect, it } from "vitest";
import { groupedShape, restoreGroupedChildren } from "@/lib/editorBooleans";
import { lidCornerPart, lidTargetsWithoutCorners } from "@/lib/lidTool";
import { derivedLocalId } from "@/lib/localIds";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * What an earlier lid left in a body's corners, found again when a lid is made for it once more (Discussion #1985). The
 * groups here are laid together without the kernel; the lids themselves are in tests/e2e/lidAgain.e2e.ts.
 */

const part = (id: string, x: number, z: number, overrides: Partial<WorkplaneShape> = {}) => ({ id, name: id, kind: "box", color: "#cf101b", x, z, elevation: 0, rotation: 0, width: 10, depth: 10, size: 10, height: 10, locked: false, hidden: false, ...overrides } as WorkplaneShape);

/** A box 60 x 40 with a post and a pocket in two of its corners, grouped as the lid tool groups them. */
function lidGroup() {
  return {
    ...groupedShape([
      part("box", 0, 0, { width: 60, depth: 40, size: 60, height: 30 }),
      part("box-magnet-post-1", -25, -15, { height: 30 }),
      part("box-magnet-posts-2", 25, 15, { height: 30 }),
      part("box-magnet-3", -25, -15, { elevation: 27, height: 4, hole: true }),
      part("box-magnet-4", 25, 15, { elevation: 27, height: 4, hole: true }),
    ])!,
    groupOperation: "group" as const,
  };
}

/** Never called where no group has to be built again. */
const noRebuild = async () => ({ error: "not expected" });

const names = (shapes: readonly WorkplaneShape[]) => shapes.map((shape) => shape.name);

describe("what an earlier lid left in a body's corners (Discussion #1985)", () => {
  it("knows its posts and pockets by their ids, through grouping and ungrouping", () => {
    expect(lidCornerPart({ id: "box-1-magnet-post-7f3a" })).toBe("post");
    expect(lidCornerPart({ id: "box-1-magnet-posts-7f3a" })).toBe("post");
    expect(lidCornerPart({ id: "box-1-magnet-7f3a" })).toBe("pocket");
    expect(lidCornerPart({ id: "box-1-lid-7f3a" })).toBeNull();
    expect(lidCornerPart({ id: "box-1-hinge-7f3a" })).toBeNull();
    const grouped = derivedLocalId("box-1-magnet-7f3a", "group-child");
    expect(lidCornerPart({ id: grouped })).toBe("pocket");
    expect(lidCornerPart({ id: derivedLocalId(grouped, "ungroup") })).toBe("pocket");
    expect(lidCornerPart({ id: derivedLocalId(derivedLocalId("box-1-magnet-post-7f3a", "group-child"), "ungroup") })).toBe("post");
  });

  it("opens the lid's group into the body for a lid with magnets or screws of its own", async () => {
    const group = lidGroup();
    const result = await lidTargetsWithoutCorners([group], "all", noRebuild);
    if ("failure" in result) throw new Error(result.failure);
    expect(names(result.targets)).toEqual(["box"]);
    // The box stands where it stood in the group.
    const [box] = restoreGroupedChildren(group);
    expect(result.targets[0]).toMatchObject({ x: box.x, z: box.z, elevation: box.elevation, width: 60, depth: 40, height: 30 });
  });

  it("keeps the posts for a lid that brings none, and only closes the pockets", async () => {
    const result = await lidTargetsWithoutCorners([lidGroup()], "pockets", noRebuild);
    if ("failure" in result) throw new Error(result.failure);
    expect(names(result.targets)).toEqual(["box", "box-magnet-post-1", "box-magnet-posts-2"]);
    expect(result.targets.some((shape) => shape.hole)).toBe(false);
  });

  it("leaves a body alone that has nothing of an earlier lid", async () => {
    const box = part("box", 0, 0);
    const plain = groupedShape([part("a", 0, 0), part("b", 20, 0, { hole: true })])!;
    const result = await lidTargetsWithoutCorners([box, plain], "all", noRebuild);
    expect(result).toEqual({ targets: [box, plain] });
  });

  it("builds a group round the lid's group again without them, and says why where that fails", async () => {
    // The box with its lid's parts, grouped with a hole afterwards.
    const outer = { ...groupedShape([lidGroup(), part("cable", 0, 20, { hole: true })])!, id: "outer", name: "Outer", groupOperation: "group" as const };
    const built: { group: string; parts: string[] }[] = [];
    const result = await lidTargetsWithoutCorners([outer], "all", async (group, parts) => {
      built.push({ group: group.id, parts: names(parts) });
      return { ...group, name: "Outer again" };
    });
    if ("failure" in result) throw new Error(result.failure);
    // The lid's group inside is left with the box alone, which takes its place beside the hole.
    expect(built).toEqual([{ group: "outer", parts: ["box", "cable"] }]);
    expect(names(result.targets)).toEqual(["Outer again"]);

    // With the posts kept, the lid's group stays one part of the group round it: both are built again.
    built.length = 0;
    const kept = await lidTargetsWithoutCorners([outer], "pockets", async (group, parts) => {
      built.push({ group: group.name, parts: names(parts) });
      return { ...group, groupedShapes: undefined };
    });
    if ("failure" in kept) throw new Error(kept.failure);
    expect(built).toEqual([{ group: "Group", parts: ["box", "box-magnet-post-1", "box-magnet-posts-2"] }, { group: "Outer", parts: ["Group", "cable"] }]);

    expect(await lidTargetsWithoutCorners([outer], "all", async () => ({ error: "The group could not be built." }))).toEqual({ failure: "The group could not be built." });
  });
});
