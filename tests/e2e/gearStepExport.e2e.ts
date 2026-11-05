import { beforeAll, describe, expect, it, vi } from "vitest";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";
import type { WorkplaneShape } from "@/types/layerling";
import { cadModifierHelicalGearForShape } from "@/lib/cadProfileExtrusion";

/*
 * Helical and herringbone gears with many involute teeth in the STEP export (#1321): above 30 teeth they
 * were left out ("Nothing here can be written as STEP"), as the edge tool's limit on twisted faces applied
 * to the export too. The export takes them at any size now; the edge tool keeps its limit.
 */

(globalThis as unknown as { window: unknown }).window = { location: { href: pathToFileURL(resolve("apps/web/public") + "/").href } };

vi.mock("@/lib/brepKernel", async () => {
  const brep = await import("brepjs");
  const { OcctKernel } = await import("occt-wasm");
  const wasm = join(dirname(fileURLToPath(import.meta.resolve("occt-wasm"))), "occt-wasm.wasm");
  let ready: Promise<typeof brep> | null = null;
  let raw: Awaited<ReturnType<typeof OcctKernel.init>> | null = null;
  return {
    occtKernel: () => raw,
    loadBrepWithOcct: () =>
      (ready ??= (async () => {
        const kernel = await OcctKernel.init({ wasm });
        raw = kernel;
        brep.registerKernel("occt-wasm", brep.OcctWasmAdapter.fromKernel(kernel));
        return brep;
      })()),
  };
});

let exportShapesToStep: typeof import("@/lib/stepExport").exportShapesToStep;

beforeAll(async () => {
  ({ exportShapesToStep } = await import("@/lib/stepExport"));
  const { loadBrepWithOcct } = await import("@/lib/brepKernel");
  await loadBrepWithOcct();
});

/** The gear from the report on #1321: 96 involute teeth, herringbone, standing upside down. */
function reportedGear(extra: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return {
    id: "g", name: "Gear", kind: "gear", color: "#6f7f8d", hole: false, x: 0, z: 0, elevation: 0,
    size: 37.969890605161034, width: 37.969890605161034, depth: 37.969890605161034, height: 1.13,
    rotation: 0, rotationX: 0, rotationZ: 180, teeth: 96, toothSize: 2.5, centerHoleSize: 0,
    gearType: "herringbone", gearRim: 3, helixAngle: 22.5, helixQuality: 16,
    gearProfile: "involute", gearPressureAngle: 20, gearBacklash: 0.2,
    ...extra,
  } as WorkplaneShape;
}

describe("helical gears with many involute teeth in the STEP export (#1321)", () => {
  it.each<[string, Partial<WorkplaneShape>]>([
    ["the reported herringbone gear of 96 teeth", {}],
    ["a helical gear of 31 teeth with a bore", { gearType: "helical", teeth: 31, size: 40, width: 40, depth: 40, height: 6, centerHoleSize: 8, rotationZ: 0 }],
  ])("writes %s as one exact solid", async (_name, extra) => {
    const shape = reportedGear(extra);
    // The edge tool still keeps such a gear on its mesh.
    expect(cadModifierHelicalGearForShape(shape)).toBeNull();
    expect(cadModifierHelicalGearForShape(shape, { anySize: true })).not.toBeNull();
    const { blob, exportedCount, skipped } = await exportShapesToStep([shape]);
    expect(skipped).toEqual([]);
    expect(exportedCount).toBe(1);
    const text = await blob.text();
    expect((text.match(/MANIFOLD_SOLID_BREP/g) ?? []).length).toBe(1);
    // Every corner of the tooth ring is a twisted face of its own, twice over for a herringbone gear.
    expect((text.match(/ADVANCED_FACE/g) ?? []).length).toBeGreaterThan((shape.teeth ?? 0) * 12);
  }, 120_000);
});
