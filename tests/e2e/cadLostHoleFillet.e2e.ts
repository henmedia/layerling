import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { OcctKernel } from "occt-wasm";
import type { CadModifierWorkerRequest, CadModifierWorkerResponse } from "@/lib/cadModifierTypes";
import { TREATMENT_LOST_FACES_MESSAGE } from "@/lib/cadLostFaces";

/*
 * Issue #1503: five holes in a block, their top rims rounded one after another. The holes came out of a mesh boolean, so
 * each circle is a polygon of flat strips, and on one of them the kernel handed back a "valid" solid with the whole hole
 * filled in. The edge tool showed "Filleted 96 edges" and the hole was gone. Here the same kind of body: a block with five
 * 128-sided holes, their rims rounded by 0.5 mm through the edge tool's worker. Every rim either keeps its hole or is
 * refused; none may come back with a hole filled in.
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

const SIDES = 128;
const TURN = 0.033;
const HOLE_RADIUS = 9;
const holeX = (hole: number) => 12 + hole * 22;

describe("rounding the rims of faceted holes (#1503)", () => {
  it("never hands back a body with a hole filled in", async () => {
    vi.stubGlobal("WebAssembly", WebAssembly);
    await import("@/workers/cadModifier.worker");
    const cad = await OcctKernel.init({ wasm: join(occtDir, "occt-wasm.wasm") });

    // A block 115 x 60 x 50 with five holes from 6 mm up through its top, each a 128-sided polygon.
    let block = cad.makeBox(115, 60, 50);
    for (let hole = 0; hole < 5; hole += 1) {
      const points = Array.from({ length: SIDES }, (_, index) => {
        const angle = TURN + (index / SIDES) * Math.PI * 2;
        return { x: holeX(hole) + HOLE_RADIUS * Math.cos(angle), y: 6, z: 25 + HOLE_RADIUS * Math.sin(angle) };
      });
      const outline = cad.makeWire(points.map((point, index) => cad.makeLineEdge(point, points[(index + 1) % SIDES])));
      block = cad.cut(block, cad.extrude(cad.makeFace(outline), 0, 60, 0));
    }
    let brep = cad.toBREP(cad.getSubShapes(block, "solid")[0]);
    const holeVolume = Math.PI * HOLE_RADIUS * HOLE_RADIUS * 54;

    const outcomes: string[] = [];
    for (let hole = 0; hole < 5; hole += 1) {
      const before = cad.getVolume(cad.fromBREP(brep));
      const ready = await ask({ type: "prepare", parts: [{ brep }], sharpAngle: 25 });
      if (ready.type !== "ready") throw new Error(`not ready: ${JSON.stringify(ready).slice(0, 200)}`);
      // The rim: the edges round this hole on the top face.
      const rim = ready.edges.filter((edge) => {
        const ys: number[] = [];
        const xs: number[] = [];
        for (let index = 0; index + 2 < edge.points.length; index += 3) {
          xs.push(edge.points[index]);
          ys.push(edge.points[index + 1]);
        }
        return ys.length > 0 && ys.every((y) => Math.abs(y - 60) < 1e-4) && xs.every((x) => Math.abs(x - holeX(hole)) <= HOLE_RADIUS + 0.01);
      });
      expect(rim).toHaveLength(SIDES);
      const preview = await ask({ type: "preview", kind: "fillet", edgeIds: rim.map((edge) => edge.id), amount: 0.5, quality: "draft", chamferAngle: 45 });
      if (preview.type === "error") {
        expect(preview.message).toContain(TREATMENT_LOST_FACES_MESSAGE);
        outcomes.push("refused");
        continue;
      }
      if (preview.type !== "preview") throw new Error("no preview");
      // A kept hole: the rim's fillet moves a few cubic millimetres. A filled one adds the hole's whole volume.
      const after = cad.getVolume(cad.fromBREP(preview.brep));
      expect(Math.abs(after - before)).toBeLessThan(holeVolume / 10);
      outcomes.push("kept");
      brep = preview.brep;
    }
    // Without the check one of the five came back filled; it has to be refused now, the others go through.
    expect(outcomes).toContain("refused");
    expect(outcomes.filter((outcome) => outcome === "kept").length).toBeGreaterThan(0);
  }, 300_000);
});
