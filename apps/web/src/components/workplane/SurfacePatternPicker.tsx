"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { t } from "@/lib/i18n";
import { SURFACE_TEXTURE_LABELS } from "@/lib/surfaceTextureShape";
import { SURFACE_TEXTURE_PATTERNS, type SurfaceTexturePattern } from "@/lib/surfaceTexture";

/** A small picture of each pattern: its front face on a box, rendered from the surface texture code with its starting values. */
export const surfacePatternThumbnail = (pattern: SurfaceTexturePattern) => `assets/editor/surface-patterns/${pattern}.png`;

/**
 * The surface texture's pattern, chosen by its picture: twenty names alone are hard to tell apart. The field shows
 * the chosen one; opened, a grid of all of them with a search above. Arrow keys move through the grid, Enter takes one,
 * Escape closes it. It stands in the card where the plain select of names stood.
 */
export function SurfacePatternPicker({ value, disabled = false, onChange }: {
  value: SurfaceTexturePattern;
  disabled?: boolean;
  onChange: (value: SurfaceTexturePattern) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const listId = `${id}-list`;
  const label = (pattern: SurfaceTexturePattern) => t(SURFACE_TEXTURE_LABELS.pattern[pattern]);
  const words = query.trim().toLocaleLowerCase();
  const shown = SURFACE_TEXTURE_PATTERNS.filter((pattern) => !words || label(pattern).toLocaleLowerCase().includes(words) || pattern.includes(words));

  useEffect(() => {
    if (!open) return undefined;
    searchRef.current?.focus();
    // Opened low in the panel, the grid scrolls into view.
    popoverRef.current?.scrollIntoView?.({ block: "nearest" });
    const away = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);

  const close = () => {
    setOpen(false);
    setQuery("");
    triggerRef.current?.focus();
  };
  const choose = (pattern: SurfaceTexturePattern) => {
    if (pattern !== value) onChange(pattern);
    close();
  };
  const tiles = () => [...(listRef.current?.querySelectorAll<HTMLButtonElement>("[role=option]") ?? [])];
  const onGridKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const all = tiles();
    const index = all.indexOf(document.activeElement as HTMLButtonElement);
    const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 2, ArrowUp: -2 }[event.key];
    if (step !== undefined) {
      event.preventDefault();
      if (index + step < 0 && step === -2) searchRef.current?.focus();
      else all[Math.min(all.length - 1, Math.max(0, index + step))]?.focus();
    } else if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  };

  return (
    <div
      className="select-property pattern-picker"
      ref={rootRef}
      onKeyDown={(event) => {
        // The editor listens for keys on the window. As in the select this stands in for, they stop here: Delete on a
        // picture must not delete the body, Escape not deselect it. Shortcuts with Ctrl or Cmd, like undo, go through.
        if (!event.ctrlKey && !event.metaKey) event.stopPropagation();
      }}
      onBlur={(event) => {
        // Tabbing out of the open grid closes it, as a click elsewhere does.
        if (open && event.relatedTarget && !rootRef.current?.contains(event.relatedTarget as Node)) {
          setOpen(false);
          setQuery("");
        }
      }}
    >
      <span id={`${id}-label`}>{t("inspector.surfacePattern")}</span>
      <button
        ref={triggerRef}
        type="button"
        className="pattern-picker-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-labelledby={`${id}-label ${id}-value`}
        disabled={disabled}
        onClick={() => (open ? close() : setOpen(true))}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && !open) {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <PatternThumbnail key={value} pattern={value} />
        <span id={`${id}-value`}>{label(value)}</span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {open ? (
        <div className="pattern-picker-popover" ref={popoverRef}>
          <label className="pattern-picker-search">
            <Search size={15} aria-hidden="true" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              placeholder={t("inspector.surfacePatternSearch")}
              aria-label={t("inspector.surfacePatternSearch")}
              aria-controls={listId}
              onChange={(event) => setQuery(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  tiles()[0]?.focus();
                } else if (event.key === "Enter" && shown.length > 0) {
                  event.preventDefault();
                  choose(shown[0]);
                } else if (event.key === "Escape") {
                  event.preventDefault();
                  close();
                }
              }}
            />
          </label>
          <div className="pattern-picker-grid" role="listbox" id={listId} aria-labelledby={`${id}-label`} ref={listRef} onKeyDown={onGridKey}>
            {shown.map((pattern) => (
              <button
                key={pattern}
                type="button"
                role="option"
                aria-selected={pattern === value}
                tabIndex={-1}
                className={pattern === value ? "selected" : ""}
                onClick={() => choose(pattern)}
              >
                <PatternThumbnail pattern={pattern} />
                <span>{label(pattern)}</span>
                {pattern === value ? <Check className="pattern-picker-check" size={12} strokeWidth={3} aria-hidden="true" /> : null}
              </button>
            ))}
            {shown.length === 0 ? <p className="pattern-picker-empty">{t("inspector.surfacePatternNone")}</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** A pattern's picture; a missing one leaves an empty tile instead of a broken image. */
function PatternThumbnail({ pattern }: { pattern: SurfaceTexturePattern }) {
  const [missing, setMissing] = useState(false);
  return missing ? <span className="pattern-thumbnail missing" aria-hidden="true" /> : (
    <img className="pattern-thumbnail" src={surfacePatternThumbnail(pattern)} alt="" aria-hidden="true" onError={() => setMissing(true)} />
  );
}
