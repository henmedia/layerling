import type { ThreadProfile, WorkplaneShape } from "@/types/layerling";
import { isThreadProfile } from "@/lib/threadProfiles";
import { GRIDFINITY_PADDING_KEYS, gridfinityPaddingPatch, gridfinityShapePatch, normalizeGridfinityType, type GridfinityWall } from "@/lib/gridfinityGeometry";
import { normalizeThreadProfile, THREAD_SIZES, threadProfileForSize, threadSettings, threadSizeById, threadSizeFor } from "@/lib/threadGeometry";

/**
 * Die formeigenen Werte, die eine Zusammenfassung sonst verschweigt: Ohne sie
 * liest ein Client zwar die Masse einer Schraube, sieht aber nicht, ob M4 oder
 * M5 darauf steht - und die rohe Form dafuer zu holen, laedt das halbe Projekt
 * mit. **Eine neue Form traegt ihre Felder hier nach**, sonst ist sie fuer eine
 * KI eine namenlose Kiste. Die Liste ist bewusst eine Erlaubnisliste: `cadBrep`
 * ist auch nur eine Zeichenkette, aber eine megabytegrosse.
 *
 * Sie steht in einer eigenen Datei, weil `tests/unit/layerlingMcpTools.test.ts`
 * sie gegen das Schema der Bruecke haelt: **Was hier herausgeht, muss dort
 * hineingehen duerfen.** Genau daran ist es schon zweimal auseinandergelaufen -
 * bei den Formvorgaben fuer Gewinde und Feder (behoben mit 1.2.1) und bei der
 * Verjuengung, die zu lesen war, aber nicht zu setzen.
 *
 * Nicht dabei ist `radius`, die Rundung eines Quaders: Sie steht zwar im
 * Format und wird auch gezeichnet, aber kein Regler und kein Befehl setzt sie,
 * also ist sie an jedem Koerper dieses Editors 0. Ein Wert, den niemand aendern
 * kann, gehoert in keine Auskunft.
 */
export const MCP_SHAPE_SETTING_KEYS = [
  "steps", "sides", "bevel", "segments",
  "topRadius", "baseRadius", "topWidth", "topDepth",
  "taperTopWidth", "taperTopDepth", "taperBottomWidth", "taperBottomDepth",
  "extrudeTwist", "extrudeTopOffsetX", "extrudeTopOffsetZ", "slopeEnd", "slopeSide", "slopeCurve", "narrowEnd", "narrowSide", "narrowCurve", "narrowStart",
  "teeth", "toothSize", "toothWidth", "centerHoleSize", "gearType", "helixAngle", "helixQuality", "gearProfile", "gearPressureAngle", "gearBacklash", "gearRim",
  "threadRole", "threadHead", "threadHand", "threadProfile", "threadDiameter", "threadPitch",
  "threadClearance", "threadBoltClearance", "threadAxialClearance", "threadDepth", "threadFlankAngle", "threadQuality", "threadHeadHeight", "threadChamfer", "threadChamferBottom",
  "threadHeadChamfer", "threadHeadDiameter", "threadDrive", "threadDriveSize", "threadDriveDepth",
  "springTurns", "springWire", "springQuality", "springHand",
  "starPoints", "starInnerSize", "starOuterFillet", "starInnerFillet", "starQuality",
  "heartTipFillet", "heartQuality",
  "crescentThickness", "crescentTipFillet", "crescentQuality",
  "tubeBoreHole", "hingeKnuckles", "hingeKnuckleWidth", "hingeStyle", "hingeConeSize", "hingePinDiameter", "hingeLeafThickness", "hingeClearance", "hingePinless", "hingeAngle", "hingeScrewHoles", "hingeScrewDiameter", "hingeScrewSpacing", "hingeScrewAcross", "hingeScrewCountersink", "hingeCornerRadius", "hingeLeafStyle", "hingeScrewHead", "hingeNutWidth",
  "gridfinityType", "gridfinityLip", "gridfinityMagnets", "gridfinityHalfGrid",
  "gridfinityLabelBack", "gridfinityLabelFront", "gridfinityLabelLeft", "gridfinityLabelRight", "gridfinityLabelBackWidth", "gridfinityLabelBackLength", "gridfinityLabelBackOffset", "gridfinityLabelFrontWidth", "gridfinityLabelFrontLength", "gridfinityLabelFrontOffset", "gridfinityLabelLeftWidth", "gridfinityLabelLeftLength", "gridfinityLabelLeftOffset", "gridfinityLabelRightWidth", "gridfinityLabelRightLength", "gridfinityLabelRightOffset", "gridfinityLabelCorner", "gridfinityLabelCornerSize",
  "gridfinityScoopBack", "gridfinityScoopFront", "gridfinityScoopLeft", "gridfinityScoopRight", "gridfinityScoopRadius", "gridfinityFloorHeight", "gridfinityOpenBack", "gridfinityOpenFront", "gridfinityOpenLeft", "gridfinityOpenRight", "gridfinityLipChamfer", "gridfinityWallThickness", "gridfinityPaddingBack", "gridfinityPaddingFront", "gridfinityPaddingLeft", "gridfinityPaddingRight", "gridfinityCornerRadius", "gridfinityBinCornerRadius",
  "gridfinityCompartmentsX", "gridfinityCompartmentsZ", "gridfinityDividerThickness", "gridfinityDividerPositionsX", "gridfinityDividerPositionsZ", "gridfinityCompartmentLabels", "gridfinityOpenings", "gridfinityOpeningCorner", "gridfinityOpeningCornerSize",
  "knurlPattern", "knurlCount", "knurlDepth", "knurlAngle", "knurlChamfer",
  "dovetailNeckWidth", "dovetailClearance",
  "loftBottomOutline", "loftTopOutline", "loftBottomWidth", "loftBottomDepth", "loftTopWidth", "loftTopDepth", "loftBottomCorner", "loftTopCorner", "loftBottomSides", "loftTopSides", "loftOffsetX", "loftOffsetZ", "loftWall", "loftTwist", "loftTiltX", "loftTiltZ", "loftSmooth", "loftSegments", "slotEndRatio", "torusTubeRatio",
  "screwHoleShaft", "screwHoleHeadDepth", "screwHoleAngle", "portProfile",
  "cornerFillet", "topBottomFillet", "roundedBoxQuality",
  "bentTubeProfile", "bentTubeInnerProfile", "bentTubeSize", "bentTubeWall", "bentTubeQuality", "bentTubeSegments",
  "vase",
  "text", "font",
  "textCurved", "textRadius", "textSize", "textInward", "textFlipped",
] as const satisfies readonly (keyof WorkplaneShape)[];

/**
 * `threadSize` aus der Bruecke: eine Normgroesse beim Namen, die hier in
 * Durchmesser, Steigung und Profil aufgeloest wird, bevor der Editor die Werte
 * wie jede andere Gewindeangabe prueft. Das Profil folgt derselben Regel wie
 * das Groessenmenue (`threadProfileForSize`); ein gueltiges `threadProfile` im
 * selben Aufruf geht vor.
 *
 * Durchmesser und Steigung daneben sind erlaubt, solange sie zur Groesse
 * passen - so schickt ein Client den `settings`-Block, den er gelesen hat,
 * unveraendert zurueck. Passen sie nicht, ist das ein Widerspruch, den
 * niemand still aufloesen sollte.
 */
export function mcpThreadSizeParams(params: Record<string, unknown>, currentProfile: ThreadProfile): Record<string, unknown> {
  const requested = params.threadSize;
  if (requested === undefined) return params;
  if (typeof requested !== "string") throw new Error("threadSize must be the name of a standard size, for example \"M6\" or \"G1/2\"");
  const size = threadSizeById(requested.trim());
  if (!size) throw new Error(`Unknown threadSize "${requested}". Known sizes: ${THREAD_SIZES.map((entry) => entry.id).join(", ")}`);
  if (params.threadDiameter !== undefined || params.threadPitch !== undefined) {
    const diameter = params.threadDiameter ?? size.diameter;
    const pitch = params.threadPitch ?? size.pitch;
    const matches = typeof diameter === "number" && typeof pitch === "number" && threadSizeFor(diameter, pitch)?.id === size.id;
    if (!matches) {
      throw new Error(`threadSize "${size.id}" is ${size.diameter} mm with a pitch of ${size.pitch} mm, but threadDiameter or threadPitch in the same call say otherwise. Send threadSize alone, or threadDiameter and threadPitch without it.`);
    }
  }
  return {
    ...params,
    threadDiameter: size.diameter,
    threadPitch: size.pitch,
    threadProfile: isThreadProfile(params.threadProfile) ? params.threadProfile : threadProfileForSize(size, normalizeThreadProfile(currentProfile)),
  };
}

/** Der Name der Normgroesse eines Gewindes, wie ihn das Menue zeigt - oder nichts bei freien Werten. */
export function mcpThreadSizeName(shape: Pick<WorkplaneShape, "kind" | "threadDiameter" | "threadPitch">): string | undefined {
  if (shape.kind !== "thread") return undefined;
  const settings = threadSettings(shape);
  return threadSizeFor(settings.diameter, settings.pitch)?.id;
}

export const MCP_GRIDFINITY_LIST_KEYS = ["gridfinityCompartmentsX", "gridfinityCompartmentsZ", "gridfinityDividerPositionsX", "gridfinityDividerPositionsZ", "gridfinityCompartmentLabels", "gridfinityOpenings"] as const;

/**
 * What an update writes for a Gridfinity part given a padding, or changing type
 * with one stored (#455): the box of the same units on each axis whose size is not
 * given, as gridfinityPaddingPatch writes it. Read as a bin, a padded baseplate's
 * box could gain a unit, so only the box comes from a change of type; the height
 * and the lip stay as given. A padding that is no number is left as it was.
 */
export function mcpGridfinityPaddingPatch(target: WorkplaneShape, patch: Partial<WorkplaneShape>, params: Record<string, unknown>): Partial<WorkplaneShape> {
  if (target.kind !== "gridfinity") return {};
  const number = (value: unknown) => typeof value === "number" && Number.isFinite(value);
  const given = (Object.keys(GRIDFINITY_PADDING_KEYS) as GridfinityWall[]).filter((wall) => number(params[GRIDFINITY_PADDING_KEYS[wall]]));
  const type = normalizeGridfinityType(patch.gridfinityType ?? target.gridfinityType);
  const retype = type !== normalizeGridfinityType(target.gridfinityType) && (given.length > 0 || Object.values(GRIDFINITY_PADDING_KEYS).some((key) => target[key] !== undefined));
  if (!given.length && !retype) return {};
  const retyped = retype ? gridfinityShapePatch(target, { type }) : undefined;
  const box = retyped ? { width: retyped.width, depth: retyped.depth } : {};
  const sized: Partial<WorkplaneShape> = type === "baseplate" ? { ...box, ...gridfinityPaddingPatch({ ...target, ...box, gridfinityType: type }, Object.fromEntries(given.map((wall) => [wall, params[GRIDFINITY_PADDING_KEYS[wall]]]))) } : box;
  // A size given is the whole plate on its own axis.
  if (number(params.width)) delete sized.width;
  if (number(params.depth)) delete sized.depth;
  return sized;
}

/**
 * A Gridfinity bin's lists as lists, also when they come as the text layerling_read_scene gives them, read as
 * mcpBentTubeSegments in LayerlingEditor reads a bent tube's segments; text that is no list is unset, and the counts
 * are numbers and stay as they are.
 */
export function mcpGridfinityListParams(params: Record<string, unknown>) {
  const list = (value: unknown) => {
    if (Array.isArray(value)) return value;
    if (typeof value !== "string") return undefined;
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : undefined;
    } catch {
      // Text that is no list is a value of the wrong kind, which leaves the setting as it was.
      return undefined;
    }
  };
  const lists = { ...params };
  for (const key of MCP_GRIDFINITY_LIST_KEYS) {
    if (key in params && typeof params[key] !== "number") lists[key] = list(params[key]);
  }
  return lists;
}
