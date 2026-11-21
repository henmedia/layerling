// @vitest-environment jsdom
import { createElement } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ObjectListPanel } from "@/components/workplane/ObjectListPanel";
import { shapeColorKey, shapesOfSameColor } from "@/lib/selectSameColor";
import type { WorkplaneShape } from "@/types/layerling";

const box = (id: string, color: string, extra: Partial<WorkplaneShape> = {}): WorkplaneShape => ({
  id, name: id, kind: "box", color, x: 0, z: 0, elevation: 0, size: 20, width: 20, depth: 20, height: 20, rotation: 0, ...extra,
});

// Discussion #1839: components coloured alike should be selectable in one go from the object list.
describe("select same colour (Discussion #1839)", () => {
  const shapes = [
    box("red1", "#ff0000"),
    box("blue", "#0000ff"),
    box("red2", "#FF0000"),
    box("red3", "#f00"),
    box("redHidden", "#ff0000", { hidden: true }),
    box("hole1", "#ff0000", { hole: true }),
    box("hole2", "#00ff00", { hole: true }),
    box("image", "#ff0000", { imagePlate: {} as WorkplaneShape["imagePlate"] }),
  ];

  it("reads a colour the same however it is written, and all holes as one", () => {
    expect(shapeColorKey(box("a", "#F80"))).toBe("#ff8800");
    expect(shapeColorKey(box("a", " #FF8800 "))).toBe("#ff8800");
    expect(shapeColorKey(box("a", "#123456", { hole: true }))).toBe("hole");
  });

  it("finds every visible shape of the colour, in the design's order, without hidden shapes, holes and reference images", () => {
    expect(shapesOfSameColor(shapes, ["red2"])).toEqual(["red1", "red2", "red3"]);
    expect(shapesOfSameColor(shapes, ["blue"])).toEqual(["blue"]);
  });

  it("takes the colours of several shapes together", () => {
    expect(shapesOfSameColor(shapes, ["blue", "red3"])).toEqual(["red1", "blue", "red2", "red3"]);
  });

  it("selects every hole from a hole, whatever colour it once had", () => {
    expect(shapesOfSameColor(shapes, ["hole1"])).toEqual(["hole1", "hole2"]);
  });

  it("lets a hidden shape name its colour but leaves it out", () => {
    expect(shapesOfSameColor(shapes, ["redHidden"])).toEqual(["red1", "red2", "red3"]);
    expect(shapesOfSameColor([box("only", "#123456", { hidden: true })], ["only"])).toEqual([]);
  });

  it("finds nothing without a shape to take the colour from", () => {
    expect(shapesOfSameColor(shapes, [])).toEqual([]);
    expect(shapesOfSameColor(shapes, ["gone"])).toEqual([]);
  });
});

describe("the colour dot in the object list (Discussion #1839)", () => {
  const props = (extra: Record<string, unknown> = {}) => ({
    shapes: [box("red1", "#ff0000"), box("blue", "#0000ff")],
    selectedIds: [],
    onSelectShape: () => {},
    onToggleLock: () => {},
    onToggleHidden: () => {},
    onClose: () => {},
    ...extra,
  });
  let host: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  afterEach(() => {
    act(() => root?.unmount());
    host?.remove();
    host = null;
    root = null;
  });

  const mount = (extra: Record<string, unknown>) => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    act(() => root?.render(createElement(ObjectListPanel, props(extra))));
    return Array.from(host.querySelectorAll<HTMLButtonElement>('[data-testid="outliner-same-colour"]'));
  };

  it("is a plain dot when the list cannot select by colour", () => {
    const markup = renderToStaticMarkup(createElement(ObjectListPanel, props()));
    expect(markup).not.toContain('data-testid="outliner-same-colour"');
    expect(markup.match(/class="outliner-swatch /g)).toHaveLength(2);
  });

  it("asks for the shapes of its colour and does not select the row as well", () => {
    const onSelectSameColor = vi.fn();
    const onSelectShape = vi.fn();
    const dots = mount({ onSelectSameColor, onSelectShape });
    expect(dots).toHaveLength(2);
    act(() => dots[1].dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(onSelectSameColor).toHaveBeenCalledWith("blue", false);
    expect(onSelectShape).not.toHaveBeenCalled();
  });

  it("adds to the selection with Ctrl, Cmd or Shift", () => {
    const onSelectSameColor = vi.fn();
    const dots = mount({ onSelectSameColor });
    act(() => dots[0].dispatchEvent(new MouseEvent("click", { bubbles: true, ctrlKey: true })));
    act(() => dots[0].dispatchEvent(new MouseEvent("click", { bubbles: true, metaKey: true })));
    act(() => dots[0].dispatchEvent(new MouseEvent("click", { bubbles: true, shiftKey: true })));
    expect(onSelectSameColor.mock.calls).toEqual([["red1", true], ["red1", true], ["red1", true]]);
  });
});
