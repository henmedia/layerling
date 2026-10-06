"use client";

import type { ReactNode } from "react";
import { LANGUAGES, LANGUAGE_NAMES, setLanguage, t, type Language } from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";

/**
 * Kleine gezeichnete Fahnen statt Emoji: Windows liefert die Flaggen-Emoji
 * nicht aus und zeigt stattdessen zwei Buchstaben in einem Kasten. Gezeichnet
 * sehen sie überall gleich aus und lassen sich auf Pixelgrößen bringen.
 */
const FLAGS: Record<Language, ReactNode> = {
  en: (
    <svg viewBox="0 0 60 36" aria-hidden="true">
      <rect width="60" height="36" fill="#012169" />
      <path d="M0 0 60 36M60 0 0 36" stroke="#ffffff" strokeWidth="7" />
      <path d="M0 0 60 36M60 0 0 36" stroke="#c8102e" strokeWidth="4" />
      <path d="M30 0V36M0 18H60" stroke="#ffffff" strokeWidth="12" />
      <path d="M30 0V36M0 18H60" stroke="#c8102e" strokeWidth="7" />
    </svg>
  ),
  de: (
    <svg viewBox="0 0 5 3" aria-hidden="true">
      <rect width="5" height="1" y="0" fill="#000000" />
      <rect width="5" height="1" y="1" fill="#dd0000" />
      <rect width="5" height="1" y="2" fill="#ffce00" />
    </svg>
  ),
  ru: (
    <svg viewBox="0 0 5 3" aria-hidden="true">
      <rect width="5" height="1" y="0" fill="#ffffff" />
      <rect width="5" height="1" y="1" fill="#0039a6" />
      <rect width="5" height="1" y="2" fill="#d52b1e" />
    </svg>
  ),
};

/**
 * Die Sprachwahl sitzt oben rechts, wo man sie auf Webseiten sucht - auf der
 * Startseite wie im Editor. Drei Sprachen brauchen noch keine Liste, die man
 * erst aufklappt: sie stehen nebeneinander, die gewählte ist hervorgehoben.
 */
export function LanguageSwitch() {
  const language = useLanguage();
  return (
    <div className="language-switch" role="group" aria-label={t("common.language")}>
      {LANGUAGES.map((option) => (
        <button
          key={option}
          type="button"
          className={option === language ? "active" : undefined}
          aria-pressed={option === language}
          title={LANGUAGE_NAMES[option]}
          onClick={() => setLanguage(option)}
        >
          {FLAGS[option]}
          <span>{option.toUpperCase()}</span>
        </button>
      ))}
    </div>
  );
}
