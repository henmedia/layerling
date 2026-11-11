"use client";

import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Archive, ShieldAlert, ShieldCheck } from "lucide-react";
import { GuideHelpLink } from "@/components/GuideHelpLink";
import { t } from "@/lib/i18n";
import type { BackupNoteState } from "@/lib/backupState";
import type { BackupUrgency } from "@/lib/fileBackupRules";
import { askToKeepBackups } from "@/lib/fileBackups";

export type DesignTab<Id extends string> = {
  id: Id;
  label: string;
  /** Designs in this place, shown on the heading when it is the only one. */
  count: number;
  /** Something dragged over the tab that it would take, such as a design on its way to the server. */
  dropTarget?: boolean;
  /** Drag handlers, for a tab that takes a dropped design. */
  dropProps?: ButtonHTMLAttributes<HTMLButtonElement>;
};

/**
 * The designs, under one heading, with a tab for each place they are kept: the server and this
 * browser, each with its count. With one place only there are no tabs. The controls that work on
 * the open tab sit on the tabs' line, to the right; they are the same on every tab.
 */
export function DesignTabs<Id extends string>({ tabs, active, onSelect, children }: {
  tabs: DesignTab<Id>[];
  active: Id;
  onSelect: (id: Id) => void;
  children: ReactNode;
}) {
  return (
    <>
      <h1 className="design-tabs-heading">
        {/* One place: its count goes on the heading, there is no tab to carry it. */}
        {tabs.length === 1 ? t("dashboard.designsCount", { count: tabs[0].count }) : t("dashboard.projects")}
      </h1>
      <div className="dashboard-section-header design-tabs-header">
        {tabs.length > 1 ? (
          <div className="design-tabs" role="tablist" aria-label={t("dashboard.projects")}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`design-tab${tab.id === active ? " active" : ""}${tab.dropTarget ? " drop-target" : ""}`}
                type="button"
                role="tab"
                aria-selected={tab.id === active}
                onClick={() => onSelect(tab.id)}
                {...tab.dropProps}
              >
                {tab.label}
              </button>
            ))}
          </div>
        ) : <span />}
        <div className="dashboard-controls">{children}</div>
      </div>
    </>
  );
}

/**
 * Over the browser's designs: they live nowhere else, so a notice says where they stand - not backed up yet, changed
 * since the last backup (both in orange), or all in the last backup, a calm grey line then. `when` is that backup's
 * day and time. The longer the last backup lies back, the louder it gets (`urgency`): with a button to back up now
 * once it is overdue, and in red when there has been none with several designs, or none for a month.
 */
export function BrowserBackupNote({ state, when, urgency = "changed", days = 0, count = 0, onBackUpNow }: {
  state: BackupNoteState;
  when: string;
  urgency?: BackupUrgency;
  days?: number;
  count?: number;
  onBackUpNow?: () => void;
}) {
  const button = t("dashboard.backupAll");
  const loud = urgency === "overdue" || urgency === "urgent";
  const text = loud
    ? state.kind === "never"
      ? t("storageNotice.urgentNever", { count })
      : t(urgency === "urgent" ? "storageNotice.urgentDays" : "storageNotice.overdue", { days, when })
    : state.kind === "never"
      ? t("storageNotice.line", { button })
      : state.kind === "changed"
        ? t("storageNotice.changed", { when, count: state.count, button })
        : t("storageNotice.current", { when });
  const Icon = state.kind === "current" ? ShieldCheck : ShieldAlert;
  const level = state.kind === "current" ? " backed-up" : loud ? ` ${urgency}` : "";
  return (
    <p className={`browser-backup-note${level}`} role={loud ? "alert" : undefined}>
      <Icon size={24} aria-hidden="true" />
      <span>{text}</span>
      {loud && onBackUpNow ? (
        <button type="button" className="browser-backup-now" onClick={onBackUpNow}>
          <Archive size={16} aria-hidden="true" />
          <span>{t("backups.backUpNow")}</span>
        </button>
      ) : null}
      <GuideHelpLink chapter="files" section="yourBackup" className="browser-backup-help" iconSize={18} />
    </p>
  );
}

const YOUR_BACKUP_SEEN_KEY = "layerling.yourBackupCardSeen";

/**
 * "Your designs, your backup": said once, kindly and plainly - layerling keeps the designs in this browser, and as
 * with all data, only a copy in a second place is safe; looking after that copy is up to the user. Gone with
 * "Understood", and in the guide for good.
 */
export function YourBackupCard({ onBackUpNow }: { onBackUpNow?: () => void }) {
  const [seen, setSeen] = useState(true);
  useEffect(() => {
    try {
      setSeen(window.localStorage.getItem(YOUR_BACKUP_SEEN_KEY) === "1");
    } catch {
      setSeen(false);
    }
  }, []);
  if (seen) return null;
  const close = () => {
    // A click about backups: the moment to ask the browser to keep this site's storage (Firefox asks the user).
    askToKeepBackups();
    setSeen(true);
    try {
      window.localStorage.setItem(YOUR_BACKUP_SEEN_KEY, "1");
    } catch {
      // Without storage it comes again next time, which does no harm.
    }
  };
  return (
    <section className="your-backup-card" aria-label={t("yourBackup.title")}>
      <ShieldAlert size={28} aria-hidden="true" />
      <div>
        <strong>
          {t("yourBackup.title")}
          <GuideHelpLink chapter="files" section="yourBackup" iconSize={16} />
        </strong>
        <p>{t("yourBackup.body", { button: t("dashboard.backupAll") })}</p>
        <div className="your-backup-actions">
          {onBackUpNow ? (
            <button
              type="button"
              className="your-backup-now"
              onClick={() => {
                onBackUpNow();
                close();
              }}
            >
              <Archive size={16} aria-hidden="true" />
              <span>{t("backups.backUpNow")}</span>
            </button>
          ) : null}
          <button type="button" onClick={close}>{t("yourBackup.understood")}</button>
        </div>
      </div>
    </section>
  );
}
