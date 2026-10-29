import { canonicalizeShape } from "@/lib/workplaneShapes";
import { regularPolygonAspect } from "@/lib/regularPolygonFootprint";
import { normalizePyramidTop } from "@/lib/pyramidGeometry";
import { createLocalId } from "@/lib/localIds";
import {
  DEFAULT_GEAR_BACKLASH,
  DEFAULT_GEAR_CENTER_HOLE_SIZE,
  DEFAULT_GEAR_HELIX_ANGLE,
  DEFAULT_GEAR_HELIX_QUALITY,
  DEFAULT_GEAR_MODULE,
  DEFAULT_GEAR_PRESSURE_ANGLE,
  DEFAULT_GEAR_RIM,
  DEFAULT_GEAR_TEETH,
  DEFAULT_GEAR_TOOTH_SIZE,
  DEFAULT_GEAR_TYPE,
  MAX_GEAR_BACKLASH,
  gearSizeForModule,
  gearToothProfile,
  gearUsesModule,
  involuteGearDiameter,
  normalizeGearCenterHoleSize,
  normalizeGearHelixAngle,
  normalizeGearHelixQuality,
  normalizeGearPressureAngle,
  normalizeGearRim,
  normalizeGearTeeth,
  normalizeGearToothSize,
  normalizeGearToothWidth,
  normalizeGearType,
  rackToothHeight,
} from "@/lib/gearGeometry";
import {
  DEFAULT_THREAD_CLEARANCE,
  DEFAULT_THREAD_DIAMETER,
  DEFAULT_THREAD_HAND,
  DEFAULT_THREAD_HEAD,
  DEFAULT_THREAD_PITCH,
  DEFAULT_THREAD_PROFILE,
  DEFAULT_THREAD_QUALITY,
  DEFAULT_THREAD_ROLE,
  normalizeThreadClearance,
  normalizeThreadBoltClearance,
  normalizeThreadAxialClearance,
  DEFAULT_THREAD_BOLT_CLEARANCE,
  DEFAULT_THREAD_AXIAL_CLEARANCE,
  normalizeThreadDiameter,
  normalizeThreadHand,
  normalizeThreadHead,
  normalizeThreadPitch,
  normalizeThreadProfile,
  normalizeThreadQuality,
  normalizeThreadRole,
  defaultThreadChamfer,
  threadNaturalFootprint,
  threadNaturalHeight,
  threadSettings,
} from "@/lib/threadGeometry";
import {
  DEFAULT_SPRING_QUALITY,
  DEFAULT_SPRING_TURNS,
  DEFAULT_SPRING_HAND,
  DEFAULT_SPRING_WIRE,
  normalizeSpringQuality,
  normalizeSpringTurns,
  normalizeSpringHand,
  normalizeSpringWire,
} from "@/lib/springGeometry";
import {
  DEFAULT_STAR_HEIGHT,
  DEFAULT_STAR_INNER_FILLET,
  DEFAULT_STAR_INNER_SIZE,
  DEFAULT_STAR_OUTER_FILLET,
  DEFAULT_STAR_OUTER_SIZE,
  DEFAULT_STAR_POINTS,
  DEFAULT_STAR_QUALITY,
  normalizeStarFillet,
  normalizeStarInnerSize,
  normalizeStarPoints,
  normalizeStarQuality,
} from "@/lib/starGeometry";
import {
  DEFAULT_HEART_DEPTH,
  DEFAULT_HEART_HEIGHT,
  DEFAULT_HEART_QUALITY,
  DEFAULT_HEART_TIP_FILLET,
  DEFAULT_HEART_WIDTH,
  normalizeHeartQuality,
  normalizeHeartTipFillet,
} from "@/lib/heartGeometry";
import {
  DEFAULT_CRESCENT_DEPTH,
  DEFAULT_CRESCENT_HEIGHT,
  DEFAULT_CRESCENT_QUALITY,
  DEFAULT_CRESCENT_THICKNESS,
  DEFAULT_CRESCENT_TIP_FILLET,
  DEFAULT_CRESCENT_WIDTH,
  normalizeCrescentQuality,
  normalizeCrescentThickness,
  normalizeCrescentTipFillet,
} from "@/lib/crescentGeometry";
import {
  DEFAULT_SLOT_WIDTH,
  DEFAULT_SLOT_DEPTH,
  DEFAULT_SLOT_HEIGHT,
} from "@/lib/slotGeometry";
import {
  DEFAULT_COUNTERBORE_HEIGHT,
  DEFAULT_COUNTERBORE_WIDTH,
  DEFAULT_COUNTERSINK_HEIGHT,
  DEFAULT_COUNTERSINK_WIDTH,
  DEFAULT_DOUBLE_COUNTERSINK_HEIGHT,
  DEFAULT_DOUBLE_COUNTERSINK_WIDTH,
  DEFAULT_SCREW_HOLE_ANGLE,
  DEFAULT_SCREW_HOLE_HEAD_DEPTH,
  DEFAULT_SCREW_HOLE_SHAFT,
  normalizeScrewHoleAngle,
  normalizeScrewHoleHeadDepth,
  normalizeScrewHoleShaft,
} from "@/lib/screwHoleGeometry";
import {
  DEFAULT_TEARDROP_DEPTH,
  DEFAULT_TEARDROP_TIP_ANGLE,
  DEFAULT_TEARDROP_WIDTH,
  teardropHeightForTipAngle,
} from "@/lib/teardropGeometry";
import { DEFAULT_LOFT, loftFieldsFromMeasures, loftFrameSize, normalizeLoftMeasures } from "@/lib/loftGeometry";
import { DEFAULT_VASE_SIZE, normalizeVaseSettings } from "@/lib/vaseSettings";
import {
  DEFAULT_DOVETAIL_CLEARANCE,
  DEFAULT_DOVETAIL_DEPTH,
  DEFAULT_DOVETAIL_HEIGHT,
  DEFAULT_DOVETAIL_NECK_RATIO,
  DEFAULT_DOVETAIL_WIDTH,
  normalizeDovetailClearance,
  normalizeDovetailNeckWidth,
} from "@/lib/dovetailGeometry";
import {
  DEFAULT_HINGE_CLEARANCE,
  DEFAULT_HINGE_DEPTH,
  DEFAULT_HINGE_HEIGHT,
  DEFAULT_HINGE_KNUCKLES,
  DEFAULT_HINGE_LEAF_THICKNESS,
  DEFAULT_HINGE_PIN_DIAMETER,
  DEFAULT_HINGE_WIDTH,
  normalizeHingeClearance,
  normalizeHingeKnuckles,
  normalizeHingeKnuckleWidth,
  normalizeHingeLeafThickness,
  normalizeHingePinDiameter,
  normalizeHingeScrewDiameter,
  normalizeHingeScrewHoles,
} from "@/lib/hingeGeometry";
import { DEFAULT_GRIDFINITY_LIP, DEFAULT_GRIDFINITY_MAGNETS, DEFAULT_GRIDFINITY_TRAY_SIZE, DEFAULT_GRIDFINITY_TYPE, DEFAULT_GRIDFINITY_UNITS, gridfinityFootprintPatch, gridfinityPadding, gridfinitySize, normalizeGridfinityType } from "@/lib/gridfinityGeometry";
import {
  DEFAULT_KNURL_ANGLE,
  DEFAULT_KNURL_CHAMFER,
  DEFAULT_KNURL_COUNT,
  DEFAULT_KNURL_DEPTH,
  DEFAULT_KNURL_DIAMETER,
  DEFAULT_KNURL_HEIGHT,
  DEFAULT_KNURL_PATTERN,
  normalizeKnurlAngle,
  normalizeKnurlChamfer,
  normalizeKnurlCount,
  normalizeKnurlDepth,
  normalizeKnurlPattern,
} from "@/lib/knurlGeometry";
import {
  DEFAULT_HONEYCOMB_WIDTH,
  DEFAULT_HONEYCOMB_DEPTH,
  DEFAULT_HONEYCOMB_HEIGHT,
  DEFAULT_HONEYCOMB_CELL_SIZE,
  DEFAULT_HONEYCOMB_WALL_THICKNESS,
  DEFAULT_HONEYCOMB_FRAME_WIDTH,
  normalizeHoneycombCellSize,
  normalizeHoneycombWallThickness,
  normalizeHoneycombFrameWidth,
} from "@/lib/honeycombGeometry";
import {
  DEFAULT_ROUNDED_BOX_WIDTH,
  DEFAULT_ROUNDED_BOX_DEPTH,
  DEFAULT_ROUNDED_BOX_HEIGHT,
  DEFAULT_ROUNDED_BOX_CORNER_FILLET,
  DEFAULT_ROUNDED_BOX_TOP_BOTTOM_FILLET,
  DEFAULT_ROUNDED_BOX_QUALITY,
  normalizeCornerFillet,
  normalizeTopBottomFillet,
  normalizeRoundedBoxQuality,
} from "@/lib/roundedBoxGeometry";
import {
  bentTubeNaturalDimensions,
  DEFAULT_BENT_TUBE_INNER_PROFILE,
  DEFAULT_BENT_TUBE_PROFILE,
  DEFAULT_BENT_TUBE_QUALITY,
  DEFAULT_BENT_TUBE_SIZE,
  DEFAULT_BENT_TUBE_WALL,
  normalizedBentTubeFields,
} from "@/lib/bentTubeGeometry";
import { t, type MessageKey } from "@/lib/i18n";
import { torusTubeRatio } from "@/lib/torusShape";
import type { ShapeAsset, ShapeCustomization, ShapeKind, WorkplaneShape } from "@/types/layerling";

const SHAPE_LABEL_KEYS: Record<string, MessageKey> = {
  box: "shape.box",
  roundedBox: "shape.roundedBox",
  cylinder: "shape.cylinder",
  slot: "shape.slot",
  ellipse: "shape.ellipse",
  sphere: "shape.sphere",
  cone: "shape.cone",
  pyramid: "shape.pyramid",
  wedge: "shape.wedge",
  text: "shape.text",
  nameTag: "shape.nameTag",
  iconTag: "shape.iconTag",
  qrCode: "shape.qrCode",
  "round-roof": "shape.roundRoof",
  "half-sphere": "shape.halfSphere",
  paraboloid: "shape.paraboloid",
  torus: "shape.torus",
  tube: "shape.tube",
  bentTube: "shape.bentTube",
  star: "shape.star",
  heart: "shape.heart",
  crescent: "shape.crescent",
  gear: "shape.gear",
  honeycomb: "shape.honeycomb",
  hinge: "shape.hinge",
  knurl: "shape.knurl",
  dovetail: "shape.dovetail",
  teardrop: "shape.teardrop",
  loft: "shape.loft",
  vase: "shape.vase",
  counterbore: "shape.counterbore",
  countersink: "shape.countersink",
  doubleCountersink: "shape.doubleCountersink",
  thread: "shape.thread",
  spring: "shape.spring",
  gridfinity: "shape.gridfinity",
  polygon: "shape.polygon",
  ruler: "shape.ruler",
};

export type ToolbarShapeAsset = ShapeAsset & { menuIcon: string };

export const toolbarShapeAssets: ToolbarShapeAsset[] = [
  { id: "box", name: "Box", src: "assets/editor/shape-icons-gray/box.png", menuIcon: "assets/editor/shape-icons-gray/box.png", kind: "box", color: "#d41721" },
  { id: "roundedBox", name: "Rounded Box", src: "assets/editor/shape-icons-gray/roundedBox.png", menuIcon: "assets/editor/shape-icons-gray/roundedBox.png", kind: "roundedBox", color: "#e74c3c" },
  { id: "cylinder", name: "Cylinder", src: "assets/editor/shape-icons-gray/cylinder.png", menuIcon: "assets/editor/shape-icons-gray/cylinder.png", kind: "cylinder", color: "#d97813" },
  { id: "slot", name: "Capsule", src: "assets/editor/shape-icons-gray/slot.png", menuIcon: "assets/editor/shape-icons-gray/slot.png", kind: "slot", color: "#e67e22" },
  { id: "ellipse", name: "Ellipse", src: "assets/editor/shape-icons-gray/ellipse.png", menuIcon: "assets/editor/shape-icons-gray/ellipse.png", kind: "ellipse", color: "#e0a324" },
  { id: "polygon", name: "Polygon", src: "assets/editor/shape-icons-gray/polygon.png", menuIcon: "assets/editor/shape-icons-gray/polygon.png", kind: "polygon", color: "#5b5ce2" },
  { id: "sphere", name: "Sphere", src: "assets/editor/shape-icons-gray/sphere.png", menuIcon: "assets/editor/shape-icons-gray/sphere.png", kind: "sphere", color: "#0098c7" },
  { id: "cone", name: "Cone", src: "assets/editor/shape-icons-gray/cone.png", menuIcon: "assets/editor/shape-icons-gray/cone.png", kind: "cone", color: "#6e2786" },
  { id: "pyramid", name: "Pyramid", src: "assets/editor/shape-icons-gray/pyramid.png", menuIcon: "assets/editor/shape-icons-gray/pyramid.png", kind: "pyramid", color: "#f2cf10" },
  { id: "wedge", name: "Wedge", src: "assets/editor/shape-icons-gray/wedge.png", menuIcon: "assets/editor/shape-icons-gray/wedge.png", kind: "wedge", color: "#33983d" },
  { id: "round-roof", name: "Round Roof", src: "assets/editor/shape-icons-gray/round-roof.png", menuIcon: "assets/editor/shape-icons-gray/round-roof.png", kind: "roundRoof", color: "#67c4ce" },
  { id: "half-sphere", name: "Half Sphere", src: "assets/editor/shape-icons-gray/half-sphere.png", menuIcon: "assets/editor/shape-icons-gray/half-sphere.png", kind: "halfSphere", color: "#c9009a" },
  { id: "paraboloid", name: "Paraboloid", src: "assets/editor/shape-icons-gray/paraboloid.png", menuIcon: "assets/editor/shape-icons-gray/paraboloid.png", kind: "paraboloid", color: "#8fdc5a" },
  { id: "torus", name: "Torus", src: "assets/editor/shape-icons-gray/torus.png", menuIcon: "assets/editor/shape-icons-gray/torus.png", kind: "torus", color: "#0098c7" },
  { id: "loft", name: "Loft", src: "assets/editor/shape-icons-gray/loft.png", menuIcon: "assets/editor/shape-icons-gray/loft.png", kind: "loft", color: "#c0703a" },
  { id: "vase", name: "Vase", src: "assets/editor/shape-icons-gray/vase.png", menuIcon: "assets/editor/shape-icons-gray/vase.png", kind: "vase", color: "#2e8b8b" },
  { id: "tube", name: "Tube", src: "assets/editor/shape-icons-gray/tube.png", menuIcon: "assets/editor/shape-icons-gray/tube.png", kind: "tube", color: "#ce7013" },
  { id: "bentTube", name: "Bent Tube", src: "assets/editor/shape-icons-gray/bentTube.png", menuIcon: "assets/editor/shape-icons-gray/bentTube.png", kind: "bentTube", color: "#b5651d" },
  { id: "counterbore", name: "Counterbore", src: "assets/editor/shape-icons-gray/counterbore.png", menuIcon: "assets/editor/shape-icons-gray/counterbore.png", kind: "counterbore", color: "#5f7a8a" },
  { id: "countersink", name: "Countersink", src: "assets/editor/shape-icons-gray/countersink.png", menuIcon: "assets/editor/shape-icons-gray/countersink.png", kind: "countersink", color: "#6b8a7a" },
  { id: "doubleCountersink", name: "Double Countersink", src: "assets/editor/shape-icons-gray/doubleCountersink.png", menuIcon: "assets/editor/shape-icons-gray/doubleCountersink.png", kind: "doubleCountersink", color: "#6b8a8a" },
  { id: "teardrop", name: "Teardrop", src: "assets/editor/shape-icons-gray/teardrop.png", menuIcon: "assets/editor/shape-icons-gray/teardrop.png", kind: "teardrop", color: "#7d6a9c" },
  { id: "text", name: "Text", src: "assets/editor/shape-icons-gray/text.png", menuIcon: "assets/editor/shape-icons-gray/text.png", kind: "text", color: "#cf101b" },
  { id: "thread", name: "Thread", src: "assets/editor/shape-icons-gray/thread.png", menuIcon: "assets/editor/shape-icons-gray/thread.png", kind: "thread", color: "#8a98a6" },
  { id: "spring", name: "Spring", src: "assets/editor/shape-icons-gray/spring.png", menuIcon: "assets/editor/shape-icons-gray/spring.png", kind: "spring", color: "#18b99a" },
  { id: "gridfinity", name: "Gridfinity", src: "assets/editor/shape-icons-gray/gridfinity.png", menuIcon: "assets/editor/shape-icons-gray/gridfinity.png", kind: "gridfinity", color: "#4f7fa8" },
  { id: "gear", name: "Gear", src: "assets/editor/gear-types/spur.png", menuIcon: "assets/editor/gear-types/spur.png", kind: "gear", color: "#6f7f8d" },
  { id: "knurl", name: "Knurl", src: "assets/editor/shape-icons-gray/knurl.png", menuIcon: "assets/editor/shape-icons-gray/knurl.png", kind: "knurl", color: "#7a8a99" },
  { id: "hinge", name: "Hinge", src: "assets/editor/shape-icons-gray/hinge.png", menuIcon: "assets/editor/shape-icons-gray/hinge.png", kind: "hinge", color: "#3f8f6b" },
  { id: "dovetail", name: "Dovetail", src: "assets/editor/shape-icons-gray/dovetail.png", menuIcon: "assets/editor/shape-icons-gray/dovetail.png", kind: "dovetail", color: "#a0522d" },
  { id: "star", name: "Star", src: "assets/editor/shape-icons-gray/star.png", menuIcon: "assets/editor/shape-icons-gray/star.png", kind: "star", color: "#f5a623" },
  { id: "heart", name: "Heart", src: "assets/editor/shape-icons-gray/heart.png", menuIcon: "assets/editor/shape-icons-gray/heart.png", kind: "heart", color: "#e0245e" },
  { id: "crescent", name: "Crescent", src: "assets/editor/shape-icons-gray/crescent.png", menuIcon: "assets/editor/shape-icons-gray/crescent.png", kind: "crescent", color: "#f5c518" },
  { id: "ruler", name: "Ruler", src: "assets/editor/shape-icons-gray/ruler.png", menuIcon: "assets/editor/shape-icons-gray/ruler.png", kind: "ruler", color: "#f2e4b8" },
];
/**
 * The name tag (#215): a text the editor splits into coloured layers as it places it. Its own
 * entry in the library, right after Text, so a beginner finds it; it is a text, not a kind of
 * its own, so the catalogue of kinds above stays one entry per kind.
 */
export const nameTagAsset: ToolbarShapeAsset = {
  id: "nameTag",
  name: "Name tag",
  src: "assets/editor/shape-icons-gray/nameTag.png",
  menuIcon: "assets/editor/shape-icons-gray/nameTag.png",
  kind: "text",
  color: "#ffffff",
};

/**
 * The icon tag: an SVG icon split into the name tag's layers. The library entry opens a small
 * window for the file and the width instead of a shape to place; the kind only names its picture.
 */
export const iconTagAsset: ToolbarShapeAsset = {
  id: "iconTag",
  name: "Icon tag",
  src: "assets/editor/shape-icons-gray/iconTag.png",
  menuIcon: "assets/editor/shape-icons-gray/iconTag.png",
  kind: "text",
  color: "#ffffff",
};

/**
 * The QR code (#553): a text or an address as a code to print. Like the icon tag, the library
 * entry opens a window for the text and the choices; the kind only names its picture.
 */
export const qrCodeAsset: ToolbarShapeAsset = {
  id: "qrCode",
  name: "QR code",
  src: "assets/editor/shape-icons-gray/qrCode.png",
  menuIcon: "assets/editor/shape-icons-gray/qrCode.png",
  kind: "text",
  color: "#1f1f1f",
};

/**
 * What the shape library lists: the catalogue, with the name tag, the icon tag and the QR code after the text.
 * The double countersink is not listed on its own: it is the countersink with "Both sides" switched on (#621). The
 * kind stays in the catalogue, so bodies that already are one, and the MCP, keep working.
 */
export const libraryShapeAssets: ToolbarShapeAsset[] = toolbarShapeAssets.flatMap((asset) => (asset.id === "text" ? [asset, nameTagAsset, iconTagAsset, qrCodeAsset] : asset.id === "doubleCountersink" ? [] : [asset]));

/**
 * The colour a new shape of this asset starts with: the asset's own, unless the shape
 * defaults saved for its kind name another. The library shows the same colour beside each
 * entry, so the list tells what will land on the workplane.
 */
export function shapeAssetColor(asset: ShapeAsset, customization: ShapeCustomization = {}): string {
  return customization.color ?? asset.color;
}

/**
 * Kinds a shape dragged from the library may have. Taken from the library
 * itself: a hand-kept list here missed the rounded box and the ruler, and
 * dragging them onto the workplane silently did nothing (#100).
 */
const DROPPABLE_SHAPE_KINDS = new Set<ShapeKind>(toolbarShapeAssets.map((asset) => asset.kind));

/** The library shape carried by a drag, or null when the data is not one. */
export function parseDroppedShapeAsset(raw: string): ShapeAsset | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    const asset = value as Partial<ShapeAsset>;
    if (
      typeof asset.id !== "string" ||
      typeof asset.name !== "string" ||
      typeof asset.src !== "string" ||
      typeof asset.color !== "string" ||
      !DROPPABLE_SHAPE_KINDS.has(asset.kind as ShapeKind) ||
      (asset.hole !== undefined && typeof asset.hole !== "boolean")
    ) {
      return null;
    }
    return { id: asset.id, name: asset.name, src: asset.src, kind: asset.kind as ShapeKind, color: asset.color, hole: asset.hole };
  } catch {
    return null;
  }
}


/** Feste Kreuzausdehnung und Dicke des Lineals - nur die Laenge (width) ist einstellbar. */
export const RULER_DEPTH = 25;
export const RULER_HEIGHT = 3;

export function shapeAssetDefaultDimensions(kind: ShapeKind) {
  if (kind === "thread") {
    const settings = threadSettings({});
    const footprint = threadNaturalFootprint(settings);
    return { width: footprint.width, depth: footprint.depth, height: threadNaturalHeight(settings) };
  }
  if (kind === "spring") {
    return { width: 20, depth: 20, height: 30 };
  }
  if (kind === "polygon") {
    // Breite und Tiefe im Verhaeltnis des Vielecks, damit der Sechskant beim
    // Einfuegen wirklich gleichseitig ist und nicht gestaucht.
    const aspect = regularPolygonAspect(6);
    const longest = Math.max(aspect.width, aspect.depth);
    return { width: (20 * aspect.width) / longest, depth: (20 * aspect.depth) / longest, height: 20 };
  }
  if (kind === "ruler") {
    return { width: 150, depth: RULER_DEPTH, height: RULER_HEIGHT };
  }
  if (kind === "star") {
    return { width: DEFAULT_STAR_OUTER_SIZE, depth: DEFAULT_STAR_OUTER_SIZE, height: DEFAULT_STAR_HEIGHT };
  }
  if (kind === "heart") {
    return { width: DEFAULT_HEART_WIDTH, depth: DEFAULT_HEART_DEPTH, height: DEFAULT_HEART_HEIGHT };
  }
  if (kind === "crescent") {
    return { width: DEFAULT_CRESCENT_WIDTH, depth: DEFAULT_CRESCENT_DEPTH, height: DEFAULT_CRESCENT_HEIGHT };
  }
  if (kind === "slot") {
    return { width: DEFAULT_SLOT_WIDTH, depth: DEFAULT_SLOT_DEPTH, height: DEFAULT_SLOT_HEIGHT };
  }
  if (kind === "counterbore") {
    return { width: DEFAULT_COUNTERBORE_WIDTH, depth: DEFAULT_COUNTERBORE_WIDTH, height: DEFAULT_COUNTERBORE_HEIGHT };
  }
  if (kind === "countersink") {
    return { width: DEFAULT_COUNTERSINK_WIDTH, depth: DEFAULT_COUNTERSINK_WIDTH, height: DEFAULT_COUNTERSINK_HEIGHT };
  }
  if (kind === "doubleCountersink") {
    return { width: DEFAULT_DOUBLE_COUNTERSINK_WIDTH, depth: DEFAULT_DOUBLE_COUNTERSINK_WIDTH, height: DEFAULT_DOUBLE_COUNTERSINK_HEIGHT };
  }
  if (kind === "teardrop") {
    return { width: DEFAULT_TEARDROP_WIDTH, depth: DEFAULT_TEARDROP_DEPTH, height: Math.round(teardropHeightForTipAngle(DEFAULT_TEARDROP_WIDTH, DEFAULT_TEARDROP_TIP_ANGLE) * 100) / 100 };
  }
  if (kind === "dovetail") {
    return { width: DEFAULT_DOVETAIL_WIDTH, depth: DEFAULT_DOVETAIL_DEPTH, height: DEFAULT_DOVETAIL_HEIGHT };
  }
  if (kind === "loft") {
    const frame = loftFrameSize(normalizeLoftMeasures(DEFAULT_LOFT));
    return { width: frame.width, depth: frame.depth, height: DEFAULT_LOFT.height };
  }
  if (kind === "hinge") {
    return { width: DEFAULT_HINGE_WIDTH, depth: DEFAULT_HINGE_DEPTH, height: DEFAULT_HINGE_HEIGHT };
  }
  if (kind === "gridfinity") {
    return gridfinitySize(DEFAULT_GRIDFINITY_TYPE, DEFAULT_GRIDFINITY_UNITS);
  }
  if (kind === "knurl") {
    return { width: DEFAULT_KNURL_DIAMETER, depth: DEFAULT_KNURL_DIAMETER, height: DEFAULT_KNURL_HEIGHT };
  }
  if (kind === "vase") {
    return { ...DEFAULT_VASE_SIZE };
  }
  if (kind === "honeycomb") {
    return { width: DEFAULT_HONEYCOMB_WIDTH, depth: DEFAULT_HONEYCOMB_DEPTH, height: DEFAULT_HONEYCOMB_HEIGHT };
  }
  if (kind === "bentTube") {
    // Die Groesse ergibt sich aus Profil und Segmenten, nicht umgekehrt.
    const natural = bentTubeNaturalDimensions({});
    return { width: natural.width, depth: natural.depth, height: natural.height };
  }
  if (kind === "roundedBox") {
    return { width: DEFAULT_ROUNDED_BOX_WIDTH, depth: DEFAULT_ROUNDED_BOX_DEPTH, height: DEFAULT_ROUNDED_BOX_HEIGHT };
  }
  if (kind === "ellipse") {
    // Bewusst ungleiche Vorgabe, damit sich die Ellipse beim Einfuegen sofort
    // vom kreisrunden Zylinder unterscheidet.
    return { width: 26, depth: 16, height: 20 };
  }
  const roundProfile = kind === "sphere" || kind === "torus" || kind === "ring" || kind === "halfSphere" || kind === "paraboloid";
  const flatProfile = kind === "torus" || kind === "ring" || kind === "text" || kind === "gear";
  // A gear starts as 12 involute teeth of module 2 (#201).
  const size = kind === "gear" ? involuteGearDiameter(DEFAULT_GEAR_MODULE, DEFAULT_GEAR_TEETH) : roundProfile ? 22 : 20;
  return {
    width: kind === "text" ? 86 : size,
    depth: kind === "text" ? 28 : size,
    height: kind === "sphere" ? size : kind === "gear" ? 6 : kind === "text" ? 10 : kind === "roundRoof" ? 10 : kind === "halfSphere" ? 11 : kind === "paraboloid" ? 20 : flatProfile ? 5 : 20,
  };
}

export function shapeAssetSpecialDefaults(kind: ShapeKind, dimensions = shapeAssetDefaultDimensions(kind)): ShapeCustomization {
  // Ohne Seitenzahl folgt sie der Groesse; eine eingetragene haelt sie fest.
  if (kind === "cylinder" || kind === "ellipse" || kind === "slot") return {};
  if (kind === "roundedBox") {
    return {
      cornerFillet: DEFAULT_ROUNDED_BOX_CORNER_FILLET,
      topBottomFillet: DEFAULT_ROUNDED_BOX_TOP_BOTTOM_FILLET,
      roundedBoxQuality: DEFAULT_ROUNDED_BOX_QUALITY,
    };
  }
  if (kind === "bentTube") {
    return {
      bentTubeProfile: DEFAULT_BENT_TUBE_PROFILE,
      bentTubeInnerProfile: DEFAULT_BENT_TUBE_INNER_PROFILE,
      bentTubeSize: DEFAULT_BENT_TUBE_SIZE,
      bentTubeWall: DEFAULT_BENT_TUBE_WALL,
      bentTubeQuality: DEFAULT_BENT_TUBE_QUALITY,
    };
  }
  if (kind === "sphere") return { steps: 24 };
  if (kind === "halfSphere" || kind === "paraboloid") return { steps: 32 };
  if (kind === "cone") return { topRadius: 0, baseRadius: dimensions.width / 2 };
  if (kind === "pyramid") return { sides: 4, topWidth: 0, topDepth: 0 };
  if (kind === "polygon") return { sides: 6 };
  if (kind === "roundRoof") return { sides: 64 };
  if (kind === "tube" || kind === "ring") return { bevel: 4 };
  if (kind === "star") {
    return {
      starPoints: DEFAULT_STAR_POINTS,
      starInnerSize: DEFAULT_STAR_INNER_SIZE,
      starOuterFillet: DEFAULT_STAR_OUTER_FILLET,
      starInnerFillet: DEFAULT_STAR_INNER_FILLET,
      starQuality: DEFAULT_STAR_QUALITY,
    };
  }
  if (kind === "heart") {
    return {
      heartTipFillet: DEFAULT_HEART_TIP_FILLET,
      heartQuality: DEFAULT_HEART_QUALITY,
    };
  }
  if (kind === "crescent") {
    return {
      crescentThickness: DEFAULT_CRESCENT_THICKNESS,
      crescentTipFillet: DEFAULT_CRESCENT_TIP_FILLET,
      crescentQuality: DEFAULT_CRESCENT_QUALITY,
    };
  }
  if (kind === "counterbore") {
    return { screwHoleShaft: DEFAULT_SCREW_HOLE_SHAFT, screwHoleHeadDepth: DEFAULT_SCREW_HOLE_HEAD_DEPTH };
  }
  if (kind === "countersink" || kind === "doubleCountersink") {
    return { screwHoleShaft: DEFAULT_SCREW_HOLE_SHAFT, screwHoleAngle: DEFAULT_SCREW_HOLE_ANGLE };
  }
  if (kind === "knurl") {
    return { knurlPattern: DEFAULT_KNURL_PATTERN, knurlCount: DEFAULT_KNURL_COUNT, knurlDepth: DEFAULT_KNURL_DEPTH, knurlAngle: DEFAULT_KNURL_ANGLE, knurlChamfer: DEFAULT_KNURL_CHAMFER };
  }
  if (kind === "gridfinity") {
    return { gridfinityType: DEFAULT_GRIDFINITY_TYPE, gridfinityLip: DEFAULT_GRIDFINITY_LIP, gridfinityMagnets: DEFAULT_GRIDFINITY_MAGNETS };
  }
  if (kind === "hinge") {
    return {
      hingeKnuckles: DEFAULT_HINGE_KNUCKLES,
      hingePinDiameter: DEFAULT_HINGE_PIN_DIAMETER,
      hingeLeafThickness: DEFAULT_HINGE_LEAF_THICKNESS,
      hingeClearance: DEFAULT_HINGE_CLEARANCE,
    };
  }
  if (kind === "loft") {
    return loftFieldsFromMeasures(normalizeLoftMeasures(DEFAULT_LOFT));
  }
  if (kind === "dovetail") {
    return {
      dovetailNeckWidth: dimensions.width * DEFAULT_DOVETAIL_NECK_RATIO,
      dovetailClearance: DEFAULT_DOVETAIL_CLEARANCE,
    };
  }
  if (kind === "honeycomb") {
    return {
      honeycombCellSize: DEFAULT_HONEYCOMB_CELL_SIZE,
      honeycombWallThickness: DEFAULT_HONEYCOMB_WALL_THICKNESS,
      honeycombFrameWidth: DEFAULT_HONEYCOMB_FRAME_WIDTH,
    };
  }
  // New text starts in Sans: Multilanguage lacks umlauts, ß and €. Texts saved
  // without a font keep reading as Multilanguage, so their look never changes.
  if (kind === "text") return { text: "TEXT", font: "Sans", bevel: 0, segments: 0 };
  if (kind === "spring") {
    return {
      springTurns: DEFAULT_SPRING_TURNS,
      springWire: DEFAULT_SPRING_WIRE,
      springQuality: DEFAULT_SPRING_QUALITY,
      springHand: DEFAULT_SPRING_HAND,
    };
  }
  if (kind === "thread") {
    return {
      threadRole: DEFAULT_THREAD_ROLE,
      threadHead: DEFAULT_THREAD_HEAD,
      threadHand: DEFAULT_THREAD_HAND,
      threadProfile: DEFAULT_THREAD_PROFILE,
      threadDiameter: DEFAULT_THREAD_DIAMETER,
      threadPitch: DEFAULT_THREAD_PITCH,
      threadClearance: DEFAULT_THREAD_CLEARANCE,
      threadBoltClearance: DEFAULT_THREAD_BOLT_CLEARANCE,
      threadAxialClearance: DEFAULT_THREAD_AXIAL_CLEARANCE,
      threadQuality: DEFAULT_THREAD_QUALITY,
      threadChamfer: defaultThreadChamfer(DEFAULT_THREAD_PITCH, DEFAULT_THREAD_PROFILE, DEFAULT_THREAD_ROLE),
      threadHeadChamfer: 0,
    };
  }
  if (kind === "gear") {
    const teeth = DEFAULT_GEAR_TEETH;
    const toothSize = normalizeGearToothSize(DEFAULT_GEAR_TOOTH_SIZE, dimensions.width, dimensions.depth);
    return {
      teeth,
      toothSize,
      toothWidth: normalizeGearToothWidth(undefined, dimensions.width, dimensions.depth, teeth),
      centerHoleSize: normalizeGearCenterHoleSize(DEFAULT_GEAR_CENTER_HOLE_SIZE, dimensions.width, dimensions.depth, toothSize, { teeth, gearProfile: "involute" }),
      gearType: DEFAULT_GEAR_TYPE,
      helixAngle: DEFAULT_GEAR_HELIX_ANGLE,
      helixQuality: DEFAULT_GEAR_HELIX_QUALITY,
      gearProfile: "involute",
      gearPressureAngle: DEFAULT_GEAR_PRESSURE_ANGLE,
      gearBacklash: DEFAULT_GEAR_BACKLASH,
      gearRim: DEFAULT_GEAR_RIM,
    };
  }
  return {};
}

export function sceneShape(shape: Partial<WorkplaneShape> & Pick<WorkplaneShape, "name" | "kind" | "color">): WorkplaneShape {
  const width = shape.width ?? shape.size ?? 20;
  const depth = shape.depth ?? shape.size ?? 20;
  const height = shape.height ?? 20;
  return canonicalizeShape({
    id: shape.id ?? createLocalId("shape"),
    name: shape.name,
    kind: shape.kind,
    color: shape.color,
    hole: shape.hole,
    x: shape.x ?? 0,
    z: shape.z ?? 0,
    elevation: shape.elevation ?? 0,
    size: shape.size ?? Math.max(width, depth),
    width,
    depth,
    height,
    rotation: shape.rotation ?? 0,
    rotationX: shape.rotationX ?? 0,
    rotationZ: shape.rotationZ ?? 0,
    radius: shape.radius,
    steps: shape.steps,
    sides: shape.sides,
    bevel: shape.bevel,
    segments: shape.segments,
    topRadius: shape.topRadius,
    baseRadius: shape.baseRadius,
    topWidth: shape.topWidth,
    topDepth: shape.topDepth,
    taperTopWidth: shape.taperTopWidth,
    taperTopDepth: shape.taperTopDepth,
    taperBottomWidth: shape.taperBottomWidth,
    taperBottomDepth: shape.taperBottomDepth,
    taperTopScale: shape.taperTopScale,
    taperBottomScale: shape.taperBottomScale,
    teeth: shape.teeth,
    toothSize: shape.toothSize,
    toothWidth: shape.toothWidth,
    centerHoleSize: shape.centerHoleSize,
    gearType: shape.gearType,
    gearRim: shape.gearRim,
    helixAngle: shape.helixAngle,
    helixQuality: shape.helixQuality,
    gearProfile: shape.gearProfile,
    gearPressureAngle: shape.gearPressureAngle,
    gearBacklash: shape.gearBacklash,
    threadRole: shape.threadRole,
    threadHead: shape.threadHead,
    threadHand: shape.threadHand,
    threadProfile: shape.threadProfile,
    threadDiameter: shape.threadDiameter,
    threadPitch: shape.threadPitch,
    threadClearance: shape.threadClearance,
    threadBoltClearance: shape.threadBoltClearance,
    threadAxialClearance: shape.threadAxialClearance,
    threadDepth: shape.threadDepth,
    threadFlankAngle: shape.threadFlankAngle,
    threadQuality: shape.threadQuality,
    threadHeadHeight: shape.threadHeadHeight,
    threadChamfer: shape.threadChamfer,
    threadChamferBottom: shape.threadChamferBottom,
    threadHeadChamfer: shape.threadHeadChamfer,
    springTurns: shape.springTurns,
    springWire: shape.springWire,
    springHand: shape.springHand,
    springQuality: shape.springQuality,
    starPoints: shape.starPoints,
    starInnerSize: shape.starInnerSize,
    starOuterFillet: shape.starOuterFillet,
    starInnerFillet: shape.starInnerFillet,
    starQuality: shape.starQuality,
    heartTipFillet: shape.heartTipFillet,
    heartQuality: shape.heartQuality,
    crescentThickness: shape.crescentThickness,
    crescentTipFillet: shape.crescentTipFillet,
    crescentQuality: shape.crescentQuality,
    honeycombCellSize: shape.honeycombCellSize,
    honeycombWallThickness: shape.honeycombWallThickness,
    honeycombFrameWidth: shape.honeycombFrameWidth,
    hingeKnuckles: shape.hingeKnuckles,
    hingeKnuckleWidth: shape.hingeKnuckleWidth,
    hingeConeSize: shape.hingeConeSize,
    hingeStyle: shape.hingeStyle,
    hingePinDiameter: shape.hingePinDiameter,
    hingeLeafThickness: shape.hingeLeafThickness,
    hingeClearance: shape.hingeClearance,
    hingePinless: shape.hingePinless,
    hingeAngle: shape.hingeAngle,
    hingeScrewHoles: shape.hingeScrewHoles,
    hingeScrewDiameter: shape.hingeScrewDiameter,
    hingeScrewSpacing: shape.hingeScrewSpacing,
    hingeScrewAcross: shape.hingeScrewAcross,
    hingeScrewCountersink: shape.hingeScrewCountersink,
    hingeCornerRadius: shape.hingeCornerRadius,
    hingeLeafStyle: shape.hingeLeafStyle,
    hingeScrewHead: shape.hingeScrewHead,
    hingeNutWidth: shape.hingeNutWidth,
    gridfinityType: shape.gridfinityType,
    gridfinityLip: shape.gridfinityLip,
    gridfinityMagnets: shape.gridfinityMagnets,
    gridfinityHalfGrid: shape.gridfinityHalfGrid,
    gridfinityLabelBack: shape.gridfinityLabelBack,
    gridfinityLabelFront: shape.gridfinityLabelFront,
    gridfinityLabelLeft: shape.gridfinityLabelLeft,
    gridfinityLabelRight: shape.gridfinityLabelRight,
    gridfinityLabelBackWidth: shape.gridfinityLabelBackWidth,
    gridfinityLabelBackLength: shape.gridfinityLabelBackLength,
    gridfinityLabelBackOffset: shape.gridfinityLabelBackOffset,
    gridfinityLabelFrontWidth: shape.gridfinityLabelFrontWidth,
    gridfinityLabelFrontLength: shape.gridfinityLabelFrontLength,
    gridfinityLabelFrontOffset: shape.gridfinityLabelFrontOffset,
    gridfinityLabelLeftWidth: shape.gridfinityLabelLeftWidth,
    gridfinityLabelLeftLength: shape.gridfinityLabelLeftLength,
    gridfinityLabelLeftOffset: shape.gridfinityLabelLeftOffset,
    gridfinityLabelRightWidth: shape.gridfinityLabelRightWidth,
    gridfinityLabelRightLength: shape.gridfinityLabelRightLength,
    gridfinityLabelRightOffset: shape.gridfinityLabelRightOffset,
    gridfinityLabelCorner: shape.gridfinityLabelCorner,
    gridfinityLabelCornerSize: shape.gridfinityLabelCornerSize,
    gridfinityScoopBack: shape.gridfinityScoopBack,
    gridfinityScoopFront: shape.gridfinityScoopFront,
    gridfinityScoopLeft: shape.gridfinityScoopLeft,
    gridfinityScoopRight: shape.gridfinityScoopRight,
    gridfinityScoopRadius: shape.gridfinityScoopRadius,
    gridfinityFloorHeight: shape.gridfinityFloorHeight,
    gridfinityOpenBack: shape.gridfinityOpenBack,
    gridfinityOpenFront: shape.gridfinityOpenFront,
    gridfinityOpenLeft: shape.gridfinityOpenLeft,
    gridfinityOpenRight: shape.gridfinityOpenRight,
    gridfinityLipChamfer: shape.gridfinityLipChamfer,
    gridfinityWallThickness: shape.gridfinityWallThickness,
    gridfinityPaddingBack: shape.gridfinityPaddingBack,
    gridfinityPaddingFront: shape.gridfinityPaddingFront,
    gridfinityPaddingLeft: shape.gridfinityPaddingLeft,
    gridfinityPaddingRight: shape.gridfinityPaddingRight,
    gridfinityCornerRadius: shape.gridfinityCornerRadius,
    gridfinityBinCornerRadius: shape.gridfinityBinCornerRadius,
    gridfinityCompartmentsX: shape.gridfinityCompartmentsX,
    gridfinityCompartmentsZ: shape.gridfinityCompartmentsZ,
    gridfinityDividerThickness: shape.gridfinityDividerThickness,
    gridfinityDividerPositionsX: shape.gridfinityDividerPositionsX,
    gridfinityDividerPositionsZ: shape.gridfinityDividerPositionsZ,
    gridfinityCompartmentLabels: shape.gridfinityCompartmentLabels,
    gridfinityOpenings: shape.gridfinityOpenings,
    gridfinityOpeningCorner: shape.gridfinityOpeningCorner,
    gridfinityOpeningCornerSize: shape.gridfinityOpeningCornerSize,
    knurlPattern: shape.knurlPattern,
    knurlCount: shape.knurlCount,
    knurlDepth: shape.knurlDepth,
    knurlAngle: shape.knurlAngle,
    knurlChamfer: shape.knurlChamfer,
    dovetailNeckWidth: shape.dovetailNeckWidth,
    dovetailClearance: shape.dovetailClearance,
    loftBottomOutline: shape.loftBottomOutline,
    loftTopOutline: shape.loftTopOutline,
    loftBottomWidth: shape.loftBottomWidth,
    loftBottomDepth: shape.loftBottomDepth,
    loftTopWidth: shape.loftTopWidth,
    loftTopDepth: shape.loftTopDepth,
    loftBottomCorner: shape.loftBottomCorner,
    loftTopCorner: shape.loftTopCorner,
    loftBottomSides: shape.loftBottomSides,
    loftTopSides: shape.loftTopSides,
    loftOffsetX: shape.loftOffsetX,
    loftOffsetZ: shape.loftOffsetZ,
    loftWall: shape.loftWall,
    loftTwist: shape.loftTwist,
    loftSmooth: shape.loftSmooth,
    loftSegments: shape.loftSegments,
    slotEndRatio: shape.slotEndRatio,
    torusTubeRatio: shape.torusTubeRatio,
    loftTiltX: shape.loftTiltX,
    loftTiltZ: shape.loftTiltZ,
    screwHoleShaft: shape.screwHoleShaft,
    screwHoleHeadDepth: shape.screwHoleHeadDepth,
    screwHoleAngle: shape.screwHoleAngle,
    cornerFillet: shape.cornerFillet,
    topBottomFillet: shape.topBottomFillet,
    roundedBoxQuality: shape.roundedBoxQuality,
    bentTubeProfile: shape.bentTubeProfile,
    bentTubeInnerProfile: shape.bentTubeInnerProfile,
    bentTubeSize: shape.bentTubeSize,
    bentTubeWall: shape.bentTubeWall,
    bentTubeQuality: shape.bentTubeQuality,
    bentTubeSegments: shape.bentTubeSegments,
    text: shape.text,
    font: shape.font,
    textCurved: shape.textCurved,
    textRadius: shape.textRadius,
    textSize: shape.textSize,
    textInward: shape.textInward,
    textFlipped: shape.textFlipped,
    cylinderWrap: shape.cylinderWrap,
    surfaceTexture: shape.surfaceTexture,
    surfaceTextureMask: shape.surfaceTextureMask,
    surfaceFillOf: shape.surfaceFillOf,
    vase: shape.vase,
    vasePartOf: shape.vasePartOf,
    importedMesh: shape.importedMesh,
    imagePlate: shape.imagePlate,
    sketchProfile: shape.sketchProfile,
    sketchOperation: shape.sketchOperation,
    sketchRevolve: shape.sketchRevolve,
    groupedShapes: shape.groupedShapes,
    groupedBaseWidth: shape.groupedBaseWidth,
    groupedBaseDepth: shape.groupedBaseDepth,
    groupedBaseHeight: shape.groupedBaseHeight,
    groupOperation: shape.groupOperation,
    locked: shape.locked ?? false,
    hidden: shape.hidden ?? false,
  });
}

/**
 * A shape read back from a clipboard. `sceneShape` fills the defaults, but it names only the fields
 * it knows, so on its own it dropped everything else a copy carries: see-through, edge treatments,
 * mirroring, a text's stroke and spacing, the exact CAD body. Within one design the tab kept the
 * copy and nothing showed; pasted into another design all of it was gone (#642). The fields of
 * the copy now go on top of the defaults. Anything without a name, kind and colour is not a shape.
 */
export function clipboardShape(entry: unknown): WorkplaneShape | null {
  if (!entry || typeof entry !== "object") return null;
  const shape = entry as Partial<WorkplaneShape>;
  const { name, kind, color } = shape;
  if (typeof name !== "string" || typeof kind !== "string" || typeof color !== "string") return null;
  return canonicalizeShape({ ...sceneShape({ ...shape, name, kind, color }), ...shape, name, kind, color });
}

export function makeShapeFromAsset(
  asset: ShapeAsset,
  point?: { x: number; z: number; elevation?: number },
  customization: ShapeCustomization = {},
): WorkplaneShape {
  const defaults = shapeAssetDefaultDimensions(asset.kind);
  // Ein Gewinde bekommt seinen Platzbedarf aus Durchmesser und Art. Eine
  // eingetragene Breite waere hier nicht nur ueberfluessig, sondern falsch:
  // sie wuerde spaeter als Zug am Anfasser gelesen und den Durchmesser
  // verstellen.
  const threadDefaults = asset.kind === "thread" ? threadSettings({
    threadRole: customization.threadRole,
    threadHead: customization.threadHead,
    threadHand: customization.threadHand,
    threadProfile: customization.threadProfile,
    threadDiameter: customization.threadDiameter,
    threadPitch: customization.threadPitch,
    threadClearance: customization.threadClearance,
    threadBoltClearance: customization.threadBoltClearance,
    threadAxialClearance: customization.threadAxialClearance,
    threadDepth: customization.threadDepth,
    threadFlankAngle: customization.threadFlankAngle,
    threadQuality: customization.threadQuality,
    // Diese drei fehlten hier: die Bruecke und die Formvorgaben boten sie an,
    // angekommen ist beim Anlegen aber immer nur das Normmass.
    threadHeadHeight: customization.threadHeadHeight,
    threadChamfer: customization.threadChamfer,
    threadChamferBottom: customization.threadChamferBottom,
    threadHeadChamfer: customization.threadHeadChamfer,
  }) : null;
  const threadFootprint = threadDefaults ? threadNaturalFootprint(threadDefaults) : null;
  // Ein gebogenes Rohr bekommt seinen Rahmen aus Profil und Segmenten. Ein
  // vorgegebenes Mass wuerde es nur verzerren.
  const bentTube = asset.kind === "bentTube" ? normalizedBentTubeFields({
    bentTubeProfile: customization.bentTubeProfile,
    bentTubeInnerProfile: customization.bentTubeInnerProfile,
    bentTubeSize: customization.bentTubeSize,
    bentTubeWall: customization.bentTubeWall,
    bentTubeQuality: customization.bentTubeQuality,
  }) : null;
  const bentTubeFootprint = bentTube ? bentTubeNaturalDimensions(bentTube) : null;
  // A transition's frame is what its two ends need together (#188).
  const loftMeasures = asset.kind === "loft" ? normalizeLoftMeasures({
    ...DEFAULT_LOFT,
    bottomOutline: customization.loftBottomOutline,
    topOutline: customization.loftTopOutline,
    bottomWidth: customization.loftBottomWidth,
    bottomDepth: customization.loftBottomDepth,
    topWidth: customization.loftTopWidth,
    topDepth: customization.loftTopDepth,
    bottomCorner: customization.loftBottomCorner,
    topCorner: customization.loftTopCorner,
    bottomSides: customization.loftBottomSides,
    topSides: customization.loftTopSides,
    offsetX: customization.loftOffsetX,
    offsetZ: customization.loftOffsetZ,
    wall: customization.loftWall,
    twist: customization.loftTwist,
    smooth: customization.loftSmooth,
    segments: customization.loftSegments,
    tiltX: customization.loftTiltX,
    tiltZ: customization.loftTiltZ,
  }) : null;
  const loftFootprint = loftMeasures ? loftFrameSize(loftMeasures) : null;
  // A Gridfinity bin or baseplate is whole grid units: an asked-for size is rounded to them.
  // A baseplate's padding without an asked-for size is added to the default one, so it keeps its units (#455).
  const gridfinityPaddingFields = {
    gridfinityType: customization.gridfinityType,
    gridfinityPaddingBack: customization.gridfinityPaddingBack,
    gridfinityPaddingFront: customization.gridfinityPaddingFront,
    gridfinityPaddingLeft: customization.gridfinityPaddingLeft,
    gridfinityPaddingRight: customization.gridfinityPaddingRight,
  };
  const gridfinityPaddingSize = gridfinityPadding(gridfinityPaddingFields);
  // A new tray (#837) has a tray's size, not the bin's.
  const gridfinityDefaults = normalizeGridfinityType(customization.gridfinityType) === "tray" ? DEFAULT_GRIDFINITY_TRAY_SIZE : defaults;
  const gridfinityFootprint = asset.kind === "gridfinity" ? gridfinityFootprintPatch({
    width: customization.width ?? gridfinityDefaults.width + gridfinityPaddingSize.left + gridfinityPaddingSize.right,
    depth: customization.depth ?? gridfinityDefaults.depth + gridfinityPaddingSize.back + gridfinityPaddingSize.front,
    height: customization.height ?? gridfinityDefaults.height,
    gridfinityLip: customization.gridfinityLip,
    gridfinityHalfGrid: customization.gridfinityHalfGrid,
    ...gridfinityPaddingFields,
  }) : null;
  // New gears get involute teeth (#201); their size follows the module, so other teeth keep module 2.
  const gearType = asset.kind === "gear" ? normalizeGearType(customization.gearType ?? DEFAULT_GEAR_TYPE) : undefined;
  const gearRim = asset.kind === "gear" ? normalizeGearRim(customization.gearRim ?? DEFAULT_GEAR_RIM) : undefined;
  // A ring gear and a rack (#201) have no straight teeth: "simple" counts as involute there.
  const gearProfile = asset.kind === "gear" ? gearToothProfile({ gearType, gearProfile: customization.gearProfile ?? "involute" }) : undefined;
  // Its size follows module 2 and the teeth unless a width was asked for; a new rack keeps a 3 mm bar behind its teeth.
  const gearSize = asset.kind === "gear" && gearUsesModule(gearProfile) && customization.width === undefined
    ? gearSizeForModule(DEFAULT_GEAR_MODULE, {
      gearType,
      gearProfile,
      gearRim,
      teeth: customization.teeth ?? DEFAULT_GEAR_TEETH,
      width: 0,
      depth: gearType === "rack" ? customization.depth ?? rackToothHeight(DEFAULT_GEAR_MODULE, gearProfile) + DEFAULT_GEAR_RIM : 0,
    })
    : null;
  const width = gearSize?.width ?? gridfinityFootprint?.width ?? loftFootprint?.width ?? bentTubeFootprint?.width ?? threadFootprint?.width ?? customization.width ?? defaults.width;
  // A cylinder is always circular - depth follows width here too, so it never
  // snaps between insert and first render (canonicalizeShape enforces this
  // again afterwards as the actual safety net).
  const depth = asset.kind === "cylinder" ? width : gearSize?.depth ?? gridfinityFootprint?.depth ?? loftFootprint?.depth ?? bentTubeFootprint?.depth ?? threadFootprint?.depth ?? customization.depth ?? defaults.depth;
  const height = gridfinityFootprint?.height ?? bentTubeFootprint?.height ?? customization.height ?? (threadDefaults ? threadNaturalHeight(threadDefaults) : defaults.height);
  const size = Math.max(width, depth);
  const gearTeeth = asset.kind === "gear" ? normalizeGearTeeth(customization.teeth ?? DEFAULT_GEAR_TEETH) : undefined;
  const gearToothSize = asset.kind === "gear" ? normalizeGearToothSize(customization.toothSize ?? DEFAULT_GEAR_TOOTH_SIZE, width, depth) : undefined;
  const threadDiameter = asset.kind === "thread" ? normalizeThreadDiameter(customization.threadDiameter ?? DEFAULT_THREAD_DIAMETER) : undefined;

  return {
    id: createLocalId(asset.id),
    name: asset.name,
    kind: asset.kind,
    color: shapeAssetColor(asset, customization),
    hole: asset.hole,
    x: point?.x ?? 0,
    z: point?.z ?? 0,
    elevation: point?.elevation ?? 0,
    size,
    width,
    depth,
    height,
    rotation: 0,
    rotationX: 0,
    rotationZ: 0,
    radius: asset.kind === "box" ? 0 : undefined,
    text: asset.kind === "text" ? customization.text ?? "TEXT" : undefined,
    font: asset.kind === "text" ? customization.font ?? "Sans" : undefined,
    // Curved text brings its circle along; the caller lays out the box with
    // curvedTextPatch once the shape exists.
    textCurved: asset.kind === "text" ? customization.textCurved : undefined,
    textRadius: asset.kind === "text" ? customization.textRadius : undefined,
    textSize: asset.kind === "text" ? customization.textSize : undefined,
    textInward: asset.kind === "text" ? customization.textInward : undefined,
    textFlipped: asset.kind === "text" ? customization.textFlipped : undefined,
    steps: asset.kind === "box" ? 10 : asset.kind === "sphere" ? customization.steps ?? 24 : asset.kind === "halfSphere" || asset.kind === "paraboloid" ? customization.steps ?? 32 : asset.kind === "torus" ? customization.steps : undefined,
    torusTubeRatio: asset.kind === "torus" ? customization.torusTubeRatio ?? torusTubeRatio({ width, depth, height }) : undefined,
    sides: asset.kind === "cylinder" || asset.kind === "ellipse" || asset.kind === "slot" || asset.kind === "cone" || asset.kind === "tube" || asset.kind === "ring" || asset.kind === "counterbore" || asset.kind === "countersink" || asset.kind === "teardrop" || asset.kind === "torus" ? customization.sides : asset.kind === "roundRoof" ? customization.sides ?? 64 : asset.kind === "pyramid" ? customization.sides ?? 4 : asset.kind === "polygon" ? customization.sides ?? 6 : undefined,
    bevel: asset.kind === "cylinder" || asset.kind === "ellipse" || asset.kind === "slot" ? 0 : asset.kind === "tube" || asset.kind === "ring" ? customization.bevel ?? 4 : asset.kind === "text" ? customization.bevel : undefined,
    segments: asset.kind === "cylinder" || asset.kind === "ellipse" || asset.kind === "slot" ? 1 : asset.kind === "text" ? customization.segments : undefined,
    topRadius: asset.kind === "cone" ? customization.topRadius ?? 0 : undefined,
    baseRadius: asset.kind === "cone" ? customization.baseRadius ?? width / 2 : undefined,
    topWidth: asset.kind === "pyramid" ? normalizePyramidTop(customization.topWidth, width) : undefined,
    topDepth: asset.kind === "pyramid" ? normalizePyramidTop(customization.topDepth, depth) : undefined,
    teeth: gearTeeth,
    toothSize: gearToothSize,
    toothWidth: asset.kind === "gear" && customization.toothWidth !== undefined
      ? normalizeGearToothWidth(customization.toothWidth, width, depth, gearTeeth)
      : undefined,
    centerHoleSize: asset.kind === "gear" ? normalizeGearCenterHoleSize(customization.centerHoleSize ?? DEFAULT_GEAR_CENTER_HOLE_SIZE, width, depth, gearToothSize, { teeth: gearTeeth, gearProfile }) : undefined,
    gearType,
    gearRim,
    helixAngle: asset.kind === "gear" ? normalizeGearHelixAngle(customization.helixAngle ?? DEFAULT_GEAR_HELIX_ANGLE) : undefined,
    helixQuality: asset.kind === "gear" ? normalizeGearHelixQuality(customization.helixQuality ?? DEFAULT_GEAR_HELIX_QUALITY) : undefined,
    gearProfile,
    gearPressureAngle: gearProfile === "involute" ? normalizeGearPressureAngle(customization.gearPressureAngle) : undefined,
    gearBacklash: gearUsesModule(gearProfile) ? Math.max(0, Math.min(MAX_GEAR_BACKLASH, customization.gearBacklash ?? DEFAULT_GEAR_BACKLASH)) : undefined,
    threadRole: asset.kind === "thread" ? normalizeThreadRole(customization.threadRole ?? DEFAULT_THREAD_ROLE) : undefined,
    threadHead: asset.kind === "thread" ? normalizeThreadHead(customization.threadHead ?? DEFAULT_THREAD_HEAD) : undefined,
    threadHand: asset.kind === "thread" ? normalizeThreadHand(customization.threadHand ?? DEFAULT_THREAD_HAND) : undefined,
    threadProfile: asset.kind === "thread" ? normalizeThreadProfile(customization.threadProfile ?? DEFAULT_THREAD_PROFILE) : undefined,
    threadDiameter: threadDiameter,
    threadPitch: asset.kind === "thread" ? normalizeThreadPitch(customization.threadPitch ?? DEFAULT_THREAD_PITCH, threadDiameter ?? DEFAULT_THREAD_DIAMETER) : undefined,
    threadClearance: asset.kind === "thread" ? normalizeThreadClearance(customization.threadClearance ?? DEFAULT_THREAD_CLEARANCE) : undefined,
    threadBoltClearance: asset.kind === "thread" ? normalizeThreadBoltClearance(customization.threadBoltClearance ?? DEFAULT_THREAD_BOLT_CLEARANCE) : undefined,
    threadAxialClearance: asset.kind === "thread" ? normalizeThreadAxialClearance(customization.threadAxialClearance ?? DEFAULT_THREAD_AXIAL_CLEARANCE, normalizeThreadPitch(customization.threadPitch ?? DEFAULT_THREAD_PITCH, threadDiameter ?? DEFAULT_THREAD_DIAMETER)) : undefined,
    threadDepth: asset.kind === "thread" ? customization.threadDepth : undefined,
    threadFlankAngle: asset.kind === "thread" ? customization.threadFlankAngle : undefined,
    threadQuality: asset.kind === "thread" ? normalizeThreadQuality(customization.threadQuality ?? DEFAULT_THREAD_QUALITY) : undefined,
    threadHeadHeight: threadDefaults ? threadDefaults.headHeight : undefined,
    threadChamfer: threadDefaults ? threadDefaults.chamfer : undefined,
    threadChamferBottom: threadDefaults && customization.threadChamferBottom !== undefined ? threadDefaults.chamferLow : undefined,
    threadHeadChamfer: threadDefaults ? threadDefaults.headChamfer : undefined,
    springTurns: asset.kind === "spring" ? normalizeSpringTurns(customization.springTurns ?? DEFAULT_SPRING_TURNS, Math.max(width, depth), height, customization.springWire) : undefined,
    springWire: asset.kind === "spring" ? normalizeSpringWire(customization.springWire ?? DEFAULT_SPRING_WIRE, Math.max(width, depth), height) : undefined,
    springQuality: asset.kind === "spring" ? normalizeSpringQuality(customization.springQuality ?? DEFAULT_SPRING_QUALITY) : undefined,
    springHand: asset.kind === "spring" ? normalizeSpringHand(customization.springHand ?? DEFAULT_SPRING_HAND) : undefined,
    starPoints: asset.kind === "star" ? normalizeStarPoints(customization.starPoints ?? DEFAULT_STAR_POINTS) : undefined,
    starInnerSize: asset.kind === "star" ? normalizeStarInnerSize(customization.starInnerSize ?? DEFAULT_STAR_INNER_SIZE, width) : undefined,
    starOuterFillet: asset.kind === "star" ? normalizeStarFillet(customization.starOuterFillet ?? DEFAULT_STAR_OUTER_FILLET) : undefined,
    starInnerFillet: asset.kind === "star" ? normalizeStarFillet(customization.starInnerFillet ?? DEFAULT_STAR_INNER_FILLET) : undefined,
    starQuality: asset.kind === "star" ? normalizeStarQuality(customization.starQuality ?? DEFAULT_STAR_QUALITY) : undefined,
    heartTipFillet: asset.kind === "heart" ? normalizeHeartTipFillet(customization.heartTipFillet ?? DEFAULT_HEART_TIP_FILLET) : undefined,
    heartQuality: asset.kind === "heart" ? normalizeHeartQuality(customization.heartQuality ?? DEFAULT_HEART_QUALITY) : undefined,
    crescentThickness: asset.kind === "crescent" ? normalizeCrescentThickness(customization.crescentThickness ?? DEFAULT_CRESCENT_THICKNESS, width) : undefined,
    crescentTipFillet: asset.kind === "crescent" ? normalizeCrescentTipFillet(customization.crescentTipFillet ?? DEFAULT_CRESCENT_TIP_FILLET) : undefined,
    crescentQuality: asset.kind === "crescent" ? normalizeCrescentQuality(customization.crescentQuality ?? DEFAULT_CRESCENT_QUALITY) : undefined,
    honeycombCellSize: asset.kind === "honeycomb" ? normalizeHoneycombCellSize(customization.honeycombCellSize ?? DEFAULT_HONEYCOMB_CELL_SIZE) : undefined,
    honeycombWallThickness: asset.kind === "honeycomb" ? normalizeHoneycombWallThickness(customization.honeycombWallThickness ?? DEFAULT_HONEYCOMB_WALL_THICKNESS) : undefined,
    honeycombFrameWidth: asset.kind === "honeycomb" ? normalizeHoneycombFrameWidth(customization.honeycombFrameWidth ?? DEFAULT_HONEYCOMB_FRAME_WIDTH) : undefined,
    gridfinityType: asset.kind === "gridfinity" ? normalizeGridfinityType(customization.gridfinityType) : undefined,
    gridfinityLip: asset.kind === "gridfinity" ? customization.gridfinityLip ?? DEFAULT_GRIDFINITY_LIP : undefined,
    gridfinityMagnets: asset.kind === "gridfinity" ? customization.gridfinityMagnets ?? DEFAULT_GRIDFINITY_MAGNETS : undefined,
    gridfinityHalfGrid: asset.kind === "gridfinity" ? customization.gridfinityHalfGrid : undefined,
    gridfinityLabelBack: asset.kind === "gridfinity" ? customization.gridfinityLabelBack : undefined,
    gridfinityLabelFront: asset.kind === "gridfinity" ? customization.gridfinityLabelFront : undefined,
    gridfinityLabelLeft: asset.kind === "gridfinity" ? customization.gridfinityLabelLeft : undefined,
    gridfinityLabelRight: asset.kind === "gridfinity" ? customization.gridfinityLabelRight : undefined,
    gridfinityLabelBackWidth: asset.kind === "gridfinity" ? customization.gridfinityLabelBackWidth : undefined,
    gridfinityLabelBackLength: asset.kind === "gridfinity" ? customization.gridfinityLabelBackLength : undefined,
    gridfinityLabelBackOffset: asset.kind === "gridfinity" ? customization.gridfinityLabelBackOffset : undefined,
    gridfinityLabelFrontWidth: asset.kind === "gridfinity" ? customization.gridfinityLabelFrontWidth : undefined,
    gridfinityLabelFrontLength: asset.kind === "gridfinity" ? customization.gridfinityLabelFrontLength : undefined,
    gridfinityLabelFrontOffset: asset.kind === "gridfinity" ? customization.gridfinityLabelFrontOffset : undefined,
    gridfinityLabelLeftWidth: asset.kind === "gridfinity" ? customization.gridfinityLabelLeftWidth : undefined,
    gridfinityLabelLeftLength: asset.kind === "gridfinity" ? customization.gridfinityLabelLeftLength : undefined,
    gridfinityLabelLeftOffset: asset.kind === "gridfinity" ? customization.gridfinityLabelLeftOffset : undefined,
    gridfinityLabelRightWidth: asset.kind === "gridfinity" ? customization.gridfinityLabelRightWidth : undefined,
    gridfinityLabelRightLength: asset.kind === "gridfinity" ? customization.gridfinityLabelRightLength : undefined,
    gridfinityLabelRightOffset: asset.kind === "gridfinity" ? customization.gridfinityLabelRightOffset : undefined,
    gridfinityLabelCorner: asset.kind === "gridfinity" ? customization.gridfinityLabelCorner : undefined,
    gridfinityLabelCornerSize: asset.kind === "gridfinity" ? customization.gridfinityLabelCornerSize : undefined,
    gridfinityScoopBack: asset.kind === "gridfinity" ? customization.gridfinityScoopBack : undefined,
    gridfinityScoopFront: asset.kind === "gridfinity" ? customization.gridfinityScoopFront : undefined,
    gridfinityScoopLeft: asset.kind === "gridfinity" ? customization.gridfinityScoopLeft : undefined,
    gridfinityScoopRight: asset.kind === "gridfinity" ? customization.gridfinityScoopRight : undefined,
    gridfinityScoopRadius: asset.kind === "gridfinity" ? customization.gridfinityScoopRadius : undefined,
    gridfinityFloorHeight: asset.kind === "gridfinity" ? customization.gridfinityFloorHeight : undefined,
    gridfinityOpenBack: asset.kind === "gridfinity" ? customization.gridfinityOpenBack : undefined,
    gridfinityOpenFront: asset.kind === "gridfinity" ? customization.gridfinityOpenFront : undefined,
    gridfinityOpenLeft: asset.kind === "gridfinity" ? customization.gridfinityOpenLeft : undefined,
    gridfinityOpenRight: asset.kind === "gridfinity" ? customization.gridfinityOpenRight : undefined,
    gridfinityLipChamfer: asset.kind === "gridfinity" ? customization.gridfinityLipChamfer : undefined,
    gridfinityWallThickness: asset.kind === "gridfinity" ? customization.gridfinityWallThickness : undefined,
    gridfinityOpeningCorner: asset.kind === "gridfinity" ? customization.gridfinityOpeningCorner : undefined,
    gridfinityOpeningCornerSize: asset.kind === "gridfinity" ? customization.gridfinityOpeningCornerSize : undefined,
    gridfinityPaddingBack: asset.kind === "gridfinity" ? customization.gridfinityPaddingBack : undefined,
    gridfinityPaddingFront: asset.kind === "gridfinity" ? customization.gridfinityPaddingFront : undefined,
    gridfinityPaddingLeft: asset.kind === "gridfinity" ? customization.gridfinityPaddingLeft : undefined,
    gridfinityPaddingRight: asset.kind === "gridfinity" ? customization.gridfinityPaddingRight : undefined,
    gridfinityCornerRadius: asset.kind === "gridfinity" ? customization.gridfinityCornerRadius : undefined,
    gridfinityBinCornerRadius: asset.kind === "gridfinity" ? customization.gridfinityBinCornerRadius : undefined,
    gridfinityCompartmentsX: asset.kind === "gridfinity" ? customization.gridfinityCompartmentsX : undefined,
    gridfinityCompartmentsZ: asset.kind === "gridfinity" ? customization.gridfinityCompartmentsZ : undefined,
    gridfinityDividerThickness: asset.kind === "gridfinity" ? customization.gridfinityDividerThickness : undefined,
    hingeClearance: asset.kind === "hinge" ? normalizeHingeClearance(customization.hingeClearance ?? DEFAULT_HINGE_CLEARANCE) : undefined,
    hingePinless: asset.kind === "hinge" ? customization.hingePinless === true : undefined,
    hingeKnuckleWidth: asset.kind === "hinge" ? normalizeHingeKnuckleWidth(customization.hingeKnuckleWidth) : undefined,
    hingeStyle: asset.kind === "hinge" && (customization.hingeStyle === "cone" || customization.hingeStyle === "pinless" || customization.hingeStyle === "liftOff") ? customization.hingeStyle : undefined,
    hingeConeSize: asset.kind === "hinge" && customization.hingeStyle === "cone" && Number.isFinite(customization.hingeConeSize) ? customization.hingeConeSize : undefined,
    // Screw holes and round corners only when the defaults ask for them; the geometry fits them to the leaf.
    hingeScrewHoles: asset.kind === "hinge" && normalizeHingeScrewHoles(customization.hingeScrewHoles) > 0 ? normalizeHingeScrewHoles(customization.hingeScrewHoles) : undefined,
    hingeScrewDiameter: asset.kind === "hinge" && Number.isFinite(customization.hingeScrewDiameter) ? normalizeHingeScrewDiameter(customization.hingeScrewDiameter) : undefined,
    hingeScrewSpacing: asset.kind === "hinge" && (customization.hingeScrewSpacing ?? 0) > 0 ? customization.hingeScrewSpacing : undefined,
    hingeScrewAcross: asset.kind === "hinge" && (customization.hingeScrewAcross ?? 0) > 0 ? customization.hingeScrewAcross : undefined,
    hingeScrewCountersink: asset.kind === "hinge" && customization.hingeScrewCountersink === false ? false : undefined,
    hingeCornerRadius: asset.kind === "hinge" && (customization.hingeCornerRadius ?? 0) > 0 ? customization.hingeCornerRadius : undefined,
    hingeLeafStyle: asset.kind === "hinge" && customization.hingeLeafStyle === "fingers" ? "fingers" : undefined,
    hingeScrewHead: asset.kind === "hinge" && customization.hingeScrewHead && customization.hingeScrewHead !== "countersunk" ? customization.hingeScrewHead : undefined,
    hingeNutWidth: asset.kind === "hinge" && (customization.hingeNutWidth ?? 0) > 0 ? customization.hingeNutWidth : undefined,
    hingeKnuckles: asset.kind === "hinge" ? normalizeHingeKnuckles(customization.hingeKnuckles ?? DEFAULT_HINGE_KNUCKLES, width, normalizeHingeClearance(customization.hingeClearance)) : undefined,
    hingePinDiameter: asset.kind === "hinge" ? normalizeHingePinDiameter(customization.hingePinDiameter ?? DEFAULT_HINGE_PIN_DIAMETER, height, normalizeHingeClearance(customization.hingeClearance)) : undefined,
    hingeLeafThickness: asset.kind === "hinge"
      ? normalizeHingeLeafThickness(
          customization.hingeLeafThickness ?? DEFAULT_HINGE_LEAF_THICKNESS,
          height,
          normalizeHingePinDiameter(customization.hingePinDiameter ?? DEFAULT_HINGE_PIN_DIAMETER, height, normalizeHingeClearance(customization.hingeClearance)),
          normalizeHingeClearance(customization.hingeClearance),
          customization.hingeStyle === "cone" ? "cone" : "pin",
        )
      : undefined,
    knurlPattern: asset.kind === "knurl" ? normalizeKnurlPattern(customization.knurlPattern ?? DEFAULT_KNURL_PATTERN) : undefined,
    knurlCount: asset.kind === "knurl" ? normalizeKnurlCount(customization.knurlCount ?? DEFAULT_KNURL_COUNT, width) : undefined,
    knurlDepth: asset.kind === "knurl" ? normalizeKnurlDepth(customization.knurlDepth ?? DEFAULT_KNURL_DEPTH, width) : undefined,
    knurlAngle: asset.kind === "knurl" ? normalizeKnurlAngle(customization.knurlAngle ?? DEFAULT_KNURL_ANGLE) : undefined,
    knurlChamfer: asset.kind === "knurl" ? normalizeKnurlChamfer(customization.knurlChamfer ?? DEFAULT_KNURL_CHAMFER, width, height) : undefined,
    vase: asset.kind === "vase" ? normalizeVaseSettings(undefined) : undefined,
    dovetailNeckWidth: asset.kind === "dovetail" ? normalizeDovetailNeckWidth(customization.dovetailNeckWidth, width) : undefined,
    dovetailClearance: asset.kind === "dovetail" ? normalizeDovetailClearance(customization.dovetailClearance ?? DEFAULT_DOVETAIL_CLEARANCE) : undefined,
    screwHoleShaft: asset.kind === "counterbore" || asset.kind === "countersink" || asset.kind === "doubleCountersink" ? normalizeScrewHoleShaft(customization.screwHoleShaft ?? DEFAULT_SCREW_HOLE_SHAFT, width) : undefined,
    screwHoleHeadDepth: asset.kind === "counterbore" ? normalizeScrewHoleHeadDepth(customization.screwHoleHeadDepth ?? DEFAULT_SCREW_HOLE_HEAD_DEPTH, height) : undefined,
    screwHoleAngle: asset.kind === "countersink" || asset.kind === "doubleCountersink" ? normalizeScrewHoleAngle(customization.screwHoleAngle ?? DEFAULT_SCREW_HOLE_ANGLE) : undefined,
    cornerFillet: asset.kind === "roundedBox" ? normalizeCornerFillet(customization.cornerFillet ?? DEFAULT_ROUNDED_BOX_CORNER_FILLET, Math.min(width, depth) / 2) : undefined,
    topBottomFillet: asset.kind === "roundedBox" ? normalizeTopBottomFillet(customization.topBottomFillet ?? DEFAULT_ROUNDED_BOX_TOP_BOTTOM_FILLET, height / 2) : undefined,
    roundedBoxQuality: asset.kind === "roundedBox" ? normalizeRoundedBoxQuality(customization.roundedBoxQuality ?? DEFAULT_ROUNDED_BOX_QUALITY) : undefined,
    ...(bentTube ?? {}),
    ...(loftMeasures ? loftFieldsFromMeasures(loftMeasures) : {}),
    locked: false,
    hidden: false,
  };
}

/**
 * The palette's wording for an asset. The catalogue keeps the English name as
 * the stable identity used by tests and by projects saved before translation;
 * this is what a person reads, and what a new object is named after.
 */
export function shapeAssetLabel(asset: Pick<ShapeAsset, "id" | "name">): string {
  const key = SHAPE_LABEL_KEYS[asset.id];
  return key ? t(key) : asset.name;
}

/** Names the editor itself hands out in English - a sketch, a group, anything made through MCP. */
const GENERATED_NAME_KEYS: Record<string, MessageKey> = {
  Group: "shape.group",
  Bundle: "shape.bundle",
  Intersection: "shape.intersection",
  Hull: "editor.tool.hull",
  "Sketch extrusion": "shape.sketchExtrusion",
  "Sketch revolve": "shape.sketchRevolve",
  Cube: "shape.box",
  "Icon tag": "shape.iconTag",
  "QR code": "shape.qrCode",
  "QR plate": "shape.qrPlate",
};

/**
 * The name a person reads. A name somebody typed is theirs and stays as it
 * is; one of the English names the editor hands out itself ("Box", "Group",
 * "Sketch extrusion") is shown in the interface language. The stored name
 * does not change, so switching the language switches these names along.
 */
export function displayShapeName(shape: Pick<WorkplaneShape, "name" | "kind">): string {
  const name = shape.name?.trim() ?? "";
  const generated = GENERATED_NAME_KEYS[name];
  if (generated) return t(generated);
  const asset = toolbarShapeAssets.find((entry) => entry.kind === shape.kind && entry.name === name);
  if (asset) return shapeAssetLabel(asset);
  return name || shapeAssetLabel({ id: shape.kind, name: shape.kind });
}

/** Whether the shape carries a name somebody gave it, not one the editor handed out ("Box", "Group"). */
export function hasOwnShapeName(shape: Pick<WorkplaneShape, "name" | "kind">): boolean {
  const name = shape.name?.trim() ?? "";
  if (!name || GENERATED_NAME_KEYS[name]) return false;
  return !toolbarShapeAssets.some((entry) => entry.kind === shape.kind && (entry.name === name || shapeAssetLabel(entry) === name));
}

/**
 * The name to store after somebody edited the shown name, or undefined when
 * nothing changed. The draft starts as the shown (possibly translated) name,
 * so confirming it untouched must not pin "Quader" onto a shape stored as
 * "Box". An emptied field stores "", which shows the default name again.
 */
export function renamedShapeName(shape: Pick<WorkplaneShape, "name" | "kind">, draft: string): string | undefined {
  const trimmed = draft.trim();
  return trimmed === displayShapeName(shape) ? undefined : trimmed;
}

/**
 * Die Zeile im Formenmenue darf mehr sagen als der Name des Objekts. Hinter
 * "Gewinde" stecken auch Schrauben und Muttern, und wer die sucht, soll den
 * Eintrag finden - benannt wird ein neues Objekt trotzdem nur "Gewinde".
 */
const SHAPE_MENU_LABEL_KEYS: Record<string, MessageKey> = {
  thread: "shape.threadMenu",
};

export function shapeAssetMenuLabel(asset: Pick<ShapeAsset, "id" | "name">): string {
  const key = SHAPE_MENU_LABEL_KEYS[asset.id];
  return key ? t(key) : shapeAssetLabel(asset);
}
