import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { OcctKernel, type ShapeHandle } from "occt-wasm";
import type { CadModifierWorkerRequest, CadModifierWorkerResponse } from "@/lib/cadModifierTypes";

/*
 * Issue #1591: a tray with rounded corners, one straight edge of its top rim picked for a 0.5 mm chamfer. The kernel
 * takes the whole rim with it, since the corner arcs run on from the straight edges smoothly, and the check on lost faces
 * (#1503) counted the walls along the rest of the rim as lost: "At this size the CAD kernel would lose part of the body".
 * Exported as STL and imported again it went through, the arcs being facets there. One edge of a smooth chain has to go
 * through like the whole chain does.
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

/** A box with its four upright edges rounded. */
function roundedBox(cad: OcctKernel, width: number, depth: number, height: number, radius: number) {
  const box = cad.makeBox(width, depth, height);
  const upright = cad.getSubShapes(box, "edge").filter((edge: ShapeHandle) => {
    const bounds = cad.getBoundingBox(edge);
    return bounds.zmax - bounds.zmin > height / 2 && bounds.xmax - bounds.xmin < 1e-3 && bounds.ymax - bounds.ymin < 1e-3;
  });
  expect(upright).toHaveLength(4);
  return cad.fillet(box, upright, radius);
}

describe("one edge of a smooth chain (#1591)", () => {
  it("chamfers the whole rim of a tray with rounded corners from one straight edge", async () => {
    vi.stubGlobal("WebAssembly", WebAssembly);
    await import("@/workers/cadModifier.worker");
    const cad = await OcctKernel.init({ wasm: join(occtDir, "occt-wasm.wasm") });

    // A tray 100 x 60 x 15 with 3 mm walls, a 2 mm floor and rounded corners outside and in.
    const tray = cad.cut(roundedBox(cad, 100, 60, 15, 6), cad.translate(roundedBox(cad, 94, 54, 20, 3), 3, 3, 2));
    const brep = cad.toBREP(cad.getSubShapes(tray, "solid")[0]);
    const before = cad.getVolume(cad.fromBREP(brep));

    const ready = await ask({ type: "prepare", parts: [{ brep }], sharpAngle: 25 });
    if (ready.type !== "ready") throw new Error(`not ready: ${JSON.stringify(ready).slice(0, 200)}`);
    // The straight edge of the inner rim along the front: y = 3, z = 15, from x = 6 to x = 94.
    const rimEdge = ready.edges.find((edge) => {
      const xs: number[] = [];
      for (let index = 0; index + 2 < edge.points.length; index += 3) {
        if (Math.abs(edge.points[index + 1] - 3) > 1e-4 || Math.abs(edge.points[index + 2] - 15) > 1e-4) return false;
        xs.push(edge.points[index]);
      }
      return xs.length > 0 && Math.max(...xs) - Math.min(...xs) > 80;
    });
    if (!rimEdge) throw new Error("no straight inner rim edge");

    const preview = await ask({ type: "preview", kind: "chamfer", edgeIds: [rimEdge.id], amount: 0.5, quality: "draft", chamferAngle: 45 });
    if (preview.type === "error") throw new Error(`refused: ${preview.message}`);
    if (preview.type !== "preview") throw new Error("no preview");
    // The whole inner rim, about 280 mm, loses a 0.5 mm chamfer: 0.125 mm² of cross section, some 35 mm³.
    const removed = before - cad.getVolume(cad.fromBREP(preview.brep));
    expect(removed).toBeGreaterThan(25);
    expect(removed).toBeLessThan(45);
  }, 300_000);
});
