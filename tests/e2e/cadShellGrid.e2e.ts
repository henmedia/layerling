import { beforeAll, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { OcctKernel, type ShapeHandle } from "occt-wasm";
import { shellSolid } from "@/lib/cadShell";
import { shellDividersSolid, shellGridSolid } from "@/lib/cadShellGrid";
import { shellStackSolid } from "@/lib/cadShellStack";
import { shellStackFloor, shellStackRoom } from "@/lib/shellStackLimits";
import { SHELL_GRID_FLOOR, SHELL_GRID_SCREW_DIAMETER, SHELL_GRID_SCREW_HEAD, SHELL_GRID_SCREW_SINK, shellGridFloor } from "@/lib/shellGridLimits";

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

  it("cuts a countersunk screw hole through the middle of each socket, with the floor of the magnet holes (Discussion #1693)", () => {
    const { original, shelled } = hollow(100, 80, 40);
    const plain = shellGridSolid(kernel, original, shelled, { cells: 99, fit: false, magnets: true });
    const screws = shellGridSolid(kernel, original, shelled, { cells: 99, fit: false, screws: true });
    expect(kernel.isValid(screws)).toBe(true);
    expect(kernel.getSubShapes(screws, "solid")).toHaveLength(1);
    // The floor is as thick with screw holes alone as with magnet holes, and no thicker with both.
    const floor = shellGridFloor({ screws: true });
    expect(floor).toBeCloseTo(SHELL_GRID_FLOOR + 2.4, 6);
    expect(shellGridFloor({ magnets: true, screws: true })).toBeCloseTo(floor, 6);
    const socketBottom = floor - 5;
    for (const cx of [-21, 21]) {
      // Open from under the box up into the socket: 4.5 mm wide below the sink.
      for (const y of [0.05, 1, socketBottom - SHELL_GRID_SCREW_SINK - 0.1, socketBottom - 0.1]) expect(solid(screws, cx, y, 0), `y ${y}`).toBe(false);
      expect(solid(screws, cx + SHELL_GRID_SCREW_DIAMETER / 2 - 0.1, 0.5, 0)).toBe(false);
      expect(solid(screws, cx + SHELL_GRID_SCREW_DIAMETER / 2 + 0.1, 0.5, 0)).toBe(true);
      // The sink widens at 45 degrees to the head's width at the socket's bottom.
      expect(solid(screws, cx + SHELL_GRID_SCREW_HEAD / 2 - 0.2, socketBottom - 0.05, 0)).toBe(false);
      expect(solid(screws, cx + SHELL_GRID_SCREW_HEAD / 2 + 0.2, socketBottom - 0.05, 0)).toBe(true);
      expect(solid(screws, cx + SHELL_GRID_SCREW_HEAD / 2 - 0.2, socketBottom - 1, 0)).toBe(true);
      // Where the magnets would sit the floor stays closed.
      expect(solid(screws, cx + 13, socketBottom - 1.2, 13)).toBe(true);
    }
    // Two holes less than the floor with the magnets' thickness and their eight holes more: a bore and a cone's frustum each.
    const r = SHELL_GRID_SCREW_DIAMETER / 2, R = SHELL_GRID_SCREW_HEAD / 2, h = SHELL_GRID_SCREW_SINK;
    const hole = Math.PI * r * r * (socketBottom - h) + (Math.PI * h * (r * r + r * R + R * R)) / 3;
    const magnetHoles = 8 * Math.PI * 3.25 * 3.25 * 2.4;
    expect(kernel.getVolume(screws) - kernel.getVolume(plain)).toBeCloseTo(magnetHoles - 2 * hole, 0);
    // Both together: the magnet holes stay, the screw hole goes between them.
    const both = shellGridSolid(kernel, original, shelled, { cells: 99, fit: false, magnets: true, screws: true });
    expect(kernel.getSubShapes(both, "solid")).toHaveLength(1);
    expect(kernel.getVolume(both) - kernel.getVolume(plain)).toBeCloseTo(-2 * hole, 0);
    expect(solid(both, -21 + 13, socketBottom - 1.2, 13)).toBe(false);
    expect(solid(both, -21, 0.5, 0)).toBe(false);
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
