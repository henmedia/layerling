// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { profileEditor } from "@/lib/vase/vase-editors.mjs";
import { normalizeVaseSettings } from "@/lib/vaseSettings";

// jsdom has no ResizeObserver, no pointer capture and no screen matrix: the board's clicks land in mm here.
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} };
(Element.prototype as unknown as { setPointerCapture: () => void }).setPointerCapture = () => {};
(SVGElement.prototype as unknown as { getScreenCTM: () => unknown }).getScreenCTM = () => ({ inverse: () => ({}) });
(globalThis as { DOMPoint?: unknown }).DOMPoint = class {
  constructor(public x: number, public y: number) {}
  matrixTransform() { return { x: this.x, y: -this.y }; }
};

function pointer(type: string, target: Element, x: number, y: number, detail = 0) {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, detail });
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
  // The points' centres, from their knobs (a circle, or a square for a corner).
  const centre = (k: Element) => (k.tagName === "rect"
    ? [Number(k.getAttribute("x")) + Number(k.getAttribute("width")) / 2, Number(k.getAttribute("y")) + Number(k.getAttribute("height")) / 2]
    : [Number(k.getAttribute("cx")), Number(k.getAttribute("cy"))]);
  const points = () => [...svg.querySelectorAll(".vz-knob")].map(centre);
  const selected = () => [...svg.querySelectorAll(".vz-knob.sel")].map(centre);
  return { svg, points, selected };
}

/**
 * A double-click at (x, y) mm as a browser sends it: each press lands on what lies under the pointer (`under` finds
 * it anew, the first click redraws the board), and as the board holds the pointer from the press on, the release,
 * the click and the double click go to the svg.
 */
function doubleClick(svg: SVGSVGElement, under: () => Element, x: number, y: number) {
  for (const detail of [1, 2]) {
    pointer("pointerdown", under(), x, -y, detail);
    pointer("pointerup", svg, x, -y, detail);
    pointer("click", svg, x, -y, detail);
  }
  pointer("dblclick", svg, x, -y, 2);
}

describe("the vase drawing: a double-click on the line adds a point (Discussion #1252)", () => {
  it("adds a point where the line is double-clicked", () => {
    const { svg, points, selected } = board();
    const before = points();
    // A spot on the line halfway up between the two lowest points.
    const [[, y0], [, y1]] = before;
    const line = svg.querySelector(".vz-curve-hit")!;
    const curve = [...line.getAttribute("d")!.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
    const [x, y] = curve.reduce((a, b) => (Math.abs(b[1] - (y0 + y1) / 2) < Math.abs(a[1] - (y0 + y1) / 2) ? b : a));
    expect(y - y0).toBeGreaterThan(1);
    expect(y1 - y).toBeGreaterThan(1);

    doubleClick(svg, () => svg.querySelector(".vz-curve-hit")!, x, y);

    // One point more, between the two lowest, where the line was clicked, and selected.
    const after = points();
    expect(after).toHaveLength(before.length + 1);
    const [nx, ny] = after[1];
    expect(ny).toBeCloseTo(y, 3);
    expect(nx).toBeCloseTo(x, 1);
    expect(selected()).toEqual([after[1]]);
  });

  it("adds nothing when the board away from the line is double-clicked", () => {
    const { svg, points } = board();
    const before = points();
    const [[, y0], [, y1]] = before;
    // Left of the axis lies only the mirrored half, which is not edited.
    doubleClick(svg, () => svg, -5, (y0 + y1) / 2);
    expect(points()).toEqual(before);
  });
});
