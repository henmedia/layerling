/**
 * The smallest possible client for an OpenAI-compatible chat endpoint: one
 * POST to {baseUrl}/chat/completions with stream: true, the server-sent events
 * read apart, and the tool-call fragments stitched back together. No SDK, no
 * dependencies - the editor asks one question of one server the user chose.
 */

import { chatEndpointFor, type AiSettings } from "./settings";

export type ChatContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  /** A string, or parts when a viewport picture rides along (assistant vision). */
  content: string | ChatContentPart[] | null;
  /** Set on the tool answer: the call this message answers. */
  tool_call_id?: string;
  /** Set on an assistant message that asked for tools. */
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
};

export type AssistantToolCall = {
  id: string;
  name: string;
  /** The arguments as the model wrote them, already parsed. */
  args: Record<string, unknown>;
};

export type ChatStreamHandlers = {
  /** Every answer-text fragment as it arrives. */
  onText?: (delta: string) => void;
  /** Reasoning-token fragments (deepseek-r1 and friends), for a "thinking" line. */
  onReasoning?: (delta: string) => void;
};

export type ChatStreamResult = {
  content: string;
  toolCalls: AssistantToolCall[];
};

export class ChatRequestError extends Error {}

type ToolCallFragment = { id: string; name: string; arguments: string };

/**
 * One streamed chat completion. Resolves when the stream is done; throws a
 * ChatRequestError when the endpoint answers an error or refuses to stream.
 * `signal` stops the read mid-flight (AbortError is thrown to the caller).
 */
export async function streamChatCompletion(options: {
  settings: AiSettings;
  messages: ChatMessage[];
  tools: Record<string, unknown>[];
  signal: AbortSignal;
  handlers?: ChatStreamHandlers;
}): Promise<ChatStreamResult> {
  const { settings, messages, tools, signal, handlers } = options;
  // A base URL starting with "/" goes to this app's own proxy (no CORS, key on the server).
  const url = chatEndpointFor(settings.baseUrl);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (settings.apiKey.trim()) headers.Authorization = `Bearer ${settings.apiKey.trim()}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers,
      signal,
      body: JSON.stringify({
        model: settings.model.trim(),
        messages,
        tools: tools.length > 0 ? tools : undefined,
        tool_choice: tools.length > 0 ? "auto" : undefined,
        stream: true,
      }),
    });
  } catch (error) {
    if (signal.aborted) throw error;
    // A CORS refusal and a dead server both only say "fetch failed" here; name
    // what the person can still check.
    throw new ChatRequestError(`Cannot reach ${url}. Check the base URL, that the server runs, and that it allows requests from this page (CORS).`);
  }
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new ChatRequestError(`The model server answered HTTP ${response.status}${detail ? `: ${shorten(detail)}` : "."}`);
  }
  if (!response.body) throw new ChatRequestError("The model server answered without a stream body.");

  const content: string[] = [];
  const toolCalls = new Map<number, ToolCallFragment>();
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      pending += decoder.decode(value, { stream: true });
      // Server-sent events: blocks of "data: …" lines separated by blank lines.
      const blocks = pending.split(/\r?\n\r?\n/);
      pending = blocks.pop() ?? "";
      for (const block of blocks) {
        for (const line of block.split(/\r?\n/)) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload) continue;
          if (payload === "[DONE]") {
            return collect(content, toolCalls);
          }
          let chunk: unknown;
          try {
            chunk = JSON.parse(payload);
          } catch {
            continue; // a keep-alive or a proxy's noise, not an event
          }
          readChunk(chunk, content, toolCalls, handlers);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
  // The stream ended without [DONE]; whatever arrived is the answer.
  return collect(content, toolCalls);
}

function readChunk(
  chunk: unknown,
  content: string[],
  toolCalls: Map<number, ToolCallFragment>,
  handlers?: ChatStreamHandlers,
) {
  const choice = (chunk as { choices?: { delta?: Record<string, unknown>; finish_reason?: string | null }[] })?.choices?.[0];
  const delta = choice?.delta;
  if (!delta) return;
  if (typeof delta.content === "string" && delta.content.length > 0) {
    content.push(delta.content);
    handlers?.onText?.(delta.content);
  }
  // Reasoning tokens are shown live but never put back into the history.
  const reasoning = (delta as { reasoning_content?: unknown }).reasoning_content;
  if (typeof reasoning === "string" && reasoning.length > 0) handlers?.onReasoning?.(reasoning);
  const fragments = (delta as { tool_calls?: { index?: number; id?: string; function?: { name?: string; arguments?: string } }[] }).tool_calls;
  if (!Array.isArray(fragments)) return;
  for (const fragment of fragments) {
    const index = typeof fragment.index === "number" ? fragment.index : toolCalls.size;
    const slot = toolCalls.get(index) ?? { id: "", name: "", arguments: "" };
    if (fragment.id) slot.id = fragment.id;
    if (fragment.function?.name) slot.name += fragment.function.name;
    if (fragment.function?.arguments) slot.arguments += fragment.function.arguments;
    toolCalls.set(index, slot);
  }
}

function collect(content: string[], toolCalls: Map<number, ToolCallFragment>): ChatStreamResult {
  const calls: AssistantToolCall[] = [];
  for (const fragment of toolCalls.values()) {
    if (!fragment.name) continue;
    let args: Record<string, unknown> = {};
    const raw = fragment.arguments.trim();
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) args = parsed as Record<string, unknown>;
        else throw new Error("not an object");
      } catch {
        // A model that writes broken JSON gets the message back as its error;
        // it can restate the call next turn.
        calls.push({ id: fragment.id || `call_${Math.random().toString(36).slice(2)}`, name: fragment.name, args: { __unparsableArguments: raw } });
        continue;
      }
    }
    calls.push({ id: fragment.id || `call_${Math.random().toString(36).slice(2)}`, name: fragment.name, args });
  }
  return { content: content.join(""), toolCalls: calls };
}

function shorten(value: string): string {
  const oneLine = value.replace(/\s+/g, " ").trim();
  return oneLine.length > 300 ? `${oneLine.slice(0, 300)}…` : oneLine;
}
