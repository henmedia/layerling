import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { OcctKernel, type ShapeHandle } from "occt-wasm";
import type { CadModifierWorkerRequest, CadModifierWorkerResponse } from "@/lib/cadModifierTypes";

/*
 * Issue #1929: a bar 10 x 60 x 25 whose two top end edges are rounded by 5 mm, with a shallow groove along one side cut by
 * a cylinder. The groove's upper edge lies 0.13 mm below where the rounding starts. Its arc on an end face was refused at
 * every size with "the CAD kernel would lose part of the body": the chamfer reaches over the 0.13 mm to the rounding and
 * trims it, and the check on lost faces (#1503) counted the rounding as lost, since it shares no corner with the arc.
 * A face within the treatment's reach is the treatment's to reshape.
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

describe("a chamfer next to a rounding (#1929)", () => {
  it("chamfers the groove's arc that ends just below a 5 mm rounding", async () => {
    vi.stubGlobal("WebAssembly", WebAssembly);
    await import("@/workers/cadModifier.worker");
    const cad = await OcctKernel.init({ wasm: join(occtDir, "occt-wasm.wasm") });

    // The bar, its two top edges along x (at y = 0 and y = 60, z = 25) rounded by 5 mm.
    const box = cad.makeBox(10, 60, 25);
    const topEnds = cad.getSubShapes(box, "edge").filter((edge: ShapeHandle) => {
      const bounds = cad.getBoundingBox(edge);
      return bounds.xmax - bounds.xmin > 5 && bounds.zmin > 24.9 && (bounds.ymax < 0.1 || bounds.ymin > 59.9);
    });
    expect(topEnds).toHaveLength(2);
    const rounded = cad.fillet(box, topEnds, 5);
    // A cylinder of radius 8 along y, its axis 7 mm outside the side x = 10 at z = 16: a groove 1 mm deep from
    // z = 12.13 to z = 19.87 on that side, 0.13 mm below the rounding, which starts at z = 20.
    const cylinder = cad.translate(cad.rotate(cad.makeCylinder(8, 80), { point: { x: 0, y: 0, z: 0 }, direction: { x: 1, y: 0, z: 0 } }, -Math.PI / 2), 17, -10, 16);
    const bar = cad.cut(rounded, cylinder);
    const brep = cad.toBREP(cad.getSubShapes(bar, "solid")[0]);
    const before = cad.getVolume(cad.fromBREP(brep));

    const ready = await ask({ type: "prepare", parts: [{ brep }], sharpAngle: 25 });
    if (ready.type !== "ready") throw new Error(`not ready: ${JSON.stringify(ready).slice(0, 200)}`);
    // The groove's arc on the end face y = 60: x between 9 and 10, z between 12.1 and 19.9.
    const arc = ready.edges.find((edge) => {
      if (edge.points.length < 9) return false;
      for (let index = 0; index + 2 < edge.points.length; index += 3) {
        const [x, y, z] = [edge.points[index], edge.points[index + 1], edge.points[index + 2]];
        if (Math.abs(y - 60) > 1e-4 || x < 8.9 || x > 10.0001 || z < 12.1 || z > 19.9) return false;
      }
      return true;
    });
    if (!arc) throw new Error("no arc of the groove on the end face");

    for (const amount of [0.5, 1.3]) {
      const preview = await ask({ type: "preview", kind: "chamfer", edgeIds: [arc.id], amount, quality: "draft", chamferAngle: 45 });
      if (preview.type === "error") throw new Error(`${amount} mm refused: ${preview.message}`);
      if (preview.type !== "preview") throw new Error("no preview");
      // About 8 mm of arc loses a chamfer of amount² / 2 in cross section; the ends take a little more or less.
      const removed = before - cad.getVolume(cad.fromBREP(preview.brep));
      expect(removed).toBeGreaterThan(0.5 * 8 * (amount * amount) / 2);
      expect(removed).toBeLessThan(3 * 8 * (amount * amount) / 2);
    }

    // "Find the largest size that fits" found none before; now it finds one at least as large as the reporter's.
    const largest = await ask({ type: "largest", kind: "chamfer", edgeIds: [arc.id], amount: 5, chamferAngle: 45 });
    if (largest.type !== "largest" || largest.amount === null) throw new Error(`no largest size: ${JSON.stringify(largest).slice(0, 200)}`);
    expect(largest.amount).toBeGreaterThanOrEqual(1.3);
  }, 300_000);
});
