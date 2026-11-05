import { beforeAll, describe, expect, it, vi } from "vitest";
import { cadModifierGridfinityForShape } from "@/lib/cadProfileExtrusion";
import { GRIDFINITY_LABEL_TEXT_HEIGHT, gridfinityLabelledTriangles, gridfinityLabelTextPlaces } from "@/lib/gridfinityGeometry";
import { gridfinityLabelLetters } from "@/lib/gridfinityLabelText";
import { gridfinityPartSolid } from "@/lib/gridfinitySolid";
import { rememberManifoldRuntime } from "@/lib/manifoldHandle";
import { loadTextFonts } from "@/lib/textFonts";
import type { WorkplaneShape } from "@/types/layerling";
import { cad, runtime, trianglesVolume } from "./helpers/gridfinityHarness";
import { lettersAreaAndMiddle } from "./helpers/gridfinityLetters";

/*
 * The letters on a Gridfinity bin's label shelves (Discussion #1308) in the exact body: built from the font's curves,
 * one glyph at a time, joined to the bin last, as much material as the display mesh draws, holes and all.
 */

beforeAll(async () => {
  await loadTextFonts();
  rememberManifoldRuntime(runtime);
});

function binShape(fields: Record<string, unknown> = {}) {
  return { id: "g", name: "bin", kind: "gridfinity", x: 0, z: 0, elevation: 0, size: 83.5, width: 83.5, depth: 41.5, height: 25.4, rotation: 0, color: "#4f7fa8", gridfinityType: "bin", gridfinityLip: true, ...fields } as WorkplaneShape;
}

/** The exact body with and without its letters, and what the letters add in the display mesh. */
function lettered(fields: Record<string, unknown>) {
  const shape = binShape(fields);
  const part = cadModifierGridfinityForShape(shape)!;
  expect(part.gridfinityLetters?.length).toBeGreaterThan(0);
  const solid = gridfinityPartSolid(cad, part);
  const plain = gridfinityPartSolid(cad, { ...part, gridfinityLetters: undefined });
  const exactGain = Math.abs(cad.getVolume(solid)) - Math.abs(cad.getVolume(plain));
  const meshGain = trianglesVolume(gridfinityLabelledTriangles(runtime, part, gridfinityLabelLetters(shape))) - trianglesVolume(gridfinityLabelledTriangles(runtime, part));
  return { part, solid, exactGain, meshGain };
}

function expectOneValidSolid(solid: ReturnType<typeof gridfinityPartSolid>, context: string) {
  expect(cad.isValid(solid), context).toBe(true);
  expect(cad.isSolid(solid) ? 1 : cad.getSubShapes(solid, "solid").length, context).toBe(1);
}

describe("letters on Gridfinity label shelves in the exact body", () => {
  it.each<[string, Record<string, unknown>]>([
    ["capitals and figures on the back shelf", { gridfinityLabelBack: true, gridfinityLabelBackText: "AB08" }],
    ["an O, whose hole stays open", { gridfinityLabelBack: true, gridfinityLabelBackText: "O" }],
    ["B, A and 8 in a bin mirrored across x", { gridfinityLabelBack: true, gridfinityLabelLeft: true, gridfinityLabelBackText: "BA8", gridfinityLabelLeftText: "OB", mirrorX: true }],
    ["Script, whose kerned letters run into one another", { gridfinityLabelBack: true, gridfinityLabelBackText: "office", gridfinityLabelFont: "Script" }],
    ["Stencil, drawn with straight segments", { gridfinityLabelFront: true, gridfinityLabelFrontText: "PARTS", gridfinityLabelFont: "Stencil" }],
    ["every wall's shelf", { gridfinityLabelBack: true, gridfinityLabelFront: true, gridfinityLabelLeft: true, gridfinityLabelRight: true, gridfinityLabelBackText: "Back", gridfinityLabelFrontText: "Front", gridfinityLabelLeftText: "Left", gridfinityLabelRightText: "Right" }],
    ["two compartments' labels", { gridfinityCompartmentsX: 2, gridfinityCompartmentLabels: [{ column: 0, row: 0, side: "back", text: "M3" }, { column: 1, row: 0, side: "right", text: "Nuts" }] }],
  ])("builds %s as one valid solid with the letters the display mesh has", (name, fields) => {
    const { solid, exactGain, meshGain } = lettered(fields);
    expectOneValidSolid(solid, name);
    // The mesh draws the curves as straight pieces inside them; a letter filled in or left out is far more.
    expect(exactGain / meshGain, name).toBeGreaterThan(0.995);
    expect(exactGain / meshGain, name).toBeLessThan(1.03);
  });

  it.each<[string, Record<string, unknown>]>([
    ["on the back shelf", { gridfinityLabelBack: true, gridfinityLabelBackText: "Lg7" }],
    ["on the left shelf", { gridfinityLabelLeft: true, gridfinityLabelLeftText: "LP2" }],
    ["on the left shelf of a bin mirrored across x", { gridfinityLabelLeft: true, gridfinityLabelLeftText: "LP2", mirrorX: true }],
    ["against a compartment's divider", { gridfinityCompartmentsX: 2, gridfinityCompartmentLabels: [{ column: 1, row: 0, side: "right", text: "Lq" }] }],
  ])("puts the exact letters %s where the display mesh has them", (name, fields) => {
    const shape = binShape(fields);
    const solid = gridfinityPartSolid(cad, cadModifierGridfinityForShape(shape)!);
    const [place] = gridfinityLabelTextPlaces(shape);
    const shown = lettersAreaAndMiddle(gridfinityLabelLetters(shape));
    // The exact body's material above the shelf's top, over the room for the letters.
    const half = { x: (Math.abs(place.along.x) * place.length + Math.abs(place.up.x) * place.height) / 2, z: (Math.abs(place.along.z) * place.length + Math.abs(place.up.z) * place.height) / 2 };
    const above = cad.common(solid, cad.translate(cad.makeBox(2 * half.x, 0.38, 2 * half.z), place.centre.x - half.x, place.top + 0.01, place.centre.z - half.z));
    const middle = cad.getCenterOfMass(above);
    expect(Math.abs(cad.getVolume(above)) / 0.38 / shown.area, name).toBeGreaterThan(0.99);
    expect(Math.abs(cad.getVolume(above)) / 0.38 / shown.area, name).toBeLessThan(1.03);
    expect(Math.abs(middle.x - shown.x), name).toBeLessThan(0.05);
    expect(Math.abs(middle.z - shown.z), name).toBeLessThan(0.05);
  });

  it("refuses a body whose fuse lost the letters, which the STEP export would leave out without a word", () => {
    // Seven glyphs: no other fuse of this bin has eight shapes.
    const part = cadModifierGridfinityForShape(binShape({ gridfinityLabelBack: true, gridfinityLabelBackText: "ABCDEFG" }))!;
    const glyphs = part.gridfinityLetters!.reduce((sum, label) => sum + label.glyphs.length, 0);
    const fuseAll = cad.fuseAll.bind(cad);
    // The kernel's fuse of the bin and its letters hands the bin back as it was.
    const spy = vi.spyOn(cad, "fuseAll").mockImplementation((shapes) => (shapes.length === 1 + glyphs ? shapes[0] : fuseAll(shapes)));
    try {
      expect(() => gridfinityPartSolid(cad, part)).toThrow(/letters could not be joined/);
    } finally {
      spy.mockRestore();
    }
  });

  it("stands the letters 0.4 mm on the shelf's top, 20.55 mm up in a bin of 3 units", () => {
    const { solid } = lettered({ gridfinityLabelBack: true, gridfinityLabelBackText: "HHH" });
    // What stands above the shelf's top over the back shelf, clear of the walls.
    const above = cad.common(solid, cad.translate(cad.makeBox(60, 1, 10), -30, 20.2, -17));
    const box = cad.getBoundingBox(above);
    expect(box.ymax).toBeCloseTo(20.15 + GRIDFINITY_LABEL_TEXT_HEIGHT, 4);
    expect(box.ymin).toBeCloseTo(20.2, 4);
  });
});
