import { describe, expect, it } from "vitest";
import { cadSketchRegions, orderedCadSketchPaths, sketchFinishProblems } from "@/lib/sketchCadProfile";
import type { SketchProfile } from "@/types/layerling";

// Reported by Making Layers: lines joined to the outline of a face went missing without a word, and a point dragged
// onto its neighbour ended in "makeLineEdge: construction failed".

/** A sketch from named points and lines such as "ab". */
function sketch(points: Record<string, [number, number]>, lines: string[]): SketchProfile {
  return {
    points: Object.entries(points).map(([id, [x, z]]) => ({ id, x, z })),
    segments: lines.map((line, index) => ({ id: `s${index}`, startId: line[0], endId: line[1], kind: "line" as const })),
  };
}

const square: Record<string, [number, number]> = { a: [0, 0], b: [10, 0], c: [10, 10], d: [0, 10] };
const sides = ["ab", "bc", "cd", "da"];
const closed = (profile: SketchProfile) => orderedCadSketchPaths(profile).filter((path) => path.closed);

describe("a sketch whose lines meet", () => {
  it("leaves a plain outline as it was", () => {
    const profile = sketch(square, sides);
    expect(sketchFinishProblems(profile)).toEqual({ ambiguous: [], leftOut: 0 });
    expect(closed(profile)).toHaveLength(1);
  });

  it("cannot tell the outline where a second way joins two corners, and names those corners", () => {
    const profile = sketch({ ...square, e: [-5, 20], f: [15, 20] }, [...sides, "de", "ef", "fc"]);
    expect(sketchFinishProblems(profile).ambiguous.map((point) => point.id).sort()).toEqual(["c", "d"]);
  });

  it("keeps outlines that cross, where no line goes missing", () => {
    // Two squares pushed over each other, with a point at both crossings.
    const profile = sketch(
      { a: [0, 0], b: [10, 0], c: [10, 10], d: [0, 10], e: [5, 5], f: [15, 5], g: [15, 15], h: [5, 15], p: [10, 5], q: [5, 10] },
      ["ab", "bp", "pc", "cq", "qd", "da", "ep", "pf", "fg", "gh", "hq", "qe"],
    );
    expect(sketchFinishProblems(profile)).toEqual({ ambiguous: [], leftOut: 0 });
    expect(closed(profile).map((path) => path.points.map((point) => point.id).join(""))).toEqual(["abpcqd", "epfghq"]);
  });

  it("takes two outlines that share one point as two outlines", () => {
    const profile = sketch({ ...square, e: [20, 10], f: [20, 20] }, [...sides, "ce", "ef", "fc"]);
    expect(sketchFinishProblems(profile)).toEqual({ ambiguous: [], leftOut: 0 });
    expect(closed(profile).map((path) => path.steps.length).sort()).toEqual([3, 4]);
  });

  it("builds the outline beside ends that stick out, and counts them as left out", () => {
    const profile = sketch({ ...square, e: [20, 0], f: [25, 5], g: [-5, -5] }, [...sides, "be", "ef", "ag"]);
    expect(sketchFinishProblems(profile)).toEqual({ ambiguous: [], leftOut: 3 });
    expect(closed(profile)).toHaveLength(1);
    expect(cadSketchRegions(profile)).toHaveLength(1);
  });

  it("counts a line of its own beside the outline as left out too", () => {
    const profile = sketch({ ...square, e: [20, 0], f: [30, 0] }, [...sides, "ef"]);
    expect(sketchFinishProblems(profile)).toEqual({ ambiguous: [], leftOut: 1 });
  });

  it("keeps both outlines joined by a line, and leaves the line out", () => {
    const profile = sketch({ ...square, e: [20, 0], f: [30, 0], g: [30, 10] }, [...sides, "be", "ef", "fg", "ge"]);
    expect(sketchFinishProblems(profile)).toEqual({ ambiguous: [], leftOut: 1 });
    expect(closed(profile)).toHaveLength(2);
  });

  it("says nothing about lines where there is no closed outline at all", () => {
    expect(sketchFinishProblems(sketch(square, ["ab", "bc"]))).toEqual({ ambiguous: [], leftOut: 0 });
  });
});

describe("a side of no length", () => {
  it("is folded away, so the outline stays closed with one corner less", () => {
    // c dragged onto b: the side between them has no length.
    const profile = sketch({ ...square, c: [10, 0] }, sides);
    const [outline] = closed(profile);
    expect(outline.steps).toHaveLength(3);
    for (const step of outline.steps) expect(Math.hypot(step.to.x - step.from.x, step.to.z - step.from.z)).toBeGreaterThan(1);
    expect(sketchFinishProblems(profile)).toEqual({ ambiguous: [], leftOut: 0 });
  });

  it("is folded away several in a row", () => {
    const profile = sketch({ a: [0, 0], b: [10, 0], c: [10, 0], d: [10, 0.00001], e: [0, 10] }, ["ab", "bc", "cd", "de", "ea"]);
    expect(closed(profile)[0].steps).toHaveLength(3);
  });
});
