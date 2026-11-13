/**
 * Der Fehlerbericht: eine gewoehnliche .lyl, in der zusaetzlich diese
 * Textdatei liegt. So reicht ein einziger Anhang im Forum oder bei GitHub -
 * er oeffnet sich direkt in layerling und sagt trotzdem, unter welchen
 * Umstaenden es passiert ist (Forum 617200: ohne die Datei war die Drehung
 * nicht nachzustellen).
 *
 * Persoenliches steht nicht darin: kein Name, keine Adresse, keine Pfade.
 */

export const BUG_REPORT_FILE = "layerling-report.txt";
export const BUG_REPORT_EVENT_LIMIT = 40;

export type BugReportEvent = { at: number; text: string };

/** An error from outside the editor for the report's Errors, such as a save the browser refused (#1639). */
export const BUG_REPORT_ERROR_EVENT = "layerling:report-error";

export function reportBugReportError(text: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<string>(BUG_REPORT_ERROR_EVENT, { detail: text }));
}

export type BugReportInfo = {
  version: string;
  createdAt: number;
  language: string;
  userAgent: string;
  screen: { width: number; height: number; pixelRatio: number };
  viewport: { width: number; height: number };
  touch: boolean;
  webgl: string;
  unit: string;
  printer: string;
  shapeCount: number;
  shapeKinds: Record<string, number>;
  selectedCount: number;
  workplane: string;
  openGroup: boolean;
  sketchActive: boolean;
  notices: readonly BugReportEvent[];
  errors: readonly BugReportEvent[];
};

/** Haengt ein Ereignis an und behaelt nur die letzten; eine Wiederholung zaehlt nicht doppelt. */
export function rememberBugReportEvent(list: BugReportEvent[], text: string, at = Date.now(), limit = BUG_REPORT_EVENT_LIMIT): BugReportEvent[] {
  const trimmed = text.trim();
  if (!trimmed || list.at(-1)?.text === trimmed) return list;
  return [...list, { at, text: trimmed.slice(0, 500) }].slice(-limit);
}

function clock(at: number) {
  return new Date(at).toISOString().replace("T", " ").slice(0, 19);
}

/** Der Text der Berichtsdatei, auf Englisch, damit ihn auch ein Mitwirkender von GitHub liest. */
export function bugReportText(info: BugReportInfo): string {
  const kinds = Object.entries(info.shapeKinds).sort(([a], [b]) => a.localeCompare(b)).map(([kind, count]) => `${kind} ${count}`).join(", ") || "none";
  const events = (list: readonly BugReportEvent[]) => (list.length ? list.map((event) => `  ${clock(event.at)}  ${event.text}`).join("\n") : "  (none)");
  return [
    "layerling bug report",
    "====================",
    "",
    `Version:      ${info.version}`,
    `Created:      ${clock(info.createdAt)} UTC`,
    `Language:     ${info.language}`,
    `Browser:      ${info.userAgent}`,
    `Screen:       ${info.screen.width} x ${info.screen.height} @ ${info.screen.pixelRatio}x, window ${info.viewport.width} x ${info.viewport.height}${info.touch ? ", touch" : ""}`,
    `Graphics:     ${info.webgl || "unknown"}`,
    `Unit:         ${info.unit}`,
    `Printer:      ${info.printer || "none"}`,
    "",
    `Objects:      ${info.shapeCount} (${kinds})`,
    `Selected:     ${info.selectedCount}`,
    `Workplane:    ${info.workplane}`,
    `Open group:   ${info.openGroup ? "yes" : "no"}`,
    `Sketch mode:  ${info.sketchActive ? "yes" : "no"}`,
    "",
    "Last messages:",
    events(info.notices),
    "",
    "Errors:",
    events(info.errors),
    "",
    "The design itself is the .lyl around this file: open it in layerling.",
    "",
  ].join("\n");
}
