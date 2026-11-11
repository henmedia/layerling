import { MAX_RASTER_TRACE_SIDE, traceRaster, type RasterPart, type RasterPixels } from "@/lib/rasterTrace";

/*
 * A picture as an icon or an import (#359): a PNG or JPG file, or an SVG that holds nothing but
 * such a picture (as Inkscape writes one when a bitmap is imported), is traced into an outline,
 * and the outline is the SVG the icon tag or the import reads. Everything else stays an SVG as it is.
 */

/** How wide a picture comes in through the import, in mm; it can be resized afterwards. */
export const PICTURE_IMPORT_WIDTH = 50;

export const PICTURE_FILE_ACCEPT = ".png,.jpg,.jpeg,image/png,image/jpeg";
export const PICTURE_UNREADABLE = "The picture could not be read";

const PICTURE_DATA_URL = /^data:image\/(?:png|jpe?g);base64,/i;
const DRAWING_ELEMENTS = "path, rect, circle, ellipse, line, polyline, polygon, use, text";

/** Whether a file is a PNG or JPG picture, by its type or else its name. */
export function isPictureFile(file: { name: string; type?: string }) {
  return /^image\/(?:png|jpe?g)$/i.test(file.type ?? "") || /\.(?:png|jpe?g)$/i.test(file.name);
}

/** A file's name without its ending: the name an icon tag gets. */
export function iconFileName(fileName: string) {
  return fileName.replace(/\.(?:svg|png|jpe?g)$/i, "").trim();
}

/**
 * The one PNG or JPG picture an SVG holds instead of a drawing, as a data URL. Null when the SVG
 * draws shapes of its own, holds no picture or several, or links to one outside it.
 */
export function svgEmbeddedPicture(source: string): string | null {
  const root = new DOMParser().parseFromString(source, "image/svg+xml").documentElement;
  if (!root || root.localName !== "svg" || root.querySelector("parsererror")) return null;
  if (root.querySelector(DRAWING_ELEMENTS)) return null;
  const images = Array.from(root.querySelectorAll("image"));
  if (images.length !== 1) return null;
  const target = (images[0].getAttribute("href") ?? images[0].getAttribute("xlink:href") ?? "").replace(/\s+/g, "");
  return PICTURE_DATA_URL.test(target) ? target : null;
}

function dataUrlBlob(dataUrl: string) {
  const comma = dataUrl.indexOf(",");
  const type = dataUrl.slice(5, dataUrl.indexOf(";"));
  const bytes = Uint8Array.from(atob(dataUrl.slice(comma + 1)), (character) => character.charCodeAt(0));
  return new Blob([bytes], { type });
}

/** The picture as an image element, for the browsers whose createImageBitmap does not read it (Firefox with an SVG). */
async function pictureElement(source: Blob | string): Promise<HTMLImageElement> {
  const url = typeof source === "string" ? source : URL.createObjectURL(source);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    // Firefox reports no size for an SVG without a width and height of its own.
    if (!image.naturalWidth || !image.naturalHeight) throw new Error(PICTURE_UNREADABLE);
    return image;
  } catch {
    throw new Error(PICTURE_UNREADABLE);
  } finally {
    if (typeof source !== "string") URL.revokeObjectURL(url);
  }
}

/** The pixels of a PNG or JPG, drawn by the browser no larger than the tracer takes them. */
export async function picturePixels(source: Blob | string): Promise<RasterPixels> {
  let bitmap: CanvasImageSource & { width: number; height: number; close?: () => void };
  try {
    bitmap = await createImageBitmap(typeof source === "string" ? dataUrlBlob(source) : source);
  } catch {
    // Firefox does not make a bitmap of an SVG file (#1661); an image element reads it.
    bitmap = await pictureElement(source);
  }
  const factor = Math.min(1, MAX_RASTER_TRACE_SIDE / Math.max(bitmap.width, bitmap.height, 1));
  const width = Math.max(1, Math.round(bitmap.width * factor));
  const height = Math.max(1, Math.round(bitmap.height * factor));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error(PICTURE_UNREADABLE);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();
  const { data } = context.getImageData(0, 0, width, height);
  return { width, height, data };
}

/**
 * The part of a picture that is not its background: the background is the part that takes up
 * more of the picture's edge. A black logo on white gives the dark part, a white logo on black
 * the light one. With a mostly transparent edge, the transparency is the background, and the part
 * is the one that has more of the picture's pixels: a black sticker whose tail touches the border
 * in a few pixels is still a dark shape, not a dark background (#345).
 */
/** Most of the picture's edge is transparent: the picture stands on a transparent background. */
export function pictureHasTransparentEdge(pixels: RasterPixels) {
  const { width, height, data } = pixels;
  let edgePixels = 0;
  let transparent = 0;
  const count = (x: number, y: number) => {
    edgePixels += 1;
    if (data[(y * width + x) * 4 + 3] < 128) transparent += 1;
  };
  for (let x = 0; x < width; x += 1) {
    count(x, 0);
    count(x, height - 1);
  }
  for (let y = 1; y < height - 1; y += 1) {
    count(0, y);
    count(width - 1, y);
  }
  return transparent * 2 > edgePixels;
}

export function pictureShapePart(pixels: RasterPixels): RasterPart {
  const { width, height, data } = pixels;
  let dark = 0;
  let light = 0;
  let edgePixels = 0;
  let opaqueEdgePixels = 0;
  const count = (x: number, y: number, onEdge: boolean) => {
    const index = (y * width + x) * 4;
    if (onEdge) edgePixels += 1;
    if (data[index + 3] < 128) return;
    if (onEdge) opaqueEdgePixels += 1;
    const lightness = (0.2126 * data[index] + 0.7152 * data[index + 1] + 0.0722 * data[index + 2]) / 255;
    if (lightness < 0.5) dark += 1;
    else light += 1;
  };
  for (let x = 0; x < width; x += 1) {
    count(x, 0, true);
    count(x, height - 1, true);
  }
  for (let y = 1; y < height - 1; y += 1) {
    count(0, y, true);
    count(width - 1, y, true);
  }
  if (opaqueEdgePixels * 2 < edgePixels) {
    // The edge is mostly transparent: that is the background, so what counts is the picture itself.
    dark = 0;
    light = 0;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) count(x, y, false);
    }
    return light > dark ? "light" : "dark";
  }
  return dark > light ? "light" : "dark";
}

export type IconSource = {
  /** The name the icon tag gets: the file's, without its ending. */
  name: string;
  /** The SVG text the icon tag is built from. */
  svg: string;
  /** Set for a traced picture: its pixels, so another part can be traced without reading the file again. */
  picture?: RasterPixels;
  /** The part of the picture the outline was traced from. */
  part?: RasterPart;
};

/** A traced picture: the given part, or else the part that is not its background. */
export function tracedIconSource(name: string, picture: RasterPixels, part?: RasterPart): IconSource {
  const chosen = part ?? pictureShapePart(picture);
  return { name, svg: traceRaster(picture, { part: chosen }).svg, picture, part: chosen };
}

/** A file as the icon tag reads it: an SVG as it is, a picture (or an SVG holding only a picture) traced. */
export async function iconSourceFromFile(file: File, part?: RasterPart): Promise<IconSource> {
  const name = iconFileName(file.name);
  if (isPictureFile(file)) return tracedIconSource(name, await picturePixels(file), part);
  const text = await file.text();
  const embedded = svgEmbeddedPicture(text);
  if (embedded) return tracedIconSource(name, await picturePixels(embedded), part);
  return { name, svg: text };
}

/**
 * The outline the import traces from a picture, PICTURE_IMPORT_WIDTH mm wide: on a transparent
 * background every pixel that is not transparent, whatever its colour - a logo of black text round a
 * light blue shape keeps its text (Discussion #1199) - otherwise the part that is not its background.
 */
export function importedPictureTrace(pixels: RasterPixels) {
  return traceRaster(pixels, pictureHasTransparentEdge(pixels)
    ? { byOpacity: true, width: PICTURE_IMPORT_WIDTH }
    : { part: pictureShapePart(pixels), width: PICTURE_IMPORT_WIDTH });
}

/** A picture as the SVG the import builds (`importedPictureTrace`). */
export async function importedPictureSvg(source: Blob | string) {
  return importedPictureTrace(await picturePixels(source)).svg;
}
