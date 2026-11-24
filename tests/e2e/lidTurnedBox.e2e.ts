import { describe, expect, it } from "vitest";
import Module from "manifold-3d";
import { LID_DEFAULTS, lidBoxTurn, lidForSolid, type LidOptions } from "@/lib/lidTool";

async function runtime() {
  const manifold = await Module();
  manifold.setup();
  return manifold;
}

type Kernel = Awaited<ReturnType<typeof runtime>>;
type Body = ReturnType<Kernel["Manifold"]["cube"]>;
type Wall = { x?: number; z?: number; slant?: number; below?: number };

const WIDTH = 100;
const HEIGHT = 35;
const DEPTH = 70;
const WALL = 2;

/**
 * A box as Hollow leaves it, 100 wide (x), 35 high (y, the scene's up) and 70 deep (z), open at the top, 2 mm of wall and
 * floor: with dividers across (`x`) or along (`z`), slanted by `slant` degrees or ending `below` the rim, and with a
 * filling `fill` high that has a round pocket in it.
 */
function box(kernel: Kernel, walls: Wall[] = [], fill = 0): Body {
  const outer = kernel.Manifold.cube([WIDTH, HEIGHT, DEPTH], true).translate([0, HEIGHT / 2, 0]);
  const inner = kernel.Manifold.cube([WIDTH - 2 * WALL, HEIGHT, DEPTH - 2 * WALL], true).translate([0, HEIGHT / 2 + WALL, 0]);
  const room = kernel.Manifold.cube([WIDTH - 2 * WALL, HEIGHT - WALL, DEPTH - 2 * WALL], true).translate([0, WALL + (HEIGHT - WALL) / 2, 0]);
  let body = outer.subtract(inner);
  for (const wall of walls) {
    const high = HEIGHT - WALL - (wall.below ?? 0);
    const piece = (wall.x !== undefined ? kernel.Manifold.cube([1.2, high, 300], true) : kernel.Manifold.cube([300, high, 1.2], true))
      .rotate([0, wall.slant ?? 0, 0]).translate([wall.x ?? 0, WALL + high / 2, wall.z ?? 0]);
    body = body.add(piece.intersect(room));
  }
  if (fill) {
    const slab = kernel.Manifold.cube([WIDTH - 2 * WALL, fill, DEPTH - 2 * WALL], true).translate([0, WALL + fill / 2, 0]);
    const pocket = kernel.Manifold.cylinder(fill, 12, 12, 48).rotate([-90, 0, 0]).translate([-20, WALL + 2, 5]);
    body = body.add(slab.subtract(pocket));
  }
  return body;
}

const lidOf = (kernel: Kernel, body: Body, options: Partial<LidOptions>) => {
  const result = lidForSolid(kernel, body, { ...LID_DEFAULTS, ...options });
  if ("error" in result) throw new Error(result.error.code);
  return result;
};

/** The lid turned back over and set on a body that stands square: its plate on the rim, in the middle or flush with the front (a hinge stands out at the back). */
function closing(body: Body, lid: Body, thickness: number, front = false) {
  const turned = lid.rotate([180, 0, 0]);
  const of = body.boundingBox();
  const box = turned.boundingBox();
  const middle = (axis: number) => (of.min[axis] + of.max[axis]) / 2 - (box.min[axis] + box.max[axis]) / 2;
  return turned.translate([middle(0), of.max[1] + thickness - box.max[1], front ? of.max[2] - box.max[2] : middle(2)]);
}

/** How many separate pieces of the closing lid reach below the rim: its lips. */
function lips(kernel: Kernel, body: Body, placed: Body) {
  const below = placed.intersect(kernel.Manifold.cube([400, 50, 400], true).translate([0, body.boundingBox().max[1] - 25.5, 0]));
  return below.isEmpty() ? 0 : below.decompose().length;
}

describe("a lid for a box with compartments, also one set down turned (real Manifold kernel)", () => {
  it("gives a plug lid one lip for each compartment, clear of the dividers, slanted ones too", async () => {
    const kernel = await runtime();
    const cases: [Wall[], number][] = [[[{ x: 0 }, { z: 0 }], 4], [[{ x: -15 }, { x: 20 }], 3], [[{ x: 0, slant: 25 }, { z: 10 }], 4]];
    for (const [walls, rooms] of cases) {
      const body = box(kernel, walls);
      const lid = lidOf(kernel, body, { type: "plug" }).lid as Body;
      expect(lid.decompose().length).toBe(1);
      const placed = closing(body, lid, LID_DEFAULTS.thickness);
      expect(placed.intersect(body).volume()).toBeLessThan(0.01);
      expect(lips(kernel, body, placed)).toBe(rooms);
    }
  }, 60000);

  it("keeps the lip clear of dividers that end below the rim, and of a filling with a pocket", async () => {
    const kernel = await runtime();
    for (const body of [box(kernel, [{ x: 0, below: 2 }, { z: 0, below: 2 }]), box(kernel, [{ x: 0, below: 0.5 }]), box(kernel, [], HEIGHT - WALL - 3), box(kernel, [{ x: 10 }], 15)]) {
      for (const depth of [4, 12]) {
        const lid = lidOf(kernel, body, { type: "plug", depth }).lid as Body;
        // One part: nothing hangs loose in the pocket below the filling's ledge.
        expect(lid.decompose().length).toBe(1);
        expect(closing(body, lid, LID_DEFAULTS.thickness).intersect(body).volume()).toBeLessThan(0.01);
      }
    }
  }, 60000);

  it("knows how far a box stands turned, and that a pot or a hexagon is no box", async () => {
    const kernel = await runtime();
    const body = box(kernel, [{ x: 0 }]);
    expect(lidBoxTurn(kernel, body)).toBe(0);
    expect(lidBoxTurn(kernel, body.rotate([0, 30, 0]))).toBeCloseTo(30, 3);
    expect(lidBoxTurn(kernel, body.rotate([0, -20, 0]).translate([40, 0, -30]))).toBeCloseTo(-20, 3);
    // A quarter turn further is the same box seen from above.
    expect(lidBoxTurn(kernel, body.rotate([0, 120, 0]))).toBeCloseTo(30, 3);
    for (const sides of [6, 64]) {
      const pot = kernel.Manifold.cylinder(30, 25, 25, sides).subtract(kernel.Manifold.cylinder(30, 23, 23, sides).translate([0, 0, 2])).rotate([-90, 0, 0]).rotate([0, 17, 0]);
      expect(lidBoxTurn(kernel, pot)).toBe(0);
    }
  });

  it("makes a hinged lid for a box standing turned as for one standing square, turned with the box", async () => {
    const kernel = await runtime();
    const square = box(kernel, [{ x: 0 }, { z: 0 }]);
    for (const turn of [5, 30, 45, -20]) {
      const turned = square.rotate([0, turn, 0]).translate([30, 0, -45]);
      for (const options of [{ hinge: true }, { hinge: true, hingeSide: "left" as const }, { hinge: true, hingeStyle: "flush" as const }, { hinge: true, hingeStyle: "pivot" as const }, { type: "flat" as const, hinge: true }]) {
        const there = lidOf(kernel, turned, options);
        const here = lidOf(kernel, square, options);
        expect((there.lid as Body).volume()).toBeCloseTo((here.lid as Body).volume(), 0);
        expect((there.hinge!.knuckles as Body).volume()).toBeCloseTo((here.hinge!.knuckles as Body).volume(), 0);
        expect(there.hinge!.count).toBe(here.hinge!.count);
      }
      // Turned back with its box, the lid closes it: plate on the rim, lips in the compartments, knuckles at the back.
      const made = lidOf(kernel, turned, { hinge: true });
      const back = (solid: Body) => solid.translate([-30, 0, 45]).rotate([0, -turn, 0]);
      const placed = closing(square, back(made.lid as Body), LID_DEFAULTS.thickness, true);
      expect(placed.intersect(square).volume()).toBeLessThan(0.01);
      // A lip in each compartment at least: a hinged lid's are cut back where they would catch as it swings.
      expect(lips(kernel, square, placed)).toBeGreaterThanOrEqual(4);
      // The body's knuckles stand at its own back, behind the wall.
      const knuckles = back(made.hinge!.knuckles as Body).boundingBox();
      expect(knuckles.max[2]).toBeLessThan(-DEPTH / 2 + 0.5);
      expect(knuckles.min[0]).toBeGreaterThan(-WIDTH / 2 - 0.01);
      expect(knuckles.max[0]).toBeLessThan(WIDTH / 2 + 0.01);
    }
  }, 120000);

  it("gives a box standing turned its latches, handle and magnets, their places turned with it", async () => {
    const kernel = await runtime();
    const square = box(kernel, [{ x: -15 }]);
    const turn = 30;
    const turned = square.rotate([0, turn, 0]);
    const rad = (turn * Math.PI) / 180;
    const spun = ([x, y, z]: readonly number[]) => [x * Math.cos(rad) + z * Math.sin(rad), y, -x * Math.sin(rad) + z * Math.cos(rad)];
    for (const options of [{ latches: 1 }, { latches: 2, latchBack: true }, { hinge: true, latches: 1, latchStyle: "slider" as const }, { hinge: true, latches: 1, latchStyle: "bolt" as const }, { handle: "tab" as const }, { handle: "notch" as const }, { magnets: true, thickness: 3 }, { hinge: true, magnets: true, thickness: 3 }]) {
      const there = lidOf(kernel, turned, options);
      const here = lidOf(kernel, square, options);
      expect((there.lid as Body).volume()).toBeCloseTo((here.lid as Body).volume(), 0);
      if (here.latch) expect((there.latch!.body as Body).volume()).toBeCloseTo((here.latch.body as Body).volume(), 0);
      here.latch?.labels?.forEach((label, index) => {
        const moved = there.latch!.labels![index];
        spun(label.point).forEach((value, axis) => expect(moved.point[axis]).toBeCloseTo(value, 6));
        expect(moved.turn).toBeCloseTo(turn, 6);
      });
      here.latch?.boltLabels?.forEach((label, index) => {
        const moved = there.latch!.boltLabels![index];
        spun(label.point).forEach((value, axis) => expect(moved.point[axis]).toBeCloseTo(value, 6));
        spun(label.normal).forEach((value, axis) => expect(moved.normal[axis]).toBeCloseTo(value, 6));
      });
      here.magnets?.pockets.forEach((pocket, index) => {
        const [x, , z] = spun([pocket.x, 0, pocket.z]);
        expect(there.magnets!.pockets[index].x).toBeCloseTo(x, 6);
        expect(there.magnets!.pockets[index].z).toBeCloseTo(z, 6);
      });
      here.magnets?.postParts.forEach((part, index) => expect(there.magnets!.postParts[index].rotation).toBeCloseTo(part.rotation + turn, 6));
    }
    // Magnets alone: the pockets lie in the turned box's own corners, inside its outline.
    const pockets = lidOf(kernel, turned, { magnets: true, thickness: 3 }).magnets!.pockets;
    expect(pockets).toHaveLength(4);
    for (const pocket of pockets) {
      const [x, , z] = [pocket.x * Math.cos(-rad) + pocket.z * Math.sin(-rad), 0, -pocket.x * Math.sin(-rad) + pocket.z * Math.cos(-rad)];
      expect(Math.abs(x)).toBeLessThan(WIDTH / 2);
      expect(Math.abs(z)).toBeLessThan(DEPTH / 2);
      expect(Math.abs(x)).toBeGreaterThan(WIDTH / 2 - 12);
      expect(Math.abs(z)).toBeGreaterThan(DEPTH / 2 - 12);
    }
  }, 120000);

  it("leaves a lid without those extras, and a slide-in lid, as they were for a turned box", async () => {
    const kernel = await runtime();
    const turned = box(kernel, [{ x: 0 }]).rotate([0, 30, 0]);
    for (const options of [{ type: "plug" as const }, { type: "cap" as const }, { type: "both" as const }, { type: "flat" as const }, { type: "slide" as const }, { clickBumps: true }]) {
      const lid = lidOf(kernel, turned, options).lid as Body;
      expect(lid.isEmpty()).toBe(false);
      expect(lid.decompose().length).toBe(1);
    }
  }, 60000);
});
