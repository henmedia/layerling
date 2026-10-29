import { textNeedsJapanese, textNeedsJapaneseLevel2 } from "@/lib/japaneseText";
import { SURFACE_TEXTURE_MAX_TEXT_POINTS } from "@/lib/surfaceTexture";
import { loadJapaneseLevel2, loadJapaneseTypeface, loadTextFonts, textFont } from "@/lib/textFonts";
import { straightTextShapes } from "@/lib/textGeometry";

/** The built-in fonts, as a text shape offers them; fonts of one's own come by their id. */
export const SURFACE_TEXT_FONTS = ["Multilanguage", "Sans", "Serif", "Script", "Monospace", "Rounded", "Stencil", "Japanese"];

/** The size the words are laid out at before they are scaled to their letter size. */
const LAYOUT_SIZE = 100;

/**
 * The outlines of a text stuck on a surface (see surfaceTexture.ts): the words in their font, laid out as a text shape
 * lays them out, scaled so a capital H stands `size` mm high, the box round them centred on 0, 0, y up. Rings of flat
 * numbers [x0, y0, x1, y1, ...], inside by the even-odd rule; empty when there is nothing to write. Fonts live on the
 * main thread: the outlines are made here and go to the worker with the settings.
 */
export async function surfaceTextOutline({ content, font, size, vertical = false }: { content: string; font: string; size: number; vertical?: boolean }): Promise<number[][]> {
  const words = content.trim();
  if (!words) return [];
  await loadTextFonts();
  // Kana and kanji come from a face of their own, fetched the first time a text needs it.
  if (textNeedsJapanese(words)) await loadJapaneseTypeface().catch(() => undefined);
  if (textNeedsJapaneseLevel2(words)) await loadJapaneseLevel2().catch(() => undefined);
  const shape = { text: words, font };
  // Stencil is drawn with straight segments, as the text shape draws it.
  const segments = font === "Stencil" ? 1 : 6;
  const raw: number[][] = [];
  // Vertical letters (#981) are stacked as a text shape stacks them.
  straightTextShapes({ ...shape, textVertical: vertical }, LAYOUT_SIZE).forEach((glyph) => {
    const sampled = glyph.extractPoints(segments);
    [sampled.shape, ...sampled.holes].forEach((points) => {
      if (points.length >= 3) raw.push(points.flatMap((point) => [point.x, point.y]));
    });
  });
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const ring of raw) {
    for (let k = 0; k < ring.length; k += 2) {
      minX = Math.min(minX, ring[k]);
      maxX = Math.max(maxX, ring[k]);
      minY = Math.min(minY, ring[k + 1]);
      maxY = Math.max(maxY, ring[k + 1]);
    }
  }
  if (!Number.isFinite(minX)) return [];
  // The letter size is the height of a capital, as for a text shape; the box with descenders is a little taller.
  let capital = 0;
  textFont(font).generateShapes("H", LAYOUT_SIZE).forEach((glyph) => {
    for (const point of glyph.extractPoints(1).shape) capital = Math.max(capital, point.y);
  });
  const scale = Math.max(0.01, size) / (capital > 0 ? capital : LAYOUT_SIZE * 0.7);
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const rings: number[][] = [];
  let budget = SURFACE_TEXTURE_MAX_TEXT_POINTS * 2;
  for (const ring of raw) {
    if (ring.length > budget) break;
    rings.push(ring.map((value, k) => Math.round((k % 2 ? value - cy : value - cx) * scale * 1e4) / 1e4));
    budget -= ring.length;
  }
  return rings;
}
