import { describe, expect, it } from "vitest";
import { SKETCH_CAD_DEFLECTION } from "@/lib/cadModifierRuntime";
import { OVER_FINE_LINEAR_DEFLECTION } from "@/lib/cadMeshRelief";
import { SKETCH_REVOLVE_SMOOTHNESS, sketchRevolveCadDeflection } from "@/lib/sketchCadDeflection";
import { normalizeSketchRevolveSettings } from "@/lib/sketchRevolve";
import type { SketchSegment } from "@/types/layerling";

const segments = (count: number): SketchSegment[] =>
  Array.from({ length: count }, (_, index) => ({ id: `s${index}`, startId: `p${index}`, endId: `p${index + 1}`, kind: "bezier" }));

/** Discussion #1426: Tom's revolved pots showed facets on the print; a revolved body can now be cut finer. */
describe("a revolved body's smoothness", () => {
  it("cuts as usual on standard and finer step by step", () => {
    const profile = { segments: segments(8) };
    expect(sketchRevolveCadDeflection(profile, undefined)).toEqual(SKETCH_CAD_DEFLECTION);
    const fine = sketchRevolveCadDeflection(profile, "fine");
    const extraFine = sketchRevolveCadDeflection(profile, "extraFine");
    expect(fine.linear).toBeLessThan(SKETCH_CAD_DEFLECTION.linear);
    expect(fine.angular).toBeLessThan(SKETCH_CAD_DEFLECTION.angular);
    expect(extraFine.linear).toBeLessThan(fine.linear);
    expect(extraFine.angular).toBeLessThan(fine.angular);
  });

  it("never goes below the fineness under which a body is lightened when a design opens", () => {
    for (const deflection of Object.values(SKETCH_REVOLVE_SMOOTHNESS)) expect(deflection.linear).toBeGreaterThanOrEqual(OVER_FINE_LINEAR_DEFLECTION);
  });

  it("is kept with the revolve's settings, and only its three steps", () => {
    expect(normalizeSketchRevolveSettings({ smoothness: "fine" }).smoothness).toBe("fine");
    expect(normalizeSketchRevolveSettings({ smoothness: "extraFine" }).smoothness).toBe("extraFine");
    expect(normalizeSketchRevolveSettings({}).smoothness).toBeUndefined();
    expect(normalizeSketchRevolveSettings({ smoothness: "ultra" as never }).smoothness).toBeUndefined();
  });
});
