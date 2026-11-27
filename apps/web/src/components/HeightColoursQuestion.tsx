"use client";

import { useCallback, useState } from "react";
import { X } from "lucide-react";
import { t } from "@/lib/i18n";
import { currentLengthUnitLabel, formatLengthMm } from "@/lib/measurementUnits";
import type { HeightColourQuestion } from "@/lib/modelImport";

/**
 * The question a 3MF with colour changes by height brings (Discussion #2108): cut it at those heights into a body per
 * colour, or keep it in one piece as before. `ask` waits for the answer; `dialog` is put in the page while it is asked.
 * Escape and the close button keep it in one piece.
 */
export function useHeightColoursQuestion() {
  const [pending, setPending] = useState<{ question: HeightColourQuestion; resolve: (cut: boolean) => void } | null>(null);
  const ask = useCallback((question: HeightColourQuestion) => new Promise<boolean>((resolve) => setPending({ question, resolve })), []);
  const answer = (cut: boolean) => {
    pending?.resolve(cut);
    setPending(null);
  };
  const heights = pending
    ? pending.question.heights.map((height) => `${formatLengthMm(height, 2).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "")} ${currentLengthUnitLabel()}`).join(", ")
    : "";
  const dialog = pending ? (
    <section
      className="dashboard-confirm-overlay"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="height-colours-title"
      aria-describedby="height-colours-body"
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        event.stopPropagation();
        answer(false);
      }}
    >
      <div className="dashboard-confirm-dialog height-colours-dialog">
        <header>
          <strong id="height-colours-title">{t("heightColours.title")}</strong>
          <button type="button" aria-label={t("heightColours.keep")} onClick={() => answer(false)}>
            <X size={18} />
          </button>
        </header>
        <p id="height-colours-body">{t("heightColours.ask", { name: pending.question.fileName, heights })}</p>
        <div className="height-colours-swatches" aria-hidden="true">
          {pending.question.colors.map((color, index) => (
            <span key={`${color}-${index}`} className="height-colours-swatch" style={{ background: color }} />
          ))}
        </div>
        <div className="dashboard-confirm-actions">
          <button className="dashboard-confirm-cancel" type="button" data-testid="height-colours-keep" onClick={() => answer(false)}>
            {t("heightColours.keep")}
          </button>
          <button className="dashboard-confirm-save" type="button" autoFocus data-testid="height-colours-cut" onClick={() => answer(true)}>
            {t("heightColours.cut")}
          </button>
        </div>
      </div>
    </section>
  ) : null;
  return { ask, dialog };
}
