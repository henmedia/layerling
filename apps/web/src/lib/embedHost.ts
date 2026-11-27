/**
 * Sending a design to the app that frames the editor (Discussion #2144), protocol version 1. A slicer's plugin
 * tab, for example, shows the editor in an iframe and takes the finished export from it instead of a download.
 * The format is documented in docs/EMBEDDING.md.
 *
 *   editor -> host   { type: "layerling:hello", version: 1 }                        on mount, only when framed
 *   host -> editor   { type: "layerling:host", version: 1, name, accepts? }         the host says who it is
 *   editor -> host   { type: "layerling:ready", version: 1 }
 *   editor -> host   { type: "layerling:file", version: 1, fileName, mediaType, size, data }   on the user's click only
 *
 * The host only receives: it cannot ask for the design, so nothing leaves the editor unless the user sends it from
 * the export window. Only the framing window is listened to, and only when the page is framed.
 */

export const EMBED_HOST_PROTOCOL_VERSION = 1;

/** What a host may say it takes: the extensions the export window writes (a ZIP for "one file per plate"). */
export const EMBED_HOST_FORMATS = ["stl", "3mf", "obj", "step", "svg", "dxf", "png", "pdf", "zip"] as const;
export type EmbedHostFormat = (typeof EMBED_HOST_FORMATS)[number];
export const EMBED_HOST_DEFAULT_ACCEPTS: readonly EmbedHostFormat[] = ["stl", "3mf"];
export const EMBED_HOST_NAME_MAX = 40;

export type EmbedHost = { name: string; accepts: readonly EmbedHostFormat[] };

/** The parts of a window the link uses, so a test can stand in for both sides. */
export type EmbedHostWindow = {
  parent: EmbedHostTarget;
  addEventListener: (type: "message", listener: (event: MessageEvent) => void) => void;
  removeEventListener: (type: "message", listener: (event: MessageEvent) => void) => void;
};
export type EmbedHostTarget = { postMessage: (message: unknown, targetOrigin: string, transfer?: Transferable[]) => void };

export type EmbedHostLink = {
  /** The host that introduced itself last, or null. */
  host: () => EmbedHost | null;
  /** Hands a finished export to the host. Throws when no host has introduced itself. */
  send: (fileName: string, blob: Blob) => Promise<void>;
  dispose: () => void;
};

/** The name a host gives itself, as the button shows it: one line, no control characters, at most 40 characters. */
export function sanitizeHostName(value: unknown): string {
  if (typeof value !== "string") return "";
  // eslint-disable-next-line no-control-regex
  const oneLine = value.replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2066-\u2069]/g, " ").replace(/\s+/g, " ").trim();
  return Array.from(oneLine).slice(0, EMBED_HOST_NAME_MAX).join("").trim();
}

/** The formats a host takes; unknown entries are dropped, and none at all means STL and 3MF. */
export function acceptedFormats(value: unknown): readonly EmbedHostFormat[] {
  if (!Array.isArray(value)) return EMBED_HOST_DEFAULT_ACCEPTS;
  const known = new Set<EmbedHostFormat>();
  for (const entry of value) {
    const format = typeof entry === "string" ? entry.trim().toLowerCase().replace(/^\./, "") : "";
    if ((EMBED_HOST_FORMATS as readonly string[]).includes(format)) known.add(format as EmbedHostFormat);
  }
  return known.size > 0 ? [...known] : EMBED_HOST_DEFAULT_ACCEPTS;
}

/** A host's introduction, or null for anything else: other types, another version, a name that is empty. */
export function parseHostMessage(data: unknown): EmbedHost | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const message = data as Record<string, unknown>;
  if (message.type !== "layerling:host" || message.version !== EMBED_HOST_PROTOCOL_VERSION) return null;
  const name = sanitizeHostName(message.name);
  if (!name) return null;
  return { name, accepts: acceptedFormats(message.accepts) };
}

/** Whether the host takes a file of this name. */
export function hostAcceptsFile(host: EmbedHost | null, fileName: string): boolean {
  if (!host) return false;
  const dot = fileName.lastIndexOf(".");
  return dot >= 0 && (host.accepts as readonly string[]).includes(fileName.slice(dot + 1).toLowerCase());
}

/** The media type a file of this name goes out as, when the blob has none of its own. */
const MEDIA_TYPES: Record<EmbedHostFormat, string> = {
  stl: "model/stl",
  "3mf": "model/3mf",
  obj: "model/obj",
  step: "model/step",
  svg: "image/svg+xml",
  dxf: "image/vnd.dxf",
  png: "image/png",
  pdf: "application/pdf",
  zip: "application/zip",
};

export async function fileMessage(fileName: string, blob: Blob) {
  const data = await blob.arrayBuffer();
  const extension = fileName.slice(fileName.lastIndexOf(".") + 1).toLowerCase() as EmbedHostFormat;
  return {
    type: "layerling:file" as const,
    version: EMBED_HOST_PROTOCOL_VERSION,
    fileName,
    mediaType: blob.type.split(";")[0] || MEDIA_TYPES[extension] || "application/octet-stream",
    size: data.byteLength,
    data,
  };
}

/**
 * Listens for a host on the window that frames `self`. Not framed: nothing is listened to and nothing is said.
 * `onHost` hears every introduction (a host may introduce itself again, after a reload of its own page).
 */
export function createEmbedHostLink(self: EmbedHostWindow, onHost: (host: EmbedHost) => void): EmbedHostLink | null {
  const parent = self.parent;
  if (!parent || (parent as unknown) === self) return null;
  let current: { host: EmbedHost; origin: string } | null = null;
  // A host page built from a string (a plugin tab) has the opaque origin "null", which postMessage cannot address.
  const targetOrigin = () => (!current || current.origin === "null" || !current.origin ? "*" : current.origin);

  const onMessage = (event: MessageEvent) => {
    if (event.source !== (parent as unknown)) return;
    const host = parseHostMessage(event.data);
    if (!host) return;
    current = { host, origin: event.origin };
    parent.postMessage({ type: "layerling:ready", version: EMBED_HOST_PROTOCOL_VERSION }, targetOrigin());
    onHost(host);
  };
  self.addEventListener("message", onMessage);
  // Says nothing about the design: only that an editor is here to be introduced to.
  parent.postMessage({ type: "layerling:hello", version: EMBED_HOST_PROTOCOL_VERSION }, "*");

  return {
    host: () => current?.host ?? null,
    send: async (fileName, blob) => {
      if (!current) throw new Error("No app to send to");
      const message = await fileMessage(fileName, blob);
      parent.postMessage(message, targetOrigin(), [message.data]);
    },
    dispose: () => {
      self.removeEventListener("message", onMessage);
      current = null;
    },
  };
}
