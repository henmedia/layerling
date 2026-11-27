"use client";

import { useEffect, type ReactNode } from "react";
import { useMovablePanel, type MovablePanelOptions } from "@/lib/useMovablePanel";

/**
 * Die Werkzeugtafeln oben rechts - Kanten verrunden und fasen, Aushoehlen,
 * Vervielfaeltigen - lassen sich an ihrer Titelleiste ueber die Arbeitsflaeche
 * ziehen. Sie stehen an derselben Stelle, also teilen sie sich auch den
 * gemerkten Platz. Ein Doppelklick auf die Titelleiste oder das Ablegen an der
 * alten Stelle bringt sie zurueck.
 */
const TOOL_PANEL: MovablePanelOptions = {
  floatingStyle: { right: "auto", bottom: "auto" },
  area: (panel) => panel.ownerDocument.querySelector<HTMLElement>(".workplane-stage"),
  keptHeight: toolPanelKeptHeight,
};

/** About three rows of fields. */
const KEPT_ROWS_HEIGHT = 120;

/**
 * Dragged down, a tool panel keeps its title bar, a few rows and its buttons (Cancel, Apply) in view, and so does the
 * next tool that opens at that spot (Discussion #2158). The buttons stick to the panel's foot while it scrolls.
 */
export function toolPanelKeptHeight(panel: HTMLElement): number {
  const header = panel.querySelector<HTMLElement>(":scope > .movable");
  const footer = panel.querySelector<HTMLElement>(":scope > .edge-modifier-footer, :scope > .split-panel-footer");
  const headerBottom = header ? header.offsetTop + header.offsetHeight : 0;
  return panel.clientTop * 2 + headerBottom + KEPT_ROWS_HEIGHT + (footer?.offsetHeight ?? 0);
}

export type MovableHandleProps = ReturnType<typeof useMovablePanel>["handleProps"];

export function MovableToolPanel({
  className,
  ariaLabel,
  focusOnOpen = false,
  children,
}: {
  className: string;
  ariaLabel: string;
  /** The panel takes the keyboard focus when it opens and gives it back when it closes. */
  focusOnOpen?: boolean;
  /** Bekommt die Griffe fuer die Titelleiste. */
  children: (handleProps: MovableHandleProps) => ReactNode;
}) {
  const movable = useMovablePanel<HTMLElement>("layerling.editor.toolPanelPosition", TOOL_PANEL);
  const { panelRef } = movable;
  useEffect(() => {
    if (!focusOnOpen) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panelRef.current?.focus({ preventScroll: true });
    return () => {
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [focusOnOpen, panelRef]);
  return (
    <aside
      ref={movable.panelRef}
      className={`${className} ${movable.moved ? "floating" : ""} ${movable.dragging ? "moving" : ""}`}
      style={movable.style}
      tabIndex={focusOnOpen ? -1 : undefined}
      aria-label={ariaLabel}
      data-help-panel={ariaLabel}
    >
      {children(movable.handleProps)}
    </aside>
  );
}
