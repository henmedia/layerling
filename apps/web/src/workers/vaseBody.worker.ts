/// <reference lib="webworker" />

import { buildMessage } from "@/lib/buildStamp";
import { vaseChecks } from "@/lib/vase/vase-geometry.mjs";
import { buildVaseBody, type VaseBodyWorkerRequest, type VaseBodyWorkerResponse } from "@/lib/vaseBody";

self.postMessage(buildMessage());

self.onmessage = (event: MessageEvent<VaseBodyWorkerRequest>) => {
  const { requestId, settings } = event.data;
  try {
    // The checks right after the body: a relief's checks read the same leaf raster the body was just built from.
    const body = { ...buildVaseBody(settings), checks: vaseChecks(settings) };
    const response: VaseBodyWorkerResponse = { requestId, body };
    self.postMessage(response, { transfer: [body.vertices.buffer, body.indices.buffer] });
  } catch (error) {
    const response: VaseBodyWorkerResponse = { requestId, error: error instanceof Error ? error.message : String(error) };
    self.postMessage(response);
  }
};
