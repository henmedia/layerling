import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
// @ts-expect-error the tool list is a plain .mjs module
import { tools } from "../../scripts/layerling-mcp-tools.mjs";
import { editorHistoryEntry } from "@/lib/editorHistory";
import { guideSectionForShape } from "@/lib/guideLinks";
import { exportLylProject, importLylProject, type LylProjectDocumentV1 } from "@/lib/lylProject";
import {
  DEFAULT_SBC_BOARD,
  MAX_SBC_BUTTON_REACH,
  MAX_SBC_CLEARANCE,
  MAX_SBC_REACH,
  MAX_SBC_UP_REACH,
  MIN_SBC_UP_REACH,
  SBC_BOARDS,
  SBC_BOARD_ORDER,
  normalizeSbcBoardSettings,
  normalizeSbcClearance,
  normalizeSbcReach,
  normalizeSbcUpReach,
  sbcBoardBlocks,
  sbcBoardHasButtons,
  sbcBoardHasGpio,
  sbcBoardHasLens,
  sbcBoardHasRibbon,
  sbcBoardExtent,
  sbcBoardSolids,
  sbcHoleDiameter,
  sbcPartAtEdge,
  sbcPartEdges,
} from "@/lib/sbcBoards";
import { displayShapeName, libraryShapeAssets, makeShapeFromAsset, sbcBoardAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";
import { canonicalizeShape, workplaneShapesEqual } from "@/lib/workplaneShapes";
import type { SbcBoardSettings, SbcBoardType, WorkplaneShape } from "@/types/layerling";

/** The small ESP32 boards: no mounting holes, USB-C at the right end, castellated pins. */
const ESP32_BOARDS: SbcBoardType[] = ["xiaoEsp32c6", "esp32c3SuperMini", "esp32c6SuperMini", "waveshareEsp32s3Zero"];
/** The microcontroller boards: no microSD card slot, no ribbon cables, no GPIO header to open up. */
/** The camera boards: their microSD card slot is on top, by the camera. */
const CAMERA_BOARDS: SbcBoardType[] = ["esp32CamMb", "esp32s3Cam"];
const MICRO_BOARDS: SbcBoardType[] = [...ESP32_BOARDS, "featherEsp32s3", "arduinoUno", "arduinoMega", "arduinoNano", "arduinoProMini", "wemosD1Mini", "pico", "picoW", "pico2", "pico2W", "esp32CamMb", "esp32s3Cam", "esp32DevKitC", "esp32DevKitV1", "cyd", "cyd2usb"];

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
    expect(SBC_BOARD_ORDER).toEqual(["pi5", "pi4", "pi3bPlus", "zero2w", "bttPi12", "xiaoEsp32c6", "esp32c3SuperMini", "esp32c6SuperMini", "waveshareEsp32s3Zero", "featherEsp32s3", "arduinoUno", "arduinoMega", "arduinoNano", "arduinoProMini", "wemosD1Mini", "pico", "picoW", "pico2", "pico2W", "esp32CamMb", "esp32s3Cam", "esp32DevKitC", "esp32DevKitV1", "cyd", "cyd2usb"]);
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
    expect(SBC_BOARDS.bttPi12.holes).toEqual([[3.3, 52.7], [61.54, 52.7], [3.3, 3.3], [67.35, 3.3]]);
    expect(SBC_BOARDS.bttPi12.holeDiameter).toBe(2.5);
  });

  it("keeps every hole on its board and every part over or at it", () => {
    for (const type of SBC_BOARD_ORDER) {
      const board = SBC_BOARDS[type];
      for (const hole of board.holes) {
        const [x, y] = hole;
        const radius = sbcHoleDiameter(board, hole) / 2;
        expect(x - radius, `${type} hole`).toBeGreaterThan(0);
        expect(x + radius, `${type} hole`).toBeLessThan(board.width);
        expect(y - radius, `${type} hole`).toBeGreaterThan(0);
        expect(y + radius, `${type} hole`).toBeLessThan(board.depth);
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
        // A part under the board may lie below one on top of it.
        const apart = Boolean(a.underside) !== Boolean(b.underside) || a.x1 <= b.x0 || b.x1 <= a.x0 || a.y1 <= b.y0 || b.y1 <= a.y0;
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

  it("puts the Raspberry Pi 4's and 3 B+'s USB blocks where the makers' drawings put their middles", () => {
    const usbMiddles = (type: "pi4" | "pi3bPlus") =>
      SBC_BOARDS[type].parts.filter((part) => part.profile === "usbA2").map((part) => ({ middle: (part.y0 + part.y1) / 2, width: part.y1 - part.y0 }));
    for (const [type, middles] of [["pi4", [9, 27]], ["pi3bPlus", [29, 47]]] as const) {
      const blocks = usbMiddles(type);
      expect(blocks.map((block) => block.middle)).toEqual(middles.map((middle) => expect.closeTo(middle, 6)));
      for (const block of blocks) expect(block.width).toBeCloseTo(13.14, 6);
    }
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
      if (part.underside) {
        // Under the board: its top stays on the underside, it grows down instead.
        expect([before.top, after.top]).toEqual([0, 0]);
        expect(before.bottom).toBeCloseTo(-part.height, 9);
        expect(after.bottom).toBeCloseTo(-part.height - 0.4, 9);
        expect(after.x0).toBeCloseTo(part.x0 - 0.4, 9);
        expect(after.y1).toBeCloseTo(part.y1 + 0.4, 9);
        return;
      }
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
    await expect(importLylProject(await withDefinition({ sbcBoard: { board: "pi5", clearance: 0, ribbonUp: "yes" } }))).rejects.toThrow(/sbcBoard\.ribbonUp/);
    await expect(importLylProject(await withDefinition({ sbcBoard: { board: "pi5", clearance: 0, upReach: 10 } }))).rejects.toThrow(/sbcBoard\.upReach/);
    await expect(importLylProject(await withDefinition({ sbcBoard: { board: "pi5", clearance: 0, upReach: 101 } }))).rejects.toThrow(/sbcBoard\.upReach/);
  });

  it("keep the openings asked for, and only those", () => {
    expect(normalizeSbcBoardSettings({ board: "pi5", ribbonUp: true, ribbonSide: false, gpioUp: true, upReach: 35 }))
      .toEqual({ board: "pi5", clearance: 0, reach: 0, ribbonUp: true, gpioUp: true, upReach: 35 });
    expect(normalizeSbcBoardSettings({ board: "pi5", ribbonSide: true, upReach: 5 })).toEqual({ board: "pi5", clearance: 0, reach: 0, ribbonSide: true, upReach: 20 });
    expect([normalizeSbcUpReach(undefined), normalizeSbcUpReach(500), MIN_SBC_UP_REACH, MAX_SBC_UP_REACH]).toEqual([20, 100, 20, 100]);
    const board = boardBody("board");
    expect(workplaneShapesEqual(board, { ...board, sbcBoard: { board: "pi4", clearance: 0.3, gpioUp: true } })).toBe(false);
    expect(workplaneShapesEqual(board, { ...board, sbcBoard: { board: "pi4", clearance: 0.3, ribbonSide: true } })).toBe(false);
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
    expect(Object.keys(tool.inputSchema.properties)).toEqual(expect.arrayContaining(["ribbonUp", "ribbonSide", "gpioUp", "upReach"]));
    expect(tool.inputSchema.properties.upReach).toMatchObject({ minimum: MIN_SBC_UP_REACH, maximum: MAX_SBC_UP_REACH });
  });
});

describe("the microSD card slot", () => {
  const slot = (type: keyof typeof SBC_BOARDS) => SBC_BOARDS[type].parts.find((part) => part.name === "microSD card slot")!;

  it("is on every board, at the left edge where the card goes in, as the makers' models and drawings have it", () => {
    // The microcontroller boards have none, but the camera boards and the CYDs.
    for (const type of MICRO_BOARDS.filter((entry) => !CAMERA_BOARDS.includes(entry) && entry !== "cyd" && entry !== "cyd2usb")) expect(slot(type), type).toBeUndefined();
    for (const type of SBC_BOARD_ORDER.filter((entry) => !MICRO_BOARDS.includes(entry))) {
      const board = SBC_BOARDS[type];
      const part = slot(type);
      expect(part, type).toBeDefined();
      expect(part.kind).toBe("connector");
      expect(sbcPartEdges(board, part).left, type).toBe(true);
    }
    // Raspberry Pi 5 3D model: 11.4 x 11.95 mm, 1.42 mm under the board.
    expect(slot("pi5")).toMatchObject({ x1: 13.65, y0: 22.11, y1: 34.06, height: 1.42, underside: true });
    // Pi 4 and 3 B+ drawings (DXF): the card from x = -2.27, the socket to 13.13.
    for (const type of ["pi4", "pi3bPlus"] as const) expect(slot(type)).toMatchObject({ x0: -2.27, x1: 13.13, y0: 22.11, y1: 34.1, underside: true, estimated: true });
    // BIGTREETECH's model: 1.44 mm under the board.
    expect(slot("bttPi12")).toMatchObject({ x1: 14.04, y0: 17.31, y1: 28.69, height: 1.44, underside: true });
    // On the Zero 2 W it is on top.
    expect(slot("zero2w").underside).toBeUndefined();
  });

  it("hangs under the board, grows down by the clearance and reaches out of the left edge", () => {
    const board = SBC_BOARDS.pi5;
    const index = board.parts.indexOf(slot("pi5"));
    const block = sbcBoardBlocks(board, 0.3, 4)[index];
    expect(block.top).toBe(0);
    expect(block.bottom).toBeCloseTo(-1.72, 9);
    expect(block.x0).toBeCloseTo(-4.3, 9);
    expect([block.y0, block.y1]).toEqual([expect.closeTo(21.81, 9), expect.closeTo(34.36, 9)]);
    expect(sbcBoardExtent(board, 0.3, 4).bottom).toBeCloseTo(-1.72, 9);
    expect(sbcBoardExtent(SBC_BOARDS.zero2w).bottom).toBe(0);
  });
});

describe("the openings up and out", () => {
  const index = (type: keyof typeof SBC_BOARDS, name: string) => SBC_BOARDS[type].parts.findIndex((part) => part.name === name);

  it("are offered for the ribbon cables and the GPIO header the boards have", () => {
    const ribbons = (type: keyof typeof SBC_BOARDS) => SBC_BOARDS[type].parts.filter((part) => part.ribbon).map((part) => part.name);
    expect(ribbons("pi5")).toEqual(["camera/display 0", "camera/display 1", "PCIe connector"]);
    expect(ribbons("pi4")).toEqual(["camera", "display"]);
    expect(ribbons("pi3bPlus")).toEqual(["camera", "display"]);
    expect(ribbons("zero2w")).toEqual(["camera"]);
    expect(ribbons("bttPi12")).toEqual([]);
    for (const type of MICRO_BOARDS) {
      expect(ribbons(type), type).toEqual([]);
      expect(sbcBoardHasRibbon(SBC_BOARDS[type]) || sbcBoardHasGpio(SBC_BOARDS[type]), type).toBe(false);
    }
    for (const type of ["pi5", "pi4", "pi3bPlus", "bttPi12"] as const) expect(SBC_BOARDS[type].parts.filter((part) => part.gpio).map((part) => part.name)).toEqual(["GPIO header"]);
  });

  it("take a camera board's lens up through the lid by the reach up, only when asked for", () => {
    for (const type of CAMERA_BOARDS) {
      const board = SBC_BOARDS[type];
      expect(sbcBoardHasLens(board), type).toBe(true);
      const at = index(type, "camera");
      const part = board.parts[at];
      expect(sbcBoardBlocks(board, 0.3, 0)[at].top, type).toBeCloseTo(board.thickness + part.height, 9);
      const up = sbcBoardBlocks(board, 0.3, 0, { lensUp: true, upReach: 30 })[at];
      expect(up.top, type).toBeCloseTo(board.thickness + part.height + 0.3 + 30, 9);
      expect(up.x0).toBeCloseTo(part.x0 - 0.3, 9);
      expect(up.bottom).toBe(board.thickness);
    }
    for (const type of SBC_BOARD_ORDER.filter((entry) => !CAMERA_BOARDS.includes(entry))) expect(sbcBoardHasLens(SBC_BOARDS[type]), type).toBe(false);
    expect(normalizeSbcBoardSettings({ board: "esp32s3Cam", lensUp: true, upReach: 25 })).toEqual({ board: "esp32s3Cam", clearance: 0, reach: 0, lensUp: true, upReach: 25 });
    expect(Object.keys((tools.find((entry) => entry.name === "layerling_create_sbc_board")!.inputSchema as { properties: object }).properties)).toContain("lensUp");
  });

  it("take the ribbon cable connectors and the GPIO header up by the reach up, grown by the clearance", () => {
    const board = SBC_BOARDS.pi5;
    const plain = sbcBoardBlocks(board, 0.3, 0);
    const up = sbcBoardBlocks(board, 0.3, 0, { ribbonUp: true, gpioUp: true, upReach: 30 });
    for (const name of ["camera/display 0", "camera/display 1", "PCIe connector", "GPIO header"]) {
      const at = index("pi5", name);
      const part = board.parts[at];
      expect(up[at].top, name).toBeCloseTo(board.thickness + part.height + 0.3 + 30, 9);
      expect(up[at].x0).toBeCloseTo(part.x0 - 0.3, 9);
      expect(up[at].y1).toBeCloseTo(part.y1 + 0.3, 9);
      expect(up[at].bottom).toBe(board.thickness);
      expect(plain[at].top).toBeCloseTo(board.thickness + part.height, 9);
    }
    // At least 20 mm, by default.
    const gpio = index("pi5", "GPIO header");
    expect(sbcBoardBlocks(board, 0, 0, { gpioUp: true })[gpio].top).toBeCloseTo(board.thickness + 8.6 + 20, 9);
    expect(sbcBoardBlocks(board, 0, 0, { gpioUp: true, upReach: 5 })[gpio].top).toBeCloseTo(board.thickness + 8.6 + 20, 9);
    // Only the GPIO header when only it is asked for; the pins stay on the header's own top.
    expect(sbcBoardBlocks(board, 0, 0, { gpioUp: true })[index("pi5", "PCIe connector")].top).toBeCloseTo(board.thickness + 4, 9);
    const pins = sbcBoardSolids(board, 0, 0, { gpioUp: true }).filter((solid) => solid.name === "GPIO header pin");
    expect(pins).toHaveLength(40);
    for (const pin of pins) expect(pin.bottom).toBeCloseTo(board.thickness + 8.6, 9);
  });

  it("lay a ribbon cable's way out across the connector's long side to the nearer edge and on by the reach", () => {
    const board = SBC_BOARDS.pi5;
    const ways = sbcBoardSolids(board, 0.2, 3, { ribbonSide: true }).filter((solid) => solid.name.endsWith("cable way"));
    expect(ways.map((way) => way.name)).toEqual(["camera/display 0 cable way", "camera/display 1 cable way", "PCIe connector cable way"]);
    const pcie = ways[2];
    // The PCIe connector stands along y near the left edge: its cable goes out to the left, through the wall.
    expect(pcie.x0).toBeCloseTo(-3.2, 9);
    expect([pcie.y0, pcie.y1]).toEqual([expect.closeTo(23.0, 9), expect.closeTo(37.0, 9)]);
    expect(pcie.bottom).toBe(board.thickness);
    expect(pcie.top).toBeCloseTo(board.thickness + 4 + 0.2, 9);
    // The camera/display cables go out at the left end too, one above the other over the PCIe cable, in one
    // plane: centred on it, each as wide as its connector is long (16.7 mm) and as high as it stands (4 mm).
    const [cam0, cam1] = ways;
    for (const way of [cam0, cam1]) {
      expect([way.x0, way.x1], way.name).toEqual([expect.closeTo(pcie.x0, 9), expect.closeTo(pcie.x1, 9)]);
      expect((way.y0 + way.y1) / 2).toBeCloseTo((pcie.y0 + pcie.y1) / 2, 9);
      expect(way.y1 - way.y0).toBeCloseTo(16.7 + 0.4, 9);
    }
    expect(cam0.bottom).toBeCloseTo(pcie.top, 9);
    expect(cam0.top).toBeCloseTo(pcie.top + 4 + 0.2, 9);
    expect(cam1.bottom).toBeCloseTo(cam0.top, 9);
    expect(cam1.top).toBeCloseTo(cam0.top + 4 + 0.2, 9);
    // Pi 4: the camera's cable comes out over the display's, at the left end, away from the USB and Ethernet.
    const pi4 = sbcBoardSolids(SBC_BOARDS.pi4, 0, 2, { ribbonSide: true }).filter((solid) => solid.name.endsWith("cable way"));
    const display = pi4.find((way) => way.name === "display cable way")!;
    const camera = pi4.find((way) => way.name === "camera cable way")!;
    expect(display.x0).toBeCloseTo(-2, 9);
    expect([camera.x0, camera.x1]).toEqual([expect.closeTo(display.x0, 9), expect.closeTo(display.x1, 9)]);
    expect(camera.bottom).toBeCloseTo(display.top, 9);
    expect(pi4.every((way) => way.x1 < 66)).toBe(true);
    // None unless asked for, and none for a connector that reaches its edge anyway (the Zero's camera).
    expect(sbcBoardSolids(board, 0.2, 3).some((solid) => solid.name.endsWith("cable way"))).toBe(false);
    expect(sbcBoardSolids(SBC_BOARDS.zero2w, 0, 3, { ribbonSide: true }).some((solid) => solid.name.endsWith("cable way"))).toBe(false);
  });
});

describe("the small ESP32 boards", () => {
  const part = (type: SbcBoardType, name: string) => SBC_BOARDS[type].parts.find((entry) => entry.name === name)!;

  it("have their sources' outlines and no mounting holes", () => {
    // Seeed's KiCad project: Edge.Cuts 20.955 x 17.78 mm, 1.6 mm thick (the wiki: 21 x 17.8 mm).
    expect(SBC_BOARDS.xiaoEsp32c6).toMatchObject({ width: 20.955, depth: 17.78, thickness: 1.6, holes: [] });
    // The community STEP models: 22.52 x 18 x 0.9 mm and 26 x 18 x 1.15 mm, square corners.
    expect(SBC_BOARDS.esp32c3SuperMini).toMatchObject({ width: 22.52, depth: 18, thickness: 0.9, cornerRadius: 0, holes: [] });
    expect(SBC_BOARDS.esp32c6SuperMini).toMatchObject({ width: 26, depth: 18, thickness: 1.15, cornerRadius: 0, holes: [] });
    // Values no maker gives are marked.
    for (const type of ["esp32c3SuperMini", "esp32c6SuperMini"] as const) {
      for (const entry of SBC_BOARDS[type].parts) expect(entry.estimated, `${type} ${entry.name}`).toBe(true);
    }
    expect(SBC_BOARDS.xiaoEsp32c6.estimated).toEqual(["cornerRadius"]);
  });

  it("keep every part on the board, only the USB-C standing out of its right end", () => {
    for (const type of ESP32_BOARDS) {
      const board = SBC_BOARDS[type];
      for (const entry of board.parts) {
        const label = `${type} ${entry.name}`;
        expect(entry.x0, label).toBeGreaterThanOrEqual(0);
        expect(entry.y0, label).toBeGreaterThanOrEqual(0);
        expect(entry.y1, label).toBeLessThanOrEqual(board.depth);
        if (entry.name === "USB-C") expect(entry.x1, label).toBeGreaterThan(board.width);
        else expect(entry.x1, label).toBeLessThanOrEqual(board.width);
        // Only the USB-C is a connector at the edge: the U.FL socket's cable comes from above.
        expect(sbcPartAtEdge(board, entry) && entry.kind === "connector", label).toBe(entry.name === "USB-C");
      }
    }
  });

  it("show the parts of the real boards", () => {
    const kinds = (type: SbcBoardType) => SBC_BOARDS[type].parts.map((entry) => entry.kind);
    for (const type of ESP32_BOARDS) {
      expect(kinds(type).filter((kind) => kind === "button"), type).toHaveLength(2);
      expect(SBC_BOARDS[type].parts.some((entry) => entry.name === "ceramic antenna"), type).toBe(true);
    }
    expect(part("xiaoEsp32c6", "BOOT button").kind).toBe("button");
    expect(part("xiaoEsp32c6", "RESET button").kind).toBe("button");
    expect(part("xiaoEsp32c6", "shield can").kind).toBe("shield");
    expect(part("xiaoEsp32c6", "U.FL antenna socket")).toMatchObject({ kind: "header", height: 1.25 });
    expect(part("xiaoEsp32c6", "user LED")).toBeDefined();
    expect(part("esp32c3SuperMini", "ESP32-C3").kind).toBe("chip");
    expect(part("esp32c6SuperMini", "ESP32-C6").kind).toBe("chip");
    expect(part("esp32c6SuperMini", "RGB LED (WS2812)")).toBeDefined();
    // BOOT by the TX/RX pins (the back row), RESET by the 5V/GND/3V3 pins (the front row), as the board's silkscreen says.
    expect(part("esp32c6SuperMini", "BOOT button").y0).toBeGreaterThan(SBC_BOARDS.esp32c6SuperMini.depth / 2);
    expect(part("esp32c6SuperMini", "RESET button").y1).toBeLessThan(SBC_BOARDS.esp32c6SuperMini.depth / 2);
  });

  it("names every button by what it does, never only by where it sits", () => {
    for (const type of SBC_BOARD_ORDER) {
      for (const button of SBC_BOARDS[type].parts.filter((entry) => entry.kind === "button")) {
        expect(button.name, `${type}: ${button.name}`).toMatch(/RESET|BOOT|Boot|EN|power/);
      }
    }
  });

  it("show their castellated pins as dots, 2.54 mm apart, in two rows 15.24 mm apart", () => {
    for (const [type, perSide] of [["xiaoEsp32c6", 7], ["esp32c3SuperMini", 8], ["esp32c6SuperMini", 10], ["waveshareEsp32s3Zero", 9]] as const) {
      const solids = sbcBoardSolids(SBC_BOARDS[type], 0, 0);
      const dots = solids.filter((solid) => solid.role === "pin");
      expect(dots, type).toHaveLength(2 * perSide);
      const xs = [...new Set(dots.map((dot) => Math.round(((dot.x0 + dot.x1) / 2) * 1000) / 1000))].sort((a, b) => a - b);
      const ys = [...new Set(dots.map((dot) => Math.round(((dot.y0 + dot.y1) / 2) * 1000) / 1000))].sort((a, b) => a - b);
      expect(xs, type).toHaveLength(perSide);
      expect(xs[1] - xs[0], type).toBeCloseTo(2.54, 3);
      expect(ys, type).toHaveLength(2);
      expect(ys[1] - ys[0], type).toBeCloseTo(15.24, 3);
    }
    // Seeed's footprint: the first pin 2.805 mm from the end without USB, the rows 1.28 mm in from the long edges.
    const xiao = sbcBoardSolids(SBC_BOARDS.xiaoEsp32c6, 0, 0).filter((solid) => solid.role === "pin");
    expect(Math.min(...xiao.map((dot) => (dot.x0 + dot.x1) / 2))).toBeCloseTo(2.805, 6);
    expect(Math.min(...xiao.map((dot) => (dot.y0 + dot.y1) / 2))).toBeCloseTo(1.28, 6);
  });

  it("give the USB-C at the right end its outline, the clearance and the reach", () => {
    for (const type of ESP32_BOARDS) {
      const board = SBC_BOARDS[type];
      const usb = part(type, "USB-C");
      expect(usb.profile, type).toBe("usbC");
      expect(sbcPartEdges(board, usb), type).toEqual({ left: false, right: true, front: false, back: false });
      const index = board.parts.indexOf(usb);
      const block = sbcBoardBlocks(board, 0.3, 4)[index];
      expect(block.x1, type).toBeCloseTo(usb.x1 + 0.3 + 4, 9);
      expect(block.x0, type).toBeCloseTo(usb.x0 - 0.3, 9);
      expect([block.y0, block.y1], type).toEqual([expect.closeTo(usb.y0 - 0.3, 9), expect.closeTo(usb.y1 + 0.3, 9)]);
      // Only the USB-C grows: every other part stays as it is.
      sbcBoardBlocks(board, 0.3, 4).forEach((other, i) => {
        if (i !== index) expect([other.x0, other.x1, other.y0, other.y1], `${type} ${other.name}`).toEqual([board.parts[i].x0, board.parts[i].x1, board.parts[i].y0, board.parts[i].y1]);
      });
      // The socket's outline turned along x, 8.94 mm across, grown round its middle and out by the reach.
      const plain = sbcBoardSolids(board, 0, 0).find((solid) => solid.name === "USB-C")!;
      const grown = sbcBoardSolids(board, 0.3, 4).find((solid) => solid.name === "USB-C")!;
      // Round ends: half the shell's 3.26 mm, or of the socket's height where the model draws it lower.
      expect(plain.profile, type).toEqual({ portProfile: "rounded", corner: expect.closeTo(Math.min(3.26, usb.height) / 2, 9), along: "x" });
      expect(plain.y1 - plain.y0, type).toBeCloseTo(Math.min(8.94, usb.y1 - usb.y0), 9);
      expect(grown.y1 - grown.y0, type).toBeCloseTo(plain.y1 - plain.y0 + 0.6, 9);
      expect(grown.x1, type).toBeCloseTo(plain.x1 + 0.3 + 4, 9);
      expect(sbcBoardExtent(board, 0.3, 4).maxX, type).toBeCloseTo(usb.x1 + 4.3, 9);
    }
  });
});

describe("the Adafruit ESP32-S3 Feather, the Arduino UNO R3, the Arduino Nano and the D1 mini", () => {
  const part = (type: SbcBoardType, name: string) => SBC_BOARDS[type].parts.find((entry) => entry.name === name)!;
  const pinDots = (type: SbcBoardType, name: string) => sbcBoardSolids(SBC_BOARDS[type], 0, 0).filter((solid) => solid.name === `${name} pin`);
  const middles = (dots: ReturnType<typeof pinDots>, axis: "x" | "y") => [...new Set(dots.map((dot) => Math.round(((axis === "x" ? dot.x0 + dot.x1 : dot.y0 + dot.y1) / 2) * 1000) / 1000))].sort((a, b) => a - b);

  it("match the makers' PCB files: outline and mounting holes", () => {
    // Adafruit's PCB file: 50.8 x 22.86 mm, corners 2.54 mm round, two plated 2.5 mm holes and two bare 2.2 mm ones.
    expect(SBC_BOARDS.featherEsp32s3).toMatchObject({ width: 50.8, depth: 22.86, cornerRadius: 2.54, holeDiameter: 2.5 });
    expect(SBC_BOARDS.featherEsp32s3.holes.map((hole) => [hole[0], hole[1], sbcHoleDiameter(SBC_BOARDS.featherEsp32s3, hole)])).toEqual([[2.54, 2.54, 2.5], [2.54, 20.32, 2.5], [48.26, 1.8415, 2.2], [48.26, 20.955, 2.2]]);
    // Arduino's UNO file: 68.58 x 53.34 mm over all, the plate 66.04 wide, 1 mm corners, four 3.2 mm holes.
    expect(SBC_BOARDS.arduinoUno).toMatchObject({ width: 68.58, depth: 53.34, cornerRadius: 1, holeDiameter: 3.2 });
    expect(SBC_BOARDS.arduinoUno.holes).toEqual([[13.97, 2.54], [15.24, 50.8], [66.04, 7.62], [66.04, 35.56]]);
    expect(SBC_BOARDS.arduinoUno.outline?.plateWidth).toBe(66.04);
    // Arduino's Nano file: 43.18 x 17.78 mm, square corners, four 1.651 mm holes 1.27 mm in.
    expect(SBC_BOARDS.arduinoNano).toMatchObject({ width: 43.18, depth: 17.78, cornerRadius: 0, holeDiameter: 1.651 });
    expect(SBC_BOARDS.arduinoNano.holes).toEqual([[1.27, 1.27], [41.91, 1.27], [1.27, 16.51], [41.91, 16.51]]);
    for (const type of ["featherEsp32s3", "arduinoUno", "arduinoMega", "arduinoNano"] as const) expect(sbcHoleDiameter(SBC_BOARDS[type], SBC_BOARDS[type].holes[0])).toBe(SBC_BOARDS[type].holeDiameter);
  });

  it("give the UNO its stepped right edge and the cut back corner, with the 45° cuts where the file has them", () => {
    const outline = SBC_BOARDS.arduinoUno.outline!;
    // The step: a strip from x = 66.04 to 68.58, y = 2.54 to 40.386, beside the plate.
    expect(outline.add).toHaveLength(1);
    const step = outline.add[0];
    expect(step.turn).toBeFalsy();
    expect([step.x - step.width / 2, step.x + step.width / 2]).toEqual([expect.closeTo(66.04, 9), expect.closeTo(68.58, 9)]);
    expect([step.y - step.depth / 2, step.y + step.depth / 2]).toEqual([expect.closeTo(2.54, 9), expect.closeTo(40.386, 9)]);
    // Its outer corners cut at 45° from (66.04, 2.54) to (68.58, 5.08) and from (68.58, 37.846) to (66.04, 40.386),
    // and the plate's back right corner from (64.516, 53.34) to (66.04, 51.816): squares turned about the corners.
    expect(outline.cut.map((entry) => [entry.x, entry.y, entry.turn, entry.width * Math.SQRT1_2])).toEqual([
      [68.58, 2.54, 45, expect.closeTo(2.54, 9)],
      [68.58, 40.386, 45, expect.closeTo(2.54, 9)],
      [66.04, 53.34, 45, expect.closeTo(1.524, 9)],
    ]);
  });

  it("give the MEGA 2560 the outline, holes and headers of Arduino's PCB file", () => {
    const board = SBC_BOARDS.arduinoMega;
    expect(board).toMatchObject({ width: 101.6, depth: 53.34, cornerRadius: 1, holeDiameter: 3.2 });
    expect(board.holes).toEqual([[13.97, 2.54], [15.24, 50.8], [66.04, 7.62], [66.04, 35.56], [90.17, 50.8], [96.52, 2.54]]);
    const outline = board.outline!;
    expect(outline.plateWidth).toBe(99.06);
    const step = outline.add[0];
    expect([step.x - step.width / 2, step.x + step.width / 2]).toEqual([expect.closeTo(99.06, 9), expect.closeTo(101.6, 9)]);
    expect([step.y - step.depth / 2, step.y + step.depth / 2]).toEqual([expect.closeTo(2.54, 9), expect.closeTo(40.386, 9)]);
    expect(outline.cut.map((entry) => [entry.x, entry.y, entry.turn, entry.width * Math.SQRT1_2])).toEqual([
      [101.6, 2.54, 45, expect.closeTo(2.54, 9)],
      [101.6, 40.386, 45, expect.closeTo(2.54, 9)],
      [99.06, 53.34, 45, expect.closeTo(1.524, 9)],
    ]);
    // USB-B and the jack at the left end, the double row at the right end, 2 x 18 pins.
    expect(part("arduinoMega", "USB-B").x0).toBeLessThan(0);
    expect(part("arduinoMega", "power jack").x0).toBeLessThan(0);
    const double = pinDots("arduinoMega", "header (digital 22 to 53)");
    expect(double).toHaveLength(36);
    expect(middles(double, "x")).toEqual([93.98, 96.52]);
    expect(middles(pinDots("arduinoMega", "header (digital 0 to 7)"), "y")).toEqual([50.8]);
    expect(middles(pinDots("arduinoMega", "header (analog 8 to 15)"), "y")).toEqual([2.54]);
    for (const entry of board.parts.filter((item) => item.kind === "header" && !item.name.startsWith("ICSP"))) {
      expect(entry.height, entry.name).toBe(8.5);
      expect(entry.estimated, entry.name).toBeUndefined();
    }
    expect(part("arduinoMega", "RESET button").y0).toBeGreaterThan(40);
    expect(sbcBoardHasButtons(board)).toBe(true);
    expect(board.estimated).toEqual(["thickness"]);
  });

  it("give the ESP32-CAM AI-Thinker's size, the MB under it with its micro-USB at the left end", () => {
    const board = SBC_BOARDS.esp32CamMb;
    expect(board).toMatchObject({ width: 40.5, depth: 27, holes: [], holeDiameter: 0 });
    expect(part("esp32CamMb", "microSD card slot").x1).toBe(40.5);
    expect(part("esp32CamMb", "micro-USB (MB)")).toMatchObject({ x0: -0.7, underside: true, kind: "connector" });
    expect(board.parts.filter((entry) => entry.underside).every((entry) => entry.name.includes("MB"))).toBe(true);
    expect(board.parts.every((entry) => entry.estimated)).toBe(true);
    expect(part("esp32CamMb", "RESET button (MB)")).toMatchObject({ press: "front", underside: true, y0: 0 });
    expect(sbcBoardHasButtons(board)).toBe(true);
  });

  it("give the nulllab ESP32-S3-CAM the size and holes of nulllab's drawing, USB-C at the left end", () => {
    const board = SBC_BOARDS.esp32s3Cam;
    expect(board).toMatchObject({ width: 38.4, depth: 30.4 });
    expect(board.holes).toEqual([[3.2, 3.2], [35.2, 3.2], [3.2, 27.2], [35.2, 27.2]]);
    expect(part("esp32s3Cam", "USB-C").x0).toBeLessThan(0);
    expect(part("esp32s3Cam", "BOOT button").y0).toBeGreaterThan(part("esp32s3Cam", "RESET button").y1);
    expect(pinDots("esp32s3Cam", "pins (GPIO0 to 5V)")).toHaveLength(8);
    expect(sbcBoardHasButtons(board)).toBe(true);
    expect(board.estimated).toEqual(["thickness", "cornerRadius", "holeDiameter"]);
  });

  it("give the ESP32-DevKitC V4 Espressif's outline, 2 x 19 pins 25.4 mm apart and the module past the right end", () => {
    const board = SBC_BOARDS.esp32DevKitC;
    expect(board).toMatchObject({ width: 48.26, depth: 27.94, cornerRadius: 1, holes: [] });
    expect(pinDots("esp32DevKitC", "pins (5V to 3V3)")).toHaveLength(19);
    expect(middles(pinDots("esp32DevKitC", "pins (CLK to GND)"), "y")[0]).toBeCloseTo(1.3, 6);
    expect(middles(pinDots("esp32DevKitC", "pins (5V to 3V3)"), "y")[0]).toBeCloseTo(26.7, 6);
    expect(part("esp32DevKitC", "ESP32-WROOM-32E")).toMatchObject({ x1: 54.3, height: 3.1 });
    expect(part("esp32DevKitC", "ESP32-WROOM-32E").x1 - part("esp32DevKitC", "ESP32-WROOM-32E").x0).toBeCloseTo(25.5, 6);
    expect(part("esp32DevKitC", "micro-USB").x0).toBeLessThan(0);
    expect(part("esp32DevKitC", "EN button").y0).toBeGreaterThan(part("esp32DevKitC", "Boot button").y1);
  });

  it("give the 30-pin ESP32 DevKit V1 its four holes, 2 x 15 pins 25.4 mm apart, all estimated", () => {
    const board = SBC_BOARDS.esp32DevKitV1;
    expect(board).toMatchObject({ width: 51.8, depth: 28.2, holeDiameter: 2.8 });
    expect(board.holes).toEqual([[2.2, 2.2], [2.2, 26.0], [49.6, 2.2], [49.6, 26.0]]);
    expect(pinDots("esp32DevKitV1", "pins (EN to VIN)")).toHaveLength(15);
    expect(board.parts.every((entry) => entry.estimated)).toBe(true);
    expect(part("esp32DevKitV1", "EN button").y0).toBeGreaterThan(part("esp32DevKitV1", "BOOT button").y1);
  });

  it("give the CYD the maker's 50 x 86 mm and four 3.2 mm holes, screen up, its connectors under the board at their edges", () => {
    const board = SBC_BOARDS.cyd;
    expect(board).toMatchObject({ width: 86, depth: 50, holeDiameter: 3.2 });
    expect(board.holes).toEqual([[4, 4], [82, 4], [4, 46], [82, 46]]);
    // The screen module (JC2432A028N) on top, 69.2 mm long and as wide as the board; everything else under it.
    expect(part("cyd", "screen")).toMatchObject({ y0: 0, y1: 50, height: 2.6 });
    expect(part("cyd", "screen").x1 - part("cyd", "screen").x0).toBeCloseTo(69.2, 6);
    expect(board.parts.filter((entry) => !entry.underside).map((entry) => entry.name)).toEqual(["screen"]);
    expect(board.parts.every((entry) => entry.estimated)).toBe(true);
    const edges = (name: string) => sbcPartEdges(board, part("cyd", name));
    expect(edges("micro-USB")).toEqual({ left: true, right: false, front: false, back: false });
    expect(edges("power and serial (P1)")).toEqual({ left: true, right: false, front: false, back: false });
    for (const name of ["microSD card slot", "sensor socket (CN1)", "extended IO (P3)"]) expect(edges(name), name).toEqual({ left: false, right: false, front: false, back: true });
    expect(edges("speaker socket (P4)")).toEqual({ left: false, right: false, front: true, back: false });
    // Not mirrored: seen from the screen, RESET is nearer the antenna end than BOOT, as the maker's interface picture shows from below.
    expect(part("cyd", "RESET button").x0).toBeGreaterThanOrEqual(part("cyd", "BOOT button").x1);
    expect(part("cyd", "ESP32-WROOM-32").x1).toBe(86);
    // A button under the board reaches down through the floor, grown by the clearance.
    const index = board.parts.indexOf(part("cyd", "RESET button"));
    const reset = sbcBoardBlocks(board, 0.3, 0, { buttonReach: 8 })[index];
    expect(reset.top).toBe(0);
    expect(reset.bottom).toBeCloseTo(-(2.0 + 0.3 + 8), 9);
    expect(sbcBoardHasButtons(board)).toBe(true);
  });

  it("give the Waveshare ESP32-S3-Zero the pins of Waveshare's model: 2 x 9, 2.54 mm apart, the first 1.59 mm from the end", () => {
    const board = SBC_BOARDS.waveshareEsp32s3Zero;
    expect(board).toMatchObject({ width: 23.5, depth: 18, thickness: 1.6, holes: [] });
    const dots = sbcBoardSolids(board, 0, 0).filter((solid) => solid.role === "pin");
    const xs = [...new Set(dots.map((dot) => Math.round(((dot.x0 + dot.x1) / 2) * 1000) / 1000))].sort((a, b) => a - b);
    const ys = [...new Set(dots.map((dot) => Math.round(((dot.y0 + dot.y1) / 2) * 1000) / 1000))].sort((a, b) => a - b);
    expect(xs[0]).toBeCloseTo(1.59, 3);
    expect(xs[8]).toBeCloseTo(21.91, 3);
    expect(ys).toEqual([expect.closeTo(1.371, 3), expect.closeTo(16.611, 3)]);
    // The USB-C stands 1.23 mm over the right end, as the model has it.
    expect(part("waveshareEsp32s3Zero", "USB-C").x1 - board.width).toBeCloseTo(1.23, 6);
    // Waveshare's drawing: R 1.00 corners; BOOT on the side of the 5V pins, where the antenna is, RESET on the TX/RX side.
    expect(board).toMatchObject({ cornerRadius: 1, estimated: [] });
    expect(part("waveshareEsp32s3Zero", "BOOT button").y0).toBeGreaterThan(board.depth / 2);
    expect(part("waveshareEsp32s3Zero", "RESET button").y1).toBeLessThan(board.depth / 2);
    expect(part("waveshareEsp32s3Zero", "ceramic antenna").y1).toBeGreaterThan(board.depth / 2);
  });

  it("give the Arduino Pro Mini SparkFun's outline and pins: 12 + 12 down the long edges, 6 FTDI pins at the right end", () => {
    const board = SBC_BOARDS.arduinoProMini;
    expect(board).toMatchObject({ width: 33.02, depth: 17.78, thickness: 0.8, holes: [] });
    const dots = sbcBoardSolids(board, 0, 0).filter((solid) => solid.role === "pin");
    expect(dots).toHaveLength(12 + 12 + 6 + 2 + 2);
    const at = (name: string) => sbcBoardSolids(board, 0, 0).filter((solid) => solid.role === "pin" && solid.name.startsWith(name));
    const middle = (dot: { x0: number; x1: number; y0: number; y1: number }) => [(dot.x0 + dot.x1) / 2, (dot.y0 + dot.y1) / 2];
    // The long rows 16.51 mm apart, 1.27 mm in; their pins 2.54 mm apart from 1.27 mm to 29.21 mm.
    for (const [name, y] of [["pins (D10 to RAW)", 1.27], ["pins (D9 to TXO)", 16.51]] as const) {
      const row = at(name).map(middle).sort((a, b) => a[0] - b[0]);
      expect(row, name).toHaveLength(12);
      row.forEach(([x, rowY], i) => { expect(x, name).toBeCloseTo(1.27 + 2.54 * i, 6); expect(rowY, name).toBeCloseTo(y, 6); });
    }
    const ftdi = at("FTDI pins").map(middle).sort((a, b) => a[1] - b[1]);
    ftdi.forEach(([x, y], i) => { expect(x).toBeCloseTo(31.75, 6); expect(y).toBeCloseTo(2.54 + 2.54 * i, 6); });
    expect(board.parts.some((entry) => entry.kind === "connector")).toBe(false);
  });

  it("give the CYD with two USB ports the same plate and screen, its USB-C between the power socket and the micro-USB", () => {
    const [first, second] = [SBC_BOARDS.cyd, SBC_BOARDS.cyd2usb];
    for (const key of ["width", "depth", "holes", "holeDiameter", "outline", "thickness", "cornerRadius"] as const) expect(second[key], key).toEqual(first[key]);
    expect(part("cyd2usb", "screen")).toEqual(part("cyd", "screen"));
    expect(second.parts.map((entry) => entry.name).sort()).toEqual([...first.parts.map((entry) => entry.name), "USB-C"].sort());
    for (const name of ["USB-C", "micro-USB", "power and serial (P1)"]) expect(sbcPartEdges(second, part("cyd2usb", name)).left, name).toBe(true);
    expect(part("cyd2usb", "USB-C").y0).toBeGreaterThan(part("cyd2usb", "power and serial (P1)").y1);
    expect(part("cyd2usb", "micro-USB").y0).toBeGreaterThan(part("cyd2usb", "USB-C").y1);
    expect(sbcPartEdges(second, part("cyd2usb", "speaker socket (P4)")).front).toBe(true);
    expect(second.parts.every((entry) => entry.estimated)).toBe(true);
  });

  it("give the D1 mini V4.0.0 the outline and pins of Wemos's drawing, laid with USB-C at the left", () => {
    const board = SBC_BOARDS.wemosD1Mini;
    expect(board).toMatchObject({ width: 34.3, depth: 25.4, cornerRadius: 1, holes: [] });
    // The antenna end's corners 4 mm round, the notch's outer corner 1 mm.
    expect(board.outline!.round).toEqual([{ x: 34.3, y: 0, radius: 4 }, { x: 34.3, y: 25.4, radius: 4 }, { x: 0, y: 23.5, radius: 1 }]);
    // The notch: x below 6.8 at y above 23.5, then the edge slanting to (7.7, 25.4).
    const [notch, slant] = board.outline!.cut;
    expect([notch.x + notch.width / 2, notch.y - notch.depth / 2]).toEqual([expect.closeTo(6.8, 9), expect.closeTo(23.5, 9)]);
    const turn = (slant.turn! * Math.PI) / 180;
    // The slanted piece's corner at (6.8, 23.5), its long side running towards (7.7, 25.4).
    const corner = [slant.x + (Math.sin(turn) * slant.depth + Math.cos(turn) * slant.width) / 2, slant.y + (Math.sin(turn) * slant.width - Math.cos(turn) * slant.depth) / 2];
    expect(corner).toEqual([expect.closeTo(6.8, 9), expect.closeTo(23.5, 9)]);
    expect([-Math.sin(turn), Math.cos(turn)].map((v) => v * Math.hypot(0.9, 1.9))).toEqual([expect.closeTo(0.9, 9), expect.closeTo(1.9, 9)]);
    // 2 x 8 pins, 2.54 mm apart, the rows 22.86 mm apart, the first 8.815 mm from the USB end.
    const dots = sbcBoardSolids(board, 0, 0).filter((solid) => solid.role === "pin");
    expect(dots).toHaveLength(16);
    expect(middles(dots, "y")).toEqual([1.27, 24.13]);
    expect(middles(dots, "x")[0]).toBeCloseTo(8.815, 6);
    expect(middles(dots, "x")[1] - middles(dots, "x")[0]).toBeCloseTo(2.54, 6);
    expect(sbcPartEdges(board, part("wemosD1Mini", "USB-C"))).toEqual({ left: true, right: false, front: false, back: false });
    expect(part("wemosD1Mini", "USB-C").profile).toBe("usbC");
    expect(board.parts.every((entry) => entry.estimated)).toBe(true);
  });

  it("put each board's USB socket at its left end, as the makers' top views show, so a wall opening finds it", () => {
    for (const [type, name] of [["featherEsp32s3", "USB-C"], ["arduinoUno", "USB-B"], ["arduinoUno", "power jack"], ["arduinoNano", "mini-USB"], ["wemosD1Mini", "USB-C"]] as const) {
      const board = SBC_BOARDS[type];
      expect(sbcPartEdges(board, part(type, name)), `${type} ${name}`).toEqual({ left: true, right: false, front: false, back: false });
      expect(part(type, name).kind).toBe("connector");
      const index = board.parts.indexOf(part(type, name));
      expect(sbcBoardBlocks(board, 0.3, 4)[index].x0, `${type} ${name}`).toBeCloseTo(part(type, name).x0 - 4.3, 9);
    }
    // Not mirrored: the UNO's USB-B behind its power jack, its digital pins at the back, power and analog at the front.
    expect(part("arduinoUno", "USB-B").y0).toBeGreaterThan(part("arduinoUno", "power jack").y1);
    expect(part("arduinoUno", "header (digital 0 to 7)").y0).toBeGreaterThan(40);
    expect(part("arduinoUno", "header (power)").y1).toBeLessThan(5);
    // The Feather's battery connector at the back, its RESET button nearer the USB end than BOOT, the module at the far end.
    expect(part("featherEsp32s3", "battery connector (JST PH)").y1).toBeGreaterThan(20);
    expect(part("featherEsp32s3", "RESET button").x1).toBeLessThan(part("featherEsp32s3", "BOOT button").x0);
    expect(part("featherEsp32s3", "module antenna").x1).toBeGreaterThan(50);
    // Only the Feather's USB-C has a socket outline; the UNO's and the Nano's sockets are boxes.
    expect(part("featherEsp32s3", "USB-C").profile).toBe("usbC");
    expect(part("arduinoUno", "USB-B").profile).toBeUndefined();
    expect(part("arduinoNano", "mini-USB").profile).toBeUndefined();
  });

  it("show the pins as dots 2.54 mm apart, where the PCB files have them", () => {
    // Feather: 16 pins from x = 6.35 at y = 1.27, 12 from x = 16.51 at y = 21.59.
    const front = pinDots("featherEsp32s3", "pins (RST to DB)");
    const back = pinDots("featherEsp32s3", "pins (BAT to SDA)");
    expect(front).toHaveLength(16);
    expect(back).toHaveLength(12);
    expect(middles(front, "x")[0]).toBeCloseTo(6.35, 6);
    expect(middles(back, "x")[0]).toBeCloseTo(16.51, 6);
    expect(middles(front, "y")).toEqual([1.27]);
    expect(middles(back, "y")).toEqual([21.59]);
    // UNO: the digital pins at y = 50.8 from x = 18.8, the power and analog ones at 2.54; the ICSP 2 x 3.
    const digital = [...pinDots("arduinoUno", "header (digital 0 to 7)"), ...pinDots("arduinoUno", "header (digital 8 to 13)")];
    expect(digital).toHaveLength(18);
    expect(middles(digital, "y")).toEqual([50.8]);
    expect(middles(pinDots("arduinoUno", "header (digital 0 to 7)"), "x")[0]).toBeCloseTo(18.8, 6);
    expect(middles(pinDots("arduinoUno", "header (digital 8 to 13)"), "x")[0]).toBeCloseTo(45.72, 6);
    expect(middles([...pinDots("arduinoUno", "header (power)"), ...pinDots("arduinoUno", "header (analog)")], "y")).toEqual([2.54]);
    expect(middles(pinDots("arduinoUno", "header (power)"), "x")[0]).toBeCloseTo(27.94, 6);
    expect(middles(pinDots("arduinoUno", "header (analog)"), "x")[0]).toBeCloseTo(50.8, 6);
    expect(middles(pinDots("arduinoUno", "ICSP header"), "x")).toEqual([63.63, 66.17]);
    expect(middles(pinDots("arduinoUno", "ICSP header"), "y")).toEqual([25.4, 27.94, 30.48]);
    // Nano: two rows of 15 from x = 3.81 at y = 1.27 and 16.51, 15.24 mm apart.
    const nano = [...pinDots("arduinoNano", "pins (front row)"), ...pinDots("arduinoNano", "pins (back row)")];
    expect(nano).toHaveLength(30);
    expect(middles(nano, "x")[0]).toBeCloseTo(3.81, 6);
    expect(middles(nano, "y")).toEqual([1.27, 16.51]);
    expect(pinDots("arduinoNano", "ICSP pads")).toHaveLength(6);
  });

  it("mark what the PCB files do not give as estimated, and keep the UNO's female headers at the file's 8.5 mm", () => {
    for (const name of ["header (digital 8 to 13)", "header (digital 0 to 7)", "header (power)", "header (analog)"]) {
      expect(part("arduinoUno", name)).toMatchObject({ height: 8.5 });
      expect(part("arduinoUno", name).estimated).toBeUndefined();
    }
    for (const name of ["USB-B", "power jack", "ATmega328P (in its socket)", "ICSP header"]) expect(part("arduinoUno", name).estimated, name).toBe(true);
    expect(SBC_BOARDS.arduinoNano.parts.every((entry) => entry.estimated)).toBe(true);
    expect(SBC_BOARDS.arduinoUno.estimated).toEqual(["thickness"]);
    expect(SBC_BOARDS.arduinoNano.estimated).toEqual(["thickness"]);
    // The Feather's heights come from Adafruit's 3D model: only the loose header pins' pads are estimated.
    expect(SBC_BOARDS.featherEsp32s3.estimated).toBeUndefined();
    expect(SBC_BOARDS.featherEsp32s3.parts.filter((entry) => entry.estimated).map((entry) => entry.name)).toEqual(["pins (RST to DB)", "pins (BAT to SDA)"]);
    expect(part("featherEsp32s3", "USB-C").height).toBe(3.22);
  });
});

describe("the buttons' reach", () => {
  const block = (type: SbcBoardType, name: string, clearance: number, buttonReach?: number) => {
    const board = SBC_BOARDS[type];
    return sbcBoardBlocks(board, clearance, 3, buttonReach === undefined ? {} : { buttonReach })[board.parts.findIndex((part) => part.name === name)];
  };

  it("leaves the buttons as they are by default, and stores no reach of 0", () => {
    expect(block("featherEsp32s3", "RESET button", 0.3)).toMatchObject({ x0: 8.546, x1: 13.044, y0: 3.544, y1: 6.744, height: 2.51 });
    expect(normalizeSbcBoardSettings({ board: "featherEsp32s3", clearance: 0, buttonReach: 0 })).toEqual({ board: "featherEsp32s3", clearance: 0, reach: 0 });
    expect(normalizeSbcBoardSettings({ board: "featherEsp32s3", clearance: 0, buttonReach: 250 })?.buttonReach).toBe(MAX_SBC_BUTTON_REACH);
    expect(normalizeSbcBoardSettings({ board: "featherEsp32s3", clearance: 0, buttonReach: -1 })).not.toHaveProperty("buttonReach");
  });

  it("makes a button pressed from above reach up, grown by the clearance, and nothing else", () => {
    const reset = block("featherEsp32s3", "RESET button", 0.3, 12);
    expect(reset.x0).toBeCloseTo(8.546 - 0.3, 9);
    expect(reset.x1).toBeCloseTo(13.044 + 0.3, 9);
    expect(reset.y0).toBeCloseTo(3.544 - 0.3, 9);
    expect(reset.y1).toBeCloseTo(6.744 + 0.3, 9);
    expect(reset.height).toBeCloseTo(2.51 + 0.3 + 12, 9);
    expect(reset.bottom).toBe(SBC_BOARDS.featherEsp32s3.thickness);
    // Every board's buttons pressed from above alike; the other parts do not move.
    for (const type of SBC_BOARD_ORDER) {
      const board = SBC_BOARDS[type];
      const before = sbcBoardBlocks(board, 0.3, 3);
      const after = sbcBoardBlocks(board, 0.3, 3, { buttonReach: 12 });
      board.parts.forEach((part, index) => {
        if (part.kind !== "button") expect(after[index], `${type} ${part.name}`).toEqual(before[index]);
        else if (!part.press) expect(after[index].height, `${type} ${part.name}`).toBeCloseTo(part.height + 0.3 + 12, 9);
      });
    }
  });

  it("makes a button pressed from the side reach out of that side only: the Pi 5's power button left, the D1 mini's RESET back", () => {
    const power = block("pi5", "power button", 0.3, 5);
    expect(power.x0).toBeCloseTo(-0.5 - 0.3 - 5, 9);
    expect(power.x1).toBeCloseTo(3.1 + 0.3, 9);
    expect(power.height).toBeCloseTo(3.3 + 0.3, 9);
    const reset = block("wemosD1Mini", "RESET button", 0.3, 5);
    expect(reset.y1).toBeCloseTo(23.5 + 0.3 + 5, 9);
    expect(reset.y0).toBeCloseTo(20.56 - 0.3, 9);
    expect(reset.x0).toBeCloseTo(1.0 - 0.3, 9);
    expect(reset.height).toBeCloseTo(2.0 + 0.3, 9);
    const pressedFromSide = SBC_BOARD_ORDER.flatMap((type) => SBC_BOARDS[type].parts.filter((part) => part.press).map((part) => `${type} ${part.name} ${part.press}`));
    expect(pressedFromSide).toEqual(["pi5 power button left", "wemosD1Mini RESET button back", "esp32CamMb RESET button (MB) front"]);
  });

  it("offers the reach on every board with buttons", () => {
    expect(SBC_BOARD_ORDER.filter((type) => sbcBoardHasButtons(SBC_BOARDS[type]))).toEqual(SBC_BOARD_ORDER.filter((type) => SBC_BOARDS[type].parts.some((part) => part.kind === "button")));
    expect(sbcBoardHasButtons(SBC_BOARDS.arduinoUno)).toBe(true);
  });
});

describe("the Raspberry Pi Pico series", () => {
  const PICOS = ["pico", "picoW", "pico2", "pico2W"] as const;
  const part = (type: SbcBoardType, name: string) => SBC_BOARDS[type].parts.find((entry) => entry.name === name)!;

  it("match Raspberry Pi's STEP models: 51 x 21 mm, four 2.1 mm holes 2 mm from the ends and 11.4 mm apart", () => {
    for (const type of PICOS) {
      expect(SBC_BOARDS[type], type).toMatchObject({ width: 51, depth: 21, cornerRadius: 0, holeDiameter: 2.1 });
      expect(SBC_BOARDS[type].holes, type).toEqual([[2, 4.8], [2, 16.2], [49, 4.8], [49, 16.2]]);
    }
  });

  it("put micro-USB at the left end, BOOTSEL and pin 1 at the front by it, as the official pinout drawings show", () => {
    for (const type of PICOS) {
      const board = SBC_BOARDS[type];
      expect(sbcPartEdges(board, part(type, "micro-USB")), type).toEqual({ left: true, right: false, front: false, back: false });
      expect(part(type, "micro-USB").profile).toBe("microUsb");
      // Not mirrored: BOOTSEL nearer the front (GP0's side) than the back, and near the USB end.
      const bootsel = part(type, "BOOTSEL button");
      expect(bootsel.kind).toBe("button");
      expect((bootsel.y0 + bootsel.y1) / 2, type).toBeLessThan(board.depth / 2);
      expect(bootsel.x1, type).toBeLessThan(board.width / 3);
      expect(part(type, "pins (GP0 to GP15)").y1, type).toBeLessThan(5);
      expect(part(type, "pins (VBUS to GP16)").y0, type).toBeGreaterThan(15);
    }
    // The W boards' Wi-Fi module at the far end from the USB.
    for (const type of ["picoW", "pico2W"] as const) expect(part(type, "Wi-Fi module").x0, type).toBeGreaterThan(30);
  });

  it("show 2 x 20 pins 2.54 mm apart, 17.78 mm across", () => {
    for (const type of PICOS) {
      const dots = sbcBoardSolids(SBC_BOARDS[type], 0, 0).filter((solid) => solid.role === "pin");
      expect(dots, type).toHaveLength(40);
      const ys = [...new Set(dots.map((dot) => Math.round(((dot.y0 + dot.y1) / 2) * 1000) / 1000))].sort((a, b) => a - b);
      expect(ys, type).toEqual([1.61, 19.39]);
      const xs = [...new Set(dots.map((dot) => Math.round(((dot.x0 + dot.x1) / 2) * 1000) / 1000))].sort((a, b) => a - b);
      expect(xs[0], type).toBeCloseTo(1.37, 6);
      expect(xs[1] - xs[0], type).toBeCloseTo(2.54, 6);
    }
  });

  it("mark only the loose pins' pads as estimated, but the Pico 2 W, which has no model of its own", () => {
    for (const type of ["pico", "picoW", "pico2"] as const) {
      expect(SBC_BOARDS[type].parts.filter((entry) => entry.estimated).map((entry) => entry.name), type).toEqual(["pins (GP0 to GP15)", "pins (VBUS to GP16)"]);
    }
    expect(SBC_BOARDS.pico2W.parts.every((entry) => entry.estimated)).toBe(true);
    expect(SBC_BOARDS.pico2W.estimated).toEqual(["thickness"]);
  });
});
