// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TapeLengthField } from "@/components/workplane/TapeLengthField";
import { TapeOverlay, type TapeOverlayState } from "@/components/workplane/ViewportOverlays";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// The field a click on a tape measurement's number opens (#823), with the reach along each axis (Discussion #610).
describe("the tape measure's length field", () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;
  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    container = null;
    root = null;
  });

  const mount = (axes: Array<{ axis: "X" | "Y" | "Z"; text: string }> = [{ axis: "X", text: "48.60" }, { axis: "Y", text: "1.33" }]) => {
    const onApply = vi.fn();
    const onCancel = vi.fn();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root!.render(createElement(TapeLengthField, { x: 100, y: 80, length: "48.62", axes, onApply, onCancel })));
    const inputs = [...container.querySelectorAll<HTMLInputElement>("input")];
    return { onApply, onCancel, inputs };
  };
  const type = (input: HTMLInputElement, text: string) => {
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, text);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  };
  const key = (input: HTMLInputElement, name: string) => act(() => {
    input.dispatchEvent(new KeyboardEvent("keydown", { key: name, bubbles: true }));
  });
  const focus = (input: HTMLInputElement) => act(() => input.focus());

  it("opens on the length, with a field for each axis the label lists", () => {
    const { inputs } = mount();
    expect(inputs.map((input) => input.value)).toEqual(["48.62", "48.60", "1.33"]);
    expect(document.activeElement).toBe(inputs[0]);
    expect(inputs[1].getAttribute("aria-label")).toBe("Distance along X: the body moves along X only");
    expect(inputs[2].dataset.axis).toBe("y");
  });

  it("has only the length along a single axis", () => {
    const { inputs } = mount([]);
    expect(inputs).toHaveLength(1);
  });

  it("applies the length typed, on Enter", () => {
    const { inputs, onApply, onCancel } = mount();
    type(inputs[0], "40");
    key(inputs[0], "Enter");
    expect(onApply).toHaveBeenCalledWith({ field: "length", text: "40" });
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("applies one axis typed, and puts the other numbers back to what they read", () => {
    const { inputs, onApply } = mount();
    type(inputs[0], "40");
    focus(inputs[1]);
    type(inputs[1], "30");
    expect(inputs.map((input) => input.value)).toEqual(["48.62", "30", "1.33"]);
    key(inputs[1], "Enter");
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledWith({ field: "X", text: "30" });
  });

  it("makes the focused number exact on Enter before anything is typed", () => {
    const { inputs, onApply } = mount();
    focus(inputs[2]);
    key(inputs[2], "Enter");
    expect(onApply).toHaveBeenCalledWith({ field: "Y", text: "1.33" });
  });

  it("stays open from one of its fields to the next", () => {
    const { inputs, onApply, onCancel } = mount();
    type(inputs[1], "30");
    focus(inputs[2]);
    expect(onApply).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("applies what was typed when it is left, and moves nothing when nothing was typed", () => {
    const typed = mount();
    focus(typed.inputs[2]);
    type(typed.inputs[2], "5");
    act(() => typed.inputs[2].blur());
    expect(typed.onApply).toHaveBeenCalledWith({ field: "Y", text: "5" });
    act(() => root?.unmount());
    container?.remove();

    const untouched = mount();
    act(() => untouched.inputs[0].blur());
    expect(untouched.onApply).not.toHaveBeenCalled();
    expect(untouched.onCancel).toHaveBeenCalledTimes(1);
  });

  it("cancels on Escape, and the blur that follows applies nothing", () => {
    const { inputs, onApply, onCancel } = mount();
    type(inputs[0], "10");
    key(inputs[0], "Escape");
    act(() => inputs[0].blur());
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onApply).not.toHaveBeenCalled();
  });
});

describe("a tape measurement's label (Discussion #610)", () => {
  const segment = (overrides: Partial<TapeOverlayState["segments"][number]>): TapeOverlayState["segments"][number] => ({
    id: "s1", startId: "p1", endId: "p2", x1: 0, y1: 0, x2: 100, y2: 0, labelX: 50, labelY: -20, label: "40.00",
    editable: true, lengthHint: "Type a length: “Box B” moves along the line; a negative length takes it past the other point",
    axes: "XY", deltas: "ΔX 30.00   ΔY 26.46", midX: 50, midY: 0, occluded: false, ...overrides,
  });
  const render = (segments: TapeOverlayState["segments"], deleteMode = false, editingLengthId: string | null = null) => renderToStaticMarkup(createElement(TapeOverlay, {
    overlay: { points: [], segments, hover: null },
    startPointId: null,
    active: true,
    deleteMode,
    moveMode: false,
    onPointPointerDown: () => {},
    onPointPointerMove: () => {},
    onPointPointerUp: () => {},
    onSegmentPointerDown: () => {},
    onEditLength: () => {},
    editingLengthId,
  }));

  it("is a button named by its distance, whose tip names the body that moves", () => {
    const markup = render([segment({})]);
    expect(markup).toMatch(/<button[^>]*class="tape-label editable/);
    expect(markup).toContain('aria-label="Distance 40.00 mm"');
    expect(markup).toContain("title=\"Type a length: “Box B” moves along the line");
  });

  it("stays as it is when it cannot be typed, and says why", () => {
    const markup = render([segment({ editable: false, lengthHint: "“Box B” is locked, so a typed length cannot move it" })]);
    expect(markup).not.toContain("<button");
    expect(markup).toMatch(/<span[^>]*class="tape-label[^"]*has-hint/);
    expect(markup).toContain("title=\"“Box B” is locked, so a typed length cannot move it\"");
  });

  it("makes way for its field while that is open, and only for its own", () => {
    const markup = render([segment({}), segment({ id: "s2", label: "12.00" })], false, "s1");
    expect(markup).not.toContain("40.00");
    expect(markup).toContain("12.00");
  });

  it("says nothing of typing while measurements are being deleted", () => {
    const markup = render([segment({})], true);
    expect(markup).not.toContain("<button");
    expect(markup).not.toContain("title=");
  });
});
