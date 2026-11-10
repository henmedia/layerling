"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { GuideHelpLink } from "@/components/GuideHelpLink";
import { t } from "@/lib/i18n";
import type { BackupNoteState } from "@/lib/backupState";

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
 * day and time.
 */
export function BrowserBackupNote({ state, when }: { state: BackupNoteState; when: string }) {
  const button = t("dashboard.backupAll");
  const text = state.kind === "never"
    ? t("storageNotice.line", { button })
    : state.kind === "changed"
      ? t("storageNotice.changed", { when, count: state.count, button })
      : t("storageNotice.current", { when });
  const Icon = state.kind === "current" ? ShieldCheck : ShieldAlert;
  return (
    <p className={`browser-backup-note${state.kind === "current" ? " backed-up" : ""}`}>
      <Icon size={24} aria-hidden="true" />
      <span>{text}</span>
      <GuideHelpLink chapter="files" section="backingUp" className="browser-backup-help" iconSize={18} />
    </p>
  );
}
