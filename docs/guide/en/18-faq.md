---
title: Frequent questions
summary: Short answers to what people ask most, about saving, large models, fillets, AI and printing, each with the way to the full explanation.
contents: questions
---

Each answer is short and ends with the place in this guide that explains it in full. The search box at the top finds a question by any word in it.

## Saving and backups

### Where are my designs stored, and is there a cloud?

In the browser on your own computer. There is no account and no cloud, and nothing is uploaded; every change saves itself. Whoever runs layerling on a server of their own can also keep designs in a shared folder there.

More: [Where your designs live](chapter:files-and-saving#where-your-designs-live)

### My designs are gone. What happened?

Designs live in one browser on one computer. They are gone when the browser's data for the page was cleared, and they do not show in another browser or on another computer. Safari on Mac, iPhone and iPad deletes a page's data after seven days without a visit, unless layerling is installed as an app. If you have a backup, {{ui:dashboard.restoreBackup}} on the start page brings the designs back, with their folders and pictures.

More: [Your designs, your backup](chapter:files-and-saving#your-designs-your-backup)

### How do I back up everything, also by itself into a folder?

{{ui:dashboard.backupAll}} on the start page packs all designs into one ZIP file. Besides that, layerling keeps earlier versions of each design by itself, and in Chrome and Edge it can write each of them into a folder you choose, as a .lyl file. The versions kept in the browser go when the browser's data goes, so they do not replace the ZIP or the folder.

More: [Earlier versions](chapter:files-and-saving#earlier-versions)

### How do I take a design to another computer or browser?

Save it as a .lyl file from the export window and open that file on the other computer from the start page. For all designs at once, use {{ui:dashboard.backupAll}} here and {{ui:dashboard.restoreBackup}} there; designs that are already present are not added twice.

More: [Backing up and passing on](chapter:files-and-saving#backing-up-and-passing-on)

### What happens when I clear the browser's data?

The designs stored in that browser are deleted, and so are the earlier versions layerling kept there. A ZIP from {{ui:dashboard.backupAll}}, your .lyl files and a backup folder on your disk are not touched. Back up first, then clear.

More: [Your designs, your backup](chapter:files-and-saving#your-designs-your-backup)

### How do I get back to an earlier state?

Undo goes back step by step. The history view shows every step with a slider without changing the design, and can make a new design from any of them. For a state from earlier today or last week, the list of earlier versions opens an old version as a new design and leaves the current one as it is.

More: [Looking back: the history view](chapter:select-and-arrange#looking-back-the-history-view) and [Earlier versions](chapter:files-and-saving#earlier-versions)

### Can STL and 3MF go straight into my project folder? And how do I get a download again?

In Chrome and Edge the first export of a design asks where to save, and later exports write into that same file without asking. Firefox and Safari always download. If you want a download every time, switch on {{ui:workspace.stlAsDownload}} in the settings.

More: [Exporting](chapter:files-and-saving#exporting)

### The save dialog closed and there is no file. Why?

The browser reports a dialog it could not use the same way as one you cancelled, and a file that a virus scanner blocks cannot be written either. The message at the top then offers {{ui:status.saveAsDownload}}, which puts the file into your downloads. To skip the dialog for good, switch on {{ui:workspace.lylAsDownload}} and {{ui:workspace.stlAsDownload}} in the settings.

More: [Backing up and passing on](chapter:files-and-saving#backing-up-and-passing-on)

## Installing and updates

### Is there an app to download?

layerling installs from the browser: it then has an icon and a window of its own and starts without a network. There is no installer to download, and the original is only at layerling.com. **Do not download or run a "layerling" installer from any other site:** it does not come from layerling and may contain malware. To run your own copy there is a quick start for Windows and a Docker image.

More: [Installing as an app](chapter:offline-and-install#installing-as-an-app) and [Running it yourself](chapter:offline-and-install#running-it-yourself)

### Does layerling work without internet?

Yes, after the first visit it starts without a network, best installed as an app. One thing is loaded only when it is first needed: the CAD kernel for the first STEP export, about 22 MB.

More: [Installing as an app](chapter:offline-and-install#installing-as-an-app)

### How do I get an update?

By itself. An open page notices a new version and shows a card with what is new; {{ui:newVersion.reload}} stores the open design first and then loads the new version. The start page shows a newer version too.

More: [Updates](chapter:offline-and-install#updates)

### Which browsers and tablets work?

Chrome, Edge, Firefox and Safari, on a computer, a tablet or a phone; the 3D view needs WebGL. A few things only Chrome and Edge can do: writing into your own files and folders, the backup folder and opening .lyl files with a double-click. On a tablet a finger does what the left mouse button does.

More: [Fingers and a stylus](chapter:tablet-and-touch#fingers-and-a-stylus)

## AI

### What is the easiest way to set up an AI?

Give an AI that can work on your computer the address `https://github.com/henmedia/layerling` and ask it to set up layerling with its MCP server for you. It needs a program such as the Code tab of the Claude app, Claude Code, Codex, Antigravity or Gemini CLI. For Windows and Mac the guide also has the steps one by one.

More: [Step by step for beginners](chapter:ai-with-mcp#step-by-step-for-beginners)

### Why can the AI not reach layerling.com?

The bridge between the AI and the editor only exists in a copy of layerling that runs on your own computer. On layerling.com it is always switched off, and a chat in the browser cannot install anything. So the AI needs layerling started locally and a program that speaks MCP.

More: [Setting up](chapter:ai-with-mcp#setting-up)

### Which AI works, and what does it cost?

Any program that speaks MCP; the guide describes Claude, Codex, Gemini and Antigravity. layerling itself costs nothing. What the AI costs is up to its provider: the Code tab of the Claude app, for one, is part of the paid Claude plans.

More: [Setting up](chapter:ai-with-mcp#setting-up)

### Which data goes to the AI's provider?

What the AI reads: the objects of the open design and the pictures of the view it takes. That goes to the provider of your AI program like anything else you type there. The bridge itself runs on your computer, and without an AI nothing leaves it.

More: [What the AI can do](chapter:ai-with-mcp#what-the-ai-can-do)

## Memory, speed and history

### Why does layerling get slow with my STL?

An STL is a mesh of triangles, and a very large one makes the editor slower, takes a lot of memory and makes saving slow. layerling says so after the import from 400,000 triangles in one mesh, or a million in the whole design. Simplify the mesh first, import only the parts you need, or build the part from layerling's own shapes.

More: [Large meshes](chapter:files-and-saving#large-meshes)

### Why are steps missing from my history?

Two things shorten it. The setting {{ui:workspace.savedHistory}} keeps 100 steps per design unless you change it, and older ones are dropped. And when a design is too big to be saved with its whole history, layerling saves it with half the steps, then half again, and tells you. The design itself is always saved whole.

More: [Saved history](chapter:view-and-workplane#saved-history)

### What do I do when the browser's storage is full?

Do not close or reload the tab: your newest changes are only there. Keep a copy first with the export as .lyl. Then make room: delete steps in the history view, remove designs you no longer need, or back them up and delete them.

More: [Your designs, your backup](chapter:files-and-saving#your-designs-your-backup)

### My design is too large to save. What now?

Its history and its meshes take too much room together. layerling has already tried with fewer history steps before it says so. Delete the history in the history view, simplify the heaviest imported meshes, or save a .lyl with the current state only.

More: [Backing up and passing on](chapter:files-and-saving#backing-up-and-passing-on) and [Simplifying an imported mesh](chapter:files-and-saving#simplifying-an-imported-mesh)

### The browser has run out of memory. What helps?

This happens with meshes of millions of triangles, where one step needs more memory than a browser tab gets. Reduce the triangles of imported meshes with {{ui:editor.tool.simplify}}, close other tabs and try again. A shorter history helps as well when it happens while saving.

More: [Large meshes](chapter:files-and-saving#large-meshes)

### A design opens very slowly or not at all. What can I do?

Mostly its history of undo steps has grown very large. {{ui:dashboard.openWithoutHistory}} in the design's menu on the start page reads only the current state; it deletes the earlier steps for good, so back the design up first if you want to keep them. An earlier version from the backups opens as a new design.

More: [Backing up and passing on](chapter:files-and-saving#backing-up-and-passing-on)

### layerling stutters. Which settings help?

{{ui:workspace.fastMode}} in the settings switches off shadows, the edge lines on all bodies and the camera's inertia, and draws the view at screen resolution only. Check that the browser uses the graphics card: `chrome://gpu` or `edge://gpu` should say "Hardware accelerated" next to WebGL. Large imported meshes are the other common cause.

More: [When layerling feels slow](chapter:view-and-workplane#when-layerling-feels-slow)

### The editor stands still or computes for a long time. Wait or reload?

Wait first. Cuts, groups and edge work are computed in the background, and {{ui:status.computing}} shows while they run; long jobs such as hollowing stop by themselves with a message and change nothing. If the CAD kernel had to be restarted, the message says so and no reload is needed. Reloading is safe, because every change saves itself, with one exception: while the red notice {{ui:notice.designNotSavedTitle}} shows, export a .lyl first.

More: [When layerling feels slow](chapter:view-and-workplane#when-layerling-feels-slow)

### The 3D view stays empty, or a message says it could not start. What now?

The browser could not start WebGL, which draws the 3D view. The cause lies in the browser or the graphics driver, not in your design, and your stored designs are not deleted. Close other tabs with 3D content and restart the browser, switch on hardware acceleration, allow WebGL if a privacy setting or an extension blocks it, and update the browser and the graphics driver. Another browser is a quick test.

More: [When layerling feels slow](chapter:view-and-workplane#when-layerling-feels-slow)

## Imported models

### "Simplify mesh" or "Make exact": which one?

{{ui:editor.tool.simplify}} keeps a share of the triangles, so a heavy model gets lighter; it stays a mesh. {{ui:editor.tool.makeExact}} rebuilds a model made of planes, cylinders, cones and spheres as a real CAD body, so fillets and chamfers follow clean edges and a STEP export carries real faces. It takes up to 400,000 triangles; a figure or a scan stays a mesh. For a large technical part: simplify first, with {{ui:simplify.keepEdges}} on, then make it exact.

More: [Simplifying an imported mesh](chapter:files-and-saving#simplifying-an-imported-mesh) and [Making an imported mesh exact](chapter:files-and-saving#making-an-imported-mesh-exact)

### Why does a cut fail, or why is my mesh "not watertight"?

A body can only be cut when its surface is closed. If an imported mesh has gaps, layerling names the part and the number of open edges and leaves it out. Small holes it closes itself; larger ones have to be repaired in the program the model came from or in a mesh repair tool. The print check shows which body is open.

More: [Checking the print](chapter:printing#checking-the-print)

### How do I import an SVG the right way?

An SVG comes in as a sketch body, 4 mm high, and its points can be changed in sketch mode. Type the width in millimetres into the import window before importing; without a number it keeps its own size. Outlines that cross themselves cannot become a solid and are left out and counted: join overlapping pieces and close the outlines in the drawing program, then import again.

More: [Importing](chapter:files-and-saving#importing)

## Fillets and chamfers

### Why can a fillet not be applied?

Mostly it is too large for the place: it would run into the neighbouring faces, or the edge bends tighter than the radius. One or two millimetres less often do, and at sharp angles a fillet needs more room than its radius suggests. If the edges cannot be rounded together, take fewer at once; the edge in the way is drawn red. {{ui:edge.findLargest}} searches the size for you.

More: [Chamfering and filleting edges](chapter:edges-and-hollowing#chamfering-and-filleting-edges)

### Why are my fillets gone after I changed the sketch?

After {{ui:inspector.editSketch}} the body is built anew and has new edges. layerling lays fillets and chamfers again on the edges that lie where the old ones lay, as long as the body has as many edges as before. With a corner more or fewer they are left out and the message says how many. Undo brings everything back.

More: [Making a body from it](chapter:sketches#making-a-body-from-it)

### Why can I not pick some edges of an imported model?

STL, OBJ and 3MF bring only triangles, and the edge tools work on meshes of up to 4,000 triangles. {{ui:editor.tool.makeExact}} turns a technical part into a real CAD body, on which a bore has one round rim that a fillet can follow. A STEP file brings exact geometry from the start.

More: [Making an imported mesh exact](chapter:files-and-saving#making-an-imported-mesh-exact)

## Groups, holes and sizes

### Why do holes become oval when I stretch a group?

A group that is resized stretches everything in it, as if it were drawn on rubber. Choose {{ui:inspector.groupResizeKeepParts}} under {{ui:inspector.groupResize}} in the group's settings: parts that reach across the group stretch, and holes and small parts keep their size and their distance to the nearer side.

More: [Resizing a group: keeping holes and small parts](chapter:solids-and-holes#resizing-a-group-keeping-holes-and-small-parts)

### Why does grouping fail, or why does the result have gaps?

Either a part is not closed, which the message names, or two parts almost meet without really touching. Ungroup, align the parts exactly or change a size or a position a little, and group again. Very dense meshes above the limit for cutting imported meshes are not joined at all.

More: [Grouping](chapter:solids-and-holes#grouping)

### How do I change one part inside a group?

Select the group and press [[E]], or double-click it. The parts then lie separately and can be changed; finishing builds the group again. Fillets and chamfers that were put on the whole group are lost when it is rebuilt.

More: [Editing a group](chapter:solids-and-holes#editing-a-group)

### How do I get one part back from an earlier state?

Open the history view, move the slider to the state that still had the part, click the part and choose {{ui:historyView.bringBack}}. A copy lands in the current design as it was and where it was, with the time in its name.

More: [Looking back: the history view](chapter:select-and-arrange#looking-back-the-history-view)

## Printing and export

### STL, 3MF, OBJ or STEP: which one?

For the printer, 3MF or STL. 3MF keeps every body as a part with its name and colour; STL is one mesh in one colour. OBJ carries colours too. STEP is for other CAD programs: it holds the exact geometry with fillets and chamfers.

More: [Exporting](chapter:files-and-saving#exporting)

### How do my colours get into the slicer?

Export 3MF. Every body keeps its colour, and a body painted in several colours carries the paint on its faces. Bambu Studio and OrcaSlicer ask on opening how the colours map to your filaments.

More: [Painting in several colours](chapter:shapes#painting-in-several-colours)

### My parts do not fit into each other. How much clearance do they need?

Usually 0.2 to 0.4 mm, depending on the printer. The fit test measures it: print the small plate with seven holes, find the tightest hole the pin still turns in, and enter that value as your printer's play. New lids, dovetails and threads then start from it.

More: [Your printer's play: the fit test](chapter:printing#your-printer-s-play-the-fit-test)

### Why does layerling say a part does not fit the printer?

The part sticks out over the edge of the plate or is taller than the printer you chose can build. It is a hint only and can be closed. Pick your printer in the settings, or cut a part that is too large with {{ui:editor.tool.split}}.

More: [When something does not fit](chapter:printing#when-something-does-not-fit)

## About layerling

### Is layerling free, and may I sell what I design with it?

layerling is free software under the AGPL-3.0 licence, without an account. The licence is about the program: whoever changes layerling and offers it to others over a network has to offer the source too. It sets no conditions for the models you make. Fonts and models you import keep their own licences. If you would like to support the project, a [small donation](https://layerling.com/support.html?lang=en) helps with the server and development costs. It is voluntary, and nothing in layerling depends on it.

More: [Running it yourself](chapter:offline-and-install#running-it-yourself)

### How do I report a bug or ask for something?

{{ui:editor.bugReport}} in the footer saves a ZIP with the design and a short text about version and browser; nothing personal is in it. Attach it in the forum or in the discussions on GitHub. Questions and wishes are welcome in both.

More: [Reporting a bug](chapter:files-and-saving#reporting-a-bug) and [Help and feedback](chapter:offline-and-install#help-and-feedback)
