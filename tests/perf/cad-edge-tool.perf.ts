import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it, vi } from "vitest";
import type { CadModifierMeshPart, CadModifierWorkerRequest, CadModifierWorkerResponse } from "@/lib/cadModifierTypes";

/*
 * The edge tool's worker (prepare, then a preview) against the real OCCT kernel, timed. The worker
 * loads its kernel from a URL; here that URL is the package's own folder, and the wasm file is
 * handed over as a path, as the e2e tests do it.
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

/** A sphere of flat triangles: every triangle a face of its own, so the edge tool has thousands of edges. */
function sphereMesh(radius: number, segments: number, rings: number): CadModifierMeshPart {
  const positions: number[] = [];
  const indices: number[] = [];
  for (let ring = 0; ring <= rings; ring += 1) {
    const theta = (ring / rings) * Math.PI;
    for (let segment = 0; segment < segments; segment += 1) {
      const phi = (segment / segments) * Math.PI * 2;
      positions.push(radius * Math.sin(theta) * Math.cos(phi), radius * Math.cos(theta), radius * Math.sin(theta) * Math.sin(phi));
    }
  }
  const at = (ring: number, segment: number) => ring * segments + (segment % segments);
  for (let ring = 0; ring < rings; ring += 1) {
    for (let segment = 0; segment < segments; segment += 1) {
      const a = at(ring, segment);
      const b = at(ring + 1, segment);
      const c = at(ring + 1, segment + 1);
      const d = at(ring, segment + 1);
      if (ring > 0) indices.push(a, d, b);
      if (ring < rings - 1) indices.push(b, d, c);
    }
  }
  return { positions: new Float32Array(positions), indices: new Uint32Array(indices), hole: false };
}

/** The upper half of that sphere on a flat floor: the rim is sharp, the dome thousands of faces. */
function domeMesh(radius: number, segments: number, rings: number): CadModifierMeshPart {
  const positions: number[] = [];
  const indices: number[] = [];
  for (let ring = 0; ring <= rings; ring += 1) {
    const theta = (ring / rings) * (Math.PI / 2);
    for (let segment = 0; segment < segments; segment += 1) {
      const phi = (segment / segments) * Math.PI * 2;
      positions.push(radius * Math.sin(theta) * Math.cos(phi), radius * Math.cos(theta), radius * Math.sin(theta) * Math.sin(phi));
    }
  }
  const at = (ring: number, segment: number) => ring * segments + (segment % segments);
  for (let ring = 0; ring < rings; ring += 1) {
    for (let segment = 0; segment < segments; segment += 1) {
      const a = at(ring, segment);
      const b = at(ring + 1, segment);
      const c = at(ring + 1, segment + 1);
      const d = at(ring, segment + 1);
      if (ring > 0) indices.push(a, d, b);
      indices.push(b, d, c);
    }
  }
  const centre = positions.length / 3;
  positions.push(0, 0, 0);
  for (let segment = 0; segment < segments; segment += 1) indices.push(centre, at(rings, segment + 1), at(rings, segment));
  return { positions: new Float32Array(positions), indices: new Uint32Array(indices), hole: false };
}

/** A 64-sided prism of flat triangles with a band of rows, its rim edges sharp. */
function prismMesh(radius: number, height: number, sides: number, rows: number): CadModifierMeshPart {
  const positions: number[] = [];
  const indices: number[] = [];
  for (let row = 0; row <= rows; row += 1) {
    for (let side = 0; side < sides; side += 1) {
      const angle = (side / sides) * Math.PI * 2;
      positions.push(radius * Math.cos(angle), (row / rows) * height, radius * Math.sin(angle));
    }
  }
  const at = (row: number, side: number) => row * sides + (side % sides);
  for (let row = 0; row < rows; row += 1) {
    for (let side = 0; side < sides; side += 1) {
      indices.push(at(row, side), at(row + 1, side), at(row + 1, side + 1), at(row, side), at(row + 1, side + 1), at(row, side + 1));
    }
  }
  const bottom = positions.length / 3;
  positions.push(0, 0, 0);
  const top = bottom + 1;
  positions.push(0, height, 0);
  for (let side = 0; side < sides; side += 1) {
    indices.push(bottom, at(0, side), at(0, side + 1));
    indices.push(top, at(rows, side + 1), at(rows, side));
  }
  return { positions: new Float32Array(positions), indices: new Uint32Array(indices), hole: false };
}

async function timed<T>(run: () => Promise<T>) {
  const started = performance.now();
  const value = await run();
  return { value, ms: performance.now() - started };
}

describe("edge tool worker", () => {
  it("prepares and previews against the real kernel", async () => {
    vi.stubGlobal("WebAssembly", WebAssembly);
    await import("@/workers/cadModifier.worker");
    const rows: Array<{ workload: string; step: string; ms: number; detail: string }> = [];
    const workloads: Array<{ name: string; part: CadModifierMeshPart; amount: number; kind: "fillet" | "chamfer" }> = [
      { name: "box primitive", part: { primitive: { kind: "box", width: 40, depth: 30, height: 20 }, hole: false }, amount: 3, kind: "fillet" },
      { name: "prism mesh 64", part: prismMesh(20, 30, 64, 6), amount: 2, kind: "chamfer" },
      { name: "sphere mesh 48x24", part: sphereMesh(20, 48, 24), amount: 0, kind: "fillet" },
      { name: "dome mesh 48x12", part: domeMesh(20, 48, 12), amount: 1, kind: "chamfer" },
    ];
    for (const workload of workloads) {
      const prepare = await timed(() => ask({ type: "prepare", parts: [workload.part], sharpAngle: 30 }));
      const ready = prepare.value;
      if (ready.type !== "ready") throw new Error("not ready");
      rows.push({ workload: workload.name, step: "prepare", ms: prepare.ms, detail: `${ready.edges.length} edges, ${ready.selectableEdgeIds.length} sharp` });
      if (workload.amount > 0 && ready.selectableEdgeIds.length) {
        for (let run = 0; run < 3; run += 1) {
          const preview = await timed(() => ask({ type: "preview", kind: workload.kind, edgeIds: ready.selectableEdgeIds, amount: workload.amount + run * 0.25, quality: "standard", chamferAngle: 45 }));
          const reply = preview.value;
          if (reply.type !== "preview") throw new Error("no preview");
          rows.push({ workload: workload.name, step: `preview ${run + 1}`, ms: preview.ms, detail: `${reply.triangleCount} triangles, ${reply.displayEdges.length} display edges, ${reply.components?.length ?? 0} components` });
        }
      }
    }
    console.table(rows.map((row) => ({ ...row, ms: Math.round(row.ms) })));
    expect(rows.length).toBeGreaterThan(0);
  });
});
