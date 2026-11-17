"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BUILD_MISMATCH_EVENT } from "@/lib/buildStamp";
import { designSaveState, designsSettled, releaseLeaveGuard } from "@/lib/leaveGuard";
import {
  fetchVersionInfo,
  isNewBuild,
  looksLikeMissingProgramFile,
  VERSION_CHECK_INTERVAL_MS,
  VERSION_LATER_MS,
  type VersionInfo,
} from "@/lib/newVersionWatch";

/** The editor listens for this and writes the design to the browser at once. */
export const SAVE_NOW_EVENT = "layerling:save-now";

/** Why the reload is offered: the server has a newer build, or a part of this page is from another one. */
export type NewVersionReason = "update" | "mismatch";

/**
 * The offer to reload, or null. Two things bring it. In the published program (the static export)
 * the first answer of the server is what the page started with, and every later one is compared
 * to it - while the page is visible, when it comes back to the front or the connection returns,
 * and at once when a program file it asks for is gone. And everywhere, a worker that reports
 * another build than the page (lib/buildStamp.ts) means a stored or half-updated file.
 */
export function useNewVersionNotice() {
  const [offer, setOffer] = useState<{ latest: VersionInfo; reason: NewVersionReason } | null>(null);
  const [hiddenUntil, setHiddenUntil] = useState(0);
  const started = useRef<VersionInfo | null>(null);
  const announced = useRef(false);

  const check = useCallback(async () => {
    if (announced.current) return;
    const info = await fetchVersionInfo();
    if (!info) return;
    if (!started.current) {
      started.current = info;
      return;
    }
    if (isNewBuild(started.current, info)) {
      announced.current = true;
      setOffer({ latest: info, reason: "update" });
    }
  }, []);

  useEffect(() => {
    const onMismatch = () => {
      if (announced.current) return;
      announced.current = true;
      // What the server has now makes the offer concrete; without an answer it is made all the same.
      void fetchVersionInfo().then((info) => setOffer({ latest: info ?? { version: "", build: "", highlights: [] }, reason: "mismatch" }));
    };
    window.addEventListener(BUILD_MISMATCH_EVENT, onMismatch);
    return () => window.removeEventListener(BUILD_MISMATCH_EVENT, onMismatch);
  }, []);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_STATIC_EXPORT !== "true") return;
    void check();
    // A test can ask more often; nobody else needs to.
    const override = (window as unknown as { __layerlingVersionCheckMs?: number }).__layerlingVersionCheckMs;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void check();
    }, override ?? VERSION_CHECK_INTERVAL_MS);
    const whenBack = () => {
      if (document.visibilityState === "visible") void check();
    };
    const onError = (event: ErrorEvent) => {
      if (looksLikeMissingProgramFile(`${event.message} ${event.error?.name ?? ""}`)) void check();
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason as { name?: string; message?: string } | string | undefined;
      const text = typeof reason === "string" ? reason : `${reason?.name ?? ""} ${reason?.message ?? ""}`;
      if (looksLikeMissingProgramFile(text)) void check();
    };
    document.addEventListener("visibilitychange", whenBack);
    window.addEventListener("online", whenBack);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", whenBack);
      window.removeEventListener("online", whenBack);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, [check]);

  // "Later" holds the offer back for a while; it comes again, as staying on the old version is the risk.
  const [, tick] = useState(0);
  useEffect(() => {
    if (!hiddenUntil) return;
    const timer = window.setTimeout(() => {
      setHiddenUntil(0);
      tick((value) => value + 1);
    }, Math.max(0, hiddenUntil - Date.now()));
    return () => window.clearTimeout(timer);
  }, [hiddenUntil]);

  const [state, setState] = useState<"idle" | "saving" | "notSaved">("idle");
  const later = useCallback(() => {
    setHiddenUntil(Date.now() + VERSION_LATER_MS);
    setState("idle");
  }, []);

  /**
   * Saves what is open, then loads the page again; the address still names the open design. It waits for the save
   * itself rather than a fixed moment, and a design the browser would not store is not thrown away by the reload
   * (#1639): the notice says so and leaves the choice, with "Reload anyway".
   */
  const reload = useCallback(async () => {
    setState("saving");
    window.dispatchEvent(new Event(SAVE_NOW_EVENT));
    if (!(await designsSettled())) {
      setState("notSaved");
      return;
    }
    releaseLeaveGuard();
    window.location.reload();
  }, []);
  // Once a save gets through after all, the offer is the plain one again.
  useEffect(() => {
    if (state !== "notSaved") return;
    const timer = window.setInterval(() => {
      const { saving, unsaved } = designSaveState();
      if (!saving && !unsaved) setState("idle");
    }, 1000);
    return () => window.clearInterval(timer);
  }, [state]);
  const reloadAnyway = useCallback(() => {
    releaseLeaveGuard();
    window.location.reload();
  }, []);

  const visible = offer !== null && hiddenUntil <= Date.now();
  return { latest: visible ? offer.latest : null, reason: offer?.reason ?? "update", later, reload, reloadAnyway, state };
}
