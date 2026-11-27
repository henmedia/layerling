import { describe, expect, it } from "vitest";
import { circleMeasureKind, circleOfLoop, SECTION_OPPOSITE_REACH, sectionMeasurement, sectionPointsAcross, sectionPointToWorld, snapSectionPoint } from "@/lib/sectionMeasure";
import { projectSectionPoint, sliceMeshContours, type SectionLoop } from "@/lib/sectionSvg";

type V = [number, number, number];

/** A square tube: 20 x 20 outside, 2 mm walls, 10 high, standing on the plate. */
function squareTube() {
  const vertices: V[] = [];
  const faces: V[] = [];
  const ring = (half: number, y: number) => {
    const start = vertices.length;
    [[-half, -half], [half, -half], [half, half], [-half, half]].forEach(([x, z]) => vertices.push([x, y, z]));
    return start;
  };
  const outerBottom = ring(10, 0);
  const outerTop = ring(10, 10);
  const innerBottom = ring(8, 0);
  const innerTop = ring(8, 10);
  for (let i = 0; i < 4; i += 1) {
    const j = (i + 1) % 4;
    faces.push([outerBottom + i, outerBottom + j, outerTop + j], [outerBottom + i, outerTop + j, outerTop + i]);
    faces.push([innerBottom + i, innerTop + j, innerBottom + j], [innerBottom + i, innerTop + i, innerTop + j]);
    faces.push([outerTop + i, outerTop + j, innerTop + j], [outerTop + i, innerTop + j, innerTop + i]);
    faces.push([outerBottom + i, innerBottom + j, outerBottom + j], [outerBottom + i, innerBottom + i, innerBottom + j]);
  }
  return { vertices, faces };
}

describe("sectionPointToWorld", () => {
  it.each(["x", "y", "z"] as const)("undoes projectSectionPoint for a %s cut", (axis) => {
    const world: V = axis === "x" ? [4, 7, -3] : axis === "y" ? [5, 4, -2] : [-6, 3, 4];
    // Each test point lies on its plane at 4
    const back = sectionPointToWorld(projectSectionPoint(world, axis), axis, 4);
    back.forEach((value, index) => expect(value).toBeCloseTo(world[index], 9));
  });
});

describe("snapSectionPoint", () => {
  const loops: SectionLoop[] = sliceMeshContours(squareTube(), "y", 5);

  it("cuts the tube into an outer and an inner square", () => {
    expect(loops).toHaveLength(2);
    expect(loops.every((loop) => loop.closed)).toBe(true);
  });

  it("puts a click near a wall onto the wall", () => {
    const snap = snapSectionPoint({ u: 9.7, v: 3 }, loops, 1);
    expect(snap.kind).toBe("outline");
    expect(snap.point.u).toBeCloseTo(10, 9);
    expect(snap.point.v).toBeCloseTo(3, 9);
  });

  it("prefers a corner close by", () => {
    const snap = snapSectionPoint({ u: 9.8, v: 9.7 }, loops, 1);
    expect(snap.kind).toBe("corner");
    expect(snap.point).toEqual({ u: 10, v: 10 });
  });

  it("leaves a click away from every wall where it is", () => {
    expect(snapSectionPoint({ u: 0, v: 0 }, loops, 1).kind).toBe("free");
  });

  it("measures the wall thickness square to the wall, wherever the second click lands near it", () => {
    const first = snapSectionPoint({ u: 10.2, v: 2 }, loops, 1).point;
    // The second click is a little off along the inner wall
    const second = snapSectionPoint({ u: 8.3, v: 2.6 }, loops, 1, first);
    expect(second.kind).toBe("perpendicular");
    const measured = sectionMeasurement(first, second.point, "y", 5);
    expect(measured.distance).toBeCloseTo(2, 9);
    expect(measured.deltaX).toBeCloseTo(-2, 9);
    expect(measured.deltaHeight).toBe(0);
  });
});

describe("snapSectionPoint across a wall", () => {
  const loops: SectionLoop[] = sliceMeshContours(squareTube(), "y", 5);

  it("finds the thickness from anywhere along the opposite wall", () => {
    const first = snapSectionPoint({ u: 10.2, v: 2 }, loops, 1).point;
    const second = snapSectionPoint({ u: 8.4, v: 6.5 }, loops, 1, first);
    expect(second.kind).toBe("perpendicular");
    expect(second.point.u).toBeCloseTo(8, 9);
    expect(second.point.v).toBeCloseTo(2, 9);
  });

  it("still takes a corner the cursor is right on", () => {
    const first = snapSectionPoint({ u: 10.2, v: 2 }, loops, 1).point;
    expect(snapSectionPoint({ u: 8.1, v: 7.9 }, loops, 1, first).kind).toBe("corner");
  });
});

describe("sectionMeasurement", () => {
  it("names the parts like the position fields: depth is the scene's z, height its y", () => {
    // A Y cut (depth, scene axis z): the sheet shows X across and height up
    const measured = sectionMeasurement({ u: 0, v: 0 }, { u: 3, v: -4 }, "z", 7);
    expect(measured.distance).toBeCloseTo(5, 9);
    expect(measured.deltaX).toBeCloseTo(3, 9);
    expect(measured.deltaHeight).toBeCloseTo(4, 9);
    expect(measured.deltaDepth).toBe(0);
  });
});

describe("round outlines (#375)", () => {
  /** A ring of 48 corners round (cu, cv), like the cut through a cylinder. */
  const ring = (cu: number, cv: number, radius: number, count = 48): SectionLoop => ({
    closed: true,
    points: Array.from({ length: count }, (_, index) => {
      const angle = (index / count) * Math.PI * 2 + 0.1;
      return { u: cu + radius * Math.cos(angle), v: cv + radius * Math.sin(angle) };
    }),
  });
  const circle = ring(30, -12, 12.5);

  it("finds the centre and the radius of a ring of corners", () => {
    const found = circleOfLoop(circle);
    expect(found?.center.u).toBeCloseTo(30, 6);
    expect(found?.center.v).toBeCloseTo(-12, 6);
    expect(found?.radius).toBeCloseTo(12.5, 6);
  });

  it("takes a square, a hexagon and a long D-shape for no circle", () => {
    expect(circleOfLoop(ring(0, 0, 10, 4))).toBeNull();
    expect(circleOfLoop(ring(0, 0, 10, 6))).toBeNull();
    const dShape: SectionLoop = { closed: true, points: [...circle.points.slice(0, 30), circle.points[30]] };
    expect(circleOfLoop(dShape)).toBeNull();
  });

  it("takes a rounded rectangle for no circle", () => {
    const points = [];
    for (let i = 0; i < 40; i += 1) points.push({ u: i < 20 ? i : 40 - i, v: i < 20 ? 0 : 6 });
    expect(circleOfLoop({ closed: true, points })).toBeNull();
  });

  it("snaps to the centre of a larger circle", () => {
    const snap = snapSectionPoint({ u: 30.3, v: -11.8 }, [circle], 1);
    expect(snap.kind).toBe("center");
    expect(snap.point.u).toBeCloseTo(30, 6);
    expect(snap.point.v).toBeCloseTo(-12, 6);
  });

  it("does not snap to the centre of a circle smaller than the reach", () => {
    const small = ring(0, 0, 0.8);
    expect(snapSectionPoint({ u: 0.1, v: 0.1 }, [small], 1).kind).not.toBe("center");
  });

  it("lands the second point exactly across the centre, so two clicks give the diameter", () => {
    const first = snapSectionPoint({ u: 42.4, v: -12.3 }, [circle], 1);
    const second = snapSectionPoint({ u: 17.9, v: -10.8 }, [circle], 1, first.point);
    expect(second.kind).toBe("opposite");
    const result = sectionMeasurement(first.point, second.point, "z", 0, [circle]);
    expect(result.distance).toBeCloseTo(25, 6);
    expect(result.circle).toBe("diameter");
  });

  it("puts a click between two corners onto the true circle, so a coarse polygon still gives the diameter", () => {
    const coarse = ring(0, 0, 15, 24);
    const first = snapSectionPoint({ u: 14.6 * Math.cos(0.1 + Math.PI / 24), v: 14.6 * Math.sin(0.1 + Math.PI / 24) }, [coarse], 1);
    expect(first.kind).toBe("outline");
    expect(Math.hypot(first.point.u, first.point.v)).toBeCloseTo(15, 9);
    const second = snapSectionPoint({ u: -first.point.u + 0.3, v: -first.point.v - 0.2 }, [coarse], 1, first.point);
    expect(second.kind).toBe("opposite");
    expect(sectionMeasurement(first.point, second.point, "z", 0, [coarse]).distance).toBeCloseTo(30, 9);
  });

  it("gives the radius from the centre to the circle", () => {
    const centre = snapSectionPoint({ u: 30.2, v: -12.1 }, [circle], 1);
    const edge = snapSectionPoint({ u: 41.9, v: -13.2 }, [circle], 1, centre.point);
    expect(edge.kind).toBe("outline");
    const result = sectionMeasurement(centre.point, edge.point, "z", 0, [circle]);
    expect(result.distance).toBeCloseTo(12.5, 6);
    expect(result.circle).toBe("radius");
  });

  it("says nothing special about a measurement that is not across a circle", () => {
    expect(circleMeasureKind({ u: 42.5, v: -12 }, { u: 30, v: 0.5 }, [circle])).toBeNull();
    expect(sectionMeasurement({ u: 0, v: 0 }, { u: 3, v: 4 }, "z", 0).circle).toBeNull();
  });

  it("keeps the corner snap away from a first point that is not on the circle", () => {
    const outside = { u: 60, v: 0 };
    expect(snapSectionPoint({ u: 18, v: -12 }, [circle], 1, outside).kind).not.toBe("opposite");
  });

  it("names the point across a first point on the circle, so it can be shown before the second click (#2123)", () => {
    const first = snapSectionPoint({ u: 42.4, v: -12.3 }, [circle], 1);
    const across = sectionPointsAcross(first.point, [circle]);
    expect(across).toHaveLength(1);
    expect(across[0].u).toBeCloseTo(60 - first.point.u, 9);
    expect(across[0].v).toBeCloseTo(-24 - first.point.v, 9);
    expect(sectionPointsAcross({ u: 30, v: -12 }, [circle])).toEqual([]);
    expect(sectionPointsAcross({ u: 60, v: 0 }, [circle])).toEqual([]);
  });

  it("catches the point across from farther away than the other snaps (#2123)", () => {
    const first = snapSectionPoint({ u: 42.4, v: -12.3 }, [circle], 1);
    const [across] = sectionPointsAcross(first.point, [circle]);
    const near = { u: across.u + 0.9 * SECTION_OPPOSITE_REACH, v: across.v };
    expect(snapSectionPoint(near, [circle], 1, first.point).kind).toBe("opposite");
    const far = { u: across.u, v: across.v + 1.1 * SECTION_OPPOSITE_REACH };
    expect(snapSectionPoint(far, [circle], 1, first.point).kind).not.toBe("opposite");
  });
});
