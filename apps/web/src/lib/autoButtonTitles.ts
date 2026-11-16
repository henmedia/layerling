import { HELD_TITLE } from "@/lib/penHoverTip";

/**
 * The editor names every button without a title of its own after its label, so the mouse shows what it does. Such a
 * title is marked with this attribute, so it can follow the label: the Export button kept "Export STL" from opening
 * after LYL was picked and it read "Save layerling design" (Discussion #1449). A title from React is left alone.
 */
export const AUTO_TITLE = "data-auto-title";

/** The text a reader sees in `node`: parts marked hidden, such as a label kept for another format, do not count. */
function visibleText(node: Node): string {
  let text = "";
  node.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) text += child.nodeValue ?? "";
    else if (child.nodeType === Node.ELEMENT_NODE && !(child as Element).hasAttribute("hidden")) text += visibleText(child);
  });
  return text;
}

/** A button's label: its aria-label, or else the text it shows, on one line. */
export function buttonLabel(button: Element) {
  return (button.getAttribute("aria-label") ?? visibleText(button)).replace(/\s+/g, " ").trim();
}

/**
 * Names the buttons under `root` that have no title of their own after their label, and brings a name given so up to
 * date with the label. A button the hover bubble holds (penHoverTip.ts) waits until the pointer leaves it. An item of
 * a menu (role="menuitem") gets no name: it shows its label in full.
 */
export function applyAutoTitles(root: ParentNode) {
  root.querySelectorAll<HTMLButtonElement>("button").forEach((button) => {
    if (button.hasAttribute(HELD_TITLE)) return;
    const auto = button.getAttribute(AUTO_TITLE);
    const title = button.getAttribute("title");
    if (title && title !== auto) return;
    // A menu's item shows its whole label already; a title only repeated it in a bubble above (Discussion #1745).
    const label = button.getAttribute("role") === "menuitem" ? "" : buttonLabel(button);
    if (!label) {
      if (auto === null) return;
      if (title === auto) button.removeAttribute("title");
      button.removeAttribute(AUTO_TITLE);
      return;
    }
    if (title !== label) button.setAttribute("title", label);
    if (auto !== label) button.setAttribute(AUTO_TITLE, label);
  });
}

/**
 * Keeps the buttons of `doc` named while the editor runs: once at the start, then once a frame after anything changed
 * - a button added, a label's text, a part shown or hidden, a title put back by the hover bubble. Returns the stop.
 */
export function watchAutoTitles(doc: Document) {
  let frame = 0;
  const run = () => {
    frame = 0;
    applyAutoTitles(doc);
  };
  run();
  const observer = new MutationObserver(() => {
    if (!frame) frame = requestAnimationFrame(run);
  });
  observer.observe(doc.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["aria-label", "hidden", "title"] });
  return () => {
    observer.disconnect();
    if (frame) cancelAnimationFrame(frame);
  };
}
