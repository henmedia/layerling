import { useEffect, useState } from "react";
import { t } from "@/lib/i18n";
import { readSpaceMouseInvert, readSpaceMouseSpeed, saveSpaceMouseInvert, saveSpaceMouseSpeed, SPACE_MOUSE_SPEED_DEFAULT, SPACE_MOUSE_SPEED_MAX, SPACE_MOUSE_SPEED_MIN, type SpaceMouseInvert, type SpaceMouseWay } from "@/lib/spaceMouse";
import { connectSpaceMouse, knownSpaceMice, SPACE_MOUSE_WAY_EVENT, spaceMouseWay, webHid } from "@/components/workplane/useSpaceMouse";

const INVERTS = [
  ["shift", "workspace.spaceMouseInvertShift"],
  ["lift", "workspace.spaceMouseInvertLift"],
  ["zoom", "workspace.spaceMouseInvertZoom"],
  ["tilt", "workspace.spaceMouseInvertTilt"],
  ["twist", "workspace.spaceMouseInvertTwist"],
] as const;

/**
 * The 3D mouse in the settings (#1013): a button that lets the browser ask which device the site may use, and the name of
 * the one it uses. Where the browser has no WebHID (Firefox, Safari), a line says where it works instead. The reversed
 * directions shown and ticked are those of the way the mouse is read right now, WebHID or game controller (#1871). Its
 * own speed slider sits below them (#2010): Zoom speed and Pan speed are for the regular mouse only.
 */
export function SpaceMouseSetting() {
  const [supported, setSupported] = useState(false);
  const [names, setNames] = useState<string[]>([]);
  const [failed, setFailed] = useState(false);
  const [way, setWay] = useState<SpaceMouseWay>("hid");
  const [invert, setInvert] = useState<SpaceMouseInvert>(() => readSpaceMouseInvert("hid"));
  const [speed, setSpeed] = useState(SPACE_MOUSE_SPEED_DEFAULT);
  const changeSpeed = (step: number) => {
    setSpeed(step);
    saveSpaceMouseSpeed(step);
  };
  useEffect(() => {
    setSupported(webHid() !== null);
    setSpeed(readSpaceMouseSpeed());
    let gone = false;
    const look = () => {
      void knownSpaceMice().then((found) => {
        if (!gone) setNames(found);
      });
      void spaceMouseWay().then((found) => {
        if (gone) return;
        setWay(found ?? "hid");
        setInvert(readSpaceMouseInvert(found ?? "hid"));
      });
    };
    look();
    // A mouse found as a game controller shows up once it is moved (#1013); the editor says when it took one up over WebHID.
    window.addEventListener("gamepadconnected", look);
    window.addEventListener("gamepaddisconnected", look);
    window.addEventListener(SPACE_MOUSE_WAY_EVENT, look);
    return () => {
      gone = true;
      window.removeEventListener("gamepadconnected", look);
      window.removeEventListener("gamepaddisconnected", look);
      window.removeEventListener(SPACE_MOUSE_WAY_EVENT, look);
    };
  }, []);
  const connect = async () => {
    setFailed(false);
    try {
      const name = await connectSpaceMouse();
      if (name) {
        setNames((current) => (current.includes(name) ? current : [...current, name]));
        // From here on the mouse is read over WebHID, with the directions ticked for it.
        setWay("hid");
        setInvert(readSpaceMouseInvert("hid"));
      }
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
      {supported ? (
        <fieldset className="workspace-space-mouse-invert" aria-label={t("workspace.spaceMouseInvert")}>
          <span className="workspace-space-mouse-invert-title">{t("workspace.spaceMouseInvert")}</span>
          {INVERTS.map(([key, label]) => (
            <label key={key}>
              <input
                type="checkbox"
                checked={invert[key]}
                onChange={(event) => {
                  const next = { ...invert, [key]: event.currentTarget.checked };
                  setInvert(next);
                  saveSpaceMouseInvert(next, way);
                }}
              />
              {t(label)}
            </label>
          ))}
          {way === "pad" ? <small className="workspace-space-mouse-invert-way">{t("workspace.spaceMouseInvertPad")}</small> : null}
        </fieldset>
      ) : null}
      {supported ? (
        <label className="workspace-range workspace-space-mouse-speed" data-help={t("workspace.spaceMouseSpeedHint")}>
          <span>{t("workspace.spaceMouseSpeed")}</span>
          <input
            type="range"
            min={SPACE_MOUSE_SPEED_MIN}
            max={SPACE_MOUSE_SPEED_MAX}
            step={1}
            value={speed}
            onChange={(event) => changeSpeed(Number(event.currentTarget.value))}
            onDoubleClick={() => changeSpeed(SPACE_MOUSE_SPEED_DEFAULT)}
          />
          <small>
            <span>{t("workspace.slow")}</span>
            <span>{t("workspace.fast")}</span>
          </small>
        </label>
      ) : null}
    </div>
  );
}
