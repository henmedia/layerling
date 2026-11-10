"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { GuideHelpLink } from "@/components/GuideHelpLink";
import { t } from "@/lib/i18n";
import { ribbonGroupKey, ribbonLayout, setRibbonEntryShown, useRibbonHidden, writeRibbonHidden } from "@/lib/ribbonHidden";
import { isDefaultRibbonOrder, moveRibbonGroupPast, readRibbonOrder, type RibbonGroupName, useRibbonOrder, writeRibbonOrder } from "@/lib/ribbonOrder";
import { moveRibbonTool, readRibbonToolOrder, useRibbonToolOrder, withRibbonToolOrder, writeRibbonToolOrder } from "@/lib/ribbonToolOrder";
import { readRibbonFold, ribbonFoldOf, ribbonGroupFolds, type RibbonFold, useRibbonFold, withRibbonFold, writeRibbonFold } from "@/lib/ribbonFold";

/**
 * "Buttons in the ribbon" in the settings window (Discussion #1519, #1087, #1502): every group of the 3D ribbon folds open to
 * a list of its buttons, each with a tick, and two arrows move the group up or down the ribbon. What is taken out leaves
 * the ribbon only; the command search and the keys still run it.
 */
export function RibbonButtonsSetting() {
  const hidden = useRibbonHidden();
  const order = useRibbonOrder();
  const toolOrder = useRibbonToolOrder();
  const folds = useRibbonFold();
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
          <button type="button" className="make-default-button" disabled={isDefaultRibbonOrder(order) && Object.keys(toolOrder).length === 0 && Object.keys(folds).length === 0} onClick={() => { writeRibbonOrder([]); writeRibbonToolOrder({}); writeRibbonFold({}); }}>
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
                {groupShown && ribbonFoldOf(folds, group.group) !== "auto"
                  ? ` · ${t(ribbonFoldOf(folds, group.group) === "always" ? "workspace.ribbonFoldAlways" : "workspace.ribbonFoldKeep")}`
                  : null}
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
                    {step === -1 ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
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
            {ribbonGroupFolds(group.group) ? (
              // How the group folds when the window is short of room (Discussion #1551).
              <label className="workspace-select ribbon-fold-row">
                <span>{t("workspace.ribbonFold")}</span>
                <select
                  value={ribbonFoldOf(folds, group.group)}
                  disabled={!groupShown}
                  onChange={(event) => writeRibbonFold(withRibbonFold(readRibbonFold(), group.group, event.currentTarget.value as RibbonFold))}
                >
                  <option value="auto">{t("workspace.ribbonFoldAuto")}</option>
                  <option value="always">{t("workspace.ribbonFoldAlways")}</option>
                  <option value="keep">{t("workspace.ribbonFoldKeep")}</option>
                </select>
              </label>
            ) : null}
            <div className="ribbon-buttons-tools" aria-disabled={!groupShown}>
              {group.tools.map((tool, toolIndex) => (
                <label className={`workspace-toggle ribbon-buttons-row${groupShown ? "" : " is-disabled"}`} key={tool.id}>
                  <span className="workspace-toggle-copy">
                    <span>{tool.label}</span>
                  </span>
                  <span className="ribbon-buttons-tool-moves">
                    {[-1, 1].map((step) => {
                      // A button moves past the next one of its own section (Modify has named sections), never out of it.
                      const candidates = step === -1 ? group.tools.slice(0, toolIndex).reverse() : group.tools.slice(toolIndex + 1);
                      const neighbour = candidates.find((other) => other.section === tool.section);
                      const label = t(step === -1 ? "workspace.ribbonMoveUp" : "workspace.ribbonMoveDown", { group: tool.label });
                      return (
                        <button
                          type="button"
                          key={step}
                          className="ribbon-buttons-move"
                          disabled={!neighbour}
                          aria-label={label}
                          title={label}
                          onClick={(event) => {
                            // The arrows sit in a label: a click on them must not tick the box.
                            event.preventDefault();
                            event.stopPropagation();
                            if (!neighbour) return;
                            const moved = moveRibbonTool(group.tools.map((entry) => entry.id), tool.id, neighbour.id, step as -1 | 1);
                            writeRibbonToolOrder(withRibbonToolOrder(readRibbonToolOrder(), group.group, moved, group.shipped ?? moved));
                          }}
                        >
                          {step === -1 ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                      );
                    })}
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
