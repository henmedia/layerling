"use client";

import { Fragment, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ChevronDown, ChevronRight, Search, X } from "lucide-react";
import { t } from "@/lib/i18n";
import {
  RECENT_SHAPES_EVENT,
  SHAPE_LIBRARY_SECTION_LABELS,
  readClosedSections,
  readRecentShapes,
  searchShapeLibrary,
  shapeLibrarySections,
  storeClosedSections,
  type LibraryShape,
  type ShapeLibrarySectionId,
} from "@/lib/shapeLibrarySections";
import { useLanguage } from "@/lib/useLanguage";

/**
 * The shape library in sections (#1170), in the one scrolling list it always was: a search field on top, the shapes
 * put in last, then each section with its count, open the first time; what is folded by hand stays folded. While
 * searching only the sections with a match show, open, each with how many of its shapes match; clearing the search
 * brings the folded sections back as they were. The tiles themselves (click, drag, touch) come from the toolbar.
 */
export function ShapeLibraryList<T extends LibraryShape>({
  shapes,
  label,
  renderTile,
  customShapes = null,
}: {
  /** The shapes the library offers, in the catalogue's order. */
  shapes: readonly T[];
  /** A shape's name in the current language, as its tile shows it. */
  label: (shape: T) => string;
  renderTile: (shape: T) => ReactNode;
  /** The custom shapes' section, above the library's; left out while searching. */
  customShapes?: ReactNode;
}) {
  useLanguage();
  const [query, setQuery] = useState("");
  const [closed, setClosed] = useState<ShapeLibrarySectionId[]>(() => (typeof window === "undefined" ? [] : readClosedSections()));
  const [recentIds, setRecentIds] = useState<string[]>(() => (typeof window === "undefined" ? [] : readRecentShapes()));

  // A pinned library stays open while shapes are put in: it shows each one under "Recently used" at once.
  useEffect(() => {
    const update = (event: Event) => setRecentIds((event as CustomEvent<string[]>).detail ?? readRecentShapes());
    window.addEventListener(RECENT_SHAPES_EVENT, update);
    return () => window.removeEventListener(RECENT_SHAPES_EVENT, update);
  }, []);

  // Ready to type into the search when the library opens, as the command search and the shortcuts are (Discussion #1276) -
  // except on a touch screen, where focusing it would pop up the keyboard. A pinned library stays mounted, so this is once per opening.
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const touch = typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
    if (!touch) searchRef.current?.focus({ preventScroll: true });
  }, []);

  const sections = useMemo(() => shapeLibrarySections(shapes), [shapes]);
  const sectionLabel = (id: ShapeLibrarySectionId) => t(SHAPE_LIBRARY_SECTION_LABELS[id]);
  const searching = query.trim().length > 0;
  const matches = searching ? searchShapeLibrary(sections, query, label) : null;
  const byId = new Map(shapes.map((shape) => [shape.id, shape]));
  const recent = recentIds.flatMap((id) => byId.get(id) ?? []);

  const toggle = (id: ShapeLibrarySectionId) => {
    setClosed((current) => {
      const next = current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id];
      storeClosedSections(next);
      return next;
    });
  };

  const onSearchKey = (event: KeyboardEvent<HTMLInputElement>) => {
    // Escape empties the search first; with nothing typed it goes on and closes the library as before.
    if (event.key === "Escape" && query) {
      event.preventDefault();
      event.stopPropagation();
      setQuery("");
    }
  };

  const grid = (list: readonly T[]) => <div className="shape-menu-list">{list.map((shape) => <Fragment key={shape.id}>{renderTile(shape)}</Fragment>)}</div>;
  const note = (id: ShapeLibrarySectionId) => (id === "helpers" ? <p className="shape-library-note">{t("library.helpersNote")}</p> : null);

  return (
    <div className="shape-library">
      <div className="shape-library-search" role="search">
        <Search aria-hidden="true" />
        <input
          ref={searchRef}
          type="search"
          value={query}
          placeholder={t("library.search")}
          aria-label={t("library.search")}
          autoComplete="off"
          spellCheck={false}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onSearchKey}
        />
        {query ? (
          <button type="button" className="shape-library-clear" aria-label={t("library.clearSearch")} title={t("library.clearSearch")} onClick={() => setQuery("")}>
            <X aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {matches ? (
        matches.length === 0 ? (
          <p className="shape-library-empty" role="status">{t("library.noMatch")}</p>
        ) : (
          matches.map((section) => (
            <section key={section.id} className="shape-library-section" aria-label={sectionLabel(section.id)}>
              <div className="shape-library-heading">
                <span>{sectionLabel(section.id)}</span>
                <span className="shape-library-count">{t("library.countOf", { shown: section.shapes.length, total: section.total })}</span>
              </div>
              {note(section.id)}
              {grid(section.shapes)}
            </section>
          ))
        )
      ) : (
        <>
          {customShapes}
          {recent.length > 0 ? (
            <section className="shape-library-section shape-library-recent" aria-label={t("library.recent")}>
              <div className="shape-library-heading">
                <span>{t("library.recent")}</span>
              </div>
              {grid(recent)}
            </section>
          ) : null}
          {sections.map((section) => {
            const open = !closed.includes(section.id);
            const id = `shape-library-section-${section.id}`;
            return (
              <section key={section.id} className="shape-library-section" aria-label={sectionLabel(section.id)}>
                <button type="button" className="shape-library-toggle" aria-expanded={open} aria-controls={id} onClick={() => toggle(section.id)}>
                  {open ? <ChevronDown aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
                  <span>{sectionLabel(section.id)}</span>
                  <span className="shape-library-count">{section.shapes.length}</span>
                </button>
                {open ? <div id={id}>{note(section.id)}{grid(section.shapes)}</div> : null}
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}
