import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
// @ts-expect-error the tool list is a plain .mjs module
import { tools } from "../../scripts/layerling-mcp-tools.mjs";
import { editorHistoryEntry } from "@/lib/editorHistory";
import { guideSectionForShape } from "@/lib/guideLinks";
import { exportLylProject, importLylProject, type LylProjectDocumentV1 } from "@/lib/lylProject";
import {
  DEFAULT_SBC_BOARD,
  MAX_SBC_CLEARANCE,
  MAX_SBC_REACH,
  SBC_BOARDS,
  SBC_BOARD_ORDER,
  normalizeSbcBoardSettings,
  normalizeSbcClearance,
  normalizeSbcReach,
  sbcBoardBlocks,
  sbcBoardExtent,
  sbcBoardSolids,
  sbcPartAtEdge,
  sbcPartEdges,
} from "@/lib/sbcBoards";
import { displayShapeName, libraryShapeAssets, makeShapeFromAsset, sbcBoardAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";
import { canonicalizeShape, workplaneShapesEqual } from "@/lib/workplaneShapes";
import type { SbcBoardSettings, WorkplaneShape } from "@/types/layerling";

/** A body carrying board settings; what carries them does not matter to the project file. */
function boardBody(id: string, sbcBoard: SbcBoardSettings = { board: "pi4", clearance: 0.3 }): WorkplaneShape {
  const box = makeShapeFromAsset(toolbarShapeAssets.find((asset) => asset.id === "box")!);
  return canonicalizeShape({ ...box, id, name: "Raspberry Pi 4 Model B", sbcBoard });
}

async function exported(shapes: WorkplaneShape[]) {
  return exportLylProject({
    projectId: "sbc",
    projectName: "SBC",
    createdAt: 1_700_000_000_000,
    modifiedAt: 1_700_000_100_000,
    shapes,
    history: [editorHistoryEntry(shapes, [])],
    historyIndex: 0,
    assets: [],
    workspace: DEFAULT_WORKPLANE_WORKSPACE,
    snapGrid: DEFAULT_SNAP_GRID,
    placementElevation: 0,
  });
}

async function withDefinition(patch: Record<string, unknown>) {
  const files = unzipSync(await exported([boardBody("board")]));
  const document = JSON.parse(strFromU8(files["project.json"])) as LylProjectDocumentV1;
  document.states.forEach((state) => state.nodes.forEach((node) => Object.assign(node.definition, patch)));
  files["project.json"] = strToU8(JSON.stringify(document));
  return zipSync(files);
}

describe("SBC board data (#1098)", () => {
  it("has every board in the list, the Raspberry Pi 5 first", () => {
    expect(SBC_BOARD_ORDER).toEqual(["pi5", "pi4", "pi3bPlus", "zero2w", "bttPi12"]);
    expect(DEFAULT_SBC_BOARD).toBe("pi5");
    for (const type of SBC_BOARD_ORDER) expect(SBC_BOARDS[type].type).toBe(type);
  });

  it("matches the makers' outlines and mounting holes", () => {
    // Raspberry Pi 5, 4 and 3 B+: 85 x 56 mm, holes 58 x 49 mm apart, 3.5 mm in from the edges (Raspberry Pi mechanical drawings).
    for (const type of ["pi5", "pi4", "pi3bPlus"] as const) {
      const board = SBC_BOARDS[type];
      expect([board.width, board.depth]).toEqual([85, 56]);
      expect(board.holes).toEqual([[3.5, 3.5], [61.5, 3.5], [3.5, 52.5], [61.5, 52.5]]);
      expect(board.cornerRadius).toBe(3);
    }
    // Zero 2 W: 65 x 30 mm, holes 58 x 23 mm apart.
    expect([SBC_BOARDS.zero2w.width, SBC_BOARDS.zero2w.depth]).toEqual([65, 30]);
    expect(SBC_BOARDS.zero2w.holes).toEqual([[3.5, 3.5], [61.5, 3.5], [3.5, 26.5], [61.5, 26.5]]);
    // BIGTREETECH Pi V1.2: its holes are not on the Raspberry Pi's grid at the back.
    expect(SBC_BOARDS.bttPi12.holes).toEqual([[3.3, 3.3], [61.54, 3.3], [3.3, 52.7], [67.35, 52.7]]);
    expect(SBC_BOARDS.bttPi12.holeDiameter).toBe(2.5);
  });

  it("keeps every hole on its board and every part over or at it", () => {
    for (const type of SBC_BOARD_ORDER) {
      const board = SBC_BOARDS[type];
      for (const [x, y] of board.holes) {
        expect(x - board.holeDiameter / 2, `${type} hole`).toBeGreaterThan(0);
        expect(x + board.holeDiameter / 2, `${type} hole`).toBeLessThan(board.width);
        expect(y - board.holeDiameter / 2, `${type} hole`).toBeGreaterThan(0);
        expect(y + board.holeDiameter / 2, `${type} hole`).toBeLessThan(board.depth);
      }
      for (const part of board.parts) {
        expect(part.x1, `${type} ${part.name}`).toBeGreaterThan(part.x0);
        expect(part.y1, `${type} ${part.name}`).toBeGreaterThan(part.y0);
        expect(part.height, `${type} ${part.name}`).toBeGreaterThan(0);
        // A part may stand out past the edge, as connectors do, but not float beside the board.
        expect(part.x0, `${type} ${part.name}`).toBeLessThan(board.width);
        expect(part.x1, `${type} ${part.name}`).toBeGreaterThan(0);
        expect(part.y0, `${type} ${part.name}`).toBeLessThan(board.depth);
        expect(part.y1, `${type} ${part.name}`).toBeGreaterThan(0);
      }
    }
  });

  it("has no two parts in the same place", () => {
    for (const type of SBC_BOARD_ORDER) {
      const blocks = sbcBoardBlocks(SBC_BOARDS[type], 0);
      blocks.forEach((a, i) => blocks.slice(i + 1).forEach((b) => {
        const apart = a.x1 <= b.x0 || b.x1 <= a.x0 || a.y1 <= b.y0 || b.y1 <= a.y0;
        expect(apart, `${type}: ${a.name} / ${b.name}`).toBe(true);
      }));
    }
  });

  it("puts the Raspberry Pi 5's power and HDMI sockets on its front edge", () => {
    const board = SBC_BOARDS.pi5;
    const names = board.parts.filter((part) => part.y0 <= 0).map((part) => part.name);
    expect(names).toEqual(expect.arrayContaining(["USB-C power", "micro-HDMI 0", "micro-HDMI 1"]));
    for (const part of board.parts.filter((entry) => entry.y0 <= 0)) expect(sbcPartAtEdge(board, part)).toBe(true);
    expect(sbcPartAtEdge(board, board.parts.find((part) => part.name === "SoC")!)).toBe(false);
  });
});

describe("SBC board clearance", () => {
  it("is kept between 0 and 2 mm", () => {
    expect(MAX_SBC_CLEARANCE).toBe(2);
    expect(normalizeSbcClearance(0.3)).toBe(0.3);
    expect(normalizeSbcClearance(-1)).toBe(0);
    expect(normalizeSbcClearance(5)).toBe(2);
    expect(normalizeSbcClearance("0.3")).toBe(0);
    expect(normalizeSbcClearance(Number.NaN)).toBe(0);
  });

  it("grows only the connectors at the edge, on every side but the bottom", () => {
    const board = SBC_BOARDS.pi5;
    const plain = sbcBoardBlocks(board, 0);
    const grown = sbcBoardBlocks(board, 0.4);
    board.parts.forEach((part, index) => {
      const before = plain[index];
      const after = grown[index];
      expect(after.bottom).toBe(board.thickness);
      expect(before.bottom).toBe(board.thickness);
      expect(before.top).toBeCloseTo(board.thickness + part.height, 9);
      if (part.kind === "connector" && sbcPartAtEdge(board, part)) {
        expect(after.x0).toBeCloseTo(part.x0 - 0.4, 9);
        expect(after.x1).toBeCloseTo(part.x1 + 0.4, 9);
        expect(after.y0).toBeCloseTo(part.y0 - 0.4, 9);
        expect(after.y1).toBeCloseTo(part.y1 + 0.4, 9);
        expect(after.top).toBeCloseTo(before.top + 0.4, 9);
      } else {
        expect([after.x0, after.x1, after.y0, after.y1, after.top]).toEqual([before.x0, before.x1, before.y0, before.y1, before.top]);
      }
    });
  });

  it("makes the body as large as the board and what stands out of it", () => {
    const board = SBC_BOARDS.pi5;
    const extent = sbcBoardExtent(board, 0);
    expect(extent.minX).toBeLessThan(0); // the power button
    expect(extent.maxX).toBeGreaterThan(85); // Ethernet and USB stand out at the back
    expect(extent.minY).toBeLessThan(0); // the sockets at the front
    expect(extent.height).toBeCloseTo(board.thickness + 16.2, 9); // the tallest USB-A socket
    const grown = sbcBoardExtent(board, 0.5);
    expect(grown.height).toBeCloseTo(extent.height + 0.5, 9);
    expect(grown.minY).toBeCloseTo(extent.minY - 0.5, 9);
  });
});

describe("SBC board reach", () => {
  it("is kept between 0 and 10 mm", () => {
    expect(MAX_SBC_REACH).toBe(10);
    expect(normalizeSbcReach(3)).toBe(3);
    expect(normalizeSbcReach(-1)).toBe(0);
    expect(normalizeSbcReach(12)).toBe(10);
    expect(normalizeSbcReach(undefined)).toBe(0);
  });

  it("takes each connector at the edge further out on the edge it stands at, on every board", () => {
    for (const type of SBC_BOARD_ORDER) {
      const board = SBC_BOARDS[type];
      const plain = sbcBoardBlocks(board, 0.3, 0);
      const reached = sbcBoardBlocks(board, 0.3, 3);
      board.parts.forEach((part, index) => {
        const before = plain[index];
        const after = reached[index];
        const edges = sbcPartEdges(board, part);
        const label = `${type} ${part.name}`;
        if (part.kind === "connector" && sbcPartAtEdge(board, part)) {
          expect(after.x0, label).toBeCloseTo(before.x0 - (edges.left ? 3 : 0), 9);
          expect(after.x1, label).toBeCloseTo(before.x1 + (edges.right ? 3 : 0), 9);
          expect(after.y0, label).toBeCloseTo(before.y0 - (edges.front ? 3 : 0), 9);
          expect(after.y1, label).toBeCloseTo(before.y1 + (edges.back ? 3 : 0), 9);
        } else {
          expect([after.x0, after.x1, after.y0, after.y1], label).toEqual([before.x0, before.x1, before.y0, before.y1]);
        }
        // The reach goes out through the wall, never up: heights stay.
        expect([after.bottom, after.top], label).toEqual([before.bottom, before.top]);
      });
    }
  });

  it("lets the Raspberry Pi 5's front sockets cut through a wall thicker than they stand out", () => {
    const board = SBC_BOARDS.pi5;
    const front = (reach: number) => sbcBoardBlocks(board, 0, reach).filter((block) => ["USB-C power", "micro-HDMI 0", "micro-HDMI 1"].includes(block.name));
    // Of themselves they stand only 1.2 and 1.4 mm out of the board: a 1.5 mm wall at the edge is not cut through.
    expect(Math.max(...front(0).map((block) => block.y0))).toBeGreaterThan(-1.5);
    // 3 mm further, every one of them reaches 4 mm and more past the edge.
    expect(Math.max(...front(3).map((block) => block.y0))).toBeLessThan(-4);
  });

  it("makes the body larger only where a connector reaches out", () => {
    const board = SBC_BOARDS.pi5;
    const plain = sbcBoardExtent(board, 0, 0);
    const reached = sbcBoardExtent(board, 0, 3);
    expect(reached.minY).toBeCloseTo(plain.minY - 3, 9);
    expect(reached.maxX).toBeCloseTo(plain.maxX + 3, 9);
    expect(reached.height).toBeCloseTo(plain.height, 9);
  });
});

describe("SBC board connector shapes", () => {
  it("gives a shape only to connectors at an edge, and pins only to headers", () => {
    for (const type of SBC_BOARD_ORDER) {
      const board = SBC_BOARDS[type];
      for (const part of board.parts) {
        if (part.profile) {
          expect(part.kind, `${type} ${part.name}`).toBe("connector");
          expect(sbcPartAtEdge(board, part), `${type} ${part.name}`).toBe(true);
        }
        if (part.pins) expect(part.kind, `${type} ${part.name}`).toBe("header");
      }
    }
  });

  it("draws every socket in its own outline, within its part, standing on the board", () => {
    for (const type of SBC_BOARD_ORDER) {
      const board = SBC_BOARDS[type];
      const solids = sbcBoardSolids(board, 0, 0);
      for (const part of board.parts.filter((entry) => ["usbC", "microUsb", "microHdmi", "miniHdmi", "hdmi"].includes(entry.profile ?? ""))) {
        const socket = solids.find((solid) => solid.name === part.name)!;
        const label = `${type} ${part.name}`;
        expect(socket.profile, label).toBeDefined();
        expect(socket.x0, label).toBeGreaterThanOrEqual(part.x0 - 1e-9);
        expect(socket.x1, label).toBeLessThanOrEqual(part.x1 + 1e-9);
        expect(socket.y0, label).toBeGreaterThanOrEqual(part.y0 - 1e-9);
        expect(socket.y1, label).toBeLessThanOrEqual(part.y1 + 1e-9);
        expect(socket.bottom, label).toBeCloseTo(board.thickness, 9);
        expect(socket.top - socket.bottom, label).toBeLessThanOrEqual(part.height + 1e-9);
      }
    }
    // The Raspberry Pi 5's sockets: USB-C round-ended 8.94 x 3.26 mm, micro-HDMI 6.2 x 3.0 mm with its lower corners cut.
    const pi5 = sbcBoardSolids(SBC_BOARDS.pi5, 0, 0);
    const usbC = pi5.find((solid) => solid.name === "USB-C power")!;
    expect([usbC.x1 - usbC.x0, usbC.top - usbC.bottom]).toEqual([expect.closeTo(8.94, 9), expect.closeTo(3.26, 9)]);
    expect(usbC.profile).toEqual({ portProfile: "rounded", corner: 1.63, along: "y" });
    const hdmi = pi5.find((solid) => solid.name === "micro-HDMI 0")!;
    expect([hdmi.x1 - hdmi.x0, hdmi.top - hdmi.bottom]).toEqual([expect.closeTo(6.2, 9), expect.closeTo(3.0, 9)]);
    expect(hdmi.profile?.portProfile).toBe("microHdmi");
  });

  it("grows a socket's outline by the clearance around its middle and takes it out by the reach", () => {
    const plain = sbcBoardSolids(SBC_BOARDS.pi5, 0, 0).find((solid) => solid.name === "USB-C power")!;
    const grown = sbcBoardSolids(SBC_BOARDS.pi5, 0.3, 2).find((solid) => solid.name === "USB-C power")!;
    expect((grown.x0 + grown.x1) / 2).toBeCloseTo((plain.x0 + plain.x1) / 2, 9);
    expect(grown.x1 - grown.x0).toBeCloseTo(plain.x1 - plain.x0 + 0.6, 9);
    expect((grown.bottom + grown.top) / 2).toBeCloseTo((plain.bottom + plain.top) / 2, 9);
    expect(grown.top - grown.bottom).toBeCloseTo(plain.top - plain.bottom + 0.6, 9);
    expect(grown.profile?.corner).toBeCloseTo(1.63 + 0.3, 9);
    expect(grown.y0).toBeCloseTo(plain.y0 - 0.3 - 2, 9);
  });

  it("shows a dot for every pin of a header, on its top", () => {
    const solids = sbcBoardSolids(SBC_BOARDS.pi5, 0, 0);
    const header = solids.find((solid) => solid.name === "GPIO header")!;
    const dots = solids.filter((solid) => solid.name === "GPIO header pin");
    expect(dots).toHaveLength(40);
    for (const dot of dots) {
      expect(dot.bottom).toBeCloseTo(header.top, 9);
      expect(dot.x0).toBeGreaterThan(header.x0);
      expect(dot.x1).toBeLessThan(header.x1);
    }
    // 2.54 mm apart.
    const xs = [...new Set(dots.map((dot) => Math.round(((dot.x0 + dot.x1) / 2) * 1000) / 1000))].sort((a, b) => a - b);
    expect(xs).toHaveLength(20);
    expect(xs[1] - xs[0]).toBeCloseTo(2.54, 3);
    expect(solids.filter((solid) => solid.name === "PoE header pin")).toHaveLength(4);
  });

  it("draws the openings on the front of a housing, and an audio jack's collar in front of the board", () => {
    const pi4 = SBC_BOARDS.pi4;
    const solids = sbcBoardSolids(pi4, 0, 0);
    const usb = solids.find((solid) => solid.name === "USB 3.0")!;
    const usbOpenings = solids.filter((solid) => solid.name === "USB 3.0 opening");
    expect(usbOpenings).toHaveLength(2);
    for (const opening of usbOpenings) expect(opening.x0).toBeCloseTo(usb.x1, 9); // on the right edge, facing out
    expect(solids.filter((solid) => solid.name === "Ethernet opening")).toHaveLength(1);
    const collar = solids.find((solid) => solid.name === "audio/video jack collar")!;
    const housing = solids.find((solid) => solid.name === "audio/video jack")!;
    expect(collar.profile).toEqual({ portProfile: "rounded", corner: 3, along: "y" });
    expect(collar.y1).toBeCloseTo(0, 9);
    expect(collar.y0).toBeCloseTo(-2.5, 9);
    expect(housing.y0).toBeCloseTo(0, 9);
  });
});

describe("SBC board settings", () => {
  it("are read safely", () => {
    expect(normalizeSbcBoardSettings({ board: "zero2w", clearance: 0.25 })).toEqual({ board: "zero2w", clearance: 0.25, reach: 0 });
    expect(normalizeSbcBoardSettings({ board: "pi4" })).toEqual({ board: "pi4", clearance: 0, reach: 0 });
    expect(normalizeSbcBoardSettings({ board: "pi4", reach: 3 })).toEqual({ board: "pi4", clearance: 0, reach: 3 });
    expect(normalizeSbcBoardSettings({ board: "pi4", reach: 30 })).toEqual({ board: "pi4", clearance: 0, reach: 10 });
    expect(normalizeSbcBoardSettings({ board: "pi4", clearance: 9 })).toEqual({ board: "pi4", clearance: 2, reach: 0 });
    expect(normalizeSbcBoardSettings({ board: "rock5" })).toBeNull();
    expect(normalizeSbcBoardSettings(null)).toBeNull();
    expect(normalizeSbcBoardSettings("pi5")).toBeNull();
  });

  it("are kept through saving and loading", async () => {
    const board = boardBody("board");
    const plain = canonicalizeShape({ ...boardBody("plain"), sbcBoard: undefined });
    const restored = await importLylProject(await exported([board, plain]));
    const byId = new Map(restored.shapes.map((shape) => [shape.id, shape]));
    expect(byId.get("board")!.sbcBoard).toEqual({ board: "pi4", clearance: 0.3 });
    expect(workplaneShapesEqual(byId.get("board")!, board)).toBe(true);
    // A body without board settings - as every body of an older project - loads without them.
    expect(byId.get("plain")!.sbcBoard).toBeUndefined();
  });

  it("refuses an unknown board or a clearance out of range", async () => {
    await expect(importLylProject(await withDefinition({ sbcBoard: { board: "rock5", clearance: 0 } }))).rejects.toThrow(/sbcBoard\.board/);
    await expect(importLylProject(await withDefinition({ sbcBoard: { board: "pi5", clearance: 3 } }))).rejects.toThrow(/sbcBoard\.clearance/);
    await expect(importLylProject(await withDefinition({ sbcBoard: { board: "pi5", clearance: 0, reach: 11 } }))).rejects.toThrow(/sbcBoard\.reach/);
    await expect(importLylProject(await withDefinition({ sbcBoard: { board: "pi5", clearance: 0, reach: "3" } }))).rejects.toThrow(/sbcBoard\.reach/);
    await expect(importLylProject(await withDefinition({ sbcBoard: { board: "pi5", clearance: -0.1 } }))).rejects.toThrow(/sbcBoard\.clearance/);
  });

  it("tell shapes apart", () => {
    const board = boardBody("board");
    expect(workplaneShapesEqual(board, { ...board, sbcBoard: { board: "pi4", clearance: 0.3 } })).toBe(true);
    expect(workplaneShapesEqual(board, { ...board, sbcBoard: { board: "pi5", clearance: 0.3 } })).toBe(false);
    expect(workplaneShapesEqual(board, { ...board, sbcBoard: { board: "pi4", clearance: 0.4 } })).toBe(false);
    expect(workplaneShapesEqual(board, { ...board, sbcBoard: { board: "pi4", clearance: 0.3, reach: 0 } })).toBe(true);
    expect(workplaneShapesEqual(board, { ...board, sbcBoard: { board: "pi4", clearance: 0.3, reach: 3 } })).toBe(false);
    expect(workplaneShapesEqual(board, { ...board, sbcBoard: undefined })).toBe(false);
  });
});

describe("finding the SBC board", () => {
  it("is in the shape library right after the port opening, and its question mark opens its section", () => {
    const ids = libraryShapeAssets.map((asset) => asset.id);
    expect(ids.indexOf(sbcBoardAsset.id)).toBe(ids.indexOf("port") + 1);
    expect(toolbarShapeAssets.some((asset) => asset.id === sbcBoardAsset.id)).toBe(false);
    expect(guideSectionForShape({ kind: "mesh", groupedShapes: [{}, {}], groupOperation: "group", sbcBoard: { board: "pi5", clearance: 0 } })).toBe("sbcBoard");
  });

  it("shows the board's plate under a name in the interface language", () => {
    expect(displayShapeName({ name: "Board", kind: "mesh" })).toBe("Board");
    expect(displayShapeName({ name: "Raspberry Pi 5", kind: "mesh" })).toBe("Raspberry Pi 5");
  });
});

type Tool = { name: string; inputSchema: { properties: Record<string, { type?: string; enum?: string[]; minimum?: number; maximum?: number }>; required?: string[] } };

describe("layerling_create_sbc_board", () => {
  const tool = (tools as Tool[]).find((entry) => entry.name === "layerling_create_sbc_board")!;

  it("is in the tool list with the card's choices", () => {
    expect(tool).toBeDefined();
    expect(Object.keys(tool.inputSchema.properties)).toEqual(expect.arrayContaining(["board", "clearance", "reach", "x", "z", "asHole", "name"]));
    expect(tool.inputSchema.properties.reach).toMatchObject({ minimum: 0, maximum: MAX_SBC_REACH });
    expect(tool.inputSchema.required).toBeUndefined();
    expect(tool.inputSchema.properties.board.enum).toEqual(SBC_BOARD_ORDER);
    expect(tool.inputSchema.properties.clearance).toMatchObject({ minimum: 0, maximum: MAX_SBC_CLEARANCE });
  });
});
