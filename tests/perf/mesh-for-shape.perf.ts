import { describe, expect, it } from "vitest";
import type { WorkplaneShape } from "@/types/layerling";
import { clearUnplacedMeshCache, meshForShape } from "@/lib/editorMeshCore";

const WORKLOADS: Array<{ label: string; shape: Partial<WorkplaneShape> }> = [
  { label: "spring", shape: { kind: "spring", width: 20, depth: 20, size: 20, height: 30 } },
  { label: "helical gear", shape: { kind: "gear", teeth: 24, width: 40, depth: 40, size: 40, height: 10, gearType: "helical" } as Partial<WorkplaneShape> },
  { label: "thread", shape: { kind: "thread", width: 12, depth: 12, size: 12, height: 30 } },
];

function shape(overrides: Partial<WorkplaneShape>, step: number): WorkplaneShape {
  return { id: "p", name: "Perf", color: "#ffffff", kind: "box", x: step * 3, z: -step, size: 10, width: 10, depth: 10, height: 10, rotation: step * 15, ...overrides } as WorkplaneShape;
}

function averageMs(run: (step: number) => void, runs: number) {
  const start = performance.now();
  for (let step = 0; step < runs; step += 1) run(step);
  return (performance.now() - start) / runs;
}

describe("meshForShape for a shape that is only moved and turned", () => {
  it("prints built and kept times", () => {
    const rows = WORKLOADS.map(({ label, shape: overrides }) => {
      meshForShape(shape(overrides, 0));
      const builtMs = averageMs((step) => {
        clearUnplacedMeshCache();
        meshForShape(shape(overrides, step));
      }, 3);
      meshForShape(shape(overrides, 0));
      const keptMs = averageMs((step) => meshForShape(shape(overrides, step + 1)), 10);
      return { workload: label, triangles: meshForShape(shape(overrides, 0)).faces.length, builtMs: Number(builtMs.toFixed(1)), keptMs: Number(keptMs.toFixed(1)) };
    });
    process.stdout.write(`${JSON.stringify(rows)}\n`);
    rows.forEach((row) => expect(row.keptMs).toBeLessThan(row.builtMs));
  });
});
