import { afterEach, describe, expect, it, vi } from "vitest";
import { runAssistantTurn, MAX_REPEAT_READS, PICTURE_NOTE } from "@/lib/ai/agent";
import type { AssistantEvent } from "@/lib/ai/agent";
import type { ChatMessage } from "@/lib/ai/openaiClient";
import type { LayerlingMcpCommandName } from "@/lib/layerlingMcpProtocol";
import type { AiSettings } from "@/lib/ai/settings";

/*
 * The conversation loop, tested end to end against a scripted model server:
 * the real SSE client parses fake streams, fake editor commands answer the
 * tool calls. This is where a tool reply must go back so the model can see
 * it - a mistake here silently breaks every build.
 */

const settings: AiSettings = { baseUrl: "http://localhost:1234/v1", apiKey: "", model: "test-model" };

const DONE = "data: [DONE]\n\n";

function sseResponse(events: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const event of events) controller.enqueue(encoder.encode(event));
      controller.close();
    },
  });
  return new Response(stream, { status: 200 });
}

function textEvent(text: string): string {
  return `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`;
}

function reasoningEvent(text: string): string {
  return `data: ${JSON.stringify({ choices: [{ delta: { reasoning_content: text } }] })}\n\n`;
}

function toolCallEvent(id: string, name: string, args: string): string {
  return `data: ${JSON.stringify({ choices: [{ delta: { tool_calls: [{ index: 0, id, function: { name, arguments: args } }] } }] })}\n\n`;
}

/** Queue one scripted model answer per call; each is a list of SSE events. */
function queueStreams(...answers: string[][]) {
  const responses = answers.map((events) => sseResponse(events));
  const fetchMock = vi.fn(async () => responses.shift() as Response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function baseOptions(runCommand: (action: LayerlingMcpCommandName, params: Record<string, unknown>) => Promise<unknown>) {
  const events: AssistantEvent[] = [];
  return {
    options: {
      settings,
      history: [{ role: "system", content: "sys" } as ChatMessage],
      userText: "make a cube",
      runCommand,
      onEvent: (event: AssistantEvent) => events.push(event),
      signal: new AbortController().signal,
    },
    events,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("runAssistantTurn", () => {
  it("runs a tool, hands the answer back, and stops at the plain reply", async () => {
    const runCommand = vi.fn(async () => ({ ok: true }));
    const fetchMock = queueStreams(
      [reasoningEvent("thinking…"), toolCallEvent("call_1", "layerling_create_shape", '{"kind":"cube"}'), DONE],
      [textEvent("Done"), DONE],
    );
    const { options, events } = baseOptions(runCommand);
    const result = await runAssistantTurn(options);

    expect(result.outcome).toBe("done");
    expect(runCommand).toHaveBeenCalledWith("create_shape", { kind: "cube" });
    // system, user, assistant(tool_calls), tool, assistant
    expect(result.history.map((message) => message.role)).toEqual(["system", "user", "assistant", "tool", "assistant"]);
    const assistant = result.history[2];
    expect(assistant.content).toBeNull(); // a pure tool call carries no text
    expect(assistant.tool_calls?.[0]).toEqual({ id: "call_1", type: "function", function: { name: "layerling_create_shape", arguments: '{"kind":"cube"}' } });
    expect(result.history[3]).toEqual({ role: "tool", tool_call_id: "call_1", content: '{"ok":true}' });
    // The second request must carry the tool answer back to the model.
    const secondBody = JSON.parse(String((fetchMock.mock.calls[1] as unknown as [string, RequestInit])[1].body));
    expect(secondBody.messages[3]).toMatchObject({ role: "tool", tool_call_id: "call_1" });
    expect(events.map((event) => event.type)).toEqual(["reasoning-delta", "tool-start", "tool-result", "text-delta"]);
  });

  it("answers an unknown tool in words without touching the editor", async () => {
    const runCommand = vi.fn(async () => ({}));
    queueStreams(
      [toolCallEvent("call_1", "layerling_teleport_object", "{}"), DONE],
      [textEvent("sorry"), DONE],
    );
    const { options } = baseOptions(runCommand);
    const result = await runAssistantTurn(options);
    expect(runCommand).not.toHaveBeenCalled();
    expect(String(result.history[3].content)).toContain("Unknown tool");
    expect(result.history[3]).toMatchObject({ role: "tool", tool_call_id: "call_1" });
  });

  it("strips the bridge addressing fields a model may copy from old answers", async () => {
    const runCommand = vi.fn(async () => "ok");
    queueStreams(
      [toolCallEvent("c1", "layerling_list_objects", '{"editorNumber":12345,"editorId":"x","timeoutMs":99,"name":"brick"}'), DONE],
      [textEvent("done"), DONE],
    );
    const { options } = baseOptions(runCommand);
    await runAssistantTurn(options);
    expect(runCommand).toHaveBeenCalledWith("list_objects", { name: "brick" });
  });

  it("lets the editor's failure text reach the model for self-correction", async () => {
    const runCommand = vi.fn(async () => {
      throw new Error("no object named brick");
    });
    queueStreams(
      [toolCallEvent("c1", "layerling_delete_objects", '{"names":["brick"]}'), DONE],
      [textEvent("my bad"), DONE],
    );
    const { options, events } = baseOptions(runCommand);
    const result = await runAssistantTurn(options);
    expect(result.history[3].content).toBe("Error: no object named brick");
    const toolResult = events.find((event) => event.type === "tool-result");
    expect(toolResult).toMatchObject({ ok: false });
  });

  it("sends a captured picture as image content next to the text", async () => {
    const runCommand = vi.fn(async () => ({ dataUrl: "data:image/png;base64,PIX", width: 800 }));
    queueStreams(
      [toolCallEvent("c1", "layerling_capture_image", "{}"), DONE],
      [textEvent("I see it"), DONE],
    );
    const { options } = baseOptions(runCommand);
    const result = await runAssistantTurn(options);
    expect(result.history[3].content).toEqual([
      // The note is what a model with no eyes reads instead of the picture, and
      // what keeps it from taking another one hoping to see something.
      { type: "text", text: `{"width":800}\n${PICTURE_NOTE}` },
      { type: "image_url", image_url: { url: "data:image/png;base64,PIX" } },
    ]);
  });

  it("answers unparsable arguments instead of running nonsense", async () => {
    const runCommand = vi.fn(async () => ({}));
    queueStreams(
      [toolCallEvent("c1", "layerling_create_shape", "{oops"), DONE],
      [textEvent("retrying"), DONE],
    );
    const { options } = baseOptions(runCommand);
    const result = await runAssistantTurn(options);
    expect(runCommand).not.toHaveBeenCalled();
    expect(String(result.history[3].content)).toContain("not valid JSON");
  });

  it("stops at the turn limit instead of looping forever", async () => {
    const runCommand = vi.fn(async () => "ok");
    // The model asks for a tool in every answer; three turns is all it gets.
    // A call that changes the scene, so the read guard stays out of its way.
    const greedy = [toolCallEvent("c", "layerling_create_shape", '{"kind":"cube"}'), DONE];
    const fetchMock = queueStreams(greedy, greedy, greedy, greedy);
    const { options } = baseOptions(runCommand);
    const result = await runAssistantTurn({ ...options, maxTurns: 3 });
    expect(result.outcome).toBe("turn-limit");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(runCommand).toHaveBeenCalledTimes(3);
  });

  it("refuses a third read of a scene nobody has changed", async () => {
    const runCommand = vi.fn(async () => '{"objects":[]}');
    const read = [toolCallEvent("c", "layerling_list_objects", "{}"), DONE];
    queueStreams(read, read, read, read);
    const { options } = baseOptions(runCommand);
    const result = await runAssistantTurn({ ...options, maxTurns: MAX_REPEAT_READS });
    // The first two looks run; the third would answer what the model already holds.
    expect(runCommand).toHaveBeenCalledTimes(MAX_REPEAT_READS - 1);
    const refused = result.history.filter((message) => String(message.content).startsWith("Not running that"));
    expect(refused).toHaveLength(1);
    expect(String(refused[0].content)).toContain("nothing in the scene has changed");
  });

  it("counts reads from scratch once something has changed the scene", async () => {
    const runCommand = vi.fn(async (action: LayerlingMcpCommandName) => (action === "create_shape" ? "made" : "read"));
    const read = [toolCallEvent("c", "layerling_list_objects", "{}"), DONE];
    const make = [toolCallEvent("c", "layerling_create_shape", '{"kind":"cube"}'), DONE];
    // Two reads, a change, two more reads, and an answer: a build may look.
    queueStreams(read, read, make, read, read, [textEvent("done"), DONE]);
    const { options } = baseOptions(runCommand);
    const result = await runAssistantTurn({ ...options, maxTurns: 6 });
    expect(result.outcome).toBe("done");
    const reads = result.history.filter((message) => message.content === "read");
    expect(reads).toHaveLength(4);
    expect(result.history.some((message) => String(message.content).startsWith("Not running that"))).toBe(false);
  });

  it("gives up on a model that ignores the refusals, with every call answered", async () => {
    const runCommand = vi.fn(async () => "read");
    // Same tool, arguments varied: the model is looking for something it cannot get.
    const answers = Array.from({ length: 8 }, (_, i) => [
      toolCallEvent(`c${i}`, "layerling_capture_image", `{"face":"view-${i}"}`),
      DONE,
    ]);
    const fetchMock = queueStreams(...answers);
    const { options } = baseOptions(runCommand);
    const result = await runAssistantTurn({ ...options, maxTurns: 8 });
    expect(result.outcome).toBe("stuck");
    expect(runCommand).toHaveBeenCalledTimes(MAX_REPEAT_READS - 1);
    // A history the next request can be built on: each announced call is answered.
    for (let i = 0; i < result.history.length; i += 1) {
      const message = result.history[i];
      for (const [offset, call] of (message.tool_calls ?? []).entries()) {
        expect(result.history[i + 1 + offset]).toMatchObject({ role: "tool", tool_call_id: call.id });
      }
    }
    const last = result.history[result.history.length - 1];
    expect(String(last.content)).toContain("Stopped:");
    expect(fetchMock.mock.calls.length).toBeLessThan(8);
  });

  it("settles as stopped when the signal is aborted beforehand", async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchMock = queueStreams([textEvent("never read"), DONE]);
    const runCommand = vi.fn(async () => "ok");
    const { options } = baseOptions(runCommand);
    const result = await runAssistantTurn({ ...options, signal: controller.signal });
    expect(result.outcome).toBe("stopped");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.history.map((message) => message.role)).toEqual(["system", "user"]);
  });

  it("sends the whole conversation and the tool list on every request", async () => {
    const fetchMock = queueStreams([textEvent("hi"), DONE]);
    const { options } = baseOptions(async () => "ok");
    await runAssistantTurn(options);
    const body = JSON.parse(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(body.messages[0]).toMatchObject({ role: "system", content: "sys" });
    expect(body.messages[1]).toMatchObject({ role: "user", content: "make a cube" });
    expect(body.tools.length).toBeGreaterThan(40);
  });
});
