import { useEffect, useRef, useState, type CSSProperties } from "react";
import { GuideHelpLink } from "@/components/GuideHelpLink";
import type { AlignAxis, AlignHandleStatus, AlignSpread, AlignTarget } from "@/types/layerling";
import { t } from "@/lib/i18n";
import { currentLengthUnitLabel, parseLengthMm } from "@/lib/measurementUnits";

export type AlignOverlayState = {
  guides: Array<{ key: string; x1: number; y1: number; x2: number; y2: number }>;
  handles: Array<AlignHandleStatus & { key: string; x: number; y: number }>;
  /** The equal-gaps dot of each axis, turned along its line (`angle`, degrees on the screen). */
  spreads: Array<NonNullable<AlignHandleStatus["spread"]> & { axis: AlignAxis; key: string; x: number; y: number; angle: number }>;
};

/** A gap typed in the workspace unit, in millimetres; null while it is no length of zero or more. */
function typedGap(text: string): number | null {
  if (!text.trim()) return null;
  const value = parseLengthMm(text);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export type MirrorOverlayState = {
  guides: Array<{ key: string; x1: number; y1: number; x2: number; y2: number }>;
  handles: Array<{ axis: AlignAxis; key: string; x: number; y: number; angle: number; title: string }>;
};

export function AlignOverlay({
  overlay,
  onAlign,
  onPreview,
  onPreviewClear,
}: {
  overlay: AlignOverlayState;
  onAlign: (axis: AlignAxis, target: AlignTarget, size: boolean, spread?: AlignSpread) => void;
  onPreview: (axis: AlignAxis, target: AlignTarget, size: boolean, spread?: AlignSpread) => void;
  onPreviewClear: () => void;
}) {
  // Alt on an equal-gaps dot opens a field for the gap; the parts show where they go while it is typed.
  const [gapField, setGapField] = useState<{ axis: AlignAxis; x: number; y: number } | null>(null);
  const [gapText, setGapText] = useState("");
  const gapInputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (gapField) gapInputRef.current?.select();
  }, [gapField]);
  const closeGapField = () => {
    setGapField(null);
    onPreviewClear();
  };
  const applyGap = () => {
    const gap = typedGap(gapText);
    if (!gapField || gap === null) return;
    const axis = gapField.axis;
    setGapField(null);
    onPreviewClear();
    onAlign(axis, "center", false, { gap });
  };
  // Alt turns the dots into squares that stretch the parts instead of moving them (#998). Pressing or
  // letting go of it over a dot shows the other preview at once. A tablet has no Alt key, so a switch
  // beside the dots (shown where a finger or pen is the pointer) holds the same mode.
  const [sizeMode, setSizeMode] = useState(false);
  const [sizePinned, setSizePinned] = useState(false);
  const hovered = useRef<{ axis: AlignAxis; target: AlignTarget } | null>(null);
  const sizeModeRef = useRef(false);
  const altHeldRef = useRef(false);
  const pinnedRef = useRef(false);
  const previewRef = useRef(onPreview);
  previewRef.current = onPreview;
  const refreshSizeMode = () => {
    const next = altHeldRef.current || pinnedRef.current;
    if (sizeModeRef.current === next) return;
    sizeModeRef.current = next;
    setSizeMode(next);
    if (hovered.current) previewRef.current(hovered.current.axis, hovered.current.target, next);
  };
  const refreshSizeModeRef = useRef(refreshSizeMode);
  refreshSizeModeRef.current = refreshSizeMode;

  useEffect(() => {
    const change = (alt: boolean) => {
      altHeldRef.current = alt;
      refreshSizeModeRef.current();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Alt") return;
      // A lone Alt would otherwise take the focus to the browser's menu.
      event.preventDefault();
      change(event.type === "keydown");
    };
    const onPointer = (event: PointerEvent) => {
      // A finger or pen never holds Alt, so it must not undo what the switch set.
      if (event.pointerType === "mouse") change(event.altKey);
    };
    const onBlur = () => change(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    window.addEventListener("pointermove", onPointer);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  return (
    <div className={`align-overlay ${sizeMode ? "size-mode" : ""}`} aria-label={t("aria.alignmentHandles")}>
      <svg className="align-guides" width="100%" height="100%" aria-hidden="true">
        {overlay.guides.map((guide) => (
          <line key={guide.key} x1={guide.x1} y1={guide.y1} x2={guide.x2} y2={guide.y2} />
        ))}
      </svg>
      {overlay.handles.map((handle) => {
        const state = sizeMode && handle.size ? handle.size : handle;
        return (
          <button
            key={handle.key}
            className={`align-dot axis-${handle.axis} target-${handle.target} ${state.disabled ? "disabled" : ""} ${state.aligned ? "aligned" : ""}`}
            style={{ left: handle.x, top: handle.y }}
            aria-label={state.title}
            title={state.title}
            disabled={state.disabled}
            onMouseEnter={(event) => {
              hovered.current = { axis: handle.axis, target: handle.target };
              const size = (event.altKey || sizeModeRef.current) && Boolean(handle.size);
              const status = size ? handle.size! : handle;
              if (!status.disabled) {
                onPreview(handle.axis, handle.target, size);
              }
            }}
            onMouseLeave={() => {
              hovered.current = null;
              onPreviewClear();
            }}
            onFocus={() => {
              if (!state.disabled) {
                onPreview(handle.axis, handle.target, sizeModeRef.current);
              }
            }}
            onBlur={onPreviewClear}
            onClick={(event) => {
              event.stopPropagation();
              onPreviewClear();
              onAlign(handle.axis, handle.target, event.altKey || sizeModeRef.current);
            }}
          />
        );
      })}
      {overlay.spreads.map((dot) => {
        const disabled = sizeMode ? dot.gapDisabled : dot.disabled;
        const title = sizeMode ? dot.gapTitle : dot.title;
        return (
          <button
            key={dot.key}
            className={`align-spread axis-${dot.axis} ${disabled ? "disabled" : ""} ${!sizeMode && dot.aligned ? "aligned" : ""}`}
            style={{ left: dot.x, top: dot.y, "--spread-angle": `${dot.angle}deg` } as CSSProperties}
            aria-label={title}
            title={title}
            disabled={disabled}
            onMouseEnter={(event) => {
              if (!event.altKey && !sizeModeRef.current && !dot.disabled && !gapField) onPreview(dot.axis, "center", false, { gap: null });
            }}
            onMouseLeave={() => {
              if (!gapField) onPreviewClear();
            }}
            onFocus={() => {
              if (!sizeModeRef.current && !dot.disabled && !gapField) onPreview(dot.axis, "center", false, { gap: null });
            }}
            onBlur={() => {
              if (!gapField) onPreviewClear();
            }}
            onClick={(event) => {
              event.stopPropagation();
              onPreviewClear();
              if (event.altKey || sizeModeRef.current) {
                setGapField({ axis: dot.axis, x: dot.x, y: dot.y });
                const gap = typedGap(gapText);
                if (gap !== null) onPreview(dot.axis, "center", false, { gap });
                return;
              }
              setGapField(null);
              onAlign(dot.axis, "center", false, { gap: null });
            }}
          >
            <svg className="align-spread-icon" viewBox="0 0 24 12" aria-hidden="true">
              <path d="M2 1v10M22 1v10" />
              <rect x="9" y="3" width="6" height="6" rx="1" />
              <path d="M4 6h3M17 6h3" />
            </svg>
          </button>
        );
      })}
      <button
        type="button"
        className={`align-size-toggle ${sizePinned ? "on" : ""}`}
        aria-pressed={sizePinned}
        title={t("align.sizeSwitchTitle")}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          onPreviewClear();
          pinnedRef.current = !pinnedRef.current;
          setSizePinned(pinnedRef.current);
          refreshSizeMode();
        }}
      >
        {t("align.sizeSwitch")}
      </button>
      {gapField ? (
        <form
          className="align-gap-field"
          style={{ left: gapField.x, top: gapField.y }}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          onSubmit={(event) => {
            event.preventDefault();
            applyGap();
          }}
        >
          <label>
            <span>{t("align.gapLabel")}</span>
            <input
              ref={gapInputRef}
              type="text"
              inputMode="decimal"
              value={gapText}
              aria-label={t("align.gapLabel")}
              onChange={(event) => {
                setGapText(event.target.value);
                const gap = typedGap(event.target.value);
                if (gap === null) onPreviewClear();
                else onPreview(gapField.axis, "center", false, { gap });
              }}
              onKeyDown={(event) => {
                // Esc closes only the field, not the align tool; other keys stay in the field.
                event.stopPropagation();
                if (event.key === "Escape") {
                  event.preventDefault();
                  closeGapField();
                }
              }}
            />
            <span className="align-gap-unit">{currentLengthUnitLabel()}</span>
          </label>
          <button type="submit" disabled={typedGap(gapText) === null}>{t("align.gapApply")}</button>
          <button type="button" className="align-gap-close" aria-label={t("align.gapCancel")} title={t("align.gapCancel")} onClick={closeGapField}>×</button>
          <GuideHelpLink section="alignSpread" iconSize={16} />
        </form>
      ) : null}
    </div>
  );
}

export function MirrorOverlay({
  overlay,
  onMirror,
  onPreview,
  onPreviewClear,
}: {
  overlay: MirrorOverlayState;
  onMirror: (axis: AlignAxis) => void;
  onPreview: (axis: AlignAxis) => void;
  onPreviewClear: () => void;
}) {
  return (
    <div className="mirror-overlay" aria-label={t("aria.mirrorHandles")}>
      <svg className="mirror-guides" width="100%" height="100%" aria-hidden="true">
        {overlay.guides.map((guide) => (
          <line key={guide.key} x1={guide.x1} y1={guide.y1} x2={guide.x2} y2={guide.y2} />
        ))}
      </svg>
      {overlay.handles.map((handle) => (
        <button
          key={handle.key}
          className={`mirror-handle axis-${handle.axis}`}
          style={{ left: handle.x, top: handle.y, "--mirror-angle": `${handle.angle}deg` } as CSSProperties}
          aria-label={handle.title}
          title={handle.title}
          onMouseEnter={() => onPreview(handle.axis)}
          onMouseLeave={onPreviewClear}
          onFocus={() => onPreview(handle.axis)}
          onBlur={onPreviewClear}
          onClick={(event) => {
            event.stopPropagation();
            onPreviewClear();
            onMirror(handle.axis);
          }}
        >
          <svg className="mirror-handle-icon" viewBox="0 0 64 24" aria-hidden="true">
            <path d="M11 12h42" />
            <path d="m19 4-8 8 8 8" />
            <path d="m45 4 8 8-8 8" />
          </svg>
        </button>
      ))}
    </div>
  );
}
