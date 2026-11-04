import { describe, expect, it } from "vitest";
import { applyCornerAngle, sketchCornerAt } from "@/lib/sketchAngles";
import { applySegmentDimension, SEGMENT_DIMENSION_CENTER } from "@/lib/sketchDimensions";
import { changesLockedOutline, lockedCornerTurn, lockedLengthAnchor, setSketchPointsLocked } from "@/lib/sketchLock";
import type { SketchProfile } from "@/types/layerling";

// A rough rectangle drawn by hand, as in #629; "ba" runs from b to a, so its default anchor is b.
const rough: SketchProfile = {
  points: [
    { id: "a", x: 0, z: 0 },
    { id: "b", x: 57, z: 1 },
    { id: "c", x: 58, z: 43 },
    { id: "d", x: 1, z: 40 },
  ],
  segments: [
    { id: "ba", startId: "b", endId: "a" },
    { id: "bc", startId: "b", endId: "c" },
    { id: "cd", startId: "c", endId: "d" },
    { id: "da", startId: "d", endId: "a" },
  ],
};
const point = (profile: SketchProfile, id: string) => profile.points.find((entry) => entry.id === id)!;
const segment = (profile: SketchProfile, id: string) => profile.segments.find((entry) => entry.id === id)!;
const length = (profile: SketchProfile, id: string) => {
  const line = segment(profile, id);
  const start = point(profile, line.startId);
  const end = point(profile, line.endId);
  return Math.hypot(end.x - start.x, end.z - start.z);
};

describe("typed lengths and angles keep locked points (#629)", () => {
  it("keeps the asked-for end while neither or both ends are locked", () => {
    const line = segment(rough, "ba");
    expect(lockedLengthAnchor(line, rough.points, "b")).toBe("b");
    const both = setSketchPointsLocked(rough, ["a", "b"], true);
    expect(lockedLengthAnchor(line, both.points, "b")).toBe("b");
  });

  it("keeps the locked end of a line, even when the other end or the middle was asked for", () => {
    const locked = setSketchPointsLocked(rough, ["a"], true);
    const line = segment(locked, "ba");
    expect(lockedLengthAnchor(line, locked.points, "b")).toBe("a");
    expect(lockedLengthAnchor(line, locked.points, SEGMENT_DIMENSION_CENTER)).toBe("a");
  });

  it("turns the line whose far end is free", () => {
    const locked = setSketchPointsLocked(rough, ["a"], true);
    const corner = sketchCornerAt(locked, "b")!;
    const free = corner.after.far.id === "a" ? "before" : "after";
    expect(lockedCornerTurn(corner, "after")).toBe(free);
    expect(lockedCornerTurn(corner, "before")).toBe(free);
    expect(lockedCornerTurn(sketchCornerAt(rough, "b")!, "before")).toBe("before");
  });

  it("goes round the outline as pmarkham describes: lock a corner, type length and angle, lock the next", () => {
    let profile = setSketchPointsLocked(rough, ["a"], true);
    const typeLength = (id: string, value: number) => {
      const line = segment(profile, id);
      const next = { ...profile, points: applySegmentDimension(line, profile.points, value, lockedLengthAnchor(line, profile.points, line.startId)) };
      expect(changesLockedOutline(profile, next)).toBe(false);
      profile = next;
    };
    const typeAngle = (id: string, degrees: number) => {
      const corner = sketchCornerAt(profile, id)!;
      const next = { ...profile, points: applyCornerAngle(profile.points, corner, degrees, lockedCornerTurn(corner, "after")) };
      expect(changesLockedOutline(profile, next)).toBe(false);
      profile = next;
    };

    typeLength("ba", 59.5);
    profile = setSketchPointsLocked(profile, ["b"], true);
    typeAngle("b", 90);
    typeLength("bc", 41.5);
    profile = setSketchPointsLocked(profile, ["c"], true);
    typeAngle("c", 90);

    expect(point(profile, "a")).toMatchObject({ x: 0, z: 0 });
    expect(length(profile, "ba")).toBeCloseTo(59.5, 6);
    expect(length(profile, "bc")).toBeCloseTo(41.5, 6);
    expect(sketchCornerAt(profile, "b")!.degrees).toBeCloseTo(90, 6);
    expect(sketchCornerAt(profile, "c")!.degrees).toBeCloseTo(90, 6);
    // a, b and c are where they were locked; only d is still free.
    expect(length(profile, "cd")).toBeGreaterThan(0);
  });
});
