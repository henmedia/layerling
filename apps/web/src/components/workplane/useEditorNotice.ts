import { useCallback, useEffect, useRef, useState } from "react";
import { rememberBugReportEvent, type BugReportEvent } from "@/lib/bugReport";
import { NOTICE_AFTER_HOVER_MS, noticeDurationMs } from "@/lib/noticeTiming";

export type NoticeAction = { label: string; run: () => void };

/**
 * Die Statuszeile in der Fusszeile. Eine Bestaetigung - „Gewinde
 * hinzugefuegt" - hat nach ein paar Sekunden ihren Zweck erfuellt und macht
 * wieder Platz. Alles, was etwas von einem will oder schiefgegangen ist,
 * bleibt stehen, bis es abgeloest wird: Eine Aufforderung, die sich von
 * selbst zurueckzieht, ist keine.
 */
export function useEditorNotice() {
  // Leer heisst Ruhe: Dann steht kein Fenster auf der Arbeitsflaeche. Ein
  // „Bereit" braucht niemand zu lesen - dass nichts los ist, sieht man.
  const [notice, setNoticeText] = useState("");
  // A message may carry one button, for what the person can do about it right away (#489).
  const [noticeAction, setNoticeAction] = useState<NoticeAction | null>(null);
  // When the message came (performance.now()), so the editor can tell one that reports a change just made.
  const [noticeAt, setNoticeAt] = useState(0);
  const noticeTimerRef = useRef<number | null>(null);
  // Fuer den Fehlerbericht: die letzten Meldungen dieser Sitzung.
  const reportNoticesRef = useRef<BugReportEvent[]>([]);

  const clearLater = useCallback((ms: number) => {
    if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => {
      noticeTimerRef.current = null;
      setNoticeText("");
      setNoticeAction(null);
    }, ms);
  }, []);
  const setNotice = useCallback((message: string, patient = false, action: NoticeAction | null = null) => {
    reportNoticesRef.current = rememberBugReportEvent(reportNoticesRef.current, message);
    setNoticeText(message);
    setNoticeAction(action);
    setNoticeAt(performance.now());
    clearLater(noticeDurationMs(message, patient));
  }, [clearLater]);
  // A message stays while the pointer rests on it, and goes a few seconds after it leaves (#422).
  const holdNotice = useCallback(() => {
    if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = null;
  }, []);
  const releaseNotice = useCallback(() => clearLater(NOTICE_AFTER_HOVER_MS), [clearLater]);
  const dismissNotice = useCallback(() => {
    holdNotice();
    setNoticeText("");
    setNoticeAction(null);
  }, [holdNotice]);

  useEffect(() => () => {
    if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current);
  }, []);

  return { notice, noticeAction, noticeAt, setNotice, holdNotice, releaseNotice, dismissNotice, reportNoticesRef };
}
