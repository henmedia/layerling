import { beforeEach, describe, expect, it } from "vitest";
import { setLanguage } from "@/lib/i18n";
import { bodyOverhang, overhangFigures, overhangFiguresText, plateEdgeOverhang } from "@/lib/overhangFigures";
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

/**
 * A bar 20 wide, 10 high and 30 long as a mesh body standing on the plate, with this outline (x, y) of its lower left
 * corner in place of the sharp one: the points from the wall down to the plate.
 */
function bar(name: string, corner: Array<[number, number]>, topCorner: Array<[number, number]> = [[0, 10]]): WorkplaneShape {
  const section: Array<[number, number]> = [[20, 0], [20, 10], ...topCorner, ...corner];
  const positions: number[] = [];
  const point = (index: number, z: number) => [section[index][0] - 10, section[index][1], z];
  for (let index = 0; index < section.length; index += 1) {
    const next = (index + 1) % section.length;
    positions.push(...point(index, -15), ...point(next, -15), ...point(next, 15), ...point(index, -15), ...point(next, 15), ...point(index, 15));
    if (index > 0 && next > 0) {
      positions.push(...point(0, -15), ...point(next, -15), ...point(index, -15), ...point(0, 15), ...point(index, 15), ...point(next, 15));
    }
  }
  return {
    id: name, name, kind: "mesh", color: "#888888", x: 0, z: 0, elevation: 0, rotation: 0, size: 20, width: 20, depth: 30, height: 10,
    importedMesh: { positions, baseWidth: 20, baseDepth: 30, baseHeight: 10, triangleCount: positions.length / 9, sourceFormat: "stl" },
  } as unknown as WorkplaneShape;
}

/** A quarter circle of this radius in so many steps, from the wall at (0, radius) down to the plate at (radius, 0). */
function rounded(radius: number, steps = 8): Array<[number, number]> {
  return Array.from({ length: steps + 1 }, (_, step) => {
    const turn = Math.PI + (step * Math.PI) / (2 * steps);
    return [radius + radius * Math.cos(turn), radius + radius * Math.sin(turn)] as [number, number];
  });
}

describe("whether a treated edge still prints where the body lies on the plate", () => {
  const sharp = bar("Sharp", [[0, 0]]);

  it("finds the overhang of an edge rounded on the plate, and says how steep it is", () => {
    const found = plateEdgeOverhang(sharp, bar("Round", rounded(2)), 45);
    expect(found?.angle).toBe(45);
    // The first step above the plate leans about 73° from the vertical; the fillet itself begins at 90°.
    expect(found!.degrees).toBeGreaterThan(70);
    expect(found!.degrees).toBeLessThan(90);
  });

  it("passes a chamfer at the limit and one that is steeper, and finds one that lies flatter", () => {
    expect(plateEdgeOverhang(sharp, bar("Chamfer 45", [[0, 2], [2, 0]]), 45)).toBeNull();
    expect(plateEdgeOverhang(sharp, bar("Chamfer steep", [[0, 4], [2, 0]]), 45)).toBeNull();
    const flat = plateEdgeOverhang(sharp, bar("Chamfer flat", [[0, 1], [2, 0]]), 45);
    expect(flat!.degrees).toBeCloseTo((Math.atan(2) * 180) / Math.PI, 3);
    // With the limit at 70° that same chamfer prints.
    expect(plateEdgeOverhang(sharp, bar("Chamfer flat", [[0, 1], [2, 0]]), 70)).toBeNull();
  });

  it("says nothing about an edge rounded at the top, or a body that hung over on the plate before", () => {
    const top = rounded(2).map(([x, y]) => [x, 10 - y] as [number, number]).reverse();
    expect(plateEdgeOverhang(sharp, bar("Round top", [[0, 0]], top), 45)).toBeNull();
    const round = bar("Round", rounded(2));
    expect(plateEdgeOverhang(round, round, 45)).toBeNull();
    // The treated body is meshed anew: the same curve in finer or coarser steps is not an overhang the treatment made.
    expect(plateEdgeOverhang(round, bar("Round, finer", rounded(2, 12)), 45)).toBeNull();
    expect(plateEdgeOverhang(round, bar("Round, coarser", rounded(2, 6)), 45)).toBeNull();
    const ball = shape("sphere", { name: "Ball", width: 20, depth: 20, height: 20 });
    expect(plateEdgeOverhang(ball, ball, 45)).toBeNull();
  });
});
