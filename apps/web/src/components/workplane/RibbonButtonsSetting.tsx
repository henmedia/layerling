"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { GuideHelpLink } from "@/components/GuideHelpLink";
import { t } from "@/lib/i18n";
import { ribbonGroupKey, ribbonLayout, setRibbonEntryShown, useRibbonHidden, writeRibbonHidden } from "@/lib/ribbonHidden";
import { isDefaultRibbonOrder, moveRibbonGroupPast, readRibbonOrder, type RibbonGroupName, useRibbonOrder, writeRibbonOrder } from "@/lib/ribbonOrder";

/**
 * "Buttons in the ribbon" in the settings window (Discussion #1519, #1087, #1502): every group of the 3D ribbon folds open to
 * a list of its buttons, each with a tick, and two arrows move the group up or down the ribbon. What is taken out leaves
 * the ribbon only; the command search and the keys still run it.
 */
export function RibbonButtonsSetting() {
  const hidden = useRibbonHidden();
  const order = useRibbonOrder();
  const layout = ribbonLayout();
  if (layout.length === 0) return null;
  return (
    <div className="ribbon-buttons-setting" data-help={t("workspace.ribbonButtons")}>
      <div className="workspace-toggle ribbon-buttons-head">
        <span className="workspace-toggle-copy">
          <span>
            {t("workspace.ribbonButtons")} <GuideHelpLink section="ribbonButtons" iconSize={14} />
          </span>
          <small>{t("workspace.ribbonButtonsHint")}</small>
        </span>
        <span className="ribbon-buttons-head-actions">
          <button type="button" className="make-default-button" disabled={hidden.size === 0} onClick={() => writeRibbonHidden([])}>
            {t("workspace.ribbonShowAll")}
          </button>
          <button type="button" className="make-default-button" disabled={isDefaultRibbonOrder(order)} onClick={() => writeRibbonOrder([])}>
            {t("workspace.ribbonResetOrder")}
          </button>
        </span>
      </div>
      {layout.map((group, index) => {
        const groupShown = !hidden.has(ribbonGroupKey(group.group));
        const shown = group.tools.filter((tool) => !hidden.has(tool.id)).length;
        return (
          <details className="ribbon-buttons-group" key={group.group}>
            <summary>
              <span>{group.label}</span>
              <small>
                {groupShown
                  ? t("workspace.ribbonGroupCount", { shown, total: group.tools.length })
                  : t("workspace.ribbonGroupHidden")}
              </small>
              {[-1, 1].map((step) => {
                const neighbour = layout[index + step];
                return (
                  <button
                    type="button"
                    key={step}
                    className="ribbon-buttons-move"
                    disabled={!neighbour}
                    aria-label={t(step === -1 ? "workspace.ribbonMoveUp" : "workspace.ribbonMoveDown", { group: group.label })}
                    title={t(step === -1 ? "workspace.ribbonMoveUp" : "workspace.ribbonMoveDown", { group: group.label })}
                    onClick={(event) => {
                      // The arrows sit in the summary: a click on them must not fold the group open or shut.
                      event.preventDefault();
                      event.stopPropagation();
                      if (neighbour) writeRibbonOrder(moveRibbonGroupPast(readRibbonOrder(), group.group as RibbonGroupName, neighbour.group as RibbonGroupName, step as -1 | 1));
                    }}
                  >
                    {step === -1 ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                );
              })}
            </summary>
            <label className="workspace-toggle ribbon-buttons-row">
              <span className="workspace-toggle-copy">
                <span>{t("workspace.ribbonGroupShown")}</span>
              </span>
              <input
                type="checkbox"
                checked={groupShown}
                onChange={(event) => setRibbonEntryShown(ribbonGroupKey(group.group), event.currentTarget.checked)}
              />
            </label>
            <div className="ribbon-buttons-tools" aria-disabled={!groupShown}>
              {group.tools.map((tool) => (
                <label className={`workspace-toggle ribbon-buttons-row${groupShown ? "" : " is-disabled"}`} key={tool.id}>
                  <span className="workspace-toggle-copy">
                    <span>{tool.label}</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={!hidden.has(tool.id)}
                    disabled={!groupShown}
                    onChange={(event) => setRibbonEntryShown(tool.id, event.currentTarget.checked)}
                  />
                </label>
              ))}
            </div>
          </details>
        );
      })}
    </div>
  );
}
