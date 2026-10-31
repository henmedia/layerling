"use client";

import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";

export type ShapeContextMenuItem = {
  key: string;
  label: string;
  /** As the shortcuts list writes it, "Ctrl+D"; shown with Cmd on a Mac. */
  shortcut?: string;
  danger?: boolean;
  /** Draws a line above the item. */
  separated?: boolean;
  /** The menu stays open after the click, for an item that shows other items in its place. */
  keepOpen?: boolean;
  /** A colour dot before the label: the body a row of "Select other" stands for (#804). */
  color?: string;
  /** The pointer or the focus is on the item (true) or has left it (false). */
  onHover?: (active: boolean) => void;
  /** `shift`: Shift was held, to add to the selection. */
  onSelect: (modifiers: { shift: boolean }) => void;
};

const isMac = () => typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/**
 * The menu a right click on a body opens: the commands people otherwise look
 * for in the ribbon or know only as shortcuts. It stays inside the window and
 * closes on any press outside it, on Escape, on the wheel outside it and on
 * a resize.
 */
export function ShapeContextMenu({ x, y, label, items, onClose }: {
  x: number;
  y: number;
  label: string;
  items: ShapeContextMenuItem[];
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: x, top: y });
  // Another set of items (the list of "Select other") is placed and focused anew.
  const itemsKey = items.map((item) => item.key).join(" ");

  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    const margin = 8;
    const { width, height } = menu.getBoundingClientRect();
    setPosition({
      left: Math.max(margin, Math.min(x, window.innerWidth - width - margin)),
      top: Math.max(margin, Math.min(y, window.innerHeight - height - margin)),
    });
    menu.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
  }, [x, y, itemsKey]);

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) onClose();
    };
    // The wheel over the menu scrolls a long one (Discussion #1058); only the wheel elsewhere closes it.
    const closeOnWheel = (event: WheelEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) onClose();
    };
    const closeOnKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("pointerdown", closeOutside, true);
    window.addEventListener("keydown", closeOnKey, true);
    window.addEventListener("wheel", closeOnWheel, { passive: true });
    window.addEventListener("resize", onClose);
    window.addEventListener("blur", onClose);
    return () => {
      window.removeEventListener("pointerdown", closeOutside, true);
      window.removeEventListener("keydown", closeOnKey, true);
      window.removeEventListener("wheel", closeOnWheel);
      window.removeEventListener("resize", onClose);
      window.removeEventListener("blur", onClose);
    };
  }, [onClose]);

  const moveFocus = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const buttons = [...(menuRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? [])];
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === "ArrowDown" ? (index + 1) % buttons.length : (index - 1 + buttons.length) % buttons.length;
    buttons[next]?.focus();
  };

  const mac = isMac();
  return (
    <div
      ref={menuRef}
      className="shape-context-menu"
      role="menu"
      aria-label={label}
      style={{ left: position.left, top: position.top }}
      onKeyDown={moveFocus}
      onContextMenu={(event) => event.preventDefault()}
    >
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          role="menuitem"
          className={`${item.danger ? "danger" : ""}${item.separated ? " separated" : ""}`.trim() || undefined}
          onClick={(event) => {
            if (!item.keepOpen) onClose();
            item.onSelect({ shift: event.shiftKey });
          }}
          onPointerEnter={item.onHover ? () => item.onHover?.(true) : undefined}
          onPointerLeave={item.onHover ? () => item.onHover?.(false) : undefined}
          onFocus={item.onHover ? () => item.onHover?.(true) : undefined}
          onBlur={item.onHover ? () => item.onHover?.(false) : undefined}
        >
          <span>
            {item.color ? <i className="shape-context-menu-swatch" style={{ background: item.color }} aria-hidden="true" /> : null}
            {item.label}
          </span>
          {item.shortcut ? <kbd>{mac ? item.shortcut.replace(/Ctrl\+/g, "⌘").replace(/Shift\+/g, "⇧") : item.shortcut}</kbd> : null}
        </button>
      ))}
    </div>
  );
}
