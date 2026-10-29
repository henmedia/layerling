import { describe, expect, it } from "vitest";
import Module from "manifold-3d";
import { articulateSolid, automaticFlexiJoints, normalizeFlexiOptions } from "@/lib/flexiJoints";

type Solid = { delete?: () => void };

function dispose(values: Solid[]) {
  Array.from(new Set(values)).forEach((value) => value?.delete?.());
}

async function runtime() {
  const manifold = await Module();
  manifold.setup();
  return manifold;
}

describe("flexi joints (real Manifold kernel)", () => {
  it("cuts a flat bar into links that keep the clearance from one another and hold together", async () => {
    const kernel = await runtime();
    // 100 long along x, 8 high (the scene's y is up), 20 deep, standing on the plate.
    const bar = kernel.Manifold.cube([100, 8, 20], true).translate([0, 4, 0]);
    const result = articulateSolid(kernel, bar, normalizeFlexiOptions({ joints: 4, clearance: 0.4, swing: 30 }));
    if ("error" in result) throw new Error(JSON.stringify(result.error));
    const { links, plans } = result;
    try {
      expect(plans).toHaveLength(4);
      expect(links).toHaveLength(5);
      links.forEach((link) => expect(link.status()).toBe("NoError"));
      // Each link is one piece, and the links are in order along the bar.
      links.forEach((link) => {
        const pieces = link.decompose();
        expect(pieces).toHaveLength(1);
        dispose(pieces);
      });
      const centres = links.map((link) => {
        const box = link.boundingBox();
        return (box.min[0] + box.max[0]) / 2;
      });
      expect([...centres].sort((a, b) => a - b)).toEqual(centres);
      // No two links touch: the clearance (less a little for the faceted cones) stays between every two.
      for (let first = 0; first < links.length; first += 1) {
        for (let second = first + 1; second < links.length; second += 1) {
          expect(links[first].minGap(links[second], 2)).toBeGreaterThan(0.3);
        }
      }
      // A knuckle reaches past the cut into the next link: pulled along the axis, the links hold.
      plans.forEach((plan, index) => {
        expect(links[index].boundingBox().max[0]).toBeGreaterThan(plan.u + plan.knuckle - 0.01);
      });
      const volume = links.reduce((sum, link) => sum + link.volume(), 0);
      expect(volume).toBeLessThan(100 * 8 * 20);
      expect(volume).toBeGreaterThan(0.85 * 100 * 8 * 20);
      // Every overhang is 45 degrees or steeper, the joints print without support.
      plans.forEach((plan) => {
        expect(plan.bulge).toBeLessThanOrEqual(plan.knuckle);
        expect(plan.swing * 180 / Math.PI).toBeCloseTo(30, 5);
      });
    } finally {
      dispose([bar, ...links]);
    }
  });

  it("turns a link by the swing angle without it running into its neighbour", async () => {
    const kernel = await runtime();
    const bar = kernel.Manifold.cube([60, 8, 20], true).translate([0, 4, 0]);
    const result = articulateSolid(kernel, bar, normalizeFlexiOptions({ joints: 1, clearance: 0.4, swing: 25 }));
    if ("error" in result) throw new Error(JSON.stringify(result.error));
    const [first, second] = result.links;
    const plan = result.plans[0];
    const created: Solid[] = [bar, first, second];
    try {
      for (const degrees of [-24, -12, 12, 24]) {
        // About the knuckle's upright axis: the scene's y through the pivot. Along x the joint frame's side is -z.
        const turned = first.translate([-plan.u, 0, plan.v]).rotate([0, degrees, 0]).translate([plan.u, 0, -plan.v]);
        created.push(turned);
        const overlap = turned.intersect(second);
        created.push(overlap);
        expect(overlap.volume()).toBeLessThan(1e-3);
      }
      // Pulled apart along the axis, or lifted off its neighbour, the knuckle runs into the socket.
      for (const shift of [[-3, 0, 0], [0, 1, 0], [0, -1, 0]] as const) {
        const moved = first.translate([...shift]);
        const overlap = moved.intersect(second);
        created.push(moved, overlap);
        expect(overlap.volume()).toBeGreaterThan(0.5);
      }
    } finally {
      dispose(created);
    }
  });

  it("says which joint does not fit in a body too narrow or too flat", async () => {
    const kernel = await runtime();
    const narrow = kernel.Manifold.cube([80, 8, 5], true).translate([0, 4, 0]);
    const flat = kernel.Manifold.cube([80, 1.2, 20], true).translate([0, 0.6, 0]);
    try {
      const thin = articulateSolid(kernel, narrow, normalizeFlexiOptions({ joints: 2 }));
      expect("error" in thin && thin.error).toMatchObject({ code: "tooThin", joint: 1 });
      const low = articulateSolid(kernel, flat, normalizeFlexiOptions({ joints: 2 }));
      expect("error" in low && low.error).toMatchObject({ code: "tooFlat", joint: 1 });
    } finally {
      dispose([narrow, flat]);
    }
  });

  it("fits the joints into a body that narrows towards its ends", async () => {
    const kernel = await runtime();
    // An ellipse 80 long and 20 wide, 8 high, lying on the plate.
    const fish = kernel.Manifold.cylinder(8, 10, 10, 96).scale([4, 1, 1]).rotate([-90, 0, 0]);
    const result = articulateSolid(kernel, fish, normalizeFlexiOptions({}));
    if ("error" in result) throw new Error(JSON.stringify(result.error));
    try {
      expect(result.links.length).toBeGreaterThan(2);
      for (let first = 0; first < result.links.length; first += 1) {
        for (let second = first + 1; second < result.links.length; second += 1) {
          expect(result.links[first].minGap(result.links[second], 2)).toBeGreaterThan(0.3);
        }
      }
    } finally {
      dispose([fish, ...result.links]);
    }
  });

  it("makes as many joints as the panel suggests for bars of usual sizes", async () => {
    const kernel = await runtime();
    for (const [length, width, height] of [[90, 18, 7], [60, 12, 6], [150, 25, 10], [120, 40, 8]]) {
      const bar = kernel.Manifold.cube([length, height, width], true).translate([0, height / 2, 0]);
      const joints = automaticFlexiJoints(length, width);
      const result = articulateSolid(kernel, bar, normalizeFlexiOptions({ joints }));
      try {
        if ("error" in result) throw new Error(`${length} x ${width}: ${JSON.stringify(result.error)}`);
        expect(result.links).toHaveLength(joints + 1);
      } finally {
        dispose([bar, ...("links" in result ? result.links : [])]);
      }
    }
  });

  it("follows the depth when the body is longer that way", async () => {
    const kernel = await runtime();
    const bar = kernel.Manifold.cube([20, 8, 90], true).translate([0, 4, 0]);
    const result = articulateSolid(kernel, bar, normalizeFlexiOptions({}));
    if ("error" in result) throw new Error(JSON.stringify(result.error));
    try {
      expect(result.links.length).toBeGreaterThan(2);
      const spans = result.links.map((link) => link.boundingBox());
      spans.forEach((box) => expect(box.max[2] - box.min[2]).toBeLessThan(60));
    } finally {
      dispose([bar, ...result.links]);
    }
  });
});
