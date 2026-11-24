import { describe, expect, it } from "vitest";
import { mcpShapeSummary } from "@/lib/editorMcpSummary";
import { buildVase, normalizeParams } from "@/lib/vase/vase-geometry.mjs";
import { OWN_PICTURE_SIZE, OWN_TEXT_LENGTH, normalizeOwnPicture, ownPictureKey, ownPictureTile } from "@/lib/vase/vase-own-picture.mjs";
import { patternPreview } from "@/lib/vase/vase-patterns.mjs";
import { vaseSettingsFromRequest, vaseSettingsWithTextPicture, vaseSettingsWithoutPictureData } from "@/lib/vaseRelief";
import { vaseSettingsChanges, vaseSettingsEqual, vaseSettingsKey } from "@/lib/vaseSettings";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * One's own picture or a text as a relief pattern of the vase (the vase's pattern "bild",
 * vase-own-picture.mjs): the picture the settings keep, how it is put on (all over, as a band, once), and that its grey
 * values stay out of the keys of caches and out of what the scene reports.
 */

/** A picture `width` x `height`, light (255) where `light(x, y)` says so, dark elsewhere. */
function picture(width: number, height: number, light: (x: number, y: number) => boolean) {
  const grey = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) grey[y * width + x] = light(x, y) ? 255 : 0;
  return { width, height, data: Buffer.from(grey).toString("base64") };
}

/** A light block in the middle of a dark picture, three times as wide as it is tall. */
const block = () => picture(96, 32, (x, y) => x > 20 && x < 76 && y > 8 && y < 24);

/**
 * The outer wall unrolled: per band of height (of `rows`) and per step round the vase (of `columns`) whether the wall
 * stands out there (true) or is sunk; null for a band that is all one height.
 */
function unrolled(mesh: { vertices: Float64Array }, rows: number, columns: number) {
  let top = 0;
  for (let i = 0; i < mesh.vertices.length; i += 3) top = Math.max(top, mesh.vertices[i + 2]);
  const most = Array.from({ length: rows }, () => new Float64Array(columns));
  for (let i = 0; i < mesh.vertices.length; i += 3) {
    const x = mesh.vertices[i], y = mesh.vertices[i + 1];
    const column = Math.floor(((Math.atan2(y, x) + Math.PI) / (2 * Math.PI)) * columns) % columns;
    const row = Math.min(rows - 1, Math.floor((mesh.vertices[i + 2] / top) * rows));
    most[row][column] = Math.max(most[row][column], Math.hypot(x, y));
  }
  return most.map((row) => {
    const high = Math.max(...row), low = Math.min(...row);
    return high - low < 0.8 ? null : Array.from(row, (r) => high - r < 0.6);
  });
}

/** How many separate raised runs a band has round the vase. */
function runs(band: boolean[]) {
  let count = 0;
  for (let i = 0; i < band.length; i += 1) if (band[i] && !band[(i + band.length - 1) % band.length]) count += 1;
  return count;
}

describe("one's own picture as a vase's relief", () => {
  it("keeps a picture with whole sizes and all its grey values, and nothing else", () => {
    const good = block();
    const kept = normalizeOwnPicture(good);
    expect(kept).toEqual(good);
    // A picture that passed comes back as it is: what was worked out for it is found again.
    expect(normalizeOwnPicture(kept)).toBe(kept);
    expect(normalizeOwnPicture({ ...good })).toBe(kept);
    expect(normalizeOwnPicture({ ...good, width: 95 })).toBeNull();
    expect(normalizeOwnPicture({ ...good, data: good.data.replace(/^./, "*") })).toBeNull();
    expect(normalizeOwnPicture({ width: OWN_PICTURE_SIZE + 1, height: 2, data: "" })).toBeNull();
    expect(normalizeOwnPicture({ width: 1, height: 2, data: "AAA=" })).toBeNull();
    expect(normalizeOwnPicture("picture")).toBeNull();
    expect(normalizeOwnPicture(null)).toBeNull();
  });

  it("becomes a square tile that knows the picture's proportions", () => {
    const tile = ownPictureTile(block())!;
    expect(tile.size).toBe(96);
    expect(tile.aspect).toBeCloseTo(1 / 3);
    expect(tile.values.length).toBe(96 * 96);
    // The middle is light, the corner dark.
    expect(tile.values[48 * 96 + 48]).toBe(255);
    expect(tile.values[0]).toBe(0);
    expect(ownPictureTile({ width: 3 })).toBeNull();
  });

  it("is part of the vase's settings, with a text and how it is put on", () => {
    const p = normalizeParams({ effect: "bild", patternImage: block(), patternText: "x".repeat(200), patternFit: "quer" });
    expect(p.effect).toBe("bild");
    expect(p.patternImage).toEqual(block());
    expect(p.patternText.length).toBe(OWN_TEXT_LENGTH);
    expect(p.patternFit).toBe("kacheln");
    expect(normalizeParams({ patternFit: "band" }).patternFit).toBe("band");
    expect(normalizeParams({ patternFit: "einmal" }).patternFit).toBe("einmal");
    expect(normalizeParams({ patternImage: { width: 4, height: 4, data: "no" } }).patternImage).toBeNull();
    expect(normalizeParams({}).patternImage).toBeNull();
  });

  it("stands out where the picture is light, row upon row all the way up", () => {
    const mesh = buildVase({ profile: "zylinder", effect: "bild", patternImage: block(), patternCount: 3, quality: "entwurf" });
    const bands = unrolled(mesh, 30, 96).filter((band): band is boolean[] => band !== null);
    // Three pictures round the vase, in many rows.
    expect(bands.length).toBeGreaterThan(10);
    for (const band of bands) expect(runs(band)).toBe(3);
    // The block is a little over half the picture wide.
    const share = bands[0].filter(Boolean).length / bands[0].length;
    expect(share).toBeGreaterThan(0.45);
    expect(share).toBeLessThan(0.7);
  }, 60000);

  it("is one band round the vase in the middle of the height range, or one picture alone", () => {
    const settings = { profile: "zylinder", effect: "bild", patternImage: block(), patternCount: 3, quality: "entwurf" };
    const band = unrolled(buildVase({ ...settings, patternFit: "band" }), 30, 96);
    const marked = band.map((row, index) => (row ? index : -1)).filter((index) => index >= 0);
    // One row of pictures: a few bands of height about the middle, the rest of the wall smooth.
    expect(marked.length).toBeGreaterThan(0);
    expect(marked.length).toBeLessThan(8);
    expect(Math.min(...marked)).toBeGreaterThan(9);
    expect(Math.max(...marked)).toBeLessThan(21);
    for (const index of marked) expect(runs(band[index]!)).toBe(3);
    const once = unrolled(buildVase({ ...settings, patternFit: "einmal" }), 30, 96);
    const single = once.filter((row): row is boolean[] => row !== null);
    expect(single.length).toBe(marked.length);
    for (const row of single) expect(runs(row)).toBe(1);
    // It faces the front (-y, a quarter of the way round these steps): its middle lies there.
    const raised = single[0].map((on, index) => (on ? index : -1)).filter((index) => index >= 0);
    expect(Math.abs((raised[0] + raised.at(-1)!) / 2 - 24)).toBeLessThan(2);
    // Higher up the height range, the picture goes with it.
    const high = unrolled(buildVase({ ...settings, patternFit: "einmal", zoneFrom: 60, zoneTo: 100 }), 30, 96);
    const highMarked = high.map((row, index) => (row ? index : -1)).filter((index) => index >= 0);
    expect(Math.min(...highMarked)).toBeGreaterThan(Math.max(...marked));
  }, 60000);

  it("turned inside out, the picture is sunk into a smooth wall", () => {
    const settings = { profile: "zylinder", effect: "bild", patternImage: block(), patternCount: 3, patternFit: "einmal", quality: "entwurf" };
    const raised = unrolled(buildVase(settings), 30, 96).find((row) => row !== null)!;
    const sunk = unrolled(buildVase({ ...settings, patternInvert: "ja" }), 30, 96).find((row) => row !== null)!;
    // Raised: a block of the wall stands out; sunk: all but that block does.
    expect(raised.filter(Boolean).length).toBeLessThan(raised.length / 2);
    expect(sunk.filter(Boolean).length).toBeGreaterThan(sunk.length / 2);
  }, 60000);

  it("without a picture the wall is smooth and the gallery shows a picture that stands for it", () => {
    const mesh = buildVase({ profile: "zylinder", effect: "bild", quality: "entwurf" });
    // (A smooth wall has few points round the vase: few steps here, so each has some.)
    expect(unrolled(mesh, 30, 16).every((row) => row === null)).toBe(true);
    const tile = patternPreview({ effect: "bild" }, 24, 24);
    expect(Math.max(...tile)).toBe(1);
    expect(Math.min(...tile)).toBe(0);
    // With a picture the tile is the picture: light in the middle.
    const own = patternPreview(normalizeParams({ effect: "bild", patternImage: picture(32, 32, (x, y) => x > 8 && x < 24 && y > 8 && y < 24) }), 24, 24);
    expect(own[12 * 24 + 12]).toBeGreaterThan(0.9);
    expect(own[0]).toBeLessThan(0.1);
  }, 60000);

  it("stands in the keys of caches by a short name, not by its grey values", () => {
    const first = normalizeParams({ effect: "bild", patternImage: picture(256, 256, (x) => x > 100) });
    const same = normalizeParams({ effect: "bild", patternImage: picture(256, 256, (x) => x > 100) });
    const other = normalizeParams({ effect: "bild", patternImage: picture(256, 256, (x) => x > 101) });
    const key = vaseSettingsKey(first);
    expect(key.length).toBeLessThan(5000);
    expect(key).not.toContain(first.patternImage!.data.slice(0, 40));
    expect(vaseSettingsKey(same)).toBe(key);
    expect(vaseSettingsKey(other)).not.toBe(key);
    expect(vaseSettingsEqual(first, same)).toBe(true);
    expect(vaseSettingsEqual(first, other)).toBe(false);
    expect(ownPictureKey(first.patternImage)).toBe(ownPictureKey(same.patternImage));
    expect(ownPictureKey(null)).toBe("");
    // A vase without a picture is keyed as before.
    expect(vaseSettingsKey({ a: 1, patternImage: null })).toBe(JSON.stringify({ a: 1, patternImage: null }));
    expect(vaseSettingsChanges(first).patternImage).toBe(first.patternImage);
    expect("patternImage" in vaseSettingsChanges({ effect: "bild" })).toBe(false);
  });

  it("is reported by its size alone, and given back so the vase keeps its picture", () => {
    const vase = normalizeParams({ effect: "bild", patternImage: block(), patternCount: 4 });
    expect(vaseSettingsWithoutPictureData(vase).patternImage).toEqual({ width: 96, height: 32 });
    const shape = { id: "v", kind: "vase", name: "Vase", x: 0, z: 0, y: 0, size: 90, width: 90, depth: 90, height: 180, color: "#2d9c9c", vase } as unknown as WorkplaneShape;
    const reported = String(mcpShapeSummary(shape).settings?.vase ?? "");
    expect(reported).toContain('"patternImage":{"width":96,"height":32}');
    expect(reported).not.toContain(vase.patternImage!.data);
    // What the scene reported comes back with a change: the picture stays, the change is taken.
    const back = vaseSettingsFromRequest({ ...JSON.parse(reported), patternCount: 6 }, vase);
    expect(back.patternImage).toBe(vase.patternImage);
    expect(back.patternCount).toBe(6);
    // A new picture replaces it, and null takes it away.
    const next = picture(8, 8, (x) => x > 3);
    expect(vaseSettingsFromRequest({ patternImage: next }, vase).patternImage).toEqual(next);
    expect(vaseSettingsFromRequest({ patternImage: null }, vase).patternImage).toBeNull();
    expect(vaseSettingsFromRequest(undefined, vase).patternImage).toBe(vase.patternImage);
  });

  it("a text taken away takes the picture drawn from it along; a loaded picture stays", () => {
    const drawn = normalizeParams({ effect: "bild", patternImage: block(), patternText: "Anna" });
    // No canvas here: a new text leaves the settings as they are.
    expect(vaseSettingsWithTextPicture({ patternText: "Bert", patternImage: drawn.patternImage }, drawn).patternImage).toBe(drawn.patternImage);
    expect(vaseSettingsWithTextPicture({ patternText: "", patternImage: drawn.patternImage }, drawn).patternImage).toBeNull();
    const loaded = normalizeParams({ effect: "bild", patternImage: block() });
    expect(vaseSettingsWithTextPicture({ patternText: "", patternImage: loaded.patternImage }, loaded).patternImage).toBe(loaded.patternImage);
  });
});
