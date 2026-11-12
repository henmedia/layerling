"use client";

import { RefreshCw } from "lucide-react";
import { highlightsAfter } from "@/lib/newVersionWatch";
import { localizedText, t } from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";
import { useNewVersionNotice } from "@/lib/useNewVersionNotice";

const RUNNING_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "";

/**
 * Shown when layerling was updated while this page was open: what the old page loads from now on
 * may not fit what it started with. The open design is saved and comes back after the reload.
 */
export function NewVersionNotice() {
  const language = useLanguage();
  const { latest, reason, later, reload, reloadAnyway, state } = useNewVersionNotice();
  if (!latest) return null;
  const news = highlightsAfter(RUNNING_VERSION, latest).slice(0, 4);
  return (
    <div className="new-version-notice" role="alertdialog" aria-labelledby="new-version-title" aria-describedby="new-version-body">
      <strong id="new-version-title">{reason === "mismatch" ? t("newVersion.titleMismatch") : t("newVersion.title")}</strong>
      <p id="new-version-body">{reason === "mismatch" ? t("newVersion.bodyMismatch") : t("newVersion.body", { current: RUNNING_VERSION, latest: latest.version })}</p>
      {news.length > 0 ? (
        <ul>
          {news.map((entry) => (
            <li key={`${entry.version}-${entry.title.en}`}>{localizedText(entry.title, language)}</li>
          ))}
        </ul>
      ) : null}
      {/* The open design could not be stored (#1639): reloading now would lose its newest changes. */}
      {state === "notSaved" ? <p className="new-version-notice-unsaved" role="alert">{t("newVersion.notSaved")}</p> : null}
      <div className="new-version-notice-actions">
        <button type="button" className="secondary" onClick={later}>{t("newVersion.later")}</button>
        {state === "notSaved" ? (
          <button type="button" className="danger" onClick={reloadAnyway}>
            <RefreshCw size={16} aria-hidden="true" />
            {t("newVersion.reloadAnyway")}
          </button>
        ) : (
          <button type="button" className="primary" disabled={state === "saving"} onClick={() => void reload()}>
            <RefreshCw size={16} aria-hidden="true" />
            {t("newVersion.reload")}
          </button>
        )}
      </div>
    </div>
  );
}
