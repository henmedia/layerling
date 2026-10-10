import { beforeAll, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import manifoldModule from "manifold-3d";
import { OcctKernel, type ShapeHandle } from "occt-wasm";
import type { WorkplaneShape } from "@/types/layerling";
import { textGlyphProfiles } from "@/lib/cadProfileExtrusion";
import { profileExtrusionSolid } from "@/lib/cadProfileSolid";
import { cadTransformRequiresGeneralTransform } from "@/lib/cadModifierRuntime";
import { rememberManifoldRuntime } from "@/lib/manifoldHandle";
import { addTextLayer, textLetterSizePatch } from "@/lib/nameTag";
import { loadTextFonts } from "@/lib/textFonts";
import { DEFAULT_TEXT_LAYERS, textLayerShapes } from "@/lib/textLayers";

/**
 * A name tag from the panel (#215) as exact bodies: the layers textLayers builds at the letter
 * size the panel sets, measured with the real OCCT kernel - the letters as tall as the letter
 * size, every lower layer holding the one above, and the letters taking edge treatments.
 */
let cad: OcctKernel;

beforeAll(async () => {
  const wasm = join(dirname(fileURLToPath(import.meta.resolve("occt-wasm"))), "occt-wasm.wasm");
  cad = await OcctKernel.init({ wasm });
  const runtime = await manifoldModule();
  runtime.setup();
  rememberManifoldRuntime(runtime);
  await loadTextFonts();
});

function text(extra: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return { id: "t", name: "Text", kind: "text", color: "#ffffff", x: 0, z: 0, elevation: 0, rotation: 0, width: 60, depth: 20, size: 60, height: 1.2, text: "Name", font: "Sans", ...extra } as WorkplaneShape;
}

const sized = (shape: WorkplaneShape, size: number) => ({ ...shape, ...textLetterSizePatch(shape, size) });

/** A layer's pieces as solids where the layer stands - letters apart from each other are pieces of their own. */
function layerPieces(layer: WorkplaneShape): ShapeHandle[] {
  const pieces = textGlyphProfiles(layer);
  expect(pieces).not.toBeNull();
  return pieces!.map(({ profile }) => {
    expect(profile).not.toBeNull();
    const local = profileExtrusionSolid(cad, profile!);
    const solid = !profile!.transform ? local : cadTransformRequiresGeneralTransform(profile!.transform) ? cad.generalTransform(local, profile!.transform) : cad.transform(local, profile!.transform);
    expect(cad.isValid(solid)).toBe(true);
    return solid;
  });
}

/** The whole layer as one shape. */
function layerSolid(layer: WorkplaneShape): ShapeHandle {
  const solids = layerPieces(layer);
  return solids.slice(1).reduce((all, solid) => cad.fuse(all, solid), solids[0]);
}

function topEdges(solid: ShapeHandle, top: number) {
  return cad.getSubShapes(solid, "edge").filter((edge) => {
    const box = cad.getBoundingBox(edge);
    return Math.abs(box.ymin - top) < 1e-6 && Math.abs(box.ymax - top) < 1e-6;
  });
}

describe("a name tag from the panel as exact bodies (#215, real OCCT kernel)", () => {
  it("the capitals stand as tall as the letter size", () => {
    for (const size of [9, 12, 20]) {
      const [letters] = textLayerShapes(sized(text({ text: "HI" }), size), DEFAULT_TEXT_LAYERS);
      const box = cad.getBoundingBox(layerSolid(letters));
      expect(box.zmax - box.zmin).toBeCloseTo(size, 2);
    }
  });

  it("five layers: each stands on the one below and lies inside it", () => {
    const layers = addTextLayer(addTextLayer(DEFAULT_TEXT_LAYERS));
    const parts = textLayerShapes(sized(text({ x: 15, z: -8, elevation: 2, rotation: 30 }), 12), layers);
    expect(parts).toHaveLength(5);
    const solids = parts.map(layerSolid);
    parts.forEach((part, index) => {
      const box = cad.getBoundingBox(solids[index]);
      expect(box.ymin).toBeCloseTo(part.elevation ?? 0, 4);
      expect(box.ymax).toBeCloseTo((part.elevation ?? 0) + part.height, 4);
      if (index === parts.length - 1) return;
      // Moved down onto the layer below, the upper layer leaves nothing outside it.
      const lower = parts[index + 1];
      expect(part.height).toBeLessThanOrEqual(lower.height);
      const dropped = cad.translate(solids[index], 0, (lower.elevation ?? 0) - (part.elevation ?? 0), 0);
      const outside = cad.getVolume(cad.cut(dropped, solids[index + 1]));
      expect(outside).toBeLessThan(1e-3 * cad.getVolume(dropped));
    });
    // The bottom layer is wider than the letters by its 6 mm all round (the tag is turned by 30°, so measured along its own axes).
    const turned = parts.map((part) => layerSolid({ ...part, rotation: 0, x: 0, z: 0 }));
    const letters = cad.getBoundingBox(turned[0]);
    const bottom = cad.getBoundingBox(turned[4]);
    expect((bottom.xmax - bottom.xmin) - (letters.xmax - letters.xmin)).toBeCloseTo(12, 1);
    expect((bottom.zmax - bottom.zmin) - (letters.zmax - letters.zmin)).toBeCloseTo(12, 1);
  });

  it("the letters take a fillet and a chamfer on their top edges", () => {
    const [letters] = textLayerShapes(sized(text(), 12), DEFAULT_TEXT_LAYERS);
    const top = (letters.elevation ?? 0) + letters.height;
    const pieces = layerPieces(letters);
    expect(pieces).toHaveLength(4); // N, a, m, e
    pieces.forEach((solid) => {
      const edges = topEdges(solid, top);
      expect(edges.length).toBeGreaterThan(3);
      for (const treated of [cad.fillet(solid, edges, 0.2), cad.chamfer(solid, edges, 0.2)]) {
        expect(cad.isValid(treated)).toBe(true);
        expect(cad.getVolume(treated)).toBeLessThan(cad.getVolume(solid));
      }
    });
  });

  it.each(["left", "right", "top"] as const)("the bottom layer with a key ring hole on the %s is one valid solid with the hole through it", (side) => {
    const parts = textLayerShapes(sized(text({ x: 6, z: -4, rotation: 20 }), 12), DEFAULT_TEXT_LAYERS, [], { side, diameter: 4 });
    const pieces = layerPieces(parts[2]);
    expect(pieces).toHaveLength(1);
    const solid = pieces[0];
    expect(cad.isSolid(solid)).toBe(true);
    // Where the hole is, in the world: from the plate's centre, the side's direction, turned with the tag.
    const letters = textLayerShapes(sized(text({ x: 6, z: -4, rotation: 20 }), 12), DEFAULT_TEXT_LAYERS)[0];
    const half = side === "top" ? letters.depth / 2 : letters.width / 2;
    const reach = half + 3 + 4.5;
    const local = side === "left" ? { x: -reach, z: 0 } : side === "right" ? { x: reach, z: 0 } : { x: 0, z: -reach };
    const angle = (20 * Math.PI) / 180;
    const at = (x: number, z: number) => ({ x: letters.x + x * Math.cos(angle) + z * Math.sin(angle), z: letters.z - x * Math.sin(angle) + z * Math.cos(angle) });
    const middle = at(local.x, local.z);
    const y = (parts[2].elevation ?? 0) + parts[2].height / 2;
    expect(cad.containsPoint(solid, { x: middle.x, y, z: middle.z })).toBe(false);
    // 3.3 mm from the hole's middle, away from the letters: inside the ear's 2.5 mm wall.
    const out = side === "left" ? { x: -reach - 3.3, z: 0 } : side === "right" ? { x: reach + 3.3, z: 0 } : { x: 0, z: -reach - 3.3 };
    const ear = at(out.x, out.z);
    expect(cad.containsPoint(solid, { x: ear.x, y, z: ear.z })).toBe(true);
  });
});
