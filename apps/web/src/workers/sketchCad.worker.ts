/// <reference lib="webworker" />

import { OcctKernel, type ShapeHandle } from "occt-wasm";
import { SKETCH_CAD_DEFLECTION } from "@/lib/cadModifierRuntime";
import { cadSketchRegions, type OrderedCadSketchPath } from "@/lib/sketchCadProfile";
import type { SketchCadBuildRequest, SketchCadBuildResponse } from "@/lib/sketchCadTypes";

let kernelPromise: Promise<OcctKernel> | null = null;

function kernel() {
  const moduleUrl = "/occt/occt-wasm.js";
  // Drop a rejected attempt so a transient failure (e.g. a network blip
  // fetching the 22 MB wasm) can be retried on the next call instead of
  // poisoning sketch-to-3D for the rest of the session - same fix as
  // brepKernel.ts's loadBrepWithOcct.
  kernelPromise ??= import(/* webpackIgnore: true */ moduleUrl)
    .then((imported: { default: (options?: { locateFile?: (path: string) => string }) => Promise<unknown> }) => imported.default({
      locateFile: (path) => path.endsWith(".wasm") ? "/occt/occt-wasm.wasm" : path,
    }))
    .then((module) => {
      const KernelConstructor = OcctKernel as unknown as new (rawModule: unknown) => OcctKernel;
      return new KernelConstructor(module);
    })
    .catch((error) => {
      kernelPromise = null;
      throw error;
    });
  return kernelPromise;
}

function post(message: SketchCadBuildResponse, transfer: Transferable[] = []) {
  self.postMessage(message, { transfer });
}

function pathWire(cad: OcctKernel, path: OrderedCadSketchPath) {
  const edges = path.steps.map(({ segment, from, to }) => {
    const forward = segment.startId === from.id;
    const first = forward ? from.handleOut : from.handleIn;
    const second = forward ? to.handleIn : to.handleOut;
    if (segment.kind !== "line" && first && second) {
      return cad.makeBezierEdge([
        { x: from.x, y: 0, z: from.z },
        { x: first.x, y: 0, z: first.z },
        { x: second.x, y: 0, z: second.z },
        { x: to.x, y: 0, z: to.z },
      ]);
    }
    return cad.makeLineEdge({ x: from.x, y: 0, z: from.z }, { x: to.x, y: 0, z: to.z });
  });
  return cad.makeWire(edges);
}

self.onmessage = async (event: MessageEvent<SketchCadBuildRequest>) => {
  const request = event.data;
  let cad: OcctKernel | null = null;
  try {
    cad = await kernel();
    cad.releaseAll();
    if (request.type === "sweep") {
      if (request.points.length < 2) throw new Error("A bend needs at least two points");
      // Connecting the control points with plain straight spine segments and
      // sweeping the whole thing in Frenet mode (a profile that stays
      // genuinely perpendicular to the spine at every point) is the simple,
      // reliable combination: it keeps a uniform, correctly round cross-
      // section on every bend actually reachable through the turtle-style
      // panel (up to 179 degrees per segment). pipe() is a fallback for the
      // rare topology OpenCascade's own smooth mode can't resolve - it
      // still closes the solid, just with a visibly mitred corner there
      // instead of a rounded one.
      const buildSpine = () => cad!.makeWire(request.points.slice(1).map((point, index) => cad!.makeLineEdge(request.points[index], point)));
      const buildProfile = () => cad!.makeWire([cad!.makeCircleEdge(request.points[0], { x: 0, y: 1, z: 0 }, Math.max(0.05, request.radius))]);
      let result: ShapeHandle;
      try {
        result = cad.sweepPipeShell(buildProfile(), buildSpine(), true, true);
        if (!cad.isValid(result)) throw new Error("invalid topology from smooth sweep");
      } catch {
        result = cad.pipe(buildProfile(), buildSpine());
        if (!cad.isValid(result)) throw new Error("OpenCascade produced invalid sweep topology");
      }
      const mesh = cad.tessellate(result, { linearDeflection: SKETCH_CAD_DEFLECTION.linear, angularDeflection: SKETCH_CAD_DEFLECTION.angular });
      const positions = new Float32Array(mesh.positions);
      const normals = new Float32Array(mesh.normals);
      const indices = new Uint32Array(mesh.indices);
      const brep = cad.toBREP(result);
      post({ type: "swept", requestId: request.requestId, positions, normals, indices, triangleCount: mesh.triangleCount, brep }, [positions.buffer, normals.buffer, indices.buffer]);
      return;
    }
    const regions = cadSketchRegions(request.profile);
    if (regions.length === 0) throw new Error("No closed profile found. Draw at least one closed loop and ensure it has no degenerate (zero-area) geometry.");
    const solids: ShapeHandle[] = regions.map((region) => {
      let face = cad!.makeFace(pathWire(cad!, region.outer));
      if (region.holes.length > 0) face = cad!.addHolesInFace(face, region.holes.map((hole) => pathWire(cad!, hole)));
      return cad!.extrude(face, 0, request.height, 0);
    });
    const result = solids.length === 1 ? solids[0] : cad.makeCompound(solids);
    if (!cad.isValid(result)) throw new Error("OpenCascade produced invalid sketch topology");
    const mesh = cad.tessellate(result, { linearDeflection: SKETCH_CAD_DEFLECTION.linear, angularDeflection: SKETCH_CAD_DEFLECTION.angular });
    const positions = new Float32Array(mesh.positions);
    const normals = new Float32Array(mesh.normals);
    const indices = new Uint32Array(mesh.indices);
    const brep = cad.toBREP(result);
    post({ type: "built", requestId: request.requestId, positions, normals, indices, triangleCount: mesh.triangleCount, brep }, [positions.buffer, normals.buffer, indices.buffer]);
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
