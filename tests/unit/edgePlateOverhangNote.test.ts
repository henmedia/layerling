import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { EdgeModifierPanel } from "@/components/workplane/EdgeModifierPanel";
import type { CadModifierKind } from "@/lib/cadModifierTypes";
import { setLanguage } from "@/lib/i18n";
import type { PlateEdgeOverhang } from "@/lib/overhangFigures";
import { DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";

/** What the chamfer and fillet panel says about the edge on the plate, or null when it says nothing. */
function note(kind: CadModifierKind, plateOverhang: PlateEdgeOverhang | null, concave = false) {
  const noop = () => {};
  const markup = renderToStaticMarkup(createElement(EdgeModifierPanel, {
    kind,
    amount: 1,
    maxAmount: 10,
    chamferAngle: 45,
    quality: "standard",
    sharpAngle: 25,
    workspace: DEFAULT_WORKPLANE_WORKSPACE,
    tangentChain: true,
    onlyVisibleEdges: false,
    plateOverhang,
    preserveEdgeSize: false,
    targetName: "Box",
    groupedCount: 0,
    appliedFeatureCount: 0,
    reversibleFeatureCount: 0,
    historyOptions: [],
    selectedCount: 12,
    availableCount: 12,
    busy: false,
    prepared: true,
    error: null,
    concave,
    onAmountChange: noop,
    onChamferAngleChange: noop,
    onQualityChange: noop,
    onSharpAngleChange: noop,
    onTangentChainChange: noop,
    onOnlyVisibleEdgesChange: noop,
    onPreserveEdgeSizeChange: noop,
    onSelectAll: noop,
    onClear: noop,
    onRemoveFeature: noop,
    onApply: noop,
    onCancel: noop,
  }));
  return markup.match(/<p class="edge-modifier-note" role="note" data-testid="edge-plate-overhang">([^<]*)<\/p>/)?.[1] ?? null;
}

beforeEach(async () => {
  await setLanguage("en", false);
});

describe("the chamfer and fillet panel says when the edge on the plate needs supports", () => {
  it("names the overhang of a fillet, rounded down, and what prints instead", () => {
    expect(note("fillet", { angle: 45, degrees: 74.9 })).toBe(
      "On the bed this fillet overhangs by up to 74°, more than the 45° that print without supports. A chamfer or a chamfillet prints cleanly there.",
    );
  });

  it("says it of a chamfer that lies too flat and of a scooped edge, without sending them to the chamfer", () => {
    const flat = "On the bed this edge overhangs by up to 63°, more than the 50° that print without supports.";
    expect(note("chamfer", { angle: 50, degrees: 63.4 })).toBe(flat);
    expect(note("fillet", { angle: 50, degrees: 63.4 }, true)).toBe(flat);
  });

  it("says nothing while the edge prints as it is", () => {
    expect(note("fillet", null)).toBeNull();
    expect(note("chamfer", null)).toBeNull();
  });
});
