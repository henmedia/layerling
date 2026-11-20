import { t } from "@/lib/i18n";
import type { MessageKey } from "@/lib/messages.en";
import type { SketchConstraint } from "@/types/layerling";

const LABELS: Record<SketchConstraint["kind"], MessageKey> = {
  "concentric": "sketchUi.kind.concentric",
  "circle-diameter": "sketchUi.kind.circle-diameter",
  "circle-center-distance": "sketchUi.kind.circle-center-distance",
  "outline-line-distance": "sketchUi.kind.outline-line-distance",
  "point-line-distance": "sketchUi.kind.point-line-distance",
  "line-distance": "sketchUi.kind.line-distance",
  "angle": "sketchUi.kind.angle",
  "parallel": "sketchUi.kind.parallel",
  "perpendicular": "sketchUi.kind.perpendicular",
  "equal-length": "sketchUi.kind.equal-length",
  "horizontal": "sketchUi.kind.horizontal",
  "vertical": "sketchUi.kind.vertical",
  "coincident": "sketchUi.kind.coincident",
  "distance": "sketchUi.kind.distance",
  "offset-x": "sketchUi.kind.offset-x",
  "offset-z": "sketchUi.kind.offset-z",
  "midpoint": "sketchUi.kind.midpoint",
  "point-on-line": "sketchUi.kind.point-on-line",
  "symmetry": "sketchUi.kind.symmetry",
};

export function sketchConstraintLabel(kind: SketchConstraint["kind"]): string {
  return t(LABELS[kind]);
}
