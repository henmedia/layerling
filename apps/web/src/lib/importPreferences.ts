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
 * The size an SVG or a picture is to come in at (#448), typed in the import window: its width, or its height if
 * that is ticked (Discussion #2121). Left to itself it is for the next import only and is kept in memory, not in
 * storage: a size from last week must not surprise anyone. With "keep" ticked it stays for the imports that follow,
 * and then it is kept in the browser too, as the tick says. Null means the drawing's own size.
 */
export type ImportSvgSize = { value: number | null; height: boolean; keep: boolean };

const IMPORT_SVG_SIZE_KEY = "layerling.importSvgSize";
let pendingSvgSize: ImportSvgSize | null = null;

function validSize(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

/** What the browser keeps of a size that was ticked to stay; nothing when none is kept or storage is blocked. */
function storedSvgSize(): ImportSvgSize | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = JSON.parse(window.localStorage.getItem(IMPORT_SVG_SIZE_KEY) ?? "null") as { value?: unknown; height?: unknown } | null;
    const value = validSize(stored?.value);
    return value ? { value, height: stored?.height === true, keep: true } : null;
  } catch {
    return null;
  }
}

/** The size as the import window shows it: the one typed in this visit, else the one that was ticked to stay. */
export function readImportSvgSize(): ImportSvgSize {
  if (!pendingSvgSize) pendingSvgSize = storedSvgSize() ?? { value: null, height: false, keep: false };
  return pendingSvgSize;
}

export function setImportSvgSize(size: ImportSvgSize) {
  const value = validSize(size.value);
  pendingSvgSize = { value, height: size.height === true, keep: size.keep === true };
  if (typeof window === "undefined") return;
  try {
    if (pendingSvgSize.keep && value) window.localStorage.setItem(IMPORT_SVG_SIZE_KEY, JSON.stringify({ value, height: pendingSvgSize.height }));
    else window.localStorage.removeItem(IMPORT_SVG_SIZE_KEY);
  } catch {
    // The size still holds for this visit.
  }
}

/**
 * The size for the import that is running, as a width or a height. Without "keep" it is gone afterwards: the import
 * that takes it is the one it was typed for.
 */
export function takeImportSvgSize(): { svgWidth: number | null; svgHeight: number | null } {
  const size = readImportSvgSize();
  if (!size.keep) pendingSvgSize = { ...size, value: null };
  return { svgWidth: size.height ? null : size.value, svgHeight: size.height ? size.value : null };
}

/** The width alone, as before the height and the tick came: for callers that know nothing of them. */
export function setImportSvgWidth(width: number | null) {
  setImportSvgSize({ value: width, height: false, keep: false });
}

export function readImportSvgWidth(): number | null {
  const size = readImportSvgSize();
  return size.height ? null : size.value;
}

export function takeImportSvgWidth(): number | null {
  return takeImportSvgSize().svgWidth;
}

