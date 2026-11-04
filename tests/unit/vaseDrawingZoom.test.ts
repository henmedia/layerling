// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { profileEditor } from "@/lib/vase/vase-editors.mjs";
import { normalizeVaseSettings } from "@/lib/vaseSettings";

// jsdom has no ResizeObserver, no pointer capture and no screen matrix: the board's points are dragged in mm here.
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} };
(Element.prototype as unknown as { setPointerCapture: () => void }).setPointerCapture = () => {};
(SVGElement.prototype as unknown as { getScreenCTM: () => unknown }).getScreenCTM = () => ({ inverse: () => ({}) });
(globalThis as { DOMPoint?: unknown }).DOMPoint = class {
  constructor(public x: number, public y: number) {}
  matrixTransform() { return { x: this.x, y: -this.y }; }
};

function pointer(type: string, target: Element, x = 0, y = 0) {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y });
  Object.defineProperty(event, "pointerId", { value: 1 });
  target.dispatchEvent(event);
}

/** The profile board on a default vase, fitted as the window opens it. */
function board() {
  let value = normalizeVaseSettings({});
  const b = profileEditor({ get: () => value, set: (patch: Record<string, unknown>) => { value = { ...value, ...patch }; }, notify: () => {} });
  document.body.append(b.el);
  b.fit();
  const svg = b.el.querySelector("svg")!;
  const viewBox = () => svg.getAttribute("viewBox")!.split(" ").map(Number);
  return { b, svg, viewBox };
}

/** Drags point `index` (its hit circle) to (x, y) mm and lets go. */
function drag(svg: SVGSVGElement, index: number, x: number, y: number) {
  const hit = svg.querySelectorAll(".vz-hit")[index];
  pointer("pointerdown", hit);
  pointer("pointermove", svg, x, y);
  pointer("pointerup", svg, x, y);
}

describe("the vase drawing keeps its zoom when a point is dropped (Discussion #1278)", () => {
  it("stays zoomed in on a part after a point there is moved", () => {
    const { b, svg, viewBox } = board();
    const zoomIn = b.el.querySelector('button[aria-label="vaseDraw.zoomIn"]') as HTMLButtonElement;
    for (let i = 0; i < 4; i++) zoomIn.click();
    const zoomed = viewBox();
    const [x0, yTop, w, h] = zoomed;
    // A point moved to the middle of the zoomed view: the vase still reaches past the view, which stays as it was.
    drag(svg, 1, x0 + w / 2, -(yTop + h / 2));
    expect(viewBox()).toEqual(zoomed);
  });

  it("still follows a shape that grows past a view showing all of it", () => {
    const { svg, viewBox } = board();
    const fitted = viewBox();
    drag(svg, 1, fitted[0] + fitted[2] * 3, -(fitted[1] + fitted[3] / 2));
    const after = viewBox();
    expect(after[2]).toBeGreaterThan(fitted[2]);
  });
});
