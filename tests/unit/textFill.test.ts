import * as THREE from "three";
import manifoldModule, { type ManifoldToplevel } from "manifold-3d";
import { beforeAll, describe, expect, it } from "vitest";
import { loadTextFonts } from "@/lib/textFonts";
import { textFillClosedGeometry, textFillComponents, textFillPieceGeometry, textHasFill, type TextFillComponent } from "@/lib/textFill";
import { textFillExtent, textFillPatch, textLetterBox } from "@/lib/textGeometry";
import { textOffsetAsFill } from "@/lib/textFillChoice";
import type { SketchStroke, WorkplaneShape } from "@/types/layerling";

// #215: fill modes for the Text shape - stroke outside/inside/centred, "Wider" and the silhouette.
let runtime: ManifoldToplevel;

beforeAll(async () => {
  runtime = await manifoldModule();
  runtime.setup();
  await loadTextFonts();
});

function text(overrides: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return {
    id: "t", name: "Text", kind: "text", color: "#f00", x: 0, z: 0, rotation: 0,
    width: 40, depth: 20, height: 5, size: 40, text: "O", ...overrides,
  };
}

const stroke = (align: SketchStroke["align"], width = 2): SketchStroke => ({ width, align, join: "miter", cap: "flat" });

const ringArea = (points: { x: number; z: number }[]) => Math.abs(points.reduce((sum, point, index) => {
  const next = points[(index + 1) % points.length];
  return sum + point.x * next.z - next.x * point.z;
}, 0) / 2);
const area = (components: TextFillComponent[]) => components.reduce((sum, { outer, holes }) => sum + ringArea(outer) - holes.reduce((inner, hole) => inner + ringArea(hole), 0), 0);
const bounds = (components: TextFillComponent[]) => {
  const points = components.flatMap((component) => component.outer);
  return {
    width: Math.max(...points.map((point) => point.x)) - Math.min(...points.map((point) => point.x)),
    depth: Math.max(...points.map((point) => point.z)) - Math.min(...points.map((point) => point.z)),
  };
};

describe("text fill modes (#215)", () => {
  it("only a stroke or the silhouette takes the fill path", () => {
    expect(textHasFill(text())).toBe(false);
    expect(textHasFill(text({ textStroke: stroke("outside") }))).toBe(true);
    expect(textHasFill(text({ textSilhouette: true }))).toBe(true);
    expect(textFillComponents(runtime, text())).toBeNull();
  });

  it("the letters are fitted into the box less the fill's reach, so the body fills the box", () => {
    expect(textFillExtent({ textStroke: stroke("outside", 2) })).toBe(2);
    expect(textFillExtent({ textStroke: stroke("grow", 1.5) })).toBe(1.5);
    expect(textFillExtent({ textStroke: stroke("center", 2) })).toBe(1);
    expect(textFillExtent({ textStroke: stroke("inside", 2) })).toBe(0);
    expect(textFillExtent({})).toBe(0);
    expect(textLetterBox(text({ textStroke: stroke("grow", 1.5) }))).toEqual({ width: 37, depth: 17 });

    const grown = textFillComponents(runtime, text({ textStroke: stroke("grow", 1.5) }))!;
    const box = bounds(grown);
    // The "O" is limited by the box's depth: 17 tall plus 1.5 all round.
    expect(box.depth).toBeCloseTo(20, 0);
    expect(box.width).toBeLessThanOrEqual(40.01);
  });

  it("an outside stroke is a ring round the letter, and 'Wider' the letter grown by the width", () => {
    const grown = textFillComponents(runtime, text({ textStroke: stroke("grow", 1) }))!;
    const outside = textFillComponents(runtime, text({ textStroke: stroke("outside", 1) }))!;
    const centred = textFillComponents(runtime, text({ textStroke: stroke("center", 1) }))!;
    const inside = textFillComponents(runtime, text({ textStroke: stroke("inside", 1) }))!;
    // The same letters in every case (same box less 1 all round for grow/outside, less 0.5 for centred, 0 for inside) - so
    // compare shapes, not sizes: the "O" grown keeps one hole, an outside stroke adds a second ring round it.
    expect(grown).toHaveLength(1);
    expect(grown[0].holes).toHaveLength(1);
    // A stroke follows both edges of the O: a frame round the outside and a frame round the counter, two rings each.
    expect(outside).toHaveLength(2);
    expect(inside).toHaveLength(2);
    outside.forEach((ring) => expect(ring.holes).toHaveLength(1));
    expect(area(outside)).toBeGreaterThan(0);
    expect(area(inside)).toBeGreaterThan(0);
    expect(area(centred)).toBeGreaterThan(0);
    // The grown letter holds more than the ring round it alone.
    expect(area(grown)).toBeGreaterThan(area(outside));
  });

  it("the silhouette drops the counter, and widened letters that touch become one piece", () => {
    const silhouette = textFillComponents(runtime, text({ textSilhouette: true }))!;
    expect(silhouette).toHaveLength(1);
    expect(silhouette[0].holes).toHaveLength(0);
    const plainO = textFillComponents(runtime, text({ textStroke: stroke("inside", 0.5) }))!;
    expect(area(silhouette)).toBeGreaterThan(area(plainO));

    const apart = textFillComponents(runtime, text({ text: "I I", width: 40, textStroke: stroke("grow", 0.3) }))!;
    const joined = textFillComponents(runtime, text({ text: "I I", width: 40, textStroke: stroke("grow", 6) }))!;
    expect(apart).toHaveLength(2);
    expect(joined).toHaveLength(1);
  });

  it("every piece becomes a closed body of the text's height", () => {
    const components = textFillComponents(runtime, text({ text: "AB", textStroke: stroke("outside", 1) }))!;
    for (const component of components) {
      const geometry = textFillPieceGeometry(component, 5);
      geometry.computeBoundingBox();
      expect(geometry.boundingBox!.min.y).toBeCloseTo(0, 6);
      expect(geometry.boundingBox!.max.y).toBeCloseTo(5, 6);
      // Walls plus two caps: a count that is a multiple of three positions per triangle.
      expect(geometry.getAttribute("position").count % 3).toBe(0);
      geometry.dispose();
    }
  });

  it("a changed fill moves the box and leaves the letters alone", () => {
    const plain = text({ width: 40, depth: 20 });
    const grown = textFillPatch(plain, { textStroke: stroke("grow", 1.5) });
    expect(grown).toMatchObject({ width: 43, depth: 23, size: 43 });
    const back = textFillPatch({ ...plain, ...grown } as WorkplaneShape, { textStroke: undefined });
    expect(back).toMatchObject({ width: 40, depth: 20, size: 40 });
    // Inside stays within the letters' box; the silhouette alone changes nothing.
    expect(textFillPatch(plain, { textStroke: stroke("inside", 2) })).toEqual({ textStroke: stroke("inside", 2) });
    expect(textFillPatch(plain, { textSilhouette: true })).toEqual({ textSilhouette: true });
  });
});

// #352: a line round a block font made a mesh with gaps along letters that touch, which the 3D kernel refused
// ("not manifold"), so the text could not be cut out of a plate. The 2D kernel extrudes the region instead.
describe("the closed body of a text fill (#352)", () => {
  const openEdges = (geometry: THREE.BufferGeometry) => {
    const position = geometry.getAttribute("position");
    const index = geometry.index;
    const count = index ? index.count : position.count;
    const at = (k: number) => (index ? index.getX(k) : k);
    const key = (i: number) => [position.getX(i), position.getY(i), position.getZ(i)].map((value) => Math.round(value * 1e4)).join(",");
    const edges = new Map<string, number>();
    for (let t = 0; t < count; t += 3) {
      for (const [a, b] of [[0, 1], [1, 2], [2, 0]]) {
        const from = key(at(t + a));
        const to = key(at(t + b));
        if (from !== to) edges.set(`${from}>${to}`, (edges.get(`${from}>${to}`) ?? 0) + 1);
      }
    }
    let open = 0;
    edges.forEach((times, edge) => {
      const [from, to] = edge.split(">");
      if ((edges.get(`${to}>${from}`) ?? 0) !== times) open += 1;
    });
    return open;
  };
  const volume = (geometry: THREE.BufferGeometry) => {
    const position = geometry.getAttribute("position");
    const index = geometry.index;
    const count = index ? index.count : position.count;
    const at = (k: number) => (index ? index.getX(k) : k);
    const point = (i: number) => new THREE.Vector3(position.getX(i), position.getY(i), position.getZ(i));
    let total = 0;
    for (let t = 0; t < count; t += 3) total += point(at(t)).dot(new THREE.Vector3().crossVectors(point(at(t + 1)), point(at(t + 2)))) / 6;
    return total;
  };

  it.each(["outside", "inside", "center", "grow"] as const)("is closed, stands on the floor and faces outward (%s)", (align) => {
    const shape = text({ text: "PIERCE COUNTY", width: 160, depth: 25, height: 1.5, textStroke: stroke(align) });
    const geometry = textFillClosedGeometry(runtime, shape);
    expect(geometry).not.toBeNull();
    expect(openEdges(geometry!)).toBe(0);
    const box = geometry!.boundingBox!;
    expect(box.min.y).toBeCloseTo(0, 6);
    expect(box.max.y).toBeCloseTo(1.5, 6);
    // Faces outward: the signed volume is positive, and equals the area of the pieces times the height.
    const components = textFillComponents(runtime, shape)!;
    expect(volume(geometry!)).toBeGreaterThan(0);
    expect(volume(geometry!)).toBeCloseTo(area(components) * 1.5, 0);
  });

  it("has nothing to give a text without a fill mode", () => {
    expect(textFillClosedGeometry(runtime, text({ text: "O" }))).toBeNull();
  });
});

describe("offsetting a text through its outlines (Discussion #1037)", () => {
  it("grows the letters by the distance and the text by as much at both ends", () => {
    const shape = text({ text: "ABMNW9", elevation: 2, height: 10 });
    const grown = textOffsetAsFill(shape, 0.2, false, "round")!;
    expect(grown.textStroke).toEqual({ width: 0.2, align: "grow", join: "round", cap: "flat" });
    expect(grown.height).toBeCloseTo(10.4, 9);
    expect(grown.elevation).toBeCloseTo(1.8, 9);
    // The box takes the fill: 0.2 mm more on every side, the letters stay where they are.
    expect(grown.width).toBeCloseTo(shape.width + 0.4, 6);
    expect(grown.depth).toBeCloseTo(shape.depth + 0.4, 6);
    expect(textOffsetAsFill(shape, 0.2, false, "sharp")!.textStroke?.join).toBe("miter");
  });

  it("shrinks them the other way", () => {
    const shrunk = textOffsetAsFill(text({ elevation: 0, height: 10 }), 0.5, true, "round")!;
    expect(shrunk.textStroke?.align).toBe("shrink");
    expect(shrunk.height).toBeCloseTo(9, 9);
    expect(shrunk.elevation).toBeCloseTo(0.5, 9);
  });

  it("keeps the height and place when only the sides move (Discussion #1057)", () => {
    const shape = text({ text: "ABMNW9", elevation: 2, height: 10 });
    const grown = textOffsetAsFill(shape, 0.2, false, "round", true)!;
    expect(grown.textStroke?.align).toBe("grow");
    expect(grown.height).toBe(10);
    expect(grown.elevation).toBe(2);
    expect(grown.width).toBeCloseTo(shape.width + 0.4, 6);
    const shrunk = textOffsetAsFill(shape, 0.5, true, "round", true)!;
    expect(shrunk.height).toBe(10);
    expect(shrunk.elevation).toBe(2);
  });

  it("leaves texts with a fill or rounded lettering, other shapes and too small or large distances alone", () => {
    expect(textOffsetAsFill(text({ textStroke: stroke("outside") }), 0.2, false, "round")).toBeNull();
    expect(textOffsetAsFill(text({ bevel: 0.5 }), 0.2, false, "round")).toBeNull();
    expect(textOffsetAsFill(text({ kind: "box" }), 0.2, false, "round")).toBeNull();
    expect(textOffsetAsFill(text(), 0.01, false, "round")).toBeNull();
    expect(textOffsetAsFill(text({ height: 5 }), 3, true, "round")).toBeNull();
  });
});

