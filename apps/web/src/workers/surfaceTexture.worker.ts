/// <reference lib="webworker" />

import { buildMessage } from "@/lib/buildStamp";
import { applySurfaceTexture, surfaceTexturePositions } from "@/lib/surfaceTexture";
import type { SurfaceTextureWorkerRequest, SurfaceTextureWorkerResponse } from "@/lib/surfaceTextureShape";

self.postMessage(buildMessage());

self.onmessage = (event: MessageEvent<SurfaceTextureWorkerRequest>) => {
  const { requestId, positions, settings, maxTriangles } = event.data;
  try {
    const result = applySurfaceTexture(positions, settings, maxTriangles ? { maxTriangles } : {});
    const fill = result.fill ? Float64Array.from(surfaceTexturePositions(result.fill)) : null;
    const part = result.part ? Float64Array.from(surfaceTexturePositions(result.part)) : null;
    const response: SurfaceTextureWorkerResponse = { requestId, positions: Float64Array.from(surfaceTexturePositions(result)), stats: result.stats, fill, part };
    self.postMessage(response, { transfer: [response.positions, fill, part].flatMap((list) => (list ? [list.buffer] : [])) });
  } catch (error) {
    const response: SurfaceTextureWorkerResponse = { requestId, error: error instanceof Error ? error.message : String(error) };
    self.postMessage(response);
  }
};
