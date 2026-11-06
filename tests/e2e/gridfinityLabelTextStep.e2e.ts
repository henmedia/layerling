import { beforeAll, describe, expect, it, vi } from "vitest";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";
import manifoldModule from "manifold-3d";
import type { OcctKernel } from "occt-wasm";
import { GRIDFINITY_LABEL_TEXT_HEIGHT } from "@/lib/gridfinityGeometry";
import { gridfinityLabelLetters } from "@/lib/gridfinityLabelText";
import { rememberManifoldRuntime } from "@/lib/manifoldHandle";
import { loadTextFonts } from "@/lib/textFonts";
import type { WorkplaneShape } from "@/types/layerling";
import { lettersAreaAndMiddle } from "./helpers/gridfinityLetters";

/*
 * A Gridfinity bin with letters on its shelves (Discussion #1308) in the STEP export: one exact solid, the letters in it
 * with their curves, as much of them as their outlines enclose times 0.4 mm.
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
let kernel: OcctKernel;

beforeAll(async () => {
  ({ exportShapesToStep } = await import("@/lib/stepExport"));
  const { loadBrepWithOcct, occtKernel } = await import("@/lib/brepKernel");
  await loadBrepWithOcct();
  kernel = occtKernel() as OcctKernel;
  await loadTextFonts();
  const runtime = await manifoldModule();
  runtime.setup();
  rememberManifoldRuntime(runtime);
});

function binShape(fields: Record<string, unknown> = {}) {
  return { id: "g", name: "bin", kind: "gridfinity", color: "#4f7fa8", x: 0, z: 0, elevation: 0, rotation: 0, size: 83.5, width: 83.5, depth: 41.5, height: 25.4, gridfinityType: "bin", gridfinityLip: true, ...fields } as WorkplaneShape;
}

/** The area the letters' outlines enclose, from the display mesh's rings. */
const lettersArea = (shape: WorkplaneShape) => lettersAreaAndMiddle(gridfinityLabelLetters(shape)).area;

async function exported(shape: WorkplaneShape) {
  const { blob, exportedCount, skipped } = await exportShapesToStep([shape]);
  expect(skipped).toEqual([]);
  expect(exportedCount).toBe(1);
  const text = await blob.text();
  expect((text.match(/MANIFOLD_SOLID_BREP/g) ?? []).length).toBe(1);
  return Math.abs(kernel.getVolume(kernel.importStep(text)));
}

describe("a Gridfinity bin with letters on its shelves in the STEP export (Discussion #1308)", () => {
  it.each<[string, Record<string, unknown>]>([
    ["on the back shelf", { gridfinityLabelBack: true, gridfinityLabelBackText: "Screws 08" }],
    ["mirrored across z, its letters read from the front", { gridfinityLabelBack: true, gridfinityLabelBackText: "OBA", mirrorZ: true }],
    ["in two compartments", { gridfinityCompartmentsX: 2, gridfinityCompartmentLabels: [{ column: 0, row: 0, side: "back", text: "M3" }, { column: 1, row: 0, side: "back", text: "M4" }] }],
  ])("writes one exact solid with its letters %s", async (_name, fields) => {
    const lettered = binShape(fields);
    const plain = binShape({ ...fields, gridfinityLabelBackText: undefined, gridfinityCompartmentLabels: (fields.gridfinityCompartmentLabels as Array<Record<string, unknown>> | undefined)?.map(({ text: _text, ...label }) => label) });
    const gained = (await exported(lettered)) - (await exported(plain));
    // The curves enclose a little more than the display mesh's straight pieces.
    expect(gained / (lettersArea(lettered) * GRIDFINITY_LABEL_TEXT_HEIGHT)).toBeGreaterThan(0.995);
    expect(gained / (lettersArea(lettered) * GRIDFINITY_LABEL_TEXT_HEIGHT)).toBeLessThan(1.03);
  });
});
