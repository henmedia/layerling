import { describe, expect, it } from "vitest";
import { halveMesh } from "@/lib/vase/mesh-tools.mjs";
import { buildVase, normalizeParams } from "@/lib/vase/vase-geometry.mjs";
import { buildParts } from "@/lib/vase/vase-parts.mjs";
import { vaseNote } from "@/lib/vaseNotes";
import { vaseAccessories, vaseNaturalFrame } from "@/lib/vaseShape";

/*
 * A lampshade for the wall (lamp "wand"): the front half of the shade, cut through the axis and closed by a flat
 * back, with a back plate as a part of its own - holes for two screws and the cable, and two strips the shade slips
 * over.
 */

type Mesh = { vertices: Float64Array; indices: Uint32Array };

/** Every edge walked once each way: the body is closed and oriented. */
function openEdges(mesh: Mesh) {
  const key = (i: number) => `${Math.round(mesh.vertices[i * 3] * 1e4)},${Math.round(mesh.vertices[i * 3 + 1] * 1e4)},${Math.round(mesh.vertices[i * 3 + 2] * 1e4)}`;
  const edges = new Map<string, number>();
  for (let t = 0; t < mesh.indices.length; t += 3) {
    for (let k = 0; k < 3; k += 1) {
      const edge = `${key(mesh.indices[t + k])}>${key(mesh.indices[t + ((k + 1) % 3)])}`;
      edges.set(edge, (edges.get(edge) ?? 0) + 1);
    }
  }
  let bad = 0;
  for (const [edge, count] of edges) {
    const [a, b] = edge.split(">");
    if (count !== 1 || edges.get(`${b}>${a}`) !== 1) bad += 1;
  }
  return bad;
}

/** A closed mesh's volume, positive where its faces look outwards. */
function volume(mesh: Mesh) {
  let sum = 0;
  const p = mesh.vertices;
  for (let t = 0; t < mesh.indices.length; t += 3) {
    const [a, b, c] = [mesh.indices[t] * 3, mesh.indices[t + 1] * 3, mesh.indices[t + 2] * 3];
    sum += (p[a] * (p[b + 1] * p[c + 2] - p[b + 2] * p[c + 1]) - p[a + 1] * (p[b] * p[c + 2] - p[b + 2] * p[c]) + p[a + 2] * (p[b] * p[c + 1] - p[b + 1] * p[c])) / 6;
  }
  return sum;
}

const reach = (mesh: Mesh, axis: number) => {
  let low = Infinity, high = -Infinity;
  for (let i = axis; i < mesh.vertices.length; i += 3) {
    low = Math.min(low, mesh.vertices[i]);
    high = Math.max(high, mesh.vertices[i]);
  }
  return { low, high };
};

const shade = { height: 160, diameter: 180, profile: "schirmTrommel", body: "hohl", wall: 1.6, lamp: "wand", quality: "entwurf" };

describe("cutting a closed body in half", () => {
  it("keeps what lies at y <= 0 and closes it with a flat face, holes in the cut included", () => {
    // A box 4 x 4 x 2 round the origin, as twelve triangles.
    const v = [-2, -2, -1, 2, -2, -1, 2, 2, -1, -2, 2, -1, -2, -2, 1, 2, -2, 1, 2, 2, 1, -2, 2, 1];
    const i = [0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7];
    const box = { vertices: Float64Array.from(v), indices: Uint32Array.from(i) };
    expect(volume(box)).toBeCloseTo(32);
    const half = halveMesh(box.vertices, box.indices);
    expect(openEdges(half)).toBe(0);
    expect(volume(half)).toBeCloseTo(16);
    expect(reach(half, 1)).toEqual({ low: -2, high: 0 });
    // Nothing to cut: a body wholly on the kept side comes back whole, one wholly beyond it empty.
    const below = { vertices: Float64Array.from(v.map((value, index) => (index % 3 === 1 ? value - 5 : value))), indices: box.indices };
    expect(volume(halveMesh(below.vertices, below.indices))).toBeCloseTo(32);
    const above = { vertices: Float64Array.from(v.map((value, index) => (index % 3 === 1 ? value + 5 : value))), indices: box.indices };
    expect(halveMesh(above.vertices, above.indices).indices).toHaveLength(0);
  });
});

describe("a lampshade for the wall", () => {
  it("is the front half of the shade: closed, flat at the back, open at the top and bottom, half the full shade's volume", () => {
    const whole = buildVase({ ...shade, lamp: "puck" });
    for (const over of [{}, { profile: "schirmKuppel" }, { effect: "rillen", ribCount: 36 }, { twist: 60, section: "vieleck", polySides: 6 }, { effect: "waben" }, { effect: "voronoi" }]) {
      const half = buildVase({ ...shade, ...over });
      expect(openEdges(half), JSON.stringify(over)).toBe(0);
      // The front: towards -y, and nothing behind the plane through the axis.
      expect(reach(half, 1).high, JSON.stringify(over)).toBeCloseTo(0, 6);
      expect(reach(half, 1).low, JSON.stringify(over)).toBeLessThan(-80);
      const full = buildVase({ ...shade, ...over, lamp: "puck" });
      expect(volume(half) / volume(full), JSON.stringify(over)).toBeCloseTo(0.5, 1);
    }
    // No bottom, and no hole or plate of its own.
    const half = buildVase(shade);
    expect(half.floor.thickness).toBe(0);
    expect(half.triangleCount).toBeLessThan(whole.triangleCount);
    expect(vaseNote(half.notes.find((note: string) => note.startsWith("Wandleuchte"))!)).toMatch(/^A wall light: the front half of the shade/);
  }, 120000);

  it("fills half the frame's depth, so the editor's box sits on it", () => {
    const frame = vaseNaturalFrame(normalizeParams(shade), 180, 180, 160);
    expect(frame.width).toBeCloseTo(180, 0);
    expect(frame.depth).toBeCloseTo(90, 0);
  });

  it("in vase mode is the solid half, whose flat back the slicer prints along; no plate then", () => {
    const solid = buildVase({ ...shade, body: "voll" });
    expect(openEdges(solid)).toBe(0);
    expect(reach(solid, 1).high).toBeCloseTo(0, 6);
    expect(vaseNote(solid.notes.find((note: string) => note.startsWith("Wandleuchte"))!)).toMatch(/^A wall light in vase mode/);
    expect(buildParts(normalizeParams({ ...shade, body: "voll" })).parts).toHaveLength(0);
  });

  it("has a back plate as a part of its own: the shade's outline, holes for screws and cable, and two strips to slip over", () => {
    const { parts } = buildParts(normalizeParams(shade));
    expect(parts.map((part: { id: string }) => part.id)).toEqual(["wandplatte"]);
    const plate = parts[0].mesh as Mesh;
    expect(openEdges(plate)).toBe(0);
    // Lying down as it is printed: as wide and high as the shade, 2.4 mm thick with strips 3.2 mm above that.
    expect(reach(plate, 0)).toEqual({ low: -90, high: 90 });
    expect(reach(plate, 1)).toEqual({ low: -80, high: 80 });
    expect(reach(plate, 2).low).toBe(0);
    expect(reach(plate, 2).high).toBeCloseTo(5.6, 6);
    // Three holes through it: two for screws of 4.5 mm, one of 8 mm for the cable.
    expect(parts[0].info).toContain("3 Löcher (Schrauben Ø 4,5 mm, Kabel Ø 8 mm)");
    // The drum's outline tapers from 162 mm at the bottom to 180 mm at the top: the plate without holes, and with its strips.
    const solidPlate = ((162 + 180) / 2) * 160 * 2.4;
    expect(volume(plate)).toBeGreaterThan(solidPlate - 400);
    expect(volume(plate)).toBeLessThan(solidPlate + 2 * 1.6 * 3.5 * 152);
    // Wider screws leave less plate.
    const wide = buildParts(normalizeParams({ ...shade, lampWallScrew: 8 })).parts[0].mesh as Mesh;
    expect(volume(wide)).toBeLessThan(volume(plate));
    // It is laid out beside the shade as an accessory of the vase.
    expect(vaseAccessories({ width: 180, depth: 90, height: 160, vase: normalizeParams(shade) }).map((accessory) => accessory.kind)).toEqual(["wallPlate"]);
  }, 60000);
});
