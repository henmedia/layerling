import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it, vi } from "vitest";
import type { CadModifierMeshPart, CadModifierWorkerRequest, CadModifierWorkerResponse } from "@/lib/cadModifierTypes";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * A cloud of five discs grouped into one body: its top edges meet in sharp inner corners, where no fillet or chamfer
 * has room, at any size. The edge tool rounds or chamfers those corners first (lib/cadInnerCorners.ts) and says so.
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

const HEIGHT = 4;
const DISCS = [[-22, 4, 26], [-4, -6, 32], [16, 0, 28], [30, 8, 20], [4, 12, 24]];

async function cloudParts(discs = DISCS) {
  const { groupedShape, restoreGroupedChildrenForEdges } = await import("@/lib/editorBooleans");
  const { cadModifierPrimitiveForBakedShape, cadModifierPrimitiveForAnalyticShape } = await import("@/lib/cadBakeMetadata");
  const base = { color: "#f55", size: 20, rotation: 0, locked: false, hidden: false, elevation: 0 } as const;
  const shapes = discs.map(([x, z, d], index) => ({ ...base, id: `disc${index}`, name: "Cylinder", kind: "cylinder", x, z, width: d, depth: d, height: HEIGHT } as WorkplaneShape));
  const group = groupedShape(shapes);
  if (!group) throw new Error("no group");
  return restoreGroupedChildrenForEdges(group).map(({ shape, scope }) => {
    const primitive = cadModifierPrimitiveForBakedShape(shape) ?? cadModifierPrimitiveForAnalyticShape(shape);
    if (!primitive) throw new Error(`no exact part for ${shape.kind}`);
    return { primitive, hole: false, ...(scope.length ? { scope } : {}) } as CadModifierMeshPart;
  });
}

const heights = (edge: { points: number[] }) => edge.points.filter((_, index) => index % 3 === 1);

describe("a fillet past sharp inner corners", () => {
  it("rounds the top of a cloud of grouped discs by rounding its inner corners first", async () => {
    vi.stubGlobal("WebAssembly", WebAssembly);
    await import("@/workers/cadModifier.worker");
    const parts = await cloudParts();
    const ready = await ask({ type: "prepare", parts, sharpAngle: 25 });
    if (ready.type !== "ready") throw new Error("not ready");
    const top = ready.edges.filter((edge) => edge.selectable && heights(edge).every((y) => Math.abs(y - HEIGHT) < 1e-3));
    expect(top).toHaveLength(7);
    for (const [amount, cornerAmount] of [[0.5, 0.5], [1, 1], [2, 1]] as const) {
      const preview = await ask({ type: "preview", kind: "fillet", edgeIds: top.map((edge) => edge.id), amount, quality: "draft", chamferAngle: 45 });
      if (preview.type !== "preview") throw new Error("no preview");
      // The seven notches where two discs meet: taken along at the size, or rounded first at half of it.
      expect(preview.innerCorners).toEqual({ count: 7, amount: cornerAmount });
      expect(preview.cornerEdgeIds).toBeUndefined();
      expect(meshVolume(preview.positions, preview.indices)).toBeGreaterThan(0);
    }
  });

  it("chamfers it the same way", async () => {
    vi.stubGlobal("WebAssembly", WebAssembly);
    await import("@/workers/cadModifier.worker");
    const ready = await ask({ type: "prepare", parts: await cloudParts(), sharpAngle: 25 });
    if (ready.type !== "ready") throw new Error("not ready");
    const top = ready.edges.filter((edge) => edge.selectable && heights(edge).every((y) => Math.abs(y - HEIGHT) < 1e-3));
    const preview = await ask({ type: "preview", kind: "chamfer", edgeIds: top.map((edge) => edge.id), amount: 1, quality: "draft", chamferAngle: 45 });
    if (preview.type !== "preview") throw new Error("no preview");
    expect(preview.innerCorners?.count).toBe(7);
  });

  it("keeps the refusal where a disc barely shows between two others, rather than a body whose faces cross", async () => {
    vi.stubGlobal("WebAssembly", WebAssembly);
    await import("@/workers/cadModifier.worker");
    // The same discs in a row: the one at 4 shows only as a sliver above and below the two it lies between.
    const ready = await ask({ type: "prepare", parts: await cloudParts(DISCS.map(([x, , d]) => [x, 0, d])), sharpAngle: 25 });
    if (ready.type !== "ready") throw new Error("not ready");
    const top = ready.edges.filter((edge) => edge.selectable && heights(edge).every((y) => Math.abs(y - HEIGHT) < 1e-3));
    for (const amount of [0.67, 1, 2]) {
      await expect(ask({ type: "preview", kind: "fillet", edgeIds: top.map((edge) => edge.id), amount, quality: "standard", chamferAngle: 45 })).rejects.toThrow(/cannot be filleted together/);
    }
  });

  it("leaves a body whose edges go through as they are", async () => {
    vi.stubGlobal("WebAssembly", WebAssembly);
    await import("@/workers/cadModifier.worker");
    const ready = await ask({ type: "prepare", parts: [{ primitive: (await cloudParts())[0].primitive, hole: false } as CadModifierMeshPart], sharpAngle: 25 });
    if (ready.type !== "ready") throw new Error("not ready");
    const top = ready.edges.filter((edge) => edge.selectable && heights(edge).every((y) => Math.abs(y - HEIGHT) < 1e-3));
    const preview = await ask({ type: "preview", kind: "fillet", edgeIds: top.map((edge) => edge.id), amount: 1, quality: "draft", chamferAngle: 45 });
    if (preview.type !== "preview") throw new Error("no preview");
    expect(preview.innerCorners).toBeUndefined();
  });
});

