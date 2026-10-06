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

export const GUIDE_LANGUAGES = {
  de: {
    dir: "anleitung",
    htmlLang: "de",
    quotes: ["„", "“"],
    site: "layerling Anleitung",
    home: "Anleitung",
    openEditor: "Zum Editor",
    backToEditor: "Zurück zum Editor",
    editorElsewhere: "Der Editor ist schon in einem anderen Tab offen - wechsle einfach dorthin.",
    chapters: "Kapitel",
    onThisPage: "Auf dieser Seite",
    previous: "Vorheriges Kapitel",
    next: "Nächstes Kapitel",
    switchLanguage: "English",
    switchTitle: "Read this in English",
    overviewLead: "Alles, was layerling kann, Schritt für Schritt. Die Bilder entstehen aus dem laufenden Programm und werden mit jeder Fassung neu aufgenommen.",
    sourceNote: "Diese Anleitung wächst mit dem Programm. Fehlt dir etwas oder stimmt etwas nicht, sag es im",
    forum: "Forum",
    forumUrl: "https://forum.drucktipps3d.de/forum/board/127-layerling/",
  },
  en: {
    dir: "guide",
    htmlLang: "en",
    quotes: ["“", "”"],
    site: "layerling user guide",
    home: "User guide",
    openEditor: "Open the editor",
    backToEditor: "Back to the editor",
    editorElsewhere: "The editor is already open in another tab - just switch to it.",
    chapters: "Chapters",
    onThisPage: "On this page",
    previous: "Previous chapter",
    next: "Next chapter",
    switchLanguage: "Deutsch",
    switchTitle: "Auf Deutsch lesen",
    overviewLead: "Everything layerling can do, step by step. The pictures are taken from the running program and are renewed with every version.",
    sourceNote: "This guide grows with the program. If something is missing or wrong, tell us in the",
    forum: "discussions",
    forumUrl: "https://github.com/henmedia/layerling/discussions",
  },
  ru: {
    dir: "ru",
    htmlLang: "ru",
    quotes: ["«", "»"],
    site: "Руководство layerling",
    home: "Руководство",
    openEditor: "Открыть редактор",
    backToEditor: "Вернуться в редактор",
    editorElsewhere: "Редактор уже открыт в другой вкладке — просто переключитесь туда.",
    chapters: "Главы",
    onThisPage: "На этой странице",
    previous: "Предыдущая глава",
    next: "Следующая глава",
    switchLanguage: "English",
    switchTitle: "Read this in English",
    overviewLead: "Всё, что умеет layerling, шаг за шагом. Картинки сняты с работающей программы и обновляются с каждой версией.",
    sourceNote: "Это руководство растёт вместе с программой. Если чего-то не хватает или что-то не так — напишите в",
    forum: "обсуждениях",
    forumUrl: "https://github.com/henmedia/layerling/discussions",
  },
};

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
  const fallback = language === "de" ? { imprint: "Impressum", privacy: "Datenschutz" } : { imprint: "Imprint", privacy: "Privacy Policy" };
  const left = [];
  const sponsorUrl = environment.NEXT_PUBLIC_SPONSOR_URL?.trim();
  if (sponsorUrl) left.push(link(sponsorUrl.startsWith("/") ? `${sponsorUrl}${sponsorUrl.includes("?") ? "&" : "?"}lang=${language}` : sponsorUrl, environment.NEXT_PUBLIC_SPONSOR_LABEL?.trim() || messages["dashboard.sponsor"], external));
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
  return `<footer class="site-footer">${group(left)}${group(right)}</footer>`;
}

export function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const CYRILLIC_TRANSLITERATION = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i",
  й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t",
  у: "u", ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y",
  ь: "", э: "e", ю: "yu", я: "ya",
};


export function slugify(text) {
  return text
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[а-яё]/g, (letter) => CYRILLIC_TRANSLITERATION[letter] ?? letter)
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
  work = work.replace(/\{\{ui:([A-Za-z0-9_.-]+)\}\}/g, (_, key) => {
    const label = context.messages?.[key];
    context.references?.uiKeys.add(key);
    if (label === undefined) throw new Error(`Unknown interface text {{ui:${key}}}`);
    return `<strong class="ui">${open}${escapeHtml(label)}${close}</strong>`;
  });
  work = work.replace(/\{\{value:([A-Za-z0-9_]+)\}\}/g, (_, name) => {
    const value = context.values?.[name];
    if (typeof value !== "number") throw new Error(`Unknown value {{value:${name}}}`);
    return new Intl.NumberFormat(GUIDE_LANGUAGES[context.language].htmlLang, { maximumFractionDigits: 6, useGrouping: false }).format(value);
  });
  work = work.replace(/\[\[([^\]]+)\]\]/g, (_, keys) =>
    keys.split("+").map((key) => `<kbd>${key.trim()}</kbd>`).join("+"));
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
export function renderBlocks(markdown, context) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  const headings = [];
  let index = 0;
  const startsBlock = (line) => /^(#{1,3} |> ?|\s*[-*] |\s*\d+\. |```|---+$|\|)/.test(line) || /^!\[[^\]]*\]\(shot:/.test(line);

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) { index += 1; continue; }

    const heading = /^(#{1,3}) (.+)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const id = slugify(heading[2]);
      if (level === 2) headings.push({ id, text: renderInline(heading[2], { ...context, references: undefined }).replace(/<[^>]+>/g, "") });
      html.push(`<h${level} id="${id}">${renderInline(heading[2], context)}</h${level}>`);
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
      const dir = GUIDE_LANGUAGES[context.language].dir;
      html.push(`<figure><img src="/${dir}/img/${name}.webp" alt="${escapeHtml(alt)}"${dimensions} loading="lazy"><figcaption>${renderInline(alt, context)}</figcaption></figure>`);
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

const KEY_NAMES = {
  de: { Ctrl: "Strg", Shift: "Umschalt", Delete: "Entf", Backspace: "Rücktaste", Home: "Pos1", Click: "Klick", RightClick: "Rechtsklick", Drag: "Ziehen" },
  en: { RightClick: "Right click" },
};

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
  const names = KEY_NAMES[language] ?? {};
  const key = (name) => `<kbd>${escapeHtml(names[name] ?? name)}</kbd>`;
  const combo = (text) => (text === "+" || text === "−" ? key(text) : text.split("+").map((part) => key(part.trim())).join("+"));
  const or = messages["shortcuts.or"] ?? "or";
  return groups
    .map((group) => {
      const rows = group.entries
        .map((entry) => `<tr><td>${entry.combos.map(combo).join(` ${escapeHtml(or)} `)}</td><td>${escapeHtml(messages[entry.label] ?? entry.label)}</td></tr>`)
        .join("");
      const title = messages[group.title] ?? group.title;
      return `<h2 id="${slugify(title)}">${escapeHtml(title)}</h2>\n<div class="table-scroll"><table class="keys"><tbody>${rows}</tbody></table></div>`;
    })
    .join("\n");
}

const STYLE = `
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
.editor-elsewhere { max-width: 1100px; margin: 0 auto; padding: 0 16px 10px; color: var(--muted); font-size: 14px; text-align: right; }
.editor-elsewhere[hidden] { display: none; }
.bar a.button { padding: 7px 14px; border-radius: 8px; background: var(--accent); color: var(--accent-ink); font-weight: 700; font-size: 14px; text-decoration: none; }
.bar a.lang { color: var(--muted); font-size: 14px; font-weight: 600; text-decoration: none; }
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
pre { overflow-x: auto; padding: 14px 16px; border-radius: 8px; background: var(--code); }
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
th, td { padding: 7px 12px; border-bottom: 1px solid var(--edge); text-align: left; vertical-align: top; }
th { color: var(--muted); font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; }
.toc { margin: 0 0 24px; padding: 12px 16px; border: 1px solid var(--edge); border-radius: 8px; background: var(--card); font-size: 14.5px; }
.toc b { display: block; margin-bottom: 4px; color: var(--muted); font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; }
.toc ul { margin: 0; padding-left: 18px; }
.pager { display: flex; justify-content: space-between; gap: 12px; margin-top: 44px; padding-top: 18px; border-top: 1px solid var(--edge); }
.pager a { display: block; max-width: 48%; padding: 10px 14px; border: 1px solid var(--edge); border-radius: 8px; background: var(--card); text-decoration: none; color: var(--ink); }
.pager a small { display: block; color: var(--muted); font-size: 12px; }
.pager a.next { margin-left: auto; text-align: right; }
.cards { list-style: none; margin: 24px 0 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
.cards a { display: block; height: 100%; padding: 14px 16px; border: 1px solid var(--edge); border-radius: 8px; background: var(--card); text-decoration: none; color: var(--ink); }
.cards a:hover { border-color: var(--accent); }
.cards b { display: block; margin-bottom: 2px; }
.cards span { color: var(--muted); font-size: 14px; line-height: 1.45; display: block; }
footer.note { max-width: 1100px; margin: 0 auto; padding: 0 16px 12px; color: var(--muted); font-size: 14px; }
.site-footer { max-width: 1100px; margin: 0 auto; padding: 14px 16px 40px; border-top: 1px solid var(--edge); display: flex; flex-wrap: wrap; justify-content: space-between; gap: 6px 24px; color: var(--muted); font-size: 13px; }
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
@media print { .bar, nav.chapters, .pager { display: none; } .shell { display: block; } }
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

const THEME_SCRIPT = `try{var t=localStorage.getItem("layerling.theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t;else if(t==="graphite")document.documentElement.dataset.theme="dark"}catch(e){}`;

function pageShell({ language, title, description, path, alternates, chapters, current, body, switchHref, switchLanguage, footer }) {
  const strings = GUIDE_LANGUAGES[language];
  const nav = chapters
    .map((chapter) => `<li><a href="/${strings.dir}/${chapter.slug}.html"${chapter.slug === current ? ' aria-current="page"' : ""}>${escapeHtml(chapter.title)}</a></li>`)
    .join("");
  const alternateLinks = Object.entries(alternates)
    .map(([code, href]) => `<link rel="alternate" hreflang="${code}" href="${SITE}${href}">`)
    .join("\n    ");
  return `<!doctype html>
<html lang="${strings.htmlLang}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <link rel="canonical" href="${SITE}${path}">
    ${alternateLinks}
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:image" content="${SITE}/assets/layerling/layerling-social.png">
    <link rel="icon" href="/assets/layerling/layerling-logo.svg">
    <script>${THEME_SCRIPT}</script>
    <style>${STYLE}</style>
  </head>
  <body>
    <header class="bar"><div class="bar-inner">
      <a class="brand" href="/${strings.dir}/index.html"><img src="/assets/layerling/layerling-logo.svg" alt=""><span class="brand-text"><b>layerling</b><span class="brand-note">${escapeHtml(strings.home)}</span></span></a>
      <a class="lang" href="${switchHref}" hreflang="${switchLanguage}" title="${escapeHtml(strings.switchTitle)}">${strings.switchLanguage}</a>
      <a class="button" id="open-editor" href="/">${escapeHtml(strings.openEditor)}</a>
    </div><p class="editor-elsewhere" id="editor-elsewhere" role="status" hidden>${escapeHtml(strings.editorElsewhere)}</p></header>
    <div class="shell">
      <nav class="chapters" aria-label="${escapeHtml(strings.chapters)}"><h2>${escapeHtml(strings.chapters)}</h2><ol>${nav}</ol></nav>
      <main>
${body}
      </main>
    </div>
    <footer class="note">${escapeHtml(strings.sourceNote)} <a href="${strings.forumUrl}" rel="noopener">${escapeHtml(strings.forum)}</a>.</footer>
    ${footer}
    <script>${editorButtonScript(strings)}</script>
  </body>
</html>
`;
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

/**
 * The chapters of one language with English standing in for what it has not
 * translated yet: the English chapters in their order, each replaced by the
 * language's own file of the same number where there is one. A language is an
 * addition its maintainer keeps up, so a chapter that is still English must not
 * stop anybody else from adding one.
 */
export async function chaptersFor(language) {
  const english = await readChapters("en");
  if (language === "en") return english;
  const own = new Map((await readChapters(language)).map((chapter) => [chapter.number, chapter]));
  return english.map((chapter) => own.get(chapter.number) ?? chapter);
}

/** The numbers a chapter may quote with {{value:NAME}}: every numeric export of roundness.ts. */
export async function loadValues() {
  const module = await import(pathToFileURL(join(root, "apps", "web", "src", "lib", "roundness.ts")).href);
  return Object.fromEntries(Object.entries(module).filter(([, value]) => typeof value === "number"));
}

export async function loadMessages(language) {
  const module = await import(pathToFileURL(join(root, "apps", "web", "src", "lib", `messages.${language}.ts`)).href);
  return module[`MESSAGES_${language.toUpperCase()}`];
}

/**
 * The wording of one language with English filling the gaps - the same rule the
 * interface itself follows (messageText in apps/web/src/lib/i18n.ts). The guide
 * quotes the interface's own button names, so it has to read the same texts.
 */
export async function messagesFor(language) {
  const english = await loadMessages("en");
  if (language === "en") return english;
  return { ...english, ...(await loadMessages(language)) };
}

/**
 * Where the pictures of one language may come from: its own folder first,
 * English second. A language without pictures of its own then needs no second
 * copy of every screenshot in the repository - it keeps its own as they arrive.
 */
export function imageDirectories(language) {
  return [join(guideSource, "images", language), join(guideSource, "images", "en")];
}

export async function buildGuide({ log = console.log } = {}) {
  const result = { pages: [], warnings: [] };
  const shortcutGroups = await readShortcutGroups();
  const environment = await readEnvironment();
  const version = JSON.parse(await readFile(join(root, "package.json"), "utf8")).version;
  const chaptersByLanguage = {};
  for (const language of Object.keys(GUIDE_LANGUAGES)) chaptersByLanguage[language] = await chaptersFor(language);

  for (const [language, strings] of Object.entries(GUIDE_LANGUAGES)) {
    const chapters = chaptersByLanguage[language];
    // Every chapter exists in English, so Russian points there; German and English
    // are each other's other language.
    const otherLanguage = language === "en" ? "de" : "en";
    const otherStrings = GUIDE_LANGUAGES[otherLanguage];
    const messages = await messagesFor(language);
    const values = await loadValues();
    const shortcutsHtml = renderShortcuts(shortcutGroups, messages, language);
    const footer = renderFooter({ language, messages, environment, version });
    const outputRoot = join(publicDirectory, strings.dir);
    await rm(outputRoot, { recursive: true, force: true });
    await mkdir(join(outputRoot, "img"), { recursive: true });

    const imageSizes = new Map();
    for (const directory of imageDirectories(language)) {
      if (!existsSync(directory)) continue;
      for (const file of await readdir(directory)) {
        if (!file.endsWith(".webp")) continue;
        const name = file.slice(0, -5);
        if (imageSizes.has(name)) continue;
        await copyFile(join(directory, file), join(outputRoot, "img", file));
        imageSizes.set(name, webpSize(await readFile(join(directory, file))));
      }
    }

    const counterpart = (number) => chaptersByLanguage[otherLanguage].find((chapter) => chapter.number === number);
    for (const [position, chapter] of chapters.entries()) {
      const context = {
        language,
        messages,
        values,
        shortcutsHtml,
        imageSize: (name) => imageSizes.get(name) ?? null,
        references: { uiKeys: new Set(), shots: new Set(), chapters: new Set() },
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
      const other = counterpart(chapter.number);
      const path = `/${strings.dir}/${chapter.slug}.html`;
      const alternates = { [language]: path };
      if (other) alternates[otherLanguage] = `/${otherStrings.dir}/${other.slug}.html`;
      const previous = chapters[position - 1];
      const next = chapters[position + 1];
      const toc = rendered.headings.length > 2
        ? `<div class="toc"><b>${escapeHtml(strings.onThisPage)}</b><ul>${rendered.headings.map((heading) => `<li><a href="#${heading.id}">${heading.text}</a></li>`).join("")}</ul></div>`
        : "";
      const pager = `<div class="pager">${previous ? `<a href="/${strings.dir}/${previous.slug}.html"><small>${escapeHtml(strings.previous)}</small>${escapeHtml(previous.title)}</a>` : ""}${next ? `<a class="next" href="/${strings.dir}/${next.slug}.html"><small>${escapeHtml(strings.next)}</small>${escapeHtml(next.title)}</a>` : ""}</div>`;
      const body = `<h1>${escapeHtml(chapter.title)}</h1>\n<p class="lead">${escapeHtml(chapter.summary)}</p>\n${toc}\n${rendered.html}\n${pager}`;
      const page = pageShell({
        language, title: `${chapter.title} - ${strings.site}`, description: chapter.summary, path, alternates, chapters,
        current: chapter.slug, body, footer, switchLanguage: otherLanguage,
        switchHref: other ? `/${otherStrings.dir}/${other.slug}.html` : `/${otherStrings.dir}/index.html`,
      });
      await writeFile(join(outputRoot, `${chapter.slug}.html`), page);
      result.pages.push({ path, alternates });
    }

    const cards = chapters
      .map((chapter) => `<li><a href="/${strings.dir}/${chapter.slug}.html"><b>${escapeHtml(chapter.title)}</b><span>${escapeHtml(chapter.summary)}</span></a></li>`)
      .join("");
    const indexPath = `/${strings.dir}/index.html`;
    const indexPage = pageShell({
      language, title: strings.site, description: strings.overviewLead, path: indexPath,
      alternates: { [language]: indexPath, [otherLanguage]: `/${otherStrings.dir}/index.html` }, chapters, current: "", footer,
      body: `<h1>${escapeHtml(strings.site)}</h1>\n<p class="lead">${escapeHtml(strings.overviewLead)}</p>\n<ul class="cards">${cards}</ul>`,
      switchHref: `/${otherStrings.dir}/index.html`,
      switchLanguage: otherLanguage,
    });
    await writeFile(join(outputRoot, "index.html"), indexPage);
    result.pages.unshift({ path: indexPath, alternates: { [language]: indexPath, [otherLanguage]: `/${otherStrings.dir}/index.html` } });
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
