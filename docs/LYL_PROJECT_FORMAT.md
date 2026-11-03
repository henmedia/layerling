# layerling project files (`.lyl`)

`.lyl` is layerling's native, editable project format. It is an additional backup, transfer, and sharing mechanism; IndexedDB autosave remains the normal local persistence system, and STL, 3MF, OBJ, STEP, SVG, and DXF remain geometry exports.

## Architecture decision

layerling uses a packaged container (format option B). A `.lyl` file is a ZIP archive containing `project.json` and deduplicated files below `assets/`.

This was selected over pure JSON because imported STL/STEP data and exact B-Rep can be large, Base64 would add size and parsing overhead, and an archive lets layerling validate and hash each asset independently. The editable model is still JSON and can be inspected by opening `project.json` from the package.

## Version 2 layout

```text
project.lyl
├── project.json
├── thumbnail.png        Picture of the design, as its card shows it (optional)
└── assets/
    ├── source/          Original imported STL, OBJ, 3MF, SVG, or STEP files
    ├── derived-mesh/    Exact caches for baked operations or legacy imports
    ├── brep/            Exact STEP/B-Rep payloads
    ├── display-edges/   Deduplicated display-edge polylines of CAD objects
    └── image/           Deduplicated sketch/reference images
```

`project.json` contains these top-level sections:

- `schema`, `formatVersion`, `minimumReaderVersion`, and `createdWithVersion`
- `metadata`: project name, source project ID, units, and timestamps
- `assets`: path, type, byte length, SHA-256, source format, and media type
- `states`: explicit root node IDs and editable object graphs for the active scene and undo/redo states
- `history`: ordered state references, selection per state, the time each state was recorded (`recordedAt`, ISO 8601, optional - older packages carry none), and current undo/redo index
- `sketches`: sketch/extrusion indexes
- `features`: supported group, subtraction, intersection, mirror, sketch-extrusion, sketch-revolve, sketch-sweep, fillet, chamfer, and delete-face operations used by the active project
- `groups`: explicit parent/member references and operation type
- `workplanes`: base and selected offset workplanes
- `exactCad`: objects with exact B-Rep or imported STEP sources
- `editor`: workspace dimensions, units, snap grid, and selected workplane elevation

`thumbnail.png` is a PNG of the design as the card on the start page shows it, all its bodies framed from the side the view looked from, at most 512 × 320 pixels. It is there for other programs, a file manager or a library of models, to show the design without building it; layerling writes it when it saves or downloads a design, or puts one on the server, and does not read it. It is not listed in `project.json` and has no hash there. A file written by an older version, through an AI agent while the view has no size, or from the start page's backup has none.

Object nodes keep stable layerling object IDs. Groups refer to child node IDs instead of array positions. Fillet/chamfer history refers to explicit “before” nodes. Feature dependencies are explicit and checked for cycles.

Large object data lives in `assets/` and is referenced by content hash, never repeated per state. Imported and baked meshes use `importedMesh.meshAssetId`, exact CAD uses `cadBrepAssetId`, and the display edges of a CAD object use `cadDisplayEdgesAssetId` (`SKFEDG1` little-endian binary: an 8-byte magic, the edge count, the total coordinate count, one 32-bit length per edge, then the coordinates as doubles). Undo states that share an object therefore share one stored copy of its geometry, which keeps autosave proportional to what actually changed rather than to the whole history.

## Version 3: attachments

A design can carry files - its instructions, a parts list - which are saved with it (#820). They are the only addition of version 3, and they are written **only for a design that has some**: such a design is a `formatVersion` 3 package with `minimumReaderVersion` 3, and every other design is written as version 2, byte for byte as before. A layerling that knows version 2 only refuses a version 3 package with its usual "requires a newer layerling" message, instead of opening it and dropping the files at its next save.

```text
project.lyl
├── project.json          "attachments": [ { "id", "fileName", "assetId" }, ... ]
└── assets/
    └── attachment/       The files themselves: <sha256>.md or <sha256>.txt
```

- Each file is an asset of the kind `attachment`, so it is checked like every other asset: safe path, size, and SHA-256 against its record. Bytes that are the same are stored once, however many names they have.
- The list `attachments` in `project.json` holds the name each file goes by (`fileName`) and the asset that holds its bytes (`assetId`). Its `id` is what the file is known by inside the design; it stays the same when the file is replaced or renamed in the editor. The list keeps the order the files are shown in.
- What may be attached is one table in the code (`ATTACHMENT_TYPES` in `lib/projectAttachments.ts`): `.md` (`text/markdown`) and `.txt` (`text/plain`), both UTF-8 text without NUL bytes. A file is checked by its content, not only by its name, on the way in and on the way out. A package that holds anything else under `attachment` is refused.
- Limits: 2 MB a file, 16 files and 8 MB together (version 4 raises them, see below); a name has at most 120 characters, no folder and no control characters, and no two names are the same without regard to case. A package that breaks one of them is refused.
- A list in a package of version 2 or older is refused: the list belongs to version 3.
- Attachments are not part of the undo history: they belong to the design, not to one of its states. A file added or removed is saved like any change to the design, in the browser and, for a design in a shared folder, on the server.
- They are not carried by custom shapes or by "Insert into this design", and the bug report does not contain them.

## Version 4: pictures and PDF attachments

Version 4 adds more types of attachment and larger limits for them, and nothing else (#820): pictures, `.png` (`image/png`), `.jpg` or `.jpeg` (`image/jpeg`) and `.webp` (`image/webp`), and `.pdf` (`application/pdf`). The layout is the layout of version 3; the files are stored under `assets/attachment/` as `<sha256>.png`, `.jpg`, `.webp` or `.pdf`.

- Version 4 is written **only for a design that needs it**: one that has one of these files, or more attachments than version 3 allowed (more than 16 files or 8 MB together). Such a design is a `formatVersion` 4 package with `minimumReaderVersion` 4. A design whose attachments are all text and within those limits is still written as version 3, and a design without attachments as version 2. Each row of `ATTACHMENT_TYPES` says which version first carries it (`formatVersion`), and the package takes the newest version its files need.
- The reason is the same as for version 3: a layerling that knows version 3 refuses an attachment type it does not know, and a list over its limits, so it must be told with its usual "requires a newer layerling" message instead of failing on the file.
- A version 3 package that holds a picture or a PDF, or more files or bytes than version 3 allowed, is refused.
- A file is checked by its first bytes, which every file of its type starts with: PNG by its eight-byte signature, JPEG by `FF D8 FF`, WebP by `RIFF` and, from byte 8, `WEBP`, PDF by `%PDF-`. A file with another type's name, or a text file renamed to `.png`, is refused on the way in and on the way out.
- SVG is not a type that may be attached: it is a document that can carry scripts and links to other servers. GIF, BMP and HEIC are not either.
- Each type has its own size limit: 16 MB for a picture and 32 MB for a PDF, while `.md` and `.txt` keep their 2 MB. A design holds up to 32 files and 64 MB together.
- Pictures and PDF files are compressed already, so they are stored in the ZIP as they are (method 0, `compressed` in the type table); text is deflated as before. A reader takes either method.

## What is preserved

- All current native shape kinds and their editable parameters
- Position, rotation, dimensions, mirrors, colour, solid/hole role, visibility, and lock state
- Nested groups, boolean operands, subtraction results, and intersection metadata
- Sketch points, lines, Bezier/smooth handles, disjoint profiles, reference images, and extrusion depth
- Imported STL, OBJ, 3MF, SVG, and STEP sources, stored once and reused by instances
- Exact imported STEP data, current exact CAD B-Rep, display edges, chamfer/fillet settings, and reversible edge-treatment history
- Attachments, the files kept with the design (version 3), in the order they are listed, with their names and their exact bytes
- Custom fonts used by texts, embedded in `project.json` as a subset of the characters the design's texts use (at most 64 fonts), so the file opens with its lettering on another computer
- Undo and redo states according to the export choice: Unlimited, 100, 50, or 30 recent actions, the custom limit set in the workspace settings, or None (the current state only, for sharing a file without its steps). Unlimited means every state still retained by the editor, including available redo states.
- Workspace units, grid/snap settings, dimensions, and active offset workplane

Native primitives are regenerated from definitions and do not receive mesh assets. Source-backed STL, SVG, and STEP objects are regenerated from their original asset. Derived mesh assets are written only when the current editor has genuinely baked geometry (for example a boolean or edge treatment), or when an older local project no longer has its original imported source.

## Opening safely

layerling inspects ZIP metadata before expansion and validates the entire project before changing local state. It rejects unsafe paths, encrypted or unsupported compression, excessive expansion, malformed shapes/sketches, duplicate IDs, missing assets, hash mismatches, invalid transforms, unknown shape or operation types, cyclic groups/features, and unsupported versions.

Opening a valid project file creates a new local project. It does not overwrite the project that is currently open. The imported project is then saved through the existing dashboard, thumbnail, IndexedDB, history, and editor lifecycle.

The attachments are checked as well: every attachment asset must be of an allowed type and be what its type says (UTF-8 text for `.md` and `.txt`, the right first bytes for a picture or a PDF), carried by the package's version, the list must refer only to attachment assets and keep to its limits, and its names must be usable and different. Current safety limits are 512 MB compressed, 1 GB expanded, 256 MB per asset, 64 MB for `project.json`, 4,096 archive entries, 100,000 object nodes per state, and 5,001 distinct states. The live editor retains at most 5,000 history entries and 64 MB of serialized history, so Unlimited means all history currently available inside those safety limits.

## Files from before the rename

The format used to be called `.skf`, with `com.sketchforge.project` as its schema
identifier and `SKFMSH1` / `SKFEDG1` as the headers of its embedded mesh and edge
assets. Those files are still opened, whatever their format version. Nothing is
written under the old names any more: a project opened from an `.skf` is saved as
a `.lyl` with the current identifier, so the old file stays where it is and the
new one appears beside it. The same holds in a shared project folder - an `.skf`
there stays listed, downloadable, and deletable under its own name, and saving it
back writes a `.lyl`.

## Compatibility and migrations

A design is written as version 2, as version 3 when it has text attachments, or as version 4 when it has a picture or a PDF attached (see above); the newest version this layerling reads is 4. Readers refuse a higher `formatVersion` or `minimumReaderVersion` instead of partially loading it. Version 2 moves display edges out of every state into deduplicated `display-edges` assets; version 1 packages are still opened, and their inline `definition.cadDisplayEdges` is read as written. The importer also contains an explicit migration for the documented version 0 pure-JSON prototype and preserves its object IDs and valid history. An installation that only knows version 1 refuses a version 2 package, so a project shared with an older installation has to be exported from that older installation. In the same way an installation that knows version 2 only refuses a version 3 package: a design with attachments has to be opened in a current layerling, and its attachments removed, before an older one can open it. Likewise a layerling that knows version 3 only refuses a version 4 package, until its pictures and PDF files are removed.

Future schema changes should add a version-to-version migration, run validation after every migration, and never mutate the user's original file.

## Current limitations

- Projects created before source-asset tracking cannot recover the exact original STL/SVG file. Their existing normalized editable mesh is preserved as a deduplicated legacy cache and is identified by the absence of a source asset.
- layerling currently bakes the displayed result of booleans and edge treatments. `.lyl` preserves the operands, group hierarchy, feature metadata, reversible history, exact B-Rep where available, and a derived-result cache; it does not add a new live parametric feature editor that the application does not yet have.
- The current workplane system stores a base plane plus numeric offset. It does not expose persistent associative face-workplane references, so `.lyl` cannot preserve an association that the editor itself does not model.
- Geometric sketch constraints and dimensions are not yet part of layerling's sketch data model. Existing points, segments, curve handles, profiles, and extrusion depth are preserved exactly.
- The camera is stored as optional editor state, `editor.view` (#220): `orthographic`, `position`, `target`, `up` and `zoom`. It is not part of the undo history; a reader that does not know it passes over it, and a file without it opens in the standard view.
- OBJ and 3MF are import formats as well as export formats; their source files are kept like STL ones and the bodies are rebuilt from them on load.
- The views saved under the keys 7, 8, 9 and 0 are stored as optional editor state too, `editor.savedViews`: an array of four entries in that order, each a view like `editor.view` or `null` for an empty slot. It is left out when no slot holds a view, is not part of the undo history, and a reader that does not know it passes over it.
- The measurements of the tape measure are stored as optional editor state, `editor.tapeMeasurements` (#881): `points` (each with `id`, a world position `x`, `y`, `z` and, for a point fixed to a body, an `attachment` with the body's `shapeId` and a `normalized` place measured against its box) and `segments` (each `id`, `startId`, `endId` and, for a measured edge, an `edge`), plus `hidden: true` when the measurements are kept but not shown. It is left out when there is no measurement, is not part of the undo history, and a reader that does not know it passes over it; the format version stays as it is. A point whose body is gone, or whose edge no longer fits the body, is dropped when the design is opened.
