import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

/**
 * The Layerling toolbar set. Every mark is drawn from the same parts: a 2.6
 * outline in `currentColor` so a tool takes the colour of the group it sits in,
 * and a faint fill of the same colour where a shape needs body. The PNG set this
 * replaced could only ever be grey.
 */
function ToolbarVectorIcon({ className, children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={["toolbar-vector-art-icon", className].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </svg>
  );
}

const SOLID = { fill: "currentColor", opacity: 0.14, stroke: "none" } as const;

export function ToolbarHomeIcon(props: IconProps) {
  return (
    <ToolbarVectorIcon {...props}>
      <path d="M9 22 24 10l15 12v15a2 2 0 0 1-2 2H11a2 2 0 0 1-2-2Z" {...SOLID} />
      <path d="M9 22 24 10l15 12v15a2 2 0 0 1-2 2H11a2 2 0 0 1-2-2Z" />
      <path d="M20 39V28h8v11" />
    </ToolbarVectorIcon>
  );
}

export function ToolbarCopyIcon(props: IconProps) {
  return (
    <ToolbarVectorIcon {...props}>
      <rect x="17" y="8" width="21" height="26" rx="3" {...SOLID} />
      <rect x="17" y="8" width="21" height="26" rx="3" />
      <path d="M31 40H13a3 3 0 0 1-3-3V16" />
    </ToolbarVectorIcon>
  );
}

export function ToolbarPasteIcon(props: IconProps) {
  return (
    <ToolbarVectorIcon {...props}>
      <path d="M14 11h20a2 2 0 0 1 2 2v25a2 2 0 0 1-2 2H14a2 2 0 0 1-2-2V13a2 2 0 0 1 2-2Z" {...SOLID} />
      <path d="M14 11h20a2 2 0 0 1 2 2v25a2 2 0 0 1-2 2H14a2 2 0 0 1-2-2V13a2 2 0 0 1 2-2Z" />
      <path d="M19 11V9a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2Z" />
      <path d="M19 24h10M19 31h10" />
    </ToolbarVectorIcon>
  );
}

export function ToolbarDuplicateIcon(props: IconProps) {
  return (
    <ToolbarVectorIcon {...props}>
      <rect x="8" y="8" width="20" height="20" rx="3" />
      <rect x="20" y="20" width="20" height="20" rx="3" {...SOLID} />
      <rect x="20" y="20" width="20" height="20" rx="3" />
    </ToolbarVectorIcon>
  );
}

export function ToolbarTrashIcon(props: IconProps) {
  return (
    <ToolbarVectorIcon {...props}>
      <path d="M12 15h24l-2 23a3 3 0 0 1-3 3H17a3 3 0 0 1-3-3Z" {...SOLID} />
      <path d="M12 15h24l-2 23a3 3 0 0 1-3 3H17a3 3 0 0 1-3-3Z" />
      <path d="M19 15v-4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v4M21 23v11M27 23v11" />
    </ToolbarVectorIcon>
  );
}

export function ToolbarUndoIcon(props: IconProps) {
  return (
    <ToolbarVectorIcon {...props}>
      <path d="M13 21h17a9 9 0 0 1 0 18h-9" />
      <path d="M19 14l-7 7 7 7" />
    </ToolbarVectorIcon>
  );
}

/** A clock turned back: the history view, which looks at earlier states without changing anything. */
export function ToolbarHistoryIcon(props: IconProps) {
  return (
    <ToolbarVectorIcon {...props}>
      <circle cx="24.5" cy="25" r="13" {...SOLID} />
      <path d="M11.5 25a13 13 0 1 0 3.8-9.2" />
      <path d="M11 11v8h8" />
      <path d="M24.5 18v7.5l5.5 3.5" />
    </ToolbarVectorIcon>
  );
}

export function ToolbarRedoIcon(props: IconProps) {
  return (
    <ToolbarVectorIcon {...props}>
      <path d="M35 21H18a9 9 0 0 0 0 18h9" />
      <path d="M29 14l7 7-7 7" />
    </ToolbarVectorIcon>
  );
}

/**
 * Die Notiz: ein Zettel mit umgeschlagener Ecke und zwei Zeilen darauf. Die
 * Ecke ist das, was ihn von jedem anderen Rechteck im Satz unterscheidet.
 */
export function ToolbarNoteIcon(props: IconProps) {
  return (
    <ToolbarVectorIcon {...props}>
      <path d="M11 10h17l9 9v19a3 3 0 0 1-3 3H11a3 3 0 0 1-3-3V13a3 3 0 0 1 3-3Z" {...SOLID} />
      <path d="M11 10h17l9 9v19a3 3 0 0 1-3 3H11a3 3 0 0 1-3-3V13a3 3 0 0 1 3-3Z" />
      <path d="M28 10v9h9" />
      <path d="M15 27h15M15 33h10" />
    </ToolbarVectorIcon>
  );
}

/**
 * The attachments: a paperclip, the mark everyone knows for a file that travels with something else.
 * It is a line without a body, so it carries no faint fill; the note's sheet stays the note's.
 */
export function ToolbarAttachmentsIcon(props: IconProps) {
  return (
    <ToolbarVectorIcon {...props}>
      <path d="M37.5 19.3l-16.1 16.1a10.5 10.5 0 0 1 -14.9 -14.9l15 -15A7 7 0 1 1 31.5 15.5l-15 15a3.5 3.5 0 0 1 -5 -5l14.9 -14.8" />
    </ToolbarVectorIcon>
  );
}

/**
 * Importieren und Exportieren sind zwei Würfel mit einem Pfeil, der schräg darauf
 * zeigt oder davon weg zeigt. Ein Pfeil nach unten oder oben las sich bei beiden
 * als "herunterladen" und war leicht zu verwechseln; hier sagt die Richtung zum
 * Körper hin oder von ihm weg, was mit der Datei geschieht, und der Körper sagt,
 * dass es ein Modell ist. Die Diagonale nutzt die ganze Höhe, und der Pfeil
 * lässt einen Spalt zum Würfel, damit Spitze und Kante nicht verschmelzen.
 */
const MODEL_RIGHT = "M29 16l12.1 7v14L29 44l-12.1-7V23Z";
const MODEL_LEFT = "M19 16l12.1 7v14L19 44 6.9 37V23Z";

export function ToolbarImportIcon(props: IconProps) {
  return (
    <ToolbarVectorIcon {...props}>
      <path d={MODEL_RIGHT} {...SOLID} />
      <path d={MODEL_RIGHT} />
      <path d="M29 30l-12.1-7M29 30l12.1-7M29 30v14" />
      <path d="M5 4l13 13M11 17h7v-7" />
    </ToolbarVectorIcon>
  );
}

export function ToolbarVectorExportIcon(props: IconProps) {
  return (
    <ToolbarVectorIcon {...props}>
      <path d={MODEL_LEFT} {...SOLID} />
      <path d={MODEL_LEFT} />
      <path d="M19 30 6.9 23M19 30l12.1-7M19 30v14" />
      <path d="M32 19L44 7M37 7h7v7" />
    </ToolbarVectorIcon>
  );
}

export function ToolbarExportIcon(props: IconProps) {
  return <ToolbarVectorExportIcon {...props} />;
}

/**
 * A cog with eight short, wide teeth on a solid body. The first draft put thin
 * rays around a circle, which reads as a sun rather than a setting.
 */
const GEAR_BODY = "M20.67 5.09 A19.2 19.2 0 0 1 27.33 5.09 L26.54 9.62 A14.6 14.6 0 0 1 32.37 12.04 L35.01 8.27 A19.2 19.2 0 0 1 39.73 12.99 L35.96 15.63 A14.6 14.6 0 0 1 38.38 21.46 L42.91 20.67 A19.2 19.2 0 0 1 42.91 27.33 L38.38 26.54 A14.6 14.6 0 0 1 35.96 32.37 L39.73 35.01 A19.2 19.2 0 0 1 35.01 39.73 L32.37 35.96 A14.6 14.6 0 0 1 26.54 38.38 L27.33 42.91 A19.2 19.2 0 0 1 20.67 42.91 L21.46 38.38 A14.6 14.6 0 0 1 15.63 35.96 L12.99 39.73 A19.2 19.2 0 0 1 8.27 35.01 L12.04 32.37 A14.6 14.6 0 0 1 9.62 26.54 L5.09 27.33 A19.2 19.2 0 0 1 5.09 20.67 L9.62 21.46 A14.6 14.6 0 0 1 12.04 15.63 L8.27 12.99 A19.2 19.2 0 0 1 12.99 8.27 L15.63 12.04 A14.6 14.6 0 0 1 21.46 9.62 L20.67 5.09 Z";

export function ToolbarSettingsIcon(props: IconProps) {
  return (
    <ToolbarVectorIcon {...props}>
      <path d={GEAR_BODY} {...SOLID} />
      <path d={GEAR_BODY} strokeLinejoin="round" />
      <circle cx="24" cy="24" r="5.4" />
    </ToolbarVectorIcon>
  );
}

/** A key cap row and a space bar - the same 2.6 outline as the rest of the set. */
export function ToolbarKeyboardIcon(props: IconProps) {
  return (
    <ToolbarVectorIcon {...props}>
      <rect x="5" y="12" width="38" height="24" rx="4" {...SOLID} />
      <rect x="5" y="12" width="38" height="24" rx="4" />
      <path d="M12 19h2M20 19h2M28 19h2M36 19h2M12 25h2M20 25h2M28 25h2M36 25h2M17 31h14" />
    </ToolbarVectorIcon>
  );
}

/** An open book: the short manual, drawn in the same 2.6 outline as the rest. */
export function ToolbarGuideIcon(props: IconProps) {
  return (
    <ToolbarVectorIcon {...props}>
      <path d="M24 15c-3-2.4-7-3.6-11-3.6H7v22h6c4 0 8 1.2 11 3.6 3-2.4 7-3.6 11-3.6h6v-22h-6c-4 0-8 1.2-11 3.6Z" {...SOLID} />
      <path d="M24 15c-3-2.4-7-3.6-11-3.6H7v22h6c4 0 8 1.2 11 3.6 3-2.4 7-3.6 11-3.6h6v-22h-6c-4 0-8 1.2-11 3.6Z" />
      <path d="M24 15v21.4" />
    </ToolbarVectorIcon>
  );
}

export function ToolbarGroupIcon(props: IconProps) {
  return (
    <ToolbarVectorIcon {...props}>
      <rect x="7" y="7" width="34" height="34" rx="4" strokeDasharray="5 4" />
      <rect x="13" y="13" width="10" height="10" rx="2" {...SOLID} />
      <rect x="13" y="13" width="10" height="10" rx="2" />
      <rect x="25" y="25" width="10" height="10" rx="2" {...SOLID} />
      <rect x="25" y="25" width="10" height="10" rx="2" />
    </ToolbarVectorIcon>
  );
}

export function ToolbarBundleIcon(props: IconProps) {
  return (
    <ToolbarVectorIcon {...props}>
      <circle cx="15" cy="27" r="8" {...SOLID} />
      <circle cx="15" cy="27" r="8" />
      <rect x="26" y="17" width="15" height="18" rx="2.5" {...SOLID} />
      <rect x="26" y="17" width="15" height="18" rx="2.5" />
      <path d="M5 13h38" />
      <path d="M24 9v8" />
    </ToolbarVectorIcon>
  );
}

export function ToolbarUngroupIcon(props: IconProps) {
  return (
    <ToolbarVectorIcon {...props}>
      <rect x="6" y="6" width="17" height="17" rx="3" {...SOLID} />
      <rect x="6" y="6" width="17" height="17" rx="3" />
      <rect x="25" y="25" width="17" height="17" rx="3" />
      <path d="M28 12h12M34 6v12" />
    </ToolbarVectorIcon>
  );
}

export function ToolbarMirrorIcon(props: IconProps) {
  return (
    <ToolbarVectorIcon {...props}>
      <path d="M24 6v36" strokeDasharray="5 4" />
      <path d="M19 13 8 24l11 11Z" {...SOLID} />
      <path d="M19 13 8 24l11 11Z" />
      <path d="M29 13 40 24 29 35Z" />
    </ToolbarVectorIcon>
  );
}

/** A turn arrow around a crosshair: the point the selection rotates about. */
export function ToolbarRotationPivotIcon(props: IconProps) {
  return (
    <ToolbarVectorIcon {...props}>
      <circle cx="24" cy="24" r="5" {...SOLID} />
      <circle cx="24" cy="24" r="5" />
      <path d="M24 15v4M24 29v4M15 24h4M29 24h4" />
      <path d="M38 17a15.5 15.5 0 1 0 1.5 11" />
      <path d="M39 10v8h-8" />
    </ToolbarVectorIcon>
  );
}

/** Three squares in a row and dots on a ring: the two kinds of pattern. */
export function ToolbarPatternIcon(props: IconProps) {
  return (
    <ToolbarVectorIcon {...props}>
      <rect x="5" y="8" width="9" height="9" rx="1.5" {...SOLID} />
      <rect x="5" y="8" width="9" height="9" rx="1.5" />
      <rect x="19.5" y="8" width="9" height="9" rx="1.5" />
      <rect x="34" y="8" width="9" height="9" rx="1.5" />
      <circle cx="24" cy="33" r="9" strokeDasharray="3 4" opacity="0.6" />
      <circle cx="24" cy="24" r="3" fill="currentColor" stroke="none" />
      <circle cx="33" cy="33" r="3" fill="currentColor" stroke="none" />
      <circle cx="24" cy="42" r="3" fill="currentColor" stroke="none" />
      <circle cx="15" cy="33" r="3" fill="currentColor" stroke="none" />
    </ToolbarVectorIcon>
  );
}

/**
 * A plate with staggered hexagonal holes: the hole pattern (#223). Three rows of two, three and
 * two holes on one hexagonal grid - every hole is the same distance from its neighbours, and the
 * plate edge keeps that distance too - and no fill, so the holes read light on the plate.
 */
export function ToolbarHolePatternIcon(props: IconProps) {
  const r = 3.5;
  const half = (Math.sqrt(3) / 2) * r;
  const pitch = 11;
  const rowStep = Math.sqrt(pitch * pitch - (pitch / 2) ** 2);
  const hexagon = (cx: number, cy: number) =>
    `M${cx} ${cy - r}l${half} ${r / 2}v${r}l${-half} ${r / 2}l${-half} ${-r / 2}v${-r}Z`;
  const holes = [
    ...[-0.5, 0.5].map((i) => [24 + i * pitch, 24 - rowStep]),
    ...[-1, 0, 1].map((i) => [24 + i * pitch, 24]),
    ...[-0.5, 0.5].map((i) => [24 + i * pitch, 24 + rowStep]),
  ];
  return (
    <ToolbarVectorIcon {...props}>
      <rect x="5" y="6" width="38" height="36" rx="3" />
      {holes.map(([x, y]) => (
        <path key={`${x}-${y}`} d={hexagon(x, y)} strokeWidth="2" />
      ))}
    </ToolbarVectorIcon>
  );
}

/** A slab with a pad set in from its edges standing on top, and an arrow out of the face: the face tool. */
export function ToolbarFaceToolIcon(props: IconProps) {
  return (
    <ToolbarVectorIcon {...props}>
      <path d="M6 28h36v13H6Z" {...SOLID} />
      <path d="M6 28h36v13H6Z" />
      <rect x="13" y="18" width="22" height="10" rx="3" {...SOLID} />
      <rect x="13" y="18" width="22" height="10" rx="3" />
      <path d="M24 14V4M19 9l5-5 5 5" />
    </ToolbarVectorIcon>
  );
}

/** A dashed line with a dot at each end: a construction line in a sketch (#229). */
export function ToolbarConstructionLineIcon(props: IconProps) {
  return (
    <ToolbarVectorIcon {...props}>
      <path d="M12 36 36 12" strokeDasharray="5 5" />
      <circle cx="10" cy="38" r="3.6" fill="currentColor" stroke="none" />
      <circle cx="38" cy="10" r="3.6" fill="currentColor" stroke="none" />
    </ToolbarVectorIcon>
  );
}

export function ToolbarMiddleLineIcon(props: IconProps) {
  return (
    <ToolbarVectorIcon {...props}>
      <path d="M8 38 40 10" />
      <circle cx="24" cy="24" r="4.6" fill="currentColor" stroke="none" />
      <path d="m8 30 0 8 8 0M40 18l0-8-8 0" />
    </ToolbarVectorIcon>
  );
}

export function ToolbarSplitIcon(props: IconProps) {
  return (
    <ToolbarVectorIcon {...props}>
      <path d="m11 17 13-7 13 7-13 7-13-7Z" {...SOLID} />
      <path d="m11 17 13-7 13 7-13 7-13-7Z" />
      <path d="m11 31 13 7 13-7" />
      <path d="M8 24h32" strokeDasharray="5 4" />
      <path d="M11 17v4m26-4v4M11 27v4m26-4v4" />
    </ToolbarVectorIcon>
  );
}

export function ToolbarChamferIcon(props: IconProps) {
  return (
    <ToolbarVectorIcon {...props}>
      <path d="M10 38V18L22 8h16v30Z" {...SOLID} />
      <path d="M10 38V18L22 8h16v30Z" />
      <path d="M10 18 22 8" strokeWidth="4" />
    </ToolbarVectorIcon>
  );
}

export function ToolbarFilletIcon(props: IconProps) {
  return (
    <ToolbarVectorIcon {...props}>
      <path d="M10 38V26C10 16 16 8 28 8h10v30Z" {...SOLID} />
      <path d="M10 38V26C10 16 16 8 28 8h10v30Z" />
      <path d="M10 26C10 16 17 8 28 8" strokeWidth="4" />
    </ToolbarVectorIcon>
  );
}

/** A cut through an open box: walls of equal thickness around the cavity. */
export function ToolbarHollowIcon(props: IconProps) {
  return (
    <ToolbarVectorIcon {...props}>
      <path d="M8 10h7v23h18V10h7v30H8Z" {...SOLID} />
      <path d="M8 10h7v23h18V10h7v30H8Z" />
    </ToolbarVectorIcon>
  );
}

/** A block inside its own outline drawn dashed a little wider: every face moved out by one distance. */
export function ToolbarOffsetIcon(props: IconProps) {
  return (
    <ToolbarVectorIcon {...props}>
      <path d="M15 17h18v18H15Z" {...SOLID} />
      <path d="M15 17h18v18H15Z" />
      <path d="M9 11h30v30H9Z" strokeDasharray="4 3" />
    </ToolbarVectorIcon>
  );
}

/** A block with a notch cut into its top edge, the dashed part that fits it beside it: one body cut out of another. */
export function ToolbarCutOutIcon(props: IconProps) {
  return (
    <ToolbarVectorIcon {...props}>
      <path d="M6 22h14v6h8v-6h14v18H6Z" {...SOLID} />
      <path d="M6 22h14v6h8v-6h14v18H6Z" />
      <path d="M20 8h8v14h-8Z" strokeDasharray="4 3" />
    </ToolbarVectorIcon>
  );
}

/** A block whose boss on top is drawn dashed: the faces that go, the top closed again. */
export function ToolbarDeleteFaceIcon(props: IconProps) {
  return (
    <ToolbarVectorIcon {...props}>
      <path d="M8 20h32v20H8Z" {...SOLID} />
      <path d="M8 20h32v20H8Z" />
      <path d="M17 20V9h14v11" strokeDasharray="4 3" />
    </ToolbarVectorIcon>
  );
}

/** A dense mesh on the left, the same outline with a few large triangles on the right. */
export function ToolbarSimplifyIcon(props: IconProps) {
  return (
    <ToolbarVectorIcon {...props}>
      <path d="M24 6 40 15v18L24 42 8 33V15Z" {...SOLID} />
      <path d="M24 6 40 15v18L24 42 8 33V15Z" />
      <path d="M24 6v36M24 24 40 15M24 24l16 9" />
      <path d="M8 21h16M8 27h16M13.5 12v27M19 9v30" strokeWidth="1.6" opacity="0.7" />
    </ToolbarVectorIcon>
  );
}

/** A block with a relief of bumps on its top: a surface texture laid onto a body. */
export function ToolbarSurfaceTextureIcon(props: IconProps) {
  return (
    <ToolbarVectorIcon {...props}>
      <path d="M8 40V22c2.7-4.5 5.3-4.5 8 0s5.3 4.5 8 0 5.3-4.5 8 0 5.3 4.5 8 0v18Z" {...SOLID} />
      <path d="M8 40V22c2.7-4.5 5.3-4.5 8 0s5.3 4.5 8 0 5.3-4.5 8 0 5.3 4.5 8 0v18Z" />
      <path d="M8 31c2.7-4.5 5.3-4.5 8 0s5.3 4.5 8 0 5.3-4.5 8 0 5.3 4.5 8 0" strokeWidth="1.6" opacity="0.7" />
    </ToolbarVectorIcon>
  );
}

/** Three links of a print-in-place chain in a gentle bend, held by the round joints between them. */
export function ToolbarFlexiIcon(props: IconProps) {
  return (
    <ToolbarVectorIcon {...props}>
      <rect x="4" y="25" width="14" height="10" rx="3.5" transform="rotate(-24 11 30)" {...SOLID} />
      <rect x="4" y="25" width="14" height="10" rx="3.5" transform="rotate(-24 11 30)" />
      <rect x="17" y="18" width="14" height="10" rx="3.5" {...SOLID} />
      <rect x="17" y="18" width="14" height="10" rx="3.5" />
      <rect x="30" y="25" width="14" height="10" rx="3.5" transform="rotate(24 37 30)" {...SOLID} />
      <rect x="30" y="25" width="14" height="10" rx="3.5" transform="rotate(24 37 30)" />
      <circle cx="17.5" cy="26" r="3" fill="currentColor" stroke="none" />
      <circle cx="30.5" cy="26" r="3" fill="currentColor" stroke="none" />
    </ToolbarVectorIcon>
  );
}

/** A round cookie with a bite out of it and a few chips: what the cutter is for (Stefan, 29.10.2026 - a star read as a star). */
export function ToolbarCookieCutterIcon(props: IconProps) {
  const cookie = "M28.5 11A16 16 0 1 0 38 20.5A9 9 0 0 1 28.5 11Z";
  return (
    <ToolbarVectorIcon {...props}>
      <path d={cookie} {...SOLID} />
      <path d={cookie} />
      <circle cx="17" cy="21" r="2" fill="currentColor" stroke="none" />
      <circle cx="25.5" cy="30" r="2" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="32" r="1.7" fill="currentColor" stroke="none" />
      <circle cx="24" cy="19.5" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="32" cy="30.5" r="1.7" fill="currentColor" stroke="none" />
    </ToolbarVectorIcon>
  );
}

/** A box cut open, its lid lifted above it with the lip that fits into the opening. */
export function ToolbarLidIcon(props: IconProps) {
  return (
    <ToolbarVectorIcon {...props}>
      <path d="M8 23h7v10h18V23h7v17H8Z" {...SOLID} />
      <path d="M8 23h7v10h18V23h7v17H8Z" />
      <path d="M6 9h36v6H6Z" {...SOLID} />
      <path d="M6 9h36v6H6Z" />
      <path d="M16.5 15v4h15v-4" />
    </ToolbarVectorIcon>
  );
}

export function ToolbarSnapGridIcon(props: IconProps) {
  return (
    <ToolbarVectorIcon {...props}>
      <path d="M9 18h30M9 30h30M18 9v30M30 9v30" />
      <circle cx="24" cy="24" r="4.5" {...SOLID} />
      <circle cx="24" cy="24" r="4.5" />
    </ToolbarVectorIcon>
  );
}

export function ToolbarWorkplaneIcon(props: IconProps) {
  return (
    <ToolbarVectorIcon {...props}>
      <path d="M24 12 44 24 24 36 4 24Z" {...SOLID} />
      <path d="M24 12 44 24 24 36 4 24Z" />
      <path d="M14 18 34 30M34 18 14 30" strokeWidth="1.8" opacity="0.6" />
    </ToolbarVectorIcon>
  );
}

export function ToolbarDropToWorkplaneIcon(props: IconProps) {
  return (
    <ToolbarVectorIcon {...props}>
      <path d="M24 30 40 38 24 44 8 38Z" {...SOLID} />
      <path d="M24 30 40 38 24 44 8 38Z" />
      <path d="M24 4v18M17 16l7 7 7-7" />
      <rect x="16" y="4" width="16" height="9" rx="2" />
    </ToolbarVectorIcon>
  );
}

/** A block tipping over onto one of its faces, resting on the plate. */
export function ToolbarLayFlatIcon(props: IconProps) {
  return (
    <ToolbarVectorIcon {...props}>
      <path d="M24 32 40 39 24 45 8 39Z" {...SOLID} />
      <path d="M24 32 40 39 24 45 8 39Z" />
      <path d="M13 9 27 5 31 19 17 23Z" />
      <path d="M36 12a13 13 0 0 1 -2 15" />
      <path d="M29 26l5 2 1-5" />
    </ToolbarVectorIcon>
  );
}

/** Two blocks, one sliding against the other's face. */
export function ToolbarMateFacesIcon(props: IconProps) {
  return (
    <ToolbarVectorIcon {...props}>
      <rect x="27" y="12" width="15" height="24" rx="2" {...SOLID} />
      <rect x="27" y="12" width="15" height="24" rx="2" />
      <rect x="6" y="17" width="13" height="14" rx="2" />
      <path d="M21 24h3" />
      <path d="M21 20l3 4-3 4" />
    </ToolbarVectorIcon>
  );
}

export function ToolbarCenterOnWorkplaneIcon(props: IconProps) {
  return (
    <ToolbarVectorIcon {...props}>
      <rect x="5" y="5" width="38" height="38" rx="4" {...SOLID} />
      <rect x="5" y="5" width="38" height="38" rx="4" />
      <rect x="18" y="18" width="12" height="12" rx="2" />
      <path d="M20 9h8l-4 5Z M20 39h8l-4-5Z M9 20v8l5-4Z M39 20v8l-5-4Z" fill="currentColor" stroke="none" />
    </ToolbarVectorIcon>
  );
}

/*
 * Zwei Formen fuer das Skizzenmenue, die es bei lucide nicht gibt. Sie sind
 * bewusst in dessen Masszahlen gezeichnet - 24er Feld, Strichstaerke 2, runde
 * Enden -, damit sie neben Rechteck, Kreis und Dreieck nicht auffallen.
 */
function SketchShapeIcon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  );
}

export function SketchEllipseIcon(props: IconProps) {
  return (
    <SketchShapeIcon {...props}>
      <ellipse cx="12" cy="12" rx="9" ry="5.5" />
    </SketchShapeIcon>
  );
}

export function SketchHalfCircleIcon(props: IconProps) {
  return (
    <SketchShapeIcon {...props}>
      {/* Bogen von links nach rechts, die Sehne schliesst ihn - genau der
          Umriss, den die Form in der Skizze bekommt. */}
      <path d="M3 15a9 9 0 0 1 18 0Z" />
    </SketchShapeIcon>
  );
}

export function SketchPieSliceIcon(props: IconProps) {
  return (
    <SketchShapeIcon {...props}>
      {/* Die Spitze sitzt unten links, der Bogen spannt sich darueber - so
          fuellt das Viertel das Feld, statt als Eckchen darin zu sitzen. */}
      <path d="M5 5a14 14 0 0 1 14 14H5Z" />
    </SketchShapeIcon>
  );
}

export function SketchBoltCircleIcon(props: IconProps) {
  return (
    <SketchShapeIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      {/* Vier statt sechs Bohrungen: In einem 24er Feld waeren sechs nur noch
          ein Kranz aus Punkten, der nichts mehr erkennen laesst. */}
      <circle cx="12" cy="6.6" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="17.4" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="12" cy="17.4" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="6.6" cy="12" r="1.3" fill="currentColor" stroke="none" />
    </SketchShapeIcon>
  );
}
