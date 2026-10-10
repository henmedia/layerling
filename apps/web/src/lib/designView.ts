/**
 * Where the camera looked in a design, kept with the design so it opens the way it was left (#220).
 * The view is not part of the design's undo history and saving it never saves the design: it is
 * written to the browser on its own, and a `.lyl` file carries it along as optional editor state.
 */
export type DesignView = {
  orthographic: boolean;
  position: [number, number, number];
  target: [number, number, number];
  up: [number, number, number];
  zoom: number;
};

const DESIGN_VIEW_STORAGE_PREFIX = "layerling.designView.";

function vector3(value: unknown): [number, number, number] | null {
  if (!Array.isArray(value) || value.length !== 3) return null;
  const numbers = value.map((entry) => (typeof entry === "number" && Number.isFinite(entry) && Math.abs(entry) < 1e7 ? entry : null));
  return numbers.every((entry) => entry !== null) ? (numbers as [number, number, number]) : null;
}

/** A view read from storage or a file, or null when it is anything but a camera that can look at something. */
export function normalizeDesignView(value: unknown): DesignView | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const position = vector3(raw.position);
  const target = vector3(raw.target);
  const up = vector3(raw.up);
  const zoom = raw.zoom;
  if (!position || !target || !up || typeof zoom !== "number" || !Number.isFinite(zoom) || zoom <= 0 || zoom > 1e6) return null;
  // A camera sitting on its target, or an up direction of no length, cannot look anywhere.
  if (Math.hypot(position[0] - target[0], position[1] - target[1], position[2] - target[2]) < 1e-6) return null;
  if (Math.hypot(up[0], up[1], up[2]) < 1e-6) return null;
  return { orthographic: raw.orthographic === true, position, target, up, zoom };
}

export function readDesignView(projectId: string | null | undefined): DesignView | null {
  if (!projectId) return null;
  try {
    const stored = window.localStorage.getItem(DESIGN_VIEW_STORAGE_PREFIX + projectId);
    return stored ? normalizeDesignView(JSON.parse(stored)) : null;
  } catch {
    return null;
  }
}

export function writeDesignView(projectId: string | null | undefined, view: DesignView | null) {
  if (!projectId) return;
  try {
    if (view) window.localStorage.setItem(DESIGN_VIEW_STORAGE_PREFIX + projectId, JSON.stringify(view));
    else window.localStorage.removeItem(DESIGN_VIEW_STORAGE_PREFIX + projectId);
  } catch {
    // Without storage the design simply opens in the standard view, as it always did.
  }
}
