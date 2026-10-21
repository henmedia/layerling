"use client";

import { GuideHelpLink } from "@/components/GuideHelpLink";
import { ShapeMenuPanel } from "@/components/workplane/ShapeMenuPanel";
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Check, CircleHelp, Percent, Circle as CircleIcon, CloudUpload, Download, Eye, EyeOff, FilePlus2, FolderOpen, Hexagon as HexagonIcon, Info, ListTree, Pencil, Pentagon as PentagonIcon, Rotate3d, Route as RouteIcon, Search, Square as SquareIcon, Star as StarIcon, Triangle as TriangleIcon, X } from "lucide-react";
import { ObjectListPanel } from "@/components/workplane/ObjectListPanel";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useWheelField } from "@/lib/useWheelField";
import { wheelNextValue } from "@/lib/wheelValueStep";
import { SAVED_VIEW_KEYS } from "@/lib/designView";
import * as THREE from "three";
import type { AppThemePreference, ResolvedAppTheme } from "@/lib/appTheme";
import type { ComponentType, ReactNode, SVGProps } from "react";
import { t, type MessageKey } from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";
import { useSimpleMode } from "@/lib/useSimpleMode";
import { simpleModeKeepsShape, simpleModeKeepsTool } from "@/lib/simpleMode";
import { loftShapePatch, type LoftMeasures } from "@/lib/loftGeometry";
import { hingeWorldParts } from "@/lib/hingeParts";
import { copyViaSelectionField, decodeClipboardPayload, encodeClipboardPayload, LOCAL_CLIPBOARD_LIMIT, newestClipboard, type ClipboardPayload } from "@/lib/clipboardPayload";
import { bentTubeNaturalDimensions, normalizedBentTubeFields } from "@/lib/bentTubeGeometry";
import { gridfinityListPatch } from "@/lib/gridfinityGeometry";
import { DEFAULT_THREAD_PROFILE, defaultThreadHeadHeight, normalizeThreadHeadHeight, threadNaturalFootprint, threadSettings } from "@/lib/threadGeometry";
import { curvedTextPatch, MAX_TEXT_SPACING, MIN_TEXT_SPACING } from "@/lib/textGeometry";
import { normalizeTextEdge } from "@/lib/textEdge";
import { DEFAULT_TEXT_LAYERS, layerTextKeyringArgument, placedKeyring, layerTextLayersError, nameTagOffsets, normalizeTextLayers, type NameTagKeyring } from "@/lib/textLayers";
import { NAME_TAG_LAYERS, NAME_TAG_LETTER_SIZE, textShrinkPatch, textSpacingPatch } from "@/lib/nameTag";
import { DEFAULT_ICON_TAG_WIDTH, ICON_TAG_LAYERS, MAX_ICON_TAG_WIDTH, MIN_ICON_TAG_WIDTH, normalizeIconTagCount } from "@/lib/iconTag";
import type { IconLayerPatch, IconTagControls, TextLayerPatch } from "@/components/workplane/ShapeInspector";
import { IconTagPanel } from "@/components/workplane/IconTagPanel";
import { QrCodePanel } from "@/components/workplane/QrCodePanel";
import { qrCodeOf, qrCodeShape, regeneratedQrCodeShape } from "@/lib/editorQrCode";
import { DEFAULT_QR_WIDTH, MAX_QR_HEIGHT, MAX_QR_WIDTH, MIN_QR_HEIGHT, MIN_QR_WIDTH, QR_BYTE_CAPACITY, QR_ERROR_CORRECTIONS, QR_STYLES, normalizeQrSettings, qrByteLength, qrMatrix, qrModuleSize, qrModuleTooSmall, qrTextFits, type QrCodeSettings, type QrErrorCorrection, type QrStyle } from "@/lib/qrCode";
import { iconSourceFromFile, PICTURE_FILE_ACCEPT, type IconSource } from "@/lib/pictureIcon";
import { loadedManifoldRuntime, onManifoldReady } from "@/lib/manifoldHandle";
import { canApplySketchCornerTreatment } from "@/lib/sketchFilletChamfer";
import {
  normalizePolygonSides,
  normalizeStarInnerPercent,
  SKETCH_POLYGON_DEFAULT_SIDES,
  SKETCH_POLYGON_MAX_SIDES,
  SKETCH_POLYGON_MIN_SIDES,
  SKETCH_STAR_DEFAULT_INNER_PERCENT,
  SKETCH_STAR_MAX_INNER_PERCENT,
  SKETCH_STAR_MIN_INNER_PERCENT,
  sketchPrimitiveGeometry,
} from "@/lib/sketchPrimitives";
import { cloneSketchProfile, orderedSketchPaths, withSegmentHandles, withSmoothSketchHandles } from "@/lib/sketchSmoothHandles";
import { changesLockedOutline, setSketchPointsLocked, sketchLockState } from "@/lib/sketchLock";
import { curveSketchSegment, isSegmentCurved, straightenSketchSegment } from "@/lib/sketchSegmentCurve";
import { chordHandles, withBezierHandles, withBezierStartHandle } from "@/lib/sketchBezierHandles";
import { sketchProfileWithoutPoint } from "@/lib/sketchPointRemoval";
import { sketchProfileWithArc, type SketchArcEnd } from "@/lib/sketchArc";
import { withSegmentsConstruction } from "@/lib/sketchConstruction";
import { alignAxesForWorkplane, cuboidAlongAxes, shiftAlongAxis, type AlignAxes } from "@/lib/alignFrame";
import {
  SketchBoltCircleIcon,
  SketchEllipseIcon,
  SketchHalfCircleIcon,
  SketchPieSliceIcon,
  ToolbarAlignIcon,
  ToolbarCenterOnWorkplaneIcon,
  ToolbarChamferIcon,
  ToolbarCaretDownIcon,
  ToolbarCopyIcon,
  ToolbarDuplicateIcon,
  ToolbarDropToWorkplaneIcon,
  ToolbarBundleIcon,
  ToolbarGroupIcon,
  ToolbarGuideIcon,
  ToolbarHideSelectedIcon,
  ToolbarHomeIcon,
  ToolbarImportIcon,
  ToolbarIntersectionIcon, ToolbarIntersectPreviewIcon,
  ToolbarKeyboardIcon,
  ToolbarFilletIcon,
  ToolbarHistoryIcon,
  ToolbarHollowIcon,
  ToolbarDeleteFaceIcon,
  ToolbarSimplifyIcon,
  ToolbarMirrorIcon,
  ToolbarRotationPivotIcon,
  ToolbarPatternIcon,
  ToolbarHolePatternIcon,
  ToolbarFaceToolIcon,
  ToolbarConstructionLineIcon,
  ToolbarMiddleLineIcon,
  ToolbarLayFlatIcon,
  ToolbarMateFacesIcon,
  ToolbarNoteIcon,
  ToolbarSplitIcon,
  ToolbarPasteIcon,
  ToolbarRedoIcon,
  ToolbarSnapGridIcon,
  ToolbarSettingsIcon,
  ToolbarShapeAddIcon,
  ToolbarTrashIcon,
  ToolbarUngroupIcon,
  ToolbarUndoIcon,
  ToolbarVectorExportIcon,
} from "./icons";
import { WorkplaneViewport, type LayFlatPick, type ViewportToolMemory } from "./WorkplaneViewport";
import { layFlatRotation } from "@/lib/layFlat";
import { SketchWorkspace, type SketchMeasurement, type SketchPrimitive, type SketchSelection, type SketchTool } from "./SketchWorkspace";
import { EdgeModifierPanel } from "./workplane/EdgeModifierPanel";
import { ShellPanel } from "./workplane/ShellPanel";
import { DeleteFacePanel } from "./workplane/DeleteFacePanel";
import { MateFacesPanel } from "./workplane/MateFacesPanel";
import { mateMotion, type FacePick, type MateMode } from "@/lib/mateFaces";
import { carriedOntoFace } from "@/lib/carryOntoFace";
import { HolePatternPanel } from "./workplane/HolePatternPanel";
import { FaceToolPanel } from "./workplane/FaceToolPanel";
import { DEFAULT_FACE_TOOL, faceToolSettingsOn, normalizeFaceTool, type FaceToolSettings } from "@/lib/faceTool";
import { faceToolBody } from "@/lib/faceToolBody";
import { DEFAULT_HOLE_PATTERN, normalizeHolePattern, type HolePatternSettings } from "@/lib/holePattern";
import { holePatternShapes, readPerforableFace, type PerforableFace } from "@/lib/holePatternShapes";
import { honeycombReplacementParts } from "@/lib/honeycombMigration";
import { MeshSimplifyPanel } from "./workplane/MeshSimplifyPanel";
import { addCustomFontFile, customFontErrorMessage, FontManagerPanel } from "./workplane/FontManagerPanel";
import { onFontManagerRequested } from "@/lib/fontManagerEvents";
import { customFontList, onCustomFontsChanged, textFontLabel } from "@/lib/textFonts";
import { isCustomFontId } from "@/lib/customFonts";
import { storedCustomFonts } from "@/lib/customFontStore";
import { ArrayPanel } from "./workplane/ArrayPanel";
import { ScalePercentPanel, type ScalePercentSettings } from "./workplane/ScalePercentPanel";
import { scaleShapesByPercent } from "@/lib/scaleByPercent";
import { canToggleGroupColors, groupShowsPartColors } from "@/lib/groupColors";
import { disposeBoundsTree } from "three-mesh-bvh";
import { SHELL_SIDES, shellMaxThickness, shellOpeningsFor, shellOpenSides } from "@/lib/shellLimits";
import { arrayFollowingPivot, circleStepDegrees, clampArrayCount, moveAlongRadius, rotateAroundVertical, rowOffset, singleAxisSpacing, type ArraySettings } from "@/lib/shapeArray";
import { bedOverhangs, keepDismissedOverhangs, printerPresetById, shapeBedFootprint, type BedOverhang } from "@/lib/printBed";
import { SplitPanel, type SplitWorkplaneDirection } from "./workplane/SplitPanel";
import { NO_SPLIT_ROTATION, modelSplitPlane, snapSplitPositionToVertices, splitOrientationForNormal, splitAxisFromLabel, splitAxisLabel, splitRotationAxes, type SplitRotation } from "@/lib/modelSplit";
import { GuideModal } from "./workplane/GuideModal";
import { HistoryViewOverlay, historyStateNameSuffix } from "./workplane/HistoryViewOverlay";
import { useHistoryViewPicking } from "./workplane/useHistoryViewPicking";
import { ShortcutsModal } from "./workplane/ShortcutsModal";
import { InteractiveHelp } from "./InteractiveHelp";
import { CommandPalette, type PaletteCommand } from "./workplane/CommandPalette";
import { COMMAND_KEYWORDS, SHAPE_KEYWORDS } from "@/lib/commandKeywords";
import { ShapeContextMenu, type ShapeContextMenuItem } from "./workplane/ShapeContextMenu";
import { nextSelectionTransparency } from "@/lib/selectionTransparency";
import { canonicalizeShape, cloneWorkplaneShapeTreeWithFreshIds, cleanNearZero, cleanRotationDegrees, isNonSolidShapeKind, meshYawDegrees, preservesEdgeTreatmentSize, serializeShapesForSync, shapeDepth, shapeExtrudeDeformPatch, shapeHasShapeDeform, shapeTaperPatch, shapeTransformShouldRemainEditable, shapeWidth, shapeWithParametricSource, patchTouchesBodyParameters, withHoleMode, workplaneShapesEqual, shellNeedingRebuild } from "@/lib/workplaneShapes";
import { workplaneCenteringOffset } from "@/lib/workplaneCentering";
import { bakeCadMetadataForShapeTransform, cadBrepTransformForShape, cadModifierPrimitiveForAnalyticShape, cadModifierPrimitiveForBakedShape, importedStepPartForShape } from "@/lib/cadBakeMetadata";
import { hasOneToOneCadComponentMapping } from "@/lib/cadModifierGroups";
import { cadModifierGridfinityForShape, cadModifierHelicalGearForShape, cadModifierProfileForShape, cadModifierSpringForShape, cadModifierThreadForShape, cadProfileExpectation, cadProfileSegmentCount, textGlyphProfiles, withinExactProfileLimit } from "@/lib/cadProfileExtrusion";
import { DEFAULT_OVERHANG_ANGLE, normalizeOverhangAngle, overhangArea } from "@/lib/overhang";
import { sectionMeasurement, sectionPointToWorld, snapSectionPoint } from "@/lib/sectionMeasure";
import { DEFAULT_INFILL_PERCENT, DEFAULT_PRINT_MATERIAL, DEFAULT_WALLS, INFILL_CHOICES, PRINT_MATERIAL_DENSITY, PRINT_MATERIALS, FILAMENT_DIAMETER_MM, WALL_CHOICES, normalizeInfillPercent, normalizePrintMaterial, normalizeWalls, printEstimate, printEstimateWithInfill, type PrintMaterial } from "@/lib/printEstimate";
import { CAD_MODIFIER_MAX_SHARP_ANGLE, CAD_MODIFIER_REQUEST_TIMEOUT_MS, CAD_MODIFIER_PREPARE_TRIANGLE_LIMIT, cadModifierPrepareTimeoutMs, cadModifierTimeoutMessage, cadModifierUserErrorMessage, cadModifierWorkerFailureMessage, cadModifierCandidateEdge, defaultCadModifierTangentChain, rescueSharpAngleForEdges, selectableCadModifierEdge, type CadModifierRequestPhase } from "@/lib/cadModifierRuntime";
import { createCadPreviewQueue } from "@/lib/cadPreviewQueue";
import { cloneWorkplaneShapeSnapshot, compactEdgeTreatmentHistory, edgeTreatmentAppliedFrame, groupBeforeEdgeTreatments, restoreShapeBeforeEdgeTreatment, wasGroupBeforeEdgeTreatments } from "@/lib/edgeTreatmentHistory";
import { historyStepsAround } from "@/lib/historyStepDescription";
import { historyViewMcpCommand } from "./workplane/historyViewMcp";
import { appendEditorHistorySnapshot, boundedEditorHistoryState, continuesKeyRun, type KeyRun, editorHistoryBranch, editorHistoryEntry, editorHistoryForExport, historyStateAt, hydrateEditorHistoryState, notesForHistoryIndex, projectSceneFingerprint, projectShapesFingerprint, workplaneForHistoryIndex, type EditorHistoryEntry, type EditorHistoryExportLimit, type EditorHistoryState } from "@/lib/editorHistory";
import { snapShapeFootprintToVisibleGrid, visibleGridStep } from "@/lib/gridSnap";
import { composedShapeRotation, geometryRotationDegreesForShortcut, geometryRotationDelta, rotatedGeometryShapePatch } from "@/lib/geometryRotation";
import { carryShapePivot, heightPatchKeepingBase, shapePivotFromWorld, shapePivotWorld, type PivotPoint } from "@/lib/rotationPivot";
import { createLocalId } from "@/lib/localIds";
import { canEditGroupAtLevel, mcpOpenGroupSummary, openGroupLevelsStillOpen, trackOpenGroupLevels, type OpenGroupLevel } from "@/lib/openGroupParts";
import { projectExportFileName, stlNameAsksForNewFile } from "@/lib/exportNames";
import { exportMeshesToObj } from "@/lib/objExport";
import { useEditorNotice } from "@/components/workplane/useEditorNotice";
import { rotateSketchPoints, selectedClosedSketchPoints } from "@/lib/sketchRotation";
import { PROJECT_THUMBNAIL_IDLE_MS, projectThumbnailSceneChanged, type ProjectThumbnailSceneKey } from "@/lib/projectThumbnail";
import { importedShapeFromObj } from "@/lib/objImport";
import { readImportSvgWidth, readKeepSvgPage, setImportSvgWidth, storeKeepSvgPage, takeImportSvgWidth } from "@/lib/importPreferences";
import { importFailureSummary, importModelFiles } from "@/lib/modelImport";
import { dedupeProjectAssets } from "@/lib/projectAssets";
import { useCustomShapes } from "@/lib/useCustomShapes";
import { packBackup } from "@/lib/projectBackup";
import { MyShapesSection } from "@/components/workplane/MyShapesSection";
import { addLineIntersectionPoints, onlyMovesPoints, splitSketchSegment } from "@/lib/sketchPointRefinement";
import { joinOpenEnds } from "@/lib/sketchPointJoin";
import { mirrorSketchSelection, SKETCH_MIRROR_HORIZONTAL, SKETCH_MIRROR_VERTICAL, sketchMirrorAxisThroughSegment } from "@/lib/sketchMirror";
import { copySketchSelection, freeSketchPasteOffset, pasteSketchClipboard, type SketchClipboard } from "@/lib/sketchClipboard";
import { sketchSelectedPointIds, sketchSelectionCount, toggleSketchSelection } from "@/lib/sketchSelection";
import { applySketchCorners } from "@/lib/sketchFilletChamfer";
import { revolveAxisShift } from "@/lib/revolveAxis";
import { buildSketchRevolveMesh, DEFAULT_SKETCH_REVOLVE_SETTINGS, normalizeSketchRevolveSettings, type SketchRevolveMesh } from "@/lib/sketchRevolve";
import { AppFooter } from "@/components/AppFooter";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { ThemeSwitch } from "@/components/ThemeSwitch";
import { useFileAccept } from "@/lib/fileAccept";
import { exportLylProject, importLylProject, LYL_CREATED_WITH_VERSION, LYL_MEDIA_TYPE } from "@/lib/lylProject";
import { isBuildMessage, reportWorkerBuild } from "@/lib/buildStamp";
import {
  ensureLylFileWritable,
  forgetLylFile,
  forgetStlFile,
  linkedLylFile,
  linkedStlFile,
  lylFileAccessSupported,
  pickLylFileToOpen,
  pickLylFileToSave,
  pickStlFileToSave,
  rememberLylFile,
  rememberStlFile,
  writeLylFile,
  type LylFileHandle,
} from "@/lib/lylFileAccess";
import { simplifyTrianglePositions } from "@/lib/meshSimplify";
import { clipboardShape, displayShapeName, iconTagAsset, qrCodeAsset, libraryShapeAssets, makeShapeFromAsset, nameTagAsset, shapeAssetLabel, shapeAssetMenuLabel, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { importedShapeFromStl } from "@/lib/stlImport";
import { exportMeshesToStl } from "@/lib/stlExport";
import { exportMeshesTo3mf, THREE_MF_MEDIA_TYPE } from "@/lib/threemfExport";
import { importedShapeFromSvg, invalidSvgMeshReason } from "@/lib/svgImport";
import { toSvgProjection, type SvgProjectionLayer } from "@/lib/svgExport";
import { DEFAULT_TAPER_DIMENSION_MAX, keyboardNudgeCoarseFactor, keyboardNudgeStep, normalizeShapeCustomizations, normalizeSnapGrid, normalizeWorkspaceSettings, shapeDimensionLimit, workplaneSettingsFingerprint } from "@/lib/workplaneSettings";
import { MCP_GRIDFINITY_LIST_KEYS, mcpGridfinityListParams, mcpThreadSizeParams } from "@/lib/mcpShapeSettings";
import { createNoteId, normalizeNotes, NOTE_COUNT_LIMIT, patchNote, referencePoints } from "@/lib/workplaneNotes";
import { notesAfterShapeChange, notesPinnedTo, notesPutBack } from "@/lib/noteAnchoring";
import { newReferencePositions, referencePointsForBox, unionReferenceBoxes, type ReferencePointSpot, type ReferencePosition } from "@/lib/referencePoints";
import {
  normalizePlacementWorkplane,
  placementPatchForNewShape,
  placementWorkplaneCoordinates,
  placementWorkplaneFingerprint,
  placementWorkplaneFromSurface,
  placementWorkplaneIsBase,
  placementWorkplanePoint,
  horizontalPlacementWorkplane,
  translationToWorkplane,
  type PlacementPoint,
  REVOLVE_REFERENCE_WORKPLANE,
  revolveBodyStandsUpright,
  type PlacementWorkplane,
} from "@/lib/placementWorkplane";
import { localizedError } from "@/lib/userErrors";
import { alignNaturalCenter, type AlignPoint } from "@/lib/alignCenter";
import { cylinderToEllipsePatch } from "@/lib/cylinderToEllipse";
import { sketchBodyStretch, stretchedSketchProfile } from "@/lib/sketchResize";
import { silhouetteSketchProfile } from "@/lib/sketchCadProfile";
import { svgSketchMatchesMesh } from "@/lib/svgSketch";
import { DEFAULT_SKETCH_STROKE, normalizeSketchStroke, strokedSketchProfile } from "@/lib/sketchStroke";
import { bottomCadModifierEdgeIds, horizontalCadModifierEdgeIds, topCadModifierEdgeIds, verticalCadModifierEdgeIds } from "@/lib/topEdges";
import { movedWithEditedOutline, placedLikeExisting, placeSketchShape, sketchBodyAnchor, type SketchAnchor } from "@/lib/sketchPlacement";
import { separatesBySketch, sketchOutlineParts } from "@/lib/sketchOutlineParts";
import { sketchOutlineBounds } from "@/lib/sketchKeyring";
import { meshSlicePath, planeCutsMesh } from "@/lib/sketchSlice";
import { projectedEdgesPath } from "@/lib/sketchEdges";
import { useRememberedFlag } from "@/lib/useRememberedFlag";
import { BUG_REPORT_FILE, bugReportText, rememberBugReportEvent, type BugReportEvent } from "@/lib/bugReport";
import { formatLengthMm, lengthDisplayUnit } from "@/lib/measurementUnits";
import { wrapMeshAroundCylinder, type CylinderWrapError } from "@/lib/cylinderWrap";
import { screenAlignedNudge } from "@/lib/keyboardNudge";
import { LAYERLING_MCP_HEARTBEAT_MS, LAYERLING_MCP_POLL_RETRY_MS, LAYERLING_MCP_ROUTE, type LayerlingMcpCommand, type LayerlingMcpSceneSummary, type LayerlingMcpViewFace } from "@/lib/layerlingMcpProtocol";
import type { CadFaceInfo, CadModifierComponentMesh, CadModifierDeflection, CadModifierDisplayEdge, CadModifierEdge, CadModifierFaces, CadModifierGridfinityPart, CadModifierHelicalGearPart, CadModifierKind, CadModifierMeshPart, CadModifierPrimitivePart, CadModifierProfilePart, CadModifierQuality, CadModifierSpringPart, CadModifierThreadPart, CadModifierWorkerRequest, CadModifierWorkerResponse } from "@/lib/cadModifierTypes";
import { getSectionBounds, sectionAxisLetter, sectionMeshInFrame, sectionPlacementWorkplane, sectionPointFromFrame, sectionPointToFrame, type SectionFrame, type SectionOrientation, type SectionPlaneAxis, type SectionPlaneSettings } from "@/lib/sectionView";
import { footprintCutOffset, projectSectionPoint, SECTION_VIEW_FACE, sectionSvgDocument, sliceMeshContours } from "@/lib/sectionSvg";
import type { AlignAxis, AlignHandleStatus, AlignTarget, GridSize, ParametricSource, ProjectAsset, ShapeAsset, ShapeCustomization, ShapeKind, SketchImage, SketchOperation, SketchPoint, SketchProfile, SketchRevolveSettings, SketchSegment, ShellEdges, ShellOpenings, ShellSide, WorkplaneNote, WorkplaneShape, WorkplaneWorkspaceSettings } from "@/types/layerling";
import { type Vec3, type MeshData, type Cuboid, type ShapeUpdatePatch, type ManifoldSolid, MIN_SHAPE_DIMENSION, resetManifoldRuntime, cleanModelDimension, getManifoldRuntime, meshForShape, meshReachAlong, appendMeshData, formatTriangleCount, shapeAabb, boundsForShapes, boundsForCuboids, meshAabb, boundsForPositions, quantizedPointKey } from "@/lib/editorMeshCore";
import { cloneAsGroupChild, meshDataToManifoldMesh, shapeToManifoldSolid, splitShapesByPlane, unionOverlappingExportMeshes, exportBodiesWithLooseHoles, exportSolidVolume, type ExportSolidVolume, PRINT_MATERIAL_STORAGE_KEY, PRINT_INFILL_STORAGE_KEY, PRINT_WALLS_STORAGE_KEY, formatEstimateNumber, formatSectionOffset, SECTION_SEEN_FROM_KEYS, expandBundles, visibleExportShapes, multicolorExportSolids, exportFaceColors, colorSeparatedExportMeshes, disposeManifold, canIntersectShapes, buildIntersectionShapeFromSelection, groupedShape, quaternionForShape, rotationFromQuaternion, cleanShapePatch, restoreGroupedChildren, restoreGroupedChildrenForEdges, buildGroupedShapeFromSelection } from "@/lib/editorBooleans";
import { handleViewArrowKey } from "@/lib/viewArrowKeys";
import { escapeWasHandled } from "@/lib/escapeHandled";
import { sketchEscapeAction } from "@/lib/sketchEscape";
import { booleanAutomationScene } from "@/lib/editorAutomation";
import { debugShapeSummary, mcpPivotRequest, compactShapeSummary, mcpShapeSummary, mcpSketchFillProfile, mcpTextFont } from "@/lib/editorMcpSummary";
import { sweepPathFromParams, sweepSectionFromParams, sweepSketchProfile } from "@/lib/sweepSketch";
import { emptySketchProfile, cadShapeFromSketchProfile, cadShapeFromSketchSweep, revolveBuildProfile, shapeFromRevolvedSketchProfile, shapeFromCadMesh, sketchBodyAsOperation, sketchBodyOperation, sketchProfileLeftOfAxis, sketchReferenceShapeOnWorkplane, defaultMcpSketchProfile } from "@/lib/editorSketchCad";
import { drawingLabelsInLanguage } from "@/lib/drawingLabels";
import { offersTextLayers, textLayerStack, layeredTextShape, nameTagSource, nameTagsFor, offersIconLayers, iconLayerStack, iconTagArea, layeredIconShape, iconTagCopies, svgIconArea, iconTagFromSvg, keyringTabShape, keyringTabTag, keyringTabAt, keyringTabPlace, textFreeKeyring, textFreeKeyringPlace, iconFreeKeyring, iconFreeKeyringPlace } from "@/lib/editorTextTags";
import { DEFAULT_KEYRING_DIAMETER } from "@/lib/textGeometry";

export { importedShapeFromObj, importedShapeFromStl, importedShapeFromSvg };

type TopPanel = "import" | "export" | null;

/** Die Befehle der Suche, die im Verlaufsblick wach bleiben: sie aendern nichts am Entwurf. */
const HISTORY_VIEW_COMMANDS = new Set(["history", "export", "guide", "shortcuts"]);

/** MCP actions that only read or change the view, so they still work while the history view is open. */
const HISTORY_VIEW_MCP_ACTIONS = new Set([
  "get_scene",
  "list_objects",
  "list_custom_shapes",
  "inspect_errors",
  "estimate_print",
  "list_reference_points",
  "show_overhangs",
  "measure_section",
  "set_section_view",
  "show_workplane",
  "saved_view",
  "export_section_svg",
  "export_drawing",
  "export_mesh",
  "save_project",
  "capture_image",
  "set_history_view",
  "restore_from_history",
  "clear_history",
]);

/**
 * Was der Verlaufsblick mitgibt, wenn aus einem frueheren Stand ein neues
 * Projekt werden soll. Die Uebersicht legt es an; der Editor bleibt, wo er ist.
 */
export type HistoryProjectRequest = {
  sourceProjectId: string | null;
  /** Der gewuenschte Name, oder null, wenn die Uebersicht einen Kopie-Namen vergeben soll. */
  name: string | null;
  shapes: WorkplaneShape[];
  history: EditorHistoryEntry[];
  historyIndex: number;
  assets: ProjectAsset[];
  workspace: WorkplaneWorkspaceSettings;
  snapGrid: GridSize;
  placementElevation: number;
  placementWorkplane: PlacementWorkplane;
  /** Das Bild der Arbeitsflaeche in diesem Stand, fuer die Karte in der Uebersicht. */
  thumbnailDataUrl: string | null;
};
type ExportFormat = "stl" | "3mf" | "obj" | "step" | "svg" | "png" | "lyl" | "drawing";
type DirectExportFormat = Exclude<ExportFormat, "step" | "png" | "lyl" | "drawing">;
type SvgExportView = "silhouette" | "footprint";
type ViewImageOptions = { plate: boolean; transparent: boolean };
type LylHistoryLimit = EditorHistoryExportLimit;
/** "file" writes into the file the design is tied to (asking for one the first time), "fileAs" always asks (#251). */
type LylExportTarget = "download" | "shared" | "file" | "fileAs";
type ToolbarMode = "geometry" | "sketch";
type OpenGroupOutcome = { ok: boolean; message: string; partIds?: string[]; groupId?: string };
type WithoutRequestId<T> = T extends unknown ? Omit<T, "requestId"> : never;
type CadModifierWorkerPayload = WithoutRequestId<CadModifierWorkerRequest>;
type CadPreviewPayload = Extract<CadModifierWorkerPayload, { type: "preview" }>;
type EdgeModifierSession = {
  kind: CadModifierKind;
  edges: CadModifierEdge[];
  selectedEdgeIds: number[];
  amount: number;
  sharpAngle: number;
  chamferAngle: number;
  // A fillet whose radius changes along its one edge (#687): the radius at the edge's end; null for one radius.
  endAmount?: number | null;
  quality: CadModifierQuality;
  tangentChain: boolean;
  // Off: every edge shows through the body. On: only the ones facing the camera.
  onlyVisibleEdges?: boolean;
  preserveEdgeSize: boolean;
  busy: boolean;
  prepared: boolean;
  error: string | null;
  // The quick buttons that were clicked for the edges picked now, so that top and bottom clicked together light as those two and not as
  // "horizontal", which holds the same edges on a box (#538). Only counts while their edges are still exactly the picked ones.
  quickKeys?: Array<"top" | "bottom" | "vertical" | "horizontal">;
  // The selection of the last preview that worked.
  workingEdgeIds?: number[];
  // The edge(s) whose selection broke a working treatment; drawn red while that error stands.
  failedEdgeIds?: number[];
  preview: WorkplaneShape | null;
  componentPreviews: EdgeModifierComponentPreview[];
};

/**
 * The edge to unselect: the one added when a working treatment broke. It
 * stays the culprit while more edges are added on top. Without a working
 * selection to compare to (the first pick, or the size was changed), the
 * worker's own finding stands.
 */
function conflictEdgeIds(session: EdgeModifierSession, workerFailedEdgeIds: number[]) {
  const added = edgesAddedSinceWorking(session);
  const earlier = new Set(session.failedEdgeIds ?? []);
  const stillSelected = added.filter((edgeId) => earlier.has(edgeId));
  if (stillSelected.length) return stillSelected;
  return added.length ? added : workerFailedEdgeIds;
}

/** The edges picked since the last preview that worked; none without one. */
function edgesAddedSinceWorking(session: EdgeModifierSession) {
  const working = new Set(session.workingEdgeIds ?? []);
  return working.size ? session.selectedEdgeIds.filter((edgeId) => !working.has(edgeId)) : [];
}

type SplitSession = {
  targetIds: string[];
  axis: AlignAxis;
  rotation: SplitRotation;
  position: number;
  pivot: [number, number, number];
  sourceFingerprint: string;
  busy: boolean;
  error: string | null;
  /** The next click on a face sets the plane's position. */
  picking: boolean;
};

type EdgeModifierComponentPreview = {
  owner: number;
  shape: WorkplaneShape;
};
type EdgeFeatureRevertOption = {
  id: string;
  entryId: string;
  path: number[];
  label: string;
  kind: CadModifierKind;
  amount: number;
  endAmount?: number;
  edgeCount: number;
  /** Only for a deletion of faces. */
  faceCount?: number;
  targetName: string;
  createdAt: number;
  removesNewerCount: number;
  /** Can be taken back and opened again with its value and edges (#227): the body's own, with its edges noted. */
  editable: boolean;
};
type BooleanAutomationMode = "before" | "after" | "ungroup";
type BooleanAutomationResult = {
  ok: boolean;
  caseId: string;
  label: string;
  mode: BooleanAutomationMode;
  notice: string;
  shapeCount: number;
  selectedCount: number;
  triangleCount?: number;
  groupedCount?: number;
  groupId?: string;
  error?: string;
};
const SHARED_CLIPBOARD_STORAGE_KEY = "layerling.clipboard";
const SYSTEM_CLIPBOARD_PREFIX = "LAYERLING/1\n";

declare global {
  interface Window {
    __layerlingBooleanTest?: BooleanAutomationResult;
    __layerlingBooleanTestImage?: string;
    layerlingCaptureCanvas?: () => string;
    layerlingCaptureCanvasAsync?: () => Promise<string>;
    layerlingCaptureView?: (face?: LayerlingMcpViewFace) => Promise<string> | string;
    /** The section view for MCP: applies what is given, returns the settings it ends on and the plane's range. */
    layerlingSectionView?: (patch: Partial<SectionPlaneSettings> & { center?: boolean }) => { settings: SectionPlaneSettings; bounds: { min: number; max: number; center: number } };
    /** "Hide workplane" in the camera bar for MCP: sets it when given, returns whether the plate is shown. */
    layerlingWorkplaneDisplay?: (visible?: boolean) => { visible: boolean };
    /** The four saved views (keys 7, 8, 9, 0) for MCP: saves or shows one when asked, returns which keys hold a view. */
    layerlingSavedViews?: (request?: { save?: number; show?: number }) => { keys: { key: string; saved: boolean }[]; shown?: boolean };
  }
}

/** So lange darf das Vorschaubild den Weg zur Uebersicht aufhalten. */
const LEAVE_SNAPSHOT_DEADLINE_MS = 600;
/**
 * Longest a held interaction may keep changes from being saved once nothing
 * moves any more. A drag in progress keeps changing and so keeps waiting.
 */
const PROJECT_SYNC_HELD_MAX_MS = 2000;

/**
 * So lange darf eine Notiz getippt oder gezogen werden, ohne dass daraus ein
 * Schritt im Verlauf wird. Danach steht sie darin - wie ein Absatz in einem
 * Textfeld, nicht wie ein Buchstabe.
 */
const NOTE_COMMIT_IDLE_MS = 700;

const MAX_SKETCH_HISTORY_ENTRIES = 100;
const NORMAL_SELECTION_CAD_EDGE_MIN_ANGLE = 60;
const MIN_EDGE_MODIFIER_AMOUNT = 0.001;
const SEPARATE_PARTS_VERTEX_TOLERANCE = 0.0005;


function parseClipboardShapes(serialized: string): ClipboardPayload<WorkplaneShape> | null {
  const payload = decodeClipboardPayload(serialized);
  if (!payload) return null;
  const shapes = payload.shapes.flatMap((entry) => {
    const shape = clipboardShape(entry);
    return shape ? [shape] : [];
  });
  return { copiedAt: payload.copiedAt, shapes };
}

function readSharedClipboard(): ClipboardPayload<WorkplaneShape> | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const stored = window.localStorage.getItem(SHARED_CLIPBOARD_STORAGE_KEY);
    if (!stored) return null;
    // A large copy from an older layerling may still sit here and crowd out
    // the project list; the tab and the system clipboard carry large copies.
    if (stored.length > LOCAL_CLIPBOARD_LIMIT) {
      window.localStorage.removeItem(SHARED_CLIPBOARD_STORAGE_KEY);
      return null;
    }
    return parseClipboardShapes(stored);
  } catch {
    return null;
  }
}

async function readSystemClipboard(): Promise<ClipboardPayload<WorkplaneShape> | null> {
  if (typeof navigator === "undefined" || !navigator.clipboard?.readText) {
    return null;
  }
  try {
    const value = await navigator.clipboard.readText();
    if (!value.startsWith(SYSTEM_CLIPBOARD_PREFIX)) return null;
    return parseClipboardShapes(value.slice(SYSTEM_CLIPBOARD_PREFIX.length));
  } catch {
    return null;
  }
}

function copyTextWithSelectionFallback(value: string) {
  if (typeof document === "undefined" || typeof document.execCommand !== "function") {
    return;
  }
  const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.readOnly = true;
  textarea.setAttribute("aria-hidden", "true");
  textarea.style.position = "fixed";
  textarea.style.left = "-10000px";
  textarea.style.top = "0";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand("copy");
  } catch {
    // The modern Clipboard API below may still succeed.
  }
  textarea.remove();
  previousFocus?.focus({ preventScroll: true });
}

function writeSharedClipboard(shapes: WorkplaneShape[], copiedAt: number) {
  if (typeof window === "undefined") {
    return;
  }
  const serialized = encodeClipboardPayload(serializeShapesForSync(shapes), copiedAt);
  try {
    if (serialized.length > LOCAL_CLIPBOARD_LIMIT) {
      // Too large for the small local storage: an older copy must not stay
      // behind there either, or another tab would paste that instead.
      window.localStorage.removeItem(SHARED_CLIPBOARD_STORAGE_KEY);
    } else {
      window.localStorage.setItem(SHARED_CLIPBOARD_STORAGE_KEY, serialized);
    }
  } catch {
    try {
      window.localStorage.removeItem(SHARED_CLIPBOARD_STORAGE_KEY);
    } catch {
      // storage unavailable - the tab and the system clipboard still hold the copy
    }
  }
  const systemPayload = `${SYSTEM_CLIPBOARD_PREFIX}${serialized}`;
  const hasClipboardApi = Boolean(navigator.clipboard?.writeText);
  if (copyViaSelectionField(systemPayload.length, hasClipboardApi)) copyTextWithSelectionFallback(systemPayload);
  if (hasClipboardApi) {
    void navigator.clipboard.writeText(systemPayload).catch(() => {
      // Same-origin tabs still have the local-storage fallback.
    });
  }
}

/** A key ring hole (#215) is placed from the plate's real outline: the 2D kernel loads first. */
/** The box of an icon's outline, from which a free key ring hole is placed (#598). */
function iconBox(area: SketchProfile) {
  const bounds = sketchOutlineBounds(area);
  return bounds ? { width: bounds.maxX - bounds.minX, depth: bounds.maxZ - bounds.minZ } : { width: 0, depth: 0 };
}

async function keyringRuntimeReady(keyring: NameTagKeyring | null) {
  if (keyring && !loadedManifoldRuntime()) await getManifoldRuntime().catch(() => null);
}


function meshDataToCadTransfer(mesh: MeshData) {
  const positions = new Float32Array(mesh.vertices.length * 3);
  mesh.vertices.forEach((vertex, index) => positions.set(vertex, index * 3));
  const indices = new Uint32Array(mesh.faces.length * 3);
  mesh.faces.forEach((face, index) => indices.set(face, index * 3));
  return { positions, indices };
}

/**
 * An exact profile part for the CAD worker. The display mesh always goes along
 * as the yardstick the exact body is checked against; its triangles go along
 * as the fallback body only while the whole request stays within the limit
 * that has always applied to meshes - so anything that worked before still
 * has its old way through.
 */
function cadModifierProfileMeshPart(profile: CadModifierProfilePart, mesh: MeshData | undefined, sendMesh: boolean, hole: boolean): CadModifierMeshPart {
  const expected = mesh && mesh.faces.length > 0 ? cadProfileExpectation(mesh.vertices, mesh.faces) : undefined;
  return {
    profile: expected ? { ...profile, expected } : profile,
    ...(sendMesh && mesh ? meshDataToCadTransfer(mesh) : {}),
    hole,
  };
}

/** A thread's exact body for the worker, with the display mesh's bounds and volume to check it against and, when it fits, the mesh to fall back on. */
function cadModifierThreadMeshPart(thread: CadModifierThreadPart, mesh: MeshData | undefined, sendMesh: boolean, hole: boolean): CadModifierMeshPart {
  const expected = mesh && mesh.faces.length > 0 ? cadProfileExpectation(mesh.vertices, mesh.faces) : undefined;
  return {
    thread: expected ? { ...thread, expected } : thread,
    ...(sendMesh && mesh ? meshDataToCadTransfer(mesh) : {}),
    hole,
  };
}

/**
 * A spring's exact body for the worker, with the display mesh's bounds and
 * volume to check it against and, when it fits, the mesh to fall back on. The
 * mesh draws the wire as a polygon inside the round one - a tenth less volume
 * at the coarsest quality - so its volume is first taken up by that share.
 */
function cadModifierSpringMeshPart(spring: CadModifierSpringPart, mesh: MeshData | undefined, sendMesh: boolean, hole: boolean): CadModifierMeshPart {
  const drawn = mesh && mesh.faces.length > 0 ? cadProfileExpectation(mesh.vertices, mesh.faces) : undefined;
  const expected = drawn ? { bounds: drawn.bounds, volume: drawn.volume / spring.meshSectionShare } : undefined;
  return {
    spring: expected ? { ...spring, expected } : spring,
    ...(sendMesh && mesh ? meshDataToCadTransfer(mesh) : {}),
    hole,
  };
}

/** A helical gear's exact body for the worker, with the display mesh's bounds and volume to check it against and, when it fits, the mesh to fall back on. */
function cadModifierHelicalGearMeshPart(gear: CadModifierHelicalGearPart, mesh: MeshData | undefined, sendMesh: boolean, hole: boolean): CadModifierMeshPart {
  const expected = mesh && mesh.faces.length > 0 ? cadProfileExpectation(mesh.vertices, mesh.faces) : undefined;
  return {
    helicalGear: expected ? { ...gear, expected } : gear,
    ...(sendMesh && mesh ? meshDataToCadTransfer(mesh) : {}),
    hole,
  };
}

/** A Gridfinity bin or baseplate's exact body for the worker, with the display mesh's bounds and volume to check it against and, when it fits, the mesh to fall back on. */
function cadModifierGridfinityMeshPart(gridfinity: CadModifierGridfinityPart, mesh: MeshData | undefined, sendMesh: boolean, hole: boolean): CadModifierMeshPart {
  const expected = mesh && mesh.faces.length > 0 ? cadProfileExpectation(mesh.vertices, mesh.faces) : undefined;
  return {
    gridfinity: expected ? { ...gridfinity, expected } : gridfinity,
    ...(sendMesh && mesh ? meshDataToCadTransfer(mesh) : {}),
    hole,
  };
}

/** A STEP import's own body for the worker, with the display mesh's bounds and volume to check it against and, when it fits, the mesh to fall back on. */
function cadModifierImportedStepMeshPart(step: string, brepTransform: number[] | undefined, mesh: MeshData | undefined, sendMesh: boolean, hole: boolean): CadModifierMeshPart {
  return {
    step,
    brepTransform,
    expected: mesh && mesh.faces.length > 0 ? cadProfileExpectation(mesh.vertices, mesh.faces) : undefined,
    ...(sendMesh && mesh ? meshDataToCadTransfer(mesh) : {}),
    hole,
  };
}


function cadEdgeEndpoint(edge: CadModifierEdge, end: "start" | "end") {
  const offset = end === "start" ? 0 : edge.points.length - 3;
  return new THREE.Vector3(edge.points[offset], edge.points[offset + 1], edge.points[offset + 2]);
}

function cadEdgeTangentAt(edge: CadModifierEdge, endpoint: THREE.Vector3) {
  const start = cadEdgeEndpoint(edge, "start");
  const end = cadEdgeEndpoint(edge, "end");
  if (endpoint.distanceToSquared(start) <= endpoint.distanceToSquared(end)) {
    const next = new THREE.Vector3(edge.points[3], edge.points[4], edge.points[5]);
    return next.sub(start).normalize();
  }
  const offset = Math.max(0, edge.points.length - 6);
  const previous = new THREE.Vector3(edge.points[offset], edge.points[offset + 1], edge.points[offset + 2]);
  return previous.sub(end).normalize();
}

function tangentCadEdgeChain(edges: CadModifierEdge[], startId: number, allowedIds: Set<number>) {
  const edgeById = new Map(edges.map((edge) => [edge.id, edge]));
  const selected = new Set<number>([startId]);
  const queue = [startId];
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;
  edges.forEach((edge) => {
    for (let index = 0; index + 2 < edge.points.length; index += 3) {
      minX = Math.min(minX, edge.points[index]);
      minY = Math.min(minY, edge.points[index + 1]);
      minZ = Math.min(minZ, edge.points[index + 2]);
      maxX = Math.max(maxX, edge.points[index]);
      maxY = Math.max(maxY, edge.points[index + 1]);
      maxZ = Math.max(maxZ, edge.points[index + 2]);
    }
  });
  const diagonal = [minX, minY, minZ, maxX, maxY, maxZ].every(Number.isFinite)
    ? Math.hypot(maxX - minX, maxY - minY, maxZ - minZ)
    : 1;
  const tolerance = Math.max(1e-6, Math.min(0.01, diagonal * 1e-5));
  while (queue.length > 0) {
    const id = queue.shift() as number;
    const edge = edgeById.get(id);
    if (!edge) continue;
    const endpoints = [cadEdgeEndpoint(edge, "start"), cadEdgeEndpoint(edge, "end")];
    edges.forEach((candidate) => {
      if (selected.has(candidate.id) || !allowedIds.has(candidate.id)) return;
      const candidateEndpoints = [cadEdgeEndpoint(candidate, "start"), cadEdgeEndpoint(candidate, "end")];
      const shared = endpoints.find((point) => candidateEndpoints.some((other) => point.distanceTo(other) <= tolerance));
      if (!shared) return;
      const a = cadEdgeTangentAt(edge, shared);
      const b = cadEdgeTangentAt(candidate, shared);
      const deviation = (Math.acos(Math.max(-1, Math.min(1, Math.abs(a.dot(b))))) * 180) / Math.PI;
      if (deviation <= 16) {
        selected.add(candidate.id);
        queue.push(candidate.id);
      }
    });
  }
  return [...selected];
}

function cadDisplayEdgesAfterTreatment(shape: WorkplaneShape, session: EdgeModifierSession) {
  const removed = new Set(session.selectedEdgeIds);
  const elevation = shape.elevation ?? 0;
  return session.edges
    .filter((edge) => {
      const effectiveAngle = Math.min(edge.angle, 180 - edge.angle);
      return edge.manifold
        && !edge.boundary
        && effectiveAngle + 1e-3 >= Math.max(session.sharpAngle, NORMAL_SELECTION_CAD_EDGE_MIN_ANGLE)
        && !removed.has(edge.id);
    })
    .map((edge) => ({
      points: edge.points.map((value, index) => {
        if (index % 3 === 0) return value - shape.x;
        if (index % 3 === 1) return value - elevation;
        return value - shape.z;
      }),
    }));
}

function cadDisplayEdgesForShape(shape: WorkplaneShape, edges: CadModifierDisplayEdge[]) {
  const elevation = shape.elevation ?? 0;
  return edges
    .filter((edge) => edge.points.length >= 6)
    .map((edge) => ({
      points: edge.points.map((value, index) => {
        if (index % 3 === 0) return value - shape.x;
        if (index % 3 === 1) return value - elevation;
        return value - shape.z;
      }),
    }));
}

function cadModifierComponentPreviews(sourceParts: WorkplaneShape[], components: CadModifierComponentMesh[] | undefined, deflection?: CadModifierDeflection): EdgeModifierComponentPreview[] {
  if (!components?.length) return [];
  const previews: EdgeModifierComponentPreview[] = [];
  components.forEach((component) => {
    const source = sourceParts[component.owner] ?? sourceParts[0];
    if (!source) return;
    const shape = shapeFromCadMesh(source, component.positions, component.normals, component.indices, component.brep, deflection);
    if (!shape) return;
    previews.push({
      owner: component.owner,
      shape: canonicalizeShape({
        ...shape,
        cadDisplayEdges: cadDisplayEdgesForShape(shape, component.displayEdges),
        cadDisplayEdgesVersion: 2 as const,
      }),
    });
  });
  return previews;
}

function bedOverhangMessage(overhangs: BedOverhang[], printer: string) {
  if (overhangs.length > 1) return t("status.bedOverhangMany", { count: overhangs.length, printer });
  const [overhang] = overhangs;
  const mm = (value: number) => Number(value.toFixed(1));
  const sides = (["left", "right", "back", "front", "top"] as const)
    .filter((side) => overhang[side] > 0.01)
    .map((side) => t(`bed.side.${side}`, { mm: mm(overhang[side]) }))
    .join(", ");
  return t("status.bedOverhangOne", { name: displayShapeName(overhang.shape), printer, sides });
}

function edgeTreatmentLabel(feature: NonNullable<WorkplaneShape["edgeTreatments"]>[number]) {
  const size = feature.endAmount !== undefined
    ? `${Number(feature.amount.toFixed(2))}-${Number(feature.endAmount.toFixed(2))} mm`
    : `${Number(feature.amount.toFixed(2))} mm`;
  if (feature.kind === "shell") return `hollow (${size} walls, open ${shellOpenSides(feature.openings).join(" + ") || "none"})`;
  if (feature.kind === "deleteFace") return `face deletion (${feature.faceCount ?? 0} face${feature.faceCount === 1 ? "" : "s"})`;
  return `${feature.kind === "fillet" ? "fillet" : feature.kind === "chamfillet" ? "chamfillet" : "chamfer"} (${size}, ${feature.edgeCount} edge${feature.edgeCount === 1 ? "" : "s"})`;
}

function shapeWithEdgeTreatmentRecord(
  shape: WorkplaneShape,
  before: WorkplaneShape,
  feature: NonNullable<WorkplaneShape["edgeTreatments"]>[number],
  preserveEdgeSize: boolean,
  createdAt: number,
) {
  return canonicalizeShape({
    ...shape,
    edgeResizeMode: preserveEdgeSize ? "preserve" : "scale",
    edgeTreatments: [
      ...(before.edgeTreatments ?? []),
      {
        ...feature,
      },
    ],
    edgeTreatmentHistory: [
      ...compactEdgeTreatmentHistory(before.edgeTreatmentHistory),
      {
        id: createLocalId("edge-history"),
        createdAt,
        feature,
        before: cloneWorkplaneShapeSnapshot(before),
        appliedFrame: edgeTreatmentAppliedFrame(shape),
      },
    ],
  });
}

function bakedEdgeTreatmentPreview(shape: WorkplaneShape, base: WorkplaneShape) {
  if (!base.groupedShapes?.length) return shape;
  return canonicalizeShape({
    ...shape,
    groupedShapes: undefined,
    groupedBaseWidth: undefined,
    groupedBaseDepth: undefined,
    groupedBaseHeight: undefined,
  });
}

type ShapeTransformSnapshot = {
  x: number;
  z: number;
  elevation: number;
  rotationQuaternion: THREE.Quaternion;
};

/**
 * Die Drehung backt bei fast jeder Form sofort ins Netz - danach steht
 * `shape.rotation` wieder auf 0, obwohl sich der Koerper sichtbar gedreht
 * hat. Die tatsaechlich seit der Entstehung aufgelaufene Drehung steckt dann
 * in `parametricSource` (`quaternionForShape`/`rotationFromQuaternion`, siehe
 * [[layerling-drehen-backt]]) - nur Text und Gruppen fuehren sie weiter im
 * eigenen Feld. Diese Quelle liefert in beiden Faellen dieselbe, vergleichbare
 * Drehung.
 */
function shapeTransformSnapshot(shape: WorkplaneShape): ShapeTransformSnapshot {
  return {
    x: shape.x,
    z: shape.z,
    elevation: shape.elevation ?? 0,
    rotationQuaternion: quaternionForShape(shape.parametricSource ?? shape),
  };
}

type ShapeMoveDelta = {
  dx: number;
  dz: number;
  delevation: number;
  rotationDelta: THREE.Quaternion;
};

const ZERO_MOVE_DELTA: ShapeMoveDelta = { dx: 0, dz: 0, delevation: 0, rotationDelta: new THREE.Quaternion() };

function shapeMoveDeltaBetween(from: ShapeTransformSnapshot, to: ShapeTransformSnapshot): ShapeMoveDelta {
  return {
    dx: to.x - from.x,
    dz: to.z - from.z,
    delevation: to.elevation - from.elevation,
    rotationDelta: to.rotationQuaternion.clone().multiply(from.rotationQuaternion.clone().invert()),
  };
}

function isZeroMoveDelta(delta: ShapeMoveDelta) {
  const epsilon = 1e-6;
  return Math.abs(delta.dx) < epsilon && Math.abs(delta.dz) < epsilon && Math.abs(delta.delevation) < epsilon
    && 1 - Math.abs(delta.rotationDelta.w) < epsilon;
}

/**
 * Verschiebt und dreht eine Kopie um denselben Betrag, den ihre Vorlage seit
 * ihrer eigenen Entstehung erfahren hat. Die Verschiebung ist ein einfaches
 * Feld-Update; die Drehung nicht, weil sie bei den meisten Formen sofort
 * backt (siehe `shapeTransformSnapshot` oben). Bei Text und Gruppen bleibt
 * die Drehung ein Feld und wird direkt weitergeschrieben. Bei allem anderen
 * wird der Zuwachs als neue Drehung eingetragen und derselbe Weg benutzt, der
 * auch einen echten Zieh-Griff backt (`bakeShapeTransformIntoMesh`) - so trifft
 * die Drehung wirklich die Netz-Eckpunkte der Kopie, nicht nur ein Feld, das
 * ohnehin gleich wieder auf 0 zurueckfiele.
 */
function applyShapeMoveDelta(shape: WorkplaneShape, delta: ShapeMoveDelta): WorkplaneShape {
  const moved: WorkplaneShape = {
    ...shape,
    x: shape.x + delta.dx,
    z: shape.z + delta.dz,
    elevation: (shape.elevation ?? 0) + delta.delevation,
  };
  if (isZeroMoveDelta({ ...ZERO_MOVE_DELTA, rotationDelta: delta.rotationDelta })) {
    return moved;
  }
  if (shapeTransformShouldRemainEditable(moved)) {
    return { ...moved, ...rotationFromQuaternion(delta.rotationDelta.clone().multiply(quaternionForShape(moved))) };
  }
  return bakeShapeTransformIntoMesh({ ...moved, ...rotationFromQuaternion(delta.rotationDelta) });
}

function shapeCenterDistance(a: WorkplaneShape, b: WorkplaneShape) {
  const ax = a.x;
  const ay = (a.elevation ?? 0) + a.height / 2;
  const az = a.z;
  const bx = b.x;
  const by = (b.elevation ?? 0) + b.height / 2;
  const bz = b.z;
  return Math.hypot(ax - bx, ay - by, az - bz);
}

function shapeDimensionDistance(a: WorkplaneShape, b: WorkplaneShape) {
  return Math.hypot(shapeWidth(a) - shapeWidth(b), a.height - b.height, shapeDepth(a) - shapeDepth(b));
}

function matchCadComponentsToSources(sourceParts: WorkplaneShape[], componentPreviews: EdgeModifierComponentPreview[]) {
  const candidates = componentPreviews.flatMap((component, componentIndex) =>
    sourceParts.map((source, sourceIndex) => ({
      component,
      componentIndex,
      sourceIndex,
      score: shapeCenterDistance(component.shape, source) + shapeDimensionDistance(component.shape, source) * 0.25,
    })),
  );
  candidates.sort((a, b) => a.score - b.score);

  const usedComponents = new Set<number>();
  const usedSources = new Set<number>();
  const ownerToSourceIndex = new Map<number, number>();
  candidates.forEach((candidate) => {
    if (usedComponents.has(candidate.componentIndex) || usedSources.has(candidate.sourceIndex)) return;
    usedComponents.add(candidate.componentIndex);
    usedSources.add(candidate.sourceIndex);
    ownerToSourceIndex.set(candidate.component.owner, candidate.sourceIndex);
  });
  return ownerToSourceIndex;
}

function groupedShapeWithComponentEdgeTreatment(
  base: WorkplaneShape,
  preview: WorkplaneShape,
  sourceParts: WorkplaneShape[],
  session: EdgeModifierSession,
  feature: NonNullable<WorkplaneShape["edgeTreatments"]>[number],
  createdAt: number,
) {
  if (
    !base.groupedShapes?.length ||
    // A tapered or twisted/leaned group is sent to CAD as one baked final mesh
    // because the parent deformation cannot be represented by its undeformed
    // child primitives. Keep the treated result flattened instead of
    // rebuilding a nested group that would reintroduce the old pre-deform
    // children.
    shapeHasShapeDeform(base) ||
    !hasOneToOneCadComponentMapping(sourceParts.length, session.componentPreviews.map((component) => component.owner))
  ) {
    return null;
  }

  const edgeById = new Map(session.edges.map((edge) => [edge.id, edge]));
  const ownerEdgeCounts = new Map<number, number>();
  session.selectedEdgeIds.forEach((edgeId) => {
    const owner = edgeById.get(edgeId)?.owner;
    if (typeof owner !== "number") return;
    ownerEdgeCounts.set(owner, (ownerEdgeCounts.get(owner) ?? 0) + 1);
  });
  if (ownerEdgeCounts.size === 0) {
    return null;
  }

  const ownerToSourceIndex = matchCadComponentsToSources(sourceParts, session.componentPreviews);
  if (ownerToSourceIndex.size !== sourceParts.length) {
    return null;
  }
  const componentByOwner = new Map(session.componentPreviews.map((component) => [component.owner, component]));
  const updatedSources = [...sourceParts];
  let changed = false;

  ownerEdgeCounts.forEach((edgeCount, owner) => {
    const sourceIndex = ownerToSourceIndex.get(owner);
    const component = componentByOwner.get(owner);
    if (sourceIndex === undefined || !component) return;
    const source = sourceParts[sourceIndex];
    const ownerFeature = { ...feature, edgeCount };
    const retargeted = canonicalizeShape({
      ...component.shape,
      id: source.id,
      name: source.name,
      color: source.color,
      hole: source.hole || undefined,
      locked: source.locked,
      hidden: source.hidden,
      groupedShapes: source.groupedShapes,
      groupedBaseWidth: source.groupedBaseWidth,
      groupedBaseDepth: source.groupedBaseDepth,
      groupedBaseHeight: source.groupedBaseHeight,
    });
    updatedSources[sourceIndex] = shapeWithEdgeTreatmentRecord(retargeted, source, ownerFeature, session.preserveEdgeSize, createdAt);
    changed = true;
  });

  if (!changed) {
    return null;
  }

  const elevation = preview.elevation ?? 0;
  return canonicalizeShape({
    ...preview,
    edgeResizeMode: session.preserveEdgeSize ? "preserve" : "scale",
    edgeTreatments: base.edgeTreatments,
    edgeTreatmentHistory: base.edgeTreatmentHistory?.length ? compactEdgeTreatmentHistory(base.edgeTreatmentHistory) : undefined,
    groupedBaseWidth: shapeWidth(preview),
    groupedBaseDepth: shapeDepth(preview),
    groupedBaseHeight: preview.height,
    groupedShapes: updatedSources.map((shape) => cloneAsGroupChild(shape, preview.x, preview.z, elevation)),
  });
}

function edgeTreatmentFeatureCount(shape: WorkplaneShape): number {
  return (shape.edgeTreatments?.length ?? 0) + (shape.groupedShapes?.reduce((total, child) => total + edgeTreatmentFeatureCount(child), 0) ?? 0);
}

function reversibleEdgeTreatmentCount(shape: WorkplaneShape): number {
  return (shape.edgeTreatmentHistory?.length ?? 0) + (shape.groupedShapes?.reduce((total, child) => total + reversibleEdgeTreatmentCount(child), 0) ?? 0);
}

function edgeTreatmentHistoryOptions(shape: WorkplaneShape, path: number[] = [], targetName = shape.name): EdgeFeatureRevertOption[] {
  const ownHistory = shape.edgeTreatmentHistory ?? [];
  const ownOptions = ownHistory.map((entry, index) => ({
    id: `${path.length ? path.join(".") : "root"}:${entry.id}`,
    entryId: entry.id,
    path,
    label: edgeTreatmentLabel(entry.feature),
    kind: entry.feature.kind,
    amount: entry.feature.amount,
    ...(entry.feature.endAmount !== undefined ? { endAmount: entry.feature.endAmount } : {}),
    edgeCount: entry.feature.edgeCount,
    faceCount: entry.feature.faceCount,
    targetName,
    createdAt: entry.createdAt,
    removesNewerCount: Math.max(0, ownHistory.length - index - 1),
    editable: path.length === 0 && (entry.feature.kind === "shell" || Boolean(entry.feature.edgeIds?.length)),
  }));
  const childOptions = (shape.groupedShapes ?? []).flatMap((child, index) =>
    edgeTreatmentHistoryOptions(child, [...path, index], `${targetName} / ${child.name}`),
  );
  return [...ownOptions, ...childOptions].sort((a, b) => b.createdAt - a.createdAt);
}

function restoreOwnLastEdgeTreatment(shape: WorkplaneShape, entry: NonNullable<WorkplaneShape["edgeTreatmentHistory"]>[number]) {
  return restoreShapeBeforeEdgeTreatment(shape, entry);
}

async function restoreEdgeTreatmentInShape(shape: WorkplaneShape, path: number[], entryId: string, triangleLimit: number): Promise<{ shape: WorkplaneShape; label: string } | null> {
  if (path.length === 0) {
    const entry = (shape.edgeTreatmentHistory ?? []).find((candidate) => candidate.id === entryId);
    return entry ? { shape: restoreOwnLastEdgeTreatment(shape, entry), label: edgeTreatmentLabel(entry.feature) } : null;
  }

  if (!shape.groupedShapes?.length) {
    return null;
  }

  const [childIndex, ...restPath] = path;
  const restoredChildren = restoreGroupedChildren(shape);
  const child = restoredChildren[childIndex];
  if (!child) {
    return null;
  }
  const restoredChild = await restoreEdgeTreatmentInShape(child, restPath, entryId, triangleLimit);
  if (!restoredChild) {
    return null;
  }

  restoredChildren[childIndex] = restoredChild.shape;
  const rebuilt = await buildGroupedShapeFromSelection(restoredChildren, triangleLimit);
  if (!rebuilt.group) {
    return null;
  }

  return {
    shape: canonicalizeShape({
      ...rebuilt.group,
      id: shape.id,
      name: shape.name,
      color: shape.color,
      hole: shape.hole || rebuilt.group.hole,
      locked: shape.locked,
      hidden: shape.hidden,
      edgeResizeMode: shape.edgeResizeMode,
      groupOperation: shape.groupOperation,
      edgeTreatments: shape.edgeTreatments,
      edgeTreatmentHistory: shape.edgeTreatmentHistory?.length ? compactEdgeTreatmentHistory(shape.edgeTreatmentHistory) : undefined,
    }),
    label: restoredChild.label,
  };
}


function shapeHasTransformToBake(shape: WorkplaneShape) {
  return (
    Math.abs(cleanRotationDegrees(shape.rotation ?? 0, 3)) > 0 ||
    Math.abs(cleanRotationDegrees(shape.rotationX ?? 0, 3)) > 0 ||
    Math.abs(cleanRotationDegrees(shape.rotationZ ?? 0, 3)) > 0 ||
    Boolean(shape.mirrorX || shape.mirrorY || shape.mirrorZ)
  );
}


function cadModifierPrimitiveForShape(shape: WorkplaneShape): CadModifierPrimitivePart | null {
  // Taper, twist and lean are all non-affine deformations, so an analytic
  // primitive or stored BREP cannot represent the final visible surface.
  // Send the baked mesh to the CAD worker instead so edge selection/treatment
  // matches the viewport exactly.
  if (shapeHasShapeDeform(shape)) return null;
  return cadModifierPrimitiveForBakedShape(shape)
    ?? cadModifierPrimitiveForAnalyticShape(shape);
}

/**
 * Beim Backen festhalten, was der Koerper war - sonst waere eine gedrehte
 * Mutter fuer immer ein Netz. Wer schon einmal gedreht wurde, behaelt seine
 * Urform; die neue Drehung kommt oben drauf, und verkettet wird ueber
 * Quaternionen, weil Eulerwinkel sich nicht addieren lassen.
 *
 * Eine Spiegelung wird **nicht** festgehalten: sie liesse sich nicht ehrlich
 * wieder auftragen - ein gespiegeltes Rechtsgewinde ist ein Linksgewinde, und
 * das waere ein anderer Koerper.
 */
function parametricSourceForBake(shape: WorkplaneShape): ParametricSource | undefined {
  if (shape.mirrorX || shape.mirrorY || shape.mirrorZ) return undefined;
  const bekannt = shape.parametricSource;
  if (bekannt) return { ...bekannt, ...composedShapeRotation(shape, bekannt) };
  if (shape.kind === "mesh" || shape.importedMesh || shape.groupedShapes?.length || shape.imagePlate) {
    return undefined;
  }
  return {
    kind: shape.kind,
    width: shapeWidth(shape),
    depth: shapeDepth(shape),
    height: shape.height,
    size: shape.size,
    rotation: shape.rotation,
    rotationX: shape.rotationX ?? 0,
    rotationZ: shape.rotationZ ?? 0,
    taperTopWidth: shape.taperTopWidth,
    taperTopDepth: shape.taperTopDepth,
    taperBottomWidth: shape.taperBottomWidth,
    taperBottomDepth: shape.taperBottomDepth,
    extrudeTwist: shape.extrudeTwist,
    extrudeTopOffsetX: shape.extrudeTopOffsetX,
    extrudeTopOffsetZ: shape.extrudeTopOffsetZ,
  };
}

/**
 * Der Rueckweg: Urform herstellen, die Aenderung einsetzen, wieder drehen,
 * wieder backen. Die Lage bleibt, wo der Anwender den Koerper zuletzt
 * hingestellt hat - das Backen rechnet sie aus dem Netz, aber verschoben
 * haben kann er ihn seither trotzdem.
 */
function rebuiltParametricShape(shape: WorkplaneShape, patch: Partial<WorkplaneShape>) {
  const source = shape.parametricSource;
  if (!source) return null;
  /*
   * Eine Drehung im selben Zug ist eine Drehung **auf** das gebackene Netz,
   * also kommt sie oben auf die schon aufgelaufene. Wer sie stattdessen
   * einsetzt, verliert alles Vorherige - dann liegt die Mutter wieder flach.
   */
  const { rotation, rotationX, rotationZ, ...bauwerte } = patch;
  const drehtMit = [rotation, rotationX, rotationZ].some((wert) => typeof wert === "number");
  const gesamt = drehtMit
    ? composedShapeRotation({ rotation: rotation ?? 0, rotationX: rotationX ?? 0, rotationZ: rotationZ ?? 0 }, source)
    : { rotation: source.rotation, rotationX: source.rotationX, rotationZ: source.rotationZ };
  const urform = canonicalizeShape({
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
    importedMesh: undefined,
    parametricSource: undefined,
    rotation: 0,
    rotationX: 0,
    rotationZ: 0,
    ...bauwerte,
  });
  const gebacken = canonicalizeShape(bakeShapeTransformIntoMesh(canonicalizeShape({ ...urform, ...gesamt })));
  const targetX = patch.x ?? (drehtMit ? gebacken.x : shape.x);
  const targetZ = patch.z ?? (drehtMit ? gebacken.z : shape.z);
  const targetElevation = patch.elevation ?? (drehtMit ? gebacken.elevation : (shape.elevation ?? 0));
  return canonicalizeShape({
    ...gebacken,
    x: targetX,
    z: targetZ,
    elevation: targetElevation,
  });
}

/** A change from the settings panel on one shape, as `updateShape` makes it - and the two gears of "Fit module" (#645). */
function shapeWithInspectorPatch(shape: WorkplaneShape, cleanedPatch: Partial<WorkplaneShape>, bakeTransform = false) {
  // Ein Bauwert an einem gedrehten Koerper heisst: neu bauen, nicht
  // das Netz verbiegen. Ein Zug am Anfasser trifft dagegen nur den
  // Rahmen und laesst das gebackene Netz in Ruhe.
  const neugebaut = patchTouchesBodyParameters(cleanedPatch) ? rebuiltParametricShape(shape, cleanedPatch) : null;
  const patched = neugebaut ?? { ...shape, ...textShrinkPatch(shape, curvedTextPatch(shape, heightPatchKeepingBase(shape, cleanedPatch))) };
  const canonicalBase = canonicalizeShape("hole" in cleanedPatch ? withHoleMode(patched, Boolean(cleanedPatch.hole), cleanedPatch.color) : patched);
  return bakeTransform ? canonicalizeShape(bakeShapeTransformIntoMesh(canonicalBase)) : canonicalBase;
}

function bakeShapeTransformIntoMesh(shape: WorkplaneShape): WorkplaneShape {
  // Text and groups must retain their editable source data across transforms.
  // Baking a group would discard groupedShapes and make Ungroup unavailable.
  if (shapeTransformShouldRemainEditable(shape) || !shapeHasTransformToBake(shape)) {
    return shape;
  }

  const mesh = meshForShape(shape);
  if (mesh.vertices.length < 3 || mesh.faces.length < 1) {
    return shape;
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  mesh.vertices.forEach(([x, y, z]) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    maxZ = Math.max(maxZ, z);
  });

  if (![minX, minY, minZ, maxX, maxY, maxZ].every(Number.isFinite)) {
    return shape;
  }

  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const rawWidth = Math.max(MIN_SHAPE_DIMENSION, maxX - minX);
  const rawHeight = Math.max(MIN_SHAPE_DIMENSION, maxY - minY);
  const rawDepth = Math.max(MIN_SHAPE_DIMENSION, maxZ - minZ);
  const width = cleanModelDimension(rawWidth);
  const height = cleanModelDimension(rawHeight);
  const depth = cleanModelDimension(rawDepth);
  const positions: number[] = [];
  const bakedCadMetadata = bakeCadMetadataForShapeTransform(shape, { centerX, minY, centerZ, width, depth, height, yawDegrees: meshYawDegrees(shape) });

  mesh.faces.forEach(([ai, bi, ci]) => {
    [mesh.vertices[ai], mesh.vertices[bi], mesh.vertices[ci]].forEach(([x, y, z]) => {
      positions.push(x - centerX, y - minY, z - centerZ);
    });
  });

  // The pivot stays on its spot in the world while the frame changes under it.
  return carryShapePivot(shape, {
    ...shape,
    kind: "mesh",
    x: cleanNearZero(centerX, 0.0005),
    z: cleanNearZero(centerZ, 0.0005),
    elevation: cleanNearZero(minY, 0.0005),
    width,
    depth,
    height,
    size: Math.max(width, depth),
    rotation: 0,
    rotationX: 0,
    rotationZ: 0,
    mirrorX: undefined,
    mirrorY: undefined,
    mirrorZ: undefined,
    taperTopWidth: undefined,
    taperTopDepth: undefined,
    taperBottomWidth: undefined,
    taperBottomDepth: undefined,
    taperTopScale: undefined,
    taperBottomScale: undefined,
    importedMesh: {
      positions,
      baseWidth: rawWidth,
      baseDepth: rawDepth,
      baseHeight: rawHeight,
      triangleCount: mesh.faces.length,
      sourceFormat: "json",
    },
    ...bakedCadMetadata,
    parametricSource: parametricSourceForBake(shape),
    imagePlate: undefined,
    groupedShapes: undefined,
    groupedBaseWidth: undefined,
    groupedBaseDepth: undefined,
    groupedBaseHeight: undefined,
  });
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Image could not be read"));
      }
    });
    reader.addEventListener("error", () => reject(new Error("Image could not be read")));
    reader.readAsDataURL(file);
  });
}

function loadImageElement(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () => reject(new Error("Image could not be decoded")));
    image.src = dataUrl;
  });
}

async function prepareImportedImage(file: File) {
  const sourceUrl = await readFileAsDataUrl(file);
  const image = await loadImageElement(sourceUrl);
  const pixelWidth = image.naturalWidth || image.width;
  const pixelHeight = image.naturalHeight || image.height;

  if (!pixelWidth || !pixelHeight) {
    throw new Error("Image has no readable dimensions");
  }

  const maxTextureSide = 2048;
  const textureScale = Math.min(1, maxTextureSide / Math.max(pixelWidth, pixelHeight));
  if (textureScale >= 1) {
    return {
      dataUrl: sourceUrl,
      mimeType: file.type || "image/png",
      pixelWidth,
      pixelHeight,
    };
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(pixelWidth * textureScale));
  canvas.height = Math.max(1, Math.round(pixelHeight * textureScale));
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Image could not be prepared");
  }
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const mimeType = file.type === "image/jpeg" || file.type === "image/webp" ? file.type : "image/png";
  return {
    dataUrl: canvas.toDataURL(mimeType, 0.92),
    mimeType,
    pixelWidth,
    pixelHeight,
  };
}

function imagePlateDimensions(pixelWidth: number, pixelHeight: number) {
  const aspect = pixelWidth / Math.max(1, pixelHeight);
  const targetMax = 72;
  const minVisibleSide = 14;
  const maxAllowedSide = 110;
  let width = aspect >= 1 ? targetMax : targetMax * aspect;
  let depth = aspect >= 1 ? targetMax / aspect : targetMax;
  const minSide = Math.min(width, depth);

  if (minSide < minVisibleSide) {
    const boost = minVisibleSide / Math.max(0.001, minSide);
    width *= boost;
    depth *= boost;
  }

  const maxSide = Math.max(width, depth);
  if (maxSide > maxAllowedSide) {
    const shrink = maxAllowedSide / maxSide;
    width *= shrink;
    depth *= shrink;
  }

  return {
    width: Number(width.toFixed(2)),
    depth: Number(depth.toFixed(2)),
    height: 1.6,
  };
}

/**
 * The SVG of only what stands on the workplane (#692): the outlines of the section a hair above the lowest
 * point, drawn as lines in their colours. `shapes` are the visible ones to export, loose holes among them.
 */
async function footprintSvg(shapes: readonly WorkplaneShape[], title: string) {
  const { solids, meshes: cut } = await exportBodiesWithLooseHoles(shapes);
  const { meshes, quellen } = await colorSeparatedExportMeshes(solids, cut);
  const offset = footprintCutOffset(meshes);
  const bodies = offset === null ? [] : meshes.map((mesh, index) => {
    const body = solids[quellen[index]];
    return { name: body ? displayShapeName(body) : mesh.name, color: body?.color ?? "#000000", loops: sliceMeshContours(mesh, "y", offset) };
  });
  const result = offset === null ? null : sectionSvgDocument(bodies, "y", offset, title);
  if (!result) throw new Error(t("status.sectionSvgNothing"));
  return result;
}

/** `cutMeshes` holds a body's mesh where loose holes have cut it (#203); the others are built from the shape. */
async function toSvg(shapes: WorkplaneShape[], title: string, cutMeshes: ReadonlyArray<MeshData | null> = []) {
  const runtime = await getManifoldRuntime();
  const layers: SvgProjectionLayer[] = [];

  for (const [index, shape] of shapes.entries()) {
    const created: ManifoldSolid[] = [];
    const projectedObjects: unknown[] = [];
    try {
      const cut = cutMeshes[index];
      let solid: ManifoldSolid | null;
      if (cut) {
        const manifoldMesh = meshDataToManifoldMesh(runtime, cut);
        try {
          solid = runtime.Manifold.ofMesh(manifoldMesh);
          created.push(solid);
        } finally {
          disposeManifold(manifoldMesh);
        }
      } else {
        solid = shapeToManifoldSolid(runtime, shape, created);
      }
      if (!solid || solid.status() !== "NoError" || solid.numTri() < 1) {
        throw new Error(`Could not convert ${shape.name} into a watertight SVG outline`);
      }

      // Seen from above with the front at the bottom, as the top view shows it: the plate's z runs
      // down the page. Turned the other way, every export came out mirrored top to bottom (#197).
      const topView = solid.rotate([-90, 0, 0]);
      if (topView !== solid) created.push(topView);
      const projection = topView.project();
      projectedObjects.push(projection);
      const simplified = projection.simplify(0.00001);
      if (simplified !== projection) projectedObjects.push(simplified);
      const polygons = simplified.toPolygons();
      if (!polygons.length) throw new Error(`Top view of ${shape.name} has no exportable area`);
      layers.push({ name: shape.name, color: shape.color, polygons });
    } finally {
      [...new Set([...projectedObjects, ...created])].reverse().forEach(disposeManifold);
    }
  }

  return toSvgProjection(layers, title);
}

function triggerBrowserDownload(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function downloadTextFile(filename: string, content: string, type: string) {
  triggerBrowserDownload(filename, content, type);
}

async function downloadBlobFile(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}


/**
 * The copies of a pattern: every selected shape, once per extra piece, moved
 * along the row or turned around the circle centre. The originals stay put.
 */
function arrayCopies(sources: WorkplaneShape[], settings: ArraySettings): WorkplaneShape[] {
  const count = clampArrayCount(settings.count);
  const step = circleStepDegrees(count, settings.angle);
  const center = { x: settings.centerX, y: settings.centerY };
  const copies: WorkplaneShape[] = [];
  for (let index = 1; index < count; index += 1) {
    sources.forEach((source) => {
      const clone = cloneWorkplaneShapeTreeWithFreshIds(source, "copy");
      if (settings.mode === "row") {
        const { dx, dy, dz } = rowOffset(settings, index);
        copies.push({ ...clone, x: clone.x + dx, z: clone.z + dz, elevation: (clone.elevation ?? 0) + dy });
        return;
      }
      const degrees = step * index;
      // A rise lifts every copy a little more; a radius change moves it along its
      // line from the centre - together they make a screw or a spiral.
      const rise = (settings.rise ?? 0) * index;
      const radiusChange = (settings.radiusChange ?? 0) * index;
      if (!settings.rotateCopies) {
        const turned = rotateAroundVertical(clone, center, degrees);
        const next = moveAlongRadius(turned, center, degrees, radiusChange);
        copies.push({ ...clone, x: next.x, z: next.z, elevation: (clone.elevation ?? 0) + rise });
        return;
      }
      // Same rotation as the R key and the pivot tool: about the vertical
      // through the centre, at the shape's own height.
      const delta = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(degrees));
      const pivot = new THREE.Vector3(center.x, (clone.elevation ?? 0) + clone.height / 2, -center.y);
      const rotated = canonicalizeShape({ ...clone, ...rotatedGeometryShapePatch(clone, delta, pivot) });
      const placed = moveAlongRadius(rotated, center, degrees, radiusChange);
      const lifted = rise || radiusChange
        ? canonicalizeShape({ ...rotated, x: placed.x, z: placed.z, elevation: (rotated.elevation ?? 0) + rise })
        : rotated;
      copies.push(canonicalizeShape(bakeShapeTransformIntoMesh(lifted)));
    });
  }
  return copies;
}


/** A side of an object's own box, named as MCP names it, in the object's unturned frame. */
const LAY_FLAT_SIDES = {
  bottom: [0, -1, 0],
  top: [0, 1, 0],
  left: [-1, 0, 0],
  right: [1, 0, 0],
  back: [0, 0, -1],
  front: [0, 0, 1],
} as const;
type LayFlatSide = keyof typeof LAY_FLAT_SIDES;

/**
 * The outward normal of the real face of a body that points closest to
 * `direction` - so a rough direction, or a side of the box, lands an actual
 * face flat and not a tilt between two. Mesh winding is not always
 * consistent, so "outward" is taken as away from the body's centre; a face
 * never counts the wrong way round (the bottom never passes for the top).
 */
/** The triangles of a body in the world, nine numbers each - what the face readers take. */
function worldTrianglePositions(shape: WorkplaneShape): Float64Array {
  const mesh = meshForShape(shape);
  const positions = new Float64Array(mesh.faces.length * 9);
  mesh.faces.forEach((face, index) => {
    face.forEach((vertexIndex, corner) => {
      const vertex = mesh.vertices[vertexIndex];
      positions[index * 9 + corner * 3] = vertex[0];
      positions[index * 9 + corner * 3 + 1] = vertex[1];
      positions[index * 9 + corner * 3 + 2] = vertex[2];
    });
  });
  return positions;
}

function nearestFaceNormal(shape: WorkplaneShape, direction: THREE.Vector3): THREE.Vector3 | null {
  const mesh = meshForShape(shape);
  const wanted = direction.clone().normalize();
  const centre = new THREE.Vector3();
  mesh.vertices.forEach(([x, y, z]) => centre.add(new THREE.Vector3(x, y, z)));
  if (mesh.vertices.length) centre.divideScalar(mesh.vertices.length);
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  let best: THREE.Vector3 | null = null;
  let bestScore = -Infinity;
  mesh.faces.forEach(([ia, ib, ic]) => {
    const a = mesh.vertices[ia];
    const b = mesh.vertices[ib];
    const c = mesh.vertices[ic];
    if (!a || !b || !c) return;
    ab.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    ac.set(c[0] - a[0], c[1] - a[1], c[2] - a[2]);
    const normal = ab.clone().cross(ac);
    if (normal.lengthSq() < 1e-12) return;
    normal.normalize();
    const middle = new THREE.Vector3((a[0] + b[0] + c[0]) / 3 - centre.x, (a[1] + b[1] + c[1]) / 3 - centre.y, (a[2] + b[2] + c[2]) / 3 - centre.z);
    if (normal.dot(middle) < 0) normal.negate();
    const score = normal.dot(wanted);
    if (score > bestScore + 1e-9) {
      bestScore = score;
      best = normal;
    }
  });
  return best;
}

/**
 * Turns `movable` so the face with outward `normal` rests on the workplane -
 * the shortest turn, one pivot for a group so it keeps its spacing - and moves
 * them down onto it together. The same step the "Lay flat" tool takes after a
 * click on a face.
 */
function laidFlatShapes(shapes: WorkplaneShape[], movable: WorkplaneShape[], normal: { x: number; y: number; z: number }, workplane: PlacementWorkplane): WorkplaneShape[] {
  const rotation = layFlatRotation(normal, workplane.normal);
  const pivot = movable.length > 1 ? selectionCenterOnWorkplane(movable, workplane) : null;
  const turned = new Map(movable.map((shape) => [
    shape.id,
    canonicalizeShape(bakeShapeTransformIntoMesh(canonicalizeShape({ ...shape, ...rotatedGeometryShapePatch(shape, rotation, pivot) }))),
  ]));
  // One translation for the whole selection, so it stays together as it lands.
  const translation = translationToWorkplane(
    workplane,
    [...turned.values()].flatMap((shape) => meshForShape(shape).vertices.map(([x, y, z]) => ({ x, y, z }))),
  );
  return shapes.map((shape) => {
    const next = turned.get(shape.id);
    if (!next) return shape;
    return {
      ...next,
      x: cleanNearZero(next.x + translation.x),
      z: cleanNearZero(next.z + translation.z),
      elevation: cleanNearZero((next.elevation ?? 0) + translation.y),
    };
  });
}

/**
 * Moves the body of `source` so its face meets the face of `target`, as the
 * "Align faces" tool does: turned parallel about the clicked point, then slid
 * along the target face's normal. Only the turn's angles change on the body,
 * so a shape keeps its own settings.
 */
function matedShapes(shapes: WorkplaneShape[], source: FacePick, target: FacePick, mode: MateMode, gap: number): WorkplaneShape[] {
  const motion = mateMotion(source, target, mode, gap);
  return shapes.map((shape) => {
    if (shape.id !== source.shapeId) return shape;
    const turned = motion.rotation
      ? canonicalizeShape({ ...shape, ...rotatedGeometryShapePatch(shape, motion.rotation, motion.pivot) })
      : shape;
    return canonicalizeShape({
      ...turned,
      x: cleanNearZero(turned.x + motion.translation.x),
      z: cleanNearZero(turned.z + motion.translation.z),
      elevation: cleanNearZero((turned.elevation ?? 0) + motion.translation.y),
    });
  });
}

function selectionCenterOnWorkplane(shapes: WorkplaneShape[], workplane: PlacementWorkplane) {
  const xAxis = new THREE.Vector3(workplane.xAxis.x, workplane.xAxis.y, workplane.xAxis.z).normalize();
  const yAxis = new THREE.Vector3(workplane.normal.x, workplane.normal.y, workplane.normal.z).normalize();
  const zAxis = new THREE.Vector3(workplane.zAxis.x, workplane.zAxis.y, workplane.zAxis.z).normalize();
  const min = new THREE.Vector3(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
  const max = new THREE.Vector3(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);

  shapes.forEach((shape) => {
    meshForShape(shape).vertices.forEach(([x, y, z]) => {
      const point = new THREE.Vector3(x, y, z);
      min.x = Math.min(min.x, point.dot(xAxis));
      min.y = Math.min(min.y, point.dot(yAxis));
      min.z = Math.min(min.z, point.dot(zAxis));
      max.x = Math.max(max.x, point.dot(xAxis));
      max.y = Math.max(max.y, point.dot(yAxis));
      max.z = Math.max(max.z, point.dot(zAxis));
    });
  });

  if ([min.x, min.y, min.z, max.x, max.y, max.z].every(Number.isFinite)) {
    return new THREE.Vector3()
      .addScaledVector(xAxis, (min.x + max.x) / 2)
      .addScaledVector(yAxis, (min.y + max.y) / 2)
      .addScaledVector(zAxis, (min.z + max.z) / 2);
  }

  const bounds = boundsForShapes(shapes);
  return new THREE.Vector3(
    (bounds.minX + bounds.maxX) / 2,
    (bounds.minY + bounds.maxY) / 2,
    (bounds.minZ + bounds.maxZ) / 2,
  );
}


const ALIGN_EPSILON = 0.0005;
const ALIGN_AXES: AlignAxis[] = ["x", "y", "z"];
const ALIGN_TARGETS: AlignTarget[] = ["min", "center", "max"];

function alignCoordinate(bounds: Cuboid, axis: AlignAxis, target: AlignTarget, natural: AlignPoint | null = null, axes: AlignAxes | null = null) {
  const min = axis === "x" ? bounds.minX : axis === "y" ? bounds.minY : bounds.minZ;
  const max = axis === "x" ? bounds.maxX : axis === "y" ? bounds.maxY : bounds.maxZ;
  if (target === "min") {
    return min;
  }
  if (target === "max") {
    return max;
  }
  // The middle of a pentagon or a star is not the middle of its box (#268).
  if (natural) {
    if (!axes) return natural[axis];
    const direction = axes[axis];
    return natural.x * direction.x + natural.y * direction.y + natural.z * direction.z;
  }
  return (min + max) / 2;
}

function alignmentLabel(axis: AlignAxis, target: AlignTarget) {
  if (axis === "x") {
    return target === "min" ? t("align.left") : target === "max" ? t("align.right") : t("align.center");
  }
  if (axis === "z") {
    return target === "min" ? t("align.front") : target === "max" ? t("align.back") : t("align.middle");
  }
  return target === "min" ? t("align.bottom") : target === "max" ? t("align.top") : t("align.middle");
}

/** The box of a part along a workplane's axes, as the alignment measures it there (#232). */
function frameAabb(shape: WorkplaneShape, axes: AlignAxes): Cuboid {
  const mesh = shape.cylinderWrap && shape.importedMesh ? null : meshForShape(shape);
  const own = mesh && mesh.vertices.length > 0 ? cuboidAlongAxes(mesh.vertices, axes) : null;
  if (own) return own;
  const box = shapeAabb(shape);
  const corners: Array<[number, number, number]> = [];
  for (const x of [box.minX, box.maxX]) for (const y of [box.minY, box.maxY]) for (const z of [box.minZ, box.maxZ]) corners.push([x, y, z]);
  return cuboidAlongAxes(corners, axes) ?? box;
}

function alignmentStatuses(selection: WorkplaneShape[], anchorId: string | null, axes: AlignAxes | null = null): AlignHandleStatus[] {
  if (selection.length < 2) {
    return [];
  }

  const boundsById = new Map(selection.map((shape) => [shape.id, axes ? frameAabb(shape, axes) : meshAabb(shape)]));
  const naturalById = new Map(selection.map((shape) => [shape.id, alignNaturalCenter(shape)]));
  const anchorBounds = anchorId ? boundsById.get(anchorId) ?? null : null;
  const referenceBounds = anchorBounds ?? boundsForCuboids(Array.from(boundsById.values()));
  const referenceNatural = anchorBounds && anchorId ? naturalById.get(anchorId) ?? null : null;

  return ALIGN_AXES.flatMap((axis) =>
    ALIGN_TARGETS.map((target) => {
      const targetValue = alignCoordinate(referenceBounds, axis, target, referenceNatural, axes);
      const aligned = selection.every((shape) => {
        const bounds = boundsById.get(shape.id);
        return bounds ? Math.abs(alignCoordinate(bounds, axis, target, naturalById.get(shape.id) ?? null, axes) - targetValue) <= ALIGN_EPSILON : true;
      });
      const wouldMove = selection.some((shape) => {
        if (shape.locked || shape.id === anchorId) {
          return false;
        }
        const bounds = boundsById.get(shape.id);
        return bounds ? Math.abs(alignCoordinate(bounds, axis, target, naturalById.get(shape.id) ?? null, axes) - targetValue) > ALIGN_EPSILON : false;
      });
      const label = alignmentLabel(axis, target);
      return {
        axis,
        target,
        aligned,
        disabled: !wouldMove,
        title: aligned ? t("align.already", { label }) : t("align.do", { label }),
      };
    }),
  );
}

function alignedShapesForSelection(
  shapes: WorkplaneShape[],
  selectedIds: string[],
  selectedShapes: WorkplaneShape[],
  anchorId: string | null,
  axis: AlignAxis,
  target: AlignTarget,
  axes: AlignAxes | null = null,
) {
  const selected = new Set(selectedIds);
  const boundsById = new Map(selectedShapes.map((shape) => [shape.id, axes ? frameAabb(shape, axes) : meshAabb(shape)]));
  const naturalById = new Map(selectedShapes.map((shape) => [shape.id, alignNaturalCenter(shape)]));
  const anchorBounds = anchorId ? boundsById.get(anchorId) ?? null : null;
  const referenceBounds = anchorBounds ?? boundsForCuboids(Array.from(boundsById.values()));
  const referenceNatural = anchorBounds && anchorId ? naturalById.get(anchorId) ?? null : null;
  const targetValue = alignCoordinate(referenceBounds, axis, target, referenceNatural, axes);
  let moved = 0;

  const nextShapes = shapes.map((shape) => {
    if (!selected.has(shape.id) || shape.locked || shape.id === anchorId) {
      return shape;
    }
    const bounds = boundsById.get(shape.id);
    if (!bounds) {
      return shape;
    }
    const delta = targetValue - alignCoordinate(bounds, axis, target, naturalById.get(shape.id) ?? null, axes);
    if (Math.abs(delta) <= ALIGN_EPSILON) {
      return shape;
    }
    moved += 1;
    if (axes) {
      // Along a workplane's axes the part moves along that axis of the world (#232).
      const shift = shiftAlongAxis(axes, axis, delta);
      return {
        ...shape,
        x: cleanNearZero(Number((shape.x + shift.x).toFixed(4)), ALIGN_EPSILON),
        z: cleanNearZero(Number((shape.z + shift.z).toFixed(4)), ALIGN_EPSILON),
        elevation: cleanNearZero(Number(((shape.elevation ?? 0) + shift.y).toFixed(4)), ALIGN_EPSILON),
      };
    }
    if (axis === "x") {
      return { ...shape, x: cleanNearZero(Number((shape.x + delta).toFixed(4)), ALIGN_EPSILON) };
    }
    if (axis === "z") {
      return { ...shape, z: cleanNearZero(Number((shape.z + delta).toFixed(4)), ALIGN_EPSILON) };
    }
    return { ...shape, elevation: cleanNearZero(Number(((shape.elevation ?? 0) + delta).toFixed(4)), ALIGN_EPSILON) };
  });

  return { nextShapes, moved };
}

function effectiveAlignmentAnchorId(selection: WorkplaneShape[], requestedAnchorId: string | null) {
  return selection.find((shape) => shape.locked)?.id
    ?? (requestedAnchorId && selection.some((shape) => shape.id === requestedAnchorId) ? requestedAnchorId : null);
}

function mirrorAxisLabel(axis: AlignAxis) {
  return axis === "x" ? t("mirror.leftRight") : axis === "z" ? t("mirror.frontBack") : t("mirror.topBottom");
}

function mirrorFlagPatch(shape: WorkplaneShape, axis: AlignAxis) {
  if (axis === "x") {
    return { mirrorX: !shape.mirrorX };
  }
  if (axis === "z") {
    return { mirrorZ: !shape.mirrorZ };
  }
  return { mirrorY: !shape.mirrorY };
}

function reflectionMatrixForAxis(axis: AlignAxis) {
  return new THREE.Matrix4().makeScale(axis === "x" ? -1 : 1, axis === "y" ? -1 : 1, axis === "z" ? -1 : 1);
}

function mirroredShapePatch(shape: WorkplaneShape, axis: AlignAxis, pivot: number): Partial<WorkplaneShape> {
  const centerY = (shape.elevation ?? 0) + shape.height / 2;
  const nextCenter = axis === "x" ? 2 * pivot - shape.x : axis === "z" ? 2 * pivot - shape.z : 2 * pivot - centerY;
  const worldReflection = reflectionMatrixForAxis(axis);
  const localReflection = reflectionMatrixForAxis(axis);
  const currentRotation = new THREE.Matrix4().makeRotationFromQuaternion(quaternionForShape(shape));
  const nextRotationMatrix = worldReflection.multiply(currentRotation).multiply(localReflection);
  const nextQuaternion = new THREE.Quaternion().setFromRotationMatrix(nextRotationMatrix);
  const rotationPatch = rotationFromQuaternion(nextQuaternion);
  const positionPatch =
    axis === "x"
      ? { x: cleanNearZero(Number(nextCenter.toFixed(4)), ALIGN_EPSILON) }
      : axis === "z"
        ? { z: cleanNearZero(Number(nextCenter.toFixed(4)), ALIGN_EPSILON) }
        : { elevation: cleanNearZero(Number((nextCenter - shape.height / 2).toFixed(4)), ALIGN_EPSILON) };

  return {
    ...shape,
    ...positionPatch,
    ...rotationPatch,
    ...mirrorFlagPatch(shape, axis),
  };
}

function mirroredShapesForSelection(shapes: WorkplaneShape[], selectedIds: string[], selectedShapes: WorkplaneShape[], axis: AlignAxis) {
  if (selectedShapes.length === 0) {
    return { nextShapes: shapes, moved: 0 };
  }

  const selected = new Set(selectedIds);
  const selectionBounds = boundsForShapes(selectedShapes);
  const pivot = axis === "x" ? (selectionBounds.minX + selectionBounds.maxX) / 2 : axis === "z" ? (selectionBounds.minZ + selectionBounds.maxZ) / 2 : (selectionBounds.minY + selectionBounds.maxY) / 2;
  let moved = 0;
  const nextShapes = shapes.map((shape) => {
    if (!selected.has(shape.id) || shape.locked) {
      return shape;
    }
    moved += 1;
    return {
      ...shape,
      ...mirroredShapePatch(shape, axis, pivot),
    };
  });

  return { nextShapes, moved };
}


function meshFaceComponents(mesh: MeshData, tolerance = SEPARATE_PARTS_VERTEX_TOLERANCE) {
  if (mesh.faces.length === 0) return [];
  const keysByFace = mesh.faces.map((face) => face.map((vertexIndex) => quantizedPointKey(mesh.vertices[vertexIndex], tolerance)));
  const facesByVertex = new Map<string, number[]>();
  keysByFace.forEach((keys, faceIndex) => {
    keys.forEach((key) => {
      const current = facesByVertex.get(key);
      if (current) {
        current.push(faceIndex);
      } else {
        facesByVertex.set(key, [faceIndex]);
      }
    });
  });

  const visited = new Uint8Array(mesh.faces.length);
  const components: number[][] = [];
  for (let faceIndex = 0; faceIndex < mesh.faces.length; faceIndex += 1) {
    if (visited[faceIndex]) continue;
    const component: number[] = [];
    const queue = [faceIndex];
    visited[faceIndex] = 1;
    while (queue.length > 0) {
      const current = queue.pop() as number;
      component.push(current);
      keysByFace[current].forEach((key) => {
        const neighbors = facesByVertex.get(key);
        if (!neighbors) return;
        facesByVertex.delete(key);
        neighbors.forEach((neighbor) => {
          if (visited[neighbor]) return;
          visited[neighbor] = 1;
          queue.push(neighbor);
        });
      });
    }
    components.push(component);
  }
  return components;
}

function meshComponentShape(source: WorkplaneShape, mesh: MeshData, faceIndices: number[], partIndex: number, totalParts: number): WorkplaneShape | null {
  const worldPositions: number[] = [];
  faceIndices.forEach((faceIndex) => {
    const face = mesh.faces[faceIndex];
    if (!face) return;
    face.forEach((vertexIndex) => {
      const vertex = mesh.vertices[vertexIndex];
      if (vertex) worldPositions.push(vertex[0], vertex[1], vertex[2]);
    });
  });

  const bounds = boundsForPositions(worldPositions);
  if (!bounds) return null;
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerZ = (bounds.minZ + bounds.maxZ) / 2;
  const rawWidth = Math.max(MIN_SHAPE_DIMENSION, bounds.maxX - bounds.minX);
  const rawHeight = Math.max(MIN_SHAPE_DIMENSION, bounds.maxY - bounds.minY);
  const rawDepth = Math.max(MIN_SHAPE_DIMENSION, bounds.maxZ - bounds.minZ);
  const width = cleanModelDimension(rawWidth);
  const height = cleanModelDimension(rawHeight);
  const depth = cleanModelDimension(rawDepth);
  const positions = worldPositions.map((value, index) => {
    if (index % 3 === 0) return value - centerX;
    if (index % 3 === 1) return value - bounds.minY;
    return value - centerZ;
  });

  return canonicalizeShape({
    id: createLocalId(`${source.id}-part`),
    name: totalParts > 1 ? t("inspector.separatedPartName", { name: source.name, index: partIndex + 1 }) : source.name,
    kind: "mesh",
    color: source.color,
    hole: source.hole || undefined,
    x: cleanNearZero(centerX, 0.0005),
    z: cleanNearZero(centerZ, 0.0005),
    elevation: cleanNearZero(bounds.minY, 0.0005),
    size: Math.max(width, depth),
    width,
    depth,
    height,
    rotation: 0,
    rotationX: 0,
    rotationZ: 0,
    importedMesh: {
      positions,
      baseWidth: rawWidth,
      baseDepth: rawDepth,
      baseHeight: rawHeight,
      triangleCount: Math.floor(positions.length / 9),
      sourceFormat: "json",
    },
    locked: false,
    hidden: source.hidden,
  });
}

/**
 * The body a shape becomes when it is wrapped around a cylinder (#106), or
 * why it cannot be. What lies flat on the plate stands up on the wall; the
 * cylinder's axis is the middle of the new shape, so centring it on a
 * cylinder puts it right on that cylinder's wall, like curved text.
 * The wall sits where the body lay, so nothing jumps across the plate.
 */
function cylinderWrappedShape(shape: WorkplaneShape, diameter: number, inward: boolean): WorkplaneShape | CylinderWrapError {
  const mesh = meshForShape(shape);
  const result = wrapMeshAroundCylinder({ vertices: mesh.vertices, faces: mesh.faces }, { diameter, inward });
  if ("error" in result) return result.error;
  const rawSize = result.outerRadius * 2;
  const rawHeight = Math.max(MIN_SHAPE_DIMENSION, result.height);
  const size = cleanModelDimension(rawSize);
  const middleRadius = diameter / 2 + (inward ? -result.thickness / 2 : result.thickness / 2);
  return canonicalizeShape({
    id: shape.id,
    name: shape.name,
    kind: "mesh",
    color: shape.color,
    hole: shape.hole || undefined,
    x: cleanNearZero(result.flatCenter.x, 0.0005),
    z: cleanNearZero(result.flatCenter.z - middleRadius, 0.0005),
    elevation: cleanNearZero(result.flatBottom, 0.0005),
    size,
    width: size,
    depth: size,
    height: cleanModelDimension(rawHeight),
    rotation: 0,
    rotationX: 0,
    rotationZ: 0,
    importedMesh: {
      positions: result.positions,
      baseWidth: rawSize,
      baseDepth: rawSize,
      baseHeight: rawHeight,
      triangleCount: Math.floor(result.positions.length / 9),
      sourceFormat: "json",
    },
    cylinderWrap: { diameter, ...(inward ? { inward: true } : {}) },
    locked: false,
    hidden: shape.hidden,
  });
}

function canWrapAroundCylinder(shape: WorkplaneShape | null | undefined) {
  // A shape that is wrapped already is a mesh of the wrapped thing: wrapping that again gave nonsense (#329).
  return Boolean(shape && !shape.locked && !shape.cylinderWrap && shape.groupOperation !== "bundle" && !isNonSolidShapeKind(shape.kind));
}


/** A shape fresh from the library as it is placed: the name tag (#215) comes as a text "Name" in the default layers. */
function prepareNewShape(asset: ShapeAsset, shape: WorkplaneShape): WorkplaneShape {
  if (asset.id !== nameTagAsset.id || shape.kind !== "text") return shape;
  const source = nameTagSource(shape, { text: t("nameTag.defaultText"), letterSize: NAME_TAG_LETTER_SIZE });
  return layeredTextShape(source, NAME_TAG_LAYERS, [], shape.id, { locked: false, hidden: false, name: "Text" });
}


function offersCylinderWrap(shape: WorkplaneShape | null | undefined) {
  if (!canWrapAroundCylinder(shape) || !shape) return false;
  return Boolean(shape.importedMesh && !shape.groupedShapes?.length) || shape.kind === "text" || Boolean(shape.sketchProfile);
}

/** Simplifying is for meshes dense enough to be worth it; a plate from an SVG has nothing to give. */
const MESH_SIMPLIFY_MIN_TRIANGLES = 500;

function offersMeshSimplify(shape: WorkplaneShape | null | undefined) {
  return Boolean(shape?.importedMesh && shape.groupOperation !== "bundle" && shape.importedMesh.triangleCount >= MESH_SIMPLIFY_MIN_TRIANGLES);
}

/**
 * The body with its mesh replaced by a simplified one in the same frame, or
 * null when that is no reduction. What comes out is a plain mesh: the file it
 * was imported from, its exact B-Rep, the parts of a group and the edge
 * history all describe the mesh that was - they do not come along, or the
 * next load, export or regroup would bring the old triangles back.
 */
function simplifiedMeshShape(shape: WorkplaneShape, positions: number[]): WorkplaneShape | null {
  const source = shape.importedMesh;
  const triangleCount = Math.floor(positions.length / 9);
  if (!source || triangleCount < 4 || triangleCount >= source.triangleCount) return null;
  return canonicalizeShape({
    ...shape,
    importedMesh: {
      positions,
      baseWidth: source.baseWidth,
      baseDepth: source.baseDepth,
      baseHeight: source.baseHeight,
      triangleCount,
      sourceFormat: "json",
    },
    groupedShapes: undefined,
    groupOperation: undefined,
    edgeTreatments: undefined,
    edgeTreatmentHistory: undefined,
    edgeResizeMode: undefined,
    cadBrep: undefined,
    cadDisplayEdges: undefined,
  });
}

function separateMeshParts(shape: WorkplaneShape) {
  const mesh = meshForShape(shape);
  const components = meshFaceComponents(mesh).filter((component) => component.length > 0);
  if (components.length <= 1) return [];
  return components
    .map((component, index) => meshComponentShape(shape, mesh, component, index, components.length))
    .filter((part): part is WorkplaneShape => Boolean(part));
}

/**
 * The exact outline of each glyph piece cadModifierSourceParts cuts a text
 * into, keyed by the piece. The pieces only live for one edge-tool request,
 * so a WeakMap lets them go with it.
 */
const textGlyphProfileByPart = new WeakMap<WorkplaneShape, CadModifierProfilePart>();

/**
 * Which glyph each triangle of a text's display mesh belongs to: the mesh
 * lists the glyphs one after another, as three.js extrudes them. Null when
 * the counts do not add up (then the pieces simply go without outlines).
 */
function textGlyphIndexByFace(shape: WorkplaneShape, faceCount: number) {
  let glyphs: ReturnType<typeof textGlyphProfiles> = null;
  try {
    glyphs = textGlyphProfiles(shape);
  } catch {
    return null;
  }
  if (!glyphs || glyphs.reduce((total, glyph) => total + glyph.triangleCount, 0) !== faceCount) return null;
  const glyphOfFace = new Array<number>(faceCount);
  let face = 0;
  glyphs.forEach((glyph, index) => {
    for (let count = 0; count < glyph.triangleCount; count += 1) glyphOfFace[face++] = index;
  });
  return { glyphs, glyphOfFace };
}

function cadModifierSourceParts(shape: WorkplaneShape) {
  // The hinge reaches the kernel as the boxes, cylinders and tubes it is made of.
  if (shape.kind === "hinge" && !shape.importedMesh && !shape.cadBrep && !shapeHasShapeDeform(shape)) return hingeWorldParts(shape);
  if (shape.kind !== "text" || shape.importedMesh || shape.cadBrep) return [shape];
  const mesh = meshForShape(shape);
  const components = meshFaceComponents(mesh).filter((component) => component.length > 0);
  if (components.length <= 1) return [shape];
  const glyphMap = textGlyphIndexByFace(shape, mesh.faces.length);
  const glyphParts: WorkplaneShape[] = [];
  components.forEach((component, index) => {
    const part = meshComponentShape(shape, mesh, component, index, components.length);
    if (!part) return;
    // A piece that is exactly one whole glyph gets that glyph's exact outline;
    // glyphs that touch share a piece, and a glyph that falls apart into
    // several pieces has none that is all of it - both keep the mesh path.
    const glyphIndices = glyphMap ? new Set(component.map((face) => glyphMap.glyphOfFace[face])) : null;
    const glyph = glyphIndices?.size === 1 ? glyphMap?.glyphs[[...glyphIndices][0]] : null;
    const profile = glyph && glyph.triangleCount === component.length ? glyph.profile : null;
    if (profile) textGlyphProfileByPart.set(part, profile);
    glyphParts.push(part);
  });
  return glyphParts.length > 1 ? glyphParts : [shape];
}

/**
 * Counting the loose pieces of an imported mesh walks every triangle, and the
 * toolbar asks again each time the selected shape changes - with every step of
 * a move, a turn or a resize. None of these changes which triangles hang
 * together: they only move the points. So the count is kept per mesh; a changed
 * mesh (a cut, an edge treatment, a simplification) is a new object and is
 * counted anew. Keyed by the shape's settings as well, a turn of a large import
 * counted it again at every step and stalled the drag.
 */
const importedPartCounts = new WeakMap<object, number>();

/** Stand-ins for "no edges", the same arrays at every render, so the workplane does not draw the edge lines again for nothing. */
const NO_MODIFIER_EDGES: CadModifierEdge[] = [];
const NO_EDGE_IDS: number[] = [];

function separablePartCount(shape: WorkplaneShape) {
  if (shape.locked || shape.hole) return 0;
  if (shape.groupedShapes?.length && !shape.importedMesh) return shape.groupedShapes.length;
  if (!shape.importedMesh) return meshFaceComponents(meshForShape(shape)).length;
  const cached = importedPartCounts.get(shape.importedMesh);
  if (cached !== undefined) return cached;
  const count = meshFaceComponents(meshForShape(shape)).length;
  importedPartCounts.set(shape.importedMesh, count);
  return count;
}

function separateShapeParts(shape: WorkplaneShape) {
  if (shape.locked || shape.hole) return [];
  if (shape.groupedShapes?.length && !shape.importedMesh) {
    const restored = restoreGroupedChildren(shape);
    return restored.length > 1 ? restored : [];
  }
  return separateMeshParts(shape);
}

/**
 * An extruded sketch body taken apart by its outlines (#669): every outer outline is built again on
 * its own, as when the sketch is edited down to it, so each part stays where it was, keeps the body's
 * height, turn and colour, and has a sketch of its own to edit. The first part keeps the body's id.
 */
async function separateSketchBodyParts(shape: WorkplaneShape) {
  const profiles = shape.sketchProfile ? sketchOutlineParts(shape.sketchProfile) : [];
  if (profiles.length < 2) return [];
  const quaternion = quaternionForShape(shape);
  const xAxis = new THREE.Vector3(1, 0, 0).applyQuaternion(quaternion);
  const zAxis = new THREE.Vector3(0, 0, 1).applyQuaternion(quaternion);
  const axes = { x: [xAxis.x, xAxis.y, xAxis.z] as const, z: [zAxis.x, zAxis.y, zAxis.z] as const };
  const anchor = sketchBodyAnchor(shape);
  const parts: WorkplaneShape[] = [];
  for (const [index, profile] of profiles.entries()) {
    const extrusion = await cadShapeFromSketchProfile(profile, shape.height, shape);
    const placed = placedLikeExisting(extrusion, shape);
    const part = movedWithEditedOutline(placed, shape, anchor, { x: extrusion.x, z: extrusion.z }, axes);
    parts.push(index === 0 ? part : canonicalizeShape({ ...part, id: createLocalId("sketch-extrusion") }));
  }
  return parts;
}


function mcpNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function mcpOptionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/**
 * Die formeigenen Werte eines Befehls, durch dieselbe Muehle gedreht wie die
 * Vorgaben im Arbeitsbereich: gleiche Grenzen, gleiche erlaubten Woerter. Was
 * dort nicht durchgeht, hat auch hier nichts verloren - sonst stuende spaeter
 * ein Wert im Paket, den der Pruefer beim Speichern ablehnt, und der ganze
 * Entwurf liesse sich nicht mehr sichern. Die Masse bleiben aussen vor, die
 * gehen ihren eigenen Weg.
 */
/**
 * Die Segmente eines gebogenen Rohrs kommen als Liste - oder als der Text, den
 * `layerling_read_scene` fuer sie ausgibt. Beides wird angenommen, damit ein
 * gelesener Wert unveraendert zurueckgeschickt werden kann.
 */
function mcpBentTubeSegments(value: unknown): unknown[] | undefined {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return undefined;
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}


/** A command's transition values as a change of measures - the same way the settings panel takes them. */
function mcpLoftChange(params: Record<string, unknown>): Partial<LoftMeasures> {
  const change: Partial<LoftMeasures> = {};
  const outline = (value: unknown) => (value === "round" || value === "rectangle" || value === "polygon" ? value : undefined);
  const bottomOutline = outline(params.loftBottomOutline);
  const topOutline = outline(params.loftTopOutline);
  if (bottomOutline) change.bottomOutline = bottomOutline;
  if (topOutline) change.topOutline = topOutline;
  const numbers: Array<[string, keyof LoftMeasures]> = [
    ["loftBottomWidth", "bottomWidth"], ["loftBottomDepth", "bottomDepth"], ["loftTopWidth", "topWidth"], ["loftTopDepth", "topDepth"],
    ["loftBottomCorner", "bottomCorner"], ["loftTopCorner", "topCorner"], ["loftBottomSides", "bottomSides"], ["loftTopSides", "topSides"],
    ["loftOffsetX", "offsetX"], ["loftOffsetZ", "offsetZ"], ["loftWall", "wall"],
    ["loftTwist", "twist"], ["loftTiltX", "tiltX"], ["loftTiltZ", "tiltZ"], ["loftSmooth", "smooth"],
  ];
  numbers.forEach(([param, key]) => {
    const value = mcpOptionalNumber(params[param]);
    if (value !== undefined) Object.assign(change, { [key]: value });
  });
  return change;
}

const MCP_BENT_TUBE_KEYS = ["bentTubeProfile", "bentTubeInnerProfile", "bentTubeSize", "bentTubeWall", "bentTubeQuality", "bentTubeSegments"] as const;

/**
 * Ein gebogenes Rohr bekommt seinen Rahmen aus Profil und Segmenten. Nur wer
 * Breite, Tiefe oder Hoehe ausdruecklich angibt, dehnt es darauf.
 */
function mcpBentTubePatch(shape: WorkplaneShape, params: Record<string, unknown>): Partial<WorkplaneShape> {
  const segments = mcpBentTubeSegments(params.bentTubeSegments);
  const fields = normalizedBentTubeFields({
    ...shape,
    bentTubeSegments: (segments as WorkplaneShape["bentTubeSegments"]) ?? shape.bentTubeSegments,
  });
  const natural = bentTubeNaturalDimensions(fields);
  const width = mcpOptionalNumber(params.width ?? params.size) ?? natural.width;
  const depth = mcpOptionalNumber(params.depth ?? params.size) ?? natural.depth;
  const height = mcpOptionalNumber(params.height ?? params.size) ?? natural.height;
  return { ...fields, width, depth, height, size: Math.max(width, depth) };
}

function mcpShapeCustomization(kind: ShapeKind, params: Record<string, unknown>): ShapeCustomization {
  const entry = normalizeShapeCustomizations({ [kind]: params })[kind] ?? {};
  const { width: _width, depth: _depth, height: _height, maxDimension: _maxDimension, ...settings } = entry;
  // Eine Ausnahme: Die Beschriftung darf laenger sein als eine Vorgabe im
  // Arbeitsbereich, wo 24 Zeichen reichen. Ein Schild im Entwurf traegt mehr,
  // und das Paketformat begrenzt sie nicht.
  if (kind === "text" && typeof params.text === "string" && params.text.trim()) settings.text = params.text;
  return settings;
}

/**
 * Die Verjuengung steht in keiner Formvorgabe - sie gehoert dem einzelnen
 * Koerper, kommt also nicht durch `normalizeShapeCustomizations` und braucht
 * hier ihren eigenen Weg. Ohne ihn liest ein Client die vier Werte aus, setzt
 * sie zurueck und nichts geschieht. Die Grenzen sind dieselben wie im
 * Merkmalsfeld, damit ueber die Bruecke nichts entsteht, was sich dort nicht
 * mehr einstellen laesst.
 */
function mcpTaperPatch(shape: WorkplaneShape, params: Record<string, unknown>, maxDimension: number): Partial<WorkplaneShape> {
  return shapeTaperPatch(shape, {
    topWidth: mcpOptionalNumber(params.taperTopWidth),
    topDepth: mcpOptionalNumber(params.taperTopDepth),
    bottomWidth: mcpOptionalNumber(params.taperBottomWidth),
    bottomDepth: mcpOptionalNumber(params.taperBottomDepth),
  }, maxDimension);
}

/**
 * Verdrehung und Neigung sind wie die Verjuengung Eigenschaften des einzelnen
 * Koerpers, nicht der Formvorgabe - derselbe eigene Weg wie `mcpTaperPatch`,
 * sonst nimmt die Bruecke die drei Werte zwar in ihr Schema auf, setzt sie
 * aber nie tatsaechlich am Koerper.
 */
function mcpExtrudeDeformPatch(shape: WorkplaneShape, params: Record<string, unknown>): Partial<WorkplaneShape> {
  return shapeExtrudeDeformPatch(shape, {
    twist: mcpOptionalNumber(params.extrudeTwist),
    offsetX: mcpOptionalNumber(params.extrudeTopOffsetX),
    offsetZ: mcpOptionalNumber(params.extrudeTopOffsetZ),
  });
}

/**
 * Ein Gewinde haengt an seinem Durchmesser: Breite und Tiefe gehoeren ihm, nicht
 * umgekehrt. Alle Gewindewerte gehen deshalb einmal durch `threadSettings` -
 * das ist dieselbe Pruefung wie im Merkmalsfeld - und der Platzbedarf wird neu
 * daraus gerechnet. Ohne diesen Schritt liest `canonicalizeShape` den alten
 * Rahmen als Zug am Anfasser und rechnet einen frisch gesetzten Durchmesser
 * wieder weg. Wer Breite oder Tiefe selbst angibt, meint genau das und behaelt
 * sie.
 */
function applyMcpThreadSettings(
  shape: WorkplaneShape,
  params: Record<string, unknown>,
  headFollowsStandard: boolean,
): WorkplaneShape {
  const requestedHead = mcpOptionalNumber(params.threadHeadHeight);
  const merged = threadSettings({ ...shape, threadHeadHeight: requestedHead ?? shape.threadHeadHeight });
  // Stand der Kopf auf seinem Normmass, waechst er mit dem Durchmesser mit -
  // sonst saesse nach einem Wechsel von M8 auf M5 der Kopf einer M8 auf einer
  // duenneren Schraube. Wer die Hoehe selbst angibt, behaelt sie.
  const settings = requestedHead === undefined && headFollowsStandard
    ? { ...merged, headHeight: normalizeThreadHeadHeight(defaultThreadHeadHeight(merged), merged) }
    : merged;
  const footprint = threadNaturalFootprint(settings);
  const keepFootprint = params.width !== undefined || params.depth !== undefined || params.size !== undefined;
  return {
    ...shape,
    threadRole: settings.role,
    threadHead: settings.head,
    threadHand: settings.hand,
    threadProfile: settings.profile,
    threadDiameter: settings.diameter,
    threadPitch: settings.pitch,
    threadClearance: settings.clearance,
    threadBoltClearance: settings.boltClearance,
    threadAxialClearance: settings.axialClearance,
    threadDepth: settings.depth,
    threadFlankAngle: settings.flankAngle,
    threadQuality: settings.quality,
    threadHeadHeight: settings.headHeight,
    threadChamfer: settings.chamfer,
    threadChamferBottom: settings.chamferLow,
    threadHeadChamfer: settings.headChamfer,
    ...(keepFootprint ? {} : {
      width: footprint.width,
      depth: footprint.depth,
      size: Math.max(footprint.width, footprint.depth),
    }),
  };
}

function mcpString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

/** A reference point as an AI sees it: x and z on the plate, elevation as the height. */
function mcpPointInfo(note: WorkplaneNote) {
  const round = (value: number) => Number(value.toFixed(4));
  return { id: note.id, x: round(note.x), z: round(note.z), elevation: round(note.y) };
}

function mcpStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0);
  }
  return typeof value === "string" && value.length > 0 ? [value] : [];
}

function mcpNumberArray(value: unknown): number[] {
  return Array.isArray(value) ? value.filter((entry): entry is number => typeof entry === "number" && Number.isInteger(entry)) : [];
}

function mcpFiniteNumberArray(value: unknown): number[] {
  return Array.isArray(value) ? value.filter((entry): entry is number => typeof entry === "number" && Number.isFinite(entry)) : [];
}

function readMcpEditorIdentity() {
  const storageKey = "layerling.mcp.editorIdentity";
  try {
    const existing = JSON.parse(window.sessionStorage.getItem(storageKey) ?? "null") as { editorId?: unknown; editorNumber?: unknown } | null;
    if (typeof existing?.editorId === "string" && typeof existing.editorNumber === "number") {
      return { editorId: existing.editorId, editorNumber: existing.editorNumber };
    }
  } catch {
    // Session identity is best-effort; fall through and create a new one.
  }

  const randomValues = new Uint32Array(1);
  window.crypto?.getRandomValues?.(randomValues);
  const editorNumber = 10000 + ((randomValues[0] || Math.floor(Math.random() * 90000)) % 90000);
  const editorId = window.crypto?.randomUUID?.() ?? `layerling-editor-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const identity = { editorId, editorNumber };
  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify(identity));
  } catch {
    // Private browsing can block sessionStorage; the in-memory identity is enough for this tab.
  }
  return identity;
}

/** What a locked shape still lets through updateShape: none of it changes the body. */
const LOCKED_SHAPE_PATCH_KEYS = new Set(["locked", "hidden", "name"]);

/** A preview of an intersection is not calculated for more triangles than this: it would stutter while a shape is moved (#372). */
const INTERSECT_PREVIEW_MAX_TRIANGLES = 40000;

export function LayerlingEditor({
  initialAssets = [],
  initialShapes = [],
  initialHistory,
  initialHistoryIndex,
  initialSnap,
  initialWorkspace,
  initialPlacementElevation = 0,
  initialPlacementWorkplane,
  onHome,
  onOpenLylProjectFile,
  onSaveSharedProject,
  serverFileName = null,
  onProjectShapesChange,
  onProjectSnapshot,
  isProjectThumbnailMissing,
  projectSaveFailure,
  onProjectWorkspaceChange,
  onProjectNameChange,
  onCreateProjectFromState,
  projectId,
  projectName = "Layerling design",
  projectCreatedAt = Date.now(),
  projectModifiedAt = Date.now(),
  projectRevision = 0,
  editorOpen = true,
  sharedProjectsEnabled = false,
  themePreference = "system",
  resolvedTheme = "light",
  onThemePreferenceChange,
}: {
  initialAssets?: ProjectAsset[];
  initialShapes?: WorkplaneShape[];
  initialHistory?: EditorHistoryEntry[];
  initialHistoryIndex?: number;
  initialSnap?: GridSize;
  initialWorkspace?: WorkplaneWorkspaceSettings;
  initialPlacementElevation?: number;
  initialPlacementWorkplane?: PlacementWorkplane;
  onHome?: (leaving: { itemCount: number }) => void;
  onOpenLylProjectFile?: (file: File, shared?: undefined, fileHandle?: LylFileHandle) => Promise<{ ok: boolean; message: string } | void> | { ok: boolean; message: string } | void;
  onSaveSharedProject?: (request: { exportName: string; bytes: Uint8Array; thumbnailDataUrl: string; targetFileName?: string }) => Promise<string>;
  /** Set while the open project came from the server; then it saves back there by itself. */
  serverFileName?: string | null;
  onProjectShapesChange?: (snapshot: {
    projectId: string;
    shapes: WorkplaneShape[];
    history: EditorHistoryEntry[];
    historyIndex: number;
    assets: ProjectAsset[];
    projectName: string;
    projectCreatedAt: number;
    workspace: WorkplaneWorkspaceSettings;
    snapGrid: GridSize;
    placementElevation: number;
    placementWorkplane: PlacementWorkplane;
    sketchPlacementWorkplane: PlacementWorkplane;
  }) => void;
  onProjectSnapshot?: (snapshot: { image: string; projectId: string; shapes: number }, signal?: AbortSignal) => Promise<void> | void;
  /** Whether the design's card has no picture; the editor then takes one once the design is open. */
  isProjectThumbnailMissing?: (projectId: string) => Promise<boolean>;
  /** The last failed autosave, so the editor can say so; `at` makes a repeat failure show again. */
  projectSaveFailure?: { message: string; at: number } | null;
  onProjectNameChange?: (name: string) => void;
  /** Legt aus einem frueheren Stand ein neues Projekt an und sagt in einem Satz, was daraus wurde. */
  onCreateProjectFromState?: (request: HistoryProjectRequest) => Promise<string>;
  onProjectWorkspaceChange?: (snapshot: {
    projectId: string;
    workspace: WorkplaneWorkspaceSettings;
    snap: GridSize;
    placementElevation?: number;
    placementWorkplane?: PlacementWorkplane;
    sketchPlacementWorkplane?: PlacementWorkplane;
  }) => void;
  projectId?: string | null;
  projectName?: string;
  projectCreatedAt?: number;
  projectModifiedAt?: number;
  projectRevision?: number;
  /** False while the overview is shown; the editor stays mounted behind it. */
  editorOpen?: boolean;
  sharedProjectsEnabled?: boolean;
  themePreference?: AppThemePreference;
  resolvedTheme?: ResolvedAppTheme;
  onThemePreferenceChange?: (preference: AppThemePreference) => void;
} = {}) {
  const initialSceneRef = useRef<WorkplaneShape[] | null>(null);
  if (initialSceneRef.current === null) {
    initialSceneRef.current = initialShapes.map(canonicalizeShape);
  }
  const initialNormalizedWorkplane = normalizePlacementWorkplane(initialPlacementWorkplane, initialPlacementElevation);
  const initialHistoryStateRef = useRef<EditorHistoryState | null>(null);
  if (initialHistoryStateRef.current === null) {
    initialHistoryStateRef.current = hydrateEditorHistoryState(
      initialSceneRef.current,
      initialHistory,
      initialHistoryIndex,
      normalizeWorkspaceSettings(initialWorkspace).historyLimit,
      notesForHistoryIndex(initialHistory, initialHistoryIndex),
      initialNormalizedWorkplane,
    );
  }
  const [shapes, setShapes] = useState<WorkplaneShape[]>(() => initialSceneRef.current as WorkplaneShape[]);
  // Die Notizen reisen im Verlauf mit, also kommen sie auch von dort - der
  // Stand, auf den der Verlauf zeigt, ist der Stand, den der Editor zeigt.
  const [notes, setNotes] = useState<WorkplaneNote[]>(() => notesForHistoryIndex(initialHistory, initialHistoryIndex));
  const [notesVisible, setNotesVisible] = useState(true);
  const [overhangsVisible, setOverhangsVisible] = useState(false);
  const overhangsVisibleRef = useRef(overhangsVisible);
  overhangsVisibleRef.current = overhangsVisible;
  const [noteMode, setNoteMode] = useState(false);
  const [projectAssets, setProjectAssets] = useState<ProjectAsset[]>(() => dedupeProjectAssets(initialAssets));
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [clipboard, setClipboard] = useState<WorkplaneShape[]>([]);
  const clipboardCopiedAtRef = useRef(0);
  const [systemClipboardSupported, setSystemClipboardSupported] = useState(false);
  const [history, setHistory] = useState<EditorHistoryEntry[]>(() => (initialHistoryStateRef.current as EditorHistoryState).entries);
  const [historyIndex, setHistoryIndex] = useState(() => (initialHistoryStateRef.current as EditorHistoryState).index);
  /**
   * Der Verlaufsblick: welcher Stand gerade gezeigt wird, null ausserhalb. Er
   * aendert das Projekt nicht - die Arbeitsflaeche zeigt derweil nur einen
   * anderen Eintrag desselben Verlaufs.
   */
  const [historyViewIndex, setHistoryViewIndex] = useState<number | null>(null);
  const [historyProjectCreating, setHistoryProjectCreating] = useState(false);
  const historyViewState = useMemo(
    () => (historyViewIndex === null ? null : historyStateAt(history, historyViewIndex)),
    [history, historyViewIndex],
  );
  const historyViewStateRef = useRef(historyViewState);
  historyViewStateRef.current = historyViewState;
  const [placementWorkplane, setPlacementWorkplane] = useState<PlacementWorkplane>(
    () => workplaneForHistoryIndex(initialHistory, initialHistoryIndex, initialNormalizedWorkplane) ?? initialNormalizedWorkplane,
  );
  // Die gesetzte Ebene vorlaeufig nicht zeichnen (Forum 617200). Sie gilt
  // weiter; eine neue Ebene zeigt sich wieder.
  const [workplaneHidden, setWorkplaneHidden] = useState(false);
  const workplaneHiddenRef = useRef(false);
  workplaneHiddenRef.current = workplaneHidden;
  const placementWorkplaneKey = placementWorkplaneFingerprint(placementWorkplane);
  useEffect(() => {
    setWorkplaneHidden(false);
  }, [placementWorkplaneKey]);
  const [placementElevation, setPlacementElevation] = useState(() => {
    const resolved = workplaneForHistoryIndex(initialHistory, initialHistoryIndex, initialNormalizedWorkplane) ?? initialNormalizedWorkplane;
    return Math.abs(resolved.normal.x) < 1e-6
      && Math.abs(resolved.normal.y - 1) < 1e-6
      && Math.abs(resolved.normal.z) < 1e-6
      ? resolved.origin.y
      : Number.isFinite(initialPlacementElevation) ? initialPlacementElevation : 0;
  });
  const [workspaceSettings, setWorkspaceSettings] = useState<WorkplaneWorkspaceSettings>(() => normalizeWorkspaceSettings(initialWorkspace));
  const bedPrinter = printerPresetById(workspaceSettings.printer);
  const overhangs = useMemo(
    () => bedPrinter ? bedOverhangs(shapes, bedPrinter.width, bedPrinter.depth, bedPrinter.height) : [],
    [bedPrinter, shapes],
  );
  // Bodies whose warning was clicked away (#640), for this session only. A body drops out of the
  // list once it fits again, so moving it out a second time warns again; a new body always warns.
  const [dismissedOverhangIds, setDismissedOverhangIds] = useState<ReadonlySet<string>>(() => new Set());
  useEffect(() => {
    setDismissedOverhangIds((current) => keepDismissedOverhangs(current, overhangs));
  }, [overhangs]);
  const shownOverhangs = useMemo(() => overhangs.filter((overhang) => !dismissedOverhangIds.has(overhang.shape.id)), [dismissedOverhangIds, overhangs]);
  const overhangWarning = bedPrinter && shownOverhangs.length > 0 ? bedOverhangMessage(shownOverhangs, `${bedPrinter.vendor} ${bedPrinter.model}`) : null;
  const dismissOverhangWarning = useCallback(() => {
    setDismissedOverhangIds((current) => new Set([...current, ...shownOverhangs.map((overhang) => overhang.shape.id)]));
  }, [shownOverhangs]);
  const [snapGrid, setSnapGrid] = useState<GridSize>(() => normalizeSnapGrid(initialSnap));
  const [workplaneMode, setWorkplaneMode] = useState(false);
  const [topPanel, setTopPanel] = useState<TopPanel>(null);
  /** The icon tag window: an SVG file, its width and OK (the library's Icon tag). */
  const [iconTagPanelOpen, setIconTagPanelOpen] = useState(false);
  const [qrCodePanelOpen, setQrCodePanelOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  // Interactive Help: while on, a click asks the guide about the element instead of using it.
  const [interactiveHelp, setInteractiveHelp] = useState(false);
  const toggleInteractiveHelp = useCallback(() => {
    setInteractiveHelp((on) => {
      setNotice(t(on ? "interactiveHelp.ended" : "interactiveHelp.started"));
      return !on;
    });
  }, []);
  useEffect(() => {
    // Shift+F1 from anywhere in the editor, also while a field has the focus.
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "F1" || !event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return;
      event.preventDefault();
      toggleInteractiveHelp();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleInteractiveHelp]);
  // An editor that is hidden behind the overview is no place to ask.
  useEffect(() => {
    if (!editorOpen) setInteractiveHelp(false);
  }, [editorOpen]);
  const [guideOpen, setGuideOpen] = useState(false);
  // The object list stays open or closed as it was left, in this browser, for every design (#356).
  const [outlinerOpen, setOutlinerOpen] = useRememberedFlag("layerling.editor.objectListOpen");
  /**
   * The groups being edited, outermost first; each next one is a part of the
   * one before. A group's parts lie loose on the workplane until "Done" groups
   * them again with the group's own id, name, colour and state, or "Cancel"
   * puts the untouched group back - always the innermost level. Which levels
   * were open is remembered for every history step (not saved with the
   * project), so undo and redo bring the bar back along with the parts.
   */
  const [openGroups, setOpenGroups] = useState<OpenGroupLevel[]>([]);
  const [openGroupBusy, setOpenGroupBusy] = useState(false);
  const openGroupsRef = useRef(openGroups);
  openGroupsRef.current = openGroups;
  const openGroupBusyRef = useRef(openGroupBusy);
  openGroupBusyRef.current = openGroupBusy;
  /** Set while opening or closing a level, whose own step is not an edit to track. */
  const openGroupTransitionRef = useRef(false);
  const openGroup = openGroups.at(-1) ?? null;
  /** The levels open at each history step, by the step's fingerprint. */
  const openGroupHistoryRef = useRef(new Map<string, OpenGroupLevel[]>());
  const openGroupCount = useCallback((entry: EditorHistoryEntry) => openGroupHistoryRef.current.get(entry.fingerprint)?.length ?? 0, []);
  // What the arrows of the history view would undo and redo from the state it shows.
  const historyViewSteps = useMemo(
    () => (historyViewState ? historyStepsAround(history, historyViewState.index, openGroupCount) : null),
    [history, historyViewState, openGroupCount],
  );
  const setOpenGroupLevels = useCallback((levels: OpenGroupLevel[]) => {
    openGroupsRef.current = levels;
    setOpenGroups(levels);
  }, []);
  const [stepExporting, setStepExporting] = useState(false);
  const [drawingExporting, setDrawingExporting] = useState(false);
  const [lylExporting, setLylExporting] = useState(false);
  const [alignMode, setAlignMode] = useState(false);
  const [multiSelect, setMultiSelect] = useState(false);
  const [alignAnchorId, setAlignAnchorId] = useState<string | null>(null);
  const [alignPreview, setAlignPreview] = useState<{ axis: AlignAxis; target: AlignTarget } | null>(null);
  const [mirrorMode, setMirrorMode] = useState(false);
  const [splitSession, setSplitSession] = useState<SplitSession | null>(null);
  const [mirrorPreviewAxis, setMirrorPreviewAxis] = useState<AlignAxis | null>(null);
  // The pivot belongs to the selection it was set for; another selection
  // turns around its own centre again.
  const [rotationPivot, setRotationPivot] = useState<{ selectionKey: string; point: PivotPoint } | null>(null);
  const [pivotPickMode, setPivotPickMode] = useState(false);
  // Writes the pivot a single body carries; filled in once updateShape exists.
  const writeOwnPivotRef = useRef<(shapeId: string, value: [number, number, number] | undefined) => void>(() => {});
  const [layFlatPickMode, setLayFlatPickMode] = useState(false);
  // "Align faces": first a face of the selected body, then one of another body.
  const [mateTool, setMateTool] = useState<{
    sourceId: string;
    step: "source" | "target" | "ready";
    source: FacePick | null;
    target: FacePick | null;
    mode: MateMode;
    gap: number;
  } | null>(null);
  // "Hole pattern": a flat face of the selected body, then the holes that fit it (#223).
  const [holePatternTool, setHolePatternTool] = useState<{
    sourceId: string;
    step: "pick" | "ready";
    face: PerforableFace | null;
    settings: HolePatternSettings;
    busy: boolean;
  } | null>(null);
  const holePatternSettingsRef = useRef<HolePatternSettings>(DEFAULT_HOLE_PATTERN);
  // "Face": a flat face of the selected body, pushed out or cut in as a pocket, with an inset from its edge (#404).
  const [faceTool, setFaceTool] = useState<{
    sourceId: string;
    step: "pick" | "ready";
    face: PerforableFace | null;
    settings: FaceToolSettings;
    busy: boolean;
  } | null>(null);
  const [faceToolPreview, setFaceToolPreview] = useState<{ shape: WorkplaneShape | null; empty: boolean } | null>(null);
  const faceToolPreviewRunRef = useRef(0);
  // "Delete face" (#451): faces of the selected body, clicked on its exact tessellation, deleted together.
  const [deleteFaceTool, setDeleteFaceTool] = useState<{
    shapeId: string;
    // The body as it was when its faces were read; a changed body puts the tool down.
    fingerprint: string;
    faces: CadModifierFaces | null;
    selectedFaceIds: number[];
    busy: boolean;
    error: string | null;
  } | null>(null);
  const deleteFaceRunRef = useRef(0);
  const [cruiseAsset, setCruiseAsset] = useState<ShapeAsset | null>(null);
  const cruiseAssetRef = useRef<ShapeAsset | null>(null);
  cruiseAssetRef.current = cruiseAsset;
  // Parts picked up with C, until a click sets them down on a face or Esc puts them back (#195).
  const [carryIds, setCarryIds] = useState<string[] | null>(null);
  const carryIdsRef = useRef<string[] | null>(null);
  carryIdsRef.current = carryIds;
  const [arrayTool, setArrayTool] = useState<ArraySettings | null>(null);
  const [scalePercentTool, setScalePercentTool] = useState<ScalePercentSettings | null>(null);
  const [scalePercentError, setScalePercentError] = useState<string | null>(null);
  const editorLanguage = useLanguage();
  const { notice, noticeAction, setNotice, holdNotice, releaseNotice, dismissNotice, reportNoticesRef } = useEditorNotice();
  const showHiddenRef = useRef<() => void>(() => undefined);
  // The design for which the hidden shapes were told once, when its shapes first arrived (#489).
  const hiddenNoticedProjectRef = useRef<string | null>(null);
  const hiddenNoticePendingRef = useRef(false);
  // Fuer den Fehlerbericht: die letzten Fehler dieser Sitzung.
  const reportErrorsRef = useRef<BugReportEvent[]>([]);
  useEffect(() => {
    const remember = (text: string) => {
      reportErrorsRef.current = rememberBugReportEvent(reportErrorsRef.current, text);
    };
    const onError = (event: ErrorEvent) => remember(`${event.message}${event.filename ? ` (${event.filename.split("/").pop()}:${event.lineno})` : ""}`);
    const onRejection = (event: PromiseRejectionEvent) => remember(`Unhandled: ${event.reason instanceof Error ? event.reason.message : String(event.reason)}`);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  // A failed autosave is said where the work happens, and stays a while.
  useEffect(() => {
    if (projectSaveFailure) setNotice(projectSaveFailure.message, true);
  }, [projectSaveFailure, setNotice]);

  // Die Statuszeile traegt fertigen Text, keinen Schluessel. Nach einem
  // Sprachwechsel waere die stehende Meldung ohnehin veraltet, also faellt
  // sie auf den Ruhezustand in der neuen Sprache zurueck.
  useEffect(() => {
    setNotice("");
  }, [editorLanguage, setNotice]);
  useEffect(() => {
    if (!cruiseAsset) return;
    setNotice(t("status.cruisePlace", { name: shapeAssetLabel(cruiseAsset) }), true);
  }, [cruiseAsset, editorLanguage, setNotice]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // Left open on an iPad, which greys out files of types it does not know (#219).
  const projectFileAccept = useFileAccept(".lyl,.skf");
  const myShapesFileAccept = useFileAccept(".zip,.lyl,.skf");
  const importFileAccept = useFileAccept(`.stl,.obj,.mtl,.zip,.3mf,.step,.stp,.svg,image/svg+xml,${PICTURE_FILE_ACCEPT}`);
  const projectFileInputRef = useRef<HTMLInputElement | null>(null);
  const insertProjectFileInputRef = useRef<HTMLInputElement | null>(null);
  const sketchImageInputRef = useRef<HTMLInputElement | null>(null);
  // The tape measure and the corner ruler of the 3D view, kept while the sketch has taken its place.
  const viewportToolMemoryRef = useRef<ViewportToolMemory>({});
  useEffect(() => {
    viewportToolMemoryRef.current = {};
  }, [projectId]);
  const booleanAutomationRunRef = useRef<string | null>(null);
  const splitRunRef = useRef(0);
  const splitProjectIdRef = useRef(projectId ?? null);
  splitProjectIdRef.current = projectId ?? null;
  const projectHydratingRef = useRef(false);
  const projectInteractionActiveRef = useRef(false);
  const pendingProjectShapesRef = useRef<WorkplaneShape[] | null>(null);
  const projectSyncTimerRef = useRef<number | null>(null);
  const heldProjectSyncTimerRef = useRef<number | null>(null);
  const lastProjectShapesSyncRef = useRef("");
  const lastProjectShapesEchoRef = useRef<string | null>(null);
  const lastProjectIdRef = useRef<string | null>(null);
  const projectSnapshotRunRef = useRef(0);
  const lastProjectSnapshotRef = useRef<ProjectThumbnailSceneKey | null>(null);
  /** A design opened without a picture on its card waits here for its first one. */
  const missingThumbnailProjectRef = useRef<string | null>(null);
  const [thumbnailMissingCheck, setThumbnailMissingCheck] = useState(0);
  const shapesRef = useRef(shapes);
  const notesRef = useRef(notes);
  const noteCommitTimerRef = useRef<number | null>(null);
  const projectAssetsRef = useRef(projectAssets);
  const selectedIdsRef = useRef(selectedIds);
  const workspaceSettingsRef = useRef(workspaceSettings);
  const snapGridRef = useRef(snapGrid);
  const placementElevationRef = useRef(placementElevation);
  const placementWorkplaneRef = useRef(placementWorkplane);
  const noticeRef = useRef(notice);
  const projectInfoRef = useRef({ projectId: projectId ?? null, projectName, projectCreatedAt });
  const historyIndexRef = useRef(historyIndex);
  const historyRef = useRef(history);
  const historyLimitRef = useRef(workspaceSettings.historyLimit);
  const interactionHistoryStartRef = useRef("");
  const interactionHistoryChangedRef = useRef(false);
  const interactionHistoryTimerRef = useRef<number | null>(null);
  const [projectInteractionActive, setProjectInteractionActive] = useState(false);
  const [toolbarMode, setToolbarMode] = useState<ToolbarMode>("geometry");
  const [sketchActive, setSketchActive] = useState(false);
  const [activeSketchWorkplane, setActiveSketchWorkplane] = useState<PlacementWorkplane>(
    () => normalizePlacementWorkplane(initialPlacementWorkplane, initialPlacementElevation),
  );
  const [sketchOperation, setSketchOperation] = useState<SketchOperation>("extrude");
  const [sketchRevolveSettings, setSketchRevolveSettings] = useState<SketchRevolveSettings>(() => ({ ...DEFAULT_SKETCH_REVOLVE_SETTINGS }));
  const [sketchRevolvePreview, setSketchRevolvePreview] = useState<SketchRevolveMesh | null>(null);
  const sketchRevolvePreviewRequestRef = useRef(0);
  const sketchRevolveUpdateRequestRef = useRef(new Map<string, number>());
  const sketchRevolveUpdateTimerRef = useRef(new Map<string, number>());
  const [sketchTool, setSketchTool] = useState<SketchTool>("line");
  // New lines are construction lines (#229).
  const [sketchConstruction, setSketchConstruction] = useState(false);
  useEffect(() => {
    if (!sketchActive) setSketchConstruction(false);
  }, [sketchActive]);
  // New lines run from their middle: the first point is the middle, the second the end, and the line goes on the same length to the other side (#624).
  const [sketchFromMiddle, setSketchFromMiddle] = useState(false);
  useEffect(() => {
    if (!sketchActive) setSketchFromMiddle(false);
  }, [sketchActive]);
  const [sketchProfile, setSketchProfile] = useState<SketchProfile>(() => emptySketchProfile());
  const [sketchHistory, setSketchHistory] = useState<SketchProfile[]>([emptySketchProfile()]);
  const [sketchHistoryIndex, setSketchHistoryIndex] = useState(0);
  const [sketchClipboard, setSketchClipboard] = useState<SketchClipboard | null>(null);
  const sketchHistoryRef = useRef(sketchHistory);
  const sketchHistoryIndexRef = useRef(sketchHistoryIndex);
  const [sketchActivePointId, setSketchActivePointId] = useState<string | null>(null);
  const [sketchSelection, setSketchSelection] = useState<SketchSelection>(null);
  const [sketchMeasureStart, setSketchMeasureStart] = useState<SketchPoint | null>(null);
  const [sketchMeasurement, setSketchMeasurement] = useState<SketchMeasurement>(null);
  const [editingSketchShapeId, setEditingSketchShapeId] = useState<string | null>(null);
  const [sketchCornerDialog, setSketchCornerDialog] = useState<"fillet" | "chamfer" | null>(null);
  // The sides of the polygon and star and the inner size of the star, set in the sketch shapes menu (#280).
  const [sketchShapeOptions, setSketchShapeOptions] = useState<SketchShapeOptions>({
    sides: SKETCH_POLYGON_DEFAULT_SIDES,
    innerPercent: SKETCH_STAR_DEFAULT_INNER_PERCENT,
  });
  // Stroke for sketches (#154): the panel, and the stroked outline shown while drawing.
  const [sketchStrokePanelOpen, setSketchStrokePanelOpen] = useState(false);
  const [sketchStrokePreview, setSketchStrokePreview] = useState<string | null>(null);
  // The points a corner treatment would apply to: one, or several selected ones (#269).
  const selectedSketchPointIds = useMemo(() => sketchSelectedPointIds(sketchSelection), [sketchSelection]);
  const canFilletSketchPoint = useMemo(
    () => selectedSketchPointIds.some((id) => canApplySketchCornerTreatment(sketchProfile, id)),
    [selectedSketchPointIds, sketchProfile],
  );
  useEffect(() => {
    setSketchCornerDialog(null);
  }, [sketchSelection, sketchTool, sketchActive]);
  const [edgeModifier, setEdgeModifier] = useState<EdgeModifierSession | null>(null);
  const [shellTool, setShellTool] = useState<{ thickness: number; openings: ShellOpenings; edges: ShellEdges; busy: boolean; error: string | null } | null>(null);
  const [simplifyToolId, setSimplifyToolId] = useState<string | null>(null);
  /** The window for fonts of one's own (#customFonts), opened from a text's font select. */
  const [fontManagerOpen, setFontManagerOpen] = useState(false);
  // A font that came or went changes the font select and maybe the letters drawn: draw again.
  const [, setCustomFontRound] = useState(0);
  useEffect(() => onFontManagerRequested(() => setFontManagerOpen(true)), []);
  useEffect(() => onCustomFontsChanged(() => setCustomFontRound((round) => round + 1)), []);
  // A text with a fill mode draws plain until the 2D kernel is there, then again properly (#215).
  useEffect(() => onManifoldReady(() => setCustomFontRound((round) => round + 1)), []);
  const edgeModifierRef = useRef<EdgeModifierSession | null>(null);
  // "Edit" on a stored fillet or chamfer (#227): the body is taken back first, then the tool opens with these.
  const edgeEditRequestRef = useRef<{ shapeId: string; historyLength: number; preset: { kind: CadModifierKind; amount: number; chamferAngle: number; endAmount?: number | null; edgeIds: number[] } } | null>(null);
  const edgeModifierPresetRef = useRef<{ kind: CadModifierKind; amount: number; chamferAngle: number; endAmount?: number | null; edgeIds: number[] } | null>(null);
  const [edgeEditRound, setEdgeEditRound] = useState(0);
  const cadModifierWorkerRef = useRef<Worker | null>(null);
  const cadModifierPendingRef = useRef(new Map<number, {
    resolve: (message: CadModifierWorkerResponse) => void;
    reject: (error: Error) => void;
    timer: number;
  }>());
  const cadModifierRequestRef = useRef(0);
  const cadModifierPrepareRef = useRef(0);
  const cadModifierLatestPreviewRef = useRef(0);
  const cadModifierBaseShapeRef = useRef<WorkplaneShape | null>(null);
  const cadModifierBaseFingerprintRef = useRef("");
  const cadModifierSourcePartsRef = useRef<WorkplaneShape[]>([]);
  const cadModifierWatchdogRef = useRef<{ requestId: number; phase: CadModifierRequestPhase; timer: number } | null>(null);
  const cadPreviewSendRef = useRef<(payload: CadPreviewPayload) => number | null>(() => null);
  const cadPreviewQueueRef = useRef(createCadPreviewQueue<CadPreviewPayload>((payload) => cadPreviewSendRef.current(payload)));
  const cadModifierWorkerRestartRef = useRef<() => Worker | null>(() => null);
  const lastMcpErrorRef = useRef<string | null>(null);
  const executeMcpCommandRef = useRef<((command: LayerlingMcpCommand) => Promise<unknown>) | null>(null);

  const clearCadModifierWatchdog = useCallback((requestId?: number) => {
    const active = cadModifierWatchdogRef.current;
    if (!active || (requestId !== undefined && active.requestId !== requestId)) return;
    window.clearTimeout(active.timer);
    cadModifierWatchdogRef.current = null;
  }, []);

  const armCadModifierWatchdog = useCallback((requestId: number, phase: CadModifierRequestPhase, timeoutMs = CAD_MODIFIER_REQUEST_TIMEOUT_MS) => {
    clearCadModifierWatchdog();
    const timer = window.setTimeout(() => {
      const active = cadModifierWatchdogRef.current;
      if (!active || active.requestId !== requestId) return;
      cadModifierWatchdogRef.current = null;
      cadModifierWorkerRef.current?.terminate();
      cadModifierWorkerRef.current = null;
      cadPreviewQueueRef.current.reset();
      cadModifierWorkerRestartRef.current();
      const message = cadModifierTimeoutMessage(phase);
      setEdgeModifier((current) => current ? {
        ...current,
        busy: false,
        prepared: false,
        preview: null,
        error: message,
      } : current);
      setNotice(message);
    }, timeoutMs);
    cadModifierWatchdogRef.current = { requestId, phase, timer };
  }, [clearCadModifierWatchdog]);

  useEffect(() => {
    let disposed = false;
    const rejectPendingRequests = (message: string) => {
      cadModifierPendingRef.current.forEach((pending) => {
        window.clearTimeout(pending.timer);
        pending.reject(new Error(message));
      });
      cadModifierPendingRef.current.clear();
    };
    const reportWorkerFailure = (worker: Worker | null) => {
      if (worker && cadModifierWorkerRef.current !== worker) return;
      clearCadModifierWatchdog();
      worker?.terminate();
      cadModifierWorkerRef.current = null;
      cadPreviewQueueRef.current.reset();
      rejectPendingRequests("The CAD worker could not start");
      const requestId = cadModifierRequestRef.current + 1;
      cadModifierRequestRef.current = requestId;
      cadModifierPrepareRef.current = requestId;
      cadModifierLatestPreviewRef.current = requestId;
      if (cadModifierBaseShapeRef.current) {
        const message = cadModifierWorkerFailureMessage();
        setEdgeModifier((current) => current ? { ...current, busy: false, prepared: false, preview: null, error: message } : current);
        setNotice(message);
      }
    };
    const createWorker = () => {
      if (disposed) return null;
      cadModifierWorkerRef.current?.terminate();
      try {
        const worker = new Worker(new URL("../workers/cadModifier.worker.ts", import.meta.url), { type: "module" });
        cadModifierWorkerRef.current = worker;
        worker.onmessage = handleWorkerMessage;
        worker.onerror = (event) => {
          event.preventDefault();
          reportWorkerFailure(worker);
        };
        worker.onmessageerror = () => reportWorkerFailure(worker);
        return worker;
      } catch {
        reportWorkerFailure(null);
        return null;
      }
    };
    function handleWorkerMessage(event: MessageEvent<CadModifierWorkerResponse>) {
      if (isBuildMessage(event.data)) {
        reportWorkerBuild(event.data);
        return;
      }
      const message = event.data;
      clearCadModifierWatchdog(message.requestId);
      const pending = cadModifierPendingRef.current.get(message.requestId);
      if (pending) {
        window.clearTimeout(pending.timer);
        cadModifierPendingRef.current.delete(message.requestId);
        if (message.type === "error") {
          pending.reject(new Error(message.message));
        } else {
          pending.resolve(message);
        }
        return;
      }
      if (message.type === "ready") {
        if (message.requestId !== cadModifierPrepareRef.current) return;
        // Die Kanten bringen ihren Winkel mit; gefiltert wird erst hier. Wenn bei
        // der voreingestellten Schwelle nichts uebrig bleibt, waere die Tafel
        // stumm - dabei weiss sie, wie scharf die schaerfste Kante ist. Also
        // Schwelle dorthin senken und es sagen.
        const gesenkteSchwelle = message.selectableEdgeIds.length === 0
          ? rescueSharpAngleForEdges(message.edges, edgeModifierRef.current?.sharpAngle ?? 25)
          : null;
        // An "Edit" brings the value and the edges the treatment had (#227).
        const preset = edgeModifierPresetRef.current;
        edgeModifierPresetRef.current = null;
        const existingEdgeIds = new Set(message.edges.map((edge) => edge.id));
        setEdgeModifier((current) => {
          if (!current) return current;
          // Judged here and not on the ref: the answer can come before the session is drawn.
          const presetEdgeIds = preset && current.kind === preset.kind ? preset.edgeIds.filter((edgeId) => existingEdgeIds.has(edgeId)) : [];
          return {
            ...current,
            edges: message.edges,
            sharpAngle: gesenkteSchwelle ?? current.sharpAngle,
            selectedEdgeIds: presetEdgeIds,
            ...(preset && presetEdgeIds.length ? { amount: preset.amount, chamferAngle: preset.chamferAngle, endAmount: preset.endAmount ?? null } : {}),
            busy: presetEdgeIds.length > 0,
            prepared: true,
            preview: null,
            componentPreviews: [],
            workingEdgeIds: [],
            failedEdgeIds: [],
            error: message.selectableEdgeIds.length || gesenkteSchwelle ? null : t("edge.noManifoldEdges"),
          };
        });
        if (message.selectableEdgeIds.length) setNotice(t("status.selectHighlightedEdges"), true);
        else if (gesenkteSchwelle) setNotice(t("status.sharpAngleLowered", { angle: gesenkteSchwelle }), true);
        return;
      }
      if (message.type === "preview") {
        if (message.requestId !== cadModifierLatestPreviewRef.current) {
          cadPreviewQueueRef.current.settle(message.requestId);
          return;
        }
        const base = cadModifierBaseShapeRef.current;
        const sourceParts = cadModifierSourcePartsRef.current.length ? cadModifierSourcePartsRef.current : (base ? [base] : []);
        const rawPreview = base ? shapeFromCadMesh(base, message.positions, message.normals, message.indices, message.brep, message.deflection) : null;
        const preview = rawPreview ? {
          ...rawPreview,
          cadDisplayEdges: cadDisplayEdgesForShape(rawPreview, message.displayEdges),
          cadDisplayEdgesVersion: 2 as const,
        } : null;
        const componentPreviews = cadModifierComponentPreviews(sourceParts, message.components, message.deflection);
        setEdgeModifier((current) => current ? {
          ...current,
          preview,
          componentPreviews,
          busy: false,
          error: preview ? null : t("edge.emptyResult"),
          // Edges cannot be toggled while a preview runs, so this is the selection it was made with.
          workingEdgeIds: preview ? current.selectedEdgeIds : current.workingEdgeIds,
          failedEdgeIds: [],
        } : current);
        // Ein neuerer Wert kann waehrend der Rechnung eingetroffen sein - der geht jetzt raus.
        const nachgeschoben = cadPreviewQueueRef.current.settle(message.requestId);
        if (preview && nachgeschoben.status !== "sent") setNotice(t("status.edgePreviewReady"));
        return;
      }
      if (message.type === "error") {
        if (message.requestId < cadModifierLatestPreviewRef.current) {
          cadPreviewQueueRef.current.settle(message.requestId);
          return;
        }
        if (message.resetSession) {
          cadPreviewQueueRef.current.reset();
          const requestId = cadModifierRequestRef.current + 1;
          cadModifierRequestRef.current = requestId;
          cadModifierLatestPreviewRef.current = requestId;
          cadModifierPrepareRef.current = requestId;
          cadModifierBaseShapeRef.current = null;
          cadModifierBaseFingerprintRef.current = "";
          cadModifierSourcePartsRef.current = [];
          setEdgeModifier(null);
          setNotice(cadModifierUserErrorMessage(message.message) ?? message.message);
          return;
        }
        setEdgeModifier((current) => current ? {
          ...current,
          busy: false,
          preview: null,
          error: cadModifierUserErrorMessage(message.message) ?? message.message,
          failedEdgeIds: message.failedEdgeIds ? conflictEdgeIds(current, message.failedEdgeIds) : [],
        } : current);
        // Ein zu grosser Radius scheitert - der inzwischen gewaehlte kleinere darf es trotzdem versuchen.
        if (cadPreviewQueueRef.current.settle(message.requestId).status !== "sent") {
          setNotice(t("status.edgeNeedsAdjustment"), true);
        }
      }
    }
    cadModifierWorkerRestartRef.current = createWorker;
    createWorker();
    return () => {
      disposed = true;
      clearCadModifierWatchdog();
      cadModifierWorkerRestartRef.current = () => null;
      rejectPendingRequests("The CAD worker was closed");
      cadModifierWorkerRef.current?.terminate();
      cadModifierWorkerRef.current = null;
    };
  }, [clearCadModifierWatchdog]);

  const invalidateCadModifierSession = useCallback(() => {
    const wasActive = cadModifierBaseShapeRef.current !== null;
    if (!wasActive) return false;
    const hadInFlightRequest = cadModifierWatchdogRef.current !== null;
    clearCadModifierWatchdog();
    cadPreviewQueueRef.current.reset();
    const requestId = cadModifierRequestRef.current + 1;
    cadModifierRequestRef.current = requestId;
    cadModifierLatestPreviewRef.current = requestId;
    cadModifierPrepareRef.current = requestId;
    if (hadInFlightRequest) {
      cadModifierWorkerRef.current?.terminate();
      cadModifierWorkerRef.current = null;
      cadModifierWorkerRestartRef.current();
    } else {
      cadModifierWorkerRef.current?.postMessage({ type: "dispose", requestId } satisfies CadModifierWorkerRequest);
    }
    cadModifierBaseShapeRef.current = null;
    cadModifierBaseFingerprintRef.current = "";
    cadModifierSourcePartsRef.current = [];
    setEdgeModifier(null);
    return true;
  }, [clearCadModifierWatchdog]);

  useEffect(() => {
    const warmBooleanRuntime = () => {
      void getManifoldRuntime().catch(() => {
        // Allow a real grouping action to retry if an idle preload was interrupted.
        resetManifoldRuntime();
      });
    };
    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(warmBooleanRuntime, { timeout: 1500 });
      return () => window.cancelIdleCallback(idleId);
    }
    const timer = globalThis.setTimeout(warmBooleanRuntime, 250);
    return () => globalThis.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const applyTitles = () => {
      document.querySelectorAll<HTMLButtonElement>("button").forEach((button) => {
        if (button.title) {
          return;
        }
        const label = button.getAttribute("aria-label") ?? button.textContent?.trim();
        if (label) {
          button.title = label.replace(/\s+/g, " ");
        }
      });
    };

    applyTitles();
    const observer = new MutationObserver(applyTitles);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-label"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setSystemClipboardSupported(Boolean(navigator.clipboard));
    const adoptShared = () => {
      const shared = readSharedClipboard();
      if (shared && shared.copiedAt >= clipboardCopiedAtRef.current) {
        clipboardCopiedAtRef.current = shared.copiedAt;
        setClipboard(shared.shapes);
      }
    };
    adoptShared();
    const onStorage = (event: StorageEvent) => {
      if (event.key === SHARED_CLIPBOARD_STORAGE_KEY) {
        adoptShared();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    shapesRef.current = shapes;
  }, [shapes]);

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  useEffect(() => {
    projectAssetsRef.current = projectAssets;
  }, [projectAssets]);

  useEffect(() => {
    selectedIdsRef.current = selectedIds;
    const currentHistory = historyRef.current;
    const currentIndex = Math.min(historyIndexRef.current, Math.max(0, currentHistory.length - 1));
    const currentEntry = currentHistory[currentIndex];
    if (currentEntry && currentEntry.selectedIds.join("\0") !== selectedIds.join("\0")) {
      const updated = currentHistory.map((entry, index) => index === currentIndex ? { ...entry, selectedIds: [...selectedIds] } : entry);
      historyRef.current = updated;
      setHistory(updated);
    }
  }, [selectedIds]);

  useEffect(() => {
    workspaceSettingsRef.current = workspaceSettings;
  }, [workspaceSettings]);

  useEffect(() => {
    snapGridRef.current = snapGrid;
  }, [snapGrid]);

  useEffect(() => {
    placementElevationRef.current = placementElevation;
  }, [placementElevation]);

  useEffect(() => {
    placementWorkplaneRef.current = placementWorkplane;
  }, [placementWorkplane]);

  useEffect(() => {
    noticeRef.current = notice;
  }, [notice]);

  useEffect(() => {
    projectInfoRef.current = { projectId: projectId ?? null, projectName, projectCreatedAt };
  }, [projectCreatedAt, projectId, projectName]);

  useEffect(() => {
    historyIndexRef.current = historyIndex;
  }, [historyIndex]);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    sketchHistoryRef.current = sketchHistory;
  }, [sketchHistory]);

  useEffect(() => {
    sketchHistoryIndexRef.current = sketchHistoryIndex;
  }, [sketchHistoryIndex]);

  useEffect(() => {
    edgeModifierRef.current = edgeModifier;
  }, [edgeModifier]);

  useEffect(() => {
    const requestId = sketchRevolvePreviewRequestRef.current + 1;
    sketchRevolvePreviewRequestRef.current = requestId;
    if (!sketchActive || sketchOperation !== "revolve" || sketchProfile.segments.length === 0) {
      setSketchRevolvePreview(null);
      return;
    }
    const timer = window.setTimeout(() => {
      void getManifoldRuntime()
        .then((runtime) => buildSketchRevolveMesh(runtime, revolveBuildProfile(runtime, sketchProfile), sketchRevolveSettings))
        .then((mesh) => {
          if (sketchRevolvePreviewRequestRef.current === requestId) setSketchRevolvePreview(mesh);
        })
        .catch(() => {
          if (sketchRevolvePreviewRequestRef.current === requestId) setSketchRevolvePreview(null);
        });
    }, 90);
    return () => window.clearTimeout(timer);
  }, [sketchActive, sketchOperation, sketchProfile, sketchRevolveSettings]);

  useEffect(() => {
    const nextWorkspace = normalizeWorkspaceSettings(initialWorkspace);
    workspaceSettingsRef.current = nextWorkspace;
    setWorkspaceSettings((current) => (
      workplaneSettingsFingerprint(current, snapGridRef.current) === workplaneSettingsFingerprint(nextWorkspace, snapGridRef.current)
        ? current
        : nextWorkspace
    ));
  }, [initialWorkspace]);

  useEffect(() => {
    const nextSnap = normalizeSnapGrid(initialSnap);
    snapGridRef.current = nextSnap;
    setSnapGrid((current) => (current === nextSnap ? current : nextSnap));
  }, [initialSnap]);

  const selectedShapes = useMemo(() => shapes.filter((shape) => selectedIds.includes(shape.id)), [selectedIds, shapes]);
  const selectedShape = selectedShapes.at(-1) ?? null;
  const hasSelection = selectedShapes.length > 0;
  // One locked shape holds the whole selection: nothing that moves or reshapes it runs.
  const selectionLocked = selectedShapes.some((shape) => shape.locked);
  const refuseLockedSelection = useCallback(() => {
    if (!selectionLocked) return false;
    setNotice(t("status.objectLocked"));
    return true;
  }, [selectionLocked, setNotice]);
  const canSplitSelection = useMemo(
    () => selectedShapes.length > 0 && selectedShapes.every((shape) => !shape.locked && !shape.hidden && !isNonSolidShapeKind(shape.kind)),
    [selectedShapes],
  );
  const splitTargetKey = splitSession?.targetIds.join("\0") ?? "";
  const splitTargetShapes = useMemo(
    () => splitSession ? shapes.filter((shape) => splitSession.targetIds.includes(shape.id)) : [],
    [shapes, splitTargetKey],
  );
  const splitTargetPoints = useMemo(() => splitTargetShapes.flatMap((shape) => meshForShape(shape).vertices), [splitTargetShapes]);
  const splitPlane = useMemo(
    () => splitSession ? modelSplitPlane(splitTargetPoints, splitSession.axis, splitSession.position, splitSession.rotation) : null,
    [splitSession?.axis, splitSession?.position, splitSession?.rotation[0], splitSession?.rotation[1], splitTargetPoints],
  );
  // Another tool opening ends a split in progress, without a notice of its own.
  const closeSplit = useCallback(() => {
    splitRunRef.current += 1;
    setSplitSession(null);
  }, []);
  // A shape on the pointer and a tool that waits for a click cannot share the
  // click: the one taken up last wins and puts the other one down.
  const startCruise = useCallback((asset: ShapeAsset) => {
    // The icon tag has no shape to carry: it starts from an SVG file, in its own window.
    if (asset.id === iconTagAsset.id) {
      setQrCodePanelOpen(false);
      setIconTagPanelOpen(true);
      return;
    }
    // The QR code (#553) starts from a text, in its own window too.
    if (asset.id === qrCodeAsset.id) {
      setIconTagPanelOpen(false);
      setQrCodePanelOpen(true);
      return;
    }
    closeSplit();
    invalidateCadModifierSession();
    setWorkplaneMode(false);
    setNoteMode(false);
    setPivotPickMode(false);
    setLayFlatPickMode(false);
    setCruiseAsset(asset);
  }, [closeSplit, invalidateCadModifierSession]);
  const stopCruise = useCallback(() => {
    if (!cruiseAssetRef.current) return;
    setCruiseAsset(null);
    setNotice("");
  }, [setNotice]);
  const modifierAvailableEdgeIds = useMemo(
    () => edgeModifier ? edgeModifier.edges.filter((edge) => selectableCadModifierEdge(edge, edgeModifier.sharpAngle)).map((edge) => edge.id) : [],
    [edgeModifier?.edges, edgeModifier?.sharpAngle],
  );
  // Which quick buttons made the edges picked now: all of them if they are the edges the tool offers, else the buttons whose
  // edges together are exactly the picked ones - several can be on at once (#538, #517).
  const modifierQuickSelection = useMemo(() => {
    if (!edgeModifier?.prepared || edgeModifier.selectedEdgeIds.length === 0) return [] as Array<"all" | "top" | "bottom" | "vertical" | "horizontal">;
    const picked = new Set(edgeModifier.selectedEdgeIds);
    if (picked.size === modifierAvailableEdgeIds.length && modifierAvailableEdgeIds.every((id) => picked.has(id))) return ["all" as const];
    const groups = [
      { key: "top" as const, ids: topCadModifierEdgeIds(edgeModifier.edges, modifierAvailableEdgeIds) },
      { key: "bottom" as const, ids: bottomCadModifierEdgeIds(edgeModifier.edges, modifierAvailableEdgeIds) },
      { key: "vertical" as const, ids: verticalCadModifierEdgeIds(edgeModifier.edges, modifierAvailableEdgeIds) },
      { key: "horizontal" as const, ids: horizontalCadModifierEdgeIds(edgeModifier.edges, modifierAvailableEdgeIds) },
    ].filter((group) => group.ids.length > 0);
    const clicked = edgeModifier.quickKeys;
    if (clicked?.length) {
      const union = new Set(groups.filter((group) => clicked.includes(group.key)).flatMap((group) => group.ids));
      if (union.size === picked.size && [...picked].every((id) => union.has(id))) return clicked.filter((key) => groups.some((group) => group.key === key));
    }
    // The buttons that count are those whose edges are all picked; they must cover the picked edges, no more and no less.
    const lit = groups.filter((group) => group.ids.every((id) => picked.has(id)));
    const covered = new Set(lit.flatMap((group) => group.ids));
    // "Horizontal" holds the top and the bottom: it is shown alone when it is the button that made the picking.
    const keys = lit.some((group) => group.key === "horizontal") && lit.every((group) => group.key === "horizontal" || group.key === "top" || group.key === "bottom")
      ? lit.filter((group) => group.key === "horizontal")
      : lit;
    return covered.size === picked.size && [...picked].every((id) => covered.has(id)) ? keys.map((group) => group.key) : [];
  }, [edgeModifier?.prepared, edgeModifier?.selectedEdgeIds, edgeModifier?.edges, edgeModifier?.quickKeys, modifierAvailableEdgeIds]);
  /** A quick button of the Fillet and Chamfer window: its edges replace the ones picked, or with Shift or Ctrl are added to them (#538). */
  const selectQuickEdges = (key: "top" | "bottom" | "vertical" | "horizontal", pick: (edges: CadModifierEdge[], candidateIds: readonly number[]) => number[], noneKey: MessageKey, add: boolean) => setEdgeModifier((current) => {
    if (!current?.prepared) return current;
    const ids = pick(current.edges, modifierAvailableEdgeIds);
    const selectedEdgeIds = add ? [...new Set([...current.selectedEdgeIds, ...ids])] : ids;
    const quickKeys = add ? [...new Set([...(current.quickKeys ?? []), key])] : [key];
    return { ...current, selectedEdgeIds, quickKeys, preview: null, busy: selectedEdgeIds.length > 0, error: selectedEdgeIds.length ? null : t(noneKey) };
  });
  // Alle grundsaetzlich verrundbaren Kanten, unabhaengig von der Schwelle -
  // damit eine feinere Kante im 3D-Bild sicht- und anklickbar bleibt, statt
  // erst nach manuellem Verschieben des Schiebereglers aufzutauchen.
  const modifierCandidateEdgeIds = useMemo(
    () => edgeModifier ? edgeModifier.edges.filter(cadModifierCandidateEdge).map((edge) => edge.id) : [],
    [edgeModifier?.edges],
  );
  // The edges drawn on the body: a new array at every render of the editor made the workplane
  // throw its edge lines away and build them all again, also while nothing about them changed.
  const modifierDisplayEdges = useMemo(() => {
    if (!edgeModifier) return NO_MODIFIER_EDGES;
    const candidates = new Set(modifierCandidateEdgeIds);
    return edgeModifier.edges.filter((edge) => candidates.has(edge.id));
  }, [edgeModifier?.edges, modifierCandidateEdgeIds]);
  const edgeModifierMaxAmount = useMemo(() => {
    const source = cadModifierBaseShapeRef.current ?? selectedShape;
    if (!source) return 10;
    // The largest measure, not the smallest: a vertical edge of a 10 mm thick
    // plate can take a far bigger radius than 10 mm, the plate's thickness
    // only limits the edges along it. Whether a size really fits the chosen
    // edges is the kernel's call, and it says so when it does not.
    const largestDimension = Math.max(shapeWidth(source), shapeDepth(source), source.height);
    return Math.max(MIN_EDGE_MODIFIER_AMOUNT, largestDimension * 0.99);
  }, [edgeModifier, selectedShape]);
  const selectedEdgeFeatureCount = useMemo(() => selectedShape ? edgeTreatmentFeatureCount(selectedShape) : 0, [selectedShape]);
  const selectedReversibleEdgeFeatureCount = useMemo(() => selectedShape ? reversibleEdgeTreatmentCount(selectedShape) : 0, [selectedShape]);
  const selectedEdgeHistoryOptions = useMemo(() => selectedShape ? edgeTreatmentHistoryOptions(selectedShape) : [], [selectedShape]);
  const canSeparateSelectedParts = useMemo(
    () => selectedShapes.length === 1 && Boolean(selectedShape && selectedShape.groupOperation !== "bundle" && (separatesBySketch(selectedShape) || separablePartCount(selectedShape) > 1)),
    [selectedShape, selectedShapes.length],
  );
  const toggleModifierEdge = useCallback((id: number, singleEdge = false) => {
    // Nebenwirkungen (setNotice) hier im Funktionskoerper, nicht im
    // setState-Updater - der laeuft unter React StrictMode doppelt.
    const current = edgeModifierRef.current;
    if (!current || current.busy) return;
    let sharpAngle = current.sharpAngle;
    let allowed = new Set(current.edges.filter((edge) => selectableCadModifierEdge(edge, sharpAngle)).map((edge) => edge.id));
    let notice: string | null = null;
    if (!allowed.has(id)) {
      // Die angeklickte Kante ist grundsaetzlich verrundbar, liegt nur unter
      // der aktuellen Schwelle - dieselbe Rettung wie beim Vorbereiten, nur
      // gezielt fuer genau diese Kante statt fuer "irgendeine".
      const clicked = current.edges.find((edge) => edge.id === id);
      if (!clicked || !cadModifierCandidateEdge(clicked)) return;
      sharpAngle = Math.max(1, Math.min(current.sharpAngle, Math.floor(clicked.angle)));
      allowed = new Set(current.edges.filter((edge) => selectableCadModifierEdge(edge, sharpAngle)).map((edge) => edge.id));
      if (!allowed.has(id)) return;
      notice = t("status.sharpAngleLoweredForEdge", { angle: sharpAngle });
    }
    const ids = current.tangentChain && !singleEdge ? tangentCadEdgeChain(current.edges, id, allowed) : [id];
    const next = new Set(current.selectedEdgeIds);
    const remove = ids.every((edgeId) => next.has(edgeId));
    ids.forEach((edgeId) => remove ? next.delete(edgeId) : next.add(edgeId));
    setEdgeModifier((latest) => latest ? { ...latest, sharpAngle, selectedEdgeIds: [...next], preview: null, busy: next.size > 0, error: next.size ? null : t("edge.selectAtLeastOne") } : latest);
    if (notice) setNotice(notice, true);
  }, []);
  // Edges the CAD kernel will treat too: OpenCascade takes a picked edge together with every
  // edge that runs on from it smoothly, whatever was clicked (#161).
  const edgeModifierImpliedEdges = useMemo(() => {
    if (!edgeModifier?.prepared || !edgeModifier.selectedEdgeIds.length) return 0;
    const real = new Set(edgeModifier.edges.filter((edge) => cadModifierCandidateEdge(edge)).map((edge) => edge.id));
    const picked = new Set(edgeModifier.selectedEdgeIds);
    const reached = new Set<number>();
    edgeModifier.selectedEdgeIds.forEach((id) => tangentCadEdgeChain(edgeModifier.edges, id, real).forEach((edgeId) => reached.add(edgeId)));
    return [...reached].filter((edgeId) => !picked.has(edgeId)).length;
  }, [edgeModifier?.edges, edgeModifier?.prepared, edgeModifier?.selectedEdgeIds]);
  // Im Verlaufsblick wird der gezeigte Stand exportiert, ganz und ohne Auswahl.
  const exportSelectionScoped = hasSelection && !historyViewState;
  const exportTargetShapes = useMemo(
    () => (historyViewState ? historyViewState.shapes : hasSelection ? selectedShapes : shapes),
    [hasSelection, historyViewState, selectedShapes, shapes],
  );
  const exportableShapeCount = useMemo(() => exportTargetShapes.filter((shape) => !shape.hole && !shape.hidden).length, [exportTargetShapes]);
  const exportHiddenCount = useMemo(() => exportTargetShapes.filter((shape) => shape.hidden).length, [exportTargetShapes]);
  const exportHolesOnly = useMemo(() => exportTargetShapes.length > 0 && exportTargetShapes.every((shape) => shape.hole), [exportTargetShapes]);
  const exportScopeLabel = exportSelectionScoped ? "selected" : "total";
  /**
   * Der Name, den ein Export oder ein neues Projekt aus dem gezeigten Stand
   * traegt: der Projektname mit der Zeit des Standes - oder, wo ein alter
   * Verlauf keine Zeit kennt, der Name einer Kopie.
   */
  const historyViewName = useMemo(() => {
    if (!historyViewState) return projectName;
    const time = historyStateNameSuffix(historyViewState.entry.at);
    return time ? t("historyView.copyName", { name: projectName, time }) : t("dashboard.copyOf", { name: projectName });
  }, [historyViewState, projectName]);
  // The note "only the selection is exported" needs to know how much is left
  // out: the visible bodies the selection does not cover.
  const exportVisibleCount = useMemo(() => shapes.filter((shape) => !shape.hidden).length, [shapes]);
  const exportSelectedVisibleCount = useMemo(() => selectedShapes.filter((shape) => !shape.hidden).length, [selectedShapes]);
  const selectAllVisible = useCallback(() => {
    setSelectedIds(shapes.filter((shape) => !shape.hidden).map((shape) => shape.id));
    setNotice(t("status.selectedAllVisible"));
  }, [shapes]);
  const effectiveAlignAnchorId = useMemo(
    () => effectiveAlignmentAnchorId(selectedShapes, alignAnchorId),
    [alignAnchorId, selectedShapes],
  );
  // A workplane set on a face lets the align tool measure along its axes (#232); on the plate it is the world's.
  const alignAxes = useMemo(() => alignAxesForWorkplane(placementWorkplane), [placementWorkplane]);
  const alignHandleStatuses = useMemo(() => (alignMode ? alignmentStatuses(selectedShapes, effectiveAlignAnchorId, alignAxes) : []), [alignAxes, alignMode, effectiveAlignAnchorId, selectedShapes]);
  // The box the handles stand on along those axes, of the anchor or of the whole selection, from the shapes as they are (no preview).
  const alignFrameBounds = useMemo(() => {
    if (!alignMode || !alignAxes || selectedShapes.length < 2) return null;
    const anchor = effectiveAlignAnchorId ? selectedShapes.find((shape) => shape.id === effectiveAlignAnchorId) : null;
    return boundsForCuboids((anchor ? [anchor] : selectedShapes).map((shape) => frameAabb(shape, alignAxes)));
  }, [alignAxes, alignMode, effectiveAlignAnchorId, selectedShapes]);
  // The copies a pattern would add, shown on the workplane until "Create".
  const arrayPreview = useMemo(
    () => (arrayTool && selectedShapes.length > 0 ? arrayCopies(selectedShapes, arrayTool) : null),
    [arrayTool, selectedShapes],
  );
  // The holes a hole pattern would cut, shown on the face until "Create".
  const holePatternPreview = useMemo(
    () => (holePatternTool?.face
      ? holePatternShapes(holePatternTool.face, holePatternTool.settings, t("holePattern.holeName"), "hole-pattern-preview")
      : null),
    [holePatternTool?.face, holePatternTool?.settings],
  );
  const baseViewportShapes = useMemo(
    () =>
      arrayPreview
        ? [...shapes, ...arrayPreview]
        : holePatternPreview?.holes.length
        ? [...shapes, ...holePatternPreview.holes]
        : faceToolPreview?.shape
        ? [...shapes, faceToolPreview.shape]
        : edgeModifier?.preview && cadModifierBaseShapeRef.current
        ? shapes.map((shape) => shape.id === cadModifierBaseShapeRef.current?.id ? edgeModifier.preview as WorkplaneShape : shape)
        : alignMode && alignPreview
        ? alignedShapesForSelection(shapes, selectedIds, selectedShapes, effectiveAlignAnchorId, alignPreview.axis, alignPreview.target, alignAxes).nextShapes
        : mirrorMode && mirrorPreviewAxis
          ? mirroredShapesForSelection(shapes, selectedIds, selectedShapes, mirrorPreviewAxis).nextShapes
          : shapes,
    [alignAxes, alignMode, alignPreview, arrayPreview, edgeModifier?.preview, effectiveAlignAnchorId, faceToolPreview, holePatternPreview, mirrorMode, mirrorPreviewAxis, selectedIds, selectedShapes, shapes],
  );
  // The preview of an intersection (#372): the operands see-through, and what they share as a body of its own on top.
  const [intersectPreviewIds, setIntersectPreviewIds] = useState<string[] | null>(null);
  const [intersectPreviewShape, setIntersectPreviewShape] = useState<WorkplaneShape | null>(null);
  const intersectPreviewIdsRef = useRef<string[] | null>(null);
  intersectPreviewIdsRef.current = intersectPreviewIds;
  const intersectPreviewRunRef = useRef(0);
  const intersectPreviewEmptyRef = useRef(false);
  const viewportShapes = useMemo(() => {
    if (!intersectPreviewIds) return baseViewportShapes;
    const operands = new Set(intersectPreviewIds);
    const ghosts = baseViewportShapes.map((shape) => (operands.has(shape.id) && !shape.hole ? { ...shape, transparent: true } : shape));
    return intersectPreviewShape ? [...ghosts, intersectPreviewShape] : ghosts;
  }, [baseViewportShapes, intersectPreviewIds, intersectPreviewShape]);
  // A revolve sketch on the base plate is a side view: the bodies are shown from the front, as the profile is drawn (#525).
  // Opened again to edit a body that stands upright, it is the same side view: that body stands at its height, not on the plate's workplane.
  const editedRevolveShape = sketchActive && sketchOperation === "revolve" && editingSketchShapeId ? shapes.find((shape) => shape.id === editingSketchShapeId) : undefined;
  const revolveSketchFront = sketchActive && sketchOperation === "revolve"
    && (placementWorkplaneIsBase(activeSketchWorkplane) || (editedRevolveShape ? revolveBodyStandsUpright(editedRevolveShape) : false));
  const sketchReferenceShapes = useMemo(() => {
    // Only the sketch view shows them; outside it every body would be projected for nothing.
    if (!sketchActive) return shapes;
    if (revolveSketchFront) {
      return shapes.map((shape) => shape.hidden || shape.id === editingSketchShapeId || isNonSolidShapeKind(shape.kind)
        ? shape
        : sketchReferenceShapeOnWorkplane(shape, REVOLVE_REFERENCE_WORKPLANE));
    }
    // On the base plate a body that only stands turned about the vertical keeps its plain outline;
    // one that lies tilted (laid flat, stood on an edge) shows as it sits there, not as it was made (#231).
    const onBase = placementWorkplaneIsBase(activeSketchWorkplane);
    const tilted = (shape: WorkplaneShape) => Boolean(shape.rotationX || shape.rotationZ);
    if (onBase && !shapes.some(tilted)) return shapes;
    return shapes.map((shape) => shape.hidden || shape.id === editingSketchShapeId || (onBase && !tilted(shape))
      ? shape
      : sketchReferenceShapeOnWorkplane(shape, activeSketchWorkplane));
  }, [activeSketchWorkplane, editingSketchShapeId, revolveSketchFront, shapes, sketchActive]);
  // A workplane inside a body cuts it: the sketch view shows the outline of the cut (a hollow body
  // gives a ring), where a workplane on a face shows that face. Per body, as an SVG path in the
  // workplane's own coordinates.
  const sketchReferenceSlices = useMemo(() => {
    const slices: Record<string, string> = {};
    if (!sketchActive || placementWorkplaneIsBase(activeSketchWorkplane)) return slices;
    shapes.forEach((shape) => {
      if (shape.hidden || shape.id === editingSketchShapeId) return;
      const mesh = meshForShape(shape);
      const vertices = mesh.vertices.map(([x, y, z]) => {
        const local = placementWorkplaneCoordinates(activeSketchWorkplane, { x, y, z });
        return { x: local.x, h: local.y, z: local.z };
      });
      if (!planeCutsMesh(vertices.map((vertex) => vertex.h))) return;
      const path = meshSlicePath(vertices, mesh.faces);
      if (path) slices[shape.id] = path;
    });
    return slices;
  }, [activeSketchWorkplane, editingSketchShapeId, shapes, sketchActive]);
  // The bodies seen through, all their edges projected onto the sketch plane, to trace round existing work (#354).
  const [sketchShowPartEdges, setSketchShowPartEdges] = useRememberedFlag("layerling.sketch.showPartEdges");
  const sketchReferenceEdges = useMemo(() => {
    if (!sketchActive || !sketchShowPartEdges) return "";
    return shapes
      .filter((shape) => !shape.hidden && !shape.hole && shape.id !== editingSketchShapeId && !isNonSolidShapeKind(shape.kind))
      .map((shape) => {
        const mesh = meshForShape(shape);
        const vertices = mesh.vertices.map(([x, y, z]) => {
          const local = placementWorkplaneCoordinates(revolveSketchFront ? REVOLVE_REFERENCE_WORKPLANE : activeSketchWorkplane, { x, y, z });
          return { x: local.x, h: local.y, z: local.z };
        });
        return projectedEdgesPath(vertices, mesh.faces);
      })
      .join("");
  }, [activeSketchWorkplane, editingSketchShapeId, revolveSketchFront, shapes, sketchActive, sketchShowPartEdges]);
  const debugState = useMemo(
    () =>
      JSON.stringify({
        notice,
        selectedIds,
        shapeCount: shapes.length,
        shapes: shapes.map(debugShapeSummary),
      }),
    [notice, selectedIds, shapes],
  );
  const compactDebugState = useMemo(
    () => `notice=${notice};selected=${selectedIds.length};count=${shapes.length};${shapes.map(compactShapeSummary).join(";")}`,
    [notice, selectedIds, shapes],
  );

  useEffect(() => {
    const runId = projectSnapshotRunRef.current + 1;
    projectSnapshotRunRef.current = runId;
    if (!projectId || !onProjectSnapshot || typeof window === "undefined") {
      return;
    }
    const sceneKey = { projectId, fingerprint: projectShapesFingerprint(shapes) };
    // No picture on its card (never taken, or lost with a Docker container made again or a backup
    // brought back): count the open design as changed, so its picture is taken now.
    if (missingThumbnailProjectRef.current === projectId && !projectHydratingRef.current) {
      missingThumbnailProjectRef.current = null;
      lastProjectSnapshotRef.current = { projectId, fingerprint: "" };
    }
    if (lastProjectSnapshotRef.current?.projectId !== projectId || projectHydratingRef.current) {
      lastProjectSnapshotRef.current = sceneKey;
      return;
    }
    if (!projectThumbnailSceneChanged(lastProjectSnapshotRef.current, sceneKey)) {
      return;
    }
    if (projectInteractionActive) {
      return;
    }

    let stopped = false;
    let uploadController: AbortController | null = null;
    const capture = async () => {
      if (stopped || projectSnapshotRunRef.current !== runId) {
        return true;
      }
      const image = window.layerlingCaptureCanvasAsync
        ? await window.layerlingCaptureCanvasAsync()
        : window.layerlingCaptureCanvas?.() ?? "";
      if (stopped || projectSnapshotRunRef.current !== runId) {
        return true;
      }
      if (image && image.length > 100) {
        const controller = new AbortController();
        uploadController = controller;
        try {
          await onProjectSnapshot({ image, projectId, shapes: shapes.length }, controller.signal);
          if (!stopped && projectSnapshotRunRef.current === runId && !controller.signal.aborted) {
            lastProjectSnapshotRef.current = sceneKey;
          }
          return true;
        } catch (error) {
          if (controller.signal.aborted || (error instanceof DOMException && error.name === "AbortError")) {
            return true;
          }
          return false;
        } finally {
          if (uploadController === controller) uploadController = null;
        }
      }
      return false;
    };

    let idleId: number | null = null;
    let retryTimer: number | null = null;
    const runCapture = () => {
      void capture().then((captured) => {
        if (!captured) {
          retryTimer = window.setTimeout(() => void capture(), 650);
        }
      });
    };
    const captureTimer = window.setTimeout(() => {
      if ("requestIdleCallback" in window) {
        idleId = window.requestIdleCallback(runCapture, { timeout: 1200 });
      } else {
        runCapture();
      }
    }, PROJECT_THUMBNAIL_IDLE_MS);
    return () => {
      stopped = true;
      uploadController?.abort();
      window.clearTimeout(captureTimer);
      if (retryTimer !== null) window.clearTimeout(retryTimer);
      if (idleId !== null && "cancelIdleCallback" in window) window.cancelIdleCallback(idleId);
    };
  }, [onProjectSnapshot, projectId, projectInteractionActive, shapes, thumbnailMissingCheck]);

  useEffect(() => {
    if (!projectId || !isProjectThumbnailMissing) return;
    let cancelled = false;
    void isProjectThumbnailMissing(projectId).then((missing) => {
      if (!missing || cancelled) return;
      missingThumbnailProjectRef.current = projectId;
      setThumbnailMissingCheck((count) => count + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [isProjectThumbnailMissing, projectId]);

  useEffect(() => {
    if (selectedShapes.length < 2) {
      setAlignMode(false);
      setAlignAnchorId(null);
      setAlignPreview(null);
    }
    if (alignAnchorId && !selectedIds.includes(alignAnchorId)) {
      setAlignAnchorId(null);
      setAlignPreview(null);
    }
    if (selectedShapes.length === 0) {
      setMirrorMode(false);
      setMirrorPreviewAxis(null);
      setPivotPickMode(false);
    }
  }, [alignAnchorId, selectedIds, selectedShapes.length]);

  const selectionKey = selectedIds.join("|");
  // One body selected: the pivot it carries. Several: the one set for them.
  const ownPivotShape = selectedShapes.length === 1 ? selectedShapes[0] : null;
  const ownRotationPivot = useMemo(() => (ownPivotShape ? shapePivotWorld(ownPivotShape) : null), [ownPivotShape]);
  const activeRotationPivot = ownPivotShape
    ? ownRotationPivot
    : rotationPivot?.selectionKey === selectionKey ? rotationPivot.point : null;
  useEffect(() => {
    if (rotationPivot && rotationPivot.selectionKey !== selectionKey) setRotationPivot(null);
  }, [rotationPivot, selectionKey]);

  const toggleRotationPivot = useCallback(() => {
    if (pivotPickMode) {
      setPivotPickMode(false);
      setNotice(t("status.pivotPickCancelled"));
      return;
    }
    if (activeRotationPivot) {
      if (ownPivotShape) writeOwnPivotRef.current(ownPivotShape.id, undefined);
      else setRotationPivot(null);
      setNotice(t("status.pivotCleared"));
      return;
    }
    if (!hasSelection) {
      setNotice(t("status.selectShapeFirst"));
      return;
    }
    if (refuseLockedSelection()) return;
    closeSplit();
    stopCruise();
    setPivotPickMode(true);
    setNotice(t("status.pivotPickStart"));
  }, [refuseLockedSelection, activeRotationPivot, closeSplit, hasSelection, ownPivotShape, pivotPickMode, stopCruise]);

  // A pattern belongs to the selection it was opened for, and so does scaling by percent.
  useEffect(() => {
    setArrayTool(null);
    setScalePercentTool(null);
    setScalePercentError(null);
  }, [selectionKey]);

  const toggleArrayTool = useCallback(() => {
    if (arrayTool) {
      setArrayTool(null);
      setNotice(t("status.arrayCancelled"));
      return;
    }
    if (selectedShapes.length === 0) {
      setNotice(t("status.selectShapeFirst"));
      return;
    }
    if (refuseLockedSelection()) return;
    const bounds = boundsForShapes(selectedShapes);
    setAlignMode(false);
    setMirrorMode(false);
    setPivotPickMode(false);
    closeSplit();
    setArrayTool({
      mode: "row",
      count: 4,
      // Next to each other with a little air, whatever the size of the part.
      ...singleAxisSpacing("x", Math.round((bounds.maxX - bounds.minX + 5) * 2) / 2),
      angle: 360,
      centerX: activeRotationPivot ? activeRotationPivot.x : 0,
      centerY: activeRotationPivot ? -activeRotationPivot.z : 0,
      rotateCopies: true,
      rise: 0,
      radiusChange: 0,
    });
    setNotice(t("status.arrayStart"));
  }, [refuseLockedSelection, activeRotationPivot, arrayTool, closeSplit, selectedShapes]);

  // The circle's centre follows the pivot while the pattern is open: a pivot dragged to a new place moves the
  // preview with it (#638). A centre typed in the panel stays until the pivot moves again.
  const arrayPivotX = activeRotationPivot?.x;
  const arrayPivotZ = activeRotationPivot?.z;
  useEffect(() => {
    if (arrayPivotX === undefined || arrayPivotZ === undefined) return;
    setArrayTool((current) => (current ? arrayFollowingPivot(current, { x: arrayPivotX, z: arrayPivotZ }) : current));
  }, [arrayPivotX, arrayPivotZ]);


  const pickRotationPivot = useCallback((point: PivotPoint | null) => {
    setPivotPickMode(false);
    if (!point) {
      setNotice(t("status.pivotMissed"));
      return;
    }
    // A single body keeps its pivot; several bodies share one for this selection.
    if (ownPivotShape) writeOwnPivotRef.current(ownPivotShape.id, shapePivotFromWorld(ownPivotShape, point));
    else setRotationPivot({ selectionKey, point });
    setNotice(t("status.pivotSet"));
  }, [ownPivotShape, selectionKey]);

  /** Hands the shapes to the page above, which writes them to the browser's storage. */
  const emitProjectShapes = useCallback(
    (canonicalNext: WorkplaneShape[], serialized: string) => {
      if (!projectId || !onProjectShapesChange) {
        return;
      }
      lastProjectShapesSyncRef.current = serialized;
      lastProjectShapesEchoRef.current = serialized;
      onProjectShapesChange({
        projectId,
        shapes: canonicalNext,
        history: historyRef.current,
        historyIndex: historyIndexRef.current,
        assets: projectAssetsRef.current,
        projectName: projectInfoRef.current.projectName,
        projectCreatedAt: projectInfoRef.current.projectCreatedAt,
        workspace: workspaceSettingsRef.current,
        snapGrid: snapGridRef.current,
        placementElevation: placementElevationRef.current,
        placementWorkplane: placementWorkplaneRef.current,
        sketchPlacementWorkplane: placementWorkplaneRef.current,
      });
    },
    [onProjectShapesChange, projectId],
  );

  /**
   * Saves what waited for an interaction to end, right now. A held interaction
   * may only delay saving, never stop it: when its end never arrives (a field
   * that vanished while focused, a pointer released outside the window), the
   * changes after it would otherwise live in memory only (discussion #87).
   */
  const flushHeldProjectShapes = useCallback(() => {
    if (heldProjectSyncTimerRef.current !== null) {
      window.clearTimeout(heldProjectSyncTimerRef.current);
      heldProjectSyncTimerRef.current = null;
    }
    const pending = pendingProjectShapesRef.current;
    if (!pending) return;
    pendingProjectShapesRef.current = null;
    const serialized = projectShapesFingerprint(pending);
    if (lastProjectShapesSyncRef.current === serialized) return;
    emitProjectShapes(pending, serialized);
  }, [emitProjectShapes]);

  useEffect(() => {
    if (!splitSession) return;
    const sameTargets = splitSession.targetIds.length === selectedIds.length
      && splitSession.targetIds.every((id) => selectedIds.includes(id))
      && splitTargetShapes.length === splitSession.targetIds.length;
    const sceneUnchanged = projectShapesFingerprint(shapes) === splitSession.sourceFingerprint;
    if (sameTargets && sceneUnchanged) return;
    splitRunRef.current += 1;
    setSplitSession(null);
    setNotice(t("status.splitCancelledChanged"));
  }, [selectedIds, shapes, splitSession, splitTargetShapes.length]);

  const syncProjectShapes = useCallback(
    (nextShapes: WorkplaneShape[], force = false) => {
      if (!projectId || !onProjectShapesChange) {
        return;
      }
      if (projectInteractionActiveRef.current) {
        pendingProjectShapesRef.current = nextShapes.map(canonicalizeShape);
        if (projectSyncTimerRef.current !== null) {
          window.clearTimeout(projectSyncTimerRef.current);
          projectSyncTimerRef.current = null;
        }
        if (heldProjectSyncTimerRef.current !== null) {
          window.clearTimeout(heldProjectSyncTimerRef.current);
        }
        heldProjectSyncTimerRef.current = window.setTimeout(flushHeldProjectShapes, PROJECT_SYNC_HELD_MAX_MS);
        return;
      }
      const canonicalNext = nextShapes.map(canonicalizeShape);
      const serialized = projectShapesFingerprint(canonicalNext);
      if (!force && lastProjectShapesSyncRef.current === serialized) {
        return;
      }
      if (projectSyncTimerRef.current !== null) {
        window.clearTimeout(projectSyncTimerRef.current);
      }
      projectSyncTimerRef.current = window.setTimeout(() => {
        projectSyncTimerRef.current = null;
        emitProjectShapes(canonicalNext, serialized);
      }, 120);
    },
    [emitProjectShapes, flushHeldProjectShapes, onProjectShapesChange, projectId],
  );

  /*
   * Leaving the window - closing it, switching to another app, the Mac going
   * to sleep - is the last moment a waiting save can still start. A hidden
   * window may be frozen or closed without another chance.
   */
  const saveProjectShapesNow = useCallback(() => {
    if (projectSyncTimerRef.current !== null) {
      window.clearTimeout(projectSyncTimerRef.current);
      projectSyncTimerRef.current = null;
      const canonicalNext = shapesRef.current.map(canonicalizeShape);
      emitProjectShapes(canonicalNext, projectShapesFingerprint(canonicalNext));
    }
    flushHeldProjectShapes();
  }, [emitProjectShapes, flushHeldProjectShapes]);

  useEffect(() => {
    if (!projectId || !onProjectShapesChange) return;
    const saveNow = () => {
      if (document.visibilityState !== "hidden") return;
      saveProjectShapesNow();
    };
    // The offer to reload after an update asks for the open design to be written first.
    const saveOnRequest = () => saveProjectShapesNow();
    window.addEventListener("layerling:save-now", saveOnRequest);
    document.addEventListener("visibilitychange", saveNow);
    window.addEventListener("pagehide", saveNow);
    return () => {
      document.removeEventListener("visibilitychange", saveNow);
      window.removeEventListener("pagehide", saveNow);
      window.removeEventListener("layerling:save-now", saveOnRequest);
    };
  }, [onProjectShapesChange, projectId, saveProjectShapesNow]);

  useEffect(() => {
    const limitChanged = historyLimitRef.current !== workspaceSettings.historyLimit;
    historyLimitRef.current = workspaceSettings.historyLimit;
    const bounded = boundedEditorHistoryState(
      historyRef.current,
      historyIndexRef.current,
      workspaceSettings.historyLimit,
    );
    if (bounded.entries !== historyRef.current || bounded.index !== historyIndexRef.current) {
      historyRef.current = bounded.entries;
      historyIndexRef.current = bounded.index;
      setHistory(bounded.entries);
      setHistoryIndex(bounded.index);
    }
    if (limitChanged) syncProjectShapes(shapesRef.current, true);
  }, [syncProjectShapes, workspaceSettings.historyLimit]);

  const appendHistoryEntry = useCallback((entry: EditorHistoryEntry, replaceCurrent = false) => {
    openGroupHistoryRef.current.set(entry.fingerprint, openGroupsRef.current);
    const result = appendEditorHistorySnapshot(
      historyRef.current,
      historyIndexRef.current,
      entry,
      workspaceSettingsRef.current.historyLimit,
      Date.now(),
      replaceCurrent,
    );
    if (result.entries !== historyRef.current) {
      historyRef.current = result.entries;
      setHistory(result.entries);
    }
    historyIndexRef.current = result.index;
    setHistoryIndex(result.index);
    return result.changed;
  }, []);

  const appendHistorySnapshot = useCallback(
    (
      nextShapes: WorkplaneShape[],
      nextSelection: string[],
      nextNotes: WorkplaneNote[] = notesRef.current,
      nextWorkplane: PlacementWorkplane = placementWorkplaneRef.current,
      replaceCurrent = false,
    ) =>
      appendHistoryEntry(editorHistoryEntry(nextShapes, nextSelection, nextNotes, nextWorkplane), replaceCurrent),
    [appendHistoryEntry],
  );

  const finalizeInteractionHistory = useCallback(() => {
    const startFingerprint = interactionHistoryStartRef.current;
    const hadChanges = interactionHistoryChangedRef.current;
    interactionHistoryStartRef.current = "";
    interactionHistoryChangedRef.current = false;
    if (!hadChanges) {
      return;
    }

    const entry = editorHistoryEntry(shapesRef.current, selectedIdsRef.current, notesRef.current, placementWorkplaneRef.current);
    if (!startFingerprint || startFingerprint === entry.fingerprint) {
      return;
    }

    appendHistoryEntry(entry);
  }, [appendHistoryEntry]);

  useEffect(() => {
    if (projectInteractionActive || !pendingProjectShapesRef.current) {
      return;
    }
    if (heldProjectSyncTimerRef.current !== null) {
      window.clearTimeout(heldProjectSyncTimerRef.current);
      heldProjectSyncTimerRef.current = null;
    }
    pendingProjectShapesRef.current = null;
    const timer = window.setTimeout(() => syncProjectShapes(shapesRef.current), 180);
    return () => window.clearTimeout(timer);
  }, [projectInteractionActive, syncProjectShapes]);

  /** The shapes as they stood when the drag now going on began, for Esc to put back (#440). */
  const interactionStartShapesRef = useRef<WorkplaneShape[] | null>(null);
  const cancelInteraction = useCallback(() => {
    const start = interactionStartShapesRef.current;
    if (!start || !projectInteractionActiveRef.current) return;
    shapesRef.current = start;
    setShapes(start);
    syncProjectShapes(start);
    // Nothing happened as far as the history is concerned: no step for a drag that was taken back.
    interactionHistoryChangedRef.current = false;
    setNotice(t("status.dragCancelled"));
  }, [syncProjectShapes]);

  const updateProjectInteractionActive = useCallback(
    (active: boolean) => {
      if (active) {
        if (interactionHistoryTimerRef.current !== null) {
          window.clearTimeout(interactionHistoryTimerRef.current);
          interactionHistoryTimerRef.current = null;
          finalizeInteractionHistory();
        }
        if (!projectInteractionActiveRef.current) {
          interactionHistoryStartRef.current = projectSceneFingerprint(shapesRef.current, notesRef.current, placementWorkplaneRef.current);
          interactionHistoryChangedRef.current = false;
          interactionStartShapesRef.current = shapesRef.current;
        }
        projectInteractionActiveRef.current = true;
        setProjectInteractionActive((current) => (current ? current : true));
        return;
      }

      projectInteractionActiveRef.current = false;
      setProjectInteractionActive((current) => (current ? false : current));
      if (interactionHistoryTimerRef.current !== null) {
        window.clearTimeout(interactionHistoryTimerRef.current);
      }
      interactionHistoryTimerRef.current = window.setTimeout(() => {
        interactionHistoryTimerRef.current = null;
        finalizeInteractionHistory();
      }, 0);
    },
    [finalizeInteractionHistory],
  );

  const updateProjectWorkspaceSettings = useCallback(
    (settings: { workspace: WorkplaneWorkspaceSettings; snap: GridSize }) => {
      const nextWorkspace = normalizeWorkspaceSettings(settings.workspace);
      workspaceSettingsRef.current = nextWorkspace;
      if (!nextWorkspace.clickToPlaceShapes && cruiseAssetRef.current) {
        setCruiseAsset(null);
        setNotice("");
      }
      snapGridRef.current = settings.snap;
      setWorkspaceSettings((current) => (
        workplaneSettingsFingerprint(current, settings.snap) === workplaneSettingsFingerprint(nextWorkspace, settings.snap)
          ? current
          : nextWorkspace
      ));
      setSnapGrid(settings.snap);
      if (!projectId || !onProjectWorkspaceChange) {
        return;
      }
      onProjectWorkspaceChange({
        projectId,
        workspace: nextWorkspace,
        snap: settings.snap,
        placementElevation,
        placementWorkplane: placementWorkplaneRef.current,
        sketchPlacementWorkplane: placementWorkplaneRef.current,
      });
    },
    [onProjectWorkspaceChange, placementElevation, projectId],
  );

  useEffect(() => {
    if (!projectId || !onProjectWorkspaceChange) return;
    onProjectWorkspaceChange({
      projectId,
      workspace: workspaceSettingsRef.current,
      snap: snapGrid,
      placementElevation,
      placementWorkplane,
      sketchPlacementWorkplane: placementWorkplane,
    });
  }, [onProjectWorkspaceChange, placementElevation, placementWorkplane, projectId, snapGrid]);

  /** The arrow keys' last step in the 3D editor; a run of presses is one step of the history (#370). */
  const keyRunRef = useRef<KeyRun | null>(null);

  const commitShapes = useCallback(
    (next: WorkplaneShape[], nextSelection: string | string[] | null = selectedIds, message?: string, keyRunKey?: string) => {
      // Solange der Verlaufsblick offen ist, zeigt die Flaeche nicht den
      // Entwurf. Eine Aenderung, die jetzt noch durchkaeme - ueber einen
      // Umweg, den die Leiste nicht kennt -, traefe etwas, das keiner sieht.
      if (historyViewStateRef.current) {
        setNotice(t("status.historyViewBlocksEdits"));
        return;
      }
      const canonicalNext = next.map(canonicalizeShape);
      const requestedSelection = Array.isArray(nextSelection) ? nextSelection : nextSelection ? [nextSelection] : [];
      const validSelection = requestedSelection.filter((id, index) => requestedSelection.indexOf(id) === index && canonicalNext.some((shape) => shape.id === id));
      // A note whose body goes away moves to the new body under it, or stays where it stands.
      const levels = openGroupsRef.current;
      const nextNotes = notesAfterShapeChange(notesRef.current, shapesRef.current, canonicalNext, new Set(levels.map((level) => level.original.id)), openGroupTransitionRef.current);
      if (levels.length && !openGroupTransitionRef.current) {
        const levelPartIds = levels.map((level) => level.childIds);
        const tracked = trackOpenGroupLevels(levelPartIds, shapesRef.current, canonicalNext);
        if (tracked !== levelPartIds) {
          setOpenGroupLevels(levels.map((level, index) => (tracked[index] === level.childIds ? level : { ...level, childIds: [...tracked[index]] })));
        }
      }
      shapesRef.current = canonicalNext;
      selectedIdsRef.current = validSelection;
      notesRef.current = nextNotes;
      setShapes(canonicalNext);
      setSelectedIds(validSelection);
      if (nextNotes !== notes) setNotes(nextNotes);
      const now = Date.now();
      const currentIndex = historyIndexRef.current;
      const replaceCurrent = keyRunKey !== undefined && continuesKeyRun(keyRunRef.current, keyRunKey, now, historyRef.current[currentIndex], currentIndex === historyRef.current.length - 1);
      const changed = appendHistorySnapshot(canonicalNext, validSelection, nextNotes, placementWorkplaneRef.current, replaceCurrent);
      if (keyRunKey !== undefined) {
        // Only a step the keys just made can be replaced by the next press.
        const newest = historyRef.current[historyIndexRef.current];
        keyRunRef.current = changed && newest ? { key: keyRunKey, at: now, entry: newest } : changed ? null : keyRunRef.current;
      }
      if (message) {
        // Eine Bestaetigung: Etwas ist entstanden, hat sich geaendert oder ist
        // verschwunden - und das sieht man ohnehin. Sie geht nach Sekunden.
        setNotice(message);
      }
      if (changed) {
        syncProjectShapes(canonicalNext);
      }
    },
    [appendHistorySnapshot, notes, selectedIds, setOpenGroupLevels, syncProjectShapes],
  );

  /**
   * Notizen aendern sich wie Koerper: ueber den Verlauf. Deshalb liegt hier
   * alles, was sie anfasst - anlegen, tippen, verschieben, loeschen -, und jeder
   * dieser Wege legt einen Stand ab, den Rueckgaengig wieder holen kann.
   */
  const commitNotes = useCallback(
    (next: WorkplaneNote[], message?: string) => {
      if (historyViewStateRef.current) {
        setNotice(t("status.historyViewBlocksEdits"));
        return;
      }
      const normalized = normalizeNotes(next);
      notesRef.current = normalized;
      setNotes(normalized);
      const changed = appendHistoryEntry(editorHistoryEntry(shapesRef.current, selectedIdsRef.current, normalized, placementWorkplaneRef.current));
      if (message) setNotice(message);
      // Der Abgleich mit dem Projektspeicher vergleicht Koerper. Eine Notiz
      // aendert daran nichts, also muss er hier ausdruecklich laufen.
      if (changed) syncProjectShapes(shapesRef.current, true);
    },
    [appendHistoryEntry, setNotice, syncProjectShapes],
  );

  const addNote = useCallback(
    (note: { x: number; y: number; z: number; anchor?: WorkplaneNote["anchor"] }) => {
      if (notesRef.current.length >= NOTE_COUNT_LIMIT) {
        setNotice(t("status.noteLimitReached", { count: NOTE_COUNT_LIMIT }));
        return null;
      }
      const created: WorkplaneNote = { id: createNoteId(), text: "", x: note.x, y: note.y, z: note.z };
      if (note.anchor) created.anchor = note.anchor;
      commitNotes([...notesRef.current, created], note.anchor ? t("status.notePinned") : t("status.noteAdded"));
      return created.id;
    },
    [commitNotes, setNotice],
  );

  /**
   * Reference points: bare marks in space that shapes snap to. They live among
   * the notes (so they are saved, undone and shared like them) but are not notes.
   */
  const addReferencePoints = useCallback(
    (positions: ReferencePosition[]) => {
      const fresh = newReferencePositions(notesRef.current, positions);
      if (fresh.length === 0) {
        setNotice(t("status.pointsExist"));
        return [] as string[];
      }
      const room = NOTE_COUNT_LIMIT - notesRef.current.length;
      if (room <= 0) {
        setNotice(t("status.noteLimitReached", { count: NOTE_COUNT_LIMIT }));
        return [] as string[];
      }
      const created: WorkplaneNote[] = fresh.slice(0, room).map((position) => ({
        id: createNoteId(),
        text: "",
        ...position,
        kind: "point",
        collapsed: true,
      }));
      setNotesVisible(true);
      commitNotes([...notesRef.current, ...created], t("status.pointsAdded", { count: created.length }));
      return created.map((point) => point.id);
    },
    [commitNotes, setNotice],
  );

  const removeAllReferencePoints = useCallback(() => {
    const points = referencePoints(notesRef.current);
    if (points.length === 0) return;
    commitNotes(notesRef.current.filter((note) => note.kind !== "point"), t("status.pointsRemoved", { count: points.length }));
  }, [commitNotes]);

  const markSelectionPoints = useCallback(
    (spot: ReferencePointSpot) => {
      const box = unionReferenceBoxes(selectedShapes.filter((shape) => !shape.hole).map(meshAabb));
      if (box) addReferencePoints(referencePointsForBox(box, spot));
    },
    [addReferencePoints, selectedShapes],
  );

  /**
   * Beim Tippen und beim Ziehen faellt pro Anschlag eine Aenderung an. Jede
   * davon in den Verlauf zu legen, machte Rueckgaengig unbrauchbar - also geht
   * ein solcher Zwischenstand nur in den Zustand, und der Verlauf bekommt ihn,
   * wenn die Hand stillhaelt oder das Feld den Fokus abgibt.
   */
  const updateNote = useCallback(
    (id: string, patch: Partial<WorkplaneNote>, transient = false) => {
      const next = patchNote(notesRef.current, id, patch);
      if (!next) return;
      if (noteCommitTimerRef.current !== null) {
        window.clearTimeout(noteCommitTimerRef.current);
        noteCommitTimerRef.current = null;
      }
      if (!transient) {
        commitNotes(next);
        return;
      }
      notesRef.current = next;
      setNotes(next);
      noteCommitTimerRef.current = window.setTimeout(() => {
        noteCommitTimerRef.current = null;
        commitNotes(notesRef.current);
      }, NOTE_COMMIT_IDLE_MS);
    },
    [commitNotes],
  );

  const removeNote = useCallback(
    (id: string) => {
      if (noteCommitTimerRef.current !== null) {
        window.clearTimeout(noteCommitTimerRef.current);
        noteCommitTimerRef.current = null;
      }
      const current = notesRef.current;
      const removed = current.find((note) => note.id === id);
      if (!removed) return;
      commitNotes(current.filter((note) => note.id !== id), t(removed.kind === "point" ? "status.pointRemoved" : "status.noteRemoved"));
    },
    [commitNotes],
  );

  /**
   * Das Notizwerkzeug: Der naechste Klick auf die Arbeitsflaeche setzt eine
   * Notiz. Es schliesst aus, was sonst am Zeiger haengt - zwei Werkzeuge auf
   * einem Klick waeren ein Ratespiel.
   */
  const toggleNoteTool = useCallback(() => {
    stopCruise();
    setNoteMode((current) => {
      const next = !current;
      if (next) {
        setWorkplaneMode(false);
        setNotesVisible(true);
        setNotice(t("status.noteMode"), true);
      } else {
        setNotice("");
      }
      return next;
    });
  }, [setNotice, stopCruise]);

  const toggleOverhangsVisible = useCallback(() => {
    setOverhangsVisible((current) => {
      const next = !current;
      setNotice(next ? t("status.overhangsShown", { angle: workspaceSettingsRef.current.overhangAngle }) : t("status.overhangsHidden"));
      return next;
    });
  }, []);

  const toggleNotesVisible = useCallback(() => {
    setNotesVisible((current) => {
      const next = !current;
      if (!next) setNoteMode(false);
      setNotice(next ? t("status.notesShown") : t("status.notesHidden"));
      return next;
    });
  }, [setNotice]);

  const removeEdgeTreatment = useCallback(async (optionId: string) => {
    if (!selectedShape) {
      setNotice(t("status.selectShapeWithEdge"));
      return;
    }
    if (selectedShape.locked) {
      setNotice(t("status.objectLocked"));
      return;
    }
    const option = selectedEdgeHistoryOptions.find((candidate) => candidate.id === optionId);
    if (!option) {
      setNotice(t("status.chooseEdgeFeature"), true);
      return;
    }
    const sourceFingerprint = projectShapesFingerprint([selectedShape]);
    const sourceProjectId = projectInfoRef.current.projectId;
    const restored = await restoreEdgeTreatmentInShape(selectedShape, option.path, option.entryId, workspaceSettingsRef.current.booleanTriangleLimit);
    if (!restored) {
      setNotice(selectedEdgeFeatureCount > 0 ? t("status.edgeNoUndoHistory") : t("status.noEdgeFeature"));
      return;
    }
    const currentTarget = shapesRef.current.find((shape) => shape.id === selectedShape.id);
    if (projectInfoRef.current.projectId !== sourceProjectId || !currentTarget || projectShapesFingerprint([currentTarget]) !== sourceFingerprint) {
      setNotice(t("status.edgeRemoveChanged"));
      return;
    }
    // The Fillet or Chamfer tool stays open, so that several features can be taken back one after the other (#514).
    const openTool = edgeModifier ? { kind: edgeModifier.kind, amount: edgeModifier.amount, chamferAngle: edgeModifier.chamferAngle, endAmount: edgeModifier.endAmount ?? null } : null;
    invalidateCadModifierSession();
    commitShapes(
      shapesRef.current.map((shape) => shape.id === selectedShape.id ? restored.shape : shape),
      restored.shape.id,
    );
    if (openTool) {
      edgeEditRequestRef.current = {
        shapeId: restored.shape.id,
        historyLength: restored.shape.edgeTreatmentHistory?.length ?? 0,
        preset: { ...openTool, edgeIds: [] },
      };
      setEdgeEditRound((round) => round + 1);
    }
    setNotice(t("status.removedFeature", { label: restored.label }));
  }, [commitShapes, edgeModifier, invalidateCadModifierSession, selectedEdgeFeatureCount, selectedEdgeHistoryOptions, selectedShape]);

  // "Edit" on a stored treatment (#227): it is taken back as in the list, and the tool opens again with
  // its value and its edges to change. A fillet or chamfer waits for the body to be there again first.
  const editEdgeTreatment = useCallback(async (optionId: string) => {
    const option = selectedEdgeHistoryOptions.find((candidate) => candidate.id === optionId);
    const entry = option && selectedShape && option.path.length === 0
      ? (selectedShape.edgeTreatmentHistory ?? []).find((candidate) => candidate.id === option.entryId)
      : undefined;
    // A deletion of faces has no "Edit" (it is not editable): it can only be taken back.
    if (!selectedShape || !option || !entry || entry.feature.kind === "deleteFace") {
      setNotice(t("status.chooseEdgeFeature"), true);
      return;
    }
    if (selectedShape.locked) {
      setNotice(t("status.objectLocked"));
      return;
    }
    const sourceFingerprint = projectShapesFingerprint([selectedShape]);
    const sourceProjectId = projectInfoRef.current.projectId;
    const restored = await restoreEdgeTreatmentInShape(selectedShape, option.path, option.entryId, workspaceSettingsRef.current.booleanTriangleLimit);
    if (!restored) {
      setNotice(selectedEdgeFeatureCount > 0 ? t("status.edgeNoUndoHistory") : t("status.noEdgeFeature"));
      return;
    }
    const currentTarget = shapesRef.current.find((shape) => shape.id === selectedShape.id);
    if (projectInfoRef.current.projectId !== sourceProjectId || !currentTarget || projectShapesFingerprint([currentTarget]) !== sourceFingerprint) {
      setNotice(t("status.edgeRemoveChanged"));
      return;
    }
    invalidateCadModifierSession();
    commitShapes(
      shapesRef.current.map((shape) => shape.id === selectedShape.id ? restored.shape : shape),
      restored.shape.id,
    );
    const feature = entry.feature;
    if (feature.kind === "shell") {
      setShellTool({ thickness: feature.amount, openings: feature.openings ?? "top", edges: feature.shellEdges ?? "round", busy: false, error: null });
    } else {
      edgeEditRequestRef.current = {
        shapeId: restored.shape.id,
        historyLength: restored.shape.edgeTreatmentHistory?.length ?? 0,
        preset: { kind: feature.kind, amount: feature.amount, chamferAngle: feature.chamferAngle ?? 45, endAmount: feature.endAmount ?? null, edgeIds: feature.edgeIds ?? [] },
      };
      setEdgeEditRound((round) => round + 1);
    }
    setNotice(t("status.editingFeature", { label: restored.label }));
  }, [commitShapes, invalidateCadModifierSession, selectedEdgeFeatureCount, selectedEdgeHistoryOptions, selectedShape]);

  /** The arrow keys' last step in the sketch; a run of presses is one step of its history (#370). */
  const sketchKeyRunRef = useRef<KeyRun | null>(null);

  const commitSketchProfile = useCallback(
    (next: SketchProfile, message?: string, keyRunKey?: string) => {
      const current = sketchHistoryRef.current;
      const currentIndex = Math.min(sketchHistoryIndexRef.current, Math.max(0, current.length - 1));
      const trimmed = current.slice(0, currentIndex + 1);
      const latest = trimmed.at(-1);
      // Most edits build a new profile from points and lines only; the stroke (#154) carries over
      // unless the edit sets it - or clears it with `stroke: undefined`.
      const carried = "stroke" in next || !latest?.stroke ? next : { ...next, stroke: latest.stroke };
      // Moving shapes over each other makes no shared points where their lines cross (#239); drawing does.
      const snapshot = cloneSketchProfile(latest && onlyMovesPoints(latest, carried) ? carried : addLineIntersectionPoints(carried, createLocalId));
      // A locked outline (#653) stays as it is, whatever tool tried to change it.
      if (latest && changesLockedOutline(latest, snapshot)) {
        setNotice(t("status.sketchOutlineLocked"));
        return;
      }
      setSketchProfile(snapshot);
      if (latest && JSON.stringify(latest) === JSON.stringify(snapshot)) {
        return;
      }
      const now = Date.now();
      const replaceLatest = keyRunKey !== undefined && trimmed.length > 1 && continuesKeyRun(sketchKeyRunRef.current, keyRunKey, now, latest, true);
      const stored = cloneSketchProfile(snapshot);
      const nextHistory = replaceLatest
        // A run that ends where it started leaves no step.
        ? JSON.stringify(trimmed[trimmed.length - 2]) === JSON.stringify(snapshot) ? trimmed.slice(0, -1) : [...trimmed.slice(0, -1), stored]
        : [...trimmed, stored].slice(-MAX_SKETCH_HISTORY_ENTRIES);
      sketchKeyRunRef.current = keyRunKey !== undefined && nextHistory[nextHistory.length - 1] === stored ? { key: keyRunKey, at: now, entry: stored } : null;
      sketchHistoryRef.current = nextHistory;
      sketchHistoryIndexRef.current = nextHistory.length - 1;
      setSketchHistory(nextHistory);
      setSketchHistoryIndex(sketchHistoryIndexRef.current);
      if (message) setNotice(message);
    },
    [],
  );

  /** Where the edited body's middle is in the sketch, when the sketch of an existing body was opened (#291). */
  const sketchEditAnchorRef = useRef<SketchAnchor | null>(null);
  /**
   * The edited body's own kind and workplane, once its sketch was switched to another kind of body (#655):
   * finishing then makes a new body of that kind in the old one's place, and switching back edits it as before.
   */
  const sketchOperationSwitchRef = useRef<{ operation: SketchOperation; workplane: PlacementWorkplane } | null>(null);

  const beginSketch = useCallback((
    operation: SketchOperation,
    profile?: SketchProfile,
    editingId: string | null = null,
    revolveSettings?: Partial<SketchRevolveSettings>,
    workplaneOverride?: PlacementWorkplane,
  ) => {
    const initial = cloneSketchProfile(profile ?? emptySketchProfile());
    setCruiseAsset(null);
    setWorkplaneMode(false);
    setActiveSketchWorkplane(normalizePlacementWorkplane(workplaneOverride ?? placementWorkplaneRef.current));
    setToolbarMode("sketch");
    setSketchActive(true);
    setSketchOperation(operation);
    sketchOperationSwitchRef.current = null;
    setSketchRevolveSettings(normalizeSketchRevolveSettings(revolveSettings));
    setSketchRevolvePreview(null);
    setSketchTool(profile?.segments.length ? "select" : "line");
    setSketchProfile(initial);
    const initialHistory = [cloneSketchProfile(initial)];
    sketchHistoryRef.current = initialHistory;
    sketchHistoryIndexRef.current = 0;
    setSketchHistory(initialHistory);
    setSketchHistoryIndex(0);
    setSketchActivePointId(null);
    setSketchSelection(null);
    setSketchMeasureStart(null);
    setSketchMeasurement(null);
    setEditingSketchShapeId(editingId);
    // A face tool body shows the face's outline; the body is built set in from it, which the sketch does not draw.
    setNotice(editingId
      ? initial.inset
        ? t("status.editingInsetProfile", { distance: Number(initial.inset.distance.toFixed(2)), radius: Number(initial.inset.radius.toFixed(2)) })
        : t(operation === "revolve" ? "status.editingRevolveProfile" : operation === "sweep" ? "status.editingSweepProfile" : "status.editingProfile")
      : operation === "revolve" ? t("status.revolveStarted") : operation === "sweep" ? t("status.sweepStarted") : t("status.sketchStarted"));
  }, []);

  const beginSketchEdit = useCallback(() => {
    if (selectedShapes.length !== 1 || !selectedShape?.sketchProfile) {
      setNotice(t("status.selectSketchShape"));
      return;
    }
    const operation = sketchBodyOperation(selectedShape);
    let editWorkplane: PlacementWorkplane | undefined;
    sketchEditAnchorRef.current = null;
    if (operation === "extrude" || operation === "sweep") {
      const quaternion = quaternionForShape(selectedShape);
      const normal = new THREE.Vector3(0, 1, 0).applyQuaternion(quaternion).normalize();
      const xAxis = new THREE.Vector3(1, 0, 0).applyQuaternion(quaternion).normalize();
      const zAxis = new THREE.Vector3(0, 0, 1).applyQuaternion(quaternion).normalize();
      // The sketch is drawn over the body: the point of the outline under the body's middle goes there.
      const anchor = sketchBodyAnchor(selectedShape);
      sketchEditAnchorRef.current = anchor;
      const profileCenterX = anchor.x;
      const profileCenterZ = anchor.z;
      const origin = new THREE.Vector3(
        selectedShape.x,
        (selectedShape.elevation ?? 0) + selectedShape.height / 2,
        selectedShape.z,
      )
        .addScaledVector(normal, -selectedShape.height / 2)
        .addScaledVector(xAxis, -profileCenterX)
        .addScaledVector(zAxis, -profileCenterZ);
      editWorkplane = placementWorkplaneFromSurface(
        { x: origin.x, y: origin.y, z: origin.z },
        { x: normal.x, y: normal.y, z: normal.z },
        { x: xAxis.x, y: xAxis.y, z: xAxis.z },
      );
    } else if (operation === "revolve") {
      const quaternion = quaternionForShape(selectedShape);
      const normal = new THREE.Vector3(0, 1, 0).applyQuaternion(quaternion).normalize();
      const xAxis = new THREE.Vector3(1, 0, 0).applyQuaternion(quaternion).normalize();
      const origin = new THREE.Vector3(
        selectedShape.x,
        (selectedShape.elevation ?? 0) + selectedShape.height / 2,
        selectedShape.z,
      ).addScaledVector(normal, -selectedShape.height / 2);
      editWorkplane = placementWorkplaneFromSurface(
        { x: origin.x, y: origin.y, z: origin.z },
        { x: normal.x, y: normal.y, z: normal.z },
        { x: xAxis.x, y: xAxis.y, z: xAxis.z },
      );
    }
    beginSketch(operation, selectedShape.sketchProfile, selectedShape.id, selectedShape.sketchRevolve, editWorkplane);
  }, [beginSketch, selectedShape, selectedShapes.length]);

  const cancelSketch = useCallback(() => {
    setSketchActive(false);
    sketchEditAnchorRef.current = null;
    sketchOperationSwitchRef.current = null;
    setSketchActivePointId(null);
    setSketchSelection(null);
    setSketchMeasureStart(null);
    setSketchMeasurement(null);
    setEditingSketchShapeId(null);
    setSketchRevolvePreview(null);
    setSketchStrokePanelOpen(false);
    // Back to the 3D editor tab, as finishing does; otherwise the toolbar stays on an empty sketch tab (#212).
    setToolbarMode("geometry");
    setNotice(t("status.sketchCancelled"));
  }, []);

  /**
   * What the open sketch becomes - extruded, revolved or swept - changed while drawing (#655). The sketch
   * of an existing body then makes a new body of that kind in its place, drawn on the plate: a revolve
   * is drawn from the front. Switching back to the body's own kind edits it as before.
   */
  const switchSketchOperation = useCallback((next: SketchOperation) => {
    if (next === sketchOperation) return;
    if (editingSketchShapeId) {
      const switched = sketchOperationSwitchRef.current ?? { operation: sketchOperation, workplane: activeSketchWorkplane };
      if (next === switched.operation) {
        setActiveSketchWorkplane(switched.workplane);
        sketchOperationSwitchRef.current = null;
      } else {
        sketchOperationSwitchRef.current = switched;
        setActiveSketchWorkplane(horizontalPlacementWorkplane());
      }
    }
    setSketchOperation(next);
    setSketchRevolvePreview(null);
    // An outline reaching across the axis - an imported SVG is centred on itself - moves left onto it; Ctrl+Z takes it back.
    if (next === "revolve") {
      const leftOfAxis = sketchProfileLeftOfAxis(sketchProfile);
      if (leftOfAxis !== sketchProfile) commitSketchProfile(leftOfAxis);
    }
    setNotice(t("status.sketchOperationChanged", { operation: t(next === "revolve" ? "sketch.modeBadgeRevolve" : next === "sweep" ? "sketch.modeBadgeSweep" : "sketch.modeBadgeExtrude") }));
  }, [activeSketchWorkplane, commitSketchProfile, editingSketchShapeId, sketchOperation, sketchProfile]);

  const sketchUndo = useCallback(() => {
    const currentHistory = sketchHistoryRef.current;
    const currentIndex = sketchHistoryIndexRef.current;
    if (currentIndex <= 0) {
      setNotice(t("status.nothingToUndoSketch"));
      return;
    }
    const nextIndex = currentIndex - 1;
    sketchHistoryIndexRef.current = nextIndex;
    setSketchHistoryIndex(nextIndex);
    setSketchProfile(cloneSketchProfile(currentHistory[nextIndex] ?? emptySketchProfile()));
    setSketchActivePointId(null);
    setSketchSelection(null);
    setNotice(t("status.sketchUndo"));
  }, []);

  const sketchRedo = useCallback(() => {
    const currentHistory = sketchHistoryRef.current;
    const currentIndex = sketchHistoryIndexRef.current;
    if (currentIndex >= currentHistory.length - 1) {
      setNotice(t("status.nothingToRedoSketch"));
      return;
    }
    const nextIndex = currentIndex + 1;
    sketchHistoryIndexRef.current = nextIndex;
    setSketchHistoryIndex(nextIndex);
    setSketchProfile(cloneSketchProfile(currentHistory[nextIndex] ?? emptySketchProfile()));
    setSketchActivePointId(null);
    setSketchSelection(null);
    setNotice(t("status.sketchRedo"));
  }, []);

  const setActiveSketchTool = useCallback((tool: SketchTool) => {
    setSketchTool(tool);
    setSketchActivePointId(null);
    setSketchSelection(null);
    if (tool !== "measure") setSketchMeasureStart(null);
    const messages: Record<SketchTool, string> = {
      line: t("status.sketchTool.line"),
      arc: t("status.sketchTool.arc"),
      bezier: t("status.sketchTool.bezier"),
      smooth: t("status.sketchTool.smooth"),
      rectangle: t("status.sketchTool.rectangle"),
      circle: t("status.sketchTool.circle"),
      ellipse: t("status.sketchTool.ellipse"),
      halfCircle: t("status.sketchTool.halfCircle"),
      pieSlice: t("status.sketchTool.pieSlice"),
      boltCircle: t("status.sketchTool.boltCircle"),
      triangle: t("status.sketchTool.triangle"),
      hexagon: t("status.sketchTool.hexagon"),
      polygon: t("sketch.polygon"),
      star: t("sketch.star"),
      select: t("status.sketchTool.select"),
      refine: t("status.sketchTool.refine"),
      erase: t("status.sketchTool.erase"),
      measure: t("status.sketchTool.measure"),
    };
    setNotice(messages[tool]);
  }, []);

  const measureSketchPoint = useCallback(
    (point: SketchPoint) => {
      if (!sketchMeasureStart) {
        setSketchMeasureStart({ ...point });
        setSketchMeasurement(null);
        setNotice(t("status.chooseSecondPoint"), true);
        return;
      }
      const measurement = { start: { ...sketchMeasureStart }, end: { ...point } };
      setSketchMeasurement(measurement);
      setSketchMeasureStart(null);
      setNotice(t("status.measured", {
        value: Number(Math.hypot(measurement.end.x - measurement.start.x, measurement.end.z - measurement.start.z).toFixed(2)),
      }));
    },
    [sketchMeasureStart],
  );

  const clearSketchMeasurement = useCallback(() => {
    setSketchMeasureStart(null);
    setSketchMeasurement(null);
    setNotice(t("status.sketchMeasurementRemoved"));
  }, []);

  const connectSketchPoint = useCallback(
    (pointId: string, profile = sketchProfile) => {
      if (!["line", "bezier", "smooth"].includes(sketchTool)) return profile;
      const curveKind = sketchTool as NonNullable<SketchSegment["kind"]>;
      if (!sketchActivePointId) {
        setSketchActivePointId(pointId);
        setSketchSelection({ kind: "point", id: pointId });
        return profile;
      }
      if (sketchActivePointId === pointId) return profile;
      const duplicate = profile.segments.some(
        (segment) =>
          (segment.startId === sketchActivePointId && segment.endId === pointId) ||
          (segment.startId === pointId && segment.endId === sketchActivePointId),
      );
      const next = duplicate
        ? profile
        : {
            ...profile,
            segments: [...profile.segments, { id: createLocalId("sketch-segment"), startId: sketchActivePointId, endId: pointId, kind: curveKind, ...(sketchConstruction ? { construction: true } : {}) }],
          };
      const smoothed = sketchTool === "smooth" ? withSmoothSketchHandles(next) : next;
      const closed = orderedSketchPaths(smoothed).some((path) => path.closed && path.steps.some((step) => step.segment.startId === sketchActivePointId || step.segment.endId === sketchActivePointId));
      if (!duplicate) commitSketchProfile(smoothed, closed ? t("status.sketchProfileClosed") : t("status.sketchSegmentAdded"));
      setSketchActivePointId(closed ? null : pointId);
      setSketchSelection({ kind: "point", id: pointId });
      if (closed) setSketchTool("select");
      return smoothed;
    },
    [commitSketchProfile, sketchActivePointId, sketchConstruction, sketchProfile, sketchTool],
  );

  const addSketchPlanePoint = useCallback(
    (position: { x: number; z: number }, handles?: { handleIn: { x: number; z: number }; handleOut: { x: number; z: number } }) => {
      if (sketchTool === "measure") {
        measureSketchPoint({ id: "measure", ...position });
        return;
      }
      if (!["line", "bezier", "smooth"].includes(sketchTool)) return;
      const curveKind = sketchTool as NonNullable<SketchSegment["kind"]>;
      const existing = sketchProfile.points.find((point) => Math.hypot(point.x - position.x, point.z - position.z) < 0.0001);
      if (existing) {
        // The Bezier tool bends a side only when both its ends have a handle: an existing point gets what it lacks, or what was dragged out of it (#635).
        const prepared = sketchTool === "bezier" ? withBezierHandles(sketchProfile, existing.id, handles ?? null, sketchActivePointId) : null;
        if (!prepared) {
          connectSketchPoint(existing.id);
        } else if (!sketchActivePointId) {
          // Starting here: nothing is connected yet, so the handles are saved on their own.
          commitSketchProfile(prepared, t("status.sketchPointAdded"));
          connectSketchPoint(existing.id, prepared);
        } else {
          connectSketchPoint(existing.id, prepared);
        }
        return;
      }
      // A plain click with the Bezier tool pulled nothing out: the handles then run along the side that leads to the point, so they can be seen and taken (#636).
      const clicked = handles && Math.hypot(handles.handleOut.x - position.x, handles.handleOut.z - position.z) < 1e-9;
      const leadsFrom = sketchActivePointId ? sketchProfile.points.find((entry) => entry.id === sketchActivePointId) ?? null : null;
      const newHandles = clicked ? chordHandles(leadsFrom, position) : handles;
      const point: SketchPoint = {
        id: createLocalId("sketch-point"),
        ...position,
        ...(newHandles ?? {}),
        mode: sketchTool === "line" ? "corner" : sketchTool === "smooth" ? "smooth" : newHandles ? "smooth" : "corner",
      };
      const middle = sketchFromMiddle && sketchTool === "line" && sketchActivePointId ? sketchProfile.points.find((entry) => entry.id === sketchActivePointId) : null;
      if (middle) {
        // From the middle (#624): the first point is the middle, this one the end, and the other end lies the same distance on the far side.
        const far: SketchPoint = { id: createLocalId("sketch-point"), x: 2 * middle.x - position.x, z: 2 * middle.z - position.z, mode: "corner" };
        const kind = { kind: "line" as const, ...(sketchConstruction ? { construction: true } : {}) };
        const through: SketchProfile = {
          ...sketchProfile,
          points: [...sketchProfile.points, point, far],
          segments: [
            ...sketchProfile.segments,
            { id: createLocalId("sketch-segment"), startId: middle.id, endId: point.id, ...kind },
            { id: createLocalId("sketch-segment"), startId: far.id, endId: middle.id, ...kind },
          ],
        };
        commitSketchProfile(through, t("status.sketchSegmentAdded"));
        setSketchActivePointId(null);
        setSketchSelection({ kind: "point", id: point.id });
        return;
      }
      const next: SketchProfile = { ...sketchProfile, points: [...sketchProfile.points, point] };
      if (sketchActivePointId) {
        next.segments = [...next.segments, { id: createLocalId("sketch-segment"), startId: sketchActivePointId, endId: point.id, kind: curveKind, ...(sketchConstruction ? { construction: true } : {}) }];
      }
      const prepared = sketchTool === "smooth" ? withSmoothSketchHandles(next) : sketchTool === "bezier" ? withBezierStartHandle(next, sketchActivePointId, position) : next;
      commitSketchProfile(prepared, sketchActivePointId ? t("status.sketchPointSegmentAdded") : t("status.sketchPointAdded"));
      setSketchActivePointId(point.id);
      setSketchSelection({ kind: "point", id: point.id });
    },
    [commitSketchProfile, connectSketchPoint, measureSketchPoint, sketchActivePointId, sketchConstruction, sketchFromMiddle, sketchProfile, sketchTool],
  );

  /** The three-point arc (#643): from start to end, through the third point clicked. */
  const addSketchArc = useCallback(
    (start: SketchArcEnd, through: { x: number; z: number }, end: SketchArcEnd) => {
      const result = sketchProfileWithArc(sketchProfile, start, through, end, { construction: sketchConstruction });
      if (!result) {
        setNotice(t("status.sketchArcStraight"));
        return;
      }
      const radius = `${formatLengthMm(result.radius, workspaceSettings.accuracy)} ${lengthDisplayUnit(workspaceSettings).label}`;
      commitSketchProfile(result.profile, t("status.sketchArcAdded", { radius }));
      setSketchActivePointId(null);
      setSketchSelection(null);
    },
    [commitSketchProfile, sketchConstruction, sketchProfile, workspaceSettings],
  );

  const addSketchPrimitive = useCallback(
    (primitive: SketchPrimitive, center: { x: number; z: number } = { x: 0, z: 0 }) => {
      const { points, segments } = sketchPrimitiveGeometry(primitive, center, createLocalId, undefined, sketchShapeOptions);

      const next: SketchProfile = {
        ...sketchProfile,
        points: [...sketchProfile.points, ...points],
        segments: [...sketchProfile.segments, ...segments],
      };
      commitSketchProfile(next, t("status.sketchPrimitiveAdded", { shape: t(`sketch.${primitive}`) }));
      setSketchActivePointId(null);
      setSketchSelection(null);
      setSketchTool("select");
    },
    [commitSketchProfile, sketchProfile, sketchShapeOptions],
  );

  const pressSketchPoint = useCallback(
    (id: string) => {
      const point = sketchProfile.points.find((entry) => entry.id === id);
      if (!point) return;
      if (sketchTool === "measure") {
        measureSketchPoint(point);
        setSketchSelection({ kind: "point", id });
        return;
      }
      if (sketchTool === "select") {
        setSketchSelection({ kind: "point", id });
        setSketchActivePointId(null);
        return;
      }
      connectSketchPoint(id);
    },
    [connectSketchPoint, measureSketchPoint, sketchProfile.points, sketchTool],
  );

  const deleteSketchPoint = useCallback(
    (id: string) => {
      // A point between two sides is bridged; at a crossing the sides that run on are joined (#641).
      const next = sketchProfileWithoutPoint(sketchProfile, id);
      commitSketchProfile(next.segments.some((segment) => segment.kind === "smooth") ? withSmoothSketchHandles(next) : next, t("status.sketchPointRemoved"));
      if (sketchActivePointId === id) setSketchActivePointId(null);
      setSketchSelection(null);
    },
    [commitSketchProfile, sketchActivePointId, sketchProfile],
  );

  const deleteSketchSegment = useCallback(
    (id: string) => {
      commitSketchProfile({ ...sketchProfile, segments: sketchProfile.segments.filter((segment) => segment.id !== id) }, t("status.sketchLineRemoved"));
      setSketchActivePointId(null);
      setSketchSelection(null);
    },
    [commitSketchProfile, sketchProfile],
  );

  const updateSketchImage = useCallback((id: string, patch: Partial<SketchImage>, message = "Sketch image updated", keyRunKey?: string) => {
    const image = (sketchProfile.images ?? []).find((entry) => entry.id === id);
    if (!image) return;
    if (image.locked && patch.locked !== false) {
      setNotice(t("status.unlockImageEdit"));
      return;
    }
    commitSketchProfile({
      ...sketchProfile,
      images: (sketchProfile.images ?? []).map((entry) => entry.id === id ? { ...entry, ...patch } : entry),
    }, message, keyRunKey);
    setSketchSelection({ kind: "image", id });
    setSketchActivePointId(null);
  }, [commitSketchProfile, sketchProfile]);

  const deleteSketchImage = useCallback((id: string) => {
    const image = (sketchProfile.images ?? []).find((entry) => entry.id === id);
    if (!image) return;
    if (image.locked) {
      setNotice(t("status.unlockImageDelete"));
      return;
    }
    commitSketchProfile({
      ...sketchProfile,
      images: (sketchProfile.images ?? []).filter((image) => image.id !== id),
    }, t("status.sketchImageRemoved"));
    setSketchSelection(null);
  }, [commitSketchProfile, sketchProfile]);

  const addSketchImageFile = useCallback(async (file: File) => {
    if (!sketchActive || sketchTool !== "select") {
      setNotice(t("status.chooseSelectFirst"));
      return;
    }
    if (!file.type.startsWith("image/")) {
      setNotice(t("status.chooseImageFile"));
      return;
    }
    try {
      const prepared = await prepareImportedImage(file);
      const dimensions = imagePlateDimensions(prepared.pixelWidth, prepared.pixelHeight);
      const image: SketchImage = {
        id: createLocalId("sketch-image"),
        name: file.name.replace(/\.[^.]+$/, "") || "Sketch image",
        ...prepared,
        x: 0,
        z: 0,
        width: dimensions.width,
        depth: dimensions.depth,
        opacity: 0.55,
        lockAspect: true,
        locked: false,
      };
      commitSketchProfile({ ...sketchProfile, images: [...(sketchProfile.images ?? []), image] }, t("status.sketchImageAdded", { name: file.name }));
      setSketchSelection({ kind: "image", id: image.id });
      setSketchActivePointId(null);
    } catch (error) {
      setNotice(error instanceof Error ? localizedError(error.message) : t("status.imageNotAdded"));
    }
  }, [commitSketchProfile, sketchActive, sketchProfile, sketchTool]);

  const toggleSelectedSketchImageLock = useCallback(() => {
    if (sketchSelection?.kind !== "image") {
      setNotice(t("status.selectSketchImageLock"));
      return;
    }
    const image = (sketchProfile.images ?? []).find((entry) => entry.id === sketchSelection.id);
    if (!image) {
      setNotice(t("status.selectSketchImageLock"));
      return;
    }
    updateSketchImage(
      image.id,
      { locked: !image.locked },
      image.locked ? "Sketch image unlocked" : "Sketch image locked",
    );
  }, [sketchProfile.images, sketchSelection, updateSketchImage]);

  /** Locks the selected outline (#653), or unlocks it when all of it is locked. */
  const toggleSketchOutlineLock = useCallback(() => {
    const pointIds = sketchSelectedPointIds(sketchSelection);
    if (!pointIds.length) {
      setNotice(t("status.selectSketchOutlineLock"));
      return;
    }
    const locked = sketchLockState(sketchProfile, pointIds) !== "all";
    commitSketchProfile(setSketchPointsLocked(sketchProfile, pointIds, locked), t(locked ? "status.sketchOutlineLockedOn" : "status.sketchOutlineUnlocked"));
  }, [commitSketchProfile, sketchProfile, sketchSelection]);

  const deleteSelectedSketchEntity = useCallback(() => {
    if (!sketchSelection) {
      setNotice(t("status.selectSketchPoint"));
      return;
    }
    if (sketchSelection.kind === "point") deleteSketchPoint(sketchSelection.id);
    else if (sketchSelection.kind === "segment") deleteSketchSegment(sketchSelection.id);
    else if (sketchSelection.kind === "image") deleteSketchImage(sketchSelection.id);
    else {
      const pointIds = new Set(sketchSelection.pointIds);
      const segmentIds = new Set(sketchSelection.segmentIds);
      const imageIds = new Set(sketchSelection.imageIds ?? []);
      commitSketchProfile({
        ...sketchProfile,
        points: sketchProfile.points.filter((point) => !pointIds.has(point.id)),
        segments: sketchProfile.segments.filter((segment) => !segmentIds.has(segment.id) && !pointIds.has(segment.startId) && !pointIds.has(segment.endId)),
        images: (sketchProfile.images ?? []).filter((image) => !imageIds.has(image.id)),
      }, t("status.sketchSelectionRemoved"));
      setSketchActivePointId(null);
      setSketchSelection(null);
    }
  }, [commitSketchProfile, deleteSketchImage, deleteSketchPoint, deleteSketchSegment, sketchProfile, sketchSelection]);

  /** What a window dragged with the Erase tool takes away: the points and lines inside it, as the Select tool's window would pick them (#519). */
  const eraseSketchMany = useCallback((pointIds: string[], segmentIds: string[]) => {
    if (pointIds.length === 0 && segmentIds.length === 0) return;
    const points = new Set(pointIds);
    const segments = new Set(segmentIds);
    commitSketchProfile({
      ...sketchProfile,
      points: sketchProfile.points.filter((point) => !points.has(point.id)),
      segments: sketchProfile.segments.filter((segment) => !segments.has(segment.id) && !points.has(segment.startId) && !points.has(segment.endId)),
    }, t("status.sketchSelectionRemoved"));
    setSketchActivePointId(null);
    setSketchSelection(null);
  }, [commitSketchProfile, sketchProfile]);

  /** The Erase button with something selected erases it, instead of only dropping the selection (#519). */
  const chooseSketchTool = useCallback((tool: SketchTool) => {
    const eraseSelection = tool === "erase" && sketchTool !== "erase" && Boolean(sketchSelection);
    setActiveSketchTool(tool);
    if (eraseSelection) deleteSelectedSketchEntity();
  }, [deleteSelectedSketchEntity, setActiveSketchTool, sketchSelection, sketchTool]);

  const copySketchSelectionToClipboard = useCallback(() => {
    const copied = copySketchSelection(sketchProfile, sketchSelection);
    if (!copied) {
      setNotice(t("status.selectSketchGeometry"));
      return;
    }
    setSketchClipboard(copied);
    setNotice(t("status.sketchCopied"));
  }, [sketchProfile, sketchSelection]);

  const cutSketchSelection = useCallback(() => {
    const copied = copySketchSelection(sketchProfile, sketchSelection);
    if (!copied) {
      setNotice(t("status.selectSketchGeometry"));
      return;
    }
    // A locked image refuses to be deleted; cutting it would only copy it.
    if (copied.images.some((image) => image.locked)) {
      setNotice(t("status.unlockImageDelete"));
      return;
    }
    setSketchClipboard(copied);
    deleteSelectedSketchEntity();
    setNotice(t("status.sketchCut"));
  }, [deleteSelectedSketchEntity, sketchProfile, sketchSelection]);

  const insertSketchCopy = useCallback((source: SketchClipboard, message: string) => {
    const { width, depth } = workspaceSettingsRef.current;
    const plate = { minX: -width / 2, maxX: width / 2, minZ: -depth / 2, maxZ: depth / 2 };
    const offset = freeSketchPasteOffset(sketchProfile, source, plate);
    const pasted = pasteSketchClipboard(sketchProfile, source, offset, createLocalId);
    commitSketchProfile(pasted.profile, message);
    setSketchActivePointId(null);
    setSketchSelection({ kind: "multiple", pointIds: pasted.pointIds, segmentIds: pasted.segmentIds, imageIds: pasted.imageIds });
  }, [commitSketchProfile, sketchProfile]);

  const pasteSketchSelection = useCallback(() => {
    if (!sketchClipboard) {
      setNotice(t("status.sketchClipboardEmpty"));
      return;
    }
    insertSketchCopy(sketchClipboard, t("status.sketchPasted"));
  }, [insertSketchCopy, sketchClipboard]);

  // Like the 3D editor's duplicate, but moved clear of the original: a copy on
  // top of it would be invisible and welded to it where their lines cross.
  const duplicateSketchSelection = useCallback(() => {
    const copied = copySketchSelection(sketchProfile, sketchSelection);
    if (!copied) {
      setNotice(t("status.selectSketchGeometry"));
      return;
    }
    insertSketchCopy(copied, t("status.sketchDuplicated"));
  }, [insertSketchCopy, sketchProfile, sketchSelection]);

  // Mirror (#512): copies the selection to the other side of an axis; the originals stay.
  const mirrorSketchSelectionAction = useCallback((across: "vertical" | "horizontal" | { segmentId: string }) => {
    const axis = across === "vertical" ? SKETCH_MIRROR_VERTICAL : across === "horizontal" ? SKETCH_MIRROR_HORIZONTAL : sketchMirrorAxisThroughSegment(sketchProfile, across.segmentId);
    if (!axis) {
      setNotice(t("status.sketchMirrorNoAxis"));
      return;
    }
    const mirrored = mirrorSketchSelection(sketchProfile, sketchSelection, axis, createLocalId);
    if (!mirrored) {
      setNotice(t("status.sketchMirrorNothing"));
      return;
    }
    commitSketchProfile(mirrored.profile, t("status.sketchMirrored"));
    setSketchActivePointId(null);
    setSketchSelection({ kind: "multiple", pointIds: mirrored.pointIds, segmentIds: mirrored.segmentIds });
  }, [commitSketchProfile, sketchProfile, sketchSelection]);

  const moveSketchPoint = useCallback((id: string, position: { x: number; z: number }) => {
    const current = sketchProfile.points.find((point) => point.id === id);
    if (!current) return;
    const deltaX = position.x - current.x;
    const deltaZ = position.z - current.z;
    const next = {
      ...sketchProfile,
      points: sketchProfile.points.map((point) => point.id === id ? {
        ...point,
        ...position,
        handleIn: point.handleIn ? { x: point.handleIn.x + deltaX, z: point.handleIn.z + deltaZ } : undefined,
        handleOut: point.handleOut ? { x: point.handleOut.x + deltaX, z: point.handleOut.z + deltaZ } : undefined,
      } : point),
    };
    // An open end dropped on another open end becomes one point with it, so a gap closes (#698).
    commitSketchProfile(joinOpenEnds(next, id) ?? next, t("status.sketchPointMoved"));
  }, [commitSketchProfile, sketchProfile]);

  const transformSketchPoints = useCallback((points: SketchPoint[], message = "Sketch geometry transformed", keyRunKey?: string) => {
    if (!points.length) return;
    const byId = new Map(points.map((point) => [point.id, point]));
    commitSketchProfile({
      ...sketchProfile,
      points: sketchProfile.points.map((point) => byId.get(point.id) ?? point),
    }, message, keyRunKey);
  }, [commitSketchProfile, sketchProfile]);

  const rotateSelectedClosedSketch45 = useCallback(() => {
    if (sketchSelection?.kind !== "multiple") {
      setNotice(t("status.selectClosedSketch"));
      return;
    }
    const selectedPoints = selectedClosedSketchPoints(sketchProfile, sketchSelection);
    if (!selectedPoints) {
      setNotice(t("status.rotationClosedOnly"));
      return;
    }
    transformSketchPoints(rotateSketchPoints(selectedPoints), "Rotated closed sketch selection by 45°");
  }, [sketchProfile, sketchSelection, transformSketchPoints]);

  const moveSketchHandle = useCallback((id: string, handle: "in" | "out", position: { x: number; z: number }, keyRunKey?: string) => {
    const next = cloneSketchProfile(sketchProfile);
    const point = next.points.find((entry) => entry.id === id);
    if (!point) return;
    if (handle === "in") point.handleIn = { ...position };
    else point.handleOut = { ...position };
    if (point.mode === "smooth") {
      const opposite = { x: point.x * 2 - position.x, z: point.z * 2 - position.z };
      if (handle === "in") point.handleOut = opposite;
      else point.handleIn = opposite;
    }
    commitSketchProfile(next, t("status.sketchHandleAdjusted"), keyRunKey);
  }, [commitSketchProfile, sketchProfile]);

  const setSketchPointMode = useCallback((id: string, mode: "corner" | "smooth" | "split") => {
    let next = cloneSketchProfile(sketchProfile);
    const point = next.points.find((entry) => entry.id === id);
    if (!point) return;
    point.mode = mode;
    if (mode === "corner") {
      point.handleIn = undefined;
      point.handleOut = undefined;
      next.segments = next.segments.map((segment) => segment.startId === id || segment.endId === id ? { ...segment, kind: "line" } : segment);
    } else {
      next.segments = next.segments.map((segment) => segment.startId === id || segment.endId === id ? { ...segment, kind: "bezier" } : segment);
      // The point's own handles along its neighbours; the segments around it then need the handle at
      // their other end too, or they would stay straight.
      if (!point.handleIn || !point.handleOut) next = withSmoothSketchHandles(next, new Set([id]));
      next = withSegmentHandles(next, new Set(next.segments.filter((segment) => segment.startId === id || segment.endId === id).map((segment) => segment.id)));
      const updated = next.points.find((entry) => entry.id === id);
      if (updated) updated.mode = mode;
    }
    commitSketchProfile(next, mode === "corner" ? t("status.sketchMadeCorner") : mode === "smooth" ? t("status.sketchMadeSmooth") : t("status.sketchHandlesSplit"));
  }, [commitSketchProfile, sketchProfile]);

  const curveSketchSegmentAction = useCallback((id: string) => {
    const next = curveSketchSegment(sketchProfile, id);
    if (next) commitSketchProfile(next, t("status.sketchLineCurved"));
  }, [commitSketchProfile, sketchProfile]);

  /** Curves every selected straight line at once, one undo step (#283). */
  const curveSketchSegmentsAction = useCallback((ids: string[]) => {
    let next = sketchProfile;
    let count = 0;
    for (const id of ids) {
      const segment = next.segments.find((entry) => entry.id === id);
      if (!segment || isSegmentCurved(next, segment)) continue;
      const curved = curveSketchSegment(next, id);
      if (curved) {
        next = curved;
        count += 1;
      }
    }
    if (count > 0) commitSketchProfile(next, count === 1 ? t("status.sketchLineCurved") : t("status.sketchLinesCurved", { count }));
  }, [commitSketchProfile, sketchProfile]);

  /** Makes every selected curved line straight again at once (#283). */
  const straightenSketchSegmentsAction = useCallback((ids: string[]) => {
    let next = sketchProfile;
    let count = 0;
    for (const id of ids) {
      const straightened = straightenSketchSegment(next, id);
      if (straightened) {
        next = straightened;
        count += 1;
      }
    }
    if (count > 0) commitSketchProfile(next, count === 1 ? t("status.sketchLineStraightened") : t("status.sketchLinesStraightened", { count }));
  }, [commitSketchProfile, sketchProfile]);

  const straightenSketchSegmentAction = useCallback((id: string) => {
    const next = straightenSketchSegment(sketchProfile, id);
    if (next) commitSketchProfile(next, t("status.sketchLineStraightened"));
  }, [commitSketchProfile, sketchProfile]);

  const setSketchSegmentConstruction = useCallback((id: string, construction: boolean) => {
    commitSketchProfile(withSegmentsConstruction(sketchProfile, new Set([id]), construction), t(construction ? "status.sketchMadeConstruction" : "status.sketchMadeSolid"));
  }, [commitSketchProfile, sketchProfile]);

  const toggleSketchFromMiddle = useCallback(() => {
    const next = !sketchFromMiddle;
    setSketchFromMiddle(next);
    if (next && sketchTool !== "line") setActiveSketchTool("line");
    else setSketchActivePointId(null);
    setNotice(t(next ? "status.sketchFromMiddleOn" : "status.sketchFromMiddleOff"));
  }, [setActiveSketchTool, sketchFromMiddle, sketchTool]);

  const toggleSketchConstruction = useCallback(() => {
    const next = !sketchConstruction;
    setSketchConstruction(next);
    if (next && !["line", "bezier", "smooth"].includes(sketchTool)) setActiveSketchTool("line");
    setNotice(t(next ? "status.sketchConstructionOn" : "status.sketchConstructionOff"));
  }, [setActiveSketchTool, sketchConstruction, sketchTool]);

  const insertSketchPoint = useCallback((segmentId: string, _position: { x: number; z: number }, amount: number) => {
    const result = splitSketchSegment(sketchProfile, segmentId, amount, createLocalId);
    if (!result.pointId) return;
    if (result.inserted) commitSketchProfile(result.profile, t("status.sketchPointInserted"));
    setSketchSelection({ kind: "point", id: result.pointId });
    setSketchTool("select");
  }, [commitSketchProfile, sketchProfile]);

  /** Rounds or chamfers one corner or several at once; the number of corners goes into the message. */
  const applySketchCornersHandler = useCallback((kind: "fillet" | "chamfer", ids: string[], size: number) => {
    const result = applySketchCorners(sketchProfile, ids, kind, size, createLocalId);
    if (!result) return;
    const one = result.applied === 1 && result.skipped === 0;
    const base = one
      ? t(kind === "fillet" ? "sketch.filletApplied" : "sketch.chamferApplied")
      : t(kind === "fillet" ? "sketch.filletAppliedMany" : "sketch.chamferAppliedMany", { count: result.applied });
    commitSketchProfile(result.profile, result.skipped > 0 && !one ? `${base} ${t("sketch.cornersSkipped", { count: result.skipped })}` : base);
    setSketchSelection(null);
  }, [commitSketchProfile, sketchProfile]);
  const applySketchFilletHandler = useCallback((ids: string[], radius: number) => applySketchCornersHandler("fillet", ids, radius), [applySketchCornersHandler]);
  const applySketchChamferHandler = useCallback((ids: string[], distance: number) => applySketchCornersHandler("chamfer", ids, distance), [applySketchCornersHandler]);

  useEffect(() => {
    if (!sketchActive || !sketchProfile.stroke) {
      setSketchStrokePreview(null);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void getManifoldRuntime().then((runtime) => {
        if (cancelled) return;
        const stroked = strokedSketchProfile(runtime, sketchProfile.silhouette ? silhouetteSketchProfile(sketchProfile) : sketchProfile, { clipToRevolveSide: sketchOperation === "revolve" });
        if (!stroked) {
          setSketchStrokePreview(null);
          return;
        }
        const byId = new Map(stroked.points.map((point) => [point.id, point]));
        const loops = new Map<string, string[]>();
        stroked.segments.forEach((segment) => {
          const loop = segment.id.replace(/-s\d+$/, "");
          const point = byId.get(segment.startId);
          if (point) loops.set(loop, [...(loops.get(loop) ?? []), `${point.x} ${point.z}`]);
        });
        setSketchStrokePreview([...loops.values()].map((loop) => `M ${loop.join(" L ")} Z`).join(" "));
      }).catch(() => setSketchStrokePreview(null));
    }, 120);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [sketchActive, sketchOperation, sketchProfile]);

  const finishSketch = useCallback(async () => {
    const edited = editingSketchShapeId ? shapes.find((shape) => shape.id === editingSketchShapeId) ?? null : null;
    // Switched to another kind of body (#655): a new body of that kind takes the edited one's place.
    const switchedBody = edited && sketchOperationSwitchRef.current ? edited : null;
    const existing = switchedBody ? null : edited;
    const height = existing?.height ?? 10;
    let resolved: WorkplaneShape | null;
    try {
      if (switchedBody) {
        setNotice(t("status.buildingSketch"), true);
        resolved = await sketchBodyAsOperation(switchedBody, sketchProfile, sketchOperation, sketchRevolveSettings);
      } else if (sketchOperation === "revolve") {
        setNotice(t("status.buildingSketch"), true);
        const revolved = await shapeFromRevolvedSketchProfile(sketchProfile, sketchRevolveSettings, existing);
        resolved = placeSketchShape(revolved, activeSketchWorkplane, existing);
        if (!existing && resolved && placementWorkplaneIsBase(activeSketchWorkplane)) {
          // The body stands where the profile was drawn (#525): its foot at the height of the lowest point of the profile,
          // the line through the origin being the ground. A profile above it makes a body that stands on whatever is there.
          const runtime = await getManifoldRuntime();
          const outline = sketchOutlineBounds(revolveBuildProfile(runtime, sketchProfile));
          if (outline) resolved = canonicalizeShape({ ...resolved, elevation: (resolved.elevation ?? 0) - outline.maxZ });
        }
        if (existing?.sketchProfile && resolved) {
          // The rebuilt body is centred on its outline again: keep its axis where it was.
          const base = existing.importedMesh;
          const runtime = await getManifoldRuntime();
          const shift = revolveAxisShift(
            existing,
            { profile: revolveBuildProfile(runtime, existing.sketchProfile), settings: existing.sketchRevolve ?? {} },
            { profile: revolveBuildProfile(runtime, sketchProfile), settings: sketchRevolveSettings },
            base ? existing.width / Math.max(0.001, base.baseWidth) : 1,
            base ? existing.depth / Math.max(0.001, base.baseDepth) : 1,
            1,
            1,
          );
          resolved = canonicalizeShape({ ...resolved, x: resolved.x + shift.x, z: resolved.z + shift.z, elevation: (resolved.elevation ?? 0) + shift.y });
        }
      } else {
        setNotice(t("status.buildingSketch"), true);
        // A sweep is built like an extrusion, from the outlines along the construction line (#400).
        const extrusion = sketchOperation === "sweep"
          ? await cadShapeFromSketchSweep(sketchProfile, existing)
          : await cadShapeFromSketchProfile(sketchProfile, height, existing);
        resolved = placeSketchShape(extrusion, activeSketchWorkplane, existing);
        if (existing && resolved) {
          // Put the body where its outline is: it is centred on the new outline, and the edit may have moved that middle.
          const quaternion = quaternionForShape(existing);
          const xAxis = new THREE.Vector3(1, 0, 0).applyQuaternion(quaternion);
          const zAxis = new THREE.Vector3(0, 0, 1).applyQuaternion(quaternion);
          resolved = movedWithEditedOutline(
            resolved,
            existing,
            sketchEditAnchorRef.current ?? sketchBodyAnchor(existing),
            { x: extrusion.x, z: extrusion.z },
            { x: [xAxis.x, xAxis.y, xAxis.z], z: [zAxis.x, zAxis.y, zAxis.z] },
          );
        }
      }
    } catch (error) {
      setNotice(error instanceof Error ? localizedError(error.message) : t(sketchOperation === "revolve" ? "status.sketchCannotRevolve" : sketchOperation === "sweep" ? "status.sketchCannotSweep" : "status.sketchCannotExtrude"));
      return;
    }
    if (!resolved) {
      setNotice(t("status.closeProfile"), true);
      return;
    }
    const nextShapes = edited ? shapes.map((shape) => (shape.id === edited.id ? resolved : shape)) : [...shapes, resolved];
    commitShapes(
      nextShapes,
      resolved.id,
      edited
        ? t(sketchOperation === "revolve" ? "status.revolveUpdated" : sketchOperation === "sweep" ? "status.sweepUpdated" : "status.sketchUpdated")
        : sketchOperation === "revolve"
          ? t("status.revolveCreated")
          : sketchOperation === "sweep"
            ? t("status.sweepCreated")
            : t("status.exactSketchCreated"),
    );
    setSketchActive(false);
    setSketchStrokePanelOpen(false);
    setSketchRevolvePreview(null);
    setEditingSketchShapeId(null);
    sketchEditAnchorRef.current = null;
    sketchOperationSwitchRef.current = null;
    setToolbarMode("geometry");
  }, [activeSketchWorkplane, commitShapes, editingSketchShapeId, shapes, sketchOperation, sketchProfile, sketchRevolveSettings]);

  useEffect(() => {
    if (!projectId) {
      lastProjectIdRef.current = null;
      lastProjectShapesSyncRef.current = "";
      lastProjectShapesEchoRef.current = null;
      return;
    }
    if (projectInteractionActiveRef.current) {
      return;
    }
    const projectChanged = lastProjectIdRef.current !== projectId;
    if (projectChanged) {
      lastProjectIdRef.current = projectId;
      openGroupHistoryRef.current.clear();
      lastProjectShapesSyncRef.current = "";
      lastProjectShapesEchoRef.current = null;
      const nextAssets = dedupeProjectAssets(initialAssets);
      projectAssetsRef.current = nextAssets;
      setProjectAssets(nextAssets);
      const nextPlacementElevation = Number.isFinite(initialPlacementElevation) ? initialPlacementElevation : 0;
      setPlacementElevation(nextPlacementElevation);
      setPlacementWorkplane(normalizePlacementWorkplane(initialPlacementWorkplane, nextPlacementElevation));
    }
    const incoming = initialShapes.map(canonicalizeShape);
    const incomingSerialized = projectShapesFingerprint(incoming);
    // The parent echoes shapes after a local save; rehydrating that echo can reset active transform state.
    if (!projectChanged && lastProjectShapesEchoRef.current !== null && incomingSerialized === lastProjectShapesEchoRef.current) {
      lastProjectShapesSyncRef.current = incomingSerialized;
      return;
    }
    lastProjectShapesSyncRef.current = incomingSerialized;
    if (projectSyncTimerRef.current !== null) {
      window.clearTimeout(projectSyncTimerRef.current);
      projectSyncTimerRef.current = null;
    }
    // The current shapes, not the ones this effect last saw: it leaves `shapes` out on purpose.
    if (!projectChanged && incomingSerialized === projectShapesFingerprint(shapesRef.current)) {
      return;
    }
    const incomingNotes = notesForHistoryIndex(initialHistory, initialHistoryIndex);
    const hydratedHistory = hydrateEditorHistoryState(
      incoming,
      initialHistory,
      initialHistoryIndex,
      normalizeWorkspaceSettings(initialWorkspace).historyLimit,
      incomingNotes,
    );
    projectHydratingRef.current = true;
    shapesRef.current = incoming;
    selectedIdsRef.current = [];
    notesRef.current = incomingNotes;
    historyRef.current = hydratedHistory.entries;
    historyIndexRef.current = hydratedHistory.index;
    setShapes(incoming);
    setNotes(incomingNotes);
    setSelectedIds([]);
    setHistory(hydratedHistory.entries);
    setHistoryIndex(hydratedHistory.index);
    // Was aus der Datei kam, ist der Stand, der auch auf dem Server liegt.
    serverSavedFingerprintRef.current = { projectId: projectId ?? null, fingerprint: projectSceneFingerprint(incoming, incomingNotes) };
    // Ein geoeffneter Entwurf ist keine Meldung wert: Dass er da ist, sieht man.
    setNotice("");
    // Anders, was man nicht sieht: A design that is opened with hidden shapes says so once, with a button to show them (#489).
    // After a reload the shapes arrive a moment after the design is chosen, so it is the first batch of
    // shapes of a design that counts, not the change of design.
    if (projectId && incoming.length > 0 && hiddenNoticedProjectRef.current !== projectId) {
      hiddenNoticedProjectRef.current = projectId;
      // Said a moment later (below): a language that settles after a reload clears every standing message.
      if (incoming.some((shape) => shape.hidden)) hiddenNoticePendingRef.current = true;
    }
  }, [initialAssets, initialHistory, initialHistoryIndex, initialPlacementElevation, initialPlacementWorkplane, initialShapes, projectId, projectRevision]);

  // A design opened with hidden shapes says so once, with a button to show them (#489). Only once the
  // language and the shapes have settled, or the message would be wiped as out of date.
  useEffect(() => {
    if (!hiddenNoticePendingRef.current) return;
    const timer = window.setTimeout(() => {
      hiddenNoticePendingRef.current = false;
      const hidden = shapesRef.current.filter((shape) => shape.hidden).length;
      if (hidden === 0) return;
      setNotice(
        hidden === 1 ? t("status.hiddenOnOpenOne") : t("status.hiddenOnOpenMany", { count: hidden }),
        true,
        { label: t("status.hiddenOnOpenShow"), run: () => showHiddenRef.current() },
      );
    }, 900);
    return () => window.clearTimeout(timer);
  }, [editorLanguage, projectId, setNotice, shapes]);

  useEffect(() => {
    if (!projectId || !onProjectShapesChange) {
      return;
    }
    if (projectHydratingRef.current) {
      projectHydratingRef.current = false;
      return;
    }
    syncProjectShapes(shapes);
  }, [onProjectShapesChange, projectId, shapes, syncProjectShapes]);

  useEffect(() => {
    return () => {
      if (projectSyncTimerRef.current !== null) {
        window.clearTimeout(projectSyncTimerRef.current);
      }
      if (heldProjectSyncTimerRef.current !== null) {
        window.clearTimeout(heldProjectSyncTimerRef.current);
      }
      if (interactionHistoryTimerRef.current !== null) {
        window.clearTimeout(interactionHistoryTimerRef.current);
      }
      sketchRevolveUpdateTimerRef.current.forEach((timer) => window.clearTimeout(timer));
      sketchRevolveUpdateTimerRef.current.clear();
    };
  }, []);

  const addShape = useCallback(
    (asset: ShapeAsset, point?: PlacementPoint, onFace?: PlacementWorkplane) => {
      setCruiseAsset(null);
      if (asset.id === iconTagAsset.id) {
        setQrCodePanelOpen(false);
        setIconTagPanelOpen(true);
        return;
      }
      if (asset.id === qrCodeAsset.id) {
        setIconTagPanelOpen(false);
        setQrCodePanelOpen(true);
        return;
      }
      const shape = makeShapeFromAsset(asset, undefined, workspaceSettingsRef.current.shapeCustomizations[asset.kind]);
      // Dropped on a body's face, the shape lies on that face; otherwise on the current workplane.
      const workplane = onFace ?? placementWorkplane;
      const nextShape = prepareNewShape(asset, {
        ...shape,
        ...placementPatchForNewShape(shape, workplane, point ?? workplane.origin),
      });
      commitShapes([...shapes, nextShape], nextShape.id, t("status.shapeAdded", { name: shapeAssetLabel(asset) }));
    },
    [commitShapes, placementWorkplane, shapes],
  );

  /** Sets the parts picked up with C down on the face (or the workplane) that was clicked, as one step. */
  const dropCarried = useCallback((target: { point: PlacementPoint; normal: PlacementPoint; workplane: PlacementWorkplane }) => {
    const ids = carryIdsRef.current;
    setCarryIds(null);
    if (!ids?.length) return;
    const patches = carriedOntoFace(shapes, ids, target, ids[0]);
    const next = shapes.map((shape) => {
      const patch = patches.get(shape.id);
      return patch ? canonicalizeShape({ ...shape, ...patch }) : shape;
    });
    commitShapes(next, ids, t("status.carryPlaced", { count: ids.length }));
  }, [commitShapes, shapes]);

  /*
   * The fill of an extruded sketch body changed from outside sketch mode - area, a line round it
   * or the silhouette (#197): the body is built again from its sketch, where it stands, at the
   * size it has. Edge treatments go, as when the sketch is edited.
   */
  const sketchFillUpdateRequestRef = useRef(new Map<string, number>());
  const sketchFillUpdateTimerRef = useRef(new Map<string, number>());
  const rebuildSketchBodyFill = useCallback(async (id: string, profile: SketchProfile) => {
    const current = shapesRef.current.find((shape) => shape.id === id);
    if (!current?.sketchProfile || current.sketchOperation === "revolve" || current.sketchOperation === "sweep") throw new Error(t("status.selectSketchShape"));
    const stretch = sketchBodyStretch(current);
    const source = stretch ? stretchedSketchProfile(profile, stretch.x, stretch.z) : profile;
    const extrusion = await cadShapeFromSketchProfile(source, current.height, current);
    return placeSketchShape(extrusion, placementWorkplaneRef.current, current);
  }, []);
  const scheduleSketchFillUpdate = useCallback((id: string, profile: SketchProfile) => {
    const previousTimer = sketchFillUpdateTimerRef.current.get(id);
    if (previousTimer !== undefined) window.clearTimeout(previousTimer);
    const requestId = (sketchFillUpdateRequestRef.current.get(id) ?? 0) + 1;
    sketchFillUpdateRequestRef.current.set(id, requestId);
    const timer = window.setTimeout(() => {
      sketchFillUpdateTimerRef.current.delete(id);
      setNotice(t("status.buildingSketch"), true);
      void rebuildSketchBodyFill(id, profile)
        .then((rebuilt) => {
          if (sketchFillUpdateRequestRef.current.get(id) !== requestId) return;
          commitShapes(shapesRef.current.map((shape) => shape.id === id ? rebuilt : shape), selectedIdsRef.current, t("status.sketchUpdated"));
        })
        .catch((error) => {
          if (sketchFillUpdateRequestRef.current.get(id) === requestId) {
            setNotice(error instanceof Error ? localizedError(error.message) : t("status.sketchCannotExtrude"), true);
          }
        });
    }, 250);
    sketchFillUpdateTimerRef.current.set(id, timer);
  }, [commitShapes, rebuildSketchBodyFill]);

  const scheduleRevolveShapeUpdate = useCallback((id: string, settings: SketchRevolveSettings) => {
    const previousTimer = sketchRevolveUpdateTimerRef.current.get(id);
    if (previousTimer !== undefined) window.clearTimeout(previousTimer);
    const requestId = (sketchRevolveUpdateRequestRef.current.get(id) ?? 0) + 1;
    sketchRevolveUpdateRequestRef.current.set(id, requestId);
    const timer = window.setTimeout(() => {
      sketchRevolveUpdateTimerRef.current.delete(id);
      const source = shapesRef.current.find((shape) => shape.id === id);
      if (!source?.sketchProfile || source.sketchOperation !== "revolve") return;
      setNotice(t("status.updatingRevolve"), true);
      void shapeFromRevolvedSketchProfile(source.sketchProfile, settings, source)
        .then(async (generated) => {
          if (sketchRevolveUpdateRequestRef.current.get(id) !== requestId) return;
          const current = shapesRef.current.find((shape) => shape.id === id);
          if (!current?.importedMesh || current.sketchOperation !== "revolve") return;
          const widthScale = current.width / Math.max(0.001, current.importedMesh.baseWidth);
          const depthScale = current.depth / Math.max(0.001, current.importedMesh.baseDepth);
          const heightScale = current.height / Math.max(0.001, current.importedMesh.baseHeight);
          const width = generated.width * widthScale;
          const depth = generated.depth * depthScale;
          const height = generated.height * heightScale;
          // The body is centred on its outline, which moves with the sweep: carry its middle so the axis stays put.
          const runtime = await getManifoldRuntime();
          if (sketchRevolveUpdateRequestRef.current.get(id) !== requestId) return;
          const turned = revolveBuildProfile(runtime, source.sketchProfile!);
          const shift = revolveAxisShift(
            current,
            { profile: turned, settings: current.sketchRevolve ?? {} },
            { profile: turned, settings },
            widthScale,
            depthScale,
          );
          const updated = canonicalizeShape({
            ...generated,
            id: current.id,
            name: current.name,
            color: current.color,
            hole: current.hole,
            x: current.x + shift.x,
            z: current.z + shift.z,
            elevation: (current.elevation ?? 0) + shift.y,
            width,
            depth,
            height,
            size: Math.max(width, depth),
            rotation: current.rotation,
            rotationX: current.rotationX,
            rotationZ: current.rotationZ,
            mirrorX: current.mirrorX,
            mirrorY: current.mirrorY,
            mirrorZ: current.mirrorZ,
            locked: current.locked,
            hidden: current.hidden,
            sketchRevolve: settings,
          });
          commitShapes(shapesRef.current.map((shape) => shape.id === id ? updated : shape), selectedIdsRef.current, t("status.revolveUpdated"));
        })
        .catch((error) => {
          if (sketchRevolveUpdateRequestRef.current.get(id) === requestId) {
            setNotice(error instanceof Error ? localizedError(error.message) : t("status.revolveSettingsFailed"));
          }
        });
    }, 120);
    sketchRevolveUpdateTimerRef.current.set(id, timer);
  }, [commitShapes]);

  const updateShape = useCallback(
    (id: string, patch: ShapeUpdatePatch) => {
      // A locked shape takes only locking, hiding and its name - or a change that unlocks it too.
      const lockedTarget = shapesRef.current.find((shape) => shape.id === id)?.locked;
      if (lockedTarget && patch.locked !== false && Object.keys(patch).some((key) => !LOCKED_SHAPE_PATCH_KEYS.has(key))) {
        setNotice(t("status.objectLocked"));
        return;
      }
      const bakeTransform = Boolean(patch.bakeTransform);
      const cleanedPatch = cleanShapePatch(patch);
      if (cleanedPatch.sketchRevolve) {
        const source = shapesRef.current.find((shape) => shape.id === id);
        if (source?.sketchOperation === "revolve" && source.sketchProfile) {
          scheduleRevolveShapeUpdate(id, normalizeSketchRevolveSettings(cleanedPatch.sketchRevolve));
          return;
        }
      }
      if (cleanedPatch.sketchProfile) {
        // Only the fill comes in this way (#197); the body is built again from its sketch.
        const source = shapesRef.current.find((shape) => shape.id === id);
        if (source?.sketchProfile && source.sketchOperation !== "revolve" && source.sketchOperation !== "sweep") {
          scheduleSketchFillUpdate(id, cleanedPatch.sketchProfile);
          return;
        }
      }
      const applyPatch = (current: WorkplaneShape[]) => {
        let changed = false;
        const next = current.map((shape) => {
          if (shape.id !== id) {
            return shape;
          }

          const canonical = shapeWithInspectorPatch(shape, cleanedPatch, bakeTransform);
          if (workplaneShapesEqual(shape, canonical)) {
            return shape;
          }
          changed = true;
          return canonical;
        });
        return { changed, next };
      };

      if (projectInteractionActiveRef.current) {
        setShapes((current) => {
          const { changed, next } = applyPatch(current);
          if (!changed) {
            return current;
          }
          interactionHistoryChangedRef.current = true;
          shapesRef.current = next;
          return next;
        });
        return;
      }

      const { changed, next } = applyPatch(shapes);
      if (changed) {
        commitShapes(next, selectedIds);
      }
    },
    [commitShapes, scheduleRevolveShapeUpdate, scheduleSketchFillUpdate, selectedIds, setNotice, shapes],
  );
  writeOwnPivotRef.current = (shapeId, value) => updateShape(shapeId, { rotationPivot: value });

  /** Changes to several shapes in one undo step, from the panel of a selection - "Fit module" for two gears (#645). */
  const updateShapesTogether = useCallback(
    (changes: readonly { id: string; patch: ShapeUpdatePatch }[], message?: string) => {
      if (refuseLockedSelection()) return;
      const byId = new Map(changes.map((change) => [change.id, cleanShapePatch(change.patch)]));
      const next = shapes.map((shape) => {
        const patch = byId.get(shape.id);
        if (!patch) return shape;
        const canonical = shapeWithInspectorPatch(shape, patch);
        return workplaneShapesEqual(shape, canonical) ? shape : canonical;
      });
      if (next.some((shape, index) => shape !== shapes[index])) commitShapes(next, selectedIds, message);
    },
    [commitShapes, refuseLockedSelection, selectedIds, shapes],
  );

  const deleteSelected = useCallback(() => {
    if (!hasSelection) {
      setNotice(t("status.selectShapeFirst"));
      return;
    }
    if (refuseLockedSelection()) return;
    const selected = new Set(selectedIds);
    commitShapes(
      shapes.filter((shape) => !selected.has(shape.id)),
      [],
      selected.size === 1 ? t("status.deletedOne") : t("status.deletedMany", { count: selected.size }),
    );
  }, [refuseLockedSelection, commitShapes, hasSelection, selectedIds, shapes]);

  /*
   * darkwingbreydins Forenwunsch: wie in similar tools soll ein Duplizieren nach
   * dem Verschieben eines vorigen Duplikats denselben Versatz wiederholen, so
   * dass wiederholtes Duplizieren allein eine Lochreihe ergibt. Das Ziel ist
   * eine reine Sitzungserinnerung, kein Projektfeld: sie haengt an der
   * zuletzt erzeugten Kopie (`chainId`) und ihrem Stand bei der Entstehung
   * (`baseline`), damit sich der tatsaechlich seither zurueckgelegte Versatz
   * im Moment des naechsten Duplizierens berechnen laesst - ohne jeden
   * Zug-/Dreh-Commit einzeln mitschneiden zu muessen. Bewegt sich die
   * ausgewaehlte Kopie seit ihrer Entstehung nicht, wird der zuletzt
   * angewandte Versatz erneut benutzt, statt auf Null zurueckzufallen -
   * genau das erlaubt das blosse wiederholte Druecken.
   */
  const smartDuplicateRef = useRef<{ chainId: string; baseline: ShapeTransformSnapshot; delta: ShapeMoveDelta } | null>(null);

  const duplicateSelected = useCallback(() => {
    if (!hasSelection) {
      setNotice(t("status.selectShapeFirst"));
      return;
    }
    if (selectedShapes.length === 1) {
      const shape = selectedShapes[0];
      const chain = smartDuplicateRef.current;
      const continuing = chain?.chainId === shape.id;
      const movedSinceCreation = continuing ? shapeMoveDeltaBetween(chain.baseline, shapeTransformSnapshot(shape)) : ZERO_MOVE_DELTA;
      const delta = continuing && isZeroMoveDelta(movedSinceCreation) ? chain.delta : movedSinceCreation;
      const duplicate = applyShapeMoveDelta(cloneWorkplaneShapeTreeWithFreshIds(shape, "copy"), delta);
      commitShapes([...shapes, duplicate], [duplicate.id], t("status.duplicatedOne"));
      smartDuplicateRef.current = { chainId: duplicate.id, baseline: shapeTransformSnapshot(duplicate), delta };
      return;
    }
    smartDuplicateRef.current = null;
    const duplicates = selectedShapes.map((shape) => cloneWorkplaneShapeTreeWithFreshIds(shape, "copy"));
    commitShapes([...shapes, ...duplicates], duplicates.map((shape) => shape.id), t("status.duplicatedMany", { count: duplicates.length }));
  }, [commitShapes, hasSelection, selectedShapes, shapes]);

  /** Scales the selection by a percentage (#179); the same code the MCP action uses. */
  const scaleSelectionByPercent = useCallback((ids: readonly string[], percent: number, mode: ScalePercentSettings["mode"]) => {
    const targets = shapesRef.current.filter((shape) => ids.includes(shape.id) && !shape.locked);
    if (targets.length === 0) return { ok: false as const, message: t("status.selectShapeFirst") };
    const result = scaleShapesByPercent(targets, percent, mode, (shape) => shapeDimensionLimit(workspaceSettingsRef.current, shape.kind, 1000));
    if (!result.ok) {
      const message = result.reason === "percent"
        ? t("scalePercent.errorPercent")
        : t(result.reason === "tooSmall" ? "scalePercent.errorTooSmall" : "scalePercent.errorTooLarge", { name: result.name ?? "" });
      return { ok: false as const, message };
    }
    const byId = new Map(result.patches.map((entry) => [entry.id, entry.patch]));
    const next = shapesRef.current.map((shape) => {
      const patch = byId.get(shape.id);
      return patch ? canonicalizeShape({ ...shape, ...patch }) : shape;
    });
    const skipped = ids.length - targets.length;
    commitShapes(next, selectedIdsRef.current, t(skipped > 0 ? "status.scaledByPercentSkipped" : "status.scaledByPercent", { percent: Math.round(percent * 10) / 10, count: targets.length, skipped }));
    return { ok: true as const, count: targets.length, skipped };
  }, [commitShapes]);

  const toggleScalePercentTool = useCallback(() => {
    if (scalePercentTool) {
      setScalePercentTool(null);
      setScalePercentError(null);
      return;
    }
    if (selectedShapes.length === 0) {
      setNotice(t("status.selectShapeFirst"));
      return;
    }
    if (refuseLockedSelection()) return;
    setArrayTool(null);
    setScalePercentError(null);
    setScalePercentTool({ percent: 100, mode: "together" });
  }, [refuseLockedSelection, scalePercentTool, selectedShapes.length]);

  const applyScalePercentTool = useCallback(() => {
    if (!scalePercentTool) return;
    const result = scaleSelectionByPercent(selectedIdsRef.current, scalePercentTool.percent, scalePercentTool.mode);
    if (!result.ok) {
      setScalePercentError(result.message);
      return;
    }
    setScalePercentTool(null);
    setScalePercentError(null);
  }, [scalePercentTool, scaleSelectionByPercent]);

  const applyArrayTool = useCallback(() => {
    if (!arrayTool || selectedShapes.length === 0) return;
    const copies = arrayCopies(selectedShapes, arrayTool);
    setArrayTool(null);
    commitShapes([...shapes, ...copies], [...selectedIds, ...copies.map((shape) => shape.id)], t("status.arrayCreated", { count: copies.length }));
  }, [arrayTool, commitShapes, selectedIds, selectedShapes, shapes]);

  const duplicateShapeAt = useCallback((id: string, position: { x: number; z: number }) => {
    const shape = shapesRef.current.find((entry) => entry.id === id);
    if (!shape) return;
    const duplicate = { ...cloneWorkplaneShapeTreeWithFreshIds(shape, "copy"), x: position.x, z: position.z };
    commitShapes([...shapesRef.current, duplicate], [duplicate.id], t("status.duplicatedOne"));
  }, [commitShapes]);

  /** Alt-drag: copies of the dragged shapes at the place they were dropped, selected like the drag was. */
  const duplicateShapesMoved = useCallback((ids: string[], delta: { dx: number; dz: number; delevation: number }) => {
    const duplicates = ids.flatMap((id) => {
      const shape = shapesRef.current.find((entry) => entry.id === id);
      return shape ? [applyShapeMoveDelta(cloneWorkplaneShapeTreeWithFreshIds(shape, "copy"), { ...ZERO_MOVE_DELTA, ...delta })] : [];
    });
    if (duplicates.length === 0) return;
    smartDuplicateRef.current = null;
    commitShapes(
      [...shapesRef.current, ...duplicates],
      duplicates.map((shape) => shape.id),
      duplicates.length === 1 ? t("status.duplicatedOne") : t("status.duplicatedMany", { count: duplicates.length }),
    );
  }, [commitShapes]);

  const copySelected = useCallback(() => {
    if (!hasSelection) {
      setNotice(t("status.selectShapeFirst"));
      return;
    }
    const copiedAt = Date.now();
    clipboardCopiedAtRef.current = copiedAt;
    setClipboard(selectedShapes);
    writeSharedClipboard(selectedShapes, copiedAt);
    setNotice(selectedShapes.length === 1
      ? t("status.copiedOne")
      : t("status.copiedMany", { count: selectedShapes.length }));
  }, [hasSelection, selectedShapes]);

  const pasteShape = useCallback(async () => {
    const sourceProjectId = projectInfoRef.current.projectId;
    // The newest copy wins, wherever it landed: this tab, another tab (local
    // storage) or another browser (system clipboard).
    const newest = newestClipboard([
      { copiedAt: clipboardCopiedAtRef.current, shapes: clipboard },
      readSharedClipboard(),
      await readSystemClipboard(),
    ]);
    const sourceClipboard = newest?.shapes ?? [];
    if (sourceClipboard.length === 0) {
      setNotice(t("status.clipboardEmpty"));
      return;
    }
    if (projectInfoRef.current.projectId !== sourceProjectId) {
      setNotice(t("status.pasteCancelled"));
      return;
    }
    if (newest && newest.copiedAt !== clipboardCopiedAtRef.current) {
      clipboardCopiedAtRef.current = newest.copiedAt;
      setClipboard(sourceClipboard);
    }
    const pasted = sourceClipboard.map((shape) => {
      const pastedShape = cloneWorkplaneShapeTreeWithFreshIds(shape, "paste");
      return {
        ...pastedShape,
        x: Math.min(110, shape.x + 12),
        z: Math.min(110, shape.z + 12),
      };
    });
    commitShapes([...shapesRef.current, ...pasted], pasted.map((shape) => shape.id), pasted.length === 1 ? t("status.pastedOne") : t("status.pastedMany", { count: pasted.length }));
  }, [clipboard, commitShapes]);

  const undo = useCallback(() => {
    if (projectInteractionActiveRef.current) {
      setNotice(t("status.finishBeforeUndo"));
      return;
    }
    const modifierCancelled = invalidateCadModifierSession();
    const currentHistory = historyRef.current;
    const currentIndex = historyIndexRef.current;
    if (currentIndex <= 0) {
      setNotice(modifierCancelled ? t("status.edgeCancelled") : t("status.nothingToUndo"));
      return;
    }
    const nextIndex = currentIndex - 1;
    const entry = currentHistory[nextIndex];
    const nextShapes = (entry?.shapes ?? []).map(canonicalizeShape);
    const nextSelection = (entry?.selectedIds ?? []).filter((id) => nextShapes.some((shape) => shape.id === id));
    const nextNotes = normalizeNotes(entry?.notes);
    const nextWorkplane = normalizePlacementWorkplane(entry?.placementWorkplane);
    // A workplane that comes back or goes away is a step of its own - say so (#246).
    const workplaneChanged = placementWorkplaneFingerprint(nextWorkplane) !== placementWorkplaneFingerprint(placementWorkplaneRef.current);
    const nextElevation = Math.abs(nextWorkplane.normal.x) < 1e-6
      && Math.abs(nextWorkplane.normal.y - 1) < 1e-6
      && Math.abs(nextWorkplane.normal.z) < 1e-6
      ? nextWorkplane.origin.y
      : 0;
    historyIndexRef.current = nextIndex;
    shapesRef.current = nextShapes;
    selectedIdsRef.current = nextSelection;
    notesRef.current = nextNotes;
    placementWorkplaneRef.current = nextWorkplane;
    placementElevationRef.current = nextElevation;
    setHistoryIndex(nextIndex);
    setShapes(nextShapes);
    setOpenGroupLevels((entry && openGroupHistoryRef.current.get(entry.fingerprint)) ?? []);
    setNotes(nextNotes);
    setSelectedIds(nextSelection);
    setPlacementWorkplane(nextWorkplane);
    setPlacementElevation(nextElevation);
    syncProjectShapes(nextShapes);
    setNotice(modifierCancelled
      ? t("status.edgeCancelledUndo")
      : workplaneChanged ? t(placementWorkplaneIsBase(nextWorkplane) ? "status.undoWorkplaneBase" : "status.undoWorkplaneFace") : t("status.undo"));
  }, [invalidateCadModifierSession, setOpenGroupLevels, syncProjectShapes]);

  const redo = useCallback(() => {
    if (projectInteractionActiveRef.current) {
      setNotice(t("status.finishBeforeRedo"));
      return;
    }
    const currentHistory = historyRef.current;
    const currentIndex = historyIndexRef.current;
    if (currentIndex >= currentHistory.length - 1) {
      setNotice(t("status.nothingToRedo"));
      return;
    }
    const modifierCancelled = invalidateCadModifierSession();
    const nextIndex = currentIndex + 1;
    const entry = currentHistory[nextIndex];
    const nextShapes = (entry?.shapes ?? []).map(canonicalizeShape);
    const nextSelection = (entry?.selectedIds ?? []).filter((id) => nextShapes.some((shape) => shape.id === id));
    const nextNotes = normalizeNotes(entry?.notes);
    const nextWorkplane = normalizePlacementWorkplane(entry?.placementWorkplane);
    // A workplane that comes back or goes away is a step of its own - say so (#246).
    const workplaneChanged = placementWorkplaneFingerprint(nextWorkplane) !== placementWorkplaneFingerprint(placementWorkplaneRef.current);
    const nextElevation = Math.abs(nextWorkplane.normal.x) < 1e-6
      && Math.abs(nextWorkplane.normal.y - 1) < 1e-6
      && Math.abs(nextWorkplane.normal.z) < 1e-6
      ? nextWorkplane.origin.y
      : 0;
    historyIndexRef.current = nextIndex;
    shapesRef.current = nextShapes;
    selectedIdsRef.current = nextSelection;
    notesRef.current = nextNotes;
    placementWorkplaneRef.current = nextWorkplane;
    placementElevationRef.current = nextElevation;
    setHistoryIndex(nextIndex);
    setShapes(nextShapes);
    setOpenGroupLevels((entry && openGroupHistoryRef.current.get(entry.fingerprint)) ?? []);
    setNotes(nextNotes);
    setSelectedIds(nextSelection);
    setPlacementWorkplane(nextWorkplane);
    setPlacementElevation(nextElevation);
    syncProjectShapes(nextShapes);
    setNotice(modifierCancelled
      ? t("status.edgeCancelledRedo")
      : workplaneChanged ? t(placementWorkplaneIsBase(nextWorkplane) ? "status.redoWorkplaneBase" : "status.redoWorkplaneFace") : t("status.redo"));
  }, [invalidateCadModifierSession, setOpenGroupLevels, syncProjectShapes]);

  /**
   * Der Verlaufsblick oeffnet beim aktuellen Stand; von dort fuehrt der Schieber
   * zurueck. Werkzeuge, die auf der Arbeitsflaeche etwas vorhaben, werden
   * abgelegt - sie wuerden sonst auf einem Stand arbeiten, der nur gezeigt wird.
   */
  const openHistoryView = useCallback(() => {
    if (projectInteractionActiveRef.current) {
      setNotice(t("status.finishBeforeHistory"));
      return;
    }
    if (historyRef.current.length <= 1) {
      setNotice(t("status.historyViewEmpty"));
      return;
    }
    if (cruiseAssetRef.current) setCruiseAsset(null);
    setNoteMode(false);
    setPivotPickMode(false);
    setLayFlatPickMode(false);
    setArrayTool(null);
    setTopPanel(null);
    setHistoryViewIndex(historyIndexRef.current);
    setNotice(t("status.historyViewOpened"), true);
  }, []);

  const closeHistoryView = useCallback(() => {
    setHistoryViewIndex(null);
    setTopPanel(null);
    setNotice(t("status.historyViewClosed"));
  }, []);

  const stepHistoryView = useCallback((delta: number) => {
    setHistoryViewIndex((current) => {
      if (current === null) return current;
      return Math.min(Math.max(0, current + delta), Math.max(0, historyRef.current.length - 1));
    });
  }, []);

  const historyView = useHistoryViewPicking(historyViewState, {
    entries: useCallback(() => historyRef.current, []),
    closeView: useCallback(() => {
      if (!historyViewStateRef.current) return;
      setHistoryViewIndex(null);
      setTopPanel(null);
      // The view state follows on the next render; the step that comes next must not wait for it.
      historyViewStateRef.current = null;
    }, []),
    commit: useCallback((copies: WorkplaneShape[], message: string) => {
      commitShapes([...shapesRef.current, ...copies], copies.map((shape) => shape.id), message);
    }, [commitShapes]),
    language: editorLanguage,
  });

  const createProjectFromHistoryState = useCallback(async () => {
    const view = historyViewStateRef.current;
    if (!view || historyProjectCreating) return;
    if (!onCreateProjectFromState) {
      setNotice(t("status.historyProjectUnavailable"));
      return;
    }
    setHistoryProjectCreating(true);
    setNotice(t("status.historyProjectCreating"), true);
    try {
      // Die Arbeitsflaeche zeigt gerade diesen Stand - also ist ihr Bild das
      // Bild fuer die Karte des neuen Projekts.
      const picture = await (window.layerlingCaptureCanvasAsync?.() ?? Promise.resolve(""));
      const branch = editorHistoryBranch(historyRef.current, view.index, workspaceSettingsRef.current.historyLimit);
      const time = historyStateNameSuffix(view.entry.at);
      const message = await onCreateProjectFromState({
        sourceProjectId: projectInfoRef.current.projectId,
        name: time ? t("historyView.copyName", { name: projectInfoRef.current.projectName, time }) : null,
        shapes: view.shapes,
        history: branch.entries,
        historyIndex: branch.index,
        assets: projectAssetsRef.current,
        workspace: workspaceSettingsRef.current,
        snapGrid,
        placementElevation: view.placementElevation,
        placementWorkplane: view.placementWorkplane,
        thumbnailDataUrl: picture.startsWith("data:image/png;base64,") && picture.length > 100 ? picture : null,
      });
      setNotice(message);
    } catch (error) {
      setNotice(error instanceof Error ? localizedError(error.message) : t("status.historyProjectCreateFailed"));
    } finally {
      setHistoryProjectCreating(false);
    }
  }, [historyProjectCreating, onCreateProjectFromState, snapGrid]);

  const toggleAlignMode = useCallback(() => {
    if (selectedShapes.length > 0 && selectedShapes.every((shape) => shape.locked)) {
      setNotice(t("status.objectLocked"));
      return;
    }
    if (selectedShapes.length < 2) {
      setNotice(t("status.selectTwoToAlign"));
      return;
    }
    setAlignMode((active) => {
      const next = !active;
      setAlignPreview(null);
      if (next) {
        setMirrorMode(false);
        setMirrorPreviewAxis(null);
        splitRunRef.current += 1;
        setSplitSession(null);
      }
      setNotice(next ? t("status.alignStart") : t("status.alignCancelled"));
      return next;
    });
  }, [selectedShapes]);

  const chooseAlignAnchor = useCallback(
    (id: string) => {
      if (!selectedIds.includes(id)) {
        return;
      }
      const shape = shapes.find((entry) => entry.id === id);
      const lockedAnchor = selectedShapes.find((entry) => entry.locked);
      if (lockedAnchor && lockedAnchor.id !== id) {
        setNotice(t("status.alignAnchor", { name: displayShapeName(lockedAnchor) }));
        return;
      }
      setAlignAnchorId(id);
      setAlignPreview(null);
      setNotice(shape ? t("status.alignAnchorNamed", { name: displayShapeName(shape) }) : t("status.alignAnchorSet"));
    },
    [selectedIds, selectedShapes, shapes],
  );

  const alignSelectionTo = useCallback(
    (axis: AlignAxis, target: AlignTarget) => {
      if (selectedShapes.length < 2) {
        setNotice(t("status.selectTwoToAlign"));
        return;
      }

      const { nextShapes, moved } = alignedShapesForSelection(shapes, selectedIds, selectedShapes, effectiveAlignAnchorId, axis, target, alignAxes);
      setAlignPreview(null);

      if (moved === 0) {
        setNotice(t("status.alreadyAligned"));
        return;
      }

      commitShapes(nextShapes, selectedIds, moved === 1
        ? t("status.alignedOne", { alignment: alignmentLabel(axis, target) })
        : t("status.alignedMany", { count: moved, alignment: alignmentLabel(axis, target) }));
    },
    [alignAxes, commitShapes, effectiveAlignAnchorId, selectedIds, selectedShapes, shapes],
  );

  const previewAlignSelection = useCallback((axis: AlignAxis, target: AlignTarget) => {
    setAlignPreview({ axis, target });
  }, []);

  const clearAlignPreview = useCallback(() => {
    setAlignPreview(null);
  }, []);

  const toggleMirrorMode = useCallback(() => {
    if (!hasSelection) {
      setNotice(t("status.selectShapeFirst"));
      return;
    }
    if (refuseLockedSelection()) return;
    setMirrorMode((active) => {
      const next = !active;
      setMirrorPreviewAxis(null);
      if (next) {
        setAlignMode(false);
        setAlignAnchorId(null);
        setAlignPreview(null);
        splitRunRef.current += 1;
        setSplitSession(null);
      }
      setNotice(next ? t("status.mirrorStart") : t("status.mirrorCancelled"));
      return next;
    });
  }, [refuseLockedSelection, hasSelection]);

  const mirrorSelectionAcross = useCallback(
    (axis: AlignAxis) => {
      if (!hasSelection) {
        setNotice(t("status.selectShapeFirst"));
        return;
      }
      const { nextShapes, moved } = mirroredShapesForSelection(shapes, selectedIds, selectedShapes, axis);
      setMirrorPreviewAxis(null);
      if (moved === 0) {
        setNotice(t("status.nothingToMirror"));
        return;
      }
      commitShapes(nextShapes, selectedIds, moved === 1
        ? t("status.mirroredOne", { axis: mirrorAxisLabel(axis) })
        : t("status.mirroredMany", { count: moved, axis: mirrorAxisLabel(axis) }));
    },
    [commitShapes, hasSelection, selectedIds, selectedShapes, shapes],
  );

  const previewMirrorSelection = useCallback((axis: AlignAxis) => {
    setMirrorPreviewAxis(axis);
  }, []);

  const clearMirrorPreview = useCallback(() => {
    setMirrorPreviewAxis(null);
  }, []);

  const cancelSplit = useCallback(() => {
    splitRunRef.current += 1;
    setSplitSession(null);
    setNotice(t("status.splitCancelled"));
  }, []);

  const toggleSplitMode = useCallback(() => {
    if (splitSession) {
      cancelSplit();
      return;
    }
    if (refuseLockedSelection()) return;
    if (!canSplitSelection) {
      setNotice(t("status.splitSelectSolids"));
      return;
    }
    const targetPoints = selectedShapes.flatMap((shape) => meshForShape(shape).vertices);
    // The plane starts parallel to the workplane (#644) - on the base plate that is level, as it always was.
    const workplaneNormal = placementWorkplaneRef.current.normal;
    const start = splitOrientationForNormal([workplaneNormal.x, workplaneNormal.y, workplaneNormal.z]) ?? { axis: "y" as AlignAxis, rotation: NO_SPLIT_ROTATION };
    const plane = modelSplitPlane(targetPoints, start.axis, undefined, start.rotation);
    if (!plane) {
      setNotice(t("status.splitNoGeometry"));
      return;
    }
    invalidateCadModifierSession();
    splitRunRef.current += 1;
    setAlignMode(false);
    setAlignAnchorId(null);
    setAlignPreview(null);
    setMirrorMode(false);
    setMirrorPreviewAxis(null);
    setWorkplaneMode(false);
    setNoteMode(false);
    setShellTool(null);
    setArrayTool(null);
    setPivotPickMode(false);
    setLayFlatPickMode(false);
    setCruiseAsset(null);
    setSplitSession({
      targetIds: selectedShapes.map((shape) => shape.id),
      axis: plane.axis,
      rotation: plane.rotation,
      position: plane.position,
      pivot: plane.origin,
      sourceFingerprint: projectShapesFingerprint(shapesRef.current),
      busy: false,
      error: null,
      picking: false,
    });
    setNotice(t("status.splitReady"));
  }, [refuseLockedSelection, cancelSplit, canSplitSelection, invalidateCadModifierSession, selectedShapes, splitSession]);

  const changeSplitAxis = useCallback((axis: AlignAxis) => {
    const plane = modelSplitPlane(splitTargetPoints, axis);
    if (!plane) return;
    setSplitSession((current) => current && !current.busy ? {
      ...current,
      axis,
      rotation: NO_SPLIT_ROTATION,
      position: plane.position,
      pivot: plane.origin,
      error: null,
    } : current);
  }, [splitTargetPoints]);

  const changeSplitPosition = useCallback((position: number) => {
    setSplitSession((current) => {
      if (!current || current.busy) return current;
      const plane = modelSplitPlane(splitTargetPoints, current.axis, position, current.rotation);
      return plane ? { ...current, position: plane.position, pivot: plane.origin, error: null } : current;
    });
  }, [splitTargetPoints]);

  const toggleSplitPick = useCallback(() => {
    if (!splitSession || splitSession.busy) return;
    const picking = !splitSession.picking;
    setSplitSession({ ...splitSession, picking });
    setNotice(t(picking ? "status.splitPick" : "status.splitReady"));
  }, [splitSession]);

  // The plane lies down on the face that was clicked: its turn, through the clicked point.
  const pickSplitSurface = useCallback((point: [number, number, number], normal: [number, number, number]) => {
    const orientation = splitOrientationForNormal(normal);
    if (!orientation) return;
    setSplitSession((current) => {
      if (!current || current.busy || !current.picking) return current;
      const centeredPlane = modelSplitPlane(splitTargetPoints, orientation.axis, undefined, orientation.rotation);
      if (!centeredPlane) return current;
      const picked = centeredPlane.normal[0] * point[0] + centeredPlane.normal[1] * point[1] + centeredPlane.normal[2] * point[2];
      const position = snapSplitPositionToVertices(splitTargetPoints, centeredPlane.normal, picked);
      const plane = modelSplitPlane(splitTargetPoints, orientation.axis, position, orientation.rotation);
      return plane ? { ...current, axis: plane.axis, rotation: plane.rotation, position: plane.position, pivot: plane.origin, picking: false, error: null } : current;
    });
    setNotice(t("status.splitReady"));
  }, [splitTargetPoints]);

  // On the workplane, or square to it along its X or Y (#644). Through the workplane's origin where that crosses
  // the parts - a workplane laid on a face cuts there - otherwise through their middle.
  const alignSplitToWorkplane = useCallback((direction: SplitWorkplaneDirection) => {
    const workplane = placementWorkplaneRef.current;
    const along = direction === "parallel" ? workplane.normal : direction === "acrossX" ? workplane.xAxis : workplane.zAxis;
    const orientation = splitOrientationForNormal([along.x, along.y, along.z]);
    if (!orientation) return;
    setSplitSession((current) => {
      if (!current || current.busy) return current;
      const centeredPlane = modelSplitPlane(splitTargetPoints, orientation.axis, undefined, orientation.rotation);
      if (!centeredPlane) return current;
      const { origin } = workplane;
      const through = centeredPlane.normal[0] * origin.x + centeredPlane.normal[1] * origin.y + centeredPlane.normal[2] * origin.z;
      const crosses = through > centeredPlane.min + 1e-6 && through < centeredPlane.max - 1e-6;
      const position = crosses ? snapSplitPositionToVertices(splitTargetPoints, centeredPlane.normal, through) : centeredPlane.position;
      const plane = modelSplitPlane(splitTargetPoints, orientation.axis, position, orientation.rotation);
      return plane ? { ...current, axis: plane.axis, rotation: plane.rotation, position: plane.position, pivot: plane.origin, picking: false, error: null } : current;
    });
    setNotice(t("status.splitReady"));
  }, [splitTargetPoints]);

  const changeSplitRotation = useCallback((index: 0 | 1, rotation: number) => {
    const angle = Math.max(-180, Math.min(180, rotation));
    setSplitSession((current) => {
      if (!current || current.busy) return current;
      const nextRotation: SplitRotation = index === 0 ? [angle, current.rotation[1]] : [current.rotation[0], angle];
      const centeredPlane = modelSplitPlane(splitTargetPoints, current.axis, undefined, nextRotation);
      if (!centeredPlane) return current;
      const position = centeredPlane.normal[0] * current.pivot[0]
        + centeredPlane.normal[1] * current.pivot[1]
        + centeredPlane.normal[2] * current.pivot[2];
      const plane = modelSplitPlane(splitTargetPoints, current.axis, position, nextRotation);
      return plane ? { ...current, rotation: nextRotation, position: plane.position, error: null } : current;
    });
  }, [splitTargetPoints]);

  const applySplit = useCallback(async () => {
    const session = splitSession;
    const plane = splitPlane;
    if (!session || !plane || session.busy) return;
    const sourceProjectId = splitProjectIdRef.current;
    const sourceContextIsCurrent = () => {
      const currentSelection = selectedIdsRef.current;
      return splitProjectIdRef.current === sourceProjectId
        && currentSelection.length === session.targetIds.length
        && session.targetIds.every((id) => currentSelection.includes(id))
        && projectShapesFingerprint(shapesRef.current) === session.sourceFingerprint;
    };
    if (!sourceContextIsCurrent()) {
      splitRunRef.current += 1;
      setSplitSession(null);
      setNotice(t("status.splitCancelledChanged"));
      return;
    }

    const runId = splitRunRef.current + 1;
    splitRunRef.current = runId;
    setSplitSession({ ...session, busy: true, error: null, picking: false });
    const outcome = await splitShapesByPlane(splitTargetShapes, plane, () => splitRunRef.current === runId && sourceContextIsCurrent());
    if (splitRunRef.current !== runId) return;
    if (outcome.status === "stale" || !sourceContextIsCurrent()) {
      splitRunRef.current += 1;
      setSplitSession(null);
      setNotice(t("status.splitCancelledProcessing"));
      return;
    }
    if (outcome.status === "failed") {
      const { shape, error } = outcome;
      setSplitSession((current) => current ? {
        ...current,
        busy: false,
        error: t("split.error.failed", { name: shape.name, detail: error }),
      } : current);
      setNotice(t("status.splitFailed", { name: shape.name }));
      return;
    }
    const { replacements, splitCount } = outcome;
    if (splitCount === 0) {
      setSplitSession((current) => current ? { ...current, busy: false, error: t("split.error.movePlane") } : current);
      setNotice(t("status.splitMissed"));
      return;
    }

    const nextShapes = shapesRef.current.flatMap((shape) => replacements.get(shape.id) ?? [shape]);
    const nextSelection = [...replacements.values()].flat().map((shape) => shape.id);
    setSplitSession(null);
    commitShapes(
      nextShapes,
      nextSelection,
      splitCount === 1
        ? t("status.splitOne", { count: nextSelection.length })
        : t("status.splitMany", { count: splitCount, bodies: nextSelection.length }),
    );
  }, [commitShapes, splitPlane, splitSession, splitTargetShapes]);

  useEffect(() => {
    if (!splitSession) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (splitSession.picking) {
          setSplitSession((current) => current ? { ...current, picking: false } : current);
          setNotice(t("status.splitReady"));
        } else {
          cancelSplit();
        }
        return;
      }
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (event.key === "Enter" && !target?.closest("input, select, textarea, button, [contenteditable='true']")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        void applySplit();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [applySplit, cancelSplit, splitSession]);

  const postCadModifierRequest = useCallback((request: CadModifierWorkerPayload, transfer: Transferable[] = []) => {
    const worker = cadModifierWorkerRef.current ?? cadModifierWorkerRestartRef.current();
    if (!worker) return null;
    const requestId = cadModifierRequestRef.current + 1;
    cadModifierRequestRef.current = requestId;
    try {
      worker.postMessage({ ...request, requestId } as CadModifierWorkerRequest, transfer);
    } catch {
      worker.terminate();
      if (cadModifierWorkerRef.current === worker) cadModifierWorkerRef.current = null;
      return null;
    }
    return requestId;
  }, []);

  const postCadModifierRequestAsync = useCallback((request: CadModifierWorkerPayload, transfer: Transferable[] = [], timeoutMs = 20000) => {
    const worker = cadModifierWorkerRef.current ?? cadModifierWorkerRestartRef.current();
    if (!worker) {
      return Promise.reject(new Error("The CAD worker is not ready"));
    }
    const requestId = cadModifierRequestRef.current + 1;
    cadModifierRequestRef.current = requestId;
    return new Promise<CadModifierWorkerResponse>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        if (!cadModifierPendingRef.current.has(requestId)) return;
        const pendingRequests = [...cadModifierPendingRef.current.values()];
        cadModifierPendingRef.current.clear();
        pendingRequests.forEach((pending) => window.clearTimeout(pending.timer));
        cadModifierWorkerRef.current?.terminate();
        cadModifierWorkerRef.current = null;
        cadPreviewQueueRef.current.reset();
        const invalidationId = cadModifierRequestRef.current + 1;
        cadModifierRequestRef.current = invalidationId;
        cadModifierLatestPreviewRef.current = invalidationId;
        cadModifierPrepareRef.current = invalidationId;
        cadModifierBaseShapeRef.current = null;
        cadModifierBaseFingerprintRef.current = "";
        cadModifierSourcePartsRef.current = [];
        setEdgeModifier(null);
        cadModifierWorkerRestartRef.current();
        pendingRequests.forEach((pending) => pending.reject(new Error("Timed out waiting for the CAD worker; the worker was restarted")));
      }, timeoutMs);
      cadModifierPendingRef.current.set(requestId, { resolve, reject, timer });
      try {
        worker.postMessage({ ...request, requestId } as CadModifierWorkerRequest, transfer);
      } catch (error) {
        window.clearTimeout(timer);
        cadModifierPendingRef.current.delete(requestId);
        reject(error instanceof Error ? error : new Error("The CAD worker rejected the request"));
      }
    });
  }, []);

  const cancelEdgeModifier = useCallback(() => {
    invalidateCadModifierSession();
    setNotice(t("status.edgeCancelled"));
  }, [invalidateCadModifierSession]);

  const startEdgeModifier = useCallback((kind: CadModifierKind) => {
    setShellTool(null);
    if (refuseLockedSelection()) return;
    const kindLabel = t(kind === "fillet" ? "editor.tool.fillet" : kind === "chamfillet" ? "edge.chamfillet" : "editor.tool.chamfer");
    if (selectedShapes.length !== 1 || !selectedShape || selectedShape.locked || selectedShape.hole || isNonSolidShapeKind(selectedShape.kind)) {
      setNotice(t("status.selectOneSolid", { kind: kindLabel }));
      return;
    }
    if (selectedShape.groupOperation === "bundle") {
      setNotice(t("status.bundleNotOneBody"));
      return;
    }
    invalidateCadModifierSession();
    stopCruise();
    const appliedEdgeTreatmentCount = edgeTreatmentFeatureCount(selectedShape);
    const hasAppliedEdgeTreatment = Boolean(selectedShape.importedMesh && selectedShape.edgeTreatments?.length);
    const sourceParts = (selectedShape.groupedShapes?.length && !hasAppliedEdgeTreatment && !shapeHasShapeDeform(selectedShape)
      ? restoreGroupedChildrenForEdges(selectedShape)
      : [selectedShape]).flatMap(cadModifierSourceParts);
    const partInputs: Array<{ shape: WorkplaneShape; mesh?: MeshData; brep?: string; step?: string; thread?: CadModifierThreadPart; spring?: CadModifierSpringPart; helicalGear?: CadModifierHelicalGearPart; gridfinity?: CadModifierGridfinityPart; brepTransform?: number[]; primitive?: CadModifierPrimitivePart; profile?: CadModifierProfilePart; profileMesh?: MeshData }> = withinExactProfileLimit(sourceParts.map((shape) => {
      const frame = shape.cadBrepFrame;
      const preserveNeedsRetessellation = preservesEdgeTreatmentSize(shape) && Boolean(frame) && (
        Math.abs(shapeWidth(shape) - (frame?.width ?? shapeWidth(shape))) > 1e-6 ||
        Math.abs(shapeDepth(shape) - (frame?.depth ?? shapeDepth(shape))) > 1e-6 ||
        Math.abs(shape.height - (frame?.height ?? shape.height)) > 1e-6
      );
      if (shapeHasShapeDeform(shape)) {
        // A tapered or leaning prism is a ruled loft between its ends; anything else deformed keeps its mesh.
        const lofted = cadModifierProfileForShape(shape);
        return lofted ? { shape, profile: lofted, profileMesh: meshForShape(shape) } : { shape, mesh: meshForShape(shape) };
      }
      const primitive = cadModifierPrimitiveForShape(shape);
      if (primitive) return { shape, primitive };
      const profile = cadModifierProfileForShape(shape) ?? textGlyphProfileByPart.get(shape);
      if (profile) return { shape, profile, profileMesh: meshForShape(shape) };
      // A thread is built exactly from its own measures; the display mesh only checks it, and stands in if it fails.
      const exactThread = cadModifierThreadForShape(shape);
      if (exactThread) return { shape, thread: exactThread, profileMesh: meshForShape(shape) };
      // A spring likewise.
      const exactSpring = cadModifierSpringForShape(shape);
      if (exactSpring) return { shape, spring: exactSpring, profileMesh: meshForShape(shape) };
      // A helical gear likewise.
      const exactHelicalGear = cadModifierHelicalGearForShape(shape);
      if (exactHelicalGear) return { shape, helicalGear: exactHelicalGear, profileMesh: meshForShape(shape) };
      // A Gridfinity bin or baseplate likewise.
      const exactGridfinity = cadModifierGridfinityForShape(shape);
      if (exactGridfinity) return { shape, gridfinity: exactGridfinity, profileMesh: meshForShape(shape) };
      // A STEP import brought its exact body along; the display mesh only checks it, and stands in if it fails.
      const importedStep = importedStepPartForShape(shape);
      if (importedStep) return { shape, ...importedStep, profileMesh: meshForShape(shape) };
      return shape.cadBrep && frame && !preserveNeedsRetessellation
        ? { shape, brep: shape.cadBrep, brepTransform: cadBrepTransformForShape(shape) }
        : { shape, mesh: meshForShape(shape) };
    }));
    const triangleCount = partInputs.reduce((total, part) => total + (part.mesh?.faces.length ?? 0), 0);
    const profileTriangleCount = partInputs.reduce((total, part) => total + (part.profileMesh?.faces.length ?? 0), 0);
    const profilePartCount = partInputs.filter((part) => part.profile || part.step || part.thread || part.spring || part.helicalGear || part.gridfinity).length;
    const profileSegmentCount = partInputs.reduce((total, part) => total + (part.profile ? cadProfileSegmentCount(part.profile) : 0), 0);
    const sendProfileMeshes = triangleCount + profileTriangleCount <= CAD_MODIFIER_PREPARE_TRIANGLE_LIMIT;
    // A STEP import's, a thread's, a spring's or a helical gear's mesh went
    // along as the part itself until it had its own body; it still goes along
    // whenever it would have fitted then. A Gridfinity part's goes the same way.
    const stepTriangleCount = partInputs.reduce((total, part) => total + (part.step || part.thread || part.spring || part.helicalGear || part.gridfinity ? part.profileMesh?.faces.length ?? 0 : 0), 0);
    const sendStepMeshes = sendProfileMeshes || triangleCount + stepTriangleCount <= CAD_MODIFIER_PREPARE_TRIANGLE_LIMIT;
    const prepareTimeoutMs = cadModifierPrepareTimeoutMs(triangleCount + (sendProfileMeshes ? profileTriangleCount : sendStepMeshes ? stepTriangleCount : 0), profilePartCount, profileSegmentCount);
    if (triangleCount === 0 && partInputs.every((part) => !part.brep && !part.step && !part.thread && !part.spring && !part.helicalGear && !part.gridfinity && !part.primitive && !part.profile)) {
      setNotice(t("status.noPrintableSurface"));
      return;
    }
    if (triangleCount > CAD_MODIFIER_PREPARE_TRIANGLE_LIMIT) {
      // Ein Gewinde kommt nur noch als Dreiecke hier an, wenn es keinen
      // exakten Koerper bekommt; dann besteht die Wendel aus tausenden
      // Dreiecken, und die Absage nennt gleich den Weg, der wirklich zum
      // gebrochenen Schraubenkopf fuehrt. Ein exakt gebautes Gewinde zaehlt
      // hier nicht mit, die Absage gilt dann einem anderen Teil.
      const istGewinde = partInputs.some((part) => part.mesh && part.shape.kind === "thread");
      setNotice(t(istGewinde ? "status.threadTooDense" : "status.meshTooDense", {
        triangles: formatTriangleCount(triangleCount),
        limit: formatTriangleCount(CAD_MODIFIER_PREPARE_TRIANGLE_LIMIT),
      }), true);
      return;
    }
    const amount = Math.max(MIN_EDGE_MODIFIER_AMOUNT, Math.min(1, shapeWidth(selectedShape) / 6, shapeDepth(selectedShape) / 6, selectedShape.height / 6));
    cadModifierBaseShapeRef.current = selectedShape;
    cadModifierBaseFingerprintRef.current = projectShapesFingerprint([selectedShape]);
    cadModifierSourcePartsRef.current = sourceParts;
    setAlignMode(false);
    setMirrorMode(false);
    splitRunRef.current += 1;
    setSplitSession(null);
    setEdgeModifier({
      kind,
      edges: [],
      selectedEdgeIds: [],
      amount,
      sharpAngle: 25,
      chamferAngle: 45,
      quality: "standard",
      tangentChain: defaultCadModifierTangentChain(appliedEdgeTreatmentCount),
      preserveEdgeSize: selectedShape.edgeResizeMode === "preserve",
      busy: true,
      prepared: false,
      error: null,
      preview: null,
      componentPreviews: [],
    });
    setNotice(t("status.preparingEdges", { kind: kindLabel }), true);
    const parts: CadModifierMeshPart[] = partInputs.map((part) => {
      if (part.brep) return { brep: part.brep, brepTransform: part.brepTransform, hole: Boolean(part.shape.hole) };
      if (part.thread) return cadModifierThreadMeshPart(part.thread, part.profileMesh, sendStepMeshes, Boolean(part.shape.hole));
      if (part.spring) return cadModifierSpringMeshPart(part.spring, part.profileMesh, sendStepMeshes, Boolean(part.shape.hole));
      if (part.helicalGear) return cadModifierHelicalGearMeshPart(part.helicalGear, part.profileMesh, sendStepMeshes, Boolean(part.shape.hole));
      if (part.gridfinity) return cadModifierGridfinityMeshPart(part.gridfinity, part.profileMesh, sendStepMeshes, Boolean(part.shape.hole));
      if (part.step) return cadModifierImportedStepMeshPart(part.step, part.brepTransform, part.profileMesh, sendStepMeshes, Boolean(part.shape.hole));
      if (part.primitive) return { primitive: part.primitive, hole: Boolean(part.shape.hole) };
      if (part.profile) return cadModifierProfileMeshPart(part.profile, part.profileMesh, sendProfileMeshes, Boolean(part.shape.hole));
      return { ...meshDataToCadTransfer(part.mesh as MeshData), hole: Boolean(part.shape.hole) };
    });
    const prepareRequestId = postCadModifierRequest({
      type: "prepare",
      parts,
      sharpAngle: 25,
      suppressTreatmentDetailEdges: appliedEdgeTreatmentCount > 0,
    }, parts.flatMap((part) => part.positions && part.indices ? [part.positions.buffer, part.indices.buffer] : []));
    if (prepareRequestId === null) {
      const message = cadModifierWorkerFailureMessage();
      setEdgeModifier((current) => current ? { ...current, busy: false, prepared: false, error: message } : current);
      setNotice(message);
      return;
    }
    cadModifierPrepareRef.current = prepareRequestId;
    armCadModifierWatchdog(prepareRequestId, "prepare", prepareTimeoutMs);
  }, [refuseLockedSelection, armCadModifierWatchdog, invalidateCadModifierSession, postCadModifierRequest, selectedShape, selectedShapes.length, stopCruise]);

  // The body is back after an "Edit" (#227): open the tool on it with the value and the edges it had.
  useEffect(() => {
    const request = edgeEditRequestRef.current;
    if (!request || !selectedShape || selectedShape.id !== request.shapeId) return;
    if ((selectedShape.edgeTreatmentHistory?.length ?? 0) !== request.historyLength) return;
    edgeEditRequestRef.current = null;
    edgeModifierPresetRef.current = request.preset;
    startEdgeModifier(request.preset.kind);
  }, [edgeEditRound, selectedShape, startEdgeModifier]);

  // faces: for Delete face (#451) - the worker also sends the body's faces (faceMesh: with their
  // tessellation, for picking), and only an exact body will do: no part goes as a mesh, and no
  // exact part has a mesh to fall back on.
  const prepareCadModifierForMcp = useCallback(async (shape: WorkplaneShape, sharpAngle: number, options: { faces?: boolean; faceMesh?: boolean } = {}) => {
    if (shape.locked || shape.hole) {
      throw new Error("Select one unlocked solid object for edge treatment");
    }
    if (shape.groupOperation === "bundle") {
      throw new Error("A bundle is not one body; group it (layerling_group_objects) or treat its parts one by one");
    }
    const appliedEdgeTreatmentCount = edgeTreatmentFeatureCount(shape);
    const hasAppliedEdgeTreatment = Boolean(shape.importedMesh && shape.edgeTreatments?.length);
    const sourceParts = (shape.groupedShapes?.length && !hasAppliedEdgeTreatment && !shapeHasShapeDeform(shape)
      ? restoreGroupedChildrenForEdges(shape)
      : [shape]).flatMap(cadModifierSourceParts);
    const partInputs: Array<{ shape: WorkplaneShape; mesh?: MeshData; brep?: string; step?: string; thread?: CadModifierThreadPart; spring?: CadModifierSpringPart; helicalGear?: CadModifierHelicalGearPart; gridfinity?: CadModifierGridfinityPart; brepTransform?: number[]; primitive?: CadModifierPrimitivePart; profile?: CadModifierProfilePart; profileMesh?: MeshData }> = withinExactProfileLimit(sourceParts.map((partShape) => {
      const frame = partShape.cadBrepFrame;
      const preserveNeedsRetessellation = preservesEdgeTreatmentSize(partShape) && Boolean(frame) && (
        Math.abs(shapeWidth(partShape) - (frame?.width ?? shapeWidth(partShape))) > 1e-6 ||
        Math.abs(shapeDepth(partShape) - (frame?.depth ?? shapeDepth(partShape))) > 1e-6 ||
        Math.abs(partShape.height - (frame?.height ?? partShape.height)) > 1e-6
      );
      if (shapeHasShapeDeform(partShape)) {
        // A tapered or leaning prism is a ruled loft between its ends; anything else deformed keeps its mesh.
        const lofted = cadModifierProfileForShape(partShape);
        return lofted ? { shape: partShape, profile: lofted, profileMesh: meshForShape(partShape) } : { shape: partShape, mesh: meshForShape(partShape) };
      }
      const primitive = cadModifierPrimitiveForShape(partShape);
      if (primitive) return { shape: partShape, primitive };
      const profile = cadModifierProfileForShape(partShape) ?? textGlyphProfileByPart.get(partShape);
      if (profile) return { shape: partShape, profile, profileMesh: meshForShape(partShape) };
      // A thread is built exactly from its own measures; the display mesh only checks it, and stands in if it fails.
      const exactThread = cadModifierThreadForShape(partShape);
      if (exactThread) return { shape: partShape, thread: exactThread, profileMesh: meshForShape(partShape) };
      // A spring likewise.
      const exactSpring = cadModifierSpringForShape(partShape);
      if (exactSpring) return { shape: partShape, spring: exactSpring, profileMesh: meshForShape(partShape) };
      // A helical gear likewise.
      const exactHelicalGear = cadModifierHelicalGearForShape(partShape);
      if (exactHelicalGear) return { shape: partShape, helicalGear: exactHelicalGear, profileMesh: meshForShape(partShape) };
      // A Gridfinity bin or baseplate likewise.
      const exactGridfinity = cadModifierGridfinityForShape(partShape);
      if (exactGridfinity) return { shape: partShape, gridfinity: exactGridfinity, profileMesh: meshForShape(partShape) };
      // A STEP import brought its exact body along; the display mesh only checks it, and stands in if it fails.
      const importedStep = importedStepPartForShape(partShape);
      if (importedStep) return { shape: partShape, ...importedStep, profileMesh: meshForShape(partShape) };
      return partShape.cadBrep && frame && !preserveNeedsRetessellation
        ? { shape: partShape, brep: partShape.cadBrep, brepTransform: cadBrepTransformForShape(partShape) }
        : { shape: partShape, mesh: meshForShape(partShape) };
    }));
    const triangleCount = partInputs.reduce((total, part) => total + (part.mesh?.faces.length ?? 0), 0);
    const profileTriangleCount = partInputs.reduce((total, part) => total + (part.profileMesh?.faces.length ?? 0), 0);
    const profilePartCount = partInputs.filter((part) => part.profile || part.step || part.thread || part.spring || part.helicalGear || part.gridfinity).length;
    const profileSegmentCount = partInputs.reduce((total, part) => total + (part.profile ? cadProfileSegmentCount(part.profile) : 0), 0);
    const sendProfileMeshes = !options.faces && triangleCount + profileTriangleCount <= CAD_MODIFIER_PREPARE_TRIANGLE_LIMIT;
    // A STEP import's, a thread's, a spring's or a helical gear's mesh went
    // along as the part itself until it had its own body; it still goes along
    // whenever it would have fitted then. A Gridfinity part's goes the same way.
    const stepTriangleCount = partInputs.reduce((total, part) => total + (part.step || part.thread || part.spring || part.helicalGear || part.gridfinity ? part.profileMesh?.faces.length ?? 0 : 0), 0);
    const sendStepMeshes = !options.faces && (sendProfileMeshes || triangleCount + stepTriangleCount <= CAD_MODIFIER_PREPARE_TRIANGLE_LIMIT);
    const prepareTimeoutMs = cadModifierPrepareTimeoutMs(triangleCount + (sendProfileMeshes ? profileTriangleCount : sendStepMeshes ? stepTriangleCount : 0), profilePartCount, profileSegmentCount);
    if (triangleCount === 0 && partInputs.every((part) => !part.brep && !part.step && !part.thread && !part.spring && !part.helicalGear && !part.gridfinity && !part.primitive && !part.profile)) {
      throw new Error("The selected object has no printable surface");
    }
    // A body revolved before the exact revolve is a mesh; hollowing or rounding it fails in confusing ways.
    if (partInputs.some((part) => !part.brep && part.shape.sketchOperation === "revolve" && part.shape.sketchProfile)) {
      throw new Error("This revolved body is a mesh from an older layerling; open Edit sketch and finish it again to make it exact");
    }
    const meshPart = options.faces ? partInputs.find((part) => part.mesh) : undefined;
    if (meshPart) {
      // A body with an exact B-Rep and its frame that went as a mesh was resized while keeping its edge size.
      throw new Error(meshPart.shape.cadBrep && meshPart.shape.cadBrepFrame
        ? "This body was resized with Keep edge size when resizing on and has no exact faces at this size; undo the resize, delete the faces, then resize it again"
        : "This body has no exact faces to delete: layerling keeps it as a mesh, as it does an imported STL, OBJ or 3MF, a split, wrapped or simplified body, or a very detailed shape such as a long text. A part imported as STEP has exact faces.");
    }
    if (triangleCount > CAD_MODIFIER_PREPARE_TRIANGLE_LIMIT) {
      throw new Error(`This mesh has ${triangleCount} triangles; interactive edge treatment stops at ${CAD_MODIFIER_PREPARE_TRIANGLE_LIMIT}. For a shape from the catalogue, use its own parameters for now. For an imported part, import it as STEP or with fewer triangles.`);
    }
    const parts: CadModifierMeshPart[] = partInputs.map((part) => {
      if (part.brep) return { brep: part.brep, brepTransform: part.brepTransform, hole: Boolean(part.shape.hole) };
      if (part.thread) return cadModifierThreadMeshPart(part.thread, part.profileMesh, sendStepMeshes, Boolean(part.shape.hole));
      if (part.spring) return cadModifierSpringMeshPart(part.spring, part.profileMesh, sendStepMeshes, Boolean(part.shape.hole));
      if (part.helicalGear) return cadModifierHelicalGearMeshPart(part.helicalGear, part.profileMesh, sendStepMeshes, Boolean(part.shape.hole));
      if (part.gridfinity) return cadModifierGridfinityMeshPart(part.gridfinity, part.profileMesh, sendStepMeshes, Boolean(part.shape.hole));
      if (part.step) return cadModifierImportedStepMeshPart(part.step, part.brepTransform, part.profileMesh, sendStepMeshes, Boolean(part.shape.hole));
      if (part.primitive) return { primitive: part.primitive, hole: Boolean(part.shape.hole) };
      if (part.profile) return cadModifierProfileMeshPart(part.profile, part.profileMesh, sendProfileMeshes, Boolean(part.shape.hole));
      return { ...meshDataToCadTransfer(part.mesh as MeshData), hole: Boolean(part.shape.hole) };
    });
    const transfer = parts.flatMap((part) => part.positions && part.indices ? [part.positions.buffer as Transferable, part.indices.buffer as Transferable] : []);
    const response = await postCadModifierRequestAsync({
      type: "prepare",
      parts,
      sharpAngle,
      suppressTreatmentDetailEdges: appliedEdgeTreatmentCount > 0,
      ...(options.faces ? { faces: true } : {}),
      ...(options.faceMesh ? { faceMesh: true } : {}),
    }, transfer, prepareTimeoutMs);
    if (response.type !== "ready") {
      throw new Error("The CAD worker did not return an edge list");
    }
    return { response, sourceParts };
  }, [postCadModifierRequestAsync]);

  const applyCadModifierForMcp = useCallback(async (
    shape: WorkplaneShape,
    params: Record<string, unknown>,
  ) => {
    invalidateCadModifierSession();
    const sourceFingerprint = projectShapesFingerprint([shape]);
    const sourceProjectId = projectInfoRef.current.projectId;
    const kind: CadModifierKind = params.kind === "fillet" ? "fillet" : params.kind === "chamfillet" ? "chamfillet" : "chamfer";
    const sharpAngle = Math.max(1, Math.min(CAD_MODIFIER_MAX_SHARP_ANGLE, mcpNumber(params.sharpAngle, 25)));
    const amount = Math.max(MIN_EDGE_MODIFIER_AMOUNT, mcpNumber(params.amount, 1));
    const chamferAngle = Math.max(kind === "chamfillet" ? 15 : 5, Math.min(kind === "chamfillet" ? 75 : 85, mcpNumber(params.chamferAngle, 45)));
    const quality: CadModifierQuality = params.quality === "draft" || params.quality === "fine" ? params.quality : "standard";
    const preserveEdgeSize = typeof params.preserveEdgeSize === "boolean" ? params.preserveEdgeSize : shape.edgeResizeMode === "preserve";
    // A fillet whose radius runs from `amount` at the edge's start to `endAmount` at its end (#687).
    const endAmount = kind === "fillet" && params.endAmount !== undefined && params.endAmount !== null ? Math.max(MIN_EDGE_MODIFIER_AMOUNT, mcpNumber(params.endAmount, amount)) : undefined;
    const { response, sourceParts } = await prepareCadModifierForMcp(shape, sharpAngle);
    const selectableIds = response.edges.filter((edge) => selectableCadModifierEdge(edge, sharpAngle)).map((edge) => edge.id);
    const requestedIds = mcpNumberArray(params.edgeIds);
    const selectedEdgeIds = params.edgeIds === "all" || params.allEdges === true
      ? selectableIds
      : params.edgeIds === "top"
        // The rim along the very top, as the panel's "Top edges" picks it (#154).
        ? topCadModifierEdgeIds(response.edges, selectableIds)
        : params.edgeIds === "bottom"
        // The foot along the very bottom, as the panel's "Bottom edges" picks it (#473).
        ? bottomCadModifierEdgeIds(response.edges, selectableIds)
        : params.edgeIds === "vertical"
          // Every edge that stands straight up, as the panel's "Vertical edges" picks it (#427).
          ? verticalCadModifierEdgeIds(response.edges, selectableIds)
          : requestedIds.filter((edgeId) => selectableIds.includes(edgeId));
    const missingIds = requestedIds.filter((edgeId) => !selectableIds.includes(edgeId));
    if (selectedEdgeIds.length === 0) {
      throw new Error("Select at least one valid highlighted edge ID");
    }
    if (missingIds.length > 0) {
      throw new Error(`These edge IDs are not selectable at the current threshold: ${missingIds.join(", ")}`);
    }
    if (endAmount !== undefined && selectedEdgeIds.length !== 1) {
      throw new Error("endAmount (a variable radius) works on exactly one edge id");
    }
    const previewResponse = await postCadModifierRequestAsync({
      type: "preview",
      kind,
      edgeIds: selectedEdgeIds,
      amount,
      quality,
      chamferAngle,
      ...(endAmount !== undefined ? { endAmount } : {}),
      minDeflection: shape.cadMeshDeflection,
    }, [], 30000);
    if (previewResponse.type !== "preview") {
      throw new Error("The CAD worker did not return an edge preview");
    }
    const rawPreview = shapeFromCadMesh(shape, previewResponse.positions, previewResponse.normals, previewResponse.indices, previewResponse.brep, previewResponse.deflection);
    if (!rawPreview) {
      throw new Error("The CAD kernel returned an empty edge treatment");
    }
    const preview = canonicalizeShape({
      ...rawPreview,
      cadDisplayEdges: cadDisplayEdgesForShape(rawPreview, previewResponse.displayEdges),
      cadDisplayEdgesVersion: 2 as const,
    });
    const feature = {
      kind,
      amount,
      edgeCount: selectedEdgeIds.length,
      edgeIds: [...selectedEdgeIds],
      ...(kind === "chamfer" || kind === "chamfillet" ? { chamferAngle } : {}),
      ...(endAmount !== undefined ? { endAmount } : {}),
    } satisfies NonNullable<WorkplaneShape["edgeTreatments"]>[number];
    const session: EdgeModifierSession = {
      kind,
      edges: response.edges,
      selectedEdgeIds,
      amount,
      sharpAngle,
      chamferAngle,
      endAmount: endAmount ?? null,
      quality,
      tangentChain: false,
      preserveEdgeSize,
      busy: false,
      prepared: true,
      error: null,
      preview,
      componentPreviews: cadModifierComponentPreviews(sourceParts, previewResponse.components, previewResponse.deflection),
    };
    const createdAt = Date.now();
    const groupedModifiedShape = groupedShapeWithComponentEdgeTreatment(shape, preview, sourceParts, session, feature, createdAt);
    const modifiedShape = groupedModifiedShape ?? shapeWithEdgeTreatmentRecord(
      bakedEdgeTreatmentPreview(preview, shape),
      shape,
      feature,
      preserveEdgeSize,
      createdAt,
    );
    const currentTarget = shapesRef.current.find((candidate) => candidate.id === shape.id);
    if (
      projectInfoRef.current.projectId !== sourceProjectId ||
      !currentTarget ||
      projectShapesFingerprint([currentTarget]) !== sourceFingerprint
    ) {
      throw new Error("The target object or project changed while the edge treatment was running; try again");
    }
    commitShapes(
      shapesRef.current.map((candidate) => candidate.id === shape.id ? modifiedShape : candidate),
      modifiedShape.id,
      selectedEdgeIds.length === 1
        ? t(kind === "fillet" ? "status.filletedMcpOne" : "status.chamferedMcpOne")
        : t(kind === "fillet" ? "status.filletedMcpMany" : "status.chamferedMcpMany", { count: selectedEdgeIds.length }),
    );
    return {
      object: mcpShapeSummary(modifiedShape),
      selectedEdgeIds,
      selectableEdgeIds: selectableIds,
    };
  }, [commitShapes, invalidateCadModifierSession, prepareCadModifierForMcp, postCadModifierRequestAsync]);

  /*
   * Aushoehlen laeuft ueber denselben Weg wie Fase und Rundung: der Koerper
   * geht als CAD-Teile an den Arbeiter, zurueck kommt ein exakter Koerper samt
   * BREP, und der Eintrag im Verlauf haelt den Zustand davor fest - so laesst
   * sich die Aushoehlung spaeter wieder entfernen wie jede Kantenbehandlung.
   * "Groesse beibehalten" ist fest an: die Wandstaerke soll beim Skalieren
   * bleiben, was sie ist.
   */
  // `watched` is the body in the scene the result replaces; it is the shape
  // itself, except when a resized hollow body is hollowed again from its state before.
  const shellShape = useCallback(async (shape: WorkplaneShape, thickness: number, openings: ShellOpenings, edges: ShellEdges = "round", watched: WorkplaneShape = shape) => {
    if (shape.locked || shape.hole || isNonSolidShapeKind(shape.kind)) {
      throw new Error("Select one unlocked solid object to hollow");
    }
    invalidateCadModifierSession();
    const sourceFingerprint = projectShapesFingerprint([watched]);
    const sourceProjectId = projectInfoRef.current.projectId;
    const { response, sourceParts } = await prepareCadModifierForMcp(shape, 25);
    const previewResponse = await postCadModifierRequestAsync({
      type: "preview",
      kind: "shell",
      edgeIds: [],
      amount: thickness,
      quality: "standard",
      chamferAngle: 45,
      shellOpenings: openings,
      shellEdges: edges,
      minDeflection: shape.cadMeshDeflection,
    }, [], 60000);
    if (previewResponse.type !== "preview") {
      throw new Error("The CAD worker did not return a hollowed body");
    }
    const rawPreview = shapeFromCadMesh(shape, previewResponse.positions, previewResponse.normals, previewResponse.indices, previewResponse.brep, previewResponse.deflection);
    if (!rawPreview) {
      throw new Error("The CAD kernel returned an empty body");
    }
    const preview = canonicalizeShape({
      ...rawPreview,
      cadDisplayEdges: cadDisplayEdgesForShape(rawPreview, previewResponse.displayEdges),
      cadDisplayEdgesVersion: 2 as const,
    });
    const feature = { kind: "shell" as const, amount: thickness, edgeCount: 0, openings, ...(edges === "sharp" ? { shellEdges: edges } : {}) } satisfies NonNullable<WorkplaneShape["edgeTreatments"]>[number];
    const session: EdgeModifierSession = {
      kind: "shell",
      edges: response.edges,
      selectedEdgeIds: [],
      amount: thickness,
      sharpAngle: 25,
      chamferAngle: 45,
      quality: "standard",
      tangentChain: false,
      preserveEdgeSize: true,
      busy: false,
      prepared: true,
      error: null,
      preview,
      componentPreviews: cadModifierComponentPreviews(sourceParts, previewResponse.components, previewResponse.deflection),
    };
    const createdAt = Date.now();
    const modifiedShape = groupedShapeWithComponentEdgeTreatment(shape, preview, sourceParts, session, feature, createdAt)
      ?? shapeWithEdgeTreatmentRecord(bakedEdgeTreatmentPreview(preview, shape), shape, feature, true, createdAt);
    const currentTarget = shapesRef.current.find((candidate) => candidate.id === watched.id);
    if (
      projectInfoRef.current.projectId !== sourceProjectId ||
      !currentTarget ||
      projectShapesFingerprint([currentTarget]) !== sourceFingerprint
    ) {
      throw new Error("The object or project changed while it was being hollowed; try again");
    }
    return modifiedShape;
  }, [invalidateCadModifierSession, prepareCadModifierForMcp, postCadModifierRequestAsync]);

  /*
   * Delete face (#451) goes the same way as hollowing: the body goes to the
   * worker as exact CAD parts, the faces go, and the faces around them close
   * the gap. The result is a fixed exact body; the history entry keeps the
   * body before, so the deletion can be undone like any edge treatment.
   * `picked` are the faces as the panel saw them: the body is prepared again
   * here, and a face that is not the same any more stops the deletion.
   */
  const deleteFacesShape = useCallback(async (shape: WorkplaneShape, faceIds: number[], picked?: CadFaceInfo[]) => {
    if (shape.locked || shape.hole || isNonSolidShapeKind(shape.kind)) {
      throw new Error("Select one unlocked solid object to delete faces from");
    }
    invalidateCadModifierSession();
    const sourceFingerprint = projectShapesFingerprint([shape]);
    const sourceProjectId = projectInfoRef.current.projectId;
    const { response, sourceParts } = await prepareCadModifierForMcp(shape, 25, { faces: true });
    const faces = response.faces?.list ?? [];
    const unknownIds = faceIds.filter((id) => !faces.some((face) => face.id === id));
    if (unknownIds.length > 0) {
      throw new Error(`These face IDs are not on the body: ${unknownIds.join(", ")}`);
    }
    const sameFace = (a: CadFaceInfo, b: CadFaceInfo) => a.kind === b.kind && Math.abs(a.area - b.area) <= 1e-6 * Math.max(1, a.area) &&
      Math.hypot(a.center.x - b.center.x, a.center.y - b.center.y, a.center.z - b.center.z) <= 1e-4;
    if (picked && faceIds.some((id) => !picked[id] || !sameFace(picked[id], faces[id]))) {
      throw new Error("The object or project changed while the faces were being deleted; try again");
    }
    // The preview stops after 45 s, so the editor usually answers before the MCP bridge gives up after a minute.
    const previewResponse = await postCadModifierRequestAsync({
      type: "preview",
      kind: "deleteFace",
      edgeIds: [],
      faceIds,
      // Only sets how finely the result is meshed: the standard quality's limit.
      amount: 1,
      quality: "standard",
      chamferAngle: 45,
      minDeflection: shape.cadMeshDeflection,
    }, [], 45000).catch((error: unknown) => {
      // On some faces of a detailed import the kernel does not finish; the worker is then stopped.
      if (error instanceof Error && error.message.includes("Timed out waiting for the CAD worker")) {
        throw new Error("Deleting these faces took too long and was stopped; the body is unchanged");
      }
      throw error;
    });
    if (previewResponse.type !== "preview") {
      throw new Error("The CAD worker did not return a body without the faces");
    }
    const rawPreview = shapeFromCadMesh(shape, previewResponse.positions, previewResponse.normals, previewResponse.indices, previewResponse.brep, previewResponse.deflection);
    if (!rawPreview) {
      throw new Error("The CAD worker did not return a body without the faces");
    }
    const preview = canonicalizeShape({
      ...rawPreview,
      cadDisplayEdges: cadDisplayEdgesForShape(rawPreview, previewResponse.displayEdges),
      cadDisplayEdgesVersion: 2 as const,
    });
    const feature = { kind: "deleteFace" as const, amount: 0, edgeCount: 0, faceIds: [...faceIds], faceCount: faceIds.length } satisfies NonNullable<WorkplaneShape["edgeTreatments"]>[number];
    const preserveEdgeSize = shape.edgeResizeMode === "preserve";
    const session: EdgeModifierSession = {
      kind: "deleteFace",
      edges: response.edges,
      selectedEdgeIds: [],
      amount: 0,
      sharpAngle: 25,
      chamferAngle: 45,
      quality: "standard",
      tangentChain: false,
      preserveEdgeSize,
      busy: false,
      prepared: true,
      error: null,
      preview,
      componentPreviews: cadModifierComponentPreviews(sourceParts, previewResponse.components, previewResponse.deflection),
    };
    const createdAt = Date.now();
    const modifiedShape = groupedShapeWithComponentEdgeTreatment(shape, preview, sourceParts, session, feature, createdAt)
      ?? shapeWithEdgeTreatmentRecord(bakedEdgeTreatmentPreview(preview, shape), shape, feature, preserveEdgeSize, createdAt);
    const currentTarget = shapesRef.current.find((candidate) => candidate.id === shape.id);
    if (
      projectInfoRef.current.projectId !== sourceProjectId ||
      !currentTarget ||
      projectShapesFingerprint([currentTarget]) !== sourceFingerprint
    ) {
      throw new Error("The object or project changed while the faces were being deleted; try again");
    }
    return modifiedShape;
  }, [invalidateCadModifierSession, prepareCadModifierForMcp, postCadModifierRequestAsync]);

  const startShellTool = useCallback(() => {
    if (shellTool) {
      setShellTool(null);
      return;
    }
    if (refuseLockedSelection()) return;
    if (selectedShapes.length !== 1 || !selectedShape || selectedShape.locked || selectedShape.hole || isNonSolidShapeKind(selectedShape.kind)) {
      setNotice(t("status.selectOneSolid", { kind: t("editor.tool.hollow") }));
      return;
    }
    if (selectedShape.groupOperation === "bundle") {
      setNotice(t("status.bundleNotOneBody"));
      return;
    }
    if (edgeModifier) invalidateCadModifierSession();
    closeSplit();
    const smallest = Math.min(shapeWidth(selectedShape), shapeDepth(selectedShape), selectedShape.height);
    setShellTool({ thickness: Math.max(0.2, Math.min(2, Number((smallest / 5).toFixed(1)))), openings: "top", edges: "round", busy: false, error: null });
  }, [refuseLockedSelection, closeSplit, edgeModifier, invalidateCadModifierSession, selectedShape, selectedShapes.length, shellTool]);

  const applyShellTool = useCallback(() => {
    if (!shellTool || shellTool.busy) return;
    const target = selectedShape;
    if (!target || selectedShapes.length !== 1) {
      setShellTool(null);
      return;
    }
    const { thickness, openings, edges } = shellTool;
    setShellTool((current) => current ? { ...current, busy: true, error: null } : current);
    void shellShape(target, thickness, openings, edges)
      .then((modifiedShape) => {
        commitShapes(
          shapesRef.current.map((candidate) => candidate.id === target.id ? modifiedShape : candidate),
          modifiedShape.id,
          // A sealed cavity looks like nothing happened (#658), so say where it went.
          t(shellOpenSides(openings).length === 0 ? "status.shelledClosed" : "status.shelled", { size: Number(thickness.toFixed(2)) }),
        );
        setShellTool(null);
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? localizedError(error.message) : String(error);
        setShellTool((current) => current ? { ...current, busy: false, error: message } : current);
      });
  }, [commitShapes, selectedShape, selectedShapes.length, shellShape, shellTool]);

  // The panel belongs to one selected body; a new selection closes it.
  useEffect(() => {
    setShellTool((current) => current && !current.busy ? null : current);
  }, [selectedShape?.id]);

  /*
   * Ein ausgehoehlter Koerper wird nach dem Groesse-Aendern neu ausgehoehlt:
   * aus seinem Zustand vor dem Aushoehlen, auf die neue Groesse gebracht. So
   * bleibt die Wand auch an runden Koerpern genau so dick wie gewaehlt. Das
   * Ergebnis ersetzt den Stand im Verlauf, statt einen eigenen Schritt
   * anzulegen - Rueckgaengig nimmt die Groessenaenderung als Ganzes zurueck.
   */
  /**
   * A body rebuilt in the background after a resize takes the place of the
   * stale one - in the scene and, while the history still shows the resize,
   * in that history entry, so one undo takes back the resize as a whole. If
   * the body changed meanwhile, nothing happens: the next round picks it up.
   */
  const replaceRebuiltShape = useCallback((staleId: string, fingerprint: string, rebuilt: WorkplaneShape) => {
    const current = shapesRef.current;
    if (!current.some((shape) => shape.id === staleId && projectShapesFingerprint([shape]) === fingerprint)) return false;
    const next = current.map((shape) => shape.id === staleId ? canonicalizeShape(rebuilt) : shape);
    const scene = editorHistoryEntry(current, selectedIdsRef.current, notesRef.current, placementWorkplaneRef.current);
    const entryNow = editorHistoryEntry(next, selectedIdsRef.current, notesRef.current, placementWorkplaneRef.current);
    const index = historyIndexRef.current;
    shapesRef.current = next;
    setShapes(next);
    if (historyRef.current[index]?.fingerprint === scene.fingerprint) {
      openGroupHistoryRef.current.set(entryNow.fingerprint, openGroupsRef.current);
      const entries = historyRef.current.map((candidate, candidateIndex) => candidateIndex === index ? entryNow : candidate);
      historyRef.current = entries;
      setHistory(entries);
    } else {
      appendHistoryEntry(entryNow);
    }
    syncProjectShapes(next);
    return true;
  }, [appendHistoryEntry, syncProjectShapes]);

  const shellRebuildBusyRef = useRef(false);
  const shellRebuildFailedRef = useRef(new Set<string>());
  const [shellRebuildRound, setShellRebuildRound] = useState(0);
  useEffect(() => {
    if (projectInteractionActive || edgeModifier || shellTool || deleteFaceTool || shellRebuildBusyRef.current) return;
    const stale = shapes.find((shape) => !shape.locked && shellNeedingRebuild(shape) && !shellRebuildFailedRef.current.has(projectShapesFingerprint([shape])));
    if (!stale) return;
    const timer = window.setTimeout(() => {
      const entry = shellNeedingRebuild(stale);
      if (!entry) return;
      const fingerprint = projectShapesFingerprint([stale]);
      const { amount, openings, shellEdges } = entry.feature;
      const applied = entry.appliedFrame!;
      const width = entry.before.width * shapeWidth(stale) / Math.max(0.001, applied.width);
      const depth = entry.before.depth * shapeDepth(stale) / Math.max(0.001, applied.depth);
      // A cylinder stays round; stretched unevenly it becomes the ellipse it now is.
      const source = entry.before.kind === "cylinder" && Math.abs(width - depth) > 0.005
        ? { ...entry, before: { ...entry.before, kind: "ellipse" as const } }
        : entry;
      const before = restoreShapeBeforeEdgeTreatment(stale, source);
      if (Math.abs(shapeWidth(before) - width) > 0.05 || Math.abs(shapeDepth(before) - depth) > 0.05) {
        shellRebuildFailedRef.current.add(fingerprint);
        setNotice(t("status.shellRebuildFailed"), true);
        setShellRebuildRound((round) => round + 1);
        return;
      }
      shellRebuildBusyRef.current = true;
      void shellShape(before, amount, openings ?? "none", shellEdges ?? "round", stale)
        .then((rebuilt) => {
          if (replaceRebuiltShape(stale.id, fingerprint, rebuilt)) setNotice(t("status.shellRebuilt", { size: Number(amount.toFixed(2)) }));
        })
        .catch((error: unknown) => {
          const message = error instanceof Error ? localizedError(error.message) : String(error);
          // Changed in the meantime: the next round picks up the newer state.
          if (/changed while/.test(message)) return;
          shellRebuildFailedRef.current.add(fingerprint);
          setNotice(t("status.shellRebuildFailed"), true);
        })
        .finally(() => {
          shellRebuildBusyRef.current = false;
          setShellRebuildRound((round) => round + 1);
        });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [deleteFaceTool, edgeModifier, projectInteractionActive, replaceRebuiltShape, shapes, shellRebuildRound, shellShape, shellTool]);

  /*
   * Ein Skizzenkoerper, dessen Groesse geaendert wurde, wird aus seiner Skizze
   * neu extrudiert - die Skizze auf die neue Groesse gestreckt. Sein gespeicherter
   * CAD-Koerper passte sonst nicht mehr, und ihn ungleich zu strecken liefert bei
   * Kurven einen ungueltigen Koerper: Fase und Rundung scheiterten (#115).
   */
  const sketchRebuildBusyRef = useRef(false);
  const sketchRebuildFailedRef = useRef(new Set<string>());
  const [sketchRebuildRound, setSketchRebuildRound] = useState(0);
  useEffect(() => {
    if (projectInteractionActive || edgeModifier || shellTool || deleteFaceTool || sketchActive || sketchRebuildBusyRef.current) return;
    const stale = shapes.find((shape) => sketchBodyStretch(shape) && !sketchRebuildFailedRef.current.has(projectShapesFingerprint([shape])));
    if (!stale?.sketchProfile) return;
    const timer = window.setTimeout(() => {
      const stretch = sketchBodyStretch(stale);
      if (!stretch || !stale.sketchProfile) return;
      const fingerprint = projectShapesFingerprint([stale]);
      sketchRebuildBusyRef.current = true;
      void cadShapeFromSketchProfile(stretchedSketchProfile(stale.sketchProfile, stretch.x, stretch.z), stretch.height, stale)
        .then((extrusion) => {
          replaceRebuiltShape(stale.id, fingerprint, placeSketchShape(extrusion, placementWorkplaneRef.current, stale));
        })
        .catch(() => {
          sketchRebuildFailedRef.current.add(fingerprint);
          setNotice(t("status.sketchRebuildFailed"), true);
        })
        .finally(() => {
          sketchRebuildBusyRef.current = false;
          setSketchRebuildRound((round) => round + 1);
        });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [deleteFaceTool, edgeModifier, projectInteractionActive, replaceRebuiltShape, shapes, shellTool, sketchActive, sketchRebuildRound]);

  useEffect(() => {
    const base = cadModifierBaseShapeRef.current;
    if (!edgeModifier || !base) return;
    const current = shapes.find((shape) => shape.id === base.id);
    if (current && projectShapesFingerprint([current]) === cadModifierBaseFingerprintRef.current) return;
    invalidateCadModifierSession();
    setNotice(t("status.edgeCancelledChanged"));
  }, [edgeModifier, invalidateCadModifierSession, shapes]);

  const applyEdgeModifier = useCallback(() => {
    const base = cadModifierBaseShapeRef.current;
    if (!edgeModifier?.preview || !base) {
      setNotice(t("status.waitForPreview"), true);
      return;
    }
    const feature = {
      kind: edgeModifier.kind,
      amount: edgeModifier.amount,
      edgeCount: edgeModifier.selectedEdgeIds.length,
      edgeIds: [...edgeModifier.selectedEdgeIds],
      ...(edgeModifier.kind === "chamfer" || edgeModifier.kind === "chamfillet" ? { chamferAngle: edgeModifier.chamferAngle } : {}),
      ...(edgeModifier.kind === "fillet" && edgeModifier.endAmount != null ? { endAmount: edgeModifier.endAmount } : {}),
    } satisfies NonNullable<WorkplaneShape["edgeTreatments"]>[number];
    const createdAt = Date.now();
    const previewShape = canonicalizeShape({
      ...edgeModifier.preview,
      cadDisplayEdges: edgeModifier.preview.cadDisplayEdges?.length
        ? edgeModifier.preview.cadDisplayEdges
        : cadDisplayEdgesAfterTreatment(edgeModifier.preview, edgeModifier),
      cadDisplayEdgesVersion: 2,
    });
    const groupedModifiedShape = groupedShapeWithComponentEdgeTreatment(
      base,
      previewShape,
      cadModifierSourcePartsRef.current,
      edgeModifier,
      feature,
      createdAt,
    );
    const modifiedShape: WorkplaneShape = groupedModifiedShape ?? shapeWithEdgeTreatmentRecord(
      bakedEdgeTreatmentPreview(previewShape, base),
      base,
      feature,
      edgeModifier.preserveEdgeSize,
      createdAt,
    );
    commitShapes(
      shapes.map((shape) => shape.id === base.id ? modifiedShape : shape),
      base.id,
      edgeModifier.selectedEdgeIds.length === 1
        ? t(edgeModifier.kind === "fillet" ? "status.filletedOne" : edgeModifier.kind === "chamfillet" ? "status.chamfilletedOne" : "status.chamferedOne")
        : t(edgeModifier.kind === "fillet" ? "status.filletedMany" : edgeModifier.kind === "chamfillet" ? "status.chamfilletedMany" : "status.chamferedMany", {
            count: edgeModifier.selectedEdgeIds.length,
          }),
    );
    invalidateCadModifierSession();
    // The tool stays open for the next feature (#538): again on the new body, with the same kind and size and no edge
    // picked, as if it had been closed and opened anew. "Done", Esc or the cross closes it.
    edgeEditRequestRef.current = {
      shapeId: base.id,
      historyLength: modifiedShape.edgeTreatmentHistory?.length ?? 0,
      preset: { kind: edgeModifier.kind, amount: edgeModifier.amount, chamferAngle: edgeModifier.chamferAngle, endAmount: edgeModifier.endAmount ?? null, edgeIds: [] },
    };
    setEdgeEditRound((round) => round + 1);
  }, [commitShapes, edgeModifier, invalidateCadModifierSession, shapes]);

  useEffect(() => {
    if (!edgeModifier) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        cancelEdgeModifier();
      } else if (event.key === "Enter" && edgeModifier.preview && edgeModifier.selectedEdgeIds.length > 0 && !edgeModifier.busy && !edgeModifier.error) {
        const target = event.target instanceof HTMLElement ? event.target : null;
        if (target?.closest("input, select, textarea, button, [contenteditable='true']")) return;
        event.preventDefault();
        applyEdgeModifier();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [applyEdgeModifier, cancelEdgeModifier, edgeModifier]);

  /*
   * Die einzige Stelle, die eine Vorschau losschickt. Sie geht ueber die
   * Warteschlange, damit nie mehr als eine Rechnung unterwegs ist: der Arbeiter
   * arbeitet alles ab, was er bekommt, und auf einem langsamen Rechner wird aus
   * einem Zug am Schieberegler sonst eine Warteschlange von Minuten.
   */
  const sendCadPreview = useCallback((payload: CadPreviewPayload) => {
    const requestId = postCadModifierRequest(payload);
    if (requestId === null) {
      const message = cadModifierWorkerFailureMessage();
      setEdgeModifier((current) => current ? { ...current, busy: false, prepared: false, preview: null, error: message } : current);
      setNotice(message);
      return null;
    }
    cadModifierLatestPreviewRef.current = requestId;
    armCadModifierWatchdog(requestId, "preview");
    setEdgeModifier((current) => current ? { ...current, busy: true, error: null } : current);
    return requestId;
  }, [armCadModifierWatchdog, postCadModifierRequest]);

  useEffect(() => {
    cadPreviewSendRef.current = sendCadPreview;
  }, [sendCadPreview]);

  /** Wer die Auswahl leert, will, dass Schluss ist - auch mit dem, was schon laeuft. */
  const discardPendingCadPreviews = useCallback(() => {
    const queue = cadPreviewQueueRef.current;
    if (queue.inFlightId === null && queue.queuedPayload === null) return;
    queue.reset();
    clearCadModifierWatchdog();
    const requestId = cadModifierRequestRef.current + 1;
    cadModifierRequestRef.current = requestId;
    cadModifierLatestPreviewRef.current = requestId;
    setEdgeModifier((current) => current?.busy ? { ...current, busy: false } : current);
  }, [clearCadModifierWatchdog]);

  useEffect(() => {
    if (!edgeModifier?.prepared) return;
    if (edgeModifier.selectedEdgeIds.length === 0) {
      discardPendingCadPreviews();
      // Ein neuer Wert ohne markierte Kante hat nichts zu rechnen - sonst
      // bliebe der Kreis auf "Anwenden" fuer immer stehen.
      setEdgeModifier((current) => current?.busy && current.selectedEdgeIds.length === 0 ? { ...current, busy: false } : current);
      return;
    }
    const timer = window.setTimeout(() => {
      // Read from the ref: the working selection moves with every preview and
      // must not send a new one by itself.
      const addedEdgeIds = edgeModifierRef.current ? edgesAddedSinceWorking(edgeModifierRef.current) : [];
      cadPreviewQueueRef.current.request({
        type: "preview",
        kind: edgeModifier.kind,
        edgeIds: edgeModifier.selectedEdgeIds,
        amount: edgeModifier.amount,
        quality: edgeModifier.quality,
        chamferAngle: edgeModifier.chamferAngle,
        ...(edgeModifier.kind === "fillet" && edgeModifier.endAmount != null ? { endAmount: edgeModifier.endAmount } : {}),
        minDeflection: cadModifierBaseShapeRef.current?.cadMeshDeflection,
        ...(addedEdgeIds.length ? { addedEdgeIds } : {}),
      });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [discardPendingCadPreviews, edgeModifier?.amount, edgeModifier?.chamferAngle, edgeModifier?.endAmount, edgeModifier?.kind, edgeModifier?.prepared, edgeModifier?.quality, edgeModifier?.selectedEdgeIds]);

  const snapSelected = useCallback(() => {
    if (!hasSelection) {
      setNotice(t("status.selectShapeFirst"));
      return;
    }
    if (refuseLockedSelection()) return;
    const selected = new Set(selectedIds);
    const grid = visibleGridStep(workspaceSettings);
    commitShapes(
      shapes.map((shape) =>
        selected.has(shape.id) && !shape.locked
          ? snapShapeFootprintToVisibleGrid(shape, meshAabb(shape), workspaceSettings)
          : shape,
      ),
      selectedIds,
      selectedShapes.length === 1
        ? t("status.snappedOne", { grid })
        : t("status.snappedMany", { count: selectedShapes.length, grid }),
    );
  }, [refuseLockedSelection, commitShapes, hasSelection, selectedIds, selectedShapes.length, shapes, workspaceSettings]);

  const toggleHidden = useCallback(() => {
    if (!hasSelection) {
      setNotice(t("status.selectShapeFirst"));
      return;
    }
    const selected = new Set(selectedIds);
    const shouldHide = selectedShapes.some((shape) => !shape.hidden);
    commitShapes(
      shapes.map((shape) => (selected.has(shape.id) ? { ...shape, hidden: shouldHide } : shape)),
      selectedIds,
      shouldHide ? t("status.selectionHidden") : t("status.selectionShown"),
    );
  }, [commitShapes, hasSelection, selectedIds, selectedShapes, shapes]);

  const showHidden = useCallback(() => {
    const hiddenCount = shapes.filter((shape) => shape.hidden).length;
    if (hiddenCount === 0) {
      setNotice(t("status.noHiddenShapes"));
      return;
    }
    commitShapes(
      shapes.map((shape) => ({ ...shape, hidden: false })),
      selectedIds,
      hiddenCount === 1 ? t("status.shownHiddenOne") : t("status.shownHiddenMany", { count: hiddenCount }),
    );
  }, [commitShapes, selectedIds, shapes]);
  showHiddenRef.current = showHidden;

  const toggleLocked = useCallback(() => {
    if (!hasSelection) {
      setNotice(t("status.selectShapeFirst"));
      return;
    }
    const selected = new Set(selectedIds);
    const shouldLock = selectedShapes.some((shape) => !shape.locked);
    commitShapes(
      shapes.map((shape) => (selected.has(shape.id) ? { ...shape, locked: shouldLock } : shape)),
      selectedIds,
      shouldLock ? t("status.selectionLockedNow") : t("status.selectionUnlocked"),
    );
  }, [commitShapes, hasSelection, selectedIds, selectedShapes, shapes]);

  const toggleOutliner = useCallback(() => {
    setOutlinerOpen((open) => !open);
  }, []);

  const toggleShapeLockById = useCallback((id: string) => {
    const target = shapes.find((s) => s.id === id);
    if (!target) return;
    const nextLocked = !target.locked;
    const shapeLabel = displayShapeName(target);
    commitShapes(
      shapes.map((s) => (s.id === id ? { ...s, locked: nextLocked } : s)),
      selectedIds,
      nextLocked ? t("status.shapeLocked", { name: shapeLabel }) : t("status.shapeUnlocked", { name: shapeLabel }),
    );
  }, [commitShapes, selectedIds, shapes]);

  const toggleShapeHiddenById = useCallback((id: string) => {
    const target = shapes.find((s) => s.id === id);
    if (!target) return;
    const nextHidden = !target.hidden;
    const shapeLabel = displayShapeName(target);
    commitShapes(
      shapes.map((s) => (s.id === id ? { ...s, hidden: nextHidden } : s)),
      nextHidden ? selectedIds.filter((selId) => selId !== id) : selectedIds,
      nextHidden ? t("status.shapeHidden", { name: shapeLabel }) : t("status.shapeShown", { name: shapeLabel }),
    );
  }, [commitShapes, selectedIds, shapes]);

  const renameShapeById = useCallback((id: string, name: string) => {
    updateShape(id, { name });
  }, [updateShape]);

  const setSelectionHoleMode = useCallback(
    (hole: boolean) => {
      if (!hasSelection) {
        setNotice(t("status.selectShapeFirst"));
        return;
      }
      if (refuseLockedSelection()) return;
      const selected = new Set(selectedIds);
      commitShapes(
        shapes.map((shape) =>
          selected.has(shape.id) && !shape.locked
            ? withHoleMode(shape, hole)
            : shape,
        ),
        selectedIds,
        hole ? t("status.selectionToHole") : t("status.selectionToSolid"),
      );
    },
    [refuseLockedSelection, commitShapes, hasSelection, selectedIds, shapes],
  );

  /** The T key (#276): every selected part see-through, or, when any already is, every part opaque. */
  const toggleSelectionTransparency = useCallback(() => {
    if (!hasSelection) {
      setNotice(t("status.selectShapeFirst"));
      return;
    }
    if (refuseLockedSelection()) return;
    const selected = new Set(selectedIds);
    const eligible = (shape: WorkplaneShape) => selected.has(shape.id) && !isNonSolidShapeKind(shape.kind);
    const transparent = nextSelectionTransparency(shapes.filter(eligible));
    if (transparent === null) return;
    commitShapes(
      shapes.map((shape) => (eligible(shape) && !shape.locked && !shape.hole ? { ...shape, transparent: transparent || undefined } : shape)),
      selectedIds,
      transparent ? t("status.selectionTransparent") : t("status.selectionOpaque"),
    );
  }, [refuseLockedSelection, commitShapes, hasSelection, selectedIds, shapes]);

  /** Multicolor for the selected groups (Shift+M): each part in its own colour, or one colour for the group (#367). */
  const toggleSelectionMulticolor = useCallback(() => {
    if (!hasSelection) {
      setNotice(t("status.selectShapeFirst"));
      return;
    }
    if (refuseLockedSelection()) return;
    const selected = new Set(selectedIds);
    const eligible = (shape: WorkplaneShape) => selected.has(shape.id) && !shape.locked && canToggleGroupColors(shape);
    const groups = shapes.filter(eligible);
    if (groups.length === 0) {
      setNotice(t("status.multicolorNeedsGroup"));
      return;
    }
    // If every group shows its parts' colours, switch to one colour; otherwise to the parts' colours.
    const multicolor = !groups.every((shape) => groupShowsPartColors(shape));
    commitShapes(
      shapes.map((shape) => (eligible(shape) ? { ...shape, multicolor } : shape)),
      selectedIds,
      multicolor ? t("status.selectionMulticolor") : t("status.selectionOneColor"),
    );
  }, [refuseLockedSelection, commitShapes, hasSelection, selectedIds, shapes]);

  /** One colour for every selected part (#183); a group shows it whole. */
  const setSelectionColor = useCallback(
    (color: string) => {
      if (!hasSelection) {
        setNotice(t("status.selectShapeFirst"));
        return;
      }
      if (refuseLockedSelection()) return;
      const selected = new Set(selectedIds);
      commitShapes(
        shapes.map((shape) => {
          if (!selected.has(shape.id) || isNonSolidShapeKind(shape.kind)) return shape;
          const solid = withHoleMode(shape, false, color);
          return canonicalizeShape({ ...solid, color, ...(canToggleGroupColors(solid) ? { multicolor: false } : {}) });
        }),
        selectedIds,
        t("status.selectionColored", { count: selected.size }),
      );
    },
    [refuseLockedSelection, commitShapes, hasSelection, selectedIds, shapes],
  );

  const cutSelected = useCallback(() => {
    if (!hasSelection) {
      setNotice(t("status.selectShapeFirst"));
      return;
    }
    if (refuseLockedSelection()) return;
    const selected = new Set(selectedIds);
    const copiedAt = Date.now();
    clipboardCopiedAtRef.current = copiedAt;
    setClipboard(selectedShapes);
    writeSharedClipboard(selectedShapes, copiedAt);
    commitShapes(
      shapes.filter((shape) => !selected.has(shape.id)),
      [],
      selectedShapes.length === 1 ? t("status.cutOne") : t("status.cutMany", { count: selectedShapes.length }),
    );
  }, [refuseLockedSelection, commitShapes, hasSelection, selectedIds, selectedShapes, shapes]);

  const raiseSelected = useCallback(
    (delta: number) => {
      if (!hasSelection) {
        return;
      }
      if (refuseLockedSelection()) return;
      const selected = new Set(selectedIds);
      const normal = placementWorkplane.normal;
      commitShapes(
        shapes.map((shape) =>
          selected.has(shape.id) && !shape.locked
            ? {
                ...shape,
                x: cleanNearZero(shape.x + normal.x * delta),
                z: cleanNearZero(shape.z + normal.z * delta),
                elevation: cleanNearZero((shape.elevation ?? 0) + normal.y * delta),
              }
            : shape,
        ),
        selectedIds,
        delta > 0 ? t("status.selectionRaised") : t("status.selectionLowered"),
        `move:${selectedIds.join(",")}`,
      );
    },
    [refuseLockedSelection, commitShapes, hasSelection, placementWorkplane, selectedIds, shapes],
  );

  const dropSelectedToWorkplane = useCallback(() => {
    if (!hasSelection) {
      setNotice(t("status.selectShapeFirst"));
      return;
    }
    if (refuseLockedSelection()) return;
    const selected = new Set(selectedIds);
    commitShapes(
      shapes.map((shape) => {
        if (!selected.has(shape.id) || shape.locked) return shape;
        const translation = translationToWorkplane(
          placementWorkplane,
          meshForShape(shape).vertices.map(([x, y, z]) => ({ x, y, z })),
        );
        return {
          ...shape,
          x: cleanNearZero(shape.x + translation.x),
          z: cleanNearZero(shape.z + translation.z),
          elevation: cleanNearZero((shape.elevation ?? 0) + translation.y),
        };
      }),
      selectedIds,
      t("status.droppedToWorkplane"),
    );
  }, [refuseLockedSelection, commitShapes, hasSelection, placementWorkplane, selectedIds, shapes]);

  // "Lay flat": click a face of the selection, the selection turns so that
  // face lies on the workplane, and drops onto it - one undo step.
  const toggleLayFlat = useCallback(() => {
    if (layFlatPickMode) {
      setLayFlatPickMode(false);
      setNotice(t("status.layFlatCancelled"));
      return;
    }
    if (!hasSelection) {
      setNotice(t("status.selectShapeFirst"));
      return;
    }
    if (refuseLockedSelection()) return;
    setAlignMode(false);
    setMirrorMode(false);
    setPivotPickMode(false);
    setArrayTool(null);
    closeSplit();
    stopCruise();
    setLayFlatPickMode(true);
    setNotice(t("status.layFlatStart"));
  }, [refuseLockedSelection, closeSplit, hasSelection, layFlatPickMode, stopCruise]);

  const layFlatOnFace = useCallback((pick: LayFlatPick | null) => {
    setLayFlatPickMode(false);
    const selected = new Set(selectedIds);
    if (!pick || !selected.has(pick.shapeId)) {
      setNotice(t("status.layFlatMissed"));
      return;
    }
    const movable = selectedShapes;
    if (movable.some((shape) => shape.locked)) {
      setNotice(t("status.objectLocked"));
      return;
    }
    commitShapes(laidFlatShapes(shapes, movable, pick.normal, placementWorkplane), selectedIds, t("status.laidFlat"));
  }, [commitShapes, placementWorkplane, selectedIds, selectedShapes, shapes]);

  const toggleMateFaces = useCallback(() => {
    if (mateTool) {
      setMateTool(null);
      setNotice(t("status.mateCancelled"));
      return;
    }
    if (refuseLockedSelection()) return;
    const source = selectedShapes.length === 1 ? selectedShapes[0] : null;
    if (!source) {
      setNotice(t("status.mateSelectOne"));
      return;
    }
    closeSplit();
    stopCruise();
    setPivotPickMode(false);
    setLayFlatPickMode(false);
    setMateTool({ sourceId: source.id, step: "source", source: null, target: null, mode: "against", gap: 0 });
    setNotice(t("status.mateStart"));
  }, [refuseLockedSelection, closeSplit, mateTool, selectedShapes, stopCruise]);

  const pickMateFace = useCallback((pick: LayFlatPick | null) => {
    if (!mateTool || mateTool.step === "ready") return;
    if (mateTool.step === "source") {
      if (!pick || pick.shapeId !== mateTool.sourceId) {
        setNotice(t("status.mateMissedSource"));
        return;
      }
      setMateTool({ ...mateTool, step: "target", source: pick });
      setNotice(t("status.mateTarget"));
      return;
    }
    if (!pick || pick.shapeId === mateTool.sourceId) {
      setNotice(t("status.mateMissedTarget"));
      return;
    }
    setMateTool({ ...mateTool, step: "ready", target: pick });
    setNotice(t("status.mateReady"));
  }, [mateTool]);

  const applyMateFaces = useCallback(() => {
    if (!mateTool?.source || !mateTool.target) return;
    const { source, target, mode, gap } = mateTool;
    setMateTool(null);
    commitShapes(matedShapes(shapes, source, target, mode, gap), [source.shapeId], t("status.mated"));
  }, [commitShapes, mateTool, shapes]);

  // The tool belongs to the body it was started for.
  useEffect(() => {
    if (mateTool && (selectedIds.length !== 1 || selectedIds[0] !== mateTool.sourceId)) setMateTool(null);
  }, [mateTool, selectedIds]);

  // "Hole pattern" (#223): pick a flat face of the selected body, set the holes, create them as holes grouped with the body.
  const toggleHolePattern = useCallback(() => {
    if (holePatternTool) {
      setHolePatternTool(null);
      setNotice(t("status.holePatternCancelled"));
      return;
    }
    if (refuseLockedSelection()) return;
    const source = selectedShapes.length === 1 ? selectedShapes[0] : null;
    if (!source) {
      setNotice(t("status.holePatternSelectOne"));
      return;
    }
    if (source.hole || isNonSolidShapeKind(source.kind)) {
      setNotice(t("status.holePatternNeedsSolid"));
      return;
    }
    if (edgeModifier || shellTool || deleteFaceTool || splitSession || simplifyToolId) {
      setNotice(t("status.holePatternOtherTool"));
      return;
    }
    stopCruise();
    setAlignMode(false);
    setMirrorMode(false);
    setPivotPickMode(false);
    setLayFlatPickMode(false);
    setMateTool(null);
    setArrayTool(null);
    setScalePercentTool(null);
    setHolePatternTool({ sourceId: source.id, step: "pick", face: null, settings: holePatternSettingsRef.current, busy: false });
    setNotice(t("status.holePatternStart"));
  }, [refuseLockedSelection, deleteFaceTool, edgeModifier, holePatternTool, selectedShapes, shellTool, simplifyToolId, splitSession, stopCruise]);

  const pickHolePatternFace = useCallback((pick: LayFlatPick | null) => {
    if (!holePatternTool || holePatternTool.step !== "pick") return;
    const source = shapesRef.current.find((shape) => shape.id === holePatternTool.sourceId);
    if (!pick || !source || pick.shapeId !== source.id) {
      setNotice(t("status.holePatternMissed"));
      return;
    }
    const read = readPerforableFace(worldTrianglePositions(source), pick.point, pick.normal);
    if (!read.ok) {
      setNotice(t(read.reason === "curved" ? "status.holePatternCurved" : "status.holePatternMissed"));
      return;
    }
    setHolePatternTool({ ...holePatternTool, step: "ready", face: read.face });
    setNotice(t("status.holePatternReady"));
  }, [holePatternTool]);

  const changeHolePatternSettings = useCallback((patch: Partial<HolePatternSettings>) => {
    setHolePatternTool((current) => {
      if (!current) return current;
      // A slot or a rectangle starts out longer than high, with room for it, unless it was sized by hand.
      const longForm = (patch.form === "slot" || patch.form === "rectangle")
        && current.settings.form !== "slot" && current.settings.form !== "rectangle"
        && current.settings.height === current.settings.size;
      const start = longForm
        ? (patch.form === "slot" ? { size: 12, height: 5, spacing: Math.max(current.settings.spacing, 15) } : { size: 10, height: 5, spacing: Math.max(current.settings.spacing, 13) })
        : {};
      const settings = normalizeHolePattern({ ...current.settings, ...start, ...patch });
      holePatternSettingsRef.current = settings;
      return { ...current, settings };
    });
  }, []);

  const applyHolePattern = useCallback(async () => {
    const tool = holePatternTool;
    if (!tool?.face || tool.busy) return;
    const source = shapesRef.current.find((shape) => shape.id === tool.sourceId);
    if (!source) return;
    const plan = holePatternShapes(tool.face, tool.settings, t("holePattern.holeName"));
    if (plan.tooMany || plan.holes.length === 0) {
      setNotice(t(plan.tooMany ? "status.holePatternTooMany" : "status.holePatternNone"));
      return;
    }
    setHolePatternTool({ ...tool, busy: true });
    const sourceFingerprint = projectShapesFingerprint(shapesRef.current);
    const sourceProjectId = projectInfoRef.current.projectId;
    const result = await buildGroupedShapeFromSelection([source, ...plan.holes], workspaceSettingsRef.current.booleanTriangleLimit);
    if (projectInfoRef.current.projectId !== sourceProjectId || projectShapesFingerprint(shapesRef.current) !== sourceFingerprint) {
      setHolePatternTool(null);
      setNotice(t("status.groupChanged"));
      return;
    }
    if (!result.group) {
      setHolePatternTool((current) => (current ? { ...current, busy: false } : current));
      setNotice(result.failureNotice);
      return;
    }
    const editableGroup = canonicalizeShape({ ...result.group, groupOperation: "group" });
    setHolePatternTool(null);
    commitShapes(
      [...shapesRef.current.filter((shape) => shape.id !== source.id), editableGroup],
      editableGroup.id,
      t("status.holePatternCreated", { count: plan.holes.length }),
    );
  }, [commitShapes, holePatternTool]);

  // The tool belongs to the body it was started for, and gives way to the tools that pick faces or open panels of their own.
  useEffect(() => {
    if (!holePatternTool) return;
    if (
      selectedIds.length !== 1
      || selectedIds[0] !== holePatternTool.sourceId
      || mateTool || layFlatPickMode || pivotPickMode || arrayTool || scalePercentTool
      || shellTool || deleteFaceTool || edgeModifier || splitSession || simplifyToolId
    ) {
      setHolePatternTool(null);
    }
  }, [arrayTool, deleteFaceTool, edgeModifier, holePatternTool, layFlatPickMode, mateTool, pivotPickMode, scalePercentTool, selectedIds, shellTool, simplifyToolId, splitSession]);

  // "Face" (#404): pick a flat face of the selected body, then push it out or cut a pocket in, with an inset from its edge.
  const toggleFaceTool = useCallback(() => {
    if (faceTool) {
      setFaceTool(null);
      setNotice(t("status.faceToolCancelled"));
      return;
    }
    if (refuseLockedSelection()) return;
    const source = selectedShapes.length === 1 ? selectedShapes[0] : null;
    if (!source) {
      setNotice(t("status.faceToolSelectOne"));
      return;
    }
    if (source.hole || isNonSolidShapeKind(source.kind)) {
      setNotice(t("status.faceToolNeedsSolid"));
      return;
    }
    if (edgeModifier || shellTool || deleteFaceTool || splitSession || simplifyToolId) {
      setNotice(t("status.faceToolOtherTool"));
      return;
    }
    stopCruise();
    setHolePatternTool(null);
    setAlignMode(false);
    setMirrorMode(false);
    setPivotPickMode(false);
    setLayFlatPickMode(false);
    setMateTool(null);
    setArrayTool(null);
    setScalePercentTool(null);
    // Always from the defaults: an inset that fitted the last face can be too wide for this one.
    setFaceTool({ sourceId: source.id, step: "pick", face: null, settings: DEFAULT_FACE_TOOL, busy: false });
    setNotice(t("status.faceToolStart"));
  }, [refuseLockedSelection, deleteFaceTool, edgeModifier, faceTool, selectedShapes, shellTool, simplifyToolId, splitSession, stopCruise]);

  const pickFaceToolFace = useCallback((pick: LayFlatPick | null) => {
    if (!faceTool || faceTool.step !== "pick") return;
    const source = shapesRef.current.find((shape) => shape.id === faceTool.sourceId);
    if (!pick || !source || pick.shapeId !== source.id) {
      setNotice(t("status.faceToolMissed"));
      return;
    }
    const read = readPerforableFace(worldTrianglePositions(source), pick.point, pick.normal);
    if (!read.ok) {
      setNotice(t(read.reason === "curved" ? "status.faceToolCurved" : "status.faceToolMissed"));
      return;
    }
    setFaceTool({ ...faceTool, step: "ready", face: read.face, settings: faceToolSettingsOn(read.face, faceTool.settings) });
    setNotice(t("status.faceToolReady"));
  }, [faceTool]);

  const changeFaceToolSettings = useCallback((patch: Partial<FaceToolSettings>) => {
    setFaceTool((current) => {
      if (!current) return current;
      const normalized = normalizeFaceTool({ ...current.settings, ...patch });
      // A pocket goes no deeper than the body behind the picked face; the panel shows what it gets.
      const settings = current.face ? faceToolSettingsOn(current.face, normalized) : normalized;
      return { ...current, settings };
    });
  }, []);

  // The body or pocket is built by the CAD worker, so the preview follows the numbers a moment later.
  useEffect(() => {
    const run = ++faceToolPreviewRunRef.current;
    const face = faceTool?.face;
    const source = faceTool ? shapesRef.current.find((shape) => shape.id === faceTool.sourceId) : null;
    if (!face || !faceTool || !source) {
      setFaceToolPreview(null);
      return;
    }
    const settings = faceTool.settings;
    const timer = window.setTimeout(() => {
      void faceToolBody(source, face, settings, { name: t("faceTool.bodyName"), color: source.color, id: "face-tool-preview" })
        .then((shape) => {
          if (faceToolPreviewRunRef.current === run) setFaceToolPreview({ shape, empty: !shape });
        })
        .catch(() => {
          // A build that failed is not an empty face: Create stays and says what went wrong.
          if (faceToolPreviewRunRef.current === run) setFaceToolPreview(null);
        });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [faceTool?.face, faceTool?.settings, faceTool?.sourceId]);

  const applyFaceTool = useCallback(async () => {
    const tool = faceTool;
    if (!tool?.face || tool.busy) return;
    const source = shapesRef.current.find((shape) => shape.id === tool.sourceId);
    if (!source) return;
    setFaceTool({ ...tool, busy: true });
    const sourceFingerprint = projectShapesFingerprint(shapesRef.current);
    const sourceProjectId = projectInfoRef.current.projectId;
    let body: WorkplaneShape | null;
    try {
      body = await faceToolBody(source, tool.face, tool.settings, {
        name: t(tool.settings.direction === "in" ? "faceTool.pocketName" : "faceTool.bodyName"),
        color: source.color,
      });
    } catch (error) {
      setFaceTool((current) => (current ? { ...current, busy: false } : current));
      setNotice(t("status.faceToolFailed", { message: localizedError(error instanceof Error ? error.message : String(error)) }), true);
      return;
    }
    if (!body) {
      setFaceTool((current) => (current ? { ...current, busy: false } : current));
      setNotice(t("faceTool.empty"));
      return;
    }
    const result = await buildGroupedShapeFromSelection([source, body], workspaceSettingsRef.current.booleanTriangleLimit);
    if (projectInfoRef.current.projectId !== sourceProjectId || projectShapesFingerprint(shapesRef.current) !== sourceFingerprint) {
      setFaceTool(null);
      setNotice(t("status.groupChanged"));
      return;
    }
    if (!result.group) {
      setFaceTool((current) => (current ? { ...current, busy: false } : current));
      setNotice(result.failureNotice);
      return;
    }
    const editableGroup = canonicalizeShape({ ...result.group, groupOperation: "group" });
    setFaceTool(null);
    commitShapes(
      [...shapesRef.current.filter((shape) => shape.id !== source.id), editableGroup],
      editableGroup.id,
      t(tool.settings.direction === "in" ? "status.faceToolPocketCreated" : "status.faceToolCreated", { depth: Number(faceToolSettingsOn(tool.face, tool.settings).depth.toFixed(2)) }),
    );
  }, [commitShapes, faceTool]);

  // Like the hole pattern, the tool belongs to the body it was started for and gives way to the other tools.
  useEffect(() => {
    if (!faceTool) return;
    if (
      selectedIds.length !== 1
      || selectedIds[0] !== faceTool.sourceId
      || mateTool || layFlatPickMode || pivotPickMode || arrayTool || scalePercentTool
      || shellTool || deleteFaceTool || edgeModifier || splitSession || simplifyToolId || holePatternTool
    ) {
      setFaceTool(null);
    }
  }, [arrayTool, deleteFaceTool, edgeModifier, faceTool, holePatternTool, layFlatPickMode, mateTool, pivotPickMode, scalePercentTool, selectedIds, shellTool, simplifyToolId, splitSession]);

  // The worker reads the body's faces for picking; the tool starts empty and fills in when they come.
  // `error`: a refusal that is still to be read stays in the panel while the faces come again.
  const readDeleteFaces = useCallback((target: WorkplaneShape, error: string | null = null) => {
    const run = deleteFaceRunRef.current + 1;
    deleteFaceRunRef.current = run;
    setDeleteFaceTool({ shapeId: target.id, fingerprint: projectShapesFingerprint([target]), faces: null, selectedFaceIds: [], busy: false, error });
    void prepareCadModifierForMcp(target, 25, { faces: true, faceMesh: true })
      .then(({ response }) => {
        if (deleteFaceRunRef.current !== run) return;
        const faces = response.faces?.mesh ? response.faces : null;
        setDeleteFaceTool((current) => current && current.shapeId === target.id ? { ...current, faces, error: faces ? current.error : "The faces of this body could not be read" } : current);
      })
      .catch((error: unknown) => {
        if (deleteFaceRunRef.current !== run) return;
        const message = error instanceof Error ? error.message : String(error);
        setDeleteFaceTool((current) => current && current.shapeId === target.id ? { ...current, error: message } : current);
      });
  }, [prepareCadModifierForMcp]);

  // "Delete face" (#451): the worker reads the selected body's faces; clicks pick them, Delete closes the gap.
  const startDeleteFaceTool = useCallback(() => {
    if (deleteFaceTool) {
      if (!deleteFaceTool.busy) setDeleteFaceTool(null);
      return;
    }
    if (refuseLockedSelection()) return;
    if (selectedShapes.length !== 1 || !selectedShape || selectedShape.locked || selectedShape.hole || isNonSolidShapeKind(selectedShape.kind)) {
      setNotice(t("status.selectOneSolid", { kind: t("editor.tool.deleteFace") }));
      return;
    }
    if (selectedShape.groupOperation === "bundle") {
      setNotice(t("status.bundleNotOneBody"));
      return;
    }
    if (edgeModifier) invalidateCadModifierSession();
    closeSplit();
    stopCruise();
    setShellTool(null);
    setFaceTool(null);
    setHolePatternTool(null);
    setAlignMode(false);
    setMirrorMode(false);
    setPivotPickMode(false);
    setLayFlatPickMode(false);
    setMateTool(null);
    setArrayTool(null);
    setScalePercentTool(null);
    readDeleteFaces(selectedShape);
  }, [refuseLockedSelection, closeSplit, deleteFaceTool, edgeModifier, invalidateCadModifierSession, readDeleteFaces, selectedShape, selectedShapes.length, stopCruise]);

  const toggleDeleteFace = useCallback((faceId: number) => {
    setDeleteFaceTool((current) => {
      if (!current || current.busy || !current.faces) return current;
      const selectedFaceIds = current.selectedFaceIds.includes(faceId)
        ? current.selectedFaceIds.filter((id) => id !== faceId)
        : [...current.selectedFaceIds, faceId];
      return { ...current, selectedFaceIds, error: null };
    });
  }, []);

  const applyDeleteFaceTool = useCallback(() => {
    if (!deleteFaceTool || deleteFaceTool.busy || !deleteFaceTool.faces || deleteFaceTool.selectedFaceIds.length === 0) return;
    const target = shapesRef.current.find((shape) => shape.id === deleteFaceTool.shapeId);
    if (!target || selectedShapes.length !== 1) {
      setDeleteFaceTool(null);
      return;
    }
    if (refuseLockedSelection()) return;
    const { selectedFaceIds, faces } = deleteFaceTool;
    const run = deleteFaceRunRef.current + 1;
    deleteFaceRunRef.current = run;
    setDeleteFaceTool((current) => current ? { ...current, busy: true, error: null } : current);
    void deleteFacesShape(target, selectedFaceIds, faces.list)
      .then((modifiedShape) => {
        commitShapes(
          shapesRef.current.map((candidate) => candidate.id === target.id ? modifiedShape : candidate),
          modifiedShape.id,
          selectedFaceIds.length === 1 ? t("status.facesDeletedOne") : t("status.facesDeletedMany", { count: selectedFaceIds.length }),
        );
        setDeleteFaceTool(null);
      })
      .catch((error: unknown) => {
        if (deleteFaceRunRef.current !== run) return;
        const message = error instanceof Error ? error.message : String(error);
        // The picked faces stay, so one too many can be taken off and Delete tried again.
        setDeleteFaceTool((current) => current ? { ...current, busy: false, error: message } : current);
      });
  }, [refuseLockedSelection, commitShapes, deleteFaceTool, deleteFacesShape, selectedShapes.length]);

  // The tool belongs to the body it was started for and gives way to the other tools.
  useEffect(() => {
    if (!deleteFaceTool || deleteFaceTool.busy) return;
    if (
      selectedIds.length !== 1
      || selectedIds[0] !== deleteFaceTool.shapeId
      || mateTool || layFlatPickMode || pivotPickMode || arrayTool || scalePercentTool
      || shellTool || edgeModifier || splitSession || simplifyToolId || holePatternTool || faceTool
    ) {
      deleteFaceRunRef.current += 1;
      setDeleteFaceTool(null);
    }
  }, [arrayTool, deleteFaceTool, edgeModifier, faceTool, holePatternTool, layFlatPickMode, mateTool, pivotPickMode, scalePercentTool, selectedIds, shellTool, simplifyToolId, splitSession]);

  // Undo, a nudge or a treatment taken back in the panel changes the body under the picked faces:
  // its faces are read again and the picks start over, a moment later so a held arrow key reads
  // them once (as the hollow rebuild waits). A body that is gone puts the tool down.
  useEffect(() => {
    if (!deleteFaceTool || deleteFaceTool.busy) return;
    const current = shapes.find((shape) => shape.id === deleteFaceTool.shapeId);
    if (current && projectShapesFingerprint([current]) === deleteFaceTool.fingerprint) return;
    if (!current || current.locked) {
      deleteFaceRunRef.current += 1;
      setDeleteFaceTool(null);
      setNotice(t("status.deleteFaceCancelledChanged"));
      return;
    }
    // A refusal of Delete stays to be read; an error from reading the faces goes with the new reading.
    const timer = window.setTimeout(() => readDeleteFaces(current, deleteFaceTool.faces ? deleteFaceTool.error : null), 250);
    return () => window.clearTimeout(timer);
  }, [deleteFaceTool, readDeleteFaces, shapes]);

  const cadFacePick = useMemo(() => deleteFaceTool?.faces?.mesh
    ? {
        shapeId: deleteFaceTool.shapeId,
        positions: deleteFaceTool.faces.mesh.positions,
        indices: deleteFaceTool.faces.mesh.indices,
        triangleFaces: deleteFaceTool.faces.mesh.triangleFaces,
        selectedFaceIds: deleteFaceTool.selectedFaceIds,
      }
    : null, [deleteFaceTool?.faces, deleteFaceTool?.selectedFaceIds, deleteFaceTool?.shapeId]);

  // The Honeycomb is gone as a shape (#223): one in an older design becomes a box with hexagonal holes, grouped, as the
  // hole pattern makes it. Each is converted once - Undo may bring the old one back, and it then stays as it was.
  const honeycombConvertedRef = useRef(new Set<string>());
  useEffect(() => {
    if (historyViewState) return;
    const pending = shapes.filter((shape) => shape.kind === "honeycomb" && !shape.hole && !honeycombConvertedRef.current.has(shape.id));
    if (pending.length === 0) return;
    pending.forEach((shape) => honeycombConvertedRef.current.add(shape.id));
    const sourceProjectId = projectInfoRef.current.projectId;
    const sourceFingerprint = projectShapesFingerprint(shapesRef.current);
    void (async () => {
      const replacements = new Map<string, WorkplaneShape>();
      for (const shape of pending) {
        const parts = honeycombReplacementParts(shape);
        if (!parts) continue;
        const result = await buildGroupedShapeFromSelection([parts.body, ...parts.holes], workspaceSettingsRef.current.booleanTriangleLimit);
        if (!result.group) continue;
        replacements.set(shape.id, canonicalizeShape({ ...result.group, id: shape.id, name: shape.name, color: shape.color, locked: shape.locked, groupOperation: "group" }));
      }
      if (replacements.size === 0) return;
      if (projectInfoRef.current.projectId !== sourceProjectId || projectShapesFingerprint(shapesRef.current) !== sourceFingerprint) return;
      commitShapes(
        shapesRef.current.map((shape) => (shape.kind === "honeycomb" ? replacements.get(shape.id) ?? shape : shape)),
        selectedIdsRef.current,
        t("status.honeycombConverted", { count: replacements.size }),
      );
    })();
  }, [commitShapes, historyViewState, shapes]);

  const centerSelectionOnWorkplane = useCallback(() => {
    if (!hasSelection) {
      setNotice(t("status.selectShapeFirst"));
      return;
    }
    if (refuseLockedSelection()) return;
    const selected = new Set(selectedIds);
    const movable = shapes.filter((shape) => selected.has(shape.id));
    const offset = workplaneCenteringOffset(boundsForShapes(movable));
    if (!offset) {
      setNotice(t("status.nothingMeasurable"));
      return;
    }
    const offsetX = cleanNearZero(offset.x);
    const offsetZ = cleanNearZero(offset.z);
    if (offsetX === 0 && offsetZ === 0) {
      setNotice(t("status.alreadyCentered"));
      return;
    }
    const movableIds = new Set(movable.map((shape) => shape.id));
    commitShapes(
      shapes.map((shape) => (movableIds.has(shape.id)
        ? { ...shape, x: cleanNearZero(shape.x + offsetX), z: cleanNearZero(shape.z + offsetZ) }
        : shape)),
      selectedIds,
      movable.length === 1 ? t("status.centeredOne") : t("status.centeredMany", { count: movable.length }),
    );
  }, [refuseLockedSelection, commitShapes, hasSelection, selectedIds, shapes]);

  const activateWorkplaneTool = useCallback(() => {
    stopCruise();
    setWorkplaneMode((active) => {
      const next = !active;
      // Der Hinweis gilt, solange das Werkzeug scharf ist - das Abbrechen ist
      // eine gewoehnliche Meldung und darf gleich wieder gehen.
      setNotice(next ? t("status.workplaneToolStart") : t("status.workplaneToolCancelled"), next);
      return next;
    });
  }, [stopCruise]);

  const setActivePlacementWorkplane = useCallback((next: PlacementWorkplane, source: "shape" | "base") => {
    const previous = placementWorkplaneRef.current;
    const normalizedNext = normalizePlacementWorkplane(next);
    placementWorkplaneRef.current = normalizedNext;
    setPlacementWorkplane(normalizedNext);
    const horizontalElevation = Math.abs(normalizedNext.normal.x) < 1e-6
      && Math.abs(normalizedNext.normal.y - 1) < 1e-6
      && Math.abs(normalizedNext.normal.z) < 1e-6
      ? normalizedNext.origin.y
      : 0;
    placementElevationRef.current = horizontalElevation;
    setPlacementElevation(horizontalElevation);
    if (placementWorkplaneFingerprint(normalizedNext) !== placementWorkplaneFingerprint(previous)) {
      appendHistoryEntry(editorHistoryEntry(shapesRef.current, selectedIdsRef.current, notesRef.current, normalizedNext));
      syncProjectShapes(shapesRef.current, true);
    }
    setNotice(source === "shape"
      ? t("status.workplaneFromFace")
      : placementWorkplaneIsBase(normalizedNext) ? t("status.workplaneReset") : t("status.workplaneUpdated"));
  }, [appendHistoryEntry, syncProjectShapes]);

  const setViewportPlacementWorkplane = useCallback((next: PlacementWorkplane, source: "shape" | "base") => {
    setActivePlacementWorkplane(next, source);
  }, [setActivePlacementWorkplane]);

  const closeViewportWorkplaneMode = useCallback((active: boolean) => {
    setWorkplaneMode(active);
  }, []);

  const groupSelected = useCallback(async () => {
    if (refuseLockedSelection()) return;
    if (selectedShapes.length < 2) {
      setNotice(t("status.selectTwoToGroup"));
      return;
    }

    if (selectedShapes.some((shape) => isNonSolidShapeKind(shape.kind))) {
      setNotice(t("status.rulerNotSolid"));
      return;
    }

    const sourceFingerprint = projectShapesFingerprint(shapesRef.current);
    const sourceProjectId = projectInfoRef.current.projectId;
    const result = await buildGroupedShapeFromSelection(selectedShapes, workspaceSettingsRef.current.booleanTriangleLimit);
    if (projectInfoRef.current.projectId !== sourceProjectId || projectShapesFingerprint(shapesRef.current) !== sourceFingerprint) {
      setNotice(t("status.groupChanged"));
      return;
    }
    const { group } = result;
    if (!group) {
      if (result.consumed) {
        const selected = new Set(selectedIds);
        commitShapes(shapesRef.current.filter((shape) => !selected.has(shape.id)), null, t("status.groupedHoleConsumed"));
        return;
      }
      setNotice(result.failureNotice);
      return;
    }
    const selected = new Set(selectedIds);
    const editableGroup = canonicalizeShape({ ...group, groupOperation: "group" });
    commitShapes(
      [...shapesRef.current.filter((shape) => !selected.has(shape.id)), editableGroup],
      editableGroup.id,
      result.openGapEdges ? t("status.cutLeftOpen", { count: result.openGapEdges }) : result.mergeWarning ?? t("status.groupedMany", { count: selectedShapes.length }),
    );
  }, [refuseLockedSelection, commitShapes, selectedIds, selectedShapes]);

  /** the usual bundle (Ctrl+B): the parts move, turn and scale together and stay what they are. */
  const bundleSelected = useCallback(() => {
    if (refuseLockedSelection()) return;
    if (selectedShapes.length < 2) {
      setNotice(t("status.selectTwoToBundle"));
      return;
    }
    if (selectedShapes.some((shape) => isNonSolidShapeKind(shape.kind))) {
      setNotice(t("status.rulerNotSolid"));
      return;
    }
    const group = groupedShape(selectedShapes);
    if (!group) {
      setNotice(t("status.selectTwoToBundle"));
      return;
    }
    const selected = new Set(selectedIds);
    const bundle = canonicalizeShape({ ...group, name: "Bundle", groupOperation: "bundle" });
    commitShapes([...shapesRef.current.filter((shape) => !selected.has(shape.id)), bundle], bundle.id, t("status.bundledMany", { count: selectedShapes.length }));
  }, [refuseLockedSelection, commitShapes, selectedIds, selectedShapes]);

  /**
   * A key ring tab of its own (#598) fixed to the nearest tag in one click, where it was put: the
   * tag is built again with its hole there - the ear on the bottom layer, the hole through every
   * layer - and the tab is gone. "Free" brings it out again.
   */
  const fixKeyringTab = useCallback(async () => {
    if (selectedShapes.length !== 1 || !selectedShape?.keyringTab) return;
    if (refuseLockedSelection()) return;
    const tab = selectedShape;
    const tag = keyringTabTag(tab, shapesRef.current);
    if (!tag) {
      setNotice(t("status.keyringTabNoTag"));
      return;
    }
    const place = keyringTabPlace(tab);
    if (!place) return;
    const commit = (next: WorkplaneShape) => {
      if (!shapesRef.current.some((shape) => shape.id === tag.id) || !shapesRef.current.some((shape) => shape.id === tab.id)) return;
      commitShapes(
        shapesRef.current.filter((shape) => shape.id !== tab.id).map((shape) => (shape.id === tag.id ? next : shape)),
        [next.id],
        t("status.keyringTabFixed"),
      );
    };
    try {
      if (tag.layeredText) {
        const stack = textLayerStack(tag);
        if (!stack) return;
        const keyring = { side: stack.keyring?.side ?? "left", diameter: place.diameter, free: textFreeKeyring(stack.source, place) } as const;
        await keyringRuntimeReady(keyring);
        commit(layeredTextShape(nameTagSource(stack.source, {}), stack.layers, stack.ids, tag.id, tag, stack.source.text, keyring));
        return;
      }
      const stack = iconLayerStack(tag);
      if (!stack) return;
      setNotice(t("status.buildingSketch"), true);
      const area = await iconTagArea(stack.source, stack.width, stack.width);
      const free = iconFreeKeyring(area, stack.place, place);
      if (!free) return;
      commit(await layeredIconShape(area, stack.layers, stack.place, stack.ids, tag.id, tag, { side: stack.keyring?.side ?? "left", diameter: place.diameter, free }));
    } catch (error) {
      setNotice(error instanceof Error ? localizedError(error.message) : t("status.sketchCannotExtrude"), true);
    }
  }, [refuseLockedSelection, commitShapes, selectedShape, selectedShapes.length]);

  /** Ends the preview of an intersection: the operands show as they are again. */
  const exitIntersectPreview = useCallback(() => {
    intersectPreviewRunRef.current += 1;
    setIntersectPreviewIds(null);
    setIntersectPreviewShape(null);
  }, []);

  /** Shows what the selected shapes share, and keeps showing it while they are moved one by one (#372). */
  const toggleIntersectPreview = useCallback(() => {
    if (intersectPreviewIdsRef.current) {
      exitIntersectPreview();
      setNotice("");
      return;
    }
    const operands = selectedShapes.filter((shape) => !isNonSolidShapeKind(shape.kind));
    if (!canIntersectShapes(operands)) {
      setNotice(t("status.selectSolidAndHole"));
      return;
    }
    setIntersectPreviewIds(operands.map((shape) => shape.id));
    setNotice(t("status.intersectPreviewOn", { tool: t("editor.tool.intersect") }));
  }, [exitIntersectPreview, selectedShapes]);

  // The common part is calculated again a moment after every change of the shapes, so moving one stays smooth.
  useEffect(() => {
    if (!intersectPreviewIds) return;
    const operands = shapes.filter((shape) => intersectPreviewIds.includes(shape.id) && !isNonSolidShapeKind(shape.kind));
    if (operands.length < 2 || !canIntersectShapes(operands)) {
      exitIntersectPreview();
      setNotice(t("status.intersectPreviewOff"));
      return;
    }
    const run = intersectPreviewRunRef.current + 1;
    intersectPreviewRunRef.current = run;
    const timer = window.setTimeout(async () => {
      const triangles = operands.reduce((sum, shape) => sum + (shape.importedMesh?.triangleCount ?? meshForShape(shape).faces.length), 0);
      if (triangles > INTERSECT_PREVIEW_MAX_TRIANGLES) {
        setIntersectPreviewShape(null);
        setNotice(t("status.intersectPreviewTooBig"));
        return;
      }
      const result = await buildIntersectionShapeFromSelection(operands, workspaceSettingsRef.current.booleanTriangleLimit);
      if (intersectPreviewRunRef.current !== run) return;
      if (result.group) {
        intersectPreviewEmptyRef.current = false;
        setIntersectPreviewShape({ ...result.group, id: "intersect-preview", name: t("editor.tool.intersectPreview"), color: "#19c37d", hole: false, transparent: false, locked: true, hidden: false, previewOnly: true, groupedShapes: undefined, groupOperation: undefined });
        return;
      }
      setIntersectPreviewShape(null);
      if (result.empty && !intersectPreviewEmptyRef.current) setNotice(t("status.intersectPreviewEmpty"));
      intersectPreviewEmptyRef.current = Boolean(result.empty);
    }, 220);
    return () => window.clearTimeout(timer);
  }, [exitIntersectPreview, intersectPreviewIds, shapes]);

  const intersectSelected = useCallback(async () => {
    if (refuseLockedSelection()) return;
    // While the preview shows, its shapes are the ones that are intersected, whatever is selected.
    const previewIds = intersectPreviewIdsRef.current;
    const groupable = (previewIds ? shapesRef.current.filter((shape) => previewIds.includes(shape.id)) : selectedShapes).filter((shape) => !isNonSolidShapeKind(shape.kind));
    if (!canIntersectShapes(groupable)) {
      setNotice(t("status.selectSolidAndHole"));
      return;
    }

    const sourceFingerprint = projectShapesFingerprint(shapesRef.current);
    const sourceProjectId = projectInfoRef.current.projectId;
    const result = await buildIntersectionShapeFromSelection(groupable, workspaceSettingsRef.current.booleanTriangleLimit);
    if (projectInfoRef.current.projectId !== sourceProjectId || projectShapesFingerprint(shapesRef.current) !== sourceFingerprint) {
      setNotice(t("status.intersectChanged"));
      return;
    }
    if (!result.group && !result.empty) {
      setNotice(result.failureNotice);
      return;
    }

    const operandIds = new Set(groupable.map((shape) => shape.id));
    const remainingShapes = shapesRef.current.filter((shape) => !operandIds.has(shape.id));
    if (result.empty) {
      // Nothing is shared: the shapes stay, instead of vanishing (#372). Move them over each other, or take one out.
      setNotice(t("status.intersectionEmptyKept"));
      return;
    }

    const intersection = result.group ? canonicalizeShape({ ...result.group, groupOperation: "intersection" }) : null;
    if (!intersection) {
      return;
    }
    exitIntersectPreview();
    commitShapes([...remainingShapes, intersection], intersection.id, t("status.intersectedMany", { count: groupable.length }));
  }, [refuseLockedSelection, commitShapes, exitIntersectPreview, selectedShapes]);

  // Each step answers with what happened, so the buttons can show it and MCP can pass it on.
  const refuseOpenGroupStep = useCallback((message: string): OpenGroupOutcome => {
    setNotice(message);
    return { ok: false, message };
  }, []);

  /** Levels that end without a history step of their own count for the step the editor is on. */
  const endOpenGroupLevelsWithoutStep = useCallback((levels: OpenGroupLevel[]) => {
    const current = historyRef.current[historyIndexRef.current];
    if (current) openGroupHistoryRef.current.set(current.fingerprint, levels);
    setOpenGroupLevels(levels);
  }, [setOpenGroupLevels]);

  /** Opening and closing a level are not edits of the level around it: nothing to track. */
  const commitOpenGroupTransition = useCallback((levels: OpenGroupLevel[], next: WorkplaneShape[], selection: string | string[], message: string) => {
    setOpenGroupLevels(levels);
    openGroupTransitionRef.current = true;
    try {
      commitShapes(next, selection, message);
    } finally {
      openGroupTransitionRef.current = false;
    }
  }, [commitShapes, setOpenGroupLevels]);

  const openGroupForEditing = useCallback((id: string): OpenGroupOutcome => {
    if (openGroupBusyRef.current) return refuseOpenGroupStep(t("group.busy"));
    const levels = openGroupsRef.current;
    const innermost = levels.at(-1);
    if (innermost && !innermost.childIds.includes(id)) {
      return refuseOpenGroupStep(t("group.finishOpenFirst", { name: displayShapeName(innermost.original) }));
    }
    const group = shapesRef.current.find((shape) => shape.id === id);
    if (!group?.groupedShapes?.length) return refuseOpenGroupStep(t("status.selectGroupFirst"));
    if (group.locked) return refuseOpenGroupStep(t("status.objectLocked"));
    const parts = restoreGroupedChildren(group);
    const childIds = parts.map((shape) => shape.id);
    const message = t("status.groupOpened", { name: displayShapeName(group) });
    commitOpenGroupTransition(
      [...levels, { original: group, childIds, notes: notesPinnedTo(notesRef.current, group) }],
      [...shapesRef.current.filter((shape) => shape.id !== group.id), ...parts],
      childIds,
      message,
    );
    return { ok: true, message, partIds: childIds };
  }, [commitOpenGroupTransition, refuseOpenGroupStep]);

  const cancelOpenGroup = useCallback((): OpenGroupOutcome => {
    const levels = openGroupsRef.current;
    const session = levels.at(-1);
    if (!session) return { ok: false, message: t("group.noneOpen") };
    if (openGroupBusyRef.current) return refuseOpenGroupStep(t("group.busy"));
    const parts = new Set(session.childIds);
    const message = t("status.groupOpenCancelled", { name: displayShapeName(session.original) });
    // The group comes back under its own id, which the level around it still lists - and its notes as they were.
    if (!historyViewStateRef.current) notesRef.current = notesPutBack(notesRef.current, session.notes);
    commitOpenGroupTransition(
      levels.slice(0, -1),
      [...shapesRef.current.filter((shape) => !parts.has(shape.id)), session.original],
      session.original.id,
      message,
    );
    return { ok: true, message, groupId: session.original.id };
  }, [commitOpenGroupTransition, refuseOpenGroupStep]);

  const finishOpenGroup = useCallback(async (): Promise<OpenGroupOutcome> => {
    const levels = openGroupsRef.current;
    const session = levels.at(-1);
    if (!session) return { ok: false, message: t("group.noneOpen") };
    if (openGroupBusyRef.current) return { ok: false, message: t("group.busy") };
    const { original, childIds } = session;
    const byId = new Map(shapesRef.current.map((shape) => [shape.id, shape]));
    // In their original order, unlocked - a part locked while the group was open still belongs in it.
    const parts = childIds.flatMap((id) => {
      const shape = byId.get(id);
      return shape ? [{ ...shape, locked: false }] : [];
    });
    if (parts.length < 2) {
      // Nothing to group: the part that is left takes the group's place in the level around it.
      const outer = levels.slice(0, -1);
      const parent = outer.at(-1);
      if (parent && parts.length) {
        const at = parent.childIds.indexOf(original.id) + 1;
        outer[outer.length - 1] = { ...parent, childIds: [...parent.childIds.slice(0, at), parts[0].id, ...parent.childIds.slice(at)] };
      }
      endOpenGroupLevelsWithoutStep(outer);
      // The group is not coming back: its notes go to the part left, or stay where they stand.
      const notesLeft = notesAfterShapeChange(notesRef.current, shapesRef.current.filter((shape) => shape.id !== parts[0]?.id), shapesRef.current, new Set(outer.map((level) => level.original.id)));
      if (notesLeft !== notesRef.current) commitNotes(notesLeft);
      const message = parts.length ? t("status.groupOnePartLeft") : t("status.groupNoPartsLeft");
      setNotice(message);
      return { ok: true, message, partIds: parts.map((shape) => shape.id) };
    }
    const sourceFingerprint = projectShapesFingerprint(shapesRef.current);
    const sourceProjectId = projectInfoRef.current.projectId;
    openGroupBusyRef.current = true;
    setOpenGroupBusy(true);
    try {
      const operation = original.groupOperation === "intersection" ? "intersection" : original.groupOperation === "bundle" ? "bundle" : "group";
      const result = operation === "intersection"
        ? await buildIntersectionShapeFromSelection(parts, workspaceSettingsRef.current.booleanTriangleLimit)
        : operation === "bundle"
          ? { group: groupedShape(parts) }
          : await buildGroupedShapeFromSelection(parts, workspaceSettingsRef.current.booleanTriangleLimit);
      if (
        projectInfoRef.current.projectId !== sourceProjectId ||
        projectShapesFingerprint(shapesRef.current) !== sourceFingerprint ||
        openGroupsRef.current.at(-1) !== session
      ) {
        return refuseOpenGroupStep(t("status.groupChanged"));
      }
      if (!result.group) {
        return refuseOpenGroupStep("failureNotice" in result && result.failureNotice ? result.failureNotice : t("status.groupChanged"));
      }
      // The group keeps what was its own: name, solid or hole, see-through, hidden -
      // and its colour, if it had been given one apart from its first part.
      const firstSolid = original.groupedShapes?.find((child) => !child.hole) ?? original.groupedShapes?.[0];
      const ownColour = Boolean(firstSolid && firstSolid.color !== original.color);
      const rebuilt = canonicalizeShape({ ...result.group, groupOperation: operation });
      // The same group, not a new one: its id stays, so anything holding that id
      // (MCP, the object list, the level around it) still finds it.
      const regrouped = canonicalizeShape(withHoleMode({
        ...rebuilt,
        id: original.id,
        name: original.name,
        color: ownColour ? original.color : rebuilt.color,
        transparent: original.transparent,
        hidden: original.hidden,
      }, Boolean(original.hole)));
      const partIds = new Set(parts.map((shape) => shape.id));
      const message = "mergeWarning" in result && result.mergeWarning ? result.mergeWarning : t("status.groupClosed", { name: displayShapeName(regrouped) });
      commitOpenGroupTransition(
        openGroupsRef.current.slice(0, -1),
        [...shapesRef.current.filter((shape) => !partIds.has(shape.id)), regrouped],
        regrouped.id,
        message,
      );
      return { ok: true, message, groupId: regrouped.id };
    } finally {
      openGroupBusyRef.current = false;
      setOpenGroupBusy(false);
    }
  }, [commitNotes, commitOpenGroupTransition, endOpenGroupLevelsWithoutStep, refuseOpenGroupStep]);

  // Undo past an opening brings that group back, and deleting every part leaves
  // nothing to close: in both cases that level is over, with every level inside it.
  useEffect(() => {
    if (!openGroups.length) return;
    const ids = new Set(shapes.map((shape) => shape.id));
    const stillOpen = openGroupLevelsStillOpen(
      openGroups.map((level) => ({ groupId: level.original.id, partIds: level.childIds })),
      ids,
    );
    if (stillOpen < openGroups.length) endOpenGroupLevelsWithoutStep(openGroups.slice(0, stillOpen));
  }, [endOpenGroupLevelsWithoutStep, openGroups, shapes]);

  /** Whether "Edit group" applies to this group right now. */
  const canEditGroup = useCallback(
    (shape: WorkplaneShape | null | undefined) =>
      Boolean(shape?.groupedShapes?.length) && canEditGroupAtLevel(openGroups.map((level) => ({ partIds: level.childIds })), shape!.id),
    [openGroups],
  );

  const editSelectedGroup = useCallback(() => {
    if (selectedShapes.length !== 1 || !selectedShapes[0].groupedShapes?.length) {
      setNotice(t("status.selectGroupFirst"));
      return;
    }
    openGroupForEditing(selectedShapes[0].id);
  }, [openGroupForEditing, selectedShapes]);

  const ungroupSelected = useCallback(() => {
    if (refuseLockedSelection()) return;
    const groups = selectedShapes.filter((shape) => shape.groupedShapes?.length || wasGroupBeforeEdgeTreatments(shape));
    if (groups.length === 0) {
      setNotice(t("status.selectGroupFirst"));
      return;
    }
    const groupIds = new Set(groups.map((shape) => shape.id));
    // A group with a fillet or chamfer is one mesh with the history of its features: they are taken back first (#514).
    const tookEdgesBack = groups.some((shape) => !shape.groupedShapes?.length);
    const restored = groups.flatMap((shape) => restoreGroupedChildren(shape.groupedShapes?.length ? shape : groupBeforeEdgeTreatments(shape)!));
    commitShapes(
      [...shapes.filter((shape) => !groupIds.has(shape.id)), ...restored],
      restored.map((shape) => shape.id),
      tookEdgesBack ? t("status.ungroupedEdgesTakenBack") : groups.length === 1 ? t("status.ungroupedOne") : t("status.ungroupedMany", { count: groups.length }),
    );
  }, [refuseLockedSelection, commitShapes, selectedShapes, shapes]);

  /** Why a wrap failed, in the units the editor shows. */
  const cylinderWrapErrorText = useCallback((error: CylinderWrapError, shape: WorkplaneShape, diameter: number) => {
    const workspace = workspaceSettingsRef.current;
    const length = (value: number) => `${formatLengthMm(value, workspace.accuracy)} ${lengthDisplayUnit(workspace).label}`;
    if (error === "tooWide") {
      const flat = boundsForShapes([shape]);
      const width = flat ? flat.maxX - flat.minX : shapeWidth(shape);
      return t("status.wrapTooWide", { length: length(width), circumference: length(Math.PI * diameter), diameter: length(width / Math.PI) });
    }
    if (error === "tooThick") return t("status.wrapTooThick");
    if (error === "invalidDiameter") return t("status.wrapNeedsDiameter");
    return t("status.wrapNothing");
  }, []);

  const wrapSelectionAroundCylinder = useCallback((diameter: number, inward: boolean) => {
    if (selectedShapes.length !== 1 || !selectedShape) {
      setNotice(t("status.selectOneToWrap"));
      return;
    }
    if (!canWrapAroundCylinder(selectedShape)) {
      setNotice(t(selectedShape.locked ? "status.objectLocked" : selectedShape.cylinderWrap ? "status.alreadyWrapped" : "status.selectOneToWrap"));
      return;
    }
    const wrapped = cylinderWrappedShape(selectedShape, diameter, inward);
    if (typeof wrapped === "string") {
      setNotice(cylinderWrapErrorText(wrapped, selectedShape, diameter));
      return;
    }
    const workspace = workspaceSettingsRef.current;
    commitShapes(
      shapes.map((shape) => (shape.id === selectedShape.id ? wrapped : shape)),
      [wrapped.id],
      t(inward ? "status.wrappedInward" : "status.wrappedAround", { diameter: `${formatLengthMm(diameter, workspace.accuracy)} ${lengthDisplayUnit(workspace).label}` }),
    );
  }, [commitShapes, cylinderWrapErrorText, selectedShape, selectedShapes.length, shapes]);

  /** The selected name tag as its panel shows it: words, font and layers read from its layers as they stand (#215). */
  const selectedNameTag = useMemo(
    () => (selectedShapes.length === 1 && selectedShape && selectedShape.kind !== "text" && offersTextLayers(selectedShape) ? textLayerStack(selectedShape) : null),
    [selectedShape, selectedShapes.length],
  );

  /** Splits the selected text into layers, or builds the selected stack again with new words, font or layers (#215). */
  const layerSelectedText = useCallback(async (patch: TextLayerPatch) => {
    if (selectedShapes.length !== 1 || !selectedShape || !offersTextLayers(selectedShape)) return;
    const stack = textLayerStack(selectedShape);
    if (!stack) return;
    const wasText = selectedShape.kind === "text";
    // The panel keeps the letter size through new words and fonts, and sets it for all layers at once.
    const source = nameTagSource(stack.source, patch);
    const layers = patch.layers ?? (wasText ? [...NAME_TAG_LAYERS] : stack.layers);
    // The key ring hole (#215) follows the letters: it is laid out from them on every build.
    // "Free" (#598) takes it off the tag and puts a key ring tab of its own beside it.
    const keyring = patch.keyringTab ? null : patch.keyring !== undefined ? patch.keyring : stack.keyring;
    await keyringRuntimeReady(keyring);
    const next = layeredTextShape(source, layers, wasText ? [] : stack.ids, selectedShape.id, selectedShape, stack.source.text, keyring);
    if (patch.keyringTab) {
      const bottom = layers[layers.length - 1];
      const floor = { color: bottom.color, height: bottom.height, elevation: stack.source.elevation ?? 0 };
      // A hole fixed freely before comes out as a tab again, where it was; otherwise one starts beside the tag.
      const free = stack.keyring?.free;
      const tab = free && stack.keyring
        ? keyringTabAt(textFreeKeyringPlace(stack.source, { ...stack.keyring, free }), floor, t("nameTag.keyringTab"))
        : keyringTabShape(next, floor, stack.keyring?.diameter ?? DEFAULT_KEYRING_DIAMETER, t("nameTag.keyringTab"));
      commitShapes([...shapesRef.current.map((shape) => (shape.id === selectedShape.id ? next : shape)), tab], [tab.id], t("status.keyringTabMade"));
      return;
    }
    commitShapes(
      shapesRef.current.map((shape) => (shape.id === selectedShape.id ? next : shape)),
      [next.id],
      t(wasText ? "status.textLayered" : "status.textLayersUpdated", { count: layers.length }),
    );
  }, [commitShapes, selectedShape, selectedShapes.length]);

  /** One tag like the selected text or stack per name, in rows under it; the first takes its place (#215). */
  const makeTextTags = useCallback(async (names: string[], gap: number) => {
    if (selectedShapes.length !== 1 || !selectedShape || !offersTextLayers(selectedShape) || names.length === 0) return;
    const stack = textLayerStack(selectedShape);
    if (!stack) return;
    await keyringRuntimeReady(stack.keyring);
    const tags = nameTagsFor(stack, names, gap, { id: selectedShape.id, ids: selectedShape.kind !== "text" ? stack.ids : [] });
    commitShapes(
      [...shapesRef.current.filter((shape) => shape.id !== selectedShape.id), ...tags],
      tags.map((tag) => tag.id),
      t("status.textTagsMade", { count: tags.length }),
    );
  }, [commitShapes, selectedShape, selectedShapes.length]);

  /** The selected icon tag, or a sketch body that can become one, as its card shows it. */
  const selectedIconStack = useMemo(
    () => (selectedShapes.length === 1 && selectedShape && offersIconLayers(selectedShape) ? iconLayerStack(selectedShape) : null),
    [selectedShape, selectedShapes.length],
  );

  /**
   * Splits the selected sketch body into an icon tag's layers, or builds the selected icon tag
   * again with a new width or layers. The kernel takes a moment per layer, so a burst of changes
   * (a slider dragged) builds once, after the last; a build that a newer change overtook is dropped.
   */
  const iconLayerTimerRef = useRef<number | null>(null);
  const iconLayerRequestRef = useRef(0);
  const iconLayerPatchRef = useRef<{ id: string; patch: IconLayerPatch } | null>(null);
  const layerSelectedIcon = useCallback((patch: IconLayerPatch) => {
    if (selectedShapes.length !== 1 || !selectedShape || !offersIconLayers(selectedShape)) return;
    const id = selectedShape.id;
    // Changes in one burst add up: a new width and then new layers both count.
    const pending = iconLayerPatchRef.current;
    iconLayerPatchRef.current = { id, patch: pending?.id === id ? { ...pending.patch, ...patch } : patch };
    if (iconLayerTimerRef.current !== null) window.clearTimeout(iconLayerTimerRef.current);
    const request = ++iconLayerRequestRef.current;
    iconLayerTimerRef.current = window.setTimeout(() => {
      iconLayerTimerRef.current = null;
      const wanted = iconLayerPatchRef.current;
      iconLayerPatchRef.current = null;
      const current = shapesRef.current.find((shape) => shape.id === wanted?.id);
      if (!wanted || !current || !offersIconLayers(current)) return;
      const stack = iconLayerStack(current);
      if (!stack) return;
      const wasBody = !current.layeredIcon;
      const layers = wanted.patch.layers ?? (wasBody ? [...ICON_TAG_LAYERS] : stack.layers);
      setNotice(t("status.buildingSketch"), true);
      void (async () => {
        const area = await iconTagArea(stack.source, stack.width, wanted.patch.width ?? stack.width);
        // The key ring hole stays as it is unless the patch sets or takes it off (null); "Free" (#598) takes it off too.
        const keyring = wanted.patch.keyringTab ? null : wanted.patch.keyring === undefined ? stack.keyring : wanted.patch.keyring;
        const next = await layeredIconShape(area, layers, stack.place, wasBody ? [] : stack.ids, current.id, wasBody ? { ...current, name: stack.name } : current, keyring);
        return { next, area };
      })()
        .then(({ next, area }) => {
          if (iconLayerRequestRef.current !== request || !shapesRef.current.some((shape) => shape.id === next.id)) return;
          if (wanted.patch.keyringTab) {
            // A key ring tab of its own beside the tag, in the bottom layer's colour and height (#598);
            // a hole fixed freely before comes out as a tab again, where it was.
            const bottom = layers[layers.length - 1];
            const floor = { color: bottom.color, height: bottom.height, elevation: stack.place.elevation };
            const free = stack.keyring?.free;
            const back = free && stack.keyring ? iconFreeKeyringPlace(area, stack.place, { ...stack.keyring, free }) : null;
            const tab = back
              ? keyringTabAt(back, floor, t("nameTag.keyringTab"))
              : keyringTabShape(next, floor, stack.keyring?.diameter ?? DEFAULT_KEYRING_DIAMETER, t("nameTag.keyringTab"));
            commitShapes([...shapesRef.current.map((shape) => (shape.id === next.id ? next : shape)), tab], [tab.id], t("status.keyringTabMade"));
            return;
          }
          commitShapes(
            shapesRef.current.map((shape) => (shape.id === next.id ? next : shape)),
            [next.id],
            t(wasBody ? "status.iconLayered" : "status.iconLayersUpdated", { count: layers.length }),
          );
        })
        .catch((error) => {
          if (iconLayerRequestRef.current === request) setNotice(error instanceof Error ? localizedError(error.message) : t("status.sketchCannotExtrude"), true);
        });
    }, 250);
  }, [commitShapes, selectedShape, selectedShapes.length]);

  /** `count` tags like the selected one in a grid on the plate's middle; the first is the tag itself. */
  const makeIconTags = useCallback((count: number) => {
    if (selectedShapes.length !== 1 || !selectedShape || !offersIconLayers(selectedShape)) return;
    const plate = workspaceSettingsRef.current;
    const tags = iconTagCopies(selectedShape, count, { width: plate.width, depth: plate.depth });
    commitShapes(
      [...shapesRef.current.filter((shape) => shape.id !== selectedShape.id), ...tags],
      tags.map((tag) => tag.id),
      t("status.iconTagsMade", { count: tags.length }),
    );
  }, [commitShapes, selectedShape, selectedShapes.length]);

  /** Another SVG on the selected icon tag: its layers, width and place stay, the icon and the name change. */
  const replaceIconSvg = useCallback(async (file: File) => {
    const current = selectedShapes.length === 1 && selectedShape?.layeredIcon ? selectedShape : null;
    const stack = current ? iconLayerStack(current) : null;
    if (!current || !stack) return;
    const source = await iconSourceFromFile(file);
    const { area, name } = await svgIconArea(source.name, source.svg, stack.width);
    const next = await layeredIconShape(area, stack.layers, stack.place, stack.ids, current.id, { ...current, name }, stack.keyring);
    if (!shapesRef.current.some((shape) => shape.id === current.id)) return;
    commitShapes(shapesRef.current.map((shape) => (shape.id === current.id ? next : shape)), [next.id], t("status.iconReplaced", { name }));
  }, [commitShapes, selectedShape, selectedShapes.length]);

  /** The icon tag card's wiring for the selected sketch body or icon tag; null for anything else. */
  const iconTagControls = useMemo<IconTagControls | null>(() => {
    // A QR code (#553) is made again from its text, not split into layers.
    if (!selectedIconStack || !selectedShape || selectedShape.qrCode) return null;
    const footprint = shapeBedFootprint(selectedShape);
    return {
      stack: selectedIconStack,
      isTag: Boolean(selectedShape.layeredIcon),
      plate: { width: workspaceSettings.width, depth: workspaceSettings.depth },
      footprint: { width: footprint.maxX - footprint.minX, depth: footprint.maxZ - footprint.minZ },
      onLayer: layerSelectedIcon,
      onCopies: makeIconTags,
      onReplaceSvg: replaceIconSvg,
    };
  }, [layerSelectedIcon, makeIconTags, replaceIconSvg, selectedIconStack, selectedShape, workspaceSettings.depth, workspaceSettings.width]);

  /** The icon tag window's OK: the SVG (or the traced picture) as a new icon tag on the plate, selected. */
  const createIconTag = useCallback(async (source: IconSource, width: number) => {
    const tag = await iconTagFromSvg(source.name, source.svg, width);
    commitShapes([...shapesRef.current, tag], [tag.id], t("status.iconTagAdded", { name: tag.name }));
    setIconTagPanelOpen(false);
  }, [commitShapes]);

  /** The QR code window's OK (#553): the code as a new body on the plate's middle, selected. */
  const createQrCode = useCallback(async (settings: QrCodeSettings, width: number) => {
    const shape = await qrCodeShape(settings, width, workspaceSettingsRef.current.booleanTriangleLimit);
    commitShapes([...shapesRef.current, shape], [shape.id], t("status.qrCodeAdded"));
    setQrCodePanelOpen(false);
  }, [commitShapes]);

  /** The QR code card's "Make again": the selected code with a new text, where it stood and as wide as it is. */
  const regenerateSelectedQrCode = useCallback(async (text: string) => {
    const current = selectedShapes.length === 1 ? selectedShape : null;
    const settings = qrCodeOf(current);
    if (!current || !settings) return;
    const next = await regeneratedQrCodeShape(current, { ...settings, text }, workspaceSettingsRef.current.booleanTriangleLimit);
    if (!shapesRef.current.some((shape) => shape.id === current.id)) return;
    commitShapes(shapesRef.current.map((shape) => (shape.id === current.id ? next : shape)), [next.id], t("status.qrCodeRegenerated"));
  }, [commitShapes, selectedShape, selectedShapes.length]);

  const qrCodeControls = useMemo(() => {
    const settings = selectedShapes.length === 1 && !selectedShape?.locked ? qrCodeOf(selectedShape) : null;
    return settings ? { settings, onRegenerate: regenerateSelectedQrCode } : null;
  }, [regenerateSelectedQrCode, selectedShape, selectedShapes.length]);

  const simplifyToolShape = simplifyToolId && selectedShapes.length === 1 && selectedShape?.id === simplifyToolId && offersMeshSimplify(selectedShape)
    ? selectedShape
    : null;
  // The panel belongs to one body; with another selection it has nothing to show and goes.
  useEffect(() => {
    if (simplifyToolId && !simplifyToolShape) setSimplifyToolId(null);
  }, [simplifyToolId, simplifyToolShape]);

  /** Puts a font of one's own on every selected text, as one step. */
  const applyCustomFontToSelection = useCallback((fontId: string) => {
    const selected = new Set(selectedIdsRef.current);
    const texts = shapesRef.current.filter((shape) => selected.has(shape.id) && shape.kind === "text");
    if (!texts.length) return;
    const name = textFontLabel(fontId) ?? fontId;
    commitShapes(
      shapesRef.current.map((shape) => (selected.has(shape.id) && shape.kind === "text" ? canonicalizeShape({ ...shape, font: fontId }) : shape)),
      selectedIdsRef.current,
      t("font.usedOnText", { name }),
    );
  }, [commitShapes]);

  const startSimplifyTool = useCallback(() => {
    if (simplifyToolShape) {
      setSimplifyToolId(null);
      return;
    }
    if (refuseLockedSelection()) return;
    if (selectedShapes.length !== 1 || !selectedShape || !offersMeshSimplify(selectedShape)) {
      setNotice(t("status.selectOneMeshToSimplify"));
      return;
    }
    setSimplifyToolId(selectedShape.id);
  }, [refuseLockedSelection, selectedShape, selectedShapes.length, simplifyToolShape]);

  const applySimplifyTool = useCallback((positions: number[]) => {
    const target = simplifyToolShape;
    if (!target?.importedMesh || target.locked) return;
    const simplified = simplifiedMeshShape(target, positions);
    if (!simplified?.importedMesh) return;
    commitShapes(
      shapes.map((shape) => (shape.id === target.id ? simplified : shape)),
      [simplified.id],
      t("status.meshSimplified", { before: formatTriangleCount(target.importedMesh.triangleCount), after: formatTriangleCount(simplified.importedMesh.triangleCount) }),
    );
    setSimplifyToolId(null);
  }, [commitShapes, shapes, simplifyToolShape]);

  const separateSelectedParts = useCallback(() => {
    if (selectedShapes.length !== 1 || !selectedShape) {
      setNotice(t("status.selectOneToSeparate"));
      return;
    }
    if (selectedShape.locked) {
      setNotice(t("status.objectLocked"));
      return;
    }
    if (separatesBySketch(selectedShape)) {
      // One body per outline, each with its own sketch (#669); the build takes a moment.
      const target = selectedShape;
      setNotice(t("status.buildingSketch"), true);
      void separateSketchBodyParts(target).then(
        (parts) => {
          const current = shapesRef.current;
          if (parts.length <= 1 || !current.some((shape) => shape.id === target.id)) return;
          commitShapes(
            [...current.filter((shape) => shape.id !== target.id), ...parts],
            parts.map((shape) => shape.id),
            t("status.separatedOutlines", { count: parts.length }),
          );
        },
        (error) => setNotice(error instanceof Error ? localizedError(error.message) : t("status.sketchCannotExtrude")),
      );
      return;
    }
    const parts = separateShapeParts(selectedShape);
    if (parts.length <= 1) {
      setNotice(t("status.onlyOnePart"));
      return;
    }
    commitShapes(
      [...shapes.filter((shape) => shape.id !== selectedShape.id), ...parts],
      parts.map((shape) => shape.id),
      t("status.separatedParts", { count: parts.length }),
    );
  }, [commitShapes, selectedShape, selectedShapes.length, shapes]);

  const mcpSceneSnapshot = useCallback((includeRawShapes = false): LayerlingMcpSceneSummary & { rawShapes?: WorkplaneShape[] } => {
    const projectInfo = projectInfoRef.current;
    const currentShapes = shapesRef.current;
    return {
      projectId: projectInfo.projectId,
      projectName: projectInfo.projectName,
      notice: noticeRef.current || t("status.ready"),
      selectedIds: selectedIdsRef.current,
      shapeCount: currentShapes.length,
      workspace: workspaceSettingsRef.current,
      snap: initialSnap ?? null,
      shapes: currentShapes.map(mcpShapeSummary),
      // The innermost level, as before nesting existed; openGroups has every level, outermost first.
      openGroup: openGroupsRef.current.length ? mcpOpenGroupSummary(openGroupsRef.current.at(-1)!) : null,
      openGroups: openGroupsRef.current.map(mcpOpenGroupSummary),
      workplane: {
        onBase: placementWorkplaneIsBase(placementWorkplaneRef.current),
        hidden: workplaneHiddenRef.current && !placementWorkplaneIsBase(placementWorkplaneRef.current),
        origin: placementWorkplaneRef.current.origin,
        normal: placementWorkplaneRef.current.normal,
      },
      ...(includeRawShapes ? { rawShapes: currentShapes.map((shape) => canonicalizeShape(shape)) } : {}),
    };
  }, [initialSnap]);

  /**
   * Der Schnitt als SVG, aus denselben Koerpern wie STL und 3MF: nur
   * Sichtbares, ohne Loecher, Gruppen verrechnet, Gleichfarbiges vereinigt und
   * verschiedene Farben gegeneinander freigestellt. Geschnitten wird der ganze
   * Entwurf, wie ihn die Schnittansicht zeigt - nicht nur die Auswahl.
   */
  // The slow part of the section - the bodies of the design, joined and separated by colour - does not depend
  // on the plane, so it is made once per state of the design; only the slicing is made again when the plane
  // moves. That lets the filled cut face follow the plane while it is dragged (#516, rondlh).
  const makeSectionMeshes = useCallback(async (shapesNow: WorkplaneShape[]) => {
    const { visible, hiddenNote } = visibleExportShapes(shapesNow);
    const hiddenCount = shapesNow.length - visible.length;
    const { solids, meshes: cut } = await exportBodiesWithLooseHoles(visible);
    if (solids.length === 0) return { solids, meshes: [], quellen: [] as number[], gescheitert: 0, hiddenNote, hiddenCount };
    const { meshes, quellen, gescheitert } = await colorSeparatedExportMeshes(solids, cut);
    return { solids, meshes, quellen, gescheitert, hiddenNote, hiddenCount };
  }, []);
  const sectionMeshCacheRef = useRef<{ shapes: WorkplaneShape[]; made: ReturnType<typeof makeSectionMeshes> } | null>(null);
  const sectionBodiesAt = useCallback(async (axis: SectionPlaneAxis, offset: number, frame: SectionFrame | null = null) => {
    const shapesNow = shapesRef.current;
    let cache = sectionMeshCacheRef.current;
    if (!cache || cache.shapes !== shapesNow) {
      cache = { shapes: shapesNow, made: makeSectionMeshes(shapesNow) };
      sectionMeshCacheRef.current = cache;
      cache.made.catch(() => {
        if (sectionMeshCacheRef.current === cache) sectionMeshCacheRef.current = null;
      });
    }
    const { solids, meshes, quellen, gescheitert, hiddenNote, hiddenCount } = await cache.made;
    if (solids.length === 0) return { bodies: [], hiddenNote, hiddenCount, unionFailed: false };
    const bodies = meshes.map((mesh, index) => {
      const source = solids[quellen[index]];
      return {
        name: source ? displayShapeName(source) : mesh.name,
        color: source?.color ?? "#000000",
        seeThrough: Boolean(source?.transparent) && !source?.hole,
        // A turned plane (#644) slices the bodies moved into its frame; the outlines are then in the frame's terms.
        loops: sliceMeshContours(sectionMeshInFrame(mesh, frame), axis, offset),
      };
    });
    return { bodies, hiddenNote, hiddenCount, unionFailed: gescheitert > 0 };
  }, [makeSectionMeshes]);

  /** The bodies of the cut with their colours, for the filled cut face of the section view (#516). */
  const sectionBodies = useCallback(async (axis: SectionPlaneAxis, offset: number, frame: SectionFrame | null = null) => (await sectionBodiesAt(axis, offset, frame)).bodies, [sectionBodiesAt]);

  const buildSectionSvg = useCallback(async (axis: SectionPlaneAxis, offset: number, frame: SectionFrame | null = null) => {
    const { bodies, hiddenNote, hiddenCount, unionFailed } = await sectionBodiesAt(axis, offset, frame);
    if (bodies.length === 0) throw new Error(t("status.sectionSvgNothing"));
    const result = sectionSvgDocument(bodies, axis, offset, `${projectName} - ${sectionAxisLetter(axis)} ${formatSectionOffset(offset)} mm`);
    if (!result) throw new Error(t("status.sectionSvgMissed"));
    return { result, hiddenNote, hiddenCount, unionFailed };
  }, [projectName, sectionBodiesAt]);

  /** Die Umrisse des Schnitts fuer das Messen - dieselben Koerper wie beim SVG. */
  const sectionContours = useCallback(async (axis: SectionPlaneAxis, offset: number, frame: SectionFrame | null = null) => {
    const { visible } = visibleExportShapes(shapesRef.current);
    const { solids, meshes: cut } = await exportBodiesWithLooseHoles(visible);
    if (solids.length === 0) return [];
    const { meshes } = await colorSeparatedExportMeshes(solids, cut);
    return meshes.flatMap((mesh) => sliceMeshContours(sectionMeshInFrame(mesh, frame), axis, offset));
  }, []);

  const exportSectionSvg = useCallback(async (axis: SectionPlaneAxis, offset: number, frame: SectionFrame | null = null) => {
    setNotice(t("status.buildingSectionSvg"), true);
    try {
      const { result, hiddenNote, unionFailed } = await buildSectionSvg(axis, offset, frame);
      const name = `${projectName} ${t("camera.sectionFileSuffix")} ${sectionAxisLetter(axis)} ${formatSectionOffset(offset)} mm`;
      await downloadTextFile(projectExportFileName(name, "svg"), result.svg, "image/svg+xml;charset=utf-8");
      const parts = [t("status.sectionSvgExported", { count: result.loopCount, face: t(SECTION_SEEN_FROM_KEYS[SECTION_VIEW_FACE[axis]]) })];
      if (result.openCount > 0) parts.push(t("status.sectionSvgOpen", { count: result.openCount }));
      if (unionFailed) parts.push(t("status.sectionSvgOverlap"));
      setNotice(parts.join(" ") + hiddenNote, result.openCount > 0 || unionFailed);
    } catch (error) {
      setNotice(error instanceof Error ? localizedError(error.message) : t("status.sectionSvgFailed"), true);
    }
  }, [buildSectionSvg, projectName]);

  // Der Dateiimport steht weiter unten; die MCP-Aktion nimmt denselben Weg.
  const importFilesRef = useRef<((files: File[], fileHandle?: LylFileHandle, options?: { keepSvgPage?: boolean; svgWidth?: number | null }) => Promise<{ importedIds: string[]; failures: Array<{ fileName: string; reason: string }> }>) | null>(null);

  const {
    customShapeEntries, customShapeFolders, serverAvailable: customShapesServerAvailable, myShapesFileInputRef,
    refreshServerShapes, saveSelectionAsMyShape, insertMyShape, renameMyShapeEntry, deleteMyShapeEntry, runCustomShapeMcp,
    moveMyShapeToServer, moveMyShapeToFolder, createShapeFolder, renameShapeFolder, deleteShapeFolder,
    backUpMyShapes, loadMyShapeFiles,
  } = useCustomShapes({
    sharedProjectsEnabled, setNotice, commitShapes, setProjectAssets, downloadBlob: downloadBlobFile,
    shapesRef, selectedIdsRef, notesRef, historyViewStateRef, projectAssetsRef, workspaceSettingsRef, snapGridRef, projectInfoRef, placementWorkplaneRef,
  });
  const noticeError = (error: unknown) => setNotice(error instanceof Error ? localizedError(error.message) : String(error));

  /**
   * Throws away every earlier step of the design: it keeps the state it has now, as its only one
   * (#246 - a file to share without its history, or a design to start the undo steps over).
   */
  const clearHistory = useCallback(() => {
    if (projectInteractionActiveRef.current) {
      setNotice(t("status.finishBeforeHistory"));
      return 0;
    }
    const removed = historyRef.current.length - 1;
    const entry = editorHistoryEntry(shapesRef.current, selectedIdsRef.current, notesRef.current, placementWorkplaneRef.current);
    openGroupHistoryRef.current = new Map([[entry.fingerprint, openGroupsRef.current]]);
    historyRef.current = [entry];
    historyIndexRef.current = 0;
    setHistory([entry]);
    setHistoryIndex(0);
    setHistoryViewIndex(null);
    setTopPanel(null);
    syncProjectShapes(shapesRef.current, true);
    setNotice(t("status.historyCleared"));
    return Math.max(0, removed);
  }, [syncProjectShapes]);

  const executeMcpCommand = useCallback(async (command: LayerlingMcpCommand): Promise<unknown> => {
    const params = command.params ?? {};
    const currentShapes = () => shapesRef.current;
    const findShape = (id: unknown) => (typeof id === "string" ? currentShapes().find((shape) => shape.id === id) ?? null : null);

    try {
      lastMcpErrorRef.current = null;
      // The workplane shows an older state while the history view is open, so a change would land on a design nobody sees.
      if (historyViewStateRef.current && !HISTORY_VIEW_MCP_ACTIONS.has(command.action)) {
        throw new Error("The history view is open. Close it with layerling_set_history_view (open: false) before changing the design.");
      }
      if (command.action === "get_scene") {
        return mcpSceneSnapshot(params.includeRawShapes === true);
      }

      const historyResult = historyViewMcpCommand(command.action, params, {
        entries: () => historyRef.current,
        current: () => historyIndexRef.current,
        showing: () => historyViewStateRef.current,
        openView: openHistoryView,
        closeView: closeHistoryView,
        showState: setHistoryViewIndex,
        busy: () => projectInteractionActiveRef.current,
        clearHistory,
        bringBack: historyView.bringBack,
        openGroups: openGroupCount,
        summary: mcpShapeSummary,
      });
      if (historyResult !== undefined) return historyResult;

      if (command.action === "list_objects") {
        return { objects: currentShapes().map(mcpShapeSummary) };
      }

      if (command.action === "select_objects") {
        const requestedIds = mcpStringArray(params.ids ?? params.id);
        const validIds = requestedIds.filter((id) => currentShapes().some((shape) => shape.id === id));
        setSelectedIds(validIds);
        selectedIdsRef.current = validIds;
        setNotice(validIds.length === 0
          ? t("status.mcpCleared")
          : validIds.length === 1 ? t("status.mcpSelectedOne") : t("status.mcpSelectedMany", { count: validIds.length }));
        return { selectedIds: validIds, objects: currentShapes().filter((shape) => validIds.includes(shape.id)).map(mcpShapeSummary) };
      }

      if (command.action === "delete_objects") {
        const requestedIds = mcpStringArray(params.ids ?? params.id);
        const ids = requestedIds.length ? new Set(requestedIds) : new Set(selectedIdsRef.current);
        const deleted = currentShapes().filter((shape) => ids.has(shape.id));
        if (deleted.length === 0) throw new Error("No matching objects to delete");
        // A locked object stays, as the editor's Delete leaves it.
        if (deleted.some((shape) => shape.locked)) throw new Error("Unlock the objects before deleting them");
        commitShapes(currentShapes().filter((shape) => !ids.has(shape.id)), [], deleted.length === 1 ? t("status.mcpDeletedOne") : t("status.mcpDeletedMany", { count: deleted.length }));
        selectedIdsRef.current = [];
        return { deletedIds: deleted.map((shape) => shape.id), deletedCount: deleted.length };
      }

      if (command.action === "create_shape") {
        const rawKind = mcpString(params.kind, "box");
        if (rawKind === "honeycomb") throw new Error("The honeycomb shape is gone: use layerling_perforate_face to cut a hexagon hole pattern into a face");
        const kind = rawKind === "cube" ? "box" : rawKind;
        const width = Math.max(MIN_SHAPE_DIMENSION, mcpNumber(params.width ?? params.size, 20));
        const depth = Math.max(MIN_SHAPE_DIMENSION, mcpNumber(params.depth ?? params.size, rawKind === "cube" ? width : 20));
        const height = Math.max(MIN_SHAPE_DIMENSION, mcpNumber(params.height ?? params.size, rawKind === "cube" ? width : 20));
        const x = mcpNumber(params.x, 0);
        const z = mcpNumber(params.z, 0);
        const elevation = mcpNumber(params.elevation, placementElevation);
        // Die Farbe steht schon im Katalog; zwei fest eingetragene Farbwerte
        // waeren die dritte Stelle, an der eine neue Form vergessen wird.
        const asset = toolbarShapeAssets.find((entry) => entry.kind === kind);
        const color = mcpString(params.color, asset?.color ?? "#d41721");
        const name = mcpString(params.name, kind === "sketch" ? "Sketch extrusion" : rawKind === "cube" ? "Cube" : asset?.name ?? "Box");
        // Nur was ausdruecklich verlangt wurde: sonst gilt das Mass, mit dem der
        // Katalog diese Form auch von Hand auf die Ebene legt.
        const requestedWidth = mcpOptionalNumber(params.width ?? params.size);
        const requestedDepth = mcpOptionalNumber(params.depth ?? params.size) ?? (rawKind === "cube" ? requestedWidth : undefined);
        const requestedHeight = mcpOptionalNumber(params.height ?? params.size) ?? (rawKind === "cube" ? requestedWidth : undefined);
        // A body of no size cannot be built, and a design holding one would not open again.
        ([["width", requestedWidth], ["depth", requestedDepth], ["height", requestedHeight]] as const).forEach(([key, value]) => {
          if (value !== undefined && value <= 0) throw new Error(`${key} must be greater than 0`);
        });
        let shape: WorkplaneShape;
        if (kind === "sketch") {
          // A stroke builds the outline as a frame, as the editor's Stroke does (#154).
          const stroke = normalizeSketchStroke(params.stroke);
          const profile = { ...defaultMcpSketchProfile(width, depth), ...(stroke ? { stroke } : {}), ...(params.silhouette === true ? { silhouette: true } : {}) };
          const extruded = await cadShapeFromSketchProfile(profile, height);
          shape = canonicalizeShape({
            ...extruded,
            name,
            color,
            x,
            z,
            elevation,
            rotation: mcpNumber(params.rotation, 0),
            rotationX: mcpNumber(params.rotationX, 0),
            rotationZ: mcpNumber(params.rotationZ, 0),
          });
        } else if (asset) {
          // Eine Normgroesse beim Namen wird zuerst zu Durchmesser, Steigung
          // und Profil - danach geht alles den gewohnten Weg.
          const shapeParams = asset.kind === "thread" ? mcpThreadSizeParams(params, DEFAULT_THREAD_PROFILE) : params;
          // Welche Formen es gibt, sagt der Katalog - dieselbe Quelle wie das
          // Formenmenue. Eine eigene Aufzaehlung hier waere nur die naechste
          // Stelle, an der eine neue Form vergessen wird. Fehlende Werte fuellt
          // `makeShapeFromAsset` genau so, wie es beim Ziehen auf die Ebene
          // geschieht: Ein Gewinde bekommt den Platzbedarf seines Durchmessers,
          // ein Zahnrad seine Zaehne, ein Zylinder seine offene Seitenzahl.
          shape = makeShapeFromAsset(
            { ...asset, name, color },
            { x, z, elevation },
            {
              ...mcpShapeCustomization(asset.kind, shapeParams),
              width: requestedWidth,
              depth: requestedDepth,
              height: requestedHeight,
            },
          );
          shape = {
            ...shape,
            rotation: mcpNumber(params.rotation, 0),
            rotationX: mcpNumber(params.rotationX, 0),
            rotationZ: mcpNumber(params.rotationZ, 0),
            // Ein Gewindeloch ist zum Abziehen da, alles andere ist Material.
            hole: typeof params.hole === "boolean" ? params.hole : shape.threadRole === "bore",
          };
          if (shape.kind === "thread") {
            shape = applyMcpThreadSettings(shape, shapeParams, true);
          }
          shape = { ...shape, ...mcpTaperPatch(shape, params, shapeDimensionLimit(workspaceSettingsRef.current, shape.kind, DEFAULT_TAPER_DIMENSION_MAX)) };
          shape = { ...shape, ...mcpExtrudeDeformPatch(shape, params) };
          if (shape.kind === "bentTube") {
            shape = { ...shape, ...mcpBentTubePatch(shape, params) };
          }
          if (shape.kind === "gridfinity") {
            shape = { ...shape, ...gridfinityListPatch(mcpGridfinityListParams(params)) };
          }
          if (shape.kind === "text" && shape.textCurved) {
            shape = { ...shape, ...curvedTextPatch({ ...shape, textCurved: false }, { textCurved: true, textRadius: shape.textRadius, textSize: shape.textSize }) };
          }
        } else {
          throw new Error(`MCP create_shape does not know a shape called "${rawKind}"`);
        }
        // Auf einer Arbeitsebene an einer Flaeche steht die neue Form auf ihr,
        // wie beim Ablegen von Hand; x und z zaehlen dann auf dieser Flaeche.
        // Wer Hoehe oder Drehung selbst angibt, meint die Grundplatte.
        const activeWorkplane = placementWorkplaneRef.current;
        if (!placementWorkplaneIsBase(activeWorkplane) && [params.elevation, params.rotation, params.rotationX, params.rotationZ].every((value) => value === undefined)) {
          const point = placementWorkplanePoint(activeWorkplane, x, z);
          shape = canonicalizeShape({ ...shape, ...placementPatchForNewShape(shape, activeWorkplane, point) });
        }
        // A font of one's own passes the shape defaults by; it is set here, by id or by name.
        const ownFont = shape.kind === "text" && typeof params.font === "string" ? mcpTextFont(params.font) : null;
        if (ownFont && isCustomFontId(ownFont)) shape = canonicalizeShape({ ...shape, font: ownFont });
        const committedShape = canonicalizeShape(bakeShapeTransformIntoMesh(shape));
        commitShapes([...currentShapes(), committedShape], committedShape.id, t("status.shapeAddedMcp", { name: displayShapeName(committedShape) }));
        return { object: mcpShapeSummary(committedShape) };
      }

      if (command.action === "import_mesh") {
        const positions = mcpFiniteNumberArray(params.positions);
        const normals = mcpFiniteNumberArray(params.normals);
        if (positions.length < 9 || positions.length % 9 !== 0) {
          throw new Error("import_mesh requires positions as triangle xyz values");
        }
        let minX = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;
        let minZ = Number.POSITIVE_INFINITY;
        let maxZ = Number.NEGATIVE_INFINITY;
        for (let index = 0; index < positions.length; index += 3) {
          const x = positions[index];
          const y = positions[index + 1];
          const z = positions[index + 2];
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
          minZ = Math.min(minZ, z);
          maxZ = Math.max(maxZ, z);
        }
        const width = Math.max(MIN_SHAPE_DIMENSION, mcpNumber(params.width, maxX - minX));
        const depth = Math.max(MIN_SHAPE_DIMENSION, mcpNumber(params.depth, maxZ - minZ));
        const height = Math.max(MIN_SHAPE_DIMENSION, mcpNumber(params.height, maxY - minY));
        const shape = canonicalizeShape({
          id: createLocalId("mcp-imported-mesh"),
          name: mcpString(params.name, "Imported mesh"),
          kind: "mesh",
          color: mcpString(params.color, "#9bd7f0"),
          x: mcpNumber(params.x, 0),
          z: mcpNumber(params.z, 0),
          elevation: mcpNumber(params.elevation, 0),
          size: Math.max(width, depth),
          width,
          depth,
          height,
          rotation: mcpNumber(params.rotation, 0),
          rotationX: mcpNumber(params.rotationX, 0),
          rotationZ: mcpNumber(params.rotationZ, 0),
          importedMesh: {
            positions,
            normals: normals.length === positions.length ? normals : undefined,
            baseWidth: width,
            baseDepth: depth,
            baseHeight: height,
            triangleCount: Math.floor(positions.length / 9),
            sourceFormat: "json",
          },
          locked: false,
          hidden: false,
        } satisfies WorkplaneShape);
        commitShapes([...currentShapes(), shape], shape.id, t("status.shapeImportedMcp", { name: displayShapeName(shape) }));
        return { object: mcpShapeSummary(shape) };
      }

      if (command.action === "update_object") {
        const gefunden = findShape(params.id);
        if (!gefunden) throw new Error("Object not found");
        // Ein gedrehter Koerper ist ein Netz mit Gedaechtnis. Gedeutet werden
        // die Werte an seiner Urform - sonst kennt das Netz weder Durchmesser
        // noch Seitenzahl, und der Befehl faellt still unter den Tisch.
        const target = shapeWithParametricSource(gefunden);
        // Ein gesperrtes Objekt bleibt unantastbar - es sei denn, der Befehl
        // hebt die Sperre gerade auf. Sonst fuehrt von aussen kein Weg zurueck:
        // Sperren kann die Oberflaeche, entsperren konnte hier bisher niemand.
        if (target.locked && params.locked !== false) {
          throw new Error("Unlock the object before updating it, or pass locked: false");
        }
        const patch: ShapeUpdatePatch = {};
        const rotationWasRequested = [params.rotation, params.rotationX, params.rotationZ].some(
          (value) => typeof value === "number" && Number.isFinite(value),
        );
        (["x", "z", "elevation", "width", "depth", "height", "size", "rotation", "rotationX", "rotationZ"] as const).forEach((key) => {
          if (typeof params[key] === "number" && Number.isFinite(params[key])) {
            patch[key] = params[key];
          }
        });
        // A body of no size cannot be built, and a design holding one would not open again.
        (["width", "depth", "height", "size"] as const).forEach((key) => {
          if (typeof patch[key] === "number" && patch[key] <= 0) throw new Error(`${key} must be greater than 0`);
        });
        if (typeof params.color === "string" && !params.color.trim()) throw new Error("color must not be empty");
        if (typeof params.color === "string") patch.color = params.color;
        if (typeof params.name === "string") patch.name = params.name;
        if (typeof params.hole === "boolean") patch.hole = params.hole;
        if (params.makeEllipse === true) {
          // A cylinder is round; as an ellipse it is the same body with a free length and width.
          const asEllipse = cylinderToEllipsePatch(target);
          if (!asEllipse) throw new Error("Only a plain cylinder can be made an ellipse: not one with a chamfer, a fillet or a wall, nor a turned, imported or grouped one");
          Object.assign(patch, asEllipse);
        }
        if (typeof params.locked === "boolean") patch.locked = params.locked;
        if (typeof params.hidden === "boolean") patch.hidden = params.hidden;
        if (typeof params.transparent === "boolean") patch.transparent = params.transparent || undefined;
        if (typeof params.multicolor === "boolean") patch.multicolor = params.multicolor;
        if (typeof params.font === "string") patch.font = mcpTextFont(params.font) ?? params.font;
        // Alles Formeigene in einem Zug, mit denselben Grenzen wie im
        // Merkmalsfeld: Seitenzahl, Kegelradien, Zahnrad, Gewinde, Feder,
        // Beschriftung. Was die Art gar nicht kennt, faellt dabei weg.
        const shapeParams = target.kind === "thread" ? mcpThreadSizeParams(params, threadSettings(target).profile) : params;
        const settings = mcpShapeCustomization(target.kind, shapeParams);
        (Object.keys(settings) as (keyof ShapeCustomization)[]).forEach((key) => {
          const value = settings[key];
          if (value !== undefined) Object.assign(patch, { [key]: value });
        });
        // Die Verjuengung liest sich aus demselben Objekt, das der Befehl gerade
        // umbaut - erst Breite und Tiefe anwenden, dann die Kanten darauf.
        Object.assign(patch, mcpTaperPatch({ ...target, ...patch }, params, shapeDimensionLimit(workspaceSettingsRef.current, target.kind, DEFAULT_TAPER_DIMENSION_MAX)));
        Object.assign(patch, mcpExtrudeDeformPatch({ ...target, ...patch }, params));
        if (target.kind === "loft") {
          // The stored ends were set above as they came; the frame and the place follow from them here.
          const change = mcpLoftChange(params);
          if (Object.keys(change).length) Object.assign(patch, loftShapePatch(target, change));
        }
        if (target.kind === "gridfinity" && MCP_GRIDFINITY_LIST_KEYS.some((key) => params[key] !== undefined)) {
          Object.assign(patch, gridfinityListPatch(mcpGridfinityListParams(params)));
        }
        if (target.kind === "bentTube" && MCP_BENT_TUBE_KEYS.some((key) => params[key] !== undefined)) {
          const withSettings = { ...target, ...patch };
          const requested = {
            width: typeof params.width === "number" ? params.width : undefined,
            depth: typeof params.depth === "number" ? params.depth : undefined,
            height: typeof params.height === "number" ? params.height : undefined,
            size: typeof params.size === "number" ? params.size : undefined,
            bentTubeSegments: params.bentTubeSegments,
          };
          Object.assign(patch, mcpBentTubePatch(withSettings, requested));
        }
        if (target.kind === "thread") {
          // Der Durchmesser zieht den Platzbedarf mit - sonst macht die
          // Vereinheitlichung die Aenderung gleich wieder rueckgaengig. Und ein
          // Kopf, der bisher auf seinem Normmass stand, wandert mit.
          const before = threadSettings(target);
          const headWasStandard = Math.abs(before.headHeight - defaultThreadHeadHeight(before)) < 1e-6;
          const threaded = applyMcpThreadSettings({ ...target, ...patch }, shapeParams, headWasStandard);
          Object.assign(patch, {
            threadRole: threaded.threadRole,
            threadHead: threaded.threadHead,
            threadHand: threaded.threadHand,
            threadProfile: threaded.threadProfile,
            threadDiameter: threaded.threadDiameter,
            threadPitch: threaded.threadPitch,
            threadClearance: threaded.threadClearance,
            threadBoltClearance: threaded.threadBoltClearance,
            threadAxialClearance: threaded.threadAxialClearance,
            threadDepth: threaded.threadDepth,
            threadFlankAngle: threaded.threadFlankAngle,
            threadQuality: threaded.threadQuality,
            threadHeadHeight: threaded.threadHeadHeight,
            threadChamfer: threaded.threadChamfer,
            threadChamferBottom: threaded.threadChamferBottom,
            threadHeadChamfer: threaded.threadHeadChamfer,
            width: threaded.width,
            depth: threaded.depth,
          });
          // Ein Gewindeloch ist zum Abziehen da; wer die Art wechselt, meint das.
          if (typeof params.hole !== "boolean" && threaded.threadRole !== target.threadRole) {
            patch.hole = threaded.threadRole === "bore";
          }
        }
        // A text's fill (#215) takes the same words as a sketch body's: `stroke` as an object or
        // null, `silhouette` true or false. The box follows the fill in curvedTextPatch.
        if (target.kind === "text") {
          if (params.stroke !== undefined) {
            if (params.stroke === null || params.stroke === false) {
              patch.textStroke = undefined;
            } else {
              const stroke = normalizeSketchStroke({ ...DEFAULT_SKETCH_STROKE, ...target.textStroke, ...(params.stroke as object) });
              if (!stroke) throw new Error("stroke needs a width above 0, or null for the filled letters");
              patch.textStroke = stroke;
            }
          }
          if (typeof params.silhouette === "boolean") patch.textSilhouette = params.silhouette || undefined;
          // Straight text only (#382): the letters stretched to fill the box, or fitted with their proportions.
          if (typeof params.stretch === "boolean") patch.textStretch = params.stretch || undefined;
          // The space between the letters (#594), in per cent of the letter size; the letters keep their size and the box follows.
          if (params.spacing !== undefined) {
            const spacing = Number(params.spacing);
            if (!Number.isFinite(spacing) || spacing < MIN_TEXT_SPACING || spacing > MAX_TEXT_SPACING) throw new Error(`spacing must be a number from ${MIN_TEXT_SPACING} to ${MAX_TEXT_SPACING} (per cent of the letter size)`);
            Object.assign(patch, textSpacingPatch({ ...target, ...patch } as WorkplaneShape, spacing));
          }
          // The top edge of the letters (#225): { kind: "round" | "chamfer", size } or null for none.
          if (params.letterEdge !== undefined) {
            if (params.letterEdge === null || params.letterEdge === false) {
              patch.textEdge = undefined;
            } else {
              const letterEdge = normalizeTextEdge(params.letterEdge);
              if (!letterEdge) throw new Error("letterEdge needs a kind (round or chamfer) and a size in mm, or null for none");
              patch.textEdge = letterEdge;
            }
          }
        }
        const pivotRequest = mcpPivotRequest(params.rotationPivot);
        const withPivotRequest = (shape: WorkplaneShape) => pivotRequest === undefined
          ? shape
          : { ...shape, rotationPivot: pivotRequest ? shapePivotFromWorld(shape, pivotRequest) : undefined };
        const nextShapes = currentShapes().map((shape) => {
          if (shape.id !== target.id) return shape;
          const sauber = cleanShapePatch(patch);
          const neugebaut = patchTouchesBodyParameters(sauber) ? rebuiltParametricShape(shape, sauber) : null;
          if (neugebaut) return withPivotRequest(neugebaut);
          const merged = { ...shape, ...textShrinkPatch(shape, curvedTextPatch(shape, heightPatchKeepingBase(shape, sauber))) };
          // Solid/hole goes through the same rule as the inspector: a mixed group keeps its parts' own state.
          const patched = typeof sauber.hole === "boolean" ? withHoleMode(merged, sauber.hole, sauber.color) : merged;
          const width = shapeWidth(patched);
          const depth = shapeDepth(patched);
          const canonical = withPivotRequest(canonicalizeShape({ ...patched, size: Math.max(width, depth) }));
          return rotationWasRequested ? canonicalizeShape(bakeShapeTransformIntoMesh(canonical)) : canonical;
        });
        let updated = nextShapes.find((shape) => shape.id === target.id) as WorkplaneShape;
        commitShapes(nextShapes, target.id, t("status.shapeUpdatedMcp", { name: displayShapeName(updated) }));
        // The fill of an extruded sketch (#197): built again from its sketch, as the inspector does.
        const fillProfile = updated.sketchProfile && updated.sketchOperation !== "revolve" && updated.sketchOperation !== "sweep"
          ? mcpSketchFillProfile(updated.sketchProfile, params)
          : null;
        if (fillProfile) {
          updated = await rebuildSketchBodyFill(target.id, fillProfile);
          commitShapes(currentShapes().map((shape) => shape.id === target.id ? updated : shape), target.id, t("status.sketchUpdated"));
        }
        // Another kind of body from the same sketch (#655), as the sketch's badge makes it.
        const operationRequest = params.sketchOperation;
        if (operationRequest !== undefined) {
          if (operationRequest !== "extrude" && operationRequest !== "revolve" && operationRequest !== "sweep") throw new Error("sketchOperation must be extrude, revolve or sweep");
          if (!updated.sketchProfile) throw new Error(t("status.selectSketchShape"));
          if (sketchBodyOperation(updated) !== operationRequest) {
            const stretch = sketchBodyOperation(updated) === "extrude" ? sketchBodyStretch(updated) : null;
            const profile = stretch ? stretchedSketchProfile(updated.sketchProfile, stretch.x, stretch.z) : updated.sketchProfile;
            const rebuilt = await sketchBodyAsOperation(updated, profile, operationRequest);
            if (!rebuilt) throw new Error(t("status.closeProfile"));
            updated = rebuilt;
            commitShapes(currentShapes().map((shape) => shape.id === target.id ? rebuilt : shape), target.id, t("status.sketchUpdated"));
          }
        }
        return { object: mcpShapeSummary(updated) };
      }

      if (command.action === "open_group") {
        const id = typeof params.id === "string" ? params.id : selectedIdsRef.current.length === 1 ? selectedIdsRef.current[0] : null;
        if (!id) throw new Error("open_group needs the id of one group");
        const outcome = openGroupForEditing(id);
        if (!outcome.ok) throw new Error(outcome.message);
        return { partIds: outcome.partIds, objects: currentShapes().filter((shape) => outcome.partIds?.includes(shape.id)).map(mcpShapeSummary) };
      }

      if (command.action === "close_group") {
        const outcome = params.cancel === true ? cancelOpenGroup() : await finishOpenGroup();
        if (!outcome.ok) throw new Error(outcome.message);
        const group = outcome.groupId ? findShape(outcome.groupId) : null;
        return { message: outcome.message, object: group ? mcpShapeSummary(group) : null, partIds: outcome.partIds ?? [] };
      }

      if (command.action === "mate_faces") {
        const all = currentShapes();
        const mover = all.find((shape) => shape.id === params.id);
        const target = all.find((shape) => shape.id === params.targetId);
        if (!mover || !target) throw new Error("mate_faces needs id and targetId of two existing objects");
        if (mover.id === target.id) throw new Error("mate_faces needs two different objects");
        if (mover.locked) throw new Error("Unlock the object before moving it");
        const faceOf = (shape: WorkplaneShape, side: unknown, label: string): FacePick => {
          if (typeof side !== "string" || !(side in LAY_FLAT_SIDES)) throw new Error(`mate_faces needs ${label} (bottom/top/left/right/front/back)`);
          const [x, y, z] = LAY_FLAT_SIDES[side as LayFlatSide];
          const normal = nearestFaceNormal(shape, new THREE.Vector3(x, y, z).applyQuaternion(quaternionForShape(shape)));
          if (!normal) throw new Error(`mate_faces found no ${side} face on ${displayShapeName(shape)}`);
          // The outermost corner along the normal lies in the face's plane.
          let point = new THREE.Vector3();
          let reach = Number.NEGATIVE_INFINITY;
          meshForShape(shape).vertices.forEach(([vx, vy, vz]) => {
            const along = vx * normal.x + vy * normal.y + vz * normal.z;
            if (along > reach) {
              reach = along;
              point = new THREE.Vector3(vx, vy, vz);
            }
          });
          return { shapeId: shape.id, normal: { x: normal.x, y: normal.y, z: normal.z }, point: { x: point.x, y: point.y, z: point.z } };
        };
        const mode: MateMode = params.mode === "flush" ? "flush" : "against";
        const gap = typeof params.gap === "number" && Number.isFinite(params.gap) ? params.gap : 0;
        const nextShapes = matedShapes(all, faceOf(mover, params.face, "face"), faceOf(target, params.targetFace, "targetFace"), mode, gap);
        commitShapes(nextShapes, [mover.id], t("status.mated"));
        return { mode, gap, object: mcpShapeSummary(nextShapes.find((shape) => shape.id === mover.id) as WorkplaneShape) };
      }

      if (command.action === "scale_objects") {
        const requestedIds = mcpStringArray(params.ids ?? params.id);
        const ids = requestedIds.length ? requestedIds : selectedIdsRef.current;
        const percent = typeof params.percent === "number" ? params.percent : Number.NaN;
        const mode = params.mode === "each" ? "each" : "together";
        if (ids.length === 0) throw new Error("scale_objects needs ids or a selection");
        const result = scaleSelectionByPercent(ids, percent, mode);
        if (!result.ok) throw new Error(result.message);
        const scaled = new Set(ids);
        return {
          percent,
          mode,
          skippedLocked: result.skipped,
          objects: currentShapes().filter((shape) => scaled.has(shape.id)).map(mcpShapeSummary),
        };
      }

      if (command.action === "lay_flat") {
        const requestedIds = mcpStringArray(params.ids ?? params.id);
        const ids = new Set(requestedIds.length ? requestedIds : selectedIdsRef.current);
        const all = currentShapes();
        const movable = all.filter((shape) => ids.has(shape.id));
        if (movable.length === 0) throw new Error("lay_flat needs ids or a selection");
        if (movable.some((shape) => shape.locked)) throw new Error("Unlock the objects before laying them flat");
        const referenceId = typeof params.referenceId === "string" ? params.referenceId : movable[0].id;
        const reference = movable.find((shape) => shape.id === referenceId) ?? movable[0];
        const side = typeof params.face === "string" && params.face in LAY_FLAT_SIDES ? params.face as LayFlatSide : null;
        const rawNormal = Array.isArray(params.normal) ? params.normal : null;
        let direction: THREE.Vector3 | null = null;
        if (rawNormal && rawNormal.length === 3 && rawNormal.every((value) => typeof value === "number" && Number.isFinite(value))) {
          direction = new THREE.Vector3(rawNormal[0] as number, rawNormal[1] as number, rawNormal[2] as number);
        } else if (side) {
          // A side of the object's own box, turned the way the object is turned.
          const [x, y, z] = LAY_FLAT_SIDES[side];
          direction = new THREE.Vector3(x, y, z).applyQuaternion(quaternionForShape(reference));
        }
        if (!direction || direction.lengthSq() < 1e-12) throw new Error("lay_flat needs face (bottom/top/left/right/front/back) or a normal [x, y, z]");
        const normal = nearestFaceNormal(reference, direction);
        if (!normal) throw new Error("lay_flat found no face on that object");
        const nextShapes = laidFlatShapes(all, movable, { x: normal.x, y: normal.y, z: normal.z }, placementWorkplaneRef.current);
        commitShapes(nextShapes, movable.map((shape) => shape.id), t("status.laidFlat"));
        const movedIds = new Set(movable.map((shape) => shape.id));
        return {
          normal: [normal.x, normal.y, normal.z].map((value) => Number(value.toFixed(4))),
          objects: nextShapes.filter((shape) => movedIds.has(shape.id)).map(mcpShapeSummary),
        };
      }

      if (command.action === "place_on_face") {
        // The same code as the C key in the view (#195).
        const requestedIds = mcpStringArray(params.ids ?? params.id);
        const ids = new Set(requestedIds.length ? requestedIds : selectedIdsRef.current);
        const all = currentShapes();
        const movable = all.filter((shape) => ids.has(shape.id));
        if (movable.length === 0) throw new Error("place_on_face needs ids or a selection");
        if (movable.some((shape) => shape.locked)) throw new Error("Unlock the objects before moving them");
        const vec3 = (value: unknown) => (Array.isArray(value) && value.length === 3 && value.every((entry) => typeof entry === "number" && Number.isFinite(entry))
          ? new THREE.Vector3(value[0] as number, value[1] as number, value[2] as number)
          : null);
        let point = vec3(params.point);
        let normal = vec3(params.normal);
        if (!point || !normal || normal.lengthSq() < 1e-12) {
          const target = all.find((shape) => shape.id === params.targetId);
          if (!target) throw new Error("place_on_face needs targetId (with targetFace) or point and normal");
          if (ids.has(target.id)) throw new Error("place_on_face cannot set objects down on themselves");
          const side = typeof params.targetFace === "string" && params.targetFace in LAY_FLAT_SIDES ? params.targetFace as LayFlatSide : "top";
          const [x, y, z] = LAY_FLAT_SIDES[side];
          const faceNormal = nearestFaceNormal(target, new THREE.Vector3(x, y, z).applyQuaternion(quaternionForShape(target)));
          if (!faceNormal) throw new Error("place_on_face found no face on that object");
          normal = faceNormal.clone().normalize();
          // The middle of the target, moved out along the normal onto the plane of that face.
          const center = new THREE.Vector3(target.x, (target.elevation ?? 0) + target.height / 2, target.z);
          const reach = meshReachAlong(meshForShape(target), normal as THREE.Vector3);
          point = center.clone().addScaledVector(normal, reach - center.dot(normal));
        }
        const patches = carriedOntoFace(all, [...ids], { point, normal }, movable[0].id);
        const nextShapes = all.map((shape) => {
          const patch = patches.get(shape.id);
          return patch ? canonicalizeShape({ ...shape, ...patch }) : shape;
        });
        commitShapes(nextShapes, movable.map((shape) => shape.id), t("status.carryPlaced", { count: movable.length }));
        return {
          point: [point.x, point.y, point.z].map((value) => Number(value.toFixed(4))),
          normal: [normal.x, normal.y, normal.z].map((value) => Number(value.toFixed(4))),
          objects: nextShapes.filter((shape) => ids.has(shape.id)).map(mcpShapeSummary),
        };
      }

      if (command.action === "perforate_face") {
        // The same code as the hole pattern tool in the view (#223).
        const all = currentShapes();
        const selectedNow = selectedIdsRef.current;
        const targetId = typeof params.targetId === "string"
          ? params.targetId
          : typeof params.id === "string" ? params.id : selectedNow.length === 1 ? selectedNow[0] : null;
        const target = all.find((shape) => shape.id === targetId);
        if (!target) throw new Error("perforate_face needs targetId (or exactly one selected object)");
        if (target.locked) throw new Error("Unlock the object before perforating it");
        if (target.hole || isNonSolidShapeKind(target.kind)) throw new Error("perforate_face needs a solid body, not a hole");
        const vec3 = (value: unknown) => (Array.isArray(value) && value.length === 3 && value.every((entry) => typeof entry === "number" && Number.isFinite(entry))
          ? new THREE.Vector3(value[0] as number, value[1] as number, value[2] as number)
          : null);
        let point = vec3(params.point);
        let normal = vec3(params.normal);
        if (!point || !normal || normal.lengthSq() < 1e-12) {
          const side = typeof params.targetFace === "string" && params.targetFace in LAY_FLAT_SIDES ? params.targetFace as LayFlatSide : "top";
          const [x, y, z] = LAY_FLAT_SIDES[side];
          const faceNormal = nearestFaceNormal(target, new THREE.Vector3(x, y, z).applyQuaternion(quaternionForShape(target)));
          if (!faceNormal) throw new Error("perforate_face found no face on that object");
          normal = faceNormal.clone().normalize();
          // The middle of the target, moved out along the normal onto the plane of that face.
          const center = new THREE.Vector3(target.x, (target.elevation ?? 0) + target.height / 2, target.z);
          const reach = meshReachAlong(meshForShape(target), normal as THREE.Vector3);
          point = center.clone().addScaledVector(normal, reach - center.dot(normal));
        }
        const form = params.form === undefined ? DEFAULT_HOLE_PATTERN.form : params.form;
        if (form !== "round" && form !== "square" && form !== "rectangle" && form !== "hexagon" && form !== "slot") {
          throw new Error("perforate_face form must be round, square, rectangle, hexagon or slot");
        }
        const arrangement = params.arrangement === undefined ? DEFAULT_HOLE_PATTERN.arrangement : params.arrangement;
        if (arrangement !== "grid" && arrangement !== "staggered") throw new Error("perforate_face arrangement must be grid or staggered");
        const depth = mcpOptionalNumber(params.depth);
        const size = mcpNumber(params.size, DEFAULT_HOLE_PATTERN.size);
        const settings = normalizeHolePattern({
          form,
          arrangement,
          size,
          height: mcpNumber(params.height, size),
          spacing: mcpNumber(params.spacing, DEFAULT_HOLE_PATTERN.spacing),
          margin: mcpNumber(params.margin, DEFAULT_HOLE_PATTERN.margin),
          depth: depth !== undefined && depth > 0 ? depth : null,
        });
        const read = readPerforableFace(worldTrianglePositions(target), point, normal);
        if (!read.ok) throw new Error(read.reason === "curved" ? "That face is curved; perforate_face needs a flat face" : "perforate_face found no flat face there");
        const plan = holePatternShapes(read.face, settings, t("holePattern.holeName"));
        if (plan.tooMany) throw new Error("That would be too many holes; make them bigger or the spacing wider");
        if (plan.holes.length === 0) throw new Error("No hole fits on that face with this size and margin");
        const sourceFingerprint = projectShapesFingerprint(currentShapes());
        const sourceProjectId = projectInfoRef.current.projectId;
        const result = await buildGroupedShapeFromSelection([target, ...plan.holes], workspaceSettingsRef.current.booleanTriangleLimit);
        if (projectInfoRef.current.projectId !== sourceProjectId || projectShapesFingerprint(currentShapes()) !== sourceFingerprint) {
          throw new Error("The scene changed while perforating; run the command again");
        }
        if (!result.group) throw new Error(result.failureNotice);
        const editableGroup = canonicalizeShape({ ...result.group, groupOperation: "group" });
        commitShapes([...currentShapes().filter((shape) => shape.id !== target.id), editableGroup], editableGroup.id, t("status.holePatternCreated", { count: plan.holes.length }));
        return {
          object: mcpShapeSummary(editableGroup),
          holes: plan.holes.length,
          settings,
          normal: [normal.x, normal.y, normal.z].map((value) => Number(value.toFixed(4))),
        };
      }

      if (command.action === "push_face") {
        // The same code as the face tool in the view: the face read like the hole pattern's, the body built by faceToolBody.
        const all = currentShapes();
        const selectedNow = selectedIdsRef.current;
        const targetId = typeof params.targetId === "string"
          ? params.targetId
          : typeof params.id === "string" ? params.id : selectedNow.length === 1 ? selectedNow[0] : null;
        const target = all.find((shape) => shape.id === targetId);
        if (!target) throw new Error("push_face needs targetId (or exactly one selected object)");
        if (target.locked) throw new Error("Unlock the object before pushing its face");
        if (target.hole || isNonSolidShapeKind(target.kind)) throw new Error("push_face needs a solid body, not a hole");
        const vec3 = (value: unknown) => (Array.isArray(value) && value.length === 3 && value.every((entry) => typeof entry === "number" && Number.isFinite(entry))
          ? new THREE.Vector3(value[0] as number, value[1] as number, value[2] as number)
          : null);
        let point = vec3(params.point);
        let normal = vec3(params.normal);
        if (!point || !normal || normal.lengthSq() < 1e-12) {
          const side = typeof params.targetFace === "string" && params.targetFace in LAY_FLAT_SIDES ? params.targetFace as LayFlatSide : "top";
          const [x, y, z] = LAY_FLAT_SIDES[side];
          const faceNormal = nearestFaceNormal(target, new THREE.Vector3(x, y, z).applyQuaternion(quaternionForShape(target)));
          if (!faceNormal) throw new Error("push_face found no face on that object");
          normal = faceNormal.clone().normalize();
          // The middle of the target, moved out along the normal onto the plane of that face.
          const center = new THREE.Vector3(target.x, (target.elevation ?? 0) + target.height / 2, target.z);
          const reach = meshReachAlong(meshForShape(target), normal as THREE.Vector3);
          point = center.clone().addScaledVector(normal, reach - center.dot(normal));
        }
        if (params.direction !== undefined && params.direction !== "out" && params.direction !== "in") throw new Error("push_face direction must be out or in");
        const settings = normalizeFaceTool({
          direction: params.direction === "in" ? "in" : "out",
          inset: mcpNumber(params.inset, 0),
          radius: mcpNumber(params.radius, 0),
          depth: mcpNumber(params.depth, DEFAULT_FACE_TOOL.depth),
        });
        const read = readPerforableFace(worldTrianglePositions(target), point, normal);
        if (!read.ok) throw new Error(read.reason === "curved" ? "That face is curved; push_face needs a flat face" : "push_face found no flat face there");
        const sourceFingerprint = projectShapesFingerprint(currentShapes());
        const sourceProjectId = projectInfoRef.current.projectId;
        const body = await faceToolBody(target, read.face, settings, {
          name: t(settings.direction === "in" ? "faceTool.pocketName" : "faceTool.bodyName"),
          color: target.color,
        });
        if (!body) throw new Error("The inset leaves nothing of that face; make it smaller");
        const result = await buildGroupedShapeFromSelection([target, body], workspaceSettingsRef.current.booleanTriangleLimit);
        if (projectInfoRef.current.projectId !== sourceProjectId || projectShapesFingerprint(currentShapes()) !== sourceFingerprint) {
          throw new Error("The scene changed while pushing the face; run the command again");
        }
        if (!result.group) throw new Error(result.failureNotice);
        const editableGroup = canonicalizeShape({ ...result.group, groupOperation: "group" });
        commitShapes(
          [...currentShapes().filter((shape) => shape.id !== target.id), editableGroup],
          editableGroup.id,
          t(settings.direction === "in" ? "status.faceToolPocketCreated" : "status.faceToolCreated", { depth: Number(faceToolSettingsOn(read.face, settings).depth.toFixed(2)) }),
        );
        return {
          object: mcpShapeSummary(editableGroup),
          settings: faceToolSettingsOn(read.face, settings),
          normal: [normal.x, normal.y, normal.z].map((value) => Number(value.toFixed(4))),
        };
      }

      if (command.action === "align_objects") {
        const axis = params.axis === "x" || params.axis === "y" || params.axis === "z" ? params.axis : null;
        const target = params.target === "min" || params.target === "center" || params.target === "max" ? params.target : null;
        if (!axis || !target) throw new Error("align_objects requires axis x/y/z and target min/center/max");
        const requestedIds = mcpStringArray(params.ids);
        const ids = requestedIds.length ? requestedIds : selectedIdsRef.current;
        const selectedForAlign = currentShapes().filter((shape) => ids.includes(shape.id));
        if (selectedForAlign.length < 2) throw new Error("Select at least two objects to align");
        const validIds = selectedForAlign.map((shape) => shape.id);
        const requestedAnchorId = typeof params.anchorId === "string" ? params.anchorId : null;
        const anchorId = effectiveAlignmentAnchorId(selectedForAlign, requestedAnchorId);
        const { nextShapes, moved } = alignedShapesForSelection(currentShapes(), validIds, selectedForAlign, anchorId, axis, target, alignAxesForWorkplane(placementWorkplaneRef.current));
        if (moved === 0) {
          setSelectedIds(validIds);
          selectedIdsRef.current = validIds;
          setNotice(t("status.mcpAligned", { label: alignmentLabel(axis, target) }));
          return {
            moved,
            selectedIds: validIds,
            anchorId,
            objects: selectedForAlign.map(mcpShapeSummary),
          };
        }
        commitShapes(nextShapes, validIds, moved === 1
          ? t("status.mcpAlignedOne", { alignment: alignmentLabel(axis, target) })
          : t("status.mcpAlignedMany", { count: moved, alignment: alignmentLabel(axis, target) }));
        return {
          moved,
          selectedIds: validIds,
          anchorId,
          objects: nextShapes.filter((shape) => validIds.includes(shape.id)).map(mcpShapeSummary),
        };
      }

      if (command.action === "group_objects") {
        const ids = new Set(mcpStringArray(params.ids));
        const groupable = currentShapes().filter((shape) => ids.has(shape.id));
        if (groupable.length < 2) throw new Error("Select at least two objects to group");
        if (groupable.some((shape) => shape.locked)) throw new Error("Unlock every selected object before grouping");
        if (groupable.some((shape) => isNonSolidShapeKind(shape.kind))) throw new Error("A ruler isn't a solid and can't be grouped");
        const sourceFingerprint = projectShapesFingerprint(currentShapes());
        const sourceProjectId = projectInfoRef.current.projectId;
        const result = await buildGroupedShapeFromSelection(groupable, workspaceSettingsRef.current.booleanTriangleLimit);
        if (projectInfoRef.current.projectId !== sourceProjectId || projectShapesFingerprint(currentShapes()) !== sourceFingerprint) {
          throw new Error("The scene changed while grouping; run the command again");
        }
        if (!result.group) {
          if (result.consumed) {
            commitShapes(currentShapes().filter((shape) => !ids.has(shape.id)), null, t("status.mcpGroupConsumed"));
            return { consumed: true, objects: currentShapes().filter((shape) => !ids.has(shape.id)).map(mcpShapeSummary) };
          }
          throw new Error(result.failureNotice);
        }
        const editableGroup = canonicalizeShape({ ...result.group, groupOperation: "group" });
        commitShapes([...currentShapes().filter((shape) => !ids.has(shape.id)), editableGroup], editableGroup.id, result.mergeWarning ?? t("status.mcpGrouped", { count: groupable.length }));
        return result.mergeWarning
          ? { object: mcpShapeSummary(editableGroup), warning: result.mergeWarning }
          : { object: mcpShapeSummary(editableGroup) };
      }

      if (command.action === "bundle_objects") {
        const ids = new Set(mcpStringArray(params.ids));
        const parts = currentShapes().filter((shape) => ids.has(shape.id));
        if (parts.length < 2) throw new Error("Pass at least two objects to bundle");
        if (parts.some((shape) => shape.locked)) throw new Error("Unlock every object before bundling");
        if (parts.some((shape) => isNonSolidShapeKind(shape.kind))) throw new Error("A ruler isn't a solid and can't be bundled");
        const group = groupedShape(parts);
        if (!group) throw new Error("Could not bundle these objects");
        const bundle = canonicalizeShape({ ...group, name: "Bundle", groupOperation: "bundle" });
        commitShapes([...currentShapes().filter((shape) => !ids.has(shape.id)), bundle], bundle.id, t("status.mcpBundled", { count: parts.length }));
        return { object: mcpShapeSummary(bundle) };
      }

      if (command.action === "layer_text") {
        const id = typeof params.id === "string" ? params.id : null;
        const target = id ? currentShapes().find((shape) => shape.id === id) : null;
        if (!target) throw new Error("layer_text needs the id of a text or a layered-text bundle");
        if (target.locked) throw new Error("Unlock the object first");
        if (!offersTextLayers(target)) throw new Error("Only a text, or a bundle made by layer_text, can be layered");
        const stack = textLayerStack(target);
        if (!stack) throw new Error("Could not read the text's layers");
        const wasText = target.kind === "text";
        // A font by name as update_object takes it: a font of one's own becomes its id, a built-in name stays.
        const font = typeof params.font === "string" ? mcpTextFont(params.font) ?? params.font : undefined;
        const source = { ...stack.source, ...(typeof params.text === "string" ? { text: params.text.slice(0, 24) || " " } : {}), ...(font ? { font } : {}) };
        const requested = params.layers !== undefined ? normalizeTextLayers(params.layers) : null;
        if (params.layers !== undefined && !requested) throw new Error("layers must be 1 to 6 entries with grow, height, color and silhouette");
        const badCorner = layerTextLayersError(params.layers);
        if (badCorner) throw new Error(badCorner);
        const layers = requested ?? (wasText ? [...DEFAULT_TEXT_LAYERS] : stack.layers);
        // The key ring hole (#215): left out it stays as the stack has it.
        const keyringArgument = layerTextKeyringArgument(params.keyring);
        if (keyringArgument && "error" in keyringArgument) throw new Error(keyringArgument.error);
        // A free hole (#598) is placed from the middle of the letters.
        const keyring = keyringArgument ? placedKeyring(keyringArgument.keyring, { width: shapeWidth(source), depth: shapeDepth(source) }) : stack.keyring;
        await keyringRuntimeReady(keyring);
        const names = Array.isArray(params.names) ? mcpStringArray(params.names).map((name) => name.trim()).filter(Boolean).slice(0, 100) : [];
        if (names.length) {
          const gap = typeof params.gap === "number" && Number.isFinite(params.gap) ? Math.max(0, params.gap) : 5;
          const probe = layeredTextShape({ ...source, text: names[0] }, layers, [], target.id, target, stack.source.text, keyring);
          const width = shapeWidth(probe);
          const depth = shapeDepth(probe);
          const columns = Math.max(1, Math.round(Math.sqrt((names.length * (depth + gap)) / (width + gap))));
          const offsets = nameTagOffsets(names.length, width, depth, gap, columns);
          const tags = names.map((name, index) => layeredTextShape(
            { ...source, text: name, x: source.x + offsets[index].x, z: source.z + offsets[index].z },
            layers,
            [],
            index === 0 ? target.id : createLocalId("text-tag"),
            { locked: false, hidden: false, name },
            stack.source.text,
            keyring,
          ));
          commitShapes([...currentShapes().filter((shape) => shape.id !== target.id), ...tags], tags.map((tag) => tag.id), t("status.mcpTextTagsMade", { count: tags.length }));
          return { objects: tags.map(mcpShapeSummary) };
        }
        const next = layeredTextShape(source, layers, wasText ? [] : stack.ids, target.id, target, stack.source.text, keyring);
        commitShapes(currentShapes().map((shape) => (shape.id === target.id ? next : shape)), next.id, t("status.mcpTextLayered", { count: layers.length }));
        return { object: mcpShapeSummary(next), layers, keyring };
      }

      if (command.action === "sweep_sketch") {
        // The same body the Sweep sketch builds: the outline of the section and the path as construction lines (#400).
        const profile = sweepSketchProfile(
          { path: sweepPathFromParams(params.path), closed: params.closed === true, section: sweepSectionFromParams(params.section) },
          createLocalId,
        );
        const swept = await cadShapeFromSketchSweep(profile, null);
        const named = {
          ...swept,
          ...(typeof params.name === "string" && params.name.trim() ? { name: params.name.trim().slice(0, 60) } : {}),
          ...(typeof params.color === "string" && params.color.trim() ? { color: params.color.trim() } : {}),
        };
        const placed = placeSketchShape(named, placementWorkplaneRef.current, null);
        commitShapes([...currentShapes(), placed], placed.id, t("status.sweepCreated"));
        return { object: mcpShapeSummary(placed) };
      }

      if (command.action === "create_qr_code") {
        const text = typeof params.text === "string" ? params.text : "";
        if (!text) throw new Error("create_qr_code needs a text");
        const errorCorrection = params.errorCorrection ?? "M";
        if (!QR_ERROR_CORRECTIONS.includes(errorCorrection as QrErrorCorrection)) throw new Error("errorCorrection must be L, M, Q or H");
        const style = params.style ?? "code";
        if (!QR_STYLES.includes(style as QrStyle)) throw new Error("style must be code, raised or engraved");
        if (!qrTextFits(text, errorCorrection as QrErrorCorrection)) {
          throw new Error(`The text takes ${qrByteLength(text)} bytes; error correction ${errorCorrection} holds at most ${QR_BYTE_CAPACITY[errorCorrection as QrErrorCorrection]}`);
        }
        const inRange = (value: unknown, min: number, max: number) => typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
        if (params.width !== undefined && !inRange(params.width, MIN_QR_WIDTH, MAX_QR_WIDTH)) throw new Error(`width must be ${MIN_QR_WIDTH} to ${MAX_QR_WIDTH} mm`);
        if (params.height !== undefined && !inRange(params.height, MIN_QR_HEIGHT, MAX_QR_HEIGHT)) throw new Error(`height must be ${MIN_QR_HEIGHT} to ${MAX_QR_HEIGHT} mm`);
        if (params.plateThickness !== undefined && !inRange(params.plateThickness, MIN_QR_HEIGHT, MAX_QR_HEIGHT)) throw new Error(`plateThickness must be ${MIN_QR_HEIGHT} to ${MAX_QR_HEIGHT} mm`);
        const settings = normalizeQrSettings({
          text,
          errorCorrection,
          style,
          quietZone: params.quietZone !== false,
          ...(params.height !== undefined ? { codeHeight: params.height } : {}),
          ...(params.plateThickness !== undefined ? { plateThickness: params.plateThickness } : {}),
        })!;
        if (settings.style === "engraved" && settings.codeHeight > settings.plateThickness - 0.2) throw new Error("The engraving must be at least 0.2 mm shallower than the plate");
        const width = typeof params.width === "number" ? params.width : DEFAULT_QR_WIDTH;
        const built = await qrCodeShape(settings, width, workspaceSettingsRef.current.booleanTriangleLimit);
        const shape = canonicalizeShape({
          ...built,
          ...(params.asHole === true ? { hole: true } : {}),
          ...(typeof params.name === "string" && params.name.trim() ? { name: params.name.trim().slice(0, 60) } : {}),
        });
        commitShapes([...currentShapes(), shape], shape.id, t("status.qrCodeAdded"));
        const modules = qrMatrix(settings.text, settings.errorCorrection).length;
        const moduleSize = qrModuleSize(modules, width, settings.style, settings.quietZone);
        return {
          object: mcpShapeSummary(shape),
          modules,
          moduleSize: Math.round(moduleSize * 1000) / 1000,
          ...(qrModuleTooSmall(moduleSize) ? { warning: `A module is ${Math.round(moduleSize * 100) / 100} mm, under the 0.8 mm rule of thumb for a readable print: make the code wider, the text shorter or the error correction lower` } : {}),
        };
      }

      if (command.action === "layer_icon") {
        const svg = typeof params.svg === "string" && params.svg.trim() ? params.svg : null;
        const id = typeof params.id === "string" ? params.id : null;
        if (!svg && !id) throw new Error("layer_icon needs the text of an SVG file (svg), or the id of an extruded sketch body or an icon tag");
        const requested = params.layers !== undefined ? normalizeTextLayers(params.layers) : null;
        if (params.layers !== undefined && !requested) throw new Error("layers must be 1 to 6 entries with grow, height, color and silhouette");
        const badCorner = layerTextLayersError(params.layers);
        if (badCorner) throw new Error(badCorner);
        // An icon has no letters: a letter edge on a layer is left out.
        const layers = requested?.map(({ edge: _edge, ...layer }) => layer) ?? null;
        if (params.width !== undefined && !(typeof params.width === "number" && params.width >= MIN_ICON_TAG_WIDTH && params.width <= MAX_ICON_TAG_WIDTH)) {
          throw new Error(`width must be ${MIN_ICON_TAG_WIDTH} to ${MAX_ICON_TAG_WIDTH} mm`);
        }
        const width = typeof params.width === "number" ? params.width : null;
        const count = params.count === undefined ? 1 : normalizeIconTagCount(Number(params.count));
        const keyringArgument = layerTextKeyringArgument(params.keyring);
        if (keyringArgument && "error" in keyringArgument) throw new Error(keyringArgument.error);
        const plate = workspaceSettingsRef.current;
        let tag: WorkplaneShape;
        let status: string;
        if (svg) {
          const label = typeof params.name === "string" && params.name.trim() ? params.name.trim().slice(0, 60) : "Icon tag";
          const { area, name } = await svgIconArea(`${label}.svg`, svg, width ?? DEFAULT_ICON_TAG_WIDTH);
          tag = await layeredIconShape(area, layers ?? ICON_TAG_LAYERS, { x: 0, z: 0, elevation: 0, rotation: 0, rotationX: 0, rotationZ: 0 }, [], createLocalId("icon-tag"), { locked: false, hidden: false, name }, keyringArgument ? placedKeyring(keyringArgument.keyring, iconBox(area)) : null);
          status = t("status.iconTagAdded", { name });
        } else {
          const target = currentShapes().find((shape) => shape.id === id);
          if (!target) throw new Error(`No object with id ${id}`);
          if (target.locked) throw new Error("Unlock the object first");
          if (!offersIconLayers(target)) throw new Error("Only an extruded sketch body (an imported SVG, say) or an icon tag can be layered");
          const stack = iconLayerStack(target);
          if (!stack) throw new Error("Could not read the icon's layers");
          const wasBody = !target.layeredIcon;
          const area = await iconTagArea(stack.source, stack.width, width ?? stack.width);
          const built = layers ?? (wasBody ? [...ICON_TAG_LAYERS] : stack.layers);
          tag = await layeredIconShape(area, built, stack.place, wasBody ? [] : stack.ids, target.id, wasBody ? { ...target, name: stack.name } : target, keyringArgument ? placedKeyring(keyringArgument.keyring, iconBox(area)) : stack.keyring);
          status = t(wasBody ? "status.iconLayered" : "status.iconLayersUpdated", { count: built.length });
        }
        const tags = count > 1 ? iconTagCopies(tag, count, { width: plate.width, depth: plate.depth }) : [tag];
        const others = currentShapes().filter((shape) => shape.id !== tag.id);
        commitShapes([...others, ...tags], tags.map((entry) => entry.id), count > 1 ? t("status.iconTagsMade", { count: tags.length }) : status);
        return count > 1 ? { objects: tags.map(mcpShapeSummary) } : { object: mcpShapeSummary(tag) };
      }

      if (command.action === "intersect_objects") {
        const ids = new Set(mcpStringArray(params.ids));
        const groupable = currentShapes().filter((shape) => ids.has(shape.id));
        if (groupable.some((shape) => shape.locked)) throw new Error("Unlock every selected object before intersecting");
        if (groupable.some((shape) => isNonSolidShapeKind(shape.kind))) throw new Error("A ruler isn't a solid and can't be intersected");
        if (!canIntersectShapes(groupable)) throw new Error("Pass two solids, or a solid and a hole, to intersect");
        const sourceFingerprint = projectShapesFingerprint(currentShapes());
        const sourceProjectId = projectInfoRef.current.projectId;
        const result = await buildIntersectionShapeFromSelection(groupable, workspaceSettingsRef.current.booleanTriangleLimit);
        if (projectInfoRef.current.projectId !== sourceProjectId || projectShapesFingerprint(currentShapes()) !== sourceFingerprint) {
          throw new Error("The scene changed while intersecting; run the command again");
        }
        if (!result.group && !result.empty) throw new Error(result.failureNotice);
        const remainingShapes = currentShapes().filter((shape) => !ids.has(shape.id));
        if (result.empty) {
          commitShapes(remainingShapes, null, t("status.intersectionEmpty"));
          return { empty: true, objects: remainingShapes.map(mcpShapeSummary) };
        }
        const intersection = canonicalizeShape({ ...result.group!, groupOperation: "intersection" });
        commitShapes([...remainingShapes, intersection], intersection.id, t("status.intersectedMany", { count: groupable.length }));
        return { object: mcpShapeSummary(intersection) };
      }

      if (command.action === "ungroup_objects") {
        const requestedIds = mcpStringArray(params.ids ?? params.id);
        const ids = requestedIds.length ? new Set(requestedIds) : new Set(selectedIdsRef.current);
        const groups = currentShapes().filter((shape) => ids.has(shape.id) && (shape.groupedShapes?.length || wasGroupBeforeEdgeTreatments(shape)));
        if (groups.length === 0) throw new Error("Select at least one group to ungroup");
        if (groups.some((shape) => shape.locked)) throw new Error("Unlock the groups before ungrouping them");
        const groupIds = new Set(groups.map((shape) => shape.id));
        // A group with a fillet or chamfer is one mesh; its edge features are taken back first (#514).
        const restored = groups.flatMap((shape) => restoreGroupedChildren(shape.groupedShapes?.length ? shape : groupBeforeEdgeTreatments(shape)!));
        commitShapes([...currentShapes().filter((shape) => !groupIds.has(shape.id)), ...restored], restored.map((shape) => shape.id), groups.length === 1 ? t("status.mcpUngroupedOne") : t("status.mcpUngroupedMany", { count: groups.length }));
        return { objects: restored.map(mcpShapeSummary) };
      }

      if (command.action === "boolean_cut") {
        const solidIds = new Set(mcpStringArray(params.solidIds ?? params.solids));
        const holeIds = new Set(mcpStringArray(params.holeIds ?? params.holes));
        const operandIds = new Set([...solidIds, ...holeIds]);
        const operands = currentShapes()
          .filter((shape) => operandIds.has(shape.id))
          .map((shape) => holeIds.has(shape.id) ? withHoleMode(shape, true) : withHoleMode(shape, false));
        if (!operands.some((shape) => !shape.hole) || !operands.some((shape) => shape.hole)) {
          throw new Error("Provide at least one solidId and one holeId for boolean_cut");
        }
        if (operands.some((shape) => shape.locked)) {
          throw new Error("Unlock every boolean operand before cutting");
        }
        if (operands.some((shape) => isNonSolidShapeKind(shape.kind))) {
          throw new Error("A ruler isn't a solid and can't be a boolean operand");
        }
        const sourceFingerprint = projectShapesFingerprint(currentShapes());
        const sourceProjectId = projectInfoRef.current.projectId;
        const result = await buildGroupedShapeFromSelection(operands, workspaceSettingsRef.current.booleanTriangleLimit);
        if (projectInfoRef.current.projectId !== sourceProjectId || projectShapesFingerprint(currentShapes()) !== sourceFingerprint) {
          throw new Error("The scene changed while cutting; run the command again");
        }
        const remainingShapes = currentShapes().filter((shape) => !operandIds.has(shape.id));
        if (result.consumed) {
          commitShapes(remainingShapes, null, t("status.mcpCutConsumed"));
          return { consumed: true };
        }
        if (!result.group) {
          throw new Error(result.failureNotice);
        }
        const editableGroup = canonicalizeShape({ ...result.group, groupOperation: "group" });
        commitShapes([...remainingShapes, editableGroup], editableGroup.id, t("status.mcpBooleanCut"));
        return { object: mcpShapeSummary(editableGroup) };
      }

      if (command.action === "wrap_around_cylinder") {
        const target = findShape(params.id) ?? (selectedIdsRef.current.length === 1 ? findShape(selectedIdsRef.current[0]) : null);
        if (!target) throw new Error("Select one object to wrap");
        if (target.locked) throw new Error("Unlock the object before wrapping it");
        if (target.cylinderWrap) throw new Error("This object is already wrapped around a cylinder: undo the wrapping, or wrap the flat original again");
        if (!canWrapAroundCylinder(target)) throw new Error("This object cannot be wrapped; a bundle or a measuring tool has no body of its own");
        const diameter = mcpNumber(params.diameter, Number.NaN);
        if (!Number.isFinite(diameter) || diameter <= 0) throw new Error("diameter must be a positive number of millimetres");
        if (params.inward !== undefined && typeof params.inward !== "boolean") throw new Error("inward must be true or false");
        const inward = params.inward === true;
        const wrapped = cylinderWrappedShape(target, diameter, inward);
        if (typeof wrapped === "string") throw new Error(cylinderWrapErrorText(wrapped, target, diameter));
        commitShapes(
          currentShapes().map((shape) => (shape.id === target.id ? wrapped : shape)),
          [wrapped.id],
          t("status.mcpWrapped"),
        );
        return { object: mcpShapeSummary(wrapped) };
      }

      if (command.action === "simplify_mesh") {
        const target = findShape(params.id) ?? (selectedIdsRef.current.length === 1 ? findShape(selectedIdsRef.current[0]) : null);
        if (!target) throw new Error("Select one object to simplify, or pass its id");
        if (target.locked) throw new Error("Unlock the object before simplifying it");
        const source = target.importedMesh;
        if (!source || target.groupOperation === "bundle") throw new Error("Only an imported mesh or the mesh result of a cut, merge or wrap can be simplified; a shape from the catalogue has its own settings for that");
        const hasPercent = params.keepPercent !== undefined;
        const hasTarget = params.targetTriangles !== undefined;
        if (hasPercent === hasTarget) throw new Error("Pass either keepPercent or targetTriangles");
        const requested = hasPercent
          ? source.triangleCount * mcpNumber(params.keepPercent, Number.NaN) / 100
          : mcpNumber(params.targetTriangles, Number.NaN);
        if (!Number.isFinite(requested) || requested <= 0) throw new Error(hasPercent ? "keepPercent must be a number above 0 and below 100" : "targetTriangles must be a positive number");
        if (Math.round(requested) >= source.triangleCount) throw new Error(`The mesh has ${source.triangleCount} triangles; the target must be below that`);
        const result = await simplifyTrianglePositions(source.positions, requested);
        const simplified = simplifiedMeshShape(target, result.positions);
        if (!simplified) throw new Error("The mesh cannot be simplified any further without changing its form");
        commitShapes(
          currentShapes().map((shape) => (shape.id === target.id ? simplified : shape)),
          [simplified.id],
          t("status.mcpSimplified"),
        );
        return { object: mcpShapeSummary(simplified), trianglesBefore: source.triangleCount, trianglesAfter: result.triangleCount };
      }

      const customShapeResult = await runCustomShapeMcp(command.action, params);
      if (customShapeResult !== undefined) return customShapeResult;

      if (command.action === "separate_parts") {
        const target = findShape(params.id) ?? (selectedIdsRef.current.length === 1 ? findShape(selectedIdsRef.current[0]) : null);
        if (!target) throw new Error("Select one object to separate");
        if (target.locked) throw new Error("Unlock the object before separating parts");
        // A sketch body comes apart by its outlines, one exact body with its own sketch each (#669).
        const parts = separatesBySketch(target) ? await separateSketchBodyParts(target) : separateShapeParts(target);
        if (parts.length <= 1) throw new Error("The selected object has only one connected part");
        commitShapes([...currentShapes().filter((shape) => shape.id !== target.id), ...parts], parts.map((shape) => shape.id), t("status.mcpSeparated", { count: parts.length }));
        return { objects: parts.map(mcpShapeSummary) };
      }

      if (command.action === "split_objects") {
        const requestedIds = mcpStringArray(params.ids);
        const ids = requestedIds.length > 0 ? requestedIds : selectedIdsRef.current;
        const targets = ids.map((id) => findShape(id)).filter((shape): shape is WorkplaneShape => Boolean(shape));
        if (targets.length === 0) throw new Error("No objects to split - pass ids or select solids first");
        if (targets.some((shape) => shape.locked)) throw new Error("A locked object cannot be split - unlock it first");
        if (targets.some((shape) => shape.hidden)) throw new Error("A hidden object cannot be split - show it first");
        if (targets.some((shape) => isNonSolidShapeKind(shape.kind))) throw new Error("A ruler isn't a solid and can't be split");
        // Like the panel's "Align to workplane" (#644): the workplane sets the axis and the tilt.
        const alongWorkplane = params.alongWorkplane === undefined ? undefined : mcpString(params.alongWorkplane, "");
        if (alongWorkplane !== undefined && alongWorkplane !== "parallel" && alongWorkplane !== "acrossX" && alongWorkplane !== "acrossY") {
          throw new Error("alongWorkplane must be parallel, acrossX or acrossY");
        }
        if (alongWorkplane && (params.axis !== undefined || params.rotationX !== undefined || params.rotationY !== undefined || params.rotationZ !== undefined)) {
          throw new Error("alongWorkplane sets the axis and the tilt itself - leave out axis and rotationX/Y/Z");
        }
        const workplane = placementWorkplaneRef.current;
        const workplaneDirection = alongWorkplane === "parallel" ? workplane.normal : alongWorkplane === "acrossX" ? workplane.xAxis : alongWorkplane === "acrossY" ? workplane.zAxis : null;
        const workplaneOrientation = workplaneDirection ? splitOrientationForNormal([workplaneDirection.x, workplaneDirection.y, workplaneDirection.z]) : null;
        const axis = workplaneOrientation?.axis ?? (params.axis === undefined ? "y" : splitAxisFromLabel(mcpString(params.axis, "")));
        if (!axis) throw new Error("axis must be x, y or z");
        // Angles come named in the panel's axes (Z up); the one the plane cuts across has nothing to turn.
        if (params[`rotation${splitAxisLabel(axis)}`] !== undefined) throw new Error(`rotation${splitAxisLabel(axis)} turns the plane in place - use the other two axes for an angled ${splitAxisLabel(axis).toLowerCase()} cut`);
        const rotationAxes = splitRotationAxes(axis);
        const rotationAbout = (rotationAxis: AlignAxis) => Math.max(-180, Math.min(180, mcpNumber(params[`rotation${splitAxisLabel(rotationAxis)}`], 0)));
        const rotation: SplitRotation = workplaneOrientation?.rotation ?? [rotationAbout(rotationAxes[0]), rotationAbout(rotationAxes[1])];
        const points = targets.flatMap((shape) => meshForShape(shape).vertices);
        const range = modelSplitPlane(points, axis, undefined, rotation);
        if (!range) throw new Error("The objects have no printable geometry to split");
        // Along the workplane the plane goes through its origin where that crosses the objects, as in the panel.
        const throughWorkplane = workplaneOrientation
          ? range.normal[0] * workplane.origin.x + range.normal[1] * workplane.origin.y + range.normal[2] * workplane.origin.z
          : undefined;
        const workplanePosition = throughWorkplane !== undefined && throughWorkplane > range.min + 1e-6 && throughWorkplane < range.max - 1e-6
          ? snapSplitPositionToVertices(points, range.normal, throughWorkplane)
          : undefined;
        const requestedPosition = params.position === undefined ? workplanePosition : mcpNumber(params.position, range.position);
        if (requestedPosition !== undefined && (requestedPosition <= range.min || requestedPosition >= range.max)) {
          throw new Error(`position must lie inside the objects, between ${Number(range.min.toFixed(3))} and ${Number(range.max.toFixed(3))}`);
        }
        const plane = modelSplitPlane(points, axis, requestedPosition, rotation) ?? range;
        const sourceFingerprint = projectShapesFingerprint(currentShapes());
        const sourceProjectId = projectInfoRef.current.projectId;
        const outcome = await splitShapesByPlane(
          targets,
          plane,
          () => projectInfoRef.current.projectId === sourceProjectId && projectShapesFingerprint(currentShapes()) === sourceFingerprint,
        );
        if (outcome.status === "stale") throw new Error("The scene changed while splitting; run the command again");
        if (outcome.status === "failed") throw new Error(t("split.error.failed", { name: outcome.shape.name, detail: outcome.error }));
        if (outcome.splitCount === 0) throw new Error("The plane does not cut through any of the objects - move it with position");
        const parts = [...outcome.replacements.values()].flat();
        commitShapes(
          currentShapes().flatMap((shape) => outcome.replacements.get(shape.id) ?? [shape]),
          parts.map((shape) => shape.id),
          outcome.splitCount === 1
            ? t("status.splitOne", { count: parts.length })
            : t("status.splitMany", { count: outcome.splitCount, bodies: parts.length }),
        );
        return {
          axis: splitAxisLabel(axis).toLowerCase(),
          ...Object.fromEntries(rotationAxes.map((rotationAxis, index) => [`rotation${splitAxisLabel(rotationAxis)}`, rotation[index]])),
          position: plane.position,
          min: plane.min,
          max: plane.max,
          splitIds: [...outcome.replacements.keys()],
          objects: parts.map(mcpShapeSummary),
        };
      }

      if (command.action === "list_edges") {
        const target = findShape(params.id);
        if (!target) throw new Error("Object not found");
        invalidateCadModifierSession();
        const sharpAngle = Math.max(1, Math.min(CAD_MODIFIER_MAX_SHARP_ANGLE, mcpNumber(params.sharpAngle, 25)));
        const { response } = await prepareCadModifierForMcp(target, sharpAngle);
        const selectableEdgeIds = response.edges.filter((edge) => selectableCadModifierEdge(edge, sharpAngle)).map((edge) => edge.id);
        return { object: mcpShapeSummary(target), sharpAngle, selectableEdgeIds, edges: response.edges };
      }

      if (command.action === "list_faces") {
        const target = findShape(params.id);
        if (!target) throw new Error("Object not found");
        invalidateCadModifierSession();
        const { response } = await prepareCadModifierForMcp(target, 25, { faces: true });
        const round = (value: number) => Number(value.toFixed(4));
        const faces = (response.faces?.list ?? []).map((face) => ({
          id: face.id,
          kind: face.kind,
          area: round(face.area),
          center: [round(face.center.x), round(face.center.y), round(face.center.z)],
          ...(face.normal ? { normal: [face.normal.x, face.normal.y, face.normal.z] } : {}),
        }));
        return { object: mcpShapeSummary(target), faces };
      }

      if (command.action === "delete_faces") {
        const target = findShape(params.id);
        if (!target) throw new Error("Object not found");
        if (target.groupOperation === "bundle") throw new Error("A bundle is not one body; group it (layerling_group_objects) or delete faces of its parts one by one");
        const faceIds = [...new Set(mcpNumberArray(params.faceIds))];
        if (faceIds.length === 0) throw new Error("Give faceIds from layerling_list_faces");
        const modifiedShape = await deleteFacesShape(target, faceIds);
        commitShapes(
          shapesRef.current.map((candidate) => candidate.id === target.id ? modifiedShape : candidate),
          modifiedShape.id,
          faceIds.length === 1 ? t("status.facesDeletedMcpOne") : t("status.facesDeletedMcpMany", { count: faceIds.length }),
        );
        return { object: mcpShapeSummary(modifiedShape), deletedFaceIds: faceIds };
      }

      if (command.action === "hollow_object") {
        const target = findShape(params.id);
        if (!target) throw new Error("Object not found");
        if (target.groupOperation === "bundle") throw new Error("A bundle is not one body; group it (layerling_group_objects) or hollow its parts one by one");
        const thickness = Math.max(0.2, mcpNumber(params.thickness, 2));
        // A list of sides, or one of the names the tool had before it took every side.
        const openings: ShellOpenings = Array.isArray(params.openings)
          ? shellOpeningsFor(params.openings.filter((side: unknown): side is ShellSide => SHELL_SIDES.includes(side as ShellSide)))
          : params.openings === "none" || params.openings === "bottom" || params.openings === "top-bottom" ? params.openings : "top";
        const edges: ShellEdges = params.edges === "sharp" ? "sharp" : "round";
        const modifiedShape = await shellShape(target, thickness, openings, edges);
        commitShapes(
          shapesRef.current.map((candidate) => candidate.id === target.id ? modifiedShape : candidate),
          modifiedShape.id,
          t("status.shelledMcp", { size: Number(thickness.toFixed(2)) }),
        );
        return { object: mcpShapeSummary(modifiedShape), thickness, openings, edges };
      }

      if (command.action === "array_objects") {
        const requestedIds = mcpStringArray(params.ids);
        const ids = requestedIds.length > 0 ? requestedIds : selectedIdsRef.current;
        const sources = ids.map((id) => findShape(id)).filter((shape): shape is WorkplaneShape => Boolean(shape));
        if (sources.length === 0) throw new Error("No objects to repeat - pass ids or select something first");
        if (sources.some((shape) => shape.locked)) throw new Error("A locked object cannot be repeated - unlock it first");
        const mode = params.mode === "circle" ? "circle" : "row";
        const direction = params.direction === "y" || params.direction === "z" ? params.direction : "x";
        const bounds = boundsForShapes(sources);
        // spacingX / spacingY / spacingZ step along several axes at once; the
        // older spacing + direction pair still steps along one.
        const perAxis = params.spacingX !== undefined || params.spacingY !== undefined || params.spacingZ !== undefined;
        const spacings = perAxis
          ? { spacingX: mcpNumber(params.spacingX, 0), spacingY: mcpNumber(params.spacingY, 0), spacingZ: mcpNumber(params.spacingZ, 0) }
          : singleAxisSpacing(direction, mcpNumber(params.spacing, bounds.maxX - bounds.minX + 5));
        const settings: ArraySettings = {
          mode,
          count: clampArrayCount(mcpNumber(params.count, 2)),
          ...spacings,
          angle: mcpNumber(params.angle, 360),
          centerX: mcpNumber(params.centerX, 0),
          centerY: mcpNumber(params.centerY, 0),
          rotateCopies: params.rotateCopies !== false,
          rise: mcpNumber(params.rise, 0),
          radiusChange: mcpNumber(params.radiusChange, 0),
        };
        const copies = arrayCopies(sources, settings);
        commitShapes(
          [...shapesRef.current, ...copies],
          [...sources.map((shape) => shape.id), ...copies.map((shape) => shape.id)],
          t("status.arrayCreated", { count: copies.length }),
        );
        return { settings, originals: sources.map((shape) => shape.id), copies: copies.map(mcpShapeSummary) };
      }

      if (command.action === "apply_edge_treatment") {
        const target = findShape(params.id);
        if (!target) throw new Error("Object not found");
        if (isNonSolidShapeKind(target.kind)) throw new Error("A ruler isn't a solid and has no edges to treat");
        if (target.locked) throw new Error("Unlock the object before treating its edges");
        return applyCadModifierForMcp(target, params);
      }

      if (command.action === "measure_section") {
        // Wie "Messen" in der Schnittansicht: beide Punkte rasten am Umriss
        // des Schnitts ein, der zweite bevorzugt im rechten Winkel zur Wand.
        const axisParam = params.axis === undefined ? undefined : mcpString(params.axis, "x").toLowerCase();
        if (axisParam !== undefined && axisParam !== "x" && axisParam !== "y" && axisParam !== "z") throw new Error("axis must be x, y or z");
        const current = window.layerlingSectionView?.({}).settings;
        const axis = (axisParam ?? current?.axis ?? "x") as SectionPlaneAxis;
        const offset = params.offset !== undefined
          ? mcpNumber(params.offset, 0)
          : current?.enabled && current.axis === axis
            ? current.offset
            : getSectionBounds(currentShapes(), axis, workspaceSettings.width, workspaceSettings.depth).center;
        // The section as it is set, turned to the workplane or the view (#644): only when no axis or offset is given.
        const frame = axisParam === undefined && params.offset === undefined && current?.enabled ? current.frame ?? null : null;
        const readPoint = (value: unknown, name: string): [number, number, number] => {
          if (!value || typeof value !== "object") throw new Error(`${name} must be an object with x, z and elevation`);
          const point = value as Record<string, unknown>;
          const x = mcpNumber(point.x, axis === "x" ? offset : 0);
          const z = mcpNumber(point.z, axis === "z" ? offset : 0);
          const elevation = mcpNumber(point.elevation, axis === "y" ? offset : 0);
          if (frame) return sectionPointToFrame([x, elevation, z], frame);
          return [axis === "x" ? offset : x, axis === "y" ? offset : elevation, axis === "z" ? offset : z];
        };
        const radius = Math.max(0, mcpNumber(params.snapRadius, 1));
        const loops = await sectionContours(axis, offset, frame);
        if (loops.length === 0) throw new Error(t("status.sectionSvgMissed"));
        const from = snapSectionPoint(projectSectionPoint(readPoint(params.from, "from"), axis), loops, radius);
        const to = snapSectionPoint(projectSectionPoint(readPoint(params.to, "to"), axis), loops, radius, from.point);
        const measured = sectionMeasurement(from.point, to.point, axis, offset, loops);
        const inWorld = (point: { u: number; v: number }) => sectionPointFromFrame(sectionPointToWorld(point, axis, offset), frame);
        const asEditor = (point: { u: number; v: number }) => {
          const [x, y, z] = inWorld(point);
          return { x: Number(x.toFixed(4)), z: Number(z.toFixed(4)), elevation: Number(y.toFixed(4)) };
        };
        if (frame) {
          const [ax, ay, az] = inWorld(from.point);
          const [bx, by, bz] = inWorld(to.point);
          measured.deltaX = bx - ax;
          measured.deltaHeight = by - ay;
          measured.deltaDepth = bz - az;
        }
        return {
          axis,
          offset,
          ...(frame ? { orientation: current?.orientation ?? "world" } : {}),
          outlines: loops.length,
          from: { ...asEditor(from.point), snap: from.kind },
          to: { ...asEditor(to.point), snap: to.kind },
          distance: Number(measured.distance.toFixed(4)),
          deltaX: Number(measured.deltaX.toFixed(4)),
          deltaZ: Number(measured.deltaDepth.toFixed(4)),
          deltaElevation: Number(measured.deltaHeight.toFixed(4)),
          circle: measured.circle,
        };
      }

      if (command.action === "show_overhangs") {
        // Wie "Ueberhaenge zeigen" im Sichtbarkeitsmenue, dazu die Flaechen je Koerper.
        if (params.angle !== undefined) {
          const angle = normalizeOverhangAngle(mcpNumber(params.angle, DEFAULT_OVERHANG_ANGLE));
          updateProjectWorkspaceSettings({ workspace: { ...workspaceSettingsRef.current, overhangAngle: angle }, snap: snapGridRef.current });
        }
        if (typeof params.enabled === "boolean" && params.enabled !== overhangsVisibleRef.current) {
          setOverhangsVisible(params.enabled);
          overhangsVisibleRef.current = params.enabled;
        }
        const angle = workspaceSettingsRef.current.overhangAngle;
        const requestedIds = mcpStringArray(params.ids ?? params.id);
        const solids = currentShapes().filter((shape) => !shape.hidden && !shape.hole && !isNonSolidShapeKind(shape.kind)
          && (requestedIds.length === 0 || requestedIds.includes(shape.id)));
        const objects = solids.map((shape) => {
          const parts = expandBundles([shape]).filter((part) => !part.hole && !part.hidden);
          const mesh = parts.length === 1 ? meshForShape(parts[0]) : (() => {
            const vertices: Vec3[] = [];
            const faces: [number, number, number][] = [];
            parts.forEach((part) => appendMeshData(vertices, faces, meshForShape(part)));
            return { name: shape.name, vertices, faces };
          })();
          const found = overhangArea(mesh.vertices, mesh.faces, angle);
          return {
            id: shape.id,
            name: shape.name,
            overhangAreaMm2: Number(found.areaMm2.toFixed(2)),
            lowestOverhangHeight: found.lowestY === null ? null : Number(found.lowestY.toFixed(3)),
          };
        });
        return {
          enabled: overhangsVisibleRef.current,
          angle,
          objects,
          note: "Faces lying on the plate do not count. A face resting on another body still counts; holes inside groups are already taken off.",
        };
      }

      if (command.action === "add_reference_points") {
        let positions: ReferencePosition[];
        if (Array.isArray(params.points)) {
          positions = params.points.map((entry) => {
            const point = (entry ?? {}) as Record<string, unknown>;
            const x = Number(point.x);
            const z = Number(point.z);
            const y = Number(point.elevation ?? 0);
            if (![x, y, z].every(Number.isFinite)) throw new Error("Each point needs a number for x and z, and optionally for elevation");
            return { x, y, z };
          });
        } else {
          const spot = params.at ?? "center";
          if (spot !== "center" && spot !== "corners" && spot !== "midpoints") throw new Error("at must be center, corners or midpoints");
          const requestedIds = mcpStringArray(params.ids ?? params.id);
          const pickIds = requestedIds.length ? requestedIds : selectedIdsRef.current;
          const targets = currentShapes().filter((shape) => pickIds.includes(shape.id) && !shape.hole);
          if (targets.length === 0) throw new Error("Name the objects to mark with ids, or select some, or pass points");
          const box = unionReferenceBoxes(targets.map(meshAabb));
          if (!box) throw new Error("The objects have no size to mark");
          positions = referencePointsForBox(box, spot);
        }
        if (positions.length === 0) throw new Error("No points given");
        const createdIds = addReferencePoints(positions);
        const created = referencePoints(notesRef.current).filter((point) => createdIds.includes(point.id)).map(mcpPointInfo);
        return {
          added: created.length,
          points: created,
          note: created.length === 0
            ? "Nothing added: these points are already marked, or the design holds as many notes and points as it can."
            : "Points on the top face of the objects (elevation is the height). Shapes snap to them when dragged, and the corner ruler snaps to them.",
        };
      }

      if (command.action === "list_reference_points") {
        return { points: referencePoints(notesRef.current).map(mcpPointInfo) };
      }

      if (command.action === "remove_reference_points") {
        const ids = mcpStringArray(params.ids ?? params.id);
        const current = notesRef.current;
        const targets = referencePoints(current).filter((point) => ids.length === 0 || ids.includes(point.id));
        if (ids.length > 0 && targets.length === 0) throw new Error("No reference point has these ids");
        if (targets.length > 0) commitNotes(current.filter((note) => !targets.includes(note)), t("status.pointRemoved"));
        return { removed: targets.length };
      }

      if (command.action === "estimate_print") {
        // Dieselbe Rechnung wie das Feld "Material" im Exportfenster.
        const requestedIds = mcpStringArray(params.ids ?? params.id);
        const pickIds = requestedIds.length ? requestedIds : selectedIdsRef.current;
        const source = pickIds.length ? currentShapes().filter((shape) => pickIds.includes(shape.id)) : currentShapes();
        if (requestedIds.length && source.length === 0) throw new Error("No matching objects to estimate");
        if (params.material !== undefined && !(PRINT_MATERIALS as readonly unknown[]).includes(params.material)) {
          throw new Error(`material must be one of ${PRINT_MATERIALS.join(", ")}`);
        }
        const material = normalizePrintMaterial(params.material);
        if (params.infillPercent !== undefined && !(typeof params.infillPercent === "number" && params.infillPercent >= 0 && params.infillPercent <= 100)) {
          throw new Error("infillPercent must be a number from 0 to 100");
        }
        if (params.walls !== undefined && !(typeof params.walls === "number" && Number.isInteger(params.walls) && params.walls >= 1 && params.walls <= 6)) {
          throw new Error("walls must be a whole number from 1 to 6");
        }
        const volume = await exportSolidVolume(source);
        if (volume.solids === 0) throw new Error("Nothing to estimate: no visible solid body");
        const estimate = printEstimate(volume.volumeMm3, material);
        const withInfill = printEstimateWithInfill(
          volume.volumeMm3,
          { sideMm2: volume.sideMm2, flatMm2: volume.flatMm2 },
          material,
          params.infillPercent === undefined ? DEFAULT_INFILL_PERCENT : (params.infillPercent as number),
          params.walls === undefined ? DEFAULT_WALLS : (params.walls as number),
        );
        return {
          scope: requestedIds.length ? "ids" : pickIds.length ? "selection" : "design",
          material,
          densityGPerCm3: PRINT_MATERIAL_DENSITY[material],
          filamentDiameterMm: FILAMENT_DIAMETER_MM,
          volumeMm3: Number(estimate.volumeMm3.toFixed(1)),
          volumeCm3: Number(estimate.volumeCm3.toFixed(3)),
          grams: Number(estimate.grams.toFixed(2)),
          filamentMeters: Number(estimate.filamentMeters.toFixed(3)),
          solids: volume.solids,
          bodies: volume.bodies,
          unionFailed: volume.unionFailed,
          note: "volumeMm3, grams and filamentMeters are for a solid body, the upper bound. `estimate` is a rough guess with the walls and the infill, as the export window shows it; the slicer's own settings decide the real number.",
          estimate: {
            infillPercent: withInfill.infillPercent,
            walls: withInfill.walls,
            printedVolumeMm3: Number(withInfill.printed.volumeMm3.toFixed(1)),
            grams: Number(withInfill.printed.grams.toFixed(2)),
            filamentMeters: Number(withInfill.printed.filamentMeters.toFixed(3)),
          },
        };
      }

      if (command.action === "inspect_errors") {
        return {
          notice: noticeRef.current || t("status.ready"),
          edgeModifierError: edgeModifierRef.current?.error ?? null,
          lastMcpError: lastMcpErrorRef.current,
          recentNotices: reportNoticesRef.current.map((event) => ({ at: new Date(event.at).toISOString(), text: event.text })),
          recentErrors: reportErrorsRef.current.map((event) => ({ at: new Date(event.at).toISOString(), text: event.text })),
        };
      }

      if (command.action === "show_workplane") {
        if (!window.layerlingWorkplaneDisplay) throw new Error("The workplane display is not available in this editor");
        if (params.visible !== undefined && typeof params.visible !== "boolean") throw new Error("visible must be true or false");
        return window.layerlingWorkplaneDisplay(params.visible as boolean | undefined);
      }

      if (command.action === "set_section_view") {
        if (!window.layerlingSectionView) throw new Error("The section view is not available in this editor");
        const axis = params.axis === undefined ? undefined : mcpString(params.axis, "x").toLowerCase();
        if (axis !== undefined && axis !== "x" && axis !== "y" && axis !== "z") throw new Error("axis must be x, y or z");
        const offset = params.offset === undefined ? undefined : mcpNumber(params.offset, 0);
        const orientation = params.orientation === undefined ? undefined : mcpString(params.orientation, "world").toLowerCase();
        if (orientation !== undefined && orientation !== "world" && orientation !== "workplane" && orientation !== "view") {
          throw new Error("orientation must be world, workplane or view");
        }
        const result = window.layerlingSectionView({
          ...(typeof params.enabled === "boolean" ? { enabled: params.enabled } : {}),
          ...(orientation ? { orientation: orientation as SectionOrientation } : {}),
          ...(axis ? { axis: axis as SectionPlaneAxis } : {}),
          ...(offset !== undefined ? { offset } : {}),
          ...(typeof params.flipped === "boolean" ? { flipped: params.flipped } : {}),
          ...(typeof params.showPlane === "boolean" ? { showPlane: params.showPlane } : {}),
          ...(params.center === true ? { center: true } : {}),
        });
        return result;
      }

      if (command.action === "saved_view") {
        if (!window.layerlingSavedViews) throw new Error("Saved views are not available in this editor");
        const slotOf = (value: unknown) => {
          const key = String(value);
          const slot = SAVED_VIEW_KEYS.indexOf(key as (typeof SAVED_VIEW_KEYS)[number]);
          if (slot < 0) throw new Error("key must be 7, 8, 9 or 0");
          return slot;
        };
        const save = params.save === undefined ? undefined : slotOf(params.save);
        const show = params.show === undefined ? undefined : slotOf(params.show);
        const result = window.layerlingSavedViews({ ...(save !== undefined ? { save } : {}), ...(show !== undefined ? { show } : {}) });
        if (show !== undefined && !result.shown) throw new Error(`No view is saved under ${SAVED_VIEW_KEYS[show]}; save one first with save: "${SAVED_VIEW_KEYS[show]}"`);
        return result;
      }

      if (command.action === "add_font") {
        const fileName = mcpString(params.fileName, "font.ttf").trim() || "font.ttf";
        if (typeof params.base64 !== "string" || !params.base64) throw new Error("base64 is required: the font file as base64");
        const bytes = Uint8Array.from(atob(params.base64), (char) => char.charCodeAt(0));
        let typeface;
        try {
          typeface = await addCustomFontFile(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer, fileName, getManifoldRuntime);
        } catch (error) {
          throw new Error(customFontErrorMessage(error));
        }
        if (params.useOnSelection === true) applyCustomFontToSelection(typeface.id);
        return { id: typeface.id, name: typeface.name, characters: Object.keys(typeface.data.glyphs as object).length };
      }

      if (command.action === "list_fonts") {
        const stored = new Set((await storedCustomFonts().catch(() => [])).map((font) => font.id));
        return {
          builtIn: ["Multilanguage", "Sans", "Serif", "Script", "Monospace", "Rounded", "Stencil", "Japanese"],
          custom: customFontList().map((font) => ({ id: font.id, name: font.name, stored: stored.has(font.id), complete: font.complete })),
        };
      }

      if (command.action === "import_file") {
        // Wie eine Datei im Importfenster: dieselbe Auswertung, dieselben
        // Farben, ZIP und .mtl eingeschlossen.
        const importer = importFilesRef.current;
        if (!importer) throw new Error("The import is not ready yet");
        const fileName = mcpString(params.fileName, "").trim();
        if (!fileName) throw new Error("fileName is required, with its extension (.obj, .stl, .3mf, .step, .svg or .zip)");
        const hasText = typeof params.text === "string";
        const hasBase64 = typeof params.base64 === "string";
        if (hasText === hasBase64) throw new Error("Give the file either as text or as base64");
        const bytes = hasText
          ? new TextEncoder().encode(params.text as string)
          : Uint8Array.from(atob(params.base64 as string), (char) => char.charCodeAt(0));
        const files = [new File([bytes as BlobPart], fileName)];
        if (typeof params.mtl === "string") files.push(new File([params.mtl], fileName.replace(/\.[^.]+$/, "") + ".mtl"));
        // Through MCP the answer does not depend on a setting of the browser: only a wish keeps the page.
        const result = await importer(files, undefined, { keepSvgPage: params.keepPagePosition === true, svgWidth: typeof params.svgWidth === "number" && params.svgWidth > 0 ? params.svgWidth : null });
        if (!result.importedIds.length) throw new Error(result.failures.map((failure) => `${failure.fileName}: ${failure.reason}`).join("; ") || "Nothing was imported");
        const imported = currentShapes().filter((shape) => result.importedIds.includes(shape.id));
        return {
          imported: imported.map((shape) => ({ id: shape.id, name: shape.name, color: shape.color, width: shape.width, depth: shape.depth, height: shape.height, x: shape.x, z: shape.z, elevation: shape.elevation ?? 0 })),
          failures: result.failures,
        };
      }

      if (command.action === "export_section_svg") {
        // Ohne Angaben der Schnitt, wie er gerade eingestellt ist; die
        // Schnittansicht selbst bleibt dabei unberuehrt.
        const axisParam = params.axis === undefined ? undefined : mcpString(params.axis, "x").toLowerCase();
        if (axisParam !== undefined && axisParam !== "x" && axisParam !== "y" && axisParam !== "z") throw new Error("axis must be x, y or z");
        const current = window.layerlingSectionView?.({}).settings;
        const axis = (axisParam ?? current?.axis ?? "x") as SectionPlaneAxis;
        const offset = params.offset !== undefined
          ? mcpNumber(params.offset, 0)
          : current?.enabled && current.axis === axis
            ? current.offset
            : getSectionBounds(currentShapes(), axis, workspaceSettings.width, workspaceSettings.depth).center;
        const frame = axisParam === undefined && params.offset === undefined && current?.enabled ? current.frame ?? null : null;
        const built = await buildSectionSvg(axis, offset, frame);
        return {
          axis,
          offset,
          seenFrom: SECTION_VIEW_FACE[axis],
          bodies: built.result.bodyCount,
          loops: built.result.loopCount,
          openLoops: built.result.openCount,
          widthMm: Number(built.result.width.toFixed(3)),
          heightMm: Number(built.result.height.toFixed(3)),
          hiddenSkipped: built.hiddenCount,
          svg: built.result.svg,
        };
      }

      if (command.action === "export_drawing") {
        // The drawing the export window makes: three views at 1:1 with the overall sizes and the round
        // bores, from the same bodies as the export. ids limit it to those objects (holes still cut).
        const ids = Array.isArray(params.ids) ? params.ids.filter((id): id is string => typeof id === "string") : [];
        const format = params.format === undefined ? "svg" : mcpString(params.format, "svg").toLowerCase();
        if (format !== "svg" && format !== "pdf") throw new Error("format must be svg or pdf");
        const all = currentShapes();
        const chosen = ids.length ? all.filter((shape) => ids.includes(shape.id)) : all;
        if (ids.length && chosen.length === 0) throw new Error("None of the ids is an object in this design");
        const { drawing, hiddenNote } = await buildDrawing({ shapes: chosen, selection: ids.length > 0 }, all, projectName);
        if (!drawing) throw new Error(t(hiddenNote ? "status.exportOnlyHidden" : "status.addSolidBeforeExport"));
        const { drawingToSvg, drawingToPdf, drawingBoreRows } = await import("@/lib/drawingExport");
        const round = (value: number) => Number(value.toFixed(3));
        const result: Record<string, unknown> = {
          sheet: drawing.paper ?? "custom",
          widthMm: round(drawing.width),
          heightMm: round(drawing.height),
          views: drawing.views.map((view) => ({ id: view.id, name: view.name, widthMm: round(view.projection.width), heightMm: round(view.projection.height), bores: view.holes.length })),
          bores: drawingBoreRows(drawing).map((row) => ({ id: row.id, view: row.view, diameterMm: round(row.diameter), xMm: round(row.x), yMm: round(row.y) })),
          format,
        };
        if (format === "svg") result.svg = drawingToSvg(drawing);
        else {
          const bytes = drawingToPdf(drawing);
          let binary = "";
          for (let index = 0; index < bytes.length; index += 8192) binary += String.fromCharCode(...bytes.subarray(index, index + 8192));
          result.pdfBase64 = btoa(binary);
        }
        return result;
      }

      if (command.action === "export_mesh") {
        // The file the export window writes as STL, 3MF or OBJ, from the same bodies: visible solids only, loose
        // holes taken off, overlapping bodies merged (STL) or separated by colour (3MF, OBJ), and the tiny loose
        // pieces left out. ids limit it to those objects (holes still cut). SVG is the top view the window writes:
        // the silhouette from above, or with view "footprint" only the outlines standing on the workplane (#692).
        const format = params.format === undefined ? "stl" : mcpString(params.format, "stl").toLowerCase();
        if (format !== "stl" && format !== "3mf" && format !== "obj" && format !== "svg") throw new Error("format must be stl, 3mf, obj or svg");
        const svgView = params.view === undefined ? "silhouette" : mcpString(params.view, "silhouette").toLowerCase();
        if (svgView !== "silhouette" && svgView !== "footprint") throw new Error("view must be silhouette or footprint");
        const ids = Array.isArray(params.ids) ? params.ids.filter((id): id is string => typeof id === "string") : [];
        const all = currentShapes();
        const chosen = ids.length ? all.filter((shape) => ids.includes(shape.id)) : all;
        if (ids.length && chosen.length === 0) throw new Error("None of the ids is an object in this design");
        const scoped = ids.length ? [...chosen, ...all.filter((shape) => shape.hole && !chosen.some((picked) => picked.id === shape.id))] : chosen;
        const { visible, hiddenNote } = visibleExportShapes(scoped);
        if (!visible.some((shape) => !shape.hole && !isNonSolidShapeKind(shape.kind))) throw new Error(t(hiddenNote ? "status.exportOnlyHidden" : "status.addSolidBeforeExport"));
        const invalidSvg = visible.map(invalidSvgMeshReason).find((reason): reason is string => Boolean(reason));
        if (invalidSvg) throw new Error(t("status.svgInvalid", { reason: invalidSvg }));
        if (format === "svg") {
          let svg: string;
          let outlines: number | undefined;
          if (svgView === "footprint") {
            const result = await footprintSvg(visible, projectName);
            svg = result.svg;
            outlines = result.loopCount;
          } else {
            const { solids, meshes: cutMeshes, cut } = await exportBodiesWithLooseHoles(visible);
            svg = await toSvg(solids, projectName, cutMeshes.map((mesh, index) => (cut[index] ? mesh : null)));
          }
          const svgBytes = new TextEncoder().encode(svg);
          let svgBinary = "";
          for (let index = 0; index < svgBytes.length; index += 8192) svgBinary += String.fromCharCode(...svgBytes.subarray(index, index + 8192));
          return { format, view: svgView, fileName: projectExportFileName(projectName, "svg"), bytes: svgBytes.length, ...(outlines === undefined ? {} : { outlines }), base64: btoa(svgBinary) };
        }
        const { solids: cutSolids, meshes, cut: wasCut, holeCutsFailed } = await exportBodiesWithLooseHoles(visible);
        const joined = await (format === "stl" ? unionOverlappingExportMeshes(cutSolids, meshes, wasCut) : colorSeparatedExportMeshes(cutSolids, meshes, wasCut));
        // A group showing its parts in their own colours keeps them in 3MF and OBJ (#153).
        const partFaceColors = (mesh: MeshData, sourceIndex: number) => {
          const source = cutSolids[sourceIndex];
          const solids = source ? multicolorExportSolids(source) : null;
          if (!source || !solids) return undefined;
          const colors = exportFaceColors(mesh, solids, source.color);
          solids.forEach(({ probe }) => {
            disposeBoundsTree.call(probe.geometry);
            probe.geometry.dispose();
            (probe.material as THREE.Material).dispose();
          });
          return colors;
        };
        let bytes: Uint8Array;
        if (format === "stl") {
          bytes = new Uint8Array(exportMeshesToStl(joined.meshes));
        } else {
          const bodies = joined.meshes.map((mesh, index) => ({
            ...mesh,
            ...(format === "3mf" ? { name: cutSolids[joined.quellen[index]]?.name || mesh.name } : {}),
            color: cutSolids[joined.quellen[index]]?.color,
            faceColors: partFaceColors(mesh, joined.quellen[index]),
          }));
          bytes = format === "3mf"
            ? exportMeshesTo3mf(bodies, { title: projectName }) as Uint8Array
            : new TextEncoder().encode(exportMeshesToObj(bodies));
        }
        let binary = "";
        for (let index = 0; index < bytes.length; index += 8192) binary += String.fromCharCode(...bytes.subarray(index, index + 8192));
        return {
          format,
          fileName: projectExportFileName(projectName, format),
          bytes: bytes.length,
          bodies: joined.meshes.length,
          triangles: joined.meshes.reduce((total, mesh) => total + mesh.faces.length, 0),
          mergedBodies: joined.verschmolzen,
          failedMerges: joined.gescheitert + holeCutsFailed,
          loosePiecesLeftOut: joined.splinters,
          base64: btoa(binary),
        };
      }

      if (command.action === "save_project") {
        // The project the export window packs as .lyl, handed to the MCP server, which writes it where the caller
        // asked (#494). The editor's own save target is left as it is, so Ctrl+S goes on writing where it wrote.
        if (projectInteractionActiveRef.current) throw new Error(t("status.finishBeforeSave"));
        const requested = params.history;
        let historyLimit: LylHistoryLimit = workspaceSettingsRef.current.historyLimit;
        if (requested === "all") historyLimit = "unlimited";
        else if (typeof requested === "number" && Number.isFinite(requested)) historyLimit = Math.max(0, Math.round(requested));
        else if (requested !== undefined) throw new Error("history must be a number of steps or \"all\"");
        const view = historyViewStateRef.current;
        const exportedHistory = view
          ? editorHistoryBranch(historyRef.current, view.index, historyLimit)
          : editorHistoryForExport(historyRef.current, historyIndexRef.current, historyLimit);
        const projectShapes = view ? view.shapes : shapesRef.current;
        const bytes = await exportLylProject({
          projectId: projectInfoRef.current.projectId,
          projectName,
          createdAt: projectCreatedAt,
          modifiedAt: projectModifiedAt,
          shapes: projectShapes,
          notes: view ? view.notes : notesRef.current,
          history: exportedHistory.entries,
          historyIndex: exportedHistory.index,
          assets: projectAssetsRef.current,
          workspace: workspaceSettingsRef.current,
          snapGrid,
          placementElevation: view ? view.placementElevation : placementElevation,
          placementWorkplane: view ? view.placementWorkplane : placementWorkplane,
          sketchPlacementWorkplane: view ? view.placementWorkplane : placementWorkplane,
        });
        let binary = "";
        for (let index = 0; index < bytes.length; index += 8192) binary += String.fromCharCode(...bytes.subarray(index, index + 8192));
        return {
          fileName: projectExportFileName(projectName, "lyl"),
          bytes: bytes.length,
          objects: projectShapes.length,
          historySteps: exportedHistory.entries.length,
          historyView: Boolean(view),
          base64: btoa(binary),
        };
      }

      if (command.action === "set_workplane") {
        // Wie W und ein Klick auf eine Flaeche: eine Seite des eigenen Rahmens
        // des Koerpers, eingerastet auf die echte Flaeche, die Ebene in ihrer Mitte.
        let placed: PlacementWorkplane | null = null;
        if (typeof params.id === "string") {
          const target = shapesRef.current.find((shape) => shape.id === params.id);
          if (!target) throw new Error(`No object with id ${params.id}`);
          if (target.hidden) throw new Error("Show the object before setting the workplane on it");
          const side = typeof params.face === "string" ? params.face : "top";
          if (!(side in LAY_FLAT_SIDES)) throw new Error("face must be top, bottom, left, right, front or back");
          const quaternion = quaternionForShape(target);
          const [sx, sy, sz] = LAY_FLAT_SIDES[side as LayFlatSide];
          const normal = nearestFaceNormal(target, new THREE.Vector3(sx, sy, sz).applyQuaternion(quaternion)) ?? new THREE.Vector3(sx, sy, sz).applyQuaternion(quaternion);
          const { vertices } = meshForShape(target);
          const reach = vertices.reduce((most, v) => Math.max(most, v[0] * normal.x + v[1] * normal.y + v[2] * normal.z), Number.NEGATIVE_INFINITY);
          const onFace = vertices.filter((v) => v[0] * normal.x + v[1] * normal.y + v[2] * normal.z >= reach - 1e-3);
          const origin = onFace.reduce((sum, v) => ({ x: sum.x + v[0] / onFace.length, y: sum.y + v[1] / onFace.length, z: sum.z + v[2] / onFace.length }), { x: 0, y: 0, z: 0 });
          const tangent = new THREE.Vector3(side === "left" || side === "right" ? 0 : 1, 0, side === "left" || side === "right" ? 1 : 0).applyQuaternion(quaternion);
          placed = placementWorkplaneFromSurface(origin, { x: normal.x, y: normal.y, z: normal.z }, { x: tangent.x, y: tangent.y, z: tangent.z }, params.flip === true, true);
          setActivePlacementWorkplane(placed, "shape");
        }
        // On the plane of the section view, as the button there does (#154).
        if (params.onSection === true) {
          const section = window.layerlingSectionView?.({}).settings;
          if (!section?.enabled) throw new Error("Switch the section view on first (layerling_section_view), then the workplane can lie on its cut");
          placed = sectionPlacementWorkplane(section);
          setActivePlacementWorkplane(placed, "shape");
        }
        if (params.reset === true) setActivePlacementWorkplane(horizontalPlacementWorkplane(), "base");
        const current = params.reset === true ? horizontalPlacementWorkplane() : placed ?? placementWorkplaneRef.current;
        const onBase = placementWorkplaneIsBase(current);
        if (typeof params.visible === "boolean") {
          if (onBase && !params.visible) throw new Error("The workplane is the base plate; only a workplane set on a face can be hidden");
          setWorkplaneHidden(!params.visible);
          workplaneHiddenRef.current = !params.visible;
          setNotice(params.visible ? t("status.workplaneShown") : t("status.workplaneHidden"));
        }
        return { onBase, hidden: !onBase && workplaneHiddenRef.current, origin: current.origin, normal: current.normal };
      }

      if (command.action === "capture_image") {
        const face = mcpString(params.face, "current") as LayerlingMcpViewFace;
        const clean = params.clean === true || typeof params.plate === "boolean" || typeof params.transparent === "boolean";
        let image = await (window.layerlingCaptureView?.(face) ?? window.layerlingCaptureCanvas?.() ?? "");
        // The same clean picture the PNG export saves: only the bodies, the camera already turned to `face`.
        if (clean) image = window.layerlingCaptureImage?.({ plate: params.plate !== false, transparent: params.transparent === true }) ?? "";
        if (!image || image.length < 100) {
          throw new Error("The Layerling viewport did not return an image");
        }
        return { face, clean, dataUrl: image, bytesApprox: Math.floor(image.length * 0.75) };
      }

      throw new Error(`Unknown MCP command: ${command.action}`);
    } catch (error) {
      const message = error instanceof Error ? localizedError(error.message) : String(error);
      lastMcpErrorRef.current = message;
      reportErrorsRef.current = rememberBugReportEvent(reportErrorsRef.current, `MCP ${command.action}: ${message}`);
      setNotice(message);
      throw error;
    }
  }, [
    buildSectionSvg,
    rebuildSketchBodyFill,
    applyCustomFontToSelection,
    addReferencePoints,
    commitNotes,
    workspaceSettings.width,
    workspaceSettings.depth,
    applyCadModifierForMcp,
    cancelOpenGroup,
    commitShapes,
    finishOpenGroup,
    initialSnap,
    openGroupForEditing,
    invalidateCadModifierSession,
    mcpSceneSnapshot,
    placementElevation,
    prepareCadModifierForMcp,
    deleteFacesShape,
    setActivePlacementWorkplane,
    updateProjectWorkspaceSettings,
    sectionContours,
    closeHistoryView,
    openHistoryView,
    runCustomShapeMcp,
  ]);

  useEffect(() => {
    executeMcpCommandRef.current = executeMcpCommand;
  }, [executeMcpCommand]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const localDevelopment = process.env.NODE_ENV !== "production" && ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
    // The static export has no bridge. A copy somebody hosts themselves (a NAS, the Docker image) has one only
    // when its server switched remote use on (LAYERLING_MCP_REMOTE and LAYERLING_MCP_TOKEN); it says so itself.
    if (!localDevelopment && process.env.NEXT_PUBLIC_STATIC_EXPORT === "true") {
      return;
    }

    let cancelled = false;
    let stopBridge: (() => void) | null = null;
    const startBridge = () => {
      const identity = readMcpEditorIdentity();
      let stopped = false;
      let polling = false;
      let pollAbortController: AbortController | null = null;
      let pollRetryTimer: number | null = null;

      const heartbeat = () => {
        const projectInfo = projectInfoRef.current;
        const currentShapes = shapesRef.current;
        void fetch(LAYERLING_MCP_ROUTE, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "heartbeat",
            editor: {
              ...identity,
              projectId: projectInfo.projectId,
              projectName: projectInfo.projectName,
              url: window.location.href,
              focused: document.visibilityState === "visible" && document.hasFocus(),
              shapeCount: currentShapes.length,
              selectedCount: selectedIdsRef.current.length,
              notice: noticeRef.current || t("status.ready"),
              lastError: edgeModifierRef.current?.error ?? lastMcpErrorRef.current,
            },
          }),
        }).catch(() => undefined);
      };

      const submitResult = (commandId: string, ok: boolean, data?: unknown, error?: string) => {
        void fetch(LAYERLING_MCP_ROUTE, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "result",
            editorId: identity.editorId,
            result: { commandId, ok, data, error, completedAt: Date.now() },
          }),
        }).catch(() => undefined);
      };

      const poll = async () => {
        if (polling || stopped) return;
        polling = true;
        let retry = false;
        pollAbortController = new AbortController();
        try {
          const response = await fetch(LAYERLING_MCP_ROUTE, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "poll", editorId: identity.editorId }),
            signal: pollAbortController.signal,
          });
          if (!response.ok) throw new Error(`Layerling MCP poll returned HTTP ${response.status}`);
          const payload = (await response.json().catch(() => null)) as { command?: LayerlingMcpCommand | null } | null;
          const command = payload?.command;
          if (command) {
            try {
              const data = await executeMcpCommandRef.current?.(command);
              submitResult(command.id, true, data);
            } catch (error) {
              submitResult(command.id, false, undefined, error instanceof Error ? localizedError(error.message) : String(error));
            }
          }
        } catch (error) {
          // The local bridge may not exist while static builds or tests render the editor.
          retry = !stopped && (!(error instanceof DOMException) || error.name !== "AbortError");
        } finally {
          pollAbortController = null;
          polling = false;
          if (!stopped) {
            if (retry) {
              pollRetryTimer = window.setTimeout(() => {
                pollRetryTimer = null;
                void poll();
              }, LAYERLING_MCP_POLL_RETRY_MS);
            } else {
              void poll();
            }
          }
        }
      };

      heartbeat();
      void poll();
      const heartbeatTimer = window.setInterval(heartbeat, LAYERLING_MCP_HEARTBEAT_MS);
      window.addEventListener("focus", heartbeat);
      document.addEventListener("visibilitychange", heartbeat);
      stopBridge = () => {
        stopped = true;
        window.clearInterval(heartbeatTimer);
        if (pollRetryTimer !== null) window.clearTimeout(pollRetryTimer);
        pollAbortController?.abort();
        window.removeEventListener("focus", heartbeat);
        document.removeEventListener("visibilitychange", heartbeat);
      };
    };

    if (localDevelopment) {
      startBridge();
    } else {
      void fetch(`${LAYERLING_MCP_ROUTE}?status=1`)
        .then((response) => (response.ok ? response.json() : null))
        .then((payload: { remote?: boolean } | null) => {
          if (!cancelled && payload?.remote === true) startBridge();
        })
        .catch(() => undefined);
    }

    return () => {
      cancelled = true;
      stopBridge?.();
    };
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" || typeof window === "undefined") {
      return;
    }
    if (!["localhost", "127.0.0.1", "::1"].includes(window.location.hostname)) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const caseId = params.get("codexBooleanCase");
    if (!caseId) {
      return;
    }

    const modeParam = params.get("codexBooleanMode");
    const mode: BooleanAutomationMode = modeParam === "before" || modeParam === "ungroup" ? modeParam : "after";
    const runKey = `${caseId}:${mode}`;
    if (booleanAutomationRunRef.current === runKey) {
      return;
    }
    booleanAutomationRunRef.current = runKey;
    document.body.dataset.codexBooleanTestDone = "running";
    delete document.body.dataset.codexBooleanTestResult;
    delete document.body.dataset.codexBooleanTestImageReady;
    delete document.body.dataset.codexBooleanTestScreenshotPath;

    const finish = (detail: BooleanAutomationResult) => {
      window.__layerlingBooleanTest = detail;
      const captureCanvas = () => {
        try {
          const canvas = document.querySelector("canvas") as HTMLCanvasElement | null;
          const image = window.layerlingCaptureCanvas?.() ?? canvas?.toDataURL("image/png") ?? "";
          if (image.length > 100) {
            window.__layerlingBooleanTestImage = image;
            document.body.dataset.codexBooleanTestImageReady = "true";
            void fetch("/api/codex-screenshot", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: `boolean-${detail.caseId}-${detail.mode}.png`, dataUrl: image }),
            })
              .then((response) => (response.ok ? response.json() : null))
              .then((payload: { path?: string } | null) => {
                if (payload?.path) {
                  document.body.dataset.codexBooleanTestScreenshotPath = payload.path;
                }
              })
              .catch(() => {
                document.body.dataset.codexBooleanTestImageReady = "false";
              });
          }
        } catch {
          document.body.dataset.codexBooleanTestImageReady = "false";
        }
      };
      const publish = () => {
        document.body.dataset.codexBooleanTestDone = detail.ok ? "true" : "false";
        document.body.dataset.codexBooleanTestResult = JSON.stringify(detail);
        window.dispatchEvent(new CustomEvent("layerling:boolean-test-done", { detail }));
      };
      publish();
      window.setTimeout(publish, 100);
      window.setTimeout(captureCanvas, 1000);
      window.setTimeout(captureCanvas, 1800);
    };

    const run = async () => {
      const testCase = booleanAutomationScene(caseId);
      if (!testCase) {
        finish({
          ok: false,
          caseId,
          label: "Unknown boolean test",
          mode,
          notice: "Unknown boolean automation case",
          shapeCount: 0,
          selectedCount: 0,
          error: `Unknown boolean automation case: ${caseId}`,
        });
        return;
      }

      const ids = testCase.shapes.map((shape) => shape.id);
      if (mode === "before") {
        const noticeText = `Boolean test before: ${testCase.label}`;
        commitShapes(testCase.shapes, ids, noticeText);
        finish({
          ok: true,
          caseId,
          label: testCase.label,
          mode,
          notice: noticeText,
          shapeCount: testCase.shapes.length,
          selectedCount: ids.length,
        });
        return;
      }

      const result = await buildGroupedShapeFromSelection(testCase.shapes, workspaceSettingsRef.current.booleanTriangleLimit);
      if (!result.group) {
        const noticeText = result.consumed ? t("status.groupedHoleConsumed") : result.failureNotice;
        commitShapes(result.consumed ? [] : testCase.shapes, result.consumed ? [] : ids, noticeText);
        finish({
          ok: result.consumed,
          caseId,
          label: testCase.label,
          mode,
          notice: noticeText,
          shapeCount: result.consumed ? 0 : testCase.shapes.length,
          selectedCount: result.consumed ? 0 : ids.length,
          error: result.consumed ? undefined : result.failureNotice,
        });
        return;
      }

      const triangleCount = result.group.importedMesh?.triangleCount ?? meshForShape(result.group).faces.length;
      const groupedCount = result.group.groupedShapes?.length ?? 0;
      if (mode === "ungroup") {
        const restored = restoreGroupedChildren(result.group);
        const noticeText = `Boolean test ungrouped: ${testCase.label}`;
        commitShapes(restored, restored.map((shape) => shape.id), noticeText);
        finish({
          ok: restored.length === groupedCount,
          caseId,
          label: testCase.label,
          mode,
          notice: noticeText,
          shapeCount: restored.length,
          selectedCount: restored.length,
          triangleCount,
          groupedCount,
          groupId: result.group.id,
        });
        return;
      }

      const noticeText = `Boolean test after: ${testCase.label}`;
      commitShapes([result.group], result.group.id, noticeText);
      finish({
        ok: true,
        caseId,
        label: testCase.label,
        mode,
        notice: noticeText,
        shapeCount: 1,
        selectedCount: 1,
        triangleCount,
        groupedCount,
        groupId: result.group.id,
      });
    };

    void run();
  }, [commitShapes]);

  /** The view as a picture, from the viewport's own clean capture. */
  const exportViewImage = useCallback(async (exportName: string, options: ViewImageOptions) => {
    const dataUrl = window.layerlingCaptureImage?.(options) ?? "";
    const comma = dataUrl.indexOf(",");
    if (!dataUrl.startsWith("data:image/png") || comma < 0) {
      setNotice(t("status.imageFailed"), true);
      return;
    }
    const binary = atob(dataUrl.slice(comma + 1));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    await downloadBlobFile(projectExportFileName(exportName, "png"), new Blob([bytes], { type: "image/png" }));
    setTopPanel(null);
    setNotice(t("status.imageSaved"));
  }, [setNotice]);

  /**
   * Was ein Export mitnimmt: im Verlaufsblick den gezeigten Stand, sonst die
   * Auswahl oder alles. `selection` sagt, ob die Saetze von einer Auswahl
   * sprechen sollen.
   */
  const exportSource = useCallback(() => {
    const view = historyViewStateRef.current;
    if (view) return { shapes: view.shapes, selection: false };
    return { shapes: hasSelection ? selectedShapes : shapes, selection: hasSelection };
  }, [hasSelection, selectedShapes, shapes]);

  /** `chooseFile` asks for a new STL even when the design already has one (Save as). `svgView` picks what an SVG shows (#692). */
  const exportDesign = useCallback(async (format: DirectExportFormat, exportName: string, chooseFile = false, svgView: SvgExportView = "silhouette") => {
    const source = exportSource();
    const selectionScoped = source.selection;
    // Ausgeblendetes bleibt draussen, wie bei vergleichbaren Programmen: ein beiseitegelegtes
    // Teil soll nicht unbemerkt mitgedruckt werden (Discussion #80).
    const { visible: sourceShapes, hiddenNote } = visibleExportShapes(source.shapes);
    const exportable = sourceShapes.filter((shape) => !shape.hole && !isNonSolidShapeKind(shape.kind));
    if (exportable.length === 0) {
      setNotice(hiddenNote ? t("status.exportOnlyHidden") : selectionScoped ? t("status.selectSolidBeforeExport") : t("status.addSolidBeforeExport"));
      return;
    }
    const invalidSvg = exportable.map(invalidSvgMeshReason).find((reason): reason is string => Boolean(reason));
    if (invalidSvg) {
      setNotice(t("status.svgInvalid", { reason: invalidSvg }), true);
      return;
    }
    const selectedNotice = exportable.length === 1
      ? t("status.exportedSelectedOne")
      : t("status.exportedSelectedMany", { count: exportable.length });
    const finishNotice = (label: string) => {
      setTopPanel(null);
      setNotice((selectionScoped
        ? t("status.exportedSelectedAs", { selected: selectedNotice, label })
        : t("status.exportedAs", { label })) + hiddenNote);
    };
    const failNotice = (label: string, error: unknown) => {
      setNotice(error instanceof Error ? localizedError(error.message) : t("status.exportFailed", { label }));
    };
    if (format === "svg" && svgView === "footprint") {
      // Only what stands on the workplane: the section a hair above the lowest point (#692).
      setNotice(t("status.buildingSvg"), true);
      void footprintSvg(sourceShapes, exportName.trim() || projectName)
        .then((result) => downloadTextFile(projectExportFileName(exportName, "svg"), result.svg, "image/svg+xml;charset=utf-8"))
        .then(() => finishNotice("SVG"))
        .catch((error: unknown) => failNotice("SVG", error));
      return;
    }
    if (format === "svg") {
      setNotice(t("status.buildingSvg"), true);
      void exportBodiesWithLooseHoles(sourceShapes)
        .then(({ solids: cutSolids, meshes, cut }) => toSvg(cutSolids, exportName.trim() || projectName, meshes.map((mesh, index) => (cut[index] ? mesh : null))))
        .then((content) => downloadTextFile(projectExportFileName(exportName, "svg"), content, "image/svg+xml;charset=utf-8"))
        .then(() => finishNotice("SVG"))
        .catch((error: unknown) => failNotice("SVG", error));
      return;
    }
    const label = format === "stl" ? "STL" : format === "3mf" ? "3MF" : "OBJ";
    // Loose holes cut the bodies they reach first (#203); a body cut away entirely drops out.
    let bodiesWritten: WorkplaneShape[] = exportable;
    // A group showing its parts in their own colours keeps them in 3MF and OBJ (#153).
    const partFaceColors = (mesh: MeshData, sourceIndex: number) => {
      const source = bodiesWritten[sourceIndex];
      const solids = source ? multicolorExportSolids(source) : null;
      if (!source || !solids) return undefined;
      const colors = exportFaceColors(mesh, solids, source.color);
      solids.forEach(({ probe }) => {
        disposeBoundsTree.call(probe.geometry);
        probe.geometry.dispose();
        (probe.material as THREE.Material).dispose();
      });
      return colors;
    };
    // Chrome and Edge ask once where an STL goes, then write into that file again, like a design
    // (#251). The browser asks only in answer to the click, so this comes before the slow part;
    // where it cannot ask, the download stays.
    const designId = projectId ?? "";
    let target: LylFileHandle | "download" = "download";
    if (format === "stl" && lylFileAccessSupported()) {
      try {
        const linkedBefore = linkedStlFile(designId);
        // A name typed in the window that is not the linked file's asks for a file of its own (reported by mail, 15.10.2026).
        const linked = chooseFile || stlNameAsksForNewFile(exportName, projectName, linkedBefore?.name) ? null : linkedBefore;
        if (linked && !(await ensureLylFileWritable(linked))) {
          setNotice(t("status.fileNotWritable", { name: linked.name }), true);
          return;
        }
        const picked = linked ?? await pickStlFileToSave(projectExportFileName(exportName, "stl"));
        // Closed without a choice: nothing to do.
        if (!picked) return;
        target = picked;
      } catch {
        target = "download";
      }
    }
    const savedFile = target === "download" ? null : target;
    void exportBodiesWithLooseHoles(sourceShapes)
      .then(async ({ solids: cutSolids, meshes, cut: wasCut, holeCutsFailed }) => {
        bodiesWritten = cutSolids;
        const joined = await (format === "stl" ? unionOverlappingExportMeshes(cutSolids, meshes, wasCut) : colorSeparatedExportMeshes(cutSolids, meshes, wasCut));
        return { ...joined, gescheitert: joined.gescheitert + holeCutsFailed };
      })
      .then(async ({ meshes: fertig, quellen, verschmolzen, gescheitert, splinters }) => {
        if (format === "stl") {
          const bytes = new Uint8Array(exportMeshesToStl(fertig));
          if (target === "download") {
            await downloadBlobFile(projectExportFileName(exportName, "stl"), new Blob([bytes], { type: "model/stl" }));
          } else {
            await writeLylFile(target, bytes).catch(() => {
              // Gone, moved or locked: the next STL export asks for a file again.
              forgetStlFile(designId);
              throw new Error(t("status.exportFileFailed", { name: target.name }));
            });
            rememberStlFile(designId, target);
          }
        } else if (format === "3mf") {
          const bodies = fertig.map((mesh, index) => {
            const source = bodiesWritten[quellen[index]];
            return { ...mesh, name: source?.name || mesh.name, color: source?.color, faceColors: partFaceColors(mesh, quellen[index]) };
          });
          const bytes = exportMeshesTo3mf(bodies, { title: exportName.trim() || projectName });
          await downloadBlobFile(projectExportFileName(exportName, "3mf"), new Blob([bytes as BlobPart], { type: THREE_MF_MEDIA_TYPE }));
        } else {
          const bodies = fertig.map((mesh, index) => ({ ...mesh, color: bodiesWritten[quellen[index]]?.color, faceColors: partFaceColors(mesh, quellen[index]) }));
          await downloadTextFile(projectExportFileName(exportName, "obj"), exportMeshesToObj(bodies), "text/plain");
        }
        // The file is written either way; the notice below only adds a caveat.
        setTopPanel(null);
        const exportOverhangs = bedPrinter ? bedOverhangs(exportable, bedPrinter.width, bedPrinter.depth, bedPrinter.height) : [];
        // Tiny loose pieces a cut left behind are not written (#352); the notice says how many.
        const splinterNote = splinters > 0 ? ` ${t("status.exportSplinters", { count: splinters })}` : "";
        if (gescheitert > 0) setNotice(t("status.exportUnionFailed"), true);
        else if (bedPrinter && exportOverhangs.length > 0) setNotice(bedOverhangMessage(exportOverhangs, `${bedPrinter.vendor} ${bedPrinter.model}`), true);
        else if (verschmolzen > 0) setNotice(t("status.exportUnioned", { count: verschmolzen, label }) + hiddenNote + splinterNote);
        else if (savedFile) setNotice(t("status.stlSavedToFile", { name: savedFile.name }) + hiddenNote + splinterNote);
        else if (splinters > 0) setNotice(t("status.exportSplinters", { count: splinters }));
        else finishNotice(label);
      })
      .catch((error: unknown) => failNotice(label, error));
  }, [bedPrinter, exportSource, projectId, projectName]);

  /**
   * The drawing of a set of bodies, from the same bodies as the export (visible solids, holes taken
   * off). `drawing` is null when there is no solid in it. Loose holes count even when only the part
   * they cut is chosen.
   */
  const buildDrawing = useCallback(async (source: { shapes: WorkplaneShape[]; selection: boolean }, allShapes: WorkplaneShape[], title: string) => {
    const scopedShapes = source.selection
      ? [...source.shapes, ...allShapes.filter((shape) => shape.hole && !source.shapes.some((selected) => selected.id === shape.id))]
      : source.shapes;
    const { visible, hiddenNote } = visibleExportShapes(scopedShapes);
    if (!visible.some((shape) => !shape.hole && !isNonSolidShapeKind(shape.kind))) return { drawing: null, hiddenNote };
    const { generateDrawing } = await import("@/lib/drawingExport");
    const { meshes, holeCutsFailed } = await exportBodiesWithLooseHoles(visible);
    if (holeCutsFailed) throw new Error(t("status.drawingHoleCutFailed"));
    return { drawing: generateDrawing(meshes, title, drawingLabelsInLanguage()), hiddenNote };
  }, []);

  const exportDrawingDesign = useCallback(async (exportName: string, format: "svg" | "pdf") => {
    if (drawingExporting) return;
    const source = exportSource();
    setDrawingExporting(true);
    setNotice(t("status.buildingDrawing"), true);
    try {
      const title = exportName.trim() || projectName;
      const { drawing, hiddenNote } = await buildDrawing(source, shapes, title);
      if (!drawing) {
        setNotice(hiddenNote ? t("status.exportOnlyHidden") : t(source.selection ? "status.selectSolidBeforeExport" : "status.addSolidBeforeExport"));
        return;
      }
      const { drawingToSvg, drawingToPdf } = await import("@/lib/drawingExport");
      const filename = projectExportFileName(`${title} drawing`, format);
      if (format === "svg") await downloadTextFile(filename, drawingToSvg(drawing), "image/svg+xml;charset=utf-8");
      else await downloadBlobFile(filename, new Blob([drawingToPdf(drawing) as BlobPart], { type: "application/pdf" }));
      setTopPanel(null);
      setNotice(t("status.exportedDrawing", { format: format.toUpperCase() }) + hiddenNote);
    } catch (error) {
      setNotice(error instanceof Error ? localizedError(error.message) : t("status.drawingFailed"), true);
    } finally {
      setDrawingExporting(false);
    }
  }, [buildDrawing, drawingExporting, exportSource, projectName, shapes]);

  const exportStepDesign = useCallback(async (exportName: string) => {
    if (stepExporting) {
      return;
    }
    const { visible: sourceShapes, hiddenNote } = visibleExportShapes(exportSource().shapes);
    if (sourceShapes.length === 0 && hiddenNote) {
      setNotice(t("status.exportOnlyHidden"));
      return;
    }
    if (sourceShapes.some((shape) => shape.hole) && !sourceShapes.some((shape) => !shape.hole)) {
      setNotice(t("status.selectSolidForStep"));
      return;
    }
    setStepExporting(true);
    setNotice(t("status.buildingBrep"), true);
    try {
      const { exportShapesToStep } = await import("@/lib/stepExport");
      const { blob, exportedCount, skipped } = await exportShapesToStep(sourceShapes);
      const text = await blob.text();
      await downloadTextFile(projectExportFileName(exportName, "step"), text, "application/step");
      setTopPanel(null);
      if (skipped.length > 0) console.info("layerling: STEP export skipped", skipped);
      // Name what was left out and why, so it is not missed (#184).
      const named = skipped.slice(0, 3).map((entry) => t("status.exportStepSkippedItem", { name: entry.name, reason: t(`status.exportStepSkip.${entry.code}`) }));
      const more = skipped.length > 3 ? t("status.exportStepSkippedMore", { count: skipped.length - 3 }) : "";
      const skipNote = skipped.length === 0 ? "" : t("status.exportStepSkippedList", { list: named.join(", ") + more });
      setNotice((exportedCount === 1
        ? t("status.exportedStepOne", { skipNote })
        : t("status.exportedStepMany", { count: exportedCount, skipNote })) + hiddenNote);
    } catch (error: unknown) {
      // Dass nichts dabei ist, was STEP tragen kann, ist keine Stoerung -
      // dafuer gibt es einen Satz, der sagt, woran es liegt.
      if (error instanceof Error && error.name === "StepExportEmptyError") {
        setNotice(t("status.exportStepNothing"), true);
        return;
      }
      setNotice(error instanceof Error ? localizedError(error.message) : t("status.exportStepFailed"));
    } finally {
      setStepExporting(false);
    }
  }, [exportSource, projectName, stepExporting]);

  const exportLylDesign = useCallback(async (exportName: string, historyLimit: LylHistoryLimit, target: LylExportTarget = "download") => {
    if (lylExporting) return;
    if (target === "shared" && !onSaveSharedProject) {
      setNotice(t("status.sharedUnavailable"), true);
      return;
    }
    if (projectInteractionActiveRef.current) {
      setNotice(t("status.finishBeforeSave"));
      return;
    }
    // The browser opens a file dialog only in answer to a click or a key press, so this comes
    // before anything that takes time. A browser without it keeps the download.
    const projectId = projectInfoRef.current.projectId ?? "";
    let fileHandle: LylFileHandle | null = null;
    if (target === "file" || target === "fileAs") {
      if (!lylFileAccessSupported()) {
        target = "download";
      } else {
        try {
          fileHandle = target === "file" ? linkedLylFile(projectId) : null;
          if (fileHandle && !(await ensureLylFileWritable(fileHandle))) {
            setNotice(t("status.fileNotWritable", { name: fileHandle.name }), true);
            return;
          }
          fileHandle ??= await pickLylFileToSave(projectExportFileName(exportName, "lyl"));
          // Closed without a choice: nothing to do.
          if (!fileHandle) return;
        } catch {
          // No dialog here (a frame, a policy): the download still works.
          fileHandle = null;
          target = "download";
        }
      }
    }
    setLylExporting(true);
    setNotice(target === "shared" ? t("status.packagingShared") : t("status.packagingProject"));
    try {
      const thumbnailDataUrl = target === "shared"
        ? await (window.layerlingCaptureCanvasAsync?.() ?? Promise.resolve(""))
        : "";
      if (target === "shared" && (!thumbnailDataUrl.startsWith("data:image/png;base64,") || thumbnailDataUrl.length <= 100)) {
        throw new Error("Could not capture the current project preview");
      }
      // Im Verlaufsblick geht der gezeigte Stand in die Datei, mit dem Verlauf
      // bis zu ihm - was danach kam, gehoert nicht zu diesem Stand.
      const view = historyViewStateRef.current;
      const exportedHistory = view
        ? editorHistoryBranch(historyRef.current, view.index, historyLimit)
        : editorHistoryForExport(historyRef.current, historyIndexRef.current, historyLimit);
      // A design written to the server under another name carries that name inside too, or it
      // would open under the old one while the overview shows the file name (#265).
      const packageName = target === "shared" ? exportName.trim().replace(/\.(lyl|skf)$/i, "") || projectName : projectName;
      const bytes = await exportLylProject({
        projectId: projectInfoRef.current.projectId,
        projectName: packageName,
        createdAt: projectCreatedAt,
        modifiedAt: projectModifiedAt,
        shapes: view ? view.shapes : shapesRef.current,
        notes: view ? view.notes : notesRef.current,
        history: exportedHistory.entries,
        historyIndex: exportedHistory.index,
        assets: projectAssetsRef.current,
        workspace: workspaceSettingsRef.current,
        snapGrid,
        placementElevation: view ? view.placementElevation : placementElevation,
        placementWorkplane: view ? view.placementWorkplane : placementWorkplane,
        sketchPlacementWorkplane: view ? view.placementWorkplane : placementWorkplane,
      });
      if (target === "shared" && onSaveSharedProject) {
        setNotice(await onSaveSharedProject({ exportName: exportName.trim() || projectName, bytes, thumbnailDataUrl }));
      } else if (fileHandle) {
        try {
          await writeLylFile(fileHandle, bytes);
        } catch {
          // The file may be gone, moved or locked: the next Save asks for one again.
          forgetLylFile(projectId);
          throw new Error(t("status.saveFileFailed", { name: fileHandle.name }));
        }
        rememberLylFile(projectId, fileHandle);
        setNotice(t("status.savedToFile", { name: fileHandle.name }));
      } else {
        const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
        await downloadBlobFile(projectExportFileName(exportName, "lyl"), new Blob([buffer], { type: LYL_MEDIA_TYPE }));
        setNotice(t("status.savedProject"));
      }
      setTopPanel(null);
    } catch (error) {
      setNotice(error instanceof Error ? localizedError(error.message) : t("status.saveProjectFailed"));
    } finally {
      setLylExporting(false);
    }
  }, [onSaveSharedProject, placementElevation, placementWorkplane, projectCreatedAt, projectModifiedAt, projectName, lylExporting, snapGrid]);

  /** Ctrl+S: into the file the design is tied to; the first time it asks for one (#251). */
  const saveDesignRef = useRef<() => void>(() => undefined);
  saveDesignRef.current = () => {
    void exportLylDesign(projectName, workspaceSettingsRef.current.historyLimit, lylFileAccessSupported() ? "file" : "download");
  };

  /** The open button of the export dialog: a file dialog where there is one, the usual file field elsewhere. */
  const pickProjectFile = useCallback(async () => {
    if (lylFileAccessSupported()) {
      try {
        const picked = await pickLylFileToOpen();
        if (picked) await importFilesRef.current?.([picked.file], picked.handle);
        return;
      } catch {
        // Fall through to the file field.
      }
    }
    projectFileInputRef.current?.click();
  }, []);

  /** Der Entwurf als .lyl samt einer Textdatei, die sagt, wo und womit es passiert ist. */
  const saveBugReport = useCallback(async () => {
    if (projectInteractionActiveRef.current) {
      setNotice(t("status.finishBeforeSave"));
      return;
    }
    setNotice(t("status.bugReportBuilding"), true);
    try {
      const currentShapes = shapesRef.current;
      const shapeKinds: Record<string, number> = {};
      currentShapes.forEach((shape) => {
        const kind = shape.groupedShapes?.length ? "group" : shape.kind;
        shapeKinds[kind] = (shapeKinds[kind] ?? 0) + 1;
      });
      let webgl = "";
      try {
        const gl = document.createElement("canvas").getContext("webgl");
        const debug = gl?.getExtension("WEBGL_debug_renderer_info");
        webgl = gl ? String(gl.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : gl.RENDERER)) : "no WebGL";
      } catch {
        webgl = "unknown";
      }
      const workplane = placementWorkplaneRef.current;
      const lastMcpError = lastMcpErrorRef.current;
      const text = bugReportText({
        version: LYL_CREATED_WITH_VERSION,
        createdAt: Date.now(),
        language: editorLanguage,
        userAgent: navigator.userAgent,
        screen: { width: window.screen.width, height: window.screen.height, pixelRatio: window.devicePixelRatio },
        viewport: { width: window.innerWidth, height: window.innerHeight },
        touch: navigator.maxTouchPoints > 0,
        webgl,
        unit: lengthDisplayUnit(workspaceSettingsRef.current).label,
        printer: printerPresetById(workspaceSettingsRef.current.printer)?.model ?? "",
        shapeCount: currentShapes.length,
        shapeKinds,
        selectedCount: selectedIdsRef.current.length,
        workplane: placementWorkplaneIsBase(workplane)
          ? "base plate"
          : `on a face, origin ${[workplane.origin.x, workplane.origin.y, workplane.origin.z].map((v) => v.toFixed(2)).join(", ")}, normal ${[workplane.normal.x, workplane.normal.y, workplane.normal.z].map((v) => v.toFixed(3)).join(", ")}${workplaneHiddenRef.current ? ", hidden" : ""}`,
        openGroup: openGroupsRef.current.length > 0,
        sketchActive,
        notices: reportNoticesRef.current,
        errors: lastMcpError && !reportErrorsRef.current.some((event) => event.text.includes(lastMcpError))
          ? rememberBugReportEvent(reportErrorsRef.current, lastMcpError)
          : reportErrorsRef.current,
      });
      const exportedHistory = editorHistoryForExport(historyRef.current, historyIndexRef.current, "unlimited");
      const bytes = await exportLylProject({
        projectId: projectInfoRef.current.projectId,
        projectName,
        createdAt: projectCreatedAt,
        modifiedAt: projectModifiedAt,
        shapes: currentShapes,
        notes: notesRef.current,
        history: exportedHistory.entries,
        historyIndex: exportedHistory.index,
        assets: projectAssetsRef.current,
        workspace: workspaceSettingsRef.current,
        snapGrid,
        placementElevation,
        placementWorkplane,
        sketchPlacementWorkplane: placementWorkplane,
        extraFiles: { [BUG_REPORT_FILE]: new TextEncoder().encode(text) },
      });
      // A ZIP, because GitHub and many forums refuse a file ending in .lyl: the design as a .lyl and the
      // report as text, side by side. The start page opens such a ZIP like a backup, and the text reads without layerling.
      const zip = packBackup([
        { name: projectExportFileName(projectName, "lyl"), bytes },
        { name: BUG_REPORT_FILE, bytes: new TextEncoder().encode(text) },
      ]);
      const buffer = zip.buffer.slice(zip.byteOffset, zip.byteOffset + zip.byteLength) as ArrayBuffer;
      await downloadBlobFile(projectExportFileName(`${projectName}-${t("bugReport.fileSuffix")}`, "zip"), new Blob([buffer], { type: "application/zip" }));
      setNotice(t("status.bugReportSaved"), true);
    } catch (error) {
      setNotice(error instanceof Error ? localizedError(error.message) : t("status.saveProjectFailed"));
    }
  }, [editorLanguage, placementElevation, placementWorkplane, projectCreatedAt, projectModifiedAt, projectName, setNotice, sketchActive, snapGrid]);

  /**
   * A project opened from the server keeps working on the fast local copy, and
   * the server copy is brought up to date by itself.
   *
   * Not on every change: packing a project means zipping and hashing all of it,
   * which is what made large designs stutter before. It happens once the work
   * pauses, and again when the editor is left. A drag in progress postpones it
   * rather than interrupting it, and the history that travels is whatever the
   * workspace limit has already trimmed the in-memory history to.
   */
  const SERVER_SAVE_IDLE_MS = 5000;
  /** So bald wird es wieder versucht, wenn der Weg gerade belegt war. */
  const SERVER_SAVE_BUSY_MS = 900;
  const serverSaveTimerRef = useRef<number | null>(null);
  const serverSavePendingRef = useRef(false);
  const serverSaveRunningRef = useRef(false);
  const serverSaveStoppedRef = useRef(false);
  const serverSaveProjectRef = useRef<string | null>(null);
  /**
   * Der Stand, der auf dem Server liegt - daran haengt, ob es etwas zu tun gibt.
   * Er wird beim Laden des Entwurfs gesetzt, nicht erst, wenn die Bindung an die
   * Serverdatei eintrifft: Die kommt bei einem frisch angelegten Entwurf spaeter,
   * und was bis dahin gebaut wurde, galt sonst als der gespeicherte Stand.
   */
  const serverSavedFingerprintRef = useRef<{ projectId: string | null; fingerprint: string } | null>(null);

  /**
   * Noch einmal ansetzen. Wer hier vorbeikommt, hat etwas zu speichern, konnte
   * aber gerade nicht - ein Upload lief noch, oder es wurde gezogen. Ohne
   * diesen zweiten Anlauf bliebe die Aenderung liegen, bis zufaellig die
   * naechste kommt: Genau so verschwand der erste Koerper in einem frisch
   * angelegten Serverentwurf, weil der Klick aufs Haus in den Upload der
   * leeren Datei fiel.
   */
  const scheduleServerSaveRetry = useCallback((delay: number) => {
    if (serverSaveTimerRef.current !== null) window.clearTimeout(serverSaveTimerRef.current);
    serverSaveTimerRef.current = window.setTimeout(() => {
      serverSaveTimerRef.current = null;
      void saveToServerRef.current();
    }, delay);
  }, []);

  const saveToServerNow = useCallback(async () => {
    if (!serverFileName || !onSaveSharedProject) return;
    if (serverSaveStoppedRef.current || !serverSavePendingRef.current) return;
    if (serverSaveRunningRef.current || projectInteractionActiveRef.current) {
      scheduleServerSaveRetry(SERVER_SAVE_BUSY_MS);
      return;
    }
    serverSaveRunningRef.current = true;
    serverSavePendingRef.current = false;
    try {
      const thumbnailDataUrl = await (window.layerlingCaptureCanvasAsync?.() ?? Promise.resolve(""));
      if (!thumbnailDataUrl.startsWith("data:image/png;base64,") || thumbnailDataUrl.length <= 100) {
        // No preview to be had yet - keep the change pending for the next round.
        serverSavePendingRef.current = true;
        scheduleServerSaveRetry(SERVER_SAVE_BUSY_MS);
        return;
      }
      const exportedHistory = editorHistoryForExport(historyRef.current, historyIndexRef.current, "unlimited");
      const bytes = await exportLylProject({
        projectId: projectInfoRef.current.projectId,
        projectName,
        createdAt: projectCreatedAt,
        modifiedAt: Date.now(),
        shapes: shapesRef.current,
        notes: notesRef.current,
        history: exportedHistory.entries,
        historyIndex: exportedHistory.index,
        assets: projectAssetsRef.current,
        workspace: workspaceSettingsRef.current,
        snapGrid,
        placementElevation,
        placementWorkplane,
        sketchPlacementWorkplane: placementWorkplane,
      });
      await onSaveSharedProject({ exportName: projectName, bytes, thumbnailDataUrl, targetFileName: serverFileName });
      setNotice(t("status.serverSaved"));
    } catch (error) {
      const conflict = Boolean((error as Error & { conflict?: boolean }).conflict);
      if (conflict) {
        // Somebody else changed the file. Carrying on would overwrite their work.
        serverSaveStoppedRef.current = true;
        setNotice(t("status.serverSaveStopped"), true);
      } else {
        // A hiccup on the way, not a decision: keep the change pending and say
        // plainly what the server answered instead of falling silent.
        serverSavePendingRef.current = true;
        scheduleServerSaveRetry(SERVER_SAVE_IDLE_MS);
        setNotice(error instanceof Error ? localizedError(error.message) : t("status.serverSaveRetry"));
      }
    } finally {
      serverSaveRunningRef.current = false;
    }
  }, [onSaveSharedProject, placementElevation, placementWorkplane, projectCreatedAt, projectName, scheduleServerSaveRetry, serverFileName, snapGrid]);

  const saveToServerRef = useRef(saveToServerNow);
  saveToServerRef.current = saveToServerNow;

  useEffect(() => {
    if (!serverFileName) return;
    // Verglichen wird der Inhalt, nicht die Anzahl der Durchlaeufe. Ein Entwurf
    // laedt seine Formen nach, und dieser Effekt lief danach ein zweites Mal -
    // mit demselben Inhalt. Das galt frueher als Aenderung und liess einen
    // Entwurf, den niemand angefasst hatte, kurz darauf hochladen.
    const fingerprint = projectSceneFingerprint(shapes, notes);
    if (serverSaveProjectRef.current !== (projectId ?? null)) {
      serverSaveProjectRef.current = projectId ?? null;
      serverSaveStoppedRef.current = false;
      serverSavePendingRef.current = false;
      // Nur ersatzweise: Hat das Laden schon einen Stand hinterlassen, gilt der.
      if (serverSavedFingerprintRef.current?.projectId !== (projectId ?? null)) {
        serverSavedFingerprintRef.current = { projectId: projectId ?? null, fingerprint };
      }
      return;
    }
    if (fingerprint === serverSavedFingerprintRef.current?.fingerprint) return;
    serverSavedFingerprintRef.current = { projectId: projectId ?? null, fingerprint };
    serverSavePendingRef.current = true;
    if (serverSaveTimerRef.current !== null) window.clearTimeout(serverSaveTimerRef.current);
    serverSaveTimerRef.current = window.setTimeout(() => {
      serverSaveTimerRef.current = null;
      void saveToServerRef.current();
    }, SERVER_SAVE_IDLE_MS);
  }, [notes, projectId, serverFileName, shapes]);

  // Leaving the editor is the other moment worth saving at. The upload itself
  // lives in the page above, so it survives this component going away.
  useEffect(() => () => {
    if (serverSaveTimerRef.current !== null) window.clearTimeout(serverSaveTimerRef.current);
    void saveToServerRef.current();
  }, []);

  /**
   * Das Vorschaubild jetzt aufnehmen statt in zweieinhalb Sekunden.
   *
   * Wer nach der letzten Aenderung gleich zur Uebersicht geht, sah dort bisher
   * das Bild von vorhin: Die Aufnahme wartet normalerweise, bis Ruhe
   * eingekehrt ist, und wurde mit dem Editor zusammen abgebrochen, wenn der
   * schon weg war. Hier gibt es kein Abbruchsignal - der Upload gehoert der
   * Seite darueber und ueberlebt dieses Bauteil.
   */
  const flushProjectSnapshot = useCallback(async ({ evenIfUnchanged = false } = {}) => {
    if (!projectId || !onProjectSnapshot || typeof window === "undefined") return;
    const currentShapes = shapesRef.current;
    const sceneKey = { projectId, fingerprint: projectShapesFingerprint(currentShapes) };
    // Leaving takes the picture even when no shape changed: zooming or turning
    // the view alone does not count as a change, and the start page kept the
    // view from the last edit (#90). Not while the design is still loading.
    const known = lastProjectSnapshotRef.current?.projectId === projectId && !projectHydratingRef.current;
    if (!(evenIfUnchanged && known) && !projectThumbnailSceneChanged(lastProjectSnapshotRef.current, sceneKey)) return;
    const image = window.layerlingCaptureCanvasAsync
      ? await window.layerlingCaptureCanvasAsync()
      : window.layerlingCaptureCanvas?.() ?? "";
    if (!image || image.length <= 100) return;
    lastProjectSnapshotRef.current = sceneKey;
    void Promise.resolve(onProjectSnapshot({ image, projectId, shapes: currentShapes.length })).catch(() => {});
  }, [onProjectSnapshot, projectId]);

  /**
   * Das Haus fuehrt zur Uebersicht - erst ist das Bild an der Reihe, aber es
   * darf den Weg nicht versperren.
   *
   * `canvas.toBlob` haengt in einem Fenster, das im Hintergrund liegt: Der
   * Zeichentakt ruht dort, und die Aufnahme kommt nie zurueck. Ohne diese Frist
   * bliebe der Knopf dann einfach wirkungslos - beim Messen genau so passiert.
   * Kommt das Bild rechtzeitig, reist es mit; kommt es nicht, geht es eben
   * ohne, und die Uebersicht zeigt wie bisher das Bild von vorhin.
   */
  const leaveToDashboard = useCallback(() => {
    if (!onHome) return;
    let left = false;
    const leave = () => {
      if (left) return;
      left = true;
      // Counted on the way out, so the start page can ask about a design left empty. Notes and
      // reference points are something in it too.
      onHome({ itemCount: shapesRef.current.length + notesRef.current.length });
    };
    window.setTimeout(leave, LEAVE_SNAPSHOT_DEADLINE_MS);
    // Der Entwurf auf dem Server wartet sonst auf den Fuenf-Sekunden-Takt. Wer
    // die Arbeitsflaeche verlaesst, ist fertig - dann soll er hochgeladen
    // werden, nicht gleich. Der Editor bleibt dabei im Baum stehen, also
    // greift das Aufraeumen beim Abbau hier gar nicht.
    if (serverSaveTimerRef.current !== null) {
      window.clearTimeout(serverSaveTimerRef.current);
      serverSaveTimerRef.current = null;
    }
    // A save still waiting for its pause goes now, before the start page may remove the design.
    saveProjectShapesNow();
    void saveToServerRef.current();
    void flushProjectSnapshot({ evenIfUnchanged: true }).finally(leave);
  }, [flushProjectSnapshot, onHome, saveProjectShapesNow]);

  // A saved design's bodies into the open one - for parts kept as building
  // blocks. Fresh ids so nothing clashes, embedded source files come along,
  // one undo step, the new bodies selected where they were saved.
  const insertLylDesign = useCallback(async (file: File) => {
    const sourceProjectId = projectInfoRef.current.projectId;
    setNotice(t("status.validatingFile", { name: file.name }), true);
    try {
      const restored = await importLylProject(await file.arrayBuffer());
      if (projectInfoRef.current.projectId !== sourceProjectId) {
        setNotice(t("status.importCancelled", { count: 1 }));
        return;
      }
      if (restored.shapes.length === 0) {
        setNotice(t("status.insertDesignEmpty", { name: file.name }));
        return;
      }
      const inserted = restored.shapes.map((shape) => canonicalizeShape(cloneWorkplaneShapeTreeWithFreshIds(shape, "insert")));
      if (restored.assets.length > 0) {
        const nextAssets = dedupeProjectAssets([...projectAssetsRef.current, ...restored.assets]);
        projectAssetsRef.current = nextAssets;
        setProjectAssets(nextAssets);
      }
      commitShapes(
        [...shapesRef.current, ...inserted],
        inserted.map((shape) => shape.id),
        t("status.insertedDesign", { count: inserted.length, name: file.name }),
      );
      setTopPanel(null);
    } catch (error) {
      setNotice(error instanceof Error ? localizedError(error.message) : t("status.insertDesignFailed", { name: file.name }));
    }
  }, [commitShapes]);

  const importFiles = useCallback(async (selected: File[], fileHandle?: LylFileHandle, importOptions?: { keepSvgPage?: boolean; svgWidth?: number | null }): Promise<{ importedIds: string[]; failures: Array<{ fileName: string; reason: string }> }> => {
    const none = { importedIds: [] as string[], failures: [] as Array<{ fileName: string; reason: string }> };
    if (!selected.length) return none;
    const projectFiles = selected.filter((file) => /\.(lyl|skf)$/i.test(file.name));
    if (projectFiles.length) {
      if (selected.length !== 1) {
        setNotice(t("status.oneLylAtATime"), true);
        return none;
      }
      if (!onOpenLylProjectFile) {
        setNotice(t("status.lylUnavailable"), true);
        return none;
      }
      setNotice(t("status.validatingFile", { name: projectFiles[0].name }), true);
      const result = await onOpenLylProjectFile(projectFiles[0], undefined, fileHandle);
      if (result?.message) setNotice(result.message);
      if (result?.ok !== false) setTopPanel(null);
      return none;
    }
    const sourceProjectId = projectInfoRef.current.projectId;
    const result = await importModelFiles(selected, {
      cancelled: () => projectInfoRef.current.projectId !== sourceProjectId,
      svgKeepPagePosition: importOptions?.keepSvgPage,
      // Typed in the import window it counts once; through the AI bridge it is asked for in the call.
      svgWidth: importOptions?.svgWidth !== undefined ? importOptions.svgWidth : takeImportSvgWidth(),
      // An SVG comes in as a sketch body, its fill changeable afterwards (#197); should the
      // kernel build it differently from the mesh, the mesh stays.
      svgAsSketch: async (mesh, profile) => {
        const built = await cadShapeFromSketchProfile(profile, mesh.height);
        if (!svgSketchMatchesMesh(built, mesh)) return null;
        return canonicalizeShape({ ...built, name: mesh.name, color: mesh.color, x: mesh.x, z: mesh.z });
      },
      onProgress: (index, total, file, isStep) => setNotice(t("status.importingFile", {
        index: index + 1,
        total,
        name: file.name,
        stepNote: isStep ? t("status.stepKernelNote") : "",
      }), true),
    });
    if (!result) {
      setNotice(t("status.importCancelled", { count: selected.length }));
      return none;
    }
    const { shapes: importedShapes, assets: importedAssets, files, failures, notes } = result;
    if (result.mtlOnly) {
      setNotice(t("status.importMtlAlone"), true);
      return { importedIds: [], failures };
    }
    const failureSummary = importFailureSummary(failures);

    if (!importedShapes.length) {
      setNotice(failures.length === 1 && files.length <= 1
        ? failures[0].reason
        : t("status.importNoneFailed", { total: Math.max(files.length, failures.length), summary: failureSummary }), true);
      return { importedIds: [], failures };
    }

    const successSummary = files.length === 1
      ? t("status.importedFile", { name: files[0].name })
      : t("status.importedFiles", { count: result.importedFileNames.length, total: files.length });
    const nextAssets = dedupeProjectAssets([...projectAssetsRef.current, ...importedAssets]);
    projectAssetsRef.current = nextAssets;
    setProjectAssets(nextAssets);
    commitShapes(
      [...shapesRef.current, ...importedShapes],
      importedShapes.map((shape) => shape.id),
      [successSummary, ...notes].join(" ") + failureSummary,
    );
    setTopPanel(null);
    return { importedIds: importedShapes.map((shape) => shape.id), failures };
  }, [commitShapes, onOpenLylProjectFile]);
  importFilesRef.current = importFiles;

  const selectFiles = useCallback(
    (files: FileList | File[]) => {
      const selectedFiles = Array.from(files);
      if (selectedFiles.length) void importFiles(selectedFiles);
    },
    [importFiles],
  );

  const selectShape = useCallback((id: string | string[] | null, mode: "replace" | "toggle" = "replace") => {
    setSelectedIds((current) => {
      if (Array.isArray(id)) {
        const unique = id.filter((entry, index) => id.indexOf(entry) === index);
        return mode === "toggle" ? unique.reduce((next, entry) => (next.includes(entry) ? next.filter((selected) => selected !== entry) : [...next, entry]), current) : unique;
      }
      if (!id) {
        return mode === "toggle" ? current : [];
      }
      if (mode === "toggle") {
        return current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id];
      }
      return [id];
    });
  }, []);

  const nudgeSelected = useCallback(
    (deltaX: number, deltaZ: number) => {
      if (!hasSelection) {
        return;
      }
      if (refuseLockedSelection()) return;
      const selected = new Set(selectedIds);
      // Right and up on the keys mean right and away on the screen: each picks
      // the workplane axis that points that way most, so after turning the
      // view the keys still go where the arrows point (as in similar tools).
      const { xStep, zStep } = screenAlignedNudge(placementWorkplane, deltaX, deltaZ, window.layerlingScreenDirections?.());
      const translation = {
        x: placementWorkplane.xAxis.x * xStep + placementWorkplane.zAxis.x * zStep,
        y: placementWorkplane.xAxis.y * xStep + placementWorkplane.zAxis.y * zStep,
        z: placementWorkplane.xAxis.z * xStep + placementWorkplane.zAxis.z * zStep,
      };
      window.layerlingFollowMove?.(selectedShapes.filter((shape) => !shape.locked).map((shape) => shape.id), translation);
      commitShapes(
        shapes.map((shape) =>
          selected.has(shape.id) && !shape.locked
            ? {
                ...shape,
                x: cleanNearZero(shape.x + translation.x),
                z: cleanNearZero(shape.z + translation.z),
                elevation: cleanNearZero((shape.elevation ?? 0) + translation.y),
              }
            : shape,
        ),
        selectedIds,
        selectedShapes.length === 1 ? t("status.movedOne") : t("status.movedMany", { count: selectedShapes.length }),
        `move:${selectedIds.join(",")}`,
      );
    },
    [refuseLockedSelection, commitShapes, hasSelection, placementWorkplane, selectedIds, selectedShapes, shapes],
  );

  const rotateSelectedBy = useCallback((angleDegrees: number) => {
    if (!hasSelection) {
      return;
    }
    if (refuseLockedSelection()) return;
    if (projectInteractionActiveRef.current) {
      setNotice(t("status.finishBeforeRotate"));
      return;
    }

    const selected = new Set(selectedIds);
    const rotatableShapes = selectedShapes;

    const rotationDelta = geometryRotationDelta(placementWorkplane, angleDegrees);
    const pivot = activeRotationPivot
      ? new THREE.Vector3(activeRotationPivot.x, activeRotationPivot.y, activeRotationPivot.z)
      : rotatableShapes.length > 1 ? selectionCenterOnWorkplane(rotatableShapes, placementWorkplane) : null;

    const nextShapes = shapes.map((shape) => {
      if (!selected.has(shape.id) || shape.locked) {
        return shape;
      }

      const rotated = canonicalizeShape({ ...shape, ...rotatedGeometryShapePatch(shape, rotationDelta, pivot) });
      return canonicalizeShape(bakeShapeTransformIntoMesh(rotated));
    });

    const angleLabel = Number(angleDegrees.toFixed(1));
    commitShapes(
      nextShapes,
      selectedIds,
      rotatableShapes.length === 1
        ? t("status.rotatedOne", { angle: angleLabel })
        : t("status.rotatedMany", { count: rotatableShapes.length, angle: angleLabel }),
    );
  }, [refuseLockedSelection, activeRotationPivot, commitShapes, hasSelection, placementWorkplane, selectedIds, selectedShapes, shapes]);

  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) {
        return false;
      }
      return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
    };
    // A slider, checkbox or list keeps the focus after it was used but has no text to undo, so
    // Ctrl+Z there is meant for the project (#243). A slider holds the current action while it has
    // the focus: leave it first (that closes the history step), then run the key as if nothing had it.
    const isNonTextControl = (target: EventTarget | null) =>
      target instanceof HTMLSelectElement ||
      (target instanceof HTMLInputElement && ["range", "checkbox", "radio", "color", "button"].includes(target.type));

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const shortcut = event.ctrlKey || event.metaKey;

      // Save works from anywhere in the editor, a field too; the browser's own "save page" has
      // nothing to do here. Behind the project overview the key stays the browser's.
      if (shortcut && key === "s" && !event.shiftKey && !event.altKey) {
        const stage = document.querySelector(".editor-stage");
        if (!stage || stage.classList.contains("active")) {
          event.preventDefault();
          if (!splitSession) saveDesignRef.current();
          return;
        }
      }

      if (isTypingTarget(event.target)) {
        if (isNonTextControl(event.target) && shortcut && (key === "z" || key === "y")) {
          event.preventDefault();
          (event.target as HTMLElement).blur();
          const { key: eventKey, ctrlKey, metaKey, shiftKey } = event;
          window.setTimeout(() => document.body.dispatchEvent(new KeyboardEvent("keydown", { key: eventKey, ctrlKey, metaKey, shiftKey, bubbles: true })), 30);
        }
        return;
      }

      if (splitSession) {
        return;
      }

      // Im Verlaufsblick gehoeren die Tasten dem Blick: Pfeile gehen durch die
      // Staende, Escape kehrt zurueck. Alles andere - Loeschen, Einfuegen,
      // Rueckgaengig - wuerde das Projekt aendern, waehrend es etwas anderes zeigt.
      if (historyViewIndex !== null) {
        if (event.key === "Escape") {
          event.preventDefault();
          closeHistoryView();
        } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
          event.preventDefault();
          stepHistoryView(-1);
        } else if (event.key === "ArrowRight" || event.key === "ArrowUp") {
          event.preventDefault();
          stepHistoryView(1);
        } else if (event.key === "Home") {
          event.preventDefault();
          stepHistoryView(-Number.MAX_SAFE_INTEGER);
        } else if (event.key === "End") {
          event.preventDefault();
          stepHistoryView(Number.MAX_SAFE_INTEGER);
        } else if (key === "e" && !shortcut && !event.altKey && historyView.openPickedGroup()) {
          event.preventDefault();
        }
        return;
      }

      if (sketchActive && toolbarMode === "sketch") {
        if (event.key === "Escape") {
          // A crop, a calibration or the mirror panel that closes with this key is all it does.
          if (escapeWasHandled(event)) return;
          event.preventDefault();
          // As in 3D: first the tool goes down, then the selection (#664).
          if (sketchEscapeAction(sketchTool) === "selectTool") {
            setActiveSketchTool("select");
          } else {
            setSketchActivePointId(null);
            setSketchSelection(null);
            setNotice(t("status.sketchSelectionCleared"));
          }
        } else if (event.key === "Delete" || event.key === "Backspace") {
          event.preventDefault();
          if (sketchSelection) deleteSelectedSketchEntity();
          else if (sketchMeasurement) clearSketchMeasurement();
          else deleteSelectedSketchEntity();
        } else if (shortcut && key === "z") {
          event.preventDefault();
          if (event.shiftKey) sketchRedo();
          else sketchUndo();
        } else if (shortcut && key === "y") {
          event.preventDefault();
          sketchRedo();
        } else if (shortcut && key === "c") {
          event.preventDefault();
          copySketchSelectionToClipboard();
        } else if (shortcut && key === "x") {
          event.preventDefault();
          cutSketchSelection();
        } else if (shortcut && key === "v") {
          event.preventDefault();
          pasteSketchSelection();
        } else if (shortcut && key === "d") {
          event.preventDefault();
          duplicateSketchSelection();
        } else if (!shortcut && !event.altKey && (event.code === "KeyR" || key === "r")) {
          event.preventDefault();
          rotateSelectedClosedSketch45();
        } else if (!shortcut && !event.altKey && (event.code === "KeyL" || key === "l")) {
          event.preventDefault();
          // L locks what is selected: the template image, or an outline (#653).
          if (sketchSelection && sketchSelection.kind !== "image") toggleSketchOutlineLock();
          else toggleSelectedSketchImageLock();
        }
        return;
      }

      if (event.key === "Escape") {
        // A drag that the work area cancels with this key is all the key does (#440).
        if (projectInteractionActiveRef.current || escapeWasHandled(event)) return;
        // Erst das Werkzeug ablegen, dann die Auswahl - wer ein Werkzeug in der
        // Hand hat, meint mit Escape das Werkzeug.
        if (intersectPreviewIdsRef.current) {
          event.preventDefault();
          exitIntersectPreview();
          setNotice("");
          return;
        }
        if (carryIdsRef.current) {
          event.preventDefault();
          setCarryIds(null);
          setNotice(t("status.carryCancelled"));
          return;
        }
        if (cruiseAssetRef.current) {
          event.preventDefault();
          setCruiseAsset(null);
          setNotice(t("status.cruiseCancelled"));
          return;
        }
        if (noteMode) {
          setNoteMode(false);
          setNotice("");
          return;
        }
        if (pivotPickMode) {
          setPivotPickMode(false);
          setNotice(t("status.pivotPickCancelled"));
          return;
        }
        if (layFlatPickMode) {
          setLayFlatPickMode(false);
          setNotice(t("status.layFlatCancelled"));
          return;
        }
        if (mateTool) {
          setMateTool(null);
          setNotice(t("status.mateCancelled"));
          return;
        }
        if (holePatternTool) {
          setHolePatternTool(null);
          setNotice(t("status.holePatternCancelled"));
          return;
        }
        if (faceTool) {
          setFaceTool(null);
          setNotice(t("status.faceToolCancelled"));
          return;
        }
        if (deleteFaceTool) {
          // While the faces are being deleted Esc waits, so a refusal still reaches the panel.
          if (deleteFaceTool.busy) return;
          deleteFaceRunRef.current += 1;
          setDeleteFaceTool(null);
          setNotice(t("status.deleteFaceCancelled"));
          return;
        }
        if (arrayTool) {
          setArrayTool(null);
          setNotice(t("status.arrayCancelled"));
          return;
        }
        if (scalePercentTool) {
          setScalePercentTool(null);
          setScalePercentError(null);
          return;
        }
        setSelectedIds([]);
        setNotice(t("status.selectionCleared"));
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        // With Delete face open the key deletes the picked faces, never the body.
        if (deleteFaceTool) {
          applyDeleteFaceTool();
          return;
        }
        deleteSelected();
        return;
      }

      if (shortcut && key === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      if (shortcut && key === "y") {
        event.preventDefault();
        redo();
        return;
      }

      if (shortcut && key === "c") {
        event.preventDefault();
        copySelected();
        return;
      }

      // C without Ctrl picks the selection up, as the usual Cruise: it follows the pointer over
      // the faces of other bodies and a click sets it down there (#195).
      if (!shortcut && !event.altKey && !event.shiftKey && key === "c" && hasSelection) {
        event.preventDefault();
        if (selectedShapes.some((shape) => shape.locked)) {
          setNotice(t("status.objectLocked"));
          return;
        }
        const ids = selectedIds;
        setCruiseAsset(null);
        setCarryIds(ids);
        setNotice(t("status.carryPlace"));
        return;
      }

      if (shortcut && key === "x") {
        event.preventDefault();
        cutSelected();
        return;
      }

      if (shortcut && key === "v") {
        event.preventDefault();
        pasteShape();
        return;
      }

      if (shortcut && key === "d") {
        event.preventDefault();
        duplicateSelected();
        return;
      }

      if (shortcut && key === "a") {
        event.preventDefault();
        setSelectedIds(shapes.filter((shape) => !shape.hidden).map((shape) => shape.id));
        setNotice(t("status.selectedAllVisible"));
        return;
      }

      if (shortcut && key === "b" && !event.shiftKey) {
        event.preventDefault();
        bundleSelected();
        return;
      }

      if (shortcut && key === "g") {
        event.preventDefault();
        if (event.shiftKey) {
          ungroupSelected();
        } else {
          groupSelected();
        }
        return;
      }

      if (shortcut && key === "l") {
        event.preventDefault();
        toggleLocked();
        return;
      }

      if (shortcut && key === "h") {
        event.preventDefault();
        if (event.shiftKey) {
          showHidden();
        } else {
          toggleHidden();
        }
        return;
      }

      if (shortcut && (key === "o" || key === "O") && event.shiftKey) {
        event.preventDefault();
        setOutlinerOpen((open) => !open);
        return;
      }

      if (shortcut && key === "e" && !event.shiftKey && !event.altKey) {
        event.preventDefault();
        setTopPanel((panel) => (panel === "export" ? null : "export"));
        return;
      }

      if (shortcut && key === "i" && !event.shiftKey && !event.altKey) {
        event.preventDefault();
        setTopPanel((panel) => (panel === "import" ? null : "import"));
        return;
      }

      const geometryRotationDegrees = geometryRotationDegreesForShortcut(event);
      if (geometryRotationDegrees !== null && hasSelection) {
        event.preventDefault();
        rotateSelectedBy(geometryRotationDegrees);
        return;
      }

      if (handleViewArrowKey(event, hasSelection)) {
        event.preventDefault();
        return;
      }

      // Follows the Snap Grid so a keyboard nudge lands on the same lattice
      // a pointer drag snaps to. Falls back to the old millimetre when the
      // grid is off.
      const step = keyboardNudgeStep(snapGridRef.current, event.shiftKey, keyboardNudgeCoarseFactor(workspaceSettingsRef.current));
      if (shortcut && event.key === "ArrowUp") {
        event.preventDefault();
        raiseSelected(step);
      } else if (shortcut && event.key === "ArrowDown") {
        event.preventDefault();
        raiseSelected(-step);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        nudgeSelected(-step, 0);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        nudgeSelected(step, 0);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        nudgeSelected(0, -step);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        nudgeSelected(0, step);
      } else if (key === "d" && hasSelection) {
        event.preventDefault();
        dropSelectedToWorkplane();
      } else if (key === "h") {
        event.preventDefault();
        setSelectionHoleMode(true);
      } else if (key === "s") {
        event.preventDefault();
        setSelectionHoleMode(false);
      } else if (key === "t" && !shortcut && !event.altKey && hasSelection) {
        event.preventDefault();
        toggleSelectionTransparency();
      } else if (key === "m" && event.shiftKey && !shortcut && !event.altKey) {
        // Shift+M: Multicolor for the selected groups (#367); M alone is the mirror mode.
        event.preventDefault();
        toggleSelectionMulticolor();
      } else if (key === "m" && !event.shiftKey) {
        event.preventDefault();
        toggleMirrorMode();
      } else if (key === "l") {
        event.preventDefault();
        toggleAlignMode();
      } else if (key === "n") {
        event.preventDefault();
        toggleNoteTool();
      } else if (key === "e" && !shortcut && !event.altKey) {
        event.preventDefault();
        editSelectedGroup();
      } else if (key === "b" && !shortcut && !event.altKey && hasSelection) {
        // B opens the fillet, Shift+B the chamfer; pressed again, the tool closes (#242).
        const kind = event.shiftKey ? "chamfer" : "fillet";
        event.preventDefault();
        if (edgeModifier?.kind === kind) cancelEdgeModifier();
        else startEdgeModifier(kind);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    closeHistoryView,
    historyView.openPickedGroup,
    historyViewIndex,
    stepHistoryView,
    commitShapes,
    clearSketchMeasurement,
    copySelected,
    copySketchSelectionToClipboard,
    noteMode,
    toggleNoteTool,
    cutSelected,
    cutSketchSelection,
    deleteSelected,
    deleteSelectedSketchEntity,
    duplicateSelected,
    duplicateSketchSelection,
    dropSelectedToWorkplane,
    editSelectedGroup,
    bundleSelected, groupSelected,
    hasSelection,
    nudgeSelected,
    arrayTool,
    pasteShape,
    pasteSketchSelection,
    pivotPickMode,
    layFlatPickMode,
    raiseSelected,
    redo,
    rotateSelectedBy,
    rotateSelectedClosedSketch45,
    sketchActive,
    sketchRedo,
    sketchMeasurement,
    sketchSelection,
    sketchTool,
    setActiveSketchTool,
    sketchUndo,
    splitSession,
    setSelectionHoleMode,
    showHidden,
    toggleAlignMode,
    toggleSelectionTransparency,
    toggleHidden,
    toggleMirrorMode,
    edgeModifier,
    cancelEdgeModifier,
    startEdgeModifier,
    toggleLocked,
    toggleSelectedSketchImageLock,
    toggleSketchOutlineLock,
    toolbarMode,
    undo,
    ungroupSelected,
    // Esc closes these tools, and Ctrl+A picks from the current shapes: a handler from before
    // they opened, or before a shape was added, closed nothing and missed new shapes.
    mateTool,
    holePatternTool,
    faceTool,
    deleteFaceTool,
    applyDeleteFaceTool,
    scalePercentTool,
    selectedShapes,
    shapes,
  ]);

  /*
   * Rechtsklick auf einen Koerper: die Befehle, die man sonst im Menueband
   * sucht oder nur als Kuerzel kennt, gleich am Objekt. Sie wirken auf die
   * Auswahl - der Viewport hat den angeklickten Koerper schon ausgewaehlt.
   */
  const [shapeContextMenu, setShapeContextMenu] = useState<{ x: number; y: number; onShape: boolean } | null>(null);
  const closeShapeContextMenu = useCallback(() => setShapeContextMenu(null), []);
  const openShapeContextMenu = useCallback((request: { shapeId: string | null; clientX: number; clientY: number }) => {
    setShapeContextMenu({ x: request.clientX, y: request.clientY, onShape: Boolean(request.shapeId) });
  }, []);
  // Locking (Ctrl+L, the outliner, the inspector) while a tool is open puts the tool down,
  // so nothing it would apply can still reach the locked shape.
  const wasSelectionLockedRef = useRef(selectionLocked);
  useEffect(() => {
    const becameLocked = selectionLocked && !wasSelectionLockedRef.current;
    wasSelectionLockedRef.current = selectionLocked;
    if (!becameLocked) return;
    if (selectedShapes.every((shape) => shape.locked)) {
      setAlignMode(false);
      setAlignPreview(null);
    }
    setMirrorMode(false);
    setMirrorPreviewAxis(null);
    setPivotPickMode(false);
    setLayFlatPickMode(false);
    setMateTool(null);
    setHolePatternTool(null);
    setFaceTool(null);
    setCarryIds(null);
    setArrayTool(null);
    setScalePercentTool(null);
    setScalePercentError(null);
    setShellTool(null);
    setDeleteFaceTool((current) => current && !current.busy ? null : current);
    setSimplifyToolId(null);
    if (edgeModifier) invalidateCadModifierSession();
    if (splitSession) {
      splitRunRef.current += 1;
      setSplitSession(null);
    }
  }, [edgeModifier, invalidateCadModifierSession, selectedShapes, selectionLocked, splitSession]);

  // Select multiple: a tap on a body adds it to the selection or takes it out, for a tablet without Shift.
  const startMultiSelect = () => {
    setMultiSelect(true);
    setNotice(t("status.selectMultipleStart"), true);
  };
  // The same as the key C, for a tablet without a keyboard: the selection follows the pointer, and a tap sets it down.
  const startCarry = () => {
    if (!hasSelection) return;
    if (selectedShapes.some((shape) => shape.locked)) {
      setNotice(t("status.objectLocked"));
      return;
    }
    setCruiseAsset(null);
    setCarryIds(selectedIds);
    setNotice(t("status.carryPlace"));
  };
  const endMultiSelect = useCallback(() => {
    setMultiSelect(false);
    setNotice(t("status.selectMultipleEnd"));
  }, [setNotice]);
  useEffect(() => {
    if (!multiSelect) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") endMultiSelect();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [multiSelect, endMultiSelect]);

  const shapeContextMenuItems = (): ShapeContextMenuItem[] => {
    if (!shapeContextMenu) return [];
    if (!shapeContextMenu.onShape || !hasSelection) {
      const items: ShapeContextMenuItem[] = [
        { key: "paste", label: t("contextMenu.paste"), shortcut: "Ctrl+V", onSelect: () => void pasteShape() },
        { key: "selectAll", label: t("contextMenu.selectAll"), shortcut: "Ctrl+A", onSelect: selectAllVisible },
        { key: "selectMultiple", label: t("contextMenu.selectMultiple"), onSelect: startMultiSelect },
      ];
      if (shapes.some((shape) => shape.hidden)) items.push({ key: "showHidden", label: t("contextMenu.showHidden"), shortcut: "Ctrl+Shift+H", onSelect: showHidden });
      if (referencePoints(notes).length > 0) items.push({ key: "removePoints", label: t("contextMenu.removeAllPoints", { count: referencePoints(notes).length }), danger: true, separated: true, onSelect: removeAllReferencePoints });
      return items;
    }
    const allHoles = selectedShapes.every((shape) => shape.hole);
    const allLocked = selectedShapes.every((shape) => shape.locked);
    const single = selectedShapes.length === 1 ? selectedShapes[0] : null;
    const items: ShapeContextMenuItem[] = [
      { key: "duplicate", label: t("common.duplicate"), shortcut: "Ctrl+D", onSelect: duplicateSelected },
      { key: "copy", label: t("editor.tool.copy"), shortcut: "Ctrl+C", onSelect: copySelected },
      { key: "selectMultiple", label: t("contextMenu.selectMultiple"), onSelect: startMultiSelect },
    ];
    if (!selectionLocked) {
      items.push(allHoles
        ? { key: "solid", label: t("contextMenu.toSolid"), shortcut: "S", separated: true, onSelect: () => setSelectionHoleMode(false) }
        : { key: "hole", label: t("contextMenu.toHole"), shortcut: "H", separated: true, onSelect: () => setSelectionHoleMode(true) });
    }
    if (selectedShapes.length >= 2 && !selectionLocked) items.push({ key: "group", label: t("contextMenu.group"), shortcut: "Ctrl+G", onSelect: () => void groupSelected() });
    if (single && (single.groupedShapes?.length || wasGroupBeforeEdgeTreatments(single)) && !selectionLocked) items.push({ key: "ungroup", label: t("contextMenu.ungroup"), shortcut: "Ctrl+Shift+G", onSelect: ungroupSelected });
    if (canSeparateSelectedParts && !selectionLocked) items.push({ key: "separateParts", label: t("inspector.separateParts"), onSelect: separateSelectedParts });
    if (single && !selectionLocked) {
      items.push(
        { key: "chamfer", label: t("editor.tool.chamfer"), separated: true, onSelect: () => startEdgeModifier("chamfer") },
        { key: "fillet", label: t("editor.tool.fillet"), onSelect: () => startEdgeModifier("fillet") },
        { key: "hollow", label: t("editor.tool.hollow"), onSelect: startShellTool },
        { key: "deleteFace", label: t("editor.tool.deleteFace"), onSelect: startDeleteFaceTool },
      );
      if (!single.hole && !isNonSolidShapeKind(single.kind)) {
        items.push({ key: "holePattern", label: t("holePattern.title"), onSelect: toggleHolePattern });
        items.push({ key: "faceTool", label: t("faceTool.title"), onSelect: toggleFaceTool });
      }
    }
    if (!selectionLocked) {
      items.push(
        { key: "mirror", label: t("editor.tool.mirror"), shortcut: "M", separated: true, onSelect: toggleMirrorMode },
        { key: "scalePercent", label: t("scalePercent.title"), onSelect: toggleScalePercentTool },
      );
    }
    if (single && offersMeshSimplify(single) && !selectionLocked) items.push({ key: "simplify", label: t("contextMenu.simplify"), separated: true, onSelect: startSimplifyTool });
    if (!allHoles) {
      items.push(
        { key: "markCenter", label: t("contextMenu.markCenter"), separated: true, onSelect: () => markSelectionPoints("center") },
        { key: "markCorners", label: t("contextMenu.markCorners"), onSelect: () => markSelectionPoints("corners") },
        { key: "markMidpoints", label: t("contextMenu.markMidpoints"), onSelect: () => markSelectionPoints("midpoints") },
        ...(referencePoints(notes).length > 0 ? [{ key: "removePoints", label: t("contextMenu.removeAllPoints", { count: referencePoints(notes).length }), danger: true, onSelect: removeAllReferencePoints }] : []),
      );
    }
    items.push(
      { key: "hide", label: t("contextMenu.hide"), shortcut: "Ctrl+H", separated: true, onSelect: toggleHidden },
      { key: "lock", label: t(allLocked ? "contextMenu.unlock" : "contextMenu.lock"), shortcut: "Ctrl+L", onSelect: toggleLocked },
      ...(selectionLocked ? [] : [{ key: "carry", label: t("contextMenu.carry"), shortcut: "C", onSelect: startCarry }]),
      ...(selectionLocked ? [] : [{ key: "drop", label: t("contextMenu.drop"), shortcut: "D", onSelect: dropSelectedToWorkplane }]),
      ...(selectionLocked ? [] : [{ key: "delete", label: t("common.delete"), shortcut: t("contextMenu.deleteKey"), danger: true, separated: true, onSelect: deleteSelected }]),
    );
    return items;
  };

  return (
    <div className={`layerling-editor ${historyViewState ? "history-view-active" : ""}`}>
      <SecondaryToolbar
        toolbarMode={toolbarMode}
        projectName={projectName}
        onProjectNameChange={onProjectNameChange}
        onToolbarModeChange={(mode) => {
          setToolbarMode(mode);
          if (mode !== "geometry") {
            if (cruiseAssetRef.current) setNotice("");
            setCruiseAsset(null);
          }
          setWorkplaneMode(false);
          setTopPanel(null);
        }}
        outlinerOpen={outlinerOpen}
        onToggleOutliner={toggleOutliner}
        canUndo={!splitSession && !projectInteractionActive && historyViewIndex === null && (historyIndex > 0 || Boolean(edgeModifier))}
        canRedo={!splitSession && !projectInteractionActive && historyViewIndex === null && historyIndex < history.length - 1}
        canHistoryView={historyViewIndex !== null || (!splitSession && !projectInteractionActive && !edgeModifier && !deleteFaceTool && !openGroup && history.length > 1)}
        historyViewActive={historyViewIndex !== null}
        onHistoryView={historyViewIndex === null ? openHistoryView : closeHistoryView}
        canGroup={!selectionLocked && selectedShapes.length > 1 && selectedShapes.every((shape) => !isNonSolidShapeKind(shape.kind))}
        canIntersect={!selectionLocked && canIntersectShapes(selectedShapes.filter((shape) => !isNonSolidShapeKind(shape.kind)))}
        canUngroup={!selectionLocked && selectedShapes.some((shape) => Boolean(shape.groupedShapes?.length) || wasGroupBeforeEdgeTreatments(shape))}
        canModifySelection={hasSelection && !selectionLocked}
        hasClipboard={clipboard.length > 0 || systemClipboardSupported}
        hasSelection={hasSelection}
        hiddenShapeCount={shapes.filter((shape) => shape.hidden).length}
        selectionHidden={hasSelection && selectedShapes.every((shape) => shape.hidden)}
        alignMode={alignMode}
        // A locked shape in the selection is the anchor the others line up on, so Align stays.
        canAlign={selectedShapes.length > 1 && selectedShapes.some((shape) => !shape.locked)}
        canEdgeModify={selectedShapes.length === 1 && Boolean(selectedShape && !selectedShape.locked && !selectedShape.hole && !isNonSolidShapeKind(selectedShape.kind))}
        edgeModifierKind={edgeModifier?.kind ?? null}
        mirrorMode={mirrorMode}
        canSplit={canSplitSelection}
        splitMode={Boolean(splitSession)}
        sketchActive={sketchActive}
        sketchOperation={sketchOperation}
        sketchTool={sketchTool}
        sketchCanUndo={sketchHistoryIndex > 0}
        sketchCanRedo={sketchHistoryIndex < sketchHistory.length - 1}
        sketchHasSelection={sketchSelection !== null}
        sketchHasClipboard={sketchClipboard !== null}
        canEditSketch={selectedShapes.length === 1 && Boolean(selectedShape?.sketchProfile)}
        canFilletSketchPoint={canFilletSketchPoint}
        sketchCornerDialog={sketchCornerDialog}
        onSketchCornerDialog={setSketchCornerDialog}
        sketchConstruction={sketchConstruction}
        onSketchConstruction={toggleSketchConstruction}
        sketchFromMiddle={sketchFromMiddle}
        onSketchFromMiddle={toggleSketchFromMiddle}
        sketchStrokeActive={sketchStrokePanelOpen || Boolean(sketchProfile.stroke)}
        onSketchStroke={() => setSketchStrokePanelOpen((open) => !open)}
        onStartSketch={(operation) => beginSketch(operation)}
        onEditSketch={beginSketchEdit}
        onSketchTool={chooseSketchTool}
        onSketchPrimitive={(primitive) => addSketchPrimitive(primitive, { x: 0, z: 0 })}
        sketchShapeOptions={sketchShapeOptions}
        onSketchShapeOptions={setSketchShapeOptions}
        onSketchImage={() => {
          if (sketchTool !== "select") {
            setNotice(t("status.chooseSelectFirst"));
            return;
          }
          sketchImageInputRef.current?.click();
        }}
        onSketchCopy={copySketchSelectionToClipboard}
        onSketchPaste={pasteSketchSelection}
        onSketchDuplicate={duplicateSketchSelection}
        onSketchDelete={deleteSelectedSketchEntity}
        onSketchUndo={sketchUndo}
        onSketchRedo={sketchRedo}
        onSketchFinish={finishSketch}
        onSketchCancel={cancelSketch}
        onHome={onHome ? leaveToDashboard : undefined}
        onAlign={toggleAlignMode}
        onChamfer={() => edgeModifier?.kind === "chamfer" || edgeModifier?.kind === "chamfillet" ? cancelEdgeModifier() : startEdgeModifier("chamfer")}
        onCopy={copySelected}
        onDelete={deleteSelected}
        onDuplicate={duplicateSelected}
        onCenterOnWorkplane={centerSelectionOnWorkplane}
        onDropToWorkplane={dropSelectedToWorkplane}
        onLayFlat={toggleLayFlat}
        layFlatActive={layFlatPickMode}
        onMateFaces={toggleMateFaces}
        mateFacesActive={Boolean(mateTool)}
        onHolePattern={toggleHolePattern}
        holePatternActive={Boolean(holePatternTool)}
        canHolePattern={selectedShapes.length === 1 && Boolean(selectedShape && !selectedShape.locked && !selectedShape.hole && !isNonSolidShapeKind(selectedShape.kind))}
        onFaceTool={toggleFaceTool}
        faceToolActive={Boolean(faceTool)}
        canFaceTool={selectedShapes.length === 1 && Boolean(selectedShape && !selectedShape.locked && !selectedShape.hole && !isNonSolidShapeKind(selectedShape.kind))}
        onGroup={groupSelected}
        onBundle={bundleSelected}
        onIntersect={intersectSelected}
        onIntersectPreview={toggleIntersectPreview}
        intersectPreviewActive={Boolean(intersectPreviewIds)}
        onFillet={() => edgeModifier?.kind === "fillet" ? cancelEdgeModifier() : startEdgeModifier("fillet")}
        onHollow={startShellTool}
        hollowActive={Boolean(shellTool)}
        onDeleteFace={startDeleteFaceTool}
        deleteFaceActive={Boolean(deleteFaceTool)}
        canSimplify={selectedShapes.length === 1 && offersMeshSimplify(selectedShape) && !selectedShape?.locked}
        onSimplify={startSimplifyTool}
        simplifyActive={Boolean(simplifyToolShape)}
        onMirror={toggleMirrorMode}
        onRotationPivot={toggleRotationPivot}
        onArray={toggleArrayTool}
        arrayActive={Boolean(arrayTool)}
        onScalePercent={toggleScalePercentTool}
        onCarryOntoFace={startCarry}
        scalePercentActive={Boolean(scalePercentTool)}
        rotationPivotActive={pivotPickMode || Boolean(activeRotationPivot)}
        onSplit={toggleSplitMode}
        onPaste={pasteShape}
        onRedo={redo}
        onSnap={snapSelected}
        onShowHidden={showHidden}
        onToggleHidden={toggleHidden}
        onUngroup={ungroupSelected}
        onUndo={undo}
        onShortcuts={() => setShortcutsOpen(true)}
        onInteractiveHelp={toggleInteractiveHelp}
        interactiveHelpActive={interactiveHelp}
        onGuide={() => setGuideOpen(true)}
        noteMode={noteMode}
        notesVisible={notesVisible}
        noteCount={notes.length}
        onNoteTool={toggleNoteTool}
        onToggleNotes={toggleNotesVisible}
        overhangsVisible={overhangsVisible}
        overhangAngle={workspaceSettings.overhangAngle}
        onToggleOverhangs={toggleOverhangsVisible}
        onTopPanel={(panel) => {
          setTopPanel((current) => (current === panel ? null : panel));
        }}
        objects={shapes.map((shape) => ({ id: shape.id, name: displayShapeName(shape), kind: shape.kind, hidden: Boolean(shape.hidden) }))}
        onSelectObject={(id) => selectShape(id)}
        renderMyShapes={(close) => (
          <MyShapesSection
            shapes={customShapeEntries}
            folders={customShapeFolders}
            serverAvailable={customShapesServerAvailable}
            canSave={selectedIds.length > 0}
            defaultName={selectedShapes.length === 1 ? displayShapeName(selectedShapes[0]) : t("myShapes.defaultName")}
            onInsert={(id) => {
              close();
              void insertMyShape(id).then((inserted) => {
                // Like the shapes of the library, it hangs on the pointer and sits down where you click, also on a
                // face (#463). Without "click to place" it stays where it was put.
                if (!workspaceSettingsRef.current.clickToPlaceShapes || inserted.length === 0) return;
                setCruiseAsset(null);
                setCarryIds(inserted.map((shape) => shape.id));
                setNotice(t("status.carryPlace"));
              }).catch(noticeError);
            }}
            onSave={async (name, location, folderId) => {
              try {
                await saveSelectionAsMyShape(name, undefined, location, folderId);
                return true;
              } catch (error) {
                setNotice(error instanceof Error ? localizedError(error.message) : String(error));
                return false;
              }
            }}
            onRename={(id, name) => void renameMyShapeEntry(id, name).catch(noticeError)}
            onDelete={(id) => void deleteMyShapeEntry(id).catch(noticeError)}
            onBackup={() => void backUpMyShapes().catch(noticeError)}
            onMoveToServer={(id) => void moveMyShapeToServer(id).catch(noticeError)}
            onMoveToFolder={(id, folderId) => void moveMyShapeToFolder(id, folderId).catch(noticeError)}
            onCreateFolder={(name, location, parentId) => createShapeFolder(name, location, parentId).catch((error) => {
              noticeError(error);
              return null;
            })}
            onRenameFolder={(id, name) => renameShapeFolder(id, name).catch((error) => {
              noticeError(error);
              return null;
            })}
            onDeleteFolder={(id) => void deleteShapeFolder(id).catch(noticeError)}
            onLoad={() => myShapesFileInputRef.current?.click()}
            onShown={() => void refreshServerShapes()}
            onDragDone={close}
          />
        )}
        onAddShape={(shape) => {
          setTopPanel(null);
          if (workspaceSettings.clickToPlaceShapes) {
            startCruise(shape);
            return;
          }
          addShape(shape);
        }}
      />
      <div className="editor-body">
        {outlinerOpen ? (
          <ObjectListPanel
            inert={historyViewState !== null}
            shapes={historyViewState?.shapes ?? shapes}
            selectedIds={historyViewState ? [] : selectedIds}
            onSelectShape={selectShape}
            onToggleLock={toggleShapeLockById}
            onToggleHidden={toggleShapeHiddenById}
            onRenameShape={renameShapeById}
            onOpenGroup={openGroupForEditing}
            openGroupPartIds={openGroup?.childIds}
            onClose={() => setOutlinerOpen(false)}
          />
        ) : null}
        {toolbarMode === "sketch" && sketchActive ? (
          <SketchWorkspace
            profile={sketchProfile}
            operation={sketchOperation}
            onOperationChange={switchSketchOperation}
            revolvePreviewPositions={sketchRevolvePreview?.positions ?? null}
            referenceShapes={sketchReferenceShapes.filter((shape) => shape.id !== editingSketchShapeId)}
            referenceSlices={sketchReferenceSlices}
            referenceEdges={sketchReferenceEdges}
            showReferenceEdges={sketchShowPartEdges}
            onToggleReferenceEdges={() => setSketchShowPartEdges((on) => !on)}
            tool={sketchTool}
            activePointId={sketchActivePointId}
            selected={sketchSelection}
            measurement={sketchMeasurement}
            pendingMeasurementStart={sketchMeasureStart}
            initialSnap={snapGrid}
            onSnapChange={(snap) => updateProjectWorkspaceSettings({ workspace: workspaceSettingsRef.current, snap })}
            initialWorkspace={workspaceSettings}
            onPlanePoint={addSketchPlanePoint}
            fromMiddle={sketchFromMiddle}
            onAddPrimitive={addSketchPrimitive}
            onAddArc={addSketchArc}
            onPointPress={pressSketchPoint}
            onFinishLine={() => setSketchActivePointId(null)}
            onSelectSegment={(id) => {
              setSketchSelection({ kind: "segment", id });
              setSketchActivePointId(null);
            }}
            onToggleSelect={(entity) => {
              const next = toggleSketchSelection(sketchSelection, entity);
              setSketchSelection(next);
              setSketchActivePointId(null);
              const count = sketchSelectionCount(next);
              setNotice(count === 0
                ? t("status.sketchSelectionCleared")
                : count === 1 ? t("status.sketchSelectedOne") : t("status.sketchSelectedMany", { count }));
            }}
            onSelectMany={(pointIds, segmentIds, imageIds) => {
              setSketchSelection(pointIds.length || segmentIds.length || imageIds.length ? { kind: "multiple", pointIds, segmentIds, imageIds } : null);
              setSketchActivePointId(null);
              const count = pointIds.length + segmentIds.length + imageIds.length;
              setNotice(count === 0
                ? t("status.sketchSelectionCleared")
                : count === 1 ? t("status.sketchSelectedOne") : t("status.sketchSelectedMany", { count }));
            }}
            onSelectImage={(id) => {
              setSketchSelection({ kind: "image", id });
              setSketchActivePointId(null);
              setNotice(t("status.sketchImageSelected"));
            }}
            onUpdateImage={updateSketchImage}
            onDeleteImage={deleteSketchImage}
            onDeletePoint={deleteSketchPoint}
            onDeleteSegment={deleteSketchSegment}
            onMovePoint={moveSketchPoint}
            onToggleOutlineLock={toggleSketchOutlineLock}
            onTransformPoints={transformSketchPoints}
            onMoveHandle={moveSketchHandle}
            onSelectTool={chooseSketchTool}
            onEraseMany={eraseSketchMany}
            onInsertPoint={insertSketchPoint}
            onSetPointMode={setSketchPointMode}
            onCurveSegment={curveSketchSegmentAction}
            onCurveSegments={curveSketchSegmentsAction}
            onMirror={mirrorSketchSelectionAction}
            onStraightenSegments={straightenSketchSegmentsAction}
            onStraightenSegment={straightenSketchSegmentAction}
            onSetSegmentConstruction={setSketchSegmentConstruction}
            onApplyFillet={applySketchFilletHandler}
            onApplyChamfer={applySketchChamferHandler}
            onClearMeasurement={clearSketchMeasurement}
            onMeasureTool={() => setActiveSketchTool(sketchTool === "measure" ? "select" : "measure")}
            cornerDialog={sketchCornerDialog}
            onCornerDialogChange={setSketchCornerDialog}
            strokePanelOpen={sketchStrokePanelOpen}
            onCloseStrokePanel={() => setSketchStrokePanelOpen(false)}
            onStrokeChange={(stroke) => commitSketchProfile(
              { ...sketchProfile, stroke },
              t(stroke ? "status.sketchStrokeSet" : "status.sketchStrokeOff"),
            )}
            onSilhouetteChange={(silhouette) => {
              const next: SketchProfile = { ...sketchProfile, silhouette };
              if (!silhouette) delete next.silhouette;
              commitSketchProfile(next, t(silhouette ? "status.sketchSilhouetteOn" : "status.sketchSilhouetteOff"));
            }}
            strokePreview={sketchStrokePreview}
          />
        ) : (
          <WorkplaneViewport
          projectName={projectName}
          projectId={editorOpen ? projectId ?? null : null}
          shapes={historyView.shapes ?? viewportShapes}
          selectedIds={historyViewState ? [] : selectedIds}
          pickOnly={historyView.pickOnly}
          alignMode={alignMode}
          multiSelect={multiSelect}
          onMultiSelectEnd={endMultiSelect}
          alignAnchorId={effectiveAlignAnchorId}
          alignHandles={alignHandleStatuses}
          alignAxes={alignAxes}
          alignFrameBounds={alignFrameBounds}
          alignReferenceShapes={shapes}
          mirrorMode={mirrorMode}
          mirrorReferenceShapes={shapes}
          splitActive={Boolean(splitSession) || historyViewState !== null}
          splitPlane={splitPlane}
          onSplitPositionChange={changeSplitPosition}
          splitSurfacePick={Boolean(splitSession?.picking)}
          onSplitSurfacePick={pickSplitSurface}
          placementWorkplane={historyViewState ? historyViewState.placementWorkplane : placementWorkplane}
          workplaneHidden={workplaneHidden}
          onToggleWorkplaneHidden={() => {
            const next = !workplaneHiddenRef.current;
            workplaneHiddenRef.current = next;
            setWorkplaneHidden(next);
            setNotice(next ? t("status.workplaneHidden") : t("status.workplaneShown"));
          }}
          workplaneMode={workplaneMode}
          initialSnap={snapGrid}
          initialWorkspace={workspaceSettings}
          workspaceSettingsKey={projectId ?? "local-workplane"}
          cruiseAsset={historyViewState ? null : cruiseAsset}
          carryIds={historyViewState ? null : carryIds}
          onCarryDrop={dropCarried}
          onCancelCruise={stopCruise}
          onAddShape={addShape}
          onDropMyShape={(id, point) => void insertMyShape(id, point).catch(noticeError)}
          onAlignAnchorChange={chooseAlignAnchor}
          onAlignPreview={previewAlignSelection}
          onAlignPreviewClear={clearAlignPreview}
          onAlignSelection={alignSelectionTo}
          onMirrorPreview={previewMirrorSelection}
          onMirrorPreviewClear={clearMirrorPreview}
          onMirrorSelection={mirrorSelectionAcross}
          onSelectShape={selectShape}
          onShapeContextMenu={historyViewState ? undefined : openShapeContextMenu}
          onSetPlacementWorkplane={setViewportPlacementWorkplane}
          onToggleWorkplaneTool={activateWorkplaneTool}
          onInteractionActiveChange={updateProjectInteractionActive}
          onCancelInteraction={cancelInteraction}
          onEditSketch={beginSketchEdit}
          onOpenGroup={selectedShapes.length === 1 && canEditGroup(selectedShape) ? openGroupForEditing : undefined}
          canSeparateParts={canSeparateSelectedParts}
          onSeparateParts={separateSelectedParts}
          onSelectionHole={setSelectionHoleMode}
          onSelectionColor={setSelectionColor}
          onSelectionUpdateShapes={updateShapesTogether}
          onSelectionLock={toggleLocked}
          onSelectionHide={toggleHidden}
          onWrapAroundCylinder={selectedShapes.length === 1 && offersCylinderWrap(selectedShape) ? wrapSelectionAroundCylinder : undefined}
          onLayerText={selectedShapes.length === 1 && offersTextLayers(selectedShape) ? layerSelectedText : undefined}
          onTextTags={selectedShapes.length === 1 && offersTextLayers(selectedShape) ? makeTextTags : undefined}
          onFixKeyringTab={selectedShapes.length === 1 && selectedShape?.keyringTab && !historyViewState ? () => void fixKeyringTab() : undefined}
          textLayerStack={selectedNameTag}
          iconTag={historyViewState ? null : iconTagControls}
          qrCode={historyViewState ? null : qrCodeControls}
          toolMemory={viewportToolMemoryRef}
          prepareNewShape={prepareNewShape}
          onUpdateShape={updateShape}
          onDuplicateShapeAt={duplicateShapeAt}
          onDuplicateShapesMoved={duplicateShapesMoved}
          notes={historyViewState ? historyViewState.notes : notes}
          notesVisible={notesVisible}
          showOverhangs={overhangsVisible}
          noteMode={historyViewState ? false : noteMode}
          rotationPivot={activeRotationPivot}
          pivotPickMode={pivotPickMode}
          onPivotPick={pickRotationPivot}
          layFlatPickMode={layFlatPickMode}
          onLayFlatPick={layFlatOnFace}
          mateFacePick={mateTool && mateTool.step !== "ready"
            ? { shapeIds: mateTool.step === "source" ? [mateTool.sourceId] : shapes.filter((shape) => shape.id !== mateTool.sourceId && !shape.hidden).map((shape) => shape.id) }
            : holePatternTool?.step === "pick"
              ? { shapeIds: [holePatternTool.sourceId] }
              : faceTool?.step === "pick"
                ? { shapeIds: [faceTool.sourceId] }
                : null}
          onMateFacePick={mateTool ? pickMateFace : faceTool ? pickFaceToolFace : pickHolePatternFace}
          cadFacePick={historyViewState ? null : cadFacePick}
          onCadFacePick={toggleDeleteFace}
          onNoteAdd={addNote}
          onAddReferencePoints={addReferencePoints}
          onRemoveAllReferencePoints={removeAllReferencePoints}
          onNoteUpdate={updateNote}
          onNoteRemove={removeNote}
          onNoteModeChange={setNoteMode}
          onWorkspaceSettingsChange={updateProjectWorkspaceSettings}
          onWorkplaneModeChange={closeViewportWorkplaneMode}
          onNotice={setNotice}
          modifierActive={Boolean(edgeModifier)}
          modifierPreviewActive={Boolean(edgeModifier?.preview)}
          modifierEdges={modifierDisplayEdges}
          modifierHighlightedEdgeIds={modifierAvailableEdgeIds}
          selectedModifierEdgeIds={edgeModifier?.selectedEdgeIds ?? NO_EDGE_IDS}
          failedModifierEdgeIds={edgeModifier?.error ? edgeModifier.failedEdgeIds ?? NO_EDGE_IDS : NO_EDGE_IDS}
          modifierOnlyVisibleEdges={edgeModifier?.onlyVisibleEdges ?? false}
          onModifierEdgeToggle={toggleModifierEdge}
          themePreference={themePreference}
          resolvedTheme={resolvedTheme}
          onThemePreferenceChange={onThemePreferenceChange}
          onExportSectionSvg={(axis, offset, frame) => void exportSectionSvg(axis, offset, frame)}
          onSectionContours={sectionContours}
          onSectionBodies={sectionBodies}
          />
        )}
      </div>
      {shapeContextMenu && toolbarMode === "geometry" ? (
        <ShapeContextMenu
          x={shapeContextMenu.x}
          y={shapeContextMenu.y}
          label={t("contextMenu.label")}
          items={shapeContextMenuItems()}
          onClose={closeShapeContextMenu}
        />
      ) : null}
      <AppFooter variant="editor" version={LYL_CREATED_WITH_VERSION} onBugReport={() => void saveBugReport()} />
      {historyViewState && toolbarMode === "geometry" ? (
        <HistoryViewOverlay
          index={historyViewState.index}
          count={history.length}
          liveIndex={historyIndex}
          recordedAt={historyViewState.entry.at}
          objectCount={historyViewState.shapes.length}
          lastStep={historyViewSteps?.last ?? null}
          nextStep={historyViewSteps?.next ?? null}
          creating={historyProjectCreating}
          canCreateProject={Boolean(onCreateProjectFromState)}
          pickedCount={historyView.picked.length}
          onBringBack={() => historyView.bringBack(historyViewState.index, historyView.picked)}
          openGroups={historyView.open.map(displayShapeName)}
          canOpenGroup={Boolean(historyView.pickedGroup)}
          onOpenGroup={historyView.openPickedGroup}
          onBackOut={historyView.backOut}
          onIndexChange={(index) => setHistoryViewIndex(Math.min(Math.max(0, index), Math.max(0, history.length - 1)))}
          onExport={() => setTopPanel((current) => (current === "export" ? null : "export"))}
          onCreateProject={() => void createProjectFromHistoryState()}
          onDeleteHistory={clearHistory}
          onClose={closeHistoryView}
        />
      ) : null}
      {openGroup ? (
        <div className="open-group-banner" role="status">
          <span>
            {t("group.editing", { path: openGroups.map((level) => displayShapeName(level.original)).join(" › ") })}
            {openGroup.original.edgeTreatments?.length ? t("group.editingEdgeWarning") : ""}
          </span>
          <button type="button" className="open-group-cancel" onClick={cancelOpenGroup} disabled={openGroupBusy}>{t("common.cancel")}</button>
          <button type="button" className="open-group-done" onClick={() => void finishOpenGroup()} disabled={openGroupBusy}>{t("group.done")}</button>
        </div>
      ) : null}
      {overhangWarning ? (
        <div className="bed-overhang-warning" role="status">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>{overhangWarning}</span>
          <button type="button" className="bed-overhang-dismiss" aria-label={t("status.bedOverhangDismiss")} title={t("status.bedOverhangDismiss")} onClick={dismissOverhangWarning}>
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      ) : null}
      {arrayTool && selectedShapes.length > 0 ? (
        <ArrayPanel
          targetName={selectedShapes.length === 1 ? selectedShapes[0].name : t("array.targetMany", { count: selectedShapes.length })}
          settings={arrayTool}
          workspace={workspaceSettings}
          pivotSet={Boolean(activeRotationPivot)}
          onChange={(patch) => setArrayTool((current) => current ? { ...current, ...patch } : current)}
          onApply={applyArrayTool}
          onCancel={() => {
            setArrayTool(null);
            setNotice(t("status.arrayCancelled"));
          }}
        />
      ) : null}
      {scalePercentTool && selectedShapes.length > 0 ? (
        <ScalePercentPanel
          targetName={selectedShapes.length === 1 ? selectedShapes[0].name : t("array.targetMany", { count: selectedShapes.length })}
          count={selectedShapes.length}
          settings={scalePercentTool}
          workspace={workspaceSettings}
          error={scalePercentError}
          onChange={(patch) => {
            setScalePercentError(null);
            setScalePercentTool((current) => current ? { ...current, ...patch } : current);
          }}
          onApply={applyScalePercentTool}
          onCancel={() => {
            setScalePercentTool(null);
            setScalePercentError(null);
          }}
        />
      ) : null}
      {fontManagerOpen ? (
        <FontManagerPanel
          canApply={selectedShapes.some((shape) => shape.kind === "text")}
          loadRuntime={getManifoldRuntime}
          onUse={applyCustomFontToSelection}
          onNotice={(message) => setNotice(message)}
          onClose={() => setFontManagerOpen(false)}
        />
      ) : null}
      {simplifyToolShape ? (
        <MeshSimplifyPanel
          key={simplifyToolShape.id}
          shape={simplifyToolShape}
          onApply={applySimplifyTool}
          onCancel={() => setSimplifyToolId(null)}
        />
      ) : null}
      {holePatternTool && selectedShape?.id === holePatternTool.sourceId ? (
        <HolePatternPanel
          targetName={displayShapeName(selectedShape)}
          step={holePatternTool.step}
          settings={holePatternTool.settings}
          workspace={workspaceSettings}
          thickness={holePatternTool.face?.thickness ?? 0}
          holeCount={holePatternPreview?.holes.length ?? 0}
          tooMany={Boolean(holePatternPreview?.tooMany)}
          busy={holePatternTool.busy}
          onChange={changeHolePatternSettings}
          onRepick={() => {
            setHolePatternTool({ ...holePatternTool, step: "pick", face: null });
            setNotice(t("status.holePatternStart"));
          }}
          onApply={() => void applyHolePattern()}
          onCancel={() => {
            setHolePatternTool(null);
            setNotice(t("status.holePatternCancelled"));
          }}
        />
      ) : null}
      {faceTool && selectedShape?.id === faceTool.sourceId ? (
        <FaceToolPanel
          targetName={displayShapeName(selectedShape)}
          step={faceTool.step}
          settings={faceTool.settings}
          workspace={workspaceSettings}
          thickness={faceTool.face?.thickness ?? 0}
          empty={Boolean(faceToolPreview?.empty)}
          busy={faceTool.busy}
          onChange={changeFaceToolSettings}
          onRepick={() => {
            setFaceTool({ ...faceTool, step: "pick", face: null });
            setNotice(t("status.faceToolStart"));
          }}
          onApply={() => void applyFaceTool()}
          onCancel={() => {
            setFaceTool(null);
            setNotice(t("status.faceToolCancelled"));
          }}
        />
      ) : null}
      {mateTool && selectedShape ? (
        <MateFacesPanel
          targetName={displayShapeName(selectedShape)}
          step={mateTool.step}
          mode={mateTool.mode}
          gap={mateTool.gap}
          workspace={workspaceSettings}
          onModeChange={(mode) => setMateTool((current) => (current ? { ...current, mode } : current))}
          onGapChange={(gap) => setMateTool((current) => (current ? { ...current, gap } : current))}
          onApply={applyMateFaces}
          onCancel={() => {
            setMateTool(null);
            setNotice(t("status.mateCancelled"));
          }}
        />
      ) : null}
      {shellTool && selectedShape ? (
        <ShellPanel
          targetName={selectedShape.name}
          thickness={shellTool.thickness}
          maxThickness={shellMaxThickness({ width: shapeWidth(selectedShape), depth: shapeDepth(selectedShape), height: selectedShape.height }, shellTool.openings)}
          openings={shellTool.openings}
          workspace={workspaceSettings}
          busy={shellTool.busy}
          error={shellTool.error}
          roundedEdgesHint={selectedShape.kind === "roundedBox" && (selectedShape.topBottomFillet ?? 0) > 0}
          appliedFeatureCount={selectedEdgeFeatureCount}
          reversibleFeatureCount={selectedReversibleEdgeFeatureCount}
          historyOptions={selectedEdgeHistoryOptions}
          onRemoveFeature={removeEdgeTreatment}
          onEditFeature={editEdgeTreatment}
          onThicknessChange={(value) => setShellTool((current) => current ? { ...current, thickness: value, error: null } : current)}
          onOpeningsChange={(value) => setShellTool((current) => {
            if (!current) return current;
            // A wall that fitted a frame may be too thick once a floor has to stay.
            const max = shellMaxThickness({ width: shapeWidth(selectedShape), depth: shapeDepth(selectedShape), height: selectedShape.height }, value);
            return { ...current, openings: value, thickness: Math.min(current.thickness, max), error: null };
          })}
          edges={shellTool.edges}
          onEdgesChange={(value) => setShellTool((current) => current ? { ...current, edges: value, error: null } : current)}
          onApply={applyShellTool}
          onCancel={() => setShellTool(null)}
        />
      ) : null}
      {deleteFaceTool && selectedShape?.id === deleteFaceTool.shapeId ? (
        <DeleteFacePanel
          targetName={selectedShape.name}
          faceCount={deleteFaceTool.selectedFaceIds.length}
          preparing={!deleteFaceTool.faces && !deleteFaceTool.error}
          busy={deleteFaceTool.busy}
          error={deleteFaceTool.error}
          appliedFeatureCount={selectedEdgeFeatureCount}
          reversibleFeatureCount={selectedReversibleEdgeFeatureCount}
          historyOptions={selectedEdgeHistoryOptions}
          onRemoveFeature={removeEdgeTreatment}
          onClear={() => setDeleteFaceTool((current) => current && !current.busy ? { ...current, selectedFaceIds: [], error: null } : current)}
          onApply={applyDeleteFaceTool}
          onCancel={() => {
            if (deleteFaceTool.busy) return;
            deleteFaceRunRef.current += 1;
            setDeleteFaceTool(null);
          }}
        />
      ) : null}
      {splitSession && splitPlane ? (
        <SplitPanel
          axis={splitSession.axis}
          rotation={splitSession.rotation}
          position={splitPlane.position}
          min={splitPlane.min}
          max={splitPlane.max}
          targetCount={splitTargetShapes.length}
          workspace={workspaceSettings}
          busy={splitSession.busy}
          error={splitSession.error}
          picking={splitSession.picking}
          onPickToggle={toggleSplitPick}
          onAxisChange={changeSplitAxis}
          onAlignToWorkplane={alignSplitToWorkplane}
          onRotationChange={changeSplitRotation}
          onPositionChange={changeSplitPosition}
          onApply={() => void applySplit()}
          onCancel={cancelSplit}
        />
      ) : null}
      {edgeModifier ? (
        <EdgeModifierPanel
          kind={edgeModifier.kind}
          amount={edgeModifier.amount}
          maxAmount={edgeModifierMaxAmount}
          chamferAngle={edgeModifier.chamferAngle}
          quality={edgeModifier.quality}
          sharpAngle={edgeModifier.sharpAngle}
          workspace={workspaceSettings}
          tangentChain={edgeModifier.tangentChain}
          onlyVisibleEdges={edgeModifier.onlyVisibleEdges ?? false}
          impliedEdgeCount={edgeModifierImpliedEdges}
          preserveEdgeSize={edgeModifier.preserveEdgeSize}
          targetName={selectedShape?.name ?? "Object"}
          groupedCount={selectedShape?.groupedShapes?.length ?? 0}
          appliedFeatureCount={selectedEdgeFeatureCount}
          reversibleFeatureCount={selectedReversibleEdgeFeatureCount}
          historyOptions={selectedEdgeHistoryOptions}
          selectedCount={edgeModifier.selectedEdgeIds.length}
          availableCount={modifierAvailableEdgeIds.length}
          busy={edgeModifier.busy}
          prepared={edgeModifier.prepared}
          error={edgeModifier.error}
          // The same value again changes nothing: dropping the preview for it left Apply
          // waiting on a computation nobody started (#204).
          onAmountChange={(value) => setEdgeModifier((current) => {
            if (!current?.prepared) return current;
            const amount = Math.max(MIN_EDGE_MODIFIER_AMOUNT, Math.min(edgeModifierMaxAmount, value));
            return amount === current.amount ? current : { ...current, amount, preview: null, busy: current.selectedEdgeIds.length > 0, error: null };
          })}
          endAmount={edgeModifier.endAmount ?? null}
          // Switching it on starts the end at twice the start, so the change shows at once (#687).
          onEndAmountChange={(value) => setEdgeModifier((current) => {
            if (!current?.prepared) return current;
            const endAmount = value === null ? null : Math.max(MIN_EDGE_MODIFIER_AMOUNT, Math.min(edgeModifierMaxAmount, Number.isNaN(value) ? current.amount * 2 : value));
            return endAmount === (current.endAmount ?? null) ? current : { ...current, endAmount, preview: null, busy: current.selectedEdgeIds.length > 0, error: null };
          })}
          onSwapEnds={() => setEdgeModifier((current) => {
            if (!current?.prepared || current.endAmount == null || current.endAmount === current.amount) return current;
            return { ...current, amount: current.endAmount, endAmount: current.amount, preview: null, busy: current.selectedEdgeIds.length > 0, error: null };
          })}
          onChamferAngleChange={(value) => setEdgeModifier((current) => {
            if (!current?.prepared) return current;
            const chamferAngle = Math.max(current.kind === "chamfillet" ? 15 : 5, Math.min(current.kind === "chamfillet" ? 75 : 85, value));
            return chamferAngle === current.chamferAngle ? current : { ...current, chamferAngle, preview: null, busy: current.selectedEdgeIds.length > 0, error: null };
          })}
          onKindChange={(kind) => setEdgeModifier((current) => {
            if (!current?.prepared || current.kind === kind) return current;
            const chamferAngle = kind === "chamfillet" ? Math.max(15, Math.min(75, current.chamferAngle)) : current.chamferAngle;
            return { ...current, kind, chamferAngle, preview: null, busy: current.selectedEdgeIds.length > 0, error: null };
          })}
          onQualityChange={(quality) => setEdgeModifier((current) => !current?.prepared || quality === current.quality ? current : { ...current, quality, preview: null, busy: current.selectedEdgeIds.length > 0, error: null })}
          onSharpAngleChange={(sharpAngle) => setEdgeModifier((current) => {
            if (!current?.prepared) return current;
            const nextAngle = Math.max(1, Math.min(CAD_MODIFIER_MAX_SHARP_ANGLE, sharpAngle));
            const availableIds = new Set(current.edges
              .filter((edge) => selectableCadModifierEdge(edge, nextAngle))
              .map((edge) => edge.id));
            const selectedEdgeIds = current.selectedEdgeIds.filter((edgeId) => availableIds.has(edgeId));
            return {
              ...current,
              sharpAngle: nextAngle,
              selectedEdgeIds,
              preview: null,
              busy: selectedEdgeIds.length > 0,
              error: availableIds.size === 0 ? t("edge.noEdgeAtThreshold") : selectedEdgeIds.length ? null : t("edge.selectAtLeastOne"),
            };
          })}
          onTangentChainChange={(tangentChain) => setEdgeModifier((current) => current?.prepared ? { ...current, tangentChain } : current)}
          onOnlyVisibleEdgesChange={(onlyVisibleEdges) => setEdgeModifier((current) => current?.prepared ? { ...current, onlyVisibleEdges } : current)}
          onPreserveEdgeSizeChange={(preserveEdgeSize) => setEdgeModifier((current) => current?.prepared ? { ...current, preserveEdgeSize } : current)}
          onSelectAll={() => setEdgeModifier((current) => current?.prepared ? { ...current, selectedEdgeIds: modifierAvailableEdgeIds, preview: null, busy: modifierAvailableEdgeIds.length > 0, error: modifierAvailableEdgeIds.length ? null : current.error } : current)}
          onSelectTop={(add) => selectQuickEdges("top", topCadModifierEdgeIds, "edge.noTopEdges", add)}
          onSelectBottom={(add) => selectQuickEdges("bottom", bottomCadModifierEdgeIds, "edge.noBottomEdges", add)}
          onSelectVertical={(add) => selectQuickEdges("vertical", verticalCadModifierEdgeIds, "edge.noVerticalEdges", add)}
          onSelectHorizontal={(add) => selectQuickEdges("horizontal", horizontalCadModifierEdgeIds, "edge.noHorizontalEdges", add)}
          activeQuickSelection={modifierQuickSelection}
          onClear={() => setEdgeModifier((current) => current?.prepared ? { ...current, selectedEdgeIds: [], preview: null, busy: false, error: t("edge.selectAtLeastOne") } : current)}
          onRemoveFeature={removeEdgeTreatment}
          onEditFeature={editEdgeTreatment}
          onApply={applyEdgeModifier}
          onCancel={cancelEdgeModifier}
        />
      ) : null}
      {iconTagPanelOpen && !historyViewState ? (
        <IconTagPanel onClose={() => setIconTagPanelOpen(false)} onCreate={createIconTag} />
      ) : null}
      {qrCodePanelOpen && !historyViewState ? (
        <QrCodePanel onClose={() => setQrCodePanelOpen(false)} onCreate={createQrCode} />
      ) : null}
      {topPanel ? (
        <TopActionPanel
          panel={topPanel}
          projectName={historyViewName}
          shapeCount={exportableShapeCount}
          scopeLabel={exportScopeLabel}
          selectionLeavesOut={exportSelectionScoped && exportSelectedVisibleCount < exportVisibleCount ? { selected: selectedShapes.length, total: exportVisibleCount } : null}
          onSelectAll={selectAllVisible}
          onlyHoles={exportHolesOnly}
          hiddenCount={exportHiddenCount}
          estimateShapes={exportTargetShapes}
          onEstimatePrint={exportSolidVolume}
          onClose={() => setTopPanel(null)}
          onExport={(format, exportName, chooseFile, svgView) => void exportDesign(format, exportName, chooseFile, svgView)}
          stlFileName={topPanel === "export" ? linkedStlFile(projectId ?? "")?.name ?? null : null}
          onExportLyl={exportLylDesign}
          onExportStep={exportStepDesign}
          onExportDrawing={exportDrawingDesign}
          drawingExporting={drawingExporting}
          onExportImage={exportViewImage}
          sharedProjectsEnabled={sharedProjectsEnabled}
          lylExporting={lylExporting}
          stepExporting={stepExporting}
          onImportFiles={selectFiles}
          onPickFile={() => fileInputRef.current?.click()}
          onPickProjectFile={() => void pickProjectFile()}
          onPickInsertProjectFile={() => insertProjectFileInputRef.current?.click()}
          workspaceHistoryLimit={workspaceSettings.historyLimit}
        />
      ) : null}
      <input
        ref={sketchImageInputRef}
        className="hidden-file-input"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/bmp,image/svg+xml"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) void addSketchImageFile(file);
          event.currentTarget.value = "";
        }}
      />
      <input
        ref={projectFileInputRef}
        className="hidden-file-input"
        type="file"
        accept={projectFileAccept}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) selectFiles([file]);
          event.currentTarget.value = "";
        }}
      />
      <input
        ref={myShapesFileInputRef}
        className="hidden-file-input"
        type="file"
        multiple
        accept={myShapesFileAccept}
        onChange={(event) => {
          const files = Array.from(event.currentTarget.files ?? []);
          event.currentTarget.value = "";
          if (files.length) void loadMyShapeFiles(files);
        }}
      />
      <input
        ref={insertProjectFileInputRef}
        className="hidden-file-input"
        type="file"
        accept={projectFileAccept}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) void insertLylDesign(file);
          event.currentTarget.value = "";
        }}
      />
      <input
        ref={fileInputRef}
        className="hidden-file-input"
        type="file"
        multiple
        accept={importFileAccept}
        onChange={(event) => {
          if (event.currentTarget.files) {
            selectFiles(event.currentTarget.files);
          }
          event.currentTarget.value = "";
        }}
      />
      {shortcutsOpen ? (
        <ShortcutsModal sketchMode={toolbarMode === "sketch"} onClose={() => setShortcutsOpen(false)} />
      ) : null}
      {interactiveHelp ? <InteractiveHelp onExit={toggleInteractiveHelp} /> : null}
      {guideOpen ? <GuideModal sharedStore={sharedProjectsEnabled} sketchMode={toolbarMode === "sketch"} onClose={() => setGuideOpen(false)} /> : null}
      {notice ? (
        <p className="editor-status" role="status" aria-live="polite" onMouseEnter={holdNotice} onMouseLeave={releaseNotice}>
          <span className="editor-status-text">{notice}</span>
          {noticeAction ? (
            <button
              className="editor-status-action"
              type="button"
              onClick={() => {
                const run = noticeAction.run;
                dismissNotice();
                run();
              }}
            >
              {noticeAction.label}
            </button>
          ) : null}
          <button className="editor-status-close" type="button" aria-label={t("status.dismiss")} title={t("status.dismiss")} onClick={dismissNotice}>
            <X size={13} strokeWidth={2.6} aria-hidden="true" />
          </button>
        </p>
      ) : null}
      <pre data-codex-state hidden>
        {debugState}
      </pre>
      <pre data-codex-summary hidden>
        {compactDebugState}
      </pre>
    </div>
  );
}

const sketchReferenceIcons = {
  line: "sketch-tool-line.png",
  arc: "sketch-tool-arc.png",
  bezier: "sketch-tool-bezier-curve.png",
  smooth: "sketch-tool-smooth-curve.png",
  select: "sketch-tool-select.png",
  image: "sketch-tool-add-image.png",
  refine: "sketch-tool-add-or-remove-points.png",
  erase: "sketch-tool-erase.png",
  measure: "sketch-tool-measure.png",
  sketchTo3d: "sketch-tool-sketch-to-3d.png",
  editSketchTo3d: "sketch-tool-edit-sketch-to-3d.png",
} as const;

type SketchReferenceIconName = keyof typeof sketchReferenceIcons;

function SketchReferenceIcon({ name }: { name: SketchReferenceIconName }) {
  return (
    <img
      aria-hidden="true"
      className="sketch-reference-icon"
      data-sketch-icon={name}
      draggable={false}
      src={`/assets/editor/${sketchReferenceIcons[name]}`}
      alt=""
    />
  );
}

type SketchShapeOptions = { sides: number; innerPercent: number };

/** A number in the sketch shapes menu: typed freely, tidied to its limits when it is left. */
function SketchShapeNumberField({ label, value, min, max, suffix, normalize, onChange }: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix?: string;
  normalize: (value: unknown) => number;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const commit = () => {
    const next = normalize(draft.replace(",", "."));
    setDraft(String(next));
    onChange(next);
  };
  // The mouse wheel in the clicked field (#536): whole numbers, so one notch is one, Shift ten.
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  useWheelField(inputRef, focused, ({ direction, keys }) => {
    const typed = Number(draft.replace(",", "."));
    const next = normalize(wheelNextValue(Number.isFinite(typed) ? typed : value, direction, 1, { shift: keys.shift }));
    setDraft(String(next));
    onChange(next);
  });
  return (
    <label>
      <span>{label}</span>
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        aria-label={label}
        title={`${min} - ${max}`}
        value={draft}
        onFocus={(event) => { setFocused(true); event.currentTarget.select(); }}
        onChange={(event) => setDraft(event.currentTarget.value)}
        onBlur={() => { setFocused(false); commit(); }}
        onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
      />
      {suffix ? <span className="unit">{suffix}</span> : null}
    </label>
  );
}

const sketchShapeMenuItems = [
  { primitive: "rectangle", label: "sketch.rectangle", icon: SquareIcon },
  { primitive: "circle", label: "sketch.circle", icon: CircleIcon },
  { primitive: "ellipse", label: "sketch.ellipse", icon: SketchEllipseIcon },
  { primitive: "halfCircle", label: "sketch.halfCircle", icon: SketchHalfCircleIcon },
  { primitive: "pieSlice", label: "sketch.pieSlice", icon: SketchPieSliceIcon },
  { primitive: "triangle", label: "sketch.triangle", icon: TriangleIcon },
  { primitive: "hexagon", label: "sketch.hexagon", icon: HexagonIcon },
  { primitive: "polygon", label: "sketch.polygon", icon: PentagonIcon },
  { primitive: "star", label: "sketch.star", icon: StarIcon },
  { primitive: "boltCircle", label: "sketch.boltCircle", icon: SketchBoltCircleIcon },
] satisfies Array<{ primitive: SketchPrimitive; label: MessageKey; icon: ComponentType<SVGProps<SVGSVGElement>> }>;

/** The keys that do what a toolbar button does, shown beside it in the command search. */
const COMMAND_SHORTCUTS: Readonly<Record<string, string>> = {
  copy: "Ctrl+C",
  paste: "Ctrl+V",
  duplicate: "Ctrl+D",
  delete: "Delete",
  undo: "Ctrl+Z",
  redo: "Ctrl+Y",
  outliner: "Ctrl+Shift+O",
  "toggle-hidden": "Ctrl+H",
  "show-hidden": "Ctrl+Shift+H",
  group: "Ctrl+G",
  bundle: "Ctrl+B",
  ungroup: "Ctrl+Shift+G",
  align: "L",
  mirror: "M",
  fillet: "B",
  chamfer: "Shift+B",
  drop: "D",
  note: "N",
  import: "Ctrl+I",
  "interactive-help": "Shift+F1",
  export: "Ctrl+E",
  "sketch-copy": "Ctrl+C",
  "sketch-paste": "Ctrl+V",
  "sketch-duplicate": "Ctrl+D",
  "sketch-delete": "Delete",
  "sketch-undo": "Ctrl+Z",
  "sketch-redo": "Ctrl+Y",
};

type SketchIconName = Parameters<typeof SketchReferenceIcon>[0]["name"];

/** A sketch tool's picture as a component of its own, for the command search. */
function sketchPaletteIcon(name: SketchIconName) {
  return function SketchPaletteIcon() {
    return <SketchReferenceIcon name={name} />;
  };
}

const SKETCH_PALETTE_ICONS = {
  line: sketchPaletteIcon("line"),
  arc: sketchPaletteIcon("arc"),
  bezier: sketchPaletteIcon("bezier"),
  smooth: sketchPaletteIcon("smooth"),
  select: sketchPaletteIcon("select"),
  image: sketchPaletteIcon("image"),
  refine: sketchPaletteIcon("refine"),
  erase: sketchPaletteIcon("erase"),
};

function SecondaryToolbar({
  toolbarMode,
  projectName,
  onProjectNameChange,
  onToolbarModeChange,
  outlinerOpen,
  onToggleOutliner,
  alignMode,
  canAlign,
  canModifySelection,
  canEdgeModify,
  edgeModifierKind,
  canGroup,
  canIntersect,
  canRedo,
  canUngroup,
  canUndo,
  canHistoryView,
  historyViewActive,
  onHistoryView,
  hasClipboard,
  hasSelection,
  hiddenShapeCount,
  selectionHidden,
  mirrorMode,
  canSplit,
  splitMode,
  sketchActive,
  sketchOperation,
  sketchTool,
  sketchCanUndo,
  sketchCanRedo,
  sketchHasSelection,
  sketchHasClipboard,
  canEditSketch,
  canFilletSketchPoint,
  sketchCornerDialog,
  onSketchCornerDialog,
  sketchConstruction,
  onSketchConstruction,
  sketchFromMiddle,
  onSketchFromMiddle,
  sketchStrokeActive,
  onSketchStroke,
  onStartSketch,
  onEditSketch,
  onSketchTool,
  onSketchPrimitive,
  sketchShapeOptions,
  onSketchShapeOptions,
  onSketchImage,
  onSketchCopy,
  onSketchPaste,
  onSketchDuplicate,
  onSketchDelete,
  onSketchUndo,
  onSketchRedo,
  onSketchFinish,
  onSketchCancel,
  onHome,
  onAlign,
  onChamfer,
  onCopy,
  onDelete,
  onDuplicate,
  onCenterOnWorkplane,
  onDropToWorkplane,
  onLayFlat,
  layFlatActive,
  onMateFaces,
  mateFacesActive,
  onHolePattern,
  holePatternActive,
  canHolePattern,
  onFaceTool,
  faceToolActive,
  canFaceTool,
  onGroup,
  onBundle,
  onIntersect,
  onIntersectPreview,
  intersectPreviewActive,
  onFillet,
  onHollow,
  hollowActive,
  onDeleteFace,
  deleteFaceActive,
  canSimplify,
  onSimplify,
  simplifyActive,
  onMirror,
  onRotationPivot,
  rotationPivotActive,
  onArray,
  arrayActive,
  onScalePercent,
  onCarryOntoFace,
  scalePercentActive,
  onSplit,
  onPaste,
  onRedo,
  onSnap,
  onShowHidden,
  onToggleHidden,
  onUngroup,
  onUndo,
  onTopPanel,
  onAddShape,
  onShortcuts,
  onInteractiveHelp,
  interactiveHelpActive,
  onGuide,
  noteMode,
  notesVisible,
  noteCount,
  onNoteTool,
  onToggleNotes,
  overhangsVisible,
  overhangAngle,
  onToggleOverhangs,
  renderMyShapes,
  objects,
  onSelectObject,
}: {
  toolbarMode: ToolbarMode;
  projectName: string;
  onProjectNameChange?: (name: string) => void;
  onToolbarModeChange: (mode: ToolbarMode) => void;
  outlinerOpen: boolean;
  onToggleOutliner: () => void;
  alignMode: boolean;
  canAlign: boolean;
  /** Something is selected and none of it is locked: the Modify and Arrange tools may act on it. */
  canModifySelection: boolean;
  canEdgeModify: boolean;
  edgeModifierKind: CadModifierKind | null;
  canGroup: boolean;
  canIntersect: boolean;
  canRedo: boolean;
  canUngroup: boolean;
  canUndo: boolean;
  canHistoryView: boolean;
  historyViewActive: boolean;
  onHistoryView: () => void;
  hasClipboard: boolean;
  hasSelection: boolean;
  hiddenShapeCount: number;
  selectionHidden: boolean;
  mirrorMode: boolean;
  canSplit: boolean;
  splitMode: boolean;
  sketchActive: boolean;
  sketchOperation: SketchOperation;
  sketchTool: SketchTool;
  sketchCanUndo: boolean;
  sketchCanRedo: boolean;
  sketchHasSelection: boolean;
  sketchHasClipboard: boolean;
  canEditSketch: boolean;
  canFilletSketchPoint?: boolean;
  sketchCornerDialog?: "fillet" | "chamfer" | null;
  onSketchCornerDialog?: (dialog: "fillet" | "chamfer" | null) => void;
  sketchConstruction?: boolean;
  onSketchConstruction?: () => void;
  sketchFromMiddle?: boolean;
  onSketchFromMiddle?: () => void;
  sketchStrokeActive?: boolean;
  onSketchStroke?: () => void;
  onStartSketch: (operation: SketchOperation) => void;
  onEditSketch: () => void;
  onSketchTool: (tool: SketchTool) => void;
  onSketchPrimitive: (primitive: SketchPrimitive) => void;
  sketchShapeOptions: SketchShapeOptions;
  onSketchShapeOptions: (options: SketchShapeOptions) => void;
  onSketchImage: () => void;
  onSketchCopy: () => void;
  onSketchPaste: () => void;
  onSketchDuplicate: () => void;
  onSketchDelete: () => void;
  onSketchUndo: () => void;
  onSketchRedo: () => void;
  onSketchFinish: () => void;
  onSketchCancel: () => void;
  onHome?: () => void;
  onAlign: () => void;
  onChamfer: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onCenterOnWorkplane: () => void;
  onDropToWorkplane: () => void;
  onLayFlat: () => void;
  layFlatActive: boolean;
  onMateFaces: () => void;
  mateFacesActive: boolean;
  onHolePattern: () => void;
  holePatternActive: boolean;
  canHolePattern: boolean;
  onFaceTool: () => void;
  faceToolActive: boolean;
  canFaceTool: boolean;
  onGroup: () => void;
  onBundle: () => void;
  onIntersect: () => void;
  onIntersectPreview: () => void;
  intersectPreviewActive: boolean;
  onFillet: () => void;
  onHollow: () => void;
  hollowActive: boolean;
  onDeleteFace: () => void;
  deleteFaceActive: boolean;
  canSimplify: boolean;
  onSimplify: () => void;
  simplifyActive: boolean;
  onMirror: () => void;
  onRotationPivot: () => void;
  rotationPivotActive: boolean;
  onArray: () => void;
  arrayActive: boolean;
  onScalePercent: () => void;
  onCarryOntoFace: () => void;
  scalePercentActive: boolean;
  onSplit: () => void;
  onPaste: () => void;
  onRedo: () => void;
  onSnap: () => void;
  onShowHidden: () => void;
  onToggleHidden: () => void;
  onUngroup: () => void;
  onUndo: () => void;
  onTopPanel: (panel: TopPanel) => void;
  onAddShape: (shape: ShapeAsset) => void;
  onShortcuts: () => void;
  onInteractiveHelp: () => void;
  interactiveHelpActive: boolean;
  onGuide: () => void;
  noteMode: boolean;
  notesVisible: boolean;
  noteCount: number;
  onNoteTool: () => void;
  onToggleNotes: () => void;
  overhangsVisible: boolean;
  overhangAngle: number;
  onToggleOverhangs: () => void;
  /** Custom shapes above the library; gets the way to close the menu. */
  renderMyShapes?: (close: () => void) => ReactNode;
  /** The bodies of the design, so the command search can find them by name. */
  objects: ReadonlyArray<{ id: string; name: string; kind: string; hidden: boolean }>;
  onSelectObject: (id: string) => void;
}) {
  const [shapesOpen, setShapesOpen] = useState(false);
  // The Shapes panel kept open while shapes are placed one after the other (#433); remembered in this browser.
  const [geometryShapesPinned, setGeometryShapesPinned] = useState(false);
  // The sketch's panel has its own pin, its own place and its own size (#577).
  const [sketchShapesPinned, setSketchShapesPinned] = useState(false);
  const shapesPinned = toolbarMode === "sketch" ? sketchShapesPinned : geometryShapesPinned;
  const shapesPinnedRef = useRef(false);
  shapesPinnedRef.current = shapesPinned;
  useEffect(() => {
    try {
      const pinned = window.localStorage.getItem("layerling.editor.shapeMenuPinned") === "true";
      setGeometryShapesPinned(pinned);
      setSketchShapesPinned(window.localStorage.getItem("layerling.sketch.shapeMenuPinned") === "true");
      // A pinned panel is there again at the next start, not only its pin (forum, prmod3d).
      if (pinned) setShapesOpen(true);
    } catch {
      // Blocked storage: the panel closes after each shape, as it always did.
    }
  }, []);
  const toggleShapesPinned = () => {
    const next = !shapesPinnedRef.current;
    const sketch = toolbarMode === "sketch";
    (sketch ? setSketchShapesPinned : setGeometryShapesPinned)(next);
    try {
      window.localStorage.setItem(sketch ? "layerling.sketch.shapeMenuPinned" : "layerling.editor.shapeMenuPinned", String(next));
    } catch {
      // The pin still works for this visit.
    }
  };
  /** Picking a shape closes the panel, unless it is pinned open. */
  const closeShapesAfterPick = () => {
    if (!shapesPinnedRef.current) setShapesOpen(false);
  };
  // On a narrow window the tools wrap onto more rows. Their real height goes
  // into --editor-toolbar-height, which the workplane, the status and the menus
  // below the bar are placed by.
  const toolbarContentRef = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    const content = toolbarContentRef.current;
    if (!content || typeof ResizeObserver === "undefined") return;
    const root = document.documentElement;
    const apply = () => {
      const styles = getComputedStyle(root);
      const title = parseFloat(styles.getPropertyValue("--editor-toolbar-title-height")) || 44;
      const minimum = parseFloat(styles.getPropertyValue("--editor-toolbar-tools-height")) || 76;
      const tools = content.offsetHeight;
      // A hidden editor measures nothing; it keeps the one-row height.
      root.style.setProperty("--editor-toolbar-height", `${Math.round(title + Math.max(minimum, tools))}px`);
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(content);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--editor-toolbar-height");
    };
  }, []);
  const [visibilityOpen, setVisibilityOpen] = useState(false);
  const [visibilityMenuPosition, setVisibilityMenuPosition] = useState({ top: 0, left: 0 });
  const shapesMenuRef = useRef<HTMLDivElement>(null);
  const visibilityMenuRef = useRef<HTMLDivElement>(null);
  const touchShapeStartRef = useRef<{ id: string; x: number; y: number } | null>(null);
  const suppressNextShapeClickRef = useRef(false);
  const cancelProjectNameEditRef = useRef(false);
  const projectNameFieldRef = useRef<HTMLLabelElement>(null);
  const projectNameInputRef = useRef<HTMLInputElement>(null);
  const [projectNameDraft, setProjectNameDraft] = useState(projectName);
  useEffect(() => {
    setProjectNameDraft(projectName);
  }, [projectName]);
  useEffect(() => {
    const finishProjectNameEdit = (event: PointerEvent) => {
      const input = projectNameInputRef.current;
      if (input && document.activeElement === input && !projectNameFieldRef.current?.contains(event.target as Node)) {
        input.blur();
      }
    };
    document.addEventListener("pointerdown", finishProjectNameEdit, true);
    return () => document.removeEventListener("pointerdown", finishProjectNameEdit, true);
  }, []);
  const commitProjectName = (value: string) => {
    const nextName = value.trim().slice(0, 80);
    if (!nextName) {
      setProjectNameDraft(projectName);
      return;
    }
    setProjectNameDraft(nextName);
    if (nextName !== projectName) onProjectNameChange?.(nextName);
  };
  const selectToolbarMode = (mode: "geometry" | "sketch") => {
    setShapesOpen(false);
    setVisibilityOpen(false);
    onTopPanel(null);
    onToolbarModeChange(mode);
  };
  const addShapeFromMenu = (shape: ShapeAsset) => {
    onAddShape({ ...shape, name: shapeAssetLabel(shape) });
    closeShapesAfterPick();
  };
  const addSketchShapeFromMenu = (primitive: SketchPrimitive) => {
    onSketchPrimitive(primitive);
    closeShapesAfterPick();
  };
  const startSketch = (operation: SketchOperation) => {
    onStartSketch(operation);
  };
  useEffect(() => {
    if (!historyViewActive) return;
    setShapesOpen(false);
    setVisibilityOpen(false);
  }, [historyViewActive]);
  const simpleMode = useSimpleMode();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const openPalette = () => {
    // The command search lists everything, also what the simple mode keeps away (#695).
    if (simpleMode) return;
    setShapesOpen(false);
    setVisibilityOpen(false);
    setPaletteOpen(true);
  };
  const openPaletteRef = useRef(openPalette);
  openPaletteRef.current = openPalette;
  useEffect(() => {
    // Ctrl/Cmd+K opens the command search from anywhere in the editor, also
    // while a field has the focus - the browsers' own use of the key (a search
    // bar) is not worth keeping here.
    const openOnShortcut = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.shiftKey || event.altKey || event.key.toLowerCase() !== "k") return;
      event.preventDefault();
      openPaletteRef.current();
    };
    window.addEventListener("keydown", openOnShortcut);
    return () => window.removeEventListener("keydown", openOnShortcut);
  }, []);
  // Leaving the sketch closes the sketch's shape palette; at the start there is nothing to close (a pinned panel opens then).
  const sketchWasActiveRef = useRef(sketchActive);
  useEffect(() => {
    if (sketchWasActiveRef.current && !sketchActive) setShapesOpen(false);
    sketchWasActiveRef.current = sketchActive;
  }, [sketchActive]);
  useEffect(() => {
    if (!shapesOpen) return;
    // Pinned open, a click elsewhere is the click that puts the shape, and Esc cancels the placing: neither closes the panel.
    const closeOnPointerDown = (event: PointerEvent) => {
      if (!shapesPinnedRef.current && !shapesMenuRef.current?.contains(event.target as Node)) setShapesOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !shapesPinnedRef.current) setShapesOpen(false);
    };
    window.addEventListener("pointerdown", closeOnPointerDown);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("pointerdown", closeOnPointerDown);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [shapesOpen]);
  useEffect(() => {
    if (!visibilityOpen) return;
    const closeOnPointerDown = (event: PointerEvent) => {
      if (!visibilityMenuRef.current?.contains(event.target as Node)) setVisibilityOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setVisibilityOpen(false);
    };
    const closeOnViewportChange = () => setVisibilityOpen(false);
    window.addEventListener("pointerdown", closeOnPointerDown);
    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", closeOnViewportChange);
    window.addEventListener("scroll", closeOnViewportChange, true);
    return () => {
      window.removeEventListener("pointerdown", closeOnPointerDown);
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", closeOnViewportChange);
      window.removeEventListener("scroll", closeOnViewportChange, true);
    };
  }, [visibilityOpen]);
  const toggleVisibilityMenu = () => {
    if (visibilityOpen) {
      setVisibilityOpen(false);
      return;
    }
    const triggerBounds = visibilityMenuRef.current?.getBoundingClientRect();
    if (triggerBounds) {
      const viewportGutter = 12;
      const menuWidth = Math.min(276, Math.max(0, window.innerWidth - viewportGutter * 2));
      setVisibilityMenuPosition({
        top: triggerBounds.bottom + 8,
        left: Math.max(
          viewportGutter,
          Math.min(
            triggerBounds.left + triggerBounds.width / 2 - menuWidth / 2,
            window.innerWidth - menuWidth - viewportGutter,
          ),
        ),
      });
    }
    setShapesOpen(false);
    onTopPanel(null);
    setVisibilityOpen(true);
  };
  // Die Leiste haengt an der Sprache: ohne dieses Abonnement bliebe sie stehen,
  // falls sie spaeter einmal memoisiert wird.
  useLanguage();
  // The simple mode (#695) shows the tools of a workshop only; the others stay in the lists the command search and the keys read.
  const inSimpleMode = <T extends { id: string }>(tools: T[]) => (simpleMode ? tools.filter((tool) => simpleModeKeepsTool(tool.id)) : tools);
  const shownShapeAssets = simpleMode ? libraryShapeAssets.filter((shape) => simpleModeKeepsShape(shape.id)) : libraryShapeAssets;
  const leftTools = [
    { id: "copy", label: t("editor.tool.copy"), icon: ToolbarCopyIcon, action: onCopy, enabled: hasSelection },
    { id: "paste", label: t("editor.tool.paste"), icon: ToolbarPasteIcon, action: onPaste, enabled: hasClipboard },
    { id: "duplicate", label: t("editor.tool.duplicate"), icon: ToolbarDuplicateIcon, action: onDuplicate, enabled: hasSelection },
    { id: "delete", label: t("editor.tool.delete"), icon: ToolbarTrashIcon, action: onDelete, enabled: canModifySelection },
    { id: "undo", label: t("editor.tool.undo"), icon: ToolbarUndoIcon, action: onUndo, enabled: canUndo },
    { id: "redo", label: t("editor.tool.redo"), icon: ToolbarRedoIcon, action: onRedo, enabled: canRedo },
    { id: "history", label: t("editor.tool.history"), icon: ToolbarHistoryIcon, action: onHistoryView, enabled: canHistoryView, active: historyViewActive },
  ];
  const visibilityTools = [
    {
      id: "outliner",
      label: outlinerOpen ? t("editor.tool.hideOutliner") : t("editor.tool.showOutliner"),
      icon: ListTree,
      action: () => {
        setVisibilityOpen(false);
        onToggleOutliner();
      },
      enabled: true,
      active: outlinerOpen,
    },
    {
      id: "toggle-hidden",
      label: selectionHidden ? t("editor.tool.showSelected") : t("editor.tool.hideSelected"),
      icon: ToolbarHideSelectedIcon,
      action: () => {
        setVisibilityOpen(false);
        onToggleHidden();
      },
      enabled: hasSelection,
    },
  ];
  const combineTools = [
    { id: "group", label: t("editor.tool.group"), icon: ToolbarGroupIcon, action: onGroup, enabled: canGroup },
    { id: "bundle", label: t("editor.tool.bundle"), icon: ToolbarBundleIcon, action: onBundle, enabled: canGroup },
    { id: "ungroup", label: t("editor.tool.ungroup"), icon: ToolbarUngroupIcon, action: onUngroup, enabled: canUngroup },
    { id: "intersect", label: t("editor.tool.intersect"), icon: ToolbarIntersectionIcon, action: onIntersect, enabled: canIntersect || intersectPreviewActive },
    { id: "intersect-preview", label: t("editor.tool.intersectPreview"), icon: ToolbarIntersectPreviewIcon, action: onIntersectPreview, enabled: canIntersect || intersectPreviewActive, active: intersectPreviewActive },
  ];
  const modifyTools = [
    { id: "mirror", label: t("editor.tool.mirror"), icon: ToolbarMirrorIcon, action: onMirror, enabled: canModifySelection, active: mirrorMode },
    { id: "pivot", label: t("editor.tool.rotationPivot"), icon: ToolbarRotationPivotIcon, action: onRotationPivot, enabled: canModifySelection, active: rotationPivotActive },
    { id: "array", label: t("editor.tool.array"), icon: ToolbarPatternIcon, action: onArray, enabled: canModifySelection, active: arrayActive },
    { id: "holePattern", label: t("holePattern.title"), icon: ToolbarHolePatternIcon, action: onHolePattern, enabled: canHolePattern, active: holePatternActive },
    { id: "faceTool", label: t("faceTool.title"), icon: ToolbarFaceToolIcon, action: onFaceTool, enabled: canFaceTool, active: faceToolActive },
    { id: "split", label: t("editor.tool.split"), icon: ToolbarSplitIcon, action: onSplit, enabled: splitMode || canSplit, active: splitMode },
    { id: "chamfer", label: t("editor.tool.chamfer"), icon: ToolbarChamferIcon, action: onChamfer, enabled: canEdgeModify, active: edgeModifierKind === "chamfer" || edgeModifierKind === "chamfillet" },
    { id: "fillet", label: t("editor.tool.fillet"), icon: ToolbarFilletIcon, action: onFillet, enabled: canEdgeModify, active: edgeModifierKind === "fillet" },
    { id: "hollow", label: t("editor.tool.hollow"), icon: ToolbarHollowIcon, action: onHollow, enabled: canEdgeModify, active: hollowActive },
    { id: "deleteFace", label: t("editor.tool.deleteFace"), icon: ToolbarDeleteFaceIcon, action: onDeleteFace, enabled: canEdgeModify, active: deleteFaceActive },
    { id: "simplify", label: t("editor.tool.simplify"), icon: ToolbarSimplifyIcon, action: onSimplify, enabled: canSimplify, active: simplifyActive },
  ];
  const arrangeTools = [
    { id: "align", label: t("editor.tool.align"), icon: ToolbarAlignIcon, action: onAlign, enabled: canAlign, active: alignMode },
    { id: "snap", label: t("editor.tool.snapToGrid"), icon: ToolbarSnapGridIcon, action: onSnap, enabled: canModifySelection },
    { id: "drop", label: t("editor.tool.dropToWorkplane"), icon: ToolbarDropToWorkplaneIcon, action: onDropToWorkplane, enabled: canModifySelection },
    { id: "layFlat", label: t("editor.tool.layFlat"), icon: ToolbarLayFlatIcon, action: onLayFlat, enabled: canModifySelection, active: layFlatActive },
    { id: "mateFaces", label: t("editor.tool.mateFaces"), icon: ToolbarMateFacesIcon, action: onMateFaces, enabled: canModifySelection, active: mateFacesActive },
    { id: "center", label: t("editor.tool.centerOnWorkplane"), icon: ToolbarCenterOnWorkplaneIcon, action: onCenterOnWorkplane, enabled: canModifySelection },
  ];
  const sketchClipboardTools = [
    { id: "sketch-copy", label: t("editor.tool.copy"), icon: ToolbarCopyIcon, action: onSketchCopy, enabled: sketchHasSelection },
    { id: "sketch-paste", label: t("editor.tool.paste"), icon: ToolbarPasteIcon, action: onSketchPaste, enabled: sketchHasClipboard },
    { id: "sketch-duplicate", label: t("editor.tool.duplicate"), icon: ToolbarDuplicateIcon, action: onSketchDuplicate, enabled: sketchHasSelection },
    { id: "sketch-delete", label: t("editor.tool.delete"), icon: ToolbarTrashIcon, action: onSketchDelete, enabled: sketchHasSelection },
  ];
  const renderToolButton = (tool: (typeof leftTools)[number] | (typeof visibilityTools)[number] | (typeof combineTools)[number] | (typeof modifyTools)[number] | (typeof arrangeTools)[number]) => {
    const { id, icon: Icon, action, label } = tool;
    // Im Verlaufsblick schlaeft jedes Werkzeug ausser dem, das ihn beendet -
    // wirklich, nicht nur im Aussehen: eine Auswahl aus der Zeit davor darf
    // kein Loeschen freischalten, waehrend die Flaeche etwas anderes zeigt.
    const enabled = tool.enabled && (!historyViewActive || id === "history");
    const active = "active" in tool && Boolean(tool.active);
    return (
      <button
        className={`toolbar-icon ${enabled ? "" : "disabled"} ${active ? "active" : ""}`}
        key={id}
        data-layerling-tool={id}
        aria-label={label}
        title={COMMAND_SHORTCUTS[id] ? `${label} (${COMMAND_SHORTCUTS[id]})` : label}
        onClick={action}
        disabled={!enabled}
      >
        <Icon />
      </button>
    );
  };

  // Everything the toolbar and its menus can do, as entries of the command
  // search. Built from the same lists as the buttons, so a new tool shows up in
  // both without a second place to remember; only built while the search is open.
  const buildPaletteCommands = (): PaletteCommand[] => buildAllPaletteCommands().map((command) =>
    historyViewActive && !HISTORY_VIEW_COMMANDS.has(command.id) ? { ...command, enabled: false } : command,
  );
  const buildAllPaletteCommands = (): PaletteCommand[] => {
    const fromTool = (
      tool: { id: string; label: string; icon: PaletteCommand["icon"]; action: () => void; enabled: boolean; active?: boolean },
      group: string,
    ): PaletteCommand => ({
      id: tool.id,
      label: tool.label,
      group,
      keywords: COMMAND_KEYWORDS[tool.id],
      shortcut: COMMAND_SHORTCUTS[tool.id],
      icon: tool.icon,
      enabled: tool.enabled,
      active: tool.active,
      run: () => tool.action(),
    });
    const plain = (
      id: string,
      label: string,
      group: string,
      enabled: boolean,
      run: () => void,
      extra: Partial<PaletteCommand> = {},
    ): PaletteCommand => ({ id, label, group, keywords: COMMAND_KEYWORDS[id], shortcut: COMMAND_SHORTCUTS[id], enabled, run, ...extra });
    const helpGroup = t("editor.group.help");
    const helpCommands = [
      plain("guide", t("editor.guide"), helpGroup, true, onGuide, { icon: ToolbarGuideIcon }),
      plain("shortcuts", t("editor.keyboardShortcuts"), helpGroup, true, onShortcuts, { icon: ToolbarKeyboardIcon }),
      plain("interactive-help", t("interactiveHelp.title"), helpGroup, true, onInteractiveHelp, { icon: CircleHelp, active: interactiveHelpActive }),
    ];
    if (toolbarMode === "sketch") {
      const modeGroup = t("palette.group.mode");
      const modeCommand = plain("mode-geometry", t("palette.switchGeometry"), modeGroup, true, () => selectToolbarMode("geometry"));
      if (!sketchActive) {
        const createGroup = t("sketch.group.create");
        return [
          plain("sketch-extrude", t("sketch.extrude"), createGroup, true, () => startSketch("extrude")),
          plain("sketch-revolve", t("sketch.revolve"), createGroup, true, () => startSketch("revolve")),
          plain("sketch-sweep", t("sketch.sweep"), createGroup, true, () => startSketch("sweep")),
          plain("sketch-edit", t("sketch.editTo3d"), createGroup, canEditSketch, onEditSketch),
          modeCommand,
          ...helpCommands,
        ];
      }
      const drawGroup = t("sketch.group.draw");
      const selectGroup = t("sketch.group.select");
      const finishGroup = t("sketch.group.finish");
      return [
        plain("sketch-line", t("sketch.line"), drawGroup, true, () => onSketchTool("line"), { icon: SKETCH_PALETTE_ICONS.line, active: sketchTool === "line" }),
        plain("sketch-arc", t("sketch.arc"), drawGroup, true, () => onSketchTool("arc"), { icon: SKETCH_PALETTE_ICONS.arc, active: sketchTool === "arc" }),
        plain("sketch-bezier", t("sketch.bezier"), drawGroup, true, () => onSketchTool("bezier"), { icon: SKETCH_PALETTE_ICONS.bezier, active: sketchTool === "bezier" }),
        plain("sketch-smooth", t("sketch.smooth"), drawGroup, true, () => onSketchTool("smooth"), { icon: SKETCH_PALETTE_ICONS.smooth, active: sketchTool === "smooth" }),
        plain("sketch-construction", t("sketch.construction"), drawGroup, true, () => onSketchConstruction?.(), { icon: ToolbarConstructionLineIcon, active: Boolean(sketchConstruction), keywords: ["construction", "guide", "helper", "hilfslinie", "hilfs", "konstruktion"] }),
        plain("sketch-from-middle", t("sketch.fromMiddle"), drawGroup, true, () => onSketchFromMiddle?.(), { icon: ToolbarMiddleLineIcon, active: Boolean(sketchFromMiddle), keywords: ["middle", "center", "centre", "mitte", "mittellinie", "symmetric", "symmetrisch"] }),
        ...sketchShapeMenuItems.map(({ primitive, label, icon }) => plain(
          `sketch-shape-${primitive}`,
          t("palette.addShape", { shape: t(label) }),
          t("sketch.group.shapes"),
          true,
          () => onSketchPrimitive(primitive),
          { icon, keywords: [primitive] },
        )),
        plain("sketch-select", t("sketch.select"), selectGroup, true, () => onSketchTool("select"), { icon: SKETCH_PALETTE_ICONS.select, active: sketchTool === "select" }),
        plain("sketch-image", t("sketch.addImage"), selectGroup, sketchTool === "select", onSketchImage, { icon: SKETCH_PALETTE_ICONS.image }),
        plain("sketch-refine", t("sketch.refine"), selectGroup, true, () => onSketchTool("refine"), { icon: SKETCH_PALETTE_ICONS.refine, active: sketchTool === "refine" }),
        plain("sketch-chamfer", t("sketch.chamferCorner"), selectGroup, Boolean(canFilletSketchPoint), () => onSketchCornerDialog?.(sketchCornerDialog === "chamfer" ? null : "chamfer"), { icon: ToolbarChamferIcon, active: sketchCornerDialog === "chamfer" }),
        plain("sketch-fillet", t("sketch.filletCorner"), selectGroup, Boolean(canFilletSketchPoint), () => onSketchCornerDialog?.(sketchCornerDialog === "fillet" ? null : "fillet"), { icon: ToolbarFilletIcon, active: sketchCornerDialog === "fillet" }),
        plain("sketch-erase", t("sketch.erase"), selectGroup, true, () => onSketchTool("erase"), { icon: SKETCH_PALETTE_ICONS.erase, active: sketchTool === "erase" }),
        ...sketchClipboardTools.map((tool) => fromTool(tool, t("editor.group.clipboard"))),
        plain("sketch-undo", t("editor.tool.undo"), t("editor.group.history"), sketchCanUndo, onSketchUndo, { icon: ToolbarUndoIcon }),
        plain("sketch-redo", t("editor.tool.redo"), t("editor.group.history"), sketchCanRedo, onSketchRedo, { icon: ToolbarRedoIcon }),
        plain("sketch-stroke", t("sketch.strokeHint"), finishGroup, true, () => onSketchStroke?.(), { icon: SKETCH_PALETTE_ICONS.line, active: Boolean(sketchStrokeActive) }),
        plain("sketch-finish", sketchOperation === "revolve" ? t("sketch.finishRevolve") : sketchOperation === "sweep" ? t("sketch.finishSweep") : t("sketch.finishSketch"), finishGroup, true, onSketchFinish),
        plain("sketch-cancel", t("sketch.cancel"), finishGroup, true, onSketchCancel),
        modeCommand,
        ...helpCommands,
      ];
    }
    const shapesGroup = t("editor.group.shapes");
    const visibilityGroup = t("editor.group.visibility");
    const manageGroup = t("editor.group.manage");
    return [
      ...leftTools.slice(0, 4).map((tool) => fromTool(tool, t("editor.group.clipboard"))),
      ...leftTools.slice(4).map((tool) => fromTool(tool, t("editor.group.history"))),
      ...libraryShapeAssets.map((shape) => plain(
        `shape-${shape.id}`,
        t("palette.addShape", { shape: shapeAssetMenuLabel(shape) }),
        shapesGroup,
        true,
        () => addShapeFromMenu(shape),
        { image: shape.menuIcon, keywords: [shape.id, shape.name, ...(SHAPE_KEYWORDS[shape.id] ?? [])] },
      )),
      ...visibilityTools.map((tool) => fromTool(tool, visibilityGroup)),
      plain(
        "show-hidden",
        hiddenShapeCount === 0 ? t("visibility.nothingHidden") : t("visibility.showAllHidden", { count: hiddenShapeCount }),
        visibilityGroup,
        hiddenShapeCount > 0,
        onShowHidden,
        { icon: Eye },
      ),
      plain("notes", t("visibility.notes"), visibilityGroup, noteCount > 0, onToggleNotes, { icon: notesVisible ? Eye : EyeOff, active: notesVisible }),
      plain("overhangs", t("visibility.overhangs", { angle: overhangAngle }), visibilityGroup, true, onToggleOverhangs, { icon: AlertTriangle, active: overhangsVisible }),
      ...combineTools.map((tool) => fromTool(tool, t("editor.group.combine"))),
      ...modifyTools.map((tool) => fromTool(tool, t("editor.group.modify"))),
      plain("carry", t("contextMenu.carry"), t("editor.group.arrange"), canModifySelection, onCarryOntoFace, { icon: ArrowDownToLine }),
      plain("scalePercent", t("scalePercent.title"), t("editor.group.modify"), canModifySelection, onScalePercent, { icon: Percent, active: scalePercentActive }),
      ...arrangeTools.map((tool) => fromTool(tool, t("editor.group.arrange"))),
      plain("note", t("editor.tool.note"), manageGroup, true, onNoteTool, { icon: ToolbarNoteIcon, active: noteMode }),
      plain("import", t("editor.import"), manageGroup, true, () => onTopPanel("import"), { icon: ToolbarImportIcon }),
      plain("export", t("editor.export"), manageGroup, true, () => onTopPanel("export"), { icon: ToolbarVectorExportIcon }),
      plain("settings", t("editor.workspaceSettings"), manageGroup, true, () => window.dispatchEvent(new Event("layerling:open-workspace-settings")), { icon: ToolbarSettingsIcon }),
      plain("mode-sketch", t("palette.switchSketch"), t("palette.group.mode"), true, () => selectToolbarMode("sketch")),
      ...helpCommands,
      ...objects.map((object) => plain(
        `object-${object.id}`,
        t("palette.selectObject", { name: object.name }),
        t("palette.group.objects"),
        true,
        () => onSelectObject(object.id),
        { keywords: [object.name, object.kind, ...(object.hidden ? ["hidden", "ausgeblendet", "versteckt"] : [])], searchOnly: true, transient: true },
      )),
    ];
  };

  return (
    <div className="secondary-toolbar">
      {paletteOpen ? <CommandPalette commands={buildPaletteCommands()} onClose={() => setPaletteOpen(false)} /> : null}
      <div ref={toolbarContentRef} className={`toolbar-mode-content ${toolbarMode}`}>
        {toolbarMode === "geometry" ? (
          <>
      {onHome ? (
        <div className="tool-group editor-nav-group">
          <div className="toolbar-section toolbar-home-section" data-group="home">
            <div className="toolbar-section-label">{t("editor.group.home")}</div>
            <div className="toolbar-section-tools">
              <button className="toolbar-icon editor-home-control" aria-label={t("editor.homeDashboard")} title={t("editor.homeDashboard")} onClick={onHome}>
                <ToolbarHomeIcon />
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <div className="tool-group left">
        <div className="toolbar-section" data-group="clipboard" inert={historyViewActive}>
          <div className="toolbar-section-label">{t("editor.group.clipboard")}</div>
          <div className="toolbar-section-tools">{leftTools.slice(0, 4).map(renderToolButton)}</div>
        </div>
        <div className="toolbar-section" data-group="history">
          <div className="toolbar-section-label">{t("editor.group.history")}</div>
          <div className="toolbar-section-tools">{inSimpleMode(leftTools.slice(4)).map(renderToolButton)}</div>
        </div>
        <div className="toolbar-section toolbar-shapes-section" data-group="shapes" ref={shapesMenuRef} inert={historyViewActive}>
          <div className="toolbar-section-label">{t("editor.group.shapes")}</div>
          <div className="toolbar-section-tools">
            <button
              className={`shape-menu-trigger ${shapesOpen ? "active" : ""}`}
              aria-label={t("editor.addShape")}
              aria-expanded={shapesOpen}
              onClick={() => {
                setVisibilityOpen(false);
                setShapesOpen((value) => !value);
              }}
            >
              <ToolbarShapeAddIcon />
            </button>
          </div>
          {shapesOpen ? (
            <ShapeMenuPanel
              title={t("shape.basicShapes")}
              helpSection="addShape"
              pinned={shapesPinned}
              onTogglePinned={toggleShapesPinned}
              resizable
            >
              <div className="shape-menu-body">
              {renderMyShapes && !simpleMode ? (
                <>
                  {renderMyShapes(closeShapesAfterPick)}
                  <div className="shape-menu-subtitle">{t("myShapes.basicShapes")}</div>
                </>
              ) : null}
              <div className="shape-menu-list">
                {shownShapeAssets.map((shape) => (
                  <button
                    className="shape-menu-item"
                    key={shape.id}
                    type="button"
                    title={shapeAssetMenuLabel(shape).replace(/\s+/g, " ")}
                    aria-label={shapeAssetMenuLabel(shape).replace(/\s+/g, " ")}
                    draggable
                    onClick={() => {
                      if (suppressNextShapeClickRef.current) {
                        suppressNextShapeClickRef.current = false;
                        return;
                      }
                      addShapeFromMenu(shape);
                    }}
                    onPointerDown={(event) => {
                      if (event.pointerType === "touch") {
                        touchShapeStartRef.current = { id: shape.id, x: event.clientX, y: event.clientY };
                      }
                    }}
                    onPointerUp={(event) => {
                      if (event.pointerType !== "touch") {
                        return;
                      }
                      const start = touchShapeStartRef.current;
                      touchShapeStartRef.current = null;
                      if (!start || start.id !== shape.id || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8) {
                        return;
                      }
                      event.preventDefault();
                      suppressNextShapeClickRef.current = true;
                      window.setTimeout(() => {
                        suppressNextShapeClickRef.current = false;
                      }, 350);
                      addShapeFromMenu(shape);
                    }}
                    onTouchStart={(event) => {
                      const touch = event.changedTouches[0];
                      if (touch) {
                        touchShapeStartRef.current = { id: shape.id, x: touch.clientX, y: touch.clientY };
                      }
                    }}
                    onTouchEnd={(event) => {
                      const touch = event.changedTouches[0];
                      const start = touchShapeStartRef.current;
                      touchShapeStartRef.current = null;
                      if (!touch || !start || start.id !== shape.id || Math.hypot(touch.clientX - start.x, touch.clientY - start.y) > 8) {
                        return;
                      }
                      event.preventDefault();
                      suppressNextShapeClickRef.current = true;
                      window.setTimeout(() => {
                        suppressNextShapeClickRef.current = false;
                      }, 350);
                      addShapeFromMenu(shape);
                    }}
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = "copy";
                      event.dataTransfer.setData("application/x-layerling-shape", JSON.stringify(shape));
                    }}
                    onDragEnd={closeShapesAfterPick}
                  >
                    <img src={shape.menuIcon} alt="" draggable={false} />
                    <span className={shapeAssetMenuLabel(shape).split(/\s+/).some((word) => word.length > 13) ? "long-word" : undefined}>{shapeAssetMenuLabel(shape)}</span>
                  </button>
                ))}
              </div>
              </div>
            </ShapeMenuPanel>
          ) : null}
        </div>
      </div>
      <div className="toolbar-spacer" />
      <div className="tool-group right" inert={historyViewActive}>
        {simpleMode ? null : (
        <div className="toolbar-section compact toolbar-visibility-section" data-group="visibility" ref={visibilityMenuRef}>
          <div className="toolbar-section-label">{t("editor.group.visibility")}</div>
          <div className="toolbar-section-tools">
            {visibilityTools.map(renderToolButton)}
            <span className="visibility-trigger-wrap">
              <button
                className={`toolbar-icon visibility-menu-trigger ${visibilityOpen ? "active" : ""}`}
                type="button"
                aria-label={t("editor.visibilityOptions")}
                title={t("editor.visibilityOptions")}
                aria-haspopup="menu"
                aria-expanded={visibilityOpen}
                onClick={toggleVisibilityMenu}
              >
                <ToolbarCaretDownIcon />
              </button>
              {hiddenShapeCount > 0 ? (
                // What is hidden is seen without opening the menu; a click shows it all (#489).
                <button
                  className="visibility-hidden-badge"
                  type="button"
                  aria-label={t("visibility.showAllHidden", { count: hiddenShapeCount })}
                  title={t("visibility.showAllHidden", { count: hiddenShapeCount })}
                  onClick={onShowHidden}
                >
                  {hiddenShapeCount}
                </button>
              ) : null}
            </span>
          </div>
          {visibilityOpen ? (
            <div
              className="visibility-dropdown"
              role="menu"
              aria-label={t("editor.visibilityOptions")}
              style={visibilityMenuPosition}
            >
              <button
                className="visibility-dropdown-action"
                type="button"
                role="menuitem"
                onClick={() => {
                  setVisibilityOpen(false);
                  onToggleOutliner();
                }}
              >
                <ListTree size={20} aria-hidden="true" />
                <strong>{outlinerOpen ? t("visibility.hideOutliner") : t("visibility.showOutliner")}</strong>
              </button>
              <button
                className="visibility-dropdown-action"
                type="button"
                role="menuitem"
                disabled={hiddenShapeCount === 0}
                onClick={() => {
                  setVisibilityOpen(false);
                  onShowHidden();
                }}
              >
                <Eye size={20} aria-hidden="true" />
                <strong>{hiddenShapeCount === 0
                  ? t("visibility.nothingHidden")
                  : t("visibility.showAllHidden", { count: hiddenShapeCount })}</strong>
              </button>
              <button
                className="visibility-dropdown-action"
                type="button"
                role="menuitemcheckbox"
                aria-checked={notesVisible}
                disabled={noteCount === 0}
                onClick={() => {
                  setVisibilityOpen(false);
                  onToggleNotes();
                }}
              >
                {notesVisible ? <Eye size={20} aria-hidden="true" /> : <EyeOff size={20} aria-hidden="true" />}
                <strong>{t("visibility.notes")}{noteCount > 0 ? ` (${noteCount})` : ""}</strong>
              </button>
              <button
                className="visibility-dropdown-action"
                type="button"
                role="menuitemcheckbox"
                aria-checked={overhangsVisible}
                onClick={() => {
                  setVisibilityOpen(false);
                  onToggleOverhangs();
                }}
              >
                <AlertTriangle size={20} aria-hidden="true" className={overhangsVisible ? "overhang-menu-icon active" : "overhang-menu-icon"} />
                <strong>{t("visibility.overhangs", { angle: overhangAngle })}</strong>
              </button>
              <div className="visibility-dropdown-help">
                <span>{t("visibility.eyeAgain")}</span>
                <span aria-hidden="true">·</span>
                <span><kbd>Ctrl/Cmd</kbd> + <kbd>Shift</kbd> + <kbd>H</kbd>{t("visibility.allShortcut")}</span>
                <GuideHelpLink section="selecting" iconSize={14} />
              </div>
            </div>
          ) : null}
        </div>
        )}
        <div className="toolbar-section" data-group="combine">
          <div className="toolbar-section-label">{t("editor.group.combine")}</div>
          <div className="toolbar-section-tools">{inSimpleMode(combineTools).map(renderToolButton)}</div>
        </div>
        <div className="toolbar-section" data-group="modify">
          <div className="toolbar-section-label">{t("editor.group.modify")}</div>
          <div className="toolbar-section-tools">{inSimpleMode(modifyTools).map(renderToolButton)}</div>
        </div>
        <div className="toolbar-section" data-group="arrange">
          <div className="toolbar-section-label">{t("editor.group.arrange")}</div>
          <div className="toolbar-section-tools">{inSimpleMode(arrangeTools).map(renderToolButton)}</div>
        </div>
      </div>
      <div className="toolbar-section toolbar-actions-section" data-group="manage">
        <div className="toolbar-section-label">{t("editor.group.manage")}</div>
        <div className="action-buttons">
          {simpleMode ? null : <button
            className={`action-icon-button ${noteMode ? "active" : ""}`}
            aria-label={t("editor.tool.note")}
            aria-pressed={noteMode}
            title={`${t("editor.tool.note")} (${COMMAND_SHORTCUTS.note})`}
            onClick={onNoteTool}
            disabled={historyViewActive}
          >
            <ToolbarNoteIcon />
          </button>}
          {simpleMode ? null : <button className="action-icon-button" aria-label={t("editor.import")} title={`${t("editor.import")} (${COMMAND_SHORTCUTS.import})`} onClick={() => onTopPanel("import")} disabled={historyViewActive}>
            <ToolbarImportIcon />
          </button>}
          <button className="action-icon-button" aria-label={t("editor.export")} title={`${t("editor.export")} (${COMMAND_SHORTCUTS.export})`} onClick={() => onTopPanel("export")}>
            <ToolbarVectorExportIcon />
          </button>
          <button className="action-icon-button" aria-label={t("editor.workspaceSettings")} title={t("editor.workspaceSettings")} onClick={() => window.dispatchEvent(new Event("layerling:open-workspace-settings"))}>
            <ToolbarSettingsIcon />
          </button>
        </div>
      </div>
      {simpleMode ? null : <div className="toolbar-section toolbar-actions-section" data-group="help">
        <div className="toolbar-section-label">{t("editor.group.help")}</div>
        <div className="action-buttons">
          <button className="action-icon-button" aria-label={t("palette.open")} title={t("palette.open")} aria-haspopup="dialog" data-layerling-tool="command-search" onClick={openPalette}>
            <Search className="toolbar-search-icon" aria-hidden="true" />
          </button>
          <button className="action-icon-button" aria-label={t("editor.guide")} title={t("editor.guide")} onClick={onGuide}>
            <ToolbarGuideIcon />
          </button>
          <button className="action-icon-button" aria-label={t("editor.keyboardShortcuts")} title={t("editor.keyboardShortcuts")} onClick={onShortcuts}>
            <ToolbarKeyboardIcon />
          </button>
          <button className={`action-icon-button ${interactiveHelpActive ? "active" : ""}`} type="button" aria-label={t("interactiveHelp.title")} title={`${t("interactiveHelp.title")} (${COMMAND_SHORTCUTS["interactive-help"]})`} aria-pressed={interactiveHelpActive} data-layerling-tool="interactive-help" data-help-exempt onClick={onInteractiveHelp}>
            <CircleHelp className="toolbar-search-icon" aria-hidden="true" />
          </button>
        </div>
      </div>}
          </>
        ) : (
          <div className="sketch-toolbar-ribbon" aria-label={t("sketch.toolbar")}>
            {sketchActive ? (
              <>
                <div className="toolbar-section sketch-create-section" data-group="draw">
                  <div className="toolbar-section-label">{t("sketch.group.draw")}</div>
                  <div className="toolbar-section-tools">
                    <button className={`toolbar-icon sketch-tool-icon ${sketchTool === "line" ? "active" : ""}`} type="button" aria-label={t("sketch.line")} title={t("sketch.line")} onClick={() => onSketchTool("line")}>
                      <SketchReferenceIcon name="line" />
                    </button>
                    <button className={`toolbar-icon sketch-tool-icon ${sketchTool === "arc" ? "active" : ""}`} type="button" aria-label={t("sketch.arc")} title={t("status.sketchTool.arc")} onClick={() => onSketchTool("arc")}>
                      <SketchReferenceIcon name="arc" />
                    </button>
                    <button className={`toolbar-icon sketch-tool-icon ${sketchTool === "bezier" ? "active" : ""}`} type="button" aria-label={t("sketch.bezier")} title={t("sketch.bezier")} onClick={() => onSketchTool("bezier")}>
                      <SketchReferenceIcon name="bezier" />
                    </button>
                    <button className={`toolbar-icon sketch-tool-icon ${sketchTool === "smooth" ? "active" : ""}`} type="button" aria-label={t("sketch.smooth")} title={t("sketch.smooth")} onClick={() => onSketchTool("smooth")}>
                      <SketchReferenceIcon name="smooth" />
                    </button>
                    <button className={`toolbar-icon sketch-tool-icon sketch-construction-toggle ${sketchConstruction ? "active" : ""}`} type="button" aria-pressed={Boolean(sketchConstruction)} aria-label={t("sketch.construction")} title={t("sketch.constructionHint")} onClick={onSketchConstruction}>
                      <ToolbarConstructionLineIcon />
                    </button>
                    <button className={`toolbar-icon sketch-tool-icon sketch-from-middle-toggle ${sketchFromMiddle ? "active" : ""}`} type="button" aria-pressed={Boolean(sketchFromMiddle)} aria-label={t("sketch.fromMiddle")} title={t("sketch.fromMiddleHint")} onClick={onSketchFromMiddle}>
                      <ToolbarMiddleLineIcon />
                    </button>
                  </div>
                </div>
                <div className="toolbar-section toolbar-shapes-section sketch-shapes-section" data-group="shapes" ref={shapesMenuRef}>
                  <div className="toolbar-section-label">{t("sketch.group.shapes")}</div>
                  <div className="toolbar-section-tools">
                    <button
                      className={`shape-menu-trigger ${shapesOpen ? "active" : ""}`}
                      type="button"
                      aria-label={t("sketch.addShape")}
                      aria-haspopup="menu"
                      aria-expanded={shapesOpen}
                      onClick={() => {
                        setVisibilityOpen(false);
                        setShapesOpen((open) => !open);
                      }}
                    >
                      <ToolbarShapeAddIcon />
                    </button>
                  </div>
                  {shapesOpen ? (
                    <ShapeMenuPanel
                      className="sketch-shape-menu-dropdown"
                      role="menu"
                      ariaLabel={t("sketch.shapesMenu")}
                      title={t("sketch.shapesTitle")}
                      helpSection="sketchDrawing"
                      pinned={shapesPinned}
                      onTogglePinned={toggleShapesPinned}
                      scope="sketch"
                      resizable
                    >
                      <div className="shape-menu-list">
                        {sketchShapeMenuItems.map(({ primitive, label, icon: Icon }) => (
                          <button
                            className="shape-menu-item sketch-primitive-source"
                            key={primitive}
                            type="button"
                            role="menuitem"
                            draggable
                            title={t("sketch.addPrimitiveHint", { shape: t(label) })}
                            onClick={() => addSketchShapeFromMenu(primitive)}
                            onDragStart={(event) => {
                              event.dataTransfer.effectAllowed = "copy";
                              event.dataTransfer.setData("application/x-layerling-sketch-primitive", primitive);
                            }}
                            onDragEnd={closeShapesAfterPick}
                          >
                            <Icon className="sketch-shape-menu-icon" aria-hidden="true" />
                            <span>{t(label)}</span>
                          </button>
                        ))}
                      </div>
                      <div className="sketch-shape-options">
                        <SketchShapeNumberField
                          label={t("sketch.polygonSides")}
                          value={sketchShapeOptions.sides}
                          min={SKETCH_POLYGON_MIN_SIDES}
                          max={SKETCH_POLYGON_MAX_SIDES}
                          normalize={normalizePolygonSides}
                          onChange={(sides) => onSketchShapeOptions({ ...sketchShapeOptions, sides })}
                        />
                        <SketchShapeNumberField
                          label={t("sketch.starInner")}
                          value={sketchShapeOptions.innerPercent}
                          min={SKETCH_STAR_MIN_INNER_PERCENT}
                          max={SKETCH_STAR_MAX_INNER_PERCENT}
                          suffix="%"
                          normalize={normalizeStarInnerPercent}
                          onChange={(innerPercent) => onSketchShapeOptions({ ...sketchShapeOptions, innerPercent })}
                        />
                      </div>
                    </ShapeMenuPanel>
                  ) : null}
                </div>
                <div className="toolbar-section sketch-edit-section" data-group="select">
                  <div className="toolbar-section-label">{t("sketch.group.select")}</div>
                  <div className="toolbar-section-tools">
                    <button className={`toolbar-icon sketch-tool-icon ${sketchTool === "select" ? "active" : ""}`} type="button" aria-label={t("sketch.select")} title={t("sketch.select")} onClick={() => onSketchTool("select")}>
                      <SketchReferenceIcon name="select" />
                    </button>
                    <button
                      className={`toolbar-icon sketch-tool-icon ${sketchTool === "select" ? "" : "disabled"}`}
                      type="button"
                      aria-label={t("sketch.addImage")}
                      title={sketchTool === "select" ? t("sketch.addImageReady") : t("sketch.addImageBlocked")}
                      onClick={onSketchImage}
                      disabled={sketchTool !== "select"}
                    >
                      <SketchReferenceIcon name="image" />
                    </button>
                    <button className={`toolbar-icon sketch-tool-icon ${sketchTool === "refine" ? "active" : ""}`} type="button" aria-label={t("sketch.refine")} title={t("sketch.refine")} onClick={() => onSketchTool("refine")}>
                      <SketchReferenceIcon name="refine" />
                    </button>
                    <button
                      className={`toolbar-icon sketch-tool-icon ${canFilletSketchPoint ? "" : "disabled"} ${sketchCornerDialog === "chamfer" ? "active" : ""}`}
                      type="button"
                      aria-label={t("sketch.chamferCorner")}
                      title={canFilletSketchPoint ? t("sketch.chamferCorner") : t("sketch.chamferCornerDisabled")}
                      onClick={() => {
                        if (!canFilletSketchPoint) return;
                        onSketchCornerDialog?.(sketchCornerDialog === "chamfer" ? null : "chamfer");
                      }}
                      disabled={!canFilletSketchPoint}
                    >
                      <ToolbarChamferIcon />
                    </button>
                    <button
                      className={`toolbar-icon sketch-tool-icon ${canFilletSketchPoint ? "" : "disabled"} ${sketchCornerDialog === "fillet" ? "active" : ""}`}
                      type="button"
                      aria-label={t("sketch.filletCorner")}
                      title={canFilletSketchPoint ? t("sketch.filletCorner") : t("sketch.filletCornerDisabled")}
                      onClick={() => {
                        if (!canFilletSketchPoint) return;
                        onSketchCornerDialog?.(sketchCornerDialog === "fillet" ? null : "fillet");
                      }}
                      disabled={!canFilletSketchPoint}
                    >
                      <ToolbarFilletIcon />
                    </button>
                    <button className={`toolbar-icon sketch-tool-icon ${sketchTool === "erase" ? "active" : ""}`} type="button" aria-label={t("sketch.erase")} title={t("sketch.erase")} onClick={() => onSketchTool("erase")}>
                      <SketchReferenceIcon name="erase" />
                    </button>
                  </div>
                </div>
                <div className="toolbar-section sketch-clipboard-section" data-group="clipboard">
                  <div className="toolbar-section-label">{t("editor.group.clipboard")}</div>
                  <div className="toolbar-section-tools">{sketchClipboardTools.map(renderToolButton)}</div>
                </div>
                <div className="toolbar-section sketch-history-section" data-group="history">
                  <div className="toolbar-section-label">{t("editor.group.history")}</div>
                  <div className="toolbar-section-tools">
                    <button className={`toolbar-icon ${sketchCanUndo ? "" : "disabled"}`} type="button" aria-label={t("sketch.undo")} title={`${t("status.undo")} (${COMMAND_SHORTCUTS["sketch-undo"]})`} onClick={onSketchUndo} disabled={!sketchCanUndo}>
                      <ToolbarUndoIcon />
                    </button>
                    <button className={`toolbar-icon ${sketchCanRedo ? "" : "disabled"}`} type="button" aria-label={t("sketch.redo")} title={`${t("status.redo")} (${COMMAND_SHORTCUTS["sketch-redo"]})`} onClick={onSketchRedo} disabled={!sketchCanRedo}>
                      <ToolbarRedoIcon />
                    </button>
                  </div>
                </div>
                <div className="toolbar-spacer" />
                <div className="toolbar-section sketch-finish-section" data-group="finish">
                  <div className="toolbar-section-label">{t("sketch.group.finish")}</div>
                  <div className="toolbar-section-tools">
                    <button
                      className={`sketch-command-button ${sketchStrokeActive ? "active" : ""}`}
                      type="button"
                      aria-pressed={Boolean(sketchStrokeActive)}
                      title={t("sketch.strokeHint")}
                      onClick={onSketchStroke}
                    >
                      <SketchReferenceIcon name="line" />
                      <span>{t("sketch.stroke")}</span>
                    </button>
                    <button className="sketch-command-button primary" type="button" onClick={onSketchFinish}>
                      <Check />
                      <span>{sketchOperation === "revolve" ? t("sketch.finishRevolve") : sketchOperation === "sweep" ? t("sketch.finishSweep") : t("sketch.finishSketch")}</span>
                    </button>
                    <button className="sketch-command-button cancel" type="button" onClick={onSketchCancel}>
                      <X />
                      <span>{t("sketch.cancel")}</span>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="toolbar-section sketch-start-section" data-group="create">
                <div className="toolbar-section-label">{t("sketch.group.create")}</div>
                <div className="toolbar-section-tools">
                  <button
                    className="sketch-command-button primary"
                    type="button"
                    aria-label={t("sketch.extrude")}
                    title={`${t("sketch.extrude")} - ${t("sketch.extrudeHint")}`}
                    onClick={() => startSketch("extrude")}
                  >
                    <ArrowUpFromLine aria-hidden="true" />
                    <span>{t("sketch.extrude")}</span>
                  </button>
                  <button
                    className="sketch-command-button primary"
                    type="button"
                    aria-label={t("sketch.revolve")}
                    title={`${t("sketch.revolve")} - ${t("sketch.revolveHint")}`}
                    onClick={() => startSketch("revolve")}
                  >
                    <Rotate3d aria-hidden="true" />
                    <span>{t("sketch.revolve")}</span>
                  </button>
                  {simpleMode ? null : <button
                    className="sketch-command-button primary"
                    type="button"
                    aria-label={t("sketch.sweep")}
                    title={`${t("sketch.sweep")} - ${t("sketch.sweepHint")}`}
                    onClick={() => startSketch("sweep")}
                  >
                    <RouteIcon aria-hidden="true" />
                    <span>{t("sketch.sweep")}</span>
                  </button>}
                  <GuideHelpLink section="sketchToBody" />
                  <button className={`sketch-command-button ${canEditSketch ? "" : "disabled"}`} type="button" aria-label={t("sketch.editTo3d")} title={t("sketch.editTo3d")} onClick={onEditSketch} disabled={!canEditSketch}>
                    <SketchReferenceIcon name="editSketchTo3d" />
                    <span>{t("sketch.edit")}</span>
                  </button>
                </div>
              </div>
            )}
            {/* Sketch mode has its own keys; the help opens from here too. */}
            {simpleMode ? null : <div className="toolbar-section toolbar-actions-section" data-group="help">
              <div className="toolbar-section-label">{t("editor.group.help")}</div>
              <div className="action-buttons">
                <button className="action-icon-button" aria-label={t("palette.open")} title={t("palette.open")} aria-haspopup="dialog" data-layerling-tool="command-search" onClick={openPalette}>
                  <Search className="toolbar-search-icon" aria-hidden="true" />
                </button>
                <button className="action-icon-button" aria-label={t("editor.guide")} title={t("editor.guide")} onClick={onGuide}>
                  <ToolbarGuideIcon />
                </button>
                <button className="action-icon-button" aria-label={t("editor.keyboardShortcuts")} title={t("editor.keyboardShortcuts")} onClick={onShortcuts}>
                  <ToolbarKeyboardIcon />
                </button>
                <button className={`action-icon-button ${interactiveHelpActive ? "active" : ""}`} type="button" aria-label={t("interactiveHelp.title")} title={`${t("interactiveHelp.title")} (${COMMAND_SHORTCUTS["interactive-help"]})`} aria-pressed={interactiveHelpActive} data-layerling-tool="interactive-help" data-help-exempt onClick={onInteractiveHelp}>
                  <CircleHelp className="toolbar-search-icon" aria-hidden="true" />
                </button>
              </div>
            </div>}
          </div>
        )}
      </div>
      <div className="toolbar-title-row">
        {/* The brand, in the same corner as on the start page. Not a link:
            leaving the editor is not something to trigger by accident. */}
        <div className="toolbar-brand">
          <img src="/assets/layerling/layerling-logo.svg" alt="Layerling" />
          <span className="toolbar-brand-text">
            <span className="toolbar-brand-name">layerling</span>
            <span className="toolbar-brand-tagline">{t("brand.tagline")}</span>
          </span>
        </div>
        <div className="toolbar-workspace-tabs" role="tablist" aria-label={t("editor.modeLabel")}>
          <button
            className={toolbarMode === "geometry" ? "active" : ""}
            type="button"
            role="tab"
            aria-selected={toolbarMode === "geometry"}
            onClick={() => selectToolbarMode("geometry")}
          >
            {t("editor.modeGeometry")}
          </button>
          <button
            className={toolbarMode === "sketch" ? "active" : ""}
            type="button"
            role="tab"
            aria-selected={toolbarMode === "sketch"}
            onClick={() => selectToolbarMode("sketch")}
            disabled={historyViewActive}
          >
            {t("editor.modeSketch")}
          </button>
        </div>
        <div className="toolbar-project-name">
          <label ref={projectNameFieldRef} className="toolbar-project-name-field" title={t("editor.renameProject")}>
            <input
              ref={projectNameInputRef}
              aria-label={t("confirm.projectName")}
              value={projectNameDraft}
              maxLength={80}
              spellCheck={false}
              onChange={(event) => setProjectNameDraft(event.target.value)}
              onBlur={(event) => {
                if (cancelProjectNameEditRef.current) {
                  cancelProjectNameEditRef.current = false;
                  setProjectNameDraft(projectName);
                  return;
                }
                commitProjectName(event.currentTarget.value);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
                if (event.key === "Escape") {
                  cancelProjectNameEditRef.current = true;
                  event.currentTarget.blur();
                }
              }}
            />
            <Pencil size={13} strokeWidth={2.4} aria-hidden="true" />
          </label>
        </div>
        <div className="toolbar-title-row-actions">
          <ThemeSwitch />
          <LanguageSwitch />
        </div>
      </div>
    </div>
  );
}

function TopActionPanel({
  panel,
  projectName,
  shapeCount,
  scopeLabel,
  selectionLeavesOut,
  onSelectAll,
  onlyHoles,
  hiddenCount = 0,
  estimateShapes,
  onEstimatePrint,
  onClose,
  onExport,
  stlFileName = null,
  onExportLyl,
  onExportStep,
  onExportDrawing,
  drawingExporting,
  onExportImage,
  sharedProjectsEnabled,
  lylExporting,
  stepExporting,
  onImportFiles,
  onPickFile,
  onPickProjectFile,
  onPickInsertProjectFile,
  workspaceHistoryLimit,
}: {
  panel: Exclude<TopPanel, null>;
  projectName: string;
  shapeCount: number;
  scopeLabel: "selected" | "total";
  /** Set when a selection is exported that leaves out visible bodies: how many are selected, how many are visible. */
  selectionLeavesOut?: { selected: number; total: number } | null;
  onSelectAll?: () => void;
  onlyHoles?: boolean;
  /** Ausgeblendete Teile, die der Export auslaesst - gesagt, bevor er laeuft. */
  hiddenCount?: number;
  /** Was exportiert wuerde - daraus Volumen, Gewicht und Filament. */
  estimateShapes: readonly WorkplaneShape[];
  onEstimatePrint: (shapes: readonly WorkplaneShape[]) => Promise<ExportSolidVolume>;
  onClose: () => void;
  onExport: (format: DirectExportFormat, exportName: string, chooseFile?: boolean, svgView?: SvgExportView) => void;
  /** The STL file this design exports into, once one was chosen (Chrome and Edge). */
  stlFileName?: string | null;
  onExportLyl: (exportName: string, historyLimit: LylHistoryLimit, target?: LylExportTarget) => void;
  onExportStep: (exportName: string) => void;
  onExportDrawing: (exportName: string, format: "svg" | "pdf") => void;
  drawingExporting: boolean;
  onExportImage: (exportName: string, options: ViewImageOptions) => void;
  sharedProjectsEnabled: boolean;
  lylExporting: boolean;
  stepExporting: boolean;
  onImportFiles: (files: FileList | File[]) => void;
  onPickFile: () => void;
  onPickProjectFile: () => void;
  onPickInsertProjectFile: () => void;
  workspaceHistoryLimit: LylHistoryLimit;
}) {
  const [keepSvgPage, setKeepSvgPage] = useState(false);
  useEffect(() => setKeepSvgPage(readKeepSvgPage()), []);
  // The width a picture or an SVG comes in at; empty keeps its own size, and it counts for the next import only.
  const [svgWidthText, setSvgWidthText] = useState(() => { const width = readImportSvgWidth(); return width ? String(width) : ""; });
  const [exportFormat, setExportFormat] = useState<ExportFormat>("stl");
  const [drawingFormat, setDrawingFormat] = useState<"svg" | "pdf">("pdf");
  const [svgView, setSvgView] = useState<SvgExportView>("silhouette");
  const [exportName, setExportName] = useState(projectName);
  const previousProjectNameRef = useRef(projectName);
  // Starts at the history setting from the workspace settings, so a project
  // file carries what the editor keeps unless it is changed here.
  const [lylHistoryLimit, setLylHistoryLimit] = useState<LylHistoryLimit>(workspaceHistoryLimit);
  useEffect(() => setLylHistoryLimit(workspaceHistoryLimit), [workspaceHistoryLimit]);
  useEffect(() => {
    const previousProjectName = previousProjectNameRef.current;
    setExportName((current) => current === previousProjectName ? projectName : current);
    previousProjectNameRef.current = projectName;
  }, [projectName]);
  // A custom number from the settings joins the usual stops in its place; the last stop, None,
  // saves the design with its current state only, for sharing a file without its undo steps (#246).
  const lylHistoryLimits = useMemo<readonly LylHistoryLimit[]>(() => {
    const presets: number[] = [100, 50, 30];
    const numbers = typeof workspaceHistoryLimit === "number" && !presets.includes(workspaceHistoryLimit)
      ? [...presets, workspaceHistoryLimit].sort((a, b) => b - a)
      : presets;
    return ["unlimited", ...numbers, 0];
  }, [workspaceHistoryLimit]);
  const lylHistoryLimitIndex = Math.max(0, lylHistoryLimits.indexOf(lylHistoryLimit));
  const [printMaterial, setPrintMaterial] = useState<PrintMaterial>(() => {
    try {
      return normalizePrintMaterial(window.localStorage.getItem(PRINT_MATERIAL_STORAGE_KEY));
    } catch {
      return DEFAULT_PRINT_MATERIAL;
    }
  });
  const [printVolume, setPrintVolume] = useState<ExportSolidVolume | null>(null);
  const [printInfill, setPrintInfill] = useState<number>(() => {
    try {
      return normalizeInfillPercent(window.localStorage.getItem(PRINT_INFILL_STORAGE_KEY));
    } catch {
      return DEFAULT_INFILL_PERCENT;
    }
  });
  const [printWalls, setPrintWalls] = useState<number>(() => {
    try {
      return normalizeWalls(window.localStorage.getItem(PRINT_WALLS_STORAGE_KEY));
    } catch {
      return DEFAULT_WALLS;
    }
  });
  const [imageOptions, setImageOptions] = useState<ViewImageOptions>({ plate: true, transparent: false });
  const showPrintEstimate = panel === "export" && exportFormat !== "drawing" && exportFormat !== "svg" && exportFormat !== "png" && exportFormat !== "lyl" && shapeCount > 0;
  // A picture shows the view as it is, not the selection, so the notes about what goes along do not apply.
  const exportsBodies = exportFormat !== "lyl" && exportFormat !== "png";
  useEffect(() => {
    if (!showPrintEstimate) return;
    let cancelled = false;
    setPrintVolume(null);
    // Kurz warten: beim Tippen oder Ziehen im Hintergrund nicht jedes Mal neu verschmelzen.
    const timer = window.setTimeout(() => {
      onEstimatePrint(estimateShapes)
        .then((result) => { if (!cancelled) setPrintVolume(result); })
        .catch(() => { if (!cancelled) setPrintVolume(null); });
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [showPrintEstimate, estimateShapes, onEstimatePrint]);
  const choosePrintMaterial = (value: string) => {
    const material = normalizePrintMaterial(value);
    setPrintMaterial(material);
    try {
      window.localStorage.setItem(PRINT_MATERIAL_STORAGE_KEY, material);
    } catch {
      // Ohne Speicher gilt die Wahl nur bis zum Schliessen.
    }
  };
  const choosePrintInfill = (value: string) => {
    const infill = normalizeInfillPercent(value);
    setPrintInfill(infill);
    try {
      window.localStorage.setItem(PRINT_INFILL_STORAGE_KEY, String(infill));
    } catch {
      // Without storage the choice holds until the window closes.
    }
  };
  const choosePrintWalls = (value: string) => {
    const walls = normalizeWalls(value);
    setPrintWalls(walls);
    try {
      window.localStorage.setItem(PRINT_WALLS_STORAGE_KEY, String(walls));
    } catch {
      // See above.
    }
  };
  // Volume is the body's own; weight and filament count the walls and the infill, the solid numbers stand under them.
  const estimate = printVolume
    ? printEstimateWithInfill(printVolume.volumeMm3, { sideMm2: printVolume.sideMm2, flatMm2: printVolume.flatMm2 }, printMaterial, printInfill, printWalls)
    : null;
  const lylHistoryStop = (index: number) => ({ "--stop": index / (lylHistoryLimits.length - 1) }) as CSSProperties;
  useLanguage();
  const title = panel === "export" ? t("panel.export") : t("panel.import");

  const exportDetails: Record<ExportFormat, { label: string; description: string; note: string }> = {
    drawing: {
      label: t("export.drawing.label"),
      description: t("export.drawing.description"),
      note: t("export.drawing.note"),
    },
    stl: {
      label: "STL",
      description: t("export.stl.description"),
      note: t("export.stl.note"),
    },
    "3mf": {
      label: "3MF",
      description: t("export.3mf.description"),
      note: t("export.3mf.note"),
    },
    obj: {
      label: "OBJ",
      description: t("export.obj.description"),
      note: t("export.obj.note"),
    },
    step: {
      label: "STEP",
      description: t("export.step.description"),
      note: t("export.step.note"),
    },
    svg: {
      label: "SVG",
      description: t("export.svg.description"),
      note: t(svgView === "footprint" ? "export.svg.noteFootprint" : "export.svg.note"),
    },
    png: {
      label: "PNG",
      description: t("export.png.description"),
      note: t("export.png.note"),
    },
    lyl: {
      label: "LYL",
      description: t("export.lyl.description"),
      note: t("export.lyl.note"),
    },
  };
  const selectedExport = exportDetails[exportFormat];
  const runSelectedExport = () => {
    if (drawingExporting || stepExporting || lylExporting) return;
    if (exportFormat === "drawing") onExportDrawing(exportName, drawingFormat);
    else if (exportFormat === "step") onExportStep(exportName);
    else if (exportFormat === "png") onExportImage(exportName, imageOptions);
    else if (exportFormat === "lyl") onExportLyl(exportName, lylHistoryLimit, lylFileAccessSupported() ? "fileAs" : "download");
    else onExport(exportFormat, exportName, false, svgView);
  };

  return (
    <div
      className={`top-action-panel ${panel === "export" ? "export-action-panel" : panel === "import" ? "import-action-panel" : ""}`}
      role="dialog"
      aria-label={title}
    >
      <header>
        <div className="top-action-heading">
          <strong>{title}</strong>
        </div>
        <div className="panel-header-actions">
          <GuideHelpLink section={panel === "import" ? "importing" : "exporting"} />
          <button aria-label={t("panel.close", { title })} onClick={onClose}>
            <X size={18} />
          </button>
        </div>
      </header>
      {panel === "import" ? (
        <div className="top-action-body">
          <button className="open-lyl-project-button" type="button" onClick={onPickProjectFile}>
            <span className="open-lyl-project-icon"><FolderOpen size={18} /></span>
            <span>
              <strong>{t("import.openProject")}</strong>
              <small>{t("import.openProjectHint")}</small>
            </span>
          </button>
          <button className="open-lyl-project-button" type="button" onClick={onPickInsertProjectFile}>
            <span className="open-lyl-project-icon"><FilePlus2 size={18} /></span>
            <span>
              <strong>{t("import.insertProject")}</strong>
              <small>{t("import.insertProjectHint")}</small>
            </span>
          </button>
          <div className="import-kind-divider"><span>{t("import.divider")}</span></div>
          <button
            className="import-drop-zone"
            onClick={onPickFile}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "copy";
            }}
            onDrop={(event) => {
              event.preventDefault();
              if (event.dataTransfer.files.length > 0) {
                onImportFiles(event.dataTransfer.files);
              }
            }}
          >
            <ToolbarImportIcon />
            <strong>{t("import.dropZone")}</strong>
            <span>{t("import.dropZoneHint")}</span>
          </button>
          <label className="import-option" title={t("import.keepSvgPageHint")}>
            <input
              type="checkbox"
              checked={keepSvgPage}
              onChange={(event) => {
                setKeepSvgPage(event.currentTarget.checked);
                storeKeepSvgPage(event.currentTarget.checked);
              }}
            />
            <span>{t("import.keepSvgPage")}</span>
          </label>
          <label className="import-option import-width-option" title={t("import.svgWidthHint")}>
            <span>{t("import.svgWidth")}</span>
            <input
              type="text"
              inputMode="decimal"
              value={svgWidthText}
              placeholder={t("import.svgWidthPlaceholder")}
              onChange={(event) => {
                const text = event.currentTarget.value;
                setSvgWidthText(text);
                const width = Number(text.replace(",", "."));
                setImportSvgWidth(text.trim() && Number.isFinite(width) && width > 0 ? width : null);
              }}
            />
          </label>
        </div>
      ) : null}
      {panel === "export" ? (
        <div className="export-dialog-body" data-help-section-all="exporting">
          <section className="export-setting-section export-file-section">
            <label htmlFor="export-file-name">{t("export.fileName")}</label>
            <div className="export-file-input-wrap">
              <input
                id="export-file-name"
                className="export-file-input"
                value={exportName}
                maxLength={120}
                spellCheck={false}
                onChange={(event) => setExportName(event.target.value)}
                onFocus={(event) => event.currentTarget.select()}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && (shapeCount > 0 || !exportsBodies) && !stepExporting && !lylExporting && !drawingExporting) runSelectedExport();
                }}
              />
              <span>.{exportFormat === "drawing" ? drawingFormat : exportFormat}</span>
            </div>
          </section>

          <section className="export-setting-section">
            <div className="export-section-heading">
              <div>
                <strong>{t("export.format")}</strong>
              </div>
              <span className="export-scope-badge">{exportFormat === "lyl"
                  ? t("export.fullProject")
                  : exportFormat === "png"
                  ? t("export.png.scope")
                  : t(scopeLabel === "selected" ? "export.scopeSelected" : "export.scopeTotal", { count: shapeCount })}</span>
            </div>
            <div className="export-format-slider" data-format={exportFormat} role="radiogroup" aria-label={t("export.formatLabel")}>
              {(["stl", "3mf", "obj", "step", "svg", "png", "lyl", "drawing"] as const).map((format) => (
                <button
                  key={format}
                  type="button"
                  role="radio"
                  aria-checked={exportFormat === format}
                  aria-label={`${exportDetails[format].label}: ${exportDetails[format].description}`}
                  title={format === "drawing" ? exportDetails[format].label : undefined}
                  onClick={() => setExportFormat(format)}
                >
                  {format === "drawing" ? t("export.drawing.short") : exportDetails[format].label}
                </button>
              ))}
            </div>
          </section>

          {exportFormat === "drawing" ? (
            <section className="export-setting-section">
              <label>
                <strong>{t("export.drawing.fileFormat")}</strong>{" "}
                <select aria-label={t("export.drawing.fileFormat")} value={drawingFormat} onChange={(event) => setDrawingFormat(event.target.value as "svg" | "pdf")}>
                  <option value="pdf">PDF</option>
                  <option value="svg">SVG</option>
                </select>
              </label>
            </section>
          ) : null}

          {exportFormat === "svg" ? (
            <section className="export-setting-section">
              <label>
                <strong>{t("export.svg.view")}</strong>{" "}
                <select aria-label={t("export.svg.view")} value={svgView} onChange={(event) => setSvgView(event.target.value as SvgExportView)}>
                  <option value="silhouette">{t("export.svg.viewSilhouette")}</option>
                  <option value="footprint">{t("export.svg.viewFootprint")}</option>
                </select>
              </label>
            </section>
          ) : null}

          {exportsBodies && selectionLeavesOut ? (
            <div className="export-holes-only-warning export-selection-note" role="status">
              <Info size={16} aria-hidden="true" />
              <span>
                {selectionLeavesOut.selected === 1
                  ? t("export.selectionOnlyOne", { total: selectionLeavesOut.total })
                  : t("export.selectionOnlyMany", { count: selectionLeavesOut.selected, total: selectionLeavesOut.total })}
              </span>
              {onSelectAll ? (
                <button type="button" className="export-select-all-button" onClick={onSelectAll}>
                  {t("export.selectAll")}
                </button>
              ) : null}
            </div>
          ) : null}

          {exportsBodies && hiddenCount > 0 ? (
            <div className="export-holes-only-warning export-hidden-note" role="status">
              <EyeOff size={16} aria-hidden="true" />
              <span>{hiddenCount === 1 ? t("export.hiddenOne") : t("export.hiddenMany", { count: hiddenCount })}</span>
            </div>
          ) : null}

          {exportsBodies && onlyHoles ? (
            <div className="export-holes-only-warning" role="status">
              <Info size={16} aria-hidden="true" />
              <span>{t("export.holesOnlyWarning")}</span>
            </div>
          ) : null}

          {showPrintEstimate ? (
            <section className="export-setting-section print-estimate-section" aria-live="polite">
              <div className="export-section-heading">
                <div>
                  <strong>{t("export.estimateTitle")}</strong>
                  <span>{t("export.estimateHint")}</span>
                </div>
                <select
                  id="export-print-material"
                  className="print-estimate-material"
                  value={printMaterial}
                  aria-label={t("export.estimateMaterial")}
                  onChange={(event) => choosePrintMaterial(event.currentTarget.value)}
                >
                  {PRINT_MATERIALS.map((material) => (
                    <option key={material} value={material}>{t(`export.material.${material}` as MessageKey)}</option>
                  ))}
                </select>
              </div>
              <div className="print-estimate-settings">
                <label htmlFor="export-print-infill">
                  <span>{t("export.estimateInfillLabel")}</span>
                  <select id="export-print-infill" className="print-estimate-material" value={printInfill} onChange={(event) => choosePrintInfill(event.currentTarget.value)}>
                    {INFILL_CHOICES.map((percent) => (
                      <option key={percent} value={percent}>{percent} %</option>
                    ))}
                  </select>
                </label>
                <label htmlFor="export-print-walls" hidden={printInfill === 100}>
                  <span>{t("export.estimateWallsLabel")}</span>
                  <select id="export-print-walls" className="print-estimate-material" value={printWalls} onChange={(event) => choosePrintWalls(event.currentTarget.value)}>
                    {WALL_CHOICES.map((count) => (
                      <option key={count} value={count}>{count}</option>
                    ))}
                  </select>
                </label>
              </div>
              {estimate ? (
                <dl className="print-estimate-values">
                  <div>
                    <dt>{t("export.estimateVolume")}</dt>
                    <dd>{formatEstimateNumber(estimate.solid.volumeCm3, estimate.solid.volumeCm3 < 10 ? 2 : 1)} cm³</dd>
                  </div>
                  <div>
                    <dt>{t("export.estimateWeight")}</dt>
                    <dd>{formatEstimateNumber(estimate.printed.grams, estimate.printed.grams < 10 ? 1 : 0)} g</dd>
                  </div>
                  <div>
                    <dt>{t("export.estimateFilament")}</dt>
                    <dd>{formatEstimateNumber(estimate.printed.filamentMeters, estimate.printed.filamentMeters < 10 ? 2 : 1)} m</dd>
                  </div>
                </dl>
              ) : (
                <span className="print-estimate-busy">{t("export.estimateBusy")}</span>
              )}
              {estimate ? (
                <span className="print-estimate-note print-estimate-infill">
                  {estimate.infillPercent === 100
                    ? t("export.estimateSolidNote")
                    : t("export.estimateInfill", {
                      walls: estimate.walls,
                      infill: estimate.infillPercent,
                      grams: formatEstimateNumber(estimate.solid.grams, estimate.solid.grams < 10 ? 1 : 0),
                    })}
                </span>
              ) : null}
              {printVolume && printVolume.unionFailed > 0 ? (
                <span className="print-estimate-note">{t("export.estimateOverlap")}</span>
              ) : null}
            </section>
          ) : null}

          {exportFormat === "png" ? (
            <section className="export-setting-section export-image-section">
              <label className="export-image-option" htmlFor="export-image-plate">
                <input id="export-image-plate" type="checkbox" checked={imageOptions.plate} onChange={(event) => { const plate = event.currentTarget.checked; setImageOptions((current) => ({ ...current, plate })); }} />
                <span>{t("export.png.plate")}</span>
              </label>
              <label className="export-image-option" htmlFor="export-image-transparent">
                <input id="export-image-transparent" type="checkbox" checked={imageOptions.transparent} onChange={(event) => { const transparent = event.currentTarget.checked; setImageOptions((current) => ({ ...current, transparent })); }} />
                <span>{t("export.png.transparent")}</span>
              </label>
            </section>
          ) : null}

          {exportFormat === "lyl" ? (
            <section className="export-setting-section lyl-history-section">
              <div className="export-section-heading">
                <div>
                  <strong>{t("export.historyTitle")}</strong>
                  <span>{t("export.historyHint")}</span>
                </div>
              </div>
              <div className="lyl-history-range-control" data-limit={String(lylHistoryLimit)} style={lylHistoryStop(lylHistoryLimitIndex)}>
                <input
                  className="lyl-history-range"
                  type="range"
                  min={0}
                  max={lylHistoryLimits.length - 1}
                  step={1}
                  value={lylHistoryLimitIndex}
                  aria-label={t("export.historyLabel")}
                  aria-valuetext={lylHistoryLimit === "unlimited" ? t("export.unlimited") : lylHistoryLimit === 0 ? t("export.historyNone") : t("export.actionCount", { count: lylHistoryLimit })}
                  onChange={(event) => setLylHistoryLimit(lylHistoryLimits[Number(event.currentTarget.value)] ?? "unlimited")}
                />
              </div>
              <div className="lyl-history-range-labels" aria-hidden="true">
                {lylHistoryLimits.map((limit, index) => (
                  <span key={limit} className={lylHistoryLimit === limit ? "active" : undefined} style={lylHistoryStop(index)}>
                    {limit === "unlimited" ? t("export.unlimited") : limit === 0 ? t("export.historyNone") : limit}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          <div className="export-format-summary">
            <div>
              <strong>{selectedExport.label}</strong>
              <span>{selectedExport.description}</span>
            </div>
            <p>{selectedExport.note}</p>
          </div>

          <footer className="export-dialog-footer">
            {exportFormat === "stl" && stlFileName ? (
              stlNameAsksForNewFile(exportName, projectName, stlFileName)
                ? <span className="export-linked-file" title={exportName}>{t("export.stlNewFile", { name: projectExportFileName(exportName.trim().replace(/\.stl$/i, ""), "stl") })}</span>
                : <span className="export-linked-file" title={stlFileName}>{t("export.stlLinkedFile", { name: stlFileName })}</span>
            ) : null}
            <div>
              {exportFormat === "stl" && stlFileName ? (
                <button className="export-shared-button" type="button" onClick={() => onExport("stl", exportName, true)} disabled={shapeCount === 0}>
                  <span>{t("export.stlSaveAs")}</span>
                </button>
              ) : null}
              {exportFormat === "lyl" && sharedProjectsEnabled ? (
                <button
                  className="export-shared-button"
                  type="button"
                  onClick={() => onExportLyl(exportName, lylHistoryLimit, "shared")}
                  disabled={lylExporting || stepExporting || drawingExporting}
                >
                  <CloudUpload />
                  <span>{t("export.saveToShared")}</span>
                </button>
              ) : null}
              <button className="export-primary-button" onClick={runSelectedExport} disabled={(shapeCount === 0 && exportsBodies) || stepExporting || lylExporting || drawingExporting}>
                <Download />
                {exportFormat === "lyl" ? (lylExporting ? t("export.savingProject") : t("export.saveProject")) : null}
                <span hidden={exportFormat === "lyl"}>
                {drawingExporting && exportFormat === "drawing"
                  ? t("status.buildingDrawing")
                  : stepExporting && exportFormat === "step"
                  ? t("export.buildingStep")
                  : t("export.run", { format: selectedExport.label })}
                </span>
              </button>
            </div>
          </footer>
        </div>
      ) : null}
    </div>
  );
}
