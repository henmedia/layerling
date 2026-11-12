import { GUIDE_CHAPTERS, GUIDE_SECTIONS, guideHref, type GuideChapter, type GuideSection } from "@/lib/guideLinks";
import { LANGUAGES, type Language } from "@/lib/languages";
import whatsNewData from "./whatsNew.json";

/**
 * "What is new since your last visit": the highlights of each release, written
 * for the people who use layerling, in both languages. The changelog stays the
 * complete (English, technical) record; this list is the short version a
 * returning visitor reads once. It is written by hand with every release: a few
 * lines for what a user can do now that they could not before, and only rarely
 * for a fix.
 */
/** A text in English and in as many other languages as were written; the others read the English one. */
export type WhatsNewText = { en: string } & Partial<Record<Language, string>>;
/**
 * A link from a card to the guide: a section (preferred) or a whole chapter, with its own words where a card has more
 * than one link; without them it reads "Read about this in the user guide".
 */
export type WhatsNewGuideLink = { section?: string; chapter?: string; label?: WhatsNewText };
export type WhatsNewItem = { title: WhatsNewText; body: WhatsNewText; guide?: WhatsNewGuideLink | WhatsNewGuideLink[] };

/**
 * The guide links of a card that this version of layerling knows, as the address of their place in the guide.
 * An installation previewing an update reads the cards of a newer version, which may point at a section it does not
 * have yet: such a link is left out rather than leading to the guide's front page.
 */
export function whatsNewGuideLinks(item: WhatsNewItem, language: Language): Array<{ href: string; label: WhatsNewText | null }> {
  const links = item.guide === undefined ? [] : Array.isArray(item.guide) ? item.guide : [item.guide];
  return links.flatMap((link) => {
    const section = link.section && link.section in GUIDE_SECTIONS ? (link.section as GuideSection) : undefined;
    const chapter = link.chapter && link.chapter in GUIDE_CHAPTERS ? (link.chapter as GuideChapter) : undefined;
    if (!section && !chapter) return [];
    return [{ href: guideHref(language, chapter, section), label: link.label ?? null }];
  });
}

/**
 * A card's text in blocks: an empty line starts a new paragraph, and lines beginning with a dash are a list. Plain
 * text otherwise, so an older version that shows the text in one line still reads it well.
 */
export type WhatsNewBlock = { kind: "paragraph"; text: string } | { kind: "list"; items: string[] };

export function whatsNewBlocks(text: string): WhatsNewBlock[] {
  const blocks: WhatsNewBlock[] = [];
  for (const chunk of text.replace(/\r\n/g, "\n").split(/\n\s*\n/)) {
    const lines = chunk.split("\n").map((line) => line.trim()).filter(Boolean);
    let paragraph: string[] = [];
    let list: string[] = [];
    const flush = () => {
      if (paragraph.length) blocks.push({ kind: "paragraph", text: paragraph.join(" ") });
      if (list.length) blocks.push({ kind: "list", items: list });
      paragraph = [];
      list = [];
    };
    for (const line of lines) {
      const item = /^[-–•]\s+(.*)$/.exec(line);
      if (item) {
        if (paragraph.length) {
          blocks.push({ kind: "paragraph", text: paragraph.join(" ") });
          paragraph = [];
        }
        list.push(item[1]);
      } else {
        if (list.length) {
          blocks.push({ kind: "list", items: list });
          list = [];
        }
        paragraph.push(line);
      }
    }
    flush();
  }
  return blocks;
}
export type WhatsNewEntry = { version: string; items: WhatsNewItem[] };

/**
 * The highlights of every release, newest first. An entry shows from the moment
 * the program reaches its version. They live in whatsNew.json next to this file. That
 * file is also what an installation fetches from GitHub, in the version of the
 * release tag, to preview an update before it is installed - so it is a plain
 * data file and is updated with every release.
 */
export const WHATS_NEW: readonly WhatsNewEntry[] = whatsNewData as WhatsNewEntry[];

/**
 * How many versions at most the card lists. Releases come often, so a visitor
 * who was away for a while should still see all of it; versions without an
 * entry (plain fixes) do not count.
 */
export const WHATS_NEW_MAX_VERSIONS = 20;

/** How many versions "What is new?" lists when opened by hand: as many as after a long absence. */
export const WHATS_NEW_MANUAL_VERSIONS = WHATS_NEW_MAX_VERSIONS;

/**
 * The version before this feature came with it: a browser that already holds
 * designs but has never seen the card is taken to have last been here then, so
 * the first update after it brings the list.
 */
export const WHATS_NEW_BASELINE = "1.42.0";

export function parseVersion(version: string): [number, number, number] | null {
  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/.exec(version.trim());
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

/** Negative when `a` is older than `b`; 0 when equal or when either is no version number. */
export function compareVersions(a: string, b: string): number {
  const left = parseVersion(a);
  const right = parseVersion(b);
  if (!left || !right) return 0;
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
}

/** The entries after `lastSeen` up to and including `current`, newest first, at most `limit`. */
export function whatsNewSince(
  lastSeen: string,
  current: string,
  entries: readonly WhatsNewEntry[] = WHATS_NEW,
  limit = WHATS_NEW_MAX_VERSIONS,
): WhatsNewEntry[] {
  return entries
    .filter((entry) => compareVersions(entry.version, lastSeen) > 0 && compareVersions(entry.version, current) <= 0)
    .sort((a, b) => compareVersions(b.version, a.version))
    .slice(0, limit);
}

/** The entries older than `version`, newest first: what came before the versions a card shows. */
export function whatsNewBefore(version: string, entries: readonly WhatsNewEntry[] = WHATS_NEW): WhatsNewEntry[] {
  return entries
    .filter((entry) => compareVersions(entry.version, version) < 0)
    .sort((a, b) => compareVersions(b.version, a.version));
}

/** The newest entries up to `current`, for opening the list again when nothing is new. */
export function latestWhatsNew(current: string, entries: readonly WhatsNewEntry[] = WHATS_NEW, limit = WHATS_NEW_MANUAL_VERSIONS): WhatsNewEntry[] {
  return entries
    .filter((entry) => compareVersions(entry.version, current) <= 0)
    .sort((a, b) => compareVersions(b.version, a.version))
    .slice(0, limit);
}

/**
 * Which version this browser last saw, or null for a visitor who has never been
 * here (who is told nothing and just gets the current version remembered).
 */
export function lastSeenVersion(stored: string | null, hasDesigns: boolean): string | null {
  if (stored && parseVersion(stored)) return stored.trim();
  return hasDesigns ? WHATS_NEW_BASELINE : null;
}

export function isText(value: unknown): value is WhatsNewText {
  if (!value || typeof value !== "object") return false;
  const { en } = value as Record<string, unknown>;
  return typeof en === "string" && en.trim() !== "";
}

/** The English text and every other language's text that is a real string, nothing else. */
export function cleanText(value: WhatsNewText): WhatsNewText {
  const cleaned: WhatsNewText = { en: value.en };
  for (const language of LANGUAGES) {
    const text = (value as Partial<Record<Language, unknown>>)[language];
    if (language !== "en" && typeof text === "string" && text.trim() !== "") cleaned[language] = text;
  }
  return cleaned;
}

/**
 * The entries of a whatsNew.json that came from the network. Anything that is
 * not exactly the expected shape is dropped, so a broken or foreign file shows
 * nothing rather than something wrong; at most `limit` entries are kept.
 */
export function parseWhatsNewEntries(value: unknown, limit = 200): WhatsNewEntry[] {
  if (!Array.isArray(value)) return [];
  const entries: WhatsNewEntry[] = [];
  for (const candidate of value.slice(0, limit)) {
    if (!candidate || typeof candidate !== "object") continue;
    const { version, items } = candidate as Record<string, unknown>;
    if (typeof version !== "string" || !parseVersion(version) || !Array.isArray(items)) continue;
    const valid = items
      .slice(0, 20)
      .filter((item): item is WhatsNewItem => Boolean(item) && typeof item === "object" && isText((item as WhatsNewItem).title) && isText((item as WhatsNewItem).body))
      .map((item) => ({ title: cleanText(item.title), body: cleanText(item.body) }));
    if (valid.length > 0) entries.push({ version, items: valid });
  }
  return entries;
}
