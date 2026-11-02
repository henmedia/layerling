import { buildGroupedShapeFromSelection, groupedShape } from "@/lib/editorBooleans";
import { t } from "@/lib/i18n";
import { createLocalId } from "@/lib/localIds";
import {
  DEFAULT_SBC_BOARD,
  SBC_BOARDS,
  normalizeSbcBoardSettings,
  sbcBoardSolids,
  sbcSolidsExtent,
  type SbcBoardSettings,
  type SbcSolid,
  type SbcSolidRole,
} from "@/lib/sbcBoards";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { canonicalizeShape } from "@/lib/workplaneShapes";
import type { ShapeKind, WorkplaneShape } from "@/types/layerling";

/** The parts' colours: metal connectors, black headers and buttons, dark chips, silver shields, dark openings, gold pins. */
const PART_COLORS: Record<SbcSolidRole, string> = {
  connector: "#c8cbd0",
  header: "#2b2b2d",
  chip: "#3a3b3f",
  shield: "#b5b8bd",
  button: "#2b2b2d",
  opening: "#1c1c1e",
  pin: "#d4af37",
};
/** How far a mounting hole reaches past the board above and below, so the cut leaves no skin. */
const HOLE_OVERSHOOT = 0.5;

function asset(kind: ShapeKind) {
  const found = toolbarShapeAssets.find((entry) => entry.kind === kind && entry.id === kind) ?? toolbarShapeAssets.find((entry) => entry.kind === kind);
  if (!found) throw new Error(`no ${kind} in the shape library`);
  return found;
}

/**
 * One body of the board's parts as a shape: a box, or a Port opening shape made solid for a socket's
 * outline - turned a quarter round when it runs along x, on a side edge of the board.
 */
function partShape(solid: SbcSolid, toX: (x: number) => number, toZ: (y: number) => number): WorkplaneShape {
  const centre = { x: toX((solid.x0 + solid.x1) / 2), z: toZ((solid.y0 + solid.y1) / 2), elevation: solid.bottom };
  const height = solid.top - solid.bottom;
  if (!solid.profile) {
    return makeShapeFromAsset(asset("box"), centre, { width: solid.x1 - solid.x0, depth: solid.y1 - solid.y0, height });
  }
  const alongY = solid.profile.along === "y";
  const shape = makeShapeFromAsset(asset("port"), centre, {
    width: alongY ? solid.x1 - solid.x0 : solid.y1 - solid.y0,
    depth: alongY ? solid.y1 - solid.y0 : solid.x1 - solid.x0,
    height,
    cornerFillet: solid.profile.corner,
    portProfile: solid.profile.portProfile,
  });
  return { ...shape, hole: false, rotation: alongY ? 0 : 90 };
}

/** The settings carried by an SBC board, or null for any other shape. */
export function sbcBoardOf(shape: WorkplaneShape | null | undefined): SbcBoardSettings | null {
  return shape?.sbcBoard ? normalizeSbcBoardSettings(shape.sbcBoard) : null;
}

/**
 * An SBC board as a new shape, standing on the plate's middle: a group of the board - a rounded
 * plate with its mounting holes cut through - and its parts, each its own colour: a socket in its
 * own front outline, housings with their openings, an audio jack with its collar, pin headers with
 * a dot for every pin, the chips as boxes (`sbcBoardSolids`). Every part is a shape the edge tool
 * and the STEP export build exactly, so the group is an exact body too. The connectors at the edge are grown by the clearance and reach
 * further out by the reach, to cut through a case wall.
 */
export async function sbcBoardShape(input: SbcBoardSettings, triangleLimit: number): Promise<WorkplaneShape> {
  const settings = normalizeSbcBoardSettings(input) ?? { board: DEFAULT_SBC_BOARD, clearance: 0, reach: 0 };
  const board = SBC_BOARDS[settings.board];
  const solids = sbcBoardSolids(board, settings.clearance, settings.reach);
  const extent = sbcSolidsExtent(board, solids);
  // The board's frame laid on the workplane: x across, its front edge (y = 0) towards the viewer at +z,
  // the middle of everything on it at the origin.
  const midX = (extent.minX + extent.maxX) / 2;
  const midY = (extent.minY + extent.maxY) / 2;
  const toX = (x: number) => x - midX;
  const toZ = (y: number) => midY - y;

  const plate = makeShapeFromAsset(asset("roundedBox"), { x: toX(board.width / 2), z: toZ(board.depth / 2), elevation: 0 }, {
    width: board.width,
    depth: board.depth,
    height: board.thickness,
    cornerFillet: board.cornerRadius,
    topBottomFillet: 0,
  });
  const holes = board.holes.map(([hx, hy]) => makeShapeFromAsset(asset("cylinder"), { x: toX(hx), z: toZ(hy), elevation: -HOLE_OVERSHOOT }, {
    width: board.holeDiameter,
    depth: board.holeDiameter,
    height: board.thickness + 2 * HOLE_OVERSHOOT,
  })).map((hole) => ({ ...hole, hole: true }));
  const drilled = await buildGroupedShapeFromSelection([{ ...plate, color: board.color }, ...holes], triangleLimit);
  if (!drilled.group) throw new Error(drilled.failureNotice || t("sbcBoard.failed"));
  const pcb = canonicalizeShape({ ...drilled.group, id: createLocalId("sbc-pcb"), name: "Board", color: board.color, groupOperation: "group" });

  const parts = solids.map((solid) => canonicalizeShape({ ...partShape(solid, toX, toZ), id: createLocalId("sbc-part"), name: solid.name, color: PART_COLORS[solid.role] }));

  const group = groupedShape([pcb, ...parts]);
  if (!group) throw new Error(t("sbcBoard.failed"));
  return canonicalizeShape({ ...group, id: createLocalId("sbc-board"), name: board.name, color: board.color, groupOperation: "group", sbcBoard: settings });
}

/**
 * An SBC board made again with new settings where the old one stood: same id, middle, turn and
 * state. A name the person gave is kept; the board's own name follows the new board.
 */
export async function regeneratedSbcBoardShape(old: WorkplaneShape, settings: SbcBoardSettings, triangleLimit: number): Promise<WorkplaneShape> {
  const built = await sbcBoardShape(settings, triangleLimit);
  const previous = sbcBoardOf(old);
  const ownName = previous ? old.name !== SBC_BOARDS[previous.board].name : true;
  return canonicalizeShape({
    ...built,
    id: old.id,
    name: ownName ? old.name : built.name,
    x: old.x,
    z: old.z,
    elevation: old.elevation ?? 0,
    rotation: old.rotation,
    rotationX: old.rotationX,
    rotationZ: old.rotationZ,
    hole: old.hole,
    locked: old.locked,
    hidden: old.hidden,
  });
}
