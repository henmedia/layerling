import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
// @ts-expect-error - die Brücke ist einfaches JavaScript und trägt keine Typen.
import { creatableShapeKinds, lookupSettingSchema, shapeSettingSchema, tools } from "../../scripts/layerling-mcp-tools.mjs";
// @ts-expect-error - ebenso.
import { bodySettingKeys, directSettingKeys, flattenShapeSettings, lookupShapeSettings, settingKinds } from "../../scripts/layerling-mcp-shape-settings.mjs";
import { normalizeShapeCustomizations } from "@/lib/workplaneSettings";

type Property = { type?: string; enum?: unknown[] };
const schema = lookupSettingSchema as Record<string, Property>;
const kinds = creatableShapeKinds as string[];
const table = settingKinds as Record<string, string[]>;
const body = bodySettingKeys as string[];

const toolProperties = (name: string) => (tools as Array<{ name: string; inputSchema: { properties: Record<string, unknown> } }>).find((tool) => tool.name === name)!.inputSchema.properties;

describe("which kind each setting belongs to", () => {
  it("gives every setting at least one kind, or every body", () => {
    const lost = Object.keys(shapeSettingSchema as object).filter((key) => !body.includes(key) && !table[key]?.length);
    expect(lost).toEqual([]);
  });

  it("names only settings and kinds that exist", () => {
    expect([...Object.keys(table), ...body].filter((key) => !(key in schema))).toEqual([]);
    expect(Object.values(table).flat().filter((kind) => !kinds.includes(kind))).toEqual([]);
  });

  it("lists every setting the editor keeps for a kind", () => {
    const missing: string[] = [];
    for (const [key, property] of Object.entries(shapeSettingSchema as Record<string, Property>)) {
      const values: unknown[] = property.enum ?? (property.type === "boolean" ? [true, false] : [1, 2, 5, 10, 20, 45, 0.5, 100, "A", "M3", true, [1, 2], { a: 1 }]);
      for (const kind of kinds) {
        const real = kind === "cube" ? "box" : kind === "roof" ? "polygon" : kind;
        const kept = values.some((value) => (normalizeShapeCustomizations({ [real]: { [key]: value } }) as Record<string, Record<string, unknown>>)[real]?.[key] !== undefined);
        if (kept && !table[key]?.includes(kind)) missing.push(`${kind}.${key}`);
      }
    }
    expect(missing).toEqual([]);
  }, 60_000);
});

describe("looking settings up", () => {
  it("answers with the settings of the kinds asked, and those of every body", () => {
    const answer = lookupShapeSettings(schema, kinds, ["gear"]);
    expect(answer.kinds.gear).toContain("teeth");
    expect(answer.settings.teeth).toBe(schema.teeth);
    expect(answer.anyBody).toContain("taperTopWidth");
    expect(answer.settings.taperTopWidth).toBeUndefined();
    expect(lookupShapeSettings(schema, kinds, ["gear"], ["body"]).settings.taperTopWidth).toBe(schema.taperTopWidth);
    expect(answer.settings.latchWidth).toBeUndefined();
  });

  it("answers gridfinity in parts small enough for a client to take in, and names the rest by topic", () => {
    // Antigravity put an answer of about 50 KB into a file instead of giving it to the model, which then guessed names.
    const size = (value: unknown) => JSON.stringify(value, null, 2).length;
    const first = lookupShapeSettings(schema, kinds, ["gridfinity"]);
    expect(size(first)).toBeLessThan(30_000);
    expect(first.moreTopics.compartments).toContain("gridfinityCompartmentsX");
    expect(first.moreTopics.labels).toContain("gridfinityLabelBack");
    expect(first.settings.gridfinityCompartmentsX).toBeUndefined();
    const both = lookupShapeSettings(schema, kinds, ["gridfinity"], ["compartments", "labels"]);
    expect(size(both)).toBeLessThan(45_000);
    expect(both.settings.gridfinityCompartmentsX).toBe(schema.gridfinityCompartmentsX);
    expect(both.settings.gridfinityCompartmentLabels).toBe(schema.gridfinityCompartmentLabels);
    // Every setting is described in the first answer or in one of the topics it names.
    const described = new Set(Object.keys(first.settings));
    for (const topic of Object.keys(first.moreTopics)) Object.keys(lookupShapeSettings(schema, kinds, ["gridfinity"], [topic]).settings).forEach((key) => described.add(key));
    expect(first.kinds.gridfinity.filter((key: string) => !described.has(key))).toEqual([]);
    for (const kind of kinds) expect(size(lookupShapeSettings(schema, kinds, [kind])), kind).toBeLessThan(30_000);
    expect(() => lookupShapeSettings(schema, kinds, ["gridfinity"], ["lids"])).toThrow(/Unknown topic: lids.*compartments/s);
  });

  it("takes one kind given as a plain name too, as a model sends it by mistake", () => {
    expect(lookupShapeSettings(schema, kinds, "gear").kinds.gear).toContain("teeth");
    expect(readFileSync("scripts/layerling-mcp-server.mjs", "utf8")).toContain("args?.kinds ?? args?.kind");
  });

  it("names the kinds when asked for one that does not exist", () => {
    expect(() => lookupShapeSettings(schema, kinds, ["cog"])).toThrow(/Unknown kind: cog.*gear/s);
    expect(() => lookupShapeSettings(schema, kinds, [])).toThrow(/Kinds:/);
  });

  it("keeps only a few settings on the shape tools themselves", () => {
    for (const name of ["layerling_create_shape", "layerling_update_object"]) {
      const shown = Object.keys(toolProperties(name)).filter((key) => key in schema);
      expect(shown).toEqual(expect.arrayContaining(directSettingKeys as string[]));
      expect(toolProperties(name).settings).toMatchObject({ type: "object", additionalProperties: true });
      expect(toolProperties(name).teeth).toBeUndefined();
    }
  });
});

describe("the settings object", () => {
  const flatten = (args: Record<string, unknown>, kind?: string) =>
    flattenShapeSettings(args, { schema, toolProperties: toolProperties("layerling_create_shape"), kind });

  it("is laid flat beside the rest, a direct value winning", () => {
    expect(flatten({ kind: "gear", sides: 8, settings: { teeth: 20, sides: 3 } }, "gear")).toEqual({ kind: "gear", teeth: 20, sides: 8 });
  });

  it("is taken as JSON text too", () => {
    expect(flatten({ kind: "gear", settings: "{\"teeth\":20}" }, "gear")).toEqual({ kind: "gear", teeth: 20 });
  });

  it("leaves a call without it as it was, settings given flat as before", () => {
    expect(flatten({ kind: "gear", teeth: 12 }, "gear")).toEqual({ kind: "gear", teeth: 12 });
  });

  it("refuses an unknown name and says which the kind has", () => {
    expect(() => flatten({ kind: "gear", settings: { toothCount: 20 } }, "gear")).toThrow(/Unknown setting: toothCount.*Settings of gear:.*teeth.*Nothing was changed/s);
    expect(() => flatten({ settings: { toothCount: 20 } })).toThrow(/layerling_shape_settings/);
    // Close names first, as a model that guessed would need them.
    expect(() => flatten({ settings: { gridfinityCompartments: 2 } }, "gridfinity")).toThrow(/Similar: gridfinityCompartments -> gridfinityCompartments[XZ]/);
    expect(() => flatten({ settings: { zzz: 1 } }, "gear")).toThrow(/Unknown setting: zzz\. Settings of gear/);
    expect(() => flatten({ settings: [1] })).toThrow(/object/);
    expect(() => flatten({ settings: "nonsense" })).toThrow(/JSON/);
  });

  it("lets a block read back from an object through, whatever the form it came from", () => {
    expect(flatten({ settings: { teeth: 20, width: 30, threadSize: "M6" } })).toEqual({ teeth: 20, width: 30, threadSize: "M6" });
  });
});
