import { describe, expect, it } from "vitest";
import { ALIGN_HANDLE_MAX_SCREEN_OFFSET, alignHandleScreenShrink } from "@/components/workplane/viewportTransformOverlays";

describe("alignment handles near a tiny part (Discussion #989)", () => {
  it("leaves a line that already stands close to the selection where it is", () => {
    expect(alignHandleScreenShrink({ x: 130, y: 100 }, { x: 100, y: 100 })).toBe(1);
    expect(alignHandleScreenShrink({ x: 100, y: 100 + ALIGN_HANDLE_MAX_SCREEN_OFFSET }, { x: 100, y: 100 })).toBe(1);
  });

  it("pulls a line that the 3 mm offset put far off the part back to the largest screen distance", () => {
    // Zoomed in on a 0.5 mm part, 3 mm beside it are 1200 px on the screen.
    const base = { x: 400, y: 300 };
    const handle = { x: 400 + 960, y: 300 + 720 };
    const shrink = alignHandleScreenShrink(handle, base);
    const pulled = { x: base.x + (handle.x - base.x) * shrink, y: base.y + (handle.y - base.y) * shrink };
    expect(Math.hypot(pulled.x - base.x, pulled.y - base.y)).toBeCloseTo(ALIGN_HANDLE_MAX_SCREEN_OFFSET, 6);
    // Along the same direction, so the line keeps its side of the part.
    expect((pulled.y - base.y) / (pulled.x - base.x)).toBeCloseTo(720 / 960, 6);
  });
});
