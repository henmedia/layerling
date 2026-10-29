import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { AlignAxis, AlignHandleStatus, AlignTarget } from "@/types/layerling";
import { t } from "@/lib/i18n";

export type AlignOverlayState = {
  guides: Array<{ key: string; x1: number; y1: number; x2: number; y2: number }>;
  handles: Array<AlignHandleStatus & { key: string; x: number; y: number }>;
};

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
  onAlign: (axis: AlignAxis, target: AlignTarget, size: boolean) => void;
  onPreview: (axis: AlignAxis, target: AlignTarget, size: boolean) => void;
  onPreviewClear: () => void;
}) {
  // Alt turns the dots into squares that stretch the parts instead of moving them (#998). Pressing or
  // letting go of it over a dot shows the other preview at once.
  const [sizeMode, setSizeMode] = useState(false);
  const hovered = useRef<{ axis: AlignAxis; target: AlignTarget } | null>(null);
  const sizeModeRef = useRef(false);
  const previewRef = useRef(onPreview);
  previewRef.current = onPreview;

  useEffect(() => {
    const change = (next: boolean) => {
      if (sizeModeRef.current === next) return;
      sizeModeRef.current = next;
      setSizeMode(next);
      if (hovered.current) previewRef.current(hovered.current.axis, hovered.current.target, next);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Alt") return;
      // A lone Alt would otherwise take the focus to the browser's menu.
      event.preventDefault();
      change(event.type === "keydown");
    };
    const onPointer = (event: PointerEvent) => change(event.altKey);
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
              const size = event.altKey && Boolean(handle.size);
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
              onAlign(handle.axis, handle.target, event.altKey);
            }}
          />
        );
      })}
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
