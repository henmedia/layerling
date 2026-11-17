"use client";

import { Pencil } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { t } from "@/lib/i18n";

/**
 * The design's name, editable at any time: in the editor's title row, and in focus mode in the small bar over the view
 * (Discussion #1678), where the title row is hidden and a new design could not be named without leaving focus mode.
 * Enter or a click elsewhere keeps the new name, Esc goes back to the old one, an empty name is not taken.
 */
export function ProjectNameField({
  projectName,
  onProjectNameChange,
  className = "",
}: {
  projectName: string;
  onProjectNameChange?: (name: string) => void;
  className?: string;
}) {
  const fieldRef = useRef<HTMLLabelElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef(false);
  const [draft, setDraft] = useState(projectName);
  useEffect(() => {
    setDraft(projectName);
  }, [projectName]);
  // A click into the 3D view does not move the focus out of the field by itself (the view keeps the pointer), so the
  // name is finished on any press outside the field.
  useEffect(() => {
    const finishEdit = (event: PointerEvent) => {
      const input = inputRef.current;
      if (input && document.activeElement === input && !fieldRef.current?.contains(event.target as Node)) input.blur();
    };
    document.addEventListener("pointerdown", finishEdit, true);
    return () => document.removeEventListener("pointerdown", finishEdit, true);
  }, []);
  const commit = (value: string) => {
    const nextName = value.trim().slice(0, 80);
    if (!nextName) {
      setDraft(projectName);
      return;
    }
    setDraft(nextName);
    if (nextName !== projectName) onProjectNameChange?.(nextName);
  };
  return (
    <label ref={fieldRef} className={`toolbar-project-name-field ${className}`.trim()} title={t("editor.renameProject")}>
      <input
        ref={inputRef}
        aria-label={t("confirm.projectName")}
        value={draft}
        maxLength={80}
        spellCheck={false}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={(event) => {
          if (cancelRef.current) {
            cancelRef.current = false;
            setDraft(projectName);
            return;
          }
          commit(event.currentTarget.value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          if (event.key === "Escape") {
            cancelRef.current = true;
            event.currentTarget.blur();
          }
        }}
      />
      <Pencil size={13} strokeWidth={2.4} aria-hidden="true" />
    </label>
  );
}
