import { pathToFileURL } from "node:url";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { buildGroupedShapeFromSelection, restoreGroupedChildren, splitShapeIfCrossed, splitShapesByPlane, type RebuildStretchedGroup } from "@/lib/editorBooleans";
import { setManifoldAssetBase } from "@/lib/editorMeshCore";
import type { WorkplaneShape } from "@/types/layerling";

function shape(id: string, kind: string, x: number, width: number, extra: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return { id, name: id, kind, color: "#2f9bd8", x, z: 0, elevation: 0, size: width, width, depth: kind === "cylinder" ? width : 20, height: 20, rotation: 0, locked: false, hidden: false, ...extra } as WorkplaneShape;
}

const plate = () => shape("plate", "box", 0, 60);
const hole = (id: string, x: number) => shape(id, "cylinder", x, 6, { hole: true });
const atX: { axis: "x"; normal: [number, number, number]; position: number } = { axis: "x", normal: [1, 0, 0], position: 0 };

async function group(parts: WorkplaneShape[], id = "group") {
  const built = await buildGroupedShapeFromSelection(parts, 200_000);
  if (!built.group) throw new Error("no group");
  return { ...built.group, id, name: "Case" };
}

// As the editor's rebuildGroupFromParts does: built again from the parts.
const rebuild: RebuildStretchedGroup = async (original, parts) => {
  const built = await buildGroupedShapeFromSelection(parts, 200_000);
  return built.group ? { ...built.group, id: original.id, name: original.name } : { error: "not built" };
};

async function split(target: WorkplaneShape) {
  const outcome = await splitShapesByPlane([target], atX, () => true, splitShapeIfCrossed, undefined, undefined, rebuild);
  if (outcome.status !== "done") throw new Error(outcome.status);
  return outcome.replacements.get(target.id)!;
}

// Discussion #2171: a split group came back as two meshes that had lost all their parts.
describe("a split through a group goes part by part", () => {
  beforeAll(() => {
    setManifoldAssetBase(pathToFileURL(path.resolve("node_modules/manifold-3d") + path.sep).href);
  });

  it("makes two groups; the holes on each side stay the cylinders they were", async () => {
    const [positive, negative] = await split(await group([plate(), hole("near", -20), hole("far", 20)]));
    expect([positive.name, negative.name]).toEqual(["Case (X+)", "Case (X-)"]);
    expect(positive.id).not.toBe(negative.id);
    expect(positive.width).toBeCloseTo(30, 3);
    expect(negative.width).toBeCloseTo(30, 3);
    for (const [half, x] of [[positive, 20], [negative, -20]] as const) {
      const parts = restoreGroupedChildren(half);
      expect(parts).toHaveLength(2);
      const round = parts.find((part) => part.hole)!;
      expect(round).toMatchObject({ kind: "cylinder", width: 6 });
      expect(round.x).toBeCloseTo(x, 4);
    }
  });

  it("puts a hole the plane crosses whole into both halves, under ids of their own", async () => {
    const [positive, negative] = await split(await group([plate(), hole("middle", 0)]));
    for (const half of [positive, negative]) {
      const round = restoreGroupedChildren(half).find((part) => part.hole)!;
      expect(round).toMatchObject({ kind: "cylinder", width: 6 });
      expect(round.x).toBeCloseTo(0, 4);
      expect(half.width).toBeCloseTo(30, 3);
    }
    const ids = [positive, negative].map((half) => half.groupedShapes!.find((child) => child.hole)!.id);
    expect(ids[0]).not.toBe(ids[1]);
  });

  it("gives a side with one part that part itself, its settings kept", async () => {
    const parts = [shape("left", "box", -20, 20), shape("right", "box", 20, 20), shape("rod", "cylinder", -20, 6, { height: 30 })];
    const [positive, negative] = await split(await group(parts));
    expect(positive).toMatchObject({ kind: "box", name: "Case (X+)", width: 20 });
    expect(positive.groupedShapes?.length ?? 0).toBe(0);
    expect(restoreGroupedChildren(negative)).toHaveLength(2);
  });

  it("splits a group inside the group the same way", async () => {
    const inner = await group([plate(), hole("near", -20)], "inner");
    const lid = shape("lid", "box", 20, 10, { elevation: 20 });
    const [positive, negative] = await split(await group([inner, lid]));
    expect(restoreGroupedChildren(positive)).toHaveLength(2);
    // The only part on the minus side is the inner group's half, still a group with its hole.
    expect(restoreGroupedChildren(negative).some((part) => part.hole)).toBe(true);
  });

  it("cuts as one body where only a hole reaches across the plane", async () => {
    const target = await group([shape("block", "box", -20, 20), shape("bar", "box", 0, 30, { hole: true, depth: 4 })]);
    const outcome = await splitShapesByPlane([target], atX, () => true, splitShapeIfCrossed, undefined, undefined, rebuild);
    if (outcome.status !== "done") throw new Error(outcome.status);
    expect(outcome.splitCount).toBe(0);
  });

  it("without a way to build the group again cuts it as one body, as before", async () => {
    const before = await group([plate(), hole("far", 20)]);
    const outcome = await splitShapesByPlane([before], atX, () => true, splitShapeIfCrossed);
    if (outcome.status !== "done") throw new Error(outcome.status);
    for (const half of outcome.replacements.get("group")!) expect(half.groupedShapes?.length ?? 0).toBe(0);
  });
});
