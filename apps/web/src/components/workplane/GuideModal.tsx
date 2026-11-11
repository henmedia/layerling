"use client";

import { GuideHelpLink } from "@/components/GuideHelpLink";
import { X } from "lucide-react";
import { useEffect } from "react";
import { useMovablePanel } from "@/lib/useMovablePanel";
import { guideHref, type GuideChapter } from "@/lib/guideLinks";
import { t, type MessageKey } from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";
import { LAYERLING_VIDEOS } from "@/lib/layerlingVideos";

/**
 * The short version of the manual, in the same shell as the shortcut list:
 * where a thing sits in the ribbon and what it does, in one sentence each.
 * Anything longer belongs in the README, not in front of someone who is
 * halfway through a design.
 */
type GuideSection = { title: MessageKey; lines: MessageKey[]; chapter: GuideChapter };

/**
 * The last line of the file section depends on the installation: where a shared
 * folder exists it says how to use it, and where none does it says how to make
 * one. Nobody is told about a button that is not there.
 */
function guideSections(sharedStore: boolean): GuideSection[] {
  return [
    {
      title: "guide.group.view",
      chapter: "view",
      lines: ["guide.view.orbit", "guide.view.touch", "guide.view.cube", "guide.view.projection", "guide.view.section", "guide.view.panels"],
    },
    {
      title: "guide.group.workplane",
      chapter: "view",
      lines: ["guide.workplane.place", "guide.workplane.reset", "guide.workplane.hide", "guide.workplane.grid"],
    },
    {
      title: "guide.group.shapes",
      chapter: "shapes",
      lines: ["guide.shapes.add", "guide.shapes.text", "guide.shapes.stencilBridges","guide.shapes.inspector", "guide.shapes.handles", "guide.shapes.wrap", "guide.shapes.myShapes"],
    },
    {
      title: "guide.group.select",
      chapter: "select",
      lines: ["guide.select.click", "guide.select.position", "guide.select.group", "guide.select.align", "guide.select.pivot", "guide.select.layFlat", "guide.select.carry", "guide.select.mateFaces", "guide.select.matePoint", "guide.select.holePattern", "guide.select.faceTool", "guide.select.supportRib", "guide.select.overhangs", "guide.select.pattern", "guide.select.notes", "guide.select.history"],
    },
    {
      title: "guide.group.measure",
      chapter: "measuring",
      lines: ["guide.measure.tape", "guide.measure.cornerRuler", "guide.measure.protractor", "guide.measure.ruler"],
    },
    {
      title: "guide.group.solid",
      chapter: "solids",
      lines: ["guide.solid.modes", "guide.solid.group", "guide.solid.intersect", "guide.solid.edit", "guide.solid.split"],
    },
    {
      title: "guide.group.edges",
      chapter: "edges",
      lines: ["guide.edges.pick", "guide.edges.apply", "guide.edges.undo", "guide.edges.hollow", "guide.edges.offset", "guide.edges.deleteFace"],
    },
    {
      title: "guide.group.sketch",
      chapter: "sketches",
      lines: ["guide.sketch.start", "guide.sketch.draw", "guide.sketch.construction", "guide.sketch.image"],
    },
    {
      title: "guide.group.files",
      chapter: "files",
      lines: [
        "guide.files.autosave",
        "guide.files.project",
        "guide.files.earlierVersions",
        "guide.files.export",
        "guide.files.import",
        "guide.files.bugReport",
        sharedStore ? "guide.files.storeOn" : "guide.files.storeOff",
      ],
    },
    {
      title: "guide.group.search",
      chapter: "shortcuts",
      lines: ["guide.search.palette", "guide.search.ownKeys"],
    },
    {
      title: "guide.group.settings",
      chapter: "view",
      lines: ["guide.settings.workspace", "guide.settings.language"],
    },
  ];
}

/** Sketch mode has its own tools and keys, so it gets its own short version. */
function sketchGuideSections(): GuideSection[] {
  return [
    {
      title: "guide.sketchGroup.draw",
      chapter: "sketches",
      lines: ["guide.sketch.start", "guide.sketch.draw", "guide.sketchDraw.close", "guide.sketch.construction"],
    },
    {
      title: "guide.sketchGroup.edit",
      chapter: "sketches",
      lines: ["guide.sketchEdit.select", "guide.sketchEdit.corner", "guide.sketch.image"],
    },
    {
      title: "guide.sketchGroup.clipboard",
      chapter: "sketches",
      lines: ["guide.sketchClipboard.use"],
    },
    {
      title: "guide.sketchGroup.view",
      chapter: "sketches",
      lines: ["guide.sketchView.zoom", "guide.sketchView.measure"],
    },
    {
      title: "guide.sketchGroup.finish",
      chapter: "sketches",
      lines: ["guide.sketchFinish.body", "guide.sketchFinish.edit"],
    },
  ];
}

export function GuideModal({ onClose, sharedStore = false, sketchMode = false }: { onClose: () => void; sharedStore?: boolean; sketchMode?: boolean }) {
  const language = useLanguage();
  const sections = sketchMode ? sketchGuideSections() : guideSections(sharedStore);
  // Moved by its title bar like every panel, and remembered where it stood.
  const movable = useMovablePanel<HTMLDivElement>("layerling.editor.guidePosition", { floatingStyle: { position: "absolute", margin: 0 } });
  const cardRef = movable.panelRef;

  useEffect(() => {
    cardRef.current?.focus();
  }, []);

  return (
    <div
      className="workspace-modal shortcuts-modal guide-modal"
      role="dialog"
      aria-modal="true"
      aria-label={t("guide.title")}
      // Editor and viewport both listen for keys on the window; while this is
      // open, reading about a tool must not also operate it.
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
        }
      }}
    >
      <div
        className={`workspace-modal-card shortcuts-modal-card ${movable.moved ? "floating" : ""} ${movable.dragging ? "moving" : ""}`}
        ref={cardRef}
        style={movable.style}
        tabIndex={-1}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <header className="workspace-modal-header movable" title={t("panel.moveHint")} {...movable.handleProps}>
          <strong>{t("guide.title")}</strong>
          <button aria-label={t("guide.close")} onClick={onClose}>
            <X size={18} />
          </button>
        </header>
        <div className="workspace-modal-content">
          <div className="workspace-modal-body shortcuts-modal-body">
            <div className="guide-videos">
              <strong>{t("guide.videos")}</strong>
              <ul>
                {LAYERLING_VIDEOS.map((video) => (
                  <li key={video.url}>
                    <a href={video.url} target="_blank" rel="noopener noreferrer">{video.title}</a> ({video.lang})
                  </li>
                ))}
              </ul>
            </div>
            <div className="shortcuts-groups">
              {sections.map((section) => (
                <section className="shortcuts-group guide-section" key={section.title}>
                  <h3>
                    {t(section.title)}
                    <GuideHelpLink chapter={section.chapter} />
                  </h3>
                  <ul>
                    {section.lines.map((line) => (
                      <li key={line}>{t(line)}</li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </div>
          <div className="workspace-modal-footer">
            <span>{t("guide.footer")}</span>
            <a className="guide-footer-link" href={guideHref(language)} target="_blank" rel="noreferrer">{t("guide.fullGuide")}</a>
          </div>
        </div>
      </div>
      <button className="workspace-modal-backdrop" aria-label={t("guide.close")} onClick={onClose} />
    </div>
  );
}
