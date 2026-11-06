import { useState } from "react";
import { fitTestLabel } from "@/lib/fitTest";
import { numberLocale, t } from "@/lib/i18n";
import { FIT_TEST_CLEARANCES, normalizePrinterPlay, setPrinterPlay } from "@/lib/printerPlay";
import { usePrinterPlay } from "@/lib/usePrinterPlay";

/**
 * The printer's play in the settings (printerPlay.ts): a field for the play per side in mm, empty while it is not
 * measured; the values the fit test is printed with, to pick the one read off it; and the button that puts the fit
 * test on the plate. Kept in this browser, so it is the same in every design.
 */
export function PrinterPlaySetting({ onMakeFitTest }: { onMakeFitTest?: () => void }) {
  const play = usePrinterPlay();
  // What is typed, until the field is left; then it is read, or what was there before comes back.
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? (play === null ? "" : play.toLocaleString(numberLocale(), { maximumFractionDigits: 3 }));
  const commit = (text: string) => {
    setDraft(null);
    if (!text.trim()) {
      setPrinterPlay(null);
      return;
    }
    const typed = normalizePrinterPlay(text);
    if (typed !== null) setPrinterPlay(typed);
  };
  return (
    <div className="workspace-select workspace-printer-play" data-help={t("workspace.printerPlay")}>
      <label htmlFor="workspace-printer-play-input">{t("workspace.printerPlay")}</label>
      <span className="workspace-printer-play-field">
        <input
          id="workspace-printer-play-input"
          type="text"
          inputMode="decimal"
          placeholder={t("workspace.printerPlayNone")}
          value={shown}
          onFocus={(event) => event.currentTarget.select()}
          onChange={(event) => setDraft(event.currentTarget.value)}
          onBlur={(event) => commit(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
            if (event.key === "Escape") setDraft(null);
          }}
        />
        <span>{t("workspace.printerPlayUnit")}</span>
      </span>
      <div className="workspace-printer-play-values" role="group" aria-label={t("workspace.printerPlayTested")}>
        {FIT_TEST_CLEARANCES.map((clearance) => {
          const active = play !== null && Math.abs(play - clearance) < 5e-4;
          return (
            <button
              key={clearance}
              type="button"
              className={`workspace-custom-snap-add${active ? " active" : ""}`}
              aria-pressed={active}
              onClick={() => {
                setDraft(null);
                setPrinterPlay(clearance);
              }}
            >
              {fitTestLabel(clearance)}
            </button>
          );
        })}
      </div>
      {onMakeFitTest ? (
        <button type="button" className="workspace-custom-snap-add workspace-printer-play-make" onClick={onMakeFitTest}>
          {t("workspace.fitTestMake")}
        </button>
      ) : null}
      <small>{t(play === null ? "workspace.printerPlayHint" : "workspace.printerPlaySetHint")}</small>
    </div>
  );
}
