import { describe, expect, it } from "vitest";
import { objectListAnchor, objectListClickSelection } from "@/lib/objectListSelection";

// The list as it is shown: sorted or filtered, the run follows this order (Discussion #1683).
const listed = ["a", "b", "c", "d", "e"];
const plain = { toggle: false, range: false };
const ctrl = { toggle: true, range: false };
const shift = { toggle: false, range: true };
const ctrlShift = { toggle: true, range: true };

describe("objectListClickSelection", () => {
  it("selects the one entry on a plain click", () => {
    expect(objectListClickSelection(listed, ["a", "c"], "a", "d", plain)).toEqual({ ids: "d", mode: "replace" });
  });

  it("adds or takes away one entry with Ctrl", () => {
    expect(objectListClickSelection(listed, ["a"], "a", "c", ctrl)).toEqual({ ids: "c", mode: "toggle" });
    expect(objectListClickSelection(listed, ["a", "c"], "c", "c", ctrl)).toEqual({ ids: "c", mode: "toggle" });
  });

  it("selects the run from the start to the clicked entry with Shift, both ways", () => {
    expect(objectListClickSelection(listed, ["b"], "b", "d", shift)).toEqual({ ids: ["b", "c", "d"], mode: "replace" });
    expect(objectListClickSelection(listed, ["d"], "d", "a", shift)).toEqual({ ids: ["a", "b", "c", "d"], mode: "replace" });
  });

  it("replaces what was selected outside the run with Shift alone", () => {
    expect(objectListClickSelection(listed, ["e", "b"], "b", "c", shift)).toEqual({ ids: ["b", "c"], mode: "replace" });
  });

  it("adds the run and takes nothing away with Ctrl+Shift", () => {
    expect(objectListClickSelection(listed, ["e", "b", "c"], "b", "d", ctrlShift)).toEqual({ ids: ["d"], mode: "toggle" });
    expect(objectListClickSelection(listed, ["b", "c"], "b", "c", ctrlShift)).toEqual({ ids: [], mode: "toggle" });
  });

  it("adds the one entry on a Shift-click with nothing to start from", () => {
    expect(objectListClickSelection(listed, [], null, "c", shift)).toEqual({ ids: "c", mode: "toggle" });
  });
});

describe("objectListAnchor", () => {
  it("starts at the entry clicked last while it is selected", () => {
    expect(objectListAnchor(listed, ["d", "b"], "b")).toBe("b");
  });

  it("falls back to the shape selected last that the list shows", () => {
    // "b" was clicked, then taken away; "x" is a part picked in the view that the list does not show.
    expect(objectListAnchor(listed, ["c", "x"], "b")).toBe("c");
    expect(objectListAnchor(listed, ["x"], null)).toBeNull();
  });

  it("does not start at an entry the search hides", () => {
    expect(objectListAnchor(["a", "c"], ["b", "c"], "b")).toBe("c");
  });
});
