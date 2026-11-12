"use client";

import { Megaphone, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { announcementInlines, SUPPORT_LINK_TARGET, type Announcement } from "@/lib/announcements";
import { localizedText, t } from "@/lib/i18n";
import { supportLink, type SupportSettings } from "@/lib/supportLink";
import { useLanguage } from "@/lib/useLanguage";
import { whatsNewBlocks } from "@/lib/whatsNew";

// The same settings as the footer's support link, so an operator's own address
// or switch applies here too.
const SUPPORT_SETTINGS: SupportSettings = {
  url: process.env.NEXT_PUBLIC_SPONSOR_URL,
  label: process.env.NEXT_PUBLIC_SPONSOR_LABEL,
  hint: process.env.NEXT_PUBLIC_SUPPORT_HINT,
};

/** One paragraph or list point, with its links; a support link without a support page stays plain text. */
function Inlines({ text, supportHref }: { text: string; supportHref: string | null }) {
  return (
    <>
      {announcementInlines(text).map((part, index) => {
        if (part.kind === "text") return <span key={index}>{part.text}</span>;
        const href = part.href === SUPPORT_LINK_TARGET ? supportHref : part.href;
        if (!href) return <span key={index}>{part.label}</span>;
        return (
          <a key={index} href={href} target="_blank" rel="noreferrer">
            {part.label}
          </a>
        );
      })}
    </>
  );
}

/**
 * An announcement from the author on the start page, whole and in the reader's
 * language: paragraphs, list points and links. A long one scrolls inside the
 * card. "Got it" closes it in this browser; while it runs, the footer brings it back.
 */
export function AnnouncementCard({ announcement, reveal = false, onClose }: { announcement: Announcement; reveal?: boolean; onClose: () => void }) {
  const language = useLanguage();
  const cardRef = useRef<HTMLElement | null>(null);
  // Opened again from the footer, far below: bring it up to where it is read.
  useEffect(() => {
    if (reveal) cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [reveal]);
  const title = localizedText(announcement.title, language);
  const support = supportLink(SUPPORT_SETTINGS, language);
  const blocks = whatsNewBlocks(localizedText(announcement.text, language));

  return (
    <aside ref={cardRef} className="whats-new announcement" role="region" aria-label={title}>
      <header className="whats-new-header">
        <span className="whats-new-icon" aria-hidden="true">
          <Megaphone size={20} strokeWidth={2.4} />
        </span>
        <strong>{title}</strong>
        <button className="whats-new-close" type="button" aria-label={t("whatsNew.close")} title={t("whatsNew.close")} onClick={onClose}>
          <X size={16} />
        </button>
      </header>
      <div className="whats-new-body announcement-body">
        {blocks.map((block, index) => block.kind === "paragraph"
          ? <p key={index}><Inlines text={block.text} supportHref={support?.href ?? null} /></p>
          : (
            <ul key={index}>
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}><Inlines text={item} supportHref={support?.href ?? null} /></li>
              ))}
            </ul>
          ))}
      </div>
      <footer className="whats-new-footer">
        <button className="whats-new-done" type="button" onClick={onClose}>
          {t("whatsNew.dismiss")}
        </button>
      </footer>
    </aside>
  );
}
