import { useEffect, useMemo, useRef, useState } from "react";
import { edgePath, snapToEdge } from "@/lib/pictureEdgePath";
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

/** What clicks on the picture draw: a region cut away by its corners (Cut away), or one the magnetic lasso lays along the edges. */
export type TraceDrawing = "cut" | "lasso";

const rounded = (spot: TracePoint): TracePoint => ({ x: Math.round(spot.x * 10) / 10, y: Math.round(spot.y * 10) / 10 });

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
  /**
   * What clicks on the picture draw, if anything: the corners of a part to cut away, or a line the
   * magnetic lasso lays along the edges between them.
   */
  drawing: TraceDrawing | null;
  setDrawing: (drawing: TraceDrawing | null) => void;
  /** The spots clicked so far (for the lasso, moved onto the edge), in the picture's pixels. */
  anchors: TracePoint[];
  /** The line laid so far through them: the corners, or the lasso's way along the edges. */
  draft: TracePoint[];
  /** The line on from the last spot to the pointer, as the next click would lay it. */
  hover: TracePoint[];
  addDraftPoint: (spot: TracePoint) => void;
  /** The pointer over the picture (null when it left), for the line on to it. */
  hoverDraft: (spot: TracePoint | null) => void;
  /** Closes the line into a region (three spots at least): the lasso's back to its first spot along the edge. */
  closeDraft: () => void;
  /** Throws away the line laid so far. */
  discardDraft: () => void;
  /** Takes a region drawn by hand out of the list. */
  removeRegion: (id: string) => void;
  /** Takes a region into the shape (true) or cuts it away. */
  setRegionAdd: (id: string, add: boolean) => void;
};

/**
 * Trace for the selected reference image, while `active`: reads its picture once (the part it shows),
 * starts from the settings that suit it and traces it again whenever they change. The number of points
 * follows the suggested one until it is set by hand, and stays within what the other settings allow.
 * Holes and clicked areas form a list: each can be taken out, or drawn as a construction line instead
 * of cut. An area that reaches the picture's edge is the background and is dropped again. Regions drawn
 * by hand - corners clicked, or the magnetic lasso's line along the edges - are cut away or taken in.
 */
export function useSketchImageTrace(image: SketchImage | null, active: boolean): SketchImageTraceState {
  const key = active && image ? `${image.id}:${image.dataUrl.length}:${image.dataUrl.slice(-48)}:${JSON.stringify(image.crop ?? null)}` : null;
  const [picture, setPicture] = useState<{ key: string; prepared: PreparedPicture | null; failed?: boolean } | null>(null);
  const [settings, setSettings] = useState<PictureTraceSettings | null>(null);
  const [trace, setTrace] = useState<PictureTrace | null>(null);
  const [picking, setPicking] = useState(false);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [areaRejected, setAreaRejected] = useState(false);
  const [drawing, setDrawingState] = useState<TraceDrawing | null>(null);
  const [anchors, setAnchors] = useState<TracePoint[]>([]);
  const [draft, setDraft] = useState<TracePoint[]>([]);
  const [hover, setHover] = useState<TracePoint[]>([]);
  const hoverRef = useRef<{ spot: TracePoint | null; frame: number }>({ spot: null, frame: 0 });
  const pointsSetRef = useRef(false);
  const areaCountRef = useRef(0);
  const dataUrl = image?.dataUrl;
  const crop = image?.crop;

  const clearDraft = () => {
    window.cancelAnimationFrame(hoverRef.current.frame);
    hoverRef.current = { spot: null, frame: 0 };
    setAnchors([]);
    setDraft([]);
    setHover([]);
  };

  useEffect(() => {
    setPicking(false);
    setDrawingState(null);
    clearDraft();
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
  const nextId = () => {
    areaCountRef.current += 1;
    return `${Date.now().toString(36)}-${areaCountRef.current}`;
  };
  const setDrawing = (next: TraceDrawing | null) => {
    setDrawingState(next);
    clearDraft();
    if (next) setPicking(false);
  };
  // The lasso's way from one spot to the next, along the edge; corners are joined straight.
  const wayTo = (from: TracePoint, to: TracePoint) => (drawing === "lasso" && prepared ? edgePath(prepared, from, to).map(rounded) : [from, to]);
  const spotFor = (spot: TracePoint) => rounded(drawing === "lasso" && prepared ? snapToEdge(prepared, spot) : spot);

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
        // Lasso only with nothing taken in yet: the lasso is what comes next.
        if (change.part === "lasso" && !(settings.regions ?? []).some((region) => region.add)) setDrawing("lasso");
        return;
      }
      patch(change);
    },
    picking,
    setPicking: (on) => {
      setPicking(on);
      setAreaRejected(false);
      if (on) {
        setDrawingState(null);
        clearDraft();
      }
    },
    addArea: (spot) => {
      const id = nextId();
      setAreaRejected(false);
      patch((value) => ({ areas: [...(value.areas ?? []), { id, ...rounded(spot) }] }));
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
    drawing,
    setDrawing,
    anchors,
    draft,
    hover,
    addDraftPoint: (spot) => {
      const at = spotFor(spot);
      const last = anchors[anchors.length - 1];
      if (last && last.x === at.x && last.y === at.y) return;
      // A way to the pointer still being looked for runs from the spot before.
      window.cancelAnimationFrame(hoverRef.current.frame);
      hoverRef.current.frame = 0;
      setAnchors([...anchors, at]);
      setDraft(last ? [...draft, ...wayTo(last, at).slice(1)] : [at]);
      setHover([]);
    },
    hoverDraft: (spot) => {
      const state = hoverRef.current;
      state.spot = spot;
      if (!spot) {
        window.cancelAnimationFrame(state.frame);
        state.frame = 0;
        setHover([]);
        return;
      }
      // Once a frame at most: the lasso's way is looked for anew each time.
      if (state.frame) return;
      const from = anchors[anchors.length - 1];
      state.frame = window.requestAnimationFrame(() => {
        state.frame = 0;
        if (!from || !state.spot) return;
        setHover(wayTo(from, spotFor(state.spot)));
      });
    },
    closeDraft: () => {
      if (anchors.length < 3 || !drawing) return;
      const back = wayTo(anchors[anchors.length - 1], anchors[0]).slice(1, -1);
      const points = [...draft, ...back];
      const id = nextId();
      const lasso = drawing === "lasso";
      clearDraft();
      patch((value) => ({ regions: [...(value.regions ?? []), { id, points, ...(lasso ? { add: true, lasso: true } : {}) }] }));
    },
    discardDraft: clearDraft,
    removeRegion: (id) => {
      if (highlight === `r:${id}`) setHighlight(null);
      patch((value) => ({ regions: (value.regions ?? []).filter((region) => region.id !== id) }));
    },
    setRegionAdd: (id, add) => patch((value) => ({
      regions: (value.regions ?? []).map((region) => (region.id === id ? { ...region, add: add || undefined } : region)),
    })),
  };
}
