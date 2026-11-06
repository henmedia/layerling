// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { iconFileName, importedPictureTrace, isPictureFile, pictureHasTransparentEdge, pictureShapePart, svgEmbeddedPicture, tracedIconSource } from "@/lib/pictureIcon";
import { validateSvgSourcePreflight } from "@/lib/svgImport";
import { localizedError } from "@/lib/userErrors";
import { t } from "@/lib/i18n";

/** A picture of `width` x `height` pixels, each coloured by `paint(x, y)` as [red, green, blue, alpha]. */
function picture(width: number, height: number, paint: (x: number, y: number) => [number, number, number, number]) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) data.set(paint(x, y), (y * width + x) * 4);
  }
  return { width, height, data };
}

const BLACK: [number, number, number, number] = [0, 0, 0, 255];
const WHITE: [number, number, number, number] = [255, 255, 255, 255];
const CLEAR: [number, number, number, number] = [0, 0, 0, 0];
const inDisc = (x: number, y: number) => Math.hypot(x + 0.5 - 30, y + 0.5 - 30) <= 18;

/** A 1 x 1 PNG, as Inkscape writes an imported bitmap into an SVG: base64 broken over lines. */
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA&#10;60e6kgAAAABJRU5ErkJggg==";
const INKSCAPE_PICTURE = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" width="210mm" height="297mm" viewBox="0 0 210 297">
  <sodipodi:namedview id="namedview1" pagecolor="#ffffff"/><defs id="defs1"/>
  <g id="layer1"><image width="82.8" height="32.8" preserveAspectRatio="none" xlink:href="${PNG}" x="72" y="99"/></g>
</svg>`;

describe("a picture as an icon (#359)", () => {
  it("knows a PNG or JPG by its type or its name", () => {
    expect(isPictureFile({ name: "logo.PNG" })).toBe(true);
    expect(isPictureFile({ name: "photo.jpeg", type: "" })).toBe(true);
    expect(isPictureFile({ name: "upload", type: "image/jpeg" })).toBe(true);
    expect(isPictureFile({ name: "icon.svg", type: "image/svg+xml" })).toBe(false);
    expect(iconFileName("Flite logo.png")).toBe("Flite logo");
    expect(iconFileName("star.svg")).toBe("star");
  });

  it("finds the one picture an SVG holds instead of a drawing", () => {
    expect(svgEmbeddedPicture(INKSCAPE_PICTURE)).toBe(PNG.replace("&#10;", ""));
  });

  it("leaves an SVG alone that draws shapes, holds two pictures or links to one outside it", () => {
    const withShape = INKSCAPE_PICTURE.replace("</g>", `<rect x="0" y="0" width="5" height="5"/></g>`);
    const twoPictures = INKSCAPE_PICTURE.replace("</g>", `<image width="5" height="5" xlink:href="${PNG}"/></g>`);
    const linked = INKSCAPE_PICTURE.replace(PNG, "logo.png");
    expect(svgEmbeddedPicture(withShape)).toBeNull();
    expect(svgEmbeddedPicture(twoPictures)).toBeNull();
    expect(svgEmbeddedPicture(linked)).toBeNull();
  });

  it("tells a picture inside an SVG from a link to a file outside it", () => {
    expect(() => validateSvgSourcePreflight(INKSCAPE_PICTURE)).toThrow(/SVG embedded pictures/);
    expect(() => validateSvgSourcePreflight(INKSCAPE_PICTURE.replace(PNG, "logo.png"))).toThrow(/SVG external references/);
    expect(localizedError("SVG embedded pictures are not drawings; only an SVG that holds nothing but one picture is traced")).toBe(t("error.svgPicture"));
    expect(localizedError("The picture has no shape to trace")).toBe(t("error.pictureEmpty"));
    expect(localizedError("The picture could not be read")).toBe(t("error.pictureUnreadable"));
  });

  it("takes the part that is not the background", () => {
    expect(pictureShapePart(picture(60, 60, (x, y) => (inDisc(x, y) ? BLACK : WHITE)))).toBe("dark");
    expect(pictureShapePart(picture(60, 60, (x, y) => (inDisc(x, y) ? WHITE : BLACK)))).toBe("light");
    // On a transparent background, the part that has more of the picture.
    expect(pictureShapePart(picture(60, 60, (x, y) => (inDisc(x, y) ? WHITE : CLEAR)))).toBe("light");
    expect(pictureShapePart(picture(60, 60, (x, y) => (inDisc(x, y) ? BLACK : CLEAR)))).toBe("dark");
  });

  it("takes a dark sticker on a transparent edge as a dark shape, though a few of its pixels touch the border (#345)", () => {
    // A black figure with a light detail, clear all round except where its tail reaches the bottom edge.
    const sticker = picture(60, 60, (x, y) => {
      if (y === 59 && x >= 20 && x < 30) return BLACK;
      if (!inDisc(x, y)) return CLEAR;
      return Math.hypot(x - 30, y - 24) < 4 ? WHITE : BLACK;
    });
    expect(pictureShapePart(sticker)).toBe("dark");
    // The same on a light figure.
    const light = picture(60, 60, (x, y) => (y === 59 && x >= 20 && x < 30 ? WHITE : inDisc(x, y) ? WHITE : CLEAR));
    expect(pictureShapePart(light)).toBe("light");
  });

  it("traces the part asked for, or else the one that is not the background", () => {
    const whiteOnBlack = picture(60, 60, (x, y) => (inDisc(x, y) ? WHITE : BLACK));
    const traced = tracedIconSource("disc", whiteOnBlack);
    expect(traced.part).toBe("light");
    expect(traced.svg).toContain("<path");
    expect(traced.picture).toBe(whiteOnBlack);
    // The dark part is the black square round the disc, with the disc cut out of it.
    expect(tracedIconSource("disc", whiteOnBlack, "dark").part).toBe("dark");
  });
});

describe("the import of a picture on a transparent background (Discussion #1199)", () => {
  // A logo like the one in #1199: a large light blue oval, mid-blue letters round it and black text under it.
  const LIGHT_BLUE: [number, number, number, number] = [120, 200, 240, 255];
  const MID_BLUE: [number, number, number, number] = [40, 120, 190, 255];
  const logo = picture(120, 80, (x, y) => {
    if (Math.hypot((x + 0.5 - 60) / 40, (y + 0.5 - 38) / 18) <= 1) return LIGHT_BLUE;
    if (y >= 6 && y < 14 && x >= 20 && x < 100 && x % 12 < 7) return MID_BLUE; // letters above
    if (y >= 64 && y < 72 && x >= 30 && x < 90) return BLACK; // the text below
    return CLEAR;
  });

  it("sees the transparent edge", () => {
    expect(pictureHasTransparentEdge(logo)).toBe(true);
    expect(pictureHasTransparentEdge(picture(60, 60, (x, y) => (inDisc(x, y) ? BLACK : WHITE)))).toBe(false);
  });

  it("keeps every part that is not transparent, whatever its colour: the oval, the letters and the black text", () => {
    const trace = importedPictureTrace(logo);
    // The oval, seven letters and the text: nine outlines, none dropped for being dark or light.
    expect(trace.rings).toBe(9);
  });

  it("still traces the part that is not the background on an opaque picture", () => {
    const blackOnWhite = importedPictureTrace(picture(60, 60, (x, y) => (inDisc(x, y) ? BLACK : WHITE)));
    expect(blackOnWhite.rings).toBe(1);
  });
});

