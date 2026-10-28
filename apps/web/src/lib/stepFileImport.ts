import type { WorkplaneShape } from "@/types/layerling";

/** What a STEP file brings: its parts, one body each, or (`assembly` false) the whole file as one body. */
export type StepFileImport = { shapes: WorkplaneShape[]; assembly: boolean };

/**
 * A STEP file read with the CAD kernel. Several solids in one file, as an assembly from another CAD program: one body
 * each, under its own name (#830). Whatever stops that - one solid only, too many, a kernel that cannot read the
 * structure - leaves it as one body. Runs in the geometry worker (lib/geometryWorker.ts) and, where that cannot, on the page.
 */
export async function importedShapesFromStepFile(fileName: string, buffer: ArrayBuffer): Promise<StepFileImport> {
  const assembly = await (await import("@/lib/stepAssemblyImport")).importedShapesFromStepAssembly(fileName, buffer).catch(() => null);
  if (assembly) return { shapes: assembly.shapes, assembly: true };
  const { importedShapeFromStep } = await import("@/lib/stepImport");
  return { shapes: [await importedShapeFromStep(fileName, buffer)], assembly: false };
}
