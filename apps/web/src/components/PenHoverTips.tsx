"use client";

import { useEffect, useState } from "react";
import { isAppleTouchDevice } from "@/lib/fileAccept";
import { holdTitle, hoverTipFor, hoverTitled, hoverTitleOf, penTipPosition } from "@/lib/penHoverTip";

/** The pointer has to rest on a control this long before its name appears, as a mouse waits for a tooltip. */
const SHOW_DELAY_MS = 350;

type Tip = { text: string; left: number; top: number };

function runsAsInstalledApp() {
  return window.matchMedia("(display-mode: standalone)").matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/**
 * On an iPad the Apple Pencil hovers above the screen, and Safari reports it as a pen that moves without
 * a button down - but it shows no title text for it, which a mouse does (#495). So a pen resting on a
 * control with a title shows that text in a small bubble, after a moment. In layerling installed as an
 * app the browser's own tooltip comes late or not at all (#1013), so there the mouse gets the bubble too.
 * While the bubble is in charge of a control its title is held back, or the browser's tooltip would
 * come up as well.
 */
export function PenHoverTips() {
  const [tip, setTip] = useState<Tip | null>(null);

  useEffect(() => {
    const place = {
      appleTouch: isAppleTouchDevice(navigator.userAgent, navigator.maxTouchPoints ?? 0),
      installedApp: runsAsInstalledApp(),
    };
    if (!place.appleTouch && !place.installedApp) return;
    let current: HTMLElement | null = null;
    let release: (() => void) | null = null;
    let timer: number | undefined;
    const quiet = () => {
      window.clearTimeout(timer);
      setTip(null);
    };
    const hide = () => {
      quiet();
      release?.();
      release = null;
      current = null;
    };
    const move = (event: PointerEvent) => {
      if (!hoverTipFor(event.pointerType, place) || event.buttons !== 0) return;
      const found = hoverTitled(event.target);
      if (!found) {
        if (current) hide();
        return;
      }
      if (found.element === current) return;
      hide();
      current = found.element;
      release = holdTitle(found.element);
      timer = window.setTimeout(() => {
        // The text is read now: a control may have changed its title while the pointer waited.
        const text = hoverTitleOf(found.element);
        if (!text || !found.element.isConnected) return;
        const position = penTipPosition(found.element.getBoundingClientRect(), { width: window.innerWidth, height: window.innerHeight });
        setTip({ text, left: position.left, top: position.top });
      }, SHOW_DELAY_MS);
    };
    // A click or a key only puts the bubble away: like the browser's tooltip it stays away until the
    // pointer moves on to another control, and so does the title.
    window.addEventListener("pointermove", move, true);
    window.addEventListener("pointerdown", quiet, true);
    window.addEventListener("pointercancel", hide, true);
    window.addEventListener("keydown", quiet, true);
    window.addEventListener("wheel", hide, { capture: true, passive: true });
    window.addEventListener("scroll", hide, true);
    window.addEventListener("blur", hide);
    document.addEventListener("pointerleave", hide);
    return () => {
      hide();
      window.removeEventListener("pointermove", move, true);
      window.removeEventListener("pointerdown", quiet, true);
      window.removeEventListener("pointercancel", hide, true);
      window.removeEventListener("keydown", quiet, true);
      window.removeEventListener("wheel", hide, true);
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("blur", hide);
      document.removeEventListener("pointerleave", hide);
    };
  }, []);

  if (!tip) return null;
  return (
    <div className="pen-hover-tip" role="tooltip" style={{ left: tip.left, top: tip.top }}>
      {tip.text}
    </div>
  );
}
