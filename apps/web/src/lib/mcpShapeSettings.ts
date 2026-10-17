import type { ThreadProfile, WorkplaneShape } from "@/types/layerling";
import { isThreadProfile } from "@/lib/threadProfiles";
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
  "extrudeTwist", "extrudeTopOffsetX", "extrudeTopOffsetZ",
  "teeth", "toothSize", "toothWidth", "centerHoleSize", "gearType", "helixAngle", "helixQuality", "gearProfile", "gearPressureAngle", "gearBacklash", "gearRim",
  "threadRole", "threadHead", "threadHand", "threadProfile", "threadDiameter", "threadPitch",
  "threadClearance", "threadBoltClearance", "threadAxialClearance", "threadDepth", "threadFlankAngle", "threadQuality", "threadHeadHeight", "threadChamfer", "threadChamferBottom",
  "threadHeadChamfer",
  "springTurns", "springWire", "springQuality", "springHand",
  "starPoints", "starInnerSize", "starOuterFillet", "starInnerFillet", "starQuality",
  "heartTipFillet", "heartQuality",
  "crescentThickness", "crescentTipFillet", "crescentQuality",
  "hingeKnuckles", "hingePinDiameter", "hingeLeafThickness", "hingeClearance", "hingePinless",
  "gridfinityType", "gridfinityLip", "gridfinityMagnets",
  "gridfinityLabelBack", "gridfinityLabelFront", "gridfinityLabelLeft", "gridfinityLabelRight", "gridfinityLabelBackWidth", "gridfinityLabelBackLength", "gridfinityLabelBackOffset", "gridfinityLabelFrontWidth", "gridfinityLabelFrontLength", "gridfinityLabelFrontOffset", "gridfinityLabelLeftWidth", "gridfinityLabelLeftLength", "gridfinityLabelLeftOffset", "gridfinityLabelRightWidth", "gridfinityLabelRightLength", "gridfinityLabelRightOffset", "gridfinityLabelCorner", "gridfinityLabelCornerSize",
  "knurlPattern", "knurlCount", "knurlDepth", "knurlAngle", "knurlChamfer",
  "dovetailNeckWidth", "dovetailClearance",
  "loftBottomOutline", "loftTopOutline", "loftBottomWidth", "loftBottomDepth", "loftTopWidth", "loftTopDepth", "loftBottomCorner", "loftTopCorner", "loftBottomSides", "loftTopSides", "loftOffsetX", "loftOffsetZ", "loftWall", "loftTwist", "loftTiltX", "loftTiltZ", "loftSmooth", "slotEndRatio",
  "screwHoleShaft", "screwHoleHeadDepth", "screwHoleAngle",
  "cornerFillet", "topBottomFillet", "roundedBoxQuality",
  "bentTubeProfile", "bentTubeInnerProfile", "bentTubeSize", "bentTubeWall", "bentTubeQuality", "bentTubeSegments",
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
