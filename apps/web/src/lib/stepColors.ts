import { normalizeHexColor } from "@/lib/coloredImport";

/**
 * The colours a STEP file gives its bodies, read from the file's text (#830): the kernel's XCAF document leaves out the
 * colours that sit on a body (a STYLED_ITEM on a MANIFOLD_SOLID_BREP or a SHELL_BASED_SURFACE_MODEL), so the import
 * follows them itself, from the product through its shape representations to the bodies in the order the file lists
 * them, which is the order the kernel hands out the bodies of that entry.
 */

/** The kinds of item that are a body of their own. */
const BODY_ITEMS = /^(MANIFOLD_SOLID_BREP|BREP_WITH_VOIDS|FACETED_BREP|SHELL_BASED_SURFACE_MODEL)\b/;

/** The few colours a file can name instead of giving their numbers. */
const NAMED_COLORS: Record<string, string> = {
  red: "#ff0000", green: "#00ff00", blue: "#0000ff", yellow: "#ffff00", magenta: "#ff00ff", cyan: "#00ffff", black: "#000000", white: "#ffffff",
};

function references(body: string) {
  return Array.from(body.matchAll(/#(\d+)/g), (match) => Number(match[1]));
}

function channel(value: number) {
  return Math.round(Math.min(1, Math.max(0, value)) * 255).toString(16).padStart(2, "0");
}

/** The colours of the bodies of each product, by the product's name; a body without a colour of its own is undefined. */
export function stepBodyColors(text: string): Map<string, Array<string | undefined>> {
  const entities = new Map<number, string>();
  for (const match of text.matchAll(/#(\d+)\s*=\s*((?:[^;']|'[^']*')*);/g)) entities.set(Number(match[1]), match[2].trim());
  const byKind = (kind: string) => Array.from(entities).filter(([, body]) => body.startsWith(`${kind}(`));

  const colorOf = (id: number, depth = 0): string | undefined => {
    const body = entities.get(id);
    if (!body || depth > 8) return undefined;
    const rgb = /^COLOUR_RGB\('[^']*',\s*([-\d.E+]+),\s*([-\d.E+]+),\s*([-\d.E+]+)\)/i.exec(body);
    if (rgb) return normalizeHexColor(`#${channel(Number(rgb[1]))}${channel(Number(rgb[2]))}${channel(Number(rgb[3]))}`);
    const named = /^DRAUGHTING_PRE_DEFINED_COLOUR\('([^']*)'\)/i.exec(body);
    if (named) return NAMED_COLORS[named[1].toLowerCase()];
    for (const reference of references(body)) {
      const found = colorOf(reference, depth + 1);
      if (found) return found;
    }
    return undefined;
  };

  // The colour of each styled body; a STYLED_ITEM names its styles first and the item it colours last.
  const itemColors = new Map<number, string>();
  for (const [, body] of [...byKind("STYLED_ITEM"), ...byKind("OVER_RIDING_STYLED_ITEM")]) {
    const ids = references(body);
    const item = ids[ids.length - 1];
    if (!BODY_ITEMS.test(entities.get(item) ?? "")) continue;
    const color = ids.slice(0, -1).map((id) => colorOf(id)).find(Boolean);
    if (color) itemColors.set(item, color);
  }
  const result = new Map<string, Array<string | undefined>>();
  if (!itemColors.size) return result;

  // Who refers to whom, once, so each step of the chain is a lookup.
  const referredBy = new Map<number, number[]>();
  for (const [id, body] of entities) {
    for (const reference of references(body)) {
      const list = referredBy.get(reference);
      if (list) list.push(id);
      else referredBy.set(reference, [id]);
    }
  }
  const referring = (id: number, kind: RegExp) => (referredBy.get(id) ?? []).filter((other) => kind.test(entities.get(other) ?? ""));

  for (const [product, body] of byKind("PRODUCT")) {
    // A product has an id and a name; the kernel names the entry after either, so the colours go under both.
    const [, id = "", name = ""] = /^PRODUCT\('([^']*)',\s*'([^']*)'/.exec(body) ?? [];
    if (!id && !name) continue;
    const representations = new Set<number>();
    for (const formation of referring(product, /^PRODUCT_DEFINITION_FORMATION/)) {
      for (const definition of referring(formation, /^PRODUCT_DEFINITION\(/)) {
        for (const shape of referring(definition, /^PRODUCT_DEFINITION_SHAPE\(/)) {
          for (const link of referring(shape, /^SHAPE_DEFINITION_REPRESENTATION\(/)) {
            const ids = references(entities.get(link)!);
            representations.add(ids[ids.length - 1]);
          }
        }
      }
    }
    // The bodies often sit in a second representation tied to the first without a placement of its own.
    for (const representation of [...representations]) {
      for (const link of referring(representation, /^SHAPE_REPRESENTATION_RELATIONSHIP\(/)) {
        references(entities.get(link)!).forEach((other) => representations.add(other));
      }
    }
    const colors: Array<string | undefined> = [];
    for (const representation of representations) {
      const items = /^[A-Z_]+\('[^']*',\s*\(([^)]*)\)/.exec(entities.get(representation) ?? "")?.[1] ?? "";
      for (const item of references(items)) {
        if (BODY_ITEMS.test(entities.get(item) ?? "")) colors.push(itemColors.get(item));
      }
    }
    if (!colors.some(Boolean)) continue;
    if (id) result.set(id, colors);
    if (name) result.set(name, colors);
  }
  return result;
}
