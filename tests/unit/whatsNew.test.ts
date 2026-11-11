import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  compareVersions,
  lastSeenVersion,
  latestWhatsNew,
  parseVersion,
  WHATS_NEW,
  WHATS_NEW_BASELINE,
  WHATS_NEW_MANUAL_VERSIONS,
  WHATS_NEW_MAX_VERSIONS,
  whatsNewBefore,
  whatsNewBlocks,
  whatsNewGuideLinks,
  whatsNewSince,
  type WhatsNewEntry,
  type WhatsNewItem,
} from "@/lib/whatsNew";
import { GUIDE_CHAPTERS, GUIDE_SECTIONS } from "@/lib/guideLinks";

const entry = (version: string): WhatsNewEntry => ({
  version,
  items: [{ title: { de: "Titel", en: "Title" }, body: { de: "Text", en: "Text" } }],
});
const ENTRIES = ["1.38.0", "1.40.0", "1.41.0", "1.42.0", "1.43.0"].map(entry);

describe("version numbers", () => {
  it("reads plain and prefixed versions and refuses anything else", () => {
    expect(parseVersion("1.42.0")).toEqual([1, 42, 0]);
    expect(parseVersion("v1.2.30")).toEqual([1, 2, 30]);
    expect(parseVersion("1.2")).toBeNull();
    expect(parseVersion("latest")).toBeNull();
  });

  it("compares numerically, so 1.9.0 is older than 1.10.0", () => {
    expect(compareVersions("1.9.0", "1.10.0")).toBeLessThan(0);
    expect(compareVersions("2.0.0", "1.99.99")).toBeGreaterThan(0);
    expect(compareVersions("1.42.0", "v1.42.0")).toBe(0);
    expect(compareVersions("nonsense", "1.0.0")).toBe(0);
  });
});

describe("whatsNewBefore", () => {
  it("lists what came before the oldest version a card shows, the last one seen included, newest first", () => {
    // Last seen 1.40.0, so the card shows 1.42.0 and 1.41.0; the button adds 1.40.0 and 1.38.0.
    const shown = whatsNewSince("1.40.0", "1.42.0", ENTRIES);
    expect(whatsNewBefore(shown[shown.length - 1].version, ENTRIES).map((e) => e.version)).toEqual(["1.40.0", "1.38.0"]);
  });
});

describe("whatsNewSince", () => {
  it("lists the versions after the last one seen up to the current, newest first", () => {
    expect(whatsNewSince("1.40.0", "1.42.0", ENTRIES).map((e) => e.version)).toEqual(["1.42.0", "1.41.0"]);
  });

  it("does not show a version the program has not reached yet", () => {
    expect(whatsNewSince("1.41.0", "1.42.0", ENTRIES).map((e) => e.version)).toEqual(["1.42.0"]);
  });

  it("shows nothing when nothing is newer", () => {
    expect(whatsNewSince("1.43.0", "1.43.0", ENTRIES)).toEqual([]);
    expect(whatsNewSince("1.50.0", "1.43.0", ENTRIES)).toEqual([]);
  });

  it("caps a long absence at the newest few", () => {
    expect(whatsNewSince("1.0.0", "1.43.0", ENTRIES, 2).map((e) => e.version)).toEqual(["1.43.0", "1.42.0"]);
  });

  it("by default keeps a long absence in view: twenty versions, also when opened by hand", () => {
    const many = Array.from({ length: 30 }, (_unused, index) => entry(`1.${index + 1}.0`));
    expect(WHATS_NEW_MAX_VERSIONS).toBeGreaterThanOrEqual(20);
    expect(whatsNewSince("1.0.0", "1.30.0", many)).toHaveLength(WHATS_NEW_MAX_VERSIONS);
    expect(WHATS_NEW_MANUAL_VERSIONS).toBe(20);
    expect(latestWhatsNew("1.30.0", many)).toHaveLength(20);
  });

  it("lists the latest versions for opening the list by hand", () => {
    expect(latestWhatsNew("1.42.0", ENTRIES, 2).map((e) => e.version)).toEqual(["1.42.0", "1.41.0"]);
  });
});

describe("lastSeenVersion", () => {
  it("trusts a stored version", () => {
    expect(lastSeenVersion("1.40.0", false)).toBe("1.40.0");
    expect(lastSeenVersion(" 1.40.0 ", true)).toBe("1.40.0");
  });

  it("takes a browser with designs but no stored version for a returning visitor", () => {
    expect(lastSeenVersion(null, true)).toBe(WHATS_NEW_BASELINE);
    expect(lastSeenVersion("garbage", true)).toBe(WHATS_NEW_BASELINE);
  });

  it("tells a visitor with neither nothing", () => {
    expect(lastSeenVersion(null, false)).toBeNull();
  });
});

describe("the written list", () => {
  it("is newest first with a version number each, once", () => {
    const versions = WHATS_NEW.map((e) => e.version);
    expect(versions.every((version) => parseVersion(version) !== null)).toBe(true);
    expect(new Set(versions).size).toBe(versions.length);
    for (let index = 1; index < versions.length; index += 1) {
      expect(compareVersions(versions[index - 1], versions[index]), `${versions[index - 1]} before ${versions[index]}`).toBeGreaterThan(0);
    }
  });

  it("has a title and a text in both languages for every item", () => {
    for (const { version, items } of WHATS_NEW) {
      expect(items.length, version).toBeGreaterThan(0);
      for (const item of items) {
        for (const language of ["de", "en"] as const) {
          expect(item.title[language].trim(), `${version} title ${language}`).not.toBe("");
          expect(item.body[language].trim(), `${version} text ${language}`).not.toBe("");
        }
        // A title doubles as the key of its row, so it must be unique within a version.
        expect(new Set(items.map((entryItem) => entryItem.title.en)).size, version).toBe(items.length);
      }
    }
  });

  it("only names versions that have a heading in the changelog", () => {
    const changelog = readFileSync("docs/CHANGELOG.md", "utf8");
    const headings = new Set([...changelog.matchAll(/^## (\d+\.\d+\.\d+)\s*$/gm)].map((match) => match[1]));
    // The version being prepared has no heading until the release renames "Unreleased".
    const prepared = WHATS_NEW[0].version;
    for (const { version } of WHATS_NEW) {
      if (version === prepared && changelog.includes("## Unreleased")) continue;
      expect(headings.has(version), `${version} in the changelog`).toBe(true);
    }
  });
});

describe("longer cards", () => {
  it("reads empty lines as paragraphs and dashed lines as a list", () => {
    expect(whatsNewBlocks("One line.")).toEqual([{ kind: "paragraph", text: "One line." }]);
    expect(whatsNewBlocks("First.\n\nYou can set:\n– this,\n- that\n\nLast\nline.")).toEqual([
      { kind: "paragraph", text: "First." },
      { kind: "paragraph", text: "You can set:" },
      { kind: "list", items: ["this,", "that"] },
      { kind: "paragraph", text: "Last line." },
    ]);
  });

  it("links to the guide in the reader's language, and leaves out a place this version does not know", () => {
    const item: WhatsNewItem = {
      title: { en: "T" },
      body: { en: "B" },
      guide: [{ section: "fileBackups", label: { en: "Earlier versions" } }, { chapter: "files" }, { section: "notThere" }],
    };
    const links = whatsNewGuideLinks(item, "de");
    expect(links).toHaveLength(2);
    expect(links[0].href).toMatch(/#fruehere-fassungen$/);
    expect(links[0].label).toEqual({ en: "Earlier versions" });
    expect(links[1].label).toBeNull();
    expect(whatsNewGuideLinks({ title: { en: "T" }, body: { en: "B" } }, "en")).toEqual([]);
  });

  it("points every card's guide link, released or waiting, at a place the guide has", () => {
    const waiting = JSON.parse(readFileSync("docs/whatsNew-unreleased.json", "utf8")) as WhatsNewItem[];
    const items = [...WHATS_NEW.flatMap((entryItem) => entryItem.items), ...waiting];
    for (const item of items) {
      const links = item.guide === undefined ? [] : Array.isArray(item.guide) ? item.guide : [item.guide];
      for (const link of links) {
        const known = (link.section !== undefined && link.section in GUIDE_SECTIONS) || (link.chapter !== undefined && link.chapter in GUIDE_CHAPTERS);
        expect(known, `${item.title.en}: ${JSON.stringify(link)}`).toBe(true);
        if (link.label) expect(link.label.de?.trim() && link.label.en.trim(), item.title.en).toBeTruthy();
      }
    }
  });
});
