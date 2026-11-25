import { describe, expect, it } from "vitest";
import { tagBackArgument } from "@/lib/tagBack";
import { tools } from "../../scripts/layerling-mcp-tools.mjs";

describe("the bridge's back argument (text on a tag's back)", () => {
  const current = { text: "0170 1234567", size: 5, depth: 1, fill: "#ff0000" };

  it("leaves the back as it is when left out and takes it off with false or null", () => {
    expect(tagBackArgument(undefined, current)).toBeUndefined();
    expect(tagBackArgument(false, current)).toEqual({ back: null });
    expect(tagBackArgument(null, current)).toEqual({ back: null });
  });

  it("starts a new back with the usual size and depth and no fill", () => {
    expect(tagBackArgument({ text: "A" }, null)).toEqual({ back: { text: "A", size: 4, depth: 0.8 } });
    expect(tagBackArgument({ text: "A", fill: true }, null)).toEqual({ back: { text: "A", size: 4, depth: 0.8, fill: "#ffffff" } });
  });

  it("keeps the parts left out and drops the fill with false", () => {
    expect(tagBackArgument({ size: 3 }, current)).toEqual({ back: { text: "0170 1234567", size: 3, depth: 1, fill: "#ff0000" } });
    expect(tagBackArgument({ fill: false }, current)).toEqual({ back: { text: "0170 1234567", size: 5, depth: 1 } });
    expect(tagBackArgument({ fill: true }, current)).toEqual({ back: current });
  });

  it("refuses what is out of range instead of bending it into range", () => {
    for (const value of [true, "A", {}, { text: " " }, { text: "A", size: 1 }, { text: "A", depth: 4 }, { text: "A", fill: "red" }, { text: "1\n2\n3\n4\n5\n6\n7" }, { text: "a".repeat(201) }]) {
      expect(tagBackArgument(value, null)).toHaveProperty("error");
    }
  });

  it("is offered by both tag tools, the icon tag with a finished width too", () => {
    const schema = (name: string) => (tools as { name: string; inputSchema: { properties: Record<string, unknown> } }[]).find((tool) => tool.name === name)!.inputSchema.properties;
    expect(schema("layerling_layer_text")).toHaveProperty("back");
    expect(schema("layerling_layer_icon")).toHaveProperty("back");
    expect(schema("layerling_layer_icon")).toHaveProperty("finishedWidth");
  });
});
