"use client";

import { Boxes } from "lucide-react";
import { t } from "@/lib/i18n";

/**
 * Tinkercad's round button in the lower left (#337): a tap on it locks Select multiple, and every
 * tap on a body then adds it to the selection or takes it out - what Shift does with a keyboard,
 * for a tablet that has none. A tap on the button again ends the mode and puts the button away; a
 * tap on empty space leaves both alone. The button is shown when a finger picks a body, and a
 * mouse never needs it.
 */
export function TouchMultiSelectButton({
  active,
  onToggle,
}: {
  active: boolean;
  onToggle: () => void;
}) {
  const label = t("contextMenu.selectMultiple");

  return (
    <button
      type="button"
      className={`touch-multi-select${active ? " active" : ""}`}
      aria-label={label}
      aria-pressed={active}
      title={label}
      // A tap here is the button's business, not the workplane's.
      onPointerDown={(event) => event.stopPropagation()}
      onClick={onToggle}
      onContextMenu={(event) => event.preventDefault()}
    >
      <Boxes size={26} strokeWidth={2} aria-hidden="true" />
    </button>
  );
}
