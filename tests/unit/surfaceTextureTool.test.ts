// @vitest-environment jsdom
import { act, createElement, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { SurfaceTextureCard } from "@/components/workplane/ShapeInspector";
import { normalizeSurfaceTexture } from "@/lib/surfaceTexture";
import { DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";
import { canonicalizeShape } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const cylinder: WorkplaneShape = canonicalizeShape({
  id: "c1", name: "Cylinder", kind: "cylinder", color: "#d97813", x: 0, z: 0, elevation: 0,
  size: 30, width: 30, depth: 30, height: 20, rotation: 0,
});

// The button "Surface texture" under "Modify" and the card's own header open and close the same card.
describe("the surface texture card, opened from the toolbar", () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;
  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    container = null;
    root = null;
  });

  // The editor's side: one open state, changed by the toolbar (here `toggle`) and by the card.
  let toggle: () => void = () => {};
  let changes: boolean[] = [];
  function Host() {
    const [open, setOpen] = useState(false);
    toggle = () => setOpen((current) => !current);
    return createElement(SurfaceTextureCard, {
      shape: cylinder,
      workspace: DEFAULT_WORKPLANE_WORKSPACE,
      disabled: false,
      onApply: () => {},
      open,
      onOpenChange: (next: boolean) => {
        changes.push(next);
        setOpen(next);
      },
    });
  }
  const mount = () => {
    changes = [];
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root!.render(createElement(Host)));
  };
  const header = () => container!.querySelector<HTMLButtonElement>(".property-card-header")!;
  const body = () => container!.querySelector(`#surface-texture-${cylinder.id}`);

  it("opens and closes with the toolbar button", () => {
    mount();
    expect(body()).toBeNull();
    act(() => toggle());
    expect(header().getAttribute("aria-expanded")).toBe("true");
    expect(body()).not.toBeNull();
    act(() => toggle());
    expect(body()).toBeNull();
  });

  it("tells the editor when its own header opens or closes it, so the button shows the same", () => {
    mount();
    act(() => header().click());
    expect(changes).toEqual([true]);
    expect(body()).not.toBeNull();
    act(() => header().click());
    expect(changes).toEqual([true, false]);
    expect(body()).toBeNull();
  });

  it("keeps its own open state when nobody holds it", () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root!.render(createElement(SurfaceTextureCard, { shape: cylinder, workspace: DEFAULT_WORKPLANE_WORKSPACE, disabled: false, onApply: () => {} })));
    expect(body()).toBeNull();
    act(() => header().click());
    expect(body()).not.toBeNull();
  });
});

// Issue #1462: an image pressed on once goes onto picked faces as a pattern all over does, so the card offers the picking.
describe("picking faces in the surface texture card", () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;
  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    container = null;
    root = null;
  });
  /**
   * The card's Pick faces button for a pattern: the card shown on a body carrying it (which gives the card its settings),
   * then on the body with the texture taken off - the card keeps its settings, ready to apply again, as after an undo.
   */
  const pickButton = (texture: Record<string, unknown>) => {
    const textured = { ...cylinder, surfaceTexture: normalizeSurfaceTexture(texture) } as WorkplaneShape;
    const card = (shape: WorkplaneShape) => createElement(SurfaceTextureCard, {
      shape, workspace: DEFAULT_WORKPLANE_WORKSPACE, disabled: false, onApply: () => {}, open: true, onOpenChange: () => {}, onFacePick: () => {},
    });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root!.render(card(textured)));
    act(() => root!.render(card(cylinder)));
    return Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.trim() === "Pick faces") ?? null;
  };

  it("offers Pick faces for an image pressed on once, as for an image repeated all over", () => {
    for (const texture of [{ pattern: "image", imageTiling: "once" }, { pattern: "image", imageTiling: "repeat" }, { pattern: "knurl" }]) {
      expect(pickButton(texture), JSON.stringify(texture)).not.toBeNull();
      act(() => root?.unmount());
      container?.remove();
    }
  });

  it("still leaves it out for a text, which goes where it is put", () => {
    expect(pickButton({ pattern: "text" })).toBeNull();
  });

  // Discussion #1607: the picked faces can be lit for a look, without picking, and the button leaves with the faces.
  const showButton = (container: HTMLElement) => Array.from(container.querySelectorAll("button")).find((button) => /picked faces$/.test(button.textContent?.trim() ?? "") && button.textContent?.trim() !== "Pick faces") ?? null;
  const renderCard = (texture: Record<string, unknown>, facesShown: boolean, onFacePick: (...args: unknown[]) => void) => {
    const textured = { ...cylinder, surfaceTexture: normalizeSurfaceTexture(texture) } as WorkplaneShape;
    const card = (shape: WorkplaneShape) => createElement(SurfaceTextureCard, {
      shape, workspace: DEFAULT_WORKPLANE_WORKSPACE, disabled: false, onApply: () => {}, open: true, onOpenChange: () => {}, facesShown, onFacePick,
    });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root!.render(card(textured)));
    act(() => root!.render(card(cylinder)));
    return container;
  };

  it("offers Show picked faces only once faces are picked, and asks the editor to light them without picking", () => {
    expect(showButton(renderCard({ pattern: "knurl" }, false, () => {}))).toBeNull();
    act(() => root?.unmount());
    container?.remove();
    const calls: unknown[][] = [];
    const shown = renderCard({ pattern: "knurl", faces: [{ at: [0, 0, 1], normal: [0, 0, 1] }, { at: [0, 0, 0], normal: [0, 0, -1] }] }, false, (...args) => calls.push(args));
    const button = showButton(shown);
    expect(button?.textContent?.trim()).toBe("Show picked faces");
    act(() => button!.click());
    expect(calls).toHaveLength(1);
    expect(calls[0][2]).toBe(true);
    expect(calls[0][0]).toHaveLength(2);
  });

  it("turns Show picked faces into Hide, which lets the editor go", () => {
    const calls: unknown[][] = [];
    const shown = renderCard({ pattern: "knurl", faces: [{ at: [0, 0, 1], normal: [0, 0, 1] }] }, true, (...args) => calls.push(args));
    const button = showButton(shown);
    expect(button?.textContent?.trim()).toBe("Hide picked faces");
    act(() => button!.click());
    expect(calls[0][0]).toBeNull();
  });
});

// Discussion #1972: after "Change texture" the card stays on the texture group one was working on.
describe("the surface texture card with several texture groups", () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;
  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    container = null;
    root = null;
  });

  const top = { at: [0, 0, 1] as [number, number, number], normal: [0, 0, 1] as [number, number, number] };
  /** A body carrying these texture groups that keeps the body under it, so the card shows them to change. */
  const texturedWith = (id: string, layers: Record<string, unknown>[]): WorkplaneShape => {
    const [first, ...more] = layers.map((layer) => normalizeSurfaceTexture(layer));
    return {
      ...cylinder,
      id,
      surfaceTexture: first,
      surfaceTextureLayers: more,
      edgeTreatmentHistory: [{ feature: { kind: "surfaceTexture" } }],
    } as unknown as WorkplaneShape;
  };
  const card = (shape: WorkplaneShape, more: Record<string, unknown> = {}) => createElement(SurfaceTextureCard, {
    shape, workspace: DEFAULT_WORKPLANE_WORKSPACE, disabled: false, onApply: () => {}, onRemove: () => {}, open: true, onOpenChange: () => {}, onFacePick: () => {}, ...more,
  });
  const mount = (shape: WorkplaneShape, more: Record<string, unknown> = {}) => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root!.render(card(shape, more)));
  };
  const tabs = () => Array.from(container!.querySelectorAll<HTMLButtonElement>(".surface-layers [role=tab]"));
  const selectedTab = () => tabs().findIndex((tab) => tab.getAttribute("aria-selected") === "true");

  it("keeps the shown group when the texture is changed", () => {
    mount(texturedWith("c1", [{ pattern: "knurl" }, { pattern: "honeycomb", faces: [top] }]));
    expect(tabs().map((tab) => tab.textContent)).toEqual(["1Knurling", "2Honeycomb"]);
    act(() => tabs()[1].click());
    expect(selectedTab()).toBe(1);
    // "Change texture" hands the body back with the new settings: the second group stays the one shown.
    act(() => root!.render(card(texturedWith("c1", [{ pattern: "knurl" }, { pattern: "honeycomb", faces: [top], depth: 1.4 }]))));
    expect(selectedTab()).toBe(1);
  });

  it("goes back to the last group there is when the shown one is gone", () => {
    mount(texturedWith("c1", [{ pattern: "knurl" }, { pattern: "honeycomb", faces: [top] }, { pattern: "grooves", faces: [top] }]));
    act(() => tabs()[2].click());
    act(() => root!.render(card(texturedWith("c1", [{ pattern: "knurl" }, { pattern: "honeycomb", faces: [top] }]))));
    expect(selectedTab()).toBe(1);
  });

  it("starts with the first group on another body", () => {
    mount(texturedWith("c1", [{ pattern: "knurl" }, { pattern: "honeycomb", faces: [top] }]));
    act(() => tabs()[1].click());
    act(() => root!.render(card(texturedWith("c2", [{ pattern: "grooves" }, { pattern: "bumps", faces: [top] }]))));
    expect(selectedTab()).toBe(0);
  });

  it("names the button for another group and holds Change texture in the bar that stays in sight", () => {
    mount(texturedWith("c1", [{ pattern: "knurl" }]));
    expect(container!.querySelector(".surface-layer-add")?.textContent?.trim()).toBe("Texture group");
    const actions = Array.from(container!.querySelectorAll(".surface-texture-actions button")).map((button) => button.textContent?.trim());
    expect(actions).toEqual(["Change texture"]);
  });

  it("offers Show texture clearly only on a textured body, as a look the view holds", () => {
    const looks: boolean[] = [];
    const toggle = () => Array.from(container!.querySelectorAll("label, .property-row, div")).find((row) => row.textContent?.trim() === "Show texture clearly") ?? null;
    mount(cylinder, { onTextureLookChange: (look: boolean) => looks.push(look) });
    expect(toggle()).toBeNull();
    act(() => root!.render(card(texturedWith("c1", [{ pattern: "knurl" }]), { onTextureLookChange: (look: boolean) => looks.push(look) })));
    const row = toggle();
    expect(row).not.toBeNull();
    act(() => (row!.querySelector("button, input") as HTMLElement).click());
    expect(looks).toEqual([true]);
  });
});
