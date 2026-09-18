import { NextResponse } from "next/server";
import type { LayerlingMcpApiPayload } from "@/lib/layerlingMcpProtocol";
import {
  completeLayerlingMcpCommand,
  dispatchLayerlingMcpCommand,
  listLayerlingMcpEditors,
  registerLayerlingMcpEditor,
  waitForLayerlingMcpCommand,
} from "@/lib/layerlingMcpStore";
import { LAYERLING_MCP_LONG_POLL_TIMEOUT_MS } from "@/lib/layerlingMcpProtocol";

export const revalidate = false;

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

function isLocalRequest(request: Request) {
  const requestUrl = new URL(request.url);
  if (!LOCAL_HOSTS.has(requestUrl.hostname)) {
    return false;
  }

  const origin = request.headers.get("origin");
  if (origin) {
    try {
      const originUrl = new URL(origin);
      // localhost and 127.0.0.1 are the same machine but not the same origin
      // string, and the dev server reports whichever name it bound to. Require a
      // local hostname on the same port rather than a byte-identical origin.
      if (
        originUrl.protocol !== requestUrl.protocol ||
        originUrl.port !== requestUrl.port ||
        !LOCAL_HOSTS.has(originUrl.hostname)
      ) {
        return false;
      }
    } catch {
      return false;
    }
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  return !fetchSite || fetchSite === "same-origin" || fetchSite === "none";
}

function localOnly(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "layerling MCP is only available in local development." }, { status: 404 });
  }
  if (!isLocalRequest(request)) {
    return NextResponse.json({ error: "layerling MCP only accepts localhost requests." }, { status: 403 });
  }
  return null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export async function GET(request: Request) {
  const blocked = localOnly(request);
  if (blocked) return blocked;
  return NextResponse.json({ editors: listLayerlingMcpEditors() });
}

export async function POST(request: Request) {
  const blocked = localOnly(request);
  if (blocked) return blocked;

  let body: LayerlingMcpApiPayload;
  try {
    body = (await request.json()) as LayerlingMcpApiPayload;
  } catch {
    return NextResponse.json({ error: "Invalid layerling MCP request." }, { status: 400 });
  }

  if (!isObject(body) || typeof body.type !== "string") {
    return NextResponse.json({ error: "Invalid layerling MCP request." }, { status: 400 });
  }

  if (body.type === "heartbeat") {
    if (!isObject(body.editor)) {
      return NextResponse.json({ error: "Invalid editor heartbeat." }, { status: 400 });
    }
    registerLayerlingMcpEditor(body.editor);
    return NextResponse.json({ ok: true, editors: listLayerlingMcpEditors() });
  }

  if (body.type === "poll") {
    if (typeof body.editorId !== "string") {
      return NextResponse.json({ error: "Invalid editor poll." }, { status: 400 });
    }
    const command = await waitForLayerlingMcpCommand(body.editorId, {
      timeoutMs: LAYERLING_MCP_LONG_POLL_TIMEOUT_MS,
      signal: request.signal,
    });
    return NextResponse.json({ command });
  }

  if (body.type === "result") {
    if (typeof body.editorId !== "string" || !isObject(body.result) || typeof body.result.commandId !== "string" || typeof body.result.ok !== "boolean") {
      return NextResponse.json({ error: "Invalid command result." }, { status: 400 });
    }
    return NextResponse.json({ ok: completeLayerlingMcpCommand(body.editorId, body.result) });
  }

  if (body.type === "command") {
    if (typeof body.action !== "string") {
      return NextResponse.json({ error: "Invalid command action." }, { status: 400 });
    }
    const result = await dispatchLayerlingMcpCommand({
      editorId: typeof body.editorId === "string" ? body.editorId : undefined,
      editorNumber: typeof body.editorNumber === "number" ? body.editorNumber : undefined,
      action: body.action,
      params: isObject(body.params) ? body.params : {},
      timeoutMs: typeof body.timeoutMs === "number" ? body.timeoutMs : undefined,
    });
    return NextResponse.json(result, { status: result.ok ? 200 : 504 });
  }

  return NextResponse.json({ error: "Unknown layerling MCP request." }, { status: 400 });
}
