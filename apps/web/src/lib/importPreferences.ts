/**
 * What the import window remembers between visits. Browser storage may be blocked, so every read
 * and write is guarded and the import works without it.
 */
const KEEP_SVG_PAGE_KEY = "layerling.importKeepSvgPage";

/** Whether an imported SVG keeps its place on its page, so the files of one page line up (#258). */
export function readKeepSvgPage(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(KEEP_SVG_PAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function storeKeepSvgPage(keep: boolean) {
  if (typeof window === "undefined") return;
  try {
    if (keep) window.localStorage.setItem(KEEP_SVG_PAGE_KEY, "1");
    else window.localStorage.removeItem(KEEP_SVG_PAGE_KEY);
  } catch {
    // The choice still holds for this visit.
  }
}

const KEEP_MESH_POSITION_KEY = "layerling.importKeepMeshPosition";

/**
 * Whether an imported STL, OBJ or 3MF keeps the position it has in its file, so the parts of one model, exported as
 * separate files, fit together again when they are imported one after the other (Issue #1939).
 */
export function readKeepMeshPosition(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(KEEP_MESH_POSITION_KEY) === "1";
  } catch {
    return false;
  }
}

export function storeKeepMeshPosition(keep: boolean) {
  if (typeof window === "undefined") return;
  try {
    if (keep) window.localStorage.setItem(KEEP_MESH_POSITION_KEY, "1");
    else window.localStorage.removeItem(KEEP_MESH_POSITION_KEY);
  } catch {
    // The choice still holds for this visit.
  }
}

/** What an imported body starts with when its file gives it no colour. */
export const DEFAULT_IMPORT_COLOR = "#0098c7";
const IMPORT_COLOR_KEY = "layerling.importColor";

/** The colour chosen in the import window for bodies whose file gives them none (Discussion #2079). */
export function readImportColor(): string {
  if (typeof window === "undefined") return DEFAULT_IMPORT_COLOR;
  try {
    const stored = window.localStorage.getItem(IMPORT_COLOR_KEY) ?? "";
    return /^#[0-9a-f]{6}$/i.test(stored) ? stored.toLowerCase() : DEFAULT_IMPORT_COLOR;
  } catch {
    return DEFAULT_IMPORT_COLOR;
  }
}

export function storeImportColor(color: string) {
  if (typeof window === "undefined") return;
  try {
    if (/^#[0-9a-f]{6}$/i.test(color) && color.toLowerCase() !== DEFAULT_IMPORT_COLOR) window.localStorage.setItem(IMPORT_COLOR_KEY, color.toLowerCase());
    else window.localStorage.removeItem(IMPORT_COLOR_KEY);
  } catch {
    // Without storage the next import starts with the usual colour.
  }
}

/*
 * The width an SVG or a picture is to come in at (#448), typed in the import window. It is for the
 * next import only and is kept in memory, not in storage: a size from last week must not surprise
 * anyone. Null means the drawing's own size.
 */
let pendingSvgWidth: number | null = null;

export function setImportSvgWidth(width: number | null) {
  pendingSvgWidth = width !== null && Number.isFinite(width) && width > 0 ? width : null;
}

export function readImportSvgWidth(): number | null {
  return pendingSvgWidth;
}

/** The pending width, and gone: the import that takes it is the one it was typed for. */
export function takeImportSvgWidth(): number | null {
  const width = pendingSvgWidth;
  pendingSvgWidth = null;
  return width;
}

