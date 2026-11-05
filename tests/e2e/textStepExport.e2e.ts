import { beforeAll, describe, expect, it, vi } from "vitest";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";
import manifoldModule from "manifold-3d";
import type { WorkplaneShape } from "@/types/layerling";
import { rememberManifoldRuntime } from "@/lib/manifoldHandle";
import { loadTextFonts } from "@/lib/textFonts";

/*
 * Text in the STEP export (#1337): a text of several letters went out of the file ("not in the STEP: Text (no exact
 * form)"), as only a text of one letter had an exact profile. Its letters are built from the font's own curves now,
 * as the edge tool gets them, and fused into one body - raised or cut in as a hole.
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
    dropOcctKernel: () => undefined,
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
  const runtime = await manifoldModule();
  runtime.setup();
  rememberManifoldRuntime(runtime);
  await loadTextFonts();
});

/** The text from the report on #1337. */
function reportedText(extra: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return {
    id: "t", name: "Text", kind: "text", color: "#111111", hole: false, x: -22, z: 6, elevation: 0,
    size: 28.887096774193548, width: 28.887096774193548, depth: 8.225806451612904, height: 11,
    rotation: 0, rotationX: 0, rotationZ: 0, text: "DBGC", font: "Sans",
    ...extra,
  } as WorkplaneShape;
}

function plate(extra: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return { id: "b", name: "Base", kind: "box", color: "#cf101b", hole: false, x: -22, z: 6, elevation: 0, size: 40, width: 40, depth: 16, height: 3, rotation: 0, ...extra } as WorkplaneShape;
}

const count = (text: string, entity: string) => (text.match(new RegExp(`=\\s*${entity}\\s*\\(`, "g")) ?? []).length;

describe("text in the STEP export (#1337, real OCCT kernel)", () => {
  it("writes the reported text of four letters as an exact body with the font's curves", async () => {
    const { blob, exportedCount, skipped } = await exportShapesToStep([reportedText()]);
    expect(skipped).toEqual([]);
    expect(exportedCount).toBe(1);
    const step = await blob.text();
    // D, B, G and C: their round walls are curves of the font, not hundreds of flat facets.
    expect(count(step, "B_SPLINE_SURFACE_WITH_KNOTS") + count(step, "SURFACE_OF_LINEAR_EXTRUSION")).toBeGreaterThan(0);
    expect(count(step, "ADVANCED_FACE")).toBeLessThan(200);
  }, 120_000);

  it("keeps the text next to the base, and in a group with it", async () => {
    const loose = await exportShapesToStep([plate(), reportedText({ elevation: 3 })]);
    expect(loose.skipped).toEqual([]);
    expect(loose.exportedCount).toBe(2);
    // A group holds its parts around its own centre, as the editor stores them.
    const group = {
      ...plate(), id: "g", name: "Faston DBGC", kind: "mesh", height: 14, groupOperation: "group",
      groupedShapes: [plate({ x: 0, z: 0 }), reportedText({ x: 0, z: 0, elevation: 3 })],
    } as unknown as WorkplaneShape;
    const grouped = await exportShapesToStep([group]);
    expect(grouped.skipped).toEqual([]);
    expect(grouped.exportedCount).toBe(2);
  }, 120_000);

  it("cuts a text set as a hole into the plate", async () => {
    const plain = await exportShapesToStep([plate()]);
    const engraved = await exportShapesToStep([plate(), reportedText({ hole: true, height: 2, elevation: 2 })]);
    expect(engraved.skipped).toEqual([]);
    expect(engraved.exportedCount).toBe(1);
    expect(count(await engraved.blob.text(), "ADVANCED_FACE")).toBeGreaterThan(count(await plain.blob.text(), "ADVANCED_FACE") + 10);
  }, 120_000);

  it("still leaves out a bevelled text, which has no exact outline", async () => {
    const { skipped } = await exportShapesToStep([plate(), reportedText({ bevel: 1 })]);
    expect(skipped.map((entry) => entry.name)).toEqual(["Text"]);
  }, 120_000);
});
