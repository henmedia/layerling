import { describe, expect, it } from "vitest";
import Module from "manifold-3d";
import { lidForSolid, normalizeLidOptions, type MagnetPostPart } from "@/lib/lidTool";

/*
 * Screws in the corners of a lid (Discussion #1938), on the real Manifold kernel: the posts and holes in the box, and the
 * holes through the lid's plate above them, countersunk or plain.
 */

type Solid = { delete?: () => void };

function dispose(values: Solid[]) {
  Array.from(new Set(values)).forEach((value) => value?.delete?.());
}

async function runtime() {
  const manifold = await Module();
  manifold.setup();
  return manifold;
}

type Kernel = Awaited<ReturnType<typeof runtime>>;
type Body = ReturnType<Kernel["Manifold"]["cube"]>;

/** A box `width` wide (x), `height` high (y, the scene's up) and `depth` deep (z), with walls and a floor of `wall`, open at the top. */
function openBox(kernel: Kernel, created: Solid[], width = 60, height = 30, depth = 40, wall = 2) {
  const outer = kernel.Manifold.cube([width, height, depth], true).translate([0, height / 2, 0]);
  const inner = kernel.Manifold.cube([width - 2 * wall, height, depth - 2 * wall], true).translate([0, height / 2 + wall, 0]);
  const body = outer.subtract(inner);
  created.push(outer, inner, body);
  return body;
}

/** The lid turned back over and set on the body as it closes it: its plate on the rim, centred over the body. */
function closing(body: Body, lid: Body, thickness: number, created: Solid[]) {
  const turned = lid.rotate([180, 0, 0]);
  const bodyBox = body.boundingBox();
  const box = turned.boundingBox();
  const placed = turned.translate([
    (bodyBox.min[0] + bodyBox.max[0]) / 2 - (box.min[0] + box.max[0]) / 2,
    bodyBox.max[1] + thickness - box.max[1],
    (bodyBox.min[2] + bodyBox.max[2]) / 2 - (box.min[2] + box.max[2]) / 2,
  ]);
  created.push(turned, placed);
  return placed;
}

/** The exact pieces of the posts as one solid, in the scene's frame (the boxes in these tests stand square). */
function postSolid(kernel: Kernel, parts: readonly MagnetPostPart[], created: Solid[]) {
  const pieces = parts.map((part) => {
    expect(part.rotation).toBeCloseTo(0, 9);
    const piece = part.kind === "cylinder"
      ? kernel.Manifold.cylinder(part.height, part.width / 2, part.width / 2, 48).rotate([-90, 0, 0]).translate([part.x, part.elevation, part.z])
      : kernel.Manifold.cube([part.width, part.height, part.depth], true).translate([part.x, part.elevation + part.height / 2, part.z]);
    created.push(piece);
    return piece;
  });
  const solid = kernel.Manifold.union(pieces);
  created.push(solid);
  return solid;
}

/** How much of `solid` lies in an upright disc of this radius between the heights `low` and `high` over (x, z), as a share of the disc. */
function filledShare(kernel: Kernel, solid: Body, x: number, z: number, radius: number, low: number, high: number, created: Solid[]) {
  const disc = kernel.Manifold.cylinder(high - low, radius, radius, 96).rotate([-90, 0, 0]).translate([x, low, z]);
  const inside = solid.intersect(disc);
  created.push(disc, inside);
  return inside.volume() / disc.volume();
}

describe("lid with screws in the corners (real Manifold kernel, Discussion #1938)", () => {
  it("screws a push-in lid down on M3 inserts: posts with holes in the box, countersunk holes through the lid above them", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const body = openBox(kernel, created);
      const result = lidForSolid(kernel, body, normalizeLidOptions({ type: "plug", thickness: 2, cornerScrews: true }));
      if ("error" in result) throw new Error(JSON.stringify(result.error));
      created.push(result.lid);
      expect(result.cornerScrews).toEqual({ hole: 4, depth: 6.7, wall: 1.6, shaft: 3.4, head: 6.3, sink: expect.closeTo(1.45, 9) });
      const screws = result.magnets!;
      // The 2 mm wall cannot hold a 4 mm hole: posts fill the corners, exact pieces as the magnets' posts are.
      expect(screws.posts).toBeNull();
      expect(screws.postParts.map((part) => part.kind)).toEqual(["cylinder", "box", "cylinder", "box", "cylinder", "box", "cylinder", "box"]);
      const posts = postSolid(kernel, screws.postParts, created);
      expect(posts.status()).toBe("NoError");
      // Four holes of 4 mm, 6.7 mm down from the rim at 30. The head (6.3 mm) with 0.8 mm of plate round it sets how far
      // they stand in from the corner, 3.95 mm: more than the insert's own wall of 1.6 mm would.
      expect(screws.pockets).toHaveLength(4);
      screws.pockets.forEach((pocket) => {
        expect(pocket.diameter).toBeCloseTo(4, 9);
        expect(pocket.elevation).toBeCloseTo(23.3, 6);
        expect(pocket.height).toBeCloseTo(7.7, 6);
        expect(Math.abs(pocket.x)).toBeCloseTo(30 - 3.95, 1);
        expect(Math.abs(pocket.z)).toBeCloseTo(20 - 3.95, 1);
      });
      // Each hole lies in material all round, at least the insert's wall thick.
      const filledBody = kernel.Manifold.union(body, posts);
      created.push(filledBody);
      screws.pockets.forEach((pocket) => {
        expect(filledShare(kernel, filledBody, pocket.x, pocket.z, pocket.diameter / 2 + 1.6, 23.3, 30, created)).toBeGreaterThan(0.999);
      });
      // Turned back on the box, the lid's lip goes round the posts: nothing overlaps.
      const closed = closing(filledBody, result.lid, 2, created);
      const overlap = closed.intersect(filledBody);
      created.push(overlap);
      expect(overlap.volume()).toBeLessThan(0.01);
      screws.pockets.forEach((pocket) => {
        // The clearance hole of 3.4 mm goes through the whole plate, from the rim at 30 to its top at 32.
        expect(filledShare(kernel, closed, pocket.x, pocket.z, 1.65, 30, 32, created)).toBeLessThan(0.001);
        // Below the cone, 0.55 mm of plate stays round the hole; at the top face the cone is as wide as the head.
        expect(filledShare(kernel, closed, pocket.x, pocket.z, 3.1, 30.05, 30.5, created)).toBeCloseTo(1 - (1.7 * 1.7) / (3.1 * 3.1), 1);
        expect(filledShare(kernel, closed, pocket.x, pocket.z, 3.05, 31.95, 32, created)).toBeLessThan(0.02);
        // Round the head the plate is whole.
        expect(filledShare(kernel, closed, pocket.x, pocket.z, 3.9, 31.95, 32, created)).toBeCloseTo(1 - (3.15 * 3.15) / (3.9 * 3.9), 1);
      });
    } finally {
      dispose(created);
    }
  });

  it("makes plain holes for flat heads, and pilot holes for screws that cut into the plastic", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const body = openBox(kernel, created);
      const result = lidForSolid(kernel, body, normalizeLidOptions({ type: "cap", thickness: 1.2, cornerScrews: true, cornerScrewFastener: "selfTapping", cornerScrewHead: "flat" }));
      if ("error" in result) throw new Error(JSON.stringify(result.error));
      created.push(result.lid);
      // A 3 mm screw: a pilot hole of 2.4 mm, 7.5 mm deep.
      expect(result.cornerScrews).toEqual({ hole: 2.4, depth: 7.5, wall: 1.8, shaft: 3.4, head: 6.3, sink: 0 });
      const screws = result.magnets!;
      expect(screws.pockets).toHaveLength(4);
      screws.pockets.forEach((pocket) => {
        expect(pocket.diameter).toBeCloseTo(2.4, 9);
        expect(pocket.elevation).toBeCloseTo(22.5, 6);
      });
      const closed = closing(body, result.lid, 1.2, created);
      screws.pockets.forEach((pocket) => {
        // The hole is 3.4 mm wide all the way up: no cone at the top face.
        expect(filledShare(kernel, closed, pocket.x, pocket.z, 1.65, 30, 31.2, created)).toBeLessThan(0.001);
        expect(filledShare(kernel, closed, pocket.x, pocket.z, 3.1, 31.1, 31.2, created)).toBeCloseTo(1 - (1.7 * 1.7) / (3.1 * 3.1), 1);
      });
    } finally {
      dispose(created);
    }
  });

  it("needs no posts where the wall holds the holes", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const body = openBox(kernel, created, 60, 30, 40, 10);
      const result = lidForSolid(kernel, body, normalizeLidOptions({ type: "flat", cornerScrews: true }));
      if ("error" in result) throw new Error(JSON.stringify(result.error));
      created.push(result.lid);
      expect(result.magnets?.posts).toBeNull();
      expect(result.magnets?.postParts).toEqual([]);
      expect(result.magnets?.pockets).toHaveLength(4);
    } finally {
      dispose(created);
    }
  });

  it("says what does not go: a plate too thin for the heads, no room, magnets, a hinge, a lid that turns or slides", async () => {
    const kernel = await runtime();
    const created: Solid[] = [];
    try {
      const body = openBox(kernel, created);
      const error = (options: Parameters<typeof normalizeLidOptions>[0], target: Body = body) => {
        const result = lidForSolid(kernel, target, normalizeLidOptions(options));
        if (!("error" in result)) {
          created.push(result.lid);
          if (result.magnets?.posts) created.push(result.magnets.posts);
          return null;
        }
        return result.error;
      };
      // An M4 head's cone is 2.45 mm deep: with 0.4 mm of hole below it, the plate is at least 2.9 mm.
      expect(error({ cornerScrews: true, cornerScrewSize: "M4", thickness: 2 })).toEqual({ code: "cornerScrewsThinLid", thickness: 2.9 });
      expect(error({ cornerScrews: true, cornerScrewSize: "M4", thickness: 2.9 })).toBeNull();
      expect(error({ cornerScrews: true, cornerScrewSize: "M4", cornerScrewHead: "flat", thickness: 2 })).toBeNull();
      // Four M5 posts run into each other in a box 14 mm square; a box 6 mm high is lower than an M3 insert's hole needs.
      expect(error({ cornerScrews: true, cornerScrewSize: "M5", thickness: 3 }, openBox(kernel, created, 14, 30, 14, 1.2))).toEqual({ code: "cornerScrewsNoRoom" });
      expect(error({ cornerScrews: true, depth: 2 }, openBox(kernel, created, 60, 6, 40, 2))).toEqual({ code: "cornerScrewsNoRoom" });
      expect(error({ cornerScrews: true, magnets: true, thickness: 2.8 })).toEqual({ code: "cornerScrewsMagnets" });
      expect(error({ cornerScrews: true, hinge: true })).toEqual({ code: "cornerScrewsHinge" });
      expect(error({ cornerScrews: true, type: "screw" })).toEqual({ code: "screwExtras" });
      expect(error({ cornerScrews: true, type: "bayonet" })).toEqual({ code: "bayonetExtras" });
      expect(error({ cornerScrews: true, type: "slide" })).toEqual({ code: "slideExtras" });
      expect(error({ cornerScrews: true, stackTop: true })).toEqual({ code: "stackTopExtras" });
    } finally {
      dispose(created);
    }
  });
});
