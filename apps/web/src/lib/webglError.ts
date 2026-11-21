/**
 * Whether an error says that the browser gave the page no WebGL context. three.js throws
 * "Error creating WebGL context." (or "... with your selected attributes.") when the 3D view is set
 * up and the browser has graphics acceleration off, a graphics driver it refuses or that crashed,
 * or WebGL blocked. Nothing in the design causes it, so the error screen explains what to do on the
 * computer instead of offering a new design, which would stop the same way.
 */
export function isWebGLContextError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  return /\bWebGL2?\b[^.]*\bcontext\b|\bcontext\b[^.]*\bWebGL2?\b|\bWebGL2?\b[^.]*\bnot (?:supported|available)\b/i.test(message);
}
