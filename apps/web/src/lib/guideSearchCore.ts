/**
 * The matching of the guide search, written once. The guide pages run it in the browser (the
 * build embeds the source of these functions into every page, see GUIDE_SEARCH_CORE in
 * scripts/build-guide.mjs), and the editor's Interactive Help runs the very same functions on the
 * same index (lib/guideHelp.ts).
 *
 * Because the build copies the text of these functions into a page, they stay plain ES5: `var`,
 * no arrow functions, no template strings, no imports, nothing from outside the function bodies
 * but the other functions of this file, and no backslash anywhere (the page text is a template
 * string). Types are fine, they are stripped. Like languages.ts this file is read by Node as it
 * stands, so it holds nothing but these functions.
 *
 * They fold case and accents one letter for one letter (so a position in the folded text is a
 * position in the real one), want every word of the query somewhere in a section, and rank a word
 * in the heading above one in the chapter's title above one in the text. "ss" and the sharp s are
 * the same to them, whichever one is typed and whichever one the text has; where people write "ae",
 * "oe" and "ue" for the umlauts, those find them too.
 */

/** One section of the guide as the search index holds it: chapter, heading, address and plain text. */
export type GuideSearchEntry = { c: string; h: string; u: string; t: string };
export type GuidePrepared = { e: GuideSearchEntry; c: string; h: string; t: string };
export type GuideFound = { at: number; len: number };
export type GuideHit = { entry: GuideSearchEntry; score: number; folded: string; forms: string[][] };

export function guideFold(text: string): string {
  var out = "";
  for (var i = 0; i < text.length; i++) {
    var letter = text.charAt(i).toLowerCase().normalize("NFD").charAt(0);
    // "ł" has no decomposition, so it is mapped by hand (Polish): one letter in, one letter out.
    out += letter === "ł" ? "l" : letter;
  }
  return out;
}

export function guideForms(word: string, umlauts: boolean): string[] {
  var forms = [word];
  if (umlauts) { var plain = word.split("ae").join("a").split("oe").join("o").split("ue").join("u"); if (plain !== word) forms.push(plain); }
  if (word.indexOf("ss") >= 0) forms.push(word.split("ss").join(String.fromCharCode(223)));
  if (word.indexOf(String.fromCharCode(223)) >= 0) forms.push(word.split(String.fromCharCode(223)).join("ss"));
  return forms;
}

export function guideFind(text: string, forms: string[], from: number): GuideFound | null {
  var best: GuideFound | null = null;
  for (var i = 0; i < forms.length; i++) { var k = text.indexOf(forms[i], from); if (k >= 0 && (!best || k < best.at)) best = { at: k, len: forms[i].length }; }
  return best;
}

export function guidePrepare(entries: GuideSearchEntry[]): GuidePrepared[] {
  return entries.map(function (e) { return { e: e, c: guideFold(e.c), h: guideFold(e.h), t: guideFold(e.t) }; });
}

export function guideTokens(query: string): string[] {
  return guideFold(query).split(" ").filter(function (w) { return w.length > 0; });
}

export function guideSearch(prepared: GuidePrepared[], query: string, limit?: number, umlauts?: boolean): GuideHit[] {
  var tokens = guideTokens(query); if (!tokens.length) return [];
  var forms = tokens.map(function (w) { return guideForms(w, !!umlauts); }), phrase = guideForms(tokens.join(" "), !!umlauts), found: GuideHit[] = [];
  prepared.forEach(function (p) {
    var score = 0;
    for (var i = 0; i < tokens.length; i++) {
      var inH = guideFind(p.h, forms[i], 0), inC = guideFind(p.c, forms[i], 0), at = guideFind(p.t, forms[i], 0);
      if (!inH && !inC && !at) return;
      if (inH) score += 10;
      if (inC) score += 3;
      if (at) { score += 1; var n = 0, k: GuideFound | null = at; while (k && n < 5) { n++; k = guideFind(p.t, forms[i], k.at + k.len); } score += n * 0.3; }
    }
    if (tokens.length > 1 && (guideFind(p.h, phrase, 0) || guideFind(p.t, phrase, 0))) score += 6;
    found.push({ entry: p.e, score: score, folded: p.t, forms: forms });
  });
  found.sort(function (a, b) { return b.score - a.score; });
  return found.slice(0, limit || 8);
}

/**
 * Every place in a folded text where one of the query's words stands, in order and with places that
 * touch or overlap joined into one, for the page a result leads to to mark them all (#1059). Words of
 * a single letter are left out when the query has longer ones: they would light up half the page.
 */
export function guideRanges(text: string, query: string, umlauts?: boolean): GuideFound[] {
  var tokens = guideTokens(query), longer = tokens.filter(function (w) { return w.length > 1; });
  if (longer.length) tokens = longer;
  var all: GuideFound[] = [];
  tokens.forEach(function (w) {
    var forms = guideForms(w, !!umlauts), f = guideFind(text, forms, 0);
    while (f) { all.push(f); f = guideFind(text, forms, f.at + f.len); }
  });
  all.sort(function (a, b) { return a.at - b.at; });
  var joined: GuideFound[] = [];
  all.forEach(function (f) {
    var last = joined[joined.length - 1];
    if (last && f.at <= last.at + last.len) last.len = Math.max(last.len, f.at + f.len - last.at);
    else joined.push({ at: f.at, len: f.len });
  });
  return joined;
}

/** The functions in the order a page needs them, for the build to copy. */
export const GUIDE_SEARCH_CORE_FUNCTIONS = [guideFold, guideForms, guideFind, guidePrepare, guideTokens, guideSearch, guideRanges];
