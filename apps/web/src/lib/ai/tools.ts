/**
 * The tool surface the built-in assistant shows the model: the same commands
 * the MCP bridge offers an outside AI client, cut down to what makes sense
 * inside one open editor and reshaped into OpenAI function tools.
 *
 * The descriptions are not copied here - they come from the generated tool
 * catalogue, whose single source is scripts/layerling-mcp-tools.mjs, so the
 * built-in assistant and the external clients describe the editor in one and
 * the same words.
 */

import type { LayerlingMcpCommandName } from "@/lib/layerlingMcpProtocol";
import { LAYERLING_MCP_TOOL_DEFS, type LayerlingMcpToolDef } from "./mcpToolDefs.generated";

/**
 * What the assistant may do. Reading the scene and the view, building bodies,
 * cutting, grouping, patterning, hollowing, edge treatments, holes in a face
 * and printing estimates. Left out on purpose: the bridge's own bookkeeping
 * (list_editors, open_editor), everything that writes a file on a disk the
 * browser cannot reach (save_project, export_*), everything that needs a file
 * from the caller (import_file, import_mesh, add_font, reference_image,
 * layer_icon), and the history view (it belongs to the person at the controls,
 * not to the model).
 */
export const AI_ASSISTANT_ACTIONS = [
  "get_scene",
  "list_objects",
  "inspect_errors",
  "estimate_print",
  "list_edges",
  "list_faces",
  "list_custom_shapes",
  "measure_section",
  "saved_view",
  "show_workplane",
  "set_workplane",
  "set_section_view",
  "show_overhangs",
  "create_shape",
  "update_object",
  "select_objects",
  "delete_objects",
  "align_objects",
  "scale_objects",
  "lay_flat",
  "place_on_face",
  "mate_faces",
  "group_objects",
  "ungroup_objects",
  "open_group",
  "close_group",
  "boolean_cut",
  "intersect_objects",
  "split_objects",
  "separate_parts",
  "hollow_object",
  "array_objects",
  "bundle_objects",
  "perforate_face",
  "push_face",
  "sweep_sketch",
  "wrap_around_cylinder",
  "apply_edge_treatment",
  "delete_faces",
  "layer_text",
  "create_qr_code",
  "insert_custom_shape",
  "add_reference_points",
  "list_reference_points",
  "remove_reference_points",
  "capture_image",
] as const satisfies readonly LayerlingMcpCommandName[];

export type AiAssistantAction = (typeof AI_ASSISTANT_ACTIONS)[number];

/**
 * The calls that only ever report on the scene and the view. Asking for one of
 * these again after nothing has changed brings back the same answer, which is
 * what an assistant that has lost the plot does instead of answering - the loop
 * uses this list to notice that.
 */
export const READ_ONLY_ACTIONS: ReadonlySet<AiAssistantAction> = new Set<AiAssistantAction>([
  "get_scene",
  "list_objects",
  "inspect_errors",
  "estimate_print",
  "list_edges",
  "list_faces",
  "list_custom_shapes",
  "measure_section",
  "list_reference_points",
  "capture_image",
]);

/** Whether a tool the model asked for is one of the reads above. */
export function isReadOnlyToolName(name: string): boolean {
  const action = actionForToolName(name);
  return action !== null && READ_ONLY_ACTIONS.has(action);
}

/** The catalogue's name of an action; the bridge calls the scene snapshot read_scene. */
export function toolNameForAction(action: AiAssistantAction): string {
  return `layerling_${action === "get_scene" ? "read_scene" : action}`;
}

/** The action a catalogue name runs, or null when the assistant may not run it. */
export function actionForToolName(name: string): AiAssistantAction | null {
  const prefix = "layerling_";
  if (!name.startsWith(prefix)) return null;
  const short = name.slice(prefix.length);
  const action = short === "read_scene" ? "get_scene" : short;
  return (AI_ASSISTANT_ACTIONS as readonly string[]).includes(action) ? (action as AiAssistantAction) : null;
}

/** Fields that point at one editor tab or one bridge call; inside the page both mean nothing. */
const BRIDGE_ONLY_FIELDS = ["editorNumber", "editorId", "timeoutMs"] as const;

export type OpenAiToolSpec = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

/** Drops the bridge's addressing fields from an input schema, required list included. */
export function withoutBridgeFields(def: LayerlingMcpToolDef): Record<string, unknown> {
  const schema: Record<string, unknown> = { ...def.inputSchema };
  const properties = schema.properties;
  if (properties && typeof properties === "object") {
    const rest: Record<string, unknown> = { ...(properties as Record<string, unknown>) };
    for (const field of BRIDGE_ONLY_FIELDS) delete rest[field];
    schema.properties = rest;
  }
  const required = schema.required;
  if (Array.isArray(required)) {
    const kept = (required as string[]).filter((field) => !BRIDGE_ONLY_FIELDS.includes(field as typeof BRIDGE_ONLY_FIELDS[number]));
    if (kept.length > 0) schema.required = kept;
    else delete schema.required;
  }
  return schema;
}

/** The assistant's tools in OpenAI function-calling shape, catalogue descriptions and all. */
export function buildAiAssistantTools(): OpenAiToolSpec[] {
  const byName = new Map(LAYERLING_MCP_TOOL_DEFS.map((def) => [def.name, def]));
  const specs: OpenAiToolSpec[] = [];
  for (const action of AI_ASSISTANT_ACTIONS) {
    const name = toolNameForAction(action);
    const def = byName.get(name);
    // A tool the catalogue no longer has leaves the surface silently; the sync
    // test names the gap when the generated file and the catalogue drift apart.
    if (!def) continue;
    specs.push({
      type: "function",
      function: {
        name,
        description: def.description,
        parameters: withoutBridgeFields(def),
      },
    });
  }
  return specs;
}

/** A scene snapshot can be large; a result this side of it reaches the model whole. */
export const TOOL_RESULT_CHAR_LIMIT = 4000;

export type SerializedToolResult = {
  /** The text the model reads as the tool's answer. */
  text: string;
  /** A viewport picture (capture_image), kept out of the text to go as image content. */
  imageDataUrl: string | null;
};

/**
 * Turns a command result into what goes back to the model: JSON as text, cut
 * at a size an answer should not exceed, with the viewport picture of
 * capture_image lifted out as image content instead of a base64 wall.
 */
export function serializeToolResult(value: unknown): SerializedToolResult {
  let imageDataUrl: string | null = null;
  let rest = value;
  if (value && typeof value === "object" && typeof (value as { dataUrl?: unknown }).dataUrl === "string"
    && (value as { dataUrl: string }).dataUrl.startsWith("data:image/")) {
    const { dataUrl, ...without } = value as Record<string, unknown>;
    imageDataUrl = dataUrl as string;
    rest = without;
  }
  let text: string;
  try {
    text = typeof rest === "string" ? rest : JSON.stringify(rest ?? null);
  } catch {
    text = String(rest);
  }
  if (text && text.length > TOOL_RESULT_CHAR_LIMIT) {
    text = `${text.slice(0, TOOL_RESULT_CHAR_LIMIT)}… [truncated: ${text.length} characters in all - ask for less with ids or a narrower question]`;
  }
  return { text: text ?? "", imageDataUrl };
}
