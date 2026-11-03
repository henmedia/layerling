import { beforeEach, describe, expect, it } from "vitest";
import { setLanguage } from "@/lib/i18n";
import { bodyOverhang, overhangFigures, overhangFiguresText } from "@/lib/overhangFigures";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { canonicalizeShape } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

function shape(kind: string, patch: Partial<WorkplaneShape>): WorkplaneShape {
  const asset = toolbarShapeAssets.find((entry) => entry.kind === kind)!;
  return canonicalizeShape({ ...makeShapeFromAsset(asset, { x: 0, z: 0 }), ...patch });
}

beforeEach(async () => {
  await setLanguage("en", false);
});

describe("the figures under the view while overhangs are shown", () => {
  it("has nothing for boxes standing on the plate", () => {
    const boxes = [shape("box", { name: "Box", width: 20, depth: 20, height: 20 }), shape("box", { name: "Tall", x: 40, width: 10, depth: 10, height: 40 })];
    const figures = overhangFigures(boxes, 45);
    expect(figures).toEqual({ angle: 45, areaMm2: 0, steepest: null });
    expect(overhangFiguresText(figures)).toBe("No overhangs – nothing needs supports");
  });

  it("adds up the area to support, names the body with the steepest overhang, and leaves holes and hidden bodies out", () => {
    // A 20 x 20 box 5 mm above the plate: its underside, 4 cm², is a ceiling.
    const floating = shape("box", { name: "Shelf", width: 20, depth: 20, height: 10, elevation: 5 });
    const standing = shape("box", { name: "Box", x: 40, width: 20, depth: 20, height: 20 });
    const hole = shape("box", { name: "Hole", x: 80, width: 20, depth: 20, height: 10, elevation: 5, hole: true });
    const hidden = shape("box", { name: "Hidden", x: 120, width: 30, depth: 30, height: 10, elevation: 5, hidden: true });
    const figures = overhangFigures([floating, standing, hole, hidden], 45);
    expect(figures.areaMm2).toBeCloseTo(400, 3);
    expect(figures.steepest?.name).toBe("Shelf");
    expect(figures.steepest?.degrees).toBeCloseTo(90, 3);
    expect(overhangFiguresText(figures)).toBe("Steepest overhang 90° on \"Shelf\" · 4 cm² beyond 45° need supports");
    expect(bodyOverhang(standing, 45)).toMatchObject({ areaMm2: 0, steepestDegrees: null });
  });

  it("gives the steepest overhang of a body that needs no supports, rounded down", () => {
    // A cone standing on its wide base leans inwards only; upside down, on its tip, it leans out.
    const cone = shape("cone", { name: "Cone", width: 20, depth: 20, height: 20 });
    expect(bodyOverhang(cone, 45).steepestDegrees).toBeNull();
    const sphere = shape("sphere", { name: "Ball", width: 20, depth: 20, height: 20 });
    const ball = bodyOverhang(sphere, 45);
    // A ball on the plate overhangs all round its lower half, steepest just above where it touches.
    expect(ball.areaMm2).toBeGreaterThan(0);
    expect(ball.steepestDegrees!).toBeGreaterThan(80);
    expect(overhangFiguresText({ angle: 70, areaMm2: 0, steepest: { degrees: 44.9, name: "Ramp" } })).toBe("Steepest overhang 44° on \"Ramp\" – below 70°, nothing needs supports");
    expect(overhangFiguresText({ angle: 45, areaMm2: 1234, steepest: { degrees: 61.2, name: "Lid" } })).toBe("Steepest overhang 61° on \"Lid\" · 12 cm² beyond 45° need supports");
    expect(overhangFiguresText({ angle: 45, areaMm2: 46, steepest: { degrees: 50, name: "Lid" } })).toBe("Steepest overhang 50° on \"Lid\" · 0.46 cm² beyond 45° need supports");
  });
});
