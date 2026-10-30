import { useEffect, useMemo, useRef, useState } from "react";
import { picturePixels } from "@/lib/pictureIcon";
import {
  defaultThreshold,
  defaultTraceSettings,
  preparePicture,
  tracePicture,
  traceRange,
  type PictureTrace,
  type PictureTraceRange,
  type PictureTraceSettings,
  type PreparedPicture,
  type TracePoint,
} from "@/lib/pictureTrace";
import { croppedPixels } from "@/lib/sketchImageTrace";
import type { SketchImage } from "@/types/layerling";

/** How long the settings must rest before the picture is traced again, in ms: a slider being dragged traces once it stops. */
const TRACE_PAUSE = 90;

export type SketchImageTraceState = {
  /** The picture is being read. */
  loading: boolean;
  /** The picture could not be read. */
  failed: boolean;
  settings: PictureTraceSettings | null;
  range: PictureTraceRange | null;
  trace: PictureTrace | null;
  /** The size of the traced part of the picture, in its pixels. */
  size: { width: number; height: number } | null;
  change: (patch: Partial<PictureTraceSettings>) => void;
  /** Pick areas: while on, a click on the picture adds the area of like colour there. */
  picking: boolean;
  setPicking: (picking: boolean) => void;
  /** Adds the area round a spot of the picture, in its pixels. */
  addArea: (spot: TracePoint) => void;
  /** Takes a hole or an area out of the list. */
  remove: (key: string) => void;
  /** Cut a hole or an area out (true) or draw it as a construction line. */
  setCut: (key: string, cut: boolean) => void;
  /** Brings back the holes taken out of the list. */
  restoreHoles: () => void;
  /** The hole or area pointed at in the list, shown stronger in the preview. */
  highlight: string | null;
  setHighlight: (key: string | null) => void;
  /** An area just clicked reached the picture's edge and was not taken. */
  areaRejected: boolean;
};

/**
 * Trace for the selected reference image, while `active`: reads its picture once (the part it shows),
 * starts from the settings that suit it and traces it again whenever they change. The number of points
 * follows the suggested one until it is set by hand, and stays within what the other settings allow.
 * Holes and clicked areas form a list: each can be taken out, or drawn as a construction line instead
 * of cut. An area that reaches the picture's edge is the background and is dropped again.
 */
export function useSketchImageTrace(image: SketchImage | null, active: boolean): SketchImageTraceState {
  const key = active && image ? `${image.id}:${image.dataUrl.length}:${image.dataUrl.slice(-48)}:${JSON.stringify(image.crop ?? null)}` : null;
  const [picture, setPicture] = useState<{ key: string; prepared: PreparedPicture | null; failed?: boolean } | null>(null);
  const [settings, setSettings] = useState<PictureTraceSettings | null>(null);
  const [trace, setTrace] = useState<PictureTrace | null>(null);
  const [picking, setPicking] = useState(false);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [areaRejected, setAreaRejected] = useState(false);
  const pointsSetRef = useRef(false);
  const areaCountRef = useRef(0);
  const dataUrl = image?.dataUrl;
  const crop = image?.crop;

  useEffect(() => {
    setPicking(false);
    setHighlight(null);
    setAreaRejected(false);
    if (!key || !dataUrl) {
      setPicture(null);
      setSettings(null);
      setTrace(null);
      return;
    }
    let cancelled = false;
    pointsSetRef.current = false;
    setPicture({ key, prepared: null });
    setSettings(null);
    setTrace(null);
    picturePixels(dataUrl)
      .then((pixels) => {
        if (cancelled) return;
        const prepared = preparePicture(croppedPixels(pixels, crop));
        setPicture({ key, prepared });
        setSettings(defaultTraceSettings(prepared));
      })
      .catch(() => {
        if (!cancelled) setPicture({ key, prepared: null, failed: true });
      });
    return () => {
      cancelled = true;
    };
    // The key holds what matters of the picture and its crop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const current = key && picture?.key === key ? picture : null;
  const prepared = current?.prepared ?? null;
  const shapeSettings = useMemo(() => {
    if (!settings) return null;
    const { points: _points, ...rest } = settings;
    return rest;
  }, [settings]);
  const shapeKey = shapeSettings ? JSON.stringify(shapeSettings) : "";
  const range = useMemo(
    () => (prepared && shapeSettings ? traceRange(prepared, shapeSettings) : null),
    // shapeKey stands for the settings other than the number of points.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [prepared, shapeKey],
  );
  const points = settings && range
    ? pointsSetRef.current ? Math.min(range.most, Math.max(range.fewest, settings.points)) : range.suggested
    : 0;

  useEffect(() => {
    if (!prepared || !shapeSettings) return;
    const timer = window.setTimeout(() => {
      const next = tracePicture(prepared, { ...shapeSettings, points });
      setTrace(next);
      // An area on the background (it reaches the edge) is no area of the object: it goes again, and the card says so.
      if (next.rejected?.length) {
        const rejected = new Set(next.rejected);
        setAreaRejected(true);
        setSettings((value) => (value ? { ...value, areas: (value.areas ?? []).filter((area) => !rejected.has(area.id)) } : value));
      }
    }, TRACE_PAUSE);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prepared, shapeKey, points]);

  const patch = (change: Partial<PictureTraceSettings> | ((value: PictureTraceSettings) => Partial<PictureTraceSettings>)) =>
    setSettings((value) => (value ? { ...value, ...(typeof change === "function" ? change(value) : change) } : value));

  return {
    loading: Boolean(key) && !prepared && !current?.failed,
    failed: Boolean(current?.failed),
    settings: settings ? { ...settings, points } : null,
    range,
    trace,
    size: prepared ? { width: prepared.width, height: prepared.height } : null,
    change: (change) => {
      if (change.points !== undefined) pointsSetRef.current = true;
      // Another part has a threshold of its own, and its holes other keys.
      if (change.part !== undefined && prepared && settings && change.part !== settings.part) {
        patch({ ...change, threshold: defaultThreshold(prepared, change.part), removed: [], lines: [] });
        return;
      }
      patch(change);
    },
    picking,
    setPicking: (on) => {
      setPicking(on);
      setAreaRejected(false);
    },
    addArea: (spot) => {
      areaCountRef.current += 1;
      const id = `${Date.now().toString(36)}-${areaCountRef.current}`;
      setAreaRejected(false);
      patch((value) => ({ areas: [...(value.areas ?? []), { id, x: Math.round(spot.x * 10) / 10, y: Math.round(spot.y * 10) / 10 }] }));
    },
    remove: (ringKey) => {
      if (highlight === ringKey) setHighlight(null);
      patch((value) => ringKey.startsWith("a:")
        ? { areas: (value.areas ?? []).filter((area) => `a:${area.id}` !== ringKey), lines: (value.lines ?? []).filter((entry) => entry !== ringKey) }
        : { removed: [...(value.removed ?? []), ringKey] });
    },
    setCut: (ringKey, cut) => patch((value) => {
      const lines = (value.lines ?? []).filter((entry) => entry !== ringKey);
      return { lines: cut ? lines : [...lines, ringKey] };
    }),
    restoreHoles: () => patch({ removed: [] }),
    highlight,
    setHighlight,
    areaRejected,
  };
}
