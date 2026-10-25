/**
 * The server-side way of pointing the built-in assistant at a model: the
 * operator writes LAYERLING_AI_BASE_URL / LAYERLING_AI_API_KEY / LAYERLING_AI_MODEL
 * (or the plainer BASE_URL / API_KEY / MODEL_ID a provider's own example uses)
 * in the environment of the Node build, or in apps/web/.env - the file Next
 * reads for the folder it serves, not the one in the repository root - and
 * the browser talks to this app's own `/api/ai-chat` route instead of to the
 * model server directly. That is how a deployment sidesteps CORS - most hosted
 * model APIs refuse a request that carries a browser Origin - and keeps the
 * key on the server, where it never reaches the page.
 *
 * A copy served as plain files has no route to ask, so there the probe says
 * "nothing configured" and the panel falls back to its own settings.
 */

export const AI_CHAT_PROXY_ENDPOINT = "/api/ai-chat";
export const AI_BASE_URL_ENV = "LAYERLING_AI_BASE_URL";
export const AI_API_KEY_ENV = "LAYERLING_AI_API_KEY";
export const AI_MODEL_ENV = "LAYERLING_AI_MODEL";

/*
 * The plain names are the ones a model provider's own examples use, so a
 * deployment that already has BASE_URL / API_KEY / MODEL_ID in its .env works
 * without anyone editing that file. The LAYERLING_AI_ names win when both are
 * present: on a shared host a bare API_KEY may not be meant for layerling.
 */
export const AI_BASE_URL_PLAIN_ENV = "BASE_URL";
export const AI_API_KEY_PLAIN_ENV = "API_KEY";
export const AI_MODEL_PLAIN_ENV = "MODEL_ID";

function firstSetting(environment: Record<string, string | undefined>, ...names: string[]): string {
  for (const name of names) {
    // A loader that keeps the quotes of `KEY="value"` is tolerated here.
    const value = (environment[name] ?? "").trim().replace(/^(["'])(.*)\1$/, "$2").trim();
    if (value) return value;
  }
  return "";
}

export type AiServerConfig = {
  /** Normalised OpenAI-compatible base URL, no trailing slash. */
  baseUrl: string;
  apiKey: string;
  model: string;
};

/** Trim, drop a trailing slash, and accept only http(s) URLs; anything else is nothing. */
function parseUpstreamBaseUrl(value: string): string | null {
  const url = value.replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(url)) return null;
  return url;
}

/** What the environment says; null when a deployment has not pointed layerling at a model. */
export function aiServerConfigFromEnvironment(
  environment: Record<string, string | undefined>,
): AiServerConfig | null {
  const baseUrl = parseUpstreamBaseUrl(firstSetting(environment, AI_BASE_URL_ENV, AI_BASE_URL_PLAIN_ENV));
  const model = firstSetting(environment, AI_MODEL_ENV, AI_MODEL_PLAIN_ENV);
  if (!baseUrl || !model) return null;
  // A local upstream (Ollama and friends on the same box) may need no key.
  return { baseUrl, apiKey: firstSetting(environment, AI_API_KEY_ENV, AI_API_KEY_PLAIN_ENV), model };
}

export type AiServerProbe = {
  configured: boolean;
  /** The model's name, so the panel can show which one it uses. Never the key. */
  model: string | null;
};

/**
 * Asks this app's own route whether the server has a model configured. Any
 * failure - static hosting without the route, an offline server, an answer
 * that is not ours - simply means "use the panel's own settings".
 */
export async function probeAiServerConfig(fetchImpl: typeof fetch = fetch): Promise<AiServerProbe> {
  const none: AiServerProbe = { configured: false, model: null };
  try {
    const response = await fetchImpl(AI_CHAT_PROXY_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ probe: true }),
    });
    if (!response.ok) return none;
    const body = (await response.json()) as { configured?: unknown; model?: unknown } | null;
    if (body?.configured !== true) return none;
    return { configured: true, model: typeof body.model === "string" && body.model ? body.model : null };
  } catch {
    return none;
  }
}
