/// <reference lib="webworker" />

import { buildMessage } from "@/lib/buildStamp";
import { buildVaseBody, type VaseBodyWorkerRequest, type VaseBodyWorkerResponse } from "@/lib/vaseBody";

self.postMessage(buildMessage());

self.onmessage = (event: MessageEvent<VaseBodyWorkerRequest>) => {
  const { requestId, settings } = event.data;
  try {
    const body = buildVaseBody(settings);
    const response: VaseBodyWorkerResponse = { requestId, body };
    self.postMessage(response, { transfer: [body.vertices.buffer, body.indices.buffer] });
  } catch (error) {
    const response: VaseBodyWorkerResponse = { requestId, error: error instanceof Error ? error.message : String(error) };
    self.postMessage(response);
  }
};
