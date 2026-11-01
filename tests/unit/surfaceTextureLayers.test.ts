import { describe, expect, it } from "vitest";
import { normalizeSurfaceTexture } from "@/lib/surfaceTexture";
import { surfaceTextureInput, surfaceTextureLayersToMake, textureSurfaceLayerPositions, textureSurfacePositions } from "@/lib/surfaceTextureShape";
import { canonicalizeShape } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

const box = canonicalizeShape({ id: "b", name: "Box", kind: "box", color: "#d41721", x: 0, z: 0, elevation: 0, size: 40, width: 40, depth: 40, height: 40, rotation: 0 } as WorkplaneShape);

/**
 * The points of a mesh (nine numbers a triangle) near a plane: coordinate `axis` about `at`, within `within` mm, and away
 * from the box's other faces (the other two coordinates more than a millimetre inside the 40 mm box).
 */
function near(positions: Float64Array, axis: 0 | 1 | 2, at: number, within: number) {
  const out: number[][] = [];
  const middle = [0, 20, 0];
  for (let i = 0; i < positions.length; i += 3) {
    const point = [positions[i], positions[i + 1], positions[i + 2]];
    const inside = [0, 1, 2].every((k) => k === axis || Math.abs(point[k] - middle[k]) < 19);
    if (inside && Math.abs(point[axis] - at) <= within) out.push(point);
  }
  return out;
}

// Each builds a textured box: under a second of work alone, but past the 5 s limit beside the release build.
const TEXTURE_TIMEOUT = 30_000;

describe("surface texture layers", () => {
  it("lets a first layer without faces of its own leave out the faces the others take, and drops a later one without faces", () => {
    const first = normalizeSurfaceTexture({ pattern: "bricks" });
    const top = normalizeSurfaceTexture({ pattern: "knurl", faces: ["top"] });
    const everywhere = normalizeSurfaceTexture({ pattern: "grooves" });
    const layers = surfaceTextureLayersToMake(first, [top, everywhere]);
    expect(layers.map((layer) => layer.pattern)).toEqual(["bricks", "knurl"]);
    expect(layers[0].exceptFaces).toEqual(top.faces);
    // A first layer with faces of its own keeps them and leaves nothing out.
    const picked = surfaceTextureLayersToMake(normalizeSurfaceTexture({ pattern: "bricks", faces: ["front"] }), [top]);
    expect(picked[0].exceptFaces).toEqual([]);
    expect(picked[0].faces).toHaveLength(1);
  });

  it("keeps a face another layer takes smooth", () => {
    const base = surfaceTextureInput(box);
    const plain = textureSurfacePositions(base, normalizeSurfaceTexture({ pattern: "bricks" }));
    const without = textureSurfacePositions(base, normalizeSurfaceTexture({ pattern: "bricks", exceptFaces: ["front"] }));
    // The front (z = 20) gets its joints without the exception and none with it; the back (z = -20) gets them both times.
    const front = (positions: Float64Array) => near(positions, 2, 19.7, 0.29).length;
    const back = (positions: Float64Array) => near(positions, 2, -19.7, 0.29).length;
    expect(front(plain.positions)).toBeGreaterThan(0);
    expect(front(without.positions)).toBe(0);
    expect(back(without.positions)).toBeGreaterThan(0);
  }, TEXTURE_TIMEOUT);

  it("makes the layers one after the other: bricks round the sides, knurling on the top", () => {
    const layers = surfaceTextureLayersToMake(normalizeSurfaceTexture({ pattern: "bricks" }), [normalizeSurfaceTexture({ pattern: "knurl", faces: ["top"] })]);
    const [sides, top] = textureSurfaceLayerPositions(surfaceTextureInput(box), layers);
    // After the bricks the top is still flat: the default keeps it smooth and the knurling takes it anyway.
    expect(near(sides.positions, 1, 39.6, 0.35).length).toBe(0);
    // The knurling sinks into the top, and the joints of the bricks are still in the sides.
    expect(near(top.positions, 1, 39.6, 0.35).length).toBeGreaterThan(0);
    expect(near(top.positions, 0, 19.6, 0.35).length).toBeGreaterThan(0);
    expect(top.stats.triangles).toBeGreaterThan(sides.stats.triangles);
  }, TEXTURE_TIMEOUT);
});

describe("a body with layers", () => {
  it("keeps its further layers with the texture, and leaves out one without a place", async () => {
    const { surfaceTexturedShape, mergedSurfaceTextureStats, mergedSurfaceTextureFill } = await import("@/lib/surfaceTextureShape");
    const base = surfaceTextureInput(box);
    const first = normalizeSurfaceTexture({ pattern: "bricks" });
    const top = normalizeSurfaceTexture({ pattern: "knurl", faces: ["top"] });
    const nowhere = normalizeSurfaceTexture({ pattern: "grooves" });
    const textured = surfaceTexturedShape(box, base, first, 1, [top, nowhere])!;
    expect(textured.surfaceTexture?.pattern).toBe("bricks");
    expect(textured.surfaceTextureLayers?.map((layer) => layer.pattern)).toEqual(["knurl"]);
    // One layer alone keeps no list.
    expect(surfaceTexturedShape(box, base, first, 1)!.surfaceTextureLayers).toBeUndefined();
    // What two layers made together: the last one's triangles, coarser when either was, gold from both.
    const a = { ...textureSurfacePositions(base, first).stats, limited: true };
    const b = textureSurfacePositions(base, top).stats;
    const merged = mergedSurfaceTextureStats([a, b]);
    expect(merged.triangles).toBe(b.triangles);
    expect(merged.limited).toBe(true);
    expect(merged.bricks).toEqual(a.bricks);
    expect(mergedSurfaceTextureFill([null, new Float64Array(9), new Float64Array(18)])?.length).toBe(27);
    expect(mergedSurfaceTextureFill([null, null])).toBeNull();
  }, TEXTURE_TIMEOUT);
});
