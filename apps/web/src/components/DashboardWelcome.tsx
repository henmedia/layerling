"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { WelcomeGuideBody } from "@/components/WelcomeGuide";
import { t } from "@/lib/i18n";

const HIDDEN_KEY = "layerling.welcomeHidden";

/**
 * Whether the welcome guide was closed with its cross. Remembered in this browser; null until it
 * has been read, so neither the guide nor the footer link to bring it back flashes up on load.
 */
export function useWelcomeHidden() {
  const [hidden, setHidden] = useState<boolean | null>(null);
  useEffect(() => {
    try {
      setHidden(window.localStorage.getItem(HIDDEN_KEY) === "1");
    } catch {
      setHidden(false);
    }
  }, []);
  const store = useCallback((value: boolean) => {
    setHidden(value);
    try {
      if (value) window.localStorage.setItem(HIDDEN_KEY, "1");
      else window.localStorage.removeItem(HIDDEN_KEY);
    } catch {
      // Without storage it stays closed for this visit only.
    }
  }, []);
  return { hidden, hide: () => store(true), show: () => store(false) };
}

/**
 * The short guide at the top of the start page. Open on a first visit, when there is nothing else
 * to look at, and folded to one line once designs exist; the cross puts it away for good, and the
 * footer link brings it back, open and in view.
 */
export function DashboardWelcome({ open, offline, onHide }: { open: boolean; offline: boolean; onHide: () => void }) {
  // The cross sits beside the fold, not in it: inside a closed <details> it would be hidden too.
  return (
    <div className="dashboard-welcome-frame" id="welcome">
      <details className="dashboard-welcome" open={open}>
        <summary className="dashboard-welcome-summary">
          <span className="dashboard-welcome-summary-title">{t("welcome.teaserTitle")}</span>
          <span className="dashboard-welcome-summary-hint">{t("welcome.teaserHint")}</span>
        </summary>
        <div className="dashboard-welcome-body">
          <WelcomeGuideBody tr={t} offline={offline} />
        </div>
      </details>
      <button className="dashboard-welcome-hide" type="button" aria-label={t("welcome.hide")} title={t("welcome.hide")} onClick={onHide}>
        <X size={18} />
      </button>
    </div>
  );
}
