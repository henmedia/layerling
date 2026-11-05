import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
// The exact kernel (Manifold) loads its files relative to the page; in node they are the public folder.
(globalThis as unknown as { window: unknown }).window = { location: { href: pathToFileURL(resolve("apps/web/public") + "/").href } };
import { buildGroupedShapeFromSelection } from "@/lib/editorBooleans";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { meshForShape } from "@/lib/editorMeshCore";
import { createScrewBossGeometry, screwBossCavityMesh, screwBossPlan } from "@/lib/screwBoss";
import { putGeometryOnBase } from "@/lib/importedMeshDisplay";
import type { WorkplaneShape } from "@/types/layerling";

function volume(shape: WorkplaneShape) {
  const positions = shape.importedMesh!.positions;
  let total = 0;
  for (let index = 0; index + 8 < positions.length; index += 9) {
    const [ax, ay, az, bx, by, bz, cx, cy, cz] = positions.slice(index, index + 9);
    total += ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx);
  }
  return Math.abs(total / 6);
}

describe("a screw boss grouped as a hole into a block (#1288)", () => {
  it("cuts the insert's pocket and nothing else: no ring round it, no core left standing", async () => {
    // A block 20 x 20 x 10, and the M3 boss (10 high) as a hole in its middle, its top flush with the block's.
    const block = { id: "block", name: "block", kind: "box", color: "#d41721", x: 0, z: 0, elevation: 0, size: 20, width: 20, depth: 20, height: 10, rotation: 0 } as unknown as WorkplaneShape;
    const boss = { ...makeShapeFromAsset(toolbarShapeAssets.find((asset) => asset.kind === "screwBoss")!, { x: 0, z: 0 }), id: "boss", elevation: 0, hole: true } as WorkplaneShape;
    const result = await buildGroupedShapeFromSelection([block, boss], 250_000);
    expect(result.group).not.toBeNull();
    const pocket = screwBossCavityMesh(boss).mesh.volume();
    // About 81 mm³: the 4 mm hole, 6.7 mm deep with its chamfer. The whole post would take some 500 mm³.
    expect(pocket).toBeGreaterThan(75);
    expect(pocket).toBeLessThan(90);
    expect(volume(result.group!)).toBeCloseTo(4000 - pocket, 0);
  });

  it("opens the pocket at the boss's top, where the post's hole is, not at the bottom of the part", async () => {
    const block = { id: "block", name: "block", kind: "box", color: "#d41721", x: 0, z: 0, elevation: 0, size: 20, width: 20, depth: 20, height: 10, rotation: 0 } as unknown as WorkplaneShape;
    const boss = { ...makeShapeFromAsset(toolbarShapeAssets.find((asset) => asset.kind === "screwBoss")!, { x: 0, z: 0 }), id: "boss", elevation: 0, hole: true } as WorkplaneShape;
    const plan = screwBossPlan(boss);
    expect(plan.through).toBe(false);
    const floor = plan.height - plan.holeDepth;
    // The pocket drawn in the view and handed to the kernel runs from its floor up to the top of the box.
    const drawn = putGeometryOnBase(createScrewBossGeometry(boss));
    expect(drawn.boundingBox!.min.y).toBeCloseTo(floor, 5);
    expect(drawn.boundingBox!.max.y).toBeCloseTo(plan.height, 5);
    const handed = meshForShape(boss);
    expect(Math.min(...handed.vertices.map((vertex) => vertex[1]))).toBeCloseTo(floor, 5);
    expect(Math.max(...handed.vertices.map((vertex) => vertex[1]))).toBeCloseTo(plan.height, 5);
    // Cut from the block, the hole's floor lies 6.7 mm below the top, and the block's underside stays closed.
    const result = await buildGroupedShapeFromSelection([block, boss], 250_000);
    const positions = result.group!.importedMesh!.positions;
    const ys: number[] = [];
    const xs: number[] = [];
    const zs: number[] = [];
    for (let index = 0; index + 2 < positions.length; index += 3) {
      xs.push(positions[index]);
      ys.push(positions[index + 1]);
      zs.push(positions[index + 2]);
    }
    const bottom = Math.min(...ys);
    const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
    const centerZ = (Math.min(...zs) + Math.max(...zs)) / 2;
    const near = (reach: number) => ys.filter((_, index) => Math.hypot(xs[index] - centerX, zs[index] - centerZ) < reach).map((y) => y - bottom);
    const hole = near(plan.holeRadius + 0.01);
    expect(hole.length).toBeGreaterThan(0);
    expect(Math.min(...hole)).toBeCloseTo(floor, 2);
    expect(Math.max(...near(plan.holeRadius + plan.chamfer + 0.01))).toBeCloseTo(plan.height, 2);
  });
});
