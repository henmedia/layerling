import { describe, expect, it } from "vitest";
import { addFreehandStroke, freehandStroke, type FreehandSample } from "@/lib/sketchFreehand";
import { cubicPoint, curveControls, orderedPaths } from "@/lib/sketchPaths";
import { cadSketchRegions } from "@/lib/sketchCadProfile";
import type { SketchProfile } from "@/types/layerling";

let counter = 0;
const createId = (prefix: string) => `${prefix}-${(counter += 1)}`;
/** A hand's shake: a small, even wobble across the line. */
const shake = (index: number) => 0.25 * Math.sin(index * 1.7) + 0.15 * Math.sin(index * 4.3);
const options = { tolerance: 0.5, closeReach: 3 };

function along(from: FreehandSample, to: FreehandSample, steps: number): FreehandSample[] {
  return Array.from({ length: steps }, (_, index) => ({ x: from.x + ((to.x - from.x) * index) / steps, z: from.z + ((to.z - from.z) * index) / steps }));
}

/** Points along every side of the result, 20 per side. */
function traced(profile: SketchProfile) {
  const out: Array<{ x: number; z: number }> = [];
  orderedPaths(profile).forEach((path) => path.steps.forEach((step) => {
    const { first, second } = curveControls(step);
    for (let index = 0; index <= 20; index += 1) {
      const amount = index / 20;
      out.push(first && second ? cubicPoint(step.from, first, second, step.to, amount) : { x: step.from.x + (step.to.x - step.from.x) * amount, z: step.from.z + (step.to.z - step.from.z) * amount });
    }
  }));
  return out;
}

describe("freehand strokes (#1280)", () => {
  it("closes a shaky circle drawn past its start into one smooth outline of few points", () => {
    const samples = Array.from({ length: 200 }, (_, index) => {
      const angle = (index / 180) * Math.PI * 2; // 20 samples past the start
      const radius = 30 + shake(index);
      return { x: radius * Math.cos(angle), z: radius * Math.sin(angle) };
    });
    const stroke = freehandStroke(samples, options, createId)!;
    expect(stroke.closed).toBe(true);
    expect(stroke.points.length).toBeGreaterThanOrEqual(3);
    expect(stroke.points.length).toBeLessThanOrEqual(12);
    expect(stroke.points.every((point) => point.mode === "smooth")).toBe(true);
    const profile = { points: stroke.points, segments: stroke.segments };
    expect(cadSketchRegions(profile)).toHaveLength(1);
    // The curve keeps to the circle: no loop where the overshoot was cut, no bulge.
    traced(profile).forEach((point) => expect(Math.abs(Math.hypot(point.x, point.z) - 30)).toBeLessThan(1));
  });

  it("lets the slow wobble of a big hand-drawn circle go: a few points, not one per wave", () => {
    const samples = Array.from({ length: 300 }, (_, index) => {
      const angle = (index / 270) * Math.PI * 2;
      const radius = 24 + 0.6 * Math.sin(index * 0.31) + 0.3 * Math.sin(index * 2.3);
      return { x: radius * Math.cos(angle), z: radius * Math.sin(angle) };
    });
    const stroke = freehandStroke(samples, options, createId)!;
    expect(stroke.closed).toBe(true);
    expect(stroke.points.length).toBeLessThanOrEqual(6);
  });

  it("keeps the two sharp points of a heart as corners", () => {
    const samples = Array.from({ length: 220 }, (_, index) => {
      const t = (index / 200) * Math.PI * 2;
      return { x: 16 * Math.sin(t) ** 3 * 1.2, z: -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * 1.2 };
    });
    const stroke = freehandStroke(samples, options, createId)!;
    expect(stroke.closed).toBe(true);
    const corners = stroke.points.filter((point) => point.mode !== "smooth");
    expect(corners).toHaveLength(2);
    // The dip at the top and the tip at the bottom, both on the middle line.
    corners.forEach((point) => expect(Math.abs(point.x)).toBeLessThan(0.5));
    expect(cadSketchRegions({ points: stroke.points, segments: stroke.segments })).toHaveLength(1);
  });

  it("keeps a straight stroke as one line between two points", () => {
    const samples = along({ x: 0, z: 0 }, { x: 50, z: 0 }, 100).map((point, index) => ({ x: point.x, z: point.z + shake(index) * 0.5 }));
    const stroke = freehandStroke(samples, options, createId)!;
    expect(stroke.closed).toBe(false);
    expect(stroke.points).toHaveLength(2);
    expect(stroke.segments).toHaveLength(1);
    expect(stroke.segments[0].kind).toBe("line");
  });

  it("makes a sharp turn a corner point between two lines", () => {
    const samples = [...along({ x: 0, z: 0 }, { x: 30, z: 30 }, 60), ...along({ x: 30, z: 30 }, { x: 60, z: 0 }, 60), { x: 60, z: 0 }];
    const stroke = freehandStroke(samples, options, createId)!;
    expect(stroke.closed).toBe(false);
    expect(stroke.segments.map((segment) => segment.kind)).toEqual(["line", "line"]);
    const middle = stroke.points[1];
    expect(middle.mode).toBe("corner");
    expect(Math.hypot(middle.x - 30, middle.z - 30)).toBeLessThan(1.5);
  });

  it("closes a square drawn by hand into four corners", () => {
    const corners = [{ x: 0, z: 0 }, { x: 40, z: 0 }, { x: 40, z: 40 }, { x: 0, z: 40 }, { x: 0, z: 0 }];
    const samples = corners.slice(0, -1).flatMap((corner, index) => along(corner, corners[index + 1], 50)).concat([{ x: 1, z: 0 }, { x: 2, z: 0 }]);
    const stroke = freehandStroke(samples, options, createId)!;
    expect(stroke.closed).toBe(true);
    expect(stroke.points).toHaveLength(4);
    expect(stroke.segments.every((segment) => segment.kind === "line")).toBe(true);
    expect(cadSketchRegions({ points: stroke.points, segments: stroke.segments })).toHaveLength(1);
  });

  it("curves an S with smooth points inside and its two ends open", () => {
    const samples = Array.from({ length: 160 }, (_, index) => ({ x: index * 0.5, z: 15 * Math.sin((index / 160) * Math.PI * 2) + shake(index) * 0.4 }));
    const stroke = freehandStroke(samples, options, createId)!;
    expect(stroke.closed).toBe(false);
    expect(stroke.segments.some((segment) => segment.kind === "bezier")).toBe(true);
    expect(stroke.points.length).toBeLessThanOrEqual(8);
    stroke.points.slice(1, -1).forEach((point) => expect(point.mode).toBe("smooth"));
    expect(orderedPaths({ points: stroke.points, segments: stroke.segments }).every((path) => !path.closed)).toBe(true);
  });

  it("carries an open line on and closes the outline when a stroke runs from one open end to the other", () => {
    const profile: SketchProfile = {
      points: [{ id: "a", x: 0, z: 0, mode: "corner" }, { id: "b", x: 40, z: 0, mode: "corner" }, { id: "c", x: 40, z: 30, mode: "corner" }],
      segments: [{ id: "ab", startId: "a", endId: "b", kind: "line" }, { id: "bc", startId: "b", endId: "c", kind: "line" }],
    };
    // From near c, bowing out to the left, back to near a.
    const samples = Array.from({ length: 80 }, (_, index) => {
      const t = index / 79;
      return { x: 40.6 - 40.3 * t - 12 * Math.sin(Math.PI * t), z: 30.4 - 30.2 * t + 6 * Math.sin(Math.PI * t) };
    });
    const stroke = freehandStroke(samples, options, createId)!;
    expect(stroke.closed).toBe(false);
    const added = addFreehandStroke(profile, stroke, 3);
    expect(added.joined).toBe(2);
    expect(added.closed).toBe(true);
    expect(added.profile.points).toHaveLength(3 + stroke.points.length - 2);
    expect(added.points).toBe(added.profile.points.length);
    expect(cadSketchRegions(added.profile)).toHaveLength(1);
  });

  it("turns the stroke round when the joined point's handle is taken", () => {
    // The open end p starts a curved side: its out handle is used, so a curve may only arrive there.
    const profile: SketchProfile = {
      points: [{ id: "p", x: 0, z: 0, mode: "split", handleOut: { x: 5, z: -5 } }, { id: "q", x: 20, z: 0, mode: "split", handleIn: { x: 15, z: -5 } }],
      segments: [{ id: "pq", startId: "p", endId: "q", kind: "bezier" }],
    };
    const samples = Array.from({ length: 60 }, (_, index) => ({ x: -0.3 - index * 0.4, z: 0.2 + 8 * Math.sin((index / 59) * Math.PI) }));
    const added = addFreehandStroke(profile, freehandStroke(samples, options, createId)!, 3);
    expect(added.joined).toBe(1);
    expect(added.profile.points.filter((point) => point.id === "p")).toHaveLength(1);
    const sides = added.profile.segments.filter((segment) => segment.startId === "p" || segment.endId === "p");
    expect(sides).toHaveLength(2);
    expect(sides.filter((segment) => segment.startId === "p")).toHaveLength(1);
  });

  it("adds a stroke far from every open end as a line of its own", () => {
    const profile: SketchProfile = { points: [{ id: "a", x: 0, z: 0 }, { id: "b", x: 10, z: 0 }], segments: [{ id: "ab", startId: "a", endId: "b", kind: "line" }] };
    const added = addFreehandStroke(profile, freehandStroke(along({ x: 50, z: 50 }, { x: 80, z: 60 }, 40), options, createId)!, 3);
    expect(added.joined).toBe(0);
    expect(added.closed).toBe(false);
    expect(added.profile.points).toHaveLength(4);
  });

  it("leaves a tap alone and draws construction lines when asked", () => {
    expect(freehandStroke([{ x: 0, z: 0 }, { x: 0.3, z: 0.1 }], options, createId)).toBeNull();
    const stroke = freehandStroke(along({ x: 0, z: 0 }, { x: 20, z: 5 }, 40), { ...options, construction: true }, createId)!;
    expect(stroke.segments.every((segment) => segment.construction)).toBe(true);
  });
});
