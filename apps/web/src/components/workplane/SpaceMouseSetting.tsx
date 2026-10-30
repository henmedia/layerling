import { useEffect, useState } from "react";
import { t } from "@/lib/i18n";
import { connectSpaceMouse, knownSpaceMice, webHid } from "@/components/workplane/useSpaceMouse";

/**
 * The 3D mouse in the settings (#1013): a button that lets the browser ask which device the site may use, and the name of
 * the one it uses. Where the browser has no WebHID (Firefox, Safari), a line says where it works instead.
 */
export function SpaceMouseSetting() {
  const [supported, setSupported] = useState(false);
  const [names, setNames] = useState<string[]>([]);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setSupported(webHid() !== null);
    void knownSpaceMice().then(setNames);
  }, []);
  const connect = async () => {
    setFailed(false);
    try {
      const name = await connectSpaceMouse();
      if (name) setNames((current) => (current.includes(name) ? current : [...current, name]));
    } catch {
      setFailed(true);
    }
  };
  return (
    <div className="workspace-select" data-help={t("workspace.spaceMouse")}>
      <span>{t("workspace.spaceMouse")}</span>
      {supported ? (
        <button type="button" className="workspace-custom-snap-add" onClick={() => void connect()}>
          {t("workspace.spaceMouseConnect")}
        </button>
      ) : (
        <span />
      )}
      <small>
        {!supported
          ? t("workspace.spaceMouseUnsupported")
          : failed
            ? t("workspace.spaceMouseFailed")
            : names.length
              ? t("workspace.spaceMouseConnected", { name: names.join(", ") })
              : t("workspace.spaceMouseHint")}
      </small>
    </div>
  );
}
