/// <reference lib="webworker" />

import { OcctKernel, type OcctModuleFactory, type ShapeHandle } from "occt-wasm";
import { CAD_MODIFIER_RUNTIME_BASE } from "@/lib/cadModifierRuntime";
import { sketchCadDeflection } from "@/lib/sketchCadDeflection";
import { cadSketchRegions } from "@/lib/sketchCadProfile";
import { buildRevolvedSketchSolid } from "@/lib/cadSketchRevolve";
import { buildStrokedSketchSolid, chamferTopEdges } from "@/lib/cadSketchStroke";
import { buildSweptSketchSolid } from "@/lib/cadSketchSweep";
import { buildSketchLoftSolid } from "@/lib/cadSketchLoft";
import { buildInsetSketchSolid } from "@/lib/cadSketchInset";
import { pathWire } from "@/lib/sketchCadWire";
import { buildMessage } from "@/lib/buildStamp";
import { SKETCH_EDGE_FAILED, SKETCH_INSET_UNSUPPORTED, SKETCH_STROKE_UNSUPPORTED, type SketchCadBuildRequest, type SketchCadBuildResponse } from "@/lib/sketchCadTypes";

/** Past this many edges in a sketch's outlines the kernel's validity check is skipped (it takes seconds to minutes there). */
const LARGE_SKETCH_EDGES = 1500;

let kernelPromise: Promise<OcctKernel> | null = null;

function kernel() {
  const moduleUrl = `${CAD_MODIFIER_RUNTIME_BASE}/occt-wasm.js`;
  // Drop a rejected attempt so a transient failure (e.g. a network blip
  // fetching the 22 MB wasm) can be retried on the next call instead of
  // poisoning sketch-to-3D for the rest of the session - same fix as
  // brepKernel.ts's loadBrepWithOcct.
  kernelPromise ??= import(/* webpackIgnore: true */ moduleUrl)
    .then((imported: { default: OcctModuleFactory }) => OcctKernel.init({
      createModule: imported.default,
      wasm: `${CAD_MODIFIER_RUNTIME_BASE}/occt-wasm.wasm`,
    }))
    .catch((error) => {
      kernelPromise = null;
      throw error;
    });
  return kernelPromise;
}

function post(message: SketchCadBuildResponse, transfer: Transferable[] = []) {
  self.postMessage(message, { transfer });
}

// The first thing the page hears: which build this worker is from (lib/buildStamp.ts).
self.postMessage(buildMessage());

self.onmessage = async (event: MessageEvent<SketchCadBuildRequest>) => {
  const request = event.data;
  let cad: OcctKernel | null = null;
  try {
    cad = await kernel();
    cad.releaseAll();
    let result: ShapeHandle;
    if (request.loft) {
      result = buildSketchLoftSolid(cad, request.loft.bottom, request.loft.top);
    } else if (request.revolve) {
      result = buildRevolvedSketchSolid(cad, request.profile, request.revolve.startAngle, request.revolve.sweepAngle);
    } else if (request.sweep) {
      result = buildSweptSketchSolid(cad, request.profile);
    } else if (request.stroke) {
      const stroked = buildStrokedSketchSolid(cad, request.profile, request.stroke, request.height);
      if (!stroked) throw new Error(SKETCH_STROKE_UNSUPPORTED);
      result = stroked;
    } else if (request.inset) {
      const inset = buildInsetSketchSolid(cad, request.profile, request.inset, request.height);
      if (!inset) throw new Error(SKETCH_INSET_UNSUPPORTED);
      result = inset;
    } else {
      const regions = cadSketchRegions(request.profile);
      if (regions.length === 0) throw new Error("No closed profile found. Draw at least one closed loop and ensure it has no degenerate (zero-area) geometry.");
      const solids: ShapeHandle[] = regions.map((region) => {
        let face = cad!.makeFace(pathWire(cad!, region.outer));
        if (region.holes.length > 0) face = cad!.addHolesInFace(face, region.holes.map((hole) => pathWire(cad!, hole)));
        return cad!.extrude(face, 0, request.height, 0);
      });
      result = solids.length === 1 ? solids[0] : cad.makeCompound(solids);
      // The validity check grows steeply with the edges: a stroked traced drawing (7 000 straight pieces,
      // a hole in it) took 51 s of a 56 s build (#461). A body that large is checked by its volume instead.
      const edgeCount = regions.reduce((sum, region) => sum + region.outer.steps.length + region.holes.reduce((inner, hole) => inner + hole.steps.length, 0), 0);
      const sound = edgeCount > LARGE_SKETCH_EDGES ? cad.getVolume(result) > 1e-9 : cad.isValid(result);
      if (!sound) throw new Error("OpenCascade produced invalid sketch topology");
    }
    if (request.topChamfer && !request.revolve && !request.sweep && !request.loft) {
      const chamfered = chamferTopEdges(cad, result, request.height, request.topChamfer);
      if (!chamfered) throw new Error(SKETCH_EDGE_FAILED);
      result = chamfered;
    }
    const deflection = sketchCadDeflection(request.profile);
    const mesh = cad.tessellate(result, { linearDeflection: deflection.linear, angularDeflection: deflection.angular });
    const positions = new Float32Array(mesh.positions);
    const normals = new Float32Array(mesh.normals);
    const indices = new Uint32Array(mesh.indices);
    const brep = cad.toBREP(result);
    post({ type: "built", requestId: request.requestId, positions, normals, indices, triangleCount: mesh.triangleCount, brep, deflection }, [positions.buffer, normals.buffer, indices.buffer]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error ?? "The CAD kernel could not build this sketch");
    post({ type: "error", requestId: request.requestId, message });
    if (/memory|WebAssembly|abort/i.test(message)) kernelPromise = null;
  } finally {
    try {
      cad?.releaseAll();
    } catch {
      // The arena may already have reset after a kernel error.
    }
  }
};

export {};
