import { createLocalId } from "@/lib/localIds";
import { fieldFormulasEqual } from "@/lib/fieldFormulas";
import { threadFootprintPatch } from "@/lib/threadGeometry";
import { MCP_SHAPE_SETTING_KEYS } from "@/lib/mcpShapeSettings";
import { bentTubeSegmentsEqual } from "@/lib/bentTubeGeometry";
import type { SketchStroke, WorkplaneShape } from "@/types/layerling";

/** Aendert dieser Patch einen Bauwert des Koerpers - oder nur seinen Rahmen? */
export function patchTouchesBodyParameters(patch: Partial<WorkplaneShape>) {
  return (
    MCP_SHAPE_SETTING_KEYS.some((key) => key in patch) ||
    "width" in patch ||
    "depth" in patch ||
    "height" in patch ||
    "size" in patch ||
    "radius" in patch
  );
}

export function normalizeDegrees(value: number) {
  return ((value % 360) + 360) % 360;
}

export function cleanRotationDegrees(value: number, precision = 1) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  const normalized = normalizeDegrees(value);
  const rounded = Number(normalized.toFixed(precision));
  const zeroThreshold = precision <= 1 ? 0.5 : 0.05;
  if (rounded < zeroThreshold || rounded >= 360 - zeroThreshold || Object.is(rounded, -0)) {
    return 0;
  }
  return rounded;
}

export function cleanNearZero(value: number, epsilon = 0.005) {
  return Math.abs(value) < epsilon ? 0 : value;
}

export function shapeTransformShouldRemainEditable(_shape: WorkplaneShape) {
  return true;
}

/**
 * Der Koerper, wie er vor dem Drehen war - fuer die Eigenschaften.
 *
 * Eine Drehung backt ihn in ein Netz, damit sein Rahmen ehrlich neu aufgesetzt
 * werden kann; seine Bauwerte bleiben dabei stehen, nur Art und Masse werden
 * ueberschrieben. Beides setzt `parametricSource` wieder zusammen, sodass der
 * Inspektor weiter Durchmesser und Steigung zeigt statt Breite und Tiefe eines
 * Netzes. Geaendert wird ueber denselben Weg: der Editor baut den Koerper neu
 * und dreht ihn wieder.
 */
export function shapeWithParametricSource(shape: WorkplaneShape): WorkplaneShape {
  const source = shape.parametricSource;
  if (!source) return shape;
  return {
    ...shape,
    kind: source.kind,
    width: source.width,
    depth: source.depth,
    height: source.height,
    size: source.size,
    taperTopWidth: source.taperTopWidth,
    taperTopDepth: source.taperTopDepth,
    taperBottomWidth: source.taperBottomWidth,
    taperBottomDepth: source.taperBottomDepth,
    extrudeTwist: source.extrudeTwist,
    extrudeTopOffsetX: source.extrudeTopOffsetX,
    extrudeTopOffsetZ: source.extrudeTopOffsetZ,
  };
}

export function cloneWorkplaneShapeTreeWithFreshIds(shape: WorkplaneShape, suffix: string): WorkplaneShape {
  return {
    ...shape,
    id: createLocalId(`${shape.id}-${suffix}`),
    groupedShapes: shape.groupedShapes?.map((child) => cloneWorkplaneShapeTreeWithFreshIds(child, suffix)),
  };
}

export function shapeWidth(shape: WorkplaneShape) {
  return shape.width ?? shape.size;
}

export function shapeDepth(shape: WorkplaneShape) {
  return shape.depth ?? shape.size;
}

export function normalizeTaperScale(value?: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(3, Math.max(0.05, value as number));
}

/** Kleinstes Mass, das eine verjuengte Kante annehmen darf. */
const MIN_TAPER_DIMENSION = 0.01;

function positiveTaperDimension(value: number | undefined, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(MIN_TAPER_DIMENSION, value as number);
}

export function shapeTaperDimensions(shape: WorkplaneShape) {
  const width = shapeWidth(shape);
  const depth = shapeDepth(shape);
  return {
    topWidth: positiveTaperDimension(shape.taperTopWidth, width * normalizeTaperScale(shape.taperTopScale)),
    topDepth: positiveTaperDimension(shape.taperTopDepth, depth * normalizeTaperScale(shape.taperTopScale)),
    bottomWidth: positiveTaperDimension(shape.taperBottomWidth, width * normalizeTaperScale(shape.taperBottomScale)),
    bottomDepth: positiveTaperDimension(shape.taperBottomDepth, depth * normalizeTaperScale(shape.taperBottomScale)),
  };
}

/**
 * Arten, die eine Verjuengung ueberhaupt annehmen. Zahnrad, Gewinde, Feder und
 * Raendel kennen sie gar nicht, die Pyramide hat mit Laenge und Breite oben ihre
 * eigene, die wirklich greift, und Scharnier, Senkungen, gebogenes Rohr und
 * Lineal haben feste Masse, die eine Verjuengung nur verdurbe. Der Tropfen ist
 * der Querschnitt eines waagerechten Lochs; oben und unten gibt es fuer ihn
 * nicht. Seit #111 nehmen Kapsel, abgerundeter Quader, Stern, Herz, Halbmond,
 * Wabe und Schwalbenschwanz sie an. Die Liste steht hier, damit das Merkmalsfeld, die
 * Vorschau und die MCP-Bruecke nicht je ihre eigene fuehren.
 */
const SHAPES_WITHOUT_TAPER = new Set<WorkplaneShape["kind"]>(["gear", "thread", "spring", "pyramid", "ruler", "hinge", "knurl", "counterbore", "countersink", "teardrop", "bentTube", "loft"]);

export function shapeSupportsTaper(kind: WorkplaneShape["kind"]) {
  return !SHAPES_WITHOUT_TAPER.has(kind);
}

/**
 * Reine Messwerkzeuge ohne echtes CAD-Volumen - technisch eine `WorkplaneShape`,
 * aber ueberall dort ausgeschlossen, wo ein echter Koerper vorausgesetzt wird
 * (Gruppieren, Verschneiden, Kantenwerkzeug, Ausfuhr). Eine einzige Stelle
 * dafuer, weil das gerade Lineal frueher gleich drei getrennte Erlaubnislisten
 * hatte, die auseinanderliefen - siehe layerling-lineal.md.
 */
export function isNonSolidShapeKind(kind: WorkplaneShape["kind"]) {
  return kind === "ruler";
}

/**
 * Eine Verjuengung setzen, wie es das Merkmalsfeld tut: Wer einen der beiden
 * Werte einer Kante angibt, schreibt auch den anderen fest und loescht den
 * Massstab. Ohne das liefe die Schwester weiter dem Massstab nach statt dem,
 * was gerade gesetzt wurde. Was die Art nicht annimmt, faellt weg.
 */
export function shapeTaperPatch(
  shape: WorkplaneShape,
  requested: { topWidth?: number; topDepth?: number; bottomWidth?: number; bottomDepth?: number },
  maxDimension: number,
): Partial<WorkplaneShape> {
  if (!shapeSupportsTaper(shape.kind)) return {};
  const current = shapeTaperDimensions(shape);
  const fit = (value: number) => Math.min(maxDimension, Math.max(MIN_TAPER_DIMENSION, value));
  const patch: Partial<WorkplaneShape> = {};
  if (requested.topWidth !== undefined || requested.topDepth !== undefined) {
    patch.taperTopWidth = fit(requested.topWidth ?? current.topWidth);
    patch.taperTopDepth = fit(requested.topDepth ?? current.topDepth);
    patch.taperTopScale = undefined;
  }
  if (requested.bottomWidth !== undefined || requested.bottomDepth !== undefined) {
    patch.taperBottomWidth = fit(requested.bottomWidth ?? current.bottomWidth);
    patch.taperBottomDepth = fit(requested.bottomDepth ?? current.bottomDepth);
    patch.taperBottomScale = undefined;
  }
  return patch;
}

export function shapeHasTaper(shape: WorkplaneShape) {
  if (!shapeSupportsTaper(shape.kind)) return false;
  const width = shapeWidth(shape);
  const depth = shapeDepth(shape);
  const taper = shapeTaperDimensions(shape);
  return Math.abs(taper.topWidth - width) > 1e-6 || Math.abs(taper.topDepth - depth) > 1e-6 || Math.abs(taper.bottomWidth - width) > 1e-6 || Math.abs(taper.bottomDepth - depth) > 1e-6;
}

export function shapeOverallFootprintDimensions(shape: WorkplaneShape) {
  if (!shapeHasTaper(shape)) {
    return { width: shapeWidth(shape), depth: shapeDepth(shape) };
  }
  const taper = shapeTaperDimensions(shape);
  return {
    width: Math.max(taper.topWidth, taper.bottomWidth),
    depth: Math.max(taper.topDepth, taper.bottomDepth),
  };
}

export function shapeTaperScaleAt(shape: WorkplaneShape, normalizedHeight: number, axis: "width" | "depth" = "width") {
  if (!shapeSupportsTaper(shape.kind)) return 1;
  const taper = shapeTaperDimensions(shape);
  const base = axis === "width" ? shapeWidth(shape) : shapeDepth(shape);
  const bottom = axis === "width" ? taper.bottomWidth : taper.bottomDepth;
  const top = axis === "width" ? taper.topWidth : taper.topDepth;
  const t = Math.min(1, Math.max(0, Number.isFinite(normalizedHeight) ? normalizedHeight : 0));
  return (bottom + (top - bottom) * t) / Math.max(0.01, base);
}

/**
 * A twisted or leaning extrusion takes the same shapes taper does - a gear's
 * tooth profile, a thread's helix, a spring's coil, a pyramid's own top, and
 * a ruler's printed scale all have their own meaning for "top" that this
 * would fight rather than combine with.
 */
export function shapeSupportsExtrudeDeform(kind: WorkplaneShape["kind"]) {
  return shapeSupportsTaper(kind);
}

export function shapeHasExtrudeDeform(shape: WorkplaneShape) {
  if (!shapeSupportsExtrudeDeform(shape.kind)) return false;
  return Math.abs(shape.extrudeTwist ?? 0) > 1e-6 || Math.abs(shape.extrudeTopOffsetX ?? 0) > 1e-6 || Math.abs(shape.extrudeTopOffsetZ ?? 0) > 1e-6;
}

/** Either deformation needs the same per-vertex rebuild, so callers that only care whether to bother can ask once. */
export function shapeHasShapeDeform(shape: WorkplaneShape) {
  return shapeHasTaper(shape) || shapeHasExtrudeDeform(shape);
}

/**
 * Twist and lean both grow linearly from nothing at the base to their full
 * amount at the top, the same way taper's width and depth do - so a vertex
 * partway up rotates and shifts by that same fraction of the total.
 */
export function shapeExtrudeDeformAt(shape: WorkplaneShape, normalizedHeight: number) {
  const t = Math.min(1, Math.max(0, Number.isFinite(normalizedHeight) ? normalizedHeight : 0));
  return {
    twistRadians: THREE_MATH_DEG2RAD * (shape.extrudeTwist ?? 0) * t,
    offsetX: (shape.extrudeTopOffsetX ?? 0) * t,
    offsetZ: (shape.extrudeTopOffsetZ ?? 0) * t,
  };
}

const THREE_MATH_DEG2RAD = Math.PI / 180;
const EXTRUDE_TWIST_MAX = 720;
const EXTRUDE_OFFSET_MAX = 80;

/**
 * Setzen wie es das Merkmalsfeld tut (dieselben Grenzen wie dessen drei
 * Schieberegler) - fuer die MCP-Bruecke, nach demselben Vorbild wie
 * `shapeTaperPatch`: Verdrehung/Neigung gehoert dem einzelnen Koerper, steht
 * in keiner Formvorgabe und braucht deshalb ihren eigenen Weg dorthin.
 */
export function shapeExtrudeDeformPatch(
  shape: WorkplaneShape,
  requested: { twist?: number; offsetX?: number; offsetZ?: number },
): Partial<WorkplaneShape> {
  if (!shapeSupportsExtrudeDeform(shape.kind)) return {};
  const patch: Partial<WorkplaneShape> = {};
  const clamp = (value: number, limit: number) => Math.min(limit, Math.max(-limit, value));
  if (requested.twist !== undefined) patch.extrudeTwist = clamp(requested.twist, EXTRUDE_TWIST_MAX);
  if (requested.offsetX !== undefined) patch.extrudeTopOffsetX = clamp(requested.offsetX, EXTRUDE_OFFSET_MAX);
  if (requested.offsetZ !== undefined) patch.extrudeTopOffsetZ = clamp(requested.offsetZ, EXTRUDE_OFFSET_MAX);
  return patch;
}

export function meshYawDegrees(shape: WorkplaneShape) {
  const isRoundPrimitive = !shape.importedMesh && (shape.kind === "cylinder" || shape.kind === "ellipse" || shape.kind === "cone");
  const isCircular = Math.abs(shapeWidth(shape) - shapeDepth(shape)) < 0.0005;
  if (!isRoundPrimitive || !isCircular) {
    return shape.rotation;
  }
  // The yaw only turns a round body about its own axis while that axis stands up. The Euler order
  // (XYZ) applies the tilt about Z before the yaw, so a body tipped about Z lies on its side and
  // the yaw decides where it points (forum 617836: pins laid round a ring all faced one way once
  // grouped).
  if (Math.abs(shape.rotationZ ?? 0) > 1e-9) return shape.rotation;

  // A tessellated circular primitive is only invariant by one whole side step.
  // Preserve the remaining yaw so low-sided cylinders are baked and used in
  // booleans at the same angle shown in the viewport.
  const sides = Math.max(3, Math.round(shape.sides ?? 96));
  // createPrismGeometry stretches the polygon to fill width and depth
  // (regularPolygonFootprintScale). Only with a multiple of four sides is it
  // the same across and across the corners; any other polygon is stretched
  // (a hexagon by 1/cos 30 degrees, a triangle and offset too) and no longer
  // turns into itself by one side step - it keeps the angle the viewport shows.
  if (sides % 4 !== 0) return shape.rotation;
  const sideStep = 360 / sides;
  const normalized = normalizeDegrees(shape.rotation);
  const equivalentYaw = normalized - Math.round(normalized / sideStep) * sideStep;
  return Math.abs(equivalentYaw) < 1e-9 ? 0 : equivalentYaw;
}

function edgeTreatmentPreserveZone(shape: WorkplaneShape): number {
  const own = Math.max(...(shape.edgeTreatments ?? []).map((feature) => feature.amount), 0);
  const child = Math.max(...(shape.groupedShapes ?? []).map(edgeTreatmentPreserveZone), 0);
  return Math.max(own, child);
}

/**
 * The history entry of a hollowing that is the body's last step. Such a body is
 * hollowed again after a resize instead of being stretched: keeping a band at
 * each side of the box only keeps flat walls, a round wall came out with four
 * bulges (forum, 05.10.2026).
 */
export function shellRebuildEntry(shape: WorkplaneShape) {
  const features = shape.edgeTreatments ?? [];
  const history = shape.edgeTreatmentHistory ?? [];
  const last = history[history.length - 1];
  if (!shape.importedMesh || shape.hole || shape.groupedShapes?.length) return null;
  if (features[features.length - 1]?.kind !== "shell" || last?.feature.kind !== "shell" || !last.appliedFrame) return null;
  // A star, knurl or thread is round by definition; stretched unevenly there is
  // nothing to hollow again, so it keeps the bands as before.
  const stretched = Math.abs(shapeWidth(shape) / Math.max(0.001, last.appliedFrame.width) - shapeDepth(shape) / Math.max(0.001, last.appliedFrame.depth)) > 1e-3;
  if (stretched && (last.before.kind === "star" || last.before.kind === "knurl" || last.before.kind === "thread")) return null;
  return last;
}

/** The hollowing to redo, when the body has been resized since it was hollowed. */
export function shellNeedingRebuild(shape: WorkplaneShape) {
  const entry = shellRebuildEntry(shape);
  const applied = entry?.appliedFrame;
  if (!entry || !applied) return null;
  const changed = Math.abs(shapeWidth(shape) - applied.width) > 0.005
    || Math.abs(shapeDepth(shape) - applied.depth) > 0.005
    || Math.abs(shape.height - applied.height) > 0.005;
  return changed ? entry : null;
}

export function preservesEdgeTreatmentSize(shape: WorkplaneShape) {
  if (shellRebuildEntry(shape)) return false;
  return shape.edgeResizeMode === "preserve" && Boolean(shape.importedMesh && edgeTreatmentPreserveZone(shape) > 0);
}

function edgePreservedCoordinate(value: number, baseSize: number, targetSize: number, centered: boolean, requestedZone: number) {
  const oldMin = centered ? -baseSize / 2 : 0;
  const oldMax = oldMin + baseSize;
  const newMin = centered ? -targetSize / 2 : 0;
  const zone = Math.max(0, Math.min(requestedZone, baseSize / 2, targetSize / 2));
  if (zone <= 1e-6 || Math.abs(baseSize - targetSize) <= 1e-9) {
    return newMin + (value - oldMin) * targetSize / Math.max(0.001, baseSize);
  }
  const distanceFromMin = value - oldMin;
  const distanceFromMax = oldMax - value;
  if (distanceFromMin <= zone) return newMin + distanceFromMin;
  if (distanceFromMax <= zone) return newMin + targetSize - distanceFromMax;
  const oldInterior = Math.max(1e-6, baseSize - zone * 2);
  const newInterior = Math.max(0, targetSize - zone * 2);
  return newMin + zone + (distanceFromMin - zone) * newInterior / oldInterior;
}

export function resizedImportedCoordinates(shape: WorkplaneShape, sourcePositions: number[]) {
  const mesh = shape.importedMesh;
  if (!mesh) return [];
  const width = shapeWidth(shape);
  const depth = shapeDepth(shape);
  const height = shape.height;
  const preserve = preservesEdgeTreatmentSize(shape);
  const zone = preserve ? edgeTreatmentPreserveZone(shape) : 0;
  const positions = new Array<number>(sourcePositions.length);
  for (let index = 0; index + 2 < sourcePositions.length; index += 3) {
    if (preserve) {
      positions[index] = edgePreservedCoordinate(sourcePositions[index], mesh.baseWidth, width, true, zone);
      positions[index + 1] = edgePreservedCoordinate(sourcePositions[index + 1], mesh.baseHeight, height, false, zone);
      positions[index + 2] = edgePreservedCoordinate(sourcePositions[index + 2], mesh.baseDepth, depth, true, zone);
    } else {
      positions[index] = sourcePositions[index] * width / Math.max(0.001, mesh.baseWidth);
      positions[index + 1] = sourcePositions[index + 1] * height / Math.max(0.001, mesh.baseHeight);
      positions[index + 2] = sourcePositions[index + 2] * depth / Math.max(0.001, mesh.baseDepth);
    }
  }
  return positions;
}

export function resizedImportedMeshPositions(shape: WorkplaneShape) {
  return shape.importedMesh ? resizedImportedCoordinates(shape, shape.importedMesh.positions) : [];
}

export function resizedShapeSize(width: number, depth: number) {
  return Math.max(width, depth);
}

export function proportionalResizeScale(startWidth: number, startDepth: number, nextWidth: number, nextDepth: number) {
  const widthScale = nextWidth / Math.max(0.001, startWidth);
  const depthScale = nextDepth / Math.max(0.001, startDepth);
  if (!Number.isFinite(widthScale) || !Number.isFinite(depthScale)) {
    return 1;
  }
  return Math.abs(widthScale - 1) >= Math.abs(depthScale - 1) ? widthScale : depthScale;
}

export function fallbackSolidColor(shape: WorkplaneShape) {
  if (shape.sketchOperation === "revolve") return "#78b96b";
  if (shape.kind === "cylinder") return "#d97813";
  if (shape.kind === "ellipse") return "#e0a324";
  if (shape.kind === "sphere") return "#0098c7";
  if (shape.kind === "cone") return "#6e2786";
  if (shape.kind === "pyramid") return "#f2cf10";
  if (shape.kind === "gear") return "#6f7f8d";
  return "#d41721";
}

/**
 * A group whose parts are all solid or all holes follows the switch, parts
 * included. A mixed group - a body with its cut-outs - keeps every part's own
 * state, so switching it to a hole and back never turns the cut-outs solid.
 */
export function withHoleMode(shape: WorkplaneShape, hole: boolean, parentColor?: string): WorkplaneShape {
  const color = parentColor ?? shape.color;
  const children = shape.groupedShapes;
  const mixed = Boolean(children?.some((child) => child.hole) && children?.some((child) => !child.hole));
  return {
    ...shape,
    hole,
    color,
    groupedShapes: children?.map((child) => withHoleMode(child, mixed ? Boolean(child.hole) : hole, parentColor)),
  };
}

export function mirrorSign(value?: boolean) {
  return value ? -1 : 1;
}

export function mirroredAxisCount(shape: WorkplaneShape) {
  return [shape.mirrorX, shape.mirrorY, shape.mirrorZ].filter(Boolean).length;
}

export function canonicalizeShape(shape: WorkplaneShape): WorkplaneShape {
  const next: WorkplaneShape = {
    ...shape,
    rotation: cleanRotationDegrees(shape.rotation ?? 0),
    rotationX: cleanRotationDegrees(shape.rotationX ?? 0),
    rotationZ: cleanRotationDegrees(shape.rotationZ ?? 0),
    mirrorX: shape.mirrorX || undefined,
    mirrorY: shape.mirrorY || undefined,
    mirrorZ: shape.mirrorZ || undefined,
  };
  if (shape.kind === "thread") {
    const footprint = threadFootprintPatch(next);
    Object.assign(next, footprint);
    next.size = resizedShapeSize(footprint.width, footprint.depth);
  }
  // A cylinder's cross-section must always stay circular - width is
  // authoritative, depth follows. This is the single enforcement point: every
  // creation, edit and project load runs through canonicalizeShape.
  // A gear set by module too, involute or round: its size is its module, the same both ways (#201) -
  // except the rack, a bar whose depth is its own.
  const involuteGear = shape.kind === "gear" && shape.gearType !== "rack" && (shape.gearProfile === "involute" || shape.gearProfile === "round");
  if ((shape.kind === "cylinder" || shape.kind === "star" || shape.kind === "knurl" || involuteGear) && next.width !== next.depth) {
    next.depth = next.width;
    next.size = next.width;
  }
  if (shape.groupedShapes) {
    next.groupedShapes = shape.groupedShapes.map(canonicalizeShape);
  }
  if (shape.sketchRevolve) {
    next.sketchRevolve = {
      startAngle: shape.sketchRevolve.startAngle,
      sweepAngle: shape.sketchRevolve.sweepAngle,
      sides: shape.sketchRevolve.sides,
      quality: shape.sketchRevolve.quality,
    };
  }
  if (shape.edgeTreatmentHistory) {
    next.edgeTreatmentHistory = shape.edgeTreatmentHistory.map((entry) => ({
      ...entry,
      before: canonicalizeShape(entry.before),
    }));
  }
  return next;
}

/** Two strokes (#154/#215) with the same width, position, corners and ends. */
export function sketchStrokesEqual(a: SketchStroke | undefined, b: SketchStroke | undefined) {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.width === b.width && a.align === b.align && a.join === b.join && a.cap === b.cap;
}

export function workplaneShapesEqual(a: WorkplaneShape, b: WorkplaneShape) {
  return (
    a.id === b.id &&
    a.name === b.name &&
    a.kind === b.kind &&
    a.color === b.color &&
    a.hole === b.hole &&
    a.x === b.x &&
    a.z === b.z &&
    a.elevation === b.elevation &&
    a.size === b.size &&
    a.width === b.width &&
    a.depth === b.depth &&
    a.height === b.height &&
    a.rotation === b.rotation &&
    a.rotationX === b.rotationX &&
    a.rotationZ === b.rotationZ &&
    a.mirrorX === b.mirrorX &&
    a.mirrorY === b.mirrorY &&
    a.mirrorZ === b.mirrorZ &&
    a.radius === b.radius &&
    a.steps === b.steps &&
    a.sides === b.sides &&
    a.bevel === b.bevel &&
    a.segments === b.segments &&
    a.topRadius === b.topRadius &&
    a.baseRadius === b.baseRadius &&
    a.topWidth === b.topWidth &&
    a.topDepth === b.topDepth &&
    a.taperTopWidth === b.taperTopWidth &&
    a.taperTopDepth === b.taperTopDepth &&
    a.taperBottomWidth === b.taperBottomWidth &&
    a.taperBottomDepth === b.taperBottomDepth &&
    a.taperTopScale === b.taperTopScale &&
    a.taperBottomScale === b.taperBottomScale &&
    a.extrudeTwist === b.extrudeTwist &&
    a.extrudeTopOffsetX === b.extrudeTopOffsetX &&
    a.extrudeTopOffsetZ === b.extrudeTopOffsetZ &&
    a.teeth === b.teeth &&
    a.toothSize === b.toothSize &&
    a.toothWidth === b.toothWidth &&
    a.centerHoleSize === b.centerHoleSize &&
    a.gearType === b.gearType &&
    a.helixAngle === b.helixAngle &&
    a.helixQuality === b.helixQuality &&
    a.gearProfile === b.gearProfile &&
    a.gearPressureAngle === b.gearPressureAngle &&
    a.gearBacklash === b.gearBacklash &&
    a.gearRim === b.gearRim &&
    a.threadRole === b.threadRole &&
    a.threadHead === b.threadHead &&
    a.threadHand === b.threadHand &&
    a.threadProfile === b.threadProfile &&
    a.threadDiameter === b.threadDiameter &&
    a.threadPitch === b.threadPitch &&
    a.threadClearance === b.threadClearance &&
    a.threadBoltClearance === b.threadBoltClearance &&
    a.threadQuality === b.threadQuality &&
    a.threadHeadHeight === b.threadHeadHeight &&
    a.threadChamfer === b.threadChamfer &&
    a.threadHeadChamfer === b.threadHeadChamfer &&
    a.parametricSource?.kind === b.parametricSource?.kind &&
    a.parametricSource?.rotation === b.parametricSource?.rotation &&
    a.parametricSource?.rotationX === b.parametricSource?.rotationX &&
    a.parametricSource?.rotationZ === b.parametricSource?.rotationZ &&
    a.parametricSource?.width === b.parametricSource?.width &&
    a.parametricSource?.height === b.parametricSource?.height &&
    a.springTurns === b.springTurns &&
    a.springWire === b.springWire &&
    a.springHand === b.springHand &&
    a.springQuality === b.springQuality &&
    a.starPoints === b.starPoints &&
    a.starInnerSize === b.starInnerSize &&
    a.starOuterFillet === b.starOuterFillet &&
    a.starInnerFillet === b.starInnerFillet &&
    a.starQuality === b.starQuality &&
    a.heartTipFillet === b.heartTipFillet &&
    a.heartQuality === b.heartQuality &&
    a.crescentThickness === b.crescentThickness &&
    a.crescentTipFillet === b.crescentTipFillet &&
    a.crescentQuality === b.crescentQuality &&
    a.honeycombCellSize === b.honeycombCellSize &&
    a.honeycombWallThickness === b.honeycombWallThickness &&
    a.honeycombFrameWidth === b.honeycombFrameWidth &&
    a.hingeKnuckles === b.hingeKnuckles &&
    a.hingePinDiameter === b.hingePinDiameter &&
    a.hingeLeafThickness === b.hingeLeafThickness &&
    a.hingeClearance === b.hingeClearance &&
    a.dovetailNeckWidth === b.dovetailNeckWidth &&
    a.dovetailClearance === b.dovetailClearance &&
    a.loftBottomOutline === b.loftBottomOutline &&
    a.loftTopOutline === b.loftTopOutline &&
    a.loftBottomWidth === b.loftBottomWidth &&
    a.loftBottomDepth === b.loftBottomDepth &&
    a.loftTopWidth === b.loftTopWidth &&
    a.loftTopDepth === b.loftTopDepth &&
    a.loftBottomCorner === b.loftBottomCorner &&
    a.loftTopCorner === b.loftTopCorner &&
    a.loftBottomSides === b.loftBottomSides &&
    a.loftTopSides === b.loftTopSides &&
    a.loftOffsetX === b.loftOffsetX &&
    a.loftOffsetZ === b.loftOffsetZ &&
    a.loftWall === b.loftWall &&
    a.loftTwist === b.loftTwist &&
    a.slotEndRatio === b.slotEndRatio &&
    a.loftTiltX === b.loftTiltX &&
    a.loftTiltZ === b.loftTiltZ &&
    a.screwHoleShaft === b.screwHoleShaft &&
    a.screwHoleHeadDepth === b.screwHoleHeadDepth &&
    a.screwHoleAngle === b.screwHoleAngle &&
    a.cornerFillet === b.cornerFillet &&
    a.topBottomFillet === b.topBottomFillet &&
    a.roundedBoxQuality === b.roundedBoxQuality &&
    a.bentTubeProfile === b.bentTubeProfile &&
    a.bentTubeInnerProfile === b.bentTubeInnerProfile &&
    a.bentTubeSize === b.bentTubeSize &&
    a.bentTubeWall === b.bentTubeWall &&
    a.bentTubeQuality === b.bentTubeQuality &&
    bentTubeSegmentsEqual(a.bentTubeSegments, b.bentTubeSegments) &&
    a.text === b.text &&
    a.font === b.font &&
    a.textCurved === b.textCurved &&
    a.cylinderWrap?.diameter === b.cylinderWrap?.diameter &&
    a.knurlPattern === b.knurlPattern &&
    a.knurlCount === b.knurlCount &&
    a.knurlDepth === b.knurlDepth &&
    a.knurlAngle === b.knurlAngle &&
    a.knurlChamfer === b.knurlChamfer &&
    a.cylinderWrap?.inward === b.cylinderWrap?.inward &&
    a.textRadius === b.textRadius &&
    a.textSize === b.textSize &&
    a.textInward === b.textInward &&
    a.textFlipped === b.textFlipped &&
    sketchStrokesEqual(a.textStroke, b.textStroke) &&
    Boolean(a.textSilhouette) === Boolean(b.textSilhouette) &&
    JSON.stringify(a.textKeyring ?? null) === JSON.stringify(b.textKeyring ?? null) &&
    a.importedMesh === b.importedMesh &&
    a.imagePlate === b.imagePlate &&
    a.sketchProfile === b.sketchProfile &&
    a.sketchOperation === b.sketchOperation &&
    a.sketchRevolve === b.sketchRevolve &&
    a.edgeTreatments === b.edgeTreatments &&
    a.edgeTreatmentHistory === b.edgeTreatmentHistory &&
    a.cadDisplayEdges === b.cadDisplayEdges &&
    a.cadDisplayEdgesVersion === b.cadDisplayEdgesVersion &&
    a.edgeResizeMode === b.edgeResizeMode &&
    a.cadBrep === b.cadBrep &&
    a.cadBrepFrame === b.cadBrepFrame &&
    a.cadPrimitiveFrame === b.cadPrimitiveFrame &&
    a.groupedShapes === b.groupedShapes &&
    a.groupedBaseWidth === b.groupedBaseWidth &&
    a.groupedBaseDepth === b.groupedBaseDepth &&
    a.groupedBaseHeight === b.groupedBaseHeight &&
    a.groupOperation === b.groupOperation &&
    a.multicolor === b.multicolor &&
    a.rotationPivot === b.rotationPivot &&
    fieldFormulasEqual(a.formulas, b.formulas) &&
    a.locked === b.locked &&
    a.hidden === b.hidden &&
    a.transparent === b.transparent
  );
}

export function serializeShapesForSync(shapes: WorkplaneShape[]) {
  return JSON.stringify(shapes.map(canonicalizeShape));
}
