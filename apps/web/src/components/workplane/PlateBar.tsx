"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, LayoutGrid, Maximize2, Pencil, Plus, Trash2, X } from "lucide-react";
import { t } from "@/lib/i18n";
import { MAX_BUILD_PLATES } from "@/lib/buildPlateNames";
import { GuideHelpLink } from "@/components/GuideHelpLink";

export type PlateBarPlate = {
  /** What the plate is called on its chip: "Plate 2" or "Plate 2: Lid". */
  label: string;
  /** Its own name, "" when it has none. */
  name: string;
  /** How many bodies stand on it. */
  bodies: number;
  /** How many of them reach past it or above the build height. */
  overhangs: number;
};

/**
 * The bar of build plates (Discussion #456) at the foot of the view: one chip per plate, the active one
 * lit. A click on a chip looks at that plate and makes it the one new shapes land on; the tools beside it
 * act on the active plate. "Arrange" lays the selection, or all bodies, out on the plates.
 */
export function PlateBar({
  plates,
  active,
  selectionCount,
  disabled,
  onSelect,
  onAdd,
  onShowAll,
  onRename,
  onMove,
  onRemove,
  onArrange,
  onClose,
}: {
  plates: readonly PlateBarPlate[];
  active: number;
  selectionCount: number;
  disabled?: boolean;
  onSelect: (index: number) => void;
  onAdd: () => void;
  onShowAll: () => void;
  onRename: (index: number, name: string) => void;
  onMove: (index: number, to: number) => void;
  onRemove: (index: number) => void;
  onArrange: () => void;
  onClose: () => void;
}) {
  const [renaming, setRenaming] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (renaming !== null) inputRef.current?.select();
  }, [renaming]);
  // A plate removed or moved away while its name was being typed: the field closes.
  useEffect(() => {
    if (renaming !== null && renaming >= plates.length) setRenaming(null);
  }, [plates.length, renaming]);

  const startRename = (index: number) => {
    setDraft(plates[index]?.name ?? "");
    setRenaming(index);
  };
  const finishRename = (keep: boolean) => {
    if (renaming !== null && keep) onRename(renaming, draft);
    setRenaming(null);
  };
  const full = plates.length >= MAX_BUILD_PLATES;
  const activePlate = plates[active];

  return (
    <div className="plate-bar" role="toolbar" aria-label={t("plates.bar")} data-help={t("plates.barHint")}>
      <div className="plate-bar-chips" role="tablist" aria-label={t("plates.bar")}>
        {plates.map((plate, index) => (
          renaming === index ? (
            <input
              key={`rename-${index}`}
              ref={inputRef}
              className="plate-bar-rename"
              value={draft}
              maxLength={60}
              placeholder={t("plates.namePlaceholder")}
              aria-label={t("plates.rename")}
              onChange={(event) => setDraft(event.currentTarget.value)}
              onBlur={() => finishRename(true)}
              onKeyDown={(event) => {
                if (event.key === "Enter") finishRename(true);
                if (event.key === "Escape") finishRename(false);
                event.stopPropagation();
              }}
            />
          ) : (
            <button
              key={index}
              type="button"
              role="tab"
              aria-selected={index === active}
              className={`plate-bar-chip ${index === active ? "active" : ""} ${plate.overhangs > 0 ? "has-overhangs" : ""}`}
              title={plate.overhangs > 0 ? t("plates.chipOverhangs", { label: plate.label, count: plate.bodies, overhangs: plate.overhangs }) : t("plates.chipHint", { label: plate.label, count: plate.bodies })}
              disabled={disabled}
              onClick={() => onSelect(index)}
              onDoubleClick={() => startRename(index)}
            >
              <span className="plate-bar-chip-label">{plate.label}</span>
              <span className="plate-bar-chip-count" aria-hidden="true">{plate.bodies}</span>
            </button>
          )
        ))}
        <button
          type="button"
          className="plate-bar-icon"
          aria-label={t("plates.add")}
          title={full ? t("plates.full", { max: MAX_BUILD_PLATES }) : t("plates.addHint")}
          disabled={disabled || full}
          onClick={onAdd}
        >
          <Plus size={17} strokeWidth={2.3} aria-hidden="true" />
        </button>
      </div>
      <span className="plate-bar-separator" aria-hidden="true" />
      <div className="plate-bar-tools">
        <button type="button" className="plate-bar-icon" aria-label={t("plates.rename")} title={t("plates.rename")} disabled={disabled || !activePlate} onClick={() => startRename(active)}>
          <Pencil size={16} strokeWidth={2.2} aria-hidden="true" />
        </button>
        <button type="button" className="plate-bar-icon" aria-label={t("plates.moveLeft")} title={t("plates.moveLeft")} disabled={disabled || active <= 0} onClick={() => onMove(active, active - 1)}>
          <ChevronLeft size={17} strokeWidth={2.3} aria-hidden="true" />
        </button>
        <button type="button" className="plate-bar-icon" aria-label={t("plates.moveRight")} title={t("plates.moveRight")} disabled={disabled || active >= plates.length - 1} onClick={() => onMove(active, active + 1)}>
          <ChevronRight size={17} strokeWidth={2.3} aria-hidden="true" />
        </button>
        <button type="button" className="plate-bar-icon" aria-label={t("plates.remove")} title={plates.length <= 1 ? t("plates.removeLast") : t("plates.remove")} disabled={disabled || plates.length <= 1} onClick={() => onRemove(active)}>
          <Trash2 size={16} strokeWidth={2.2} aria-hidden="true" />
        </button>
        <span className="plate-bar-separator" aria-hidden="true" />
        <button type="button" className="plate-bar-icon" aria-label={t("plates.showAll")} title={t("plates.showAll")} disabled={disabled} onClick={onShowAll}>
          <Maximize2 size={16} strokeWidth={2.2} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="plate-bar-text"
          title={t("plates.arrangeHint")}
          disabled={disabled}
          onClick={() => onArrange()}
        >
          <LayoutGrid size={16} strokeWidth={2.2} aria-hidden="true" />
          <span>{selectionCount > 0 ? t("plates.arrangeSelected", { count: selectionCount }) : t("plates.arrange")}</span>
        </button>
        <GuideHelpLink section="buildPlates" className="plate-bar-help" iconSize={17} />
        <button type="button" className="plate-bar-icon" aria-label={t("plates.closeBar")} title={t("plates.closeBar")} onClick={onClose}>
          <X size={16} strokeWidth={2.2} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
