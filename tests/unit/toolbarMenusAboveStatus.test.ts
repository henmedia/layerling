import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const css = readFileSync(fileURLToPath(new URL("../../apps/web/src/app/globals.css", import.meta.url)), "utf8");

/** The z-index of the first rule whose selector is exactly this one. */
function zIndexOf(selector: string) {
  const start = css.indexOf(`\n${selector} {`);
  expect(start, selector).toBeGreaterThan(-1);
  const body = css.slice(start, css.indexOf("}", start));
  const match = /z-index:\s*(\d+);/.exec(body);
  expect(match, `${selector} has a z-index`).not.toBeNull();
  return Number(match![1]);
}

// Discussion #1849: "Deleted 1 shape - Undo - x" lay over the visibility menu opened right after deleting.
describe("a menu hanging from the toolbar and the status message", () => {
  const OPEN_MENU = ".secondary-toolbar:has(.toolbar-section[data-collapsed][data-open], .visibility-dropdown, .shape-menu-dropdown:not(.shape-menu-under-inspector))";

  it("the toolbar at rest stays under the message, which floats over the workplane", () => {
    expect(zIndexOf(".secondary-toolbar")).toBeLessThan(zIndexOf(".editor-status"));
  });

  it("the toolbar rises above the message while one of its menus is open", () => {
    expect(zIndexOf(OPEN_MENU)).toBeGreaterThan(zIndexOf(".editor-status"));
  });

  it("stays under what is a window of its own: the install hint and the dialogs", () => {
    expect(zIndexOf(OPEN_MENU)).toBeLessThan(55);
  });
});
