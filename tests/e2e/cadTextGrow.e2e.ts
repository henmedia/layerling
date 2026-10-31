import { beforeAll, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import manifoldModule from "manifold-3d";
import { OcctKernel } from "occt-wasm";
import type { SketchStroke, WorkplaneShape } from "@/types/layerling";
import { textGlyphProfiles } from "@/lib/cadProfileExtrusion";
import { grownProfileSolid, profileExtrusionSolid } from "@/lib/cadProfileSolid";
import { rememberManifoldRuntime } from "@/lib/manifoldHandle";
import { loadTextFonts } from "@/lib/textFonts";
import { NAME_TAG_LAYERS } from "@/lib/nameTag";
import { textLayerShapes } from "@/lib/textLayers";
import { textOffsetAsFill } from "@/lib/textFillChoice";

/**
 * A widened text as an exact body (#215): the letters' own outlines moved out by the kernel, so the
 * walls are single curves and the edge tool can fillet them - where the polygon outline of the same
 * body is hundreds of short straight pieces that it cannot.
 */
let cad: OcctKernel;
let runtime: Awaited<ReturnType<typeof manifoldModule>>;

beforeAll(async () => {
  const wasm = join(dirname(fileURLToPath(import.meta.resolve("occt-wasm"))), "occt-wasm.wasm");
  cad = await OcctKernel.init({ wasm });
  runtime = await manifoldModule();
  runtime.setup();
  rememberManifoldRuntime(runtime);
  await loadTextFonts();
});

function text(extra: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return {
    id: "t", name: "Text", kind: "text", color: "#cf101b", x: 0, z: 0, elevation: 0, rotation: 0,
    width: 80, depth: 30, size: 80, height: 1.2, text: "Name", ...extra,
  } as WorkplaneShape;
}
const grow = (width: number): SketchStroke => ({ width, align: "grow", join: "round", cap: "flat" });

function parts(shape: WorkplaneShape) {
  const pieces = textGlyphProfiles(shape);
  expect(pieces).not.toBeNull();
  return pieces!.map((piece) => piece.profile!);
}

/** The same piece without the kernel's widening: the polygon outline. */
const polygonVersion = (part: ReturnType<typeof parts>[number]) => ({ ...part, grow: undefined });

const faceCount = (solid: Parameters<OcctKernel["getSubShapes"]>[0]) => cad.getSubShapes(solid, "face").length;

describe("a widened text as an exact body (#215, real OCCT kernel)", () => {
  it("the letters with counters, 1.5 mm wider: a few dozen faces, not hundreds", () => {
    const shape = text({ textStroke: grow(1.5) });
    const found = parts(shape);
    expect(found.every((part) => part.grow)).toBe(true);
    found.forEach((part) => {
      const exact = grownProfileSolid(cad, part);
      const polygons = profileExtrusionSolid(cad, polygonVersion(part));
      expect(cad.isValid(exact)).toBe(true);
      expect(faceCount(exact)).toBeLessThan(faceCount(polygons) / 3);
      // The same body: the polygon outline only approximates the round corners.
      expect(Math.abs(cad.getVolume(exact) - cad.getVolume(polygons)) / cad.getVolume(polygons)).toBeLessThan(0.02);
    });
  });

  it("the silhouette, 3 mm wider: the letters run together into one piece without a pocket", () => {
    const shape = text({ textStroke: grow(3), textSilhouette: true, height: 2 });
    const found = parts(shape);
    expect(found).toHaveLength(1);
    expect(found[0].grow?.silhouette).toBe(true);
    const exact = profileExtrusionSolid(cad, found[0]);
    expect(cad.isValid(exact)).toBe(true);
    const top = cad.getSubShapes(exact, "face").filter((face) => {
      const box = cad.getBoundingBox(face);
      return Math.abs(box.ymin - 2) < 1e-6 && Math.abs(box.ymax - 2) < 1e-6;
    });
    expect(top).toHaveLength(1);
    expect(cad.getSubShapes(top[0], "wire")).toHaveLength(1);
  });

  it("the top edges of a name tag's widened layers take a fillet - the polygon outline's did not", () => {
    // "Name" as the editor builds it: the red rim 1.5 mm wider, the black plate 3 mm wider without holes.
    const source = text({ width: 86, depth: 28, size: 86, height: 1.2, font: "Sans" });
    const [, rim, plate] = textLayerShapes(source, NAME_TAG_LAYERS);
    const topEdges = (solid: Parameters<OcctKernel["getSubShapes"]>[0], height: number) => cad.getSubShapes(solid, "edge").filter((edge) => {
      const box = cad.getBoundingBox(edge);
      return Math.abs(box.ymin - height) < 1e-6 && Math.abs(box.ymax - height) < 1e-6;
    });
    // The letters "a", "N" and "m" and the whole plate (the "e" with its counter stays out of reach of the kernel's fillet at this size).
    const bodies = [...parts(rim).slice(0, 3), ...parts(plate)];
    expect(bodies).toHaveLength(4);
    bodies.forEach((part) => {
      expect(part.grow).toBeDefined();
      const exact = grownProfileSolid(cad, part);
      const rounded = cad.fillet(exact, topEdges(exact, part.height), 0.3);
      expect(cad.isValid(rounded)).toBe(true);
      expect(cad.getVolume(rounded)).toBeLessThan(cad.getVolume(exact));
      // A few dozen edges round the letters, not the hundreds of the polygon outline.
      expect(topEdges(exact, part.height).length).toBeLessThan(100);
    });
  });

  it("a key ring tab or a bevelled corner keeps the polygon outline", () => {
    expect(parts(text({ textStroke: { ...grow(1.5), join: "bevel" } })).every((part) => !part.grow)).toBe(true);
    expect(parts(text({ textStroke: grow(1.5), textKeyring: { side: "left", diameter: 3, offset: 0, ear: true } })).every((part) => !part.grow)).toBe(true);
  });

  it("the letters the kernel's offset trips over, offset as a fill instead (Discussion #1037)", () => {
    const plain = text({ text: "ABMNW9", height: 10 });
    const volumes = (shape: WorkplaneShape) => parts(shape).map((part) => {
      const solid = profileExtrusionSolid(cad, part);
      expect(cad.isValid(solid)).toBe(true);
      return cad.getVolume(solid);
    });
    const total = (list: number[]) => list.reduce((sum, volume) => sum + volume, 0);
    const before = volumes(plain);
    expect(before).toHaveLength(6);
    for (const edges of ["round", "sharp"] as const) {
      const wider = volumes(textOffsetAsFill(plain, 0.2, false, edges)!);
      // Every letter a body of its own, 0.4 mm taller and wider all round (the pieces come in another order).
      expect(wider).toHaveLength(6);
      expect(total(wider)).toBeGreaterThan(total(before) * 1.04);
    }
    const narrower = volumes(textOffsetAsFill(plain, 0.2, true, "round")!);
    expect(narrower).toHaveLength(6);
    expect(total(narrower)).toBeLessThan(total(before) * 0.96);
  });
});

