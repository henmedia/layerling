"use client";

import { Search, X } from "lucide-react";
import { Fragment, useEffect, useId, useMemo, useRef, useState, type ComponentType } from "react";
import { createPortal } from "react-dom";
import { GuideHelpLink } from "@/components/GuideHelpLink";
import { rememberCommand, searchCommands } from "@/lib/commandSearch";
import { t } from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";
import { useMovablePanel } from "@/lib/useMovablePanel";

/** One entry of the command search: what the toolbar and its menus can do. */
export type PaletteCommand = {
  id: string;
  label: string;
  /** The toolbar group it lives in, shown on the right and searchable. */
  group: string;
  keywords?: readonly string[];
  /** The keys that do the same, spelled like in the shortcut list ("Ctrl+G"). */
  shortcut?: string;
  icon?: ComponentType<{ className?: string; size?: number; "aria-hidden"?: boolean }>;
  /** A picture instead of an icon, for shapes. */
  image?: string;
  enabled: boolean;
  /** A tool that is switched on right now. */
  active?: boolean;
  /** Only listed once something is typed, like the bodies of a design - too many for the empty list. */
  searchOnly?: boolean;
  /** Not remembered as recently used (its id changes from design to design). */
  transient?: boolean;
  run: () => void;
};

const RECENT_STORAGE_KEY = "layerling.recentCommands";

function readRecent(): string[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(RECENT_STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === "string") : [];
  } catch {
    return [];
  }
}

function writeRecent(ids: string[]) {
  try {
    window.localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Without storage the list simply starts over next time.
  }
}

/**
 * The search for every command of the toolbar, opened with Ctrl+K: type a few
 * letters, move with the arrow keys, Enter runs it. Commands that cannot run
 * right now stay in the list, greyed out, so the search still tells where a
 * tool is - they just do nothing.
 */
export function CommandPalette({ commands, onClose }: { commands: PaletteCommand[]; onClose: () => void }) {
  useLanguage();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const [recentIds, setRecentIds] = useState<string[]>(readRecent);
  const typing = query.trim().length > 0;
  // An empty field lists what was used last on top, then everything in toolbar
  // order; once something is typed, only the ranking counts.
  const { results, recentCount } = useMemo(() => {
    if (typing) return { results: searchCommands(commands, query), recentCount: 0 };
    const listed = commands.filter((command) => !command.searchOnly);
    const recent = recentIds.flatMap((id) => listed.find((command) => command.id === id) ?? []);
    const rest = listed.filter((command) => !recent.includes(command));
    return { results: [...recent, ...rest], recentCount: recent.length };
  }, [commands, query, recentIds, typing]);
  const current = Math.min(index, Math.max(0, results.length - 1));

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    inputRef.current?.focus();
    return () => {
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${current}"]`)?.scrollIntoView({ block: "nearest" });
  }, [current, results]);

  const choose = (command: PaletteCommand | undefined) => {
    if (!command) return;
    if (!command.enabled) {
      setBlocked(true);
      return;
    }
    if (!command.transient) {
      const next = rememberCommand(recentIds, command.id);
      setRecentIds(next);
      writeRecent(next);
    }
    onClose();
    // After the palette is gone, so the tool finds the focus where it left it.
    window.setTimeout(command.run, 0);
  };

  const move = (step: number) => {
    if (results.length === 0) return;
    setBlocked(false);
    setIndex((value) => (Math.min(value, results.length - 1) + step + results.length) % results.length);
  };

  // The strip above the search field moves the window; it keeps the place it was left at.
  const movable = useMovablePanel<HTMLDivElement>("layerling.editor.commandPalettePosition", {
    floatingStyle: { position: "absolute", margin: 0 },
  });

  return createPortal(
    <div className="command-palette-backdrop" onPointerDown={onClose}>
      <div
        ref={movable.panelRef}
        className={`command-palette ${movable.moved ? "floating" : ""} ${movable.dragging ? "moving" : ""}`}
        style={movable.style}
        role="dialog"
        aria-modal="true"
        aria-label={t("palette.title")}
        onPointerDown={(event) => event.stopPropagation()}
        // The editor and the viewport listen for keys on the window: while this
        // window is open every key stops here.
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === "Escape" || ((event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey && (event.key ?? "").toLowerCase() === "k")) {
            event.preventDefault();
            onClose();
          } else if (event.key === "ArrowDown") {
            event.preventDefault();
            move(1);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            move(-1);
          } else if (event.key === "Home" && results.length > 0) {
            event.preventDefault();
            setIndex(0);
          } else if (event.key === "End" && results.length > 0) {
            event.preventDefault();
            setIndex(results.length - 1);
          } else if (event.key === "Enter" && !event.nativeEvent.isComposing) {
            event.preventDefault();
            choose(results[current]);
          } else if (event.key === "Tab") {
            event.preventDefault();
          }
        }}
      >
        <div className="command-palette-grip movable" title={t("panel.moveHint")} {...movable.handleProps}>
          <span aria-hidden="true" />
        </div>
        <div className="command-palette-search">
          <Search size={18} aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            placeholder={t("palette.placeholder")}
            aria-label={t("palette.placeholder")}
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={results.length > 0 ? `${listId}-${current}` : undefined}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            onChange={(event) => {
              setQuery(event.currentTarget.value);
              setIndex(0);
              setBlocked(false);
            }}
          />
          <GuideHelpLink section="commandSearch" />
          <button type="button" className="command-palette-close" aria-label={t("palette.close")} title={t("palette.close")} onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        {results.length === 0 ? (
          <p className="command-palette-empty" role="status">{t("palette.empty")}</p>
        ) : (
          <ul className="command-palette-list" id={listId} role="listbox" aria-label={t("palette.title")} ref={listRef}>
            {results.map((command, position) => {
              const Icon = command.icon;
              return (
                <Fragment key={command.id}>
                {recentCount > 0 && (position === 0 || position === recentCount) ? (
                  <li className="command-palette-heading" role="presentation">{position === 0 ? t("palette.recent") : t("palette.all")}</li>
                ) : null}
                <li
                  id={`${listId}-${position}`}
                  data-index={position}
                  role="option"
                  aria-selected={position === current}
                  aria-disabled={!command.enabled}
                  className={`command-palette-item${position === current ? " selected" : ""}${command.enabled ? "" : " disabled"}${command.active ? " active" : ""}`}
                  onPointerMove={() => {
                    if (position !== current) setIndex(position);
                  }}
                  onClick={() => choose(command)}
                >
                  <span className="command-palette-icon" aria-hidden="true">
                    {command.image ? <img src={command.image} alt="" draggable={false} /> : Icon ? <Icon className="command-palette-svg" size={18} aria-hidden /> : null}
                  </span>
                  <span className="command-palette-label">{command.label}</span>
                  {command.shortcut ? (
                    <span className="command-palette-keys">
                      {command.shortcut.split("+").map((key) => <kbd key={key}>{key}</kbd>)}
                    </span>
                  ) : null}
                  <span className="command-palette-group">{command.group}</span>
                </li>
                </Fragment>
              );
            })}
          </ul>
        )}
        <div className="command-palette-footer" aria-live="polite">
          {blocked ? <span className="command-palette-blocked">{t("palette.disabled")}</span> : <span>{t("palette.hint")}</span>}
        </div>
      </div>
    </div>,
    document.body,
  );
}
