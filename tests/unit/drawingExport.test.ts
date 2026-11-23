import * as THREE from "three";
import ManifoldModule from "manifold-3d";
import { describe, expect, it } from "vitest";
import { drawingBoreRows, drawingToPdf, drawingToSvg, generateDrawing } from "@/lib/drawingExport";
import { drawingLabelsInLanguage } from "@/lib/drawingLabels";
import { getLanguage, setLanguage } from "@/lib/i18n";
import { projectDrawingMeshes, type DrawingMesh } from "@/lib/drawingProjection";

function meshFromGeometry(geometry: THREE.BufferGeometry): DrawingMesh {
  const source = geometry.index ? geometry.toNonIndexed() : geometry;
  const positions = source.getAttribute("position");
  const vertices: [number, number, number][] = [];
  const faces: [number, number, number][] = [];
  for (let i = 0; i < positions.count; i++) vertices.push([positions.getX(i), positions.getY(i), positions.getZ(i)]);
  for (let i = 0; i < positions.count; i += 3) faces.push([i, i + 1, i + 2]);
  source.dispose();
  if (source !== geometry) geometry.dispose();
  return { vertices, faces };
}

function plateWithBores() {
  const outline = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(50, 0), new THREE.Vector2(50, 30), new THREE.Vector2(0, 30)]);
  for (const [x, y, r] of [[12, 8, 3], [35, 20, 4]]) {
    const hole = new THREE.Path();
    hole.absarc(x, y, r, 0, Math.PI * 2, true);
    outline.holes.push(hole);
  }
  return meshFromGeometry(new THREE.ExtrudeGeometry(outline, { depth: 10, bevelEnabled: false, curveSegments: 32 }));
}

describe("automatic drawing export", () => {
  it("frames an ISO sheet with zones and a lower-right engineering title block", () => {
    const drawing = generateDrawing([meshFromGeometry(new THREE.BoxGeometry(40, 20, 10))], "Test part");
    const labels = drawing.primitives.filter((p) => p.kind === "text");
    expect(labels.map((p) => p.text)).toEqual(expect.arrayContaining([
      "1", "2", "3", "4", "LAYERLING · ISO A4 · FIRST ANGLE", "Test part",
      "DRAWING / REVISION", "DRAWN BY / DATE", "SCALE", "DIMENSIONS IN", "SHEET", "1:1", "mm", "1 / 1",
    ]));
    expect(labels.some((p) => /^— \/ \d{4}-\d{2}-\d{2}$/.test(p.text))).toBe(true);
    const title = labels.find((p) => p.text === "Test part")!;
    expect(title.at[0]).toBeGreaterThan(drawing.width / 3);
    expect(title.at[1]).toBeGreaterThan(drawing.height * 0.8);
    expect(drawing.primitives).toContainEqual({ kind: "line", a: [20, 10], b: [287, 10], width: 0.45, dash: undefined });
    expect(labels.some((p) => p.text.includes("No axis-aligned"))).toBe(false);
  });

  it("places first-angle view captions below aligned views in both vector formats", () => {
    const drawing = generateDrawing([meshFromGeometry(new THREE.BoxGeometry(40, 20, 10))], "Test part");
    const labels = drawing.primitives.filter((p) => p.kind === "text");
    const front = labels.find((p) => p.text === "Test part — Front · 1:1")!;
    const top = labels.find((p) => p.text === "Test part — Top · 1:1")!;
    const side = labels.find((p) => p.text === "Test part — Right side · 1:1")!;
    expect(side.at[0]).toBeLessThan(front.at[0]);
    expect(side.at[1]).toBeCloseTo(front.at[1]);
    expect(top.at[0]).toBe(front.at[0]);
    expect(top.at[1]).toBeGreaterThan(front.at[1]);
    expect(front.anchor).toBe("middle");
    expect(drawingToSvg(drawing)).toContain('text-anchor="middle"');
    expect(new TextDecoder().decode(drawingToPdf(drawing))).toContain("FIRST ANGLE");
  });

  it("keeps annotations inside the sheet for small and large designs and long titles", () => {
    for (const size of [1, 40, 600]) {
      const drawing = generateDrawing([meshFromGeometry(new THREE.BoxGeometry(size, size / 2, size / 4))], "W".repeat(150));
      for (const primitive of drawing.primitives) {
        const points = primitive.kind === "line" ? [primitive.a, primitive.b] : [primitive.at];
        for (const [x, y] of points) {
          expect(x).toBeGreaterThanOrEqual(20); expect(x).toBeLessThanOrEqual(drawing.width - 10);
          expect(y).toBeGreaterThan(0); expect(y).toBeLessThanOrEqual(drawing.height - 10);
        }
      }
      expect(drawing.primitives.filter((p) => p.kind === "text" && p.anchor === "middle" && p.text.includes("—")).every((p) => p.size <= 3)).toBe(true);
    }
  });

  it("detects a real boolean-cut bore, including the triangulation produced by Manifold", async () => {
    const runtime = await ManifoldModule(); runtime.setup();
    const blank = runtime.Manifold.cube([50, 30, 10], true);
    const cylinder = runtime.Manifold.cylinder(20, 3, 3, 32, true);
    const cutter = cylinder.translate([5, 3, 0]);
    const part = blank.subtract(cutter);
    try {
      expect(part.status()).toBe("NoError");
      const mesh = part.getMesh();
      const vertices: [number, number, number][] = [];
      const faces: [number, number, number][] = [];
      for (let i = 0; i < mesh.numVert; i++) {
        const offset = i * mesh.numProp;
        vertices.push([mesh.vertProperties[offset], mesh.vertProperties[offset + 1], mesh.vertProperties[offset + 2]]);
      }
      for (let i = 0; i < mesh.triVerts.length; i += 3) faces.push([mesh.triVerts[i], mesh.triVerts[i + 1], mesh.triVerts[i + 2]]);
      const front = generateDrawing([{ vertices, faces }], "Boolean fixture").views[0];
      expect(front.holes).toHaveLength(1);
      expect(front.holes[0].diameter).toBeCloseTo(6, 4);
      expect(front.holes[0].center).toEqual([expect.closeTo(5, 4), expect.closeTo(-3, 4)]);
    } finally { [blank, cylinder, cutter, part].forEach((solid) => solid.delete()); }
  });

  it("uses model dimensions for all three orthographic views, with hidden edges", () => {
    const mesh = meshFromGeometry(new THREE.BoxGeometry(40, 20, 10));
    const drawing = generateDrawing([mesh], "Test part");
    expect(drawing.views.map((v) => [v.projection.width, v.projection.height])).toEqual([
      [40, 20], [40, expect.closeTo(10, 8)], [expect.closeTo(10, 8), 20],
    ]);
    const bore = generateDrawing([plateWithBores()], "Bored plate");
    expect(bore.views[1].projection.lines.some((line) => line.hidden)).toBe(true);
    expect(drawingToSvg(drawing)).toContain('width="297mm" height="210mm" viewBox="0 0 297 210"');
    const labels = drawing.primitives.filter((p) => p.kind === "text").map((p) => p.text);
    expect(labels).toContain("40.00"); expect(labels).toContain("20.00"); expect(labels).toContain("10.00");
  });

  it("recognizes off-center bores and gives positions from the view's lower-left corner", () => {
    const drawing = generateDrawing([plateWithBores()], "Fixture");
    const front = drawing.views[0];
    expect(front.holes).toHaveLength(2);
    const holes = front.holes.map((h) => ({
      diameter: h.diameter, x: h.center[0] + front.projection.width / 2, y: front.projection.height / 2 - h.center[1],
    })).sort((a, b) => a.x - b.x);
    expect(holes).toEqual([
      { diameter: expect.closeTo(6, 4), x: expect.closeTo(12, 4), y: expect.closeTo(8, 4) },
      { diameter: expect.closeTo(8, 4), x: expect.closeTo(35, 4), y: expect.closeTo(20, 4) },
    ]);
    expect(drawingToSvg(drawing)).toContain(">F1</text>");
    expect(drawingToSvg(drawing)).toContain(">12.00</text>");
  });

  it("finds bores along top and side axes, and rejects external bosses and oval holes", () => {
    const top = generateDrawing([meshFromGeometry(new THREE.ExtrudeGeometry((() => {
      const outline = new THREE.Shape([new THREE.Vector2(-10, -10), new THREE.Vector2(10, -10), new THREE.Vector2(10, 10), new THREE.Vector2(-10, 10)]);
      const hole = new THREE.Path(); hole.absarc(0, 0, 3, 0, Math.PI * 2, true); outline.holes.push(hole); return outline;
    })(), { depth: 5, bevelEnabled: false, curveSegments: 16 }).rotateX(Math.PI / 2))], "Top bore");
    expect(top.views[1].holes).toHaveLength(1);
    const sideMesh = plateWithBores();
    sideMesh.vertices.forEach((p) => { const x = p[0]; p[0] = p[2]; p[2] = -x; });
    expect(generateDrawing([sideMesh], "Side bores").views[2].holes).toHaveLength(2);
    expect(generateDrawing([meshFromGeometry(new THREE.CylinderGeometry(5, 5, 10, 32))], "Boss").views.every((v) => !v.holes.length)).toBe(true);
    const oval = plateWithBores(); oval.vertices.forEach((p) => { p[0] *= 2; });
    expect(generateDrawing([oval], "Oval holes").views[0].holes).toHaveLength(0);
  });

  it("keeps dimensions and hole fits accurate far from the origin", () => {
    const mesh = plateWithBores();
    mesh.vertices.forEach((p) => { p[0] += 100000; p[1] -= 200000; p[2] += 300000; });
    const view = generateDrawing([mesh], "Translated").views[0];
    expect(view.projection.width).toBe(50); expect(view.projection.height).toBe(30);
    expect(view.holes).toHaveLength(2);
    expect(view.holes[0].diameter).toBeCloseTo(8, 4);
  });

  it("grows the page for large designs without rescaling geometry", () => {
    const drawing = generateDrawing([meshFromGeometry(new THREE.BoxGeometry(600, 100, 50))], "Large part");
    expect(drawing.width).toBeGreaterThan(600);
    expect(drawing.views[0].projection.width).toBe(600);
    const svg = drawingToSvg(drawing);
    expect(svg).not.toContain("scale("); expect(svg).toContain(">600.00</text>");
  });

  it("emits a vector PDF with exact physical page size and byte-correct xref", () => {
    const drawing = generateDrawing([plateWithBores()], "Café (fixture) \\ 1");
    const bytes = drawingToPdf(drawing);
    const pdf = new TextDecoder().decode(bytes);
    expect(pdf).toMatch(/^%PDF-1.4/);
    expect(pdf).toContain("/MediaBox [0 0 841.88976 595.27559]");
    expect(pdf).toContain("/PrintScaling /None");
    expect(pdf).toContain("Caf\\351 \\(fixture\\) \\\\ 1");
    const xref = Number(pdf.match(/startxref\n(\d+)/)![1]);
    expect(pdf.slice(xref, xref + 4)).toBe("xref");
    const entries = [...pdf.matchAll(/^(\d{10}) 00000 n /gm)];
    entries.forEach((entry, i) => expect(pdf.slice(Number(entry[1]))).toMatch(new RegExp(`^${i + 1} 0 obj`)));
    const stream = pdf.match(/\/Length (\d+) >>\nstream\n([\s\S]*?)endstream/)!;
    expect(Number(stream[1])).toBe(new TextEncoder().encode(stream[2]).length);
    expect(pdf).not.toContain("/Subtype /Image");
  });

  it("escapes SVG titles and refuses malformed or excessively complex geometry", () => {
    const drawing = generateDrawing([plateWithBores()], '<script>"&');
    expect(drawingToSvg(drawing)).toContain("&lt;script&gt;&quot;&amp;");
    expect(() => generateDrawing([], "Empty")).toThrow("no solid geometry");
    expect(() => projectDrawingMeshes([{ vertices: [[NaN, 0, 0]], faces: [[0, 0, 0]] }], [0, 0, 0])).toThrow("invalid coordinates");
    expect(() => projectDrawingMeshes([{ vertices: [[0, 0, 0]], faces: Array.from({ length: 400001 }, () => [0, 0, 0]) }], [0, 0, 0])).toThrow("400,000 triangles; these views have 400,001");
  });
  it("lists the bores as rows with their sheet id and the position from the view's lower-left corner", () => {
    const rows = drawingBoreRows(generateDrawing([plateWithBores()], "Fixture"));
    const front = rows.filter((row) => row.id.startsWith("F")).sort((a, b) => a.x - b.x);
    expect(front.map((row) => row.id)).toHaveLength(2);
    expect(front[0]).toMatchObject({ view: "Front", diameter: expect.closeTo(6, 4), x: expect.closeTo(12, 4), y: expect.closeTo(8, 4) });
    expect(front[1]).toMatchObject({ diameter: expect.closeTo(8, 4), x: expect.closeTo(35, 4), y: expect.closeTo(20, 4) });
    expect(generateDrawing([plateWithBores()], "Fixture").paper).toBe("ISO A4");
    expect(generateDrawing([meshFromGeometry(new THREE.BoxGeometry(240, 50, 20))], "Long").paper).toBe("ISO A3");
  });

  it("keeps Czech labels in SVG and uses readable base letters for unsupported PDF accents", async () => {
    const language = getLanguage();
    await setLanguage("cs");
    try {
      const drawing = generateDrawing([plateWithBores()], "Český díl", drawingLabelsInLanguage());
      expect(drawingToSvg(drawing)).toContain("MĚŘÍTKO");
      expect(drawingToSvg(drawing)).toContain("Český díl");
      const pdf = new TextDecoder().decode(drawingToPdf(drawing));
      expect(pdf).toContain("MER\\315TKO");
      expect(pdf).toContain("Cesk\\375 d\\355l");
      expect(pdf).not.toContain("?");
    } finally { await setLanguage(language); }
  });
  it("writes the sheet in the interface language, also into the PDF", () => {
    setLanguage("de");
    try {
      const drawing = generateDrawing([plateWithBores()], "Platte", drawingLabelsInLanguage());
      const texts = drawing.primitives.filter((p) => p.kind === "text").map((p) => p.text);
      expect(texts).toEqual(expect.arrayContaining(["HINWEISE", "MAßSTAB", "BLATT", "Vorderansicht", "Durchmesser", "LAYERLING · ISO A4 · ERSTWINKELPROJEKTION"]));
      expect(drawing.views.map((view) => view.id)).toEqual(["F", "T", "R"]);
      expect(drawing.views[0].name).toBe("Vorderansicht");
      expect(drawingToSvg(drawing)).toContain("MAßSTAB");
      const pdf = new TextDecoder().decode(drawingToPdf(drawing));
      expect(pdf).toContain("MA\\337STAB");
      expect(pdf).toContain("\\304NDERUNG");
    } finally {
      setLanguage("en");
    }
  });

  it("puts the bore table beside the top view, so a small part with bores stays on one A4 sheet", () => {
    // A 50 x 55 plate 15 thick lying flat, its two bores seen from the top: three views and the table,
    // which under the views made it A3 (the size of a 5015 blower's bay).
    const outline = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(50, 0), new THREE.Vector2(50, 55), new THREE.Vector2(0, 55)]);
    for (const [x, y, r] of [[4, 50, 2], [46, 6, 2]]) {
      const hole = new THREE.Path();
      hole.absarc(x, y, r, 0, Math.PI * 2, true);
      outline.holes.push(hole);
    }
    const geometry = new THREE.ExtrudeGeometry(outline, { depth: 15, bevelEnabled: false, curveSegments: 32 }).rotateX(-Math.PI / 2);
    const drawing = generateDrawing([meshFromGeometry(geometry)], "Fan bay");
    expect(drawing.paper).toBe("ISO A4");
    expect(drawing.pages).toHaveLength(1);
    const texts = drawing.primitives.filter((p) => p.kind === "text");
    const header = texts.find((p) => p.text.startsWith("CIRCULAR BORES"))!;
    const top = texts.find((p) => p.text === "Fan bay — Top · 1:1")!;
    const side = texts.find((p) => p.text === "Fan bay — Right side · 1:1")!;
    // Left of the top view, under the side view, above the title block.
    expect(header.at[0]).toBeLessThan(top.at[0] - 40);
    expect(header.at[1]).toBeGreaterThan(side.at[1]);
    expect(header.at[1]).toBeLessThan(drawing.height - 10 - 36);
  });

  it("splits a drawing bigger than the printer's paper over pages of it, still 1:1", () => {
    const drawing = generateDrawing([meshFromGeometry(new THREE.BoxGeometry(180, 100, 80))], "Bracket");
    // The one sheet (the SVG) is larger than A3; the PDF goes on three A4 pages, one view a page.
    expect(drawing.paper).toBe("ISO A2");
    expect(drawing.pages.map((page) => [page.width, page.height, page.paper])).toEqual([[297, 210, "ISO A4"], [297, 210, "ISO A4"], [297, 210, "ISO A4"]]);
    drawing.pages.forEach((page, index) => {
      const texts = page.primitives.filter((p) => p.kind === "text").map((p) => p.text);
      expect(texts).toContain(`${index + 1} / 3`);
      expect(texts.filter((text) => text.endsWith("· 1:1"))).toHaveLength(1);
    });
    expect(drawing.pages[0].primitives.some((p) => p.kind === "text" && p.text === "180.00")).toBe(true);
    const pdf = new TextDecoder().decode(drawingToPdf(drawing));
    expect(pdf).toContain("/Count 3");
    expect(pdf.match(/\/MediaBox \[0 0 841.88976 595.27559\]/g)).toHaveLength(3);
    const xref = Number(pdf.match(/startxref\n(\d+)/)![1]);
    expect(pdf.slice(xref, xref + 4)).toBe("xref");
    [...pdf.matchAll(/^(\d{10}) 00000 n /gm)].forEach((entry, i) => expect(pdf.slice(Number(entry[1]))).toMatch(new RegExp(`^${i + 1} 0 obj`)));
    expect(drawingToSvg(drawing)).toContain('width="594mm" height="420mm"');
    // An A3 printer: front and side on one page, the top on the next.
    const a3 = generateDrawing([meshFromGeometry(new THREE.BoxGeometry(180, 100, 80))], "Bracket", undefined, {}, new Date(), "A3");
    // Every page is the printer's paper: a browser would fit a smaller page to it and print it larger.
    expect(a3.pages.map((page) => [page.width, page.height])).toEqual([[420, 297], [420, 297]]);
    // A part that fits A4 is still one A3 page for an A3 printer; the SVG keeps the smallest sheet.
    const small = generateDrawing([plateWithBores()], "Fixture", undefined, {}, new Date(), "A3");
    expect([small.paper, small.pages.map((page) => page.paper)]).toEqual(["ISO A4", ["ISO A3"]]);
    expect(a3.pages[0].primitives.filter((p) => p.kind === "text" && p.text.endsWith("· 1:1"))).toHaveLength(2);
  });

  it("keeps the one bigger sheet when a view fits no page of the printer's paper", () => {
    const drawing = generateDrawing([meshFromGeometry(new THREE.BoxGeometry(240, 50, 20))], "Long");
    expect(drawing.paper).toBe("ISO A3");
    expect(drawing.pages).toHaveLength(1);
    expect(drawing.pages[0].width).toBe(420);
  });
});
