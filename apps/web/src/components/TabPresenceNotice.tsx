"use client";

import { RefreshCw, TriangleAlert, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { t } from "@/lib/i18n";
import { designSaveState, releaseLeaveGuard } from "@/lib/leaveGuard";
import { isTabPresenceMessage, TAB_PRESENCE_CHANNEL, tabPresenceState, type TabPeer, type TabPresenceMessage } from "@/lib/tabPresence";
import { useLanguage } from "@/lib/useLanguage";

/**
 * A strip at the bottom of the window when another layerling tab runs a newer
 * version, has the design open that this tab is editing, or was simply open
 * before this one. `projectId` is the design being edited, null on the start page.
 */
export function TabPresenceNotice({ version, projectId }: { version: string; projectId: string | null }) {
  useLanguage();
  const [peers, setPeers] = useState<ReadonlyMap<string, TabPeer>>(() => new Map());
  const channelRef = useRef<BroadcastChannel | null>(null);
  const tabIdRef = useRef("");
  const startedAtRef = useRef(0);
  const projectIdRef = useRef(projectId);
  // "Keep working here" hides the note about an earlier tab for good in this tab.
  const [keepHere, setKeepHere] = useState(false);
  const [closeRefused, setCloseRefused] = useState(false);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(TAB_PRESENCE_CHANNEL);
    channelRef.current = channel;
    startedAtRef.current = Date.now();
    tabIdRef.current = `${startedAtRef.current.toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    const post = (message: TabPresenceMessage) => {
      try {
        channel.postMessage(message);
      } catch {
        // A closed channel during unload; nothing to tell anyone then.
      }
    };
    const announce = (kind: "hello" | "here") => post({ kind, tabId: tabIdRef.current, version, projectId: projectIdRef.current, startedAt: startedAtRef.current });

    channel.onmessage = (event: MessageEvent) => {
      const message: unknown = event.data;
      if (!isTabPresenceMessage(message) || message.tabId === tabIdRef.current) return;
      // The guide only wants an answer; it is no layerling tab of its own.
      if (message.kind === "ask") {
        announce("here");
        return;
      }
      setPeers((current) => {
        const next = new Map(current);
        if (message.kind === "bye") next.delete(message.tabId);
        else next.set(message.tabId, { version: message.version, projectId: message.projectId, startedAt: message.startedAt });
        return next;
      });
      // A new tab asks who is there; the others answer once.
      if (message.kind === "hello") announce("here");
    };
    const leave = () => post({ kind: "bye", tabId: tabIdRef.current });
    window.addEventListener("pagehide", leave);
    announce("hello");
    return () => {
      window.removeEventListener("pagehide", leave);
      leave();
      channel.close();
      channelRef.current = null;
    };
  }, [version]);

  // Opening or leaving a design tells the others.
  useEffect(() => {
    projectIdRef.current = projectId;
    const channel = channelRef.current;
    if (!channel) return;
    try {
      channel.postMessage({ kind: "here", tabId: tabIdRef.current, version, projectId, startedAt: startedAtRef.current } satisfies TabPresenceMessage);
    } catch {
      // See above.
    }
  }, [projectId, version]);

  const { newerVersion, sameProjectElsewhere, openedAfterAnother } = tabPresenceState(peers, version, projectId, startedAtRef.current);
  const showOpenedAfter = openedAfterAnother && !keepHere;
  if (!newerVersion && !sameProjectElsewhere && !showOpenedAfter) return null;

  const closeThisTab = () => {
    // Browsers let a page close itself only when it is a fresh tab with nothing
    // to go back to; otherwise nothing happens, and then the note says so.
    window.close();
    window.setTimeout(() => setCloseRefused(true), 400);
  };

  return (
    <aside className="tab-presence-notice" role="alert">
      <TriangleAlert size={18} aria-hidden="true" className="tab-presence-icon" />
      <span>
        {newerVersion
          ? t("tabs.newerVersion", { version: newerVersion, current: version })
          : sameProjectElsewhere
            ? t("tabs.sameProject")
            : closeRefused
              ? t("tabs.closeRefused")
              : t("tabs.alreadyOpen")}
      </span>
      {newerVersion ? (
        <button type="button" className="tab-presence-reload" onClick={() => {
            // A design not stored yet, or one the browser refused (#1639), keeps the browser's own question in the way.
            const { saving, unsaved } = designSaveState();
            if (!saving && !unsaved) releaseLeaveGuard();
            window.location.reload();
          }}>
          <RefreshCw size={15} aria-hidden="true" />
          {t("tabs.reload")}
        </button>
      ) : null}
      {!newerVersion && !sameProjectElsewhere ? (
        <span className="tab-presence-actions">
          {closeRefused ? null : (
            <button type="button" className="tab-presence-reload" onClick={closeThisTab}>
              <X size={15} aria-hidden="true" />
              {t("tabs.closeThis")}
            </button>
          )}
          <button type="button" className="tab-presence-reload" onClick={() => setKeepHere(true)}>
            {t("tabs.keepHere")}
          </button>
        </span>
      ) : null}
    </aside>
  );
}
