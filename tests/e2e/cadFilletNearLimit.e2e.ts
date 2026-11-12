import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { OcctKernel } from "occt-wasm";
import type { CadModifierWorkerRequest, CadModifierWorkerResponse } from "@/lib/cadModifierTypes";

/*
 * A fillet exactly as large as the face beside it (reported by mail, 10.11.2026): on a cylinder 20 mm across and 2 mm
 * high, a 2 mm fillet on the top edge was refused while 1.99 mm went through, and so were 1 mm on both edges and a 2 mm
 * chamfer. The kernel refuses that very size, as the side face would go whole; the edge tool now tries a hair less
 * itself. A size that is really too large is still refused.
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

describe("a fillet or chamfer as large as the face beside it", () => {
  it("goes through at the limit and is still refused past it", async () => {
    vi.stubGlobal("WebAssembly", WebAssembly);
    await import("@/workers/cadModifier.worker");
    const cad = await OcctKernel.init({ wasm: join(occtDir, "occt-wasm.wasm") });

    async function treat(height: number, kind: "fillet" | "chamfer", amount: number, rims: Array<"top" | "bottom">) {
      const solid = cad.makeCylinder(10, height);
      const before = cad.getVolume(solid);
      const ready = await ask({ type: "prepare", parts: [{ brep: cad.toBREP(solid) }], sharpAngle: 25 });
      if (ready.type !== "ready") throw new Error(`not ready: ${JSON.stringify(ready).slice(0, 200)}`);
      // The circle round the top (z = height) or the bottom (z = 0).
      const edgeIds = ready.edges.filter((edge) => {
        const zs: number[] = [];
        for (let index = 2; index < edge.points.length; index += 3) zs.push(edge.points[index]);
        return zs.length > 0 && rims.some((rim) => zs.every((z) => Math.abs(z - (rim === "top" ? height : 0)) < 1e-4));
      }).map((edge) => edge.id);
      expect(edgeIds.length).toBeGreaterThanOrEqual(rims.length);
      const preview = await ask({ type: "preview", kind, edgeIds, amount, quality: "draft", chamferAngle: 45 });
      if (preview.type !== "preview") return { ok: false as const };
      return { ok: true as const, before, after: cad.getVolume(cad.fromBREP(preview.brep)) };
    }

    // A quarter round of radius 2 off a 20 mm disc takes about 2π·(r - 4r/3π)·(1 - π/4)·4 mm³ ≈ 47 mm³ of 628.
    const top = await treat(2, "fillet", 2, ["top"]);
    expect(top.ok).toBe(true);
    if (top.ok) expect(top.before - top.after).toBeGreaterThan(40);
    expect((await treat(2, "fillet", 1, ["top", "bottom"])).ok).toBe(true);
    expect((await treat(2, "chamfer", 2, ["top"])).ok).toBe(true);
    // A body a few thousandths low, as after scaling: 2 mm on a 1.997 mm cylinder.
    expect((await treat(1.997, "fillet", 2, ["top"])).ok).toBe(true);
    // Really too large stays refused.
    expect((await treat(2, "fillet", 2.1, ["top"])).ok).toBe(false);
  }, 300_000);
});
