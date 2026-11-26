import type { GridSize, GroupResizeMode, ShapeKind, TagBack, WorkplaneShape, WorkplaneWorkspaceSettings } from "@/types/layerling";

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
  /** Lock shape (#1277): moves, turns and groups, but keeps its size, settings, name and body. */
  shapeLocked?: boolean;
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
  /** The build plate the object stands on, counted from 1; only while the design has several (Discussion #456). */
  plate?: number;
  edgeTreatments: unknown[];
  /**
   * Was diese Form ausmacht, ueber die Masse hinaus: Seitenzahl, Gewindegroesse,
   * Windungen, Beschriftung. Fehlt bei einem Quader, weil es dort nichts gibt.
   */
  settings?: Record<string, string | number | boolean>;
  groupedCount: number;
  /** Groups and bundles: what the group does with its parts when it is resized (Discussion #526). */
  groupResize?: GroupResizeMode;
  /** A hull: whether the holes and hollows of its parts stay open (Discussion #1440). */
  keepHoles?: boolean;
  importedTriangles: number;
  cadDisplayEdgeCount: number | null;
  sketchPointCount: number;
  sketchSegmentCount: number;
  /** A sketch body's fill (#197): its stroke or null, whether holes are left out, its inset. */
  sketchStroke?: NonNullable<WorkplaneShape["sketchProfile"]>["stroke"] | null;
  silhouette?: boolean;
  sketchInset?: NonNullable<WorkplaneShape["sketchProfile"]>["inset"] | null;
  /** A text's fill (#215) and lettering. */
  textStroke?: WorkplaneShape["textStroke"] | null;
  textSilhouette?: boolean;
  textStretch?: boolean;
  textVertical?: boolean;
  textSpacing?: number;
  textKerning?: boolean;
  textLetterWidth?: number;
  textFullCircle?: boolean;
  textEdge?: WorkplaneShape["textEdge"] | null;
  textKeyring?: WorkplaneShape["textKeyring"];
  /** The text on a name tag's or an icon tag's back, on its bottom layer; `textBackFill` marks the part that fills it. */
  textBack?: TagBack;
  textBackFill?: boolean;
  transparent?: boolean;
  multicolor?: boolean;
  /** The id of the body a lid or an insert was made for. */
  lidFor?: string;
  insertFor?: string;
  vaseAssembled?: number;
  layeredText?: boolean;
  layeredIcon?: boolean;
  qrCode?: WorkplaneShape["qrCode"];
  sbcBoard?: WorkplaneShape["sbcBoard"];
  fan?: WorkplaneShape["fan"];
  /** A surface texture: its settings, the masks as a count, and whether it can still be changed. */
  surfaceTexture?: Record<string, unknown> & { masks: number; changeable: boolean };
  surfaceTextureLayers?: { pattern: unknown; faces: number; region?: number }[];
  /** Paint: how many strokes the body carries and the colours they show. */
  paint?: { strokes: number; colors: string[] };
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
  /** The files kept with the design (#820): what they are, never what they hold; layerling_get_attachment reads one. */
  attachments?: { id: string; name: string; mediaType: string; bytes: number; sha256: string }[];
  /** The selections kept under a name (layerling_select_objects with saveAs), with the ids each one remembers. */
  selectionSets?: { name: string; ids: string[] }[];
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
  | "hide_others"
  | "rename_project"
  | "delete_objects"
  | "move_object"
  | "create_shape"
  | "import_mesh"
  | "update_object"
  | "align_objects"
  | "lay_flat"
  | "place_on_face"
  | "perforate_face"
  | "thread_insert"
  | "magnet_pocket"
  | "sweep_sketch"
  | "push_face"
  | "paint_object"
  | "support_rib"
  | "stencil_bridges"
  | "scale_objects"
  | "mate_faces"
  | "open_group"
  | "close_group"
  | "add_to_group"
  | "take_out_of_group"
  | "group_objects"
  | "ungroup_objects"
  | "intersect_objects"
  | "hull_objects"
  | "cookie_cutter"
  | "flexi_joints"
  | "make_lid"
  | "make_mold"
  | "make_cable_channel"
  | "loft_sketches"
  | "boolean_cut"
  | "separate_parts"
  | "split_objects"
  | "wrap_around_cylinder"
  | "take_rotation_as_zero"
  | "texture_surface"
  | "simplify_mesh"
  | "make_exact"
  | "save_custom_shape"
  | "list_custom_shapes"
  | "insert_custom_shape"
  | "delete_custom_shape"
  | "list_edges"
  | "apply_edge_treatment"
  | "change_edge_treatment"
  | "list_faces"
  | "delete_faces"
  | "hollow_object"
  | "offset_object"
  | "cut_out"
  | "punch"
  | "array_objects"
  | "inspect_errors"
  | "estimate_print"
  | "check_clearance"
  | "printer_play"
  | "check_print"
  | "check_layers"
  | "split_bolt"
  | "add_reference_points"
  | "list_reference_points"
  | "remove_reference_points"
  | "list_notes"
  | "add_note"
  | "update_note"
  | "remove_notes"
  | "show_overhangs"
  | "measure_section"
  | "bundle_objects"
  | "layer_text"
  | "text_block"
  | "layer_icon"
  | "create_qr_code"
  | "create_sbc_board"
  | "create_fan"
  | "reference_image"
  | "set_section_view"
  | "set_history_view"
  | "restore_from_history"
  | "clear_history"
  | "delete_history_steps"
  | "list_backups"
  | "open_backup"
  | "open_project"
  | "show_workplane"
  | "focus_mode"
  | "detail_level"
  | "saved_view"
  | "build_plates"
  | "measurements"
  | "measure_angle"
  | "export_section_svg"
  | "sketch_from_section"
  | "export_drawing"
  | "export_mesh"
  | "save_project"
  | "list_attachments"
  | "get_attachment"
  | "add_attachment"
  | "rename_attachment"
  | "remove_attachment"
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
