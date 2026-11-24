// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { ShapeInspector } from "@/components/workplane/ShapeInspector";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * The inspector's card for a hollowed box, its lid or its loose insert: it says what the selected part belongs to and
 * opens Hollow or the Lid tool on the box with one tap.
 */
beforeAll(() => {
  // jsdom lays nothing out; the panel only scrolls itself back to the top.
  Element.prototype.scrollTo ??= () => {};
});

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  container = null;
  root = null;
});

type Actions = NonNullable<Parameters<typeof ShapeInspector>[0]["boxActions"]>;

function mount(boxActions?: Actions | null) {
  const asset = toolbarShapeAssets.find((entry) => entry.kind === "box")!;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(createElement(ShapeInspector, {
      shape: makeShapeFromAsset(asset, { x: 0, z: 0 }),
      snap: DEFAULT_SNAP_GRID,
      snapOpen: false,
      workspace: DEFAULT_WORKPLANE_WORKSPACE,
      onUpdate: () => {},
      onSnapChange: () => {},
      onSnapOpenChange: () => {},
      ...(boxActions === undefined ? {} : { boxActions }),
    }));
  });
  return container;
}

const find = (panel: HTMLElement, id: string) => panel.querySelector<HTMLElement>(`[data-testid="${id}"]`);

describe("the inspector's card for a box, its lid and its insert", () => {
  it("is not there for a body that is neither", () => {
    expect(find(mount(), "box-actions")).toBeNull();
    act(() => root?.unmount());
    expect(find(mount(null), "box-actions")).toBeNull();
    act(() => root?.unmount());
    // Nothing to open: no card.
    expect(find(mount({ part: "box", bodyName: "Box", hasLid: false }), "box-actions")).toBeNull();
  });

  it("offers a hollowed box its compartments and its lid, made or to be made", () => {
    const opened: string[] = [];
    const panel = mount({ part: "box", bodyName: "Box", hasLid: false, onHollow: () => opened.push("hollow"), onLid: () => opened.push("lid") });
    const card = find(panel, "box-actions")!;
    expect(card.querySelector("strong")!.textContent).toBe("Box");
    expect(card.textContent).not.toContain("Belongs to");
    expect(find(panel, "box-action-lid")!.textContent).toBe("Make lid");
    act(() => find(panel, "box-action-hollow")!.click());
    act(() => find(panel, "box-action-lid")!.click());
    expect(opened).toEqual(["hollow", "lid"]);
    act(() => root?.unmount());
    expect(find(mount({ part: "box", bodyName: "Box", hasLid: true, onHollow: () => {}, onLid: () => {} }), "box-action-lid")!.textContent).toBe("Change lid");
  });

  it("says for a lid and for an insert which box they belong to", () => {
    const lid = mount({ part: "lid", bodyName: "Screws", hasLid: true, onHollow: () => {}, onLid: () => {} });
    expect(find(lid, "box-actions")!.textContent).toContain("Lid of a box");
    expect(find(lid, "box-actions")!.textContent).toContain("Belongs to: Screws");
    expect(find(lid, "box-action-hollow")!.textContent).toBe("Change compartments");
    act(() => root?.unmount());
    // A box that cannot be hollowed again has only its lid to change.
    const insert = mount({ part: "insert", bodyName: "Screws", hasLid: false, onLid: () => {} });
    expect(find(insert, "box-actions")!.textContent).toContain("Insert of a box");
    expect(find(insert, "box-action-hollow")).toBeNull();
    expect(find(insert, "box-action-lid")!.textContent).toBe("Make lid");
  });
});
