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

/** The cut lower corners of a profile: their width and height as shares of the opening, and on which side. */
export const PORT_PROFILE_CHAMFERS: Record<Exclude<PortProfile, "rounded">, { x: number; y: number; sides: "both" | "left" }> = {
  // Multicomp MC34931 panel cut-out: 15.70 x 6.20, bottom edge 10.80, slant 1.20 high.
  hdmi: { x: 2.45 / 15.7, y: 1.2 / 6.2, sides: "both" },
  // Würth WR-COM 685119136923 shell 10.5 x 2.5; the slant read from its front view.
  miniHdmi: { x: 1 / 11.2, y: 0.7 / 3.1, sides: "both" },
  // VESA DisplayPort 1.2, figure 4-32: 17.10 x 5.76, one corner cut 1.80 x 1.80.
  displayPort: { x: 1.8 / 17.1, y: 1.8 / 5.76, sides: "left" },
  // VESA Mini DisplayPort 1.0, figure 2-16: shell 8.30 wide, both lower corners cut at 45 degrees.
  miniDisplayPort: { x: 1.4 / 8.8, y: 1.4 / 5.9, sides: "both" },
};

export type PortPreset = "usbC" | "usbCPlug" | "microUsb" | "usbA" | "hdmi" | "miniHdmi" | "displayPort" | "miniDisplayPort" | "rj45";

export const PORT_PRESETS: Record<PortPreset, { width: number; height: number; corner: number; profile: PortProfile }> = {
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
  // VESA reference panel cut-out: three corners R 0.80, the cut one sharp.
  displayPort: { width: 17.1, height: 5.76, corner: 0.8, profile: "displayPort" },
  // Shell 8.30 x 5.4 mm plus 0.25 mm.
  miniDisplayPort: { width: 8.8, height: 5.9, corner: 0.4, profile: "miniDisplayPort" },
  // Covers both an unshielded jack's recommended cut-out (ERNI, 16.66 x 14.07) and a shielded one's (16.38 x 14.38 minimum, R 1.25 at most).
  rj45: { width: 16.7, height: 14.4, corner: 1, profile: "rounded" },
};

export const PORT_PRESET_ORDER: PortPreset[] = ["usbC", "usbCPlug", "microUsb", "usbA", "hdmi", "miniHdmi", "displayPort", "miniDisplayPort", "rj45"];
export const PORT_PROFILES: PortProfile[] = ["rounded", "hdmi", "miniHdmi", "displayPort", "miniDisplayPort"];
export const DEFAULT_PORT_PRESET: PortPreset = "usbC";
/** How far a new opening reaches through: more than most walls, so it cuts through when placed on one. */
export const DEFAULT_PORT_DEPTH = 10;
/** Arc steps of a full circle in the display mesh; each corner gets a quarter. */
const PORT_CIRCLE_SEGMENTS = 32;

export function normalizePortProfile(profile: unknown): PortProfile {
  return PORT_PROFILES.includes(profile as PortProfile) ? profile as PortProfile : "rounded";
}

/** The cut corners of an opening of this size in millimetres, or null for a plain rounded one. */
export function portChamfer(profile: unknown, width: number, height: number) {
  const key = normalizePortProfile(profile);
  if (key === "rounded") return null;
  const chamfer = PORT_PROFILE_CHAMFERS[key];
  return { x: chamfer.x * width, y: chamfer.y * height, left: true, right: chamfer.sides === "both" };
}

/** The largest corner radius that still fits: half the smaller side, and less where a cut corner leaves the side shorter. */
export function maxPortCorner(width: number, height: number, profile?: unknown) {
  const chamfer = portChamfer(profile, width, height);
  if (!chamfer) return Math.max(0, Math.min(width, height) / 2);
  return Math.max(0, Math.min((width - chamfer.x) / 2, (height - chamfer.y) / 2));
}

export function normalizePortCorner(corner: number | undefined, width: number, height: number, profile?: unknown) {
  const value = corner === undefined || !Number.isFinite(corner) ? PORT_PRESETS[DEFAULT_PORT_PRESET].corner : corner;
  return Math.min(maxPortCorner(width, height, profile), Math.max(0, value));
}

/** The preset this opening matches, or null when its size was changed by hand. */
export function portPresetFor(width: number, height: number, corner: number | undefined, profile?: unknown): PortPreset | null {
  const close = (a: number, b: number) => Math.abs(a - b) < 0.005;
  const shapeProfile = normalizePortProfile(profile);
  return PORT_PRESET_ORDER.find((key) => {
    const preset = PORT_PRESETS[key];
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
