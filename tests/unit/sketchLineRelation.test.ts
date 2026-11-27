import { describe, expect, it } from "vitest";
import { isStraightSketchLine, relateSketchLine } from "@/lib/sketchLineRelation";
import type { SketchPoint, SketchProfile } from "@/types/layerling";

const pointOf = (points: SketchPoint[], id: string) => points.find((point) => point.id === id)!;
const direction = (points: SketchPoint[], from: string, to: string) => {
  const a = pointOf(points, from);
  const b = pointOf(points, to);
  const length = Math.hypot(b.x - a.x, b.z - a.z);
  return { x: (b.x - a.x) / length, z: (b.z - a.z) / length, length };
};
const cross = (u: { x: number; z: number }, v: { x: number; z: number }) => u.x * v.z - u.z * v.x;
const dot = (u: { x: number; z: number }, v: { x: number; z: number }) => u.x * v.x + u.z * v.z;

/** A slanted reference line r1-r2 at about 30 degrees, and a free line a-b well away from it. */
const apart: SketchProfile = {
  points: [
    { id: "r1", x: 0, z: 0 },
    { id: "r2", x: 40, z: 23.094 },
    { id: "a", x: 0, z: 40 },
    { id: "b", x: 30, z: 45 },
  ],
  segments: [
    { id: "ref", startId: "r1", endId: "r2" },
    { id: "ab", startId: "a", endId: "b" },
  ],
};

/** An open corner: the lines c-p and p-q meet at p at about 70 degrees. */
const corner: SketchProfile = {
  points: [
    { id: "c", x: 0, z: 0 },
    { id: "p", x: 30, z: 0 },
    { id: "q", x: 40, z: 27 },
  ],
  segments: [
    { id: "cp", startId: "c", endId: "p" },
    { id: "pq", startId: "p", endId: "q" },
  ],
};

describe("relateSketchLine", () => {
  it("turns a line apart from the reference parallel to it, keeping its length", () => {
    const result = relateSketchLine(apart, "ab", "ref", "parallel");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const line = direction(result.points, "a", "b");
    const reference = direction(result.points, "r1", "r2");
    expect(Math.abs(cross(line, reference))).toBeLessThan(1e-9);
    expect(line.length).toBeCloseTo(Math.hypot(30, 5), 9);
    // The reference does not move.
    expect(pointOf(result.points, "r1")).toEqual(apart.points[0]);
    expect(pointOf(result.points, "r2")).toEqual(apart.points[1]);
  });

  it("turns a line square to a slanted reference", () => {
    const result = relateSketchLine(apart, "ab", "ref", "perpendicular");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Math.abs(dot(direction(result.points, "a", "b"), direction(result.points, "r1", "r2")))).toBeLessThan(1e-9);
  });

  it("takes the smaller turn of the two ways the line could point", () => {
    // a-b points almost along the reference: parallel turns it a few degrees, not round by 180.
    const result = relateSketchLine(apart, "ab", "ref", "parallel");
    if (!result.ok) throw new Error("expected a turn");
    expect(dot(direction(result.points, "a", "b"), direction(result.points, "r1", "r2"))).toBeGreaterThan(0);
    // Its start stays (both ends are open ends, so the start is kept).
    expect(pointOf(result.points, "a")).toEqual(apart.points[2]);
  });

  it("turns about the corner it shares with the reference, so the reference stays as it is", () => {
    const result = relateSketchLine(corner, "pq", "cp", "perpendicular");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(pointOf(result.points, "p")).toEqual(corner.points[1]);
    expect(pointOf(result.points, "c")).toEqual(corner.points[0]);
    const moved = pointOf(result.points, "q");
    expect(moved.x).toBeCloseTo(30, 9);
    expect(moved.z).toBeCloseTo(Math.hypot(10, 27), 9);
  });

  it("works with a construction line as the reference", () => {
    const withConstruction: SketchProfile = { ...apart, segments: apart.segments.map((segment) => segment.id === "ref" ? { ...segment, construction: true } : segment) };
    expect(relateSketchLine(withConstruction, "ab", "ref", "parallel").ok).toBe(true);
  });

  it("swings the open end, not the end where other lines meet", () => {
    const hanging: SketchProfile = {
      points: [...apart.points, { id: "c", x: 10, z: 60 }],
      segments: [...apart.segments, { id: "bc", startId: "b", endId: "c" }],
    };
    const result = relateSketchLine(hanging, "ab", "ref", "parallel");
    if (!result.ok) throw new Error("expected a turn");
    expect(pointOf(result.points, "b")).toEqual(hanging.points[3]);
    expect(pointOf(result.points, "a")).not.toEqual(hanging.points[2]);
  });

  it("keeps a locked end and turns about it", () => {
    const lockedStart: SketchProfile = { ...apart, points: apart.points.map((point) => point.id === "a" ? { ...point, locked: true } : point) };
    const result = relateSketchLine(lockedStart, "ab", "ref", "perpendicular");
    if (!result.ok) throw new Error("expected a turn");
    expect(pointOf(result.points, "a")).toEqual(lockedStart.points[2]);
  });

  it("refuses when the end that would move is locked", () => {
    const bothLocked: SketchProfile = { ...apart, points: apart.points.map((point) => point.id === "a" || point.id === "b" ? { ...point, locked: true } : point) };
    expect(relateSketchLine(bothLocked, "ab", "ref", "parallel")).toEqual({ ok: false, reason: "locked" });
    const cornerLocked: SketchProfile = { ...corner, points: corner.points.map((point) => point.id === "q" ? { ...point, locked: true } : point) };
    expect(relateSketchLine(cornerLocked, "pq", "cp", "parallel")).toEqual({ ok: false, reason: "locked" });
  });

  it("refuses a curve, the same line, a line on both ends of the reference, and a line already in place", () => {
    const curved: SketchProfile = {
      points: apart.points.map((point) => point.id === "a" ? { ...point, handleOut: { x: 10, z: 30 } } : point.id === "b" ? { ...point, handleIn: { x: 20, z: 55 } } : point),
      segments: apart.segments.map((segment) => segment.id === "ab" ? { ...segment, kind: "bezier" as const } : segment),
    };
    expect(isStraightSketchLine(curved, "ab")).toBe(false);
    expect(relateSketchLine(curved, "ab", "ref", "parallel")).toEqual({ ok: false, reason: "notStraight" });
    expect(relateSketchLine(curved, "ref", "ab", "parallel")).toEqual({ ok: false, reason: "notStraight" });
    expect(relateSketchLine(apart, "ab", "ab", "parallel")).toEqual({ ok: false, reason: "sameLine" });
    const twin: SketchProfile = { ...apart, segments: [...apart.segments, { id: "twin", startId: "r2", endId: "r1" }] };
    expect(relateSketchLine(twin, "twin", "ref", "parallel")).toEqual({ ok: false, reason: "onReference" });
    const square: SketchProfile = {
      points: [{ id: "a", x: 0, z: 0 }, { id: "b", x: 10, z: 0 }, { id: "c", x: 0, z: 5 }, { id: "d", x: 10, z: 5 }],
      segments: [{ id: "ab", startId: "a", endId: "b" }, { id: "cd", startId: "c", endId: "d" }],
    };
    expect(relateSketchLine(square, "cd", "ab", "parallel")).toEqual({ ok: false, reason: "already" });
  });
});
