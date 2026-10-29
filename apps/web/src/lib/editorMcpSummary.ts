
import { loftMeasures } from "@/lib/loftGeometry";
import { roundSideCount } from "@/lib/roundSideCount";
import { customFontList } from "@/lib/textFonts";
import { isCustomFontId } from "@/lib/customFonts";
import { shapeDepth, shapeWidth } from "@/lib/workplaneShapes";
import { shapePivotWorld, type PivotPoint } from "@/lib/rotationPivot";
import { MCP_SHAPE_SETTING_KEYS, mcpThreadSizeName } from "@/lib/mcpShapeSettings";
import { DEFAULT_SKETCH_STROKE, normalizeSketchStroke } from "@/lib/sketchStroke";
import { surfaceTextureEntry } from "@/lib/surfaceTextureShape";
import { type LayerlingMcpShapeSummary } from "@/lib/layerlingMcpProtocol";
import { vaseSettingsChanges } from "@/lib/vaseSettings";
import type { ShapeKind, SketchProfile, WorkplaneShape } from "@/types/layerling";

export function debugShapeSummary(shape: WorkplaneShape): Record<string, unknown> {
  return {
    id: shape.id,
    name: shape.name,
    kind: shape.kind,
    hole: Boolean(shape.hole),
    x: Number(shape.x.toFixed(3)),
    z: Number(shape.z.toFixed(3)),
    elevation: Number((shape.elevation ?? 0).toFixed(3)),
    width: Number(shapeWidth(shape).toFixed(3)),
    depth: Number(shapeDepth(shape).toFixed(3)),
    height: Number(shape.height.toFixed(3)),
    rotation: Number(shape.rotation.toFixed(3)),
    rotationX: Number((shape.rotationX ?? 0).toFixed(3)),
    rotationZ: Number((shape.rotationZ ?? 0).toFixed(3)),
    mirrorX: Boolean(shape.mirrorX),
    mirrorY: Boolean(shape.mirrorY),
    mirrorZ: Boolean(shape.mirrorZ),
    importedTriangles: shape.importedMesh?.triangleCount ?? 0,
    imagePlate: shape.imagePlate ? `${shape.imagePlate.pixelWidth}x${shape.imagePlate.pixelHeight}` : null,
    // A reference image (#680): how opaque it is drawn; never exported.
    ...(shape.imagePlate ? { referenceImage: { opacity: shape.imagePlate.opacity ?? 1, pixels: { width: shape.imagePlate.pixelWidth, height: shape.imagePlate.pixelHeight } } } : {}),
    edgeTreatments: shape.edgeTreatments ?? [],
    cadDisplayEdgeCount: shape.cadDisplayEdges?.length ?? null,
    cadDisplayEdgesVersion: shape.cadDisplayEdgesVersion ?? null,
    edgeResizeMode: shape.edgeResizeMode ?? "scale",
    cadBrepLength: shape.cadBrep?.length ?? 0,
    cadPrimitiveKind: shape.cadPrimitiveFrame?.kind ?? null,
    groupedCount: shape.groupedShapes?.length ?? 0,
    children: shape.groupedShapes?.map(debugShapeSummary) ?? [],
  };
}

/** A body's own pivot in the coordinates the MCP tools use for positions. */
function mcpPivotSummary(shape: WorkplaneShape) {
  const pivot = shapePivotWorld(shape);
  return pivot ? { x: Number(pivot.x.toFixed(3)), z: Number(pivot.z.toFixed(3)), elevation: Number(pivot.y.toFixed(3)) } : null;
}

/** The pivot an MCP update asks for: a point, null to clear it, undefined to leave it. */
export function mcpPivotRequest(value: unknown): PivotPoint | null | undefined {
  if (value === null) return null;
  if (!value || typeof value !== "object") return undefined;
  const { x, z, elevation } = value as Record<string, unknown>;
  if (![x, z, elevation].every((part) => typeof part === "number" && Number.isFinite(part))) return undefined;
  return { x: x as number, y: elevation as number, z: z as number };
}

export function compactShapeSummary(shape: WorkplaneShape, index: number) {
  const childSummary = shape.groupedShapes
    ?.map((child) => `${child.kind}${child.hole ? "H" : "S"}${child.importedMesh ? "I" : ""}`)
    .join("+");
  return [
    `${index}:${shape.kind}${shape.hole ? "H" : "S"}${shape.importedMesh ? "I" : ""}${shape.imagePlate ? "P" : ""}`,
    `g${shape.groupedShapes?.length ?? 0}`,
    `tri${shape.importedMesh?.triangleCount ?? 0}`,
    `edge${shape.edgeTreatments?.map((feature) => `${feature.kind}:${feature.amount}:${feature.edgeCount}:${feature.chamferAngle ?? ""}${feature.endAmount !== undefined ? `>${feature.endAmount}` : ""}`).join("|") ?? ""}`,
    `viewEdges${shape.cadDisplayEdges?.length ?? "auto"}v${shape.cadDisplayEdgesVersion ?? 0}`,
    `edgeResize${shape.edgeResizeMode ?? "scale"}`,
    `brep${shape.cadBrep?.length ?? 0}`,
    `prim${shape.cadPrimitiveFrame ? `${shape.cadPrimitiveFrame.kind}:${shape.cadPrimitiveFrame.width}:${shape.cadPrimitiveFrame.depth}:${shape.cadPrimitiveFrame.height}` : ""}`,
    `p${Number(shape.x.toFixed(2))},${Number(shape.z.toFixed(2))},${Number((shape.elevation ?? 0).toFixed(2))}`,
    `d${Number(shapeWidth(shape).toFixed(2))}x${Number(shapeDepth(shape).toFixed(2))}x${Number(shape.height.toFixed(2))}`,
    `r${Number((shape.rotationX ?? 0).toFixed(1))},${Number(shape.rotation.toFixed(1))},${Number((shape.rotationZ ?? 0).toFixed(1))}`,
    `m${shape.mirrorX ? "x" : ""}${shape.mirrorY ? "y" : ""}${shape.mirrorZ ? "z" : ""}`,
    childSummary ? `c[${childSummary}]` : "c[]",
  ].join(",");
}

/** Runde Koerper, deren Seitenzahl ohne eigene Angabe der Groesse folgt. */
const MCP_FOLLOWING_SIDE_KINDS = new Set<ShapeKind>(["cylinder", "ellipse", "cone", "tube", "ring"]);

function mcpShapeSettings(shape: WorkplaneShape): Record<string, string | number | boolean> | undefined {
  const settings: Record<string, string | number | boolean> = {};
  MCP_SHAPE_SETTING_KEYS.forEach((key) => {
    const value = shape[key];
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      settings[key] = value;
    } else if ((key === "bentTubeSegments" || key === "gridfinityDividerPositionsX" || key === "gridfinityDividerPositionsZ" || key === "gridfinityCompartmentLabels" || key === "gridfinityOpenings") && Array.isArray(value)) {
      // Eine Liste passt nicht in die flache Auskunft; als Text geht sie
      // hinaus und wird so auch wieder angenommen.
      settings[key] = JSON.stringify(value);
    } else if (key === "vase" && value && typeof value === "object") {
      // The vase's many settings go out as text too, only those that differ from the defaults.
      settings[key] = JSON.stringify(vaseSettingsChanges(value));
    }
  });
  // Steht keine Seitenzahl im Objekt, folgt sie der Groesse. Dann gehoert hier
  // hin, wie viele Seiten gerade wirklich gezeichnet werden - und der Hinweis,
  // dass die Zahl mitwandert, sobald das Objekt waechst.
  if (MCP_FOLLOWING_SIDE_KINDS.has(shape.kind) && shape.sides === undefined) {
    settings.sides = roundSideCount(undefined, shapeWidth(shape), shapeDepth(shape));
    settings.sidesFollowSize = true;
  }
  // Ein Uebergang meldet seine Enden so, wie der Koerper sie zeigt, nicht wie sie gespeichert sind (#188).
  if (shape.kind === "loft") Object.assign(settings, mcpLoftSettings(shape));
  // Durchmesser und Steigung sagen einer KI nicht, dass hier ein G1/2 steht;
  // der Name aus dem Groessenmenue sagt es, und er laesst sich zuruecksenden.
  const threadSize = mcpThreadSizeName(shape);
  if (threadSize) settings.threadSize = threadSize;
  return Object.keys(settings).length > 0 ? settings : undefined;
}

export function mcpShapeSummary(shape: WorkplaneShape): LayerlingMcpShapeSummary {
  return {
    id: shape.id,
    name: shape.name,
    kind: shape.kind,
    color: shape.color,
    hole: Boolean(shape.hole),
    locked: Boolean(shape.locked),
    hidden: Boolean(shape.hidden),
    position: {
      x: shape.x,
      z: shape.z,
      elevation: shape.elevation ?? 0,
    },
    dimensions: {
      width: shapeWidth(shape),
      depth: shapeDepth(shape),
      height: shape.height,
      size: shape.size,
    },
    rotation: {
      x: shape.rotationX ?? 0,
      y: shape.rotation,
      z: shape.rotationZ ?? 0,
    },
    mirror: {
      x: Boolean(shape.mirrorX),
      y: Boolean(shape.mirrorY),
      z: Boolean(shape.mirrorZ),
    },
    rotationPivot: mcpPivotSummary(shape),
    edgeTreatments: shape.edgeTreatments ?? [],
    settings: mcpShapeSettings(shape),
    groupedCount: shape.groupedShapes?.length ?? 0,
    importedTriangles: shape.importedMesh?.triangleCount ?? 0,
    cadDisplayEdgeCount: shape.cadDisplayEdges?.length ?? null,
    sketchPointCount: shape.sketchProfile?.points.length ?? 0,
    sketchSegmentCount: shape.sketchProfile?.segments.length ?? 0,
    ...(shape.sketchProfile && shape.sketchOperation !== "revolve" && shape.sketchOperation !== "sweep"
      ? { sketchStroke: shape.sketchProfile.stroke ?? null, silhouette: Boolean(shape.sketchProfile.silhouette), sketchInset: shape.sketchProfile.inset ?? null }
      : {}),
    // A text's fill (#215) reads like a sketch body's: its stroke, and whether the counters are left out.
    ...(shape.kind === "text" ? { textStroke: shape.textStroke ?? null, textSilhouette: Boolean(shape.textSilhouette), textStretch: Boolean(shape.textStretch), textVertical: Boolean(shape.textVertical), textSpacing: shape.textSpacing ?? 0, textEdge: shape.textEdge ?? null } : {}),
    // A name tag's key ring hole (#215), on the layers it goes through; the bottom one carries the ear.
    ...(shape.kind === "text" && shape.textKeyring ? { textKeyring: shape.textKeyring } : {}),
    ...(shape.layeredText ? { layeredText: true } : {}),
    ...(shape.layeredIcon ? { layeredIcon: true } : {}),
    // A QR code (#553): the text and the choices it was made with.
    ...(shape.qrCode ? { qrCode: shape.qrCode } : {}),
    // A surface texture: its settings, the masks as a count, and whether the body under it is kept to change or remove it.
    ...(shape.surfaceTexture ? { surfaceTexture: { ...shape.surfaceTexture, masks: shape.surfaceTexture.masks.length, changeable: Boolean(surfaceTextureEntry(shape)) } } : {}),
    children: shape.groupedShapes?.map(mcpShapeSummary),
  };
}

/**
 * The sketch with the fill an MCP command asks for (#197), or null when it asks for none:
 * `stroke` as an object sets the stroke (missing values keep the current ones), null or false
 * makes it an area again; `silhouette` leaves the holes out or brings them back.
 */
export function mcpSketchFillProfile(profile: SketchProfile, params: Record<string, unknown>): SketchProfile | null {
  const strokeRequested = params.stroke !== undefined;
  const silhouetteRequested = typeof params.silhouette === "boolean";
  if (!strokeRequested && !silhouetteRequested) return null;
  const next: SketchProfile = { ...profile };
  if (strokeRequested) {
    if (params.stroke === null || params.stroke === false) {
      delete next.stroke;
    } else {
      const stroke = normalizeSketchStroke({ ...DEFAULT_SKETCH_STROKE, ...profile.stroke, ...(params.stroke as object) });
      if (!stroke) throw new Error("stroke needs a width above 0, or null for an area");
      next.stroke = stroke;
    }
  }
  if (silhouetteRequested) {
    if (params.silhouette) next.silhouette = true;
    else delete next.silhouette;
  }
  return next;
}

/** A text font an MCP command names: a font of one's own by id or by name becomes its id; null for anything else. */
export function mcpTextFont(value: string) {
  if (isCustomFontId(value)) return value;
  const wanted = value.trim().toLowerCase();
  return customFontList().find((font) => font.name.toLowerCase() === wanted)?.id ?? null;
}

/** The transition's values as the body shows them, under the names a command sets them by. */
function mcpLoftSettings(shape: WorkplaneShape): Record<string, string | number> {
  const m = loftMeasures(shape);
  return {
    loftBottomOutline: m.bottomOutline, loftTopOutline: m.topOutline,
    loftBottomWidth: m.bottomWidth, loftBottomDepth: m.bottomDepth, loftTopWidth: m.topWidth, loftTopDepth: m.topDepth,
    loftBottomCorner: m.bottomCorner, loftTopCorner: m.topCorner, loftBottomSides: m.bottomSides, loftTopSides: m.topSides,
    loftOffsetX: m.offsetX, loftOffsetZ: m.offsetZ, loftWall: m.wall,
    loftTwist: m.twist, loftTiltX: m.tiltX, loftTiltZ: m.tiltZ, loftSmooth: m.smooth, loftSegments: m.segments,
  };
}
