"use client";

import { FolderOpen, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { GuideHelpLink } from "@/components/GuideHelpLink";
import { MovableToolPanel } from "@/components/workplane/MovableToolPanel";
import { DEFAULT_ICON_TAG_FINISHED_WIDTH, iconWidthForFinishedWidth, MAX_ICON_TAG_FINISHED_WIDTH, MIN_ICON_TAG_FINISHED_WIDTH } from "@/lib/iconTag";
import { t } from "@/lib/i18n";
import { localizedError } from "@/lib/userErrors";
import { parseMeasurementInput } from "@/lib/measurementUnits";
import { iconSourceFromFile, PICTURE_FILE_ACCEPT, tracedIconSource, type IconSource } from "@/lib/pictureIcon";
import type { RasterPart } from "@/lib/rasterTrace";
import { useLanguage } from "@/lib/useLanguage";

const PARTS: readonly RasterPart[] = ["dark", "light"];

const errorText = (reason: unknown) => (reason instanceof Error ? localizedError(reason.message) : String(reason));

/**
 * The icon tag window: the shape library's Icon tag opens it. Browse for an SVG, PNG or JPG file,
 * see it, set how wide the finished tag is (Discussion #2059: at its widest point, without the key
 * ring tab; the icon is worked out from it), and OK makes the tag in the name tag's layers on the plate. A
 * picture is traced into an outline first (#359); the preview then shows the outline, and a switch
 * chooses whether its dark or its light part becomes the icon.
 */
export function IconTagPanel({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (source: IconSource, width: number) => Promise<void>;
}) {
  useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [source, setSource] = useState<IconSource | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [width, setWidth] = useState(String(DEFAULT_ICON_TAG_FINISHED_WIDTH));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // The picture is the SVG itself, or the traced outline, shown by the browser; its address goes when it does.
  useEffect(() => {
    if (!source) return;
    const url = URL.createObjectURL(new Blob([source.svg], { type: "image/svg+xml" }));
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [source]);
  const parsed = parseMeasurementInput(width);
  const widthOk = Number.isFinite(parsed) && parsed >= MIN_ICON_TAG_FINISHED_WIDTH && parsed <= MAX_ICON_TAG_FINISHED_WIDTH;
  const choose = async (file: File) => {
    setFileName(file.name);
    setSource(null);
    setPreview(null);
    setError("");
    setBusy(true);
    try {
      setSource(await iconSourceFromFile(file));
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setBusy(false);
    }
  };
  const tracePart = (part: RasterPart) => {
    if (!source?.picture || source.part === part) return;
    const picture = source.picture;
    setError("");
    try {
      setSource(tracedIconSource(source.name, picture, part));
    } catch (reason) {
      // Nothing of that part: the switch shows it chosen, the preview is empty and OK waits.
      setSource({ name: source.name, svg: "", picture, part });
      setError(errorText(reason));
    }
  };
  const ready = Boolean(source?.svg) && widthOk && !busy;
  const create = async () => {
    if (!source || !ready) return;
    setBusy(true);
    setError("");
    try {
      await onCreate(source, iconWidthForFinishedWidth(parsed));
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setBusy(false);
    }
  };
  return (
    <MovableToolPanel className="top-action-panel import-action-panel icon-tag-panel" ariaLabel={t("iconTag.title")}>
      {(handleProps) => (<>
      <header className="movable" title={t("panel.moveHint")} {...handleProps}>
        <div className="top-action-heading">
          <strong>{t("iconTag.title")}</strong>
        </div>
        <div className="panel-header-actions">
          <GuideHelpLink chapter="text" section="iconTag" />
          <button type="button" aria-label={t("panel.close", { title: t("iconTag.title") })} onClick={onClose}>
            <X size={18} />
          </button>
        </div>
      </header>
      <div className="top-action-body">
        <p>{t("iconTag.hint")}</p>
        <input
          ref={inputRef}
          type="file"
          accept={`.svg,image/svg+xml,${PICTURE_FILE_ACCEPT}`}
          hidden
          data-testid="icon-tag-file"
          onChange={(event) => {
            const chosen = event.currentTarget.files?.[0] ?? null;
            event.currentTarget.value = "";
            if (chosen) void choose(chosen);
          }}
        />
        <button className="open-lyl-project-button" type="button" onClick={() => inputRef.current?.click()} disabled={busy}>
          <span className="open-lyl-project-icon"><FolderOpen size={18} /></span>
          <span>
            <strong>{t("iconTag.browse")}</strong>
            <small>{fileName || t("iconTag.noFile")}</small>
          </span>
        </button>
        <div className="icon-tag-preview" aria-label={t("iconTag.preview")}>
          {preview && source?.svg ? <img src={preview} alt={fileName} /> : <span className="icon-tag-preview-empty" aria-hidden="true">SVG</span>}
        </div>
        {source?.picture ? (
          <div className="edge-modifier-field shell-openings icon-tag-part" role="radiogroup" aria-label={t("iconTag.part")}>
            <span title={t("iconTag.partHint")}>{t("iconTag.part")}</span>
            <div className="shell-opening-options">
              {PARTS.map((part) => (
                <button
                  key={part}
                  type="button"
                  role="radio"
                  aria-checked={source.part === part}
                  className={source.part === part ? "active" : ""}
                  disabled={busy}
                  onClick={() => tracePart(part)}
                >
                  {t(`iconTag.part.${part}`)}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <label className="icon-tag-width">
          <span>{t("iconTag.width")}</span>
          <input
            type="text"
            inputMode="decimal"
            value={width}
            disabled={busy}
            aria-invalid={!widthOk}
            onChange={(event) => setWidth(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void create();
            }}
          />
          <small>{t("iconTag.finishedWidthHint", { min: MIN_ICON_TAG_FINISHED_WIDTH, max: MAX_ICON_TAG_FINISHED_WIDTH })}</small>
        </label>
        {error ? <p className="icon-tag-error" role="alert">{error}</p> : null}
        <button className="icon-tag-ok" type="button" disabled={!ready} onClick={() => void create()}>
          {busy && source ? t("iconTag.building") : t("iconTag.ok")}
        </button>
      </div>
      </>)}
    </MovableToolPanel>
  );
}
