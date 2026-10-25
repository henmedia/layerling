import { NextResponse } from "next/server";
import { aiServerConfigFromEnvironment } from "@/lib/ai/serverConfig";

/*
 * The built-in assistant's same-origin way to a model: the page posts its
 * chat request here, this route adds the key from the environment and forwards
 * to the OpenAI-compatible server the operator configured (LAYERLING_AI_BASE_URL,
 * LAYERLING_AI_API_KEY, LAYERLING_AI_MODEL - see lib/ai/serverConfig.ts).
 * The answer stream is passed back unchanged. This is what keeps hosted
 * models usable from the browser: they refuse requests that carry a foreign
 * Origin, and a key typed into a page would be a key given away.
 *
 * A POST on purpose, like /api/server-defaults: a route with any method
 * besides GET runs on every call in the Node build, so the answer is the
 * environment of the running server, not of whoever built the Docker image.
 */

// A static export insists on this line for any route; the page never asks there anyway.
export const revalidate = false;

type ChatRequestBody = {
  probe?: unknown;
  messages?: unknown;
  tools?: unknown;
};

export async function POST(request: Request) {
  const config = aiServerConfigFromEnvironment(process.env);
  const body = (await request.json().catch(() => null)) as ChatRequestBody | null;

  // The panel's "does this server have a model?" question. The name is the
  // most it ever gives away; the key never enters a response.
  if (body?.probe === true) {
    return NextResponse.json(
      { configured: config !== null, model: config?.model ?? null },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!config) {
    return NextResponse.json(
      { error: "This layerling server has no model configured (set BASE_URL and MODEL_ID, or LAYERLING_AI_BASE_URL and LAYERLING_AI_MODEL, in its environment)." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (!Array.isArray(body?.messages) || body.messages.length === 0) {
    return NextResponse.json({ error: "Expected a chat body with messages." }, { status: 400 });
  }

  // Only the fields of one chat completion go upstream; a caller cannot pick
  // another model or turn the route into a general proxy of the key.
  const upstreamBody: Record<string, unknown> = {
    model: config.model,
    messages: body.messages,
    stream: true,
  };
  if (Array.isArray(body.tools) && body.tools.length > 0) {
    upstreamBody.tools = body.tools;
    upstreamBody.tool_choice = "auto";
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;

  let upstream: Response;
  try {
    upstream = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(upstreamBody),
      signal: request.signal,
    });
  } catch (error) {
    if (request.signal.aborted) throw error; // the page went away; nothing to answer
    const detail = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Cannot reach the model server: ${detail}` }, { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    // Say what the model server answered, cut short; its body may echo the
    // request, so it stays off the wire beyond a digest.
    const detail = (await upstream.text().catch(() => "")).replace(/\s+/g, " ").trim().slice(0, 300);
    return NextResponse.json(
      { error: `The model server answered HTTP ${upstream.status}${detail ? `: ${detail}` : "."}` },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "text/event-stream",
      "Cache-Control": "no-store",
    },
  });
}
