import { describe, expect, it } from "vitest";
import {
  EMBED_HOST_NAME_MAX,
  acceptedFormats,
  createEmbedHostLink,
  hostAcceptsFile,
  parseHostMessage,
  sanitizeHostName,
  type EmbedHost,
  type EmbedHostWindow,
} from "@/lib/embedHost";

type Posted = { message: Record<string, unknown>; origin: string; transfer?: Transferable[] };

/** The editor's window inside a frame: `parent` records what it is sent, `deliver` plays a message to the editor. */
function framedEditor() {
  const posted: Posted[] = [];
  const parent = { postMessage: (message: unknown, origin: string, transfer?: Transferable[]) => posted.push({ message: message as Record<string, unknown>, origin, transfer }) };
  const listeners = new Set<(event: MessageEvent) => void>();
  const self: EmbedHostWindow = {
    parent,
    addEventListener: (_type, listener) => listeners.add(listener),
    removeEventListener: (_type, listener) => listeners.delete(listener),
  };
  const deliver = (data: unknown, { source = parent as unknown, origin = "https://host.example" } = {}) => {
    for (const listener of listeners) listener({ data, source, origin } as MessageEvent);
  };
  return { self, parent, posted, listeners, deliver };
}

const introduction = (extra: Record<string, unknown> = {}) => ({ type: "layerling:host", version: 1, name: "OrcaSlicer", ...extra });

describe("embedding host handshake", () => {
  it("stays silent when the editor is not framed", () => {
    const listeners: unknown[] = [];
    const self = { addEventListener: (...args: unknown[]) => listeners.push(args), removeEventListener: () => undefined } as unknown as EmbedHostWindow;
    (self as { parent: unknown }).parent = self;
    expect(createEmbedHostLink(self, () => undefined)).toBeNull();
    expect(listeners).toHaveLength(0);
  });

  it("says hello to the framing window, carrying nothing about the design", () => {
    const frame = framedEditor();
    createEmbedHostLink(frame.self, () => undefined);
    expect(frame.posted).toEqual([{ message: { type: "layerling:hello", version: 1 }, origin: "*", transfer: undefined }]);
  });

  it("answers a host's introduction with ready, to the host's origin", () => {
    const frame = framedEditor();
    const heard: EmbedHost[] = [];
    const link = createEmbedHostLink(frame.self, (host) => heard.push(host))!;
    frame.deliver(introduction({ accepts: ["3mf"] }));
    expect(heard).toEqual([{ name: "OrcaSlicer", accepts: ["3mf"] }]);
    expect(link.host()).toEqual({ name: "OrcaSlicer", accepts: ["3mf"] });
    expect(frame.posted.at(-1)).toEqual({ message: { type: "layerling:ready", version: 1 }, origin: "https://host.example", transfer: undefined });
  });

  it("answers a host page with the opaque origin (a plugin tab) on any origin", () => {
    const frame = framedEditor();
    createEmbedHostLink(frame.self, () => undefined);
    frame.deliver(introduction(), { origin: "null" });
    expect(frame.posted.at(-1)?.origin).toBe("*");
  });

  it("ignores messages from anyone but the framing window", () => {
    const frame = framedEditor();
    const heard: EmbedHost[] = [];
    const link = createEmbedHostLink(frame.self, (host) => heard.push(host))!;
    frame.deliver(introduction(), { source: { postMessage: () => undefined } });
    frame.deliver(introduction(), { source: null });
    expect(heard).toHaveLength(0);
    expect(link.host()).toBeNull();
    expect(frame.posted).toHaveLength(1); // the hello only
  });

  it("ignores other versions, other types and malformed messages", () => {
    const frame = framedEditor();
    const heard: EmbedHost[] = [];
    createEmbedHostLink(frame.self, (host) => heard.push(host));
    for (const data of [
      introduction({ version: 2 }),
      introduction({ version: "1" }),
      { type: "layerling:host", name: "OrcaSlicer" },
      { type: "layerling:request-model", version: 1, requestId: 1 },
      introduction({ name: "   " }),
      introduction({ name: 42 }),
      "layerling:host",
      null,
      [introduction()],
    ]) frame.deliver(data);
    expect(heard).toHaveLength(0);
    expect(frame.posted).toHaveLength(1);
  });

  it("has no way for the host to ask for the design", () => {
    const frame = framedEditor();
    createEmbedHostLink(frame.self, () => undefined);
    frame.deliver(introduction());
    frame.deliver({ type: "layerling:request-model", version: 1, requestId: 7, format: "stl" });
    frame.deliver({ type: "layerling:file", version: 1 });
    expect(frame.posted.map((entry) => entry.message.type)).toEqual(["layerling:hello", "layerling:ready"]);
  });

  it("takes a later introduction as the host from then on", () => {
    const frame = framedEditor();
    const link = createEmbedHostLink(frame.self, () => undefined)!;
    frame.deliver(introduction());
    frame.deliver(introduction({ name: "PrusaSlicer", accepts: ["stl"] }), { origin: "http://127.0.0.1:8000" });
    expect(link.host()).toEqual({ name: "PrusaSlicer", accepts: ["stl"] });
    expect(frame.posted.at(-1)?.origin).toBe("http://127.0.0.1:8000");
  });

  it("sends a file only when asked to by the editor, as a transferred ArrayBuffer", async () => {
    const frame = framedEditor();
    const link = createEmbedHostLink(frame.self, () => undefined)!;
    await expect(link.send("part.stl", new Blob(["solid"]))).rejects.toThrow();
    frame.deliver(introduction());
    await link.send("part.stl", new Blob(["solid part"], { type: "model/stl" }));
    const sent = frame.posted.at(-1)!;
    expect(sent.origin).toBe("https://host.example");
    expect(sent.message).toMatchObject({ type: "layerling:file", version: 1, fileName: "part.stl", mediaType: "model/stl", size: 10 });
    expect(sent.message.data).toBeInstanceOf(ArrayBuffer);
    expect(new TextDecoder().decode(sent.message.data as ArrayBuffer)).toBe("solid part");
    expect(sent.transfer).toEqual([sent.message.data]);
  });

  it("names the media type from the extension when the blob has none", async () => {
    const frame = framedEditor();
    const link = createEmbedHostLink(frame.self, () => undefined)!;
    frame.deliver(introduction());
    await link.send("plates.zip", new Blob([new Uint8Array([1, 2])]));
    expect(frame.posted.at(-1)?.message.mediaType).toBe("application/zip");
  });

  it("stops listening once disposed", () => {
    const frame = framedEditor();
    const link = createEmbedHostLink(frame.self, () => undefined)!;
    link.dispose();
    expect(frame.listeners.size).toBe(0);
    expect(link.host()).toBeNull();
  });
});

describe("embedding host details", () => {
  it("keeps the host's name to one short line of text", () => {
    expect(sanitizeHostName("  Orca\nSlicer\t 2.5 ")).toBe("Orca Slicer 2.5");
    expect(sanitizeHostName("Bambu\u202eoiduts")).toBe("Bambu oiduts");
    expect(sanitizeHostName("x".repeat(100))).toHaveLength(EMBED_HOST_NAME_MAX);
    expect(sanitizeHostName("<b>Prusa</b>")).toBe("<b>Prusa</b>"); // shown as text, never as markup
    expect(sanitizeHostName(null)).toBe("");
  });

  it("knows the formats the export window writes and falls back to STL and 3MF", () => {
    expect(acceptedFormats(["STL", ".3mf", "exe", 3])).toEqual(["stl", "3mf"]);
    expect(acceptedFormats(["step"])).toEqual(["step"]);
    expect(acceptedFormats(["exe"])).toEqual(["stl", "3mf"]);
    expect(acceptedFormats(undefined)).toEqual(["stl", "3mf"]);
    expect(parseHostMessage(introduction({ accepts: "stl" }))?.accepts).toEqual(["stl", "3mf"]);
  });

  it("offers the target only for a file the host takes", () => {
    const host = { name: "OrcaSlicer", accepts: ["stl", "3mf"] as const };
    expect(hostAcceptsFile(host, "Bracket.STL")).toBe(true);
    expect(hostAcceptsFile(host, "Bracket.zip")).toBe(false);
    expect(hostAcceptsFile(host, "Bracket")).toBe(false);
    expect(hostAcceptsFile(null, "Bracket.stl")).toBe(false);
  });
});
