import { beforeAll, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { OcctKernel, type ShapeHandle } from "occt-wasm";
import { shellSolid } from "@/lib/cadShell";
import { shellDividersSolid, shellGridSolid } from "@/lib/cadShellGrid";
import { shellStackSolid } from "@/lib/cadShellStack";
import { shellStackFloor, shellStackRoom } from "@/lib/shellStackLimits";
import { SHELL_GRID_FLOOR, shellGridFloor } from "@/lib/shellGridLimits";

const ROTATE_Z_TO_Y: number[] = [1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0];

describe("a Gridfinity floor, fit and dividers with the real OCCT kernel", () => {
  let kernel: OcctKernel;

  beforeAll(async () => {
    const wasm = join(dirname(fileURLToPath(import.meta.resolve("occt-wasm"))), "occt-wasm.wasm");
    kernel = await OcctKernel.init({ wasm });
  });

  function yUp(shape: ShapeHandle) {
    const turned = kernel.transform(shape, ROTATE_Z_TO_Y);
    kernel.release(shape);
    return turned;
  }

  /** The body before hollowing and the hollowed one: `width` x `depth` across (x, z), `height` up, centred on x and z. */
  function hollow(width: number, depth: number, height: number, wall = 2) {
    const solid = yUp(kernel.makeBox(width, depth, height));
    const centred = kernel.translate(solid, -width / 2, 0, depth / 2);
    const shelled = shellSolid(kernel, centred, wall, "top");
    return { original: centred, shelled };
  }

  const solid = (shape: ShapeHandle, x: number, y: number, z: number) => kernel.containsPoint(shape, { x, y, z });

  it("raises the floor to the baseplate and cuts a socket for every cell the inside holds", () => {
    const { original, shelled } = hollow(100, 80, 40);
    // The inside is 96 x 76: two cells along x, one along z.
    const grid = shellGridSolid(kernel, original, shelled, { cells: 99, fit: false });
    expect(kernel.isValid(grid)).toBe(true);
    expect(kernel.getSubShapes(grid, "solid")).toHaveLength(1);
    const bounds = kernel.getBoundingBox(grid, false);
    expect(bounds.ymax - bounds.ymin).toBeCloseTo(40, 3);
    // Closed floor 1.2 mm under the sockets, a socket 5 mm deep in the middle of each of the two cells, ridges between.
    expect(solid(grid, -21, 0.6, 0)).toBe(true);
    expect(solid(grid, -21, SHELL_GRID_FLOOR - 0.5, 0)).toBe(false);
    expect(solid(grid, 21, SHELL_GRID_FLOOR - 0.5, 0)).toBe(false);
    // Past the cells, and up in the cavity, it is as hollow as it was.
    expect(solid(grid, -21, SHELL_GRID_FLOOR + 5, 0)).toBe(false);
    expect(solid(grid, -49, 20, 0)).toBe(true);
    // The floor 4.2 mm thicker over 96 x 76 less the sockets of two cells.
    expect(kernel.getVolume(grid)).toBeGreaterThan(kernel.getVolume(shelled) + 10000);
    expect(kernel.getVolume(grid)).toBeLessThan(kernel.getVolume(shelled) + 96 * 76 * 4.2);
  });

  it("cuts four magnet holes under each socket and makes the floor that much thicker (Discussion #1693)", () => {
    const { original, shelled } = hollow(100, 80, 40);
    const plain = shellGridSolid(kernel, original, shelled, { cells: 99, fit: false });
    const magnets = shellGridSolid(kernel, original, shelled, { cells: 99, fit: false, magnets: true });
    expect(kernel.isValid(magnets)).toBe(true);
    expect(kernel.getSubShapes(magnets, "solid")).toHaveLength(1);
    const floor = shellGridFloor({ magnets: true });
    expect(floor).toBeCloseTo(SHELL_GRID_FLOOR + 2.4, 6);
    // The socket's bottom lies 2.4 mm higher; under it the holes, 13 mm from the cell's middle, 2.4 mm deep, 1.2 mm over the bottom.
    const socketBottom = floor - 5;
    for (const cx of [-21, 21]) {
      for (const [dx, dz] of [[-13, -13], [13, -13], [-13, 13], [13, 13]]) {
        expect(solid(magnets, cx + dx, socketBottom - 1.2, dz)).toBe(false);
        expect(solid(magnets, cx + dx, 0.6, dz)).toBe(true);
        expect(solid(magnets, cx + dx + 3.6, socketBottom - 1.2, dz)).toBe(true);
      }
      // Between the holes the floor is solid up to the socket's bottom.
      expect(solid(magnets, cx, socketBottom - 0.5, 0)).toBe(true);
      expect(solid(magnets, cx, socketBottom + 0.5, 0)).toBe(false);
    }
    // 2.4 mm more floor over the inside, less eight holes.
    const holes = 8 * Math.PI * 3.25 * 3.25 * 2.4;
    const more = kernel.getVolume(magnets) - kernel.getVolume(plain);
    expect(more).toBeGreaterThan(2.4 * 96 * 76 * 0.9 - holes);
    expect(more).toBeLessThan(2.4 * 96 * 76 - holes + 1);
  });

  it("keeps to the number of cells asked for, nearest the middle", () => {
    const { original, shelled } = hollow(100, 80, 40);
    const one = shellGridSolid(kernel, original, shelled, { cells: 1, fit: false });
    const sockets = [-21, 21].filter((x) => !solid(one, x, SHELL_GRID_FLOOR - 0.5, 0));
    expect(sockets).toHaveLength(1);
  });

  it("thickens the walls to the cells with the fit", () => {
    const { original, shelled } = hollow(100, 80, 40);
    const fitted = shellGridSolid(kernel, original, shelled, { cells: 99, fit: true });
    expect(kernel.getSubShapes(fitted, "solid")).toHaveLength(1);
    // Two cells and a play of 0.5 across (84.5), 42.5 along: the walls stand at 42.25 from the middle across, 21.25 along.
    expect(solid(fitted, 43, 20, 0)).toBe(true);
    expect(solid(fitted, 41.5, 20, 0)).toBe(false);
    expect(solid(fitted, 0, 20, 22)).toBe(true);
    expect(solid(fitted, 0, 20, 20.5)).toBe(false);
    // The outside has not moved.
    const bounds = kernel.getBoundingBox(fitted, false);
    expect(bounds.xmax - bounds.xmin).toBeCloseTo(100, 3);
  });

  it("puts dividers across and along, on the floor", () => {
    const { original, shelled } = hollow(100, 80, 40);
    const divided = shellDividersSolid(kernel, original, shelled, { x: 1, z: 2 }, null);
    expect(kernel.getSubShapes(divided, "solid")).toHaveLength(1);
    expect(solid(divided, 0, 20, 0.3)).toBe(true);
    expect(solid(divided, 0, 20, 12)).toBe(true);
    // Along x one divider in the middle; along z two, at a third of the 76 either side of the middle (12.67).
    expect(solid(divided, 20, 20, 76 / 6)).toBe(true);
    expect(solid(divided, 20, 20, -76 / 6)).toBe(true);
    expect(solid(divided, 20, 20, 0)).toBe(false);
    expect(kernel.getVolume(divided)).toBeGreaterThan(kernel.getVolume(shelled));
  });

  /** As `hollow`, the box turned about its height by `degrees` (x towards z) before it is hollowed. */
  function hollowTurned(width: number, depth: number, height: number, degrees: number) {
    const { original } = hollow(width, depth, height);
    const angle = (degrees * Math.PI) / 180;
    const turned = kernel.transform(original, [Math.cos(angle), 0, -Math.sin(angle), 0, 0, 1, 0, 0, Math.sin(angle), 0, Math.cos(angle), 0]);
    const at = (x: number, z: number) => ({ x: x * Math.cos(angle) - z * Math.sin(angle), z: x * Math.sin(angle) + z * Math.cos(angle) });
    return { original: turned, shelled: shellSolid(kernel, turned, 2, "top"), at };
  }

  it("turns the dividers with a box that stands turned on the workplane", () => {
    const { original, shelled, at } = hollowTurned(100, 80, 40, 30);
    const divided = shellDividersSolid(kernel, original, shelled, { x: 1, z: 0 }, null);
    expect(kernel.getSubShapes(divided, "solid")).toHaveLength(1);
    // One divider across, through the middle of the box's own width: solid along the box's own depth, hollow beside it.
    for (const z of [-30, -10, 10, 30]) expect(solid(divided, at(0, z).x, 20, at(0, z).z)).toBe(true);
    for (const x of [-30, -10, 10, 30]) expect(solid(divided, at(x, 12).x, 20, at(x, 12).z)).toBe(false);
    // Along the scene's own z, where the divider of a box that was not turned would stand, it is hollow.
    expect(solid(divided, 0, 20, 25)).toBe(false);
    // As much is added as in the same box standing straight.
    const plain = hollow(100, 80, 40);
    const added = kernel.getVolume(shellDividersSolid(kernel, plain.original, plain.shelled, { x: 1, z: 0 }, null)) - kernel.getVolume(plain.shelled);
    expect(kernel.getVolume(divided) - kernel.getVolume(shelled)).toBeCloseTo(added, 0);
  });

  it("keeps across and along the box's own when it is turned by more than an eighth of a turn and its turn is told", () => {
    const { original, shelled, at } = hollowTurned(100, 80, 40, 60);
    // The editor counts the turn the other way round: this box is turned by -60 as it counts.
    const divided = shellDividersSolid(kernel, original, shelled, { x: 1, z: 0, angle: -60 }, null);
    expect(solid(divided, at(0, 25).x, 20, at(0, 25).z)).toBe(true);
    expect(solid(divided, at(25, 0).x, 20, at(25, 0).z)).toBe(false);
    // Without the turn told, the nearest reading of the rectangle is taken: the divider then runs the other way.
    const guessed = shellDividersSolid(kernel, original, shelled, { x: 1, z: 0 }, null);
    expect(solid(guessed, at(25, 0).x, 20, at(25, 0).z)).toBe(true);
  });

  it("builds dividers set by hand: from wall to wall, ending inside the box, at a slant, and in a turned box", () => {
    const { original, shelled } = hollow(100, 80, 40);
    // The inside is 96 x 76, from -48, -38. One wall along the depth 30 mm from the left; one across from the left wall to it.
    const walls = [{ dir: "z" as const, at: 30, from: 0, to: 500 }, { dir: "x" as const, at: 20, from: 0, to: 30 }];
    const divided = shellDividersSolid(kernel, original, shelled, { x: 3, z: 3, manual: true, walls }, null);
    expect(kernel.isValid(divided)).toBe(true);
    expect(kernel.getSubShapes(divided, "solid")).toHaveLength(1);
    expect(solid(divided, -18, 20, 30)).toBe(true);
    expect(solid(divided, -18, 20, -30)).toBe(true);
    expect(solid(divided, -35, 20, -18)).toBe(true);
    // The grid's counts are not built beside them, and the short wall ends at the long one.
    expect(solid(divided, 0, 20, 0)).toBe(false);
    expect(solid(divided, 10, 20, -18)).toBe(false);
    expect(kernel.getVolume(divided) - kernel.getVolume(shelled)).toBeCloseTo(1.2 * 76 * 38 + 1.2 * (30 - 0.6) * 38, -1);
    // A wall from corner to corner closes against the box's wall at both ends.
    const slanted = shellDividersSolid(kernel, original, shelled, { x: 0, z: 0, manual: true, walls: [{ dir: "x", at: 0, from: 0, to: 96, slant: 76 }] }, null);
    expect(kernel.getSubShapes(slanted, "solid")).toHaveLength(1);
    for (const f of [0.02, 0.3, 0.5, 0.7, 0.98]) expect(solid(slanted, -48 + 96 * f, 20, -38 + 76 * f)).toBe(true);
    expect(solid(slanted, 20, 20, -20)).toBe(false);
    // In a turned box the walls are measured in the box's own inside.
    const turned = hollowTurned(100, 80, 40, 30);
    const inTurned = shellDividersSolid(kernel, turned.original, turned.shelled, { x: 0, z: 0, manual: true, walls }, null);
    expect(solid(inTurned, turned.at(-18, 30).x, 20, turned.at(-18, 30).z)).toBe(true);
    expect(solid(inTurned, turned.at(-35, -18).x, 20, turned.at(-35, -18).z)).toBe(true);
    expect(solid(inTurned, turned.at(10, -18).x, 20, turned.at(10, -18).z)).toBe(false);
    expect(kernel.getVolume(inTurned) - kernel.getVolume(turned.shelled)).toBeCloseTo(kernel.getVolume(divided) - kernel.getVolume(shelled), 0);
  });

  it("runs the floor of a compartment up into a side as a finger scoop, in the compartment that holds its point", () => {
    const { original, shelled } = hollow(100, 80, 40);
    // The inside is 96 x 76 from -48, -38, the floor 2 mm thick. One divider across; a scoop at the front of the left compartment.
    const plain = shellDividersSolid(kernel, original, shelled, { x: 1, z: 0 }, null);
    const scooped = shellDividersSolid(kernel, original, shelled, { x: 1, z: 0, scoops: [{ x: 20, z: 40, side: "front" }], scoopRadius: 12 }, null);
    expect(kernel.isValid(scooped)).toBe(true);
    expect(kernel.getSubShapes(scooped, "solid")).toHaveLength(1);
    // Under the quarter round at the front wall there is material; at the back, and in the other compartment, there is none.
    expect(solid(scooped, -25, 3, 37)).toBe(true);
    expect(solid(scooped, -25, 3, -37)).toBe(false);
    expect(solid(scooped, 25, 3, 37)).toBe(false);
    // On the round itself it is hollow again: 12 mm from the wall and floor there is nothing.
    expect(solid(scooped, -25, 2 + 6, 38 - 6)).toBe(false);
    const section = 12 * 12 * (1 - Math.PI / 4);
    expect(kernel.getVolume(scooped) - kernel.getVolume(plain)).toBeGreaterThan(section * 47.4 * 0.97);
    expect(kernel.getVolume(scooped) - kernel.getVolume(plain)).toBeLessThan(section * 47.4 * 1.03);
    // Every side, and a scoop alone in a box without dividers.
    for (const side of ["back", "left", "right"] as const) {
      const made = shellDividersSolid(kernel, original, shelled, { x: 1, z: 0, scoops: [{ x: 20, z: 40, side }] }, null);
      expect(kernel.getSubShapes(made, "solid")).toHaveLength(1);
      expect(kernel.getVolume(made)).toBeGreaterThan(kernel.getVolume(plain) + 500);
    }
    const alone = shellDividersSolid(kernel, original, shelled, { x: 0, z: 0, scoops: [{ x: 48, z: 38, side: "left" }] }, null);
    expect(kernel.getSubShapes(alone, "solid")).toHaveLength(1);
    expect(solid(alone, -45, 3, 0)).toBe(true);
    expect(solid(alone, 45, 3, 0)).toBe(false);
    // In a turned box the scoop lies along the box's own side.
    const turned = hollowTurned(100, 80, 40, 30);
    const inTurned = shellDividersSolid(kernel, turned.original, turned.shelled, { x: 1, z: 0, scoops: [{ x: 20, z: 40, side: "front" }] }, null);
    expect(kernel.getSubShapes(inTurned, "solid")).toHaveLength(1);
    expect(solid(inTurned, turned.at(-25, 37).x, 3, turned.at(-25, 37).z)).toBe(true);
    expect(solid(inTurned, turned.at(-25, -37).x, 3, turned.at(-25, -37).z)).toBe(false);
    expect(kernel.getVolume(inTurned) - kernel.getVolume(turned.shelled)).toBeCloseTo(kernel.getVolume(scooped) - kernel.getVolume(shelled), -1);
  });

  it("fills the box and cuts a shaped pocket into the filling, as deep as asked and never through the floor", () => {
    const { original, shelled } = hollow(100, 80, 40);
    // The inside is 96 x 76 from -48, -38, the floor 2 mm thick. A pocket of 40 x 30 mm, 10 mm deep, 20 mm from the left and the back.
    const square = [{ x: 20, z: 20 }, { x: 60, z: 20 }, { x: 60, z: 50 }, { x: 20, z: 50 }];
    const made = shellDividersSolid(kernel, original, shelled, { x: 0, z: 0, pockets: [{ points: square, depth: 10 }] }, null);
    expect(kernel.isValid(made)).toBe(true);
    expect(kernel.getSubShapes(made, "solid")).toHaveLength(1);
    // Filled to the rim, less the pocket.
    expect(kernel.getVolume(made)).toBeCloseTo(100 * 80 * 40 - 40 * 30 * 10, -1);
    expect(solid(made, 30, 39, 30)).toBe(true);
    expect(solid(made, -8, 35, -3)).toBe(false);
    expect(solid(made, -8, 29, -3)).toBe(true);
    // Deeper than the filling it ends on the box's own floor.
    const through = shellDividersSolid(kernel, original, shelled, { x: 0, z: 0, pockets: [{ points: square, depth: 500 }] }, null);
    expect(kernel.getSubShapes(through, "solid")).toHaveLength(1);
    expect(solid(through, -8, 3, -3)).toBe(false);
    expect(solid(through, -8, 1, -3)).toBe(true);
    // A filling of 15 mm leaves the box open above it, with its divider; the pocket is cut from the filling's top.
    const low = shellDividersSolid(kernel, original, shelled, { x: 1, z: 0, pocketFill: 15, pockets: [{ points: [{ x: 10, z: 20 }, { x: 40, z: 20 }, { x: 40, z: 50 }, { x: 10, z: 50 }], depth: 8 }] }, null);
    expect(kernel.getSubShapes(low, "solid")).toHaveLength(1);
    expect(solid(low, 30, 10, 0)).toBe(true);
    expect(solid(low, 30, 25, 0)).toBe(false);
    expect(solid(low, -23, 12, -3)).toBe(false);
    expect(solid(low, -23, 6, -3)).toBe(true);
    expect(solid(low, 0, 30, 20)).toBe(true);
    // In a turned box the pocket lies where the box's own inside has it.
    const turned = hollowTurned(100, 80, 40, 30);
    const inTurned = shellDividersSolid(kernel, turned.original, turned.shelled, { x: 0, z: 0, pockets: [{ points: square, depth: 10 }] }, null);
    expect(kernel.getSubShapes(inTurned, "solid")).toHaveLength(1);
    expect(solid(inTurned, turned.at(-8, -3).x, 35, turned.at(-8, -3).z)).toBe(false);
    expect(solid(inTurned, turned.at(30, 30).x, 39, turned.at(30, 30).z)).toBe(true);
    expect(kernel.getVolume(inTurned)).toBeCloseTo(kernel.getVolume(made), -1);
  });

  it("makes dividers lower and thicker, by the Gridfinity compartments' rule (Discussion #1560)", () => {
    const { original, shelled } = hollow(100, 80, 40);
    // The floor is the 2 mm wall: 15 mm over it the dividers end at 17, not at the rim (40).
    const low = shellDividersSolid(kernel, original, shelled, { x: 1, z: 0, height: 15, thickness: 2.4 }, null);
    expect(kernel.getSubShapes(low, "solid")).toHaveLength(1);
    expect(solid(low, 0, 16.9, 5)).toBe(true);
    expect(solid(low, 0, 17.1, 5)).toBe(false);
    // 2.4 mm thick: 1 mm off the middle is still in it.
    expect(solid(low, 1, 10, 5)).toBe(true);
    // At least 3 mm over the floor.
    const lowest = shellDividersSolid(kernel, original, shelled, { x: 1, z: 0, height: 1 }, null);
    expect(solid(lowest, 0, 4.8, 5)).toBe(true);
    expect(solid(lowest, 0, 5.1, 5)).toBe(false);
    // Within 0.1 mm of the rim, or over it: up to the rim.
    const full = shellDividersSolid(kernel, original, shelled, { x: 1, z: 0, height: 37.95 }, null);
    expect(solid(full, 0, 39.9, 5)).toBe(true);
    // The default stays 1.2 mm thick: 1 mm off the middle is open.
    const plain = shellDividersSolid(kernel, original, shelled, { x: 1, z: 0 }, null);
    expect(solid(plain, 1, 10, 5)).toBe(false);
  });

  it("ends the dividers level with a shelf ledge, so the shelf plate lies on them too", () => {
    const { original, shelled } = hollow(100, 80, 40);
    const under = shellDividersSolid(kernel, original, shelled, { x: 1, z: 0 }, null, 10);
    expect(solid(under, 0, 9.9, 5)).toBe(true);
    expect(solid(under, 0, 10.1, 5)).toBe(false);
    // A height set lower than the ledge stays lower.
    const lower = shellDividersSolid(kernel, original, shelled, { x: 1, z: 0, height: 4 }, null, 10);
    expect(solid(lower, 0, 6.1, 5)).toBe(false);
  });

  it("ends the dividers of a stackable box under the foot of the box above, so that box stands on the rim", () => {
    const { original, shelled } = hollow(100, 80, 40);
    // As the worker does it: the foot first, then the dividers on its raised floor (3 + 2.25 + 2 mm).
    const footed = shellStackSolid(kernel, shelled, 3, 2, original);
    const floor = shellStackFloor(3, 2);
    const stacked = shellDividersSolid(kernel, original, footed, { x: 1, z: 1 }, floor, null, shellStackRoom(3));
    expect(kernel.isValid(stacked)).toBe(true);
    expect(kernel.getSubShapes(stacked, "solid")).toHaveLength(1);
    // The foot is 3 mm high and goes that deep into the box below; the dividers end the play lower, 3.25 mm under the rim.
    expect(solid(stacked, 0, 36.6, 20)).toBe(true);
    expect(solid(stacked, 0, 36.9, 20)).toBe(false);
    // The same box set on its rim: the two do not meet. With the dividers up to the rim its foot stood in them.
    const above = kernel.translate(stacked, 0, 37, 0);
    expect(kernel.getVolume(kernel.common(stacked, above))).toBeLessThan(1e-6);
    const toRim = shellDividersSolid(kernel, original, footed, { x: 1, z: 1 }, floor);
    expect(kernel.getVolume(kernel.common(toRim, kernel.translate(toRim, 0, 37, 0)))).toBeGreaterThan(1);
    // A height set lower stays lower.
    const low = shellDividersSolid(kernel, original, footed, { x: 1, z: 0, height: 10 }, floor, null, shellStackRoom(3));
    expect(solid(low, 0, floor + 9.9, 20)).toBe(true);
    expect(solid(low, 0, floor + 10.1, 20)).toBe(false);
    // A box too low to keep a divider under the foot says so.
    const flat = hollow(100, 80, 11);
    const flatFooted = shellStackSolid(kernel, flat.shelled, 3, 2, flat.original);
    expect(() => shellDividersSolid(kernel, flat.original, flatFooted, { x: 1, z: 0 }, floor, null, shellStackRoom(3))).toThrow(/dividers could not be built/);
  });

  it("stands on a Gridfinity floor, with dividers and a stack", () => {
    const { original, shelled } = hollow(100, 80, 40);
    // As the worker does it: the foot first, the sockets on its floor, then the dividers.
    const stacked0 = shellStackSolid(kernel, shelled, 3, 2, original);
    const lift = 3 + 2.25 + 2 - 1.2;
    const grid = shellGridSolid(kernel, original, stacked0, { cells: 99, fit: false }, lift);
    const stacked = shellDividersSolid(kernel, original, grid, { x: 1, z: 0 }, lift + SHELL_GRID_FLOOR);
    expect(kernel.isValid(stacked)).toBe(true);
    expect(kernel.getSubShapes(stacked, "solid")).toHaveLength(1);
  });

  it("fits a round box: the cells that lie within the circle, the walls thickened to them", () => {
    const cylinder = yUp(kernel.makeCylinder(60, 40));
    const shelled = shellSolid(kernel, cylinder, 2, "top");
    const grid = shellGridSolid(kernel, cylinder, shelled, { cells: 99, fit: true });
    expect(kernel.isValid(grid)).toBe(true);
    expect(kernel.getSubShapes(grid, "solid")).toHaveLength(1);
    // The inside is a circle of 58; whole cells lie in it, with a socket in the middle of the one nearest the centre.
    const cells = [-21, 21].flatMap((x) => [-21, 21].map((z) => !solid(grid, x, SHELL_GRID_FLOOR - 0.5, z)));
    expect(cells.filter(Boolean).length).toBeGreaterThanOrEqual(1);
    const bounds = kernel.getBoundingBox(grid, false);
    expect(bounds.xmax - bounds.xmin).toBeCloseTo(120, 3);
  });

  it("says why it cannot", () => {
    const low = hollow(100, 80, 8);
    expect(() => shellGridSolid(kernel, low.original, low.shelled, { cells: 3, fit: false })).toThrow(/too low/);
    const small = hollow(30, 30, 40);
    expect(() => shellGridSolid(kernel, small.original, small.shelled, { cells: 3, fit: false })).toThrow(/whole Gridfinity cell/);
    const sealed = shellSolid(kernel, yUp(kernel.makeBox(100, 80, 40)), 2, "none");
    expect(() => shellGridSolid(kernel, sealed, sealed, { cells: 3, fit: false })).toThrow(/only its top open/);
  });
});
