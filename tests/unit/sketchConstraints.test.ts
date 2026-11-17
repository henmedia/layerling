import { describe, expect, it } from "vitest";
import { applySketchConstraints, validSketchConstraints, withSketchConstraint } from "@/lib/sketchConstraints";
import { sketchPrimitiveGeometry } from "@/lib/sketchPrimitives";
import { cloneSketchProfile } from "@/lib/sketchSmoothHandles";
import type { SketchProfile } from "@/types/layerling";

const initial = (): SketchProfile => ({
  points: [
    { id: "edge", x: 0, z: 0 },
    { id: "hole", x: 5, z: 8 },
    { id: "bottom", x: 10, z: 0 },
  ],
  segments: [{ id: "base", startId: "edge", endId: "bottom" }],
});

function coordinates(profile: SketchProfile, id: string) {
  const point = profile.points.find((entry) => entry.id === id);
  if (!point) throw Error(`Missing ${id}`);
  return point;
}

describe("persistent sketch constraints", () => {
  it("keeps a hole sketch reference 5 mm from an edge when the edge moves", () => {
    const sketch = withSketchConstraint(initial(), { id: "gap", kind: "offset-x", a: "edge", b: "hole", value: 5 });
    const moved = {
      ...sketch,
      points: sketch.points.map((p) => p.id === "edge" ? { ...p, x: 15 } : p),
    };
    const solved = applySketchConstraints(moved, new Set(["edge"]));
    expect(solved.ok).toBe(true);
    if (solved.ok) {
      expect(coordinates(solved.profile, "edge").x).toBe(15);
      expect(coordinates(solved.profile, "hole").x).toBeCloseTo(20, 5);
      expect(solved.profile.constraints).toHaveLength(1);
    }
  });

  it("keeps line horizontal when its first endpoint is dragged", () => {
    const sketch = withSketchConstraint(initial(), { id: "h", kind: "horizontal", a: "edge", b: "bottom" });
    const moved = { ...sketch, points: sketch.points.map((p) => p.id === "edge" ? { ...p, z: 7 } : p) };
    const solved = applySketchConstraints(moved, new Set(["edge"]));
    expect(solved.ok).toBe(true);
    if (solved.ok) expect(coordinates(solved.profile, "bottom").z).toBeCloseTo(7);
  });

  it("can hold a dimensional length and a horizontal rule together", () => {
    const sketch = withSketchConstraint(withSketchConstraint(initial(),
      { id: "h", kind: "horizontal", a: "edge", b: "bottom" }),
      { id: "len", kind: "distance", a: "edge", b: "bottom", value: 25 });
    const solved = applySketchConstraints(sketch);
    expect(solved.ok).toBe(true);
    if (solved.ok) {
      expect(coordinates(solved.profile, "bottom").x).toBeCloseTo(25, 5);
      expect(coordinates(solved.profile, "bottom").z).toBeCloseTo(0, 5);
    }
  });

  it("moves Bezier handles along with a constrained endpoint", () => {
    const sketch = withSketchConstraint(initial(), { id: "h", kind: "horizontal", a: "edge", b: "bottom" });
    sketch.points[2].handleOut = { x: 12, z: 5 };
    sketch.points[0].z = 4;
    const solved = applySketchConstraints(sketch, new Set(["edge"]));
    expect(solved.ok).toBe(true);
    if (solved.ok) expect(coordinates(solved.profile, "bottom").handleOut).toEqual({ x: 12, z: 9 });
  });

  it("rejects an impossible constraint involving two locked points", () => {
    const sketch = withSketchConstraint(initial(), { id: "h", kind: "horizontal", a: "edge", b: "hole" });
    sketch.points[0].locked = true;
    sketch.points[1].locked = true;
    expect(applySketchConstraints(sketch).ok).toBe(false);
  });

  it("removes orphaned references and preserves valid constraints on cloning", () => {
    const sketch = withSketchConstraint(initial(), { id: "h", kind: "horizontal", a: "edge", b: "bottom" });
    const copied = cloneSketchProfile(sketch);
    expect(copied.constraints).toEqual(sketch.constraints);
    expect(copied.constraints).not.toBe(sketch.constraints);
    expect(validSketchConstraints({ ...copied, points: copied.points.filter((p) => p.id !== "bottom") })).toEqual([]);
  });

  it("rejects contradictory dimensions instead of saving broken geometry", () => {
    const sketch = withSketchConstraint(withSketchConstraint(initial(),
      { id: "one", kind: "offset-x", a: "edge", b: "hole", value: 5 }),
      { id: "two", kind: "offset-x", a: "edge", b: "hole", value: 10 });
    expect(applySketchConstraints(sketch).ok).toBe(false);
  });
});

it("solves a dimension along the original sketch axes after rotation", () => {
  const sketch = withSketchConstraint(initial(), {
    id: "gap", kind: "offset-x", a: "edge", b: "hole", value: 5,
    frameX: { x: 0, z: 1 }, // original X now points along world Z
  });
  sketch.points[0].z = 9;
  const solved = applySketchConstraints(sketch, new Set(["edge"]));
  expect(solved.ok).toBe(true);
  if (solved.ok) expect(coordinates(solved.profile, "hole").z).toBeCloseTo(14);
});

describe("relationships between two lines", () => {
  const corner = (): SketchProfile => ({
    ...initial(),
    segments: [...initial().segments, { id: "side", startId: "bottom", endId: "hole" }],
  });

  it("squares a shared corner without moving the reference line or changing the second line's length", () => {
    const sketch = withSketchConstraint(corner(), {
      id: "corner", kind: "perpendicular", a: "edge", b: "bottom", c: "bottom", d: "hole",
    });
    const solved = applySketchConstraints(sketch);
    expect(solved.ok).toBe(true);
    expect(coordinates(solved.profile, "edge")).toEqual(coordinates(sketch, "edge"));
    expect(coordinates(solved.profile, "bottom")).toEqual(coordinates(sketch, "bottom"));
    expect(coordinates(solved.profile, "hole").x).toBeCloseTo(10, 5);
    expect(coordinates(solved.profile, "hole").z).toBeCloseTo(Math.hypot(5, 8), 5);
  });

  it("keeps opposite edges parallel when a reference endpoint moves", () => {
    const sketch = corner();
    sketch.points.push({ id: "top-left", x: 0, z: 10 });
    sketch.segments.push({ id: "top", startId: "hole", endId: "top-left" });
    const constrained = withSketchConstraint(sketch, {
      id: "opposite", kind: "parallel", a: "edge", b: "bottom", c: "hole", d: "top-left",
    });
    const added = applySketchConstraints(constrained);
    expect(added.ok).toBe(true);
    const moved = structuredClone(added.profile);
    coordinates(moved, "edge").z = -4;
    const solved = applySketchConstraints(moved, new Set(["edge"]));
    expect(solved.ok).toBe(true);
    expect(coordinates(solved.profile, "edge").z).toBe(-4);
    const [a, b, c, d] = ["edge", "bottom", "hole", "top-left"].map((id) => coordinates(solved.profile, id));
    const angle = (start: typeof a, end: typeof a) => Math.atan2(end.z - start.z, end.x - start.x);
    expect(Math.sin(angle(a, b) - angle(c, d))).toBeCloseTo(0, 4);
  });

  it("levels the opposite edge of a sketch with an existing vertical length", () => {
    const sketch: SketchProfile = {
      points: [
        { id: "a", x: 0, z: 0 }, { id: "b", x: 100, z: 0 },
        { id: "c", x: 100, z: 40 }, { id: "d", x: 0, z: 43 },
      ],
      segments: [
        { id: "top", startId: "a", endId: "b" },
        { id: "right", startId: "b", endId: "c" },
        { id: "bottom", startId: "c", endId: "d" },
        { id: "left", startId: "d", endId: "a" },
      ],
      constraints: [
        { id: "level", kind: "horizontal", a: "a", b: "b" },
        { id: "upright", kind: "vertical", a: "b", b: "c" },
        { id: "height", kind: "distance", a: "b", b: "c", value: 40 },
        { id: "opposite", kind: "parallel", a: "a", b: "b", c: "c", d: "d" },
      ],
    };
    const solved = applySketchConstraints(sketch);
    expect(solved.ok).toBe(true);
    expect(coordinates(solved.profile, "d").z).toBeCloseTo(40, 3);
    expect(coordinates(solved.profile, "c").x).toBeCloseTo(100, 5);
    expect(coordinates(solved.profile, "c").z).toBeCloseTo(40, 4);
  });

  it("drops the relationship when a line is deleted", () => {
    const sketch = withSketchConstraint(corner(), {
      id: "corner", kind: "perpendicular", a: "edge", b: "bottom", c: "bottom", d: "hole",
    });
    expect(validSketchConstraints({ ...sketch, segments: initial().segments })).toEqual([]);
  });
});

it("updates the existing length on a constrained edge without adding a conflicting rule", () => {
  const sketch = withSketchConstraint(initial(), { id: "horizontal", kind: "horizontal", a: "edge", b: "bottom" });
  const original = withSketchConstraint(sketch, { id: "length", kind: "distance", a: "edge", b: "bottom", value: 10 });
  const updated = withSketchConstraint(original, { id: "new", kind: "distance", a: "bottom", b: "edge", value: 42 });
  const solved = applySketchConstraints(updated);
  expect(solved.ok).toBe(true);
  expect(solved.profile.constraints).toEqual([
    { id: "horizontal", kind: "horizontal", a: "edge", b: "bottom" },
    { id: "length", kind: "distance", a: "edge", b: "bottom", value: 42 },
  ]);
  expect(coordinates(solved.profile, "edge")).toEqual({ id: "edge", x: 0, z: 0 });
  expect(coordinates(solved.profile, "bottom")).toEqual({ id: "bottom", x: 42, z: 0 });
});

it("matches parallel edges and keeps them equal when one gets a new length", () => {
  const sketch: SketchProfile = {
    points: [
      { id: "a", x: 0, z: 0 }, { id: "b", x: 12, z: 0 },
      { id: "c", x: 2, z: 8 }, { id: "d", x: 10, z: 8 },
    ],
    segments: [
      { id: "top", startId: "a", endId: "b" },
      { id: "bottom", startId: "d", endId: "c" },
    ],
    constraints: [
      { id: "horizontal", kind: "horizontal", a: "a", b: "b" },
      { id: "parallel", kind: "parallel", a: "a", b: "b", c: "d", d: "c" },
      { id: "equal", kind: "equal-length", a: "a", b: "b", c: "d", d: "c" },
    ],
  };
  const matched = applySketchConstraints(sketch);
  expect(matched.ok).toBe(true);
  expect(matched.profile.points.map(({ x, z }) => [x, z])).toEqual([[0, 0], [12, 0], [0, 8], [12, 8]]);
  const resized = applySketchConstraints(withSketchConstraint(matched.profile, {
    id: "length", kind: "distance", a: "d", b: "c", value: 18,
  }));
  expect(resized.ok).toBe(true);
  for (const { startId, endId } of sketch.segments) {
    const start = coordinates(resized.profile, startId);
    const end = coordinates(resized.profile, endId);
    expect(Math.abs(end.x - start.x)).toBeCloseTo(18, 4);
    expect(end.z).toBeCloseTo(start.z, 4);
  }
});

it("sets an obtuse corner angle, keeps it during a drag, and edits the same rule", () => {
  const sketch: SketchProfile = {
    points: [
      { id: "corner", x: 0, z: 0, locked: true },
      { id: "reference", x: 0, z: 55 },
      { id: "end", x: 20, z: 0 },
    ],
    segments: [
      { id: "left", startId: "reference", endId: "corner" },
      { id: "top", startId: "corner", endId: "end" },
    ],
    constraints: [
      { id: "vertical", kind: "vertical", a: "corner", b: "reference" },
      { id: "length", kind: "distance", a: "corner", b: "reference", value: 55 },
    ],
  };
  const rule = { id: "angle", kind: "angle" as const, a: "corner", b: "reference", c: "corner", d: "end", value: 105 };
  const angleOf = (profile: SketchProfile) => {
    const { x, z } = coordinates(profile, "end");
    return Math.atan2(x, z) * 180 / Math.PI;
  };
  const applied = applySketchConstraints(withSketchConstraint(sketch, rule));
  expect(applied.ok).toBe(true);
  expect(angleOf(applied.profile)).toBeCloseTo(105, 5);
  expect(coordinates(applied.profile, "reference").z).toBe(55);

  const dragged = structuredClone(applied.profile);
  coordinates(dragged, "end").x *= 1.2;
  coordinates(dragged, "end").z *= 1.2;
  const moved = applySketchConstraints(dragged, new Set(["end"]));
  expect(moved.ok).toBe(true);
  expect(angleOf(moved.profile)).toBeCloseTo(105, 5);

  const incompatible = structuredClone(moved.profile);
  coordinates(incompatible, "end").z += 2;
  expect(applySketchConstraints(incompatible, new Set(["end"])).ok).toBe(false);

  const freeReference = { ...incompatible, constraints: [rule] };
  const followed = applySketchConstraints(freeReference, new Set(["end"]));
  expect(followed.ok).toBe(true);
  const reference = coordinates(followed.profile, "reference");
  expect(angleOf(followed.profile) - Math.atan2(reference.x, reference.z) * 180 / Math.PI).toBeCloseTo(105, 5);

  const updated = withSketchConstraint(moved.profile, { ...rule, id: "new", b: "end", d: "reference", value: 70 });
  expect(updated.constraints?.filter((entry) => entry.kind === "angle")).toEqual([{ ...rule, value: 70 }]);
  const edited = applySketchConstraints(updated);
  expect(edited.ok).toBe(true);
  expect(angleOf(edited.profile)).toBeCloseTo(70, 5);
});

describe("driving sketch distances", () => {
  it("sets a perpendicular offset beyond the end of a construction line", () => {
    const sketch = initial();
    sketch.segments[0].construction = true;
    coordinates(sketch, "hole").x = 14;
    const rule = { id: "gap", kind: "point-line-distance" as const, a: "edge", b: "bottom", c: "hole", value: 2 };
    const solved = applySketchConstraints(withSketchConstraint(sketch, rule));
    expect(solved.ok).toBe(true);
    expect(coordinates(solved.profile, "hole")).toMatchObject({ x: 14, z: 2 });
    const moved = structuredClone(solved.profile);
    for (const id of ["edge", "bottom"]) coordinates(moved, id).z = 3;
    const followed = applySketchConstraints(moved, new Set(["edge", "bottom"]));
    expect(followed.ok).toBe(true);
    expect(coordinates(followed.profile, "hole")).toMatchObject({ x: 14, z: 5 });
  });

  it("keeps disjoint lines parallel and spaced when the reference moves", () => {
    const sketch = initial();
    sketch.points.push({ id: "far", x: 10, z: 12 });
    sketch.segments.push({ id: "second", startId: "far", endId: "hole" });
    const rule = { id: "gap", kind: "line-distance" as const, a: "edge", b: "bottom", c: "far", d: "hole", value: 4 };
    const solved = applySketchConstraints(withSketchConstraint(sketch, rule));
    expect(solved.ok).toBe(true);
    expect(coordinates(solved.profile, "edge").z).toBe(0);
    for (const id of ["far", "hole"]) expect(coordinates(solved.profile, id).z).toBeCloseTo(4, 5);
    const moved = structuredClone(solved.profile);
    for (const id of ["edge", "bottom"]) coordinates(moved, id).z = 6;
    const followed = applySketchConstraints(moved, new Set(["edge", "bottom"]));
    expect(followed.ok).toBe(true);
    for (const id of ["far", "hole"]) expect(coordinates(followed.profile, id).z).toBeCloseTo(10, 5);
  });
});

it("sets outline clearance by moving a 20 mm circle and its curve handles together", () => {
  let nextId = 0;
  const circle = sketchPrimitiveGeometry("circle", { x: 0, z: 0 }, () => `circle-${++nextId}`, 20);
  const sketch: SketchProfile = {
    points: [...circle.points, { id: "a", x: 30, z: -40 }, { id: "b", x: 30, z: 40 }],
    segments: [...circle.segments, { id: "guide", startId: "a", endId: "b", construction: true }],
  };
  const rule = { id: "gap", kind: "outline-line-distance" as const, a: "a", b: "b",
    outline: circle.points.map((point) => point.id), side: 1 as const, value: 2 };
  const applied = applySketchConstraints(withSketchConstraint(sketch, rule));
  expect(applied.ok).toBe(true);
  for (const point of circle.points) {
    const moved = coordinates(applied.profile, point.id);
    expect(moved.x).toBeCloseTo(point.x + 18, 6);
    expect(moved.z).toBe(point.z);
    expect(moved.handleIn?.x).toBeCloseTo(point.handleIn!.x + 18, 6);
    expect(moved.handleOut?.x).toBeCloseTo(point.handleOut!.x + 18, 6);
  }
  const movedLine = structuredClone(applied.profile);
  coordinates(movedLine, "a").x += 5;
  coordinates(movedLine, "b").x += 5;
  const followed = applySketchConstraints(movedLine, new Set(["a", "b"]));
  expect(followed.ok).toBe(true);
  expect(coordinates(followed.profile, circle.points[0].id).x).toBeCloseTo(circle.points[0].x + 23, 6);

  const edited = withSketchConstraint(followed.profile, { ...rule, id: "new", value: 0 });
  expect(edited.constraints).toEqual([{ ...rule, value: 0 }]);
  const tangent = applySketchConstraints(edited);
  expect(tangent.ok).toBe(true);
  expect(Math.max(...tangent.profile.points.filter((point) => rule.outline.includes(point.id)).map((point) => point.x))).toBeCloseTo(35, 6);
});

it.each(["center", "clearance"] as const)("resizes a circle while preserving its %s dimension", (mode) => {
  let nextId = 0;
  const circle = sketchPrimitiveGeometry("circle", { x: 0, z: 0 }, () => `hole-${++nextId}`, 20);
  const outline = circle.points.map((point) => point.id);
  const sketch: SketchProfile = {
    points: [...circle.points, { id: "a", x: 30, z: -40, locked: true }, { id: "b", x: 30, z: 40, locked: true }],
    segments: [...circle.segments, { id: "guide", startId: "a", endId: "b", construction: true }],
  };
  const size = { id: "size", kind: "circle-diameter" as const, a: outline[0], b: outline[1], outline, value: 3 };
  const gap = mode === "center"
    ? { id: "gap", kind: "circle-center-distance" as const, a: "a", b: "b", outline, value: 8 }
    : { id: "gap", kind: "outline-line-distance" as const, a: "a", b: "b", outline, side: 1 as const, value: 2 };
  const initial = applySketchConstraints(withSketchConstraint(withSketchConstraint(sketch, gap), size));
  expect(initial.ok).toBe(true);
  const resized = applySketchConstraints(withSketchConstraint(initial.profile, { ...size, id: "edit", value: 4 }));
  expect(resized.ok).toBe(true);
  const hole = resized.profile.points.filter((point) => outline.includes(point.id));
  expect(Math.max(...hole.map((point) => point.x)) - Math.min(...hole.map((point) => point.x))).toBeCloseTo(4, 5);
  if (mode === "center") {
    expect(hole.reduce((sum, point) => sum + point.x / 4, 0)).toBeCloseTo(22, 5);
  } else {
    expect(Math.max(...hole.map((point) => point.x))).toBeCloseTo(28, 5);
  }
  expect(resized.profile.constraints).toHaveLength(2);
});
