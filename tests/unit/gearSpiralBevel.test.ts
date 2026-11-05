import { describe, expect, it } from "vitest";
import { cadModifierProfileForShape } from "@/lib/cadProfileExtrusion";
import { bevelGearIsSpiral, createGearGeometry, normalizeBevelHelixAngle } from "@/lib/gearGeometry";
import { stepSourceForShape } from "@/lib/stepExport";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * A spiral bevel gear (Discussion #1299): a bevel gear whose teeth turn while they taper, for a part like the
 * tapered helical gear of an old radial arm saw. Its own helix angle, 0 by default, so a bevel gear saved before
 * keeps its straight teeth although every gear stores the helical gear's 22.5 degrees.
 */

type Position = { count: number; getX: (index: number) => number; getY: (index: number) => number; getZ: (index: number) => number };

const BASE = { width: 30, depth: 30, height: 10, teeth: 14, toothSize: 2.5, gearType: "bevel" as const, helixAngle: 22.5, helixQuality: 12 };

const position = (options: Partial<Parameters<typeof createGearGeometry>[0]>) =>
  createGearGeometry({ ...BASE, ...options }).getAttribute("position") as unknown as Position;

const heights = (points: Position) => new Set(Array.from({ length: points.count }, (_, index) => points.getY(index).toFixed(5)));

/** The corners at one height, rounded, sorted, as text: two rings drawn alike give the same text. */
function ringAt(points: Position, height: number) {
  const corners = new Set<string>();
  for (let index = 0; index < points.count; index += 1) {
    if (Math.abs(points.getY(index) - height) > 1e-6) continue;
    corners.add(`${points.getX(index).toFixed(4)},${points.getZ(index).toFixed(4)}`);
  }
  return [...corners].sort().join(" ");
}

function edgeUses(points: Position) {
  const uses = new Map<string, number>();
  const key = (index: number) => [points.getX(index), points.getY(index), points.getZ(index)].map((value) => value.toFixed(5)).join(",");
  for (let index = 0; index + 2 < points.count; index += 3) {
    const corners = [key(index), key(index + 1), key(index + 2)];
    for (let edge = 0; edge < 3; edge += 1) {
      const [a, b] = [corners[edge], corners[(edge + 1) % 3]];
      const id = a < b ? `${a}:${b}` : `${b}:${a}`;
      uses.set(id, (uses.get(id) ?? 0) + 1);
    }
  }
  return uses;
}

const gear = (extra: Partial<WorkplaneShape> = {}): WorkplaneShape => ({
  id: "g", name: "Gear", kind: "gear", color: "#888888", x: 0, z: 0, elevation: 0, rotation: 0,
  width: 30, depth: 30, size: 30, height: 10, teeth: 14, toothSize: 2.5, gearType: "bevel", helixAngle: 22.5, ...extra,
});

describe("spiral bevel gear (Discussion #1299)", () => {
  it("keeps a bevel gear straight without its own helix angle, whatever helix angle it stores", () => {
    expect(normalizeBevelHelixAngle(undefined)).toBe(0);
    expect(bevelGearIsSpiral(undefined)).toBe(false);
    expect(normalizeBevelHelixAngle(80)).toBe(45);
    expect(heights(position({})).size).toBe(2);
  });

  it("turns the teeth while they taper, in as many rings as the quality asks for", () => {
    const straight = position({});
    const spiral = position({ bevelHelixAngle: 25 });
    expect(heights(spiral).size).toBe(BASE.helixQuality);
    // The foot is the same; the top is turned, and as small as the straight bevel gear's.
    expect(ringAt(spiral, 0)).toBe(ringAt(straight, 0));
    expect(ringAt(spiral, BASE.height)).not.toBe(ringAt(straight, BASE.height));
    const reach = (points: Position) => Math.max(...Array.from({ length: points.count }, (_, index) => (Math.abs(points.getY(index) - BASE.height) < 1e-6 ? Math.hypot(points.getX(index), points.getZ(index)) : 0)));
    expect(reach(spiral)).toBeCloseTo(reach(straight), 3);
    // A closed body: every edge between two triangles.
    expect([...edgeUses(spiral).values()].every((uses) => uses === 2)).toBe(true);
  });

  it("stays a triangle mesh: no exact loft, no STEP body", () => {
    expect(cadModifierProfileForShape(gear())).not.toBeNull();
    expect(cadModifierProfileForShape(gear({ bevelHelixAngle: 25 }))).toBeNull();
    expect(stepSourceForShape(gear({ bevelHelixAngle: 25 }))).toBe("unsupported");
  });
});
