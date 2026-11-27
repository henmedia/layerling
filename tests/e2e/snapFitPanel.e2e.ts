// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { ShapeInspector } from "@/components/workplane/ShapeInspector";
import { t } from "@/lib/i18n";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";
import type { WorkplaneShape } from "@/types/layerling";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * The snap-fit's panel says where its box limited a measure (#2161): the field shows what fits, and a line under it
 * says so, the way the hinge's screw holes and the boss's gussets do.
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

function mount(fields: Partial<WorkplaneShape> = {}) {
  const asset = toolbarShapeAssets.find((entry) => entry.kind === "snapFit")!;
  const shape = { ...makeShapeFromAsset(asset, { x: 0, z: 0 }), ...fields } as WorkplaneShape;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(createElement(ShapeInspector, {
      shape,
      snap: DEFAULT_SNAP_GRID,
      snapOpen: false,
      workspace: DEFAULT_WORKPLANE_WORKSPACE,
      onUpdate: () => {},
      onSnapChange: () => {},
      onSnapOpenChange: () => {},
    }));
  });
  return container;
}

describe("the snap-fit's panel (#2161)", () => {
  it("says nothing of limits for a new snap-fit", () => {
    const text = mount().textContent ?? "";
    for (const value of ["0.2", "1", "1.6"]) expect(text).not.toContain(t("snapFit.limited", { value }));
    expect(text).not.toContain(t("snapFit.leadLimited", { angle: 30 }));
    expect(text).toContain(t("snapFit.leadHint"));
  });

  it("says how thick an arm the box has room for", () => {
    const text = mount({ snapFitThickness: 20 }).textContent ?? "";
    expect(text).toContain(t("snapFit.limited", { value: "7.8" }));
  });

  it("says how much undercut fits, and how steep the slope has to be for it", () => {
    const text = mount({ snapFitUndercut: 10 }).textContent ?? "";
    expect(text).toContain(t("snapFit.limited", { value: "7.2" }));
    expect(text).toContain(t("snapFit.leadLimited", { angle: 45 }));
    expect(text).toContain(t("snapFit.leadHint"));
  });

  it("says how steep the slope has to be where a gentle one leaves the barb no room", () => {
    const text = mount({ snapFitUndercut: 3, snapFitLeadAngle: 10 }).textContent ?? "";
    expect(text).toContain(t("snapFit.leadLimited", { angle: 15 }));
  });
});
