"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import { GuideHelpLink } from "@/components/GuideHelpLink";
import { t } from "@/lib/i18n";

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

/** Over the browser's designs: they live nowhere else, so a notice says so. */
export function BrowserBackupNote() {
  return (
    <p className="browser-backup-note">
      <ShieldAlert size={24} aria-hidden="true" />
      <span>{t("storageNotice.line", { button: t("dashboard.backupAll") })}</span>
      <GuideHelpLink chapter="files" section="backingUp" className="browser-backup-help" iconSize={18} />
    </p>
  );
}
