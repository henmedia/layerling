import type { MessageKey } from "@/lib/i18n";
import { LAYERLING_VIDEOS } from "@/lib/layerlingVideos";

type Translate = (key: MessageKey) => string;

const STEPS = [
  ["welcome.step1Title", "welcome.step1Body"],
  ["welcome.step2Title", "welcome.step2Body"],
  ["welcome.step3Title", "welcome.step3Body"],
  ["welcome.step4Title", "welcome.step4Body"],
] as const satisfies ReadonlyArray<readonly [MessageKey, MessageKey]>;

/**
 * Everything beyond the first steps. New features belong here, in both
 * languages - the same text is what search engines read (see StaticIntro).
 */
const MORE = [
  ["welcome.moreHollowTitle", "welcome.moreHollowBody"],
  ["welcome.moreDeleteFaceTitle", "welcome.moreDeleteFaceBody"],
  ["welcome.moreSplitTitle", "welcome.moreSplitBody"],
  ["welcome.moreHullTitle", "welcome.moreHullBody"],
  ["welcome.moreCookieCutterTitle", "welcome.moreCookieCutterBody"],
  ["welcome.moreFlexiTitle", "welcome.moreFlexiBody"],
  ["welcome.moreLidTitle", "welcome.moreLidBody"],
  ["welcome.moreLoftSketchesTitle", "welcome.moreLoftSketchesBody"],
  ["welcome.moreSketchTitle", "welcome.moreSketchBody"],
  ["welcome.moreLibraryTitle", "welcome.moreLibraryBody"],
  ["welcome.morePatternTitle", "welcome.morePatternBody"],
  ["welcome.moreHolePatternTitle", "welcome.moreHolePatternBody"],
  ["welcome.moreOffsetTitle", "welcome.moreOffsetBody"],
  ["welcome.moreTextureTitle", "welcome.moreTextureBody"],
  ["welcome.moreVaseTitle", "welcome.moreVaseBody"],
  ["welcome.moreBundleTitle", "welcome.moreBundleBody"],
  ["welcome.moreWorkplaneTitle", "welcome.moreWorkplaneBody"],
  ["welcome.morePlaceTitle", "welcome.morePlaceBody"],
  ["welcome.moreSnapTitle", "welcome.moreSnapBody"],
  ["welcome.moreGridTitle", "welcome.moreGridBody"],
  ["welcome.moreWindowsTitle", "welcome.moreWindowsBody"],
  ["welcome.morePivotTitle", "welcome.morePivotBody"],
  ["welcome.moreLayFlatTitle", "welcome.moreLayFlatBody"],
  ["welcome.moreMeasureTitle", "welcome.moreMeasureBody"],
  ["welcome.moreAttachmentsTitle", "welcome.moreAttachmentsBody"],
  ["welcome.moreSaveTitle", "welcome.moreSaveBody"],
  ["welcome.moreBackupTitle", "welcome.moreBackupBody"],
  ["welcome.morePrintersTitle", "welcome.morePrintersBody"],
  ["welcome.moreImportTitle", "welcome.moreImportBody"],
  ["welcome.moreLanguagesTitle", "welcome.moreLanguagesBody"],
  ["welcome.moreOfflineTitle", "welcome.moreOfflineBody"],
  ["welcome.moreAiTitle", "welcome.moreAiBody"],
  ["welcome.morePointsTitle", "welcome.morePointsBody"],
  ["welcome.moreSearchTitle", "welcome.moreSearchBody"],
  ["welcome.moreSimplifyTitle", "welcome.moreSimplifyBody"],
  ["welcome.moreHistoryTitle", "welcome.moreHistoryBody"],
  ["welcome.moreDrawingTitle", "welcome.moreDrawingBody"],
  ["welcome.moreLookTitle", "welcome.moreLookBody"],
  ["welcome.moreControlsTitle", "welcome.moreControlsBody"],
] as const satisfies ReadonlyArray<readonly [MessageKey, MessageKey]>;

/** What andere Programme cannot do: the short list that follows the switch note. */
const GAPS = [
  "welcome.gap1",
  "welcome.gap2",
  "welcome.gap3",
  "welcome.gap4",
  "welcome.gap5",
  "welcome.gap6",
  "welcome.gap7",
  "welcome.gap8",
] as const satisfies ReadonlyArray<MessageKey>;

/** A bookmark by a member of the community that turns a Tinkercad design into a .lyl file; not part of layerling. */
const TINKERCAD_IMPORTER_URL = "https://taylormadearmy.github.io/tinkercad-layerling-importer/";

/** The body of the welcome panel on the start page. */
export function WelcomeGuideBody({ tr, offline = true }: { tr: Translate; offline?: boolean }) {
  // Where no service worker can run (the Docker image, a plain-http address) the page must not promise "works offline" (#571).
  const more = MORE.filter(([title]) => offline || title !== "welcome.moreOfflineTitle");
  return (
    <>
      <p>{tr("welcome.lead")}</p>
      <p className="dashboard-welcome-switch">
        <strong>{tr("welcome.switchTitle")}</strong> {tr("welcome.switchBody")} {tr("welcome.switchImport")}{" "}
        <a href={TINKERCAD_IMPORTER_URL} target="_blank" rel="noopener noreferrer">
          {tr("welcome.switchImportLink")}
        </a>
      </p>
      <div className="dashboard-welcome-more">
        <h3>{tr("welcome.gapTitle")}</h3>
        <ul>
          {GAPS.map((key) => (
            <li key={key}>{tr(key)}</li>
          ))}
        </ul>
      </div>
      <ol>
        {STEPS.map(([title, body]) => (
          <li key={title}>
            <strong>{tr(title)}</strong>
            <span>{tr(body)}</span>
          </li>
        ))}
      </ol>
      <div className="dashboard-welcome-more">
        <h3>{tr("welcome.moreTitle")}</h3>
        <ul>
          {more.map(([title, body]) => (
            <li key={title}>
              <strong>{tr(title)}:</strong> {tr(body)}
            </li>
          ))}
        </ul>
      </div>
      <div className="dashboard-welcome-more dashboard-welcome-videos">
        <h3>{tr("welcome.videosTitle")}</h3>
        <ul>
          {LAYERLING_VIDEOS.map((video) => (
            <li key={video.url}>
              <a href={video.url} target="_blank" rel="noopener noreferrer">
                {video.title}
              </a>{" "}
              <span className="dashboard-welcome-video-meta">
                {video.channel} · {video.lang}
              </span>
            </li>
          ))}
        </ul>
        <p className="dashboard-welcome-help">{tr("welcome.videosHint")}</p>
      </div>
      <div className="dashboard-welcome-more">
        <h3>{tr("welcome.localTitle")}</h3>
        <p>{tr("welcome.localBody")}</p>
      </div>
      <p className="dashboard-welcome-help">{tr("welcome.help")}</p>
      <a className="dashboard-welcome-guide-link" href={tr("welcome.guideUrl")}>
        {tr("welcome.guideLink")}
        <span aria-hidden="true">&rarr;</span>
      </a>
    </>
  );
}
