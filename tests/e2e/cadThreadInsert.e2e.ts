import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import type { CadModifierMeshPart, CadModifierWorkerRequest, CadModifierWorkerResponse } from "@/lib/cadModifierTypes";
import { readPerforableFace } from "@/lib/holePatternShapes";
import { THREAD_INSERT_SIZES } from "@/lib/threadInsert";
import { makeThreadInsertHole } from "@/lib/threadInsertGeometry";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * The hole of the thread insert tool (#1828) in the exact kernel: made as an ordinary cylinder hole and grouped with the
 * body, the edge tool's worker gets it as an exact part. The bore must be one true cylinder face (its rim a circle, not
 * a ring of short strips) and the body must lose exactly the volume of the bore, no more and no less.
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

describe("a thread insert hole in an exact body (#1828)", () => {
  it("cuts a round bore of the insert's size and length, and keeps its rim a circle", async () => {
    vi.stubGlobal("WebAssembly", WebAssembly);
    await import("@/workers/cadModifier.worker");
    const { groupedShape, restoreGroupedChildrenForEdges } = await import("@/lib/editorBooleans");
    const { cadModifierPrimitiveForBakedShape, cadModifierPrimitiveForAnalyticShape } = await import("@/lib/cadBakeMetadata");

    const base = { color: "#fff", x: 0, z: 0, size: 30, rotation: 0, locked: false, hidden: false } as const;
    const box = { ...base, id: "box", name: "Box", kind: "box", elevation: 0, width: 30, depth: 30, height: 20 } as WorkplaneShape;
    // The face the tool reads from the box's mesh, and the hole it makes at a spot of that face.
    const geometry = new THREE.BoxGeometry(30, 20, 30).toNonIndexed();
    geometry.translate(0, 10, 0);
    const read = readPerforableFace(Array.from(geometry.getAttribute("position").array as Float32Array), { x: 4, y: 20, z: -3 }, { x: 0, y: 1, z: 0 });
    if (!read.ok) throw new Error("no face");
    const m4 = THREAD_INSERT_SIZES.find((spec) => spec.name === "M4")!;
    const hole = makeThreadInsertHole(read.face, m4);
    const group = groupedShape([box, hole]);
    if (!group) throw new Error("no group");

    const parts = restoreGroupedChildrenForEdges(group).map(({ shape, scope }) => {
      const primitive = cadModifierPrimitiveForBakedShape(shape) ?? cadModifierPrimitiveForAnalyticShape(shape);
      if (!primitive) throw new Error(`no exact part for ${shape.kind}`);
      return { primitive, hole: Boolean(shape.hole), ...(scope.length ? { scope } : {}) } as CadModifierMeshPart;
    });
    expect(parts.filter((part) => part.hole)).toHaveLength(1);

    const ready = await ask({ type: "prepare", parts, sharpAngle: 25 });
    if (ready.type !== "ready") throw new Error("not ready");
    // The bore's rim on the top face (y = 20) and its floor (y = 20 - L) are each one circle edge round the hole's spot.
    const circleAt = (height: number) => ready.edges.filter((edge) => edge.points.length >= 6
      && edge.points.every((value, i) => (i % 3 === 1 ? Math.abs(value - height) < 1e-3 : i % 3 === 0 ? Math.abs(value - 4) <= m4.d3 / 2 + 1e-3 : Math.abs(value + 3) <= m4.d3 / 2 + 1e-3)));
    expect(circleAt(20).length).toBeGreaterThan(0);
    expect(circleAt(20).length).toBeLessThanOrEqual(2);
    expect(circleAt(20 - m4.L).length).toBeGreaterThan(0);
    expect(circleAt(20 - m4.L).length).toBeLessThanOrEqual(2);

    // A chamfer of 0.1 on one far edge only shows the body's volume: the box less exactly the bore.
    const far = ready.edges.filter((edge) => edge.selectable && edge.points.length >= 6 && edge.points.every((value, i) => (i % 3 === 1 ? Math.abs(value - 20) < 1e-3 : i % 3 === 0 ? Math.abs(value + 15) < 1e-3 : true)));
    expect(far.length).toBeGreaterThan(0);
    const preview = await ask({ type: "preview", kind: "chamfer", edgeIds: [far[0].id], amount: 0.1, quality: "draft", chamferAngle: 45 });
    if (preview.type !== "preview") throw new Error("no preview");
    const bore = Math.PI * (m4.d3 / 2) ** 2 * m4.L;
    const expected = 30 * 30 * 20 - bore - 30 * 0.005;
    expect(Math.abs(meshVolume(preview.positions, preview.indices) - expected)).toBeLessThan(2);
  });
});
