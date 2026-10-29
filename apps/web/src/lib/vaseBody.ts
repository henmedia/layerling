import { buildVase } from "@/lib/vase/vase-geometry.mjs";
import { buildParts } from "@/lib/vase/vase-parts.mjs";
import type { VaseSettings } from "@/lib/vaseSettings";

/**
 * The vase's body in the core's coordinates: one closed mesh, with legs moulded on when it has them.
 * Apart from vaseShape.ts so the vase worker can build it without the editor's texts and three.
 */
export type VaseBody = { vertices: Float64Array; indices: Uint32Array; triangleCount: number; notes: string[] };

export function buildVaseBody(settings: VaseSettings): VaseBody {
  const mesh = buildVase(settings);
  let body: VaseBody = { vertices: mesh.vertices, indices: mesh.indices, triangleCount: mesh.triangleCount, notes: mesh.notes ?? [] };
  if (settings.legMode === "angeformt") {
    // Moulded legs are part of the vase's own object: built alone (the other parts are not needed here), joined on.
    const legs = buildParts({ ...settings, saucerMode: "keine", insertMode: "keine", lidMode: "keiner" }).parts.filter((part) => part.merge);
    body = legs.reduce((joined, part) => joinMeshes(joined, part.mesh), body);
  }
  return body;
}

/** Two closed meshes as one (the legs reach a little into the bottom; slicers join them). */
function joinMeshes(a: VaseBody, b: { vertices: Float64Array; indices: Uint32Array }): VaseBody {
  const vertices = new Float64Array(a.vertices.length + b.vertices.length);
  vertices.set(a.vertices, 0);
  vertices.set(b.vertices, a.vertices.length);
  const offset = a.vertices.length / 3;
  const indices = new Uint32Array(a.indices.length + b.indices.length);
  indices.set(a.indices, 0);
  for (let i = 0; i < b.indices.length; i += 1) indices[a.indices.length + i] = b.indices[i] + offset;
  return { vertices, indices, triangleCount: indices.length / 3, notes: a.notes };
}

export type VaseBodyWorkerRequest = { requestId: number; settings: VaseSettings };

export type VaseBodyWorkerResponse = { requestId: number; body: VaseBody } | { requestId: number; error: string };
