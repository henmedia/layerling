import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { meshForShape } from "@/lib/editorMeshCore";
import { MESSAGES_EN } from "@/lib/messages.en";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { analyzeTriangleSoup } from "@/lib/svgImport";
import { svgToProfile, svgToSection } from "@/lib/vase/svg-import.mjs";
import { meshToProfile } from "@/lib/vase/vase-import.mjs";
import { findObject, photoProfile } from "@/lib/vase/vase-photo.mjs";
import { PROFILE_CORNER } from "@/lib/vase/vase-geometry.mjs";
import { vaseNote } from "@/lib/vaseNotes";
import { normalizeVaseSettings } from "@/lib/vaseSettings";
import { vaseDrawingPatch, vaseDrawingSettings, vaseShapePatch } from "@/lib/vaseShape";
import { canonicalizeShape } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

const asset = toolbarShapeAssets.find((entry) => entry.kind === "vase");

function vase(settings: Record<string, unknown> = {}, frame: Partial<WorkplaneShape> = {}): WorkplaneShape {
  if (!asset) throw new Error("no vase in the catalogue");
  const shape = makeShapeFromAsset(asset, { x: 0, z: 0 });
  return canonicalizeShape({ ...shape, ...frame, vase: normalizeVaseSettings({ ...shape.vase, quality: "entwurf", ...settings }) });
}

function closed(shape: WorkplaneShape) {
  const mesh = meshForShape(shape);
  const soup = mesh.faces.flatMap((face) => face.flatMap((index) => mesh.vertices[index]));
  const analysis = analyzeTriangleSoup(soup);
  return analysis.boundaryEdges === 0 && analysis.nonManifoldEdges === 0;
}

/** A shape changed the way the drawing card changes it. */
function drawn(shape: WorkplaneShape, patch: Record<string, unknown>) {
  return canonicalizeShape({ ...shape, ...vaseDrawingPatch(shape, { ...vaseDrawingSettings(shape), ...patch }) });
}

const STAR = `<svg xmlns="http://www.w3.org/2000/svg" width="80mm" height="80mm" viewBox="0 0 80 80"><path d="M40 2 L49 30 L78 30 L55 48 L64 76 L40 59 L16 76 L25 48 L2 30 L31 30 Z"/></svg>`;
// The right half of a bulbous vase, its straight left edge the axis: 60 mm wide at most, 120 mm high.
const HALF = `<svg xmlns="http://www.w3.org/2000/svg" width="40mm" height="120mm" viewBox="0 0 40 120"><path d="M0 120 L20 120 C 34 100 32 60 22 30 L 16 0 L0 0 Z"/></svg>`;

describe("drawing a vase", () => {
  it("shows the drawing boards a round vase at the size of its frame", () => {
    const shape = vase({}, { width: 70, depth: 70, size: 70, height: 140 });
    const drawing = vaseDrawingSettings(shape);
    expect(drawing.diameter).toBeCloseTo(70, 3);
    expect(drawing.height).toBeCloseTo(140, 6);
  });

  it("measures a polygon across its corners, and gives the same frame back", () => {
    const loose = vase({ section: "vieleck", polySides: 6, polyRound: 0, effect: "keine" });
    // In its own frame: narrower across the flats.
    const shape = canonicalizeShape({ ...loose, ...vaseShapePatch(loose, loose.vase!) });
    const drawing = vaseDrawingSettings(shape);
    // The frame is 90 mm across its corners in x; its widest diameter is that, too.
    expect(drawing.diameter).toBeCloseTo(90, 1);
    const patch = vaseDrawingPatch(shape, drawing);
    expect(patch.width).toBeCloseTo(shape.width, 1);
    expect(patch.depth).toBeCloseTo(shape.depth, 1);
    expect(patch.height).toBeCloseTo(shape.height, 6);
  });

  it("keeps the real diameter when a drawn outline is narrower than its widest point", () => {
    const shape = vase({ effect: "keine" });
    const section = svgToSection(STAR);
    expect(section.ok).toBe(true);
    if (!section.ok) return;
    const star = drawn(shape, { section: "gezeichnet", drawSymmetry: "frei", drawPoints: section.drawPoints });
    expect(vaseDrawingSettings(star).diameter).toBeCloseTo(90, 0);
    // A star's points do not reach the frame's corners: its box is smaller than 90 mm one way.
    expect(Math.min(star.width, star.depth)).toBeLessThan(90);
    expect(closed(star)).toBe(true);
  });

  it("takes height and diameter from the drawing into the frame, legs moulded on below", () => {
    const shape = vase({ effect: "keine", legMode: "angeformt", legHeight: 15 });
    const taller = drawn(shape, { height: 200, diameter: 100 });
    expect(taller.height).toBeCloseTo(215, 6);
    expect(vaseDrawingSettings(taller).height).toBeCloseTo(200, 6);
    expect(Math.max(taller.width, taller.depth)).toBeGreaterThanOrEqual(99);
  });

  it("builds a closed vase from a drawn body form, cross-section and twist curve", () => {
    const shape = vase({ effect: "rillen" });
    const variants: Array<[string, Record<string, unknown>]> = [
      ["a drawn body form", { profile: "gezeichnet", profilePoints: [[0, 0.5], [0.4, 1, 2, 0], [0.8, 0.4, 1], [1, 0.6]] }],
      ["a drawn quarter, mirrored", { section: "gezeichnet", drawSymmetry: "viertel", drawPoints: null }],
      ["a windmill of five blades", { section: "gezeichnet", drawSymmetry: "windmuehle", drawRepeat: 5, drawPoints: null }],
      ["a twist curve", { twistMode: "kurve", twistPoints: [[0, 0], [0.5, 60, 2, 0], [1, -30]] }],
    ];
    for (const [name, patch] of variants) expect(closed(drawn(shape, patch)), name).toBe(true);
  }, 30_000);

  it("takes a body form from an SVG silhouette, at its own size", () => {
    const profile = svgToProfile(HALF);
    expect(profile.ok).toBe(true);
    if (!profile.ok) return;
    expect(profile.height).toBeCloseTo(120, 0);
    expect(profile.diameter).toBeGreaterThan(55);
    const shape = drawn(vase({ effect: "keine" }), { profile: "gezeichnet", profilePoints: profile.profilePoints, height: profile.height, diameter: profile.diameter });
    expect(shape.height).toBeCloseTo(120, 0);
    expect(closed(shape)).toBe(true);
    // Its notes, written in German by the import module, come out in the current language.
    for (const note of profile.notes) expect(vaseNote(note)).not.toBe(note);
  });

  it("takes a body form off a model vase's mesh", () => {
    // A cylinder of radius 30 mm and 100 mm high, z up, as triangles.
    const soup: number[] = [];
    const n = 48;
    for (let k = 0; k < n; k++) {
      const a = (2 * Math.PI * k) / n, b = (2 * Math.PI * (k + 1)) / n;
      const [ax, ay, bx, by] = [30 * Math.cos(a), 30 * Math.sin(a), 30 * Math.cos(b), 30 * Math.sin(b)];
      soup.push(ax, ay, 0, bx, by, 0, bx, by, 100, ax, ay, 0, bx, by, 100, ax, ay, 100);
      soup.push(0, 0, 0, bx, by, 0, ax, ay, 0, 0, 0, 100, ax, ay, 100, bx, by, 100);
    }
    const profile = meshToProfile(soup);
    expect(profile.ok).toBe(true);
    if (!profile.ok) return;
    expect(profile.height).toBeCloseTo(100, 0);
    expect(profile.diameter).toBeCloseTo(60, 0);
    for (const note of profile.notes) expect(vaseNote(note)).not.toBe(note);
  });

  it("says every note of the import modules in the current language", () => {
    const notes = [
      "Keine SVG-Datei erkannt.",
      "Die Datei nennt keine Größe in mm – gelesen wie im Browser (96 px je Zoll).",
      "In der Datei steht keine Form (Pfad, Vieleck, Rechteck, Kreis).",
      "Keine geschlossene Form gefunden.",
      "Eine weitere Form in der Datei bleibt unberücksichtigt – genommen wird die größte.",
      "3 weitere Formen in der Datei bleiben unberücksichtigt – genommen wird die größte.",
      "Die Form war offen und wird geschlossen.",
      "Die Mitte der Form liegt nicht in der Form (z. B. ein C oder Ring) – so lässt sich keine Vase drehen.",
      "Der Umriss hat 120 Abschnitte – auf 40 Punkte vereinfacht.",
      "Die Form hat keine Höhe oder Breite.",
      "Gelesen als rechte Hälfte; die gerade linke Kante ist die Drehachse.",
      "Gelesen als ganze Silhouette; die Drehachse liegt in der Mitte.",
      "Aus der Form lässt sich keine Körperform ablesen.",
      "Aus der Datei: 120 mm hoch, 61,5 mm breit, 7 Punkte.",
      "Das Netz hat keine Höhe – ist es leer oder flach?",
      "Aus dem Netz lässt sich keine Körperform ablesen.",
      "Aus dem Netz: 1.200 mm hoch, 60 mm breit, 5 Punkte (größter Abstand zur senkrechten Achse an 240 Höhen).",
      "Unten liegt keine ebene Fläche auf (runder Fuß – oder liegt das Teil?). Die Achse ist immer die Senkrechte (Z); ein liegendes Teil erst im Slicer aufstellen und neu speichern.",
      "Das Teil ist um die senkrechte Achse nicht rund (Henkel, Ausleger, ovale Form?) – genommen wurde der größte Abstand rundum.",
      "Kein Bild.",
      "Der Hintergrund ist unruhig (am Bildrand keine einheitliche Farbe) – der Gegenstand lässt sich nicht sicher finden. Am besten vor einer hellen, einfarbigen Wand fotografieren; sonst „Kalibrieren“.",
      "Im Foto hebt sich nichts deutlich vom Hintergrund ab.",
      "Der gefundene Bereich füllt das ganze Foto – der Gegenstand hebt sich nicht vom Hintergrund ab.",
      "Der Gegenstand reicht bis an den Bildrand – vielleicht ist er angeschnitten.",
      "Rand und Boden erscheinen als Ellipse (leicht von oben fotografiert) – gemessen wird zwischen ihren Mitten.",
      "Kein Gegenstand gefunden.",
      "Bitte die Höhe des Gegenstands in mm angeben.",
      "Der Gegenstand ist im Foto zu klein für einen Umriss.",
      "Aus dem Umriss lässt sich keine Körperform ablesen.",
      "Breite und Höhe passen nicht zum Seitenverhältnis im Foto (quer 12 % gestreckt) – schräg fotografiert? Der Umriss folgt den eingegebenen Maßen.",
    ];
    const english = new Set(notes.map(vaseNote));
    expect(english.size).toBe(notes.length);
    for (const note of notes) {
      const said = vaseNote(note);
      expect(said, note).not.toBe(note);
      expect(said, note).not.toMatch(/\{\w+\}/);
    }
    expect(vaseNote("Aus dem Netz: 1.200 mm hoch, 60 mm breit, 5 Punkte (größter Abstand zur senkrechten Achse an 240 Höhen).")).toContain("1,200");
    expect(vaseNote("Aus der Datei: 120 mm hoch, 61,5 mm breit, 7 Punkte.")).toContain("61.5");
  });

  it("has a text for every key the drawing boards use", () => {
    const source = readFileSync("apps/web/src/lib/vase/vase-editors.mjs", "utf8");
    const keys = [...source.matchAll(/tr\('([\w.]+)'/g)].map((match) => match[1]);
    expect(keys.length).toBeGreaterThan(60);
    for (const key of keys) expect(MESSAGES_EN, key).toHaveProperty([key]);
    // No German left in the boards' own strings.
    const code = source.split("\n").filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line)).join("\n");
    expect(code).not.toMatch(/'[^'\n]*[äöüÄÖÜß][^'\n]*'/);
  });
});

/** A photo of a bottle-like vase: a round belly and a narrow neck on a light wall, as RGBA pixels. */
function vasePhoto() {
  const width = 200;
  const height = 300;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const belly = 30 + 30 * Math.sin((Math.PI * (y - 100)) / 180);
    for (let x = 0; x < width; x += 1) {
      const body = y >= 100 && y < 280 && Math.abs(x + 0.5 - 100) <= belly;
      const neck = y >= 40 && y < 100 && x >= 75 && x < 125;
      data.set(body || neck ? [40, 70, 120, 255] : [230, 225, 215, 255], (y * width + x) * 4);
    }
  }
  return { width, height, data };
}

describe("tracing the photo of a vase (Trace)", () => {
  it("finds the object at a threshold of its own, or at one that is set", () => {
    const found = findObject(vasePhoto());
    expect(found.ok).toBe(true);
    expect(found.threshold).toBeCloseTo(found.autoThreshold, 6);
    const set = findObject(vasePhoto(), { threshold: 0.3 });
    expect(set.ok).toBe(true);
    expect(set.threshold).toBeCloseTo(0.3, 2);
    // A threshold above the object's colour finds nothing.
    expect(findObject(vasePhoto(), { threshold: 0.95 }).ok).toBe(false);
  });

  it("takes as many points as asked for, from 3 up to 40", () => {
    const found = findObject(vasePhoto());
    const size = { height: 120, diameter: 60, tolerance: 0.001 };
    for (const maxPoints of [3, 5, 12]) {
      const result = photoProfile(found, { ...size, maxPoints });
      expect(result.ok).toBe(true);
      expect(result.profilePoints).toHaveLength(maxPoints);
    }
    expect(photoProfile(found, { ...size, maxPoints: 99 }).profilePoints.length).toBeLessThanOrEqual(40);
  });

  it("makes the shoulder's kinks corners, or none at the largest corner angle", () => {
    const found = findObject(vasePhoto());
    const size = { height: 120, diameter: 60, tolerance: 0.001, maxPoints: 12 };
    const corners = (cornerAngle: number) => photoProfile(found, { ...size, cornerAngle }).profilePoints.filter((point: unknown[]) => point[2] === PROFILE_CORNER).length;
    expect(corners(20)).toBeGreaterThanOrEqual(2);
    expect(corners(180)).toBe(0);
  });
});

