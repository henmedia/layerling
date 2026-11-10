"use client";

import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { GuideHelpLink } from "@/components/GuideHelpLink";
import { WhatsNewList, WhatsNewNote } from "@/components/WhatsNewCard";
import { t } from "@/lib/i18n";
import { LYL_CREATED_WITH_VERSION } from "@/lib/lylProject";
import { useLanguage } from "@/lib/useLanguage";
import { useMovablePanel } from "@/lib/useMovablePanel";
import { latestWhatsNew, whatsNewBefore } from "@/lib/whatsNew";

/**
 * The list of updates inside the editor (Discussion #1530): the cards the start page shows, newest version first,
 * and below them a button for the versions before. On the start page the list came only after leaving the design,
 * so reading about a new tool and trying it meant leaving and opening the design again and again.
 *
 * Unlike the guide it is not modal: there is no backdrop and the editor stays usable around it, so the list can
 * stay open beside the part while a new tool is tried. Keys typed while the window has the focus stay in it (the
 * editor and the viewport listen on the window); a click into the view takes the focus back to the editor. It is
 * moved by its title bar and remembered where it stood, like every panel. Opening it does not touch the version
 * the start page remembers as seen: that stays the start page's card.
 */
export function WhatsNewWindow({ onClose }: { onClose: () => void }) {
  useLanguage();
  const entries = useMemo(() => latestWhatsNew(LYL_CREATED_WITH_VERSION), []);
  const [showEarlier, setShowEarlier] = useState(false);
  const oldestShown = entries[entries.length - 1]?.version;
  const earlier = useMemo(() => (oldestShown ? whatsNewBefore(oldestShown) : []), [oldestShown]);
  const movable = useMovablePanel<HTMLDivElement>("layerling.editor.whatsNewPosition", { floatingStyle: { position: "absolute", margin: 0 } });
  const cardRef = movable.panelRef;
  const title = t("whatsNew.footerLink");

  useEffect(() => {
    cardRef.current?.focus();
  }, []);

  return (
    <div
      className="workspace-modal shortcuts-modal whats-new-window"
      role="dialog"
      aria-label={title}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
        }
      }}
    >
      <div
        className={`workspace-modal-card shortcuts-modal-card ${movable.moved ? "floating" : ""} ${movable.dragging ? "moving" : ""}`}
        ref={cardRef}
        style={movable.style}
        tabIndex={-1}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <header className="workspace-modal-header movable" title={t("panel.moveHint")} {...movable.handleProps}>
          <strong>{title}</strong>
          <GuideHelpLink section="whatsNew" />
          <button aria-label={t("panel.close", { title })} title={t("panel.close", { title })} onClick={onClose}>
            <X size={18} />
          </button>
        </header>
        <div className="workspace-modal-content">
          <div className="workspace-modal-body whats-new-window-body">
            <WhatsNewNote />
            <WhatsNewList entries={entries} />
            {showEarlier && earlier.length > 0 ? (
              <>
                <h3 className="whats-new-earlier-heading">{t("whatsNew.earlierHeading")}</h3>
                <WhatsNewList entries={earlier} />
              </>
            ) : null}
          </div>
          {earlier.length > 0 && !showEarlier ? (
            <div className="workspace-modal-footer whats-new-window-footer">
              <button className="whats-new-earlier" type="button" onClick={() => setShowEarlier(true)}>
                {t("whatsNew.earlier", { count: earlier.length })}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
