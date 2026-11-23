export type ProjectExportFormat = "stl" | "3mf" | "obj" | "step" | "svg" | "dxf" | "pdf" | "png" | "lyl" | "zip";

export function projectExportFileName(projectName: string, format: ProjectExportFormat) {
  const safeProjectName = projectName
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/[. ]+$/g, "")
    .slice(0, 120);
  return `${safeProjectName || "layerling design"}.${format}`;
}

/** Whether a design's name is still one the start page gave it: "Untitled design {number}" in the language shown. */
export function isUntitledName(projectName: string, pattern: string) {
  const [before, after = ""] = pattern.split("{number}");
  const name = projectName.trim();
  return name.startsWith(before) && name.endsWith(after) && /^\d+$/.test(name.slice(before.length, name.length - after.length));
}

/**
 * The name the export window suggests while one build plate is chosen (Discussion #1860): the plate's own
 * name, so the files of two plates do not start out under the same name; a plate without a name is the
 * design's name with "Plate 2" behind it, as "One file per plate" calls its files.
 */
export function plateExportName(projectName: string, plateLabel: string, plateName: string) {
  const own = plateName.trim();
  if (own) return own;
  const design = projectName.trim();
  return design ? `${design} - ${plateLabel}` : plateLabel;
}

/**
 * The name the export window starts with: a chosen build plate's own name first, then the own name of the one
 * body that is exported, then the chosen plate without a name as "Design - Plate 2", else the design's name.
 * A body that is all there is in the design (`wholeDesign`) goes under the design's name, so a renamed design
 * is exported under its new name (Discussion #2001); while the design has no name yet, the body's name stays.
 */
export function suggestedExportName(
  projectName: string,
  ownObjectName: string | null,
  plate: { label: string; name: string } | null,
  wholeDesign: { untitled: boolean } | null = null,
) {
  if (plate?.name.trim()) return plateExportName(projectName, plate.label, plate.name);
  if (ownObjectName && !(wholeDesign && !wholeDesign.untitled && projectName.trim())) return ownObjectName;
  return plate ? plateExportName(projectName, plate.label, "") : projectName;
}

/**
 * Whether the name typed in the export window asks for a file of its own although the design is
 * linked to an STL file already. Without this the name field did nothing once the first STL had
 * been saved: every later export went into the linked file, whatever was typed (a model and its
 * liner exported one after the other ended up in the same file - reported by mail, 15.10.2026). The name the window starts
 * with, the project name, and the name of the linked file itself keep writing into the link.
 */
export function stlNameAsksForNewFile(typedName: string, projectName: string, linkedFileName: string | null | undefined) {
  if (!linkedFileName) return false;
  const fileOf = (name: string) => projectExportFileName(name.trim().replace(/\.stl$/i, ""), "stl").toLowerCase();
  const typed = fileOf(typedName);
  return typed !== fileOf(projectName) && typed !== linkedFileName.toLowerCase();
}
