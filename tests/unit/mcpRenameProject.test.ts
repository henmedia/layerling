import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
// @ts-expect-error - die Brücke ist einfaches JavaScript und trägt keine Typen.
import { tools } from "../../scripts/layerling-mcp-tools.mjs";

/*
 * layerling_rename_project (Discussion #1483): eine KI, die einen Entwurf baut,
 * soll dem Projekt einen Namen geben können, damit es in der Projektliste zu
 * finden ist. Das Werkzeug muss im Schema stehen, vom Server an die Brücke
 * gehen und im Editor eine Aktion haben.
 */
describe("layerling_rename_project", () => {
  const tool = (tools as { name: string; inputSchema: { properties: Record<string, unknown>; required?: string[] } }[]).find((entry) => entry.name === "layerling_rename_project");

  it("is offered with the name it needs", () => {
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toEqual(["name"]);
    expect(tool!.inputSchema.properties.name).toMatchObject({ type: "string" });
    expect(tool!.inputSchema.properties).toHaveProperty("editorNumber");
  });

  it("goes from the server through the bridge to the editor", () => {
    const server = readFileSync(new URL("../../scripts/layerling-mcp-server.mjs", import.meta.url), "utf8");
    expect(server).toMatch(/case "layerling_rename_project":\s*return bridgeCommand\("rename_project", args\);/);
    const protocol = readFileSync(new URL("../../apps/web/src/lib/layerlingMcpProtocol.ts", import.meta.url), "utf8");
    expect(protocol).toContain('| "rename_project"');
    const editor = readFileSync(new URL("../../apps/web/src/components/LayerlingEditor.tsx", import.meta.url), "utf8");
    expect(editor).toContain('command.action === "rename_project"');
  });
});
