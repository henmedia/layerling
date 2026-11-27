// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VaseDrawingWindow } from "@/components/workplane/VaseDrawingWindow";
import { t } from "@/lib/i18n";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import type { WorkplaneShape } from "@/types/layerling";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
// jsdom has no ResizeObserver, loads no pictures and draws on no canvas: the photo is a picture that loads at once.
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} };

/**
 * The vase drawing window's reference photo (#2161): it belongs to the side view's board, so closing the window or
 * going to another tab lets it go - its object URL released - and the board made again starts without it.
 */
let root: Root | null = null;
let container: HTMLDivElement | null = null;
let made: string[] = [];
let released: string[] = [];

beforeEach(() => {
  made = [];
  released = [];
  vi.spyOn(URL, "createObjectURL").mockImplementation(() => {
    const url = `blob:photo-${made.length + 1}`;
    made.push(url);
    return url;
  });
  vi.spyOn(URL, "revokeObjectURL").mockImplementation((url: string) => { released.push(url); });
  vi.stubGlobal("Image", class {
    naturalWidth = 300;
    naturalHeight = 600;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(_value: string) { queueMicrotask(() => this.onload?.()); }
  });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  container = null;
  root = null;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function mount() {
  const asset = toolbarShapeAssets.find((entry) => entry.kind === "vase")!;
  const shape = makeShapeFromAsset(asset, { x: 0, z: 0 }) as WorkplaneShape;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(createElement(VaseDrawingWindow, { shape, disabled: false, onUpdate: () => {}, onClose: () => {} }));
  });
  return document.querySelector<HTMLElement>(".vase-drawing-window")!;
}

const tab = (panel: HTMLElement, key: "vaseDraw.tabProfile" | "vaseDraw.tabSection" | "vaseDraw.tabTwist") =>
  [...panel.querySelectorAll<HTMLButtonElement>(".vase-drawing-tabs button")].find((button) => button.textContent === t(key))!;
const shownPhoto = (panel: HTMLElement) => panel.querySelector(".vase-drawing-host svg image")?.getAttribute("href") ?? null;

async function pickPhoto(panel: HTMLElement) {
  const input = panel.querySelector<HTMLInputElement>('.vase-drawing-host input[type="file"][accept="image/*"]')!;
  Object.defineProperty(input, "files", { value: [new File(["photo"], "vase.jpg", { type: "image/jpeg" })], configurable: true });
  await act(async () => {
    input.dispatchEvent(new Event("change"));
    await Promise.resolve();
  });
}

describe("the vase drawing window's reference photo (#2161)", () => {
  it("is let go on another tab, and the side view comes back without it", async () => {
    const panel = mount();
    await pickPhoto(panel);
    expect(shownPhoto(panel)).toBe("blob:photo-1");
    for (const key of ["vaseDraw.tabSection", "vaseDraw.tabTwist"] as const) {
      act(() => tab(panel, key).click());
      expect(released).toEqual(["blob:photo-1"]);
    }
    act(() => tab(panel, "vaseDraw.tabProfile").click());
    expect(shownPhoto(panel)).toBeNull();
    expect(released).toEqual(["blob:photo-1"]);
  });

  it("is let go when the window closes", async () => {
    const panel = mount();
    await pickPhoto(panel);
    await pickPhoto(panel);
    expect(shownPhoto(panel)).toBe("blob:photo-2");
    expect(released).toEqual(["blob:photo-1"]);
    act(() => root!.unmount());
    root = null;
    expect(released).toEqual(["blob:photo-1", "blob:photo-2"]);
  });
});
