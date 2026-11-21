import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it, vi } from "vitest";
import manifoldModule from "manifold-3d";
import { TIGHT_BEND_MESSAGE_START } from "@/lib/cadTightBends";
import type { CadModifierWorkerRequest, CadModifierWorkerResponse } from "@/lib/cadModifierTypes";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * An all-edge fillet on a Gridfinity bin with a lettered label (Issue #1812). The kernel cannot make it, as the letters
 * bend tighter than the radius, and the edge tool says so. Before it does, it looks for sharp inner corners among the
 * edges at the ends of the picked ones: 150 edges on this bin, none of them an inner corner, and on a body of so many
 * faces that look alone took 14 s where the tool gives inner corners four. With a second label the preview timed out
 * after 30 s before the refusal came. The look now stops when its time is up.
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
// How long the worker's look for inner corners took, over how many edges, and what it found.
const scan = { ms: 0, edges: 0, corners: 0 };
vi.mock("@/lib/cadInnerCorners", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/cadInnerCorners")>();
  return {
    ...original,
    innerCornerEdges: (...args: Parameters<typeof original.innerCornerEdges>) => {
      const start = performance.now();
      const found = original.innerCornerEdges(...args);
      scan.ms += performance.now() - start;
      scan.edges += args[2].length;
      scan.corners += found.length;
      return found;
    },
  };
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

/** A 2 x 1 Gridfinity bin with these settings as the exact part the editor hands the worker, its letters from the font's curves. */
async function binPart(fields: Record<string, unknown>) {
  const { cadModifierGridfinityForShape } = await import("@/lib/cadProfileExtrusion");
  const { rememberManifoldRuntime } = await import("@/lib/manifoldHandle");
  const { loadTextFonts } = await import("@/lib/textFonts");
  await loadTextFonts();
  const runtime = await manifoldModule();
  runtime.setup();
  rememberManifoldRuntime(runtime);
  const shape = { id: "g", name: "bin", kind: "gridfinity", x: 0, z: 0, elevation: 0, size: 83.5, width: 83.5, depth: 41.5, height: 25.4, rotation: 0, color: "#4f7fa8", gridfinityType: "bin", gridfinityLip: true, ...fields } as WorkplaneShape;
  const gridfinity = cadModifierGridfinityForShape(shape);
  if (!gridfinity) throw new Error("no exact bin");
  return { gridfinity, hole: false };
}

// The four seconds the worker gives inner corners (INNER_CORNER_BUDGET_MS), and room for the edge it was at.
const LOOK_BUDGET_MS = 4000;
const LOOK_SLACK_MS = 2000;

describe("an all-edge fillet on a labelled Gridfinity bin", () => {
  it("is refused for its tight bends without the look for inner corners running past its time", async () => {
    vi.stubGlobal("WebAssembly", WebAssembly);
    await import("@/workers/cadModifier.worker");
    // A 2 x 1 bin with a label shelf on the back that reads M3 NUTS.
    const ready = await ask({ type: "prepare", parts: [await binPart({ gridfinityLabelBack: true, gridfinityLabelBackText: "M3 NUTS" })], sharpAngle: 25 });
    if (ready.type !== "ready") throw new Error(`not ready: ${JSON.stringify(ready).slice(0, 300)}`);
    expect(ready.selectableEdgeIds.length).toBeGreaterThan(300);
    const reply = await ask({ type: "preview", kind: "fillet", edgeIds: ready.selectableEdgeIds, amount: 0.3, quality: "draft", chamferAngle: 45 });
    if (reply.type !== "error") throw new Error("the fillet went through");
    expect(reply.message.startsWith(TIGHT_BEND_MESSAGE_START)).toBe(true);
    // It did look, at more edges than fit in its time, and gave up rather than finish them.
    expect(scan.edges).toBeGreaterThan(100);
    expect(scan.corners).toBe(0);
    expect(scan.ms).toBeLessThan(LOOK_BUDGET_MS + LOOK_SLACK_MS);
  });
});
