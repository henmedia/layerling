import { beforeAll, describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { OcctKernel, type ShapeHandle } from "occt-wasm";
import { shellSolid } from "@/lib/cadShell";
import { shellStackSolid } from "@/lib/cadShellStack";

const R = [1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0];

describe("stacking a box with rounded edges", () => {
  let k: OcctKernel;
  beforeAll(async () => {
    k = await OcctKernel.init({ wasm: join(dirname(fileURLToPath(import.meta.resolve("occt-wasm"))), "occt-wasm.wasm") });
  });
  const block = () => k.translate(k.transform(k.makeBox(100, 80, 40), R), -50, 0, 40);
  const edges = (s: ShapeHandle, pick: (b: { ymin: number; ymax: number }) => boolean) => k.getSubShapes(s, "edge").filter((e) => pick(k.getBoundingBox(e)));
  const corners = (s: ShapeHandle) => k.fillet(s, edges(s, (b) => b.ymax - b.ymin > 30), 8);

  it.each([
    ["rounded corners", (s: ShapeHandle) => corners(s), 2],
    ["rounded corners and a rounded bottom edge", (s: ShapeHandle) => { const a = corners(s); return k.fillet(a, edges(a, (b) => b.ymax < 0.01), 2); }, 2],
    ["rounded corners and a rounded top edge", (s: ShapeHandle) => { const a = corners(s); return k.fillet(a, edges(a, (b) => b.ymin > 39.99), 2); }, 1.5],
  ] as const)("stacks a box with %s, one box in the next without the two meeting", (name, make, wall) => {
    const original = make(block());
    const stacked = shellStackSolid(k, shellSolid(k, original, wall, "top"), 3, wall, original);
    expect(kernelSolids(stacked)).toBe(1);
    expect(k.getVolume(k.common(stacked, k.translate(stacked, 0, 37, 0)))).toBeLessThan(1e-6);
    if (process.env.STACK_PICTURES) {
      const m = k.tessellate(stacked, { linearDeflection: 0.05, angularDeflection: 0.2 });
      writeFileSync(`${process.env.STACK_PICTURES}/rounded-${name.length}.json`, JSON.stringify({ v: Array.from(m.positions), i: Array.from(m.indices) }));
    }
  });

  function kernelSolids(shape: ShapeHandle) {
    return k.getSubShapes(shape, "solid").length;
  }
});
