"use client";

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import type { ShellDividerWall, ShellPocket, ShellScoop } from "@/lib/shellGridLimits";
import { shellScoopOf, shellWallEnds, shellWallFromEnds, shellWallQuad, type ShellCompartment } from "@/lib/shellWalls";

/*
 * Hollow, the dividers set by hand, drawn from above: the inside of the box with its compartments and walls, the
 * back of the box at the top. A wall is dragged to move it and dragged by an end to make it shorter or longer; a click on a
 * compartment picks it, so the next wall splits just that one. The plan only reports what was picked and how a wall
 * changed; the list of walls is its owner's.
 */

export type ShellWallsPick = { type: "wall"; index: number } | { type: "compartment"; index: number } | null;

type Room = { width: number; depth: number; outline: { x: number; z: number }[]; compartments: ShellCompartment[] };

/** The shortest wall the plan leaves when an end is dragged, in mm. */
export const SHELL_WALLS_PLAN_MIN_LENGTH = 2;
/** The step a dragged wall moves in, in mm, and how near an end must come to a side or another wall to land on it. */
const STEP = 0.5;
const CATCH = 1.5;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const stepped = (value: number, step: number) => Math.round(value / step) * step;

/**
 * A wall after it was dragged by `dx`, `dz` mm: moved as a whole ("move") or with one end pulled to where the pointer is
 * ("from", "to"). It stays inside the room and moves in steps. A pulled end lands on a side of the room or on the middle
 * of a straight wall when it comes near, and may leave the wall's line, which sets the wall at a slant; while it stays
 * near that line (within 3 mm or an eighth of the wall's length) the wall stays straight. With `free` nothing catches.
 */
export function shellWallDragged(wall: ShellDividerWall, part: "move" | "from" | "to", dx: number, dz: number, room: { width: number; depth: number }, others: readonly ShellDividerWall[], step = STEP, free = false): ShellDividerWall {
  const [a, b] = shellWallEnds(wall);
  if (part === "move") {
    const lowX = Math.min(a.x, b.x);
    const lowZ = Math.min(a.z, b.z);
    // The beginning lands on the step grid, so a wall typed in at an odd place comes back onto it.
    const moveX = clamp(stepped(a.x + dx, step) - a.x, -lowX, Math.max(-lowX, room.width - Math.max(a.x, b.x)));
    const moveZ = clamp(stepped(a.z + dz, step) - a.z, -lowZ, Math.max(-lowZ, room.depth - Math.max(a.z, b.z)));
    return shellWallFromEnds({ x: a.x + moveX, z: a.z + moveZ }, { x: b.x + moveX, z: b.z + moveZ });
  }
  const fixed = part === "from" ? b : a;
  const pulled = part === "from" ? a : b;
  const target = { x: clamp(pulled.x + dx, 0, room.width), z: clamp(pulled.z + dz, 0, room.depth) };
  const land = (value: number, limit: number, crossing: ShellDividerWall["dir"], across: number) => {
    if (free) return stepped(value, step);
    const stops = [0, limit, ...others.filter((other) => other.dir === crossing && !other.slant && across >= other.from - CATCH && across <= other.to + CATCH).map((other) => other.at)];
    const near = stops.reduce((best, stop) => (Math.abs(stop - value) < Math.abs(best - value) ? stop : best), stops[0]);
    return Math.abs(near - value) <= CATCH ? near : clamp(stepped(value, step), 0, limit);
  };
  const next = { x: land(target.x, room.width, "z", target.z), z: land(target.z, room.depth, "x", target.x) };
  if (!free) {
    const straight = Math.max(3, Math.hypot(next.x - fixed.x, next.z - fixed.z) / 8);
    const offX = Math.abs(next.x - fixed.x);
    const offZ = Math.abs(next.z - fixed.z);
    if (offZ <= straight && offZ < offX) next.z = fixed.z;
    else if (offX <= straight && offX < offZ) next.x = fixed.x;
  }
  if (Math.hypot(next.x - fixed.x, next.z - fixed.z) < SHELL_WALLS_PLAN_MIN_LENGTH) return wall;
  return shellWallFromEnds(fixed, next);
}

export function ShellWallsPlan({
  room,
  walls,
  thickness,
  scoops = [],
  pockets = [],
  pick,
  disabled,
  label,
  wallLabel,
  compartmentLabel,
  onPick,
  onWallChange,
  onWallRemove,
  onDragActiveChange,
}: {
  room: Room;
  walls: readonly ShellDividerWall[];
  /** The dividers' thickness in mm. */
  thickness: number;
  /** The finger scoops: a compartment with one shows a green line along the side its floor runs up into. */
  scoops?: readonly ShellScoop[];
  /** The shaped pockets, drawn as their outlines. */
  pockets?: readonly ShellPocket[];
  pick: ShellWallsPick;
  disabled?: boolean;
  /** What the drawing is, for a screen reader. */
  label: string;
  wallLabel: (wall: ShellDividerWall, index: number) => string;
  compartmentLabel: (compartment: ShellCompartment, index: number) => string;
  onPick: (pick: ShellWallsPick) => void;
  onWallChange: (index: number, wall: ShellDividerWall) => void;
  onWallRemove: (index: number) => void;
  onDragActiveChange?: (active: boolean) => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const drag = useRef<{ index: number; part: "move" | "from" | "to"; x: number; z: number; wall: ShellDividerWall; pointer: number } | null>(null);
  // Screen pixels per millimetre, so that grips and labels keep their size on the screen whatever the box measures.
  const [scale, setScale] = useState(2);
  const margin = Math.max(room.width, room.depth) * 0.04 + 1;
  const viewWidth = room.width + 2 * margin;

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const measure = () => {
      const width = svg.getBoundingClientRect().width;
      if (width > 0) setScale(width / viewWidth);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(svg);
    return () => observer.disconnect();
  }, [viewWidth]);

  // A drag that is cut off because the plan goes away still ends; the newest callback is told, whichever render it is from.
  const dragActive = useRef(onDragActiveChange);
  dragActive.current = onDragActiveChange;
  useEffect(() => () => {
    if (drag.current) dragActive.current?.(false);
  }, []);

  /** Where the pointer is, in mm of the drawing. Without a layout (a test) the pointer's own numbers are taken as mm. */
  const place = (event: { clientX: number; clientY: number }) => {
    const matrix = svgRef.current?.getScreenCTM?.();
    if (!matrix) return { x: event.clientX, z: event.clientY };
    const inverse = matrix.inverse();
    return { x: inverse.a * event.clientX + inverse.c * event.clientY + inverse.e, z: inverse.b * event.clientX + inverse.d * event.clientY + inverse.f };
  };

  const begin = (event: ReactPointerEvent<SVGElement>, index: number, part: "move" | "from" | "to") => {
    event.stopPropagation();
    onPick({ type: "wall", index });
    if (disabled || event.button > 0) return;
    const at = place(event);
    drag.current = { index, part, x: at.x, z: at.z, wall: walls[index], pointer: event.pointerId };
    try {
      svgRef.current?.setPointerCapture?.(event.pointerId);
    } catch {
      // A pointer the browser no longer knows cannot be held; the drag then ends where the pointer leaves the drawing.
    }
    onDragActiveChange?.(true);
  };
  const move = (event: ReactPointerEvent<SVGSVGElement>) => {
    const current = drag.current;
    if (!current || current.pointer !== event.pointerId) return;
    const at = place(event);
    const next = shellWallDragged(current.wall, current.part, at.x - current.x, at.z - current.z, room, walls.filter((_wall, index) => index !== current.index), event.altKey ? 0.1 : STEP, event.altKey);
    const now = walls[current.index];
    if (now && (now.dir !== next.dir || now.at !== next.at || now.from !== next.from || now.to !== next.to || (now.slant ?? 0) !== (next.slant ?? 0))) onWallChange(current.index, next);
  };
  const end = (event: ReactPointerEvent<SVGSVGElement>) => {
    const current = drag.current;
    if (!current || current.pointer !== event.pointerId) return;
    drag.current = null;
    try {
      svgRef.current?.releasePointerCapture?.(event.pointerId);
    } catch {
      // Nothing was held.
    }
    onDragActiveChange?.(false);
  };
  const keys = (event: ReactKeyboardEvent<SVGElement>, index: number) => {
    if (disabled) return;
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      onWallRemove(index);
      return;
    }
    const by = event.shiftKey ? 5 : STEP;
    const moves: Record<string, [number, number]> = { ArrowLeft: [-by, 0], ArrowRight: [by, 0], ArrowUp: [0, -by], ArrowDown: [0, by] };
    const delta = moves[event.key];
    if (!delta) return;
    event.preventDefault();
    onWallChange(index, shellWallDragged(walls[index], "move", delta[0], delta[1], room, [], STEP));
  };

  const points = (outline: { x: number; z: number }[]) => outline.map((point) => `${point.x},${point.z}`).join(" ");
  const grip = 6 / scale;
  const reach = Math.max(thickness, 14 / scale);
  const font = 11 / scale;
  const clipId = `shell-walls-clip-${Math.round(room.width * 100)}-${Math.round(room.depth * 100)}-${room.outline.length}`;
  /** A wall's outline, `wide` across: a straight wall held inside the room, a slanted one as it is (the clip cuts it at the box's wall). */
  const shown = (wall: ShellDividerWall) => {
    if (wall.slant) return wall;
    const run = wall.dir === "x" ? room.width : room.depth;
    return { ...wall, from: clamp(wall.from, 0, run), to: clamp(wall.to, 0, run) };
  };
  const box = (wall: ShellDividerWall, wide: number) => ({ points: points(shellWallQuad(shown(wall), wide)) });
  const picked = pick?.type === "wall" ? walls[pick.index] : undefined;

  return (
    <svg
      ref={svgRef}
      className={`shell-walls-plan${disabled ? " disabled" : ""}`}
      viewBox={`${-margin} ${-margin} ${viewWidth} ${room.depth + 2 * margin}`}
      role="group"
      aria-label={label}
      data-testid="shell-walls-plan"
      onPointerDown={() => onPick(null)}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <defs>
        <clipPath id={clipId}><polygon points={points(room.outline)} /></clipPath>
      </defs>
      <polygon className="shell-walls-plan-box" points={points(room.outline)} strokeWidth={margin * 1.2} />
      <polygon className="shell-walls-plan-floor" points={points(room.outline)} />
      {room.compartments.map((compartment, index) => {
        const wide = compartment.maxX - compartment.minX;
        const deep = compartment.maxZ - compartment.minZ;
        const text = `${Math.round(wide)} × ${Math.round(deep)}`;
        const chosen = pick?.type === "compartment" && pick.index === index;
        return (
          <g key={`compartment-${index}`}>
            <polygon
              className={`shell-walls-plan-compartment${chosen ? " picked" : ""}`}
              points={points(compartment.outline)}
              role="button"
              tabIndex={disabled ? -1 : 0}
              aria-label={compartmentLabel(compartment, index)}
              aria-pressed={chosen}
              data-testid="shell-walls-compartment"
              onPointerDown={(event) => {
                event.stopPropagation();
                onPick(chosen ? null : { type: "compartment", index });
              }}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                onPick(chosen ? null : { type: "compartment", index });
              }}
            />
            {(() => {
              const scoop = shellScoopOf(compartment, scoops);
              if (!scoop) return null;
              const inset = 2.5 / scale;
              const [x1, z1, x2, z2] = scoop.side === "front" ? [compartment.minX + inset, compartment.maxZ - inset, compartment.maxX - inset, compartment.maxZ - inset]
                : scoop.side === "back" ? [compartment.minX + inset, compartment.minZ + inset, compartment.maxX - inset, compartment.minZ + inset]
                  : scoop.side === "left" ? [compartment.minX + inset, compartment.minZ + inset, compartment.minX + inset, compartment.maxZ - inset]
                    : [compartment.maxX - inset, compartment.minZ + inset, compartment.maxX - inset, compartment.maxZ - inset];
              return <line className="shell-walls-plan-scoop" x1={x1} y1={z1} x2={x2} y2={z2} strokeWidth={3 / scale} data-testid="shell-walls-plan-scoop" />;
            })()}
            {wide > text.length * font * 0.62 && deep > font * 1.5 ? (
              <text className="shell-walls-plan-size" x={compartment.label.x} y={compartment.label.z} fontSize={font} textAnchor="middle" dominantBaseline="central">{text}</text>
            ) : null}
          </g>
        );
      })}
      <g clipPath={`url(#${clipId})`}>
        {pockets.map((pocket, index) => (
          <polygon key={`pocket-${index}`} className="shell-walls-plan-pocket" points={points(pocket.points)} strokeWidth={1.5 / scale} strokeDasharray={`${4 / scale} ${3 / scale}`} data-testid="shell-walls-plan-pocket" />
        ))}
        {walls.map((wall, index) => (
          <polygon key={`wall-${index}`} className={`shell-walls-plan-wall${pick?.type === "wall" && pick.index === index ? " picked" : ""}`} {...box(wall, thickness)} />
        ))}
      </g>
      {walls.map((wall, index) => (
        <polygon
          key={`reach-${index}`}
          className={`shell-walls-plan-reach ${wall.dir === "x" ? "across" : "along"}`}
          {...box(wall, reach)}
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label={wallLabel(wall, index)}
          aria-pressed={pick?.type === "wall" && pick.index === index}
          data-testid="shell-walls-wall"
          onPointerDown={(event) => begin(event, index, "move")}
          onFocus={() => {
            if (!drag.current && !(pick?.type === "wall" && pick.index === index)) onPick({ type: "wall", index });
          }}
          onKeyDown={(event) => keys(event, index)}
        />
      ))}
      {picked && pick?.type === "wall" && !disabled ? (["from", "to"] as const).map((part) => {
        const end = shellWallEnds(shown(picked))[part === "from" ? 0 : 1];
        return (
          <circle
            key={part}
            className={`shell-walls-plan-grip ${picked.dir === "x" ? "across" : "along"}`}
            cx={end.x}
            cy={end.z}
            r={grip}
            strokeWidth={1.5 / scale}
            data-testid={`shell-walls-grip-${part}`}
            onPointerDown={(event) => begin(event, pick.index, part)}
          />
        );
      }) : null}
    </svg>
  );
}
