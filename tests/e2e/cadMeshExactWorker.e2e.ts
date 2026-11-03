import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import { OcctKernel } from "occt-wasm";
import type { CadModifierMeshPart, CadModifierWorkerRequest, CadModifierWorkerResponse } from "@/lib/cadModifierTypes";
import { EXACT_MESH_FREEFORM_MESSAGE } from "@/lib/cadMeshExactMessages";

/*
 * Make exact the way the editor asks for it: a prepare with `exact` and an "exact" preview through the edge tool's
 * worker. The mesh comes back as the exact body with its report, or with the free-form message when there is nothing
 * to find in it.
 */

const occtDir = dirname(fileURLToPath(import.meta.resolve("occt-wasm")));

vi.mock("@/lib/cadModifierRuntime", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/cadModifierRuntime")>()),
  CAD_MODIFIER_RUNTIME_BASE: pathToFileURL(occtDir).href,
}));
vi.mock("occt-wasm", async (importOriginal) => {
  const original = await importOriginal<typeof import("occt-wasm")>();
  const init = original.OcctKernel.init.bind(original.OcctKernel);
  original.OcctKernel.init = ((options: object) => init({ ...options, wasm: join(occtDir, "occt-wasm.wasm") })) as typeof original.OcctKernel.init;
  return original;
});

type Self = { postMessage: (message: unknown) => void; onmessage: ((event: { data: CadModifierWorkerRequest }) => Promise<void>) | null };
const replies: CadModifierWorkerResponse[] = [];
const self: Self = { postMessage: (message) => replies.push(message as CadModifierWorkerResponse), onmessage: null };
(globalThis as unknown as { self: Self }).self = self;

let requestId = 0;
async function ask(request: Omit<CadModifierWorkerRequest, "requestId"> & { type: string }) {
  requestId += 1;
  const id = requestId;
  replies.length = 0;
  await self.onmessage!({ data: { ...request, requestId: id } as CadModifierWorkerRequest });
  const reply = replies.find((entry) => (entry as { requestId?: number }).requestId === id);
  if (!reply) throw new Error("no reply");
  if (reply.type === "error") throw new Error(reply.message);
  return reply;
}

function meshVolume(positions: ArrayLike<number>, indices: ArrayLike<number>) {
  let volume = 0;
  for (let index = 0; index < indices.length; index += 3) {
    const [a, b, c] = [indices[index] * 3, indices[index + 1] * 3, indices[index + 2] * 3];
    volume += (positions[a] * (positions[b + 1] * positions[c + 2] - positions[b + 2] * positions[c + 1])
      - positions[a + 1] * (positions[b] * positions[c + 2] - positions[b + 2] * positions[c])
      + positions[a + 2] * (positions[b] * positions[c + 1] - positions[b + 1] * positions[c])) / 6;
  }
  return volume;
}

describe("Make exact through the edge tool's worker", () => {
  it("rebuilds a meshed plate with a bore and hands back the exact body", async () => {
    vi.stubGlobal("WebAssembly", WebAssembly);
    await import("@/workers/cadModifier.worker");
    const cad = await OcctKernel.init({ wasm: join(occtDir, "occt-wasm.wasm") });
    const plate = cad.cut(cad.makeBox(40, 30, 8), cad.translate(cad.makeCylinder(5, 20), 20, 15, -5));
    const mesh = cad.tessellate(plate, { linearDeflection: 0.02, angularDeflection: 0.15 });
    const part: CadModifierMeshPart = { positions: Float32Array.from(mesh.positions), indices: Uint32Array.from(mesh.indices), hole: false };

    const ready = await ask({ type: "prepare", parts: [part], sharpAngle: 25, exact: true });
    if (ready.type !== "ready") throw new Error("not ready");
    expect(ready.exactReport).toMatchObject({ plane: 6, cylinder: 1, cone: 0, sphere: 0, torus: 0, facets: 0, faces: 7 });
    // The bore's rim at the top is one or two round edges, not a ring of short lines.
    const atTop = ready.edges.filter((edge) => edge.points.every((_, i) => i % 3 !== 2 || Math.abs(edge.points[i] - 8) < 1e-3));
    expect(atTop.length).toBeLessThanOrEqual(6);

    const preview = await ask({ type: "preview", kind: "exact", edgeIds: [], amount: 1, quality: "standard", chamferAngle: 45 });
    if (preview.type !== "preview") throw new Error("no preview");
    expect(preview.brep?.length ?? 0).toBeGreaterThan(100);
    const volume = 40 * 30 * 8 - Math.PI * 25 * 8;
    expect(Math.abs(meshVolume(preview.positions, preview.indices) / volume - 1)).toBeLessThan(0.01);
  });

  it("says a free-form mesh is free-form instead of building its triangles over again", async () => {
    vi.stubGlobal("WebAssembly", WebAssembly);
    await import("@/workers/cadModifier.worker");
    const knot = new THREE.TorusKnotGeometry(10, 3, 96, 12);
    const part: CadModifierMeshPart = {
      positions: Float32Array.from(knot.getAttribute("position").array as ArrayLike<number>),
      indices: Uint32Array.from(knot.index!.array as ArrayLike<number>),
      hole: false,
    };
    await expect(ask({ type: "prepare", parts: [part], sharpAngle: 25, exact: true })).rejects.toThrow(EXACT_MESH_FREEFORM_MESSAGE);
  });
});
