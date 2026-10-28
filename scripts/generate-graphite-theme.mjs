#!/usr/bin/env node
/*
 * Builds apps/web/public/assets/theme/graphite-theme.css from globals.css and
 * the style sheets split off from it (GRAPHITE_SOURCES, in the order
 * layout.tsx loads them).
 * The app links it only while Graphite is selected (see appTheme.ts), so
 * nobody else downloads it.
 *
 * Graphite is the dark theme with neutral grey surfaces and text instead of
 * the warm brown and beige ones; the orange accents stay. Rather than a second
 * hand-kept copy of the dark theme, every colour declaration of globals.css is
 * repeated once, in the same order, under a selector that only matches in
 * Graphite and has exactly the specificity of the original (the extra
 * condition sits inside :where()). Because the copy is linked after
 * globals.css, each repeated declaration wins over its original and over
 * nothing else, so the cascade in Graphite is the cascade of the dark theme,
 * only with the warm neutrals turned grey. That also covers light-theme
 * colours the dark theme never overrides.
 *
 * Run after changing colours in any of them:  npm run theme:graphite
 * A unit test fails while the generated file is out of date.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const GRAPHITE = '[data-theme="dark"][data-palette="graphite"]';
const DARK_PREFIX = 'html[data-theme="dark"]';
const LIGHT_PREFIX = 'html[data-theme="light"]';
const COLOR_PATTERN = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b|rgba?\([^)]*\)/g;
const COLOR_PROPERTY = /^(?:--.+|color|background(?:-color|-image)?|border(?:-(?:top|right|bottom|left|block|inline)(?:-(?:start|end))?)?(?:-color)?|outline(?:-color)?|fill|stroke|box-shadow|text-shadow|filter|caret-color|accent-color|text-decoration(?:-color)?|column-rule(?:-color)?|stop-color|flood-color|lighting-color)$/;

/** HSL of an sRGB colour, h in degrees, s and l in 0..1. */
function toHsl(r, g, b) {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return { h: h * 60, s, l };
}

/**
 * A warm neutral (brown, beige, cream, khaki) becomes a grey; anything else is
 * returned unchanged as null. Strong mid-light oranges and yellows are accents
 * and stay. Mid greys come out a little darker, so inactive text sits further
 * back than on the brown ground.
 */
export function graphiteGrey(r, g, b) {
  const { h, s, l } = toHsl(r, g, b);
  if (s < 0.02 || h < 10 || h > 60) return null;
  const paleBeige = l >= 0.74 && s < 0.75;
  const accent = s >= 0.5 && l >= 0.22 && l <= 0.85 && !paleBeige;
  if (accent) return null;
  let grey = l;
  if (grey < 0.35) grey += 0.035 * (1 - grey / 0.35);
  else if (grey <= 0.65) grey *= 0.88;
  const value = Math.round(grey * 255);
  return [value, value, value];
}

function hex(value) {
  return value.toString(16).padStart(2, "0");
}

export function graphiteColors(value) {
  return value.replace(COLOR_PATTERN, (match) => {
    if (match.startsWith("#")) {
      let digits = match.slice(1);
      if (digits.length <= 4) digits = [...digits].map((digit) => digit + digit).join("");
      const [r, g, b] = [0, 2, 4].map((index) => parseInt(digits.slice(index, index + 2), 16));
      const grey = graphiteGrey(r, g, b);
      return grey ? `#${grey.map(hex).join("")}${digits.slice(6, 8)}` : match;
    }
    const parts = match.slice(match.indexOf("(") + 1, -1).split(",").map((part) => part.trim());
    if (parts.length < 3 || parts.slice(0, 3).some((part) => !/^[0-9.]+$/.test(part))) return match;
    const grey = graphiteGrey(Number(parts[0]), Number(parts[1]), Number(parts[2]));
    if (!grey) return match;
    return parts.length === 4 ? `rgba(${grey.join(", ")}, ${parts[3]})` : `rgb(${grey.join(", ")})`;
  });
}

/** The same selector, matching only in Graphite, with unchanged specificity. */
export function graphiteSelector(selector) {
  if (selector.startsWith(DARK_PREFIX)) {
    return `${DARK_PREFIX}:where([data-palette="graphite"])${selector.slice(DARK_PREFIX.length)}`;
  }
  const root = /^(:root|html)(?=$|[\s.#[:>+~])/.exec(selector);
  if (root) return `${root[1]}:where(${GRAPHITE})${selector.slice(root[1].length)}`;
  return `:where(html${GRAPHITE}) ${selector}`;
}

function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, "");
}

/** Top-level blocks of a stylesheet: [prelude, body] pairs. */
function blocks(css) {
  const result = [];
  let index = 0;
  while (index < css.length) {
    const open = css.indexOf("{", index);
    if (open < 0) break;
    const prelude = stripComments(css.slice(index, open)).trim();
    let depth = 1;
    let cursor = open + 1;
    while (depth > 0 && cursor < css.length) {
      if (css.startsWith("/*", cursor)) {
        cursor = css.indexOf("*/", cursor) + 2;
        continue;
      }
      if (css[cursor] === "{") depth += 1;
      else if (css[cursor] === "}") depth -= 1;
      cursor += 1;
    }
    result.push([prelude, css.slice(open + 1, cursor - 1)]);
    index = cursor;
  }
  return result;
}

function splitSelectors(prelude) {
  const selectors = [];
  let depth = 0;
  let current = "";
  for (const character of prelude) {
    if (character === "(" || character === "[") depth += 1;
    if (character === ")" || character === "]") depth -= 1;
    if (character === "," && depth === 0) {
      selectors.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }
  if (current.trim()) selectors.push(current.trim());
  return selectors;
}

function declarations(body) {
  const result = [];
  let depth = 0;
  let current = "";
  for (const character of stripComments(body)) {
    if (character === "(") depth += 1;
    if (character === ")") depth -= 1;
    if (character === ";" && depth === 0) {
      result.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }
  if (current.trim()) result.push(current.trim());
  return result
    .filter((declaration) => declaration.includes(":"))
    .map((declaration) => {
      const colon = declaration.indexOf(":");
      return [declaration.slice(0, colon).trim(), declaration.slice(colon + 1).trim()];
    });
}

function transform(css, indent = "") {
  const out = [];
  for (const [prelude, body] of blocks(css)) {
    if (prelude.startsWith("@media") || prelude.startsWith("@supports")) {
      const inner = transform(body, `${indent}  `);
      if (inner.length) out.push(`${indent}${prelude} {\n${inner.join("\n\n")}\n${indent}}`);
      continue;
    }
    if (prelude.startsWith("@")) continue;
    const selectors = splitSelectors(prelude).filter((selector) => !selector.startsWith(LIGHT_PREFIX));
    if (!selectors.length) continue;
    const kept = declarations(body).filter(([property, value]) => {
      COLOR_PATTERN.lastIndex = 0;
      return COLOR_PROPERTY.test(property) || COLOR_PATTERN.test(value);
    });
    if (!kept.length) continue;
    out.push(
      `${indent}${selectors.map(graphiteSelector).join(`,\n${indent}`)} {\n`
      + kept.map(([property, value]) => `${indent}  ${property}: ${graphiteColors(value)};`).join("\n")
      + `\n${indent}}`,
    );
  }
  return out;
}

/*
 * Deliberate differences from the dark theme, after the repeated rules: the
 * tool group tiles lose their faint group tint (on grey it read as brown under
 * the orange groups); the coloured group borders stay.
 */
const EXTRAS = `:where(html${GRAPHITE}) .toolbar-section-tools,
:where(html${GRAPHITE}) .toolbar-section .action-buttons {
  background: var(--toolbar-tile);
}`;

export function graphiteThemeCss(sourceCss) {
  return [
    "/*",
    " * Generated by scripts/generate-graphite-theme.mjs from globals.css and the",
    " * sheets split off from it - do not",
    " * edit by hand; run `npm run theme:graphite` after changing colours there.",
    " */",
    "",
    transform(sourceCss).join("\n\n"),
    "",
    EXTRAS,
    "",
  ].join("\n");
}

/** The style sheets the app loads, in the order layout.tsx imports them. */
export const GRAPHITE_SOURCES = ["apps/web/src/app/globals.css", "apps/web/src/app/dashboard.css", "apps/web/src/app/historyView.css", "apps/web/src/app/notes.css", "apps/web/src/app/tape.css", "apps/web/src/app/myShapes.css", "apps/web/src/app/attachments.css", "apps/web/src/app/viewCube.css", "apps/web/src/app/shortcuts.css", "apps/web/src/app/sketchImage.css", "apps/web/src/app/sketchLock.css", "apps/web/src/app/dashboardSelect.css"];
export const GRAPHITE_TARGET = "apps/web/public/assets/theme/graphite-theme.css";

/** The app's style sheets as one text, in the order they apply. */
export function readGraphiteSources(root) {
  return GRAPHITE_SOURCES.map((source) => readFileSync(path.join(root, source), "utf8")).join("\n");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const css = graphiteThemeCss(readGraphiteSources(root));
  writeFileSync(path.join(root, GRAPHITE_TARGET), css);
  console.log(`Wrote ${GRAPHITE_TARGET}`);
}
