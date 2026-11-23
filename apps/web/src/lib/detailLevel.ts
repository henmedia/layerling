/**
 * The detail level of a view: one slider in the view bar that puts away the aids drawn around the model - notes, plate
 * labels, distances, dimensions, the axis arrows, the grid - step by step. It lies over the settings as a mask and is
 * kept in this browser: a design and its settings never change with it, and no tool works differently because an aid
 * is not drawn (snapping goes on without its guide lines). The editor and the sketch each have their own.
 */

export type DetailView = "editor" | "sketch";

export const DETAIL_LEVELS = [1, 2, 3, 4, 5] as const;
export type DetailLevel = (typeof DETAIL_LEVELS)[number];
export const FULL_DETAIL: DetailLevel = 5;

/** Every aid the level can put away, in the order of the switches, with the lowest level that still shows it. */
const DETAIL_ITEMS = {
  editor: { notes: 5, plateLabels: 5, referencePoints: 4, distances: 4, dimensions: 3, snapGuides: 3, axes: 3, grid: 2 },
  sketch: { notes: 5, partEdges: 4, measurements: 3, grid: 2 },
} as const;

export type EditorDetail = keyof (typeof DETAIL_ITEMS)["editor"];
export type SketchDetail = keyof (typeof DETAIL_ITEMS)["sketch"];
export type DetailItem = EditorDetail | SketchDetail;

export function detailItems(view: "editor"): EditorDetail[];
export function detailItems(view: "sketch"): SketchDetail[];
export function detailItems(view: DetailView): DetailItem[];
export function detailItems(view: DetailView): DetailItem[] {
  return Object.keys(DETAIL_ITEMS[view]) as DetailItem[];
}

/** The level last picked, and what the switches changed since: with any change it is a choice of one's own. */
export type DetailState = { level: DetailLevel; own: Partial<Record<DetailItem, boolean>> };

export function isDetailLevel(value: unknown): value is DetailLevel {
  return (DETAIL_LEVELS as readonly unknown[]).includes(value);
}

function levelShows(view: DetailView, level: DetailLevel, item: DetailItem) {
  const lowest = (DETAIL_ITEMS[view] as Partial<Record<DetailItem, number>>)[item];
  return lowest === undefined || level >= lowest;
}

export function detailShows(view: DetailView, state: DetailState, item: DetailItem) {
  return state.own[item] ?? levelShows(view, state.level, item);
}

export function isOwnDetail(state: DetailState) {
  return Object.keys(state.own).length > 0;
}

/** A switch of its own: what equals the level anyway is not kept, so switching back leaves the plain level. */
export function withDetail(view: DetailView, state: DetailState, item: DetailItem, shown: boolean): DetailState {
  const own = { ...state.own };
  if (levelShows(view, state.level, item) === shown) delete own[item];
  else own[item] = shown;
  return { level: state.level, own };
}

export function normalizeDetailState(view: DetailView, value: unknown): DetailState {
  const candidate = value && typeof value === "object" ? (value as Partial<DetailState>) : {};
  let state: DetailState = { level: isDetailLevel(candidate.level) ? candidate.level : FULL_DETAIL, own: {} };
  const own = candidate.own && typeof candidate.own === "object" ? candidate.own : {};
  detailItems(view).forEach((item) => {
    const shown = own[item];
    if (typeof shown === "boolean") state = withDetail(view, state, item, shown);
  });
  return state;
}

/** Which aids are drawn. A stable object per state, so effects can depend on it. */
export type DetailFlags<Item extends DetailItem = DetailItem> = Readonly<Record<Item, boolean>>;

export function detailFlags(view: DetailView, state: DetailState, peeking = false): DetailFlags {
  return Object.fromEntries(detailItems(view).map((item) => [item, peeking || detailShows(view, state, item)])) as DetailFlags;
}

const storageKey = (view: DetailView) => `layerling.detailLevel.${view}`;

type Snapshot = { state: DetailState; peeking: boolean; flags: DetailFlags };

const snapshotOf = (view: DetailView, state: DetailState, peeking = false): Snapshot => ({ state, peeking, flags: detailFlags(view, state, peeking) });

/** What the server draws, and the first drawing in the browser. */
const FULL: Record<DetailView, Snapshot> = {
  editor: snapshotOf("editor", { level: FULL_DETAIL, own: {} }),
  sketch: snapshotOf("sketch", { level: FULL_DETAIL, own: {} }),
};
const current: Record<DetailView, Snapshot | null> = { editor: null, sketch: null };
const listeners = new Set<() => void>();

function readStored(view: DetailView): DetailState {
  try {
    const stored = window.localStorage.getItem(storageKey(view));
    return normalizeDetailState(view, stored ? JSON.parse(stored) : null);
  } catch {
    return normalizeDetailState(view, null);
  }
}

export function detailSnapshot(view: DetailView): Snapshot {
  if (typeof window === "undefined") return FULL[view];
  return (current[view] ??= snapshotOf(view, readStored(view)));
}

export function fullDetailSnapshot(view: DetailView): Snapshot {
  return FULL[view];
}

function change(view: DetailView, next: Snapshot, store: boolean) {
  current[view] = next;
  if (store) {
    try {
      const plain = next.state.level === FULL_DETAIL && !isOwnDetail(next.state);
      if (plain) window.localStorage.removeItem(storageKey(view));
      else window.localStorage.setItem(storageKey(view), JSON.stringify(next.state));
    } catch {
      // Without storage the level still holds for this visit.
    }
  }
  listeners.forEach((listener) => listener());
}

export function setDetailLevel(view: DetailView, level: DetailLevel) {
  change(view, snapshotOf(view, { level, own: {} }, detailSnapshot(view).peeking), true);
}

export function setDetail(view: DetailView, item: DetailItem, shown: boolean) {
  const { state, peeking } = detailSnapshot(view);
  if (detailShows(view, state, item) === shown) return;
  change(view, snapshotOf(view, withDetail(view, state, item, shown), peeking), true);
}

/** While the key is held everything shows; nothing is kept of it. */
export function setDetailPeek(view: DetailView, peeking: boolean) {
  const { state, peeking: before } = detailSnapshot(view);
  if (before !== peeking) change(view, snapshotOf(view, state, peeking), false);
}

export function subscribeDetail(listener: () => void) {
  listeners.add(listener);
  // Another tab of this browser moved its slider.
  const onStorage = (event: StorageEvent) => {
    (["editor", "sketch"] as const).forEach((view) => {
      if (event.key === null || event.key === storageKey(view)) current[view] = snapshotOf(view, readStored(view), current[view]?.peeking);
    });
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}
