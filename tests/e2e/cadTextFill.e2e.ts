import { beforeAll, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import manifoldModule from "manifold-3d";
import { OcctKernel } from "occt-wasm";
import type { SketchStroke, WorkplaneShape } from "@/types/layerling";
import { textGlyphProfiles } from "@/lib/cadProfileExtrusion";
import { profileExtrusionSolid } from "@/lib/cadProfileSolid";
import { cadTransformRequiresGeneralTransform } from "@/lib/cadModifierRuntime";
import { rememberManifoldRuntime } from "@/lib/manifoldHandle";
import { textFillComponents, type TextFillComponent } from "@/lib/textFill";
import { loadTextFonts } from "@/lib/textFonts";

/**
 * Text fill modes (#215) as exact bodies: every loose piece a stroked, widened or silhouetted
 * text falls into reaches the kernel as a straight-line extrusion, valid and with the volume
 * its outline gives. Plain text keeps its glyph outlines with the font's curves.
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
    id: "t", name: "Text", kind: "text", color: "#cf101b", x: 12, z: -7, elevation: 3, rotation: 30,
    width: 60, depth: 24, size: 60, height: 6, text: "AB", ...extra,
  } as WorkplaneShape;
}

const stroke = (align: SketchStroke["align"], width: number): SketchStroke => ({ width, align, join: "round", cap: "flat" });

const ringArea = (points: { x: number; z: number }[]) => Math.abs(points.reduce((sum, point, index) => {
  const next = points[(index + 1) % points.length];
  return sum + point.x * next.z - next.x * point.z;
}, 0) / 2);
const componentArea = ({ outer, holes }: TextFillComponent) => ringArea(outer) - holes.reduce((sum, hole) => sum + ringArea(hole), 0);

function solidOf(part: NonNullable<ReturnType<typeof textGlyphProfiles>>[number]["profile"]) {
  expect(part).not.toBeNull();
  const local = profileExtrusionSolid(cad, part!);
  const transform = part!.transform;
  return !transform ? local : cadTransformRequiresGeneralTransform(transform) ? cad.generalTransform(local, transform) : cad.transform(local, transform);
}

describe("text fill modes as exact bodies (#215, real OCCT kernel)", () => {
  it.each([
    ["widened letters", { textStroke: stroke("grow", 1.5) }],
    ["an outside stroke", { textStroke: stroke("outside", 1) }],
    ["an inside stroke", { textStroke: stroke("inside", 0.8) }],
    ["a centred stroke", { textStroke: stroke("center", 1.2) }],
    ["the silhouette", { textSilhouette: true }],
    ["widened silhouette, letters run together", { textStroke: stroke("grow", 4), textSilhouette: true }],
  ] as const)("%s: every piece is a valid solid with its outline's volume", (_label, extra) => {
    const shape = text(extra);
    const pieces = textGlyphProfiles(shape);
    const components = textFillComponents(runtime, shape);
    expect(pieces).not.toBeNull();
    expect(components).not.toBeNull();
    expect(pieces!.length).toBe(components!.length);
    pieces!.forEach((piece, index) => {
      expect(piece.triangleCount).toBeGreaterThan(0);
      const solid = solidOf(piece.profile);
      expect(cad.isValid(solid)).toBe(true);
      const volume = cad.getVolume(solid);
      const expected = componentArea(components![index]) * shape.height;
      expect(Math.abs(volume - expected) / expected).toBeLessThan(1e-4);
      // The body stands where the text stands: its foot at the elevation, its top a height up.
      const bounds = cad.getBoundingBox(solid);
      expect(bounds.ymin).toBeCloseTo(3, 3);
      expect(bounds.ymax).toBeCloseTo(9, 3);
    });
  });

  it("widened letters that touch are one piece, and the whole fits the text's box", () => {
    const shape = text({ text: "III", textStroke: stroke("grow", 5), rotation: 0, x: 0, z: 0 });
    const pieces = textGlyphProfiles(shape)!;
    expect(pieces).toHaveLength(1);
    const solid = solidOf(pieces[0].profile);
    const bounds = cad.getBoundingBox(solid);
    expect(bounds.xmax - bounds.xmin).toBeLessThanOrEqual(60.01);
    expect(bounds.zmax - bounds.zmin).toBeCloseTo(24, 0);
  });

  it("plain text still comes as its glyphs with the font's curves", () => {
    const pieces = textGlyphProfiles(text())!;
    expect(pieces).toHaveLength(2);
    // The A is all straight lines; the B brings the font's curves.
    expect(pieces.some((piece) => piece.profile!.loops.some((loop) => loop.segments.some((segment) => segment.kind === "bezier")))).toBe(true);
    pieces.forEach((piece) => expect(cad.isValid(solidOf(piece.profile))).toBe(true));
  });
});
