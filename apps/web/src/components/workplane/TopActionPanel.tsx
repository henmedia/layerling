"use client";

import { DEFAULT_STENCIL_BRIDGES, MAX_BRIDGE_COUNT, normalizedStencilBridges, type StencilBridgeOptions } from "@/lib/stencilBridges";
import { GuideHelpLink } from "@/components/GuideHelpLink";
import { MovableToolPanel } from "@/components/workplane/MovableToolPanel";
import { CloudUpload, Download, EyeOff, FilePlus2, FolderOpen, ImagePlus, Info, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { t, type MessageKey } from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";
import { ToolbarImportIcon } from "../icons";
import { AttachmentsPanel } from "./AttachmentsPanel";
import { DEFAULT_INFILL_PERCENT, DEFAULT_PRINT_MATERIAL, DEFAULT_WALLS, INFILL_CHOICES, PRINT_MATERIALS, WALL_CHOICES, normalizeInfillPercent, normalizePrintMaterial, normalizeWalls, printEstimateWithInfill, type PrintMaterial } from "@/lib/printEstimate";
import { type EditorHistoryExportLimit } from "@/lib/editorHistory";
import { projectExportFileName, stlNameAsksForNewFile } from "@/lib/exportNames";
import { readImportSvgWidth, readKeepSvgPage, setImportSvgWidth, storeKeepSvgPage } from "@/lib/importPreferences";
import { lylFileAccessSupported } from "@/lib/lylFileAccess";
import { hasOwnShapeName } from "@/lib/shapeCatalog";
import type { ProjectAttachment, WorkplaneShape } from "@/types/layerling";
import { type ExportSolidVolume, PRINT_MATERIAL_STORAGE_KEY, PRINT_INFILL_STORAGE_KEY, PRINT_WALLS_STORAGE_KEY, formatEstimateNumber } from "@/lib/editorBooleans";


export type TopPanel = "import" | "export" | "attachments" | null;
export type ExportFormat = "stl" | "3mf" | "obj" | "step" | "svg" | "dxf" | "png" | "lyl" | "drawing";
export type DirectExportFormat = Exclude<ExportFormat, "step" | "png" | "lyl" | "drawing">;
export type SvgExportView = "silhouette" | "footprint" | "edges";
/** What a DXF for laser cutting shows (#774): the outline from above, or what stands on the workplane; never inner edges, which a laser would cut. */
export type DxfExportView = "silhouette" | "footprint";
export type ViewImageOptions = { plate: boolean; transparent: boolean };
export type LylHistoryLimit = EditorHistoryExportLimit;
/** "file" writes into the file the design is tied to (asking for one the first time), "fileAs" always asks (#251). */
export type LylExportTarget = "download" | "shared" | "file" | "fileAs";

export function TopActionPanel({
  panel,
  projectName,
  shapeCount,
  scopeLabel,
  selectionLeavesOut,
  onSelectAll,
  onlyHoles,
  hiddenCount = 0,
  estimateShapes,
  onEstimatePrint,
  onClose,
  onExport,
  stlFileName = null,
  onExportLyl,
  onExportStep,
  onExportDrawing,
  drawingExporting,
  onExportImage,
  sharedProjectsEnabled,
  lylExporting,
  stepExporting,
  onImportFiles,
  onPickFile,
  onPickProjectFile,
  onPickInsertProjectFile,
  onPickReferenceImage,
  workspaceHistoryLimit,
  attachments,
  attachmentsLocked,
  onAttachmentsChange,
  onAttachmentDownload,
  onAttachmentView,
  onAttachmentNotice,
}: {
  panel: Exclude<TopPanel, null>;
  projectName: string;
  shapeCount: number;
  scopeLabel: "selected" | "total";
  /** Set when a selection is exported that leaves out visible bodies: how many are selected, how many are visible. */
  selectionLeavesOut?: { selected: number; total: number } | null;
  onSelectAll?: () => void;
  onlyHoles?: boolean;
  /** Ausgeblendete Teile, die der Export auslaesst - gesagt, bevor er laeuft. */
  hiddenCount?: number;
  /** Was exportiert wuerde - daraus Volumen, Gewicht und Filament. */
  estimateShapes: readonly WorkplaneShape[];
  onEstimatePrint: (shapes: readonly WorkplaneShape[]) => Promise<ExportSolidVolume>;
  onClose: () => void;
  onExport: (format: DirectExportFormat, exportName: string, chooseFile?: boolean, svgView?: SvgExportView, toServer?: boolean, bridges?: StencilBridgeOptions | null) => void;
  /** The STL file this design exports into, once one was chosen (Chrome and Edge). */
  stlFileName?: string | null;
  onExportLyl: (exportName: string, historyLimit: LylHistoryLimit, target?: LylExportTarget) => void;
  onExportStep: (exportName: string, toServer?: boolean) => void;
  onExportDrawing: (exportName: string, format: "svg" | "pdf", toServer?: boolean) => void;
  drawingExporting: boolean;
  onExportImage: (exportName: string, options: ViewImageOptions, toServer?: boolean) => void;
  sharedProjectsEnabled: boolean;
  lylExporting: boolean;
  stepExporting: boolean;
  onImportFiles: (files: FileList | File[]) => void;
  onPickFile: () => void;
  onPickProjectFile: () => void;
  onPickInsertProjectFile: () => void;
  /** A reference image to line parts up on (#680). */
  onPickReferenceImage: () => void;
  workspaceHistoryLimit: LylHistoryLimit;
  /** The files kept with the design (#820), and what the panel may do with them. */
  attachments: readonly ProjectAttachment[];
  attachmentsLocked: boolean;
  onAttachmentsChange: (next: ProjectAttachment[]) => void;
  onAttachmentDownload: (attachment: ProjectAttachment) => void;
  onAttachmentView: (attachment: ProjectAttachment) => void;
  onAttachmentNotice: (message: string) => void;
}) {
  const [keepSvgPage, setKeepSvgPage] = useState(false);
  useEffect(() => setKeepSvgPage(readKeepSvgPage()), []);
  // The width a picture or an SVG comes in at; empty keeps its own size, and it counts for the next import only.
  const [svgWidthText, setSvgWidthText] = useState(() => { const width = readImportSvgWidth(); return width ? String(width) : ""; });
  const [exportFormat, setExportFormat] = useState<ExportFormat>("stl");
  const [drawingFormat, setDrawingFormat] = useState<"svg" | "pdf">("pdf");
  const [svgView, setSvgView] = useState<SvgExportView>("silhouette");
  const [dxfView, setDxfView] = useState<DxfExportView>("silhouette");
  // Stencil bridges for the parts a cut would let fall out (the middle of an "o"): off unless asked for.
  const [bridgesOn, setBridgesOn] = useState(false);
  const [bridges, setBridges] = useState<StencilBridgeOptions>(DEFAULT_STENCIL_BRIDGES);
  // One body with a name of its own is exported under that name; a design file keeps the design's name.
  const ownObjectName = estimateShapes.length === 1 && hasOwnShapeName(estimateShapes[0]) ? estimateShapes[0].name!.trim() : null;
  const suggestedName = ownObjectName && exportFormat !== "lyl" ? ownObjectName : projectName;
  const [exportName, setExportName] = useState(suggestedName);
  const previousSuggestedNameRef = useRef(suggestedName);
  // Starts at the history setting from the workspace settings, so a project
  // file carries what the editor keeps unless it is changed here.
  const [lylHistoryLimit, setLylHistoryLimit] = useState<LylHistoryLimit>(workspaceHistoryLimit);
  useEffect(() => setLylHistoryLimit(workspaceHistoryLimit), [workspaceHistoryLimit]);
  // A name that is still the one suggested follows a new suggestion; a typed one stays.
  useEffect(() => {
    const previousSuggestedName = previousSuggestedNameRef.current;
    setExportName((current) => current === previousSuggestedName ? suggestedName : current);
    previousSuggestedNameRef.current = suggestedName;
  }, [suggestedName]);
  // A custom number from the settings joins the usual stops in its place; the last stop, None,
  // saves the design with its current state only, for sharing a file without its undo steps (#246).
  const lylHistoryLimits = useMemo<readonly LylHistoryLimit[]>(() => {
    const presets: number[] = [100, 50, 30];
    const numbers = typeof workspaceHistoryLimit === "number" && !presets.includes(workspaceHistoryLimit)
      ? [...presets, workspaceHistoryLimit].sort((a, b) => b - a)
      : presets;
    return ["unlimited", ...numbers, 0];
  }, [workspaceHistoryLimit]);
  const lylHistoryLimitIndex = Math.max(0, lylHistoryLimits.indexOf(lylHistoryLimit));
  const [printMaterial, setPrintMaterial] = useState<PrintMaterial>(() => {
    try {
      return normalizePrintMaterial(window.localStorage.getItem(PRINT_MATERIAL_STORAGE_KEY));
    } catch {
      return DEFAULT_PRINT_MATERIAL;
    }
  });
  const [printVolume, setPrintVolume] = useState<ExportSolidVolume | null>(null);
  const [printInfill, setPrintInfill] = useState<number>(() => {
    try {
      return normalizeInfillPercent(window.localStorage.getItem(PRINT_INFILL_STORAGE_KEY));
    } catch {
      return DEFAULT_INFILL_PERCENT;
    }
  });
  const [printWalls, setPrintWalls] = useState<number>(() => {
    try {
      return normalizeWalls(window.localStorage.getItem(PRINT_WALLS_STORAGE_KEY));
    } catch {
      return DEFAULT_WALLS;
    }
  });
  const [imageOptions, setImageOptions] = useState<ViewImageOptions>({ plate: true, transparent: false });
  const showPrintEstimate = panel === "export" && exportFormat !== "drawing" && exportFormat !== "svg" && exportFormat !== "dxf" && exportFormat !== "png" && exportFormat !== "lyl" && shapeCount > 0;
  // A picture shows the view as it is, not the selection, so the notes about what goes along do not apply.
  const exportsBodies = exportFormat !== "lyl" && exportFormat !== "png";
  // The estimate is worked out on a click, not on every opening and every change of format: for a finely traced
  // multicolour model it takes as long as the export itself (#734). A change of the design or of the format asks again.
  const [printAsked, setPrintAsked] = useState(false);
  useEffect(() => {
    setPrintAsked(false);
    setPrintVolume(null);
  }, [showPrintEstimate, estimateShapes]);
  useEffect(() => {
    if (!showPrintEstimate || !printAsked) return;
    let cancelled = false;
    setPrintVolume(null);
    // Kurz warten: beim Tippen oder Ziehen im Hintergrund nicht jedes Mal neu verschmelzen.
    const timer = window.setTimeout(() => {
      onEstimatePrint(estimateShapes)
        .then((result) => { if (!cancelled) setPrintVolume(result); })
        .catch(() => { if (!cancelled) setPrintVolume(null); });
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [showPrintEstimate, printAsked, estimateShapes, onEstimatePrint]);
  const choosePrintMaterial = (value: string) => {
    const material = normalizePrintMaterial(value);
    setPrintMaterial(material);
    try {
      window.localStorage.setItem(PRINT_MATERIAL_STORAGE_KEY, material);
    } catch {
      // Ohne Speicher gilt die Wahl nur bis zum Schliessen.
    }
  };
  const choosePrintInfill = (value: string) => {
    const infill = normalizeInfillPercent(value);
    setPrintInfill(infill);
    try {
      window.localStorage.setItem(PRINT_INFILL_STORAGE_KEY, String(infill));
    } catch {
      // Without storage the choice holds until the window closes.
    }
  };
  const choosePrintWalls = (value: string) => {
    const walls = normalizeWalls(value);
    setPrintWalls(walls);
    try {
      window.localStorage.setItem(PRINT_WALLS_STORAGE_KEY, String(walls));
    } catch {
      // See above.
    }
  };
  // Volume is the body's own; weight and filament count the walls and the infill, the solid numbers stand under them.
  const estimate = printVolume
    ? printEstimateWithInfill(printVolume.volumeMm3, { sideMm2: printVolume.sideMm2, flatMm2: printVolume.flatMm2 }, printMaterial, printInfill, printWalls)
    : null;
  const lylHistoryStop = (index: number) => ({ "--stop": index / (lylHistoryLimits.length - 1) }) as CSSProperties;
  useLanguage();
  const title = panel === "export" ? t("panel.export") : panel === "attachments" ? t("panel.attachments") : t("panel.import");

  const exportDetails: Record<ExportFormat, { label: string; description: string; note: string }> = {
    drawing: {
      label: t("export.drawing.label"),
      description: t("export.drawing.description"),
      note: t("export.drawing.note"),
    },
    stl: {
      label: "STL",
      description: t("export.stl.description"),
      note: t("export.stl.note"),
    },
    "3mf": {
      label: "3MF",
      description: t("export.3mf.description"),
      note: t("export.3mf.note"),
    },
    obj: {
      label: "OBJ",
      description: t("export.obj.description"),
      note: t("export.obj.note"),
    },
    step: {
      label: "STEP",
      description: t("export.step.description"),
      note: t("export.step.note"),
    },
    svg: {
      label: "SVG",
      description: t("export.svg.description"),
      note: t(svgView === "footprint" ? "export.svg.noteFootprint" : svgView === "edges" ? "export.svg.noteEdges" : "export.svg.note"),
    },
    dxf: {
      label: "DXF",
      description: t("export.dxf.description"),
      note: t(dxfView === "footprint" ? "export.dxf.noteFootprint" : "export.dxf.note"),
    },
    png: {
      label: "PNG",
      description: t("export.png.description"),
      note: t("export.png.note"),
    },
    lyl: {
      label: "LYL",
      description: t("export.lyl.description"),
      note: t("export.lyl.note"),
    },
  };
  const selectedExport = exportDetails[exportFormat];
  const runSelectedExport = (toServer = false) => {
    if (drawingExporting || stepExporting || lylExporting) return;
    if (exportFormat === "drawing") onExportDrawing(exportName, drawingFormat, toServer);
    else if (exportFormat === "step") onExportStep(exportName, toServer);
    else if (exportFormat === "png") onExportImage(exportName, imageOptions, toServer);
    else if (exportFormat === "lyl") onExportLyl(exportName, lylHistoryLimit, lylFileAccessSupported() ? "fileAs" : "download");
    else {
      const view = exportFormat === "dxf" ? dxfView : svgView;
      // Bridges go into a cut outline: the DXF, or the SVG's silhouette.
      const withBridges = bridgesOn && (exportFormat === "dxf" || (exportFormat === "svg" && svgView === "silhouette"));
      onExport(exportFormat, exportName, false, view, toServer, withBridges ? bridges : null);
    }
  };

  return (
    // Movable by its title bar like the other tool panels, so it never has to cover the design (as QrCodePanel).
    <MovableToolPanel className={`top-action-panel icon-tag-panel ${panel === "export" ? "export-action-panel" : panel === "import" || panel === "attachments" ? "import-action-panel" : ""}`} ariaLabel={title}>
      {(handleProps) => (<>
      <header className="movable" title={t("panel.moveHint")} {...handleProps}>
        <div className="top-action-heading">
          <strong>{title}</strong>
        </div>
        <div className="panel-header-actions">
          {panel === "attachments" ? <GuideHelpLink section="attachments" /> : <GuideHelpLink section={panel === "import" ? "importing" : "exporting"} />}
          <button aria-label={t("panel.close", { title })} onClick={onClose}>
            <X size={18} />
          </button>
        </div>
      </header>
      {panel === "attachments" ? (
        <AttachmentsPanel
          attachments={attachments}
          locked={attachmentsLocked}
          onChange={onAttachmentsChange}
          onDownload={onAttachmentDownload}
          onView={onAttachmentView}
          onNotice={onAttachmentNotice}
        />
      ) : null}
      {panel === "import" ? (
        <div className="top-action-body">
          <button className="open-lyl-project-button" type="button" onClick={onPickProjectFile}>
            <span className="open-lyl-project-icon"><FolderOpen size={18} /></span>
            <span>
              <strong>{t("import.openProject")}</strong>
              <small>{t("import.openProjectHint")}</small>
            </span>
          </button>
          <button className="open-lyl-project-button" type="button" onClick={onPickInsertProjectFile}>
            <span className="open-lyl-project-icon"><FilePlus2 size={18} /></span>
            <span>
              <strong>{t("import.insertProject")}</strong>
              <small>{t("import.insertProjectHint")}</small>
            </span>
          </button>
          <button className="open-lyl-project-button" type="button" onClick={onPickReferenceImage} data-testid="import-reference-image">
            <span className="open-lyl-project-icon"><ImagePlus size={18} /></span>
            <span>
              <strong>{t("import.referenceImage")}</strong>
              <small>{t("import.referenceImageHint")}</small>
            </span>
          </button>
          <div className="import-kind-divider"><span>{t("import.divider")}</span></div>
          <button
            className="import-drop-zone"
            onClick={onPickFile}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "copy";
            }}
            onDrop={(event) => {
              event.preventDefault();
              if (event.dataTransfer.files.length > 0) {
                onImportFiles(event.dataTransfer.files);
              }
            }}
          >
            <ToolbarImportIcon />
            <strong>{t("import.dropZone")}</strong>
            <span>{t("import.dropZoneHint")}</span>
          </button>
          <label className="import-option" title={t("import.keepSvgPageHint")}>
            <input
              type="checkbox"
              checked={keepSvgPage}
              onChange={(event) => {
                setKeepSvgPage(event.currentTarget.checked);
                storeKeepSvgPage(event.currentTarget.checked);
              }}
            />
            <span>{t("import.keepSvgPage")}</span>
          </label>
          <label className="import-option import-width-option" title={t("import.svgWidthHint")}>
            <span>{t("import.svgWidth")}</span>
            <input
              type="text"
              inputMode="decimal"
              value={svgWidthText}
              placeholder={t("import.svgWidthPlaceholder")}
              onChange={(event) => {
                const text = event.currentTarget.value;
                setSvgWidthText(text);
                const width = Number(text.replace(",", "."));
                setImportSvgWidth(text.trim() && Number.isFinite(width) && width > 0 ? width : null);
              }}
            />
          </label>
        </div>
      ) : null}
      {panel === "export" ? (
        <div className="export-dialog-body" data-help-section-all="exporting">
          <section className="export-setting-section export-file-section">
            <label htmlFor="export-file-name">{t("export.fileName")}</label>
            <div className="export-file-input-wrap">
              <input
                id="export-file-name"
                className="export-file-input"
                value={exportName}
                maxLength={120}
                spellCheck={false}
                onChange={(event) => setExportName(event.target.value)}
                onFocus={(event) => event.currentTarget.select()}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && (shapeCount > 0 || !exportsBodies) && !stepExporting && !lylExporting && !drawingExporting) runSelectedExport();
                }}
              />
              <span>.{exportFormat === "drawing" ? drawingFormat : exportFormat}</span>
            </div>
          </section>

          <section className="export-setting-section">
            <div className="export-section-heading">
              <div>
                <strong>{t("export.format")}</strong>
              </div>
              <span className="export-scope-badge">{exportFormat === "lyl"
                  ? t("export.fullProject")
                  : exportFormat === "png"
                  ? t("export.png.scope")
                  : t(scopeLabel === "selected" ? "export.scopeSelected" : "export.scopeTotal", { count: shapeCount })}</span>
            </div>
            <div className="export-format-slider" data-format={exportFormat} role="radiogroup" aria-label={t("export.formatLabel")}>
              {(["stl", "3mf", "obj", "step", "svg", "dxf", "png", "lyl", "drawing"] as const).map((format) => (
                <button
                  key={format}
                  type="button"
                  role="radio"
                  aria-checked={exportFormat === format}
                  aria-label={`${exportDetails[format].label}: ${exportDetails[format].description}`}
                  title={format === "drawing" ? exportDetails[format].label : undefined}
                  onClick={() => setExportFormat(format)}
                >
                  {format === "drawing" ? t("export.drawing.short") : exportDetails[format].label}
                </button>
              ))}
            </div>
          </section>

          {exportFormat === "drawing" ? (
            <section className="export-setting-section">
              <label>
                <strong>{t("export.drawing.fileFormat")}</strong>{" "}
                <select aria-label={t("export.drawing.fileFormat")} value={drawingFormat} onChange={(event) => setDrawingFormat(event.target.value as "svg" | "pdf")}>
                  <option value="pdf">PDF</option>
                  <option value="svg">SVG</option>
                </select>
              </label>
            </section>
          ) : null}

          {exportFormat === "svg" ? (
            <section className="export-setting-section">
              <label>
                <strong>{t("export.svg.view")}</strong>{" "}
                <select aria-label={t("export.svg.view")} value={svgView} onChange={(event) => setSvgView(event.target.value as SvgExportView)}>
                  <option value="silhouette">{t("export.svg.viewSilhouette")}</option>
                  <option value="footprint">{t("export.svg.viewFootprint")}</option>
                  <option value="edges">{t("export.svg.viewEdges")}</option>
                </select>
              </label>
              {svgView === "silhouette" ? <StencilBridgeControls on={bridgesOn} options={bridges} onToggle={setBridgesOn} onChange={setBridges} /> : null}
            </section>
          ) : null}

          {exportFormat === "dxf" ? (
            <section className="export-setting-section">
              <label>
                <strong>{t("export.svg.view")}</strong>{" "}
                <select aria-label={t("export.svg.view")} value={dxfView} onChange={(event) => setDxfView(event.target.value as DxfExportView)}>
                  <option value="silhouette">{t("export.svg.viewSilhouette")}</option>
                  <option value="footprint">{t("export.svg.viewFootprint")}</option>
                </select>
              </label>
              <StencilBridgeControls on={bridgesOn} options={bridges} onToggle={setBridgesOn} onChange={setBridges} />
            </section>
          ) : null}

          {exportsBodies && selectionLeavesOut ? (
            <div className="export-holes-only-warning export-selection-note" role="status">
              <Info size={16} aria-hidden="true" />
              <span>
                {selectionLeavesOut.selected === 1
                  ? t("export.selectionOnlyOne", { total: selectionLeavesOut.total })
                  : t("export.selectionOnlyMany", { count: selectionLeavesOut.selected, total: selectionLeavesOut.total })}
              </span>
              {onSelectAll ? (
                <button type="button" className="export-select-all-button" onClick={onSelectAll}>
                  {t("export.selectAll")}
                </button>
              ) : null}
            </div>
          ) : null}

          {exportsBodies && hiddenCount > 0 ? (
            <div className="export-holes-only-warning export-hidden-note" role="status">
              <EyeOff size={16} aria-hidden="true" />
              <span>{hiddenCount === 1 ? t("export.hiddenOne") : t("export.hiddenMany", { count: hiddenCount })}</span>
            </div>
          ) : null}

          {exportsBodies && onlyHoles ? (
            <div className="export-holes-only-warning" role="status">
              <Info size={16} aria-hidden="true" />
              <span>{t("export.holesOnlyWarning")}</span>
            </div>
          ) : null}

          {showPrintEstimate ? (
            <section className="export-setting-section print-estimate-section" aria-live="polite">
              <div className="export-section-heading">
                <div>
                  <strong>{t("export.estimateTitle")}</strong>
                  <span>{t("export.estimateHint")}</span>
                </div>
                <select
                  id="export-print-material"
                  className="print-estimate-material"
                  value={printMaterial}
                  aria-label={t("export.estimateMaterial")}
                  onChange={(event) => choosePrintMaterial(event.currentTarget.value)}
                >
                  {PRINT_MATERIALS.map((material) => (
                    <option key={material} value={material}>{t(`export.material.${material}` as MessageKey)}</option>
                  ))}
                </select>
              </div>
              <div className="print-estimate-settings">
                <label htmlFor="export-print-infill">
                  <span>{t("export.estimateInfillLabel")}</span>
                  <select id="export-print-infill" className="print-estimate-material" value={printInfill} onChange={(event) => choosePrintInfill(event.currentTarget.value)}>
                    {INFILL_CHOICES.map((percent) => (
                      <option key={percent} value={percent}>{percent} %</option>
                    ))}
                  </select>
                </label>
                <label htmlFor="export-print-walls" hidden={printInfill === 100}>
                  <span>{t("export.estimateWallsLabel")}</span>
                  <select id="export-print-walls" className="print-estimate-material" value={printWalls} onChange={(event) => choosePrintWalls(event.currentTarget.value)}>
                    {WALL_CHOICES.map((count) => (
                      <option key={count} value={count}>{count}</option>
                    ))}
                  </select>
                </label>
              </div>
              {estimate ? (
                <dl className="print-estimate-values">
                  <div>
                    <dt>{t("export.estimateVolume")}</dt>
                    <dd>{formatEstimateNumber(estimate.solid.volumeCm3, estimate.solid.volumeCm3 < 10 ? 2 : 1)} cm³</dd>
                  </div>
                  <div>
                    <dt>{t("export.estimateWeight")}</dt>
                    <dd>{formatEstimateNumber(estimate.printed.grams, estimate.printed.grams < 10 ? 1 : 0)} g</dd>
                  </div>
                  <div>
                    <dt>{t("export.estimateFilament")}</dt>
                    <dd>{formatEstimateNumber(estimate.printed.filamentMeters, estimate.printed.filamentMeters < 10 ? 2 : 1)} m</dd>
                  </div>
                </dl>
              ) : printAsked ? (
                <span className="print-estimate-busy">{t("export.estimateBusy")}</span>
              ) : (
                <button type="button" className="print-estimate-material print-estimate-calculate" onClick={() => setPrintAsked(true)}>{t("export.estimateCalculate")}</button>
              )}
              {estimate ? (
                <span className="print-estimate-note print-estimate-infill">
                  {estimate.infillPercent === 100
                    ? t("export.estimateSolidNote")
                    : t("export.estimateInfill", {
                      walls: estimate.walls,
                      infill: estimate.infillPercent,
                      grams: formatEstimateNumber(estimate.solid.grams, estimate.solid.grams < 10 ? 1 : 0),
                    })}
                </span>
              ) : null}
              {printVolume && printVolume.unionFailed > 0 ? (
                <span className="print-estimate-note">{t("export.estimateOverlap")}</span>
              ) : null}
            </section>
          ) : null}

          {exportFormat === "png" ? (
            <section className="export-setting-section export-image-section">
              <label className="export-image-option" htmlFor="export-image-plate">
                <input id="export-image-plate" type="checkbox" checked={imageOptions.plate} onChange={(event) => { const plate = event.currentTarget.checked; setImageOptions((current) => ({ ...current, plate })); }} />
                <span>{t("export.png.plate")}</span>
              </label>
              <label className="export-image-option" htmlFor="export-image-transparent">
                <input id="export-image-transparent" type="checkbox" checked={imageOptions.transparent} onChange={(event) => { const transparent = event.currentTarget.checked; setImageOptions((current) => ({ ...current, transparent })); }} />
                <span>{t("export.png.transparent")}</span>
              </label>
            </section>
          ) : null}

          {exportFormat === "lyl" ? (
            <section className="export-setting-section lyl-history-section">
              <div className="export-section-heading">
                <div>
                  <strong>{t("export.historyTitle")}</strong>
                  <span>{t("export.historyHint")}</span>
                </div>
              </div>
              <div className="lyl-history-range-control" data-limit={String(lylHistoryLimit)} style={lylHistoryStop(lylHistoryLimitIndex)}>
                <input
                  className="lyl-history-range"
                  type="range"
                  min={0}
                  max={lylHistoryLimits.length - 1}
                  step={1}
                  value={lylHistoryLimitIndex}
                  aria-label={t("export.historyLabel")}
                  aria-valuetext={lylHistoryLimit === "unlimited" ? t("export.unlimited") : lylHistoryLimit === 0 ? t("export.historyNone") : t("export.actionCount", { count: lylHistoryLimit })}
                  onChange={(event) => setLylHistoryLimit(lylHistoryLimits[Number(event.currentTarget.value)] ?? "unlimited")}
                />
              </div>
              <div className="lyl-history-range-labels" aria-hidden="true">
                {lylHistoryLimits.map((limit, index) => (
                  <span key={limit} className={lylHistoryLimit === limit ? "active" : undefined} style={lylHistoryStop(index)}>
                    {limit === "unlimited" ? t("export.unlimited") : limit === 0 ? t("export.historyNone") : limit}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          <div className="export-format-summary">
            <div>
              <strong>{selectedExport.label}</strong>
              <span>{selectedExport.description}</span>
            </div>
            <p>{selectedExport.note}</p>
          </div>

          <footer className="export-dialog-footer">
            {exportFormat === "stl" && stlFileName ? (
              stlNameAsksForNewFile(exportName, projectName, stlFileName)
                ? <span className="export-linked-file" title={exportName}>{t("export.stlNewFile", { name: projectExportFileName(exportName.trim().replace(/\.stl$/i, ""), "stl") })}</span>
                : <span className="export-linked-file" title={stlFileName}>{t("export.stlLinkedFile", { name: stlFileName })}</span>
            ) : null}
            <div>
              {exportFormat === "stl" && stlFileName ? (
                <button className="export-shared-button" type="button" onClick={() => onExport("stl", exportName, true)} disabled={shapeCount === 0}>
                  <span>{t("export.stlSaveAs")}</span>
                </button>
              ) : null}
              {exportFormat === "lyl" && sharedProjectsEnabled ? (
                <button
                  className="export-shared-button"
                  type="button"
                  onClick={() => onExportLyl(exportName, lylHistoryLimit, "shared")}
                  disabled={lylExporting || stepExporting || drawingExporting}
                >
                  <CloudUpload />
                  <span>{t("export.saveToShared")}</span>
                </button>
              ) : null}
              {exportFormat !== "lyl" && sharedProjectsEnabled ? (
                <button
                  className="export-shared-button"
                  type="button"
                  title={t("export.saveFileToServerHint")}
                  onClick={() => runSelectedExport(true)}
                  disabled={(shapeCount === 0 && exportsBodies) || stepExporting || lylExporting || drawingExporting}
                >
                  <CloudUpload />
                  <span>{t("export.saveToShared")}</span>
                </button>
              ) : null}
              <button className="export-primary-button" onClick={() => runSelectedExport()} disabled={(shapeCount === 0 && exportsBodies) || stepExporting || lylExporting || drawingExporting}>
                <Download />
                {exportFormat === "lyl" ? (lylExporting ? t("export.savingProject") : t("export.saveProject")) : null}
                <span hidden={exportFormat === "lyl"}>
                {drawingExporting && exportFormat === "drawing"
                  ? t("status.buildingDrawing")
                  : stepExporting && exportFormat === "step"
                  ? t("export.buildingStep")
                  : t("export.run", { format: selectedExport.label })}
                </span>
              </button>
            </div>
          </footer>
        </div>
      ) : null}
      </>)}
    </MovableToolPanel>
  );
}

const BRIDGE_WIDTHS = [0.5, 0.8, 1, 1.5, 2, 3] as const;

/** The stencil bridges' switch, and with it on, how wide the bridges are and how many hold each part. */
function StencilBridgeControls({ on, options, onToggle, onChange }: { on: boolean; options: StencilBridgeOptions; onToggle: (on: boolean) => void; onChange: (options: StencilBridgeOptions) => void }) {
  return (
    <>
      <label className="export-image-option" title={t("export.bridgesHint")}>
        <input type="checkbox" checked={on} onChange={(event) => onToggle(event.currentTarget.checked)} />
        <span>{t("export.bridges")}</span>
      </label>
      {on ? (
        <>
          <span className="print-estimate-note">{t("export.bridgesHint")}</span>
          <label>
            <strong>{t("export.bridgeWidth")}</strong>{" "}
            <select aria-label={t("export.bridgeWidth")} value={String(options.width)} onChange={(event) => onChange(normalizedStencilBridges({ ...options, width: Number(event.target.value) }))}>
              {BRIDGE_WIDTHS.map((width) => <option key={width} value={String(width)}>{`${width} mm`}</option>)}
            </select>
          </label>
          <label>
            <strong>{t("export.bridgeCount")}</strong>{" "}
            <select aria-label={t("export.bridgeCount")} value={String(options.count)} onChange={(event) => onChange(normalizedStencilBridges({ ...options, count: Number(event.target.value) }))}>
              {Array.from({ length: MAX_BRIDGE_COUNT }, (_, index) => index + 1).map((count) => <option key={count} value={String(count)}>{count}</option>)}
            </select>
          </label>
        </>
      ) : null}
    </>
  );
}
