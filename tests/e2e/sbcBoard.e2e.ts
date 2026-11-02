import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
// The exact kernel (Manifold) loads its files relative to the page; in node they are the public folder.
(globalThis as unknown as { window: unknown }).window = { location: { href: pathToFileURL(resolve("apps/web/public") + "/").href } };
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
    const pcbParts = pcb.groupedShapes ?? [];
    expect(pcbParts.filter((part) => part.hole && part.kind === "cylinder")).toHaveLength(board.holes.length);
    expect(pcbParts.filter((part) => !part.hole && part.kind === "roundedBox")).toHaveLength(1);
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
    expect(shape.height).toBeCloseTo(extent.height, 3);
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
    expect(grown.height).toBeCloseTo(plain.height + 0.4, 3);
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
});
