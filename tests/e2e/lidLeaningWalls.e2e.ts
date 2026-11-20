import { describe, expect, it } from "vitest";
import Module from "manifold-3d";
import { lidForSolid, normalizeLidOptions } from "@/lib/lidTool";

type Solid = { delete?: () => void };

async function runtime() {
  const manifold = await Module();
  manifold.setup();
  return manifold;
}

type Kernel = Awaited<ReturnType<typeof runtime>>;
type Body = ReturnType<Kernel["Manifold"]["cube"]>;

/** A round pot 30 high with a 2 mm wall and floor, open at the top: `foot` and `rim` are its outer radii at either end. */
function pot(kernel: Kernel, foot: number, rim: number, created: Solid[]) {
  const outer = kernel.Manifold.cylinder(30, foot, rim, 96).rotate([-90, 0, 0]);
  const inner = kernel.Manifold.cylinder(30, foot - 2, rim - 2, 96).rotate([-90, 0, 0]).translate([0, 2, 0]);
  const body = outer.subtract(inner);
  created.push(outer, inner, body);
  return body;
}

/** The lid turned back over and set on the body as it closes it, and what of it lies below the body's top: lip and rim. */
function closing(kernel: Kernel, body: Body, lid: Body, thickness: number, created: Solid[]) {
  const turned = lid.rotate([180, 0, 0]);
  const bodyBox = body.boundingBox();
  const box = turned.boundingBox();
  const placed = turned.translate([
    (bodyBox.min[0] + bodyBox.max[0]) / 2 - (box.min[0] + box.max[0]) / 2,
    bodyBox.max[1] + thickness - box.max[1],
    (bodyBox.min[2] + bodyBox.max[2]) / 2 - (box.min[2] + box.max[2]) / 2,
  ]);
  const cutter = kernel.Manifold.cube([1000, 1000, 1000], true).translate([0, bodyBox.max[1] - 0.01 - 500, 0]);
  const reach = placed.intersect(cutter);
  created.push(turned, placed, cutter, reach);
  return { placed, reach };
}

describe("lid along walls that lean (real Manifold kernel, issue #1868)", () => {
  it("a lip follows an opening that narrows towards the foot, a rim a body that widens towards it", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      // The wall leans by 5 mm over 30: over the lip's 5 mm an upright lip would stand 0.8 mm deep in it.
      const cases = [
        { body: pot(kernel, 15, 20, created), type: "plug" as const },
        { body: pot(kernel, 15, 20, created), type: "both" as const },
        { body: pot(kernel, 20, 15, created), type: "cap" as const },
        { body: pot(kernel, 20, 15, created), type: "both" as const },
      ];
      for (const { body, type } of cases) {
        const result = lidForSolid(kernel, body, normalizeLidOptions({ type, thickness: 2, gap: 0.2, depth: 5, wall: 1.6 }));
        if ("error" in result) throw new Error(JSON.stringify(result.error));
        created.push(result.lid);
        expect(result.lid.status()).toBe("NoError");
        expect(result.leaning).toBe(true);
        const { placed, reach } = closing(kernel, body, result.lid, 2, created);
        const overlap = placed.intersect(body);
        created.push(overlap);
        expect(overlap.volume()).toBeLessThan(0.01);
        // The gap is kept all the way down: measured square to the leaning wall it is a hair under the 0.2 across. With
        // both, the upright one of the two is as the cut 0.3 mm below the top gives it, as before: 0.05 nearer at the top.
        expect(reach.minGap(body, 1)).toBeGreaterThan(type === "both" ? 0.14 : 0.17);
        expect(reach.minGap(body, 1)).toBeLessThan(0.21);
        // It still reaches 5 mm down, in one piece with its plate.
        expect(reach.boundingBox().min[1]).toBeCloseTo(25, 2);
        expect(placed.decompose().length).toBe(1);
      }
    } finally {
      Array.from(new Set(created)).forEach((value) => value?.delete?.());
    }
  });

  it("click bumps stand on the leaning lip or rim and reach into the wall at their height, in dimples that keep it closed", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const cases = [
        { body: pot(kernel, 15, 20, created), type: "plug" as const },
        { body: pot(kernel, 20, 15, created), type: "cap" as const },
      ];
      for (const { body, type } of cases) {
        const result = lidForSolid(kernel, body, normalizeLidOptions({ type, thickness: 2, gap: 0.2, depth: 5, wall: 1.6, clickBumps: true, clickBumpHeight: 0.4 }));
        if ("error" in result) throw new Error(JSON.stringify(result.error));
        created.push(result.lid, result.clickBumps!.dimples);
        expect(result.clickBumps!.count).toBeGreaterThan(0);
        const { placed } = closing(kernel, body, result.lid, 2, created);
        // Closed, the bumps reach into the wall as it was: they hold the lid.
        const held = placed.intersect(body);
        created.push(held);
        expect(held.volume()).toBeGreaterThan(0.01);
        // And each lies in its dimple, clear of the wall that is left.
        const dimpled = body.subtract(result.clickBumps!.dimples);
        const overlap = placed.intersect(dimpled);
        created.push(dimpled, overlap);
        expect(overlap.volume()).toBeLessThan(0.01);
        // No dimple goes through the wall.
        expect(dimpled.genus()).toBe(body.genus());
      }
    } finally {
      Array.from(new Set(created)).forEach((value) => value?.delete?.());
    }
  });

  it("leaves the lip and the rim upright along upright walls, and where the opening widens or the body narrows below the rim", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const upright = lidForSolid(kernel, pot(kernel, 20, 20, created), normalizeLidOptions({ type: "both", thickness: 2, gap: 0.2, depth: 5, wall: 1.6 }));
      if ("error" in upright) throw new Error(JSON.stringify(upright.error));
      created.push(upright.lid);
      expect(upright.leaning).toBeUndefined();
      // A lip that widened with the opening could not be pushed in, a rim that narrowed with the body not be put over it.
      for (const { body, type } of [{ body: pot(kernel, 20, 15, created), type: "plug" as const }, { body: pot(kernel, 15, 20, created), type: "cap" as const }]) {
        const result = lidForSolid(kernel, body, normalizeLidOptions({ type, thickness: 2, gap: 0.2, depth: 5, wall: 1.6 }));
        if ("error" in result) throw new Error(JSON.stringify(result.error));
        created.push(result.lid);
        expect(result.leaning).toBeUndefined();
        const { placed } = closing(kernel, body, result.lid, 2, created);
        const overlap = placed.intersect(body);
        created.push(overlap);
        expect(overlap.volume()).toBeLessThan(0.01);
      }
    } finally {
      Array.from(new Set(created)).forEach((value) => value?.delete?.());
    }
  });
});
