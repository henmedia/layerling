"use client";

import { useCallback, useEffect, useState } from "react";
import {
  activeAnnouncements,
  announcementClock,
  bundledAnnouncementList,
  fetchAnnouncements,
  type Announcement,
} from "@/lib/announcements";

const CLOSED_KEY = "layerling.announcementsClosed";

/** NEXT_PUBLIC_ANNOUNCEMENTS=off: whoever runs an installation can keep the announcements away. */
const SWITCHED_OFF = process.env.NEXT_PUBLIC_ANNOUNCEMENTS?.trim().toLowerCase() === "off";

function readClosed(): string[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(CLOSED_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function rememberClosed(ids: string[]) {
  try {
    window.localStorage.setItem(CLOSED_KEY, JSON.stringify(ids.slice(-50)));
  } catch {
    // Without storage the announcement comes back with the next visit, which is harmless.
  }
}

/**
 * The announcement the start page shows: the newest one whose window is open
 * and that this browser has not closed. The built-in list answers at once; a
 * released copy then reads the live list from GitHub and takes that instead,
 * so the author can add or correct one without a release. While developing,
 * the built-in file is the one being edited, so it is not overruled.
 */
export function useAnnouncements() {
  const [list, setList] = useState<Announcement[]>([]);
  const [closed, setClosed] = useState<string[]>([]);
  const [reopened, setReopened] = useState(false);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (SWITCHED_OFF) return;
    setClosed(readClosed());
    setNow(announcementClock(window.location.search, Date.now()));
    setList(bundledAnnouncementList());
    if (process.env.NODE_ENV === "development") return;
    let cancelled = false;
    void fetchAnnouncements().then((live) => {
      if (!cancelled && live) setList(live);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const current = now === null ? null : activeAnnouncements(list, now)[0] ?? null;
  const isClosed = current ? closed.includes(current.id) : false;

  const close = useCallback(() => {
    if (!current) return;
    setReopened(false);
    if (closed.includes(current.id)) return;
    const next = [...closed, current.id];
    setClosed(next);
    rememberClosed(next);
  }, [closed, current]);

  const reopen = useCallback(() => setReopened(true), []);

  return {
    /** The announcement to show now, or null. */
    shown: current && (!isClosed || reopened) ? current : null,
    /** An announcement that is running but was closed here: the footer offers it again. */
    closedButActive: Boolean(current && isClosed && !reopened),
    /** Opened again from the footer: the card scrolls into view. */
    reopened,
    close,
    reopen,
  };
}
