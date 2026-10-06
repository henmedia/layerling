import type { Language } from "@/lib/i18n";
import type { ShapeKind } from "@/types/layerling";

/**
 * One name in the guide. English is the rule; every other language may leave
 * its own out and be shown the English one, so a language is an addition its
 * maintainer keeps up rather than a gate every new name has to pass.
 */
type GuideText = { en: string; de?: string; ru?: string };

/** The name a language gave it, or the English one when it has none. */
function nameIn(entry: GuideText, language: Language): string {
  return entry[language] ?? entry.en;
}

/**
 * The chapters of the user guide (docs/guide) by what they are about, with the
 * file name each language gave them. The pages are static files next to the
 * program, so a link is a plain path. A test compares this table with the
 * chapters on disk - a chapter renamed there without a change here would leave
 * every question mark pointing nowhere.
 */
export const GUIDE_CHAPTERS = {
  start: { de: "erste-schritte", en: "getting-started", ru: "getting-started" },
  view: { de: "ansicht-und-arbeitsebene", en: "view-and-workplane", ru: "view-and-workplane" },
  shapes: { de: "formen", en: "shapes", ru: "shapes" },
  select: { de: "auswaehlen-und-anordnen", en: "select-and-arrange", ru: "select-and-arrange" },
  solids: { de: "koerper-und-aussparungen", en: "solids-and-holes", ru: "solids-and-holes" },
  edges: { de: "kanten-und-aushoehlen", en: "edges-and-hollowing", ru: "edges-and-hollowing" },
  sketches: { de: "skizzen", en: "sketches", ru: "sketches" },
  text: { de: "text", en: "text", ru: "text" },
  threads: { de: "gewinde-und-mechanik", en: "threads-and-mechanics", ru: "threads-and-mechanics" },
  measuring: { de: "messen-und-notizen", en: "measuring-and-notes", ru: "measuring-and-notes" },
  printing: { de: "drucken", en: "printing", ru: "printing" },
  files: { de: "dateien-und-speichern", en: "files-and-saving", ru: "files-and-saving" },
  shortcuts: { de: "tastenkuerzel", en: "shortcuts", ru: "shortcuts" },
  ai: { de: "ki-mit-mcp", en: "ai-with-mcp", ru: "ai-with-mcp" },
  offline: { de: "offline-und-installieren", en: "offline-and-install", ru: "offline-and-install" },
} as const satisfies Record<string, GuideText>;

export type GuideChapter = keyof typeof GUIDE_CHAPTERS;

/**
 * Sections inside a chapter that a question mark jumps to directly: the chapter
 * and the id each language's heading gets (slugify in build-guide.mjs). The
 * same test checks every id against the headings on disk.
 */
export const GUIDE_SECTIONS = {
  sectionView: { chapter: "view", de: "ins-innere-schauen-die-schnittansicht", en: "looking-inside-the-section-view", ru: "zaglyanut-vnutr-vid-v-razreze" },
  gridAndSnapping: { chapter: "view", de: "gitter-und-raster", en: "grid-and-snapping", ru: "setka-i-privyazka" },
  shapeSettings: { chapter: "shapes", de: "die-einstellungen-der-form", en: "the-shape-s-settings", ru: "nastroyki-figury" },
  wrapCylinder: { chapter: "shapes", de: "um-einen-zylinder-wickeln", en: "wrapping-around-a-cylinder", ru: "oborachivanie-vokrug-tsilindra" },
  myShapes: { chapter: "shapes", de: "eigene-formen", en: "custom-shapes", ru: "sobstvennye-figury" },
  objectList: { chapter: "select", de: "die-objektliste", en: "the-object-list", ru: "spisok-obektov" },
  pattern: { chapter: "select", de: "muster-reihe-und-kreis", en: "patterns-row-and-circle", ru: "massivy-ryad-i-krug" },
  grouping: { chapter: "solids", de: "gruppieren", en: "grouping", ru: "gruppirovka" },
  bundling: { chapter: "solids", de: "buendeln", en: "bundling", ru: "svyazka" },
  intersection: { chapter: "solids", de: "schnittmenge", en: "intersection", ru: "peresechenie" },
  splitting: { chapter: "solids", de: "teilen", en: "splitting", ru: "razrez" },
  edgeTreatment: { chapter: "edges", de: "kanten-fasen-und-verrunden", en: "chamfering-and-filleting-edges", ru: "faska-i-skruglenie-kromok" },
  hollowing: { chapter: "edges", de: "koerper-aushoehlen", en: "hollowing-bodies", ru: "vydolblivanie-tel" },
  threads: { chapter: "threads", de: "gewinde", en: "threads", ru: "rezba" },
  gears: { chapter: "threads", de: "zahnraeder", en: "gears", ru: "shesterni" },
  springs: { chapter: "threads", de: "federn", en: "springs", ru: "pruzhiny" },
  bentTubes: { chapter: "threads", de: "gebogene-rohre", en: "bent-tubes", ru: "izognutye-truby" },
  honeycomb: { chapter: "threads", de: "wabengitter", en: "honeycomb", ru: "soty" },
  hinge: { chapter: "threads", de: "scharnier", en: "hinge", ru: "petlya" },
  knurl: { chapter: "threads", de: "raendelung", en: "knurling", ru: "nakatka" },
  dovetail: { chapter: "threads", de: "schwalbenschwanz", en: "dovetail", ru: "lastochkin-khvost" },
  teardrop: { chapter: "threads", de: "tropfenbohrung", en: "teardrop-hole", ru: "kaplevidnoe-otverstie" },
  screwHoles: { chapter: "threads", de: "stufen-und-senkbohrung", en: "counterbore-and-countersink", ru: "tsekovka-i-zenkovka" },
  ruler: { chapter: "measuring", de: "das-lineal", en: "the-ruler", ru: "lineyka" },
  printer: { chapter: "printing", de: "den-drucker-waehlen", en: "choosing-your-printer", ru: "vybor-printera" },
  backingUp: { chapter: "files", de: "sichern-und-weitergeben", en: "backing-up-and-passing-on", ru: "rezervnye-kopii-i-peredacha" },
  exporting: { chapter: "files", de: "exportieren", en: "exporting", ru: "vygruzka" },
  importing: { chapter: "files", de: "importieren", en: "importing", ru: "import" },
  tapeMeasure: { chapter: "measuring", de: "das-massband", en: "the-tape-measure", ru: "ruletka" },
  notes: { chapter: "measuring", de: "notizen", en: "notes", ru: "zametki" },
  sketchCorners: { chapter: "sketches", de: "ecken-runden-oder-fasen", en: "rounding-or-chamfering-corners", ru: "skruglenie-i-faska-na-uglakh" },
  sketchImage: { chapter: "sketches", de: "ein-bild-als-vorlage", en: "a-picture-as-template", ru: "kartinka-kak-podlozhka" },
} as const satisfies Record<string, { chapter: GuideChapter } & GuideText>;

export type GuideSection = keyof typeof GUIDE_SECTIONS;

/** The file name a chapter has in one language, or the English one when it has none. */
export function chapterFile(language: Language, chapter: GuideChapter): string {
  return nameIn(GUIDE_CHAPTERS[chapter], language);
}

/** The heading id a section has in one language, or the English one when it has none. */
export function sectionId(language: Language, section: GuideSection): string {
  return nameIn(GUIDE_SECTIONS[section], language);
}

/**
 * The folder each language guide is written to by scripts/build-guide.mjs
 * (GUIDE_LANGUAGES there is the same table, a test keeps the two in step). The
 * pages are static, so a folder is all a link needs.
 */
export const GUIDE_DIRECTORIES: Record<Language, string> = {
  en: "guide",
  de: "anleitung",
  ru: "ru",
};

/** The address of a chapter or one of its sections, or of the guide's overview when neither is named. */
export function guideHref(language: Language, chapter?: GuideChapter, section?: GuideSection): string {
  const directory = GUIDE_DIRECTORIES[language];
  const page = section ? GUIDE_SECTIONS[section].chapter : chapter;
  if (!page) return `/${directory}/index.html`;
  const anchor = section ? `#${sectionId(language, section)}` : "";
  return `/${directory}/${chapterFile(language, page)}.html${anchor}`;
}

/**
 * Where in its chapter a shape is explained - the heading its question mark
 * jumps to. Text and sketches have a chapter of their own and open its top.
 */
export function guideSectionForShape(shape: { kind: ShapeKind; groupedShapes?: readonly unknown[]; groupOperation?: string }): GuideSection | undefined {
  if (shape.groupedShapes?.length) {
    if (shape.groupOperation === "bundle") return "bundling";
    if (shape.groupOperation === "intersection") return "intersection";
    return "grouping";
  }
  switch (shape.kind) {
    case "text":
    case "sketch":
    case "scribble":
      return undefined;
    case "thread":
      return "threads";
    case "gear":
      return "gears";
    case "spring":
      return "springs";
    case "bentTube":
      return "bentTubes";
    case "honeycomb":
      return "honeycomb";
    case "hinge":
      return "hinge";
    case "knurl":
      return "knurl";
    case "dovetail":
      return "dovetail";
    case "teardrop":
      return "teardrop";
    case "counterbore":
    case "countersink":
      return "screwHoles";
    case "ruler":
      return "ruler";
    default:
      return "shapeSettings";
  }
}

/** Which chapter explains a shape - the one its question mark opens. */
export function guideChapterForShape(shape: { kind: ShapeKind; groupedShapes?: readonly unknown[] }): GuideChapter {
  if (shape.groupedShapes?.length) return "solids";
  switch (shape.kind) {
    case "text":
      return "text";
    case "thread":
    case "spring":
    case "gear":
    case "bentTube":
    case "honeycomb":
    case "hinge":
    case "knurl":
    case "dovetail":
    case "teardrop":
    case "counterbore":
    case "countersink":
      return "threads";
    case "ruler":
      return "measuring";
    case "sketch":
    case "scribble":
      return "sketches";
    default:
      return "shapes";
  }
}
