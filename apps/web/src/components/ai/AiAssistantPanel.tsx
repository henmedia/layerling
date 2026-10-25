"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Check, CircleAlert, Loader, RotateCcw, Send, Settings2, Sparkles, Square, X } from "lucide-react";
import { t, type MessageKey } from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";
import { useMovablePanel } from "@/lib/useMovablePanel";
import type { LayerlingMcpCommandName } from "@/lib/layerlingMcpProtocol";
import { runAssistantTurn, MAX_MODEL_TURNS_PER_MESSAGE, type AssistantEvent } from "@/lib/ai/agent";
import type { ChatMessage } from "@/lib/ai/openaiClient";
import { AI_ASSISTANT_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { aiSettingsProblem, loadAiSettings, normalizeBaseUrl, saveAiSettings, type AiSettings } from "@/lib/ai/settings";
import { AI_CHAT_PROXY_ENDPOINT, probeAiServerConfig, type AiServerProbe } from "@/lib/ai/serverConfig";

export type AiAssistantPanelProps = {
  /** The history view is open: the design shown is not the one to change, so nothing here is clickable. */
  inert?: boolean;
  runCommand: (action: LayerlingMcpCommandName, params: Record<string, unknown>) => Promise<unknown>;
  onClose: () => void;
};

/** What the panel shows; the model's own history is kept separately in lib/ai. */
type PanelItem =
  | { kind: "user"; text: string }
  | { kind: "assistant"; text: string }
  | { kind: "reasoning"; text: string }
  | { kind: "error"; text: string }
  | { kind: "note"; text: string }
  | { kind: "tool"; callId: string; tool: string; args: Record<string, unknown>; state: "running" | "ok" | "error"; summary: string; open: boolean };

const AI_PANEL_WIDTH = 340;

/** Docked in the free top-right corner of the viewport; the CSS knows this spot too. */
const AI_PANEL_DOCK = { right: 12, top: 96 };

export function AiAssistantPanel({ inert = false, runCommand, onClose }: AiAssistantPanelProps) {
  useLanguage();
  const movable = useMovablePanel("layerling.editor.aiPosition", {
    dockedAt: (area) => ({ left: Math.max(0, area.width - AI_PANEL_WIDTH - AI_PANEL_DOCK.right), top: AI_PANEL_DOCK.top }),
  });

  const [items, setItems] = useState<PanelItem[]>([]);
  const historyRef = useRef<ChatMessage[]>([{ role: "system", content: AI_ASSISTANT_SYSTEM_PROMPT }]);
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const [settings, setSettings] = useState<AiSettings | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  // null while the answer of this server is still out; a copy served as plain
  // files has no route to answer, so there the probe is answered locally.
  const [serverProbe, setServerProbe] = useState<AiServerProbe | null>(null);
  const serverConfigured = serverProbe?.configured === true;

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_STATIC_EXPORT === "true") {
      setServerProbe({ configured: false, model: null });
      return;
    }
    let alive = true;
    void probeAiServerConfig().then((probe) => {
      if (alive) setServerProbe(probe);
    });
    return () => {
      alive = false;
    };
  }, []);

  // The stored settings belong to the browser, so they are read after mounting.
  useEffect(() => {
    setSettings(loadAiSettings());
  }, []);

  // What the turns are asked with: the server's model when this deployment has
  // one, the browser's own endpoint otherwise. The settings window only opens
  // for the second case - and only once both answers are in.
  const effectiveSettings: AiSettings | null = serverProbe === null || settings === null
    ? null
    : serverConfigured
      ? { baseUrl: AI_CHAT_PROXY_ENDPOINT, apiKey: "", model: serverProbe.model ?? "" }
      : settings;

  useEffect(() => {
    if (serverProbe && !serverProbe.configured && settings && aiSettingsProblem(settings)) setShowSettings(true);
  }, [serverProbe, settings]);

  const bodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const body = bodyRef.current;
    if (body) body.scrollTop = body.scrollHeight;
  }, [items, busy, showSettings]);

  const handleEvent = (event: AssistantEvent) => {
    setItems((prev) => {
      switch (event.type) {
        case "text-delta": {
          const last = prev[prev.length - 1];
          if (last && last.kind === "assistant") {
            return [...prev.slice(0, -1), { ...last, text: last.text + event.text }];
          }
          return [...prev, { kind: "assistant", text: event.text }];
        }
        case "reasoning-delta": {
          const last = prev[prev.length - 1];
          if (last && last.kind === "reasoning") {
            return [...prev.slice(0, -1), { ...last, text: last.text + event.text }];
          }
          return [...prev, { kind: "reasoning", text: event.text }];
        }
        case "tool-start":
          return [
            ...prev.filter((item) => item.kind !== "reasoning"),
            { kind: "tool", callId: event.callId, tool: event.tool, args: event.args, state: "running", summary: "", open: false },
          ];
        case "tool-result": {
          return prev.map((item) => (item.kind === "tool" && item.callId === event.callId
            ? { ...item, state: event.ok ? "ok" : "error", summary: event.summary }
            : item));
        }
        default:
          return prev;
      }
    });
  };

  const send = (text: string) => {
    const value = text.trim();
    if (!value || busy || !effectiveSettings) return;
    if (!serverConfigured) {
      const problem = aiSettingsProblem(effectiveSettings);
      if (problem) {
        setShowSettings(true);
        setItems((prev) => [...prev, { kind: "error", text: t(`ai.settings.problem.${problem}` as MessageKey) }]);
        return;
      }
    }
    setBusy(true);
    setItems((prev) => [...prev.filter((item) => item.kind !== "reasoning"), { kind: "user", text: value }]);
    const controller = new AbortController();
    abortRef.current = controller;
    const before = historyRef.current;
    const settingsForTurn = effectiveSettings;
    void runAssistantTurn({ settings: settingsForTurn, history: before, userText: value, runCommand, onEvent: handleEvent, signal: controller.signal })
      .then((result) => {
        historyRef.current = result.history;
        if (result.outcome === "turn-limit") {
          setItems((prev) => [...prev, { kind: "note", text: t("ai.turnLimit", { count: MAX_MODEL_TURNS_PER_MESSAGE }) }]);
        } else if (result.outcome === "stuck") {
          setItems((prev) => [...prev, { kind: "note", text: t("ai.stuckLoop") }]);
        } else if (result.outcome === "stopped") {
          setItems((prev) => [...prev, { kind: "note", text: t("ai.stopped") }]);
        }
      })
      .catch((error: unknown) => {
        // Keep the question in the record: the next try should read the same page.
        historyRef.current = [...before, { role: "user", content: value }];
        if (error instanceof DOMException && error.name === "AbortError") {
          setItems((prev) => [...prev.filter((item) => item.kind !== "reasoning"), { kind: "note", text: t("ai.stopped") }]);
        } else {
          setItems((prev) => [...prev.filter((item) => item.kind !== "reasoning"), {
            kind: "error",
            text: error instanceof Error ? error.message : String(error),
          }]);
        }
      })
      .finally(() => {
        abortRef.current = null;
        setBusy(false);
      });
  };

  const stop = () => abortRef.current?.abort();

  const clearChat = () => {
    historyRef.current = [{ role: "system", content: AI_ASSISTANT_SYSTEM_PROMPT }];
    setItems([]);
  };

  return (
    <div
      ref={movable.panelRef}
      className={`ai-panel${movable.dragging ? " moving" : ""}`}
      style={movable.style}
      inert={inert}
      role="region"
      aria-label={t("ai.title")}
    >
      <header className="ai-header" title={t("ai.moveHint")} {...movable.handleProps}>
        <div className="ai-title-wrap">
          <Sparkles size={16} aria-hidden="true" className="ai-header-icon" />
          <strong>{t("ai.title")}</strong>
        </div>
        <div className="ai-header-actions">
          {serverConfigured ? null : (
            <button
              className="ai-header-button"
              type="button"
              aria-label={t("ai.settings")}
              title={t("ai.settings")}
              onClick={() => setShowSettings((open) => !open)}
            >
              <Settings2 size={15} />
            </button>
          )}
          <button
            className="ai-header-button"
            type="button"
            aria-label={t("ai.clear")}
            title={t("ai.clear")}
            onClick={clearChat}
          >
            <RotateCcw size={15} />
          </button>
          <button className="ai-header-button" type="button" aria-label={t("panel.close", { title: t("ai.title") })} title={t("panel.close", { title: t("ai.title") })} onClick={onClose}>
            <X size={16} />
          </button>
        </div>
      </header>

      {showSettings && !serverConfigured ? (
        <SettingsCard
          initial={settings ?? { baseUrl: "", apiKey: "", model: "" }}
          onSaved={(next) => {
            setSettings(next);
            setShowSettings(false);
          }}
          onCancel={() => setShowSettings(false)}
        />
      ) : null}

      <div className="ai-body" ref={bodyRef}>
        {serverConfigured ? <p className="ai-empty">{t("ai.serverConfigured", { model: serverProbe?.model ?? "" })}</p> : null}
        {items.length === 0 && !busy ? <p className="ai-empty">{t("ai.emptyHint")}</p> : null}
        <ul className="ai-items">
          {items.map((item, index) => (
            <ItemRow key={index} item={item} onToggleTool={(callId) => setItems((prev) => prev.map((entry) => entry.kind === "tool" && entry.callId === callId ? { ...entry, open: !entry.open } : entry))} />
          ))}
          {busy ? <li className="ai-busy"><Loader size={13} className="ai-spin" aria-hidden="true" />{t("ai.running")}</li> : null}
        </ul>
      </div>

      <Composer busy={busy} onSend={send} onStop={stop} disabled={effectiveSettings === null} />
    </div>
  );
}

function ItemRow({ item, onToggleTool }: { item: PanelItem; onToggleTool: (callId: string) => void }) {
  if (item.kind === "user") return <li className="ai-item ai-item-user">{item.text}</li>;
  if (item.kind === "assistant") return <li className="ai-item ai-item-assistant">{item.text}</li>;
  if (item.kind === "reasoning") return <li className="ai-item ai-item-reasoning">{item.text}</li>;
  if (item.kind === "error") return <li className="ai-item ai-item-error"><CircleAlert size={13} aria-hidden="true" /><span>{item.text}</span></li>;
  if (item.kind === "note") return <li className="ai-item ai-item-note">{item.text}</li>;
  const shortName = item.tool.replace(/^layerling_/, "");
  const label = toolLabel(shortName);
  return (
    <li className={`ai-item ai-item-tool state-${item.state}`}>
      <button type="button" className="ai-tool-row" onClick={() => onToggleTool(item.callId)} aria-expanded={item.open}>
        {item.state === "running" ? <Loader size={13} className="ai-spin" aria-hidden="true" />
          : item.state === "ok" ? <Check size={13} aria-hidden="true" className="ai-tool-check" />
            : <CircleAlert size={13} aria-hidden="true" className="ai-tool-cross" />}
        <span className="ai-tool-name">{label}</span>
        <span className="ai-tool-args">{argsSummary(item.args)}</span>
      </button>
      {item.open ? (
        <div className="ai-tool-detail">
          <pre>{JSON.stringify(item.args, null, 1).slice(0, 600)}</pre>
          {item.summary ? <pre className="ai-tool-result">{item.summary.slice(0, 600)}</pre> : null}
        </div>
      ) : null}
    </li>
  );
}

/** The catalogue's own short name as words of the interface, falling back to the name itself. */
function toolLabel(shortName: string): string {
  const key = `ai.tool.${shortName}` as MessageKey;
  const translated = t(key);
  return translated === key ? shortName : translated;
}

/** One quiet line of what the call asked for, before the person opens it. */
function argsSummary(args: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(args)) {
    if (key === "editorNumber" || key === "editorId" || key === "timeoutMs") continue;
    if (value === undefined || value === null) continue;
    let rendered: string;
    if (typeof value === "string") rendered = value.length > 20 ? `${value.slice(0, 20)}…` : value;
    else if (typeof value === "number" || typeof value === "boolean") rendered = String(value);
    else {
      try {
        rendered = JSON.stringify(value);
        if (rendered.length > 20) rendered = `${rendered.slice(0, 20)}…`;
      } catch {
        rendered = "…";
      }
    }
    parts.push(`${key} ${rendered}`);
    if (parts.length >= 4) break;
  }
  return parts.join(" · ");
}

function Composer({ busy, disabled, onSend, onStop }: { busy: boolean; disabled: boolean; onSend: (text: string) => void; onStop: () => void }) {
  const [draft, setDraft] = useState("");
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!busy) {
        onSend(draft);
        setDraft("");
      }
    }
  };
  return (
    <div className="ai-composer">
      <textarea
        className="ai-input"
        rows={2}
        placeholder={t("ai.placeholder")}
        value={draft}
        disabled={disabled}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
      />
      <div className="ai-composer-actions">
        {busy ? (
          <button className="ai-button" type="button" onClick={onStop}>
            <Square size={13} aria-hidden="true" />
            {t("ai.stop")}
          </button>
        ) : (
          <button className="ai-button primary" type="button" disabled={disabled || !draft.trim()} onClick={() => { onSend(draft); setDraft(""); }}>
            <Send size={13} aria-hidden="true" />
            {t("ai.send")}
          </button>
        )}
      </div>
    </div>
  );
}

function SettingsCard({ initial, onSaved, onCancel }: { initial: AiSettings; onSaved: (next: AiSettings) => void; onCancel: () => void }) {
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl);
  const [apiKey, setApiKey] = useState(initial.apiKey);
  const [model, setModel] = useState(initial.model);
  const problem = useMemo(() => aiSettingsProblem({ baseUrl, apiKey, model }), [baseUrl, apiKey, model]);
  const save = () => {
    const next: AiSettings = { baseUrl: normalizeBaseUrl(baseUrl), apiKey: apiKey.trim(), model: model.trim() };
    saveAiSettings(next);
    onSaved(next);
  };
  return (
    <div className="ai-settings" role="group" aria-label={t("ai.settings")}>
      <label className="ai-settings-field">
        <span>{t("ai.settings.baseUrl")}</span>
        <input type="text" value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder="https://api.openai.com/v1" spellCheck={false} />
      </label>
      <label className="ai-settings-field">
        <span>{t("ai.settings.apiKey")}</span>
        <input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="sk-…" autoComplete="off" spellCheck={false} />
      </label>
      <label className="ai-settings-field">
        <span>{t("ai.settings.model")}</span>
        <input type="text" value={model} onChange={(event) => setModel(event.target.value)} placeholder="gpt-4o-mini" spellCheck={false} />
      </label>
      <p className="ai-settings-note">{t("ai.settings.note")}</p>
      <div className="ai-settings-actions">
        <button className="ai-button" type="button" onClick={onCancel}>{t("common.cancel")}</button>
        <button className="ai-button primary" type="button" disabled={problem !== null} onClick={save}>{t("common.save")}</button>
      </div>
    </div>
  );
}
