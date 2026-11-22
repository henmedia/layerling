import { buildGroupedShapeFromSelection } from "@/lib/editorBooleans";
import { t } from "@/lib/i18n";
import { createLocalId } from "@/lib/localIds";
import { DEFAULT_RACK_PLATE, normalizeRackPlateSettings, rackPlateLayout, type RackPlateBox } from "@/lib/rackPlate";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { canonicalizeShape } from "@/lib/workplaneShapes";
import type { RackPlateSettings, ShapeKind, WorkplaneShape } from "@/types/layerling";

/** HomeRacker's yellow. */
export const RACK_PLATE_COLOR = "#f7b600";
/** How far a screw hole reaches past the plate above and below, so the cut leaves no skin. */
const HOLE_OVERSHOOT = 0.5;

function asset(kind: ShapeKind) {
  const found = toolbarShapeAssets.find((entry) => entry.kind === kind && entry.id === kind) ?? toolbarShapeAssets.find((entry) => entry.kind === kind);
  if (!found) throw new Error(`no ${kind} in the shape library`);
  return found;
}

/** The settings carried by a rack plate, or null for any other shape. */
export function rackPlateOf(shape: WorkplaneShape | null | undefined): RackPlateSettings | null {
  return shape?.rackPlate ? normalizeRackPlateSettings(shape.rackPlate) : null;
}

/** A box of the layout as a box shape: the plate's x across, its y along the workplane's z, z up. */
function boxShape(box: RackPlateBox): WorkplaneShape {
  return makeShapeFromAsset(asset("box"), { x: box.x, z: box.y, elevation: box.z }, { width: box.sizeX, depth: box.sizeY, height: box.sizeZ });
}

/**
 * A rack plate as a new shape, its middle at the origin, lying on the workplane: a group of the plate - a box, or a
 * rounded box for rounded corners - the two side walls of the HomeRacker sleeve standing on it, the square lock pin
 * holes through the walls and the corner screw holes through the plate. Every part is a shape the STEP export builds
 * exactly, so the group is an exact body too.
 */
export async function rackPlateShape(input: RackPlateSettings, triangleLimit: number): Promise<WorkplaneShape> {
  const settings = normalizeRackPlateSettings(input) ?? DEFAULT_RACK_PLATE;
  const layout = rackPlateLayout(settings);
  const plateSize = { width: layout.width, depth: layout.depth, height: layout.thickness };
  const plate = settings.cornerRadius > 0
    ? makeShapeFromAsset(asset("roundedBox"), { x: 0, z: 0, elevation: 0 }, { ...plateSize, cornerFillet: settings.cornerRadius, topBottomFillet: 0 })
    : makeShapeFromAsset(asset("box"), { x: 0, z: 0, elevation: 0 }, plateSize);
  const walls = layout.walls.map((wall) => ({ ...boxShape(wall), color: RACK_PLATE_COLOR }));
  const pinHoles = layout.pinHoles.map((hole) => ({ ...boxShape(hole), hole: true }));
  const screwHoles = layout.screwHoles.map((spot) => ({
    ...makeShapeFromAsset(asset("cylinder"), { x: spot.x, z: spot.y, elevation: -HOLE_OVERSHOOT }, {
      width: layout.screwDiameter,
      depth: layout.screwDiameter,
      height: layout.thickness + 2 * HOLE_OVERSHOOT,
    }),
    hole: true,
  }));
  const built = await buildGroupedShapeFromSelection([{ ...plate, color: RACK_PLATE_COLOR }, ...walls, ...pinHoles, ...screwHoles], triangleLimit);
  if (!built.group) throw new Error(built.failureNotice || t("rackPlate.failed"));
  // Named in English as the editor names what it makes; the object list shows it translated.
  return canonicalizeShape({ ...built.group, id: createLocalId("rack-plate"), name: "Rack plate", color: RACK_PLATE_COLOR, groupOperation: "group", elevation: 0, rackPlate: settings });
}

/**
 * A rack plate made again with new settings where the old one lay: same id, middle, turn and state. The plate grows
 * and shrinks about its middle and keeps lying where it lay. A name the person gave is kept.
 */
export async function regeneratedRackPlateShape(old: WorkplaneShape, settings: RackPlateSettings, triangleLimit: number): Promise<WorkplaneShape> {
  const built = await rackPlateShape(settings, triangleLimit);
  return canonicalizeShape({
    ...built,
    id: old.id,
    name: old.name,
    color: old.color ?? built.color,
    x: old.x,
    z: old.z,
    elevation: old.elevation ?? 0,
    rotation: old.rotation,
    rotationX: old.rotationX,
    rotationZ: old.rotationZ,
    hole: old.hole,
    locked: old.locked,
    hidden: old.hidden,
  });
}
