import { t } from "@/lib/i18n";
import type { CadModifierDeflection, CadModifierEdge, CadModifierQuality } from "@/lib/cadModifierTypes";

export const CAD_MODIFIER_RUNTIME_BASE = "/occt";

/**
 * Tessellation deflection used the one time a sketch is first extruded into a
 * solid (sketchCad.worker.ts). Edge treatments applied afterwards start their
 * own deflection floor from this value, so a later, coarser-radius fillet
 * cannot re-tessellate a region the sketch itself already needed this fine.
 */
export const SKETCH_CAD_DEFLECTION: CadModifierDeflection = { linear: 0.05, angular: 0.16 };

/** How finely a single edge treatment tessellates the whole body, before any floor from earlier treatments. */
export function cadModifierBaseDeflection(quality: CadModifierQuality, amount: number): CadModifierDeflection {
  if (quality === "draft") return { linear: Math.max(0.12, amount / 3), angular: 0.42 };
  if (quality === "fine") return { linear: Math.max(0.025, amount / 12), angular: 0.1 };
  return { linear: Math.max(0.055, amount / 7), angular: 0.2 };
}

/**
 * A body remembers the finest tessellation any earlier edge treatment on it
 * needed. Without this floor, a later fillet with a bigger radius picks a
 * coarser deflection for the WHOLE shape and re-samples an already finely
 * curved region (e.g. the sketch's own rounded corners) more coarsely than it
 * already was - the rippling mesh reported after several sequential fillets.
 */
export function cadModifierTessellationDeflection(
  quality: CadModifierQuality,
  amount: number,
  minDeflection?: CadModifierDeflection,
): CadModifierDeflection {
  const base = cadModifierBaseDeflection(quality, amount);
  if (!minDeflection) return base;
  return {
    linear: Math.min(base.linear, minDeflection.linear),
    angular: Math.min(base.angular, minDeflection.angular),
  };
}
export const CAD_MODIFIER_REQUEST_TIMEOUT_MS = 30_000;
export const CAD_MODIFIER_MAX_PREPARE_TIMEOUT_MS = 180_000;
export const CAD_MODIFIER_MAX_SHARP_ANGLE = 90;

export type CadModifierRequestPhase = "prepare" | "preview";

export function cadTransformRequiresGeneralTransform(transform: number[]) {
  if (transform.length !== 12 || !transform.every(Number.isFinite)) {
    return false;
  }

  const x = [transform[0], transform[4], transform[8]];
  const y = [transform[1], transform[5], transform[9]];
  const z = [transform[2], transform[6], transform[10]];
  const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const xLengthSquared = dot(x, x);
  const yLengthSquared = dot(y, y);
  const zLengthSquared = dot(z, z);
  const scaleSquared = Math.max(xLengthSquared, yLengthSquared, zLengthSquared);
  if (scaleSquared <= 1e-18) {
    return true;
  }

  const tolerance = scaleSquared * 1e-9;
  return (
    Math.abs(dot(x, y)) > tolerance ||
    Math.abs(dot(x, z)) > tolerance ||
    Math.abs(dot(y, z)) > tolerance ||
    Math.abs(xLengthSquared - yLengthSquared) > tolerance ||
    Math.abs(xLengthSquared - zLengthSquared) > tolerance ||
    Math.abs(yLengthSquared - zLengthSquared) > tolerance
  );
}

/**
 * Nach genug Kantenarbeit in einer Sitzung weigert sich der Kernel, ein
 * gespeichertes B-Rep noch einmal zu lesen - dieselbe Zeichenkette, die er eben
 * noch verstanden hat. Der Arbeiter baut ihn dann ab; der naechste Anlauf
 * bekommt einen frischen und kommt durch. Diese Meldung ist das Signal dafuer.
 */
export const CAD_MODIFIER_KERNEL_RESTART_MESSAGE =
  "The CAD kernel ran out of room and was restarted. Wait a moment, then start the edge tool again; no page refresh is needed.";

/**
 * Eine Ausnahme aus dem WebAssembly heraus heisst: nicht dieser eine Aufruf ist
 * schiefgegangen, sondern der Kernel selbst kann nicht mehr. Ein gescheitertes
 * Verrunden - "dieser Radius passt hier nicht" - kommt dagegen als gewoehnliche
 * Meldung und darf den Kernel nicht kosten.
 */
export function isCadModifierKernelExhausted(message: string, errorName = "") {
  return message.includes("WebAssembly.Exception") || isCadModifierWasmMemoryFault(message, errorName);
}

export function isCadModifierWasmMemoryFault(message: string, errorName = "") {
  return (
    /memory access out of bounds|out of bounds memory access|\babort(?:ed)?\b/i.test(message) ||
    /^(?:WebAssembly\.)?RuntimeError$/i.test(errorName)
  );
}

/**
 * Jede Kante bringt ihren Winkel mit; die Schwelle filtert erst im Browser.
 * Bleibt bei der Voreinstellung nichts uebrig, steht der Anwender vor einem
 * Werkzeug, das nichts hervorhebt und nichts sagt - dabei ist bekannt, wie
 * scharf die schaerfste Kante hier ueberhaupt ist. Genau dorthin darf die
 * Schwelle rutschen. Nur eine tangentiale Kante (fast 0 Grad) ist keine Kante
 * mehr, die man verrunden will.
 */
export function rescueSharpAngleForEdges(
  edges: Pick<CadModifierEdge, "angle" | "manifold" | "boundary" | "selectable">[],
  sharpAngle: number,
) {
  const brauchbar = edges.filter((edge) => edge.selectable && edge.manifold && !edge.boundary);
  if (brauchbar.some((edge) => edge.angle + 1e-3 >= sharpAngle)) return null;
  const schaerfste = brauchbar.reduce((groesster, edge) => Math.max(groesster, edge.angle), 0);
  if (schaerfste < 1) return null;
  return Math.max(1, Math.floor(schaerfste));
}

export function defaultCadModifierTangentChain(appliedFeatureCount: number) {
  return appliedFeatureCount === 0;
}

export function cadModifierTopologyEdgeIsSelectable(
  edge: Pick<CadModifierEdge, "manifold" | "boundary" | "points">,
) {
  return edge.manifold && !edge.boundary && edge.points.length >= 6;
}

export function selectableCadModifierEdge(
  edge: Pick<CadModifierEdge, "display" | "selectable" | "manifold" | "boundary" | "angle">,
  sharpAngle: number,
) {
  return edge.selectable && edge.manifold && !edge.boundary && edge.angle + 1e-3 >= sharpAngle;
}

/**
 * Dieselbe Kante, ohne die Schwelle - jede Kante, die grundsaetzlich
 * verrundbar waere, unabhaengig davon, ob der Schieberegler sie gerade
 * zeigt. Damit bleibt eine feinere Kante als die Vorgabe im 3D-Bild sicht-
 * und anklickbar, statt bis zum manuellen Verschieben des Reglers unsichtbar
 * zu sein (Forum: "Verrundung funktioniert manchmal erst, nachdem man den
 * Schieberegler bewegt hat").
 */
export function cadModifierCandidateEdge(
  edge: Pick<CadModifierEdge, "selectable" | "manifold" | "boundary">,
) {
  return edge.selectable && edge.manifold && !edge.boundary;
}

export function edgeModifierSelectionStatus(prepared: boolean, selectedCount: number, availableCount: number) {
  return prepared
    ? t("edge.selectionStatus", { selected: selectedCount, available: availableCount })
    : t("edge.preparing");
}

/**
 * Was das Vorbereiten eines Netzes wirklich kostet, gemessen am 19.09.2026 auf
 * HENMEDIA:
 *
 * | Dreiecke | naehen und heilen | Kanten einsammeln | gesamt |
 * |---------:|------------------:|------------------:|-------:|
 * |      400 |             0,5 s |             0,1 s |  0,6 s |
 * |    2 208 |             3,6 s |             3,0 s |  6,6 s |
 * |    3 806 |             5,7 s |             5,0 s | 11,1 s |
 * |   13 304 |            20,0 s |           107,5 s |  128 s |
 *
 * Das Naehen waechst linear mit der Dreieckszahl, das Einsammeln der Kanten
 * quadratisch: jede Kante wird gegen die Flaechen ihrer Nachbarschaft
 * gehalten. Die alte Schaetzung war linear - deshalb lief die Wache bei
 * jedem groesseren Netz ab, lange bevor die Arbeit fertig war.
 */
export function cadModifierPrepareCostMs(meshTriangleCount: number) {
  const triangles = Math.max(0, meshTriangleCount);
  return 1.5 * triangles + 6.1e-4 * triangles * triangles;
}
// Die Schaetzung ist eine Untergrenze: sie stammt aus Einzelmessungen an einem
// frischen Kern. Wer den Faktor unten anfasst, sollte das wissen.

/**
 * Oberhalb dieser Dreieckszahl wird gar nicht erst angefangen.
 *
 * Die Zahl steht dort, wo die Messung umschlaegt: 3 806 Dreiecke waren nach
 * 11 s fertig, 7 612 nach vier Minuten immer noch nicht - und das als vierter
 * Aufruf derselben Seitensitzung, also genau so, wie ein Mensch arbeitet. Der
 * Kern wird im Lauf einer Sitzung langsamer (siehe die Kernel-Grenze), deshalb
 * ist der isoliert gemessene Einzelwert die freundlichste Lesart, nicht die
 * wahrscheinlichste.
 *
 * Das ist keine Verschaerfung: mit der alten, linearen Schaetzung lief die
 * Wache bei dieser Groesse laengst ab. Neu ist nur, dass die Absage sofort
 * kommt und ihren Grund nennt, statt nach zwei Minuten als Zeitueberschreitung.
 * Eine tessellierte Wendel hat obendrein so viele Dreieckskanten, dass unter
 * ihnen keine Kopfkante mehr zu finden waere - 14 845 Stueck bei Fraterculas
 * Schraube.
 */
export const CAD_MODIFIER_PREPARE_TRIANGLE_LIMIT = 4_000;

export function cadModifierPrepareTimeoutMs(meshTriangleCount: number) {
  if (!Number.isFinite(meshTriangleCount) || meshTriangleCount <= 0) {
    return CAD_MODIFIER_REQUEST_TIMEOUT_MS;
  }
  // Der Faktor ist fuer langsamere Rechner da: die Messung stammt von einem
  // schnellen, Fraterculas Laptop braucht ein Mehrfaches.
  const meshPreparationBudget = cadModifierPrepareCostMs(Math.floor(meshTriangleCount)) * 2.5;
  return Math.min(
    CAD_MODIFIER_MAX_PREPARE_TIMEOUT_MS,
    Math.max(60_000, Math.ceil(meshPreparationBudget)),
  );
}

export function cadModifierTimeoutMessage(phase: CadModifierRequestPhase) {
  if (phase === "preview") {
    return "The edge preview timed out. Cancel the tool and try again.";
  }
  return "Edge preparation timed out. This mesh needs more CAD processing than the interactive limit allows. Try a repaired or lower-detail STL.";
}

export function cadModifierWorkerFailureMessage() {
  return "The CAD worker could not start. Update to Firefox 121+, Chrome/Brave 114+, or Safari 17.2+, then try again.";
}

/**
 * Wandelt rohe Fehlermeldungen des CAD-Workers (z. B. geometrische Kollisionen
 * bei OpenCASCADE, Timeouts oder Worker-Ausfälle) in verständliche, lokalisierte
 * Hinweistexte für die Benutzeroberfläche um.
 */
export function cadModifierUserErrorMessage(rawError: string | null | undefined): string | null {
  if (!rawError) return null;
  if (rawError.includes("creates invalid or overlapping edge geometry")) {
    return t("edge.errorOverlappingGeometry");
  }
  if (rawError.includes("The group has no solid body to modify")) {
    return t("edge.errorNoSolidBody");
  }
  if (rawError.includes("Edge preparation timed out")) {
    return t("edge.errorPrepareTimeout");
  }
  if (rawError.includes("The edge preview timed out")) {
    return t("edge.errorPreviewTimeout");
  }
  if (
    rawError.includes("The CAD worker could not start") ||
    rawError.includes("The CAD worker was closed") ||
    rawError.includes("CAD worker could not start")
  ) {
    return t("edge.errorWorkerFailed");
  }
  return rawError;
}
