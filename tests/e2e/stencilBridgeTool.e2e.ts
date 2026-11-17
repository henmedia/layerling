import { beforeAll, describe, expect, it, vi } from "vitest";
import manifoldModule, { type ManifoldToplevel } from "manifold-3d";
import { buildGroupedShapeFromSelection, manifoldFromMeshData } from "@/lib/editorBooleans";
import { meshForShape } from "@/lib/editorMeshCore";
import { rememberManifoldRuntime } from "@/lib/manifoldHandle";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { stencilBridgeBase, stencilBridgeBoxes, stencilBridgeLevels, stencilBridgePlan } from "@/lib/stencilBridgeTool";
import { loadTextFonts } from "@/lib/textFonts";
import { canonicalizeShape, withHoleMode } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

/**
 * Stencil bridges for a printed stencil (Discussion #1438): a plate with "OB" cut through it loses the middle of the O
 * and both bellies of the B. The tool finds them from above and holds each with bridges grouped with the plate; the
 * plate is then one piece. A text engraved but not cut through gets none, and running the tool on its own group again
 * puts new bridges in place of the old ones.
 */
const kernel = vi.hoisted(() => ({ runtime: null as Promise<unknown> | null }));
vi.mock("@/lib/editorMeshCore", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/editorMeshCore")>()),
  getManifoldRuntime: () => kernel.runtime,
}));
let runtime: ManifoldToplevel;
beforeAll(async () => {
  kernel.runtime = manifoldModule().then((loaded) => { loaded.setup(); rememberManifoldRuntime(loaded); return loaded; });
  runtime = (await kernel.runtime) as ManifoldToplevel;
  await loadTextFonts();
});

const asset = (kind: string) => toolbarShapeAssets.find((entry) => entry.kind === kind)!;
const box = (id: string, width: number, depth: number, height: number, x = 0, z = 0, elevation = 0): WorkplaneShape => {
  const made = makeShapeFromAsset({ ...asset("box"), name: id }, { x, z, elevation }, { width, depth, height });
  return canonicalizeShape({ ...made, id, width, depth, height, size: Math.max(width, depth), x, z, elevation } as WorkplaneShape);
};
const text = (value: string, extra: Partial<WorkplaneShape> = {}) => ({ id: "letters", name: "Text", kind: "text", color: "#000", x: 30, z: 40, elevation: -1, rotation: 0, size: 40, width: 40, depth: 22, height: 5, text: value, font: "Sans", locked: false, hidden: false, ...extra } as WorkplaneShape);

/** Pieces and volume of a body's mesh. */
function pieces(shape: WorkplaneShape) {
  const solid = manifoldFromMeshData(runtime, meshForShape(shape));
  const parts = solid.decompose();
  const result = { count: parts.length, volume: solid.volume() };
  parts.forEach((part) => part.delete());
  solid.delete();
  return result;
}

async function group(parts: WorkplaneShape[]) {
  const built = await buildGroupedShapeFromSelection(parts, 1e7);
  expect(built.group).not.toBeNull();
  return canonicalizeShape({ ...built.group!, groupOperation: "group" });
}

/** The plate with the text cut through, 3 mm thick, off the origin so that the view from above is placed right. */
async function stencilPlate(letters = "OB", through = true) {
  const plate = box("plate", 60, 34, 3, 30, 40, 0);
  const hole = withHoleMode(text(letters, through ? {} : { elevation: 1.5, height: 3 }), true);
  return group([plate, hole]);
}

describe("stencil bridges for a printed stencil (#1438)", () => {
  it("finds the three parts of OB that would fall out and holds each", async () => {
    const plate = await stencilPlate();
    // The plate, the middle of the O and the two of the B: four pieces before.
    expect(pieces(plate).count).toBe(4);
    const plan = await stencilBridgePlan([plate], { width: 1.5, count: 2 });
    if (!plan.ok) throw new Error(plan.reason);
    expect(plan.parts).toBe(3);
    expect(plan.unheld).toBe(0);
    expect(plan.rects.length).toBeGreaterThanOrEqual(6);
    expect(plan.minY).toBeCloseTo(0, 5);
    expect(plan.maxY).toBeCloseTo(3, 5);
    // The bridges lie where the letters are, in the plate's own place.
    for (const rect of plan.rects) {
      for (const [x, z] of rect) {
        expect(x).toBeGreaterThan(0);
        expect(x).toBeLessThan(60);
        expect(z).toBeGreaterThan(23);
        expect(z).toBeLessThan(57);
      }
    }
    const bridges = stencilBridgeBoxes(plan.rects, stencilBridgeLevels(plan.minY, plan.maxY, { height: null, position: "bottom" }), { color: "#f00", name: "Bridge" });
    expect(bridges).toHaveLength(plan.rects.length);
    expect(bridges.every((bridge) => bridge.stencilBridge === true && bridge.height === 3 && bridge.elevation === 0)).toBe(true);
    const held = await group([plate, ...bridges]);
    // One piece now, and more than before: the bridges are not cut away by the letters.
    const after = pieces(held);
    expect(after.count).toBe(1);
    expect(after.volume).toBeGreaterThan(pieces(plate).volume);
  });

  it("puts a box exactly on its rectangle, turned along it", () => {
    const rect = [[0, 0], [4, 4], [3, 5], [-1, 1]] as const;
    const [bridge] = stencilBridgeBoxes([rect], { elevation: 1, height: 2 }, { color: "#000", name: "Bridge" });
    const xs = meshForShape(bridge).vertices.map((vertex) => [vertex[0], vertex[2]]);
    for (const [x, z] of rect) {
      expect(xs.some(([vx, vz]) => Math.hypot(vx - x, vz - z) < 1e-6)).toBe(true);
    }
    const ys = meshForShape(bridge).vertices.map((vertex) => vertex[1]);
    expect(Math.min(...ys)).toBeCloseTo(1, 6);
    expect(Math.max(...ys)).toBeCloseTo(3, 6);
  });

  it("places a lower bridge at the bottom, in the middle or at the top", () => {
    expect(stencilBridgeLevels(2, 5, { height: 1, position: "bottom" })).toEqual({ elevation: 2, height: 1 });
    expect(stencilBridgeLevels(2, 5, { height: 1, position: "middle" })).toEqual({ elevation: 3, height: 1 });
    expect(stencilBridgeLevels(2, 5, { height: 1, position: "top" })).toEqual({ elevation: 4, height: 1 });
    expect(stencilBridgeLevels(2, 5, { height: 9, position: "top" })).toEqual({ elevation: 2, height: 3 });
    expect(stencilBridgeLevels(2, 5, { height: null, position: "middle" })).toEqual({ elevation: 2, height: 3 });
  });

  it("gives no bridge to a text engraved but not cut through", async () => {
    const plate = await stencilPlate("OB", false);
    const plan = await stencilBridgePlan([plate], { width: 1.5, count: 2 });
    if (!plan.ok) throw new Error(plan.reason);
    expect(plan.parts).toBe(0);
    expect(plan.rects).toHaveLength(0);
  });

  it("takes a plate and its text hole not grouped yet", async () => {
    const plate = box("plate", 60, 34, 3, 30, 40, 0);
    const hole = withHoleMode(text("O"), true);
    const plan = await stencilBridgePlan([plate, hole], { width: 1.5, count: 2 });
    if (!plan.ok) throw new Error(plan.reason);
    expect(plan.parts).toBe(1);
    expect(plan.rects).toHaveLength(2);
  });

  it("puts new bridges in place of its own when run on its group again", async () => {
    const plate = await stencilPlate("O");
    const first = await stencilBridgePlan([plate], { width: 1.5, count: 2 });
    if (!first.ok) throw new Error(first.reason);
    const held = await group([plate, ...stencilBridgeBoxes(first.rects, stencilBridgeLevels(first.minY, first.maxY, { height: null, position: "bottom" }), { color: "#f00", name: "Bridge" })]);
    const { base, replaced } = stencilBridgeBase([held]);
    expect(replaced).toBe(2);
    expect(base).toHaveLength(1);
    // What is left is the plate with its letters, as it was: the middle of the O falls out again.
    expect(pieces(base[0]).count).toBe(2);
    const again = await stencilBridgePlan(base, { width: 1, count: 3 });
    if (!again.ok) throw new Error(again.reason);
    expect(again.parts).toBe(1);
    expect(again.rects).toHaveLength(3);
    // A group without bridges of its own is taken as it is.
    expect(stencilBridgeBase([plate])).toEqual({ base: [plate], replaced: 0 });
  });
});
