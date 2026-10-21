"use client";

import { Printer, X } from "lucide-react";
import { Fragment, useEffect } from "react";
import { createPortal } from "react-dom";
import { useMovablePanel } from "@/lib/useMovablePanel";
import { t, type MessageKey } from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";
import { GuideHelpLink } from "@/components/GuideHelpLink";

/**
 * One shortcut: the keys stay literal in both languages, only the sentence
 * beside them is translated. `combos` holds the alternatives - "F or Home" -
 * and a combo spells its keys with "+", the way the toolbar hints already do.
 * A slash inside one key means "any of these", as with the arrow keys.
 */
type Shortcut = { combos: string[]; label: MessageKey };
/**
 * Sketch mode replaces the whole workspace, so its keys and the ones for solid
 * bodies never apply at the same time. Each group says where it belongs and the
 * dialog only lists what the current mode actually listens for.
 */
type ShortcutGroup = { title: MessageKey; mode: "geometry" | "sketch"; shortcuts: Shortcut[] };

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "shortcuts.group.selection",
    mode: "geometry",
    shortcuts: [
      { combos: ["Esc"], label: "shortcuts.clearSelection" },
      { combos: ["Delete", "Backspace"], label: "shortcuts.delete" },
      { combos: ["Ctrl+A"], label: "shortcuts.selectAll" },
      { combos: ["Shift+Click"], label: "shortcuts.addToSelection" },
      { combos: ["RightClick"], label: "shortcuts.contextMenu" },
    ],
  },
  {
    title: "shortcuts.group.clipboard",
    mode: "geometry",
    shortcuts: [
      { combos: ["Ctrl+C"], label: "shortcuts.copy" },
      { combos: ["Ctrl+X"], label: "shortcuts.cut" },
      { combos: ["Ctrl+V"], label: "shortcuts.paste" },
      { combos: ["Ctrl+D"], label: "shortcuts.duplicate" },
    ],
  },
  {
    title: "shortcuts.group.history",
    mode: "geometry",
    shortcuts: [
      { combos: ["Ctrl+Z"], label: "shortcuts.undo" },
      { combos: ["Ctrl+Shift+Z", "Ctrl+Y"], label: "shortcuts.redo" },
      { combos: ["← / →", "Wheel"], label: "shortcuts.historyView" },
      { combos: ["PgUp / PgDn"], label: "shortcuts.historyViewPage" },
      { combos: ["Home / End"], label: "shortcuts.historyViewEnds" },
      { combos: ["Esc"], label: "shortcuts.historyViewClose" },
    ],
  },
  {
    title: "shortcuts.group.file",
    mode: "geometry",
    shortcuts: [
      { combos: ["Ctrl+I"], label: "shortcuts.import" },
      { combos: ["Ctrl+E"], label: "shortcuts.export" },
      { combos: ["Ctrl+S"], label: "shortcuts.save" },
    ],
  },
  {
    title: "shortcuts.group.organise",
    mode: "geometry",
    shortcuts: [
      { combos: ["Ctrl+G"], label: "shortcuts.group" },
      { combos: ["Ctrl+B"], label: "shortcuts.bundle" },
      { combos: ["Ctrl+Shift+G"], label: "shortcuts.ungroup" },
      { combos: ["E"], label: "shortcuts.editGroup" },
      { combos: ["Ctrl+L"], label: "shortcuts.lock" },
      { combos: ["Ctrl+H"], label: "shortcuts.hide" },
      { combos: ["Ctrl+Shift+H"], label: "shortcuts.showHidden" },
      { combos: ["Ctrl+Shift+O"], label: "shortcuts.outliner" },
    ],
  },
  {
    title: "shortcuts.group.shape",
    mode: "geometry",
    shortcuts: [
      { combos: ["H"], label: "shortcuts.hole" },
      { combos: ["S"], label: "shortcuts.solid" },
      { combos: ["T"], label: "shortcuts.transparent" },
      { combos: ["Shift+M"], label: "shortcuts.multicolor" },
      { combos: ["M"], label: "shortcuts.mirror" },
      { combos: ["B"], label: "shortcuts.fillet" },
      { combos: ["Shift+B"], label: "shortcuts.chamfer" },
      { combos: ["L"], label: "shortcuts.align" },
      { combos: ["D"], label: "shortcuts.dropToWorkplane" },
      { combos: ["C"], label: "shortcuts.carryOntoFace" },
      { combos: ["N"], label: "shortcuts.note" },
    ],
  },
  {
    title: "shortcuts.group.transform",
    mode: "geometry",
    shortcuts: [
      { combos: ["← / → / ↑ / ↓"], label: "shortcuts.nudge" },
      { combos: ["Shift+← / → / ↑ / ↓"], label: "shortcuts.nudgeCoarse" },
      { combos: ["Ctrl+↑ / ↓"], label: "shortcuts.raise" },
      { combos: ["R"], label: "shortcuts.rotate" },
      { combos: ["Shift+R"], label: "shortcuts.rotateFine" },
      { combos: ["Shift"], label: "shortcuts.axisLockDrag" },
      { combos: ["Alt+Drag"], label: "shortcuts.duplicateDrag" },
      { combos: ["Alt"], label: "shortcuts.pauseObjectSnap" },
      { combos: ["Alt+Enter"], label: "shortcuts.sizeAroundCenter" },
    ],
  },
  {
    title: "shortcuts.group.view",
    mode: "geometry",
    shortcuts: [
      { combos: ["1 – 6"], label: "shortcuts.views" },
      { combos: ["Shift+1 – 6"], label: "shortcuts.viewsFocus" },
      { combos: ["7 / 8 / 9 / 0"], label: "shortcuts.savedViews" },
      { combos: ["Shift+7 / 8 / 9 / 0"], label: "shortcuts.saveView" },
      { combos: ["← / → / ↑ / ↓"], label: "shortcuts.orbit" },
      { combos: ["Shift+← / → / ↑ / ↓"], label: "shortcuts.orbitCoarse" },
      { combos: ["Ctrl+← / → / ↑ / ↓"], label: "shortcuts.pan" },
      { combos: ["Ctrl+Shift+← / → / ↑ / ↓"], label: "shortcuts.panCoarse" },
      { combos: ["Home"], label: "shortcuts.resetView" },
      { combos: ["F", "Shift+F"], label: "shortcuts.focusSelection" },
      { combos: ["O"], label: "shortcuts.projection" },
      { combos: ["+", "−"], label: "shortcuts.zoom" },
      { combos: ["W"], label: "shortcuts.placeWorkplane" },
      { combos: ["Shift+W"], label: "shortcuts.placeWorkplaneOnSelection" },
      { combos: ["Shift"], label: "shortcuts.reverseWorkplane" },
      { combos: ["Esc"], label: "shortcuts.leaveMode" },
    ],
  },
  {
    title: "shortcuts.group.help",
    mode: "geometry",
    shortcuts: [
      { combos: ["Ctrl+K"], label: "shortcuts.commandSearch" },
      { combos: ["Shift+F1"], label: "shortcuts.interactiveHelp" },
    ],
  },
  {
    title: "shortcuts.group.sketch",
    mode: "sketch",
    shortcuts: [
      { combos: ["Ctrl+K"], label: "shortcuts.commandSearch" },
      { combos: ["Shift+F1"], label: "shortcuts.interactiveHelp" },
      { combos: ["Esc"], label: "shortcuts.sketchEscape" },
      { combos: ["Delete", "Backspace"], label: "shortcuts.sketchDelete" },
      { combos: ["Ctrl+C"], label: "shortcuts.copy" },
      { combos: ["Ctrl+X"], label: "shortcuts.cut" },
      { combos: ["Ctrl+V"], label: "shortcuts.paste" },
      { combos: ["Ctrl+D"], label: "shortcuts.duplicate" },
      { combos: ["Ctrl+Z"], label: "shortcuts.undo" },
      { combos: ["Ctrl+Shift+Z", "Ctrl+Y"], label: "shortcuts.redo" },
      { combos: ["R"], label: "shortcuts.sketchRotate" },
      { combos: ["L"], label: "shortcuts.sketchLockImage" },
      { combos: ["Home"], label: "shortcuts.sketchResetView" },
      { combos: ["F", "Shift+F"], label: "shortcuts.sketchFocusSelection" },
      { combos: ["+", "−"], label: "shortcuts.sketchZoom" },
      { combos: ["Alt+Enter"], label: "shortcuts.sketchDimensionSymmetric" },
      { combos: ["← / → / ↑ / ↓", "Shift+← / → / ↑ / ↓"], label: "shortcuts.sketchNudge" },
      { combos: ["← / → / ↑ / ↓", "Shift+← / → / ↑ / ↓"], label: "shortcuts.sketchHandleNudge" },
      { combos: ["1", "2", "3", "4"], label: "shortcuts.sketchTools" },
      { combos: ["Shift"], label: "shortcuts.sketchAngleSnap" },
      { combos: ["Shift"], label: "shortcuts.sketchAxisLock" },
      { combos: ["0-9", "<", "Tab", "Enter"], label: "shortcuts.sketchTypedLine" },
    ],
  },
  {
    title: "shortcuts.group.edgeModifier",
    mode: "geometry",
    shortcuts: [
      { combos: ["Enter"], label: "shortcuts.edgeApply" },
      { combos: ["Esc"], label: "shortcuts.edgeCancel" },
    ],
  },
];

/** Splits a combo into its keys - and leaves the "+" of the zoom key alone. */
function comboKeys(combo: string) {
  const parts = combo.split("+").map((part) => part.trim()).filter(Boolean);
  return parts.length > 0 ? parts : [combo];
}

/**
 * Whether the keyboard is an Apple one - a Mac, or an iPad with a keyboard,
 * which reports itself as a Mac. Browsers do not say "Darwin"; the user agent
 * says Macintosh. The editor takes Cmd wherever it takes Ctrl, and Option is
 * Alt, so the list shows the keys under the names on that keyboard.
 */
function appleKeyboard() {
  return typeof navigator !== "undefined" && /Macintosh|Mac OS X|iPhone|iPad|iPod/.test(navigator.userAgent);
}

const APPLE_KEY_NAMES: Record<string, string> = { Ctrl: "Cmd", Alt: "Option" };

function keyLabel(key: string, apple: boolean) {
  if (key === "Click") return t("shortcuts.click");
  if (key === "RightClick") return t("shortcuts.rightClick");
  if (key === "Drag") return t("shortcuts.drag");
  if (key === "Wheel") return t("shortcuts.wheel");
  return apple ? APPLE_KEY_NAMES[key] ?? key : key;
}

function ShortcutKeys({ combos, apple }: { combos: string[]; apple: boolean }) {
  return (
    <>
      {combos.map((combo, comboIndex) => (
        <Fragment key={combo}>
          {comboIndex > 0 ? <span className="shortcuts-or">{t("shortcuts.or")}</span> : null}
          <span className="shortcuts-combo">
            {comboKeys(combo).map((key, keyIndex) => (
              <Fragment key={key}>
                {keyIndex > 0 ? <span className="shortcuts-plus" aria-hidden="true">+</span> : null}
                <kbd>{keyLabel(key, apple)}</kbd>
              </Fragment>
            ))}
          </span>
        </Fragment>
      ))}
    </>
  );
}

/** The groups with their rows, the same markup in the window and on the printed sheet. */
function ShortcutGroups({ groups }: { groups: ShortcutGroup[] }) {
  const apple = appleKeyboard();
  return (
    <div className="shortcuts-groups">
      {groups.map((group) => (
        <section className="shortcuts-group" key={group.title}>
          <h3>{t(group.title)}</h3>
          <dl>
            {group.shortcuts.map((shortcut) => (
              <div className="shortcuts-row" key={`${group.title}:${shortcut.label}`}>
                <dt>{t(shortcut.label)}</dt>
                <dd>
                  <ShortcutKeys combos={shortcut.combos} apple={apple} />
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}

/** While this attribute is on the page, the print style shows the sheet of shortcuts and nothing else. */
const PRINT_ATTRIBUTE = "data-print-shortcuts";

/**
 * Prints only the list, black on white and in large type (a wish of someone who reads it a lot and found
 * screenshots too blurred). The sheet sits in the body next to the app, hidden on screen; the print style
 * hides everything else while the attribute is set. The attribute comes on with the button and with
 * Ctrl+P alike (beforeprint) and goes away again after printing.
 */
function useShortcutsPrinting() {
  useEffect(() => {
    const on = () => document.documentElement.setAttribute(PRINT_ATTRIBUTE, "");
    const off = () => document.documentElement.removeAttribute(PRINT_ATTRIBUTE);
    window.addEventListener("beforeprint", on);
    window.addEventListener("afterprint", off);
    return () => {
      window.removeEventListener("beforeprint", on);
      window.removeEventListener("afterprint", off);
      off();
    };
  }, []);
  return () => {
    document.documentElement.setAttribute(PRINT_ATTRIBUTE, "");
    window.print();
  };
}

export function ShortcutsModal({ sketchMode, onClose }: { sketchMode: boolean; onClose: () => void }) {
  useLanguage();
  const print = useShortcutsPrinting();
  const groups = SHORTCUT_GROUPS.filter((group) => (group.mode === "sketch") === sketchMode);
  // Moved by its title bar like every panel, and remembered where it stood.
  const movable = useMovablePanel<HTMLDivElement>("layerling.editor.shortcutsPosition", { floatingStyle: { position: "absolute", margin: 0 } });
  const cardRef = movable.panelRef;

  useEffect(() => {
    cardRef.current?.focus();
  }, []);

  return (
    <div
      className="workspace-modal shortcuts-modal"
      data-compact={groups.length <= 2 ? "true" : undefined}
      role="dialog"
      aria-modal="true"
      aria-label={t("shortcuts.title")}
      // The editor and the viewport both listen for keys on the window. While
      // this dialog is open every key it sees stops here, so reading about a
      // shortcut never triggers it.
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
        }
      }}
    >
      <div
        className={`workspace-modal-card shortcuts-modal-card ${movable.moved ? "floating" : ""} ${movable.dragging ? "moving" : ""}`}
        ref={cardRef}
        style={movable.style}
        tabIndex={-1}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <header className="workspace-modal-header movable" title={t("panel.moveHint")} {...movable.handleProps}>
          <strong>{t("shortcuts.title")}</strong>
          <div className="panel-header-actions">
            <GuideHelpLink chapter="shortcuts" />
            <button aria-label={t("shortcuts.print")} title={t("shortcuts.print")} onClick={print}>
              <Printer size={18} />
            </button>
            <button aria-label={t("shortcuts.close")} onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </header>
        <div className="workspace-modal-content">
          <div className="workspace-modal-body shortcuts-modal-body">
            <p className="shortcuts-intro">{t("shortcuts.intro")}</p>
            <ShortcutGroups groups={groups} />
          </div>
        </div>
      </div>
      <button className="workspace-modal-backdrop" aria-label={t("shortcuts.close")} onClick={onClose} />
      {typeof document === "undefined"
        ? null
        : createPortal(
            <div className="shortcuts-print-sheet" aria-hidden="true">
              <h1>{t("shortcuts.title")}</h1>
              <ShortcutGroups groups={groups} />
            </div>,
            document.body,
          )}
    </div>
  );
}
