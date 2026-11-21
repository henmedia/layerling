import { afterEach, describe, expect, it, vi } from "vitest";
import type { OcctKernel, ShapeHandle, Vec3 } from "occt-wasm";
import { innerCornerEdges } from "@/lib/cadInnerCorners";

/*
 * The look for sharp inner corners keeps to the time the edge tool gives it (Issue #1812). On a Gridfinity bin with a
 * lettered label each question to the kernel whether a point lies in the solid was slow, the look at 150 edges took
 * 14 s, and a fillet that cannot be made was refused only after the preview had timed out.
 *
 * The kernel here is a stand-in whose every such question takes 10 ms on a clock the test moves itself: straight
 * edges along z, some at the bottom of a notch (three quarters of the turn round them filled) and some on an outer
 * corner (a quarter filled).
 */

const QUESTION_MS = 10;
const QUESTIONS_PER_EDGE = 16;

type Edge = { x: number; notch: boolean };

function standIn(edges: Edge[]) {
  const clock = { now: 0, questions: 0 };
  vi.spyOn(performance, "now").mockImplementation(() => clock.now);
  const cad = {
    curveParameters: () => ({ first: 0, last: 10 }),
    curvePointAtParam: (edge: Edge, param: number): Vec3 => ({ x: edge.x, y: 0, z: param }),
    curveTangent: (): Vec3 => ({ x: 0, y: 0, z: 1 }),
    containsPoint: (_solid: unknown, point: Vec3) => {
      clock.now += QUESTION_MS;
      clock.questions += 1;
      const edge = edges.reduce((nearest, entry) => (Math.abs(entry.x - point.x) < Math.abs(nearest.x - point.x) ? entry : nearest));
      // The body fills the quarter where both are positive, or all but that quarter.
      const quarter = point.x - edge.x > 0 && point.y > 0;
      return edge.notch ? !quarter : quarter;
    },
  } as unknown as OcctKernel;
  return { cad, clock, handles: edges as unknown as ShapeHandle[] };
}

const solid = {} as ShapeHandle;
// Ten edges 10 mm apart, every other one a notch.
const EDGES: Edge[] = Array.from({ length: 10 }, (_, index) => ({ x: index * 10, notch: index % 2 === 0 }));

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the look for inner corners among the edges at the ends of the picked ones", () => {
  it("finds the notches and leaves the outer corners when there is time", () => {
    const { cad, clock, handles } = standIn(EDGES);
    const corners = innerCornerEdges(cad, solid, handles, 1, 4000);
    expect(corners).toEqual(handles.filter((_, index) => index % 2 === 0));
    expect(clock.questions).toBe(EDGES.length * QUESTIONS_PER_EDGE);
  });

  it("looks at every edge when no time is set", () => {
    const { cad, handles } = standIn(EDGES);
    expect(innerCornerEdges(cad, solid, handles, 1)).toHaveLength(5);
  });

  it("stops once the time is up and reports no corners, not the ones it had found", () => {
    const { cad, clock, handles } = standIn(EDGES);
    // Time for three edges and a part of the fourth, two of them notches.
    const deadline = 3.5 * QUESTIONS_PER_EDGE * QUESTION_MS;
    expect(innerCornerEdges(cad, solid, handles, 1, deadline)).toEqual([]);
    // The edge it was at is finished, the six after it are not begun.
    expect(clock.questions).toBe(4 * QUESTIONS_PER_EDGE);
    expect(clock.now).toBeLessThan(deadline + QUESTIONS_PER_EDGE * QUESTION_MS);
  });

  it("reports no corners when the time was up before it began", () => {
    const { cad, clock, handles } = standIn(EDGES);
    clock.now = 5000;
    expect(innerCornerEdges(cad, solid, handles, 1, 4000)).toEqual([]);
    expect(clock.questions).toBe(0);
  });
});
