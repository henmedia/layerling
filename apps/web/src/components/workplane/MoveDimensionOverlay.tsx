"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { moveDimensionAxisName, type MoveDimensionAxis, type MoveDimensionOverlayData } from "@/lib/moveDimensionLines";
import { selectWholeValue } from "@/lib/numberField";
import { t } from "@/lib/i18n";
import { useTouchSecondTap } from "@/lib/touchSecondTap";

export function MoveDimensionOverlay({
  overlay,
  active,
  onCommit,
}: {
  overlay: MoveDimensionOverlayData;
  active: boolean;
  onCommit: (axis: MoveDimensionAxis, value: string) => void;
}) {
  const [editing, setEditing] = useState<{ axis: MoveDimensionAxis; value: string } | null>(null);
  const nextEditingAxisRef = useRef<MoveDimensionAxis | null>(null);
  const cancelEditRef = useRef(false);

  useEffect(() => {
    if (active) {
      setEditing(null);
    }
  }, [active]);

  const { armed, accept } = useTouchSecondTap();

  const stopPointerPropagation = (event: PointerEvent<HTMLElement>) => {
    event.stopPropagation();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.blur();
    } else if (event.key === "Escape") {
      event.preventDefault();
      cancelEditRef.current = true;
      event.currentTarget.blur();
    } else if (event.key === "Tab" && overlay.lines.length > 1) {
      event.preventDefault();
      const currentIndex = overlay.lines.findIndex((line) => line.axis === editing?.axis);
      const direction = event.shiftKey ? -1 : 1;
      const nextIndex = (currentIndex + direction + overlay.lines.length) % overlay.lines.length;
      nextEditingAxisRef.current = overlay.lines[nextIndex].axis;
      event.currentTarget.blur();
    }
  };

  const styleForLine = (line: MoveDimensionOverlayData["lines"][number]) => ({
    "--overlay-x": `${line.labelX}px`,
    "--overlay-y": `${line.labelY}px`,
  }) as CSSProperties;

  return (
    <div className={`move-dimension-overlay ${active ? "active" : "settled"}`} aria-label={t("aria.moveDimensions")}>
      {overlay.lines.map((line) => {
        if (editing?.axis === line.axis) {
          return (
            <input
              key={`edit-${line.axis}`}
              className="dimension-input move-dimension-input"
              aria-label={t("aria.axisMovement", { axis: moveDimensionAxisName(line.axis) })}
              value={editing.value}
              autoFocus
              inputMode="text"
              spellCheck={false}
              style={styleForLine(line)}
              onFocus={(event) => selectWholeValue(event.currentTarget)}
              onChange={(event) => setEditing({ axis: line.axis, value: event.target.value })}
              onBlur={() => {
                const nextAxis = nextEditingAxisRef.current;
                nextEditingAxisRef.current = null;
                if (!cancelEditRef.current) {
                  onCommit(line.axis, editing.value);
                }
                cancelEditRef.current = false;
                const nextLine = nextAxis ? overlay.lines.find((candidate) => candidate.axis === nextAxis) : null;
                setEditing(nextLine ? { axis: nextLine.axis, value: nextLine.label } : null);
              }}
              onKeyDown={handleKeyDown}
              onPointerDown={stopPointerPropagation}
              onContextMenu={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
            />
          );
        }

        return active ? (
          <span
            key={line.axis}
            className="dimension-label move-dimension-value"
            style={styleForLine(line)}
          >
            {line.label}
          </span>
        ) : (
          <button
            key={line.axis}
            className={armed === line.axis ? "dimension-label move-dimension-value armed" : "dimension-label move-dimension-value"}
            type="button"
            aria-label={t("aria.axisMovement", { axis: moveDimensionAxisName(line.axis) })}
            style={styleForLine(line)}
            onClick={() => { if (accept(line.axis)) setEditing({ axis: line.axis, value: line.label }); }}
            onPointerDown={stopPointerPropagation}
            onContextMenu={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
          >
            {line.label}
          </button>
        );
      })}
    </div>
  );
}
