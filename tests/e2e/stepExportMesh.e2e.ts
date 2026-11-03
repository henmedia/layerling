import { beforeAll, describe, expect, it, vi } from "vitest";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";
import * as THREE from "three";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * An imported mesh in the STEP export: made exact on the way, as Make exact does, so the file carries its plane and
 * its cylinder; a free-form mesh stays out with a reason of its own.
 */

(globalThis as unknown as { window: unknown }).window = { location: { href: pathToFileURL(resolve("apps/web/public") + "/").href } };

vi.mock("@/lib/brepKernel", async () => {
  const brep = await import("brepjs");
  const { OcctKernel } = await import("occt-wasm");
  const wasm = join(dirname(fileURLToPath(import.meta.resolve("occt-wasm"))), "occt-wasm.wasm");
  let ready: Promise<typeof brep> | null = null;
  let raw: Awaited<ReturnType<typeof OcctKernel.init>> | null = null;
  return {
    occtKernel: () => raw,
    loadBrepWithOcct: () =>
      (ready ??= (async () => {
        const kernel = await OcctKernel.init({ wasm });
        raw = kernel;
        brep.registerKernel("occt-wasm", brep.OcctWasmAdapter.fromKernel(kernel));
        return brep;
      })()),
  };
});

let exportShapesToStep: typeof import("@/lib/stepExport").exportShapesToStep;
let kernel: NonNullable<ReturnType<typeof import("@/lib/brepKernel").occtKernel>>;

beforeAll(async () => {
  ({ exportShapesToStep } = await import("@/lib/stepExport"));
  const { loadBrepWithOcct, occtKernel } = await import("@/lib/brepKernel");
  await loadBrepWithOcct();
  kernel = occtKernel()!;
});

/** A triangle soup, Y up, in the frame an imported mesh keeps: centred across, standing on y = 0. */
function meshShape(id: string, soup: number[]): WorkplaneShape {
  const box = new THREE.Box3().setFromArray(soup);
  const size = box.getSize(new THREE.Vector3());
  const positions = soup.map((value, index) => (index % 3 === 0 ? value - (box.min.x + box.max.x) / 2 : index % 3 === 1 ? value - box.min.y : value - (box.min.z + box.max.z) / 2));
  return {
    id, name: id, kind: "mesh", color: "#3366cc", x: 0, z: 0, elevation: 0, rotation: 0, size: size.x,
    width: size.x, depth: size.z, height: size.y,
    importedMesh: { positions, baseWidth: size.x, baseDepth: size.z, baseHeight: size.y, triangleCount: positions.length / 9, sourceFormat: "stl" },
  } as WorkplaneShape;
}

describe("STEP export of an imported mesh", () => {
  it("writes a meshed plate with a bore as its exact planes and cylinder", async () => {
    const plate = kernel.cut(kernel.makeBox(40, 30, 8), kernel.translate(kernel.makeCylinder(5, 20), 20, 15, -5));
    const mesh = kernel.tessellate(plate, { linearDeflection: 0.02, angularDeflection: 0.15 });
    // Z up to Y up: (x, y, z) -> (x, z, -y), turned, not mirrored, so the triangles keep facing out.
    const soup: number[] = [];
    for (const index of mesh.indices) soup.push(mesh.positions[index * 3], mesh.positions[index * 3 + 2], -mesh.positions[index * 3 + 1]);
    const { blob, exportedCount, skipped } = await exportShapesToStep([meshShape("Plate", soup)]);
    expect(skipped).toEqual([]);
    expect(exportedCount).toBe(1);
    const text = await blob.text();
    expect(text).toContain("CYLINDRICAL_SURFACE");
    expect((text.match(/ADVANCED_FACE/g) ?? []).length).toBe(7);
  });

  it("leaves a free-form mesh out and says it is free-form", async () => {
    const knot = new THREE.TorusKnotGeometry(10, 3, 96, 12).toNonIndexed();
    const plate = kernel.makeBox(10, 10, 10);
    const mesh = kernel.tessellate(plate, { linearDeflection: 0.05, angularDeflection: 0.3 });
    const cube: number[] = [];
    for (const index of mesh.indices) cube.push(mesh.positions[index * 3], mesh.positions[index * 3 + 2], -mesh.positions[index * 3 + 1]);
    const { exportedCount, skipped } = await exportShapesToStep([
      meshShape("Knot", Array.from(knot.getAttribute("position").array as ArrayLike<number>)),
      { ...meshShape("Cube", cube), x: 40 },
    ]);
    expect(exportedCount).toBe(1);
    expect(skipped).toHaveLength(1);
    expect(skipped[0]).toMatchObject({ name: "Knot", code: "freeform" });
  });
});
