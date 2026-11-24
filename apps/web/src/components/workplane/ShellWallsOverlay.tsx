"use client";

import { useRef, type Dispatch, type MutableRefObject, type PointerEvent as ReactPointerEvent, type SetStateAction } from "react";
import * as THREE from "three";
import { Hand, SquareSplitHorizontal, SquareSplitVertical, X } from "lucide-react";
import { projectToScreen, type ThreeState } from "@/components/workplane/ViewportOverlays";
import { shellWallDragged, type ShellWallsPick } from "@/components/workplane/ShellWallsPlan";
import { MAX_SHELL_DIVIDER_WALLS, type ShellDividerWall, type ShellScoop } from "@/lib/shellGridLimits";
import { shellScoopOf, shellScoopsWith, shellSplitWall, shellWallEnds, shellWallRoom, type ShellWallRoom } from "@/lib/shellWalls";
import { t } from "@/lib/i18n";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * Hollow, the dividers and finger scoops edited on the body itself: while the Hollow panel is open on a body with the top
 * as its one open side, every compartment shows its size in the view, with a hand that sets its finger scoop. With the
 * dividers set by hand every wall also has a grip on its top that moves it, the picked wall has a grip at each end that
 * makes it shorter or longer and a cross that removes it, and every compartment has two buttons that split it across or
 * along. Only these grips and buttons take the pointer; everywhere else the view is used as always. The pointer is
 * followed on the plane of the body's top, so a wall moves under it whichever way the camera looks.
 */

type Screen = { x: number; y: number };

export type ShellWallsOverlayState = {
  shapeId: string;
  walls: { index: number; dir: ShellDividerWall["dir"]; from: Screen; to: Screen; middle: Screen }[];
  compartments: { index: number; at: Screen; text: string; room: "none" | "label" | "buttons"; scoop: boolean }[];
  /** Whether the dividers are set by hand: only then are there walls to move and compartments to split. */
  manual: boolean;
  /** Whether compartments can have finger scoops: those of a box, not of a loose insert. */
  scoops: boolean;
  full: boolean;
  signature: string;
};

/**
 * What the grips on a body are about, given by the Hollow tool while it is open: the room of its dividers, the walls set
 * by hand, the finger scoops, and whether walls can be moved (`manual`) and scoops switched (`scoopsOffered`).
 */
export type ShellWallsSource = {
  room: ShellWallRoom | null;
  walls: ShellDividerWall[];
  scoops: ShellScoop[];
  manual: boolean;
  divider: number;
  scoopsOffered: boolean;
  /**
   * How the body is turned about its height, in degrees. A hollowed body's mesh is drawn in the scene's own frame, so the
   * room is laid round the middle of the body as it stands, turned by this.
   */
  turn: number;
};

/**
 * The source for a body the Hollow tool is hollowing: its inside taken as a rectangle of the body's width and depth less
 * the wall, `wall` in from the body's sides. With even dividers the compartments are those of the grid, and there are no
 * walls to move.
 */
export function shellWallsSource(insideWidth: number, insideDepth: number, dividers: { x: number; z: number; thickness: number; manual: boolean; walls: ShellDividerWall[]; scoops?: ShellScoop[] }, turn = 0): ShellWallsSource {
  const even: ShellDividerWall[] = [];
  if (!dividers.manual) {
    for (let i = 1; i <= dividers.x; i += 1) even.push({ dir: "z", at: (insideWidth * i) / (dividers.x + 1), from: 0, to: insideDepth });
    for (let i = 1; i <= dividers.z; i += 1) even.push({ dir: "x", at: (insideDepth * i) / (dividers.z + 1), from: 0, to: insideWidth });
  }
  const room = insideWidth >= 4 && insideDepth >= 4 ? shellWallRoom(insideWidth, insideDepth, dividers.manual ? dividers.walls : even, dividers.thickness) : null;
  return { room, walls: dividers.manual ? dividers.walls : [], scoops: dividers.scoops ?? [], manual: dividers.manual, divider: dividers.thickness, scoopsOffered: dividers.scoops !== undefined, turn };
}

/**
 * Where the room of the dividers lies in the view: round the middle of the body's mesh as it stands in the scene, on its
 * top, turned as the body is turned; x runs to the right and z to the front of the body's own inside.
 */
function frameOf(state: ThreeState, shape: WorkplaneShape, source: ShellWallsSource) {
  const record = state.shapeRecords.get(shape.id);
  const { room, walls, divider, scoops, manual, scoopsOffered, turn } = source;
  if (!record || !room) return null;
  let mesh: THREE.Mesh | null = null;
  record.object.traverse((child) => {
    if (!mesh && child instanceof THREE.Mesh && child.userData.shapeSurface) mesh = child;
  });
  const found = mesh as THREE.Mesh | null;
  if (!found) return null;
  found.updateWorldMatrix(true, false);
  const box = new THREE.Box3().setFromObject(found);
  if (box.isEmpty()) return null;
  const centre = box.getCenter(new THREE.Vector3());
  const angle = THREE.MathUtils.degToRad(turn);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const toWorld = (x: number, z: number) => {
    const ox = x - room.width / 2;
    const oz = z - room.depth / 2;
    return new THREE.Vector3(centre.x + ox * cos + oz * sin, box.max.y, centre.z - ox * sin + oz * cos);
  };
  const fromWorld = (point: THREE.Vector3) => {
    const dx = point.x - centre.x;
    const dz = point.z - centre.z;
    return { x: dx * cos - dz * sin + room.width / 2, z: dx * sin + dz * cos + room.depth / 2 };
  };
  return { toWorld, fromWorld, room, walls, divider, scoops, manual, scoopsOffered };
}

/** The place under the pointer on the top of the box, in mm from the left and the back of the room; null beside the view. */
function pointerInRoom(state: ThreeState, shape: WorkplaneShape, clientX: number, clientY: number, source: ShellWallsSource) {
  const frame = frameOf(state, shape, source);
  if (!frame) return null;
  const rect = state.renderer.domElement.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  const pointer = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
  const raycaster = new THREE.Raycaster();
  state.camera.updateMatrixWorld();
  raycaster.setFromCamera(pointer, state.camera);
  const plane = new THREE.Plane().setFromCoplanarPoints(frame.toWorld(0, 0), frame.toWorld(1, 0), frame.toWorld(0, 1));
  const hit = raycaster.ray.intersectPlane(plane, new THREE.Vector3());
  return hit ? frame.fromWorld(hit) : null;
}

/** The grips and labels on screen, kept in step with the camera and the box. */
export function syncShellWallsOverlay(
  state: ThreeState,
  shape: WorkplaneShape | null,
  overlayRef: MutableRefObject<ShellWallsOverlayState | null>,
  setOverlay: Dispatch<SetStateAction<ShellWallsOverlayState | null>>,
  source: ShellWallsSource | null,
) {
  const frame = shape && source ? frameOf(state, shape, source) : null;
  const clear = () => {
    if (!overlayRef.current) return;
    overlayRef.current = null;
    setOverlay(null);
  };
  if (!shape || !frame) return clear();
  const { room, walls, scoops, manual, scoopsOffered } = frame;
  const world = frame.toWorld;
  // With a corner of the room behind the camera the picture of it makes no sense; nothing is drawn then.
  if (state.camera instanceof THREE.PerspectiveCamera) {
    state.camera.updateMatrixWorld();
    const behind = [[0, 0], [room.width, 0], [room.width, room.depth], [0, room.depth]].some(([x, z]) => world(x, z).applyMatrix4(state.camera.matrixWorldInverse).z > -1e-3);
    if (behind) return clear();
  }
  const screen = (x: number, z: number) => projectToScreen(world(x, z), state);
  const clamp = (value: number, max: number) => Math.min(max, Math.max(0, value));
  const next: ShellWallsOverlayState = {
    shapeId: shape.id,
    walls: walls.map((wall, index) => {
      // A straight wall is shown as far as the room goes; a slanted one as it is, held inside the room's sides.
      const run = wall.dir === "x" ? room.width : room.depth;
      const [a, b] = shellWallEnds(wall.slant ? wall : { ...wall, from: clamp(wall.from, run), to: clamp(wall.to, run) });
      const inside = (point: { x: number; z: number }) => ({ x: clamp(point.x, room.width), z: clamp(point.z, room.depth) });
      const [from, to] = [inside(a), inside(b)];
      return { index, dir: wall.dir, from: screen(from.x, from.z), to: screen(to.x, to.z), middle: screen((from.x + to.x) / 2, (from.z + to.z) / 2) };
    }),
    compartments: room.compartments.map((compartment, index) => {
      const corners = [screen(compartment.minX, compartment.minZ), screen(compartment.maxX, compartment.minZ), screen(compartment.maxX, compartment.maxZ), screen(compartment.minX, compartment.maxZ)];
      const wide = Math.max(...corners.map((corner) => corner.x)) - Math.min(...corners.map((corner) => corner.x));
      const high = Math.max(...corners.map((corner) => corner.y)) - Math.min(...corners.map((corner) => corner.y));
      return {
        index,
        at: screen(compartment.label.x, compartment.label.z),
        text: `${Math.round(compartment.maxX - compartment.minX)} × ${Math.round(compartment.maxZ - compartment.minZ)}`,
        room: wide >= 64 && high >= 44 ? "buttons" as const : wide >= 48 && high >= 22 ? "label" as const : "none" as const,
        scoop: Boolean(shellScoopOf(compartment, scoops)),
      };
    }),
    manual,
    scoops: scoopsOffered,
    full: walls.length >= MAX_SHELL_DIVIDER_WALLS,
    signature: "",
  };
  const rounded = (point: Screen) => `${Math.round(point.x)},${Math.round(point.y)}`;
  next.signature = JSON.stringify([shape.id, next.full, next.walls.map((wall) => [wall.dir, rounded(wall.from), rounded(wall.to)]), next.compartments.map((entry) => [rounded(entry.at), entry.text, entry.room, entry.scoop]), manual, scoopsOffered]);
  if (overlayRef.current?.signature === next.signature) return;
  overlayRef.current = next;
  setOverlay(next);
}

export function ShellWallsOverlay({
  overlay,
  shape,
  source,
  pick,
  threeRef,
  onPick,
  onWallsChange,
  onScoopsChange,
  onDragActiveChange,
}: {
  overlay: ShellWallsOverlayState;
  /** The body the overlay is about, as it is now. */
  shape: WorkplaneShape;
  /** Given by the Hollow tool for the body it is hollowing. */
  source: ShellWallsSource;
  pick: ShellWallsPick;
  threeRef: MutableRefObject<ThreeState | null>;
  onPick: (pick: ShellWallsPick) => void;
  onWallsChange: (walls: ShellDividerWall[]) => void;
  /** A finger scoop switched on or off in a compartment. */
  onScoopsChange: (scoops: ShellScoop[]) => void;
  onDragActiveChange?: (active: boolean) => void;
}) {
  const drag = useRef<{ index: number; part: "move" | "from" | "to"; x: number; z: number; wall: ShellDividerWall; pointer: number; moved: boolean } | null>(null);
  const { room, walls, divider, scoops } = source;
  if (!room || overlay.shapeId !== shape.id) return null;
  // The scoop of a compartment: each click goes on to the next side, front, back, left, right, and then off again.
  const toggleScoop = (index: number) => {
    const compartment = room.compartments[index];
    if (!compartment) return;
    const sides = ["front", "back", "left", "right"] as const;
    const now = shellScoopOf(compartment, scoops)?.side;
    const next = now ? sides[sides.indexOf(now) + 1] ?? null : "front";
    onScoopsChange(shellScoopsWith(scoops, compartment, next));
  };

  const begin = (event: ReactPointerEvent<HTMLButtonElement>, index: number, part: "move" | "from" | "to") => {
    event.stopPropagation();
    if (event.button > 0 || !walls[index]) return;
    onPick({ type: "wall", index });
    const state = threeRef.current;
    const at = state ? pointerInRoom(state, shape, event.clientX, event.clientY, source) : null;
    if (!at) return;
    drag.current = { index, part, x: at.x, z: at.z, wall: walls[index], pointer: event.pointerId, moved: false };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // A pointer the browser no longer knows cannot be held; the drag then ends when it leaves the grip.
    }
    onDragActiveChange?.(true);
  };
  const move = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const current = drag.current;
    const state = threeRef.current;
    if (!current || current.pointer !== event.pointerId || !state) return;
    const at = pointerInRoom(state, shape, event.clientX, event.clientY, source);
    if (!at) return;
    const next = shellWallDragged(current.wall, current.part, at.x - current.x, at.z - current.z, room, walls.filter((_wall, index) => index !== current.index), event.altKey ? 0.1 : undefined, event.altKey);
    const now = walls[current.index];
    if (!now || (now.dir === next.dir && now.at === next.at && now.from === next.from && now.to === next.to && (now.slant ?? 0) === (next.slant ?? 0))) return;
    current.moved = true;
    onWallsChange(walls.map((wall, index) => (index === current.index ? next : wall)));
  };
  const end = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const current = drag.current;
    if (!current || current.pointer !== event.pointerId) return;
    drag.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Nothing was held.
    }
    onDragActiveChange?.(false);
  };
  const split = (index: number, dir: ShellDividerWall["dir"]) => {
    const compartment = room.compartments[index];
    if (!compartment || overlay.full) return;
    onWallsChange([...walls, shellSplitWall(compartment, dir, room, divider)]);
    onPick({ type: "wall", index: walls.length });
  };
  const remove = (index: number) => {
    onWallsChange(walls.filter((_wall, position) => position !== index));
    onPick(null);
  };
  const grips = { onPointerMove: move, onPointerUp: end, onPointerCancel: end };
  const picked = pick?.type === "wall" ? overlay.walls.find((wall) => wall.index === pick.index) : undefined;
  const name = (wall: { dir: ShellDividerWall["dir"]; index: number }) => t(wall.dir === "x" ? "shell.wallAcross" : "shell.wallAlong", { number: wall.index + 1 });
  // The cross stands beside the middle grip, along the wall as it is seen.
  const cross = (wall: ShellWallsOverlayState["walls"][number]) => {
    const length = Math.hypot(wall.to.x - wall.from.x, wall.to.y - wall.from.y) || 1;
    // Further away where the grips are larger for a finger.
    const away = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches ? 38 : 24;
    return { left: wall.middle.x + ((wall.to.x - wall.from.x) / length) * away, top: wall.middle.y + ((wall.to.y - wall.from.y) / length) * away };
  };

  // An end's grip stands a little inside the wall: an end often lies on the middle of another wall, where that one's grip is.
  const endGrip = (wall: ShellWallsOverlayState["walls"][number], part: "from" | "to") => {
    const other = part === "from" ? wall.to : wall.from;
    const length = Math.hypot(other.x - wall[part].x, other.y - wall[part].y) || 1;
    const inward = Math.min(typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches ? 30 : 20, length / 4);
    return { left: wall[part].x + ((other.x - wall[part].x) / length) * inward, top: wall[part].y + ((other.y - wall[part].y) / length) * inward };
  };

  return (
    <div className="shell-walls-overlay" data-testid="shell-walls-overlay">
      <svg className="tape-guides" width="100%" height="100%" aria-hidden="true">
        {overlay.walls.map((wall) => (
          <line key={wall.index} className={`shell-walls-overlay-line${picked?.index === wall.index ? " picked" : ""}`} x1={wall.from.x} y1={wall.from.y} x2={wall.to.x} y2={wall.to.y} />
        ))}
      </svg>
      {overlay.compartments.map((compartment) => compartment.room === "none" ? null : (
        <div key={`compartment-${compartment.index}`} className="shell-walls-overlay-compartment" style={{ left: compartment.at.x, top: compartment.at.y }}>
          <span className="shell-walls-overlay-size">{compartment.text}</span>
          {compartment.room === "buttons" ? (
            <span className="shell-walls-overlay-split">
              {overlay.scoops ? <button type="button" className={compartment.scoop ? "on" : undefined} title={t("shell.scoopToggle")} aria-label={t("shell.scoopToggle")} aria-pressed={compartment.scoop} data-testid="shell-walls-overlay-scoop" onPointerDown={(event) => event.stopPropagation()} onClick={() => toggleScoop(compartment.index)}>
                <Hand size={14} strokeWidth={2.2} />
              </button> : null}
              {overlay.manual && !overlay.full ? (
                <>
              <button type="button" title={t("shell.wallAddAcross")} aria-label={t("shell.wallAddAcross")} data-testid="shell-walls-overlay-across" onPointerDown={(event) => event.stopPropagation()} onClick={() => split(compartment.index, "x")}>
                <SquareSplitVertical size={15} strokeWidth={2.2} />
              </button>
              <button type="button" title={t("shell.wallAddAlong")} aria-label={t("shell.wallAddAlong")} data-testid="shell-walls-overlay-along" onPointerDown={(event) => event.stopPropagation()} onClick={() => split(compartment.index, "z")}>
                <SquareSplitHorizontal size={15} strokeWidth={2.2} />
              </button>
                </>
              ) : null}
            </span>
          ) : null}
        </div>
      ))}
      {overlay.walls.map((wall) => (
        <button
          key={`grip-${wall.index}`}
          type="button"
          className={`shell-walls-overlay-grip move${picked?.index === wall.index ? " picked" : ""}`}
          style={{ left: wall.middle.x, top: wall.middle.y }}
          title={name(wall)}
          aria-label={name(wall)}
          aria-pressed={picked?.index === wall.index}
          data-testid="shell-walls-overlay-grip"
          onPointerDown={(event) => begin(event, wall.index, "move")}
          {...grips}
        />
      ))}
      {picked ? (
        <>
          {(["from", "to"] as const).map((part) => (
            <button
              key={part}
              type="button"
              className="shell-walls-overlay-grip end"
              style={endGrip(picked, part)}
              title={t(part === "from" ? "shell.wallStart" : "shell.wallEnd")}
              aria-label={t(part === "from" ? "shell.wallStart" : "shell.wallEnd")}
              data-testid={`shell-walls-overlay-${part}`}
              onPointerDown={(event) => begin(event, picked.index, part)}
              {...grips}
            />
          ))}
          <button type="button" className="shell-walls-overlay-remove" style={cross(picked)} title={t("shell.wallRemove")} aria-label={t("shell.wallRemove")} data-testid="shell-walls-overlay-remove" onPointerDown={(event) => event.stopPropagation()} onClick={() => remove(picked.index)}>
            <X size={13} strokeWidth={3} />
          </button>
        </>
      ) : null}
    </div>
  );
}
