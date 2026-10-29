import { describe, expect, it } from "vitest";
import { sketchPrimitiveGeometry } from "@/lib/sketchPrimitives";
import { alignedSmoothHandles, withSegmentHandles, withSmoothHandlesAfterRemoval, withSmoothSketchHandles } from "@/lib/sketchSmoothHandles";
import { sketchProfileWithoutPoint } from "@/lib/sketchPointRemoval";
import type { SketchProfile } from "@/types/layerling";

let counter = 0;
const makeId = (prefix: string) => `${prefix}-${(counter += 1)}`;

describe("smooth sketch handles", () => {
  it("leaves a circle and a line alone when a smooth curve is added elsewhere", () => {
    const circle = sketchPrimitiveGeometry("circle", { x: 0, z: 0 }, makeId);
    const line: SketchProfile = {
      points: [
        { id: "l1", x: 50, z: 0, mode: "corner" },
        { id: "l2", x: 50, z: 30, mode: "corner" },
      ],
      segments: [{ id: "ls", startId: "l1", endId: "l2", kind: "line" }],
    };
    const smooth: SketchProfile = {
      points: [
        { id: "s1", x: -50, z: 0, mode: "smooth" },
        { id: "s2", x: -40, z: 20, mode: "smooth" },
        { id: "s3", x: -30, z: 0, mode: "smooth" },
      ],
      segments: [
        { id: "ss1", startId: "s1", endId: "s2", kind: "smooth" },
        { id: "ss2", startId: "s2", endId: "s3", kind: "smooth" },
      ],
    };
    const before: SketchProfile = {
      points: [...circle.points, ...line.points, ...smooth.points],
      segments: [...circle.segments, ...line.segments, ...smooth.segments],
    };
    const after = withSmoothSketchHandles(before);
    for (const point of [...circle.points, ...line.points]) {
      const next = after.points.find((entry) => entry.id === point.id);
      expect(next).toEqual(point);
    }
    const middle = after.points.find((entry) => entry.id === "s2");
    expect(middle?.handleIn).toBeDefined();
    expect(middle?.handleOut).toBeDefined();
    expect(middle!.handleIn!.x + middle!.handleOut!.x).toBeCloseTo(middle!.x * 2);
    expect(Math.abs(middle!.handleOut!.x - middle!.x)).toBeGreaterThan(0);
  });

  it("still smooths the curve that was drawn", () => {
    const profile: SketchProfile = {
      points: [
        { id: "a", x: 0, z: 0 },
        { id: "b", x: 10, z: 10 },
        { id: "c", x: 20, z: 0 },
      ],
      segments: [
        { id: "s1", startId: "a", endId: "b", kind: "smooth" },
        { id: "s2", startId: "b", endId: "c", kind: "smooth" },
      ],
    };
    const after = withSmoothSketchHandles(profile);
    expect(after.points.every((point) => point.mode === "smooth" && point.handleIn && point.handleOut)).toBe(true);
  });
});

describe("the point button 'smooth' (#171)", () => {
  const square = (): SketchProfile => {
    const points = [{ id: "a", x: 0, z: 0 }, { id: "b", x: 40, z: 0 }, { id: "c", x: 40, z: 40 }, { id: "d", x: 0, z: 40 }];
    return { points, segments: points.map((p, i) => ({ id: `s${i}`, kind: "line" as const, startId: p.id, endId: points[(i + 1) % 4].id })) };
  };

  it("gives the chosen point its handles even though its lines are not smooth curves yet", () => {
    const profile = square();
    const next = withSmoothSketchHandles(profile, new Set(["b"]));
    const b = next.points.find((point) => point.id === "b")!;
    expect(b.handleIn && b.handleOut).toBeTruthy();
    expect(b.mode).toBe("smooth");
    // The others keep what they had.
    expect(next.points.find((point) => point.id === "a")).toEqual(profile.points[0]);
  });

  it("gives the curved segments around it the handles they lack at their other ends", () => {
    const profile = square();
    profile.segments = profile.segments.map((segment) => ({ ...segment, kind: segment.startId === "b" || segment.endId === "b" ? "bezier" as const : "line" as const }));
    const next = withSegmentHandles(withSmoothSketchHandles(profile, new Set(["b"])), new Set(["s0", "s1"]));
    const byId = (id: string) => next.points.find((point) => point.id === id)!;
    // s0 runs a -> b and s1 b -> c: a needs its out handle, c its in handle.
    expect(byId("a").handleOut).toEqual({ x: 40 / 3, z: 0 });
    expect(byId("c").handleIn).toEqual({ x: 40, z: 40 - 40 / 3 });
    // A handle that is there is not replaced, and a line segment is left alone.
    expect(byId("b").handleOut).toBeDefined();
    expect(byId("d").handleIn).toBeUndefined();
  });
});

describe("a corner with two handles made smooth (#347)", () => {
  it("lines both handles up through the point, each keeping its length", () => {
    // A corner: the in handle up and to the left, the out handle straight to the right.
    const aligned = alignedSmoothHandles({ x: 0, z: 0, handleIn: { x: -3, z: 4 }, handleOut: { x: 10, z: 0 } });

    expect(aligned).not.toBeNull();
    const { handleIn, handleOut } = aligned!;
    expect(Math.hypot(handleIn.x, handleIn.z)).toBeCloseTo(5, 9);
    expect(Math.hypot(handleOut.x, handleOut.z)).toBeCloseTo(10, 9);
    // On one line through the point, on opposite sides.
    expect(handleIn.x * handleOut.z - handleIn.z * handleOut.x).toBeCloseTo(0, 9);
    expect(handleIn.x * handleOut.x + handleIn.z * handleOut.z).toBeLessThan(0);
    // Along the direction from the in handle to the out handle.
    const len = Math.hypot(13, -4);
    expect(handleOut.x / 10).toBeCloseTo(13 / len, 9);
    expect(handleOut.z / 10).toBeCloseTo(-4 / len, 9);
  });

  it("leaves a point without a usable direction to the editor's own smoothing", () => {
    expect(alignedSmoothHandles({ x: 0, z: 0, handleOut: { x: 1, z: 0 } })).toBeNull();
    expect(alignedSmoothHandles({ x: 1, z: 1, handleIn: { x: 1, z: 1 }, handleOut: { x: 2, z: 1 } })).toBeNull();
  });
});

describe("deleting a point of a smooth outline (forum, 621213)", () => {
  it("lays the handles of its two neighbours again and leaves every other point as it was", () => {
    const ids = ["a", "b", "c", "d", "e", "f"];
    const spots = [[0, 0], [20, -5], [40, 0], [45, 20], [20, 30], [-5, 20]];
    const drawn = withSmoothSketchHandles({
      points: ids.map((id, index) => ({ id, x: spots[index][0], z: spots[index][1], mode: "smooth" as const })),
      segments: ids.map((id, index) => ({ id: `s${index}`, startId: id, endId: ids[(index + 1) % ids.length], kind: "smooth" as const })),
    });
    // A handle dragged by hand, far from the point that goes.
    const dragged = { ...drawn, points: drawn.points.map((point) => point.id === "e" ? { ...point, handleIn: { x: 30, z: 40 }, handleOut: { x: 10, z: 20 } } : point) };
    const after = withSmoothHandlesAfterRemoval(dragged, sketchProfileWithoutPoint(dragged, "b"), "b");
    const of = (profile: SketchProfile, id: string) => profile.points.find((point) => point.id === id);
    for (const id of ["d", "e", "f"]) expect(of(after, id)).toEqual(of(dragged, id));
    expect(of(after, "a")?.handleOut).not.toEqual(of(dragged, "a")?.handleOut);
    expect(of(after, "c")?.handleIn).not.toEqual(of(dragged, "c")?.handleIn);
  });
});
