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
});
