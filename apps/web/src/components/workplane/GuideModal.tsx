"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { t, type MessageKey } from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";

/**
 * The short version of the manual, in the same shell as the shortcut list:
 * where a thing sits in the ribbon and what it does, in one sentence each.
 * Anything longer belongs in the README, not in front of someone who is
 * halfway through a design.
 */
type GuideSection = { title: MessageKey; lines: MessageKey[] };

/**
 * The last line of the file section depends on the installation: where a shared
 * folder exists it says how to use it, and where none does it says how to make
 * one. Nobody is told about a button that is not there.
 */
function guideSections(sharedStore: boolean): GuideSection[] {
  return [
    {
      title: "guide.group.view",
      lines: ["guide.view.orbit", "guide.view.touch", "guide.view.cube", "guide.view.projection"],
    },
    {
      title: "guide.group.workplane",
      lines: ["guide.workplane.place", "guide.workplane.reset", "guide.workplane.grid"],
    },
    {
      title: "guide.group.shapes",
      lines: ["guide.shapes.add", "guide.shapes.inspector", "guide.shapes.handles"],
    },
    {
      title: "guide.group.select",
      lines: ["guide.select.click", "guide.select.group", "guide.select.align", "guide.select.notes"],
    },
    {
      title: "guide.group.measure",
      lines: ["guide.measure.tape", "guide.measure.cornerRuler", "guide.measure.ruler"],
    },
    {
      title: "guide.group.solid",
      lines: ["guide.solid.modes", "guide.solid.group", "guide.solid.intersect"],
    },
    {
      title: "guide.group.edges",
      lines: ["guide.edges.pick", "guide.edges.apply", "guide.edges.undo"],
    },
    {
      title: "guide.group.sketch",
      lines: ["guide.sketch.start", "guide.sketch.draw", "guide.sketch.image"],
    },
    {
      title: "guide.group.files",
      lines: [
        "guide.files.autosave",
        "guide.files.project",
        "guide.files.export",
        "guide.files.import",
        sharedStore ? "guide.files.storeOn" : "guide.files.storeOff",
      ],
    },
    {
      title: "guide.group.settings",
      lines: ["guide.settings.workspace", "guide.settings.language"],
    },
  ];
}

export function GuideModal({ onClose, sharedStore = false }: { onClose: () => void; sharedStore?: boolean }) {
  useLanguage();
  const sections = guideSections(sharedStore);
  const cardRef = useRef<HTMLDivElement | null>(null);

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
      <div className="workspace-modal-card shortcuts-modal-card" ref={cardRef} tabIndex={-1} onPointerDown={(event) => event.stopPropagation()}>
        <header className="workspace-modal-header">
          <strong>{t("guide.title")}</strong>
          <button aria-label={t("guide.close")} onClick={onClose}>
            <X size={18} />
          </button>
        </header>
        <div className="workspace-modal-content">
          <div className="workspace-modal-body shortcuts-modal-body">
            <p className="shortcuts-intro">{t("guide.intro")}</p>
            <div className="shortcuts-groups">
              {sections.map((section) => (
                <section className="shortcuts-group guide-section" key={section.title}>
                  <h3>{t(section.title)}</h3>
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
          </div>
        </div>
      </div>
      <button className="workspace-modal-backdrop" aria-label={t("guide.close")} onClick={onClose} />
    </div>
  );
}
