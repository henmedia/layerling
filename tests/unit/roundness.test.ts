import { describe, expect, it } from "vitest";
import { drawnRound, EXACT_ROUND_TOLERANCE, ROUND_FROM_BENT_TUBE_QUALITY, ROUND_FROM_HALF_SPHERE_STEPS, ROUND_FROM_ROOF_SIDES, ROUND_FROM_SIDES, ROUND_FROM_SPHERE_STEPS } from "@/lib/roundness";
import { automaticSideCount } from "@/lib/roundSideCount";
import { DEFAULT_SPHERE_STEPS } from "@/lib/sphereTessellation";
import { DEFAULT_BENT_TUBE_QUALITY } from "@/lib/bentTubeGeometry";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";

/** Wie weit das Vieleck vom Kreis abweicht - die Pfeilhoehe des Abschnitts. */
function deviation(diameter: number, corners: number) {
  return (diameter / 2) * (1 - Math.cos(Math.PI / corners));
}

describe("drawn round or drawn with sides", () => {
  it("counts a body without a set number as round, whatever the corners", () => {
    expect(drawnRound(undefined, ROUND_FROM_SIDES, 3, 1000, 1000)).toBe(true);
    expect(drawnRound(undefined, ROUND_FROM_SIDES, automaticSideCount(200, 200), 200, 200)).toBe(true);
  });

  it("counts a set number at least as fine as the shape's own as round, whatever the size", () => {
    // Die alte feste Vorgabe von 96 Seiten, auch weit ueber der Toleranz.
    expect(deviation(400, 96)).toBeGreaterThan(EXACT_ROUND_TOLERANCE);
    expect(drawnRound(96, ROUND_FROM_SIDES, 96, 400, 400)).toBe(true);
    expect(drawnRound(95, ROUND_FROM_SIDES, 95, 400, 400)).toBe(false);
    // Die Kugel mit ihren 24 Stufen: 48 Ecken rundum.
    expect(drawnRound(24, ROUND_FROM_SPHERE_STEPS, 48, 200, 200)).toBe(true);
    expect(drawnRound(12, ROUND_FROM_SPHERE_STEPS, 24, 200, 200)).toBe(false);
  });

  it("counts fewer only when the polygon lies within the tolerance of the circle", () => {
    // Ein Sechskant bleibt ein Sechskant, auch klein - die Mutterntasche.
    expect(drawnRound(6, ROUND_FROM_SIDES, 6, 2, 2)).toBe(false);
    expect(drawnRound(24, ROUND_FROM_SIDES, 24, 150, 150)).toBe(false);
    // Ein Zwoelfkant von einem Millimeter weicht 0,017 mm ab - so fein druckt niemand.
    expect(drawnRound(12, ROUND_FROM_SIDES, 12, 1, 1)).toBe(true);
    // Die laengere Achse gibt den Ausschlag, genau an der Grenze.
    const corners = 16;
    const limit = (2 * EXACT_ROUND_TOLERANCE) / (1 - Math.cos(Math.PI / corners));
    expect(deviation(limit, corners)).toBeCloseTo(EXACT_ROUND_TOLERANCE, 9);
    expect(drawnRound(corners, ROUND_FROM_SIDES, corners, limit * 0.999, 1)).toBe(true);
    expect(drawnRound(corners, ROUND_FROM_SIDES, corners, 1, limit * 1.001)).toBe(false);
  });

  it("keeps each threshold equal to the default the shape is drawn with", () => {
    const fresh = (kind: string) => makeShapeFromAsset(toolbarShapeAssets.find((entry) => entry.kind === kind)!, { x: 0, z: 0 });
    expect(fresh("sphere").steps).toBe(ROUND_FROM_SPHERE_STEPS);
    expect(DEFAULT_SPHERE_STEPS).toBe(ROUND_FROM_SPHERE_STEPS);
    expect(fresh("halfSphere").steps).toBe(ROUND_FROM_HALF_SPHERE_STEPS);
    expect(fresh("paraboloid").steps).toBe(ROUND_FROM_HALF_SPHERE_STEPS);
    expect(fresh("roundRoof").sides).toBe(ROUND_FROM_ROOF_SIDES);
    expect(fresh("bentTube").bentTubeQuality ?? DEFAULT_BENT_TUBE_QUALITY).toBe(ROUND_FROM_BENT_TUBE_QUALITY);
    expect(DEFAULT_BENT_TUBE_QUALITY).toBe(ROUND_FROM_BENT_TUBE_QUALITY);
    // Zylinder, Kegel und Rohr folgen heute der Groesse; 96 ist ihre fruehere feste Vorgabe.
    ["cylinder", "cone", "tube"].forEach((kind) => expect(fresh(kind).sides).toBeUndefined());
  });
});
