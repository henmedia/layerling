import { bytesToBase64 } from "@/lib/surfaceTextureImages";
import { OWN_PICTURE_SIZE, OWN_TEXT_LENGTH, normalizeOwnPicture, type VaseOwnPicture } from "@/lib/vase/vase-own-picture.mjs";
import type { VaseSettings } from "@/lib/vaseSettings";

/**
 * One's own picture or a text as a relief on a vase (the vase's pattern "bild"): what the editor does for
 * it. The vase's core only knows a picture, grey values with light as the raised relief; a text is drawn into such a
 * picture here, where there is a canvas, and kept beside it in the settings so it can be changed.
 */

/** Grey values (0 to 255, a row at a time from the top) as a picture the vase's settings keep; null where they are none. */
export function vaseOwnPicture(grey: Uint8Array, width: number, height: number): VaseOwnPicture | null {
  return normalizeOwnPicture({ width, height, data: bytesToBase64(grey) });
}

/** One box blur of a grey picture: a letter's hard edge becomes a short flank the printer can follow. */
function soften(grey: Uint8Array, width: number, height: number) {
  const out = new Uint8Array(grey.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const left = x > 0 ? x - 1 : x, right = x < width - 1 ? x + 1 : x, up = y > 0 ? y - 1 : y, down = y < height - 1 ? y + 1 : y;
      out[y * width + x] = Math.round((grey[y * width + x] * 4 + grey[y * width + left] + grey[y * width + right] + grey[up * width + x] + grey[down * width + x]) / 8);
    }
  }
  return out;
}

/**
 * A text as a picture for a relief: bold letters, light on dark, in a picture as wide as the text asks for, so the
 * letters keep their form on the vase. Null without a canvas to draw on (tests, a worker) or without a text.
 */
export function vaseTextPicture(text: string): VaseOwnPicture | null {
  const line = text.slice(0, OWN_TEXT_LENGTH).trim();
  if (!line || typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  const height = 128;
  const font = (size: number) => `700 ${size}px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`;
  let size = height * 0.7;
  context.font = font(size);
  const natural = context.measureText(line).width + height * 0.3;
  // A long text is set smaller rather than cut off.
  const width = Math.max(height / 2, Math.min(OWN_PICTURE_SIZE, Math.round(natural)));
  if (natural > width) size *= width / natural;
  canvas.width = width;
  canvas.height = height;
  context.fillStyle = "#000";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#fff";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = font(size);
  context.fillText(line, width / 2, height / 2);
  const pixels = context.getImageData(0, 0, width, height).data;
  const grey = new Uint8Array(width * height);
  for (let i = 0; i < grey.length; i += 1) grey[i] = pixels[i * 4];
  return vaseOwnPicture(soften(soften(grey, width, height), width, height), width, height);
}

/**
 * A vase's settings with the picture of its text: where the text is new or changed against `before`, its picture is
 * drawn; where the text was taken away, the picture made from it goes too. A picture loaded from a file has no text
 * and stays. Without a canvas the settings come back as they are.
 */
export function vaseSettingsWithTextPicture<T extends Partial<VaseSettings>>(settings: T, before?: Partial<VaseSettings> | null): T {
  const text = settings.patternText;
  if (text === undefined) return settings;
  const previous = before?.patternText ?? "";
  if (text === previous && (settings.patternImage || !text)) return settings;
  if (!text) return previous ? { ...settings, patternImage: null } : settings;
  const picture = vaseTextPicture(text);
  return picture ? { ...settings, patternImage: picture } : settings;
}

/** The vase's settings for a report: a picture by its size alone, not by its grey values. */
export function vaseSettingsWithoutPictureData(settings: Partial<VaseSettings>): Record<string, unknown> {
  const picture = settings.patternImage;
  return picture ? { ...settings, patternImage: { width: picture.width, height: picture.height } } : settings;
}

/**
 * Vase settings as an assistant sends them, laid over the ones the vase has: a picture that comes back by its size
 * alone (as the scene reports it) leaves the vase's picture as it is, and a text gets its picture drawn.
 */
export function vaseSettingsFromRequest(requested: Record<string, unknown> | undefined, before?: unknown): Record<string, unknown> {
  const had = before && typeof before === "object" ? (before as Partial<VaseSettings>) : null;
  const merged: Record<string, unknown> = { ...had, ...requested };
  const picture = requested?.patternImage;
  if (picture && typeof picture === "object" && typeof (picture as { data?: unknown }).data !== "string") merged.patternImage = had?.patternImage ?? null;
  return vaseSettingsWithTextPicture(merged as Partial<VaseSettings>, had) as Record<string, unknown>;
}
