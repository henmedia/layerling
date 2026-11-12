// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { CornerRulerToolOverlay, type CornerRulerOverlayState } from "@/components/workplane/ViewportOverlays";
import type { CornerRulerAxis } from "@/lib/rulerDimensions";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  container = null;
  root = null;
});

type Item = CornerRulerOverlayState["items"][number];

/** A square on the plate seen from the front left: its x arm runs along Y, its z arm along X, the third arm along Z. */
function item(arms: Record<CornerRulerAxis, boolean>, elevationGrip = arms.elevation): Item {
  return {
    id: "corner-ruler-1",
    mode: "endpoint",
    modes: { x: "endpoint", z: "endpoint", elevation: "endpoint" },
    handleX: 200,
    handleY: 300,
    ends: {
      x: { x: 260, y: 270, text: "100 mm", grip: arms.x },
      z: { x: 300, y: 320, text: "80 mm", grip: arms.z },
      elevation: { x: 200, y: 240, text: "50 mm", grip: elevationGrip },
    },
    arms,
    axisNames: { x: "Y", z: "X", elevation: "Z" },
    occlude: true,
    selectedOnly: false,
    labels: [],
    neighborLabels: [],
    selectedCoordinate: null,
  };
}

function mount(entry: Item) {
  const toggled: { id: string; arm: CornerRulerAxis }[] = [];
  const noop = () => {};
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(createElement(CornerRulerToolOverlay, {
      overlay: { items: [entry] },
      onHandlePointerDown: noop,
      onHandlePointerMove: noop,
      onHandlePointerUp: noop,
      onDelete: noop,
      onToggleMode: noop,
      onToggleAxisMode: noop,
      onToggleOcclude: noop,
      onToggleSelectedOnly: noop,
      onArmEndPointerDown: noop,
      onArmEndPointerMove: noop,
      onArmEndPointerUp: noop,
      onArmsToPlate: noop,
      onToggleArm: (id: string, arm: CornerRulerAxis) => toggled.push({ id, arm }),
      onCoordinateClick: noop,
    }));
  });
  return { overlay: container, toggled };
}

const button = (overlay: HTMLElement, label: string) => overlay.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
const top = (element: HTMLElement | null) => Number.parseFloat(element?.style.top ?? "NaN");

describe("the framing square's arms (Discussion #1649)", () => {
  it("opens a switch for each arm, named after its axis, and hands on which one is clicked", () => {
    const { overlay, toggled } = mount(item({ x: true, z: true, elevation: false }));
    const arms = button(overlay, "Arms of the framing square")!;
    expect(arms).not.toBeNull();
    expect(button(overlay, "Z arm")).toBeNull();
    act(() => arms.click());
    expect(arms.getAttribute("aria-expanded")).toBe("true");
    const z = button(overlay, "Z arm")!;
    expect(z.textContent).toBe("Z");
    expect(z.getAttribute("aria-pressed")).toBe("false");
    expect(z.title).toBe("Show the Z arm");
    expect(z.className).toContain("axis-z");
    expect(button(overlay, "Y arm")!.getAttribute("aria-pressed")).toBe("true");
    expect(button(overlay, "Y arm")!.title).toBe("Hide the Y arm");
    act(() => z.click());
    expect(toggled).toEqual([{ id: "corner-ruler-1", arm: "elevation" }]);
    // A second click closes the switches again.
    act(() => arms.click());
    expect(button(overlay, "Z arm")).toBeNull();
  });

  it("keeps the last arm shown from being switched off", () => {
    const { overlay } = mount(item({ x: false, z: false, elevation: true }));
    act(() => button(overlay, "Arms of the framing square")!.click());
    const z = button(overlay, "Z arm")!;
    expect(z.disabled).toBe(true);
    expect(z.title).toBe("The Z arm stays: one arm is always shown");
    expect(button(overlay, "X arm")!.disabled).toBe(false);
  });

  it("gives a grip only to the ends of arms that are shown, and none to an end lying on the corner", () => {
    const grips = (overlay: HTMLElement) => [...overlay.querySelectorAll<SVGCircleElement>(".corner-ruler-end-handle")].map((circle) => circle.dataset.arm);
    expect(grips(mount(item({ x: true, z: true, elevation: false })).overlay)).toEqual(["x", "z"]);
    act(() => root?.unmount());
    expect(grips(mount(item({ x: true, z: false, elevation: true })).overlay)).toEqual(["x", "elevation"]);
    act(() => root?.unmount());
    expect(grips(mount(item({ x: true, z: true, elevation: true }, false)).overlay)).toEqual(["x", "z"]);
  });

  it("leaves the button for the plate's size the lowest under the handle", () => {
    const { overlay } = mount(item({ x: true, z: true, elevation: false }));
    const plate = button(overlay, "Make the arms as long as the build plate");
    const arms = button(overlay, "Arms of the framing square");
    expect(top(plate)).toBeGreaterThan(top(arms));
    expect(top(arms)).toBeGreaterThan(top(button(overlay, "Show only the selected bodies' measures") ?? overlay.querySelector<HTMLElement>(".corner-ruler-selected-toggle")));
  });
});
