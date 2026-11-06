"use client";

import { ArrowUp, FilePlus2, Folder } from "lucide-react";
import { useEffect, useState } from "react";
import { t } from "@/lib/i18n";
import { fetchServerDesignFile, joinServerFolder, listServerDesigns, parentServerFolder, type ServerDesignFolder } from "@/lib/serverDesigns";

/**
 * The designs on the server, one folder at a time, under "Insert from the server" in the import window (Discussion
 * #1378). A click on a design brings its bodies into the open design, as a file picked on the computer does.
 */
export function ServerDesignPicker({ onInsertFile }: { onInsertFile: (file: File) => void | Promise<void> }) {
  const [path, setPath] = useState("");
  const [listing, setListing] = useState<ServerDesignFolder | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let current = true;
    setFailed(false);
    void listServerDesigns(path).then((result) => {
      if (!current) return;
      setListing(result);
      setFailed(result === null);
    });
    return () => {
      current = false;
    };
  }, [path]);

  const insert = async (fileName: string) => {
    setBusy(true);
    const file = await fetchServerDesignFile(path, fileName);
    if (file) await onInsertFile(file);
    else setFailed(true);
    setBusy(false);
  };

  return (
    <div className="server-design-picker" data-testid="server-design-picker">
      <div className="server-design-path">
        {path ? (
          <button type="button" className="server-design-up" onClick={() => setPath(parentServerFolder(path))} aria-label={t("import.serverUp")} title={t("import.serverUp")}>
            <ArrowUp size={14} />
          </button>
        ) : null}
        <span>{path || t("import.serverTop")}</span>
      </div>
      {failed ? <p className="server-design-note">{t("import.serverFailed")}</p> : null}
      {listing && !listing.folders.length && !listing.designs.length ? <p className="server-design-note">{t("import.serverEmpty")}</p> : null}
      {listing?.folders.map((name) => (
        <button key={`folder:${name}`} type="button" className="server-design-row" onClick={() => setPath(joinServerFolder(path, name))}>
          <Folder size={15} />
          <span>{name}</span>
        </button>
      ))}
      {listing?.designs.map((design) => (
        <button key={design.fileName} type="button" className="server-design-row" disabled={busy} onClick={() => void insert(design.fileName)}>
          <FilePlus2 size={15} />
          <span>{design.name}</span>
        </button>
      ))}
    </div>
  );
}
