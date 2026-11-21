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

async function group(parts: WorkplaneShape[]) {
  const built = await buildGroupedShapeFromSelection(parts, 200_000);
  if (!built.group) throw new Error("no group");
  return { ...built.group, id: "group", name: "Case" };
}

// As the editor's rebuildGroupFromParts does: built again from the parts, its own id and name kept.
const rebuild: RebuildStretchedGroup = async (original, parts) => {
  const built = await buildGroupedShapeFromSelection(parts, 200_000);
  return built.group ? { ...built.group, id: original.id, name: original.name } : { error: "not built" };
};

// Discussion #1707: a stretched group came back as one mesh that could not be ungrouped.
describe("a stretch through a group goes part by part", () => {
  beforeAll(() => {
    setManifoldAssetBase(pathToFileURL(path.resolve("node_modules/manifold-3d") + path.sep).href);
  });

  it("keeps the group, stretches the crossed plate, moves the hole beyond and leaves the one before", async () => {
    const before = await group([plate(), hole("near", -20), hole("far", 20)]);
    const outcome = await splitShapesByPlane([before], atX, () => true, splitShapeIfCrossed, undefined, 20, rebuild);
    expect(outcome.status).toBe("done");
    if (outcome.status !== "done") return;
    expect(outcome.splitCount).toBe(1);
    const [after] = outcome.replacements.get("group")!;
    expect(after.id).toBe("group");
    expect(after.name).toBe("Case");
    const parts = restoreGroupedChildren(after);
    expect(parts).toHaveLength(3);
    const near = parts.find((part) => part.id.startsWith("near"))!;
    const far = parts.find((part) => part.id.startsWith("far"))!;
    const body = parts.find((part) => !part.hole)!;
    // The holes stay holes and cylinders with their settings; only the plate the plane crosses became a mesh.
    expect(near).toMatchObject({ kind: "cylinder", hole: true });
    expect(far).toMatchObject({ kind: "cylinder", hole: true });
    expect(near.x).toBeCloseTo(-20, 4);
    expect(far.x).toBeCloseTo(40, 4);
    expect(body.width).toBeCloseTo(80, 3);
    expect(body.x).toBeCloseTo(10, 3);
  });

  it("makes it shorter the same way: what lies beyond comes back by the length", async () => {
    const before = await group([plate(), hole("near", -20), hole("far", 20)]);
    const outcome = await splitShapesByPlane([before], atX, () => true, splitShapeIfCrossed, undefined, -10, rebuild);
    if (outcome.status !== "done") throw new Error(outcome.status);
    const parts = restoreGroupedChildren(outcome.replacements.get("group")![0]);
    expect(parts.find((part) => part.id.startsWith("far"))!.x).toBeCloseTo(10, 4);
    expect(parts.find((part) => !part.hole)!.width).toBeCloseTo(50, 3);
  });

  it("without a way to build the group again stretches it as one body, as before", async () => {
    const before = await group([plate(), hole("far", 20)]);
    const outcome = await splitShapesByPlane([before], atX, () => true, splitShapeIfCrossed, undefined, 20);
    if (outcome.status !== "done") throw new Error(outcome.status);
    expect(outcome.replacements.get("group")![0].groupedShapes?.length ?? 0).toBe(0);
  });

  it("moves a selected part wholly beyond the plane along, without counting it as stretched", async () => {
    const outcome = await splitShapesByPlane([plate(), hole("far", 20), hole("near", -20)], atX, () => true, splitShapeIfCrossed, undefined, 20, rebuild);
    if (outcome.status !== "done") throw new Error(outcome.status);
    expect(outcome.splitCount).toBe(1);
    expect(outcome.replacements.get("far")![0].x).toBeCloseTo(40, 4);
    expect(outcome.replacements.has("near")).toBe(false);
  });

  it("does not move anything when the plane misses all of the selection", async () => {
    const outcome = await splitShapesByPlane([hole("far", 20)], atX, () => true, splitShapeIfCrossed, undefined, 20, rebuild);
    if (outcome.status !== "done") throw new Error(outcome.status);
    expect(outcome.splitCount).toBe(0);
  });
});
