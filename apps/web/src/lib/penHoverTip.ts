/**
 * Where the small text for a hovered control goes (the Apple Pencil can hover over an iPad, but a
 * browser shows no title text for it). The centre sits under the control, kept far enough from the
 * sides that the text stays on the screen; near the bottom it goes above the control instead.
 */
export const PEN_TIP_HALF_WIDTH = 130;
const PEN_TIP_GAP = 8;
const PEN_TIP_HEIGHT = 44;

export type PenTipRect = { left: number; right: number; top: number; bottom: number };

export function penTipPosition(rect: PenTipRect, viewport: { width: number; height: number }) {
  const centre = (rect.left + rect.right) / 2;
  const left = Math.min(Math.max(centre, PEN_TIP_HALF_WIDTH + 8), Math.max(viewport.width - PEN_TIP_HALF_WIDTH - 8, PEN_TIP_HALF_WIDTH + 8));
  const below = rect.bottom + PEN_TIP_GAP;
  const fitsBelow = below + PEN_TIP_HEIGHT <= viewport.height;
  return { left, top: fitsBelow ? below : Math.max(rect.top - PEN_TIP_GAP - PEN_TIP_HEIGHT, 8), above: !fitsBelow };
}

/**
 * Which pointers get the bubble. The Apple Pencil on an iPad or iPhone, which shows no title text at all
 * (#495); and the mouse in layerling installed as an app, where the browser's own tooltip comes late or
 * not at all (#1013). In a browser tab a mouse keeps the browser's tooltip.
 */
export function hoverTipFor(pointerType: string, place: { appleTouch: boolean; installedApp: boolean }) {
  if (pointerType === "pen") return place.appleTouch;
  if (pointerType === "mouse") return place.installedApp;
  return false;
}

const HELD_TITLE = "data-hover-title";

/** The title of a control, also while the bubble holds it back. */
export function hoverTitleOf(element: Element) {
  return (element.getAttribute("title") ?? element.getAttribute(HELD_TITLE))?.trim() || "";
}

/** The nearest control with a title, also one whose title the bubble holds back. */
export function hoverTitled(target: EventTarget | null) {
  if (!(target instanceof Element)) return null;
  const element = target.closest<HTMLElement>(`[title], [${HELD_TITLE}]`);
  const text = element ? hoverTitleOf(element) : "";
  return element && text ? { element, text } : null;
}

/**
 * Takes the title off a control while the pointer rests on it, so the browser shows no tooltip of its own
 * next to the bubble; a title set again meanwhile is taken off as well. The editor names every button
 * without a title after its label, which would lose the keys in "Redo (Ctrl+Y)": that name is not kept,
 * a new title from React is. The returned function puts the title back.
 */
export function holdTitle(element: HTMLElement) {
  const take = () => {
    const title = element.getAttribute("title");
    if (title === null) return;
    const held = element.getAttribute(HELD_TITLE);
    const label = (element.getAttribute("aria-label") ?? element.textContent?.trim())?.replace(/\s+/g, " ");
    if (held === null || title !== label) element.setAttribute(HELD_TITLE, title);
    element.removeAttribute("title");
  };
  take();
  const observer = new MutationObserver(take);
  observer.observe(element, { attributes: true, attributeFilter: ["title"] });
  return () => {
    observer.disconnect();
    const held = element.getAttribute(HELD_TITLE);
    element.removeAttribute(HELD_TITLE);
    if (held !== null && element.getAttribute("title") === null) element.setAttribute("title", held);
  };
}
