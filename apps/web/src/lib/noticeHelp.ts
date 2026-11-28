import type { GuideSection } from "@/lib/guideLinks";
import { getLanguage, translate, type Language, type MessageKey } from "@/lib/i18n";

/**
 * Messages of the program that the FAQ in the guide has an answer for, by the answer they lead to. A message is told
 * by its text, in the language it was written in: the places that show one hold the finished sentence, often with a
 * name or a number filled in or wrapped into another sentence, not the key it came from.
 */
const NOTICE_HELP: ReadonlyArray<{ section: GuideSection; keys: readonly MessageKey[] }> = [
  { section: "faqHistoryShorter", keys: ["notice.projectHistoryTrimmed", "status.savedWithLessHistory"] },
  { section: "faqStorageFull", keys: ["error.storageFull"] },
  { section: "faqTooLarge", keys: ["error.projectTooLarge"] },
  { section: "faqOutOfMemory", keys: ["error.outOfMemory"] },
  { section: "faqOpensSlowly", keys: ["notice.projectShapesLoadFailed", "notice.openWithoutHistoryFailed"] },
  { section: "faqStandsStill", keys: ["edge.errorKernelRestart", "status.edgeKernelReopened", "shell.errorTooSlow"] },
  { section: "faqGroupingFails", keys: ["status.groupCutOpen", "status.groupNotMerged"] },
  {
    section: "faqCutFails",
    keys: ["status.cutOpenPart", "status.cutNotClean", "status.cutNotWatertightTooComplex", "status.cutLeftOpen", "status.holesTooLarge", "error.meshNotWatertight"],
  },
  {
    section: "faqFilletFails",
    keys: [
      "status.edgeWouldOpen",
      "status.edgeLargestNone",
      "edge.errorOverlappingGeometry",
      "edge.errorFilletTogether",
      "edge.errorChamferTogether",
      "edge.errorTightBend",
      "edge.errorLostFaces",
      "edge.errorNoSolidResult",
    ],
  },
  { section: "faqEdgesOfImports", keys: ["status.meshTooDense", "edge.errorMeshNotSolid"] },
  { section: "faqFilletsAfterSketch", keys: ["status.sketchUpdatedEdgesSkipped"] },
  { section: "faqPrinterFit", keys: ["status.bedOverhangOne", "status.bedOverhangMany"] },
];

/** A sentence shorter than this could turn up inside an unrelated message. */
const SHORTEST_PATTERN = 16;

type Pattern = { section: GuideSection; pattern: RegExp };
const patternsByLanguage = new Map<Language, Pattern[]>();

/** The sentence of a key as a pattern: its fixed words, with anything in the place of a {name} or {count}. */
function sentencePattern(template: string): RegExp | null {
  const fixed = template.split(/\{\w+\}/);
  if (fixed.join("").trim().length < SHORTEST_PATTERN) return null;
  return new RegExp(fixed.map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("[\\s\\S]*?"));
}

function patternsFor(language: Language): Pattern[] {
  const known = patternsByLanguage.get(language);
  if (known) return known;
  const patterns = NOTICE_HELP.flatMap(({ section, keys }) =>
    keys.flatMap((key) => {
      const pattern = sentencePattern(translate(language, key));
      return pattern ? [{ section, pattern }] : [];
    }),
  );
  patternsByLanguage.set(language, patterns);
  return patterns;
}

/** The answer in the guide's FAQ that a message of the program leads to, or null when it has none. */
export function noticeHelpSection(message: string | null | undefined, language: Language = getLanguage()): GuideSection | null {
  if (!message) return null;
  return patternsFor(language).find(({ pattern }) => pattern.test(message))?.section ?? null;
}

/** Every key with an answer, for the test that holds this list against the catalogue and the guide. */
export const NOTICE_HELP_KEYS: ReadonlyArray<{ section: GuideSection; key: MessageKey }> = NOTICE_HELP.flatMap(({ section, keys }) =>
  keys.map((key) => ({ section, key })),
);
