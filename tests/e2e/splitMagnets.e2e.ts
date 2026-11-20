import { beforeAll, describe, expect, it, vi } from "vitest";
import manifoldModule, { type ManifoldToplevel } from "manifold-3d";
import type { WorkplaneShape } from "@/types/layerling";
import { previewSplitConnectors, splitShapeByPlane, withConnectorsNote } from "@/lib/editorBooleans";
import { meshForShape } from "@/lib/editorMeshCore";
import { rememberManifoldRuntime } from "@/lib/manifoldHandle";
import type { ManifoldSolid } from "@/lib/manifoldSplit";
import { magnetPocketMeasures } from "@/lib/magnetPocket";
import { normalizeSplitConnectorOptions, SPLIT_CONNECTOR_DEFAULTS, splitMagnetPocket, type SplitConnectorOptions } from "@/lib/splitConnectors";

/*
 * Split's magnets connector with the real kernel: each half gets a pocket for a round magnet, face to face across the
 * cut, with a narrower glue well below it (an inverted top hat). A magnet put into each pocket sits just below the cut
 * face, clears its half, and cannot go on into the well; nothing is printed beside the halves.
 */
const kernel = vi.hoisted(() => ({ runtime: null as Promise<unknown> | null }));
vi.mock("@/lib/editorMeshCore", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/editorMeshCore")>()),
  getManifoldRuntime: () => kernel.runtime,
}));

let runtime: ManifoldToplevel;

beforeAll(async () => {
  kernel.runtime = manifoldModule().then((loaded) => {
    loaded.setup();
    rememberManifoldRuntime(loaded);
    return loaded;
  });
  runtime = (await kernel.runtime) as ManifoldToplevel;
});

const box = (width: number, depth: number, height: number): WorkplaneShape => ({
  id: "box", name: "Box", kind: "box", color: "#d41721",
  x: 0, z: 0, elevation: 0, size: Math.max(width, depth), width, depth, height, rotation: 0,
} as WorkplaneShape);

function solidOf(shape: WorkplaneShape, created: ManifoldSolid[]) {
  const mesh = meshForShape(shape);
  const made = new runtime.Mesh({ numProp: 3, vertProperties: new Float32Array(mesh.vertices.flat()), triVerts: new Uint32Array(mesh.faces.flat()), tolerance: 1e-4 });
  made.merge();
  const solid = runtime.Manifold.ofMesh(made);
  created.push(solid);
  return solid;
}

const dispose = (values: { delete?: () => void }[]) => Array.from(new Set(values)).forEach((value) => value.delete?.());

/** An upright disc (along y) of `radius`, from `bottom` for `height`, at x, z: a magnet, or a probe. */
function disc(x: number, z: number, bottom: number, height: number, radius: number, created: ManifoldSolid[]) {
  const cylinder = runtime.Manifold.cylinder(height, radius, radius, 64);
  created.push(cylinder);
  const upright = cylinder.transform([1, 0, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, x, bottom, z, 1]);
  created.push(upright);
  return upright;
}

const options = (patch: Partial<SplitConnectorOptions>) => normalizeSplitConnectorOptions({ ...SPLIT_CONNECTOR_DEFAULTS, ...patch });

describe("magnets in a box split across the middle", () => {
  const shape = box(60, 30, 40);
  const plane = { axis: "y" as const, normal: [0, 1, 0] as [number, number, number], position: 20 };
  const magnets = options({ kind: "magnets", magnetDiameter: 6, magnetHeight: 2, clearance: 0.1 });
  const pocket = splitMagnetPocket(magnets);

  it("measures the pocket as the magnet pocket tool does: 0.1 mm round it, 0.2 mm deeper, a 3 mm well 1 mm deep", () => {
    expect(pocket).toEqual(magnetPocketMeasures({ diameter: 6, height: 2, gap: 0.1, well: true }));
    expect(pocket.pocketDiameter).toBeCloseTo(6.2, 6);
    expect(pocket.pocketDepth).toBeCloseTo(2.2, 6);
    expect(pocket.wellDiameter).toBeCloseTo(3, 6);
    expect(pocket.wellDepth).toBeCloseTo(1, 6);
  });

  it("makes two closed halves and nothing beside them, as many pockets as the preview promised", async () => {
    const preview = await previewSplitConnectors([shape], plane, magnets);
    expect(preview.tally.placed).toBeGreaterThanOrEqual(2);
    const result = await splitShapeByPlane(shape, plane, magnets);
    expect(result.parts).toHaveLength(2);
    expect(result.connectors).toEqual(preview.tally);
    const created: ManifoldSolid[] = [];
    const [upper, lower] = result.parts!.map((part) => solidOf(part, created));
    [upper, lower].forEach((solid) => {
      expect(solid.status()).toBe("NoError");
      expect(solid.decompose().length).toBe(1);
    });
    // Each half lost its pockets and wells: pocket and well, no more, no less (a hair for the mouth's chamfer and the facets).
    const one = Math.PI * ((pocket.pocketDiameter / 2) ** 2 * pocket.pocketDepth + (pocket.wellDiameter / 2) ** 2 * pocket.wellDepth);
    const lost = 60 * 30 * 20 - upper.volume();
    expect(lost).toBeGreaterThan(preview.tally.placed * one * 0.97);
    expect(lost).toBeLessThan(preview.tally.placed * one * 1.06);
    expect(upper.volume()).toBeCloseTo(lower.volume(), 2);
    dispose(created);
  });

  it("seats a magnet in each pocket just below the cut face, and the well is too narrow for it to go on", async () => {
    const preview = await previewSplitConnectors([shape], plane, magnets);
    const result = await splitShapeByPlane(shape, plane, magnets);
    const created: ManifoldSolid[] = [];
    const [upper, lower] = result.parts!.map((part) => solidOf(part, created));
    for (const [x, , z] of preview.points) {
      // The magnet itself, sitting on the pocket's floor in the upper half and in the lower one: it touches neither.
      const up = disc(x, z, 20 + pocket.pocketDepth - 2, 2, 3, created);
      const down = disc(x, z, 20 - pocket.pocketDepth, 2, 3, created);
      const intoUpper = upper.intersect(up);
      const intoLower = lower.intersect(down);
      created.push(intoUpper, intoLower);
      expect(intoUpper.volume()).toBeLessThan(1e-3);
      expect(intoLower.volume()).toBeLessThan(1e-3);
      // A magnet 0.1 mm further in runs into the ledge: the well does not take it.
      const deeper = disc(x, z, 20 + pocket.pocketDepth - 1.9, 2, 3, created);
      const onLedge = upper.intersect(deeper);
      created.push(onLedge);
      expect(onLedge.volume()).toBeGreaterThan(0.5);
      // The well goes on below the ledge, narrower.
      const well = disc(x, z, 20 + pocket.pocketDepth + 0.05, 0.9, pocket.wellDiameter / 2 - 0.05, created);
      const inWell = upper.intersect(well);
      created.push(inWell);
      expect(inWell.volume()).toBeLessThan(1e-3);
    }
    dispose(created);
  });

  it("leaves out the well when asked, and says what to do with the magnets", async () => {
    const plain = options({ kind: "magnets", magnetDiameter: 6, magnetHeight: 2, clearance: 0.1, magnetWell: false });
    expect(splitMagnetPocket(plain).wellDepth).toBe(0);
    const result = await splitShapeByPlane(shape, plane, plain);
    const created: ManifoldSolid[] = [];
    const upper = solidOf(result.parts![0], created);
    const placed = result.connectors!.placed;
    const lost = 60 * 30 * 20 - upper.volume();
    const one = Math.PI * 3.1 ** 2 * 2.2;
    expect(lost).toBeLessThan(placed * one * 1.06);
    dispose(created);
    expect(withConnectorsNote("Split", "magnets", { placed: 2, faces: 1, tooSmall: 0, tooThin: 0 })).toBe("Split. 2 pairs of magnet pockets for 4 magnets: put each pair together first so they attract, then press them in.");
  });

  it("gives a half too thin for the pocket none", async () => {
    // 2 mm above the cut: no room for a 2.2 mm pocket and its skin.
    const thin = await previewSplitConnectors([box(60, 30, 22)], { axis: "y", normal: [0, 1, 0], position: 20 }, magnets);
    expect(thin.tally.placed).toBe(0);
    expect(thin.tally.tooThin).toBeGreaterThan(0);
  });
});
