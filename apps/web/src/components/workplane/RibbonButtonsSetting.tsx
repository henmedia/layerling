"use client";

import { GuideHelpLink } from "@/components/GuideHelpLink";
import { t } from "@/lib/i18n";
import { ribbonGroupKey, ribbonLayout, setRibbonEntryShown, useRibbonHidden, writeRibbonHidden } from "@/lib/ribbonHidden";

/**
 * "Buttons in the ribbon" in the settings window (Discussion #1519, #1087): every group of the 3D ribbon folds open to a
 * list of its buttons, each with a tick. What is taken out leaves the ribbon only; the command search and the keys still
 * run it, and the order of the groups stays, so the guide and the help keep pointing at the same places.
 */
export function RibbonButtonsSetting() {
  const hidden = useRibbonHidden();
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
        <button type="button" className="make-default-button" disabled={hidden.size === 0} onClick={() => writeRibbonHidden([])}>
          {t("workspace.ribbonShowAll")}
        </button>
      </div>
      {layout.map((group) => {
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
