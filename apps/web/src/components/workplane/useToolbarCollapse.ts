import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { groupsToCollapse } from "@/lib/toolbarCollapse";

/** How long the pointer rests on a folded group before it opens, and how long it may be away before it closes, in ms. */
const OPEN_DELAY = 120;
const CLOSE_DELAY = 300;

/** The px left free at the end of the bar, so a group does not touch the window's edge. */
const SLACK = 6;

/**
 * Folds the groups of the ribbon the window has no room for (see `groupsToCollapse`): a group with `data-collapse` gets
 * `data-collapsed`, shows one button under its name, and opens its tools beneath it while the pointer rests on it or after a
 * tap (`data-open`, "start" or "end" by the side of the window it opens towards). The attributes are set on the elements
 * themselves, not through React, so the bar is measured and folded in the same frame, before it is drawn.
 */
export function useToolbarCollapse(contentRef: RefObject<HTMLElement | null>, enabled: boolean) {
  const signatureRef = useRef("");
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  // After every render: fit again when anything that changes the widths changed - the window, the tools, the language.
  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const root = document.documentElement;
    const signature = [enabled, content.clientWidth, content.querySelectorAll("button").length, root.lang, root.dataset.toolbarSize ?? ""].join("|");
    if (signature === signatureRef.current) return;
    signatureRef.current = signature;
    fitToolbar(content, enabled);
  });

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    let width = content.clientWidth;
    const refit = () => {
      signatureRef.current = "";
      fitToolbar(content, enabledRef.current);
    };
    // Only a new width counts: folding changes the bar's height, and that must not start it over.
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => {
      if (content.clientWidth === width) return;
      width = content.clientWidth;
      refit();
    });
    observer?.observe(content);
    // The labels are measured in the font they are drawn in.
    void document.fonts?.ready.then(refit);

    const timers = new Map<HTMLElement, number>();
    const later = (section: HTMLElement, delay: number, action: () => void) => {
      window.clearTimeout(timers.get(section));
      timers.set(section, window.setTimeout(action, delay));
    };
    const folded = (target: EventTarget | null) => (target instanceof Element ? target.closest<HTMLElement>(".toolbar-section[data-collapsed]") : null);
    const closeAll = (except?: HTMLElement) => {
      content.querySelectorAll<HTMLElement>(".toolbar-section[data-open]").forEach((section) => {
        if (section !== except) close(section);
      });
    };
    const open = (section: HTMLElement) => {
      window.clearTimeout(timers.get(section));
      closeAll(section);
      if (section.hasAttribute("data-open")) return;
      section.setAttribute("data-open", "start");
      section.querySelector("[data-collapse-trigger]")?.setAttribute("aria-expanded", "true");
      // Near the right edge the tools open towards the left, so none of them lies outside the window.
      const tools = section.querySelector<HTMLElement>(":scope > .toolbar-section-tools:not(.toolbar-collapse-box), :scope > .action-buttons");
      if (tools && tools.getBoundingClientRect().right > window.innerWidth - 8) section.setAttribute("data-open", "end");
    };
    function close(section: HTMLElement) {
      window.clearTimeout(timers.get(section));
      section.removeAttribute("data-open");
      section.querySelector("[data-collapse-trigger]")?.setAttribute("aria-expanded", "false");
    }

    const onPointerOver = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const section = folded(event.target);
      if (section) later(section, section.hasAttribute("data-open") ? 0 : OPEN_DELAY, () => open(section));
    };
    const onPointerOut = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const section = folded(event.target);
      if (!section || (event.relatedTarget instanceof Node && section.contains(event.relatedTarget))) return;
      later(section, CLOSE_DELAY, () => close(section));
    };
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const section = folded(target);
      if (!section || !target) return;
      if (target.closest("[data-collapse-trigger]")) {
        if (section.hasAttribute("data-open")) close(section);
        else open(section);
        return;
      }
      // A tool picked from an opened group closes it; a button that opens a menu of its own keeps it open.
      const button = target.closest("button");
      if (button && !button.hasAttribute("aria-haspopup") && section.hasAttribute("data-open")) window.setTimeout(() => close(section), 0);
    };
    const onOutside = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || !content.contains(event.target)) closeAll();
      else if (!folded(event.target)) closeAll();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeAll();
    };
    content.addEventListener("pointerover", onPointerOver);
    content.addEventListener("pointerout", onPointerOut);
    content.addEventListener("click", onClick);
    document.addEventListener("pointerdown", onOutside, true);
    window.addEventListener("keydown", onKey);
    return () => {
      observer?.disconnect();
      timers.forEach((timer) => window.clearTimeout(timer));
      content.removeEventListener("pointerover", onPointerOver);
      content.removeEventListener("pointerout", onPointerOut);
      content.removeEventListener("click", onClick);
      document.removeEventListener("pointerdown", onOutside, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [contentRef]);
}

/** Opens every group, measures the bar and folds what does not fit. */
function fitToolbar(content: HTMLElement, enabled: boolean) {
  const sections = [...content.querySelectorAll<HTMLElement>(".toolbar-section")];
  sections.forEach((section) => {
    section.removeAttribute("data-collapsed");
    section.removeAttribute("data-open");
  });
  if (!enabled || content.clientWidth === 0) return;
  const groups = sections
    .filter((section) => section.getClientRects().length > 0)
    .map((section, index) => {
      const style = getComputedStyle(section);
      const priority = Number(section.dataset.collapse);
      return {
        key: String(index),
        width: section.getBoundingClientRect().width + (parseFloat(style.marginLeft) || 0) + (parseFloat(style.marginRight) || 0),
        priority: Number.isFinite(priority) && priority > 0 ? priority : null,
        section,
      };
    });
  const fold = new Set(groupsToCollapse(groups, content.clientWidth - SLACK));
  groups.forEach((group) => {
    if (fold.has(group.key)) group.section.setAttribute("data-collapsed", "");
  });
}
