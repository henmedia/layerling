import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import type { CadModifierMeshPart, CadModifierWorkerRequest, CadModifierWorkerResponse } from "@/lib/cadModifierTypes";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * The cone hinge through the edge tool's worker (#1007), with its parts as the editor sends them: each knuckle of B
 * in a scope of its own, so its recesses cut only that knuckle and not the cone of the neighbour that sits in each.
 * Its body against the display mesh, alone and inside a group that mixes a solid and a hole. The worker loads its
 * kernel from a URL; here that URL is the package's own folder, as in tests/perf/cad-edge-tool.perf.ts.
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

describe("the cone hinge in the edge tool's worker (#1007)", () => {
  it("cuts each recess out of its own knuckle only, alone and inside a group, to the display mesh's volume", async () => {
    vi.stubGlobal("WebAssembly", WebAssembly);
    await import("@/workers/cadModifier.worker");
    const { hingePartScope, hingeWorldParts } = await import("@/lib/hingeParts");
    const { hingePlan, hingeTriangles } = await import("@/lib/hingeGeometry");
    const { groupedShape, restoreGroupedChildrenForEdges } = await import("@/lib/editorBooleans");
    const { cadModifierPrimitiveForAnalyticShape, cadModifierPrimitiveForBakedShape } = await import("@/lib/cadBakeMetadata");
    const { cadModifierProfileForShape } = await import("@/lib/cadProfileExtrusion");

    // The parts as the editor's prepare sends them (cadModifierSourceParts and the two call sites in LayerlingEditor.tsx).
    const parts = (top: WorkplaneShape): CadModifierMeshPart[] => (top.groupedShapes?.length ? restoreGroupedChildrenForEdges(top) : [{ shape: top, scope: [] }])
      .flatMap(({ shape, scope }) => (shape.kind === "hinge" ? hingeWorldParts(shape) : [shape]).map((part) => ({ part, scope: hingePartScope(scope, part) })))
      .map(({ part, scope }) => {
        // A box, cylinder or cone is a primitive; a countersink goes as its outline.
        const primitive = cadModifierPrimitiveForBakedShape(part) ?? cadModifierPrimitiveForAnalyticShape(part);
        const profile = primitive ? undefined : cadModifierProfileForShape(part);
        if (!primitive && !profile) throw new Error(`no exact part for ${part.kind}`);
        return { ...(primitive ? { primitive } : { profile }), hole: Boolean(part.hole), ...(scope.length ? { scope } : {}) } as CadModifierMeshPart;
      });

    const cases = [
      { width: 40, depth: 40, height: 8 },
      { width: 40, depth: 40, height: 8, hingeAngle: 90, hingeScrewHoles: 2, hingeCornerRadius: 3 },
      { width: 40, depth: 40, height: 6, hingeLeafThickness: 6, hingeLeafStyle: "fingers" as const, hingeAngle: 135 },
      { width: 60, depth: 50, height: 10, hingeKnuckles: 7, hingeClearance: 0.3, hingeConeSize: 3, mirrorY: true },
      { width: 50, depth: 44, height: 8, hingeLeafStyle: "fingers" as const, hingeCornerRadius: 2, hingeAngle: 45, mirrorZ: true },
      { width: 50, depth: 44, height: 8, hingeScrewHoles: 3, hingeScrewCountersink: false, hingeAngle: 45, mirrorZ: true },
    ];
    for (const fields of cases) {
      const drawn = { ...fields, hingeStyle: "cone", sides: 384 };
      const hinge = { id: "h", name: "Hinge", kind: "hinge", color: "#fff", size: fields.width, rotation: 30, x: 12, z: -7, elevation: 3, ...drawn } as WorkplaneShape;
      const triangles = hingeTriangles(drawn).flat(2);
      const display = meshVolume(triangles, Array.from({ length: triangles.length / 3 }, (_, index) => index));
      // Cut at the hinge's own level, the recesses would take most of every cone with them.
      const plan = hingePlan(drawn);
      const cones = (plan.knuckles - 1) * (Math.PI * plan.coneRadius ** 3) / 3;
      // Grouped with a hole far from it, then with a box: the hole cuts only its own group, so that group has a scope
      // of its own, [0], and the hinge's knuckles go in [0, -1 - k].
      const box = { id: "b", name: "Box", kind: "box", color: "#fff", x: -150, z: 0, elevation: 0, size: 10, rotation: 0, width: 10, depth: 10, height: 10 } as WorkplaneShape;
      const hole = { ...box, id: "c", name: "Hole", kind: "cylinder", x: 150, height: 30, hole: true } as WorkplaneShape;
      const group = groupedShape([groupedShape([hinge, hole])!, box])!;
      expect(new Set(parts(group).map((part) => JSON.stringify(part.scope ?? [])))).toEqual(new Set(["[]", "[0]", ...Array.from({ length: (plan.knuckles - 1) / 2 }, (_, k) => `[0,${-2 - 2 * k}]`)]));
      // The hinge's axis, through the middles of its cones; a countersink's cone face is off it.
      const [first, ...rest] = hingeWorldParts(hinge).filter((part) => part.kind === "cone").map((part) => new THREE.Vector3(part.x, (part.elevation ?? 0) + part.height / 2, part.z));
      const along = rest.reduce((far, point) => (point.distanceTo(first) > far.distanceTo(first) ? point : far)).clone().sub(first).normalize();
      const offAxis = ({ x, y, z }: { x: number; y: number; z: number }) => new THREE.Vector3(x, y, z).sub(first).cross(along).length();
      for (const [top, extra] of [[hinge, 0], [group, 1000]] as const) {
        const ready = await ask({ type: "prepare", parts: parts(top), sharpAngle: 25, faces: true, faceMesh: true });
        if (ready.type !== "ready" || !ready.faces?.mesh) throw new Error("no faces");
        const label = JSON.stringify({ ...fields, top: top.kind });
        // The volume of the faces' own mesh: a little off the true circles, less than half of what the cones are worth.
        expect(Math.abs(meshVolume(ready.faces.mesh.positions, ready.faces.mesh.indices) - display - extra), label).toBeLessThan(cones / 2);
        // Each cone and each recess keeps a cone face of its own, as large as at 45 degrees from the end face: a recess cut
        // out of the neighbour's cone too leaves a sliver of that cone's face, and a cone pointing back into its own knuckle
        // takes its face away.
        const areas = ready.faces.list.filter((face) => face.kind === "cone" && offAxis(face.center) < 1e-3).map((face) => face.area).sort((p, q) => p - q);
        const expected = [plan.coneRadius, plan.recessRadius].flatMap((r) => Array<number>(plan.knuckles - 1).fill(Math.PI * r * r * Math.SQRT2)).sort((p, q) => p - q);
        expect(areas.length, label).toBe(expected.length);
        areas.forEach((area, index) => expect(area, label).toBeCloseTo(expected[index], 3));
      }
    }
  });
});
