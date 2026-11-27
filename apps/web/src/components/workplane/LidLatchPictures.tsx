"use client";

import type { LidLatchStyle } from "@/lib/lidTool";

/*
 * The pictures on the tiles of the lid's latch kinds: each a side section through the box's wall and rim with the lid's
 * edge on it (the box's inside to the left, outside to the right), and the latch closed, as it holds the lid. Box, lid and
 * pins are drawn in the tile's own colour, faint; the latch's own part in the accent colour (`latch-kind-accent`), so
 * the eye goes to how it grips. Drawn as the thread tiles are, as lines rather than raster, cut to the part of the side
 * section that matters, so the latch is as large as the tile allows.
 */

const NEUTRAL = { fill: "currentColor", fillOpacity: 0.16, stroke: "currentColor", strokeWidth: 0.8, strokeLinejoin: "round" as const };
const ACCENT = { className: "latch-kind-accent", fill: "none", stroke: "currentColor", strokeWidth: 1.25, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

/** A pin seen end on. */
function Pin({ x, y, r = 1 }: { x: number; y: number; r?: number }) {
  return <circle cx={x} cy={y} r={r} fill="currentColor" fillOpacity={0.55} stroke="none" />;
}

function Box() {
  return (
    <g {...NEUTRAL}>
      {/* The wall, its outer face at x 6.5, and the lid's plate on its rim, flush with it. */}
      <path d="M2.5 24V10h4v14" />
      <path d="M0 6.5h6.5V10H0" />
    </g>
  );
}

function Latch({ kind }: { kind: LidLatchStyle }) {
  switch (kind) {
    case "clip":
      // A clip over a pin on the lid's edge and one below the rim, its tab below.
      return (
        <>
          <Pin x={9.5} y={8.3} />
          <Pin x={9.5} y={16} />
          <g {...ACCENT}>
            <rect x={7.6} y={6.3} width={3.8} height={11.8} rx={1.9} />
            <path d="M9.5 18.1v3.4" />
          </g>
        </>
      );
    case "slider":
      // A nose hanging from the lid with a pocket, a rail on the wall, and the slider in front with its tongue in the pocket.
      return (
        <>
          <g {...NEUTRAL}>
            <path d="M6.5 6.5h3.4v5.5H6.5" />
            <path d="M6.5 15h2.6v4.5H6.5" />
          </g>
          <g {...ACCENT}>
            <rect x={10.2} y={8.6} width={2.9} height={11.4} rx={0.6} />
            <path d="M10.2 10.4H8.4M11 14.2h1.3M11 16.2h1.3M11 18.2h1.3" />
          </g>
        </>
      );
    case "bolt":
      // A tube on the wall, the bolt in it pushed up into the keeper on the lid's edge, its knob turned out.
      return (
        <>
          <g {...NEUTRAL}>
            <path d="M6.5 6.5h4v4h-4" />
            <path d="M6.5 13h4v9h-4" />
          </g>
          <g {...ACCENT}>
            <rect x={7.6} y={7.6} width={1.8} height={13.2} rx={0.9} />
            <path d="M9.4 16.6h3.2" />
          </g>
        </>
      );
    case "snap":
      // A hook hanging from the lid's edge, its barb under a catch on the wall, a tab at its foot.
      return (
        <>
          <g {...NEUTRAL}>
            <path d="M6.5 12.6l1.7 1.7v1.4H6.5" />
          </g>
          <g {...ACCENT}>
            <path d="M6.5 8.2h2.9v8.1H7.7l1.7 2.1 1.7 2.4" />
          </g>
        </>
      );
    case "draw":
      // A lever on a pin below the rim lying shut along the wall, its link bowed round that pin up to a hook over the
      // pin on the lid's edge.
      return (
        <>
          <Pin x={10} y={8.4} />
          <Pin x={10} y={13.8} />
          <g {...ACCENT}>
            <circle cx={10} cy={13.8} r={2} />
            <path d="M9.2 15.6L7.8 21.4l2.3-1.2" />
            <path d="M8.4 18.6c4.6-1.4 5.6-6.4 3.4-10.4a2 2 0 0 0-3.6 0.6" />
          </g>
          <Pin x={8.4} y={18.6} r={0.7} />
        </>
      );
    case "turn":
      // A ledge on the wall below the rim, its top level with the lid's, and the bar on its pin turned over the lid's edge.
      return (
        <>
          <g {...NEUTRAL}>
            <path d="M6.5 10h0.4V6.5h5.1v2.2l-5.5 5.4" />
            <path d="M9.6 6.5V3.1" />
          </g>
          <g {...ACCENT}>
            <rect x={2.6} y={3.7} width={10.4} height={1.9} rx={0.95} />
          </g>
        </>
      );
    default:
      return null;
  }
}

/** The picture on a latch kind's tile. */
export function LidLatchPicture({ kind }: { kind: LidLatchStyle }) {
  return (
    <svg viewBox="-1 2 16 21" fill="none" aria-hidden="true" data-latch-kind={kind}>
      <Box />
      <Latch kind={kind} />
    </svg>
  );
}
