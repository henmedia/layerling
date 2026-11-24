// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { OcctKernel } from "occt-wasm";
import { cadSketchRegions } from "@/lib/sketchCadProfile";
import { pathWire } from "@/lib/sketchCadWire";
import { analyzeTriangleSoup, importedShapeFromSvg } from "@/lib/svgImport";
import { sketchProfileFromSvg, svgSketchIsClosed, withoutSliverRings } from "@/lib/svgSketch";
import type { SketchProfile, WorkplaneShape } from "@/types/layerling";

/* Discussion #2045: a sliver in a drawing left the exact body open, and strokes whose ends meet were refused as open. */

const svg = (body: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1444 613">${body}</svg>`;

// The sliver of the reported file: out along one curve and almost the same way back.
const SLIVER = `<path d="M479.95,201.02C481.6,186.84 485.32,172.72 492.26,160.18C486.066,173.105 481.6,186.84 479.95,201.02Z"/>`;
const PLATE = `<path d="M600,100L900,100L900,300L600,300Z"/>`;

let cad: OcctKernel;

beforeAll(async () => {
  cad = await OcctKernel.init({ wasm: join(dirname(fileURLToPath(import.meta.resolve("occt-wasm"))), "occt-wasm.wasm") });
});

/** The body as the sketch worker builds it, only as far as its mesh. */
function body(profile: SketchProfile): WorkplaneShape {
  const positions: number[] = [];
  for (const region of cadSketchRegions(profile)) {
    let face = cad.makeFace(pathWire(cad, region.outer));
    if (region.holes.length) face = cad.addHolesInFace(face, region.holes.map((hole) => pathWire(cad, hole)));
    const mesh = cad.tessellate(cad.extrude(face, 0, 4, 0), { linearDeflection: 0.02, angularDeflection: 0.1 });
    for (const index of mesh.indices) positions.push(mesh.positions[3 * index], mesh.positions[3 * index + 1], mesh.positions[3 * index + 2]);
  }
  return { importedMesh: { positions } } as unknown as WorkplaneShape;
}

describe("an SVG with a sliver (#2045)", () => {
  it("is open as drawn, and closed without the sliver", () => {
    const profile = sketchProfileFromSvg(svg(PLATE + SLIVER))!;
    expect(svgSketchIsClosed(body(profile))).toBe(false);
    const cleaned = withoutSliverRings(profile)!;
    expect(cadSketchRegions(cleaned)).toHaveLength(1);
    expect(svgSketchIsClosed(body(cleaned))).toBe(true);
  });

  it("has nothing to leave out in a drawing without slivers, or of nothing else", () => {
    expect(withoutSliverRings(sketchProfileFromSvg(svg(PLATE))!)).toBeNull();
    expect(withoutSliverRings(sketchProfileFromSvg(svg(SLIVER))!)).toBeNull();
    // A thin bar is drawn on purpose.
    expect(withoutSliverRings(sketchProfileFromSvg(svg(PLATE + `<path d="M0,0L100,0L100,2L0,2Z"/>`))!)).toBeNull();
  });
});

describe("open strokes whose ends meet (#2045)", () => {
  const stroke = (d: string) => svg(`<path d="${d}" style="fill:none;stroke:black;stroke-width:1px;"/>`);
  const volume = (d: string) => analyzeTriangleSoup(importedShapeFromSvg("a.svg", stroke(d)).importedMesh!.positions).volume;
  const whole = "M0,0L100,0C140,40 140,60 100,100L0,100Z";

  it("make the same body as the outline drawn in one go, whichever way they run", () => {
    expect(volume("M0,0L100,0C140,40 140,60 100,100M100,100L0,100L0,0")).toBeCloseTo(volume(whole), 3);
    expect(volume("M0,0L100,0C140,40 140,60 100,100M0,0L0,100L100,100")).toBeCloseTo(volume(whole), 3);
    expect(volume("M100,100L0,100M0,0L0,100M100,100C140,60 140,40 100,0M0,0L100,0")).toBeCloseTo(volume(whole), 3);
  });

  it("become a sketch too", () => {
    const profile = sketchProfileFromSvg(stroke("M0,0L100,0C140,40 140,60 100,100M0,0L0,100L100,100"))!;
    expect(svgSketchIsClosed(body(profile))).toBe(true);
  });

  it("stay open where they leave a gap or three ends meet", () => {
    expect(() => volume("M0,0L100,0L100,100M99,100L0,100L0,0")).toThrow(/open strokes/);
    expect(() => volume("M0,0L100,0L100,100M100,100L0,100L0,0M0,0L-50,-50L-60,-20")).toThrow(/open strokes/);
  });
});
