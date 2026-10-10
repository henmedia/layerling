#!/usr/bin/env node

import { tools } from "./layerling-mcp-tools.mjs";

const DEFAULT_BASE_URL = "http://127.0.0.1:3000";
const MCP_ROUTE = "/api/layerling-mcp";
const baseUrl = process.env.LAYERLING_URL || DEFAULT_BASE_URL;
// A copy on a NAS or home server that switched remote use on (LAYERLING_MCP_REMOTE and
// LAYERLING_MCP_TOKEN there) wants the same token from this client.
const accessToken = (process.env.LAYERLING_MCP_TOKEN || "").trim();

function bridgeUrl() {
  return new URL(MCP_ROUTE, baseUrl);
}

/**
 * fetch() against a dev server that is not running only says "fetch failed".
 * Name what is missing instead, and never wait forever on a server that hangs.
 */
async function bridgeFetch(options, timeoutMs) {
  try {
    const headers = { ...(options.headers || {}), ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) };
    return await fetch(bridgeUrl(), { ...options, headers, signal: AbortSignal.timeout(timeoutMs) });
  } catch (error) {
    if (error?.name === "TimeoutError") {
      throw new Error(`Layerling at ${baseUrl} did not answer within ${Math.round(timeoutMs / 1000)} s.`);
    }
    throw new Error(
      `Cannot reach Layerling at ${baseUrl}. Start it with "npm run dev" and open an editor tab` +
        ` (set LAYERLING_URL if it runs elsewhere; a copy on a NAS also needs LAYERLING_MCP_REMOTE and LAYERLING_MCP_TOKEN on the server).`,
    );
  }
}

async function bridgeGet() {
  const response = await bridgeFetch({}, 10000);
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || `Layerling bridge returned HTTP ${response.status}`);
  }
  return payload;
}

async function bridgeCommand(action, args = {}, defaultTimeoutMs = 15000) {
  const { editorNumber, editorId, timeoutMs, ...params } = args || {};
  let targetNumber = typeof editorNumber === "number" ? editorNumber : undefined;
  let targetId = typeof editorId === "string" ? editorId : undefined;

  if (!targetNumber && !targetId) {
    const { editors = [] } = await bridgeGet();
    if (editors.length === 1) {
      targetNumber = editors[0].editorNumber;
    } else {
      throw new Error(editors.length === 0 ? "No open Layerling editors found" : "Provide editorNumber because multiple Layerling editors are open");
    }
  }

  const commandTimeoutMs = typeof timeoutMs === "number" ? timeoutMs : defaultTimeoutMs;
  const response = await bridgeFetch({
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "command",
      editorNumber: targetNumber,
      editorId: targetId,
      action,
      params,
      timeoutMs: commandTimeoutMs,
    }),
  }, commandTimeoutMs + 10000);
  const payload = await response.json().catch(() => null);
  if (!payload?.ok) {
    throw new Error(payload?.error || `Layerling command failed with HTTP ${response.status}`);
  }
  return payload.data;
}

async function callTool(name, args) {
  switch (name) {
    case "layerling_list_editors":
      return bridgeGet();
    case "layerling_read_scene":
      return bridgeCommand("get_scene", args);
    case "layerling_list_objects":
      return bridgeCommand("list_objects", args);
    case "layerling_select_objects":
      return bridgeCommand("select_objects", args);
    case "layerling_delete_objects":
      return bridgeCommand("delete_objects", args);
    case "layerling_create_shape":
      return bridgeCommand("create_shape", args);
    case "layerling_import_mesh":
      return bridgeCommand("import_mesh", args, 60000);
    case "layerling_update_object":
      return bridgeCommand("update_object", args);
    case "layerling_align_objects":
      return bridgeCommand("align_objects", args);
    case "layerling_scale_objects":
      return bridgeCommand("scale_objects", args, 30000);
    case "layerling_lay_flat":
      return bridgeCommand("lay_flat", args, 30000);
    case "layerling_place_on_face":
      return bridgeCommand("place_on_face", args, 30000);
    case "layerling_mate_faces":
      return bridgeCommand("mate_faces", args, 30000);
    case "layerling_open_group":
      return bridgeCommand("open_group", args);
    case "layerling_close_group":
      return bridgeCommand("close_group", args, 45000);
    case "layerling_group_objects":
      return bridgeCommand("group_objects", args, 30000);
    case "layerling_intersect_objects":
      return bridgeCommand("intersect_objects", args, 30000);
    case "layerling_ungroup_objects":
      return bridgeCommand("ungroup_objects", args);
    case "layerling_boolean_cut":
      return bridgeCommand("boolean_cut", args, 45000);
    case "layerling_separate_parts":
      return bridgeCommand("separate_parts", args);
    case "layerling_split_objects":
      return bridgeCommand("split_objects", args, 90000);
    case "layerling_wrap_around_cylinder":
      return bridgeCommand("wrap_around_cylinder", args);
    case "layerling_simplify_mesh":
      return bridgeCommand("simplify_mesh", args, 60000);
    case "layerling_save_custom_shape":
      return bridgeCommand("save_custom_shape", args, 30000);
    case "layerling_list_custom_shapes":
      return bridgeCommand("list_custom_shapes", args);
    case "layerling_insert_custom_shape":
      return bridgeCommand("insert_custom_shape", args, 30000);
    case "layerling_delete_custom_shape":
      return bridgeCommand("delete_custom_shape", args);
    case "layerling_list_edges":
      return bridgeCommand("list_edges", args, 30000);
    case "layerling_hollow_object":
      return bridgeCommand("hollow_object", args, 90000);
    case "layerling_array_objects":
      return bridgeCommand("array_objects", args, 30000);
    case "layerling_apply_edge_treatment":
      return bridgeCommand("apply_edge_treatment", args, 60000);
    case "layerling_inspect_errors":
      return bridgeCommand("inspect_errors", args);
    case "layerling_bundle_objects":
      return bridgeCommand("bundle_objects", args);
    case "layerling_layer_text":
      return bridgeCommand("layer_text", args, 30000);
    case "layerling_measure_section":
      return bridgeCommand("measure_section", args, 30000);
    case "layerling_show_overhangs":
      return bridgeCommand("show_overhangs", args, 30000);
    case "layerling_estimate_print":
      return bridgeCommand("estimate_print", args, 30000);
    case "layerling_add_reference_points":
      return bridgeCommand("add_reference_points", args);
    case "layerling_list_reference_points":
      return bridgeCommand("list_reference_points", args);
    case "layerling_remove_reference_points":
      return bridgeCommand("remove_reference_points", args);
    case "layerling_set_section_view":
      return bridgeCommand("set_section_view", args);
    case "layerling_set_history_view":
      return bridgeCommand("set_history_view", args);
    case "layerling_show_workplane":
      return bridgeCommand("show_workplane", args);
    case "layerling_export_section_svg":
      return bridgeCommand("export_section_svg", args);
    case "layerling_import_file":
      return bridgeCommand("import_file", args);
    case "layerling_add_font":
      return bridgeCommand("add_font", args, 60000);
    case "layerling_list_fonts":
      return bridgeCommand("list_fonts", args);
    case "layerling_set_workplane":
      return bridgeCommand("set_workplane", args);
    case "layerling_capture_image":
      return bridgeCommand("capture_image", args, 30000);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

function textContent(value) {
  return {
    type: "text",
    text: typeof value === "string" ? value : JSON.stringify(value, null, 2),
  };
}

function toolResult(value) {
  if (value?.dataUrl?.startsWith?.("data:image/png;base64,")) {
    return {
      content: [
        textContent({ face: value.face, bytesApprox: value.bytesApprox }),
        {
          type: "image",
          data: value.dataUrl.slice("data:image/png;base64,".length),
          mimeType: "image/png",
        },
      ],
    };
  }
  return { content: [textContent(value)] };
}

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function sendResult(id, result) {
  send({ jsonrpc: "2.0", id, result });
}

function sendError(id, code, message) {
  send({ jsonrpc: "2.0", id, error: { code, message } });
}

async function handleMessage(message) {
  if (!message || typeof message !== "object") return;
  const { id, method, params } = message;
  // A message without an id is a notification; JSON-RPC forbids answering it.
  if (id === undefined || id === null) return;
  try {
    if (method === "initialize") {
      sendResult(id, {
        protocolVersion: params?.protocolVersion || "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "layerling-mcp", version: "0.1.0" },
      });
      return;
    }
    if (method === "ping") {
      sendResult(id, {});
      return;
    }
    if (method === "tools/list") {
      sendResult(id, { tools });
      return;
    }
    if (method === "tools/call") {
      const name = params?.name;
      if (typeof name !== "string") {
        sendError(id, -32602, "Expected tool name");
        return;
      }
      const result = await callTool(name, params?.arguments || {});
      sendResult(id, toolResult(result));
      return;
    }
    if (method === "resources/list") {
      sendResult(id, { resources: [] });
      return;
    }
    sendError(id, -32601, `Unknown method: ${method}`);
  } catch (error) {
    if (method === "tools/call") {
      sendResult(id, { isError: true, content: [textContent(error instanceof Error ? error.message : String(error))] });
      return;
    }
    sendError(id, -32000, error instanceof Error ? error.message : String(error));
  }
}

let buffer = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  const lines = buffer.split(/\r?\n/);
  buffer = lines.pop() || "";
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      void handleMessage(JSON.parse(trimmed));
    } catch (error) {
      sendError(null, -32700, error instanceof Error ? error.message : String(error));
    }
  });
});
