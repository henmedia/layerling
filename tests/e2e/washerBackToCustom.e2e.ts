// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { ShapeInspector } from "@/components/workplane/ShapeInspector";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { washerTubeFields } from "@/lib/washerSizes";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";
import type { WorkplaneShape } from "@/types/layerling";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * A straight tube turned into a washer (#1739): "Custom" in the size menu and the arrow back to the default did nothing,
 * because only the sizes of the list were handled. Both now give the tube the measures of a new one.
 */
beforeAll(() => {
  Element.prototype.scrollTo ??= () => {};
});

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  container = null;
  root = null;
});

const tubeAsset = () => toolbarShapeAssets.find((entry) => entry.kind === "tube")!;

function mount(fields: Partial<WorkplaneShape>, onUpdate: (patch: Partial<WorkplaneShape>) => void) {
  const shape = { ...makeShapeFromAsset(tubeAsset(), { x: 0, z: 0, elevation: 0 }), ...fields } as WorkplaneShape;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(createElement(ShapeInspector, { shape, snap: DEFAULT_SNAP_GRID, snapOpen: false, workspace: DEFAULT_WORKPLANE_WORKSPACE, onUpdate, onSnapChange: () => {}, onSnapOpenChange: () => {} }));
  });
  return container;
}

describe("a washer made from a tube goes back to the tube (#1739)", () => {
  it("the arrow beside the size gives the measures of a new tube", () => {
    const fresh = makeShapeFromAsset(tubeAsset(), { x: 0, z: 0, elevation: 0 });
    const washer = washerTubeFields("M5");
    const patches: Partial<WorkplaneShape>[] = [];
    const panel = mount({ width: washer.width, depth: washer.depth, size: washer.width, height: washer.height, bevel: washer.bevel }, (patch) => patches.push(patch));
    const label = [...panel.querySelectorAll<HTMLElement>(".select-property > span")].find((span) => span.textContent?.startsWith("Washer"))!;
    const arrow = label.querySelector<HTMLButtonElement>("button.property-reset");
    expect(arrow).not.toBeNull();
    act(() => arrow!.click());
    expect(patches.at(-1)).toMatchObject({ width: fresh.width, depth: fresh.depth, height: fresh.height, bevel: fresh.bevel });
  });
});
