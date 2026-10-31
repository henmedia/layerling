import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it, vi } from "vitest";
import type { CadModifierMeshPart, CadModifierWorkerRequest, CadModifierWorkerResponse } from "@/lib/cadModifierTypes";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * The herringbone gear through the edge tool's worker (#1007), as the editor sends it: the edges the tool offers and
 * what a chamfer or fillet on all of them makes. In the middle the tip and the foot of each tooth run on almost
 * smoothly from one half into the other, under the tool's sharp angle, so it does not offer those edges. The worker
 * loads its kernel from a URL; here that URL is the package's own folder, as in tests/perf/cad-edge-tool.perf.ts.
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

describe("the herringbone gear in the edge tool's worker (#1007)", () => {
  it("offers the edges where the flanks turn back, not the smooth ones, and takes a chamfer or fillet on all it offers", async () => {
    vi.stubGlobal("WebAssembly", WebAssembly);
    await import("@/workers/cadModifier.worker");
    const { cadModifierHelicalGearForShape } = await import("@/lib/cadProfileExtrusion");
    const { createGearGeometry } = await import("@/lib/gearGeometry");
    for (const helixAngle of [22.5, 10]) {
      const shape = { id: "g", name: "Gear", kind: "gear", color: "#888888", x: 0, z: 0, elevation: 0, rotation: 0, width: 30, depth: 30, size: 30, height: 6, teeth: 12, toothSize: 2.5, centerHoleSize: 6, gearType: "herringbone", gearProfile: "simple", helixAngle, helixQuality: 16 } as WorkplaneShape;
      const helicalGear = cadModifierHelicalGearForShape(shape)!;
      const ready = await ask({ type: "prepare", parts: [{ helicalGear, hole: false } as CadModifierMeshPart], sharpAngle: 25 });
      if (ready.type !== "ready") throw new Error("not ready");
      const offered = new Set(ready.selectableEdgeIds);
      const middle = ready.edges.filter((edge) => edge.points.every((value, index) => index % 3 !== 1 || Math.abs(value - 3) < 1e-6));
      // Of the 48 edges in the middle, the 24 where a flank turns back are offered; the tips and feet are not.
      expect(middle).toHaveLength(48);
      expect(middle.filter((edge) => offered.has(edge.id))).toHaveLength(24);
      const position = createGearGeometry(shape).toNonIndexed().getAttribute("position");
      const drawn = meshVolume(position.array, Array.from({ length: position.count }, (_, index) => index));
      for (const kind of ["chamfer", "fillet"] as const) {
        const treated = await ask({ type: "preview", kind, edgeIds: [...offered], amount: 0.2, quality: "standard", chamferAngle: 45 });
        if (treated.type !== "preview") throw new Error("no preview");
        const ys = Array.from(treated.positions).filter((_, index) => index % 3 === 1);
        // Still on its foot and as high as drawn, a few cubic millimetres off at the edges.
        expect(Math.min(...ys), `${helixAngle} ${kind}`).toBeCloseTo(0, 3);
        expect(Math.max(...ys)).toBeCloseTo(6, 3);
        expect(Math.abs(meshVolume(treated.positions, treated.indices) - drawn) / drawn).toBeLessThan(0.01);
      }
    }
  });
  it("rounds the ends and the middle edges of one with involute teeth on their own, and refuses all of them at once", async () => {
    vi.stubGlobal("WebAssembly", WebAssembly);
    await import("@/workers/cadModifier.worker");
    const { cadModifierHelicalGearForShape } = await import("@/lib/cadProfileExtrusion");
    const { createGearGeometry } = await import("@/lib/gearGeometry");
    const shape = { id: "g", name: "Gear", kind: "gear", color: "#888888", x: 0, z: 0, elevation: 0, rotation: 0, width: 28, depth: 28, size: 28, height: 6, teeth: 12, centerHoleSize: 5, gearType: "herringbone", gearProfile: "involute", gearPressureAngle: 20, gearBacklash: 0.2, helixAngle: 22.5, helixQuality: 16 } as WorkplaneShape;
    const ready = await ask({ type: "prepare", parts: [{ helicalGear: cadModifierHelicalGearForShape(shape)!, hole: false } as CadModifierMeshPart], sharpAngle: 25 });
    if (ready.type !== "ready") throw new Error("not ready");
    const offered = new Set(ready.selectableEdgeIds);
    const at = (y: number) => ready.edges.filter((edge) => offered.has(edge.id) && edge.points.every((value, index) => index % 3 !== 1 || Math.abs(value - y) < 1e-6)).map((edge) => edge.id);
    const position = createGearGeometry(shape).toNonIndexed().getAttribute("position");
    const drawn = meshVolume(position.array, Array.from({ length: position.count }, (_, index) => index));
    for (const edgeIds of [[...at(0), ...at(6)], at(3)]) {
      expect(edgeIds.length).toBeGreaterThan(0);
      const treated = await ask({ type: "preview", kind: "fillet", edgeIds, amount: 0.2, quality: "standard", chamferAngle: 45 });
      if (treated.type !== "preview") throw new Error("no preview");
      expect(Math.abs(meshVolume(treated.positions, treated.indices) - drawn) / drawn).toBeLessThan(0.01);
    }
    await expect(ask({ type: "preview", kind: "fillet", edgeIds: [...offered], amount: 0.2, quality: "standard", chamferAngle: 45 })).rejects.toThrow();
  });
});
