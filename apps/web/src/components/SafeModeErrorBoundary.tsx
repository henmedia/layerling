"use client";

import { Component, useState, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, Download, Home, PlusCircle } from "lucide-react";
import { t } from "@/lib/i18n";
import { PROJECT_SHAPES_DB_NAME } from "@/lib/storageMigration";
import { useMovablePanel } from "@/lib/useMovablePanel";
import { isWebGLContextError } from "@/lib/webglError";

type ProjectRecord = {
  id: string;
  lylPackage?: ArrayBuffer | Uint8Array;
  skfPackage?: ArrayBuffer | Uint8Array;
};

/** The design as it was last saved in the browser, as a .lyl file's bytes; null when there is none. */
async function storedProjectPackage(projectId: string): Promise<Uint8Array | null> {
  if (typeof window === "undefined" || !window.indexedDB) return null;
  try {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = window.indexedDB.open(PROJECT_SHAPES_DB_NAME);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      if (!db.objectStoreNames.contains("projectShapes")) return null;
      const record = await new Promise<ProjectRecord | undefined>((resolve, reject) => {
        const request = db.transaction("projectShapes", "readonly").objectStore("projectShapes").get(projectId);
        request.onsuccess = () => resolve(request.result as ProjectRecord | undefined);
        request.onerror = () => reject(request.error);
      });
      const stored = record?.lylPackage ?? record?.skfPackage;
      if (!stored) return null;
      return stored instanceof Uint8Array ? stored : new Uint8Array(stored);
    } finally {
      db.close();
    }
  } catch {
    return null;
  }
}

function saveBytes(bytes: Uint8Array, name: string) {
  const blob = new Blob([bytes as BlobPart], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-").trim() || "layerling"}.lyl`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export type SafeModeScreenProps = {
  error: Error | null;
  projectId?: string | null;
  projectName?: string | null;
  onGoToDashboard: () => void;
  onNewEmptyProject?: () => void;
};

/**
 * What shows instead of a blank page when something breaks: the error, a way to save the design
 * as it was last stored in the browser, and ways out. Like every window in layerling it can be
 * moved by its title bar. When the browser gave the 3D view no WebGL context, it says so and lists
 * what helps on the computer, and leaves out "Start a new design", which would stop the same way.
 */
export function SafeModeScreen({ error, projectId, projectName, onGoToDashboard, onNewEmptyProject }: SafeModeScreenProps) {
  const movable = useMovablePanel<HTMLDivElement>("layerling.safeModePosition", { floatingStyle: { position: "absolute", margin: 0 } });
  const [backup, setBackup] = useState<"idle" | "busy" | "missing">("idle");
  const noWebGL = isWebGLContextError(error);

  const downloadBackup = async () => {
    if (!projectId) return;
    setBackup("busy");
    const bytes = await storedProjectPackage(projectId);
    if (bytes && bytes.byteLength > 0) {
      saveBytes(bytes, projectName || "layerling");
      setBackup("idle");
    } else {
      setBackup("missing");
    }
  };

  return (
    <div className="workspace-modal safe-mode-screen" role="alertdialog" aria-labelledby="safe-mode-title" aria-describedby="safe-mode-description">
      <div className="workspace-modal-backdrop" aria-hidden="true" />
      <div
        className={`workspace-modal-card safe-mode-card ${movable.moved ? "floating" : ""} ${movable.dragging ? "moving" : ""}`}
        ref={movable.panelRef}
        style={movable.style}
      >
        <header className="workspace-modal-header movable" title={t("panel.moveHint")} {...movable.handleProps}>
          <strong id="safe-mode-title"><AlertTriangle size={20} aria-hidden="true" />{t(noWebGL ? "crash.webgl.title" : "crash.title")}</strong>
        </header>
        <div className="safe-mode-body">
          <p id="safe-mode-description">{t(noWebGL ? "crash.webgl.description" : "crash.description")}</p>
          {noWebGL ? (
            <div className="safe-mode-steps">
              <p>{t("crash.webgl.stepsTitle")}</p>
              <ol>
                <li>{t("crash.webgl.stepRestart")}</li>
                <li>{t("crash.webgl.stepAcceleration")}</li>
                <li>{t("crash.webgl.stepPrivacy")}</li>
                <li>{t("crash.webgl.stepUpdate")}</li>
                <li>{t("crash.webgl.stepOtherBrowser")}</li>
              </ol>
            </div>
          ) : null}
          {projectName ? <p className="safe-mode-project">{t("crash.projectHint", { name: projectName })}</p> : null}
          {error?.message ? (
            <details className="safe-mode-details">
              <summary>{t("crash.details")}</summary>
              <pre>{error.message}</pre>
            </details>
          ) : null}
          {backup === "missing" ? <p className="safe-mode-note" role="status">{t("crash.backupMissing")}</p> : null}
          <div className="safe-mode-actions">
            {projectId ? (
              <button type="button" className="primary" onClick={downloadBackup} disabled={backup === "busy"}>
                <Download size={16} aria-hidden="true" />
                {t("crash.downloadBackup")}
              </button>
            ) : null}
            <button type="button" onClick={onGoToDashboard}>
              <Home size={16} aria-hidden="true" />
              {t("crash.goToDashboard")}
            </button>
            {onNewEmptyProject && !noWebGL ? (
              <button type="button" onClick={onNewEmptyProject}>
                <PlusCircle size={16} aria-hidden="true" />
                {t("crash.newEmptyProject")}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

type Props = {
  children: ReactNode;
  projectId?: string | null;
  projectName?: string | null;
  /** Called to leave the broken editor; the caller takes the editor down, so it starts afresh next time. */
  onGoToDashboard: () => void;
  onNewEmptyProject?: () => void;
};

type State = { error: Error | null };

/**
 * Catches an error while the editor draws, so a design that cannot be shown does not take the
 * whole page down. Give it a `key` per design: opening another one starts it clean.
 */
export class SafeModeErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("layerling: the editor stopped with an error", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <SafeModeScreen
        error={this.state.error}
        projectId={this.props.projectId}
        projectName={this.props.projectName}
        onGoToDashboard={this.props.onGoToDashboard}
        onNewEmptyProject={this.props.onNewEmptyProject}
      />
    );
  }
}
