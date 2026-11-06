// @vitest-environment jsdom
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { SurfacePatternPicker, surfacePatternThumbnail } from "@/components/workplane/SurfacePatternPicker";
import { setLanguage } from "@/lib/i18n";
import { SURFACE_TEXTURE_PATTERNS, type SurfaceTexturePattern } from "@/lib/surfaceTexture";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * The surface texture's pattern, chosen by its picture: a field with the chosen one, and a grid of all of them with a
 * search above. Twenty names alone are hard to tell apart.
 */
describe("the surface pattern picker", () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;
  const mount = (value: SurfaceTexturePattern, chosen: string[] = []) => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root!.render(createElement(SurfacePatternPicker, { value, onChange: (next: SurfaceTexturePattern) => chosen.push(next) })));
    return chosen;
  };
  const trigger = () => container!.querySelector<HTMLButtonElement>(".pattern-picker-trigger")!;
  const search = () => container!.querySelector<HTMLInputElement>(".pattern-picker-search input");
  const tiles = () => [...container!.querySelectorAll<HTMLButtonElement>("[role=option]")];
  const key = (target: Element, name: string) => act(() => {
    target.dispatchEvent(new KeyboardEvent("keydown", { key: name, bubbles: true }));
  });
  const type = (input: HTMLInputElement, text: string) => act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, text);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    container = null;
    root = null;
  });

  it("shows the chosen pattern's picture and name, and opened, every pattern with its picture", () => {
    setLanguage("en");
    mount("bricks");
    expect(trigger().textContent).toBe("Bricks");
    expect(trigger().querySelector("img")?.getAttribute("src")).toBe("assets/editor/surface-patterns/bricks.png");
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
    act(() => trigger().click());
    expect(trigger().getAttribute("aria-expanded")).toBe("true");
    expect(tiles()).toHaveLength(SURFACE_TEXTURE_PATTERNS.length);
    expect(tiles().map((tile) => tile.querySelector("img")?.getAttribute("src"))).toEqual(SURFACE_TEXTURE_PATTERNS.map(surfacePatternThumbnail));
    expect(tiles().filter((tile) => tile.getAttribute("aria-selected") === "true").map((tile) => tile.textContent)).toEqual(["Bricks"]);
    // The search has the focus, to type at once.
    expect(document.activeElement).toBe(search());
  });

  it("finds a pattern by its name and takes it with Enter", () => {
    setLanguage("de");
    const chosen = mount("grooves");
    act(() => trigger().click());
    type(search()!, "ziegel");
    expect(tiles().map((tile) => tile.textContent)).toEqual(["Ziegel"]);
    key(search()!, "Enter");
    expect(chosen).toEqual(["bricks"]);
    expect(container!.querySelector(".pattern-picker-popover")).toBeNull();
  });

  it("finds the patterns for model buildings by their everyday names", () => {
    setLanguage("de");
    mount("grooves");
    act(() => trigger().click());
    type(search()!, "fachwerk");
    expect(tiles().map((tile) => tile.textContent)).toEqual(["Fachwerk"]);
    type(search()!, "mauer");
    expect(tiles().map((tile) => tile.textContent)).toEqual(["Natursteinmauer"]);
    setLanguage("en");
    type(search()!, "timber");
    expect(tiles().map((tile) => tile.textContent)).toEqual(["Half-timbering"]);
    type(search()!, "stone");
    expect(tiles().map((tile) => tile.textContent)).toEqual(["Stone wall"]);
    expect(tiles()[0].querySelector("img")?.getAttribute("src")).toBe("assets/editor/surface-patterns/stones.png");
  });

  it("says so when no pattern has the name searched for, and Enter takes nothing", () => {
    setLanguage("en");
    const chosen = mount("grooves");
    act(() => trigger().click());
    type(search()!, "zebra");
    expect(tiles()).toHaveLength(0);
    expect(container!.querySelector(".pattern-picker-empty")?.textContent).toBe("No pattern by that name.");
    key(search()!, "Enter");
    expect(chosen).toEqual([]);
    expect(container!.querySelector(".pattern-picker-popover")).not.toBeNull();
  });

  it("moves through the grid with the arrow keys, two to a row, closes with Escape, keeps keys from the editor and takes a click", () => {
    setLanguage("en");
    const chosen = mount("knurl");
    key(trigger(), "ArrowDown");
    expect(document.activeElement).toBe(search());
    key(search()!, "ArrowDown");
    expect(document.activeElement?.textContent).toBe("Grooves");
    key(document.activeElement!, "ArrowRight");
    expect(document.activeElement?.textContent).toBe("Knurling");
    key(document.activeElement!, "ArrowDown");
    expect(document.activeElement?.textContent).toBe("Bumps");
    key(document.activeElement!, "ArrowLeft");
    expect(document.activeElement?.textContent).toBe("Honeycomb");
    key(document.activeElement!, "ArrowUp");
    expect(document.activeElement?.textContent).toBe("Grooves");
    key(document.activeElement!, "ArrowUp");
    expect(document.activeElement).toBe(search());
    key(search()!, "ArrowDown");
    // Keys stay in the picker, as in the select it stands in for: Delete on a picture must not reach the editor and
    // delete the body, nor Escape deselect it. Undo with Ctrl goes through.
    const reached: string[] = [];
    const listen = (event: KeyboardEvent) => reached.push(event.key);
    window.addEventListener("keydown", listen);
    try {
      key(document.activeElement!, "Delete");
      key(document.activeElement!, "Escape");
      expect(container!.querySelector(".pattern-picker-popover")).toBeNull();
      expect(document.activeElement).toBe(trigger());
      key(trigger(), "Escape");
      key(trigger(), "Backspace");
      act(() => {
        trigger().dispatchEvent(new KeyboardEvent("keydown", { key: "z", ctrlKey: true, bubbles: true }));
      });
    } finally {
      window.removeEventListener("keydown", listen);
    }
    expect(reached).toEqual(["z"]);
    expect(chosen).toEqual([]);
    // A click on a picture takes it; the one already chosen changes nothing.
    act(() => trigger().click());
    act(() => tiles().find((tile) => tile.textContent === "Knurling")!.click());
    expect(chosen).toEqual([]);
    act(() => trigger().click());
    act(() => tiles().find((tile) => tile.textContent === "Rope")!.click());
    expect(chosen).toEqual(["rope"]);
  });

  it("closes when the pointer goes down elsewhere, and does not open while disabled", () => {
    setLanguage("en");
    mount("knurl");
    act(() => trigger().click());
    act(() => {
      document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    });
    expect(container!.querySelector(".pattern-picker-popover")).toBeNull();
    act(() => root!.render(createElement(SurfacePatternPicker, { value: "knurl", disabled: true, onChange: () => undefined })));
    expect(trigger().disabled).toBe(true);
    act(() => trigger().click());
    expect(container!.querySelector(".pattern-picker-popover")).toBeNull();
  });
});

describe("the surface pattern pictures", () => {
  const folder = join(__dirname, "..", "..", "apps", "web", "public", "assets", "editor", "surface-patterns");

  it("has a picture for every pattern, and none for a pattern that is not there", () => {
    const missing = SURFACE_TEXTURE_PATTERNS.filter((pattern) => !existsSync(join(__dirname, "..", "..", "apps", "web", "public", surfacePatternThumbnail(pattern))));
    expect(missing).toEqual([]);
    const extra = readdirSync(folder).filter((file) => !SURFACE_TEXTURE_PATTERNS.some((pattern) => `${pattern}.png` === file));
    expect(extra).toEqual([]);
  });
});
