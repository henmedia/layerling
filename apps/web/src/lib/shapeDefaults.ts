import { normalizeHexColor } from "@/lib/coloredImport";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { normalizeShapeCustomizations } from "@/lib/workplaneSettings";
import { shapeDepth, shapeWidth } from "@/lib/workplaneShapes";
import type { ShapeCustomization, ShapeCustomizationMap, WorkplaneShape } from "@/types/layerling";

/**
 * The settings of a shape that "Shape defaults" can hold, under the names the
 * shape itself uses. The text itself and the largest allowed size are left
 * out: the first belongs to one text, the second is a limit set in the
 * settings, not a property of a body.
 */
const SHAPE_DEFAULT_FIELDS = [
  "cornerFillet", "topBottomFillet", "roundedBoxQuality", "steps", "sides", "bevel", "segments", "topRadius", "baseRadius",
  "topWidth", "topDepth", "teeth", "toothSize", "toothWidth", "centerHoleSize", "gearType", "helixAngle", "helixQuality", "gearProfile", "gearPressureAngle", "gearBacklash", "gearRim",
  "threadRole", "threadHead", "threadHand", "threadProfile", "threadDiameter", "threadPitch", "threadClearance",
  "threadBoltClearance", "threadAxialClearance", "threadDepth", "threadFlankAngle", "threadQuality", "threadHeadHeight", "threadChamfer", "threadChamferBottom", "threadHeadChamfer", "springTurns",
  "springWire", "springHand", "springQuality", "starPoints", "starInnerSize", "starOuterFillet", "starInnerFillet",
  "starQuality", "heartTipFillet", "heartQuality", "crescentThickness", "crescentTipFillet", "crescentQuality",
  "honeycombCellSize", "honeycombWallThickness", "honeycombFrameWidth", "tubeBoreHole", "hingeKnuckles", "hingeKnuckleWidth", "hingeStyle", "hingeConeSize", "hingePinDiameter",
  "hingeLeafThickness", "hingeClearance", "hingePinless", "hingeAngle", "hingeScrewHoles", "hingeScrewDiameter", "hingeScrewSpacing", "hingeScrewAcross", "hingeScrewCountersink", "hingeCornerRadius", "hingeLeafStyle", "hingeScrewHead", "hingeNutWidth", "gridfinityType", "gridfinityLip", "gridfinityMagnets", "gridfinityHalfGrid", "gridfinityLabelBack", "gridfinityLabelFront", "gridfinityLabelLeft", "gridfinityLabelRight", "gridfinityLabelBackWidth", "gridfinityLabelBackLength", "gridfinityLabelBackOffset", "gridfinityLabelFrontWidth", "gridfinityLabelFrontLength", "gridfinityLabelFrontOffset", "gridfinityLabelLeftWidth", "gridfinityLabelLeftLength", "gridfinityLabelLeftOffset", "gridfinityLabelRightWidth", "gridfinityLabelRightLength", "gridfinityLabelRightOffset", "gridfinityLabelCorner", "gridfinityLabelCornerSize", "gridfinityScoopBack", "gridfinityScoopFront", "gridfinityScoopLeft", "gridfinityScoopRight", "gridfinityScoopRadius", "gridfinityFloorHeight", "gridfinityOpenBack", "gridfinityOpenFront", "gridfinityOpenLeft", "gridfinityOpenRight", "gridfinityLipChamfer", "gridfinityWallThickness", "gridfinityOpeningCorner", "gridfinityOpeningCornerSize", "gridfinityPaddingBack", "gridfinityPaddingFront", "gridfinityPaddingLeft", "gridfinityPaddingRight", "gridfinityCornerRadius", "gridfinityBinCornerRadius", "gridfinityCompartmentsX", "gridfinityCompartmentsZ", "gridfinityDividerThickness", "knurlPattern", "knurlCount", "knurlDepth", "knurlAngle", "knurlChamfer",
  "dovetailNeckWidth", "dovetailClearance", "loftBottomOutline", "loftTopOutline", "loftBottomWidth", "loftBottomDepth", "loftTopWidth", "loftTopDepth", "loftBottomCorner", "loftTopCorner", "loftBottomSides", "loftTopSides", "loftOffsetX", "loftOffsetZ", "loftWall", "loftTwist", "loftSmooth", "loftSegments", "loftTiltX", "loftTiltZ", "slotEndRatio", "torusTubeRatio", "screwHoleShaft", "screwHoleHeadDepth", "screwHoleAngle", "bentTubeProfile",
  "bentTubeInnerProfile", "bentTubeSize", "bentTubeWall", "bentTubeQuality", "font", "textCurved", "textRadius",
  "textSize", "textInward", "textFlipped",
] as const;

function sameValue(a: unknown, b: unknown) {
  if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) < 1e-9;
  return a === b;
}

/** The toolbar asset a shape was made from, or null for a sketch, a mesh, a group or anything else without defaults. */
export function shapeDefaultsAsset(kind: WorkplaneShape["kind"]) {
  return toolbarShapeAssets.find((asset) => asset.kind === kind) ?? null;
}

/**
 * What "Save as default" stores for a shape: its size and its own settings, as
 * far as they differ from what the app starts the kind with. Returns null when
 * nothing differs (then the kind simply has no defaults of its own), or when
 * the shape is not one that can have any.
 */
export function shapeDefaultsFromShape(shape: WorkplaneShape, existing: ShapeCustomizationMap = {}): ShapeCustomization | null {
  const asset = shapeDefaultsAsset(shape.kind);
  if (!asset) return null;
  const app = makeShapeFromAsset(asset);
  const picked: Record<string, unknown> = {};
  const appValues: Record<string, unknown> = {};
  const take = (key: string, value: unknown, appValue: unknown) => {
    if (value === undefined || sameValue(value, appValue)) return;
    picked[key] = value;
    appValues[key] = appValue;
  };
  // The colour counts as a setting of the kind, too: a new shape of it starts with the colour saved here.
  take("color", normalizeHexColor(shape.color), normalizeHexColor(app.color));
  take("width", shapeWidth(shape), shapeWidth(app));
  take("depth", shapeDepth(shape), shapeDepth(app));
  take("height", shape.height, app.height);
  SHAPE_DEFAULT_FIELDS.forEach((key) => take(key, (shape as Record<string, unknown>)[key], (app as Record<string, unknown>)[key]));
  const keptLimit = existing[shape.kind]?.maxDimension;
  if (keptLimit !== undefined) picked.maxDimension = keptLimit;
  const normalized = normalizeShapeCustomizations({ [shape.kind]: picked })[shape.kind];
  if (!normalized) return null;
  const compact = Object.fromEntries(Object.entries(normalized).filter(([, value]) => value !== undefined)) as ShapeCustomization;
  return Object.keys(compact).length > 0 ? compact : null;
}

/** The shape defaults with this kind's entry set (or removed when `entry` is null). */
export function withShapeDefaults(map: ShapeCustomizationMap, kind: WorkplaneShape["kind"], entry: ShapeCustomization | null): ShapeCustomizationMap {
  const next = { ...map };
  if (entry) next[kind] = entry;
  else delete next[kind];
  return next;
}
