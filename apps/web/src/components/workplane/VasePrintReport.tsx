"use client";

import { useMemo } from "react";
import { numberLocale, t } from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";
import { vaseNote } from "@/lib/vaseNotes";
import { vasePrintReport } from "@/lib/vaseShape";
import type { WorkplaneShape } from "@/types/layerling";

/**
 * How the vase prints, at a glance: fine, fine with supports where a profile or a relief overhangs, or with notes to
 * read. Never a promise: the slicer, the material and the printer decide in the end.
 */
export type VasePrintVerdict = "fine" | "supports" | "notes";

/** The core writes its notes in German; an overhang note starts with one of these. */
function overhangNote(note: string) {
  return /^(Überhang bis|Relief: Unterkanten|Teekannendeckel, umgedreht gedruckt: Überhang)/.test(note);
}

export function vasePrintVerdict(notes: readonly string[]): VasePrintVerdict {
  if (notes.some(overhangNote)) return "supports";
  return notes.length ? "notes" : "fine";
}

function useReport(shape: WorkplaneShape) {
  // (With the vase's id: while one of its values is held, the report is worked out on the coarse body as well.)
  return useMemo(() => vasePrintReport({ id: shape.id, width: shape.width ?? shape.size, depth: shape.depth ?? shape.size, height: shape.height, vase: shape.vase }), [shape.id, shape.width, shape.depth, shape.size, shape.height, shape.vase]);
}

/** What printing the vase takes - weight and filament - its verdict and the core's notes on printing it, in the current language. */
export function VasePrintReport({ shape }: { shape: WorkplaneShape }) {
  const language = useLanguage();
  const report = useReport(shape);
  const verdict = vasePrintVerdict(report.notes);
  const number = (value: number, digits: number) => value.toLocaleString(numberLocale(language), { maximumFractionDigits: digits });
  return (
    <div className="vase-print-report">
      <p className={`vase-print-verdict ${verdict}`}>
        <span className="vase-print-dot" aria-hidden="true" />
        <span>{t(verdict === "fine" ? "vase.verdictFine" : verdict === "supports" ? "vase.verdictSupports" : "vase.verdictNotes")}</span>
      </p>
      <p className="vase-print-weight">{t("vase.printWeight", { grams: number(report.grams, 0), material: report.material, meters: number(report.meters, 1) })}</p>
      <p className="cylinder-wrap-hint">{report.vaseMode ? t("vase.printVaseMode", { line: number(report.line, 2), bottom: number(report.bottom, 1) }) : t("vase.printHollow")}</p>
      {report.notes.length ? (
        <ul className="vase-print-notes">
          {report.notes.map((note) => (
            <li key={note}>{vaseNote(note)}</li>
          ))}
        </ul>
      ) : (
        <p className="cylinder-wrap-hint">{t("vase.printFine")}</p>
      )}
      <p className="cylinder-wrap-hint vase-print-disclaimer">{t("vase.verdictDisclaimer")}</p>
    </div>
  );
}
