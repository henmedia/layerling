import { useEffect, useMemo, useRef, useState } from "react";
import { picturePixels } from "@/lib/pictureIcon";
import {
  defaultTraceSettings,
  preparePicture,
  tracePicture,
  traceRange,
  type PictureTrace,
  type PictureTraceRange,
  type PictureTraceSettings,
  type PreparedPicture,
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
};

/**
 * Trace for the selected reference image, while `active`: reads its picture once (the part it shows),
 * starts from the settings that suit it and traces it again whenever they change. The number of points
 * follows the suggested one until it is set by hand, and stays within what the other settings allow.
 */
export function useSketchImageTrace(image: SketchImage | null, active: boolean): SketchImageTraceState {
  const key = active && image ? `${image.id}:${image.dataUrl.length}:${image.dataUrl.slice(-48)}:${JSON.stringify(image.crop ?? null)}` : null;
  const [picture, setPicture] = useState<{ key: string; prepared: PreparedPicture | null; failed?: boolean } | null>(null);
  const [settings, setSettings] = useState<PictureTraceSettings | null>(null);
  const [trace, setTrace] = useState<PictureTrace | null>(null);
  const pointsSetRef = useRef(false);
  const dataUrl = image?.dataUrl;
  const crop = image?.crop;

  useEffect(() => {
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
  const shapeSettings = settings ? { part: settings.part, threshold: settings.threshold, cornerAngle: settings.cornerAngle, speck: settings.speck, holes: settings.holes } : null;
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
    const timer = window.setTimeout(() => setTrace(tracePicture(prepared, { ...shapeSettings, points })), TRACE_PAUSE);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prepared, shapeKey, points]);

  return {
    loading: Boolean(key) && !prepared && !current?.failed,
    failed: Boolean(current?.failed),
    settings: settings ? { ...settings, points } : null,
    range,
    trace,
    size: prepared ? { width: prepared.width, height: prepared.height } : null,
    change: (patch) => {
      if (patch.points !== undefined) pointsSetRef.current = true;
      setSettings((current) => (current ? { ...current, ...patch } : current));
    },
  };
}
