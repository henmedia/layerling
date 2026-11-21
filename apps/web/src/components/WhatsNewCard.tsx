"use client";

import { BookOpen, Sparkles, X } from "lucide-react";
import { useMemo, useState } from "react";
import { GuideHelpLink } from "@/components/GuideHelpLink";
import { releaseNotesUrl } from "@/lib/appUpdate";
import { localizedText, t } from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";
import type { WhatsNewView } from "@/lib/useWhatsNew";
import { whatsNewBefore, whatsNewBlocks, whatsNewGuideLinks, type WhatsNewEntry } from "@/lib/whatsNew";

/** The cards are a selection: smaller changes and fixes are only in the release notes on GitHub. */
export function WhatsNewNote() {
  useLanguage();
  return (
    <p className="whats-new-note">
      {t("whatsNew.excerpt")}{" "}
      <a href={releaseNotesUrl()} target="_blank" rel="noreferrer">{t("whatsNew.releaseNotes")}</a>
    </p>
  );
}

/** A card's text: one paragraph as it always was, or several with lists where the card is longer. */
function WhatsNewBody({ text }: { text: string }) {
  const blocks = whatsNewBlocks(text);
  if (blocks.length === 1 && blocks[0].kind === "paragraph") return <span>{blocks[0].text}</span>;
  return (
    <div className="whats-new-text">
      {blocks.map((block, index) => block.kind === "paragraph"
        ? <span key={index}>{block.text}</span>
        : (
          <ul key={index} className="whats-new-points">
            {block.items.map((point) => <li key={point}>{point}</li>)}
          </ul>
        ))}
    </div>
  );
}

/** The versions with their highlights, in the interface language, with a link to the guide where a card has one. */
export function WhatsNewList({ entries }: { entries: readonly WhatsNewEntry[] }) {
  const language = useLanguage();
  return (
    <>
      {entries.map((entry) => (
        <section className="whats-new-version" key={entry.version}>
          <h2>{t("whatsNew.version", { version: entry.version })}</h2>
          <ul>
            {entry.items.map((item) => (
              <li key={item.title.en}>
                <strong>{localizedText(item.title, language)}</strong>
                <WhatsNewBody text={localizedText(item.body, language)} />
                {whatsNewGuideLinks(item, language).map((link) => (
                  <a className="whats-new-guide-link" key={link.href} href={link.href} target="_blank" rel="noreferrer">
                    <BookOpen size={14} aria-hidden="true" />
                    {link.label ? localizedText(link.label, language) : t("guide.helpLink")}
                  </a>
                ))}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}

/**
 * What came with the versions since the last visit, on the start page: every
 * one of them, newest first. Only the newest used to be open, the rest behind a
 * button - under a title saying "since your last visit" that read as if one
 * version was all that came. A long absence scrolls inside the card instead
 * (whats-new-body has a height limit). Below them, one button opens the versions
 * from before the last visit. Closing it remembers the current version, so it
 * does not come back until the next update.
 */
export function WhatsNewCard({ view, current, onClose }: { view: WhatsNewView; current: string; onClose: () => void }) {
  useLanguage();
  const [showEarlier, setShowEarlier] = useState(false);
  const oldestShown = view.entries[view.entries.length - 1]?.version;
  const earlier = useMemo(() => (oldestShown ? whatsNewBefore(oldestShown) : []), [oldestShown]);
  const title = view.from
    ? t("whatsNew.title", { from: view.from, to: current })
    : t("whatsNew.titleRecent");

  return (
    <aside className="whats-new" role="region" aria-label={title}>
      <header className="whats-new-header">
        <span className="whats-new-icon" aria-hidden="true">
          <Sparkles size={20} strokeWidth={2.4} />
        </span>
        <strong>{title}</strong>
        <GuideHelpLink section="whatsNew" />
        <button className="whats-new-close" type="button" aria-label={t("whatsNew.close")} title={t("whatsNew.close")} onClick={onClose}>
          <X size={16} />
        </button>
      </header>
      <div className="whats-new-body">
        <WhatsNewNote />
        <WhatsNewList entries={view.entries} />
        {showEarlier && earlier.length > 0 ? (
          <>
            <h3 className="whats-new-earlier-heading">{t(view.from ? "whatsNew.beforeLastVisit" : "whatsNew.earlierHeading")}</h3>
            <WhatsNewList entries={earlier} />
          </>
        ) : null}
      </div>
      <footer className="whats-new-footer">
        {earlier.length > 0 && !showEarlier ? (
          <button className="whats-new-earlier" type="button" onClick={() => setShowEarlier(true)}>
            {t("whatsNew.earlier", { count: earlier.length })}
          </button>
        ) : null}
        <button className="whats-new-done" type="button" onClick={onClose}>
          {t("whatsNew.dismiss")}
        </button>
      </footer>
    </aside>
  );
}
