import { LANGUAGE_INFO, type Language } from "@/lib/languages";
import { guideHref, type GuideSection } from "@/lib/guideLinks";
import { getLanguage, t } from "@/lib/i18n";
import {
  guideFold,
  guidePrepare,
  guideSearch,
  type GuideHit,
  type GuidePrepared,
  type GuideSearchEntry,
} from "@/lib/guideSearchCore";
import { hoverTitleOf } from "@/lib/penHoverTip";

/**
 * Interactive Help: from an element of the program to the part of the user guide that is about it.
 *
 * The guide writes the names of buttons and fields as `{{ui:key}}`, so they are the visible labels
 * of the program in every language. An element is therefore looked up by its own name - its
 * accessible name, or `data-help` where that is poor - in the guide's search index, with the same
 * matching the guide's search box uses (lib/guideSearchCore.ts). This file is the part that needs
 * no screen: reading a name from an element, walking up to one that has a name, ranking what the
 * index finds.
 */

/** A name longer than this is a sentence, not the name of an element. */
const MAX_NAME_LENGTH = 60;

/** What takes its name from the words written on it. */
const NAMED_BY_TEXT = "button, a, summary, label, legend, option, [role=button], [role=tab], [role=menuitem], [role=radio], [role=switch], [role=checkbox], [role=option]";

/** A panel or window: where the walk up for a name stops looking for a question mark. */
const PANEL = "[role=dialog], .edge-modifier-panel, .workspace-modal-card, [data-help-scope]";

/** The keys at the end of a title - "Import (Ctrl+I)" - are not part of the name. */
const TRAILING_KEYS = /\s*\((?:(?:Ctrl|Strg|Shift|Umschalt|Alt|Cmd|Esc|Enter|Del|Tab|F\d{1,2}|[A-Z0-9])(?:\s*\+\s*(?:Ctrl|Strg|Shift|Umschalt|Alt|Cmd|[A-Z0-9]|F\d{1,2}|Esc|Enter|Del|Tab))*)\)\s*$/;

function clean(text: string | null | undefined): string {
  const collapsed = (text ?? "").replace(/\s+/g, " ").trim().replace(TRAILING_KEYS, "").trim();
  if (!collapsed || collapsed.length > MAX_NAME_LENGTH) return "";
  // A number, a unit or a symbol on its own names nothing.
  if (!/\p{L}/u.test(collapsed)) return "";
  return collapsed;
}

function textOf(element: Element): string {
  // A panel's or a ribbon group's title is its heading, not everything written in it.
  if (element.matches("header, [class*=-header], [data-group]")) {
    const heading = element.querySelector("strong, h1, h2, h3, h4, .toolbar-section-label");
    // A header with no heading in it (the line above a slider holds its name and its unit) names nothing.
    return heading ? clean(heading.textContent) : "";
  }
  return clean(element.textContent);
}

/**
 * The name of an element, or "" when it has none of its own: `data-help` first, then `aria-label`,
 * `aria-labelledby`, `title`, the `<label>` of a field and, for buttons, links and the like, the
 * text written on it. An element with no name of its own is not asked about its children.
 */
export function helpNameOf(element: Element): string {
  const override = clean(element.getAttribute("data-help"));
  if (override) return override;
  // A field inside a label that names it for the help (the label holds its value and options too, which are no name).
  const namedByLabel = element.matches("input, select, textarea") ? clean(element.closest("label[data-help]")?.getAttribute("data-help")) : "";
  if (namedByLabel) return namedByLabel;
  const label = clean(element.getAttribute("aria-label"));
  if (label) return label;
  const labelledBy = element.getAttribute("aria-labelledby");
  if (labelledBy) {
    const owner = element.ownerDocument;
    const text = labelledBy.split(/\s+/).map((id) => owner.getElementById(id)?.textContent ?? "").join(" ");
    const named = clean(text);
    if (named) return named;
  }
  // The installed app holds a title back while its own bubble shows it (#1013).
  const title = clean(hoverTitleOf(element));
  if (title) return title;
  // The label around a slider holds its name, its value and its unit ("Length 30.00 mm"): ask about the name.
  const sliderName = element.matches("input, select, textarea") ? element.closest("label")?.querySelector(".range-property-name") : null;
  if (sliderName) {
    const named = clean(sliderName.textContent);
    if (named) return named;
  }
  const labels = (element as HTMLInputElement).labels;
  if (labels && labels.length > 0) {
    const named = clean(labels[0].textContent);
    if (named) return named;
  }
  // The name of a slider sits in the label around it.
  const wrapping = element.matches("input, select, textarea") ? element.closest("label") : null;
  if (wrapping) {
    const name = wrapping.querySelector(".range-property-name, span");
    const named = clean(name?.textContent ?? wrapping.textContent);
    if (named) return named;
  }
  // The label around a slider holds its name and its unit: the name is the part to ask about.
  if (element.matches("label")) {
    const name = clean(element.querySelector(".range-property-name")?.textContent);
    if (name) return name;
  }
  if (element.matches(NAMED_BY_TEXT) || element.matches("header, [class*=-header], [data-group]")) return textOf(element);
  return "";
}

export type HelpTarget = {
  /** The element the name belongs to: the one that gets the outline. */
  element: Element;
  /** Its name; "" when only a question mark of a panel was found. */
  name: string;
  /** Where the question mark of the panel around it points, if it has one. */
  guideHref: string | null;
  /** The name is only a heading for a part that the guide has a section about: the link is the answer, there is nothing to look up. */
  sectionOnly?: boolean;
};

/** The address a panel's question mark opens, if it has one. */
export function panelGuideHref(element: Element): string | null {
  const panel = element.closest(PANEL);
  const link = panel?.querySelector("a.guide-help-link");
  return link?.getAttribute("href") ?? null;
}

/**
 * The element the user pointed at, and what to ask the guide about it. Walks up from `start` to the
 * nearest element with a name; one that has none is passed over. When nothing on the way up has a
 * name, the question mark of the panel around it stands in; the name stays empty then. Returns null
 * when there is neither.
 */
/** The names a button of a tool window carries that say nothing about the tool: the window's own title answers for them (#424). */
const GENERIC_PANEL_KEYS = [
  "common.cancel", "common.delete", "common.rename", "panel.close", "edge.apply", "edge.clear", "edge.cancelChamfer", "edge.cancelFillet",
  "split.apply", "split.cancelAria", "deleteFace.apply", "deleteFace.cancel", "shell.apply", "shell.cancel", "holePattern.apply", "holePattern.cancel",
  "holePattern.repick", "array.apply", "array.cancel", "faceTool.apply", "faceTool.cancel", "faceTool.repick", "simplify.apply", "mate.apply",
  "mate.cancel", "scalePercent.apply",
] as const;

/** Fields, sliders and the rows around them: they belong to the tool whose window they stand in. */
const PANEL_FIELDS = "input, select, textarea, label, .range-property, [role=slider]";

/**
 * A tool window (a movable panel with a title) answers for the things in it that have no name of their own in the
 * guide: its generic buttons (Cancel, Create, Clear ...), its fields and its sliders. They ask the guide about the
 * window's title, "Chamfer edges" say, and not about "Cancel" or "Depth", which dozens of sections write.
 */
function panelTitleFor(node: Element, name: string): string {
  const panel = node.closest("[data-help-panel]");
  const title = clean(panel?.getAttribute("data-help-panel"));
  if (!panel || !title) return "";
  const folded = guideFold(name);
  const generic = GENERIC_PANEL_KEYS.some((key) => guideFold(t(key)) === folded);
  return generic || node.matches(PANEL_FIELDS) ? title : "";
}

/** The target for a whole part of the program that the guide has a section about, whatever its parts are called. */
const SECTION_NAMES: Record<string, string> = { addShape: "editor.addShape", objectList: "outliner.title", viewCube: "view.cube", cameraBar: "camera.controls", exporting: "panel.export", colorCard: "inspector.shapeColor", shapeSettings: "inspector.properties", rotating: "inspector.rotation" };

function sectionTarget(element: Element, section: string): HelpTarget {
  const key = SECTION_NAMES[section];
  return { element, name: key ? t(key as never) : "", guideHref: guideHref(getLanguage(), undefined, section as GuideSection), sectionOnly: true };
}

export function resolveHelpTarget(start: Element | null, limit?: Element | null): HelpTarget | null {
  if (start?.closest("[data-help-ignore]")) return null;
  // The question mark of a window leads to the part of the guide it points at.
  const question = start?.closest("a.guide-help-link");
  if (question) return { element: question, name: "", guideHref: question.getAttribute("href") };
  // A part whose pieces bring no names of their own (the spectrum of a colour picker) is named by the part.
  const named = start?.closest("[data-help-all]");
  const namedAll = clean(named?.getAttribute("data-help-all"));
  if (start && named && namedAll) {
    return { element: start.closest("button, input, select, label, [role=slider]") ?? named, name: namedAll, guideHref: panelGuideHref(named) };
  }
  // Some places answer as a whole (the shape library, the object list, the view cube): everything in them leads to their section.
  const whole = start?.closest("[data-help-section-all]");
  if (start && whole && !start.closest("[data-help-keep]")) {
    return sectionTarget(start.closest("button, input, select, label, [role=button]") ?? whole, whole.getAttribute("data-help-section-all") ?? "");
  }
  for (let node: Element | null = start; node && node !== limit && node !== node.ownerDocument.documentElement; node = node.parentElement) {
    // A container that the guide has a section about answers for itself, where nothing in it names a closer answer.
    const containerSection = node.getAttribute("data-help-section");
    if (containerSection) return sectionTarget(node, containerSection);
    const name = helpNameOf(node);
    if (name) return { element: node, name: panelTitleFor(node, name) || name, guideHref: panelGuideHref(node) };
  }
  const link = start ? panelGuideHref(start) : null;
  if (!link || !start) return null;
  return { element: start.closest(PANEL) ?? start, name: "", guideHref: link };
}

export type HelpMatch = {
  entry: GuideSearchEntry;
  /** The part of the section about the name, or its beginning. */
  summary: string;
};

export type HelpResult = {
  name: string;
  best: HelpMatch | null;
  more: HelpMatch[];
};

const SUMMARY_LENGTH = 260;

/** The sentence of a section that mentions the name, or the section's first words. */
export function helpSummary(entry: GuideSearchEntry, name: string): string {
  const text = entry.t;
  const at = guideFold(text).indexOf(guideFold(name));
  if (at < 0) return text.length > SUMMARY_LENGTH ? `${text.slice(0, SUMMARY_LENGTH).replace(/\s+\S*$/, "")} ...` : text;
  // A section's text runs sentence into sentence; start at the one the name is in.
  const before = Math.max(text.lastIndexOf(". ", at), text.lastIndexOf("! ", at), text.lastIndexOf("? ", at));
  const start = before >= 0 ? before + 2 : 0;
  const slice = text.slice(start, start + SUMMARY_LENGTH + 40);
  if (slice.length <= SUMMARY_LENGTH) return slice;
  return `${slice.slice(0, SUMMARY_LENGTH).replace(/\s+\S*$/, "")} ...`;
}

/** How much more an entry that is about the name scores than one that merely mentions it. */
const HEADING_IS_NAME = 25;
const QUOTED_NAME = 20;

/**
 * What the guide says about a name: the matches of the search, ranked once more for this purpose. A
 * section whose heading is the name wins, then one that writes the name in the quotation marks of the
 * language - how {{ui:key}} writes a button - over one that has the words somewhere. The first is the
 * best match, up to two more follow. The search matches whole sections; a section that is a chapter's
 * own opening comes after a heading with the same score.
 */
export function lookupHelp(prepared: GuidePrepared[], name: string, language: Language): HelpResult {
  const info = LANGUAGE_INFO[language] ?? LANGUAGE_INFO.en;
  const [open, close] = info.quotes;
  const hits: GuideHit[] = guideSearch(prepared, name, 60, info.asciiUmlauts);
  const foldedName = guideFold(name);
  const quoted = guideFold(`${open}${name}${close}`);
  const ranked = hits
    .map((hit) => {
      let score = hit.score;
      if (guideFold(hit.entry.h) === foldedName) score += HEADING_IS_NAME;
      if (guideFold(hit.entry.t).includes(quoted)) score += QUOTED_NAME;
      if (!hit.entry.h) score -= 0.5;
      return { hit, score };
    })
    .sort((a, b) => b.score - a.score);
  const matches = ranked.map(({ hit }) => ({ entry: hit.entry, summary: helpSummary(hit.entry, name) }));
  return { name, best: matches[0] ?? null, more: matches.slice(1, 3) };
}

const indexes = new Map<string, Promise<GuidePrepared[] | null>>();

/** The address of a language's guide search index. */
export function guideIndexUrl(language: Language): string {
  return `/${(LANGUAGE_INFO[language] ?? LANGUAGE_INFO.en).guideDir}/search-index.json`;
}

/**
 * The guide's index for a language, fetched once and kept. null when it cannot be had - the index
 * only exists once `npm run guide` has built the guide - so the help can say so instead of failing.
 */
export function loadGuideIndex(language: Language, fetcher: typeof fetch = fetch): Promise<GuidePrepared[] | null> {
  const key = guideIndexUrl(language);
  let loading = indexes.get(key);
  if (!loading) {
    loading = fetcher(key)
      .then((response) => (response.ok ? response.json() : null))
      .then((list: GuideSearchEntry[] | null) => (Array.isArray(list) ? guidePrepare(list) : null))
      .catch(() => null);
    // A failed attempt is tried again the next time, not remembered.
    loading.then((value) => { if (!value) indexes.delete(key); });
    indexes.set(key, loading);
  }
  return loading;
}
