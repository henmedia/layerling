// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import manifoldModule, { type ManifoldToplevel } from "manifold-3d";
import { OcctKernel, type ShapeHandle } from "occt-wasm";
import { buildStrokedSketchSolid } from "@/lib/cadSketchStroke";
import { ICON_TAG_LAYERS, iconLayerProfile, iconSourceProfile, scaledIconProfile } from "@/lib/iconTag";
import { cadSketchRegions, silhouetteSketchProfile } from "@/lib/sketchCadProfile";
import { pathWire } from "@/lib/sketchCadWire";
import { filledGrowPockets, strokedSketchProfile } from "@/lib/sketchStroke";
import { sketchProfileFromSvg } from "@/lib/svgSketch";
import { DEFAULT_RASTER_TRACE_SEGMENTS, traceRaster } from "@/lib/rasterTrace";
import type { TextLayer } from "@/lib/textLayers";
import type { SketchProfile } from "@/types/layerling";

/*
 * The icon tag's layers built by the real OCCT kernel the way the editor builds a sketch body: the
 * silhouette first, a pocket that closes between wider parts filled by the polygon stroke, else
 * the exact stroke of the kernel, with the polygon stroke as its fallback.
 */

const KEYHOLE = `<svg xmlns="http://www.w3.org/2000/svg" width="60mm" height="80mm" viewBox="0 0 60 80">
  <g transform="translate(0,-217)">
    <path d="M 30.000236 217 A 30 30 0 0 0 0 247.00024 A 30 30 0 0 0 14.850256 272.89375 L 14.850256 296.99977 L 19.849951 296.99977 L 19.849951 271.99974 L 40.150004 271.99974 L 40.150004 296.99977 L 45.150216 296.99977 L 45.150216 272.89375 A 30 30 0 0 0 59.999955 247.00024 A 30 30 0 0 0 30.000236 217 z M 30.000236 226.99991 A 20 20 0 0 1 50.000049 247.00024 A 20 20 0 0 1 30.000236 267.00005 A 20 20 0 0 1 9.9999064 247.00024 A 20 20 0 0 1 30.000236 226.99991 z " />
  </g>
</svg>`;

/** Four bars round a square, 1 mm apart at the corners: 1.5 mm wider they close into a frame. */
const BARS = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><rect x="0" y="0" width="3" height="20"/><rect x="17" y="0" width="3" height="20"/><rect x="4" y="0" width="12" height="3"/><rect x="4" y="17" width="12" height="3"/></svg>`;

const HEIGHT = 4;

let cad: OcctKernel;
let runtime: ManifoldToplevel;

beforeAll(async () => {
  const wasm = join(dirname(fileURLToPath(import.meta.resolve("occt-wasm"))), "occt-wasm.wasm");
  cad = await OcctKernel.init({ wasm });
  runtime = await manifoldModule();
  runtime.setup();
});

/** An area as the worker extrudes it: one face per outline with its holes. */
function area(profile: SketchProfile): ShapeHandle {
  const solids = cadSketchRegions(profile).map((region) => {
    let face = cad.makeFace(pathWire(cad, region.outer));
    if (region.holes.length) face = cad.addHolesInFace(face, region.holes.map((hole) => pathWire(cad, hole)));
    return cad.extrude(face, 0, HEIGHT, 0);
  });
  return solids.length === 1 ? solids[0] : solids.reduce((all, solid) => cad.fuse(all, solid));
}

/** A layer's sketch body as cadShapeFromSketchProfile builds it. */
function build(profile: SketchProfile): ShapeHandle {
  const outline = profile.silhouette ? silhouetteSketchProfile(profile) : profile;
  const pockets = profile.stroke?.align === "grow" && profile.silhouette ? filledGrowPockets(runtime, outline) : null;
  let solid: ShapeHandle;
  if (pockets) solid = area(pockets);
  else if (profile.stroke) solid = buildStrokedSketchSolid(cad, outline, profile.stroke, HEIGHT) ?? area(strokedSketchProfile(runtime, outline)!);
  else solid = area(outline);
  expect(cad.isValid(solid)).toBe(true);
  return solid;
}

const layer = (grow: number, silhouette = false): TextLayer => ({ grow, height: 1, color: "#000000", ...(silhouette ? { silhouette: true } : {}) });
const size = (solid: ShapeHandle) => {
  const box = cad.getBoundingBox(solid);
  return [box.xmax - box.xmin, box.zmax - box.zmin];
};
const near = (value: number, expected: number) => expect(Math.abs(value / expected - 1)).toBeLessThan(0.01);

describe("icon tag layers with the real OCCT kernel", () => {
  it("builds the start layers of an SVG: each 1.5 mm wider all round, the plate without the hole", () => {
    const source = iconSourceProfile(sketchProfileFromSvg(KEYHOLE)!);
    const [icon, rim, plate] = ICON_TAG_LAYERS.map((entry) => build(iconLayerProfile(source, entry)));
    expect(size(icon)[0]).toBeCloseTo(60, 1);
    expect(size(icon)[1]).toBeCloseTo(80, 1);
    expect(size(rim)[0]).toBeCloseTo(63, 1);
    expect(size(rim)[1]).toBeCloseTo(83, 1);
    expect(size(plate)[0]).toBeCloseTo(66, 1);
    expect(size(plate)[1]).toBeCloseTo(86, 1);
    // The rim keeps the round hole, 1.5 mm smaller all round (radius 18.5); the plate has none.
    const rimFilled = build(iconLayerProfile(source, layer(1.5, true)));
    near(cad.getVolume(rimFilled) - cad.getVolume(rim), Math.PI * 18.5 * 18.5 * HEIGHT);
    near(cad.getVolume(build(iconLayerProfile(source, layer(3, true)))), cad.getVolume(plate));
  });

  it("scales the icon to the width asked for, the layers keep their steps", () => {
    const source = scaledIconProfile(iconSourceProfile(sketchProfileFromSvg(KEYHOLE)!), 0.5);
    expect(size(build(iconLayerProfile(source, ICON_TAG_LAYERS[0])))[0]).toBeCloseTo(30, 1);
    expect(size(build(iconLayerProfile(source, ICON_TAG_LAYERS[0])))[1]).toBeCloseTo(40, 1);
    expect(size(build(iconLayerProfile(source, ICON_TAG_LAYERS[2])))[0]).toBeCloseTo(36, 1);
  });

  it("closes a pocket between parts that touch once wider, on a layer without holes", () => {
    const source = iconSourceProfile(sketchProfileFromSvg(BARS)!);
    const rim = build(iconLayerProfile(source, layer(1.5)));
    const plate = build(iconLayerProfile(source, layer(1.5, true)));
    // The pocket is the square inside the bars, 1.5 mm smaller all round: 11 x 11 mm.
    near(cad.getVolume(plate) - cad.getVolume(rim), 11 * 11 * HEIGHT);
  });

  it("builds the layers of a traced picture of some 900 pieces in time (#359)", () => {
    // A cog of 60 teeth with 8 round holes, 600 px across: its trace has about 900 pieces.
    const side = 600;
    const data = new Uint8ClampedArray(side * side * 4).fill(255);
    for (let y = 0; y < side; y += 1) {
      for (let x = 0; x < side; x += 1) {
        const dx = x - 300;
        const dy = y - 300;
        const radius = Math.hypot(dx, dy);
        const tooth = 260 + 18 * Math.sign(Math.sin(Math.atan2(dy, dx) * 60));
        const hole = Array.from({ length: 8 }, (_, index) => (index / 8) * Math.PI * 2)
          .some((angle) => Math.hypot(dx - 160 * Math.cos(angle), dy - 160 * Math.sin(angle)) < 40);
        if (radius <= tooth && radius > 50 && !hole) data.fill(0, (y * side + x) * 4, (y * side + x) * 4 + 3);
      }
    }
    const trace = traceRaster({ width: side, height: side, data });
    expect(trace.rings).toBe(10);
    expect(trace.segments).toBeGreaterThan(800);
    expect(trace.segments).toBeLessThanOrEqual(DEFAULT_RASTER_TRACE_SEGMENTS);
    const source = scaledIconProfile(iconSourceProfile(sketchProfileFromSvg(trace.svg)!), 30 / side);
    const started = performance.now();
    const [icon, , plate] = ICON_TAG_LAYERS.map((entry) => build(iconLayerProfile(source, entry)));
    expect(performance.now() - started).toBeLessThan(30000);
    expect(size(icon)[0]).toBeCloseTo(30 * (2 * 278 + 1) / side, 0);
    expect(size(plate)[0]).toBeGreaterThan(size(icon)[0] + 5.9);
  });

  it("lays the plate under all of a traced QR code, whose big outline the kernel cannot move out (#1195)", () => {
    // The picture of the report: 29 modules of 20 px with 20 px of white round them.
    const modules = [
      "#######..###.#..#.##..#######", "#.....#.##.#..####.##.#.....#", "#.###.#..#..###.#..#..#.###.#", "#.###.#..##..###..##..#.###.#",
      "#.###.#.#.#...#..###..#.###.#", "#.....#..#...#...###..#.....#", "#######.#.#.#.#.#.#.#.#######", ".............##.##.##........",
      "#.#.#.#..#....####......#..#.", "..###..##.##..##....###..#..#", "#.#..##...##.#..#...##.##.###", ".#..#.....#.#..###...#.....#.",
      ".#..#.##.#.#.....#...##..#.##", "..##.#..##...#..##..###..#..#", "..###.#.....#.#.#......###.##", ".#..##.#..#####..###.....#.#.",
      "##....#.....#.#..#..###..#.##", "...###.#.####.#.###.#.#..##.#", "#..##.##.##..#...##..##....##", ".#.......#..#..#.#.###.#.#.#.",
      "#.##.##.##..#...##..#####....", "........##.#.#..#..##...#.###", "#######..####.#.#.###.#.##.##", "#.....#......##.###.#...##.##",
      "#.###.#.##.#..####..#####...#", "#.###.#...#...#..#.#....#.###", "#.###.#.#..........#.#.###..#", "#.....#.....#....####..##..#.",
      "#######.#.##..#..#.##.###..##",
    ];
    const side = 620;
    const data = new Uint8ClampedArray(side * side * 4).fill(255);
    modules.forEach((row, rowIndex) => [...row].forEach((module, column) => {
      if (module !== "#") return;
      for (let y = 20 + rowIndex * 20; y < 40 + rowIndex * 20; y += 1) {
        for (let x = 20 + column * 20; x < 40 + column * 20; x += 1) data.fill(0, (y * side + x) * 4, (y * side + x) * 4 + 3);
      }
    }));
    const source = scaledIconProfile(iconSourceProfile(sketchProfileFromSvg(traceRaster({ width: side, height: side, data }).svg)!), 50 / 580);
    const bottom = ICON_TAG_LAYERS[ICON_TAG_LAYERS.length - 1];
    const plate = build(iconLayerProfile(source, bottom));
    // The whole of it, as the polygon stroke of the outline without its holes has it: one area with no gap.
    const whole = strokedSketchProfile(runtime, silhouetteSketchProfile(iconLayerProfile(source, bottom)))!;
    near(cad.getVolume(plate), cad.getVolume(area(whole)));
  });
});
