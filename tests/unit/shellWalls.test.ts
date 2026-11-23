import { describe, expect, it } from "vitest";
import { MAX_SHELL_DIVIDER_WALLS, type ShellDividerWall, type ShellScoop } from "@/lib/shellGridLimits";
import { shellMirroredWalls, shellScoopOf, shellScoopsWith, shellSplitWall, shellWallEnds, shellWallFromEnds, shellWallQuad, shellWallRoom, shellWallsInside } from "@/lib/shellWalls";

/**
 * The plan of a hollowed box from above: the room of its inside, the compartments its dividers leave open, and what the
 * panel's buttons make of walls and finger scoops. The inside here is 100 x 60 mm, measured from its left and its back.
 */
const sizes = (walls: ShellDividerWall[], thickness = 2) => shellWallRoom(100, 60, walls, thickness)!.compartments
  .map((entry) => `${Math.round((entry.maxX - entry.minX) * 10) / 10} x ${Math.round((entry.maxZ - entry.minZ) * 10) / 10}`)
  .sort();

describe("the room of a hollowed box and its compartments", () => {
  it("is one compartment without walls, and none in an inside too small to hold one", () => {
    const room = shellWallRoom(100, 60, [], 2)!;
    expect(room.width).toBe(100);
    expect(room.depth).toBe(60);
    expect(room.compartments).toHaveLength(1);
    expect(room.compartments[0]).toMatchObject({ minX: 0, maxX: 100, minZ: 0, maxZ: 60 });
    expect(shellWallRoom(1, 60, [], 2)).toBeNull();
  });

  it("splits the inside along a wall from side to side, less the wall's thickness", () => {
    expect(sizes([{ dir: "z", at: 50, from: 0, to: 60 }])).toEqual(["49 x 60", "49 x 60"]);
    expect(sizes([{ dir: "z", at: 50, from: 0, to: 60 }, { dir: "x", at: 30, from: 0, to: 50 }])).toEqual(["49 x 29", "49 x 29", "49 x 60"]);
  });

  it("leaves one compartment round a wall that ends inside the box", () => {
    const room = shellWallRoom(100, 60, [{ dir: "z", at: 50, from: 0, to: 30 }], 2)!;
    expect(room.compartments).toHaveLength(1);
    // The label stands inside the open room, not on the wall.
    const { label } = room.compartments[0];
    expect(label.x < 49 || label.x > 51 || label.z > 30).toBe(true);
  });

  it("keeps only what lies inside the room of a straight wall, and drops one that is too short or beside it", () => {
    expect(shellWallsInside([{ dir: "x", at: 30, from: -20, to: 150 }], 100, 60)).toEqual([{ dir: "x", at: 30, from: 0, to: 100 }]);
    expect(shellWallsInside([{ dir: "x", at: 30, from: 10, to: 10.5 }, { dir: "z", at: 120, from: 0, to: 60 }], 100, 60)).toEqual([]);
  });
});

describe("walls set by hand", () => {
  it("tells a wall by its two ends and back again, a slanted one too", () => {
    const wall: ShellDividerWall = { dir: "x", at: 20, from: 10, to: 70, slant: 15 };
    const [a, b] = shellWallEnds(wall);
    expect(a).toEqual({ x: 10, z: 20 });
    expect(b).toEqual({ x: 70, z: 35 });
    expect(shellWallFromEnds(a, b)).toEqual(wall);
    // Given end before beginning, it is the same wall.
    expect(shellWallFromEnds(b, a)).toEqual(wall);
    // A wall that reaches further along the depth runs along it.
    expect(shellWallFromEnds({ x: 40, z: 0 }, { x: 40, z: 60 })).toEqual({ dir: "z", at: 40, from: 0, to: 60 });
  });

  it("draws a wall as wide as it is thick, and out past the side of the room it ends on", () => {
    const free = shellWallQuad({ dir: "x", at: 30, from: 20, to: 80 }, 2);
    expect(Math.min(...free.map((point) => point.z))).toBeCloseTo(29);
    expect(Math.max(...free.map((point) => point.z))).toBeCloseTo(31);
    expect(Math.min(...free.map((point) => point.x))).toBeCloseTo(20);
    const reaching = shellWallQuad({ dir: "x", at: 30, from: 0, to: 80 }, 2, { width: 100, depth: 60 });
    expect(Math.min(...reaching.map((point) => point.x))).toBeLessThan(0);
    expect(Math.max(...reaching.map((point) => point.x))).toBeCloseTo(80);
  });

  it("splits a compartment through its middle, reaching to the middle of the dividers it ends on", () => {
    const room = shellWallRoom(100, 60, [{ dir: "z", at: 50, from: 0, to: 60 }], 2)!;
    const left = room.compartments.find((entry) => entry.maxX < 50)!;
    expect(shellSplitWall(left, "x", room, 2)).toEqual({ dir: "x", at: 30, from: 0, to: 50 });
    expect(shellSplitWall(left, "z", room, 2)).toEqual({ dir: "z", at: 24.5, from: 0, to: 60 });
  });

  it("adds the mirror image of every wall once, and no more walls than a box takes", () => {
    const walls: ShellDividerWall[] = [{ dir: "z", at: 30, from: 0, to: 60 }];
    const mirrored = shellMirroredWalls(walls, { width: 100, depth: 60 }, "x");
    expect(mirrored).toEqual([{ dir: "z", at: 30, from: 0, to: 60 }, { dir: "z", at: 70, from: 0, to: 60 }]);
    expect(shellMirroredWalls(mirrored, { width: 100, depth: 60 }, "x")).toEqual(mirrored);
    // A wall in the middle is its own mirror image.
    expect(shellMirroredWalls([{ dir: "z", at: 50, from: 0, to: 60 }], { width: 100, depth: 60 }, "x")).toHaveLength(1);
    const many = Array.from({ length: MAX_SHELL_DIVIDER_WALLS - 1 }, (_entry, index): ShellDividerWall => ({ dir: "z", at: 1 + index, from: 0, to: 60 }));
    expect(shellMirroredWalls(many, { width: 100, depth: 60 }, "x")).toHaveLength(MAX_SHELL_DIVIDER_WALLS);
  });
});

describe("finger scoops", () => {
  it("belong to the compartment that holds their point, and are set, changed and taken away for one compartment", () => {
    const room = shellWallRoom(100, 60, [{ dir: "z", at: 50, from: 0, to: 60 }], 2)!;
    const left = room.compartments.find((entry) => entry.maxX < 50)!;
    const right = room.compartments.find((entry) => entry.minX > 50)!;
    let scoops: ShellScoop[] = shellScoopsWith([], left, "front");
    expect(scoops).toHaveLength(1);
    expect(shellScoopOf(left, scoops)?.side).toBe("front");
    expect(shellScoopOf(right, scoops)).toBeNull();
    scoops = shellScoopsWith(scoops, right, "back");
    scoops = shellScoopsWith(scoops, left, "left");
    expect(scoops).toHaveLength(2);
    expect(shellScoopOf(left, scoops)?.side).toBe("left");
    expect(shellScoopOf(right, scoops)?.side).toBe("back");
    expect(shellScoopsWith(scoops, left, null)).toEqual([expect.objectContaining({ side: "back" })]);
  });
});
