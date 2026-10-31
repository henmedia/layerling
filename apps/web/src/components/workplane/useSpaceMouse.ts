import { useEffect, type RefObject } from "react";
import { moveCameraBySpaceMouse, readSpaceMouseReport, SPACE_MOUSE_FILTERS, SPACE_MOUSE_REST, type SpaceMouseAxes } from "@/lib/spaceMouse";
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

/** The names of the 3D mice this site may already use. */
export async function knownSpaceMice(): Promise<string[]> {
  const hid = webHid();
  if (!hid) return [];
  try {
    return (await hid.getDevices()).filter(isSpaceMouse).map((device) => device.productName || "3D mouse");
  } catch {
    return [];
  }
}

/**
 * Steers the 3D view with a 3D mouse the site may use (#1013): the cap's last position is applied every frame while it is
 * held off its rest, scaled by the time that passed, so the view moves as smoothly as the screen draws. Only a visible tab
 * moves its view; a turn of the view cube still running gives way.
 */
export function useSpaceMouse(threeRef: RefObject<ThreeState | null>) {
  useEffect(() => {
    const hid = webHid();
    if (!hid) return;
    let axes: SpaceMouseAxes = SPACE_MOUSE_REST;
    let frame = 0;
    let last = 0;
    let disposed = false;
    const devices = new Set<HidDevice>();
    const step = (now: number) => {
      frame = 0;
      const seconds = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      const state = threeRef.current;
      if (!state || document.visibilityState !== "visible") return;
      if (!moveCameraBySpaceMouse(state.camera, state.controls.target, axes, seconds)) return;
      state.cameraTurn = null;
      state.controls.update();
      state.needsRender = true;
      frame = requestAnimationFrame(step);
    };
    const onReport = (event: Event) => {
      const report = event as HidInputReportEvent;
      axes = readSpaceMouseReport(axes, report.reportId, report.data);
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
    };
    const scan = () => {
      hid.getDevices().then((list) => list.forEach((device) => void attach(device))).catch(() => {});
    };
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
    };
    scan();
    hid.addEventListener("connect", onConnect);
    hid.addEventListener("disconnect", onDisconnect);
    window.addEventListener(SPACE_MOUSE_EVENT, scan);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      hid.removeEventListener("connect", onConnect);
      hid.removeEventListener("disconnect", onDisconnect);
      window.removeEventListener(SPACE_MOUSE_EVENT, scan);
      devices.forEach((device) => {
        device.removeEventListener("inputreport", onReport);
        void device.close().catch(() => {});
      });
    };
  }, [threeRef]);
}
