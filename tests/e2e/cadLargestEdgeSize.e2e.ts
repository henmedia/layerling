import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { OcctKernel } from "occt-wasm";
import type { CadModifierWorkerRequest, CadModifierWorkerResponse } from "@/lib/cadModifierTypes";

/*
 * The largest size that fits (Discussion #1635): the edge tool refuses a chamfer or fillet that is too large, and a
 * button searches for the largest one the picked edges still take. On a disc 20 mm across and 2 mm high the top edge
 * takes a fillet or chamfer of 2 mm and no more (tests/e2e/cadFilletNearLimit.e2e.ts); the size found must go through
 * the preview itself.
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
  return reply;
}

describe("the largest chamfer or fillet that fits", () => {
  it("is found below a refused size and goes through the preview", async () => {
    vi.stubGlobal("WebAssembly", WebAssembly);
    await import("@/workers/cadModifier.worker");
    const cad = await OcctKernel.init({ wasm: join(occtDir, "occt-wasm.wasm") });

    async function topRim(height: number) {
      const ready = await ask({ type: "prepare", parts: [{ brep: cad.toBREP(cad.makeCylinder(10, height)) }], sharpAngle: 25 });
      if (ready.type !== "ready") throw new Error(`not ready: ${JSON.stringify(ready).slice(0, 200)}`);
      return ready.edges.filter((edge) => {
        const zs: number[] = [];
        for (let index = 2; index < edge.points.length; index += 3) zs.push(edge.points[index]);
        return zs.length > 0 && zs.every((z) => Math.abs(z - height) < 1e-4);
      }).map((edge) => edge.id);
    }

    for (const kind of ["fillet", "chamfer"] as const) {
      const edgeIds = await topRim(2);
      expect(edgeIds.length).toBeGreaterThan(0);
      // 5 mm is refused ...
      expect((await ask({ type: "preview", kind, edgeIds, amount: 5, quality: "draft", chamferAngle: 45 })).type).toBe("error");
      // ... the search finds 2 mm (1.99 at the least) ...
      const found = await ask({ type: "largest", kind, edgeIds, amount: 5, chamferAngle: 45 });
      if (found.type !== "largest") throw new Error(`no size: ${JSON.stringify(found).slice(0, 200)}`);
      expect(found.amount).not.toBeNull();
      expect(found.amount!).toBeGreaterThanOrEqual(1.99);
      expect(found.amount!).toBeLessThanOrEqual(2);
      // ... and the preview takes it.
      expect((await ask({ type: "preview", kind, edgeIds, amount: found.amount!, quality: "draft", chamferAngle: 45 })).type).toBe("preview");
    }

    // A variable fillet keeps the ratio of its ends.
    const rim = await topRim(2);
    const variable = await ask({ type: "largest", kind: "fillet", edgeIds: [rim[0]], amount: 4, endAmount: 6, chamferAngle: 45 });
    if (variable.type !== "largest") throw new Error("no size");
    if (variable.amount !== null) expect(variable.endAmount).toBeCloseTo(variable.amount * 1.5, 6);

    // Below the smallest step nothing is tried, and nothing is found.
    const tiny = await ask({ type: "largest", kind: "fillet", edgeIds: rim, amount: 0.001, chamferAngle: 45 });
    if (tiny.type !== "largest") throw new Error("no answer");
    expect(tiny.amount).toBeNull();
  }, 300_000);
});
