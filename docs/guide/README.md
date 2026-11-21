# The user guide

The guide at [layerling.com/guide](https://layerling.com/guide/index.html) (English),
[layerling.com/anleitung](https://layerling.com/anleitung/index.html) (German) and in sixteen more languages (Arabic,
Brazilian Portuguese, Czech, Danish, Dutch, French, Hungarian, Italian, Polish, Portuguese (Portugal), Russian, Simplified Chinese, Slovenian, Spanish, Swedish, Traditional Chinese) is written here and built into plain static pages;
the two interface languages without a guide of their own (Japanese, Turkish) show the English one. It ships with the program: `npm run export` and `npm run dev` build it, nothing else to deploy. The build
also writes a `search-index.json` per language (one entry per section of every chapter), which the search box in the
header of each page reads; nothing to maintain, a new chapter or heading is in it with the next build.

```
docs/guide/
  en/01-getting-started.md    one file per chapter, the number is the order and pairs the languages
  de/01-erste-schritte.md     a language may give its chapters names of its own (de, nl, sl do)
  fr/01-getting-started.md    ... or keep the English file names
  images/en/*.webp            the pictures, taken from the running program
  images/de/*.webp            a language with pictures of its own; the others show the English ones
```

A chapter a language has not translated is built from the English one, with a note at the top, so every language has
every chapter. See [../TRANSLATING.md](../TRANSLATING.md).

## Writing a chapter

A chapter starts with `title:` and `summary:` between `---` lines, followed by Markdown: headings (`##`, `###`),
paragraphs, lists, tables, `> **Tip:**` boxes, code. Beyond that:

| Write | Result |
| --- | --- |
| `{{ui:editor.tool.group}}` | the button's name, **read from the interface's own texts** (`messages.de.ts` / `messages.en.ts`), so a renamed button is renamed here, and a key that no longer exists stops the build |
| `[[Ctrl]]+[[Z]]` | keys |
| `[text](chapter:solids-and-holes)` | a link to another chapter of the same language, by its file name without the number |
| `![Caption](shot:hole-after)` | a picture from `images/<language>/hole-after.webp`, with the caption below |
| `![Caption](still:ai-quickstart-powershell)` | the same for a picture taken by hand, a window outside layerling for example; no scene takes it, so `guide:images` does not take it anew either |
| `{{shortcuts}}` | the table of keyboard shortcuts, read from `ShortcutsModal.tsx` - keep the word as it is in a translation, or the page shows the placeholder instead of the table |

**Never type a button's name by hand.** Use `{{ui:...}}`. Explain in your own words, name in the program's words.

**A new feature gets its lines in the guide** - together with the welcome text (`welcome.*`) and its MCP action. The
test `tests/unit/guide.test.ts` checks that the fully translated languages (de, en, nl, ru, cs) have the same chapters,
sections and pictures and that every interface name, chapter link and picture exists; `tests/unit/guideAllLanguages.test.ts`
checks every language folder for headings that render, `#` links that land, unknown `{{...}}` placeholders and every
MCP tool in the AI chapter.

## The pictures

The pictures are taken by `scripts/guide-screenshots.mjs`, scene by scene (`scripts/guide-scenes.mjs`), once per
language. A scene builds its situation through the MCP bridge and the real buttons, so it needs the development server:

```
npm run dev -- -p 3010
npm run guide:images                                  # everything, every language that has pictures of its own
node scripts/guide-screenshots.mjs --only fillet-tool --lang de
```

Do not edit source files while the run is going; the editor reloads and the scene times out. Take the pictures anew
before each release so the guide shows the current interface.

A new picture needs a scene in `guide-scenes.mjs` that calls `ctx.shot("<name>")`. Scenes find buttons through
`ctx.t("<message key>")`, so they work in both languages.
