import { describe, expect, it } from "vitest";
import { SKETCH_EDIT_KEYS, SKETCH_TOOL_KEYS } from "@/components/SketchWorkspace";

describe("sketch tool keys (#347)", () => {
  it("picks the drawing tools in the order of the bar", () => {
    expect(SKETCH_TOOL_KEYS).toEqual({ "1": "line", "2": "bezier", "3": "smooth", "4": "refine", "5": "freehand" });
  });

  it("keeps 5 a tool key: Freehand (#1280) changes no selection", () => {
    expect(SKETCH_EDIT_KEYS["5"]).toBeUndefined();
  });

  it("changes a selection with the first three keys, the fourth stays a tool key", () => {
    expect(SKETCH_EDIT_KEYS).toEqual({ "1": "straight", "2": "curve", "3": "smooth" });
    expect(SKETCH_EDIT_KEYS["4"]).toBeUndefined();
  });
});
