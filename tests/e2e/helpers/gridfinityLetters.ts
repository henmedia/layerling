import type { GridfinityLabelLetters } from "@/lib/gridfinityGeometry";

/*
 * The letters on a Gridfinity bin's label shelves (#1308) measured from their rings, as the display mesh draws them: each
 * glyph's outline less its holes. What the e2e files hold the exact body's letters to.
 */

/** The letters' area and the middle of it, in the shape's x and z. */
export function lettersAreaAndMiddle(letters: GridfinityLabelLetters) {
  let area = 0, sx = 0, sz = 0;
  letters.forEach((label) => label.glyphs.forEach((rings) => rings.forEach((ring, index) => {
    let a = 0, x = 0, z = 0;
    ring.forEach(([px, pz], i) => {
      const [nx, nz] = ring[(i + 1) % ring.length];
      const cross = px * nz - nx * pz;
      a += cross;
      x += (px + nx) * cross;
      z += (pz + nz) * cross;
    });
    const sign = Math.sign(a) * (index === 0 ? 1 : -1);
    area += (sign * a) / 2;
    sx += (sign * x) / 6;
    sz += (sign * z) / 6;
  })));
  return { area, x: sx / area, z: sz / area };
}
