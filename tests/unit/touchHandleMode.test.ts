// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  TOUCH_HANDLE_MODES,
  loadTouchHandleMode,
  nextTouchHandleMode,
  saveTouchHandleMode,
  touchModeMovesBody,
  touchModeShowsHandle,
} from "@/lib/touchHandleMode";
import type { TransformHandleKind } from "@/components/workplane/transformOverlayTypes";

const KINDS: TransformHandleKind[] = ["scale", "height", "lift", "rotate", "slide"];
const shown = (mode: (typeof TOUCH_HANDLE_MODES)[number]) => KINDS.filter((kind) => touchModeShowsHandle(mode, kind));

describe("which handles a finger reaches (Discussion #1747)", () => {
  afterEach(() => {
    try {
      window.localStorage.clear();
    } catch {
      // no storage in this environment
    }
  });

  it("shows every handle in all, and only the ones for the job otherwise", () => {
    expect(shown("all")).toEqual(KINDS);
    expect(shown("move")).toEqual(["lift", "slide"]);
    expect(shown("size")).toEqual(["scale", "height"]);
    expect(shown("turn")).toEqual(["rotate"]);
  });

  it("lets a finger on the part move it only in all and move", () => {
    expect(TOUCH_HANDLE_MODES.filter(touchModeMovesBody)).toEqual(["all", "move"]);
  });

  it("goes through the modes in a ring", () => {
    expect(["all", "move", "size", "turn"].map((mode) => nextTouchHandleMode(mode as never))).toEqual(["move", "size", "turn", "all"]);
  });

  it("keeps the choice in the browser and starts at all", () => {
    expect(loadTouchHandleMode()).toBe("all");
    saveTouchHandleMode("size");
    expect(loadTouchHandleMode()).toBe("size");
    window.localStorage.setItem("layerling.touchHandleMode", "nonsense");
    expect(loadTouchHandleMode()).toBe("all");
    saveTouchHandleMode("all");
    expect(window.localStorage.getItem("layerling.touchHandleMode")).toBeNull();
  });
});
