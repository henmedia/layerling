"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { DEFAULT_LEAF_POINTS, patternPreview } from "@/lib/vase/vase-patterns.mjs";
import { vaseSettingsKey } from "@/lib/vaseSettings";

/*
 * The pieces of a vase's pattern card that are drawn rather than listed: the pictures on the pattern tiles and the
 * small board for one's own leaf. The tiles are shaded from the very height fields the core builds the vase from, so
 * a tile shows what the vase will get.
 */

/** A tile's picture, shaded from heights 0..1 with the light from the upper left, kept per pattern and setting. */
const tileCache = new Map<string, string>();

function shadedTile(settings: Record<string, unknown>, key: string, size: number) {
  const known = tileCache.get(key);
  if (known) return known;
  if (typeof document === "undefined") return "";
  const heights = patternPreview(settings, size, size);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) return "";
  const image = context.createImageData(size, size);
  const at = (i: number, j: number) => heights[Math.min(size - 1, Math.max(0, j)) * size + ((i + size) % size)];
  const light = [-0.55, 0.62, 0.56];
  for (let j = 0; j < size; j += 1) {
    for (let i = 0; i < size; i += 1) {
      // Row 0 is the bottom of the vase: drawn at the bottom of the tile.
      const dx = (at(i + 1, j) - at(i - 1, j)) * 3.2;
      const dy = (at(i, j + 1) - at(i, j - 1)) * 3.2;
      const length = Math.hypot(dx, dy, 1);
      const lit = Math.max(0, (-dx * light[0] - dy * light[1] + light[2]) / length);
      const h = at(i, j);
      const shade = (0.38 + 0.62 * lit) * (0.72 + 0.28 * h);
      const offset = ((size - 1 - j) * size + i) * 4;
      image.data[offset] = Math.round(236 * shade);
      image.data[offset + 1] = Math.round(226 * shade);
      image.data[offset + 2] = Math.round(208 * shade);
      image.data[offset + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  const url = canvas.toDataURL("image/png");
  tileCache.set(key, url);
  while (tileCache.size > 160) tileCache.delete(tileCache.keys().next().value as string);
  return url;
}

/** A pattern's picture as an image; empty until it is drawn in the browser. */
export function PatternPicture({ settings, size = 56 }: { settings: Record<string, unknown>; size?: number }) {
  const [url, setUrl] = useState("");
  // One's own picture stands in the key by a short name, not by all its grey values.
  const key = `${vaseSettingsKey(settings)}@${size}`;
  const latest = useRef(settings);
  latest.current = settings;
  useEffect(() => {
    setUrl(shadedTile(latest.current, key, size));
  }, [key, size]);
  return url ? <img className="vase-tile-picture" src={url} alt="" width={size} height={size} draggable={false} /> : <span className="vase-tile-picture" aria-hidden="true" />;
}

/**
 * One's own leaf: half its outline as points from the base (bottom) to the tip (top), mirrored to a whole leaf. A point
 * is dragged to change the width there and how far up it sits; the base and the tip stay at the ends.
 */
export function LeafEditor({
  points,
  disabled,
  labels,
  onChange,
  onInteractionActiveChange,
}: {
  points: number[][] | null;
  disabled?: boolean;
  labels: { title: string; hint: string; reset: string };
  onChange: (points: number[][] | null) => void;
  onInteractionActiveChange?: (active: boolean) => void;
}) {
  const own = points ?? DEFAULT_LEAF_POINTS.map((point) => [...point]);
  const [draft, setDraft] = useState<number[][] | null>(null);
  const shown = draft ?? own;
  const board = useRef<SVGSVGElement | null>(null);
  const dragging = useRef<number | null>(null);
  // A drag that never ends here (the card goes away under the pointer) must not leave the editor waiting for it:
  // saving is refused while a drag is under way.
  const interactionChange = useRef(onInteractionActiveChange);
  interactionChange.current = onInteractionActiveChange;
  useEffect(() => () => {
    if (dragging.current !== null) interactionChange.current?.(false);
  }, []);
  const width = 120;
  const height = 150;
  const margin = 12;
  const toScreen = ([t, w]: number[]) => [width / 2 + w * (width / 2 - margin), height - margin - t * (height - 2 * margin)];
  const outline = useMemo(() => {
    const right = shown.map(toScreen);
    const left = [...shown].reverse().map(([t, w]) => toScreen([t, -w]));
    return `M${[...right, ...left].map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" L")} Z`;
    // toScreen only depends on the constants above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown]);
  const move = (event: ReactPointerEvent<SVGSVGElement>) => {
    const index = dragging.current;
    if (index === null || !board.current) return;
    const box = board.current.getBoundingClientRect();
    const x = ((event.clientX - box.left) / box.width) * width;
    const y = ((event.clientY - box.top) / box.height) * height;
    const w = Math.min(1, Math.max(0, (x - width / 2) / (width / 2 - margin)));
    let t = Math.min(1, Math.max(0, (height - margin - y) / (height - 2 * margin)));
    if (index === 0) t = 0;
    else if (index === shown.length - 1) t = 1;
    else t = Math.min(shown[index + 1][0] - 0.02, Math.max(shown[index - 1][0] + 0.02, t));
    setDraft(shown.map((point, k) => (k === index ? [Math.round(t * 1000) / 1000, Math.round(w * 1000) / 1000] : point)));
  };
  const stop = () => {
    if (dragging.current === null) return;
    dragging.current = null;
    onInteractionActiveChange?.(false);
    if (draft) onChange(draft);
    setDraft(null);
  };
  return (
    <div className="vase-leaf-editor">
      <div className="vase-leaf-head">
        <span>{labels.title}</span>
        <button type="button" className="vase-link-button" disabled={disabled || !points} onClick={() => onChange(null)}>{labels.reset}</button>
      </div>
      <svg ref={board} viewBox={`0 0 ${width} ${height}`} onPointerMove={move} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop} onLostPointerCapture={stop} aria-label={labels.title}>
        <line className="vase-leaf-axis" x1={width / 2} x2={width / 2} y1={margin - 4} y2={height - margin + 4} />
        <path className="vase-leaf-outline" d={outline} />
        {shown.map((point, index) => {
          const [x, y] = toScreen(point);
          return (
            <circle
              key={index}
              className="vase-leaf-point"
              cx={x}
              cy={y}
              r={5}
              onPointerDown={(event) => {
                if (disabled) return;
                event.currentTarget.ownerSVGElement?.setPointerCapture(event.pointerId);
                dragging.current = index;
                onInteractionActiveChange?.(true);
              }}
            />
          );
        })}
      </svg>
      <p className="cylinder-wrap-hint">{labels.hint}</p>
    </div>
  );
}
