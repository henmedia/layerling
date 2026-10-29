/// <reference lib="webworker" />

import { buildMessage } from "@/lib/buildStamp";
import { articulateShapes, type FlexiOptions } from "@/lib/flexiJoints";
import { buildGroupedShapeFromSelection, exportSolidVolume, faceReadPositions, splitShapeIfCrossed } from "@/lib/editorBooleans";
import { getManifoldRuntime, setManifoldAssetBase } from "@/lib/editorMeshCore";
import { packValue, packedTransfer, unpackValue } from "@/lib/geometryTransfer";
import { resultMeshes, type GeometryWorkerRequest, type GeometryWorkerResponse } from "@/lib/geometryWorkerTypes";
import { prepareImportedMeshDisplay } from "@/lib/importedMeshDisplay";
import { simplifyTrianglePositions } from "@/lib/meshSimplify";
import { importedShapesFromObj } from "@/lib/objImport";
import { importedShapeFromStl } from "@/lib/stlImport";
import { importedShapesFromStepFile } from "@/lib/stepFileImport";
import { setLanguage } from "@/lib/i18n";
import type { ModelSplitPlane } from "@/lib/modelSplit";
import type { WorkplaneShape } from "@/types/layerling";

/**
 * Groups, cuts, splits, makes flexi links and reads STL and OBJ files off the page, so the editor keeps moving while Manifold works
 * (lib/geometryWorker.ts). The same functions as on the page, with the same arguments.
 */

function post(message: GeometryWorkerResponse, transfer: Transferable[] = []) {
  self.postMessage(message, { transfer });
}

// The first thing the page hears: which build this worker is from (lib/buildStamp.ts).
self.postMessage(buildMessage());

self.onmessage = async (event: MessageEvent<GeometryWorkerRequest>) => {
  const request = event.data;
  try {
    setManifoldAssetBase(request.assetBase);
    await setLanguage(request.language, false);
    const received = new Map<unknown[], number>();
    const args = unpackValue(request.payload, request.buffers, [], received);
    let result: unknown;
    if (request.task === "group") {
      const { selected, triangleLimit } = args as { selected: WorkplaneShape[]; triangleLimit: number };
      result = await buildGroupedShapeFromSelection(selected, triangleLimit);
    } else if (request.task === "split") {
      const { shape, plane } = args as { shape: WorkplaneShape; plane: Pick<ModelSplitPlane, "axis" | "normal" | "position"> };
      result = await splitShapeIfCrossed(shape, plane);
    } else if (request.task === "flexi") {
      const { targets, options } = args as { targets: WorkplaneShape[]; options: FlexiOptions };
      result = await articulateShapes(targets, options);
    } else if (request.task === "stl") {
      const { fileName, buffer } = args as { fileName: string; buffer: ArrayBuffer };
      result = importedShapeFromStl(fileName, buffer);
    } else if (request.task === "obj") {
      const { fileName, text, mtlSources } = args as { fileName: string; text: string; mtlSources: string[] };
      result = importedShapesFromObj(fileName, text, mtlSources);
    } else if (request.task === "step") {
      // The CAD kernel loads here the first time a STEP file comes; reading a file of 390 parts held the page for 4 s.
      const { fileName, buffer } = args as { fileName: string; buffer: ArrayBuffer };
      result = await importedShapesFromStepFile(fileName, buffer);
    } else if (request.task === "stepExport") {
      // The text, not the Blob: the page hands it on as text anyway.
      const { shapes } = args as { shapes: WorkplaneShape[] };
      const { exportShapesToStep } = await import("@/lib/stepExport");
      const { blob, exportedCount, skipped } = await exportShapesToStep(shapes);
      result = { text: await blob.text(), exportedCount, skipped };
    } else if (request.task === "estimate") {
      const { source } = args as { source: WorkplaneShape[] };
      result = await exportSolidVolume(source);
    } else if (request.task === "simplify") {
      const { positions, target } = args as { positions: number[]; target: number };
      result = await simplifyTrianglePositions(positions, target);
    } else if (request.task === "face") {
      const { shape } = args as { shape: WorkplaneShape };
      result = await faceReadPositions(shape);
    } else if (request.task === "warm") {
      await getManifoldRuntime();
      result = null;
    } else {
      throw new Error(`Unknown geometry task ${String(request.task)}`);
    }
    // Lists the result took over unchanged go back as references to the page's own arrays.
    const packed = packValue(result, received);
    // The view's geometry of what was made, so the page does not work it out after the answer.
    const transfer: Transferable[] = packedTransfer(packed);
    const displays = resultMeshes(request.task, result).map((mesh) => {
      if (!mesh || mesh.positions.length < 9) return null;
      const prepared = prepareImportedMeshDisplay(mesh);
      transfer.push(...prepared.transfer);
      return prepared.display;
    });
    post({ requestId: request.requestId, ok: true, payload: packed.value, buffers: packed.buffers, displays }, transfer);
  } catch (error) {
    post({
      requestId: request.requestId,
      ok: false,
      message: error instanceof Error ? error.message : String(error ?? ""),
      name: error instanceof Error ? error.name : "Error",
    });
  }
};
