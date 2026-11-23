"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { t, type MessageKey } from "@/lib/i18n";
import { queryTokens } from "@/lib/commandSearch";
import { SETTINGS_KEYWORDS } from "@/lib/settingsKeywords";
import { applySettingsSearch, clearSettingsSearch, closeSearchOpened, SETTINGS_SEARCH_ATTRIBUTES, type SettingsSearchCounts } from "@/lib/settingsSearch";
import { useLanguage } from "@/lib/useLanguage";

/**
 * The search field of the settings window: while something is typed, the window shows all tabs and this leaves only the
 * settings that match. `setMarkedQuery` marks what an earlier search found in the tab it was left for.
 */
export function useSettingsSearch(query: string) {
  const language = useLanguage();
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const [markedQuery, setMarkedQuery] = useState("");
  const [counts, setCounts] = useState<SettingsSearchCounts>({});
  const searching = queryTokens(query).length > 0;
  const wanted = searching ? query : markedQuery;
  const keptRef = useRef<{ query: string; elements: WeakSet<Element> }>({ query: "", elements: new WeakSet() });
  const keywords = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const [key, words] of Object.entries(SETTINGS_KEYWORDS)) {
      const label = t(key as MessageKey);
      map.set(label, [...(map.get(label) ?? []), ...(words ?? [])]);
    }
    return map;
    // The labels are those of the language shown.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  // After every render: React may have put new rows there, and what is marked is not in its hands.
  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    const run = () => {
      body.classList.toggle("search-marked", !searching && Boolean(wanted));
      if (!wanted) {
        clearSettingsSearch(body);
        closeSearchOpened(body);
        return;
      }
      const state = `${searching}:${wanted}`;
      if (keptRef.current.query !== state) keptRef.current = { query: state, elements: new WeakSet() };
      const next = applySettingsSearch(body, { query: wanted, mode: searching ? "filter" : "mark", keywords, kept: keptRef.current.elements });
      if (!searching) return;
      setCounts((current) => (JSON.stringify(current) === JSON.stringify(next) ? current : next));
    };
    run();
    if (!wanted) return;
    // Parts of the window that change on their own, without the window being drawn anew.
    const observer = new MutationObserver(run);
    observer.observe(body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  });

  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    body.scrollTop = 0;
    if (!searching && markedQuery) body.querySelector(`[${SETTINGS_SEARCH_ATTRIBUTES.hit}]`)?.scrollIntoView?.({ block: "center" });
  }, [query, searching, markedQuery]);

  useEffect(() => {
    const body = bodyRef.current;
    return () => {
      if (body) clearSettingsSearch(body);
    };
  }, []);

  return { bodyRef, counts, noHits: searching && Object.values(counts).every((count) => count === 0), searching, setMarkedQuery };
}
