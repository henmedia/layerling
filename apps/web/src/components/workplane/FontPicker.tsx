"use client";

import { Fragment, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { FONT_MANAGER_OPTION } from "@/lib/fontManagerEvents";
import { fontPreview } from "@/lib/fontPreview";
import { textFontsLoaded } from "@/lib/textFonts";

export type FontPickerOption = { value: string; label: string; group?: string };

const PREVIEW_SIZE = 24;
const LIST_MAX_HEIGHT = 340;

/**
 * One line of text in a typeface, drawn from its outlines. Nothing is shown while the fonts are
 * still loading, or for a font that cannot be drawn; the name beside it says what it is anyway.
 */
export function FontPreviewLine({ fontId, text, height = 28 }: { fontId: string; text: string; height?: number }) {
  const preview = textFontsLoaded() ? fontPreview(fontId, text, PREVIEW_SIZE) : null;
  if (!preview) return <span className="font-preview-line empty" aria-hidden="true" style={{ height }} />;
  const top = preview.ascent;
  const total = preview.ascent + preview.descent;
  const width = Math.max(preview.width, 1);
  // One scale for every font, so a face with a small x-height reads small, as it will in the text.
  const scale = height / (PREVIEW_SIZE * 1.3);
  return (
    <svg
      className="font-preview-line"
      aria-hidden="true"
      focusable="false"
      style={{ height: total * scale, width: width * scale, maxWidth: "100%" }}
      viewBox={`${preview.minX} ${-top} ${width} ${total}`}
      preserveAspectRatio="xMinYMid meet"
    >
      <path d={preview.d} fill="currentColor" fillRule="evenodd" />
    </svg>
  );
}

/**
 * The font choice of a text: a closed field that shows the chosen font in its own letters and a list
 * that shows every font so, each with the shape's own words. It stands in for the plain select
 * the other properties use, which cannot draw anything in a list entry.
 */
export function FontPicker({
  label,
  value,
  options,
  sample,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  options: FontPickerOption[];
  /** The words every entry is drawn with; a font's name when empty. */
  sample: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const listId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [place, setPlace] = useState<{ left: number; top: number; width: number; maxHeight: number } | null>(null);
  const selected = options.find((option) => option.value === value) ?? options[0];

  const openList = () => {
    if (disabled) return;
    setActive(Math.max(0, options.findIndex((option) => option.value === value)));
    setOpen(true);
  };
  const close = (focus = true) => {
    setOpen(false);
    if (focus) buttonRef.current?.focus();
  };
  const choose = (index: number) => {
    const option = options[index];
    if (!option) return;
    close();
    if (option.value !== value) onChange(option.value);
    else if (option.value === FONT_MANAGER_OPTION) onChange(option.value);
  };

  // Under the field, or above it where the screen has no room below.
  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom - 12;
    const above = rect.top - 12;
    const up = below < 180 && above > below;
    const maxHeight = Math.min(LIST_MAX_HEIGHT, up ? above : below);
    // As wide as the names and a sample need, hanging from the right edge of the field.
    const width = Math.min(Math.max(rect.width, 300), window.innerWidth - 16);
    setPlace({ left: Math.max(8, rect.right - width), top: up ? Math.max(8, rect.top - 4 - maxHeight) : rect.bottom + 4, width, maxHeight });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const away = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && (listRef.current?.contains(target) || buttonRef.current?.contains(target))) return;
      setOpen(false);
    };
    const leave = () => setOpen(false);
    window.addEventListener("pointerdown", away, true);
    window.addEventListener("resize", leave);
    return () => {
      window.removeEventListener("pointerdown", away, true);
      window.removeEventListener("resize", leave);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open, place]);

  const blocks = useMemo(() => {
    const result: Array<{ group?: string; items: Array<FontPickerOption & { index: number }> }> = [];
    options.forEach((option, index) => {
      const last = result[result.length - 1];
      if (last && last.group === option.group) last.items.push({ ...option, index });
      else result.push({ group: option.group, items: [{ ...option, index }] });
    });
    return result;
  }, [options]);

  const words = (option: FontPickerOption) => (sample.trim() ? sample : option.label);
  const isFont = (option: FontPickerOption) => option.value !== FONT_MANAGER_OPTION;

  const onKeyDown = (event: React.KeyboardEvent) => {
    // The editor listens for keys on the window: while this list is in use they stop here.
    event.stopPropagation();
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        openList();
      }
      return;
    }
    const last = options.length - 1;
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => Math.min(last, index + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(0, index - 1));
    } else if (event.key === "Home") {
      event.preventDefault();
      setActive(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActive(last);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      choose(active);
    } else if (event.key === "Tab") {
      setOpen(false);
    } else if ((event.key ?? "").length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      // Typing a letter jumps to the next font whose name starts with it.
      const letter = (event.key ?? "").toLowerCase();
      const next = [...options.keys()].map((offset) => (active + 1 + offset) % options.length).find((index) => options[index].label.toLowerCase().startsWith(letter));
      if (next !== undefined) setActive(next);
    }
  };

  return (
    <div className="select-property font-picker-property">
      <span id={`${listId}-label`}>{label}</span>
      <button
        ref={buttonRef}
        type="button"
        className="font-picker-button"
        disabled={disabled}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-labelledby={`${listId}-label`}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        onClick={() => (open ? close(false) : openList())}
        onKeyDown={onKeyDown}
      >
        <span className="font-picker-current">
          {selected && isFont(selected) ? <FontPreviewLine fontId={selected.value} text={words(selected)} height={22} /> : null}
          <small>{selected?.label}</small>
        </span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {open && place
        ? createPortal(
            <div
              ref={listRef}
              id={listId}
              className="font-picker-list"
              role="listbox"
              aria-labelledby={`${listId}-label`}
              style={{ left: place.left, top: place.top, width: place.width, maxHeight: place.maxHeight }}
              onKeyDown={onKeyDown}
            >
              {blocks.map((block, blockIndex) => (
                <Fragment key={`${block.group ?? ""}-${blockIndex}`}>
                  {block.group ? <div className="font-picker-group" role="presentation">{block.group}</div> : null}
                  {block.items.map((option) => (
                    <div
                      key={option.value}
                      id={`${listId}-${option.index}`}
                      data-index={option.index}
                      role="option"
                      aria-selected={option.value === value}
                      className={`font-picker-option${option.index === active ? " active" : ""}${option.value === value ? " selected" : ""}${isFont(option) ? "" : " action"}`}
                      onPointerEnter={() => setActive(option.index)}
                      onClick={() => choose(option.index)}
                    >
                      {isFont(option) ? <FontPreviewLine fontId={option.value} text={words(option)} height={26} /> : null}
                      <small>{option.label}</small>
                    </div>
                  ))}
                </Fragment>
              ))}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
