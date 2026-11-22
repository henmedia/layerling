import { beforeAll, describe, expect, it, vi } from "vitest";
import manifoldModule from "manifold-3d";
import type { WorkplaneShape } from "@/types/layerling";
import { buildGroupedShapeFromSelection, manifoldFromMeshData } from "@/lib/editorBooleans";
import { meshForShape } from "@/lib/editorMeshCore";
import { lidLabelHoles, type LidLabel } from "@/lib/lidTool";
import { rememberManifoldRuntime } from "@/lib/manifoldHandle";
import { sceneShape, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { loadTextFonts } from "@/lib/textFonts";

/**
 * The labels Make lid cuts into a lid, as the editor cuts them: texts grouped with the lid as holes. An "L" tells which
 * way a label reads: its upright on the left and its foot at the bottom put more of it left of and below its middle.
 */
const kernel = vi.hoisted(() => ({ runtime: null as Promise<unknown> | null }));
vi.mock("@/lib/editorMeshCore", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/editorMeshCore")>()),
  getManifoldRuntime: () => kernel.runtime,
}));
let runtime: Awaited<ReturnType<typeof manifoldModule>>;
beforeAll(async () => {
  kernel.runtime = manifoldModule().then((loaded) => { loaded.setup(); rememberManifoldRuntime(loaded); runtime = loaded; return loaded; });
  await kernel.runtime;
  await loadTextFonts();
});

const asset = () => toolbarShapeAssets.find((entry) => entry.kind === "text")!;

/** A plate 60 x 40 x 2 lying on the workplane, turned `turn` degrees about the up axis, as a lid's plate lies. */
const plate = (turn: number): WorkplaneShape => sceneShape({ id: "plate", name: "Lid", kind: "box", color: "#c00", x: 0, z: 0, elevation: 0, width: 60, depth: 40, height: 2, rotation: turn });

/** What `label` takes out of the plate: where it lies, in the plate's own frame (turned back), and how much it is. */
async function cut(label: LidLabel, turn: number) {
  const lid = plate(turn);
  const holes = lidLabelHoles(lid.id, [label], asset());
  const grouped = await buildGroupedShapeFromSelection([lid, ...holes], 2_000_000);
  expect(grouped.group).not.toBeNull();
  const whole = manifoldFromMeshData(runtime, meshForShape(lid));
  const engraved = manifoldFromMeshData(runtime, meshForShape(grouped.group!));
  // Without the slivers a turned plate's faces leave where its two meshes differ by a rounding.
  const gone = runtime.Manifold.union(whole.subtract(engraved).decompose().filter((piece) => piece.volume() > 0.05));
  const own = gone.rotate([0, -turn, 0]);
  const box = own.boundingBox();
  const mesh = own.getMesh();
  // The middle of what was cut away, by its triangles' corners: enough to tell an L's heavy side.
  let sx = 0, sz = 0, count = 0;
  for (let index = 0; index < mesh.vertProperties.length; index += mesh.numProp) {
    sx += mesh.vertProperties[index];
    sz += mesh.vertProperties[index + 2];
    count += 1;
  }
  return { volume: gone.volume(), box, heavyLeft: sx / count < (box.min[0] + box.max[0]) / 2, heavyFront: sz / count > (box.min[2] + box.max[2]) / 2 };
}

describe("a lid's labels cut into it as texts", () => {
  it("cuts a label that looks up as it is read, and one on the plate mirrored front to back", async () => {
    const up = await cut({ index: 0, text: "L", point: [0, 2, 0], width: 30, height: 20, depth: 0.6, up: true }, 0);
    expect(up.volume).toBeGreaterThan(1);
    // From the plate's top down by the label's depth, no deeper.
    expect(up.box.max[1]).toBeCloseTo(2, 3);
    expect(up.box.min[1]).toBeCloseTo(1.4, 2);
    // Read from above: the upright on the left, the foot towards the front.
    expect(up.heavyLeft).toBe(true);
    expect(up.heavyFront).toBe(true);
    const down = await cut({ index: 0, text: "L", point: [0, 0, 0], width: 30, height: 20, depth: 0.6, up: false }, 0);
    expect(down.box.min[1]).toBeCloseTo(0, 3);
    expect(down.box.max[1]).toBeCloseTo(0.6, 2);
    // Mirrored front to back: turned over about x, the foot is at the front again and the upright still on the left.
    expect(down.heavyLeft).toBe(true);
    expect(down.heavyFront).toBe(false);
    // As high as half the room is deep: 10 mm of letter height.
    expect(up.box.max[2] - up.box.min[2]).toBeGreaterThan(4);
    expect(up.box.max[2] - up.box.min[2]).toBeLessThan(10.5);
  }, 60000);

  it("turns a label with a lid that lies turned", async () => {
    for (const up of [true, false]) {
      const turn = 30;
      const label: LidLabel = { index: 0, text: "LLLL", point: [0, up ? 2 : 0, 0], width: 40, height: 16, depth: 0.6, up, turn };
      const turned = await cut(label, turn);
      const square = await cut({ ...label, turn: undefined }, 0);
      // In the plate's own frame the turned label lies as the square one does: along the plate, the same size and way round.
      for (const axis of [0, 2]) {
        expect(turned.box.max[axis] - turned.box.min[axis]).toBeCloseTo(square.box.max[axis] - square.box.min[axis], 1);
        expect((turned.box.max[axis] + turned.box.min[axis]) / 2).toBeCloseTo(0, 1);
      }
      expect(turned.box.max[0] - turned.box.min[0]).toBeGreaterThan(2 * (turned.box.max[2] - turned.box.min[2]));
      expect(turned.heavyLeft).toBe(square.heavyLeft);
      expect(turned.heavyFront).toBe(square.heavyFront);
      expect(turned.volume).toBeCloseTo(square.volume, 0);
    }
  }, 60000);

  it("fits the letters to a narrow compartment and never makes them smaller than 2 mm", () => {
    const [narrow] = lidLabelHoles("lid", [{ index: 2, text: "Washers", point: [5, 2, 7], width: 21, height: 30, depth: 0.6, up: true }], asset());
    // Seven letters in 21 mm: 4 mm high.
    expect(narrow).toMatchObject({ text: "Washers", hole: true, x: 5, z: 7, name: "Washers" });
    expect(narrow.depth).toBeCloseTo(4, 6);
    expect(narrow.width).toBeCloseTo(21, 6);
    expect(narrow.height).toBeCloseTo(0.7, 6);
    expect(narrow.id.startsWith("lid-label-2")).toBe(true);
    const [tiny] = lidLabelHoles("lid", [{ index: 0, text: "Washers", point: [0, 0, 0], width: 3, height: 3, depth: 0.4, up: false }], asset());
    expect(tiny.depth).toBe(2);
    expect(tiny.mirrorZ).toBe(true);
    const [large] = lidLabelHoles("lid", [{ index: 0, text: "A", point: [0, 2, 0], width: 80, height: 60, depth: 0.6, up: true }], asset());
    expect(large.depth).toBe(12);
  });
});
