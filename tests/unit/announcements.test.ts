import { describe, expect, it } from "vitest";
import {
  activeAnnouncements,
  announcementClock,
  announcementInlines,
  announcementsFileUrl,
  bundledAnnouncementList,
  fetchAnnouncements,
  parseAnnouncements,
} from "@/lib/announcements";
import { LANGUAGES } from "@/lib/languages";
import { whatsNewBlocks } from "@/lib/whatsNew";

const entry = (id: string, from: string, until: string) => ({
  id,
  from,
  until,
  title: { en: `${id} title`, de: `${id} Titel` },
  text: { en: `${id} text`, de: `${id} Text` },
});

describe("parseAnnouncements", () => {
  it("keeps complete entries and drops broken ones", () => {
    const list = parseAnnouncements({
      announcements: [
        entry("ok", "2026-11-13T00:00:00+01:00", "2026-11-23T00:00:00+01:00"),
        entry("", "2026-11-13T00:00:00+01:00", "2026-11-23T00:00:00+01:00"),
        entry("backwards", "2026-11-23T00:00:00+01:00", "2026-11-13T00:00:00+01:00"),
        entry("no-date", "soon", "2026-11-23T00:00:00+01:00"),
        { ...entry("no-english", "2026-11-13T00:00:00+01:00", "2026-11-23T00:00:00+01:00"), title: { de: "nur deutsch" } },
        "rubbish",
      ],
    });
    expect(list.map((item) => item.id)).toEqual(["ok"]);
  });

  it("reads nothing out of a file that is not a list", () => {
    expect(parseAnnouncements(null)).toEqual([]);
    expect(parseAnnouncements({ announcements: "x" })).toEqual([]);
  });
});

describe("activeAnnouncements", () => {
  const list = parseAnnouncements({
    announcements: [
      entry("break", "2026-11-13T00:00:00+01:00", "2026-11-23T00:00:00+01:00"),
      entry("later", "2026-11-20T00:00:00+01:00", "2026-11-21T00:00:00+01:00"),
    ],
  });

  it("shows one only inside its window, the end not included", () => {
    expect(activeAnnouncements(list, Date.parse("2026-11-12T23:59:59+01:00"))).toEqual([]);
    expect(activeAnnouncements(list, Date.parse("2026-11-13T00:00:00+01:00")).map((a) => a.id)).toEqual(["break"]);
    expect(activeAnnouncements(list, Date.parse("2026-11-22T23:59:59+01:00")).map((a) => a.id)).toEqual(["break"]);
    expect(activeAnnouncements(list, Date.parse("2026-11-23T00:00:00+01:00"))).toEqual([]);
  });

  it("puts the one that started last first", () => {
    expect(activeAnnouncements(list, Date.parse("2026-11-20T12:00:00+01:00")).map((a) => a.id)).toEqual(["later", "break"]);
  });
});

describe("announcementInlines", () => {
  it("turns web addresses and the support page into links and leaves the rest as text", () => {
    expect(announcementInlines("Ask in the [Discussions](https://github.com/x/y/discussions) or [support](support)!")).toEqual([
      { kind: "text", text: "Ask in the " },
      { kind: "link", label: "Discussions", href: "https://github.com/x/y/discussions" },
      { kind: "text", text: " or " },
      { kind: "link", label: "support", href: "support" },
      { kind: "text", text: "!" },
    ]);
  });

  it("does not make a link of anything else", () => {
    expect(announcementInlines("[click](javascript:alert(1)) and [x](http://plain)")).toEqual([
      { kind: "text", text: "[click](javascript:alert(1)) and [x](http://plain)" },
    ]);
  });
});

describe("announcementsFileUrl and fetchAnnouncements", () => {
  it("reads the list from the main branch on GitHub, and not at all elsewhere", () => {
    expect(announcementsFileUrl("https://github.com/henmedia/layerling")).toBe(
      "https://raw.githubusercontent.com/henmedia/layerling/main/apps/web/src/lib/announcements.json",
    );
    expect(announcementsFileUrl("https://gitlab.com/someone/layerling")).toBeNull();
  });

  it("gives the live list, or null when it cannot be had", async () => {
    const body = { announcements: [entry("live", "2026-11-13T00:00:00+01:00", "2026-11-23T00:00:00+01:00")] };
    const ok = (async () => ({ ok: true, json: async () => body }) as Response) as unknown as typeof fetch;
    const missing = (async () => ({ ok: false, json: async () => ({}) }) as Response) as unknown as typeof fetch;
    const offline = (async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    const source = "https://github.com/henmedia/layerling";
    expect((await fetchAnnouncements({ fetchFn: ok, sourceCodeUrl: source }))?.map((a) => a.id)).toEqual(["live"]);
    expect(await fetchAnnouncements({ fetchFn: missing, sourceCodeUrl: source })).toBeNull();
    expect(await fetchAnnouncements({ fetchFn: offline, sourceCodeUrl: source })).toBeNull();
  });
});

describe("announcementClock", () => {
  it("takes a day or a moment from the address, and the real time otherwise", () => {
    const now = Date.parse("2026-11-12T18:00:00+01:00");
    expect(announcementClock("", now)).toBe(now);
    expect(announcementClock("?announcementAt=nonsense", now)).toBe(now);
    expect(announcementClock("?announcementAt=2026-11-13T00:00:00%2B01:00", now)).toBe(Date.parse("2026-11-13T00:00:00+01:00"));
    expect(new Date(announcementClock("?announcementAt=2026-11-13", now)).getDate()).toBe(13);
  });
});

describe("the built-in announcements", () => {
  const list = bundledAnnouncementList();

  it("all read and have ids of their own", () => {
    expect(list.length).toBeGreaterThan(0);
    expect(new Set(list.map((a) => a.id)).size).toBe(list.length);
  });

  it("say the same in every language they are written in: paragraphs, points and links", () => {
    for (const announcement of list) {
      const shape = (text: string) => whatsNewBlocks(text).map((block) => (block.kind === "list" ? block.items.length : 0));
      const links = (text: string) =>
        announcementInlines(text).flatMap((part) => (part.kind === "link" ? [part.href] : []));
      const english = announcement.text.en;
      for (const language of LANGUAGES) {
        const text = announcement.text[language];
        if (!text) continue;
        expect(announcement.title[language], `${announcement.id} ${language} title`).toBeTruthy();
        expect(shape(text!), `${announcement.id} ${language}`).toEqual(shape(english));
        expect(links(text!), `${announcement.id} ${language}`).toEqual(links(english));
      }
    }
  });
});
