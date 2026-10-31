import { copyFile, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// Builds the user guide: plain static pages from docs/guide/<language>/*.md,
// written into apps/web/public so the export carries them next to the program.
//
// The wording of buttons is never typed into a chapter. {{ui:key}} pulls it
// from the interface's own catalogue, so renaming a button renames it in the
// guide too, and a key that no longer exists stops the build instead of
// leaving a stale name behind. Numbers the program decides by work the same
// way: {{value:NAME}} reads NAME from apps/web/src/lib/roundness.ts and
// writes it as the language writes numbers (0,005 / 0.005).
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const guideSource = join(root, "docs", "guide");
const publicDirectory = join(root, "apps", "web", "public");
const SITE = "https://layerling.com";

// The languages and what the guide needs to know about each one live in
// apps/web/src/lib/languages.ts, which the interface reads too.
const registry = await import(pathToFileURL(join(root, "apps", "web", "src", "lib", "languages.ts")).href);
export const LANGUAGE_CODES = registry.LANGUAGES;
export const LANGUAGE_INFO = registry.LANGUAGE_INFO;

/** What a guide page needs of a language: its folder, tag, quotes and community, and the words of the page, English where the language has not written them. */
export const GUIDE_LANGUAGES = Object.fromEntries(
  LANGUAGE_CODES.map((code) => {
    const info = LANGUAGE_INFO[code];
    return [code, { dir: info.guideDir, htmlLang: info.htmlLang, quotes: info.quotes, forumUrl: info.communityUrl, ...LANGUAGE_INFO.en.guide, ...info.guide }];
  }),
);

/** Languages written right to left; their guide pages get dir="rtl". */
const RTL_LANGUAGES = new Set(["ar", "fa", "he", "ur"]);

/** KEY=VALUE lines of an env file; comments and empty lines are skipped. */
export function parseEnv(text) {
  const values = {};
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (match) values[match[1]] = match[2].replace(/^"(.*)"$/, "$1");
  }
  return values;
}

async function readEnvironment() {
  let file = {};
  try {
    file = parseEnv(await readFile(join(root, "apps", "web", ".env.local"), "utf8"));
  } catch {
    // no local settings: the guide then shows only what every installation has
  }
  return { ...file, ...process.env };
}

const PRINTER_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"/><rect x="6" y="14" width="12" height="8" rx="1"/></svg>';

/** The link to the whole guide for printing, with a printer in front: in the chapter list and on the overview. */
function printLink(strings, className = "") {
  return `<p class="print-link${className ? ` ${className}` : ""}"><a href="/${strings.dir}/${PRINT_ALL_PAGE}">${PRINTER_ICON}<span>${escapeHtml(strings.printAll)}</span></a></p>`;
}

/** The page with every chapter in a row, for printing; one in each guide folder. */
export const PRINT_ALL_PAGE = "print-all.html";

const SOURCE_CODE = "https://github.com/henmedia/layerling";

/**
 * The footer of the program, for the guide's pages: the same links from the
 * same settings (apps/web/.env.local), so an installation shows its own legal
 * notice and privacy policy here too. Entries that are not set are left out.
 * The addresses start with "/", so they hold from any folder.
 */
export function renderFooter({ language, messages, environment, version }) {
  const link = (href, label, extra = "") => `<a href="${escapeHtml(href)}"${extra}>${escapeHtml(label)}</a>`;
  const external = ' rel="noopener"';
  const fallback = LANGUAGE_INFO[language].legal;
  const left = [];
  // Same rule as the program: an address of the operator's own wins, otherwise
  // the project's support page, unless NEXT_PUBLIC_SUPPORT_HINT=off.
  const ownSponsorUrl = environment.NEXT_PUBLIC_SPONSOR_URL?.trim();
  const supportOff = environment.NEXT_PUBLIC_SUPPORT_HINT?.trim().toLowerCase() === "off";
  const sponsorUrl = ownSponsorUrl || (supportOff ? "" : "https://layerling.com/support.html");
  const sponsorNeedsLang = !ownSponsorUrl || sponsorUrl.startsWith("/");
  if (sponsorUrl) left.push(link(sponsorNeedsLang ? `${sponsorUrl}${sponsorUrl.includes("?") ? "&" : "?"}lang=${language}` : sponsorUrl, environment.NEXT_PUBLIC_SPONSOR_LABEL?.trim() || messages["dashboard.sponsor"], external));
  left.push(link(GUIDE_LANGUAGES[language].forumUrl, messages["dashboard.forum"], external));
  const imprintUrl = environment.NEXT_PUBLIC_IMPRINT_URL?.trim();
  if (imprintUrl) left.push(link(imprintUrl, environment.NEXT_PUBLIC_IMPRINT_LABEL?.trim() || fallback.imprint));
  const privacyUrl = environment.NEXT_PUBLIC_PRIVACY_URL?.trim();
  if (privacyUrl) left.push(link(privacyUrl, environment.NEXT_PUBLIC_PRIVACY_LABEL?.trim() || fallback.privacy));
  const right = [
    link(SOURCE_CODE, messages["dashboard.projectOnGitHub"], external),
    link(`${SOURCE_CODE}/releases`, (messages["dashboard.releaseNotes"] ?? "").replace("{version}", version), external),
  ];
  const group = (items) => `<div>${items.join('<span class="dot" aria-hidden="true">&middot;</span>')}</div>`;
  const trademark = messages["footer.trademark"] ? `<p class="trademark">${escapeHtml(messages["footer.trademark"])}</p>` : "";
  return `<footer class="site-footer">${group(left)}${group(right)}${trademark}</footer>`;
}

export function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Cyrillic has no letters of its own in an id, and the rule below drops what it
 * cannot keep: a Russian heading would leave an empty id, and every heading of a
 * chapter would share it. The letters are spelled out instead, the way the old
 * branch wrote them, so the ids of the Russian guide do not change.
 */
const CYRILLIC_TRANSLITERATION = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i",
  й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t",
  у: "u", ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y",
  ь: "", э: "e", ю: "yu", я: "ya",
};

export function slugify(text) {
  return text
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/č/g, "c").replace(/š/g, "s").replace(/ž/g, "z").replace(/đ/g, "d").replace(/ł/g, "l")
    // Cyrillic is spelled out first - the accent stripping below would take the
    // breve off "й" and leave "и", which would spell "Настройки" as "nastroiki"
    // and move the id a Russian heading already had.
    .replace(/[а-яё]/g, (letter) => CYRILLIC_TRANSLITERATION[letter] ?? letter)
    // Other accents lose their mark, so Dutch "geïmporteerde" reads "geimporteerde", not "ge-mporteerde".
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Width and height of a WebP file, read from its header; null if unreadable. */
export function webpSize(buffer) {
  if (buffer.length < 30 || buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WEBP") return null;
  const kind = buffer.toString("ascii", 12, 16);
  if (kind === "VP8 ") return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
  if (kind === "VP8L") {
    const bits = buffer.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (kind === "VP8X") return { width: buffer.readUIntLE(24, 3) + 1, height: buffer.readUIntLE(27, 3) + 1 };
  return null;
}

/** Splits the leading "key: value" block off a chapter. */
export function parseFrontMatter(source) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(source);
  if (!match) return { meta: {}, body: source };
  const meta = {};
  for (const line of match[1].split(/\r?\n/)) {
    const pair = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
    if (pair) meta[pair[1]] = pair[2].trim().replace(/^"(.*)"$/, "$1");
  }
  return { meta, body: source.slice(match[0].length) };
}

/**
 * Inline text. `context.messages` resolves {{ui:key}}, `context.values`
 * {{value:NAME}}, `context.language` sets
 * the quotation marks, `context.references` (optional) collects what was used.
 */
export function renderInline(text, context) {
  const spans = [];
  let work = text.replace(/`([^`]+)`/g, (_, code) => {
    spans.push(`<code>${escapeHtml(code)}</code>`);
    return `\u0000${spans.length - 1}\u0000`;
  });
  work = escapeHtml(work);
  const [open, close] = GUIDE_LANGUAGES[context.language].quotes;
  // {{ui:key|10}} fills the {count} of a sentence that counts something, so "{count} grid steps" reads "10 grid steps".
  work = work.replace(/\{\{ui:([A-Za-z0-9_.-]+)(?:\|(\d+))?\}\}/g, (_, key, count) => {
    const label = context.messages?.[key];
    context.references?.uiKeys.add(key);
    if (label === undefined) throw new Error(`Unknown interface text {{ui:${key}}}`);
    // Without a number a count in brackets is left out ("Show earlier versions ({count})" is a button whose
    // number changes); any other {count} needs its number, or the page would print the placeholder.
    const written = (count === undefined ? label.replace(/\s*[(（]\{count\}[)）]/g, "") : label).replace(/\{count\}/g, count ?? "{count}");
    if (written.includes("{count}")) throw new Error(`{{ui:${key}}} needs a number: {{ui:${key}|10}}`);
    return `<strong class="ui">${open}${escapeHtml(written)}${close}</strong>`;
  });
  work = work.replace(/\{\{value:([A-Za-z0-9_]+)\}\}/g, (_, name) => {
    const value = context.values?.[name];
    if (typeof value !== "number") throw new Error(`Unknown value {{value:${name}}}`);
    return new Intl.NumberFormat(GUIDE_LANGUAGES[context.language].htmlLang, { maximumFractionDigits: 6, useGrouping: false }).format(value);
  });
  // "+" joins keys, so [[Ctrl+K]] is two; on its own, [[+]] is the plus key.
  // A combination such as [[Ctrl]]+[[S]] keeps its left-to-right order on a right-to-left page too.
  const kbd = (keys) => keys.trim() === "+" ? "<kbd>+</kbd>" : keys.split("+").map((key) => `<kbd>${key.trim()}</kbd>`).join("+");
  work = work.replace(/\[\[([^\]]+)\]\](?:\+\[\[([^\]]+)\]\])*/g, (combo) => {
    const parts = [...combo.matchAll(/\[\[([^\]]+)\]\]/g)].map((match) => kbd(match[1]));
    const html = parts.join("+");
    return parts.length > 1 || /<\/kbd>\+<kbd>/.test(html) ? `<span dir="ltr">${html}</span>` : html;
  });
  work = work.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, target) => {
    const chapter = /^chapter:([\w-]+)$/.exec(target);
    if (chapter) {
      context.references?.chapters.add(chapter[1]);
      return `<a href="/${GUIDE_LANGUAGES[context.language].dir}/${chapter[1]}.html">${label}</a>`;
    }
    const external = /^https?:\/\//.test(target);
    return `<a href="${target}"${external ? ' rel="noopener"' : ""}>${label}</a>`;
  });
  work = work.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
  return work.replace(/\u0000(\d+)\u0000/g, (_, index) => spans[Number(index)]);
}

function renderTable(rows, context) {
  const cells = (line) => line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
  const head = cells(rows[0]);
  const body = rows.slice(2).map(cells);
  const cell = (tag, value) => `<${tag}>${renderInline(value, context)}</${tag}>`;
  return `<div class="table-scroll"><table><thead><tr>${head.map((value) => cell("th", value)).join("")}</tr></thead><tbody>${body
    .map((row) => `<tr>${row.map((value) => cell("td", value)).join("")}</tr>`)
    .join("")}</tbody></table></div>`;
}

/**
 * Block level. Understands headings, paragraphs, lists, block quotes (used for
 * tips), tables, fenced code, rules and pictures written as ![text](shot:name).
 * Returns the HTML and the h2 headings for the page's own table of contents.
 */
/** The ids the headings of a chapter get, in order: what slugify makes of each, outside code blocks. */
export function headingIds(markdown) {
  return headingEntries(markdown).map((entry) => entry.id);
}

/** The headings of a chapter in order, each with its id and level. */
function headingEntries(markdown) {
  const entries = [];
  let inCode = false;
  for (const line of markdown.replace(/\r\n/g, "\n").split("\n")) {
    if (/^```/.test(line)) inCode = !inCode;
    const heading = !inCode && /^(#{1,3}) (.+)$/.exec(line);
    if (heading) entries.push({ id: slugify(heading[2]), level: heading[1].length });
  }
  return entries;
}

/**
 * For each heading of a translated chapter, the ids of the English headings it stands for (often none): titles
 * and sections are paired in order when the chapter has as many of them as the English one, and the sub-headings
 * of a paired section likewise. Where a translated section has fewer or more sub-headings, the English ones point
 * at the section itself, so a help link lands at least there instead of at the top of the chapter.
 */
export function englishHeadingPairs(translated, english) {
  const own = headingEntries(translated);
  const theirs = headingEntries(english);
  const pairs = own.map(() => []);
  const positions = (entries, level) => entries.flatMap((entry, position) => (entry.level === level ? [position] : []));
  const children = (entries, position) => {
    const found = [];
    for (let next = position + 1; next < entries.length && entries[next].level > 2; next += 1) if (entries[next].level === 3) found.push(next);
    return found;
  };
  const titles = [positions(own, 1), positions(theirs, 1)];
  if (titles[0].length === titles[1].length) titles[0].forEach((position, index) => pairs[position].push(theirs[titles[1][index]].id));
  const sections = [positions(own, 2), positions(theirs, 2)];
  if (sections[0].length !== sections[1].length) return pairs;
  sections[0].forEach((position, index) => {
    const englishSection = sections[1][index];
    pairs[position].push(theirs[englishSection].id);
    const mine = children(own, position);
    const matching = children(theirs, englishSection);
    if (mine.length === matching.length) mine.forEach((child, childIndex) => pairs[child].push(theirs[matching[childIndex]].id));
    else matching.forEach((child) => pairs[position].push(theirs[child].id));
  });
  return pairs;
}

/**
 * The id of a heading whose own text gives none - an Arabic heading loses every letter in slugify.
 * It takes the id of the English heading it stands for (englishHeadingPairs), so links that use the
 * English anchor still land; otherwise a numbered one.
 */
function fallbackHeadingId(context, position) {
  return context.englishHeadingIds?.[position]?.[0] || `section-${position + 1}`;
}

export function renderBlocks(markdown, context) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  const headings = [];
  let index = 0;
  // Counted across the tips rendered inside this chapter as well, as headingIds counts them.
  context.headingCount ??= { value: 0 };
  const startsBlock = (line) => /^(#{1,3} |> ?|\s*[-*] |\s*\d+\. |```|---+$|\|)/.test(line) || /^!\[[^\]]*\]\(shot:/.test(line);

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) { index += 1; continue; }

    const heading = /^(#{1,3}) (.+)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const position = context.headingCount.value++;
      const id = slugify(heading[2]) || fallbackHeadingId(context, position);
      if (level === 2) headings.push({ id, text: renderInline(heading[2], { ...context, references: undefined }).replace(/<[^>]+>/g, "") });
      // The English id as a second anchor, so a help link that knows only the English name of a section still lands on it.
      const alias = (context.englishHeadingIds?.[position] ?? [])
        .filter((englishId) => englishId !== id && !context.ownHeadingIds?.has(englishId))
        .map((englishId) => `<span class="heading-alias" id="${englishId}"></span>`)
        .join("");
      html.push(`<h${level} id="${id}">${alias}${renderInline(heading[2], context)}</h${level}>`);
      index += 1;
      continue;
    }
    if (/^```/.test(line)) {
      const code = [];
      index += 1;
      while (index < lines.length && !/^```/.test(lines[index])) { code.push(lines[index]); index += 1; }
      index += 1;
      html.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
      continue;
    }
    if (/^---+$/.test(line)) { html.push("<hr>"); index += 1; continue; }
    if (/^\{\{shortcuts\}\}\s*$/.test(line)) {
      html.push(context.shortcutsHtml ?? "");
      index += 1;
      continue;
    }

    const picture = /^!\[([^\]]*)\]\(shot:([\w-]+)\)\s*$/.exec(line);
    if (picture) {
      const [, alt, name] = picture;
      context.references?.shots.add(name);
      const size = context.imageSize?.(name);
      const dimensions = size ? ` width="${size.width}" height="${size.height}"` : "";
      // A language that has no picture of its own uses the English one where it
      // lies, instead of a copy of it in its own folder (see the copy below).
      const source = context.imageSrc?.(name) ?? `/${GUIDE_LANGUAGES[context.language].dir}/img/${name}.webp`;
      html.push(`<figure><img src="${source}" alt="${escapeHtml(alt)}"${dimensions} loading="lazy"><figcaption>${renderInline(alt, context)}</figcaption></figure>`);
      index += 1;
      continue;
    }
    if (/^>/.test(line)) {
      const quote = [];
      while (index < lines.length && /^>/.test(lines[index])) { quote.push(lines[index].replace(/^> ?/, "")); index += 1; }
      html.push(`<aside class="tip">${renderBlocks(quote.join("\n"), { ...context, references: context.references }).html}</aside>`);
      continue;
    }
    if (/^\|/.test(line) && /^\|?[\s:|-]+\|?$/.test(lines[index + 1] ?? "")) {
      const rows = [];
      while (index < lines.length && /^\|/.test(lines[index])) { rows.push(lines[index]); index += 1; }
      html.push(renderTable(rows, context));
      continue;
    }
    const list = /^(\s*)([-*]|\d+\.) (.*)$/.exec(line);
    if (list) {
      const ordered = /\d/.test(list[2]);
      const items = [];
      while (index < lines.length) {
        const item = /^\s*([-*]|\d+\.) (.*)$/.exec(lines[index]);
        if (!item || /\d/.test(item[1]) !== ordered) break;
        let text = item[2];
        index += 1;
        // A continuation line is indented and belongs to the item above it.
        while (index < lines.length && /^ {2,}\S/.test(lines[index]) && !/^\s*([-*]|\d+\.) /.test(lines[index])) {
          text += ` ${lines[index].trim()}`;
          index += 1;
        }
        items.push(`<li>${renderInline(text, context)}</li>`);
      }
      html.push(`<${ordered ? "ol" : "ul"}>${items.join("")}</${ordered ? "ol" : "ul"}>`);
      continue;
    }
    const paragraph = [line.trim()];
    index += 1;
    while (index < lines.length && lines[index].trim() && !startsBlock(lines[index])) { paragraph.push(lines[index].trim()); index += 1; }
    html.push(`<p>${renderInline(paragraph.join(" "), context)}</p>`);
  }
  return { html: html.join("\n"), headings };
}

/**
 * The keyboard shortcuts as the editor lists them, read from the same table
 * the in-app dialog draws (ShortcutsModal.tsx) - so this page cannot fall
 * behind the program.
 */
export async function readShortcutGroups() {
  const source = await readFile(join(root, "apps", "web", "src", "components", "workplane", "ShortcutsModal.tsx"), "utf8");
  const groups = [];
  const token = /title:\s*"(shortcuts\.group\.\w+)"|\{\s*combos:\s*\[([^\]]*)\],\s*label:\s*"(shortcuts\.\w+)"\s*\}/g;
  for (const match of source.matchAll(token)) {
    if (match[1]) {
      groups.push({ title: match[1], entries: [] });
    } else if (groups.length) {
      const combos = [...match[2].matchAll(/"([^"]+)"/g)].map((combo) => combo[1]);
      groups.at(-1).entries.push({ combos, label: match[3] });
    }
  }
  return groups.filter((group) => group.entries.length);
}

export function renderShortcuts(groups, messages, language) {
  const names = LANGUAGE_INFO[language]?.keyNames ?? {};
  const key = (name) => `<kbd>${escapeHtml(names[name] ?? name)}</kbd>`;
  const combo = (text) => (text === "+" || text === "−" ? key(text) : text.includes("+") ? `<span dir="ltr">${text.split("+").map((part) => key(part.trim())).join("+")}</span>` : key(text.trim()));
  const or = messages["shortcuts.or"] ?? "or";
  return groups
    .map((group) => {
      const rows = group.entries
        .map((entry) => `<tr><td>${entry.combos.map(combo).join(` ${escapeHtml(or)} `)}</td><td>${escapeHtml(messages[entry.label] ?? entry.label)}</td></tr>`)
        .join("");
      const title = messages[group.title] ?? group.title;
      // A title that loses every letter in slugify (Arabic) takes its message key as its id.
      return `<h2 id="${slugify(title) || slugify(group.title)}">${escapeHtml(title)}</h2>\n<div class="table-scroll"><table class="keys"><tbody>${rows}</tbody></table></div>`;
    })
    .join("\n");
}

export const STYLE = `
:root {
  color-scheme: light;
  --ground: #fbf8f0; --card: #ffffff; --ink: #231a11; --muted: #7a6650; --edge: #ede4d4;
  --accent: #ad6206; --accent-ink: #ffffff; --tint: #f6ecd9; --code: #f3ece0;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark;
    --ground: #17130e; --card: #201a13; --ink: #f1e9dc; --muted: #b3a48d; --edge: #362d21;
    --accent: #f0a23a; --accent-ink: #1c1408; --tint: #2b2116; --code: #2a2218;
  }
}
:root[data-theme="dark"] {
  color-scheme: dark;
  --ground: #17130e; --card: #201a13; --ink: #f1e9dc; --muted: #b3a48d; --edge: #362d21;
  --accent: #f0a23a; --accent-ink: #1c1408; --tint: #2b2116; --code: #2a2218;
}
/* Graphite is the dark theme with the warm browns turned grey (the program's own Graphite, see scripts/generate-graphite-theme.mjs); the orange accent stays. */
:root[data-theme="dark"][data-palette="graphite"] {
  --ground: #1a1a1a; --card: #202020; --ink: #e7e7e7; --muted: #8d8d8d; --edge: #303030;
  --accent-ink: #191919; --tint: #262626; --code: #272727;
}
* { box-sizing: border-box; }
html { scroll-padding-top: 76px; }
body { margin: 0; background: var(--ground); color: var(--ink); font: 16px/1.7 "Avenir Next", Avenir, "Segoe UI", "Helvetica Neue", Arial, sans-serif; }
a { color: var(--accent); }
.bar { position: sticky; top: 0; z-index: 5; background: var(--ground); border-bottom: 1px solid var(--edge); }
.bar-inner { max-width: 1100px; margin: 0 auto; padding: 10px 16px; display: flex; align-items: center; gap: 14px; }
.brand { display: flex; align-items: center; gap: 10px; color: inherit; text-decoration: none; margin-right: auto; }
.brand img { width: 34px; height: 34px; }
.brand b { font-size: 19px; letter-spacing: -0.03em; }
.brand-text { display: flex; align-items: baseline; gap: 10px; }
.brand-note { color: var(--muted); font-size: 13px; font-weight: 600; }
.guide-search { position: relative; flex: 0 1 280px; min-width: 0; margin: 0; }
.guide-search input { width: 100%; padding: 7px 12px; border: 1px solid var(--edge); border-radius: 8px; background: var(--card); color: var(--ink); font: inherit; font-size: 14px; }
.guide-search input:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
.guide-results { position: absolute; left: 0; right: 0; top: calc(100% + 6px); max-height: min(70vh, 460px); overflow-y: auto; background: var(--card); border: 1px solid var(--edge); border-radius: 8px; box-shadow: 0 6px 20px rgba(0, 0, 0, 0.14); z-index: 7; }
.guide-results[hidden] { display: none; }
.guide-results a { display: block; padding: 8px 12px; color: var(--ink); text-decoration: none; border-bottom: 1px solid var(--edge); }
.guide-results a:last-child { border-bottom: 0; }
.guide-results a:hover, .guide-results a:focus-visible { background: var(--tint); outline: none; }
.guide-results b { display: block; font-size: 14px; }
.guide-results span { display: block; color: var(--muted); font-size: 13px; line-height: 1.45; }
.guide-results mark { background: transparent; color: var(--accent); font-weight: 800; }
.guide-results p { margin: 0; padding: 10px 12px; color: var(--muted); font-size: 14px; }
mark.guide-hit { background: #ffd54a; color: #231a11; border-radius: 2px; padding: 0 1px; cursor: pointer; }
.editor-elsewhere { max-width: 1100px; margin: 0 auto; padding: 0 16px 10px; color: var(--muted); font-size: 14px; text-align: right; }
.editor-elsewhere[hidden] { display: none; }
.bar a.button { padding: 7px 14px; border-radius: 8px; background: var(--accent); color: var(--accent-ink); font-weight: 700; font-size: 14px; text-decoration: none; }
.bar .lang-menu { position: relative; font-size: 14px; font-weight: 600; }
.bar .lang-menu summary { color: var(--muted); cursor: pointer; list-style: none; }
.bar .lang-menu summary::-webkit-details-marker { display: none; }
.bar .lang-menu summary::after { content: " \\25BE"; font-size: 11px; }
.bar .lang-menu ul { position: absolute; right: 0; margin: 8px 0 0; padding: 4px; list-style: none; min-width: 9em; background: var(--card); border: 1px solid var(--edge); border-radius: 8px; box-shadow: 0 6px 20px rgba(0, 0, 0, 0.14); }
.bar .lang-menu a { display: block; padding: 5px 10px; border-radius: 6px; color: var(--ink); text-decoration: none; }
.bar .lang-menu a:hover { background: var(--tint); }
.bar .lang-menu a[aria-current] { font-weight: 800; }
.not-translated { margin: 0 0 20px; padding: 10px 14px; border-radius: 8px; background: var(--tint); color: var(--ink); font-size: 15px; }
.shell { max-width: 1100px; margin: 0 auto; padding: 24px 16px 72px; display: grid; grid-template-columns: 230px minmax(0, 1fr); gap: 40px; align-items: start; }
nav.chapters { position: sticky; top: 76px; font-size: 14px; }
nav.chapters h2 { margin: 0 0 8px; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
nav.chapters ol { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; }
nav.chapters a { display: block; padding: 5px 10px; border-radius: 7px; color: var(--ink); text-decoration: none; line-height: 1.35; }
nav.chapters a:hover { background: var(--tint); }
nav.chapters a[aria-current="page"] { background: var(--tint); color: var(--accent); font-weight: 700; }
main { min-width: 0; max-width: 760px; }
h1 { margin: 0 0 8px; font-size: 34px; line-height: 1.15; letter-spacing: -0.025em; text-wrap: balance; }
h2 { margin: 40px 0 8px; font-size: 23px; letter-spacing: -0.015em; text-wrap: balance; }
h3 { margin: 26px 0 6px; font-size: 17px; }
.lead { color: var(--muted); font-size: 18px; margin: 0 0 20px; }
p, ul, ol { margin: 0 0 14px; }
li { margin-bottom: 4px; }
strong.ui { font-weight: 700; white-space: nowrap; }
kbd { padding: 1px 6px; border: 1px solid var(--edge); border-bottom-width: 2px; border-radius: 5px; background: var(--card); font: 600 0.86em/1.5 ui-monospace, Consolas, monospace; }
code { padding: 1px 5px; border-radius: 5px; background: var(--code); font: 0.9em ui-monospace, Consolas, monospace; }
pre { overflow-x: auto; padding: 14px 16px; border-radius: 8px; background: var(--code); direction: ltr; text-align: left; }
pre code { padding: 0; background: none; }
figure { margin: 22px 0; }
figure img { display: block; width: 100%; height: auto; border: 1px solid var(--edge); border-radius: 8px; background: var(--card); }
figcaption { margin-top: 6px; color: var(--muted); font-size: 13.5px; }
aside.tip { margin: 18px 0; padding: 12px 16px; border-radius: 8px; background: var(--tint); border: 1px solid var(--edge); }
aside.tip > :last-child { margin-bottom: 0; }
.table-scroll { overflow-x: auto; margin: 0 0 16px; }
table { border-collapse: collapse; font-size: 15px; min-width: 100%; }
table.keys { table-layout: fixed; }
table.keys td:first-child { width: 42%; }
th, td { padding: 7px 12px; border-bottom: 1px solid var(--edge); text-align: start; vertical-align: top; }
th { color: var(--muted); font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; }
/* Where a link from the program lands, the section is outlined from its heading to its end. */
.guide-part:has(> :is(h2, h3):target) { outline: 3px solid var(--accent); outline-offset: 10px; border-radius: 6px; }
:is(h2, h3):target { scroll-margin-top: 24px; }
.toc { margin: 0 0 24px; padding: 12px 16px; border: 1px solid var(--edge); border-radius: 8px; background: var(--card); font-size: 14.5px; }
.toc b { display: block; margin-bottom: 4px; color: var(--muted); font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; }
.toc ul { margin: 0; padding-inline-start: 18px; }
.pager { display: flex; justify-content: space-between; gap: 12px; margin-top: 44px; padding-top: 18px; border-top: 1px solid var(--edge); }
.pager a { display: block; max-width: 48%; padding: 10px 14px; border: 1px solid var(--edge); border-radius: 8px; background: var(--card); text-decoration: none; color: var(--ink); }
.pager a small { display: block; color: var(--muted); font-size: 12px; }
.pager a.next { margin-inline-start: auto; text-align: end; }
.cards { list-style: none; margin: 24px 0 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
.cards a { display: block; height: 100%; padding: 14px 16px; border: 1px solid var(--edge); border-radius: 8px; background: var(--card); text-decoration: none; color: var(--ink); }
.cards a:hover { border-color: var(--accent); }
.cards b { display: block; margin-bottom: 2px; }
.cards span { color: var(--muted); font-size: 14px; line-height: 1.45; display: block; }
footer.note { max-width: 1100px; margin: 0 auto; padding: 0 16px 12px; color: var(--muted); font-size: 14px; }
.site-footer { max-width: 1100px; margin: 0 auto; padding: 14px 16px 40px; border-top: 1px solid var(--edge); display: flex; flex-wrap: wrap; justify-content: space-between; gap: 6px 24px; color: var(--muted); font-size: 13px; }
.site-footer .trademark { flex: 1 0 100%; margin: 0; font-size: 12px; line-height: 1.45; }
.site-footer a { color: var(--muted); text-decoration: none; }
.site-footer a:hover { color: var(--accent); text-decoration: underline; }
.site-footer .dot { margin: 0 8px; }
@media (max-width: 820px) {
  .shell { grid-template-columns: minmax(0, 1fr); gap: 16px; }
  nav.chapters { position: static; }
  nav.chapters ol { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); }
  h1 { font-size: 28px; }
  .brand-note { display: none; }
}
@media (max-width: 720px) {
  .bar-inner { flex-wrap: wrap; }
  .guide-search { order: 5; flex: 1 1 100%; }
}
.print-link { margin: 0 0 14px; }
.print-link a, nav.chapters .print-link a { display: flex; align-items: center; gap: 9px; padding: 9px 12px; border: 1px solid var(--accent); border-radius: 8px; background: var(--tint); color: var(--accent); font-weight: 700; line-height: 1.3; text-decoration: none; }
.print-link a:hover, .print-link a:focus-visible, nav.chapters .print-link a:hover, nav.chapters .print-link a:focus-visible { background: var(--accent); color: var(--accent-ink); }
.print-link svg { flex: none; }
.print-link.in-page { margin: 0 0 22px; max-width: 360px; }
.print-actions { margin: 0 0 24px; }
.print-actions button { padding: 8px 16px; border: 0; border-radius: 8px; background: var(--accent); color: var(--accent-ink); font: inherit; font-weight: 700; cursor: pointer; }
.print-chapter { margin-top: 56px; padding-top: 8px; border-top: 1px solid var(--edge); }
.print-chapter > h2 { margin-top: 20px; font-size: 28px; }
.print-contents { margin: 0 0 24px; padding-inline-start: 22px; columns: 2; column-gap: 32px; }
.print-contents li { break-inside: avoid; }
@media (max-width: 560px) { .print-contents { columns: 1; } }
@media print {
  @page { margin: 16mm 14mm; }
  :root, :root[data-theme="dark"], :root[data-theme="dark"][data-palette="graphite"] {
    color-scheme: light;
    --ground: #ffffff; --card: #ffffff; --ink: #1a1a1a; --muted: #5c5c5c; --edge: #cfcfcf;
    --accent: #8a4d04; --tint: #f1f1f1; --code: #f1f1f1;
  }
  body { font-size: 11pt; line-height: 1.55; }
  .bar, nav.chapters, .pager, .print-actions { display: none; }
  mark.guide-hit { background: none; color: inherit; padding: 0; }
  .shell { display: block; padding: 0; }
  main { max-width: none; }
  h2, h3, h4 { break-after: avoid; }
  figure, table, pre, aside.tip { break-inside: avoid; }
  figure img { max-height: 120mm; width: auto; max-width: 100%; }
  .print-all .site-footer, .print-all footer.note { display: none; }
  .print-chapter { margin-top: 0; padding-top: 0; border-top: 0; break-before: page; }
}
`;

/**
 * The guide opens in a tab of its own next to layerling. If layerling answers
 * in another tab, "Open the editor" closes the guide instead of opening the
 * editor a second time (#103); see tabPresence.ts for the channel. A browser
 * that will not let the tab close gets a note, and a second click opens the
 * editor here after all.
 */
function editorButtonScript(strings) {
  return `(function(){var b=document.getElementById("open-editor");if(!b||typeof BroadcastChannel==="undefined")return;var elsewhere=false,c=new BroadcastChannel("layerling-tabs"),id="guide-"+Math.random().toString(36).slice(2);c.onmessage=function(e){var m=e.data;if(m&&m.kind==="here"&&m.tabId!==id&&!elsewhere){elsewhere=true;b.textContent=${JSON.stringify(strings.backToEditor)};}};c.postMessage({kind:"ask",tabId:id});b.addEventListener("click",function(e){if(!elsewhere)return;e.preventDefault();window.close();setTimeout(function(){elsewhere=false;b.textContent=${JSON.stringify(strings.openEditor)};var n=document.getElementById("editor-elsewhere");if(n)n.hidden=false;},400);});})();`;
}

const HEADING_PATTERN = /<h([23]) id="([^"]+)">([\s\S]*?)<\/h\1>/g;

/** The text of some rendered HTML, as one line. */
export function plainText(html) {
  return html
    .replace(/<\/(p|li|tr|td|th|h[1-6]|div|aside|figcaption|figure|pre)>/g, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * What the guide search looks through: one entry per section of a chapter (the part before its first
 * heading counts as the chapter's own), each with the address to jump to. `c` is the chapter, `h`
 * the section heading ("" for the chapter itself), `u` the address and `t` the plain text.
 */
export function searchEntries({ title, summary, html, path }) {
  const matches = [...html.matchAll(HEADING_PATTERN)];
  const entries = [{ c: title, h: "", u: path, t: [summary, plainText(html.slice(0, matches[0]?.index ?? html.length))].filter(Boolean).join(" ") }];
  matches.forEach((match, position) => {
    const end = matches[position + 1]?.index ?? html.length;
    entries.push({ c: title, h: plainText(match[3]), u: `${path}#${match[2]}`, t: plainText(html.slice(match.index + match[0].length, end)) });
  });
  return entries;
}

/**
 * Wraps every section of a chapter (a heading and what follows it up to the next heading of the same
 * or a higher level) in an element of its own, so the section a link points at can be outlined as a
 * whole: `.guide-part:has(> h2:target)`. Only the chapter page gets this, the search index and the
 * print page keep the plain text.
 */
export function wrapSections(html) {
  const open = [];
  let out = "";
  let last = 0;
  for (const match of html.matchAll(HEADING_PATTERN)) {
    out += html.slice(last, match.index);
    const level = Number(match[1]);
    while (open.length && open[open.length - 1] >= level) { open.pop(); out += "</section>"; }
    open.push(level);
    out += '<section class="guide-part">';
    last = match.index;
  }
  out += html.slice(last);
  while (open.length) { open.pop(); out += "</section>"; }
  return out;
}

/**
 * The matching, kept apart from the page so a test can run it and the editor's Interactive Help can
 * use it: the functions live in apps/web/src/lib/guideSearchCore.ts, and this is their text, which
 * every page embeds. Written for browsers, so plain ES5 and no backslashes there.
 */
const searchCore = await import(pathToFileURL(join(root, "apps", "web", "src", "lib", "guideSearchCore.ts")).href);
export const GUIDE_SEARCH_CORE = "\n" + searchCore.GUIDE_SEARCH_CORE_FUNCTIONS.map((fn) => fn.toString()).join("\n") + "\n";

const GUIDE_SEARCH_PAGE = `
function guideSnippet(hit){
  var text=hit.entry.t,first=-1;
  hit.forms.forEach(function(group){var f=guideFind(hit.folded,group,0);if(f&&(first<0||f.at<first))first=f.at;});
  var from=first>40?first-40:0;
  if(from>0){var gap=text.indexOf(" ",from);if(gap>=0&&gap<first)from=gap+1;}
  var end=Math.min(text.length,from+150),marked=[];
  for(var i=from;i<end;i++)marked.push(false);
  hit.forms.forEach(function(group){var f=guideFind(hit.folded,group,from);while(f&&f.at<end){for(var j=f.at;j<f.at+f.len&&j<end;j++)marked[j-from]=true;f=guideFind(hit.folded,group,f.at+f.len);}});
  var parts=[],run="",state=false;
  if(from>0)parts.push({text:"... ",mark:false});
  for(var m=0;m<marked.length;m++){if(marked[m]!==state&&run){parts.push({text:run,mark:state});run="";}state=marked[m];run+=text.charAt(from+m);}
  if(run)parts.push({text:run,mark:state});
  if(end<text.length)parts.push({text:" ...",mark:false});
  return parts;
}
function guideUnmarkPage(){
  Array.prototype.forEach.call(document.querySelectorAll("mark.guide-hit"),function(mark){var parent=mark.parentNode;parent.replaceChild(document.createTextNode(mark.textContent),mark);parent.normalize();});
}
function guideMarkPage(query,umlauts,anchor){
  var main=document.querySelector("main");if(!main)return;
  guideUnmarkPage();
  var walker=document.createTreeWalker(main,NodeFilter.SHOW_TEXT,null),nodes=[],node,marks=[];
  while((node=walker.nextNode()))if(node.nodeValue.trim()&&!node.parentNode.closest("script,style"))nodes.push(node);
  nodes.forEach(function(node){
    var text=node.nodeValue,ranges=guideRanges(guideFold(text),query,umlauts);if(!ranges.length)return;
    var piece=document.createDocumentFragment(),pos=0;
    ranges.forEach(function(r){
      if(r.at>pos)piece.appendChild(document.createTextNode(text.slice(pos,r.at)));
      var mark=document.createElement("mark");mark.className="guide-hit";mark.textContent=text.slice(r.at,r.at+r.len);piece.appendChild(mark);marks.push(mark);pos=r.at+r.len;
    });
    if(pos<text.length)piece.appendChild(document.createTextNode(text.slice(pos)));
    node.parentNode.replaceChild(piece,node);
  });
  if(!marks.length)return;
  var target=anchor?document.getElementById(anchor):null,first=marks[0];
  if(target)for(var i=0;i<marks.length;i++){if(target.compareDocumentPosition(marks[i])&Node.DOCUMENT_POSITION_FOLLOWING){first=marks[i];break;}}
  first.scrollIntoView({block:"center"});
}
(function(){
  var form=document.getElementById("guide-search");if(!form||!window.fetch)return;
  var input=form.querySelector("input"),box=document.getElementById("guide-results"),prepared=null,loading=null;
  var umlauts=form.getAttribute("data-umlauts")==="true";
  function remember(link){
    try{sessionStorage.setItem("layerling.guideHit",JSON.stringify({q:input.value,p:link.pathname}));}catch(e){}
    if(link.pathname===location.pathname)setTimeout(markRemembered,0);
  }
  function markRemembered(){
    var hit=null;try{hit=JSON.parse(sessionStorage.getItem("layerling.guideHit")||"null");sessionStorage.removeItem("layerling.guideHit");}catch(e){}
    if(!hit||hit.p!==location.pathname||!guideTokens(hit.q||"").length)return;
    var anchor="";try{anchor=decodeURIComponent(location.hash.slice(1));}catch(e){}
    guideMarkPage(hit.q,umlauts,anchor);
  }
  if(document.readyState==="complete")markRemembered();else window.addEventListener("load",markRemembered);
  document.addEventListener("keydown",function(e){if(e.key==="Escape")guideUnmarkPage();});
  document.addEventListener("click",function(e){if(e.target.closest&&e.target.closest("mark.guide-hit"))guideUnmarkPage();});
  function load(){if(!loading){loading=fetch(form.getAttribute("data-index")).then(function(r){return r.json();}).then(function(list){prepared=guidePrepare(list);}).catch(function(){loading=null;});}return loading;}
  function close(){box.hidden=true;input.setAttribute("aria-expanded","false");}
  function render(){
    if(!guideTokens(input.value).length){close();return;}
    if(!prepared){load().then(function(){if(prepared)render();});return;}
    var hits=guideSearch(prepared,input.value,8,umlauts);
    box.textContent="";
    if(!hits.length){var none=document.createElement("p");none.textContent=form.getAttribute("data-nothing");box.appendChild(none);}
    hits.forEach(function(hit){
      var link=document.createElement("a"),title=document.createElement("b"),line=document.createElement("span");
      link.href=hit.entry.u;link.addEventListener("click",function(){remember(link);});
      title.textContent=hit.entry.h?hit.entry.c+" > "+hit.entry.h:hit.entry.c;
      guideSnippet(hit).forEach(function(part){if(part.mark){var mark=document.createElement("mark");mark.textContent=part.text;line.appendChild(mark);}else line.appendChild(document.createTextNode(part.text));});
      link.appendChild(title);link.appendChild(line);box.appendChild(link);
    });
    box.hidden=false;input.setAttribute("aria-expanded","true");
  }
  input.addEventListener("input",render);
  input.addEventListener("focus",function(){load();if(input.value)render();});
  input.addEventListener("keydown",function(e){
    if(e.key==="ArrowDown"){var first=box.querySelector("a");if(first){e.preventDefault();first.focus();}}
    else if(e.key==="Escape"){input.value="";close();}
  });
  form.addEventListener("submit",function(e){e.preventDefault();var first=box.querySelector("a");if(first){remember(first);window.location.href=first.href;}});
  box.addEventListener("keydown",function(e){
    var current=document.activeElement;
    if(e.key==="ArrowDown"&&current.nextElementSibling){e.preventDefault();current.nextElementSibling.focus();}
    else if(e.key==="ArrowUp"){e.preventDefault();if(current.previousElementSibling)current.previousElementSibling.focus();else input.focus();}
    else if(e.key==="Escape"){input.focus();close();}
  });
  box.addEventListener("click",close);
  document.addEventListener("click",function(e){if(!form.contains(e.target))close();});
})();
`;

function guideSearchScript() {
  return GUIDE_SEARCH_CORE + GUIDE_SEARCH_PAGE;
}

/** The search box in the header of a guide page; the script fills it with results. */
function searchForm(strings, language) {
  return `<form class="guide-search" id="guide-search" role="search" data-index="/${strings.dir}/search-index.json" data-nothing="${escapeHtml(strings.searchNothing)}" data-umlauts="${LANGUAGE_INFO[language].asciiUmlauts ? "true" : "false"}"><input type="search" id="guide-search-input" name="q" placeholder="${escapeHtml(strings.search)}" aria-label="${escapeHtml(strings.search)}" aria-controls="guide-results" aria-expanded="false" autocomplete="off" spellcheck="false"><div class="guide-results" id="guide-results" hidden></div></form>`;
}

export const THEME_SCRIPT = `try{var t=localStorage.getItem("layerling.theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t;else if(t==="graphite"){document.documentElement.dataset.theme="dark";document.documentElement.dataset.palette="graphite"}}catch(e){}`;

function pageShell({ language, title, description, path, alternates, chapters, current, body, languageLinks, footer, englishPath, noindex = false, bodyClass = "" }) {
  const strings = GUIDE_LANGUAGES[language];
  const nav = chapters
    .map((chapter) => `<li><a href="/${strings.dir}/${chapter.slug}.html"${chapter.slug === current ? ' aria-current="page"' : ""}>${escapeHtml(chapter.title)}</a></li>`)
    .join("");
  const alternateLinks = Object.entries(alternates)
    .map(([code, href]) => `<link rel="alternate" hreflang="${code}" href="${SITE}${href}">`)
    .join("\n    ");
  return `<!doctype html>
<html lang="${strings.htmlLang}"${RTL_LANGUAGES.has(strings.htmlLang.split("-")[0]) ? ' dir="rtl"' : ""}>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <link rel="canonical" href="${SITE}${englishPath ?? path}">
    ${englishPath || noindex ? '<meta name="robots" content="noindex">\n    ' : ""}${alternateLinks}
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:image" content="${SITE}/assets/layerling/layerling-social.png">
    <link rel="icon" href="/assets/layerling/layerling-logo.svg">
    <script>${THEME_SCRIPT}</script>
    <style>${STYLE}</style>
  </head>
  <body${bodyClass ? ` class="${bodyClass}"` : ""}>
    <header class="bar"><div class="bar-inner">
      <a class="brand" href="/${strings.dir}/index.html"><img src="/assets/layerling/layerling-logo.svg" alt=""><span class="brand-text"><b>layerling</b><span class="brand-note">${escapeHtml(strings.home)}</span></span></a>
      ${searchForm(strings, language)}
      ${languageMenu(languageLinks, language, strings)}
      <a class="button" id="open-editor" href="/">${escapeHtml(strings.openEditor)}</a>
    </div><p class="editor-elsewhere" id="editor-elsewhere" role="status" hidden>${escapeHtml(strings.editorElsewhere)}</p></header>
    <div class="shell">
      <nav class="chapters" aria-label="${escapeHtml(strings.chapters)}"><h2>${escapeHtml(strings.chapters)}</h2>${printLink(strings)}<ol>${nav}</ol></nav>
      <main>
${body}
      </main>
    </div>
    <footer class="note">${escapeHtml(strings.sourceNote)} <a href="${strings.forumUrl}" rel="noopener">${escapeHtml(strings.forum)}</a>.</footer>
    ${footer}
    <script>${editorButtonScript(strings)}</script>
    <script>${guideSearchScript()}</script>
  </body>
</html>
`;
}

/** The language menu of a guide page: the language it is in, and a link to the same page in each of the others. */
function languageMenu(links, language, strings) {
  const items = links
    .map((entry) => `<li><a href="${escapeHtml(entry.href)}" hreflang="${entry.htmlLang}" lang="${entry.htmlLang}"${entry.code === language ? ' aria-current="true"' : ""}>${escapeHtml(entry.name)}</a></li>`)
    .join("");
  return `<details class="lang-menu"><summary aria-label="${escapeHtml(strings.languageMenu)}">${escapeHtml(LANGUAGE_INFO[language].name)}</summary><ul>${items}</ul></details>`;
}

/**
 * Every chapter one after the other on one page, for printing the guide or saving it as a PDF. The
 * chapters keep their text; what changes is that their anchors are prefixed with the chapter (two
 * chapters may use the same heading), links between chapters point into the page, the headings sit one
 * level lower under the chapter's own title, and the pictures load at once - a printout needs them all.
 */
export function renderPrintAll({ language, chapters, printable, footer, languageLinks }) {
  const strings = GUIDE_LANGUAGES[language];
  const dir = strings.dir;
  const slugs = new Set(chapters.map((chapter) => chapter.slug));
  const inPage = (html, slug) => html
    .replace(/<(\/?)h([2-5])\b/g, (_, close, level) => `<${close}h${Number(level) + 1}`)
    .replace(/ id="([^"]+)"/g, (_, id) => ` id="${slug}--${id}"`)
    .replace(/ href="#([^"]+)"/g, (_, id) => ` href="#${slug}--${id}"`)
    .replace(new RegExp(` href="/${dir}/([\\w-]+)\\.html(?:#([^"]*))?"`, "g"), (whole, target, anchor) =>
      slugs.has(target) ? ` href="#${anchor ? `${target}--${anchor}` : `chapter-${target}`}"` : whole)
    .replace(/ loading="lazy"/g, "");
  const contents = chapters.map((chapter, position) => `<li><a href="#chapter-${chapter.slug}">${escapeHtml(chapter.title)}</a></li>`).join("");
  const sections = printable.map(({ chapter, html }, position) => {
    const notice = chapter.fallback ? `<p class="not-translated" role="note" lang="${strings.htmlLang}">${escapeHtml(strings.notTranslated)}</p>\n` : "";
    return `<section class="print-chapter" id="chapter-${chapter.slug}">\n<h2>${position + 1}. ${escapeHtml(chapter.title)}</h2>\n<p class="lead">${escapeHtml(chapter.summary)}</p>\n${notice}${inPage(html, chapter.slug)}\n</section>`;
  }).join("\n");
  const body = `<h1>${escapeHtml(strings.printAllTitle)}</h1>\n<p class="lead">${escapeHtml(strings.printAllLead)}</p>\n<p class="print-actions"><button type="button" id="print-now">${escapeHtml(strings.printButton)}</button></p>\n<h2 class="print-contents-title">${escapeHtml(strings.printContents)}</h2>\n<ol class="print-contents">${contents}</ol>\n${sections}`;
  return pageShell({
    language, title: `${strings.printAllTitle} - ${strings.site}`, description: strings.printAllLead, path: `/${dir}/${PRINT_ALL_PAGE}`,
    alternates: {}, chapters, current: "", footer: `${footer}\n    <script>document.getElementById("print-now").addEventListener("click",function(){window.print();});</script>`,
    body, languageLinks, noindex: true, bodyClass: "print-all",
  });
}

/** The chapters of one language, in reading order, each with its number prefix as pairing key. */
export async function readChapters(language) {
  const directory = join(guideSource, language);
  if (!existsSync(directory)) return [];
  const files = (await readdir(directory)).filter((name) => /^\d+-.+\.md$/.test(name)).sort();
  const chapters = [];
  for (const file of files) {
    const [, number, slug] = /^(\d+)-(.+)\.md$/.exec(file);
    const { meta, body } = parseFrontMatter(await readFile(join(directory, file), "utf8"));
    chapters.push({ file, number, slug, title: meta.title ?? slug, summary: meta.summary ?? "", body });
  }
  return chapters;
}

/** The numbers a chapter may quote with {{value:NAME}}: every numeric export of roundness.ts. */
export async function loadValues() {
  const module = await import(pathToFileURL(join(root, "apps", "web", "src", "lib", "roundness.ts")).href);
  return Object.fromEntries(Object.entries(module).filter(([, value]) => typeof value === "number"));
}

export async function loadMessages(language) {
  const load = async (code) => {
    const module = await import(pathToFileURL(join(root, "apps", "web", "src", "lib", `messages.${code}.ts`)).href);
    return module[`MESSAGES_${code.toUpperCase().replace(/-/g, "_")}`];
  };
  const english = await load("en");
  return language === "en" ? english : { ...english, ...(await load(language)) };
}

/**
 * The chapters a language's guide has: its own where it translated them, the English ones for the
 * rest, marked as such. Every language therefore has every chapter and every link into the guide
 * lands, whatever stage the translation is at.
 */
export function effectiveChapters(language, chaptersByLanguage) {
  const english = chaptersByLanguage.en ?? [];
  if (language === "en") return english.map((chapter) => ({ ...chapter, fallback: false }));
  const own = chaptersByLanguage[language] ?? [];
  const merged = english.map((chapter) => {
    const mine = own.find((entry) => entry.number === chapter.number);
    return mine ? { ...mine, fallback: false } : { ...chapter, fallback: true };
  });
  // A chapter only this language has (German once had some) stays, in its place by number.
  for (const chapter of own) if (!english.some((entry) => entry.number === chapter.number)) merged.push({ ...chapter, fallback: false });
  return merged.sort((a, b) => a.number.localeCompare(b.number));
}

export async function buildGuide({ log = console.log } = {}) {
  const result = { pages: [], warnings: [] };
  const shortcutGroups = await readShortcutGroups();
  const environment = await readEnvironment();
  const version = JSON.parse(await readFile(join(root, "package.json"), "utf8")).version;
  const chaptersByLanguage = {};
  for (const language of LANGUAGE_CODES) chaptersByLanguage[language] = await readChapters(language);
  // Every language has every chapter: its own, or the English one where it has not translated it yet.
  const effective = Object.fromEntries(LANGUAGE_CODES.map((code) => [code, effectiveChapters(code, chaptersByLanguage)]));
  const english = GUIDE_LANGUAGES.en;

  for (const [language, strings] of Object.entries(GUIDE_LANGUAGES)) {
    const chapters = effective[language];
    const messages = await loadMessages(language);
    const values = await loadValues();
    const shortcutsHtml = renderShortcuts(shortcutGroups, messages, language);
    const footer = renderFooter({ language, messages, environment, version });
    const outputRoot = join(publicDirectory, strings.dir);
    await rm(outputRoot, { recursive: true, force: true });
    await mkdir(join(outputRoot, "img"), { recursive: true });

    // The pictures are shared: a language copies only the ones it has of its own,
    // and every other picture is taken where the English guide keeps it. Copying
    // them into each language folder cost 3 MB per language in the export, which
    // the desktop package pays for in its budget.
    const ownPictures = new Set();
    const imageSizes = new Map();
    const ownImageDirectory = join(guideSource, "images", language);
    if (existsSync(ownImageDirectory)) {
      for (const file of await readdir(ownImageDirectory)) {
        if (!file.endsWith(".webp")) continue;
        ownPictures.add(file.slice(0, -5));
        await copyFile(join(ownImageDirectory, file), join(outputRoot, "img", file));
        imageSizes.set(file.slice(0, -5), webpSize(await readFile(join(ownImageDirectory, file))));
      }
    }
    for (const file of await readdir(join(guideSource, "images", "en"))) {
      if (!file.endsWith(".webp")) continue;
      const name = file.slice(0, -5);
      if (imageSizes.has(name)) continue;
      imageSizes.set(name, webpSize(await readFile(join(guideSource, "images", "en", file))));
    }

    /** Where a chapter lives in each language (the same page in the others), or their overview when it does not exist there. */
    const languageLinksFor = (number) => LANGUAGE_CODES.map((code) => {
      const target = GUIDE_LANGUAGES[code];
      const slug = number === null ? null : effective[code].find((entry) => entry.number === number)?.slug;
      return { code, name: LANGUAGE_INFO[code].name, htmlLang: target.htmlLang, href: `/${target.dir}/${slug ?? "index"}.html` };
    });

    /** For each heading of this language's own chapter, the id of the English heading it stands for (see englishHeadingPairs). */
    const englishHeadingIdsFor = (chapter) => {
      if (language === "en" || chapter.fallback) return null;
      const source = effective.en.find((entry) => entry.number === chapter.number);
      return source ? englishHeadingPairs(chapter.body, source.body) : null;
    };

    const searchIndex = [];
    const printable = [];
    for (const [position, chapter] of chapters.entries()) {
      const context = {
        language,
        messages,
        values,
        shortcutsHtml,
        imageSize: (name) => imageSizes.get(name) ?? null,
        imageSrc: (name) => (ownPictures.has(name) ? `/${strings.dir}/img/${name}.webp` : `/${GUIDE_LANGUAGES.en.dir}/img/${name}.webp`),
        references: { uiKeys: new Set(), shots: new Set(), chapters: new Set() },
        englishHeadingIds: englishHeadingIdsFor(chapter),
        ownHeadingIds: new Set(headingIds(chapter.body)),
      };
      let rendered;
      try {
        rendered = renderBlocks(chapter.body, context);
      } catch (error) {
        throw new Error(`${language}/${chapter.file}: ${error.message}`);
      }
      for (const name of context.references.shots) {
        if (!imageSizes.has(name)) result.warnings.push(`${language}/${chapter.file}: picture "${name}" is missing`);
      }
      const path = `/${strings.dir}/${chapter.slug}.html`;
      // Only the languages that really translated this chapter are alternates of each other; a page showing English text points at the English one.
      const alternates = {};
      for (const code of LANGUAGE_CODES) {
        const mine = chaptersByLanguage[code]?.find((entry) => entry.number === chapter.number);
        if (mine) alternates[GUIDE_LANGUAGES[code].htmlLang] = `/${GUIDE_LANGUAGES[code].dir}/${mine.slug}.html`;
      }
      const englishPath = chapter.fallback ? `/${english.dir}/${chapter.slug}.html` : undefined;
      const previous = chapters[position - 1];
      const next = chapters[position + 1];
      const toc = rendered.headings.length > 2
        ? `<div class="toc"><b>${escapeHtml(strings.onThisPage)}</b><ul>${rendered.headings.map((heading) => `<li><a href="#${heading.id}">${heading.text}</a></li>`).join("")}</ul></div>`
        : "";
      const pager = `<div class="pager">${previous ? `<a href="/${strings.dir}/${previous.slug}.html"><small>${escapeHtml(strings.previous)}</small>${escapeHtml(previous.title)}</a>` : ""}${next ? `<a class="next" href="/${strings.dir}/${next.slug}.html"><small>${escapeHtml(strings.next)}</small>${escapeHtml(next.title)}</a>` : ""}</div>`;
      const notice = chapter.fallback ? `<p class="not-translated" role="note" lang="${strings.htmlLang}">${escapeHtml(strings.notTranslated)}</p>\n` : "";
      const body = `<h1>${escapeHtml(chapter.title)}</h1>\n<p class="lead">${escapeHtml(chapter.summary)}</p>\n${notice}${toc}\n${wrapSections(rendered.html)}\n${pager}`;
      const page = pageShell({
        language, title: `${chapter.title} - ${strings.site}`, description: chapter.summary, path, alternates, chapters,
        current: chapter.slug, body, footer, languageLinks: languageLinksFor(chapter.number), englishPath,
      });
      await writeFile(join(outputRoot, `${chapter.slug}.html`), page);
      printable.push({ chapter, html: rendered.html });
      searchIndex.push(...searchEntries({ title: chapter.title, summary: chapter.summary, html: rendered.html, path }));
      // A page that only shows English text is no page of its own for a search engine.
      if (!chapter.fallback) result.pages.push({ path, alternates });
    }

    await writeFile(join(outputRoot, PRINT_ALL_PAGE), renderPrintAll({ language, chapters, printable, footer, languageLinks: LANGUAGE_CODES.map((code) => ({ code, name: LANGUAGE_INFO[code].name, htmlLang: GUIDE_LANGUAGES[code].htmlLang, href: `/${GUIDE_LANGUAGES[code].dir}/${PRINT_ALL_PAGE}` })) }));

    const cards = chapters
      .map((chapter) => `<li><a href="/${strings.dir}/${chapter.slug}.html"><b>${escapeHtml(chapter.title)}</b><span>${escapeHtml(chapter.summary)}</span></a></li>`)
      .join("");
    const indexPath = `/${strings.dir}/index.html`;
    const indexAlternates = Object.fromEntries(LANGUAGE_CODES.map((code) => [GUIDE_LANGUAGES[code].htmlLang, `/${GUIDE_LANGUAGES[code].dir}/index.html`]));
    const indexPage = pageShell({
      language, title: strings.site, description: strings.overviewLead, path: indexPath,
      alternates: indexAlternates, chapters, current: "", footer,
      body: `<h1>${escapeHtml(strings.site)}</h1>\n<p class="lead">${escapeHtml(strings.overviewLead)}</p>\n${printLink(strings, "in-page")}\n<ul class="cards">${cards}</ul>`,
      languageLinks: languageLinksFor(null),
    });
    await writeFile(join(outputRoot, "index.html"), indexPage);
    await writeFile(join(outputRoot, "search-index.json"), JSON.stringify(searchIndex));
    result.pages.unshift({ path: indexPath, alternates: indexAlternates });
  }

  const urls = [{ path: "/", alternates: {} }, ...result.pages];
  const entry = ({ path, alternates }) => {
    const links = Object.entries(alternates).map(([code, href]) => `\n    <xhtml:link rel="alternate" hreflang="${code}" href="${SITE}${href}"/>`).join("");
    return `  <url>\n    <loc>${SITE}${path}</loc>${links}\n  </url>`;
  };
  await writeFile(
    join(publicDirectory, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.map(entry).join("\n")}\n</urlset>\n`,
  );
  for (const warning of result.warnings) log(`Guide: ${warning}`);
  log(`Guide: ${result.pages.length} pages built`);
  return result;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await buildGuide();
}
