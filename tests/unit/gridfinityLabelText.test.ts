import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { strFromU8, unzipSync } from "fflate";
import * as THREE from "three";
import type { FontData } from "three/examples/jsm/loaders/FontLoader.js";
import manifoldModule, { type ManifoldToplevel } from "manifold-3d";
import { createShapeObject, shapeGeometrySignature, tapeShapeTopologyKey } from "@/components/workplane/viewportShapeObjects";
import { cadGridfinityLetterSegmentCount, cadGridfinitySegmentCount, cadModifierGridfinityForShape, withinExactProfileLimit } from "@/lib/cadProfileExtrusion";
import { CAD_MODIFIER_EXACT_SEGMENT_LIMIT } from "@/lib/cadModifierRuntime";
import { buildGroupedShapeFromSelection } from "@/lib/editorBooleans";
import { editorHistoryEntry } from "@/lib/editorHistory";
import { meshForShape } from "@/lib/editorMeshCore";
import { mcpGridfinityLabelFont, mcpShapeSummary } from "@/lib/editorMcpSummary";
import {
  GRIDFINITY_LABEL_FONTS,
  GRIDFINITY_LABEL_TEXT_HEIGHT,
  GRIDFINITY_LIP_HEIGHT,
  gridfinityHasLabelText,
  gridfinityLabelledTriangles,
  gridfinityLabelTextPatch,
  gridfinityLabelTextPlaces,
  gridfinityListPatch,
  normalizeGridfinityCompartmentLabels,
} from "@/lib/gridfinityGeometry";
import { gridfinityLabelFont, gridfinityLabelGlyphs, gridfinityLabelLetters, gridfinityLabelTextLeftOut } from "@/lib/gridfinityLabelText";
import { typefaceFromFontFile } from "@/lib/customFonts";
import { exportLylProject, importLylProject, type LylProjectDocumentV1 } from "@/lib/lylProject";
import { rememberManifoldRuntime } from "@/lib/manifoldHandle";
import { mcpGridfinityListParams, mcpGridfinityPatch } from "@/lib/mcpShapeSettings";
import { makeShapeFromAsset, sceneShape, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { shapeDefaultsFromShape } from "@/lib/shapeDefaults";
import { SURFACE_TEXT_FONTS } from "@/lib/surfaceTextOutline";
import { straightTextShapes } from "@/lib/textGeometry";
import { customFontEntry, loadJapaneseTypeface, loadTextFonts, registerCustomFont, resetCustomFontsForTests, resetJapaneseTypefaceForTests, setJapaneseTypefaceFetcherForTests, textFont } from "@/lib/textFonts";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE, normalizeShapeCustomizations } from "@/lib/workplaneSettings";
import { canonicalizeShape, workplaneShapesEqual } from "@/lib/workplaneShapes";
import type { GridfinityCompartmentLabel, WorkplaneShape } from "@/types/layerling";

/*
 * Text on a Gridfinity bin's label shelves (Discussion #1308): the room on each shelf's top, the letters fitted into it
 * the right way round, and the letters joined to the bin 0.4 mm high. The numbers are worked out by hand for a bin of
 * 2 x 1 x 3 units with the 0.95 mm wall: 81.6 x 39.6 mm inside, the shelves' top at 21 - 0.85 = 20.15 mm.
 */

type V = [number, number, number];

let runtime: ManifoldToplevel;

beforeAll(async () => {
  await loadTextFonts();
  runtime = await manifoldModule();
  runtime.setup();
  rememberManifoldRuntime(runtime);
});

const bin = (fields: Record<string, unknown> = {}) => ({ width: 83.5, depth: 41.5, height: 21 + GRIDFINITY_LIP_HEIGHT, gridfinityType: "bin" as const, gridfinityLip: true, ...fields });

function binShape(fields: Record<string, unknown> = {}) {
  return { id: "g", name: "bin", kind: "gridfinity", x: 0, z: 0, elevation: 0, size: 83.5, width: 83.5, depth: 41.5, height: 25.4, rotation: 0, color: "#4f7fa8", gridfinityType: "bin", ...fields } as WorkplaneShape;
}

/** Two compartments side by side, a label against the back wall in the left one. */
const divided = (label: Partial<GridfinityCompartmentLabel> = {}) => bin({ gridfinityCompartmentsX: 2, gridfinityCompartmentLabels: [{ column: 0, row: 0, side: "back", text: "Screws", ...label }] });

function volume(triangles: V[][]) {
  return triangles.reduce((sum, [a, b, c]) => sum + (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6, 0);
}

/** Every edge used once each way after welding: closed and two-manifold. */
function openEdges(triangles: V[][]) {
  const ids = new Map<string, number>();
  const id = (v: V) => {
    const key = v.map((n) => Math.round(n * 1e5)).join(",");
    if (!ids.has(key)) ids.set(key, ids.size);
    return ids.get(key)!;
  };
  const directed = new Map<string, number>();
  triangles.forEach((t) => {
    const [a, b, c] = t.map(id);
    for (const [p, q] of [[a, b], [b, c], [c, a]]) if (p !== q) directed.set(`${p}>${q}`, (directed.get(`${p}>${q}`) ?? 0) + 1);
  });
  let problems = 0;
  directed.forEach((count, key) => {
    const [p, q] = key.split(">");
    if (count !== 1 || directed.get(`${q}>${p}`) !== 1) problems += 1;
  });
  return problems;
}

/** The area of each glyph's rings by the even-odd rule, worked out without Manifold: the outline less its holes. */
function lettersArea(shape: ReturnType<typeof bin>) {
  const area = (ring: Array<[number, number]>) => Math.abs(ring.reduce((sum, [x, z], i) => {
    const [nx, nz] = ring[(i + 1) % ring.length];
    return sum + x * nz - nx * z;
  }, 0)) / 2;
  return gridfinityLabelLetters(shape).reduce((sum, label) => sum + label.glyphs.reduce((inner, [outline, ...holes]) => inner + area(outline) - holes.reduce((h, hole) => h + area(hole), 0), 0), 0);
}

const close = (value: number, expected: number, digits = 6) => expect(value).toBeCloseTo(expected, digits);

describe("the room for the letters on a Gridfinity label shelf", () => {
  it("keeps the back shelf's letters 1.5 mm off the wall, under the lip's support, 0.4 mm off the front and 2.8 mm off the walls at its ends", () => {
    // Out from the wall: 0.3 clear of the support, which leans 1.75 + 0.4 - 0.95 = 1.2 mm in at the letters' top; up to
    // 14 - 0.4. Along it: 40.8 less the inner corners' 2.8 mm rounding.
    const [place] = gridfinityLabelTextPlaces(bin({ gridfinityLabelBack: true, gridfinityLabelBackText: "AB" }));
    expect(place).toMatchObject({ shelf: "back", text: "AB", top: 20.15, along: { x: 1, z: 0 }, up: { x: 0, z: -1 } });
    close(place.length, 76);
    close(place.height, 12.1);
    close(place.centre.x, 0);
    close(place.centre.z, -19.8 + (1.5 + 13.6) / 2);
  });

  it("reads the front shelf from the bin's front and the side shelves along their wall from inside, standing up towards it", () => {
    const places = gridfinityLabelTextPlaces(bin({ gridfinityLabelFront: true, gridfinityLabelLeft: true, gridfinityLabelRight: true, gridfinityLabelFrontText: "F", gridfinityLabelLeftText: "L", gridfinityLabelRightText: "R" }));
    const of = (wall: string) => places.find((place) => place.shelf === wall)!;
    expect(of("front")).toMatchObject({ along: { x: 1, z: 0 }, up: { x: 0, z: -1 } });
    expect(of("left")).toMatchObject({ along: { x: 0, z: -1 }, up: { x: -1, z: 0 } });
    expect(of("right")).toMatchObject({ along: { x: 0, z: 1 }, up: { x: 1, z: 0 } });
    // The front shelf runs into the side shelves, 14 mm wide: its letters stop where theirs begin. The side shelves run
    // into the front one and into the back wall's corner.
    close(of("front").length, 2 * (40.8 - 14));
    close(of("front").centre.z, 19.8 - 7.55);
    close(of("left").length, 2 * 19.8 - 14 - 2.8);
    close(of("left").centre.x, -40.8 + 7.55);
    close(of("left").centre.z, (-19.8 + 2.8 + 19.8 - 14) / 2);
  });

  it("keeps clear of a free end's rounding, or 0.4 mm of a chamfered one", () => {
    // A 30 mm shelf in the middle of the wall, its front corners rounded by 2 mm.
    close(gridfinityLabelTextPlaces(bin({ gridfinityLabelBack: true, gridfinityLabelBackLength: 30, gridfinityLabelBackText: "AB" }))[0].length, 30 - 2 * 2);
    close(gridfinityLabelTextPlaces(bin({ gridfinityLabelBack: true, gridfinityLabelBackLength: 30, gridfinityLabelCorner: "chamfer", gridfinityLabelBackText: "AB" }))[0].length, 30 - 2 * 0.4);
  });

  it("runs out to 0.4 mm before an open side, where no wall or corner is left", () => {
    const [place] = gridfinityLabelTextPlaces(bin({ gridfinityOpenRight: true, gridfinityLabelBack: true, gridfinityLabelBackText: "AB" }));
    close(place.length, 40.8 - 0.4 + 40.8 - 2.8);
  });

  it("comes as far as the walls let it: 0.3 mm from a thick wall the support no longer leans over, and its square corners", () => {
    // A 2.5 mm wall: inside 78.5 x 36.5, inner corners rounded by 1.25.
    const [thick] = gridfinityLabelTextPlaces(bin({ gridfinityWallThickness: 2.5, gridfinityLabelBack: true, gridfinityLabelBackText: "AB" }));
    close(thick.length, 2 * (39.25 - 1.25));
    close(thick.height, 14 - 0.4 - 0.3);
    // Without the lip nothing leans over the shelf.
    const [lipless] = gridfinityLabelTextPlaces(bin({ height: 21, gridfinityLip: false, gridfinityLabelBack: true, gridfinityLabelBackText: "AB" }));
    close(lipless.height, 14 - 0.4 - 0.3);
    expect(lipless.top).toBe(20.15);
    // From a wall of 3.45 mm the inner corners' rounding (3.75 less the wall) is under the 0.3 mm the letters keep: a 3.5 mm
    // wall leaves 38.25 mm on either side of the middle, the letters 0.3 mm short of it.
    const [thickest] = gridfinityLabelTextPlaces(bin({ gridfinityWallThickness: 3.5, gridfinityLabelBack: true, gridfinityLabelBackText: "AB" }));
    close(thickest.length, 2 * (38.25 - 0.3));
  });

  it("gives a compartment's label the room of its compartment, the support leaning in only at the bin's wall", () => {
    // The left compartment: 40.2 mm across between the wall and the divider, its middle at x = -20.7.
    const [place] = gridfinityLabelTextPlaces(divided());
    expect(place.shelf).toEqual({ column: 0, row: 0 });
    close(place.length, 40.2 - 2 * 2.8);
    close(place.height, 12.1);
    close(place.centre.x, -20.7);
    close(place.centre.z, -19.8 + 7.55);
    // Against the divider nothing leans over it.
    const [onDivider] = gridfinityLabelTextPlaces(divided({ side: "right" }));
    close(onDivider.height, 14 - 0.4 - 0.3);
    close(onDivider.centre.x, -0.6 - (0.3 + 13.6) / 2);
    expect(onDivider).toMatchObject({ along: { x: 0, z: 1 }, up: { x: 1, z: 0 } });
  });

  it("has no letters on a tray, a bin under 3 units, a bin filled to the lip, a shelf on an open side or a shelf switched off", () => {
    expect(gridfinityLabelTextPlaces({ ...bin({ gridfinityLabelBack: true, gridfinityLabelBackText: "AB" }), gridfinityType: "tray", width: 80, depth: 40, height: 20 })).toEqual([]);
    expect(gridfinityLabelTextPlaces(bin({ height: 14 + GRIDFINITY_LIP_HEIGHT, gridfinityLabelBack: true, gridfinityLabelBackText: "AB" }))).toEqual([]);
    expect(gridfinityLabelTextPlaces(bin({ gridfinityFloorHeight: 25.4, gridfinityLabelBack: true, gridfinityLabelBackText: "AB" }))).toEqual([]);
    expect(gridfinityLabelTextPlaces(bin({ gridfinityOpenBack: true, gridfinityLabelBack: true, gridfinityLabelBackText: "AB" }))).toEqual([]);
    expect(gridfinityLabelTextPlaces(bin({ gridfinityLabelBackText: "AB" }))).toEqual([]);
    expect(gridfinityLabelTextPlaces(bin({ gridfinityLabelBack: true, gridfinityLabelBackText: "   " }))).toEqual([]);
  });

  it("lays the letters out for the wall a mirrored shelf ends up on, so the mirror shows them the right way round", () => {
    const placed = (fields: Record<string, unknown>) => gridfinityLabelTextPlaces(bin({ gridfinityLabelBack: true, gridfinityLabelLeft: true, gridfinityLabelBackText: "B", gridfinityLabelLeftText: "L", ...fields }));
    // A zero may come out as -0, which is the same direction.
    const plain = ({ x, z }: { x: number; z: number }) => ({ x: x + 0, z: z + 0 });
    const frames = (fields: Record<string, unknown>) => Object.fromEntries(placed(fields).map((place) => [place.shelf, { along: plain(place.along), up: plain(place.up) }]));
    expect(frames({ mirrorX: true })).toEqual({ back: { along: { x: -1, z: 0 }, up: { x: 0, z: -1 } }, left: { along: { x: 0, z: 1 }, up: { x: -1, z: 0 } } });
    // Across z the back shelf ends up at the front, read from there: in the shape's own frame its letters stand towards +z.
    expect(frames({ mirrorZ: true })).toEqual({ back: { along: { x: 1, z: 0 }, up: { x: 0, z: 1 } }, left: { along: { x: 0, z: 1 }, up: { x: -1, z: 0 } } });
    // Upside down they are read from below.
    expect(frames({ mirrorY: true })).toEqual({ back: { along: { x: -1, z: 0 }, up: { x: 0, z: -1 } }, left: { along: { x: 0, z: 1 }, up: { x: -1, z: 0 } } });
    expect(frames({ mirrorX: true, mirrorZ: true })).toEqual({ back: { along: { x: -1, z: 0 }, up: { x: 0, z: 1 } }, left: { along: { x: 0, z: -1 }, up: { x: -1, z: 0 } } });
  });
});

describe("letters fitted to a Gridfinity label shelf", () => {
  it("fits the box round the letters into the room, as large as it lets them", () => {
    // Two capitals on a 76 mm shelf: the 12.1 mm of height is what limits them.
    const [ab] = gridfinityLabelGlyphs(bin({ gridfinityLabelBack: true, gridfinityLabelBackText: "AB" }));
    expect(ab.size).toBeGreaterThan(11.8);
    expect(ab.size).toBeLessThanOrEqual(12.1 + 1e-9);
    // A long word is limited by the length: its letters end 2.8 mm from the walls.
    const long = gridfinityLabelLetters(bin({ gridfinityLabelBack: true, gridfinityLabelBackText: "MMMMMMMMMMMM" }))[0];
    const xs = long.glyphs.flat(2).map(([x]) => x);
    close(Math.min(...xs), -38, 1);
    close(Math.max(...xs), 38, 1);
    long.glyphs.flat(2).forEach(([, z]) => {
      expect(z).toBeGreaterThanOrEqual(-19.8 + 1.5 - 0.05);
      expect(z).toBeLessThanOrEqual(-19.8 + 13.6 + 0.05);
    });
  });

  it("puts an L's foot towards the reader on each wall", () => {
    const glyphs = gridfinityLabelGlyphs(bin({ gridfinityLabelBack: true, gridfinityLabelFront: true, gridfinityLabelLeft: true, gridfinityLabelRight: true, gridfinityLabelBackText: "L", gridfinityLabelFrontText: "L", gridfinityLabelLeftText: "L", gridfinityLabelRightText: "L" }));
    for (const { place, layout, map } of glyphs) {
      // The foot's end, low on the right of the layout: past the middle in the way the line reads, and below it.
      const { maxX, minY } = layout.box;
      const foot = map(maxX, minY);
      const from = { x: foot.x - place.centre.x, z: foot.z - place.centre.z };
      expect(from.x * place.along.x + from.z * place.along.z, String(place.shelf)).toBeGreaterThan(0);
      expect(from.x * place.up.x + from.z * place.up.z, String(place.shelf)).toBeLessThan(0);
    }
  });

  it("leaves a text out under a capital of 3 mm, and says so for its shelf only", () => {
    const crowded = bin({ width: 41.5, gridfinityLabelBack: true, gridfinityLabelLeft: true, gridfinityLabelBackText: "AB", gridfinityLabelLeftText: "W".repeat(24) });
    expect(gridfinityLabelGlyphs(crowded).map((glyphs) => glyphs.place.shelf)).toEqual(["back"]);
    expect(gridfinityLabelTextLeftOut(crowded, "left")).toBe(true);
    expect(gridfinityLabelTextLeftOut(crowded, "back")).toBe(false);
    expect(gridfinityLabelTextLeftOut(crowded, "right")).toBe(false);
    expect(gridfinityLabelTextLeftOut(divided(), { column: 0, row: 0 })).toBe(false);
  });

  it("keeps the holes in O, B and A, each glyph's outline and holes together", () => {
    // Each glyph's rings stay together: an O is its outline and its hole.
    const [o] = gridfinityLabelLetters(bin({ gridfinityLabelBack: true, gridfinityLabelBackText: "O" }))[0].glyphs;
    expect(o).toHaveLength(2);
    const holes = gridfinityLabelLetters(bin({ gridfinityLabelBack: true, gridfinityLabelBackText: "OBA" }))[0].glyphs.map((rings) => rings.length);
    expect(holes).toEqual([2, 3, 2]);
  });

  it("takes the built-in fonts, the text shape's own list, and fonts of one's own, as a text does", () => {
    expect(GRIDFINITY_LABEL_FONTS).toEqual(SURFACE_TEXT_FONTS);
    const area = (font: string) => lettersArea(bin({ gridfinityLabelBack: true, gridfinityLabelBackText: "Ag", gridfinityLabelFont: font }));
    expect(area("Serif")).not.toBeCloseTo(area("Multilanguage"), 1);
    // A font of one's own draws its own outlines; one this browser does not have draws Multilanguage meanwhile and keeps its id.
    registerCustomFont({ id: "custom:0123456789abcdef", name: "Mine", data: textFont("Serif").data as unknown as FontData }, true);
    expect(area("custom:0123456789abcdef")).toBeCloseTo(area("Serif"), 9);
    expect(area("custom:fedcba9876543210")).toBeCloseTo(area("Multilanguage"), 9);
    expect(gridfinityLabelFont({ gridfinityLabelFont: "custom:fedcba9876543210" })).toBe("custom:fedcba9876543210");
    expect(gridfinityLabelFont({ gridfinityLabelFont: "Comic" })).toBe("Multilanguage");
  });

  it("makes the capitals as high as the letter size, never higher than the shelf lets them nor under 3 mm", () => {
    // The back shelf's room is 12.1 mm high, and an H fills it; 0 is no letter size.
    const size = (letterSize?: number) => gridfinityLabelGlyphs(bin({ gridfinityLabelBack: true, gridfinityLabelBackText: "H", gridfinityLabelTextSize: letterSize }))[0].size;
    close(size(), 12.1);
    close(size(0), 12.1);
    close(size(5), 5);
    close(size(2), 3);
    close(size(20), 12.1);
  });

  it("gives shelves of different lengths the same capitals under a letter size, and still leaves out a text under 3 mm", () => {
    const shape = (letterSize?: number) => bin({ gridfinityLabelBack: true, gridfinityLabelLeft: true, gridfinityLabelBackText: "Screws M3", gridfinityLabelLeftText: "M3 nuts", gridfinityLabelTextSize: letterSize });
    const [back, left] = gridfinityLabelGlyphs(shape()).map((glyphs) => glyphs.size);
    expect(back - left).toBeGreaterThan(1);
    const capped = gridfinityLabelGlyphs(shape(left - 0.5));
    expect(capped).toHaveLength(2);
    capped.forEach((glyphs) => close(glyphs.size, left - 0.5));
    // A shelf whose text would be under 3 mm stays without it; a letter size makes no letters larger than the shelf lets them.
    const narrow = bin({ width: 41.5, gridfinityLabelBack: true, gridfinityLabelLeft: true, gridfinityLabelBackText: "AB", gridfinityLabelLeftText: "W".repeat(24), gridfinityLabelTextSize: 5 });
    expect(gridfinityLabelGlyphs(narrow).map((glyphs) => glyphs.place.shelf)).toEqual(["back"]);
    expect(gridfinityLabelTextLeftOut(narrow, "left")).toBe(true);
  });

  it("leaves a text out from just under a capital of 3 mm, measured on the box round the letters, descenders and all", () => {
    // A back shelf 4.5 mm wide has 4.5 - 0.4 - 1.5 = 2.6 mm of room up, 5 mm wide 3.1 mm: an H fills it.
    const shelf = (width: number, text: string) => bin({ gridfinityLabelBack: true, gridfinityLabelBackWidth: width, gridfinityLabelBackText: text });
    expect(gridfinityLabelGlyphs(shelf(4.5, "H"))).toEqual([]);
    expect(gridfinityLabelTextLeftOut(shelf(4.5, "H"), "back")).toBe(true);
    const [kept] = gridfinityLabelGlyphs(shelf(5, "H"));
    expect(kept.size).toBeGreaterThan(3);
    expect(kept.size).toBeLessThanOrEqual(3.1 + 1e-9);
    expect(gridfinityLabelTextLeftOut(shelf(5, "H"), "back")).toBe(false);
    // With a descender the box is taller than the capital: in 3.6 mm of room "HH" stays, "Hg" comes out under 3 mm.
    expect(gridfinityLabelGlyphs(shelf(5.5, "HH"))).toHaveLength(1);
    expect(gridfinityLabelGlyphs(shelf(5.5, "Hg"))).toEqual([]);
    expect(gridfinityLabelTextLeftOut(shelf(5.5, "Hg"), "back")).toBe(true);
  });

  it("says a text is left out for the compartment it belongs to, by column and row", () => {
    const rows = bin({ gridfinityCompartmentsX: 2, gridfinityCompartmentsZ: 2, gridfinityCompartmentLabels: [{ column: 0, row: 0, side: "back", text: "AB" }, { column: 0, row: 1, side: "back", width: 4.5, text: "W".repeat(24) }, { column: 1, row: 1, side: "back", text: "AB" }] });
    expect(gridfinityLabelTextLeftOut(rows, { column: 0, row: 0 })).toBe(false);
    expect(gridfinityLabelTextLeftOut(rows, { column: 0, row: 1 })).toBe(true);
    expect(gridfinityLabelTextLeftOut(rows, { column: 1, row: 1 })).toBe(false);
  });

  it("gives no note for a text whose shelf is not built, which has its own note or none", () => {
    // Shorter than 4 mm, the compartment's shelf is left out and says so itself; on an open side it has none.
    const thirds = (fields: Record<string, unknown>) => bin({ gridfinityCompartmentsX: 3, gridfinityCompartmentLabels: [{ column: 0, row: 0, side: "back", text: "W".repeat(24), ...fields }] });
    expect(gridfinityLabelTextLeftOut(thirds({}), { column: 0, row: 0 })).toBe(true);
    expect(gridfinityLabelTextLeftOut(thirds({ length: 10 }), { column: 0, row: 0 })).toBe(false);
    expect(gridfinityLabelTextLeftOut(bin({ gridfinityOpenBack: true, gridfinityCompartmentsX: 3, gridfinityCompartmentLabels: [{ column: 0, row: 0, side: "back", text: "W".repeat(24) }] }), { column: 0, row: 0 })).toBe(false);
    expect(gridfinityLabelTextLeftOut(bin({ gridfinityOpenBack: true, gridfinityLabelBack: true, gridfinityLabelBackText: "W".repeat(24) }), "back")).toBe(false);
    expect(gridfinityLabelTextLeftOut(bin({ gridfinityLabelBackText: "W".repeat(24) }), "back")).toBe(false);
  });

  it("counts a text as letters only where a shelf that is built carries one that draws something", () => {
    expect(gridfinityHasLabelText(bin({ gridfinityLabelBack: true, gridfinityLabelBackText: "M3" }))).toBe(true);
    expect(gridfinityHasLabelText(bin({ gridfinityLabelBackText: "M3" }))).toBe(false);
    // A text kept for a shelf that is switched off, while another shelf is on.
    expect(gridfinityHasLabelText(bin({ gridfinityLabelBack: true, gridfinityLabelLeftText: "M3" }))).toBe(false);
    expect(gridfinityLabelLetters(bin({ gridfinityLabelBack: true, gridfinityLabelLeftText: "M3" }))).toEqual([]);
    expect(gridfinityHasLabelText(bin({ gridfinityLabelBack: true, gridfinityLabelBackText: " \u200b\u2060 " }))).toBe(false);
    expect(gridfinityHasLabelText({ ...bin({ gridfinityLabelBack: true, gridfinityLabelBackText: "M3" }), gridfinityType: "tray", width: 80, depth: 40, height: 20 })).toBe(false);
    expect(gridfinityHasLabelText(divided())).toBe(true);
    // Labels kept for compartments a smaller count leaves out carry no letters.
    expect(gridfinityHasLabelText(bin({ gridfinityCompartmentLabels: [{ column: 0, row: 0, side: "back", text: "M3" }] }))).toBe(false);
  });

  it("lays the line out kerned, as a text shape with kerning on", () => {
    // A and V close up; without kerning the line would be wider.
    const [{ layout }] = gridfinityLabelGlyphs(bin({ gridfinityLabelBack: true, gridfinityLabelBackText: "AVA" }));
    let minX = Infinity, maxX = -Infinity;
    straightTextShapes({ text: "AVA", font: "Multilanguage", textKerning: false }, 100).forEach((glyph) => glyph.extractPoints(6).shape.forEach((point) => {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
    }));
    expect(layout.box.maxX - layout.box.minX).toBeLessThan(maxX - minX - 5);
  });

  it("draws Stencil with straight pieces in the exact body too", () => {
    const part = cadModifierGridfinityForShape(binShape({ gridfinityLabelBack: true, gridfinityLabelBackText: "OS", gridfinityLabelFont: "Stencil" }))!;
    const segments = part.gridfinityLetters!.flatMap((label) => label.glyphs.flat().flatMap((loop) => loop.segments));
    expect(segments.length).toBeGreaterThan(0);
    expect(segments.some((segment) => segment.kind === "bezier")).toBe(false);
  });

  it("joins letters that run into one another glyph by glyph, where one even-odd outline would cut their overlap out", () => {
    // In Script the tail of the g runs into the j.
    const shape = bin({ gridfinityLabelBack: true, gridfinityLabelBackText: "gj", gridfinityLabelFont: "Script" });
    const [{ glyphs }] = gridfinityLabelLetters(shape);
    const section = (rings: Array<Array<[number, number]>>) => new runtime.CrossSection(rings, "EvenOdd");
    const pieces = glyphs.map(section);
    const joined = runtime.CrossSection.union(pieces);
    const single = section(glyphs.flat());
    try {
      expect(pieces.reduce((sum, piece) => sum + piece.area(), 0) - joined.area()).toBeGreaterThan(0.1);
      expect(joined.area() - single.area()).toBeGreaterThan(0.1);
      const gained = volume(gridfinityLabelledTriangles(runtime, shape, [{ top: 20.15, glyphs }])) - volume(gridfinityLabelledTriangles(runtime, shape));
      // The mesh's shelf sits 0.0017 mm low (LABEL_MESH_NUDGE), so its letters stand 0.4 % taller; one outline for both would come out 0.5 % less than their union.
      expect(gained / GRIDFINITY_LABEL_TEXT_HEIGHT / joined.area()).toBeGreaterThan(0.999);
      expect(gained / GRIDFINITY_LABEL_TEXT_HEIGHT / joined.area()).toBeLessThan(1.008);
    } finally {
      [...pieces, joined, single].forEach((value) => value.delete());
    }
  });
});

describe("a Gridfinity bin with letters on its shelves", { timeout: 60_000 }, () => {
  it("stands the letters 0.4 mm on the shelf's top, 0.1 mm under the feet of a bin stacked on it, as one closed body", () => {
    const shape = bin({ gridfinityLabelBack: true, gridfinityLabelBackText: "AB" });
    const plain = gridfinityLabelledTriangles(runtime, shape);
    const lettered = gridfinityLabelledTriangles(runtime, shape, gridfinityLabelLetters(shape));
    expect(openEdges(lettered)).toBe(0);
    // Over the back shelf, away from the walls, nothing stands higher than the letters' top.
    const over = lettered.flat().filter(([x, y, z]) => Math.abs(x) < 30 && z < -6 && z > -18 && y > 20.2);
    expect(over.length).toBeGreaterThan(0);
    over.forEach(([, y]) => expect(y).toBeCloseTo(20.15 + GRIDFINITY_LABEL_TEXT_HEIGHT, 2));
    expect(20.15 + GRIDFINITY_LABEL_TEXT_HEIGHT).toBeLessThanOrEqual(21 - 0.35 - 0.1 + 1e-9);
    // The letters add their area times their height, worked out from their outlines.
    expect((volume(lettered) - volume(plain)) / (lettersArea(shape) * GRIDFINITY_LABEL_TEXT_HEIGHT)).toBeCloseTo(1, 2);
  });

  it("joins letters on four shelves and in 40 compartments", () => {
    const walls = bin({ gridfinityLabelBack: true, gridfinityLabelFront: true, gridfinityLabelLeft: true, gridfinityLabelRight: true, gridfinityLabelBackText: "Back 1", gridfinityLabelFrontText: "Front", gridfinityLabelLeftText: "Left", gridfinityLabelRightText: "Right" });
    expect(gridfinityLabelLetters(walls)).toHaveLength(4);
    expect(openEdges(gridfinityLabelledTriangles(runtime, walls, gridfinityLabelLetters(walls)))).toBe(0);
    const labels = Array.from({ length: 40 }, (_entry, i) => ({ column: i % 8, row: Math.floor(i / 8), side: "back" as const, text: `M${i}x08` }));
    const many = bin({ width: 251.5, depth: 209.5, gridfinityCompartmentsX: 8, gridfinityCompartmentsZ: 5, gridfinityCompartmentLabels: labels });
    const letters = gridfinityLabelLetters(many);
    expect(letters).toHaveLength(40);
    const triangles = gridfinityLabelledTriangles(runtime, many, letters);
    expect(openEdges(triangles)).toBe(0);
    expect((volume(triangles) - volume(gridfinityLabelledTriangles(runtime, many))) / (lettersArea(many) * GRIDFINITY_LABEL_TEXT_HEIGHT)).toBeCloseTo(1, 2);
  });

  it("draws the letters in the mesh for groups and exports and in the view", () => {
    const shape = binShape({ gridfinityLabelBack: true, gridfinityLabelBackText: "Lq7" });
    const plain = binShape({ gridfinityLabelBack: true });
    const expected = lettersArea(shape) * GRIDFINITY_LABEL_TEXT_HEIGHT;
    const meshVolume = (s: WorkplaneShape) => {
      const { vertices, faces } = meshForShape(s);
      return volume(faces.map((face) => face.map((i) => vertices[i]) as V[]));
    };
    expect((meshVolume(shape) - meshVolume(plain)) / expected).toBeCloseTo(1, 2);
    const drawnVolume = (s: WorkplaneShape) => {
      let total = 0;
      createShapeObject(s, false, undefined, false).traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        const position = (child.geometry as THREE.BufferGeometry).getAttribute("position");
        const index = (child.geometry as THREE.BufferGeometry).getIndex();
        const at = (i: number): V => [position.getX(i), position.getY(i), position.getZ(i)];
        const count = index ? index.count : position.count;
        const triangles: V[][] = [];
        for (let i = 0; i < count; i += 3) triangles.push([0, 1, 2].map((k) => at(index ? index.getX(i + k) : i + k)));
        total += volume(triangles);
      });
      return total;
    };
    expect((drawnVolume(shape) - drawnVolume(plain)) / expected).toBeCloseTo(1, 2);
  });

  it("builds a bin with blank text exactly as one without", () => {
    const blank = bin({ gridfinityLabelBack: true, gridfinityLabelBackText: "  " });
    expect(gridfinityHasLabelText(blank)).toBe(false);
    expect(gridfinityLabelledTriangles(runtime, blank, gridfinityLabelLetters(blank))).toEqual(gridfinityLabelledTriangles(runtime, bin({ gridfinityLabelBack: true })));
    expect(meshForShape(binShape({ gridfinityLabelBack: true, gridfinityLabelBackText: "" }))).toEqual(meshForShape(binShape({ gridfinityLabelBack: true })));
    expect(cadModifierGridfinityForShape(binShape({ gridfinityLabelBack: true, gridfinityLabelBackText: " " }))).toStrictEqual(cadModifierGridfinityForShape(binShape({ gridfinityLabelBack: true })));
  });

  it("hands the letters to the exact body with the font's curves, and counts their pieces for the edge tool's limit", () => {
    const part = cadModifierGridfinityForShape(binShape({ gridfinityLabelBack: true, gridfinityLabelBackText: "OS" }))!;
    expect(part.gridfinityLetters).toHaveLength(1);
    const [label] = part.gridfinityLetters!;
    expect(label.top).toBe(20.15);
    expect(label.glyphs.map((loops) => loops.length)).toEqual([2, 1]);
    expect(label.glyphs.flat().some((loop) => loop.segments.some((segment) => segment.kind === "bezier"))).toBe(true);
    expect(cadGridfinityLetterSegmentCount(part)).toBe(label.glyphs.flat().reduce((sum, loop) => sum + loop.segments.length, 0));
    expect(cadGridfinityLetterSegmentCount(cadModifierGridfinityForShape(binShape({ gridfinityLabelBack: true }))!)).toBe(0);
  });

  it("counts a bin's letters with its outline plate's edges in the request's time budget", () => {
    const part = cadModifierGridfinityForShape(binShape({ gridfinityLabelBack: true, gridfinityLabelBackText: "Screws" }))!;
    const letters = cadGridfinityLetterSegmentCount(part);
    expect(letters).toBeGreaterThan(50);
    expect(cadGridfinitySegmentCount(part)).toBe(letters);
    expect(cadGridfinitySegmentCount({ ...part, gridfinityOutline: [{ x: 0, z: 0 }, { x: 80, z: 0 }, { x: 80, z: 40 }, { x: 0, z: 40 }] })).toBe(letters + 4);
    expect(cadGridfinitySegmentCount(undefined)).toBe(0);
  });

  it("shares the edge tool's budget of outline pieces between every bin with letters in one request", () => {
    const part = (text: string) => cadModifierGridfinityForShape(binShape({ gridfinityLabelBack: true, gridfinityLabelBackText: text }))!;
    const mesh = { faces: { length: 1000 } };
    const one = part("Screws M3 x 8");
    const pieces = cadGridfinityLetterSegmentCount(one);
    // Two such bins fit the 700 pieces, but not four: the bins sent to their meshes take no exact body along.
    expect(pieces * 2).toBeLessThanOrEqual(CAD_MODIFIER_EXACT_SEGMENT_LIMIT);
    expect(pieces * 4).toBeGreaterThan(CAD_MODIFIER_EXACT_SEGMENT_LIMIT);
    const two = [{ gridfinity: one, profileMesh: mesh }, { gridfinity: part("Screws M3 x 8"), profileMesh: mesh }];
    expect(withinExactProfileLimit(two)).toBe(two);
    const four = withinExactProfileLimit([...two, { gridfinity: part("Screws M3 x 8"), profileMesh: mesh }, { gridfinity: part("Screws M3 x 8"), profileMesh: mesh }]);
    expect(four.filter((entry) => entry.gridfinity)).toHaveLength(Math.floor(CAD_MODIFIER_EXACT_SEGMENT_LIMIT / pieces));
    four.filter((entry) => !entry.gridfinity).forEach((entry) => expect(entry).toStrictEqual({ gridfinity: undefined, profile: undefined, profileMesh: undefined, mesh }));
    // A bin without letters takes nothing of it and stays exact.
    const bare = cadModifierGridfinityForShape(binShape({ gridfinityLabelBack: true }))!;
    expect(withinExactProfileLimit([{ gridfinity: bare, profileMesh: mesh }, ...Array.from({ length: 4 }, () => ({ gridfinity: part("Screws M3 x 8"), profileMesh: mesh }))])[0].gridfinity).toBe(bare);
  });

  it("draws the bin again when a text, the font, the letter size or the mirroring of its letters changes", () => {
    const shape = canonicalizeShape(binShape({ gridfinityLabelBack: true, gridfinityLabelBackText: "AB", gridfinityCompartmentLabels: [{ column: 0, row: 0, side: "back", text: "x" }] }));
    for (const change of [{ gridfinityLabelBackText: "AC" }, { gridfinityLabelFrontText: "AB" }, { gridfinityLabelLeftText: "AB" }, { gridfinityLabelRightText: "AB" }, { gridfinityLabelFont: "Serif" }, { gridfinityLabelTextSize: 5 }, { mirrorX: true }, { mirrorY: true }, { mirrorZ: true }, { gridfinityCompartmentLabels: [{ column: 0, row: 0, side: "back" as const, text: "y" }] }]) {
      const changed = { ...shape, ...change };
      expect(shapeGeometrySignature(changed), JSON.stringify(change)).not.toBe(shapeGeometrySignature(shape));
      expect(tapeShapeTopologyKey(changed), JSON.stringify(change)).not.toBe(tapeShapeTopologyKey(shape));
      expect(workplaneShapesEqual(changed, shape), JSON.stringify(change)).toBe(false);
    }
    // A bin without text draws the same mirrored or not: the mirror is the view's.
    const plain = canonicalizeShape(binShape({ gridfinityLabelBack: true }));
    expect(shapeGeometrySignature({ ...plain, mirrorX: true })).toBe(shapeGeometrySignature(plain));
  });

  it("draws a bin in a font of one's own again when the font arrives", () => {
    const shape = canonicalizeShape(binShape({ gridfinityLabelBack: true, gridfinityLabelBackText: "AB", gridfinityLabelFont: "custom:00000000000000aa" }));
    const [signature, topology] = [shapeGeometrySignature(shape), tapeShapeTopologyKey(shape)];
    registerCustomFont({ id: "custom:00000000000000aa", name: "Late", data: textFont("Serif").data as unknown as FontData }, false);
    expect(shapeGeometrySignature(shape)).not.toBe(signature);
    expect(tapeShapeTopologyKey(shape)).not.toBe(topology);
  });
});

describe("text on Gridfinity label shelves through the project, the defaults and MCP", () => {
  const texts = { gridfinityLabelBack: true, gridfinityLabelBackText: "Screws M3", gridfinityLabelFrontText: "F", gridfinityLabelLeftText: "L", gridfinityLabelRightText: "R", gridfinityLabelFont: "Serif" };

  it("keeps the texts, the font and a compartment's text through a saved project, and refuses a text over 24 characters", async () => {
    const shape = canonicalizeShape(binShape({ ...texts, gridfinityCompartmentsX: 2, gridfinityCompartmentLabels: [{ column: 1, row: 0, side: "front", text: "Nuts" }] }));
    const project = (shapes: WorkplaneShape[]) => exportLylProject({
      projectId: "labels",
      projectName: "Labels",
      createdAt: 1_700_000_000_000,
      modifiedAt: 1_700_000_100_000,
      shapes,
      history: [editorHistoryEntry(shapes, [])],
      historyIndex: 0,
      assets: [],
      workspace: DEFAULT_WORKPLANE_WORKSPACE,
      snapGrid: DEFAULT_SNAP_GRID,
      placementElevation: 0,
    });
    const roundTrip = async (shapes: WorkplaneShape[]) => importLylProject(await project(shapes));
    const [loaded] = (await roundTrip([shape])).shapes;
    expect(workplaneShapesEqual(loaded, shape)).toBe(true);
    expect(loaded).toMatchObject({ ...texts, gridfinityCompartmentLabels: [{ column: 1, row: 0, side: "front", text: "Nuts" }] });
    expect(sceneShape(shape)).toMatchObject({ ...texts, gridfinityCompartmentLabels: shape.gridfinityCompartmentLabels });
    await expect(roundTrip([{ ...shape, gridfinityLabelBackText: "x".repeat(25) }])).rejects.toThrow(/gridfinityLabelBackText/);
    await expect(roundTrip([{ ...shape, gridfinityCompartmentLabels: [{ column: 0, row: 0, side: "back", text: "x".repeat(25) }] }])).rejects.toThrow(/text/);
    await expect(roundTrip([{ ...shape, gridfinityLabelFont: "custom:abc" }])).rejects.toThrow(/gridfinityLabelFont/);
    expect((await roundTrip([{ ...shape, gridfinityLabelTextSize: 6.5 }])).shapes[0].gridfinityLabelTextSize).toBe(6.5);
    expect(sceneShape({ ...shape, gridfinityLabelTextSize: 6.5 }).gridfinityLabelTextSize).toBe(6.5);
    await expect(roundTrip([{ ...shape, gridfinityLabelTextSize: -1 }])).rejects.toThrow(/gridfinityLabelTextSize/);
    expect((await roundTrip([{ ...shape, gridfinityLabelFont: "custom:0123456789abcdef" }])).shapes[0].gridfinityLabelFont).toBe("custom:0123456789abcdef");
    await expect(roundTrip([{ ...shape, gridfinityLabelLeftText: 3 } as unknown as WorkplaneShape])).rejects.toThrow(/gridfinityLabelLeftText/);
  });

  it("keeps the font but not the texts as a default for new bins", () => {
    const shape = binShape(texts);
    const defaults = shapeDefaultsFromShape(shape)!;
    expect(defaults).toMatchObject({ gridfinityLabelFont: "Serif" });
    expect(defaults).not.toHaveProperty("gridfinityLabelBackText");
    expect(normalizeShapeCustomizations({ gridfinity: { gridfinityLabelFont: "Script" } }, {})).toMatchObject({ gridfinity: { gridfinityLabelFont: "Script" } });
    expect(normalizeShapeCustomizations({ gridfinity: { gridfinityLabelFont: "custom:abc" } }, {}).gridfinity?.gridfinityLabelFont).toBeUndefined();
    // A font of one's own is not a default, as for a text: another computer may not have it.
    expect(normalizeShapeCustomizations({ gridfinity: { gridfinityLabelFont: "custom:0123456789abcdef" } }, {}).gridfinity?.gridfinityLabelFont).toBeUndefined();
    expect(shapeDefaultsFromShape(binShape({ ...texts, gridfinityLabelFont: "custom:0123456789abcdef" }))?.gridfinityLabelFont).toBeUndefined();
    const asset = toolbarShapeAssets.find((entry) => entry.kind === "gridfinity")!;
    expect(makeShapeFromAsset(asset, { x: 0, z: 0 }, { gridfinityLabelFont: "Script" })).toMatchObject({ gridfinityLabelFont: "Script" });
    // The letter size is a style too, kept for new bins, and MCP reads it back.
    expect(shapeDefaultsFromShape(binShape({ ...texts, gridfinityLabelTextSize: 6 }))).toMatchObject({ gridfinityLabelTextSize: 6 });
    expect(normalizeShapeCustomizations({ gridfinity: { gridfinityLabelTextSize: -2 } }, {}).gridfinity?.gridfinityLabelTextSize).toBe(0);
    // Under 3 mm it is stored as 3, as the settings row stores it, also when MCP sets it.
    expect([0.5, 2.9, 3, 4.5].map((size) => normalizeShapeCustomizations({ gridfinity: { gridfinityLabelTextSize: size } }, {}).gridfinity?.gridfinityLabelTextSize)).toEqual([3, 3, 3, 4.5]);
    expect(makeShapeFromAsset(asset, { x: 0, z: 0 }, { gridfinityLabelTextSize: 6 })).toMatchObject({ gridfinityLabelTextSize: 6 });
    expect(mcpShapeSummary(binShape({ ...texts, gridfinityLabelTextSize: 7.5 }))).toMatchObject({ settings: { gridfinityLabelTextSize: 7.5 } });
  });

  it("writes the texts create_shape and update_object give, with the lists, in one patch", () => {
    const labels = [{ column: 0, row: 0, side: "back", text: "Washers" }];
    expect(mcpGridfinityPatch({ gridfinityLabelBackText: "M3", gridfinityLabelLeftText: "", gridfinityCompartmentLabels: JSON.stringify(labels), gridfinityCompartmentsX: 2 })).toStrictEqual({ gridfinityCompartmentsX: 2, gridfinityDividerPositionsX: undefined, gridfinityCompartmentLabels: labels, gridfinityLabelBackText: "M3", gridfinityLabelLeftText: undefined });
    // Nothing of a bin's own given, nothing written.
    expect(mcpGridfinityPatch({ width: 83.5, gridfinityLabelFont: "Serif" })).toStrictEqual({});
  });

  it("takes the texts from MCP, a compartment's in its label, and reads them back", () => {
    expect(gridfinityLabelTextPatch({ gridfinityLabelBackText: "M3", gridfinityLabelFrontText: "", gridfinityLabelLeftText: "x".repeat(30), gridfinityLabelRightText: 4 })).toStrictEqual({ gridfinityLabelBackText: "M3", gridfinityLabelFrontText: undefined, gridfinityLabelLeftText: "x".repeat(24) });
    const labels = [{ column: 0, row: 0, side: "back", text: "Washers" }];
    expect(gridfinityListPatch(mcpGridfinityListParams({ gridfinityCompartmentLabels: labels })).gridfinityCompartmentLabels).toEqual(labels);
    expect(gridfinityListPatch(mcpGridfinityListParams({ gridfinityCompartmentLabels: JSON.stringify(labels) })).gridfinityCompartmentLabels).toEqual(labels);
    expect(normalizeGridfinityCompartmentLabels([{ column: 0, row: 0, side: "back", text: "y".repeat(30) }, { column: 1, row: 0, side: "back", text: 5 }])).toEqual([{ column: 0, row: 0, side: "back", text: "y".repeat(24) }, { column: 1, row: 0, side: "back" }]);
    const summary = JSON.stringify(mcpShapeSummary(binShape({ ...texts, gridfinityCompartmentLabels: [{ column: 0, row: 0, side: "back", text: "Washers" }] })));
    for (const value of ["Screws M3", "Serif", "Washers", "gridfinityLabelRightText"]) expect(summary).toContain(value);
  });

  it("takes a built-in font or a font of one's own by its name or id from MCP, and refuses any other", () => {
    registerCustomFont({ id: "custom:0123456789abcdef", name: "Mine", data: textFont("Serif").data as unknown as FontData }, true);
    expect(mcpGridfinityLabelFont("Serif")).toBe("Serif");
    expect(mcpGridfinityLabelFont("mine")).toBe("custom:0123456789abcdef");
    expect(mcpGridfinityLabelFont("custom:fedcba9876543210")).toBe("custom:fedcba9876543210");
    expect(() => mcpGridfinityLabelFont("Comic")).toThrow("gridfinityLabelFont must be one of Multilanguage, Sans, Serif, Script, Monospace, Rounded, Stencil, Japanese, or a font of one's own by its name or id (layerling_list_fonts)");
    expect(() => mcpGridfinityLabelFont(3)).toThrow(/gridfinityLabelFont must be one of/);
  });

  it("brings the letters of a bin's font of one's own along in a saved project, the H that sizes them too, in a group and in every undo state, so they come out the same elsewhere", async () => {
    const buffer = readFileSync(join(process.cwd(), "node_modules/three/examples/fonts/ttf/kenpixel.ttf"));
    const typeface = await typefaceFromFontFile(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer, "kenpixel.ttf", runtime);
    registerCustomFont(typeface, true);
    const shape = canonicalizeShape(binShape({ gridfinityLabelBack: true, gridfinityLabelFront: true, gridfinityLabelBackText: "Abc", gridfinityLabelFrontText: "Zug", gridfinityLabelFont: typeface.id, gridfinityCompartmentLabels: [{ column: 0, row: 0, side: "back", text: "Nuts" }] }));
    const [glyphs, letters] = [gridfinityLabelGlyphs(shape), gridfinityLabelLetters(shape)];
    expect(glyphs).toHaveLength(2);
    // Now in a group, and before that alone with a back text whose Q, i and z it no longer has.
    const group = (await buildGroupedShapeFromSelection([shape, { ...shape, id: "plain", gridfinityLabelFont: undefined, x: 120 }], 250_000)).group!;
    const earlier = { ...shape, gridfinityLabelBackText: "Quiz" };
    const bytes = await exportLylProject({
      projectName: "Labels",
      createdAt: 1_700_000_000_000,
      modifiedAt: 1_700_000_100_000,
      shapes: [group],
      history: [editorHistoryEntry([earlier], []), editorHistoryEntry([group], [])],
      historyIndex: 1,
      assets: [],
      workspace: DEFAULT_WORKPLANE_WORKSPACE,
      snapGrid: DEFAULT_SNAP_GRID,
      placementElevation: 0,
    });
    const document = JSON.parse(strFromU8(unzipSync(bytes)["project.json"])) as LylProjectDocumentV1;
    expect(document.fonts?.map((font) => font.id)).toEqual([typeface.id]);
    expect(Object.keys((document.fonts![0].typeface as { glyphs: object }).glyphs).sort()).toEqual([" ", "A", "H", "N", "Q", "Z", "b", "c", "g", "i", "s", "t", "u", "z"]);

    resetCustomFontsForTests();
    const loaded = (await importLylProject(bytes)).shapes[0].groupedShapes!.find((part) => part.gridfinityLabelFont)!;
    expect(customFontEntry(typeface.id)?.complete).toBe(false);
    expect(loaded.gridfinityLabelFont).toBe(typeface.id);
    expect(gridfinityLabelGlyphs(loaded).map((entry) => entry.size)).toEqual(glyphs.map((entry) => entry.size));
    expect(gridfinityLabelLetters(loaded)).toEqual(letters);
  });
});

const fontRoot = fileURLToPath(new URL("../../apps/web/public/fonts/japanese/", import.meta.url));
const japaneseBuilt = existsSync(`${fontRoot}version.txt`);

describe.skipIf(!japaneseBuilt)("letters on a Gridfinity label shelf when the Japanese face arrives", () => {
  afterAll(() => resetJapaneseTypefaceForTests());

  it("lays the text out again and builds the bin anew, rather than keeping its question marks", async () => {
    const version = readFileSync(`${fontRoot}version.txt`, "utf8").trim();
    let fetched: () => void = () => {};
    const arrived = new Promise<void>((resolve) => {
      fetched = resolve;
    });
    setJapaneseTypefaceFetcherForTests(async (file) => {
      await arrived;
      return JSON.parse(readFileSync(`${fontRoot}${version}/${file}.typeface.json`, "utf8")) as FontData;
    });
    const shape = binShape({ gridfinityLabelBack: true, gridfinityLabelBackText: "ねじ" });
    const before = gridfinityLabelLetters(shape);
    const meshBefore = meshForShape(shape);
    fetched();
    await loadJapaneseTypeface();
    expect(gridfinityLabelLetters(shape)).not.toEqual(before);
    expect(meshForShape(shape)).not.toEqual(meshBefore);
  });
});

describe("letters on a Gridfinity label shelf before the fonts have loaded", () => {
  it("draws the bin without them, and gives no note", async () => {
    vi.resetModules();
    const fresh = await import("@/lib/gridfinityLabelText");
    const shape = bin({ gridfinityLabelBack: true, gridfinityLabelBackText: "W".repeat(24), width: 41.5, gridfinityLabelLeft: true });
    expect(fresh.gridfinityLabelLetters(shape)).toEqual([]);
    expect(fresh.gridfinityLabelGlyphs(shape)).toEqual([]);
    expect(fresh.gridfinityLabelTextLeftOut(shape, "back")).toBe(false);
    // The bin is drawn without its letters meanwhile, and with them once the fonts are there: nothing kept from before.
    (await import("@/lib/manifoldHandle")).rememberManifoldRuntime(runtime);
    const { meshForShape: freshMesh } = await import("@/lib/editorMeshCore");
    const lettered = binShape({ gridfinityLabelBack: true, gridfinityLabelBackText: "AB" });
    const meshVolume = () => {
      const { vertices, faces } = freshMesh(lettered);
      return volume(faces.map((face) => face.map((i) => vertices[i]) as V[]));
    };
    const without = meshVolume();
    await (await import("@/lib/textFonts")).loadTextFonts();
    expect(meshVolume() - without).toBeGreaterThan(10);
  });
});

describe("the editor's calls for letters on Gridfinity label shelves", () => {
  // No test mounts the editor, so its source is read here, spaces folded, as for the hinge's parts and the face tools' reads.
  const editor = readFileSync(fileURLToPath(new URL("../../apps/web/src/components/LayerlingEditor.tsx", import.meta.url)), "utf8").replace(/\s+/g, " ");

  it("writes the texts create_shape and update_object give through mcpGridfinityPatch", () => {
    expect(editor.match(/shape = \{ \.\.\.shape, \.\.\.mcpGridfinityPatch\(params\) \};/g)).toHaveLength(1);
    expect(editor.match(/if \(target\.kind === "gridfinity"\) Object\.assign\(patch, mcpGridfinityPatch\(params\)\);/g)).toHaveLength(1);
  });

  it("counts a bin's letters in the time budget of both of the edge tool's requests", () => {
    expect(editor.match(/\+ cadGridfinitySegmentCount\(part\.gridfinity\), 0\);/g)).toHaveLength(2);
  });

  it("sets the font create_shape and update_object give through mcpGridfinityLabelFont, past the shape defaults", () => {
    expect(editor).toContain("shape = { ...shape, gridfinityLabelFont: mcpGridfinityLabelFont(params.gridfinityLabelFont) }");
    expect(editor).toContain("patch.gridfinityLabelFont = mcpGridfinityLabelFont(params.gridfinityLabelFont)");
  });

  it("puts a font from the font window on a selected bin's letters, and on nothing while a selected object is locked or has its shape locked", () => {
    const apply = editor.slice(editor.indexOf("const applyCustomFontToSelection = useCallback("), editor.indexOf("const startSimplifyTool = useCallback("));
    expect(apply).toContain("(fontId: string) => { if (refuseBodyLockedSelection()) return;");
    expect(apply).toContain("}, [commitShapes, refuseBodyLockedSelection]);");
    expect(apply).toContain("{ ...shape, gridfinityLabelFont: fontId }");
    expect(editor).toContain("canApply={selectedShapes.some(takesCustomFont)}");
    // Only a shelf that is built takes letters, as the Font row shows.
    expect(editor).toContain("shape.kind === \"gridfinity\" && gridfinityHasLabelText(shape)");
    // layerling_add_font's useOnSelection refuses as Use does.
    expect(editor).toContain("params.useOnSelection === true && shapesRef.current.some((shape) => selectedIdsRef.current.includes(shape.id) && bodyLocked(shape))");
  });
});

