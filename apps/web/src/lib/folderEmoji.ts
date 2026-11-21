/**
 * A folder whose name starts with an emoji shows that emoji big on its tile,
 * in place of the folder icon, and the rest of the name below it
 * (Discussion #1932). The emoji is part of the name, so it goes wherever the
 * folder goes - the browser, a shared folder, a backup - with nothing extra to
 * store; renaming the folder is how it is set, changed or taken off.
 */

export type FolderNameParts = {
  /** The emoji at the start of the name, or null when the name starts otherwise. */
  emoji: string | null;
  /** The name as the tile shows it: without the emoji and the space after it. */
  label: string;
};

/**
 * An emoji in the sense meant here: one that is drawn as a picture by default
 * (🚀, 💡), one asked to be drawn as a picture (❤️, with U+FE0F), a flag or a
 * keycap (1️⃣). Characters that are emoji only in name and are drawn as text,
 * such as © or ™ or a plain digit, do not count, so "© 2026" stays a name.
 */
const PICTURE_EMOJI = /\p{Emoji_Presentation}|️|⃣|\p{Regional_Indicator}/u;

function firstGrapheme(text: string): string {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    for (const { segment } of segmenter.segment(text)) return segment;
    return "";
  }
  // Without Intl.Segmenter: one code point, which covers the plain emoji.
  return [...text][0] ?? "";
}

export function folderNameParts(name: string): FolderNameParts {
  const trimmed = name.trim();
  const first = firstGrapheme(trimmed);
  if (!first || !PICTURE_EMOJI.test(first)) return { emoji: null, label: name };
  const rest = trimmed.slice(first.length).trim();
  // A name that is nothing but the emoji keeps it as its label too, so the tile is never without a name.
  return { emoji: first, label: rest || trimmed };
}
