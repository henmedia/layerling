---
title: Building with an AI (MCP)
summary: How an AI assistant such as Claude or Codex creates and changes shapes, groups them and takes pictures of the view in your open editor.
---

layerling comes with an MCP server. MCP is a standard through which an AI assistant can use tools in other programs. With it an AI client such as Claude or Codex sees an open editor tab and works in it: it creates shapes, changes dimensions, groups, cuts, rounds edges, reads out the scene and takes pictures of the view. You describe the part, the AI builds it, you watch and can step in at any moment.

The bridge between AI client and editor runs **locally on your computer**. Keep in mind, though: what the AI reads, meaning the scene and the pictures of the view, goes to the provider of your AI client, like any other input there.

> **Important:** The MCP bridge exists in the development server that you start yourself on your computer. On layerling.com and in installations with static hosting it is switched off. A copy you host yourself, such as the Docker image on a NAS, can switch it on with an access token; see "A copy on a NAS or server" below.

## Setting up

1. Get layerling from [GitHub](https://github.com/henmedia/layerling) and start it in the project folder with `npm run dev`. Node.js must be installed. On Windows the quick-start line in the README takes care of that.
2. Open an editor tab, for example `http://127.0.0.1:3000/?editor=1`.
3. Connect your AI client to the MCP server. The client starts it itself with `node scripts/layerling-mcp-server.mjs`.

### Claude Code

Nothing to install: the project brings a `.mcp.json` that registers the server, and the skill under `.claude/skills/layerling-mcp-skill`. Open the layerling folder in Claude Code and ask, for example: "Use the layerling MCP tools to list my open editors and inspect the scene."

### Claude Desktop

Claude Desktop does not read project files. Enter the server in its own configuration. As a template use `docs/mcp/claude-desktop-config.example.json` in the project, replacing the script path with the absolute path on your computer. Then restart Claude Desktop.

### Codex

Copy the skill from `docs/skills/layerling-mcp-skill` into your Codex skills folder, enter the server in your Codex configuration using `docs/mcp/codex-config.example.toml`, and restart Codex.

The detailed instructions for all three are in the [README on GitHub](https://github.com/henmedia/layerling/blob/main/README.md#layerling-mcp-skill).

## A copy on a NAS or server

A copy you host yourself can let an AI client drive its open editors over the network. It is off by default, because whoever can drive the bridge can read and change the open designs. On the server, set `LAYERLING_MCP_REMOTE` to `true` and `LAYERLING_MCP_TOKEN` to a secret of at least 16 characters (for the Docker image in `environment:` of the compose file; no rebuild needed). Open an editor tab of that copy and keep it open, and give the MCP client the address and the same token: `LAYERLING_URL=http://nas:3000` and `LAYERLING_MCP_TOKEN=<the token>`.

Only a client with the token can list or drive the editors. The editor pages need none, but they only count under an address or name that only your own network can use (an IP address, a name without a dot, or one ending in `.local` or `.lan`); a real domain behind a reverse proxy goes into `LAYERLING_MCP_ALLOWED_HOSTS`. Use it on a network you trust, and HTTPS beyond it. The README has the details.

## What the AI can do

The AI works with the same functions as you, through the same path as your operation in the editor. New layerling functions get their MCP action right away. The tools:

| Tool | What it does |
| --- | --- |
| `layerling_list_editors` | lists the open editor tabs |
| `layerling_read_scene` | reads scene, selection, units and the exact dimensions of all objects |
| `layerling_list_objects` | lists all objects with dimensions, position, rotation and id |
| `layerling_select_objects` | selects objects |
| `layerling_delete_objects` | deletes objects |
| `layerling_create_shape` | creates a shape: box, cylinder, text (also curved), thread, gear, sketch body and all the others |
| `layerling_import_file` | imports a file as the import window does, a coloured OBJ or 3MF as one body per colour, a 3MF with several objects as one body per object |
| `layerling_add_font` | adds a font of one's own for text from a TrueType, OpenType or WOFF file; it stays in the browser, a design keeps only the letters it uses |
| `layerling_list_fonts` | lists the built-in fonts and the fonts of one's own, with id and name |
| `layerling_import_mesh` | brings a triangle mesh into the design |
| `layerling_update_object` | changes dimensions, position, colour, name, solid or hole and everything else that makes up the shape |
| `layerling_align_objects` | aligns objects with each other |
| `layerling_scale_objects` | scales objects by a percentage, together or each in place |
| `layerling_lay_flat` | lays an object with one face on the plate |
| `layerling_place_on_face` | sets objects down on a face of another, sloped ones too, like the C key |
| `layerling_mate_faces` | brings a face of one object against a face of another, face to face or flush |
| `layerling_open_group` | opens a group so its parts can be changed one by one, also a group inside an open one |
| `layerling_close_group` | closes it again ("Done") or cancels |
| `layerling_group_objects` | groups objects |
| `layerling_ungroup_objects` | dissolves groups |
| `layerling_boolean_cut` | cuts solids with holes |
| `layerling_intersect_objects` | keeps only what the objects have in common (Intersection) |
| `layerling_separate_parts` | separates a shape into its loose parts |
| `layerling_split_objects` | cuts solids or holes in two with a plane |
| `layerling_list_edges` | lists the real CAD edges of an object |
| `layerling_apply_edge_treatment` | chamfers or fillets chosen edges |
| `layerling_hollow_object` | hollows a body with an even wall |
| `layerling_array_objects` | multiplies in a row or on a circle |
| `layerling_bundle_objects` | bundles objects like Ctrl+B: they move together, keep their colour and kind and go out separately in an export |
| `layerling_layer_text` | turns a text into a stack of layers for a multicolour print (letters, wider rims, a plate without holes) or builds a stack again; with a name list, one tag per name |
| `layerling_measure_section` | measures on a cutting plane between two points that snap to the outline - wall thickness, gaps, fits |
| `layerling_show_overhangs` | switches the overhang hatching on or off, sets the angle and reports for each body the area that would need supports |
| `layerling_estimate_print` | estimates volume, weight and filament for the selection or the whole design, worked out as solid like the export window |
| `layerling_add_reference_points` | marks reference points - on the centre, corners or edge middles of objects, or at exact positions - that shapes snap to |
| `layerling_list_reference_points` | lists the reference points with their ids and positions |
| `layerling_remove_reference_points` | deletes reference points by id, or all of them |
| `layerling_inspect_errors` | shows the last message and the last error, plus the messages and errors of the session |
| `layerling_wrap_around_cylinder` | wraps a body lying flat, an SVG or text for example, around a cylinder, outward or inward as an engraving |
| `layerling_simplify_mesh` | reduces the triangle count of an imported mesh, to a share in percent or to a number of triangles |
| `layerling_save_custom_shape` | keeps bodies as a custom shape, on the server or in the browser, to insert them into other designs |
| `layerling_list_custom_shapes` | lists the custom shapes on the server and in the browser |
| `layerling_insert_custom_shape` | inserts a custom shape into the open design, at a spot x/z if you like |
| `layerling_delete_custom_shape` | removes a custom shape; inserted bodies stay |
| `layerling_show_workplane` | hides and shows the plate with its grid, for a picture of the underside for example (only the view) |
| `layerling_set_section_view` | cuts the view open along a plane to look inside (only the view, nothing is cut apart) |
| `layerling_set_history_view` | looks back at an earlier state of the project, like the History view (the real design stays untouched; changing tools wait until it is closed) |
| `layerling_export_section_svg` | returns the outlines on a cutting plane as an SVG at 1:1, from the same bodies as the export |
| `layerling_set_workplane` | puts the workplane on a side of a body or back on the base plate, and hides or shows it |
| `layerling_capture_image` | takes a picture of the view: front, top, side, diagonally from a corner and more |

That lets the AI check itself: it creates something, takes a picture, looks and improves.

## An example

You say: "Build me a round box 60 mm across, 40 mm high with a 2.5 mm wall, open at the top, plus a flat lid with 'Tea' written in an arc." The AI creates the cylinders, hollows one, puts the curved text on the lid and takes pictures at the end to see whether it fits.

> **Tip:** Give the AI concrete dimensions and tell it what the part is for ("holder for a 12 mm rod, fits a Bambu Lab A1"). Then it makes more sensible decisions. And watch it build: you can step in yourself at any time, because it is the same editor.
