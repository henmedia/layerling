/// <reference lib="webworker" />

import { splitBoltForShape, type BoltSplitOptions } from "@/lib/boltSplit";
import { buildMessage } from "@/lib/buildStamp";
import { checkClearance, type ClearanceOptions } from "@/lib/clearanceCheck";
import { articulateShapes, type FlexiOptions } from "@/lib/flexiJoints";
import { lidForShapes, lidTopForShapes, type LidOptions } from "@/lib/lidTool";
import { analyseMoldForShapes, moldForShapes, type MoldOptions } from "@/lib/moldTool";
import { checkPrint, type PrintCheckOptions } from "@/lib/printCheck";
import { checkLayers, type LayerCheckOptions } from "@/lib/layerCheck";
import { buildGroupedShapeFromSelection, exportSolidVolume, faceReadPositions, previewSplitConnectors, splitShapeIfCrossed } from "@/lib/editorBooleans";
import { getManifoldRuntime, setManifoldAssetBase } from "@/lib/editorMeshCore";
import { packValue, packedTransfer, unpackValue } from "@/lib/geometryTransfer";
import { resultMeshes, type GeometryWorkerRequest, type GeometryWorkerResponse } from "@/lib/geometryWorkerTypes";
import { prepareImportedMeshDisplay } from "@/lib/importedMeshDisplay";
import { simplifyTrianglePositions, type SimplifyOptions } from "@/lib/meshSimplify";
import { importedShapesFromObj } from "@/lib/objImport";
import { importedShapeFromStl, type MeshPlacement, type StlReadOptions } from "@/lib/stlImport";
import { importedShapesFromStepFile } from "@/lib/stepFileImport";
import { setLanguage } from "@/lib/i18n";
import type { ModelSplitPlane } from "@/lib/modelSplit";
import type { SplitConnectorOptions } from "@/lib/splitConnectors";
import type { WorkplaneShape } from "@/types/layerling";

/**
 * Groups, cuts, splits, makes flexi links and lids and reads STL and OBJ files off the page, so the editor keeps moving while Manifold works
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
      const { shape, plane, connectors, stretch } = args as { shape: WorkplaneShape; plane: Pick<ModelSplitPlane, "axis" | "normal" | "position">; connectors?: SplitConnectorOptions; stretch?: number };
      result = await splitShapeIfCrossed(shape, plane, connectors, stretch);
    } else if (request.task === "splitConnectors") {
      const { targets, plane, connectors } = args as { targets: WorkplaneShape[]; plane: Pick<ModelSplitPlane, "axis" | "normal" | "position">; connectors: SplitConnectorOptions };
      result = await previewSplitConnectors(targets, plane, connectors);
    } else if (request.task === "flexi") {
      const { targets, options } = args as { targets: WorkplaneShape[]; options: FlexiOptions };
      result = await articulateShapes(targets, options);
    } else if (request.task === "clearance") {
      const { source, options } = args as { source: WorkplaneShape[]; options: Partial<ClearanceOptions> };
      result = await checkClearance(source, options);
    } else if (request.task === "printCheck") {
      const { source, options } = args as { source: WorkplaneShape[]; options: Partial<PrintCheckOptions> };
      result = await checkPrint(source, options);
    } else if (request.task === "layerCheck") {
      // Says how far it got, at most every 100 ms, so the panel's bar moves.
      const { source, options } = args as { source: WorkplaneShape[]; options: Partial<LayerCheckOptions> };
      let told = 0;
      result = await checkLayers(source, options, {
        progress: (fraction) => {
          const now = Date.now();
          if (now - told < 100 && fraction < 1) return;
          told = now;
          post({ requestId: request.requestId, progress: fraction });
        },
      });
    } else if (request.task === "lid") {
      const { targets, options } = args as { targets: WorkplaneShape[]; options: LidOptions };
      result = await lidForShapes(targets, options);
    } else if (request.task === "mold") {
      const { targets, options } = args as { targets: WorkplaneShape[]; options: MoldOptions };
      result = await moldForShapes(targets, options);
    } else if (request.task === "moldCheck") {
      const { targets, options } = args as { targets: WorkplaneShape[]; options: MoldOptions };
      result = await analyseMoldForShapes(targets, options);
    } else if (request.task === "boltSplit") {
      const { shape, options } = args as { shape: WorkplaneShape; options: Partial<BoltSplitOptions> };
      result = await splitBoltForShape(shape, options);
    } else if (request.task === "lidTop") {
      const { targets } = args as { targets: WorkplaneShape[] };
      result = await lidTopForShapes(targets);
    } else if (request.task === "stl") {
      const { fileName, buffer, options } = args as { fileName: string; buffer: ArrayBuffer; options?: StlReadOptions };
      result = importedShapeFromStl(fileName, buffer, options);
    } else if (request.task === "obj") {
      const { fileName, text, mtlSources, placement } = args as { fileName: string; text: string; mtlSources: string[]; placement?: MeshPlacement };
      result = importedShapesFromObj(fileName, text, mtlSources, placement);
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
      const { positions, target, options } = args as { positions: number[]; target: number; options?: SimplifyOptions };
      result = await simplifyTrianglePositions(positions, target, options);
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
