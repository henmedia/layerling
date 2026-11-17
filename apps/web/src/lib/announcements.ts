import bundledAnnouncements from "@/lib/announcements.json";
import { SOURCE_CODE_URL } from "@/lib/appUpdate";
import { LANGUAGES, type Language } from "@/lib/languages";

/**
 * Announcements on the start page: a notice from the author with a start and an
 * end, such as a break with slower answers. Each one carries its whole text in
 * the languages it was written in; a language it lacks reads English.
 *
 * The list lives in announcements.json. A released copy has that file built in,
 * and also reads it live from the main branch on GitHub, so a new announcement or
 * a corrected text reaches everyone without a release. Outside its window an
 * announcement is not shown, so it goes away by itself.
 */

/** Where the list lives in the repository. */
const ANNOUNCEMENTS_FILE_PATH = "apps/web/src/lib/announcements.json";

/** The branch the live list is read from. */
const ANNOUNCEMENTS_BRANCH = "main";

/** The link target that stands for the support page (supportLink.ts decides where that is). */
export const SUPPORT_LINK_TARGET = "support";

export type LocalizedAnnouncementText = { en: string } & Partial<Record<Language, string>>;

export type Announcement = {
  /** Stays the same for one announcement: the browser remembers closed ones by it. */
  id: string;
  /** From when it shows, an ISO date with time and zone. */
  from: string;
  /** Until when it shows; this moment itself no longer belongs to it. */
  until: string;
  title: LocalizedAnnouncementText;
  /** Paragraphs split by a blank line, list points starting with "- ", links as [label](https://...) or [label](support). */
  text: LocalizedAnnouncementText;
};

export type AnnouncementInline =
  | { kind: "text"; text: string }
  | { kind: "link"; label: string; href: string };

function localizedTextOf(value: unknown): LocalizedAnnouncementText | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.en !== "string" || !record.en.trim()) return null;
  const text: LocalizedAnnouncementText = { en: record.en };
  for (const language of LANGUAGES) {
    const translated = record[language];
    if (typeof translated === "string" && translated.trim()) text[language] = translated;
  }
  return text;
}

/** The announcements in a file, leaving out any that are not complete: an id, a valid window, a title and a text in English. */
export function parseAnnouncements(data: unknown): Announcement[] {
  const list = data && typeof data === "object" && Array.isArray((data as { announcements?: unknown }).announcements)
    ? (data as { announcements: unknown[] }).announcements
    : [];
  const announcements: Announcement[] = [];
  for (const entry of list) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const id = typeof record.id === "string" ? record.id.trim() : "";
    const from = typeof record.from === "string" ? record.from : "";
    const until = typeof record.until === "string" ? record.until : "";
    const title = localizedTextOf(record.title);
    const text = localizedTextOf(record.text);
    if (!id || !title || !text) continue;
    const start = Date.parse(from);
    const end = Date.parse(until);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
    announcements.push({ id, from, until, title, text });
  }
  return announcements;
}

/** The announcements whose window holds `now`, the one that started last first. */
export function activeAnnouncements(announcements: readonly Announcement[], now: number): Announcement[] {
  return announcements
    .filter((announcement) => Date.parse(announcement.from) <= now && now < Date.parse(announcement.until))
    .sort((a, b) => Date.parse(b.from) - Date.parse(a.from));
}

/** The list built into this copy. */
export function bundledAnnouncementList(): Announcement[] {
  return parseAnnouncements(bundledAnnouncements);
}

/**
 * The address of the live list on GitHub, on the main branch. Null for a copy
 * whose source address is not on GitHub: a fork elsewhere has only its own built-in list.
 */
export function announcementsFileUrl(sourceCodeUrl: string = SOURCE_CODE_URL): string | null {
  try {
    const parsed = new URL(sourceCodeUrl);
    if (parsed.hostname !== "github.com" && parsed.hostname !== "www.github.com") return null;
    const parts = parsed.pathname.replace(/^\/+/, "").replace(/\/+$/, "").split("/");
    if (parts.length < 2 || !/^[\w.-]+$/.test(parts[0]) || !/^[\w.-]+$/.test(parts[1])) return null;
    return `https://raw.githubusercontent.com/${parts[0]}/${parts[1].replace(/\.git$/, "")}/${ANNOUNCEMENTS_BRANCH}/${ANNOUNCEMENTS_FILE_PATH}`;
  } catch {
    return null;
  }
}

/**
 * The live list from GitHub, or null when it cannot be had: no network, a copy
 * not on GitHub, a file that does not read. The caller then keeps the built-in list.
 */
export async function fetchAnnouncements(
  options: { fetchFn?: typeof fetch; sourceCodeUrl?: string; timeoutMs?: number } = {},
): Promise<Announcement[] | null> {
  const url = announcementsFileUrl(options.sourceCodeUrl);
  if (!url) return null;
  const fetcher = options.fetchFn ?? fetch;
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), options.timeoutMs ?? 6000) : null;
  try {
    const response = await fetcher(url, { signal: controller?.signal, cache: "no-cache" });
    if (!response.ok) return null;
    return parseAnnouncements(await response.json());
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * A paragraph or list point split into plain text and links. Only web addresses
 * and the support page become links; anything else in brackets stays as written.
 */
export function announcementInlines(text: string): AnnouncementInline[] {
  const parts: AnnouncementInline[] = [];
  const pattern = /\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
    const [whole, label, href] = match;
    if (href !== SUPPORT_LINK_TARGET && !/^https:\/\/[^\s]+$/i.test(href)) continue;
    if (match.index > last) parts.push({ kind: "text", text: text.slice(last, match.index) });
    parts.push({ kind: "link", label, href });
    last = match.index + whole.length;
  }
  if (last < text.length) parts.push({ kind: "text", text: text.slice(last) });
  return parts;
}

/**
 * The moment to measure the windows against: now, or the one named in the
 * address as ?announcementAt=2026-11-13 (with an optional time), to look at an
 * announcement before it starts.
 */
export function announcementClock(search: string, now: number): number {
  try {
    const value = new URLSearchParams(search).get("announcementAt");
    if (!value) return now;
    const parsed = Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value);
    return Number.isFinite(parsed) ? parsed : now;
  } catch {
    return now;
  }
}
