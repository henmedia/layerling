import { describe, expect, it } from "vitest";
import {
  BOLT_CIRCLE_HOLES,
  SKETCH_PRIMITIVE_SIZE,
  SKETCH_PRIMITIVES,
  isSketchPrimitive,
  normalizePolygonSides,
  normalizeStarInnerPercent,
  sketchPrimitiveGeometry,
  sketchPrimitiveStartSize,
} from "@/lib/sketchPrimitives";
import type { SketchPoint, SketchSegment } from "@/types/layerling";

/*
 * Eine fertige Form taugt nur etwas, wenn ihr Umriss geschlossen ist - sonst
 * laesst sie sich nicht extrudieren, und das merkt man erst zwei Schritte
 * spaeter. Deshalb pruefen die Tests hier vor allem das: jeder Punkt genau
 * einmal Anfang und einmal Ende, und die Kurven liegen da, wo sie sollen.
 */

let zaehler = 0;
const makeId = (prefix: string) => `${prefix}-${(zaehler += 1)}`;

function punkte(points: SketchPoint[]) {
  return new Map(points.map((point) => [point.id, point]));
}

/** Laeuft der Zug einmal herum und kommt wieder an? */
function istGeschlossen(points: SketchPoint[], segments: SketchSegment[]) {
  if (segments.length !== points.length) return false;
  const anfaenge = segments.map((segment) => segment.startId).sort();
  const enden = segments.map((segment) => segment.endId).sort();
  const ids = points.map((point) => point.id).sort();
  return JSON.stringify(anfaenge) === JSON.stringify(ids) && JSON.stringify(enden) === JSON.stringify(ids);
}

/** Ein Punkt auf dem Bezierbogen zwischen zwei Stuetzpunkten. */
function aufBogen(from: SketchPoint, to: SketchPoint, amount: number) {
  const first = from.handleOut!;
  const second = to.handleIn!;
  const inverse = 1 - amount;
  return {
    x: inverse ** 3 * from.x + 3 * inverse ** 2 * amount * first.x + 3 * inverse * amount ** 2 * second.x + amount ** 3 * to.x,
    z: inverse ** 3 * from.z + 3 * inverse ** 2 * amount * first.z + 3 * inverse * amount ** 2 * second.z + amount ** 3 * to.z,
  };
}

describe("fertige Skizzenformen", () => {
  it("schliesst jede Form zu einem Ring", () => {
    for (const primitive of SKETCH_PRIMITIVES) {
      const { points, segments } = sketchPrimitiveGeometry(primitive, { x: 0, z: 0 }, makeId);
      expect(istGeschlossen(points, segments), `${primitive} ist nicht geschlossen`).toBe(true);
    }
  });

  it("legt jede Form um den angegebenen Mittelpunkt", () => {
    for (const primitive of SKETCH_PRIMITIVES) {
      const versetzt = sketchPrimitiveGeometry(primitive, { x: 40, z: -15 }, makeId);
      const mitteX = (Math.min(...versetzt.points.map((p) => p.x)) + Math.max(...versetzt.points.map((p) => p.x))) / 2;
      expect(mitteX, primitive).toBeCloseTo(40, 6);
    }
  });

  it("zeichnet den Kreis rund - auch zwischen den vier Stuetzpunkten", () => {
    const { points, segments } = sketchPrimitiveGeometry("circle", { x: 0, z: 0 }, makeId);
    expect(points).toHaveLength(4);
    expect(segments.every((segment) => segment.kind === "bezier")).toBe(true);

    const byId = punkte(points);
    for (const segment of segments) {
      for (const amount of [0.15, 0.35, 0.5, 0.65, 0.85]) {
        const auf = aufBogen(byId.get(segment.startId)!, byId.get(segment.endId)!, amount);
        // Vier Bezierboegen treffen den Kreis auf etwa ein Zehntausendstel
        // seines Halbmessers genau. Mehr ist damit nicht zu holen, weniger
        // waere sichtbar.
        expect(Math.hypot(auf.x, auf.z)).toBeCloseTo(10, 2);
      }
    }
  });

  it("macht das Oval halb so hoch wie breit", () => {
    const { points } = sketchPrimitiveGeometry("ellipse", { x: 0, z: 0 }, makeId);
    const breite = Math.max(...points.map((p) => p.x)) - Math.min(...points.map((p) => p.x));
    const hoehe = Math.max(...points.map((p) => p.z)) - Math.min(...points.map((p) => p.z));
    expect(breite).toBeCloseTo(20, 6);
    expect(hoehe).toBeCloseTo(10, 6);
  });

  it("gibt dem Halbkreis eine gerade Sehne und einen Bogen darueber", () => {
    const { points, segments } = sketchPrimitiveGeometry("halfCircle", { x: 0, z: 0 }, makeId);
    expect(points).toHaveLength(3);
    expect(segments.filter((segment) => segment.kind === "bezier")).toHaveLength(2);
    expect(segments.filter((segment) => segment.kind === "line")).toHaveLength(1);

    const gerade = segments.find((segment) => segment.kind === "line")!;
    const byId = punkte(points);
    const von = byId.get(gerade.startId)!;
    const nach = byId.get(gerade.endId)!;
    expect(von.z).toBeCloseTo(nach.z, 6);
    expect(Math.abs(nach.x - von.x)).toBeCloseTo(20, 6);

    // Der Scheitel liegt einen vollen Halbmesser ueber der Sehne.
    const scheitel = points.find((point) => point.id !== von.id && point.id !== nach.id)!;
    expect(von.z - scheitel.z).toBeCloseTo(10, 6);

    // Und der Bogen dazwischen bleibt auf dem Kreis um die Mitte der Sehne.
    for (const segment of segments.filter((s) => s.kind === "bezier")) {
      for (const amount of [0.25, 0.5, 0.75]) {
        const auf = aufBogen(byId.get(segment.startId)!, byId.get(segment.endId)!, amount);
        expect(Math.hypot(auf.x, auf.z - von.z)).toBeCloseTo(10, 2);
      }
    }
  });

  it("gibt dem Tortenstueck zwei gleich lange Halbmesser und einen rechten Winkel", () => {
    const { points, segments } = sketchPrimitiveGeometry("pieSlice", { x: 0, z: 0 }, makeId);
    expect(points).toHaveLength(3);
    expect(segments.filter((segment) => segment.kind === "line")).toHaveLength(2);
    expect(segments.filter((segment) => segment.kind === "bezier")).toHaveLength(1);

    const byId = punkte(points);
    const geraden = segments.filter((segment) => segment.kind === "line");
    // Die beiden Geraden treffen sich in der Spitze; von dort sind sie gleich
    // lang, denn beide sind Halbmesser desselben Kreises.
    const spitzeId = geraden[0]!.endId === geraden[1]!.startId ? geraden[0]!.endId : geraden[0]!.startId;
    const spitze = byId.get(spitzeId)!;
    const enden = points.filter((point) => point.id !== spitzeId);
    for (const ende of enden) {
      expect(Math.hypot(ende.x - spitze.x, ende.z - spitze.z)).toBeCloseTo(10, 6);
    }
    // Rechter Winkel an der Spitze: Das Skalarprodukt der beiden Schenkel ist 0.
    const [a, b] = enden as [SketchPoint, SketchPoint];
    const skalar = (a.x - spitze.x) * (b.x - spitze.x) + (a.z - spitze.z) * (b.z - spitze.z);
    expect(skalar).toBeCloseTo(0, 6);

    // Und der Bogen dazwischen bleibt auf dem Kreis um die Spitze.
    const bogen = segments.find((segment) => segment.kind === "bezier")!;
    for (const amount of [0.25, 0.5, 0.75]) {
      const auf = aufBogen(byId.get(bogen.startId)!, byId.get(bogen.endId)!, amount);
      expect(Math.hypot(auf.x - spitze.x, auf.z - spitze.z)).toBeCloseTo(10, 2);
    }
  });

  it("legt die Bohrungen des Lochkreises in die Scheibe, ohne dass sie sich beruehren", () => {
    const { points, segments } = sketchPrimitiveGeometry("boltCircle", { x: 0, z: 0 }, makeId);
    // Sieben geschlossene Zuege: die Scheibe und sechs Bohrungen.
    expect(points).toHaveLength((1 + BOLT_CIRCLE_HOLES) * 4);
    expect(segments).toHaveLength(points.length);
    expect(segments.every((segment) => segment.kind === "bezier")).toBe(true);

    // Die Zuege stehen in der Reihenfolge, in der sie gebaut wurden: erst die
    // Scheibe, dann je vier Punkte pro Bohrung.
    const mitten: Array<{ x: number; z: number; r: number }> = [];
    for (let index = 0; index < points.length; index += 4) {
      const ring = points.slice(index, index + 4);
      const x = (Math.min(...ring.map((p) => p.x)) + Math.max(...ring.map((p) => p.x))) / 2;
      const z = (Math.min(...ring.map((p) => p.z)) + Math.max(...ring.map((p) => p.z))) / 2;
      mitten.push({ x, z, r: (Math.max(...ring.map((p) => p.x)) - Math.min(...ring.map((p) => p.x))) / 2 });
    }
    const scheibe = mitten[0]!;
    const loecher = mitten.slice(1);
    expect(scheibe.r).toBeCloseTo(10, 6);
    expect(loecher).toHaveLength(BOLT_CIRCLE_HOLES);

    for (const loch of loecher) {
      const abstand = Math.hypot(loch.x - scheibe.x, loch.z - scheibe.z);
      // Ganz drin, mit Rand: aussen darf die Bohrung den Scheibenrand nicht
      // erreichen, sonst entstuende beim Extrudieren ein offener Schlitz.
      expect(abstand + loch.r).toBeLessThan(scheibe.r - 0.5);
      expect(abstand - loch.r).toBeGreaterThan(0.5);
    }

    // Und untereinander beruehren sie sich auch nicht.
    for (let i = 0; i < loecher.length; i += 1) {
      for (let k = i + 1; k < loecher.length; k += 1) {
        const abstand = Math.hypot(loecher[i]!.x - loecher[k]!.x, loecher[i]!.z - loecher[k]!.z);
        expect(abstand).toBeGreaterThan(loecher[i]!.r + loecher[k]!.r + 0.5);
      }
    }
  });

  it("baut die eckigen Formen aus Geraden", () => {
    for (const [primitive, ecken] of [["rectangle", 4], ["triangle", 3], ["hexagon", 6]] as const) {
      const { points, segments } = sketchPrimitiveGeometry(primitive, { x: 0, z: 0 }, makeId);
      expect(points, primitive).toHaveLength(ecken);
      expect(segments.every((segment) => segment.kind === "line"), primitive).toBe(true);
      expect(points.every((point) => point.mode === "corner"), primitive).toBe(true);
    }
  });

  it("baut das Vieleck mit der gewuenschten Seitenzahl (#280)", () => {
    const standard = sketchPrimitiveGeometry("polygon", { x: 0, z: 0 }, makeId);
    expect(standard.points).toHaveLength(5);
    for (const sides of [3, 7, 12, 64]) {
      const { points, segments } = sketchPrimitiveGeometry("polygon", { x: 5, z: -3 }, makeId, 30, { sides });
      expect(points, `${sides} Seiten`).toHaveLength(sides);
      expect(segments.every((segment) => segment.kind === "line")).toBe(true);
      expect(points.every((point) => point.mode === "corner")).toBe(true);
      expect(istGeschlossen(points, segments), `${sides} Seiten`).toBe(true);
      // Alle Ecken liegen auf dem Kreis mit dem halben Durchmesser, eine zeigt nach oben.
      for (const point of points) expect(Math.hypot(point.x - 5, point.z + 3)).toBeCloseTo(15, 6);
      expect(Math.min(...points.map((point) => point.z))).toBeCloseTo(-3 - 15, 6);
    }
  });

  it("haelt Seitenzahl und Innengroesse in den Grenzen", () => {
    expect(normalizePolygonSides(2)).toBe(3);
    expect(normalizePolygonSides(500)).toBe(64);
    expect(normalizePolygonSides("6,0")).toBe(5);
    expect(normalizePolygonSides("6.4")).toBe(6);
    expect(normalizePolygonSides(undefined)).toBe(5);
    expect(normalizeStarInnerPercent(1)).toBe(10);
    expect(normalizeStarInnerPercent(150)).toBe(90);
    expect(normalizeStarInnerPercent(55)).toBe(55);
    expect(normalizeStarInnerPercent("abc")).toBe(40);
    expect(sketchPrimitiveGeometry("polygon", { x: 0, z: 0 }, makeId, 20, { sides: 1 }).points).toHaveLength(3);
  });

  it("baut den Stern mit abwechselnd Spitze und Tal (#280)", () => {
    const { points, segments } = sketchPrimitiveGeometry("star", { x: 0, z: 0 }, makeId, 40, { sides: 5, innerPercent: 40 });
    expect(points).toHaveLength(10);
    expect(istGeschlossen(points, segments)).toBe(true);
    expect(segments.every((segment) => segment.kind === "line")).toBe(true);
    points.forEach((point, index) => {
      expect(Math.hypot(point.x, point.z), `Ecke ${index}`).toBeCloseTo(index % 2 === 0 ? 20 : 8, 6);
    });
    // Die erste Spitze zeigt nach oben.
    expect(points[0]!.x).toBeCloseTo(0, 6);
    expect(points[0]!.z).toBeCloseTo(-20, 6);
  });

  it("macht aus mehr Zacken und tieferen Taelern einen spitzeren Stern", () => {
    const flach = sketchPrimitiveGeometry("star", { x: 0, z: 0 }, makeId, 20, { sides: 8, innerPercent: 85 }).points;
    expect(flach).toHaveLength(16);
    expect(Math.hypot(flach[1]!.x, flach[1]!.z)).toBeCloseTo(8.5, 6);
    const tief = sketchPrimitiveGeometry("star", { x: 0, z: 0 }, makeId, 20, { sides: 8, innerPercent: 10 }).points;
    expect(Math.hypot(tief[1]!.x, tief[1]!.z)).toBeCloseTo(1, 6);
  });

  it("nimmt nur die Formen an, die es gibt", () => {
    expect(isSketchPrimitive("circle")).toBe(true);
    expect(isSketchPrimitive("halfCircle")).toBe(true);
    expect(isSketchPrimitive("kreisel")).toBe(false);
    expect(isSketchPrimitive(null)).toBe(false);
  });

  it("skaliert mit der uebergebenen Groesse", () => {
    const { points } = sketchPrimitiveGeometry("rectangle", { x: 0, z: 0 }, makeId, 50);
    expect(Math.max(...points.map((p) => p.x)) - Math.min(...points.map((p) => p.x))).toBeCloseTo(50, 6);
  });
});

describe("Startgroesse aus den Formvorgaben (#1048)", () => {
  const breite = (points: SketchPoint[]) => Math.max(...points.map((p) => p.x)) - Math.min(...points.map((p) => p.x));
  const tiefe = (points: SketchPoint[]) => Math.max(...points.map((p) => p.z)) - Math.min(...points.map((p) => p.z));

  it("gibt dem Rechteck Breite und Tiefe des Quaders", () => {
    const start = sketchPrimitiveStartSize("rectangle", { box: { width: 30, depth: 45, height: 30 } });
    expect(start).toEqual({ size: 30, depth: 45 });
    const { points, segments } = sketchPrimitiveGeometry("rectangle", { x: 0, z: 0 }, makeId, start.size, { depth: start.depth });
    expect(breite(points)).toBeCloseTo(30, 6);
    expect(tiefe(points)).toBeCloseTo(45, 6);
    expect(istGeschlossen(points, segments)).toBe(true);
  });

  it("gibt Kreis und Ellipse die Breite des Zylinders als Durchmesser", () => {
    const defaults = { cylinder: { width: 36, depth: 36 } };
    expect(sketchPrimitiveStartSize("circle", defaults)).toEqual({ size: 36 });
    const ellipse = sketchPrimitiveGeometry("ellipse", { x: 0, z: 0 }, makeId, sketchPrimitiveStartSize("ellipse", defaults).size).points;
    expect(breite(ellipse)).toBeCloseTo(36, 6);
    expect(tiefe(ellipse)).toBeCloseTo(18, 6);
  });

  it("bleibt ohne Vorgabe und bei Formen ohne Gegenstueck bei 20 mm", () => {
    expect(sketchPrimitiveStartSize("rectangle", {})).toEqual({ size: SKETCH_PRIMITIVE_SIZE });
    expect(sketchPrimitiveStartSize("rectangle", { box: { width: 0, depth: Number.NaN } })).toEqual({ size: SKETCH_PRIMITIVE_SIZE });
    expect(sketchPrimitiveStartSize("hexagon", { box: { width: 30 }, cylinder: { width: 30 } })).toEqual({ size: SKETCH_PRIMITIVE_SIZE });
  });

  it("laesst Dreieck und Sechseck gleichmaessig, auch mit einer Tiefe", () => {
    const dreieck = sketchPrimitiveGeometry("triangle", { x: 0, z: 0 }, makeId, 20, { depth: 50 }).points;
    expect(tiefe(dreieck)).toBeCloseTo(20, 6);
  });
});
