import { describe, expect, it } from "vitest";
import Module from "manifold-3d";
import { articulateSolid, automaticFoldJoints, flexiFoldBounds, flexiFoldKnuckleWidth, flexiFoldProfile, normalizeFlexiOptions } from "@/lib/flexiJoints";

type Solid = { delete?: () => void };

function dispose(values: Solid[]) {
  Array.from(new Set(values)).forEach((value) => value?.delete?.());
}

async function runtime() {
  const manifold = await Module();
  manifold.setup();
  return manifold;
}

describe("folding flexi links (Michael's mail, real Manifold kernel)", () => {
  it("cuts a flat bar into bands that keep the clearance and hold together", async () => {
    const kernel = await runtime();
    // 60 long along x, 5 high, 30 deep, standing on the plate.
    const bar = kernel.Manifold.cube([60, 5, 30], true).translate([0, 2.5, 0]);
    const result = articulateSolid(kernel, bar, normalizeFlexiOptions({ bend: "fold", joints: 3, clearance: 0.4 }));
    if ("error" in result) throw new Error(JSON.stringify(result.error));
    const { links, folds } = result;
    const created: Solid[] = [bar, ...links];
    try {
      expect(folds).toHaveLength(3);
      expect(links).toHaveLength(4);
      links.forEach((link) => {
        expect(link.status()).toBe("NoError");
        const pieces = link.decompose();
        expect(pieces).toHaveLength(1);
        dispose(pieces);
      });
      for (let first = 0; first < links.length; first += 1) {
        for (let second = first + 1; second < links.length; second += 1) {
          expect(links[first].minGap(links[second], 2)).toBeGreaterThan(0.25);
        }
      }
      const volume = links.reduce((sum, link) => sum + link.volume(), 0);
      expect(volume).toBeGreaterThan(0.85 * 60 * 5 * 30);
      folds.forEach((fold) => {
        expect(fold.bounds.length % 2).toBe(0);
        expect(fold.w).toBeCloseTo(2.5, 6);
        expect(fold.swing * 180 / Math.PI).toBeCloseTo(45, 6);
      });
    } finally {
      dispose(created);
    }
  });

  it("folds a band up and down about its hinge without it running into the next, and pulled away it holds", async () => {
    const kernel = await runtime();
    const bar = kernel.Manifold.cube([40, 5, 30], true).translate([0, 2.5, 0]);
    const result = articulateSolid(kernel, bar, normalizeFlexiOptions({ bend: "fold", joints: 1, clearance: 0.4, swing: 40 }));
    if ("error" in result) throw new Error(JSON.stringify(result.error));
    const [first, second] = result.links;
    const fold = result.folds[0];
    const created: Solid[] = [bar, first, second];
    try {
      // The hinge's axis runs along the depth (the joint frame's side is -z along x), at half the height.
      for (const degrees of [-38, -20, -5, 5, 20, 38]) {
        const turned = first.translate([-fold.u, -fold.w, 0]).rotate([0, 0, degrees]).translate([fold.u, fold.w, 0]);
        const overlap = turned.intersect(second);
        created.push(turned, overlap);
        expect(overlap.volume()).toBeLessThan(1e-3);
      }
      // Pulled apart along the bar, lifted, or slid along the hinge, the knuckles run into each other.
      for (const shift of [[-2, 0, 0], [0, 1.5, 0], [0, -1.5, 0], [0, 0, 1], [0, 0, -1]] as const) {
        const moved = first.translate([...shift]);
        const overlap = moved.intersect(second);
        created.push(moved, overlap);
        expect(overlap.volume()).toBeGreaterThan(0.05);
      }
    } finally {
      dispose(created);
    }
  });

  it("works in an egg lying flat, narrower towards its ends", async () => {
    const kernel = await runtime();
    const egg = kernel.Manifold.cylinder(5, 20, 20, 96).scale([1, 1.3, 1]).rotate([-90, 0, 0]);
    const result = articulateSolid(kernel, egg, normalizeFlexiOptions({ bend: "fold", axis: "Y" }));
    if ("error" in result) throw new Error(JSON.stringify(result.error));
    try {
      expect(result.links.length).toBeGreaterThan(2);
      for (let first = 0; first < result.links.length; first += 1) {
        for (let second = first + 1; second < result.links.length; second += 1) {
          expect(result.links[first].minGap(result.links[second], 2)).toBeGreaterThan(0.25);
        }
      }
    } finally {
      dispose([egg, ...result.links]);
    }
  });

  it("says when the body is too low or too narrow for a folding hinge", async () => {
    const kernel = await runtime();
    const flat = kernel.Manifold.cube([60, 2.5, 30], true).translate([0, 1.25, 0]);
    const narrow = kernel.Manifold.cube([60, 5, 6], true).translate([0, 2.5, 0]);
    try {
      const low = articulateSolid(kernel, flat, normalizeFlexiOptions({ bend: "fold", joints: 2 }));
      expect("error" in low && low.error).toMatchObject({ code: "tooFlat", joint: 1 });
      const thin = articulateSolid(kernel, narrow, normalizeFlexiOptions({ bend: "fold", joints: 2 }));
      expect("error" in thin && thin.error).toMatchObject({ code: "tooThin", joint: 1 });
    } finally {
      dispose([flat, narrow]);
    }
  });

  it("measures the hinge from the height and spreads an odd number of knuckles across", () => {
    expect(flexiFoldProfile(3, 0.4)).toBeNull();
    const profile = flexiFoldProfile(5, 0.4)!;
    // The socket keeps a wall to the knuckle's flat top and foot.
    expect(profile.pin + 0.4 * Math.SQRT2).toBeLessThanOrEqual(2.5 - 0.5 + 1e-9);
    const width = flexiFoldKnuckleWidth(profile.reach, 0.4);
    const bounds = flexiFoldBounds(-15, 15, width)!;
    expect(bounds.length % 2).toBe(0);
    expect(bounds.length + 1).toBeLessThanOrEqual(5);
    expect(flexiFoldBounds(-4, 4, width)).toBeNull();
    expect(automaticFoldJoints(55)).toBe(4);
    expect(normalizeFlexiOptions({ bend: "fold" })).toMatchObject({ bend: "fold", swing: 45 });
    expect(normalizeFlexiOptions({ bend: "fold", swing: 120 }).swing).toBe(90);
  });
});
