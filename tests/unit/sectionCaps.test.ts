import { describe, expect, it } from "vitest";
import type { SectionLoop } from "@/lib/sectionSvg";
import { normalizeSectionCutFace, sectionCapArea, sectionCapMesh, sectionHatchSpacing, sectionHatchTexels, sectionHatchTurned, sectionHatchUvs } from "@/lib/sectionCaps";

const square = (u: number, v: number, size: number, closed = true): SectionLoop => ({
  points: [{ u, v }, { u: u + size, v }, { u: u + size, v: v + size }, { u, v: v + size }],
  closed,
});

describe("the filled cut of the section view (#516)", () => {
  it("fills a solid", () => {
    expect(sectionCapArea(sectionCapMesh([square(0, 0, 10)]))).toBeCloseTo(100, 6);
  });

  it("leaves a hole inside a solid empty (#516)", () => {
    const mesh = sectionCapMesh([square(0, 0, 20), square(5, 5, 10)]);
    expect(sectionCapArea(mesh)).toBeCloseTo(400 - 100, 6);
  });

  it("fills a body that lies inside a hole again", () => {
    const mesh = sectionCapMesh([square(0, 0, 30), square(5, 5, 20), square(10, 10, 10)]);
    expect(sectionCapArea(mesh)).toBeCloseTo(900 - 400 + 100, 6);
  });

  it("fills separate bodies and a wall with two holes", () => {
    const mesh = sectionCapMesh([square(0, 0, 30), square(5, 5, 8), square(17, 5, 8), square(100, 0, 10)]);
    expect(sectionCapArea(mesh)).toBeCloseTo(900 - 64 - 64 + 100, 6);
  });

  it("ignores open lines and outlines without area", () => {
    expect(sectionCapMesh([square(0, 0, 10, false), { points: [{ u: 0, v: 0 }, { u: 5, v: 0 }, { u: 10, v: 0 }], closed: true }]).triangles).toHaveLength(0);
    expect(sectionCapMesh([]).points).toHaveLength(0);
  });
});

describe("the hatch on the cut face (#446)", () => {
  it("starts hatched and knows only its three looks", () => {
    expect(normalizeSectionCutFace(null)).toBe("hatch");
    expect(normalizeSectionCutFace("fill")).toBe("fill");
    expect(normalizeSectionCutFace("open")).toBe("open");
    expect(normalizeSectionCutFace("striped")).toBe("hatch");
  });

  it("spaces the lines by the size of the cut, on a step of 1, 2 or 5", () => {
    expect(sectionHatchSpacing([sectionCapMesh([square(0, 0, 40)])])).toBe(1);
    expect(sectionHatchSpacing([sectionCapMesh([square(0, 0, 60)])])).toBe(2);
    expect(sectionHatchSpacing([sectionCapMesh([square(0, 0, 150)])])).toBe(5);
    expect(sectionHatchSpacing([sectionCapMesh([square(0, 0, 10)]), sectionCapMesh([square(190, 0, 10)])])).toBe(5);
    // A tiny part and an empty cut stay within bounds.
    expect(sectionHatchSpacing([sectionCapMesh([square(0, 0, 2)])])).toBe(0.2);
    expect(sectionHatchSpacing([])).toBe(1);
  });

  it("puts one line every spacing millimetres, square to the 45 degree lines", () => {
    const [a, b] = [{ u: 0, v: 0 }, { u: 2, v: 2 }];
    const uvs = sectionHatchUvs([a, b], 2 * Math.SQRT2);
    // From a to b is 2.83 mm across the lines, one spacing: u + v grows by exactly one line.
    expect(uvs[2] + uvs[3] - (uvs[0] + uvs[1])).toBeCloseTo(1, 9);
    const turned = sectionHatchUvs([{ u: 1, v: 0 }], 1, true);
    expect(turned[0]).toBeLessThan(0);
    expect(turned[1]).toBeCloseTo(0, 9);
  });

  it("turns the hatch of a body that lies inside another, as the truffle in the cube (#446)", () => {
    const body = (...loops: SectionLoop[]) => ({ cap: sectionCapMesh(loops), loops });
    const cube = body(square(0, 0, 30));
    const truffle = body(square(10, 10, 10));
    const beside = body(square(50, 0, 10));
    expect(sectionHatchTurned([cube, truffle, beside])).toEqual([false, true, false]);
    // The cut takes the truffle out of the cube as a hole; it still lies inside the cube.
    const cubeWithHole = body(square(0, 0, 30), square(10, 10, 10));
    expect(sectionCapArea(cubeWithHole.cap)).toBeCloseTo(800, 6);
    expect(sectionHatchTurned([cubeWithHole, truffle])).toEqual([false, true]);
    // A seed in the truffle in the cube turns back.
    const seed = body(square(14, 14, 2));
    expect(sectionHatchTurned([cube, truffle, seed])).toEqual([false, true, false]);
  });

  it("draws a tile that wraps without a seam", () => {
    const size = 16;
    const texels = sectionHatchTexels(size);
    const at = (x: number, y: number) => texels[((y % size) * size + (x % size)) * 4];
    expect(Math.min(...Array.from({ length: size }, (_, x) => at(x, size - 1 - x)))).toBeLessThan(160);
    expect(at(0, size / 2 - 1)).toBe(255);
    for (let x = 0; x < size; x += 1) expect(at(x, 0)).toBe(at(x + 1, size - 1));
  });
});
