import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { groupedShape, multicolorExportSolids, visibleExportShapes } from "@/lib/editorBooleans";
import { meshForShape } from "@/lib/editorMeshCore";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * Discussion #1648: a revolved vase with a texture is a bundle of the body and the pattern. Twisted as a whole, it
 * showed twisted grooves, but STL and 3MF took the bundle apart into its parts, which cannot carry the bundle's twist,
 * and the grooves came out straight.
 */

function part(id: string, extra: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return {
    id, name: id, kind: "box", color: "#ff0000", x: 0, z: 0, elevation: 0, size: 10, width: 10, depth: 10, height: 20, rotation: 0,
    ...extra,
  } as unknown as WorkplaneShape;
}

function bundle(parts: WorkplaneShape[], extra: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return { ...groupedShape(parts)!, id: "bundle", name: "bundle", groupOperation: "bundle", ...extra } as WorkplaneShape;
}

function box(vertices: readonly [number, number, number][]) {
  return new THREE.Box3().setFromPoints(vertices.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
}

// A block in the middle and a thin bar beside it, from half way up to the top, like the pattern on a vase.
const block = part("block");
const bar = part("bar", { x: 20, width: 2, depth: 2, size: 2, height: 10, elevation: 10, color: "#000000" });

describe("a twisted bundle exports twisted (#1648)", () => {
  it("goes out whole when twisted, and in its parts when not", () => {
    expect(visibleExportShapes([bundle([block, bar])]).visible).toHaveLength(2);
    const twisted = bundle([block, bar], { extrudeTwist: 90 });
    const { visible } = visibleExportShapes([twisted]);
    expect(visible).toHaveLength(1);
    expect(visible[0].extrudeTwist).toBe(90);
  });

  it("turns the bar round the bundle's middle in the exported mesh", () => {
    const twisted = bundle([block, bar], { extrudeTwist: 90 });
    const bounds = box(meshForShape(twisted).vertices);
    // Straight, nothing reaches further than the block's 5 mm in z; a quarter turn at the top swings the bar round.
    expect(Math.max(-bounds.min.z, bounds.max.z)).toBeGreaterThan(9);
  });

  it("is still taken apart when a hole is in it, so the hole is not exported solid", () => {
    const hole = part("hole", { width: 4, depth: 4, size: 4, height: 30, hole: true });
    expect(visibleExportShapes([bundle([block, bar, hole], { extrudeTwist: 90 })]).visible.length).toBeGreaterThan(1);
  });

  it("colours the parts where the twisted mesh has them (3MF)", () => {
    const twisted = bundle([block, bar], { extrudeTwist: 90 });
    const solids = multicolorExportSolids(twisted);
    expect(solids).toHaveLength(2);
    const exported = box(meshForShape(twisted).vertices);
    const probes = new THREE.Box3();
    solids!.forEach(({ box: partBox }) => probes.union(partBox));
    // Each part turned over the bundle's height, the parts fill the same box as the whole; turned over its own, the bar
    // stayed beside the block and the colours missed the twisted faces.
    expect(probes.min.distanceTo(exported.min)).toBeLessThan(0.01);
    expect(probes.max.distanceTo(exported.max)).toBeLessThan(0.01);
  });
});
