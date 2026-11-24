// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { pattiesMotifFromFile, pattiesMotifFromPicture, pattiesMotifFromSvg, PATTIES_MOTIF_FILE_ACCEPT } from "@/lib/pattiesMotif";
import { normalizePatties, pattiesPlan } from "@/lib/pattiesPattern";

const points = (loop: number[]) => Array.from({ length: loop.length / 2 }, (_, i) => ({ x: loop[i * 2], y: loop[i * 2 + 1] }));
const area = (loop: number[]) => points(loop).reduce((sum, p, i, all) => sum + (p.x * all[(i + 1) % all.length].y - all[(i + 1) % all.length].x * p.y) / 2, 0);

describe("Patties: a figure of one's own from a file", () => {
  it("reads the filled outline of an SVG drawing", () => {
    const motif = pattiesMotifFromSvg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M10 90 L90 90 L50 10 Z" fill="#000"/></svg>')!;
    expect(motif).toHaveLength(1);
    const loop = points(motif[0]);
    expect(loop).toHaveLength(3);
    // The point of the triangle is up, as the drawing shows it.
    expect(loop.filter((p) => p.y > 0)).toHaveLength(1);
    expect(area(motif[0])).toBeGreaterThan(0);
  });

  it("fills the hole of a ring and keeps a second figure beside it", () => {
    const motif = pattiesMotifFromSvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 100">
      <path fill-rule="evenodd" d="M50 5 A45 45 0 1 0 50 95 A45 45 0 1 0 50 5 Z M50 30 A20 20 0 1 0 50 70 A20 20 0 1 0 50 30 Z"/>
      <rect x="200" y="30" width="40" height="40"/>
    </svg>`)!;
    expect(motif).toHaveLength(2);
    const sizes = motif.map((loop) => Math.abs(area(loop))).sort((a, b) => b - a);
    // The disc whole, not the ring: pi 45^2 against a square of 40.
    expect(sizes[0] / sizes[1]).toBeCloseTo((Math.PI * 45 * 45) / 1600, 0);
  });

  it("is none for a drawing that fills nothing, and throws on what is no SVG", () => {
    expect(pattiesMotifFromSvg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"></svg>')).toBeNull();
    expect(() => pattiesMotifFromSvg("this is no drawing")).toThrow();
  });

  it("traces the dark shape of a picture", () => {
    // A black square in the middle of a white picture.
    const size = 64;
    const data = new Uint8ClampedArray(size * size * 4).fill(255);
    for (let y = 16; y < 48; y += 1) {
      for (let x = 20; x < 44; x += 1) data.set([0, 0, 0, 255], (y * size + x) * 4);
    }
    const motif = pattiesMotifFromPicture({ width: size, height: size, data })!;
    expect(motif).toHaveLength(1);
    const loop = points(motif[0]);
    const width = Math.max(...loop.map((p) => p.x)) - Math.min(...loop.map((p) => p.x));
    const height = Math.max(...loop.map((p) => p.y)) - Math.min(...loop.map((p) => p.y));
    // 24 wide and 32 tall: taller than wide, as in the picture.
    expect(height / width).toBeCloseTo(32 / 24, 1);
  });

  it("reads a file by what it is, and gives none instead of failing", async () => {
    expect(PATTIES_MOTIF_FILE_ACCEPT).toContain(".svg");
    expect(PATTIES_MOTIF_FILE_ACCEPT).toContain(".png");
    expect(PATTIES_MOTIF_FILE_ACCEPT).toContain(".jpg");
    const drawing = new File(['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="4"/></svg>'], "bar.svg", { type: "image/svg+xml" });
    const motif = await pattiesMotifFromFile(drawing);
    expect(motif).toHaveLength(1);
    expect(await pattiesMotifFromFile(new File(["no drawing"], "broken.svg", { type: "image/svg+xml" }))).toBeNull();
  });

  it("is laid out like a ready figure once it is the plate's motif", () => {
    const motifLoops = pattiesMotifFromSvg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M10 90 L90 90 L50 10 Z"/></svg>')!;
    const own = pattiesPlan(normalizePatties({ pattern: "motif", motif: "custom", motifLoops, count: 5, gap: 1.6, bulge: 0 }), 80, 80);
    const heart = pattiesPlan(normalizePatties({ pattern: "motif", motif: "heart", count: 5, gap: 1.6, bulge: 0 }), 80, 80);
    expect(own.figures.length).toBe(heart.figures.length);
    expect(own.figures[0]).toHaveLength(3);
  });
});
