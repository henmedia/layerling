import type { FanSettings, FanType } from "@/types/layerling";

export type { FanSettings, FanType };

/**
 * The fans the Fan shape knows (Discussion #1962), true to size, to build a duct or a case around.
 * Every measure is in mm, in the fan's own frame: x across, y back (as a drawing seen from above),
 * heights up from the underside.
 *
 * Radial blowers (spiral casing, the outlet nozzle at the front, lugs round the screw holes):
 * - 5015: NopSCADlib's measured Runda RB5015 (vitamins/blowers.scad), the Ø31.5 inlet on the top. Its
 *   holes are the GDSTIME and YOUNUON drawings': Ø4.6, 57.0 apart across the diagonal (RB5015's sit
 *   57.4 apart; they are moved 0.19 each along it).
 * - 5015 wide outlet: the same casing with a 38 x 15 nozzle (34 x 12.5 inside), its left side flush
 *   with the casing's, as measured on one (GDSTIME's "Wider" gives a 35 x 12.2 opening).
 * - 4020: NopSCADlib's measured Pengda PE4020: three Ø3.2 holes, a 29.3 wide nozzle, lugs 13 high.
 * Square radial blower:
 * - 4010: the YOUNUON drawing's 40 x 40 x 10 with four Ø2.2 holes 36 apart; the axis, the Ø27 inlet
 *   and the 27.8 wide outlet in the middle of the front are NopSCADlib's measured BL40x10.
 * Axial fans, Delta's AFB/EFB drawings: the frame, its thickness, the holes and their spacing, and
 * the cut-out in the panel in front of it, a round one, cut square where the drawing gives a square
 * (that is what an opening reaching through a wall cuts). Where Delta gives two cut-outs, one for
 * each side, the smaller is taken for both. The blades' opening and the hub drawn on the top are
 * NopSCADlib's fanNNxNN, where it has the size; without one, the cut-out is drawn and no hub.
 */
export type FanSpec = {
  type: FanType;
  /** The casing's box. */
  width: number;
  depth: number;
  height: number;
  /** The rotor's axis, where the inlet and the hub are. */
  axis: [number, number];
  /** The opening the blades are seen through, on the top. */
  bore: number;
  /** The opening an air passage through a wall is cut with: a round one, cut square to `openingSquare` if given. */
  opening: number;
  openingSquare?: number;
  /** The hub drawn on the inlet; 0 draws none. */
  hub: number;
  screwHole: number;
  screwHoles: Array<[number, number]>;
} & (
  | {
    kind: "blower";
    exitWidth: number;
    wall: number;
    base: number;
    top: number;
    /** A lug is the hull of a ring `lugWall` round its hole and a round `lugHub` wider than it round the axis, `lugHeight` high. */
    lugWall: number;
    lugHub: number;
    lugHeight: number;
  }
  | { kind: "squareBlower"; exitWidth: number; wall: number; base: number; top: number; cornerRadius: number }
  | { kind: "axial" }
);

/** An axial fan of Delta's: frame, thickness, hole spacing and Ø, panel cut-out Ø (and square), the blades' opening and hub. */
function axial(type: FanType, width: number, height: number, spacing: number, screwHole: number, opening: number, openingSquare: number | undefined, bore: number, hub: number): FanSpec {
  const inset = (width - spacing) / 2;
  const far = width - inset;
  return {
    type,
    kind: "axial",
    width,
    depth: width,
    height,
    axis: [width / 2, width / 2],
    bore,
    opening,
    ...(openingSquare ? { openingSquare } : {}),
    hub,
    screwHole,
    screwHoles: [[inset, inset], [far, inset], [inset, far], [far, far]],
  };
}

export const FANS: Record<FanType, FanSpec> = {
  blower5015: {
    type: "blower5015",
    kind: "blower",
    width: 51.3,
    depth: 51,
    height: 15,
    axis: [27.3, 25.4],
    bore: 31.5,
    opening: 31.5,
    hub: 26,
    screwHole: 4.6,
    screwHoles: [[4.44, 45.27], [47.16, 7.53]],
    exitWidth: 20,
    wall: 1.2,
    base: 1.5,
    top: 1.3,
    lugWall: 1.2,
    lugHub: 7,
    lugHeight: 15,
  },
  blower5015wide: {
    type: "blower5015wide",
    kind: "blower",
    width: 51.3,
    depth: 51,
    height: 15,
    axis: [27.3, 25.4],
    bore: 31.5,
    opening: 31.5,
    hub: 26,
    screwHole: 4.6,
    screwHoles: [[4.44, 45.27], [47.16, 7.53]],
    // 38 x 15 outside, 34 x 12.5 inside: walls of 2 at the sides, 1.25 below and above.
    exitWidth: 38,
    wall: 2,
    base: 1.25,
    top: 1.25,
    lugWall: 1.2,
    lugHub: 7,
    lugHeight: 15,
  },
  blower4020: {
    type: "blower4020",
    kind: "blower",
    width: 40,
    depth: 40,
    height: 20,
    axis: [21.5, 20],
    bore: 27.5,
    opening: 27.5,
    hub: 22,
    screwHole: 3.2,
    screwHoles: [[37, 3], [3, 37], [37, 37]],
    exitWidth: 29.3,
    wall: 1.3,
    base: 1.7,
    top: 1.2,
    lugWall: 1.3,
    lugHub: 7,
    lugHeight: 13,
  },
  blower4010: {
    type: "blower4010",
    kind: "squareBlower",
    width: 40,
    depth: 40,
    height: 10,
    axis: [24, 20],
    bore: 27,
    opening: 27,
    hub: 16,
    screwHole: 2.2,
    screwHoles: [[2, 2], [38, 2], [2, 38], [38, 38]],
    exitWidth: 27.8,
    wall: 1.1,
    base: 1.5,
    top: 1.5,
    cornerRadius: 2,
  },
  axial2510: axial("axial2510", 25, 10, 20, 2.8, 24, undefined, 24, 16),
  axial3010: axial("axial3010", 30, 10, 24, 3.2, 29, undefined, 27, 17),
  axial4010: axial("axial4010", 40, 10, 32, 3.2, 40.7, 38.3, 37, 25),
  axial4020: axial("axial4020", 40, 20, 32, 3.5, 39.5, 37.6, 37, 25),
  axial5015: axial("axial5015", 50, 15, 40, 4.3, 49.6, 47.6, 48, 25),
  axial5020: axial("axial5020", 50, 20, 40, 4.3, 52, 47.8, 47.8, 0),
  axial6015: axial("axial6015", 60, 15, 50, 4.5, 58.6, 58, 57, 29),
  axial6025: axial("axial6025", 60, 25.4, 50, 4.5, 59, 57, 57, 31.5),
  axial8025: axial("axial8025", 80, 25.4, 71.5, 4.5, 90, 76.6, 75, 40),
  axial9225: axial("axial9225", 92, 25.4, 82.5, 4.5, 95.4, 88, 88, 0),
  axial12025: axial("axial12025", 120, 25.4, 105, 4.5, 132, 117, 116, 41),
};

export const FAN_ORDER: FanType[] = [
  "blower5015", "blower5015wide", "blower4020", "blower4010",
  "axial2510", "axial3010", "axial4010", "axial4020", "axial5015", "axial5020", "axial6015", "axial6025", "axial8025", "axial9225", "axial12025",
];
export const DEFAULT_FAN: FanType = "blower5015";

/** The message each fan is named by, in the person's language. */
export const FAN_LABEL_KEYS = {
  blower5015: "fan.type.blower5015",
  blower5015wide: "fan.type.blower5015wide",
  blower4020: "fan.type.blower4020",
  blower4010: "fan.type.blower4010",
  axial2510: "fan.type.axial2510",
  axial3010: "fan.type.axial3010",
  axial4010: "fan.type.axial4010",
  axial4020: "fan.type.axial4020",
  axial5015: "fan.type.axial5015",
  axial5020: "fan.type.axial5020",
  axial6015: "fan.type.axial6015",
  axial6025: "fan.type.axial6025",
  axial8025: "fan.type.axial8025",
  axial9225: "fan.type.axial9225",
  axial12025: "fan.type.axial12025",
} as const satisfies Record<FanType, string>;

export const MAX_FAN_CLEARANCE = 2;
export const MAX_FAN_REACH = 50;

const round3 = (value: number) => Math.round(value * 1000) / 1000;

function normalizeLength(value: unknown, max: number) {
  return typeof value === "number" && Number.isFinite(value) ? round3(Math.min(max, Math.max(0, value))) : 0;
}

export function normalizeFanClearance(value: unknown) {
  return normalizeLength(value, MAX_FAN_CLEARANCE);
}

export function normalizeFanReach(value: unknown) {
  return normalizeLength(value, MAX_FAN_REACH);
}

/** A fan's settings made safe: a known fan, the clearance and the reaches in range; a reach of 0 is left out. */
export function normalizeFanSettings(input: unknown): FanSettings | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Partial<Record<keyof FanSettings, unknown>>;
  if (typeof raw.fan !== "string" || !FAN_ORDER.includes(raw.fan as FanType)) return null;
  const settings: FanSettings = { fan: raw.fan as FanType, clearance: normalizeFanClearance(raw.clearance) };
  for (const key of ["inletReach", "outletReach", "screwReach"] as const) {
    const reach = normalizeFanReach(raw[key]);
    if (reach > 0) settings[key] = reach;
  }
  return settings;
}

/** How thin the drawn openings, hub and holes are, on the face they are drawn on. */
export const FAN_MARK_DEPTH = 0.05;

export type FanSolidRole = "body" | "opening" | "hub" | "reach";

/**
 * One body of the fan, in its frame. A box fills its footprint; a cylinder stands in it, as wide as
 * it, cut square to `square` (centred on it) when given; an outline is the blower's casing (its
 * spiral and nozzle, or the square blower's rounded square) and a lug the hull round a screw hole,
 * both grown by the clearance, which the editor builds from the spec.
 */
export type FanSolid = {
  name: string;
  role: FanSolidRole;
  form: "box" | "cylinder" | "outline" | "lug";
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  bottom: number;
  top: number;
  /** A cylinder cut square: the square's width, and the round's diameter it is cut from. */
  square?: number;
  round?: number;
  /** A lug's screw hole. */
  hole?: [number, number];
};

const cylinder = (name: string, role: FanSolidRole, [x, y]: [number, number], diameter: number, bottom: number, top: number, square?: number): FanSolid => {
  const half = Math.min(diameter, square ?? diameter) / 2;
  return {
    name, role, form: "cylinder", x0: x - half, x1: x + half, y0: y - half, y1: y + half, bottom, top,
    ...(square && square < diameter ? { square, round: diameter } : {}),
  };
};

/** The box round a blower's lug: the ring round its hole and the round about the axis, grown by `grow`. */
export function blowerLugBox(spec: FanSpec, hole: [number, number], grow: number) {
  if (spec.kind !== "blower") throw new Error("a lug is a blower's");
  const ring = spec.screwHole / 2 + spec.lugWall;
  const hub = ring + spec.lugHub / 2;
  return {
    x0: Math.min(hole[0] - ring, spec.axis[0] - hub) - grow,
    x1: Math.max(hole[0] + ring, spec.axis[0] + hub) + grow,
    y0: Math.min(hole[1] - ring, spec.axis[1] - hub) - grow,
    y1: Math.max(hole[1] + ring, spec.axis[1] + hub) + grow,
  };
}

/**
 * Every body the fan is made of, with the clearance and the reaches applied. The body is solid, so a
 * fan made a hole cuts a clean pocket; the openings, the hub and the screw holes are drawn on it, a
 * thin dark disc each. An opening that reaches out is a body of its own instead of its drawing: the
 * inlet up from the top, the outlet out of the blower's front (down from an axial fan's underside),
 * the screw holes up and down from both faces, as far as their reach - to cut through a wall.
 */
export function fanSolids(input: FanSettings): FanSolid[] {
  const settings = normalizeFanSettings(input) ?? { fan: DEFAULT_FAN, clearance: 0 };
  const spec = FANS[settings.fan];
  const c = settings.clearance;
  const inlet = settings.inletReach ?? 0;
  const outlet = settings.outletReach ?? 0;
  const screws = settings.screwReach ?? 0;
  const top = spec.height + c;
  const bottom = 0 - c;
  const mark = top + FAN_MARK_DEPTH;
  const solids: FanSolid[] = [{
    name: "Body",
    role: "body",
    form: spec.kind === "axial" ? "box" : "outline",
    x0: 0 - c, x1: spec.width + c, y0: 0 - c, y1: spec.depth + c, bottom, top,
  }];
  if (spec.kind === "blower") {
    spec.screwHoles.forEach((hole, index) => {
      const lugTop = spec.lugHeight >= spec.height ? top : spec.lugHeight + c;
      solids.push({ name: `Lug ${index + 1}`, role: "body", form: "lug", ...blowerLugBox(spec, hole, c), bottom, top: lugTop, hole });
    });
  }
  const opening = spec.opening + 2 * c;
  const square = spec.openingSquare ? spec.openingSquare + 2 * c : undefined;
  if (inlet > 0) solids.push(cylinder("Inlet", "reach", spec.axis, opening, top, top + inlet, square));
  else {
    solids.push(cylinder("Inlet", "opening", spec.axis, spec.bore, top, mark));
    if (spec.hub > 0) solids.push(cylinder("Hub", "hub", spec.axis, spec.hub, mark, mark + FAN_MARK_DEPTH));
  }
  if (spec.kind !== "axial") {
    // The outlet on the front face: a blower's nozzle at the left, a square blower's in the middle.
    const left = spec.kind === "blower" ? 0 : (spec.width - spec.exitWidth) / 2;
    const outer = spec.exitWidth;
    const inset = spec.kind === "blower" ? spec.wall : 0;
    if (outlet > 0) {
      solids.push({ name: "Outlet", role: "reach", form: "box", x0: left - c, x1: left + outer + c, y0: 0 - c - outlet, y1: 0 - c, bottom, top });
    } else {
      // The mouth, inside its walls, between the base and the top.
      solids.push({ name: "Outlet", role: "opening", form: "box", x0: left + inset, x1: left + outer - inset, y0: 0 - c - FAN_MARK_DEPTH, y1: 0 - c, bottom: spec.base, top: spec.height - spec.top });
    }
  } else if (outlet > 0) {
    solids.push(cylinder("Outlet", "reach", spec.axis, opening, bottom - outlet, bottom, square));
  }
  // A lug lower than the casing: its hole starts on the lug's top.
  const holeTop = spec.kind === "blower" && spec.lugHeight < spec.height ? spec.lugHeight + c : top;
  spec.screwHoles.forEach((hole, index) => {
    if (screws > 0) {
      solids.push(cylinder(`Screw hole ${index + 1}`, "reach", hole, spec.screwHole, holeTop, holeTop + screws));
      solids.push(cylinder(`Screw hole ${index + 1} below`, "reach", hole, spec.screwHole, bottom - screws, bottom));
    } else {
      solids.push(cylinder(`Screw hole ${index + 1}`, "opening", hole, spec.screwHole, holeTop, holeTop + FAN_MARK_DEPTH));
    }
  });
  return solids;
}

/** The box round every body of the fan, in its frame. */
export function fanSolidsExtent(solids: readonly FanSolid[]) {
  return {
    minX: Math.min(...solids.map((solid) => solid.x0)),
    maxX: Math.max(...solids.map((solid) => solid.x1)),
    minY: Math.min(...solids.map((solid) => solid.y0)),
    maxY: Math.max(...solids.map((solid) => solid.y1)),
    bottom: Math.min(...solids.map((solid) => solid.bottom)),
    top: Math.max(...solids.map((solid) => solid.top)),
  };
}

/** The point at `angle` degrees on the blower's spiral casing, round its axis (NopSCADlib's blower()). */
export function blowerSpiralPoint(spec: FanSpec, angle: number): [number, number] {
  const r1 = spec.axis[0];
  const r2 = spec.depth - spec.axis[1];
  const r3 = spec.width - spec.axis[0];
  const r = angle < 90 ? r1 * Math.exp((angle * Math.log(r2 / r1)) / 90) : r2 * Math.exp(((angle - 90) * Math.log(r3 / r2)) / 90);
  const radians = (angle * Math.PI) / 180;
  return [spec.axis[0] - r * Math.cos(radians), spec.axis[1] + r * Math.sin(radians)];
}
