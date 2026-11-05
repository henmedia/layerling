// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MyShapesSection } from "@/components/workplane/MyShapesSection";
import { ShapeLibraryList } from "@/components/workplane/ShapeLibraryList";
import { setLanguage } from "@/lib/i18n";
import { libraryShapeAssets, shapeAssetMenuLabel } from "@/lib/shapeCatalog";
import { CLOSED_SECTIONS_STORAGE_KEY, storeRecentShape } from "@/lib/shapeLibrarySections";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let container: HTMLDivElement | null = null;

beforeEach(async () => {
  window.localStorage.clear();
  await setLanguage("en", false);
});

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  container = null;
  root = null;
});

function mount(element: Parameters<Root["render"]>[0]) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(element));
  return container;
}

/** The library with a plain button per shape, and a stand-in for the custom shapes' section. */
function library() {
  return mount(createElement(ShapeLibraryList<(typeof libraryShapeAssets)[number]>, {
    shapes: libraryShapeAssets,
    label: (shape) => shapeAssetMenuLabel(shape).replace(/\s+/g, " "),
    renderTile: (shape) => createElement("button", { key: shape.id, type: "button", className: "shape-menu-item", "data-shape": shape.id }, shape.name),
    customShapes: createElement("section", { className: "custom-stand-in" }, "Custom shapes"),
  }));
}

const tiles = (panel: HTMLElement, scope = "") => [...panel.querySelectorAll<HTMLElement>(`${scope} [data-shape]`.trim())].map((tile) => tile.dataset.shape);
const section = (panel: HTMLElement, name: string) => panel.querySelector<HTMLElement>(`section[aria-label="${name}"]`);
const toggle = (panel: HTMLElement, name: string) => section(panel, name)!.querySelector<HTMLButtonElement>(".shape-library-toggle")!;
const searchFor = (panel: HTMLElement, text: string) => {
  const input = panel.querySelector<HTMLInputElement>(".shape-library-search input")!;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  act(() => {
    setter.call(input, text);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  return input;
};

describe("the shape library in sections (#1170)", () => {
  it("shows every section open the first time, with its count, and each shape once", () => {
    const panel = library();
    const headings = [...panel.querySelectorAll(".shape-library-toggle")].map((button) => button.textContent);
    expect(headings).toEqual([
      "Basic shapes15", "Vessels, tubes & transitions4", "Holes & cut-outs4", "Connections4", "Enclosure parts3", "Mechanics & moving parts4",
      "Systems & templates2", "Lettering & signs4", "Decorative outlines4", "Helpers1",
    ]);
    expect([...panel.querySelectorAll(".shape-library-toggle")].every((button) => button.getAttribute("aria-expanded") === "true")).toBe(true);
    expect(tiles(panel)).toHaveLength(45);
    expect(new Set(tiles(panel)).size).toBe(45);
    expect(panel.querySelector(".custom-stand-in")).not.toBeNull();
    // Nothing put in yet: no "Recently used".
    expect(section(panel, "Recently used")).toBeNull();
    // The ruler is marked as a helper that is never exported.
    expect(section(panel, "Helpers")!.textContent).toContain("For measuring only, not exported.");
    expect(tiles(section(panel, "Helpers")!)).toEqual(["ruler"]);
  });

  it("keeps a folded section folded, also the next time the library opens", () => {
    let panel = library();
    act(() => toggle(panel, "Holes & cut-outs").click());
    expect(toggle(panel, "Holes & cut-outs").getAttribute("aria-expanded")).toBe("false");
    expect(tiles(section(panel, "Holes & cut-outs")!)).toEqual([]);
    expect(JSON.parse(window.localStorage.getItem(CLOSED_SECTIONS_STORAGE_KEY)!)).toEqual(["holes"]);
    act(() => root?.unmount());
    container?.remove();
    panel = library();
    expect(toggle(panel, "Holes & cut-outs").getAttribute("aria-expanded")).toBe("false");
    expect(toggle(panel, "Basic shapes").getAttribute("aria-expanded")).toBe("true");
  });

  it("shows only the sections with a match while searching, open, and brings the folded ones back when cleared", () => {
    const panel = library();
    act(() => toggle(panel, "Holes & cut-outs").click());
    searchFor(panel, "USB");
    expect([...panel.querySelectorAll("section")].map((entry) => entry.getAttribute("aria-label"))).toEqual(["Holes & cut-outs"]);
    expect(section(panel, "Holes & cut-outs")!.textContent).toContain("1 of 4");
    expect(tiles(panel)).toEqual(["port"]);
    expect(panel.querySelector(".custom-stand-in")).toBeNull();
    act(() => panel.querySelector<HTMLButtonElement>(".shape-library-clear")!.click());
    expect(panel.querySelector<HTMLInputElement>(".shape-library-search input")!.value).toBe("");
    expect(toggle(panel, "Holes & cut-outs").getAttribute("aria-expanded")).toBe("false");
    expect(toggle(panel, "Connections").getAttribute("aria-expanded")).toBe("true");
    expect(panel.querySelector(".custom-stand-in")).not.toBeNull();
  });

  it("says so when nothing matches, and Escape empties the search", () => {
    const panel = library();
    const input = searchFor(panel, "xyzzy");
    expect(panel.querySelector(".shape-library-empty")!.textContent).toBe("No shapes found.");
    expect(tiles(panel)).toEqual([]);
    const escape = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
    act(() => {
      input.dispatchEvent(escape);
    });
    expect(escape.defaultPrevented).toBe(true);
    expect(input.value).toBe("");
    expect(tiles(panel)).toHaveLength(45);
  });

  it("lists the last four shapes put in on top, newest first, also while the library stays open", () => {
    for (const id of ["box", "thread"]) storeRecentShape(id);
    const panel = library();
    expect(tiles(section(panel, "Recently used")!)).toEqual(["thread", "box"]);
    act(() => {
      for (const id of ["gear", "vase", "box"]) storeRecentShape(id);
    });
    expect(tiles(section(panel, "Recently used")!)).toEqual(["box", "vase", "gear", "thread"]);
    // While searching it stays out of the way, so a shape is not shown twice.
    searchFor(panel, "box");
    expect(section(panel, "Recently used")).toBeNull();
    expect(tiles(panel).filter((id) => id === "box")).toHaveLength(1);
  });

  it("puts the cursor in the search when it opens, but not on a touch screen (Discussion #1276)", () => {
    const original = window.matchMedia;
    try {
      window.matchMedia = ((query: string) => ({ matches: false, media: query })) as typeof window.matchMedia;
      let panel = library();
      expect(document.activeElement).toBe(panel.querySelector(".shape-library-search input"));
      act(() => root?.unmount());
      container?.remove();

      window.matchMedia = ((query: string) => ({ matches: query === "(pointer: coarse)", media: query })) as typeof window.matchMedia;
      panel = library();
      expect(document.activeElement).not.toBe(panel.querySelector(".shape-library-search input"));
    } finally {
      window.matchMedia = original;
    }
  });
});

describe("the custom shapes above the library (#1170)", () => {
  const props = {
    folders: [], serverAvailable: false, canSave: false, defaultName: "Shape",
    onInsert: () => {}, onSave: async () => true, onRename: () => {}, onDelete: () => {}, onMoveToServer: () => {}, onMoveToFolder: () => {},
    onCreateFolder: async () => null, onRenameFolder: async () => null, onDeleteFolder: () => {}, onBackup: () => {}, onLoad: () => {}, onShown: () => {}, onDragDone: () => {},
  };
  const empty = "Select one or more bodies and choose \"Save selection\". They wait here for every design.";

  it("is one folded line while it holds nothing, the explanation behind it", () => {
    const panel = mount(createElement(MyShapesSection, { ...props, shapes: [] }));
    const header = panel.querySelector<HTMLButtonElement>(".my-shapes-toggle")!;
    expect(header.getAttribute("aria-expanded")).toBe("false");
    expect(header.title).toBe(empty);
    expect(panel.textContent).not.toContain(empty);
    expect(panel.querySelector(".my-shapes-save-button")).not.toBeNull();
    act(() => header.click());
    expect(panel.textContent).toContain(empty);
    expect(window.localStorage.getItem("layerling.myShapesCollapsed")).toBe("false");
  });

  it("is open when it holds shapes, as before", () => {
    const panel = mount(createElement(MyShapesSection, { ...props, shapes: [{ id: "a", name: "Bracket", thumbnail: "", location: "browser", folderId: null }] }));
    expect(panel.querySelector(".my-shapes-toggle")!.getAttribute("aria-expanded")).toBe("true");
  });
});
