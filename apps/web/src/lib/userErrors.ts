import { getLanguage, isInterfaceSentence, t } from "@/lib/i18n";
import type { MessageKey } from "@/lib/messages.en";

/*
 * Many errors are thrown deep in a worker or a library as plain English text
 * and reach the screen as they are. Every message a person can see has to be
 * in their language, so the known ones are matched here and shown from the
 * message tables. A technical text that is not known yet still gets a
 * sentence in the person's language around it, instead of standing alone.
 */

type ErrorRule = {
  pattern: RegExp;
  key: MessageKey;
  values?: (match: RegExpMatchArray) => Record<string, string | number>;
};

export const ERROR_RULES: ErrorRule[] = [
  // A design from a newer layerling with something this one does not know yet (lylProject.ts).
  { pattern: /^This design was saved with layerling ([\d.]+), newer than this layerling ([\d.]+)/, key: "error.newerDesign", values: (m) => ({ saved: m[1], current: m[2] }) },
  // Saving a design in the browser (page.tsx): too big for the project file, or no room left
  { pattern: /exceeds the 64 MB project file limit|too many stored assets for the project format/i, key: "error.projectTooLarge" },
  { pattern: /quota/i, key: "error.storageFull" },
  // Drawing export (drawingExport.ts, drawingProjection.ts)
  { pattern: /more than 200 circular holes/i, key: "error.drawingTooManyHoles" },
  { pattern: /drawing exceeds 5,080 mm/i, key: "error.drawingTooLarge" },
  {
    pattern: /Drawing views support up to ([\d,]+) triangles; these views have ([\d,]+)/i,
    key: "error.drawingTooManyTriangles",
    values: (m) => {
      const format = new Intl.NumberFormat(getLanguage());
      return { limit: format.format(Number(m[1].replace(/,/g, ""))), count: format.format(Number(m[2].replace(/,/g, ""))) };
    },
  },
  { pattern: /view has too many drawing edges/i, key: "error.drawingTooManyEdges" },
  { pattern: /view has no solid geometry/i, key: "error.drawingNoGeometry" },
  // History view (also the answers the AI bridge gives while it is open)
  { pattern: /The history view is open/i, key: "error.historyViewOpen" },
  { pattern: /no earlier state to look at/i, key: "error.noEarlierState" },
  { pattern: /Finish the current action before opening the history view/i, key: "error.finishBeforeHistory" },
  // CAD kernel: stored and rebuilt bodies
  { pattern: /could not be restored as a valid solid/i, key: "error.storedBodyRestore" },
  { pattern: /The exact (profile|thread|spring|gear) body (is not|does not)/i, key: "error.exactBodyInvalid" },
  { pattern: /The (thread|gear|spring) body is not a valid solid/i, key: "error.solidNotValid" },
  { pattern: /The (thread|gear|spring)'s .* (came out as|sewed into|did not close|did not sweep)/i, key: "error.solidNotValid" },
  { pattern: /The (thread|gear|spring)'s measures are out of range/i, key: "error.measuresOutOfRange" },
  { pattern: /gear with its bore came out as/i, key: "error.solidNotValid" },
  { pattern: /thread's chamfer reaches its axis/i, key: "error.threadChamferAxis" },
  { pattern: /gear's centre hole reaches its teeth/i, key: "error.gearHoleTeeth" },
  { pattern: /crescent horn rounding does not fit/i, key: "error.crescentRounding" },
  { pattern: /glyph uses a curve the exact outline does not know/i, key: "error.glyphCurve" },
  { pattern: /selected primitive has invalid dimensions/i, key: "error.primitiveDimensions" },
  { pattern: /could not be prepared as a valid CAD solid/i, key: "error.primitiveNotSolid" },
  { pattern: /selected object has no mesh data/i, key: "error.noMeshData" },
  { pattern: /selected object has no closed faces/i, key: "error.noClosedFaces" },
  { pattern: /open or non-manifold\. Repair/i, key: "error.meshOpen" },
  { pattern: /grouped solid could not be repaired/i, key: "error.groupRepair" },
  { pattern: /contains no closed solid components/i, key: "error.noSolidComponents" },
  { pattern: /could not be mapped to its solid component/i, key: "error.edgeNotMapped" },
  { pattern: /Prepare an object before previewing/i, key: "error.prepareFirst" },
  { pattern: /isValid is not a function/i, key: "edge.errorKernelFailed" },
  { pattern: /CAD kernel needs WebAssembly SIMD/i, key: "error.kernelNeedsSimd" },
  // The browser has no room left for a step on a very large design: the allocation of a big buffer fails (#383).
  { pattern: /Array buffer allocation failed|Invalid array length|Invalid typed array length|Out of memory|Cannot allocate memory|allocation failed/i, key: "error.outOfMemory" },
  { pattern: /does not leave a closed solid/i, key: "edge.errorNoSolidResult" },
  { pattern: /stored STEP body holds no solid/i, key: "error.storedStepNoSolid" },
  { pattern: /Text fonts are not loaded yet/i, key: "error.fontsNotLoaded" },
  // sketch
  { pattern: /Draw at least one closed profile on the left side/i, key: "error.revolveNoProfile" },
  { pattern: /revolve profile has no filled area/i, key: "error.revolveNoArea" },
  { pattern: /profile could not be revolved into a valid solid/i, key: "error.revolveNotValid" },
  { pattern: /All profile paths are open/i, key: "error.sketchOpenPaths" },
  // SVG import and export
  { pattern: /SVG file is empty/i, key: "error.svgEmpty" },
  { pattern: /SVG is too large\. The maximum supported size is ([\d.]+) MB/i, key: "error.svgTooLarge", values: (m) => ({ size: m[1] }) },
  { pattern: /SVG entities are not supported|plain SVG document type/i, key: "error.svgEntities" },
  { pattern: /SVG contains invalid NaN geometry/i, key: "error.svgNaN" },
  { pattern: /SVG is too complex|SVG has too many/i, key: "error.svgTooComplex" },
  { pattern: /SVG external references/i, key: "error.svgExternal" },
  { pattern: /SVG embedded pictures are not drawings/i, key: "error.svgPicture" },
  // pictures traced as an outline (#359)
  { pattern: /The picture could not be read/i, key: "error.pictureUnreadable" },
  { pattern: /The picture has no shape to trace/i, key: "error.pictureEmpty" },
  { pattern: /SVG contains only open strokes/i, key: "error.svgOpenStrokes" },
  { pattern: /SVG has no (readable|filled)/i, key: "error.svgNoPaths" },
  { pattern: /SVG is not valid XML/i, key: "error.svgInvalidXml" },
  { pattern: /Mesh does not contain complete triangles|Mesh contains non-finite/i, key: "error.meshBroken" },
  { pattern: /is too complex \(\d+ triangles/i, key: "error.meshTooComplex" },
  { pattern: /contains \d+ zero-area triangle/i, key: "error.meshDegenerate" },
  { pattern: /is not a watertight manifold/i, key: "error.meshNotWatertight" },
  { pattern: /does not enclose a non-zero volume/i, key: "error.meshNoVolume" },
  { pattern: /SVG projection (contains no readable contours|does not enclose)/i, key: "error.svgProjectionEmpty" },
  // OBJ, STL, 3MF, STEP import
  { pattern: /^OBJ (has no readable mesh geometry|geometry is empty)/i, key: "error.objEmpty" },
  { pattern: /^OBJ /i, key: "error.objBroken" },
  { pattern: /^STL (has no readable geometry|geometry is empty)/i, key: "error.stlEmpty" },
  { pattern: /3MF file could not be unzipped/i, key: "error.threemfUnzip" },
  { pattern: /3MF file (does not contain|contains no readable)/i, key: "error.threemfEmpty" },
  { pattern: /^3MF /i, key: "error.threemfBroken" },
  { pattern: /Could not read STEP/i, key: "error.stepRead" },
  { pattern: /STEP file has no solid geometry/i, key: "error.stepNoSolid" },
  { pattern: /STEP export failed/i, key: "error.stepExport" },
  { pattern: /STL export exceeds/i, key: "error.stlExportLimit" },
  { pattern: /3MF export needs at least one body/i, key: "error.threemfExportEmpty" },
  { pattern: /Unsupported project asset type/i, key: "error.projectAssetType" },
  // my shapes and storage
  { pattern: /This browser keeps no local database/i, key: "error.noLocalDatabase" },
  { pattern: /Could not open the shape library/i, key: "error.libraryOpen" },
  { pattern: /shape library is busy in another tab/i, key: "error.libraryBusy" },
  { pattern: /shape library could not be written/i, key: "error.libraryWrite" },
  { pattern: /shape is no longer in the library/i, key: "error.libraryMissing" },
  { pattern: /Could not save the shape on the server/i, key: "error.serverShapeSave" },
  { pattern: /Project shape storage is unavailable|Could not (open|load|save|delete) project shape/i, key: "error.projectStorage" },
  // the server: the shared project store and thumbnails
  { pattern: /^The shared folder ([\s\S]+?) from (\S+) cannot be created \(([\s\S]*)\)\. Mount/, key: "error.storeFolderCreate", values: (m) => ({ folder: m[1], setting: m[2], reason: m[3] }) },
  { pattern: /That folder name is not allowed/i, key: "error.folderNameNotAllowed" },
  { pattern: /That folder is not allowed/i, key: "error.folderNotAllowed" },
  { pattern: /That folder is not on the server/i, key: "error.folderNotOnServer" },
  { pattern: /A folder of that name is already there/i, key: "error.folderExists" },
  { pattern: /That folder is already called that/i, key: "error.folderSameName" },
  { pattern: /That folder is not empty/i, key: "error.folderNotEmpty" },
  { pattern: /store folder itself cannot be renamed/i, key: "error.storeFolderRename" },
  { pattern: /store folder itself cannot be removed/i, key: "error.storeFolderRemove" },
  { pattern: /custom shapes folder cannot be renamed/i, key: "error.shapesFolderRename" },
  { pattern: /custom shapes folder cannot be removed/i, key: "error.shapesFolderRemove" },
  { pattern: /cannot list all of its designs/i, key: "error.serverListAll" },
  { pattern: /currently being changed by someone else/i, key: "error.sharedBusy" },
  { pattern: /Shared project was not found/i, key: "error.sharedNotFound" },
  { pattern: /Invalid shared project name/i, key: "error.sharedNameInvalid" },
  { pattern: /Shared project name is required/i, key: "error.sharedNameRequired" },
  { pattern: /A project of that name is already in that folder/i, key: "error.sharedNameTaken" },
  { pattern: /That project is already in this folder/i, key: "error.sharedAlreadyHere" },
  { pattern: /copy needs a name of its own/i, key: "error.sharedCopyName" },
  { pattern: /Reload shared projects before/i, key: "error.sharedReloadFirst" },
  { pattern: /shared project changed after you loaded it/i, key: "error.sharedChanged" },
  { pattern: /shared project changed after you opened it/i, key: "error.sharedChangedSave" },
  { pattern: /shared project no longer exists/i, key: "error.sharedGone" },
  { pattern: /Shared project storage is disabled/i, key: "error.sharedDisabled" },
  { pattern: /Shared projects only accept same-origin/i, key: "error.sharedSameOrigin" },
  { pattern: /exceeds the shared storage size limit/i, key: "error.sharedTooLarge" },
  { pattern: /Shared project (upload is missing|thumbnail (exceeds|must be))/i, key: "error.sharedUpload" },
  { pattern: /Could not read shared projects/i, key: "error.sharedFailRead" },
  { pattern: /Could not delete shared project/i, key: "error.sharedFailDelete" },
  { pattern: /Could not save shared project/i, key: "error.sharedFailSave" },
  { pattern: /Could not download shared project/i, key: "error.sharedFailDownload" },
  { pattern: /Invalid (thumbnail|project id)/i, key: "error.thumbnailInvalid" },
  { pattern: /Thumbnail image is too large/i, key: "error.thumbnailTooLarge" },
  { pattern: /Project thumbnails require a same-origin/i, key: "error.thumbnailSameOrigin" },
  { pattern: /Could not save (project )?thumbnail/i, key: "error.thumbnailSave" },
];

const GERMAN_HINT = /\b(der|die|das|dem|den|nicht|und|ein|eine|einen|wurde|konnte|bitte|keine|kein|wird|ist|mit|für)\b|[äöüß]/i;
const ENGLISH_HINT = /\b(the|is|are|not|could|cannot|must|has|have|no|contains|invalid|failed|unable|file|too|was|were|to|of|and|or|missing|unexpected)\b/i;

const ENGLISH_WORDS = new RegExp(ENGLISH_HINT.source, "gi");

/**
 * Whether a text reads as English: plain ASCII with at least two of the usual English words. For
 * the languages that have no word list of their own here; a text in a language with its own
 * letters is never taken for English, and one that already is an interface sentence is not
 * wrapped again.
 */
export function looksEnglish(text: string): boolean {
  if (/[^\x00-\x7F]/.test(text)) return false;
  return new Set((text.match(ENGLISH_WORDS) ?? []).map((word) => word.toLowerCase())).size >= 2;
}

/** A message for a person: known texts come from the message tables, unknown English ones get a sentence around them. */
export function localizedError(raw: string): string {
  const text = String(raw ?? "").trim();
  if (!text) return text;
  for (const rule of ERROR_RULES) {
    const match = text.match(rule.pattern);
    if (match) return t(rule.key, rule.values?.(match));
  }
  const language = getLanguage();
  if (language === "de") {
    if (ENGLISH_HINT.test(text) && !GERMAN_HINT.test(text)) return t("error.unknown", { detail: text });
  } else if (language !== "en" && looksEnglish(text) && !isInterfaceSentence(text, language)) {
    // Any other language: a raw English text still gets a sentence in the person's language around it.
    return t("error.unknown", { detail: text });
  }
  return text;
}
