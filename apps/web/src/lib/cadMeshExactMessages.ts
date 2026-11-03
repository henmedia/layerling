/*
 * The messages Make exact's CAD worker gives (lib/cadMeshExact.ts), apart from it: the editor reads them to say what
 * happened in the user's language, and should not load the whole rebuild to know their wording.
 */

/** What the CAD worker says when Make exact found surfaces but they did not close into a valid solid. */
export const EXACT_MESH_FAILED_MESSAGE = "The faces found in this mesh did not close into a solid";

/** Why exactSolidFromMesh with refuseFreeform gave up, followed by " (<percent> %)" of the surface that fits a surface. */
export const EXACT_MESH_FREEFORM_MESSAGE = "This mesh is mostly free-form";

/** The share of the surface, in percent, an EXACT_MESH_FREEFORM_MESSAGE says fits a surface; null for any other message. */
export function exactMeshFreeformShare(message: string): number | null {
  if (!message.includes(EXACT_MESH_FREEFORM_MESSAGE)) return null;
  const match = /\((\d+) %\)/.exec(message);
  return match ? Number(match[1]) : 0;
}
