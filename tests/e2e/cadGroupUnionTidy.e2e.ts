import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it, vi } from "vitest";
import type { CadModifierMeshPart, CadModifierWorkerRequest, CadModifierWorkerResponse } from "@/lib/cadModifierTypes";

/*
 * A group is joined part by part, and after each union its faces are merged (simplify, unifySameDomain). In
 * uninteressant2026's enclosure (#1425) that merge broke the union with a screen holder made exact from a mesh;
 * every step after it stayed broken, the repair at the end could not save it, and no edge of the group could be
 * chamfered. The worker now tries once more and keeps such a union as it is. A group the old way brought through
 * is left as it was: its body, and so its edges, do not change.
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

type StoredPart = Omit<CadModifierMeshPart, "positions" | "indices"> & { positions?: number[]; indices?: number[] };
const fixture = JSON.parse(readFileSync(join(__dirname, "..", "fixtures", "screen-holder-group-1425.json"), "utf8")) as { broken: StoredPart[]; plain: StoredPart[] };
const parts = (stored: StoredPart[]) => stored.map(({ positions, indices, ...part }) => ({
  ...part,
  ...(positions && indices ? { positions: new Float32Array(positions), indices: new Uint32Array(indices) } : {}),
}) as CadModifierMeshPart);

describe("the union of a group whose faces cannot be merged", () => {
  it("keeps the union as it is, so the enclosure of #1425 can be chamfered", async () => {
    vi.stubGlobal("WebAssembly", WebAssembly);
    await import("@/workers/cadModifier.worker");
    const ready = await ask({ type: "prepare", parts: parts(fixture.broken), sharpAngle: 25 });
    if (ready.type !== "ready") throw new Error("not ready");
    expect(ready.edges.length).toBeGreaterThan(400);
    // The side wall's four long edges on the outside of the enclosure, where the user wanted a chamfer.
    const points = ready.edges.flatMap((edge) => edge.points);
    const xs = points.filter((_, index) => index % 3 === 0);
    const minX = Math.min(...xs);
    const wallEdges = ready.edges.filter((edge) => edge.selectable && edge.points.every((value, index) => index % 3 !== 0 || Math.abs(value - minX) < 1e-3));
    expect(wallEdges.length).toBeGreaterThanOrEqual(4);
    const preview = await ask({ type: "preview", kind: "chamfer", edgeIds: wallEdges.map((edge) => edge.id), amount: 0.5, quality: "standard", chamferAngle: 45 });
    expect(preview.type).toBe("preview");
  });

  it("leaves a group the plain way brought through as it was", async () => {
    vi.stubGlobal("WebAssembly", WebAssembly);
    await import("@/workers/cadModifier.worker");
    const ready = await ask({ type: "prepare", parts: parts(fixture.plain), sharpAngle: 25 });
    if (ready.type !== "ready") throw new Error("not ready");
    // Merged and repaired at the end, as before: 20 edges. A union kept as it is would bring its seams along (29).
    expect(ready.edges.length).toBe(20);
  });
});
