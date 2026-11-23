"use client";

import { useState } from "react";
import { Eraser, FlipHorizontal2, FlipVertical2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { SHELL_WALLS_PLAN_MIN_LENGTH, ShellWallsPlan, type ShellWallsPick } from "@/components/workplane/ShellWallsPlan";
import { EdgeModifierSlider } from "@/components/workplane/EdgeModifierPanel";
import { t } from "@/lib/i18n";
import { MAX_SHELL_DIVIDER_WALLS, type ShellDividerWall, type ShellScoop } from "@/lib/shellGridLimits";
import { shellMirroredWalls, shellScoopOf, shellScoopsWith, shellSplitWall, shellWallEnds, shellWallFromEnds, shellWallRoom } from "@/lib/shellWalls";
import type { WorkplaneWorkspaceSettings } from "@/types/layerling";

/*
 * Hollow, dividers set by hand: the inside of the box drawn from above (ShellWallsPlan), where a wall
 * is put into the compartment that was clicked, dragged, pulled by an end and set at a slant, and for the wall that is
 * picked its measures as numbers. The inside is taken as a rectangle of the body's width and depth less the wall; the
 * kernel then builds each wall in the box's own inside and clips it to the box's real outline.
 */

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round = (value: number) => Math.round(value * 100) / 100;

/** The dividers of an even grid as walls from wall to wall, for the switch from even to by hand. */
export function shellGridWalls(across: number, along: number, width: number, depth: number): ShellDividerWall[] {
  const walls: ShellDividerWall[] = [];
  for (let i = 1; i <= across; i += 1) walls.push({ dir: "z", at: round((width * i) / (across + 1)), from: 0, to: round(depth) });
  for (let i = 1; i <= along; i += 1) walls.push({ dir: "x", at: round((depth * i) / (along + 1)), from: 0, to: round(width) });
  return walls;
}

export function ShellWallsEditor({
  width,
  depth,
  walls,
  scoops = [],
  thickness,
  workspace,
  disabled,
  onChange,
}: {
  /** The inside of the box, in mm: the body's width and depth less the wall on both sides. */
  width: number;
  depth: number;
  walls: readonly ShellDividerWall[];
  /** The finger scoops, shown in the drawing as a green line along their side. */
  scoops?: readonly ShellScoop[];
  thickness: number;
  workspace: WorkplaneWorkspaceSettings;
  disabled?: boolean;
  onChange: (walls: ShellDividerWall[]) => void;
}) {
  const [pick, setPick] = useState<ShellWallsPick>(null);
  const room = shellWallRoom(width, depth, walls, thickness);
  if (!room || width < 4 || depth < 4) return null;
  const wall = pick?.type === "wall" ? walls[pick.index] : undefined;
  const compartment = pick?.type === "compartment" ? room.compartments[pick.index] : undefined;
  const change = (index: number, next: ShellDividerWall) => onChange(walls.map((entry, position) => (position === index ? next : entry)));
  const remove = (index: number) => {
    onChange(walls.filter((_entry, position) => position !== index));
    setPick(null);
  };
  const add = (dir: ShellDividerWall["dir"]) => {
    const area = (entry: (typeof room.compartments)[number]) => (entry.maxX - entry.minX) * (entry.maxZ - entry.minZ);
    const target = compartment ?? [...room.compartments].sort((a, b) => area(b) - area(a))[0] ?? { minX: 0, maxX: room.width, minZ: 0, maxZ: room.depth };
    onChange([...walls, shellSplitWall(target, dir, room, thickness)]);
    setPick({ type: "wall", index: walls.length });
  };
  const turn = (index: number) => {
    const [a, b] = shellWallEnds(walls[index]);
    const middle = { x: clamp((a.x + b.x) / 2, 0, room.width), z: clamp((a.z + b.z) / 2, 0, room.depth) };
    const half = { x: -(b.z - a.z) / 2, z: (b.x - a.x) / 2 };
    const fit = Math.min(1, half.x ? Math.min(middle.x, room.width - middle.x) / Math.abs(half.x) : 1, half.z ? Math.min(middle.z, room.depth - middle.z) / Math.abs(half.z) : 1);
    const end = (sign: number) => ({ x: round(middle.x + sign * half.x * fit), z: round(middle.z + sign * half.z * fit) });
    change(index, shellWallFromEnds(end(-1), end(1)));
  };
  const full = walls.length >= MAX_SHELL_DIVIDER_WALLS;
  const plain = (value: number) => String(Math.round(value * 10) / 10);
  const run = wall ? (wall.dir === "x" ? room.width : room.depth) : 0;
  const across = wall ? (wall.dir === "x" ? room.depth : room.width) : 0;
  const from = wall ? clamp(wall.from, 0, run) : 0;
  const to = wall ? clamp(wall.to, 0, run) : 0;

  return (
    <div className="shell-walls-editor" data-testid="shell-walls-editor">
      <ShellWallsPlan
        room={room}
        walls={walls}
        thickness={thickness}
        scoops={scoops}
        pick={pick}
        disabled={disabled}
        label={t("shell.wallsPlan")}
        wallLabel={(entry, index) => t(entry.dir === "x" ? "shell.wallAcross" : "shell.wallAlong", { number: index + 1 })}
        compartmentLabel={(entry, index) => t("shell.compartment", { number: index + 1, width: plain(entry.maxX - entry.minX), depth: plain(entry.maxZ - entry.minZ) })}
        onPick={setPick}
        onWallChange={change}
        onWallRemove={remove}
      />
      <span className="shell-openings-summary">{wall && pick?.type === "wall"
        ? t(wall.dir === "x" ? "shell.wallAcross" : "shell.wallAlong", { number: pick.index + 1 })
        : compartment
          ? t("shell.compartmentPicked", { width: plain(compartment.maxX - compartment.minX), depth: plain(compartment.maxZ - compartment.minZ) })
          : t("shell.wallsHint")}</span>
      <div className="shell-walls-actions">
        <button type="button" disabled={disabled || full} data-testid="shell-walls-add-across" onClick={() => add("x")}><Plus size={15} strokeWidth={2.5} /><span>{t("shell.wallAddAcross")}</span></button>
        <button type="button" disabled={disabled || full} data-testid="shell-walls-add-along" onClick={() => add("z")}><Plus size={15} strokeWidth={2.5} /><span>{t("shell.wallAddAlong")}</span></button>
      </div>
      {wall && pick?.type === "wall" ? (
        <>
          <EdgeModifierSlider label={t(wall.dir === "x" ? "shell.wallFromBack" : "shell.wallFromLeft")} value={clamp(wall.at, 0, across)} min={0} max={round(across)} step={0.5} workspace={workspace} length disabled={disabled} onChange={(value) => change(pick.index, { ...wall, at: round(clamp(value, 0, across)) })} />
          <EdgeModifierSlider label={t("shell.wallStart")} value={from} min={0} max={round(Math.max(0, to - SHELL_WALLS_PLAN_MIN_LENGTH))} step={0.5} workspace={workspace} length disabled={disabled} onChange={(value) => change(pick.index, { ...wall, from: round(clamp(value, 0, to - SHELL_WALLS_PLAN_MIN_LENGTH)), to })} />
          <EdgeModifierSlider label={t("shell.wallEnd")} value={to} min={round(Math.min(run, from + SHELL_WALLS_PLAN_MIN_LENGTH))} max={round(run)} step={0.5} workspace={workspace} length disabled={disabled} onChange={(value) => change(pick.index, { ...wall, from, to: round(clamp(value, from + SHELL_WALLS_PLAN_MIN_LENGTH, run)) })} />
          <EdgeModifierSlider
            label={t("shell.wallSlant")}
            value={clamp(wall.slant ?? 0, -clamp(wall.at, 0, across), across - clamp(wall.at, 0, across))}
            min={-round(clamp(wall.at, 0, across))}
            max={round(across - clamp(wall.at, 0, across))}
            step={0.5}
            workspace={workspace}
            length
            disabled={disabled}
            onChange={(value) => {
              const slant = round(clamp(value, -wall.at, across - wall.at));
              const { slant: _slant, ...straight } = wall;
              change(pick.index, slant === 0 ? straight : { ...straight, slant });
            }}
          />
          <div className="shell-walls-actions">
            <button type="button" disabled={disabled} data-testid="shell-walls-turn" onClick={() => turn(pick.index)}><RefreshCw size={15} strokeWidth={2.5} /><span>{t("shell.wallTurn")}</span></button>
            <button type="button" disabled={disabled} data-testid="shell-walls-remove" onClick={() => remove(pick.index)}><Trash2 size={15} strokeWidth={2.5} /><span>{t("shell.wallRemove")}</span></button>
          </div>
        </>
      ) : null}
      {walls.length > 0 ? (
        <>
          <div className="shell-walls-actions">
            <button type="button" disabled={disabled || full} title={t("shell.wallsMirrorHint")} data-testid="shell-walls-mirror-x" onClick={() => { onChange(shellMirroredWalls(walls, room, "x")); setPick(null); }}><FlipHorizontal2 size={15} strokeWidth={2.5} /><span>{t("shell.wallsMirrorX")}</span></button>
            <button type="button" disabled={disabled || full} title={t("shell.wallsMirrorHint")} data-testid="shell-walls-mirror-z" onClick={() => { onChange(shellMirroredWalls(walls, room, "z")); setPick(null); }}><FlipVertical2 size={15} strokeWidth={2.5} /><span>{t("shell.wallsMirrorZ")}</span></button>
          </div>
          <div className="shell-walls-actions">
            <button type="button" disabled={disabled} data-testid="shell-walls-clear" onClick={() => { onChange([]); setPick(null); }}><Eraser size={15} strokeWidth={2.5} /><span>{t("shell.wallsClear")}</span></button>
          </div>
        </>
      ) : null}
    </div>
  );
}

/**
 * Hollow, finger scoops: the inside of the box from above with its compartments (those of the even dividers, or of the
 * walls set by hand; the walls are only shown here). A compartment is picked by a tap, and a row of buttons sets the side
 * its floor runs up into, or none. One button gives every compartment a scoop at the front, another takes all away.
 */
export function ShellScoopsEditor({
  width,
  depth,
  across,
  along,
  walls,
  scoops,
  thickness,
  disabled,
  onChange,
}: {
  width: number;
  depth: number;
  /** The even dividers across and along; not used when `walls` are given. */
  across: number;
  along: number;
  /** The walls set by hand, or null with the even dividers. */
  walls: readonly ShellDividerWall[] | null;
  scoops: readonly ShellScoop[];
  thickness: number;
  disabled?: boolean;
  onChange: (scoops: ShellScoop[]) => void;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const shown = walls ?? shellGridWalls(across, along, width, depth);
  const room = shellWallRoom(width, depth, shown, thickness);
  if (!room || width < 4 || depth < 4) return null;
  // A box with one compartment needs no picking.
  const index = room.compartments.length === 1 ? 0 : picked !== null && picked < room.compartments.length ? picked : null;
  const compartment = index === null ? undefined : room.compartments[index];
  const now = compartment ? shellScoopOf(compartment, scoops)?.side ?? "none" : "none";
  const plain = (value: number) => String(Math.round(value * 10) / 10);
  const sides = [["none", "shell.scoopNone"], ["front", "shell.scoopFront"], ["back", "shell.scoopBack"], ["left", "shell.scoopLeft"], ["right", "shell.scoopRight"]] as const;
  return (
    <div className="shell-walls-editor" data-testid="shell-scoops-editor">
      <ShellWallsPlan
        room={room}
        walls={shown}
        thickness={thickness}
        scoops={scoops}
        pick={index === null ? null : { type: "compartment", index }}
        disabled
        label={t("shell.wallsPlan")}
        wallLabel={(entry, position) => t(entry.dir === "x" ? "shell.wallAcross" : "shell.wallAlong", { number: position + 1 })}
        compartmentLabel={(entry, position) => t("shell.compartment", { number: position + 1, width: plain(entry.maxX - entry.minX), depth: plain(entry.maxZ - entry.minZ) })}
        onPick={(pick) => setPicked(pick?.type === "compartment" ? pick.index : null)}
        onWallChange={() => {}}
        onWallRemove={() => {}}
      />
      <span className="shell-openings-summary">{t(compartment ? "shell.scoopsPick" : "shell.scoopsPanelHint")}</span>
      {compartment ? (
        <div className="shell-opening-options shell-scoop-sides" role="group" aria-label={t("shell.scoops")}>
          {sides.map(([side, label]) => (
            <button key={side} type="button" aria-pressed={now === side} className={now === side ? "active" : ""} disabled={disabled} data-testid={`shell-scoop-${side}`} onClick={() => onChange(shellScoopsWith(scoops, compartment, side === "none" ? null : side))}>
              {t(label)}
            </button>
          ))}
        </div>
      ) : null}
      <div className="shell-walls-actions">
        <button type="button" disabled={disabled} data-testid="shell-scoops-all" onClick={() => onChange(room.compartments.reduce<ShellScoop[]>((list, entry) => shellScoopsWith(list, entry, shellScoopOf(entry, scoops)?.side ?? "front"), []))}>
          <Plus size={15} strokeWidth={2.5} /><span>{t("shell.scoopsAll")}</span>
        </button>
        {scoops.length > 0 ? (
          <button type="button" disabled={disabled} data-testid="shell-scoops-none" onClick={() => onChange([])}>
            <Eraser size={15} strokeWidth={2.5} /><span>{t("shell.scoopsNone")}</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
