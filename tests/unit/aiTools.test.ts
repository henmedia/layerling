import { describe, expect, it } from "vitest";
import {
  AI_ASSISTANT_ACTIONS,
  actionForToolName,
  buildAiAssistantTools,
  serializeToolResult,
  TOOL_RESULT_CHAR_LIMIT,
  toolNameForAction,
  withoutBridgeFields,
} from "@/lib/ai/tools";
import { LAYERLING_MCP_TOOL_DEFS } from "@/lib/ai/mcpToolDefs.generated";
import type { LayerlingMcpToolDef } from "@/lib/ai/mcpToolDefs.generated";

describe("the action ⇄ tool-name mapping", () => {
  it("round-trips every whitelisted action", () => {
    for (const action of AI_ASSISTANT_ACTIONS) {
      expect(actionForToolName(toolNameForAction(action))).toBe(action);
    }
  });

  it("calls the scene snapshot read_scene on the wire and get_scene inside", () => {
    expect(toolNameForAction("get_scene")).toBe("layerling_read_scene");
    expect(actionForToolName("layerling_read_scene")).toBe("get_scene");
  });

  it("refuses tools the assistant may not run and foreign names", () => {
    expect(actionForToolName("layerling_save_project")).toBeNull();
    expect(actionForToolName("layerling_clear_history")).toBeNull();
    expect(actionForToolName("somebody_elses_tool")).toBeNull();
    expect(actionForToolName("get_scene")).toBeNull();
  });
});

describe("withoutBridgeFields", () => {
  function stub(properties: Record<string, unknown>, required?: string[]): LayerlingMcpToolDef {
    return {
      name: "layerling_stub",
      description: "stub",
      inputSchema: { type: "object", properties, ...(required ? { required } : {}) },
    };
  }

  it("drops the addressing fields from properties and from required", () => {
    const schema = withoutBridgeFields(
      stub({ editorNumber: {}, editorId: {}, timeoutMs: {}, id: {} }, ["editorNumber", "id"]),
    );
    expect(Object.keys(schema.properties as Record<string, unknown>)).toEqual(["id"]);
    expect(schema.required).toEqual(["id"]);
  });

  it("removes a required list that ends up empty", () => {
    const schema = withoutBridgeFields(stub({ editorNumber: {}, id: {} }, ["editorNumber"]));
    expect(schema.required).toBeUndefined();
  });

  it("does not mutate the catalogue entry", () => {
    const def = stub({ editorNumber: {}, id: {} }, ["editorNumber"]);
    withoutBridgeFields(def);
    expect(Object.keys(def.inputSchema.properties as Record<string, unknown>)).toEqual(["editorNumber", "id"]);
    expect(def.inputSchema.required).toEqual(["editorNumber"]);
  });
});

describe("buildAiAssistantTools", () => {
  it("emits one spec per whitelisted action", () => {
    const specs = buildAiAssistantTools();
    // A whitelist entry whose tool left the catalogue would vanish silently;
    // the count is the tripwire.
    expect(specs.length).toBe(AI_ASSISTANT_ACTIONS.length);
    const catalogue = new Set(LAYERLING_MCP_TOOL_DEFS.map((def) => def.name));
    for (const action of AI_ASSISTANT_ACTIONS) {
      expect(catalogue.has(toolNameForAction(action))).toBe(true);
    }
  });

  it("keeps the catalogue description and strips the bridge fields", () => {
    const create = buildAiAssistantTools().find((spec) => spec.function.name === "layerling_create_shape");
    const entry = LAYERLING_MCP_TOOL_DEFS.find((def) => def.name === "layerling_create_shape");
    expect(create).toBeDefined();
    expect(entry).toBeDefined();
    expect(create?.function.description).toBe(entry?.description);
    const properties = create!.function.parameters.properties as Record<string, unknown>;
    expect("editorNumber" in properties).toBe(false);
    expect("editorId" in properties).toBe(false);
    expect("timeoutMs" in properties).toBe(false);
    expect("kind" in properties).toBe(true);
    expect(create!.function.parameters.required).toEqual(["kind"]);
  });

  it("stays in OpenAI function shape", () => {
    for (const spec of buildAiAssistantTools()) {
      expect(spec.type).toBe("function");
      expect(spec.function.name.startsWith("layerling_")).toBe(true);
      expect(spec.function.parameters.type).toBe("object");
    }
  });
});

describe("serializeToolResult", () => {
  it("passes a string result through", () => {
    expect(serializeToolResult("ok")).toEqual({ text: "ok", imageDataUrl: null });
  });

  it("JSON-serialises objects and null", () => {
    expect(serializeToolResult({ a: 1 }).text).toBe('{"a":1}');
    expect(serializeToolResult(null).text).toBe("null");
  });

  it("lifts a viewport picture out of the text", () => {
    const result = serializeToolResult({ width: 2, dataUrl: "data:image/png;base64,AAA" });
    expect(result.imageDataUrl).toBe("data:image/png;base64,AAA");
    expect(result.text).toContain('"width":2');
    expect(result.text).not.toContain("dataUrl");
  });

  it("keeps a non-image dataUrl inside the text", () => {
    const result = serializeToolResult({ dataUrl: "data:text/plain,hello" });
    expect(result.imageDataUrl).toBeNull();
    expect(result.text).toContain("data:text/plain,hello");
  });

  it("truncates oversized results and says how long they were", () => {
    const long = "x".repeat(TOOL_RESULT_CHAR_LIMIT + 500);
    const result = serializeToolResult(long);
    expect(result.text.startsWith("x".repeat(TOOL_RESULT_CHAR_LIMIT))).toBe(true);
    expect(result.text).toContain("[truncated");
    expect(result.text).toContain(String(long.length));
    expect(result.text.length).toBeLessThan(long.length);
  });

  it("survives a value JSON cannot represent", () => {
    const circular: Record<string, unknown> = { name: "loop" };
    circular.self = circular;
    const result = serializeToolResult(circular);
    expect(result.text).toBe("[object Object]");
  });
});
