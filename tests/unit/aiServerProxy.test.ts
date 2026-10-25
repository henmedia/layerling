import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/ai-chat/route";
import {
  AI_API_KEY_ENV,
  AI_API_KEY_PLAIN_ENV,
  AI_BASE_URL_ENV,
  AI_BASE_URL_PLAIN_ENV,
  AI_CHAT_PROXY_ENDPOINT,
  AI_MODEL_ENV,
  AI_MODEL_PLAIN_ENV,
  aiServerConfigFromEnvironment,
  probeAiServerConfig,
} from "@/lib/ai/serverConfig";
import { chatEndpointFor } from "@/lib/ai/settings";

/*
 * The server-side way to a model: environment settings, the same-origin
 * proxy route that keeps the key off the page and the CORS out of the way,
 * and the panel's probe that decides which way to ask.
 */

const ENV_KEYS = [
  AI_BASE_URL_ENV,
  AI_API_KEY_ENV,
  AI_MODEL_ENV,
  AI_BASE_URL_PLAIN_ENV,
  AI_API_KEY_PLAIN_ENV,
  AI_MODEL_PLAIN_ENV,
] as const;

function setServerEnvironment(value: Record<string, string | undefined>) {
  for (const key of ENV_KEYS) delete process.env[key];
  for (const [key, val] of Object.entries(value)) {
    if (val !== undefined) process.env[key] = val;
  }
}

afterEach(() => {
  for (const key of ENV_KEYS) delete process.env[key];
  vi.unstubAllGlobals();
});

function sseResponse(): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"hi"}}]}\n\n'));
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
  return new Response(stream, { status: 200, headers: { "Content-Type": "text/event-stream" } });
}

function request(body: unknown): Request {
  return new Request("http://localhost/api/ai-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("aiServerConfigFromEnvironment", () => {
  it("needs a base URL and a model, but not a key", () => {
    expect(aiServerConfigFromEnvironment({})).toBeNull();
    expect(aiServerConfigFromEnvironment({ [AI_BASE_URL_ENV]: "https://api.example.com/v1" })).toBeNull();
    expect(aiServerConfigFromEnvironment({
      [AI_BASE_URL_ENV]: "https://api.example.com/v1",
      [AI_MODEL_ENV]: "gpt-4o-mini",
    })).toEqual({ baseUrl: "https://api.example.com/v1", apiKey: "", model: "gpt-4o-mini" });
  });

  it("trims values and drops a trailing slash, and refuses anything but http(s)", () => {
    expect(aiServerConfigFromEnvironment({
      [AI_BASE_URL_ENV]: "  http://localhost:11434/v1/  ",
      [AI_API_KEY_ENV]: "  secret ",
      [AI_MODEL_ENV]: " llama3 ",
    })?.baseUrl).toBe("http://localhost:11434/v1");
    expect(aiServerConfigFromEnvironment({
      [AI_BASE_URL_ENV]: "file:///etc/passwd",
      [AI_MODEL_ENV]: "m",
    })).toBeNull();
  });
});

describe("the plain names a provider's example uses", () => {
  it("reads BASE_URL, API_KEY and MODEL_ID when nothing prefixed is set", () => {
    expect(aiServerConfigFromEnvironment({
      [AI_BASE_URL_PLAIN_ENV]: "https://dashscope.example.com/compatible-mode/v1",
      [AI_API_KEY_PLAIN_ENV]: "sk-plain",
      [AI_MODEL_PLAIN_ENV]: "deepseek-chat",
    })).toEqual({
      baseUrl: "https://dashscope.example.com/compatible-mode/v1",
      apiKey: "sk-plain",
      model: "deepseek-chat",
    });
  });

  it("prefers the LAYERLING_AI_ names, because a bare API_KEY may be meant for something else", () => {
    expect(aiServerConfigFromEnvironment({
      [AI_BASE_URL_ENV]: "https://ours.example.com/v1",
      [AI_BASE_URL_PLAIN_ENV]: "https://theirs.example.com/v1",
      [AI_API_KEY_ENV]: "sk-ours",
      [AI_API_KEY_PLAIN_ENV]: "sk-theirs",
      [AI_MODEL_ENV]: "ours",
      [AI_MODEL_PLAIN_ENV]: "theirs",
    })).toEqual({ baseUrl: "https://ours.example.com/v1", apiKey: "sk-ours", model: "ours" });
  });

  it("tolerates the quotes a .env file often carries", () => {
    expect(aiServerConfigFromEnvironment({
      [AI_BASE_URL_PLAIN_ENV]: '"https://quoted.example.com/v1"',
      [AI_API_KEY_PLAIN_ENV]: '"sk-quoted"',
      [AI_MODEL_PLAIN_ENV]: "'quoted model'",
    })).toEqual({ baseUrl: "https://quoted.example.com/v1", apiKey: "sk-quoted", model: "quoted model" });
  });
});

describe("chatEndpointFor", () => {
  it("joins /chat/completions onto an outside endpoint", () => {
    expect(chatEndpointFor("https://api.openai.com/v1/")).toBe("https://api.openai.com/v1/chat/completions");
  });

  it("walks straight to this app's own proxy for a relative address", () => {
    expect(chatEndpointFor(AI_CHAT_PROXY_ENDPOINT)).toBe("/api/ai-chat");
  });
});

describe("the proxy route", () => {
  it("answers the probe without ever naming the key", async () => {
    setServerEnvironment({ [AI_BASE_URL_ENV]: "https://api.example.com/v1", [AI_API_KEY_ENV]: "super-secret", [AI_MODEL_ENV]: "big-model" });
    const response = await POST(request({ probe: true }));
    expect(await response.json()).toEqual({ configured: true, model: "big-model" });

    setServerEnvironment({});
    const unconfigured = await POST(request({ probe: true }));
    expect(await unconfigured.json()).toEqual({ configured: false, model: null });
  });

  it("refuses a chat when the server has no model", async () => {
    setServerEnvironment({});
    const response = await POST(request({ messages: [{ role: "user", content: "hi" }] }));
    expect(response.status).toBe(400);
  });

  it("forwards the stream with the key attached and the server's model, not the caller's", async () => {
    setServerEnvironment({ [AI_BASE_URL_ENV]: "https://api.example.com/v1/", [AI_API_KEY_ENV]: "sk-topsecret", [AI_MODEL_ENV]: "server-model" });
    const fetchMock = vi.fn(async () => sseResponse());
    vi.stubGlobal("fetch", fetchMock);
    const response = await POST(request({
      model: "someone-elses-model",
      messages: [{ role: "user", content: "hi" }],
      tools: [{ type: "function" }],
    }));
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/event-stream");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.example.com/v1/chat/completions");
    expect(init.headers).toMatchObject({ Authorization: "Bearer sk-topsecret" });
    const body = JSON.parse(String(init.body));
    expect(body.model).toBe("server-model");
    expect(body.stream).toBe(true);
    expect(body.tool_choice).toBe("auto");
    expect(body.messages).toEqual([{ role: "user", content: "hi" }]);
  });

  it("reports an upstream failure as a digest, and never hands the key back", async () => {
    setServerEnvironment({ [AI_BASE_URL_ENV]: "https://api.example.com/v1", [AI_API_KEY_ENV]: "sk-topsecret", [AI_MODEL_ENV]: "m" });
    vi.stubGlobal("fetch", vi.fn(async () => new Response("Invalid API key provided", { status: 401 })));
    const response = await POST(request({ messages: [{ role: "user", content: "hi" }] }));
    expect(response.status).toBe(502);
    const text = JSON.stringify(await response.json());
    expect(text).toContain("HTTP 401");
    expect(text).not.toContain("sk-topsecret");
  });

  it("wants a real chat body", async () => {
    setServerEnvironment({ [AI_BASE_URL_ENV]: "https://api.example.com/v1", [AI_MODEL_ENV]: "m" });
    const response = await POST(request({ messages: [] }));
    expect(response.status).toBe(400);
  });
});

describe("probeAiServerConfig", () => {
  it("treats any failure as the panel's own settings", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new TypeError("fetch failed");
    }));
    expect(await probeAiServerConfig()).toEqual({ configured: false, model: null });

    vi.stubGlobal("fetch", vi.fn(async () => new Response("no route here", { status: 404 })));
    expect(await probeAiServerConfig()).toEqual({ configured: false, model: null });
  });

  it("keeps the model's name when the server answers", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ configured: true, model: "big-model" })));
    expect(await probeAiServerConfig()).toEqual({ configured: true, model: "big-model" });
  });
});
