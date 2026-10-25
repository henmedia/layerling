import { afterEach, describe, expect, it, vi } from "vitest";
import { ChatRequestError, streamChatCompletion } from "@/lib/ai/openaiClient";
import type { AiSettings } from "@/lib/ai/settings";

/*
 * The SSE reader of the AI client, tested against scripted streams: text
 * deltas, tool-call fragments split across events, the [DONE] sentinel,
 * keep-alive noise, an HTTP error, and an unreachable server.
 */

const settings: AiSettings = { baseUrl: "https://api.example.com/v1/", apiKey: "secret-key", model: " test-model " };

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

function toolCallEvent(part: Record<string, unknown>): string {
  return `data: ${JSON.stringify({ choices: [{ delta: { tool_calls: [part] } }] })}\n\n`;
}

function stubFetch(response: Response) {
  const fetchMock = vi.fn(async () => response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("streamChatCompletion", () => {
  it("posts to the normalised base URL and collects text deltas", async () => {
    const fetchMock = stubFetch(sseResponse([textEvent("Hello "), textEvent("world"), DONE]));
    const pieces: string[] = [];
    const result = await streamChatCompletion({
      settings,
      messages: [{ role: "user", content: "hi" }],
      tools: [{ type: "function" }],
      signal: new AbortController().signal,
      handlers: { onText: (delta) => pieces.push(delta) },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.example.com/v1/chat/completions");
    const body = JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body));
    expect(body.model).toBe("test-model");
    expect(body.stream).toBe(true);
    expect(body.tool_choice).toBe("auto");
    expect((fetchMock.mock.calls[0][1] as RequestInit).headers).toMatchObject({ Authorization: "Bearer secret-key" });
    expect(result.content).toBe("Hello world");
    expect(pieces).toEqual(["Hello ", "world"]);
    expect(result.toolCalls).toEqual([]);
  });

  it("sends no Authorization header when the key is empty", async () => {
    const fetchMock = stubFetch(sseResponse([DONE]));
    await streamChatCompletion({
      settings: { ...settings, apiKey: "  " },
      messages: [],
      tools: [],
      signal: new AbortController().signal,
    });
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.headers).not.toHaveProperty("Authorization");
    // No tools means no tool fields in the request either.
    expect(JSON.parse(String(init.body)).tools).toBeUndefined();
  });

  it("stitches tool-call fragments back together across events", async () => {
    const response = sseResponse([
      toolCallEvent({ index: 0, id: "call_1", function: { name: "layerling_", arguments: "" } }),
      toolCallEvent({ index: 0, function: { name: "create_shape", arguments: '{"kind":' } }),
      toolCallEvent({ index: 0, function: { arguments: '"cube"}' } }),
      toolCallEvent({ index: 1, id: "call_2", function: { name: "layerling_list_objects", arguments: "{}" } }),
      DONE,
    ]);
    stubFetch(response);
    const result = await streamChatCompletion({
      settings,
      messages: [],
      tools: [{}],
      signal: new AbortController().signal,
    });
    expect(result.toolCalls).toHaveLength(2);
    expect(result.toolCalls[0]).toEqual({ id: "call_1", name: "layerling_create_shape", args: { kind: "cube" } });
    expect(result.toolCalls[1]).toEqual({ id: "call_2", name: "layerling_list_objects", args: {} });
  });

  it("hands unparsable arguments back marked, for the model to restate", async () => {
    stubFetch(sseResponse([toolCallEvent({ index: 0, id: "c", function: { name: "layerling_get_scene", arguments: "{oops" } }), DONE]));
    const result = await streamChatCompletion({
      settings,
      messages: [],
      tools: [{}],
      signal: new AbortController().signal,
    });
    expect(result.toolCalls[0].args.__unparsableArguments).toBe("{oops");
  });

  it("stops at [DONE] and ignores whatever trails behind it", async () => {
    stubFetch(sseResponse([textEvent("kept"), DONE, textEvent("dropped")]));
    const result = await streamChatCompletion({
      settings,
      messages: [],
      tools: [],
      signal: new AbortController().signal,
    });
    expect(result.content).toBe("kept");
  });

  it("accepts an answer from a stream that ends without [DONE]", async () => {
    stubFetch(sseResponse([textEvent("all of it")]));
    const result = await streamChatCompletion({
      settings,
      messages: [],
      tools: [],
      signal: new AbortController().signal,
    });
    expect(result.content).toBe("all of it");
  });

  it("reassembles events split across chunks and skips keep-alive noise", async () => {
    const whole = textEvent("split answer");
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const bytes = encoder.encode(whole);
        controller.enqueue(bytes.slice(0, 9));
        controller.enqueue(bytes.slice(9));
        // A comment line and a broken payload must not end the stream.
        controller.enqueue(encoder.encode(": keep-alive\n\ndata: not-json\n\n"));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });
    stubFetch(new Response(stream, { status: 200 }));
    const result = await streamChatCompletion({
      settings,
      messages: [],
      tools: [],
      signal: new AbortController().signal,
    });
    expect(result.content).toBe("split answer");
  });

  it("reports an HTTP error with the status and a body digest", async () => {
    stubFetch(new Response('{"error":{"message":"model not found"}}', { status: 404 }));
    await expect(
      streamChatCompletion({
        settings,
        messages: [],
        tools: [],
        signal: new AbortController().signal,
      }),
    ).rejects.toThrow(ChatRequestError);
    stubFetch(new Response("model not found", { status: 400 }));
    await expect(
      streamChatCompletion({
        settings,
        messages: [],
        tools: [],
        signal: new AbortController().signal,
      }),
    ).rejects.toThrow(/HTTP 400.*model not found/);
  });

  it("names what to check when the server cannot be reached", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new TypeError("fetch failed");
    }));
    await expect(
      streamChatCompletion({
        settings,
        messages: [],
        tools: [],
        signal: new AbortController().signal,
      }),
    ).rejects.toThrow(/Cannot reach .*CORS/);
  });

  it("lets a genuine abort through as AbortError", async () => {
    const controller = new AbortController();
    controller.abort("user stopped");
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init: RequestInit) => {
      (init.signal as AbortSignal).throwIfAborted();
      return new Response(null, { status: 200 });
    }));
    await expect(
      streamChatCompletion({
        settings,
        messages: [],
        tools: [],
        signal: controller.signal,
      }),
    ).rejects.toBeTruthy();
  });
});
