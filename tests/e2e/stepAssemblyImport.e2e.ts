import { beforeAll, describe, expect, it, vi } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { WorkplaneShape } from "@/types/layerling";

/**
 * A STEP file with several solids comes in as one body each, under its own name and in its place (#830), read through the
 * kernel's XCAF document; one solid, or a file it cannot take apart, stays one body. Against the real kernel.
 */
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
let importedShapesFromStepAssembly: typeof import("@/lib/stepAssemblyImport").importedShapesFromStepAssembly;
let importedShapeFromStep: typeof import("@/lib/stepImport").importedShapeFromStep;

beforeAll(async () => {
  ({ exportShapesToStep } = await import("@/lib/stepExport"));
  ({ importedShapesFromStepAssembly } = await import("@/lib/stepAssemblyImport"));
  ({ importedShapeFromStep } = await import("@/lib/stepImport"));
  await (await import("@/lib/brepKernel")).loadBrepWithOcct();
});

const shape = (overrides: Partial<WorkplaneShape>) => ({ id: Math.random().toString(36).slice(2), name: "Shape", kind: "box", color: "#0098c7", x: 0, z: 0, size: 10, width: 10, depth: 10, height: 10, rotation: 0, ...overrides }) as WorkplaneShape;

describe("a STEP file with several solids", () => {
  it("comes in as a body each, with the names of the file and their places to one another", async () => {
    const { blob } = await exportShapesToStep([
      shape({ kind: "box", name: "Left post", color: "#d12a2a", x: -30, width: 10, depth: 6, height: 4 }),
      shape({ kind: "cylinder", name: "Round rod", color: "#2a8f3c", x: 0, width: 8, depth: 8, height: 12 }),
      shape({ kind: "box", name: "Right post", x: 30, z: 12, elevation: 5, width: 10, depth: 6, height: 4 }),
    ]);
    const result = await importedShapesFromStepAssembly("stand.step", await blob.arrayBuffer());
    expect(result).not.toBeNull();
    const parts = result!.shapes;
    expect(parts.map((part) => part.name).sort()).toEqual(["Left post", "Right post", "Round rod"]);
    const byName = Object.fromEntries(parts.map((part) => [part.name, part]));
    expect(byName["Left post"].width).toBeCloseTo(10, 3);
    expect(byName["Left post"].height).toBeCloseTo(4, 3);
    // Each in its own colour, through the file and back unchanged.
    expect(byName["Left post"].color).toBe("#d12a2a");
    expect(byName["Round rod"].color).toBe("#2a8f3c");
    // Their places: 30 mm either side of the middle one, the right post 12 mm back and 5 mm up.
    expect(byName["Round rod"].x - byName["Left post"].x).toBeCloseTo(30, 2);
    expect(byName["Right post"].x - byName["Round rod"].x).toBeCloseTo(30, 2);
    expect(byName["Right post"].z - byName["Round rod"].z).toBeCloseTo(12, 2);
    expect(byName["Right post"].elevation! - byName["Left post"].elevation!).toBeCloseTo(5, 2);
    // Each part carries its mesh and its exact body, so a STEP export hands it back exactly.
    for (const part of parts) {
      expect(part.importedMesh?.sourceFormat).toBe("json");
      expect(part.importedMesh?.brepStep).toContain("MANIFOLD_SOLID_BREP");
    }
  }, 60000);

  it("makes a part of each body when one entry of the file holds several", async () => {
    const { occtKernel } = await import("@/lib/brepKernel");
    const kernel = occtKernel()!;
    const screws = kernel.makeCompound([0, 20, 40].map((x) => kernel.translate(kernel.makeBox(4, 4, 10), x, 0, 0)));
    const result = await importedShapesFromStepAssembly("screws.step", new TextEncoder().encode(kernel.exportStep(screws)).buffer);
    expect(result).not.toBeNull();
    expect(result!.shapes).toHaveLength(3);
    const xs = result!.shapes.map((part) => part.x).sort((a, b) => a - b);
    expect(xs[1] - xs[0]).toBeCloseTo(20, 2);
    expect(xs[2] - xs[1]).toBeCloseTo(20, 2);
  }, 60000);

  it("stays one body when it holds one solid", async () => {
    const { blob } = await exportShapesToStep([shape({ kind: "box", name: "Only", width: 10, depth: 6, height: 4 })]);
    expect(await importedShapesFromStepAssembly("one.step", await blob.arrayBuffer())).toBeNull();
    expect((await importedShapeFromStep("one.step", await blob.arrayBuffer())).name).toBe("one");
  }, 60000);
});

describe("a STEP file read the geometry worker's way", () => {
  it("brings the same parts across, packed and unpacked, as reading it on the page", async () => {
    const { importedShapesFromStepFile } = await import("@/lib/stepFileImport");
    const { packValue, unpackValue } = await import("@/lib/geometryTransfer");
    const { resultMeshes } = await import("@/lib/geometryWorkerTypes");
    const { blob } = await exportShapesToStep([
      shape({ kind: "box", name: "Left post", x: -30, width: 10, depth: 6, height: 4 }),
      shape({ kind: "cylinder", name: "Round rod", x: 0, width: 8, depth: 8, height: 12 }),
    ]);
    const buffer = await blob.arrayBuffer();
    const sentArgs = packValue({ fileName: "stand.step", buffer });
    const args = unpackValue(sentArgs.value, sentArgs.buffers) as { fileName: string; buffer: ArrayBuffer };
    const inWorker = await importedShapesFromStepFile(args.fileName, args.buffer);
    expect(resultMeshes("step", inWorker)).toHaveLength(2);
    const answer = packValue(inWorker);
    const arrived = unpackValue(answer.value, answer.buffers) as Awaited<ReturnType<typeof importedShapesFromStepFile>>;
    const onPage = await importedShapesFromStepFile("stand.step", buffer);
    expect(arrived.assembly).toBe(true);
    // Ids are new each time, and the kernel numbers each STEP it writes ("translator 8.0 5") and stamps the time.
    const stepText = (text?: string) => text?.replace(/translator [\d.]+ \d+/g, "translator").replace(/'\d{4}-\d\d-\d\dT[\d:]+'/g, "'time'");
    const strip = (result: typeof onPage) => result.shapes.map(({ id: _id, ...rest }) => ({ ...rest, importedMesh: { ...rest.importedMesh!, brepStep: stepText(rest.importedMesh!.brepStep) } }));
    expect(strip(arrived)).toEqual(strip(onPage));

    // And back out: the parts written the worker's way (packed in, the text out) give the same file.
    const sentShapes = packValue({ shapes: onPage.shapes });
    const { shapes: workerShapes } = unpackValue(sentShapes.value, sentShapes.buffers) as { shapes: typeof arrived.shapes };
    const written = await exportShapesToStep(workerShapes);
    const direct = await exportShapesToStep(onPage.shapes);
    expect(written.exportedCount).toBe(2);
    // The kernel lists the colour entries of one file in a different order from one call to the next, so the two files
    // are compared by what they bring back in: the same parts, names, colours and sizes.
    const back = async (result: typeof written) => (await importedShapesFromStepFile("back.step", await result.blob.arrayBuffer())).shapes
      .map((part) => ({ name: part.name, color: part.color, size: [part.width, part.height, part.depth].map((value) => Math.round(value * 1e4) / 1e4) }))
      .sort((a, b) => a.name.localeCompare(b.name));
    expect(await back(written)).toEqual(await back(direct));
    await expect(exportShapesToStep([shape({ kind: "box", name: "Gap", hole: true, width: 4, depth: 4, height: 4 })])).rejects.toMatchObject({ name: "StepExportEmptyError" });

    const one = await exportShapesToStep([shape({ kind: "box", name: "Only", width: 10, depth: 6, height: 4 })]);
    const single = await importedShapesFromStepFile("one.step", await one.blob.arrayBuffer());
    expect(single.assembly).toBe(false);
    expect(single.shapes.map((part) => part.name)).toEqual(["one"]);
  }, 60000);
});
