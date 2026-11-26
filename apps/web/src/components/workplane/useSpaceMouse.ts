import { useEffect, type RefObject } from "react";
import {
  moveCameraBySpaceMouse,
  isSpaceMouseGamepad,
  readSpaceMouseGamepad,
  readSpaceMouseInvert,
  readSpaceMouseReport,
  readSpaceMouseSpeed,
  SPACE_MOUSE_FILTERS,
  SPACE_MOUSE_INVERT_EVENT,
  SPACE_MOUSE_REST,
  smoothSpaceMouseAxes,
  spaceMouseMoving,
  spaceMouseSpeedFactor,
  type SpaceMouseAxes,
  type SpaceMouseWay,
} from "@/lib/spaceMouse";
import type { ThreeState } from "@/components/workplane/ViewportOverlays";

/** The parts of WebHID used here; TypeScript's own library does not describe it yet. */
type HidCollection = { usagePage: number; usage: number };
type HidInputReportEvent = Event & { reportId: number; data: DataView };
export type HidDevice = EventTarget & { opened: boolean; productName: string; collections: HidCollection[]; open(): Promise<void>; close(): Promise<void> };
type Hid = EventTarget & {
  getDevices(): Promise<HidDevice[]>;
  requestDevice(options: { filters: typeof SPACE_MOUSE_FILTERS }): Promise<HidDevice[]>;
};

/** The browser's WebHID, or null where there is none (Firefox, Safari, a page that is not secure). */
export function webHid(): Hid | null {
  if (typeof navigator === "undefined" || !("hid" in navigator)) return null;
  return (navigator as Navigator & { hid: Hid }).hid ?? null;
}

/** The browser's Gamepad API, or null where there is none. */
export function webGamepads(): (() => (Gamepad | null)[]) | null {
  if (typeof navigator === "undefined" || typeof navigator.getGamepads !== "function") return null;
  return () => {
    try {
      return Array.from(navigator.getGamepads());
    } catch {
      return [];
    }
  };
}

/** The connected game controllers that are 3D mice. */
export function spaceMousePads(): Gamepad[] {
  const read = webGamepads();
  if (!read) return [];
  return read().filter((pad): pad is Gamepad => Boolean(pad && pad.connected && isSpaceMouseGamepad(pad.id)));
}

/** Whether a HID device is a 3D mouse: a multi-axis controller. */
export function isSpaceMouse(device: Pick<HidDevice, "collections">) {
  return device.collections.some((collection) => collection.usagePage === 0x01 && collection.usage === 0x08);
}

/** Asked for when a 3D mouse was allowed in the settings, so the open editor takes it up at once. */
const SPACE_MOUSE_EVENT = "layerling:spacemouse";

/**
 * Lets the person pick their 3D mouse in the browser's own dialog (it needs a click), and returns its name, or null when
 * none was picked. The browser remembers the choice for this site, so later visits find it without asking.
 */
export async function connectSpaceMouse(): Promise<string | null> {
  const hid = webHid();
  if (!hid) return null;
  const [device] = await hid.requestDevice({ filters: SPACE_MOUSE_FILTERS });
  if (!device) return null;
  window.dispatchEvent(new Event(SPACE_MOUSE_EVENT));
  return device.productName || "3D mouse";
}

/** Sent when the editor took up or lost a 3D mouse over WebHID, so the settings show which way it is read. */
export const SPACE_MOUSE_WAY_EVENT = "layerling:spacemouse-way";

/**
 * The way the 3D mouse is read right now (#1871): over WebHID when the site holds one open, else as a game controller when
 * the browser shows one, else over WebHID when the site may use one; null with no mouse at all. The editor reads it the
 * same way: WebHID first, the game controller only without it.
 */
export async function spaceMouseWay(): Promise<SpaceMouseWay | null> {
  let allowed: HidDevice[] = [];
  try {
    allowed = ((await webHid()?.getDevices()) ?? []).filter(isSpaceMouse);
  } catch {
    // No device over WebHID.
  }
  if (allowed.some((device) => device.opened)) return "hid";
  if (spaceMousePads().length) return "pad";
  return allowed.length ? "hid" : null;
}

/** The names of the 3D mice this site may already use. */
export async function knownSpaceMice(): Promise<string[]> {
  const names: string[] = [];
  const hid = webHid();
  if (hid) {
    try {
      (await hid.getDevices()).filter(isSpaceMouse).forEach((device) => names.push(device.productName || "3D mouse"));
    } catch {
      // No device to name.
    }
  }
  // Found as a game controller too (#1013): its name, up to the bracket the browser adds ("SpaceMouse Compact (Vendor: ...").
  spaceMousePads().forEach((pad) => {
    const name = pad.id.replace(/\s*\(.*$/, "").trim() || "3D mouse";
    if (!names.includes(name)) names.push(name);
  });
  return names;
}

/**
 * Steers the 3D view with a 3D mouse the site may use (#1013): the cap's last position is applied every frame while it is
 * held off its rest, scaled by the time that passed, so the view moves as smoothly as the screen draws. Only a visible tab
 * moves its view; a turn of the view cube still running gives way.
 */
export function useSpaceMouse(threeRef: RefObject<ThreeState | null>) {
  useEffect(() => {
    const hid = webHid();
    if (!hid && !webGamepads()) return;
    let axes: SpaceMouseAxes = SPACE_MOUSE_REST;
    // What the view is moved by: the cap's axes smoothed over a few hundredths of a second (#1013).
    let smoothed: SpaceMouseAxes = SPACE_MOUSE_REST;
    // Where the axes came from last: each way of reading the mouse has its own reversed directions (#1871).
    let way: SpaceMouseWay = "hid";
    let invert = { hid: readSpaceMouseInvert("hid"), pad: readSpaceMouseInvert("pad") };
    let speed = spaceMouseSpeedFactor(readSpaceMouseSpeed());
    const onInvert = () => {
      invert = { hid: readSpaceMouseInvert("hid"), pad: readSpaceMouseInvert("pad") };
      speed = spaceMouseSpeedFactor(readSpaceMouseSpeed());
    };
    let frame = 0;
    let last = 0;
    let disposed = false;
    const devices = new Set<HidDevice>();
    const step = (now: number) => {
      frame = 0;
      const seconds = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      const state = threeRef.current;
      if (!state || document.visibilityState !== "visible") {
        smoothed = SPACE_MOUSE_REST;
        return;
      }
      smoothed = smoothSpaceMouseAxes(smoothed, axes, seconds);
      if (moveCameraBySpaceMouse(state.camera, state.controls.target, smoothed, seconds, invert[way], speed)) {
        state.cameraTurn = null;
        state.controls.update();
        state.needsRender = true;
      }
      // While the cap is held the smoothed axes may still lie inside the rest band for a frame or two: keep going.
      if (smoothed !== SPACE_MOUSE_REST) frame = requestAnimationFrame(step);
    };
    const onReport = (event: Event) => {
      const report = event as HidInputReportEvent;
      axes = readSpaceMouseReport(axes, report.reportId, report.data);
      way = "hid";
      if (!frame) {
        last = performance.now();
        frame = requestAnimationFrame(step);
      }
    };
    const attach = async (device: HidDevice) => {
      if (disposed || devices.has(device) || !isSpaceMouse(device)) return;
      try {
        if (!device.opened) await device.open();
      } catch {
        // Held by another program, or unplugged meanwhile: the next scan tries again.
        return;
      }
      if (disposed) return;
      devices.add(device);
      device.addEventListener("inputreport", onReport);
      window.dispatchEvent(new Event(SPACE_MOUSE_WAY_EVENT));
    };
    const scan = () => {
      hid?.getDevices().then((list) => list.forEach((device) => void attach(device))).catch(() => {});
    };
    // The same mouse as a game controller (#1013): the browser shows it with no question once it is moved, so it works
    // again after a restart without Connect. Read every frame while it is there, unless WebHID has the mouse already.
    let padFrame = 0;
    const padPoll = () => {
      padFrame = 0;
      if (disposed) return;
      const pad = spaceMousePads()[0];
      if (!pad) {
        if (!devices.size) axes = SPACE_MOUSE_REST;
        return;
      }
      padFrame = requestAnimationFrame(padPoll);
      if (devices.size) return;
      axes = readSpaceMouseGamepad(pad.axes);
      way = "pad";
      if (!frame && spaceMouseMoving(axes)) {
        last = performance.now();
        frame = requestAnimationFrame(step);
      }
    };
    const startPads = () => {
      if (!padFrame && spaceMousePads().length) padFrame = requestAnimationFrame(padPoll);
    };
    startPads();
    window.addEventListener("gamepadconnected", startPads);
    const onConnect = (event: Event) => {
      const device = (event as Event & { device?: HidDevice }).device;
      if (device) void attach(device);
    };
    const onDisconnect = (event: Event) => {
      const device = (event as Event & { device?: HidDevice }).device;
      if (!device || !devices.has(device)) return;
      device.removeEventListener("inputreport", onReport);
      devices.delete(device);
      axes = SPACE_MOUSE_REST;
      window.dispatchEvent(new Event(SPACE_MOUSE_WAY_EVENT));
    };
    scan();
    hid?.addEventListener("connect", onConnect);
    hid?.addEventListener("disconnect", onDisconnect);
    window.addEventListener(SPACE_MOUSE_EVENT, scan);
    window.addEventListener(SPACE_MOUSE_INVERT_EVENT, onInvert);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      cancelAnimationFrame(padFrame);
      window.removeEventListener("gamepadconnected", startPads);
      hid?.removeEventListener("connect", onConnect);
      hid?.removeEventListener("disconnect", onDisconnect);
      window.removeEventListener(SPACE_MOUSE_EVENT, scan);
      window.removeEventListener(SPACE_MOUSE_INVERT_EVENT, onInvert);
      devices.forEach((device) => {
        device.removeEventListener("inputreport", onReport);
        void device.close().catch(() => {});
      });
    };
  }, [threeRef]);
}
