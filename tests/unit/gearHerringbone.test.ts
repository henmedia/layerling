import { describe, expect, it } from "vitest";
import { cadModifierHelicalGearForShape } from "@/lib/cadProfileExtrusion";
import { createGearGeometry, gearTypeHasHelix, normalizeGearType } from "@/lib/gearGeometry";
import { importLylProject, exportLylProject } from "@/lib/lylProject";
import { editorHistoryEntry } from "@/lib/editorHistory";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { canonicalizeShape } from "@/lib/workplaneShapes";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";

/*
 * A herringbone gear (#265): two helical halves turning opposite ways. It centres itself on its
 * shaft and has no axial thrust, which is why it suits 3D printing.
 */

type Position = { count: number; getX: (index: number) => number; getY: (index: number) => number; getZ: (index: number) => number };

function edgeUseCounts(position: Position) {
  const uses = new Map<string, number>();
  const key = (index: number) => [position.getX(index), position.getY(index), position.getZ(index)].map((value) => value.toFixed(5)).join(",");
  for (let index = 0; index + 2 < position.count; index += 3) {
    const corners = [key(index), key(index + 1), key(index + 2)];
    for (let edge = 0; edge < 3; edge += 1) {
      const a = corners[edge];
      const b = corners[(edge + 1) % 3];
      const id = a < b ? `${a}:${b}` : `${b}:${a}`;
      uses.set(id, (uses.get(id) ?? 0) + 1);
    }
  }
  return uses;
}

function signedVolume(position: Position) {
  let total = 0;
  for (let index = 0; index + 2 < position.count; index += 3) {
    const [ax, ay, az] = [position.getX(index), position.getY(index), position.getZ(index)];
    const [bx, by, bz] = [position.getX(index + 1), position.getY(index + 1), position.getZ(index + 1)];
    const [cx, cy, cz] = [position.getX(index + 2), position.getY(index + 2), position.getZ(index + 2)];
    total += (ax * (by * cz - bz * cy) + ay * (bz * cx - bx * cz) + az * (bx * cy - by * cx)) / 6;
  }
  return total;
}

const BASE = { width: 30, depth: 30, height: 10, teeth: 14, toothSize: 2.5, helixAngle: 20, helixQuality: 16 };

/** How far the teeth are turned at a ring of the given height: the circular mean of the tip corners, over all teeth. */
function toothTurnAt(position: Position, height: number) {
  let maxRadius = 0;
  for (let index = 0; index < position.count; index += 1) maxRadius = Math.max(maxRadius, Math.hypot(position.getX(index), position.getZ(index)));
  let sin = 0;
  let cos = 0;
  for (let index = 0; index < position.count; index += 1) {
    if (Math.abs(position.getY(index) - height) > 1e-6) continue;
    if (Math.hypot(position.getX(index), position.getZ(index)) < maxRadius - 0.01) continue;
    const angle = Math.atan2(position.getZ(index), position.getX(index)) * BASE.teeth;
    sin += Math.sin(angle);
    cos += Math.cos(angle);
  }
  return Math.atan2(sin, cos) / BASE.teeth;
}

/** The turn between two rings, taken the short way round one tooth. */
function turnBetween(position: Position, from: number, to: number) {
  const pitch = (2 * Math.PI) / BASE.teeth;
  const raw = toothTurnAt(position, to) - toothTurnAt(position, from);
  return ((raw + pitch / 2) % pitch + pitch) % pitch - pitch / 2;
}

describe("herringbone gear", () => {
  it("is a gear type with a helix angle, as the helical gear is", () => {
    expect(normalizeGearType("herringbone")).toBe("herringbone");
    expect(gearTypeHasHelix("herringbone")).toBe(true);
    expect(gearTypeHasHelix("helical")).toBe(true);
    expect(gearTypeHasHelix("spur")).toBe(false);
    expect(gearTypeHasHelix(undefined)).toBe(false);
  });

  it("is closed, faces outward and fills the requested bounds", () => {
    const geometry = createGearGeometry({ ...BASE, gearType: "herringbone" });
    const position = geometry.getAttribute("position") as unknown as Position;
    expect([...edgeUseCounts(position).values()].every((uses) => uses === 2)).toBe(true);
    expect(signedVolume(position)).toBeGreaterThan(0);
    expect(geometry.boundingBox?.min.y).toBeCloseTo(0, 5);
    expect(geometry.boundingBox?.max.y).toBeCloseTo(10, 5);
    expect((geometry.boundingBox?.max.x ?? 0) - (geometry.boundingBox?.min.x ?? 0)).toBeCloseTo(30, 3);
  });

  it("has a ring in the middle whatever the quality, so the teeth turn round exactly there", () => {
    for (const helixQuality of [4, 7, 12, 16]) {
      const geometry = createGearGeometry({ ...BASE, helixQuality, gearType: "herringbone" });
      const position = geometry.getAttribute("position") as unknown as Position;
      const heights = new Set<string>();
      for (let index = 0; index < position.count; index += 1) heights.add(position.getY(index).toFixed(4));
      expect(heights.has("5.0000")).toBe(true);
    }
  });

  it("turns its teeth one way up to the middle and back at the top: the ends line up, the middle is turned", () => {
    // A small angle, so the turn stays below half a tooth and can be told from a whole tooth more.
    const gentle = { ...BASE, helixAngle: 10 };
    const herringbone = createGearGeometry({ ...gentle, gearType: "herringbone" }).getAttribute("position") as unknown as Position;
    expect(turnBetween(herringbone, 0, 10)).toBeCloseTo(0, 4);
    const half = turnBetween(herringbone, 0, 5);
    expect(Math.abs(half)).toBeGreaterThan(0.01);
    // A helical gear of the same height turns twice as far over its whole height as each half does.
    const helical = createGearGeometry({ ...gentle, gearType: "helical" }).getAttribute("position") as unknown as Position;
    expect(turnBetween(helical, 0, 10)).toBeCloseTo(2 * half, 3);
  });

  it("turns the other way for a negative angle", () => {
    const positive = createGearGeometry({ ...BASE, helixAngle: 20, gearType: "herringbone" }).getAttribute("position") as unknown as Position;
    const negative = createGearGeometry({ ...BASE, helixAngle: -20, gearType: "herringbone" }).getAttribute("position") as unknown as Position;
    expect(turnBetween(positive, 0, 5) * turnBetween(negative, 0, 5)).toBeLessThan(0);
  });

  it("gets an exact part for the edge tool and STEP, as the helical gear does (#1007)", () => {
    const asset = toolbarShapeAssets.find((entry) => entry.kind === "gear")!;
    const gear = canonicalizeShape(makeShapeFromAsset(asset, { x: 0, z: 0 }, { gearType: "herringbone", teeth: 14, helixAngle: 20 }));
    expect(gear.gearType).toBe("herringbone");
    const part = cadModifierHelicalGearForShape(gear);
    // The twist of a helical gear of the whole height; the halves turn half of it each.
    expect(part?.herringbone).toBe(true);
    const helical = cadModifierHelicalGearForShape({ ...gear, gearType: "helical" })!;
    expect(part!.twist).toBeCloseTo(helical.twist, 12);
    expect(helical.herringbone).not.toBe(true);
    // On an oval footprint its corners do not turn as one ring, as the helical gear's do not.
    expect(cadModifierHelicalGearForShape({ ...gear, width: 30, depth: 18 })).toBeNull();
  });

  it("is kept in a saved project", async () => {
    const asset = toolbarShapeAssets.find((entry) => entry.kind === "gear")!;
    const shape = canonicalizeShape(makeShapeFromAsset(asset, { x: 0, z: 0 }, { gearType: "herringbone", teeth: 14, helixAngle: 20 }));
    const shapes = [shape];
    const bytes = await exportLylProject({
      projectId: "project-gear",
      projectName: "Pfeilrad",
      createdAt: 1_700_000_000_000,
      modifiedAt: 1_700_000_100_000,
      shapes,
      history: [editorHistoryEntry(shapes, [])],
      historyIndex: 0,
      assets: [],
      workspace: DEFAULT_WORKPLANE_WORKSPACE,
      snapGrid: DEFAULT_SNAP_GRID,
      placementElevation: 0,
    });
    const restored = await importLylProject(bytes);
    expect(restored.shapes[0].gearType).toBe("herringbone");
    expect(restored.shapes[0].helixAngle).toBe(20);
  });
});
