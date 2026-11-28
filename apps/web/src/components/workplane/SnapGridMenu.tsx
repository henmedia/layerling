"use client";

import { Fragment, useEffect, useLayoutEffect, useRef, useState, type Dispatch, type KeyboardEvent as ReactKeyboardEvent, type SetStateAction } from "react";
import { createPortal } from "react-dom";
import { GuideHelpLink } from "@/components/GuideHelpLink";
import { t } from "@/lib/i18n";
import { measurementOptionLabel } from "@/lib/measurementUnits";
import { customSnapGridLabel, snapGridOptions, snapGridOptionsForUnits } from "@/lib/workplaneSettings";
import type { CustomSnapGrid, GridSize } from "@/types/layerling";

type SnapGridMenuProps = {
  units: string;
  /** The user's own snap measures, listed after the fixed steps. */
  customGrids?: CustomSnapGrid[];
  snap: GridSize;
  /** Only the 3D editor passes these: snapping to other shapes, switched in the same menu. */
  objectSnap?: boolean;
  onObjectSnapChange?: (enabled: boolean) => void;
};

/**
 * The steps of the snap menu and the switch for snapping to other shapes: the same in the menu under the snap
 * field and in the one a middle click opens at the pointer. A line parts the user's own steps from the fixed ones
 * (Discussion #2122). Only the steps scroll in a long menu; the switch below them stays in sight.
 */
export function SnapGridMenuItems({ units, customGrids, snap, objectSnap, onObjectSnapChange, onPick }: SnapGridMenuProps & { onPick: (size: GridSize) => void }) {
  const label = (size: GridSize) => customSnapGridLabel(size, customGrids) ?? measurementOptionLabel(size);
  const fixedCount = snapGridOptionsForUnits(units).length;
  return (
    <>
      <div className="snap-menu-steps">
        {snapGridOptions(units, customGrids).map((size, index) => (
          <Fragment key={size}>
            {index === fixedCount ? <div className="snap-menu-separator" role="separator" /> : null}
            <button type="button" className={size === snap ? "selected" : ""} onClick={() => onPick(size)}>
              {label(size)}
            </button>
          </Fragment>
        ))}
      </div>
      {onObjectSnapChange ? (
        <label className="snap-object-toggle" title={t("inspector.objectSnapHint")}>
          <input type="checkbox" checked={Boolean(objectSnap)} onChange={(event) => onObjectSnapChange(event.target.checked)} />
          <span>{t("inspector.objectSnap")}</span>
        </label>
      ) : null}
    </>
  );
}

/**
 * The snap menu at the pointer, opened by a short click with the middle mouse button on the view (Discussion #1439),
 * as AutoCAD opens its object snap menu there. It opens when the button is let go and stays open until a step is
 * picked, a press lands outside it, Escape is pressed, the wheel turns outside it or the window changes. It stays
 * inside the window, and the step in use has the focus, so the arrow keys and Enter can pick another. Its title row
 * has the same millimetre/inch switch as the snap field (Discussion #1933): switching keeps the menu open with the
 * steps of the other unit.
 */
export function SnapGridPointerMenu({ x, y, onSnapChange, onClose, onUnitsChange, ...menu }: SnapGridMenuProps & {
  x: number;
  y: number;
  onSnapChange: Dispatch<SetStateAction<GridSize>>;
  /** Switches between millimetres and inches, as the switch beside the snap field does (#422). */
  onUnitsChange?: (units: string) => void;
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: x, top: y });

  useLayoutEffect(() => {
    const element = menuRef.current;
    if (!element) return;
    const margin = 8;
    const { width, height } = element.getBoundingClientRect();
    setPosition({
      left: Math.max(margin, Math.min(x, window.innerWidth - width - margin)),
      top: Math.max(margin, Math.min(y, window.innerHeight - height - margin)),
    });
    (element.querySelector<HTMLButtonElement>("button.selected") ?? element.querySelector<HTMLButtonElement>("button"))?.focus({ preventScroll: true });
  }, [x, y, menu.units]);

  useEffect(() => {
    const outside = (event: Event) => !menuRef.current?.contains(event.target as Node);
    const closeOutside = (event: PointerEvent) => {
      if (outside(event)) onClose();
    };
    // The wheel over the menu scrolls a long one; only the wheel elsewhere closes it.
    const closeOnWheel = (event: WheelEvent) => {
      if (outside(event)) onClose();
    };
    const closeOnKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
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

  return createPortal(
    <div
      ref={menuRef}
      className="snap-menu snap-menu-at-pointer"
      aria-label={t("inspector.snapGrid")}
      style={position}
      onKeyDown={moveFocus}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className="snap-menu-title">
        <span>{t("inspector.snapGrid")}</span>
        {onUnitsChange ? (
          <span className="snap-units" role="group" aria-label={t("inspector.unitsSwitch")} title={t("inspector.unitsSwitch")}>
            <button type="button" data-help={t("inspector.unitsSwitch")} aria-pressed={menu.units === "Metric (Default)"} onClick={() => onUnitsChange("Metric (Default)")}>mm</button>
            <button type="button" data-help={t("inspector.unitsSwitch")} aria-pressed={menu.units === "Imperial"} onClick={() => onUnitsChange("Imperial")}>in</button>
          </span>
        ) : null}
        <GuideHelpLink section="gridAndSnapping" iconSize={14} />
      </div>
      <SnapGridMenuItems
        {...menu}
        onPick={(size) => {
          onSnapChange(size);
          onClose();
        }}
      />
    </div>,
    document.body,
  );
}
