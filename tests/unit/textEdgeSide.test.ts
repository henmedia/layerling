import manifoldModule, { type ManifoldToplevel } from "manifold-3d";
import * as THREE from "three";
import { beforeAll, describe, expect, it } from "vitest";
import { meshForShape } from "@/lib/editorMeshCore";
import { rememberManifoldRuntime } from "@/lib/manifoldHandle";
import { MAX_EDGED_TEXT_LENGTH, maxTextEdgeSize, normalizeTextEdge, SLOW_BOTH_EDGES_LENGTH, textEdgeBuildsSlowly, textEdgeProfile, textEdgeSide, textHasEdge, topTextEdge } from "@/lib/textEdge";
import { loftedTextEdge } from "@/lib/textEdgeLoft";
import { textDisplayGeometry, textEdgeFootFloats, textEdgeGeometry } from "@/lib/textFill";
import { loadTextFonts } from "@/lib/textFonts";
import { normalizeTextLayers } from "@/lib/textLayers";
import type { WorkplaneShape } from "@/types/layerling";

// The letter edge on the bottom or on both ends: a text cut out of a body as inset letters gets a
// chamfered floor. The module's own kernel handle is filled here, as the editor fills it, so the
// cut's mesh (editorMeshCore) and the thin-letter check can be built.
let runtime: ManifoldToplevel;

beforeAll(async () => {
  runtime = await manifoldModule();
  runtime.setup();
  rememberManifoldRuntime(runtime);
  await loadTextFonts();
});

function text(overrides: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return {
    id: "t", name: "Text", kind: "text", color: "#f00", x: 0, z: 0, rotation: 0,
    width: 60, depth: 20, height: 3, size: 60, text: "Oga", ...overrides,
  };
}

type Triangle = [THREE.Vector3, THREE.Vector3, THREE.Vector3];

function triangles(geometry: THREE.BufferGeometry): Triangle[] {
  const position = geometry.getAttribute("position");
  const index = geometry.getIndex();
  const count = index ? index.count : position.count;
  const vertex = (n: number) => new THREE.Vector3().fromBufferAttribute(position, index ? index.getX(n) : n);
  const out: Triangle[] = [];
  for (let n = 0; n + 2 < count; n += 3) out.push([vertex(n), vertex(n + 1), vertex(n + 2)]);
  return out;
}

/** Every edge of a triangle mesh is shared by exactly two triangles, once each way round: a closed solid. */
function isClosed(geometry: THREE.BufferGeometry) {
  const edges = new Map<string, number>();
  const key = (v: THREE.Vector3) => `${v.x},${v.y},${v.z}`;
  for (const corners of triangles(geometry)) {
    for (let corner = 0; corner < 3; corner += 1) {
      const from = key(corners[corner]);
      const to = key(corners[(corner + 1) % 3]);
      if (from === to) continue;
      edges.set(`${from}>${to}`, (edges.get(`${from}>${to}`) ?? 0) + 1);
    }
  }
  return [...edges].every(([edge, times]) => {
    const [from, to] = edge.split(">");
    return times === 1 && edges.get(`${to}>${from}`) === 1;
  });
}

function volume(geometry: THREE.BufferGeometry) {
  return triangles(geometry).reduce((total, [a, b, c]) => total + a.dot(b.clone().cross(c)) / 6, 0);
}

function heightRange(geometry: THREE.BufferGeometry) {
  geometry.computeBoundingBox();
  return { min: geometry.boundingBox!.min.y, max: geometry.boundingBox!.max.y };
}

/** Sloped triangles of the skin facing up and facing down: a fold shows as a slope facing the wrong way. */
function slopes(geometry: THREE.BufferGeometry) {
  let up = 0;
  let down = 0;
  for (const [a, b, c] of triangles(geometry)) {
    if (Math.max(a.y, b.y, c.y) - Math.min(a.y, b.y, c.y) < 1e-6) continue;
    const normal = b.clone().sub(a).cross(c.clone().sub(a));
    if (Math.abs(normal.y) < 1e-6 * normal.length() || normal.length() < 1e-9) continue;
    if (normal.y > 0) up += 1;
    else down += 1;
  }
  return { up, down };
}

describe("letter edge on the bottom or both ends", () => {
  it("keeps the side only when it is the bottom or both, and a name tag's layer on the top", () => {
    expect(normalizeTextEdge({ kind: "chamfer", size: 1, side: "bottom" })).toEqual({ kind: "chamfer", size: 1, side: "bottom" });
    expect(normalizeTextEdge({ kind: "round", size: 1, side: "both" })).toEqual({ kind: "round", size: 1, side: "both" });
    expect(normalizeTextEdge({ kind: "round", size: 1, side: "top" })).toEqual({ kind: "round", size: 1 });
    expect(normalizeTextEdge({ kind: "round", size: 1, side: "left" })).toEqual({ kind: "round", size: 1 });
    expect(textEdgeSide(normalizeTextEdge({ kind: "round", size: 1 }))).toBe("top");
    expect(topTextEdge({ kind: "chamfer", size: 1, side: "bottom" })).toEqual({ kind: "chamfer", size: 1 });
    const [layer] = normalizeTextLayers([{ grow: 0, height: 2, color: "#ff0000", edge: { kind: "chamfer", size: 0.5, side: "both" } }]);
    expect(layer.edge).toEqual({ kind: "chamfer", size: 0.5 });
  });

  it("takes at most half the height on both ends, the full height on one", () => {
    expect(maxTextEdgeSize(3, "top")).toBe(3);
    expect(maxTextEdgeSize(3, "bottom")).toBe(3);
    expect(maxTextEdgeSize(3, "both")).toBe(1.5);
    expect(maxTextEdgeSize(20, "bottom")).toBe(5);
  });

  it("warns of a slow build for both ends on a text over 20 characters, and builds it all the same", () => {
    const both = { kind: "chamfer", size: 0.5, side: "both" } as const;
    expect(textEdgeBuildsSlowly(text({ text: "x".repeat(SLOW_BOTH_EDGES_LENGTH), textEdge: both }))).toBe(false);
    expect(textEdgeBuildsSlowly(text({ text: "x".repeat(SLOW_BOTH_EDGES_LENGTH + 1), textEdge: both }))).toBe(true);
    expect(textHasEdge(text({ text: "x".repeat(SLOW_BOTH_EDGES_LENGTH + 1), textEdge: both }))).toBe(true);
    // One end builds in the time it always did; over 40 characters there is no edge to warn about.
    expect(textEdgeBuildsSlowly(text({ text: "x".repeat(30), textEdge: { kind: "chamfer", size: 0.5, side: "bottom" } }))).toBe(false);
    expect(textEdgeBuildsSlowly(text({ text: "x".repeat(MAX_EDGED_TEXT_LENGTH + 1), textEdge: both }))).toBe(false);
  });

  it("lays the outline out from the underside up for each side", () => {
    expect(textEdgeProfile({ kind: "chamfer" }, 1, 3, 1)).toEqual([{ height: 0, inset: 0 }, { height: 2, inset: 0 }, { height: 3, inset: 1 }]);
    expect(textEdgeProfile({ kind: "chamfer", side: "bottom" }, 1, 3, 1)).toEqual([{ height: 0, inset: 1 }, { height: 1, inset: 0 }, { height: 3, inset: 0 }]);
    expect(textEdgeProfile({ kind: "chamfer", side: "both" }, 1, 3, 1)).toEqual([{ height: 0, inset: 1 }, { height: 1, inset: 0 }, { height: 2, inset: 0 }, { height: 3, inset: 1 }]);
    // Both edges meeting in the middle: the full outline stands there once, no wall of no height.
    expect(textEdgeProfile({ kind: "chamfer", side: "both" }, 1.5, 3, 1)).toEqual([{ height: 0, inset: 1.5 }, { height: 1.5, inset: 0 }, { height: 3, inset: 1.5 }]);
    // An edge as high as the letters on one side: no wall at all.
    expect(textEdgeProfile({ kind: "chamfer", side: "bottom" }, 3, 3, 1)).toEqual([{ height: 0, inset: 3 }, { height: 3, inset: 0 }]);
  });

  it("builds the bottom edge as the top one turned over: a closed solid of the same volume, smaller underneath", () => {
    for (const kind of ["round", "chamfer"] as const) {
      const top = textEdgeGeometry(runtime, text({ textEdge: { kind, size: 0.6 } }))!;
      const bottom = textEdgeGeometry(runtime, text({ textEdge: { kind, size: 0.6, side: "bottom" } }))!;
      expect(bottom, kind).not.toBeNull();
      expect(isClosed(bottom), `${kind} on the bottom is a closed solid`).toBe(true);
      expect(heightRange(bottom).min).toBeCloseTo(0, 4);
      expect(heightRange(bottom).max).toBeCloseTo(3, 4);
      expect(volume(bottom)).toBeCloseTo(volume(top), 1);
      // The skin slopes face down on the bottom, up on the top.
      expect(slopes(bottom).up, kind).toBe(0);
      expect(slopes(top).down, kind).toBe(0);
    }
  });

  it("builds both ends as one closed solid with less volume than either one", () => {
    const top = textEdgeGeometry(runtime, text({ textEdge: { kind: "chamfer", size: 0.6 } }))!;
    const both = textEdgeGeometry(runtime, text({ textEdge: { kind: "chamfer", size: 0.6, side: "both" } }))!;
    expect(both).not.toBeNull();
    expect(isClosed(both)).toBe(true);
    expect(heightRange(both).min).toBeCloseTo(0, 4);
    expect(heightRange(both).max).toBeCloseTo(3, 4);
    expect(volume(both)).toBeLessThan(volume(top) - 1);
    const { up, down } = slopes(both);
    expect(up).toBeGreaterThan(0);
    expect(down).toBeGreaterThan(0);
  });

  it("caps an edge on both ends at half the height", () => {
    // Asked for 2.5 mm on a text 3 mm high: built as 1.5 on each end, meeting in the middle.
    const capped = textEdgeGeometry(runtime, text({ textEdge: { kind: "chamfer", size: 2.5, side: "both" } }))!;
    const half = textEdgeGeometry(runtime, text({ textEdge: { kind: "chamfer", size: 1.5, side: "both" } }))!;
    expect(isClosed(capped)).toBe(true);
    expect(volume(capped)).toBeCloseTo(volume(half), 3);
  }, 60000);

  it("cuts where it is drawn when every stroke runs out before the underside (a V-carve)", () => {
    // A chamfer as high as the letters, wider than half of every stroke: no letter reaches the underside.
    const vCarve = text({ height: 3, textEdge: { kind: "chamfer", size: 3, side: "bottom" } });
    const geometry = textDisplayGeometry(vCarve);
    expect(heightRange(geometry).min).toBeGreaterThan(0.1);
    expect(heightRange(geometry).max).toBeCloseTo(3, 4);
    expect(geometry.userData.keepsItsHeight).toBe(true);
    // The mesh a hole cuts with and an export writes stands where the view draws it: its top at the
    // letters' height, as the plain text's, not moved down onto the plate.
    const cut = meshForShape({ ...vCarve, hole: true });
    const plain = meshForShape({ ...text({ height: 3 }), hole: true });
    const top = (mesh: { vertices: number[][] }) => mesh.vertices.reduce((most, vertex) => Math.max(most, vertex[1]), -Infinity);
    const foot = (mesh: { vertices: number[][] }) => mesh.vertices.reduce((least, vertex) => Math.min(least, vertex[1]), Infinity);
    expect(top(cut)).toBeCloseTo(top(plain), 3);
    expect(foot(cut) - foot(plain)).toBeCloseTo(heightRange(geometry).min, 3);
  }, 60000);

  it("leaves a top edge to stand on the plate as before", () => {
    const geometry = textEdgeGeometry(runtime, text({ textEdge: { kind: "chamfer", size: 0.6 } }))!;
    expect(geometry.userData.keepsItsHeight).toBeUndefined();
  });

  it("says when a solid text's thin letters would start in the air", () => {
    expect(textEdgeFootFloats(text({ textEdge: { kind: "chamfer", size: 0.4, side: "bottom" } }))).toBe(false);
    expect(textEdgeFootFloats(text({ textEdge: { kind: "chamfer", size: 3, side: "bottom" } }))).toBe(true);
    // On the top nothing starts in the air.
    expect(textEdgeFootFloats(text({ textEdge: { kind: "chamfer", size: 3 } }))).toBe(false);
  });

  it("does not fold a chamfer's one slope: Script at 0.5 mm folded before", () => {
    for (const side of [undefined, "bottom"] as const) {
      const geometry = textEdgeGeometry(runtime, text({ width: 80, size: 80, height: 6, font: "Script", textEdge: { kind: "chamfer", size: 0.5, ...(side ? { side } : {}) } }))!;
      expect(geometry).not.toBeNull();
      expect(isClosed(geometry)).toBe(true);
      const { up, down } = slopes(geometry);
      expect(side ? up : down, `slopes facing the wrong way, ${side ?? "top"}`).toBe(0);
    }
  }, 60000);

  it("builds a large chamfer's slabs in steps of about 0.1 mm", () => {
    // 5 mm on Sans runs every stroke out, so it is built as slabs, 0.21 mm each (5 mm in 24) instead of 0.42 (in 12).
    const geometry = textEdgeGeometry(runtime, text({ width: 80, size: 80, height: 6, font: "Sans", textEdge: { kind: "chamfer", size: 5, side: "bottom" } }))!;
    expect(isClosed(geometry)).toBe(true);
    const levels = [...new Set(triangles(geometry).flatMap((corners) => corners.map((corner) => Math.round(corner.y * 1000) / 1000)))].sort((a, b) => a - b);
    // From the lowest slab up to where the edge ends at 5 mm; the wall above it runs on to 6.
    const edge = levels.filter((level) => level <= 5 + 1e-6);
    // The strokes run out about 1.7 mm up, so only the steps up to there are built.
    expect(edge.length).toBeGreaterThan(5);
    const widest = Math.max(...edge.slice(1).map((level, index) => level - edge[index]));
    expect(widest).toBeLessThan(0.22);
  }, 60000);
});

describe("the skin's fold guard", () => {
  const square = (from: number, to: number) => [{ x: from, z: from }, { x: to, z: from }, { x: to, z: to }, { x: from, z: to }];

  it("lofts a square stepping out going up, as an edge on the bottom does", () => {
    const skin = loftedTextEdge([[square(1, 9)], [square(0, 10)]], [0, 1])!;
    expect(skin).not.toBeNull();
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(skin.positions, 3));
    geometry.setIndex(skin.indices);
    expect(isClosed(geometry)).toBe(true);
    // A frustum from 8 x 8 up to 10 x 10, one high.
    expect(volume(geometry)).toBeCloseTo((64 + 100 + Math.sqrt(64 * 100)) / 3, 3);
  });

  it("builds a wall between a level and the very same level above it", () => {
    const full = [square(0, 10)];
    const skin = loftedTextEdge([[square(1, 9)], full, full], [0, 1, 3])!;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(skin.positions, 3));
    geometry.setIndex(skin.indices);
    expect(isClosed(geometry)).toBe(true);
    expect(volume(geometry)).toBeCloseTo((64 + 100 + 80) / 3 + 200, 3);
  });

  it("builds nothing where a band would fold over itself", () => {
    // The upper square reaches out past the lower one on two sides: those slopes would face down.
    expect(loftedTextEdge([[square(0, 10)], [square(6, 14)]], [0, 1])).toBeNull();
  });
});
