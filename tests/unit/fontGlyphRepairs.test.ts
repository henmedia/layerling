import { beforeAll, describe, expect, it } from "vitest";
import * as THREE from "three";
import { FontLoader, type Font, type FontData } from "three/examples/jsm/loaders/FontLoader.js";
import helvetiker from "three/examples/fonts/helvetiker_bold.typeface.json";
import droidSerif from "three/examples/fonts/droid/droid_serif_bold.typeface.json";
import optimer from "three/examples/fonts/optimer_bold.typeface.json";
import { loadTextFonts, textFont } from "@/lib/textFonts";

const raw = { Multilanguage: helvetiker, Serif: droidSerif, Rounded: optimer } as unknown as Record<string, FontData>;

const outline = (font: Font, char: string) => font.generateShapes(char, 1000)[0].extractPoints(8).shape;

/** How wide the glyph is where a level line at height y crosses it, left edge to right edge. */
function widthAt(points: THREE.Vector2[], y: number) {
  const xs = points.flatMap((a, k) => {
    const b = points[(k + 1) % points.length];
    return (a.y - y) * (b.y - y) < 0 ? [a.x + ((y - a.y) * (b.x - a.x)) / (b.y - a.y)] : [];
  });
  return Math.max(...xs) - Math.min(...xs);
}

/** A slash's stroke across: its area over the length of its long sides. */
function strokeAcross(points: THREE.Vector2[]) {
  const longest = Math.max(...points.map((a, k) => a.distanceTo(points[(k + 1) % points.length])));
  return Math.abs(THREE.ShapeUtils.area(points)) / longest;
}

// The "f" of Rounded had a spur at the end of its crossbar that a DXF showed as a 0.1 mm triangle (#916).
describe("the repaired glyphs of the built-in typefaces", () => {
  beforeAll(async () => {
    await loadTextFonts();
  });

  it("gives the f of Rounded a crossbar end without a spur", () => {
    const glyph = (textFont("Rounded").data as { glyphs: Record<string, { o: string }> }).glyphs.f.o;
    expect(glyph).not.toContain("l 425 669");
    expect(glyph).toContain("q 425 665 372 659 l 425 641");
  });

  it("leaves the other typefaces' f alone", () => {
    const glyph = (textFont("Sans").data as { glyphs: Record<string, { o: string }> }).glyphs.f.o;
    expect(glyph).toBeTruthy();
    expect(glyph).not.toContain("q 425 665 372 659");
  });

  it("still builds the letter", () => {
    expect(textFont("Rounded").generateShapes("office", 20).length).toBeGreaterThan(3);
  });

  // A slash less than half as thick as the letters beside it is too thin to print on a small label (Discussion #2023).
  it.each(["Multilanguage", "Stencil", "Serif", "Rounded"])("gives the slash of %s the thickness of its l", (name) => {
    const l = outline(textFont(name), "l");
    const { min, max } = new THREE.Box2().setFromPoints(l);
    expect(strokeAcross(outline(textFont(name), "/")) / widthAt(l, (min.y + max.y) / 2)).toBeCloseTo(1, 1);
  });

  it.each(Object.entries(raw))("keeps the box, the corners' order and the winding of the %s slash", (name, data) => {
    const [before, after] = [outline(new FontLoader().parse(data), "/"), outline(textFont(name), "/")];
    expect(new THREE.Box2().setFromPoints(after)).toEqual(new THREE.Box2().setFromPoints(before));
    // Only the two inner corners move, and only sideways: the same corner first, the same way round.
    expect(after.map((point) => point.y)).toEqual(before.map((point) => point.y));
    expect(THREE.ShapeUtils.isClockWise(after)).toBe(THREE.ShapeUtils.isClockWise(before));
  });

  it.each(Object.entries(raw))("leaves every other glyph of %s as it was", (name, data) => {
    const after = textFont(name).data.glyphs;
    const changed = Object.keys(data.glyphs).filter((char) => after[char]?.o !== data.glyphs[char].o);
    expect(changed.sort()).toEqual(name === "Rounded" ? ["/", "f"] : ["/"]);
  });
});
