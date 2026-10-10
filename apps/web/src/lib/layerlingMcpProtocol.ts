import type { GridSize, ShapeKind, WorkplaneWorkspaceSettings } from "@/types/layerling";

export const LAYERLING_MCP_ROUTE = "/api/layerling-mcp";
export const LAYERLING_MCP_STALE_MS = 15_000;
export const LAYERLING_MCP_HEARTBEAT_MS = 5_000;
export const LAYERLING_MCP_LONG_POLL_TIMEOUT_MS = 25_000;
export const LAYERLING_MCP_POLL_RETRY_MS = 1_000;

/** A face, or an edge or corner as faces joined with "-" ("front-right", "front-right-top"), as the view cube offers them. */
export type LayerlingMcpViewFace = "current" | "home" | "top" | "bottom" | "front" | "back" | "right" | "left" | `${string}-${string}`;

export type LayerlingMcpShapeSummary = {
  id: string;
  name: string;
  kind: ShapeKind;
  color: string;
  hole: boolean;
  locked: boolean;
  hidden: boolean;
  position: {
    x: number;
    z: number;
    elevation: number;
  };
  dimensions: {
    width: number;
    depth: number;
    height: number;
    size: number;
  };
  rotation: {
    x: number;
    y: number;
    z: number;
  };
  mirror: {
    x: boolean;
    y: boolean;
    z: boolean;
  };
  /** The body's own pivot, if it has one, in workplane coordinates. */
  rotationPivot: { x: number; z: number; elevation: number } | null;
  edgeTreatments: unknown[];
  /**
   * Was diese Form ausmacht, ueber die Masse hinaus: Seitenzahl, Gewindegroesse,
   * Windungen, Beschriftung. Fehlt bei einem Quader, weil es dort nichts gibt.
   */
  settings?: Record<string, string | number | boolean>;
  groupedCount: number;
  importedTriangles: number;
  cadDisplayEdgeCount: number | null;
  sketchPointCount: number;
  sketchSegmentCount: number;
  children?: LayerlingMcpShapeSummary[];
};

export type LayerlingMcpSceneSummary = {
  projectId: string | null;
  projectName: string;
  notice: string;
  selectedIds: string[];
  shapeCount: number;
  workspace: WorkplaneWorkspaceSettings;
  snap: GridSize | null;
  shapes: LayerlingMcpShapeSummary[];
  /** The innermost group being edited, if any: its parts lie loose until it is closed. */
  openGroup?: { groupId: string; name: string; partIds: string[] } | null;
  /** Every group being edited, outermost first; each is a part of the one before. */
  openGroups?: { groupId: string; name: string; partIds: string[] }[];
  /** The active workplane: the base plate, or a plane set on a face; hidden means it still applies but is not drawn. */
  workplane?: { onBase: boolean; hidden: boolean; origin: { x: number; y: number; z: number }; normal: { x: number; y: number; z: number } };
};

export type LayerlingMcpEditorSummary = {
  editorId: string;
  editorNumber: number;
  projectId: string | null;
  projectName: string;
  url: string;
  focused: boolean;
  shapeCount: number;
  selectedCount: number;
  notice: string;
  lastError: string | null;
  lastSeen: number;
};

export type LayerlingMcpCommandName =
  | "get_scene"
  | "list_objects"
  | "select_objects"
  | "delete_objects"
  | "create_shape"
  | "import_mesh"
  | "update_object"
  | "align_objects"
  | "lay_flat"
  | "place_on_face"
  | "scale_objects"
  | "mate_faces"
  | "open_group"
  | "close_group"
  | "group_objects"
  | "ungroup_objects"
  | "intersect_objects"
  | "boolean_cut"
  | "separate_parts"
  | "split_objects"
  | "wrap_around_cylinder"
  | "simplify_mesh"
  | "save_custom_shape"
  | "list_custom_shapes"
  | "insert_custom_shape"
  | "delete_custom_shape"
  | "list_edges"
  | "apply_edge_treatment"
  | "hollow_object"
  | "array_objects"
  | "inspect_errors"
  | "estimate_print"
  | "add_reference_points"
  | "list_reference_points"
  | "remove_reference_points"
  | "show_overhangs"
  | "measure_section"
  | "bundle_objects"
  | "layer_text"
  | "set_section_view"
  | "set_history_view"
  | "show_workplane"
  | "export_section_svg"
  | "import_file"
  | "add_font"
  | "list_fonts"
  | "set_workplane"
  | "capture_image";

export type LayerlingMcpCommand = {
  id: string;
  action: LayerlingMcpCommandName;
  params: Record<string, unknown>;
  createdAt: number;
};

export type LayerlingMcpCommandResult = {
  commandId: string;
  ok: boolean;
  data?: unknown;
  error?: string;
  completedAt?: number;
};

export type LayerlingMcpHeartbeatPayload = {
  type: "heartbeat";
  editor: Omit<LayerlingMcpEditorSummary, "lastSeen">;
};

export type LayerlingMcpPollPayload = {
  type: "poll";
  editorId: string;
};

export type LayerlingMcpResultPayload = {
  type: "result";
  editorId: string;
  result: LayerlingMcpCommandResult;
};

export type LayerlingMcpDispatchPayload = {
  type: "command";
  editorId?: string;
  editorNumber?: number;
  action: LayerlingMcpCommandName;
  params?: Record<string, unknown>;
  timeoutMs?: number;
};

export type LayerlingMcpApiPayload =
  | LayerlingMcpHeartbeatPayload
  | LayerlingMcpPollPayload
  | LayerlingMcpResultPayload
  | LayerlingMcpDispatchPayload;
