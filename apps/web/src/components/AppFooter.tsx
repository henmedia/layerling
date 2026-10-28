"use client";

import { Heart, Sparkles } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { LANGUAGE_INFO, t, type Language } from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";
import { useSimpleMode } from "@/lib/useSimpleMode";
import { SOURCE_CODE_URL, releaseNotesUrl, type AppUpdateInfo } from "@/lib/appUpdate";
import { useAppUpdate } from "@/lib/useAppUpdate";
import { SHOW_WHATS_NEW_EVENT } from "@/lib/useWhatsNew";
import { InstallAppHint } from "@/components/InstallAppHint";
import { TabletHint } from "@/components/TabletHint";
import { PenHoverTips } from "@/components/PenHoverTips";
import { SupportNudge } from "@/components/SupportNudge";
import { supportCardEnabled, supportLink, type SupportSettings } from "@/lib/supportLink";

export { SOURCE_CODE_URL };

/** Der Verweis in der Fußzeile zeigt auf die Anleitung in der gewählten Sprache. */
function readmeUrl(language: Language) {
  return `${SOURCE_CODE_URL.replace(/\/+$/, "")}/blob/main/${LANGUAGE_INFO[language].readme}`;
}

// German readers are already gathered in the drucktipps3d forum this project
// grew out of; everyone else is pointed at GitHub Discussions instead, since
// a German forum means nothing to them. Which is which sits with the language
// (languages.ts).
function communityUrl(language: Language) {
  return LANGUAGE_INFO[language].communityUrl;
}

// Whoever operates a layerling installation may be required to publish a legal
// notice - in Germany every business site needs an Impressum. The pages differ
// per operator and are not part of this project, so they are linked through
// build-time variables and the links disappear when nothing is configured. An
// operator-supplied label wins outright, in whichever language they wrote it;
// only the built-in fallback follows the reader's own language.
const LEGAL_LINK_SOURCES = [
  {
    url: process.env.NEXT_PUBLIC_IMPRINT_URL,
    label: process.env.NEXT_PUBLIC_IMPRINT_LABEL,
    fallbackLabel: "imprint",
  },
  {
    url: process.env.NEXT_PUBLIC_PRIVACY_URL,
    label: process.env.NEXT_PUBLIC_PRIVACY_LABEL,
    fallbackLabel: "privacy",
  },
] as const;

function legalLinks(language: Language) {
  return LEGAL_LINK_SOURCES.map((link) => ({
    href: link.url?.trim() ?? "",
    label: link.label?.trim() || LANGUAGE_INFO[language].legal[link.fallbackLabel],
  })).filter((link) => link.href.length > 0);
}

// Everyone sees the way to support the project. Whoever runs an installation
// may name an address of their own through build-time variables, just like the
// legal pages, or switch the built-in link and the reminder card off.
const SUPPORT_SETTINGS: SupportSettings = {
  url: process.env.NEXT_PUBLIC_SPONSOR_URL,
  label: process.env.NEXT_PUBLIC_SPONSOR_LABEL,
  hint: process.env.NEXT_PUBLIC_SUPPORT_HINT,
};

// The footer reads as two halves: what this installation is on the left, where
// the project lives on the right. Middle dots separate the parts and sit in
// their own spans, so they are neither clickable nor read aloud. Entries that
// are not configured drop out without leaving a stray dot behind.
function joinWithDots(items: ReactNode[]) {
  return items
    .filter(Boolean)
    .flatMap((item, index) =>
      index === 0
        ? [item]
        : [
            <span className="dashboard-legal-dot" aria-hidden="true" key={`dot-${index}`}>
              &middot;
            </span>,
            item,
          ],
    );
}

// The anchor of the Windows quickstart section, which also explains updating.
function updateStepsUrl(language: Language) {
  return `${readmeUrl(language)}#${LANGUAGE_INFO[language].quickstartAnchor}`;
}

/**
 * Dieselbe Zeile auf der Startseite und unter dem Arbeitsbereich. Im Editor
 * liegt sie als schmales Band am unteren Rand, deshalb bekommt sie dort eine
 * zweite Klasse statt einer eigenen Kopie des Markups.
 */
export function AppFooter({
  variant = "dashboard",
  version,
  updateInfo,
  onBugReport,
  onShowWelcome,
}: {
  variant?: "dashboard" | "editor";
  version: string;
  updateInfo?: AppUpdateInfo | null;
  /** Im Editor: den Entwurf als Fehlerbericht speichern. */
  onBugReport?: () => void;
  /** On the start page once the welcome guide was closed: the way to bring it back. */
  onShowWelcome?: () => void;
}) {
  const language = useLanguage();
  const simpleMode = useSimpleMode();
  const sponsor = supportLink(SUPPORT_SETTINGS, language);
  const { update: hookUpdate } = useAppUpdate(version);
  const update = updateInfo !== undefined ? updateInfo : hookUpdate;
  // On someone's own computer the release page does not say how to update,
  // so the notice points at the steps instead. Decided after mount: the
  // exported page cannot know where it will be opened.
  const [runsLocally, setRunsLocally] = useState(false);
  useEffect(() => {
    setRunsLocally(["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname));
  }, []);

  // The footer is all links out of the program: the project, the forum, the release notes, the support page (#695).
  if (simpleMode) return null;

  return (
    <>
    {variant === "editor" ? <InstallAppHint variant="editor" /> : null}
    {variant === "editor" ? <TabletHint variant="editor" /> : null}
    {variant === "editor" ? <PenHoverTips /> : null}
    {sponsor && supportCardEnabled(SUPPORT_SETTINGS) ? <SupportNudge href={sponsor.href} /> : null}
    <footer className={variant === "editor" ? "dashboard-legal editor-legal" : "dashboard-legal"}>
      <div className="dashboard-legal-group">
        {joinWithDots([
          sponsor ? (
            <a
              className="dashboard-legal-sponsor"
              href={sponsor.href}
              target="_blank"
              rel="noreferrer"
              key="sponsor"
            >
              <Heart size={13} aria-hidden="true" />
              {sponsor.label || t("dashboard.sponsor")}
            </a>
          ) : null,
          onShowWelcome ? (
            <a
              href="#welcome"
              key="welcome"
              onClick={(event) => {
                event.preventDefault();
                onShowWelcome();
              }}
            >
              {t("welcome.teaserTitle")}
            </a>
          ) : null,
          <a href={t("welcome.guideUrl")} target="_blank" rel="noreferrer" key="guide">
            {t("dashboard.userGuide")}
          </a>,
          <a href={communityUrl(language)} target="_blank" rel="noreferrer" key="community">
            {t("dashboard.forum")}
          </a>,
          // Ein Link in Knopfrolle: so traegt er die Farben der Fusszeile in
          // jedem Thema, und die Werkzeugleiste wird nicht breiter.
          onBugReport ? (
            <a
              href="#"
              role="button"
              key="bug-report"
              title={t("editor.bugReportHint")}
              onClick={(event) => {
                event.preventDefault();
                onBugReport();
              }}
            >
              {t("editor.bugReport")}
            </a>
          ) : null,
          ...legalLinks(language).map((link) => (
            <a key={link.href} href={link.href}>{link.label}</a>
          )),
        ])}
      </div>
      <div className="dashboard-legal-group">
        {joinWithDots([
          <a href={readmeUrl(language)} target="_blank" rel="noreferrer" key="readme">
            {t("dashboard.projectOnGitHub")}
          </a>,
          // Only on the start page, where the list is shown.
          variant === "dashboard" ? (
            <a
              href="#"
              role="button"
              key="whats-new"
              onClick={(event) => {
                event.preventDefault();
                window.dispatchEvent(new Event(SHOW_WHATS_NEW_EVENT));
              }}
            >
              {t("whatsNew.footerLink")}
            </a>
          ) : null,
          <a href={releaseNotesUrl()} target="_blank" rel="noreferrer" key="releases" data-help={t("dashboard.footerHelp")}>
            {t("dashboard.releaseNotes", { version })}
          </a>,
          update ? (
            <a
              className="dashboard-legal-update"
              href={runsLocally ? updateStepsUrl(language) : update.releaseUrl}
              target="_blank"
              rel="noreferrer"
              key="update-available"
              title={runsLocally ? t("dashboard.updateLocalHint") : t("dashboard.updateAvailable", { version: update.latestVersion })}
            >
              <Sparkles size={13} aria-hidden="true" />
              <span>{t("dashboard.updateAvailable", { version: update.latestVersion })}</span>
            </a>
          ) : null,
        ])}
      </div>
      {variant === "dashboard" ? <p className="dashboard-trademark">{t("footer.trademark")}</p> : null}
    </footer>
    </>
  );
}
