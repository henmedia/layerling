import type { Language } from "@/lib/i18n";
import type { PreparedImportedMeshDisplay } from "@/lib/importedMeshDisplay";
import type { WorkplaneShape } from "@/types/layerling";

/** What the page asks the geometry worker (workers/geometry.worker.ts) to work out. */
export type GeometryTask = "group" | "split" | "stl" | "obj" | "step" | "stepExport" | "estimate" | "simplify" | "face" | "flexi" | "lid" | "warm";

export interface GeometryWorkerRequest {
  requestId: number;
  task: GeometryTask;
  /** Messages in the result (failure notices, split errors) come in the page's language. */
  language: Language;
  /** Where manifold.js lies; a worker cannot tell from its own address. */
  assetBase: string;
  /** The task's arguments, packed by lib/geometryTransfer.ts. */
  payload: unknown;
  buffers: Float64Array[];
}

export type GeometryWorkerResponse =
  | {
    requestId: number;
    ok: true;
    payload: unknown;
    buffers: Float64Array[];
    /** The view's geometry for each of resultMeshes(task, result), in that order (lib/importedMeshDisplay.ts). */
    displays: Array<PreparedImportedMeshDisplay | null>;
  }
  | { requestId: number; ok: false; message: string; name: string };

type ImportedMesh = NonNullable<WorkplaneShape["importedMesh"]>;

/** The meshes a task's result brings into the view: the new group, the two halves of a split, the links of a flexi body, a lid, an import. */
export function resultMeshes(task: GeometryTask, result: unknown): Array<ImportedMesh | undefined> {
  if (!result || typeof result !== "object") return [];
  if (task === "group") return [(result as { group?: WorkplaneShape | null }).group?.importedMesh];
  if (task === "split") return ((result as { parts?: WorkplaneShape[] | null }).parts ?? []).map((part) => part.importedMesh);
  if (task === "flexi") return ((result as { links?: WorkplaneShape[] | null }).links ?? []).map((link) => link.importedMesh);
  if (task === "lid") return [(result as { lid?: WorkplaneShape | null }).lid?.importedMesh];
  if (task === "stl") return [(result as WorkplaneShape).importedMesh];
  if (task === "obj" || task === "step") return ((result as { shapes?: WorkplaneShape[] }).shapes ?? []).map((shape) => shape.importedMesh);
  // A simplified mesh becomes a body with exactly these positions and no normals of its own.
  if (task === "simplify") return [{ positions: (result as { positions: number[] }).positions } as ImportedMesh];
  return [];
}
