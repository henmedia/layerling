"use client";

import { useRef, useState } from "react";
import { ImageUp } from "lucide-react";
import { t } from "@/lib/i18n";
import { PATTIES_MOTIF_FILE_ACCEPT, pattiesMotifFromFile } from "@/lib/pattiesMotif";

/**
 * Patties, the motif pattern: the button that takes a figure of one's own from a file - a drawing (SVG) or a
 * picture (PNG, JPG), whose outline becomes the figure. A file without an outline says so under the button and
 * leaves the plate as it is.
 */
export function PattiesMotifLoader({ disabled, onLoaded }: { disabled?: boolean; onLoaded: (loops: number[][]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [failed, setFailed] = useState(false);
  return (
    <>
      <p className="cylinder-wrap-hint">{t("patties.motifHint")}</p>
      <input
        ref={input}
        type="file"
        accept={PATTIES_MOTIF_FILE_ACCEPT}
        hidden
        data-testid="patties-motif-file"
        onChange={(event) => {
          const field = event.currentTarget;
          const file = field.files?.[0];
          // The same file chosen again counts as a new choice.
          field.value = "";
          if (!file) return;
          void pattiesMotifFromFile(file).then((loops) => {
            setFailed(!loops);
            if (loops) onLoaded(loops);
          });
        }}
      />
      <button className="inspector-action-button" type="button" disabled={disabled} data-testid="patties-motif-load" onClick={() => input.current?.click()}>
        <ImageUp size={17} strokeWidth={2.5} />
        <span>{t("inspector.pattiesMotifLoad")}</span>
      </button>
      {failed ? <p className="cylinder-wrap-hint" role="alert">{t("patties.motifError")}</p> : null}
    </>
  );
}
