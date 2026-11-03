// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { profileEditor, sectionEditor, twistEditor } from "@/lib/vase/vase-editors.mjs";
import { normalizeVaseSettings } from "@/lib/vaseSettings";

// jsdom has no ResizeObserver; the board only uses it to fit itself to a new size.
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} };

const css = readFileSync(path.resolve(__dirname, "../../apps/web/src/app/globals.css"), "utf8");

/** One drawing board as the window builds it, on a vase with the default settings. */
function board(editor: typeof profileEditor) {
  let value = normalizeVaseSettings({});
  return editor({ get: () => value, set: (patch: Record<string, unknown>) => { value = { ...value, ...patch }; }, notify: () => {} }).el as HTMLElement;
}

describe("the drawing window's side column (Discussion #1186)", () => {
  it("holds every row beside the board in one column, the board first", () => {
    for (const editor of [profileEditor, sectionEditor, twistEditor]) {
      const el = board(editor);
      expect([...el.children].map((child) => child.className)).toEqual(["vz-board", "vz-side"]);
      const side = el.querySelector(".vz-side")!;
      expect(side.querySelector(".vz-hint")).not.toBeNull();
      expect(side.querySelectorAll(":scope > .vz-row").length).toBe(5);
      expect(side.querySelector(".vz-board, svg")).toBeNull();
    }
  });

  it("scrolls the column on its own in the wide window, and leaves it out of the way elsewhere", () => {
    const wide = css.slice(css.indexOf("@media (min-width: 901px) {\n  .vase-drawing-window .vz {"));
    const rule = wide.slice(wide.indexOf(".vase-drawing-window .vz > .vz-side {"), wide.indexOf("}", wide.indexOf(".vase-drawing-window .vz > .vz-side {")));
    expect(rule).toContain("overflow-y: auto;");
    expect(rule).toContain("min-height: 0;");
    expect(rule).toContain("grid-column: 2;");
    // The board and the column share the one row the window gives them, so the column is no taller than the board.
    expect(css).toMatch(/\.vase-drawing-window \.vz \{\n  flex: 1;\n  grid-template-rows: minmax\(0, 1fr\);/);
    const injected = readFileSync(path.resolve(__dirname, "../../apps/web/src/lib/vase/vase-editors.mjs"), "utf8");
    expect(injected).toContain(".vz-side { display: contents; }");
  });
});
