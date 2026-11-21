import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it, vi } from "vitest";
import type { CadModifierMeshPart, CadModifierWorkerRequest, CadModifierWorkerResponse } from "@/lib/cadModifierTypes";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * A tube whose bore cuts as a hole, grouped with a wall it runs through, through the edge tool's worker (#1790): the
 * group's mesh has the opening through the wall, so a chamfer on the group must keep it. The tube went to the kernel
 * as the one hollow tube it is, its bore cut nothing there, and the chamfered body came back with the wall closed.
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

const base = { color: "#c33", x: 0, z: 0, elevation: 0, rotation: 0, locked: false, hidden: false } as const;
/** A wall 6 mm thick across x, 30 wide and 30 high. */
const wall = () => ({ ...base, id: "wall", name: "Wall", kind: "box", size: 30, width: 6, depth: 30, height: 30 } as WorkplaneShape);

/** The group with the four top edges of the wall chamfered by 1 mm, as the edge tool builds it: its volume. */
async function chamferedVolume(pipe: WorkplaneShape) {
  vi.stubGlobal("WebAssembly", WebAssembly);
  await import("@/workers/cadModifier.worker");
  const { groupedShape, restoreGroupedChildrenForEdges } = await import("@/lib/editorBooleans");
  const { cadModifierPrimitiveForBakedShape, cadModifierPrimitiveForAnalyticShape } = await import("@/lib/cadBakeMetadata");
  const { cadModifierProfileForShape } = await import("@/lib/cadProfileExtrusion");
  const group = groupedShape([pipe, wall()]);
  if (!group) throw new Error("no group");
  const restored = restoreGroupedChildrenForEdges(group);
  const parts = restored.map(({ shape, scope }) => {
    const primitive = cadModifierPrimitiveForBakedShape(shape) ?? cadModifierPrimitiveForAnalyticShape(shape);
    const profile = primitive ? null : cadModifierProfileForShape(shape);
    if (!primitive && !profile) throw new Error(`no exact part for ${shape.kind}`);
    return { ...(primitive ? { primitive } : { profile }), hole: Boolean(shape.hole), ...(scope.length ? { scope } : {}) } as CadModifierMeshPart;
  });
  const ready = await ask({ type: "prepare", parts, sharpAngle: 25 });
  if (ready.type !== "ready") throw new Error("not ready");
  const top = ready.edges.filter((edge) => edge.selectable && edge.points.length >= 6 && edge.points.every((_, i) => i % 3 !== 1 || Math.abs(edge.points[i] - 30) < 1e-3));
  expect(top).toHaveLength(4);
  const preview = await ask({ type: "preview", kind: "chamfer", edgeIds: top.map((edge) => edge.id), amount: 1, quality: "draft", chamferAngle: 45 });
  if (preview.type !== "preview") throw new Error("no preview");
  return { volume: meshVolume(preview.positions, preview.indices), holes: restored.filter(({ shape }) => shape.hole).length };
}

describe("a tube whose bore cuts as a hole in the edge tool's worker (#1790)", () => {
  it("keeps the opening a bent tube cut through the wall when the group is chamfered", async () => {
    const { bentTubeNaturalDimensions, normalizedBentTubeFields } = await import("@/lib/bentTubeGeometry");
    // Outer 10, opening 6, lying along x through the wall.
    const fields = normalizedBentTubeFields({ bentTubeSize: 10, bentTubeWall: 2, bentTubeSegments: [{ length: 40, bendAngle: 0, bendRadius: 15, roll: 0 }] });
    const natural = bentTubeNaturalDimensions(fields);
    const pipe = (bore: boolean) => ({ ...base, id: "pipe", name: "Bent tube", kind: "bentTube", ...fields, width: natural.width, depth: natural.depth, height: natural.height, size: natural.size, tubeBoreHole: bore || undefined } as WorkplaneShape);
    const closed = await chamferedVolume(pipe(false));
    const open = await chamferedVolume(pipe(true));
    expect(closed.holes).toBe(0);
    expect(open.holes).toBe(1);
    // The opening through the 6 mm wall: a cylinder of 6 mm, drawn in the preview's coarse facets.
    expect(Math.abs(closed.volume - open.volume - Math.PI * 9 * 6)).toBeLessThan(3);
  });

  it("keeps the bore a straight tube cut through the wall, too", async () => {
    // Outer 10, bore 6, lying along x through the wall, 5 mm above the ground.
    const tube = (bore: boolean) => ({ ...base, id: "tube", name: "Tube", kind: "tube", elevation: -10, rotationZ: 90, size: 10, width: 10, depth: 10, height: 40, bevel: 2, tubeBoreHole: bore || undefined } as WorkplaneShape);
    const closed = await chamferedVolume(tube(false));
    const open = await chamferedVolume(tube(true));
    expect(open.holes).toBe(1);
    expect(Math.abs(closed.volume - open.volume - Math.PI * 9 * 6)).toBeLessThan(3);
  });
});
