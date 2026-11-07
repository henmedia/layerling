import type { ManifoldToplevel } from "manifold-3d";
import type { PerforableFace } from "@/lib/holePatternShapes";
import { clearanceMeshShape } from "@/lib/clearanceCheck";
import { shapeToManifoldSolid } from "@/lib/editorBooleans";
import { supportRibMark } from "@/lib/supportRibMark";
import type { ManifoldSolid } from "@/lib/editorMeshCore";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * The support rib (Discussion #1385): a part printed tilted, standing on one edge so its faces need no supports, has to
 * be held so it does not fall over. A thin triangle stands under its lower face: its foot on the bed, its slope along
 * the face a gap away, its back upright, as Ingo built it by hand - a wedge two lines of the nozzle thick, an oval
 * plate under it so its narrow foot holds on the bed, a rounding where the rib meets the plate and at its top. The rib
 * does not touch the part, so it comes off cleanly; small bridges hold the part from tipping the other way: each one
 * layer high and one line wide, lying exactly on a layer of the print, across the gap from the rib into the part.
 *
 * The rib is built in its own frame - s along the bed under the face (the way the face looks down), y up, w across the
 * rib - and set into the scene from there. One cut by the plane a gap off the face keeps every part of it clear of the
 * face; the bridges come after that cut. The result is a mesh body; a part not standing on the bed, a face that does
 * not reach the bed (or stop just above it, at a rounded or chamfered edge), one too flat or too steep, are refused.
 */

type Vec = { x: number; y: number; z: number };

export type SupportRibSettings = {
  /** The nozzle's width, mm: the rib is two lines thick, the gap half a line, a bridge one line wide unless set. */
  nozzle: number;
  /** The slicer's layer height and first layer, mm: the bridges lie exactly on the layers they make. */
  layerHeight: number;
  firstLayer: number;
  /** Where the rib's slope ends, mm above the bed; null: half way up the face. */
  height: number | null;
  /** How far apart the bridges are, mm, rounded to whole layers. */
  bridgeSpacing: number;
  /** Set by hand, or null to follow the nozzle and the layers. */
  thickness: number | null;
  gap: number | null;
  bridgeWidth: number | null;
  footThickness: number | null;
  /** The oval plate's width across the rib, mm. */
  footWidth: number;
  /** The rounding where the rib meets the plate, and at its top, mm. */
  filletRadius: number;
  topRadius: number;
  /** Bundle the rib with the part, so they move together and go to the slicer side by side. */
  bundle: boolean;
};

export const DEFAULT_SUPPORT_RIB: SupportRibSettings = {
  nozzle: 0.4,
  layerHeight: 0.2,
  firstLayer: 0.2,
  height: null,
  bridgeSpacing: 3,
  thickness: null,
  gap: null,
  bridgeWidth: null,
  footThickness: null,
  footWidth: 8,
  filletRadius: 1.5,
  topRadius: 1,
  bundle: true,
};

/** The faces a rib can stand under: sloping between these angles from the bed. */
export const SUPPORT_RIB_MIN_ANGLE = 15;
export const SUPPORT_RIB_MAX_ANGLE = 75;
/** How close to the bed the part's lowest point must be, mm. */
export const SUPPORT_RIB_BED_TOLERANCE = 0.05;
/**
 * How far above the bed the face's low end may stop, mm: a rounded or chamfered bottom edge (Discussion #1385, Ingo,
 * 07.11.2026, so the slicer finds the first layer) ends the flat face a little above the bed; the rib then follows the
 * face's plane down to the bed, and its bridges begin above the rounding.
 */
export const SUPPORT_RIB_RAISED_END = 3;
/** How far a bridge reaches into the part and into the rib, mm. */
const BRIDGE_INTO_PART = 0.3;
const BRIDGE_INTO_RIB = 0.6;
const ROUND_SEGMENTS = 12;
const FOOT_SEGMENTS = 64;

const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
/** Positions on the layer grid kept to a ten-thousandth, so a slicer cutting at mid-layer finds each bridge in one layer. */
const tidy = (value: number) => Math.round(value * 10000) / 10000;

export function normalizeSupportRib(input: Partial<SupportRibSettings>): SupportRibSettings {
  const base = DEFAULT_SUPPORT_RIB;
  const number = (value: unknown, fallback: number, min: number, max: number) => (finite(value) ? clamp(value, min, max) : fallback);
  const optional = (value: unknown, min: number, max: number) => (finite(value) && value > 0 ? clamp(value, min, max) : null);
  return {
    nozzle: number(input.nozzle, base.nozzle, 0.1, 2),
    layerHeight: number(input.layerHeight, base.layerHeight, 0.04, 1),
    firstLayer: number(input.firstLayer, base.firstLayer, 0.04, 1.5),
    height: optional(input.height, 1, 1000),
    bridgeSpacing: number(input.bridgeSpacing, base.bridgeSpacing, 0.2, 100),
    thickness: optional(input.thickness, 0.2, 20),
    gap: optional(input.gap, 0.05, 5),
    bridgeWidth: optional(input.bridgeWidth, 0.1, 5),
    footThickness: optional(input.footThickness, 0.1, 10),
    footWidth: number(input.footWidth, base.footWidth, 1, 200),
    filletRadius: number(input.filletRadius, base.filletRadius, 0, 20),
    topRadius: number(input.topRadius, base.topRadius, 0, 20),
    bundle: input.bundle !== false,
  };
}

/** The measures a rib is built with: what is set, and what follows from the nozzle and the layers. */
export function resolveSupportRib(settings: SupportRibSettings) {
  return {
    thickness: settings.thickness ?? 2 * settings.nozzle,
    gap: settings.gap ?? settings.nozzle / 2,
    bridgeWidth: settings.bridgeWidth ?? settings.nozzle,
    footThickness: settings.footThickness ?? tidy(settings.firstLayer + settings.layerHeight),
  };
}

/** The face a rib stands under, read once when it is picked. */
export type SupportRibFace = {
  /** Where it was clicked, on the face. */
  point: Vec;
  /** Its outward normal, looking down and away from the part. */
  normal: Vec;
  /** How steep it is against the bed, degrees. */
  angle: number;
  /** How high its low and its high end lie straight up and down the face through the click, mm above the bed. */
  low: number;
  high: number;
};

export type SupportRibFaceResult =
  | { ok: true; face: SupportRibFace }
  | { ok: false; reason: "notDown" | "tooFlat" | "tooSteep" | "offBed" };

/**
 * Whether a rib can stand under a flat face, and where: the face must look down, slope between SUPPORT_RIB_MIN_ANGLE
 * and SUPPORT_RIB_MAX_ANGLE, and reach down to the bed straight down its slope from the click, as a part does that
 * stands tilted on one edge - or stop at most SUPPORT_RIB_RAISED_END above it, where that edge is rounded or chamfered.
 */
export function supportRibFace(face: PerforableFace): SupportRibFaceResult {
  const { workplane, outline } = face;
  const n = workplane.normal;
  const length = Math.hypot(n.x, n.y, n.z) || 1;
  const normal = { x: n.x / length, y: n.y / length, z: n.z / length };
  if (normal.y > -0.05) return { ok: false, reason: "notDown" };
  const angle = (Math.acos(clamp(-normal.y, -1, 1)) * 180) / Math.PI;
  if (angle < SUPPORT_RIB_MIN_ANGLE) return { ok: false, reason: "tooFlat" };
  if (angle > SUPPORT_RIB_MAX_ANGLE) return { ok: false, reason: "tooSteep" };
  // Straight down the face from the click: the world's down laid onto the face, in the face's own frame.
  const down = { x: normal.y * normal.x, y: -1 + normal.y * normal.y, z: normal.y * normal.z };
  const dl = Math.hypot(down.x, down.y, down.z);
  const du = (down.x * workplane.xAxis.x + down.y * workplane.xAxis.y + down.z * workplane.xAxis.z) / dl;
  const dv = (down.x * workplane.zAxis.x + down.y * workplane.zAxis.y + down.z * workplane.zAxis.z) / dl;
  // Where the line through the click meets the face's edges, before it (down) and behind it (up).
  let forward = Infinity;
  let backward = Infinity;
  for (const loop of outline.loops) {
    for (let i = 0; i < loop.length; i += 1) {
      const a = loop[i];
      const b = loop[(i + 1) % loop.length];
      const eu = b.u - a.u;
      const ev = b.v - a.v;
      const det = du * -ev - dv * -eu;
      if (Math.abs(det) < 1e-12) continue;
      // click + t * d = a + k * e
      const t = (a.u * -ev - a.v * -eu) / det;
      const k = (du * a.v - dv * a.u) / det;
      if (k < -1e-9 || k > 1 + 1e-9) continue;
      if (t >= 0) forward = Math.min(forward, t);
      else backward = Math.min(backward, -t);
    }
  }
  if (!Number.isFinite(forward) || !Number.isFinite(backward)) return { ok: false, reason: "offBed" };
  const point = workplane.origin;
  const slopeDown = down.y / dl;
  const low = point.y + forward * slopeDown;
  const high = point.y - backward * slopeDown;
  if (low > SUPPORT_RIB_RAISED_END) return { ok: false, reason: "offBed" };
  return { ok: true, face: { point: { ...point }, normal, angle, low: Math.max(0, low), high } };
}

/** The rib's own frame in the scene: s along the bed under the face, y up, w across the rib, from the click's foot. */
function ribFrame(face: SupportRibFace) {
  const h = Math.hypot(face.normal.x, face.normal.z);
  const along = { x: face.normal.x / h, y: 0, z: face.normal.z / h };
  // w = s x up, so (s, y, w) turns as (x, y, z) does.
  const across = { x: -along.z, y: 0, z: along.x };
  const origin = { x: face.point.x, y: 0, z: face.point.z };
  return { along, across, origin, sine: h, cosine: -face.normal.y };
}

export type SupportRibPlan = {
  /** The rib's height and how far along the bed it reaches, mm. */
  height: number;
  length: number;
  /** The bottoms of the bridges, mm above the bed, each on the layer grid. */
  bridges: number[];
  measures: ReturnType<typeof resolveSupportRib>;
};

export type SupportRibBuild =
  | { ok: true; positions: Float64Array; plan: SupportRibPlan }
  | { ok: false; reason: "tooLow" | "collides" | "partOffBed" | "failed" };

/** The height a rib takes on this face unless set: half way up it, on the half millimetre, and never above it. */
export function supportRibHeight(face: SupportRibFace, settings: SupportRibSettings) {
  const wanted = settings.height ?? Math.round(face.high / 2 / 0.5) * 0.5;
  return clamp(wanted, 1, Math.max(1, face.high));
}

/**
 * The rib for a face, as triangles in the scene (nine numbers each). `part` is the body the face belongs to: it must
 * stand on the bed, so the bridges meet their layers once the slicer sets it down, and the rib must not run into it
 * anywhere (below or beside the face).
 */
export function buildSupportRib(runtime: ManifoldToplevel, face: SupportRibFace, input: SupportRibSettings, part?: WorkplaneShape | null): SupportRibBuild {
  const settings = normalizeSupportRib(input);
  const measures = resolveSupportRib(settings);
  const { thickness, gap, bridgeWidth, footThickness } = measures;
  const frame = ribFrame(face);
  const { sine, cosine } = frame;
  const height = supportRibHeight(face, settings);
  if (height < footThickness + 0.5) return { ok: false, reason: "tooLow" };
  // The face's plane and the plane a gap off it, as distances along the bed at a height y.
  const py = face.point.y;
  const faceAt = (y: number) => (cosine * (y - py)) / sine;
  const offAt = (y: number) => (gap + cosine * (y - py)) / sine;
  const toe = offAt(0);
  const back = offAt(height);
  const length = back - toe;

  const created: ManifoldSolid[] = [];
  const keep = <T extends { delete(): void }>(value: T) => {
    created.push(value as unknown as ManifoldSolid);
    return value;
  };
  const { Manifold, CrossSection } = runtime;
  try {
    // The rib seen from the side (s, y): the foot along the bed, the back upright, the slope along the face, its top
    // corner rounded.
    const profile: Array<[number, number]> = [[toe, 0], [back, 0]];
    const corner = { s: back, y: height };
    const between = Math.PI / 2 - (face.angle * Math.PI) / 180; // between the back (down) and the slope (towards the toe)
    const reach = Math.min(height - footThickness, length) * 0.45;
    const radius = Math.min(settings.topRadius, reach * Math.tan(between / 2));
    let slopeTop = height;
    if (radius > 0.01 && between > 0.01) {
      const tangentDistance = radius / Math.tan(between / 2);
      const e1 = { s: 0, y: -1 };
      const e2 = { s: -cosine, y: -sine };
      const t1 = { s: corner.s + e1.s * tangentDistance, y: corner.y + e1.y * tangentDistance };
      const t2 = { s: corner.s + e2.s * tangentDistance, y: corner.y + e2.y * tangentDistance };
      const bisector = { s: e1.s + e2.s, y: e1.y + e2.y };
      const bl = Math.hypot(bisector.s, bisector.y);
      const centre = { s: corner.s + (bisector.s / bl) * (radius / Math.sin(between / 2)), y: corner.y + (bisector.y / bl) * (radius / Math.sin(between / 2)) };
      const a1 = Math.atan2(t1.y - centre.y, t1.s - centre.s);
      let a2 = Math.atan2(t2.y - centre.y, t2.s - centre.s);
      while (a2 < a1) a2 += Math.PI * 2;
      profile.push([t1.s, t1.y]);
      for (let k = 1; k < ROUND_SEGMENTS; k += 1) {
        const a = a1 + ((a2 - a1) * k) / ROUND_SEGMENTS;
        profile.push([centre.s + radius * Math.cos(a), centre.y + radius * Math.sin(a)]);
      }
      profile.push([t2.s, t2.y]);
      slopeTop = t2.y;
    } else {
      profile.push([corner.s, corner.y]);
    }
    const rib = keep(keep(keep(new CrossSection([profile], "Positive")).extrude(thickness)).translate([0, 0, -thickness / 2]));

    // The oval plate under it, from the toe to a little past the back, the ellipse in (s, w), the plate's thickness up.
    const footEnd = back + settings.footWidth / 4;
    const footLength = footEnd - toe;
    const ellipse = keep(keep(keep(CrossSection.circle(1, FOOT_SEGMENTS)).scale([footLength / 2, settings.footWidth / 2])).translate([(toe + footEnd) / 2, 0]));
    const foot = keep(keep(ellipse.extrude(footThickness)).rotate([-90, 0, 0]));
    const parts = [rib, foot];

    // The rounding where the rib meets the plate, on both sides, along the rib; kept on the plate.
    const fillet = settings.filletRadius;
    if (fillet > 0.01) {
      const half = thickness / 2;
      const strip = (side: 1 | -1) => {
        const points: Array<[number, number]> = [[side * (half - 0.01), footThickness - 0.01], [side * (half + fillet), footThickness - 0.01], [side * (half + fillet), footThickness]];
        for (let k = 1; k < ROUND_SEGMENTS; k += 1) {
          const a = -Math.PI / 2 - ((Math.PI / 2) * k) / ROUND_SEGMENTS;
          points.push([side * (half + fillet + fillet * Math.cos(a)), footThickness + fillet + fillet * Math.sin(a)]);
        }
        points.push([side * half, footThickness + fillet], [side * (half - 0.01), footThickness + fillet]);
        const ordered = side === 1 ? points : [...points].reverse();
        // Pushed along s: (x, y) = (w, y) extruded along z = s, then turned so z becomes s and x becomes w.
        return keep(keep(keep(new CrossSection([ordered], "Positive")).extrude(length)).rotate([0, 90, 0]));
      };
      const column = keep(keep(ellipse.extrude(footThickness + fillet + 1)).rotate([-90, 0, 0]));
      for (const side of [1, -1] as const) {
        const moved = keep(strip(side).translate([toe, 0, 0]));
        parts.push(keep(moved.intersect(column)));
      }
    }
    const joined = keep(Manifold.union(parts));
    // One cut a gap off the face keeps everything clear of it: the plane's normal looks away from the part, and the
    // plane passes the click (0, py, 0) a gap further out.
    const cut = keep(joined.trimByPlane([sine, -cosine, 0], gap - cosine * py));

    // Into the scene: columns s, y, w and the origin, column by column.
    const { along, across, origin } = frame;
    const toWorld: [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number] = [
      along.x, 0, along.z, 0,
      0, 1, 0, 0,
      across.x, 0, across.z, 0,
      origin.x, 0, origin.z, 1,
    ];
    const ribInScene = keep(cut.transform(toWorld));

    if (part) {
      const solid = shapeToManifoldSolid(runtime, part, created);
      if (!solid) return { ok: false, reason: "failed" };
      const box = solid.boundingBox();
      if (Math.abs(box.min[1]) > SUPPORT_RIB_BED_TOLERANCE) return { ok: false, reason: "partOffBed" };
      const overlap = keep(ribInScene.intersect(solid));
      if (overlap.volume() > 1e-3) return { ok: false, reason: "collides" };
    }

    // The bridges: on every layer `spacing` apart from the plate's top up to where the slope ends, each one layer high
    // and one line wide, from inside the part across the gap into the rib.
    const bridges: number[] = [];
    const every = Math.max(1, Math.round(settings.bridgeSpacing / settings.layerHeight));
    const layerBottom = (index: number) => tidy(index === 0 ? 0 : settings.firstLayer + (index - 1) * settings.layerHeight);
    let first = 1;
    while (layerBottom(first) < footThickness - 1e-6 || layerBottom(first) < face.low - 1e-6) first += 1;
    const top = Math.min(slopeTop, face.high);
    const pieces = [ribInScene];
    for (let index = first; layerBottom(index) + settings.layerHeight <= top + 1e-6; index += every) {
      const bottom = layerBottom(index);
      const start = faceAt(bottom) - BRIDGE_INTO_PART / sine;
      const end = offAt(bottom) + BRIDGE_INTO_RIB;
      const bar = keep(keep(keep(Manifold.cube([end - start, settings.layerHeight, bridgeWidth])).translate([start, bottom, -bridgeWidth / 2])).transform(toWorld));
      pieces.push(bar);
      bridges.push(bottom);
    }
    const whole = keep(Manifold.union(pieces));
    const mesh = whole.getMesh();
    const positions = new Float64Array(mesh.triVerts.length * 3);
    for (let i = 0; i < mesh.triVerts.length; i += 1) {
      const vertex = mesh.triVerts[i];
      for (let axis = 0; axis < 3; axis += 1) positions[i * 3 + axis] = mesh.vertProperties[vertex * mesh.numProp + axis];
    }
    if (positions.length < 9) return { ok: false, reason: "failed" };
    return { ok: true, positions, plan: { height, length, bridges, measures } };
  } catch {
    return { ok: false, reason: "failed" };
  } finally {
    created.forEach((value) => {
      try {
        value.delete();
      } catch {
        // Already gone with a parent.
      }
    });
  }
}

/** The rib as a body of the design, marked with its part for the checks (lib/supportRibMark). */
export function supportRibShape(id: string, name: string, color: string, positions: ArrayLike<number>, partId?: string): WorkplaneShape | null {
  const shape = clearanceMeshShape(id, name, color, positions);
  return shape && partId ? { ...shape, ...supportRibMark(partId) } : shape;
}

const SUPPORT_RIB_SETTINGS_KEY = "layerling.supportRib";

/**
 * The settings a new rib starts with: what was used last in this browser (the printer stays the same), the rib's
 * height always from the face again; the nozzle, without any, from the print check's.
 */
export function readSupportRibSettings(fallbackNozzle?: number): SupportRibSettings {
  try {
    const stored: unknown = JSON.parse(window.localStorage.getItem(SUPPORT_RIB_SETTINGS_KEY) ?? "null");
    if (stored && typeof stored === "object") return normalizeSupportRib({ ...(stored as Partial<SupportRibSettings>), height: null });
  } catch {
    // Blocked or broken storage: the defaults.
  }
  return normalizeSupportRib({ ...DEFAULT_SUPPORT_RIB, ...(finite(fallbackNozzle) ? { nozzle: fallbackNozzle } : {}) });
}

export function writeSupportRibSettings(settings: SupportRibSettings) {
  try {
    window.localStorage.setItem(SUPPORT_RIB_SETTINGS_KEY, JSON.stringify({ ...settings, height: null }));
  } catch {
    // Blocked storage: the settings hold until the page is closed.
  }
}
