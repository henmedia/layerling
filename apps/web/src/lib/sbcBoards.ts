/*
 * SBC boards (Discussion #1098): single-board computers true to size, to design a case or a mount
 * around - the outline, the mounting holes, and the connectors and larger chips as simple blocks at
 * their real places and heights.
 *
 * Every board is drawn in one frame, seen from above with the HDMI or power edge towards you:
 * x along the long edge from the end without USB, y from that front edge, heights from the top of
 * the board, all in mm. A negative x or y is a part that reaches past the board's edge.
 * The BIGTREETECH Pi is the other way round: with its USB and Ethernet at the right end, its USB-C and
 * HDMI edge is at the back and its GPIO header at the front, as in the maker's model.
 *
 * Where the numbers come from:
 * - Raspberry Pi 5: the official 3D model (RP-010083, "rpi-5 3D STEP - No Graphics", Raspberry Pi Ltd),
 *   each part's box read from it.
 * - Raspberry Pi 4 Model B: the mechanical drawing (RP-008342 DXF for places, RP-008343 PDF for the heights
 *   written on it, "Z="). Each USB block is its housing only (13.14 mm wide, its middle at 9 and 27 mm as the PDF
 *   gives it), without the small tab that the DXF draws at one side of its front.
 * - Raspberry Pi 3 Model B+: the mechanical drawing (RP-008336 DXF for places, RP-008337 PDF for its "Z-Height").
 *   The USB blocks as on the Pi 4: the housing only, its middle at 29 and 47 mm.
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
 *   corners, 2 x 10 pins, each part's box read from it. All of it is `estimated`. The model does not
 *   say which button is BOOT and which RESET: the silkscreen on the board's photo (MakerGO, mischianti.org's
 *   pinout) does, BOOT on the side of the TX and RX pins, RST on the side of the 5V, GND and 3V3 pins.
 * - Adafruit ESP32-S3 Feather (PIDs 5323, 5477 and 5885 share one board): the outline, the holes and the pins
 *   from Adafruit's EagleCAD PCB file ("Adafruit ESP32-S3 8MB No PSRAM.brd", github.com/adafruit/Adafruit-Feather-ESP32-S3-PCB),
 *   every part's box and height from Adafruit's own 3D model ("5323 Feather ESP32-S3.step/.stl",
 *   github.com/adafruit/Adafruit_CAD_Parts), which matches the PCB file. The header pins come loose, so
 *   only their pads are drawn, `estimated` as on the XIAO.
 * - Arduino UNO R3 and Arduino Nano: Arduino's own Eagle PCB files (docs.arduino.cc, "CAD Files":
 *   UNO-TH_Rev3e.brd for the UNO, NanoV3.3.brd for the Nano, A000005): the outline, the holes, and the
 *   parts' places and sizes from their footprints' outlines. The files give no heights, so all are
 *   `estimated`, but the UNO's female headers, which the file names 8.5 mm high (8x1F-H8.5). Both
 *   keep the file's own view: USB at the left end. The Nano's parts under the board (USB chip,
 *   regulator) and its headers, which hang under it, are not drawn.
 * - Arduino MEGA 2560 Rev3: Arduino's own Eagle PCB file (A000067-cad-files.zip, MEGA2560_Rev3e.brd), read
 *   as the UNO's: the outline (101.6 x 53.34 mm, the same stepped right edge), the six holes, the parts'
 *   places and sizes; the female headers 8.5 mm high as the file names them, all other heights `estimated`.
 *   It keeps the file's own view, USB at the left end, as on Arduino's top picture turned half round.
 * - LOLIN (WEMOS) D1 mini V4.0.0: Wemos's dimension drawing (dim_d1_mini_v4.0.0.pdf, wemos.cc): the outline
 *   (25.4 x 34.3 mm, the antenna end's corners 4 mm round, the notch at the RESET button) and the pins'
 *   pads; laid with its USB-C at the left end. The drawing's two holes beside the antenna are left out.
 *   The parts' places come from their pads, their sizes and heights are `estimated`. Wemos gives no
 *   drawing for the older V3.0.0.
 * - Raspberry Pi Pico, Pico W and Pico 2: Raspberry Pi's own STEP models (pip.raspberrypi.com: RP-008311-DS
 *   Pico-R3.step, RP-008318-DS PicoW.stp, RP-009061-CA rpi_pico2.step): the outline (51 x 21 mm), the four
 *   2.1 mm holes, the pins, every part's box and height, turned a quarter so USB is at the left end. The
 *   Pico 2 W has no model of its own: its official pinout drawing shows the Pico W's layout, so it takes
 *   the Pico W's parts, all `estimated`.
 * - ESP32-CAM (AI-Thinker) on the ESP32-CAM-MB programmer board: AI-Thinker gives only the size (27 x 40.5
 *   x 4.5 mm) and no drawing; the MB has no maker at all. The parts' places and heights come from the
 *   published model "ESP32-CAM 3D object with exact dimensions" (goth2k, printables.com/model/525641),
 *   the gap to the MB and its micro-USB from the inside of the published case "ESP32_CAM_RUGGED"
 *   (Craicek, makerworld.com/en/models/2107280). The MB hangs under the camera board; its RESET button,
 *   pressed from the side at the front edge by the USB end, is placed from photos of the pair. All of it is
 *   `estimated`. The camera's lens can open up through a lid (`lensUp`), as on the ESP32-S3-CAM.
 * - nulllab ESP32-S3-CAM: nulllab's size drawing (esp32s3_cam_size.png, github.com/nulllaborg/esp32s3-cam):
 *   38.4 x 30.4 mm, the four holes 32 x 24 mm apart, 3.2 mm from the edges, and the pins' pads; the
 *   parts' places read off that drawing and nulllab's photo, their sizes and heights `estimated`.
 * - Espressif ESP32-DevKitC V4 (38 pins): Espressif's dimension drawing (dl.espressif.com, esp32_devkitc_v4_dimensions.dxf):
 *   48.26 x 27.94 mm, 1 mm corners, no holes, the pins' and the parts' pads; the ESP32-WROOM-32E's size from
 *   Espressif's datasheet (18 x 25.5 x 3.1 mm), its antenna 6.04 mm past the board's end. The other heights `estimated`.
 * - ESP32 DevKit V1 (DOIT, 30 pins): sold unbranded, no maker's drawing. From the published true-size drawing
 *   (mischianti.org, DOIT-ESP32-DevKit-v1.svg; 28.2 x 51.8 mm, four 2.8 mm holes, as a real board was measured
 *   in the Fritzing forum); all of it `estimated`.
 * - ESP32-2432S028R, the "Cheap Yellow Display" (CYD), the first kind with only micro-USB (Discussion #1644): the maker's
 *   specification (Shenzhen Jingcai, "ESP32-2432S028 Specifications-EN.pdf", in github.com/witnessmenow/ESP32-Cheap-Yellow-Display,
 *   OriginalDocumentation): 50 x 86 mm, the four holes 4 mm from the edges and 42 x 78 mm apart, R 1.60 (3.2 mm); the screen
 *   module from the maker's JC2432A028N sheet (50 x 69.2 x 2.3 mm, 0.3 mm foam tape). The places of the cut under the antenna,
 *   the screen and the parts underneath are read off the maker's dimension picture and its interface picture, both true to
 *   scale (checked by the holes), so they are `estimated`; the 1.25 mm sockets 3.57 mm high as HCTL gives its HC-1.25 PWT
 *   series, the module 18 x 25.5 x 3.1 mm (Espressif's datasheet), the other heights `estimated`. Laid screen up, so all
 *   the connectors hang under the board.
 * - The later CYD with micro-USB and USB-C (CYD2USB): no maker's drawing. DIYmall's dimensioned picture of it (the Amazon
 *   listing B0BVFXR313, the same 78 x 42 mm holes 4 mm from the edges, R 1.6), true to scale by its holes, gives the parts'
 *   places, all `estimated`; the plate and the screen as on the first kind.
 * - Waveshare ESP32-S3-Zero (Discussion #1673): Waveshare's own 3D model (ESP32-S3-Zero_v2 .stp, on its documentation
 *   page) and 2D drawing: 23.5 x 18 x 1.6 mm, the 2 x 9 pins (0.9 mm holes) 2.54 mm apart in rows 15.24 mm apart, the
 *   USB-C (8.94 mm wide, 3.25 mm high, 1.23 mm over the end), the two buttons, the chip and the ceramic antenna, read off
 *   the model. The model's corners are square: the corner radius (R 1.00) and which button is BOOT and which RESET are
 *   from Waveshare's dimension drawing and its numbered top view on the ESP32-S3-Zero documentation page (BOOT on the
 *   side of the 5V, GND and 3V3 pins, as the antenna). The ESP32-C3-Zero and ESP32-C6-Zero share its 23.5 x 18 mm outline.
 * - Arduino Pro Mini (Discussion #1673): SparkFun's board file (sparkfun/Arduino_Pro_Mini_328, Hardware/Arduino-Pro-
 *   Mini.brd): 0.7 x 1.3 in (17.78 x 33.02 mm), every pin's place and name, the reset switch and the parts; the PCB 0.8 mm
 *   as SparkFun gives it. The parts' heights are `estimated`.
 * Every board was checked against the maker's own picture of its top, so none is a mirror image.
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

/** The way a button is pressed: from above, or from one side of the board. */
export type SbcPress = "up" | "left" | "right" | "front" | "back";

export type SbcPart = {
  /** English name, for the code and the MCP. */
  name: string;
  /** A button pressed from the side, not from above: the way its reach goes. */
  press?: Exclude<SbcPress, "up">;
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
  /** A camera's lens: it can reach up through a lid. */
  lens?: boolean;
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
  /**
   * The mounting holes' middles; empty for a board without them (the ESP32 boards). A third number
   * is that hole's own diameter, where the holes are not all alike (the Feather).
   */
  holes: Array<[number, number] | [number, number, number]>;
  /**
   * A board that is not a plain rounded rectangle (the Arduino UNO, the D1 mini): the rounded plate
   * is then `plateWidth` wide (missing: `width`), and boxes are added to it and cut from it, each
   * turned by `turn` degrees about its middle (a square turned 45° cuts a corner at 45°); `round`
   * rounds a corner of the plate further, to its own radius. `width` stays the whole board's, for its edges.
   */
  outline?: { plateWidth?: number; add: SbcOutlinePiece[]; cut: SbcOutlinePiece[]; round?: SbcRoundCorner[] };
  /** The board's colour: green for a Raspberry Pi, black for the BTT Pi and the ESP32 boards. */
  color: string;
  parts: SbcPart[];
  /** Values that are estimated, besides the parts marked so (hole diameter, thickness). */
  estimated?: Array<"holeDiameter" | "thickness" | "cornerRadius">;
};

/**
 * A piece of a board's outline: a box by its middle and size, turned `turn` degrees about its middle,
 * counter-clockwise seen from above in the board's frame (x right, y away from you).
 */
export type SbcOutlinePiece = { x: number; y: number; width: number; depth: number; turn?: number };
/** A corner of the plate, (x, y), rounded to `radius` instead of the board's corner radius. */
export type SbcRoundCorner = { x: number; y: number; radius: number };

/** A square turned 45° about (x, y), its corners `half` mm from the middle along x and y. */
const diamond = (x: number, y: number, half: number): SbcOutlinePiece => ({ x, y, width: half * Math.SQRT2, depth: half * Math.SQRT2, turn: 45 });

/**
 * A box with one corner at (x, y), `length` mm along the direction (dx, dy) and `width` mm to its
 * left: to cut beside an edge that runs from (x, y) that way, at any angle.
 */
function alongEdge(x: number, y: number, dx: number, dy: number, length: number, width: number): SbcOutlinePiece {
  const size = Math.hypot(dx, dy);
  const [ux, uy] = [dx / size, dy / size];
  return { x: x + (ux * length - uy * width) / 2, y: y + (uy * length + ux * width) / 2, width, depth: length, turn: (Math.atan2(uy, ux) * 180) / Math.PI - 90 };
}

/** A mounting hole's diameter: its own, or the board's. */
export function sbcHoleDiameter(board: SbcBoard, hole: SbcBoard["holes"][number]) {
  return hole[2] ?? board.holeDiameter;
}

const piHoles = (depth: number): Array<[number, number]> => [[3.5, 3.5], [61.5, 3.5], [3.5, depth - 3.5], [61.5, depth - 3.5]];

/** The CYD's plate, the same on both kinds (the maker's drawing; the second kind's seller drawing gives the same holes). */
const CYD_PLATE: Omit<SbcBoard, "type" | "name" | "parts"> = {
  width: 86,
  depth: 50,
  thickness: 1.6,
  cornerRadius: 3,
  holeDiameter: 3.2,
  holes: [[4, 4], [82, 4], [4, 46], [82, 46]],
  // The board is cut back under the module's antenna, at the end away from USB.
  outline: { add: [], cut: [{ x: 83.0, y: 25.1, width: 7.2, depth: 18.2 }] },
  color: "#e8c21a",
  estimated: ["thickness", "cornerRadius"],
};
/** The screen module (JC2432A028N): 50 x 69.2 x 2.3 mm on 0.3 mm of foam tape; its place along the board is read off the drawing. */
const CYD_SCREEN: SbcPart = { name: "screen", x0: 8.5, x1: 77.7, y0: 0, y1: 50, height: 2.6, kind: "shield", estimated: true };

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
      // Pressed from the side, out of the board's left edge.
      { name: "power button", x0: -0.5, x1: 3.1, y0: 16.2, y1: 20.7, height: 3.3, kind: "button", press: "left" },
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
      { name: "USB 2.0", x0: 70.3, x1: 88.0, y0: 2.43, y1: 15.57, height: 16.0, kind: "connector", profile: "usbA2" },
      { name: "USB 3.0", x0: 70.5, x1: 88.0, y0: 20.43, y1: 33.57, height: 16.0, kind: "connector", profile: "usbA2" },
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
      { name: "USB 2.0 (middle)", x0: 69.3, x1: 87.0, y0: 22.43, y1: 35.57, height: 16.0, kind: "connector", profile: "usbA2" },
      { name: "USB 2.0 (back)", x0: 69.3, x1: 87.0, y0: 40.43, y1: 53.57, height: 16.0, kind: "connector", profile: "usbA2" },
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
    // One hole is 5.9 mm off the Raspberry Pi place (67.35 instead of 61.5, at the front edge); the manual gives 64 x 49.4 mm.
    holes: [[3.3, 52.7], [61.54, 52.7], [3.3, 3.3], [67.35, 3.3]],
    color: "#1b1b1b",
    parts: [
      { name: "USB-C (UART to USB)", x0: 9.04, x1: 17.98, y0: 49.22, y1: 57.37, height: 3.77, kind: "connector", profile: "usbC" },
      { name: "audio jack", x0: 22.18, x1: 28.43, y0: 43.4, y1: 57.4, height: 4.3, kind: "connector", profile: "audio" },
      { name: "micro-HDMI", x0: 32.54, x1: 39.04, y0: 49.94, y1: 57.44, height: 3.05, kind: "connector", profile: "microHdmi" },
      { name: "CAN connector", x0: 41.75, x1: 54.25, y0: 46.1, y1: 55.1, height: 8.0, kind: "header" },
      { name: "Ethernet", x0: 67.04, x1: 88.44, y0: 37.72, y1: 53.6, height: 13.5, kind: "connector", profile: "rj45" },
      { name: "USB 2.0 (middle)", x0: 70.79, x1: 88.38, y0: 18.86, y1: 34.56, height: 16.3, kind: "connector", profile: "usbA2" },
      { name: "USB 2.0 (back)", x0: 70.77, x1: 88.37, y0: 0.88, y1: 16.58, height: 16.3, kind: "connector", profile: "usbA2" },
      { name: "GPIO header", x0: 13.47, x1: 64.27, y0: 0.53, y1: 5.61, height: 9.25, kind: "header", pins: [20, 2], gpio: true },
      // The socket from x = 0.54 in the model, 1.44 mm deep under the board; drawn to the edge, where the card goes in.
      { name: "microSD card slot", x0: 0, x1: 14.04, y0: 17.31, y1: 28.69, height: 1.44, kind: "connector", underside: true },
      { name: "power terminal", x0: -2.95, x1: 7.35, y0: 6.49, y1: 17.09, height: 14.15, kind: "connector" },
      { name: "fan connector", x0: 43.07, x1: 53.07, y0: 8.7, y1: 17.7, height: 8.0, kind: "header" },
      { name: "SPI display connector", x0: 0.97, x1: 5.88, y0: 32.23, y1: 47.63, height: 6.27, kind: "header" },
      { name: "ADXL345 connector", x0: 1.0, x1: 6.17, y0: 19.65, y1: 29.25, height: 4.72, kind: "header" },
      { name: "IR receiver", x0: 6.79, x1: 12.81, y0: -1.02, y1: 4.48, height: 6.25, kind: "header" },
      { name: "SoC", x0: 30.7, x1: 42.93, y0: 21.63, y1: 35.8, height: 1.1, kind: "chip" },
      { name: "RAM", x0: 46.82, x1: 60.28, y0: 29.53, y1: 37.13, height: 1.0, kind: "chip" },
      { name: "RAM", x0: 46.82, x1: 60.28, y0: 19.12, y1: 26.72, height: 1.0, kind: "chip" },
      { name: "capacitor", x0: 11.86, x1: 18.86, y0: 17.79, y1: 24.39, height: 5.2, kind: "chip" },
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
      { name: "RESET button", x0: 15.37, x1: 18.37, y0: 2.63, y1: 6.63, height: 1.93, kind: "button", estimated: true },
      { name: "BOOT button", x0: 15.37, x1: 18.37, y0: 11.38, y1: 15.38, height: 1.93, kind: "button", estimated: true },
      { name: "LED (front)", x0: 24.39, x1: 25.39, y0: 2.67, y1: 3.17, height: 0.35, kind: "chip", estimated: true },
      { name: "LED (back)", x0: 24.39, x1: 25.39, y0: 14.92, y1: 15.42, height: 0.35, kind: "chip", estimated: true },
      { name: "RGB LED (WS2812)", x0: 9.78, x1: 11.78, y0: 13.22, y1: 15.42, height: 0.87, kind: "chip", estimated: true },
      { name: "ESP32-C6", x0: 7.12, x1: 14.26, y0: 5.55, y1: 12.7, height: 0.91, kind: "chip", estimated: true },
      { name: "ceramic antenna", x0: 0.33, x1: 2.33, y0: 7.82, y1: 13.57, height: 0.76, kind: "chip", estimated: true },
    ],
  },
  featherEsp32s3: {
    type: "featherEsp32s3",
    name: "Adafruit ESP32-S3 Feather",
    width: 50.8,
    depth: 22.86,
    thickness: 1.57,
    cornerRadius: 2.54,
    holeDiameter: 2.5,
    // The two at the USB end are plated, 2.5 mm; the two at the antenna end bare, 2.2 mm.
    holes: [[2.54, 2.54], [2.54, 20.32], [48.26, 1.8415, 2.2], [48.26, 20.955, 2.2]],
    color: "#1b1b1b",
    // USB-C at the left end, the 16 pins at the front, the 12 at the back, the module's antenna at the right end.
    parts: [
      { name: "USB-C", x0: -1.083, x1: 6.817, y0: 6.96, y1: 15.9, height: 3.22, kind: "connector", profile: "usbC" },
      // The battery's cable plugs in from the back, inside the case: no opening through the wall.
      { name: "battery connector (JST PH)", x0: 6.972, x1: 14.872, y0: 14.968, y1: 22.568, height: 4.8, kind: "header" },
      { name: "STEMMA QT connector", x0: 20.902, x1: 24.502, y0: 8.39, y1: 14.39, height: 4.3, kind: "header" },
      { name: "RESET button", x0: 8.546, x1: 13.044, y0: 3.544, y1: 6.744, height: 2.51, kind: "button" },
      { name: "BOOT button", x0: 18.706, x1: 23.204, y0: 3.607, y1: 6.807, height: 2.51, kind: "button" },
      { name: "ESP32-S3 module", x0: 31.14, x1: 44.69, y0: 4.43, y1: 18.43, height: 2.55, kind: "shield" },
      { name: "module antenna", x0: 44.69, x1: 51.14, y0: 3.73, y1: 19.13, height: 0.8, kind: "chip" },
      { name: "RGB LED (NeoPixel)", x0: 28.65, x1: 30.15, y0: 7.378, y1: 8.878, height: 0.48, kind: "chip" },
      { name: "charge LED", x0: 0.66, x1: 2.26, y0: 5.067, y1: 5.855, height: 0.71, kind: "chip" },
      { name: "user LED", x0: 0.66, x1: 2.26, y0: 17.132, y1: 17.92, height: 0.71, kind: "chip" },
      // The header pins come loose: their pads, 2.54 mm apart (JP1 and JP3 in the PCB file).
      { name: "pins (RST to DB)", x0: 5.08, x1: 45.72, y0: 0.47, y1: 2.07, height: 0.05, kind: "header", pins: [16, 1], estimated: true },
      { name: "pins (BAT to SDA)", x0: 15.24, x1: 45.72, y0: 20.79, y1: 22.39, height: 0.05, kind: "header", pins: [12, 1], estimated: true },
    ],
  },
  arduinoUno: {
    type: "arduinoUno",
    name: "Arduino UNO R3",
    width: 68.58,
    depth: 53.34,
    thickness: 1.6,
    cornerRadius: 1,
    holeDiameter: 3.2,
    holes: [[13.97, 2.54], [15.24, 50.8], [66.04, 7.62], [66.04, 35.56]],
    color: "#00878f",
    estimated: ["thickness"],
    // The board 66.04 mm wide, its right edge out to 68.58 between y = 5.08 and 37.846, the steps
    // and the back right corner cut at 45° (the PCB file's outline). The step is a strip beside the
    // plate, touching it, its two outer corners cut off; no piece overlaps another.
    outline: {
      plateWidth: 66.04,
      add: [{ x: 67.31, y: 21.463, width: 2.54, depth: 37.846 }],
      cut: [diamond(68.58, 2.54, 2.54), diamond(68.58, 40.386, 2.54), diamond(66.04, 53.34, 1.524)],
    },
    // USB-B and the power jack at the left end, the digital pins at the back, power and analog at the front.
    parts: [
      { name: "USB-B", x0: -6.34, x1: 9.41, y0: 32.2, y1: 44.0, height: 11.0, kind: "connector", estimated: true },
      { name: "power jack", x0: -1.81, x1: 11.68, y0: 3.3, y1: 12.29, height: 11.0, kind: "connector", estimated: true },
      // Female headers 8.5 mm high, as the PCB file names them (8x1F-H8.5).
      { name: "header (digital 8 to 13)", x0: 44.45, x1: 64.77, y0: 49.53, y1: 52.07, height: 8.5, kind: "header", pins: [8, 1] },
      { name: "header (digital 0 to 7)", x0: 17.53, x1: 42.93, y0: 49.53, y1: 52.07, height: 8.5, kind: "header", pins: [10, 1] },
      { name: "header (power)", x0: 26.67, x1: 46.99, y0: 1.27, y1: 3.81, height: 8.5, kind: "header", pins: [8, 1] },
      { name: "header (analog)", x0: 49.53, x1: 64.77, y0: 1.27, y1: 3.81, height: 8.5, kind: "header", pins: [6, 1] },
      { name: "ICSP header", x0: 62.36, x1: 67.44, y0: 24.13, y1: 31.75, height: 8.5, kind: "header", pins: [3, 2], estimated: true },
      { name: "ICSP header (USB chip)", x0: 14.48, x1: 22.1, y0: 43.69, y1: 48.77, height: 8.5, kind: "header", pins: [3, 2], estimated: true },
      { name: "ATmega328P (in its socket)", x0: 27.81, x1: 64.9, y0: 13.59, y1: 19.18, height: 7.6, kind: "chip", estimated: true },
      { name: "ATmega16U2", x0: 17.44, x1: 22.44, y0: 32.17, y1: 37.17, height: 1.0, kind: "chip", estimated: true },
      { name: "crystal", x0: 15.49, x1: 22.35, y0: 23.88, y1: 28.45, height: 3.5, kind: "chip", estimated: true },
      { name: "capacitor", x0: 22.28, x1: 28.78, y0: 5.49, y1: 12.79, height: 5.8, kind: "chip", estimated: true },
      { name: "capacitor", x0: 15.16, x1: 21.66, y0: 5.49, y1: 12.79, height: 5.8, kind: "chip", estimated: true },
      { name: "voltage regulator", x0: 4.09, x1: 11.4, y0: 14.12, y1: 20.68, height: 1.8, kind: "chip", estimated: true },
      { name: "RESET button", x0: 3.25, x1: 9.2, y0: 47.2, y1: 51.6, height: 2.5, kind: "button", estimated: true },
      { name: "LED (ON)", x0: 57.795, x1: 59.045, y0: 35.58, y1: 37.58, height: 0.8, kind: "chip", estimated: true },
      { name: "LED (L)", x0: 27.315, x1: 28.565, y0: 41.16, y1: 43.16, height: 0.8, kind: "chip", estimated: true },
      { name: "LED (TX)", x0: 27.315, x1: 28.565, y0: 35.58, y1: 37.58, height: 0.8, kind: "chip", estimated: true },
      { name: "LED (RX)", x0: 27.315, x1: 28.565, y0: 33.29, y1: 35.29, height: 0.8, kind: "chip", estimated: true },
    ],
  },
  arduinoMega: {
    type: "arduinoMega",
    name: "Arduino MEGA 2560 Rev3",
    width: 101.6,
    depth: 53.34,
    thickness: 1.6,
    cornerRadius: 1,
    holeDiameter: 3.2,
    holes: [[13.97, 2.54], [15.24, 50.8], [66.04, 7.62], [66.04, 35.56], [90.17, 50.8], [96.52, 2.54]],
    color: "#00878f",
    estimated: ["thickness"],
    // From Arduino's PCB file (MEGA2560_Rev3e.brd): the board 99.06 mm wide, its right edge out to 101.6
    // between y = 5.08 and 37.846, the same steps and back right corner cut at 45° as the UNO.
    outline: {
      plateWidth: 99.06,
      add: [{ x: 100.33, y: 21.463, width: 2.54, depth: 37.846 }],
      cut: [diamond(101.6, 2.54, 2.54), diamond(101.6, 40.386, 2.54), diamond(99.06, 53.34, 1.524)],
    },
    // USB-B and the power jack at the left end, the UNO's headers at the back and front, the double row
    // (digital 22 to 53) at the right end.
    parts: [
      { name: "USB-B", x0: -6.34, x1: 9.41, y0: 32.2, y1: 44.0, height: 11.0, kind: "connector", estimated: true },
      { name: "power jack", x0: -1.8, x1: 11.68, y0: 3.3, y1: 12.29, height: 11.0, kind: "connector", estimated: true },
      // Female headers 8.5 mm high, as the PCB file names them (FH254-1xxDF08500V, 18x2F-H8.5).
      { name: "header (digital 0 to 7)", x0: 17.53, x1: 42.93, y0: 49.53, y1: 52.07, height: 8.5, kind: "header", pins: [10, 1] },
      { name: "header (PWM)", x0: 44.45, x1: 64.77, y0: 49.53, y1: 52.07, height: 8.5, kind: "header", pins: [8, 1] },
      { name: "header (communication)", x0: 67.31, x1: 87.63, y0: 49.53, y1: 52.07, height: 8.5, kind: "header", pins: [8, 1] },
      { name: "header (power)", x0: 26.67, x1: 46.99, y0: 1.27, y1: 3.81, height: 8.5, kind: "header", pins: [8, 1] },
      { name: "header (analog 0 to 7)", x0: 49.53, x1: 69.85, y0: 1.27, y1: 3.81, height: 8.5, kind: "header", pins: [8, 1] },
      { name: "header (analog 8 to 15)", x0: 72.39, x1: 92.71, y0: 1.27, y1: 3.81, height: 8.5, kind: "header", pins: [8, 1] },
      { name: "header (digital 22 to 53)", x0: 92.71, x1: 97.79, y0: 6.35, y1: 52.07, height: 8.5, kind: "header", pins: [18, 2] },
      { name: "ICSP header", x0: 62.36, x1: 67.44, y0: 24.13, y1: 31.75, height: 8.5, kind: "header", pins: [3, 2], estimated: true },
      { name: "ICSP header (USB chip)", x0: 14.48, x1: 22.1, y0: 43.69, y1: 48.77, height: 8.5, kind: "header", pins: [3, 2], estimated: true },
      { name: "ATmega2560", x0: 42.6, x1: 59.0, y0: 20.15, y1: 36.55, height: 1.2, kind: "chip", estimated: true },
      { name: "ATmega16U2", x0: 17.44, x1: 22.44, y0: 32.3, y1: 37.3, height: 1.0, kind: "chip", estimated: true },
      { name: "crystal", x0: 14.99, x1: 21.84, y0: 23.75, y1: 28.32, height: 3.5, kind: "chip", estimated: true },
      { name: "capacitor", x0: 22.28, x1: 28.78, y0: 5.49, y1: 12.79, height: 5.8, kind: "chip", estimated: true },
      { name: "capacitor", x0: 15.16, x1: 21.66, y0: 5.49, y1: 12.79, height: 5.8, kind: "chip", estimated: true },
      { name: "voltage regulator", x0: 4.98, x1: 12.29, y0: 14.5, y1: 21.06, height: 1.8, kind: "chip", estimated: true },
      { name: "RESET button", x0: 3.12, x1: 9.22, y0: 45.77, y1: 51.77, height: 2.5, kind: "button", estimated: true },
      { name: "LED (ON)", x0: 75.575, x1: 76.825, y0: 35.83, y1: 37.83, height: 0.8, kind: "chip", estimated: true },
      { name: "LED (L)", x0: 27.315, x1: 28.565, y0: 41.16, y1: 43.16, height: 0.8, kind: "chip", estimated: true },
      { name: "LED (TX)", x0: 27.315, x1: 28.565, y0: 35.58, y1: 37.58, height: 0.8, kind: "chip", estimated: true },
      { name: "LED (RX)", x0: 27.315, x1: 28.565, y0: 33.29, y1: 35.29, height: 0.8, kind: "chip", estimated: true },
    ],
  },
  wemosD1Mini: {
    type: "wemosD1Mini",
    name: "LOLIN (WEMOS) D1 mini V4.0.0",
    width: 34.3,
    depth: 25.4,
    thickness: 1.6,
    cornerRadius: 1,
    // The drawing has two holes beside the antenna; left out, as asked for this board.
    holeDiameter: 0,
    holes: [],
    color: "#1f4fa3",
    estimated: ["thickness"],
    // The drawing turned a quarter clockwise: USB-C at the left end, the antenna at the right end with its
    // corners 4 mm round, the notch for the RESET button at the back left, its edge slanting to (7.7, 25.4).
    outline: {
      add: [],
      cut: [{ x: 2.9, y: 24.95, width: 7.8, depth: 2.9 }, alongEdge(6.8, 23.5, 0.9, 1.9, 2.5, 2)],
      round: [{ x: 34.3, y: 0, radius: 4 }, { x: 34.3, y: 25.4, radius: 4 }, { x: 0, y: 23.5, radius: 1 }],
    },
    parts: [
      // Its place from the drawing's pads, its length and height estimated.
      { name: "USB-C", x0: 0, x1: 7.35, y0: 8.23, y1: 17.17, height: 3.26, kind: "connector", profile: "usbC", estimated: true },
      // Pressed from the side, into the notch at the back edge.
      { name: "RESET button", x0: 1.0, x1: 6.3, y0: 20.56, y1: 23.5, height: 2.0, kind: "button", press: "back", estimated: true },
      // The LOLIN I2C port: its cable plugs in inside the case, so no opening through the wall.
      { name: "I2C connector (JST SH)", x0: 0.25, x1: 7.15, y0: 0.3, y1: 5.1, height: 2.9, kind: "header", estimated: true },
      { name: "USB chip (CH340)", x0: 10.7, x1: 14.5, y0: 3.2, y1: 13.2, height: 1.6, kind: "chip", estimated: true },
      { name: "ESP8266", x0: 18.3, x1: 23.3, y0: 7.5, y1: 12.5, height: 0.9, kind: "chip", estimated: true },
      // The pins' pads from the drawing, 22.86 mm apart; the headers come loose.
      { name: "pins (front row)", x0: 7.545, x1: 27.865, y0: 0.47, y1: 2.07, height: 0.05, kind: "header", pins: [8, 1], estimated: true },
      { name: "pins (back row)", x0: 7.545, x1: 27.865, y0: 23.33, y1: 24.93, height: 0.05, kind: "header", pins: [8, 1], estimated: true },
    ],
  },
  arduinoNano: {
    type: "arduinoNano",
    name: "Arduino Nano",
    width: 43.18,
    depth: 17.78,
    thickness: 1.6,
    cornerRadius: 0,
    holeDiameter: 1.651,
    holes: [[1.27, 1.27], [41.91, 1.27], [1.27, 16.51], [41.91, 16.51]],
    color: "#1c4f9c",
    estimated: ["thickness"],
    // Mini-USB at the left end, the ICSP pads at the right end; the FT232RL and the regulator are under the board, not drawn.
    parts: [
      { name: "mini-USB", x0: -1.83, x1: 8.58, y0: 3.23, y1: 14.53, height: 3.9, kind: "connector", estimated: true },
      { name: "ATmega328P", x0: 12.99, x1: 17.99, y0: 6.34, y1: 11.34, height: 1.0, kind: "chip", estimated: true },
      { name: "RESET button", x0: 23.24, x1: 25.78, y0: 6.93, y1: 10.92, height: 2.5, kind: "button", estimated: true },
      { name: "LED (L)", x0: 28.335, x1: 29.585, y0: 3.32, y1: 5.32, height: 0.8, kind: "chip", estimated: true },
      { name: "LED (PWR)", x0: 28.335, x1: 29.585, y0: 6.37, y1: 8.37, height: 0.8, kind: "chip", estimated: true },
      { name: "LED (RX)", x0: 28.335, x1: 29.585, y0: 9.41, y1: 11.41, height: 0.8, kind: "chip", estimated: true },
      { name: "LED (TX)", x0: 28.335, x1: 29.585, y0: 12.46, y1: 14.46, height: 0.8, kind: "chip", estimated: true },
      // The pins' pads, 2.54 mm apart (J1, J2 and J4 in the PCB file); the headers hang under the board.
      { name: "pins (front row)", x0: 2.54, x1: 40.64, y0: 0.47, y1: 2.07, height: 0.05, kind: "header", pins: [15, 1], estimated: true },
      { name: "pins (back row)", x0: 2.54, x1: 40.64, y0: 15.71, y1: 17.31, height: 0.05, kind: "header", pins: [15, 1], estimated: true },
      { name: "ICSP pads", x0: 38.0, x1: 43.08, y0: 5.08, y1: 12.7, height: 0.05, kind: "header", pins: [3, 2], estimated: true },
    ],
  },  pico: {
    type: "pico",
    name: "Raspberry Pi Pico",
    width: 51,
    depth: 21,
    thickness: 1.0,
    cornerRadius: 0,
    holeDiameter: 2.1,
    holes: [[2, 4.8], [2, 16.2], [49, 4.8], [49, 16.2]],
    color: "#127a3e",
    // USB at the left end; BOOTSEL and pin 1 (GP0) at the front, by the USB end.
    parts: [
      { name: "micro-USB", x0: -0.7, x1: 4.3, y0: 6.71, y1: 14.29, height: 2.52, kind: "connector", profile: "microUsb" },
      { name: "BOOTSEL button", x0: 9.875, x1: 14.125, y0: 5.4, y1: 8.6, height: 2.5, kind: "button" },
      { name: "RP2040", x0: 22.5, x1: 29.5, y0: 7, y1: 14, height: 0.9, kind: "chip" },
      { name: "LED", x0: 4.4, x1: 5.2, y0: 4.0, y1: 5.6, height: 0.6, kind: "chip" },
      // The pins' pads, 20 a side, 2.54 mm apart and 17.78 mm across; the headers come loose.
      { name: "pins (GP0 to GP15)", x0: 0.1, x1: 50.9, y0: 0.81, y1: 2.41, height: 0.05, kind: "header", pins: [20, 1], estimated: true },
      { name: "pins (VBUS to GP16)", x0: 0.1, x1: 50.9, y0: 18.59, y1: 20.19, height: 0.05, kind: "header", pins: [20, 1], estimated: true },
    ],
  },
  picoW: {
    type: "picoW",
    name: "Raspberry Pi Pico W",
    width: 51,
    depth: 21,
    thickness: 0.97,
    cornerRadius: 0,
    holeDiameter: 2.1,
    holes: [[2, 4.8], [2, 16.2], [49, 4.8], [49, 16.2]],
    color: "#127a3e",
    // USB at the left end; BOOTSEL and pin 1 (GP0) at the front, by the USB end.
    parts: [
      { name: "micro-USB", x0: -1.35, x1: 4.706, y0: 6.505, y1: 14.495, height: 2.695, kind: "connector", profile: "microUsb" },
      { name: "BOOTSEL button", x0: 9.875, x1: 14.125, y0: 5.4, y1: 8.6, height: 2.5, kind: "button" },
      { name: "RP2040", x0: 20.45, x1: 27.45, y0: 7, y1: 14, height: 0.95, kind: "chip" },
      { name: "Wi-Fi module", x0: 32.8, x1: 42.8, y0: 4.5, y1: 16.5, height: 1.7, kind: "shield" },
      { name: "LED", x0: 4.443, x1: 5.168, y0: 3.995, y1: 5.595, height: 0.68, kind: "chip" },
      // The pins' pads, 20 a side, 2.54 mm apart and 17.78 mm across; the headers come loose.
      { name: "pins (GP0 to GP15)", x0: 0.1, x1: 50.9, y0: 0.81, y1: 2.41, height: 0.05, kind: "header", pins: [20, 1], estimated: true },
      { name: "pins (VBUS to GP16)", x0: 0.1, x1: 50.9, y0: 18.59, y1: 20.19, height: 0.05, kind: "header", pins: [20, 1], estimated: true },
    ],
  },
  pico2: {
    type: "pico2",
    name: "Raspberry Pi Pico 2",
    width: 51,
    depth: 21,
    thickness: 1.0,
    cornerRadius: 0,
    holeDiameter: 2.1,
    holes: [[2, 4.8], [2, 16.2], [49, 4.8], [49, 16.2]],
    color: "#127a3e",
    // USB at the left end; BOOTSEL and pin 1 (GP0) at the front, by the USB end.
    parts: [
      { name: "micro-USB", x0: -1.3, x1: 4.775, y0: 6.5, y1: 14.5, height: 2.695, kind: "connector", profile: "microUsb" },
      { name: "BOOTSEL button", x0: 9.9, x1: 14.1, y0: 5.3, y1: 8.7, height: 2.5, kind: "button" },
      { name: "RP2350", x0: 22.5, x1: 29.5, y0: 7, y1: 14, height: 0.85, kind: "chip" },
      // The pins' pads, 20 a side, 2.54 mm apart and 17.78 mm across; the headers come loose.
      { name: "pins (GP0 to GP15)", x0: 0.1, x1: 50.9, y0: 0.81, y1: 2.41, height: 0.05, kind: "header", pins: [20, 1], estimated: true },
      { name: "pins (VBUS to GP16)", x0: 0.1, x1: 50.9, y0: 18.59, y1: 20.19, height: 0.05, kind: "header", pins: [20, 1], estimated: true },
    ],
  },
  pico2W: {
    type: "pico2W",
    name: "Raspberry Pi Pico 2 W",
    width: 51,
    depth: 21,
    thickness: 0.97,
    cornerRadius: 0,
    holeDiameter: 2.1,
    holes: [[2, 4.8], [2, 16.2], [49, 4.8], [49, 16.2]],
    color: "#127a3e",
    estimated: ["thickness"],
    // USB at the left end; BOOTSEL and pin 1 (GP0) at the front, by the USB end.
    parts: [
      { name: "micro-USB", x0: -1.35, x1: 4.706, y0: 6.505, y1: 14.495, height: 2.695, kind: "connector", profile: "microUsb", estimated: true },
      { name: "BOOTSEL button", x0: 9.875, x1: 14.125, y0: 5.4, y1: 8.6, height: 2.5, kind: "button", estimated: true },
      { name: "RP2350", x0: 20.45, x1: 27.45, y0: 7, y1: 14, height: 0.85, kind: "chip", estimated: true },
      { name: "Wi-Fi module", x0: 32.8, x1: 42.8, y0: 4.5, y1: 16.5, height: 1.7, kind: "shield", estimated: true },
      // The pins' pads, 20 a side, 2.54 mm apart and 17.78 mm across; the headers come loose.
      { name: "pins (GP0 to GP15)", x0: 0.1, x1: 50.9, y0: 0.81, y1: 2.41, height: 0.05, kind: "header", pins: [20, 1], estimated: true },
      { name: "pins (VBUS to GP16)", x0: 0.1, x1: 50.9, y0: 18.59, y1: 20.19, height: 0.05, kind: "header", pins: [20, 1], estimated: true },
    ],
  },
  esp32CamMb: {
    type: "esp32CamMb",
    name: "ESP32-CAM (AI-Thinker) on ESP32-CAM-MB",
    width: 40.5,
    depth: 27,
    thickness: 1.5,
    cornerRadius: 1,
    holeDiameter: 0,
    holes: [],
    color: "#1a1a1a",
    estimated: ["thickness", "cornerRadius"],
    // The camera board turned a quarter: the MB's micro-USB at the left end, the card slot at the right end.
    parts: [
      // The microSD card slot, a flat box 2 mm high, the card going in at the right end; the camera (8.5 mm
      // square, the lens 8 mm over the board) stuck on it, so the slot is drawn in pieces round the camera.
      { name: "microSD card slot", x0: 35.19, x1: 40.5, y0: 6.1, y1: 20.9, height: 2.0, kind: "connector", estimated: true },
      { name: "microSD card slot (left of the camera)", x0: 25.18, x1: 26.69, y0: 6.1, y1: 20.9, height: 2.0, kind: "chip", estimated: true },
      { name: "microSD card slot (front of the camera)", x0: 26.69, x1: 35.19, y0: 6.1, y1: 9.25, height: 2.0, kind: "chip", estimated: true },
      { name: "microSD card slot (back of the camera)", x0: 26.69, x1: 35.19, y0: 17.75, y1: 20.9, height: 2.0, kind: "chip", estimated: true },
      // Its lens can open up through a lid (Lens up, by Reach up).
      { name: "camera", x0: 26.69, x1: 35.19, y0: 9.25, y1: 17.75, height: 8.01, kind: "chip", lens: true, estimated: true },
      { name: "camera connector", x0: 12.3, x1: 17.6, y0: 5.2, y1: 21.8, height: 2.0, kind: "chip", estimated: true },
      { name: "flash LED", x0: 9.1, x1: 12.3, y0: 0.5, y1: 3.7, height: 1.0, kind: "chip", estimated: true },
      // Under it: the MB programmer board on the camera board's pins, its micro-USB facing up between the two.
      // Its RESET button at the front edge by the USB end, pressed from the side (as in photos of the pair);
      // the MB is drawn in pieces round it and the USB.
      { name: "RESET button (MB)", x0: 2.5, x1: 6.5, y0: 0, y1: 2.5, height: 4.7, kind: "button", press: "front", underside: true, estimated: true },
      { name: "ESP32-CAM-MB", x0: 6.5, x1: 40.5, y0: 0, y1: 27, height: 6.3, kind: "shield", underside: true, estimated: true },
      { name: "ESP32-CAM-MB (by the button)", x0: 0, x1: 2.5, y0: 0, y1: 2.5, height: 6.3, kind: "shield", underside: true, estimated: true },
      { name: "ESP32-CAM-MB (front of the USB)", x0: 0, x1: 6.5, y0: 2.5, y1: 9.7, height: 6.3, kind: "shield", underside: true, estimated: true },
      { name: "ESP32-CAM-MB (beside the USB)", x0: 4.3, x1: 6.5, y0: 9.7, y1: 17.3, height: 6.3, kind: "shield", underside: true, estimated: true },
      { name: "ESP32-CAM-MB (back of the USB)", x0: 0, x1: 6.5, y0: 17.3, y1: 27, height: 6.3, kind: "shield", underside: true, estimated: true },
      { name: "micro-USB (MB)", x0: -0.7, x1: 4.3, y0: 9.7, y1: 17.3, height: 4.7, kind: "connector", underside: true, estimated: true },
    ],
  },
  esp32s3Cam: {
    type: "esp32s3Cam",
    name: "nulllab ESP32-S3-CAM",
    width: 38.4,
    depth: 30.4,
    thickness: 1.6,
    cornerRadius: 2,
    holeDiameter: 3.2,
    holes: [[3.2, 3.2], [35.2, 3.2], [3.2, 27.2], [35.2, 27.2]],
    color: "#1a1a1a",
    estimated: ["thickness", "cornerRadius", "holeDiameter"],
    // nulllab's size drawing as it is: USB-C at the left end, BOOT at the back and RESET at the front beside it.
    parts: [
      { name: "USB-C", x0: -0.85, x1: 6.5, y0: 10.74, y1: 19.68, height: 3.26, kind: "connector", profile: "usbC", estimated: true },
      { name: "BOOT button", x0: 3.55, x1: 8.05, y0: 21.05, y1: 24.35, height: 2.5, kind: "button", estimated: true },
      { name: "RESET button", x0: 3.55, x1: 8.05, y0: 5.65, y1: 8.95, height: 2.5, kind: "button", estimated: true },
      { name: "camera connector", x0: 11.0, x1: 16.9, y0: 7.2, y1: 23.2, height: 2.0, kind: "chip", estimated: true },
      // The camera (8.5 mm square) lies over part of the ESP32-S3; the chip is drawn where it shows.
      { name: "ESP32-S3", x0: 22.2, x1: 24.75, y0: 8.9, y1: 16.3, height: 0.9, kind: "chip", estimated: true },
      { name: "ESP32-S3 (front of the camera)", x0: 24.75, x1: 29.7, y0: 8.9, y1: 10.75, height: 0.9, kind: "chip", estimated: true },
      { name: "camera", x0: 24.75, x1: 33.25, y0: 10.75, y1: 19.25, height: 6.0, kind: "chip", lens: true, estimated: true },
      // Its socket stops short of the pins at the back edge, so the card stands out over them.
      { name: "microSD card slot", x0: 21.5, x1: 32.7, y0: 22.7, y1: 28.2, height: 1.8, kind: "chip", estimated: true },
      { name: "flash LED (front)", x0: 30.4, x1: 33.7, y0: 7.0, y1: 8.7, height: 0.8, kind: "chip", estimated: true },
      { name: "flash LED (back)", x0: 30.4, x1: 33.7, y0: 20.3, y1: 22.0, height: 0.8, kind: "chip", estimated: true },
      { name: "antenna", x0: 35.4, x1: 38.2, y0: 9.9, y1: 19.0, height: 1.0, kind: "chip", estimated: true },
      { name: "antenna socket (IPEX)", x0: 34.7, x1: 37.3, y0: 5.5, y1: 8.1, height: 1.25, kind: "chip", estimated: true },
      // The pins' pads, 8 a side, 2.54 mm apart; the headers come loose.
      { name: "pins (GPIO0 to 5V)", x0: 7.37, x1: 26.75, y0: 28.38, y1: 29.98, height: 0.05, kind: "header", pins: [8, 1], estimated: true },
      { name: "pins (RST to 3V3)", x0: 7.37, x1: 26.75, y0: 0.42, y1: 2.02, height: 0.05, kind: "header", pins: [8, 1], estimated: true },
    ],
  },
  esp32DevKitC: {
    type: "esp32DevKitC",
    name: "Espressif ESP32-DevKitC V4 (38 pins)",
    width: 48.26,
    depth: 27.94,
    thickness: 1.6,
    cornerRadius: 1,
    holeDiameter: 0,
    holes: [],
    color: "#1a1a1a",
    estimated: ["thickness"],
    // Espressif's dimension drawing (esp32_devkitc_v4_dimensions.dxf) turned a quarter, as Espressif's own
    // photo shows it: micro-USB at the left end, EN behind and Boot in front of it, the module's antenna
    // 6.04 mm out past the right end.
    parts: [
      { name: "micro-USB", x0: -0.6, x1: 5.0, y0: 10.25, y1: 17.75, height: 2.7, kind: "connector", profile: "microUsb", estimated: true },
      { name: "EN button", x0: 1.36, x1: 6.36, y0: 20.19, y1: 23.69, height: 2.0, kind: "button", estimated: true },
      { name: "Boot button", x0: 1.36, x1: 6.36, y0: 4.25, y1: 7.75, height: 2.0, kind: "button", estimated: true },
      { name: "LED (5V)", x0: 12.0, x1: 14.2, y0: 21.3, y1: 22.1, height: 0.6, kind: "chip", estimated: true },
      { name: "USB chip (CP2102N)", x0: 9.75, x1: 14.75, y0: 11.44, y1: 16.44, height: 0.9, kind: "chip", estimated: true },
      { name: "voltage regulator", x0: 15.93, x1: 22.43, y0: 12.09, y1: 15.59, height: 1.8, kind: "chip", estimated: true },
      // The ESP32-WROOM-32E: 18 x 25.5 x 3.1 mm (Espressif's datasheet).
      { name: "ESP32-WROOM-32E", x0: 28.8, x1: 54.3, y0: 4.97, y1: 22.97, height: 3.1, kind: "shield" },
      // The pins' pads, 19 a side, 25.4 mm apart; the headers point down.
      { name: "pins (CLK to GND)", x0: 0.49, x1: 47.81, y0: 0.5, y1: 2.1, height: 0.05, kind: "header", pins: [19, 1], estimated: true },
      { name: "pins (5V to 3V3)", x0: 0.49, x1: 47.81, y0: 25.9, y1: 27.5, height: 0.05, kind: "header", pins: [19, 1], estimated: true },
    ],
  },
  esp32DevKitV1: {
    type: "esp32DevKitV1",
    name: "ESP32 DevKit V1 (DOIT, 30 pins)",
    width: 51.8,
    depth: 28.2,
    thickness: 1.6,
    cornerRadius: 1.1,
    holeDiameter: 2.8,
    holes: [[2.2, 2.2], [2.2, 26.0], [49.6, 2.2], [49.6, 26.0]],
    color: "#2b2b2b",
    estimated: ["thickness", "cornerRadius", "holeDiameter"],
    // No maker's drawing: from the published true-size drawing (mischianti.org, DOIT-ESP32-DevKit-v1.svg),
    // which matches a board measured in the Fritzing forum, turned a quarter: micro-USB at the left end,
    // EN behind and BOOT in front of it, the module at the right end.
    parts: [
      { name: "micro-USB", x0: -0.6, x1: 5.32, y0: 10.74, y1: 17.52, height: 2.7, kind: "connector", profile: "microUsb", estimated: true },
      { name: "EN button", x0: 1.64, x1: 5.47, y0: 20.86, y1: 23.8, height: 2.0, kind: "button", estimated: true },
      { name: "BOOT button", x0: 1.64, x1: 5.47, y0: 4.31, y1: 7.25, height: 2.0, kind: "button", estimated: true },
      { name: "USB chip (CP2102)", x0: 7.6, x1: 12.58, y0: 11.62, y1: 16.69, height: 0.9, kind: "chip", estimated: true },
      { name: "voltage regulator", x0: 15.14, x1: 21.18, y0: 6.89, y1: 11.77, height: 1.8, kind: "chip", estimated: true },
      { name: "capacitor", x0: 17.14, x1: 20.44, y0: 14.79, y1: 17.45, height: 2.0, kind: "chip", estimated: true },
      { name: "ESP32-WROOM-32", x0: 25.55, x1: 50.93, y0: 4.92, y1: 23.29, height: 3.1, kind: "shield", estimated: true },
      // The pins' pads, 15 a side, 25.4 mm apart; the headers point down.
      { name: "pins (D23 to 3V3)", x0: 9.41, x1: 46.57, y0: 0.61, y1: 2.21, height: 0.05, kind: "header", pins: [15, 1], estimated: true },
      { name: "pins (EN to VIN)", x0: 9.41, x1: 46.57, y0: 26.0, y1: 27.6, height: 0.05, kind: "header", pins: [15, 1], estimated: true },
    ],
  },
  cyd: {
    type: "cyd",
    name: "ESP32-2432S028R (CYD, micro-USB)",
    ...CYD_PLATE,
    // Laid screen up, micro-USB at the left end, the microSD card slot at the back: the maker's
    // drawing seen from the screen. Everything else is on the underside.
    parts: [
      CYD_SCREEN,
      { name: "micro-USB", x0: -1.2, x1: 4.0, y0: 30.6, y1: 38.1, height: 2.7, kind: "connector", underside: true, estimated: true },
      // The four 1.25 mm sockets (HC-1.25-4PWT, P1, CN1 and P3; the speaker's 2 pins), their cables going in at the edge.
      { name: "power and serial (P1)", x0: 0, x1: 5.0, y0: 9.8, y1: 20.4, height: 3.57, kind: "connector", underside: true, estimated: true },
      { name: "microSD card slot", x0: 31.1, x1: 45.7, y0: 35.6, y1: 50.2, height: 1.85, kind: "connector", underside: true, estimated: true },
      { name: "sensor socket (CN1)", x0: 50.0, x1: 60.0, y0: 45.1, y1: 49.6, height: 3.57, kind: "connector", underside: true, estimated: true },
      { name: "extended IO (P3)", x0: 66.0, x1: 76.1, y0: 45.1, y1: 49.6, height: 3.57, kind: "connector", underside: true, estimated: true },
      { name: "speaker socket (P4)", x0: 24.7, x1: 29.5, y0: -0.2, y1: 3.7, height: 3.57, kind: "connector", underside: true, estimated: true },
      // Pressed from below, the side they are on: their reach goes down.
      { name: "RESET button", x0: 74.7, x1: 78.6, y0: 0.5, y1: 8.2, height: 2.0, kind: "button", underside: true, estimated: true },
      { name: "BOOT button", x0: 71.0, x1: 74.7, y0: 0.5, y1: 8.2, height: 2.0, kind: "button", underside: true, estimated: true },
      // The ESP32-WROOM-32: 18 x 25.5 x 3.1 mm (Espressif's datasheet), its antenna over the cut.
      { name: "ESP32-WROOM-32", x0: 60.5, x1: 86.0, y0: 16.0, y1: 34.2, height: 3.1, kind: "shield", underside: true, estimated: true },
      { name: "USB chip (CH340C)", x0: 15.9, x1: 19.6, y0: 37.4, y1: 47.3, height: 1.75, kind: "chip", underside: true, estimated: true },
      { name: "RGB LED", x0: 52.4, x1: 57.2, y0: 36.4, y1: 41.2, height: 1.6, kind: "chip", underside: true, estimated: true },
      { name: "touch controller (XPT2046)", x0: 63.3, x1: 67.8, y0: 3.0, y1: 7.9, height: 1.2, kind: "chip", underside: true, estimated: true },
      { name: "speaker amplifier (FM8002A)", x0: 46.1, x1: 51.1, y0: 2.9, y1: 6.8, height: 1.6, kind: "chip", underside: true, estimated: true },
    ],
  },
  cyd2usb: {
    type: "cyd2usb",
    name: "ESP32-2432S028R (CYD, micro-USB + USB-C)",
    ...CYD_PLATE,
    // As the first kind; the USB-C between the power socket and the micro-USB, which sits 2.5 mm further back.
    parts: [
      CYD_SCREEN,
      { name: "USB-C", x0: -0.2, x1: 6.8, y0: 22.2, y1: 31.1, height: 3.26, kind: "connector", underside: true, estimated: true },
      { name: "micro-USB", x0: -0.9, x1: 4.8, y0: 33.0, y1: 40.5, height: 2.7, kind: "connector", underside: true, estimated: true },
      { name: "power and serial (P1)", x0: 0.3, x1: 4.9, y0: 8.9, y1: 19.9, height: 3.57, kind: "connector", underside: true, estimated: true },
      { name: "microSD card slot", x0: 30.5, x1: 45.7, y0: 35.3, y1: 50.2, height: 1.85, kind: "connector", underside: true, estimated: true },
      { name: "sensor socket (CN1)", x0: 49.0, x1: 60.0, y0: 45.6, y1: 49.8, height: 3.57, kind: "connector", underside: true, estimated: true },
      { name: "extended IO (P3)", x0: 65.0, x1: 76.0, y0: 45.6, y1: 49.8, height: 3.57, kind: "connector", underside: true, estimated: true },
      // Its housing starts about 0.5 mm in from the front edge, the cable going in there.
      { name: "speaker socket (P4)", x0: 23.5, x1: 31.5, y0: 0.5, y1: 4.3, height: 3.57, kind: "connector", underside: true, estimated: true },
      { name: "RESET button", x0: 75.1, x1: 78.6, y0: 0.7, y1: 8.9, height: 2.0, kind: "button", underside: true, estimated: true },
      { name: "BOOT button", x0: 70.9, x1: 74.4, y0: 0.7, y1: 8.9, height: 2.0, kind: "button", underside: true, estimated: true },
      { name: "ESP32-WROOM-32", x0: 60.2, x1: 85.3, y0: 16.1, y1: 33.8, height: 3.1, kind: "shield", underside: true, estimated: true },
      { name: "USB chip (CH340C)", x0: 15.3, x1: 19.3, y0: 37.1, y1: 46.9, height: 1.75, kind: "chip", underside: true, estimated: true },
      { name: "RGB LED", x0: 51.6, x1: 56.4, y0: 35.5, y1: 41.1, height: 1.6, kind: "chip", underside: true, estimated: true },
      { name: "touch controller (XPT2046)", x0: 62.7, x1: 68.0, y0: 3.2, y1: 8.3, height: 1.2, kind: "chip", underside: true, estimated: true },
      { name: "speaker amplifier (FM8002A)", x0: 46.0, x1: 51.0, y0: 3.0, y1: 7.0, height: 1.6, kind: "chip", underside: true, estimated: true },
    ],
  },
  waveshareEsp32s3Zero: {
    type: "waveshareEsp32s3Zero",
    name: "Waveshare ESP32-S3-Zero",
    width: 23.5,
    depth: 18,
    thickness: 1.6,
    cornerRadius: 1,
    holeDiameter: 0,
    holes: [],
    color: "#1b2f5c",
    estimated: [],
    // From Waveshare's 3D model, laid with the USB-C at the right end: the 2 x 9 pins 2.54 mm apart, the first 1.59 mm
    // from the end without USB, the rows 15.24 mm apart and 1.37 mm in from the long edges.
    parts: [
      { name: "USB-C", x0: 17.13, x1: 24.73, y0: 4.53, y1: 13.47, height: 3.25, kind: "connector", profile: "usbC" },
      { name: "pins, front row", x0: 0.32, x1: 23.18, y0: 0.571, y1: 2.171, height: 0.1, kind: "header", pins: [9, 1] },
      { name: "pins, back row", x0: 0.32, x1: 23.18, y0: 15.811, y1: 17.411, height: 0.1, kind: "header", pins: [9, 1] },
      { name: "RESET button", x0: 13.59, x1: 16.09, y0: 3.28, y1: 6.28, height: 1.6, kind: "button" },
      { name: "BOOT button", x0: 13.59, x1: 16.09, y0: 11.63, y1: 14.63, height: 1.6, kind: "button" },
      { name: "ESP32-S3", x0: 2.68, x1: 12.79, y0: 3.94, y1: 14.06, height: 1.0, kind: "chip" },
      { name: "ceramic antenna", x0: 0.21, x1: 2.21, y0: 8.02, y1: 15.02, height: 1.0, kind: "chip" },
    ],
  },
  arduinoProMini: {
    type: "arduinoProMini",
    name: "Arduino Pro Mini",
    width: 33.02,
    depth: 17.78,
    thickness: 0.8,
    cornerRadius: 0,
    holeDiameter: 0,
    holes: [],
    color: "#1f5aa6",
    estimated: [],
    // From SparkFun's board file, laid with the FTDI pins at the right end: the two rows of 12 pins 16.51 mm apart along
    // the long edges, 1.27 mm in; A4/A5 and A6/A7 inside the board. No USB, no mounting holes.
    parts: [
      { name: "pins (D10 to RAW)", x0: 0.47, x1: 30.01, y0: 0.47, y1: 2.07, height: 0.1, kind: "header", pins: [12, 1] },
      { name: "pins (D9 to TXO)", x0: 0.47, x1: 30.01, y0: 15.71, y1: 17.31, height: 0.1, kind: "header", pins: [12, 1] },
      { name: "FTDI pins (DTR to GND)", x0: 30.95, x1: 32.55, y0: 1.27, y1: 16.51, height: 0.1, kind: "header", pins: [6, 1] },
      { name: "pins (A4, A5)", x0: 16.637, x1: 21.717, y0: 3.391, y1: 4.991, height: 0.1, kind: "header", pins: [2, 1] },
      { name: "pins (A6, A7)", x0: 6.223, x1: 11.303, y0: 3.391, y1: 4.991, height: 0.1, kind: "header", pins: [2, 1] },
      // The switch's outline from the board file; its height is not given.
      { name: "RESET button", x0: 0.127, x1: 5.207, y0: 6.223, y1: 11.303, height: 1.5, kind: "button", estimated: true },
      // The chip is turned 45 degrees on the board: drawn here square, 7 x 7 mm round its middle.
      { name: "ATmega328P", x0: 10.47, x1: 17.47, y0: 5.39, y1: 12.39, height: 1.2, kind: "chip", estimated: true },
      { name: "resonator", x0: 17.15, x1: 20.9, y0: 12.88, y1: 14.2, height: 0.9, kind: "chip", estimated: true },
      { name: "regulator (MIC5205)", x0: 22.76, x1: 25.6, y0: 8.08, y1: 9.7, height: 1.1, kind: "chip", estimated: true },
    ],
  },
};

export const SBC_BOARD_ORDER: SbcBoardType[] = ["pi5", "pi4", "pi3bPlus", "zero2w", "bttPi12", "xiaoEsp32c6", "esp32c3SuperMini", "esp32c6SuperMini", "waveshareEsp32s3Zero", "featherEsp32s3", "arduinoUno", "arduinoMega", "arduinoNano", "arduinoProMini", "wemosD1Mini", "pico", "picoW", "pico2", "pico2W", "esp32CamMb", "esp32s3Cam", "esp32DevKitC", "esp32DevKitV1", "cyd", "cyd2usb"];
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

/** How far the buttons reach the way they are pressed, so they pass a lid or a wall: 0 (default) to 100 mm. */
export const MAX_SBC_BUTTON_REACH = 100;

export function normalizeSbcButtonReach(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(MAX_SBC_BUTTON_REACH, Math.max(0, value)) : 0;
}

/**
 * The openings asked for besides the connectors at the edge: ribbon cables up or out, the GPIO header up, and how far
 * up; the buttons, the way they are pressed, by `buttonReach`.
 */
export type SbcPassages = { ribbonUp?: boolean; ribbonSide?: boolean; gpioUp?: boolean; lensUp?: boolean; upReach?: number; buttonReach?: number };

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
    ...(raw.lensUp === true ? { lensUp: true } : {}),
    ...(raw.upReach !== undefined ? { upReach: normalizeSbcUpReach(raw.upReach) } : {}),
    ...(normalizeSbcButtonReach(raw.buttonReach) > 0 ? { buttonReach: normalizeSbcButtonReach(raw.buttonReach) } : {}),
  };
}

/** The board has a ribbon cable connector, or a GPIO header: whether the card offers their openings. */
export function sbcBoardHasRibbon(board: SbcBoard) {
  return board.parts.some((part) => part.ribbon);
}
export function sbcBoardHasGpio(board: SbcBoard) {
  return board.parts.some((part) => part.gpio);
}
/** The board has a camera lens: whether the card offers its opening up. */
export function sbcBoardHasLens(board: SbcBoard) {
  return board.parts.some((part) => part.lens);
}
/** The board has buttons: whether the card offers their reach. */
export function sbcBoardHasButtons(board: SbcBoard) {
  return board.parts.some((part) => part.kind === "button");
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

/** The part opens up through a lid with these openings: a ribbon cable's connector, the GPIO header or a camera's lens asked for. */
function opensUp(part: SbcPart, passages: SbcPassages) {
  return (part.ribbon && passages.ribbonUp === true) || (part.gpio && passages.gpioUp === true) || (part.lens && passages.lensUp === true);
}

/**
 * The blocks as built. A connector at the edge is grown by the clearance on every side but its
 * bottom, which stays on the board (its top, for one under the board), and then reaches further
 * out by the reach on each edge it stands at, so it cuts through a case wall. A ribbon cable's
 * connector or the GPIO header asked to open up is grown the same and reaches `upReach` higher,
 * through a lid. A button, when `buttonReach` is asked for, is grown the same and reaches that far
 * the way it is pressed: up through a lid, or out through a wall for one pressed from the side
 * (`press`). The rest stay as they are. Works the same for every board. Heights are from the
 * bottom of the board; a part under it lies below 0.
 */
export function sbcBoardBlocks(board: SbcBoard, clearance = 0, reach = 0, passages: SbcPassages = {}): SbcBlock[] {
  const extra = normalizeSbcClearance(clearance);
  const further = normalizeSbcReach(reach);
  const up = normalizeSbcUpReach(passages.upReach);
  const buttonReach = normalizeSbcButtonReach(passages.buttonReach);
  return board.parts.map((part) => {
    const edges = sbcPartEdges(board, part);
    const atEdge = part.kind === "connector" && (edges.left || edges.right || edges.front || edges.back);
    const rising = opensUp(part, passages);
    // A button reaches only the way it is pressed: up, or out of the side it is pressed from.
    const pressed = part.kind === "button" && buttonReach > 0 ? part.press ?? "up" : null;
    const grow = atEdge || rising || pressed ? extra : 0;
    const out = atEdge ? further : 0;
    const push = (side: SbcPress) => (pressed === side ? buttonReach : 0);
    const box = {
      ...part,
      x0: part.x0 - grow - (edges.left ? out : 0) - push("left"),
      x1: part.x1 + grow + (edges.right ? out : 0) + push("right"),
      y0: part.y0 - grow - (edges.front ? out : 0) - push("front"),
      y1: part.y1 + grow + (edges.back ? out : 0) + push("back"),
      height: part.height + grow + (rising ? up : 0) + push("up"),
    };
    // Under the board, the height grows down: a button there pressed from its own side reaches down through the floor.
    return part.underside
      ? { ...box, bottom: -box.height, top: 0 }
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
