# The user guide

The guide at [layerling.com/guide](https://layerling.com/guide/index.html) (English),
[layerling.com/anleitung](https://layerling.com/anleitung/index.html) (German) and
[layerling.com/ru](https://layerling.com/ru/index.html) (Russian) is written here and built into plain
static pages. It ships with the program: `npm run export` and `npm run dev` build it, nothing else to deploy.

```
docs/guide/
  de/01-erste-schritte.md     one file per chapter, the number is the order and pairs the languages
  en/01-getting-started.md
  ru/01-getting-started.md    may stay behind: a chapter English has and this language has not is shown in English
  images/de/*.webp            the pictures, taken from the running program
  images/en/*.webp            a language without pictures of its own is shown the English ones
```

## Another language

English is the reference: every key of the interface and every chapter of the guide exists there. Another language
may trail behind without stopping anybody else. A message key it has not translated shows the English text
(`messageText` in `apps/web/src/lib/i18n.ts`), a chapter it has not written is built from the English file, and the
pictures of that chapter come from `images/en`. A new text therefore never waits for a second translation, and a
language is an addition its maintainer keeps up. Russian is the example: it has no folder of pictures of its own.

## Writing a chapter

A chapter starts with `title:` and `summary:` between `---` lines, followed by Markdown: headings (`##`, `###`),
paragraphs, lists, tables, `> **Tip:**` boxes, code. Beyond that:

| Write | Result |
| --- | --- |
| `{{ui:editor.tool.group}}` | the button's name, **read from the interface's own texts** (`messages.<language>.ts`, English filling a gap), so a renamed button is renamed here, and a key that no longer exists stops the build |
| `[[Ctrl]]+[[Z]]` | keys |
| `[text](chapter:solids-and-holes)` | a link to another chapter of the same language, by its file name without the number |
| `![Caption](shot:hole-after)` | a picture from `images/<language>/hole-after.webp`, or from `images/en` when that language has none, with the caption below |
| `{{shortcuts}}` | the table of keyboard shortcuts, read from `ShortcutsModal.tsx` |

**Never type a button's name by hand.** Use `{{ui:...}}`. Explain in your own words, name in the program's words.

**A new feature gets its lines in the guide** - together with the welcome text (`welcome.*`) and its MCP action. The
test `tests/unit/guide.test.ts` checks that every language offers the chapters and pictures English has, that every
interface name, chapter link and picture exists, and that every MCP tool is named in the AI chapter.

## The pictures

The pictures are taken by `scripts/guide-screenshots.mjs`, scene by scene (`scripts/guide-scenes.mjs`), once per
language. A scene builds its situation through the MCP bridge and the real buttons, so it needs the development server:

```
npm run dev -- -p 3010
npm run guide:images                                  # every language
node scripts/guide-screenshots.mjs --only fillet-tool --lang de
```

Do not edit source files while the run is going; the editor reloads and the scene times out. Take the pictures anew
before each release so the guide shows the current interface.

A new picture needs a scene in `guide-scenes.mjs` that calls `ctx.shot("<name>")`. Scenes find buttons through
`ctx.t("<message key>")`, so they work in every language.
