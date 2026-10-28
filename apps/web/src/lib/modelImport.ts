import { unzipSync } from "fflate";
import { t } from "@/lib/i18n";
import { importExtensionSupported } from "@/lib/importExtensions";
import { attachProjectAsset, projectAssetFromBytes, sourceFormatForFileName } from "@/lib/projectAssets";
import { readKeepSvgPage } from "@/lib/importPreferences";
import { scaleSvgText } from "@/lib/svgScale";
import { decodeSvgBytes, importedColourShapesFromSvg, importedShapeFromSvgWithReport, prepareSvgImport } from "@/lib/svgImport";
import { importedShapesFrom3mf } from "@/lib/threemfImport";
import { sketchProfileFromSvg, sketchProfileFromSvgPaths } from "@/lib/svgSketch";
import { DXF_SKETCH_COLOR, DXF_SKETCH_HEIGHT, DxfImportError, sketchProfileFromDxf } from "@/lib/dxfImport";
import { importedPictureSvg, isPictureFile, svgEmbeddedPicture } from "@/lib/pictureIcon";
import { createLocalId } from "@/lib/localIds";
import { canonicalizeShape } from "@/lib/workplaneShapes";
import type { ProjectAsset, SketchProfile, WorkplaneShape } from "@/types/layerling";

/**
 * Der Import von Modelldateien, fuer das Importfenster im Editor, die MCP-
 * Aktion und die Entwurfsuebersicht gleichermassen - frueher stand er zweimal
 * da, und nur einer kannte die Farben.
 */

export type ImportFailure = { fileName: string; reason: string };

/**
 * Was zum Import ausgewaehlt wurde, zurechtgelegt: ein ZIP (so liefert
 * andere Programme ihre OBJ, mit der .mtl daneben) wird ausgepackt, und .mtl-Dateien
 * sind keine eigenen Teile, sondern die Farben fuer die OBJ daneben.
 */
async function prepareImportFiles(files: readonly File[]) {
  const expanded: File[] = [];
  const failures: ImportFailure[] = [];
  for (const file of files) {
    if (!/\.zip$/i.test(file.name)) {
      expanded.push(file);
      continue;
    }
    try {
      const entries = unzipSync(new Uint8Array(await file.arrayBuffer()), {
        filter: (entry) => !entry.name.endsWith("/") && /\.(obj|mtl|stl|3mf|svg|step|stp|dxf)$/i.test(entry.name) && !/(^|\/)__MACOSX\//.test(entry.name),
      });
      const inside = Object.entries(entries).map(([name, bytes]) => new File([bytes as BlobPart], name.split("/").pop() || name));
      if (!inside.some((entry) => !/\.mtl$/i.test(entry.name))) {
        failures.push({ fileName: file.name, reason: t("status.importZipEmpty") });
        continue;
      }
      expanded.push(...inside);
    } catch {
      failures.push({ fileName: file.name, reason: t("status.importZipUnreadable") });
    }
  }
  const mtlFiles = expanded.filter((file) => /\.mtl$/i.test(file.name));
  const mtlSources = await Promise.all(mtlFiles.map((file) => file.text()));
  return { files: expanded.filter((file) => !/\.mtl$/i.test(file.name)), mtlSources, failures };
}

export type ModelImportResult = {
  shapes: WorkplaneShape[];
  assets: ProjectAsset[];
  /** Die Modelldateien, die tatsaechlich gelesen wurden (ein ZIP ist ausgepackt). */
  files: File[];
  /** Davon die, aus denen etwas wurde. */
  importedFileNames: string[];
  failures: ImportFailure[];
  /** Saetze fuer die Meldung: wie viele Farben, was fehlt. */
  notes: string[];
  /** Nur eine .mtl ausgewaehlt - es gibt nichts zu importieren. */
  mtlOnly: boolean;
};

export async function importModelFiles(
  selected: readonly File[],
  options: {
    onProgress?: (index: number, total: number, file: File, isStep: boolean) => void;
    cancelled?: () => boolean;
    /**
     * Builds an SVG as a sketch body (#197), given the mesh the import would make otherwise and
     * the sketch of its outlines. Null keeps the mesh - so does an import without it.
     */
    svgAsSketch?: (mesh: WorkplaneShape, profile: SketchProfile) => Promise<WorkplaneShape | null>;
    /**
     * Builds a sketch body from a sketch and its height: how a DXF comes in (#774). Without it a DXF cannot be read
     * (the dashboard's import has no kernel at hand).
     */
    sketchFromProfile?: (profile: SketchProfile, height: number) => Promise<WorkplaneShape>;
    /** An SVG keeps its place on its drawing page, so files of one page line up (#258). Left out: the setting in the import window. */
    svgKeepPagePosition?: boolean;
    /** An SVG or a picture comes in at this width in mm, scaled from its own size (#448). Null or left out: its own size. */
    svgWidth?: number | null;
  } = {},
): Promise<ModelImportResult | null> {
  const prepared = await prepareImportFiles(selected);
  const files = prepared.files;
  const result: ModelImportResult = {
    shapes: [],
    assets: [],
    files,
    importedFileNames: [],
    failures: [...prepared.failures],
    notes: [],
    mtlOnly: !files.length && prepared.mtlSources.length > 0 && !prepared.failures.length,
  };
  if (result.mtlOnly) {
    result.failures.push({ fileName: selected[0]?.name ?? ".mtl", reason: t("status.importMtlAlone") });
    return result;
  }

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    if (options.cancelled?.()) return null;

    // A DXF comes in as sketch bodies of its closed outlines and their holes beside them (#774): no mesh, no file kept.
    if (/\.dxf$/i.test(file.name)) {
      options.onProgress?.(index, files.length, file, false);
      try {
        if (!options.sketchFromProfile) throw new Error(t("status.importUnsupported"));
        const dxf = sketchProfileFromDxf(new TextDecoder().decode(new Uint8Array(await file.arrayBuffer())));
        // Every solid outline a body, its holes loose holes beside it: each moved and sized in the editor itself.
        const name = file.name.replace(/\.dxf$/i, "");
        const shapes: WorkplaneShape[] = [];
        for (const profile of dxf.parts.solids) {
          const built = await options.sketchFromProfile(profile, DXF_SKETCH_HEIGHT);
          shapes.push({ ...built, name: name || built.name, color: DXF_SKETCH_COLOR });
        }
        for (const profile of dxf.parts.holes) {
          shapes.push({ ...(await options.sketchFromProfile(profile, DXF_SKETCH_HEIGHT)), hole: true, color: DXF_SKETCH_COLOR });
        }
        dxf.parts.roundHoles.forEach(({ x, z, diameter }) => {
          shapes.push(canonicalizeShape({
            id: createLocalId("shape"),
            name: "Cylinder",
            kind: "cylinder",
            color: DXF_SKETCH_COLOR,
            hole: true,
            x,
            z,
            elevation: 0,
            size: diameter,
            width: diameter,
            depth: diameter,
            height: DXF_SKETCH_HEIGHT,
            rotation: 0,
            rotationX: 0,
            rotationZ: 0,
          }));
        });
        result.shapes.push(...shapes);
        result.importedFileNames.push(file.name);
        if (dxf.unit) result.notes.push(t("status.importDxfUnit", { name: file.name, unit: dxf.unit }));
        if (dxf.unitless) result.notes.push(t("status.importDxfUnitless", { name: file.name }));
        if (dxf.openLeftOut > 0) result.notes.push(t("status.importDxfOpen", { name: file.name, count: dxf.openLeftOut }));
        const skipped = Object.values(dxf.skipped).reduce((sum, count) => sum + count, 0);
        if (skipped > 0) result.notes.push(t("status.importDxfSkipped", { name: file.name, count: skipped, kinds: Object.keys(dxf.skipped).join(", ") }));
      } catch (error) {
        const reason = error instanceof DxfImportError
          ? t(error.reason === "binary" ? "status.importDxfBinary" : error.reason === "empty" ? "status.importDxfEmpty" : error.reason === "tooComplex" ? "status.importDxfTooComplex" : "status.importUnreadable")
          : error instanceof Error ? error.message : t("status.importUnreadable");
        result.failures.push({ fileName: file.name, reason });
      }
      continue;
    }

    // A PNG or JPG comes in traced into an outline, as an SVG (#359).
    const isPicture = isPictureFile(file);
    const sourceFormat = isPicture ? "svg" : sourceFormatForFileName(file.name) ?? (file.type === "image/svg+xml" ? "svg" : null);
    const isStep = sourceFormat === "step";
    const isObj = sourceFormat === "obj";
    const isSvg = sourceFormat === "svg";
    const is3mf = sourceFormat === "3mf";
    if (!sourceFormat || (!isStep && !isSvg && !importExtensionSupported(file.name))) {
      result.failures.push({ fileName: file.name, reason: t("status.importUnsupported") });
      continue;
    }

    options.onProgress?.(index, files.length, file, isStep);
    try {
      let bytes = new Uint8Array(await file.arrayBuffer());
      // The project keeps a traced picture as the SVG of its outline.
      let assetName = file.name;
      let assetType = file.type;
      const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      let shape: WorkplaneShape;
      // Eine farbige OBJ oder 3MF wird zu einem Koerper je Farbe, eine 3MF mit
      // mehreren Objekten zu einem je Objekt. Die tragen ihr Netz dann selbst;
      // die Datei als Ganzes bauen sie nicht nach.
      if (isObj || is3mf) {
        const colored = isObj
          ? await (await import("@/lib/geometryWorker")).importedShapesFromObjOffThread(file.name, new TextDecoder().decode(bytes), prepared.mtlSources)
          : importedShapesFrom3mf(file.name, buffer);
        if ("missingMaterialColors" in colored && colored.missingMaterialColors) result.notes.push(t("status.importObjNoMtl", { name: file.name }));
        if ("droppedVertexColors" in colored && colored.droppedVertexColors) result.notes.push(t("status.importObjVertexColors", { name: file.name }));
        if ("painted" in colored && colored.painted > 0) result.notes.push(t("status.import3mfPainted", { name: file.name }));
        if (colored.split) {
          result.shapes.push(...colored.shapes);
          result.importedFileNames.push(file.name);
          const objects = "objects" in colored ? colored.objects : 1;
          result.notes.push(t(objects > 1 ? "status.importObjectParts" : "status.importColoredParts", { name: file.name, count: colored.shapes.length, objects }));
          continue;
        }
        shape = colored.shapes[0];
      } else if (isStep) {
        // Several solids in one file, as an assembly from another CAD program: one body each, under its own name (#830).
        // Whatever stops that - one solid only, too many, a kernel that cannot read the structure - leaves it as one body.
        const assembly = await (await import("@/lib/stepAssemblyImport")).importedShapesFromStepAssembly(file.name, buffer).catch(() => null);
        if (assembly) {
          result.shapes.push(...assembly.shapes);
          result.importedFileNames.push(file.name);
          result.notes.push(t("status.importStepParts", { name: file.name, count: assembly.shapes.length }));
          continue;
        }
        const { importedShapeFromStep } = await import("@/lib/stepImport");
        shape = await importedShapeFromStep(file.name, buffer);
      } else if (isSvg) {
        let text = isPicture ? await importedPictureSvg(file) : decodeSvgBytes(bytes);
        const embedded = isPicture ? null : svgEmbeddedPicture(text);
        if (embedded) text = await importedPictureSvg(embedded);
        const traced = isPicture || Boolean(embedded);
        if (traced) {
          bytes = new TextEncoder().encode(text);
          assetName = `${file.name.replace(/\.[^.]+$/, "")}.svg`;
          assetType = "image/svg+xml";
        }
        // The mesh lies mirrored top to bottom - turned up out of the drawing - and older designs
        // rebuild it so from their file. A new import mirrors it back to read right from above (#197).
        // A traced picture has no page of its own to keep.
        await prepareSvgImport();
        const keepPagePosition = !traced && (options.svgKeepPagePosition ?? readKeepSvgPage());
        let svg = importedShapeFromSvgWithReport(file.name, text, { keepPagePosition });
        // A width typed in the import window scales the drawing before the sketch of its outlines is read,
        // so the body and its sketch agree; the file stored with the design is the scaled one too.
        const wishedWidth = options.svgWidth;
        if (wishedWidth && wishedWidth > 0 && svg.shape.width > 1e-6) {
          const scaled = scaleSvgText(text, wishedWidth / svg.shape.width);
          if (scaled !== text) {
            text = scaled;
            bytes = new TextEncoder().encode(text);
            assetType = "image/svg+xml";
            svg = importedShapeFromSvgWithReport(file.name, text, { keepPagePosition });
          }
        }
        shape = { ...svg.shape, mirrorZ: true };
        if (svg.pageKept === false) result.notes.push(t("status.importSvgNoPage", { name: file.name }));
        // A shape that does not build into a solid is left out; say so instead of leaving a gap unexplained (#258).
        if (svg.skippedShapes > 0) result.notes.push(t("status.importSvgSkipped", { name: file.name, count: svg.skippedShapes }));
        // A drawing of several colours comes in as one body per colour, each in its colour and in its place (#818). A body
        // carries its outline as a sketch, or else its mesh: the file holds every colour and would build them all again.
        const colours = traced ? null : importedColourShapesFromSvg(file.name, text, svg);
        if (colours) {
          for (const part of colours.parts) {
            const mesh = { ...part.shape, mirrorZ: true };
            const profile = options.svgAsSketch ? sketchProfileFromSvgPaths(part.paths) : null;
            const sketched = profile ? await options.svgAsSketch!(mesh, profile).catch(() => null) : null;
            result.shapes.push(sketched ?? { ...mesh, importedMesh: { ...mesh.importedMesh!, sourceFormat: "json" } });
          }
          result.importedFileNames.push(file.name);
          continue;
        }
        // A sketch body carries its outline itself and needs neither the file nor its mesh.
        const profile = options.svgAsSketch ? sketchProfileFromSvg(text) : null;
        const sketched = profile ? await options.svgAsSketch!(shape, profile).catch(() => null) : null;
        if (sketched) {
          result.shapes.push(sketched);
          result.importedFileNames.push(file.name);
          continue;
        }
      } else {
        // Read off the page (lib/geometryWorker.ts), loaded only when a file needs it.
        shape = await (await import("@/lib/geometryWorker")).importedShapeFromStlOffThread(file.name, buffer);
      }
      // Eine eigene OBJ traegt ihr Netz selbst ("json") und braucht die Datei nicht.
      if (shape.importedMesh?.sourceFormat === "json") {
        result.shapes.push(shape);
      } else {
        const asset = await projectAssetFromBytes(assetName, sourceFormat, bytes, assetType);
        result.shapes.push(attachProjectAsset(shape, asset.id));
        result.assets.push(asset);
      }
      result.importedFileNames.push(file.name);
    } catch (error) {
      result.failures.push({
        fileName: file.name,
        reason: error instanceof Error ? error.message : t("status.importUnreadable"),
      });
    }
  }
  return options.cancelled?.() ? null : result;
}

/** Die Fehlerzeile unter einer Importmeldung, oder nichts. */
export function importFailureSummary(failures: readonly ImportFailure[]) {
  if (!failures.length) return "";
  const details = failures.slice(0, 3).map((failure) => `${failure.fileName}: ${failure.reason}`).join("; ");
  const more = failures.length > 3 ? t("status.importFailedMore", { count: failures.length - 3 }) : "";
  return " " + t("status.importFailedList", { details, more });
}
