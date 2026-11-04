"use client";

import type { CSSProperties } from "react";
import type { OriginDimensionOverlayData } from "@/lib/originDimensionLines";
import { sceneDimensionAxis } from "@/lib/dimensionAxisColors";
import { t } from "@/lib/i18n";

/** Rein ablesbare Anzeige - das Eintippen ist bewusst ein spaeterer Schritt, siehe layerling-lineal.md. */
export function OriginDimensionOverlay({ overlay }: { overlay: OriginDimensionOverlayData }) {
  const styleForLine = (line: OriginDimensionOverlayData["lines"][number]) => ({
    "--overlay-x": `${line.labelX}px`,
    "--overlay-y": `${line.labelY}px`,
  }) as CSSProperties;

  return (
    <div className="origin-dimension-overlay" aria-label={t("aria.originDimensions")}>
      {overlay.lines.map((line) => (
        <span
          key={line.axis}
          className="dimension-label origin-dimension-value"
          data-axis={sceneDimensionAxis(line.axis)}
          style={styleForLine(line)}
        >
          {line.label}
        </span>
      ))}
    </div>
  );
}
