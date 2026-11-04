import { describe, expect, it } from "vitest";
// @ts-expect-error - die Brücke ist einfaches JavaScript und trägt keine Typen.
import { creatableShapeKinds, shapeSettingSchema, threadProfiles, threadSizeNames, tools } from "../../scripts/layerling-mcp-tools.mjs";
import { toolbarShapeAssets } from "@/lib/shapeCatalog";
import { MCP_SHAPE_SETTING_KEYS } from "@/lib/mcpShapeSettings";
import { THREAD_SIZES } from "@/lib/threadGeometry";
import { THREAD_PROFILES } from "@/lib/threadProfiles";

/*
 * Die Formenliste steht an zwei Stellen: im Katalog, aus dem das Formenmenü und
 * der Editor bauen, und im Schema der MCP-Brücke, das einem KI-Client sagt, was
 * er bestellen darf. Genau hier ist schon einmal etwas auseinandergelaufen -
 * `text` konnte der Editor längst, das Schema bot es nicht an, und gemerkt hat
 * es niemand. Diese Prüfung schlägt fehl, sobald es wieder passiert.
 */

type ToolDefinition = {
  name: string;
  description: string;
  inputSchema: { properties?: Record<string, unknown> };
};

const toolList = tools as ToolDefinition[];
const kinds = creatableShapeKinds as string[];
const settingKeys = Object.keys(shapeSettingSchema as Record<string, unknown>);

function toolByName(name: string) {
  const found = toolList.find((tool) => tool.name === name);
  if (!found) throw new Error(`Werkzeug fehlt: ${name}`);
  return found;
}

/** `cube` ist ein Quader mit gleichen Kanten, `sketch` eine ausgezogene Skizze. */
const KINDS_WITHOUT_A_TILE = ["cube", "sketch"];

describe("the shape kinds the MCP bridge offers", () => {
  it("offers every shape the catalogue has a tile for", () => {
    const catalogue = toolbarShapeAssets.map((asset) => asset.kind);
    const missing = catalogue.filter((kind) => !kinds.includes(kind));
    expect(missing).toEqual([]);
  });

  it("offers nothing the editor cannot build", () => {
    const catalogue = new Set<string>(toolbarShapeAssets.map((asset) => asset.kind));
    const unknown = kinds.filter((kind) => !catalogue.has(kind) && !KINDS_WITHOUT_A_TILE.includes(kind));
    expect(unknown).toEqual([]);
  });

  it("lists the kinds in the create tool's enum", () => {
    const schema = toolByName("layerling_create_shape").inputSchema.properties?.kind as { enum?: string[] };
    expect(schema?.enum).toEqual(kinds);
  });
});

describe("the settings both shape tools accept", () => {
  it("lets every setting that can be created be changed again", () => {
    const create = toolByName("layerling_create_shape").inputSchema.properties ?? {};
    const update = toolByName("layerling_update_object").inputSchema.properties ?? {};
    const createMissing = settingKeys.filter((key) => !(key in create));
    const updateMissing = settingKeys.filter((key) => !(key in update));
    expect({ createMissing, updateMissing }).toEqual({ createMissing: [], updateMissing: [] });
  });

  it("accepts every setting it hands out", () => {
    // Was `layerling_read_scene` in `settings` meldet, muss `create_shape` und
    // `update_object` auch annehmen. Sonst liest ein Client einen Wert aus,
    // schickt ihn zurueck und nichts geschieht - so lag die Verjuengung eine
    // Weile da, und die Rundung eines Quaders stand in der Auskunft, obwohl sie
    // niemand setzen kann.
    const reported = [...MCP_SHAPE_SETTING_KEYS].sort();
    expect([...settingKeys].sort()).toEqual(reported);
  });

  it("describes every setting, because the description is all a client has to go on", () => {
    const undescribed = Object.entries(shapeSettingSchema as Record<string, { description?: string }>)
      .filter(([, value]) => !value.description?.trim())
      .map(([key]) => key);
    expect(undescribed).toEqual([]);
  });

  it("names the shape a setting belongs to", () => {
    // "Thread only", "Gear only", "Cylinder, cone, ..." - ohne diesen Hinweis
    // probiert ein Client die Feder am Quader aus.
    const vague = Object.entries(shapeSettingSchema as Record<string, { description?: string }>)
      .filter(([, value]) => !/(only|Cylinder|Sphere|Tube|Pyramid|Cone|Gear|Thread|Spring|Text)/i.test(value.description ?? ""))
      .map(([key]) => key);
    expect(vague).toEqual([]);
  });
});

describe("the thread sizes and profiles the MCP bridge offers", () => {
  it("offers exactly the editor's profiles", () => {
    expect(threadProfiles).toEqual([...THREAD_PROFILES]);
    const schema = shapeSettingSchema as Record<string, { enum?: string[] }>;
    expect(schema.threadProfile.enum).toEqual([...THREAD_PROFILES]);
  });

  it("offers exactly the sizes of the editor's size menu, by the same names", () => {
    expect(threadSizeNames).toEqual(THREAD_SIZES.map((size) => size.id));
  });

  it("takes threadSize in both shape tools", () => {
    for (const name of ["layerling_create_shape", "layerling_update_object"]) {
      const property = toolByName(name).inputSchema.properties?.threadSize as { enum?: string[]; description?: string };
      expect(property?.enum).toEqual(threadSizeNames);
      expect(property?.description).toMatch(/^Thread only/);
    }
  });
});

describe("tool schemas every MCP client can load (#1285)", () => {
  // A list of types ("type": ["object", "string"]) is legal JSON Schema, but some clients drop the whole tool for it:
  // create_shape and update_object went missing that way. anyOf with one type per branch says the same.
  function typeLists(schema: unknown, path: string, found: string[]) {
    if (Array.isArray(schema)) {
      schema.forEach((entry, index) => typeLists(entry, `${path}[${index}]`, found));
      return;
    }
    if (!schema || typeof schema !== "object") return;
    const record = schema as Record<string, unknown>;
    if (Array.isArray(record.type)) found.push(path);
    for (const [key, value] of Object.entries(record)) {
      if (key !== "description") typeLists(value, `${path}.${key}`, found);
    }
  }

  it("gives every property a single type", () => {
    const found: string[] = [];
    for (const tool of toolList) typeLists(tool.inputSchema, tool.name, found);
    expect(found).toEqual([]);
  });

  it("still takes a vase as settings or as JSON text, and a trace as true or settings", () => {
    const vase = toolByName("layerling_create_shape").inputSchema.properties?.vase as { anyOf: { type: string }[] };
    expect(vase.anyOf.map((branch) => branch.type)).toEqual(["object", "string"]);
    const trace = toolByName("layerling_reference_image").inputSchema.properties?.trace as { anyOf: { type: string; properties?: Record<string, unknown> }[] };
    expect(trace.anyOf.map((branch) => branch.type)).toEqual(["object", "boolean"]);
    expect(Object.keys(trace.anyOf[0].properties ?? {})).toEqual(["part", "threshold", "height"]);
  });
});
