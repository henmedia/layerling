import * as THREE from "three";
import type { CrossSection } from "manifold-3d";
import { groupedShape } from "@/lib/editorBooleans";
import { getManifoldRuntime } from "@/lib/editorMeshCore";
import { cadShapeFromSketchProfile } from "@/lib/editorSketchCad";
import { blowerSpiralPoint, DEFAULT_FAN, FAN_LABEL_KEYS, FANS, fanSolids, fanSolidsExtent, normalizeFanSettings, type FanSettings, type FanSolid, type FanSolidRole, type FanSpec } from "@/lib/fans";
import { t } from "@/lib/i18n";
import { createLocalId } from "@/lib/localIds";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { canonicalizeShape } from "@/lib/workplaneShapes";
import type { ShapeKind, SketchProfile, WorkplaneShape } from "@/types/layerling";

/** The parts' colours: a black casing, its openings and screw holes darker, the hub grey, what reaches out lighter, so it shows what it cuts. */
const PART_COLORS: Record<FanSolidRole, string> = {
  body: "#2f3034",
  opening: "#111214",
  hub: "#5a5c62",
  reach: "#8a8d93",
};
const FAN_COLOR = PART_COLORS.body;
/** Rounds drawn with this many sides, as the kernel's own rounds come out. */
const ROUND_SEGMENTS = 96;

function asset(kind: ShapeKind) {
  const found = toolbarShapeAssets.find((entry) => entry.kind === kind && entry.id === kind) ?? toolbarShapeAssets.find((entry) => entry.kind === kind);
  if (!found) throw new Error(`no ${kind} in the shape library`);
  return found;
}

/**
 * The outline seen from above of a body that is not a box or a plain cylinder, in the fan's frame:
 * - a blower's casing (NopSCADlib's blower()): the hull of its spiral round the axis (and of the
 *   nozzle's front edge, when the nozzle is wider than half the casing), with the nozzle from the
 *   front edge back to the axis;
 * - a square blower's casing: its rounded square;
 * - a lug: the hull of a ring round its screw hole and a wider round about the axis;
 * each grown by the clearance; and a round opening cut square, already as wide as it reaches.
 */
async function solidOutline(spec: FanSpec, solid: FanSolid, clearance: number): Promise<Array<Array<[number, number]>>> {
  const runtime = await getManifoldRuntime();
  const made: CrossSection[] = [];
  const keep = (section: CrossSection) => {
    made.push(section);
    return section;
  };
  const disc = (radius: number, [x, y]: [number, number]) => keep(keep(runtime.CrossSection.circle(radius, ROUND_SEGMENTS)).translate([x, y]));
  const rect = (x0: number, y0: number, x1: number, y1: number) => keep(new runtime.CrossSection([[[x0, y0], [x1, y0], [x1, y1], [x0, y1]]], "Positive"));
  try {
    let outline: CrossSection;
    let grow = clearance;
    if (solid.form === "cylinder") {
      const centre: [number, number] = [(solid.x0 + solid.x1) / 2, (solid.y0 + solid.y1) / 2];
      const half = (solid.square ?? 0) / 2;
      // Its round cut to its square: the clearance is in both already.
      const radius = (solid.round ?? 0) / 2;
      outline = keep(runtime.CrossSection.intersection([disc(radius, centre), rect(centre[0] - half, centre[1] - half, centre[0] + half, centre[1] + half)]));
      grow = 0;
    } else if (solid.form === "lug") {
      if (spec.kind !== "blower" || !solid.hole) throw new Error("a lug is a blower's");
      const ring = spec.screwHole / 2 + spec.lugWall;
      outline = keep(runtime.CrossSection.hull([disc(ring, solid.hole), disc(ring + spec.lugHub / 2, spec.axis)]));
    } else if (spec.kind === "squareBlower") {
      const r = spec.cornerRadius;
      outline = keep(runtime.CrossSection.union([
        rect(r, 0, spec.width - r, spec.depth),
        rect(0, r, spec.width, spec.depth - r),
        disc(r, [r, r]), disc(r, [spec.width - r, r]), disc(r, [r, spec.depth - r]), disc(r, [spec.width - r, spec.depth - r]),
      ]));
    } else if (spec.kind === "blower") {
      const spiral: Array<[number, number]> = [];
      for (let angle = 0; angle < 360; angle += 2) spiral.push(blowerSpiralPoint(spec, angle));
      if (spec.exitWidth > spec.width / 2) spiral.push([0, 0], [spec.exitWidth, 0], [spec.exitWidth, 1], [0, 1]);
      const casing = keep(runtime.CrossSection.hull([[spiral]]));
      outline = keep(runtime.CrossSection.union([casing, rect(0, 0, spec.exitWidth, spec.axis[1])]));
    } else {
      throw new Error("an axial fan's body is a box");
    }
    if (grow > 0) outline = keep(outline.offset(grow, "Round", 2, ROUND_SEGMENTS));
    // No sides shorter than a hundredth of a millimetre: the kernel cannot make a face of them.
    outline = keep(outline.simplify(0.005));
    return outline.toPolygons().map((polygon) => {
      const ring: Array<[number, number]> = [];
      for (const [x, y] of polygon) {
        const last = ring[ring.length - 1];
        if (!last || Math.hypot(x - last[0], y - last[1]) >= 0.01) ring.push([x, y]);
      }
      while (ring.length > 2 && Math.hypot(ring[0][0] - ring[ring.length - 1][0], ring[0][1] - ring[ring.length - 1][1]) < 0.01) ring.pop();
      return ring;
    }).filter((ring) => ring.length >= 3);
  } finally {
    new Set(made).forEach((section) => section.delete());
  }
}

/** A traced body: its outline as a sketch body, from its bottom to its top. */
async function outlineBody(solid: FanSolid, rings: Array<Array<[number, number]>>, toX: (x: number) => number, toZ: (y: number) => number): Promise<WorkplaneShape> {
  // The outline centred on its own box, the way the sketch body is placed by its middle.
  const all = rings.flat();
  const midX = (Math.min(...all.map(([x]) => x)) + Math.max(...all.map(([x]) => x))) / 2;
  const midY = (Math.min(...all.map(([, y]) => y)) + Math.max(...all.map(([, y]) => y))) / 2;
  const points: SketchProfile["points"] = [];
  const segments: SketchProfile["segments"] = [];
  rings.forEach((ring, loop) => {
    const ids = ring.map((_, index) => `fan-${loop}-${index}`);
    ring.forEach(([x, y], index) => points.push({ id: ids[index], x: x - midX, z: midY - y }));
    ids.forEach((id, index) => segments.push({ id: `fan-${loop}-s${index}`, startId: id, endId: ids[(index + 1) % ids.length], kind: "line" }));
  });
  const height = solid.top - solid.bottom;
  const built = await cadShapeFromSketchProfile({ points, segments }, height);
  return { ...built, x: toX(midX), z: toZ(midY), elevation: solid.bottom };
}

function partShape(solid: FanSolid, toX: (x: number) => number, toZ: (y: number) => number): WorkplaneShape {
  const centre = { x: toX((solid.x0 + solid.x1) / 2), z: toZ((solid.y0 + solid.y1) / 2), elevation: solid.bottom };
  const size = { width: solid.x1 - solid.x0, depth: solid.y1 - solid.y0, height: solid.top - solid.bottom };
  return makeShapeFromAsset(asset(solid.form === "cylinder" ? "cylinder" : "box"), centre, size);
}

/** The settings carried by a fan, or null for any other shape. */
export function fanOf(shape: WorkplaneShape | null | undefined): FanSettings | null {
  return shape?.fan ? normalizeFanSettings(shape.fan) : null;
}

/** The name a fan of this kind gets, in the person's language. */
export function fanName(settings: FanSettings) {
  return t(FAN_LABEL_KEYS[settings.fan]);
}

/**
 * A fan as a new shape, standing on the plate's middle (Discussion #1962): a group of its solid body,
 * its openings, hub and screw holes drawn on it, and whatever reaches out of it to cut through a
 * wall (`fanSolids`). Every part is a box, a cylinder or a sketch body, so the group is an exact body.
 */
export async function fanShape(input: FanSettings): Promise<WorkplaneShape> {
  const settings = normalizeFanSettings(input) ?? { fan: DEFAULT_FAN, clearance: 0 };
  const spec = FANS[settings.fan];
  const solids = fanSolids(settings);
  const extent = fanSolidsExtent(solids);
  // The fan's frame laid on the workplane: x across, its front edge (y = 0) towards the viewer at +z, the middle of everything at the origin.
  const midX = (extent.minX + extent.maxX) / 2;
  const midY = (extent.minY + extent.maxY) / 2;
  const toX = (x: number) => x - midX;
  const toZ = (y: number) => midY - y;
  const parts = await Promise.all(solids.map(async (solid) => {
    const traced = solid.form === "outline" || solid.form === "lug" || (solid.form === "cylinder" && solid.square !== undefined);
    const shape = traced ? await outlineBody(solid, await solidOutline(spec, solid, settings.clearance), toX, toZ) : partShape(solid, toX, toZ);
    return canonicalizeShape({ ...shape, id: createLocalId("fan-part"), name: solid.name, color: PART_COLORS[solid.role], hole: false, rotation: 0 });
  }));
  const group = groupedShape(parts);
  if (!group) throw new Error(t("fan.failed"));
  // Standing on its lowest point: the underside, or a screw hole or an outlet reaching down. Every
  // part in its own colour, so the openings show on a fan made of boxes and cylinders as well.
  return canonicalizeShape({ ...group, id: createLocalId("fan"), name: fanName(settings), color: FAN_COLOR, groupOperation: "group", multicolor: true, fan: settings, elevation: 0 });
}

/**
 * Where the fan's frame sits in the built group, as the group's middle sees it: its corner (x = 0,
 * y = 0, on the underside), from the middle of the group's box, which moves when a reach changes.
 */
function fanAnchor(settings: FanSettings) {
  const extent = fanSolidsExtent(fanSolids(settings));
  const height = extent.top - extent.bottom;
  const anchor = new THREE.Vector3(-(extent.minX + extent.maxX) / 2, -extent.bottom - height / 2, (extent.minY + extent.maxY) / 2);
  return { anchor, height };
}

/**
 * A fan made again with new settings where the old one stood: same id, turn and state. The same fan
 * stays where it is - only its openings reach out or its room grows; another fan takes the old one's
 * middle. A name the person gave is kept; the fan's own name follows the new fan.
 */
export async function regeneratedFanShape(old: WorkplaneShape, settings: FanSettings): Promise<WorkplaneShape> {
  const built = await fanShape(settings);
  const previous = fanOf(old);
  const ownName = previous ? old.name !== fanName(previous) : true;
  let place = { x: old.x, z: old.z, elevation: old.elevation ?? 0 };
  const next = normalizeFanSettings(settings);
  if (previous && next && previous.fan === next.fan) {
    const before = fanAnchor(previous);
    const after = fanAnchor(next);
    const turn = new THREE.Quaternion().setFromEuler(new THREE.Euler(
      THREE.MathUtils.degToRad(old.rotationX ?? 0),
      THREE.MathUtils.degToRad(old.rotation ?? 0),
      THREE.MathUtils.degToRad(old.rotationZ ?? 0),
      "XYZ",
    ));
    const shift = before.anchor.clone().sub(after.anchor).applyQuaternion(turn);
    const middleHeight = (old.elevation ?? 0) + before.height / 2 + shift.y;
    place = { x: old.x + shift.x, z: old.z + shift.z, elevation: middleHeight - after.height / 2 };
  }
  return canonicalizeShape({
    ...built,
    id: old.id,
    name: ownName ? old.name : built.name,
    ...place,
    rotation: old.rotation,
    rotationX: old.rotationX,
    rotationZ: old.rotationZ,
    hole: old.hole,
    locked: old.locked,
    hidden: old.hidden,
  });
}
