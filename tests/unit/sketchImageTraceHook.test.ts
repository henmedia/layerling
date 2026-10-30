// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSketchImageTrace, type SketchImageTraceState } from "@/lib/useSketchImageTrace";
import type { SketchImage } from "@/types/layerling";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// A black ring on white: an outline and its hole. The rest of the module stays as it is.
vi.mock("@/lib/pictureIcon", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/pictureIcon")>()),
  picturePixels: async () => {
    const width = 100;
    const height = 100;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const r = Math.hypot(x + 0.5 - 50, y + 0.5 - 50);
        data.set(r <= 40 && r >= 20 ? [0, 0, 0, 255] : [255, 255, 255, 255], (y * width + x) * 4);
      }
    }
    return { width, height, data };
  },
}));

const image = { id: "picture", name: "Ring", dataUrl: "data:image/png;base64,ring", pixelWidth: 100, pixelHeight: 100, x: 0, z: 0, width: 50, depth: 50 } as unknown as SketchImage;

describe("Trace for the sketch's picture", () => {
  let container: HTMLDivElement;
  let root: Root;
  let state: SketchImageTraceState;
  const Probe = () => {
    state = useSketchImageTrace(image, true);
    return null;
  };

  beforeEach(async () => {
    vi.useFakeTimers();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root.render(createElement(Probe)));
    // The picture is read, then traced once its settings have rested.
    await act(async () => {});
    act(() => vi.advanceTimersByTime(100));
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
  });

  it("finds the range of points after the pause, not while a setting is still moving", () => {
    expect(state.trace?.rings).toHaveLength(2);
    const range = state.range;
    expect(range?.most).toBeGreaterThan(0);
    act(() => state.change({ threshold: 0.4 }));
    // Still the range found before: nothing was fitted while the setting changed.
    expect(state.range).toBe(range);
    act(() => vi.advanceTimersByTime(100));
    expect(state.range).not.toBe(range);
  });

  it("applies the trace for the settings as they are now, even before the pause is over", () => {
    act(() => state.change({ holes: false }));
    // Shown is still the trace with the hole; Apply takes the one without it.
    expect(state.trace?.rings).toHaveLength(2);
    let applied: ReturnType<SketchImageTraceState["traceNow"]> = null;
    act(() => {
      applied = state.traceNow();
    });
    expect(applied!.rings).toHaveLength(1);
    expect(state.trace?.rings).toHaveLength(1);
    // Up to date, it is the trace shown.
    expect(state.traceNow()).toBe(state.trace);
  });
});
