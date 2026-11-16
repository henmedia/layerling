// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { ShapeInspector } from "@/components/workplane/ShapeInspector";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";
import { canonicalizeShape } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Discussion #1573: the texture mask sits inside the Surface texture card instead of a card of its own, the folded card still
 * says the body is a mask, and Wrap around a cylinder and Surface texture come after Twist & Lean.
 */
beforeAll(() => {
  Element.prototype.scrollTo ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
});

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  container = null;
  root = null;
});

const box = canonicalizeShape({
  id: "b1", name: "Box", kind: "box", color: "#d97813", x: 0, z: 0, elevation: 0,
  size: 30, width: 30, depth: 20, height: 20, rotation: 0,
});

function mount(shape: WorkplaneShape) {
  const updates: Array<Partial<WorkplaneShape>> = [];
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(createElement(ShapeInspector, {
      shape,
      snap: DEFAULT_SNAP_GRID,
      snapOpen: false,
      workspace: DEFAULT_WORKPLANE_WORKSPACE,
      onUpdate: (patch: Partial<WorkplaneShape>) => updates.push(patch),
      onSnapChange: () => {},
      onSnapOpenChange: () => {},
      onSurfaceTexture: () => {},
      onRemoveSurfaceTexture: () => {},
    }));
  });
  return { panel: container, updates };
}

const headers = (panel: HTMLElement) => [...panel.querySelectorAll<HTMLButtonElement>("button.property-card-header")];
const titles = (panel: HTMLElement) => headers(panel).map((header) => header.textContent ?? "");
const textureHeader = (panel: HTMLElement) => headers(panel).find((header) => header.textContent?.startsWith("Surface texture"))!;
const maskSelect = (panel: HTMLElement) => [...panel.querySelectorAll<HTMLSelectElement>("select")].find((select) => [...select.options].some((option) => option.value === "exclude"));

function choose(select: HTMLSelectElement, value: string) {
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")!.set!.call(select, value);
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

describe("the texture mask in the Surface texture card", () => {
  it("has no card of its own, and the mask choice is inside the opened Surface texture card", () => {
    const { panel, updates } = mount(box);
    expect(titles(panel).some((title) => title.startsWith("Texture mask"))).toBe(false);
    expect(maskSelect(panel)).toBeUndefined();
    act(() => textureHeader(panel).click());
    const select = maskSelect(panel)!;
    expect(select).toBeDefined();
    expect(select.value).toBe("none");
    choose(select, "exclude");
    expect(updates.at(-1)).toEqual({ surfaceTextureMask: "exclude", transparent: true });
  });

  it("puts Wrap around a cylinder and Surface texture after Twist & Lean", () => {
    const { panel } = mount(box);
    const order = titles(panel).map((title) => title.replace(/Texture mask.*$/, "").trim());
    const lean = order.indexOf("Twist & Lean");
    const texture = order.indexOf("Surface texture");
    expect(lean).toBeGreaterThanOrEqual(0);
    expect(texture).toBeGreaterThan(lean);
    const wrap = order.indexOf("Wrap around a cylinder");
    if (wrap >= 0) {
      expect(wrap).toBeGreaterThan(lean);
      expect(texture).toBeGreaterThan(wrap);
    }
  });

  it("says in the folded card that the body is a mask, and drops the note when the mask is off", () => {
    const { panel } = mount({ ...box, surfaceTextureMask: "exclude", transparent: true });
    expect(textureHeader(panel).textContent).toBe("Surface textureTexture mask: Keeps the texture away");
    const plain = mount(box);
    expect(textureHeader(plain.panel).textContent).toBe("Surface texture");
  });

  it("turns the mask off again with the choice None", () => {
    const { panel, updates } = mount({ ...box, surfaceTextureMask: "only", transparent: true });
    act(() => textureHeader(panel).click());
    const select = maskSelect(panel)!;
    expect(select.value).toBe("only");
    choose(select, "none");
    expect(updates.at(-1)).toEqual({ surfaceTextureMask: undefined });
  });
});
