/**
 * The conversation engine of the built-in assistant: ask the model, run the
 * tools it asks for against the open editor, hand the answers back, and go on
 * until the model simply answers. Everything happens in this tab - the loop
 * calls the editor's own executeMcpCommand, the same core the MCP bridge
 * drives from outside.
 */

import type { LayerlingMcpCommandName } from "@/lib/layerlingMcpProtocol";
import { actionForToolName, buildAiAssistantTools, isReadOnlyToolName, serializeToolResult } from "./tools";
import { streamChatCompletion, type AssistantToolCall, type ChatMessage } from "./openaiClient";
import type { AiSettings } from "./settings";

/** One round of the loop costs one request; a long build may honestly need many. */
export const MAX_MODEL_TURNS_PER_MESSAGE = 24;

/**
 * How many times one read may be asked for while nothing has changed. The first
 * read is a look, the second is a double-check, the third is a model that is
 * not listening to its own answers; it gets told so instead of run again.
 */
export const MAX_REPEAT_READS = 3;

/**
 * How many of those tellings one question may buy before the loop gives up on
 * the model and stops. Without it a model that ignores the warning spends all
 * 24 turns, which is what the person sees as a runaway.
 */
export const MAX_REFUSED_READS = 3;

/**
 * Said with every picture. The endpoint may be a text-only model, and a model
 * with no eyes keeps taking another picture hoping to see one; this line gives
 * it something else to do.
 */
export const PICTURE_NOTE = "The picture is the other part of this message. If no picture reaches you, do not take another one - say what you judged from the numbers instead.";

export type AssistantEvent =
  | { type: "text-delta"; text: string }
  | { type: "reasoning-delta"; text: string }
  | { type: "tool-start"; callId: string; tool: string; args: Record<string, unknown> }
  | { type: "tool-result"; callId: string; tool: string; ok: boolean; summary: string };

export type AssistantRunOptions = {
  settings: AiSettings;
  /** The conversation so far, system message first; the user turn is appended here. */
  history: ChatMessage[];
  userText: string;
  /** Runs one editor command; rejects with a message the model gets to read. */
  runCommand: (action: LayerlingMcpCommandName, params: Record<string, unknown>) => Promise<unknown>;
  onEvent: (event: AssistantEvent) => void;
  signal: AbortSignal;
  maxTurns?: number;
};

export type AssistantRunResult = {
  /** The history with this turn's user, assistant and tool messages appended. */
  history: ChatMessage[];
  /** Why the loop stopped: done, stopped (aborted), out of turns, or repeating itself. */
  outcome: "done" | "stopped" | "turn-limit" | "stuck";
};

/**
 * Runs one user turn to its end. Throws what the stream throws (the caller
 * shows it in the panel); an abort settles as outcome "stopped" with the
 * history up to that point.
 */
export async function runAssistantTurn(options: AssistantRunOptions): Promise<AssistantRunResult> {
  const { settings, history, userText, runCommand, onEvent, signal, maxTurns = MAX_MODEL_TURNS_PER_MESSAGE } = options;
  const messages: ChatMessage[] = [...history, { role: "user", content: userText }];
  const tools = buildAiAssistantTools();
  const toolNames = new Set(tools.map((tool) => tool.function.name));
  // Reads counted since the last call that changed something, and the tellings
  // it took before the loop stopped trusting the model.
  const readsSinceChange = new Map<string, number>();
  let refusedReads = 0;

  for (let turn = 0; turn < maxTurns; turn += 1) {
    if (signal.aborted) return { history: messages, outcome: "stopped" };
    const answer = await streamChatCompletion({
      settings,
      messages,
      tools,
      signal,
      handlers: {
        onText: (text) => onEvent({ type: "text-delta", text }),
        onReasoning: (text) => onEvent({ type: "reasoning-delta", text }),
      },
    });

    messages.push({
      role: "assistant",
      content: answer.content || (answer.toolCalls.length > 0 ? null : ""),
      ...(answer.toolCalls.length > 0
        ? {
            tool_calls: answer.toolCalls.map((call) => ({
              id: call.id,
              type: "function" as const,
              function: { name: call.name, arguments: JSON.stringify(call.args) },
            })),
          }
        : {}),
    });

    if (answer.toolCalls.length === 0) return { history: messages, outcome: "done" };

    const stuck = refusedReads >= MAX_REFUSED_READS;
    for (const call of answer.toolCalls) {
      if (signal.aborted) return { history: messages, outcome: "stopped" };
      // Every call the message announced has to be answered, even the ones not
      // run: a tool_calls message with a missing answer is a broken history.
      if (stuck) {
        const reply = `Stopped: you kept asking for the same thing. Tell the person where the build stands in words instead of calling tools.`;
        messages.push({ role: "tool", tool_call_id: call.id, content: reply });
        onEvent({ type: "tool-result", callId: call.id, tool: call.name, ok: false, summary: reply });
        continue;
      }
      const repeat = readRepeat(call, readsSinceChange);
      if (repeat !== null) {
        refusedReads += 1;
        const reply = repeatReply(call.name, repeat);
        messages.push({ role: "tool", tool_call_id: call.id, content: reply });
        onEvent({ type: "tool-result", callId: call.id, tool: call.name, ok: false, summary: reply });
        continue;
      }
      onEvent({ type: "tool-start", callId: call.id, tool: call.name, args: call.args });
      const answer2 = await runToolCall(call, toolNames, runCommand);
      messages.push(answer2.message);
      onEvent({ type: "tool-result", callId: call.id, tool: call.name, ok: answer2.ok, summary: answer2.summary });
      if (!isReadOnlyToolName(call.name)) readsSinceChange.clear();
    }
    if (stuck) return { history: messages, outcome: "stuck" };
  }
  return { history: messages, outcome: "turn-limit" };
}

/**
 * How many times this exact read has already been asked for since anything
 * changed, or null when it is a call worth running. A read of a scene nobody
 * has touched cannot have a different answer; only a call that could have
 * changed the scene resets the count.
 */
function readRepeat(call: AssistantToolCall, readsSinceChange: Map<string, number>): number | null {
  if (!isReadOnlyToolName(call.name)) return null;
  const seen = readsSinceChange.get(call.name) ?? 0;
  readsSinceChange.set(call.name, seen + 1);
  return seen + 1 >= MAX_REPEAT_READS ? seen + 1 : null;
}

function repeatReply(tool: string, count: number): string {
  return `Not running that: you have asked for ${tool} ${count} times and nothing in the scene has changed since the last one, so it would answer the same. Look at what you already have, change something, or answer in words.`;
}

/** A tool's plain-text answer to the model, ok or not. */
function toolReply(callId: string, text: string, ok: boolean): { message: ChatMessage; ok: boolean; summary: string } {
  return { message: { role: "tool", tool_call_id: callId, content: text }, ok, summary: text };
}

async function runToolCall(
  call: AssistantToolCall,
  toolNames: Set<string>,
  runCommand: AssistantRunOptions["runCommand"],
): Promise<{ message: ChatMessage; ok: boolean; summary: string }> {
  if (!toolNames.has(call.name)) {
    return toolReply(call.id, `Unknown tool "${call.name}". It is not on your list; answer with the tools you were given.`, false);
  }
  const action = actionForToolName(call.name);
  if (!action) {
    return toolReply(call.id, `Tool "${call.name}" is not runnable from the assistant.`, false);
  }
  let params: Record<string, unknown> = { ...call.args };
  if ("__unparsableArguments" in params) {
    return toolReply(call.id, `Your arguments were not valid JSON (${String(params.__unparsableArguments).slice(0, 200)}…). Send them again as a JSON object.`, false);
  }
  // The bridge's addressing fields mean nothing here; a model that copies them
  // from old answers should not fail over them.
  for (const field of ["editorNumber", "editorId", "timeoutMs"]) delete params[field];
  try {
    const data = await runCommand(action, params);
    const { text, imageDataUrl } = serializeToolResult(data);
    if (imageDataUrl) {
      // The picture rides along for a model with eyes; a text-only model is
      // told what happened in words and answers accordingly.
      const message: ChatMessage = {
        role: "tool",
        tool_call_id: call.id,
        content: [
          { type: "text", text: `${text || "Picture captured."}\n${PICTURE_NOTE}` },
          { type: "image_url", image_url: { url: imageDataUrl } },
        ],
      };
      return { message, ok: true, summary: text };
    }
    return toolReply(call.id, text, true);
  } catch (error) {
    const messageText = error instanceof Error ? error.message : String(error);
    return toolReply(call.id, `Error: ${messageText}`, false);
  }
}
