import * as THREE from "three";
import manifoldModule, { type Manifold, type ManifoldToplevel } from "manifold-3d";
import { beforeAll, describe, expect, it } from "vitest";
import { loadTextFonts } from "@/lib/textFonts";
import { textFillClosedGeometry, textJoinedGeometry } from "@/lib/textFill";
import { DEFAULT_TEXT_LAYERS, flushLayersFor, tagFlushArgument, textLayerShapes, textLayersOf, type TextLayer } from "@/lib/textLayers";
import { DEFAULT_FLUSH_DEPTH, flushDepthFor, MIN_FLUSH_DEPTH, normalizeFlushLayer } from "@/lib/flushLayers";
import { flushSketchSolid } from "@/lib/flushSketch";
import { iconLayerElevations, iconLayerProfile, iconLayersOf } from "@/lib/iconTag";
import type { SketchPoint, SketchProfile, SketchSegment, WorkplaneShape } from "@/types/layerling";

// #215: a name tag or icon tag laid in flush - every colour ends on one flat top, each in a pocket of the layer under it.
let runtime: ManifoldToplevel;

beforeAll(async () => {
  runtime = await manifoldModule();
  runtime.setup();
  await loadTextFonts();
});

function text(overrides: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return {
    id: "t", name: "Tag", kind: "text", color: "#fff", x: 0, z: 0, rotation: 0,
    width: 40, depth: 14, height: 1.2, size: 40, text: "Abo", ...overrides,
  };
}

/** A display mesh as a solid of the 3D kernel, moved up to where the layer stands, with the kernel's z up (so it can be sliced across). */
function solidOf(geometry: THREE.BufferGeometry, elevation: number, at: { x: number; z: number } = { x: 0, z: 0 }): Manifold {
  const position = geometry.getAttribute("position");
  const index = geometry.getIndex();
  const vertProperties = new Float32Array(position.count * 3);
  for (let vertex = 0; vertex < position.count; vertex += 1) {
    vertProperties.set([position.getX(vertex) + at.x, position.getZ(vertex) + at.z, position.getY(vertex) + elevation], vertex * 3);
  }
  const count = index ? index.count : position.count;
  const triVerts = new Uint32Array(count);
  for (let corner = 0; corner < count; corner += 1) triVerts[corner] = index ? index.getX(corner) : corner;
  // Swapping y and z mirrors the mesh: each triangle turns round to keep facing out.
  for (let corner = 0; corner + 2 < count; corner += 3) [triVerts[corner + 1], triVerts[corner + 2]] = [triVerts[corner + 2], triVerts[corner + 1]];
  const mesh = new runtime.Mesh({ numProp: 3, vertProperties, triVerts, tolerance: 1e-4 });
  mesh.merge();
  return runtime.Manifold.ofMesh(mesh);
}

/** Every layer of a tag as a solid where it stands. */
function layerSolids(parts: WorkplaneShape[]) {
  return parts.map((part) => {
    const geometry = textFillClosedGeometry(runtime, part) ?? textJoinedGeometry(runtime, part);
    expect(geometry).not.toBeNull();
    return solidOf(geometry!, part.elevation ?? 0, part);
  });
}

describe("name tag laid in flush (#215)", () => {
  const layers: TextLayer[] = DEFAULT_TEXT_LAYERS.map((layer) => ({ ...layer }));

  it("stacked, nothing changes", () => {
    const parts = textLayerShapes(text(), layers);
    expect(parts.every((part) => part.textFlush === undefined)).toBe(true);
    expect(parts.map((part) => part.height)).toEqual([1.2, 1.2, 2]);
  });

  it("the layers above the bottom one are as high as the depth and end on the bottom layer's top", () => {
    const parts = textLayerShapes(text(), layers, [], null, { depth: 0.6 });
    const [letters, rim, plate] = parts;
    expect(plate.height).toBe(2);
    expect(plate.elevation ?? 0).toBeCloseTo(0, 6);
    for (const part of [letters, rim]) {
      expect(part.height).toBe(0.6);
      expect((part.elevation ?? 0) + part.height).toBeCloseTo(2, 6);
    }
    // Each layer's pocket is the layer above it; the letters have none, and every layer keeps its own height.
    expect(letters.textFlush).toEqual({ depth: 0.6, height: 1.2 });
    expect(rim.textFlush).toEqual({ depth: 0.6, height: 1.2, pocket: { grow: 0 } });
    expect(plate.textFlush).toEqual({ depth: 0.6, height: 2, pocket: { grow: 1.5 } });
  });

  it("reads back as it was built, in any order, and stacks again as it was", () => {
    const parts = textLayerShapes(text(), layers, ["a", "b", "c"], null, { depth: 0.8 });
    const stack = textLayersOf([parts[2], parts[0], parts[1]]);
    expect(stack?.flush).toEqual({ depth: 0.8 });
    expect(stack?.ids).toEqual(["a", "b", "c"]);
    expect(stack?.layers.map((layer) => layer.height)).toEqual([1.2, 1.2, 2]);
    expect(stack?.layers.map((layer) => layer.grow)).toEqual([0, 1.5, 3]);
    const again = textLayerShapes(stack!.source, stack!.layers, stack!.ids);
    expect(again.map((part) => part.height)).toEqual([1.2, 1.2, 2]);
    expect(again.every((part) => part.textFlush === undefined)).toBe(true);
    expect(textLayersOf(again)?.flush).toBeNull();
  });

  it("the colours fill the plate's outline exactly once: no overlap, no gap, a flat top", () => {
    const parts = textLayerShapes(text(), layers, [], null, { depth: 0.6 });
    const solids = layerSolids(parts);
    solids.forEach((solid) => expect(solid.status()).toBe("NoError"));
    const sum = solids.reduce((total, solid) => total + solid.volume(), 0);
    const union = runtime.Manifold.union(solids);
    // The whole tag is the bottom layer's outline, 2 mm thick: as much as the layers together.
    const plate = solidOf(textFillClosedGeometry(runtime, { ...parts[2], textFlush: undefined })!, 0);
    expect(union.volume()).toBeCloseTo(plate.volume(), 1);
    expect(sum).toBeCloseTo(union.volume(), 1);
    const box = union.boundingBox();
    expect(box.max[2]).toBeCloseTo(2, 3);
    // Cut just under the top, every colour is there, side by side, and together they are the plate's outline.
    const topSlice = union.slice(1.99).area();
    expect(topSlice).toBeCloseTo(plate.slice(1.99).area(), 1);
    [union, plate, ...solids].forEach((solid) => solid.delete());
  });

  it("with a key ring ear on the bottom layer the letters' pockets stay where the letters are", () => {
    const parts = textLayerShapes(text(), layers, [], { side: "left", diameter: 4 }, { depth: 0.6 });
    const solids = layerSolids(parts);
    const sum = solids.reduce((total, solid) => total + solid.volume(), 0);
    const union = runtime.Manifold.union(solids);
    const plate = solidOf(textFillClosedGeometry(runtime, { ...parts[2], textFlush: undefined })!, 0, parts[2]);
    expect(union.volume()).toBeCloseTo(plate.volume(), 1);
    expect(sum).toBeCloseTo(union.volume(), 1);
    [union, plate, ...solids].forEach((solid) => solid.delete());
  });

  it("a rounded letter edge stays on an inlaid tag, and the colours still never overlap", () => {
    const edged: TextLayer[] = [{ ...layers[0], edge: { kind: "round", size: 0.4 } }, layers[1], layers[2]];
    const parts = textLayerShapes(text(), edged, [], null, { depth: 0.8 });
    expect(parts[0].textEdge).toEqual({ kind: "round", size: 0.4 });
    const solids = layerSolids(parts);
    const sum = solids.reduce((total, solid) => total + solid.volume(), 0);
    const union = runtime.Manifold.union(solids);
    expect(sum).toBeCloseTo(union.volume(), 1);
    [union, ...solids].forEach((solid) => solid.delete());
  });

  it("starts 0.8 mm deep", () => {
    expect(DEFAULT_FLUSH_DEPTH).toBe(0.8);
    expect(textLayerShapes(text(), layers, [], null, { depth: DEFAULT_FLUSH_DEPTH })[0].height).toBe(0.8);
  });

  it("a depth too deep for the bottom layer leaves a floor of one print layer", () => {
    expect(flushDepthFor(5, 2)).toBe(1.8);
    expect(flushDepthFor(0.05, 2)).toBe(MIN_FLUSH_DEPTH);
    const parts = textLayerShapes(text(), layers, [], null, { depth: 3 });
    expect(parts[0].height).toBe(1.8);
  });

  it("a single layer has nothing to lay in", () => {
    expect(flushLayersFor([layers[2]], { depth: 0.6 })).toEqual([undefined]);
  });

  it("the AI bridge's flush argument", () => {
    expect(tagFlushArgument(undefined)).toBeUndefined();
    expect(tagFlushArgument(false)).toEqual({ flush: null });
    expect(tagFlushArgument(true)).toEqual({ flush: { depth: DEFAULT_FLUSH_DEPTH } });
    expect(tagFlushArgument(0.8)).toEqual({ flush: { depth: 0.8 } });
    expect(tagFlushArgument({ depth: 1 })).toEqual({ flush: { depth: 1 } });
    expect(tagFlushArgument(9)).toHaveProperty("error");
  });

  it("a .lyl file's flush setting", () => {
    expect(normalizeFlushLayer({ depth: 0.6, height: 2, pocket: { grow: 1.5, join: "bevel" } })).toEqual({ depth: 0.6, height: 2, pocket: { grow: 1.5, join: "bevel" } });
    expect(normalizeFlushLayer({ depth: 0, height: 2 })).toBeUndefined();
    expect(normalizeFlushLayer({ depth: 0.6, height: 2, pocket: { grow: -1 } })).toBeUndefined();
  });
});

/** A closed square as a sketch. */
function square(size: number): SketchProfile {
  const corners = [[-size / 2, -size / 2], [size / 2, -size / 2], [size / 2, size / 2], [-size / 2, size / 2]];
  const points: SketchPoint[] = corners.map(([x, z], index) => ({ id: `p${index}`, x, z, mode: "corner" }));
  const segments: SketchSegment[] = corners.map((_, index) => ({ id: `s${index}`, startId: `p${index}`, endId: `p${(index + 1) % 4}`, kind: "line" }));
  return { points, segments };
}

describe("icon tag laid in flush (#215)", () => {
  const layers: TextLayer[] = [
    { grow: 0, height: 1.2, color: "#ffffff" },
    { grow: 1.5, height: 1.2, color: "#d41721", join: "miter" },
    { grow: 3, height: 3, color: "#2b2b2b", join: "miter", silhouette: true },
  ];

  it("the layers above the bottom one stand in it, their tops on its top", () => {
    expect(iconLayerElevations(layers, 0)).toEqual([4.2, 3, 0]);
    expect(iconLayerElevations(layers, 0, 0.6)).toEqual([2.4, 2.4, 0]);
  });

  it("each layer is its ring round the one above, the bottom one with the pocket in its top", () => {
    const flushes = flushLayersFor(layers, { depth: 0.6 });
    const area = square(10);
    const solids = layers.map((layer, index) => {
      const profile = iconLayerProfile(area, layer, undefined, flushes[index]);
      const height = index < layers.length - 1 ? 0.6 : layer.height;
      return profile.flush?.pocket ? flushSketchSolid(runtime, profile, height) : null;
    });
    expect(solids[0]).toBeNull();
    // The rim: a 1.5 mm ring round the 10 mm square, 0.6 mm high (sharp corners).
    const rim = solids[1]!;
    const rimVolume = solidVolume(rim);
    expect(rimVolume).toBeCloseTo((13 * 13 - 10 * 10) * 0.6, 2);
    // The plate: 16 mm square 3 mm thick, less the 13 mm pocket 0.6 mm deep.
    expect(solidVolume(solids[2]!)).toBeCloseTo(16 * 16 * 3 - 13 * 13 * 0.6, 2);
  });

  it("reads back with its flush and its own heights", () => {
    const flushes = flushLayersFor(layers, { depth: 0.6 });
    const elevations = iconLayerElevations(layers, 0, 0.6);
    const bodies = layers.map((layer, index): WorkplaneShape => ({
      id: `l${index}`, name: `Icon ${index + 1}`, kind: "mesh", color: layer.color, x: 0, z: 0, rotation: 0,
      width: 10, depth: 10, size: 10, height: index < 2 ? 0.6 : 3, elevation: elevations[index],
      sketchProfile: iconLayerProfile(square(10), layer, undefined, flushes[index]), sketchOperation: "extrude",
    }));
    const stack = iconLayersOf([bodies[1], bodies[2], bodies[0]]);
    expect(stack?.ids).toEqual(["l0", "l1", "l2"]);
    expect(stack?.flush).toEqual({ depth: 0.6 });
    expect(stack?.layers.map((layer) => layer.height)).toEqual([1.2, 1.2, 3]);
  });
});

function solidVolume(solid: { positions: Float32Array; indices: Uint32Array }) {
  const mesh = new runtime.Mesh({ numProp: 3, vertProperties: solid.positions, triVerts: solid.indices, tolerance: 1e-4 });
  mesh.merge();
  const manifold = runtime.Manifold.ofMesh(mesh);
  try {
    expect(manifold.status()).toBe("NoError");
    return manifold.volume();
  } finally {
    manifold.delete();
  }
}
