import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Discussion #1869: in a tool panel that scrolls, the buttons stay in view, and the message why the
// tool refused must stay with them. The style sheet does that for a message standing right before the
// buttons' row, so the panels have to keep it there.
const root = path.resolve(__dirname, "../..");
const css = readFileSync(path.join(root, "apps/web/src/app/globals.css"), "utf8");
const panelDir = path.join(root, "apps/web/src/components/workplane");

/** The declarations of every rule with exactly this selector, later ones winning. */
function declarations(selector: string): Record<string, string> {
  const found: Record<string, string> = {};
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  for (const match of css.matchAll(new RegExp(`(?:^|\\})\\s*(?:/\\*[^]*?\\*/\\s*)*${escaped}\\s*\\{([^}]*)\\}`, "gm"))) {
    for (const line of match[1].split(";")) {
      const [property, ...value] = line.split(":");
      if (value.length > 0) found[property.trim()] = value.join(":").trim();
    }
  }
  return found;
}

const px = (value: string | undefined) => {
  expect(value).toMatch(/^-?\d+px$/);
  return Number.parseInt(value ?? "", 10);
};

describe("the message of a tool panel stays in view with its buttons (#1869)", () => {
  const message = declarations(".edge-modifier-panel > .edge-modifier-error:has(+ .edge-modifier-footer)");

  it("sticks to the foot of the panel as the buttons do", () => {
    expect(declarations(".edge-modifier-panel > .edge-modifier-footer").position).toBe("sticky");
    expect(message.position).toBe("sticky");
    expect(message["overflow-y"]).toBe("auto");
    expect(message["max-height"]).toBeTruthy();
  });

  it("stands exactly above the buttons' row: gap, line, padding and button", () => {
    const footer = declarations(".edge-modifier-footer");
    const line = /^(\d+)px /.exec(footer["border-top"] ?? "");
    expect(line).not.toBeNull();
    const button = /\.edge-modifier-footer button \{[^}]*min-height: (\d+)px/.exec(css);
    expect(button).not.toBeNull();
    const height = px(footer["margin-top"]) + Number(line?.[1]) + px(footer["padding-top"]) + Number(button?.[1]);
    expect(px(message.bottom)).toBe(height);
  });

  it("is not see-through in the dark theme, where fields scroll under it", () => {
    const dark = declarations('html[data-theme="dark"] .edge-modifier-panel > .edge-modifier-error:has(+ .edge-modifier-footer)');
    expect(dark.background).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("every panel with such a message has it right before the buttons' row", () => {
    // These show their message elsewhere on purpose: the checks list it above their result, and the
    // chamfer panel has a button between message and row and scrolls down to it by itself.
    const elsewhere = new Set(["ClearancePanel.tsx", "LayerCheckPanel.tsx", "PrintCheckPanel.tsx", "EdgeModifierPanel.tsx"]);
    const checked: string[] = [];
    for (const file of readdirSync(panelDir).filter((name) => name.endsWith("Panel.tsx"))) {
      const lines = readFileSync(path.join(panelDir, file), "utf8").split(/\r?\n/);
      if (!lines.some((line) => line.includes('className="edge-modifier-footer"'))) continue;
      // The last message of the panel is the one of its Apply button.
      const index = lines.findLastIndex((line) => /^ {6}\{.*className="edge-modifier-error"/.test(line));
      if (index < 0 || elsewhere.has(file)) continue;
      const next = lines.slice(index + 1).find((line) => line.trim() !== "");
      expect(next, file).toContain('className="edge-modifier-footer"');
      checked.push(file);
    }
    expect(checked).toContain("ShellPanel.tsx");
    expect(checked.length).toBeGreaterThanOrEqual(10);
  });
});
