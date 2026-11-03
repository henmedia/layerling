/*
 * SBC boards (Discussion #1098): single-board computers true to size, to design a case or a mount
 * around - the outline, the mounting holes, and the connectors and larger chips as simple blocks at
 * their real places and heights.
 *
 * Every board is drawn in one frame, seen from above with the HDMI or power edge towards you:
 * x along the long edge from the end without USB, y from that front edge, heights from the top of
 * the board, all in mm. A negative x or y is a part that reaches past the board's edge.
 *
 * Where the numbers come from:
 * - Raspberry Pi 5: the official 3D model (RP-010083, "rpi-5 3D STEP - No Graphics", Raspberry Pi Ltd),
 *   each part's box read from it.
 * - Raspberry Pi 4 Model B: the mechanical drawing (RP-008342 DXF for places, RP-008343 PDF for the heights
 *   written on it, "Z=").
 * - Raspberry Pi 3 Model B+: the mechanical drawing (RP-008336 DXF for places, RP-008337 PDF for its "Z-Height").
 * - Raspberry Pi Zero 2 W: the mechanical drawing (RP-008358), which gives the outline, the holes and the
 *   connectors' middles only; their widths are read off the drawing and their heights are estimated.
 * - BIGTREETECH Pi V1.2: the maker's own 3D model (BIGTREETECH_Pi_V1.2.step, github.com/bigtreetech/BTT-Pi).
 * - Seeed Studio XIAO ESP32-C6: Seeed's own KiCad project (XIAO_ESP32_C6_v1.0_SCH&PCB_260114.zip, the
 *   wiki's "XIAO ESP32-C6 KiCad Project"): the outline from the board's Edge.Cuts (20.955 x 17.78 mm),
 *   the thickness from its Gerber job (1.6 mm), and the places of the antenna (ANT1, KH5220 5.2 x 2 x
 *   1.1 mm), the U.FL socket (ANT2, U.FL-R-SMT-1, 2.6 x 2.6 mm; its height Hirose's 1.25 mm), the two
 *   buttons (K1, K2, 2.6 x 1.6 x 0.53 mm) and the LEDs (CHG1, D4, 0402) from their footprints, x from the
 *   left edge, y from the edge with the user LED. The 2 x 7 pins from Seeed's footprint
 *   XIAO-ESP32-C6-DIP.kicad_mod (github.com/Seeed-Studio/OPL_Kicad_Library). The project has no part for
 *   the metal shield over the chip: its size is read off Seeed's flat top view and `estimated`, as are
 *   the USB-C socket's length, the LEDs' and the shield's heights and the corners.
 * - ESP32-C3 Super Mini: no maker's drawing exists (the boards are sold unbranded). From the most common
 *   published model, Ulf Hille's "ESP32C3 SuperMini" STEP (GrabCAD, in github.com/mrtnvgr/KiCad_ESP32-C3-SuperMini):
 *   18 x 22.52 x 0.9 mm, square corners, the pins 1.74 mm from the USB end, the buttons, the chip and the
 *   antenna. That model draws the USB-C socket narrower than the USB Type-C specification allows (5.88 mm);
 *   it is drawn 8.94 mm wide in its place. It has no LEDs, so none are drawn. All of it is `estimated`.
 * - ESP32-C6 Super Mini: no maker's drawing either. From the published community model "ESP32-C6
 *   SuperMini.step" (SolidWorks, github.com/mistic100/Nixie-Clock-IN2): 18 x 26 x 1.15 mm, square
 *   corners, 2 x 10 pins, each part's box read from it. All of it is `estimated`; the model does not
 *   say which button is BOOT and which RESET.
 * A value the maker does not give is marked `estimated`. A board without mounting holes has `holes: []`.
 *
 * The microSD card slot: on the Raspberry Pi 5 and the BIGTREETECH Pi read from the same 3D models;
 * on the Pi 4 and the 3 B+ its place and the card standing out of the board from the drawings' DXF
 * (layer PARTS_BOTTOM: the socket 1.69 to 13.13 x 22.11 to 34.10 mm, the card from x = -2.27), its
 * height estimated; on the Zero 2 W, where it is on top, read off the drawing (RP-008358), its height
 * estimated. It reaches to the board's edge (or the card past it), the way the card goes in, so it is
 * a connector at the left edge and gets the clearance and the reach.
 *
 * Adding a board: its type in `SbcBoardType` (types/layerling.ts), its entry in SBC_BOARDS and
 * SBC_BOARD_ORDER, and the `board` enum of layerling_create_sbc_board (a unit test holds the two
 * lists together). The clearance and the reach need nothing: which parts are connectors at an
 * edge, and at which edge, is read from their kind and place (`sbcPartEdges`).
 */

import type { PortProfile, SbcBoardSettings, SbcBoardType } from "@/types/layerling";

export type { SbcBoardSettings, SbcBoardType };

/** What a block is, for its colour and for the clearance: only connectors at the edge get the extra room. */
export type SbcPartKind = "connector" | "header" | "chip" | "shield" | "button";

/**
 * The shape of a connector, the same on every board: a socket with its own front outline (USB-C,
 * micro-USB, the HDMI sockets), a housing with openings in its front (a stack of two USB-A, an
 * Ethernet jack), or an audio jack with its round collar. A part without one stays a box.
 */
export type SbcConnectorProfile = "usbC" | "microUsb" | "microHdmi" | "miniHdmi" | "hdmi" | "usbA2" | "rj45" | "audio";

export type SbcPart = {
  /** English name, for the code and the MCP. */
  name: string;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  /** Height above the top of the board. */
  height: number;
  kind: SbcPartKind;
  /** The connector's shape; without one the part is a plain box. */
  profile?: SbcConnectorProfile;
  /** A pin header's pins as [columns, rows] at 2.54 mm, shown as dots on its top. */
  pins?: [number, number];
  /** The height (or, for the Zero and the ESP32 boards, the place too) is not given by the maker. */
  estimated?: boolean;
  /** Under the board (the microSD card slot): its height is measured down from the board's underside. */
  underside?: boolean;
  /** A ribbon cable's connector (camera, display, PCIe): it can open up through a lid or out through a wall. */
  ribbon?: boolean;
  /** The GPIO header: it can reach up through a lid. */
  gpio?: boolean;
  /** The edge a ribbon cable's way out goes to, where the nearer one would cross other connectors. */
  ribbonExit?: "left" | "right" | "front" | "back";
};

export type SbcBoard = {
  type: SbcBoardType;
  name: string;
  width: number;
  depth: number;
  thickness: number;
  /** 0: square corners. */
  cornerRadius: number;
  /** 0 for a board without mounting holes. */
  holeDiameter: number;
  /** The mounting holes' middles; empty for a board without them (the ESP32 boards). */
  holes: Array<[number, number]>;
  /** The board's colour: green for a Raspberry Pi, black for the BTT Pi and the ESP32 boards. */
  color: string;
  parts: SbcPart[];
  /** Values that are estimated, besides the parts marked so (hole diameter, thickness). */
  estimated?: Array<"holeDiameter" | "thickness" | "cornerRadius">;
};

const piHoles = (depth: number): Array<[number, number]> => [[3.5, 3.5], [61.5, 3.5], [3.5, depth - 3.5], [61.5, depth - 3.5]];

export const SBC_BOARDS: Record<SbcBoardType, SbcBoard> = {
  pi5: {
    type: "pi5",
    name: "Raspberry Pi 5",
    width: 85,
    depth: 56,
    thickness: 1.28,
    cornerRadius: 3,
    holeDiameter: 2.7,
    holes: piHoles(56),
    color: "#1f7a3a",
    parts: [
      { name: "USB-C power", x0: 6.7, x1: 15.7, y0: -1.2, y1: 6.6, height: 3.3, kind: "connector", profile: "usbC" },
      { name: "micro-HDMI 0", x0: 22.1, x1: 29.6, y0: -1.4, y1: 6.5, height: 3.5, kind: "connector", profile: "microHdmi" },
      { name: "micro-HDMI 1", x0: 35.5, x1: 43.0, y0: -1.4, y1: 6.5, height: 3.5, kind: "connector", profile: "microHdmi" },
      // Their cables go out at the left end, with the PCIe cable's: the right end holds the Ethernet and USB.
      { name: "camera/display 0", x0: 47.1, x1: 50.7, y0: 0.2, y1: 16.9, height: 4.0, kind: "header", ribbon: true, ribbonExit: "left" },
      { name: "camera/display 1", x0: 53.3, x1: 56.9, y0: 0.2, y1: 16.9, height: 4.0, kind: "header", ribbon: true, ribbonExit: "left" },
      { name: "Ethernet", x0: 66.5, x1: 88.1, y0: 1.5, y1: 19.0, height: 13.3, kind: "connector", profile: "rj45" },
      { name: "USB-A (middle)", x0: 70.5, x1: 88.0, y0: 21.8, y1: 36.3, height: 16.2, kind: "connector", profile: "usbA2" },
      { name: "USB-A (back)", x0: 70.3, x1: 87.8, y0: 39.8, y1: 54.3, height: 16.1, kind: "connector", profile: "usbA2" },
      { name: "GPIO header", x0: 7.1, x1: 57.9, y0: 50.0, y1: 55.0, height: 8.6, kind: "header", pins: [20, 2], gpio: true },
      { name: "PoE header", x0: 59.0, x1: 64.0, y0: 7.0, y1: 12.0, height: 8.6, kind: "header", pins: [2, 2] },
      { name: "PCIe connector", x0: 1.1, x1: 4.7, y0: 23.2, y1: 36.8, height: 4.0, kind: "header", ribbon: true },
      // The socket from x = 2.25 in the model, 1.42 mm deep under the board; drawn to the edge, where the card goes in.
      { name: "microSD card slot", x0: 0, x1: 13.65, y0: 22.11, y1: 34.06, height: 1.42, kind: "connector", underside: true },
      { name: "power button", x0: -0.5, x1: 3.1, y0: 16.2, y1: 20.7, height: 3.3, kind: "button" },
      { name: "SoC", x0: 24.7, x1: 41.7, y0: 14.3, y1: 31.3, height: 2.4, kind: "chip" },
      { name: "chip", x0: 52.5, x1: 64.5, y0: 29.1, y1: 41.1, height: 1.2, kind: "chip" },
      { name: "chip", x0: 25.9, x1: 40.4, y0: 34.2, y1: 44.2, height: 1.0, kind: "chip" },
      { name: "shield can", x0: 6.9, x1: 17.7, y0: 36.2, y1: 49.2, height: 1.7, kind: "shield" },
      { name: "small connector", x0: 17.0, x1: 21.0, y0: 3.3, y1: 7.1, height: 4.3, kind: "header" },
      { name: "small connector", x0: 30.0, x1: 35.0, y0: 2.5, y1: 6.3, height: 4.3, kind: "header" },
      { name: "fan connector", x0: 65.3, x1: 69.1, y0: 49.0, y1: 55.0, height: 4.3, kind: "header" },
    ],
  },
  pi4: {
    type: "pi4",
    name: "Raspberry Pi 4 Model B",
    width: 85,
    depth: 56,
    thickness: 1.4,
    cornerRadius: 3,
    holeDiameter: 2.7,
    holes: piHoles(56),
    color: "#1f7a3a",
    estimated: ["thickness"],
    parts: [
      { name: "USB-C power", x0: 6.88, x1: 15.53, y0: -1.25, y1: 6.15, height: 3.2, kind: "connector", profile: "usbC" },
      { name: "micro-HDMI 0", x0: 22.4, x1: 29.6, y0: -1.43, y1: 6.52, height: 3.0, kind: "connector", profile: "microHdmi" },
      { name: "micro-HDMI 1", x0: 35.9, x1: 43.1, y0: -1.43, y1: 6.52, height: 3.0, kind: "connector", profile: "microHdmi" },
      { name: "camera", x0: 45.05, x1: 49.0, y0: 0.3, y1: 22.7, height: 5.5, kind: "header", ribbon: true, ribbonExit: "left" },
      { name: "audio/video jack", x0: 50.5, x1: 57.5, y0: -2.5, y1: 12.5, height: 6.0, kind: "connector", profile: "audio" },
      { name: "USB 2.0", x0: 70.3, x1: 88.0, y0: 1.65, y1: 15.57, height: 16.0, kind: "connector", profile: "usbA2" },
      { name: "USB 3.0", x0: 70.5, x1: 88.0, y0: 20.43, y1: 34.25, height: 16.0, kind: "connector", profile: "usbA2" },
      { name: "Ethernet", x0: 66.65, x1: 88.0, y0: 37.99, y1: 53.51, height: 13.5, kind: "connector", profile: "rj45" },
      { name: "display", x0: 1.5, x1: 5.45, y0: 16.8, y1: 39.2, height: 5.5, kind: "header", ribbon: true },
      { name: "GPIO header", x0: 7.1, x1: 57.9, y0: 50.0, y1: 55.0, height: 8.5, kind: "header", pins: [20, 2], gpio: true },
      { name: "microSD card slot", x0: -2.27, x1: 13.13, y0: 22.11, y1: 34.1, height: 1.4, kind: "connector", underside: true, estimated: true },
      { name: "PoE header", x0: 59.0, x1: 64.0, y0: 43.86, y1: 48.86, height: 8.5, kind: "header", estimated: true, pins: [2, 2] },
      { name: "SoC", x0: 21.75, x1: 36.75, y0: 25.0, y1: 40.0, height: 2.4, kind: "chip" },
      { name: "RAM", x0: 39.05, x1: 50.55, y0: 25.0, y1: 40.0, height: 1.0, kind: "chip", estimated: true },
      { name: "USB controller", x0: 55.5, x1: 63.5, y0: 20.0, y1: 28.0, height: 1.0, kind: "chip", estimated: true },
      { name: "shield can", x0: 6.6, x1: 17.4, y0: 36.1, y1: 49.1, height: 1.5, kind: "shield", estimated: true },
    ],
  },
  pi3bPlus: {
    type: "pi3bPlus",
    name: "Raspberry Pi 3 Model B+",
    width: 85,
    depth: 56,
    thickness: 1.4,
    cornerRadius: 3,
    holeDiameter: 2.75,
    holes: piHoles(56),
    color: "#1f7a3a",
    estimated: ["thickness"],
    parts: [
      { name: "micro-USB power", x0: 6.85, x1: 14.35, y0: -0.6, y1: 4.71, height: 3.0, kind: "connector", estimated: true, profile: "microUsb" },
      { name: "HDMI", x0: 24.75, x1: 39.25, y0: -1.5, y1: 10.65, height: 6.5, kind: "connector", profile: "hdmi" },
      { name: "camera", x0: 43.55, x1: 47.5, y0: 0.3, y1: 22.7, height: 5.5, kind: "header", ribbon: true, ribbonExit: "left" },
      { name: "audio/video jack", x0: 50.0, x1: 57.0, y0: -2.5, y1: 12.5, height: 6.0, kind: "connector", profile: "audio" },
      { name: "Ethernet", x0: 65.65, x1: 87.0, y0: 2.5, y1: 18.0, height: 13.5, kind: "connector", profile: "rj45" },
      { name: "USB 2.0 (middle)", x0: 69.3, x1: 87.0, y0: 21.65, y1: 35.57, height: 16.0, kind: "connector", profile: "usbA2" },
      { name: "USB 2.0 (back)", x0: 69.3, x1: 87.0, y0: 39.65, y1: 53.57, height: 16.0, kind: "connector", profile: "usbA2" },
      { name: "display", x0: 1.5, x1: 5.45, y0: 16.8, y1: 39.2, height: 5.5, kind: "header", ribbon: true },
      { name: "GPIO header", x0: 7.1, x1: 57.9, y0: 50.0, y1: 55.0, height: 8.5, kind: "header", pins: [20, 2], gpio: true },
      { name: "microSD card slot", x0: -2.27, x1: 13.13, y0: 22.11, y1: 34.1, height: 1.4, kind: "connector", underside: true, estimated: true },
      { name: "PoE header", x0: 59.0, x1: 63.99, y0: 44.1, y1: 48.66, height: 8.5, kind: "header", estimated: true, pins: [2, 2] },
      { name: "SoC", x0: 19.98, x1: 33.98, y0: 24.52, y1: 38.52, height: 2.0, kind: "chip", estimated: true },
      { name: "USB/Ethernet controller", x0: 57.05, x1: 66.05, y0: 23.38, y1: 32.38, height: 1.0, kind: "chip", estimated: true },
      { name: "shield can", x0: 6.6, x1: 17.1, y0: 36.16, y1: 49.36, height: 1.5, kind: "shield", estimated: true },
    ],
  },
  zero2w: {
    type: "zero2w",
    name: "Raspberry Pi Zero 2 W",
    width: 65,
    depth: 30,
    thickness: 1.4,
    cornerRadius: 3,
    holeDiameter: 2.7,
    holes: piHoles(30),
    color: "#1f7a3a",
    estimated: ["holeDiameter", "thickness", "cornerRadius"],
    // The drawing gives the connectors' middles (12.4, 41.4 and 54 mm); widths and the camera read off it.
    parts: [
      { name: "mini-HDMI", x0: 6.9, x1: 17.9, y0: -0.5, y1: 7.0, height: 3.5, kind: "connector", estimated: true, profile: "miniHdmi" },
      { name: "micro-USB (data)", x0: 37.65, x1: 45.15, y0: -1.0, y1: 4.5, height: 3.0, kind: "connector", estimated: true, profile: "microUsb" },
      { name: "micro-USB (power)", x0: 50.25, x1: 57.75, y0: -1.0, y1: 4.5, height: 3.0, kind: "connector", estimated: true, profile: "microUsb" },
      { name: "camera", x0: 62.0, x1: 65.0, y0: 7.0, y1: 23.0, height: 1.5, kind: "connector", estimated: true, ribbon: true },
      // On top here: the socket read off the drawing from x = 1.6, drawn to the edge, where the card goes in.
      { name: "microSD card slot", x0: 0, x1: 12.9, y0: 11.2, y1: 23.0, height: 1.4, kind: "connector", estimated: true },
      { name: "system in package", x0: 19.8, x1: 34.9, y0: 6.4, y1: 21.7, height: 1.3, kind: "shield", estimated: true },
      { name: "chip", x0: 37.8, x1: 49.8, y0: 7.2, y1: 19.3, height: 1.0, kind: "chip", estimated: true },
    ],
  },
  bttPi12: {
    type: "bttPi12",
    name: "BIGTREETECH Pi V1.2",
    width: 85,
    depth: 56,
    thickness: 1.6,
    cornerRadius: 2.1,
    holeDiameter: 2.5,
    // One hole is 5.9 mm off the Raspberry Pi place (67.35 instead of 61.5); the manual gives 64 x 49.4 mm.
    holes: [[3.3, 3.3], [61.54, 3.3], [3.3, 52.7], [67.35, 52.7]],
    color: "#1b1b1b",
    parts: [
      { name: "USB-C (UART to USB)", x0: 9.04, x1: 17.98, y0: -1.37, y1: 6.78, height: 3.77, kind: "connector", profile: "usbC" },
      { name: "audio jack", x0: 22.18, x1: 28.43, y0: -1.4, y1: 12.6, height: 4.3, kind: "connector", profile: "audio" },
      { name: "micro-HDMI", x0: 32.54, x1: 39.04, y0: -1.44, y1: 6.06, height: 3.05, kind: "connector", profile: "microHdmi" },
      { name: "CAN connector", x0: 41.75, x1: 54.25, y0: 0.9, y1: 9.9, height: 8.0, kind: "header" },
      { name: "Ethernet", x0: 67.04, x1: 88.44, y0: 2.4, y1: 18.28, height: 13.5, kind: "connector", profile: "rj45" },
      { name: "USB 2.0 (middle)", x0: 70.79, x1: 88.38, y0: 21.44, y1: 37.14, height: 16.3, kind: "connector", profile: "usbA2" },
      { name: "USB 2.0 (back)", x0: 70.77, x1: 88.37, y0: 39.42, y1: 55.12, height: 16.3, kind: "connector", profile: "usbA2" },
      { name: "GPIO header", x0: 13.47, x1: 64.27, y0: 50.39, y1: 55.47, height: 9.25, kind: "header", pins: [20, 2], gpio: true },
      // The socket from x = 0.54 in the model, 1.44 mm deep under the board; drawn to the edge, where the card goes in.
      { name: "microSD card slot", x0: 0, x1: 14.04, y0: 27.31, y1: 38.69, height: 1.44, kind: "connector", underside: true },
      { name: "power terminal", x0: -2.95, x1: 7.35, y0: 38.91, y1: 49.51, height: 14.15, kind: "connector" },
      { name: "fan connector", x0: 43.07, x1: 53.07, y0: 38.3, y1: 47.3, height: 8.0, kind: "header" },
      { name: "SPI display connector", x0: 0.97, x1: 5.88, y0: 8.37, y1: 23.77, height: 6.27, kind: "header" },
      { name: "ADXL345 connector", x0: 1.0, x1: 6.17, y0: 26.75, y1: 36.35, height: 4.72, kind: "header" },
      { name: "IR receiver", x0: 6.79, x1: 12.81, y0: 51.52, y1: 57.02, height: 6.25, kind: "header" },
      { name: "SoC", x0: 30.7, x1: 42.93, y0: 20.2, y1: 34.37, height: 1.1, kind: "chip" },
      { name: "RAM", x0: 46.82, x1: 60.28, y0: 18.87, y1: 26.47, height: 1.0, kind: "chip" },
      { name: "RAM", x0: 46.82, x1: 60.28, y0: 29.28, y1: 36.88, height: 1.0, kind: "chip" },
      { name: "capacitor", x0: 11.86, x1: 18.86, y0: 31.61, y1: 38.21, height: 5.2, kind: "chip" },
    ],
  },
  xiaoEsp32c6: {
    type: "xiaoEsp32c6",
    name: "Seeed Studio XIAO ESP32-C6",
    width: 20.955,
    depth: 17.78,
    thickness: 1.6,
    cornerRadius: 1,
    holeDiameter: 0,
    holes: [],
    color: "#1b1b1b",
    estimated: ["cornerRadius"],
    // USB-C at the right end; the pins 2.805 mm from the other end, 2.54 mm apart, rows 1.28 mm in from the long edges.
    parts: [
      { name: "USB-C", x0: 15.25, x1: 22.67, y0: 4.42, y1: 13.36, height: 3.26, kind: "connector", profile: "usbC", estimated: true },
      { name: "pins (VBUS to D7)", x0: 2.005, x1: 18.845, y0: 0.48, y1: 2.08, height: 0.05, kind: "header", pins: [7, 1], estimated: true },
      { name: "pins (D0 to D6)", x0: 2.005, x1: 18.845, y0: 15.72, y1: 17.32, height: 0.05, kind: "header", pins: [7, 1], estimated: true },
      { name: "BOOT button", x0: 19.07, x1: 20.67, y0: 1.02, y1: 3.62, height: 0.53, kind: "button" },
      { name: "RESET button", x0: 19.07, x1: 20.67, y0: 14.17, y1: 16.77, height: 0.53, kind: "button" },
      { name: "user LED", x0: 16.04, x1: 17.04, y0: 2.83, y1: 3.33, height: 0.4, kind: "chip", estimated: true },
      { name: "charge LED", x0: 16.04, x1: 17.04, y0: 14.51, y1: 15.01, height: 0.4, kind: "chip", estimated: true },
      { name: "shield can", x0: 3.94, x1: 14.04, y0: 2.88, y1: 15.12, height: 1.8, kind: "shield", estimated: true },
      { name: "ceramic antenna", x0: 0.15, x1: 2.15, y0: 3.17, y1: 8.37, height: 1.1, kind: "chip" },
      // The external antenna's socket: the cable plugs in from above, so it is no connector at the edge.
      { name: "U.FL antenna socket", x0: 0.11, x1: 2.71, y0: 11.89, y1: 14.49, height: 1.25, kind: "header" },
    ],
  },
  esp32c3SuperMini: {
    type: "esp32c3SuperMini",
    name: "ESP32-C3 Super Mini",
    width: 22.52,
    depth: 18,
    thickness: 0.9,
    cornerRadius: 0,
    holeDiameter: 0,
    holes: [],
    color: "#1b1b1b",
    estimated: ["thickness"],
    // USB-C at the right end; the pins 1.74 mm from it, 2.54 mm apart, rows 1.38 mm in from the long edges.
    parts: [
      { name: "USB-C", x0: 16.67, x1: 24.02, y0: 4.53, y1: 13.47, height: 3.12, kind: "connector", profile: "usbC", estimated: true },
      { name: "pins (5V to GPIO0)", x0: 1.94, x1: 21.58, y0: 0.58, y1: 2.18, height: 0.1, kind: "header", pins: [8, 1], estimated: true },
      { name: "pins (GPIO5 to GPIO21)", x0: 1.94, x1: 21.58, y0: 15.82, y1: 17.42, height: 0.1, kind: "header", pins: [8, 1], estimated: true },
      { name: "RESET button", x0: 12.58, x1: 14.78, y0: 4.15, y1: 7.95, height: 1.7, kind: "button", estimated: true },
      { name: "BOOT button", x0: 12.58, x1: 14.78, y0: 10.05, y1: 13.85, height: 1.7, kind: "button", estimated: true },
      { name: "ESP32-C3", x0: 4.2, x1: 11.27, y0: 4.46, y1: 11.54, height: 1.0, kind: "chip", estimated: true },
      { name: "ceramic antenna", x0: 0.1, x1: 2.1, y0: 6.25, y1: 11.75, height: 1.0, kind: "chip", estimated: true },
    ],
  },
  esp32c6SuperMini: {
    type: "esp32c6SuperMini",
    name: "ESP32-C6 Super Mini",
    width: 26,
    depth: 18,
    thickness: 1.15,
    cornerRadius: 0,
    holeDiameter: 0,
    holes: [],
    color: "#1b1b1b",
    estimated: ["thickness"],
    // USB-C at the right end; the pins 1.57 mm from the ends, 2.54 mm apart, rows 1.39 mm in from the long edges.
    parts: [
      { name: "USB-C", x0: 20.57, x1: 27.97, y0: 4.53, y1: 13.47, height: 3.38, kind: "connector", profile: "usbC", estimated: true },
      { name: "pins (5V to GPIO8)", x0: 0.77, x1: 25.23, y0: 0.59, y1: 2.19, height: 0.1, kind: "header", pins: [10, 1], estimated: true },
      { name: "pins (TX to GPIO7)", x0: 0.77, x1: 25.23, y0: 15.83, y1: 17.43, height: 0.1, kind: "header", pins: [10, 1], estimated: true },
      { name: "button (front)", x0: 15.37, x1: 18.37, y0: 2.63, y1: 6.63, height: 1.93, kind: "button", estimated: true },
      { name: "button (back)", x0: 15.37, x1: 18.37, y0: 11.38, y1: 15.38, height: 1.93, kind: "button", estimated: true },
      { name: "LED (front)", x0: 24.39, x1: 25.39, y0: 2.67, y1: 3.17, height: 0.35, kind: "chip", estimated: true },
      { name: "LED (back)", x0: 24.39, x1: 25.39, y0: 14.92, y1: 15.42, height: 0.35, kind: "chip", estimated: true },
      { name: "RGB LED (WS2812)", x0: 9.78, x1: 11.78, y0: 13.22, y1: 15.42, height: 0.87, kind: "chip", estimated: true },
      { name: "ESP32-C6", x0: 7.12, x1: 14.26, y0: 5.55, y1: 12.7, height: 0.91, kind: "chip", estimated: true },
      { name: "ceramic antenna", x0: 0.33, x1: 2.33, y0: 7.82, y1: 13.57, height: 0.76, kind: "chip", estimated: true },
    ],
  },
};

export const SBC_BOARD_ORDER: SbcBoardType[] = ["pi5", "pi4", "pi3bPlus", "zero2w", "bttPi12", "xiaoEsp32c6", "esp32c3SuperMini", "esp32c6SuperMini"];
export const DEFAULT_SBC_BOARD: SbcBoardType = "pi5";
/** Extra room for the connectors at the edge, so a case wall cut with the board leaves them a gap: 0 to 2 mm. */
export const MAX_SBC_CLEARANCE = 2;

export function normalizeSbcClearance(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(MAX_SBC_CLEARANCE, Math.max(0, value)) : 0;
}

/** How much further out the connectors at the edge reach, so they cut through a case wall: 0 to 10 mm. */
export const MAX_SBC_REACH = 10;

export function normalizeSbcReach(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(MAX_SBC_REACH, Math.max(0, value)) : 0;
}

/** How far the openings going up (ribbon cables, the GPIO header) reach above their part: 20 to 100 mm, so they pass a lid. */
export const MIN_SBC_UP_REACH = 20;
export const MAX_SBC_UP_REACH = 100;

export function normalizeSbcUpReach(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(MAX_SBC_UP_REACH, Math.max(MIN_SBC_UP_REACH, value)) : MIN_SBC_UP_REACH;
}

/** The openings asked for besides the connectors at the edge: ribbon cables up or out, the GPIO header up, and how far up. */
export type SbcPassages = { ribbonUp?: boolean; ribbonSide?: boolean; gpioUp?: boolean; upReach?: number };

/** The stored settings made safe, or null when they name no known board. Openings not asked for are left out. */
export function normalizeSbcBoardSettings(input: unknown): SbcBoardSettings | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Partial<SbcBoardSettings>;
  if (!SBC_BOARD_ORDER.includes(raw.board as SbcBoardType)) return null;
  return {
    board: raw.board as SbcBoardType,
    clearance: normalizeSbcClearance(raw.clearance),
    reach: normalizeSbcReach(raw.reach),
    ...(raw.ribbonUp === true ? { ribbonUp: true } : {}),
    ...(raw.ribbonSide === true ? { ribbonSide: true } : {}),
    ...(raw.gpioUp === true ? { gpioUp: true } : {}),
    ...(raw.upReach !== undefined ? { upReach: normalizeSbcUpReach(raw.upReach) } : {}),
  };
}

/** The board has a ribbon cable connector, or a GPIO header: whether the card offers their openings. */
export function sbcBoardHasRibbon(board: SbcBoard) {
  return board.parts.some((part) => part.ribbon);
}
export function sbcBoardHasGpio(board: SbcBoard) {
  return board.parts.some((part) => part.gpio);
}

/** How close to the board's edge a part must come to count as standing at it, in mm. */
const EDGE_TOLERANCE = 0.5;

/**
 * The edges of the board a part stands at (or reaches past): left (x = 0), right (x = width),
 * front (y = 0) and back (y = depth). Read from the part's place alone, so a board added to
 * SBC_BOARDS needs nothing more for its connectors to get the clearance and the reach.
 */
export function sbcPartEdges(board: SbcBoard, part: SbcPart) {
  return {
    left: part.x0 <= EDGE_TOLERANCE,
    right: part.x1 >= board.width - EDGE_TOLERANCE,
    front: part.y0 <= EDGE_TOLERANCE,
    back: part.y1 >= board.depth - EDGE_TOLERANCE,
  };
}

/** A part reaches the board's edge (or past it): a connector a case wall must leave room for. */
export function sbcPartAtEdge(board: SbcBoard, part: SbcPart) {
  const edges = sbcPartEdges(board, part);
  return edges.left || edges.right || edges.front || edges.back;
}

export type SbcBlock = SbcPart & {
  /** The block grown by the clearance, bottom on the board's top (top on its underside for a part under it). */
  bottom: number;
  top: number;
};

/** The part opens up through a lid with these openings: a ribbon cable's connector or the GPIO header asked for. */
function opensUp(part: SbcPart, passages: SbcPassages) {
  return (part.ribbon && passages.ribbonUp === true) || (part.gpio && passages.gpioUp === true);
}

/**
 * The blocks as built. A connector at the edge is grown by the clearance on every side but its
 * bottom, which stays on the board (its top, for one under the board), and then reaches further
 * out by the reach on each edge it stands at, so it cuts through a case wall. A ribbon cable's
 * connector or the GPIO header asked to open up is grown the same and reaches `upReach` higher,
 * through a lid. The rest stay as they are. Works the same for every board. Heights are from the
 * bottom of the board; a part under it lies below 0.
 */
export function sbcBoardBlocks(board: SbcBoard, clearance = 0, reach = 0, passages: SbcPassages = {}): SbcBlock[] {
  const extra = normalizeSbcClearance(clearance);
  const further = normalizeSbcReach(reach);
  const up = normalizeSbcUpReach(passages.upReach);
  return board.parts.map((part) => {
    const edges = sbcPartEdges(board, part);
    const atEdge = part.kind === "connector" && (edges.left || edges.right || edges.front || edges.back);
    const rising = opensUp(part, passages);
    const grow = atEdge || rising ? extra : 0;
    const out = atEdge ? further : 0;
    const box = {
      ...part,
      x0: part.x0 - grow - (edges.left ? out : 0),
      x1: part.x1 + grow + (edges.right ? out : 0),
      y0: part.y0 - grow - (edges.front ? out : 0),
      y1: part.y1 + grow + (edges.back ? out : 0),
      height: part.height + grow + (rising ? up : 0),
    };
    return part.underside
      ? { ...box, bottom: -(part.height + grow), top: 0 }
      : { ...box, bottom: board.thickness, top: board.thickness + box.height };
  });
}

/** The board and everything on it, as a box in the board's frame: what the body's size will be. */
export function sbcBoardExtent(board: SbcBoard, clearance = 0, reach = 0, passages: SbcPassages = {}) {
  return sbcSolidsExtent(board, sbcBoardSolids(board, clearance, reach, passages));
}

/*
 * The sockets' front outlines, as the Port opening shape draws them, without the room an opening
 * adds round them. A socket is never drawn wider or taller than its part's box.
 */
const SOCKET_SHELLS: Record<"usbC" | "microUsb" | "microHdmi" | "miniHdmi" | "hdmi", { width: number; height: number; corner: number; portProfile: PortProfile }> = {
  // USB Type-C specification: receptacle shell 8.94 x 3.26 mm, its ends fully round.
  usbC: { width: 8.94, height: 3.26, corner: 1.63, portProfile: "rounded" },
  // Micro-B receptacle about 7.5 x 2.6 mm (the Port opening's micro-USB less its 0.25 mm of room).
  microUsb: { width: 7.5, height: 2.6, corner: 0.35, portProfile: "rounded" },
  // Würth WR-COM 685119248123: shell 6.2 x 3.0 mm, the lower corners cut.
  microHdmi: { width: 6.2, height: 3.0, corner: 0.3, portProfile: "microHdmi" },
  // Würth WR-COM 685119136923: shell 10.5 x 2.5 mm, the lower corners cut.
  miniHdmi: { width: 10.5, height: 2.5, corner: 0.3, portProfile: "miniHdmi" },
  // HDMI type A: the Multicomp MC34931 panel cut-out (15.7 x 6.2 mm) less about 0.35 mm of room. Estimated.
  hdmi: { width: 15.0, height: 5.5, corner: 0.3, portProfile: "hdmi" },
};
/** The openings in a housing's front: two USB-A ports one above the other, or one Ethernet jack. Estimated. */
const USB_A_OPENING = { width: 12.0, height: 4.5, middles: [0.27, 0.7] };
const RJ45_OPENING = { width: 11.7, height: 8.3, middle: 0.45 };
/** An audio jack's round collar in front of its housing. Estimated. */
const AUDIO_COLLAR_DIAMETER = 6;
/** How far an opening drawn on a housing's front and a pin's dot stand out of it, in mm: enough to be seen. */
const MARK_DEPTH = 0.05;
const PIN_PITCH = 2.54;
const PIN_SIZE = 0.64;

/** What a solid stands for, which picks its colour. */
export type SbcSolidRole = SbcPartKind | "opening" | "pin";

/**
 * One body of the board's parts, in the board's frame (mm, heights from the board's underside).
 * A box fills its footprint; a profile is an outline pushed along y (`along: "y"`, a socket on the
 * front or back edge) or along x (on the left or right edge), the width across it, as the Port
 * opening shape draws it.
 */
export type SbcSolid = {
  name: string;
  role: SbcSolidRole;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  bottom: number;
  top: number;
  profile?: { portProfile: PortProfile; corner: number; along: "x" | "y" };
};

/** Which way a part at the edge faces: the edge it stands at, front and back before the sides. */
function facing(board: SbcBoard, part: SbcPart) {
  const edges = sbcPartEdges(board, part);
  if (edges.front) return "front" as const;
  if (edges.back) return "back" as const;
  if (edges.left) return "left" as const;
  if (edges.right) return "right" as const;
  return null;
}

/**
 * Every body the board's parts are made of, with the clearance and the reach applied, for every
 * board alike: a plain part is its block; a socket is its front outline, grown by the clearance
 * around its middle as the Port opening grows, pushed along its block; a housing is its block with
 * its openings drawn on the front; an audio jack is its round collar in front of its housing; a pin
 * header gets a dot for every pin.
 */
export function sbcBoardSolids(board: SbcBoard, clearance = 0, reach = 0, passages: SbcPassages = {}): SbcSolid[] {
  const extra = normalizeSbcClearance(clearance);
  const blocks = sbcBoardBlocks(board, extra, reach, passages);
  const cableWays = passages.ribbonSide === true ? ribbonWays(board, extra, reach) : new Map<SbcPart, SbcSolid>();
  return board.parts.flatMap((part, index): SbcSolid[] => {
    const block = blocks[index];
    const plain: SbcSolid = { name: part.name, role: part.kind, x0: block.x0, x1: block.x1, y0: block.y0, y1: block.y1, bottom: block.bottom, top: block.top };
    // A ribbon cable's way out through a wall, asked for, beside its connector.
    const way = cableWays.get(part);
    const sideway = way ? [way] : [];
    const side = part.kind === "connector" ? facing(board, part) : null;
    const along = side === "front" || side === "back" ? "y" as const : "x" as const;
    // Across the face: x for a part on the front or back edge, y on a side edge.
    const across = (box: { x0: number; x1: number; y0: number; y1: number }) => along === "y" ? [box.x0, box.x1] : [box.y0, box.y1];
    const face = (box: { x0: number; x1: number; y0: number; y1: number }, from: number, to: number, lo: number, hi: number) => {
      // A box from `from` to `to` straight out of the face, `lo` to `hi` across it.
      const out = side === "front" ? { y0: box.y0 - to, y1: box.y0 - from } : side === "back" ? { y0: box.y1 + from, y1: box.y1 + to }
        : side === "left" ? { x0: box.x0 - to, x1: box.x0 - from } : { x0: box.x1 + from, x1: box.x1 + to };
      return along === "y" ? { x0: lo, x1: hi, y0: out.y0!, y1: out.y1! } : { y0: lo, y1: hi, x0: out.x0!, x1: out.x1! };
    };
    if (part.pins) {
      const [columns, rows] = part.pins;
      const midX = (part.x0 + part.x1) / 2;
      const midY = (part.y0 + part.y1) / 2;
      // The longer side of the header holds the columns.
      const alongX = part.x1 - part.x0 >= part.y1 - part.y0;
      const dots: SbcSolid[] = [];
      for (let column = 0; column < columns; column += 1) {
        for (let row = 0; row < rows; row += 1) {
          const u = (column - (columns - 1) / 2) * PIN_PITCH;
          const v = (row - (rows - 1) / 2) * PIN_PITCH;
          const x = midX + (alongX ? u : v);
          const y = midY + (alongX ? v : u);
          // On the header's own top, also when it reaches up through a lid.
          const pinTop = board.thickness + part.height;
          dots.push({ name: `${part.name} pin`, role: "pin", x0: x - PIN_SIZE / 2, x1: x + PIN_SIZE / 2, y0: y - PIN_SIZE / 2, y1: y + PIN_SIZE / 2, bottom: pinTop, top: pinTop + MARK_DEPTH });
        }
      }
      return [plain, ...dots, ...sideway];
    }
    if (!side || !part.profile) return [plain, ...sideway];
    const grow = sbcPartAtEdge(board, part) ? extra : 0;
    const [partLo, partHi] = across(part);
    const middle = (partLo + partHi) / 2;
    if (part.profile in SOCKET_SHELLS) {
      const shell = SOCKET_SHELLS[part.profile as keyof typeof SOCKET_SHELLS];
      const width = Math.min(shell.width, partHi - partLo) + 2 * grow;
      const naturalHeight = Math.min(shell.height, part.height);
      const height = naturalHeight + 2 * grow;
      // Grown around its middle, as the Port opening grows, but never below the board's underside.
      const bottom = Math.max(0, board.thickness - grow);
      const corner = Math.min(shell.corner + grow, Math.min(width, height) / 2);
      const footprint = along === "y" ? { x0: middle - width / 2, x1: middle + width / 2, y0: block.y0, y1: block.y1 } : { x0: block.x0, x1: block.x1, y0: middle - width / 2, y1: middle + width / 2 };
      return [{ name: part.name, role: "connector", ...footprint, bottom, top: bottom + height, profile: { portProfile: shell.portProfile, corner, along } }];
    }
    if (part.profile === "usbA2" || part.profile === "rj45") {
      const [lo, hi] = across(block);
      const housingHeight = block.top - block.bottom;
      const openings = part.profile === "usbA2"
        ? USB_A_OPENING.middles.map((share) => ({ width: USB_A_OPENING.width, height: USB_A_OPENING.height, middle: block.bottom + housingHeight * share }))
        : [{ width: RJ45_OPENING.width, height: RJ45_OPENING.height, middle: block.bottom + housingHeight * RJ45_OPENING.middle }];
      const mid = (lo + hi) / 2;
      return [plain, ...openings.map((opening) => ({
        name: `${part.name} opening`,
        role: "opening" as const,
        ...face(block, 0, MARK_DEPTH, mid - Math.min(opening.width, hi - lo) / 2, mid + Math.min(opening.width, hi - lo) / 2),
        bottom: opening.middle - opening.height / 2,
        top: opening.middle + opening.height / 2,
      }))];
    }
    // The audio jack: its housing behind the board's edge, its round collar in front of it.
    const edgeOut = side === "front" ? -part.y0 : side === "back" ? part.y1 - board.depth : side === "left" ? -part.x0 : part.x1 - board.width;
    const collarLength = Math.max(0, edgeOut);
    if (collarLength <= 0) return [plain];
    const housing = { ...block };
    if (side === "front") housing.y0 = 0 - grow;
    else if (side === "back") housing.y1 = board.depth + grow;
    else if (side === "left") housing.x0 = 0 - grow;
    else housing.x1 = board.width + grow;
    const diameter = Math.min(AUDIO_COLLAR_DIAMETER, partHi - partLo, part.height) + 2 * grow;
    const centre = board.thickness + Math.min(AUDIO_COLLAR_DIAMETER, partHi - partLo, part.height) / 2;
    const bottom = Math.max(0, centre - diameter / 2);
    // From the grown housing's front: the collar's own length and the reach (its clearance is in the housing's front).
    const outer = collarLength + normalizeSbcReach(reach);
    const collar = face(housing, 0, outer, middle - diameter / 2, middle + diameter / 2);
    return [
      { name: part.name, role: "connector", x0: housing.x0, x1: housing.x1, y0: housing.y0, y1: housing.y1, bottom: housing.bottom, top: housing.top },
      { name: `${part.name} collar`, role: "connector", ...collar, bottom, top: bottom + diameter, profile: { portProfile: "rounded", corner: diameter / 2, along } },
    ];
  });
}

/** The board's parts as built, as a box in the board's frame: what the body's size will be. */
export function sbcSolidsExtent(board: SbcBoard, solids: readonly SbcSolid[]) {
  return {
    minX: Math.min(0, ...solids.map((solid) => solid.x0)),
    maxX: Math.max(board.width, ...solids.map((solid) => solid.x1)),
    minY: Math.min(0, ...solids.map((solid) => solid.y0)),
    maxY: Math.max(board.depth, ...solids.map((solid) => solid.y1)),
    height: Math.max(board.thickness, ...solids.map((solid) => solid.top)),
    /** The lowest point: 0, the board's underside, or below it for a part under the board. */
    bottom: Math.min(0, ...solids.map((solid) => solid.bottom)),
  };
}

/**
 * The ribbon cables' ways out through the walls. Each cable leaves across its connector's long side
 * (`ribbonSideway`); the cables that go out at the same edge come out there one above the other, in
 * one plane: the connector nearest that edge keeps its own opening, and each further one is laid on
 * top of it, centred on it, as wide as its own connector is long and as high as it stands.
 */
export function ribbonWays(board: SbcBoard, clearance = 0, reach = 0): Map<SbcPart, SbcSolid> {
  const grow = normalizeSbcClearance(clearance);
  const ways = new Map<SbcPart, SbcSolid>();
  const byEdge = new Map<string, Array<{ part: SbcPart; way: SbcSolid; distance: number }>>();
  for (const part of board.parts.filter((entry) => entry.ribbon && entry.kind !== "connector")) {
    const way = ribbonSideway(board, part, grow, reach);
    const edge = way.x0 < 0 ? "left" : way.x1 > board.width ? "right" : way.y0 < 0 ? "front" : "back";
    const distance = edge === "left" ? part.x0 : edge === "right" ? board.width - part.x1 : edge === "front" ? part.y0 : board.depth - part.y1;
    byEdge.set(edge, [...(byEdge.get(edge) ?? []), { part, way, distance }]);
  }
  for (const [edge, list] of byEdge) {
    list.sort((a, b) => a.distance - b.distance);
    const base = list[0].way;
    ways.set(list[0].part, base);
    let top = base.top;
    const sideways = edge === "left" || edge === "right";
    for (const { part } of list.slice(1)) {
      const half = Math.max(part.x1 - part.x0, part.y1 - part.y0) / 2 + grow;
      const middle = sideways ? (base.y0 + base.y1) / 2 : (base.x0 + base.x1) / 2;
      const across = sideways ? { y0: middle - half, y1: middle + half, x0: base.x0, x1: base.x1 } : { x0: middle - half, x1: middle + half, y0: base.y0, y1: base.y1 };
      const bottom = top;
      top = bottom + part.height + grow;
      ways.set(part, { name: `${part.name} cable way`, role: "connector", ...across, bottom, top });
    }
  }
  return ways;
}

/**
 * A ribbon cable's way out through a wall: the cable leaves its connector across the connector's
 * long side, so the opening runs that way to the nearer edge of the board (or the edge the part
 * names, `ribbonExit`, where the nearer one holds other connectors) and on by the reach, as wide as
 * the connector is long and as high as it stands, both grown by the clearance.
 */
export function ribbonSideway(board: SbcBoard, part: SbcPart, clearance = 0, reach = 0): SbcSolid {
  const grow = normalizeSbcClearance(clearance);
  const out = normalizeSbcReach(reach);
  const alongX = part.x1 - part.x0 >= part.y1 - part.y0;
  const bottom = board.thickness;
  const top = board.thickness + part.height + grow;
  if (alongX) {
    // Long side along x: the cable leaves along y, to the front (y = 0) or the back edge.
    const toFront = part.ribbonExit ? part.ribbonExit === "front" : (part.y0 + part.y1) / 2 <= board.depth / 2;
    const y0 = toFront ? -grow - out : (part.y0 + part.y1) / 2;
    const y1 = toFront ? (part.y0 + part.y1) / 2 : board.depth + grow + out;
    return { name: `${part.name} cable way`, role: "connector", x0: part.x0 - grow, x1: part.x1 + grow, y0, y1, bottom, top };
  }
  const toLeft = part.ribbonExit ? part.ribbonExit === "left" : (part.x0 + part.x1) / 2 <= board.width / 2;
  const x0 = toLeft ? -grow - out : (part.x0 + part.x1) / 2;
  const x1 = toLeft ? (part.x0 + part.x1) / 2 : board.width + grow + out;
  return { name: `${part.name} cable way`, role: "connector", x0, x1, y0: part.y0 - grow, y1: part.y1 + grow, bottom, top };
}
