import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
// The exact kernel (Manifold) loads its files relative to the page; in node they are the public folder.
(globalThis as unknown as { window: unknown }).window = { location: { href: pathToFileURL(resolve("apps/web/public") + "/").href } };
import * as THREE from "three";
import { buildGroupedShapeFromSelection } from "@/lib/editorBooleans";
import { stepSourceForShape } from "@/lib/stepExport";
import { regeneratedSbcBoardShape, sbcBoardOf, sbcBoardShape } from "@/lib/editorSbcBoard";
import { portContourPoints } from "@/lib/portGeometry";
import { SBC_BOARDS, SBC_BOARD_ORDER, sbcBoardExtent, sbcBoardSolids, type SbcSolid } from "@/lib/sbcBoards";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * The SBC board (#1098) built as the editor builds it, with the real Manifold kernel: a group of
 * the drilled board and a box for every part, every leaf a shape with an exact body, as large as
 * the board and what stands out of it, and a case wall it cuts when it is a hole.
 */

const LIMIT = 250_000;

/** The volume of a closed triangle soup, from the signed tetrahedra to the origin. */
function meshVolume(positions: readonly number[]) {
  let volume = 0;
  for (let i = 0; i < positions.length; i += 9) {
    const [ax, ay, az, bx, by, bz, cx, cy, cz] = positions.slice(i, i + 9);
    volume += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
  }
  return Math.abs(volume);
}

/** The area of a solid's section across the way it runs (a socket's outline, as the display mesh draws it), in mm². */
function sectionArea(solid: SbcSolid) {
  const across = solid.profile?.along === "x" ? solid.y1 - solid.y0 : solid.x1 - solid.x0;
  const height = solid.top - solid.bottom;
  if (!solid.profile) return across * height;
  const points = portContourPoints(across, height, solid.profile.corner, undefined, solid.profile.portProfile);
  return Math.abs(points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + point.x * next.y - next.x * point.y;
  }, 0)) / 2;
}

function leaves(shape: WorkplaneShape): WorkplaneShape[] {
  return shape.groupedShapes?.length ? shape.groupedShapes.flatMap(leaves) : [shape];
}

describe("the SBC board as a group", () => {
  it.each(SBC_BOARD_ORDER)("builds %s with its holes and parts", async (type) => {
    const board = SBC_BOARDS[type];
    const shape = await sbcBoardShape({ board: type, clearance: 0 }, LIMIT);
    expect(shape.name).toBe(board.name);
    expect(shape.groupOperation).toBe("group");
    expect(sbcBoardOf(shape)).toEqual({ board: type, clearance: 0, reach: 0 });
    expect(shape.hole).toBeFalsy();

    // The drilled board first, then a box for each part.
    const children = shape.groupedShapes ?? [];
    const solids = sbcBoardSolids(board, 0, 0);
    expect(children).toHaveLength(1 + solids.length);
    const pcb = children[0];
    expect(pcb.name).toBe("Board");
    expect(pcb.color).toBe(board.color);
    // A board without mounting holes is the plate itself, a plain box when its corners are square.
    // A board with corners rounded further is the cut plate and its quarter rounds beside it.
    const rounds = board.outline?.round?.length ?? 0;
    if (rounds > 0) expect(pcb.groupedShapes!.slice(1).map((part) => part.name)).toEqual(Array(rounds).fill("Corner"));
    const plateShape = rounds > 0 ? pcb.groupedShapes![0] : pcb;
    const pcbParts = plateShape.groupedShapes?.length ? plateShape.groupedShapes : [plateShape];
    expect(pcbParts.filter((part) => part.hole && part.kind === "cylinder")).toHaveLength(board.holes.length);
    // The plate, and the pieces of its own outline (the UNO) added to it and cut from it.
    expect(pcbParts.filter((part) => !part.hole && part.kind === (board.cornerRadius > 0 ? "roundedBox" : "box"))).toHaveLength(board.cornerRadius > 0 ? 1 : 1 + (board.outline?.add.length ?? 0));
    // A corner rounded further has a square cut off the plate, where its quarter round goes.
    expect(pcbParts.filter((part) => !part.hole)).toHaveLength(1 + (board.outline?.add.length ?? 0));
    expect(pcbParts.filter((part) => part.hole && part.kind === "box")).toHaveLength((board.outline?.cut.length ?? 0) + (board.outline?.round?.length ?? 0));
    if (board.holes.length === 0 && !board.outline) expect(pcb.groupedShapes ?? []).toEqual([]);
    expect(children.slice(1).map((child) => child.name)).toEqual(solids.map((solid) => solid.name));
    // A socket is a solid Port opening in its outline, everything else a box.
    children.slice(1).forEach((child, index) => {
      expect(child.kind).toBe(solids[index].profile ? "port" : "box");
      expect(child.hole).toBeFalsy();
      if (solids[index].profile) expect(child.portProfile ?? "rounded").toBe(solids[index].profile!.portProfile);
    });
    // Every part of the board's data is there.
    for (const part of board.parts) expect(children.some((child) => child.name === part.name), part.name).toBe(true);

    // Every leaf has an exact body, so the edge tool and the STEP export can build the whole.
    for (const leaf of leaves(shape)) expect(stepSourceForShape(leaf), `${type} ${leaf.name}`).not.toBe("unsupported");

    // As large as the board and what stands out of it.
    const extent = sbcBoardExtent(board, 0);
    expect(shape.width).toBeCloseTo(extent.maxX - extent.minX, 3);
    expect(shape.depth).toBeCloseTo(extent.maxY - extent.minY, 3);
    // From its lowest point, the card slot under the board (none on the Zero), to its highest; standing on it.
    expect(shape.height).toBeCloseTo(extent.height - extent.bottom, 3);
    expect(shape.elevation ?? 0).toBeCloseTo(0, 6);
  });

  it("lays the board out true to the drawing: front edge towards +z, holes where the drawing has them", async () => {
    const board = SBC_BOARDS.pi5;
    const shape = await sbcBoardShape({ board: "pi5", clearance: 0 }, LIMIT);
    const extent = sbcBoardExtent(board, 0);
    const midX = (extent.minX + extent.maxX) / 2;
    const midY = (extent.minY + extent.maxY) / 2;
    const pcb = shape.groupedShapes![0];
    const holes = pcb.groupedShapes!.filter((part) => part.hole);
    // Children are kept relative to their group's middle; the group stands at the origin.
    const world = holes.map((hole) => [hole.x + pcb.x + shape.x, hole.z + pcb.z + shape.z]);
    const expected = board.holes.map(([x, y]) => [x - midX, midY - y]);
    for (const [x, z] of expected) expect(world.some(([wx, wz]) => Math.abs(wx - x) < 1e-3 && Math.abs(wz - z) < 1e-3), `${x}, ${z}`).toBe(true);
    for (const hole of holes) expect(hole.width).toBeCloseTo(board.holeDiameter, 6);
    // The power socket is on the front edge, the side towards the viewer.
    const power = shape.groupedShapes!.find((child) => child.name === "USB-C power")!;
    expect(power.z + shape.z).toBeGreaterThan(0);
    const ethernet = shape.groupedShapes!.find((child) => child.name === "Ethernet")!;
    expect(ethernet.x + shape.x).toBeGreaterThan(0);
  });

  it("gives the Arduino UNO the outline of Arduino's PCB file: the step, the 45° ends and the cut corner", async () => {
    const board = SBC_BOARDS.arduinoUno;
    const shape = await sbcBoardShape({ board: "arduinoUno", clearance: 0 }, LIMIT);
    const pcb = shape.groupedShapes![0];
    // The file's outline: 66.04 x 53.34 mm, three corners 1 mm round, the back right one cut 1.524 mm at 45°,
    // and the step out to 68.58 mm from (66.04, 2.54) over (68.58, 5.08) and (68.58, 37.846) to (66.04, 40.386).
    const area = 66.04 * 53.34 - 3 * (1 - Math.PI / 4) - 1.524 ** 2 / 2 + 2.54 * (37.846 - 2.54 + (37.846 - 5.08)) / 2 - 4 * Math.PI * 1.6 ** 2;
    expect(meshVolume(pcb.importedMesh!.positions) / (area * board.thickness)).toBeCloseTo(1, 2);
    expect(pcb.width).toBeCloseTo(68.58, 3);
    expect(pcb.depth).toBeCloseTo(53.34, 3);
    // The mounting holes in the step: where the file has them.
    const extent = sbcBoardExtent(board, 0);
    const midX = (extent.minX + extent.maxX) / 2;
    const midY = (extent.minY + extent.maxY) / 2;
    const holes = pcb.groupedShapes!.filter((part) => part.hole && part.kind === "cylinder");
    const world = holes.map((hole) => [hole.x + pcb.x + shape.x, hole.z + pcb.z + shape.z]);
    for (const [x, y] of board.holes) expect(world.some(([wx, wz]) => Math.abs(wx - (x - midX)) < 1e-3 && Math.abs(wz - (midY - y)) < 1e-3), `${x}, ${y}`).toBe(true);
  });

  it("gives the D1 mini the outline of Wemos's drawing: round antenna corners, the notch and its slant", async () => {
    const board = SBC_BOARDS.wemosD1Mini;
    const shape = await sbcBoardShape({ board: "wemosD1Mini", clearance: 0 }, LIMIT);
    const pcb = shape.groupedShapes![0];
    const area = 34.3 * 25.4 - (1 - Math.PI / 4) * (1 + 16 + 16 + 1) - 6.8 * 1.9 - (0.9 * 1.9) / 2;
    expect(meshVolume(pcb.importedMesh!.positions) / (area * board.thickness)).toBeCloseTo(1, 2);
    expect(pcb.width).toBeCloseTo(34.3, 3);
    expect(pcb.depth).toBeCloseTo(25.4, 3);
    // No mounting holes: the drawing's two beside the antenna are left out.
    expect(pcb.groupedShapes![0].groupedShapes!.filter((part) => part.hole && part.kind === "cylinder")).toEqual([]);
  });

  it("cuts the Feather's holes each at its own diameter", async () => {
    const shape = await sbcBoardShape({ board: "featherEsp32s3", clearance: 0 }, LIMIT);
    const holes = shape.groupedShapes![0].groupedShapes!.filter((part) => part.hole);
    expect(holes.map((hole) => hole.width).sort()).toEqual([2.2, 2.2, 2.5, 2.5]);
  });

  it("grows the edge connectors by the clearance and keeps the board as it is", async () => {
    const plain = await sbcBoardShape({ board: "pi5", clearance: 0 }, LIMIT);
    const grown = await sbcBoardShape({ board: "pi5", clearance: 0.4 }, LIMIT);
    // The USB-C socket: its 8.94 x 3.26 mm outline grows 0.4 mm on every side, its ends stay round.
    const power = grown.groupedShapes!.find((child) => child.name === "USB-C power")!;
    expect(power.kind).toBe("port");
    expect(power.width).toBeCloseTo(8.94 + 0.8, 6);
    expect(power.height).toBeCloseTo(3.26 + 0.8, 6);
    expect(power.cornerFillet).toBeCloseTo((3.26 + 0.8) / 2, 6);
    const plainPower = plain.groupedShapes!.find((child) => child.name === "USB-C power")!;
    expect(plainPower.width).toBeCloseTo(8.94, 6);
    expect(plainPower.height).toBeCloseTo(3.26, 6);
    expect(plainPower.cornerFillet).toBeCloseTo(1.63, 6);
    const soc = (shape: WorkplaneShape) => shape.groupedShapes!.find((child) => child.name === "SoC")!;
    expect([soc(grown).width, soc(grown).depth, soc(grown).height]).toEqual([soc(plain).width, soc(plain).depth, soc(plain).height]);
    expect(grown.groupedShapes![0].width).toBeCloseTo(plain.groupedShapes![0].width, 6);
    // 0.4 mm higher on top, and the card slot 0.4 mm deeper under the board.
    expect(grown.height).toBeCloseTo(plain.height + 0.8, 3);
    // The micro-HDMI keeps its cut lower corners.
    expect(grown.groupedShapes!.find((child) => child.name === "micro-HDMI 0")!.portProfile).toBe("microHdmi");
  });

  it("is made again where it stood, with another board", async () => {
    const first = await sbcBoardShape({ board: "pi5", clearance: 0 }, LIMIT);
    const placed: WorkplaneShape = { ...first, x: 40, z: -25, elevation: 6, rotation: 90, locked: false };
    const next = await regeneratedSbcBoardShape(placed, { board: "pi4", clearance: 0.3 }, LIMIT);
    expect([next.id, next.x, next.z, next.elevation, next.rotation]).toEqual([placed.id, 40, -25, 6, 90]);
    expect(next.name).toBe(SBC_BOARDS.pi4.name);
    expect(sbcBoardOf(next)).toEqual({ board: "pi4", clearance: 0.3, reach: 0 });
    // A name somebody gave is kept.
    const renamed = await regeneratedSbcBoardShape({ ...placed, name: "Printer Pi" }, { board: "zero2w", clearance: 0 }, LIMIT);
    expect(renamed.name).toBe("Printer Pi");
  });

  it("keeps every board on its mounting holes when any setting changes, only the connectors grow", async () => {
    /** The leaves of a shape with their places in it: a group's parts are kept from its middle across, from its bottom up. */
    type Placed = { leaf: WorkplaneShape; x: number; z: number; elevation: number };
    const leavesOf = (shape: WorkplaneShape, x = 0, z = 0, elevation = 0): Placed[] => (shape.groupedShapes?.length
      ? shape.groupedShapes.flatMap((child) => leavesOf(child, x + child.x, z + child.z, elevation + (child.elevation ?? 0)))
      : [{ leaf: shape, x, z, elevation }]);
    /**
     * The world places that pin the board down, read off the built group itself: each mounting hole's
     * middle on the board's top face, or for a board without holes the middle of the board. The group
     * stands as the editor draws it: turned about the middle of its box (x, elevation + height / 2, z).
     */
    const pins = (shape: WorkplaneShape) => {
      const pcb = shape.groupedShapes![0];
      const thickness = SBC_BOARDS[sbcBoardOf(shape)!.board].thickness;
      const holes = leavesOf(pcb, pcb.x, pcb.z, pcb.elevation ?? 0).filter(({ leaf }) => leaf.hole && leaf.kind === "cylinder");
      // A hole stands 0.5 mm below the board, through it: the board's top face is its own bottom plus the thickness.
      const marks = holes.length > 0 ? holes.map((hole) => ({ ...hole, elevation: pcb.elevation ?? 0 })) : [{ leaf: pcb, x: pcb.x, z: pcb.z, elevation: pcb.elevation ?? 0 }];
      const turn = new THREE.Quaternion().setFromEuler(new THREE.Euler(
        THREE.MathUtils.degToRad(shape.rotationX ?? 0), THREE.MathUtils.degToRad(shape.rotation ?? 0), THREE.MathUtils.degToRad(shape.rotationZ ?? 0), "XYZ",
      ));
      const middle = new THREE.Vector3(shape.x, (shape.elevation ?? 0) + shape.height / 2, shape.z);
      return marks.map((mark) => new THREE.Vector3(mark.x, mark.elevation + thickness - shape.height / 2, mark.z).applyQuaternion(turn).add(middle));
    };
    const most = { clearance: 2, reach: 10, buttonReach: 100, lensUp: true, ribbonUp: true, ribbonSide: true, gpioUp: true, upReach: 100 };
    const turns = [{ rotation: 0 }, { rotation: 90 }, { rotation: 37, rotationX: 20, rotationZ: -15 }];
    for (const type of SBC_BOARD_ORDER) {
      const first = await sbcBoardShape({ board: type, clearance: 0 }, LIMIT);
      for (const turn of turns) {
        const placed: WorkplaneShape = { ...first, x: 40, z: -25, elevation: 6, ...turn, locked: false };
        const before = pins(placed);
        // Every setting at its most, then one at a time, then all back to nothing: the holes never move.
        let current = placed;
        for (const settings of [most, { clearance: 0.4 }, { clearance: 0, reach: 3 }, { clearance: 0, buttonReach: 12 }, { clearance: 0, ribbonSide: true, reach: 5 }, { clearance: 0 }]) {
          current = await regeneratedSbcBoardShape(current, { board: type, ...settings }, LIMIT);
          const after = pins(current);
          expect(after.length, `${type}`).toBe(before.length);
          after.forEach((point, index) => {
            const label = `${type} turned ${JSON.stringify(turn)} with ${JSON.stringify(settings)}, hole ${index}`;
            // Within 0.1 µm: the bodies are kept in 32-bit floats, nothing more.
            expect(point.distanceTo(before[index]), label).toBeLessThan(1e-4);
          });
        }
        // Back to nothing it stands exactly where it was put.
        expect([current.x, current.z, current.elevation], `${type} ${JSON.stringify(turn)}`).toEqual([expect.closeTo(40, 6), expect.closeTo(-25, 6), expect.closeTo(6, 6)]);
      }
    }
  }, 600_000);

  it("cuts a case wall when it is a hole", async () => {
    const board = await sbcBoardShape({ board: "pi5", clearance: 0.3 }, LIMIT);
    const extent = sbcBoardExtent(SBC_BOARDS.pi5, 0.3);
    const midY = (extent.minY + extent.maxY) / 2;
    // A 2 mm wall across the front edge of the board, standing on the plate: the power and HDMI sockets reach into it.
    const wallZ = midY + 0.5;
    const wall = {
      id: "wall", name: "wall", kind: "box", color: "#cccccc", x: 0, z: wallZ, elevation: 0,
      size: 100, width: 100, depth: 2, height: 20, rotation: 0,
    } as unknown as WorkplaneShape;
    const result = await buildGroupedShapeFromSelection([wall, { ...board, hole: true }], LIMIT);
    expect(result.group, result.failureNotice).not.toBeNull();
    expect(result.group!.groupedShapes).toHaveLength(2);
    // The wall loses at least what the grown power and HDMI sockets take of it: the wall covers the
    // board's frame from y = -1.5 to y = 0.5, the sockets reach from their front to y = 0.5 there.
    const taken = sbcBoardSolids(SBC_BOARDS.pi5, 0.3)
      .filter((solid) => ["USB-C power", "micro-HDMI 0", "micro-HDMI 1"].includes(solid.name))
      .reduce((sum, solid) => sum + sectionArea(solid) * (0.5 - Math.max(-1.5, solid.y0)), 0);
    expect(taken).toBeGreaterThan(40);
    const volume = meshVolume(result.group!.importedMesh!.positions);
    expect(volume).toBeLessThan(100 * 2 * 20 - taken * 0.95);
    expect(volume).toBeGreaterThan(100 * 2 * 20 - taken - 400);
  });

  it("cuts through a wall thicker than the sockets stand out, with the reach", async () => {
    const reachWall = async (reach: number) => {
      const board = await sbcBoardShape({ board: "pi5", clearance: 0, reach }, LIMIT);
      const extent = sbcBoardExtent(SBC_BOARDS.pi5, 0, reach);
      const midY = (extent.minY + extent.maxY) / 2;
      // A 3 mm wall against the front edge of the board, from y = 0 to y = -3 in the board's frame.
      const wall = {
        id: "wall", name: "wall", kind: "box", color: "#cccccc", x: 0, z: midY + 1.5, elevation: 0,
        size: 100, width: 100, depth: 3, height: 20, rotation: 0,
      } as unknown as WorkplaneShape;
      const result = await buildGroupedShapeFromSelection([wall, { ...board, hole: true }], LIMIT);
      expect(result.group, result.failureNotice).not.toBeNull();
      return meshVolume(result.group!.importedMesh!.positions);
    };
    const front = ["USB-C power", "micro-HDMI 0", "micro-HDMI 1"];
    const sockets = sbcBoardSolids(SBC_BOARDS.pi5, 0, 0).filter((solid) => front.includes(solid.name));
    expect(sockets).toHaveLength(3);
    // Without reach the sockets take only what they stand out, in their own outline: 1.2 and 1.4 mm of the 3 mm wall.
    const partly = sockets.reduce((sum, solid) => sum + sectionArea(solid) * -solid.y0, 0);
    // With 3 mm more they take the whole 3 mm of it.
    const through = sockets.reduce((sum, solid) => sum + sectionArea(solid) * 3, 0);
    const wallVolume = 100 * 3 * 20;
    expect(await reachWall(0)).toBeCloseTo(wallVolume - partly, 0);
    expect(await reachWall(3)).toBeCloseTo(wallVolume - through, 0);
  });

  it("cuts the microSD card's way through the left wall under the board, with the reach", async () => {
    const cut = async (reach: number) => {
      const board = await sbcBoardShape({ board: "pi5", clearance: 0, reach }, LIMIT);
      const extent = sbcBoardExtent(SBC_BOARDS.pi5, 0, reach);
      const midX = (extent.minX + extent.maxX) / 2;
      const midY = (extent.minY + extent.maxY) / 2;
      // A 2 mm wall 1 to 3 mm left of the board, 1 mm high from the bottom: under the board, past the power button.
      const wall = {
        id: "wall", name: "wall", kind: "box", color: "#cccccc", x: -2 - midX, z: midY - 28, elevation: 0,
        size: 40, width: 2, depth: 40, height: 1, rotation: 0,
      } as unknown as WorkplaneShape;
      const result = await buildGroupedShapeFromSelection([wall, { ...board, hole: true }], LIMIT);
      // Nothing to cut: the grouping is refused, as for any hole that misses its body.
      return result.group ? meshVolume(result.group.importedMesh!.positions) : null;
    };
    // Without the reach the slot ends at the board's edge and misses the wall.
    expect(await cut(0)).toBeNull();
    // The slot is 11.95 mm wide (22.11 to 34.06 in the model) and stands under the board from the bottom.
    expect(await cut(3)).toBeCloseTo(2 * 40 * 1 - 2 * 11.95 * 1, 1);
  });

  it("cuts the GPIO header through a lid when it is asked to open up", async () => {
    const cut = async (gpioUp: boolean) => {
      const board = await sbcBoardShape({ board: "pi5", clearance: 0, ...(gpioUp ? { gpioUp } : {}) }, LIMIT);
      // A 2 mm lid 20 mm over the bottom, above every part (the USB-A housings end at 18.9).
      const lid = {
        id: "lid", name: "lid", kind: "box", color: "#cccccc", x: 0, z: 0, elevation: 20,
        size: 100, width: 100, depth: 70, height: 2, rotation: 0,
      } as unknown as WorkplaneShape;
      const result = await buildGroupedShapeFromSelection([lid, { ...board, hole: true }], LIMIT);
      return result.group ? meshVolume(result.group.importedMesh!.positions) : null;
    };
    // Without it nothing reaches the lid.
    expect(await cut(false)).toBeNull();
    // The header is 50.8 x 5 mm and now reaches 20 mm over its top (9.88 + 1.42 + 20 = 31.3 from the bottom).
    expect(await cut(true)).toBeCloseTo(100 * 70 * 2 - 50.8 * 5 * 2, 0);
  });
});
