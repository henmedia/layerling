/**
 * What the title block of a 2D drawing says besides the design's name (forum, Lofo): the drawing number and
 * the revision belong to the design, so they are kept per design, beside it in the browser and in a `.lyl`
 * file, like its saved views; who drew it is the person at this browser, so the name is kept once for all
 * designs. None of it is in the undo history, and the date is always the day of the export.
 */
export type DesignDrawingInfo = { number: string; revision: string };
export type DrawingInfo = DesignDrawingInfo & { drawnBy: string };

/** The longest text a field takes; the title block shrinks longer text to fit its cell. */
export const DRAWING_INFO_MAX_LENGTH = 40;

const DESIGN_DRAWING_INFO_STORAGE_PREFIX = "layerling.drawingInfo.";
const DRAWN_BY_STORAGE_KEY = "layerling.drawing.drawnBy";

/** One field as typed: one line, trimmed, at most DRAWING_INFO_MAX_LENGTH characters. */
export function drawingInfoText(value: unknown): string {
  if (typeof value !== "string") return "";
  return Array.from(value.replace(/[\u0000-\u001f\u007f]+/g, " ").trim()).slice(0, DRAWING_INFO_MAX_LENGTH).join("").trim();
}

/** The number and revision read from storage or a file, or null when both are empty. */
export function normalizeDesignDrawingInfo(value: unknown): DesignDrawingInfo | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const info = { number: drawingInfoText(raw.number), revision: drawingInfoText(raw.revision) };
  return info.number || info.revision ? info : null;
}

export function readDesignDrawingInfo(projectId: string | null | undefined): DesignDrawingInfo {
  const empty = { number: "", revision: "" };
  if (!projectId) return empty;
  try {
    const stored = window.localStorage.getItem(DESIGN_DRAWING_INFO_STORAGE_PREFIX + projectId);
    return (stored ? normalizeDesignDrawingInfo(JSON.parse(stored)) : null) ?? empty;
  } catch {
    return empty;
  }
}

export function writeDesignDrawingInfo(projectId: string | null | undefined, info: DesignDrawingInfo | null) {
  if (!projectId) return;
  try {
    const kept = normalizeDesignDrawingInfo(info);
    if (kept) window.localStorage.setItem(DESIGN_DRAWING_INFO_STORAGE_PREFIX + projectId, JSON.stringify(kept));
    else window.localStorage.removeItem(DESIGN_DRAWING_INFO_STORAGE_PREFIX + projectId);
  } catch {
    // Without storage the fields last until the design is left.
  }
}

export function readDrawnBy(): string {
  if (typeof window === "undefined") return "";
  try {
    return drawingInfoText(window.localStorage.getItem(DRAWN_BY_STORAGE_KEY));
  } catch {
    return "";
  }
}

export function writeDrawnBy(name: string) {
  try {
    const kept = drawingInfoText(name);
    if (kept) window.localStorage.setItem(DRAWN_BY_STORAGE_KEY, kept);
    else window.localStorage.removeItem(DRAWN_BY_STORAGE_KEY);
  } catch {
    // Without storage the name has to be typed again next time.
  }
}

/** The number, revision and name a drawing of this design gets now: what is kept, with any field given overriding it. */
export function drawingInfoFor(projectId: string | null | undefined, given: Partial<DrawingInfo> = {}): DrawingInfo {
  const kept = readDesignDrawingInfo(projectId);
  return {
    number: given.number !== undefined ? drawingInfoText(given.number) : kept.number,
    revision: given.revision !== undefined ? drawingInfoText(given.revision) : kept.revision,
    drawnBy: given.drawnBy !== undefined ? drawingInfoText(given.drawnBy) : readDrawnBy(),
  };
}

/** The paper the printer takes, A4 or A3: the PDF drawing is laid out on pages of it, still 1:1. */
export type DrawingPrintPaper = "A4" | "A3";
const PRINT_PAPER_STORAGE_KEY = "layerling.drawingPrintPaper";

export function readDrawingPrintPaper(): DrawingPrintPaper {
  if (typeof window === "undefined") return "A4";
  try {
    return window.localStorage.getItem(PRINT_PAPER_STORAGE_KEY) === "A3" ? "A3" : "A4";
  } catch {
    return "A4";
  }
}

export function writeDrawingPrintPaper(paper: DrawingPrintPaper) {
  try {
    window.localStorage.setItem(PRINT_PAPER_STORAGE_KEY, paper);
  } catch {
    // Without storage the paper is chosen again next time.
  }
}
