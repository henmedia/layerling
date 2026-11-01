import { beforeAll, describe, expect, it, vi } from "vitest";
import manifoldModule, { type ManifoldToplevel } from "manifold-3d";
import { checkClearance, clearanceMeshShape } from "@/lib/clearanceCheck";
import { articulateSolid, normalizeFlexiOptions } from "@/lib/flexiJoints";
import { rememberManifoldRuntime } from "@/lib/manifoldHandle";
import type { WorkplaneShape } from "@/types/layerling";

/**
 * The clearance check with the real Manifold kernel: gaps beside and above each other, an overlap with its volume, an
 * axle in a bore, and a flexi bar imported as one object, checked part by part (also scaled down, the case it is for).
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
});

const cube = (id: string, x: number, elevation = 0, size = 10): WorkplaneShape => (
  { id, name: id, kind: "box", color: "#d97813", x, z: 0, elevation, rotation: 0, width: size, depth: size, size, height: size, locked: false, hidden: false } as WorkplaneShape
);

/** A Manifold solid as a mesh object of the design (nine numbers a triangle, scene frame). */
function meshObject(id: string, solid: ReturnType<ManifoldToplevel["Manifold"]["cube"]>) {
  const mesh = solid.getMesh();
  const positions: number[] = [];
  for (const index of mesh.triVerts) positions.push(mesh.vertProperties[index * mesh.numProp], mesh.vertProperties[index * mesh.numProp + 1], mesh.vertProperties[index * mesh.numProp + 2]);
  return clearanceMeshShape(id, id, "#19c37d", positions)!;
}

describe("the clearance check (real Manifold kernel)", () => {
  it("measures a gap beside each other as within the same layer", async () => {
    const result = await checkClearance([cube("a", 0), cube("b", 10.4)], { threshold: 0.3 });
    expect(result.overlaps).toHaveLength(0);
    expect(result.tight).toHaveLength(0);
    expect(result.fine).toHaveLength(1);
    expect(result.fine[0].gapMm).toBeCloseTo(0.4, 2);
    expect(result.fine[0].direction).toBe("side");
  });

  it("measures a gap above each other as between layers", async () => {
    const result = await checkClearance([cube("a", 0), cube("b", 0, 10.4)], { threshold: 0.3 });
    expect(result.fine[0].gapMm).toBeCloseTo(0.4, 2);
    expect(result.fine[0].direction).toBe("layer");
  });

  it("reports an overlap with its volume, where it lies", async () => {
    const result = await checkClearance([cube("a", 0), cube("b", 9)]);
    expect(result.overlaps).toHaveLength(1);
    const [overlap] = result.overlaps;
    expect(overlap.volumeMm3).toBeGreaterThan(99);
    expect(overlap.volumeMm3).toBeLessThan(101);
    expect(overlap.center[0]).toBeCloseTo(4.5, 6);
    expect(overlap.box.max[0] - overlap.box.min[0]).toBeCloseTo(1, 6);
    expect(overlap.positions.length % 9).toBe(0);
  });

  it("finds the gap between an axle and its bore, within the chord error of their segments", async () => {
    // Ø 5 in Ø 5.6: 0.3 all round. Both are 64-sided polygons with their corners on the circle; between corners a side
    // lies cos(π/64) closer to the middle - for the bore that narrows the gap by up to 2.8 (1 - cos(π/64)) = 0.0034 mm.
    const segments = 64;
    const block = runtime.Manifold.cube([20, 10, 20], true).translate([0, 5, 0]);
    const bore = runtime.Manifold.cylinder(12, 2.8, 2.8, segments).rotate([-90, 0, 0]).translate([0, -1, 0]);
    const holder = block.subtract(bore);
    const axle = runtime.Manifold.cylinder(10, 2.5, 2.5, segments).rotate([-90, 0, 0]);
    const result = await checkClearance([meshObject("holder", holder), meshObject("axle", axle)], { threshold: 0.3 });
    const gaps = [...result.tight, ...result.fine];
    expect(result.overlaps).toHaveLength(0);
    expect(gaps).toHaveLength(1);
    const chord = 2.8 * (1 - Math.cos(Math.PI / segments));
    expect(gaps[0].gapMm).toBeGreaterThan(0.3 - chord - 1e-3);
    expect(gaps[0].gapMm).toBeLessThan(0.3 + 1e-3);
    expect(gaps[0].direction).toBe("side");
    for (const solid of [block, bore, holder, axle]) solid.delete();
  });

  it("checks the links of a flexi bar imported as one object, and finds them too tight scaled to 70 %", async () => {
    const bar = runtime.Manifold.cube([100, 8, 20], true).translate([0, 4, 0]);
    const made = articulateSolid(runtime, bar, normalizeFlexiOptions({ joints: 4, clearance: 0.4, swing: 30 }));
    if ("error" in made) throw new Error(made.error);
    const whole = runtime.Manifold.compose(made.links);
    const dragon = meshObject("bar", whole);
    const started = performance.now();
    const result = await checkClearance([dragon], { threshold: 0.3 });
    const took = performance.now() - started;
    expect(result.parts).toHaveLength(made.links.length);
    expect(result.parts.every((part) => part.id === "bar" && part.part !== null)).toBe(true);
    expect(result.overlaps).toHaveLength(0);
    expect(result.touching).toHaveLength(0);
    // Neighbouring links keep the clearance they were cut with.
    const gaps = [...result.tight, ...result.fine];
    expect(gaps.length).toBeGreaterThanOrEqual(made.links.length - 1);
    expect(Math.min(...gaps.map((gap) => gap.gapMm))).toBeGreaterThan(0.39);
    expect(result.tight).toHaveLength(0);
    // Against Manifold's own minGap: the closest points agree within 0.01 mm.
    const byKey = new Map(result.parts.map((part, index) => [part.key, index]));
    for (const gap of gaps) {
      const own = made.links[byKey.get(gap.a)!].minGap(made.links[byKey.get(gap.b)!], 5);
      expect(Math.abs(gap.gapMm - own)).toBeLessThan(0.01);
    }
    // Scaled down to 70 % the joints are 0.28 mm: too tight for 0.3.
    const scaled = await checkClearance([{ ...dragon, width: dragon.width * 0.7, depth: dragon.depth * 0.7, height: dragon.height * 0.7, size: dragon.size * 0.7 }], { threshold: 0.3 });
    expect(scaled.tight.length).toBeGreaterThanOrEqual(made.links.length - 1);
    expect(Math.min(...scaled.tight.map((gap) => gap.gapMm))).toBeGreaterThan(0.27);
    expect(Math.max(...scaled.tight.map((gap) => gap.gapMm))).toBeLessThan(0.3);
    // Checked whole, it is one part: nothing to check against.
    const whole2 = await checkClearance([dragon], { splitParts: false });
    expect(whole2.parts).toHaveLength(1);
    expect(whole2.tooFew).toBe(true);
    console.info(`flexi bar, ${made.links.length} links: checked in ${took.toFixed(0)} ms`);
    for (const solid of [bar, whole, ...made.links]) solid.delete();
  });

  it("leaves pairs far apart clear without measuring them", async () => {
    const result = await checkClearance([cube("a", 0), cube("b", 40)]);
    expect(result.clearCount).toBe(1);
    expect([...result.tight, ...result.fine, ...result.overlaps]).toHaveLength(0);
  });
});
