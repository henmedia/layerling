import type { MessageKey } from "@/lib/i18n";

/** Which way to install this browser offers, when it has no button of its own to press. */
export function installHintKey(userAgent: string, maxTouchPoints: number): MessageKey {
  const iPadAsMac = /Macintosh/.test(userAgent) && maxTouchPoints > 1;
  if (/iPhone|iPad|iPod/.test(userAgent) || iPadAsMac) return "installHint.ios";
  const firefox = /Firefox\/(\d+)/.exec(userAgent);
  // Firefox pins a site to the Windows taskbar as a web app since 143 (#1978); elsewhere it only opens it in a tab.
  if (firefox) return /Windows/.test(userAgent) && Number(firefox[1]) >= 143 ? "installHint.firefoxWindows" : "installHint.firefox";
  if (/Safari\//.test(userAgent) && !/Chrome\/|Chromium\/|Edg\/|OPR\//.test(userAgent)) return "installHint.safariMac";
  return "installHint.chromium";
}

/** How an installed layerling shows itself: in a window of its own, in Firefox on Windows with a slim address bar. */
export const INSTALLED_APP_QUERY = "(display-mode: standalone), (display-mode: minimal-ui)";

/** How long "Not now" hides the install hint: two weeks, as long as the support card rests. */
export const INSTALL_HINT_SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;

/** Whether the hint was put off recently: the stored time of the click, and now. */
export function installHintSnoozed(stored: string | null, now: number): boolean {
  const at = Number(stored);
  return Number.isFinite(at) && at > 0 && now >= at && now - at < INSTALL_HINT_SNOOZE_MS;
}
