# Embedding the editor (`postMessage` protocol v1)

A host program — such as a plugin tab in a slicer — can show the layerling editor inside an `<iframe>` and receive exported files directly over `window.postMessage`, without a browser download.

Open the editor with `?editor=1` (for example `https://layerling.com/?editor=1` or `http://127.0.0.1:3000/?editor=1`) so it starts on the workplane instead of the start page.

## Security model

- **Framed only.** When the editor mounts, it checks `window.parent !== window`. In a normal browser tab it attaches no `message` listener, sends no message, and shows no extra button.
- **Click only.** The host only receives. There is no message for asking the editor for a design, and nothing leaves the editor until the user clicks **Send to `<name>`** in the export window.
- **Source check.** The editor accepts a `message` event only when `event.source === window.parent`, `event.data` is a plain object, `event.data.version === 1`, and `event.data.type` is known. Every other message is ignored silently, with no error reply.
- **Origin pinning.** The editor remembers `event.origin` from the valid `layerling:host` introduction and sends `layerling:ready` and `layerling:file` to that origin. When `event.origin` is the opaque origin `"null"` — as in a slicer plugin page built from an HTML string — the editor posts to `"*"`.
- **Plain-text host name.** Control and bidi-formatting characters are stripped from `name`, whitespace is collapsed to single spaces, and the result is trimmed to at most 40 characters. If `name` is empty after sanitising, the introduction is ignored. The editor renders `name` as text only, never as HTML.

## Messages

Every message is a plain object with a `type` string starting with `layerling:` and `version: 1`.

| # | Direction | Message | When |
| --- | --- | --- | --- |
| 1 | editor → host | `{ type: "layerling:hello", version: 1 }` | Sent once when the framed editor mounts. Target origin is `"*"`. Carries nothing about the design. |
| 2 | host → editor | `{ type: "layerling:host", version: 1, name: string, accepts?: string[] }` | Sent by the host in answer to `layerling:hello` (a host may also send it on iframe `load`; it is idempotent). |
| 3 | editor → host | `{ type: "layerling:ready", version: 1 }` | Sent after each valid `layerling:host` to confirm the link. |
| 4 | editor → host | `{ type: "layerling:file", version: 1, fileName: string, mediaType: string, size: number, data: ArrayBuffer }` | Sent **only** when the user clicks **Send to `<name>`** in the export window. `data` is transferred (`postMessage(msg, origin, [data])`). |

### Host introduction (`layerling:host`)

- `name`: display name of the host program (for example `"OrcaSlicer"`). Shown in the export window button **Send to `<name>`**.
- `accepts`: optional array of lowercase file extensions without a leading dot. The known extensions are:
  `"stl"`, `"3mf"`, `"obj"`, `"step"`, `"svg"`, `"dxf"`, `"png"`, `"pdf"`, `"zip"`.
  Unknown values are dropped. When `accepts` is omitted or empty after filtering, it defaults to `["stl", "3mf"]`.
- The export window shows **Send to `<name>`** next to the normal download button only when the file the export window would write has an extension in `accepts`. (Note that exporting multiple plates as one file per plate writes a `.zip`.)
- File name, format, and selection come from the export window. The ribbon is unchanged.
- A later `layerling:host` replaces the active host's name, accepted extensions, and origin.

### Exported file (`layerling:file`)

- `fileName`: the file name from the export window, including its extension (for example `"Bracket.stl"`).
- `mediaType`: MIME type of the file (`"model/stl"`, `"model/3mf"`, `"model/obj"`, `"model/step"`, `"image/svg+xml"`, `"image/vnd.dxf"`, `"image/png"`, `"application/pdf"`, or `"application/zip"`).
- `size`: byte length of `data` (`data.byteLength`).
- `data`: an `ArrayBuffer` holding the exported file bytes, transferred in the `postMessage` transfer list so large meshes are handed over without copying.

Hosts should check `event.source === iframe.contentWindow` and validate `fileName`, file extension, and `size` before writing the bytes to disk or passing them to the slicer.

## Minimal host example

```js
const iframe = document.getElementById("layerling");
const ACCEPTS = ["stl", "3mf"];
let editorOrigin = "*";

window.addEventListener("message", (event) => {
  if (event.source !== iframe.contentWindow) return;
  const msg = event.data;
  if (!msg || typeof msg !== "object" || msg.version !== 1) return;

  if (msg.type === "layerling:hello") {
    editorOrigin = event.origin === "null" ? "*" : event.origin;
    iframe.contentWindow.postMessage(
      { type: "layerling:host", version: 1, name: "OrcaSlicer", accepts: ACCEPTS },
      editorOrigin,
    );
  } else if (msg.type === "layerling:ready") {
    console.log("Connected to layerling");
  } else if (msg.type === "layerling:file" && msg.data instanceof ArrayBuffer) {
    const ext = msg.fileName.split(".").pop().toLowerCase();
    if (!ACCEPTS.includes(ext) || msg.size !== msg.data.byteLength) return;
    openInSlicer(msg.fileName, new Uint8Array(msg.data));
  }
});
```

## Versioning

Every message in this specification carries `version: 1`. The editor ignores messages with any other version number. Optional fields may be added in version 1 when old hosts and editors can safely ignore them; any incompatible change will use a new `version` number.
