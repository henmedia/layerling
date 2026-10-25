"use client";

/**
 * Where the built-in assistant finds its model: an OpenAI-compatible endpoint
 * the user types in themselves. The key lives in this browser only and goes to
 * that endpoint only - like every other thing in layerling, nothing passes
 * through a server of ours.
 */

export const AI_SETTINGS_STORAGE_KEY = "layerling.ai.settings";

export type AiSettings = {
  /** Base URL of an OpenAI-compatible API, e.g. https://api.openai.com/v1. */
  baseUrl: string;
  apiKey: string;
  model: string;
};

export const EMPTY_AI_SETTINGS: AiSettings = { baseUrl: "", apiKey: "", model: "" };

export function loadAiSettings(): AiSettings {
  try {
    const raw = window.localStorage.getItem(AI_SETTINGS_STORAGE_KEY);
    if (!raw) return { ...EMPTY_AI_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<AiSettings>;
    return {
      baseUrl: typeof parsed.baseUrl === "string" ? parsed.baseUrl : "",
      apiKey: typeof parsed.apiKey === "string" ? parsed.apiKey : "",
      model: typeof parsed.model === "string" ? parsed.model : "",
    };
  } catch {
    return { ...EMPTY_AI_SETTINGS };
  }
}

export function saveAiSettings(settings: AiSettings): void {
  try {
    window.localStorage.setItem(AI_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Blocked storage: the settings live as long as the tab does.
  }
}

/** Trims and drops a trailing slash, so the chat URL joins without doubling one. */
export function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

/**
 * Where a chat request to this baseUrl goes. An address that starts with "/"
 * is this app's own proxy route (/api/ai-chat, see lib/ai/serverConfig.ts):
 * the page is the server, so there is nothing to join and no CORS to hit.
 * Anything else is an outside endpoint and gets the OpenAI path joined.
 */
export function chatEndpointFor(baseUrl: string): string {
  const normalised = normalizeBaseUrl(baseUrl);
  if (normalised.startsWith("/")) return normalised;
  return `${normalised}/chat/completions`;
}

/** What the assistant needs before it can ask anything; names the missing pieces. */
export function aiSettingsProblem(settings: AiSettings): "baseUrl" | "apiKey" | "model" | null {
  const baseUrl = normalizeBaseUrl(settings.baseUrl);
  if (!baseUrl) return "baseUrl";
  try {
    const url = new URL(baseUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "baseUrl";
  } catch {
    return "baseUrl";
  }
  if (!settings.apiKey.trim() && !isLoopbackBaseUrl(baseUrl)) return "apiKey";
  if (!settings.model.trim()) return "model";
  return null;
}

/**
 * A local server (Ollama, LM Studio, llama.cpp) usually wants no key at all;
 * asking for one there would only block people running a model on their own
 * machine. The loopback addresses count as local.
 */
function isLoopbackBaseUrl(baseUrl: string): boolean {
  try {
    const host = new URL(baseUrl).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "::1";
  } catch {
    return false;
  }
}
