"use client";

import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { GuideHelpLink } from "@/components/GuideHelpLink";
import { MarkdownView } from "@/components/workplane/MarkdownView";
import { t } from "@/lib/i18n";
import { parseMarkdown } from "@/lib/markdownView";
import { attachmentView } from "@/lib/projectAttachments";
import { useMovablePanel } from "@/lib/useMovablePanel";
import type { ProjectAttachment } from "@/types/layerling";

/**
 * Shows one attachment of the design to read or look at (#820, phases 2 and 4): a Markdown file
 * formatted, a text file as it is, a picture as the picture. It is opened from the eye button of a row in
 * the attachments panel, which only types with a `view` in `ATTACHMENT_TYPES` have.
 *
 * The window is the quick guide's (`GuideModal.tsx`): the same card, title bar and backdrop, moved by
 * its title bar and remembered where it stood. It only reads, so it also opens while the History view
 * shows an earlier state, as Download does.
 *
 * It can be closed at any time, the way the guide is: the X in the title bar, Escape, or a click beside
 * the window. The editor also stops showing it by itself when the file is no longer in the design
 * (removed, or another design opened), since it only draws what it is handed.
 *
 * Why this is safe to show, whatever the file says: the text is decoded here and handed to React as
 * text. A Markdown file goes through `parseMarkdown`, which makes a tree and never HTML, and
 * `MarkdownView` draws that tree as elements; links open only to web pages and e-mail addresses, in a
 * new tab, and pictures are not loaded. The comments of those two files say why.
 *
 * A picture attachment is shown by the browser from its own bytes, as the icon tag panel shows its
 * preview: the bytes become a Blob with the media type the design recorded, and the <img> is given that
 * Blob's local address. Nothing is fetched from anywhere, and the address stops working when the window
 * closes or the file changes. The bytes were checked to start the way their type starts when they were
 * attached, and only PNG, JPEG and WebP are shown this way; SVG, the picture type that could carry a
 * script or a link, may not be attached at all. An <img> never runs a script, whatever its file says:
 * a file that starts right and goes on with HTML or a script, or with garbage, is only a picture the
 * browser cannot decode, and the viewer says so. A picture too large to decode (a "decompression bomb",
 * small on disk and gigabytes as pixels) is refused by the browser's decoder the same way.
 */
export function AttachmentViewer({ attachment, onClose }: { attachment: ProjectAttachment; onClose: () => void }) {
  const view = attachmentView(attachment);
  // Decoded and parsed once per file content, not on every move of the window. The bytes were checked to
  // be UTF-8 when they were attached; a byte-order mark at the start is dropped by the decoder. A picture
  // is not text and is not decoded.
  const text = useMemo(() => (view === "image" ? "" : new TextDecoder("utf-8").decode(attachment.bytes)), [attachment.bytes, view]);
  const imageUrl = useImageUrl(view === "image" ? attachment : null);
  // The address of a picture the browser could not decode: its first bytes were right, the rest is
  // damaged or not a picture at all. A sentence takes its place instead of the browser's broken image.
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null);
  const blocks = useMemo(() => (view === "markdown" ? parseMarkdown(text) : null), [text, view]);
  const movable = useMovablePanel<HTMLDivElement>("layerling.editor.attachmentViewerPosition", { floatingStyle: { position: "absolute", margin: 0 } });
  const cardRef = movable.panelRef;

  // The card takes the focus, so that Escape and the arrow keys (to scroll) reach it straight away.
  useEffect(() => {
    cardRef.current?.focus();
  }, []);

  return (
    <div
      className="workspace-modal shortcuts-modal attachment-viewer"
      role="dialog"
      aria-modal="true"
      aria-label={attachment.name}
      // Editor and viewport both listen for keys on the window; while a file is being read, its keys
      // must not also move or delete parts of the design.
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
        }
      }}
    >
      <div
        className={`workspace-modal-card shortcuts-modal-card ${movable.moved ? "floating" : ""} ${movable.dragging ? "moving" : ""}`}
        ref={cardRef}
        style={movable.style}
        tabIndex={-1}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <header className="workspace-modal-header movable" title={t("panel.moveHint")} {...movable.handleProps}>
          {/* translate="no": a file name is not text to be translated by the browser. */}
          <strong translate="no" title={attachment.name}>{attachment.name}</strong>
          <GuideHelpLink section="attachments" />
          <button aria-label={t("attachments.viewerClose", { name: attachment.name })} onClick={onClose}>
            <X size={18} />
          </button>
        </header>
        <div className="workspace-modal-content">
          <div className="workspace-modal-body attachment-viewer-body">
            {view === "image" ? (
              imageUrl === null ? null : brokenUrl === imageUrl ? (
                <p className="attachment-viewer-text">{t("attachments.imageBroken")}</p>
              ) : (
                <img className="attachment-viewer-image" src={imageUrl} alt={attachment.name} draggable={false} onError={() => setBrokenUrl(imageUrl)} />
              )
            ) : blocks ? (
              <MarkdownView blocks={blocks} />
            ) : (
              <pre className="attachment-viewer-text">{text}</pre>
            )}
          </div>
          {blocks ? <div className="workspace-modal-footer">{t("attachments.viewerFooter")}</div> : null}
        </div>
      </div>
      <button className="workspace-modal-backdrop" aria-label={t("attachments.viewerClose", { name: attachment.name })} onClick={onClose} />
    </div>
  );
}

/**
 * The local address of a picture attachment's bytes, or null for no picture (or before the first draw).
 * The address is made for the bytes the viewer is handed and revoked when they change or the viewer
 * closes, so a closed picture does not stay held in memory behind an address nobody uses.
 */
function useImageUrl(attachment: Pick<ProjectAttachment, "bytes" | "mediaType"> | null) {
  const [url, setUrl] = useState<string | null>(null);
  const bytes = attachment?.bytes;
  const mediaType = attachment?.mediaType;
  useEffect(() => {
    if (!bytes || !mediaType) return;
    const next = URL.createObjectURL(new Blob([bytes as BlobPart], { type: mediaType }));
    setUrl(next);
    return () => {
      URL.revokeObjectURL(next);
      setUrl(null);
    };
  }, [bytes, mediaType]);
  return url;
}
