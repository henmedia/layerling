"use client";

import * as THREE from "three";
import { acceleratedRaycast, computeBoundsTree, disposeBoundsTree } from "three-mesh-bvh";
import { groupShowsPartColors } from "@/lib/groupColors";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { type ResolvedAppTheme } from "@/lib/appTheme";
import { createGearGeometry } from "@/lib/gearGeometry";
import { createStarGeometry } from "@/lib/starGeometry";
import { createHeartGeometry } from "@/lib/heartGeometry";
import { createCrescentGeometry } from "@/lib/crescentGeometry";
import { createSlotGeometry } from "@/lib/slotGeometry";
import { createDovetailGeometry } from "@/lib/dovetailGeometry";
import { createParaboloidGeometry } from "@/lib/roundBodyGeometry";
import { createLoftGeometry } from "@/lib/loftGeometry";
import { createHingeGeometry } from "@/lib/hingeGeometry";
import { createGridfinityGeometry } from "@/lib/gridfinityGeometry";
import { createKnurlGeometry } from "@/lib/knurlGeometry";
import { createVaseGeometry, fittedVaseMesh } from "@/lib/vaseShape";
import { createTeardropGeometry } from "@/lib/teardropGeometry";
import { createScrewHoleGeometry } from "@/lib/screwHoleGeometry";
import { createHoneycombGeometry } from "@/lib/honeycombGeometry";
import { createRoundedBoxGeometry } from "@/lib/roundedBoxGeometry";
import { createBentTubeGeometry, createBentTubeSegmentGeometry } from "@/lib/bentTubeGeometry";
import { createThreadGeometry } from "@/lib/threadGeometry";
import { createSpringGeometry } from "@/lib/springGeometry";
import { textDisplayGeometry } from "@/lib/textFill";
import { manifoldRevision } from "@/lib/manifoldHandle";
import { customFontRevision } from "@/lib/textFonts";
import { rulerTicks } from "@/lib/rulerDimensions";
import { horizontalPlacementWorkplane, placementWorkplaneIsBase, placementWorkplaneQuaternion, type PlacementWorkplane } from "@/lib/placementWorkplane";
import { groundFootprintForFrame, type SelectionFrame } from "@/lib/liftGeometry";
import { regularPolygonFootprintScale } from "@/lib/regularPolygonFootprint";
import { roundSideCount } from "@/lib/roundSideCount";
import { createPyramidGeometry } from "@/lib/pyramidGeometry";
import { positionsForTwist, twistBandCount } from "@/lib/heightSlices";
import { toCreasedNormals } from "@/lib/creasedNormals";
import { DEFAULT_EDGE_LINE_COLOR } from "@/lib/workplaneGrid";
import { deformsAboutOrigin, mirroredAxisCount, mirrorSign, preservesEdgeTreatmentSize, resizedImportedCoordinates, resizedImportedMeshPositions, shapeDepth, shapeExtrudeDeformAt, shapeHasExtrudeDeform, shapeHasShapeDeform, shapeHasTaper, shapeSupportsTaper, shapeTaperDimensions, shapeTaperScaleAt, shapeWidth } from "@/lib/workplaneShapes";
import { sphereTessellation } from "@/lib/sphereTessellation";
import { torusTessellation } from "@/lib/torusTessellation";
import { torusRadii, torusTubeRatio } from "@/lib/torusShape";
import type { WorkplaneShape } from "@/types/layerling";
import { OVERHANG_PLATE_TOLERANCE, overhangDownwardLimit } from "@/lib/overhangLimits";
import type { CadModifierEdge } from "@/lib/cadModifierTypes";
import { cadFaceHighlightPositions, type CadFacePick } from "@/lib/cadFacePick";
import { cadFacePickMesh, disposeCadFacePickMesh } from "@/lib/cadFacePickMesh";
import { referenceImageOpacity } from "@/lib/referenceImage";
import { RENDER_LAYER_SHAPES } from "@/components/workplane/viewportPicking";
import { fastEdgesGeometry } from "@/lib/fastEdgesGeometry";
import { buildImportedMeshGeometry, computeImportedBoundsTree, putGeometryOnBase, takePreparedImportedMeshGeometry } from "@/lib/importedMeshDisplay";
import { RENDER_LAYER_HELPERS, sharedOverlayLineMaterial, sharedShapeGeometryCache, sharedEdgesGeometryCache, sharedShapeMaterialCache, type ThreeState, quaternionForShape, shapeCenter, projectShapeExtent, setObjectRenderLayer, freezeStaticObjectMatrices, trimSharedShapeGeometryCache, releaseSharedShapeGeometry, trimSharedShapeMaterialCache, releaseSharedShapeMaterials, disposeMaterialResource, disposeChildren, disposeObject } from "@/components/workplane/ViewportOverlays";

export const MIN_SHAPE_SIZE = 0.01;
export const RENDER_LAYER_MODIFIERS = 3;
export const RENDER_LAYER_PREVIEWS = 4;
export const BVH_PICKING_TRIANGLE_THRESHOLD = 512;
export const importedGeometryCache = new WeakMap<
  NonNullable<WorkplaneShape["importedMesh"]>,
  { geometry: THREE.BufferGeometry; edges: Map<number, THREE.EdgesGeometry> }
>();
export const preservedImportedGeometryCache = new WeakMap<WorkplaneShape, THREE.BufferGeometry>();
/**
 * Shared by every solid's material: switching overhangs on or changing the
 * angle only changes these values, no material is rebuilt.
 */
export const overhangUniforms = {
  uOverhangOn: { value: 0 },
  uOverhangLimit: { value: overhangDownwardLimit(45) },
  uOverhangPlateY: { value: OVERHANG_PLATE_TOLERANCE },
  uOverhangColor: { value: new THREE.Color("#e8322a") },
};
export const sharedLineMaterialCache = new Map<string, THREE.LineBasicMaterial>();
export const shapeResourceIds = new WeakMap<object, number>();
export let nextShapeResourceId = 1;
export const imageTextureLoader = new THREE.TextureLoader();
export const IMPORTED_SELECTED_EDGE_TRIANGLE_LIMIT = 40000;
/** Edge lines on every body leave out an imported mesh with more triangles than this; finding its edges would cost too much. */
export const ALL_EDGE_LINES_IMPORTED_TRIANGLE_LIMIT = 100_000;

/**
 * The "edge lines on all bodies" setting. Shapes are built outside React, so the
 * viewport hands the setting over here before it rebuilds them; it is part of
 * the material signature, which is how a change reaches shapes already on screen.
 */
export let edgeLineStyle = { enabled: false, color: DEFAULT_EDGE_LINE_COLOR };

/** "Show holes more clearly" (#662): darker, denser holes with a line round them, handed over like the edge lines. */
export let strongHoles = false;

export function setEdgeLineStyle(enabled: boolean, color: string) {
  const changed = edgeLineStyle.enabled !== enabled || (enabled && edgeLineStyle.color !== color);
  edgeLineStyle = { enabled, color };
  return changed;
}

export function setStrongHoles(enabled: boolean) {
  const changed = strongHoles !== enabled;
  strongHoles = enabled;
  return changed;
}
export const STRONG_HOLE_COLOR = "#5b6670";
export const STRONG_HOLE_EDGE_COLOR = "#1f262c";
export const NORMAL_IMPORTED_SELECTION_EDGE_ANGLE = 60;
// "Only visible edges": an edge lies on the body's own faces, so its line is
// moved this fraction of the way toward the camera before the depth test,
// or it would flicker in and out of the faces it borders.
export const MODIFIER_EDGE_DEPTH_PULL = 0.997;

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}


export function tapeShapeTopologyKey(shape: WorkplaneShape): string {
  const positions = shape.importedMesh?.positions ?? [];
  const positionSample = positions.length > 0
    ? Array.from({ length: Math.min(12, positions.length) }, (_, index) => positions[Math.floor(index * (positions.length - 1) / Math.max(1, Math.min(12, positions.length) - 1))]?.toFixed(4) ?? "0").join(",")
    : "";
  const brep = shape.cadBrep ?? "";
  const brepSample = brep.length > 0
    ? Array.from({ length: Math.min(8, brep.length) }, (_, index) => brep.charCodeAt(Math.floor(index * (brep.length - 1) / Math.max(1, Math.min(8, brep.length) - 1)))).join(",")
    : "";
  return JSON.stringify({
    kind: shape.kind,
    radius: shape.radius,
    steps: shape.steps,
    sides: shape.sides,
    torusTubeRatio: shape.torusTubeRatio,
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
    extrudeTwist: shape.extrudeTwist,
    extrudeTopOffsetX: shape.extrudeTopOffsetX,
    extrudeTopOffsetZ: shape.extrudeTopOffsetZ,
    teeth: shape.teeth,
    toothSize: shape.toothSize,
    toothWidth: shape.toothWidth,
    centerHoleSize: shape.centerHoleSize,
    gearType: shape.gearType,
    gearRim: shape.gearRim,
    helixAngle: shape.helixAngle,
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
    helixQuality: shape.helixQuality,
    gearProfile: shape.gearProfile,
    gearPressureAngle: shape.gearPressureAngle,
    gearBacklash: shape.gearBacklash,
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
    // Label shelves, finger scoops and dividers are joined by Manifold, and a side's notch is cut by it; until it has loaded the bin is drawn without them (#455, #554).
    labelKernel: shape.gridfinityLabelBack || shape.gridfinityLabelFront || shape.gridfinityLabelLeft || shape.gridfinityLabelRight || shape.gridfinityScoopBack || shape.gridfinityScoopFront || shape.gridfinityScoopLeft || shape.gridfinityScoopRight || (shape.gridfinityCompartmentsX ?? 1) > 1 || (shape.gridfinityCompartmentsZ ?? 1) > 1 || (shape.gridfinityOpenings?.length ?? 0) > 0 ? manifoldRevision() : undefined,
    knurlPattern: shape.knurlPattern,
    knurlCount: shape.knurlCount,
    knurlDepth: shape.knurlDepth,
    knurlAngle: shape.knurlAngle,
    knurlChamfer: shape.knurlChamfer,
    vase: shape.kind === "vase" ? JSON.stringify(shape.vase ?? null) : undefined,
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
    loftTiltX: shape.loftTiltX,
    loftTiltZ: shape.loftTiltZ,
    screwHoleShaft: shape.screwHoleShaft,
    screwHoleHeadDepth: shape.screwHoleHeadDepth,
    screwHoleAngle: shape.screwHoleAngle,
    // A dovetail cut-out grows by its clearance, so body and socket differ.
    dovetailHole: shape.kind === "dovetail" ? Boolean(shape.hole) : undefined,
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
    // A font of one's own can gain letters (a design's few, then the whole file): draw again then.
    fontRevision: customFontRevision(shape.font),
    textStroke: shape.textStroke,
    textSilhouette: shape.textSilhouette,
    textStretch: shape.textStretch,
    textVertical: shape.textVertical,
    textSpacing: shape.textSpacing,
    textKeyring: shape.textKeyring,
    textEdge: shape.textEdge,
    // A fill is built by the 2D kernel; until it has loaded the text is drawn plain (#215).
    fillKernel: shape.textStroke || shape.textSilhouette || shape.textKeyring || shape.textEdge ? manifoldRevision() : undefined,
    textCurved: shape.textCurved,
    textRadius: shape.textRadius,
    textSize: shape.textSize,
    textInward: shape.textInward,
    textFlipped: shape.textFlipped,
    mesh: [positions.length, positionSample],
    brep: [brep.length, brepSample],
    treatments: shape.edgeTreatments,
  }) + nestedSignatures(shape.groupedShapes, (child) => [child.id], tapeShapeTopologyKey);
}

/**
 * The signatures of a group's parts, appended to the group's own as they are. They used to be put into the group's
 * JSON as strings, and every level of nesting then escaped the quotes of the level below it again: a group nested
 * 19 deep (a Tinkercad import) made a signature of 346 MB and the tab ran out of memory (#683).
 */
export function nestedSignatures(children: WorkplaneShape[] | undefined, own: (child: WorkplaneShape) => unknown[], signature: (child: WorkplaneShape) => string): string {
  if (!children?.length) return "";
  return `[${children.map((child) => `${JSON.stringify(own(child))}${signature(child)}`).join(",")}]`;
}

export function shapeResourceId(value: object | null | undefined) {
  if (!value) return 0;
  const existing = shapeResourceIds.get(value);
  if (existing) return existing;
  const next = nextShapeResourceId;
  nextShapeResourceId += 1;
  shapeResourceIds.set(value, next);
  return next;
}

export function shapeTransformSignature(shape: WorkplaneShape) {
  return [
    shape.x,
    shape.z,
    shape.elevation ?? 0,
    shape.rotation,
    shape.rotationX ?? 0,
    shape.rotationZ ?? 0,
    Boolean(shape.mirrorX),
    Boolean(shape.mirrorY),
    Boolean(shape.mirrorZ),
  ].join("|");
}

/**
 * A picture plate holds its image as a data URL of several MB. The material signature is built
 * on every sync, also while a shape is dragged, so it carries the length and four short samples
 * instead of the whole string.
 */
export function dataUrlFingerprint(dataUrl: string | undefined): string {
  if (!dataUrl) return "";
  const length = dataUrl.length;
  const sample = (at: number) => dataUrl.slice(at, at + 24);
  return `${length}:${sample(0)}:${sample(Math.floor(length / 3))}:${sample(Math.floor((length * 2) / 3))}:${sample(Math.max(0, length - 24))}`;
}

export function shapeMaterialSignature(shape: WorkplaneShape): string {
  return JSON.stringify({
    edgeLines: edgeLineStyle.enabled ? edgeLineStyle.color : "",
    color: shape.color,
    hole: shape.hole ? (strongHoles ? "strong" : true) : false,
    transparent: Boolean(shape.transparent),
    multicolor: shape.groupedShapes?.length ? groupShowsPartColors(shape) : undefined,
    imagePlate: shapeResourceId(shape.imagePlate),
    imageData: dataUrlFingerprint(shape.imagePlate?.dataUrl),
    imageOpacity: shape.imagePlate ? referenceImageOpacity(shape) : undefined,
    sourceFormat: shape.importedMesh?.sourceFormat ?? "",
    mirrored: mirroredAxisCount(shape) % 2,
    cadEdges: shapeResourceId(shape.cadDisplayEdges),
    cadEdgesVersion: shape.cadDisplayEdgesVersion ?? 0,
    cadEdgeDimensions: shape.cadDisplayEdges?.length ? [shapeWidth(shape), shapeDepth(shape), shape.height] : null,
  }) + nestedSignatures(shape.groupedShapes, (child) => [child.id, child.hidden], (child) => shapeMaterialSignature(groupChildAppearance(shape, child)));
}

/**
 * Die Seitenzahl der beiden Vielkoerper. Der Mehrkant ist eckig und bleibt bei
 * dem, was eingestellt ist; beim Zylinder waechst sie ohne eigene Angabe mit
 * dem Durchmesser mit.
 */
export function polygonSidesForShape(shape: WorkplaneShape) {
  if (shape.kind === "polygon") return shape.sides ?? 6;
  return roundSideCount(shape.sides, shapeWidth(shape), shapeDepth(shape));
}

export function shapeGeometrySignature(shape: WorkplaneShape): string {
  const taper = !shapeSupportsTaper(shape.kind) || !shapeHasTaper(shape)
    ? null
    : { ...shapeTaperDimensions(shape), baseWidth: shapeWidth(shape), baseDepth: shapeDepth(shape) };
  // Twist/lean reshape the mesh the same way taper does, so a change to
  // either has to bust this signature - otherwise the cached geometry from
  // before the twist stays on screen.
  const deform = shapeHasExtrudeDeform(shape)
    ? { twist: shape.extrudeTwist, offsetX: shape.extrudeTopOffsetX, offsetZ: shape.extrudeTopOffsetZ }
    : null;
  if (shape.groupedShapes?.length && !shape.importedMesh) {
    return JSON.stringify({
      kind: "group",
      width: shapeWidth(shape),
      depth: shapeDepth(shape),
      height: shape.height,
      taper,
      deform,
    }) + nestedSignatures(
      shape.groupedShapes,
      (child) => [child.id, child.hidden, shapeWidth(child), shapeDepth(child), child.height, shapeTransformSignature(child)],
      shapeGeometrySignature,
    );
  }

  if (shape.importedMesh) {
    return JSON.stringify({
      kind: "mesh",
      mesh: shapeResourceId(shape.importedMesh),
      // A cut group in its parts' colours carries them in the geometry.
      partColors: !shape.hole && groupShowsPartColors(shape) ? shapeResourceId(shape.groupedShapes) : 0,
      taper,
      deform,
      preserve: preservesEdgeTreatmentSize(shape)
        ? [shapeWidth(shape), shapeDepth(shape), shape.height, shape.edgeTreatments]
        : false,
    });
  }

  // These are unit bodies stretched by the mesh; a twist or lean is worked out in millimetres
  // (taperGeometryForShape), so then the size is part of the geometry too.
  const size = deform ? [shapeWidth(shape), shapeDepth(shape), shape.height] : undefined;
  if (shape.kind === "box" && !(shape.radius && shape.radius > 0)) {
    return JSON.stringify({ kind: "box", taper, deform, size });
  }
  if (shape.kind === "cylinder" || shape.kind === "ellipse") {
    return JSON.stringify({ kind: shape.kind, sides: polygonSidesForShape(shape), segments: shape.segments, taper, deform, size });
  }
  if (shape.kind === "polygon") {
    return JSON.stringify({ kind: "polygon", sides: shape.sides, segments: shape.segments, taper, deform, size });
  }
  if (shape.kind === "sphere") {
    return JSON.stringify({ kind: "sphere", steps: shape.steps, taper, deform, size });
  }

  return JSON.stringify({
    kind: shape.kind,
    rulerInch: shape.kind === "ruler" ? rulerInchScale : undefined,
    geometryRevision: shape.kind === "pyramid" ? 2 : undefined,
    width: shapeWidth(shape),
    depth: shapeDepth(shape),
    height: shape.height,
    radius: shape.radius,
    steps: shape.steps,
    sides: shape.sides,
    torusTubeRatio: shape.torusTubeRatio,
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
    extrudeTwist: shape.extrudeTwist,
    extrudeTopOffsetX: shape.extrudeTopOffsetX,
    extrudeTopOffsetZ: shape.extrudeTopOffsetZ,
    teeth: shape.teeth,
    toothSize: shape.toothSize,
    toothWidth: shape.toothWidth,
    centerHoleSize: shape.centerHoleSize,
    gearType: shape.gearType,
    gearRim: shape.gearRim,
    helixAngle: shape.helixAngle,
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
    helixQuality: shape.helixQuality,
    gearProfile: shape.gearProfile,
    gearPressureAngle: shape.gearPressureAngle,
    gearBacklash: shape.gearBacklash,
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
    // Label shelves, finger scoops and dividers are joined by Manifold, and a side's notch is cut by it; until it has loaded the bin is drawn without them (#455, #554).
    labelKernel: shape.gridfinityLabelBack || shape.gridfinityLabelFront || shape.gridfinityLabelLeft || shape.gridfinityLabelRight || shape.gridfinityScoopBack || shape.gridfinityScoopFront || shape.gridfinityScoopLeft || shape.gridfinityScoopRight || (shape.gridfinityCompartmentsX ?? 1) > 1 || (shape.gridfinityCompartmentsZ ?? 1) > 1 || (shape.gridfinityOpenings?.length ?? 0) > 0 ? manifoldRevision() : undefined,
    knurlPattern: shape.knurlPattern,
    knurlCount: shape.knurlCount,
    knurlDepth: shape.knurlDepth,
    knurlAngle: shape.knurlAngle,
    knurlChamfer: shape.knurlChamfer,
    vase: shape.kind === "vase" ? JSON.stringify(shape.vase ?? null) : undefined,
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
    loftTiltX: shape.loftTiltX,
    loftTiltZ: shape.loftTiltZ,
    screwHoleShaft: shape.screwHoleShaft,
    screwHoleHeadDepth: shape.screwHoleHeadDepth,
    screwHoleAngle: shape.screwHoleAngle,
    // A dovetail cut-out grows by its clearance, so body and socket differ.
    dovetailHole: shape.kind === "dovetail" ? Boolean(shape.hole) : undefined,
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
    // A font of one's own can gain letters (a design's few, then the whole file): draw again then.
    fontRevision: customFontRevision(shape.font),
    textStroke: shape.textStroke,
    textSilhouette: shape.textSilhouette,
    textStretch: shape.textStretch,
    textVertical: shape.textVertical,
    textSpacing: shape.textSpacing,
    textKeyring: shape.textKeyring,
    textEdge: shape.textEdge,
    // A fill is built by the 2D kernel; until it has loaded the text is drawn plain (#215).
    fillKernel: shape.textStroke || shape.textSilhouette || shape.textKeyring || shape.textEdge ? manifoldRevision() : undefined,
    textCurved: shape.textCurved,
    textRadius: shape.textRadius,
    textSize: shape.textSize,
    textInward: shape.textInward,
    textFlipped: shape.textFlipped,
  });
}


export function selectionFrameForShapes(
  shapes: WorkplaneShape[],
  selectedIds: string[],
  workplane?: PlacementWorkplane,
): SelectionFrame | null {
  const selected = selectedIds.map((id) => shapes.find((shape) => shape.id === id)).filter((shape): shape is WorkplaneShape => Boolean(shape && !shape.hidden));
  if (selected.length === 0) {
    return null;
  }

  const singleShape = selected.length === 1 ? selected[0] : null;
  // A workplane only wins over the shape's own rotation when it's a real,
  // user-picked plane - the always-present default (no plane ever chosen)
  // must not force a single rotated shape's resize/rotate handles onto world
  // axes, or a tilted cylinder distorts when dragged.
  // A shape's handles write their sizes to its own width, depth and height, so a workplane that stands across
  // its up axis (on a side face) must not give them its axes: the sizes would land on the wrong dimensions (#933).
  const useWorkplane = Boolean(workplane) && !placementWorkplaneIsBase(workplane!)
    && (!singleShape || Math.abs(new THREE.Vector3(0, 1, 0).applyQuaternion(quaternionForShape(singleShape)).dot(new THREE.Vector3(workplane!.normal.x, workplane!.normal.y, workplane!.normal.z).normalize())) > 0.999);
  const quaternion = useWorkplane
    ? placementWorkplaneQuaternion(workplane!)
    : singleShape ? quaternionForShape(singleShape) : new THREE.Quaternion();
  const xAxis = useWorkplane
    ? new THREE.Vector3(workplane!.xAxis.x, workplane!.xAxis.y, workplane!.xAxis.z).normalize()
    : new THREE.Vector3(1, 0, 0).applyQuaternion(quaternion).normalize();
  const yAxis = useWorkplane
    ? new THREE.Vector3(workplane!.normal.x, workplane!.normal.y, workplane!.normal.z).normalize()
    : new THREE.Vector3(0, 1, 0).applyQuaternion(quaternion).normalize();
  const zAxis = useWorkplane
    ? new THREE.Vector3(workplane!.zAxis.x, workplane!.zAxis.y, workplane!.zAxis.z).normalize()
    : new THREE.Vector3(0, 0, 1).applyQuaternion(quaternion).normalize();
  const localMin = new THREE.Vector3(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
  const localMax = new THREE.Vector3(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);
  const origin = useWorkplane
    ? new THREE.Vector3(workplane!.origin.x, workplane!.origin.y, workplane!.origin.z)
    : singleShape ? shapeCenter(singleShape) : new THREE.Vector3();

  if (!useWorkplane && !singleShape) {
    selected.forEach((shape) => origin.add(shapeCenter(shape)));
    origin.multiplyScalar(1 / selected.length);
  }

  selected.forEach((shape) => {
    const { min, max } = projectShapeExtent(shape, xAxis, yAxis, zAxis, origin);
    localMin.min(min);
    localMax.max(max);
  });

  const localCenter = localMin.clone().add(localMax).multiplyScalar(0.5);
  const center = origin.clone()
    .addScaledVector(xAxis, localCenter.x)
    .addScaledVector(yAxis, localCenter.y)
    .addScaledVector(zAxis, localCenter.z);
  const width = Math.max(MIN_SHAPE_SIZE, localMax.x - localMin.x);
  const height = Math.max(MIN_SHAPE_SIZE, localMax.y - localMin.y);
  const depth = Math.max(MIN_SHAPE_SIZE, localMax.z - localMin.z);

  return {
    ids: selected.map((shape) => shape.id),
    center,
    quaternion,
    xAxis,
    yAxis,
    zAxis,
    width,
    height,
    depth,
    min: new THREE.Vector3(-width / 2, -height / 2, -depth / 2),
    max: new THREE.Vector3(width / 2, height / 2, depth / 2),
    singleShape,
  };
}

export function refreshFrozenObjectMatrix(object: THREE.Object3D) {
  object.updateMatrix();
  object.updateMatrixWorld(true);
}
export const WORKPLANE_LABEL_FONT_STACK = '"Avenir Next", Avenir, "Helvetica Neue", Arial, sans-serif';

export function updateShapeObjectTransform(object: THREE.Group, shape: WorkplaneShape) {
  object.name = shape.name;
  object.userData.shapeId = shape.id;
  object.userData.tapeDimensions = [shapeWidth(shape), shape.height, shapeDepth(shape)] satisfies [number, number, number];
  object.userData.tapeTopologyKey = tapeShapeTopologyKey(shape);
  object.position.set(shape.x, (shape.elevation ?? 0) + shape.height / 2, shape.z);
  object.rotation.set(
    THREE.MathUtils.degToRad(shape.rotationX ?? 0),
    THREE.MathUtils.degToRad(shape.rotation),
    THREE.MathUtils.degToRad(shape.rotationZ ?? 0),
  );
  object.scale.set(mirrorSign(shape.mirrorX), mirrorSign(shape.mirrorY), mirrorSign(shape.mirrorZ));
  refreshFrozenObjectMatrix(object);
}

export function syncShapeObjectDimensions(object: THREE.Group, shape: WorkplaneShape) {
  object.userData.tapeDimensions = [shapeWidth(shape), shape.height, shapeDepth(shape)] satisfies [number, number, number];
  object.userData.tapeTopologyKey = tapeShapeTopologyKey(shape);
  const surface = object.children.find((child): child is THREE.Mesh => child instanceof THREE.Mesh && Boolean(child.userData.shapeSurface));
  if (!surface) return;
  const width = shapeWidth(shape);
  const depth = shapeDepth(shape);
  let scale: THREE.Vector3 | null = null;
  let offsetX = 0;
  let offsetZ = 0;
  if (shape.importedMesh && !preservesEdgeTreatmentSize(shape)) {
    scale = new THREE.Vector3(
      width / Math.max(0.001, shape.importedMesh.baseWidth),
      shape.height / Math.max(0.001, shape.importedMesh.baseHeight),
      depth / Math.max(0.001, shape.importedMesh.baseDepth),
    );
  } else if (shape.kind === "box" && !(shape.radius && shape.radius > 0)) {
    scale = new THREE.Vector3(width, shape.height, depth);
  } else if (shape.kind === "cylinder" || shape.kind === "ellipse" || shape.kind === "polygon") {
    const fit = regularPolygonFootprintScale(width, depth, polygonSidesForShape(shape));
    scale = new THREE.Vector3(fit.x, shape.height, fit.z);
    offsetX = fit.offsetX;
    offsetZ = fit.offsetZ;
  } else if (shape.kind === "sphere") {
    scale = new THREE.Vector3(width / 2, shape.height / 2, depth / 2);
  }
  if (!scale) return;

  object.position.y = (shape.elevation ?? 0) + shape.height / 2;
  object.updateMatrix();
  surface.scale.copy(scale);
  // A twisted unit body already holds its stretch (taperGeometryForShape, addMesh).
  const stretchedBy = surface.geometry.userData.stretchedBy as [number, number, number] | undefined;
  if (stretchedBy) surface.scale.divide(new THREE.Vector3(...stretchedBy));
  // Ein Vieleck mit ungerader Seitenzahl liegt nicht mittig in seinem Rahmen.
  surface.position.set(offsetX, -shape.height / 2, offsetZ);
  surface.updateMatrix();
  object.children.forEach((child) => {
    if (!child.userData.shapeEdge) return;
    child.position.copy(surface.position);
    child.rotation.copy(surface.rotation);
    child.scale.copy(surface.scale);
    child.updateMatrix();
  });
  object.updateMatrixWorld(true);
}

export function removeShapeDecorations(object: THREE.Group) {
  object.children
    .filter((child) => Boolean(child.userData.shapeDecoration))
    .forEach((child) => {
      object.remove(child);
      disposeObject(child);
    });
}

export function syncShapeObjectAppearance(object: THREE.Group, shape: WorkplaneShape, selected: boolean, updateSurfaceMaterial: boolean, onTextureReady?: () => void) {
  object.userData.showEdges = selected;
  const groupedContent = object.children.find((child): child is THREE.Group => child instanceof THREE.Group && Boolean(child.userData.groupedShapeContent));
  if (groupedContent && shape.groupedShapes?.length && !shape.importedMesh) {
    shape.groupedShapes
      .filter((child) => !child.hidden)
      .forEach((child) => {
        const childObject = groupedContent.children.find((entry): entry is THREE.Group => entry instanceof THREE.Group && entry.userData.groupChildId === child.id);
        if (!childObject) return;
        const childShape = groupChildAppearance(shape, child);
        syncShapeObjectAppearance(childObject, childShape, selected, updateSurfaceMaterial, onTextureReady);
      });
    object.traverse((child) => {
      child.userData.shapeId = shape.id;
    });
    setObjectRenderLayer(object, RENDER_LAYER_SHAPES);
    freezeStaticObjectMatrices(object);
    return;
  }

  const surface = object.children.find((child): child is THREE.Mesh => child instanceof THREE.Mesh && Boolean(child.userData.shapeSurface));
  if (!surface) return;
  if (updateSurfaceMaterial) {
    const material = sharedShapeMaterial(shape);
    const nextMaterial = shape.kind === "box" && shape.imagePlate && !shape.hole
      ? createImagePlateMaterials(shape, material, onTextureReady)
      : material;
    const currentMaterials = Array.isArray(surface.material) ? surface.material : null;
    const sameMaterial = Array.isArray(nextMaterial)
      ? Boolean(currentMaterials && nextMaterial.every((entry, index) => currentMaterials[index] === entry))
      : surface.material === nextMaterial;
    if (!sameMaterial) {
      replaceObjectMaterials(surface, nextMaterial);
    }
  }
  removeShapeDecorations(object);
  addShapeEdgeDecorations(object, surface, surface.geometry, shape);
  object.traverse((child) => {
    child.userData.shapeId = shape.id;
  });
  setObjectRenderLayer(object, RENDER_LAYER_SHAPES);
  freezeStaticObjectMatrices(object);
}

export function applySectionClipping(state: ThreeState | null, plane: THREE.Plane | null) {
  if (!state) return;
  state.sectionPlane = plane;
  const planes = plane ? [plane] : null;

  state.shapeLayer.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.material) {
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach((mat) => {
        if (!mat) return;
        const hadPlanes = Boolean(mat.clippingPlanes && mat.clippingPlanes.length > 0);
        const willHavePlanes = Boolean(planes && planes.length > 0);
        mat.clippingPlanes = planes;
        mat.clipShadows = true;
        if (hadPlanes !== willHavePlanes) {
          mat.needsUpdate = true;
        }
      });
    }
  });

  // Moving the plane only changes its numbers, which every material reads
  // each frame; a shader rebuild is needed only when clipping starts or stops.
  const setPlanes = (mat: THREE.Material) => {
    const changed = Boolean(mat.clippingPlanes?.length) !== Boolean(planes?.length);
    mat.clippingPlanes = planes;
    mat.clipShadows = true;
    if (changed) mat.needsUpdate = true;
  };
  sharedShapeMaterialCache.forEach((entry) => setPlanes(entry.material));
  sharedLineMaterialCache.forEach(setPlanes);
  // The faces Delete face lights up are cut like the body under them.
  state.cadFaceLayer?.children.forEach((child) => setPlanes((child as THREE.Mesh).material as THREE.Material));

  state.needsRender = true;
}

export function rebuildShapes(
  state: ThreeState | null,
  shapes: WorkplaneShape[],
  selectedIds: string[],
  useOfficialModifierRendering = false,
  workplane: PlacementWorkplane = horizontalPlacementWorkplane(),
) {
  if (!state) {
    return;
  }

  const selected = new Set(selectedIds);
  const visibleShapes = shapes.filter((shape) => !shape.hidden);

  if (useOfficialModifierRendering) {
    disposeChildren(state.shapeLayer);
    state.shapeRecords.clear();
    state.officialShapeLayerActive = true;
    visibleShapes.forEach((shape) => {
      const object = createShapeObject(shape, selected.has(shape.id), () => {
        state.needsRender = true;
      }, false);
      state.shapeLayer.add(object);
    });
    rebuildSelectionHelpers(state, shapes, selectedIds, workplane);
    if (state.sectionPlane) {
      applySectionClipping(state, state.sectionPlane);
    }
    state.needsRender = true;
    return;
  }

  if (state.officialShapeLayerActive) {
    disposeChildren(state.shapeLayer);
    state.shapeRecords.clear();
    state.officialShapeLayerActive = false;
  }

  const visibleIds = new Set(visibleShapes.map((shape) => shape.id));
  state.shapeRecords.forEach((record, id) => {
    if (visibleIds.has(id)) return;
    state.shapeLayer.remove(record.object);
    disposeObject(record.object);
    state.shapeRecords.delete(id);
  });

  visibleShapes.forEach((shape) => {
    const selectedShape = selected.has(shape.id);
    const transformSignature = shapeTransformSignature(shape);
    const materialSignature = shapeMaterialSignature(shape);
    const geometrySignature = shapeGeometrySignature(shape);
    let record = state.shapeRecords.get(shape.id);
    if (record && record.geometrySignature !== geometrySignature) {
      state.shapeLayer.remove(record.object);
      disposeObject(record.object);
      state.shapeRecords.delete(shape.id);
      record = undefined;
    }

    if (!record) {
      const object = createShapeObject(shape, selectedShape, () => {
        state.needsRender = true;
      });
      state.shapeLayer.add(object);
      record = {
        object,
        shape,
        transformSignature,
        materialSignature,
        geometrySignature,
        selected: selectedShape,
      };
      state.shapeRecords.set(shape.id, record);
      return;
    }

    if (record.transformSignature !== transformSignature) {
      updateShapeObjectTransform(record.object, shape);
    }
    record.object.name = shape.name;
    syncShapeObjectDimensions(record.object, shape);
    const materialChanged = record.materialSignature !== materialSignature;
    if (materialChanged || record.selected !== selectedShape) {
      syncShapeObjectAppearance(record.object, shape, selectedShape, materialChanged, () => {
        state.needsRender = true;
      });
    }
    record.shape = shape;
    record.transformSignature = transformSignature;
    record.materialSignature = materialSignature;
    record.geometrySignature = geometrySignature;
    record.selected = selectedShape;
  });


  rebuildSelectionHelpers(state, shapes, selectedIds, workplane);
  if (state.sectionPlane) {
    applySectionClipping(state, state.sectionPlane);
  }
  state.needsRender = true;
}

export function modifierEdgeMaterialStyle(active: boolean, hovered: boolean, previewActive: boolean, belowThreshold = false, failed = false) {
  const subduedSelectedPreviewEdge = previewActive && active && !hovered;
  return {
    color: active ? (failed ? (hovered ? "#ff6b6b" : "#e5242a") : hovered ? "#ffbf45" : "#ff8a1d") : hovered ? "#84edff" : belowThreshold ? "#4d7f91" : "#17b7e5",
    opacity: subduedSelectedPreviewEdge ? 0.18 : active || hovered ? 1 : belowThreshold ? 0.35 : 0.72,
    linewidth: active || hovered ? 3 : 1,
  };
}

// Scaling a view-space point about the camera keeps it on the same pixel; in
// an orthographic view only its depth may change, towards the viewer also for
// a point behind the camera, which that view draws too.
/**
 * The thin edge lines' materials, one per look and shared (marked cached, so taking the lines
 * down leaves them): the lines are built again whenever the pointer moves onto another edge, and
 * a material per edge and per rebuild made three.js compile their shaders again each time.
 */
export const modifierEdgeMaterials = new Map<string, THREE.LineBasicMaterial>();

export function modifierEdgeMaterial(style: { color: string; opacity: number; linewidth: number }, onlyVisible: boolean) {
  const key = `${style.color}:${style.opacity}:${style.linewidth}:${onlyVisible}`;
  let material = modifierEdgeMaterials.get(key);
  if (!material) {
    material = new THREE.LineBasicMaterial({
      color: style.color,
      depthTest: onlyVisible,
      depthWrite: false,
      transparent: true,
      opacity: style.opacity,
      linewidth: style.linewidth,
    });
    if (onlyVisible) pullModifierEdgeTowardCamera(material);
    material.userData.cached = true;
    modifierEdgeMaterials.set(key, material);
  }
  return material;
}

export function pullModifierEdgeTowardCamera(material: THREE.LineBasicMaterial) {
  const pull = MODIFIER_EDGE_DEPTH_PULL.toFixed(4);
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      "#include <project_vertex>",
      `#include <project_vertex>
      if (isOrthographic) mvPosition.z += abs(mvPosition.z) * (1.0 - ${pull});
      else mvPosition.xyz *= ${pull};
      gl_Position = projectionMatrix * mvPosition;`,
    );
  };
  material.customProgramCacheKey = () => "modifier-edge-depth-pull";
}

// Browsers draw a plain WebGL line 1px wide whatever its linewidth says, so the
// hovered edge and the edge to unselect get a screen-space wide line at twice that.
export const WIDE_MODIFIER_EDGE_PX = 2;
// The hovered edge also gets a darker, wider line under it: on the pale floor a
// light blue line alone has hardly any contrast, the outline keeps it readable
// on light and dark ground alike.
export const MODIFIER_EDGE_HALO_PX = 6;
export const MODIFIER_EDGE_HALO_COLOR = "#0a2a3a";

export function wideModifierEdgeLine(state: ThreeState, points: number[], color: string, renderOrder: number, linewidth = WIDE_MODIFIER_EDGE_PX, opacity = 1) {
  const segments: number[] = [];
  for (let index = 3; index + 2 < points.length; index += 3) {
    segments.push(points[index - 3], points[index - 2], points[index - 1], points[index], points[index + 1], points[index + 2]);
  }
  const geometry = new LineSegmentsGeometry();
  geometry.setPositions(segments);
  const line = new LineSegments2(geometry, sharedOverlayLineMaterial(state, { color, linewidth, opacity, depthTest: false }));
  line.renderOrder = renderOrder;
  line.frustumCulled = false;
  setObjectRenderLayer(line, RENDER_LAYER_MODIFIERS);
  return line;
}

export function rebuildModifierEdges(
  state: ThreeState | null,
  edges: CadModifierEdge[],
  selectedIds: number[],
  previewActive = false,
  hoverId: number | null = null,
  highlightedIds: number[] = [],
  failedIds: number[] = [],
  onlyVisible = false,
) {
  if (!state) return;
  disposeChildren(state.modifierLayer);
  const selected = new Set(selectedIds);
  const highlighted = new Set(highlightedIds);
  const failed = new Set(failedIds);
  // Drawn as if no edge were under the pointer; the one that is gets its own lines from
  // setModifierEdgeHover, so moving the pointer onto another edge leaves these thousands alone.
  edges.forEach((edge) => {
    if (edge.points.length < 6) return;
    const active = selected.has(edge.id);
    const belowThreshold = !active && !highlighted.has(edge.id);
    const style = modifierEdgeMaterialStyle(active, false, previewActive, belowThreshold, failed.has(edge.id));
    if (active && failed.has(edge.id)) {
      const wide = wideModifierEdgeLine(state, edge.points, style.color, 1002);
      wide.userData.modifierEdgeId = edge.id;
      state.modifierLayer.add(wide);
      return;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(edge.points, 3));
    const line = new THREE.Line(geometry, modifierEdgeMaterial(style, onlyVisible));
    line.userData.modifierEdgeId = edge.id;
    line.renderOrder = active ? 1002 : 1001;
    setObjectRenderLayer(line, RENDER_LAYER_MODIFIERS);
    freezeStaticObjectMatrices(line);
    state.modifierLayer.add(line);
  });
  setModifierEdgeHover(state, edges, hoverId, selectedIds, previewActive, failedIds);
}

/**
 * The edge under the pointer: a halo and a wide line in its hovered colour, and its own line from
 * rebuildModifierEdges hidden meanwhile. Only these two lines are made again when the pointer moves.
 */
export function setModifierEdgeHover(
  state: ThreeState | null,
  edges: CadModifierEdge[],
  hoverId: number | null,
  selectedIds: number[],
  previewActive = false,
  failedIds: number[] = [],
) {
  if (!state) return;
  const layer = state.modifierLayer;
  layer.children
    .filter((child) => child.userData.modifierEdgeHover)
    .forEach((child) => {
      layer.remove(child);
      disposeObject(child);
    });
  layer.children.forEach((child) => {
    if (typeof child.userData.modifierEdgeId === "number") child.visible = child.userData.modifierEdgeId !== hoverId;
  });
  const edge = hoverId === null ? undefined : edges.find((candidate) => candidate.id === hoverId);
  if (edge && edge.points.length >= 6) {
    const style = modifierEdgeMaterialStyle(selectedIds.includes(edge.id), true, previewActive, false, failedIds.includes(edge.id));
    const halo = wideModifierEdgeLine(state, edge.points, MODIFIER_EDGE_HALO_COLOR, 1002.5, MODIFIER_EDGE_HALO_PX, 0.85);
    const core = wideModifierEdgeLine(state, edge.points, style.color, 1003);
    halo.userData.modifierEdgeHover = true;
    core.userData.modifierEdgeHover = true;
    layer.add(halo, core);
  }
  state.needsRender = true;
}

export function rebuildSelectionHelpers(
  state: ThreeState | null,
  shapes: WorkplaneShape[],
  selectedIds: string[],
  workplane: PlacementWorkplane,
) {
  if (!state) {
    return;
  }

  disposeChildren(state.helperLayer);
  selectedIds.forEach((id) => {
    const shape = shapes.find((entry) => entry.id === id && !entry.hidden);
    if (!shape) {
      return;
    }
    const shadow = createSelectedGroundFootprint(shape, workplane);
    if (shadow) {
      setObjectRenderLayer(shadow, RENDER_LAYER_HELPERS);
      freezeStaticObjectMatrices(shadow);
      state.helperLayer.add(shadow);
    }
  });
}

/**
 * Delete face: the prepared body's own tessellation, kept out of the scene,
 * answers which face is under the pointer. A face hidden behind another body
 * or cut away by the section view is not picked; the body itself does not
 * hide its own faces, its display mesh lies on the same surface.
 */
export function cadFacePickLayerMesh(state: ThreeState, pick: CadFacePick) {
  let layer = state.cadFaceLayer;
  if (!layer) {
    layer = new THREE.Group();
    layer.name = "CadFacePick";
    layer.layers.set(RENDER_LAYER_PREVIEWS);
    layer.visible = false;
    state.cadFaceLayer = layer;
    state.scene.add(layer);
  }
  const existing = state.cadFacePickMesh;
  if (existing && existing.userData.positions === pick.positions) return existing;
  if (existing) disposeCadFacePickMesh(existing);
  const mesh = cadFacePickMesh(pick.positions, pick.indices, RENDER_LAYER_SHAPES);
  mesh.userData.positions = pick.positions;
  state.cadFacePickMesh = mesh;
  return mesh;
}

export function syncCadFaceLayer(state: ThreeState | null, pick: CadFacePick | null, theme: ResolvedAppTheme, hoverFaceId: number | null) {
  if (!state) return;
  if (!pick) {
    if (state.cadFaceLayer) {
      disposeChildren(state.cadFaceLayer);
      state.cadFaceLayer.visible = false;
      state.needsRender = true;
    }
    if (state.cadFacePickMesh) {
      disposeCadFacePickMesh(state.cadFacePickMesh);
      state.cadFacePickMesh = undefined;
    }
    return;
  }
  cadFacePickLayerMesh(state, pick);
  const layer = state.cadFaceLayer;
  if (!layer) return;
  disposeChildren(layer);
  const color = theme === "dark" ? "#69d9ff" : "#079bc6";
  const highlight = (faceIds: number[], opacity: number, renderOrder: number) => {
    const corners = cadFaceHighlightPositions(pick.positions, pick.indices, pick.triangleFaces, faceIds);
    if (corners.length === 0) return;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(corners, 3));
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        side: THREE.DoubleSide,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -3,
        polygonOffsetUnits: -3,
        clippingPlanes: state.sectionPlane ? [state.sectionPlane] : null,
      }),
    );
    mesh.layers.set(RENDER_LAYER_PREVIEWS);
    mesh.renderOrder = renderOrder;
    mesh.raycast = () => undefined;
    layer.add(mesh);
  };
  highlight(pick.selectedFaceIds, 0.55, 960);
  if (hoverFaceId !== null && !pick.selectedFaceIds.includes(hoverFaceId)) highlight([hoverFaceId], 0.3, 961);
  layer.visible = layer.children.length > 0;
  state.needsRender = true;
}

/**
 * Lights up one segment of a bent tube: a slightly wider sleeve over that
 * piece of the tube, placed like the shape itself. Drawn again whenever the
 * shape or the chosen segment changes; nothing is drawn for another shape.
 */
export function syncBentTubeSegment(state: ThreeState | null, shape: WorkplaneShape | null, segment: { shapeId: string; index: number } | null) {
  if (!state) return;
  let layer = state.bentTubeSegmentLayer;
  if (!layer) {
    layer = new THREE.Group();
    layer.name = "BentTubeSegment";
    layer.layers.set(RENDER_LAYER_PREVIEWS);
    layer.visible = false;
    state.bentTubeSegmentLayer = layer;
    state.scene.add(layer);
  }
  disposeChildren(layer);
  layer.visible = false;
  state.needsRender = true;
  if (!shape || shape.kind !== "bentTube" || !segment || segment.shapeId !== shape.id) return;

  const geometry = createBentTubeSegmentGeometry({
    width: shapeWidth(shape),
    depth: shapeDepth(shape),
    height: shape.height,
    bentTubeProfile: shape.bentTubeProfile,
    bentTubeInnerProfile: shape.bentTubeInnerProfile,
    bentTubeSize: shape.bentTubeSize,
    bentTubeWall: shape.bentTubeWall,
    bentTubeQuality: shape.bentTubeQuality,
    bentTubeSegments: shape.bentTubeSegments,
  }, segment.index);
  if (!geometry) return;

  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      color: "#ff9a2e",
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
  );
  mesh.layers.set(RENDER_LAYER_PREVIEWS);
  mesh.renderOrder = 955;
  mesh.raycast = () => undefined;
  mesh.position.y -= shape.height / 2;
  layer.position.set(shape.x, (shape.elevation ?? 0) + shape.height / 2, shape.z);
  layer.rotation.set(
    THREE.MathUtils.degToRad(shape.rotationX ?? 0),
    THREE.MathUtils.degToRad(shape.rotation),
    THREE.MathUtils.degToRad(shape.rotationZ ?? 0),
  );
  layer.scale.set(mirrorSign(shape.mirrorX), mirrorSign(shape.mirrorY), mirrorSign(shape.mirrorZ));
  layer.add(mesh);
  layer.visible = true;
}

/**
 * The footprint's two materials are the same for every selection, so they are made once and
 * shared (marked cached, so taking a footprint down leaves them). A new pair for each footprint
 * was thrown away with it at every change of the selected body, and with it three.js threw away
 * their compiled shaders and compiled them again for the next footprint.
 */
export let selectedFootprintMaterials: { fill: THREE.MeshBasicMaterial; outline: THREE.LineBasicMaterial } | null = null;

export function sharedSelectedFootprintMaterials() {
  if (!selectedFootprintMaterials) {
    const fill = new THREE.MeshBasicMaterial({
      color: "#7f8f95",
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const outline = new THREE.LineBasicMaterial({ color: "#00aeea", transparent: true, opacity: 0.92 });
    fill.userData.cached = true;
    outline.userData.cached = true;
    selectedFootprintMaterials = { fill, outline };
  }
  return selectedFootprintMaterials;
}

export function createSelectedGroundFootprint(shape: WorkplaneShape, workplane: PlacementWorkplane) {
  const frame = selectionFrameForShapes([shape], [shape.id], workplane);
  if (!frame) {
    return null;
  }

  const footprint = groundFootprintForFrame(frame, workplane);
  if (!footprint) {
    return null;
  }

  const group = new THREE.Group();
  group.name = "SelectedGroundFootprint";
  group.userData.shapeId = shape.id;

  // The footprint is convex, so a fan from its first corner fills it.
  const fillPositions: number[] = [];
  for (let index = 1; index < footprint.length - 1; index += 1) {
    [footprint[0], footprint[index], footprint[index + 1]].forEach((point) => fillPositions.push(point.x, point.y, point.z));
  }
  const fillGeometry = new THREE.BufferGeometry();
  fillGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(fillPositions), 3));
  fillGeometry.computeVertexNormals();
  const materials = sharedSelectedFootprintMaterials();
  const fill = new THREE.Mesh(fillGeometry, materials.fill);
  group.add(fill);

  const points = [...footprint, footprint[0].clone()];
  const outline = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), materials.outline);
  outline.userData.shapeId = shape.id;
  group.add(outline);

  return group;
}

export function sharedShapeGeometry(key: string, create: () => THREE.BufferGeometry) {
  const cached = sharedShapeGeometryCache.get(key);
  if (cached) {
    sharedShapeGeometryCache.delete(key);
    sharedShapeGeometryCache.set(key, cached);
    return cached.geometry;
  }
  const geometry = putGeometryOnBase(create());
  geometry.userData.cached = true;
  geometry.userData.sharedShapeGeometryKey = key;
  sharedShapeGeometryCache.set(key, { geometry, users: 0 });
  return geometry;
}


export function retainSharedShapeGeometry(mesh: THREE.Mesh, geometry: THREE.BufferGeometry) {
  const key = geometry.userData.sharedShapeGeometryKey as string | undefined;
  if (!key) return;
  const entry = sharedShapeGeometryCache.get(key);
  if (!entry || entry.geometry !== geometry) return;
  entry.users += 1;
  mesh.userData.sharedShapeGeometryKey = key;
  trimSharedShapeGeometryCache();
}


/** A group hands its hole or see-through state down to every child it draws. */
export function groupChildAppearance(group: WorkplaneShape, child: WorkplaneShape): WorkplaneShape {
  if (group.hole) return { ...child, hole: true, color: "#b8c2cc" };
  // One colour for the whole group, nested groups included.
  const tinted = groupShowsPartColors(group) ? child : { ...child, color: group.color, multicolor: false };
  if (group.transparent) return { ...tinted, transparent: true };
  return tinted;
}

// A see-through solid keeps its colour. It writes no depth, so what lies
// behind or inside it - and the faces where it touches another body - stays
// visible from every side.
export const TRANSPARENT_SOLID_OPACITY = 0.4;

export function holeOpacity(shape: WorkplaneShape) {
  if (strongHoles) return shape.importedMesh ? 0.6 : 0.72;
  return shape.importedMesh ? 0.34 : 0.52;
}

export function sharedShapeMaterial(shape: WorkplaneShape, vertexColors = false) {
  const seeThrough = !shape.hole && Boolean(shape.transparent);
  const color = shape.hole ? (strongHoles ? STRONG_HOLE_COLOR : "#b7c0c9") : vertexColors ? "#ffffff" : shape.color;
  const key = JSON.stringify({
    color,
    vertexColors,
    transparent: Boolean(shape.hole) || seeThrough,
    opacity: shape.hole ? holeOpacity(shape) : seeThrough ? TRANSPARENT_SOLID_OPACITY : 1,
    roughness: shape.hole ? 0.88 : 0.57,
    depthWrite: !seeThrough,
    side: "double",
  });
  const cached = sharedShapeMaterialCache.get(key);
  if (cached) {
    sharedShapeMaterialCache.delete(key);
    sharedShapeMaterialCache.set(key, cached);
    return cached.material;
  }
  const material = new THREE.MeshStandardMaterial({
    color,
    vertexColors,
    transparent: Boolean(shape.hole) || seeThrough,
    opacity: shape.hole ? holeOpacity(shape) : seeThrough ? TRANSPARENT_SOLID_OPACITY : 1,
    roughness: shape.hole ? 0.88 : 0.57,
    metalness: 0.02,
    depthWrite: !seeThrough,
    side: THREE.DoubleSide,
  });
  if (!shape.hole) addOverhangTint(material);
  material.userData.cached = true;
  material.userData.sharedShapeMaterialKey = key;
  sharedShapeMaterialCache.set(key, { material, users: 0 });
  return material;
}

/**
 * Overhangs hatched red and white, so they show on a red body too - worked out per pixel from the face's own normal in world
 * space - steeper than the limit towards the ground and not lying on the
 * plate. Same rule as overhangArea() for MCP.
 */
export function addOverhangTint(material: THREE.MeshStandardMaterial) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, overhangUniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vOverhangNormal;\nvarying float vOverhangY;")
      .replace(
        "#include <project_vertex>",
        "#include <project_vertex>\nvOverhangNormal = normalize( transpose( inverse( mat3( modelMatrix ) ) ) * objectNormal );\nvOverhangY = ( modelMatrix * vec4( transformed, 1.0 ) ).y;",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec3 vOverhangNormal;\nvarying float vOverhangY;\nuniform float uOverhangOn;\nuniform float uOverhangLimit;\nuniform float uOverhangPlateY;\nuniform vec3 uOverhangColor;",
      )
      .replace(
        "#include <color_fragment>",
        "#include <color_fragment>\nif ( uOverhangOn > 0.5 && vOverhangY > uOverhangPlateY && -normalize( vOverhangNormal ).y > uOverhangLimit ) diffuseColor.rgb = mod( gl_FragCoord.x + gl_FragCoord.y, 14.0 ) < 7.0 ? uOverhangColor : vec3( 1.0, 0.86, 0.82 );",
      );
  };
  material.customProgramCacheKey = () => "layerling-overhang";
}


export function retainSharedShapeMaterials(mesh: THREE.Mesh, materials: THREE.Material | THREE.Material[]) {
  const retained: string[] = [];
  (Array.isArray(materials) ? materials : [materials]).forEach((material) => {
    const key = material.userData.sharedShapeMaterialKey as string | undefined;
    if (!key || retained.includes(key)) return;
    const entry = sharedShapeMaterialCache.get(key);
    if (!entry || entry.material !== material) return;
    entry.users += 1;
    retained.push(key);
  });
  mesh.userData.sharedShapeMaterialKeys = retained;
  trimSharedShapeMaterialCache();
}


export function sharedLineMaterial(color: string, opacity: number, depthWrite = true) {
  const key = `${color}|${opacity}|${depthWrite}`;
  const cached = sharedLineMaterialCache.get(key);
  if (cached) return cached;
  const material = new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite });
  material.userData.cached = true;
  sharedLineMaterialCache.set(key, material);
  return material;
}


export function replaceObjectMaterials(object: THREE.Mesh, materials: THREE.Material | THREE.Material[]) {
  const previous = Array.isArray(object.material) ? object.material : [object.material];
  releaseSharedShapeMaterials(object);
  object.material = materials;
  retainSharedShapeMaterials(object, materials);
  previous.forEach(disposeMaterialResource);
  trimSharedShapeMaterialCache();
}

function geometryTriangleCount(geometry: THREE.BufferGeometry) {
  const position = geometry.getAttribute("position");
  return geometry.getIndex()?.count
    ? Math.floor((geometry.getIndex()?.count ?? 0) / 3)
    : Math.floor((position?.count ?? 0) / 3);
}

/** From this size a treated body's mesh gets a picking tree: a ray then costs 0.01 ms instead of 1 ms and up (14 ms at 400,000). */
export const TREATED_BVH_TRIANGLE_THRESHOLD = 20_000;

/**
 * A body with edge treatments is rebuilt for every preview and every change, so it gets no tree up front.
 * A large one builds it the first time a ray is cast against it (the tape measure, placing a shape on it).
 */
export function enableLazyMeshPicking(mesh: THREE.Mesh, geometry: THREE.BufferGeometry) {
  if (geometryTriangleCount(geometry) < TREATED_BVH_TRIANGLE_THRESHOLD) return;
  mesh.raycast = function lazyAcceleratedRaycast(this: THREE.Mesh, raycaster, intersects) {
    if (!(geometry as THREE.BufferGeometry & { boundsTree?: unknown }).boundsTree) computeImportedBoundsTree(geometry);
    acceleratedRaycast.call(this, raycaster, intersects);
  };
}

export function enableAcceleratedMeshPicking(mesh: THREE.Mesh, geometry: THREE.BufferGeometry, force = false) {
  const triangles = geometryTriangleCount(geometry);
  mesh.raycast = acceleratedRaycast;
  const bvhGeometry = geometry as THREE.BufferGeometry & { boundsTree?: unknown };
  if ((force || triangles >= BVH_PICKING_TRIANGLE_THRESHOLD) && !bvhGeometry.boundsTree) {
    computeImportedBoundsTree(geometry);
  }
}

export function createShapeObject(
  shape: WorkplaneShape,
  showEdges = false,
  onTextureReady?: () => void,
  acceleratedPicking = true,
) {
  const group = new THREE.Group();
  group.name = shape.name;
  group.userData.shapeId = shape.id;
  group.userData.showEdges = showEdges;
  group.userData.acceleratedPicking = acceleratedPicking;
  group.userData.tapeDimensions = [shapeWidth(shape), shape.height, shapeDepth(shape)] satisfies [number, number, number];
  group.userData.tapeTopologyKey = tapeShapeTopologyKey(shape);
  group.position.set(shape.x, (shape.elevation ?? 0) + shape.height / 2, shape.z);
  group.rotation.set(
    THREE.MathUtils.degToRad(shape.rotationX ?? 0),
    THREE.MathUtils.degToRad(shape.rotation),
    THREE.MathUtils.degToRad(shape.rotationZ ?? 0),
  );
  group.scale.set(mirrorSign(shape.mirrorX), mirrorSign(shape.mirrorY), mirrorSign(shape.mirrorZ));

  if (shape.groupedShapes?.length && !shape.importedMesh) {
    const content = new THREE.Group();
    content.userData.groupedShapeContent = true;
    shape.groupedShapes
      .filter((child) => !child.hidden)
      .forEach((child) => {
        const childShape = groupChildAppearance(shape, child);
        const childObject = createShapeObject(childShape, showEdges, onTextureReady, acceleratedPicking);
        childObject.userData.groupChildId = child.id;
        content.add(childObject);
      });
    // Measured on the real vertices: the box of a turned part's own bounding box is wider than
    // the part, which stretched the content to a smaller size (a bundle shrank, #152).
    const contentBox = new THREE.Box3().setFromObject(content, true);
    const contentSize = contentBox.getSize(new THREE.Vector3());
    content.scale.set(
      shapeWidth(shape) / Math.max(0.001, contentSize.x),
      shape.height / Math.max(0.001, contentSize.y),
      shapeDepth(shape) / Math.max(0.001, contentSize.z),
    );
    content.position.y = -shape.height / 2;
    group.add(content);
    applyGroupedContentTaper(content, shape, contentBox);
    group.traverse((child) => {
      child.userData.shapeId = shape.id;
    });
    setObjectRenderLayer(group, RENDER_LAYER_SHAPES);
    freezeStaticObjectMatrices(group);
    return group;
  }

  const material = sharedShapeMaterial(shape);

  const width = shapeWidth(shape);
  const depth = shapeDepth(shape);
  const size = Math.min(width, depth);
  const height = shape.height;
  const geometryCacheKey = shapeGeometrySignature(shape);

  switch (shape.kind) {
    case "box":
      addMesh(
        group,
        sharedShapeGeometry(
          geometryCacheKey,
          () => shape.radius && shape.radius > 0
            ? new RoundedBoxGeometry(width, height, depth, Math.max(1, shape.steps ?? 10), shape.radius)
            : new THREE.BoxGeometry(1, 1, 1),
        ),
        shape.imagePlate && !shape.hole ? createImagePlateMaterials(shape, material, onTextureReady) : material,
        shape,
        undefined,
        undefined,
        shape.radius && shape.radius > 0 ? undefined : new THREE.Vector3(width, height, depth),
      );
      break;
    case "ruler":
      addMesh(
        group,
        sharedShapeGeometry(geometryCacheKey, () => new THREE.BoxGeometry(1, 1, 1)),
        createRulerMaterials(shape, material),
        shape,
        undefined,
        undefined,
        new THREE.Vector3(width, height, depth),
      );
      break;
    case "cylinder":
    case "ellipse":
    case "polygon": {
      // Zylinder, Ellipse und Mehrkant sind derselbe Koerper, nur mit anderer
      // Seitenzahl bzw. Fussabdruck. Die Geometrie bleibt ein Einheitskoerper
      // und wird ueber die Maschenskalierung in den Rahmen gesetzt - so baut
      // ein Zug am Anfasser nicht jedes Mal ein neues Vieleck.
      const sides = polygonSidesForShape(shape);
      const fit = regularPolygonFootprintScale(width, depth, sides);
      addMesh(
        group,
        sharedShapeGeometry(geometryCacheKey, () => new THREE.CylinderGeometry(1, 1, 1, sides, shape.segments ?? 1)),
        material,
        shape,
        new THREE.Vector3(fit.offsetX, 0, fit.offsetZ),
        undefined,
        new THREE.Vector3(fit.x, height, fit.z),
      );
      break;
    }
    case "counterbore":
    case "countersink":
    case "doubleCountersink":
      addMesh(group, sharedShapeGeometry(geometryCacheKey, () => createScrewHoleGeometry({ kind: shape.kind as "counterbore" | "countersink" | "doubleCountersink", width, depth, height, screwHoleShaft: shape.screwHoleShaft, screwHoleHeadDepth: shape.screwHoleHeadDepth, screwHoleAngle: shape.screwHoleAngle, sides: roundSideCount(shape.sides, width, depth) })), material, shape);
      break;
    case "teardrop":
      addMesh(group, sharedShapeGeometry(geometryCacheKey, () => createTeardropGeometry({ width, depth, height, sides: roundSideCount(shape.sides, width, depth) })), material, shape);
      break;
    case "knurl":
      addMesh(group, sharedShapeGeometry(geometryCacheKey, () => createKnurlGeometry({ width, height, knurlPattern: shape.knurlPattern, knurlCount: shape.knurlCount, knurlDepth: shape.knurlDepth, knurlAngle: shape.knurlAngle, knurlChamfer: shape.knurlChamfer })), material, shape);
      break;
    case "vase":
      addMesh(group, sharedShapeGeometry(geometryCacheKey, () => createVaseGeometry({ width, depth, height, vase: shape.vase })), material, shape);
      break;
    case "hinge":
      addMesh(group, sharedShapeGeometry(geometryCacheKey, () => createHingeGeometry({
        width,
        depth,
        height,
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
        sides: shape.sides,
      })), material, shape);
      break;
    case "gridfinity":
      addMesh(group, sharedShapeGeometry(geometryCacheKey, () => createGridfinityGeometry({
        width,
        depth,
        height,
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
      })), material, shape);
      break;
    case "loft":
      addMesh(group, sharedShapeGeometry(geometryCacheKey, () => createLoftGeometry({ ...shape, width, depth, height })), material, shape);
      break;
    case "dovetail":
      addMesh(group, sharedShapeGeometry(geometryCacheKey, () => createDovetailGeometry({
        width,
        depth,
        height,
        dovetailNeckWidth: shape.dovetailNeckWidth,
        dovetailClearance: shape.dovetailClearance,
        hole: shape.hole,
      })), material, shape);
      break;
    case "slot":
      addMesh(group, sharedShapeGeometry(geometryCacheKey, () => createSlotGeometry({
        width,
        depth,
        height,
        sides: shape.sides,
        slotEndRatio: shape.slotEndRatio,
      })), material, shape);
      break;
    case "sphere": {
      const { widthSegments, heightSegments } = sphereTessellation(shape.steps);
      addMesh(group, sharedShapeGeometry(geometryCacheKey, () => new THREE.SphereGeometry(1, widthSegments, heightSegments)), material, shape, undefined, undefined, new THREE.Vector3(width / 2, height / 2, depth / 2));
      break;
    }
    case "cone":
      addMesh(
        group,
        sharedShapeGeometry(geometryCacheKey, () => new THREE.CylinderGeometry(shape.topRadius ?? 0, shape.baseRadius ?? width / 2, height, roundSideCount(shape.sides, width, depth))),
        material,
        shape,
        undefined,
        undefined,
        new THREE.Vector3(1, 1, depth / Math.max(0.001, width)),
      );
      break;
    case "pyramid":
      addMesh(group, sharedShapeGeometry(geometryCacheKey, () => createPyramidGeometry(width, height, depth, shape.sides ?? 4, shape.topWidth, shape.topDepth)), material, shape);
      break;
    case "roof":
      addMesh(group, sharedShapeGeometry(geometryCacheKey, () => createRoofGeometry(width, height, depth)), material, shape);
      break;
    case "roundRoof":
      addMesh(group, sharedShapeGeometry(geometryCacheKey, () => createRoundRoofGeometry(width, height, depth, shape.sides ?? 64)), material, shape);
      break;
    case "halfSphere":
      addMesh(group, sharedShapeGeometry(geometryCacheKey, () => createHalfSphereGeometry(width, height, depth, shape.steps ?? 32)), material, shape);
      break;
    case "paraboloid":
      addMesh(group, sharedShapeGeometry(geometryCacheKey, () => createParaboloidGeometry(width, height, depth, shape.steps ?? 32)), material, shape);
      break;
    case "torus":
      addMesh(group, sharedShapeGeometry(geometryCacheKey, () => createTorusGeometry(width, height, depth, shape)), material, shape);
      break;
    case "ring":
    case "tube":
      addMesh(group, sharedShapeGeometry(geometryCacheKey, () => createHollowCylinderGeometry(width, height, depth, shape.bevel ?? 4, roundSideCount(shape.sides, width, depth))), material, shape);
      break;
    case "star":
      addMesh(group, sharedShapeGeometry(geometryCacheKey, () => createStarGeometry({
        width,
        depth,
        height,
        starPoints: shape.starPoints,
        starInnerSize: shape.starInnerSize,
        starOuterFillet: shape.starOuterFillet,
        starInnerFillet: shape.starInnerFillet,
        starQuality: shape.starQuality,
      })), material, shape);
      break;
    case "heart":
      addMesh(group, sharedShapeGeometry(geometryCacheKey, () => createHeartGeometry({
        width,
        depth,
        height,
        heartTipFillet: shape.heartTipFillet,
        heartQuality: shape.heartQuality,
      })), material, shape);
      break;
    case "crescent":
      addMesh(group, sharedShapeGeometry(geometryCacheKey, () => createCrescentGeometry({
        width,
        depth,
        height,
        crescentThickness: shape.crescentThickness,
        crescentTipFillet: shape.crescentTipFillet,
        crescentQuality: shape.crescentQuality,
      })), material, shape);
      break;
    case "gear":
      addMesh(group, sharedShapeGeometry(geometryCacheKey, () => createGearGeometry({
        width,
        depth,
        height,
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
      })), material, shape);
      break;
    case "honeycomb":
      addMesh(group, sharedShapeGeometry(geometryCacheKey, () => createHoneycombGeometry({
        width,
        depth,
        height,
        honeycombCellSize: shape.honeycombCellSize,
        honeycombWallThickness: shape.honeycombWallThickness,
        honeycombFrameWidth: shape.honeycombFrameWidth,
      })), material, shape);
      break;
    case "bentTube":
      addMesh(group, sharedShapeGeometry(geometryCacheKey, () => createBentTubeGeometry({
        width,
        depth,
        height,
        bentTubeProfile: shape.bentTubeProfile,
        bentTubeInnerProfile: shape.bentTubeInnerProfile,
        bentTubeSize: shape.bentTubeSize,
        bentTubeWall: shape.bentTubeWall,
        bentTubeQuality: shape.bentTubeQuality,
        bentTubeSegments: shape.bentTubeSegments,
      })), material, shape);
      break;
    case "roundedBox":
      addMesh(group, sharedShapeGeometry(geometryCacheKey, () => createRoundedBoxGeometry({
        width,
        depth,
        height,
        cornerFillet: shape.cornerFillet,
        topBottomFillet: shape.topBottomFillet,
        roundedBoxQuality: shape.roundedBoxQuality,
      })), material, shape);
      break;
    case "thread":
      addMesh(group, sharedShapeGeometry(geometryCacheKey, () => createThreadGeometry({
        width,
        depth,
        height,
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
      })), material, shape);
      break;
    case "spring":
      addMesh(group, sharedShapeGeometry(geometryCacheKey, () => createSpringGeometry({
        width,
        depth,
        height,
        springTurns: shape.springTurns,
        springWire: shape.springWire,
        springHand: shape.springHand,
        springQuality: shape.springQuality,
      })), material, shape);
      break;
    case "wedge":
      addMesh(group, sharedShapeGeometry(geometryCacheKey, () => createWedgeGeometry(width, height, depth)), material, shape);
      break;
    case "icosahedron":
      addMesh(group, sharedShapeGeometry(geometryCacheKey, () => new THREE.IcosahedronGeometry(size / 2, 1)), material, shape);
      break;
    case "text":
      addTextShape(group, material, shape, geometryCacheKey);
      break;
    case "mesh":
      if (shape.importedMesh) {
        const preserveEdgeSize = preservesEdgeTreatmentSize(shape);
        const partColored = !preserveEdgeSize && !shape.hole && groupShowsPartColors(shape) ? getPartColoredMeshGeometry(shape) : null;
        addMesh(
          group,
          partColored ?? (preserveEdgeSize ? getPreservedImportedMeshGeometry(shape) : getImportedMeshGeometry(shape.importedMesh)),
          partColored ? sharedShapeMaterial(shape, true) : material,
          shape,
          undefined,
          undefined,
          preserveEdgeSize ? undefined : new THREE.Vector3(
            width / Math.max(0.001, shape.importedMesh.baseWidth),
            height / Math.max(0.001, shape.importedMesh.baseHeight),
            depth / Math.max(0.001, shape.importedMesh.baseDepth),
          ),
        );
      } else {
        addMesh(group, sharedShapeGeometry(geometryCacheKey, () => new THREE.BoxGeometry(size, Math.max(3, height * 0.35), size * 0.72)), material, shape);
      }
      break;
    case "scribble":
      addMesh(group, sharedShapeGeometry(geometryCacheKey, () => new THREE.TorusKnotGeometry(size * 0.22, size * 0.055, 120, 12)), material, shape);
      break;
    case "sketch":
    default:
      addMesh(group, sharedShapeGeometry(geometryCacheKey, () => new THREE.BoxGeometry(size, Math.max(3, height * 0.35), size * 0.72)), material, shape);
      break;
  }

  group.traverse((child) => {
    child.userData.shapeId = shape.id;
  });
  setObjectRenderLayer(group, RENDER_LAYER_SHAPES);
  freezeStaticObjectMatrices(group);

  return group;
}

export const RULER_TICK_TEXTURE_WIDTH = 2048;

/** From this width across (mm), a ruler carries both scales, millimetres and inches (#913). */
export const RULER_TWO_SCALES_MIN_WIDTH = 15;

/** Whether the rulers are scaled in inches: the workspace's unit is Imperial (#500). Read when a ruler is built, and part of its geometry key. */
export let rulerInchScale = false;

export function setRulerInchScale(inches: boolean) {
  rulerInchScale = inches;
}

/**
 * Zeichnet Teilstriche und Zehner-Zahlen auf einen deckenden Untergrund in der
 * Lineal-Farbe - anders als bei einer Bild-Deckplatte gibt es hier kein Foto,
 * das die Flaeche ohnehin fuellt, also muss die Tinte selbst fuer den
 * Untergrund sorgen, sonst waere die Deckflaeche stellenweise durchsichtig.
 */
export function createRulerTickTexture(length: number, crossWidth: number, baseColor: string, inches = false) {
  const canvas = document.createElement("canvas");
  canvas.width = RULER_TICK_TEXTURE_WIDTH;
  canvas.height = Math.max(1, Math.round((RULER_TICK_TEXTURE_WIDTH * crossWidth) / Math.max(1, length)));
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.fillStyle = baseColor;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#1a1a1a";
  context.strokeStyle = "#1a1a1a";
  context.textAlign = "center";
  context.textBaseline = "top";
  const pxPerMm = canvas.width / length;
  // Wide enough for two rows of lines (#913): the scale of the unit goes along the top edge, the other one along the bottom edge.
  const both = crossWidth >= RULER_TWO_SCALES_MIN_WIDTH;
  const drawScale = (inchScale: boolean, fromBottom: boolean) => {
    // The numbers stand a ten millimetres or an inch apart, so they get that much room.
    const labelRoom = pxPerMm * (inchScale ? 24 : 9);
    const reach = both ? 0.5 : 1;
    rulerTicks(length, inchScale).forEach((tick) => {
      const x = tick.offset * pxPerMm;
      const end = canvas.height * tick.height * reach;
      context.lineWidth = tick.label !== undefined ? 3 : 1.6;
      context.beginPath();
      context.moveTo(x, fromBottom ? canvas.height : 0);
      context.lineTo(x, fromBottom ? canvas.height - end : end);
      context.stroke();
      if (tick.label !== undefined) {
        context.font = `600 ${Math.round(canvas.height * (both ? 0.17 : 0.24))}px ${WORKPLANE_LABEL_FONT_STACK}`;
        if (!both) context.fillText(tick.label, x, canvas.height * 0.66, labelRoom);
        else if (fromBottom) {
          context.textBaseline = "bottom";
          context.fillText(tick.label, x, canvas.height * (1 - tick.height * reach) - 2, labelRoom);
          context.textBaseline = "top";
        } else {
          context.fillText(tick.label, x, end + 2, labelRoom);
        }
      }
    });
  };
  drawScale(inches, false);
  if (both) drawScale(!inches, true);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

export function createRulerMaterials(shape: WorkplaneShape, sideMaterial: THREE.MeshStandardMaterial) {
  const sideMaterials = Array.from({ length: 5 }, (_, index) => (index === 0 ? sideMaterial : sideMaterial.clone()));
  const topMaterial = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.55, metalness: 0 });
  const texture = createRulerTickTexture(shapeWidth(shape), shapeDepth(shape), shape.color, rulerInchScale);
  if (texture) topMaterial.map = texture;
  return [sideMaterials[0], sideMaterials[1], topMaterial, sideMaterials[2], sideMaterials[3], sideMaterials[4]];
}

export function createImagePlateMaterials(shape: WorkplaneShape, sideMaterial: THREE.MeshStandardMaterial, onTextureReady?: () => void) {
  const sideMaterials = Array.from({ length: 5 }, (_, index) => (index === 0 ? sideMaterial : sideMaterial.clone()));
  // A reference image (#680) is drawn as see-through as it is set; its thin sides go with it.
  const opacity = referenceImageOpacity(shape);
  const seeThrough = opacity < 0.999;
  if (seeThrough) {
    sideMaterials.forEach((side, index) => {
      const faded = index === 0 ? side.clone() : side;
      faded.transparent = true;
      faded.opacity = Math.min(faded.opacity, opacity);
      faded.depthWrite = false;
      sideMaterials[index] = faded;
    });
  }
  const topMaterial = new THREE.MeshStandardMaterial({
    color: "#ffffff",
    roughness: 0.64,
    metalness: 0,
    transparent: true,
    opacity,
    depthWrite: !seeThrough,
    alphaTest: 0.02,
    side: THREE.FrontSide,
  });

  if (shape.imagePlate?.dataUrl) {
    const texture = imageTextureLoader.load(shape.imagePlate.dataUrl, () => {
      texture.needsUpdate = true;
      topMaterial.needsUpdate = true;
      onTextureReady?.();
    });
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    topMaterial.map = texture;
  }

  return [
    sideMaterials[0],
    sideMaterials[1],
    topMaterial,
    sideMaterials[2],
    sideMaterials[3],
    sideMaterials[4],
  ];
}

export function taperGeometryForShape(geometry: THREE.BufferGeometry, shape: WorkplaneShape) {
  if (!shapeHasShapeDeform(shape)) return geometry;
  let tapered = geometry.userData.cached ? geometry.clone() : geometry;
  if (tapered !== geometry) {
    tapered.userData = {};
  }
  tapered.computeBoundingBox();
  const box = tapered.boundingBox;
  if (!box || !tapered.getAttribute("position")) return tapered;
  // A twist needs vertices partway up to turn; a box or prism has none between its ends (#184).
  const bands = twistBandCount(shape.extrudeTwist ?? 0);
  // (An image plate keeps its material groups for the picture; it is left as it was.)
  if (bands > 1 && !shape.imagePlate) {
    const flat = tapered.index ? tapered.toNonIndexed() : tapered;
    const sliced = new THREE.BufferGeometry();
    // Lengths across are judged in millimetres, also for a unit body stretched afterwards.
    const drawnX = Math.max(1e-6, box.max.x - box.min.x);
    const drawnZ = Math.max(1e-6, box.max.z - box.min.z);
    const drawnY = Math.max(1e-6, box.max.y - box.min.y);
    const mm: [number, number, number] = [shapeWidth(shape) / drawnX, shape.height / drawnY, shapeDepth(shape) / drawnZ];
    sliced.setAttribute("position", new THREE.BufferAttribute(positionsForTwist(flat.getAttribute("position").array, box.min.y, box.max.y, shape.extrudeTwist ?? 0, mm), 3));
    if (flat !== tapered) flat.dispose();
    if (!tapered.userData.cached) tapered.dispose();
    tapered = sliced;
  }
  const position = tapered.getAttribute("position");
  const height = Math.max(1e-6, box.max.y - box.min.y);
  // A star turns about its own middle, not about the middle of its box (#476).
  const aboutOrigin = deformsAboutOrigin(shape.kind);
  const centerX = aboutOrigin ? 0 : (box.min.x + box.max.x) / 2;
  const centerZ = aboutOrigin ? 0 : (box.min.z + box.max.z) / 2;
  const deformed = shapeHasExtrudeDeform(shape);
  // A box, cylinder, polygon or sphere is drawn as a unit body (1 or 2 across) and stretched to
  // size afterwards; a turn and a lean belong to the stretched body, so they are worked out in
  // millimetres. A body drawn at its own size stretches by about 1 and is left alone.
  const stretch = (size: number, drawn: number) => {
    const factor = Math.max(1e-6, size) / Math.max(1e-6, drawn);
    return Math.abs(factor - 1) < 0.05 ? 1 : factor;
  };
  const scaleX = stretch(shapeWidth(shape), box.max.x - box.min.x);
  const scaleZ = stretch(shapeDepth(shape), box.max.z - box.min.z);
  const unit = scaleX !== 1 || scaleZ !== 1;
  for (let index = 0; index < position.count; index += 1) {
    const y = position.getY(index);
    const normalizedHeight = (y - box.min.y) / height;
    const widthScale = shapeTaperScaleAt(shape, normalizedHeight, "width");
    const depthScale = shapeTaperScaleAt(shape, normalizedHeight, "depth");
    let localX = centerX + (position.getX(index) - centerX) * widthScale;
    let localZ = centerZ + (position.getZ(index) - centerZ) * depthScale;
    if (deformed) {
      const deform = shapeExtrudeDeformAt(shape, normalizedHeight);
      const cos = Math.cos(deform.twistRadians);
      const sin = Math.sin(deform.twistRadians);
      const relativeX = (localX - centerX) * scaleX;
      const relativeZ = (localZ - centerZ) * scaleZ;
      localX = centerX + (relativeX * cos - relativeZ * sin + deform.offsetX) / scaleX;
      localZ = centerZ + (relativeX * sin + relativeZ * cos + deform.offsetZ) / scaleZ;
    }
    position.setXYZ(index, localX, y, localZ);
  }
  position.needsUpdate = true;
  if (bands > 1 && !shape.imagePlate) {
    // Smooth across the small folds between the bands, sharp at the body's own edges - judged in
    // millimetres: a unit body stretched afterwards would show its folds steeper or flatter.
    // The body stays in millimetres from here on, so its edge lines are judged there too;
    // addMesh takes the stretch it already holds out of the mesh's own.
    const scaleY = unit ? stretch(shape.height, box.max.y - box.min.y) : 1;
    if (unit) tapered.scale(scaleX, scaleY, scaleZ);
    tapered = toCreasedNormals(tapered, Math.PI / 6);
    if (unit) tapered.userData.stretchedBy = [scaleX, scaleY, scaleZ];
  } else {
    tapered.computeVertexNormals();
  }
  tapered.computeBoundingBox();
  tapered.computeBoundingSphere();
  return tapered;
}

export function applyGroupedContentTaper(content: THREE.Group, shape: WorkplaneShape, baseBounds: THREE.Box3) {
  if (!shapeHasShapeDeform(shape)) return;
  const height = Math.max(1e-6, baseBounds.max.y - baseBounds.min.y);
  const centerX = (baseBounds.min.x + baseBounds.max.x) / 2;
  const centerZ = (baseBounds.min.z + baseBounds.max.z) / 2;
  const deformed = shapeHasExtrudeDeform(shape);
  content.updateMatrixWorld(true);
  const contentWorldInverse = content.matrixWorld.clone().invert();
  content.traverse((object) => {
    if (!(object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.LineSegments)) return;
    if (!(object.geometry instanceof THREE.BufferGeometry)) return;
    const sourcePosition = object.geometry.getAttribute("position");
    if (!sourcePosition) return;
    object.updateMatrixWorld(true);
    const localToContent = new THREE.Matrix4().multiplyMatrices(contentWorldInverse, object.matrixWorld);
    const contentToLocal = localToContent.clone().invert();
    if (object instanceof THREE.Mesh) {
      releaseSharedShapeGeometry(object);
    }
    const nextGeometry = object.geometry.clone();
    nextGeometry.userData = {};
    const position = nextGeometry.getAttribute("position");
    const point = new THREE.Vector3();
    for (let index = 0; index < position.count; index += 1) {
      point.fromBufferAttribute(position, index).applyMatrix4(localToContent);
      const normalizedHeight = (point.y - baseBounds.min.y) / height;
      const widthScale = shapeTaperScaleAt(shape, normalizedHeight, "width");
      const depthScale = shapeTaperScaleAt(shape, normalizedHeight, "depth");
      point.x = centerX + (point.x - centerX) * widthScale;
      point.z = centerZ + (point.z - centerZ) * depthScale;
      if (deformed) {
        const deform = shapeExtrudeDeformAt(shape, normalizedHeight);
        const cos = Math.cos(deform.twistRadians);
        const sin = Math.sin(deform.twistRadians);
        const relativeX = point.x - centerX;
        const relativeZ = point.z - centerZ;
        point.x = centerX + relativeX * cos - relativeZ * sin + deform.offsetX;
        point.z = centerZ + relativeX * sin + relativeZ * cos + deform.offsetZ;
      }
      point.applyMatrix4(contentToLocal);
      position.setXYZ(index, point.x, point.y, point.z);
    }
    position.needsUpdate = true;
    if (object instanceof THREE.Mesh) {
      nextGeometry.computeVertexNormals();
    }
    nextGeometry.computeBoundingBox();
    nextGeometry.computeBoundingSphere();
    object.geometry = nextGeometry;
    if (object instanceof THREE.Mesh && content.userData.acceleratedPicking !== false) {
      enableAcceleratedMeshPicking(object, nextGeometry, Boolean(shape.importedMesh));
    }
  });
}

export function addMesh(
  group: THREE.Group,
  geometry: THREE.BufferGeometry,
  material: THREE.Material | THREE.Material[],
  shape: WorkplaneShape,
  position?: THREE.Vector3,
  rotation?: THREE.Euler,
  scale?: THREE.Vector3,
) {
  const based = geometry.userData.cached ? geometry : putGeometryOnBase(geometry);
  const prepared = taperGeometryForShape(based, shape);
  const mesh = new THREE.Mesh(prepared, material);
  mesh.userData.shapeSurface = true;
  retainSharedShapeGeometry(mesh, prepared);
  retainSharedShapeMaterials(mesh, material);
  if (group.userData.acceleratedPicking !== false) {
    if (shape.edgeTreatments?.length) enableLazyMeshPicking(mesh, prepared);
    else enableAcceleratedMeshPicking(mesh, prepared, Boolean(shape.importedMesh));
  }
  mesh.castShadow = true;
  mesh.receiveShadow = false;
  if (position) {
    mesh.position.copy(position);
  }
  mesh.position.y -= shape.height / 2;
  if (rotation) {
    mesh.rotation.copy(rotation);
  }
  if (scale) {
    mesh.scale.copy(scale);
    // A twisted unit body comes back already stretched to millimetres (taperGeometryForShape).
    const stretchedBy = prepared.userData.stretchedBy as [number, number, number] | undefined;
    if (stretchedBy) mesh.scale.divide(new THREE.Vector3(...stretchedBy));
  }
  group.add(mesh);
  addShapeEdgeDecorations(group, mesh, prepared, shape);
}

export function addShapeEdgeDecorations(group: THREE.Group, mesh: THREE.Mesh, prepared: THREE.BufferGeometry, shape: WorkplaneShape) {
  const complexEdges =
    shape.kind === "mesh" ||
    Boolean(shape.importedMesh) ||
    ["cone", "pyramid", "roof", "roundRoof", "halfSphere", "paraboloid", "torus", "tube", "ring", "star", "gear", "wedge", "polygon", "heart", "crescent", "slot", "dovetail", "hinge", "gridfinity", "knurl", "teardrop", "counterbore", "countersink", "doubleCountersink", "honeycomb", "loft"].includes(shape.kind);
  const importedTriangleCount = shape.importedMesh?.triangleCount ?? 0;
  // A vase's relief has an edge at every rib: drawn like a heavy imported mesh, without the lines.
  const skipHeavyImportedEdges = (Boolean(shape.importedMesh) && importedTriangleCount > IMPORTED_SELECTED_EDGE_TRIANGLE_LIMIT)
    || (shape.kind === "vase" && fittedVaseMesh(shape).triangleCount > IMPORTED_SELECTED_EDGE_TRIANGLE_LIMIT);
  // The setting draws a line on every body, in the colour chosen.
  // "Show holes more clearly" (#662) gives every hole that line too, darker.
  const allEdgeLines = (edgeLineStyle.enabled || (strongHoles && Boolean(shape.hole))) && importedTriangleCount <= ALL_EDGE_LINES_IMPORTED_TRIANGLE_LIMIT;
  if ((group.userData.showEdges || complexEdges || allEdgeLines) && (!skipHeavyImportedEdges || (allEdgeLines && !group.userData.showEdges))) {
    const selectedOutline = Boolean(group.userData.showEdges);
    const selectedRoundedBox = selectedOutline && shape.kind === "box" && Boolean(shape.radius && shape.radius > 0);
    const edgeColor = selectedOutline ? "#00aeea" : shape.hole ? (strongHoles ? STRONG_HOLE_EDGE_COLOR : "#697989") : allEdgeLines ? edgeLineStyle.color : complexEdges ? "#141b21" : darkenHex(shape.color, 0.34);
    // Edge lines on every body are a help to tell dark parts apart, not a drawing: half strength
    // keeps them readable without the hard black frame they had.
    const edgeOpacity = selectedRoundedBox ? 0 : selectedOutline ? 0.98 : shape.hole ? (strongHoles ? 0.85 : 0.44) : allEdgeLines ? 0.5 : complexEdges ? 0.38 : shape.kind === "text" ? 0.86 : 0.2;
    if (selectedOutline && shape.importedMesh && shape.cadDisplayEdgesVersion === 2 && Boolean(shape.cadDisplayEdges?.length)) {
      addCadDisplayEdges(group, shape, edgeColor, edgeOpacity);
    } else {
      // Ein Gewinde bei einem Grad Schwelle waere ein Knaeuel aus zehntausenden
      // Linien. Bei 25 Grad bleiben genau die Kanten stehen, die den Gang
      // zeichnen: Kuppe, Grund und die beiden Flanken.
      // Durch einen durchsichtigen Koerper scheinen auch die hinteren Kanten -
      // bei einem runden Koerper wird jede Facette zu einem Strich. Er zeigt
      // deshalb nur seine echten Kanten, etwa Deckel- und Bodenrand.
      // A twisted side folds a little at every band (#184): only its real edges get a line, as on a thread.
      const twisted = Math.abs(shape.extrudeTwist ?? 0) > 1e-6;
      const selectedThreshold = shape.importedMesh ? NORMAL_IMPORTED_SELECTION_EDGE_ANGLE : shape.kind === "thread" || twisted || (shape.transparent && !shape.hole) ? 25 : 1;
      const edgesGeometry = !selectedOutline && allEdgeLines
        ? calmEdgesGeometry(shape, prepared)
        : getEdgesGeometry(shape, prepared, selectedOutline ? selectedThreshold : twisted ? 25 : complexEdges ? 14 : 25);
      const edges = new THREE.LineSegments(edgesGeometry, sharedLineMaterial(edgeColor, edgeOpacity));
      edges.userData.complexEdge = complexEdges;
      edges.userData.shapeDecoration = true;
      edges.userData.shapeEdge = true;
      edges.position.copy(mesh.position);
      edges.rotation.copy(mesh.rotation);
      edges.scale.copy(mesh.scale);
      group.add(edges);
    }
  }
}

export function addCadDisplayEdges(group: THREE.Group, shape: WorkplaneShape, color: string, opacity: number) {
  if (!shape.cadDisplayEdges?.length) return;
  const material = sharedLineMaterial(color, opacity, false);
  shape.cadDisplayEdges.forEach((edge) => {
    if (edge.points.length < 6) return;
    const positions = resizedImportedCoordinates(shape, edge.points);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    const line = new THREE.Line(geometry, material);
    line.position.y -= shape.height / 2;
    line.renderOrder = 1003;
    line.userData.complexEdge = true;
    line.userData.shapeDecoration = true;
    line.userData.cadDisplayEdge = true;
    group.add(line);
  });
}

export function getImportedMeshCache(mesh: NonNullable<WorkplaneShape["importedMesh"]>) {
  const cached = importedGeometryCache.get(mesh);
  if (cached) {
    return cached;
  }

  // A mesh the geometry worker has just made comes with its geometry worked out (lib/importedMeshDisplay.ts).
  const geometry = takePreparedImportedMeshGeometry(mesh) ?? buildImportedMeshGeometry(mesh);
  geometry.userData.cached = true;
  const next = { geometry, edges: new Map<number, THREE.EdgesGeometry>() };
  importedGeometryCache.set(mesh, next);
  return next;
}

export function getImportedMeshGeometry(mesh: NonNullable<WorkplaneShape["importedMesh"]>) {
  return getImportedMeshCache(mesh).geometry;
}

export function getPreservedImportedMeshGeometry(shape: WorkplaneShape) {
  const cached = preservedImportedGeometryCache.get(shape);
  if (cached) return cached;
  const geometry = new THREE.BufferGeometry();
  const positions = resizedImportedMeshPositions(shape);
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const normals = shape.importedMesh?.normals;
  const hasNormals = Boolean(normals && normals.length === positions.length);
  if (hasNormals && normals) {
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  } else {
    geometry.computeVertexNormals();
  }
  putGeometryOnBase(geometry, hasNormals);
  geometry.userData.cached = true;
  preservedImportedGeometryCache.set(shape, geometry);
  return geometry;
}

// Per mesh and per set of parts; a moved or resized group reuses the colours.
export const partColoredGeometryCache = new WeakMap<object, WeakMap<object, THREE.BufferGeometry | null>>();
export const PART_COLOR_TRIANGLE_LIMIT = 300_000;
export const PART_COLOR_PROBE_DIRECTION = new THREE.Vector3(0.5774, 0.5773, 0.5775).normalize();

/**
 * The mesh of a group that was cut into one body, with every triangle in the
 * colour of the part it came from. Each triangle is looked up behind its own
 * face: the point lies inside the material it belongs to, so a face left by a
 * hole takes the colour of the body it was cut into.
 */
export function getPartColoredMeshGeometry(shape: WorkplaneShape): THREE.BufferGeometry | null {
  const mesh = shape.importedMesh;
  const parts = shape.groupedShapes;
  if (!mesh || !parts?.length || mesh.triangleCount > PART_COLOR_TRIANGLE_LIMIT) return null;
  let byParts = partColoredGeometryCache.get(mesh);
  if (!byParts) {
    byParts = new WeakMap();
    partColoredGeometryCache.set(mesh, byParts);
  }
  if (byParts.has(parts)) return byParts.get(parts) ?? null;
  const geometry = buildPartColoredMeshGeometry(mesh, parts);
  byParts.set(parts, geometry);
  return geometry;
}

export function buildPartColoredMeshGeometry(
  mesh: NonNullable<WorkplaneShape["importedMesh"]>,
  parts: WorkplaneShape[],
): THREE.BufferGeometry | null {
  // The parts in the frame of the mesh: both are stored around the group's
  // centre, standing on its lowest point.
  const solids: Array<{ probe: THREE.Mesh; box: THREE.Box3; color: THREE.Color }> = [];
  parts
    .filter((part) => !part.hole && !part.hidden)
    .forEach((part) => {
      const object = createShapeObject(part, false, undefined, false);
      object.updateMatrixWorld(true);
      object.traverse((node) => {
        if (!(node instanceof THREE.Mesh) || !node.visible) return;
        const material = Array.isArray(node.material) ? node.material[0] : node.material;
        const source = node.geometry as THREE.BufferGeometry;
        if (!source.getAttribute("position")) return;
        const geometry = source.index ? source.toNonIndexed() : source.clone();
        geometry.applyMatrix4(node.matrixWorld);
        geometry.computeBoundingBox();
        computeBoundsTree.call(geometry, { targetLeafSize: 12 });
        const probe = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
        probe.raycast = acceleratedRaycast;
        const color = material instanceof THREE.MeshStandardMaterial ? material.color.clone() : new THREE.Color(part.color);
        solids.push({ probe, box: geometry.boundingBox ?? new THREE.Box3(), color });
      });
      disposeObject(object);
    });
  if (solids.length === 0) return null;

  const base = getImportedMeshGeometry(mesh);
  const positions = base.getAttribute("position");
  const triangleCount = Math.floor(positions.count / 3);
  const colors = new Float32Array(positions.count * 3);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const edge = new THREE.Vector3();
  const probePoint = new THREE.Vector3();
  const raycaster = new THREE.Raycaster();
  const size = new THREE.Box3().setFromBufferAttribute(positions as THREE.BufferAttribute).getSize(new THREE.Vector3()).length();
  const inset = Math.min(0.05, Math.max(1e-4, size * 1e-4));
  // The plate stands the mesh on y = 0; the parts were placed against the
  // stored positions, which may sit a hair higher or lower.
  const offsetY = lowestY(mesh.positions);
  const insideOf = (point: THREE.Vector3) => {
    for (const solid of solids) {
      if (!solid.box.containsPoint(point)) continue;
      raycaster.set(point, PART_COLOR_PROBE_DIRECTION);
      if (raycaster.intersectObject(solid.probe, false).length % 2 === 1) return solid;
    }
    return null;
  };
  const nearestTo = (point: THREE.Vector3) => {
    let best = solids[0];
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const solid of solids) {
      const distance = solid.box.distanceToPoint(point);
      if (distance < bestDistance) {
        best = solid;
        bestDistance = distance;
      }
    }
    return best;
  };
  for (let triangle = 0; triangle < triangleCount; triangle += 1) {
    const offset = triangle * 3;
    a.fromBufferAttribute(positions, offset);
    b.fromBufferAttribute(positions, offset + 1);
    c.fromBufferAttribute(positions, offset + 2);
    // Outward normal, then a step back from the face into the material.
    normal.subVectors(b, a).cross(edge.subVectors(c, a)).normalize();
    probePoint.addVectors(a, b).add(c).multiplyScalar(1 / 3);
    probePoint.y += offsetY;
    probePoint.addScaledVector(normal, -inset);
    const solid = insideOf(probePoint) ?? nearestTo(probePoint);
    for (let corner = 0; corner < 3; corner += 1) {
      colors[(offset + corner) * 3] = solid.color.r;
      colors[(offset + corner) * 3 + 1] = solid.color.g;
      colors[(offset + corner) * 3 + 2] = solid.color.b;
    }
  }
  solids.forEach(({ probe }) => {
    disposeBoundsTree.call(probe.geometry);
    probe.geometry.dispose();
    (probe.material as THREE.Material).dispose();
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", positions);
  const normals = base.getAttribute("normal");
  if (normals) geometry.setAttribute("normal", normals);
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.boundingBox = base.boundingBox?.clone() ?? null;
  geometry.boundingSphere = base.boundingSphere?.clone() ?? null;
  geometry.userData.cached = true;
  return geometry;
}

export function lowestY(positions: ArrayLike<number>) {
  let lowest = Number.POSITIVE_INFINITY;
  for (let index = 1; index < positions.length; index += 3) lowest = Math.min(lowest, positions[index]);
  return Number.isFinite(lowest) ? lowest : 0;
}

export function getEdgesGeometry(shape: WorkplaneShape, geometry: THREE.BufferGeometry, threshold: number) {
  const importedCache = shape.importedMesh && !preservesEdgeTreatmentSize(shape) && !shapeHasShapeDeform(shape)
    ? getImportedMeshCache(shape.importedMesh).edges
    : null;
  let cache = importedCache ?? sharedEdgesGeometryCache.get(geometry);
  if (!cache) {
    cache = new Map<number, THREE.EdgesGeometry>();
    sharedEdgesGeometryCache.set(geometry, cache);
  }

  const cached = cache.get(threshold);
  if (cached) {
    return cached;
  }

  const edges = fastEdgesGeometry(geometry, threshold);
  edges.userData.cached = true;
  cache.set(threshold, edges);
  return edges;
}

/** Above this many line pieces a body's edges stop outlining it and start covering it. */
export const ALL_EDGE_LINES_SEGMENT_LIMIT = 1500;

/**
 * The edge lines drawn on every body: creases from 25°, but a body with a texture of small faces -
 * a thread, a knurl, a spring - would turn into a black mass of lines. For those the crease
 * angle steps up until only its real outline is left, such as the rims of the ends.
 */
export function calmEdgesGeometry(shape: WorkplaneShape, geometry: THREE.BufferGeometry) {
  let edges = getEdgesGeometry(shape, geometry, 25);
  for (const threshold of [45, 70]) {
    if (edges.getAttribute("position").count / 2 <= ALL_EDGE_LINES_SEGMENT_LIMIT) break;
    edges = getEdgesGeometry(shape, geometry, threshold);
  }
  return edges;
}

export function addTextShape(group: THREE.Group, material: THREE.MeshStandardMaterial, shape: WorkplaneShape, geometryCacheKey: string) {
  const geometry = sharedShapeGeometry(geometryCacheKey, () => textDisplayGeometry(shape));
  addMesh(group, geometry, material, shape);
}

export function createRoofGeometry(width: number, height: number, depth: number) {
  const w = width / 2;
  const d = depth / 2;
  const vertices = new Float32Array([
    -w, 0, -d, w, 0, -d, 0, height, -d,
    -w, 0, d, w, 0, d, 0, height, d,
  ]);
  const indices = [
    0, 2, 1,
    3, 4, 5,
    0, 1, 4, 0, 4, 3,
    0, 3, 5, 0, 5, 2,
    1, 2, 5, 1, 5, 4,
  ];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  return geometry.toNonIndexed();
}

export function createWedgeGeometry(width: number, height: number, depth: number) {
  const w = width / 2;
  const d = depth / 2;
  const vertices = new Float32Array([
    -w, 0, -d, w, 0, -d, w, height, -d,
    -w, 0, d, w, 0, d, w, height, d,
  ]);
  const indices = [
    0, 2, 1,
    3, 4, 5,
    0, 1, 4, 0, 4, 3,
    1, 2, 5, 1, 5, 4,
    0, 3, 5, 0, 5, 2,
  ];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  return geometry.toNonIndexed();
}

export function createTorusGeometry(width: number, height: number, depth: number, shape: Pick<WorkplaneShape, "sides" | "steps" | "torusTubeRatio">) {
  const { tubeRadius, majorRadius, outerDiameter, verticalScale } = torusRadii(width, depth, height, torusTubeRatio({ ...shape, width, depth, height }));
  const { ringSides, tubeSteps } = torusTessellation(shape, width, depth, height);
  const geometry = new THREE.TorusGeometry(majorRadius, tubeRadius, tubeSteps, ringSides);
  geometry.rotateX(Math.PI / 2);
  geometry.scale(width / outerDiameter, verticalScale, depth / outerDiameter);
  return geometry.toNonIndexed();
}

export function createHollowCylinderGeometry(width: number, height: number, depth: number, thickness: number, segments = 96) {
  const outerX = width / 2;
  const outerZ = depth / 2;
  const safeThickness = clamp(thickness, 0.1, Math.max(0.1, Math.min(outerX, outerZ) - 0.1));
  const innerX = Math.max(0.1, outerX - safeThickness);
  const innerZ = Math.max(0.1, outerZ - safeThickness);
  const count = Math.max(12, Math.round(segments));
  const positions: number[] = [];
  const point = (rx: number, rz: number, y: number, index: number): [number, number, number] => {
    const angle = (index / count) * Math.PI * 2;
    return [Math.cos(angle) * rx, y, Math.sin(angle) * rz];
  };
  const addTri = (a: [number, number, number], b: [number, number, number], c: [number, number, number]) => positions.push(...a, ...b, ...c);
  const addQuad = (a: [number, number, number], b: [number, number, number], c: [number, number, number], d: [number, number, number]) => {
    addTri(a, b, c);
    addTri(a, c, d);
  };

  for (let index = 0; index < count; index += 1) {
    const next = index + 1;
    const ob0 = point(outerX, outerZ, 0, index);
    const ob1 = point(outerX, outerZ, 0, next);
    const ot0 = point(outerX, outerZ, height, index);
    const ot1 = point(outerX, outerZ, height, next);
    const ib0 = point(innerX, innerZ, 0, index);
    const ib1 = point(innerX, innerZ, 0, next);
    const it0 = point(innerX, innerZ, height, index);
    const it1 = point(innerX, innerZ, height, next);

    addQuad(ob0, ot0, ot1, ob1);
    addQuad(ib1, it1, it0, ib0);
    addQuad(ot0, it0, it1, ot1);
    addQuad(ob0, ob1, ib1, ib0);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  return geometry;
}

export function createRoundRoofGeometry(width: number, height: number, depth: number, sides = 64) {
  const radius = width / 2;
  const segments = Math.max(4, Math.round(sides));
  const shape = new THREE.Shape();
  shape.moveTo(-radius, 0);
  shape.absarc(0, 0, radius, Math.PI, 0, true);
  shape.lineTo(-radius, 0);
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps: 1, curveSegments: segments });
  geometry.translate(0, 0, -depth / 2);
  geometry.scale(1, height / Math.max(0.001, radius), 1);
  return geometry.toNonIndexed();
}

export function createHalfSphereGeometry(width: number, height: number, depth: number, steps = 32) {
  const lon = Math.max(8, Math.round(steps) * 2);
  const lat = Math.max(4, Math.round(steps / 2));
  const rx = width / 2;
  const rz = depth / 2;
  const positions: number[] = [];
  const normals: number[] = [];
  const point = (latIndex: number, lonIndex: number): [number, number, number] => {
    const theta = (latIndex / lat) * (Math.PI / 2);
    const phi = ((lonIndex % lon) / lon) * Math.PI * 2;
    const ring = Math.sin(theta);
    return [Math.cos(phi) * rx * ring, Math.cos(theta) * height, Math.sin(phi) * rz * ring];
  };
  const normal = ([x, y, z]: [number, number, number]): [number, number, number] => {
    const vector = new THREE.Vector3(x / Math.max(0.001, rx * rx), y / Math.max(0.001, height * height), z / Math.max(0.001, rz * rz)).normalize();
    return [vector.x, vector.y, vector.z];
  };
  const addTri = (a: [number, number, number], b: [number, number, number], c: [number, number, number]) => {
    positions.push(...a, ...b, ...c);
    normals.push(...normal(a), ...normal(b), ...normal(c));
  };
  const addCapTri = (a: [number, number, number], b: [number, number, number], c: [number, number, number]) => {
    positions.push(...a, ...b, ...c);
    normals.push(0, -1, 0, 0, -1, 0, 0, -1, 0);
  };

  const top: [number, number, number] = [0, height, 0];
  for (let xStep = 0; xStep < lon; xStep += 1) {
    addTri(top, point(1, xStep + 1), point(1, xStep));
  }

  for (let yStep = 1; yStep < lat; yStep += 1) {
    for (let xStep = 0; xStep < lon; xStep += 1) {
      const next = xStep + 1;
      const a = point(yStep, xStep);
      const b = point(yStep, next);
      const c = point(yStep + 1, next);
      const d = point(yStep + 1, xStep);
      addTri(a, c, d);
      addTri(a, b, c);
    }
  }

  const capY = 0;
  const bottomCenter: [number, number, number] = [0, capY, 0];
  const capPoint = (lonIndex: number): [number, number, number] => {
    const phi = ((lonIndex % lon) / lon) * Math.PI * 2;
    return [Math.cos(phi) * rx, capY, Math.sin(phi) * rz];
  };
  for (let xStep = 0; xStep < lon; xStep += 1) {
    addCapTri(bottomCenter, capPoint(xStep), capPoint(xStep + 1));
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  return geometry;
}


export function darkenHex(hex: string, amount: number) {
  const clean = hex.replace("#", "");
  const value = Number.parseInt(clean.length === 3 ? clean.split("").map((char) => char + char).join("") : clean, 16);
  const r = Math.max(0, Math.floor(((value >> 16) & 255) * (1 - amount)));
  const g = Math.max(0, Math.floor(((value >> 8) & 255) * (1 - amount)));
  const b = Math.max(0, Math.floor((value & 255) * (1 - amount)));
  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}
