import { queryTokens, searchWords, wordHolds } from "@/lib/commandSearch";

/**
 * The search of the settings window. It reads what the window shows - label, hint and choices of every row - so a new
 * setting is found without being entered anywhere, in every language of the interface. The words it is also known by
 * come from settingsKeywords.ts.
 */

/** Wrappers that hold several settings: each setting inside is found on its own. */
const CONTAINERS = [
  ".workspace-dimensions",
  ".workspace-shape-card",
  ".workspace-shape-dimensions",
  ".workspace-shape-specials",
  ".workspace-shape-special-fields",
  ".workspace-backup-settings",
  ".ribbon-buttons-setting",
  ".ribbon-buttons-group",
  ".ribbon-buttons-tools",
].join(",");

/** The heading of a wrapper: shown with every hit inside, and a hit itself. */
const HEADINGS = [".workspace-shape-card-heading", ".workspace-shape-specials-heading", ".ribbon-buttons-head", "summary"].join(",");

/** Belongs to the setting above it: searched, shown and counted with it. */
const FOLLOWERS = ["p", ".workspace-history-custom"].join(",");

const SECTION = "[data-settings-section]";
const SECTION_HEADING = ".workspace-section-heading";
const HIGHLIGHT_NAME = "layerling-settings-search";
/** How many matching choices of a menu are named under it. */
const MAX_NAMED_OPTIONS = 3;

export const SETTINGS_SEARCH_ATTRIBUTES = {
  hidden: "data-search-hidden",
  hit: "data-search-hit",
  options: "data-search-options",
  opened: "data-search-opened",
} as const;
const ATTR = SETTINGS_SEARCH_ATTRIBUTES;

export type SettingsSearchCounts = Record<string, number>;

/** The words of a text, remembered: the list of printers alone is hundreds of texts, asked for at every key. */
const wordCache = new Map<string, string[]>();
function cachedWords(text: string): string[] {
  let found = wordCache.get(text);
  if (!found) {
    if (wordCache.size > 4000) wordCache.clear();
    found = searchWords(text);
    wordCache.set(text, found);
  }
  return found;
}

const holds = (text: string, spellings: readonly string[]) => cachedWords(text).some((word) => spellings.some((token) => wordHolds(word, token)));

/**
 * Whether a setting matches: every typed word stands in its text, or the words its text leaves over stand together in
 * one of its choices ("printer bambu"). Those choices are named. `null`: no match.
 */
export function matchSetting(query: string, text: string, options: readonly string[]): { options: string[] } | null {
  const tokens = queryTokens(query);
  if (tokens.length === 0) return null;
  const rest = tokens.filter((spellings) => !holds(text, spellings));
  if (rest.length === 0) return { options: [] };
  const found = options.filter((option) => rest.every((spellings) => holds(option, spellings)));
  return found.length > 0 ? { options: found } : null;
}

/** The places of a text that answer the query, for marking them. */
export function matchRanges(query: string, text: string): Array<[number, number]> {
  const tokens = queryTokens(query).flat();
  const ranges: Array<[number, number]> = [];
  for (const match of text.matchAll(/[\p{L}\p{N}\p{M}]+/gu)) {
    const word = match[0];
    const spellings = cachedWords(word);
    const token = tokens.find((entry) => spellings.some((spelling) => wordHolds(spelling, entry)));
    if (token === undefined) continue;
    const lower = word.toLowerCase();
    // A word whose spelling was folded ("Fläche" for "flaeche") has no such place in it: the whole word is marked.
    const at = lower.indexOf(token);
    if (at >= 0 && lower.length === word.length) ranges.push([match.index + at, match.index + at + token.length]);
    else ranges.push([match.index, match.index + word.length]);
  }
  return ranges;
}

function textNodes(root: Element): Text[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    if (node.data.trim() && !node.parentElement?.closest("option, optgroup")) nodes.push(node);
  }
  return nodes;
}

function rowTexts(element: Element): string[] {
  const texts = textNodes(element).map((node) => node.data);
  for (const entry of [element, ...element.querySelectorAll("[data-help], [title]")]) {
    if (entry.matches(".ribbon-buttons-move, .guide-help-link")) continue;
    // The fields of a shape carry the name of their tab as help, which would find all of them.
    const help = entry.closest(".workspace-shape-card") ? null : entry.getAttribute("data-help");
    if (help) texts.push(help);
    const title = entry.getAttribute("title");
    if (title) texts.push(title);
  }
  return texts;
}

const optionTexts = (elements: readonly Element[]) =>
  elements.flatMap((element) => [...element.querySelectorAll("option")].map((option) => option.textContent?.trim() ?? "")).filter(Boolean);

type Row = { element: Element; followers: Element[] };

const rowElements = (row: Row) => [row.element, ...row.followers];

export type SettingsSearchOptions = {
  query: string;
  /** "filter" shows the hits alone, "mark" leaves everything and marks them. */
  mode: "filter" | "mark";
  /** Extra words of a setting, by the texts it shows (its label, its help). */
  keywords: ReadonlyMap<string, readonly string[]>;
  /** What was shown for this query already: a setting does not vanish because changing it changed its hint. */
  kept: WeakSet<Element>;
};

/** Takes every trace of the search off the window again. */
export function clearSettingsSearch(root: Element) {
  for (const element of root.querySelectorAll(`[${ATTR.hidden}], [${ATTR.hit}], [${ATTR.options}]`)) {
    element.removeAttribute(ATTR.hidden);
    element.removeAttribute(ATTR.hit);
    element.removeAttribute(ATTR.options);
  }
  setHighlights([]);
}

/** Folds the groups the search opened shut again, except those that still hold a hit. */
export function closeSearchOpened(root: Element, except: ReadonlySet<Element> = new Set()) {
  for (const details of root.querySelectorAll<HTMLDetailsElement>(`details[${ATTR.opened}]`)) {
    if (except.has(details)) continue;
    details.open = false;
    details.removeAttribute(ATTR.opened);
  }
}

type HighlightRegistry = { set(name: string, value: unknown): void; delete(name: string): void };

/** Marks ranges without touching the DOM React owns. A browser without the interface shows the hits unmarked. */
function setHighlights(ranges: Range[]) {
  const registry = typeof CSS === "undefined" ? undefined : (CSS as unknown as { highlights?: HighlightRegistry }).highlights;
  const HighlightClass = (globalThis as unknown as { Highlight?: new (...ranges: Range[]) => unknown }).Highlight;
  if (!registry || !HighlightClass) return;
  if (ranges.length === 0) registry.delete(HIGHLIGHT_NAME);
  else registry.set(HIGHLIGHT_NAME, new HighlightClass(...ranges));
}

/** Searches every section shown and returns the number of hits of each. */
export function applySettingsSearch(root: Element, { query, mode, keywords, kept }: SettingsSearchOptions): SettingsSearchCounts {
  clearSettingsSearch(root);
  const filter = mode === "filter";
  const counts: SettingsSearchCounts = {};
  const ranges: Range[] = [];
  const openWith = new Set<Element>();
  const hide = (element: Element) => {
    if (filter) element.setAttribute(ATTR.hidden, "");
  };
  const markWords = (element: Element) => {
    for (const node of textNodes(element)) {
      for (const [from, to] of matchRanges(query, node.data)) {
        const range = document.createRange();
        range.setStart(node, from);
        range.setEnd(node, to);
        ranges.push(range);
      }
    }
  };
  const mark = (element: Element) => {
    element.setAttribute(ATTR.hit, "");
    markWords(element);
  };
  const hits = (row: Row): boolean => {
    const elements = rowElements(row);
    const texts = elements.flatMap(rowTexts);
    const extra = texts.flatMap((text) => keywords.get(text.trim()) ?? []);
    const match = matchSetting(query, [...texts, ...extra].join(" "), optionTexts(elements));
    if (!match) return kept.has(row.element);
    if (match.options.length > 0) {
      const named = match.options.slice(0, MAX_NAMED_OPTIONS).join(", ");
      row.element.setAttribute(ATTR.options, match.options.length > MAX_NAMED_OPTIONS ? `${named}, …` : named);
    }
    kept.add(row.element);
    return true;
  };
  /** How many settings of this wrapper match. */
  const search = (container: Element): number => {
    const headings: Element[] = [];
    const rows: Row[] = [];
    const inner: Element[] = [];
    let last: Row | null = null;
    for (const child of container.children) {
      if (child.matches(SECTION_HEADING)) continue;
      if (child.matches("hr")) {
        hide(child);
      } else if (child.matches(HEADINGS)) {
        headings.push(child);
      } else if (child.matches(CONTAINERS)) {
        inner.push(child);
        last = null;
      } else if (last && child.matches(FOLLOWERS)) {
        last.followers.push(child);
      } else {
        last = { element: child, followers: [] };
        rows.push(last);
      }
    }
    let count = 0;
    for (const row of rows) {
      if (hits(row)) {
        count += 1;
        rowElements(row).forEach(mark);
      } else {
        rowElements(row).forEach(hide);
      }
    }
    for (const element of inner) count += search(element);
    if (count > 0 && container instanceof HTMLDetailsElement) {
      openWith.add(container);
      // Opened once: a group the user folds shut stays shut.
      if (!container.open && !container.hasAttribute(ATTR.opened)) {
        container.setAttribute(ATTR.opened, "");
        container.open = true;
      }
    }
    for (const element of headings) {
      if (!hits({ element, followers: [] })) continue;
      count += 1;
      mark(element);
    }
    if (count === 0) hide(container);
    return count;
  };
  for (const section of root.querySelectorAll(SECTION)) {
    let count = search(section);
    const title = section.querySelector(`${SECTION_HEADING} strong`);
    // Typed the name of a tab: the whole of it, when nothing in it goes by that name.
    if (count === 0 && title && matchSetting(query, title.textContent ?? "", [])) {
      for (const element of [section, ...section.querySelectorAll(`[${ATTR.hidden}]`)]) element.removeAttribute(ATTR.hidden);
      count = 1;
    }
    if (count > 0 && title) markWords(title);
    counts[section.getAttribute("data-settings-section") ?? ""] = count;
  }
  closeSearchOpened(root, openWith);
  setHighlights(ranges);
  return counts;
}
