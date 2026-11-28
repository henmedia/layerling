"use client";

import { guideHref } from "@/lib/guideLinks";
import { t } from "@/lib/i18n";
import { noticeHelpSection } from "@/lib/noticeHelp";
import { useLanguage } from "@/lib/useLanguage";
import { useSimpleMode } from "@/lib/useSimpleMode";

/**
 * "Read more" behind a message the guide's FAQ has an answer for: the way from "the browser has no room left" or "this
 * fillet does not fit" to what to do about it. Nothing for a message without an answer there.
 */
export function NoticeHelpLink({ message, className = "" }: { message: string | null | undefined; className?: string }) {
  const language = useLanguage();
  // The guide leads out of the program, as the question marks do (#695).
  const simple = useSimpleMode();
  const section = noticeHelpSection(message, language);
  if (simple || !section) return null;
  return (
    <a
      className={`notice-help-link ${className}`.trim()}
      href={guideHref(language, undefined, section)}
      target="_blank"
      rel="noreferrer"
      title={t("guide.helpLink")}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {t("status.largeMeshesGuide")}
    </a>
  );
}
