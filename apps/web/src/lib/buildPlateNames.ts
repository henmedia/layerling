/** The most build plates a design holds (Discussion #456). */
export const MAX_BUILD_PLATES = 12;
/** The longest name a plate takes. */
export const MAX_PLATE_NAME_LENGTH = 60;

/**
 * The plates' names as a design keeps them, or undefined for a design with one plate and no name: at most
 * MAX_BUILD_PLATES, each a trimmed string, "" for a plate without a name of its own. Kept apart from
 * buildPlates.ts so the workplane settings can read it without the geometry behind the plates.
 */
export function normalizePlateNames(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const names = value.slice(0, MAX_BUILD_PLATES).map((name) => (typeof name === "string" ? name.trim().slice(0, MAX_PLATE_NAME_LENGTH) : ""));
  return names.length > 1 || (names.length === 1 && names[0]) ? names : undefined;
}
