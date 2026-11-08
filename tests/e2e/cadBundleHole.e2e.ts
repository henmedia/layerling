import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it, vi } from "vitest";
import type { CadModifierMeshPart, CadModifierWorkerRequest, CadModifierWorkerResponse } from "@/lib/cadModifierTypes";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * A peg standing in its own hole, bundled and grouped with a box, through the edge tool's worker (#1164): the bundle's hole
 * cuts the box but not the peg, so the chamfer must leave the ring-shaped groove. It went to the kernel as the bundle's
 * mesh, which has no hole in it, and the groove was filled.
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

describe("a bundle with a hole in the edge tool's worker (#1164)", () => {
  it("keeps the groove round a peg that stands in its own hole", async () => {
    vi.stubGlobal("WebAssembly", WebAssembly);
    await import("@/workers/cadModifier.worker");
    const { groupedShape, restoreGroupedChildrenForEdges } = await import("@/lib/editorBooleans");
    const { cadModifierPrimitiveForBakedShape, cadModifierPrimitiveForAnalyticShape } = await import("@/lib/cadBakeMetadata");

    const base = { color: "#fff", x: 0, z: 0, size: 20, rotation: 0, locked: false, hidden: false } as const;
    const box = { ...base, id: "box", name: "Box", kind: "box", elevation: 0, width: 20, depth: 20, height: 16 } as WorkplaneShape;
    const peg = { ...base, id: "peg", name: "Peg", kind: "cylinder", elevation: 11, width: 7, depth: 7, height: 6 } as WorkplaneShape;
    const hole = { ...base, id: "hole", name: "Hole", kind: "cylinder", elevation: 11, width: 10, depth: 10, height: 6, hole: true } as WorkplaneShape;
    const pegAndHole = groupedShape([peg, hole]);
    if (!pegAndHole) throw new Error("no bundle");
    const bundle = { ...pegAndHole, name: "Bundle", groupOperation: "bundle" } as WorkplaneShape;
    const group = groupedShape([box, bundle]);
    if (!group) throw new Error("no group");

    const parts = restoreGroupedChildrenForEdges(group).map(({ shape, scope }) => {
      const primitive = cadModifierPrimitiveForBakedShape(shape) ?? cadModifierPrimitiveForAnalyticShape(shape);
      if (!primitive) throw new Error(`no exact part for ${shape.kind}`);
      return { primitive, hole: Boolean(shape.hole), ...(scope.length ? { scope } : {}) } as CadModifierMeshPart;
    });
    expect(parts.find((part) => part.hole)?.scope).toEqual([1_000_000]);
    expect(parts.filter((part) => part.hole)).toHaveLength(1);

    const ready = await ask({ type: "prepare", parts, sharpAngle: 25 });
    if (ready.type !== "ready") throw new Error("not ready");
    // The four top edges of the box.
    const top = ready.edges.filter((edge) => edge.selectable && edge.points.length >= 6 && edge.points.every((_, i) => i % 3 !== 1 || Math.abs(edge.points[i] - 16) < 1e-3));
    const preview = await ask({ type: "preview", kind: "chamfer", edgeIds: top.slice(0, 4).map((edge) => edge.id), amount: 1, quality: "draft", chamferAngle: 45 });
    if (preview.type !== "preview") throw new Error("no preview");
    const volume = meshVolume(preview.positions, preview.indices);
    // The box less the groove (r 5 to r 3.5 and 5 high from 11 to 16) and the corner chamfers (4 edges of 20 mm, 0.5 mm^2).
    const ring = Math.PI * (25 - 12.25) * 5;
    const expected = 20 * 20 * 16 - ring + Math.PI * 12.25 * 1 - 4 * 20 * 0.5 + 8 * 0.25 * 1;
    expect(Math.abs(volume - expected)).toBeLessThan(25);
    // With the hole filled it would be 80 mm^3 more.
    expect(volume).toBeLessThan(20 * 20 * 16 - ring + Math.PI * 12.25 * 1 + 25);
  });

  it("opens a bundle of nothing but holes, so its round holes stay round (#1503)", async () => {
    const { groupedShape, restoreGroupedChildrenForEdges } = await import("@/lib/editorBooleans");
    const { cadModifierPrimitiveForBakedShape, cadModifierPrimitiveForAnalyticShape } = await import("@/lib/cadBakeMetadata");

    // Two holes bundled, grouped with a box: the bundle went as its mesh, each hole a polygon of 96 flat strips.
    const base = { color: "#fff", z: 0, size: 20, rotation: 0, locked: false, hidden: false } as const;
    const box = { ...base, id: "box", name: "Box", kind: "box", x: 0, elevation: 0, width: 40, depth: 20, height: 16 } as WorkplaneShape;
    const holes = [-10, 10].map((x, index) => ({ ...base, id: `hole-${index}`, name: "Hole", kind: "cylinder", x, elevation: 4, width: 10, depth: 10, height: 20, hole: true }) as WorkplaneShape);
    const holesBundled = groupedShape(holes);
    if (!holesBundled) throw new Error("no bundle");
    const group = groupedShape([box, { ...holesBundled, name: "Bundle", groupOperation: "bundle" } as WorkplaneShape]);
    if (!group) throw new Error("no group");

    const restored = restoreGroupedChildrenForEdges(group);
    expect(restored.map(({ shape }) => shape.kind)).toEqual(["box", "cylinder", "cylinder"]);
    const parts = restored.map(({ shape, scope }) => {
      const primitive = cadModifierPrimitiveForBakedShape(shape) ?? cadModifierPrimitiveForAnalyticShape(shape);
      if (!primitive) throw new Error(`no exact part for ${shape.kind}`);
      return { primitive, hole: Boolean(shape.hole), ...(scope.length ? { scope } : {}) } as CadModifierMeshPart;
    });

    const ready = await ask({ type: "prepare", parts, sharpAngle: 25 });
    if (ready.type !== "ready") throw new Error("not ready");
    // The rim of the left hole on the top face: a circle, not 96 short straight edges.
    const rim = ready.edges.filter((edge) => edge.points.length >= 6
      && edge.points.every((value, i) => (i % 3 === 1 ? Math.abs(value - 16) < 1e-3 : i % 3 === 0 ? value > -16 && value < -4 : true)));
    expect(rim.length).toBeGreaterThan(0);
    expect(rim.length).toBeLessThanOrEqual(2);
  });
});
