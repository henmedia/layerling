import * as THREE from "three";
import { createContourPrismAlongZ } from "@/lib/teardropGeometry";
import type { PortProfile } from "@/types/layerling";

/*
 * The port opening: the hole a USB socket or a similar plug needs in the wall
 * of a box (Discussion #1049). Seen from the front it is a rectangle with
 * rounded corners - a USB-C socket is one with fully round ends - pushed
 * through the wall along the shape's own z axis, like the teardrop. HDMI and
 * DisplayPort openings have their lower corners cut off at a slant instead
 * (`portProfile`), DisplayPort only the left one, so the plug goes in one way.
 *
 * Width and height are the opening as seen from the front, depth is how far
 * it reaches into the wall, cornerFillet the radius of the corners that are
 * not cut off. A cut corner takes the same share of width and height as in
 * the drawing it comes from, so it grows with the opening.
 */

export type { PortProfile };

type ChamferProfile = "hdmi" | "miniHdmi" | "microHdmi" | "displayPort" | "miniDisplayPort";
type PolygonProfile = "xt60" | "xt30" | "mt60" | "dsub9";

/** The cut lower corners of a profile: their width and height as shares of the opening, and on which side. */
export const PORT_PROFILE_CHAMFERS: Record<ChamferProfile, { x: number; y: number; sides: "both" | "left" }> = {
  // Multicomp MC34931 panel cut-out: 15.70 x 6.20, bottom edge 10.80, slant 1.20 high.
  hdmi: { x: 2.45 / 15.7, y: 1.2 / 6.2, sides: "both" },
  // Würth WR-COM 685119136923 shell 10.5 x 2.5; the slant read from its front view.
  miniHdmi: { x: 1 / 11.2, y: 0.7 / 3.1, sides: "both" },
  // Würth WR-COM 685119248123 shell 6.2 x 3.0; the slant read from its front view, as on Mini-HDMI.
  microHdmi: { x: 1 / 6.8, y: 0.9 / 3.6, sides: "both" },
  // VESA DisplayPort 1.2, figure 4-32: 17.10 x 5.76, one corner cut 1.80 x 1.80.
  displayPort: { x: 1.8 / 17.1, y: 1.8 / 5.76, sides: "left" },
  // VESA Mini DisplayPort 1.0, figure 2-16: shell 8.30 wide, both lower corners cut at 45 degrees.
  miniDisplayPort: { x: 1.4 / 8.8, y: 1.4 / 5.9, sides: "both" },
};

/*
 * Outlines that are neither a rounded rectangle nor one with cut lower corners: a convex polygon,
 * every corner rounded by the opening's corner radius. Each gives its corners, counter-clockwise,
 * in the box the polygon has inside its rounding (x centred, y from 0 up), so the rounded outline
 * is exactly as wide and as tall as the opening, and growing the opening and its corner radius by
 * the same amount moves the whole outline out by that amount.
 */
const share = (shares: ReadonlyArray<readonly [number, number]>) => (width: number, height: number) => shares.map(([x, y]) => [x * width, y * height] as const);
export const PORT_PROFILE_POLYGONS: Record<PolygonProfile, (width: number, height: number) => ReadonlyArray<readonly [number, number]>> = {
  // Amass XT60 (drawing XT60-F/XT60-M): front 16.00 x 8.10 mm, lying here, one end narrowed by two
  // cut corners 3.25 mm along and 2.95 mm across, read from the maker's drawing.
  xt60: share([[-0.5 + 3.25 / 16, 0], [0.5, 0], [0.5, 1], [-0.5 + 3.25 / 16, 1], [-0.5, 1 - 2.95 / 8.1], [-0.5, 2.95 / 8.1]]),
  // Amass XT30U (catalogue drawing): front 10.20 x 5.20 mm, lying, its end cut as on the XT60 - the
  // shares read from the drawing.
  xt30: share([[-0.5 + 0.254, 0], [0.5, 0], [0.5, 1], [-0.5 + 0.254, 1], [-0.5, 1 - 0.275], [-0.5, 0.275]]),
  // Amass MT60 (catalogue drawing): a rounded triangle, 12.00 mm from its flat side to its tip and
  // 12.50 mm along the flat side.
  mt60: share([[-0.5, 0], [0.5, 0.5], [-0.5, 1]]),
  // D-Sub 9 (DE-9) panel cut-out (Spectrum Control, front and rear mounting): 19.74 x 11.18 mm, the
  // wide side up, the sides 10 degrees from upright whatever the size.
  dsub9: (width, height) => {
    const inset = Math.min(width / 2 - 1e-3, height * Math.tan(Math.PI / 18));
    return [[-width / 2 + inset, 0], [width / 2 - inset, 0], [width / 2, height], [-width / 2, height]];
  },
};

export type PortPreset = "usbC" | "usbCPlug" | "microUsb" | "usbA" | "hdmi" | "miniHdmi" | "microHdmi" | "displayPort" | "miniDisplayPort" | "rj45" | "xt30" | "xt60" | "mt60" | "mpx" | "dsub9" | "powerpole1" | "powerpole2" | "powerpole3" | "powerpole4";

/** Screw holes beside an opening: two, this far apart centre to centre, at the opening's middle height. */
export type PortScrewHoles = { spacing: number; diameter: number };

export const PORT_PRESETS: Record<PortPreset, { width: number; height: number; corner: number; profile: PortProfile; screwHoles?: PortScrewHoles }> = {
  // Receptacle shell 8.94 x 3.26 mm (USB Type-C specification) plus 0.25 mm: the ends fully round.
  usbC: { width: 9.4, height: 3.7, corner: 1.85, profile: "rounded" },
  // Plug overmold up to 12.35 x 6.5 mm, for a socket sitting behind the wall.
  usbCPlug: { width: 12.8, height: 7, corner: 3.5, profile: "rounded" },
  // Micro-B receptacle about 7.5 x 2.6 mm.
  microUsb: { width: 8, height: 3.1, corner: 0.6, profile: "rounded" },
  // Type A receptacle shell 12.5 x 5.12 mm.
  usbA: { width: 13, height: 5.6, corner: 0.5, profile: "rounded" },
  // The receptacle maker's recommended panel cut-out (Multicomp MC34931), corners R 0.30 at most.
  hdmi: { width: 15.7, height: 6.2, corner: 0.3, profile: "hdmi" },
  // Shell 10.5 x 2.5 mm (Würth WR-COM 685119136923) plus about 0.3 mm, as the HDMI cut-out has round its shell.
  miniHdmi: { width: 11.2, height: 3.1, corner: 0.3, profile: "miniHdmi" },
  // Shell 6.2 x 3.0 mm (Würth WR-COM 685119248123) plus about 0.3 mm, as on Mini-HDMI: the socket of the Raspberry Pi 4 and 5.
  microHdmi: { width: 6.8, height: 3.6, corner: 0.3, profile: "microHdmi" },
  // VESA reference panel cut-out: three corners R 0.80, the cut one sharp.
  displayPort: { width: 17.1, height: 5.76, corner: 0.8, profile: "displayPort" },
  // Shell 8.30 x 5.4 mm plus 0.25 mm.
  miniDisplayPort: { width: 8.8, height: 5.9, corner: 0.4, profile: "miniDisplayPort" },
  // Covers both an unshielded jack's recommended cut-out (ERNI, 16.66 x 14.07) and a shielded one's (16.38 x 14.38 minimum, R 1.25 at most).
  rj45: { width: 16.7, height: 14.4, corner: 1, profile: "rounded" },
  // The plugs of model batteries and motors, with about 0.25 mm of room on every side, so the plug goes through.
  // Amass XT30U: 10.20 x 5.20 mm, corners about R 0.3.
  xt30: { width: 10.7, height: 5.7, corner: 0.55, profile: "xt30" },
  // Amass XT60: 16.00 x 8.10 mm, corners about R 0.4.
  xt60: { width: 16.5, height: 8.6, corner: 0.65, profile: "xt60" },
  // Amass MT60, three poles: 12.00 x 12.50 mm, corners about R 2.
  mt60: { width: 12.5, height: 13, corner: 2.25, profile: "mt60" },
  // Multiplex MPX (M6), six poles: 16 x 6.4 mm (MüKRA, Multiplex's distributor), corners about R 0.25.
  mpx: { width: 16.5, height: 6.9, corner: 0.5, profile: "rounded" },
  // D-Sub 9 (the serial port's plug): the panel cut-out itself, corners about R 0.5, and its two
  // screw holes, 3.18 mm across and 24.99 mm apart (Spectrum Control).
  dsub9: { width: 19.74, height: 11.18, corner: 0.5, profile: "dsub9", screwHoles: { spacing: 24.99, diameter: 3.18 } },
  // Anderson Powerpole PP15/30/45 (Discussion #1190), housings stacked side by side: each 7.90 x 7.90 mm
  // at the front and 7.90 mm apart, with a dovetail tongue 0.50 mm proud on one side and on top (8.40 mm
  // in the maker's drawing, 1327 series). The opening takes the block with its tongues, plus about
  // 0.25 mm of room on every side: 7.90 per pole + 1.00 wide, 8.90 high, corners about R 0.5.
  powerpole1: { width: 8.9, height: 8.9, corner: 0.5, profile: "rounded" },
  powerpole2: { width: 16.8, height: 8.9, corner: 0.5, profile: "rounded" },
  powerpole3: { width: 24.7, height: 8.9, corner: 0.5, profile: "rounded" },
  powerpole4: { width: 32.6, height: 8.9, corner: 0.5, profile: "rounded" },
};

export const PORT_PRESET_ORDER: PortPreset[] = ["usbC", "usbCPlug", "microUsb", "usbA", "hdmi", "miniHdmi", "microHdmi", "displayPort", "miniDisplayPort", "rj45", "xt30", "xt60", "mt60", "mpx", "dsub9", "powerpole1", "powerpole2", "powerpole3", "powerpole4"];
export const PORT_PROFILES: PortProfile[] = ["rounded", "hdmi", "miniHdmi", "microHdmi", "displayPort", "miniDisplayPort", "xt60", "xt30", "mt60", "dsub9"];
export const DEFAULT_PORT_PRESET: PortPreset = "usbC";
/** How far a new opening reaches through: more than most walls, so it cuts through when placed on one. */
export const DEFAULT_PORT_DEPTH = 10;
/** Arc steps of a full circle in the display mesh; each corner gets a quarter. */
const PORT_CIRCLE_SEGMENTS = 32;

export function normalizePortProfile(profile: unknown): PortProfile {
  return PORT_PROFILES.includes(profile as PortProfile) ? profile as PortProfile : "rounded";
}

/** The cut corners of an opening of this size in millimetres, or null for a plain rounded one (or a polygon). */
export function portChamfer(profile: unknown, width: number, height: number) {
  const key = normalizePortProfile(profile);
  if (!(key in PORT_PROFILE_CHAMFERS)) return null;
  const chamfer = PORT_PROFILE_CHAMFERS[key as ChamferProfile];
  return { x: chamfer.x * width, y: chamfer.y * height, left: true, right: chamfer.sides === "both" };
}

/** Whether the profile is a rounded polygon (PORT_PROFILE_POLYGONS). */
export function isPolygonPortProfile(profile: unknown): profile is PolygonProfile {
  return normalizePortProfile(profile) in PORT_PROFILE_POLYGONS;
}

/**
 * A polygon outline's corners, counter-clockwise: each corner's point inside the rounding and the
 * angles its arc of `corner` radius runs between - the outward normals of the side before it and
 * the side after it. A corner of radius 0 is the point itself.
 */
export function portPolygonCorners(profile: unknown, width: number, height: number, corner: number) {
  const key = normalizePortProfile(profile) as PolygonProfile;
  const r = Math.max(0, corner);
  const innerWidth = Math.max(1e-6, width - 2 * r);
  const innerHeight = Math.max(1e-6, height - 2 * r);
  const points = PORT_PROFILE_POLYGONS[key](innerWidth, innerHeight).map(([x, y]) => ({ x, y: r + y }));
  return points.map((point, index) => {
    const previous = points[(index + points.length - 1) % points.length];
    const next = points[(index + 1) % points.length];
    // The outward normal of a side running counter-clockwise from a to b is (dy, -dx).
    const normal = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.atan2(-(b.x - a.x), b.y - a.y);
    const start = normal(previous, point);
    let end = normal(point, next);
    while (end <= start + 1e-12) end += Math.PI * 2;
    return { x: point.x, y: point.y, start, end };
  });
}

/** The largest corner radius that still fits: half the smaller side, and less where a cut corner leaves the side shorter. */
export function maxPortCorner(width: number, height: number, profile?: unknown) {
  // A polygon's rounding sits outside its corners, so it may take almost half the smaller side.
  if (isPolygonPortProfile(profile)) return Math.max(0, Math.min(width, height) / 2 - 0.01);
  const chamfer = portChamfer(profile, width, height);
  if (!chamfer) return Math.max(0, Math.min(width, height) / 2);
  return Math.max(0, Math.min((width - chamfer.x) / 2, (height - chamfer.y) / 2));
}

export function normalizePortCorner(corner: number | undefined, width: number, height: number, profile?: unknown) {
  const value = corner === undefined || !Number.isFinite(corner) ? PORT_PRESETS[DEFAULT_PORT_PRESET].corner : corner;
  return Math.min(maxPortCorner(width, height, profile), Math.max(0, value));
}

/** Extra room on every side, on top of the room a preset has already: 0 to 2 mm. */
export const MAX_PORT_CLEARANCE = 2;

export function normalizePortClearance(clearance: unknown) {
  const value = typeof clearance === "number" && Number.isFinite(clearance) ? clearance : 0;
  return Math.min(MAX_PORT_CLEARANCE, Math.max(0, value));
}

/**
 * A preset's opening with extra room on every side: wider and taller by twice
 * the clearance, its corners rounder by the clearance, as the outline grown
 * outwards. A cut corner keeps its share of the opening.
 */
export function portPresetSize(preset: PortPreset, clearance?: unknown) {
  const chosen = PORT_PRESETS[preset];
  const extra = normalizePortClearance(clearance);
  const width = chosen.width + 2 * extra;
  const height = chosen.height + 2 * extra;
  return { width, height, corner: normalizePortCorner(chosen.corner + extra, width, height, chosen.profile), profile: chosen.profile };
}

/** A preset's screw holes with extra room: wider by twice the clearance, as the opening grows; none for most presets. */
export function portScrewHoles(preset: PortPreset | null, clearance?: unknown): PortScrewHoles | null {
  const holes = preset ? PORT_PRESETS[preset].screwHoles : undefined;
  return holes ? { spacing: holes.spacing, diameter: holes.diameter + 2 * normalizePortClearance(clearance) } : null;
}

/** The preset this opening matches with its extra room, or null when its size was changed by hand. */
export function portPresetFor(width: number, height: number, corner: number | undefined, profile?: unknown, clearance?: unknown): PortPreset | null {
  const close = (a: number, b: number) => Math.abs(a - b) < 0.005;
  const shapeProfile = normalizePortProfile(profile);
  return PORT_PRESET_ORDER.find((key) => {
    const preset = portPresetSize(key, clearance);
    return preset.profile === shapeProfile && close(width, preset.width) && close(height, preset.height)
      && close(normalizePortCorner(corner, width, height, shapeProfile), preset.corner);
  }) ?? null;
}

type Point2D = { x: number; y: number };

/** The outline seen from the front (x right, y up), counter-clockwise, x centred, from y = 0 to y = height. */
export function portContourPoints(width: number, height: number, corner: number | undefined, circleSegments = PORT_CIRCLE_SEGMENTS, profile?: unknown): Point2D[] {
  const w = Math.max(0.01, width);
  const h = Math.max(0.01, height);
  const r = normalizePortCorner(corner, w, h, profile);
  const chamfer = portChamfer(profile, w, h);
  const hw = w / 2;
  const steps = Math.max(2, Math.ceil(Math.max(4, circleSegments) / 4));
  const points: Point2D[] = [];
  const push = (point: Point2D) => {
    const last = points[points.length - 1];
    // Where two arcs meet (a fully round end) the point is there already.
    if (!last || Math.hypot(last.x - point.x, last.y - point.y) > 1e-9) points.push(point);
  };
  const arc = (cx: number, cy: number, start: number) => {
    for (let i = 0; i <= steps; i += 1) {
      const angle = start + (Math.PI / 2) * (i / steps);
      push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
    }
  };
  const corner4 = (x: number, y: number, cx: number, cy: number, start: number) => (r <= 1e-4 ? push({ x, y }) : arc(cx, cy, start));
  if (isPolygonPortProfile(profile)) {
    // A rounded polygon: each corner's arc, as many steps as its turn takes of a full circle.
    for (const corner of portPolygonCorners(profile, w, h, r)) {
      if (r <= 1e-4) {
        push({ x: corner.x, y: corner.y });
        continue;
      }
      const turns = Math.max(1, Math.ceil((Math.max(4, circleSegments) * (corner.end - corner.start)) / (Math.PI * 2)));
      for (let i = 0; i <= turns; i += 1) {
        const angle = corner.start + (corner.end - corner.start) * (i / turns);
        push({ x: corner.x + r * Math.cos(angle), y: corner.y + r * Math.sin(angle) });
      }
    }
    const head = points[0];
    const tail = points[points.length - 1];
    if (Math.hypot(head.x - tail.x, head.y - tail.y) <= 1e-9) points.pop();
    return points;
  }
  // Lower right, upper right, upper left, lower left; a cut lower corner is its two ends instead.
  if (chamfer?.right) {
    push({ x: hw - chamfer.x, y: 0 });
    push({ x: hw, y: chamfer.y });
  } else corner4(hw, 0, hw - r, r, -Math.PI / 2);
  corner4(hw, h, hw - r, h - r, 0);
  corner4(-hw, h, -(hw - r), h - r, Math.PI / 2);
  if (chamfer?.left) {
    push({ x: -hw, y: chamfer.y });
    push({ x: -(hw - chamfer.x), y: 0 });
  } else corner4(-hw, 0, -(hw - r), r, Math.PI);
  const first = points[0];
  const last = points[points.length - 1];
  if (Math.hypot(first.x - last.x, first.y - last.y) <= 1e-9) points.pop();
  return points;
}

export type PortGeometryOptions = { width: number; depth: number; height: number; cornerFillet?: number; portProfile?: PortProfile };

/** A closed, watertight opening body: the outline pushed along z, centred on the origin, from y = 0 to y = height. */
export function createPortGeometry({ width, depth, height, cornerFillet, portProfile }: PortGeometryOptions): THREE.BufferGeometry {
  return createContourPrismAlongZ(portContourPoints(width, height, cornerFillet, PORT_CIRCLE_SEGMENTS, portProfile), depth);
}
