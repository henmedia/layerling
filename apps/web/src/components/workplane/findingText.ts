import { formatClearanceLength } from "@/components/workplane/ClearancePanel";
import { formatPrintCheckArea } from "@/components/workplane/PrintCheckPanel";
import { formatEstimateNumber } from "@/lib/editorBooleans";
import type { Finding } from "@/lib/findings";
import { t } from "@/lib/i18n";
import { lengthDisplayUnit, millimetersToDisplay } from "@/lib/measurementUnits";
import type { WorkplaneWorkspaceSettings } from "@/types/layerling";

type Units = Pick<WorkplaneWorkspaceSettings, "units" | "scale">;

/** The kind of a finding in words: "Overhang", "Thin wall". */
export function findingKindName(finding: Pick<Finding, "kind">) {
  return t(`finding.kind.${finding.kind}`);
}

/** The measured figure in words, as fits the kind: "62°", "span 30 mm", "0.4 mm thick". Empty when there is none. */
export function findingValueText(finding: Finding, workspace: Units, extra: { wall?: number } = {}) {
  const value = finding.value;
  if (value === undefined || !Number.isFinite(value)) return "";
  const length = (mm: number) => formatClearanceLength(mm, workspace);
  switch (finding.kind) {
    case "overhang":
    case "unsupported":
      return t("finding.value.angle", { angle: Math.round(value) });
    case "bridge":
      return t("finding.value.span", { length: length(value) });
    case "thinWall":
      return t("finding.value.thick", { length: length(value), wall: length(extra.wall ?? 0) });
    case "inBed":
      return t("finding.value.deep", { length: length(value) });
    case "floatsAbove":
      return t("finding.value.above", { length: length(value) });
    case "tooLarge":
      return t("finding.value.ofVolume", { percent: Math.round(value) });
    case "adhesion":
      return t("finding.value.firstLayer", { area: formatPrintCheckArea(finding.areaMm2) });
    case "openMesh":
      return t("finding.value.openEdges", { count: Math.round(value) });
    case "undercut":
      return t("finding.value.share", { percent: formatEstimateNumber(value, value < 10 ? 1 : 0) });
    case "draft":
      return t("finding.value.draft", { angle: formatEstimateNumber(value, 0) });
    default:
      return "";
  }
}

/** Where: "Layer 83–97 (16.6–19.4 mm)" or "Layer 5 (1.0 mm)"; empty for a finding with no layers. */
export function findingPlaceText(finding: Finding, workspace: Units) {
  if (finding.layerFrom === undefined || finding.layerTo === undefined) return "";
  const unit = lengthDisplayUnit(workspace).label;
  const height = (mm: number) => formatEstimateNumber(millimetersToDisplay(mm, workspace), unit === "mm" ? 1 : 3);
  if (finding.layerFrom === finding.layerTo) return t("finding.layer", { from: finding.layerFrom, low: `${height(finding.zFrom ?? 0)} ${unit}` });
  return t("finding.layers", { from: finding.layerFrom, to: finding.layerTo, low: height(finding.zFrom ?? 0), high: `${height(finding.zTo ?? 0)} ${unit}` });
}

/** One line of the list: "Layer 83–97 (16.6–19.4 mm): Overhang 62°, 140 mm²". */
export function findingLine(finding: Finding, workspace: Units, extra: { wall?: number } = {}) {
  const place = findingPlaceText(finding, workspace);
  const value = findingValueText(finding, workspace, extra);
  const what = [findingKindName(finding), value].filter(Boolean).join(" ");
  const area = finding.areaMm2 > 0 && finding.kind !== "adhesion" ? `, ${formatPrintCheckArea(finding.areaMm2)}` : "";
  return place ? `${place}: ${what}${area}` : `${what}${area}`;
}

/** What helps, in words. */
export function findingRemedy(finding: Finding, workspace: Units, extra: { wall?: number } = {}) {
  return t(`finding.remedy.${finding.kind}`, { wall: formatClearanceLength(extra.wall ?? 0, workspace) });
}
