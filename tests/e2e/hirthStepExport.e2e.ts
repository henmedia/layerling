import { beforeAll, describe, expect, it, vi } from "vitest";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * The Hirth joint in the STEP export (Discussion #1320): saw teeth and teeth as tall as the joint, whose roots touch
 * the bottom at the rim, go into the file as one exact solid, the way the export builds it.
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

function hirth(extra: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return {
    id: "h", name: "Hirth", kind: "hirth", color: "#888888", x: 0, z: 0, elevation: 0, rotation: 0,
    width: 40, depth: 40, size: 40, height: 3, teeth: 24, toothSize: 3, centerHoleSize: 10,
    ...extra,
  } as WorkplaneShape;
}

describe("the Hirth joint in the STEP export (Discussion #1320)", () => {
  it.each<[string, Partial<WorkplaneShape>]>([
    ["symmetric teeth down to the bottom", {}],
    ["saw teeth down to the bottom", { hirthSteepFlank: 90 }],
    ["saw teeth the other way with a 70 degree flank", { hirthSteepFlank: 70, hirthReverse: true }],
    ["saw teeth without a bore", { hirthSteepFlank: 90, centerHoleSize: 0, height: 10, toothSize: 2.6 }],
  ])("writes %s as one exact solid", async (_name, extra) => {
    const { blob, exportedCount, skipped } = await exportShapesToStep([hirth(extra)]);
    expect(skipped).toEqual([]);
    expect(exportedCount).toBe(1);
    const text = await blob.text();
    expect((text.match(/MANIFOLD_SOLID_BREP/g) ?? []).length).toBe(1);
    expect((text.match(/ADVANCED_FACE/g) ?? []).length).toBeGreaterThan(24);
  });
});
