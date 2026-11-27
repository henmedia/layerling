import { describe, expect, it } from "vitest";
import { snapFitCatchBox, snapFitCatchFor, snapFitHookOutline, snapFitMesh, snapFitPlan, type SnapFitFields, type SnapFitPart } from "@/lib/snapFit";

/**
 * The snap-fit stays in its box (#2161): the undercut, the lead-in angle, the arm's thickness and the clearance are
 * limited to what the box's size leaves room for, not only to their own ranges, and the plan says which it limited.
 * The mesh and the exact body are built from the same plan.
 */
const TOLERANCE = 1e-5;
/** A new snap-fit from the shape library: 8 wide, 9 deep, 16 high, hook and catch. */
const NEW = { width: 8, depth: 9, height: 16, snapFitPart: "both" } as const;

/** The mesh's extent, x y z. */
function extent(positions: ArrayLike<number>) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) for (let a = 0; a < 3; a += 1) {
    min[a] = Math.min(min[a], positions[i + a]);
    max[a] = Math.max(max[a], positions[i + a]);
  }
  return { min, max };
}

/** Every point of the hook's and the catch's outlines (measured from the foot) within the box, and the mesh too. */
function expectInBox(fields: SnapFitFields) {
  const { mesh, plan } = snapFitMesh(fields);
  const depth = fields.depth ?? fields.width;
  const outlines = [...(plan.part !== "catch" ? [snapFitHookOutline(plan)] : []), ...(snapFitCatchFor(plan) ? [snapFitCatchFor(plan)!] : [])];
  for (const outline of outlines) for (const point of outline) {
    expect(point.u, JSON.stringify(fields)).toBeGreaterThanOrEqual(-depth / 2 - TOLERANCE);
    expect(point.u, JSON.stringify(fields)).toBeLessThanOrEqual(depth / 2 + TOLERANCE);
    expect(point.v, JSON.stringify(fields)).toBeGreaterThanOrEqual(-TOLERANCE);
    expect(point.v, JSON.stringify(fields)).toBeLessThanOrEqual(fields.height + TOLERANCE);
  }
  const { min, max } = extent(mesh.positions);
  expect(min[1]).toBeGreaterThanOrEqual(-TOLERANCE);
  expect(max[1]).toBeLessThanOrEqual(fields.height + TOLERANCE);
  expect(min[2]).toBeGreaterThanOrEqual(-depth / 2 - TOLERANCE);
  expect(max[2]).toBeLessThanOrEqual(depth / 2 + TOLERANCE);
  // The barb stands above the foot, on an arm, and the hook's parts keep their order.
  if (plan.part !== "catch") {
    expect(plan.armBack).toBeGreaterThanOrEqual(-depth / 2 - TOLERANCE);
    expect(plan.armFront).toBeGreaterThan(plan.armBack);
    expect(plan.barbTip).toBeGreaterThan(plan.armFront);
    expect(plan.holdY).toBeGreaterThan(plan.foot);
    expect(plan.slopeY).toBeLessThanOrEqual(fields.height + TOLERANCE);
  }
  return plan;
}

describe("the snap-fit in its box (#2161)", () => {
  it("keeps the default snap-fit as it was, nothing limited", () => {
    const plan = snapFitPlan(NEW);
    expect(plan).toMatchObject({ thickness: 1.6, undercut: 1, lead: 30, clearance: 0.2 });
    expect(plan.limited).toEqual({ thickness: false, undercut: false, lead: false, clearance: false });
  });

  it("undercut 3 at a lead-in of 10 degrees: the slope grows steeper, the barb stays in the box and the catch is kept", () => {
    const fields = { ...NEW, snapFitUndercut: 3, snapFitLeadAngle: 10 };
    const plan = expectInBox(fields);
    // The undercut is what holds: it stays, the slope goes no gentler than the box's height allows.
    expect(plan.undercut).toBe(3);
    expect(plan.lead).toBe(15);
    expect(plan.limited).toMatchObject({ lead: true, undercut: false, thickness: false });
    expect(plan.holdTipY).toBeGreaterThan(0);
    expect(snapFitCatchFor(plan)).not.toBeNull();
  });

  it("undercut 10: the arm stays in front of the box's back, the undercut as large as fits", () => {
    const fields = { ...NEW, snapFitUndercut: 10 };
    const plan = expectInBox(fields);
    // 9 deep, less the clearance and the arm's 1.6 mm: 7.2 mm of undercut.
    expect(plan.thickness).toBe(1.6);
    expect(plan.undercut).toBeCloseTo(7.2, 9);
    expect(plan.armBack).toBeCloseTo(-4.5, 9);
    expect(plan.limited).toMatchObject({ undercut: true, thickness: false });
    expect(snapFitCatchFor(plan)).not.toBeNull();
  });

  it("thickness 20: the arm as thick as the box's depth leaves room for, the undercut kept", () => {
    const fields = { ...NEW, snapFitThickness: 20 };
    const plan = expectInBox(fields);
    expect(plan.undercut).toBe(1);
    expect(plan.thickness).toBeCloseTo(9 - 0.2 - 1, 9);
    expect(plan.limited).toMatchObject({ thickness: true, undercut: false, lead: false });
    const { min, max } = extent(snapFitMesh(fields).mesh.positions);
    expect(max[2] - min[2]).toBeLessThanOrEqual(9 + TOLERANCE);
    expect(snapFitCatchFor(plan)).not.toBeNull();
  });

  it("gives the arm and the undercut half the depth each where both ask for more", () => {
    const plan = expectInBox({ ...NEW, snapFitThickness: 20, snapFitUndercut: 10, snapFitLeadAngle: 60 });
    expect(plan.thickness + plan.undercut).toBeLessThanOrEqual(9 - 0.2 + TOLERANCE);
    expect(plan.thickness).toBeGreaterThanOrEqual(4.3);
    expect(plan.limited.thickness && plan.limited.undercut).toBe(true);
  });

  it("limits the catch alone to its box", () => {
    const plan = expectInBox({ width: 8, depth: 1, height: 1.6, snapFitPart: "catch", snapFitUndercut: 5 });
    expect(plan.undercut).toBe(1);
    expect(plan.limited.undercut).toBe(true);
    // In the box the panel gives it, nothing is limited, a slanted holding face too.
    for (const [undercut, retain] of [[1, 90], [1.37, 45], [2.5, 30]]) {
      const own = snapFitPlan({ width: 8, ...snapFitCatchBox(undercut, retain), snapFitPart: "catch", snapFitUndercut: undercut, snapFitRetainAngle: retain });
      expect(own.undercut).toBe(undercut);
      expect(own.limited.undercut).toBe(false);
    }
  });

  it("keeps every part in the box and never drops the catch, across random sizes and values", () => {
    // A small random generator of its own, so a failure comes back the same.
    let seed = 2161;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    const between = (min: number, max: number) => min + random() * (max - min);
    const parts: SnapFitPart[] = ["both", "hook", "catch"];
    for (let i = 0; i < 3000; i += 1) {
      const part = parts[i % 3];
      // Mostly the sizes the panel offers, now and then a box smaller than the smallest hook.
      const tiny = random() < 0.1;
      const fields: SnapFitFields = {
        width: between(0.5, 40),
        depth: tiny ? between(0.5, 2) : between(1, 60),
        height: tiny ? between(1, 3) : between(3, 80),
        snapFitPart: part,
        snapFitThickness: between(0.4, 20),
        snapFitUndercut: between(0.2, 10),
        snapFitLeadAngle: between(10, 60),
        snapFitRetainAngle: between(30, 90),
        snapFitClearance: between(0, 2),
        snapFitFoot: between(0, 30),
      };
      const plan = expectInBox(fields);
      if (part === "both") expect(snapFitCatchFor(plan), JSON.stringify(fields)).not.toBeNull();
      expect(plan.undercut).toBeGreaterThan(0);
      expect(plan.thickness).toBeGreaterThan(0);
      expect(plan.lead).toBeGreaterThanOrEqual(10);
      expect(plan.lead).toBeLessThanOrEqual(60);
      // What was asked for and fits is kept; what is limited is said.
      expect(plan.limited.undercut).toBe(plan.undercut < fields.snapFitUndercut! - 1e-6);
      if (part !== "catch") {
        expect(plan.limited.thickness).toBe(plan.thickness < fields.snapFitThickness! - 1e-6);
        expect(plan.limited.lead).toBe(plan.lead > fields.snapFitLeadAngle! + 1e-6);
      }
      expect(Number.isFinite(plan.strain)).toBe(true);
    }
  });
});
