// @vitest-environment jsdom
import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SketchWorkspace } from "@/components/SketchWorkspace";

describe("constraint badge hit areas", () => {
  it("places badges above the selected outline's drag surface and resize handles", () => {
    const noop = () => {};
    const props: ComponentProps<typeof SketchWorkspace> = {
      profile: {
        points: [{ id: "a", x: 0, z: 0 }, { id: "b", x: 30, z: 0 },
          { id: "c", x: 30, z: 20 }, { id: "d", x: 0, z: 20 }],
        segments: [
          { id: "ab", startId: "a", endId: "b" }, { id: "bc", startId: "b", endId: "c" },
          { id: "cd", startId: "c", endId: "d" }, { id: "da", startId: "d", endId: "a" },
        ],
        constraints: [{ id: "horizontal", kind: "horizontal", a: "a", b: "b" }],
      },
      referenceShapes: [], tool: "select", activePointId: null,
      selected: { kind: "multiple", pointIds: ["a", "b", "c", "d"], segmentIds: ["ab", "bc", "cd", "da"] },
      measurement: null, pendingMeasurementStart: null,
      onPlanePoint: noop, onAddPrimitive: noop, onPointPress: noop,
      onSelectSegment: noop, onSelectMany: noop, onToggleSelect: noop,
      onSelectImage: noop, onUpdateImage: noop, onDeleteImage: noop,
      onDeletePoint: noop, onDeleteSegment: noop, onMovePoint: noop,
      onTransformPoints: noop, onMoveHandle: noop, onInsertPoint: noop,
      onSetPointMode: noop, onClearMeasurement: noop, onMeasureTool: noop,
      onAddConstraint: noop,
    };
    const container = document.createElement("div");
    container.innerHTML = renderToStaticMarkup(createElement(SketchWorkspace, props));
    const selection = container.querySelector(".sketch-geometry-selection");
    const badge = container.querySelector('[aria-label="Inspect Horizontal"]');
    expect(selection).not.toBeNull();
    expect(badge).not.toBeNull();
    expect(selection!.compareDocumentPosition(badge!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(badge!.getAttribute("pointer-events")).toBe("all");
    expect(container.querySelector('[data-sketch-entity="selection-box"]')).not.toBeNull();
    expect(container.querySelector(".sketch-geometry-resize-handle")).not.toBeNull();
  });
});
