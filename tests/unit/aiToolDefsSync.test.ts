import { describe, expect, it } from "vitest";
// @ts-expect-error - the bridge is plain JavaScript and carries no types.
import { tools } from "../../scripts/layerling-mcp-tools.mjs";
import { LAYERLING_MCP_TOOL_DEFS } from "@/lib/ai/mcpToolDefs.generated";

/*
 * apps/web/src/lib/ai/mcpToolDefs.generated.ts is a mirror of the MCP
 * bridge's tool catalogue, produced by `npm run ai:tools` (wired into predev
 * and prebuild). A checkout where the generated file is older than the
 * catalogue gives the built-in assistant stale tool descriptions; this test
 * fails the moment the two drift apart.
 */

describe("the generated tool catalogue", () => {
  it("carries every tool of the bridge catalogue, unchanged and in order", () => {
    // Deep equality over whole objects: names, descriptions and schemas.
    expect(LAYERLING_MCP_TOOL_DEFS).toEqual(tools);
  });

  it("is not empty", () => {
    expect(LAYERLING_MCP_TOOL_DEFS.length).toBeGreaterThan(0);
  });
});
