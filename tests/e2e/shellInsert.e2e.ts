import { describe, expect, it } from "vitest";
import Module from "manifold-3d";
import { LID_DEFAULTS, lidForSolid } from "@/lib/lidTool";
import { SHELL_INSERT_LID_ROOM, SHELL_INSERT_PLATE, SHELL_INSERT_PLAY, SHELL_INSERT_WALL, shellInsertForSolids } from "@/lib/shellInsert";

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

/** A box as Hollow leaves it: 100 wide (x), 35 high (y, up), 70 deep (z), open at the top, 2 mm of wall and floor. */
function smooth(kernel: Kernel): Body {
  const outer = kernel.Manifold.cube([WIDTH, HEIGHT, DEPTH], true).translate([0, HEIGHT / 2, 0]);
  const inner = kernel.Manifold.cube([WIDTH - 2 * WALL, HEIGHT, DEPTH - 2 * WALL], true).translate([0, HEIGHT / 2 + WALL, 0]);
  return outer.subtract(inner);
}

/** The same box with dividers across (`x`) or along (`z`), slanted by `slant` degrees or ending `below` the rim. */
function divided(kernel: Kernel, walls: Wall[]): Body {
  const room = kernel.Manifold.cube([WIDTH - 2 * WALL, HEIGHT - WALL, DEPTH - 2 * WALL], true).translate([0, WALL + (HEIGHT - WALL) / 2, 0]);
  let body = smooth(kernel);
  for (const wall of walls) {
    const high = HEIGHT - WALL - (wall.below ?? 0);
    const piece = (wall.x !== undefined ? kernel.Manifold.cube([1.2, high, 300], true) : kernel.Manifold.cube([300, high, 1.2], true))
      .rotate([0, wall.slant ?? 0, 0]).translate([wall.x ?? 0, WALL + high / 2, wall.z ?? 0]);
    body = body.add(piece.intersect(room));
  }
  return body;
}

const insertOf = (kernel: Kernel, withWalls: Body, without: Body, options: { play?: number; plate?: number; wall?: number; lidRoom?: number } = {}) => {
  const result = shellInsertForSolids(kernel, withWalls, without, options);
  if ("error" in result) throw new Error(result.error);
  return { ...result, insert: result.insert as Body };
};

describe("the dividers of a hollowed box as a loose insert (real Manifold kernel)", () => {
  it("is a plate on the box's floor with the dividers on it, the play smaller than the inside all round", async () => {
    const kernel = await runtime();
    const box = smooth(kernel);
    // Without a wall of its own first: the plate and the dividers alone.
    const made = insertOf(kernel, divided(kernel, [{ x: -10 }, { z: 5 }]), box, { wall: 0 });
    const { insert } = made;
    expect(insert.decompose().length).toBe(1);
    expect(insert.status()).toBe("NoError");
    const bounds = insert.boundingBox();
    // On the floor, up to the rim as the dividers were, and the play from each wall.
    expect(bounds.min[1]).toBeCloseTo(WALL, 1);
    expect(bounds.max[1]).toBeCloseTo(HEIGHT, 1);
    expect(bounds.min[0]).toBeCloseTo(-WIDTH / 2 + WALL + SHELL_INSERT_PLAY, 2);
    expect(bounds.max[0]).toBeCloseTo(WIDTH / 2 - WALL - SHELL_INSERT_PLAY, 2);
    expect(bounds.min[2]).toBeCloseTo(-DEPTH / 2 + WALL + SHELL_INSERT_PLAY, 2);
    expect(bounds.max[2]).toBeCloseTo(DEPTH / 2 - WALL - SHELL_INSERT_PLAY, 2);
    expect(made).toMatchObject({ plate: SHELL_INSERT_PLATE, play: SHELL_INSERT_PLAY, rim: 0 });
    expect(made.height).toBeCloseTo(HEIGHT - WALL, 1);
    // It goes into the box without touching it.
    expect(insert.intersect(box).volume()).toBeLessThan(0.001);
    // The plate and two walls: its volume, within the walls' crossing and the steps' joints.
    const wide = WIDTH - 2 * WALL - 2 * SHELL_INSERT_PLAY;
    const deep = DEPTH - 2 * WALL - 2 * SHELL_INSERT_PLAY;
    const high = HEIGHT - WALL - SHELL_INSERT_PLATE;
    const expected = wide * deep * SHELL_INSERT_PLATE + 1.2 * high * (wide + deep) - 1.2 * 1.2 * high;
    expect(insert.volume()).toBeGreaterThan(expected * 0.99);
    expect(insert.volume()).toBeLessThan(expected * 1.01);
  }, 60000);

  it("takes walls at a slant and dividers that end below the rim as they are", async () => {
    const kernel = await runtime();
    const box = smooth(kernel);
    const slanted = insertOf(kernel, divided(kernel, [{ x: 0, slant: 25 }, { z: 10 }]), box).insert;
    expect(slanted.decompose().length).toBe(1);
    expect(slanted.intersect(box).volume()).toBeLessThan(0.001);
    const low = insertOf(kernel, divided(kernel, [{ x: 0, below: 10 }, { z: 0, below: 10 }]), box);
    expect(low.insert.boundingBox().max[1]).toBeCloseTo(HEIGHT - 10, 1);
    expect(low.height).toBeCloseTo(HEIGHT - WALL - 10, 1);
    expect(low.insert.intersect(box).volume()).toBeLessThan(0.001);
  }, 60000);

  it("follows a box that stands turned, and one that was moved", async () => {
    const kernel = await runtime();
    const box = smooth(kernel);
    const walls = divided(kernel, [{ x: -10 }, { z: 5 }]);
    const here = insertOf(kernel, walls, box).insert;
    const move = (body: Body) => body.rotate([0, 30, 0]).translate([40, 3, -25]);
    const there = insertOf(kernel, move(walls), move(box)).insert;
    expect(there.volume()).toBeCloseTo(here.volume(), 0);
    expect(there.intersect(move(box)).volume()).toBeLessThan(0.001);
    // The same insert, turned and moved with the box.
    expect(there.subtract(move(here)).volume()).toBeLessThan(here.volume() * 0.01);
  }, 60000);

  it("clears a floor with rounded edges, and takes the play and the plate it is given", async () => {
    const kernel = await runtime();
    // The inside's lowest 3 mm are 3 mm narrower all round, as a rounded edge at the floor narrows them.
    const fillet = kernel.Manifold.cube([WIDTH - 2 * WALL, 3, DEPTH - 2 * WALL], true).translate([0, WALL + 1.5, 0])
      .subtract(kernel.Manifold.cube([WIDTH - 2 * WALL - 6, 3, DEPTH - 2 * WALL - 6], true).translate([0, WALL + 1.5, 0]));
    const box = smooth(kernel).add(fillet);
    const walls = divided(kernel, [{ x: 0 }]).add(fillet);
    const made = insertOf(kernel, walls, box).insert;
    expect(made.decompose().length).toBe(1);
    expect(made.intersect(box).volume()).toBeLessThan(0.001);
    // Above the narrow part it is as wide as the box lets it be.
    expect(made.boundingBox().max[2]).toBeCloseTo(DEPTH / 2 - WALL - SHELL_INSERT_PLAY, 2);
    const loose = insertOf(kernel, divided(kernel, [{ x: 0 }]), smooth(kernel), { play: 0.5, plate: 1.2 });
    expect(loose).toMatchObject({ play: 0.5, plate: 1.2 });
    expect(loose.insert.boundingBox().max[0]).toBeCloseTo(WIDTH / 2 - WALL - 0.5, 2);
    // The play is held between 0.05 and 1 mm.
    expect(insertOf(kernel, divided(kernel, [{ x: 0 }]), smooth(kernel), { play: 5 }).play).toBe(1);
  }, 60000);

  it("says why there is no insert: no dividers, no opening, nothing left of them", async () => {
    const kernel = await runtime();
    const box = smooth(kernel);
    expect(shellInsertForSolids(kernel, box, box)).toEqual({ error: "noDividers" });
    const block = kernel.Manifold.cube([WIDTH, HEIGHT, DEPTH], true).translate([0, HEIGHT / 2, 0]);
    expect(shellInsertForSolids(kernel, block, block)).toEqual({ error: "notOpen" });
  }, 60000);

  it("stays clear of what else stands in the box, as a lid's posts for its magnets do", async () => {
    const kernel = await runtime();
    const box = smooth(kernel);
    // A post 8 x 8 in the back left corner of the inside, from the floor to the rim.
    const post = kernel.Manifold.cube([8, HEIGHT - WALL, 8], true).translate([-WIDTH / 2 + WALL + 4, WALL + (HEIGHT - WALL) / 2, -DEPTH / 2 + WALL + 4]);
    const standing = box.add(post);
    const plain = insertOf(kernel, divided(kernel, [{ x: 0 }]), box).insert;
    expect(plain.intersect(standing).volume()).toBeGreaterThan(1);
    const result = shellInsertForSolids(kernel, divided(kernel, [{ x: 0 }]), box, { also: standing });
    if ("error" in result) throw new Error(result.error);
    const clear = result.insert as Body;
    expect(clear.intersect(standing).volume()).toBeLessThan(0.001);
    expect(clear.decompose().length).toBe(1);
    // Only the corner is given up: the plate's notch for the post and the play round it.
    expect(plain.volume() - clear.volume()).toBeGreaterThan(8 * 8 * SHELL_INSERT_PLATE * 0.9);
    expect(plain.volume() - clear.volume()).toBeLessThan(9 * 9 * SHELL_INSERT_PLATE);
  }, 60000);

  it("closes every compartment with a wall of its own, which ends below the dividers' top where a lid's lip goes", async () => {
    const kernel = await runtime();
    const box = smooth(kernel);
    const walls = divided(kernel, [{ x: -10 }, { z: 5 }]);
    const made = insertOf(kernel, walls, box);
    const { insert } = made;
    expect(insert.decompose().length).toBe(1);
    expect(insert.status()).toBe("NoError");
    expect(insert.intersect(box).volume()).toBeLessThan(0.001);
    expect(made.rim).toBeCloseTo(HEIGHT - WALL - SHELL_INSERT_LID_ROOM, 1);
    // Seen from above at a height: how many closed rooms the insert has there, and how far it reaches.
    const UP = [1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1] as never;
    const rooms = (z: number) => insert.transform(UP).slice(z).toPolygons().filter((polygon) => {
      let area = 0;
      polygon.forEach(([x, y], index) => {
        const [nx, ny] = polygon[(index + 1) % polygon.length];
        area += x * ny - nx * y;
      });
      return area < 0;
    }).length;
    // Half way up, each of the four compartments is closed all round; in the lid's room above, none is, and the dividers still stand.
    expect(rooms(WALL + 15)).toBe(4);
    expect(rooms(HEIGHT - SHELL_INSERT_LID_ROOM - 0.3)).toBe(4);
    expect(rooms(HEIGHT - SHELL_INSERT_LID_ROOM + 0.3)).toBe(0);
    expect(insert.boundingBox().max[1]).toBeCloseTo(HEIGHT, 1);
    // The wall is as thick as asked: the insert without one, and a ring of that width round it up to its top.
    const plain = insertOf(kernel, walls, box, { wall: 0 }).insert;
    const wide = WIDTH - 2 * WALL - 2 * SHELL_INSERT_PLAY;
    const deep = DEPTH - 2 * WALL - 2 * SHELL_INSERT_PLAY;
    const high = made.rim - SHELL_INSERT_PLATE;
    // The ring's own volume, less where the two dividers' four ends already stand in it.
    const ring = (wide * deep - (wide - 2 * SHELL_INSERT_WALL) * (deep - 2 * SHELL_INSERT_WALL)) * high - 4 * 1.2 * SHELL_INSERT_WALL * high;
    expect(insert.volume() - plain.volume()).toBeGreaterThan(ring * 0.98);
    expect(insert.volume() - plain.volume()).toBeLessThan(ring * 1.02);
    // A thicker wall, and one that goes all the way up.
    const thick = insertOf(kernel, walls, box, { wall: 2, lidRoom: 0 });
    expect(thick.rim).toBeCloseTo(HEIGHT - WALL, 1);
    expect(thick.insert.volume()).toBeGreaterThan(insert.volume());
    // Dividers so low that no wall of 2 mm is left under the lid's room: plate and dividers alone.
    const low = insertOf(kernel, divided(kernel, [{ x: 0, below: 27 }]), box);
    expect(low.rim).toBe(0);
  }, 60000);

  it("lets the box's lid close it with the insert inside: an ordinary lip, and a deeper one given its room", async () => {
    const kernel = await runtime();
    const box = smooth(kernel);
    const walls = divided(kernel, [{ x: -10 }, { z: 5 }]);
    /** The lid for the box with its dividers fixed, as the editor makes it for a box with an insert, set on the box. */
    const closed = (depth: number) => {
      const result = lidForSolid(kernel, walls, { ...LID_DEFAULTS, depth });
      if ("error" in result) throw new Error(result.error.code);
      const turned = (result.lid as Body).rotate([180, 0, 0]);
      const lid = turned.boundingBox();
      return turned.translate([-(lid.min[0] + lid.max[0]) / 2, HEIGHT + LID_DEFAULTS.thickness - lid.max[1], -(lid.min[2] + lid.max[2]) / 2]);
    };
    const ordinary = insertOf(kernel, walls, box).insert;
    expect(closed(LID_DEFAULTS.depth).intersect(ordinary).volume()).toBeLessThan(0.001);
    // A lip 8 mm deep would stand in the insert's wall as it is, and clears one that was given 8.5 mm of room.
    expect(closed(8).intersect(ordinary).volume()).toBeGreaterThan(1);
    expect(closed(8).intersect(insertOf(kernel, walls, box, { lidRoom: 8.5 }).insert).volume()).toBeLessThan(0.001);
  }, 60000);
});
