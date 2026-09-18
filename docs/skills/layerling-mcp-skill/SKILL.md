---
name: layerling-mcp-skill
description: Control a live local layerling editor through its MCP server. Use when the assistant needs to list currently open layerling editor tabs, target a tab by editorNumber/projectName, read the current scene, list or select objects, create boxes/cubes/cylinders/sketch extrusions, update dimensions/position/rotation, align objects, group/ungroup/cut/separate parts, list exact CAD edge ids, apply chamfer/fillet to specific edges, inspect editor errors, or capture viewport images from view-cube angles.
---

# layerling MCP

## Quick Start

Use this skill only with a local layerling app running in development mode.

1. Start layerling from the repo:

```bash
npm run dev
```

2. Open an editor tab at `http://localhost:3000/?editor=1`.

3. Configure your MCP client to start the stdio server:

```bash
node scripts/layerling-mcp-server.mjs
```

The MCP server talks to the app through `/api/layerling-mcp`. Open editor tabs heartbeat into that route and receive commands from it. Production and static builds intentionally return 404 for the MCP route.

## Client Compatibility

Codex can use this folder as a skill and the MCP server as tools. Install the folder under `~/.codex/skills/layerling-mcp-skill` and configure the MCP server in Codex.

Claude Desktop does not read Codex skills, but it can use the same `scripts/layerling-mcp-server.mjs` MCP server through Claude's `mcpServers` JSON config. Use the repository README for client setup examples.

## Targeting Editors

Always call `layerling_list_editors` first when the user mentions multiple projects, tabs, or a number like `49536`.

Use `editorNumber` for follow-up commands. It is a 5-digit per-tab number stored in browser `sessionStorage`, so two open layerling tabs have different numbers. The list also includes `projectName`, `projectId`, URL, shape count, selected count, notice, and last error.

If only one editor is open, commands may omit `editorNumber`; the server will target the sole live editor.

## Core Workflow

Read scene/object state before modifying geometry:

```text
layerling_list_editors
layerling_read_scene({ editorNumber })
layerling_list_objects({ editorNumber })
```

For object edits, use exact object `id` values from the scene. Do not invent object names; names are helpful labels only.

Useful tools:

- `layerling_select_objects`: select ids in the live editor.
- `layerling_delete_objects`: delete ids in the live editor, or delete the current selection when ids are omitted.
- `layerling_create_shape`: create `box`, `cube`, `cylinder`, or `sketch`.
- `layerling_import_mesh`: import STL-style mesh data into the editor.
- `layerling_update_object`: set exact dimensions, position, color, name, hole state, and `rotation`/`rotationX`/`rotationZ`.
- `layerling_align_objects`: align two or more ids using the same logic as the editor Alignment button.
- `layerling_group_objects`: group selected ids using the normal layerling group/boolean path.
- `layerling_boolean_cut`: pass `solidIds` and `holeIds`; the result replaces the operands.
- `layerling_ungroup_objects`: restore grouped children while preserving edited child geometry.
- `layerling_separate_parts`: split disconnected parts in one object.
- `layerling_inspect_errors`: read the editor notice, edge modifier error, and last MCP error.

## Edge Features

Chamfer and fillet are separate edge-treatment operations in layerling. Do not fake a chamfer/fillet with cylinders or extra decorative geometry. Cylinders are only appropriate when the requested shape itself has a circular/rounded 2D footprint, such as rounded tray corners or a cylindrical peg.

For chamfer/fillet, never guess edge ids.

1. Call `layerling_list_edges({ editorNumber, id, sharpAngle })`.
2. Use returned `selectableEdgeIds` or inspect returned edge geometry.
3. Call `layerling_apply_edge_treatment({ editorNumber, id, kind, edgeIds, amount, chamferAngle })`.

`edgeIds` can be an array of numeric ids or `"all"`. `kind` is `chamfer` or `fillet`. The app commits the result through normal history, so undo/redo works.

## Images

Use `layerling_capture_image` for viewport PNGs. `face` can be `current`, `home`, `top`, `bottom`, `front`, `back`, `right`, or `left`. These use the same camera/view-cube orientation logic as the editor UI.

## Visual Verification

After creating or heavily modifying an object, use vision when available. Capture at least one useful viewport image with `layerling_capture_image`; for 3D geometry, prefer `home` plus any needed orthographic-style faces such as `top`, `front`, or `right`. Inspect the rendered result against the user's requirements before saying the task is done.

Do not rely only on numeric scene data when the user asked for a physical object. Use numeric checks for dimensions and visual checks for whether the model reads correctly.

## Safety

This bridge is local-development only. If a command fails, call `layerling_inspect_errors` before retrying. For geometry operations that can be expensive, set a larger `timeoutMs` on the tool call.
