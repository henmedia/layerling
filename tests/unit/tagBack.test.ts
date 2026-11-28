import * as THREE from "three";
import manifoldModule, { type CrossSection, type Manifold, type ManifoldToplevel } from "manifold-3d";
import { beforeAll, describe, expect, it } from "vitest";
import { loadTextFonts } from "@/lib/textFonts";
import { rememberManifoldRuntime } from "@/lib/manifoldHandle";
import { textFillClosedGeometry, textJoinedGeometry } from "@/lib/textFill";
import { DEFAULT_TEXT_LAYERS, flushLayersFor, textLayerShapes, textLayersOf, type TextLayer } from "@/lib/textLayers";
import { flushSketchSolid, sketchBackInfo } from "@/lib/flushSketch";
import { iconLayerElevations, iconLayerProfile, iconLayersOf } from "@/lib/iconTag";
import { DEFAULT_BACK_DEPTH, DEFAULT_BACK_SIZE, MIN_BACK_DEPTH, normalizeTagBack, tagBackDepthFor, tagBackLines, tagBackRegion } from "@/lib/tagBack";
import { exportLylProject, importLylProject } from "@/lib/lylProject";
import { editorHistoryEntry } from "@/lib/editorHistory";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";
import type { SketchPoint, SketchProfile, SketchSegment, TagBack, WorkplaneShape } from "@/types/layerling";

// Text on the back of a name tag or an icon tag: sunk into the bottom layer's underside, mirrored, optionally filled.
let runtime: ManifoldToplevel;

beforeAll(async () => {
  runtime = await manifoldModule();
  runtime.setup();
  rememberManifoldRuntime(runtime);
  await loadTextFonts();
});

function text(overrides: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return {
    id: "t", name: "Tag", kind: "text", color: "#fff", x: 0, z: 0, rotation: 0,
    width: 60, depth: 14, height: 1.2, size: 60, text: "Anna", ...overrides,
  };
}

/** A display mesh as a solid of the 3D kernel where the part stands, the kernel's z up. */
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
  for (let corner = 0; corner + 2 < count; corner += 3) [triVerts[corner + 1], triVerts[corner + 2]] = [triVerts[corner + 2], triVerts[corner + 1]];
  const mesh = new runtime.Mesh({ numProp: 3, vertProperties, triVerts, tolerance: 1e-4 });
  mesh.merge();
  return runtime.Manifold.ofMesh(mesh);
}

function partSolid(part: WorkplaneShape) {
  const geometry = textFillClosedGeometry(runtime, part) ?? textJoinedGeometry(runtime, part);
  expect(geometry).not.toBeNull();
  return solidOf(geometry!, part.elevation ?? 0, part);
}

const keep = (section: CrossSection) => section;
const BACK: TagBack = { text: "+36 30 123 4567\nanna@example.com", size: DEFAULT_BACK_SIZE, depth: DEFAULT_BACK_DEPTH };

describe("the back's text", () => {
  it("drops empty lines at the ends and trims each line, keeping an empty line between", () => {
    expect(tagBackLines("\n  Anna  \n\n06 30 1234567 \n\n")).toEqual(["Anna", "", "06 30 1234567"]);
    expect(tagBackLines("   \n ")).toEqual([]);
  });

  it("is nothing without letters, and keeps its measures in range", () => {
    expect(normalizeTagBack({ text: "  " })).toBeUndefined();
    expect(normalizeTagBack({ text: "Hi", size: 0.1, depth: 99, fill: "#FF0000" })).toEqual({ text: "Hi", size: 2, depth: 3, fill: "#ff0000" });
    expect(normalizeTagBack({ text: "Hi" })).toEqual({ text: "Hi", size: DEFAULT_BACK_SIZE, depth: DEFAULT_BACK_DEPTH });
  });

  it("keeps a floor over the letters, under a flush pocket too", () => {
    expect(tagBackDepthFor(0.8, 3)).toBe(0.8);
    expect(tagBackDepthFor(3, 3)).toBe(2.6);
    expect(tagBackDepthFor(3, 3, 0.8)).toBe(1.8);
    expect(tagBackDepthFor(0.8, 1.2, 0.8)).toBe(MIN_BACK_DEPTH);
  });

  it("is mirrored left to right: an L's upright stands on the right seen from above, its foot at the bottom", () => {
    const region = tagBackRegion(runtime, keep, { text: "L", size: 10, depth: 1 }, { x: 0, z: 0 })!;
    const { min, max } = region.bounds();
    const band = (x0: number, z0: number, x1: number, z1: number) => region.intersect(runtime.CrossSection.square([x1 - x0, z1 - z0]).translate([x0, z0])).area();
    const middleX = (min[0] + max[0]) / 2;
    expect(band(middleX, min[1], max[0], max[1])).toBeGreaterThan(band(min[0], min[1], middleX, max[1]));
    // The foot lies towards +z, where the tag's bottom edge is, as on the front.
    expect(band(min[0], max[1] - 2, max[0], max[1])).toBeGreaterThan(band(min[0], min[1], max[0], min[1] + 2));
    expect(max[1] - min[1]).toBeCloseTo(10, 0);
  });

  it("puts the first line at the top: towards -z seen from above, as on the front", () => {
    const first = tagBackRegion(runtime, keep, { text: "MMMM\ni", size: 4, depth: 1 }, { x: 0, z: 0 })!;
    const { min, max } = first.bounds();
    const half = (min[1] + max[1]) / 2;
    const upper = first.intersect(runtime.CrossSection.square([100, half - min[1]]).translate([-50, min[1]])).area();
    expect(upper).toBeGreaterThan(first.area() - upper);
  });

  it("centres its block of lines on the middle it is given", () => {
    const region = tagBackRegion(runtime, keep, BACK, { x: 3, z: -2 })!;
    const { min, max } = region.bounds();
    expect((min[0] + max[0]) / 2).toBeCloseTo(3, 6);
    expect((min[1] + max[1]) / 2).toBeCloseTo(-2, 6);
    // Two lines: taller than two capitals.
    expect(max[1] - min[1]).toBeGreaterThan(2 * DEFAULT_BACK_SIZE);
  });
});

describe("a name tag with text on its back", () => {
  const layers: TextLayer[] = DEFAULT_TEXT_LAYERS.map((layer) => ({ ...layer, ...(layer.silhouette ? { height: 3 } : {}) }));

  it("sinks the text into the bottom layer only, from its underside", () => {
    const plain = textLayerShapes(text(), layers);
    const backed = textLayerShapes(text(), layers, [], null, null, BACK);
    expect(backed).toHaveLength(3);
    expect(backed.slice(0, 2).every((part) => !part.textBack)).toBe(true);
    expect(backed[2].textBack).toMatchObject({ text: BACK.text, depth: 0.8 });
    const before = partSolid(plain[2]);
    const after = partSolid(backed[2]);
    const cut = before.volume() - after.volume();
    expect(cut).toBeGreaterThan(5);
    // Nothing is taken from above the letters' depth: the top 2.2 mm of the plate are whole.
    const slab = (solid: Manifold) => solid.trimByPlane([0, 0, 1], 0.8 + 1e-3).volume();
    expect(slab(after)).toBeCloseTo(slab(before), 1);
  });

  it("with a colour, a part fills the letters exactly: no overlap, no gap", () => {
    const parts = textLayerShapes(text(), layers, [], null, null, { ...BACK, fill: "#ffffff" });
    expect(parts).toHaveLength(4);
    const fill = parts[3];
    expect(fill.textBackFill).toBe(true);
    expect(fill.color).toBe("#ffffff");
    expect(fill.height).toBe(0.8);
    expect(fill.elevation).toBe(parts[2].elevation);
    const plate = partSolid(textLayerShapes(text(), layers)[2]);
    const bottom = partSolid(parts[2]);
    const filled = partSolid(fill);
    expect(bottom.intersect(filled).volume()).toBeLessThan(0.05);
    expect(bottom.add(filled).volume()).toBeCloseTo(plate.volume(), 0);
    // Across the letters' depth the plate is whole again, as it is above them.
    expect(bottom.add(filled).slice(0.4).area()).toBeCloseTo(bottom.slice(2).area(), 0);
  });

  it("laid in flush too, every colour fills the tag exactly once", () => {
    const flush = { depth: 0.8 };
    const parts = textLayerShapes(text(), layers, [], null, flush, { ...BACK, fill: "#ffffff" });
    const solids = parts.map(partSolid);
    const sum = solids.reduce((total, solid) => total + solid.volume(), 0);
    const union = solids.reduce((all, solid) => all.add(solid));
    const without = textLayerShapes(text(), layers, [], null, flush).map(partSolid).reduce((all, solid) => all.add(solid));
    expect(sum).toBeCloseTo(union.volume(), 0);
    expect(union.volume()).toBeCloseTo(without.volume(), 0);
  });

  it("letters past the plate's outline are cut off a millimetre inside it, and the tag says so", () => {
    const long: TagBack = { text: "a very long line that never fits on this tag", size: 6, depth: 0.8, fill: "#ffffff" };
    const parts = textLayerShapes(text(), layers, [], null, null, long);
    expect(parts[2].textBack?.clipped).toBe(true);
    const plate = partSolid(textLayerShapes(text(), layers)[2]);
    const bottom = partSolid(parts[2]);
    const filled = partSolid(parts[3]);
    expect(bottom.intersect(filled).volume()).toBeLessThan(0.05);
    expect(bottom.add(filled).volume()).toBeCloseTo(plate.volume(), 0);
    expect(textLayerShapes(text(), layers, [], null, null, { ...long, text: "Hi" })[2].textBack?.clipped).toBeUndefined();
  });

  it("letters never run into the key ring tab: they stay a millimetre inside the plate without its ear", () => {
    const long: TagBack = { text: "a very long line that never fits on this tag", size: 6, depth: 0.8, fill: "#ffffff" };
    const keyring = { side: "left" as const, diameter: 4 };
    const plain = partSolid(textLayerShapes(text(), layers)[2]).boundingBox();
    const parts = textLayerShapes(text(), layers, [], keyring, null, long);
    const fill = partSolid(parts[3]).boundingBox();
    expect(fill.min[0]).toBeGreaterThan(plain.min[0] + 0.99);
    expect(fill.max[0]).toBeLessThan(plain.max[0] - 0.99);
    expect(parts[2].textBack?.clipped).toBe(true);
  });

  it("two lines under a name of small letters move down to where they fit, instead of losing the first line's tops", () => {
    // "Name": over the small letters the plate's top edge is lower than over the N, so centred on the letters' box the
    // first line ran into it while there was room under the last one.
    const name = text({ text: "Name", width: 40, depth: 10, size: 40 });
    const two: TagBack = { text: "Dave\n06 30 12", size: 4, depth: 0.8, fill: "#ffffff" };
    const parts = textLayerShapes(name, layers, [], null, null, two);
    expect(parts[2].textBack?.clipped).toBeUndefined();
    // All of the text is there: the fill is as big as the same text on a plate where it fits as it is.
    const roomy = textLayerShapes(text(), layers, [], null, null, two);
    expect(roomy[2].textBack?.clipped).toBeUndefined();
    expect(partSolid(parts[3]).volume()).toBeGreaterThan(partSolid(roomy[3]).volume() * 0.99);
    // Moved down only: still centred left to right on the letters, and lower than their middle (+z is down seen from above).
    const letters = partSolid(parts[0]).boundingBox();
    const fill = partSolid(parts[3]).boundingBox();
    expect((fill.min[0] + fill.max[0]) / 2).toBeCloseTo((letters.min[0] + letters.max[0]) / 2, 0);
    expect((fill.min[1] + fill.max[1]) / 2).toBeGreaterThan((letters.min[1] + letters.max[1]) / 2 + 0.2);
  });

  it("text too wide for the tag is made smaller until it fits, not under 2.5 mm, and the tag says how small", () => {
    const name = text({ text: "Name", width: 50, depth: 14, size: 50 });
    const mail = (size: number): TagBack => ({ text: "06 30 123 4567\nsomeone@example.com", size, depth: 0.8, fill: "#ffffff" });
    const parts = textLayerShapes(name, layers, [], null, null, mail(4));
    const back = parts[2].textBack!;
    expect(back.clipped).toBeUndefined();
    expect(back.fitted).toBeGreaterThanOrEqual(2.5);
    expect(back.fitted).toBeLessThan(4);
    // The largest that fits: a tenth of a millimetre more does not.
    expect(textLayerShapes(name, layers, [], null, null, mail(back.fitted!))[2].textBack?.fitted).toBeUndefined();
    expect(textLayerShapes(name, layers, [], null, null, mail(back.fitted! + 0.1))[2].textBack?.clipped).toBeUndefined();
    expect(textLayerShapes(name, layers, [], null, null, mail(back.fitted! + 0.1))[2].textBack?.fitted).toBe(back.fitted);
    // Built at that height: the fill is the same as the text set to it.
    const asSet = textLayerShapes(name, layers, [], null, null, mail(back.fitted!));
    expect(partSolid(parts[3]).volume()).toBeCloseTo(partSolid(asSet[3]).volume(), 3);
    // Text that fits as it is keeps its height.
    expect(textLayerShapes(text(), layers, [], null, null, { ...BACK, text: "06 30" })[2].textBack?.fitted).toBeUndefined();
    // Too long even at 2.5 mm: cut off there, and the tag says so.
    const small = text({ text: "Name", width: 40, depth: 10, size: 40 });
    const long = textLayerShapes(small, layers, [], null, null, { text: "a line far too long for this little tag", size: 4, depth: 0.8 })[2].textBack!;
    expect(long).toMatchObject({ clipped: true, fitted: 2.5 });
    // A height asked under 2.5 mm is never made larger.
    expect(textLayerShapes(small, layers, [], null, null, { text: "a line far too long for this little tag", size: 2, depth: 0.8 })[2].textBack).toMatchObject({ clipped: true, size: 2 });
  });

  it("with a key ring ear, the text stays centred on the letters", () => {
    const keyring = { side: "left" as const, diameter: 4 };
    const parts = textLayerShapes(text(), layers, [], keyring, null, { text: "06 30", size: 4, depth: 0.8, fill: "#ffffff" });
    expect(parts[2].textBack?.clipped).toBeUndefined();
    const letters = partSolid(parts[0]).boundingBox();
    const fill = partSolid(parts[3]).boundingBox();
    const middle = (box: { min: ArrayLike<number>; max: ArrayLike<number> }) => (box.min[0] + box.max[0]) / 2;
    expect(middle(fill)).toBeCloseTo(middle(letters), 0);
  });

  it("reads back as it was built, the fill's colour from its part, and builds again the same", () => {
    const parts = textLayerShapes(text(), layers, [], null, null, { ...BACK, fill: "#ffffff" });
    const recoloured = parts.map((part) => (part.textBackFill ? { ...part, color: "#ffcc00" } : part));
    const stack = textLayersOf([...recoloured].reverse())!;
    expect(stack.layers).toHaveLength(3);
    expect(stack.back).toMatchObject({ text: BACK.text, size: BACK.size, depth: 0.8, fill: "#ffcc00" });
    const again = textLayerShapes(stack.source, stack.layers, stack.ids, null, null, stack.back);
    expect(again.map((part) => part.id)).toEqual(parts.map((part) => part.id));
    // Without a fill, no fill part and none read back.
    const bare = textLayersOf(textLayerShapes(text(), layers, [], null, null, BACK))!;
    expect(bare.back?.fill).toBeUndefined();
  });

  it("text that fits nowhere is known at once: six long lines at 20 mm take well under a few seconds", () => {
    const six = Array.from({ length: 6 }, () => "firstname.lastname@example.org").join("\n");
    const name = text({ text: "Richard", width: 52, size: 52 });
    for (const size of [4, 20]) {
      const start = performance.now();
      const back = textLayerShapes(name, layers, [], null, null, { text: six, size, depth: 0.8 })[2].textBack!;
      expect(performance.now() - start).toBeLessThan(3000);
      expect(back).toMatchObject({ clipped: true, fitted: 2.5 });
    }
    // Two phone numbers asked at 20 mm come out at the largest height that fits, as quickly.
    const start = performance.now();
    const phones = textLayerShapes(name, layers, [], null, null, { text: "07765455355\n07784755055", size: 20, depth: 0.8 })[2].textBack!;
    expect(performance.now() - start).toBeLessThan(1500);
    expect(phones.clipped).toBeUndefined();
    expect(phones.fitted).toBeGreaterThan(3);
  }, 30_000);

  it("read back, says whether it was made smaller or cut off as this version builds it, whatever the file says", () => {
    const name = text({ text: "Name", width: 50, depth: 14, size: 50 });
    const parts = textLayerShapes(name, layers, [], null, null, { text: "06 30 123 4567\nsomeone@example.com", size: 4, depth: 0.8 });
    const fitted = parts[2].textBack!.fitted;
    expect(fitted).toBeDefined();
    // As an older version saved it: cut off, nothing made smaller.
    const saved = parts.map((part, index) => (index === 2 ? { ...part, textBack: { ...part.textBack!, clipped: true, fitted: undefined } } : part));
    const back = textLayersOf([...saved].reverse())!.back!;
    expect(back.clipped).toBeUndefined();
    expect(back.fitted).toBe(fitted);
  });

  it("a .lyl file keeps the back and its fill part", async () => {
    const parts = textLayerShapes(text(), layers, [], null, null, { ...BACK, fill: "#ffffff" });
    const exported = await exportLylProject({
      projectId: "project-back", projectName: "Back", createdAt: 1_700_000_000_000, modifiedAt: 1_700_000_100_000,
      shapes: parts, history: [editorHistoryEntry(parts, [])], historyIndex: 0, assets: [],
      workspace: DEFAULT_WORKPLANE_WORKSPACE, snapGrid: DEFAULT_SNAP_GRID, placementElevation: 0,
    });
    const restored = (await importLylProject(exported)).shapes;
    const stack = textLayersOf(restored)!;
    expect(stack.back).toMatchObject({ text: BACK.text, depth: 0.8, fill: "#ffffff" });
  });
});

/** A closed square as a sketch. */
function square(size: number): SketchProfile {
  const half = size / 2;
  const points: SketchPoint[] = [
    { id: "a", x: -half, z: -half }, { id: "b", x: half, z: -half }, { id: "c", x: half, z: half }, { id: "d", x: -half, z: half },
  ];
  const segments: SketchSegment[] = points.map((point, index) => ({ id: `s${index}`, type: "line", startId: point.id, endId: points[(index + 1) % points.length].id }));
  return { points, segments };
}

/** A mesh of positions with y up (the sketch frame) as a solid standing at `elevation`. */
function sketchSolid(solid: { positions: Float32Array; indices: Uint32Array }, elevation: number): Manifold {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(solid.positions, 3));
  geometry.setIndex(Array.from(solid.indices));
  return solidOf(geometry, elevation);
}

describe("an icon tag with text on its back", () => {
  const layers: TextLayer[] = DEFAULT_TEXT_LAYERS.map((layer) => ({ ...layer, ...(layer.silhouette ? { height: 3 } : {}) }));
  const area = square(40);
  const back: TagBack = { ...BACK, fill: "#ffffff" };

  it("cuts the bottom layer from below and the fill fills the letters exactly, stacked and laid in flush", () => {
    for (const flush of [null, { depth: 0.8 }]) {
      const flushes = flushLayersFor(layers, flush);
      const plateProfile = iconLayerProfile(area, layers[2], undefined, flushes[2]);
      const plateHeight = layers[2].height;
      const bottom = flushSketchSolid(runtime, iconLayerProfile(area, layers[2], undefined, flushes[2], back), plateHeight)!;
      const fill = flushSketchSolid(runtime, iconLayerProfile(area, layers[2], undefined, undefined, back, true), back.depth)!;
      expect(bottom).not.toBeNull();
      expect(fill).not.toBeNull();
      const bottomSolid = sketchSolid(bottom, 0);
      const fillSolid = sketchSolid(fill, 0);
      expect(bottomSolid.intersect(fillSolid).volume()).toBeLessThan(0.05);
      // Across the letters' depth the plate is whole again, as it is above them; laid in flush, as without the back.
      const union = bottomSolid.add(fillSolid);
      expect(union.slice(0.4).area()).toBeCloseTo(bottomSolid.slice(1.5).area(), 0);
      expect(fillSolid.volume()).toBeGreaterThan(5);
      if (flush) expect(union.volume()).toBeCloseTo(sketchSolid(flushSketchSolid(runtime, plateProfile, plateHeight)!, 0).volume(), 0);
      // The fill's block of letters is centred on the icon.
      const box = fillSolid.boundingBox();
      expect((box.min[0] + box.max[0]) / 2).toBeCloseTo(0, 3);
      expect((box.min[1] + box.max[1]) / 2).toBeCloseTo(0, 3);
    }
  });

  it("text too wide for the icon is made smaller to fit, as on a name tag", () => {
    const wide: TagBack = { text: "someone@example.com", size: 6, depth: 0.8 };
    const info = sketchBackInfo(runtime, iconLayerProfile(area, layers[2], undefined, undefined, wide))!;
    expect(info.clipped).toBe(false);
    expect(info.size).toBeGreaterThanOrEqual(2.5);
    expect(info.size).toBeLessThan(6);
    expect(sketchBackInfo(runtime, iconLayerProfile(area, layers[2], undefined, undefined, { ...wide, size: info.size! }))!.size).toBeUndefined();
  });

  it("is read back from the bottom layer, the fill part left out of the layers", () => {
    const elevations = iconLayerElevations(layers, 0);
    const bodies: WorkplaneShape[] = layers.map((layer, index) => ({
      id: `l${index}`, name: `Icon ${index + 1}`, kind: "mesh", color: layer.color, x: 0, z: 0, rotation: 0,
      width: 40 + 2 * layer.grow, depth: 40 + 2 * layer.grow, height: layer.height, size: 40, elevation: elevations[index],
      sketchProfile: iconLayerProfile(area, layer, undefined, undefined, index === 2 ? back : undefined),
    }));
    const fill: WorkplaneShape = { ...bodies[2], id: "l2-back", color: "#00ff00", height: 0.8, sketchProfile: iconLayerProfile(area, layers[2], undefined, undefined, back, true) };
    const stack = iconLayersOf([fill, ...bodies])!;
    expect(stack.layers).toHaveLength(3);
    expect(stack.back).toMatchObject({ text: BACK.text, fill: "#00ff00" });
    // The icon's body is kept as it was built, so the card says what the build said, until a change builds it again.
    const saved = bodies.map((body, index) => (index === 2 ? { ...body, sketchProfile: { ...body.sketchProfile!, back: { ...back, clipped: true } } } : body));
    expect(iconLayersOf(saved)!.back).toMatchObject({ clipped: true });
    expect(iconLayersOf(saved)!.back?.fitted).toBeUndefined();
  });
});
