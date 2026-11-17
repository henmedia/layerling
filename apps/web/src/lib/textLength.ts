/**
 * How many characters a text holds: the text shape, a name tag, a line of a text block and the default for new texts.
 * It was 24 from the first version on, when a text could only be one line; asked to lift it in the Layerling User
 * Group on Facebook (07.11.2026). The letters keep their size, and the text gets as long as it needs to be.
 * A Gridfinity label shelf keeps its own 24 (MAX_GRIDFINITY_LABEL_TEXT_LENGTH): the shelf has a fixed width.
 */
export const MAX_TEXT_LENGTH = 250;

/** A typed text cut to MAX_TEXT_LENGTH; an empty one becomes a space, as a text always has letters to build. */
export function limitedText(text: string) {
  return text.slice(0, MAX_TEXT_LENGTH) || " ";
}
